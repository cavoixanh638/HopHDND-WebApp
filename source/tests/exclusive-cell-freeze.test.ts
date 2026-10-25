import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {CellEditSessionManager,acquireCellLease,releaseCellLease,lockPath} from '../src/data/cell-edit-leases';
import {initialFreeze,readFreeze,setFreezeMode,activeEditLeaseCount} from '../src/data/freeze-control';

const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const candidate=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
const adminClaims={email:'cavoixanh638@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com' as const}};
const actor=(id:string,admin=false)=>({uid:id,email:admin?adminClaims.email:null,
  emailVerified:admin,providerData:admin?[{providerId:'google.com'}]:[]}) as User;
const row={...createDemoItems()[0],recordId:'r1',displayCode:'NQ01',revision:1,archivedAt:null};
describe.skipIf(!enabled)('exclusive cell edit leases + drain/freeze RTDB security',()=>{
  let env:RulesTestEnvironment;
  const guest=(id:string)=>env.authenticatedContext(id,{firebase:{sign_in_provider:'anonymous'}}).database();
  const admin=()=>env.authenticatedContext('administrator',adminClaims).database();
  const manager=(id:string,isAdmin=false)=>new CellEditSessionManager(
    (isAdmin?admin():guest(id)) as never,()=>actor(id,isAdmin));
  const repo=(id:string,session:CellEditSessionManager,isAdmin=false)=>{
    const r=new FirebaseRepository((isAdmin?admin():guest(id)) as never,()=>actor(id,isAdmin),
      ()=>({columns:{note:true,specificProgress:true,progressParty:true}}));
    r.leaseManager=session;return r;
  };
  beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-hdnd-exclusivity',database:{
    host:'127.0.0.1',port:9000,rules:JSON.stringify(candidate)
  }});},30000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async context=>{
      const {archivedAt,...record}=row;
      await set(ref(context.database() as never),{
        hdnd:{items:{r1:{...record,operationId:'initial',updatedAt:Date.now(),updatedBy:'administrator'}},
          permissions:{columns:{note:true,specificProgress:true,progressParty:true}},
          control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()}}
      });
    });
  });
  afterAll(async()=>env?.cleanup());
  it('only one of two different users (or two tabs same UID) can hold the same field',async()=>{
    const a=manager('a'),b=manager('b');
    expect(await a.acquire('r1','note','multiline')).toBe(true);
    await expect(b.acquire('r1','note','multiline')).rejects.toThrow(/đang được sửa/);
    const otherTab=manager('a');
    await expect(otherTab.acquire('r1','note','multiline')).rejects.toThrow();
    expect(await b.acquire('r1','specificProgress','multiline')).toBe(true);
    expect(await activeEditLeaseCount(guest('a') as never)).toBe(2);
    await a.cancel('r1','note');await b.cancel('r1','specificProgress');
    await a.dispose();await b.dispose();await otherTab.dispose();
  });
  it('server accepts separate fields on one row, rejects forged writes and rejects no-lease admin write',async()=>{
    const a=manager('a'),b=manager('b'),writerA=repo('a',a),writerB=repo('b',b);
    const original=(await writerA.list())[0];
    await a.acquire('r1','note','multiline');
    await b.acquire('r1','specificProgress','multiline');
    const first=(await writerA.save([updateDraft(original,undefined,{note:'Nội dung do A lưu'})!]))[0];
    expect(first.ok,first.message).toBe(true);
    const second=(await writerB.save([updateDraft(original,undefined,{specificProgress:'Tiến độ do B lưu'})!]))[0];
    expect(second.ok,second.message).toBe(true);
    const fresh=(await writerA.list())[0];
    expect(fresh.note).toBe('Nội dung do A lưu');
    expect(fresh.specificProgress).toBe('Tiến độ do B lưu');
    await assertFails(set(ref(guest('ungranted') as never,'hdnd/items/r1/note'),'bypass'));
    const adminWithoutLease=new FirebaseRepository(admin() as never,()=>actor('administrator',true),
      ()=>({columns:{note:true}}));
    const [base]=await adminWithoutLease.list();
    const denied=(await adminWithoutLease.save([updateDraft(base,undefined,{note:'Admin bypass'})!]))[0];
    expect(denied.ok).toBe(false);
    await a.cancel('r1','note');await b.cancel('r1','specificProgress');
    await a.dispose();await b.dispose();
  });
  it('DRAINING refuses new locks but accepts previously acquired save; then FROZEN rejects everyone',async()=>{
    const a=manager('a'),writer=repo('a',a),baseline=(await writer.list())[0];
    await a.acquire('r1','note','multiline');
    const drain=await setFreezeMode(admin() as never,actor('administrator',true),initialFreeze,'DRAINING');
    expect((await readFreeze(guest('a') as never)).mode).toBe('DRAINING');
    const b=manager('b');
    await expect(b.acquire('r1','progressParty','status')).rejects.toThrow(/chốt/);
    const saved=(await writer.save([updateDraft(baseline,undefined,{note:'Lưu trước chốt'})!]))[0];
    expect(saved.ok,saved.message).toBe(true);
    await a.finish('r1','note');
    const frozen=await setFreezeMode(admin() as never,actor('administrator',true),drain,'FROZEN');
    expect(frozen.mode).toBe('FROZEN');
    await assertFails(set(ref(admin() as never,'hdnd/items/r1/note'),'Admin cố vượt chốt'));
    await assertFails(set(ref(guest('b') as never,'hdnd/items/r1/note'),'Khách cố vượt chốt'));
    await expect(b.acquire('r1','note','multiline')).rejects.toThrow();
    const reopened=await setFreezeMode(admin() as never,actor('administrator',true),frozen,'OPEN');
    expect(reopened.mode).toBe('OPEN');
    await b.acquire('r1','note','multiline');
    await b.cancel('r1','note');await a.dispose();await b.dispose();
  });
  it('emergency freeze rejects in-flight old editor, whose locally retained values cannot become saved',async()=>{
    const a=manager('a'),writer=repo('a',a);
    const [original]=await writer.list();
    await a.acquire('r1','note','multiline');
    const frozen=await setFreezeMode(admin() as never,actor('administrator',true),initialFreeze,'FROZEN',true);
    expect(frozen.mode).toBe('FROZEN');
    const result=(await writer.save([updateDraft(original,undefined,{note:'Chưa từng được server xác nhận'})!]))[0];
    expect(result.ok).toBe(false);
    expect((await writer.list())[0].note).toBe(original.note);
    await a.dispose();
  });
});
