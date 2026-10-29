import {get,ref,runTransaction,set,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../shared/types';
import {firebaseAdmin,validateFirebaseItem} from './firebase-repository';
import {EDITABLE_FIELDS} from '../domain/items';

/**
 * REVIEW CANDIDATE — DO NOT DEPLOY without audited RTDB candidate rules.
 *
 * An activeSet POINTER is the only cutover. Legacy hdnd/items and older
 * immutable generations remain intact; no delete-then-import sequence.
 * This API requires the database to be FROZEN and every edit lock to expire.
 * It neither unlocks the database nor changes any Firebase configuration.
 */
export const DATASET_POINTER='hdnd/activeDataset';
export const DATASET_VERSIONS='hdnd/datasetVersions';
export const DATASET_BACKUPS='hdnd/datasetBackups';
export const DATASET_PERMISSIONS='hdnd/datasetPermissions';
export const LEGACY_DATASET='legacy';
const SAFE_VERSION=/^(?:legacy|d_[a-f0-9]{32})$/;
const LIMIT=1000;
const DATA_FIELDS=['recordId','displayCode','stt','revision','archivedAt',
  ...EDITABLE_FIELDS] as const;
export interface ActiveDataset {
  version:string;
  revision:number;
  operationId:string;
  digest:string;
  switchedAt:number;
  switchedBy:string;
}
export interface ReplacementPlan {
  operationId:string;
  version:string;
  base:ActiveDataset|null;
  baseDigest:string;
  digest:string;
  filename:string;
  rows:Item[];
  added:number; changed:number; removed:number;
}
export interface DatasetBackup {
  operationId:string; active:ActiveDataset|null;
  previousRows:Record<string,unknown>;
  previousPermissions:unknown;
  previousLocks:unknown;
  previousDigest:string;
  capturedAt:number;
  capturedBy:string;
}
type ApprovedUser=Pick<User,'uid'|'email'|'emailVerified'|'providerData'>|null;
function assertAdmin(user:ApprovedUser):asserts user is NonNullable<ApprovedUser>{
  if(!user||!firebaseAdmin(user))throw new Error('Chỉ quản trị viên Google duy nhất được thay bộ dữ liệu.');
}
function asPointer(raw:unknown):ActiveDataset|null{
  if(raw===null)return null;
  if(!raw||typeof raw!=='object')throw new Error('Con trỏ dữ liệu Firebase không hợp lệ.');
  const p=raw as ActiveDataset;
  if(!SAFE_VERSION.test(p.version)||!Number.isSafeInteger(p.revision)||p.revision<1||
    typeof p.operationId!=='string'||typeof p.digest!=='string')
    throw new Error('Con trỏ dữ liệu Firebase bị lỗi, chưa thể thay.');
  return p;
}
export const activeVersion=(active:ActiveDataset|null)=>active?.version??LEGACY_DATASET;
export const itemsPathFor=(version:string)=>version===LEGACY_DATASET?'hdnd/items':
  `${DATASET_VERSIONS}/${version}/items`;
export const locksPathFor=(version:string)=>version===LEGACY_DATASET?'hdnd/editLocks':
  `hdnd/datasetEditLocks/${version}`;
export const permissionsPathFor=(version:string)=>version===LEGACY_DATASET?'hdnd/permissions':
  `${DATASET_PERMISSIONS}/${version}`;
function asRows(raw:unknown):Item[]{
  if(raw===null)return [];
  if(typeof raw!=='object'||Array.isArray(raw))throw new Error('Tập dữ liệu Firebase không hợp lệ.');
  return Object.entries(raw).map(([key,value])=>{
    const row=validateFirebaseItem(value);
    if(key!==row.recordId)throw new Error('ID hồ sơ trong Firebase không khớp khóa: '+key);
    return row;
  }).sort((a,b)=>a.recordId.localeCompare(b.recordId));
}
function canonical(items:readonly Item[]):unknown[]{
  return items.map(item=>Object.fromEntries(DATA_FIELDS.map(field=>
    [field,item[field]??null]))).sort((a,b)=>String(a.recordId).localeCompare(String(b.recordId)));
}
export async function datasetDigest(items:readonly Item[]):Promise<string>{
  const bytes=new TextEncoder().encode(JSON.stringify(canonical(items)));
  const hash=await crypto.subtle.digest('SHA-256',bytes);
  return Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('');
}
function validateWhole(items:readonly Item[]):Item[]{
  if(!items.length||items.length>LIMIT)throw new Error('File phải có từ 1 đến 1.000 hồ sơ.');
  const ids=new Set<string>(),codes=new Set<string>();
  return items.map(input=>{
    const row=validateFirebaseItem({...input,revision:1,archivedAt:input.archivedAt??null});
    const code=row.displayCode.trim().toLocaleLowerCase('vi');
    if(ids.has(row.recordId)||codes.has(code))
      throw new Error('Mã hoặc recordId trùng: '+row.displayCode);
    if(row.isDropped||row.archivedAt)throw new Error('File có hồ sơ rút/lưu trữ chưa được xét: '+row.displayCode);
    ids.add(row.recordId);codes.add(code);
    return row;
  });
}
async function readActive(database:Database){
  return asPointer((await get(ref(database,DATASET_POINTER))).val());
}
async function readRows(database:Database,version:string){
  return asRows((await get(ref(database,itemsPathFor(version)))).val());
}
async function assertFrozen(database:Database):Promise<void>{
  const [freeze,control,locks]=await Promise.all([
    get(ref(database,'hdnd/freezeControl')),
    get(ref(database,'hdnd/control')),
    get(ref(database,'hdnd/editLocks')),
  ]);
  if(freeze.val()?.mode!=='FROZEN')
    throw new Error('Phải đóng băng dữ liệu (FROZEN) trước khi sao lưu/thay thế.');
  if(control.val()?.editingLocked!==true)
    throw new Error('Phải bật khóa chỉnh sửa toàn hệ thống trước khi thay thế.');
  // A lingering lock cannot authorize a write while FROZEN, but surface it
  // explicitly for independent QA and operator awareness.
  if(locks.val()!==null){
    const active=Object.values(locks.val() as Record<string,Record<string,{expiresAt?:number}>>)
      .some(fields=>Object.values(fields??{}).some(value=>
        Number(value?.expiresAt??0)>Date.now()));
    if(active)throw new Error('Có khóa ô chưa hết hạn; chưa được chuyển tập dữ liệu.');
  }
}
export async function planDatasetReplacement(
  database:Database,user:ApprovedUser,filename:string,source:readonly Item[]
):Promise<ReplacementPlan>{
  assertAdmin(user);
  if(!/^.{1,160}\.xlsx$/i.test(filename))throw new Error('Phải chọn file .xlsx hợp lệ.');
  const rows=validateWhole(source);
  const base=await readActive(database);
  const current=await readRows(database,activeVersion(base));
  const digest=await datasetDigest(rows),baseDigest=await datasetDigest(current);
  const old=new Map(current.map(row=>[row.recordId,row]));
  const next=new Set(rows.map(row=>row.recordId));
  return {operationId:crypto.randomUUID(),version:'d_'+crypto.randomUUID().replaceAll('-',''),
    base,baseDigest,digest,filename,rows,
    added:rows.filter(row=>!old.has(row.recordId)).length,
    changed:rows.filter(row=>old.has(row.recordId)&&
      JSON.stringify(canonical([row]))!==JSON.stringify(canonical([old.get(row.recordId)!]))).length,
    removed:current.filter(row=>!next.has(row.recordId)).length};
}
function rawPayload(rows:readonly Item[],uid:string){
  return Object.fromEntries(rows.map(row=>{
    const payload:Record<string,unknown>={};
    for(const field of DATA_FIELDS){
      if(field==='archivedAt'){if(row.archivedAt)payload[field]=row.archivedAt;continue;}
      payload[field]=row[field];
    }
    payload.operationId=crypto.randomUUID();
    payload.updatedAt=Date.now();payload.updatedBy=uid;
    return [row.recordId,payload];
  }));
}
/** Stage to a brand-new immutable generation; never touch the active rows. */
export async function stageDatasetReplacement(database:Database,user:ApprovedUser,plan:ReplacementPlan){
  assertAdmin(user);
  await assertFrozen(database);
  if((await readActive(database))?.revision!==plan.base?.revision)
    throw new Error('Con trỏ dữ liệu đã đổi; phải lập bản xem trước mới.');
  const current=await readRows(database,activeVersion(plan.base));
  if(await datasetDigest(current)!==plan.baseDigest)
    throw new Error('Nguồn dữ liệu đã thay đổi sau khi kiểm tra; phải làm lại.');
  const location=ref(database,`${DATASET_VERSIONS}/${plan.version}`);
  const payload={manifest:{operationId:plan.operationId,digest:plan.digest,
      count:plan.rows.length,createdAt:Date.now(),createdBy:user.uid},
    items:rawPayload(plan.rows,user.uid)};
  const existing=(await get(location)).val();
  if(existing===null)await set(location,payload);
  else if(existing.manifest?.operationId!==plan.operationId||existing.manifest?.digest!==plan.digest)
    throw new Error('ID thao tác đã được dùng bởi tập ứng viên khác; không nhập nối.');
  await verifyStagedDataset(database,user,plan);
  return plan;
}
export async function verifyStagedDataset(database:Database,user:ApprovedUser,plan:ReplacementPlan){
  assertAdmin(user);
  const snapshot=(await get(ref(database,`${DATASET_VERSIONS}/${plan.version}`))).val();
  if(snapshot?.manifest?.operationId!==plan.operationId||
    snapshot?.manifest?.digest!==plan.digest||snapshot.manifest.count!==plan.rows.length)
    throw new Error('Ứng viên không khớp metadata, chưa được áp dụng.');
  const items=asRows(snapshot.items);
  if(items.length!==plan.rows.length||await datasetDigest(items)!==plan.digest)
    throw new Error('Đọc lại ứng viên không khớp từng hồ sơ và trường dữ liệu.');
  return items;
}
/** Private Firebase backup, not a public GitHub artifact. */
export async function backupBeforeReplacement(database:Database,user:ApprovedUser,plan:ReplacementPlan){
  assertAdmin(user);await assertFrozen(database);
  const pointer=await readActive(database);
  if(JSON.stringify(pointer)!==JSON.stringify(plan.base))
    throw new Error('Nguồn hoặc phiên bản đã đổi, bản xem trước hết hạn.');
  const path=itemsPathFor(activeVersion(pointer));
  const [rows,permissions,locks]=await Promise.all([
    get(ref(database,path)),get(ref(database,permissionsPathFor(activeVersion(pointer)))),
    get(ref(database,locksPathFor(activeVersion(pointer))))
  ]);
  const verified=asRows(rows.val());
  if(await datasetDigest(verified)!==plan.baseDigest)
    throw new Error('Dữ liệu đã đổi sau bước kiểm tra; không sao lưu nhầm phiên.');
  const backup:DatasetBackup={operationId:plan.operationId,active:pointer,
    previousRows:rows.val()??{},previousPermissions:permissions.val()??{},
    previousLocks:locks.val()??{},previousDigest:plan.baseDigest,
    capturedAt:Date.now(),capturedBy:user.uid};
  const location=ref(database,`${DATASET_BACKUPS}/${plan.operationId}`);
  if((await get(location)).exists())throw new Error('Bản sao lưu đã tồn tại, không ghi đè.');
  await set(location,backup);
  const saved=(await get(location)).val() as DatasetBackup|null;
  if(!saved||saved.operationId!==plan.operationId||
    await datasetDigest(asRows(saved.previousRows))!==plan.baseDigest)
    throw new Error('Chưa xác minh được bản sao lưu riêng tư và khả năng đọc lại.');
  return backup;
}
/**
 * Exactly one active pointer transaction; candidate and legacy remain whole.
 * On network ambiguity the caller MUST query the server by operationId.
 */
export async function activateDatasetReplacement(
 database:Database,user:ApprovedUser,plan:ReplacementPlan,confirmedFilename:string
):Promise<ActiveDataset>{
  assertAdmin(user);
  if(confirmedFilename!==plan.filename)
    throw new Error('Xác nhận tên file không khớp; chưa áp dụng thay thế.');
  await assertFrozen(database);
  await verifyStagedDataset(database,user,plan);
  const backup=(await get(ref(database,`${DATASET_BACKUPS}/${plan.operationId}`))).val() as DatasetBackup|null;
  if(!backup||backup.previousDigest!==plan.baseDigest)
    throw new Error('Chưa có sao lưu được xác minh cho đúng thao tác.');
  const current=await readActive(database);
  if(JSON.stringify(current)!==JSON.stringify(plan.base))
    throw new Error('Có phiên thay thế khác hoặc dữ liệu thay đổi; kết quả duyệt đã cũ.');
  if(await datasetDigest(await readRows(database,activeVersion(plan.base)))!==plan.baseDigest)
    throw new Error('Dữ liệu hoạt động đã thay đổi; phải xem xét lại.');
  const pointer:ActiveDataset={version:plan.version,revision:(plan.base?.revision??0)+1,
    operationId:plan.operationId,digest:plan.digest,switchedAt:Date.now(),switchedBy:user.uid};
  const result=await runTransaction(ref(database,DATASET_POINTER),raw=>{
    const live=asPointer(raw);
    if(JSON.stringify(live)!==JSON.stringify(plan.base))return undefined;
    return pointer;
  },{applyLocally:false});
  if(!result.committed)
    throw new Error('Không chuyển con trỏ: có thao tác khác vừa thay dữ liệu; cần kiểm tra lại.');
  const readBack=await verifyReplacementOutcome(database,plan.operationId,plan.digest);
  if(readBack!=='APPLIED')
    throw new Error('Chưa xác nhận kết quả thay thế; tra cứu operationId, không gửi lại thao tác.');
  return pointer;
}
export async function verifyReplacementOutcome(database:Database,opId:string,digest:string):
  Promise<'APPLIED'|'NOT_APPLIED'|'UNKNOWN'>{
  const pointer=await readActive(database);
  if(pointer?.operationId!==opId)return 'NOT_APPLIED';
  const rows=await readRows(database,pointer.version);
  return await datasetDigest(rows)===digest?'APPLIED':'UNKNOWN';
}
/** Roll back by switching the pointer, NEVER deleting current or backup rows. */
export async function restoreDatasetBackup(database:Database,user:ApprovedUser,
  backupOperationId:string,restoreOperationId:string):Promise<ActiveDataset>{
  assertAdmin(user);await assertFrozen(database);
  if(!/^[0-9a-f-]{36}$/i.test(restoreOperationId))
    throw new Error('Mã thao tác khôi phục không hợp lệ.');
  const backup=(await get(ref(database,`${DATASET_BACKUPS}/${backupOperationId}`))).val() as DatasetBackup|null;
  if(!backup||backup.operationId!==backupOperationId)throw new Error('Không tìm thấy bản sao lưu riêng tư.');
  const oldVersion=activeVersion(backup.active);
  const restored=await readRows(database,oldVersion);
  if(await datasetDigest(restored)!==backup.previousDigest)
    throw new Error('Dữ liệu phiên cũ không khớp bản sao lưu. Không chuyển con trỏ.');
  const current=await readActive(database);
  if(!current)throw new Error('Chưa có phiên thay thế đang hoạt động để khôi phục.');
  const pointer:ActiveDataset={version:oldVersion,revision:current.revision+1,
    operationId:restoreOperationId,digest:backup.previousDigest,
    switchedAt:Date.now(),switchedBy:user.uid};
  const result=await runTransaction(ref(database,DATASET_POINTER),raw=>{
    const latest=asPointer(raw);
    if(JSON.stringify(latest)!==JSON.stringify(current))return undefined;
    return pointer;
  },{applyLocally:false});
  if(!result.committed)throw new Error('Có phiên khác đã thay con trỏ; không ghi đè.');
  if(await verifyReplacementOutcome(database,restoreOperationId,backup.previousDigest)!=='APPLIED')
    throw new Error('Chưa xác nhận khôi phục; tra cứu mã thao tác, không thử lặp.');
  return pointer;
}
