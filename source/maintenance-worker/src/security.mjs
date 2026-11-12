import {requireCondition} from './domain.mjs';
const ENCODER=new TextEncoder();
const SECURETOKEN_JWKS='https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
let jwksCache=null;
export function bytesToBase64url(input){
  const b=input instanceof Uint8Array?input:new Uint8Array(input);
  let raw='';for(const part of b)raw+=String.fromCharCode(part);
  return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function base64urlToBytes(value){
  requireCondition(typeof value==='string'&&/^[A-Za-z0-9_-]+$/.test(value),'INVALID_BASE64URL');
  const padded=value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4);
  return Uint8Array.from(atob(padded),c=>c.charCodeAt(0));
}
function decodeJwtPart(value){
  let decoded;
  try{decoded=JSON.parse(new TextDecoder().decode(base64urlToBytes(value)));}
  catch{throw Error('INVALID_JWT_PART');}
  requireCondition(decoded&&typeof decoded==='object'&&!Array.isArray(decoded),'INVALID_JWT_PART');
  return decoded;
}
export function jwtHeaderPayload(token){
  requireCondition(typeof token==='string'&&token.length<15000,'INVALID_ID_TOKEN');
  const parts=token.split('.');requireCondition(parts.length===3,'INVALID_ID_TOKEN');
  return {parts,header:decodeJwtPart(parts[0]),payload:decodeJwtPart(parts[1])};
}
async function publicKey(kid,fetchImpl){
  const now=Date.now();
  if(!jwksCache||jwksCache.until<=now){
    const resp=await fetchImpl(SECURETOKEN_JWKS,{method:'GET',headers:{Accept:'application/json'}});
    requireCondition(resp.ok,'KEY_DISCOVERY_UNAVAILABLE');
    const data=await resp.json();
    requireCondition(Array.isArray(data?.keys)&&data.keys.length>0,'KEY_DISCOVERY_INVALID');
    const match=(resp.headers.get('cache-control')||'').match(/max-age=(\d+)/);
    const seconds=Math.max(60,Math.min(3600,Number(match?.[1]||300)));
    jwksCache={keys:data.keys,until:now+seconds*1000};
  }
  const key=jwksCache.keys.find(x=>x.kid===kid&&x.kty==='RSA'&&x.alg==='RS256'&&
    x.use==='sig'&&typeof x.n==='string'&&typeof x.e==='string');
  requireCondition(!!key,'INVALID_SIGNING_KEY');
  return crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
}
/** Independent RSA signature & Firebase issuer/claims check, including fresh
 * Google sign-in for destructive operations. The caller MUST additionally
 * use assertFirebaseSessionCurrent() before accessing privileged RTDB APIs. */
export async function verifyFirebaseAdmin(token,env,{fetchImpl=fetch,now=Math.floor(Date.now()/1000),fresh=false}={}){
  const {parts,header,payload}=jwtHeaderPayload(token);
  requireCondition(header.alg==='RS256'&&typeof header.kid==='string'&&header.kid.length>4&&
    (header.typ===undefined||header.typ==='JWT'),'INVALID_TOKEN_ALGORITHM');
  const key=await publicKey(header.kid,fetchImpl);
  const signature=base64urlToBytes(parts[2]);
  const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,signature,
    ENCODER.encode(parts[0]+'.'+parts[1]));
  requireCondition(valid,'INVALID_TOKEN_SIGNATURE');
  const project=env.FIREBASE_PROJECT_ID,adminUid=env.ADMIN_UID,adminEmail=env.ADMIN_EMAIL;
  requireCondition(typeof adminUid==='string'&&adminUid.length>4&&typeof adminEmail==='string'&&
    typeof project==='string'&&project.length>3,'MISSING_ADMIN_POLICY');
  requireCondition(payload.aud===project&&payload.iss==='https://securetoken.google.com/'+project&&
    typeof payload.sub==='string'&&payload.sub.length>=1&&payload.sub.length<=128&&
    Number.isFinite(payload.iat)&&payload.iat<=now+30&&
    Number.isFinite(payload.exp)&&payload.exp>now&&payload.exp<=now+3660&&
    Number.isFinite(payload.auth_time)&&payload.auth_time<=now+30,
    'INVALID_FIREBASE_ID_TOKEN_CLAIMS');
  requireCondition(payload.sub===adminUid&&payload.email===adminEmail&&
    payload.email_verified===true&&payload.firebase?.sign_in_provider==='google.com',
    'VERIFIED_GOOGLE_ADMIN_REQUIRED');
  if(fresh)requireCondition(now-payload.auth_time<=600&&now-payload.iat<=3600,
    'FRESH_GOOGLE_REAUTH_REQUIRED');
  return {uid:payload.sub,email:payload.email,issuedAt:payload.iat,authTime:payload.auth_time};
}
/** Fail-closed revocation + disabled-user check after JWT RSA signature
 * verification. Service IAM requires firebaseauth.users.get. Never rely only
 * on a still-unexpired JWT after the admin's refresh token was revoked.
 * Google Identity Toolkit account lookup is read-only and uses server OAuth.
 */
