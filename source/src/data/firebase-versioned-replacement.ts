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
/**
 * PR95 TEST ONLY: one-shot lost completion at SDK -> application API boundary.
 * The REAL Rules-authorized RTDB transaction has returned committed=true,
 * but the caller receives no successful outcome. This is an application
 * result/ack failure, NOT proof a server-to-SDK websocket ACK was dropped.
 * Never enabled in production; demo project and local test build only.
 */
const pendingCallerAckLoss=new WeakMap<Database,Set<string>>();
export function armEmulatorPostCommitCallerAckLoss(database:Database,operationId:string):void {
  const mode=import.meta.env.MODE;
  if((mode!=='test'&&mode!=='pages-test')||
    !database.app.options.projectId?.startsWith('demo-hdnd')||
    (typeof window!=='undefined'&&!['localhost','127.0.0.1'].includes(window.location.hostname))||
    !/^[A-Za-z0-9_-]{12,80}$/.test(operationId))
    throw Error('PR95 fault injection requires localhost demo Emulator test build.');
  let ids=pendingCallerAckLoss.get(database);
  if(!ids){ids=new Set();pendingCallerAckLoss.set(database,ids);}
  ids.add(operationId);
}
function loseCallerAckAfterRealCommit(database:Database,operationId:string,committed:boolean):void {
  if(!committed)return;
  const ids=pendingCallerAckLoss.get(database);
  if(!ids?.delete(operationId))return;
  if(!ids.size)pendingCallerAckLoss.delete(database);
  throw Error('PR95_TEST_ONLY_LOST_CALLER_ACK_AFTER_SERVER_CAS: '+operationId+
    ' — server COMMITTED, SDK acknowledged, app caller lost completion.');
}

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

/**
 * API-CHANGE-01 BACKEND-ONLY PROTOTYPE: no client may activate it until the
 * signature/confirmation are ACKed and the emulator security suite passes.
 * Freeze a populated legacy dataset using the existing admin freeze workflow
 * BEFORE calling prepare; never freeze as an unannounced side effect here.
 */
