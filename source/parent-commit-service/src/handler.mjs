import {randomUUID} from 'node:crypto';
import {initializeApp,deleteApp,getApps} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';
import {handleParentAction} from './commit.mjs';

const ADMIN_EMAIL='cavoixanh638@gmail.com';
const MAX_BODY=8*1024;
const project=()=>process.env.GCLOUD_PROJECT||process.env.GCP_PROJECT||process.env.FIREBASE_PROJECT_ID;
const authApp=()=>{
  const id=project();
  if(!id)throw Error('PARENT_BACKEND_CONFIG_MISSING projectId');
  return getApps().find(a=>a.name==='parent-auth')??initializeApp({projectId:id},'parent-auth');
};
const json=(res,code,body,origin)=>{
  if(origin){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.statusCode=code;
  res.end(JSON.stringify(body));
};
function allowableOrigin(origin){
  if(!origin)return null;
  const allow=(process.env.PARENT_ALLOWED_ORIGINS??'').split(',').map(s=>s.trim()).filter(Boolean);
  return allow.includes(origin)?origin:null;
}
async function readBody(req){
  if(req.body&&typeof req.body==='object'&&!Buffer.isBuffer(req.body))return req.body;
  const chunks=[];let bytes=0;
  for await(const chunk of req){bytes+=chunk.length;
    if(bytes>MAX_BODY)throw Object.assign(Error('REQUEST_TOO_LARGE'),{statusCode:413});
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function verifiedGoogleAdmin(decoded){
  return decoded&&decoded.email===ADMIN_EMAIL&&decoded.email_verified===true&&
    decoded.firebase?.sign_in_provider==='google.com'&&typeof decoded.uid==='string'&&decoded.uid.length>0;
}
/**
 * Only the endpoint, after verifying the user's Firebase ID token, can mint
 * this Rules-only service credential. It is NEVER accepted from HTTP JSON,
 * caller-supplied headers, or UI request arguments. Node Admin SDK with
 * databaseAuthVariableOverride MUST be shown by Emulator witness to be
 * subject to FULL RTDB Rules. A plain privileged Admin SDK write is forbidden.
 */
function scopedDatabase(decoded){
  const p=project();
  const databaseURL=process.env.PARENT_DATABASE_URL??`https://${p}-default-rtdb.firebaseio.com`;
  if(process.env.FIREBASE_DATABASE_EMULATOR_HOST&&!p.startsWith('demo-'))
    throw Error('PARENT_EMULATOR_REQUIRES_DEMO_PROJECT');
  const override={uid:decoded.uid,token:{
    email:decoded.email,email_verified:decoded.email_verified,
    firebase:{sign_in_provider:decoded.firebase.sign_in_provider},
    parentCasService:true
  }};
  const app=initializeApp({projectId:p,databaseURL,databaseAuthVariableOverride:override},
    'parent-scoped-'+randomUUID());
  return {app,db:getDatabase(app)};
}
export async function handleParentRequest(req,res){
  const origin=req.headers.origin;
  const allowOrigin=allowableOrigin(origin);
  if(origin&&!allowOrigin){json(res,403,{error:'ORIGIN_DENIED'},null);return;}
  if(req.method==='OPTIONS'){
    if(allowOrigin){
      res.setHeader('Access-Control-Allow-Origin',allowOrigin);
      res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type');
      res.setHeader('Access-Control-Allow-Methods','POST, OPTIONS');
      res.setHeader('Vary','Origin');
    }
    res.writeHead(204);res.end();return;
  }
  if(req.method==='GET'&&req.url==='/health'){
    json(res,200,{service:'parent-commit',enabled:process.env.PARENT_COMMIT_ENABLED==='true'},allowOrigin);return;
  }
  if(req.method!=='POST'){json(res,405,{error:'METHOD_NOT_ALLOWED'},allowOrigin);return;}
  if(process.env.PARENT_COMMIT_ENABLED!=='true'){
    json(res,503,{error:'PARENT_SERVICE_DISABLED'},allowOrigin);return;
  }
  const auth=req.headers.authorization??'';
  if(!/^Bearer [^\s]+$/.test(auth)){
    json(res,401,{error:'MISSING_FIREBASE_ID_TOKEN'},allowOrigin);return;
  }
  let claims;
  try {claims=await getAuth(authApp()).verifyIdToken(auth.slice(7),true);}
  catch{json(res,401,{error:'INVALID_FIREBASE_ID_TOKEN'},allowOrigin);return;}
  if(!verifiedGoogleAdmin(claims)){
    json(res,403,{error:'VERIFIED_GOOGLE_ADMIN_REQUIRED'},allowOrigin);return;
  }
  let body;
  try{body=await readBody(req);}
  catch(error){json(res,error.statusCode??400,{error:'INVALID_REQUEST_BODY'},allowOrigin);return;}
  let scoped;
  try{
    scoped=scopedDatabase(claims);
    const result=await handleParentAction(scoped.db,{uid:claims.uid},body);
    json(res,200,result,allowOrigin);
  }catch(error){
    const message=String(error?.message??error);
    // Avoid printing row, token, authorization or private backup content.
    const conflict=/DENIED|mismatch|stale|invalid|missing|changed|PARENT_TRANSACTION/.test(message);
    const status=conflict?409:503;
    json(res,status,{error:conflict?'PARENT_REJECTED':'PARENT_UNKNOWN',
      message:message.slice(0,220),operationId:typeof body?.operationId==='string'?body.operationId:undefined},allowOrigin);
  }finally{if(scoped)await deleteApp(scoped.app).catch(()=>{});}
}