export async function assertFirebaseSessionCurrent(identity,env,oauthToken,{fetchImpl=fetch}={}){
  requireCondition(typeof identity?.uid==='string'&&identity.uid===env.ADMIN_UID&&
    typeof oauthToken==='string'&&oauthToken.length>20,'INVALID_SESSION_REVOCATION_REQUEST');
  const endpoint='https://identitytoolkit.googleapis.com/v1/accounts:lookup';
  let response;
  try{
    response=await fetchImpl(endpoint,{
      method:'POST',
      headers:{Authorization:'Bearer '+oauthToken,'Content-Type':'application/json'},
      body:JSON.stringify({localId:[identity.uid],targetProjectId:env.FIREBASE_PROJECT_ID}),
    });
  }catch{throw Error('SESSION_REVOCATION_CHECK_UNAVAILABLE')}
  requireCondition(response.ok,'SESSION_REVOCATION_CHECK_UNAVAILABLE');
  let data;try{data=await response.json()}catch{throw Error('SESSION_REVOCATION_CHECK_UNAVAILABLE')}
  requireCondition(Array.isArray(data?.users)&&data.users.length===1,
    'ADMIN_USER_NOT_FOUND');
  const found=data.users[0];
  requireCondition(found?.localId===identity.uid&&found?.email===env.ADMIN_EMAIL&&
    found.emailVerified===true&&found.disabled!==true,
    'ADMIN_USER_DISABLED_OR_CHANGED');
  const validSince=Number(found.validSince??'0');
  requireCondition(Number.isSafeInteger(validSince)&&validSince>=0&&
    Number.isFinite(identity.authTime)&&identity.authTime>=validSince,
    'ADMIN_SESSION_REVOKED');
  return true;
}
function pemBytes(pem){
  requireCondition(typeof pem==='string'&&pem.includes('BEGIN PRIVATE KEY'),'INVALID_SERVICE_ACCOUNT_KEY');
  return Uint8Array.from(atob(pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g,'')),c=>c.charCodeAt(0));
}
export async function getServiceAccountAccessToken(env,{fetchImpl=fetch,now=Math.floor(Date.now()/1000)}={}){
  requireCondition(typeof env.SERVICE_ACCOUNT_JSON==='string'&&env.SERVICE_ACCOUNT_JSON.length>30,
    'MISSING_SERVICE_ACCOUNT_SECRET');
  let creds;try{creds=JSON.parse(env.SERVICE_ACCOUNT_JSON)}catch{throw Error('INVALID_SERVICE_ACCOUNT_JSON');}
  requireCondition(creds?.type==='service_account'&&creds.project_id===env.FIREBASE_PROJECT_ID&&
    typeof creds.client_email==='string'&&creds.client_email.endsWith('.gserviceaccount.com')&&
    typeof creds.private_key==='string','INVALID_SERVICE_ACCOUNT_SCOPE');
  const key=await crypto.subtle.importKey('pkcs8',pemBytes(creds.private_key),
    {name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const head=bytesToBase64url(ENCODER.encode(JSON.stringify({alg:'RS256',typ:'JWT'})));
  const body=bytesToBase64url(ENCODER.encode(JSON.stringify({iss:creds.client_email,sub:creds.client_email,
    aud:'https://oauth2.googleapis.com/token',
    scope:'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/identitytoolkit',
    iat:now,exp:now+300})));
  const data=head+'.'+body;
  const signature=bytesToBase64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,ENCODER.encode(data)));
  const response=await fetchImpl('https://oauth2.googleapis.com/token',{
    method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:data+'.'+signature})});
  requireCondition(response.ok,'SERVICE_ACCOUNT_OAUTH_UNAVAILABLE');
  const token=await response.json();
  requireCondition(typeof token.access_token==='string'&&token.access_token.length>20&&
    token.token_type==='Bearer','INVALID_SERVICE_OAUTH_RESPONSE');
  return token.access_token;
}
export async function hmacSignature(value,secret){
  requireCondition(typeof secret==='string'&&secret.length>=32,'BACKUP_HMAC_SECRET_TOO_SHORT');
  const key=await crypto.subtle.importKey('raw',ENCODER.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  return bytesToBase64url(await crypto.subtle.sign('HMAC',key,ENCODER.encode(value)));
}
export async function verifyHmac(value,signature,secret){
  if(typeof signature!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(signature))return false;
  requireCondition(typeof secret==='string'&&secret.length>=32,'BACKUP_HMAC_SECRET_TOO_SHORT');
  const key=await crypto.subtle.importKey('raw',ENCODER.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['verify']);
  return crypto.subtle.verify('HMAC',key,base64urlToBytes(signature),ENCODER.encode(value));
}
