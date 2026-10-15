import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, type User } from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, onValue, ref, runTransaction } from 'firebase/database';
import { firebaseConfig } from '../data/firebase-config';
import { firebaseAdmin, mayEdit, type CellPermissions } from '../data/firebase-repository';
import type { ConfigSection } from '../data/shared-config';
import { validateCatalog, type CatalogConfig } from '../data/catalogs';
import { validateReportLayout, type ReportLayout } from '../data/report-preferences';
import { validateItemLayout, type ItemLayout } from '../data/item-preferences';

export interface FirebaseProfile {catalogs:CatalogConfig;reports:ReportLayout[];items:ItemLayout;revision:number}
function profileFrom(raw:unknown):FirebaseProfile|null{
  if(raw==null)return null;
  const value=raw as FirebaseProfile;
  if(!Number.isSafeInteger(value.revision)||value.revision<1)throw new Error('Phiên bản bố trí Firebase không hợp lệ.');
  return {revision:value.revision,catalogs:validateCatalog(value.catalogs),reports:validateReportLayout(value.reports),items:validateItemLayout(value.items)};
}
function initialize(){
  const emulator=import.meta.env.MODE==='pages-test';
  // Test builds cannot address the real project, even when an emulator is absent.
  const config=emulator?{apiKey:'demo-test-key',authDomain:'demo-hdnd.firebaseapp.com',projectId:'demo-hdnd',appId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com'}:firebaseConfig;
  const app=initializeApp(config,'hdnd-pages');
  const auth=getAuth(app),database=getDatabase(app);
  if(emulator){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectDatabaseEmulator(database,'127.0.0.1',9000);}
  return {auth,database,emulator};
}
export function useFirebase(){
  const [services]=useState(initialize);
  const {auth,database}=services;
  const [user,setUser]=useState<User|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[connected,setConnected]=useState(false);
  const [permissions,setPermissions]=useState<CellPermissions>({columns:{}});
  const [profile,setProfile]=useState<FirebaseProfile|null>(null),[busy,setBusy]=useState(false);
  const [profileReady,setProfileReady]=useState(false),[permissionsReady,setPermissionsReady]=useState(false);
  const saving=useRef(false);
  useEffect(()=>{
    let active=true,signing=false;
    const unsubscribe=onAuthStateChanged(auth,next=>{
      if(!active)return;
      setUser(next);setReady(!!next);setProfileReady(false);setPermissionsReady(false);setProfile(null);setPermissions({columns:{}});
      if(!next&&!signing){signing=true;void signInAnonymously(auth).catch(cause=>setError(`Không đăng nhập ẩn danh được: ${cause.message}`)).finally(()=>{signing=false;});}
    },cause=>setError(cause.message));
    return()=>{active=false;unsubscribe();};
  },[auth]);
  useEffect(()=>{
    if(!user)return;
    let active=true;
    const failed=(cause:Error)=>{if(active)setError(`Không đọc được Firebase: ${cause.message}. Kiểm tra Authentication và Database Rules.`);};
    const stop=[onValue(ref(database,'.info/connected'),snap=>{if(active)setConnected(snap.val()===true);}),onValue(ref(database,'hdnd/permissions'),snap=>{if(!active)return;const raw=snap.val();setPermissions({columns:raw?.columns??{},rows:raw?.rows??{},cells:raw?.cells??{}});setPermissionsReady(true);},cause=>{if(active){setPermissionsReady(false);setPermissions({columns:{}});}failed(cause);}),onValue(ref(database,'hdnd/profile'),snap=>{if(!active)return;try{const raw=snap.val();setProfile(raw?profileFrom({...JSON.parse(raw.payload),revision:raw.revision}):null);setProfileReady(true);}catch(cause){setProfileReady(false);failed(cause as Error);}},cause=>{if(active)setProfileReady(false);failed(cause);})];
    return()=>{active=false;stop.forEach(unsubscribe=>unsubscribe());};
  },[user?.uid,database]);
  const admin=firebaseAdmin(user);
  const login=async()=>{setError('');await signInWithPopup(auth,new GoogleAuthProvider());};
  const logout=async()=>{await signOut(auth);};
  const saveProfile=async(section:ConfigSection,value:unknown,expectedRevision=profile?.revision??0)=>{
    if(!firebaseAdmin(auth.currentUser))throw new Error('Chỉ tài khoản Google quản trị được lưu bố trí và danh mục.');
    if(!profileReady)throw new Error('Chưa đọc được cấu hình gốc; không khởi tạo hoặc ghi đè. Đọc lại danh mục và bố trí trước.');
    if(!connected)throw new Error('Đang mất kết nối. Giữ phần sửa và thử lưu khi có mạng.');
    if(saving.current)throw new Error('Đang lưu thiết lập.');
    const base=profile;
    if((base?.revision??0)!==expectedRevision)throw new Error('Danh mục/bố trí đã đổi trong lúc bạn chỉnh. Đóng rồi mở lại để đối chiếu; phần sửa vẫn được giữ.');
    const candidate=section==='all'?{...(value as object),revision:(base?.revision??0)+1}:{...base,[section]:value,revision:(base?.revision??0)+1};
    const valid=profileFrom(candidate);if(!valid)throw new Error('Thiếu bộ cấu hình.');
    saving.current=true;setBusy(true);
    try{const result=await runTransaction(ref(database,'hdnd/profile'),current=>((current?.revision??0)!==(base?.revision??0)?undefined:{revision:valid.revision,payload:JSON.stringify(valid)}),{applyLocally:false});if(!result.committed)throw new Error('Bố trí đã được sửa ở cửa sổ khác. Đọc lại và đối chiếu.');setProfile(valid);}finally{saving.current=false;setBusy(false);}
  };
  const savePermissions=async(next:CellPermissions,expected=permissions)=>{
    if(!firebaseAdmin(auth.currentUser)||!connected||!permissionsReady)throw new Error('Cần quản trị Google, kết nối mạng và quyền gốc để lưu quyền sửa.');
    if(saving.current)throw new Error('Đang lưu thiết lập.');
    const base=JSON.stringify(expected);
    saving.current=true;setBusy(true);
    try{const result=await runTransaction(ref(database,'hdnd/permissions'),current=>JSON.stringify({columns:current?.columns??{},rows:current?.rows??{},cells:current?.cells??{}})!==base?undefined:next,{applyLocally:false});
    if(!result.committed)throw new Error('Quyền sửa đã đổi ở cửa sổ khác. Đóng và mở lại để đối chiếu.');}finally{saving.current=false;setBusy(false);}
  };
  const refresh=async()=>{
    if(!auth.currentUser||!connected){setError('Chưa kết nối Firebase; dữ liệu Sheets vẫn có thể đọc.');return;}
    try{const [p,q]=await Promise.all([get(ref(database,'hdnd/profile')),get(ref(database,'hdnd/permissions'))]);const raw=p.val(),rules=q.val();setProfile(raw?profileFrom({...JSON.parse(raw.payload),revision:raw.revision}):null);setPermissions({columns:rules?.columns??{},rows:rules?.rows??{},cells:rules?.cells??{}});setProfileReady(true);setPermissionsReady(true);setError('');}catch(cause){setProfileReady(false);setPermissionsReady(false);setError((cause as Error).message);}
  };
  return {user,ready,error,connected,permissions,profile,isAdmin:admin,emulator:services.emulator,login,logout,savePermissions,
    canEdit:(id:string,field:Parameters<typeof mayEdit>[2])=>ready&&permissionsReady&&mayEdit(permissions,id,field,admin),
    common:{config:profile,busy,message:error||(!ready?'Đang đăng nhập Firebase để đọc quyền và cấu hình…':!connected?'Mất kết nối Firebase; phần sửa thử vẫn giữ trên máy.':!profileReady?'Đang đọc cấu hình chung từ Firebase…':profile?'Danh mục và bố trí đang dùng chung qua Firebase.':'Chưa có bố trí chung; quản trị có thể lưu bố trí mặc định.'),status:error?'error':profileReady?'ready':'loading',refresh,save:saveProfile}};
}
export type FirebaseController=ReturnType<typeof useFirebase>;
