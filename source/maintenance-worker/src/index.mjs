/** Cloudflare Worker for one GitHub Pages WebApp; disabled by default.
 * A Firebase service-account secret stays in Cloudflare, never in GitHub/JS.
 * All mutations are ETag CAS at /hdnd only; never blind root PATCH/DELETE.
 */
import {assertOperationId,MAX_PAYLOAD_BYTES,requireCondition} from './domain.mjs';
import {verifyFirebaseAdmin,getServiceAccountAccessToken,assertFirebaseSessionCurrent} from './security.mjs';
import {firebaseRest} from './firebase-rest.mjs';
import {commitMaintenance,exportArchive,inspectOperation,prepareMaintenance} from './engine.mjs';
const responseHeaders=(origin,extras={})=>({
  'Access-Control-Allow-Origin':origin,
  'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers':'Authorization,Content-Type',
  'Access-Control-Max-Age':'600','Vary':'Origin',
  'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
  ...extras,
});
const json=(payload,status,origin,extras={})=>new Response(JSON.stringify(payload),{
  status,headers:responseHeaders(origin,{'Content-Type':'application/json; charset=utf-8',...extras})});
function httpStatus(code){
  if(code==='MAINTENANCE_RATE_LIMIT_EXCEEDED')return 429;
  if(/^(INVALID|UNEXPECTED|BACKUP_|DUPLICATE_RECORD|EMPTY_CONTENT|MAINTENANCE_LIMIT|PREPARED_PAYLOAD|ARCHIVE_TOO)/.test(code))return 400;
  if(/^(VERIFIED_GOOGLE_ADMIN|MISSING_ADMIN_POLICY|FRESH_GOOGLE_REAUTH|INVALID_TOKEN|INVALID_FIREBASE_ID_TOKEN|INVALID_SIGNING_KEY|ADMIN_SESSION_REVOKED|ADMIN_USER_DISABLED_OR_CHANGED|ADMIN_USER_NOT_FOUND)/.test(code))return 403;
  if(/^(STALE|CONCURRENT|DUPLICATE_OPERATION|COMMIT_ETAG|ACTIVE_DATA|ACTIVE_GENERATION|OPERATION_ALREADY|CONFIRMATION_MISMATCH|BACKUP_NO_LONGER|PREPARATION_EXPIRED)/.test(code))return 409;
  if(/^(FREEZE|ACTIVE_EDIT_LEASE|INVALID_LEASES)/.test(code))return 423;
  return 503;
}
const mutating=action=>action==='prepare'||action==='commit';
function normalizeConfig(env){
  const origin=env?.WEB_ORIGIN;
  requireCondition(origin==='https://cavoixanh638.github.io','UNAPPROVED_WEB_ORIGIN');
  requireCondition(env.FIREBASE_PROJECT_ID==='hophdnd-8b7b2'&&
    env.FIREBASE_DATABASE_URL==='https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app',
    'UNAPPROVED_FIREBASE_SCOPE');
  return origin;
}
async function parseBody(request){
  const size=Number(request.headers.get('content-length')||'0');
  requireCondition(!size||size<=MAX_PAYLOAD_BYTES,'MAINTENANCE_LIMIT_3MB');
  const raw=await request.text();
  requireCondition(new TextEncoder().encode(raw).length<=MAX_PAYLOAD_BYTES,'MAINTENANCE_LIMIT_3MB');
  let data;try{data=JSON.parse(raw)}catch{throw Error('INVALID_REQUEST_JSON');}
  return data;
}
/** Test dependency hooks are not serialized into the deployed Worker. */
export async function handleRequest(request,env,{
  verifyAdmin=verifyFirebaseAdmin,
  getToken=getServiceAccountAccessToken,
  checkSession=assertFirebaseSessionCurrent,
  makeDb=opts=>firebaseRest(opts),
  now=()=>Date.now(),
}={}){
  let origin;
  try{origin=normalizeConfig(env)}
  catch{return new Response('Service not configured',{status:503});}
  const callerOrigin=request.headers.get('Origin');
  const url=new URL(request.url);
  if(request.method==='GET'&&url.pathname==='/health')return json({service:'hophdnd-maintenance',
    ready:env.ENABLE_READS==='true',
    mutationsEnabled:env.ENABLE_MUTATIONS==='true'&&
      typeof env.MAINTENANCE_ARCHIVE_BUCKET?.put==='function'&&
      typeof env.MAINTENANCE_ARCHIVE_BUCKET?.get==='function'&&
      typeof env.MAINTENANCE_RATE_LIMIT?.limit==='function'},200,origin);
  if(callerOrigin!==origin)return json({error:'ORIGIN_NOT_ALLOWED'},403,origin);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:responseHeaders(origin)});
  let action;
  if(request.method==='GET'&&url.pathname==='/v1/archive')action='archive';
  else if(request.method==='GET'&&url.pathname==='/v1/status')action='status';
  else if(request.method==='POST'&&url.pathname==='/v1/prepare')action='prepare';
  else if(request.method==='POST'&&url.pathname==='/v1/commit')action='commit';
  else return json({error:'ROUTE_NOT_FOUND'},404,origin);
  if(env.ENABLE_READS!=='true'||(mutating(action)&&
    (env.ENABLE_MUTATIONS!=='true'||typeof env.MAINTENANCE_ARCHIVE_BUCKET?.put!=='function'||
     typeof env.MAINTENANCE_ARCHIVE_BUCKET?.get!=='function'||
     typeof env.MAINTENANCE_RATE_LIMIT?.limit!=='function')))
    return json({error:'MAINTENANCE_NOT_APPROVED'},503,origin);
  const auth=request.headers.get('Authorization')||'';
  if(!/^Bearer [^\s]{50,15000}$/.test(auth))return json({error:'FIREBASE_ID_TOKEN_REQUIRED'},401,origin);
  try{
    // Authentication runs BEFORE obtaining privileged Firebase OAuth access.
    const identity=await verifyAdmin(auth.slice(7),env,{fresh:mutating(action)});
    if(mutating(action)){
      // Cloudflare's native limiter is approximate and location-local; it is
      // defense-in-depth only. ETag/CAS + operation journal remain authoritative.
      const limited=await env.MAINTENANCE_RATE_LIMIT.limit({
        key:identity.uid+':'+action
      });
      requireCondition(limited?.success===true,'MAINTENANCE_RATE_LIMIT_EXCEEDED');
    }
    const accessToken=await getToken(env);
    // Even a valid RSA-signed ID token may belong to a revoked or disabled user.
    // Query authoritative Firebase Auth before access to privileged database credentials.
    await checkSession(identity,env,accessToken);
    const db=makeDb({databaseURL:env.FIREBASE_DATABASE_URL,accessToken});
    if(action==='archive'){
      const backup=await exportArchive(db,env,{now:now()});
      return json(backup,200,origin,{'Content-Disposition':
        `attachment; filename="HopHDND-backup-${new Date(backup.payload.createdAt).toISOString().slice(0,10)}.json"`});
    }
    if(action==='status'){
      const operationId=assertOperationId(url.searchParams.get('operationId'));
      return json(await inspectOperation(db,operationId),200,origin);
    }
    const body=await parseBody(request);
    if(action==='prepare')return json(await prepareMaintenance(db,env,identity,body,{now:now()}),200,origin);
    return json(await commitMaintenance(db,env,identity,body,{now:now()}),200,origin);
  }catch(error){
    const raw=String(error?.code||error?.message||'MAINTENANCE_UNKNOWN');
    // No private rows, credentials, OAuth/ID tokens, backups or user identifiers in logs.
    const code=/^[A-Z][A-Z0-9_]{3,90}$/.test(raw)?raw:'MAINTENANCE_UNKNOWN';
    return json({error:code},httpStatus(code),origin);
  }
}
export default {fetch:handleRequest};
