/** PR142 isolated regression: source-aware freeze counting and receipts.
 * Auth+RTDB Emulator only. No production credentials/network.
 * These are acceptance tests for the PATCH, not the old known-bad SHA.
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,serverTimestamp} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {acquireCellLease,releaseCellLease} from '../src/data/cell-edit-leases';
import {
  activeEditLeaseCount,readActiveLeaseSnapshot,readActiveDatasetPointer,
  readFreeze,setFreezeMode,createFreezeReceipt,freezeReceiptIsCurrent
} from '../src/data/freeze-control';
import {stageDatasetReplacement,commitDatasetReplacement} from '../src/data/firebase-versioned-replacement';

const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000'&&
  process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099';
const rules=readFileSync('firebase/database.exclusive-candidate.rules.json','utf8');
const claims={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com' as const}};
const user={uid:'administrator',email:claims.email,emailVerified:true,
  providerData:[{providerId:'google.com'}]} as User;
const OP_A='pr142_freeze_generation_a';
const GEN_A='gen_'+OP_A;
const OP_B='pr142_freeze_generation_b';
const GEN_B='gen_'+OP_B;
const digestA='a'.repeat(64);
const makeRow=(id:string,note:string)=>({
  ...createDemoItems()[0],recordId:id,displayCode:'CODE_'+id,revision:1,
  archivedAt:null,operationId:'seed_'+id,updatedAt:1,updatedBy:'administrator',note
});
const legacy=makeRow('legacy','LEGACY_ONLY_ROW');
const a=makeRow('v2a','CURRENT_V2_A');
const b=makeRow('v2b','CURRENT_V2_B');
const pointerA={generationId:GEN_A,operationId:OP_A,revision:1,rowCount:2,digest:digestA};
const open={mode:'OPEN',revision:1,epoch:0,actor:'administrator',changedAt:1,deadline:0,closedAt:0};
const fixture=(v2=true)=>({hdnd:{
  items:{legacy},
  permissions:{columns:{note:true}},
  control:{revision:1,editingLocked:false,changedAt:'2026-11-01T00:00:00.000Z'},
  freezeControl:open,
  ...(v2?{datasetV2:{
    active:pointerA,generations:{[GEN_A]:{items:{v2a:a,v2b:b}}},
    permissions:{[GEN_A]:{columns:{note:true}}},
    operations:{[OP_A]:{status:'COMMITTED',from:'legacy',to:GEN_A,at:1}}
  }}:{})
}});
const sha=(rows:Record<string,unknown>)=>createHash('sha256')
  .update(JSON.stringify(Object.keys(rows).sort().map(id=>[id,rows[id]]))).digest('hex');

describe.skipIf(!enabled)('PR142 V2 freeze F1-F5 + pointer/generation fencing',()=>{
  let env:RulesTestEnvironment;
  const admin=()=>env.authenticatedContext('administrator',claims).database() as never;
  const server=async(path='hdnd'):Promise<any>=>{
    let observed:any=null;
    await env.withSecurityRulesDisabled(async ctx=>{
      observed=(await get(ref(ctx.database() as never,path))).val();
    });
    return observed;
  };
  const reset=async(v2=true)=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database() as never),fixture(v2)));
  };
  const acquire=(id:string,generationId?:string)=>acquireCellLease(admin(),user,
    crypto.randomUUID(),id,'note','multiline',generationId);
  const swap=async()=>{
    const db=admin();
    const replacement=createDemoItems(2).map((row,i)=>({...row,
      recordId:'newv2'+i,displayCode:'NEW-'+i,revision:1,archivedAt:null,
      isDropped:false,note:'POST_SWAP_'+i}));
    const approval=await stageDatasetReplacement(db,user,replacement,OP_B,'swap.xlsx');
    const committed=await commitDatasetReplacement(db,user,approval,
      'THAY '+OP_B+' '+approval.preview.oldCount+' '+approval.preview.newCount);
    expect(committed.status).toMatch(/committed/);
    expect((await readActiveDatasetPointer(db))?.generationId).toBe(GEN_B);
  };
  beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-hdnd-pr142-freeze',
    database:{host:'127.0.0.1',port:9000,rules}});},30000);
  beforeEach(async()=>reset());
  afterAll(async()=>env?.cleanup());

  it('F1: counts only live leases under the active V2 generation; ignores inactive and tombstones',async()=>{
    const db=admin();
    const lease=await acquire('v2a',GEN_A);
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,
        'hdnd/datasetV2/leases/gen_inactive/r1/note'),
        {...lease,expiresAt:lease.expiresAt+5000});
      await set(ref(ctx.database() as never,
        'hdnd/datasetV2/leases/'+GEN_A+'/v2b/note'),
        {...lease,revision:2,expiresAt:0});
      await set(ref(ctx.database() as never,'hdnd/editLocks/legacy/note'),
        {...lease,expiresAt:lease.expiresAt+1000});
    });
    const snapshot=await readActiveLeaseSnapshot(db);
    expect(snapshot.count).toBe(1);
    expect(snapshot.source).toBe('v2');
    expect(snapshot.active).toEqual(pointerA);
    expect(await activeEditLeaseCount(db)).toBe(1);
    expect((await server('hdnd/datasetV2/leases/'+GEN_A+'/v2a/note')).expiresAt)
      .toBeGreaterThan(snapshot.asOfServerTime);
  });

  it('F2: normal DRAINING must refuse FROZEN while a live V2 lease remains',async()=>{
    const db=admin();
    const lease=await acquire('v2a',GEN_A);
    const draining=await setFreezeMode(db,user,await readFreeze(db),'DRAINING');
    const before=await server('hdnd/freezeControl');
    expect(draining.datasetV2).toEqual(pointerA);
    await expect(setFreezeMode(db,user,draining,'FROZEN',false)).rejects.toThrow(/Còn 1 ô/);
    expect(await server('hdnd/freezeControl')).toEqual(before);
    await releaseCellLease(db,lease,'v2a','note',GEN_A);
    expect(await activeEditLeaseCount(db)).toBe(0);
    const frozen=await setFreezeMode(db,user,draining,'FROZEN',false);
    expect(frozen.mode).toBe('FROZEN');
    expect(frozen.closeKind).toBe('orderly');
    const receipt=await createFreezeReceipt(db,user,frozen.epoch);
    expect(receipt.closeKind).toBe('orderly');
    expect(receipt.rows).toBe(2);
  });

  it('F3: emergency FROZEN is allowed with an active V2 lease; receipt hashes V2, not legacy',async()=>{
    const db=admin();
    await acquire('v2a',GEN_A);
    const frozen=await setFreezeMode(db,user,await readFreeze(db),'FROZEN',true);
    expect(frozen.closeKind).toBe('forced');
    expect(await activeEditLeaseCount(db)).toBe(1);
    const receipt=await createFreezeReceipt(db,user,frozen.epoch);
    const legacyRows=await server('hdnd/items') as Record<string,unknown>;
    const v2Rows=await server('hdnd/datasetV2/generations/'+GEN_A+'/items') as Record<string,unknown>;
    expect(receipt.datasetV2).toEqual(pointerA);
    expect(receipt.closeKind).toBe('forced');
    expect(receipt.rows).toBe(2);
    expect(receipt.sha256).toBe(sha(v2Rows));
    expect(receipt.sha256).not.toBe(sha(legacyRows));
    expect(await server('hdnd/freezeReceipts/'+frozen.epoch)).toEqual(receipt);
  });

  it('F4a: after real authorized V2 parent CAS changes generation, stale frozen receipt is denied',async()=>{
    const db=admin();
    const frozen=await setFreezeMode(db,user,await readFreeze(db),'FROZEN',true);
    await swap(); // Real Rules-authorized parent CAS, not privileged pointer injection.
    await expect(createFreezeReceipt(db,user,frozen.epoch)).rejects.toThrow(/Generation/);
    expect(await server('hdnd/freezeReceipts/'+frozen.epoch)).toBeNull();
    expect((await server('hdnd/freezeControl')).datasetV2.generationId).toBe(GEN_A);
  },30000);

  it('F4b: pointer change while DRAINING forbids ordinary close, but explicit emergency may close new V2',async()=>{
    const db=admin();
    const draining=await setFreezeMode(db,user,await readFreeze(db),'DRAINING');
    await swap();
    await expect(setFreezeMode(db,user,draining,'FROZEN',false))
      .rejects.toThrow(/Generation/);
    expect((await readFreeze(db)).mode).toBe('DRAINING');
    const frozen=await setFreezeMode(db,user,draining,'FROZEN',true);
    expect(frozen.datasetV2?.generationId).toBe(GEN_B);
    expect(frozen.closeKind).toBe('forced');
    expect((await createFreezeReceipt(db,user,frozen.epoch)).datasetV2?.generationId).toBe(GEN_B);
  },30000);

  it('F4c: Rules reject a stale V2-pointer receipt at the exact server write',async()=>{
    const db=admin();
    const frozen=await setFreezeMode(db,user,await readFreeze(db),'FROZEN',true);
    await swap();
    const stale={
      epoch:frozen.epoch,rows:2,sha256:'0'.repeat(64),actor:'administrator',
      frozenAt:frozen.closedAt,recordedAt:serverTimestamp(),
      datasetV2:pointerA,closeKind:'forced'
    };
    await assertFails(set(ref(db,'hdnd/freezeReceipts/'+frozen.epoch),stale));
    expect(await server('hdnd/freezeReceipts/'+frozen.epoch)).toBeNull();
  },30000);

  it('F4d: completed V2 receipt remains immutable historical evidence after pointer swap',async()=>{
    const db=admin();
    const frozen=await setFreezeMode(db,user,await readFreeze(db),'FROZEN',true);
    const receipt=await createFreezeReceipt(db,user,frozen.epoch);
    expect(freezeReceiptIsCurrent(receipt,frozen,pointerA)).toBe(true);
    await swap();
    expect(freezeReceiptIsCurrent(receipt,await readFreeze(db),await readActiveDatasetPointer(db)))
      .toBe(false);
    expect(await server('hdnd/freezeReceipts/'+frozen.epoch)).toEqual(receipt);
  },30000);

  it('F5: legacy count, orderly refusal, force and immutable receipt retain exact old shape',async()=>{
    await reset(false);
    const db=admin(),lease=await acquire('legacy');
    const draining=await setFreezeMode(db,user,await readFreeze(db),'DRAINING');
    expect(await activeEditLeaseCount(db)).toBe(1);
    const before=await server('hdnd/freezeControl');
    await expect(setFreezeMode(db,user,draining,'FROZEN',false)).rejects.toThrow(/Còn 1 ô/);
    expect(await server('hdnd/freezeControl')).toEqual(before);
    const forced=await setFreezeMode(db,user,draining,'FROZEN',true);
    expect(forced.datasetV2).toBeUndefined();
    expect(forced.closeKind).toBeUndefined();
    const receipt=await createFreezeReceipt(db,user,forced.epoch);
    expect(Object.keys(receipt).sort()).toEqual(
      ['actor','epoch','frozenAt','recordedAt','rows','sha256'].sort());
    expect(receipt.rows).toBe(1);
    expect(receipt.sha256).toBe(sha(await server('hdnd/items') as Record<string,unknown>));
    expect(lease.expiresAt).toBeGreaterThan(forced.closedAt);
  });

  it('failed lease reads or malformed data cannot silently yield zero',async()=>{
    const publicDb=env.unauthenticatedContext().database() as never;
    await expect(readActiveLeaseSnapshot(publicDb)).rejects.toThrow();
    await env.withSecurityRulesDisabled(async ctx=>
      set(ref(ctx.database() as never,'hdnd/datasetV2/leases/'+GEN_A+'/v2a/note'),
        {bad:'missingExpiresAt'}));
    await expect(readActiveLeaseSnapshot(admin())).rejects.toThrow(/khóa|hạn/);
  });
});
