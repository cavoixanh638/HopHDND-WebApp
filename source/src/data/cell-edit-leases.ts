import {get,onValue,ref,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import {get,onValue,ref,type Database} from 'firebase/database';
import type {EditableField} from '../../shared/types';
import {callCellEdit,newPrivateCellSecret} from './cell-edit-api';

export type EditorKind='status'|'search'|'short'|'multiline'|'long';
export const MAX_EDIT_MS:Record<EditorKind,number>={
  status:45000,search:90000,short:120000,multiline:300000,long:600000};
export const LEASE_TTL_MS=45000;
export type CellLease={
  uid:string;session:string;token:string;revision:number;kind:EditorKind;
  acquiredAt:number;expiresAt:number;
  proofHash?:string;lastOperationId?:string;
  /** PRIVATE, browser-memory-only; NEVER included in an RTDB write/read. */
  secret?:string;
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

/** A key generated inside tab A, inaccessible from public RTDB lease/editProofs. */
export type AcquireRetry={secret:string;operationId:string};
export async function acquireCellLease(database:Database,user:User|null,session:string,
 id:string,field:EditableField,kind:EditorKind,generationId?:string,
 retry?:AcquireRetry):Promise<CellLease>{
  if(!user||!session)throw new Error('Chưa xác thực người sửa.');
  await assertActiveLeaseGeneration(database,generationId);
  const secret=retry?.secret??newPrivateCellSecret();
  const operationId=retry?.operationId??crypto.randomUUID();
  const generation=await readActivePointer(database,generationId);
  const result=await callCellEdit({action:'acquire',scope:generationId?'v2':'legacy',
    generation,operationId,recordId:id,field,kind,secret},database);
  if(result.status!=='acquired'||!result.lease||!validLease(result.lease))
    throw new Error('Dịch vụ chưa xác nhận quyền giữ khóa.');
  await assertActiveLeaseGeneration(database,generationId);
  return {...result.lease,secret};
}
async function readActivePointer(database:Database,generationId?:string){
  if(!generationId)return undefined;
  const current=(await get(ref(database,'hdnd/datasetV2/active'))).val();
  if(!current||current.generationId!==generationId)
    throw new Error('Thế hệ dữ liệu đã thay đổi khi sửa ô.');
  return current as import('./dataset-replacement-integrity').ActiveDatasetPointer;
}
export async function renewCellLease(database:Database,lease:CellLease,id:string,field:EditableField,
 generationId?:string,operationId=crypto.randomUUID()):Promise<CellLease>{
  if(!lease.secret)throw new Error('Không có bí mật phiên riêng; không thể gia hạn.');
  const generation=await readActivePointer(database,generationId);
  const answer=await callCellEdit({action:'renew',scope:generationId?'v2':'legacy',
    generation,operationId,recordId:id,field,secret:lease.secret,token:lease.token},database);
  if(answer.status!=='renewed'||!answer.lease||!validLease(answer.lease))
    throw new Error('Dịch vụ chưa xác nhận gia hạn.');
  await assertActiveLeaseGeneration(database,generationId);
  return {...answer.lease,secret:lease.secret};
}
export async function releaseCellLease(database:Database,lease:CellLease,
 id?:string,field?:EditableField,generationId?:string,operationId=crypto.randomUUID()):Promise<void>{
  if(!id||!field)return;
  if(!lease.secret)throw new Error('Thiếu bí mật phiên, không thể hủy khóa của người khác.');
  const generation=await readActivePointer(database,generationId);
  const result=await callCellEdit({action:'release',scope:generationId?'v2':'legacy',
    generation,operationId,recordId:id,field,secret:lease.secret,token:lease.token},database);
  if(result.status!=='released')throw new Error('Chưa xác nhận giải phóng khóa.');
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
  private pendingAcquire=new Map<string,AcquireRetry>();
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
  proof(id:string,field:EditableField){return this.closed?null:this.held.get(this.key(id,field))?.lease.secret??null;}
  credential(id:string,field:EditableField){
    const lease=this.closed?null:this.held.get(this.key(id,field))?.lease;
    return lease?.secret?{token:lease.token,secret:lease.secret}:null;
  }
  error(id:string,field:EditableField){return this.failed.get(this.key(id,field))??null;}
  activeCount(){return this.held.size;}
  async acquire(id:string,field:EditableField,kind:EditorKind):Promise<boolean>{
    if(this.closed)throw new Error('Phiên sửa đã hết hiệu lực khi thay thế dữ liệu.');
    // Existing in-memory lease is NOT authorization across an epoch change.
    // Do this before the fast-path held.has() check.
    await assertActiveLeaseGeneration(this.database,this.generationId);
    const key=this.key(id,field);
    if(this.held.has(key))return true;
    const retry=this.pendingAcquire.get(key)??{secret:newPrivateCellSecret(),operationId:crypto.randomUUID()};
    this.pendingAcquire.set(key,retry);
    let lease:CellLease;
    try {lease=await acquireCellLease(this.database,this.viewer(),this.tabSession,id,field,kind,this.generationId,retry);this.pendingAcquire.delete(key);}
    catch(cause){
      // Keep a private retry handle only for ambiguous ACK; never persist it to shared storage.
      if(!String(cause).includes('chưa xác nhận')&&!String(cause).includes('unavailable'))this.pendingAcquire.delete(key);
      throw cause;
    }
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
    await releaseCellLease(this.database,entry.lease,id,field,this.generationId).catch(cause=>{
      this.failed.set(key,'Đã lưu, nhưng chưa xác nhận giải phóng khóa: '+String(cause));
    });
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
    this.pendingAcquire.clear();
    const active=[...this.held.values()];
    this.held.clear();
    await Promise.allSettled(active.map(x=>{clearInterval(x.renewTimer);
      return releaseCellLease(this.database,x.lease,x.id,x.field,this.generationId);}));
  }
}
