/** PR190: actual Auth+RTDB emulator, exact generated Spark Rules. Not a mock. */
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously,type User} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,set,serverTimestamp,type Database} from 'firebase/database';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import {FirebaseRepository,type CellPermissions} from '../src/data/firebase-repository';
import {callSparkCellEdit} from '../src/data/spark-cell-api';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import type {Changes,Item,Patch} from '../shared/types';

const enabled=process.env.VITE_FIREBASE_WRITE_MODE==='spark'&&
  process.env.VITE_FIREBASE_STATUS_CAS==='true'&&
  process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099'&&
  process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
type Client={app:FirebaseApp;db:Database;user:User};
const baseGrants={partyLevel:true,progressParty:true,progressBuild:true,progressCouncil:true,isDropped:true,note:false};
const seedRow=():Record<string,any>=>{
  const {archivedAt:_ignore,...demo}=createDemoItems(1)[0];
  return {...demo,recordId:'r1',displayCode:'NQ01',partyLevel:'BCH',
    progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',
    progressCouncil:'Sở chưa trình',isDropped:false,
    revision:1,operationId:'seed',updatedAt:Date.now(),updatedBy:'seed'};
};
const activeV2={generationId:'gen_status_cas_1',operationId:'activate-1',
  revision:1,rowCount:1,digest:'a'.repeat(64)};

