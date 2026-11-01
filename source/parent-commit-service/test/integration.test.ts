/** Real Firebase Auth Emulator ID tokens -> HTTP endpoint -> Admin SDK scoped
 * Rules override -> FULL RTDB Rules. No authenticatedContext service claim.
 */
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest';
import {initializeTestEnvironment,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential,
  signInAnonymously,getIdToken,type User} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,set,runTransaction,serverTimestamp} from 'firebase/database';
import {getDatabase as getAdminDatabase} from 'firebase-admin/database';
import {initializeApp as adminInitialize,deleteApp as adminDelete} from 'firebase-admin/app';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {bootstrapApprovedRowsToPrimary} from '../../src/data/firebase-primary-bootstrap';
import {setFreezeMode,initialFreeze} from '../../src/data/freeze-control';
import {createDemoItems} from '../../src/data/demo-items';
import {stageDatasetReplacement,prepareInitialDatasetActivation,readStagedDataset,
  commitInitialDatasetActivation,commitDatasetReplacement,restoreDatasetBackup,
  resolveDatasetOperation} from '../../src/data/firebase-versioned-replacement-secure';
import {requestParentDatasetCommit} from '../../src/data/parent-commit-api';

const PROJECT='demo-hdnd',ROOT='hdnd/datasetV2';
const API=process.env.PARENT_ENDPOINT||'http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit';
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
 process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('EMULATOR_ONLY');
const ADMIN_EMAIL='cavoixanh638@gmail.com';
const sha=x=>createHash('sha256').update(typeof x==='string'?x:JSON.stringify(x)).digest('hex');
const stable=x=>JSON.stringify(sort(x));
function sort(x){if(Array.isArray(x))return x.map(sort);
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>[k,sort(v)]));
 return x===undefined?null:x;}
let env:RulesTestEnvironment;const applications:FirebaseApp[]=[];let admin:User,db:any;
const records:any[]=[];
function row(note='synthetic approved'){
 const {partyMeeting:_p,examined:_q,archivedAt:_a,...r}=createDemoItems(1)[0];
 return {...r,recordId:'r1',displayCode:'NQ-TEST-01',stt:1,note,revision:1};
}
async function sdk(name:string){
 const app=initializeApp({apiKey:'demo-key',authDomain:PROJECT+'.firebaseapp.com',
  projectId:PROJECT,databaseURL:'https://'+PROJECT+'.firebaseio.com',appId:PROJECT+'-'+name},name+'-'+randomUUID());
 applications.push(app);
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const database=getDatabase(app);connectDatabaseEmulator(database,'127.0.0.1',9000);
 return {app,auth,database};
}
async function google(s:any,uid:string,email=ADMIN_EMAIL,verified=true){
 const result=await signInWithCredential(s.auth,GoogleAuthProvider.credential(JSON.stringify({
  sub:uid,email,email_verified:verified,name:'local synthetic Google test only'})));
 return result.user;
}
async function witness(){
 const response=await fetch('http://127.0.0.1:9000/hdnd.json?ns='+PROJECT,
  {headers:{Authorization:'Bearer owner'}}); // read-only witness
 if(!response.ok)throw Error('Local read-only owner witness '+response.status);
 return response.json();
}
const mask=(x:any,k=''):any=>{
 if(['token','session','editProofs','candidates','backups','legacyBackups'].includes(k))return 'sha256:'+sha(x);
 if(Array.isArray(x))return x.map(y=>mask(y));
 if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).map(([key,val])=>[key,mask(val,key)]));
 return x;
};
function log(name:string,before:any,after:any,result:any,transport='real Auth-token HTTP + scoped Rules'){
 const entry={name,transport,requestResult:result,serverBefore:sha(stable(before)),
  serverAfter:sha(stable(after)),serverChanged:stable(before)!==stable(after),
  before:mask(before),after:mask(after)};
 records.push(entry);console.log('PARENT_AUTH_SERVER_WITNESS '+JSON.stringify({
  name,requestResult:result,serverChanged:entry.serverChanged,serverBefore:entry.serverBefore,
  serverAfter:entry.serverAfter}));return entry;
}
async function post(user:User|null,body:any,headers:Record<string,string>={}){
 const h:Record<string,string>={'Content-Type':'application/json',...headers};
 if(user)h.Authorization='Bearer '+await getIdToken(user);
 const r=await fetch(API,{method:'POST',headers:h,body:JSON.stringify(body)});
 return {status:r.status,body:await r.json()};
}
const seeded=async(value:any)=>env.withSecurityRulesDisabled(async ctx=>{
 const {set}=await import('firebase/database');await set(ref(ctx.database()),value);
});
async function realAdmin(){const s=await sdk('admin');admin=await google(s,'real-google-admin-test');db=s.database;}
beforeAll(async()=>{env=await initializeTestEnvironment({projectId:PROJECT,database:{host:'127.0.0.1',port:9000,
 rules:readFileSync('firebase/database.exclusive-candidate.rules.json','utf8')}});
 await realAdmin();});
