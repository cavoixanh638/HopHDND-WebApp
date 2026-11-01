/**
 * PR142 / CHAT 1: isolated scoped Admin RTDB auth-override mechanism PoC.
 * A demo project and local Auth+RTDB Emulators are REQUIRED. No production I/O.
 * Reduced Rules fixture only; not the application's candidate Rules.
 */
import assert from 'node:assert/strict';
import {createHash, randomBytes, randomUUID, timingSafeEqual} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {initializeApp as adminInitialize, deleteApp as adminDelete} from 'firebase-admin/app';
import {getAuth as getAdminAuth} from 'firebase-admin/auth';
import {getDatabase as getAdminDatabase} from 'firebase-admin/database';
import {initializeApp, deleteApp} from 'firebase/app';
import {getAuth, connectAuthEmulator, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, getIdToken, getIdTokenResult, signOut} from 'firebase/auth';
import {getDatabase, connectDatabaseEmulator, get, ref, set, goOffline} from 'firebase/database';

const PROJECT='demo-pr142-override';
const NAMESPACE=`${PROJECT}-default-rtdb`;
const SHA='98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847';
const DB_URL=`https://${NAMESPACE}.firebaseio.com`;
const REST='http://127.0.0.1:9000';
const AUTH_URL='http://127.0.0.1:9099';
const WITNESS=new URL('./witness.local.json', import.meta.url);
const TTL_MS=30_000;
const cases=[];
const transactions=[];
const checks=[];
const scopedApps=new Set();
let scopedCreated=0;
let scopedDeleted=0;
let A, B, C, verifyApp;
let tokenA, tokenB, tokenC, ownerUid, otherUid;

function guard() {
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000' ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')
    throw new Error('EMULATOR_ONLY: expected localhost ports 9000/9099 for BOTH Auth and RTDB');
  if (PROJECT!=='demo-pr142-override' || !DB_URL.includes('demo-'))
    throw new Error('EMULATOR_ONLY: a demo- project is required');
}
guard();

function failed(kind,details) {
  const error=new Error(`${kind}: ${details}`);
  error.code=kind;
  return error;
}
function errorText(e) {
  return String(e?.code??e?.message??e);
}
function isPermissionDenied(e) {
  return /permission[\s_-]*denied/i.test(`${e?.code??''} ${e?.message??''}`);
}
function hashProof(uid,backend,secret) {
  return createHash('sha256').update('PR142 cell proof v1\0').update(uid)
    .update('\0').update(backend).update('\0').update(secret).digest('hex');
}
function proofEqual(actual,expected) {
  return typeof actual==='string' && /^[a-f0-9]{64}$/.test(actual) &&
    timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));
}
function paths(backend,id='r1') {
  assert.ok(['legacy','v2'].includes(backend));
  assert.ok(['r1','r2'].includes(id));
  const root=backend==='legacy'?'hdnd':`hdnd/datasetV2`;
  return backend==='legacy'
    ? {row:`${root}/items/${id}`,lease:`${root}/editLocks/${id}/note`}
    : {row:`${root}/generations/gen_test_a/items/${id}`,lease:`${root}/leases/gen_test_a/${id}/note`};
}
const sha256=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');

