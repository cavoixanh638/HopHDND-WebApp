import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {getDatabase,connectDatabaseEmulator,goOffline,get,ref,set,update,runTransaction,type Database} from 'firebase/database';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {initializeAuth,connectAuthEmulator,inMemoryPersistence,signInAnonymously} from 'firebase/auth';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {defaultItemLayout} from '../src/data/item-preferences';
import {mergeItemLayout} from '../src/data/item-layout-merge';
import {defaultReportLayout} from '../src/data/report-preferences';
import {catalogFromItems} from '../src/data/catalogs';
import type {User} from 'firebase/auth';
import {FirebaseRepository,type CellPermissions} from '../src/data/firebase-repository';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import {migrateMirrorToPrimary} from '../src/data/firebase-primary-bootstrap';
import {parseSheetConfig,DEFAULT_SHEET_URL} from '../src/data/sheet-config';
import type {Changes,Item} from '../shared/types';

const productionRules=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
const emulator=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const adminClaims={email:'cavoixanh638@gmail.com',email_verified:true,firebase:{sign_in_provider:'google.com' as const}};
const permission:CellPermissions={columns:{note:true}};
let adminIdentity:User,guestIdentity:User;
const user=(_uid:string,admin=false)=>admin?adminIdentity:guestIdentity;
const seed={...createDemoItems()[0],recordId:'r1',displayCode:'NQ01',revision:1,archivedAt:null};
const patch=(item:Item,changes:Changes)=>updateDraft(item,undefined,changes)!;
describe.skipIf(!emulator)('Firebase FULL candidate legacy primary and configuration regression',()=>{
  let env:RulesTestEnvironment,adminApp:FirebaseApp,guestApp:FirebaseApp;
  let adminDb:Database,guestDb:Database;
  const sessions=new Set<CellEditSessionManager>();
  const guest=(_uid:string)=>guestDb;
  const admin=()=>adminDb;
  const repo=(uid:string,isAdmin=false)=>{
    const db=isAdmin?adminDb:guestDb,actor=user(uid,isAdmin);
    const r=new FirebaseRepository(db,()=>actor,()=>permission,'hdnd/items');
    const manager=new CellEditSessionManager(db,()=>actor);
    sessions.add(manager);r.leaseManager=manager;return r;
  };
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{
      host:'127.0.0.1',port:9000,rules:JSON.stringify(productionRules)
    }});
    const sdk=(name:string)=>{
      const app=initializeApp({apiKey:'demo-production-legacy',authDomain:'demo-hdnd.firebaseapp.com',
        projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com',
        appId:'legacy-'+name},'pr147-legacy-'+name);
      const auth=initializeAuth(app,{persistence:inMemoryPersistence});
      connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
      const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
      return {app,auth,db};
    };
    const a=sdk('admin'),g=sdk('anonymous');
    adminApp=a.app;guestApp=g.app;adminDb=a.db;guestDb=g.db;
    adminIdentity=await signInAsEmulatorGoogleAdmin(a.auth);
    guestIdentity=(await signInAnonymously(g.auth)).user;
    expect(adminIdentity.emailVerified).toBe(true);
    expect(guestIdentity.isAnonymous).toBe(true);
  },40000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async context=>{
      const {archivedAt,...row}=seed;
      await set(ref(context.database() as never),{
        hdnd:{items:{r1:{...row,operationId:'seed',updatedAt:Date.now(),updatedBy:'admin'}},
          permissions:{columns:{note:true}}}
      });
    });
  });
  afterEach(async()=>{await Promise.allSettled([...sessions].map(x=>x.dispose()));sessions.clear();});
  afterAll(async()=>{
    await env?.cleanup();
    if(adminDb)goOffline(adminDb);if(guestDb)goOffline(guestDb);
    await Promise.allSettled([adminApp,guestApp].filter(Boolean).map(x=>deleteApp(x)));
  });

  it('moves the verified mirror to primary exactly once, keeps IDs and grants, then serves realtime edits without Sheets',async()=>{
    const source=parseSheetConfig(DEFAULT_SHEET_URL);
    const recordId=source.spreadsheetId+':'+source.gid+':row:3';
    const mirrored={...seed,recordId,displayCode:'NQ-X3',stt:3};
    await env.withSecurityRulesDisabled(async context=>{
      const db=context.database() as never;
      await set(ref(db,'hdnd/items'),null);
      await set(ref(db,'hdnd/mirrors/'+source.spreadsheetId+'/'+source.gid),{
        schemaVersion:1,source:source.spreadsheetId+':'+source.gid,
        syncedAt:'2026-10-25T00:00:00Z',sourceModifiedAt:'2026-10-24T23:00:00Z',
        sha256:'a'.repeat(64),rows:[mirrored]
      });
      await set(ref(db,'hdnd/permissions/cells/'+recordId+'/note'),true);
    });
    await expect(migrateMirrorToPrimary(guest('viewer') as never,user('viewer'),source))
      .rejects.toThrow(/quản trị/);
    const migrated=await migrateMirrorToPrimary(admin() as never,user('verified-admin',true),source);
    expect(migrated).toEqual({sourceCount:1,importedCount:1});
    await expect(migrateMirrorToPrimary(admin() as never,user('verified-admin',true),source))
      .rejects.toThrow(/đã có dữ liệu/);
    const visitor=repo('viewer');
    const [item]=await visitor.list();
    expect(item.recordId).toBe(recordId);
    expect(item.displayCode).toBe('NQ-X3');
    await visitor.leaseManager!.acquire(recordId,'note','multiline');
    const saved=(await visitor.save([updateDraft(item,undefined,{note:'Lưu realtime vào Database chính'})!]))[0];
    expect(saved.ok,saved.message).toBe(true);
    expect((await visitor.list())[0].note).toBe('Lưu realtime vào Database chính');
    expect((await get(ref(admin() as never,'hdnd/mirrors/'+source.spreadsheetId+'/'+source.gid))).val().rows[0].note)
      .toBe(mirrored.note);
  });

  it('preserves a preexisting primary database and never overwrites it during migration',async()=>{
    const source=parseSheetConfig(DEFAULT_SHEET_URL);
    await expect(migrateMirrorToPrimary(admin() as never,user('verified-admin',true),source))
      .rejects.toThrow(); // no mirror is loaded; no writes are allowed
    expect((await get(ref(admin() as never,'hdnd/items/r1'))).exists()).toBe(true);
  });

  it('preserves public read and requires a real service lease for existing-row edits',async()=>{
    const client=repo('editor');
    await assertSucceeds(get(ref(guest('editor') as never,'hdnd/items')));
    await client.leaseManager!.acquire('r1','note','multiline');
    expect((await client.save([patch(seed,{note:'được phép theo quyền hiện tại'})]))[0].ok).toBe(true);
    await assertFails(set(ref(guest('editor') as never,'hdnd/items/r2'),{...seed,recordId:'r2'}));
    await assertFails(set(ref(guest('editor') as never,'hdnd/items/r1'),null));
    expect((await client.save([patch((await client.list())[0],{content:'đổi cột không được cấp'})]))[0].ok).toBe(false);
  });

  it('blocks every nonadmin existing-row write after locking, even with a crafted Firebase client',async()=>{
    const a=admin();
    await assertSucceeds(set(ref(a as never,'hdnd/control'),{revision:1,editingLocked:true,changedAt:new Date().toISOString()}));
    const client=repo('editor');
    expect((await client.save([patch((await client.list())[0],{note:'lách khóa'})]))[0].ok).toBe(false);
    await assertFails(update(ref(guest('editor') as never,'hdnd/items/r1'),{note:'ghi thẳng'}));
    const root=repo('verified-admin',true);
    await root.leaseManager!.acquire('r1','note','multiline');
    expect((await root.save([patch((await root.list())[0],{note:'admin vẫn sửa được'})]))[0].ok).toBe(true);
    await root.leaseManager!.finish('r1','note');
    await assertFails(set(ref(guest('editor') as never,'hdnd/control'),{revision:2,editingLocked:false,changedAt:new Date().toISOString()}));
    await assertSucceeds(set(ref(a as never,'hdnd/control'),{revision:2,editingLocked:false,changedAt:new Date().toISOString()}));
    const current=(await client.list())[0];
    await client.leaseManager!.acquire('r1','note','multiline');
    expect((await client.save([patch(current,{note:'mở khóa đã sửa được'})]))[0].ok).toBe(true);
  });

  it('does not expose admin approval history or configuration writes to anonymous or spoofed admins',async()=>{
    const denied=guest('anonymous');
    await assertFails(get(ref(denied as never,'hdndReviews')));
    await assertFails(set(ref(denied as never,'hdnd/profile'),{revision:1,payload:'{}'}));
    const spoof=env.authenticatedContext('spoof',{...adminClaims,firebase:{sign_in_provider:'anonymous'}}).database();
    await assertFails(set(ref(spoof as never,'hdnd/control'),{revision:1,editingLocked:true,changedAt:new Date().toISOString()}));
    await assertFails(get(ref(spoof as never,'hdndReviews')));
    const a=admin();await assertSucceeds(get(ref(a as never,'hdndReviews')));
    const path='hdndReviews/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344';
    const baseline={revision:1,source:'1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344',
      approvedAt:new Date().toISOString(),approvedBy:adminClaims.email,changedCount:0,payload:'{}',historyJson:'[]'};
    await assertSucceeds(set(ref(a as never,path),baseline));
    await assertFails(set(ref(a as never,path),baseline));
  });

  it('saves exactly the 1800px list layout as admin and keeps catalog and report settings intact',async()=>{
    const a=admin();
    const baseline={revision:1,items:defaultItemLayout(),reports:defaultReportLayout(),catalogs:catalogFromItems(createDemoItems(2))};
    await assertSucceeds(set(ref(a as never,'hdnd/profile'),{revision:1,payload:JSON.stringify(baseline)}));
    const draft={...defaultItemLayout(),frameWidth:1800};
    const result=await assertSucceeds(runTransaction(ref(a as never,'hdnd/profile'),current=>{
      if(current===null)return current; // cold RTDB cache must reach the server
      if(current.revision!==1)return;
      const previous=JSON.parse(current.payload);
      const updated={...previous,items:draft,revision:2};
      return {revision:2,payload:JSON.stringify(updated)};
    },{applyLocally:false}));
    expect(result.committed).toBe(true);
    const saved=(await get(ref(a as never,'hdnd/profile'))).val();
    const payload=JSON.parse(saved.payload);
    expect(payload.items.frameWidth).toBe(1800);
    expect(payload.catalogs).toEqual(baseline.catalogs);
    expect(payload.reports).toEqual(baseline.reports);
    expect(saved.revision).toBe(2);
    await assertFails(runTransaction(ref(guest('editor') as never,'hdnd/profile'),current=>({...current,revision:3})));
  });

  it('commits a stale layout against a newer server revision without discarding report settings',async()=>{
    const a=admin();
    const original=defaultItemLayout();
    const base={revision:1,items:original,reports:defaultReportLayout(),catalogs:catalogFromItems(createDemoItems(2))};
    await assertSucceeds(set(ref(a as never,'hdnd/profile'),{revision:1,payload:JSON.stringify(base)}));
    const changed={...base,reports:[...base.reports].reverse(),revision:2};
    await assertSucceeds(set(ref(a as never,'hdnd/profile'),{revision:2,payload:JSON.stringify(changed)}));
    const local={...original,frameWidth:1500};
    const result=await assertSucceeds(runTransaction(ref(a as never,'hdnd/profile'),current=>{
      if(current===null)return current;
      const server=JSON.parse(current.payload);
      const merged=mergeItemLayout(original,local,server.items);
      const updated={...server,items:merged,revision:current.revision+1};
      return {revision:updated.revision,payload:JSON.stringify(updated)};
    },{applyLocally:false}));
    expect(result.committed).toBe(true);
    const saved=(await get(ref(a as never,'hdnd/profile'))).val();
    const body=JSON.parse(saved.payload);
    expect(saved.revision).toBe(3);
    expect(body.items.frameWidth).toBe(1500);
    expect(body.reports).toEqual(changed.reports);
    expect(body.catalogs).toEqual(base.catalogs);
  });

  it('preserves cell priority and permits new Sheets-only row/cell permission entries for admin',async()=>{
    const a=admin();
    await assertSucceeds(set(ref(a as never,'hdnd/permissions/rows/sheet:42:row:3'),true));
    await assertSucceeds(set(ref(a as never,'hdnd/permissions/cells/sheet:42:row:3/note'),false));
    await assertFails(set(ref(guest('editor') as never,'hdnd/permissions/cells/sheet:42:row:3/note'),true));
    await assertSucceeds(set(ref(a as never,'hdnd/permissions/cells/r1/note'),false));
    const client=repo('editor');
    expect((await client.save([patch(seed,{note:'không được vượt ngoại lệ ô'})]))[0].ok).toBe(false);
  });
});