beforeEach(async()=>{await env.clearDatabase();});
afterAll(async()=>{
 mkdirSync('parent-commit-service/evidence',{recursive:true});
 const data={sourceSha:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847',
  service:'real Auth Emulator ID token / Admin SDK databaseAuthVariableOverride',
  fixture:'withSecurityRulesDisabled used ONLY for synthetic setup',
  witnesses:records};
 writeFileSync('parent-commit-service/evidence/integration-witness.json',JSON.stringify(data,null,2)+'\n');
 console.log('PARENT_AUTH_WITNESS_SHA256',sha(JSON.stringify(data)),'cases',records.length);
 await env?.cleanup();await Promise.all(applications.map(a=>deleteApp(a).catch(()=>{})));
});

it('denies no ID token, anonymous, invalid provider and unverified identity; client cannot supply a tree',async()=>{
 const before=await witness();
 const noToken=await post(null,{action:'resolve',operationId:'verify_admin_0001'});
 expect(noToken.status).toBe(401);
 const anonCtx=await sdk('anon');const anon=await signInAnonymously(anonCtx.auth);
 const anonymous=await post(anon.user,{action:'resolve',operationId:'verify_admin_0001'});
 expect(anonymous.status).toBe(403);
 const otherCtx=await sdk('other');const other=await google(otherCtx,'other-account','other@example.net');
 const wrongEmail=await post(other,{action:'resolve',operationId:'verify_admin_0001'});
 expect(wrongEmail.status).toBe(403);
 const unverifiedCtx=await sdk('unverified');const unverified=await google(unverifiedCtx,'unverified-admin','unverified-local@example.test',false);
 const unverifiedResult=await post(unverified,{action:'resolve',operationId:'verify_admin_0001'});
 expect(unverifiedResult.status).toBe(403);
 const injected=await post(admin,{action:'activate',operationId:'verify_admin_0001',
  confirmation:'x',parentCasService:true,next:{active:{}}});
 expect(injected.status).toBe(409);
 const after=await witness();expect(stable(after)).toBe(stable(before));
 log('real_auth_negative_admin_and_arbitrary_tree',before,after,{noToken,anonymous,wrongEmail,
  unverified:unverifiedResult,injected});
});

it('Rules reject unscoped raw admin parent writes and restricted Admin SDK override rejects illegal payloads',async()=>{
 const now=Date.now();
 await seeded({hdnd:{freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:admin.uid,
  changedAt:now-1000,deadline:0,closedAt:0},datasetV2:{
  active:{generationId:'gen_testbase_0001',operationId:'testbase_0001',revision:1,rowCount:1,digest:'a'.repeat(64)},
  generations:{gen_testbase_0001:{items:{r1:{...row(),operationId:'testbase_0001',updatedAt:1,updatedBy:admin.uid}}}},
  operations:{testbase_0001:{status:'COMMITTED',from:'legacy',to:'gen_testbase_0001',at:now-1000}}
 }}});
 const before=await witness();
 const illegal=ref(db,ROOT+'/generations/gen_testbase_0001/items/r1/note');
 // Direct leaf edit is also denied because the row lacks a legitimate lease.
 await expect(runTransaction(ref(db,ROOT),raw=>{
  if(!raw)return raw;
  return {...raw,active:{...raw.active,revision:2}};
 },{applyLocally:false})).rejects.toThrow();
 const scopedApp=adminInitialize({projectId:PROJECT,
  databaseURL:'https://'+PROJECT+'.firebaseio.com',databaseAuthVariableOverride:{
  uid:admin.uid,token:{email:ADMIN_EMAIL,email_verified:true,
   firebase:{sign_in_provider:'google.com'},parentCasService:true}}
 },'independent-scoped-override-'+randomUUID());
 try{
  // Because this is a REAL Admin SDK Rules-scoped credential, an invalid
  // pointer without valid operation/generation MUST still fail at Rules.
  await expect(getAdminDatabase(scopedApp).ref(ROOT+'/active/revision').set(12)).rejects.toThrow();
 }finally{await adminDelete(scopedApp);}
 const after=await witness();expect(stable(after)).toBe(stable(before));
 log('real_sdk_scoped_override_denies_invalid_write',before,after,{status:'permission_denied'});
});

