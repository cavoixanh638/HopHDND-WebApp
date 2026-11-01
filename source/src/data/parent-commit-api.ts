import {getIdToken,type User} from 'firebase/auth';
import type {Database} from 'firebase/database';
import type {ActiveDatasetPointer} from './dataset-replacement-integrity';

export type ParentCommitAction='activate'|'replace'|'restore';
export interface ParentCommitRequest {
  action:ParentCommitAction;
  operationId:string;
  confirmation:string;
  expected?:ActiveDatasetPointer;
  backupOperationId?:string;
}
export type ParentCommitResult={status:'committed'|'already-committed'|'unknown';operationId:string};

/**
 * No browser receives parentCasService or scoped database credentials.
 * Production needs a separately reviewed same-origin endpoint configuration.
 * No endpoint => FAIL CLOSED, never fall back to a direct parent RTDB write.
 */
function endpoint(database:Database):string {
  const configured=String(import.meta.env.VITE_PARENT_COMMIT_ENDPOINT??'').trim();
  const emulator=database.app.options.projectId?.startsWith('demo-hdnd')&&
    (import.meta.env.MODE==='test'||import.meta.env.MODE==='pages-test');
  if(emulator){
    if(typeof window!=='undefined'&&!['localhost','127.0.0.1'].includes(window.location.hostname))
      throw Error('Parent commit thử nghiệm chỉ dùng tại localhost.');
    return configured||'http://127.0.0.1:8787/parentDatasetCommit';
  }
  if(!configured||!configured.startsWith('https://'))
    throw Error('Dịch vụ commit V2 chưa được cấu hình và duyệt; không được ghi bằng SDK trực tiếp.');
  return configured;
}
export async function requestParentDatasetCommit(database:Database,user:User|null,
  request:ParentCommitRequest):Promise<ParentCommitResult>{
  if(!user)throw Error('Chưa xác thực Firebase.');
  const operationId=request.operationId;
  if(!/^[A-Za-z0-9_-]{12,80}$/.test(operationId))throw Error('operationId không hợp lệ.');
  const target=endpoint(database);
  const token=await getIdToken(user);
  let response:Response;
  try{
    response=await fetch(target,{
      method:'POST',cache:'no-store',mode:'cors',
      headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(request),
    });
  }catch{return {status:'unknown',operationId};}
  let payload:unknown;
  try{payload=await response.json();}catch{return {status:'unknown',operationId};}
  if(!response.ok){
    if(response.status===401||response.status===403||response.status===409){
      const server=payload as {error?:string;message?:string}|null;
      throw Error('Dịch vụ từ chối commit: '+String(server?.error??'REJECTED'));
    }
    return {status:'unknown',operationId};
  }
  if(!payload||typeof payload!=='object'||Array.isArray(payload))return {status:'unknown',operationId};
  const result=payload as {status?:unknown;operationId?:unknown};
  if(result.operationId!==operationId)return {status:'unknown',operationId};
  if(result.status==='committed'||result.status==='already-committed')
    return {status:result.status,operationId};
  return {status:'unknown',operationId};
}