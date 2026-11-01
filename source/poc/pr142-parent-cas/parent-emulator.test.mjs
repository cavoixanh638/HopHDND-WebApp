/** Independent full-Rules Auth+RTDB Emulator parent-CAS probe, PR142 SHA 98ead3e.
 * No production Firebase connection. Synthetic Auth claims. No owner writes
 * except fixture seed/clear. Owner REST is READ-ONLY for server witnesses.
 */
import {beforeAll,afterAll,beforeEach,it,expect} from 'vitest';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {get,onValue,ref,runTransaction,update,serverTimestamp} from 'firebase/database';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,randomBytes} from 'node:crypto';
import {bootstrapApprovedRowsToPrimary} from '../../src/data/firebase-primary-bootstrap.ts';
import {setFreezeMode,initialFreeze} from '../../src/data/freeze-control.ts';
import {createDemoItems} from '../../src/data/demo-items.ts';
import {stageDatasetReplacement,prepareInitialDatasetActivation,commitInitialDatasetActivation,
  commitDatasetReplacement,restoreDatasetBackup,resolveDatasetOperation}
  from '../../src/data/firebase-versioned-replacement.ts';
import {assertSafeParentTransition,stable} from './parent-contract.mjs';
import {commitTrustedReplacement} from './trusted-parent-replace.mjs';
const PROJECT='demo-pr142-parent-cas',BASE='hdnd/datasetV2';
const UID='synthetic_admin_parent',OTHER_UID='synthetic_other_parent';
const CLAIMS={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com'}};
const ACTOR={uid:UID,email:CLAIMS.email,emailVerified:true,providerData:[{providerId:'google.com'}]};
const MODE=process.env.PARENT_CASE_MODE;
if(!['baseline','trial'].includes(MODE))throw Error('PARENT_CASE_MODE must be baseline|trial');
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
   process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')
  throw Error('Only isolated localhost Auth+RTDB Emulators are accepted');
const RULES=readFileSync(process.env.PARENT_RULES_PATH||'', 'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const salt=randomBytes(16).toString('hex');
const red=(v,k='')=>{
  if(/^(token|session|editProofs)$/i.test(k))return 'sha256:'+sha(salt+stable(v));
  if(/^(backups|legacyBackups|candidates)$/i.test(k))return 'sha256:'+sha(stable(v));
  if(Array.isArray(v))return v.map(x=>red(x));
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([key,val])=>[key,red(val,key)]));
  return v;
};
let env;
const evidence=[];
const ADMIN=()=>env.authenticatedContext(UID,CLAIMS).database();
// Only a future trusted service may set this claim in production. This
// synthetic Emulator context does NOT establish Admin SDK override behavior.
const SERVICE=()=>env.authenticatedContext(UID,{...CLAIMS,parentCasService:true}).database();
const clone=x=>structuredClone(x);
function row(note='Synthetic initial'){
  const {partyMeeting:_p,examined:_q,archivedAt:_a,...sample}=createDemoItems(1)[0];
  return {...sample,recordId:'r1',displayCode:'NQ01',stt:1,note,revision:1};
}
async function readOwner(path='hdnd'){
  const url=`http://127.0.0.1:9000/${path}.json?ns=${PROJECT}`;
  const response=await fetch(url,{headers:{Authorization:'Bearer owner'}});
  if(!response.ok)throw Error('Independent localhost witness failed HTTP '+response.status);
  return response.json();
}
async function snap(){const v=await readOwner();return {raw:v,hash:sha(stable(v)),redacted:red(v)};}
function log(label,before,after,result,transport){
  const prev=before.raw?.datasetV2??{},next=after.raw?.datasetV2??{};
  const currentGen=prev.active?.generationId;
  const detail={label,mode:MODE,transport,result,serverBefore:before.hash,
    serverAfter:after.hash,serverChanged:before.hash!==after.hash,
    activeBefore:prev.active??null,activeAfter:next.active??null,
    existingRowChanged:stable(prev.generations?.[currentGen]?.items)!==stable(next.generations?.[currentGen]?.items),
    existingLeaseChanged:stable(prev.leases?.[currentGen])!==stable(next.leases?.[currentGen]),
    before:before.redacted,after:after.redacted};
  evidence.push(detail);
  console.log('PARENT_SERVER_WITNESS '+JSON.stringify({label,mode:MODE,result,
    serverChanged:detail.serverChanged,existingRowChanged:detail.existingRowChanged,
    existingLeaseChanged:detail.existingLeaseChanged,
    ptrBefore:detail.activeBefore?.generationId,ptrAfter:detail.activeAfter?.generationId}));
  return detail;
}
async function authoritativeSeed(value){
  await env.withSecurityRulesDisabled(async ctx=>{
    const {set}=await import('firebase/database');
    await set(ref(ctx.database()),value);
  });
}
const PREV_OP='seed_parent_0001',PREV_GEN='gen_'+PREV_OP;
const SESSION='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',TOKEN='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
async function ready({foreignLease=false}={}){
  const now=Date.now();
  const lease={uid:foreignLease?OTHER_UID:UID,session:SESSION,token:TOKEN,
    kind:'multiline',revision:1,acquiredAt:now-1000,expiresAt:now+30000};
  await authoritativeSeed({hdnd:{
    control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
    freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:UID,changedAt:now-120000,deadline:0,closedAt:0},
    datasetV2:{
      active:{generationId:PREV_GEN,operationId:PREV_OP,revision:1,rowCount:1,digest:'a'.repeat(64)},
      generations:{[PREV_GEN]:{items:{r1:{...row(),operationId:PREV_OP,updatedAt:1,updatedBy:UID}}}},
      permissions:{[PREV_GEN]:{columns:{note:true}}},
      leases:{[PREV_GEN]:{r1:{note:lease}}},
      operations:{[PREV_OP]:{status:'COMMITTED',from:'legacy',to:PREV_GEN,at:now-120000}}
    }
  }});
}
async function stage(label){
  const operationId='op_'+label.replace(/[^A-Za-z0-9_]/g,'_')+'_2026';
  const approval=await stageDatasetReplacement(ADMIN(),ACTOR,[row('Approved '+label)],operationId,'candidate.xlsx');
  return {approval,operationId};
}
async function keepLiveParent(db){
  return new Promise((resolve,reject)=>{
    let done=false,stop=()=>{};
    stop=onValue(ref(db,BASE),s=>{if(!done&&s.exists()){done=true;resolve(stop);}},reject);
  });
}
function proposed(old,approval){
  const {manifest,operationId}=approval;
  const candidate=JSON.parse(old.candidates[operationId]);
  const hydrated=Object.fromEntries(Object.entries(candidate.items).map(([id,item])=>
    [id,{...item,operationId,updatedAt:serverTimestamp(),updatedBy:UID}]));
  return {...clone(old),
    generations:{...clone(old.generations),[manifest.generationId]:{items:hydrated}},
    permissions:{...clone(old.permissions),[manifest.generationId]:{columns:{}}},
    active:{generationId:manifest.generationId,operationId,
      revision:old.active.revision+1,rowCount:manifest.rowCount,digest:manifest.digest},
    operations:{...clone(old.operations),[operationId]:{
      status:'COMMITTED',from:old.active.generationId,to:manifest.generationId,at:Date.now()}}
  };
}
async function sendParent(label,{actor='admin',tamper=()=>{},guard=false}={}){
  const {approval}=await stage(label);
  const db=actor==='service'?SERVICE():ADMIN();
  const before=await snap();
  const release=await keepLiveParent(db);
  let result={status:'not-sent'};
  try{
    const completed=await runTransaction(ref(db,BASE),raw=>{
      if(!raw)return undefined;
      const next=proposed(raw,approval);
      tamper(next,raw,approval);
      if(guard)assertSafeParentTransition(raw,next,{mode:'replace',operationId:approval.operationId,actor:UID});
      return next;
    },{applyLocally:false});
    result={status:completed.committed?'committed':'aborted-local',committed:completed.committed};
  }catch(e){result={status:'rejected',code:e?.code??'error',message:String(e?.message??e)};}
  finally{release();}
  const after=await snap(),detail=log(label,before,after,result,
    actor==='service'?'synthetic parentCasService claim evaluated by REAL Emulator Rules':
      'ordinary synthetic admin authenticatedContext evaluated by REAL Emulator Rules');
  return {result,detail,approval};
}
function requireNoMutation(x){
  expect(x.result.status,'A local abort without request is NOT evidence of server denial').toBe('rejected');
  expect(x.detail.serverChanged).toBe(false);
}
beforeAll(async()=>{
  env=await initializeTestEnvironment({projectId:PROJECT,database:{host:'127.0.0.1',port:9000,rules:RULES}});
});
beforeEach(async()=>{await env.clearDatabase();});
afterAll(async()=>{
  const out=process.env.PARENT_WITNESS_OUT||`parent-${MODE}-witness.json`;
  const doc={sourceSha:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847',
    mode:MODE,rulesHash:sha(RULES),project:PROJECT,serverWitness:'localhost owner REST GET, READ ONLY',
    privilegedUse:'ONLY synthetic seed with withSecurityRulesDisabled',
    syntheticServiceClaim:'Rules Unit Testing only; not a production service credential',
    observations:evidence};
  writeFileSync(out,JSON.stringify(doc,null,2));
  console.log('PARENT_WITNESS_FILE '+out+' SHA256 '+sha(readFileSync(out)));
  await env?.cleanup();
});