it('full App adapter journey: real Google ID token → activate → replace → restore/resolve, old generations immutable',async()=>{
 const start=await witness();
 const seed=await bootstrapApprovedRowsToPrimary(db,admin,[row('Legacy initial')]);
 expect(seed.importedCount).toBe(1);
 const closed=await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
 expect(closed.mode).toBe('FROZEN');
 const first='auth_activate_0001';
 const staged=await prepareInitialDatasetActivation(db,admin,[row('Initial V2')],first,'first.xlsx');
 expect((await readStagedDataset(db,staged as any))[0].note).toBe('Initial V2');
 const before1=await witness();
 const activated=await commitInitialDatasetActivation(db,admin,staged,
  'KHOI TAO V2 '+first+' '+staged.legacyRowCount+' '+staged.preview.newCount);
 const after1=await witness();
 console.log('PARENT_ACTIVATE_OBSERVATION',JSON.stringify({response:activated,active:after1.datasetV2?.active??null,operation:after1.datasetV2?.operations?.[first]??null}));
 expect(activated.status).toBe('committed');
 expect(after1.datasetV2.active.generationId).toBe('gen_'+first);
 expect(after1.datasetV2.generations['gen_'+first].items.r1.note).toBe('Initial V2');
 log('app_adapter_initial_activation',before1,after1,activated);
 const activationRetry=await commitInitialDatasetActivation(db,admin,staged,
  'KHOI TAO V2 '+first+' '+staged.legacyRowCount+' '+staged.preview.newCount);
 const afterActivationRetry=await witness();
 expect(activationRetry.status).toBe('already-committed');
 expect(stable(afterActivationRetry)).toBe(stable(after1));
 log('app_adapter_activation_retry_no_double_commit',after1,afterActivationRetry,activationRetry);
 const second='auth_replace_0002';
 const approval=await stageDatasetReplacement(db,admin,[row('Approved replacement')],second,'second.xlsx');
 const before2=await witness();
 const replaced=await commitDatasetReplacement(db,admin,approval,
  'THAY '+second+' '+approval.preview.oldCount+' '+approval.preview.newCount);
 const after2=await witness();
 expect(replaced.status).toBe('committed');
 expect(after2.datasetV2.generations['gen_'+second].items.r1.note).toBe('Approved replacement');
 expect(after2.datasetV2.generations['gen_'+first]).toEqual(before2.datasetV2.generations['gen_'+first]);
 expect(after2.datasetV2.candidates).toEqual(before2.datasetV2.candidates);
 expect(after2.datasetV2.backups).toEqual(before2.datasetV2.backups);
 expect(after2.datasetV2.active.digest).toBe(JSON.parse(after2.datasetV2.candidates[second]).manifest.digest);
 log('app_adapter_stage_replace',before2,after2,replaced);
 const resolved=await resolveDatasetOperation(db,second);
 expect(resolved.status).toBe('committed-active');
 const repeat=await commitDatasetReplacement(db,admin,approval,
  'THAY '+second+' '+approval.preview.oldCount+' '+approval.preview.newCount);
 const afterRepeat=await witness();
 expect(repeat.status).toBe('already-committed');
 expect(stable(afterRepeat)).toBe(stable(after2));
 log('app_adapter_idempotent_retry',after2,afterRepeat,repeat);
 const restoreId='auth_restore_0003';const before3=await witness();
 const restored=await restoreDatasetBackup(db,admin,second,restoreId,
  before3.datasetV2.active,'KHOI PHUC '+restoreId);
 const after3=await witness();
 expect(restored.status).toBe('committed');
 expect(after3.datasetV2.generations['gen_'+restoreId].items.r1.note).toBe('Initial V2');
 expect(after3.datasetV2.leases?.['gen_'+restoreId]).toBeUndefined();
 expect(after3.datasetV2.generations['gen_'+first]).toEqual(before3.datasetV2.generations['gen_'+first]);
 expect(after3.datasetV2.generations['gen_'+second]).toEqual(before3.datasetV2.generations['gen_'+second]);
 expect((await resolveDatasetOperation(db,second)).status).toBe('committed-historical');
 expect((await resolveDatasetOperation(db,restoreId)).status).toBe('committed-active');
 log('app_adapter_restore_historical_resolve',before3,after3,restored);
 const restoreRetry=await restoreDatasetBackup(db,admin,second,restoreId,
  before3.datasetV2.active,'KHOI PHUC '+restoreId);
 const afterRestoreRetry=await witness();
 expect(restoreRetry.status).toBe('already-committed');
 expect(stable(afterRestoreRetry)).toBe(stable(after3));
 log('app_adapter_restore_retry_no_double_commit',after3,afterRestoreRetry,restoreRetry);
});

