import {getAuth,getIdToken,type User} from 'firebase/auth';
import {onValue,ref,type Database} from 'firebase/database';
import {firebaseConfig} from './firebase-config';

export type LegacyMaintenanceContext={mode:'OPEN'|'DRAINING'|'FROZEN';epoch:number;revision:number};
const context=(raw:unknown):LegacyMaintenanceContext=>{
  if(raw===null)return {mode:'OPEN',epoch:0,revision:0};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Không xác minh được phiên dữ liệu Firebase.');
  const value=raw as LegacyMaintenanceContext;
  if(!['OPEN','DRAINING','FROZEN'].includes(value.mode)||
    !Number.isSafeInteger(value.epoch)||value.epoch<0||
    !Number.isSafeInteger(value.revision)||value.revision<1)
    throw Error('Không xác minh được phiên dữ liệu Firebase.');
  return {mode:value.mode,epoch:value.epoch,revision:value.revision};
};
const same=(a:LegacyMaintenanceContext,b:LegacyMaintenanceContext)=>
  a.mode===b.mode&&a.epoch===b.epoch&&a.revision===b.revision;

/** Server-only reads never fall back to cached SDK snapshots. Never label an
 * old cached row with a newer epoch. URLs/tokens stay out of diagnostics. */
function serverReader(database:Database,user:User){
  const auth=getAuth(database.app),options=database.app.options;
  const configured=new URL(options.databaseURL??'');
  const emulator=(import.meta.env.MODE==='pages-test'||import.meta.env.MODE==='test')&&
    options.projectId?.startsWith('demo-')&&auth.emulatorConfig?.host==='127.0.0.1'&&
    auth.emulatorConfig?.port===9099&&configured.protocol==='https:'&&
    /^demo-[a-z0-9-]+[.]firebaseio[.]com$/.test(configured.hostname);
  const production=options.projectId===firebaseConfig.projectId&&
    configured.href===new URL(firebaseConfig.databaseURL).href&&!auth.emulatorConfig;
  if(!emulator&&!production)throw Error('Không xác minh được địa chỉ Firebase cho phiên dữ liệu.');
  const origin=emulator?'http://127.0.0.1:9000':configured.origin;
  return async(path:'hdnd/freezeControl'|'hdnd/items',token:string):Promise<unknown>=>{
    if(auth.currentUser?.uid!==user.uid)throw Error('Tài khoản Firebase đã thay đổi.');
    const url=new URL('/'+path+'.json',origin);
    if(emulator)url.searchParams.set('ns',configured.hostname.split('.')[0]);
    url.searchParams.set('auth',token);
    try{
      const reply=await fetch(url,{method:'GET',cache:'no-store',redirect:'error',
        signal:AbortSignal.timeout(10000)});
      if(!reply.ok)throw Error('server read');
      return await reply.json();
    }catch{
      throw Error('Chưa đọc được phiên dữ liệu từ máy chủ; không dùng bản cache để cấp quyền lưu.');
    }
  };
}
function connected(database:Database):Promise<void>{
  return new Promise((resolve,reject)=>{
    let stop=()=>{},done=false;
    const finish=(cause?:Error)=>{
      if(done)return;done=true;clearTimeout(timer);stop();cause?reject(cause):resolve();
    };
    const timer=setTimeout(()=>finish(Error('Chưa kết nối Firebase; giữ bản nháp để đối chiếu.')),4000);
    stop=onValue(ref(database,'.info/connected'),snap=>{
      if(snap.val()===true)finish();
    },()=>finish(Error('Không xác minh được kết nối Firebase.')));
    if(done)stop();
  });
}
export async function readLegacyMaintenanceRows(database:Database,user:User|null):Promise<{
  value:unknown;context:LegacyMaintenanceContext;
}>{
  if(!user)throw Error('Chưa đăng nhập Firebase.');
  const read=serverReader(database,user);
  await connected(database);
  const token=await getIdToken(user);
  for(let attempt=0;attempt<3;attempt++){
    const before=context(await read('hdnd/freezeControl',token));
    const value=await read('hdnd/items',token);
    const after=context(await read('hdnd/freezeControl',token));
    await connected(database);
    if(getAuth(database.app).currentUser?.uid!==user.uid)throw Error('Tài khoản Firebase đã thay đổi.');
    if(same(before,after))return {value,context:after};
  }
  throw Error('Phiên dữ liệu thay đổi trong khi đọc; giữ bản nháp và đối chiếu lại.');
}

/** A committed row must still belong to the caller's primary epoch when its
 * acknowledgement is handed back. Never resolve a restored old operation as
 * a current save merely because the operationId/value happen to match. */
export async function assertCurrentLegacyMaintenanceEpoch(database:Database,user:User|null,
  expected:number|undefined):Promise<void>{
  if(!user||!Number.isSafeInteger(expected)||Number(expected)<0)
    throw Error('Bản nháp chưa có mốc phiên dữ liệu hợp lệ.');
  const read=serverReader(database,user);
  await connected(database);
  const current=context(await read('hdnd/freezeControl',await getIdToken(user)));
  await connected(database);
  if(getAuth(database.app).currentUser?.uid!==user.uid||
    current.mode!=='OPEN'||current.epoch!==expected)
    throw Error('Phiên dữ liệu đã thay đổi trước khi xác nhận; giữ bản nháp để đối chiếu.');
}
