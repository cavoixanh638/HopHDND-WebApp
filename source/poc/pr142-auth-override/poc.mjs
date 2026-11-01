/**
 * PR142 isolated proof of Firebase Admin databaseAuthVariableOverride.
 * NEVER connects to production. Uses Auth + RTDB Emulators only.
 * This is a minimal, synthetic RULES MECHANISM PoC, NOT the candidate app.
 */
import assert from 'node:assert/strict';
import {createHash, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {initializeApp as adminInitialize, deleteApp as adminDelete} from 'firebase-admin/app';
import {getAuth as getAdminAuth} from 'firebase-admin/auth';
import {getDatabase as getAdminDatabase} from 'firebase-admin/database';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, getIdToken, getIdTokenResult} from 'firebase/auth';
import {getDatabase, connectDatabaseEmulator, get, ref, update, set} from 'firebase/database';

const PROJECT='demo-pr142-override';
const NAMESPACE=`${PROJECT}-default-rtdb`;
const SHA='98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847';
const DB_URL=`https://${NAMESPACE}.firebaseio.com`;
const API_URL='http://127.0.0.1:9000';
const AUTH_URL='http://127.0.0.1:9099';
const JSON_PATH=new URL('./witness.local.json',import.meta.url);
const results=[];
let appSerial=0;

function guard() {
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000' ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')
    throw new Error('STOP: both FIREBASE_*_EMULATOR_HOST must point to 127.0.0.1 local emulators');
  if (!PROJECT.startsWith('demo-') || !DB_URL.includes('demo-'))
    throw new Error('STOP: non-demo project');
}
guard();