it('malicious commit tree, wrong confirmation, stale pointer and tampered staging fail closed through real endpoint',async()=>{
 const now=Date.now(),first='seed_base_auth_0001';
 await seeded({hdnd:{freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:admin.uid,changedAt:now-1000,deadline:0,closedAt:0},
  datasetV2:{active:{generationId:'gen_'+first,operationId:first,revision:1,rowCount:1,digest:'b'.repeat(64)},
    generations:{['gen_'+first]:{items:{r1:{...row(),operationId:first,updatedAt:1,updatedBy:admin.uid}}}},
    operations:{[first]:{status:'COMMITTED',from:'legacy',to:'gen_'+first,at:now-1000}}}}});
 const id='auth_attempt_0002';const approval=await stageDatasetReplacement(db,admin,[row('Genuine staged')],id,'stage.xlsx');
 const before=await witness();
 const data={action:'replace',operationId:id,expected:approval.expected,
  confirmation:'THAY '+id+' '+approval.preview.oldCount+' '+approval.preview.newCount};
 const arbitrary=await post(admin,{...data,next:{generations:{bad:{}}}});
 const invalidConfirm=await post(admin,{...data,confirmation:'THAY unexpected'});
 const stale=await post(admin,{...data,expected:{...approval.expected,revision:99}});
 for(const x of [arbitrary,invalidConfirm,stale])expect(x.status).toBe(409);
 const unchanged=await witness();expect(stable(unchanged)).toBe(stable(before));
 log('bad_payload_confirmation_epoch',before,unchanged,{arbitrary,invalidConfirm,stale});
 // Malformed staging introduced only by a synthetic privileged fixture,
 // proving that a valid admin ID token is insufficient to commit bad digest.
 const corrupt=structuredClone(before);
 const source=JSON.parse(corrupt.datasetV2.candidates[id]);
 source.items.r1.note='UNAPPROVED';
 corrupt.datasetV2.candidates[id]=JSON.stringify(source);
 await seeded({hdnd:corrupt});
 const preBad=await witness();const rejected=await post(admin,data);
 expect(rejected.status).toBe(409);
 const postBad=await witness();expect(stable(postBad)).toBe(stable(preBad));
 log('corrupted_staging_SHA256_denied',preBad,postBad,rejected);
});

it('DR-02 REGRESSION: self-consistent admin-created backup cannot restore rows absent from COMMITTED journal',async()=>{
  const created=Date.now();
  const source='source_approved_seed_0001';
  const active={generationId:'gen_'+source,operationId:source,revision:1,
    rowCount:1,digest:'a'.repeat(64)};
  const approved={...row('GENUINELY APPROVED SOURCE'),operationId:source,
    updatedAt:1,updatedBy:admin.uid};
  await seeded({hdnd:{freezeControl:{mode:'OPEN',revision:1,epoch:1,
    actor:admin.uid,changedAt:created-1000,deadline:0,closedAt:0},
    datasetV2:{active,generations:{[active.generationId]:{items:{r1:approved}}},
      operations:{[source]:{status:'COMMITTED',from:'legacy',
        to:active.generationId,at:created-1000}}}}});
  const forgedOperation='unapproved_backup_0002';
  const forgedPrevious={generationId:'gen_never_approved_0000',
    operationId:'never_approved_0000',revision:1,rowCount:1,digest:'f'.repeat(64)};
  const forgedItems={r1:{...row('UNAPPROVED INJECTED RESTORE'),
    operationId:forgedPrevious.operationId,updatedBy:admin.uid,updatedAt:1}};
  const permissions={columns:{note:true}},leases=null;
  const forgedBackup={previous:forgedPrevious,generation:{items:forgedItems},
    permissionsJson:stable(permissions),leasesJson:stable(leases),
    baseline:stable({active:forgedPrevious,items:forgedItems,permissions,leases})};
  // Reproduce the product policy: a REAL verified admin may create the
  // write-once private staging backup, but it is NOT itself a server-approved
  // committed operation. An attacker can recompute every JSON checksum.
  await set(ref(db,ROOT+'/backups/'+forgedOperation),JSON.stringify(forgedBackup));
  const before=await witness();
  expect(before.datasetV2.backups[forgedOperation]).toBe(JSON.stringify(forgedBackup));
  const restoreId='review_restore_forged_0003';
  const attempted=await post(admin,{action:'restore',operationId:restoreId,
    backupOperationId:forgedOperation,expected:active,
    confirmation:'KHOI PHUC '+restoreId});
  expect(attempted.status).toBe(409);
  expect(String(attempted.body.message??'')).toMatch(/historically COMMITTED/);
  const after=await witness();
  expect(stable(after)).toBe(stable(before));
  expect(after.datasetV2.active).toEqual(active);
  expect(after.datasetV2.generations['gen_'+restoreId]).toBeUndefined();
  log('DR02_forged_private_backup_denied_at_server',before,after,attempted);
});

