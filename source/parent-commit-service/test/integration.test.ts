/** Real Firebase Auth Emulator ID tokens -> HTTP endpoint -> Admin SDK scoped
 * Rules override -> FULL RTDB Rules. No authenticatedContext service claim.
 */
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential,
  signInAnonymously,getIdToken,type User} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,set,update,goOffline,goOnline,runTransaction,serverTimestamp} from 'firebase/database';
import {getDatabase as getAdminDatabase} from 'firebase-admin/database';
import {initializeApp as adminInitialize,deleteApp as adminDelete} from 'firebase-admin/app';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,parseBusinessExcel} from '../../src/data/business-excel';
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
 // Replaying ACTIVATE and REPLACE after an unrelated RESTORE must return
 // confirmed, idempotent status and MUST NOT resurrect old generations.
 const historicalActivate=await commitInitialDatasetActivation(db,admin,staged,
  'KHOI TAO V2 '+first+' '+staged.legacyRowCount+' '+staged.preview.newCount);
 const historicalReplace=await commitDatasetReplacement(db,admin,approval,
  'THAY '+second+' '+approval.preview.oldCount+' '+approval.preview.newCount);
 const afterHistoricalReplay=await witness();
 expect(historicalActivate.status).toBe('already-committed');
 expect(historicalReplace.status).toBe('already-committed');
 expect(stable(afterHistoricalReplay)).toBe(stable(after3));
 log('app_adapter_historical_replay_no_resurrection',after3,afterHistoricalReplay,
  {historicalActivate,historicalReplace});
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


