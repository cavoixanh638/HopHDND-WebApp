import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously,type User} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,set,serverTimestamp,type Database} from 'firebase/database';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import {callSparkCellEdit} from '../src/data/spark-cell-api';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import {sparkSession,closeSparkSession} from '../src/data/spark-session';
import type {Changes,Item} from '../shared/types';

const enabled=process.env.VITE_FIREBASE_WRITE_MODE==='spark'&&process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099'&&process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const generation={generationId:'gen_party_contract_0001',operationId:'party_contract_0001',revision:1,rowCount:1,digest:'a'.repeat(64)};
type Client={app:FirebaseApp;db:Database;user:User};
describe.skipIf(!enabled)('Spark integrated party level contract: real Auth + complete Rules',()=>{
 let env:RulesTestEnvironment,A:Client,B:Client,admin:Client;
 const managers:CellEditSessionManager[]=[];
 beforeAll(async()=>{
  env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{host:'127.0.0.1',port:9000,rules:readFileSync('firebase/database.spark.rules.json','utf8')}});
  async function client(tag:string,isAdmin=false):Promise<Client>{
   const app=initializeApp({apiKey:'demo-key',authDomain:'demo-hdnd.firebaseapp.com',projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com',appId:'party-'+tag},'party-'+tag);
   const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
   const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
   return {app,db,user:isAdmin?await signInAsEmulatorGoogleAdmin(auth):(await signInAnonymously(auth)).user};
  }
  A=await client('a');B=await client('b');admin=await client('admin',true);
 });
 beforeEach(()=>env.clearDatabase());
 afterEach(async()=>{await Promise.allSettled(managers.splice(0).map(m=>m.dispose()));});
 afterAll(async()=>{await closeSparkSession(admin.db).catch(()=>{});await env.cleanup();await Promise.all([A,B,admin].map(c=>deleteApp(c.app)));});
 async function setup(v2:boolean,level='BCH',status='Sở chưa trình',grants={partyLevel:true,progressParty:false,note:true}){
  const {archivedAt:_ignored,...base}=createDemoItems(1)[0];
  const row={...base,recordId:'r1',displayCode:'NQ01',partyLevel:level,progressParty:status,revision:1,operationId:'seed',updatedAt:Date.now(),updatedBy:'seed'};
  await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
   ...(v2?{datasetV2:{active:generation,generations:{[generation.generationId]:{items:{r1:row}}},permissions:{[generation.generationId]:{columns:grants}}}}:{items:{r1:row},permissions:{columns:grants}}),
   freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:admin.user.uid,changedAt:1,deadline:0,closedAt:0}
  }}));
 }
 const path=(v2:boolean)=>v2?'hdnd/datasetV2/generations/'+generation.generationId+'/items/r1':'hdnd/items/r1';
 const locks=(v2:boolean)=>v2?'hdnd/datasetV2/leases/'+generation.generationId+'/r1':'hdnd/editLocks/r1';
 const permissions=(v2:boolean)=>v2?'hdnd/datasetV2/permissions/'+generation.generationId+'/columns':'hdnd/permissions/columns';
 const scope=(v2:boolean)=>v2?{scope:'v2' as const,generation}:{scope:'legacy' as const};
 function model(c:Client,v2:boolean){
  const manager=new CellEditSessionManager(c.db,()=>c.user,v2?generation.generationId:undefined);managers.push(manager);
  const repository=new FirebaseRepository(c.db,()=>c.user,()=>({columns:{partyLevel:true,progressParty:true,note:true}}),path(v2).replace(/\/r1$/,''),v2?generation:undefined);
  repository.leaseManager=manager;return {manager,repository};
 }
 async function saved(m:ReturnType<typeof model>,change:Changes){
  const row=(await m.repository.list())[0];
  const result=(await m.repository.save([updateDraft(row,undefined,change)!]))[0];
  expect(result.ok,result.message).toBe(true);return result.item!;
 }
 for(const v2 of [false,true])describe(v2?'V2':'legacy',()=>{
  it('level-only permission+lease derives status atomically in both directions and truthful history',async()=>{
   await setup(v2);const m=model(A,v2);
   await m.manager.acquire('r1','partyLevel','status');
   const no=await saved(m,{partyLevel:'Không'});
   expect(no.progressParty).toBe('Không phải trình');expect(no.revision).toBe(2);
   const after=(await get(ref(A.db,path(v2)))).val();
   expect(after.history['2'].changes).toEqual({partyLevel:'Không',progressParty:'Không phải trình'});
   expect(after.history['2'].oldValues).toEqual({partyLevel:'BCH',progressParty:'Sở chưa trình'});
   expect(after.editProofs.progressParty).toBeUndefined();
   await m.manager.finish('r1','partyLevel');await m.manager.acquire('r1','partyLevel','status');
   const yes=await saved(m,{partyLevel:'BCH'});
   expect(yes.progressParty).toBe('Sở chưa trình');expect(yes.revision).toBe(3);
   const final=(await get(ref(A.db,path(v2)))).val();
   expect(final.history['3'].changes).toEqual({partyLevel:'BCH',progressParty:'Sở chưa trình'});
   expect(final.history['3'].oldValues).toEqual({partyLevel:'Không',progressParty:'Không phải trình'});
  });
  it('status grant+lease cannot change stored Không; raw client cannot bypass the contract',async()=>{
   await setup(v2,'Không','Không phải trình',{partyLevel:false,progressParty:true,note:true});
   const m=model(A,v2);await m.manager.acquire('r1','progressParty','status');
   const old=(await m.repository.list())[0],before=(await get(ref(A.db,path(v2)))).val();
   expect((await m.repository.save([updateDraft(old,undefined,{progressParty:'Đã gửi ĐU'})!]))[0].ok).toBe(false);
   const next={...before,progressParty:'Đã gửi ĐU',revision:2,operationId:crypto.randomUUID(),updatedAt:serverTimestamp(),updatedBy:A.user.uid,
    editProofs:{progressParty:m.manager.credential('r1','progressParty')!.token},
    history:{'2':{recordId:'r1',operationId:'',at:serverTimestamp(),actor:A.user.uid,oldValues:{progressParty:before.progressParty},changes:{progressParty:'Đã gửi ĐU'}}}};
   next.history['2'].operationId=next.operationId;
   await assertFails(set(ref(A.db,path(v2)),next));
   expect((await get(ref(A.db,path(v2)))).val()).toEqual(before);
  });
  it('wrong-tab token replay, changed baseline and revoked level grant cannot alter either field',async()=>{
   await setup(v2);const a=model(A,v2);await a.manager.acquire('r1','partyLevel','status');
   const row=(await a.repository.list())[0],patch=updateDraft(row,undefined,{partyLevel:'Không'})!;
   const before=(await get(ref(A.db,path(v2)))).val();
   await expect(callSparkCellEdit({...scope(v2),action:'save',recordId:'r1',operationId:patch.operationId,patch,
    leases:{partyLevel:a.manager.credential('r1','partyLevel')!}},B.db)).rejects.toThrow();
   const stale={...patch,operationId:crypto.randomUUID(),baseValues:{partyLevel:'TTTU'}};
   expect((await a.repository.save([stale]))[0].ok).toBe(false);
   await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database(),permissions(v2)+'/partyLevel'),false));
   expect((await a.repository.save([patch]))[0].ok).toBe(false);
   expect((await get(ref(A.db,path(v2)))).val()).toEqual(before);
  });
  it('verified admin bound tab derives status without opening public field grants',async()=>{
   await setup(v2,'BCH','Sở chưa trình',{partyLevel:false,progressParty:false,note:false});
   const m=model(admin,v2);await m.manager.acquire('r1','partyLevel','status');
   expect((await saved(m,{partyLevel:'Không'})).progressParty).toBe('Không phải trình');
   const session=await sparkSession(admin.db);
   expect(session.uid).not.toBe(admin.user.uid);
   expect((await get(ref(admin.db,permissions(v2)+'/partyLevel'))).val()).toBe(false);
  });
  it('anonymous guest can commit a VALID BCH status and note after acquiring exclusive leases',async()=>{
   await setup(v2,'BCH','Sở chưa trình',{partyLevel:false,progressParty:true,note:true});
   const m=model(A,v2);
   await m.manager.acquire('r1','progressParty','status');
   const next=await saved(m,{progressParty:'VP đang xử lý'});
   expect(next.progressParty).toBe('VP đang xử lý');
   expect(next.partyLevel).toBe('BCH');
   expect(next.revision).toBe(2);
   await m.manager.finish('r1','progressParty');
   await m.manager.acquire('r1','note','multiline');
   const noted=await saved(m,{note:'Khách đã cập nhật ghi chú hợp lệ'});
   expect(noted.note).toBe('Khách đã cập nhật ghi chú hợp lệ');
   expect(noted.progressParty).toBe('VP đang xử lý');
   expect(noted.revision).toBe(3);
   const server=(await get(ref(A.db,path(v2)))).val();
   expect(server.history['3'].changes.note).toBe('Khách đã cập nhật ghi chú hợp lệ');
  });
  it('invalid enum, combined patch and direct synthetic status are denied with no mutation',async()=>{
   await setup(v2,'BCH','Sở chưa trình',{partyLevel:true,progressParty:true,note:true});
   const m=model(A,v2);await m.manager.acquire('r1','partyLevel','status');await m.manager.acquire('r1','progressParty','status');
   const before=(await get(ref(A.db,path(v2)))).val();
   for(const change of [{partyLevel:'INVALID'},{progressParty:'INVALID'},{partyLevel:'Không',progressParty:'Không phải trình'},{progressParty:'Không phải trình'}]){
    const row=(await m.repository.list())[0];expect((await m.repository.save([updateDraft(row,undefined,change)!]))[0].ok).toBe(false);
   }
   expect((await get(ref(A.db,path(v2)))).val()).toEqual(before);
  });
 });
});