it('lost API completion after actual server commit returns UNKNOWN; read-only resolve and same-op retry never double-commit',async()=>{
 const t=Date.now(),gen='seed_retry_auth_0001';
 await seeded({hdnd:{freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:admin.uid,changedAt:t-1000,deadline:0,closedAt:0},
  datasetV2:{active:{generationId:'gen_'+gen,operationId:gen,revision:1,rowCount:1,digest:'c'.repeat(64)},
    generations:{['gen_'+gen]:{items:{r1:{...row(),operationId:gen,updatedAt:1,updatedBy:admin.uid}}}},
    operations:{[gen]:{status:'COMMITTED',from:'legacy',to:'gen_'+gen,at:t-1000}}}}});
 const op='ack_lost_auth_0002',stage=await stageDatasetReplacement(db,admin,[row('ACK real commit')],op,'ack.xlsx');
 const before=await witness();
 const nativeFetch=globalThis.fetch;
 let intercepted=false;
 globalThis.fetch=(async (input:any,init?:any)=>{
  const result=await nativeFetch(input,init);
  if(!intercepted&&String(input).includes('/parentDatasetCommit')){
    intercepted=true;
    if(!result.ok)throw Error('Server did not commit; cannot simulate ACK loss');
    throw Error('SYNTHETIC_TEST_ONLY_DROP_RESPONSE_AFTER_REAL_HTTP_SERVER_ACK');
  }
  return result;
 }) as typeof fetch;
 let result:any;
 try{result=await commitDatasetReplacement(db,admin,stage,
    'THAY '+op+' '+stage.preview.oldCount+' '+stage.preview.newCount);}
 finally{globalThis.fetch=nativeFetch;}
 expect(intercepted).toBe(true);
 expect(result.status).toBe('unknown');
 const after=await witness();
 console.log('PARENT_ACK_LOSS_OBSERVATION',JSON.stringify({response:result,active:after.datasetV2?.active??null,operation:after.datasetV2?.operations?.[op]??null}));
 expect(after.datasetV2.active.operationId).toBe(op);
 expect(after.datasetV2.active.revision).toBe(before.datasetV2.active.revision+1);
 log('lost_http_caller_ack_after_commit',before,after,result);
 expect((await resolveDatasetOperation(db,op)).status).toBe('committed-active');
 const retried=await commitDatasetReplacement(db,admin,stage,
   'THAY '+op+' '+stage.preview.oldCount+' '+stage.preview.newCount);
 expect(retried.status).toBe('already-committed');
 const final=await witness();expect(stable(final)).toBe(stable(after));
 log('reconcile_immutable_operation_no_double_commit',after,final,retried);
});

