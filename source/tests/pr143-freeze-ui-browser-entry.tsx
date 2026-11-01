/** 
 * Real FreezeAdminPanel + useFirebase browser integration.
 * Only reachable in Vite pages-test on localhost, never a production entry.
 */
import {useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {signOut,type User} from 'firebase/auth';
import {get,goOffline,goOnline,ref} from 'firebase/database';
import {useFirebase,type FirebaseController} from '../src/state/use-firebase';
import {getFirebaseServices,ensureGuestAuth} from '../src/state/firebase-boot';
import {FreezeAdminPanel} from '../src/features/settings/FreezeAdminPanel';
import {acquireCellLease,releaseCellLease,type CellLease} from '../src/data/cell-edit-leases';
import {stageDatasetReplacement,commitDatasetReplacement} from '../src/data/firebase-versioned-replacement';
import {createDemoItems} from '../src/data/demo-items';
import '../src/styles/app.css';

if(import.meta.env.MODE!=='pages-test'||
  !['localhost','127.0.0.1'].includes(window.location.hostname))
  throw Error('PR143 Freeze UI must use loopback pages-test mode only.');
const {auth,database,emulator}=getFirebaseServices();
if(!emulator||auth.app.options.projectId!=='demo-hdnd')
  throw Error('PR143 Freeze UI requires demo-hdnd Firebase Emulator.');
const errors:string[]=[];
const pageId=crypto.randomUUID();
window.addEventListener('unhandledrejection',event=>{
  errors.push('unhandledrejection: '+String(event.reason));
});
window.addEventListener('error',event=>{
  errors.push('window.error: '+event.message);
});
let controller:FirebaseController|null=null;
let lease:CellLease|null=null;
let leaseGen='';
const active=()=>controller?.datasetActive?.generationId??'';
function admin():User{
  const user=auth.currentUser;
  if(!user||user.isAnonymous||user.email!=='cavoixanh638@gmail.com'||
     !user.emailVerified||!user.providerData.some(p=>p.providerId==='google.com'))
    throw Error('PR143 Auth Emulator admin is not ready');
  return user;
}
const api={
  pageId,
  snapshot:()=>({
    uid:controller?.user?.uid??null,
    isAdmin:controller?.isAdmin??false,
    ready:controller?.ready??false,
    connected:controller?.connected??false,
    datasetEpochReady:controller?.datasetEpochReady??false,
    generationId:active(),
    freezeMode:controller?.freezeControl?.mode??null,
    freezeEpoch:controller?.freezeControl?.epoch??null,
    freezeRevision:controller?.freezeControl?.revision??null,
    panelVisible:!!document.querySelector('section[aria-label="Kiểm soát khóa dữ liệu"]'),
    status:document.querySelector('section[aria-label="Kiểm soát khóa dữ liệu"] [role=status]')?.textContent??'',
    error:document.querySelector('section[aria-label="Kiểm soát khóa dữ liệu"] [role=alert]')?.textContent??'',
    content:document.querySelector('section[aria-label="Kiểm soát khóa dữ liệu"]')?.textContent??''
  }),
  errors:()=>[...errors],
  async login(){
    for(let i=0;i<200;i++){
      const hook=(window as Window & {
        __pr95EmulatorGoogleAdminSignIn?:()=>Promise<{uid:string}>
      }).__pr95EmulatorGoogleAdminSignIn;
      if(hook)return hook();
      await new Promise(r=>setTimeout(r,100));
    }
    throw Error('Emulator-only Google login hook unavailable');
  },
  async guest(){
    await signOut(auth);
    await ensureGuestAuth(auth);
    return {uid:auth.currentUser?.uid??null,anonymous:auth.currentUser?.isAnonymous??false};
  },
  async acquire(){
    leaseGen=active();
    if(!leaseGen)throw Error('No active V2 generation');
    lease=await acquireCellLease(database,admin(),crypto.randomUUID(),
      'pr143_v2a','note','multiline',leaseGen);
    return {activeGeneration:leaseGen,expiresAt:lease.expiresAt,uid:lease.uid};
  },
  async release(){
    if(!lease)throw Error('No acquired lease');
    await releaseCellLease(database,lease,'pr143_v2a','note',leaseGen);
    const done=leaseGen;
    lease=null;
    return {generationId:done,released:true};
  },
  async swap(){
    const actor=admin();
    const operation='pr143_freeze_ui_swap_00001';
    const rows=createDemoItems(2).map((row,i)=>({
      ...row,recordId:'pr143_new_'+i,
      displayCode:'PR143NEW'+i,revision:1,isDropped:false,archivedAt:null,
      note:'POST_SWAP_'+i
    }));
    const approval=await stageDatasetReplacement(database,actor,rows,operation,'pr143-synthetic.xlsx');
    const result=await commitDatasetReplacement(database,actor,approval,
      'THAY '+operation+' '+approval.preview.oldCount+' '+approval.preview.newCount);
    if(result.status!=='committed')throw Error('Real CAS did not commit: '+result.status);
    return {generationId:(await get(ref(database,'hdnd/datasetV2/active'))).val()?.generationId,
      status:result.status};
  },
  offline:()=>{goOffline(database);return {off:true};},
  online:()=>{goOnline(database);return {off:false};},
  async pointer(){return (await get(ref(database,'hdnd/datasetV2/active'))).val();}
};
declare global{interface Window{__pr143FreezeUi:typeof api}}
window.__pr143FreezeUi=api;

function TestApp(){
  const firebase=useFirebase();
  useEffect(()=>{controller=firebase;},[firebase]);
  controller=firebase;
  return <article style={{maxWidth:1050,margin:'24px auto',padding:20}}>
    <header><h1>PR143 · Freeze UI / Auth + RTDB Emulator</h1>
      <p data-testid="identity">Identity: {firebase.user?.isAnonymous?'guest':firebase.isAdmin?'admin':'pending'} ·
        generation: {firebase.datasetActive?.generationId??'legacy'} ·
        connected: {String(firebase.connected)}</p></header>
    <FreezeAdminPanel firebase={firebase}/>
  </article>;
}
createRoot(document.getElementById('root')!).render(<TestApp/>);
