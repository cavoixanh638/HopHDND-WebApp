import {readFileSync} from 'node:fs';
import {beforeAll,afterAll,beforeEach,describe,it,expect} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,
  type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {stageDatasetReplacement,readStagedDataset,commitDatasetReplacement,
  resolveDatasetOperation,restoreDatasetBackup,DATASET_V2_PATH} from
  '../src/data/firebase-versioned-replacement';

const emulator=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
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
    expect(await resolveDatasetOperation(db,op)).toBe('committed');
    const same=await commitDatasetReplacement(db,actor,approval,'THAY '+op+' 2 2');
    expect(same.status).toBe('already-committed');
    const restore='restore_pr95_0001';
    const recovered=await restoreDatasetBackup(db,actor,op,restore,active,'KHOI PHUC '+restore);
    expect(recovered.status).toBe('committed');
    const previous=(await get(ref(db,DATASET_V2_PATH+'/generations/gen_'+restore+'/items'))).val();
    expect(previous.r1.content).toBe(initialRows[0].content);
    expect((await get(ref(db,DATASET_V2_PATH+'/permissions/gen_'+restore+'/columns/note'))).val()).toBe(true);
    await assertFails(get(ref(guest(),DATASET_V2_PATH+'/backups/'+op)));
  },30000);

  it('rejects in-generation edits after review even if the active pointer is unchanged',async()=>{
    const db=admin(),op='pr95_import_0002';
    const approval=await stageDatasetReplacement(db,actor,replacement(),op,'test.xlsx');
    await assertSucceeds(update(ref(db,DATASET_V2_PATH+'/generations/gen_seed_initial/items/r1'),
      {note:'Thay đổi sau duyệt'}));
    await expect(commitDatasetReplacement(db,actor,approval,'THAY '+op+' 2 2'))
      .rejects.toThrow('cùng thế hệ');
    expect((await get(ref(db,DATASET_V2_PATH+'/active/generationId'))).val())
      .toBe('gen_seed_initial');
  },20000);

  it('two tabs use different operationIds: only first CAS wins',async()=>{
    const db=admin();
    const a=await stageDatasetReplacement(db,actor,replacement(),'pr95_import_0003','a.xlsx');
    const b=await stageDatasetReplacement(db,actor,replacement(),'pr95_import_0004','b.xlsx');
    expect((await commitDatasetReplacement(db,actor,a,'THAY pr95_import_0003 2 2')).status)
      .toBe('committed');
    await expect(commitDatasetReplacement(db,actor,b,'THAY pr95_import_0004 2 2'))
      .rejects.toThrow();
    expect(await resolveDatasetOperation(db,'pr95_import_0004')).toBe('not-committed');
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
