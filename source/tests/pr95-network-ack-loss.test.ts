// PR95 NETWORK ACK: independent Vitest / real Firebase RTDB+Auth Emulator.
// This file does NOT import the preexisting application-level ACK-loss hook.
import {beforeAll,afterAll,beforeEach,afterEach,describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {initializeApp,deleteApp,type FirebaseApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,signOut,type Auth} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,goOffline,goOnline,type Database} from 'firebase/database';
import {createDemoItems} from '../src/data/demo-items';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import {prepareInitialDatasetActivation,commitInitialDatasetActivation,
  stageDatasetReplacement,commitDatasetReplacement,restoreDatasetBackup,
  resolveDatasetOperation,DATASET_V2_PATH} from '../src/data/firebase-versioned-replacement';
import {NetworkAckFaultProxy} from '../scripts/pr95-network-ack-proxy.mjs';

const PROJECT='demo-hdnd-network-ack';
const active=process.env.FIREBASE_DATABASE_EMULATOR_HOST==='127.0.0.1:9000'&&
  process.env.GCLOUD_PROJECT===PROJECT;
const ROOT='http://127.0.0.1:9000';
const API=ROOT+'/.settings/rules.json?ns='+PROJECT;
const DATA=ROOT+'/.json?ns='+PROJECT;
const owner={Authorization:'Bearer owner','Content-Type':'application/json'};
const candidate=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const legacy=createDemoItems(2).map((row,i)=>({...row,
  recordId:'legacy_'+(i+1),displayCode:'NQ0'+(i+1),
  revision:1,archivedAt:null,isDropped:false,operationId:'legacy_original',
  updatedAt:1,updatedBy:'test_admin'}));
const rows=prefix=>createDemoItems(2).map((row,i)=>({...row,
  recordId:prefix+'_'+(i+1),displayCode:'NQ0'+(i+1),
  revision:1,archivedAt:null,isDropped:false,content:prefix+' mới '+i}));

