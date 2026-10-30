import {get,ref,runTransaction,onValue,serverTimestamp,type Database,type DatabaseReference} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../shared/types';
import {firebaseAdmin,validateFirebaseItem} from './firebase-repository';
import {createDatasetManifest,verifyCandidateServerReadback,checkPointerSwap,
  type ActiveDatasetPointer,type DatasetGenerationManifest} from './dataset-replacement-integrity';
import {previewDatasetReplacement,type ReplacementPreview} from './dataset-replacement-preview';

/** Executable RTDB replacement coordinator, initially OFF the production UI. */
export const DATASET_V2_PATH='hdnd/datasetV2';
type V2Snapshot={
  active:ActiveDatasetPointer;
  generations:Record<string,{items:Record<string,Item>}>;
  permissions?:Record<string,unknown>;
  leases?:Record<string,unknown>;
  candidates?:Record<string,string>;
  backups?:Record<string,string>;
  operations?:Record<string,{status:string;from:string;to:string;at:number}>;
};
type V2Backup={previous:ActiveDatasetPointer;generation:{items:Record<string,Item>};
  permissionsJson:string;leasesJson:string;baseline:string};
export interface ReplacementApproval {
  operationId:string;manifest:DatasetGenerationManifest;
  expected:ActiveDatasetPointer;baseline:string;preview:ReplacementPreview;
  fileName:string;
}
export type ReplacementOutcome={status:'committed'|'already-committed'|'unknown';operationId:string};
/** Keep an active server listener while a parent RTDB transaction runs.
 * A one-shot get() alone does not necessarily populate the SDK transaction cache.
 */
async function holdTransactionCache(location:DatabaseReference):Promise<()=>void>{
  return new Promise((resolve,reject)=>{
    let released=false;
    const unsubscribe=onValue(location,snapshot=>{
      if(released)return;
      released=true;
      if(!snapshot.exists()){unsubscribe();reject(Error('Không có tập dữ liệu trên server.'));return;}
      resolve(unsubscribe);
    },reject);
  });
}
const adminGuard=(user:User|null)=>{
  if(!firebaseAdmin(user))throw Error('Chỉ tài khoản Google quản trị đã xác minh được thay dữ liệu.');
};
const record=(input:unknown):Record<string,unknown>=>{
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw Error('Cấu trúc Firebase không hợp lệ.');
  return input as Record<string,unknown>;
};
const stable=(input:unknown):string=>{
  const visit=(value:unknown):unknown=>{
    if(Array.isArray(value))return value.map(visit);
    if(value&&typeof value==='object')
      return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b,'en'))
        .map(([key,val])=>[key,visit(val)]));
    return value===undefined?null:value;
  };
  return JSON.stringify(visit(input));
};
const scoped=(snapshot:V2Snapshot)=>{
  const key=snapshot.active.generationId;
  const gen=snapshot.generations?.[key];
  if(!gen?.items)throw Error('Thiếu dữ liệu của thế hệ đang hoạt động.');
  return {active:snapshot.active,items:gen.items,
    permissions:snapshot.permissions?.[key]??null,leases:snapshot.leases?.[key]??null};
};
const verifyActive=(snapshot:V2Snapshot)=>{
  if(!snapshot.active||!snapshot.generations?.[snapshot.active.generationId]?.items)
    throw Error('Chưa có thế hệ Firebase được khởi tạo và xác nhận; không thay thế.');
};
const keyed=(items:readonly Item[]):Record<string,Item>=>Object.fromEntries(items.map(row=>[row.recordId,row]));
/** Stage and backup are real Emulator/RTDB writes, not preview-only fakes.
 * A readback verifies all values before the returned approval can be used.
 */
