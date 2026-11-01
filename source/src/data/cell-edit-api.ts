import {getApp} from 'firebase/app';
import {getFunctions,connectFunctionsEmulator,httpsCallable,type Functions} from 'firebase/functions';
import type {Database} from 'firebase/database';
import type {EditableField,Patch} from '../../shared/types';
import type {ActiveDatasetPointer} from './dataset-replacement-integrity';
import type {CellLease,EditorKind} from './cell-edit-leases';

// Gateway-only boundary. Never retry via raw RTDB writes when Functions is absent.
// This file is lazy-loaded only when the user edits a cell.
type Scope='legacy'|'v2';
type Envelope={action:'acquire'|'renew'|'release'|'save'|'resolve';
  scope:Scope;generation?:ActiveDatasetPointer;operationId:string;
  recordId:string;field?:EditableField;kind?:EditorKind;token?:string;
  secret?:string;originalAction?:string;patch?:Patch;
  leases?:Record<string,{token:string;secret:string}>};
type Answer={status:string;lease?:CellLease;row?:unknown;operationId?:string};

const emulatorConnected=new WeakSet<Functions>();
export class CellServiceUnavailableError extends Error{
  constructor(message='Chưa kết nối được dịch vụ sửa ô. Bản nháp vẫn được giữ; không dùng đường ghi cũ.'){
    super(message);this.name='CellServiceUnavailableError';
  }
}
export async function callCellEdit(message:Envelope,database?:Database):Promise<Answer>{
  try{
    const functions=getFunctions(database?.app??getApp('hdnd-pages'),'asia-southeast1');
    const pagesEmulator=import.meta.env.MODE==='pages-test'&&
      typeof location!=='undefined'&&['localhost','127.0.0.1'].includes(location.hostname);
    // Only an explicit demo Auth+RTDB+Functions Emulator process may route
    // real Vitest client SDK calls to the local callable. Never infer from
    // body-provided UID/service claims; verification stays server-side.
    const nodeEmulator=import.meta.env.MODE==='test'&&
      (database?.app.options.projectId??'').startsWith('demo-')&&
      typeof process!=='undefined'&&
      process.env.FIREBASE_AUTH_EMULATOR_HOST==='127.0.0.1:9099'&&
      process.env.FIREBASE_FUNCTIONS_EMULATOR_HOST==='127.0.0.1:5001';
    if(import.meta.env.MODE==='pages-test'&&!pagesEmulator)
      throw new CellServiceUnavailableError('Emulator sửa ô chỉ được dùng trên localhost.');
    if((pagesEmulator||nodeEmulator)&&!emulatorConnected.has(functions)){
      connectFunctionsEmulator(functions,'127.0.0.1',5001);
      emulatorConnected.add(functions);
    }
    const result=await httpsCallable<Envelope,Answer>(functions,'cellEdit',{timeout:25000})(message);
    if(!result.data||typeof result.data.status!=='string')throw Error('Phản hồi dịch vụ sửa ô không hợp lệ.');
    return result.data;
  }catch(error){
    const code=String((error as {code?:string})?.code??'');
    const message=error instanceof Error?error.message:'Không xác nhận được máy chủ.';
    if(/unavailable|deadline-exceeded|internal|cancelled|network|not-found/.test(code))
      throw new CellServiceUnavailableError('Dịch vụ sửa ô chưa xác nhận yêu cầu ('+code+'). Giữ nháp và mã thao tác; không tự ghi lại.');
    if(error instanceof CellServiceUnavailableError)throw error;
    throw new Error('Chưa hoàn tất sửa ô: '+message+'. Bản nháp được giữ trên máy.');
  }
}
export const scopeOf=(pointer?:ActiveDatasetPointer)=>pointer?'v2' as Scope:'legacy' as Scope;
export function newPrivateCellSecret():string{
  const value=new Uint8Array(32);
  crypto.getRandomValues(value);
  return Array.from(value,byte=>byte.toString(16).padStart(2,'0')).join('');
}
