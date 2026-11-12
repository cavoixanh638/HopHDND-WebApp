/**
 * Simplified, self-service maintenance for the legacy primary `hdnd/items`.
 * No Worker, R2, service-account key, storage subscription or server secret.
 * The owner keeps a plain local JSON backup. Google-admin RTDB Rules remain
 * the authoritative permission boundary. Never mutates root /items, mirrors,
 * profile, grants or V2 generations.
 */
import {get,ref,runTransaction,remove,type Database} from 'firebase/database';
import {getIdToken,type User} from 'firebase/auth';
import type {Item} from '../../shared/types';
import {firebaseAdmin,validateFirebaseItem} from './firebase-repository';
import {activeEditLeaseCount,readActiveDatasetPointer,readFreeze,setFreezeMode,
  type FreezeControl} from './freeze-control';
import {sha256String,stableBackupJson} from './admin-backup-format';
import {firebaseConfig} from './firebase-config';

const DATA_PATH='hdnd/items';
const MAX_BYTES=5*1024*1024;
const MAX_ROWS=1000;
export type RawItems=Record<string,unknown>|null;
type Payload={
  format:'hophdnd-simple-items';schemaVersion:1;projectId:string;
  databaseURL:string;createdAt:string;count:number;items:RawItems;
};
export type SimpleFileBackup={payload:Payload;sha256:string};
export type SimpleItemsSnapshot={items:RawItems;count:number;sha256:string};
const plain=(x:unknown):x is Record<string,unknown>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const bytes=(value:string)=>new TextEncoder().encode(value).byteLength;
function checkedRows(raw:unknown):SimpleItemsSnapshot['items'] {
  if(raw===null)return null;
  if(!plain(raw))throw Error('Danh sách Firebase có cấu trúc không hợp lệ.');
  const entries=Object.entries(raw);
  if(entries.length>MAX_ROWS)throw Error('Chỉ hỗ trợ tối đa 1.000 hồ sơ.');
  const codes=new Set<string>();
  for(const [key,value] of entries){
    const row=validateFirebaseItem(value);
    if(row.recordId!==key||codes.has(row.displayCode))
      throw Error('Mã/ID hồ sơ bị trùng hoặc không khớp.');
    codes.add(row.displayCode);
  }
  return raw;
}
async function assertAdmin(database:Database,user:User|null):Promise<void>{
  if(!user||user.isAnonymous||!firebaseAdmin(user))
    throw Error('Chỉ tài khoản Google Admin được phép quản lý dữ liệu.');
  if(database.app.options.projectId!==firebaseConfig.projectId)
    throw Error('Ứng dụng đang trỏ tới Firebase project không mong đợi.');
  await getIdToken(user,true);
  if(await readActiveDatasetPointer(database))
    throw Error('Firebase đã dùng dữ liệu V2; không dùng chức năng thay thế legacy.');
}
async function readSnapshot(database:Database):Promise<SimpleItemsSnapshot>{
  const items=checkedRows((await get(ref(database,DATA_PATH))).val());
  const serialized=stableBackupJson(items);
  if(bytes(serialized)>MAX_BYTES)throw Error('Dữ liệu vượt giới hạn backup 5 MB.');
  return {items,count:items?Object.keys(items).length:0,
    sha256:await sha256String(serialized)};
}
export async function createSimpleBackup(database:Database,user:User|null):Promise<SimpleFileBackup>{
  await assertAdmin(database,user);
  // A GET of one RTDB node is a consistent snapshot; no extra storage service.
  const snapshot=await readSnapshot(database);
  const payload:Payload={format:'hophdnd-simple-items',schemaVersion:1,
    projectId:database.app.options.projectId??'',
    databaseURL:database.app.options.databaseURL??firebaseConfig.databaseURL,
    createdAt:new Date().toISOString(),count:snapshot.count,items:snapshot.items};
  const sha256=await sha256String(stableBackupJson(payload));
  return {payload,sha256};
}
export function downloadSimpleBackup(backup:SimpleFileBackup):string{
  const name='HopHDND-'+backup.payload.createdAt.replace(/[:.]/g,'-')+
    '-'+backup.sha256.slice(0,8)+'.json';
  const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return name;
}
export async function inspectSimpleBackup(json:string,database:Database):Promise<SimpleFileBackup>{
  if(bytes(json)>MAX_BYTES)throw Error('Backup JSON vượt 5 MB.');
  let raw:unknown;
  try{raw=JSON.parse(json)}catch{throw Error('Backup không phải JSON hợp lệ.')}
  if(!plain(raw)||Object.keys(raw).sort().join(',')!=='payload,sha256'||
    !plain(raw.payload)||typeof raw.sha256!=='string'||!/^[a-f0-9]{64}$/.test(raw.sha256))
    throw Error('Backup không đúng định dạng Họp HĐND.');
  const p=raw.payload;
  if(Object.keys(p).sort().join(',')!==
    'count,createdAt,databaseURL,format,items,projectId,schemaVersion'||
    p.format!=='hophdnd-simple-items'||p.schemaVersion!==1||
    p.projectId!==database.app.options.projectId||
    p.databaseURL!==(database.app.options.databaseURL??firebaseConfig.databaseURL)||
    typeof p.createdAt!=='string'||!Number.isFinite(Date.parse(p.createdAt))||
    typeof p.count!=='number'||!Number.isSafeInteger(p.count)||p.count<0)
    throw Error('Backup không thuộc đúng Firebase/project hoặc sai phiên bản.');
  const items=checkedRows(p.items);
  if((items?Object.keys(items).length:0)!==p.count)
    throw Error('Số hồ sơ trong backup không khớp.');
  if(await sha256String(stableBackupJson(p))!==raw.sha256)
    throw Error('Backup bị chỉnh sửa hoặc hỏng (SHA-256 không khớp).');
  return raw as unknown as SimpleFileBackup;
}
/** Excel business rows are immutable input; metadata is re-issued by Firebase. */
export function simpleExcelCandidate(rows:readonly Item[],uid:string):RawItems {
  if(!rows.length||rows.length>MAX_ROWS)throw Error('Excel phải có 1–1.000 hồ sơ.');
  const codes=new Set<string>(),ids=new Set<string>(),target:Record<string,unknown>={};
  const now=Date.now();
  for(const original of rows){
    const row=validateFirebaseItem(original);
    if(ids.has(row.recordId)||codes.has(row.displayCode))
      throw Error('Excel có ID hoặc mã trùng nhau.');
    ids.add(row.recordId);codes.add(row.displayCode);
    const {archivedAt,...item}=row;
    if(row.revision!==1||row.isDropped||archivedAt)
      throw Error('Excel chứa dấu vết sửa cũ: '+row.displayCode);
    target[row.recordId]={...item,operationId:crypto.randomUUID(),
      updatedAt:now,updatedBy:uid};
  }
  if(bytes(stableBackupJson(target))>MAX_BYTES)
    throw Error('Tệp Excel sau chuyển đổi vượt 5 MB.');
  return target;
}
export type SimpleDraft={action:'clear'|'restore'|'excel';expectedSha256:string;
  oldCount:number;newCount:number;candidate:RawItems;freezeRevision:number;
  freezeEpoch:number;createdAt:number};