// Emulator owner token is used ONLY for fixture setup/readback and timed admin
// policy changes. It is never supplied to the cell gateway or raw user controls.
async function owner(method,path,body) {
  const response=await fetch(`${REST}/${path}.json?ns=${NAMESPACE}`,{
    method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  if (!response.ok) throw failed('LOCAL_FIXTURE_ERROR',`${method} ${path} HTTP ${response.status}`);
  return response.json();
}
const ownerGet=path=>owner('GET',path);
const ownerPut=(path,data)=>owner('PUT',path,data);
async function witness(backend,id='r1') {
  const p=paths(backend,id);
  const [row,lease]=await Promise.all([ownerGet(p.row),ownerGet(p.lease)]);
  return {row,lease};
}
function fingerprints(snapshot) {
  return {row:sha256(snapshot.row),lease:sha256(snapshot.lease)};
}
function compareWitness(before,after,label,shouldChange=false) {
  const x=fingerprints(before),y=fingerprints(after);
  const unchanged=x.row===y.row&&x.lease===y.lease;
  checks.push({label,kind:shouldChange?'positive':'negative',before:x,after:y,
    unchanged,assertion:shouldChange?'must-mutate':'must-not-mutate'});
  if (shouldChange) assert.ok(!unchanged,`${label}: expected server mutation`);
  else assert.deepEqual(y,x,`${label}: server row/lease unexpectedly changed`);
}

function client(name) {
  const config={apiKey:'demo-pr142-api-key',authDomain:`${PROJECT}.firebaseapp.com`,
    projectId:PROJECT,databaseURL:DB_URL};
  const app=initializeApp(config,`client-${name}`);
  const auth=getAuth(app);
  connectAuthEmulator(auth,AUTH_URL,{disableWarnings:true});
  const db=getDatabase(app);
  connectDatabaseEmulator(db,'127.0.0.1',9000);
  return {app,auth,db};
}
async function verified(idToken) {
  const result=await getAdminAuth(verifyApp).verifyIdToken(idToken);
  assert.ok(result.uid,'ID token has no verified UID');
  assert.notEqual(result.cellService,true,'Client token must never carry cellService');
  return result;
}
async function scoped(idToken,serviceClaim,callback) {
  const identity=await verified(idToken);
  const name=`scoped-${++scopedCreated}-${randomUUID()}`;
  assert.ok(!scopedApps.has(name),'App name reused');
  scopedApps.add(name);
  // Per-request immutable override: ONLY the verified UID and server-set claim.
  // Never copy a UID or serviceClaim from request payload or a shared cached app.
  const app=adminInitialize({projectId:PROJECT,databaseURL:DB_URL,
    databaseAuthVariableOverride:{uid:identity.uid,token:{
      email:identity.email??null,
      email_verified:identity.email_verified===true,
      firebase:{sign_in_provider:identity.firebase?.sign_in_provider??'password'},
      cellService:serviceClaim
    }}},name);
  const db=getAdminDatabase(app);
  try {return await callback(db,identity);}
  finally {
    try {db.goOffline();} catch {}
    await adminDelete(app);
    scopedApps.delete(name);
    scopedDeleted++;
  }
}

// A persistent listener warms the EXACT RTDB node and stays attached until the
// transaction resolves. A one-time get()/once() may leave the transaction cache
// cold and cause a LOCAL abort (callback gets null despite server record).
async function holdWarmNode(location) {
  let resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  let settled=false;
  const listener=snapshot=>{
    if (!settled) {settled=true;resolveReady(snapshot.val());}
  };
  const onError=error=>{
    if (!settled) {settled=true;rejectReady(error);}
  };
  location.on('value',listener,onError);
  let timer;
  try {
    const initial=await Promise.race([ready,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(failed('WARM_TIMEOUT','RTDB listener did not receive server state')),10_000);
    })]);
    return {initial,release:()=>location.off('value',listener)};
  } catch(error) {
    location.off('value',listener);
    throw error;
  } finally {clearTimeout(timer);}
}

async function transactionWithEvidence(location,backend,action,callback) {
  const warm=await holdWarmNode(location);
  const event={backend,action,warmed:!Object.is(warm.initial,undefined),
    warmedNull:warm.initial===null,callbackCalls:0,coldNullCallbacks:0,
    candidateProduced:0,outcome:'UNKNOWN'};
  transactions.push(event);
  try {
    let result;
    try {
      result=await location.transaction(current=>{
        event.callbackCalls++;
        if (current===null) event.coldNullCallbacks++;
        const next=callback(current);
        if (next!==undefined) event.candidateProduced++;
        return next;
      },undefined,false);
    } catch(error) {
      if (isPermissionDenied(error)) {
        event.outcome=event.candidateProduced>0?'RULES_DENIED':'DENIED_WITHOUT_CANDIDATE';
        if (event.candidateProduced<1)
          throw failed('NO_RULES_EVIDENCE',`${backend}/${action}: denied before any candidate was produced`);
        throw failed('RULES_DENIED',`${backend}/${action}: server rejected candidate after ${event.callbackCalls} callback(s)`);
      }
      event.outcome='SDK_ERROR';
      throw error;
    }
    if (!result.committed) {
      event.outcome='LOCAL_ABORT';
      throw failed('LOCAL_ABORT',`${backend}/${action}: callback ${event.callbackCalls}x, `+
        `candidate ${event.candidateProduced}x, coldNull ${event.coldNullCallbacks}x`);
    }
    event.outcome='COMMITTED';
    return result.snapshot.val();
  } finally {warm.release();}
}

