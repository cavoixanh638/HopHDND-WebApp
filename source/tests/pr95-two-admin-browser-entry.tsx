/**
 * PR95 L3: real Chromium target harness. Served ONLY by Vite pages-test on
 * localhost. Calls production repository/lease/workspace code and existing
 * test-only Firebase Google admin sign-in hook. No production credentials.
 */
import {useEffect,useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {get,onValue,ref,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import {getFirebaseServices} from '../src/state/firebase-boot';
import {FirebaseRepository} from '../src/data/firebase-repository';
import {CellEditSessionManager,renewCellLease,lockPath,type CellLease} from '../src/data/cell-edit-leases';
import {updateDraft} from '../src/domain/items';
import {stageDatasetReplacement,commitDatasetReplacement,DATASET_V2_PATH} from '../src/data/firebase-versioned-replacement';
import {useWorkspace} from '../src/state/use-workspace';
import type {ActiveDatasetPointer} from '../src/data/dataset-replacement-integrity';
import type {EditableField,Item,Patch} from '../shared/types';

if(import.meta.env.MODE!=='pages-test'||!['localhost','127.0.0.1'].includes(location.hostname))
  throw Error('PR95 L3 harness is forbidden outside localhost pages-test.');
const {auth,database}=getFirebaseServices();
const session=crypto.randomUUID();
const recordId='pr95_two_tabs_row_001';
const itemPath=(gen:string)=>DATASET_V2_PATH+'/generations/'+gen+'/items';
const slots=new Map<string,{repository:FirebaseRepository,manager:CellEditSessionManager,epoch:ActiveDatasetPointer}>();
const prepared=new Map<string,{patch:Patch,repository:FirebaseRepository,manager:CellEditSessionManager}>();
const ensure=(gen:string)=>{
  const state=slots.get(gen);
  if(!state)throw Error('Unbound Chrome tab generation: '+gen);
  return state;
};
const asAdmin=():User=>{
  const user=auth.currentUser;
  if(!user||user.isAnonymous||!user.emailVerified||
    !user.providerData.some(p=>p.providerId==='google.com'))
    throw Error('Admin Auth Emulator identity not ready');
  return user;
};
const node=(path:string)=>ref(database,path);
const checkOne=async(row:string=recordId,gen?:string)=>{
  const epoch=gen??(await currentGeneration());
  const item=(await ensure(epoch).repository.list()).find(r=>r.recordId===row);
  if(!item)throw Error('Missing V2 item '+row+' in '+epoch);
  return item;
};
async function currentGeneration(){
  const raw=(await get(node(DATASET_V2_PATH+'/active'))).val();
  if(!raw?.generationId)throw Error('No active V2 generation');
  return String(raw.generationId);
}
function bindEpoch(epoch:ActiveDatasetPointer){
  if(!slots.has(epoch.generationId)){
    const manager=new CellEditSessionManager(database,()=>auth.currentUser,epoch.generationId);
    const repository=new FirebaseRepository(database,()=>auth.currentUser,
      ()=>({columns:{note:true,specificProgress:true}}),
      itemPath(epoch.generationId),epoch);
    repository.leaseManager=manager;
    slots.set(epoch.generationId,{repository,manager,epoch});
  }
}
const api={
  session,
  async login(){
    for(let i=0;i<150;i++){
      const hook=(window as Window & {__pr95EmulatorGoogleAdminSignIn?:()=>Promise<{
        uid:string;email:string|null;emailVerified:boolean;providerIds:string[]}>})
        .__pr95EmulatorGoogleAdminSignIn;
      if(hook){
        const principal=await hook();
        if(principal.uid!==asAdmin().uid)throw Error('Admin identity mismatch');
        return principal;
      }
      await new Promise(r=>setTimeout(r,100));
    }
    throw Error('The existing Emulator-only Google admin hook is missing');
  },
  async attach(){
    const pointer=(await get(node(DATASET_V2_PATH+'/active'))).val() as ActiveDatasetPointer;
    bindEpoch(pointer);
    return {generationId:pointer.generationId,revision:pointer.revision,uid:asAdmin().uid,session};
  },
  async prepare(field:EditableField,value:string,id=recordId,gen?:string){
    const generation=gen??await currentGeneration();
    const row=await checkOne(id,generation);
    const patch=updateDraft(row,undefined,{[field]:value});
    if(!patch)throw Error('No changes');
    const key=crypto.randomUUID();
    const {repository,manager}=ensure(generation);
    prepared.set(key,{patch,repository,manager});
    return {key,baseRevision:patch.baseRevision,baseValue:row[field],operationId:patch.operationId};
  },
  async acquire(field:EditableField,id=recordId,gen?:string){
    const generation=gen??await currentGeneration();
    const {manager}=ensure(generation);
    await manager.acquire(id,field,'multiline');
    const lease=(await get(node(lockPath(id,field,generation)))).val();
    if(!lease||manager.proof(id,field)!==lease.token)throw Error('Lease proof mismatch');
    return {generation,uid:lease.uid,session:lease.session,token:lease.token,
      revision:lease.revision,expiresAt:lease.expiresAt,acquiredAt:lease.acquiredAt};
  },
  async renew(field:EditableField,id=recordId,gen?:string){
    const generation=gen??await currentGeneration();
    const {manager}=ensure(generation);
    const lease=(await get(node(lockPath(id,field,generation)))).val() as CellLease;
    if(!lease||lease.token!==manager.proof(id,field))throw Error('Not this tab lease');
    const next=await renewCellLease(database,lease,id,field,generation);
    return {token:next.token,revision:next.revision,expiresAt:next.expiresAt};
  },
  async finish(field:EditableField,id=recordId,gen?:string){
    const generation=gen??await currentGeneration();
    await ensure(generation).manager.finish(id,field);
    return (await get(node(lockPath(id,field,generation)))).val();
  },
  async cancel(field:EditableField,id=recordId,gen?:string){
    const generation=gen??await currentGeneration();
    await ensure(generation).manager.cancel(id,field);
    return (await get(node(lockPath(id,field,generation)))).val();
  },
  async savePrepared(key:string){
    const p=prepared.get(key);
    if(!p)throw Error('Unknown patch');
    return (await p.repository.save([p.patch]))[0];
  },
  async preserveDraft(field:EditableField,value:string,id=recordId,gen?:string){
    const generation=gen??await currentGeneration();
    const {manager}=ensure(generation);
    if(!manager.preserveDraft(id,field,value))throw Error('Could not preserve draft');
    return {generation,recovered:manager.recoverDraft(id,field)};
  },
  async recoverDraft(field:EditableField,id=recordId,gen?:string){
    return ensure(gen??await currentGeneration()).manager.recoverDraft(id,field);
  },
  async readRow(id=recordId,gen?:string){
    const generation=gen??await currentGeneration();
    return (await get(node(itemPath(generation)+'/'+id))).val();
  },
  async readHistory(id=recordId,gen?:string){
    return ensure(gen??await currentGeneration()).repository.history(id);
  },
  async leaseFromServer(field:EditableField,id=recordId,gen?:string){
    return (await get(node(lockPath(id,field,gen??await currentGeneration())))).val();
  },
  async stageNewGeneration(op:string){
    const previous=await currentGeneration();
    const rows=await ensure(previous).repository.list();
    const replacement=rows.map(row=>({...row,content:'GENERATION-REPLACED-'+op+'-'+row.recordId,
      note:'MỚI: '+op,revision:1}));
    const approval=await stageDatasetReplacement(database,asAdmin(),replacement,op,'two-tabs.xlsx');
    return {approval,previous,newGeneration:approval.manifest.generationId};
  },
  async commitStaged(approval:Awaited<ReturnType<typeof stageDatasetReplacement>>){
    const confirmation='THAY '+approval.operationId+' '+approval.preview.oldCount+' '+approval.preview.newCount;
    const result=await commitDatasetReplacement(database,asAdmin(),approval,confirmation);
    return result;
  },
  async pointer(){return (await get(node(DATASET_V2_PATH+'/active'))).val();},
  async dispose(){await Promise.allSettled([...slots.values()].map(x=>x.manager.dispose()));},
  workspaceSnapshot:()=>({ready:false,items:0,drafts:0,sourceKey:''}),
  workspaceDraft:(_id:string,_field:EditableField,_value:string)=>false,
  workspaceSave:async()=>false
};

declare global{
  interface Window{__pr95TwoAdmin:typeof api}
}
window.__pr95TwoAdmin=api;

function WorkspaceProbe(){
  const [active,setActive]=useState<ActiveDatasetPointer|null>(null);
  const [authReady,setAuthReady]=useState(false);
  useEffect(()=>{
    const unsubAuth=auth.onAuthStateChanged(user=>setAuthReady(!!user&&!user.isAnonymous));
    const unsub=onValue(node(DATASET_V2_PATH+'/active'),snap=>{
      const raw=snap.val() as ActiveDatasetPointer|null;
      if(raw?.generationId)bindEpoch(raw);
      setActive(raw);
    });
    return()=>{unsubAuth();unsub();};
  },[]);
  const generation=active?.generationId;
  const fallback=useMemo(()=>new FirebaseRepository(database,()=>auth.currentUser,
    ()=>({columns:{note:true,specificProgress:true}})),[]);
  const repository=useMemo(()=>generation?ensure(generation).repository:fallback,
    [generation,active?.operationId,active?.revision]);
  const manager=useMemo(()=>generation?ensure(generation).manager:undefined,[generation]);
  // Same source-key structure as production App.tsx, to prove generation fence.
  const sourceKey=active?'pages:gen:'+active.generationId+':'+active.operationId+':'+active.revision
    :'pages:primary';
  const workspace=useWorkspace(repository,sourceKey,!!active&&authReady,manager);
  api.workspaceSnapshot=()=>({ready:!!active&&authReady&&!workspace.busy,
    items:workspace.items.length,drafts:Object.keys(workspace.drafts).length,
    sourceKey,workingNote:workspace.workingItems.find(x=>x.recordId===recordId)?.note??null,
    message:workspace.message});
  api.workspaceDraft=(id,field,value)=>{workspace.update(id,{[field]:value});return true;};
  api.workspaceSave=()=>workspace.save();
  return <section id="l3-two-admin-status" data-generation={generation??'none'}
    data-uid={auth.currentUser?.uid??'none'} data-source-key={sourceKey}>
    <h1>PR95 L3 two real Chrome admin tabs</h1>
    <p>Generation: {generation??'waiting'}</p>
    <p>Rows: {workspace.items.length}; Drafts: {Object.keys(workspace.drafts).length}</p>
  </section>;
}
createRoot(document.getElementById('root')!).render(<WorkspaceProbe/>);