describe.skipIf(!enabled)('Direct Spark status CAS / adversarial live Rules, NO production writes',()=>{
  let env:RulesTestEnvironment,A:Client,B:Client;
  const managers:CellEditSessionManager[]=[];
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{
      host:'127.0.0.1',port:9000,rules:readFileSync('firebase/database.spark.rules.json','utf8')}});
    const newClient=async(tag:string):Promise<Client>=>{
      const app=initializeApp({apiKey:'demo-key',authDomain:'demo-hdnd.firebaseapp.com',
        projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com',
        appId:'direct-'+tag},'pr190-'+tag);
      const auth=getAuth(app);
      connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
      const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
      return {app,db,user:(await signInAnonymously(auth)).user};
    };
    A=await newClient('a');B=await newClient('b');
  });
  beforeEach(()=>env.clearDatabase());
  afterAll(async()=>{
    await Promise.allSettled(managers.map(m=>m.dispose()));
    await env.cleanup();
    await Promise.allSettled([A,B].map(c=>deleteApp(c.app)));
  });
  async function setup(grants:Partial<Record<keyof typeof baseGrants,boolean>>=baseGrants,
    mode:'OPEN'|'FROZEN'|'DRAINING'='OPEN',v2=false){
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:grants},
      freezeControl:{mode,revision:1,epoch:1,actor:'seed',changedAt:1,deadline:0,closedAt:0},
      ...(v2?{datasetV2:{active:activeV2}}:{})
    }}));
    return row;
  }
  function model(c:Client,grants:Partial<Record<keyof typeof baseGrants,boolean>>=baseGrants){
    return new FirebaseRepository(c.db,()=>c.user,
      ()=>({columns:grants} as CellPermissions),'hdnd/items');
  }
  const read=async()=>(await get(ref(A.db,'hdnd/items/r1'))).val();
  async function write(c:Client,changes:Changes,grants:Partial<Record<keyof typeof baseGrants,boolean>>=baseGrants){
    const m=model(c,grants);
    const patch=updateDraft((await m.list())[0],undefined,changes)!;
    return (await m.save([patch]))[0];
  }
  async function rawNoGrants(probe:Changes){
    const prior=await read();
    const r=seedRow();
    const field=Object.keys(probe)[0] as keyof typeof r;
    const bad={...r,...prior,...probe,revision:prior.revision+1,
      operationId:crypto.randomUUID(),updatedAt:serverTimestamp(),updatedBy:B.user.uid,
      history:{...(prior.history??{}),[String((prior.revision+1)%50)]:{
        recordId:'r1',operationId:'',at:serverTimestamp(),actor:B.user.uid,
        changes:probe,oldValues:{[field]:prior[field]}}}};
    bad.history[String(bad.revision%50)].operationId=bad.operationId;
    await assertFails(set(ref(B.db,'hdnd/items/r1'),bad));
  }
  it('single status CAS commits without a lock, with exactly one revision and audit event',async()=>{
    await setup();
    const saved=await write(A,{progressCouncil:'VP đang xử lý'});
    expect(saved.ok,saved.message).toBe(true);
    const row=await read();
    expect(row.revision).toBe(2);
    expect(row.progressCouncil).toBe('VP đang xử lý');
    expect(row.history['2'].changes).toEqual({progressCouncil:'VP đang xử lý'});
    expect(row.history['2'].oldValues).toEqual({progressCouncil:'Sở chưa trình'});
    const locks=await env.withSecurityRulesDisabled(async ctx=>
      (await get(ref(ctx.database(),'hdnd/editLocks'))).val());
    expect(locks??null).toBeNull(); // RulesTestEnvironment may return undefined for absent parent
  });
  it('all approved discrete status types use direct-CAS, including boolean withdrawal',async()=>{
    await setup();
    const first=await write(A,{isDropped:true});
    expect(first.ok,first.message).toBe(true);
    expect(first.item?.isDropped).toBe(true);
    expect((await read()).history['2'].changes).toEqual({isDropped:true});
    const second=await write(B,{progressParty:'VP đang xử lý'});
    expect(second.ok,second.message).toBe(true);
    expect((await read()).progressParty).toBe('VP đang xử lý');
    expect((await read()).revision).toBe(3);
    const locks=await env.withSecurityRulesDisabled(async ctx=>
      (await get(ref(ctx.database(),'hdnd/editLocks'))).val());
    expect(locks??null).toBeNull();
  });
  it('same-field simultaneous edits are first-CAS-wins, second draft conflicts',async()=>{
    await setup();
    const x=model(A),y=model(B);
    const row=(await x.list())[0];
    const one=updateDraft(row,undefined,{progressCouncil:'VP đang xử lý'})!;
    const two=updateDraft(row,undefined,{progressCouncil:'Đã có QĐ'})!;
    const [a,b]=await Promise.all([x.save([one]),y.save([two])]);
    expect([a[0].ok,b[0].ok].filter(Boolean)).toHaveLength(1);
    const persisted=await read();
    expect(persisted.revision).toBe(2);
    expect(Object.keys(persisted.history)).toEqual(['2']);
  });
  it('different status cells in same row merge in two separate revisions',async()=>{
    await setup();
    const x=model(A),y=model(B),row=(await x.list())[0];
    const one=updateDraft(row,undefined,{progressCouncil:'VP đang xử lý'})!;
    const two=updateDraft(row,undefined,{progressBuild:'Đã có QĐ'})!;
    const [a,b]=await Promise.all([x.save([one]),y.save([two])]);
    expect(a[0].ok,a[0].message).toBe(true);
    expect(b[0].ok,b[0].message).toBe(true);
    const persisted=await read();
    expect(persisted.revision).toBe(3);
    expect(persisted.progressCouncil).toBe('VP đang xử lý');
    expect(persisted.progressBuild).toBe('Đã có QĐ');
    expect(Object.keys(persisted.history)).toHaveLength(2);
  });
  it('partyLevel-only CAS derives valid dependent F/G statuses without a second grant',async()=>{
    await setup({partyLevel:true,progressParty:false,progressBuild:false,progressCouncil:false,isDropped:false,note:false});
    const grants={partyLevel:true,progressParty:false,progressBuild:false,progressCouncil:false,isDropped:false,note:false};
    const a=await write(A,{partyLevel:'Không'},grants);
    expect(a.ok,a.message).toBe(true);
    expect(a.item?.progressParty).toBe('Không phải trình');
    expect((await read()).history['2'].changes).toEqual({partyLevel:'Không',progressParty:'Không phải trình'});
    const b=await write(A,{partyLevel:'BCH'},grants);
    expect(b.ok,b.message).toBe(true);
    expect(b.item?.progressParty).toBe('Sở chưa trình');
    expect((await read()).revision).toBe(3);
  });
  it('a stale dependent F/G baseline aborts, preserving another user status',async()=>{
    await setup();
    const x=model(A),y=model(B);
    const old=(await x.list())[0];
    const oldLevel=updateDraft(old,undefined,{partyLevel:'Không'})!;
    expect((await y.save([updateDraft(old,undefined,{progressParty:'VP đang xử lý'})!]))[0].ok).toBe(true);
    expect((await x.save([oldLevel]))[0].ok).toBe(false);
    const current=await read();
    expect(current.partyLevel).toBe('BCH');
    expect(current.progressParty).toBe('VP đang xử lý');
    expect(current.revision).toBe(2);
  });
  it('permission absent/revoked or active exclusive old lease prevents direct status save',async()=>{
    await setup({partyLevel:false,progressParty:false,progressBuild:false,progressCouncil:false,isDropped:false,note:false});
    const forbidden=updateDraft((await model(A).list())[0],undefined,{progressCouncil:'VP đang xử lý'})!;
    await expect(callSparkCellEdit({action:'saveStatus',scope:'legacy',recordId:'r1',
      operationId:forbidden.operationId,patch:forbidden},A.db)).rejects.toThrow();
    await rawNoGrants({progressCouncil:'VP đang xử lý'});
    expect((await read()).revision).toBe(1);
    await env.withSecurityRulesDisabled(async ctx=>
      set(ref(ctx.database(),'hdnd/permissions/columns/progressCouncil'),true));
    const manager=new CellEditSessionManager(B.db,()=>B.user);managers.push(manager);
    await manager.acquire('r1','progressCouncil','status');
    const locked=await write(A,{progressCouncil:'VP đang xử lý'});
    expect(locked.ok).toBe(false);
    expect((await read()).revision).toBe(1);
    await manager.cancel('r1','progressCouncil');
    expect((await write(A,{progressCouncil:'VP đang xử lý'})).ok).toBe(true);
  });
  it('freeze, draining, active V2 and revoked session all fail closed',async()=>{
    for(const mode of ['FROZEN','DRAINING'] as const){
      await setup(baseGrants,mode);
      expect((await write(A,{progressCouncil:'VP đang xử lý'})).ok).toBe(false);
      expect((await read()).revision).toBe(1);
    }
    await setup(baseGrants,'OPEN',true);
    expect((await write(A,{progressCouncil:'VP đang xử lý'})).ok).toBe(false);
    await setup();
    await env.withSecurityRulesDisabled(async ctx=>
      set(ref(ctx.database(),'hdnd/sparkSessions/'+A.user.uid),{
        ownerUid:'revoked',admin:false,createdAt:1,expiresAt:0}));
    expect((await write(A,{progressCouncil:'VP đang xử lý'})).ok).toBe(false);
  });
  it('cannot forge a mixed text patch, invalid enums, or direct no-submit status',async()=>{
    await setup();
    const base=(await model(A).list())[0];
    for(const bad of [{note:'Hacked'},{progressParty:'Không phải trình'},
      {partyLevel:'INVALID'},{progressBuild:'Injected arbitrary text'},
      {progressCouncil:'Injected arbitrary text'},
      {progressCouncil:'VP đang xử lý',note:'Hacked'}]){
      const patch=updateDraft(base,undefined,bad)!;
      await expect(callSparkCellEdit({action:'saveStatus',scope:'legacy',recordId:'r1',
        operationId:patch.operationId,patch},A.db)).rejects.toThrow();
    }
    expect((await read()).revision).toBe(1);
  });
  it('rejects forged mixed status and text despite correctly formed row audit',async()=>{
    await setup();
    const prior=await read();
    const operationId=crypto.randomUUID(),revision=prior.revision+1;
    const attack={...prior,progressCouncil:'VP đang xử lý',note:'FORGED NOTE',
      revision,operationId,updatedAt:serverTimestamp(),updatedBy:A.user.uid,
      history:{...(prior.history??{}),[String(revision%50)]:{
        operationId,recordId:'r1',at:serverTimestamp(),actor:A.user.uid,
        changes:{progressCouncil:'VP đang xử lý',note:'FORGED NOTE'},
        oldValues:{progressCouncil:prior.progressCouncil,note:prior.note}
      }}};
    // The official status grant cannot silently elevate an unleased note edit.
    await assertFails(set(ref(A.db,'hdnd/items/r1'),attack));
    expect((await read()).revision).toBe(1);
    expect((await read()).note).toBe(prior.note);
  });
  it('rejects forged inconsistent dependent F/G pair and anonymous row creation',async()=>{
    await setup();
    const prior=await read(),operationId=crypto.randomUUID(),revision=2;
    const wrong={...prior,partyLevel:'Không',revision,operationId,
      updatedAt:serverTimestamp(),updatedBy:A.user.uid,
      history:{[String(revision%50)]:{
        operationId,recordId:'r1',at:serverTimestamp(),actor:A.user.uid,
        changes:{partyLevel:'Không'},oldValues:{partyLevel:prior.partyLevel}
      }}};
    // Changing Cấp trình to "Không" MUST atomically derive progressParty.
    await assertFails(set(ref(A.db,'hdnd/items/r1'),wrong));
    await assertFails(set(ref(A.db,'hdnd/items/r2'),{...seedRow(),recordId:'r2'}));
    expect((await read()).revision).toBe(1);
  });
  it('rejects status writes when editing is paused and forged admin sessions',async()=>{
    await setup();
    await env.withSecurityRulesDisabled(async ctx=>
      set(ref(ctx.database(),'hdnd/control/editingLocked'),true));
    expect((await write(A,{progressCouncil:'VP đang xử lý'})).ok).toBe(false);
    // Anonymous Auth may not mint its own privileged Spark tab session.
    await assertFails(set(ref(A.db,'hdnd/sparkSessions/'+A.user.uid),{
      ownerUid:A.user.uid,admin:true,createdAt:Date.now(),
      expiresAt:Date.now()+120000
    }));
    expect((await read()).revision).toBe(1);
  });
  it('lost caller acknowledgement resolves by operationId without duplicate history',async()=>{
    await setup();
    const x=model(A),row=(await x.list())[0],patch=updateDraft(row,undefined,{progressCouncil:'VP đang xử lý'})!;
    const envelope={action:'saveStatus' as const,scope:'legacy' as const,
      operationId:patch.operationId,recordId:'r1',patch};
    expect((await callSparkCellEdit(envelope,A.db)).status).toBe('committed');
    expect((await callSparkCellEdit(envelope,A.db)).status).toBe('committed');
    const actual=await read();
    expect(actual.revision).toBe(2);
    expect(Object.keys(actual.history)).toEqual(['2']);
  });
});
