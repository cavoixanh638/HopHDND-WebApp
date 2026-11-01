import assert from 'node:assert/strict';
import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {initializeApp as adminInitialize,deleteApp as adminDelete} from 'firebase-admin/app';
import {getAuth as getAdminAuth} from 'firebase-admin/auth';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential,signInAnonymously,getIdToken,signOut} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,ref,set,get,goOffline} from 'firebase/database';
import {getFunctions,connectFunctionsEmulator,httpsCallable} from 'firebase/functions';

const PROJECT='demo-pr142-cell-edit',INSTANCE=PROJECT+'-default-rtdb';
const rest='http://127.0.0.1:9000',authHost='http://127.0.0.1:9099';
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
 process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||!process.env.FIREBASE_EMULATOR_HUB)
 throw Error('EMULATOR_ONLY: refusing any non-local run');
const cases=[],checks=[];
const config={apiKey:'demo-pr142-local-only',authDomain:PROJECT+'.firebaseapp.com',
 projectId:PROJECT,appId:PROJECT,databaseURL:`https://${INSTANCE}.firebaseio.com`};
function client(name){
 const app=initializeApp(config,name),auth=getAuth(app),database=getDatabase(app);
 connectAuthEmulator(auth,authHost,{disableWarnings:true});
 connectDatabaseEmulator(database,'127.0.0.1',9000);
 const functions=getFunctions(app,'asia-southeast1');
 connectFunctionsEmulator(functions,'127.0.0.1',5001);
 return {app,auth,database,functions,call:httpsCallable(functions,'cellEdit',{timeout:20000})};
}
const a=client('A'),b=client('B'),c=client('C'),d=client('D-anonymous');
let uid,uidC,uidAnon,verifiedAdmin;
const proof=()=>randomBytes(32).toString('hex');
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
function scopeInfo(scope) {
 const op='pr142celledit01';
 return scope==='legacy'?{scope}:{
   scope,generation:{generationId:'gen_'+op,operationId:op,revision:1,rowCount:2,digest:'a'.repeat(64)}
 };
}
function paths(scope,id='r1',field='note'){
 const g=scopeInfo(scope).generation?.generationId;
 return scope==='legacy'
 ?{row:`hdnd/items/${id}`,lease:`hdnd/editLocks/${id}/${field}`}
 :{row:`hdnd/datasetV2/generations/${g}/items/${id}`,
   lease:`hdnd/datasetV2/leases/${g}/${id}/${field}`};
}
const row=id=>({
 recordId:id,displayCode:id==='r1'?'NQ01':'NQ02',stt:id==='r1'?1:2,revision:1,
 documentKind:'NQ',content:'MẪU kiểm tra sửa ô',department:'Sở mẫu A',
 type:'QPPL',partyLevel:'BCH',progressParty:'Sở chưa trình',
 progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
 specialist:'Chuyên viên mẫu',room:'Phòng mẫu',vpLeader:'Lãnh đạo mẫu',
 ubndLeader:'Lãnh đạo UBND',specificProgress:'MẪU chưa hoàn tất',
 note:'MẪU chưa sửa',isDropped:false,operationId:'baseline',updatedAt:Date.now(),updatedBy:'seed'
});
async function owner(method,path,value){
 const response=await fetch(`${rest}/${path}.json?ns=${INSTANCE}`,{
 method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
 ...(value===undefined?{}:{body:JSON.stringify(value)})});
 assert.equal(response.status,200,method+' '+path+' owner REST '+response.status);
 return response.json();
}
const ownerGet=p=>owner('GET',p);
const ownerPut=(p,v)=>owner('PUT',p,v);
async function seed(scope){
 const items={r1:row('r1'),r2:row('r2')};
 const data={
   items:scope==='legacy'?items:{},
   permissions:{columns:{note:true,progressBuild:true,specificProgress:true,room:true}},
   editors:{[uid]:true,[uidC]:false},
   control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
   freezeControl:{mode:'OPEN',revision:1,epoch:'poc',changedAt:0,deadline:0},
 };
 if(scope==='v2')data.datasetV2={
  active:scopeInfo(scope).generation,
  generations:{[scopeInfo(scope).generation.generationId]:{items}},
  permissions:{[scopeInfo(scope).generation.generationId]:{columns:{note:true,progressBuild:true,specificProgress:true,room:true}}}
 };
 await ownerPut('hdnd',data);
}
async function call(client,scope,action,params){
 const {data}=await client.call({...scopeInfo(scope),action,recordId:'r1',
   operationId:randomUUID(),...params});
 return data;
}
async function failCall(fn,label){
 let error;
 try{await fn();}catch(e){error=e;}
 assert.ok(error,label+' unexpectedly succeeded');
 return String(error.code??error.message);
}
async function sameState(scope,label,action){
 const p=paths(scope);
 const before={row:await ownerGet(p.row),lease:await ownerGet(p.lease)};
 const error=await failCall(action,label);
 const after={row:await ownerGet(p.row),lease:await ownerGet(p.lease)};
 assert.deepEqual(after,before,label+' modified server');
 checks.push({label,serverUnchanged:true,before:{row:hash(before.row),lease:hash(before.lease)},
   after:{row:hash(after.row),lease:hash(after.lease)},errorCode:error});
}
async function step(name,fn){
 try{await fn();cases.push({name,status:'PASS'});console.log('PASS '+name);}
 catch(e){cases.push({name,status:'FAIL',error:String(e?.message??e).slice(0,250)});console.log('FAIL '+name+' '+String(e?.code??e.message).slice(0,160));}
}
async function acquire(scope,recordId='r1',field='note',client=a) {
 const secret=proof(),operationId=randomUUID();
 const data=await call(client,scope,'acquire',{recordId,field,kind:'multiline',secret,operationId});
 assert.equal(data.status,'acquired');
 return {...data.lease,secret};
}
async function positive(scope){
 await seed(scope);
 const first=await acquire(scope);
 const renewed=await call(a,scope,'renew',{token:first.token,field:'note',secret:first.secret});
 assert.equal(renewed.status,'renewed');
 const opId=randomUUID();
 const patch={recordId:'r1',operationId:opId,baseRevision:1,baseValues:{note:'MẪU chưa sửa'},changes:{note:'MẪU đã sửa'}};
 const saved=await call(a,scope,'save',{operationId:opId,patch,leases:{note:{token:first.token,secret:first.secret}}});
 assert.equal(saved.status,'committed');
 assert.equal(saved.row.revision,2);
 assert.equal(saved.row.history['2'].oldValues.note,'MẪU chưa sửa');
 const again=await call(a,scope,'save',{operationId:opId,patch,leases:{note:{token:first.token,secret:first.secret}}});
 assert.equal(again.row.revision,2,'lost ACK double increment');
 const p=paths(scope);
 assert.equal((await ownerGet(p.row)).revision,2);
 const released=await call(a,scope,'release',{token:first.token,field:'note',secret:first.secret});
 assert.equal(released.status,'released');
 assert.equal((await ownerGet(p.lease)).expiresAt,0);
}
// Authentication still comes from a REAL Auth Emulator ID token, verified
// by Firebase Admin. The optional callback is passed only by this Node test,
// never through an HTTP/callable payload, after proof-read and before commit.
async function strictRace(scope,action,lease,afterProof){
 process.env.GCLOUD_PROJECT=PROJECT;
 const {dispatchCellEdit}=await import('../core.js');
 const verified=await getAdminAuth(verifiedAdmin).verifyIdToken(await getIdToken(a.auth.currentUser));
 const operationId=randomUUID();
 const payload={...scopeInfo(scope),action,recordId:'r1',
   operationId,field:'note',token:lease.token,secret:lease.secret};
 if(action==='save'){
   payload.patch={recordId:'r1',operationId,baseRevision:1,
     baseValues:{note:'MẪU chưa sửa'},changes:{note:'RACE blocked'}};
   payload.leases={note:{token:lease.token,secret:lease.secret}};
 }
 let e;
 try{await dispatchCellEdit({uid:verified.uid,token:verified},payload,{afterProof});}
 catch(error){e=error;}
 assert.ok(e,'in-flight mutation unexpectedly COMMITTED');
 assert.equal(e.code,'permission-denied',
   'must be RULES_DENIED at transaction, not LOCAL_ABORT, conflict or precheck: '+String(e.code));
 return e.code;
}

