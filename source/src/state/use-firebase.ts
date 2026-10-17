import { useEffect, useRef, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, GoogleAuthProvider, onAuthStateChanged, signInAnonymously, signInWithPopup, signOut, type User } from 'firebase/auth';
import { connectDatabaseEmulator, get, getDatabase, onValue, ref, runTransaction } from 'firebase/database';
import { firebaseConfig } from '../data/firebase-config';
import { firebaseAdmin, mayEdit, samePermissions, type CellPermissions } from '../data/firebase-repository';
import type { ConfigSection } from '../data/shared-config';
import { validateCatalog, type CatalogConfig } from '../data/catalogs';
import { validateReportLayout, type ReportLayout } from '../data/report-preferences';
import { validateItemLayout, type ItemLayout } from '../data/item-preferences';
import {mergeItemLayout,type LayoutConflictChoices} from '../data/item-layout-merge';
import type {SheetConfig} from '../data/sheet-config';
import {serializeReviewSnapshot,validateReviewSnapshot,type ReviewSnapshot} from '../domain/approval-review';

export interface FirebaseProfile {catalogs:CatalogConfig;reports:ReportLayout[];items:ItemLayout;revision:number}
export interface ReviewBaseline {revision:number;source:string;approvedAt:string;approvedBy:string;changedCount:number;snapshot:ReviewSnapshot;history:{revision:number;at:string;changedCount:number}[]}
const reviewSource=(config:SheetConfig)=>config.spreadsheetId+':'+config.gid;
function baselineFrom(raw:unknown,source:string):ReviewBaseline|null{
  if(!raw)return null;
  const value=raw as Record<string,unknown>;
  if(!Number.isSafeInteger(value.revision)||Number(value.revision)<1||value.source!==source||
    typeof value.payload!=='string'||typeof value.approvedAt!=='string')throw new Error('Mốc phê duyệt bị lỗi; chưa thể đối chiếu.');
  const history=typeof value.historyJson==='string'?JSON.parse(value.historyJson) as ReviewBaseline['history']:[];
  if(!Array.isArray(history))throw new Error('Lịch sử mốc phê duyệt không hợp lệ.');
  return {revision:Number(value.revision),source,approvedAt:value.approvedAt,approvedBy:String(value.approvedBy??''),
    changedCount:Number(value.changedCount??0),snapshot:validateReviewSnapshot(JSON.parse(value.payload),source),history};
}
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
  const [editControl,setEditControl]=useState({ready:false,revision:0,editingLocked:true});
  const saving=useRef(false);
  useEffect(()=>{
    let active=true,signing=false;
    const unsubscribe=onAuthStateChanged(auth,next=>{
      if(!active)return;
      setUser(next);setReady(!!next);setProfileReady(false);setPermissionsReady(false);setProfile(null);setPermissions({columns:{}});setEditControl({ready:false,revision:0,editingLocked:true});
      if(!next&&!signing){signing=true;void signInAnonymously(auth).catch(cause=>setError(`Không đăng nhập ẩn danh được: ${cause.message}`)).finally(()=>{signing=false;});}
    },cause=>setError(cause.message));
    return()=>{active=false;unsubscribe();};
  },[auth]);
  useEffect(()=>{
    if(!user)return;
    let active=true;
    const failed=(cause:Error)=>{if(active)setError(`Không đọc được Firebase: ${cause.message}. Kiểm tra Authentication và Database Rules.`);};
    const stop=[onValue(ref(database,'.info/connected'),snap=>{if(active)setConnected(snap.val()===true);}),onValue(ref(database,'hdnd/permissions'),snap=>{if(!active)return;const raw=snap.val();setPermissions({columns:raw?.columns??{},rows:raw?.rows??{},cells:raw?.cells??{}});setPermissionsReady(true);},cause=>{if(active){setPermissionsReady(false);setPermissions({columns:{}});}failed(cause);}),onValue(ref(database,'hdnd/control'),snap=>{
      if(!active)return;
      const current=snap.val();
      setEditControl({ready:true,revision:Number(current?.revision??0),editingLocked:current?.editingLocked===true});
    },cause=>{if(active)setEditControl({ready:false,revision:0,editingLocked:true});failed(cause);}),
    onValue(ref(database,'hdnd/profile'),snap=>{if(!active)return;try{const raw=snap.val();setProfile(raw?profileFrom({...JSON.parse(raw.payload),revision:raw.revision}):null);setProfileReady(true);}catch(cause){setProfileReady(false);failed(cause as Error);}},cause=>{if(active)setProfileReady(false);failed(cause);})];
    return()=>{active=false;stop.forEach(unsubscribe=>unsubscribe());};
  },[user?.uid,database]);
  const admin=firebaseAdmin(user);
  const login=async()=>{setError('');await signInWithPopup(auth,new GoogleAuthProvider());};
  const logout=async()=>{await signOut(auth);};
  const saveProfile=async(section:ConfigSection,value:unknown,expectedRevision=profile?.revision??0,originalSection?:unknown,resolutions:LayoutConflictChoices={})=>{
    if(!firebaseAdmin(auth.currentUser))throw new Error('Chỉ tài khoản Google quản trị được lưu bố trí và danh mục.');
    if(!profileReady)throw new Error('Chưa đọc được cấu hình gốc; không khởi tạo hoặc ghi đè. Đọc lại danh mục và bố trí trước.');
    if(!connected)throw new Error('Đang mất kết nối. Giữ phần sửa và thử lưu khi có mạng.');
    if(saving.current)throw new Error('Đang lưu thiết lập.');
    const base=profile,expected=base?.revision??0;
    // Only the list editor supplies its original baseline. Other profile writers
    // remain strict CAS and may not overwrite a newer version.
    const canMerge=section==='items'&&originalSection!==undefined;
    const original=canMerge?validateItemLayout(originalSection):null;
    const edited=canMerge?validateItemLayout(value):null;
    if(!canMerge&&expected!==expectedRevision)
      throw new Error('Danh mục/bố trí đã đổi trong lúc bạn chỉnh. Đóng rồi mở lại để đối chiếu; phần sửa vẫn được giữ.');
    if(canMerge&&!base)throw new Error('Chưa có cấu hình Firebase để đối chiếu; không ghi đè cấu hình mới.');
    const candidate=section==='all'?{...(value as object),revision:expected+1}:{...base,[section]:value,revision:expected+1};
    if(!profileFrom(candidate))throw new Error('Thiếu bộ cấu hình.');
    saving.current=true;setBusy(true);
    try {
      let conflict:Error|null=null;
      let submitted:string|undefined;
      const result=await runTransaction(ref(database,'hdnd/profile'),current=>{
        // A cold RTDB transaction may see null before fetching the server value.
        if(current===null&&expected>0)return current;
        if(!current&&canMerge)return undefined;
        const serverRevision=Number(current?.revision??0);
        let proposed:FirebaseProfile|null=null;
        try {
          if(canMerge&&original&&edited) {
            const live=profileFrom({...JSON.parse(String(current.payload)),revision:serverRevision});
            if(!live)throw new Error('Không đọc được cấu hình Firebase hiện tại.');
            const merged=mergeItemLayout(original,edited,live.items,resolutions);
            proposed=profileFrom({...live,items:merged,revision:serverRevision+1});
          } else {
            if(serverRevision!==expected)return undefined;
            proposed=profileFrom(section==='all'
              ?{...(value as object),revision:expected+1}
              :{...base,[section]:value,revision:expected+1});
          }
          if(!proposed)return undefined;
          submitted=JSON.stringify(proposed);
          conflict=null;
          return {revision:proposed.revision,payload:submitted};
        }catch(cause) {
          conflict=cause instanceof Error?cause:new Error('Không thể đối chiếu bố trí Firebase.');
          return undefined;
        }
      },{applyLocally:false});
      const confirmed=result.snapshot.val();
      if(!result.committed||!submitted||
        confirmed?.revision!==JSON.parse(submitted).revision||confirmed?.payload!==submitted) {
        if(conflict)throw conflict;
        throw new Error('Bố trí đã được sửa ở cửa sổ khác hoặc Firebase chưa xác nhận lưu. Đọc lại và đối chiếu.');
      }
      const valid=profileFrom({...JSON.parse(submitted),revision:confirmed.revision});
      if(!valid)throw new Error('Không xác nhận được cấu hình Firebase đã lưu.');
      setProfile(valid);
      return valid;
    }finally{saving.current=false;setBusy(false);}
  };
  const savePermissions=async(next:CellPermissions,expected=permissions)=>{
    if(!firebaseAdmin(auth.currentUser)||!connected||!permissionsReady)throw new Error('Cần quản trị Google, kết nối mạng và quyền gốc để lưu quyền sửa.');
    if(saving.current)throw new Error('Đang lưu thiết lập.');
    saving.current=true;setBusy(true);
    try{
    const rightsRef=ref(database,'hdnd/permissions');
    // Read authoritative rights before CAS: RTDB transactions can first run
    // against an empty local cache, causing misleading conflict errors.
    const live=(await get(rightsRef)).val() as CellPermissions|null;
    if(!samePermissions(live,expected))
      throw new Error('Quyền trên Firebase đã thay đổi so với bản đang chỉnh. Hãy đọc lại quyền trước khi lưu; bản nháp vẫn được giữ.');
    const result=await runTransaction(rightsRef,current=>{
      // Retry is safe: an unrelated admin's update invalidates this CAS.
      if(current===null&&!samePermissions(expected,{columns:{}}))return undefined;
      if(!samePermissions({columns:current?.columns??{},rows:current?.rows??{},cells:current?.cells??{}},expected))return undefined;
      return next;
    },{applyLocally:false});
    const confirmed=result.snapshot.val() as CellPermissions|null;
    if(!result.committed)
      throw new Error('Quyền đã được thay đổi ở phiên khác. Hãy đọc lại quyền và kiểm tra trước khi lưu tiếp.');
    if(!samePermissions(confirmed,next))
      throw new Error('Firebase chưa xác nhận đúng quyền đã lưu. Hãy đọc lại và đối chiếu; bản nháp vẫn được giữ.');
    }finally{saving.current=false;setBusy(false);}
  };
  const saveEditingLock=async(nextLocked:boolean)=>{
    if(!firebaseAdmin(auth.currentUser)||!connected||!editControl.ready)throw new Error('Chỉ quản trị đã kết nối mới được khóa hoặc mở sửa.');
    if(saving.current)throw new Error('Đang lưu thiết lập khác.');
    const expected=editControl.revision;
    saving.current=true;setBusy(true);
    try{
      const result=await runTransaction(ref(database,'hdnd/control'),current=>{
        if(current===null&&expected>0)return current;
        return Number(current?.revision??0)!==expected?undefined:
          {revision:expected+1,editingLocked:nextLocked,changedAt:new Date().toISOString()};
      },{applyLocally:false});
      if(!result.committed||result.snapshot.val()?.revision!==expected+1||result.snapshot.val()?.editingLocked!==nextLocked)
        throw new Error('Trạng thái khóa đã đổi hoặc chưa được Firebase xác nhận. Đọc lại trước khi thao tác.');
      setEditControl({ready:true,revision:expected+1,editingLocked:nextLocked});
    }finally{saving.current=false;setBusy(false);}
  };
  const readReview=async(config:SheetConfig):Promise<ReviewBaseline|null>=>{
    if(!firebaseAdmin(auth.currentUser)||!connected)throw new Error('Cần tài khoản Google quản trị và kết nối Firebase để xem mốc duyệt.');
    const raw=(await get(ref(database,'hdndReviews/'+config.spreadsheetId+'/'+config.gid))).val();
    return baselineFrom(raw,reviewSource(config));
  };
  const approveReview=async(config:SheetConfig,snapshot:ReviewSnapshot,expectedRevision:number,changedCount:number):Promise<ReviewBaseline>=>{
    if(!firebaseAdmin(auth.currentUser)||!connected)throw new Error('Chỉ quản trị Google đã kết nối được phê duyệt.');
    if(snapshot.source!==reviewSource(config)||snapshot.rows.length===0)throw new Error('Nguồn chưa có dữ liệu hợp lệ; không được tạo mốc rỗng.');
    if(saving.current)throw new Error('Đang lưu thiết lập khác.');
    const payload=serializeReviewSnapshot(snapshot),path='hdndReviews/'+config.spreadsheetId+'/'+config.gid;
    const now=new Date().toISOString(),actor=auth.currentUser?.email??'admin';
    saving.current=true;setBusy(true);
    try{
      const result=await runTransaction(ref(database,path),current=>{
        if(current===null&&expectedRevision>0)return current;
        if(Number(current?.revision??0)!==expectedRevision)return undefined;
        let previous:ReviewBaseline['history']=[];
        try{previous=current?.historyJson?JSON.parse(current.historyJson):[];}catch{return undefined;}
        if(!Array.isArray(previous))return undefined;
        const revision=expectedRevision+1;
        const history=[...previous,{revision,at:now,changedCount}].slice(-20);
        return {revision,source:snapshot.source,approvedAt:now,approvedBy:actor,changedCount,payload,historyJson:JSON.stringify(history)};
      },{applyLocally:false});
      if(!result.committed||result.snapshot.val()?.revision!==expectedRevision+1||
         result.snapshot.val()?.payload!==payload)
        throw new Error('Mốc phê duyệt đã được cập nhật ở nơi khác hoặc chưa được Firebase xác nhận. Hãy đọc lại để đối chiếu.');
      const baseline=baselineFrom(result.snapshot.val(),snapshot.source);
      if(!baseline)throw new Error('Không đọc được xác nhận mốc phê duyệt.');
      return baseline;
    }finally{saving.current=false;setBusy(false);}
  };
  const refresh=async()=>{
    if(!auth.currentUser||!connected){setError('Chưa kết nối Firebase; dữ liệu Sheets vẫn có thể đọc.');return;}
    try{const [p,q]=await Promise.all([get(ref(database,'hdnd/profile')),get(ref(database,'hdnd/permissions'))]);const raw=p.val(),rules=q.val();setProfile(raw?profileFrom({...JSON.parse(raw.payload),revision:raw.revision}):null);setPermissions({columns:rules?.columns??{},rows:rules?.rows??{},cells:rules?.cells??{}});setProfileReady(true);setPermissionsReady(true);setError('');}catch(cause){setProfileReady(false);setPermissionsReady(false);setError((cause as Error).message);}
  };
  return {user,ready,error,connected,permissions,profile,isAdmin:admin,emulator:services.emulator,login,logout,savePermissions,readReview,approveReview,saveEditingLock,editingLocked:!editControl.ready||editControl.editingLocked,controlReady:editControl.ready,
    canEdit:(id:string,field:Parameters<typeof mayEdit>[2])=>ready&&connected&&permissionsReady&&editControl.ready&&(!editControl.editingLocked||admin)&&mayEdit(permissions,id,field,admin),
    common:{config:profile,busy,message:error||(!ready?'Đang đăng nhập Firebase để đọc quyền và cấu hình…':!connected?'Mất kết nối Firebase; phần sửa thử vẫn giữ trên máy.':!profileReady?'Đang đọc cấu hình chung từ Firebase…':profile?'Danh mục và bố trí đang dùng chung qua Firebase.':'Chưa có bố trí chung; quản trị có thể lưu bố trí mặc định.'),status:error?'error':profileReady?'ready':'loading',refresh,save:saveProfile}};
}
export type FirebaseController=ReturnType<typeof useFirebase>;
