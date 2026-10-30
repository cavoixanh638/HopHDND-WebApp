import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {assertFails,assertSucceeds,initializeTestEnvironment,
  type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {stageDatasetReplacement,commitDatasetReplacement,readStagedDataset,
  restoreDatasetBackup,resolveDatasetOperation,DATASET_V2_PATH} from
  '../src/data/firebase-versioned-replacement';

// These are genuine authenticated RTDB Emulator clients, with real Rules.
// Only initial seed() uses the privileged fixture builder.
const activeEmulator=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const rules=readFileSync('firebase/database.exclusive-candidate.rules.json','utf8');
const claims={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com' as const}};
const actor={uid:'l3-admin',email:claims.email,emailVerified:true,
  providerData:[{providerId:'google.com'}]} as User;
const old=()=>createDemoItems(2).map((row,i)=>({...row,
  recordId:'l3-original-'+i,displayCode:'NQ'+(i+70),
  revision:1,archivedAt:null,isDropped:false}));
const next=(label:string)=>createDemoItems(2).map((row,i)=>({...row,
  recordId:'l3-new-'+i,displayCode:'NQ'+(i+70),
  revision:1,archivedAt:null,isDropped:false,content:label+' '+i}));
const seed=()=>({hdnd:{
  datasetV2:{active:{generationId:'gen_l3_initial',operationId:'l3_initial_seed',revision:1,
    rowCount:2,digest:'a'.repeat(64)},
    generations:{gen_l3_initial:{items:Object.fromEntries(old().map(row=>
      [row.recordId,{...row,updatedBy:'l3-admin',updatedAt:1,operationId:'l3_initial_seed'}]))}},
    permissions:{gen_l3_initial:{columns:{note:true}}}
  },
  items:{legacy:old()[0]}
}});
const confirm=(op:string)=>'THAY '+op+' 2 2';

describe.skipIf(!activeEmulator)('PR95 L3 race/idempotency with REAL Firebase Emulator',()=>{
  let env:RulesTestEnvironment;
  // Separate Firebase apps/SDK caches, same UID: two browser tabs of ONE admin.
  const tabA=()=>env.authenticatedContext('l3-admin',claims).database() as never;
  const tabB=()=>env.authenticatedContext('l3-admin',claims).database() as never;
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-hdnd-pr95-l3-race',
      database:{host:'127.0.0.1',port:9000,rules}});
  },30000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never),seed());
    });
  });
  afterAll(async()=>env.cleanup());

  it('independent staging readback + immutable candidate and private backup',async()=>{
    const db=tabA(),op='l3_stage_readback_001';
    const approval=await stageDatasetReplacement(db,actor,next('Bản A'),op,'synthetic.xlsx');
    expect((await readStagedDataset(db,approval)).map(item=>item.displayCode))
      .toEqual(['NQ70','NQ71']);
    const backup=(await get(ref(db,DATASET_V2_PATH+'/backups/'+op))).val();
    expect(typeof backup).toBe('string');
    const parsed=JSON.parse(backup as string);
    expect(parsed.previous.generationId).toBe('gen_l3_initial');
    expect(Object.keys(parsed.generation.items)).toHaveLength(2);
    await assertFails(set(ref(db,DATASET_V2_PATH+'/candidates/'+op),'different file'));
    await assertFails(set(ref(db,DATASET_V2_PATH+'/backups/'+op),'forged backup'));
  },40000);

  it('same UID, two clients, both approvals before swap: exactly ONE CAS winner',async()=>{
    const a=tabA(),b=tabB();
    const [approvalA,approvalB]=await Promise.all([
      stageDatasetReplacement(a,actor,next('A'),'l3_parallel_op_0001','a.xlsx'),
      stageDatasetReplacement(b,actor,next('B'),'l3_parallel_op_0002','b.xlsx')
    ]);
    const [outA,outB]=await Promise.allSettled([
      commitDatasetReplacement(a,actor,approvalA,confirm(approvalA.operationId)),
      commitDatasetReplacement(b,actor,approvalB,confirm(approvalB.operationId))
    ]);
    const winners=[outA,outB].filter(x=>x.status==='fulfilled'&&x.value.status==='committed');
    expect(winners).toHaveLength(1);
    const active=(await get(ref(a,DATASET_V2_PATH+'/active'))).val();
    const intended=new Set([approvalA.manifest.generationId,approvalB.manifest.generationId]);
    expect(intended.has(active.generationId)).toBe(true);
    expect(active.revision).toBe(2);
    const other=active.operationId===approvalA.operationId?approvalB.operationId:approvalA.operationId;
    expect(await resolveDatasetOperation(a,other)).toBe('not-committed');
  },55000);

  it('real post-review same-generation write invalidates an approved replacement',async()=>{
    const a=tabA(),b=tabB(),op='l3_midreview_edit_001';
    const approval=await stageDatasetReplacement(a,actor,next('Bản trước'),'synthetic'.repeat(2)+'_001','synthetic.xlsx');
    // Stable operationId above is independent of this human-readable case ID.
    const recordPath=DATASET_V2_PATH+'/generations/gen_l3_initial/items/l3-original-0';
    await assertSucceeds(update(ref(b,recordPath),{note:'Sửa sau duyệt',revision:2}));
    await expect(commitDatasetReplacement(a,actor,approval,confirm(approval.operationId)))
      .rejects.toThrow(/cùng thế hệ|đã thay đổi|CAS/i);
    expect((await get(ref(a,DATASET_V2_PATH+'/active/generationId'))).val())
      .toBe('gen_l3_initial');
  },45000);

  it('same operationId cannot stage different payload or silently replay a second swap',async()=>{
    const db=tabA(),op='l3_duplicate_op_001';
    const approved=await stageDatasetReplacement(db,actor,next('Đầu tiên'),op,'a.xlsx');
    await expect(stageDatasetReplacement(tabB(),actor,next('Khác'),op,'b.xlsx'))
      .rejects.toThrow(/operationId|file khác|backup/i);
    const first=await commitDatasetReplacement(db,actor,approved,confirm(op));
    expect(first.status).toBe('committed');
    const repeat=await commitDatasetReplacement(tabB(),actor,approved,confirm(op));
    expect(repeat.status).toBe('already-committed');
    expect((await get(ref(db,DATASET_V2_PATH+'/active/revision'))).val()).toBe(2);
  },50000);

  it('historic COMMITTED operation remains resolvable after subsequent restore',async()=>{
    const db=tabA(),op='l3_history_op_001',restoreOp='l3_restore_op_001';
    const approval=await stageDatasetReplacement(db,actor,next('Lần 1'),op,'a.xlsx');
    expect((await commitDatasetReplacement(db,actor,approval,confirm(op))).status).toBe('committed');
    const expected=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect((await restoreDatasetBackup(db,actor,op,restoreOp,expected,
      'KHOI PHUC '+restoreOp)).status).toBe('committed');
    // This is a server log lookup, not a simulated lost network response.
    expect(await resolveDatasetOperation(tabB(),op)).toBe('committed');
    expect(await resolveDatasetOperation(tabB(),restoreOp)).toBe('committed');
  },55000);
});
