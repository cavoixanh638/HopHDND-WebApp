import {createHash,randomUUID,timingSafeEqual} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase-admin/app';
import {getDatabase,ServerValue} from 'firebase-admin/database';
import {HttpsError} from 'firebase-functions/v2/https';

const MAX_EDIT_MS={status:45000,search:90000,short:120000,multiline:300000,long:600000};
const TTL=45000;
const FIELDS=new Set(['content','department','type','partyLevel','progressParty','progressBuild',
  'progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note','documentKind','isDropped']);
const FIELD_VALUES=new Set(['NQ','BC','UNCLASSIFIED']);
const ID_RE=/^[A-Za-z0-9_:-]{1,200}$/;
const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HEX_RE=/^[a-f0-9]{64}$/;
const NAMESPACE=process.env.GCLOUD_PROJECT||process.env.GCP_PROJECT||'';
let sequence=0;
/** Firebase Functions supplies FIREBASE_CONFIG (including RTDB URL) at runtime.
 * When no URL is configured, FAIL CLOSED rather than selecting a wrong database.
 * Only the demo Emulator may derive a namespace URL from its project ID.
 */
function scopedDatabaseURL(){
  let runtime={};
  try{runtime=JSON.parse(process.env.FIREBASE_CONFIG??'{}');}catch{}
  // The Functions Emulator may expose an internal HTTP RTDB URL. Firebase
  // Admin still expects a normal HTTPS namespace; its Emulator transport
  // redirects it to the local RTDB host without contacting production.
  const demoLocal=NAMESPACE.startsWith('demo-') &&
    /^(127\\.0\\.0\\.1|localhost):9000$/.test(process.env.FIREBASE_DATABASE_EMULATOR_HOST??'');
  const value=demoLocal?`https://${NAMESPACE}-default-rtdb.firebaseio.com`:
    (process.env.FIREBASE_DATABASE_URL||runtime.databaseURL);
  if(!value)fail('unavailable','Chưa cấu hình đường dẫn Realtime Database cho dịch vụ sửa ô.');
  try{
    const url=new URL(value);
    if(url.protocol!=='https:'||url.username||url.password||
      !/\.(firebaseio\.com|firebasedatabase\.app)$/.test(url.hostname))
      throw new Error('Bad Firebase RTDB endpoint');
  }catch{fail('unavailable','Đường dẫn Realtime Database không hợp lệ.');}
  return value;
}


