import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,
  type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {updateDraft} from '../src/domain/items';
import {stageDatasetReplacement,readStagedDataset,commitDatasetReplacement,
  resolveDatasetOperation,restoreDatasetBackup,DATASET_V2_PATH} from
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
  it('never lets guests write staging, active pointer, generations or read backup',async()=>{
    const db=guest();
    for(const path of ['candidates/fake','active','generations/gen_seed_initial/items/r1','backups/fake']){
      await assertFails(set(ref(db,DATASET_V2_PATH+'/'+path),{a:1}));
    }
    await assertFails(get(ref(db,DATASET_V2_PATH)));
    expect((await get(ref(db,DATASET_V2_PATH+'/active'))).exists()).toBe(true);
  });
});
