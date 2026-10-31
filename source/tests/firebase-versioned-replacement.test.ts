import {readFileSync} from 'node:fs';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,parseBusinessExcel} from '../src/data/business-excel';
import {initializeApp,deleteApp} from 'firebase/app';
import {initializeAuth,connectAuthEmulator,inMemoryPersistence,getIdTokenResult,signOut} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator} from 'firebase/database';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,
  type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update,goOffline,goOnline,serverTimestamp} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {updateDraft} from '../src/domain/items';
import {stageDatasetReplacement,readStagedDataset,commitDatasetReplacement,
  resolveDatasetOperation,restoreDatasetBackup,prepareInitialDatasetActivation,
  commitInitialDatasetActivation,armEmulatorPostCommitCallerAckLoss,DATASET_V2_PATH} from
  '../src/data/firebase-versioned-replacement';

const emulator=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
// Run the real, unmodified candidate rules; disabling validation would make
// a green Emulator run meaningless for security acceptance.
const rule=readFileSync('firebase/database.exclusive-candidate.rules.json','utf8');
const claims={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com' as const}};
const actor={uid:'administrator',email:claims.email,emailVerified:true,
  providerData:[{providerId:'google.com'}]} as User;
const initialRows=createDemoItems(2).map((item,i)=>({...item,
  recordId:'r'+(i+1),displayCode:'NQ0'+(i+1),revision:1,archivedAt:null,isDropped:false}));
const replacement=()=>createDemoItems(2).map((item,i)=>({...item,
  recordId:'v'+(i+1),displayCode:'NQ0'+(i+1),revision:1,archivedAt:null,
  isDropped:false,content:'Mới '+i}));
const seed=()=>({hdnd:{items:{legacy:initialRows[0]},
  datasetV2:{active:{generationId:'gen_seed_initial',operationId:'seed_op_000001',
    revision:1,rowCount:2,digest:'a'.repeat(64)},
    generations:{gen_seed_initial:{items:Object.fromEntries(initialRows.map(row=>[row.recordId,{...row,operationId:'seed',updatedAt:1,updatedBy:'administrator'}]))}},
    permissions:{gen_seed_initial:{columns:{note:true}}},
    leases:{gen_seed_initial:{r1:{note:{token:'stale-lease'}}}}
  }}});
describe.skipIf(!emulator)('PR95 real RTDB Emulator generation replacement',()=>{
  let env:RulesTestEnvironment;
  const admin=()=>env.authenticatedContext('administrator',claims).database() as never;
  const guest=()=>env.authenticatedContext('anon',{firebase:{sign_in_provider:'anonymous'}}).database() as never;
  beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-hdnd-v2',database:{
    host:'127.0.0.1',port:9000,rules:rule}});},30000);
  beforeEach(async()=>{await env.clearDatabase();await env.withSecurityRulesDisabled(async ctx=>{
    await set(ref(ctx.database() as never),seed());
  });});
  afterAll(async()=>env.cleanup());

  it('two independently initialized real Auth Emulator Google SDK sessions share verified admin UID and pass candidate Rules',async()=>{
    const apps=[0,1].map(i=>initializeApp({
      apiKey:'demo-test-key',authDomain:'demo-hdnd-v2.firebaseapp.com',
      projectId:'demo-hdnd-v2',appId:'pr95-auth-emulator-'+i,
      databaseURL:'https://demo-hdnd-v2.firebaseio.com'
    },'pr95-google-auth-tab-'+i));
    try {
      const identities=await Promise.all(apps.map(async app=>{
        const auth=initializeAuth(app,{persistence:inMemoryPersistence});
        connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
        const db=getDatabase(app);
        connectDatabaseEmulator(db,'127.0.0.1',9000);
        const user=await signInAsEmulatorGoogleAdmin(auth);
        const id=await getIdTokenResult(user,true);
        expect(user.email).toBe('cavoixanh638@gmail.com');
        expect(user.emailVerified).toBe(true);
        expect(user.providerData.some(p=>p.providerId==='google.com')).toBe(true);
        expect(id.signInProvider).toBe('google.com');
        expect(id.claims.email_verified).toBe(true);
        await assertSucceeds(get(ref(db,DATASET_V2_PATH)));
        return {uid:user.uid,db,auth};
      }));
      expect(identities[0].uid).toBe(identities[1].uid);
      const privatePath=DATASET_V2_PATH+'/permissions/gen_seed_initial';
      await assertSucceeds(get(ref(identities[0].db,privatePath)));
      await assertSucceeds(get(ref(identities[1].db,privatePath)));
      for(const x of identities)await signOut(x.auth);
    }finally{await Promise.all(apps.map(app=>deleteApp(app)));}
  },30000);

  it('stages, reads back, backs up privately, commits atomically and restores by CAS',async()=>{
    const db=admin(),op='pr95_import_0001';
    const approval=await stageDatasetReplacement(db,actor,replacement(),op,'test.xlsx');
    expect(approval.preview.oldCount).toBe(2);
    expect(await readStagedDataset(db,approval)).toHaveLength(2);
    await assertFails(get(ref(guest(),DATASET_V2_PATH+'/backups/'+op)));
    await assertFails(get(ref(guest(),DATASET_V2_PATH+'/candidates/'+op)));
    expect((await get(ref(db,DATASET_V2_PATH+'/backups/'+op))).exists()).toBe(true);
    const outcome=await commitDatasetReplacement(db,actor,approval,'THAY '+op+' 2 2');
    expect(outcome.status).toBe('committed');
    const active=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect(active.generationId).toBe('gen_'+op);
    const visible=(await get(ref(guest(),DATASET_V2_PATH+'/generations/gen_'+op+'/items'))).val();
    expect(Object.values(visible)).toHaveLength(2);
    await assertFails(set(ref(guest(),'hdnd/items/legacy'),initialRows[0]));
    expect(await resolveDatasetOperation(db,op)).toEqual({status:'committed-active',operationId:op,generationId:'gen_'+op});
    const same=await commitDatasetReplacement(db,actor,approval,'THAY '+op+' 2 2');
    expect(same.status).toBe('already-committed');
    const restore='restore_pr95_0001';
    const recovered=await restoreDatasetBackup(db,actor,op,restore,active,'KHOI PHUC '+restore);
    expect(recovered.status).toBe('committed');
    const previous=(await get(ref(db,DATASET_V2_PATH+'/generations/gen_'+restore+'/items'))).val();
    expect(previous.r1.content).toBe(initialRows[0].content);
    expect((await get(ref(db,DATASET_V2_PATH+'/permissions/gen_'+restore+'/columns/note'))).val()).toBe(true);
    // The original commit is historical, but must never be falsely reported as uncommitted.
    expect(await resolveDatasetOperation(db,op)).toEqual({status:'committed-historical',operationId:op,generationId:'gen_'+op});
    expect(await resolveDatasetOperation(db,restore)).toEqual({status:'committed-active',operationId:restore,generationId:'gen_'+restore});
    await assertFails(get(ref(guest(),DATASET_V2_PATH+'/backups/'+op)));
  },30000);

  it('rejects in-generation edits after review even if the active pointer is unchanged',async()=>{
    const db=admin(),op='pr95_import_0002';
    const approval=await stageDatasetReplacement(db,actor,replacement(),op,'test.xlsx');
    await env.withSecurityRulesDisabled(async context=>{
      await update(ref(context.database() as never,DATASET_V2_PATH+'/generations/gen_seed_initial/items/r1'),
        {note:'Thay đổi sau duyệt',revision:2});
    });
    await expect(commitDatasetReplacement(db,actor,approval,'THAY '+op+' 2 2'))
      .rejects.toThrow('cùng thế hệ');
    expect((await get(ref(db,DATASET_V2_PATH+'/active/generationId'))).val())
      .toBe('gen_seed_initial');
  },20000);

  it('rejects replacement after an authorized lease-backed edit in the same generation',async()=>{
    const db=admin(),operation='pr95_valid_race_01';
    const approval=await stageDatasetReplacement(db,actor,replacement(),operation,'test.xlsx');
    const editorDb=env.authenticatedContext('concurrent-editor',
      {firebase:{sign_in_provider:'anonymous'}}).database() as never;
    const editor={uid:'concurrent-editor',isAnonymous:true,email:null,
      emailVerified:false,providerData:[]} as unknown as User;
    const manager=new CellEditSessionManager(editorDb,()=>editor,'gen_seed_initial');
    const repository=new FirebaseRepository(editorDb,()=>editor,
      ()=>({columns:{note:true}}),DATASET_V2_PATH+'/generations/gen_seed_initial/items');
    repository.leaseManager=manager;
    // r1 deliberately has malformed stale-lease fixture; r2 has no lease.
    const original=(await repository.list()).find(row=>row.recordId==='r2')!;
    await manager.acquire(original.recordId,'note','multiline');
    const change=(await repository.save([updateDraft(original,undefined,
      {note:'Đã lưu hợp lệ trong lúc chờ phê duyệt'})!]))[0];
    expect(change.ok,change.message).toBe(true);
    await manager.finish(original.recordId,'note');
    await manager.dispose();
    await expect(commitDatasetReplacement(db,actor,approval,'THAY '+operation+' 2 2'))
      .rejects.toThrow(/cùng thế hệ|đã thay đổi/);
    expect((await get(ref(db,DATASET_V2_PATH+'/active/generationId'))).val())
      .toBe('gen_seed_initial');
    expect(await resolveDatasetOperation(db,operation)).toEqual({status:'not-committed',operationId:operation});
  },30000);

  it('reports UNKNOWN when the network is offline despite a cached COMMITTED operation',async()=>{
    const db=admin(),op='pr95_offline_0001';
    const approval=await stageDatasetReplacement(db,actor,replacement(),op,'test.xlsx');
    expect((await commitDatasetReplacement(db,actor,approval,'THAY '+op+' 2 2')).status)
      .toBe('committed');
    // Ensure the SDK has cached an authorized, successfully committed root.
    expect((await get(ref(db,DATASET_V2_PATH+'/active/operationId'))).val()).toBe(op);
    goOffline(db);
    try{
      // No live server proof: cached COMMITTED must NOT masquerade as
      // a trustworthy response while transport is offline.
      expect(await resolveDatasetOperation(db,op))
        .toEqual({status:'unknown',operationId:op});
    }finally{goOnline(db);}
  },30000);

  it('does not call missing or inconsistent operation log entries uncommitted',async()=>{
    const db=admin();
    // A seeded active pointer without a matching operation log is ambiguous.
    expect(await resolveDatasetOperation(db,'seed_op_000001')).toEqual({status:'unknown',operationId:'seed_op_000001'});
    expect(await resolveDatasetOperation(db,'not_seen_ever_0001')).toEqual({status:'not-committed',operationId:'not_seen_ever_0001'});
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,DATASET_V2_PATH+
        '/operations/corrupt_op_01'),{status:'COMMITTED',from:'gen_seed_initial',
        to:'gen_missing',at:1});
    });
    expect(await resolveDatasetOperation(db,'corrupt_op_01')).toEqual({status:'unknown',operationId:'corrupt_op_01'});
  },20000);

  it('two tabs use different operationIds: only first CAS wins',async()=>{
    const db=admin();
    const a=await stageDatasetReplacement(db,actor,replacement(),'pr95_import_0003','a.xlsx');
    const b=await stageDatasetReplacement(db,actor,replacement(),'pr95_import_0004','b.xlsx');
    expect((await commitDatasetReplacement(db,actor,a,'THAY pr95_import_0003 2 2')).status)
      .toBe('committed');
    await expect(commitDatasetReplacement(db,actor,b,'THAY pr95_import_0004 2 2'))
      .rejects.toThrow();
    expect(await resolveDatasetOperation(db,'pr95_import_0004')).toEqual({status:'not-committed',operationId:'pr95_import_0004'});
  },30000);

  it('allows fresh generation-scoped lease edits but rejects writes to the old generation',async()=>{
    const db=admin(),operation='pr95_import_0005';
    const approval=await stageDatasetReplacement(db,actor,replacement(),operation,'test.xlsx');
    await commitDatasetReplacement(db,actor,approval,'THAY '+operation+' 2 2');
    const active='gen_'+operation;
    await assertSucceeds(set(ref(db,DATASET_V2_PATH+'/permissions/'+active+'/columns/note'),true));
    const editorDb=env.authenticatedContext('editor-v2',
      {firebase:{sign_in_provider:'anonymous'}}).database() as never;
    const editor={uid:'editor-v2',isAnonymous:true,email:null,emailVerified:false,
      providerData:[]} as unknown as User;
    const manager=new CellEditSessionManager(editorDb,()=>editor,active);
    const repository=new FirebaseRepository(editorDb,()=>editor,
      ()=>({columns:{note:true}}),DATASET_V2_PATH+'/generations/'+active+'/items');
    repository.leaseManager=manager;
    const before=(await repository.list())[0];
    await manager.acquire(before.recordId,'note','multiline');
    const save=(await repository.save([updateDraft(before,undefined,{note:'đổi đúng thế hệ'})!]))[0];
    expect(save.ok,save.message).toBe(true);
    await manager.finish(before.recordId,'note');
    await manager.dispose();
    const obsolete=new FirebaseRepository(editorDb,()=>editor,
      ()=>({columns:{note:true}}),DATASET_V2_PATH+'/generations/gen_seed_initial/items');
    // An inactive generation is not readable by a non-admin. The stale tab
    // keeps only its old in-memory snapshot, then attempts a forbidden save.
    await assertFails(obsolete.list());
    const old=initialRows[0];
    const denied=(await obsolete.save([updateDraft(old,undefined,{note:'phiên cũ'})!]))[0];
    expect(denied.ok).toBe(false);
    expect((await get(ref(db,DATASET_V2_PATH+'/generations/gen_seed_initial/items/r1/note'))).val())
      .toBe(initialRows[0].note);
  },30000);
  it('rejects privileged direct pointer, operation-log and rogue-generation tampering',async()=>{
    const db=admin();
    // Even a verified admin cannot bypass the guarded root CAS by directly
    // changing just the active pointer or authoring operation metadata.
    await assertFails(update(ref(db,DATASET_V2_PATH+'/active'),
      {revision:2,generationId:'gen_does_not_exist',
        operationId:'forged_op_00001'}));
    await assertFails(set(ref(db,DATASET_V2_PATH+'/operations/forged_op_00001'),
      {status:'COMMITTED',from:'gen_seed_initial',to:'gen_does_not_exist',at:Date.now()}));
    await assertFails(set(ref(db,DATASET_V2_PATH+
      '/generations/gen_seed_initial/rogueMetadata'),{payload:'forged'}));
    const op='pr95_tamper_0001';
    const approval=await stageDatasetReplacement(db,actor,replacement(),op,'synthetic.xlsx');
    expect((await commitDatasetReplacement(db,actor,approval,'THAY '+op+' 2 2')).status)
      .toBe('committed');
    await assertFails(update(ref(db,DATASET_V2_PATH+'/operations/'+op),
      {status:'FORGED'}));
    await assertFails(update(ref(db,DATASET_V2_PATH+
      '/generations/gen_seed_initial/items/r1'),{stt:999}));
    expect((await get(ref(db,DATASET_V2_PATH+'/active/revision'))).val()).toBe(2);
  },30000);
  async function setupFrozenLegacy(){
    await env.withSecurityRulesDisabled(async ctx=>{
      const db=ctx.database() as never;
      await set(ref(db,DATASET_V2_PATH),null);
      await set(ref(db,'hdnd/items'),Object.fromEntries(initialRows.map(row=>
        [row.recordId,{...row,operationId:'legacy_seed_0001',
          updatedAt:1,updatedBy:'administrator'}])));
      await set(ref(db,'hdnd/permissions'),{columns:{note:true}});
      await set(ref(db,'hdnd/editLocks'),null);
      await set(ref(db,'hdnd/freezeControl'),{
        mode:'FROZEN',revision:2,epoch:1,actor:'administrator',
        changedAt:100,deadline:0,closedAt:100
      });
    });
  }
  it('real A–O parser payload is V2-safe and completes actual Rules CAS initial → replace → restore',async()=>{
    const workbook=(variant:string)=>{
      const book=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([
        [...BUSINESS_HEADERS],
        ['NQ90',1,'PR95 '+variant+' nghị quyết','Sở QA '+variant,'QPPL',
          '','','','','Chuyên viên QA','Phòng QA','','','Sở đang thực hiện','Ghi chú '+variant],
        ['BC91',2,'PR95 '+variant+' báo cáo','Sở QA '+variant,'BC',
          '','','','','Chuyên viên QA','Phòng QA','','','Sở đang thực hiện','Ghi chú '+variant]
      ]),'DATA_AO');
      return parseBusinessExcel(XLSX.write(book,{type:'buffer',bookType:'xlsx'}),'DATA_AO').items;
    };
    const firstRows=workbook('INITIAL'),secondRows=workbook('REPLACE');
    expect(firstRows).toHaveLength(2);
    expect(firstRows[0]).toMatchObject({
      recordId:'x-4e513930',displayCode:'NQ90',
      content:'PR95 INITIAL nghị quyết',documentKind:'NQ'
    });
    expect(firstRows[0]).toHaveProperty('partyMeeting','');
    expect(firstRows[0]).toHaveProperty('examined','');
    await setupFrozenLegacy();
    const db=admin();
    const op1='pr95_real_excel_first_01';
    const prepared=await prepareInitialDatasetActivation(db,actor,firstRows,op1,'initial.xlsx');
    const payload=JSON.parse(String((await get(ref(db,
      DATASET_V2_PATH+'/candidates/'+op1))).val())) as {items:Record<string,Record<string,unknown>>};
    for(const row of Object.values(payload.items)){
      expect(row).not.toHaveProperty('partyMeeting');
      expect(row).not.toHaveProperty('examined');
    }
    expect((await commitInitialDatasetActivation(db,actor,prepared,
      'KHOI TAO V2 '+op1+' 2 2')).status).toBe('committed');
    expect((await get(ref(db,DATASET_V2_PATH+'/active'))).val()).toMatchObject({
      operationId:op1,revision:1});
    const op2='pr95_real_excel_replace_01';
    const staged=await stageDatasetReplacement(db,actor,secondRows,op2,'replace.xlsx');
    expect((await commitDatasetReplacement(db,actor,staged,
      'THAY '+op2+' 2 2')).status).toBe('committed');
    const active=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect(active).toMatchObject({operationId:op2,revision:2});
    const op3='pr95_real_excel_restore_01';
    expect((await restoreDatasetBackup(db,actor,op2,op3,active,
      'KHOI PHUC '+op3)).status).toBe('committed');
    expect((await get(ref(db,DATASET_V2_PATH+'/active'))).val()).toMatchObject({
      operationId:op3,revision:3});
    const restored=(await get(ref(db,DATASET_V2_PATH+
      '/generations/gen_'+op3+'/items'))).val();
    expect(Object.values(restored)).toHaveLength(2);
    expect(Object.values(restored).some((row:any)=>
      row.content==='PR95 INITIAL nghị quyết')).toBe(true);
    const snapshot=(await get(ref(db,DATASET_V2_PATH))).val();
    expect(Object.keys(snapshot.operations)).toHaveLength(3);
    expect(Object.keys(snapshot.generations)).toHaveLength(3);
    expect(await resolveDatasetOperation(db,op1)).toMatchObject({
      status:'committed-historical',operationId:op1});
    expect(await resolveDatasetOperation(db,op3)).toMatchObject({
      status:'committed-active',operationId:op3});
  },60000);

  it('refuses genuine legacy P/Q content rather than silently dropping business data',async()=>{
    const invalid={...replacement()[0],partyMeeting:'Đã họp',examined:''};
    await expect(stageDatasetReplacement(admin(),actor,[invalid],
      'pr95_real_legacy_reject_01','unsafe.xlsx'))
      .rejects.toThrow('P/Q legacy');
  });

  it('proves server COMMITTED despite lost application completion on all 3 CAS APIs; lookup never replays',async()=>{
    await setupFrozenLegacy();
    const db=admin();
    const first='pr95_loss_initial_0001';
    const approval=await prepareInitialDatasetActivation(db,actor,replacement(),first,'first.xlsx');
    armEmulatorPostCommitCallerAckLoss(db,first);
    await expect(commitInitialDatasetActivation(db,actor,approval,
      'KHOI TAO V2 '+first+' 2 2')).rejects.toThrow(
      'PR95_TEST_ONLY_LOST_CALLER_ACK_AFTER_SERVER_CAS');
    const active1=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect(active1).toMatchObject({operationId:first,revision:1});
    expect(await resolveDatasetOperation(db,first)).toEqual({
      operationId:first,status:'committed-active',generationId:'gen_'+first});
    const second='pr95_loss_replace_001';
    const rows2=replacement().map(row=>({...row,content:row.content+' second'}));
    const next=await stageDatasetReplacement(db,actor,rows2,second,'second.xlsx');
    armEmulatorPostCommitCallerAckLoss(db,second);
    await expect(commitDatasetReplacement(db,actor,next,'THAY '+second+' 2 2'))
      .rejects.toThrow('PR95_TEST_ONLY_LOST_CALLER_ACK_AFTER_SERVER_CAS');
    const active2=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect(active2).toMatchObject({operationId:second,revision:2});
    expect(await resolveDatasetOperation(db,first)).toMatchObject({status:'committed-historical'});
    expect(await resolveDatasetOperation(db,second)).toMatchObject({
      status:'committed-active',generationId:'gen_'+second});
    const third='pr95_loss_restore_001';
    armEmulatorPostCommitCallerAckLoss(db,third);
    await expect(restoreDatasetBackup(db,actor,second,third,active2,
      'KHOI PHUC '+third)).rejects.toThrow('PR95_TEST_ONLY_LOST_CALLER_ACK_AFTER_SERVER_CAS');
    const active3=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect(active3).toMatchObject({operationId:third,revision:3});
    expect(await resolveDatasetOperation(db,second)).toMatchObject({
      status:'committed-historical'});
    expect(await resolveDatasetOperation(db,third)).toMatchObject({
      status:'committed-active',generationId:'gen_'+third});
    const frozen=(await get(ref(db,DATASET_V2_PATH))).val();
    expect(Object.keys(frozen.operations)).toHaveLength(3);
    expect(Object.keys(frozen.generations)).toHaveLength(3);
    expect((await get(ref(db,DATASET_V2_PATH+'/active/revision'))).val()).toBe(3);
    // Only read-only status lookups after injected faults: no repeated runTransaction.
    expect((await get(ref(db,DATASET_V2_PATH+'/operations/'+first+'/status'))).val())
      .toBe('COMMITTED');
    expect((await get(ref(db,DATASET_V2_PATH+'/operations/'+second+'/status'))).val())
      .toBe('COMMITTED');
    expect((await get(ref(db,DATASET_V2_PATH+'/operations/'+third+'/status'))).val())
      .toBe('COMMITTED');
  },55000);

  it('activates populated FROZEN legacy via private backup, verified staging and first CAS',async()=>{
    await setupFrozenLegacy();
    const db=admin(),op='pr95_first_v2_0001';
    await assertFails(set(ref(db,'hdnd/items/r2/note'),'Không được sửa khi FROZEN'));
    await assertFails(set(ref(db,'hdnd/permissions/columns/note'),false));
    const approval=await prepareInitialDatasetActivation(db,actor,replacement(),op,'new.xlsx');
    expect(approval.legacyRowCount).toBe(2);
    expect(approval.freezeRevision).toBe(2);
    expect(approval.freezeEpoch).toBe(1);
    expect(approval.legacyBaseline).toMatch(/^[0-9a-f]{64}$/);
    const backupRef=ref(db,DATASET_V2_PATH+'/legacyBackups/'+op);
    const privateBackup=(await get(backupRef)).val();
    expect(typeof privateBackup).toBe('string');
    expect(JSON.parse(privateBackup).legacy.items.r1.recordId).toBe('r1');
    await assertFails(get(ref(guest(),DATASET_V2_PATH+'/legacyBackups/'+op)));
    await assertFails(set(backupRef,'tampered'));
    await assertFails(set(ref(db,DATASET_V2_PATH+'/active'),{
      generationId:'gen_'+op,operationId:op,revision:1,rowCount:2,digest:'a'.repeat(64)
    }));
    expect((await get(ref(db,DATASET_V2_PATH+'/active'))).exists()).toBe(false);
    const outcome=await commitInitialDatasetActivation(db,actor,approval,
      'KHOI TAO V2 '+op+' 2 2');
    expect(outcome.status).toBe('committed');
    const pointer=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect(pointer).toMatchObject({generationId:'gen_'+op,operationId:op,
      revision:1,rowCount:2,digest:approval.manifest.digest});
    const rows=(await get(ref(guest(),DATASET_V2_PATH+
      '/generations/gen_'+op+'/items'))).val();
    expect(Object.keys(rows)).toHaveLength(2);
    expect((await get(ref(db,DATASET_V2_PATH+'/permissions/gen_'+op+'/columns'))).val())
      .toBeNull();
    expect(await resolveDatasetOperation(db,op)).toEqual({
      status:'committed-active',operationId:op,generationId:'gen_'+op
    });
    expect((await commitInitialDatasetActivation(db,actor,approval,
      'KHOI TAO V2 '+op+' 2 2')).status).toBe('already-committed');
    await assertFails(set(ref(db,'hdnd/items/r1/note'),'Không còn sửa legacy'));
    await assertFails(set(ref(db,'hdnd/permissions/columns/note'),false));
    // Even reopening the old freeze mode cannot resurrect legacy writers
    // once V2 has an active pointer.
    await assertSucceeds(update(ref(db,'hdnd/freezeControl'),{
      mode:'OPEN',revision:3,epoch:1,actor:'administrator',
      changedAt:serverTimestamp(),deadline:0,closedAt:0
    }));
    await assertFails(set(ref(db,'hdnd/items/r1/note'),'Không được hồi sinh legacy'));
    await assertFails(set(ref(db,'hdnd/permissions/columns/note'),true));
  },45000);
  it('blocks first activation if freeze changes during review, even after refreeze',async()=>{
    await setupFrozenLegacy();
    const db=admin(),op='pr95_first_race_001';
    const approval=await prepareInitialDatasetActivation(db,actor,replacement(),op,'new.xlsx');
    await env.withSecurityRulesDisabled(async ctx=>{
      await update(ref(ctx.database() as never,'hdnd/freezeControl'),{
        revision:4,epoch:2,closedAt:200
      });
    });
    await expect(commitInitialDatasetActivation(db,actor,approval,
      'KHOI TAO V2 '+op+' 2 2')).rejects.toThrow(/Legacy|đóng băng|thay đổi/);
    expect((await get(ref(db,DATASET_V2_PATH+'/active'))).exists()).toBe(false);
    // Unauthorized direct pointer writes cannot bypass the server freeze gate.
    await assertFails(set(ref(db,DATASET_V2_PATH+'/active'),{
      generationId:'gen_'+op,operationId:op,revision:1,rowCount:2,digest:'a'.repeat(64)
    }));
  },30000);
  it('never activates legacy without real populated frozen source',async()=>{
    const db=admin(),op='pr95_initial_bad_01';
    await setupFrozenLegacy();
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,'hdnd/freezeControl/mode'),'OPEN');
    });
    await expect(prepareInitialDatasetActivation(db,actor,replacement(),op,'new.xlsx'))
      .rejects.toThrow(/đóng băng|FROZEN/i);
    await setupFrozenLegacy();
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,'hdnd/items'),null);
    });
    await expect(prepareInitialDatasetActivation(db,actor,replacement(),op,'new.xlsx'))
      .rejects.toThrow(/Legacy|Cấu trúc/);
    expect((await get(ref(db,DATASET_V2_PATH+'/active'))).exists()).toBe(false);
  },25000);
  it('fences legacy rights and locks after V2 cutover and under preactivation FROZEN',async()=>{
    const db=admin(),legacyPermissions='hdnd/permissions/columns/note';
    // With V2 already active, even an admin tab must not mutate old ACL/leases.
    await assertFails(set(ref(db,legacyPermissions),true));
    await assertFails(set(ref(db,'hdnd/editLocks/r1/note'),{
      uid:'administrator',session:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      token:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',revision:1,
      kind:'multiline',acquiredAt:Date.now(),expiresAt:Date.now()+20000
    }));
    // Build a synthetic PRE-activation legacy state with an acknowledged freeze.
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,DATASET_V2_PATH),null);
      await set(ref(ctx.database() as never,'hdnd/freezeControl'),{
        mode:'FROZEN',revision:7,epoch:2,actor:'administrator',
        changedAt:1000,deadline:0,closedAt:1000
      });
    });
    await assertFails(set(ref(db,legacyPermissions),true));
    await assertFails(set(ref(db,'hdnd/editLocks/r1/note'),{
      uid:'administrator',session:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      token:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',revision:1,
      kind:'multiline',acquiredAt:Date.now(),expiresAt:Date.now()+20000
    }));
    // A cleared freeze without V2 activation restores ordinary legacy rights
    // administration. This guard does not disable all admin work forever.
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,'hdnd/freezeControl/mode'),'OPEN');
    });
    await assertSucceeds(set(ref(db,legacyPermissions),true));
  },25000);

  it('never lets guests write staging, active pointer, generations or read backup',async()=>{
    const db=guest();
    for(const path of ['candidates/fake','active','generations/gen_seed_initial/items/r1','backups/fake']){
      await assertFails(set(ref(db,DATASET_V2_PATH+'/'+path),{a:1}));
    }
    await assertFails(get(ref(db,DATASET_V2_PATH)));
    expect((await get(ref(db,DATASET_V2_PATH+'/active'))).exists()).toBe(true);
  });
});