// Gateway mechanism: the verified real Auth Emulator ID token selects UID, and
// original 32-byte secret (not its RTDB-readable hash) is checked BEFORE writes.
// This is an in-process PoC for a future callable, not a network API deployment.
async function gateway(idToken,action,backend,secret,options={}) {
  if (!Buffer.isBuffer(secret) || secret.length!==32)
    throw failed('PROOF_INVALID','expected the original 32-byte private secret');
  const id=options.recordId??'r1';
  const p=paths(backend,id);
  return scoped(idToken,true,async(db,identity)=>{
    const leaseRef=db.ref(p.lease);
    const proofHash=hashProof(identity.uid,backend,secret);
    const now=Date.now();
    if (action==='acquire') {
      const leaseId=randomUUID();
      const result=await transactionWithEvidence(leaseRef,backend,`${id}/acquire`,raw=>{
        if (raw?.expiresAt>now) return undefined;
        return {uid:identity.uid,leaseId,proofHash,revision:(raw?.revision??0)+1,
          kind:'short',acquiredAt:now,expiresAt:now+TTL_MS};
      });
      return {leaseId:result.leaseId,revision:result.revision};
    }
    // Proof lookup uses RTDB-readable public state; no authorization is based
    // on that hash alone: the server must derive it from A's private bytes.
    const stored=(await leaseRef.once('value')).val();
    if (!stored || stored.uid!==identity.uid || !proofEqual(stored.proofHash,proofHash) ||
        stored.expiresAt<=now)
      throw failed('PROOF_INVALID',`${backend}/${action}: public hash is NOT a bearer credential`);
    if (options.afterProof) await options.afterProof();
    if (action==='save') {
      const opId=options.operationId??randomUUID();
      const note=options.note??'owner-note';
      const original=options.baseNote??'original';
      const at=Date.now();
      const row=await transactionWithEvidence(db.ref(p.row),backend,`${id}/save`,raw=>{
        if (!raw || raw.note!==original || raw.operationId===opId) return undefined;
        const revision=raw.revision+1;
        return {...raw,note,revision,operationId:opId,updatedAt:at,
          updatedBy:identity.uid,editProofs:{...raw.editProofs,note:proofHash},
          history:{...raw.history,[String(revision%50)]:{
            operationId:opId,recordId:id,at,actor:identity.uid,
            changes:{note},oldValues:{note:raw.note}}}};
      });
      return {rowRevision:row.revision,operationId:opId};
    }
    if (action==='renew' || action==='release') {
      const lease=await transactionWithEvidence(leaseRef,backend,`${id}/${action}`,raw=>{
        if (!raw || raw.uid!==identity.uid || raw.leaseId!==stored.leaseId ||
            !proofEqual(raw.proofHash,proofHash) || raw.expiresAt<=now) return undefined;
        return {...raw,revision:raw.revision+1,
          expiresAt:action==='release'?0:now+TTL_MS};
      });
      return {leaseRevision:lease.revision};
    }
    throw failed('UNKNOWN_ACTION',action);
  });
}