it('lost HTTP ACK after real INITIAL activation keeps committed status, one generation and idempotent retry',async()=>{
  const op='ack_initial_real_0001';
  const start=await witness();
  const imported=await bootstrapApprovedRowsToPrimary(db,admin,[row('Legacy for ACK initial')]);
  expect(imported.importedCount).toBe(1);
  const control=await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
  expect(control.mode).toBe('FROZEN');
  const approval=await prepareInitialDatasetActivation(db,admin,[row('Approved initial despite lost ACK')],
    op,'initial-ack.xlsx');
  const before=await witness();
  const nativeFetch=globalThis.fetch;
  let lost=false;
  globalThis.fetch=(async(input:any,init?:any)=>{
    const response=await nativeFetch(input,init);
    if(!lost&&String(input).includes('/parentDatasetCommit')){
      lost=true;
      expect(response.status).toBe(200); // server ACK existed, caller won't get it
      const server=await response.clone().json();
      expect(server).toMatchObject({status:'committed',operationId:op});
      throw Error('PR142_ONLY_TEST_DISCARD_REAL_INITIAL_HTTP_RESPONSE_AFTER_SERVER_COMMIT');
    }
    return response;
  }) as typeof fetch;
  let unknown:any;
  try{unknown=await commitInitialDatasetActivation(db,admin,approval,
    'KHOI TAO V2 '+op+' '+approval.legacyRowCount+' '+approval.preview.newCount);}
  finally{globalThis.fetch=nativeFetch;}
  expect(lost).toBe(true);
  expect(unknown).toEqual({status:'unknown',operationId:op});
  const committed=await witness();
  expect(committed.datasetV2.active).toMatchObject({
    generationId:'gen_'+op,operationId:op,revision:1});
  expect(Object.keys(committed.datasetV2.generations)).toHaveLength(1);
  expect(Object.keys(committed.datasetV2.operations)).toHaveLength(1);
  expect((await resolveDatasetOperation(db,op)).status).toBe('committed-active');
  const replay=await commitInitialDatasetActivation(db,admin,approval,
    'KHOI TAO V2 '+op+' '+approval.legacyRowCount+' '+approval.preview.newCount);
  expect(replay.status).toBe('already-committed');
  const after=await witness();expect(stable(after)).toBe(stable(committed));
  log('http_ack_initial_committed_no_duplicate',before,after,{unknown,replay,lost,
    checkedIndependentServer:true});
});

it('lost HTTP ACK after real RESTORE still commits once and cannot overwrite later operation',async()=>{
  const first='ack_restore_seed_0001';
  await bootstrapApprovedRowsToPrimary(db,admin,[row('Legacy restore ACK')]);
  await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
  const initial=await prepareInitialDatasetActivation(db,admin,[row('Approved initial for restore')],
    first,'ack-restore-initial.xlsx');
  expect((await commitInitialDatasetActivation(db,admin,initial,
    'KHOI TAO V2 '+first+' '+initial.legacyRowCount+' '+initial.preview.newCount)).status).toBe('committed');
  const second='ack_restore_replace_0002';
  const staged=await stageDatasetReplacement(db,admin,[row('Approved second for restore')],
    second,'ack-restore-second.xlsx');
  expect((await commitDatasetReplacement(db,admin,staged,
    'THAY '+second+' '+staged.preview.oldCount+' '+staged.preview.newCount)).status).toBe('committed');
  const current=await witness();
  const previous=current.datasetV2.active;
  const restoreId='ack_restore_final_0003';
  const nativeFetch=globalThis.fetch;
  let dropped=false;
  globalThis.fetch=(async(input:any,init?:any)=>{
    const response=await nativeFetch(input,init);
    if(!dropped&&String(input).includes('/parentDatasetCommit')){
      dropped=true;expect(response.status).toBe(200);
      expect(await response.clone().json()).toMatchObject({status:'committed',operationId:restoreId});
      throw Error('PR142_ONLY_TEST_DISCARD_REAL_RESTORE_HTTP_RESPONSE_AFTER_SERVER_COMMIT');
    }
    return response;
  }) as typeof fetch;
  let unknown:any;
  try{unknown=await restoreDatasetBackup(db,admin,second,restoreId,previous,
    'KHOI PHUC '+restoreId);}
  finally{globalThis.fetch=nativeFetch;}
  expect(dropped).toBe(true);
  expect(unknown).toEqual({status:'unknown',operationId:restoreId});
  const committed=await witness();
  expect(committed.datasetV2.active).toMatchObject({
    generationId:'gen_'+restoreId,operationId:restoreId,revision:3});
  expect(committed.datasetV2.generations['gen_'+restoreId].items.r1.note)
    .toBe('Approved initial for restore');
  expect(Object.keys(committed.datasetV2.generations)).toHaveLength(3);
  expect(Object.keys(committed.datasetV2.operations)).toHaveLength(3);
  expect((await resolveDatasetOperation(db,restoreId)).status).toBe('committed-active');
  expect((await resolveDatasetOperation(db,second)).status).toBe('committed-historical');
  const replay=await restoreDatasetBackup(db,admin,second,restoreId,previous,
    'KHOI PHUC '+restoreId);
  expect(replay.status).toBe('already-committed');
  const final=await witness();expect(stable(final)).toBe(stable(committed));
  log('http_ack_restore_committed_no_duplicate',current,final,{unknown,replay,dropped,
    checkedIndependentServer:true});
});
