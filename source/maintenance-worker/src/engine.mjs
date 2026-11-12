import {
  ARCHIVE_PATHS,MAX_PAYLOAD_BYTES,assertFrozenTree,assertOperationId,assertPointer,
  confirmationText,manifestForRows,object,requireCondition,restoreRowsFromArchive,
  rowsToMap,samePointer,sanitizeRows,sha256,stableJson
} from './domain.mjs';
import {hmacSignature,verifyHmac} from './security.mjs';
import {persistVerifiedArchive,readVerifiedArchive} from './backup-store.mjs';

const MAX_ARCHIVE_BYTES=MAX_PAYLOAD_BYTES;
const MAX_STAGE_AGE_MS=10*60*1000;
const prefix='hophdnd-server-archive-v1\n';
const clone=value=>JSON.parse(JSON.stringify(value));
const expectBody=x=>{requireCondition(object(x),'INVALID_BODY');return x};
const snapshotData=(hdnd,now=Date.now())=>{
  const state=assertFrozenTree(hdnd,{now});
  const gen=state.active.generationId;
  const permissions=hdnd.datasetV2.permissions?.[gen]??null;
  const leases=hdnd.datasetV2.leases?.[gen]??null;
  // Freeze epoch/revision and timestamps are part of the immutable prepare
  // fence: a thaw/refreeze against the SAME active pointer invalidates the draft.
  return {state,baseline:stableJson({
    active:state.active,items:state.items,permissions,leases,freeze:state.freeze
  })};
};
// The independent archive must contain the *exact* active rows, permissions
// and leases captured for CAS, not just a pointer with the same generation ID.
function archiveActiveBaseline(archive){
  const v2=archive?.payload?.nodes?.['hdnd/datasetV2'];
  requireCondition(object(v2)&&object(v2.active),'OFFSITE_BACKUP_ACTIVE_MISSING');
  const generationId=v2.active.generationId;
  const generation=v2.generations?.[generationId];
  requireCondition(object(generation),'OFFSITE_BACKUP_GENERATION_MISSING');
  const items=generation.items??{};
  requireCondition(object(items)&&Object.keys(items).length===v2.active.rowCount,
    'OFFSITE_BACKUP_ROW_COUNT_MISMATCH');
  return stableJson({
    active:v2.active,items,
    permissions:v2.permissions?.[generationId]??null,
    leases:v2.leases?.[generationId]??null,
    freeze:archive.payload.nodes['hdnd/freezeControl']
  });
}
function safeJsonSize(payload){
  requireCondition(new TextEncoder().encode(JSON.stringify(payload)).length<=MAX_PAYLOAD_BYTES,
    'MAINTENANCE_LIMIT_3MB');
}
function archiveNodes(hdnd,reviews){
  const nodes={};
  for(const path of ARCHIVE_PATHS){
    if(path==='hdndReviews'){nodes[path]=reviews??null;continue;}
    let current=hdnd;
    for(const part of path.split('/').slice(1))current=current?.[part];
    nodes[path]=current??null;
  }
  return nodes;
}
export async function exportArchive(db,env,{now=Date.now()}={}){
  const first=await db.getWithEtag('hdnd');
  requireCondition(object(first.data),'MISSING_HDND_DATA');
  assertFrozenTree(first.data,{now});
  const reviews=await db.get('hdndReviews');
  const last=await db.getWithEtag('hdnd');
  const reviewsAfter=await db.get('hdndReviews');
  requireCondition(first.etag===last.etag&&stableJson(reviews)===stableJson(reviewsAfter),
    'DATA_CHANGED_DURING_EXPORT');
  assertFrozenTree(last.data,{now});
  const payload={format:'hophdnd-admin-archive',schemaVersion:1,createdAt:new Date(now).toISOString(),
    projectId:env.FIREBASE_PROJECT_ID,databaseURL:env.FIREBASE_DATABASE_URL,
    paths:[...ARCHIVE_PATHS],nodes:archiveNodes(last.data,reviewsAfter)};
  safeJsonSize(payload);
  const digest=await sha256(stableJson(payload));
  const serverSeal={algorithm:'HMAC-SHA256',keyId:'v1',
    signature:await hmacSignature(prefix+stableJson(payload),env.BACKUP_HMAC_SECRET)};
  const result={payload,sha256:digest,serverSeal};
  requireCondition(new TextEncoder().encode(JSON.stringify(result)).length<=MAX_ARCHIVE_BYTES,
    'ARCHIVE_TOO_LARGE_FOR_FREE_WORKER');
  return result;
}
export async function verifySignedArchive(archive,env){
  expectBody(archive);
  requireCondition(archive.serverSeal?.algorithm==='HMAC-SHA256'&&
    archive.serverSeal.keyId==='v1'&&typeof archive.sha256==='string',
    'BACKUP_SERVER_SEAL_REQUIRED');
  const payload=archive.payload;
  requireCondition(object(payload),'INVALID_BACKUP_PAYLOAD');
  requireCondition(await sha256(stableJson(payload))===archive.sha256,'BACKUP_SHA256_MISMATCH');
  requireCondition(await verifyHmac(prefix+stableJson(payload),archive.serverSeal.signature,
    env.BACKUP_HMAC_SECRET),'BACKUP_AUTHENTICITY_FAILED');
  return payload;
}
/** Verify committed immutable generation independently of a status receipt.
 * All 15 business-source fields must match the operation's SHA256 manifest.
 * Historical operation lookups also verify the preserved generation.
 */
