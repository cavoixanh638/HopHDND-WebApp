import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {initializeTestEnvironment,assertFails,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {initializeAuth,connectAuthEmulator,inMemoryPersistence,type Auth,type User} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,ref,get,set,goOffline,type Database} from 'firebase/database';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import {createDemoItems} from '../src/data/demo-items';
import {createSimpleBackup,inspectSimpleBackup,prepareSimpleChange,
  commitSimpleChange,simpleExcelCandidate} from '../src/data/simple-admin-data';

// The real browser is pinned to hophdnd-8b7b2; this suite ONLY runs on a
// dedicated demo Auth + RTDB Emulator, never the production project.
vi.mock('../src/data/firebase-config',()=>({
  firebaseConfig:{projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com'},
  FIREBASE_ADMIN_EMAIL:'cavoixanh638@gmail.com'
}));
const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000'&&
  process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099';
const ruleSource=JSON.parse(readFileSync('firebase/database.spark.rules.json','utf8'));
describe.skipIf(!enabled)('small-data direct Firebase admin maintenance / real Auth+Rules',()=>{
  let env:RulesTestEnvironment,app:FirebaseApp,auth:Auth,db:Database,user:User;
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{
      host:'127.0.0.1',port:9000,rules:JSON.stringify(ruleSource)
    }});
    app=initializeApp({projectId:'demo-hdnd',apiKey:'demo-key',
      databaseURL:'https://demo-hdnd.firebaseio.com',authDomain:'demo-hdnd.firebaseapp.com',
      appId:'simple-admin-fixture'},'simple-admin-fixture');
    auth=initializeAuth(app,{persistence:inMemoryPersistence});
    connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
    user=await signInAsEmulatorGoogleAdmin(auth);
  },60000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>{
      const {archivedAt,...row}=createDemoItems()[0];
      await set(ref(ctx.database() as never),{
        items:{historical:{keep:'root legacy'}},
        hdnd:{
          items:{[row.recordId]:{...row,revision:1,operationId:'seed',
            updatedAt:1,updatedBy:'seed'}},
          mirrors:{legacy:{keep:'mirror'}},
          freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:user.uid,
            changedAt:1,deadline:0,closedAt:0}
        }
      });
    });
  });
  afterAll(async()=>{
    await env?.cleanup();
    try{goOffline(db)}catch{}
    if(app)await deleteApp(app);
  });
  it('backup JSON -> clear -> restore, preserving both old root branches',async()=>{
    const backup=await createSimpleBackup(db,user);
    expect(backup.payload.count).toBe(1);
    const parsed=await inspectSimpleBackup(JSON.stringify(backup),db);
    const clear=await prepareSimpleChange(db,user,'clear',null);
    expect(await commitSimpleChange(db,user,clear)).toBe(0);
    expect((await get(ref(db,'hdnd/items'))).val()).toBe(null);
    expect((await get(ref(db,'hdnd/simpleMaintenancePermit'))).val()).toBe(null);
    const restore=await prepareSimpleChange(db,user,'restore',parsed.payload.items);
    expect(await commitSimpleChange(db,user,restore)).toBe(1);
    expect((await get(ref(db,'hdnd/items'))).val()).not.toBe(null);
    const snapshot=await env.withSecurityRulesDisabled(async ctx=>
      (await get(ref(ctx.database() as never))).val());
    expect(snapshot.items.historical.keep).toBe('root legacy');
    expect(snapshot.hdnd.mirrors.legacy.keep).toBe('mirror');
    expect(snapshot.hdnd.freezeControl.mode).toBe('OPEN');
  },45000);
  it('replace Excel when already populated and reject guest permit creation',async()=>{
    const raw=createDemoItems()[0];
    const candidate=simpleExcelCandidate([{...raw,content:'Đã đổi từ Excel',revision:1,
      isDropped:false,archivedAt:null}],user.uid);
    const draft=await prepareSimpleChange(db,user,'excel',candidate);
    expect(await commitSimpleChange(db,user,draft)).toBe(1);
    const rows=(await get(ref(db,'hdnd/items'))).val();
    expect(rows[raw.recordId].content).toBe('Đã đổi từ Excel');
    const outsider=env.unauthenticatedContext().database();
    await assertFails(set(ref(outsider as never,'hdnd/simpleMaintenancePermit'),{
      uid:'outsider',token:'11111111-1111-4111-8111-111111111111',
      expiresAt:Date.now()+30000
    }));
  },45000);
});
