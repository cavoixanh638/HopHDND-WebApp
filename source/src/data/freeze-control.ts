import {get,onValue,ref,runTransaction,serverTimestamp,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import {firebaseAdmin} from './firebase-repository';

export type FreezeMode='OPEN'|'DRAINING'|'FROZEN';
export type FreezeControl={mode:FreezeMode;revision:number;epoch:number;actor:string;changedAt:number;deadline:number;closedAt:number};
export const FREEZE_PATH='hdnd/freezeControl';
export const initialFreeze:FreezeControl={mode:'OPEN',revision:0,epoch:0,actor:'',changedAt:0,deadline:0,closedAt:0};
export const parseFreeze=(input:unknown):FreezeControl=>{
  if(input==null)return initialFreeze;
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Trạng thái chốt dữ liệu không hợp lệ.');
  const x=input as FreezeControl;
  if(!['OPEN','DRAINING','FROZEN'].includes(x.mode)||!Number.isSafeInteger(x.revision)||
    x.revision<1||!Number.isSafeInteger(x.epoch)||x.epoch<0||typeof x.actor!=='string'||
    ![x.changedAt,x.deadline,x.closedAt].every(t=>Number.isFinite(t)&&t>=0))
    throw new Error('Trạng thái chốt dữ liệu không hợp lệ.');
  return x;
};
export const canBeginEdit=(freeze:FreezeControl)=>freeze.mode==='OPEN';
export const canCompleteExistingEdit=(freeze:FreezeControl,acquiredAt:number)=>
  freeze.mode==='OPEN'||(freeze.mode==='DRAINING'&&acquiredAt<freeze.changedAt);

const authorized=(user:User|null)=>firebaseAdmin(user);
export async function setFreezeMode(database:Database,user:User|null,expected:FreezeControl,
  next:'DRAINING'|'FROZEN'|'OPEN',force=false):Promise<FreezeControl>{
  if(!authorized(user))throw new Error('Chỉ tài khoản quản trị xác thực được chốt dữ liệu.');
  const transitions:Record<FreezeMode,FreezeMode[]>={OPEN:['DRAINING','FROZEN'],DRAINING:['FROZEN','OPEN'],FROZEN:['OPEN']};
  if(!transitions[expected.mode].includes(next))throw new Error('Chuyển trạng thái chốt không hợp lệ.');
  if(next==='FROZEN'&&expected.mode==='DRAINING'&&!force){
    const count=await activeEditLeaseCount(database);
    if(count>0)throw new Error(`Còn ${count} ô đang sửa. Chờ lưu xác nhận hoặc dùng Đóng băng ngay.`);
  }
  const location=ref(database,FREEZE_PATH);
  await get(location); // obtain server revision before running the CAS
  const x=await runTransaction(location,raw=>{
    let current:FreezeControl;
    try{
      // RTDB can supply null from its cold local cache before retrying with
      // server data. The optimistic candidate MUST NOT delete control.
      current=raw===null&&expected.revision>0?expected:parseFreeze(raw);
    }catch{return undefined;}
    if(current.revision!==expected.revision||current.mode!==expected.mode||current.epoch!==expected.epoch)return undefined;
    return {mode:next,revision:expected.revision+1,
      epoch:expected.epoch+(expected.mode==='OPEN'&&next!=='OPEN'?1:0),
      actor:user!.uid,changedAt:serverTimestamp(),
      // Relative deadline is only advisory UX; final freeze relies on a
      // server-acknowledged control transaction, never on client countdown.
      deadline:next==='DRAINING'?Date.now()+50000:0,
      closedAt:next==='FROZEN'?serverTimestamp():0};
  },{applyLocally:false});
  if(!x.committed)throw new Error('Một admin khác đã đổi chế độ; tải lại trước khi thao tác.');
  const confirmed=parseFreeze(x.snapshot.val());
  if(confirmed.mode!==next||confirmed.revision!==expected.revision+1)
    throw new Error('Firebase chưa xác nhận trạng thái chốt.');
  return confirmed;
}
export async function activeEditLeaseCount(database:Database):Promise<number>{
  const raw=(await get(ref(database,'hdnd/editLocks'))).val();
  if(!raw||typeof raw!=='object')return 0;
  const offset=await new Promise<number>((resolve,reject)=>{
    onValue(ref(database,'.info/serverTimeOffset'),snap=>resolve(Number(snap.val()??0)),
      reject,{onlyOnce:true});
  });
  const now=Date.now()+offset;
  return Object.values(raw as Record<string,Record<string,{expiresAt:number}>>).reduce(
    (sum,fields)=>sum+Object.values(fields??{}).filter(lock=>Number(lock?.expiresAt)>now).length,0);
}
export async function readFreeze(database:Database):Promise<FreezeControl>{
  return parseFreeze((await get(ref(database,FREEZE_PATH))).val());
}
export function watchFreeze(database:Database,next:(state:FreezeControl)=>void,
  fail:(error:Error)=>void):()=>void{
  return onValue(ref(database,FREEZE_PATH),snapshot=>{
    try{next(parseFreeze(snapshot.val()));}catch(e){fail(e as Error);}
  },fail);
}
