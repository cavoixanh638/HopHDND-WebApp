/**
 * Server-INTERNAL proof-of-contract for a replacement parent transaction.
 * Do NOT expose `database` or the privileged claim to the browser. An actual
 * callable implementation must verify Firebase ID token and admin role,
 * then create its own per-request Rules-scoped database context. The caller
 * supplies operationId/approval fingerprint, NEVER an arbitrary next tree.
 *
 * This PoC intentionally covers ONLY the V2 parent replacement commit,
 * not leaf cell gateway, bootstrap, initial activation or restore services.
 */
import {get,onValue,ref,runTransaction,serverTimestamp} from 'firebase/database';
import {assertSafeParentTransition,stable} from './parent-contract.mjs';
import {createDatasetManifest,verifyCandidateServerReadback,checkPointerSwap}
  from '../../src/data/dataset-replacement-integrity.ts';
const ROOT='hdnd/datasetV2';
const check=(ok,message)=>{if(!ok)throw Error('TRUSTED_PARENT_DENIED: '+message);};
async function watchParent(db){
  return new Promise((resolve,reject)=>{
    let done=false,stop=()=>{};
    stop=onValue(ref(db,ROOT),snapshot=>{
      if(done||!snapshot.exists())return;
      done=true;resolve(stop);
    },reject);
  });
}
export async function commitTrustedReplacement(db,approval,verifiedActorUid){
  // Only a trusted backend handler may call this with a scoped Rules credential.
  // A raw client cannot set parentCasService in a verified Firebase ID token.
  check(typeof verifiedActorUid==='string'&&!!verifiedActorUid,'verified actor required');
  const {operationId,manifest}=approval;
  check(/^[-_A-Za-z0-9]{12,80}$/.test(operationId),'bad operationId');
  const stagedJson=(await get(ref(db,ROOT+'/candidates/'+operationId))).val();
  const backupJson=(await get(ref(db,ROOT+'/backups/'+operationId))).val();
  check(typeof stagedJson==='string'&&typeof backupJson==='string','missing sealed stage/backup');
  const staged=JSON.parse(stagedJson);
  check(stable(staged.manifest)===stable(manifest)&&manifest.operationId===operationId,
    'staged manifest changed');
  await verifyCandidateServerReadback(staged.items,manifest); // computes SHA256
  const backed=JSON.parse(backupJson);
  check(stable(backed.previous)===stable(approval.expected)&&
    backed.baseline===approval.baseline,'backup not approved');
  const release=await watchParent(db);
  let result;
  try{
    result=await runTransaction(ref(db,ROOT),old=>{
      if(!old)return undefined;
      try{
        if(checkPointerSwap(old.active,approval.expected,manifest)!=='ready')return undefined;
        check(old.candidates?.[operationId]===stagedJson&&
          old.backups?.[operationId]===backupJson,'stage/backup changed before commit');
        const scoped={active:old.active,items:old.generations?.[old.active.generationId]?.items,
          permissions:old.permissions?.[old.active.generationId]??null,
          leases:old.leases?.[old.active.generationId]??null};
        check(stable(scoped)===approval.baseline,'current active generation changed');
        const hydrated=Object.fromEntries(Object.entries(staged.items).map(([id,item])=>
          [id,{...item,operationId,updatedAt:serverTimestamp(),updatedBy:verifiedActorUid}]));
        const next={...old,
          generations:{...old.generations,[manifest.generationId]:{items:hydrated}},
          permissions:{...old.permissions,[manifest.generationId]:{columns:{}}},
          active:{generationId:manifest.generationId,operationId,
            revision:old.active.revision+1,rowCount:manifest.rowCount,digest:manifest.digest},
          operations:{...old.operations,[operationId]:{
            status:'COMMITTED',from:old.active.generationId,to:manifest.generationId,at:Date.now()}}};
        assertSafeParentTransition(old,next,{mode:'replace',operationId,actor:verifiedActorUid});
        return next;
      }catch{return undefined;}
    },{applyLocally:false});
  }finally{release();}
  if(!result?.committed)throw Error('TRUSTED_PARENT_UNKNOWN_OR_CONFLICT: do not retry with new operationId');
  return {status:'committed',operationId};
}