function fail(code,message){throw new HttpsError(code,message);}
function validId(value,label){
  if(typeof value!=='string'||!ID_RE.test(value))fail('invalid-argument',label+' không hợp lệ.');
  return value;
}
function asUuid(value,label){if(typeof value!=='string'||!UUID_RE.test(value))fail('invalid-argument',label+' không hợp lệ.');return value;}
function validSecret(secret){
  if(typeof secret!=='string'||!HEX_RE.test(secret))fail('failed-precondition','Thiếu bí mật phiên sửa.');
  return Buffer.from(secret,'hex');
}
function proofHash(uid,scope,recordId,field,secret){
  return createHash('sha256').update('PR142/cellEdit/1\0').update(uid).update('\0')
    .update(scope).update('\0').update(recordId).update('\0').update(field)
    .update('\0').update(secret).digest('hex');
}
function equalsHash(actual,wanted){
  return typeof actual==='string'&&HEX_RE.test(actual)&&
    timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(wanted,'hex'));
}
function paths(scope,gen,id,field){
  return scope==='legacy'
    ?{row:`hdnd/items/${id}`,lease:`hdnd/editLocks/${id}/${field}`}
    :{row:`hdnd/datasetV2/generations/${gen}/items/${id}`,
      lease:`hdnd/datasetV2/leases/${gen}/${id}/${field}`};
}
function normalize(value){return String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[đĐ]/g,'d').toLowerCase().trim().replace(/\s+/g,' ');}
function prohibitedBuild(current,changes){
  if(!Object.hasOwn(changes,'progressBuild')||changes.progressBuild===current.progressBuild)return false;
  const type=normalize(changes.type??current.type);
  return (changes.documentKind??current.documentKind)==='BC'||['hc','hanh chinh','bc','bao cao'].includes(type);
}
function validateChanges(changes,baseValues){
  if(!changes||typeof changes!=='object'||Array.isArray(changes))fail('invalid-argument','Không có nội dung sửa.');
  const entries=Object.entries(changes);
  if(!entries.length||entries.length>FIELDS.size)fail('invalid-argument','Phạm vi sửa không hợp lệ.');
  for(const [field,value] of entries){
    if(!FIELDS.has(field)||!Object.hasOwn(baseValues??{},field))
      fail('invalid-argument','Trường hoặc giá trị gốc không hợp lệ.');
    if(field==='isDropped'?typeof value!=='boolean':field==='documentKind'? !FIELD_VALUES.has(value):
       (typeof value!=='string'||value.length>20000||(field==='content'&&!value.trim())))
      fail('invalid-argument','Giá trị ô không hợp lệ.');
  }
  return entries.map(([field])=>field);
}
function identityFromAuth(auth){
  const token=auth.token??{};
  const provider=token.firebase?.sign_in_provider;
  if(!auth.uid||typeof auth.uid!=='string'||!['google.com','anonymous'].includes(provider))
    fail('permission-denied','Chỉ chấp nhận phiên Firebase được cấp quyền.');
  return {uid:auth.uid,token:{
    email:typeof token.email==='string'?token.email:null,
    email_verified:token.email_verified===true,
    firebase:{sign_in_provider:provider},
    cellService:true
  }};
}
async function scoped(auth,work){
  const identity=identityFromAuth(auth);
  // The override is derived only from the Callable's verified Auth context.
  // Never accept uid/provider/email/cellService claims from request.data.
  const app=initializeApp({
    projectId:NAMESPACE,databaseURL:scopedDatabaseURL(),
    databaseAuthVariableOverride:identity
  },'pr142-cell-'+(++sequence)+'-'+randomUUID());
  const db=getDatabase(app);
  try{return await work(db,identity);}
  finally {try{db.goOffline();}catch{}await deleteApp(app);}
}
async function warm(ref){
  // Admin RTDB transactions can observe an initial null from an unwarmed cache.
  // Hold a real 'value' listener until transaction finishes, not merely get().
  let resolveReady,rejectReady;
  const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
  let initialized=false;
  const onValue=snapshot=>{if(!initialized){initialized=true;resolveReady(snapshot.val());}};
  const onError=error=>{if(!initialized){initialized=true;rejectReady(error);}};
  ref.on('value',onValue,onError);
  let timer;
  try{
    const current=await Promise.race([ready,new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error('CELL_WARM_TIMEOUT')),12000);
    })]);
    return {current,close:()=>ref.off('value',onValue)};
  }catch(error){ref.off('value',onValue);throw error;}
  finally {clearTimeout(timer);}
}
async function transact(location,callback,heldAlready){
  const held=heldAlready??await warm(location);
  let localReason='';let candidate=false;
  try {
    let result;
    try{
      result=await location.transaction(current=>{
        const answer=callback(current,reason=>{localReason=reason;});
        if(answer!==undefined)candidate=true;
        return answer;
      },undefined,false);
    }catch(e){
      if(/permission.denied/i.test(String(e?.code??'')+' '+String(e?.message??'')))
        fail('permission-denied','Quyền, khóa, generation hoặc freeze đã đổi trước khi máy chủ xác nhận.');
      throw e;
    }
    if(!result.committed){
      if(!candidate)fail('failed-precondition',localReason||'Khóa hoặc giá trị hiện tại không còn phù hợp.');
      fail('unavailable','Giao dịch chưa được xác nhận; phải giữ bản nháp.');
    }
    return result.snapshot.val();
  }finally{held.close();}
}
async function assertEpoch(db,scope,generation){
  const pointer=(await db.ref('hdnd/datasetV2/active').once('value')).val();
  if(scope==='legacy'){
    if(pointer)fail('failed-precondition','Nguồn legacy không còn đang hoạt động.');
  }else if(!pointer||pointer.generationId!==generation?.generationId||
    pointer.operationId!==generation.operationId||pointer.revision!==generation.revision||
    pointer.digest!==generation.digest||pointer.rowCount!==generation.rowCount){
    fail('failed-precondition','Con trỏ thế hệ đã thay đổi.');
  }
}
async function checkLease(db,identity,scope,gen,id,field,secret,token,allowTombstone=false){
  const loc=db.ref(paths(scope,gen,id,field).lease);
  const stored=(await loc.once('value')).val();
  const hash=proofHash(identity.uid,scope==='legacy'?'legacy':`v2:${gen}`,id,field,secret);
  if(!stored||stored.uid!==identity.uid||!equalsHash(stored.proofHash,hash)||
    stored.token!==token||(!allowTombstone&&stored.expiresAt<=Date.now()))
    fail('failed-precondition','Bí mật hoặc trạng thái khóa không còn hiệu lực.');
  return {loc,stored,hash};
}
function readPayload(request){
  if(!request||typeof request!=='object'||Array.isArray(request))fail('invalid-argument','Yêu cầu không hợp lệ.');
  const action=request.action;
  if(!['acquire','renew','release','save','resolve'].includes(action))
    fail('invalid-argument','Hành động không hợp lệ.');
  const scope=request.scope;
  if(scope!=='legacy'&&scope!=='v2')fail('invalid-argument','Nguồn sửa không hợp lệ.');
  if(scope==='v2'&&(!request.generation||!ID_RE.test(request.generation.generationId??'')||
    !Number.isSafeInteger(request.generation.revision)||request.generation.revision<1||
    typeof request.generation.operationId!=='string'||!HEX_RE.test(request.generation.digest??'')||
    !Number.isSafeInteger(request.generation.rowCount)))fail('invalid-argument','Thế hệ V2 không hợp lệ.');
  if(JSON.stringify(request).length>180000)fail('invalid-argument','Yêu cầu quá lớn.');
  return {action,scope,gen:scope==='v2'?request.generation.generationId:null,id:validId(request.recordId,'ID dòng')};
}
export async function dispatchCellEdit(auth,request,testHooks=undefined){
  // No network client can supply a JS callback; onCall always passes exactly
  // (verifiedAuth, data). Emulator regression tests may inject a synchronous
  // checkpoint AFTER proof verification but BEFORE the Rules-enforced commit.
  if(testHooks&&!((process.env.FIREBASE_DATABASE_EMULATOR_HOST??'').startsWith('127.0.0.1:')&&
    NAMESPACE.startsWith('demo-')))fail('permission-denied','Test hooks require local demo Emulators.');
  const {action,scope,gen,id}=readPayload(request);
  const opId=asUuid(request.operationId,'Mã thao tác');
  const scopeKey=scope==='legacy'?'legacy':`v2:${gen}`;
  return scoped(auth,async(db,identity)=>{
    await assertEpoch(db,scope,request.generation);
    if(action==='acquire'){
      const field=validId(request.field,'Trường');
      if(!FIELDS.has(field)||!Object.hasOwn(MAX_EDIT_MS,request.kind))
        fail('invalid-argument','Trường hoặc loại trình sửa không hợp lệ.');
      const secret=validSecret(request.secret);
      const hash=proofHash(identity.uid,scopeKey,id,field,secret);
      const location=db.ref(paths(scope,gen,id,field).lease);
      const now=Date.now();
      const token=opId; // Public, non-bearer identifier. Private secret remains in A's RAM.
      const session=randomUUID();
      const lease=await transact(location,(raw,abort)=>{
        if(raw&&raw.token===token&&equalsHash(raw.proofHash,hash)&&raw.uid===identity.uid)
          {abort('ACK đã ghi trước đó.');return undefined;}
        if(raw&&raw.expiresAt>now){abort('Ô đang được phiên khác giữ khóa.');return undefined;}
        return {uid:identity.uid,session,token,proofHash:hash,lastOperationId:opId,
          revision:(raw?.revision??0)+1,kind:request.kind,
          acquiredAt:now,expiresAt:Math.min(now+TTL,now+MAX_EDIT_MS[request.kind])};
      }).catch(async error=>{
        // Lost ACK or concurrent retry: recognize identical acquire by the original secret.
        const actual=(await location.once('value')).val();
        if(actual?.uid===identity.uid&&actual?.token===token&&
          equalsHash(actual.proofHash,hash)&&actual.expiresAt>Date.now())return actual;
        throw error;
      });
      await assertEpoch(db,scope,request.generation);
      if(lease.expiresAt<=Date.now())fail('failed-precondition','Khóa đã hết hạn.');
      return {status:'acquired',lease:{
        uid:lease.uid,session:lease.session,token:lease.token,revision:lease.revision,
        kind:lease.kind,acquiredAt:lease.acquiredAt,expiresAt:lease.expiresAt,
        proofHash:lease.proofHash,lastOperationId:lease.lastOperationId}};
    }
    if(action==='resolve'){
      const field=validId(request.field,'Trường'),secret=validSecret(request.secret);
      const token=asUuid(request.token,'Khóa');
      const {stored}=await checkLease(db,identity,scope,gen,id,field,secret,token,true);
      if(request.originalAction==='save'){
        const row=(await db.ref(paths(scope,gen,id,field).row).once('value')).val();
        const history=Object.values(row?.history??{}).find(x=>x.operationId===opId);
        return {status:row?.operationId===opId?'committed':history?'committed-historical':'unknown',
          operationId:opId,row:row?.operationId===opId?row:null};
      }
      return {status:stored.lastOperationId===opId
        ?(stored.expiresAt===0?'released':'renewed'):'unknown',operationId:opId};
    }
    if(action==='renew'||action==='release'){
      const field=validId(request.field,'Trường'),secret=validSecret(request.secret);
      const token=asUuid(request.token,'Khóa');
      const {loc,stored,hash}=await checkLease(db,identity,scope,gen,id,field,secret,token,true);
      if(stored.lastOperationId===opId){
        return {status:action==='release'&&stored.expiresAt===0?'released':
          action==='renew'&&stored.expiresAt>0?'renewed':'unknown',lease:stored};
      }
      if(stored.expiresAt<=Date.now())fail('failed-precondition','Khóa đã hết hạn.');
      const now=Date.now();
      const testWarm=testHooks?.afterProof?await warm(loc):null;
      let changed;
      try{
        if(testHooks?.afterProof)await testHooks.afterProof();
        changed=await transact(loc,(raw,abort)=>{
        if(!raw||raw.uid!==identity.uid||raw.token!==token||
          !equalsHash(raw.proofHash,hash)||raw.expiresAt<=now){
          abort('Khóa đã chuyển phiên hoặc hết hạn.');return undefined;
        }
        if(action==='renew'&&now>=raw.acquiredAt+MAX_EDIT_MS[raw.kind]){
          abort('Đã hết thời gian sửa ô.');return undefined;
        }
        return {...raw,revision:raw.revision+1,lastOperationId:opId,
          expiresAt:action==='release'?0:Math.min(now+TTL,raw.acquiredAt+MAX_EDIT_MS[raw.kind])};
        },testWarm);
      }finally{testWarm?.close();}
      await assertEpoch(db,scope,request.generation);
      return {status:action==='release'?'released':'renewed',lease:changed};
    }
    const patch=request.patch;
    if(!patch||patch.recordId!==id||!UUID_RE.test(opId))
      fail('invalid-argument','Nháp sửa không hợp lệ.');
    const fields=validateChanges(patch.changes,patch.baseValues);
    const secrets=request.leases;
    if(!secrets||typeof secrets!=='object')fail('failed-precondition','Thiếu khóa ô.');
    const checked=new Map();
    for(const field of fields){
      if(!secrets[field])fail('failed-precondition','Thiếu khóa của trường '+field);
      const secret=validSecret(secrets[field].secret);
      const token=asUuid(secrets[field].token,'Khóa');
      checked.set(field,await checkLease(db,identity,scope,gen,id,field,secret,token,true));
    }
    const itemLoc=db.ref(paths(scope,gen,id,fields[0]).row);
    const at=ServerValue.TIMESTAMP;
    const testWarm=testHooks?.afterProof?await warm(itemLoc):null;
    let saved;
    try{
      if(testHooks?.afterProof)await testHooks.afterProof();
      saved=await transact(itemLoc,(raw,abort)=>{
      if(!raw){abort('Dòng không tồn tại.');return undefined;}
      if(raw.operationId===opId){abort('ACK đã ghi trước đó.');return undefined;}
      const outdated=fields.find(field=>raw[field]!==patch.baseValues[field]);
      if(outdated){abort('Ô '+outdated+' đã thay đổi, bản nháp vẫn được giữ.');return undefined;}
      const changed=fields.filter(field=>raw[field]!==patch.changes[field]);
      if(!changed.length){abort('Không có thay đổi dữ liệu.');return undefined;}
      if(prohibitedBuild(raw,patch.changes)){abort('HC/BC không phải trình xây dựng NQ.');return undefined;}
      const nextRev=raw.revision+1;
      const editProofs={...(raw.editProofs??{})};
      for(const field of changed)editProofs[field]=checked.get(field).stored.token;
      const history={...(raw.history??{})};
      history[String(nextRev%50)]={
        operationId:opId,recordId:id,at,actor:identity.uid,
        changes:Object.fromEntries(changed.map(f=>[f,patch.changes[f]])),
        oldValues:Object.fromEntries(changed.map(f=>[f,raw[f]]))
      };
      return {...raw,...patch.changes,editProofs,revision:nextRev,
        operationId:opId,updatedAt:at,updatedBy:identity.uid,history};
    }).catch(async error=>{
      // A lost ACK may have committed. Read-only resolve; never issue a new op ID.
      const actual=(await itemLoc.once('value')).val();
      if(actual?.operationId===opId&&fields.every(f=>actual[f]===patch.changes[f]))return actual;
      throw error;
      });
    }finally{testWarm?.close();}
    await assertEpoch(db,scope,request.generation);
    return {status:'committed',operationId:opId,row:saved};
  });
}
