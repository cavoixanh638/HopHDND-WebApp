import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update,serverTimestamp,goOffline,goOnline} from 'firebase/database';
import type {User} from 'firebase/auth';
import {FirebaseRepository,type CellPermissions} from '../src/data/firebase-repository';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import type {Changes,Item} from '../shared/types';

// Legacy Firebase transactions run only in an isolated, emulator-only branch.
// Production hdnd/items stays frozen in the exact application rules.
const rules=JSON.parse(readFileSync('firebase/database.rules.json','utf8'));
const futureItems=structuredClone(rules.rules.hdnd.items);
futureItems['.write']=rules.rules.hdnd.profile['.write'];
futureItems.$id['.write']='auth != null && data.exists() && newData.exists()';
rules.rules['hdnd-test']={'.read':'auth != null',items:futureItems};
const emulator=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
describe.skipIf(!emulator)('Firebase emulator: rules, transactions and realtime',()=>{
  let env:RulesTestEnvironment;
  const seed={...createDemoItems()[0],recordId:'r1',displayCode:'NQ01',revision:1,archivedAt:null};
  const adminClaims={email:'cavoixanh638@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com' as const}};
  const permission:CellPermissions={columns:{note:true,specialist:true,room:true}};
  const user=(uid:string,admin=false)=>({uid,email:admin?adminClaims.email:null,emailVerified:admin,providerData:admin?[{providerId:'google.com'}]:[]}) as unknown as User;
  const guest=(uid:string)=>env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).database();
  const repository=(uid:string)=>new FirebaseRepository(guest(uid) as never,()=>user(uid),()=>permission,'hdnd-test/items');
  const patch=(item:Item,changes:Changes)=>updateDraft(item,undefined,changes)!;
  beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{host:'127.0.0.1',port:9000,rules:JSON.stringify(rules)}});},30000);
  beforeEach(async()=>{await env.clearDatabase();await env.withSecurityRulesDisabled(async context=>{const {archivedAt,...row}=seed;await set(ref(context.database() as never),{'hdnd-test':{items:{r1:{...row,operationId:'seed',updatedAt:Date.now(),updatedBy:'admin'}}},hdnd:{permissions:permission}});});});
  afterAll(async()=>env?.cleanup());
  it('requires authentication for reads; rejects edits outside permission and fake admin provider',async()=>{
    await assertFails(get(ref(env.unauthenticatedContext().database() as never,'hdnd-test/items')));
    const db=guest('guest');await assertSucceeds(get(ref(db as never,'hdnd-test/items')));
    await assertFails(set(ref(db as never,'hdnd/permissions/columns/content'),true));
    const spoof=env.authenticatedContext('spoof',{...adminClaims,firebase:{sign_in_provider:'anonymous'}}).database();
    await assertFails(set(ref(spoof as never,'hdnd/permissions/columns/content'),true));
    const result=await repository('a').save([patch(seed,{content:'không được cấp quyền'})]);expect(result[0].ok).toBe(false);
  });
  it('admin configures columns/cells; deny per-cell overrides a column allow',async()=>{
    const admin=env.authenticatedContext('admin',adminClaims).database();
    await assertSucceeds(set(ref(admin as never,'hdnd/permissions/cells/r1/note'),false));
    const result=await repository('a').save([patch(seed,{note:'bị khóa tại máy chủ'})]);expect(result[0].ok).toBe(false);
    expect((await repository('a').list())[0].note).toBe(seed.note);
  });
  it('saves, confirms, broadcasts to a second browser and records history; replay does not duplicate',async()=>{
    const a=repository('a'),b=repository('b'),request=patch(seed,{note:'ghi chú mới'});
    await b.list();
    const received=new Promise<Item[]>((resolve,reject)=>{const timeout=setTimeout(()=>{stop();reject(new Error('No realtime update'));},5000);const stop=b.subscribe(rows=>{if(rows[0]?.note==='ghi chú mới'){clearTimeout(timeout);stop();resolve(rows);}},reject);});
    const result=await a.save([request]);expect(result[0].ok,result[0].message).toBe(true);
    expect((await received)[0].revision).toBe(2);
    expect((await a.history('r1'))[0].changes.note).toBe('ghi chú mới');
    expect((await a.save([request]))[0].ok).toBe(true);expect((await a.list())[0].revision).toBe(2);
  });
  it('same-cell stale edit conflicts; different-cell edits merge without overwriting',async()=>{
    const a=repository('a'),b=repository('b');await b.list();
    expect((await a.save([patch(seed,{note:'A'})]))[0].ok).toBe(true);
    expect((await b.save([patch(seed,{note:'B'})]))[0]).toMatchObject({ok:false,error:'CONFLICT'});
    expect((await b.save([patch(seed,{specialist:'Chuyên viên B'})]))[0].ok).toBe(true);
    expect((await a.list())[0]).toMatchObject({note:'A',specialist:'Chuyên viên B',revision:3});
  });
  it('blocks bypass of UI: ID/STT, unknown fields, formulas-as-code, create and delete',async()=>{
    const db=guest('a');
    await assertFails(update(ref(db as never,'hdnd-test/items/r1'),{stt:100}));
    await assertFails(update(ref(db as never,'hdnd-test/items/r1'),{displayCode:'NQ99'}));
    await assertFails(update(ref(db as never,'hdnd-test/items/r1'),{evil:'payload'}));
    await assertFails(set(ref(db as never,'hdnd-test/items/r2'),seed));
    await assertFails(set(ref(db as never,'hdnd-test/items/r1'),null));
    // Strings beginning '=' remain inert database text, never sheet formulas.
    expect((await repository('a').save([patch(seed,{note:'=SUM(1,2)'})]))[0].ok).toBe(true);
  });
  it('admin import adds rows atomically, rejects duplicates, and profile uses JSON for names containing dots/slashes',async()=>{
    const db=env.authenticatedContext('admin',adminClaims).database();
    const admin=new FirebaseRepository(db as never,()=>user('admin',true),()=>permission,'hdnd-test/items');
    await admin.importItems([{...seed,recordId:'r2',displayCode:'NQ02'}]);expect(await admin.list()).toHaveLength(2);
    await expect(admin.importItems([{...seed,recordId:'r3',displayCode:'NQ02'}])).rejects.toThrow(/tồn tại/);
    await assertSucceeds(set(ref(db as never,'hdnd/profile'),{revision:1,payload:JSON.stringify({specialistRooms:{'Q.CVP / An':['Phòng A']}})}));
    await assertFails(set(ref(guest('a') as never,'hdnd/profile'),{revision:2,payload:'{}'}));
  });
  it('offline write stays pending until reconnect, then is confirmed by the server',async()=>{
    const db=guest('offline'),repo=new FirebaseRepository(db as never,()=>user('offline'),()=>permission,'hdnd-test/items');await repo.list();goOffline(db as never);
    let finished=false;const pending=repo.save([patch(seed,{note:'giữ khi mất mạng'})]).then(result=>{finished=true;return result;});
    await new Promise(resolve=>setTimeout(resolve,150));expect(finished).toBe(false);
    goOnline(db as never);expect((await pending)[0].ok).toBe(true);
  });
  it('enforces field permissions even when a modified client claims all columns are editable',async()=>{
    const modified=new FirebaseRepository(guest('modified') as never,()=>user('modified'),()=>({columns:{content:true}}),'hdnd-test/items');
    expect((await modified.save([patch(seed,{content:'attempted UI bypass'})]))[0].ok).toBe(false);
    expect((await repository('reader').list())[0].content).toBe(seed.content);
  });
  it('freezes production Firebase rows for guests and admin until official migration',async()=>{
    const admin=env.authenticatedContext('admin',adminClaims).database();
    await env.withSecurityRulesDisabled(async context=>{await set(ref(context.database() as never,'hdnd/items/r1'),seed);});
    for(const db of [admin,guest('bypass')]){
      await assertFails(set(ref(db as never,'hdnd/items/r2'),seed));
      await assertFails(update(ref(db as never,'hdnd/items/r1'),{note:'bypass'}));
      await assertFails(set(ref(db as never,'hdnd/items'),null));
    }
  });
  it('only verified Google admin changes any shared configuration, including direct REST-style updates',async()=>{
    const claims=[undefined,{firebase:{sign_in_provider:'anonymous'}},{...adminClaims,email:'someone@gmail.com'},{...adminClaims,email_verified:false},{...adminClaims,firebase:{sign_in_provider:'password'}}] as const;
    for(const [index,claim] of claims.entries()){
      const db=(claim?env.authenticatedContext('denied'+index,claim):env.unauthenticatedContext()).database();
      for(const [path,value] of [['hdnd/profile',{revision:1,payload:'{}'}],['hdnd/permissions/columns/note',true],['hdnd/permissions/rows/sheet:42:row:3',true],['hdnd/permissions/cells/sheet:42:row:3/note',true]] as const){
        await assertFails(set(ref(db as never,path),value));
      }
      await assertFails(update(ref(db as never),{'hdnd/profile':{revision:1,payload:'{}'},'hdnd/permissions/columns/content':true}));
    }
  });
  it('admin saves Sheets row/cell permissions without importing any business row',async()=>{
    const db=env.authenticatedContext('admin',adminClaims).database();
    await assertSucceeds(set(ref(db as never,'hdnd/permissions/rows/sheet:42:row:3'),true));
    await assertSucceeds(set(ref(db as never,'hdnd/permissions/cells/sheet:42:row:3/note'),false));
    await assertFails(set(ref(db as never,'hdnd/permissions/cells/sheet:42:row:3/stt'),true));
    await assertFails(set(ref(db as never,'hdnd/permissions/rows/sheet:42:row:4'),'allow'));
    await assertSucceeds(set(ref(db as never,'hdnd/profile'),{revision:1,payload:'{}'}));
    await assertFails(set(ref(db as never,'hdnd/profile'),{revision:1,payload:'stale'}));
    await assertSucceeds(set(ref(db as never,'hdnd/profile'),{revision:2,payload:'{}'}));
  });
  it('retains exactly the last 50 history entries after more than 50 saves',async()=>{
    const repo=repository('history');let current=(await repo.list())[0];
    for(let index=1;index<=52;index++){
      const result=(await repo.save([patch(current,{note:`lần ${index}`})]))[0];
      expect(result.ok,result.message).toBe(true);current=result.item!;
    }
    const entries=await repo.history('r1');expect(entries).toHaveLength(50);expect(entries[0].changes.note).toBe('lần 3');expect(entries.at(-1)?.changes.note).toBe('lần 52');
  },20000);
});