export async function prepareSimpleChange(database:Database,user:User|null,
  action:SimpleDraft['action'],candidate:RawItems):Promise<SimpleDraft>{
  await assertAdmin(database,user);
  const checked=checkedRows(candidate);
  const source=await readSnapshot(database);
  const freeze=await readFreeze(database);
  return {action,expectedSha256:source.sha256,oldCount:source.count,
    newCount:checked?Object.keys(checked).length:0,candidate:checked,
    freezeRevision:freeze.revision,freezeEpoch:freeze.epoch,createdAt:Date.now()};
}
/**
 * A single RTDB transaction replaces ONLY hdnd/items with optimistic snapshot
 * compare. The Rules grant this parent operation to the verified Google admin
 * when FROZEN and V2 is absent. A write to '/' or '/hdnd' is never attempted.
 */
export async function commitSimpleChange(database:Database,user:User|null,
  draft:SimpleDraft):Promise<number>{
  await assertAdmin(database,user);
  if(Date.now()-draft.createdAt>10*60*1000)
    throw Error('Bản xem trước đã quá 10 phút, hãy kiểm tra lại.');
  const beforeFreeze=await readFreeze(database);
  if(beforeFreeze.epoch!==draft.freezeEpoch||
    beforeFreeze.revision!==draft.freezeRevision)
    throw Error('Chế độ đóng băng đã thay đổi sau khi xem trước.');
  const baseline=await readSnapshot(database);
  if(baseline.sha256!==draft.expectedSha256)
    throw Error('Dữ liệu đã thay đổi; hãy tải backup và đối chiếu lại.');
  // If already FROZEN, preserve that state. Otherwise close edits briefly.
  let ourFreeze:FreezeControl|null=null;
  let permitToken='';
  const permitRef=ref(database,'hdnd/simpleMaintenancePermit');
  try{
    if(beforeFreeze.mode==='OPEN')
      ourFreeze=await setFreezeMode(database,user,beforeFreeze,'FROZEN',true);
    else if(beforeFreeze.mode!=='FROZEN')
      throw Error('Đang chờ khóa sửa kết thúc. Hãy thử lại sau.');
    if(await activeEditLeaseCount(database)!==0)
      throw Error('Vẫn còn ô đang được sửa. Không thay dữ liệu.');
    // Permit exists for a single brief Admin operation, so ordinary frozen
    // raw cell/collection writes still fail the existing Firebase Rules.
    const token=crypto.randomUUID(),uid=user?.uid??'';
    await get(permitRef);
    const lease=await runTransaction(permitRef,current=>{
      const entry=current as {expiresAt?:number}|null;
      if(entry&&Number(entry.expiresAt)>Date.now())return undefined;
      return {uid,token,expiresAt:Date.now()+45000};
    },{applyLocally:false});
    if(!lease.committed||lease.snapshot.val()?.token!==token)
      throw Error('Đang có một thao tác quản trị khác. Thử lại sau.');
    permitToken=token;
    const expected=stableBackupJson(baseline.items);
    const target=stableBackupJson(draft.candidate);
    await get(ref(database,DATA_PATH)); // server read before optimistic commit
    // The RTDB SDK may invoke an updater once against a COLD null local cache
    // despite get() having just returned a nonempty server snapshot. Allow a
    // single tentative proposal; the server will compare/retry its transaction
    // against the actual current state. Our short-lived exclusive Admin permit
    // and FROZEN mode block other ordinary writers during this window.
    let firstColdProposal=true;
    const tx=await runTransaction(ref(database,DATA_PATH),raw=>{
      const actual=stableBackupJson(raw??null);
      if(actual===expected)return draft.candidate;
      if(raw===null&&baseline.items!==null&&firstColdProposal){
        firstColdProposal=false;
        return draft.candidate;
      }
      return undefined;
    },{applyLocally:false});
    if(!tx.committed)throw Error('Dữ liệu đã thay đổi hoặc Rules từ chối ghi.');
    const result=await readSnapshot(database);
    if(stableBackupJson(result.items)!==target||result.count!==draft.newCount)
      throw Error('Chưa xác nhận được nội dung đã ghi. Hãy đọc lại trước khi thử lần nữa.');
    return result.count;
  }finally{
    if(permitToken){
      try{
        const current=(await get(permitRef)).val();
        if(current?.token===permitToken&&current?.uid===user?.uid)
          await remove(permitRef); // Rules only allow the current owner
      }catch{/* The permit expires automatically; never delete another owner's. */}
    }
    if(ourFreeze){
      // Do not reopen if another admin has changed the freeze epoch.
      const live=await readFreeze(database);
      if(live.mode==='FROZEN'&&live.revision===ourFreeze.revision&&
        live.epoch===ourFreeze.epoch)
        await setFreezeMode(database,user,live,'OPEN');
    }
  }
}