function hashProof(uid,backend,secret) {
  return createHash('sha256').update('PR142 cell proof v1\0').update(uid)
    .update('\0').update(backend).update('\0').update(secret).digest('hex');
}
function proofEqual(actual, expected) {
  if (!/^[a-f0-9]{64}$/.test(String(actual))) return false;
  return timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
}
function rowPath(backend) {
  return backend==='legacy'?'hdnd/items/r1':'hdnd/datasetV2/generations/gen_test_a/items/r1';
}
function leasePath(backend) {
  return backend==='legacy'?'hdnd/editLocks/r1/note':'hdnd/datasetV2/leases/gen_test_a/r1/note';
}
async function ownerRequest(method,path,body) {
  const r=await fetch(`${API_URL}/${path}.json?ns=${NAMESPACE}`,{
    method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  if (!r.ok) throw new Error(`LOCAL_OWNER_${method}_${path}_${r.status}: ${(await r.text()).slice(0,100)}`);
  return r.json();
}
const ownerGet=path=>ownerRequest('GET',path);
const ownerPut=(path,value)=>ownerRequest('PUT',path,value);
async function witness(backend) {
  return {row:await ownerGet(rowPath(backend)),lease:await ownerGet(leasePath(backend))};
}
function expectSame(a,b,label) {assert.deepEqual(b,a,`${label}: server row/lease changed unexpectedly`);}
function expectCode(fn,expected) {
  return fn().then(()=>{throw new Error(`Expected ${expected}, operation completed`);},e=>{
    if (e.message===`Expected ${expected}, operation completed`) throw e;
    assert.match(String(e?.code??e?.message),expected);
  });
}

const clientConfig={apiKey:'demo-pr142-api-key',authDomain:`${PROJECT}.firebaseapp.com`,
  projectId:PROJECT,databaseURL:DB_URL};
function client(label) {
  const app=initializeApp(clientConfig,`client-${label}`);
  const auth=getAuth(app);connectAuthEmulator(auth,AUTH_URL,{disableWarnings:true});
  const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
  return {app,auth,db};
}

// Firebase Auth Emulator issues REAL Emulator ID tokens: no rules-unit-testing
// authenticatedContext which can artificially inject arbitrary custom claims.
const authAdminApp=adminInitialize({projectId:PROJECT},'poc-auth-verify');
const adminAuth=getAdminAuth(authAdminApp);
async function verified(idToken) {
  const decoded=await adminAuth.verifyIdToken(idToken);
  assert.ok(decoded.uid);
  assert.notEqual(decoded.cellService,true,'The caller ID token must NOT carry service claim');
  return decoded;
}
async function scoped(idToken,serviceClaim,fn) {
  const identity=await verified(idToken);
  const name=`scoped-${++appSerial}-${randomUUID()}`;
  // Only the trusted server constructs this override; never from client input.
  const app=adminInitialize({projectId:PROJECT,databaseURL:DB_URL,
    databaseAuthVariableOverride:{uid:identity.uid,token:{
      email:identity.email??null,
      email_verified:identity.email_verified===true,
      firebase:{sign_in_provider:identity.firebase?.sign_in_provider??'anonymous'},
      cellService:serviceClaim
    }}},name);
  try {return await fn(getAdminDatabase(app),identity,name);}
  finally {await adminDelete(app);}
}

// In a real callable, idToken comes from the verified Firebase callable context.
// This PoC passes a token explicitly to prove the UID cannot be selected by payload.
async function gateway(idToken,action,backend,secret,options={}) {
  if (!Buffer.isBuffer(secret)) secret=Buffer.from(String(secret));
  if (secret.length!==32) throw Object.assign(new Error('PROOF_INVALID'),{code:'PROOF_INVALID'});
  return scoped(idToken,true,async (db,actor)=>{
    const loc=db.ref(leasePath(backend));
    const digest=hashProof(actor.uid,backend,secret);
    const now=Date.now();
    if (action==='acquire') {
      const leaseId=randomUUID();
      const outcome=await loc.transaction(current=>{
        if (current && current.expiresAt>now) return;
        return {uid:actor.uid,leaseId,proofHash:digest,revision:(current?.revision??0)+1,
          kind:'short',acquiredAt:now,expiresAt:now+30000};
      },undefined,false);
      if (!outcome.committed) throw Object.assign(new Error('LOCK_HELD'),{code:'LOCK_HELD'});
      return {leaseId:outcome.snapshot.val().leaseId,revision:outcome.snapshot.val().revision};
    }
    // Read current public lease. This read is NOT an authorization decision.
    const current=(await loc.once('value')).val();
    if (!current || current.uid!==actor.uid || !proofEqual(current.proofHash,digest) ||
        current.expiresAt<=now)
      throw Object.assign(new Error('PROOF_INVALID'),{code:'PROOF_INVALID'});
    // Test-only hook simulates grant/freeze/pointer changing AFTER pre-read,
    // immediately before the Rules-enforced transaction.
    if (options.afterProof) await options.afterProof();
    if (action==='save') {
      const target=db.ref(rowPath(backend));
      const opId=options.operationId??randomUUID();
      const nextNote=options.note??'Owner-committed note';
      const baseline=options.baseNote??'original';
      const at=Date.now();
      const out=await target.transaction(raw=>{
        if (!raw || raw.note!==baseline || raw.operationId===opId) return;
        const nextRev=raw.revision+1;
        return {...raw,note:nextNote,revision:nextRev,operationId:opId,updatedAt:at,
          updatedBy:actor.uid,editProofs:{...(raw.editProofs??{}),note:digest},
          history:{...(raw.history??{}),[String(nextRev%50)]:{
            operationId:opId,recordId:'r1',at,actor:actor.uid,
            changes:{note:nextNote},oldValues:{note:raw.note}}}};
      },undefined,false);
      if (!out.committed) throw Object.assign(new Error('CONFLICT'),{code:'CONFLICT'});
      return {revision:out.snapshot.val().revision,operationId:opId};
    }
    if (action==='renew'||action==='release') {
      const out=await loc.transaction(raw=>{
        if (!raw || raw.uid!==actor.uid || raw.leaseId!==current.leaseId ||
            !proofEqual(raw.proofHash,digest) || raw.expiresAt<=now) return;
        return {...raw,revision:raw.revision+1,
          expiresAt:action==='release'?0:now+30000};
      },undefined,false);
      if (!out.committed) throw Object.assign(new Error('LEASE_CONFLICT'),{code:'LEASE_CONFLICT'});
      return {revision:out.snapshot.val().revision};
    }
    throw new Error('Unknown action');
  });
}

const A=client('A'),B=client('B-same-uid'),C=client('C-other-uid');
let tokenA,tokenB,tokenC,ownerUid,otherUid;
const cases=[];
async function test(name,fn) {
  try {await fn();cases.push({name,status:'PASS'});console.log('PASS '+name);}
  catch (e) {cases.push({name,status:'FAIL',message:String(e?.message??e).slice(0,200)});
    console.error('FAIL '+name+': '+String(e?.message??e));}
}
async function seed(backend) {
  const row={recordId:'r1',note:'original',revision:1,operationId:'seed',updatedBy:'seed',
    editProofs:{note:'0'.repeat(64)}};
  const hdnd={editors:{[ownerUid]:true,[otherUid]:false},
    permissions:{columns:{note:true}},control:{editingLocked:false},
    freezeControl:{mode:'OPEN',changedAt:0,deadline:0},
    ...(backend==='legacy'?{items:{r1:row}}:{datasetV2:{
      active:{generationId:'gen_test_a',operationId:'seed',revision:1,rowCount:1,digest:'a'.repeat(64)},
      permissions:{gen_test_a:{columns:{note:true}}},
      generations:{gen_test_a:{items:{r1:row}}}}})};
  await ownerPut('hdnd',hdnd);
}
async function acquired(backend) {
  const secret=randomBytes(32);
  await gateway(tokenA,'acquire',backend,secret);
  return secret;
}
async function assertDeniedNoMutation(backend,attempt,match) {
  const before=await witness(backend);
  await expectCode(attempt,match);
  const after=await witness(backend);
  expectSame(before,after,backend);
}
async function rawSdkDenied(path,value) {
  await expectCode(()=>set(ref(B.db,path),value),/PERMISSION_DENIED|permission_denied/);
}

try {
  const a=await createUserWithEmailAndPassword(A.auth,'owner@demo.invalid','Test12345!');
  ownerUid=a.user.uid;
  const b=await signInWithEmailAndPassword(B.auth,'owner@demo.invalid','Test12345!');
  assert.equal(ownerUid,b.user.uid);
  const c=await createUserWithEmailAndPassword(C.auth,'other@demo.invalid','Test12345!');
  otherUid=c.user.uid;
  tokenA=await getIdToken(a.user);tokenB=await getIdToken(b.user);tokenC=await getIdToken(c.user);
  console.log('AUTH_EMULATOR: A/B share UID, C has distinct UID (redacted)');
  assert.equal((await verified(tokenA)).uid,(await verified(tokenB)).uid);
  assert.notEqual((await verified(tokenC)).uid,(await verified(tokenA)).uid);
  assert.notEqual((await getIdTokenResult(a.user)).claims.cellService,true);
  assert.notEqual((await getIdTokenResult(b.user)).claims.cellService,true);

  for (const backend of ['legacy','v2']) {
    await test(`${backend}: owner acquire -> renew -> SAVE -> RELEASE`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await gateway(tokenA,'renew',backend,s);
      const done=await gateway(tokenA,'save',backend,s,{note:'Owner-committed note'});
      assert.equal(done.revision,2);
      const afterSave=await witness(backend);
      assert.equal(afterSave.row.updatedBy,ownerUid);
      assert.equal(afterSave.row.history['2'].changes.note,'Owner-committed note');
      assert.equal(afterSave.row.editProofs.note,afterSave.lease.proofHash);
      assert.notEqual(afterSave.lease.proofHash,s.toString('hex'));
      await gateway(tokenA,'release',backend,s);
      assert.equal((await witness(backend)).lease.expiresAt,0);
    });
    await test(`${backend}: B same UID reads only public hash; replay SAVE/RENEW/RELEASE denied`,async()=>{
      await seed(backend);await acquired(backend);
      const visible=(await get(ref(B.db,leasePath(backend)))).val();
      assert.equal(typeof visible.proofHash,'string');
      assert.ok(!('secret' in visible) && !('token' in visible));
      const copied=Buffer.from(visible.proofHash,'hex');
      for (const action of ['save','renew','release']) {
        await assertDeniedNoMutation(backend,()=>gateway(tokenB,action,backend,copied),/PROOF_INVALID/);
      }
    });
    await test(`${backend}: raw B has genuine Auth token but cannot forge cellService`,async()=>{
      await seed(backend);const s=await acquired(backend);
      const before=await witness(backend);
      await rawSdkDenied(leasePath(backend),{...before.lease,revision:before.lease.revision+1,expiresAt:0});
      await rawSdkDenied(rowPath(backend),{...before.row,note:'forged',revision:2,
        editProofs:{note:before.lease.proofHash}});
      const jwt=await getIdToken(B.auth.currentUser);
      const resp=await fetch(`${API_URL}/${rowPath(backend)}.json?ns=${NAMESPACE}`,{
        method:'PATCH',headers:{Authorization:`Bearer ${jwt}`,
          'Content-Type':'application/json','X-CellService':'true'},
        body:JSON.stringify({note:'forged by header'})});
      assert.ok([401,403].includes(resp.status),`Forged REST request unexpectedly HTTP ${resp.status}`);
      expectSame(before,await witness(backend),'raw client');
    });
    await test(`${backend}: scoped wrong UID denied; never mixes callers`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await assertDeniedNoMutation(backend,()=>gateway(tokenC,'save',backend,s),/PROOF_INVALID/);
      // No backend service claim => even a *scoped* Admin app cannot write.
      await assertDeniedNoMutation(backend,()=>scoped(tokenA,false,async(db)=>{
        const current=(await db.ref(leasePath(backend)).once('value')).val();
        await db.ref(leasePath(backend)).update({expiresAt:0,revision:current.revision+1});
      }),/PERMISSION_DENIED|permission_denied/);
    });
    await test(`${backend}: editor grant revoked AFTER proof read, before SAVE commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await assertDeniedNoMutation(backend,()=>gateway(tokenA,'save',backend,s,{
        afterProof:()=>ownerPut(`hdnd/editors/${ownerUid}`,false)}),
      /PERMISSION_DENIED|permission_denied/);
    });
    await test(`${backend}: FROZEN AFTER proof read blocks SAVE commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await assertDeniedNoMutation(backend,()=>gateway(tokenA,'save',backend,s,{
        afterProof:()=>ownerPut('hdnd/freezeControl',{mode:'FROZEN',changedAt:Date.now(),deadline:0})}),
      /PERMISSION_DENIED|permission_denied/);
    });
    await test(`${backend}: FROZEN AFTER proof read blocks RENEW commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await assertDeniedNoMutation(backend,()=>gateway(tokenA,'renew',backend,s,{
        afterProof:()=>ownerPut('hdnd/freezeControl',{mode:'FROZEN',changedAt:Date.now(),deadline:0})}),
      /PERMISSION_DENIED|permission_denied/);
    });
    await test(`${backend}: generation pointer switched AFTER proof read blocks SAVE`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await assertDeniedNoMutation(backend,()=>gateway(tokenA,'save',backend,s,{
        afterProof:()=>ownerPut('hdnd/datasetV2/active',{
          generationId:'gen_test_b',revision:2,operationId:'swap',rowCount:1,digest:'b'.repeat(64)})}),
      /PERMISSION_DENIED|permission_denied/);
    });
    await test(`${backend}: FROZEN AFTER proof read blocks RELEASE commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await assertDeniedNoMutation(backend,()=>gateway(tokenA,'release',backend,s,{
        afterProof:()=>ownerPut('hdnd/freezeControl',{mode:'FROZEN',changedAt:Date.now(),deadline:0})}),
      /PERMISSION_DENIED|permission_denied/);
    });
    await test(`${backend}: concurrently scoped A/C never share Auth override`,async()=>{
      await seed(backend);
      const attempts=await Promise.allSettled([
        gateway(tokenA,'acquire',backend,randomBytes(32)),
        gateway(tokenC,'acquire',backend,randomBytes(32))
      ]);
      assert.equal(attempts[0].status,'fulfilled');
      assert.equal(attempts[1].status,'rejected');
      assert.match(String(attempts[1].reason),/PERMISSION_DENIED|permission_denied/);
      assert.equal((await witness(backend)).lease.uid,ownerUid);
    });
    await test(`${backend}: non-enrolled caller cannot ACQUIRE with service claim`,async()=>{
      await seed(backend);
      await assertDeniedNoMutation(backend,()=>gateway(tokenC,'acquire',backend,randomBytes(32)),
        /PERMISSION_DENIED|permission_denied/);
    });
  }
} finally {
  results.push(...cases);
  writeFileSync(JSON_PATH,JSON.stringify({sha:SHA,project:PROJECT,namespace:NAMESPACE,
    executedAt:new Date().toISOString(),runtime:process.version,
    summary:{pass:cases.filter(x=>x.status==='PASS').length,
      fail:cases.filter(x=>x.status==='FAIL').length},cases},null,2));
  await Promise.allSettled([deleteApp(A.app),deleteApp(B.app),deleteApp(C.app),adminDelete(authAdminApp)]);
}
console.log(`SUMMARY ${cases.filter(x=>x.status==='PASS').length} PASS, ${cases.filter(x=>x.status==='FAIL').length} FAIL; see witness.local.json`);
if (cases.some(x=>x.status==='FAIL')) process.exitCode=1;
