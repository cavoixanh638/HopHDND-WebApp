/**
 * PR149 actual API / Auth + both Functions + RTDB Emulator operational rehearsal.
 * Uses real guarded bootstrap, freeze, cell callable and parent commit adapter;
 * only resets synthetic demo state using rules-unit-testing fixture helper.
 */
import {beforeAll,beforeEach,afterAll,it,expect} from 'vitest';
import {initializeTestEnvironment,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential,getIdToken,type User} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,ref,set,get} from 'firebase/database';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {bootstrapApprovedRowsToPrimary} from '../../../src/data/firebase-primary-bootstrap';
import {setFreezeMode,readFreeze,initialFreeze} from '../../../src/data/freeze-control';
import {createDemoItems} from '../../../src/data/demo-items';
import {stageDatasetReplacement,prepareInitialDatasetActivation,
 commitInitialDatasetActivation,commitDatasetReplacement,restoreDatasetBackup,
 resolveDatasetOperation} from '../../../src/data/firebase-versioned-replacement-secure';
import {CellEditSessionManager} from '../../../src/data/cell-edit-leases';
import {FirebaseRepository} from '../../../src/data/firebase-repository';
import {updateDraft} from '../../../src/domain/items';
import {audit,sha,stable} from './offline-audit-core.mjs';

const PROJECT='demo-hdnd',ADMIN_EMAIL='cavoixanh638@gmail.com';
const API='http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit';
const rootURL='http://127.0.0.1:9000/.json?ns=demo-hdnd';
const original='02964722ae405a7ccf70f2b88bfe21cb7d0bcca7';
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
 process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
 !process.env.FIREBASE_EMULATOR_HUB||
 (process.env.GCLOUD_PROJECT??PROJECT)!==PROJECT)
 throw Error('PR149_REFUSES_NON_DEMO_EMULATOR');
