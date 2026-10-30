import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {assertFails,assertSucceeds,initializeTestEnvironment,
  type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update} from 'firebase/database';
import {createDemoItems} from '../src/data/demo-items';
import {DATASET_V2_PATH} from '../src/data/firebase-versioned-replacement';

// All actions below use Firebase RTDB SDK and the unmodified candidate Rules.
// Elevated access is restricted to fixture insertion (never subject operations).
const isEmulator=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const rules=readFileSync('firebase/database.exclusive-candidate.rules.json','utf8');
const claims={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com' as const}};
const prefix=DATASET_V2_PATH;
const data=()=>createDemoItems(2).map((row,i)=>({...row,recordId:'l3r'+i,
  displayCode:'NQ'+(i+41),revision:1,archivedAt:null,isDropped:false}));
const fixture=()=>{
  const first=data(),second=data().map(row=>({...row,content:'Thế hệ mới',note:'Mới'}));
  return {hdnd:{items:{legacy:first[0]},
    datasetV2:{
      active:{generationId:'gen_second',operationId:'l3_second_operation',revision:2,
        rowCount:2,digest:'b'.repeat(64)},
      generations:{
        gen_first:{items:Object.fromEntries(first.map(row=>[row.recordId,row]))},
        gen_second:{items:Object.fromEntries(second.map(row=>[row.recordId,row]))}
      },
      permissions:{
        gen_first:{columns:{note:true}},
        gen_second:{columns:{}}
      },
      leases:{gen_first:{l3r0:{note:{uid:'guest',session:'prior',token:'prior',
        kind:'multiline',revision:1,acquiredAt:1,expiresAt:9999999999999}}}},
      candidates:{l3_private_candidate:'private staging fixture'},
      backups:{l3_private_backup:'private backup fixture'},
      operations:{l3_second_operation:{status:'COMMITTED',from:'gen_first',
        to:'gen_second',at:1}}
    }
  }};
};

describe.skipIf(!isEmulator)('PR95 L3 REAL RTDB Rules, independent adversarial security',()=>{
  let env:RulesTestEnvironment;
  const admin=()=>env.authenticatedContext('l3-admin',claims).database() as never;
  const guest=()=>env.authenticatedContext('l3-editor',{firebase:{
    sign_in_provider:'anonymous'}}).database() as never;
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-hdnd-pr95-l3-rules',
      database:{host:'127.0.0.1',port:9000,rules}});
  },30000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never),fixture());
    });
  });
  afterAll(async()=>env.cleanup());

  it('viewer sees ONLY active rows/pointer, not private candidate, backup or operation log',async()=>{
    const db=guest();
    const active=(await assertSucceeds(get(ref(db,prefix+'/active')))).val();
    expect(active.generationId).toBe('gen_second');
    expect((await assertSucceeds(get(ref(db,prefix+'/generations/gen_second/items')))).exists())
      .toBe(true);
    for(const path of [
      'generations/gen_first/items','permissions/gen_first',
      'candidates/l3_private_candidate','backups/l3_private_backup',
      'operations/l3_second_operation'
    ])await assertFails(get(ref(db,prefix+'/'+path)));
    expect((await assertSucceeds(get(ref(admin(),prefix+'/backups/l3_private_backup'))))
      .val()).toBe('private backup fixture');
  },25000);

  it('guest cannot alter active, staging, backup, operations or permissions',async()=>{
    const db=guest();
    for(const path of [
      'active/generationId','candidates/l3_forbidden_operation',
      'backups/l3_forbidden_operation','operations/l3_forbidden_operation',
      'permissions/gen_second/columns/note'
    ])await assertFails(set(ref(db,prefix+'/'+path),'tampered'));
  },25000);

  it('must fence old legacy hdnd/items after V2 activation, including administrator',async()=>{
    await assertFails(set(ref(admin(),'hdnd/items/legacy'),{...data()[0],note:'stale'}));
    await assertFails(set(ref(guest(),'hdnd/items/legacy'),{...data()[0],note:'stale'}));
  });

  it('must fence stale generation writes even by old admin tab',async()=>{
    // Same admin identity must not bypass epoch fencing merely because the
    // session is trusted. Failure here is a SECURITY finding, not a mock result.
    await assertFails(update(ref(admin(),prefix+'/generations/gen_first/items/l3r0'),
      {note:'stale write via old tab',revision:2}));
    await assertFails(set(ref(guest(),prefix+'/generations/gen_first/items/l3r0/note'),
      'stale write via guest'));
  });

  it('reused displayCode cannot copy past generation rights, history or lease',async()=>{
    const db=guest();
    const current=(await get(ref(db,prefix+'/generations/gen_second/items/l3r0'))).val();
    expect(current.displayCode).toBe('NQ41');
    await assertFails(set(ref(db,prefix+'/generations/gen_second/items/l3r0/note'),
      'Old rights must not apply'));
    await assertFails(set(ref(db,prefix+'/leases/gen_first/l3r0/note'),{
      uid:'l3-editor',session:'99999999-9999-4999-8999-999999999999',
      token:'88888888-8888-4888-8888-888888888888',revision:2,
      kind:'multiline',acquiredAt:Date.now(),expiresAt:Date.now()+10000
    }));
    expect((await get(ref(admin(),prefix+'/permissions/gen_second/columns/note'))).exists())
      .toBe(false);
  },25000);
});
