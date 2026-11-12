import {get,onValue,ref,runTransaction,serverTimestamp,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {ActiveDatasetPointer} from './dataset-replacement-integrity';
import {firebaseAdmin,sameDatasetEpoch} from './firebase-repository';

export type FreezeMode='OPEN'|'DRAINING'|'FROZEN';
export type FreezeCloseKind='orderly'|'forced';
export type FreezeControl={
  mode:FreezeMode;revision:number;epoch:number;actor:string;
  changedAt:number;deadline:number;closedAt:number;
  /** Present only when DRAINING/FROZEN was committed against active V2. */
  datasetV2?:ActiveDatasetPointer;
  /** Present only on a V2 FROZEN close. Legacy payload remains unchanged. */
  closeKind?:FreezeCloseKind;
};
export interface ActiveLeaseSnapshot {
  count:number;source:'legacy'|'v2';active:ActiveDatasetPointer|null;asOfServerTime:number;
}
export type FreezeReceipt={
  epoch:number;rows:number;sha256:string;actor:string;frozenAt:number;recordedAt:number;
  datasetV2?:ActiveDatasetPointer;closeKind?:FreezeCloseKind;
};
export const FREEZE_PATH='hdnd/freezeControl';
export const initialFreeze:FreezeControl={mode:'OPEN',revision:0,epoch:0,actor:'',changedAt:0,deadline:0,closedAt:0};

export function parseActiveDatasetPointer(value:unknown):ActiveDatasetPointer|null{
  if(value===null)return null;
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new Error('Không xác minh được con trỏ thế hệ Firebase.');
  const x=value as Partial<ActiveDatasetPointer>;
  if(typeof x.operationId!=='string'||!/^[A-Za-z0-9_-]{12,80}$/.test(x.operationId)||
    x.generationId!=='gen_'+x.operationId||
    !Number.isSafeInteger(x.revision)||Number(x.revision)<1||
    !Number.isSafeInteger(x.rowCount)||Number(x.rowCount)<0||Number(x.rowCount)>1000||
    typeof x.digest!=='string'||!/^[a-f0-9]{64}$/.test(x.digest))
    throw new Error('Con trỏ thế hệ Firebase sai cấu trúc; không được coi là legacy.');
  return x as ActiveDatasetPointer;
}
export function sameFreezeDataset(a:ActiveDatasetPointer|null,b:ActiveDatasetPointer|null):boolean{
  return a===null?b===null:b!==null&&sameDatasetEpoch(b,a);
}
export const parseFreeze=(input:unknown):FreezeControl=>{
  if(input==null)return initialFreeze;
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Trạng thái chốt dữ liệu không hợp lệ.');
  const x=input as FreezeControl;
  if(!['OPEN','DRAINING','FROZEN'].includes(x.mode)||!Number.isSafeInteger(x.revision)||
    x.revision<1||!Number.isSafeInteger(x.epoch)||x.epoch<0||typeof x.actor!=='string'||
    ![x.changedAt,x.deadline,x.closedAt].every(t=>Number.isFinite(t)&&t>=0))
    throw new Error('Trạng thái chốt dữ liệu không hợp lệ.');
  if(x.datasetV2!==undefined){
    if(!parseActiveDatasetPointer(x.datasetV2)||
      (x.mode==='FROZEN'?!['orderly','forced'].includes(x.closeKind??''):x.closeKind!==undefined)||
      x.mode==='OPEN')
      throw new Error('Dấu vết thế hệ tại mốc chốt không hợp lệ.');
  }else if(x.closeKind!==undefined)throw new Error('Biên nhận kiểu chốt thiếu thế hệ V2.');
  return x;
};
export const canBeginEdit=(freeze:FreezeControl)=>freeze.mode==='OPEN';
export const canCompleteExistingEdit=(freeze:FreezeControl,acquiredAt:number)=>
  freeze.mode==='OPEN'||(freeze.mode==='DRAINING'&&acquiredAt<freeze.changedAt);

const authorized=(user:User|null)=>firebaseAdmin(user);
const connected=async(database:Database):Promise<void>=>{
  await new Promise<void>((resolve,reject)=>{
    let done=false;
    let unsubscribe=()=>{};
    const finish=(error?:Error)=>{
      if(done)return;
      done=true;clearTimeout(timer);unsubscribe();
      if(error)reject(error);else resolve();
    };
    const timer=setTimeout(()=>finish(new Error('Không xác nhận được kết nối Firebase để kiểm tra generation.')),4000);
    unsubscribe=onValue(ref(database,'.info/connected'),snap=>{
      if(snap.val()===true)finish();
    },()=>finish(new Error('Không đọc được trạng thái kết nối Firebase.')));
    if(done)unsubscribe();
  });
};
/** RTDB get() may fall back to a cached value when offline; fence both sides. */
export async function readActiveDatasetPointer(database:Database):Promise<ActiveDatasetPointer|null>{
  await connected(database);
  const raw=(await get(ref(database,'hdnd/datasetV2/active'))).val();
  await connected(database);
  return parseActiveDatasetPointer(raw);
}
const serverNow=async(database:Database)=>{
  const offset=await new Promise<number>((resolve,reject)=>{
    onValue(ref(database,'.info/serverTimeOffset'),snap=>resolve(Number(snap.val())),
      reject,{onlyOnce:true});
  });
  if(!Number.isFinite(offset)||Math.abs(offset)>600000)
    throw new Error('Không xác nhận được đồng hồ Firebase; không thể đếm khóa.');
  return Date.now()+offset;
};
const countLeases=(value:unknown,now:number):number=>{
  if(value===null)return 0;
  if(!value||typeof value!=='object'||Array.isArray(value))
    throw new Error('Dữ liệu khóa ô không hợp lệ; không thể coi là 0.');
  let count=0;
  for(const fields of Object.values(value as Record<string,unknown>)){
    if(!fields||typeof fields!=='object'||Array.isArray(fields))
      throw new Error('Nhánh khóa ô không hợp lệ.');
    for(const lease of Object.values(fields as Record<string,unknown>)){
      if(!lease||typeof lease!=='object'||Array.isArray(lease)||
        !Number.isFinite((lease as {expiresAt?:number}).expiresAt))
        throw new Error('Khóa ô thiếu thời hạn máy chủ; không thể coi là hết khóa.');
      if(Number((lease as {expiresAt:number}).expiresAt)>now)count++;
    }
  }
  return count;
};
/** Snapshot is valid only for one fully checked active pointer. */
export async function readActiveLeaseSnapshot(database:Database):Promise<ActiveLeaseSnapshot>{
  const active=await readActiveDatasetPointer(database);
  const path=active?'hdnd/datasetV2/leases/'+active.generationId:'hdnd/editLocks';
  const raw=(await get(ref(database,path))).val();
  const now=await serverNow(database);
  const latest=await readActiveDatasetPointer(database);
  if(!sameFreezeDataset(active,latest))
    throw new Error('Generation thay đổi trong khi đếm khóa; không được dùng số đếm lỗi thời.');
  return {count:countLeases(raw,now),source:active?'v2':'legacy',active,asOfServerTime:now};
}
export async function activeEditLeaseCount(database:Database):Promise<number>{
  return (await readActiveLeaseSnapshot(database)).count;
}
export async function setFreezeMode(database:Database,user:User|null,expected:FreezeControl,
  next:'DRAINING'|'FROZEN'|'OPEN',force=false):Promise<FreezeControl>{
  if(!authorized(user))throw new Error('Chỉ tài khoản quản trị xác thực được chốt dữ liệu.');
  const transitions:Record<FreezeMode,FreezeMode[]>={OPEN:['DRAINING','FROZEN'],DRAINING:['FROZEN','OPEN'],FROZEN:['OPEN']};
  if(!transitions[expected.mode].includes(next))throw new Error('Chuyển trạng thái chốt không hợp lệ.');
  // An emergency intentionally does NOT wait for outstanding leases. The normal
  // DRAINING path must not confuse a failed read or a new generation with zero.
  let pointer:ActiveDatasetPointer|null=null;
  if(next!=='OPEN'){
    if(next==='FROZEN'&&expected.mode==='DRAINING'&&!force){
      const snapshot=await readActiveLeaseSnapshot(database);
      if(snapshot.count>0)
        throw new Error('Còn '+snapshot.count+' ô đang sửa. Chờ lưu xác nhận hoặc dùng Đóng băng ngay.');
      pointer=snapshot.active;
      if(!sameFreezeDataset(expected.datasetV2??null,pointer))
        throw new Error('Generation đã thay đổi từ khi bắt đầu DRAINING; không được chốt thông thường.');
    }else pointer=await readActiveDatasetPointer(database);
    if(pointer&&next==='FROZEN'&&expected.mode==='OPEN'&&!force)
      throw new Error('Đóng băng trực tiếp từ OPEN là chốt cưỡng bức; phải xác nhận force.');
  }
  const location=ref(database,FREEZE_PATH);
  await get(location); // warm the CAS cache, never treat cold null as a deletion
  const x=await runTransaction(location,raw=>{
    let current:FreezeControl;
    try{
      current=raw===null&&expected.revision>0?expected:parseFreeze(raw);
    }catch{return undefined;}
    if(current.revision!==expected.revision||current.mode!==expected.mode||current.epoch!==expected.epoch)
      return undefined;
    return {
      mode:next,revision:expected.revision+1,
      epoch:expected.epoch+(expected.mode==='OPEN'&&next!=='OPEN'?1:0),
      actor:user!.uid,changedAt:serverTimestamp(),
      deadline:next==='DRAINING'?Date.now()+50000:0,
      closedAt:next==='FROZEN'?serverTimestamp():0,
      ...(pointer&&next!=='OPEN'?{
        datasetV2:pointer,
        ...(next==='FROZEN'?{closeKind:force?'forced' as const:'orderly' as const}:{})
      }:{})
    };
  },{applyLocally:false});
  if(!x.committed)throw new Error('Mốc chốt đã thay đổi hoặc Rules từ chối generation. Tải lại trước khi thao tác.');
  const acknowledged=parseFreeze(x.snapshot.val());
  if(acknowledged.mode!==next||acknowledged.revision!==expected.revision+1||
    !sameFreezeDataset(acknowledged.datasetV2??null,pointer))
    throw new Error('Firebase chưa ACK đúng mốc chốt.');
  // serverTimestamp() in the caller snapshot can differ from the server value.
  // Receipt must use the authoritative freeze record's closedAt/frozenAt.
  const confirmed=await readFreeze(database);
  if(confirmed.mode!==next||confirmed.revision!==expected.revision+1||
    confirmed.epoch!==expected.epoch+(expected.mode==='OPEN'&&next!=='OPEN'?1:0)||
    confirmed.actor!==user!.uid||
    !sameFreezeDataset(confirmed.datasetV2??null,pointer)||
    (pointer&&next==='FROZEN'&&confirmed.closeKind!==(force?'forced':'orderly')))
    throw new Error('Mốc chốt đọc lại từ server không khớp ACK; không cấp biên nhận.');
  if(next!=='OPEN'&&!sameFreezeDataset(await readActiveDatasetPointer(database),pointer))
    throw new Error('Generation đổi sau ACK đóng băng; phải xác minh trạng thái trên server.');
  return confirmed;
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
/** Verify a receipt against the FULL current freeze epoch and active V2 pointer. */
export function freezeReceiptIsCurrent(receipt:FreezeReceipt,freeze:FreezeControl,
  active:ActiveDatasetPointer|null):boolean{
  return freeze.mode==='FROZEN'&&freeze.epoch===receipt.epoch&&
    freeze.closedAt===receipt.frozenAt&&
    sameFreezeDataset(active,freeze.datasetV2??null)&&
    sameFreezeDataset(active,receipt.datasetV2??null)&&
    (!active||receipt.closeKind===freeze.closeKind);
}
export async function createFreezeReceipt(database:Database,user:User|null,
  epoch:number):Promise<FreezeReceipt>{
  if(!authorized(user)||!user)throw new Error('Chỉ quản trị được lập biên nhận chốt.');
  const freeze=await readFreeze(database);
  if(freeze.mode!=='FROZEN'||freeze.epoch!==epoch)
    throw new Error('Mốc chốt đã thay đổi; không tạo biên nhận cũ.');
  const active=await readActiveDatasetPointer(database);
  if(!sameFreezeDataset(active,freeze.datasetV2??null))
    throw new Error('Generation đang hoạt động khác generation đã được đóng băng.');
  const path=active?'hdnd/datasetV2/generations/'+active.generationId+'/items':'hdnd/items';
  const raw=(await get(ref(database,path))).val()??{};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))
    throw new Error('Không đọc được các hồ sơ của thế hệ đang chốt.');
  const rows=raw as Record<string,unknown>;
  const ids=Object.keys(rows).sort();
  if(active&&ids.length!==active.rowCount)
    throw new Error('Số hồ sơ V2 khác manifest; không cấp biên nhận.');
  const canonical=JSON.stringify(ids.map(id=>[id,rows[id]]));
  const bytes=new TextEncoder().encode(canonical);
  const sha=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));
  const sha256=[...sha].map(byte=>byte.toString(16).padStart(2,'0')).join('');
  const finalFreeze=await readFreeze(database);
  const finalPointer=await readActiveDatasetPointer(database);
  if(finalFreeze.mode!=='FROZEN'||finalFreeze.revision!==freeze.revision||
    finalFreeze.epoch!==freeze.epoch||finalFreeze.closedAt!==freeze.closedAt||
    !sameFreezeDataset(active,finalPointer)||
    !sameFreezeDataset(finalFreeze.datasetV2??null,active))
    throw new Error('Mốc chốt/generation đã đổi trong lúc tính biên nhận.');
  const payload={
    epoch,rows:ids.length,sha256,actor:user.uid,
    frozenAt:freeze.closedAt,recordedAt:serverTimestamp(),
    ...(active?{datasetV2:active,closeKind:freeze.closeKind}:{})
  };
  const target=ref(database,'hdnd/freezeReceipts/'+epoch);
  const transaction=await runTransaction(target,current=>current??payload,{applyLocally:false});
  if(!transaction.committed&&transaction.snapshot.val()===null)
    throw new Error('Firebase từ chối lưu biên nhận; không khẳng định đã chốt.');
  const confirmed=(await get(target)).val() as FreezeReceipt|null;
  if(!confirmed||confirmed.epoch!==epoch||confirmed.rows!==ids.length||
    confirmed.sha256!==sha256||confirmed.actor!==user.uid||
    confirmed.frozenAt!==freeze.closedAt||
    !Number.isFinite(confirmed.recordedAt)||
    !sameFreezeDataset(confirmed.datasetV2??null,active)||
    (active&&confirmed.closeKind!==freeze.closeKind))
    throw new Error('Biên nhận server không khớp nguồn/generation; không ghi lại tự động.');
  const postFreeze=await readFreeze(database);
  const postPointer=await readActiveDatasetPointer(database);
  if(postFreeze.revision!==freeze.revision||
    !freezeReceiptIsCurrent(confirmed,postFreeze,postPointer))
    throw new Error('Generation đã đổi sau biên nhận; biên nhận chỉ còn giá trị lịch sử.');
  return confirmed;
}
