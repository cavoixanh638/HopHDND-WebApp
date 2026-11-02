/** PR147: original 14 business regressions, migrated from the obsolete
 * hdnd-test/mock Rules namespace to the SAME production candidate FULL Rules.
 * Every successful cell mutation uses a real Auth Emulator token + Functions
 * onCall + private lease; all adversarial writes use actual client RTDB SDK.
 */
import {readFileSync} from 'node:fs';
import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {getDatabase,connectDatabaseEmulator,get,ref,set,update,runTransaction,goOffline,goOnline,type Database} from 'firebase/database';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {initializeAuth,connectAuthEmulator,inMemoryPersistence,signInAnonymously} from 'firebase/auth';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import type {User} from 'firebase/auth';
import {FirebaseRepository,samePermissions,type CellPermissions} from '../src/data/firebase-repository';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {setFreezeMode,readFreeze} from '../src/data/freeze-control';
import {createDemoItems} from '../src/data/demo-items';
import {updateDraft} from '../src/domain/items';
import type {Changes,Item,EditableField} from '../shared/types';

const candidate=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000'&&
  process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099';
const adminClaims={email:'cavoixanh638@gmail.com',email_verified:true,
  firebase:{sign_in_provider:'google.com' as const}};
const grant:CellPermissions={columns:{note:true,specialist:true,room:true}};
const base={...createDemoItems()[0],recordId:'r1',displayCode:'NQ01',revision:1,archivedAt:null};
const patch=(item:Item,changes:Changes)=>updateDraft(item,undefined,changes)!;
type Principal={app:FirebaseApp;db:Database;user:User};

