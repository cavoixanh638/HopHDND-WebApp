import {initializeApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref} from 'firebase/database';
import {CellEditSessionManager} from '../../src/data/cell-edit-leases';
import {FirebaseRepository} from '../../src/data/firebase-repository';
import {updateDraft} from '../../src/domain/items';
import {callCellEdit} from '../../src/data/cell-edit-api';
import type {Patch} from '../../shared/types';

if(!['127.0.0.1','localhost'].includes(location.hostname)||import.meta.env.MODE!=='pages-test')
  throw Error('Emulator-only Chrome entry refused non-localhost or non-test build');
const project='demo-pr142-cell-edit';
const app=initializeApp({
 apiKey:'demo-pr142-browser',authDomain:project+'.firebaseapp.com',projectId:project,
 databaseURL:'https://'+project+'-default-rtdb.firebaseio.com'
},'hdnd-pages');
const auth=getAuth(app);
connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
const database=getDatabase(app);
connectDatabaseEmulator(database,'127.0.0.1',9000);
let manager:CellEditSessionManager;
let repo:FirebaseRepository;
let draft:Patch|null=null;
let latestResult:unknown=null;
const textarea=document.querySelector<HTMLTextAreaElement>('#draft')!;
const status=document.querySelector<HTMLElement>('#status')!;
const setStatus=(message:string)=>{status.textContent=message;};
const assertion=JSON.stringify({sub:'pr142-cell-real-google',
 email:'poc-editor@demo.invalid',email_verified:true});
async function init(){
 const user=(await signInWithCredential(auth,GoogleAuthProvider.credential(assertion))).user;
 manager=new CellEditSessionManager(database,()=>auth.currentUser);
 repo=new FirebaseRepository(database,()=>auth.currentUser,()=>({columns:{note:true}}));
 repo.leaseManager=manager;
 setStatus('AUTH '+user.uid);
 return user.uid;
}
async function acquire(){
 try{await manager.acquire('r1','note','multiline');setStatus('ACQUIRED');return true;}
 catch(e){setStatus('DENIED '+String(e));return false;}
}
async function save(){
 try{
  if(!draft){
   const [base]=await repo.list();
   draft=updateDraft(base,undefined,{note:textarea.value})??null;
  }
  if(!draft)throw Error('EMPTY_DRAFT');
  const results=await repo.save([draft]);
  latestResult=results[0];
  if(results[0].ok){
   await manager.finish('r1','note');
   draft=null;setStatus('COMMITTED '+results[0].item?.revision);
   return {ok:true,revision:results[0].item?.revision};
  }
  setStatus('UNCONFIRMED '+results[0].message);
  return {ok:false,message:results[0].message};
 }catch(e){setStatus('UNKNOWN '+String(e));return {ok:false,message:String(e)};}
}
async function release(){
 try{await manager.cancel('r1','note');setStatus('RELEASED');return true;}
 catch(e){setStatus('UNCONFIRMED_RELEASE '+String(e));return false;}
}
textarea.addEventListener('input',()=>{draft=null;if(manager?.has('r1','note'))manager.preserveDraft('r1','note',textarea.value);});
document.querySelector('#acquire')!.addEventListener('click',()=>{void acquire();});
document.querySelector('#save')!.addEventListener('click',()=>{void save();});
document.querySelector('#release')!.addEventListener('click',()=>{void release();});
(window as Window & {qa?:unknown}).qa={
 init,acquire,save,release,
 readPublic:async()=>({
   lease:(await get(ref(database,'hdnd/editLocks/r1/note'))).val(),
   row:(await get(ref(database,'hdnd/items/r1'))).val()
 }),
 copiedHashAttack:async()=>{
   const lease=(await get(ref(database,'hdnd/editLocks/r1/note'))).val();
   try{await callCellEdit({scope:'legacy',action:'renew',recordId:'r1',field:'note',
      operationId:crypto.randomUUID(),secret:lease.proofHash,token:lease.token});return 'UNEXPECTED_PASS';}
   catch{return 'DENIED';}
 },
 draft:()=>({text:textarea.value,operationId:draft?.operationId??null}),
 result:()=>latestResult,
};
