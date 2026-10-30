import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {assertFails,assertSucceeds,initializeTestEnvironment,
  type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {updateDraft} from '../src/domain/items';
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
    expect(await resolveDatasetOperation(a,other)).toEqual({
      status:'not-committed',operationId:other
    });
  },55000);

  it('a legitimately leased and audited same-generation edit invalidates old approval',async()=>{
    const adminDb=tabA(),op='l3_midreview_edit_001';
    const approval=await stageDatasetReplacement(
      adminDb,actor,next('Bản trước'),op,'synthetic.xlsx');
    const generation=approval.expected.generationId;
    expect(generation).toBe('gen_l3_initial');

    // A non-admin editor exercises the ACTUAL Rules, not the admin write
    // privilege. The seed grants only note in this active generation.
    const editorDb=env.authenticatedContext('l3-midreview-editor',
      {firebase:{sign_in_provider:'anonymous'}}).database() as never;
    const editor={uid:'l3-midreview-editor',isAnonymous:true,email:null,
      emailVerified:false,providerData:[]} as unknown as User;
    const manager=new CellEditSessionManager(editorDb,()=>editor,generation);
    const rowsPath=DATASET_V2_PATH+'/generations/'+generation+'/items';
    const recordPath=rowsPath+'/l3-original-0';
    const repository=new FirebaseRepository(editorDb,()=>editor,
      ()=>({columns:{note:true}}),rowsPath,approval.expected);
    repository.leaseManager=manager;
    const before=(await repository.list()).find(row=>row.recordId==='l3-original-0');
    expect(before).toBeDefined();
    const changedNote='Sửa sau duyệt bằng lease hợp lệ';
    expect(before!.note).not.toBe(changedNote);

    try {
      // First prove an authorized lease and a REAL transactional edit under
      // unchanged candidate Rules; a permission_denied here MUST FAIL the test.
      expect(await manager.acquire(before!.recordId,'note','multiline')).toBe(true);
      const lease=(await get(ref(editorDb,DATASET_V2_PATH+'/leases/'+generation+
        '/'+before!.recordId+'/note'))).val();
      expect(lease).toMatchObject({uid:editor.uid,kind:'multiline',revision:1});
      expect(lease.token).toBe(manager.proof(before!.recordId,'note'));
      expect(lease.expiresAt).toBeGreaterThan(lease.acquiredAt);

      const patch=updateDraft(before!,undefined,{note:changedNote});
      expect(patch).toBeDefined();
      const [savedResult]=await repository.save([patch!]);
      expect(savedResult.ok,savedResult.message).toBe(true);
      expect(savedResult.item?.revision).toBe(before!.revision+1);

      // Prove server-acknowledged value, lease proof, revision AND structured
      // audit history; only after these assertions may stale approval be tested.
      const persisted=(await get(ref(adminDb,recordPath))).val();
      const history=persisted.history?.[String((before!.revision+1)%50)];
      expect(persisted).toMatchObject({
        recordId:before!.recordId,note:changedNote,revision:before!.revision+1,
        operationId:patch!.operationId,updatedBy:editor.uid,
        editProofs:{note:lease.token}
      });
      expect(persisted.updatedAt).toEqual(expect.any(Number));
      expect(history).toMatchObject({
        operationId:patch!.operationId,recordId:before!.recordId,
        actor:editor.uid,changes:{note:changedNote},oldValues:{note:before!.note}
      });
      expect(history.at).toEqual(expect.any(Number));
      expect(await repository.history(before!.recordId)).toEqual([
        expect.objectContaining({
          operationId:patch!.operationId,recordId:before!.recordId,
          changes:{note:changedNote},oldValues:{note:before!.note}
        })
      ]);
      expect((await get(ref(adminDb,DATASET_V2_PATH+'/active'))).val())
        .toEqual(approval.expected);

      await manager.finish(before!.recordId,'note');
      // The data itself (not only the lease) changed within the SAME active
      // generation while the pointer and reviewed approval remained unchanged.
      expect((await repository.list()).find(row=>row.recordId===before!.recordId)?.note)
        .toBe(changedNote);
      await expect(commitDatasetReplacement(adminDb,actor,approval,confirm(op)))
        .rejects.toThrow('Dữ liệu đang sử dụng đã bị sửa trong lúc duyệt, kể cả cùng thế hệ.');
      expect((await get(ref(adminDb,DATASET_V2_PATH+'/active'))).val())
        .toEqual(approval.expected);
      expect((await get(ref(adminDb,recordPath+'/note'))).val()).toBe(changedNote);
    } finally {
      await manager.dispose();
    }
  },55000);

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

  it('reports UNKNOWN if authenticated operation status cannot be read',async()=>{
    const guest=env.authenticatedContext('l3-guest',{
      firebase:{sign_in_provider:'anonymous'}}).database() as never;
    // Permission denial is a real unreadable server response; this does NOT
    // simulate a dropped ACK or prove network-loss recovery.
    expect(await resolveDatasetOperation(guest,'l3_unreadable_op_001')).toEqual({
      status:'unknown',operationId:'l3_unreadable_op_001'
    });
  });

  it('historic COMMITTED operation remains resolvable after subsequent restore',async()=>{
    const db=tabA(),op='l3_history_op_001',restoreOp='l3_restore_op_001';
    const approval=await stageDatasetReplacement(db,actor,next('Lần 1'),op,'a.xlsx');
    expect((await commitDatasetReplacement(db,actor,approval,confirm(op))).status).toBe('committed');
    const expected=(await get(ref(db,DATASET_V2_PATH+'/active'))).val();
    expect((await restoreDatasetBackup(db,actor,op,restoreOp,expected,
      'KHOI PHUC '+restoreOp)).status).toBe('committed');
    // This is a server log lookup, not a simulated lost network response.
    expect(await resolveDatasetOperation(tabB(),op)).toEqual({
      status:'committed-historical',operationId:op,generationId:'gen_'+op
    });
    expect(await resolveDatasetOperation(tabB(),restoreOp)).toEqual({
      status:'committed-active',operationId:restoreOp,generationId:'gen_'+restoreOp
    });
  },55000);
});