export async function stageDatasetReplacement(
  database:Database,user:User|null,items:readonly Item[],operationId:string,
  fileName:string
):Promise<ReplacementApproval>{
  adminGuard(user);
  if(!/^[^\\/]{1,180}\.xlsx$/i.test(fileName))
    throw Error('Cần tên file Excel .xlsx hợp lệ để xác nhận.');
  const manifest=await createDatasetManifest(items,operationId);
  const root=ref(database,DATASET_V2_PATH);
  const original=record((await get(root)).val()) as unknown as V2Snapshot;
  verifyActive(original);
  const current=scoped(original);
  const baseline=stable(current);
  const oldRows=Object.values(current.items);
  const preview=previewDatasetReplacement(oldRows,items);
  const candidateRef=ref(database,DATASET_V2_PATH+'/candidates/'+operationId);
  const payload={items:keyed(items),manifest};
  const payloadJson=JSON.stringify(payload);
  if(payloadJson.length>5000000)throw Error('Staging vượt giới hạn 5 MB; không ghi Firebase.');
  const existing=(await get(candidateRef)).val();
  if(existing!==null&&existing!==payloadJson)
    throw Error('operationId đã dùng với file khác. Dừng để kiểm tra trước khi thử lại.');
  if(existing===null){
    const inserted=await runTransaction(candidateRef,value=>value===null?payloadJson:undefined,
      {applyLocally:false});
    if(!inserted.committed&&inserted.snapshot.val()!==payloadJson)
      throw Error('Staging đã tồn tại với nội dung khác; không ghi đè.');
  }
  const serverCandidate=record(JSON.parse(String((await get(candidateRef)).val())));
  if(stable(serverCandidate.manifest)!==stable(manifest))
    throw Error('Manifest staging đọc lại khác bản được duyệt.');
  await verifyCandidateServerReadback(serverCandidate.items,manifest);
  // Capture everything tied to this generation, including permissions and leases;
  // it remains private and is never logged or committed to the repository.
  const backup:V2Backup={previous:current.active,
    generation:{items:current.items},permissionsJson:stable(current.permissions),
    leasesJson:stable(current.leases),baseline};
  const backupRef=ref(database,DATASET_V2_PATH+'/backups/'+operationId);
  const backupJson=JSON.stringify(backup);
  if(backupJson.length>5000000)throw Error('Backup vượt 5 MB; dừng để lập bản lưu riêng.');
  const previousBackup=(await get(backupRef)).val();
  if(previousBackup!==null&&previousBackup!==backupJson)
    throw Error('Đã có backup cho operationId nhưng dữ liệu gốc không trùng; dừng.');
  if(previousBackup===null){
    const written=await runTransaction(backupRef,value=>value===null?backupJson:undefined,
      {applyLocally:false});
    if(!written.committed&&written.snapshot.val()!==backupJson)
      throw Error('Backup đã tồn tại với dữ liệu khác; không ghi đè.');
  }
  if((await get(backupRef)).val()!==backupJson)
    throw Error('Không xác minh được backup riêng tư sau khi ghi vào Firebase.');
  return {operationId,manifest,expected:original.active,baseline,preview,fileName};
}
export async function readStagedDataset(database:Database,approval:ReplacementApproval):Promise<Item[]> {
  const raw=record(JSON.parse(String((await get(ref(database,DATASET_V2_PATH+'/candidates/'+approval.operationId))).val())));
  await verifyCandidateServerReadback(raw.items,approval.manifest);
  return Object.values(record(raw.items)) as Item[];
}
/** Resolve an ambiguous lost-ACK state by operationId. Never blindly retry a set(). */
export async function resolveDatasetOperation(database:Database,operationId:string):
  Promise<'committed'|'not-committed'|'unknown'> {
  try {
    const snap=(await get(ref(database,DATASET_V2_PATH))).val() as V2Snapshot|null;
    if(!snap)return 'unknown';
    const op=snap.operations?.[operationId];
    return op?.status==='COMMITTED'&&snap.active.operationId===operationId
      ?'committed':'not-committed';
  }catch{return 'unknown';}
}
/**
 * One parent-node server transaction makes both current-generation edits and
 * pointer changes conflict with the reviewer baseline. The old generation
 * stays immutable once inactive. This operation MUST be guarded by Rules.
 */
