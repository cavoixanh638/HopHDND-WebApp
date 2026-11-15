/** Independent PR190 review: audit deletion must be denied by live Rules. */
import {readFileSync} from 'node:fs';
import {afterAll,beforeAll,describe,it,expect} from 'vitest';
import {initializeTestEnvironment,assertFails,assertSucceeds,type RulesTestEnvironment} from '@firebase/rules-unit-testing';
import {get,ref,set,serverTimestamp,runTransaction,goOffline,goOnline,onValue,type Database} from 'firebase/database';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signInAnonymously,type User} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator} from 'firebase/database';
import {createDemoItems} from '../src/data/demo-items';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {updateDraft} from '../src/domain/items';
import {CellEditSessionManager} from '../src/data/cell-edit-leases';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import {closeSparkSession} from '../src/data/spark-session';

const enabled=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000';
const realAuthEnabled=process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099';
const freeze={mode:'OPEN',revision:1,epoch:1,actor:'seed',changedAt:1,deadline:0,closedAt:0};
const seedRow=()=>{
  const {archivedAt:_ignore,...demo}=createDemoItems(1)[0];
  return {...demo,recordId:'r1',displayCode:'NQ01',partyLevel:'BCH',
    progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
    revision:1,operationId:'old-dataset',updatedAt:100,updatedBy:'seed'};
};
function nextStatus(row:Record<string,any>,uid:string,epoch:unknown,
  changes:Record<string,string>={progressCouncil:'VP đang xử lý'}){
  const revision=row.revision+1,operationId=crypto.randomUUID();
  return {...row,...changes,revision,operationId,updatedAt:serverTimestamp(),updatedBy:uid,
    history:{...(row.history??{}),[String(revision%50)]:{
      operationId,recordId:row.recordId,at:serverTimestamp(),actor:uid,
      ...(epoch===undefined?{}:{maintenanceEpoch:epoch}),changes,
      oldValues:Object.fromEntries(Object.keys(changes).map(field=>[field,row[field]]))}}};
}
async function withClient(task:(db:Database,user:User)=>Promise<void>){
  const app=initializeApp({apiKey:'demo-key',authDomain:'demo-hdnd.firebaseapp.com',
    projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com',appId:'independent-maintenance'},
    'independent-maintenance-'+crypto.randomUUID());
  try{
    const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
    const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
    await task(db,(await signInAnonymously(auth)).user);
  }finally{await deleteApp(app);}
}
describe.skipIf(!enabled)('PR190 independent history preservation',()=>{
  let env:RulesTestEnvironment;
  beforeAll(async()=>{
    env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{
      host:'127.0.0.1',port:9000,rules:readFileSync('firebase/database.spark.rules.json','utf8')}});
  });
  afterAll(async()=>{await env.cleanup();});
  it.each(['changes','oldValues','both'])('denies deleting old audit %s while saving an otherwise permitted status',async section=>{
    await env.clearDatabase();
    const {archivedAt:_ignore,...demo}=createDemoItems(1)[0];
    const row={...demo,recordId:'r1',displayCode:'NQ01',partyLevel:'BCH',
      progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
      revision:2,operationId:'previous',updatedAt:100,updatedBy:'prior-writer',
      history:{'2':{operationId:'previous',recordId:'r1',at:100,actor:'prior-writer',
        changes:{note:demo.note,progressBuild:'Sở chưa trình'},
        oldValues:{note:'Original note',progressBuild:'VP đang xử lý'}}}};
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true,note:false}},
      freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:'seed',changedAt:1,deadline:0,closedAt:0}
    }}));
    const db=env.authenticatedContext('independent-anon',{
      firebase:{sign_in_provider:'anonymous'}}).database();
    const operationId='independent-status-attack';
    const oldAudit={...row.history['2'],
      ...(section==='changes'||section==='both'?{changes:{progressBuild:'Sở chưa trình'}}:{}),
      ...(section==='oldValues'||section==='both'?{oldValues:{progressBuild:'VP đang xử lý'}}:{})};
    const attack={...row,progressCouncil:'VP đang xử lý',revision:3,operationId,
      updatedAt:serverTimestamp(),updatedBy:'independent-anon',history:{'2':oldAudit,
        '3':{operationId,recordId:'r1',at:serverTimestamp(),actor:'independent-anon',maintenanceEpoch:1,
          changes:{progressCouncil:'VP đang xử lý'},oldValues:{progressCouncil:'Sở chưa trình'}}}};
    await assertFails(set(ref(db,'hdnd/items/r1'),attack));
    const actual=(await get(ref(db,'hdnd/items/r1'))).val();
    expect(actual.history['2'].changes.note).toBe(demo.note);
    expect(actual.revision).toBe(2);
  });
  it('allows the current ring slot to replace its 50-commits-old payload',async()=>{
    await env.clearDatabase();
    const {archivedAt:_ignore,...demo}=createDemoItems(1)[0];
    const history=Object.fromEntries(Array.from({length:50},(_,index)=>[String(index),{
      operationId:'prior-'+index,recordId:'r1',at:100+index,actor:'prior-writer',
      changes:{note:demo.note,progressBuild:'Sở chưa trình'},
      oldValues:{note:'Original note',progressBuild:'VP đang xử lý'}
    }]));
    const row={...demo,recordId:'r1',displayCode:'NQ01',partyLevel:'BCH',
      progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
      revision:51,operationId:'prior-1',updatedAt:101,updatedBy:'prior-writer',history};
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true,note:false}},
      freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:'seed',changedAt:1,deadline:0,closedAt:0}
    }}));
    const db=env.authenticatedContext('independent-anon',{
      firebase:{sign_in_provider:'anonymous'}}).database();
    const operationId='independent-ring-rollover';
    const next={...row,progressCouncil:'VP đang xử lý',revision:52,operationId,
      updatedAt:serverTimestamp(),updatedBy:'independent-anon',history:{...history,
        '2':{operationId,recordId:'r1',at:serverTimestamp(),actor:'independent-anon',maintenanceEpoch:1,
          changes:{progressCouncil:'VP đang xử lý'},oldValues:{progressCouncil:'Sở chưa trình'}}}};
    await assertSucceeds(set(ref(db,'hdnd/items/r1'),next));
    const actual=(await get(ref(db,'hdnd/items/r1'))).val();
    expect(actual.revision).toBe(52);
    expect(Object.keys(actual.history)).toHaveLength(50);
    expect(actual.history['2'].changes).toEqual({progressCouncil:'VP đang xử lý'});
    for(const [slot,event] of Object.entries(history))
      if(slot!=='2')expect(actual.history[slot]).toEqual(event);
  });
  it.skipIf(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')(
    'rejects a draft created before a legacy primary maintenance epoch',async()=>{
    await env.clearDatabase();
    const app=initializeApp({apiKey:'demo-key',authDomain:'demo-hdnd.firebaseapp.com',
      projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com',appId:'independent-maintenance'},
      'independent-maintenance-'+crypto.randomUUID());
    try{
      const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
      const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
      const {user}=await signInAnonymously(auth);
      const {archivedAt:_ignore,...demo}=createDemoItems(1)[0];
      const old={...demo,recordId:'r1',displayCode:'NQ01',partyLevel:'BCH',
        progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
        revision:1,operationId:'old-dataset',updatedAt:100,updatedBy:'seed'};
      const freeze={mode:'OPEN',revision:1,epoch:1,actor:'seed',changedAt:1,deadline:0,closedAt:0};
      await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
        items:{r1:old},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
      }}));
      const repository=new FirebaseRepository(db,()=>user,
        ()=>({columns:{progressCouncil:true}}),'hdnd/items');
      const oldPatch=updateDraft((await repository.list())[0],undefined,{progressCouncil:'VP đang xử lý'})!;
      expect(Reflect.get(oldPatch,'legacyMaintenanceEpoch')).toBe(1);
      // Simulate only the independently completed Admin maintenance result;
      // no privileged fixture writes substitute for the status save under test.
      await env.withSecurityRulesDisabled(async ctx=>{
        await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,mode:'FROZEN',revision:2,epoch:2});
        await set(ref(ctx.database(),'hdnd/items'),{r1:{...old,
          content:'Different approved Excel dataset, same stable code and status baseline',
          operationId:'replacement-dataset'}});
        await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,revision:3,epoch:2});
      });
      const saved=(await repository.save([oldPatch]))[0];
      const actual=(await get(ref(db,'hdnd/items/r1'))).val();
      console.log('PR190_STALE_MAINTENANCE_PROBE',JSON.stringify({
        saved:saved.ok,revision:actual.revision,content:actual.content,
        progressCouncil:actual.progressCouncil,oldOperationApplied:actual.operationId===oldPatch.operationId}));
      expect(saved.ok).toBe(false);
      expect(actual.progressCouncil).toBe('Sở chưa trình');
      expect(actual.revision).toBe(1);
    }finally{await deleteApp(app);}
  });
  it.each([-1,0,2,1.5,'1',null,undefined])('rejects a direct status with forged/missing epoch %s',async epoch=>{
    await env.clearDatabase();
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    const db=env.authenticatedContext('independent-anon',{
      firebase:{sign_in_provider:'anonymous'}}).database();
    await assertFails(set(ref(db,'hdnd/items/r1'),nextStatus(row,'independent-anon',epoch)));
    expect((await get(ref(db,'hdnd/items/r1/revision'))).val()).toBe(1);
  });
  it.each(['delete','change'])('preserves an older audit maintenanceEpoch against %s',async action=>{
    await env.clearDatabase();
    const prior={operationId:'previous',recordId:'r1',at:100,actor:'prior-writer',maintenanceEpoch:0,
      changes:{progressBuild:'Sở chưa trình'},oldValues:{progressBuild:'VP đang xử lý'}};
    const row={...seedRow(),revision:2,operationId:'previous',history:{'2':prior}};
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    const db=env.authenticatedContext('independent-anon',{
      firebase:{sign_in_provider:'anonymous'}}).database();
    const oldAudit:Record<string,unknown>={...prior};
    if(action==='delete')delete oldAudit.maintenanceEpoch;else oldAudit.maintenanceEpoch=1;
    const candidate=nextStatus(row,'independent-anon',1);
    candidate.history['2']=oldAudit;
    await assertFails(set(ref(db,'hdnd/items/r1'),candidate));
    expect((await get(ref(db,'hdnd/items/r1/history/2/maintenanceEpoch'))).val()).toBe(0);
  });
  it.skipIf(!realAuthEnabled)('fresh post-maintenance drafts save with their newly captured epoch',async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:{...seedRow(),content:'Approved replacement content'}},
      permissions:{columns:{progressCouncil:true}},freezeControl:{...freeze,revision:3,epoch:2}
    }}));
    await withClient(async(db,user)=>{
      const repository=new FirebaseRepository(db,()=>user,()=>({columns:{progressCouncil:true}}),'hdnd/items');
      const baseline=(await repository.list())[0];
      expect(Reflect.get(baseline,'legacyMaintenanceEpoch')).toBe(2);
      const patch=updateDraft(baseline,undefined,{progressCouncil:'VP đang xử lý'})!;
      expect(Reflect.get(patch,'legacyMaintenanceEpoch')).toBe(2);
      const result=(await repository.save([patch]))[0];
      expect(result.ok,result.message).toBe(true);
      const actual=(await get(ref(db,'hdnd/items/r1'))).val();
      expect(actual.history['2'].maintenanceEpoch).toBe(2);
      expect(actual.content).toBe('Approved replacement content');
      expect(actual.revision).toBe(2);
    });
  });
  it.skipIf(!realAuthEnabled)('server rejects a queued old-epoch CAS after freeze, replacement and reopen',async()=>{
    await env.clearDatabase();
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    await withClient(async(db,user)=>{
      let stop=()=>{};
      await new Promise<void>((resolve,reject)=>{
        stop=onValue(ref(db,'hdnd/items/r1'),()=>resolve(),reject);
      });
      goOffline(db);
      let callbackStarted!:()=>void;
      const callbackSeen=new Promise<void>(resolve=>{callbackStarted=resolve;});
      const queued=runTransaction(ref(db,'hdnd/items/r1'),raw=>{
        callbackStarted();
        return raw?nextStatus(raw,user.uid,1):undefined;
      },{applyLocally:false});
      // Attach rejection handling before reconnect, avoiding unhandled-rejection races.
      const rejected=assertFails(queued);
      await callbackSeen;
      try{
        await env.withSecurityRulesDisabled(async ctx=>{
          await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,mode:'FROZEN',revision:2,epoch:2});
          await set(ref(ctx.database(),'hdnd/items'),{r1:{...row,content:'Replacement while old CAS queued'}});
          await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,revision:3,epoch:2});
        });
      }finally{goOnline(db);}
      try{await rejected;}finally{stop();}
      const actual=(await get(ref(db,'hdnd/items/r1'))).val();
      expect(actual.revision).toBe(1);
      expect(actual.progressCouncil).toBe('Sở chưa trình');
      expect(actual.content).toBe('Replacement while old CAS queued');
      expect(actual.history??null).toBeNull();
    });
  });
  it.skipIf(!realAuthEnabled)('same-epoch different-field drafts still merge without losing an audit event',async()=>{
    await env.clearDatabase();
    const grants={progressCouncil:true,progressBuild:true};
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:seedRow()},permissions:{columns:grants},freezeControl:freeze
    }}));
    await withClient(async(a,userA)=>withClient(async(b,userB)=>{
      const first=new FirebaseRepository(a,()=>userA,()=>({columns:grants}),'hdnd/items');
      const second=new FirebaseRepository(b,()=>userB,()=>({columns:grants}),'hdnd/items');
      const [baseA,baseB]=await Promise.all([first.list(),second.list()]);
      const one=updateDraft(baseA[0],undefined,{progressCouncil:'VP đang xử lý'})!;
      const two=updateDraft(baseB[0],undefined,{progressBuild:'VP đang xử lý'})!;
      const [x,y]=await Promise.all([first.save([one]),second.save([two])]);
      expect(x[0].ok,x[0].message).toBe(true);expect(y[0].ok,y[0].message).toBe(true);
      const actual=(await get(ref(a,'hdnd/items/r1'))).val();
      expect(actual.revision).toBe(3);
      expect(actual.progressCouncil).toBe('VP đang xử lý');
      expect(actual.progressBuild).toBe('VP đang xử lý');
      expect(actual.history['2'].maintenanceEpoch).toBe(1);
      expect(actual.history['3'].maintenanceEpoch).toBe(1);
    }));
  });
  it.skipIf(!realAuthEnabled)('FROZEN display rows cannot authorize a stale draft after replacement within that epoch',async()=>{
    await env.clearDatabase();
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},
      freezeControl:{...freeze,mode:'FROZEN',revision:2,epoch:2}
    }}));
    await withClient(async(db,user)=>{
      const repository=new FirebaseRepository(db,()=>user,()=>({columns:{progressCouncil:true}}),'hdnd/items');
      const baseline=(await repository.list())[0];
      expect(Reflect.get(baseline,'legacyMaintenanceEpoch')).toBeUndefined();
      const patch=updateDraft(baseline,undefined,{progressCouncil:'VP đang xử lý'})!;
      await env.withSecurityRulesDisabled(async ctx=>{
        await set(ref(ctx.database(),'hdnd/items'),{r1:{...row,content:'Replacement in existing frozen epoch'}});
        await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,revision:3,epoch:2});
      });
      const saved=(await repository.save([patch]))[0];
      expect(saved.ok).toBe(false);
      const actual=(await get(ref(db,'hdnd/items/r1'))).val();
      expect(actual.revision).toBe(1);
      expect(actual.progressCouncil).toBe('Sở chưa trình');
    });
  });
  it.skipIf(!realAuthEnabled)('old leased writers can omit new epoch metadata while preserving prior audit',async()=>{
    await env.clearDatabase();
    const row={...seedRow(),revision:2,operationId:'previous',history:{'2':{
      operationId:'previous',recordId:'r1',at:100,actor:'prior-writer',maintenanceEpoch:1,
      changes:{progressBuild:'Sở chưa trình'},oldValues:{progressBuild:'VP đang xử lý'}}}};
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    await withClient(async(db,user)=>{
      const manager=new CellEditSessionManager(db,()=>user);
      try{
        await manager.acquire('r1','progressCouncil','status');
        const credential=manager.credential('r1','progressCouncil');
        expect(credential).toBeTruthy();
        const candidate={...nextStatus(row,user.uid,undefined),editProofs:{progressCouncil:credential!.token}};
        await assertSucceeds(set(ref(db,'hdnd/items/r1'),candidate));
        const actual=(await get(ref(db,'hdnd/items/r1'))).val();
        expect(actual.history['3'].maintenanceEpoch).toBeUndefined();
        expect(actual.history['2']).toEqual(row.history['2']);
        expect(actual.revision).toBe(3);
      }finally{await manager.dispose();}
    });
  });
  it.skipIf(!realAuthEnabled)('offline cached rows never gain a fresh maintenance stamp',async()=>{
    await env.clearDatabase();
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    await withClient(async(db,user)=>{
      const repository=new FirebaseRepository(db,()=>user,()=>({columns:{progressCouncil:true}}),'hdnd/items');
      expect(Reflect.get((await repository.list())[0],'legacyMaintenanceEpoch')).toBe(1);
      let stop=()=>{};
      await new Promise<void>((resolve,reject)=>{
        stop=onValue(ref(db,'hdnd/items/r1'),()=>resolve(),reject);
      });
      goOffline(db);
      try{
        await env.withSecurityRulesDisabled(async ctx=>{
          await set(ref(ctx.database(),'hdnd/items'),{r1:{...row,content:'New dataset while browser offline'}});
          await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,revision:3,epoch:2});
        });
        expect((await get(ref(db,'hdnd/items/r1/content'))).val()).toBe(row.content);
        await expect(repository.list()).rejects.toThrow();
      }finally{stop();goOnline(db);}
    });
  },15000);
  it.skipIf(!realAuthEnabled)('subscription does not stamp old rows when epoch changes between server reads',async()=>{
    await env.clearDatabase();
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    await withClient(async(db,user)=>{
      const repository=new FirebaseRepository(db,()=>user,()=>({columns:{progressCouncil:true}}),'hdnd/items');
      const publications:{content:string;epoch:unknown}[]=[];
      let firstReady!:()=>void,nextReady!:()=>void;
      const first=new Promise<void>(resolve=>{firstReady=resolve;});
      const next=new Promise<void>(resolve=>{nextReady=resolve;});
      const nativeFetch=globalThis.fetch;
      let armed=false,intercepted=false;
      globalThis.fetch=async(input,init)=>{
        const response=await nativeFetch(input,init);
        const url=new URL(input instanceof Request?input.url:String(input));
        if(armed&&!intercepted&&url.pathname==='/hdnd/items.json'){
          intercepted=true;
          await response.clone().text(); // Preserve the already-returned OLD server response.
          await env.withSecurityRulesDisabled(async ctx=>{
            await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,mode:'FROZEN',revision:3,epoch:2});
            await set(ref(ctx.database(),'hdnd/items'),{r1:{...row,content:'New coherent subscription dataset'}});
            await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,revision:4,epoch:2});
          });
        }
        return response;
      };
      const stop=repository.subscribe(rows=>{
        const current=rows[0];
        if(!current)return;
        const epoch=Reflect.get(current,'legacyMaintenanceEpoch');
        publications.push({content:current.content,epoch});
        if(epoch===1)firstReady();
        if(epoch===2&&current.content==='New coherent subscription dataset')nextReady();
      },()=>{});
      try{
        await first;
        armed=true;
        await env.withSecurityRulesDisabled(async ctx=>
          set(ref(ctx.database(),'hdnd/freezeControl/revision'),2));
        await next;
        expect(intercepted).toBe(true);
        expect(publications.some(p=>p.epoch===1)).toBe(true);
        expect(publications.filter(p=>p.epoch===2).every(p=>p.content==='New coherent subscription dataset')).toBe(true);
      }finally{stop();globalThis.fetch=nativeFetch;}
    });
  },15000);
  it.skipIf(!realAuthEnabled)('does not report old success when maintenance starts between commit and caller acknowledgement',async()=>{
    await env.clearDatabase();
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    await withClient(async(db,user)=>{
      const repository=new FirebaseRepository(db,()=>user,()=>({columns:{progressCouncil:true}}),'hdnd/items');
      const patch=updateDraft((await repository.list())[0],undefined,{progressCouncil:'VP đang xử lý'})!;
      const nativeFetch=globalThis.fetch;
      let intercepted=false,witnessedCommit=false;
      globalThis.fetch=async(input,init)=>{
        const url=new URL(input instanceof Request?input.url:String(input));
        if(!intercepted&&url.pathname==='/hdnd/freezeControl.json'){
          intercepted=true;
          const committed=(await get(ref(db,'hdnd/items/r1'))).val();
          witnessedCommit=committed.operationId===patch.operationId&&committed.revision===2;
          await env.withSecurityRulesDisabled(async ctx=>{
            await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,mode:'FROZEN',revision:2,epoch:2});
            await set(ref(ctx.database(),'hdnd/items'),{r1:{...row,content:'Replacement before caller confirmation'}});
            await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,revision:3,epoch:2});
          });
        }
        return nativeFetch(input,init);
      };
      try{
        const result=(await repository.save([patch]))[0];
        expect(intercepted).toBe(true);expect(witnessedCommit).toBe(true);
        expect(result.ok).toBe(false);
        const actual=(await get(ref(db,'hdnd/items/r1'))).val();
        expect(actual.revision).toBe(1);
        expect(actual.progressCouncil).toBe('Sở chưa trình');
        expect(actual.content).toBe('Replacement before caller confirmation');
      }finally{globalThis.fetch=nativeFetch;}
    });
  });
  it.skipIf(!realAuthEnabled)('idempotent old operation cannot report success after the epoch has changed',async()=>{
    await env.clearDatabase();
    const row=seedRow();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:row},permissions:{columns:{progressCouncil:true}},freezeControl:freeze
    }}));
    await withClient(async(db,user)=>{
      const repository=new FirebaseRepository(db,()=>user,()=>({columns:{progressCouncil:true}}),'hdnd/items');
      const patch=updateDraft((await repository.list())[0],undefined,{progressCouncil:'VP đang xử lý'})!;
      expect((await repository.save([patch]))[0].ok).toBe(true);
      await env.withSecurityRulesDisabled(async ctx=>{
        await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,mode:'FROZEN',revision:2,epoch:2});
        await set(ref(ctx.database(),'hdnd/freezeControl'),{...freeze,revision:3,epoch:2});
      });
      const repeated=(await repository.save([patch]))[0];
      expect(repeated.ok).toBe(false);
      const actual=(await get(ref(db,'hdnd/items/r1'))).val();
      expect(actual.revision).toBe(2);
      expect(Object.keys(actual.history)).toHaveLength(1);
    });
  });
  it.skipIf(!realAuthEnabled)('verified Google Admin uses a bound anonymous direct CAS without public grants',async()=>{
    await env.clearDatabase();
    await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),{hdnd:{
      items:{r1:seedRow()},permissions:{columns:{progressCouncil:false}},
      control:{editingLocked:true},freezeControl:freeze
    }}));
    await withClient(async(db)=>{
      const admin=await signInAsEmulatorGoogleAdmin(getAuth(db.app));
      const repository=new FirebaseRepository(db,()=>admin,
        ()=>({columns:{progressCouncil:false}}),'hdnd/items');
      try{
        const baseline=(await repository.list())[0];
        expect(Reflect.get(baseline,'legacyMaintenanceEpoch')).toBe(1);
        const patch=updateDraft(baseline,undefined,{progressCouncil:'VP đang xử lý'})!;
        const result=(await repository.save([patch]))[0];
        expect(result.ok,result.message).toBe(true);
        const row=(await get(ref(db,'hdnd/items/r1'))).val();
        expect(row.revision).toBe(2);
        expect(row.progressCouncil).toBe('VP đang xử lý');
        expect(row.history['2'].maintenanceEpoch).toBe(1);
        expect(row.updatedBy).not.toBe(admin.uid);
        const session=(await get(ref(db,'hdnd/sparkSessions/'+row.updatedBy))).val();
        expect(session.ownerUid).toBe(admin.uid);
        expect(session.admin).toBe(true);
        expect((await get(ref(db,'hdnd/editLocks/r1/progressCouncil'))).val()).toBeNull();
      }finally{await closeSparkSession(db);}
    });
  });
});