it('CONTROL legacy bootstrap uses actual unscoped admin Rules',async()=>{
  await authoritativeSeed({hdnd:{control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()}}});
  const before=await snap();
  const result=await bootstrapApprovedRowsToPrimary(ADMIN(),ACTOR,[row('bootstrap approved')]);
  const after=await snap();log('bootstrap',before,after,{status:'committed',result},'regular admin through Rules');
  expect(after.raw.items?.r1?.note).toBe('bootstrap approved');
});
it('CONTROL activation -> replace -> restore -> resolve with verified staged payloads',async()=>{
  await authoritativeSeed({hdnd:{control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()}}});
  await bootstrapApprovedRowsToPrimary(ADMIN(),ACTOR,[row('legacy seed')]);
  const freeze=await setFreezeMode(ADMIN(),ACTOR,initialFreeze,'FROZEN',true);
  expect(freeze.mode).toBe('FROZEN');
  const initial=await prepareInitialDatasetActivation(ADMIN(),ACTOR,[row('first V2')],
    'activate_parent_0001','first.xlsx');
  const b0=await snap();
  // The coordinator identity here is SIMULATED by Rules testing; it must be
  // implemented/validated separately before any real deployment.
  const c0=await commitInitialDatasetActivation(MODE==='trial'?SERVICE():ADMIN(),ACTOR,initial,
    'KHOI TAO V2 '+initial.operationId+' '+initial.legacyRowCount+' '+initial.preview.newCount);
  const a0=await snap();log('activation',b0,a0,c0,'source API; parent Rules caller='+MODE);
  expect(c0.status).toBe('committed');
  expect(assertSafeParentTransition(b0.raw.datasetV2,a0.raw.datasetV2,
    {mode:'activate',operationId:initial.operationId,actor:UID})).toBe(true);
  const approval=await stageDatasetReplacement(ADMIN(),ACTOR,[row('approved replacement')],
    'replace_parent_0002','replacement.xlsx');
  const b1=await snap();
  const c1=await commitDatasetReplacement(MODE==='trial'?SERVICE():ADMIN(),ACTOR,approval,
    'THAY '+approval.operationId+' '+approval.preview.oldCount+' '+approval.preview.newCount);
  const a1=await snap();log('replace',b1,a1,c1,'source API; parent Rules caller='+MODE);
  expect(c1.status).toBe('committed');
  expect(assertSafeParentTransition(b1.raw.datasetV2,a1.raw.datasetV2,
    {mode:'replace',operationId:approval.operationId,actor:UID})).toBe(true);
  const b2=await snap();
  const restoreOp='restore_parent_0003';
  const c2=await restoreDatasetBackup(MODE==='trial'?SERVICE():ADMIN(),ACTOR,
    approval.operationId,restoreOp,a1.raw.datasetV2.active,'KHOI PHUC '+restoreOp);
  const a2=await snap();log('restore',b2,a2,c2,'source API; parent Rules caller='+MODE);
  expect(c2.status).toBe('committed');
  expect(assertSafeParentTransition(b2.raw.datasetV2,a2.raw.datasetV2,
    {mode:'restore',operationId:restoreOp,backupOperationId:approval.operationId,actor:UID})).toBe(true);
  const resolved=await resolveDatasetOperation(MODE==='trial'?SERVICE():ADMIN(),restoreOp);
  expect(resolved.status).toBe('committed-active');
});
it('CONTROL pointer-only through Rules (baseline admin / trial synthetic service)',async()=>{
  await ready();
  const x=await sendParent('valid_pointer',{actor:MODE==='trial'?'service':'admin',guard:MODE==='trial'});
  expect(x.result.status,'Positive pointer-only must COMMIT').toBe('committed');
  expect(x.detail.existingRowChanged).toBe(false);
  expect(x.detail.existingLeaseChanged).toBe(false);
});
it('CONTROL ordinary admin cannot use parent CAS when trial fence is active',async()=>{
  await ready();
  const x=await sendParent('unscoped_pointer_only');
  if(MODE==='baseline')expect(x.result.status).toBe('committed');
  else requireNoMutation(x);
});
it('CONTROL same-owner leaf lease RELEASE separately (not a parent exploit)',async()=>{
  await ready();
  const before=await snap(),db=ADMIN();
  const path=BASE+'/leases/'+PREV_GEN+'/r1/note';
  const old=(await get(ref(db,path))).val();
  let result={status:'unattempted'};
  try{await update(ref(db,path),{token:old.token,session:old.session,
      revision:old.revision+1,expiresAt:0});result={status:'committed'};}
  catch(e){result={status:'rejected',message:String(e)};}
  const after=await snap();log('leaf_release_own',before,after,result,'ordinary admin LEAF update through real Rules');
  expect(result.status).toBe('committed');
  expect(after.raw.datasetV2.leases[PREV_GEN].r1.note.expiresAt).toBe(0);
});
it('CONTROL foreign-session/UID lease cannot be released at leaf by admin',async()=>{
  await ready({foreignLease:true});
  const before=await snap(),db=ADMIN(),path=BASE+'/leases/'+PREV_GEN+'/r1/note';
  const old=(await get(ref(db,path))).val();
  let result={status:'unattempted'};
  try{await update(ref(db,path),{token:old.token,session:old.session,
      revision:old.revision+1,expiresAt:0});result={status:'committed'};}
  catch(e){result={status:'rejected',message:String(e)};}
  const after=await snap();log('leaf_release_foreign',before,after,result,'ordinary admin LEAF update through Rules');
  expect(result.status).toBe('rejected');
  expect(before.hash).toBe(after.hash);
});
it('SECURITY REGRESSION valid pointer + existing lease RELEASE raw admin',async()=>{
  await ready();
  const x=await sendParent('existing_lease_expire',{tamper:next=>{
    next.leases[PREV_GEN].r1.note.expiresAt=0;
    next.leases[PREV_GEN].r1.note.revision++;
  }});
  if(MODE==='baseline'){
    console.warn('BASELINE SECURITY FAILURE EXPECTED: existing lease expired via parent='+x.result.status);
    expect(x.result.status).toBe('committed');
    expect(x.detail.existingLeaseChanged).toBe(true);
  }else requireNoMutation(x);
});
it('SECURITY REGRESSION valid pointer + new generation content tamper raw admin',async()=>{
  await ready();
  const x=await sendParent('new_generation_tamper',{tamper:(next,raw,approval)=>{
    next.generations[approval.manifest.generationId].items.r1.note='TAMPERED_NOT_STAGED';
  }});
  if(MODE==='baseline'){
    console.warn('BASELINE SECURITY FAILURE EXPECTED: unstaged row accepted via parent='+x.result.status);
    expect(x.result.status).toBe('committed');
    expect(x.detail.activeAfter?.generationId).toBe(x.approval.manifest.generationId);
  }else requireNoMutation(x);
});
it('TRUSTED coordinator rejects malicious lease or new-row content before Rules write',async()=>{
  await ready();
  const {approval}=await stage('trusted_contract');
  const before=await snap();
  const current=before.raw.datasetV2;
  for(const kind of ['lease','tamper','old-row','foreign-lease']){
    const next=proposed(current,approval);
    if(kind==='lease')next.leases[PREV_GEN].r1.note.expiresAt=0;
    if(kind==='tamper')next.generations[approval.manifest.generationId].items.r1.note='TAMPERED';
    if(kind==='old-row')next.generations[PREV_GEN].items.r1.note='ILLICIT';
    if(kind==='foreign-lease'){
      next.leases[PREV_GEN].r1.note.uid=OTHER_UID;
      next.leases[PREV_GEN].r1.note.expiresAt=0;
    }
    expect(()=>assertSafeParentTransition(current,next,
      {mode:'replace',operationId:approval.operationId,actor:UID})).toThrow(/PARENT_CONTRACT_DENIED/);
  }
  const after=await snap();log('trusted_preflight_rejects',before,after,
    {status:'rejected-in-process-before-write',cases:4},
    'pure server-side contract; NO actual attacker request to Rules');
  expect(after.hash).toBe(before.hash);
});

it('TRIAL trusted narrow replacement transaction builds from sealed staging',async()=>{
  if(MODE==='baseline')return; // Trial service claim required.
  await ready();
  const {approval}=await stage('trusted_actual_commit');
  const before=await snap();
  const result=await commitTrustedReplacement(SERVICE(),approval,UID);
  const after=await snap();log('trusted_replacement_commit',before,after,result,
    'trusted proposal constructed in runTransaction + synthetic scoped Rules claim');
  expect(result.status).toBe('committed');
  expect(after.raw.datasetV2.active.generationId).toBe(approval.manifest.generationId);
  expect(after.raw.datasetV2.generations[approval.manifest.generationId].items.r1.note)
    .toBe('Approved trusted_actual_commit');
  expect(after.raw.datasetV2.generations[PREV_GEN]).toEqual(before.raw.datasetV2.generations[PREV_GEN]);
  expect(after.raw.datasetV2.leases).toEqual(before.raw.datasetV2.leases);
});
