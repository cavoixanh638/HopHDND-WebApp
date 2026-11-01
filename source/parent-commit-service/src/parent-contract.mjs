/**
 * Production candidate backend-INTERNAL parent transaction guard (PR144 contract) for one V2 ancestor transaction.
 * It accepts a complete before/after root that was constructed by trusted
 * server code, not a mutation request supplied by the browser.
 *
 * RTDB Rules cannot SHA256/JSON.parse the existing candidates/<operationId>
 * string; this check is therefore deliberately executed INSIDE the trusted
 * parent transaction callback. No pre-read+unrestricted-write is acceptable.
 */
const own=(x,k)=>Object.prototype.hasOwnProperty.call(x??{},k);
const isObject=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
export const stable=x=>JSON.stringify(sort(x));
function sort(x){
  if(Array.isArray(x))return x.map(sort);
  if(isObject(x))return Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>[k,sort(v)]));
  return x===undefined?null:x;
}
function equal(a,b){return stable(a)===stable(b);}
function check(ok,reason){if(!ok)throw Error('PARENT_CONTRACT_DENIED: '+reason);}
function keys(x){return Object.keys(x??{}).sort();}
function sameOldChildren(oldMap,newMap,kind){
  for(const key of keys(oldMap))check(own(newMap,key)&&equal(oldMap[key],newMap[key]),`existing ${kind}/${key} modified or deleted`);
}
function exactNewKeys(oldMap,newMap,expectedKey,kind,{allowMissing=false}={}){
  const added=keys(newMap).filter(k=>!own(oldMap,k));
  check((allowMissing&&added.length===0)||(added.length===1&&added[0]===expectedKey),
    `${kind} added keys must contain only ${expectedKey}`);
}
function pointerFields(ptr){return {
  generationId:ptr?.generationId,operationId:ptr?.operationId,
  revision:ptr?.revision,rowCount:ptr?.rowCount,digest:ptr?.digest};}
function cleanedRows(newItems,expectedItems,opId,actor,{restoring=false}={}){
  check(isObject(newItems)&&isObject(expectedItems), 'new items must be keyed objects');
  check(equal(keys(newItems),keys(expectedItems)),'new record IDs do not match approved source');
  for(const [id,source] of Object.entries(expectedItems)){
    const actual=newItems[id];
    check(isObject(actual)&&isObject(source),'invalid row '+id);
    check(actual.operationId===opId&&actual.updatedBy===actor,'row provenance '+id);
    // serverTimestamp() resolves only on commit; accept its explicit sentinel
    // in transaction and the server timestamp number in post-commit readback.
    check((isObject(actual.updatedAt)&&actual.updatedAt['.sv']==='timestamp')||
      Number.isFinite(actual.updatedAt),'bad updatedAt '+id);
    const {operationId:_a,updatedAt:_b,updatedBy:_c,...payload}=actual;
    const {operationId:_d,updatedAt:_e,updatedBy:_f,...oldBusiness}=source;
    check(equal(payload,restoring?oldBusiness:source),'staged content differs for '+id);
  }
}
/**
 * mode='activate' requires pre-staged legacy backup and a FROZEN guard enforced
 * by the *existing* parent Rules at commit. mode='replace' binds to candidate.
 * mode='restore' binds to immutable backup's old generation.
 */
