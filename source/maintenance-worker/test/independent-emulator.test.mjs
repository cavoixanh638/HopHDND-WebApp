import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtempSync,readFileSync,writeFileSync,unlinkSync,rmdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {setTimeout as delay} from 'node:timers/promises';
import {after,before,test} from 'node:test';
import {createHash} from 'node:crypto';
import {handleRequest} from '../src/index.mjs';
import {firebaseRest} from '../src/firebase-rest.mjs';
import {manifestForRows,sha256,stableJson} from '../src/domain.mjs';
import {assertFirebaseSessionCurrent} from '../src/security.mjs';

const project='demo-hdnd-worker-independent';
const authHost='127.0.0.1:19099',dbHost='127.0.0.1:19000';
const source=fileURLToPath(new URL('../../',import.meta.url));
const rules=join(source,'firebase','database.spark.rules.json');
const spec='maintenance-worker/test/independent-emulator.test.mjs';
const origin='https://cavoixanh638.github.io';
const databaseURL='https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app';
const adminEmail=JSON.parse(readFileSync(rules,'utf8')).rules.hdnd.datasetV2['.read']
  .match(/auth\.token\.email === '([^']+)'/)?.[1];
assert.ok(adminEmail,'Candidate Rules must expose a Google admin predicate');
const apiOrigin='https://independent-qa.invalid-account.workers.dev';
const fakeOAuth='synthetic-emulator-transport-credential';
const fields=['displayCode','stt','content','department','type','partyLevel','progressParty',
  'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note'];
const OP=id=>'maint_independent_'+id.padEnd(20,'0');
const initialOp='independent_seed_generation';
const trace=[];
const issuedTokens=new Map();
let bucket,objects,app,auth,google,guest,env,transportHook,vite,parser,xlsx,browserClient,backupFormat;

async function runEmulators(){
  const dir=mkdtempSync(join(tmpdir(),'hophdnd-worker-emulator-'));
  const config=join(dir,'firebase.json'),copy=join(dir,'rules.json');
  writeFileSync(copy,readFileSync(rules));
  writeFileSync(config,JSON.stringify({database:{rules:'rules.json'},emulators:{
    auth:{host:'127.0.0.1',port:19099},database:{host:'127.0.0.1',port:19000},
    hub:{host:'127.0.0.1',port:19400},logging:{host:'127.0.0.1',port:19500},
    ui:{enabled:false},singleProjectMode:true}}));
  const qaEnv={...process.env,GCLOUD_PROJECT:project,FIREBASE_AUTH_EMULATOR_HOST:authHost,
    FIREBASE_DATABASE_EMULATOR_HOST:dbHost,XDG_CONFIG_HOME:dir,FIREBASE_CLI_DISABLE_UPDATE_CHECK:'true',
    HDND_INDEPENDENT_WORKER_QA:'true'};
  const cli=join(source,'node_modules','firebase-tools','lib','bin','firebase.js');
  const nodeDir=join(process.execPath,'..');
  qaEnv.PATH=nodeDir+(process.platform==='win32'?';':':')+process.env.PATH;
  try{
    const child=spawn(process.execPath,[cli,'emulators:exec','--project',project,'--config',config,
      '--only','auth,database','node --test '+spec],{cwd:source,env:qaEnv,stdio:'inherit'});
    process.exitCode=await new Promise((resolve,reject)=>{
      child.once('error',reject);child.once('exit',code=>resolve(code??1));
    });
  }finally{
    unlinkSync(config);unlinkSync(copy);
    // Some CLI versions put local configuration under XDG_CONFIG_HOME.
    try{rmdirSync(dir);}catch(error){if(error.code!=='ENOTEMPTY')throw error;}
  }
}

if(process.argv.includes('--run-emulators')){
  await runEmulators();
}else if(process.env.HDND_INDEPENDENT_WORKER_QA==='true'){
  assert.equal(process.env.GCLOUD_PROJECT,project,'Use the dedicated demo project');
  assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,authHost);
  assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,dbHost);
  registerTests();
}else{
  test('Independent Auth/RTDB acceptance', {skip:'Run this file with --run-emulators'},()=>{});
}