async function ownerRequest(url,body){
  const response=await fetch(url,{method:body===undefined?'GET':'PUT',
    headers:owner,...body===undefined?{}:{body:JSON.stringify(body)},
    signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('Synthetic Emulator owner REST failed HTTP '+response.status);
  return response.json();
}
async function readServer(){
  return (await ownerRequest(DATA))?.hdnd?.datasetV2??null;
}
async function verifyState(operationId,revision,expectedCount){
  const state=await readServer();
  expect(state.active).toMatchObject({operationId,generationId:'gen_'+operationId,revision});
  expect(state.operations[operationId]).toMatchObject({status:'COMMITTED',to:'gen_'+operationId});
  expect(Object.keys(state.operations)).toHaveLength(expectedCount);
  expect(Object.keys(state.generations)).toHaveLength(expectedCount);
  return state;
}
let count=0;
async function makeClient(proxied){
  const port=proxied?19000:9000;
  const app=initializeApp({apiKey:'demo-test-key',
    authDomain:PROJECT+'.firebaseapp.com',projectId:PROJECT,
    appId:'pr95-network-ack-'+(++count),
    databaseURL:'https://'+PROJECT+'.firebaseio.com'},'pr95-network-ack-'+count);
  const auth=getAuth(app);
  connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const db=getDatabase(app);
  connectDatabaseEmulator(db,'127.0.0.1',port);
  const user=await signInAsEmulatorGoogleAdmin(auth);
  expect(user.providerData.some(p=>p.providerId==='google.com')).toBe(true);
  expect(user.emailVerified).toBe(true);
  return {db,user,auth,app};
}
async function cleanup(client){
  if(!client)return;
  try{goOffline(client.db);}catch{}
  try{await signOut(client.auth);}catch{}
  try{await deleteApp(client.app);}catch{}
}
async function committedStatus(client,operationId,status){
  const result=await resolveDatasetOperation(client.db,operationId);
  expect(result).toMatchObject({status,operationId,generationId:'gen_'+operationId});
}
function settleNoThrow(promise){
  // A missing network ACK may leave the SDK in a reconnect/retry state.
  // No unhandled rejection; the independent observer is authoritative.
  const guarded=promise.then(value=>({type:'resolved',value}),
    error=>({type:'rejected',message:String(error)}));
  return guarded;
}

describe.skipIf(!active)('PR95 true network server->SDK CAS ACK suppression',()=>{
  let proxy;let client;
  beforeAll(async()=>{
    const initial=await ownerRequest(API);
    if(JSON.stringify(initial)!==JSON.stringify(candidate)){
      // Explicitly install unchanged checked-in candidate into disposable demo.
      await ownerRequest(API,candidate);
    }
    const loaded=await ownerRequest(API);
    expect(loaded).toEqual(candidate);
    proxy=await new NetworkAckFaultProxy().start();
    console.log('PR95_NETWORK_CANDIDATE_RULES_EXACT_PASS',JSON.stringify({
      source:'firebase/database.exclusive-candidate.rules.json',
      project:PROJECT,rulesVerified:true,production:false}));
  },30000);
  beforeEach(async()=>{
    await ownerRequest(DATA,{hdnd:{
      items:Object.fromEntries(legacy.map(x=>[x.recordId,x])),
      permissions:{columns:{note:true}},editLocks:null,
      freezeControl:{mode:'FROZEN',revision:2,epoch:1,actor:'test_admin',
        changedAt:100,closedAt:100,deadline:0}}});
    client=await makeClient(true);
  },30000);
  afterEach(async()=>{await cleanup(client);client=null;});
  afterAll(async()=>{if(proxy)await proxy.close();});

  it('drops actual server->SDK initial CAS response after independent COMMITTED observation',async()=>{
    const op='wire_initial_loss_0001';
    const approval=await prepareInitialDatasetActivation(client.db,client.user,rows('initial'),op,'first.xlsx');
    proxy.arm(op,1);
    const pending=settleNoThrow(commitInitialDatasetActivation(client.db,client.user,approval,
      'KHOI TAO V2 '+op+' 2 2'));
    const fault=await proxy.requireDroppedAck({timeoutMs:24000});
    expect(fault.ackDropped).toBe(true);
    expect(fault.independent.active.revision).toBe(1);
    expect(fault.casHashPresent).toBe(true);
    const observer=await makeClient(false);
    try{
      await committedStatus(observer,op,'committed-active');
      const before=await verifyState(op,1,1);
      goOffline(client.db);await wait(200);goOnline(client.db);
      await wait(800);
      // An explicit repeated call with the SAME operationId must be safe.
      const retry=await commitInitialDatasetActivation(observer.db,observer.user,approval,
        'KHOI TAO V2 '+op+' 2 2');
      expect(retry.status).toBe('already-committed');
      await verifyState(op,1,1);
      expect((await settleNoThrow(pending)).type).toMatch(/resolved|rejected/);
      console.log('PR95_WIRE_ACK_INITIAL_COMMITTED_NO_DUPLICATE_PASS',
        JSON.stringify({op,requestId:fault.requestId,serverRevision:before.active.revision,
          ackFramesForwarded:0,independentServer:true,operations:1,generations:1}));
    }finally{await cleanup(observer);}
  },80000);

  it('drops replacement server->SDK response after real CAS and does not duplicate on reconnect',async()=>{
    const base='wire_replace_seed_001';
    const initial=await prepareInitialDatasetActivation(client.db,client.user,rows('initial'),base,'first.xlsx');
    expect((await commitInitialDatasetActivation(client.db,client.user,initial,
      'KHOI TAO V2 '+base+' 2 2')).status).toBe('committed');
    const op='wire_replace_loss_001';
    const approval=await stageDatasetReplacement(client.db,client.user,rows('replace'),op,'second.xlsx');
    proxy.arm(op,2);
    const pending=settleNoThrow(commitDatasetReplacement(client.db,client.user,approval,
      'THAY '+op+' 2 2'));
    const fault=await proxy.requireDroppedAck({timeoutMs:24000});
    expect(fault.casHashPresent).toBe(true);
    const observer=await makeClient(false);
    try {
      await committedStatus(observer,op,'committed-active');
      await committedStatus(observer,base,'committed-historical');
      await verifyState(op,2,2);
      goOffline(client.db);await wait(200);goOnline(client.db);
      await wait(800);
      const result=await commitDatasetReplacement(observer.db,observer.user,approval,
        'THAY '+op+' 2 2');
      expect(result.status).toBe('already-committed');
      await verifyState(op,2,2);
      const caller=await Promise.race([pending,wait(1500).then(()=>({type:'pending'}))]);
      expect(['pending','resolved','rejected']).toContain(caller.type);
      console.log('PR95_WIRE_ACK_REPLACE_COMMITTED_NO_DUPLICATE_PASS',JSON.stringify({
        op,requestId:fault.requestId,revision:2,operations:2,ackFramesForwarded:0,
        independentServer:true}));
    }finally{await cleanup(observer);}
  },80000);

  it('drops restore server->SDK response after CAS and preserves immutable operation log',async()=>{
    const base='wire_restore_seed_001';
    const initial=await prepareInitialDatasetActivation(client.db,client.user,rows('initial'),base,'first.xlsx');
    await commitInitialDatasetActivation(client.db,client.user,initial,
      'KHOI TAO V2 '+base+' 2 2');
    const source='wire_restore_replace_001';
    const approval=await stageDatasetReplacement(client.db,client.user,rows('replace'),source,'second.xlsx');
    await commitDatasetReplacement(client.db,client.user,approval,'THAY '+source+' 2 2');
    const before=(await get(ref(client.db,DATASET_V2_PATH+'/active'))).val();
    const op='wire_restore_loss_001';
    proxy.arm(op,3);
    const pending=settleNoThrow(restoreDatasetBackup(client.db,client.user,
      source,op,before,'KHOI PHUC '+op));
    const fault=await proxy.requireDroppedAck({timeoutMs:24000});
    expect(fault.casHashPresent).toBe(true);
    const observer=await makeClient(false);
    try{
      await committedStatus(observer,op,'committed-active');
      await committedStatus(observer,source,'committed-historical');
      await verifyState(op,3,3);
      goOffline(client.db);await wait(200);goOnline(client.db);
      await wait(800);
      const retry=await restoreDatasetBackup(observer.db,observer.user,
        source,op,before,'KHOI PHUC '+op);
      expect(retry.status).toBe('already-committed');
      await verifyState(op,3,3);
      const caller=await Promise.race([pending,wait(1500).then(()=>({type:'pending'}))]);
      expect(['pending','resolved','rejected']).toContain(caller.type);
      console.log('PR95_WIRE_ACK_RESTORE_COMMITTED_NO_DUPLICATE_PASS',JSON.stringify({
        op,requestId:fault.requestId,revision:3,operations:3,ackFramesForwarded:0,
        independentServer:true}));
    }finally{await cleanup(observer);}
  },80000);
});