async function seed(backend) {
  const row=id=>({recordId:id,note:'original',revision:1,operationId:'seed',
    updatedBy:'seed',editProofs:{note:'0'.repeat(64)}});
  const items={r1:row('r1'),r2:row('r2')};
  await ownerPut('hdnd',{editors:{[ownerUid]:true,[otherUid]:false},
    permissions:{columns:{note:true}},control:{editingLocked:false},
    freezeControl:{mode:'OPEN',changedAt:0,deadline:0},
    ...(backend==='legacy'?{items}:{datasetV2:{
      active:{generationId:'gen_test_a',operationId:'seed',revision:1,rowCount:2,
        digest:'a'.repeat(64)},
      permissions:{gen_test_a:{columns:{note:true}}},
      generations:{gen_test_a:{items}}}})});
}
async function acquired(backend,options={}) {
  const secret=randomBytes(32);
  await gateway(tokenA,'acquire',backend,secret,options);
  return secret;
}
async function requireDenied(action,expected) {
  let thrown;
  try {await action();}catch(e){thrown=e;}
  if (!thrown) throw failed('UNEXPECTED_COMMIT',`Expected ${expected}, action returned success`);
  if (thrown.code!==expected)
    throw failed('WRONG_DENIAL',`Expected ${expected}, got ${errorText(thrown)}`);
  return thrown;
}
async function noMutation(backend,label,action,expected,{recordId='r1'}={}) {
  const before=await witness(backend,recordId);
  await requireDenied(action,expected);
  compareWitness(before,await witness(backend,recordId),label);
}
async function rawRulesDenied(action,label) {
  try {await action();throw failed('UNEXPECTED_COMMIT',`${label} succeeded`);}
  catch(e) {
    if (e.code==='UNEXPECTED_COMMIT') throw e;
    if (!isPermissionDenied(e)) throw failed('WRONG_DENIAL',`${label}: ${errorText(e)}`);
  }
}
async function test(name,fn) {
  const before=transactions.length;
  const checksBefore=checks.length;
  try {
    await fn();
    cases.push({name,status:'PASS',transactions:transactions.slice(before).map(t=>({...t})),
      checkedServerStates:checks.length-checksBefore});
    console.log('PASS '+name);
  } catch(error) {
    cases.push({name,status:'FAIL',error:errorText(error),
      transactions:transactions.slice(before).map(t=>({...t})),
      checkedServerStates:checks.length-checksBefore});
    console.error('FAIL '+name+' :: '+errorText(error));
  }
}
async function restWithIdToken(method,path,token,body,extra={}) {
  // Important: Firebase ID tokens go into ?auth=, NOT Authorization: Bearer
  // (the latter is the Google OAuth2 access-token transport).
  const query=new URLSearchParams({ns:NAMESPACE,auth:token});
  return fetch(`${REST}/${path}.json?${query}`,{
    method,headers:{'Content-Type':'application/json',...extra},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
}
async function rawRestTest(backend) {
  await seed(backend);
  const s=await acquired(backend);
  const p=paths(backend);
  const before=await witness(backend);
  await rawRulesDenied(()=>set(ref(B.db,p.lease),{...before.lease,
    revision:before.lease.revision+1,expiresAt:0}),'SDK raw lease');
  await rawRulesDenied(()=>set(ref(B.db,p.row),{...before.row,
    note:'raw SDK forged',revision:before.row.revision+1,
    editProofs:{note:before.lease.proofHash}}),'SDK raw row');
  // Positive identity control: authenticated REST read works, unauthenticated
  // read cannot. This proves the ID token transport is not being ignored.
  const anonymous=await fetch(`${REST}/${p.row}.json?ns=${NAMESPACE}`);
  assert.ok([401,403].includes(anonymous.status),
    `Unauthenticated REST read unexpectedly HTTP ${anonymous.status}`);
  const authenticated=await restWithIdToken('GET',p.row,tokenB);
  assert.equal(authenticated.status,200,'Firebase ID token ?auth= failed positive REST GET');
  assert.deepEqual(await authenticated.json(),before.row);
  const claimHeader={'X-CellService':'true'};
  for (const [path,payload] of [
    [p.row,{note:'raw REST forged'}],
    [p.lease,{expiresAt:0,revision:before.lease.revision+1}]
  ]) {
    const response=await restWithIdToken('PATCH',path,tokenB,payload,claimHeader);
    const responseText=await response.text();
    assert.ok([401,403].includes(response.status),
      `Forged REST ${path} unexpectedly HTTP ${response.status}: ${responseText.slice(0,140)}`);
  }
  compareWitness(before,await witness(backend),'raw SDK + authenticated REST must not mutate');
  assert.equal((await get(ref(B.db,p.lease))).val().proofHash,hashProof(ownerUid,backend,s));
}
async function main() {
  A=client('A'); B=client('B'); C=client('C');
  verifyApp=adminInitialize({projectId:PROJECT},'auth-verify');
  const a=await createUserWithEmailAndPassword(A.auth,'owner@demo.invalid','Test12345!');
  ownerUid=a.user.uid;
  const b=await signInWithEmailAndPassword(B.auth,'owner@demo.invalid','Test12345!');
  assert.equal(b.user.uid,ownerUid,'A and B MUST be distinct clients with the same UID');
  const c=await createUserWithEmailAndPassword(C.auth,'other@demo.invalid','Test12345!');
  otherUid=c.user.uid;
  assert.notEqual(otherUid,ownerUid,'C must have another UID');
  [tokenA,tokenB,tokenC]=await Promise.all([getIdToken(a.user),getIdToken(b.user),getIdToken(c.user)]);
  assert.equal((await verified(tokenA)).uid,(await verified(tokenB)).uid);
  assert.notEqual((await verified(tokenA)).uid,(await verified(tokenC)).uid);
  for (const user of [a.user,b.user,c.user])
    assert.notEqual((await getIdTokenResult(user)).claims.cellService,true);
  console.log('AUTH CONTROL: A/B real Emulator tokens have same UID; C different; all lack cellService');

  for (const backend of ['legacy','v2']) {
    await test(`${backend} OWNER acquire/renew/save/release`,async()=>{
      await seed(backend);
      const first=await witness(backend);
      const s=await acquired(backend);
      await gateway(tokenA,'renew',backend,s);
      const result=await gateway(tokenA,'save',backend,s,{note:'owner-note'});
      assert.equal(result.rowRevision,2);
      const afterSave=await witness(backend);
      assert.equal(afterSave.row.updatedBy,ownerUid);
      assert.equal(afterSave.row.history['2'].actor,ownerUid);
      assert.equal(afterSave.row.history['2'].oldValues.note,'original');
      assert.equal(afterSave.row.history['2'].changes.note,'owner-note');
      assert.equal(afterSave.row.editProofs.note,afterSave.lease.proofHash);
      assert.notEqual(afterSave.lease.proofHash,s.toString('hex'));
      compareWitness(first,afterSave,'owner row commit',true);
      await gateway(tokenA,'release',backend,s);
      assert.equal((await witness(backend)).lease.expiresAt,0);
    });

    await test(`${backend} SAME_UID B copied public lease/row hash cannot SAVE/RENEW/RELEASE`,async()=>{
      await seed(backend);
      const s=await acquired(backend);
      await gateway(tokenA,'save',backend,s,{note:'owner-prior-save'});
      const publicLease=(await get(ref(B.db,paths(backend).lease))).val();
      const publicRow=(await get(ref(B.db,paths(backend).row))).val();
      assert.equal(publicLease.proofHash,publicRow.editProofs.note);
      assert.ok(!('token' in publicLease) && !('secret' in publicLease));
      for(const hash of [publicLease.proofHash,publicRow.editProofs.note]) {
        const copied=Buffer.from(hash,'hex');
        for(const action of ['save','renew','release'])
          await noMutation(backend,`same UID public-${action}`,()=>gateway(tokenB,action,backend,copied),
            'PROOF_INVALID');
      }
    });

    await test(`${backend} RAW SDK and REST cannot forge service claim`,()=>rawRestTest(backend));

    await test(`${backend} WRONG_UID proof rejected; scoped claim=false denied by Rules`,async()=>{
      await seed(backend);
      const s=await acquired(backend);
      await noMutation(backend,'different UID with A private secret',
        ()=>gateway(tokenC,'save',backend,s),'PROOF_INVALID');
      await noMutation(backend,'limited Admin claim=false',
        ()=>scoped(tokenA,false,async(db)=>{
          const p=paths(backend);
          const lease=(await db.ref(p.lease).once('value')).val();
          try {
            await db.ref(p.lease).update({expiresAt:0,revision:lease.revision+1});
          } catch(error) {
            if (isPermissionDenied(error))
              throw failed('RULES_DENIED_DIRECT','unprivileged Admin override denied by Rules');
            throw error;
          }
        }),'RULES_DENIED_DIRECT');
    });

    await test(`${backend} REVOKE after valid proof, candidate reaches Rules and denied`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await noMutation(backend,'revocation commit gate',
        ()=>gateway(tokenA,'save',backend,s,{
          afterProof:()=>ownerPut(`hdnd/editors/${ownerUid}`,false)}),'RULES_DENIED');
    });

    await test(`${backend} FROZEN after valid proof denies SAVE at Rules commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await noMutation(backend,'freeze save gate',
        ()=>gateway(tokenA,'save',backend,s,{
          afterProof:()=>ownerPut('hdnd/freezeControl',{
            mode:'FROZEN',changedAt:Date.now(),deadline:0})}),'RULES_DENIED');
    });

    await test(`${backend} FROZEN after valid proof denies RENEW at Rules commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await noMutation(backend,'freeze renew gate',
        ()=>gateway(tokenA,'renew',backend,s,{
          afterProof:()=>ownerPut('hdnd/freezeControl',{
            mode:'FROZEN',changedAt:Date.now(),deadline:0})}),'RULES_DENIED');
    });

    await test(`${backend} GENERATION switch after proof denies SAVE at Rules commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await noMutation(backend,'generation gate',()=>gateway(tokenA,'save',backend,s,{
        afterProof:()=>ownerPut('hdnd/datasetV2/active',{
          generationId:'gen_test_b',revision:2,operationId:'swap',rowCount:2,
          digest:'b'.repeat(64)})}),'RULES_DENIED');
    });

    await test(`${backend} FROZEN after valid proof denies RELEASE at Rules commit`,async()=>{
      await seed(backend);const s=await acquired(backend);
      await noMutation(backend,'freeze release gate',
        ()=>gateway(tokenA,'release',backend,s,{
          afterProof:()=>ownerPut('hdnd/freezeControl',{
            mode:'FROZEN',changedAt:Date.now(),deadline:0})}),'RULES_DENIED');
    });

    await test(`${backend} CONCURRENT A r1 / C r2 never cross UID override`,async()=>{
      await seed(backend);
      const attempts=await Promise.allSettled([
        gateway(tokenA,'acquire',backend,randomBytes(32),{recordId:'r1'}),
        gateway(tokenC,'acquire',backend,randomBytes(32),{recordId:'r2'})
      ]);
      assert.equal(attempts[0].status,'fulfilled','A must acquire r1');
      assert.equal(attempts[1].status,'rejected','C must NOT acquire other field');
      assert.equal(attempts[1].reason.code,'RULES_DENIED',
        `C must be Rules-denied on uncontended r2, got ${errorText(attempts[1].reason)}`);
      assert.equal((await witness(backend,'r1')).lease.uid,ownerUid);
      assert.equal((await witness(backend,'r2')).lease,null,
        'C attempted different, empty r2; should never be LOCK_HELD');
      checks.push({label:`${backend} concurrent r1/r2`,uidIsolated:true,
        CserverLeaseEmpty:true});
    });

    await test(`${backend} UNENROLLED C alone denied even when cell not locked`,async()=>{
      await seed(backend);
      await noMutation(backend,'unenrolled caller',
        ()=>gateway(tokenC,'acquire',backend,randomBytes(32),{recordId:'r2'}),
        'RULES_DENIED',{recordId:'r2'});
    });
  }
}

async function teardown() {
  for(const x of [A,B,C].filter(Boolean)) {
    try {goOffline(x.db);}catch{}
  }
  await Promise.allSettled([A,B,C].filter(Boolean).map(async x=>{
    try {await signOut(x.auth);}catch{}
    await deleteApp(x.app);
  }));
  if (verifyApp) await adminDelete(verifyApp);
}

let topError=null;
try {await main();}
catch(e) {topError=errorText(e);console.error('FATAL setup/runtime :: '+topError);}
finally {
  try {
    let timer;
    await Promise.race([teardown(),new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(failed('TEARDOWN_TIMEOUT','SDK connections remain open')),8000);
    })]).finally(()=>clearTimeout(timer));
  } catch(e) {topError=topError??`TEARDOWN ${errorText(e)}`;}
  writeFileSync(WITNESS,JSON.stringify({reviewedSourceSha:SHA,project:PROJECT,
    executedAt:new Date().toISOString(),node:process.version,
    status:topError?'FAIL':cases.some(c=>c.status==='FAIL')?'FAIL':'PASS',
    counts:{pass:cases.filter(c=>c.status==='PASS').length,
      fail:cases.filter(c=>c.status==='FAIL').length},
    topError,scopedApps:{created:scopedCreated,deleted:scopedDeleted,open:scopedApps.size},
    cases,checks,transactions},null,2));
}
console.log(`SUMMARY ${cases.filter(c=>c.status==='PASS').length} PASS / `+
  `${cases.filter(c=>c.status==='FAIL').length} FAIL, scoped apps created/deleted `+
  `${scopedCreated}/${scopedDeleted}; witness.local.json`);
// Admin and client SDK websocket timers may otherwise keep Node alive after a
// finished test. Emulators:exec waits for this process to terminate; all
// witness data is flushed synchronously BEFORE process.exit.
process.exit(topError||cases.some(c=>c.status==='FAIL')||scopedApps.size?1:0);