export interface InitialActivationApproval {
  operationId:string;manifest:DatasetGenerationManifest;
  legacyBaseline:string;legacyRowCount:number;
  freezeRevision:number;freezeEpoch:number;
  preview:ReplacementPreview;fileName:string;
}
type LegacyFreezeEvidence={mode:string;revision:number;epoch:number;closedAt:number};
type LegacyBackup={
  legacy:{items:Record<string,unknown>;permissions:unknown;editLocks:unknown};
  freeze:LegacyFreezeEvidence;baseline:string;manifest:DatasetGenerationManifest
};
const freezeEvidence=(input:unknown):LegacyFreezeEvidence=>{
  const freeze=record(input) as unknown as LegacyFreezeEvidence;
  if(freeze.mode!=='FROZEN'||!Number.isSafeInteger(freeze.revision)||
    freeze.revision<1||!Number.isSafeInteger(freeze.epoch)||freeze.epoch<1||
    !Number.isSafeInteger(freeze.closedAt)||freeze.closedAt<1)
    throw Error('Phải đóng băng và xác nhận revision/epoch trên Firebase trước khi khởi tạo V2.');
  return {mode:freeze.mode,revision:freeze.revision,
    epoch:freeze.epoch,closedAt:freeze.closedAt};
};
const legacyState=async(database:Database)=>{
  const [freeze,items,permissions,editLocks]=await Promise.all([
    get(ref(database,'hdnd/freezeControl')),get(ref(database,'hdnd/items')),
    get(ref(database,'hdnd/permissions')),get(ref(database,'hdnd/editLocks'))
  ]);
  const frozen=freezeEvidence(freeze.val());
  const entries=record(items.val());
  if(Object.keys(entries).length<1||Object.keys(entries).length>1000)
    throw Error('Legacy phải có 1–1.000 hồ sơ trước khi khởi tạo thế hệ.');
  const rows=Object.entries(entries).map(([key,value])=>{
    const row=validateFirebaseItem(value);
    if(row.recordId!==key)throw Error('Khóa legacy và recordId không khớp: '+key);
    return row;
  });
  const second=freezeEvidence((await get(ref(database,'hdnd/freezeControl'))).val());
  if(stable(second)!==stable(frozen))
    throw Error('Trạng thái đóng băng thay đổi trong khi chụp dữ liệu legacy.');
  return {legacy:{items:entries,permissions:permissions.val(),editLocks:editLocks.val()},
    freeze:frozen,rows};
};
const legacyHash=async(value:unknown):Promise<string>=>{
  if(!globalThis.crypto?.subtle)throw Error('Không có SHA-256 để xác minh backup legacy.');
  const bytes=new TextEncoder().encode(stable(value));
  const digest=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
  return Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
};
/** Staging and backup are immutable private RTDB strings; neither changes active. */
export async function prepareInitialDatasetActivation(
  database:Database,user:User|null,items:readonly Item[],operationId:string,
  fileName:string
):Promise<InitialActivationApproval>{
  adminGuard(user);
  if(!/^[^\\/]{1,180}\.xlsx$/i.test(fileName))
    throw Error('Cần tên file Excel .xlsx hợp lệ.');
  const manifest=await createDatasetManifest(items,operationId);
  if((await get(ref(database,DATASET_V2_PATH+'/active'))).exists())
    throw Error('V2 đã có con trỏ hoạt động; không được khởi tạo lần thứ hai.');
  const snapshot=await legacyState(database);
  const baseline=await legacyHash({legacy:snapshot.legacy,freeze:snapshot.freeze});
  const preview=previewDatasetReplacement(snapshot.rows,items);
  const candidateRef=ref(database,DATASET_V2_PATH+'/candidates/'+operationId);
  const candidateJson=JSON.stringify({items:keyed(items),manifest});
  if(candidateJson.length>5000000)throw Error('Ứng viên lớn hơn 5 MB.');
  const candidateWrite=await runTransaction(candidateRef,raw=>
    raw===null?candidateJson:raw===candidateJson?undefined:undefined,
    {applyLocally:false});
  if(!candidateWrite.committed&&candidateWrite.snapshot.val()!==candidateJson)
    throw Error('operationId đã được dùng với ứng viên khác.');
  const readback=record(JSON.parse(String((await get(candidateRef)).val())));
  if(stable(readback.manifest)!==stable(manifest))
    throw Error('Manifest trong staging không khớp.');
  await verifyCandidateServerReadback(readback.items,manifest);
  const sealed:LegacyBackup={legacy:snapshot.legacy,freeze:snapshot.freeze,
    baseline,manifest};
  const backupJson=stable(sealed);
  if(backupJson.length>5000000)throw Error('Backup legacy lớn hơn 5 MB.');
  const backupRef=ref(database,DATASET_V2_PATH+'/legacyBackups/'+operationId);
  const stored=await runTransaction(backupRef,raw=>
    raw===null?backupJson:undefined,{applyLocally:false});
  if(!stored.committed&&stored.snapshot.val()!==backupJson)
    throw Error('operationId đã có backup legacy khác; không ghi đè.');
  if((await get(backupRef)).val()!==backupJson)
    throw Error('Không đọc lại được backup legacy riêng tư.');
  const confirmed=await legacyState(database);
  if(await legacyHash({legacy:confirmed.legacy,freeze:confirmed.freeze})!==baseline)
    throw Error('Legacy đã thay đổi sau khi staging; hủy phê duyệt.');
  if((await get(ref(database,DATASET_V2_PATH+'/active'))).exists())
    throw Error('Tab khác đã kích hoạt V2 trong khi lập backup.');
  return {operationId,manifest,legacyBaseline:baseline,
    legacyRowCount:snapshot.rows.length,freezeRevision:snapshot.freeze.revision,
    freezeEpoch:snapshot.freeze.epoch,preview,fileName};
}
/** First V2 pointer install: server Rules re-check freeze revision at COMMIT. */
export async function commitInitialDatasetActivation(
  database:Database,user:User|null,approval:InitialActivationApproval,
  confirmation:string
):Promise<ReplacementOutcome>{
  adminGuard(user);
  const {operationId,manifest}=approval;
  if(confirmation!=='KHOI TAO V2 '+operationId+' '+approval.legacyRowCount+
      ' '+approval.preview.newCount)
    throw Error('Xác nhận khởi tạo V2 không khớp mã và số hồ sơ.');
  if(approval.preview.oldCount!==approval.legacyRowCount||
    approval.preview.newCount!==manifest.rowCount||
    manifest.operationId!==operationId||manifest.generationId!=='gen_'+operationId)
    throw Error('Phiếu phê duyệt khởi tạo V2 không nhất quán.');
  const candidateJson=(await get(ref(database,DATASET_V2_PATH+
    '/candidates/'+operationId))).val();
  const backupJson=(await get(ref(database,DATASET_V2_PATH+
    '/legacyBackups/'+operationId))).val();
  if(typeof candidateJson!=='string'||typeof backupJson!=='string')
    throw Error('Thiếu staging hoặc backup legacy đã xác minh.');
  const candidate=record(JSON.parse(candidateJson));
  const backup=record(JSON.parse(backupJson)) as unknown as LegacyBackup;
  if(stable(candidate.manifest)!==stable(manifest)||
    stable(backup.manifest)!==stable(manifest)||
    backup.baseline!==approval.legacyBaseline||
    backup.freeze.revision!==approval.freezeRevision||
    backup.freeze.epoch!==approval.freezeEpoch)
    throw Error('Bản xác minh ứng viên/backup không còn trùng phê duyệt.');
  await verifyCandidateServerReadback(candidate.items,manifest);
  if(await legacyHash({legacy:backup.legacy,freeze:backup.freeze})!==backup.baseline)
    throw Error('Backup legacy không nguyên vẹn theo SHA-256.');
  const live=await legacyState(database);
  if(await legacyHash({legacy:live.legacy,freeze:live.freeze})!==approval.legacyBaseline)
    throw Error('Legacy hoặc thời điểm đóng băng đã thay đổi; không kích hoạt V2.');
  const rootRef=ref(database,DATASET_V2_PATH);
  const releaseCache=await holdTransactionCache(rootRef);
  let reason='';
  let result:Awaited<ReturnType<typeof runTransaction>>|null=null;
  try{
    result=await runTransaction(rootRef,raw=>{
      if(!raw){reason='Không còn staging/backup tại V2.';return undefined;}
      const source=raw as Partial<V2Snapshot>&{
        legacyBackups?:Record<string,string>;
      };
      if(source.active||source.generations?.[manifest.generationId]||
        source.operations?.[operationId]||
        source.candidates?.[operationId]!==candidateJson||
        source.legacyBackups?.[operationId]!==backupJson){
        reason='Đã có generation, operation hoặc staging/backup thay đổi.';return undefined;
      }
      const hydrated=Object.fromEntries(Object.entries(candidate.items as Record<string,Item>)
        .map(([id,item])=>[id,{...item,operationId,
          updatedAt:serverTimestamp(),updatedBy:user!.uid}]));
      return {...source,
        generations:{...(source.generations??{}),
          [manifest.generationId]:{items:hydrated}},
        permissions:{...(source.permissions??{}),
          [manifest.generationId]:{columns:{}}},
        active:{generationId:manifest.generationId,operationId,revision:1,
          rowCount:manifest.rowCount,digest:manifest.digest},
        bootstrap:{operationId,freezeRevision:approval.freezeRevision,
          freezeEpoch:approval.freezeEpoch,legacyBaseline:approval.legacyBaseline},
        operations:{...(source.operations??{}),[operationId]:{
          status:'COMMITTED',from:'legacy',to:manifest.generationId,at:Date.now()}}
      };
    },{applyLocally:false}).catch(error=>{
      reason=error instanceof Error?error.message:String(error);return null;
    });
  }finally{releaseCache();}
  loseCallerAckAfterRealCommit(database,operationId,result?.committed===true);
  const state=await resolveDatasetOperation(database,operationId);
  if(state.status==='committed-active'&&state.generationId===manifest.generationId){
    if(result?.committed){
      const rows=(await get(ref(database,DATASET_V2_PATH+
        '/generations/'+manifest.generationId+'/items'))).val();
      const pure=Object.fromEntries(Object.entries(record(rows)).map(
        ([id,value])=>[id,validateFirebaseItem(value)]));
      await verifyCandidateServerReadback(pure,manifest);
    }
    return {status:result?.committed?'committed':'already-committed',operationId};
  }
  if(state.status==='unknown')return {status:'unknown',operationId};
  if(state.status==='committed-historical')
    throw Error('Khởi tạo đã COMMITTED nhưng không còn là thế hệ hiện tại.');
  throw Error(reason||'Khởi tạo V2 bị từ chối; giữ nguyên dữ liệu legacy.');
}

