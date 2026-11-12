/** Public browser CLIENT for the separately approved admin Worker.
 * No privileged Firebase credentials or database root write methods here.
 */
import {getIdToken,type User} from 'firebase/auth';
import type {Item} from '../../shared/types';
import type {Database} from 'firebase/database';
import {activeBackupScope} from './admin-backup-service';
import {inspectBackupJson} from './admin-backup-format';
import type {ActiveDatasetPointer} from './dataset-replacement-integrity';
import {firebaseAdmin} from './firebase-repository';
export type MaintenanceAction='clear'|'replace'|'restore';
export type MaintenanceStatus='prepared'|'committed-active'|'committed-historical'|'not-found'|'unknown';
export type PreparedMaintenance={status:'prepared';action:MaintenanceAction;operationId:string;
  oldCount:number;newCount:number;confirmation:string;expiresAt:number;
  expected:ActiveDatasetPointer};
export type CommittedMaintenance={status:'committed'|'already-committed';operationId:string;newCount:number;
  from?:string;to?:string};
export type MaintenanceOperationView={status:MaintenanceStatus;operationId:string;
  rowCount?:number;oldCount?:number;newCount?:number;action?:MaintenanceAction};
export const maintenanceApiConfigured=():boolean=>{
  try{return !!maintenanceApiUrl();}catch{return false;}
};
export function maintenanceApiUrl():string{
  const configured=String(import.meta.env.VITE_MAINTENANCE_API_URL??'').trim();
  if(!configured)return '';
  const url=new URL(configured);
  if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'&&url.pathname!=='')
    throw Error('Địa chỉ dịch vụ quản trị online không hợp lệ.');
  if(!/^[-a-z0-9]+\.[-a-z0-9]+\.workers\.dev$/i.test(url.hostname)&&
    url.hostname!=='admin.hophdnd.example')
    throw Error('Chưa phê duyệt tên miền dịch vụ quản trị online.');
  return url.origin;
}
const idPattern=/^maint_[A-Za-z0-9_-]{16,72}$/;
function guard(user:User|null):User{
  if(!user||!firebaseAdmin(user)||user.isAnonymous)
    throw Error('Chỉ quản trị viên Google đã xác minh được thao tác.');
  return user;
}
async function invoke<T>(user:User|null,path:string,options:{method?:'POST'|'GET';body?:unknown}={}):Promise<T>{
  const principal=guard(user);
  const api=maintenanceApiUrl();
  if(!api)throw Error('Dịch vụ quản trị trực tuyến chưa được cấu hình.');
  const token=await getIdToken(principal,true);
  let response:Response;
  try{response=await fetch(api+path,{
    method:options.method??'GET',mode:'cors',cache:'no-store',credentials:'omit',
    headers:{Authorization:'Bearer '+token,...(options.body===undefined?{}:{'Content-Type':'application/json'})},
    ...(options.body===undefined?{}:{body:JSON.stringify(options.body)}),
  });}catch{throw Error('Không nhận được phản hồi máy chủ. Trạng thái ghi có thể chưa rõ: hãy tra cứu mã thao tác, không tự tạo mã khác.');}
  let payload:unknown;
  try{payload=await response.json();}catch{throw Error('Phản hồi dịch vụ không đầy đủ. Kiểm tra trạng thái thao tác trước khi làm lại.');}
  if(!response.ok){
    const error=payload as {error?:unknown}|null;
    throw Error('Dịch vụ từ chối ('+response.status+'): '+String(error?.error??'MAINTENANCE_UNKNOWN').slice(0,130));
  }
  if(!payload||typeof payload!=='object')throw Error('Phản hồi dịch vụ không hợp lệ.');
  return payload as T;
}
export async function exportOnlineAdminBackup(
  user:User|null,database:Database,expectedActive:ActiveDatasetPointer|null
):Promise<{name:string;sha256:string;generationId:string}>{
  if(!expectedActive)throw Error('Chưa có con trỏ thế hệ V2 hợp lệ để sao lưu online.');
  const envelope=await invoke<unknown>(user,'/v1/archive');
  const inspected=await inspectBackupJson(JSON.stringify(envelope),activeBackupScope(database));
  const {serverSeal,payload,sha256}=inspected.envelope;
  if(serverSeal?.algorithm!=='HMAC-SHA256'||serverSeal.keyId!=='v1'||
    !/^[A-Za-z0-9_-]{43}$/.test(serverSeal.signature))
    throw Error('Backup không có chữ ký máy chủ đúng định dạng.');
  const v2=payload.nodes['hdnd/datasetV2'] as {active?:ActiveDatasetPointer}|null;
  const pointer=v2?.active;
  if(!pointer||['generationId','operationId','revision','rowCount','digest'].some(
    key=>pointer[key as keyof ActiveDatasetPointer]!==expectedActive[key as keyof ActiveDatasetPointer]))
    throw Error('Thế hệ đã đổi khi tải backup; đóng băng lại và tạo bản sao mới.');
  const filename='HopHDND-backup-signed-'+payload.createdAt.replace(/[:.]/g,'-')+'.json';
  const blob=new Blob([JSON.stringify(envelope,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=filename;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  return {name:filename,sha256,generationId:pointer.generationId};
}
export async function prepareOnlineMaintenance(user:User|null,parameters:{
  action:MaintenanceAction;operationId:string;expected:ActiveDatasetPointer;
  rows?:readonly Item[];sourceName?:string;archive?:unknown;
}):Promise<PreparedMaintenance>{
  if(!idPattern.test(parameters.operationId))throw Error('Mã thao tác không hợp lệ.');
  const body=parameters.action==='replace'
    ?{action:'replace',operationId:parameters.operationId,expected:parameters.expected,
      rows:parameters.rows,sourceName:parameters.sourceName}
    :parameters.action==='restore'
      ?{action:'restore',operationId:parameters.operationId,expected:parameters.expected,archive:parameters.archive}
      :{action:'clear',operationId:parameters.operationId,expected:parameters.expected};
  const result=await invoke<PreparedMaintenance>(user,'/v1/prepare',{method:'POST',body});
  if(result.status!=='prepared'||result.operationId!==parameters.operationId||
    !['clear','replace','restore'].includes(result.action)||
    typeof result.confirmation!=='string')
    throw Error('Máy chủ chưa ACK chuẩn bị; phải tra cứu trạng thái bằng mã thao tác.');
  return result;
}
export async function commitOnlineMaintenance(user:User|null,operationId:string,
  confirmation:string):Promise<CommittedMaintenance>{
  if(!idPattern.test(operationId))throw Error('Mã thao tác không hợp lệ.');
  const result=await invoke<CommittedMaintenance>(user,'/v1/commit',{
    method:'POST',body:{operationId,confirmation}});
  if(result.operationId!==operationId||!['committed','already-committed'].includes(result.status))
    throw Error('Phản hồi commit chưa được xác nhận. Tra cứu mã thao tác trước khi thử lại.');
  return result;
}
export async function statusOnlineMaintenance(user:User|null,operationId:string):Promise<MaintenanceOperationView>{
  if(!idPattern.test(operationId))throw Error('Mã thao tác không hợp lệ.');
  const result=await invoke<MaintenanceOperationView>(user,
    '/v1/status?operationId='+encodeURIComponent(operationId));
  if(result.operationId!==operationId||
    !['prepared','committed-active','committed-historical','not-found','unknown'].includes(result.status))
    throw Error('Không xác minh được trạng thái mã thao tác.');
  return result;
}
