import {ServerValue} from 'firebase-admin/database';
import {stable,assertSafeParentTransition} from './parent-contract.mjs';
import {operationValid,sha256,decodeCandidate,verifyBackup,scoped,sameEpoch,freezeEvidence,legacySnapshot} from './manifest.mjs';
const ROOT='hdnd/datasetV2';
const check=(ok,msg)=>{if(!ok)throw Error('PARENT_COMMIT_DENIED: '+msg);};
const parse=x=>JSON.parse(x);
const own=(x,k)=>Object.hasOwn(x??{},k);
const clean=(x)=>structuredClone(x);
const rowsWithProvenance=(items,op,uid)=>Object.fromEntries(Object.entries(items).map(([id,row])=>
  [id,{...row,operationId:op,updatedAt:ServerValue.TIMESTAMP,updatedBy:uid}]));
export function statusFor(snapshot,op){
  const unknown={status:'unknown',operationId:op};
  if(!snapshot?.active||!snapshot?.generations)return unknown;
  const operation=snapshot.operations?.[op];
  if(!operation)return snapshot.active.operationId===op?unknown:{status:'not-committed',operationId:op};
  if(operation.status!=='COMMITTED'||operation.to!=='gen_'+op||!snapshot.generations[operation.to]?.items||
    !operation.from||operation.from===operation.to||!Number.isFinite(operation.at))return unknown;
  return {status:snapshot.active.generationId===operation.to&&snapshot.active.operationId===op
    ?'committed-active':'committed-historical',operationId:op,generationId:operation.to};
}
function validateRequest(body){
  check(body&&typeof body==='object'&&!Array.isArray(body),'invalid request');
  const allowed=['action','operationId','confirmation','expected','backupOperationId'];
  check(Object.keys(body).every(k=>allowed.includes(k)),'arbitrary tree/metadata payload not allowed');
  check(['activate','replace','restore','resolve'].includes(body.action),'invalid action');
  check(operationValid(body.operationId),'invalid operationId');
  if(body.action==='restore')check(operationValid(body.backupOperationId),'invalid backup operationId');
  if(body.action==='replace'||body.action==='restore'){
    const e=body.expected;
    check(e&&typeof e==='object'&&!Array.isArray(e)&&Object.keys(e).sort().join(',')===
      'digest,generationId,operationId,revision,rowCount','missing exact expected epoch');
    check(operationValid(e.operationId)&&/^gen_/.test(e.generationId)&&
      Number.isSafeInteger(e.revision)&&e.revision>0&&
      Number.isSafeInteger(e.rowCount)&&e.rowCount>0&&/^[a-f0-9]{64}$/.test(e.digest),
      'invalid expected epoch');
  }
  if(body.action!=='resolve')check(typeof body.confirmation==='string'&&body.confirmation.length<250,
    'missing exact confirmation');
  return body;
}
async function loadRoot(db){return (await db.ref(ROOT).get()).val();}
async function loadState(db){
  // RTDB Rules deliberately DENY a broad /hdnd read. Scope to the four
  // separate authorized legacy paths; only the root transaction is V2.
  const [items,permissions,editLocks,freezeControl]=await Promise.all(
    ['items','permissions','editLocks','freezeControl'].map(async key=>
      (await db.ref('hdnd/'+key).get()).val()));
  return {items,permissions,editLocks,freezeControl};
}
function inspect(current,body,uid,legacy){
  const op=body.operationId,mode=body.action;
  check(current&&typeof current==='object','missing staged root');
  check(!own(current.operations,op)&&!own(current.generations,'gen_'+op),'operation or generation exists');
  let approved,digest,count,sourcePermissions,recordMap,bootstrap=null,oldGen;
  if(mode==='activate'){
    check(!current.active,'already V2 active');
    const {candidate,manifest}=decodeCandidate(current.candidates?.[op],op);
    const seal=parse(current.legacyBackups?.[op]??'null');
    check(seal&&stable(seal.manifest)===stable(manifest),'legacy staging manifest mismatch');
    check(seal.baseline===sha256(stable({legacy:seal.legacy,freeze:seal.freeze})),
      'invalid legacy sealed checksum');
    check(legacy&&stable(legacy.legacy)===stable(seal.legacy)&&
      stable(legacy.freeze)===stable(seal.freeze),'legacy/freeze changed');
    check(body.confirmation===`KHOI TAO V2 ${op} ${Object.keys(legacy.legacy.items).length} ${manifest.rowCount}`,
      'incorrect approval confirmation');
    sourcePermissions={columns:{}};
    approved=candidate.items;digest=manifest.digest;count=manifest.rowCount;oldGen='legacy';
    bootstrap={operationId:op,freezeRevision:seal.freeze.revision,freezeEpoch:seal.freeze.epoch,
      legacyBaseline:seal.baseline};
  }else if(mode==='replace'){
    check(sameEpoch(current.active,body.expected),'stale source pointer');
    const {candidate,manifest}=decodeCandidate(current.candidates?.[op],op);
    const backup=verifyBackup(current.backups?.[op]);
    check(sameEpoch(backup.previous,current.active),'backup pointer mismatch');
    check(backup.baseline===stable(scoped(current)),'active generation content changed since staging');
    check(body.confirmation===`THAY ${op} ${Object.keys(backup.generation.items).length} ${manifest.rowCount}`,
      'incorrect replacement confirmation');
    approved=candidate.items;digest=manifest.digest;count=manifest.rowCount;
    sourcePermissions={columns:{}};oldGen=current.active.generationId;
  }else if(mode==='restore'){
    check(sameEpoch(current.active,body.expected),'stale restore pointer');
    check(body.confirmation==='KHOI PHUC '+op,'incorrect restore confirmation');
    const backup=verifyBackup(current.backups?.[body.backupOperationId]);
    check(backup.previous&&backup.generation?.items,'backup missing approved rows');
    check(!own(current.leases,'gen_'+op),'restore destination contains leases');
    approved=backup.generation.items;count=Object.keys(approved).length;
    check(count>0&&count<=1000,'invalid restored row count');
    digest=backup.previous.digest;sourcePermissions=parse(backup.permissionsJson)??{columns:{}};
    oldGen=current.active.generationId;
  }else throw Error('Unsupported action');
  const next={...current,
    generations:{...(current.generations??{}),['gen_'+op]:{items:rowsWithProvenance(approved,op,uid)}},
    permissions:{...(current.permissions??{}),['gen_'+op]:sourcePermissions},
    active:{generationId:'gen_'+op,operationId:op,revision:(current.active?.revision??0)+1,
      rowCount:count,digest},
    operations:{...(current.operations??{}),[op]:{status:'COMMITTED',from:oldGen,
      to:'gen_'+op,at:Date.now()}}
  };
  if(mode==='activate')next.bootstrap=bootstrap;
  assertSafeParentTransition(current,next,{mode,operationId:op,actor:uid,
    backupOperationId:body.backupOperationId});
  return next;
}
export async function handleParentAction(db,identity,input){
  const body=validateRequest(input);
  const uid=identity.uid;
  if(body.action==='resolve')return statusFor(await loadRoot(db),body.operationId);
  const op=body.operationId;
  const before=await loadRoot(db);
  const status=statusFor(before,op);
  if(status.status==='committed-active'||status.status==='committed-historical')return {
    status:status.status==='committed-active'?'already-committed':'committed-historical',operationId:op};
  check(status.status==='not-committed'||(!before?.active&&body.action==='activate'),
    'operation status ambiguous');
  // Preflight is not authority; it validates SHA256 and exposes corruption before CAS.
  const legacy=body.action==='activate'?legacySnapshot({hdnd:await loadState(db)}):null;
  inspect(before,body,uid,legacy);
  const reference=db.ref(ROOT);
  await reference.get();
  let denial='';
  let result;
  try{
    result=await reference.transaction(raw=>{
      try{
        if(!raw)return;
        return inspect(raw,body,uid,legacy);
      }catch(error){denial=String(error?.message??error);return undefined;}
    },undefined,false);
  }catch(error){throw Error('PARENT_TRANSACTION_DENIED: '+String(error?.message??error));}
  if(process.env.FIREBASE_DATABASE_EMULATOR_HOST)console.log('PARENT_TRANSACTION_RESULT',JSON.stringify({action:body.action,operationId:op,committed:result.committed,denial}));
  if(!result.committed){
    // A failed transaction may be conflict, denial, or ambiguous. Read server status.
    const verified=statusFor(await loadRoot(db),op);
    if(verified.status==='committed-active')return {status:'already-committed',operationId:op};
    if(denial)throw Error(denial);
    return {status:'unknown',operationId:op};
  }
  const observed=statusFor(await loadRoot(db),op);
  if(observed.status==='committed-active')return {status:'committed',operationId:op};
  return {status:'unknown',operationId:op};
}