it('FRCR-01: real admin A rights immutable after HTTP parent A-to-B, valid restore still commits',async()=>{
 const aOp='frcr_real_activate_0001',bOp='frcr_real_replace_0002',restoreOp='frcr_real_restore_0003';
 await bootstrapApprovedRowsToPrimary(db,admin,[row('FRCR legacy')]);
 await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
 const initial=await prepareInitialDatasetActivation(db,admin,[row('FRCR approved A')],aOp,'frcr-a.xlsx');
 expect((await commitInitialDatasetActivation(db,admin,initial,
   'KHOI TAO V2 '+aOp+' '+initial.legacyRowCount+' '+initial.preview.newCount)).status).toBe('committed');
 const A='gen_'+aOp,B='gen_'+bOp,oldPath=ROOT+'/permissions/'+A,newPath=ROOT+'/permissions/'+B;
 const rights={columns:{note:true,content:true},rows:{r1:{note:true}},
   cells:{r1:{note:true,content:true}}};
 await set(ref(db,oldPath),rights);
 // Active: verified Google administrator can grant AND revoke each permission scope.
 for(const path of ['columns/note','rows/r1/note','cells/r1/note']){
   await set(ref(db,oldPath+'/'+path),false);
   await set(ref(db,oldPath+'/'+path),true);
 }
 const stage=await stageDatasetReplacement(db,admin,[row('FRCR approved B')],bOp,'frcr-b.xlsx');
 // A queued SDK request is issued before the pointer switch but reaches RTDB
 // afterwards. The server decision must use CURRENT root/active, not client time.
 const queue=await sdk('frcr-admin-inflight');
 await google(queue,'real-google-admin-test');
 await get(ref(queue.database,oldPath+'/columns/note'));
 goOffline(queue.database);
 const delayed=set(ref(queue.database,oldPath+'/columns/note'),false);
 expect((await commitDatasetReplacement(db,admin,stage,
   'THAY '+bOp+' '+stage.preview.oldCount+' '+stage.preview.newCount)).status).toBe('committed');
 const postSwitch=await witness();
 expect(postSwitch.datasetV2.active.generationId).toBe(B);
 expect(postSwitch.datasetV2.permissions[A]).toEqual(rights);
 expect(postSwitch.datasetV2.operations[bOp].status).toBe('COMMITTED');
 expect(JSON.parse(JSON.parse(postSwitch.datasetV2.backups[bOp]).permissionsJson)).toEqual(rights);
 goOnline(queue.database);
 await assertFails(delayed);
 const afterQueue=await witness();
 expect(stable(afterQueue)).toBe(stable(postSwitch));
 log('FRCR01_ACTIVE_SWITCH_DENIES_INFLIGHT_OLD_RIGHTS',postSwitch,afterQueue,
   {status:'PERMISSION_DENIED',actor:'real verified Google admin'});
 const guest=await sdk('frcr-anon');await signInAnonymously(guest.auth);
 const outsider=await sdk('frcr-other');await google(outsider,'frcr-other-uid','other@example.invalid');
 const before=await witness();
 // All historic paths: column, row, cell, ancestor deletion, multi-location update.
 for(const path of ['columns/note','rows/r1/note','cells/r1/note']){
   await assertFails(set(ref(db,oldPath+'/'+path),false));
 }
 await assertFails(set(ref(db,oldPath+'/columns'),{note:false}));
 await assertFails(set(ref(db,oldPath+'/rows'),{r1:{note:false}}));
 await assertFails(set(ref(db,oldPath+'/cells'),{r1:{note:false}}));
 await assertFails(set(ref(db,oldPath),null));
 await assertFails(update(ref(db,ROOT+'/permissions'),{
   [A+'/columns/note']:false,[B+'/columns/note']:true
 }));
 await assertFails(set(ref(guest.database,oldPath+'/columns/note'),false));
 await assertFails(set(ref(outsider.database,oldPath+'/columns/note'),false));
 const after=await witness();
 expect(stable(after)).toBe(stable(before));
 log('FRCR01_HISTORICAL_COLUMNS_ROWS_CELLS_DELETE_MULTIPATH_DENIED',
   before,after,{status:'PERMISSION_DENIED',serverChanged:false});
 // B remains administered by its verified owner; unprivileged principals cannot.
 await assertFails(set(ref(guest.database,newPath+'/columns/note'),true));
 await assertFails(set(ref(outsider.database,newPath+'/columns/note'),true));
 for(const path of ['columns/note','rows/r1/note','cells/r1/note']){
   await set(ref(db,newPath+'/'+path),true);
   await set(ref(db,newPath+'/'+path),false);
 }
 await set(ref(db,newPath+'/cells/r1/note'),null);
 const beforeRestore=await witness();
 expect(beforeRestore.datasetV2.permissions[A]).toEqual(rights);
 const restored=await restoreDatasetBackup(db,admin,bOp,restoreOp,beforeRestore.datasetV2.active,
   'KHOI PHUC '+restoreOp);
 expect(restored.status).toBe('committed');
 const done=await witness();
 expect(done.datasetV2.active.generationId).toBe('gen_'+restoreOp);
 expect(done.datasetV2.generations['gen_'+restoreOp].items.r1.note).toBe('FRCR approved A');
 expect(done.datasetV2.permissions[A]).toEqual(rights);
 expect(done.datasetV2.operations[restoreOp].status).toBe('COMMITTED');
 expect(done.datasetV2.leases?.['gen_'+restoreOp]).toBeUndefined();
 log('FRCR01_APPROVED_RESTORE_SUCCEEDS_AFTER_DENIAL',beforeRestore,done,
   {status:restored.status,provenance:'historically COMMITTED replacement'});
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


/** Reviewer-only appendix; appended to real Auth -> real Callable/onRequest
 * -> FULL Rules regression harness copied from the immutable target SHA.
 * No production calls, and no fixture bypass after the initial synthetic data setup.
 */
import {CellEditSessionManager} from '../../src/data/cell-edit-leases';
import {FirebaseRepository} from '../../src/data/firebase-repository';
import {updateDraft} from '../../src/domain/items';
import {execFileSync} from 'node:child_process';

const FRV_SHA=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();

async function frvRuleCoverageSnapshot(){
 const response=await fetch('http://127.0.0.1:9000/.inspect/coverage.json?ns=demo-hdnd');
 if(!response.ok)throw Error('FRV02_RULES_COVERAGE_READ_'+response.status);
 const raw=await response.json(),doc=typeof raw==='string'?JSON.parse(raw):raw;
 const answer:Record<string,Record<string,number>>={};
 const collect=(o:any,path:string)=>{
  if(!o||typeof o!=='object')return;
  for(const [key,value] of Object.entries(o)){
   if(key==='.validate'||key==='.write'){
    const result:Record<string,number>={};
    for(const v of ((value as any)?.values??[])){
     const k=typeof v.value==='string'?v.value:String(v.value);
     result[k]=(result[k]??0)+(v.count??0);
    }
    answer[path+'/'+key]=result;
   }else if(!['values','children','text','location-start','location-end'].includes(key))
    collect(value,path+'/'+key);
  }
 };
 collect(doc?.report?.hdnd?.datasetV2,'/hdnd/datasetV2');
 return answer;
}

const FRV_RULES='source/firebase/database.exclusive-candidate.rules.json';
async function frvDenied(label:string,req:()=>Promise<unknown>){
 const before=await witness();let result='ACCEPTED',reason='';
 try {await req();}catch(error:any){result='DENIED';reason=String(error?.code??error?.message??error);}
 const after=await witness();
 const unchanged=stable(before)===stable(after);
 const details={candidateSha:FRV_SHA,request:label,result,reason,
   beforeSha256:sha(stable(before)),afterSha256:sha(stable(after)),serverUnchanged:unchanged};
 console.log('FINAL_RELEASE_VERIFICATION_REQUEST '+JSON.stringify(details));
 log('FRV_'+label,before,after,details,'real signed-in Firebase Auth client SDK + FULL RTDB Rules');
 expect(result,JSON.stringify(details)).toBe('DENIED');
 expect(reason,JSON.stringify(details)).toMatch(/permission.denied|permission denied/i);
 expect(unchanged,JSON.stringify(details)).toBe(true);
 return details;
}
async function frvStageInitial(op:string,note:string){
 const imported=await bootstrapApprovedRowsToPrimary(db,admin,[row('FRV LEGACY')]);
 expect(imported.importedCount).toBe(1);
 const closed=await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
 expect(closed.mode).toBe('FROZEN');
 const approval=await prepareInitialDatasetActivation(db,admin,[row(note)],op,'frv-initial.xlsx');
 const result=await commitInitialDatasetActivation(db,admin,approval,
  'KHOI TAO V2 '+op+' '+approval.legacyRowCount+' '+approval.preview.newCount);
 expect(result.status).toBe('committed');
 const open=await setFreezeMode(db,admin,closed,'OPEN');
 expect(open.mode).toBe('OPEN');
 return await witness();
}
async function frvGuestNoteEdit(dbClient:any,user:User,expected:any,text:string){
 const gen=expected.generationId;const manager=new CellEditSessionManager(dbClient,()=>user,gen);
 try{
   const repo=new FirebaseRepository(dbClient,()=>user,
     ()=>({columns:{note:true}}),ROOT+'/generations/'+gen+'/items',expected);
   repo.leaseManager=manager;
   const original=(await repo.list())[0];
   const acquired=await manager.acquire(original.recordId,'note','multiline');
   expect(acquired).toBe(true);
   const save=(await repo.save([updateDraft(original,undefined,{note:text})!]))[0];
   expect(save.ok,save.message).toBe(true);
   await manager.finish(original.recordId,'note');
 }finally{await manager.dispose();}
 const state=await witness();
 expect(state.datasetV2.generations[gen].items.r1.note).toBe(text);
 return state;
}
it('FINAL-RELEASE-VERIFICATION FRCR-01 live A rights, A→B, historical paths denied, valid restore and B/C rights',async()=>{
 expect(FRV_SHA).toMatch(/^[0-9a-f]{40}$/);
 const first='frv_initial_admin_0001',second='frv_replace_admin_0002',restore='frv_restore_admin_0003';
 const stateA=await frvStageInitial(first,'FRV ORIGINAL A');
 const genA='gen_'+first;
 const aGrant=ROOT+'/permissions/'+genA+'/columns/note';
 // Positive: the currently active generation must still accept verified admin ACL edits.
 await set(ref(db,aGrant),true);
 const currentA=await witness();
 expect(currentA.datasetV2.permissions[genA].columns.note).toBe(true);
 const editor=await sdk('frv-guest-a');
 const guest=(await signInAnonymously(editor.auth)).user;
 const afterAEdit=await frvGuestNoteEdit(editor.database,guest,currentA.datasetV2.active,'FRV VALID A GUEST EDIT');
 const oldLease=afterAEdit.datasetV2.leases[genA]?.r1?.note;
 expect(oldLease).toBeTruthy();
 const approval=await stageDatasetReplacement(db,admin,[row('FRV ORIGINAL B')],second,'frv-replace.xlsx');
 const backupA=JSON.parse((await witness()).datasetV2.backups[second]);
 expect(JSON.parse(backupA.permissionsJson).columns.note).toBe(true);
 const beforeSwitch=await witness();
 const switched=await commitDatasetReplacement(db,admin,approval,
  'THAY '+second+' '+approval.preview.oldCount+' '+approval.preview.newCount);
 expect(switched.status).toBe('committed');
 const afterSwitch=await witness(),genB='gen_'+second;
 expect(afterSwitch.datasetV2.active.generationId).toBe(genB);
 expect(afterSwitch.datasetV2.operations[second]?.status).toBe('COMMITTED');
 expect(afterSwitch.datasetV2.generations[genA]).toEqual(beforeSwitch.datasetV2.generations[genA]);
 expect(afterSwitch.datasetV2.leases?.[genA]).toEqual(beforeSwitch.datasetV2.leases?.[genA]);
 expect(afterSwitch.datasetV2.backups[second]).toBe(beforeSwitch.datasetV2.backups[second]);
 log('FRV_REAL_PARENT_SWITCH_A_TO_B',beforeSwitch,afterSwitch,switched,'real authenticated HTTP parent CAS');
 // The real legacy FRCR-01 exploit and all related alternate administrator paths.
 const oldRoot=ROOT+'/permissions/'+genA;
 await frvDenied('HISTORICAL_PERMISSION_LEAF_SET',()=>set(ref(db,aGrant),false));
 await frvDenied('HISTORICAL_PERMISSION_LEAF_DELETE',()=>set(ref(db,aGrant),null));
 await frvDenied('HISTORICAL_PERMISSION_GEN_REPLACE',()=>set(ref(db,oldRoot),{columns:{note:false}}));
 await frvDenied('HISTORICAL_PERMISSION_GEN_DELETE',()=>set(ref(db,oldRoot),null));
 await frvDenied('HISTORICAL_PERMISSION_ROW_INSERT',()=>set(ref(db,oldRoot+'/rows/r1'),true));
 await frvDenied('HISTORICAL_PERMISSION_CELL_INSERT',()=>set(ref(db,oldRoot+'/cells/r1/note'),false));
 await frvDenied('HISTORICAL_PERMISSION_MULTI_UPDATE',()=>update(ref(db,ROOT+'/permissions'),{
    [genA+'/columns/note']:false
 }));
 await frvDenied('HISTORICAL_PERMISSION_ROOT_UPDATE',()=>update(ref(db,ROOT),{
    ['permissions/'+genA+'/columns/note']:false
 }));
 // Contrasts: unrelated historic data and ledger must not be mutable by raw admin SDK.
 await frvDenied('HISTORICAL_ROW_DIRECT_SET',()=>set(ref(db,ROOT+'/generations/'+genA+'/items/r1/note'),'FORGED'));
 await frvDenied('HISTORICAL_LEASE_DIRECT_DELETE',()=>set(ref(db,ROOT+'/leases/'+genA+'/r1/note'),null));
 await frvDenied('COMMITTED_BACKUP_REWRITE',()=>set(ref(db,ROOT+'/backups/'+second),'{"unapproved":true}'));
 await frvDenied('COMMITTED_BACKUP_DELETE',()=>set(ref(db,ROOT+'/backups/'+second),null));
 await frvDenied('COMMITTED_JOURNAL_REWRITE',()=>set(ref(db,ROOT+'/operations/'+second+'/status'),'NOT_COMMITTED'));
 await frvDenied('COMMITTED_JOURNAL_DELETE',()=>set(ref(db,ROOT+'/operations/'+second),null));
 await frvDenied('COMMITTED_CANDIDATE_REWRITE',()=>set(ref(db,ROOT+'/candidates/'+second),'{"unapproved":true}'));
 // Positive B: new generation is active, its grant can be written normally;
 // an authenticated guest can use the actual cell callable, unlike a direct raw write.
 const bGrant=ROOT+'/permissions/'+genB+'/columns/note';
 await set(ref(db,bGrant),true);
 const bGrantState=await witness();
 expect(bGrantState.datasetV2.permissions[genB].columns.note).toBe(true);
 const afterBEdit=await frvGuestNoteEdit(editor.database,guest,bGrantState.datasetV2.active,'FRV VALID B GUEST EDIT');
 expect(afterBEdit.datasetV2.generations[genB].items.r1.note).toBe('FRV VALID B GUEST EDIT');
 // Restore the sealed A; actor/provenance/digest must be recalculated, NOT copied
 // from unapproved client payload or blindly inherited pointer digest.
 const restoreApproval=afterBEdit.datasetV2.active;
 const beforeRestore=await witness();

 // Diagnostic key-only schema check: never write or alter A, backups, or
 // expected values. We log only property names, never user content/tokens.
 const historic=beforeRestore.datasetV2.generations[genA].items.r1;
 const rulesSchema=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'))
   .rules.hdnd.datasetV2.generations.$generation.items.$id;
 const unknownPaths:string[]=[];
 const inspectKeys=(obj:any,schema:any,path:string)=>{
   if(!obj||typeof obj!=='object'||!schema)return;
   for(const [name,val] of Object.entries(obj)){
     const node=schema[name]??schema.$slot??schema.$field??schema.$id??schema.$other;
     if(!node||node['.validate']===false)
       unknownPaths.push(path+'/'+name+' [MISSING_OR_LITERAL_DENY]');
     else inspectKeys(val,node,path+'/'+name);
   }
 };
 inspectKeys(historic,rulesSchema,'/hdnd/datasetV2/generations/'+genA+'/items/r1');
 console.log('FRV02_AUDIT_SOURCE_FIELD_KEYS_ONLY',JSON.stringify({
  root:Object.keys(historic),histSlots:Object.keys(historic.history??{}),
  histEntryKeys:Object.fromEntries(Object.entries(historic.history??{})
    .map(([slot,v]:any)=>[slot,Object.keys(v??{})])),
  histChangeKeys:Object.fromEntries(Object.entries(historic.history??{})
    .map(([slot,v]:any)=>[slot,Object.keys(v?.changes??{})])),
  histOldValueKeys:Object.fromEntries(Object.entries(historic.history??{})
    .map(([slot,v]:any)=>[slot,Object.keys(v?.oldValues??{})])),
  editProofFields:Object.keys(historic.editProofs??{}),
  unknownSchemaPaths:unknownPaths
 }));

 const coverageBefore=await frvRuleCoverageSnapshot();
 let restored:any=null,restoreError='';
 try{restored=await restoreDatasetBackup(db,admin,second,restore,restoreApproval,'KHOI PHUC '+restore);}
 catch(error:any){restoreError=String(error?.message??error);}
 const afterRestore=await witness(),genC='gen_'+restore;
 if(restoreError){
  const coverageAfter=await frvRuleCoverageSnapshot(),diffs:any[]=[];
  for(const path of new Set([...Object.keys(coverageBefore),...Object.keys(coverageAfter)])){
   const a=coverageBefore[path]??{},b=coverageAfter[path]??{};
   for(const v of new Set([...Object.keys(a),...Object.keys(b)])){
    const increase=(b[v]??0)-(a[v]??0);
    if(increase!==0)diffs.push({path,value:v,delta:increase});
   }
  }
  console.log('FRV02_RULES_COVERAGE_EXACT_RESTORE_DELTA',
   JSON.stringify({n:diffs.length,changed:diffs.slice(0,60)}).slice(0,10500));
  const summary={candidateSha:FRV_SHA,request:'RESTORE historically committed source A after real valid guest cell edit A',
    sourceGeneration:genA,sourceRevision:beforeRestore.datasetV2.generations[genA].items.r1.revision,
    sourceHistorySlots:Object.keys(beforeRestore.datasetV2.generations[genA].items.r1.history??{}),
    generationB:genB,sourceReplacementJournal:beforeRestore.datasetV2.operations[second]?.status,
    priorBackupUnchanged:afterRestore.datasetV2.backups[second]===beforeRestore.datasetV2.backups[second],
    rowsUnchanged:stable(beforeRestore.datasetV2.generations)===stable(afterRestore.datasetV2.generations),
    permissionsUnchanged:stable(beforeRestore.datasetV2.permissions)===stable(afterRestore.datasetV2.permissions),
    leasesUnchanged:stable(beforeRestore.datasetV2.leases)===stable(afterRestore.datasetV2.leases),
    activeUnchanged:stable(beforeRestore.datasetV2.active)===stable(afterRestore.datasetV2.active),
    error:restoreError,serverBeforeSha256:sha(stable(beforeRestore)),serverAfterSha256:sha(stable(afterRestore))};
  console.log('FRV_EDITED_HISTORICAL_A_RESTORE_WITNESS '+JSON.stringify(summary));
  log('FRV_EDITED_HISTORICAL_A_RESTORE_DENIED',beforeRestore,afterRestore,summary,
    'verified admin real Auth -> actual parent onRequest -> Rules scoped ancestor CAS');

  // Surgical audit-validator isolation evidence: CI #41390728120 (synthetic-only).
  // Rules Emulator's built-in rule coverage provides exact evaluated
  // expressions, never a guessed permissive fix or fixture bypass.
  try{
   const resp=await fetch('http://127.0.0.1:9000/.inspect/coverage.json?ns=demo-hdnd');
   const coverage=await resp.json();
   // Each coverage event contains a rule AST. Keep only structured,
   // path-scoped hints: never log the gigantic full report to CI stdout.
   const decoded=typeof coverage==='string'?JSON.parse(coverage):coverage;
   const points:any[]=[];
   const visit=(obj:any,path:string)=>{
     if(!obj||typeof obj!=='object')return;
     for(const [key,value] of Object.entries(obj)){
       if(key==='.validate'||key==='.write'){
         const v:any=value;
         points.push({path:path+'/'+key,expression:v?.text?.slice(0,100),
           results:(v?.values??[]).filter((x:any)=>typeof x.value==='boolean')
             .map((x:any)=>({value:x.value,count:x.count}))});
       }else if(!['values','children','text','location-start','location-end'].includes(key))
         visit(value,path+'/'+key);
     }
   };
   visit(decoded.report?.hdnd?.datasetV2,'/hdnd/datasetV2');
   const failing=points.filter((x:any)=>x.results.some((y:any)=>y.value===false));
   console.log('FRV02_RULES_COVERAGE_PATHS',JSON.stringify({
     httpStatus:resp.status,all:points.length,falseCount:failing.length,
     suspect:failing.filter((x:any)=>/generations|permissions|leases|active|operations/.test(x.path))
       .slice(0,50)
   }).slice(0,9500));
  }catch(error){console.log('FRV02_RULES_COVERAGE_UNAVAILABLE',String(error));}
 }
 expect(restoreError,'Valid COMMITTED backup of legally edited A must restore; '+restoreError).toBe('');
 expect(restored.status).toBe('committed');
 expect(afterRestore.datasetV2.active.generationId).toBe(genC);
 expect(afterRestore.datasetV2.operations[restore]).toMatchObject({
  status:'COMMITTED',from:genB,to:genC});
 expect(afterRestore.datasetV2.permissions[genC]?.columns?.note).toBe(true);
 expect(afterRestore.datasetV2.permissions[genA]?.columns?.note).toBe(true);
 expect(afterRestore.datasetV2.permissions[genB]?.columns?.note).toBe(true);
 expect(afterRestore.datasetV2.leases?.[genC]).toBeUndefined();
 const sourceRow=beforeRestore.datasetV2.generations[genA].items.r1;
 const restoredRow=afterRestore.datasetV2.generations[genC].items.r1;
 expect(sourceRow.revision).toBe(2);
 expect(Object.keys(sourceRow.history??{})).toContain('2');
 expect(restoredRow.revision).toBe(sourceRow.revision);
 expect(restoredRow.history).toEqual(sourceRow.history);
 expect(restoredRow.editProofs).toBeUndefined(); // never migrate A's session tokens into C
 expect(restoredRow.note).toBe(sourceRow.note);
 expect(restoredRow.operationId).toBe(restore);
 expect(restoredRow.updatedBy).toBe(admin.uid);
 expect(restoredRow.updatedAt).toBeGreaterThan(0);
 // Independently recompute the actual post-commit C canonical digest,
 // rather than comparing it with A's raw immutable backup checksum.
 const cCanonical=(items:any)=>Object.fromEntries(Object.entries(items).map(([id,r]:any)=>{
  const {editProofs:_proof,operationId:_operation,updatedAt:_at,updatedBy:_by,...businessAndHistory}=r;
  return [id,businessAndHistory];
 }));
 const cHash=sha(stable(cCanonical(afterRestore.datasetV2.generations[genC].items)));
 const aCanonicalHash=sha(stable(cCanonical(beforeRestore.datasetV2.generations[genA].items)));
 const rawSourceHash=sha(stable(beforeRestore.datasetV2.generations[genA].items));
 expect(afterRestore.datasetV2.active.digest).toBe(cHash);
 expect(cHash).toBe(aCanonicalHash);
 expect(cHash).not.toBe(rawSourceHash);
 expect(backupA.baseline).toBe(stable({
  active:backupA.previous,items:beforeRestore.datasetV2.generations[genA].items,
  permissions:beforeRestore.datasetV2.permissions[genA],
  leases:beforeRestore.datasetV2.leases[genA]
 }));
 console.log('FRV02_C_CANONICAL_DIGEST_VERIFIED',JSON.stringify({
  candidateSha:FRV_SHA,rawSourceSha256:rawSourceHash,canonicalDestinationSha256:cHash,
  pointerDigest:afterRestore.datasetV2.active.digest,backupBaselineSha256:sha(backupA.baseline)}));

 expect(afterRestore.datasetV2.backups[second]).toBe(beforeRestore.datasetV2.backups[second]);
 expect(afterRestore.datasetV2.generations[genA]).toEqual(beforeRestore.datasetV2.generations[genA]);
 expect(afterRestore.datasetV2.generations[genB]).toEqual(beforeRestore.datasetV2.generations[genB]);
 expect(afterRestore.datasetV2.operations[second]).toEqual(beforeRestore.datasetV2.operations[second]);
 expect(afterRestore.datasetV2.permissions[genA]).toEqual(beforeRestore.datasetV2.permissions[genA]);
 expect(afterRestore.datasetV2.permissions[genB]).toEqual(beforeRestore.datasetV2.permissions[genB]);
 expect(afterRestore.datasetV2.leases?.[genA]).toEqual(beforeRestore.datasetV2.leases?.[genA]);
 expect(afterRestore.datasetV2.leases?.[genB]).toEqual(beforeRestore.datasetV2.leases?.[genB]);
 expect(afterRestore.datasetV2.active.digest).toMatch(/^[a-f0-9]{64}$/);
 expect(afterRestore.datasetV2.active.digest).not.toBe(beforeRestore.datasetV2.active.digest);
 log('FRV_RESTORE_ORIGINAL_COMMITTED_BACKUP',beforeRestore,afterRestore,restored,'real authenticated HTTP parent CAS');
 const afterCEdit=await frvGuestNoteEdit(editor.database,guest,afterRestore.datasetV2.active,'FRV VALID C GUEST EDIT');
 expect(afterCEdit.datasetV2.generations[genC].items.r1.note).toBe('FRV VALID C GUEST EDIT');
 const afterC=afterCEdit.datasetV2.generations[genC].items.r1;
 expect(afterC.revision).toBe(3);
 expect(afterC.history['2']).toEqual(sourceRow.history['2']);
 expect(afterC.history['3'].changes.note).toBe('FRV VALID C GUEST EDIT');
 expect(afterC.history['3'].oldValues.note).toBe('FRV VALID A GUEST EDIT');
 expect(afterC.history['3'].actor).toBe(guest.uid);
 expect(afterC.editProofs?.note).toMatch(/^[A-Za-z0-9_-]{20,100}$/);
 expect(afterC.editProofs.note).not.toBe(sourceRow.editProofs.note);
 expect(afterCEdit.datasetV2.generations[genA]).toEqual(beforeRestore.datasetV2.generations[genA]);

 // Negative controls: no raw client or scoped parent service may tamper with
 // archived audit on a generation that ALREADY exists.
 await frvDenied('RESTORED_C_HISTORY_ACTOR_TAMPER_DENIED',()=>set(ref(db,
  ROOT+'/generations/'+genC+'/items/r1/history/2/actor'),'forged-actor'));
 await frvDenied('RESTORED_C_HISTORY_MULTIPATH_TAMPER_DENIED',()=>update(ref(db,ROOT),{
  ['generations/'+genC+'/items/r1/history/2/oldValues/note']:'FORGED VALUE'
 }));
 const scoped=adminInitialize({projectId:PROJECT,databaseURL:'https://'+PROJECT+'.firebaseio.com',
  databaseAuthVariableOverride:{uid:admin.uid,token:{email:ADMIN_EMAIL,email_verified:true,
   firebase:{sign_in_provider:'google.com'},parentCasService:true}}
 },'frv02-existing-c-audit-denial-'+randomUUID());
 const beforeScoped=await witness();
 try{await expect(getAdminDatabase(scoped).ref(ROOT+'/generations/'+genC+
  '/items/r1/history/2/actor').set('bad-parent-audit')).rejects.toThrow();}
 finally{await adminDelete(scoped);}
 const afterScoped=await witness();
 expect(sha(stable(afterScoped))).toBe(sha(stable(beforeScoped)));
 log('FRV02_EXISTING_C_PARENT_SERVICE_AUDIT_DENIED',beforeScoped,afterScoped,
  {state:'DENIED',beforeSha256:sha(stable(beforeScoped)),afterSha256:sha(stable(afterScoped))});
 await frvDenied('HISTORICAL_B_PERMISSION_AFTER_RESTORE',()=>set(ref(db,bGrant),false));
 console.log('FINAL_RELEASE_VERIFICATION_COMPLETE '+JSON.stringify({
  candidateSha:FRV_SHA,frcr01:'FIX_VERIFIED',oldGeneration:genA,replacedGeneration:genB,restoredGeneration:genC,
  restoredRights:afterRestore.datasetV2.permissions[genC],
  sourceOperation:afterRestore.datasetV2.operations[second],
  activeAfterRestore:afterCEdit.datasetV2.active,
  sourceBackupUnchanged:true}));
},120000);


it('FINAL-RELEASE-VERIFICATION CONTROL active B edited but source A has no history restores normally',async()=>{
 const A='frv_control_initial_0001',B='frv_control_replace_0002',C='frv_control_restore_0003';
 await frvStageInitial(A,'FRV CONTROL A NO EDIT');
 await set(ref(db,ROOT+'/permissions/gen_'+A+'/columns/note'),true);
 const staged=await stageDatasetReplacement(db,admin,[row('FRV CONTROL B')],B,'control.xlsx');
 expect((await commitDatasetReplacement(db,admin,staged,
   'THAY '+B+' '+staged.preview.oldCount+' '+staged.preview.newCount)).status).toBe('committed');
 await set(ref(db,ROOT+'/permissions/gen_'+B+'/columns/note'),true);
 const userSdk=await sdk('frv-control-guest'),user=(await signInAnonymously(userSdk.auth)).user;
 const previous=(await witness()).datasetV2.active;
 await frvGuestNoteEdit(userSdk.database,user,previous,'FRV VALID EDIT B ONLY');
 const before=await witness();
 expect(before.datasetV2.generations['gen_'+A].items.r1.history).toBeFalsy();
 expect(Object.keys(before.datasetV2.generations['gen_'+B].items.r1.history??{}).length).toBeGreaterThan(0);
 const resp=await restoreDatasetBackup(db,admin,B,C,before.datasetV2.active,'KHOI PHUC '+C);
 const after=await witness();
 log('FRV_POSITIVE_CONTROL_EDITED_B_UNEDITED_A_RESTORE',before,after,resp,
   'real verified Admin + actual parent Functions with A history absent, B valid guest history present');
 expect(resp.status).toBe('committed');
 expect(after.datasetV2.active.generationId).toBe('gen_'+C);
 expect(after.datasetV2.permissions['gen_'+C]?.columns?.note).toBe(true);
 expect(after.datasetV2.leases?.['gen_'+C]).toBeUndefined();
 await frvGuestNoteEdit(userSdk.database,user,after.datasetV2.active,'FRV VALID CONTROL C GUEST EDIT');
 console.log('FRV_RESTORE_B_ONLY_EDIT_CONTRAST_PASS '+JSON.stringify({
  sourceSha:FRV_SHA,changedLiveBeforeRestore:'B',restoredSource:'A unedited',
  priorHistoryB:Object.keys(before.datasetV2.generations['gen_'+B].items.r1.history??{}),
  approvedHistoricalSource:true,
  restoreStatus:resp.status,
  beforeSha256:sha(stable(before)),afterSha256:sha(stable(after))}));
},120000);

it('FINAL-RELEASE-VERIFICATION FRCR-01 queued permissions write races real parent pointer switch',async()=>{
 expect(FRV_SHA).toMatch(/^[0-9a-f]{40}$/);
 const first='frv_race_initial_0001',second='frv_race_replace_0002';
 await frvStageInitial(first,'FRV RACE A');
 const genA='gen_'+first,path=ROOT+'/permissions/'+genA+'/columns/note';
 await set(ref(db,path),true);
 const staged=await stageDatasetReplacement(db,admin,[row('FRV RACE B')],second,'frv-race.xlsx');
 const race=await sdk('frv-race-admin');
 const raceAdmin=await google(race,'real-google-admin-test');
 expect(raceAdmin.email).toBe(ADMIN_EMAIL);
 await get(ref(race.database,ROOT+'/active')); // connected, valid credential before going offline
 const initial=await witness();
 expect(initial.datasetV2.active.generationId).toBe(genA);
 goOffline(race.database);
 const pending=set(ref(race.database,path),false);
 // Firebase SDK queues the write locally. It cannot have reached the server.
 const queued=await witness();expect(stable(queued)).toBe(stable(initial));
 const replaced=await commitDatasetReplacement(db,admin,staged,
  'THAY '+second+' '+staged.preview.oldCount+' '+staged.preview.newCount);
 expect(replaced.status).toBe('committed');
 const afterCommit=await witness();
 expect(afterCommit.datasetV2.active.generationId).toBe('gen_'+second);
 expect(afterCommit.datasetV2.permissions[genA].columns.note).toBe(true);
 const afterServerCommitHash=sha(stable(afterCommit));
 goOnline(race.database);
 const outcome=await Promise.race([
  pending.then(()=>({state:'ACCEPTED',error:''})).catch((e:any)=>({
    state:'DENIED',error:String(e?.code??e?.message??e)})),
  new Promise<{state:string,error:string}>(resolve=>setTimeout(
    ()=>resolve({state:'TIMEOUT',error:'queued SDK request never resolved'}),10000))
 ]);
 const afterFlush=await witness();
 const details={candidateSha:FRV_SHA,request:'queued verified-admin permission change A before real A→B',
  order:'client offline queue → real authenticated parent CAS B commit → client reconnect + Rules server decision',
  pointerBefore:initial.datasetV2.active.generationId,
  pointerAfter:afterCommit.datasetV2.active.generationId,
  queuedBeforeServerWrite:sha(stable(initial))===sha(stable(queued)),
  outcome,serverAfterCommitSha256:afterServerCommitHash,
  serverAfterQueuedWriteSha256:sha(stable(afterFlush)),
  afterA:afterFlush.datasetV2.permissions[genA]?.columns?.note,
  noMutation:stable(afterCommit)===stable(afterFlush)};
 console.log('FINAL_RELEASE_VERIFICATION_POINTER_RACE '+JSON.stringify(details));
 log('FRV_QUEUED_PERMISSION_POINTER_SWITCH_COMMIT_RACE',afterCommit,afterFlush,details,
   'real verified Google Auth SDK queued offline; server Rules evaluate after actual parent HTTP CAS');
 expect(outcome.state,JSON.stringify(details)).toBe('DENIED');
 expect(outcome.error).toMatch(/permission.denied|permission denied/i);
 expect(details.noMutation).toBe(true);
 expect(details.afterA).toBe(true);
 const backed=JSON.parse(afterFlush.datasetV2.backups[second]);
 expect(JSON.parse(backed.permissionsJson).columns.note).toBe(true);
 const restore='frv_race_restore_0003',prior=await witness();
 const result=await restoreDatasetBackup(db,admin,second,restore,prior.datasetV2.active,'KHOI PHUC '+restore);
 const final=await witness();
 expect(result.status).toBe('committed');
 expect(final.datasetV2.active.generationId).toBe('gen_'+restore);
 log('FRV_RESTORE_AFTER_RACE_DENIAL',prior,final,result,'real authenticated parent CAS');
},120000);



it('FRV-02 OPERATOR: production-grade CLI performs actual verified Google empty-only CAS and refuses second import',async()=>{
  const folder=mkdtempSync(join(tmpdir(),'pr147-operator-fixture-'));
  try{
    const excel=join(folder,'approved.xlsx'),approval=join(folder,'approved.json');
    const output=join(folder,'private-result.json'),sheet='Approved';
    const headers=[...BUSINESS_HEADERS];
    const data=['NQ-OPS-0001',1,'MẪU hồ sơ operator đã duyệt','Sở mẫu A',
      'QPPL','BCH','Sở chưa trình','Sở chưa trình','Sở chưa trình',
      'Chuyên viên mẫu','Phòng mẫu','Lãnh đạo VP mẫu','Lãnh đạo UBND mẫu',
      'MẪU đang xử lý','Ghi chú mẫu'];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([headers,data]),sheet);
    const bytes=Buffer.from(XLSX.write(wb,{bookType:'xlsx',type:'buffer'}));
    writeFileSync(excel,bytes);
    const rows=parseBusinessExcel(bytes,sheet);
    expect(rows.count).toBe(1);
    const hash=createHash('sha256').update(bytes).digest('hex'),sourceSha=FRV_SHA;
    const prior=await witness();
    expect(prior).toBeNull();
    const record={schema:'PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1',
      project:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com/',
      sourceSha,workbookSha256:hash,sheet,expectedRows:rows.count,
      expectedState:'EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT',
      fullRootSnapshotSha256:sha(stable(prior)),
      fullRootSnapshotReadAt:new Date().toISOString(),
      operatorEmail:ADMIN_EMAIL,approved:true};
    writeFileSync(approval,JSON.stringify(record));
    const args=['scripts/operator-first-import.mjs','--mode','emulator',
      '--project','demo-hdnd','--database-url','https://demo-hdnd.firebaseio.com',
      '--api-key','demo-key','--auth-domain','demo-hdnd.firebaseapp.com',
      '--app-id','demo-operator','--xlsx',excel,'--sheet',sheet,
      '--approval-file',approval,'--source-sha',sourceSha,
      '--confirm','IMPORT_ONCE_demo-hdnd_'+hash.slice(0,12),'--output',output];
    const input=JSON.stringify({sub:'pr147-operator-admin',email:ADMIN_EMAIL,
      email_verified:true,name:'Synthetic authenticated operator'});
    const opts={cwd:process.cwd(),input,encoding:'utf8' as const,timeout:45000,
      env:{...process.env,GCLOUD_PROJECT:'demo-hdnd'}};
    const first=spawnSync(process.execPath,args,opts);
    expect(first.status,first.stderr+'\n'+first.stdout).toBe(0);
    expect(first.stdout).toContain('PR147_OPERATOR_FIRST_IMPORT_CAS_READBACK_PASS');
    const receipt=JSON.parse(readFileSync(output,'utf8'));
    expect(receipt).toMatchObject({mode:'emulator',sourceSha,imported:1,
      verifiedAdmin:true,readbackVerified:true,usingAdminServiceBypass:false});
    expect(receipt.workbookSha256).toBe(hash);
    expect(typeof receipt.uid).toBe('string');
    expect(receipt.uid.length).toBeGreaterThan(8);
    const state=await witness();
    expect(state.items).toBeDefined();
    expect(Object.keys(state.items)).toHaveLength(1);
    expect(state.items[rows.items[0].recordId]).toMatchObject({
      recordId:rows.items[0].recordId,displayCode:'NQ-OPS-0001',
      content:'MẪU hồ sơ operator đã duyệt',revision:1,
      updatedBy:receipt.uid
    });
    const beforeSecond=sha(stable(state));
    const second=spawnSync(process.execPath,args,opts);
    expect(second.status).not.toBe(0);
    expect(second.stderr).toContain('PR147_BOOTSTRAP_HOLD_');
    expect(sha(stable(await witness()))).toBe(beforeSecond);
    // The same executable MUST fail closed before touching any production
    // target if forced into production mode without operator release approval.
    const productionArgs=[...args];
    productionArgs[productionArgs.indexOf('emulator')]='production';
    const prod=spawnSync(process.execPath,productionArgs,{...opts,
      env:{...opts.env,PR147_OPERATOR_FIRST_IMPORT_APPROVED:'NO'}});
    expect(prod.status).not.toBe(0);
    expect(sha(stable(await witness()))).toBe(beforeSecond);
    log('FRV02_OPERATOR_PROTECTED_EMPTY_CAS_VERIFIED',prior,await witness(),{
      workbookSha256:hash,sourceSha,rowCount:1,operatorExecuted:true,
      duplicateRejected:true,productionModeBlocked:true,
      reportSha256:sha(readFileSync(output,'utf8'))});
  }finally{rmSync(folder,{recursive:true,force:true});}
},150000);
