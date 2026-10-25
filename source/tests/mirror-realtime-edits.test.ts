import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,update} from 'firebase/database';
import type {User} from 'firebase/auth';
import {FirebaseMirrorRepository} from '../src/data/firebase-mirror-repository';
import {mirrorEditKey,mirrorEditsPath,parseMirrorEdits} from '../src/data/mirror-edit-overlay';
import {createDemoItems} from '../src/data/demo-items';
import {parseSheetConfig,DEFAULT_SHEET_URL} from '../src/data/sheet-config';
import {updateDraft} from '../src/domain/items';
import type {CellPermissions} from '../src/data/firebase-repository';

const emulator=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const rules=readFileSync('firebase/database.rules.json','utf8');
const source=parseSheetConfig(DEFAULT_SHEET_URL),sourceId=source.spreadsheetId+':'+source.gid;
const recordId=sourceId+':row:3',rowIndex='3';
const seed={...createDemoItems(1)[0],recordId,displayCode:'NQ01',revision:1,isDropped:false,archivedAt:null};
const snapshot={
  schemaVersion:1 as const,source:sourceId,syncedAt:'2026-10-25T00:00:00.000Z',
  sourceModifiedAt:'2026-10-24T00:00:00.000Z',sha256:'a'.repeat(64),rows:[seed]
};
const adminClaims={email:'cavoixanh638@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com' as const}};
const actor=(uid:string,admin=false)=>({uid,email:admin?adminClaims.email:null,
  emailVerified:admin,providerData:admin?[{providerId:'google.com'}]:[]}) as unknown as User;
const rights:CellPermissions={columns:{note:true,specificProgress:true,room:true}};
describe.skipIf(!emulator)('Live database mirror edits are protected and broadcast to all authorized viewers',()=>{
  let env:RulesTestEnvironment;
  const db=(uid:string,admin=false)=>admin?env.authenticatedContext(uid,adminClaims).database():
    env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).database();
  const repo=(uid:string,admin=false)=>new FirebaseMirrorRepository(db(uid,admin) as never,source,
    ()=>uid,true,false,()=>actor(uid,admin),()=>rights,()=>true);
  beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{
    host:'127.0.0.1',port:9000,rules
  }});},30000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async context=>{
      await set(ref(context.database() as never),{
        hdnd:{mirrors:{[source.spreadsheetId]:{[source.gid]:snapshot}},
          permissions:rights,control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()}}
      });
    });
  });
  afterAll(async()=>env?.cleanup());
  it('parses valid source-scoped IDs and rejects malformed or phantom edits',()=>{
    expect(mirrorEditKey(recordId,source)).toBe(rowIndex);
    expect(()=>mirrorEditKey('unrelated:row:3',source)).toThrow();
    expect(()=>parseMirrorEdits({'3':{revision:1,operationId:'abc',updatedAt:1,
      updatedBy:'anyone',values:{malicious:1}}})).toThrow();
  });
  it('saves a guest edit atomically and broadcasts to a second logged-in viewer',async()=>{
    const editor=repo('editor'),viewer=repo('viewer');
    const [base]=await editor.list();
    expect(base.note).toBe(seed.note);
    const received=new Promise<string>((resolve,reject)=>{
      const timeout=setTimeout(()=>{stop();reject(new Error('No live notification'));},5000);
      const stop=viewer.subscribe(rows=>{
        if(rows[0]?.note==='Cập nhật từ khách'){clearTimeout(timeout);stop();resolve(rows[0].note);}
      },reject);
    });
    const patch=updateDraft(base,undefined,{note:'Cập nhật từ khách'})!;
    const saved=(await editor.save([patch]))[0];
    expect(saved.ok,saved.message).toBe(true);
    expect(await received).toBe('Cập nhật từ khách');
    expect((await viewer.list())[0].note).toBe('Cập nhật từ khách');
    expect((await viewer.list())[0].progressParty).toBe(seed.progressParty);
    expect((await editor.save([patch]))[0].ok).toBe(true);
    expect((await get(ref(db('editor') as never,mirrorEditsPath(source)+'/3'))).val().revision).toBe(1);
  },12000);
  it('same-field concurrent edits reject stale writers, disjoint edits merge',async()=>{
    const a=repo('A'),b=repo('B'),baseline=(await a.list())[0];
    await b.list();
    expect((await a.save([updateDraft(baseline,undefined,{note:'Ghi A'})!]))[0].ok).toBe(true);
    expect((await b.save([updateDraft(baseline,undefined,{note:'Ghi B'})!]))[0].ok).toBe(false);
    expect((await b.save([updateDraft(baseline,undefined,{room:'Phòng B'})!]))[0].ok).toBe(true);
    expect((await a.list())[0]).toMatchObject({note:'Ghi A',room:'Phòng B'});
  });
  it('denies forged edits to ungranted fields and blocks locked guest, while admin can edit',async()=>{
    const visitor=db('viewer');
    const path=mirrorEditsPath(source)+'/3';
    const edit={revision:1,operationId:'nonce123',updatedAt:Date.now(),updatedBy:'viewer',values:{content:'Hacked'}};
    await assertFails(set(ref(visitor as never,path),edit));
    const client=repo('viewer'),base=(await client.list())[0];
    expect((await client.save([updateDraft(base,undefined,{content:'Lách quyền'})!]))[0].ok).toBe(false);
    await assertSucceeds(update(ref(db('verified-admin',true) as never,'hdnd/control'),{editingLocked:true,revision:2,changedAt:new Date().toISOString()}));
    expect((await client.save([updateDraft(base,undefined,{note:'Lách khóa'})!]))[0].ok).toBe(false);
    const authorized=repo('verified-admin',true);
    await authorized.list();
    expect((await authorized.save([updateDraft(base,undefined,{content:'Admin xác nhận'})!]))[0].ok).toBe(true);
    expect((await authorized.list())[0].content).toBe('Admin xác nhận');
  });
  it('refuses guest overwrites of the immutable Excel mirror and forged metadata',async()=>{
    const visitor=db('viewer'),path=mirrorEditsPath(source)+'/3';
    await assertFails(update(ref(visitor as never,'hdnd/mirrors/'+source.spreadsheetId+'/'+source.gid),{source:'bad'}));
    await assertFails(set(ref(visitor as never,path),null));
    await assertFails(set(ref(visitor as never,path),{
      revision:1,operationId:'bad',updatedBy:'another-user',updatedAt:Date.now(),
      values:{note:'forged'}
    }));
  });
});
