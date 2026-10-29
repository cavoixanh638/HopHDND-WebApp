import {get,ref,runTransaction,set,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../shared/types';
import {firebaseAdmin,validateFirebaseItem} from './firebase-repository';
import {TEXT_FIELDS} from '../../shared/field-definitions';
import {compareBusinessImport} from './business-excel';

/** Full replacement protocol. RTDB candidate Rules must be deployed separately
 * after Codex review; this module MUST NOT fall back to destructive row writes.
 * All RTDB paths are private except the pre-existing /hdnd/items public read.
 */
const ROOT='hdnd';
const OP=/^[a-zA-Z0-9_-]{8,72}$/;
type NativeObject=Record<string,unknown>;
type ParsedRow=Item&{history?:unknown;operationId?:string;updatedBy?:string;updatedAt?:number};
export interface SnapshotBundle{
  items:Record<string,unknown>;
  permissions:Record<string,unknown>;
  editLocks:Record<string,unknown>;
  generation:string;
}
export interface DatasetStage{
  operationId:string;candidate:Record<string,unknown>;backup:SnapshotBundle;
  baselineSignature:string;candidateSignature:string;createdAt:number;
  owner:string;count:number;fileName:string;candidateCodes:string[];
}
export type StageReceipt={operationId:string;count:number;oldCount:number;newCount:number;newPreview:Item[];changes:ReturnType<typeof compareBusinessImport>};
export type ReplaceReceipt={operationId:string;generation:string;count:number;confirmed:boolean;status:'applied'|'uncertain'};
export const objectOf=(x:unknown):NativeObject=>x&&typeof x==='object'&&!Array.isArray(x)?x as NativeObject:{};
const readItems=(val:unknown):Item[]=>Object.entries(objectOf(val))
  .map(([id,raw])=>{const item=validateFirebaseItem(raw);if(item.recordId!==id)throw Error('ID hàng trên Firebase không khớp khóa: '+id);return item;})
  .sort((a,b)=>a.stt-b.stt||a.recordId.localeCompare(b.recordId));
function same(a:unknown,b:unknown){return stableJson(a)===stableJson(b);}
function stableJson(x:unknown):string{
  if(Array.isArray(x))return '['+x.map(stableJson).join(',')+']';
  if(x&&typeof x==='object')return '{'+Object.entries(x as NativeObject)
    .filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>JSON.stringify(k)+':'+stableJson(v)).join(',')+'}';
  return JSON.stringify(x);
}
function fingerprint(x:unknown):string{
  const s=stableJson(x);let h=2166136261;
  for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
  return s.length+':'+h.toString(16);
}
function assertAdmin(user:User|null):User{
  if(!user||!firebaseAdmin(user))throw new Error('Chỉ tài khoản Google quản trị đã xác minh được phép thay toàn bộ dữ liệu.');
  return user;
}
function assertOperation(operationId:string){
  if(!OP.test(operationId))throw new Error('Mã thao tác nhập không hợp lệ.');
}
function safeRow(row:Item,newId:string,uid:string):Item&NativeObject{
  const r=validateFirebaseItem({...row,recordId:newId,revision:1,archivedAt:null});
  return {...r,revision:1,operationId:'import_'+newId,updatedBy:uid,updatedAt:Date.now()};
}
export function prepareCandidate(items:readonly Item[],operationId:string,uid:string):Record<string,unknown>{
  assertOperation(operationId);
  if(!items.length||items.length>1000)throw new Error('Tệp rỗng hoặc vượt quá 1.000 hồ sơ.');
  const seen=new Set<string>(),codes=new Set<string>();
  return Object.fromEntries(items.map(item=>{
    if(!item.displayCode.trim())throw new Error('Thiếu mã hồ sơ.');
    const normalized=item.displayCode.normalize('NFKC').trim().toUpperCase();
    if(codes.has(normalized))throw new Error('Mã hồ sơ trùng: '+item.displayCode);
    codes.add(normalized);
    // Namespace EACH imported dataset so stale drafts/leases (even with the
    // same business code) can never address rows of a newer generation.
    const id='g_'+operationId.slice(0,24)+'_'+item.recordId.slice(0,60);
    if(id.length>100||seen.has(id))throw new Error('ID hồ sơ bị trùng hoặc quá dài.');
    seen.add(id);
    return [id,safeRow(item,id,uid)];
  }));
}
export function captureOldSnapshot(hdnd:unknown):SnapshotBundle{
  const data=objectOf(hdnd);
  return {items:structuredClone(objectOf(data.items)),
    permissions:structuredClone(objectOf(data.permissions)),
    editLocks:structuredClone(objectOf(data.editLocks)),
    generation:String(objectOf(data.importState).generation??'legacy')};
}
export function datasetSignature(hdnd:unknown):string{
  const s=captureOldSnapshot(hdnd);
  // Include per-row permissions and locks to reject a stale approval when
  // another tab/admin changed them between preview, backup and commit.
  return fingerprint(s);
}
function verifyCandidate(actual:unknown,expected:Record<string,unknown>){
  const actualRows=readItems(actual),expectedRows=readItems(expected);
  if(actualRows.length!==expectedRows.length||!same(actualRows,expectedRows))
    throw new Error('Bản ứng viên đọc lại khác dữ liệu đã kiểm tra. Không được kích hoạt.');
}
export function planAtomicSwap(hdnd:unknown,stage:DatasetStage):NativeObject{
  const current=objectOf(hdnd),already=objectOf(current.importState);
  if(already.operationId===stage.operationId){
    // Idempotent read-after-uncertain commit. Never apply a second time.
    if(!same(current.items,stage.candidate))throw Error('Mã thao tác đã dùng nhưng dữ liệu không trùng; cần kiểm tra thủ công.');
    return current;
  }
  if(datasetSignature(current)!==stage.baselineSignature)
    throw new Error('Dữ liệu hoặc phân quyền đã thay đổi từ khi sao lưu. Phải kiểm tra và sao lưu lại.');
  if(!same(objectOf(current.importVault)[stage.operationId],stage))
    throw new Error('Ứng viên/bản sao lưu trên máy chủ đã đổi. Không áp dụng.');
  const currentPermissions=objectOf(current.permissions);
  return {...current,
    items:stage.candidate,
    // Retain admin's COLUMN grants, never inherit record-specific grants
    // or history/leases from old record IDs when codes are reused.
    permissions:{...currentPermissions,rows:{},cells:{}},
    editLocks:null,
    importState:{operationId:stage.operationId,generation:stage.operationId,
      count:stage.count,completedAt:Date.now(),owner:stage.owner},
    importOperations:{...objectOf(current.importOperations),
      [stage.operationId]:{status:'committed',count:stage.count,owner:stage.owner}}
  };
}
export function prepareRestoreCandidate(backup:SnapshotBundle,op:string,uid:string){
  // Restore the old BUSINESS VALUES under a NEW namespace. Historical audit
  // is retained privately in the backup; the active generation starts fresh,
  // preventing an old stale client from addressing restored rows.
  return prepareCandidate(readItems(backup.items),op,uid);
}
export class AtomicDatasetReplacement{
  constructor(private readonly database:Database,private readonly getUser:()=>User|null){}
  private async hdnd(){
    return objectOf((await get(ref(this.database,ROOT))).val());
  }
  /** Read-only preview: must never write anything. */
  async inspect(items:readonly Item[]):Promise<{old:Item[];candidate:Item[];changes:ReturnType<typeof compareBusinessImport>}>{
    assertAdmin(this.getUser());
    const live=await this.hdnd();
    const old=readItems(live.items);
    const candidate=items.map(validateFirebaseItem);
    if(!candidate.length)throw Error('Không được thay bằng tập dữ liệu rỗng.');
    return {old,candidate,changes:compareBusinessImport(old,candidate)};
  }
  /** Stage candidate and private VERIFIED full snapshot; no public item write. */
  async stage(items:readonly Item[],fileName:string,operationId:string):Promise<StageReceipt>{
    const user=assertAdmin(this.getUser());assertOperation(operationId);
    if(!fileName.trim()||fileName.length>255)throw Error('Tên tệp không hợp lệ.');
    const oldSnapshot=await this.hdnd();
    const candidate=prepareCandidate(items,operationId,user.uid);
    const oldRows=readItems(oldSnapshot.items),newRows=readItems(candidate);
    const previous=objectOf(oldSnapshot.importVault)[operationId];
    if(previous!==undefined)throw Error('Mã thao tác đã được dùng. Hãy tra cứu kết quả trước khi gửi lại.');
    const stage:DatasetStage={operationId,candidate,backup:captureOldSnapshot(oldSnapshot),
      baselineSignature:datasetSignature(oldSnapshot),
      candidateSignature:fingerprint(candidate),createdAt:Date.now(),owner:user.uid,
      count:newRows.length,fileName,candidateCodes:newRows.map(row=>row.displayCode)};
    await set(ref(this.database,`${ROOT}/importVault/${operationId}`),stage);
    const written=(await get(ref(this.database,`${ROOT}/importVault/${operationId}`))).val();
    if(!same(written,stage))throw Error('Đã gửi nhưng chưa xác nhận ứng viên/bản sao lưu đầy đủ. KHÔNG gửi lại.');
    verifyCandidate(objectOf(written).candidate,candidate);
    if(datasetSignature(await this.hdnd())!==stage.baselineSignature)
      throw Error('Nguồn đổi sau khi sao lưu; ứng viên bị khóa. Hãy bắt đầu lại quy trình.');
    return {operationId,count:newRows.length,oldCount:oldRows.length,newCount:newRows.length,
      newPreview:newRows,changes:compareBusinessImport(oldRows,newRows)};
  }
  /** Server CAS on the full hdnd root: never delete-before-insert. */
  async activate(operationId:string,confirmedFileName:string):Promise<ReplaceReceipt>{
    const user=assertAdmin(this.getUser());assertOperation(operationId);
    const raw=await this.hdnd(),stage=objectOf(objectOf(raw.importVault)[operationId]) as unknown as DatasetStage;
    if(stage.operationId!==operationId||stage.owner!==user.uid)
      throw Error('Không tìm thấy ứng viên riêng tư đã được chủ thao tác duyệt.');
    if(confirmedFileName!==stage.fileName)throw Error('Tên file xác nhận khác bản đã xem trước.');
    if(!same(stage.candidate,objectOf(raw.importVault)[operationId]&&
      (objectOf(raw.importVault)[operationId] as DatasetStage).candidate))
      throw Error('Ứng viên thay đổi; không áp dụng.');
    let conflict='';
    try{
      const result=await runTransaction(ref(this.database,ROOT),current=>{
        if(current===null)return undefined;
        try{
          const planned=planAtomicSwap(current,stage);
          if(objectOf(current.importState).operationId===operationId)return undefined;
          return planned;
        }catch(cause){conflict=cause instanceof Error?cause.message:'Dữ liệu nguồn đã thay đổi.';return undefined;}
      },{applyLocally:false});
      if(!result.committed&&conflict)throw Error(conflict);
    }catch(cause){
      // A lost ACK can mean committed. READ the operation marker, don't retry.
      const check=await this.hdnd().catch(()=>null);
      if(check&&objectOf(check.importState).operationId===operationId&&
        same(check.items,stage.candidate))
        return {operationId,generation:operationId,count:stage.count,confirmed:true,status:'applied'};
      throw new Error('Trạng thái thao tác chưa xác định; KHÔNG gửi nhập lại. Tra cứu theo mã '+
        operationId+'. '+(cause instanceof Error?cause.message:'Mất kết nối.'));
    }
    const verified=await this.hdnd();
    verifyCandidate(verified.items,stage.candidate);
    if(objectOf(verified.importState).operationId!==operationId)
      throw Error('Không xác nhận được con trỏ phiên dữ liệu; không báo thành công.');
    return {operationId,generation:operationId,count:stage.count,confirmed:true,status:'applied'};
  }
  async status(operationId:string):Promise<'committed'|'staged'|'missing'>{
    assertAdmin(this.getUser());assertOperation(operationId);
    const hdnd=await this.hdnd();
    if(objectOf(hdnd.importState).operationId===operationId)return 'committed';
    return objectOf(hdnd.importVault)[operationId]?'staged':'missing';
  }
  async restore(savedOperationId:string,restoreOperationId:string){
    assertAdmin(this.getUser());assertOperation(savedOperationId);
    const s=objectOf(objectOf((await this.hdnd()).importVault)[savedOperationId]) as unknown as DatasetStage;
    if(!s.backup||!Object.keys(s.backup.items).length)throw Error('Không tìm thấy bản sao lưu cũ hợp lệ.');
    const rows=readItems(prepareRestoreCandidate(s.backup,restoreOperationId,assertAdmin(this.getUser()).uid));
    return this.stage(rows,'KHOI PHUC '+savedOperationId,restoreOperationId);
  }
}