async function run(){
 const adminAssertion=JSON.stringify({sub:'pr142-cell-real-google',email:'poc-editor@demo.invalid',email_verified:true});
 const cAssertion=JSON.stringify({sub:'pr142-cell-real-other',email:'poc-other@demo.invalid',email_verified:true});
 const [ua,ub,uc]=await Promise.all([
   signInWithCredential(a.auth,GoogleAuthProvider.credential(adminAssertion)),
   signInWithCredential(b.auth,GoogleAuthProvider.credential(adminAssertion)),
   signInWithCredential(c.auth,GoogleAuthProvider.credential(cAssertion))
 ]);
 uid=ua.user.uid;uidC=uc.user.uid;assert.equal(ub.user.uid,uid);assert.notEqual(uidC,uid);
 verifiedAdmin=adminInitialize({projectId:PROJECT},'verify-emulator-real-claims');
 const ad=await signInAnonymously(d.auth);uidAnon=ad.user.uid;assert.notEqual(uidAnon,uid);
 for(const scope of ['legacy','v2']){
   await step(scope+' owner acquire/renew/SAVE/release + duplicate SAVE idempotent',()=>positive(scope));
   await step(scope+' same UID public proofHash/editProofs not bearer',async()=>{
     await seed(scope);const l=await acquire(scope);const p=paths(scope);
     const publicLease=(await get(ref(b.database,p.lease))).val();
     assert.equal(publicLease.proofHash.length,64);
     assert.ok(!Object.hasOwn(publicLease,'secret'));
     // Start with a valid SAVE to populate row.editProofs; keep the lease held.
     const operationId=randomUUID();
     await call(a,scope,'save',{operationId,patch:{recordId:'r1',baseRevision:1,operationId,
       baseValues:{note:'MẪU chưa sửa'},changes:{note:'MẪU đã sửa'}},
       leases:{note:{token:l.token,secret:l.secret}}});
     const rowPublic=(await get(ref(b.database,p.row))).val();
     for(const publicValue of [publicLease.proofHash,rowPublic.editProofs.note]){
       for(const action of ['renew','release','save'])await sameState(scope,'B public '+action,()=>call(b,scope,action,{
         token:l.token,field:'note',secret:publicValue,
         ...(action==='save'?{
           patch:{recordId:'r1',operationId:randomUUID(),baseRevision:2,
             baseValues:{note:'MẪU đã sửa'},changes:{note:'B forged'}},
           leases:{note:{token:l.token,secret:publicValue}}
         }:{})}));
     }
   });
   await step(scope+' raw SDK denied, authenticated REST read and write controls',async()=>{
     await seed(scope);const l=await acquire(scope);const p=paths(scope);
     await sameState(scope,'raw SDK',()=>set(ref(b.database,p.lease),{
       uid,session:l.session,token:l.token,proofHash:l.proofHash,revision:l.revision+1,
       kind:l.kind,acquiredAt:l.acquiredAt,expiresAt:0}));
     const jwt=await getIdToken(ub.user);
     const anon=await fetch(`${rest}/${p.lease}.json?ns=${INSTANCE}`);
     const positiveRead=await fetch(`${rest}/${p.lease}.json?ns=${INSTANCE}&auth=${encodeURIComponent(jwt)}`);
     assert.ok([401,403].includes(anon.status),'unauth REST lease unexpectedly readable');
     assert.equal(positiveRead.status,200);
     const before=await ownerGet(p.lease);
     const forged=await fetch(`${rest}/${p.lease}.json?ns=${INSTANCE}&auth=${encodeURIComponent(jwt)}`,{
       method:'PATCH',headers:{'Content-Type':'application/json','X-CellService':'true'},
       body:JSON.stringify({expiresAt:0})});
     assert.ok([401,403].includes(forged.status),'raw authenticated REST PATCH accepted');
     assert.deepEqual(await ownerGet(p.lease),before);
   });
   await step(scope+' revoked editor blocks at row Rules commit',async()=>{
     await seed(scope);const l=await acquire(scope);
     await ownerPut('hdnd/editors/'+uid,false);
     await sameState(scope,'revocation',()=>call(a,scope,'save',{
       patch:{recordId:'r1',operationId:randomUUID(),baseRevision:1,
         baseValues:{note:'MẪU chưa sửa'},changes:{note:'revoked'}},
       leases:{note:{token:l.token,secret:l.secret}}}));
   });
   await step(scope+' FROZEN blocks SAVE/RENEW at Rules commit',async()=>{
     await seed(scope);const l=await acquire(scope);
     await ownerPut('hdnd/freezeControl',{mode:'FROZEN',epoch:'poc',revision:2,changedAt:Date.now(),deadline:0});
     await sameState(scope,'frozen renew',()=>call(a,scope,'renew',{token:l.token,field:'note',secret:l.secret}));
     await sameState(scope,'frozen save',()=>call(a,scope,'save',{
       patch:{recordId:'r1',operationId:randomUUID(),baseRevision:1,
         baseValues:{note:'MẪU chưa sửa'},changes:{note:'frozen'}},
       leases:{note:{token:l.token,secret:l.secret}}}));
   });
   await step(scope+' active generation switch fences old lease',async()=>{
     await seed(scope);const l=await acquire(scope);
     await ownerPut('hdnd/datasetV2/active',{generationId:'gen_other',operationId:'other',revision:2,
       rowCount:2,digest:'b'.repeat(64)});
     await sameState(scope,'generation switch',()=>call(a,scope,'renew',{token:l.token,field:'note',secret:l.secret}));
   });


   await step(scope+' IN-FLIGHT revoke AFTER proof-read BEFORE Rules transaction',async()=>{
     await seed(scope);const l=await acquire(scope);
     const before={row:await ownerGet(paths(scope).row),lease:await ownerGet(paths(scope).lease)};
     const result=await strictRace(scope,'save',l,()=>ownerPut('hdnd/editors/'+uid,false));
     assert.equal(result,'permission-denied');
     assert.deepEqual({row:await ownerGet(paths(scope).row),lease:await ownerGet(paths(scope).lease)},before);
     checks.push({label:scope+' in-flight revoke',outcome:'RULES_DENIED',serverUnchanged:true});
   });
   await step(scope+' IN-FLIGHT freeze AFTER proof-read BEFORE Rules transaction',async()=>{
     await seed(scope);const l=await acquire(scope);
     const before={row:await ownerGet(paths(scope).row),lease:await ownerGet(paths(scope).lease)};
     await strictRace(scope,'save',l,()=>ownerPut('hdnd/freezeControl',{
       mode:'FROZEN',epoch:'poc',revision:2,changedAt:Date.now(),deadline:0}));
     assert.deepEqual({row:await ownerGet(paths(scope).row),lease:await ownerGet(paths(scope).lease)},before);
     checks.push({label:scope+' in-flight freeze',outcome:'RULES_DENIED',serverUnchanged:true});
   });
   await step(scope+' IN-FLIGHT pointer swap AFTER proof-read BEFORE Rules transaction',async()=>{
     await seed(scope);const l=await acquire(scope);
     const before={row:await ownerGet(paths(scope).row),lease:await ownerGet(paths(scope).lease)};
     await strictRace(scope,'save',l,()=>ownerPut('hdnd/datasetV2/active',{
       generationId:'gen_new',operationId:'new',revision:2,rowCount:2,digest:'b'.repeat(64)}));
     assert.deepEqual({row:await ownerGet(paths(scope).row),lease:await ownerGet(paths(scope).lease)},before);
     checks.push({label:scope+' in-flight pointer',outcome:'RULES_DENIED',serverUnchanged:true});
   });
   await step(scope+' anonymous guest with granted note writes through authenticated service',async()=>{
     await seed(scope);const l=await acquire(scope,'r1','note',d);
     const operationId=randomUUID();
     const result=await call(d,scope,'save',{operationId,patch:{
       recordId:'r1',operationId,baseRevision:1,
       baseValues:{note:'MẪU chưa sửa'},changes:{note:'MẪU khách đã cập nhật'}},
       leases:{note:{token:l.token,secret:l.secret}}});
     assert.equal(result.status,'committed');
     assert.equal(result.row.updatedBy,uidAnon);
     assert.equal(result.row.history['2'].actor,uidAnon);
   });
   await step(scope+' cell-specific deny overrides allowed column at Rules commit',async()=>{
     await seed(scope);const l=await acquire(scope);
     const perms=scope==='legacy'?'hdnd/permissions/cells/r1/note':
       'hdnd/datasetV2/permissions/'+scopeInfo(scope).generation.generationId+'/cells/r1/note';
     await ownerPut(perms,false);
     await sameState(scope,'cell permission false',()=>call(a,scope,'save',{
       patch:{recordId:'r1',operationId:randomUUID(),baseRevision:1,
         baseValues:{note:'MẪU chưa sửa'},changes:{note:'blocked by cell policy'}},
       leases:{note:{token:l.token,secret:l.secret}}}));
   });
   await step(scope+' HC type rejects progressBuild mutation and retains data',async()=>{
     await seed(scope);const p=paths(scope);
     await ownerPut(p.row+'/type','HC');
     const l=await acquire(scope,'r1','progressBuild');
     await sameState(scope,'HC build policy',()=>call(a,scope,'save',{
       patch:{recordId:'r1',operationId:randomUUID(),baseRevision:1,
         baseValues:{progressBuild:'Sở chưa trình'},changes:{progressBuild:'Đã trình'}},
       leases:{progressBuild:{token:l.token,secret:l.secret}}}));
   });
   await step(scope+' two independent fields on one row retain per-field CAS',async()=>{
     await seed(scope);await ownerPut('hdnd/editors/'+uidC,true);
     const [la,lc]=await Promise.all([
       acquire(scope,'r1','note',a),acquire(scope,'r1','specificProgress',c)
     ]);
     const opA=randomUUID(),opC=randomUUID();
     const savedA=await call(a,scope,'save',{operationId:opA,patch:{
       recordId:'r1',operationId:opA,baseRevision:1,
       baseValues:{note:'MẪU chưa sửa'},changes:{note:'A note after CAS'}},
       leases:{note:{token:la.token,secret:la.secret}}});
     assert.equal(savedA.row.revision,2);
     const savedC=await call(c,scope,'save',{operationId:opC,patch:{
       recordId:'r1',operationId:opC,baseRevision:1,
       baseValues:{specificProgress:'MẪU chưa hoàn tất'},changes:{specificProgress:'C progress after CAS'}},
       leases:{specificProgress:{token:lc.token,secret:lc.secret}}});
     assert.equal(savedC.row.revision,3);
     const final=await ownerGet(paths(scope).row);
     assert.equal(final.note,'A note after CAS');
     assert.equal(final.specificProgress,'C progress after CAS');
     assert.equal(final.history['2'].actor,uid);
     assert.equal(final.history['3'].actor,uidC);
   });
   await step(scope+' concurrent A/C isolation on different unlocked rows',async()=>{
     await seed(scope);const [aResult,cResult]=await Promise.allSettled([
       acquire(scope,'r1','note',a),
       acquire(scope,'r2','note',c)
     ]);
     assert.equal(aResult.status,'fulfilled');
     assert.equal(cResult.status,'rejected');
     assert.equal((await ownerGet(paths(scope,'r1').lease)).uid,uid);
     assert.equal(await ownerGet(paths(scope,'r2').lease),null);
   });
 }
}
let fatal=null;
try{await run();}catch(e){fatal=String(e?.message??e);console.log('FATAL '+fatal);}
finally{
 for(const x of [a,b,c,d]){try{goOffline(x.database);}catch{}}
 await Promise.allSettled([signOut(a.auth),signOut(b.auth),signOut(c.auth),signOut(d.auth)]);
 await Promise.allSettled([deleteApp(a.app),deleteApp(b.app),deleteApp(c.app),deleteApp(d.app)]);
 if(verifiedAdmin)await adminDelete(verifiedAdmin);
 writeFileSync(new URL('./witness.local.json',import.meta.url),JSON.stringify({
  source:'FULL candidate Rules copy, cellService guard applied',
  reviewedSha:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847',
  summary:{pass:cases.filter(x=>x.status==='PASS').length,fail:cases.filter(x=>x.status==='FAIL').length},
  fatal,cases,checks
 },null,2));
}
console.log('SUMMARY '+cases.filter(x=>x.status==='PASS').length+' PASS / '+cases.filter(x=>x.status==='FAIL').length+' FAIL');
process.exit(fatal||cases.some(c=>c.status==='FAIL')?1:0);
