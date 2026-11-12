import test from 'node:test';
import assert from 'node:assert/strict';
import {handleRequest} from '../src/index.mjs';
import {firebaseRest} from '../src/firebase-rest.mjs';
const origin='https://cavoixanh638.github.io';
const config={WEB_ORIGIN:origin,FIREBASE_PROJECT_ID:'hophdnd-8b7b2',
  FIREBASE_DATABASE_URL:'https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app',
  ENABLE_READS:'true',ENABLE_MUTATIONS:'false',ADMIN_UID:'uid-verified-admin-0001',ADMIN_EMAIL:'admin@example.invalid'};
const token='z'.repeat(100);
function request(path,{method='GET',originValue=origin,authorization='Bearer '+token,body}={}){
  return new Request('https://hophdnd-maintenance.workers.dev'+path,{method,
    headers:{Origin:originValue,Authorization:authorization,...(body?{'Content-Type':'application/json'}:{})},
    ...(body?{body:JSON.stringify(body)}:{})});
}
test('maintenance is disabled by default, and origin is never wildcard',async()=>{
  const r=await handleRequest(request('/health'),{...config,ENABLE_READS:'false'});
  assert.equal(r.status,200);assert.equal((await r.json()).ready,false);
  const cors=await handleRequest(request('/v1/status?operationId=maint_1234567890123456',
    {originValue:'https://malicious.invalid'}),config);
  assert.equal(cors.status,403);
  assert.notEqual(cors.headers.get('access-control-allow-origin'),'*');
  const disabled=await handleRequest(request('/v1/prepare',{method:'POST',body:{}}),config);
  assert.equal(disabled.status,503);assert.equal((await disabled.json()).error,'MAINTENANCE_NOT_APPROVED');
});
test('write capability remains off even if flag is true but offsite backup binding is absent',async()=>{
  const missingStore={...config,ENABLE_MUTATIONS:'true'};
  const health=await handleRequest(request('/health'),missingStore);
  const capability=await health.json();
  assert.equal(capability.ready,true);
  assert.equal(capability.mutationsEnabled,false);
  const stage=await handleRequest(request('/v1/prepare',{method:'POST',body:{}}),missingStore);
  assert.equal(stage.status,503);
  assert.equal((await stage.json()).error,'MAINTENANCE_NOT_APPROVED');
});

test('rate limit is required for write readiness and rejects before privileged OAuth',async()=>{
  let oauthCalls=0;
  const store={get:async()=>null,put:async()=>undefined};
  const cfg={...config,ENABLE_MUTATIONS:'true',MAINTENANCE_ARCHIVE_BUCKET:store};
  const health=await handleRequest(request('/health'),cfg);
  assert.equal((await health.json()).mutationsEnabled,false);
  const noLimiter=await handleRequest(request('/v1/prepare',{method:'POST',body:{}}),cfg);
  assert.equal(noLimiter.status,503);
  const limit={limit:async({key})=>{assert.equal(key,'uid-verified-admin-0001:prepare');return {success:false};}};
  const denied=await handleRequest(request('/v1/prepare',{method:'POST',body:{}}),
    {...cfg,MAINTENANCE_RATE_LIMIT:limit},{
      verifyAdmin:async()=>({uid:'uid-verified-admin-0001'}),
      getToken:async()=>{oauthCalls++;return 's'.repeat(60);}
    });
  assert.equal(denied.status,429);
  assert.equal((await denied.json()).error,'MAINTENANCE_RATE_LIMIT_EXCEEDED');
  assert.equal(oauthCalls,0);
  const healthy=await handleRequest(request('/health'),{...cfg,MAINTENANCE_RATE_LIMIT:limit});
  assert.equal((await healthy.json()).mutationsEnabled,true);
});

test('invalid user authorization is denied before any privileged OAuth token is requested',async()=>{
  let tokenCalls=0;
  const result=await handleRequest(request('/v1/status?operationId=maint_1234567890123456'),config,{
    verifyAdmin:async()=>{throw Error('VERIFIED_GOOGLE_ADMIN_REQUIRED')},
    getToken:async()=>{tokenCalls++;return 'never'},
  });
  assert.equal(result.status,403);assert.equal(tokenCalls,0);
});
test('approved readonly status may execute, never exposing other URL routes',async()=>{
  let called=0;
  const out=await handleRequest(request('/v1/status?operationId=maint_1234567890123456'),config,{
    verifyAdmin:async()=>({uid:'uid-verified-admin-0001'}),
    getToken:async()=>('s'.repeat(60)),
    checkSession:async identity=>{assert.equal(identity.uid,'uid-verified-admin-0001');return true;},
    makeDb:()=>({get:async path=>{assert.equal(path,'hdnd');called++;return {} }}),
  });
  assert.equal(out.status,200);assert.equal((await out.json()).status,'not-found');
  assert.equal(called,1);
  assert.equal((await handleRequest(request('/v1/not-an-endpoint'),config)).status,404);
});
test('privileged Firebase backend is never reached if session revocation check fails',async()=>{
  let dbCalls=0;
  const denied=await handleRequest(request('/v1/status?operationId=maint_1234567890123456'),config,{
    verifyAdmin:async()=>({uid:'uid-verified-admin-0001',authTime:1700000000}),
    getToken:async()=>('s'.repeat(60)),
    checkSession:async()=>{throw Error('ADMIN_SESSION_REVOKED')},
    makeDb:()=>{dbCalls++;throw Error('SERVER_BYPASS')},
  });
  assert.equal(denied.status,403); // revoked admin denied; client must not infer success
  assert.equal((await denied.json()).error,'ADMIN_SESSION_REVOKED');
  assert.equal(dbCalls,0);
});
test('Firebase REST client uses conditional PUT /hdnd not blind PATCH/DELETE or root',async()=>{
  const calls=[];
  const fakeFetch=async(url,init)=>{
    calls.push({url,method:init.method,headers:init.headers,body:init.body});
    if(init.method==='GET')return new Response(JSON.stringify({ok:true}),{status:200,headers:{ETag:'"v1"'}});
    if(init.method==='PUT')return new Response(JSON.stringify({ok:true}),{status:200});
    throw Error('UNEXPECTED_METHOD');
  };
  const db=firebaseRest({databaseURL:config.FIREBASE_DATABASE_URL,accessToken:'s'.repeat(60),fetchImpl:fakeFetch});
  const a=await db.getWithEtag('hdnd');assert.equal(a.etag,'"v1"');
  await db.putIfMatch('hdnd',{ok:false},a.etag);
  assert.equal(calls.length,2);
  assert.equal(calls[0].headers['X-Firebase-ETag'],'true');
  assert.equal(calls[1].headers['if-match'],'"v1"');
  assert.equal(calls[1].url.endsWith('/hdnd.json'),true);
  assert.equal(calls.some(x=>x.method==='PATCH'||x.method==='DELETE'),false);
  await assert.rejects(()=>db.putIfMatch('',{},a.etag),/INVALID_FIREBASE_PATH/);
});