export async function readStagedDataset(database:Database,approval:ReplacementApproval):Promise<Item[]> {
  const raw=record(JSON.parse(String((await get(ref(database,DATASET_V2_PATH+'/candidates/'+approval.operationId))).val())));
  await verifyCandidateServerReadback(raw.items,approval.manifest);
  return Object.values(record(raw.items)) as Item[];
}
/** Contract API-CHANGE-02, ACK by L2 at PR #95 comment 6514617603. */
export interface DatasetOperationStatus {
  status:'committed-active'|'committed-historical'|'not-committed'|'unknown';
  operationId:string;
  generationId?:string;
}
/** RTDB get() can fall back to a previously cached snapshot when offline.
 * Checking the local transport both before AND after get() avoids treating
 * that cache as authoritative committed/not-committed server evidence.
 */
async function connectedForRead(database:Database):Promise<boolean>{
  try {
    return await new Promise<boolean>(resolve=>{
      let finished=false;
      let stop=()=>{};
      const finish=(connected:boolean)=>{
        if(finished)return;
        finished=true;clearTimeout(deadline);stop();resolve(connected);
      };
      // A newly initialized SDK first emits false while its websocket
      // handshakes. Wait for a real true instead of mistaking it for offline.
      const deadline=setTimeout(()=>finish(false),2500);
      stop=onValue(ref(database,'.info/connected'),snapshot=>{
        if(snapshot.val()===true)finish(true);
      },()=>finish(false));
      if(finished)stop();
    });
  }catch{return false;}
}
/** Read authoritative immutable operation log; no retries on network/ACK loss. */
export async function resolveDatasetOperation(database:Database,operationId:string):
  Promise<DatasetOperationStatus> {
  const unknown:DatasetOperationStatus={status:'unknown',operationId};
  if(!/^[A-Za-z0-9_-]{12,80}$/.test(operationId))return unknown;
  try {
    if(!await connectedForRead(database))return unknown;
    const snap=(await get(ref(database,DATASET_V2_PATH))).val() as V2Snapshot|null;
    if(!await connectedForRead(database)||!snap?.active||!snap.generations)return unknown;
    const op=snap.operations?.[operationId];
    if(op===undefined){
      // Pointer without a matching log is not evidence of an uncommitted op.
      return snap.active.operationId===operationId?unknown:
        {status:'not-committed',operationId};
    }
    if(op.status!=='COMMITTED'||op.to!=='gen_'+operationId||
      !snap.generations?.[op.to]?.items||typeof op.from!=='string'||!op.from||
      op.from===op.to||typeof op.at!=='number'||!Number.isFinite(op.at))
      return unknown;
    if(snap.active.operationId===operationId&&snap.active.generationId!==op.to)
      return unknown;
    return {status:snap.active.operationId===operationId?'committed-active':
      'committed-historical',operationId,generationId:op.to};
  }catch{return unknown;}
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
  loseCallerAckAfterRealCommit(database,approval.operationId,result?.committed===true);
  const status=await resolveDatasetOperation(database,approval.operationId);
  if(status.status==='committed-active'&&
    status.generationId===approval.manifest.generationId){
    if(result?.committed){
      // A fresh server readback, not merely an acknowledged transaction.
      const items=(await get(ref(database,DATASET_V2_PATH+'/generations/'+approval.manifest.generationId+'/items'))).val();
      const pure=Object.fromEntries(Object.entries(record(items))
        .map(([id,value])=>[id,validateFirebaseItem(value)]));
      await verifyCandidateServerReadback(pure,approval.manifest);
    }
    return {status:result?.committed?'committed':'already-committed',operationId:approval.operationId};
  }
  if(status.status==='unknown')return {status:'unknown',operationId:approval.operationId};
  if(status.status==='committed-historical')
    throw Error('Thao tác đã COMMITTED trong lịch sử nhưng không còn là thế hệ đang hoạt động; không tự nhập lại.');
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
  // A restored row belongs to a NEW generation. Reissue server-owned metadata
  // instead of copying a historical updatedAt which current Rules reject.
  // Preserve business fields and original audit history for provenance.
  const restoredItems=Object.fromEntries(Object.entries(backup.generation.items)
    .map(([id,row])=>[id,{...row,operationId:restoreOperationId,
      updatedAt:serverTimestamp(),updatedBy:user!.uid}]));
  let failed='';
  // Root transactions need an active listener: a standalone get() can leave
  // an empty local transaction cache and silently abort the first attempt.
  const releaseCache=await holdTransactionCache(baseRef);
  let result:Awaited<ReturnType<typeof runTransaction>>|null=null;
  try {
    result=await runTransaction(baseRef,current=>{
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
      generations:{...state.generations,[target]:{items:restoredItems}},
      permissions:{...state.permissions,[target]:JSON.parse(backup.permissionsJson)??{columns:{}}},
      active:{generationId:target,operationId:restoreOperationId,
        revision:expected.revision+1,rowCount:Object.keys(backup.generation.items).length,
        digest:backup.previous.digest},
      operations:{...state.operations,[restoreOperationId]:{
        status:'COMMITTED',from:expected.generationId,to:target,at:Date.now()}}};
    },{applyLocally:false}).catch(error=>{
      failed=error instanceof Error?error.message:String(error);
      return null;
    });
  } finally {releaseCache();}
  loseCallerAckAfterRealCommit(database,restoreOperationId,result?.committed===true);
  const status=await resolveDatasetOperation(database,restoreOperationId);
  if(status.status==='unknown')return {status:'unknown',operationId:restoreOperationId};
  if(status.status==='committed-active'&&status.generationId===target)
    return {status:result?.committed?'committed':'already-committed',operationId:restoreOperationId};
  if(status.status==='committed-historical')
    throw Error('Khôi phục đã COMMITTED trong lịch sử nhưng hiện không còn hoạt động; không khôi phục lặp.');
  throw Error(failed||'Khôi phục không được chấp nhận; giữ nguyên thế hệ đang hoạt động.');
}
