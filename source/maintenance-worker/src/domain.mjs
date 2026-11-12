/** Pure server-side maintenance checks. No API, privileges or Firebase writes. */
export const TEXT_FIELDS=[
  'content','department','type','partyLevel','progressParty','progressBuild','progressCouncil',
  'specialist','room','vpLeader','ubndLeader','specificProgress','note'
];
export const EDITABLE_FIELDS=[...TEXT_FIELDS,'isDropped','documentKind'];
export const ARCHIVE_PATHS=[
  'hdnd/items','hdnd/permissions','hdnd/profile','hdnd/control','hdnd/editLocks',
  'hdnd/freezeControl','hdnd/freezeReceipts','hdnd/editors','hdnd/mirrors',
  'hdnd/datasetV2','hdnd/maintenanceOps','hdndReviews'
];
export const MAX_ROWS=1000;
export const MAX_PAYLOAD_BYTES=3*1024*1024;
const OP_PATTERN=/^maint_[A-Za-z0-9_-]{16,72}$/;
const IDENTIFIER=/^[A-Za-z0-9_:-]{1,200}$/;
const HEX=/^[a-f0-9]{64}$/;
const PROTECTED_NAMES=new Set(['__proto__','prototype','constructor']);
export const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
export function requireCondition(ok,code){if(!ok){const error=new Error(code);error.code=code;throw error;}}
export function stableJson(input){
  function visit(value){
    if(Array.isArray(value))return value.map(visit);
    if(object(value))return Object.fromEntries(Object.entries(value)
      .filter(([_,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,'en'))
      .map(([k,v])=>[k,visit(v)]));
    if(typeof value==='number')requireCondition(Number.isFinite(value),'NONFINITE_NUMBER');
    return value===undefined?null:value;
  }
  return JSON.stringify(visit(input));
}
export async function sha256(input){
  const value=typeof input==='string'?input:stableJson(input);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
  return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
export function assertOperationId(op){requireCondition(typeof op==='string'&&OP_PATTERN.test(op),'INVALID_OPERATION_ID');return op;}
export function assertPointer(x,{allowEmpty=true}={}){
  requireCondition(object(x)&&typeof x.operationId==='string'&&/^[A-Za-z0-9_-]{12,80}$/.test(x.operationId)&&
    x.generationId==='gen_'+x.operationId&&Number.isSafeInteger(x.revision)&&x.revision>=1&&
    Number.isSafeInteger(x.rowCount)&&x.rowCount>=(allowEmpty?0:1)&&x.rowCount<=MAX_ROWS&&
    typeof x.digest==='string'&&HEX.test(x.digest),'INVALID_ACTIVE_POINTER');
  return x;
}
export function samePointer(a,b){return !!a&&!!b&&
  ['generationId','operationId','revision','rowCount','digest'].every(k=>a[k]===b[k]);}
export function sanitizeRows(value,{mode='excel'}={}){
  requireCondition(Array.isArray(value)&&value.length<=(MAX_ROWS)&&
    (mode==='clear'?value.length===0:mode==='restore'||value.length>=1),
    'INVALID_ROW_COUNT');
  const ids=new Set(),codes=new Set();
  return value.map((row,i)=>{
    requireCondition(object(row),'INVALID_ROW_OBJECT');
    requireCondition(typeof row.recordId==='string'&&IDENTIFIER.test(row.recordId)&&!PROTECTED_NAMES.has(row.recordId),'INVALID_RECORD_ID');
    requireCondition(typeof row.displayCode==='string'&&row.displayCode.length>0&&row.displayCode.length<=100&&
      row.displayCode.trim()===row.displayCode,'INVALID_DISPLAY_CODE');
    requireCondition(!ids.has(row.recordId)&&!codes.has(row.displayCode),'DUPLICATE_RECORD_ID_OR_CODE');
    ids.add(row.recordId);codes.add(row.displayCode);
    requireCondition(Number.isSafeInteger(row.stt)&&row.stt>0,'INVALID_STT');
    requireCondition(['NQ','BC','UNCLASSIFIED'].includes(row.documentKind),'INVALID_DOCUMENT_KIND');
    requireCondition(typeof row.isDropped==='boolean','INVALID_DROPPED_FLAG');
    if(mode==='excel')requireCondition(row.isDropped===false&&row.archivedAt==null&&row.revision===1,
      'INVALID_NEW_EXCEL_METADATA');
    if(mode==='restore')requireCondition(Number.isSafeInteger(row.revision)&&row.revision>=1,
      'INVALID_RESTORE_REVISION');
    requireCondition(row.archivedAt==null||(mode==='restore'&&typeof row.archivedAt==='string'&&row.archivedAt.length<150),
      'INVALID_ARCHIVE_STATUS');
    const clean={recordId:row.recordId,displayCode:row.displayCode,stt:row.stt,documentKind:row.documentKind};
    for(const field of TEXT_FIELDS){
      requireCondition(typeof row[field]==='string'&&row[field].length<=20000,'INVALID_'+field);
      clean[field]=row[field];
    }
    requireCondition(clean.content.trim().length>0,'EMPTY_CONTENT');
    clean.isDropped=row.isDropped;
    clean.archivedAt=row.archivedAt??null;
    // Each new immutable generation starts at revision 1. Old immutable
    // generation and signed archive retain exact historic revision/audit.
    clean.revision=1;
    return clean;
  });
}
export async function manifestForRows(rows,operationId){
  assertOperationId(operationId);
  const canonical=rows.map(row=>[
    row.recordId,row.displayCode,row.stt,row.revision,row.archivedAt,
    ...EDITABLE_FIELDS.map(field=>row[field]),
  ]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'en'));
  return {schemaVersion:1,generationId:'gen_'+operationId,operationId,
    rowCount:rows.length,digest:await sha256(JSON.stringify(canonical))};
}
export function rowsToMap(rows){return Object.fromEntries(rows.map(row=>[row.recordId,row]));}
function activeRowsFromV2(v2){
  const active=assertPointer(v2?.active);
  const generation=v2?.generations?.[active.generationId];
  requireCondition(object(generation),'ACTIVE_GENERATION_MISSING');
  // RTDB represents {} as null: a zero-row generation may not have /items.
  const items=generation?.items??{};
  requireCondition(object(items),'INVALID_ACTIVE_GENERATION');
  requireCondition(Object.keys(items).length===active.rowCount,'ACTIVE_ROW_COUNT_MISMATCH');
  if(active.rowCount===0){
    // RTDB omits empty objects: only an explicit marker and the canonical
    // SHA256 of [] prove this is an intentional empty generation.
    requireCondition(generation.emptyGeneration===true&&
      active.digest==='4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
      'INVALID_SIGNED_EMPTY_GENERATION');
  }
  return {active,items};
}
export function assertFrozenTree(hdnd,{now=Date.now()}={}){
  requireCondition(object(hdnd)&&object(hdnd.datasetV2)&&object(hdnd.freezeControl),'INVALID_ROOT');
  const {active,items}=activeRowsFromV2(hdnd.datasetV2);
  const freeze=hdnd.freezeControl;
  requireCondition(freeze.mode==='FROZEN'&&Number.isSafeInteger(freeze.revision)&&freeze.revision>=1&&
    Number.isSafeInteger(freeze.epoch)&&freeze.epoch>=1&&Number.isFinite(freeze.closedAt)&&freeze.closedAt>0&&
    samePointer(freeze.datasetV2,active),'FREEZE_OR_POINTER_STALE');
  // ALL active edit leases must be expired; malformed lease objects fail shut.
  const leases=hdnd.datasetV2.leases?.[active.generationId];
  const legacy=hdnd.editLocks;
  for(const scopes of [leases,legacy]){
    if(scopes==null)continue;
    requireCondition(object(scopes),'INVALID_LEASES');
    for(const byField of Object.values(scopes)){
      requireCondition(object(byField),'INVALID_LEASES');
      for(const lease of Object.values(byField)){
        requireCondition(object(lease)&&Number.isFinite(lease.expiresAt),'INVALID_LEASE');
        requireCondition(lease.expiresAt<=now,'ACTIVE_EDIT_LEASE');
      }
    }
  }
  return {active,items,freeze};
}
export function restoreRowsFromArchive(envelope,{projectId,databaseURL}){
  requireCondition(object(envelope)&&object(envelope.payload)&&
    envelope.payload.format==='hophdnd-admin-archive'&&envelope.payload.schemaVersion===1,
    'INVALID_BACKUP_FORMAT');
  const p=envelope.payload;
  requireCondition(p.projectId===projectId&&p.databaseURL===databaseURL,'BACKUP_ORIGIN_MISMATCH');
  requireCondition(Array.isArray(p.paths)&&p.paths.length===ARCHIVE_PATHS.length&&
    p.paths.every((path,i)=>path===ARCHIVE_PATHS[i]),'BACKUP_PATHS_MISMATCH');
  requireCondition(object(p.nodes)&&Object.keys(p.nodes).length===ARCHIVE_PATHS.length&&
    ARCHIVE_PATHS.every(path=>Object.hasOwn(p.nodes,path)),'BACKUP_NODES_MISMATCH');
  const v2=p.nodes['hdnd/datasetV2'];
  requireCondition(object(v2)&&object(v2.active),'BACKUP_V2_MISSING');
  const {items}=activeRowsFromV2(v2);
  return sanitizeRows(Object.values(items),{mode:'restore'});
}
export function confirmationText(action,operationId,oldCount,newCount){
  const label={clear:'XOA',replace:'THAY',restore:'KHOI PHUC'}[action];
  requireCondition(!!label,'INVALID_ACTION');
  return `${label} ${operationId} ${oldCount} ${newCount}`;
}
