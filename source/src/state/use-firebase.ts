import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { get, onValue, ref, runTransaction } from 'firebase/database';
import { firebaseAdmin, mayEdit, samePermissions, type CellPermissions } from '../data/firebase-repository';
import type { ConfigSection } from '../data/shared-config';
import { validateCatalog, type CatalogConfig } from '../data/catalogs';
import { validateReportLayout, type ReportLayout } from '../data/report-preferences';
import { validateItemLayout, type ItemLayout } from '../data/item-preferences';
import {mergeItemLayout,type LayoutConflictChoices} from '../data/item-layout-merge';
import type {SheetConfig} from '../data/sheet-config';
import {markStartup} from '../data/startup-timings';
import {clearSessionMirrors} from '../data/firebase-snapshot-cache';
import {getFirebaseServices,ensureGuestAuth} from './firebase-boot';
import {serializeReviewSnapshot,validateReviewSnapshot,type ReviewSnapshot} from '../domain/approval-review';
import {initialFreeze,watchFreeze,setFreezeMode,activeEditLeaseCount,type FreezeControl,type FreezeMode} from '../data/freeze-control';
import type {ActiveDatasetPointer} from '../data/dataset-replacement-integrity';

export interface FirebaseProfile {catalogs:CatalogConfig;reports:ReportLayout[];items:ItemLayout;revision:number;dataSource?:'excel'|'database'|'primary'}
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
  if(value.dataSource!==undefined&&value.dataSource!=='excel'&&value.dataSource!=='database'&&value.dataSource!=='primary')throw new Error('Nguồn dữ liệu Firebase không hợp lệ.');
  return {revision:value.revision,catalogs:validateCatalog(value.catalogs),reports:validateReportLayout(value.reports),items:validateItemLayout(value.items),dataSource:value.dataSource??'excel'};
}
const profileCacheKey='hdnd.confirmed-profile.v1:hophdnd-8b7b2';
function loadConfirmedProfile():FirebaseProfile|null{
  try{const raw=globalThis.localStorage?.getItem(profileCacheKey);return raw?profileFrom(JSON.parse(raw)):null;}catch{return null;}
}
function storeConfirmedProfile(profile:FirebaseProfile|null):void{
  try{if(profile)globalThis.localStorage?.setItem(profileCacheKey,JSON.stringify(profile));
    else globalThis.localStorage?.removeItem(profileCacheKey);}catch{}
}
export function useFirebase(){
  const [services]=useState(getFirebaseServices);
  const {auth,database}=services;
  const [user,setUser]=useState<User|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false),[connected,setConnected]=useState(false);
  const [permissions,setPermissions]=useState<CellPermissions>({columns:{}});
  const [editors,setEditors]=useState<Record<string,boolean>>({});
  const [editorsReady,setEditorsReady]=useState(false);
  const [profile,setProfile]=useState<FirebaseProfile|null>(loadConfirmedProfile),[busy,setBusy]=useState(false);
  const [datasetActive,setDatasetActive]=useState<ActiveDatasetPointer|null>(null);
  // The legacy fallback is forbidden until the V2 active pointer has been checked.
  const [datasetEpochReady,setDatasetEpochReady]=useState(false);
  const [datasetPermissions,setDatasetPermissions]=useState<CellPermissions>({columns:{}});
  const [rightsEpoch,setRightsEpoch]=useState<string|null>(null);
  const sawV2=useRef(false);
  const [profileReady,setProfileReady]=useState(false),[permissionsReady,setPermissionsReady]=useState(false);
  const [editControl,setEditControl]=useState({ready:false,revision:0,editingLocked:true});
  const [freezeControl,setFreezeControl]=useState<FreezeControl|null>(null);
  const saving=useRef(false);
  const hadAuthenticatedSession=useRef(false);
  useEffect(()=>{
    let active=true,signing=false;
    const unsubscribe=onAuthStateChanged(auth,next=>{
      if(!active)return;
      if(!next&&hadAuthenticatedSession.current)setProfile(null);
      if(next)hadAuthenticatedSession.current=true;
      markStartup('auth-checked');
      if(next)markStartup('auth-signed-in');
      setDatasetEpochReady(false);
      setUser(next);setReady(!!next);setProfileReady(false);setPermissionsReady(false);setPermissions({columns:{}});setEditors({});setEditorsReady(false);setEditControl({ready:false,revision:0,editingLocked:true});setFreezeControl(null);
      if((!next||next.isAnonymous)&&!signing){signing=true;void ensureGuestAuth(auth).catch(cause=>setError(`Không đăng nhập ẩn danh được: ${cause.message}`)).finally(()=>{signing=false;});}
    },cause=>{markStartup('auth-error','Firebase Auth không phản hồi hợp lệ');setError(cause.message);});
    return()=>{active=false;unsubscribe();};
  },[auth]);
  useEffect(()=>{
    if(!user)return;
    let active=true;
    const failed=(cause:Error)=>{markStartup('database-error','Lỗi kết nối hoặc phân quyền');if(active)setError(`Không đọc được Firebase: ${cause.message}. Kiểm tra Authentication và Database Rules.`);};
    const adminSession=firebaseAdmin(user);
    // A staff member can read only their own enrollment flag. The full UID
    // registry is reserved for admin and never sent to anonymous viewers.
    const editorsPath=adminSession?'hdnd/editors':'hdnd/editors/'+user.uid;
    const stop=[onValue(ref(database,editorsPath),snap=>{if(!active)return;const raw=snap.val();setEditors(adminSession?(raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{}):{[user.uid]:raw===true});setEditorsReady(true);},cause=>{if(active){setEditorsReady(false);setEditors({});}failed(cause);}),onValue(ref(database,'.info/connected'),snap=>{if(active){setConnected(snap.val()===true);if(snap.val()===true)markStartup('rt-db-connected');}}),onValue(ref(database,'hdnd/permissions'),snap=>{if(!active)return;markStartup('permissions-received');const raw=snap.val();setPermissions({columns:raw?.columns??{},rows:raw?.rows??{},cells:raw?.cells??{}});setPermissionsReady(true);},cause=>{if(active){setPermissionsReady(false);setPermissions({columns:{}});}failed(cause);}),onValue(ref(database,'hdnd/control'),snap=>{
      if(!active)return;
      markStartup('control-received');
      const current=snap.val();
      setEditControl({ready:true,revision:Number(current?.revision??0),editingLocked:current?.editingLocked===true});
    },cause=>{if(active)setEditControl({ready:false,revision:0,editingLocked:true});failed(cause);}),
    onValue(ref(database,'hdnd/profile'),snap=>{if(!active)return;markStartup('profile-received');try{const raw=snap.val();const verified=raw?profileFrom({...JSON.parse(raw.payload),revision:raw.revision}):null;setProfile(verified);storeConfirmedProfile(verified);setProfileReady(true);}catch(cause){setProfileReady(false);failed(cause as Error);}},cause=>{if(active)setProfileReady(false);failed(cause);})];
    return()=>{active=false;stop.forEach(unsubscribe=>unsubscribe());};
  },[user?.uid,database]);
  useEffect(()=>{
    if(!user){setDatasetEpochReady(false);setDatasetActive(null);return;}
    setDatasetEpochReady(false);
    const stop=onValue(ref(database,'hdnd/datasetV2/active'),snapshot=>{
      const raw=snapshot.val();
      if(!raw){
        if(sawV2.current){
          setDatasetEpochReady(false);
          setError('Mất con trỏ thế hệ Firebase; không trở về dữ liệu cũ.');
          return;
        }
        setDatasetActive(null);
        setDatasetEpochReady(true); // Verified pre-V2 legacy only.
        return;
      }
      if(typeof raw.generationId!=='string'||!/^gen_[A-Za-z0-9_-]{12,80}$/.test(raw.generationId)||
        typeof raw.operationId!=='string'||raw.generationId!=='gen_'+raw.operationId||
        !Number.isSafeInteger(raw.revision)||raw.revision<1||
        !Number.isSafeInteger(raw.rowCount)||raw.rowCount<1||raw.rowCount>1000||
        typeof raw.digest!=='string'||!/^[a-f0-9]{64}$/.test(raw.digest)){
        setDatasetEpochReady(false);
        setError('Con trỏ tập dữ liệu Firebase không hợp lệ; dừng đọc và sửa.');
        return;
      }
      sawV2.current=true;
      setDatasetActive(raw as ActiveDatasetPointer);
      setDatasetEpochReady(true);
    },()=>{
      setDatasetEpochReady(false);
      setError('Không đọc được con trỏ thế hệ Firebase; không sử dụng dữ liệu cũ.');
    });
    return()=>{setDatasetEpochReady(false);stop();};
  },[user?.uid,database]);
  useEffect(()=>{
    if(!user||!datasetActive){setDatasetPermissions({columns:{}});setRightsEpoch(null);return;}
    setRightsEpoch(null);setDatasetPermissions({columns:{}});
    return onValue(ref(database,'hdnd/datasetV2/permissions/'+datasetActive.generationId),
      snapshot=>{const raw=snapshot.val();setDatasetPermissions(raw&&typeof raw==='object'?raw:{columns:{}});
        setRightsEpoch(datasetActive.generationId);},
      ()=>{setRightsEpoch(null);setDatasetPermissions({columns:{}});});
  },[user?.uid,database,datasetActive?.generationId]);
  const admin=firebaseAdmin(user);
  const googleEditor=!!user&&!user.isAnonymous&&user.emailVerified&&
    user.providerData.some(provider=>provider.providerId==='google.com')&&
    editorsReady&&editors[user.uid]===true;
  // Firebase signs public visitors in anonymously behind the scenes; no
  // Google sign-in/UID enrollment is required for admin-granted public cells.
  // The server still checks field grants, lease, edit lock and freeze mode.
  const editorAuthorized=admin||googleEditor||!!user?.isAnonymous;
  const saveEditorAccess=async(uid:string,approved:boolean)=>{
    if(!firebaseAdmin(auth.currentUser)||!connected)throw new Error('Chỉ quản trị Google được cấp quyền nhân viên.');
    if(!/^[A-Za-z0-9_-]{1,128}$/.test(uid))throw new Error('UID nhân viên không hợp lệ.');
    const location=ref(database,'hdnd/editors/'+uid);
    const before=(await get(location)).val();
    if(before!==null&&typeof before!=='boolean')throw new Error('Dữ liệu phân quyền nhân viên không hợp lệ.');
    const updated=await runTransaction(location,current=>{
      if(current!==before)return undefined;
      return approved;
    },{applyLocally:false});
    if(!updated.committed||updated.snapshot.val()!==approved)
      throw new Error('Quyền nhân viên đã thay đổi ở phiên khác; đọc lại để tiếp tục.');
  };
  const login=async()=>{
    setError('');
    // The Google popup resolver is not used by public/anonymous visitors.
    // Load it only when the admin explicitly presses Sign in.
    const {loginWithGooglePopup}=await import('./google-popup-login');
    await loginWithGooglePopup(auth);
  };
  const logout=async()=>{clearSessionMirrors();await signOut(auth);};
  const saveProfile=async(section:ConfigSection|'dataSource',value:unknown,expectedRevision=profile?.revision??0,originalSection?:unknown,resolutions:LayoutConflictChoices={})=>{
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
      // Warm the authoritative cache first. Returning null from a cold
      // RTDB transaction could otherwise commit a deletion or false success.
      const profileRef=ref(database,'hdnd/profile');
      const liveSnapshot=await get(profileRef);
      const liveRaw=liveSnapshot.val();
      if(expected>0&&!liveRaw)throw new Error('Cấu hình Firebase đã mất khỏi nguồn. Dừng lưu để tránh ghi đè.');
      if(!canMerge&&Number(liveRaw?.revision??0)!==expected)
        throw new Error('Cấu hình Firebase đã thay đổi. Hãy đọc lại trước khi lưu phần này; dữ liệu bạn đang chỉnh vẫn được giữ.');
      let conflict:Error|null=null;
      let submitted:string|undefined;
      const result=await runTransaction(profileRef,current=>{
        // Never submit a null value when the transaction sees an empty cache.
        if(current===null&&expected>0)return undefined;
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
      setProfile(valid);storeConfirmedProfile(valid);
      return valid;
    }finally{saving.current=false;setBusy(false);}
  };
  /** Refresh just the permission branch, without touching unsaved layout work. */
  const refreshPermissions=async():Promise<CellPermissions>=>{
    if(!auth.currentUser||!connected)throw new Error('Chưa kết nối Firebase hoặc cần đăng nhập lại.');
    const path=datasetActive?'hdnd/datasetV2/permissions/'+datasetActive.generationId:'hdnd/permissions';
    const raw=(await get(ref(database,path))).val() as CellPermissions|null;
    const latest:CellPermissions={columns:raw?.columns??{},rows:raw?.rows??{},cells:raw?.cells??{}};
    if(datasetActive)setDatasetPermissions(latest);
    else setPermissions(latest);
    setPermissionsReady(true);
    return latest;
  };
  const savePermissions=async(next:CellPermissions,expected=datasetActive?datasetPermissions:permissions)=>{
    if(!datasetEpochReady||!firebaseAdmin(auth.currentUser)||!connected||!permissionsReady)throw new Error('Cần con trỏ thế hệ đã xác nhận, quản trị Google, kết nối mạng và quyền gốc để lưu quyền sửa.');
    if(saving.current)throw new Error('Đang lưu thiết lập.');
    saving.current=true;setBusy(true);
    try{
    const rightsRef=ref(database,datasetActive?
      'hdnd/datasetV2/permissions/'+datasetActive.generationId:'hdnd/permissions');
    const activeNow=(await get(ref(database,'hdnd/datasetV2/active'))).val();
    if(datasetActive
      ?activeNow?.generationId!==datasetActive.generationId||activeNow?.revision!==datasetActive.revision||
       activeNow?.operationId!==datasetActive.operationId||activeNow?.digest!==datasetActive.digest||
       activeNow?.rowCount!==datasetActive.rowCount
      :activeNow!==null)
      throw Error('Thế hệ hoạt động đã thay đổi trước khi cấp quyền; phải đọc lại.');
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
    const activeAfter=(await get(ref(database,'hdnd/datasetV2/active'))).val();
    if(datasetActive
      ?activeAfter?.generationId!==datasetActive.generationId||activeAfter?.operationId!==datasetActive.operationId||
       activeAfter?.revision!==datasetActive.revision||activeAfter?.digest!==datasetActive.digest||
       activeAfter?.rowCount!==datasetActive.rowCount
      :activeAfter!==null)
      throw new Error('Thế hệ đã đổi khi đang lưu quyền. Trạng thái chưa chắc chắn, đọc lại; không tự thử lại.');
    const confirmed=result.snapshot.val() as CellPermissions|null;
    if(!result.committed)
      throw new Error('Quyền đã được thay đổi ở phiên khác. Hãy đọc lại quyền và kiểm tra trước khi lưu tiếp.');
    if(!samePermissions(confirmed,next))
      throw new Error('Firebase chưa xác nhận đúng quyền đã lưu. Hãy đọc lại và đối chiếu; bản nháp vẫn được giữ.');
    }finally{saving.current=false;setBusy(false);}
  };
  useEffect(()=>{
    if(!user)return;
    return watchFreeze(database,setFreezeControl,cause=>{
      setFreezeControl(null);setError('Không đọc được trạng thái đóng băng: '+cause.message);
    });
  },[database,user?.uid]);
  const updateFreeze=async(next:'DRAINING'|'FROZEN'|'OPEN',force=false)=>{
    if(!connected||!freezeControl)throw new Error('Chưa xác nhận chế độ chốt trên Firebase.');
    const confirmed=await setFreezeMode(database,auth.currentUser,freezeControl,next,force);
    setFreezeControl(confirmed);
    return confirmed;
  };
  const countEditingCells=()=>activeEditLeaseCount(database);
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
    if(!auth.currentUser||!connected){setError('Chưa kết nối Firebase; không xác nhận được dữ liệu nguồn chính.');return;}
    try{const [p,q]=await Promise.all([get(ref(database,'hdnd/profile')),get(ref(database,'hdnd/permissions'))]);const raw=p.val(),rules=q.val();const verified=raw?profileFrom({...JSON.parse(raw.payload),revision:raw.revision}):null;setProfile(verified);storeConfirmedProfile(verified);setPermissions({columns:rules?.columns??{},rows:rules?.rows??{},cells:rules?.cells??{}});setProfileReady(true);setPermissionsReady(true);setError('');}catch(cause){setProfileReady(false);setPermissionsReady(false);setError((cause as Error).message);}
  };
  return {database,user,ready,error,connected,datasetEpochReady,permissions:datasetActive?(rightsEpoch===datasetActive.generationId?datasetPermissions:{columns:{}}):permissions,datasetActive,editors,editorAuthorized,saveEditorAccess,profile,isAdmin:admin,emulator:services.emulator,login,logout,savePermissions,refreshPermissions,readReview,approveReview,saveEditingLock,updateFreeze,countEditingCells,freezeControl,editingLocked:!editControl.ready||editControl.editingLocked,controlReady:editControl.ready,
    canEdit:(id:string,field:Parameters<typeof mayEdit>[2])=>ready&&datasetEpochReady&&connected&&permissionsReady&&editControl.ready&&freezeControl?.mode==='OPEN'&&editorAuthorized&&(!editControl.editingLocked||admin)&&(!datasetActive||rightsEpoch===datasetActive.generationId)&&mayEdit(datasetActive?datasetPermissions:permissions,id,field,admin),
    common:{config:profile,busy,message:error||(!ready?'Đang đăng nhập Firebase để đọc quyền và cấu hình…':!connected?'Mất kết nối Firebase; phần sửa thử vẫn giữ trên máy.':!profileReady?'Đang đọc cấu hình chung từ Firebase…':profile?'Danh mục và bố trí đang dùng chung qua Firebase.':'Chưa có bố trí chung; quản trị có thể lưu bố trí mặc định.'),status:error?'error':profileReady?'ready':'loading',refresh,save:saveProfile}};
}
export type FirebaseController=ReturnType<typeof useFirebase>;