describe.skipIf(!enabled)('Firebase FULL Rules Auth+Functions+RTDB: 14 business/security regressions',()=>{
  let env:RulesTestEnvironment;
  let root:Principal,A:Principal,B:Principal;
  const sessions=new Set<CellEditSessionManager>();
  const guest=(id:string)=>id==='b'||id==='readerB'?B.db:A.db;
  const admin=()=>root.db;
  const repo=(id:string,adminRole=false,local:CellPermissions=grant)=>{
    const actor=adminRole?root:(id==='b'||id==='readerB'?B:A);
    const db=actor.db;
    const model=new FirebaseRepository(db,()=>actor.user,()=>local,'hdnd/items');
    const session=new CellEditSessionManager(db,()=>actor.user);
    sessions.add(session);model.leaseManager=session;
    return model;
  };
  const lease=async(model:FirebaseRepository,id:string,field:EditableField)=>
    model.leaseManager!.acquire(id,field,
      field==='note'||field==='specificProgress'?'multiline':
      field==='content'?'long':'short');
  const write=async(model:FirebaseRepository,item:Item,changes:Changes)=>{
    for(const field of Object.keys(changes) as EditableField[])
      if(!model.leaseManager?.has(item.recordId,field))
        await lease(model,item.recordId,field);
    return (await model.save([patch(item,changes)]))[0];
  };
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{
      host:'127.0.0.1',port:9000,rules:JSON.stringify(candidate)
    }});
    const make=async(tag:string,isAdmin=false)=>{
      const app=initializeApp({apiKey:'demo-pr147-security',
        authDomain:'demo-hdnd.firebaseapp.com',projectId:'demo-hdnd',
        databaseURL:'https://demo-hdnd.firebaseio.com',appId:'pr147-'+tag},
        'pr147-real-client-'+tag);
      const auth=initializeAuth(app,{persistence:inMemoryPersistence});
      connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
      const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
      const user=isAdmin?await signInAsEmulatorGoogleAdmin(auth):
        (await signInAnonymously(auth)).user;
      return {app,db,user};
    };
    root=await make('admin',true);A=await make('a');B=await make('b');
    expect(root.user.emailVerified).toBe(true);
    expect(A.user.uid).not.toBe(B.user.uid);
  },45000);
  beforeEach(async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>{
      const {archivedAt:ignored,...row}=base;
      await set(ref(ctx.database() as never),{hdnd:{
        items:{r1:{...row,operationId:'seed',updatedAt:Date.now(),updatedBy:'seed'}},
        permissions:grant,
        control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
        freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:root.user.uid,
          changedAt:1,deadline:0,closedAt:0}
      }});
    });
  });
  afterEach(async()=>{
    await Promise.allSettled([...sessions].map(s=>s.dispose()));
    sessions.clear();
  });
  afterAll(async()=>{
    await env?.cleanup();
    for(const actor of [root,A,B]){
      if(!actor)continue;
      try{goOffline(actor.db);}catch{}
      await deleteApp(actor.app);
    }
  });

  it('public business read; forbids unauthorized field edit, permissions and forged admin provider',async()=>{
    await assertSucceeds(get(ref(env.unauthenticatedContext().database() as never,'hdnd/items')));
    await assertSucceeds(get(ref(guest('a'),'hdnd/items')));
    await assertFails(set(ref(guest('a'),'hdnd/permissions/columns/content'),true));
    const spoof=env.authenticatedContext('spoof',{...adminClaims,
      firebase:{sign_in_provider:'anonymous'}}).database();
    await assertFails(set(ref(spoof as never,'hdnd/permissions/columns/content'),true));
    const model=repo('a');
    await expect(lease(model,'r1','content')).rejects.toThrow();
    const result=(await model.save([patch((await model.list())[0],
      {content:'không được cấp quyền'})]))[0];
    expect(result.ok).toBe(false);
  });

  it('admin configures cells; explicit deny overrides allowed column at lease AND save',async()=>{
    await assertSucceeds(set(ref(admin(),'hdnd/permissions/cells/r1/note'),false));
    const model=repo('a');
    await expect(lease(model,'r1','note')).rejects.toThrow();
    expect((await model.save([patch((await model.list())[0],
      {note:'không thể ghi'})]))[0].ok).toBe(false);
    expect((await model.list())[0].note).toBe(base.note);
  });

  it('server-ACKed save broadcasts to second browser, truthful history, replay does not duplicate',async()=>{
    const a=repo('a'),b=repo('b');
    const original=(await a.list())[0],request=patch(original,{note:'ghi chú mới'});
    const received=new Promise<Item[]>((resolve,reject)=>{
      let stop=()=>{};
      const timeout=setTimeout(()=>{stop();reject(Error('No realtime update'));},9000);
      stop=b.subscribe(rows=>{
        if(rows[0]?.note==='ghi chú mới'){
          clearTimeout(timeout);queueMicrotask(stop);resolve(rows);
        }
      },reject);
    });
    await lease(a,'r1','note');
    const saved=(await a.save([request]))[0];
    expect(saved.ok,saved.message).toBe(true);
    expect((await received)[0].revision).toBe(2);
    expect((await a.history('r1'))[0].changes.note).toBe('ghi chú mới');
    const retry=(await a.save([request]))[0];
    expect(retry.ok,retry.message).toBe(true);
    expect((await a.list())[0].revision).toBe(2);
  },35000);

  it('same-cell stale edit conflicts; different-cell lease edits merge without overwrite',async()=>{
    const a=repo('a'),b=repo('b');
    const original=(await a.list())[0];
    await lease(a,'r1','note');
    const first=(await a.save([patch(original,{note:'A'})]))[0];
    expect(first.ok,first.message).toBe(true);
    await a.leaseManager!.finish('r1','note');
    await lease(b,'r1','note');
    const stale=(await b.save([patch(original,{note:'B'})]))[0];
    expect(stale.ok).toBe(false);
    expect(stale.message).toMatch(/thay đổi|xung đột|không còn phù hợp/i);
    await b.leaseManager!.cancel('r1','note');
    const second=await write(b,original,{specialist:'Chuyên viên B'});
    expect(second.ok,second.message).toBe(true);
    expect((await a.list())[0]).toMatchObject({note:'A',specialist:'Chuyên viên B',revision:3});
  },35000);

  it('direct SDK cannot change ID, STT, arbitrary fields, create/delete; spreadsheet formula text inert',async()=>{
    const db=guest('a');
    for(const changes of [{stt:100},{displayCode:'NQ99'},{evil:'payload'}])
      await assertFails(update(ref(db,'hdnd/items/r1'),changes));
    await assertFails(set(ref(db,'hdnd/items/r2'),base));
    await assertFails(set(ref(db,'hdnd/items/r1'),null));
    const a=repo('a');
    const result=await write(a,(await a.list())[0],{note:'=SUM(1,2)'});
    expect(result.ok,result.message).toBe(true);
    expect((await a.list())[0].note).toBe('=SUM(1,2)');
  },25000);

  it('existing primary forbids direct admin row import; approved generation path is required, config names remain JSON',async()=>{
    const a=admin();
    await assertFails(set(ref(a,'hdnd/items/r2'),{...base,recordId:'r2'}));
    const model=repo('admin',true);
    await expect(model.importItems([{...base,recordId:'r2',displayCode:'NQ02'}]))
      .rejects.toThrow();
    expect(await model.list()).toHaveLength(1);
    await assertSucceeds(set(ref(a,'hdnd/profile'),{revision:1,
      payload:JSON.stringify({specialistRooms:{'Q.CVP / An':['Phòng A']}})}));
    await assertFails(set(ref(guest('a'),'hdnd/profile'),{revision:2,payload:'{}'}));
  },30000);

  it('offline lease-backed edit must keep draft/operation; reconnect safe retry never writes twice',async()=>{
    const a=repo('a'),initial=(await a.list())[0];
    await lease(a,'r1','note');
    const attempt=patch(initial,{note:'giữ khi mất mạng'});
    goOffline(A.db);
    try{
      const pending=await Promise.race([
        a.save([attempt]),
        new Promise<null>(resolve=>setTimeout(()=>resolve(null),1500))
      ]);
      // The Functions HTTP transport is INDEPENDENT of the RTDB SDK
      // socket: while RTDB is offline, a real HTTPS callable may still
      // receive a valid ACK and commit. Never label that server-ACKed result
      // "pending"; whether it completed or stayed unknown, a same-op retry
      // MUST NOT create another write.
      if(pending?.[0]?.ok){
        const committed=(await get(ref(admin(),'hdnd/items/r1'))).val();
        expect(committed.note).toBe('giữ khi mất mạng');
        expect(committed.revision).toBe(2);
      }else{
        expect(pending===null||pending[0].ok===false).toBe(true);
      }
    }finally{goOnline(A.db);}
    const saved=(await a.save([attempt]))[0];
    expect(saved.ok,saved.message).toBe(true);
    const confirmed=(await get(ref(admin(),'hdnd/items/r1'))).val();
    expect(confirmed.note).toBe('giữ khi mất mạng');
    expect(confirmed.revision).toBe(2);
    expect(Object.keys(confirmed.history??{})).toHaveLength(1);
  },30000);

  it('forged local grants cannot authorize ungranted content',async()=>{
    const modified=repo('a',false,{columns:{content:true}});
    await expect(lease(modified,'r1','content')).rejects.toThrow();
    expect((await modified.save([patch((await modified.list())[0],
      {content:'attempted UI bypass'})]))[0].ok).toBe(false);
    expect((await repo('b').list())[0].content).toBe(base.content);
  });

  it('FROZEN forbids raw writes by guest/admin and authenticated callable SAVE',async()=>{
    const a=repo('a'),old=(await a.list())[0];
    await lease(a,'r1','note');
    const frozen=await setFreezeMode(admin(),root.user,await readFreeze(admin()),'FROZEN',true);
    expect(frozen.mode).toBe('FROZEN');
    for(const db of [admin(),guest('a')]){
      await assertFails(set(ref(db,'hdnd/items/r2'),base));
      await assertFails(update(ref(db,'hdnd/items/r1'),{note:'bypass'}));
      await assertFails(set(ref(db,'hdnd/items'),null));
    }
    const attempt=(await a.save([patch(old,{note:'stale after freeze'})]))[0];
    expect(attempt.ok).toBe(false);
    expect((await repo('b').list())[0].note).toBe(old.note);
  },30000);

  it('only real verified Google admin changes shared config; spoofed REST-style updates denied',async()=>{
    const candidates=[undefined,{firebase:{sign_in_provider:'anonymous'}},
      {...adminClaims,email:'someone@gmail.com'},
      {...adminClaims,email_verified:false},
      {...adminClaims,firebase:{sign_in_provider:'password'}}] as const;
    for(const [index,claims] of candidates.entries()){
      const db=(claims?env.authenticatedContext('denied'+index,claims):
        env.unauthenticatedContext()).database();
      for(const [path,value] of [
        ['hdnd/profile',{revision:1,payload:'{}'}],
        ['hdnd/permissions/columns/note',true],
        ['hdnd/permissions/rows/sheet:42:row:3',true],
        ['hdnd/permissions/cells/sheet:42:row:3/note',true]
      ] as const)await assertFails(set(ref(db as never,path),value));
      await assertFails(update(ref(db as never),{
        'hdnd/profile':{revision:1,payload:'{}'},
        'hdnd/permissions/columns/content':true
      }));
    }
  });

  it('admin permission-map CAS is order independent and stale revision cannot overwrite',async()=>{
    const where=ref(admin(),'hdnd/permissions');
    await assertSucceeds(set(where,{columns:{note:true,room:false},
      rows:{'sheet:42:row:3':true}}));
    const baseline={rows:{'sheet:42:row:3':true},
      columns:{room:false,note:true},cells:{}};
    const updated={columns:{note:false,room:false},
      rows:{'sheet:42:row:3':true},cells:{}};
    const first=await assertSucceeds(runTransaction(where,old=>{
      if(old===null)return old;
      return samePermissions(old,baseline)?updated:undefined;
    },{applyLocally:false}));
    expect(first.committed).toBe(true);
    expect(samePermissions(first.snapshot.val(),updated)).toBe(true);
    const stale=await runTransaction(where,old=>
      samePermissions(old,baseline)?baseline:undefined,{applyLocally:false});
    expect(stale.committed).toBe(false);
    expect(samePermissions((await get(where)).val(),updated)).toBe(true);
  });

  it('Sheets row/cell permissions have admin-only write, legal field guard, monotonic profile revision',async()=>{
    const db=admin();
    await assertSucceeds(set(ref(db,'hdnd/permissions/rows/sheet:42:row:3'),true));
    await assertSucceeds(set(ref(db,'hdnd/permissions/cells/sheet:42:row:3/note'),false));
    await assertFails(set(ref(db,'hdnd/permissions/cells/sheet:42:row:3/stt'),true));
    await assertFails(set(ref(db,'hdnd/permissions/rows/sheet:42:row:4'),'allow'));
    await assertSucceeds(set(ref(db,'hdnd/profile'),{revision:1,payload:'{}'}));
    await assertFails(set(ref(db,'hdnd/profile'),{revision:1,payload:'stale'}));
    await assertSucceeds(set(ref(db,'hdnd/profile'),{revision:2,payload:'{}'}));
  });

  it('retains exactly last 50 structured audit entries after 52 real authenticated saves',async()=>{
    const a=repo('a');let current=(await a.list())[0];
    await lease(a,'r1','note');
    for(let index=1;index<=52;index++){
      const saved=(await a.save([patch(current,{note:'lần '+index})]))[0];
      expect(saved.ok,saved.message+' index '+index).toBe(true);
      current=saved.item!;
    }
    const history=await a.history('r1');
    expect(history).toHaveLength(50);
    expect(history[0].changes.note).toBe('lần 3');
    expect(history.at(-1)?.changes.note).toBe('lần 52');
  },150000);

  it('only admin locks editing and advances approval records by monotonic revision',async()=>{
    const control='hdnd/control',db=admin();
    const first={revision:2,editingLocked:true,changedAt:new Date().toISOString()};
    await assertFails(set(ref(guest('a'),control),first));
    await assertSucceeds(set(ref(db,control),first));
    await assertFails(set(ref(db,control),{...first,editingLocked:false}));
    await assertSucceeds(set(ref(db,control),{...first,revision:3,editingLocked:false}));
    const path='hdndReviews/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/60961344';
    const baseline={revision:1,source:'1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344',
      approvedAt:new Date().toISOString(),approvedBy:adminClaims.email,
      changedCount:2,payload:'{}',historyJson:'[]'};
    await assertFails(get(ref(guest('a'),path)));
    await assertFails(set(ref(guest('a'),path),baseline));
    await assertSucceeds(set(ref(db,path),baseline));
    await assertFails(set(ref(db,path),baseline));
    await assertSucceeds(set(ref(db,path),{...baseline,revision:2}));
    await assertFails(set(ref(db,path),{...baseline,revision:3,source:'other:gid'}));
  });
});
