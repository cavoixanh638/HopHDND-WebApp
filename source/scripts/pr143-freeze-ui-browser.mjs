/**
 * PR143: actual FreezeAdminPanel Chrome UI vs Auth+RTDB Emulator,
 * verified synthetic Google administrator and anonymous guest; no production.
 * Real Firebase SDK repository/leases/backend; read server (not SDK cache)
 * via privileged localhost-only Emulator REST. No production/deployment.
 *
 * Run from source/: node scripts/pr143-freeze-ui-browser.mjs
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
const gen='gen_pr143_freeze_ui_base_0001',op='pr143_freeze_ui_base_0001';
const rowId='pr143_v2a';
const base='hdnd/datasetV2';
const candidateFile=resolve('firebase/database.exclusive-candidate.rules.json');
const rules=JSON.parse(readFileSync(candidateFile,'utf8'));
const digest=json=>createHash('sha256').update(JSON.stringify(json)).digest('hex');
const expectedHash=digest(rules);
const tempDir=mkdtempSync(join(resolve('.'),'.pr143-freeze-chrome-'));
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
  [rowId]:{...row(rowId,1,'PR143-A'),note:'ACTIVE_V2_A'},
  pr143_v2b:{...row('pr143_v2b',2,'PR143-B'),note:'ACTIVE_V2_B'}
};
const initial={hdnd:{
  items:{pr143_legacy:{...row('pr143_legacy',1,'LEGACY-001'),note:'LEGACY_DIFFERENT_DATA'}},
  permissions:{columns:{note:true}},
  control:{revision:1,editingLocked:false,changedAt:'2026-11-01T00:00:00.000Z'},
  freezeControl:{mode:'OPEN',revision:1,epoch:0,actor:'administrator',changedAt:1,deadline:0,closedAt:0},
  datasetV2:{
    active:{generationId:gen,operationId:op,revision:1,rowCount:2,digest:'a'.repeat(64)},
    generations:{[gen]:{items:rows}},
    permissions:{[gen]:{columns:{note:true}}},
    operations:{[op]:{status:'COMMITTED',from:'legacy',to:gen,at:1}}
  }
}};
const images=[],evidence=[];
const evidenceDir=resolve('qa-results/pr143-freeze-ui');
import {mkdirSync} from 'node:fs';
mkdirSync(evidenceDir,{recursive:true});
const hashRows=x=>createHash('sha256').update(
  JSON.stringify(Object.keys(x??{}).sort().map(id=>[id,x[id]]))).digest('hex');
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
let diagnosticTarget=null;
const targets=[];
let failed=false;
const step=(name,details)=>{evidence.push({name,details});console.log('PR143_FREEZE_CHROME_'+name+' '+JSON.stringify(details));};
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
    const res=await fetch('http://127.0.0.1:4179/pr143-freeze.html',
      {signal:AbortSignal.timeout(1400)});
    return res.ok&&(await res.text()).includes('pr143-freeze-ui-browser-entry.tsx');
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
  const url=encodeURIComponent('http://127.0.0.1:4179/pr143-freeze.html');
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
    return evalExpression('window.__pr143FreezeUi.'+name+'(...'+JSON.stringify(args)+')');
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
const syntheticState=async()=>{
  const hdnd=await request('hdnd');
  const pointer=hdnd.datasetV2?.active??null;
  const legacy=hdnd.items??{};
  const current=pointer?hdnd.datasetV2.generations?.[pointer.generationId]?.items??{}:legacy;
  const leases=pointer?hdnd.datasetV2.leases?.[pointer.generationId]??{}:{};
  const activeLeases=Object.values(leases).flatMap(fields=>Object.values(fields))
    .filter(lease=>lease?.expiresAt>Date.now()).length;
  return {pointer,freeze:hdnd.freezeControl,receipts:hdnd.freezeReceipts??null,
    currentCount:Object.keys(current).length,currentHash:hashRows(current),
    legacyCount:Object.keys(legacy).length,legacyHash:hashRows(legacy),activeLeases};
};
const loadRules=async target=>{
  const reply=await fetch(settings,{method:'PUT',headers:{
    Authorization:'Bearer owner','Content-Type':'application/json'},
    body:JSON.stringify(target),signal:AbortSignal.timeout(10000)});
  if(!reply.ok)throw Error('Demo Emulator refused temporary Rules '+reply.status);
  assert.ok(isDeepStrictEqual(await liveRules(),target));
};
async function snapshot(A){return A.call('snapshot');}
async function click(A,label){
  const cmd='(()=>{const el=document.querySelector(".approval-control");'+
    'if(!el)throw Error("Freeze panel not visible");'+
    'const btn=[...el.querySelectorAll("button")].find(x=>x.textContent.includes('+JSON.stringify(label)+'));'+
    'if(!btn||btn.disabled)throw Error("Missing or disabled button: "+'+JSON.stringify(label)+');'+
    'btn.click();return btn.textContent})()';
  return A.eval(cmd);
}
async function screenshot(A,label){
  const x=await A.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  assert.ok(x.data?.length>200,'Expected genuine Chrome screenshot');
  const file=join(evidenceDir,label+'.png');
  writeFileSync(file,Buffer.from(x.data,'base64'));
  images.push(file);
  step('SCREENSHOT',{label,file});
}
async function reset(A){
  await loadRules(rules);
  await request('','PUT',initial);
  await A.send('Page.reload',{ignoreCache:true});
  await sleepUntil(()=>A.eval('Boolean(window.__pr143FreezeUi)&&document.readyState==="complete"'),
    'Reload React UI bridge',30000);
  await A.call('login');
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return x.isAdmin&&x.panelVisible&&x.datasetEpochReady&&x.connected&&
      x.generationId===gen&&x.freezeMode==='OPEN'?x:false;
  },'verified Admin Chrome/RTDB OPEN state',30000);
}
async function exercise(){
  await startEmulators();
  await startVite();
  const [infoA,infoB]=await launchChrome();
  const A=connection(infoA),B=connection(infoB);
  targets.push(A,B);
  diagnosticTarget=A;
  await A.send('Runtime.enable');
  await A.send('Page.enable');
  await A.send('Emulation.setDeviceMetricsOverride',{width:1240,height:850,deviceScaleFactor:1,mobile:false});
  try{
    await sleepUntil(()=>A.eval('Boolean(window.__pr143FreezeUi)'),'Browser bridge',30000);
  }catch(e){
    console.error('PR143_BRIDGE_DIAGNOSTIC',JSON.stringify({
      lastChromeException:A.getError(),
      title:await A.eval('document.title').catch(err=>String(err)),
      html:await A.eval('document.documentElement.outerHTML.slice(0,2000)').catch(err=>String(err)),
      vite: webLog.slice(-2500)
    }));
    throw e;
  }
  await sleepUntil(async()=>{const x=await snapshot(A);return x.ready&&!x.isAdmin?x:false;},
    'real Firebase anonymous guest',20000);
  assert.equal((await snapshot(A)).panelVisible,false);
  step('GUEST_HIDDEN_PASS',{chrome:true,isAdmin:false,controlVisible:false});
  await reset(A);
  step('ADMIN_VISIBLE_PASS',{chrome:true,view:await snapshot(A)});

  // F1/F2: real V2 lease, manual inspection and orderly drain.
  await A.call('acquire');
  assert.equal((await syntheticState()).activeLeases,1);
  await click(A,'Kiểm tra phiên sửa');
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return x.content.includes('1 ô còn phiên sửa hợp lệ')&&x.content.includes(gen)?x:false;
  },'F1 correct active V2 count');
  assert.equal((await snapshot(A)).error,'');
  step('F1_PASS',{server:await syntheticState(),view:await snapshot(A)});
  await click(A,'Yêu cầu lưu rồi chốt');
  await sleepUntil(async()=>{const x=await snapshot(A);return x.freezeMode==='DRAINING'?x:false;},
    'F2 entered DRAINING');
  await sleep(3900);
  assert.equal((await syntheticState()).freeze.mode,'DRAINING');
  assert.ok(!(await snapshot(A)).status.includes('CHỐT THÔNG THƯỜNG'));
  await A.call('release');
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return x.freezeMode==='FROZEN'&&x.status.includes('CHỐT THÔNG THƯỜNG')?x:false;
  },'F2 orderly close after lease release',25000);
  const orderly=await syntheticState();
  assert.equal(orderly.receipts?.[String(orderly.freeze.epoch)]?.closeKind,'orderly');
  assert.equal(orderly.receipts?.[String(orderly.freeze.epoch)]?.sha256,orderly.currentHash);
  await screenshot(A,'pr143-f2-orderly-pass');
  step('F2_PASS',{server:orderly,view:await snapshot(A)});

  // F3: emergency with an active lease, source-accurate V2 receipt.
  await reset(A);
  await A.call('acquire');
  await click(A,'Đóng băng khẩn cấp');
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return x.freezeMode==='FROZEN'&&x.status.includes('CƯỠNG BỨC')?x:false;
  },'F3 forced-close receipt',23000);
  const forced=await syntheticState(),fr=forced.receipts?.[String(forced.freeze.epoch)];
  assert.equal(fr?.closeKind,'forced');
  assert.equal(fr?.datasetV2?.generationId,gen);
  assert.equal(fr?.rows,2);
  assert.equal(fr?.sha256,forced.currentHash);
  assert.notEqual(fr?.sha256,forced.legacyHash);
  assert.equal(forced.activeLeases,1);
  assert.ok((await snapshot(A)).status.includes('có thể còn nháp chưa lưu'));
  await screenshot(A,'pr143-f3-emergency-pass');
  step('F3_PASS',{server:forced,view:await snapshot(A)});

  // F4: actual authorized V2 parent CAS; old receipt becomes historical.
  const swapped=await A.call('swap');
  assert.equal(swapped.status,'committed');
  assert.notEqual(swapped.generationId,gen);
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return x.generationId===swapped.generationId&&x.status.includes('lịch sử')?x:false;
  },'F4 pointer swap invalidates old receipt',22000);
  const historical=await snapshot(A);
  assert.ok(historical.content.includes('Chưa xác minh số khóa'));
  assert.ok(!historical.status.includes('Đã ĐÓNG BĂNG'));
  const history=await syntheticState();
  assert.equal(history.receipts?.[String(history.freeze.epoch)]?.datasetV2?.generationId,gen);
  await screenshot(A,'pr143-f4-historical-pass');
  step('F4_PASS',{realParentCas:true,swap:swapped,server:history,view:historical});

  // F5a: deny read only in disposable emulator; click must catch error.
  await reset(A);
  const deniedRead=structuredClone(rules);
  deniedRead.rules.hdnd.datasetV2['.read']=false;
  deniedRead.rules.hdnd.datasetV2.active['.read']=false;
  await loadRules(deniedRead);
  await click(A,'Kiểm tra phiên sửa');
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return x.error&&x.content.includes('Chưa xác minh số khóa')?x:false;
  },'F5 denied read surfaces alert',18000);
  assert.deepEqual(await A.call('errors'),[],'Unhandled UI rejection');
  assert.ok(!(await snapshot(A)).status.includes('Đã ĐÓNG BĂNG'));
  await screenshot(A,'pr143-f5-read-error-pass');
  step('F5_DENIED_READ_PASS',{view:await snapshot(A),temporaryRules:true});

  // F5b: genuine Firebase SDK goOffline, no cached count allowed.
  await reset(A);
  await click(A,'Kiểm tra phiên sửa');
  await sleepUntil(async()=>{const x=await snapshot(A);return x.content.includes('0 ô còn')?x:false;},
    'online current count');
  await A.call('offline');
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return !x.connected&&x.content.includes('Chưa xác minh số khóa')?x:false;
  },'F5 offline invalidation',16000);
  assert.ok((await snapshot(A)).error.includes('Mất kết nối'));
  await screenshot(A,'pr143-f5-disconnect-pass');
  step('F5_DISCONNECT_PASS',{view:await snapshot(A)});
  await A.call('online');

  // F5c: server FROZEN ACK, denied receipt by test-only Rules.
  await reset(A);
  const blockedReceipt=structuredClone(rules);
  blockedReceipt.rules.hdnd.freezeReceipts['$epoch']['.write']='false';
  await loadRules(blockedReceipt);
  await click(A,'Đóng băng khẩn cấp');
  await sleepUntil(async()=>{
    const x=await snapshot(A);
    return x.freezeMode==='FROZEN'&&x.error.includes('BIÊN NHẬN CHƯA XÁC MINH')?x:false;
  },'F5 receipt rejected after frozen ACK',22000);
  const noReceipt=await syntheticState();
  assert.equal(noReceipt.freeze.mode,'FROZEN');
  assert.equal(noReceipt.receipts,null);
  assert.ok(!(await snapshot(A)).status.includes('Đã ĐÓNG BĂNG'));
  assert.deepEqual(await A.call('errors'),[]);
  await screenshot(A,'pr143-f5-receipt-unverified-pass');
  step('F5_RECEIPT_UNVERIFIED_PASS',{server:noReceipt,view:await snapshot(A)});
  await loadRules(rules);
  step('CHROME_EMULATOR_FINAL_PASS',{realBrowser:true,
    groups:['guest','F1','F2','F3','F4 real CAS','F5 read denial','F5 offline','F5 receipt denial'],
    screenshots:images.length});
}

try{
  await exercise();
}catch(error){
  failed=true;
  console.error('PR143_FREEZE_CHROME_FAIL:',error);
  if(diagnosticTarget)try{await screenshot(diagnosticTarget,'pr143-freeze-ui-failure');}catch(e){
    console.error('PR143_FAILURE_SCREENSHOT_UNAVAILABLE',String(e));
  }
  process.exitCode=1;
}finally{
  for(const t of targets)try{t.ws.close()}catch{}
  for(const p of [chrome,web,emu])try{if(p&&p.exitCode===null)p.kill('SIGTERM')}catch{}
  await sleep(300);
  try{writeFileSync(join(evidenceDir,'witness.json'),JSON.stringify({
    base:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847',
    head:process.env.GITHUB_SHA??null,project,rulesSha256:expectedHash,
    result:failed?'FAIL':'PASS',steps:evidence,images,syntheticOnly:true
  },null,2));}catch{}
  rmSync(tempDir,{recursive:true,force:true,maxRetries:6,retryDelay:100});
  if(failed)console.error('PR143_FREEZE_CHROME_DEBUG',JSON.stringify({
    emulatorLog:emulatorLog.slice(-2500),viteLog:webLog.slice(-1500),chromeLog:chromeLog.slice(-1000)}));
}
