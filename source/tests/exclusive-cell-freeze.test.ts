import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update} from 'firebase/database';
import type {User} from 'firebase/auth';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {CellEditSessionManager,lockPath} from '../src/data/cell-edit-leases';
import {initialFreeze,readFreeze,setFreezeMode,activeEditLeaseCount} from '../src/data/freeze-control';
import {migrateMirrorToPrimary} from '../src/data/firebase-primary-bootstrap';
import {parseSheetConfig,DEFAULT_SHEET_URL} from '../src/data/sheet-config';

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
  it('accepts approved one-time primary import under exclusive candidate Rules (no live Sheets)',async()=>{
    const source=parseSheetConfig(DEFAULT_SHEET_URL);
    const recordId=source.spreadsheetId+':'+source.gid+':row:3';
    const mirrored={...row,recordId,displayCode:'NQ-IM1',stt:3};
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.database() as never;
      await set(ref(db,'hdnd/items'),null);
      await set(ref(db,'hdnd/mirrors/'+source.spreadsheetId+'/'+source.gid),{
        schemaVersion:1,source:source.spreadsheetId+':'+source.gid,
        syncedAt:'2026-10-25T00:00:00Z',sourceModifiedAt:'2026-10-24T23:00:00Z',
        sha256:'a'.repeat(64),rows:[mirrored]
      });
    });
    const result=await migrateMirrorToPrimary(admin() as never,actor('administrator',true),source);
    expect(result).toEqual({sourceCount:1,importedCount:1});
    const imported=(await get(ref(admin() as never,'hdnd/items/'+recordId))).val();
    expect(imported.recordId).toBe(recordId);
    await expect(migrateMirrorToPrimary(admin() as never,actor('administrator',true),source))
      .rejects.toThrow(/đã có dữ liệu/);
  });
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
  it('refuses to let a guest monopolize a field without effective permission',async()=>{
    const stranger=manager('a');
    await expect(stranger.acquire('r1','department','short')).rejects.toThrow();
    const snapshot=(await get(ref(guest('a') as never,'hdnd/editLocks/r1/department'))).val();
    expect(snapshot).toBe(null);
    const granted=manager('a');
    await granted.acquire('r1','note','multiline');
    await granted.cancel('r1','note');
    await stranger.dispose();await granted.dispose();
  });
  it('guest pause blocks new leases while a verified admin can still edit',async()=>{
    await set(ref(admin() as never,'hdnd/control'),{revision:2,editingLocked:true,changedAt:new Date().toISOString()});
    const guestManager=manager('guest'),adminManager=manager('administrator',true);
    await expect(guestManager.acquire('r1','note','multiline')).rejects.toThrow();
    expect(await adminManager.acquire('r1','note','multiline')).toBe(true);
    await adminManager.cancel('r1','note');
    await guestManager.dispose();await adminManager.dispose();
  });
  it('old tab cannot expire another lease after ownership changes within the same UID',async()=>{
    const first=manager('a'),nextTab=manager('a');
    await first.acquire('r1','note','multiline');
    const lockRef=ref(guest('a') as never,lockPath('r1','note'));
    const previous=(await get(lockRef)).val();
    await first.cancel('r1','note');
    await nextTab.acquire('r1','note','multiline');
    const current=(await get(lockRef)).val();
    expect(current.token).not.toBe(previous.token);
    await assertFails(update(lockRef,{session:previous.session,token:previous.token,
      expiresAt:0,revision:current.revision+1}));
    expect((await get(lockRef)).val().token).toBe(current.token);
    await nextTab.cancel('r1','note');
    await first.dispose();await nextTab.dispose();
  });
  it('rejects forging a longer edit category inside an active lease',async()=>{
    const a=manager('a');
    await a.acquire('r1','progressParty','status');
    const at=ref(guest('a') as never,lockPath('r1','progressParty'));
    const before=(await get(at)).val();
    await assertFails(update(at,{kind:'long',revision:before.revision+1}));
    expect((await get(at)).val().kind).toBe('status');
    await a.dispose();
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
  it('publishes a server-ACKed edit to two other accounts via live RTDB onValue, without reloading',async()=>{
    const session=manager('a');
    const writer=repo('a',session);
    const readerB=repo('b',manager('b'));
    const readerAdmin=repo('administrator',manager('administrator',true),true);
    const awaitUpdate=(client:FirebaseRepository,label:string)=>new Promise<void>((resolve,reject)=>{
      let stop=()=>{};
      const timeout=setTimeout(()=>{stop();reject(new Error('Missing realtime update for '+label));},7000);
      stop=client.subscribe(rows=>{
        if(rows.find(item=>item.recordId==='r1')?.note==='Realtime đã được xác nhận'){
          clearTimeout(timeout);queueMicrotask(stop);resolve();
        }
      },error=>{clearTimeout(timeout);stop();reject(error);});
    });
    // Both observers subscribe before the writer sends anything to the server.
    const fromB=awaitUpdate(readerB,'independent anonymous account');
    const fromAdmin=awaitUpdate(readerAdmin,'authenticated administrator');
    const [original]=await writer.list();
    await session.acquire('r1','note','multiline');
    const result=(await writer.save([updateDraft(original,undefined,{note:'Realtime đã được xác nhận'})!]))[0];
    expect(result.ok,result.message).toBe(true);
    expect(result.item?.revision).toBe(original.revision+1);
    await Promise.all([fromB,fromAdmin]);
    expect((await readerB.list())[0].note).toBe('Realtime đã được xác nhận');
    expect((await readerAdmin.list())[0].note).toBe('Realtime đã được xác nhận');
    await session.finish('r1','note');
    await session.dispose();
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
  it('server rejects all edits after DRAINING deadline even if admin browser disappeared',async()=>{
    const a=manager('a'),writer=repo('a',a);
    const [old]=await writer.list();
    await a.acquire('r1','note','multiline');
    const lease=(await get(ref(guest('a') as never,lockPath('r1','note')))).val();
    const now=Date.now();
    await env.withSecurityRulesDisabled(async ctx=>{
      await set(ref(ctx.database() as never,'hdnd/freezeControl'),{
        mode:'DRAINING',revision:1,epoch:1,actor:'administrator',
        changedAt:lease.acquiredAt+2000,deadline:now-1000,closedAt:0
      });
    });
    // A raw authenticated write and the normal editor save both fail closed.
    const locked=await writer.save([updateDraft(old,undefined,{note:'late after drain'})!]);
    expect(locked[0].ok).toBe(false);
    const after=(await writer.list())[0];
    expect(after.note).toBe(old.note);
    const current=(await get(ref(guest('a') as never,lockPath('r1','note')))).val();
    await assertFails(update(ref(guest('a') as never,lockPath('r1','note')),{
      token:current.token,session:current.session,revision:current.revision+1,
      expiresAt:Date.now()+40000
    }));
    await a.cancel('r1','note');
    await a.dispose();
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
