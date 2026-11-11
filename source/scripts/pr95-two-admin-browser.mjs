/**
 * PR95 Luồng 3: two independently attached REAL Chrome DevTools targets,
 * same Google admin UID from Auth Emulator, separate tab lease sessions.
 * Real Firebase SDK repository/leases/backend; read server (not SDK cache)
 * via privileged localhost-only Emulator REST. No production/deployment.
 *
 * Run from source/: node scripts/pr95-two-admin-browser.mjs
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {isDeepStrictEqual} from 'node:util';

const ROOT='http://127.0.0.1:9000';
const AUTH='http://127.0.0.1:9099';
const NS='demo-hdnd';
const project='demo-hdnd';
const gen='gen_pr95_two_tabs_seed_0001',op='pr95_two_tabs_seed_0001';
const rowId='pr95_two_tabs_row_001';
const base='hdnd/datasetV2';
const candidateFile=resolve('firebase/database.exclusive-candidate.rules.json');
const rules=JSON.parse(readFileSync(candidateFile,'utf8'));
const digest=json=>createHash('sha256').update(JSON.stringify(json)).digest('hex');
const expectedHash=digest(rules);
const tempDir=mkdtempSync(join(resolve('.'),'.pr95-l3-two-tabs-'));
const config=join(tempDir,'firebase.json');
writeFileSync(config,JSON.stringify({database:{rules:candidateFile},emulators:{
  database:{host:'127.0.0.1',port:9000},auth:{host:'127.0.0.1',port:9099},
  ui:{enabled:false},singleProjectMode:true}},null,2));
const row=(id,stt,displayCode)=>({
  recordId:id,stt,displayCode,documentKind:'NQ',isDropped:false,
  revision:1,content:'Nội dung V2 gốc '+displayCode,
  department:'Sở kiểm thử',type:'QPPL',partyLevel:'BTV',
  progressParty:'Sở chưa trình',progressBuild:'',progressCouncil:'',
  specialist:'',room:'',vpLeader:'',ubndLeader:'',
  specificProgress:'Tiến độ gốc',note:'Ghi chú gốc',
  operationId:op,updatedBy:'test-seed',updatedAt:1
});
const rows={
  [rowId]:row(rowId,1,'NQ01'),
  pr95_two_tabs_row_002:row('pr95_two_tabs_row_002',2,'NQ02')
};
const initial={
  hdnd:{
    freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:'l3-test',changedAt:1,deadline:0,closedAt:0},
    datasetV2:{
      active:{generationId:gen,operationId:op,revision:1,rowCount:2,digest:'a'.repeat(64)},
      generations:{[gen]:{items:rows}},
      permissions:{[gen]:{columns:{note:true,specificProgress:true}}}
    }
  }
};
const sleepUntil=async(pred,label,max=15000)=>{
  const end=Date.now()+max;
  while(Date.now()<end){try{const val=await pred();if(val)return val;}catch{}await sleep(125);}
  throw Error('Timeout: '+label);
};
const request=async(path,method='GET',body)=>{
  const url=ROOT+'/'+path.replace(/^\//,'')+'.json?ns='+NS;
  const reply=await fetch(url,{method,headers:{Authorization:'Bearer owner',
    'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),
    signal:AbortSignal.timeout(10000)});
  if(!reply.ok)throw Error('Emulator REST '+method+' '+path+' HTTP '+reply.status+
    ' '+(await reply.text()).slice(0,300));
  return reply.json();
};
const settings=ROOT+'/.settings/rules.json?ns='+NS;
async function liveRules(){
  const r=await fetch(settings,{headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(6000)});
  if(!r.ok)throw Error('Could not inspect live Rules '+r.status);
  return r.json();
}
let emu,web,chrome,emulatorLog='',webLog='',chromeLog='';
const targets=[];
let failed=false;
const step=(name,details)=>console.log('PR95_L3_'+name+' '+JSON.stringify(details));
async function startEmulators(){
  emu=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js',
    'emulators:start','--project',project,'--only','database,auth',
    '--config',config],{stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true'}});
  for(const stream of [emu.stdout,emu.stderr])stream.on('data',x=>{
    emulatorLog=(emulatorLog+String(x)).slice(-12000);
  });
  emu.on('error',e=>{emulatorLog+=' '+e;});
  await sleepUntil(async()=>{
    if(emu.exitCode!==null)throw Error('Emulator died '+emulatorLog);
    const p=await fetch('http://127.0.0.1:4400/emulators',{signal:AbortSignal.timeout(1200)});
    if(!p.ok)return false;
    const x=await p.json();return x.auth?.port===9099&&x.database?.port===9000;
  },'Emulator ready',30000);
  const before=await liveRules();
  step('RULES_STARTUP',{sameCandidate:isDeepStrictEqual(before,rules),hash:digest(before)});
  const put=await fetch(settings,{method:'PUT',headers:{Authorization:'Bearer owner',
    'Content-Type':'application/json'},body:JSON.stringify(rules),signal:AbortSignal.timeout(8000)});
  if(!put.ok)throw Error('Cannot install local candidate Rules '+put.status);
  await checkRules('before-two-tabs');
  await request('', 'PUT',initial);
  const read=await request('');
  assert.deepEqual(read.hdnd.datasetV2.active,initial.hdnd.datasetV2.active);
  assert.equal(Object.keys(read.hdnd.datasetV2.generations[gen].items).length,2);
  step('SERVER_SEED_PASS',{generationId:gen,rows:2});
}
async function checkRules(phase){
  const actual=await liveRules();
  assert.ok(isDeepStrictEqual(actual,rules),'Live Rules must match source JSON');
  assert.equal(digest(actual),expectedHash);
  step('RULES_EXACT_PASS',{phase,sha256:expectedHash,project,namespace:NS});
}
async function startVite(){
  web=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','pages-test',
    '--host','127.0.0.1','--port','4179','--strictPort'],{
    stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true'}});
  for(const stream of [web.stdout,web.stderr])stream.on('data',x=>{
    webLog=(webLog+String(x)).slice(-10000);
  });
  web.on('error',e=>{webLog+=' '+e});
  await sleepUntil(async()=>{
    if(web.exitCode!==null)throw Error('Vite terminated '+webLog);
    const res=await fetch('http://127.0.0.1:4179/pr95-two-admin.html',
      {signal:AbortSignal.timeout(1400)});
    return res.ok&&(await res.text()).includes('pr95-two-admin-browser-entry.tsx');
  },'Test-only Vite page',20000);
}
async function port(){
  const probe=createServer();
  await new Promise((resolve,reject)=>{
    probe.once('error',reject);probe.listen(0,'127.0.0.1',resolve);
  });
  const p=probe.address().port;
  await new Promise(resolve=>probe.close(resolve));
  return p;
}
async function launchChrome(){
  const chromeBinary=['google-chrome','google-chrome-stable','chromium','chromium-browser']
    .find(x=>spawnSync('which',[x]).status===0);
  if(!chromeBinary)throw Error('Chrome/Chromium executable missing');
  const dbg=await port();
  chrome=spawn(chromeBinary,[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+dbg,
    '--user-data-dir='+join(tempDir,'chrome'),
    'about:blank'],{stdio:['ignore','ignore','pipe'],env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
  chrome.stderr.on('data',x=>{chromeLog=(chromeLog+String(x)).slice(-8000)});
  const server='http://127.0.0.1:'+dbg;
  await sleepUntil(async()=>{
    if(chrome.exitCode!==null)throw Error('Chrome died '+chromeLog);
    const res=await fetch(server+'/json/version',{signal:AbortSignal.timeout(1000)});
    return res.ok;
  },'Chrome DevTools endpoint',20000);
  const url=encodeURIComponent('http://127.0.0.1:4179/pr95-two-admin.html');
  const a=await (await fetch(server+'/json/new?'+url,{method:'PUT'})).json();
  const b=await (await fetch(server+'/json/new?'+url,{method:'PUT'})).json();
  assert.ok(a.id&&b.id&&a.id!==b.id&&a.webSocketDebuggerUrl&&b.webSocketDebuggerUrl,
    'Two independent Chrome page targets required');
  step('CHROME_TWO_TARGETS',{targetA:a.id,targetB:b.id,distinct:true,
    url:'localhost/pages-test-only',note:'Same browser Chrome process, different real CDP targets'});
  return [a,b];
}
function connection(target){
  const ws=new WebSocket(target.webSocketDebuggerUrl);
  let serial=0;
  const pending=new Map();
  let fatal=null;
  let ready;
  ready=new Promise((resolve,reject)=>{
    ws.addEventListener('open',resolve,{once:true});
    ws.addEventListener('error',reject,{once:true});
  });
  ws.addEventListener('message',event=>{
    const msg=JSON.parse(event.data);
    if(msg.id&&pending.has(msg.id)){
      const {resolve,reject}=pending.get(msg.id);pending.delete(msg.id);
      if(msg.error)reject(Error(JSON.stringify(msg.error)));else resolve(msg.result);
    }
    if(msg.method==='Runtime.exceptionThrown')fatal=JSON.stringify(msg.params);
  });
  async function send(method,params={}){
    await ready;
    return new Promise((resolve,reject)=>{
      const id=++serial;
      pending.set(id,{resolve,reject});
      ws.send(JSON.stringify({id,method,params}));
      setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP '+method+' timeout'));}},30000);
    });
  }
  async function evalExpression(expr){
    const res=await send('Runtime.evaluate',{expression:expr,returnByValue:true,
      awaitPromise:true});
    if(res.exceptionDetails)throw Error('Browser '+target.id+': '+
      res.exceptionDetails.text+' '+(res.exceptionDetails.exception?.description??''));
    return res.result?.value;
  }
  async function call(name,...args){
    return evalExpression('window.__pr95TwoAdmin.'+name+'(...'+JSON.stringify(args)+')');
  }
  return {targetId:target.id,ws,send,eval:evalExpression,call,getError:()=>fatal};
}
const timeoutCall=async(target,method,...args)=>{
  const result=await target.call(method,...args);
  if(result===undefined)throw Error('Method '+method+' returned undefined');
  return result;
};
async function checkDenied(promise,label){
  try{await promise;throw Error('Unexpectedly allowed '+label);}
  catch(e){
    if(String(e).includes('Unexpectedly allowed'))throw e;
    step('EXPECTED_DENIAL',{label,reason:String(e).slice(0,230)});
  }
}
async function exercise(){
  await startEmulators();
  await startVite();
  const [infoA,infoB]=await launchChrome();
  const A=connection(infoA),B=connection(infoB);
  targets.push(A,B);
  await Promise.all(targets.map(async t=>{
    await t.send('Runtime.enable');
    await sleepUntil(()=>t.eval('Boolean(window.__pr95TwoAdmin)'),'Browser bridge '+t.targetId,22000);
  }));
  const [adminA,adminB]=await Promise.all([A.call('login'),B.call('login')]);
  assert.equal(adminA.uid,adminB.uid);
  assert.equal(adminA.emailVerified,true);
  assert.ok(adminA.providerIds.includes('google.com'));
  const [tabA,tabB]=await Promise.all([A.call('attach'),B.call('attach')]);
  assert.equal(tabA.uid,tabB.uid);
  assert.notEqual(tabA.session,tabB.session);
  assert.equal(tabA.generationId,gen);
  step('SAME_ADMIN_UID_PASS',{uid:tabA.uid,targetA:A.targetId,targetB:B.targetId,
    sessionA:tabA.session,sessionB:tabB.session,provider:'google.com'});

  const aNote=await A.call('prepare','note','TAB-A FIRST');
  const bStale=await B.call('prepare','note','TAB-B STALE');
  const aLease=await A.call('acquire','note');
  assert.equal(aLease.uid,tabA.uid);
  // Lease manager owns a separate, private tabSession from the harness page id.
  // Compare genuine server lease sessions across both targets after handoff.
  await checkDenied(B.call('acquire','note'),'same cell simultaneous lease');
  const renewed=await A.call('renew','note');
  assert.equal(renewed.token,aLease.token);
  assert.ok(renewed.revision>aLease.revision);
  const first=await A.call('savePrepared',aNote.key);
  assert.equal(first.ok,true,JSON.stringify(first));
  let persisted=await request(base+'/generations/'+gen+'/items/'+rowId);
  assert.equal(persisted.note,'TAB-A FIRST');
  assert.equal(persisted.revision,2);
  assert.equal(persisted.editProofs.note,aLease.token);
  assert.equal(persisted.history['2'].actor,tabA.uid);
  assert.equal(persisted.history['2'].changes.note,'TAB-A FIRST');
  assert.equal(persisted.history['2'].oldValues.note,'Ghi chú gốc');
  const released=await A.call('finish','note');
  assert.equal(released.expiresAt,0);
  const bLease=await B.call('acquire','note');
  assert.notEqual(bLease.token,aLease.token);
  assert.notEqual(bLease.session,aLease.session,'Real lease sessions must differ even for same UID');
  const stale=await B.call('savePrepared',bStale.key);
  assert.equal(stale.ok,false,'Old baseValue must not silently overwrite latest note');
  await B.call('cancel','note');
  assert.equal((await request(base+'/generations/'+gen+'/items/'+rowId)).note,'TAB-A FIRST');
  step('SAME_CELL_LEASE_CONFLICT_PASS',{firstRevision:2,firstAudit:'server',
    renewalRevision:renewed.revision,releaseTombstone:true,
    secondTabStaleSaveDenied:true});

  const bFresh=await B.call('prepare','note','TAB-B NEW');
  const freshLease=await B.call('acquire','note');
  const second=await B.call('savePrepared',bFresh.key);
  assert.equal(second.ok,true,JSON.stringify(second));
  await B.call('finish','note');
  persisted=await request(base+'/generations/'+gen+'/items/'+rowId);
  assert.equal(persisted.revision,3);
  assert.equal(persisted.history['3'].actor,tabB.uid);
  assert.equal(persisted.history['3'].changes.note,'TAB-B NEW');
  assert.equal(persisted.history['3'].oldValues.note,'TAB-A FIRST');
  assert.equal(persisted.editProofs.note,freshLease.token);
  step('SAME_CELL_SERIAL_SAVE_PASS',{serverRevision:3,historySlots:['2','3']});

  const [pa,pb]=await Promise.all([
    A.call('prepare','note','TAB-A IN PARALLEL'),
    B.call('prepare','specificProgress','TAB-B OTHER FIELD')
  ]);
  const [la,lb]=await Promise.all([A.call('acquire','note'),B.call('acquire','specificProgress')]);
  assert.notEqual(la.token,lb.token);
  const both=await Promise.all([A.call('savePrepared',pa.key),B.call('savePrepared',pb.key)]);
  assert.deepEqual(both.map(x=>x.ok),[true,true],'Independent cells must both save');
  persisted=await request(base+'/generations/'+gen+'/items/'+rowId);
  assert.equal(persisted.revision,5);
  assert.equal(persisted.note,'TAB-A IN PARALLEL');
  assert.equal(persisted.specificProgress,'TAB-B OTHER FIELD');
  assert.deepEqual(new Set([persisted.history['4'].operationId,
    persisted.history['5'].operationId]),new Set([pa.operationId,pb.operationId]));
  assert.deepEqual(new Set([persisted.history['4'].actor,persisted.history['5'].actor]),
    new Set([tabA.uid]));
  await Promise.all([A.call('finish','note'),B.call('finish','specificProgress')]);
  step('DIFFERENT_CELLS_CONCURRENT_PASS',{revision:5,changedBoth:true,
    history4:persisted.history['4'].changes,history5:persisted.history['5'].changes});

  // Leave an OLD generation lease/draft/patch alive during a real backend CAS.
  const oldLease=await B.call('acquire','note');
  const oldPatch=await B.call('prepare','note','MUST NOT LEAK TO NEW GENERATION');
  const oldDraft=await B.call('preserveDraft','note','UNSAVED OLD GENERATION');
  assert.equal(oldDraft.recovered,'UNSAVED OLD GENERATION');
  const operation='pr95_two_tabs_swap_0001';
  const staged=await A.call('stageNewGeneration',operation);
  assert.equal(staged.previous,gen);
  // Exercise REAL useWorkspace draft state in Tab B (not only a manager's
  // per-cell local recovery key). Commit immediately before its auto-save
  // timer; any unexpected stale write must fail the generation fence.
  const beforeWorkspace=await B.call('workspaceSnapshot');
  assert.equal(beforeWorkspace.items,2,'Real workspace must load the old V2 generation');
  await B.call('workspaceDraft',rowId,'note','UI UNSAVED DRAFT FROM OLD GEN');
  const uiDraft=await sleepUntil(async()=>{
    const snapshot=await B.call('workspaceSnapshot');
    return snapshot.drafts===1?snapshot:false;
  },'unsaved React workspace draft',600);
  assert.ok(uiDraft.sourceKey.includes(gen));
  step('OLD_WORKSPACE_DRAFT_CREATED',{sourceKey:uiDraft.sourceKey,drafts:uiDraft.drafts});
  const swapped=await A.call('commitStaged',staged.approval);
  assert.equal(swapped.status,'committed');
  const newGen='gen_'+operation;
  const pointer=await request(base+'/active');
  assert.equal(pointer.generationId,newGen);
  assert.equal(pointer.revision,2);
  const newRowBefore=await request(base+'/generations/'+newGen+'/items/'+rowId);
  assert.equal(newRowBefore.note,'MỚI: '+operation);
  const denied=await B.call('savePrepared',oldPatch.key);
  assert.equal(denied.ok,false);
  const newRowAfter=await request(base+'/generations/'+newGen+'/items/'+rowId);
  assert.deepEqual(newRowAfter,newRowBefore,
    'Stale old-gen edit must not touch active new-generation row');
  // Even a direct call bypassing the closed SessionManager must be fenced
  // by the NEW client-side server-active check in renewCellLease.
  await checkDenied(B.call('rawRenew',oldLease,'note',rowId,gen),
    'direct renewal of a stale generation lease');
  await checkDenied(B.call('renew','note',rowId,gen),'renew old inactive generation lease');
  await checkDenied(B.call('acquire','note',rowId,gen),'acquire old inactive generation lease');
  const boundNew=await B.call('attach');
  assert.equal(boundNew.generationId,newGen);
  assert.equal(await B.call('recoverDraft','note',rowId,newGen),null,
    'Old draft cannot be recovered under new generation even when ID reused');
  await sleepUntil(async()=>{
    const state=await B.call('workspaceSnapshot');
    return state.sourceKey.includes(newGen)&&state.drafts===0&&state.items===2?state:false;
  },'Workspace source rebind and stale draft fence',14000);
  const oldRow=await request(base+'/generations/'+gen+'/items/'+rowId);
  assert.equal(oldRow.note,'TAB-A IN PARALLEL');
  await checkRules('after-two-admin-targets');
  step('GENERATION_STALE_DRAFT_LEASE_FENCED_PASS',{oldGeneration:gen,newGeneration:newGen,
    oldLeaseToken:oldLease.token,activeRevision:pointer.revision,
    newRowUnchanged:true,oldDraftNotRestored:true,oldTabSaveDenied:true,
    oldWorkspaceDraftCleared:true,directStaleLeaseRenewalDenied:true});
  step('TWO_REAL_ADMIN_CHROME_TARGETS_PASS',{targetA:A.targetId,targetB:B.targetId,
    sharedAdminUid:tabA.uid,serverRowRevisionBeforeSwap:5,
    checkedServerHistories:4,activeGeneration:newGen,
    candidateRulesSha256:expectedHash,syntheticOnly:true});
}
try{
  await exercise();
}catch(error){
  failed=true;
  console.error('PR95_L3_TWO_ADMIN_TABS_FAIL:',error);
  process.exitCode=1;
}finally{
  for(const t of targets)try{t.ws.close()}catch{}
  for(const p of [chrome,web,emu])try{if(p&&p.exitCode===null)p.kill('SIGTERM')}catch{}
  await sleep(300);
  rmSync(tempDir,{recursive:true,force:true,maxRetries:6,retryDelay:100});
  if(failed)console.error('PR95_L3_DEBUG',JSON.stringify({
    emulatorLog:emulatorLog.slice(-2500),viteLog:webLog.slice(-1500),chromeLog:chromeLog.slice(-1000)}));
}
