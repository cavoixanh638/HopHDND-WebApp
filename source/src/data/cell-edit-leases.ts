import {get,onValue,ref,runTransaction,update,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {EditableField} from '../../shared/types';
import {parseFreeze,readFreeze,FREEZE_PATH} from './freeze-control';

export type EditorKind='status'|'search'|'short'|'multiline'|'long';
export const MAX_EDIT_MS:Record<EditorKind,number>={
  status:45000,search:90000,short:120000,multiline:300000,long:600000};
export const LEASE_TTL_MS=45000;
export type CellLease={
  uid:string;session:string;token:string;revision:number;kind:EditorKind;
  acquiredAt:number;expiresAt:number;
};
export const lockPath=(id:string,field:EditableField,generationId?:string)=>generationId
  ?`hdnd/datasetV2/leases/${generationId}/${id}/${field}`
  :`hdnd/editLocks/${id}/${field}`;
const validLease=(x:unknown):x is CellLease=>{
  if(!x||typeof x!=='object'||Array.isArray(x))return false;
  const y=x as CellLease;
  return typeof y.uid==='string'&&!!y.uid&&typeof y.session==='string'&&
    typeof y.token==='string'&&!!y.token&&Number.isSafeInteger(y.revision)&&
    y.revision>0&&Object.hasOwn(MAX_EDIT_MS,y.kind)&&
    Number.isFinite(y.acquiredAt)&&Number.isFinite(y.expiresAt);
};
/** Reject old-generation lease acquire/renew even for the SAME verified admin UID.
 * Rules scope direct generation writes; a foreground tab must additionally
 * fence its own operations against the server-authoritative active pointer.
 * This method is deliberately not a cached local generation comparison.
 */
async function assertActiveLeaseGeneration(database:Database,generationId?:string){
  if(!generationId)return;
  const pointer=(await get(ref(database,'hdnd/datasetV2/active'))).val();
  if(pointer?.generationId!==generationId)
    throw new Error('Thế hệ dữ liệu đã thay đổi; khóa ô của phiên cũ không còn hiệu lực.');
}
const serverTime=async(database:Database)=>{
  const offset=await new Promise<number>((resolve,reject)=>{
    // Firebase's .info nodes are local connection metadata and must be
    // observed; get() performs a server query and cannot fetch this path.
    onValue(ref(database,'.info/serverTimeOffset'),snap=>resolve(Number(snap.val()??0)),
      reject,{onlyOnce:true});
  });
  if(!Number.isFinite(offset)||Math.abs(offset)>600000)
    throw new Error('Không xác nhận được đồng hồ máy chủ, chưa được sửa.');
  return Date.now()+offset;
};

/** Lease acquisition belongs to *an individual browser tab*, not merely UID.
 * Same authenticated user in two tabs cannot share one editing lease. */
export async function acquireCellLease(database:Database,user:User|null,session:string,
 id:string,field:EditableField,kind:EditorKind,generationId?:string):Promise<CellLease>{
  if(!user||!session)throw new Error('Chưa xác thực người sửa.');
  await assertActiveLeaseGeneration(database,generationId);
  const freeze=await readFreeze(database);
  if(freeze.mode!=='OPEN')throw new Error('Hệ thống đang chuẩn bị chốt hoặc đã đóng băng dữ liệu.');
  const now=await serverTime(database),token=crypto.randomUUID();
  const location=ref(database,lockPath(id,field,generationId));
  const existing=(await get(location)).val();
  if(existing!=null&&!validLease(existing))throw new Error('Khóa ô bị lỗi; liên hệ quản trị.');
  const confirmed=await runTransaction(location,raw=>{
    if(raw!==null&&!validLease(raw))return undefined;
    if(raw&&raw.expiresAt>now)return undefined;
    return {uid:user.uid,session,token,kind,
      revision:(raw?.revision??0)+1,acquiredAt:now,expiresAt:now+LEASE_TTL_MS};
  },{applyLocally:false});
  const entry=confirmed.snapshot.val();
  if(!confirmed.committed||!validLease(entry)||entry.token!==token||
    entry.session!==session||entry.uid!==user.uid)
    throw new Error('Ô đang được sửa ở một phiên khác. Hãy thử sau khi người đó hoàn tất.');
  // The mode may change between reading OPEN and the lock commit.
  // If DRAINING/FROZEN, release the newly obtained lock and fail closed.
  const state=await readFreeze(database);
  let epochChanged=false;
  try{await assertActiveLeaseGeneration(database,generationId);}catch{epochChanged=true;}
  if(state.mode!=='OPEN'||epochChanged){
    await releaseCellLease(database,entry,id,field,generationId).catch(()=>{});
    throw new Error(epochChanged?'Thế hệ dữ liệu đã đổi khi xin khóa; phiên cũ bị vô hiệu hóa.':'Quản trị đang chốt số liệu, không nhận thêm lượt sửa.');
  }
  return entry;
}
export async function renewCellLease(database:Database,lease:CellLease,id:string,field:EditableField,generationId?:string){
  await assertActiveLeaseGeneration(database,generationId);
  const now=await serverTime(database);
  if(now>=lease.acquiredAt+MAX_EDIT_MS[lease.kind])throw new Error('Đã hết thời gian sửa ô.');
  const control=await readFreeze(database);
  if(control.mode==='FROZEN')throw new Error('Dữ liệu đã đóng băng.');
  const target=ref(database,lockPath(id,field,generationId));
  await get(target); // make existing lease visible before applying CAS renewal
  const result=await runTransaction(target,raw=>{
    if(raw===null)return raw; // cold transaction cache must retry on server
    if(!validLease(raw)||raw.token!==lease.token||raw.uid!==lease.uid||
      raw.session!==lease.session||raw.expiresAt<=now)return undefined;
    return {...raw,revision:raw.revision+1,expiresAt:now+LEASE_TTL_MS};
  },{applyLocally:false});
  if(!result.committed||result.snapshot.val()?.token!==lease.token)
    throw new Error('Khóa ô đã chuyển cho người khác.');
  await assertActiveLeaseGeneration(database,generationId);
  return result.snapshot.val() as CellLease;
}
export async function releaseCellLease(database:Database,lease:CellLease,
 id?:string,field?:EditableField,generationId?:string):Promise<void>{
  if(!id||!field)return;
  const target=ref(database,lockPath(id,field,generationId));
  const current=(await get(target)).val();
  if(!validLease(current)||current.uid!==lease.uid||
    current.session!==lease.session||current.token!==lease.token)return;
  // Write a revisioned tombstone, not remove(). A security-rule check on
  // current token + owner prevents an old session from clearing a newer lock.
  // Send the expected token and session explicitly. If a different tab with
  // the same UID has acquired the lock since get(), Security Rules reject
  // this stale release instead of expiring the new tab's token.
  await update(target,{token:lease.token,session:lease.session,expiresAt:0,
    revision:current.revision+1});
  const confirmed=(await get(target)).val();
  if(!validLease(confirmed)||confirmed.token!==lease.token||confirmed.expiresAt!==0)
    throw new Error('Khóa ô đã chuyển phiên hoặc Firebase chưa xác nhận giải phóng.');
}
export function watchCellLease(database:Database,id:string,field:EditableField,
 callback:(lease:CellLease|null)=>void,fail:(e:Error)=>void,generationId?:string){
  return onValue(ref(database,lockPath(id,field,generationId)),snap=>{
    const raw=snap.val();
    if(raw===null){callback(null);return;}
    if(!validLease(raw)){fail(new Error('Khóa ô có dữ liệu không hợp lệ.'));return;}
    callback(raw);
  },fail);
}
export type HeldLease={id:string;field:EditableField;lease:CellLease;pending:boolean;renewTimer:ReturnType<typeof setInterval>};
export class CellEditSessionManager {
  private readonly tabSession=crypto.randomUUID();
  private held=new Map<string,HeldLease>();
  private closed=false;
  private failed=new Map<string,string>();
  constructor(private database:Database,private viewer:()=>User|null,
    private readonly generationId?:string){}
  private key(id:string,field:EditableField){return id+'|'+field;}
  private draftStorage(){
    // Transient anonymous UID is rotated per page/tab for exclusive editing,
    // therefore an anonymous draft must be scoped to browser session storage,
    // NOT to the changing Firebase uid. Session storage survives reloads but
    // does not synchronize draft values across unrelated tabs.
    return this.viewer()?.isAnonymous?globalThis.sessionStorage:globalThis.localStorage;
  }
  private draftKey(id:string,field:EditableField){
    if(!this.generationId)return this.viewer()?.isAnonymous
      ?'hdnd.primary.unsaved-cell.tab.v2:'+id+':'+field
      :'hdnd.primary.unsaved-cell.v1:'+this.viewer()?.uid+':'+id+':'+field;
    return this.viewer()?.isAnonymous
      ?'hdnd.primary.unsaved-cell.tab.v3:'+this.generationId+':'+id+':'+field
      :'hdnd.primary.unsaved-cell.v2:'+this.generationId+':'+this.viewer()?.uid+':'+id+':'+field;
  }
  /** Recovery is a local checkpoint, NEVER a database acknowledgement. */
  preserveDraft(id:string,field:EditableField,value:unknown){
    if(this.closed)return false;
    try{
      const storage=this.draftStorage();if(!storage)return false;
      storage.setItem(this.draftKey(id,field),JSON.stringify({savedAt:Date.now(),value}));
      return true;
    }catch{return false;}
  }
  recoverDraft(id:string,field:EditableField):string|null{
    if(this.closed)return null;
    try{
      const raw=this.draftStorage()?.getItem(this.draftKey(id,field));
      const parsed=raw?JSON.parse(raw):null;
      return typeof parsed?.value==='string'?parsed.value:null;
    }catch{return null;}
  }
  private clearDraft(id:string,field:EditableField){
    try{this.draftStorage()?.removeItem(this.draftKey(id,field));}catch{}
  }
  has(id:string,field:EditableField){return !this.closed&&this.held.has(this.key(id,field));}
  isPending(id:string,field:EditableField){return !this.closed&&this.held.get(this.key(id,field))?.pending===true;}
  proof(id:string,field:EditableField){return this.closed?null:this.held.get(this.key(id,field))?.lease.token??null;}
  error(id:string,field:EditableField){return this.failed.get(this.key(id,field))??null;}
  activeCount(){return this.held.size;}
  async acquire(id:string,field:EditableField,kind:EditorKind):Promise<boolean>{
    if(this.closed)throw new Error('Phiên sửa đã hết hiệu lực khi thay thế dữ liệu.');
    // Existing in-memory lease is NOT authorization across an epoch change.
    // Do this before the fast-path held.has() check.
    await assertActiveLeaseGeneration(this.database,this.generationId);
    const key=this.key(id,field);
    if(this.held.has(key))return true;
    const lease=await acquireCellLease(this.database,this.viewer(),this.tabSession,id,field,kind,this.generationId);
    if(this.closed){await releaseCellLease(this.database,lease,id,field,this.generationId).catch(()=>{});throw new Error('Thế hệ đã đổi khi xin khóa; phiên cũ bị vô hiệu hóa.');}
    const entry:HeldLease={id,field,lease,pending:false,renewTimer:setInterval(()=>{
      void renewCellLease(this.database,entry.lease,id,field,this.generationId).then(next=>{entry.lease=next;})
        .catch(e=>{this.failed.set(key,String(e));clearInterval(entry.renewTimer);
          this.held.delete(key);});
    },12000)};
    this.held.set(key,entry);this.failed.delete(key);return true;
  }
  markPending(id:string,field:EditableField){
    if(this.closed)throw new Error('Phiên sửa đã hết hiệu lực khi thay thế dữ liệu.');
    const entry=this.held.get(this.key(id,field));
    if(!entry)throw new Error('Chưa giữ khóa ô để lưu.');
    entry.pending=true;
  }
  async finish(id:string,field:EditableField){
    const key=this.key(id,field),entry=this.held.get(key);
    this.clearDraft(id,field); // only called after a confirmed server save
    if(!entry)return;
    clearInterval(entry.renewTimer);this.held.delete(key);
    await releaseCellLease(this.database,entry.lease,id,field,this.generationId);
  }
  async cancel(id:string,field:EditableField){
    // Cancel must NEVER clear an unfinished local text draft.
    const key=this.key(id,field),entry=this.held.get(key);
    if(!entry)return;
    clearInterval(entry.renewTimer);this.held.delete(key);
    await releaseCellLease(this.database,entry.lease,id,field,this.generationId);
  }
  async dispose(){
    this.closed=true;
    const active=[...this.held.values()];
    this.held.clear();
    await Promise.allSettled(active.map(x=>{clearInterval(x.renewTimer);
      return releaseCellLease(this.database,x.lease,x.id,x.field,this.generationId);}));
  }
}