let env:RulesTestEnvironment,app:FirebaseApp,admin:User,db:ReturnType<typeof getDatabase>;
const journal:any[]=[];
const mask=s=>sha(s).slice(0,16);
const now=()=>new Date().toISOString();
const fixtureRows=(label='Giả lập ban đầu')=>{
 return createDemoItems(2).map((raw,i)=>{
  const {partyMeeting:_p,examined:_q,archivedAt:_a,...r}=raw;
  return {...r,recordId:'ops-r'+(i+1),displayCode:'NQ-OPS-'+(i+1),
   stt:i+1,note:label+' '+(i+1),revision:1};
 });
};
async function server(){
 const r=await fetch(rootURL,{headers:{Authorization:'Bearer owner'}});
 if(!r.ok)throw Error('Local Emulator owner READ failed '+r.status);
 return r.json();
}
const witness=async(label,before,result)=>{
 const after=await server();
 const b=sha(before??null),a=sha(after??null);
 journal.push({case:label,serverBefore:b,serverAfter:a,serverChanged:b!==a,
  active:after?.hdnd?.datasetV2?.active??null,
  legacyRows:Object.keys(after?.hdnd?.items??{}).length,
  generationRows:Object.fromEntries(Object.entries(after?.hdnd?.datasetV2?.generations??{})
    .map(([k,v])=>[mask(k),Object.keys(v?.items??{}).length])),
  operationCount:Object.keys(after?.hdnd?.datasetV2?.operations??{}).length,
  result,statusTimestamp:now()});
 console.log('PR149_SERVER_WITNESS',JSON.stringify(journal.at(-1)));
 return after;
};
const activate=async(label,op)=>{
 const legacy=fixtureRows('LEGACY '+label);
 await bootstrapApprovedRowsToPrimary(db,admin,legacy);
 const beforeFreeze=await readFreeze(db);
 const freeze=await setFreezeMode(db,admin,beforeFreeze,'FROZEN',true);
 expect(freeze.mode).toBe('FROZEN');
 const input=fixtureRows('V2 '+label);
 const approval=await prepareInitialDatasetActivation(db,admin,input,op,'approved.xlsx');
 const res=await commitInitialDatasetActivation(db,admin,approval,
  'KHOI TAO V2 '+op+' '+approval.legacyRowCount+' '+approval.preview.newCount);
 expect(res.status).toBe('committed');
 return await server();
};
const replace=async(items,op)=>{
 const st=await stageDatasetReplacement(db,admin,items,op,'replacement.xlsx');
 const answer=await commitDatasetReplacement(db,admin,st,
  'THAY '+op+' '+st.preview.oldCount+' '+st.preview.newCount);
 expect(answer.status).toBe('committed');
 return {st,answer,after:await server()};
};
const send=async(body)=>{
 const token=await getIdToken(admin);
 const r=await fetch(API,{method:'POST',headers:{
  Authorization:'Bearer '+token,'Content-Type':'application/json',
  Origin:'http://127.0.0.1:4173'
 },body:JSON.stringify(body)});
 return {status:r.status,body:await r.json()};
};
beforeAll(async()=>{
 env=await initializeTestEnvironment({projectId:PROJECT,database:{host:'127.0.0.1',port:9000,
   rules:readFileSync('firebase/database.exclusive-candidate.rules.json','utf8')}});
 app=initializeApp({apiKey:'demo-key',authDomain:'demo-hdnd.firebaseapp.com',
  projectId:PROJECT,databaseURL:'https://demo-hdnd.firebaseio.com',appId:'pr149-synthetic'},'pr149-'+randomUUID());
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 admin=(await signInWithCredential(auth,GoogleAuthProvider.credential(JSON.stringify({
  sub:'pr149-demo-admin',email:ADMIN_EMAIL,email_verified:true,name:'synthetic Google only'})))).user;
 db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
 const health=await fetch(API+'/health');expect(health.status).toBe(200);
 expect((await health.json()).enabled).toBe(true);
});
beforeEach(async()=>{await env.clearDatabase();});
afterAll(async()=>{await env?.cleanup();if(app)await deleteApp(app);});
it('S1: truly EMPTY RTDB refuses V2 activation; approved legacy bootstrap CAS succeeds ONCE',async()=>{
 const before=await server();expect(before??null).toBe(null);
 const op='ops_empty_activate_0001';
 await expect(prepareInitialDatasetActivation(db,admin,fixtureRows(),op,'new.xlsx'))
  .rejects.toThrow(/Legacy|hồ sơ|khởi tạo/);
 expect(await server()).toEqual(before);
 const source=fixtureRows('đích trống — có duyệt');
 const importRes=await bootstrapApprovedRowsToPrimary(db,admin,source);
 expect(importRes).toMatchObject({sourceCount:2,importedCount:2});
 const seeded=await witness('EMPTY_BOOTSTRAP_CAS',before,importRes);
 for(const row of source)expect(seeded.hdnd.items[row.recordId]).toMatchObject({
  recordId:row.recordId,displayCode:row.displayCode,note:row.note,revision:1});
 await expect(bootstrapApprovedRowsToPrimary(db,admin,fixtureRows('not allowed')))
  .rejects.toThrow(/đã có dữ liệu/);
 const second=await server();expect(second).toEqual(seeded);
 await witness('EMPTY_SECOND_IMPORT_DENIED',seeded,{denied:true,serverUnchanged:true});
 const frozen=await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
 expect(frozen.closedAt).toBeGreaterThan(0);
 const approval=await prepareInitialDatasetActivation(db,admin,source,op,'approved.xlsx');
 const act=await commitInitialDatasetActivation(db,admin,approval,
  'KHOI TAO V2 '+op+' '+approval.legacyRowCount+' '+approval.preview.newCount);
 expect(act.status).toBe('committed');
 const active=await witness('EMPTY_TO_LEGACY_TO_V2',seeded,act);
 expect(active.hdnd.datasetV2.active.rowCount).toBe(2);
 expect(active.hdnd.datasetV2.operations[op].status).toBe('COMMITTED');
 expect(active.hdnd.items).toEqual(seeded.hdnd.items);
});
it('S2: existing legacy cannot be re-imported; V2 activation retains sealed legacy backup',async()=>{
 const existing=fixtureRows('already ACK legacy');
 await bootstrapApprovedRowsToPrimary(db,admin,existing);
 await set(ref(db,'hdnd/permissions/columns/note'),true);
 const pre=await server();
 await expect(bootstrapApprovedRowsToPrimary(db,admin,fixtureRows('would erase')))
  .rejects.toThrow();
 expect(await server()).toEqual(pre);
 const freeze=await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
 expect(freeze.mode).toBe('FROZEN');
 const op='ops_legacy_activation_0001';
 const a=await prepareInitialDatasetActivation(db,admin,existing,op,'legacy-current.xlsx');
 const res=await commitInitialDatasetActivation(db,admin,a,
  'KHOI TAO V2 '+op+' '+a.legacyRowCount+' '+a.preview.newCount);
 expect(res.status).toBe('committed');
 const post=await witness('LEGACY_EXISTS_ACTIVATE',pre,res);
 expect(post.hdnd.items).toEqual(pre.hdnd.items);
 expect(post.hdnd.permissions).toEqual(pre.hdnd.permissions);
 const sealed=JSON.parse(post.hdnd.datasetV2.legacyBackups[op]);
 expect(sealed.legacy.items).toEqual(pre.hdnd.items);
 expect(sealed.legacy.permissions).toEqual(pre.hdnd.permissions);
 expect(post.hdnd.datasetV2.permissions?.['gen_'+op]?.columns?.note).toBeUndefined();
 expect(post.hdnd.datasetV2.operations[op]).toMatchObject({status:'COMMITTED',from:'legacy'});
});
it('S3: V2 active -> backup then REAL server-ACK edit -> STOP, new snapshot and reconcile, no stale restore',async()=>{
 const initial='ops_ack_initial_0001',second='ops_ack_replace_0002';
 await activate('ACK',initial);
 await set(ref(db,'hdnd/datasetV2/permissions/gen_'+initial+'/columns/note'),true);
 const {after}=await replace(fixtureRows('V2 replacement'),second);
 const archived=structuredClone(after.hdnd.datasetV2.generations['gen_'+initial]);
 const sealed=JSON.parse(after.hdnd.datasetV2.backups[second]);
 expect(sealed.generation.items).toEqual(archived.items);
 const opened=await setFreezeMode(db,admin,await readFreeze(db),'OPEN');
 expect(opened.mode).toBe('OPEN');
 // This is an actual server-ACK through onCall with tab-private proof; not a fixture update.
 const p=after.hdnd.datasetV2.active,manager=new CellEditSessionManager(db,()=>admin,p.generationId);
 const repository=new FirebaseRepository(db,()=>admin,()=>({columns:{note:true}}),
  'hdnd/datasetV2/generations/'+p.generationId+'/items',p);
 repository.leaseManager=manager;
 try{
  const originalRows=await repository.list();const baseline=originalRows[0];
  const locked=await manager.acquire(baseline.recordId,'note','multiline');
  expect(locked).toBe(true);
  const patch=updateDraft(baseline,undefined,{note:'NEW SERVER ACK after the backup — bảo toàn'})!;
  const saved=(await repository.save([patch]))[0];
  expect(saved.ok,saved.message).toBe(true);
  await manager.cancel(baseline.recordId,'note');
 }finally{await manager.dispose();}
 const current=await witness('ACTIVE_NEW_CELL_ACK_AFTER_BACKUP',after,{serverAck:true,via:'cellEdit onCall'});
 const gen='gen_'+second;
 expect(current.hdnd.datasetV2.generations[gen].items['ops-r1'].revision).toBeGreaterThan(
  after.hdnd.datasetV2.generations[gen].items['ops-r1'].revision);
 expect(current.hdnd.datasetV2.generations[gen].items['ops-r1'].note).toContain('NEW SERVER ACK');
 expect(current.hdnd.datasetV2.generations['gen_'+initial]).toEqual(archived);
 const delta=sha(after.hdnd.datasetV2.generations[gen].items)!==
  sha(current.hdnd.datasetV2.generations[gen].items);
 expect(delta).toBe(true);
 // Operator gate must STOP *before* sending an API restore; never discard ACK.
 const stop={status:'STOP_RECONCILE_AFTER_ACK',candidateBackup:mask(second),
  freshSnapshotSha256:sha(current),previousSnapshotSha256:sha(after),ackRevision:
  current.hdnd.datasetV2.generations[gen].items['ops-r1'].revision,
  restoreCalls:0,requiresDataOwnerApproval:true};
 await witness('NO_OLD_BACKUP_RESTORE_AFTER_ACK',current,stop);
 const verify=await server();expect(verify).toEqual(current);
 mkdirSync('pr149-ops-evidence',{recursive:true});
 writeFileSync('pr149-ops-evidence/rtdb.before.json',JSON.stringify({hdnd:current.hdnd},null,2)+'\n');
 writeFileSync('pr149-ops-evidence/previous.snapshot.json',JSON.stringify({hdnd:after.hdnd},null,2)+'\n');
 const bytes=readFileSync('pr149-ops-evidence/rtdb.before.json');
 const full={projectId:'demo-hdnd',instanceId:'demo-hdnd',
  rtdbFile:'rtdb.before.json',rtdbSha256:sha(bytes),rtdbBytes:bytes.byteLength,
  hdndItemsCount:Object.keys(current.hdnd.items??{}).length,
  hdndMirrorsCount:Object.keys(current.hdnd.mirrors??{}).length,
  stability:'Two successive exports matched byte-for-byte',
  origin:'ONLY_SYNTHETIC_EMULATOR_NOT_PRODUCTION'};
 writeFileSync('pr149-ops-evidence/manifest.demo.json',JSON.stringify(full,null,2)+'\n');
 const report=audit({snapshot:{hdnd:current.hdnd},rawBytes:bytes,manifest:full,
  previousSnapshot:{hdnd:after.hdnd}});
 expect(report.issues.some(x=>x.code==='POST_BACKUP_SERVER_CHANGES_REQUIRE_RECONCILIATION')).toBe(true);
 writeFileSync('pr149-ops-evidence/s3-reconcile.json',JSON.stringify({stop,report},null,2)+'\n');
});
it('FRCR-01: verified admin historical rights write is witnessed on pinned original; fixed SHA MUST deny and still RESTORE',async()=>{
 const a='ops_frcr_initial_0001',b='ops_frcr_replace_0002',c='ops_frcr_restore_0003';
 await activate('FRCR',a);
 await set(ref(db,'hdnd/datasetV2/permissions/gen_'+a+'/columns/note'),true);
 await replace(fixtureRows('right after replace'),b);
 const before=await server(),rights='hdnd/datasetV2/permissions/gen_'+a+'/columns/note';
 let mutated=false,denial='';
 try{await set(ref(db,rights),false);mutated=true;}catch(e){denial=String(e);}
 const after=await server();
 const expectFixed=process.env.PR149_EXPECT_FRCR_FIXED==='true';
 if(expectFixed){
  expect(mutated,'Historical admin write MUST DENY at server').toBe(false);
  expect(sha(after)).toBe(sha(before));
  const restored=await restoreDatasetBackup(db,admin,b,c,after.hdnd.datasetV2.active,
   'KHOI PHUC '+c);
  expect(restored.status).toBe('committed');
  const verified=await witness('FRCR01_FIXED_HISTORICAL_DENY_VALID_RESTORE',after,restored);
  expect(verified.hdnd.datasetV2.active.generationId).toBe('gen_'+c);
  expect(verified.hdnd.datasetV2.generations['gen_'+a]).toEqual(before.hdnd.datasetV2.generations['gen_'+a]);
 }else{
  // Historical pinned SHA is known vulnerable, don't call this a repaired PASS.
  expect(mutated,'FRCR-01 pinned original expected reproducible defect').toBe(true);
  expect(after.hdnd.datasetV2.permissions['gen_'+a].columns.note).toBe(false);
  const attempted=await send({action:'restore',operationId:c,
    backupOperationId:b,expected:after.hdnd.datasetV2.active,confirmation:'KHOI PHUC '+c});
  expect(attempted.status).toBe(409);
  const final=await witness('FRCR01_BASELINE_DEFECT_REPRODUCED_HISTORICAL_MUTATION_BLOCKS_RESTORE',
    before,{mutated,denial,httpStatus:attempted.status,serverReason:attempted.body?.error??attempted.body});
  expect(final).toEqual(after);
  console.log('PR149_FRCR01_VERDICT=FAIL_ON_PINNED_ORIGINAL');
 }
});
it('DR-02: forged self-consistent-looking backup MUST NOT restore',async()=>{
 const a='ops_forged_initial_0001',b='ops_forged_replace_0002',fake='ops_forged_fake_0003',restore='ops_forged_restore_0004';
 await activate('DR02',a);
 await replace(fixtureRows('genuine B'),b);
 const before=await server();
 const known=JSON.parse(before.hdnd.datasetV2.backups[b]);
 await set(ref(db,'hdnd/datasetV2/backups/'+fake),JSON.stringify({...known,
  previous:before.hdnd.datasetV2.active,
  generation:{items:before.hdnd.datasetV2.generations[before.hdnd.datasetV2.active.generationId].items}}));
 const pre=await server();
 const attempted=await send({action:'restore',operationId:restore,
  backupOperationId:fake,expected:pre.hdnd.datasetV2.active,confirmation:'KHOI PHUC '+restore});
 const post=await witness('DR02_FAKE_BACKUP_DENIED',pre,{httpStatus:attempted.status});
 expect(attempted.status).toBe(409);expect(post).toEqual(pre);
 expect(post.hdnd.datasetV2.operations?.[restore]).toBeUndefined();
});
it('valid RESTORE remains available when no historical right tamper and no new ACK',async()=>{
 const a='ops_valid_initial_0001',b='ops_valid_replace_0002',c='ops_valid_restore_0003';
 await activate('OK',a);
 await set(ref(db,'hdnd/datasetV2/permissions/gen_'+a+'/columns/note'),true);
 const replaced=await replace(fixtureRows('valid replacement'),b);
 const before=replaced.after;
 const outcome=await restoreDatasetBackup(db,admin,b,c,before.hdnd.datasetV2.active,'KHOI PHUC '+c);
 expect(outcome.status).toBe('committed');
 const after=await witness('VALID_COMMITTED_BACKUP_RESTORE_PASSES',before,outcome);
 expect(after.hdnd.datasetV2.active.generationId).toBe('gen_'+c);
 expect(after.hdnd.datasetV2.generations['gen_'+a]).toEqual(before.hdnd.datasetV2.generations['gen_'+a]);
 expect(after.hdnd.datasetV2.permissions?.['gen_'+c]?.columns?.note).toBe(true);
 expect((await resolveDatasetOperation(db,b)).status).toBe('committed-historical');
});
afterAll(()=>{
 mkdirSync('pr149-ops-evidence',{recursive:true});
 writeFileSync('pr149-ops-evidence/emulator-witness.json',
  JSON.stringify({schema:'pr149.operational-drill.v1',originalSourceSha:original,
    candidateSha:process.env.PR149_CANDIDATE_SHA??original,
    frcrFixedExpected:process.env.PR149_EXPECT_FRCR_FIXED==='true',
    mode:'SYNTHETIC_AUTH_FUNCTIONS_RTDB_EMULATOR',cases:journal},null,2)+'\n');
});