function dbUrl(path=''){
  assert.match(path,/^(?:[\w-]+(?:\/[\w-]+)*)?$/);
  return new URL('http://'+dbHost+'/'+path+'.json?ns='+project);
}
async function adminDb(path='',options={}){
  const response=await fetch(dbUrl(path),{...options,
    headers:{...options.headers,Authorization:'Bearer owner'}});
  assert.equal(response.headers.get('x-firebase-project-id'),project);
  return response;
}
async function read(path=''){
  const response=await adminDb(path);
  assert.equal(response.status,200);
  return response.json();
}
async function write(path,value){
  const response=await adminDb(path,{method:'PUT',body:JSON.stringify(value)});
  assert.equal(response.status,200);
}
async function clientDb(path,token,method='GET',value){
  const url=dbUrl(path);
  url.searchParams.set('auth',token);
  return fetch(url,{method,...(value!==undefined?{body:JSON.stringify(value),
    headers:{'Content-Type':'application/json'}}:{})});
}
async function authApi(endpoint,body){
  const response=await fetch('http://'+authHost+'/identitytoolkit.googleapis.com/v1/'+endpoint+'?key=demo-key',
    {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  assert.equal(response.status,200,'Auth Emulator '+endpoint);
  const result=await response.json();
  if(result.idToken)issuedTokens.set(result.idToken,await auth.verifyIdToken(result.idToken));
  return result;
}
async function googleLogin(sub,email=adminEmail){
  return authApi('accounts:signInWithIdp',{
    requestUri:'http://127.0.0.1',returnSecureToken:true,
    postBody:new URLSearchParams({providerId:'google.com',
      id_token:JSON.stringify({sub,email,email_verified:true})}).toString(),
  });
}
function rows(count,tag='qa'){
  return Array.from({length:count},(_,i)=>({recordId:tag+'_'+(i+1),displayCode:tag.toUpperCase()+'-'+(i+1),
    stt:i+1,documentKind:'NQ',content:'Nội dung giả '+(i+1),department:'Phòng giả A',
    type:'QPPL',partyLevel:'BCH',progressParty:'Sở chưa trình',progressBuild:'VP đang xử lý',
    progressCouncil:'Sở chưa trình',specialist:'CV giả',room:'Phòng giả',vpLeader:'VP giả',
    ubndLeader:'UBND giả',specificProgress:'Dòng tiến độ giả '+i,note:'Ghi chú giả',
    revision:1,isDropped:false,archivedAt:null}));
}
function projectRows(values){
  return [...values].sort((a,b)=>a.stt-b.stt).map(r=>fields.map(k=>r[k]));
}
function excelRows(count){
  const originals=rows(count);
  const sheet=xlsx.utils.aoa_to_sheet([[...parser.BUSINESS_HEADERS],...projectRows(originals)]);
  const book=xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(book,sheet,'Dữ liệu giả');
  const bytes=new Uint8Array(xlsx.write(book,{type:'array',bookType:'xlsx'}));
  const parsed=parser.parseBusinessExcel(bytes,'Dữ liệu giả');
  assert.equal(parsed.count,count);
  assert.deepEqual(projectRows(parsed.items),projectRows(originals));
  return parsed.items;
}
async function seed(count=2){
  trace.length=0;transportHook=undefined;objects=new Map();
  bucket={get:async key=>objects.has(key)?{text:async()=>objects.get(key)}:null,
    put:async(key,value)=>{assert.equal(objects.has(key),false);objects.set(key,value);}};
  env.MAINTENANCE_ARCHIVE_BUCKET=bucket;
  const base=rows(count,'baseline'),manifest=await manifestForRows(base,OP(initialOp));
  const active={generationId:manifest.generationId,operationId:manifest.operationId,
    digest:manifest.digest,rowCount:count,revision:1};
  const items=Object.fromEntries(base.map(r=>[r.recordId,{...r,
    operationId:manifest.operationId,updatedBy:'emulator-seed',updatedAt:1,
    history:{entry:{kind:'synthetic-history'}}}]));
  const tree={items:{legacy:{type:'old-fixture'}},settings:{keep:'root-sibling'},
    hdndReviews:{qa:{keep:'review-sibling'}},unknownSibling:{keep:true},
    hdnd:{unknownFixture:{keep:'inside-hdnd'},permissions:{columns:{note:true}},
      editors:{qaEditor:true},profile:{revision:1,payload:'{}'},
      datasetV2:{active,generations:{[active.generationId]:{items}},
        permissions:{[active.generationId]:{columns:{note:true}}},
        operations:{baseline_audit:{status:'COMMITTED',count}}},
      freezeControl:{mode:'FROZEN',revision:1,epoch:1,actor:'emulator-seed',
        changedAt:1,closedAt:1,closeKind:'forced',datasetV2:active}}};
  await write('',tree);
  return active;
}
function deps(){
  return {
    verifyAdmin:async(token,policy)=>{
      // Auth Emulator tokens have no production RSA signature. Only tokens
      // minted and verified by the isolated Auth Emulator enter this map.
      const identity=issuedTokens.get(token);
      if(!identity||identity.uid!==policy.ADMIN_UID||identity.email!==policy.ADMIN_EMAIL||
        identity.email_verified!==true||identity.firebase.sign_in_provider!=='google.com')
        throw Error('VERIFIED_GOOGLE_ADMIN_REQUIRED');
      return {uid:identity.uid,authTime:identity.auth_time};
    },
    getToken:async()=>fakeOAuth,
    checkSession:(identity,policy,token)=>assertFirebaseSessionCurrent(identity,policy,token,{
      fetchImpl:async(url,request)=>{
        assert.equal(url,'https://identitytoolkit.googleapis.com/v1/accounts:lookup');
        const input=JSON.parse(request.body);
        assert.deepEqual(input.localId,[identity.uid]);
        const emulator=new URL('http://'+authHost+'/identitytoolkit.googleapis.com/v1/projects/'+project+'/accounts:lookup');
        return fetch(emulator,{...request,body:JSON.stringify({localId:input.localId}),
          headers:{...request.headers,Authorization:'Bearer owner'}});
      },
    }),
    makeDb:opts=>firebaseRest({...opts,fetchImpl:async(url,init)=>{
      const actual=new URL(url);
      assert.equal(actual.origin,databaseURL);
      const path=actual.pathname.slice(1,-5);
      assert.match(path,/^hdnd(?:\/|$)|^hdndReviews$/);
      assert.ok(['GET','PUT'].includes(init.method));
      if(init.method==='PUT'){assert.equal(path,'hdnd');assert.ok(init.headers['if-match']);}
      const exec=()=>adminDb(path,init);
      const response=transportHook?await transportHook(path,init,exec):await exec();
      trace.push({path,method:init.method,status:response.status});
      return response;
    }}),
  };
}
async function call(path,{method='GET',body,token=google.idToken,caller=origin,overrides}={}){
  const response=await handleRequest(new Request('https://qa.invalid'+path,{method,
    headers:{...(caller===null?{}:{Origin:caller}),...(token?{Authorization:'Bearer '+token}:{}),
      ...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),
    {...env,...overrides},deps());
  const result={http:response.status,headers:response.headers,
    data:response.status===204?null:await response.json()};
  return result;
}
async function prepare(action,id,expected,extra={}){
  const response=await call('/v1/prepare',{method:'POST',body:{action,operationId:OP(id),expected,...extra}});
  assert.equal(response.http,200,JSON.stringify(response.data));
  return response.data;
}
function commit(draft){
  return call('/v1/commit',{method:'POST',body:{operationId:draft.operationId,confirmation:draft.confirmation}});
}
function status(draft){return call('/v1/status?operationId='+draft.operationId);}
async function committed(draft){
  const result=await commit(draft);
  assert.equal(result.http,200,JSON.stringify(result.data));
  assert.equal(result.data.status,'committed');
  return read('hdnd/datasetV2/active');
}
async function withBrowserClient(action){
  const original=globalThis.fetch;
  const user={uid:google.localId,email:adminEmail,emailVerified:true,isAnonymous:false,
    providerData:[{providerId:'google.com'}],getIdToken:async()=>google.idToken};
  globalThis.fetch=(url,init)=>{
    const target=new URL(url);
    if(target.origin===apiOrigin){
      assert.equal(init.credentials,'omit');
      assert.equal(init.cache,'no-store');
      return handleRequest(new Request(target,{...init,
        headers:{...init.headers,Origin:origin}}),env,deps());
    }
    assert.equal(target.hostname,'127.0.0.1','No external request from the contract harness');
    return original(url,init);
  };
  try{return await action(user);}finally{globalThis.fetch=original;}
}

function registerTests(){
  before(async()=>{
    const require=createRequire(join(source,'parent-commit-service','package.json'));
    const {initializeApp}=require('firebase-admin/app');
    const {getAuth}=require('firebase-admin/auth');
    const appRequire=createRequire(join(source,'package.json'));
    xlsx=appRequire('xlsx');
    const {createServer}=await import(pathToFileURL(appRequire.resolve('vite')).href);
    process.env.VITE_MAINTENANCE_API_URL=apiOrigin;
    vite=await createServer({root:source,configFile:false,appType:'custom',
      server:{middlewareMode:true,watch:null}});
    parser=await vite.ssrLoadModule('/src/data/business-excel.ts');
    browserClient=await vite.ssrLoadModule('/src/data/online-maintenance-client.ts');
    backupFormat=await vite.ssrLoadModule('/src/data/admin-backup-format.ts');
    assert.equal(browserClient.maintenanceApiUrl(),apiOrigin);
    const head=await adminDb();
    assert.equal(head.status,200);
    assert.equal(await head.json(),null,'Requires a fresh disposable Emulator');
    const rulesUrl='http://'+dbHost+'/.settings/rules.json?ns='+project;
    const exact=readFileSync(rules);
    const installed=await fetch(rulesUrl,{method:'PUT',body:exact,
      headers:{Authorization:'Bearer owner','Content-Type':'application/json'}});
    assert.equal(installed.status,200,'Exact rules must install into disposable namespace');
    const published=await fetch(rulesUrl,{headers:{Authorization:'Bearer owner'}});
    assert.equal(published.status,200);
    assert.equal(await sha256(stableJson(await published.json())),
      await sha256(stableJson(JSON.parse(exact.toString('utf8')))),'Exact loaded Rules');
    console.log('QA_EXACT_RULES_SHA256',createHash('sha256').update(exact).digest('hex'));
    app=initializeApp({projectId:project},'worker-independent');
    auth=getAuth(app);
    google=await googleLogin('synthetic-google-admin');
    guest=await googleLogin('synthetic-google-guest','qa-guest@example.invalid');
    env={WEB_ORIGIN:origin,FIREBASE_PROJECT_ID:'hophdnd-8b7b2',FIREBASE_DATABASE_URL:databaseURL,
      ADMIN_UID:google.localId,ADMIN_EMAIL:adminEmail,BACKUP_HMAC_SECRET:'synthetic-qa-key-not-a-production-secret-000000',
      ENABLE_READS:'true',ENABLE_MUTATIONS:'true',MAINTENANCE_RATE_LIMIT:{limit:async()=>({success:true})}};
  });
  after(async()=>{
    await vite?.close();
    if(app)await createRequire(join(source,'parent-commit-service','package.json'))('firebase-admin/app').deleteApp(app);
  });

  test('real RTDB: 59 rows × A–O, signed store readback, clear, restore, preservation and duplicate retry',async()=>{
    const base=await seed(),original=await read();
    const input=excelRows(59);
    const start=performance.now(),cpu=process.cpuUsage();
    const draft=await withBrowserClient(user=>browserClient.prepareOnlineMaintenance(user,{
      action:'replace',operationId:OP('replace59'),expected:base,rows:input,sourceName:'synthetic.xlsx'}));
    assert.deepEqual(await read('hdnd/datasetV2/active'),base);
    assert.equal(objects.size,1);
    const reference=await read('hdnd/maintenanceOps/'+draft.operationId+'/offsiteBackup');
    assert.equal(await sha256(objects.get(reference.key)),reference.digest);
    const result=await withBrowserClient(user=>browserClient.commitOnlineMaintenance(user,draft.operationId,draft.confirmation));
    assert.equal(result.status,'committed');
    const active=await read('hdnd/datasetV2/active');
    const cost=process.cpuUsage(cpu);
    console.log('QA_LOCAL_NODE_ONLY',JSON.stringify({rows:59,prepareCommitWallMs:Math.round(performance.now()-start),
      processCpuMs:Math.round((cost.user+cost.system)/1000),cloudflareCpuVerified:false}));
    assert.equal((await withBrowserClient(user=>browserClient.statusOnlineMaintenance(user,draft.operationId))).status,
      'committed-active');
    const view=await clientDb('hdnd/datasetV2/generations/'+active.generationId+'/items',google.idToken);
    assert.equal(view.status,200);
    assert.deepEqual(projectRows(Object.values(await view.json())),projectRows(input));
    assert.equal((await commit(draft)).data.status,'already-committed');
    const archiveResponse=await call('/v1/archive');
    assert.equal(archiveResponse.http,200);
    const archive=archiveResponse.data;
    assert.equal(archive.serverSeal.algorithm,'HMAC-SHA256');
    const scope={projectId:env.FIREBASE_PROJECT_ID,databaseURL};
    assert.equal((await backupFormat.inspectBackupJson(JSON.stringify(archive),scope)).activeRows,59);
    const clear=await prepare('clear','clear59',active);
    const empty=await committed(clear);
    const emptyPointer=await clientDb('hdnd/datasetV2/active',google.idToken);
    assert.equal(emptyPointer.status,200);
    assert.equal((await emptyPointer.json()).rowCount,0);
    const gen=await read('hdnd/datasetV2/generations/'+empty.generationId);
    assert.deepEqual(gen,{emptyGeneration:true});
    const emptyArchive=(await call('/v1/archive')).data;
    assert.equal((await backupFormat.inspectBackupJson(JSON.stringify(emptyArchive),scope)).mode,'empty');
    assert.equal((await status(clear)).data.status,'committed-active');
    const restore=await prepare('restore','restore59',empty,{archive});
    const restored=await committed(restore);
    const end=await read();
    assert.deepEqual(projectRows(Object.values(end.hdnd.datasetV2.generations[restored.generationId].items)),
      projectRows(input));
    for(const key of ['items','settings','unknownSibling','hdndReviews'])assert.deepEqual(end[key],original[key]);
    for(const key of ['permissions','editors','profile','unknownFixture'])assert.deepEqual(end.hdnd[key],original.hdnd[key]);
    assert.deepEqual(end.hdnd.datasetV2.generations[base.generationId],original.hdnd.datasetV2.generations[base.generationId]);
    assert.deepEqual(end.hdnd.datasetV2.permissions[base.generationId],original.hdnd.datasetV2.permissions[base.generationId]);
    assert.deepEqual(end.hdnd.datasetV2.operations.baseline_audit,original.hdnd.datasetV2.operations.baseline_audit);
    assert.equal(end.hdnd.freezeControl.mode,'FROZEN');
    assert.equal(end.hdnd.freezeControl.datasetV2.generationId,restored.generationId);
  });

  test('real RTDB: 1,000 synthetic rows, 1,001 rejected, exact 15,000-field readback',async()=>{
    const base=await seed();
    const oversized=await call('/v1/prepare',{method:'POST',body:{action:'replace',
      operationId:OP('large'),expected:base,sourceName:'synthetic.xlsx',rows:rows(1001)}});
    assert.equal(oversized.data.error,'INVALID_ROW_COUNT');
    assert.equal(trace.filter(x=>x.method==='PUT').length,0);
    const input=excelRows(1000);
    const start=performance.now(),cpu=process.cpuUsage();
    const draft=await prepare('replace','limit1000',base,{rows:input,sourceName:'synthetic.xlsx'});
    const active=await committed(draft);
    const cost=process.cpuUsage(cpu);
    assert.equal(active.rowCount,1000);
    assert.deepEqual(projectRows(Object.values(await read('hdnd/datasetV2/generations/'+active.generationId+'/items'))),
      projectRows(input));
    console.log('QA_LOCAL_NODE_ONLY',JSON.stringify({rows:1000,prepareCommitWallMs:Math.round(performance.now()-start),
      processCpuMs:Math.round((cost.user+cost.system)/1000),cloudflareCpuVerified:false}));
  });

  test('real Auth: cross-origin, missing bearer, wrong UID/provider, disabled and revoked sessions',async()=>{
    await seed();
    const target='/v1/status?operationId='+OP('none');
    assert.equal((await call(target,{caller:'https://other.invalid'})).data.error,'ORIGIN_NOT_ALLOWED');
    assert.equal((await call(target,{caller:null})).http,403);
    assert.equal((await call(target,{token:null})).http,401);
    assert.equal((await call(target,{token:guest.idToken})).data.error,'VERIFIED_GOOGLE_ADMIN_REQUIRED');
    const password=await authApi('accounts:signUp',{email:'qa-password@example.invalid',
      password:'synthetic-test-password',returnSecureToken:true});
    assert.equal((await call(target,{token:password.idToken,
      overrides:{ADMIN_UID:password.localId,ADMIN_EMAIL:password.email}})).data.error,'VERIFIED_GOOGLE_ADMIN_REQUIRED');
    await auth.updateUser(google.localId,{disabled:true});
    try{assert.equal((await call(target)).data.error,'ADMIN_USER_DISABLED_OR_CHANGED');}
    finally{await auth.updateUser(google.localId,{disabled:false});}
    await delay(1100);
    await auth.revokeRefreshTokens(google.localId);
    assert.equal((await call(target)).data.error,'ADMIN_SESSION_REVOKED');
    assert.equal(trace.length,0,'Rejected auth never reaches RTDB');
    google=await googleLogin('synthetic-google-admin');
  });

  test('real RTDB: lock/freeze and stale pointer deny writes; missing/corrupt independent backup denies commit',async()=>{
    const base=await seed();
    const prepareClear=expected=>call('/v1/prepare',{method:'POST',
      body:{action:'clear',operationId:OP('deny'),expected}});
    assert.equal((await prepareClear({...base,revision:2})).data.error,'STALE_EXPECTED_POINTER');
    await write('hdnd/datasetV2/leases/'+base.generationId+'/baseline_1/note',{expiresAt:Date.now()+30000});
    assert.equal((await prepareClear(base)).data.error,'ACTIVE_EDIT_LEASE');
    await write('hdnd/datasetV2/leases',null);
    const freeze=await read('hdnd/freezeControl');
    await write('hdnd/freezeControl',{...freeze,mode:'OPEN'});
    assert.equal((await prepareClear(base)).data.error,'FREEZE_OR_POINTER_STALE');
    await write('hdnd/freezeControl',freeze);
    assert.equal((await call('/v1/prepare',{method:'POST',overrides:{MAINTENANCE_ARCHIVE_BUCKET:undefined},
      body:{action:'clear',operationId:OP('nostore'),expected:base}})).http,503);
    assert.equal(trace.filter(x=>x.method==='PUT').length,0);
    const draft=await prepare('clear','backupTamper',base);
    const [key]=objects.keys();
    const original=objects.get(key);
    objects.delete(key);
    assert.equal((await commit(draft)).data.error,'OFFSITE_BACKUP_MISSING');
    objects.set(key,original+' ');
    assert.equal((await commit(draft)).data.error,'OFFSITE_BACKUP_CORRUPTED');
    assert.deepEqual(await read('hdnd/datasetV2/active'),base);
    const forged=(await call('/v1/archive')).data;
    forged.payload.nodes['hdnd/profile'].revision++;
    forged.sha256=await sha256(stableJson(forged.payload));
    const rejected=await call('/v1/prepare',{method:'POST',body:{action:'restore',
      operationId:OP('forged'),expected:base,archive:forged}});
    assert.equal(rejected.data.error,'BACKUP_AUTHENTICITY_FAILED');
  });

  test('real RTDB: concurrent commit yields a server 412; ambiguous ACK resolves by original operation ID',async()=>{
    const base=await seed();
    const first=await prepare('clear','raceA',base),second=await prepare('clear','raceB',base);
    let waiting=0,release;
    const barrier=new Promise(resolve=>{release=resolve;});
    const statuses=[];
    transportHook=async(path,init,exec)=>{
      if(init.method==='PUT'){
        waiting++;
        if(waiting===2)release();
        await Promise.race([barrier,delay(5000).then(()=>{throw Error('RACE_BARRIER_TIMEOUT');})]);
        const response=await exec();statuses.push(response.status);return response;
      }
      return exec();
    };
    const result=await Promise.all([commit(first),commit(second)]);
    transportHook=undefined;
    assert.deepEqual(statuses.sort(),[200,412]);
    assert.deepEqual(result.map(x=>x.http).sort(),[200,409]);
    const current=await read('hdnd/datasetV2/active');
    assert.equal(current.revision,base.revision+1);
    const next=await prepare('replace','lostAck',current,{rows:rows(3),sourceName:'synthetic.xlsx'});
    transportHook=async(path,init,exec)=>{
      const response=await exec();
      if(init.method==='PUT'&&response.ok)throw Error('SIMULATED_CONNECTION_LOST_AFTER_PUT');
      return response;
    };
    assert.equal((await commit(next)).http,503);
    transportHook=undefined;
    assert.equal((await status(next)).data.status,'committed-active');
    assert.equal((await commit(next)).data.status,'already-committed');
    assert.equal((await read('hdnd/datasetV2/active')).revision,current.revision+1);
  });

  test('Rules gate: browser and scoped parent claim cannot write marker-only empty generation',async()=>{
    const base=await seed();
    const oldRow='hdnd/datasetV2/generations/'+base.generationId+'/items/baseline_1';
    const data=await read(oldRow);
    const blockedEdit=await clientDb(oldRow,guest.idToken,'PUT',{...data,note:'Frozen change'});
    assert.ok([401,403].includes(blockedEdit.status),'Frozen row write must be denied');
    const prep=await prepare('clear','rulesBoundary',base);
    const old=await read('hdnd');
    await committed(prep);
    const next=await read('hdnd');
    await write('hdnd',old);
    const browserWrite=await clientDb('hdnd/datasetV2',google.idToken,'PUT',next.datasetV2);
    assert.ok([401,403].includes(browserWrite.status),'Browser response: '+browserWrite.status+' '+await browserWrite.text());
    await auth.setCustomUserClaims(google.localId,{parentCasService:true});
    const scoped=await googleLogin('synthetic-google-admin');
    assert.equal((await auth.verifyIdToken(scoped.idToken)).parentCasService,true);
    try{
      const response=await clientDb('hdnd/datasetV2',scoped.idToken,'PUT',next.datasetV2);
      assert.ok([401,403].includes(response.status),'Scoped response: '+response.status+' '+await response.text());
      assert.deepEqual(await read('hdnd/datasetV2/active'),base);
    }finally{await auth.setCustomUserClaims(google.localId,{});}
  });

  test('release gate: freeze epoch drift after prepare must invalidate confirmation',async()=>{
    const base=await seed(),draft=await prepare('clear','freezeEpoch',base);
    const freeze=await read('hdnd/freezeControl');
    await write('hdnd/freezeControl',{...freeze,revision:freeze.revision+2,epoch:freeze.epoch+1,closedAt:2});
    const result=await commit(draft);
    assert.notEqual(result.http,200,'Old confirmation committed after a new freeze epoch');
    assert.deepEqual(await read('hdnd/datasetV2/active'),base);
  });

  test('release gate: signed empty archive is restorable as a zero-row generation',async()=>{
    const base=await seed();
    const empty=await committed(await prepare('clear','emptyArchive',base));
    const archive=(await call('/v1/archive')).data;
    assert.equal(archive.payload.nodes['hdnd/datasetV2'].active.rowCount,0);
    const filled=await committed(await prepare('replace','refill',empty,{rows:rows(2),sourceName:'synthetic.xlsx'}));
    const restored=await committed(await prepare('restore','restoreEmpty',filled,{archive}));
    assert.equal(restored.rowCount,0);
  });

  test('release gate: REST guard measures UTF-8 bytes for a >3 MiB multibyte response',async()=>{
    const data=JSON.stringify({fixture:'😀'.repeat(800000)});
    assert.ok(data.length<3*1024*1024&&Buffer.byteLength(data)>3*1024*1024);
    const db=firebaseRest({databaseURL,accessToken:fakeOAuth,fetchImpl:async()=>new Response(data)});
    await assert.rejects(()=>db.get('hdnd'),/FIREBASE_DATASET_TOO_LARGE_FOR_WORKER_FREE/);
  });
}