async function verifyOperationGeneration(hdnd,operationId){
  const record=hdnd?.maintenanceOps?.[operationId];
  const manifest=record?.manifest;
  const receipt=hdnd?.datasetV2?.operations?.[operationId];
  requireCondition(object(record)&&object(manifest)&&object(receipt)&&
    manifest.operationId===operationId&&manifest.generationId==='gen_'+operationId&&
    receipt.to===manifest.generationId&&receipt.actor===record.uid&&
    receipt.at===record.committedAt,'OPERATION_READBACK_RECEIPT_MISMATCH');
  const generation=hdnd?.datasetV2?.generations?.[manifest.generationId];
  requireCondition(object(generation),'OPERATION_READBACK_GENERATION_MISSING');
  const saved=generation.items??{};
  requireCondition(object(saved),'OPERATION_READBACK_ROWS_INVALID');
  const readRows=Object.entries(saved).map(([key,value])=>{
    requireCondition(object(value)&&value.recordId===key&&
      value.operationId===operationId&&value.updatedBy===record.uid&&
      value.updatedAt===record.committedAt&&value.revision===1,
      'OPERATION_READBACK_METADATA_MISMATCH');
    return value;
  });
  requireCondition(readRows.length===manifest.rowCount&&
    (readRows.length!==0||generation.emptyGeneration===true),
    'OPERATION_READBACK_ROW_COUNT_MISMATCH');
  const normalized=sanitizeRows(readRows,{mode:readRows.length===0?'clear':'restore'});
  const readManifest=await manifestForRows(normalized,operationId);
  requireCondition(stableJson(readManifest)===stableJson(manifest),
    'OPERATION_READBACK_DIGEST_MISMATCH');
  return true;
}
function operationStatus(hdnd,operationId){
  const record=hdnd?.maintenanceOps?.[operationId];
  if(!object(record))return {status:'not-found',operationId};
  const committed=hdnd.datasetV2?.operations?.[operationId];
  if(record.status==='COMMITTED'&&committed?.status==='COMMITTED'){
    const active=hdnd.datasetV2?.active?.operationId===operationId;
    return {status:active?'committed-active':'committed-historical',operationId,
      rowCount:record.newCount};
  }
  if(record.status==='PREPARED'&&!committed)return {status:'prepared',operationId,
    oldCount:record.oldCount,newCount:record.newCount,action:record.action};
  return {status:'unknown',operationId};
}
export async function inspectOperation(db,operationId){
  assertOperationId(operationId);
  const root=await db.get('hdnd');
  const status=operationStatus(root,operationId);
  if(status.status==='committed-active'||status.status==='committed-historical'){
    try{
      await verifyOperationGeneration(root,operationId);
      if(status.status==='committed-active'){
        const manifest=root.maintenanceOps[operationId].manifest;
        const active=root.datasetV2.active;
        requireCondition(active.generationId===manifest.generationId&&
          active.digest===manifest.digest&&active.rowCount===manifest.rowCount,
          'OPERATION_READBACK_ACTIVE_POINTER_MISMATCH');
      }
    }catch{return {status:'unknown',operationId};}
  }
  return status;
}
export async function prepareMaintenance(db,env,identity,input,{now=Date.now()}={}){
  const body=expectBody(input);
  const keys=Object.keys(body).sort().join(',');
  requireCondition(['action,expected,operationId,rows,sourceName','action,expected,operationId',
    'action,archive,expected,operationId'].includes(keys),'UNEXPECTED_PREPARE_FIELDS');
  const {action,operationId}=body;
  assertOperationId(operationId);
  requireCondition(['clear','replace','restore'].includes(action),'INVALID_ACTION');
  if(action==='clear')requireCondition(keys==='action,expected,operationId','CLEAR_HAS_EXTRA_FIELDS');
  if(action==='replace')requireCondition(keys==='action,expected,operationId,rows,sourceName'&&
    typeof body.sourceName==='string'&&/^[^/\\]{1,180}\.xlsx$/i.test(body.sourceName),
    'INVALID_EXCEL_SOURCE');
  if(action==='restore')requireCondition(keys==='action,archive,expected,operationId',
    'INVALID_RESTORE_SOURCE');
  const observed=await db.getWithEtag('hdnd');
  requireCondition(object(observed.data),'MISSING_HDND_DATA');
  const root=clone(observed.data);
  const {state,baseline}=snapshotData(root,now);
  requireCondition(samePointer(assertPointer(body.expected),state.active),'STALE_EXPECTED_POINTER');
  requireCondition(!root.maintenanceOps?.[operationId]&&
    !root.datasetV2.operations?.[operationId]&&
    !root.datasetV2.generations?.['gen_'+operationId]&&
    !root.datasetV2.candidates?.[operationId]&&
    !root.datasetV2.backups?.[operationId],'DUPLICATE_OPERATION_ID');
  let rows;
  if(action==='clear')rows=[];
  if(action==='replace')rows=sanitizeRows(body.rows,{mode:'excel'});
  if(action==='restore'){
    safeJsonSize(body.archive);
    await verifySignedArchive(body.archive,env);
    rows=restoreRowsFromArchive(body.archive,{projectId:env.FIREBASE_PROJECT_ID,
      databaseURL:env.FIREBASE_DATABASE_URL});
  }
  const manifest=await manifestForRows(rows,operationId);
  // Before ANY database staging write, take a server-signed, independently
  // retained backup and verify the stored bytes. No external store = NO writes.
  // A root-level disaster recovery copy of other Firebase branches/Rules/Auth
  // is a separate operational requirement; this archive is app-scoped only.
  const offsiteArchive=await exportArchive(db,env,{now});
  requireCondition(archiveActiveBaseline(offsiteArchive)===baseline,
    'OFFSITE_BACKUP_ACTIVE_BASELINE_MISMATCH');
  const offsiteRef=await persistVerifiedArchive(env.MAINTENANCE_ARCHIVE_BUCKET,
    operationId,offsiteArchive);
  const oldGen=state.active.generationId;
  const backup={previous:state.active,generation:{items:state.items},
    permissionsJson:stableJson(root.datasetV2.permissions?.[oldGen]??null),
    leasesJson:stableJson(root.datasetV2.leases?.[oldGen]??null),baseline};
  const backupJson=stableJson(backup);
  const candidateJson=stableJson({items:rowsToMap(rows),manifest});
  requireCondition(candidateJson.length<MAX_PAYLOAD_BYTES/2&&backupJson.length<MAX_PAYLOAD_BYTES/2,
    'PREPARED_PAYLOAD_TOO_LARGE');
  root.datasetV2.candidates??={};root.datasetV2.backups??={};
  root.datasetV2.candidates[operationId]=candidateJson;
  root.datasetV2.backups[operationId]=backupJson;
  root.maintenanceOps??={};
  root.maintenanceOps[operationId]={status:'PREPARED',action,uid:identity.uid,at:now,
    expiresAt:now+MAX_STAGE_AGE_MS,expected:state.active,oldCount:state.active.rowCount,
    freezeEpoch:state.freeze.epoch,freezeRevision:state.freeze.revision,
    newCount:rows.length,manifest,baselineHash:await sha256(baseline),
    backupHash:await sha256(backupJson),candidateHash:await sha256(candidateJson),
    offsiteBackup:{...offsiteRef,operationId},
    sourceName:action==='replace'?body.sourceName:action};
  safeJsonSize(root);
  const response=await db.putIfMatch('hdnd',root,observed.etag);
  requireCondition(!response.conflict,'CONCURRENT_PREPARE_CONFLICT');
  // A read-after-write is required to avoid treating a lost ACK as success.
  const confirmed=await db.get('hdnd');
  requireCondition(confirmed?.maintenanceOps?.[operationId]?.status==='PREPARED'&&
    confirmed.datasetV2?.candidates?.[operationId]===candidateJson&&
    confirmed.datasetV2?.backups?.[operationId]===backupJson,'PREPARE_UNKNOWN_CHECK_STATUS');
  return {status:'prepared',operationId,action,oldCount:state.active.rowCount,
    newCount:rows.length,expected:state.active,
    confirmation:confirmationText(action,operationId,state.active.rowCount,rows.length),
    expiresAt:now+MAX_STAGE_AGE_MS};
}
export async function commitMaintenance(db,env,identity,input,{now=Date.now()}={}){
  const body=expectBody(input);
  requireCondition(Object.keys(body).sort().join(',')==='confirmation,operationId','UNEXPECTED_COMMIT_FIELDS');
  const op=assertOperationId(body.operationId);
  const before=await db.getWithEtag('hdnd');
  const root=clone(before.data);
  const status=operationStatus(root,op);
  if(status.status==='committed-active'||status.status==='committed-historical'){
    // A duplicate commit request must never imply success from a receipt
    // if its immutable data or count is corrupted.
    const checked=await inspectOperation(db,op);
    requireCondition(checked.status===status.status,'COMMIT_UNKNOWN_CHECK_STATUS');
    return {status:'already-committed',operationId:op,newCount:status.rowCount};
  }
  requireCondition(status.status==='prepared','MAINTENANCE_OPERATION_NOT_PREPARED');
  const prep=root.maintenanceOps[op];
  requireCondition(prep.uid===identity.uid&&prep.expiresAt>=now,'PREPARATION_EXPIRED_OR_DIFFERENT_ADMIN');
  requireCondition(typeof body.confirmation==='string'&&body.confirmation===
    confirmationText(prep.action,op,prep.oldCount,prep.newCount),'CONFIRMATION_MISMATCH');
  const {state,baseline}=snapshotData(root,now);
  requireCondition(state.freeze.mode==='FROZEN'&&
    state.freeze.epoch===prep.freezeEpoch&&
    state.freeze.revision===prep.freezeRevision,
    'FREEZE_EPOCH_CHANGED_SINCE_PREPARE');
  requireCondition(samePointer(state.active,prep.expected)&&state.active.rowCount===prep.oldCount,
    'ACTIVE_GENERATION_CHANGED');
  requireCondition(await sha256(baseline)===prep.baselineHash,
    'ACTIVE_DATA_CHANGED_SINCE_PREPARE');
  // A prepared same-RTDB backup alone does not protect against project loss.
  // Refuse to commit when the independently stored signed backup is absent,
  // corrupted, unverifiable, or does not belong to the current generation.
  const offsite=await readVerifiedArchive(env.MAINTENANCE_ARCHIVE_BUCKET,prep.offsiteBackup);
  await verifySignedArchive(offsite,env);
  requireCondition(offsite.payload.projectId===env.FIREBASE_PROJECT_ID&&
    offsite.payload.databaseURL===env.FIREBASE_DATABASE_URL&&
    samePointer(offsite.payload.nodes?.['hdnd/datasetV2']?.active,state.active),
    'OFFSITE_BACKUP_ORIGIN_OR_GENERATION_MISMATCH');
  requireCondition(archiveActiveBaseline(offsite)===baseline,
    'OFFSITE_BACKUP_ACTIVE_BASELINE_MISMATCH');
  const backupJson=root.datasetV2.backups?.[op];
  const candidateJson=root.datasetV2.candidates?.[op];
  requireCondition(typeof backupJson==='string'&&typeof candidateJson==='string'&&
    await sha256(backupJson)===prep.backupHash&&
    await sha256(candidateJson)===prep.candidateHash,'PREPARED_BACKUP_OR_CANDIDATE_CORRUPT');
  let backup,candidate;
  try{backup=JSON.parse(backupJson);candidate=JSON.parse(candidateJson)}
  catch{throw Error('INVALID_PREPARED_JSON')}
  requireCondition(samePointer(backup.previous,state.active)&&backup.baseline===baseline,
    'BACKUP_NO_LONGER_MATCHES_ACTIVE');
  const rows=sanitizeRows(Object.values(candidate.items??{}),{
    mode:prep.action==='clear'?'clear':prep.action==='restore'?'restore':'excel'});
  const recalculated=await manifestForRows(rows,op);
  requireCondition(stableJson(recalculated)===stableJson(candidate.manifest)&&
    stableJson(prep.manifest)===stableJson(recalculated)&&rows.length===prep.newCount,
    'CANDIDATE_MANIFEST_MISMATCH');
  const v2=root.datasetV2;
  requireCondition(!v2.generations?.['gen_'+op]&&!v2.operations?.[op],'OPERATION_ALREADY_IN_V2');
  const old=state.active.generationId,newGeneration='gen_'+op;
  const nextPointer={generationId:newGeneration,operationId:op,
    revision:state.active.revision+1,rowCount:rows.length,digest:recalculated.digest};
  v2.generations??={};v2.permissions??={};v2.operations??={};
  // Store empty marker because RTDB does not retain empty JSON objects.
  v2.generations[newGeneration]={items:Object.fromEntries(rows.map(row=>[
    row.recordId,{...row,operationId:op,updatedBy:identity.uid,updatedAt:now}])) ,
    ...(rows.length===0?{emptyGeneration:true}:{})};
  // Reset per-row/per-field grants on a replacement; never carry old edit leases.
  v2.permissions[newGeneration]={columns:{}};
  v2.active=nextPointer;
  v2.operations[op]={status:'COMMITTED',from:old,to:newGeneration,at:now,
    action:prep.action,actor:identity.uid,rowCount:rows.length};
  root.maintenanceOps[op]={...prep,status:'COMMITTED',committedAt:now};
  // Include freeze pointer in SAME /hdnd CAS; the old frozen pointer must not
  // become stale while a new generation is active. Keep editing FROZEN.
  root.freezeControl={...state.freeze,revision:state.freeze.revision+1,
    epoch:state.freeze.epoch+1,actor:identity.uid,changedAt:now,
    closedAt:now,datasetV2:nextPointer,closeKind:'forced'};
  safeJsonSize(root);
  const result=await db.putIfMatch('hdnd',root,before.etag);
  if(result.conflict)throw Error('COMMIT_ETAG_CONFLICT_CHECK_STATUS');
  const observed=await db.get('hdnd');
  const outcome=operationStatus(observed,op);
  // A post-CAS verification error is an UNKNOWN outcome, never permission
  // to start another destructive operation. Recheck the original operation.
  try{
    requireCondition(outcome.status==='committed-active'&&
      samePointer(observed?.datasetV2?.active,nextPointer),
      'READBACK_POINTER_MISMATCH');
    await verifyOperationGeneration(observed,op);
  }catch{throw Error('COMMIT_UNKNOWN_CHECK_STATUS');}
  return {status:'committed',operationId:op,newCount:rows.length,
    from:old,to:newGeneration};
}
