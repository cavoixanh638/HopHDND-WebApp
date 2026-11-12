import test from 'node:test';
import assert from 'node:assert/strict';
import {bytesToBase64url,verifyFirebaseAdmin,getServiceAccountAccessToken,
  hmacSignature,verifyHmac} from '../src/security.mjs';
const encoder=new TextEncoder();
const now=1800000000;
const config={FIREBASE_PROJECT_ID:'hophdnd-8b7b2',ADMIN_UID:'uid-verified-admin-0001',ADMIN_EMAIL:'admin@example.invalid'};
const rsa=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
  publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk={...await crypto.subtle.exportKey('jwk',rsa.publicKey),kid:'test-kid-111222',use:'sig',alg:'RS256'};
const keysFetch=async()=>new Response(JSON.stringify({keys:[jwk]}),{status:200,
  headers:{'cache-control':'max-age=300','content-type':'application/json'}});
const claims={iss:'https://securetoken.google.com/'+config.FIREBASE_PROJECT_ID,
  aud:config.FIREBASE_PROJECT_ID,sub:config.ADMIN_UID,uid:config.ADMIN_UID,
  exp:now+3600,iat:now-60,auth_time:now-100,email:config.ADMIN_EMAIL,
  email_verified:true,firebase:{sign_in_provider:'google.com'}};
async function issue(overrides={},key=rsa.privateKey){
  const head=bytesToBase64url(encoder.encode(JSON.stringify({alg:'RS256',typ:'JWT',kid:jwk.kid})));
  const body=bytesToBase64url(encoder.encode(JSON.stringify({...claims,...overrides})));
  const input=head+'.'+body;
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,encoder.encode(input));
  return input+'.'+bytesToBase64url(sig);
}
test('Firebase ID tokens require a REAL RSA signature plus issuer, project, uid and google.com',async()=>{
  const token=await issue();
  const who=await verifyFirebaseAdmin(token,config,{fetchImpl:keysFetch,now,fresh:true});
  assert.equal(who.uid,config.ADMIN_UID);
  for(const payload of [
    {aud:'other-project'},{iss:'https://securetoken.google.com/other'},
    {sub:'other-uid'},{email_verified:false},{firebase:{sign_in_provider:'password'}},
    {exp:now-10},{iat:now+600},{auth_time:now-3600}
  ]){
    const invalid=await issue(payload);
    await assert.rejects(()=>verifyFirebaseAdmin(invalid,config,{fetchImpl:keysFetch,now,fresh:true}));
  }
});
test('expired, stale sign-in, forged payload and wrong private key are rejected',async()=>{
  const valid=await issue();
  const pieces=valid.split('.');
  pieces[1]=bytesToBase64url(encoder.encode(JSON.stringify({...claims,email:'fake@example.invalid'})));
  await assert.rejects(()=>verifyFirebaseAdmin(pieces.join('.'),config,{fetchImpl:keysFetch,now,fresh:true}),/INVALID_TOKEN_SIGNATURE/);
  const wrong=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,
    publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const forged=await issue({},wrong.privateKey);
  await assert.rejects(()=>verifyFirebaseAdmin(forged,config,{fetchImpl:keysFetch,now}),/INVALID_TOKEN_SIGNATURE/);
});
test('service-account OAuth is minted only from server secret with required narrow scopes',async()=>{
  const pkcs8=await crypto.subtle.exportKey('pkcs8',rsa.privateKey);
  const b64=Buffer.from(pkcs8).toString('base64').match(/.{1,64}/g).join('\n');
  const account={type:'service_account',project_id:config.FIREBASE_PROJECT_ID,
    client_email:'maintenance-account@hophdnd-8b7b2.iam.gserviceaccount.com',
    private_key:'-----BEGIN PRIVATE KEY-----\n'+b64+'\n-----END PRIVATE KEY-----\n'};
  let asserted=false;
  const fetchToken=async(url,request)=>{
    assert.equal(url,'https://oauth2.googleapis.com/token');
    assert.equal(request.method,'POST');
    const params=new URLSearchParams(request.body);
    assert.equal(params.get('grant_type'),'urn:ietf:params:oauth:grant-type:jwt-bearer');
    const [head,body,signature]=params.get('assertion').split('.');
    const claims=JSON.parse(Buffer.from(body,'base64url').toString());
    assert.match(claims.scope,/firebase.database/);
    assert.match(claims.scope,/userinfo.email/);
    assert.equal(claims.aud,'https://oauth2.googleapis.com/token');
    assert.equal(signature.length>40,true);
    asserted=true;
    return new Response(JSON.stringify({access_token:'abcdefghij'.repeat(6),token_type:'Bearer'}),{status:200});
  };
  const token=await getServiceAccountAccessToken({...config,SERVICE_ACCOUNT_JSON:JSON.stringify(account)},
    {fetchImpl:fetchToken,now});
  assert.equal(token,'abcdefghij'.repeat(6));assert.equal(asserted,true);
  await assert.rejects(()=>getServiceAccountAccessToken({...config,SERVICE_ACCOUNT_JSON:JSON.stringify({...account,project_id:'other'})},
    {fetchImpl:fetchToken,now}),/INVALID_SERVICE_ACCOUNT_SCOPE/);
});
test('HMAC signature rejects altered payloads and wrong signing keys',async()=>{
  const secret='valid-long-secret-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const signed=await hmacSignature('data-a',secret);
  assert.equal(await verifyHmac('data-a',signed,secret),true);
  assert.equal(await verifyHmac('data-b',signed,secret),false);
  assert.equal(await verifyHmac('data-a',signed,secret+'extra'),false);
});