export async function commitDatasetReplacement(
  database:Database,user:User|null,approval:ReplacementApproval,confirmation:string
):Promise<ReplacementOutcome>{
  adminGuard(user);
  if(confirmation!=='THAY '+approval.operationId+' '+approval.preview.oldCount+' '+approval.preview.newCount)
    throw Error('Xác nhận không khớp operationId và số lượng hồ sơ cũ/mới.');
  const stagedJson=String((await get(ref(database,DATASET_V2_PATH+'/candidates/'+approval.operationId))).val());
  const staged=record(JSON.parse(stagedJson));
  if(stable(staged.manifest)!==stable(approval.manifest))
    throw Error('Staging đã bị thay đổi; không chấp nhận.');
  await verifyCandidateServerReadback(staged.items,approval.manifest);
  const backedJson=String((await get(ref(database,DATASET_V2_PATH+'/backups/'+approval.operationId))).val());
  const backed=record(JSON.parse(backedJson));
  if(stable(backed.previous)!==stable(approval.expected)||backed.baseline!==approval.baseline)
    throw Error('Bản backup không đúng mốc phê duyệt.');
  // Firebase SDK may first call a root transaction against an empty local
  // cache, treating undefined as an immediate abort without querying server.
  // Warm the exact parent path immediately before running the CAS.
  const rootRef=ref(database,DATASET_V2_PATH);
  verifyActive((await get(rootRef)).val() as V2Snapshot);
  const releaseCache=await holdTransactionCache(rootRef);
  let failure='';
  const result=await runTransaction(rootRef,raw=>{
    if(raw===null){failure='RTDB trả cache null dù đã đăng ký listener dữ liệu hiện hành.';return undefined;}
    const source=raw as V2Snapshot;
    try {
      verifyActive(source);
      const decision=checkPointerSwap(source.active,approval.expected,approval.manifest);
      if(decision==='already-committed')return undefined;
      if(stable(scoped(source))!==approval.baseline)
        throw Error('Dữ liệu đang sử dụng đã bị sửa trong lúc duyệt, kể cả cùng thế hệ.');
      if(source.candidates?.[approval.operationId]!==stagedJson||
        source.backups?.[approval.operationId]!==backedJson)
        throw Error('Ứng viên hoặc backup đã thay đổi sau bước xác minh.');
      if(source.generations[approval.manifest.generationId])
        throw Error('Mã thế hệ ứng viên đã tồn tại; không ghi chồng.');
      const hydrated=Object.fromEntries(Object.entries(staged.items as Record<string,Item>)
        .map(([id,item])=>[id,{...item,operationId:approval.operationId,
          updatedAt:serverTimestamp(),updatedBy:user!.uid}]));
      const next:V2Snapshot={...source,
        generations:{...source.generations,
          [approval.manifest.generationId]:{items:hydrated as Record<string,Item>}},
        permissions:{...source.permissions,[approval.manifest.generationId]:{columns:{}}},
        active:{generationId:approval.manifest.generationId,operationId:approval.operationId,
          revision:approval.expected.revision+1,rowCount:approval.manifest.rowCount,
          digest:approval.manifest.digest},
        operations:{...source.operations,[approval.operationId]:{
          status:'COMMITTED',from:approval.expected.generationId,
          to:approval.manifest.generationId,at:Date.now()}}};
      return next;
    }catch(error){failure=error instanceof Error?error.message:'Xung đột không rõ';return undefined;}
  },{applyLocally:false}).catch(error=>{failure=error instanceof Error?error.message:String(error);return null;});
  releaseCache();
  const status=await resolveDatasetOperation(database,approval.operationId);
  if(status==='committed'){
    if(result?.committed){
      // A fresh server readback, not merely an acknowledged transaction.
      const items=(await get(ref(database,DATASET_V2_PATH+'/generations/'+approval.manifest.generationId+'/items'))).val();
      const pure=Object.fromEntries(Object.entries(record(items))
        .map(([id,value])=>[id,validateFirebaseItem(value)]));
      await verifyCandidateServerReadback(pure,approval.manifest);
    }
    return {status:result?.committed?'committed':'already-committed',operationId:approval.operationId};
  }
  if(status==='unknown')return {status:'unknown',operationId:approval.operationId};
  throw Error(failure||'CAS không hoàn tất hoặc mốc dữ liệu đã thay đổi; không tự thử lại.');
}
/** No silent rollback: return the old generation as a NEW generation by CAS. */
export async function restoreDatasetBackup(
  database:Database,user:User|null,backupOperationId:string,restoreOperationId:string,
  expected:ActiveDatasetPointer,confirmation:string
):Promise<ReplacementOutcome>{
  adminGuard(user);
  if(!/^[A-Za-z0-9_-]{12,80}$/.test(restoreOperationId)||
    confirmation!=='KHOI PHUC '+restoreOperationId)
    throw Error('Cần mã khôi phục mới và xác nhận riêng.');
  const target='gen_'+restoreOperationId;
  const baseRef=ref(database,DATASET_V2_PATH);
  const snap=(await get(baseRef)).val() as V2Snapshot;
  verifyActive(snap);
  const backupJson=snap.backups?.[backupOperationId];
  const backup=backupJson?JSON.parse(backupJson) as V2Backup:undefined;
  if(!backup||stable({active:backup.previous,items:backup.generation.items,
    permissions:JSON.parse(backup.permissionsJson),leases:JSON.parse(backup.leasesJson)})!==backup.baseline)
    throw Error('Backup không tồn tại hoặc không còn nguyên vẹn.');
  const fingerprint=stable(scoped(snap));
  let failed='';
  const result=await runTransaction(baseRef,current=>{
    if(!current)return undefined;
    const state=current as V2Snapshot;
    if(stable(state.active)!==stable(expected)||stable(scoped(state))!==fingerprint||
      state.generations[target]||!state.backups?.[backupOperationId]){
      failed='Thế hệ hoặc dữ liệu đã thay đổi; không khôi phục trên dữ liệu mới.';return undefined;
    }
    if(state.backups[backupOperationId]!==backupJson){
      failed='Backup bị thay đổi trong khi xác nhận.';return undefined;
    }
    return {...state,
      generations:{...state.generations,[target]:{items:backup.generation.items}},
      permissions:{...state.permissions,[target]:JSON.parse(backup.permissionsJson)??{columns:{}}},
      active:{generationId:target,operationId:restoreOperationId,
        revision:expected.revision+1,rowCount:Object.keys(backup.generation.items).length,
        digest:backup.previous.digest},
      operations:{...state.operations,[restoreOperationId]:{
        status:'COMMITTED',from:expected.generationId,to:target,at:Date.now()}}};
  },{applyLocally:false}).catch(()=>null);
  const status=await resolveDatasetOperation(database,restoreOperationId);
  if(status==='unknown')return {status:'unknown',operationId:restoreOperationId};
  if(status==='committed')
    return {status:result?.committed?'committed':'already-committed',operationId:restoreOperationId};
  throw Error(failed||'Khôi phục không được chấp nhận; giữ nguyên thế hệ đang hoạt động.');
}
