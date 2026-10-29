import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,it,expect} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment}
  from '@firebase/rules-unit-testing';
import {get,ref,set,update} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {
  planDatasetReplacement,stageDatasetReplacement,verifyStagedDataset,
  backupBeforeReplacement,activateDatasetReplacement,verifyReplacementOutcome,
  restoreDatasetBackup,itemsPathFor,permissionsPathFor
} from '../src/data/versioned-dataset-replacement';
const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const rules=JSON.parse(readFileSync('firebase/database.versioned-replacement-candidate.rules.json','utf8'));
const claims={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com'}};
const adminUser={uid:'admin',email:claims.email,emailVerified:true,isAnonymous:false,
  providerData:[{providerId:'google.com'}]} as User;
const row={...createDemoItems(1)[0],recordId:'r1',displayCode:'ID01',
  revision:1,archivedAt:null};
const newRow={...row,recordId:'r2',displayCode:'ID02',stt:2,
  content:'Nội dung mới sau thay toàn bộ'};
describe.skipIf(!enabled)('versioned full-replace candidate RTDB Rules (synthetic only)',()=>{
  let env:RulesTestEnvironment;
  const admin=()=>env.authenticatedContext('admin',claims).database();
  const anon=()=>env.authenticatedContext('anon',{firebase:{sign_in_provider:'anonymous'}}).database();
  beforeAll(async()=>{env=await initializeTestEnvironment({
    projectId:'demo-hdnd-versioned-import',database:{host:'127.0.0.1',port:9000,
      rules:JSON.stringify(rules)}
  });},30000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>{
      const {archivedAt,...base}=row;
      await set(ref(ctx.database() as never),{hdnd:{
        items:{r1:{...base,revision:1,operationId:'old',updatedBy:'admin',updatedAt:1}},
        permissions:{columns:{note:true},cells:{r1:{content:true}}},
        control:{revision:2,editingLocked:true},
        freezeControl:{mode:'FROZEN',revision:2,epoch:1,actor:'admin',changedAt:1,
          deadline:0,closedAt:1}
      }});
    });
  });
  afterAll(async()=>env?.cleanup());
  it('stages, verifies, backs up and atomically switches from old to complete new dataset',async()=>{
    const db=admin(),plan=await planDatasetReplacement(db as never,adminUser,
      'replacement.xlsx',[newRow]);
    expect(plan).toMatchObject({added:1,removed:1,changed:0});
    expect((await get(ref(anon() as never,'hdnd/items/r1'))).exists()).toBe(true);
    await stageDatasetReplacement(db as never,adminUser,plan);
    expect(await verifyStagedDataset(db as never,adminUser,plan))
      .toHaveLength(1);
    // Staging alone is not cutover: the old legacy set remains active.
    expect((await get(ref(anon() as never,'hdnd/items/r1'))).exists()).toBe(true);
    const backup=await backupBeforeReplacement(db as never,adminUser,plan);
    expect(Object.keys(backup.previousRows)).toEqual(['r1']);
    const switched=await activateDatasetReplacement(db as never,adminUser,plan,'replacement.xlsx');
    expect(switched.version).toBe(plan.version);
    expect(await verifyReplacementOutcome(db as never,plan.operationId,plan.digest))
      .toBe('APPLIED');
    const active=await get(ref(anon() as never,itemsPathFor(plan.version)));
    expect(Object.keys(active.val())).toEqual(['r2']);
    expect((await get(ref(anon() as never,'hdnd/items/r1'))).exists()).toBe(true);
    // New generation has no grants: old record's per-cell permissions cannot
    // be inherited even if the same recordId happens to be reused.
    expect((await get(ref(db as never,permissionsPathFor(plan.version)))).exists()).toBe(false);
    await assertFails(set(ref(anon() as never,permissionsPathFor(plan.version)),{
      columns:{note:true}}));
    // Once pointer moved, old generation can no longer be edited.
    await assertFails(update(ref(db as never,'hdnd/items/r1'),{note:'Không được'}));
    const restored=await restoreDatasetBackup(db as never,adminUser,
      plan.operationId,crypto.randomUUID());
    expect(restored.version).toBe('legacy');
    expect(await verifyReplacementOutcome(db as never,restored.operationId,
      backup.previousDigest)).toBe('APPLIED');
    expect((await get(ref(anon() as never,'hdnd/items/r1'))).exists()).toBe(true);
  },60000);
  it('blocks public stage/backup/cutover and prevents empty or stale preview',async()=>{
    const db=admin();
    await expect(planDatasetReplacement(db as never,adminUser,'empty.xlsx',[]))
      .rejects.toThrow('từ 1');
    const plan=await planDatasetReplacement(db as never,adminUser,'new.xlsx',[newRow]);
    await assertFails(set(ref(anon() as never,'hdnd/datasetVersions/'+plan.version),
      {manifest:{count:1,operationId:plan.operationId},items:{r2:{}}}));
    await assertFails(set(ref(anon() as never,'hdnd/activeDataset'),{
      version:plan.version,revision:1,operationId:plan.operationId,digest:plan.digest,
      switchedAt:Date.now(),switchedBy:'anon'}));
    await env.withSecurityRulesDisabled(async ctx=>{
      await update(ref(ctx.database() as never,'hdnd/items/r1'),
        {note:'Someone changed old data'});
    });
    await expect(stageDatasetReplacement(db as never,adminUser,plan))
      .rejects.toThrow('Nguồn dữ liệu đã thay đổi');
  },60000);
});
