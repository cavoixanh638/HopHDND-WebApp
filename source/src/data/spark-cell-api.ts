import {get,ref,runTransaction,serverTimestamp,onValue,type Database} from 'firebase/database';
import {EDITABLE_FIELDS,validateChanges} from '../domain/items';
import {violatesProgressBuildWritePolicy} from './pr95-v5-l5-progress-build-policy';
import {sparkSession} from './spark-session';
import type {CellEditEnvelope,CellEditAnswer} from './cell-edit-api';
import type {CellLease,EditorKind} from './cell-edit-leases';

const MAX_EDIT_MS:Record<EditorKind,number>={status:45000,search:90000,short:120000,multiline:300000,long:600000};
const TTL=45000;
const PARTY_LEVELS=new Set(['Không','TTTU','BTV','BCH']);
const PARTY_STATUSES=new Set(['Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL']);
const isNoParty=(value:unknown)=>value==='Không'||value==='Không phải trình';
const inFlight=new WeakMap<Database,Map<string,{input:string;result:Promise<CellEditAnswer>}>>();
async function holdValue(database:Database,path:string):Promise<()=>void>{
  let release=()=>{};
  try{
    await new Promise<void>((resolve,reject)=>{
      const timer=setTimeout(()=>{release();reject(Error('Chưa xác nhận dữ liệu máy chủ.'));},10000);
      release=onValue(ref(database,path),()=>{clearTimeout(timer);resolve();},cause=>{clearTimeout(timer);reject(cause);});
    });
    return release;
  }catch(error){release();throw error;}
}
async function serverNow(db:Database){
  const offset=await new Promise<number>((resolve,reject)=>onValue(ref(db,'.info/serverTimeOffset'),s=>resolve(Number(s.val()??0)),reject,{onlyOnce:true}));
  if(!Number.isFinite(offset)||Math.abs(offset)>600000)throw Error('Không xác minh được giờ máy chủ.');
  return Date.now()+offset;
}
export async function callSparkCellEdit(request:CellEditEnvelope,database:Database):Promise<CellEditAnswer>{
  let operations=inFlight.get(database);
  if(!operations){operations=new Map();inFlight.set(database,operations);}
  const input=JSON.stringify(request),pending=operations.get(request.operationId);
  if(pending){
    if(pending.input!==input)throw Error('Mã thao tác đang xử lý với nội dung khác.');
    return pending.result;
  }
  const result=performSparkCellEdit(request,database).then(async answer=>{
    if(import.meta.env.MODE==='pages-test'||import.meta.env.MODE==='test'){
      const {maybeLoseSparkCellCallerAck}=await import('./spark-cell-ack-test');
      maybeLoseSparkCellCallerAck(database,request.action,answer.status);
    }
    return answer;
  }).finally(()=>operations!.delete(request.operationId));
  operations.set(request.operationId,{input,result});
  return result;
}
async function performSparkCellEdit(request:CellEditEnvelope,database:Database):Promise<CellEditAnswer>{
  const session=await sparkSession(database),db=session.database;
  const id=request.recordId;
  if(!/^[A-Za-z0-9_:-]{1,200}$/.test(id)||!/^[0-9a-f-]{36}$/i.test(request.operationId))throw Error('Mã thao tác hoặc hồ sơ không hợp lệ.');
  const generation=request.generation;
  async function assertEpoch(){
    const active=(await get(ref(db,'hdnd/datasetV2/active'))).val();
    const changed=request.scope==='v2'
      ?!generation||!active||(['generationId','operationId','revision','rowCount','digest'] as const).some(k=>active[k]!==generation[k])
      :active!==null;
    if(changed)throw Error('Thế hệ dữ liệu đã thay đổi.');
  }
  // The live generation fence and server clock are independent reads.
  // Run them together to shorten the first editor's network wait without
  // weakening either check or writing any unverified lease.
  const [now]=await Promise.all([serverNow(db),assertEpoch()]);
  const rowPath=generation?`hdnd/datasetV2/generations/${generation.generationId}/items/${id}`:`hdnd/items/${id}`;
  const leaseRoot=generation?`hdnd/datasetV2/leases/${generation.generationId}/${id}`:`hdnd/editLocks/${id}`;
  const field=request.field;
  if(request.action==='acquire'||request.action==='renew'||request.action==='release'){
    if(!field||!EDITABLE_FIELDS.includes(field))throw Error('Trường sửa không hợp lệ.');
    if(request.action==='acquire'&&(!request.kind||!Object.hasOwn(MAX_EDIT_MS,request.kind)))throw Error('Loại khóa không hợp lệ.');
    const location=ref(db,leaseRoot+'/'+field);
    const release=await holdValue(db,leaseRoot+'/'+field);
    let result;
    try{result=await runTransaction(location,(raw:CellLease|null)=>{
      if(raw?.lastOperationId===request.operationId&&raw.uid===session.uid)return undefined;
      if(request.action==='acquire'){
        if(raw&&raw.expiresAt>now)return undefined;
        return {uid:session.uid,session:crypto.randomUUID(),token:request.operationId,
          lastOperationId:request.operationId,revision:(raw?.revision??0)+1,kind:request.kind!,
          acquiredAt:now,expiresAt:Math.min(now+TTL,now+MAX_EDIT_MS[request.kind!])};
      }
      if(!raw||raw.uid!==session.uid||raw.token!==request.token||raw.expiresAt<=now)return undefined;
      return {...raw,revision:raw.revision+1,lastOperationId:request.operationId,
        expiresAt:request.action==='release'?0:Math.min(now+TTL,raw.acquiredAt+MAX_EDIT_MS[raw.kind])};
    },{applyLocally:false});}catch(error){
      if(String(error).includes('permission_denied'))throw Error('Quyền, khóa, generation hoặc freeze đã đổi trước khi máy chủ xác nhận.');
      throw error;
    }finally{release();}
    // A committed transaction resolves only after the server accepted it;
    // its returned snapshot is already authoritative. Avoid an additional
    // round-trip on every picker open; retain readback for ambiguous retries.
    const stored=(result.committed?result.snapshot.val():(await get(location)).val()) as CellLease|null;
    if(!stored||stored.uid!==session.uid||stored.lastOperationId!==request.operationId||(!result.committed&&stored.token!==request.token&&stored.token!==request.operationId))
      throw Error(stored&&stored.expiresAt>now?'Ô đang được phiên khác giữ khóa.':'Khóa đã hết hạn hoặc chưa xác nhận.');
    await assertEpoch();
    return {status:request.action==='acquire'?'acquired':request.action==='release'?'released':'renewed',lease:stored};
  }
  const location=ref(db,rowPath);
  const before=(await get(location)).val();
  if(request.action==='resolve')return {status:before?.operationId===request.operationId?'committed':Object.values(before?.history??{}).some((e:any)=>e.operationId===request.operationId)?'committed-historical':'unknown',row:before?.operationId===request.operationId?before:undefined,operationId:request.operationId};
  const patch=request.patch;
  if(!patch||patch.recordId!==id||patch.operationId!==request.operationId)throw Error('Nháp sửa không hợp lệ.');
  const issue=validateChanges(patch.changes);
  if(issue)throw Error(issue);
  const fields=Object.keys(patch.changes) as (keyof typeof patch.changes)[];
  if(!fields.length||fields.some(f=>!Object.hasOwn(patch.baseValues,f)||!request.leases?.[f]))throw Error('Thiếu giá trị gốc hoặc khóa ô.');
  if(fields.includes('partyLevel')&&!PARTY_LEVELS.has(String(patch.changes.partyLevel)))throw Error('Cấp trình không thuộc danh mục.');
  if(fields.includes('progressParty')&&!PARTY_STATUSES.has(String(patch.changes.progressParty)))throw Error('Tiến độ Thành ủy không thuộc danh mục.');
  if(fields.includes('partyLevel')&&fields.includes('progressParty'))throw Error('Chỉ gửi cấp trình; tiến độ phụ thuộc do giao dịch quyết định.');
  if(fields.includes('progressParty')&&patch.changes.progressParty==='Không phải trình')
    throw Error('Không được chọn “Không phải trình” trực tiếp. Chỉ đổi Cấp trình sang “Không”; máy chủ sẽ cập nhật tiến độ cùng giao dịch.');
  if(before?.operationId===request.operationId&&fields.every(f=>before[f]===patch.changes[f]))
    return {status:'committed',row:before,operationId:request.operationId};
  // get() can return data without populating the transaction cache. Hold a
  // listener until CAS completes, so cold null never aborts a valid row save.
  const release=await holdValue(db,rowPath);
  let result;
  try{result=await runTransaction(location,(raw:any)=>{
    if(!raw||raw.operationId===request.operationId)return undefined;
    if(fields.some(f=>raw[f]!==patch.baseValues[f])||violatesProgressBuildWritePolicy(raw,patch.changes))return undefined;
    const requested={...patch.changes};
    if(fields.includes('partyLevel')&&raw.partyLevel!==requested.partyLevel){
      if(requested.partyLevel==='Không')requested.progressParty='Không phải trình';
      else if(isNoParty(raw.partyLevel))requested.progressParty='Sở chưa trình';
    }
    if(fields.includes('progressParty')&&(isNoParty(raw.partyLevel)||requested.progressParty==='Không phải trình'))return undefined;
    const changed=(Object.keys(requested) as typeof fields).filter(f=>raw[f]!==requested[f]);
    if(!changed.length)return undefined;
    const revision=raw.revision+1,at=serverTimestamp();
    return {...raw,...requested,revision,operationId:request.operationId,updatedAt:at,updatedBy:session.uid,
      editProofs:{...(raw.editProofs??{}),...Object.fromEntries(fields.filter(f=>changed.includes(f)).map(f=>[f,request.leases![f].token]))},
      history:{...(raw.history??{}),[String(revision%50)]:{operationId:request.operationId,recordId:id,at,actor:session.uid,
        changes:Object.fromEntries(changed.map(f=>[f,requested[f]])),oldValues:Object.fromEntries(changed.map(f=>[f,raw[f]]))}}};
  },{applyLocally:false});}finally{release();}
  const row=result.committed?result.snapshot.val():(await get(location)).val();
  if(!row||row.operationId!==request.operationId||fields.some(f=>row[f]!==patch.changes[f])){
    const changed=fields.some(f=>row&&row[f]!==patch.baseValues[f]);
    throw Error(result.committed?'Chưa xác minh bản ghi sau lưu.':
      changed?'Giá trị ô trên Firebase đã thay đổi; cần đọc lại dữ liệu trước khi sửa.':
      'Máy chủ chưa chấp nhận giao dịch; có thể quyền hoặc khóa ô đã thay đổi. Giữ bản nháp để đối chiếu.');
  }
  await assertEpoch();
  return {status:'committed',operationId:request.operationId,row};
}