export function assertSafeParentTransition(before,after,{mode,operationId,actor,backupOperationId}={}){
  check(isObject(before)&&isObject(after),'bad parent roots');
  check(['activate','replace','restore'].includes(mode),'unknown operation type');
  check(typeof operationId==='string'&&/^[-_A-Za-z0-9]{12,80}$/.test(operationId),'bad operationId');
  check(typeof actor==='string'&&!!actor,'missing verified actor');
  const oldPtr=before.active??null, nextPtr=after.active;
  const newGen='gen_'+operationId;
  check(nextPtr?.generationId===newGen&&nextPtr?.operationId===operationId,
    'incorrect new active pointer');
  check(nextPtr?.revision===(oldPtr?.revision??0)+1,'pointer revision mismatch');
  check(mode==='activate'?!oldPtr:!!oldPtr,'unexpected pointer prestate');
  if(oldPtr)check(nextPtr.generationId!==oldPtr.generationId,'same generation');
  check(!own(before.generations,newGen)&&!own(before.operations,operationId),
    'operation/generation already exists');
  for(const k of keys(before))check(own(after,k),'root key removed: '+k);
  for(const k of keys(after))check(own(before,k)||
    (mode==='activate'&&['active','generations','permissions','operations','bootstrap'].includes(k)),
    'unexpected datasetV2 root insertion: '+k);
  for(const k of keys(before))if(!['active','generations','permissions','operations','bootstrap'].includes(k))
    check(equal(before[k],after[k]),`root ${k} modified including leases/backups/candidates`);
  sameOldChildren(before.generations,after.generations,'generations');
  exactNewKeys(before.generations,after.generations,newGen,'generations');
  sameOldChildren(before.permissions,after.permissions,'permissions');
  // Empty RTDB objects (e.g. {columns:{}}) are omitted on server readback.
  // A missing new permission entry means default deny, not an inherited grant.
  exactNewKeys(before.permissions,after.permissions,newGen,'permissions',{allowMissing:true});
  sameOldChildren(before.operations,after.operations,'operations');
  exactNewKeys(before.operations,after.operations,operationId,'operations');
  const op=after.operations[operationId];
  check(op?.status==='COMMITTED'&&op?.from===(oldPtr?.generationId??'legacy')&&op?.to===newGen&&
    Number.isFinite(op.at),'bad operation journal');
  const newRows=after.generations?.[newGen]?.items;
  check(isObject(newRows)&&keys(newRows).length===nextPtr.rowCount,'pointer row count mismatch');
  let approvedRows,approvedDigest,approvedCount;
  if(mode==='restore'){
    const encoded=before.backups?.[backupOperationId];
    check(typeof encoded==='string','missing immutable restore backup');
    const backup=JSON.parse(encoded);
    check(backup.previous&&isObject(backup.generation?.items),'invalid restore backup');
    approvedRows=backup.generation.items;approvedDigest=backup.previous.digest;
    approvedCount=keys(approvedRows).length;
    check(equal(after.permissions?.[newGen]??{columns:{}},JSON.parse(backup.permissionsJson)??{columns:{}}),
      'restored permissions differ from backup');
    check(equal(before.bootstrap,after.bootstrap),'bootstrap changed during restore');
  }else{
    const encoded=before.candidates?.[operationId];
    check(typeof encoded==='string','missing approved staged candidate');
    const candidate=JSON.parse(encoded);
    check(candidate.manifest?.generationId===newGen&&candidate.manifest?.operationId===operationId,
      'staged manifest operation mismatch');
    approvedRows=candidate.items;approvedDigest=candidate.manifest.digest;
    approvedCount=candidate.manifest.rowCount;
    check(equal(after.permissions?.[newGen]??{columns:{}},{columns:{}}),'new generation rights not empty');
    if(mode==='activate'){
      check(!before.bootstrap&&isObject(after.bootstrap),'missing first activation bootstrap');
      const encodedBackup=before.legacyBackups?.[operationId];
      check(typeof encodedBackup==='string','missing immutable legacy backup');
      const backup=JSON.parse(encodedBackup);
      check(after.bootstrap.operationId===operationId&&
        after.bootstrap.legacyBaseline===backup.baseline&&
        after.bootstrap.freezeRevision===backup.freeze.revision&&
        after.bootstrap.freezeEpoch===backup.freeze.epoch,
      'bootstrap provenance mismatch');
    }else check(equal(before.bootstrap,after.bootstrap),'bootstrap modified on replace');
  }
  check(nextPtr.digest===approvedDigest&&nextPtr.rowCount===approvedCount,
    'pointer digest/count differ from approved staging/backup');
  cleanedRows(newRows,approvedRows,operationId,actor,{restoring:mode==='restore'});
  return true;
}
/** For unit tests: a rejected proposal must be refused before any transaction. */
export function validateTrustedProposal(before,proposal,options){
  assertSafeParentTransition(before,proposal,options);
  return proposal;
}
