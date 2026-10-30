// Headless Chromium smoke against a locally served, built Pages TEST artifact.
// Real demo Firebase Auth + RTDB emulators serve synthetic versioned rows.
// This script never touches production Firebase or Google Sheets.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import * as XLSX from 'xlsx';

// L3-AUDIT-GAP-01: the pages-test Firebase bootstrap is pinned to demo-hdnd
// on loopback 9000/9099. A separate runtime-only Emulator config MUST load
// the immutable exclusive-candidate Rules file rather than firebase.json's
// old database.rules.json. Keep the original source Rules entirely unchanged.
// Run the real Rules with both emulators for the full Chrome smoke.
const EMULATOR_PROJECT='demo-hdnd';
const EMULATOR_DB='http://127.0.0.1:9000';
const EMULATOR_AUTH='http://127.0.0.1:9099';
const EMULATOR_NAMESPACE='demo-hdnd';
const EMULATOR_ROOT=EMULATOR_DB+'/.json?ns='+EMULATOR_NAMESPACE;
// Admin Bearer owner is used ONLY to install exact Rules and seed synthetic
// localhost demo data. All guest assertions use genuine anonymous ID tokens.
const EXCLUSIVE_RULES_FILE=resolve('firebase/database.exclusive-candidate.rules.json');
const expectedRules=JSON.parse(readFileSync(EXCLUSIVE_RULES_FILE,'utf8'));
const rulesDigest=createHash('sha256').update(JSON.stringify(expectedRules)).digest('hex');
// Firebase resolves the rules relative to its --config file: use an ABSOLUTE
// source Rules path and a temporary isolated config; never change firebase.json.
// The Firebase CLI determines its project root from the config location.
// Put this runtime-only config UNDER source/, not /tmp/, to preserve the
// existing project root while selecting the exclusive candidate Rules file.
const emulatorConfigDir=mkdtempSync(join(resolve('.'),'.pr95-browser-exclusive-rules-'));
const emulatorConfigFile=join(emulatorConfigDir,'firebase.json');
writeFileSync(emulatorConfigFile,JSON.stringify({
  database:{rules:EXCLUSIVE_RULES_FILE},
  emulators:{
    database:{host:'127.0.0.1',port:9000},
    auth:{host:'127.0.0.1',port:9099},
    ui:{enabled:false},
    singleProjectMode:true
  }
},null,2));
const PRIVATE_MARKER='PR95_PRIVATE_EMULATOR_ONLY_NEVER_EXPOSE';
const SMOKE_OPERATION='pr95_browser_smoke_20261030';
const SMOKE_GENERATION='gen_'+SMOKE_OPERATION;
const INACTIVE_GENERATION='gen_pr95_browser_inactive_20261030';
const firebaseRows=[
  {displayCode:'NQ01',stt:1,content:'Nội dung kiểm thử smoke',
    department:'Sở kiểm thử',type:'QPPL',partyLevel:'BTV',
    progressParty:'Sở chưa trình',progressBuild:'Trình xây dựng NQ',
    progressCouncil:'Đã trình HĐND',specialist:'Chuyên viên mẫu',
    room:'Phòng mẫu',vpLeader:'PCVP Nguyễn Ngọc Hùng',
    ubndLeader:'PCT Trần Văn Quân',specificProgress:'Sở đang thực hiện',
    note:'Ghi chú nguồn O'},
  // This is a genuine Firebase item, not a malformed empty Excel row:
  // required content/displayCode are set to a dash, optional fields remain empty.
  {displayCode:'—',stt:2,content:'—',department:'',type:'QPPL',
    partyLevel:'',progressParty:'',progressBuild:'',progressCouncil:'',
    specialist:'',room:'',vpLeader:'',ubndLeader:'',specificProgress:'',note:''},
  ...Array.from({length:52},(_,i)=>({
    displayCode:'NQ'+(i+3),stt:i+3,content:'Nội dung kiểm thử thêm '+(i+3),
    department:'Sở kiểm thử',type:'QPPL',partyLevel:'',
    progressParty:'',progressBuild:'',progressCouncil:'',
    specialist:'',room:'',vpLeader:'',ubndLeader:'',specificProgress:'',note:''
  }))
].map((row,index)=>({
  recordId:'pr95_smoke_'+String(index+1).padStart(3,'0'),
  documentKind:'NQ',isDropped:false,revision:1,...row
}));
const firebaseSeed={hdnd:{datasetV2:{
  active:{generationId:SMOKE_GENERATION,operationId:SMOKE_OPERATION,
    revision:1,rowCount:firebaseRows.length,digest:'a'.repeat(64)},
  generations:{
    [SMOKE_GENERATION]:{items:Object.fromEntries(firebaseRows.map(row=>[row.recordId,row]))},
    [INACTIVE_GENERATION]:{items:{private_stale_row:{...firebaseRows[0],
      recordId:'private_stale_row',displayCode:'SECRET_STALE',content:PRIVATE_MARKER}}}
  },
  permissions:{[SMOKE_GENERATION]:{columns:{}}},
  candidates:{[SMOKE_OPERATION]:PRIVATE_MARKER+' candidate'},
  backups:{[SMOKE_OPERATION]:PRIVATE_MARKER+' backup'},
  legacyBackups:{[SMOKE_OPERATION]:PRIVATE_MARKER+' legacy backup'},
  operations:{[SMOKE_OPERATION]:{
    status:'COMMITTED',from:'legacy',to:SMOKE_GENERATION,at:Date.now()}}
}}};
let emulator=null,emulatorOutput='';
let verifyExclusiveRules=async()=>{throw Error('Exclusive Rules verifier not initialized');};
const emulatorsReady=async()=>{
  for(let attempt=0;attempt<160;attempt++){
    if(emulator?.exitCode!==null)
      throw Error('Isolated Firebase emulator exited early: '+emulatorOutput.slice(-3500));
    try{
      // Firebase Emulator Hub is the authoritative ready/port registry.
      // The Auth account-list REST route is not a general health endpoint.
      const reply=await fetch('http://127.0.0.1:4400/emulators',
        {signal:AbortSignal.timeout(850)});
      if(reply.ok){
        const available=await reply.json();
        if(available?.auth?.port===9099&&available?.database?.port===9000&&
          ['127.0.0.1','localhost'].includes(available.auth.host)&&
          ['127.0.0.1','localhost'].includes(available.database.host))
          return;
      }
    }catch{}
    await sleep(250);
  }
  throw Error('Demo RTDB/Auth emulator never became ready: '+emulatorOutput.slice(-3500));
};
async function startAndSeedFirebase(){
  emulator=spawn(process.execPath,[
    'node_modules/firebase-tools/lib/bin/firebase.js','emulators:start',
    '--project',EMULATOR_PROJECT,'--only','database,auth','--config',emulatorConfigFile
  ],{stdio:['ignore','pipe','pipe'],env:{...process.env,
    FIREBASE_CLI_EXPERIMENTS:'webframeworks',CI:'true'}});
  for(const stream of [emulator.stdout,emulator.stderr])
    stream?.on('data',chunk=>{emulatorOutput=(emulatorOutput+String(chunk)).slice(-8000);});
  emulator.on('error',error=>{emulatorOutput+=' SPAWN: '+error.message;});
  await emulatorsReady();
  // Management endpoint is admin-only: use Authorization Bearer owner
  // (the ?auth=owner query alone returns HTTP 403 for /.settings/rules.json).
  // NEVER PUT/overwrite any Rules. Require byte-equivalent JSON tree via GET.
  const config=JSON.parse(readFileSync(emulatorConfigFile,'utf8'));
  const original=JSON.parse(readFileSync(resolve('firebase.json'),'utf8'));
  if(config.database?.rules!==EXCLUSIVE_RULES_FILE||
    original.database?.rules===EXCLUSIVE_RULES_FILE||
    expectedRules.rules?.hdnd?.datasetV2?.['.read']===undefined)
    throw Error('Candidate Rules Emulator configuration is not isolated');
  console.log('BROWSER_EXCLUSIVE_RULES_CONFIGURED',JSON.stringify({
    source:'firebase/database.exclusive-candidate.rules.json',sha256:rulesDigest,
    absoluteRulesPath:EXCLUSIVE_RULES_FILE,emulatorConfig:emulatorConfigFile,
    project:EMULATOR_PROJECT,namespace:EMULATOR_NAMESPACE
  }));
  // The demo database starts with open fallback Rules until its ruleset is
  // explicitly installed. Install the EXACT unchanged candidate JSON into
  // this disposable localhost-only emulator. This neither rewrites the
  // checked-in file nor contacts/deploys to any production Firebase project.
  const settings=EMULATOR_DB+'/.settings/rules.json?ns='+EMULATOR_NAMESPACE;
  const adminHeaders={Authorization:'Bearer owner'};
  const initial=await fetch(settings,{headers:adminHeaders,signal:AbortSignal.timeout(8000)});
  if(!initial.ok)throw Error('Cannot inspect initial demo Emulator Rules: HTTP '+initial.status);
  const startupRules=await initial.json();
  if(!isDeepStrictEqual(startupRules,expectedRules)){
    console.log('BROWSER_EXCLUSIVE_RULES_STARTUP_GAP_DETECTED',JSON.stringify({
      actualSha256:createHash('sha256').update(JSON.stringify(startupRules)).digest('hex'),
      candidateSha256:rulesDigest,
      actualRootRead:startupRules?.rules?.['.read']??null,
      note:'default Emulator rules do not prove exclusive-candidate loaded'
    }));
  }
  const install=await fetch(settings,{
    method:'PUT',headers:{...adminHeaders,'Content-Type':'application/json'},
    body:JSON.stringify(expectedRules),signal:AbortSignal.timeout(8000)
  });
  if(!install.ok)throw Error('Cannot load unchanged exclusive Rules into isolated Emulator: HTTP '+
    install.status+' '+(await install.text()).slice(0,280));
  verifyExclusiveRules=async phase=>{
    const live=await fetch(settings,{headers:adminHeaders,signal:AbortSignal.timeout(8000)});
    if(!live.ok)throw Error('Cannot GET actual Emulator Rules ('+phase+'): '+live.status);
    const actual=await live.json();
    const actualSha=createHash('sha256').update(JSON.stringify(actual)).digest('hex');
    if(!isDeepStrictEqual(actual,expectedRules))
      throw Error('L3-AUDIT-GAP-01: Rules changed/mismatch during '+phase+
        ': expected='+rulesDigest+' actual='+actualSha);
    console.log('BROWSER_EXCLUSIVE_RULES_LOADED_EXACT_PASS',JSON.stringify({
      phase,source:'firebase/database.exclusive-candidate.rules.json',
      candidateSha256:rulesDigest,actualRulesSha256:actualSha,
      verifiedFrom:'live RTDB GET /.settings/rules.json with Authorization Bearer owner',
      method:'PUT exact unchanged candidate into disposable demo Emulator only',
      project:EMULATOR_PROJECT,namespace:EMULATOR_NAMESPACE
    }));
  };
  await verifyExclusiveRules('before-auth-and-browser');
  const response=await fetch(EMULATOR_ROOT,{method:'PUT',headers:{
    'Content-Type':'application/json',Authorization:'Bearer owner'
  },body:JSON.stringify(firebaseSeed),signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Could not seed isolated RTDB: HTTP '+response.status+
    ' '+(await response.text()).slice(0,500));
  const readback=await fetch(EMULATOR_ROOT,{
    headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(8000)});
  if(!readback.ok)throw Error('Could not read synthetic RTDB seed back');
  const actual=await readback.json();
  const active=actual?.hdnd?.datasetV2?.active;
  const rows=actual?.hdnd?.datasetV2?.generations?.[SMOKE_GENERATION]?.items;
  if(active?.operationId!==SMOKE_OPERATION||active?.generationId!==SMOKE_GENERATION||
    Object.keys(rows??{}).length!==54||rows?.pr95_smoke_001?.displayCode!=='NQ01')
    throw Error('Firebase seed server readback failed (generation/row mismatch)');
  console.log('FIREBASE_BROWSER_SEED_VERIFIED',JSON.stringify({
    project:EMULATOR_PROJECT,namespace:EMULATOR_NAMESPACE,
    generationId:active.generationId,operationId:active.operationId,
    rowCount:Object.keys(rows).length,source:'REAL RTDB EMULATOR V2'}));
  // Real anonymous Authentication Emulator ID token; no owner token for
  // positive/negative authorization assertions. All paths have seeded data.
  const login=await fetch(EMULATOR_AUTH+'/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-test-key',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({returnSecureToken:true}),signal:AbortSignal.timeout(8000)
  });
  if(!login.ok)throw Error('Guest Emulator Auth sign-in rejected: '+login.status);
  const principal=await login.json();
  if(typeof principal.idToken!=='string'||!principal.localId)
    throw Error('Auth Emulator did not issue an anonymous guest token');
  const request=async path=>{
    const url=EMULATOR_DB+path+'.json?ns='+EMULATOR_NAMESPACE+
      '&auth='+encodeURIComponent(principal.idToken);
    return fetch(url,{signal:AbortSignal.timeout(8000)});
  };
  const activeRead=await request('/hdnd/datasetV2/active');
  if(!activeRead.ok||!isDeepStrictEqual(await activeRead.json(),firebaseSeed.hdnd.datasetV2.active))
    throw Error('Anonymous guest cannot read actual active generation pointer');
  const generationRead=await request('/hdnd/datasetV2/generations/'+SMOKE_GENERATION+'/items');
  if(!generationRead.ok){
    throw Error('Anonymous guest cannot read active generation items: HTTP '+generationRead.status);
  }
  const guestRows=await generationRead.json();
  if(Object.keys(guestRows??{}).length!==firebaseRows.length||
    guestRows?.pr95_smoke_001?.displayCode!=='NQ01')
    throw Error('Anonymous guest active-generation readback does not match seed');
  const deniedPaths=[
    '/hdnd/datasetV2',
    '/hdnd/datasetV2/candidates/'+SMOKE_OPERATION,
    '/hdnd/datasetV2/backups/'+SMOKE_OPERATION,
    '/hdnd/datasetV2/legacyBackups/'+SMOKE_OPERATION,
    '/hdnd/datasetV2/operations/'+SMOKE_OPERATION,
    '/hdnd/datasetV2/generations/'+INACTIVE_GENERATION+'/items',
    '/hdnd/editors'
  ];
  for(const path of deniedPaths){
    const denial=await request(path);
    const responseBody=await denial.text();
    if(denial.status!==401||!/permission denied/i.test(responseBody)||
      responseBody.includes(PRIVATE_MARKER))
      throw Error('Guest private RTDB read was not denied at '+path+
        ': HTTP '+denial.status+' body='+responseBody.slice(0,200));
  }
  console.log('BROWSER_EXCLUSIVE_RULES_GUEST_READ_PASS',JSON.stringify({
    principal:'anonymous Emulator Auth',generationId:SMOKE_GENERATION,
    activeRead:true,visibleRows:Object.keys(guestRows).length,privatePathsDenied:deniedPaths.length,
    checks:deniedPaths,configuredRulesSha256:rulesDigest
  }));
  // Independent witness after exact byte-equivalent live Rules GET.
  console.log('BROWSER_EXCLUSIVE_RULES_RUNTIME_WITNESS_PASS',JSON.stringify({
    source:'firebase/database.exclusive-candidate.rules.json',
    sha256:rulesDigest,guestReadActive:true,guestReadCurrentGeneration:true,
    deniedPrivatePaths:deniedPaths.length,
    contrast:'legacy firebase/database.rules.json grants hdnd/.read to authenticated guests',
    method:'exact live Rules GET + isolated config + anonymous Auth/RTDB permission assertions'
  }));
}

const appRoot=resolve('dist-pages-test');
const qaRoot=resolve('dist-compact-qa');
const html=readFileSync(resolve(appRoot,'index.html'));
const server=createServer((req,res)=>{
  try{
    const pathname=new URL(req.url??'/', 'http://127.0.0.1').pathname;
    const qa=pathname.startsWith('/compact-qa/');
    const root=qa?qaRoot:appRoot;
    const localPath=qa?pathname.slice('/compact-qa'.length):pathname;
    const file=localPath==='/'?resolve(root,qa?'compact-qa.html':'index.html'):resolve(root,'.'+localPath);
    if(!file.startsWith(root+'/')&&!file.startsWith(root+'\\'))throw Error('Invalid path');
    const meta=statSync(file);
    if(!meta.isFile())throw Error('Not a file');
    const mime=file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';
    res.writeHead(200,{'content-type':mime,'Cache-Control':'no-store'});res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const candidates=['google-chrome','google-chrome-stable','chromium','chromium-browser'];
const binary=candidates.find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!binary){server.close();throw Error('Chromium/Chrome not found on runner');}
const userDir=mkdtempSync(join(tmpdir(),'hophdnd-ui-'));
let chrome;
let chromeErrors='';
// GitHub hosted runners intermittently hang before creating DevToolsActivePort
// with --remote-debugging-port=0. Reserve an isolated loopback port and probe
// CDP directly; retry with a fresh profile and alternate headless flags only
// when launch fails. Browser assertions must still run and pass.
async function reservePort(){
  const probe=createServer();
  await new Promise((resolve,reject)=>{
    probe.once('error',reject);
    probe.listen(0,'127.0.0.1',resolve);
  });
  const result=probe.address().port;
  await new Promise((resolve,reject)=>probe.close(err=>err?reject(err):resolve()));
  return result;
}
async function launchChrome(){
  const strategies=[
    {mode:'new',flags:['--headless=new','--no-zygote']},
    {mode:'fallback',flags:['--headless','--disable-software-rasterizer']}
  ];
  for(let attempt=0;attempt<strategies.length;attempt++){
    const mode=strategies[attempt];
    const debugPort=await reservePort();
    const profile=join(userDir,'profile-'+attempt);
    chromeErrors='';
    chrome=spawn(binary,[...mode.flags,'--no-sandbox','--disable-dev-shm-usage',
      '--disable-gpu','--disable-extensions','--disable-background-networking',
      '--no-first-run','--no-default-browser-check',
      '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debugPort,
      '--window-size=1600,1000','--user-data-dir='+profile,'about:blank'],
      {stdio:['ignore','ignore','pipe'],env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
    chrome.stderr?.on('data',chunk=>{chromeErrors=(chromeErrors+String(chunk)).slice(-5000);});
    chrome.on('error',error=>{chromeErrors+=' SPAWN: '+error.message;});
    for(let i=0;i<140;i++){
      if(chrome.exitCode!==null)break;
      try{
        const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list',
          {signal:AbortSignal.timeout(900)});
        if(response.ok){
          const tabs=await response.json();
          if(tabs.some(t=>t.type==='page')){
            console.log('CHROME_DEBUG_READY',JSON.stringify({mode:mode.mode,attempt:attempt+1}));
            return tabs;
          }
        }
      }catch{}
      await sleep(150);
    }
    const reason='Attempt '+(attempt+1)+' ('+mode.mode+') Chrome CDP unavailable; exit='+
      chrome.exitCode+' binary='+binary+' stderr='+chromeErrors.slice(-1300);
    console.warn('CHROME_START_RETRY',reason);
    chrome.kill('SIGKILL');
    if(attempt===strategies.length-1)throw Error(reason);
  }
  throw Error('Chrome launch strategies exhausted');
}
let ws;
let seq=0;
const pending=new Map();
let interceptError=null;
const forbiddenNetwork=[];
function send(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout: '+method));}},16000);
  });
}
async function evaluate(expression){
  const res=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(res.exceptionDetails)throw Error('Evaluate error: '+JSON.stringify(res.exceptionDetails));
  return res.result?.value;
}
async function eventually(expression,why,tries=75){
  for(let i=0;i<tries;i++){
    if(interceptError)throw interceptError;
    if(await evaluate(expression))return;
    await sleep(200);
  }
  throw Error('Browser smoke failed: '+why);
}
try{
  await startAndSeedFirebase();
  const tabs=await launchChrome();
  const tab=tabs.find(t=>t.type==='page');
  if(!tab)throw Error('Chrome did not open a page');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',ev=>{
    const data=JSON.parse(ev.data);
    if(data.id&&pending.has(data.id)){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(Error(JSON.stringify(data.error))):p.resolve(data.result);return;}
    if(data.method==='Network.requestWillBeSent'){
      const url=String(data.params?.request?.url??'');
      if(url.includes('docs.google.com/spreadsheets/')||
        (url.includes('hophdnd-8b7b2')&&
          ['firebaseio.com','firebasedatabase.app','googleapis.com'].some(host=>url.includes(host))))
        forbiddenNetwork.push(url);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});
  await eventually("document.querySelector('.nav-tabs')!==null",'App did not render');
  // A genuine clean Chrome profile measures cold UI shell render on this runner;
  // auth and Firebase production timing must still be tested on the user's network.
  const cold=await evaluate(`(()=>{const navigation=performance.getEntriesByType('navigation')[0];
    const resources=performance.getEntriesByType('resource');
    return {shellVisibleMs:Math.round(performance.now()),
      responseEndMs:Math.round(navigation?.responseEnd??0),
      moduleFetches:resources.filter(r=>r.initiatorType==='script'||r.name.endsWith('.js')).length,
      stylesheetFetches:resources.filter(r=>r.initiatorType==='link'||r.name.endsWith('.css')).length};})()`);
  console.log('COLD_CHROME_SHELL',JSON.stringify(cold));
  const nav=await evaluate("(()=>{const b=[...document.querySelectorAll('.nav-tabs button')].find(b=>b.textContent?.includes('Danh sách các ND trình HĐND'));if(!b)return false;b.click();return true})()");
  if(!nav)throw Error('Cannot navigate to content list');
  // No temporary-source override. The actual App guest session must read the
  // seeded V2 generation via FirebaseRepository and authenticated RTDB Rules.
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",
    'Firebase V2 row NQ01 did not render in the real List');
  const firebaseList=await evaluate(`(()=>{
    const rows=[...document.querySelectorAll('.item-data-table tbody tr')];
    return {rows:rows.length,hasFirst:rows.some(row=>row.textContent?.includes('NQ01')&&
      row.textContent?.includes('Nội dung kiểm thử smoke')),
      hasLast:rows.some(row=>row.textContent?.includes('NQ54')),
      hasNote:rows.some(row=>row.textContent?.includes('Ghi chú nguồn O')),
      isTemporary:document.body.textContent?.includes('Xem dữ liệu tạm')};
  })()`);
  if(firebaseList.rows!==54||!firebaseList.hasFirst||!firebaseList.hasLast||!firebaseList.hasNote)
    throw Error('Firebase V2 rows missing in List: '+JSON.stringify(firebaseList));
  if(forbiddenNetwork.length)throw Error('Production/Sheets request observed: '+JSON.stringify(forbiddenNetwork));
  console.log('FIREBASE_ONLY_LIST_REAL_BROWSER_PASS',JSON.stringify(firebaseList));
  // Verify the actual Report, not only an inserted CSS probe or a list fixture.
  await evaluate("document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')[0]?.click()");
  await eventually("document.querySelector('.report-table tbody')?.textContent?.includes('Sở kiểm thử')===true",
    'Real Report did not aggregate Firebase V2 seeded department');
  const firebaseReport=await evaluate(`(()=>{
    const tables=[...document.querySelectorAll('.report-surface .report-table')];
    return {tables:tables.length,group:tables.some(table=>
      table.querySelector('tbody')?.textContent?.includes('Sở kiểm thử')),
      counts:tables.flatMap(table=>[...table.querySelectorAll('tbody button.count-drill')]
        .map(button=>Number(button.textContent?.trim())).filter(n=>Number.isFinite(n)&&n>0))};
  })()`);
  if(!firebaseReport.group||firebaseReport.counts.length===0)
    throw Error('Firebase V2 seeded counts are absent from real Report: '+JSON.stringify(firebaseReport));
  console.log('FIREBASE_ONLY_REPORT_REAL_BROWSER_PASS',JSON.stringify(firebaseReport));
  await evaluate("document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')[1]?.click()");
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",
    'List did not restore Firebase V2 rows after Report navigation');
  // CSS-only hover: assert that the value's ink remains exactly unchanged
  // for an editable content button and a workflow status picker.
  const inkPoints=await evaluate(`(()=>{
    const fixture=document.createElement('div');
    fixture.id='hover-ink-fixture';
    fixture.style.cssText='position:fixed;left:180px;top:170px;z-index:100000;background:white;';
    fixture.innerHTML='<table class="item-data-table"><tbody><tr><td class="editable-cell" data-col-key="content"><button class="content-button" type="button">Nội dung thử</button></td><td class="editable-cell" data-progress-tone="office"><button class="cell-value-button cell-picker-trigger" type="button">VP đang thực hiện</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(fixture);
    return [...fixture.querySelectorAll('button')].map(button=>{
      const rect=button.getBoundingClientRect();
      return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,color:getComputedStyle(button).color};
    });
  })()`);
  for(let index=0;index<inkPoints.length;index++){
    const item=inkPoints[index];
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:item.x,y:item.y});
    const color=await evaluate(`getComputedStyle(document.querySelectorAll('#hover-ink-fixture button')[${index}]).color`);
    if(color!==item.color)
      throw Error('Editable hover must preserve exact text ink: '+JSON.stringify({index,before:item.color,after:color}));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:7,y:7});
  await evaluate("document.querySelector('#hover-ink-fixture')?.remove()");
  console.log('EDITABLE_HOVER_INK_PRESERVED_PASS');

  // Overview report: the full clickable TD is the raised hover surface;
  // numeral stays flat, and a non-clickable/zero cell remains unchanged.
  const reportHit=await evaluate(`(()=>{
    const host=document.createElement('section');
    host.className='report-surface';host.id='report-cell-3d-probe';
    host.style.cssText='position:fixed;left:95px;top:350px;z-index:99999;width:400px;';
    host.innerHTML='<table class="data-table report-table" style="width:380px;table-layout:fixed"><tbody><tr><td class="report-number report-clickable-cell" style="width:175px;height:82px"><span class="report-cell-sizer" aria-hidden="true">12</span><button type="button" class="count-button count-drill"><span>12</span></button></td><td class="report-number" style="width:175px;height:82px">—</td></tr></tbody></table>';
    document.querySelector('.app-shell').appendChild(host);
    const clickable=host.querySelector('td.report-clickable-cell'),box=clickable.getBoundingClientRect();
    return {x:box.left+box.width*.8,y:box.top+box.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...reportHit});
  // A wall-clock delay can expire before a throttled runner has painted the
  // final transition frame. Keep the exact geometry/shadow assertions below;
  // wait for the real CSS animations to finish instead of sampling mid-flight.
  await eventually(`(()=>{
    const td=document.querySelector('#report-cell-3d-probe td.report-clickable-cell');
    return td?.matches(':hover')&&td.getAnimations({subtree:true}).every(a=>a.playState==='finished')&&
      Math.abs(new DOMMatrixReadOnly(getComputedStyle(td).transform).m42+3)<.01;
  })()`,'Report hover transition did not settle at its final position');
  const reportFullCell=await evaluate(`(()=>{
    const root=document.querySelector('#report-cell-3d-probe');
    const td=root.querySelector('td.report-clickable-cell'),button=td.querySelector('button'),
      badge=button.querySelector('span'),empty=root.querySelector('td:not(.report-clickable-cell)');
    const tdCss=getComputedStyle(td),badgeCss=getComputedStyle(badge),emptyCss=getComputedStyle(empty);
    return {hover:td.matches(':hover'),wholeLift:new DOMMatrixReadOnly(tdCss.transform).m42,
      wholeShadow:tdCss.boxShadow,badgeLift:new DOMMatrixReadOnly(badgeCss.transform).m42,
      badgeShadow:badgeCss.boxShadow,emptyLift:new DOMMatrixReadOnly(emptyCss.transform).m42,
      targetWidth:button.getBoundingClientRect().width,cellWidth:td.getBoundingClientRect().width};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:12,y:12});
  await eventually(`(()=>{
    const td=document.querySelector('#report-cell-3d-probe td.report-clickable-cell');
    return !td.matches(':hover')&&td.getAnimations({subtree:true}).every(a=>a.playState==='finished')&&
      Math.abs(new DOMMatrixReadOnly(getComputedStyle(td).transform).m42)<.01;
  })()`,'Report hover transition did not reset');
  const reportReset=await evaluate(`new DOMMatrixReadOnly(getComputedStyle(
    document.querySelector('#report-cell-3d-probe td.report-clickable-cell')).transform).m42`);
  await evaluate("document.querySelector('#report-cell-3d-probe')?.remove()");
  if(!reportFullCell.hover||Math.abs(reportFullCell.wholeLift+3)>.3||
    !reportFullCell.wholeShadow.includes('8px 16px')||
    Math.abs(reportFullCell.badgeLift)>.2||reportFullCell.badgeShadow!=='none'||
    Math.abs(reportFullCell.emptyLift)>.2||Math.abs(reportReset)>.3||
    reportFullCell.targetWidth<reportFullCell.cellWidth-8)
    throw Error('Overview must lift whole actionable count cell, not just numeral: '+
      JSON.stringify({reportFullCell,reportReset}));
  console.log('REPORT_FULL_CELL_3D_PASS',JSON.stringify(reportFullCell));
  const layoutAndBlanks=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),card=document.querySelector('.item-list-card'),
      viewport=document.querySelector('.item-list-card .table-wrap'),table=document.querySelector('.item-data-table');
    if(!shell||!card||!viewport||!table)return false;
    const shellStyle=getComputedStyle(shell),usable=shell.clientWidth-parseFloat(shellStyle.paddingLeft)-parseFloat(shellStyle.paddingRight);
    const listRows=[...document.querySelectorAll('.item-data-table tbody tr')];
    const blank=listRows.find(row=>row.querySelector('td:first-child')?.textContent?.trim()==='—');
    return Math.abs(card.getBoundingClientRect().width-usable)<=3&&
      table.getBoundingClientRect().width>=viewport.clientWidth-3&&
      !!blank&&blank.querySelectorAll('td').length>=5&&
      [...blank.querySelectorAll('td')].some(cell=>cell.textContent?.trim()==='—')&&
      !/Chưa phân công|Chưa chọn|thiếu mã/.test(blank.textContent??'');
  })()`);
  if(!layoutAndBlanks)throw Error('List/card width diverged or valid blank Firebase fields are not shown as dash');
  const fullExcelColumns=await evaluate(`(()=>{
    const header=[...document.querySelectorAll('.item-heading-row th')].map(node=>node.querySelector('.column-heading-label')?.textContent?.trim()??'');
    const values=document.querySelector('.item-data-table tbody tr')?.textContent??'';
    return header.includes('Tiến độ 3 khâu')&&header.includes('Nội dung trình')&&
      header.includes('Tiến độ hiện tại')&&header.includes('Ghi chú')&&
      !header.includes('Đã thẩm tra chưa')&&
      values.includes('Sở đang thực hiện')&&values.includes('Ghi chú nguồn O');
  })()`);
  if(!fullExcelColumns)throw Error('Mandatory UI groups must retain all existing source values, N/O and no phantom columns');

  // Read-only anonymous viewers have the same TWO field-history actions as
  // administrators. Neither history action grants edit rights.
  const listHistory=await evaluate(`(()=>{
    const historyFields=['note','specificProgress'];
    const find=key=>document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="'+key+'"]');
    const buttons=historyFields.map(key=>find(key)?.querySelector('button.cell-history-action'));
    const unrelated=['content','department','progressCouncil'].some(key=>
      !!find(key)?.querySelector('button.cell-history-action'));
    return {ok:buttons.every(Boolean)&&!unrelated,
      labels:buttons.map(button=>button?.getAttribute('aria-label'))};
  })()`);
  if(!listHistory.ok||!listHistory.labels.some(x=>x?.includes('Ghi chú'))||
    !listHistory.labels.some(x=>x?.includes('Tiến độ hiện tại')))
    throw Error('Guest must see history on note and current-progress only: '+JSON.stringify(listHistory));
  for(const field of ['specificProgress','note']){
    await evaluate(`document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="${field}"] button.cell-history-action').click()`);
    await eventually(`!!document.querySelector('dialog.modal[open][aria-label^="Lịch sử sửa đổi"]')`,
      'History dialog did not open for '+field);
    const modalField=await evaluate(`(()=>{
      const dialog=document.querySelector('dialog.modal[open]');
      return {title:dialog?.getAttribute('aria-label'),demo:!!dialog?.querySelector('.note-history-demo')};
    })()`);
    if(!modalField.title?.includes(field==='note'?'Ghi chú':'Tiến độ hiện tại')||
      modalField.demo!==(field==='note'))
      throw Error('History dialog must target exactly the requested column: '+
        JSON.stringify({field,modalField}));
    await evaluate("document.querySelector('dialog.modal[open] button[aria-label=\\\"Đóng cửa sổ\\\"]')?.click()");
    await eventually("!document.querySelector('dialog.modal[open]')",'History dialog did not close');
  }
  console.log('GUEST_TWO_FIELD_HISTORY_PASS',JSON.stringify(listHistory));
  const groupedDefault=await evaluate(`(()=>{
    const headings=[...document.querySelectorAll('.item-heading-row th')]
      .map(el=>el.querySelector('.column-heading-label')?.textContent?.trim());
    const search=document.querySelector('input[aria-label="Tìm kiếm không dấu"]');
    const departments=document.querySelector('select[aria-label="Lọc Sở, ngành"]');
    const rooms=document.querySelector('select[aria-label="Lọc Phòng"]');
    const advance=document.querySelector('details.list-filter-other');
    const oldRow=document.querySelector('.item-column-filter-row');
    const stt=document.querySelector('.item-heading-row th[data-column-key="stt"]');
    const row=document.querySelector('.item-data-table tbody tr');
    const doc=row?.querySelector('td[data-col-key=content]');
    const stages=row?.querySelector('td[data-col-key=partyLevel]');
    const text=stages?.textContent??'';
    return {ok:!!search&&!!departments&&!!rooms&&!!advance&&!oldRow&&!stt&&
      headings.length===9&&new Set(headings).size===9&&
      headings.includes('Tiến độ 3 khâu')&&headings.includes('Nội dung trình')&&
      headings.includes('Tiến độ hiện tại')&&headings.includes('Ghi chú')&&
      !headings.some(x=>x.includes('Rút')||x.includes('Loại VB +'))&&
      !!doc?.querySelector('.compact-document-group')&&
      stages?.querySelectorAll('.compact-stage-row').length===3&&
      text.includes('Thành ủy')&&text.includes('Xây dựng NQ')&&text.includes('Ban hành NQ')&&
      !document.querySelector('.source-column-visibility button'),
      headings,stages:text.slice(0,180),toolbar:!!search,stt:!!stt};
  })()`);
  if(!groupedDefault.ok)throw Error('V2 U01/U02 group projection or compact toolbar missing: '+JSON.stringify(groupedDefault));
  console.log('V2_MANDATORY_GROUPS_TOOLBAR_NO_STT_PASS',JSON.stringify(groupedDefault));

  // Only V2 filter selectors change here; the baseline palette RGB oracle is
  // unchanged on independent L1 (L2 owns the later colors diff).
  const statusStyles=await evaluate(`(()=>{
    const status=document.querySelector('.item-data-table tbody td[data-col-key=partyLevel] .compact-stage-state');
    const input=document.querySelector('input[aria-label="Tìm kiếm không dấu"]');
    const selector=document.querySelector('select[aria-label="Lọc Sở, ngành"]');
    const th=document.querySelector('.item-heading-row th');
    if(!status||!input||!selector||!th)return {ok:false,reason:'missing real group controls'};
    const tones=[...document.querySelectorAll('.compact-stage-state')].slice(0,3)
      .map(el=>({tone:el.getAttribute('data-progress-tone'),background:getComputedStyle(el).backgroundColor,
        color:getComputedStyle(el).color,text:el.textContent?.trim()}));
    const colors=['not-submitted','office','done'].map(tone=>{
      const element=document.createElement('span');
      element.className='compact-stage-state';element.dataset.progressTone=tone;
      element.textContent=tone;document.querySelector('.compact-stages').append(element);
      const styles=getComputedStyle(element);
      const result={background:styles.backgroundColor,color:styles.color};
      element.remove();return result;
    });
    return {ok:status.getAttribute('data-progress-tone')==='not-submitted'&&
      status.textContent?.includes('Sở chưa trình')&&
      colors[0].background==='rgb(255, 241, 243)'&&
      colors[1].background==='rgb(255, 248, 233)'&&
      colors[2].background==='rgb(238, 248, 241)'&&
      colors[0].color==='rgb(177, 64, 82)'&&
      colors[1].color==='rgb(128, 92, 34)'&&
      colors[2].color==='rgb(52, 110, 72)'&&
      !!input&&!!selector&&
      getComputedStyle(th).backgroundColor==='rgb(239, 245, 249)',
      tones,colors,header:getComputedStyle(th).backgroundColor};
  })()`);
  if(!statusStyles.ok)throw Error('Grouped stage colors/header/filters regression: '+JSON.stringify(statusStyles));

  // Semantic report styling applies to both numeric totals and % completion.
  // Real CSS inheritance must not be replaced with a hardcoded color copy.
  const semanticCells=await evaluate(`(()=>{
    const root=document.createElement('section');root.id='report-semantic-probe';
    root.className='report-surface report-style-classic';
    root.style.cssText='position:fixed;left:480px;top:95px;z-index:11000';
    root.innerHTML='<table class="data-table report-table" style="width:480px;table-layout:fixed"><thead><tr><th class="report-group-heading">Sở, ngành chủ trì</th><th class="report-number-header report-percent-col">% hoàn thành</th></tr></thead><tbody><tr><th class="report-group-heading">Phòng</th><td class="report-number report-percent-col">25%</td></tr><tr><td class="report-number report-stage-source report-clickable-cell">2</td><td class="report-number report-stage-office report-clickable-cell">3</td><td class="report-number report-stage-completed report-clickable-cell">4</td></tr></tbody></table>';
    document.querySelector('.app-shell').append(root);
    const css=el=>{const c=getComputedStyle(el);return {bg:c.backgroundColor,ink:c.color,border:c.borderColor}};
    return {header:css(root.querySelector('th.report-group-heading')),
      percent:css(root.querySelector('td.report-percent-col')),
      complete:css(root.querySelector('td.report-stage-completed')),
      office:css(root.querySelector('td.report-stage-office')),
      statusCells:[...root.querySelectorAll('td.report-clickable-cell')].map(el=>({
        tone:el.className.split(' ').find(k=>k.startsWith('report-stage-')),
        rect:el.getBoundingClientRect().toJSON(),
        ink:getComputedStyle(el).color}))};
  })()`);
  if(semanticCells.header.bg!=='rgb(250, 251, 252)'||
    semanticCells.percent.bg!==semanticCells.complete.bg||
    semanticCells.percent.ink!==semanticCells.complete.ink||
    semanticCells.office.bg!=='rgb(255, 248, 233)'||
    semanticCells.office.ink!=='rgb(128, 92, 34)')
    throw Error('Semantic office/percent/header styling regression: '+JSON.stringify(semanticCells));
  const expectedBorder={ 'report-stage-source':'rgb(177, 64, 82)',
    'report-stage-office':'rgb(128, 92, 34)',
    'report-stage-completed':'rgb(52, 110, 72)'};
  for(const cell of semanticCells.statusCells){
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',
      x:cell.rect.x+cell.rect.width/2,y:cell.rect.y+cell.rect.height/2});
    await new Promise(resolve=>setTimeout(resolve,240));
    const style=await evaluate(`(()=>{
      const cell=[...document.querySelectorAll('#report-semantic-probe td.report-clickable-cell')]
        .find(el=>el.classList.contains(${JSON.stringify(cell.tone)}));
      const css=getComputedStyle(cell);return {color:css.outlineColor,width:css.outlineWidth,
        lift:new DOMMatrixReadOnly(css.transform).m42};
    })()`);
    if(style.color!==expectedBorder[cell.tone]||style.width!=='2px'||Math.abs(style.lift+3)>.3)
      throw Error('Entire report count cell needs semantic 3px hover: '+JSON.stringify({cell,style}));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:6,y:6});
  await evaluate("document.querySelector('#report-semantic-probe')?.remove()");
  console.log('SEMANTIC_HOVER_COLORS_AND_COMPLETION_PASS',JSON.stringify(semanticCells));


  // Hover anywhere in a LIST editable cell: no parent ring, only a compact
  // pale inner status button ring. Uses real Chrome pointer hover, fake data.
  const hoverProbe=await evaluate(`(()=>{
    const host=document.createElement('div');
    host.id='list-edit-hover-probe';
    host.style.cssText='position:fixed;left:18px;top:96px;width:340px;z-index:20000;background:#fff;';
    host.innerHTML='<table class="data-table item-data-table" style="width:340px;table-layout:fixed"><tbody><tr><td class="editable-cell" data-progress-tone="not-submitted" style="height:86px"><button type="button" class="cell-value-button cell-picker-trigger">Sở chưa trình</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const td=host.querySelector('td'),control=host.querySelector('button');
    const parent=td.getBoundingClientRect(),inner=control.getBoundingClientRect();
    return {x:parent.right-7,y:parent.top+parent.height/2,
      outerWidth:parent.width,innerWidth:inner.width,
      outsideInner:parent.right-7>inner.right};
  })()`);
  if(!hoverProbe.outsideInner||hoverProbe.innerWidth>=hoverProbe.outerWidth-25)
    throw Error('List status inner editor must be compact and leave clickable parent padding: '+JSON.stringify(hoverProbe));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:hoverProbe.x,y:hoverProbe.y});
  await new Promise(resolve=>setTimeout(resolve,270)); // let the moderate lift transition settle
  const listHoverRing=await evaluate(`(()=>{
    const td=document.querySelector('#list-edit-hover-probe td');
    const button=td?.querySelector('button');
    if(!td||!button)return {ok:false,missing:true};
    const outer=getComputedStyle(td),inner=getComputedStyle(button);
    return {ok:td.matches(':hover')&&!button.matches(':hover')&&
      outer.boxShadow==='none'&&outer.outlineStyle==='none'&&
      inner.borderTopColor==='rgb(177, 64, 82)'&&
      inner.boxShadow.includes('rgb(255, 241, 243)')&&
      inner.boxShadow.includes('8px 16px')&&
      Math.abs(new DOMMatrixReadOnly(inner.transform).m42+3)<.25&&
      inner.outlineStyle==='solid'&&inner.outlineColor==='rgb(177, 64, 82)',
      outerShadow:outer.boxShadow,outerOutline:outer.outlineStyle,
      innerBorder:inner.borderTopColor,innerShadow:inner.boxShadow,
      liftY:new DOMMatrixReadOnly(inner.transform).m42,
      hoverCell:td.matches(':hover'),hoverButton:button.matches(':hover')};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
  await new Promise(resolve=>setTimeout(resolve,270));
  const liftAfterLeave=await evaluate(`(()=>{
    const cell=document.querySelector('#list-edit-hover-probe td');
    const control=cell?.querySelector('button');
    return {noParentRing:getComputedStyle(cell).boxShadow==='none',
      liftY:new DOMMatrixReadOnly(getComputedStyle(control).transform).m42};
  })()`);
  await evaluate("document.querySelector('#list-edit-hover-probe')?.remove()");
  if(Math.abs(liftAfterLeave.liftY)>.25||!liftAfterLeave.noParentRing)
    throw Error('3D option B must reset after mouseleave: '+JSON.stringify(liftAfterLeave));
  if(!listHoverRing.ok)throw Error('Editable List cell must highlight only pale compact inner control when pointer is on outer cell: '+JSON.stringify({hoverProbe,listHoverRing}));
  console.log('LIST_INNER_HOVER_PASS',JSON.stringify(listHoverRing));

  // Note preview button also lifts, while an active multiline textarea stays flat.
  const noteProbe=await evaluate(`(()=>{
    const root=document.createElement('table');
    root.className='data-table item-data-table';root.id='hover-3d-note-probe';
    root.style.cssText='position:fixed;left:20px;top:130px;width:350px;z-index:20000;background:#fff';
    root.innerHTML='<tbody><tr><td class="editable-cell" data-col-key="note" style="width:345px;height:80px"><button type="button" class="inline-note-trigger">Nội dung ghi chú</button></td></tr></tbody>';
    document.querySelector('.app-shell').append(root);
    const box=root.querySelector('td').getBoundingClientRect();
    return {x:box.right-9,y:box.top+box.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:noteProbe.x,y:noteProbe.y});
  await new Promise(resolve=>setTimeout(resolve,270));
  const note3d=await evaluate(`(()=>{
    const cell=document.querySelector('#hover-3d-note-probe td'),button=cell.querySelector('button');
    const style=getComputedStyle(button),parent=getComputedStyle(cell);
    return {active:cell.matches(':hover'),outerShadow:parent.boxShadow,
      liftY:new DOMMatrixReadOnly(style.transform).m42,shadow:style.boxShadow,
      border:style.borderTopColor};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
  await evaluate("document.querySelector('#hover-3d-note-probe')?.remove()");
  if(!note3d.active||note3d.outerShadow!=='none'||Math.abs(note3d.liftY+3)>.25||
    !note3d.shadow.includes('8px 16px')||note3d.border!=='rgb(46, 111, 149)')
    throw Error('3D option B note affordance mismatch: '+JSON.stringify(note3d));
  console.log('HOVER_3D_B_LIST_NOTE_PASS',JSON.stringify(note3d));


  // Regression: textarea may remain focused for typing after pointer leaves.
  // That MUST NOT look like the active green/blue mouse-hover highlight.
  const inlineProbe=await evaluate(`(()=>{
    const host=document.createElement('div');host.id='inline-hover-off-probe';
    host.style.cssText='position:fixed;left:26px;top:103px;width:345px;z-index:20000;background:#fff;';
    host.innerHTML='<table class="data-table item-data-table" style="width:345px"><tbody><tr><td class="editable-cell" data-col-key="specificProgress"><textarea class="inline-note-textarea" rows="3">Đang xử lý</textarea></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const field=host.querySelector('textarea');
    field.focus({preventScroll:true});
    const box=field.getBoundingClientRect();
    return {x:box.left+box.width/2,y:box.top+box.height/2,focused:document.activeElement===field};
  })()`);
  if(!inlineProbe.focused)throw Error('Synthetic multiline editor could not receive focus');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:inlineProbe.x,y:inlineProbe.y});
  const inlineHover=await evaluate(`(()=>{
    const td=document.querySelector('#inline-hover-off-probe td');
    const area=td?.querySelector('textarea');
    const style=area&&getComputedStyle(area);
    return {active:document.activeElement===area,hover:td?.matches(':hover'),
      border:style?.borderTopColor,shadow:style?.boxShadow};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
  const inlineAfterLeave=await evaluate(`(()=>{
    const td=document.querySelector('#inline-hover-off-probe td');
    const area=td?.querySelector('textarea');
    const style=area&&getComputedStyle(area);
    return {active:document.activeElement===area,hover:td?.matches(':hover'),
      border:style?.borderTopColor,shadow:style?.boxShadow,outline:style?.outlineStyle,
      tdShadow:td?getComputedStyle(td).boxShadow:null};
  })()`);
  await evaluate("document.querySelector('#inline-hover-off-probe')?.remove()");
  if(!inlineHover.active||!inlineHover.hover||
    inlineHover.border!=='rgb(167, 216, 237)'||
    !inlineHover.shadow.includes('rgb(221, 243, 253)')||
    !inlineAfterLeave.active||inlineAfterLeave.hover||
    inlineAfterLeave.border!=='rgb(205, 217, 212)'||
    inlineAfterLeave.shadow!=='none'||inlineAfterLeave.outline!=='none'||
    inlineAfterLeave.tdShadow!=='none')
    throw Error('Focused inline textarea kept hover highlight after pointer left: '+JSON.stringify({inlineHover,inlineAfterLeave}));
  console.log('INLINE_HOVER_LEAVE_CLEARS_HIGHLIGHT_PASS',JSON.stringify({inlineHover,inlineAfterLeave}));


  // Guest receives the palette but never an editable palette control.
  const hiddenGuestPalette=await evaluate(`!document.querySelector('.item-header-actions .status-palette-trigger')`);
  if(!hiddenGuestPalette)throw Error('Guest must not receive admin status palette editor');
  const paletteCascade=await evaluate(`(()=>{
    const root=document.querySelector('.app-shell');
    const sample=document.querySelector('.item-data-table tbody td[data-col-key="partyLevel"] .compact-stage-state[data-progress-tone="not-submitted"]');
    if(!root||!sample)return {ok:false,reason:'missing table/status'};
    root.style.setProperty('--hdnd-status-not-submitted-text','#A10022');
    root.style.setProperty('--hdnd-status-not-submitted-bg','#F1CBDB');
    const style=getComputedStyle(sample);
    const ok=style.color==='rgb(161, 0, 34)'&&style.backgroundColor==='rgb(241, 203, 219)';
    root.style.removeProperty('--hdnd-status-not-submitted-text');
    root.style.removeProperty('--hdnd-status-not-submitted-bg');
    return {ok,text:style.color,background:style.backgroundColor};
  })()`);
  if(!paletteCascade.ok)throw Error('Status palette CSS did not cascade: '+JSON.stringify(paletteCascade));
  const sortAndGuestLayout=await evaluate(`(()=>{
    const topbar=document.querySelector('.topbar'),nav=document.querySelector('.nav-tabs');
    const cardHeader=document.querySelector('.item-data-region .card-header');
    const viewport=document.querySelector('.item-table-scroll');
    const status=document.querySelector('.item-filter-status-slot');
    const stt=document.querySelector('.item-heading-row th[data-column-key="stt"]');
    const sort=document.querySelector('.item-heading-row .column-sort-button');
    if(!topbar||!nav||!viewport||stt||sort)return {ok:false,reason:'Missing guest chrome, STT shown or sort incorrectly visible'};
    const top=topbar.getBoundingClientRect(),tabs=nav.getBoundingClientRect();
    const cards=document.querySelector('.item-summary-grid');
    const cardRect=cards?.getBoundingClientRect();
    const toolbar=document.querySelector('.list-filter-toolbar')?.getBoundingClientRect();
    const gapBefore=(toolbar?.top??0)-tabs.bottom;
    const gapAfter=viewport.getBoundingClientRect().top-(cardRect?.bottom??0);
    const gapBelowToolbar=(cardRect?.top??0)-(toolbar?.bottom??0);
    const aligned=Math.abs((top.left+top.right)/2-(tabs.left+tabs.right)/2)<3&&tabs.width<=1000&&tabs.width<top.width;
    const localMenu=document.querySelector('.guest-compact-menu-bar .compact-columns-menu');
    // Same strict no-extra-blank-space contract, now measured before and after
    // the four explicitly requested summary cards instead of across their height.
    return {ok:aligned&&!!cardRect&&gapBefore<155&&gapAfter<30&&gapBefore>=0&&gapAfter>=0&&
      gapBelowToolbar>=0&&gapBelowToolbar<30&&
      cards.querySelectorAll('[data-summary-card]').length===4&&!status&&!cardHeader&&!!localMenu,
      aligned,gapBefore,gapAfter,gapBelowToolbar,cardHeight:cardRect?.height,
      hasEmptyStatus:!!status,hasCounterHeader:!!cardHeader,hasPersonalMenu:!!localMenu};
  })()`);
  if(!sortAndGuestLayout.ok)throw Error('Guest layout regression: '+JSON.stringify(sortAndGuestLayout));
  const mainSectionCards=await evaluate(`(()=>{
    const nav=document.querySelector('nav.primary-section-switcher');
    const cards=[...(nav?.querySelectorAll('button.primary-section-card')??[])];
    const labels=cards.map(el=>el.querySelector('.section-card-title')?.textContent);
    const boxes=cards.map(el=>el.getBoundingClientRect());
    const geometry=cards.map(el=>{
      const title=el.querySelector('.section-card-title'),slot=el.querySelector('.section-card-state');
      const r=title?.getBoundingClientRect(),badge=slot?.getBoundingClientRect(),button=el.getBoundingClientRect();
      const range=document.createRange();
      if(title)range.selectNodeContents(title);
      const pieces=range.getClientRects().length;
      return {lines:pieces,rightInset:button.right-(badge?.right??0),
        titleFits:!!r&&!!badge&&r.right<badge.left-2,
        overflow:!!title&&title.scrollWidth>title.clientWidth+1,
        badgeWidth:badge?.width};
    });
    const selected=cards.find(el=>el.classList.contains('active'));
    const unselected=cards.find(el=>!el.classList.contains('active'));
    const activeStyle=selected?getComputedStyle(selected):null;
    const idleStyle=unselected?getComputedStyle(unselected):null;
    const restrainedGradient=activeStyle?.backgroundImage.includes('linear-gradient')&&idleStyle?.backgroundImage==='none';
    const distinct=activeStyle?.backgroundColor!==idleStyle?.backgroundColor;
    const border=activeStyle?parseFloat(activeStyle.borderTopWidth)>=2:false;
    const noIcons=nav.querySelectorAll('.section-card-icon').length===0;
    const activeBadge=!!selected&&getComputedStyle(selected.querySelector('.section-card-state')).backgroundColor!=='rgba(0, 0, 0, 0)';
    const cardDepth=!!activeStyle?.boxShadow.includes('10px 24px')&&!!idleStyle?.boxShadow.includes('4px 14px');
    return {ok:nav?.getBoundingClientRect().width<=1000&&
      restrainedGradient&&distinct&&border&&noIcons&&activeBadge&&cardDepth&&
      geometry.length===2&&geometry.every(g=>g.lines===1&&g.titleFits&&!g.overflow&&g.rightInset>=8&&g.rightInset<=29)&&
      Math.abs(geometry[0].rightInset-geometry[1].rightInset)<1&&
      Math.abs(geometry[0].badgeWidth-geometry[1].badgeWidth)<1&&
      cards.length===2&&labels[0]==='Báo cáo tổng hợp'&&
      labels[1]==='Danh sách các ND trình HĐND'&&
      boxes.every(box=>box.width>=300&&box.height>=42&&box.height<=72)&&
      !nav.querySelector('.section-card-description')&&
      getComputedStyle(unselected.querySelector('.section-card-state')).visibility==='hidden'&&
      getComputedStyle(selected.querySelector('.section-card-state')).visibility==='visible'&&
      cards.every(el=>el.querySelector('.section-card-state')?.textContent==='Đang xem')&&
      Math.abs(boxes[0].width-boxes[1].width)<1&&
      Math.abs(boxes[0].height-boxes[1].height)<1&&
      cards.filter(el=>el.classList.contains('active')).length===1&&
      !document.querySelector('.brand,.demo-banner,.page-heading,.unknown-note'),
      labels,widths:boxes.map(box=>Math.round(box.width)),geometry,restrainedGradient,distinct,border,noIcons,activeBadge,cardDepth};
  })()`);
  if(!mainSectionCards.ok)throw Error('Two main section cards were not rendered cleanly: '+JSON.stringify(mainSectionCards));
  const compactNavigation=await evaluate(`(()=>{
    const nav=document.querySelector('nav.primary-section-switcher');
    const cards=[...(nav?.querySelectorAll('.primary-section-card')??[])];
    return {count:cards.length,heights:cards.map(x=>x.getBoundingClientRect().height),
      focusable:cards.every(x=>x.tagName==='BUTTON'&&!x.disabled),
      active:cards.filter(x=>x.classList.contains('active')).length,
      navGap:parseFloat(getComputedStyle(nav).rowGap)};
  })()`);
  if(compactNavigation.count!==2||compactNavigation.active!==1||
      !compactNavigation.focusable||compactNavigation.heights.some(h=>h>72||h<42))
    throw Error('PR95 compact navigation regression '+JSON.stringify(compactNavigation));
  const compactNavigationShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-pr95-nav-compact-synthetic.png',
    Buffer.from(compactNavigationShot.data,'base64'));
  console.log('PR95_COMPACT_NAVIGATION_PASS',JSON.stringify(compactNavigation));
  console.log('TAB_LABELS_RIGHT_AND_SINGLE_LINE_PASS',JSON.stringify(mainSectionCards.geometry));
  console.log('PRIMARY_CARD_TABS_NO_ICONS_PASS',JSON.stringify({widths:mainSectionCards.widths,cardDepth:mainSectionCards.cardDepth,activeBadge:mainSectionCards.activeBadge}));

  // Theme2 is a visual skin: a very subtle gradient ONLY on the active tab,
  // solid Imperial Sky action buttons, white/ice surfaces elsewhere.
  const imperial=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell');
    const tabs=[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')];
    const active=tabs.find(el=>el.classList.contains('active')),
      inactive=tabs.find(el=>!el.classList.contains('active'));
    const ac=getComputedStyle(active),ic=getComputedStyle(inactive);
    const fixture=document.createElement('div');
    fixture.style.cssText='position:fixed;top:80px;left:30px;z-index:100000;';
    fixture.innerHTML='<button class="button primary">Lưu</button><button class="button ghost">Khác</button><input type="text" />';
    shell.appendChild(fixture);
    const solid=getComputedStyle(fixture.querySelector('.button.primary')),
      ghost=getComputedStyle(fixture.querySelector('.button.ghost'));
    const result={scope:shell.classList.contains('imperial-sky-theme'),
      gradient:ac.backgroundImage,activeInk:ac.color,activeBorder:ac.borderTopColor,
      inactiveFill:ic.backgroundColor,inactiveInk:ic.color,
      actionFill:solid.backgroundColor,actionInk:solid.color,
      ghostInk:ghost.color,activeBox:active.getBoundingClientRect().width,
      inactiveBox:inactive.getBoundingClientRect().width};
    fixture.remove();return result;
  })()`);
  if(!imperial.scope||
    !imperial.gradient.includes('linear-gradient')||
    !imperial.gradient.includes('36, 90, 121')||
    !imperial.gradient.includes('46, 111, 149')||
    imperial.activeInk!=='rgb(248, 251, 253)'||
    imperial.activeBorder!=='rgb(36, 90, 121)'||
    imperial.inactiveFill!=='rgb(242, 248, 252)'||
    imperial.inactiveInk!=='rgb(53, 85, 107)'||
    imperial.actionFill!=='rgb(46, 111, 149)'||
    imperial.actionInk!=='rgb(255, 255, 255)'||
    imperial.ghostInk!=='rgb(53, 85, 107)'||
    Math.abs(imperial.activeBox-imperial.inactiveBox)>1)
    throw Error('Imperial Sky must style chrome without changing geometry: '+JSON.stringify(imperial));
  console.log('THEME2_IMPERIAL_SKY_CHROME_PASS',JSON.stringify(imperial));

  // The inactive label reserves exactly the same space as "Đang xem".
  // Switching either main tab must not resize either button.
  const beforeSwitch=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')]
    .map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))`);
  await evaluate("document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')[0].click()");
  await eventually("document.querySelector('nav.primary-section-switcher button.primary-section-card:first-child')?.classList.contains('active')===true",
    'Overview tab did not become active');
  const duringSwitch=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')]
    .map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
      state:getComputedStyle(el.querySelector('.section-card-state')).visibility,
      gradient:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}))`);
  await evaluate("document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')[1].click()");
  await eventually("document.querySelector('nav.primary-section-switcher button.primary-section-card:last-child')?.classList.contains('active')===true",
    'List tab did not become active again');
  const afterSwitch=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')]
    .map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
      state:getComputedStyle(el.querySelector('.section-card-state')).visibility,
      gradient:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}))`);
  const stableSize=beforeSwitch.every((item,i)=>
    Math.abs(item.width-duringSwitch[i].width)<1&&
    Math.abs(item.height-duringSwitch[i].height)<1&&
    Math.abs(item.width-afterSwitch[i].width)<1&&
    Math.abs(item.height-afterSwitch[i].height)<1);
  if(!stableSize||duringSwitch[0].state!=='visible'||duringSwitch[1].state!=='hidden'||
    afterSwitch[0].state!=='hidden'||afterSwitch[1].state!=='visible'||
    !duringSwitch[0].gradient.includes('linear-gradient')||
    duringSwitch[1].gradient!=='none'||
    !afterSwitch[1].gradient.includes('linear-gradient')||
    afterSwitch[0].gradient!=='none')
    throw Error('Main tabs changed size/hidden-label spacing while switching: '+
      JSON.stringify({beforeSwitch,duringSwitch,afterSwitch}));
  console.log('PRIMARY_TABS_FIXED_SIZE_PASS',JSON.stringify({beforeSwitch,duringSwitch,afterSwitch}));

  for(const [selector,color] of [['.active','rgb(248, 251, 253)'],[':not(.active)','rgb(53, 85, 107)']]){
    const query='nav.primary-section-switcher .primary-section-card'+selector;
    const p=await evaluate(`(()=>{
      const el=document.querySelector(${JSON.stringify(query)});
      el?.scrollIntoView({block:'center',inline:'nearest'});
      const r=el?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;
    })()`);
    if(!p)throw Error('No main tab for 3D hover '+selector);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y});
    await new Promise(resolve=>setTimeout(resolve,270));
    const hover=await evaluate(`(()=>{
      const el=document.querySelector(${JSON.stringify(query)});
      const style=getComputedStyle(el);
      return {hover:el.matches(':hover'),liftY:new DOMMatrixReadOnly(style.transform).m42,
        color:style.color,shadow:style.boxShadow,
        titleSize:parseFloat(getComputedStyle(el.querySelector('.section-card-title')).fontSize)};
    })()`);
    if(!hover.hover||Math.abs(hover.liftY+3)>.25||!hover.shadow.includes('12px 24px')||
      hover.color!==color||hover.titleSize<18)
      throw Error('Main tab 3D or lighter text mismatch: '+JSON.stringify({selector,hover}));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:785,y:9});
  await new Promise(resolve=>setTimeout(resolve,270));
  const navReset=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher .primary-section-card')]
    .every(el=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)<.25)`);
  if(!navReset)throw Error('Main tabs still elevated after mouseleave');
  console.log('HOVER_3D_B_MAIN_TABS_PASS');

  const listHeadingAndLines=await evaluate(`(()=>{
    const card=document.querySelector('.item-data-region .card-header');
    const title=document.querySelector('.nav-tabs button[aria-current=page] .section-card-title');
    const headers=[...document.querySelectorAll('.item-heading-row th')];
    const first=headers[0],label=first?.querySelector('.column-heading-label');
    const td=document.querySelector('.item-data-table tbody td');
    const toolbar=document.querySelector('.list-filter-toolbar');
    const border=node=>node?getComputedStyle(node).borderRightWidth:null;
    return {ok:!card&&title?.textContent==='Danh sách các ND trình HĐND'&&
      !document.querySelector('.item-list-summary')&&headers.length>=9&&!!toolbar&&
      !document.querySelector('.item-column-filter-row')&&
      !document.querySelector('th[data-column-key=stt]')&&
      getComputedStyle(label).textAlign==='center'&&
      border(first)==='1px'&&border(td)==='1px',
      heading:title?.textContent,headers:headers.length,toolbar:!!toolbar,
      align:label?getComputedStyle(label).textAlign:null,
      widths:[border(first),border(td)]};
  })()`);
  if(!listHeadingAndLines.ok)throw Error('V2 list header/toolbar or subtle separators regression: '+JSON.stringify(listHeadingAndLines));
  // Sorting is now edit-mode only. The viewer/anonymous guest must not
  // expose a sorting button or activate sort via the header itself.
  const viewerSortBlocked=await evaluate(`(()=>{
    const header=document.querySelector('.item-heading-row th[data-column-key="displayCode"]');
    header?.click();
    return !!header&&header.getAttribute('aria-sort')==='none'&&
      !header.querySelector('.column-sort-button');
  })()`);
  if(!viewerSortBlocked)throw Error('Viewer must not expose sorting');
  const guestEditMarkers=await evaluate(`document.querySelectorAll('.item-data-table tbody td.editable-cell').length`);
  if(guestEditMarkers)throw Error('Read-only guest must not see editable-cell markers');
  // Synthetic marked cell tests the one shared editing tooltip without granting
  // guest permissions or writing data; native title delay is not used.
  const instantEditCue=await evaluate(`(()=>{
    const td=document.querySelector('.item-data-table tbody td[data-col-key="room"]');
    const hint=document.getElementById('edit-shared-tooltip');
    if(!td||!hint)return {ok:false,reason:'missing table cell or singleton'};
    td.classList.add('editable-cell');
    let shown=false,hidden=false;
    try{
      td.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
      const source=td.getBoundingClientRect(),bubble=hint.getBoundingClientRect();
      const overlap=Math.max(0,Math.min(source.right,bubble.right)-Math.max(source.left,bubble.left))*
        Math.max(0,Math.min(source.bottom,bubble.bottom)-Math.max(source.top,bubble.top));
      shown=hint.matches(':popover-open')&&getComputedStyle(hint).display==='flex'&&
        hint.textContent==='Bấm để sửa'&&!td.hasAttribute('title')&&overlap===0;
      td.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
      hidden=!hint.matches(':popover-open');
    }finally{td.classList.remove('editable-cell');}
    return {ok:shown&&hidden,shown,hidden};
  })()`);
  if(!instantEditCue.ok)throw Error('Immediate edit tooltip regression: '+JSON.stringify(instantEditCue));
  // Emulate a visible history action without modifying guest permissions.
  // The shared hint should immediately switch its label and remain outside.
  const historyHint=await evaluate(`(()=>{
    const td=document.querySelector('.item-data-table tbody td[data-col-key="room"]');
    const tip=document.getElementById('edit-shared-tooltip');
    if(!td||!tip)return false;
    const btn=document.createElement('button');
    btn.type='button';btn.className='cell-history-action';
    btn.dataset.quickTooltip='Xem lần sửa gần nhất';
    td.append(btn);
    try {
      btn.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
      const a=tip.getBoundingClientRect(),b=btn.getBoundingClientRect();
      const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
        Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      return tip.matches(':popover-open')&&tip.textContent==='Xem lần sửa gần nhất'&&overlap===0;
    }finally{
      btn.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
      btn.remove();
    }
  })()`);
  if(!historyHint)throw Error('Quick history tooltip must not obscure its action');
  const cellAlignment=await evaluate(`(()=>{
    const doc=document.querySelector('.item-data-table tbody td[data-col-key=content]');
    const head=doc?.querySelector('.compact-document-heading');
    const body=doc?.querySelector('.compact-document-content');
    return !!doc&&!!head&&!!body&&
      getComputedStyle(body).whiteSpace==='pre-wrap'&&
      getComputedStyle(doc).verticalAlign==='top'&&
      !!doc.querySelector('.compact-document-badge')&&
      !!doc.querySelector('.compact-document-department');
  })()`);
  if(!cellAlignment)throw Error('U01 document top-row/second-row styling regression');

  if(await evaluate("!!document.querySelector('.source-column-visibility button')"))
    throw Error('Guest must not change admin source column visibility');


  const visibleRows=await evaluate("document.querySelectorAll('.item-data-table tbody tr').length");
  if(visibleRows!==54)throw Error('All 54 Firebase V2 records should render without 50-row pagination, got '+visibleRows);
  if(await evaluate("!!document.querySelector('.pagination')"))throw Error('Legacy pagination controls should be removed');
  const sticky=await evaluate(`(()=>{
    const scroll=document.querySelector('.item-table-scroll');
    const title=scroll?.querySelector('.item-heading-row th');
    const toolbar=document.querySelector('.list-filter-toolbar');
    const search=toolbar?.querySelector('input[aria-label="Tìm kiếm không dấu"]');
    if(!scroll||!title||!toolbar||!search)return false;
    if(getComputedStyle(scroll.querySelector('thead')).position!=='sticky')return false;
    if(getComputedStyle(title).whiteSpace!=='normal')return false;
    if(document.querySelector('.item-column-filter-row,.item-sticky-search-controls'))return false;
    const before=title.getBoundingClientRect().top;
    if(scroll.scrollHeight<=scroll.clientHeight+30)return false;
    scroll.scrollTop=180;
    const after=title.getBoundingClientRect().top;
    return scroll.scrollTop>=100&&Math.abs(before-after)<3&&
      !!document.querySelector('select[aria-label="Lọc Sở, ngành"]')&&
      !!document.querySelector('select[aria-label="Lọc Phòng"]');
  })()`);
  if(!sticky)throw Error('V2 sticky table heading and compact toolbar scroll must work together');
  await eventually("document.querySelector('.guest-signin')!==null",'Anonymous viewer must have a simple login entry');
  const guestClean=await evaluate(`(()=>{
    const banner=document.querySelector('.demo-banner')?.textContent??'';
    return !!document.querySelector('.guest-signin')&&
      !document.querySelector('.options-menu')&&!document.querySelector('.list-view-box')&&
      !!document.querySelector('.version')&&
      !document.querySelector('.brand')&&!document.querySelector('.demo-banner')&&
      !document.querySelector('.settings-mode-bar')&&
      !document.querySelector('.app-footer')&&
      !document.body.textContent?.includes('Có thể bấm trực tiếp vào ô được cấp quyền để sửa thử.')&&
      !document.body.textContent?.includes('Dữ liệu tự cập nhật')&&
      !banner.includes('GID')&&
      !document.querySelector('.notice[role="status"]')?.textContent?.includes('Danh mục và bố trí')&&
      document.querySelector('input[aria-label="Tìm kiếm không dấu"]')?.placeholder==='Tìm kiếm không dấu…'&&
      !!document.querySelector('select[aria-label="Lọc Sở, ngành"]');
  })()`);
  if(!guestClean)throw Error('Anonymous list still exposes admin configuration or outdated filter labels');
  // Guest footer and generic edit hint are intentionally removed. Use the
  // freed space for a vertically scrollable list, with sticky filters intact.
  const listViewport=await evaluate(`(()=>{
    const grid=document.querySelector('.item-table-scroll');
    const styles=grid?getComputedStyle(grid):null;
    return {height:grid?.clientHeight??0,scrollHeight:grid?.scrollHeight??0,
      overflow:styles?.overflowY??'',viewport:window.innerHeight};
  })()`);
  if(listViewport.viewport!==1000||listViewport.height<400||listViewport.height>900||
    listViewport.overflow!=='auto'||listViewport.scrollHeight<=listViewport.height+30)
    throw Error('List must use the taller viewport with its own vertical scrolling: '+JSON.stringify(listViewport));
  console.log('GUEST_LIST_VIEWPORT_EXPANDED_PASS',JSON.stringify(listViewport));
  // Viewport-fit list must own the only vertical scrollbar on normal screens.
  const fit=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),grid=document.querySelector('.item-table-scroll');
    const doc=document.scrollingElement,box=grid?.getBoundingClientRect();
    return {active:shell?.classList.contains('list-fit-page'),window:innerHeight,
      documentHeight:doc?.scrollHeight,documentClientHeight:doc?.clientHeight,
      tableBottom:box?.bottom,tableHeight:box?.height,overflow:grid?getComputedStyle(grid).overflowY:null};
  })()`);
  if(!fit.active||fit.documentHeight>fit.documentClientHeight+3||
    fit.tableBottom>fit.window+3||fit.tableHeight<250||fit.overflow!=='auto')
    throw Error('List page must fit one screen and scroll only inside table: '+JSON.stringify(fit));
  console.log('LIST_VIEWPORT_FIT_PASS',JSON.stringify(fit));
  const tablePosition=await evaluate(`(()=>{
    const grid=document.querySelector('.item-table-scroll'),host=document.querySelector('.item-data-region');
    const g=grid.getBoundingClientRect(),h=host.getBoundingClientRect();
    return {top:g.top-h.top,left:g.left-h.left,height:g.height,width:g.width};
  })()`);
  const assertStable=async(label)=>{
    const result=await evaluate(`(()=>{
      const g=document.querySelector('.item-table-scroll').getBoundingClientRect(),
        h=document.querySelector('.item-data-region').getBoundingClientRect();
      return {top:g.top-h.top,left:g.left-h.left,height:g.height,width:g.width};
    })()`);
    if(Math.abs(result.top-tablePosition.top)>2||Math.abs(result.left-tablePosition.left)>2||
       Math.abs(result.height-tablePosition.height)>2||Math.abs(result.width-tablePosition.width)>2)
      throw Error('List grid shifted while '+label+': '+JSON.stringify({tablePosition,result}));
  };

  const started=await evaluate(`(()=>{
    const input=document.querySelector('input[aria-label="Tìm kiếm không dấu"]');
    input?.focus();return !!input;
  })()`);
  if(!started)throw Error('V2 global search input missing');
  await send('Input.insertText',{text:'Không khớp'});
  await eventually("document.querySelector('input[aria-label=\\\"Tìm kiếm không dấu\\\"]')?.value==='Không khớp'",
    'Global search value not shown');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('Không tìm thấy nội dung')===true",
    'Global search must constrain table');
  await assertStable('no matching rows');
  await evaluate("document.querySelector('.list-filter-clear')?.click()");
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",
    'Clearing global search did not restore the list');
  await assertStable('clearing global search');
  const began=Date.now();
  await evaluate("document.querySelector('input[aria-label=\\\"Tìm kiếm không dấu\\\"]')?.focus()");
  await send('Input.insertText',{text:'kiem thu'});
  await eventually("document.querySelector('.item-data-table tbody td[data-col-key=\\\"content\\\"] mark.item-search-match')?.textContent?.toLowerCase().includes('kiểm thử')===true",
    'V2 Unicode search highlighting missing');
  const marked=await evaluate(`(()=>{
    const content=[...document.querySelectorAll('.item-data-table tbody td[data-col-key="content"]')];
    const marks=content.flatMap(cell=>[...cell.querySelectorAll('mark.item-search-match')]);
    const source=content[0]?.textContent??'';
    return {matches:marks.length,count:content.length,first:marks[0]?.textContent,
      fullTextPreserved:source.includes('Nội dung kiểm thử'),
      input:document.querySelector('input[aria-label="Tìm kiếm không dấu"]')?.value};
  })()`);
  if(marked.matches<40||!marked.fullTextPreserved||marked.input!=='kiem thu')
    throw Error('Global search must highlight and preserve Vietnamese source text: '+JSON.stringify(marked));
  console.log('V2_CONTENT_SEARCH_MARKED_PASS',JSON.stringify({...marked,elapsedMs:Date.now()-began}));
  await evaluate("document.querySelector('.list-filter-clear')?.click()");
  await eventually("document.querySelectorAll('.item-data-table mark.item-search-match').length===0",
    'Clearing global search must clear yellow marks');
  const highlightLayout=await evaluate(`(()=>{
    const table=document.createElement('table');
    table.className='item-data-table';table.style.cssText='width:228px;table-layout:fixed;';
    const body=table.appendChild(document.createElement('tbody'));
    const row=body.appendChild(document.createElement('tr'));
    const td=row.appendChild(document.createElement('td'));
    td.dataset.colKey='specificProgress';td.style.width='228px';
    const trigger=td.appendChild(document.createElement('button'));
    trigger.className='inline-note-trigger';trigger.type='button';
    trigger.innerHTML='Đã có Tờ trình số <mark class="item-search-match item-search-match-atomic">254</mark> ngày 15/10 trình HĐND TP';
    document.body.appendChild(table);
    const mark=trigger.querySelector('mark'),range=document.createRange();
    range.selectNodeContents(mark);
    const style=getComputedStyle(trigger),markStyle=getComputedStyle(mark);
    const result={justify:style.textAlign,finalLine:style.textAlignLast,
      numberWhitespace:markStyle.whiteSpace,pieces:range.getClientRects().length,
      text:trigger.textContent};
    table.remove();return result;
  })()`);
  if(highlightLayout.justify!=='left'||highlightLayout.finalLine!=='auto'||
    highlightLayout.numberWhitespace!=='nowrap'||highlightLayout.pieces!==1||
    !highlightLayout.text.includes('số 254 ngày'))
    throw Error('Left-aligned progress note must preserve unsplit numeric highlight: '+JSON.stringify(highlightLayout));
  console.log('LEFT_ALIGN_AND_ATOMIC_SEARCH_HIGHLIGHT_PASS',JSON.stringify(highlightLayout));
  const kindOptions=await evaluate(`(()=>{
    const buttons=[...document.querySelectorAll('button[data-summary-kind]')];
    const keys=buttons.map(b=>b.getAttribute('data-summary-kind'));
    const label=buttons[0]?.getAttribute('title');
    const selected=buttons.find(b=>b.getAttribute('data-summary-kind')==='qppl');
    selected?.click();
    return {keys,tooltip:label,pressed:selected?.getAttribute('aria-pressed')};
  })()`);
  if(!['qppl','hc','bc','nq-unknown','unclassified'].every(k=>kindOptions.keys.includes(k))||
      !kindOptions.tooltip?.includes('bấm lại để bỏ lọc'))
    throw Error('V2 kind chips incomplete: '+JSON.stringify(kindOptions));
  await eventually("document.querySelector('button[data-summary-kind=qppl]')?.getAttribute('aria-pressed')==='true'",
    'QPPL kind chip selection failed');
  await evaluate("document.querySelector('button[data-summary-kind=qppl]')?.click()");
  await eventually("document.querySelector('button[data-summary-kind=qppl]')?.getAttribute('aria-pressed')==='false'",
    'QPPL kind chip second click must clear only kind');

  // Real selected department dropdown must constrain exact string values.
  const v2Department=await evaluate(`(()=>{
    const el=document.querySelector('select[aria-label="Lọc Sở, ngành"]');
    if(!el||el.options.length<2)return false;
    el.value=el.options[1].value;
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  if(!v2Department)throw Error('V2 department dropdown missing');
  await eventually("document.querySelector('.list-filter-count')?.textContent.includes('kết quả')",
    'V2 department count did not render');
  // Escape inside dropdown keeps its native behavior and does not erase filters.
  await evaluate(`(()=>{
    const el=document.querySelector('select[aria-label="Lọc Sở, ngành"]');
    el?.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  })()`);
  if(!await evaluate("!!document.querySelector('select[aria-label=\\\"Lọc Sở, ngành\\\"]')?.value"))
    throw Error('Escape in dropdown wrongly cleared List filters');
  await evaluate("document.querySelector('.list-filter-clear')?.click()");
  await eventually("document.querySelector('select[aria-label=\\\"Lọc Sở, ngành\\\"]')?.value===''",
    'V2 list reset did not clear department');
  console.log('V2_KIND_DEPARTMENT_DROPDOWN_PASS',JSON.stringify(kindOptions));
  // Browser-level Escape guard: one bare Escape outside interactive controls
  // clears AND filters; native Escape inside select was checked above.
  const v2EscReady=await evaluate(`(()=>{
    const select=document.querySelector('select[aria-label="Lọc Sở, ngành"]');
    document.querySelectorAll('details[open]').forEach(node=>node.open=false);
    if(!select||select.options.length<2)return false;
    select.value=select.options[1].value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  if(!v2EscReady)throw Error('V2 Escape browser setup unavailable');
  await eventually("!!document.querySelector('select[aria-label=\\\"Lọc Sở, ngành\\\"]')?.value",
    'V2 Escape setup did not apply department filter');
  await evaluate(`document.body.dispatchEvent(new KeyboardEvent('keydown',
    {key:'Escape',code:'Escape',bubbles:true,cancelable:true}))`);
  await eventually("document.querySelector('select[aria-label=\\\"Lọc Sở, ngành\\\"]')?.value===''",
    'V2 Escape outside controls must clear list conditions');
  console.log('V2_ESC_NATIVE_CONTROL_AND_OUTSIDE_CLEAR_PASS');


  // An unsaved edit must not highlight the whole row in yellow or paint an
  // amber stripe in the detail popup. Explicit user row color rules are separate.
  const noDraftRowYellow=await evaluate(`(()=>{
    const root=document.querySelector('.item-data-table tbody tr');
    if(!root)return false;
    const before=getComputedStyle(root).backgroundColor;
    root.classList.add('dirty-row');
    const after=getComputedStyle(root).backgroundColor;
    root.classList.remove('dirty-row');
    const popup=document.createElement('table');
    popup.className='report-detail-grid';popup.style.position='absolute';popup.style.left='-10000px';
    const body=popup.appendChild(document.createElement('tbody'));
    const test=body.appendChild(document.createElement('tr'));
    document.body.appendChild(popup);
    const plain=getComputedStyle(test).boxShadow;
    test.classList.add('report-grid-row-dirty');
    const dirty=getComputedStyle(test).boxShadow;popup.remove();
    return before===after&&plain===dirty;
  })()`);
  if(!noDraftRowYellow)throw Error('Unsaved record still highlights whole table row');

  // CSS contract for signed-in edit-mode popup using a synthetic cell. Guest
  // smoke may not enter editing; no Firebase write or authentication is needed.
  const compactEditRing=await evaluate(`(()=>{
    const host=document.createElement('div');
    host.className='report-grid-modal';
    host.style.cssText='position:fixed;left:30px;top:30px;width:355px;z-index:99999;';
    host.innerHTML='<table class="data-table report-detail-grid" style="width:340px"><tbody><tr><td class="editable-cell" data-col-key="progressBuild" data-progress-tone="not-submitted"><button type="button" class="cell-value-button cell-picker-trigger">Sở chưa trình</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const td=host.querySelector('td'),button=host.querySelector('button');
    button.focus({preventScroll:true});
    const parent=getComputedStyle(td),inner=getComputedStyle(button);
    const tdWidth=td.getBoundingClientRect().width;
    const buttonWidth=button.getBoundingClientRect().width;
    const result={ok:parent.boxShadow==='none'&&parent.outlineStyle==='none'&&
      buttonWidth<tdWidth-25&&
      inner.borderColor==='rgb(158, 207, 231)'&&
      inner.boxShadow.includes('rgb(216, 241, 252)')&&
      inner.outlineStyle==='none',
      parentShadow:parent.boxShadow,parentOutline:parent.outlineStyle,
      innerBorder:inner.borderColor,innerShadow:inner.boxShadow,
      innerOutline:inner.outlineStyle,tdWidth,buttonWidth};
    host.remove();return result;
  })()`);
  if(!compactEditRing.ok)throw Error('Popup edit highlight must be a compact soft-color ring, not the entire dark cell: '+JSON.stringify(compactEditRing));
  console.log('POPUP_COMPACT_SOFT_HIGHLIGHT_PASS',JSON.stringify(compactEditRing));

  const modalHoverPoint=await evaluate(`(()=>{
    const host=document.createElement('div');host.id='popup-3d-probe';host.className='report-grid-modal';
    host.style.cssText='position:fixed;left:25px;top:80px;width:355px;z-index:9999;';
    host.innerHTML='<table class="data-table report-detail-grid" style="width:340px"><tbody><tr><td class="editable-cell" data-progress-tone="not-submitted" style="height:70px"><button class="cell-value-button cell-picker-trigger" type="button">Sở chưa trình</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const r=host.querySelector('td').getBoundingClientRect();
    return {x:r.right-6,y:r.top+r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...modalHoverPoint});
  await new Promise(resolve=>setTimeout(resolve,270));
  const modalLift=await evaluate(`(()=>{
    const cell=document.querySelector('#popup-3d-probe td'),button=cell.querySelector('button');
    return {parent:getComputedStyle(cell).boxShadow,hover:cell.matches(':hover'),
      buttonHover:button.matches(':hover'),liftY:new DOMMatrixReadOnly(getComputedStyle(button).transform).m42,
      shadow:getComputedStyle(button).boxShadow,
      widths:[cell.getBoundingClientRect().width,button.getBoundingClientRect().width]};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:785,y:9});
  await new Promise(resolve=>setTimeout(resolve,270));
  const modalReset=await evaluate(`new DOMMatrixReadOnly(getComputedStyle(
    document.querySelector('#popup-3d-probe button')).transform).m42`);
  await evaluate("document.querySelector('#popup-3d-probe')?.remove()");
  if(!modalLift.hover||modalLift.buttonHover||modalLift.parent!=='none'||
    Math.abs(modalLift.liftY+3)>.25||!modalLift.shadow.includes('7px 13px')||
    modalLift.widths[1]>=modalLift.widths[0]-25||Math.abs(modalReset)>.25)
    throw Error('Popup must lift compact inner control, not table cell: '+JSON.stringify({modalLift,modalReset}));
  console.log('HOVER_3D_B_REPORT_POPUP_PASS',JSON.stringify(modalLift));


  // Guest may change local-only grouping but must never receive admin layout controls.
  const compactGuestSafe=await evaluate(`(()=>{
    const guest=document.querySelector('.guest-compact-menu-bar .compact-columns-menu');
    return !!guest&&guest.textContent.includes('Tùy chọn người phụ trách')&&
      !document.querySelector('.admin-column-arrange-hint')&&
      !document.querySelector('.item-column-panel')&&
      !document.querySelector('.status-palette-trigger');
  })()`);
  if(!compactGuestSafe)throw Error('Guest compact view must remain local-only');
  // V2 intentionally has one compact global toolbar and no duplicate column-header filters.
  if(!await evaluate("!!document.querySelector('.list-filter-toolbar')&&!document.querySelector('.item-column-filter-row')"))
    throw Error('V2 toolbar missing or duplicate full-width per-column filter row returned');
  // Switching Overview / List must never resize or horizontally relocate the shared page header.
  const sharedGeometry=()=>evaluate(`(()=>{
    const selectors=['.topbar','.nav-tabs'];
    return selectors.map(selector=>{
      const bounds=document.querySelector(selector)?.getBoundingClientRect();
      return bounds?{left:bounds.left,width:bounds.width}:null;
    });
  })()`);
  const originalGeometry=await sharedGeometry();
  for(const [tab,ready] of [['Báo cáo tổng hợp','Báo cáo tổng hợp'],['Danh sách các ND trình HĐND','Danh sách các ND trình HĐND']]){
    const clicked=await evaluate(`(()=>{
      const button=[...document.querySelectorAll('.nav-tabs button')].find(b=>b.querySelector('.section-card-title')?.textContent===${JSON.stringify(tab)});
      button?.click();return !!button;
    })()`);
    if(!clicked)throw Error('Missing navigation tab '+tab);
    await eventually("document.querySelector('.nav-tabs button[aria-current=page] .section-card-title')?.textContent==="+JSON.stringify(ready),"Navigation "+tab);
    const leftover=await evaluate(`(()=>{
      const elements=[...document.querySelectorAll('.page-heading,.demo-banner,main > .unknown-note')];
      return {active:document.querySelector('.nav-tabs button[aria-current=page] .section-card-title')?.textContent,
        elements:elements.map(el=>({class:el.className,text:el.textContent?.slice(0,100),parent:el.parentElement?.className}))};
    })()`);
    if(leftover.elements.length)throw Error('Redundant report/list title, source banner or unclassified notice visible: '+JSON.stringify(leftover));
    if(tab==='Báo cáo tổng hợp'){
      const reports=await evaluate(`(()=>{
        const tables=[...document.querySelectorAll('table.report-table')];
        if(tables.length<2)return {ok:false,reason:'Missing report tables'};
        const headers=tables.map(table=>table.querySelector('thead th:first-child')?.textContent?.trim());
        const widths=tables.map(table=>table.querySelector('thead th:first-child')?.getBoundingClientRect().width);
        return {ok:headers.every(text=>text==='Sở, ngành chủ trì')&&
          widths.every(width=>Math.abs(width-widths[0])<2),headers,widths};
      })()`);
      if(!reports.ok)throw Error('Report first-column heading/width mismatch: '+JSON.stringify(reports));
      const cells=await evaluate(`(()=>{
        const tables=[...document.querySelectorAll('table.report-table')];
        const samples=tables.flatMap(table=>[
          table.querySelector('thead th.report-number-header'),
          table.querySelector('tbody td.report-number'),
          table.querySelector('tfoot td.report-number')
        ]).filter(Boolean);
        const focus=[...document.querySelectorAll('.report-focus-button')];
        const summaries=[...document.querySelectorAll('.report-stage-summary')];
        const percents=tables.flatMap(table=>[...table.querySelectorAll('th.report-percent-col')]);
        const progress=tables.flatMap(table=>[...table.querySelectorAll('td.report-percent-col progress')]);
        const coloredHeaders=tables.flatMap(table=>[...table.querySelectorAll('thead th.report-stage-source')]);
        return {ok:samples.length>=6&&samples.every(cell=>getComputedStyle(cell).textAlign==='center')&&
          focus.length===0&&summaries.length>=8&&percents.length===tables.length&&
          progress.length>=tables.length&&progress.every(el=>el.value>=0&&el.value<=100)&&
          coloredHeaders.length>=1&&tables.every(t=>!!getComputedStyle(t).fontFamily),
          samples:samples.map(cell=>getComputedStyle(cell).textAlign),focus:focus.length,
          summaries:summaries.length,percents:percents.length,progress:progress.length,headers:coloredHeaders.length};
      })()`);
      if(!cells.ok)throw Error('Report numeric alignment or streamlined summary UI missing: '+JSON.stringify(cells));
      const colorConsistency=await evaluate(`(()=>{
        const table=[...document.querySelectorAll('table.report-table')]
          .find(t=>t.querySelector('thead th.report-stage-source'));
        if(!table)return {ok:false,reason:'No source-stage report'};
        const results=['source','office','next','completed'].map(stage=>{
          const css='.report-stage-'+stage;
          const cells=[
            table.querySelector('thead th'+css),
            table.querySelector('tbody td'+css),
            table.querySelector('tfoot td'+css)
          ];
          if(cells.some(cell=>!cell))return {stage,ok:true,skipped:true};
          const backgrounds=cells.map(cell=>getComputedStyle(cell).backgroundColor);
          const foregrounds=cells.map(cell=>getComputedStyle(cell).color);
          const same=backgrounds.every(c=>c===backgrounds[0])&&foregrounds.every(c=>c===foregrounds[0]);
          return {stage,ok:same&&backgrounds[0]!=='rgba(0, 0, 0, 0)'&&
            backgrounds[0]!=='rgb(255, 255, 255)',backgrounds,foregrounds};
        });
        return {ok:results.every(result=>result.ok)&&results.some(result=>result.stage==='source'&&!result.skipped),
          results};
      })()`);
      if(!colorConsistency.ok)throw Error('Report status header/body/footer palette mismatch: '+
        JSON.stringify(colorConsistency));
      // A report without intermediate stage must not show an empty
      // "Bước tiếp theo" action chip; Party and Build retain that chip.
      const intermediateChips=await evaluate(`(()=>{
        const titles=[...document.querySelectorAll('.report-surface > .card-header h3')];
        const reports=titles.map(title=>{
          const section=title.closest('.report-surface');
          const labels=[...section.querySelectorAll('.report-flow-summary .report-stage-summary')]
            .map(el=>el.textContent?.trim());
          return {title:title.textContent?.trim(),labels,hasNext:labels.some(l=>l?.includes('Bước tiếp theo'))};
        });
        return {ok:reports.length===5&&reports.every(r=>
          r.hasNext===(r.title.includes('xin ý kiến Thành ủy')||r.title.includes('xây dựng NQ'))),reports};
      })()`);
      if(!intermediateChips.ok)throw Error('Intermediate-stage chips mismatch: '+JSON.stringify(intermediateChips));
      console.log('REPORT_STAGE_SUMMARIES_MATCH_COLUMNS_PASS');
      const buildHeading=await evaluate(`(()=>{
        const title=[...document.querySelectorAll('.report-surface h3')]
          .find(node=>node.textContent?.includes('Tiến độ trình HĐND xây dựng NQ'));
        const heads=[...(title?.closest('.report-surface')?.querySelectorAll('thead th')??[])]
          .map(cell=>cell.textContent?.trim());
        return heads[1]==='Tổng số nội dung'&&heads[2]==='Sở chưa trình'&&
          !heads.includes('Không phải trình');
      })()`);
      if(!buildHeading)throw Error('Build NQ default must hide Không phải trình, preserving other stage columns');
      // Party report shares Build NQ's independently hidden exemption policy.
      // Real source values "Không phải trình" are normalized before collecting
      // unknown states, so no spurious Chưa chuẩn hóa warning should appear.
      const partyExemption=await evaluate(`(()=>{
        const section=[...document.querySelectorAll('.report-surface')]
          .find(node=>node.querySelector('h3')?.textContent?.includes('Tiến độ xin ý kiến Thành ủy'));
        const heads=[...(section?.querySelectorAll('thead th')??[])].map(el=>el.textContent?.trim());
        const total=section?.querySelector('tfoot td.report-total-col');
        const totalText=total?.querySelector('.count-drill > span')?.textContent?.trim()??
          total?.querySelector('strong')?.textContent?.trim()??'';
        const countText=section?.querySelector('.report-heading-count')?.textContent??'';
        const count=Number(countText.match(/\\d+/)?.[0]??-1);
        return {ok:!!section&&heads[1]==='Tổng số nội dung'&&heads[2]==='Sở chưa trình'&&
          !heads.includes('Không phải trình')&&Number(totalText)===count,
          heads,count,totalText};
      })()`);
      if(!partyExemption.ok)throw Error('Party must hide Không phải trình by default: '+JSON.stringify(partyExemption));
      console.log('PARTY_HIDDEN_EXEMPT_DEFAULT_PASS',JSON.stringify(partyExemption));
      // The excluded Build NQ column must be hidden in the initial view.
      // A middle milestone stays visible and appropriately muted.
      const hiddenBuild=await evaluate(`(()=>{
        const section=[...document.querySelectorAll('.report-surface')]
          .find(node=>node.querySelector('h3')?.textContent?.includes('Tiến độ trình HĐND xây dựng NQ'));
        const table=section?.querySelector('table.report-table');
        const header=[...(table?.querySelectorAll('thead th')??[])];
        const pending=header.find(el=>el.textContent?.includes('Đã trình, chờ QĐ'));
        const total=table?.querySelector('tfoot td.report-total-col');
        const totalText=total?.querySelector('.count-drill > span')?.textContent?.trim() ??
          total?.querySelector('strong')?.textContent?.trim()??'';
        const rendered=section?.querySelector('.report-heading-count')?.textContent??'';
        const count=Number(rendered.match(/\\d+/)?.[0]??-1);
        return {ok:!!pending&&pending.classList.contains('report-stage-next')&&
          !header.some(el=>el.textContent?.trim()==='Không phải trình')&&
          !table?.querySelector('.report-stage-excluded')&&
          Number(totalText)===count,
          pending:pending?.className,header:header.map(el=>el.textContent?.trim()),count,totalText};
      })()`);
      if(!hiddenBuild.ok)throw Error('Build NQ must hide exempt column without altering counted totals: '+JSON.stringify(hiddenBuild));
      console.log('BUILD_NQ_HIDDEN_EXEMPT_DEFAULT_PASS',JSON.stringify(hiddenBuild));
      // Delegated singleton uses one bounded geometry read per newly entered
      // count cell, never a per-frame pointermove read or global style selector.
      const leftReportTitles=await evaluate(`(()=>{
        const titles=[...document.querySelectorAll('.report-surface > .card-header h3')];
        const deltas=titles.map(h=>{
          const header=h.closest('.card-header');
          const head=header?.getBoundingClientRect(),txt=h.getBoundingClientRect();
          return {name:h.textContent?.slice(0,35),leftGap:head?Math.round(txt.left-head.left):null,
            align:getComputedStyle(h).textAlign,
            hasInlineCount:(h.textContent??'').includes(' nội dung)')&&(h.textContent??'').includes('(')};
        });
        return {ok:titles.length===5&&deltas.every(v=>v.leftGap!==null&&v.leftGap>=0&&
          v.leftGap<=32&&(v.align==='left'||v.align==='start')&&v.hasInlineCount)&&
          !document.querySelector('.report-surface .card-header p.muted,.report-flow-note,.report-focus-button'),
          count:titles.length,deltas};
      })()`);
      if(!leftReportTitles.ok)throw Error('Report titles must be left-aligned with inline totals and no redundant note/filter: '+JSON.stringify(leftReportTitles));
      const stageChips=await evaluate(`(()=>{
        const chips=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')];
        const active=chips.filter(c=>!c.disabled);
        const height=chips.map(c=>Math.round(c.getBoundingClientRect().height));
        const labels=chips.slice(0,4).map(c=>c.getAttribute('aria-label'));
        return {ok:chips.length===17&&active.length>0&&height.every(n=>n>=35)&&
          chips.every(c=>c.type==='button'&&c.hasAttribute('aria-label'))&&
          chips.every(c=>(parseInt(c.querySelector('strong')?.textContent??'0',10)===0)===c.disabled),
          count:chips.length,active:active.length,smallest:Math.min(...height),labels};
      })()`);
      if(!stageChips.ok)throw Error('Stage summary chips not enlarged or interactive: '+JSON.stringify(stageChips));

      // Option B applies only to clickable summary buttons. Do not lift
      // a disabled zero-count button or change record selection behavior.
      const stageHoverPoint=await evaluate(`(()=>{
        const button=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(b=>!b.disabled);
        button?.scrollIntoView({block:'center',inline:'nearest'});
        const rect=button?.getBoundingClientRect();
        return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;
      })()`);
      if(!stageHoverPoint)throw Error('No active stage button available for 3D hover B test');
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...stageHoverPoint});
      await new Promise(resolve=>setTimeout(resolve,270));
      const stageHoverB=await evaluate(`(()=>{
        const button=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(b=>!b.disabled);
        const style=getComputedStyle(button);
        const disabled=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(b=>b.disabled);
        return {hover:button.matches(':hover'),liftY:new DOMMatrixReadOnly(style.transform).m42,
          shadow:style.boxShadow,border:style.borderTopColor,
          disabledLift:disabled?new DOMMatrixReadOnly(getComputedStyle(disabled).transform).m42:null};
      })()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
      if(!stageHoverB.hover||Math.abs(stageHoverB.liftY+3)>.25||
        stageHoverB.border!=='rgb(167, 216, 237)'||
        !stageHoverB.shadow.includes('7px 13px')||
        (stageHoverB.disabledLift!==null&&Math.abs(stageHoverB.disabledLift)>.25))
        throw Error('3D hover B must lift only enabled summary buttons: '+JSON.stringify(stageHoverB));
      console.log('HOVER_3D_B_REPORT_STAGE_PASS',JSON.stringify(stageHoverB));

      const selectedChip=await evaluate(`(()=>{
        const button=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(c=>!c.disabled);
        if(!button)return null;
        const count=Number(button.querySelector('strong')?.textContent??0);
        const label=button.getAttribute('aria-label');
        button.click();
        return {count,label};
      })()`);
      if(!selectedChip)throw Error('No populated stage summary to click');
      await eventually("!!document.querySelector('dialog.report-detail-modal[open]')",
        'Click on stage summary did not open detail list');
      const stageGrid=await evaluate("document.querySelector('dialog.report-detail-modal[open] .report-grid-summary strong')?.textContent??''");
      if(!stageGrid.includes(selectedChip.count+' nội dung'))
        throw Error('Stage summary count and popup selected records differ: '+JSON.stringify({selectedChip,stageGrid}));
      await evaluate("document.querySelector('dialog.report-detail-modal .modal-header button')?.click()");
      await eventually("!document.querySelector('dialog.report-detail-modal[open]')",
        'Stage detail dialog failed to close');

          const sharedTooltip=await evaluate(`(()=>{
        const buttons=[...document.querySelectorAll('.report-surface .count-drill')];
        const tip=document.getElementById('report-shared-tooltip');
        if(!tip||buttons.length<3||tip.dataset.mode!=='delegated')
          return {ok:false,reason:'delegated tooltip host missing'};
        const css=getComputedStyle(tip);
        if(tip.textContent!=='Click để xem chi tiết'||css.width!=='190px'||
          css.height!=='32px'||css.position!=='fixed'||tip.dataset.visible!=='false')
          return {ok:false,reason:'shared fixed panel changed'};
        const styles=[...document.styleSheets];
        const bad=styles.some(sheet=>{
          try{return [...sheet.cssRules].some(rule=>rule.cssText?.includes('body:has(.report-surface .report-table button.count-drill')); }
          catch{return false;}
        });
        if(bad||buttons.some(b=>b.textContent.includes('↗')||b.textContent.includes('Xem')||b.hasAttribute('title')))
          return {ok:false,reason:'global :has or arrows remain'};
        const evt=(type,b,x,y,next=null)=>b.dispatchEvent(new PointerEvent(type,{
          bubbles:true,pointerType:'mouse',clientX:x,clientY:y,relatedTarget:next
        }));
        const a=buttons[0],b=buttons[1];
        evt('pointerover',a,540,380);
        const opened=tip.dataset.visible==='true'&&!a.hasAttribute('aria-describedby');
        evt('pointerout',a,540,380,b);
        evt('pointerover',b,580,380);
        const shared=tip.dataset.visible==='true'&&tip===document.getElementById('report-shared-tooltip')&&
          !b.hasAttribute('aria-describedby');
        evt('pointerout',b,580,380);
        const hidden=tip.dataset.visible==='false';
        let reads=0;const orig=Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect=function(){reads++;return orig.call(this);};
        try {
          for(let i=0;i<300;i++){
            const button=buttons[i%buttons.length];
            evt('pointerover',button,540+i%10,380+i%8);
            evt('pointerout',button,540+i%10,380+i%8);
          }
        } finally{Element.prototype.getBoundingClientRect=orig;}
        return {ok:opened&&shared&&hidden&&reads===300&&
          tip.dataset.visible==='false'&&
          document.querySelectorAll('#report-shared-tooltip').length===1,
          opened,shared,hidden,reads,cycles:300,buttons:buttons.length};
      })()`);
      if(!sharedTooltip.ok)throw Error('Delegated tooltip regression: '+JSON.stringify(sharedTooltip));
      console.log('DELEGATED_TOOLTIP_STRESS',JSON.stringify(sharedTooltip));
      const fullCellGeometry=await evaluate(`(()=>{
        const tables=[...document.querySelectorAll('.report-surface .report-table')];
        if(tables.length!==5)return {ok:false,reason:'missing report tables: '+tables.length};
        const buttons=[...document.querySelectorAll('.report-surface .report-table td .count-drill')];
        if(buttons.length===0)return {ok:false,reason:'no populated drill-down cells'};
        const allFull=buttons.every(button=>{
          const td=button.closest('td'),rect=td.getBoundingClientRect(),
            hit=button.getBoundingClientRect();
          return td.classList.contains('report-clickable-cell')&&
            Math.abs(rect.left-hit.left)<=2&&Math.abs(rect.top-hit.top)<=2&&
            Math.abs(rect.width-hit.width)<=2&&Math.abs(rect.height-hit.height)<=2&&
            getComputedStyle(button).position==='absolute'&&
            !!td.querySelector('.report-cell-sizer')&&button.hasAttribute('aria-label');
        });
        const noEmptyActions=[...document.querySelectorAll('.report-surface .report-table td.report-number')]
          .every(td=>{
            const button=td.querySelector('.count-drill');
            return (!!button)===td.classList.contains('report-clickable-cell')&&
              (!td.classList.contains('report-percent-col')||!button)&&
              (td.textContent.trim()!=='—'||!button);
          });
        const bodyTotals=document.querySelectorAll('.report-surface tbody td.report-total-col.report-clickable-cell').length,
          footerTotals=document.querySelectorAll('.report-surface tfoot td.report-total-col.report-clickable-cell').length,
          statusCells=document.querySelectorAll('.report-surface tbody td.report-clickable-cell:not(.report-total-col)').length;
        const bad=buttons.flatMap(button=>{
          const td=button.closest('td'),r=td.getBoundingClientRect(),h=button.getBoundingClientRect();
          const widthDiff=h.width-r.width,heightDiff=h.height-r.height;
          if(Math.abs(widthDiff)<=2&&Math.abs(heightDiff)<=2&&
            Math.abs(r.left-h.left)<=2&&Math.abs(r.top-h.top)<=2&&
            getComputedStyle(button).position==='absolute'&&td.querySelector('.report-cell-sizer'))return [];
          return [{td:td.className,button:button.className,rect:[r.x,r.y,r.width,r.height],
            hit:[h.x,h.y,h.width,h.height],position:getComputedStyle(button).position,
            style:getComputedStyle(td).position,hasSizer:!!td.querySelector('.report-cell-sizer')}];
        }).slice(0,3);
        return {ok:allFull&&noEmptyActions&&bodyTotals>0&&footerTotals>0&&statusCells>0,
          buttons:buttons.length,bodyTotals,footerTotals,statusCells,allFull,noEmptyActions,bad};
      })()`);
      if(!fullCellGeometry.ok)throw Error('Report full-cell hit targets are incomplete: '+JSON.stringify(fullCellGeometry));

      const drillPoint=await evaluate(`(()=>{
        const b=document.querySelector('.report-surface .report-table td.report-clickable-cell .count-drill');
        b?.scrollIntoView({block:'center',inline:'nearest'});
        const r=b?.getBoundingClientRect();
        return r?{x:r.left+Math.max(9,r.width*.15),y:r.top+r.height/2}:null;
      })()`);
      if(!drillPoint)throw Error('No clickable report count');
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...drillPoint});
      await new Promise(resolve=>setTimeout(resolve,270));
      const drillLift=await evaluate(`(()=>{
        const button=document.querySelector('.report-surface .report-table td.report-clickable-cell .count-drill');
        const td=button.closest('td'),pill=button.querySelector('span');
        const rect=button.getBoundingClientRect(),cell=td.getBoundingClientRect(),ps=getComputedStyle(pill);
        const tdCss=getComputedStyle(td);
        return {hover:button.matches(':hover'),fullHit:Math.abs(rect.width-cell.width)<2,
          cellLift:new DOMMatrixReadOnly(tdCss.transform).m42,cellShadow:tdCss.boxShadow,
          overlayLift:new DOMMatrixReadOnly(getComputedStyle(button).transform).m42,
          pillLift:new DOMMatrixReadOnly(ps.transform).m42,shadow:ps.boxShadow,border:ps.borderTopColor};
      })()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:9});
      await new Promise(resolve=>setTimeout(resolve,270));
      const drillReset=await evaluate(`new DOMMatrixReadOnly(getComputedStyle(
        document.querySelector('.report-surface .report-table td.report-clickable-cell')).transform).m42`);
      if(!drillLift.hover||!drillLift.fullHit||Math.abs(drillLift.overlayLift)>.25||
        Math.abs(drillLift.cellLift+3)>.25||!drillLift.cellShadow.includes('8px 16px')||
        Math.abs(drillLift.pillLift)>.25||drillLift.shadow!=='none'||
        Math.abs(drillReset)>.25)
        throw Error('Report count must retain full-cell hit area and lift whole cell: '+JSON.stringify({drillLift,drillReset}));
      console.log('HOVER_3D_B_REPORT_COUNTERS_PASS',JSON.stringify(drillLift));

      // Compare new cell-only focus against the previous very faint .035
      // fill using the SAME Chrome, DOM, positions and 36 actual mouse moves.
      // CDP CPU counters are diagnostics, not a perceived-latency guarantee.
      const abPoints=await evaluate(`(()=>{
        const first=document.querySelector('.report-surface .report-table tbody tr');
        const buttons=[...(first?.querySelectorAll('.count-drill')??[])];
        if(buttons.length<2)return null;
        buttons[0].scrollIntoView({block:'center',inline:'center'});
        return buttons.slice(0,2).map(button=>{
          const r=button.getBoundingClientRect();
          return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
        });
      })()`);
      if(!abPoints||abPoints.some(p=>p.x<10||p.x>=1600||p.y<10||p.y>=1000))
        throw Error('Cell-hover A/B positions invalid: '+JSON.stringify(abPoints));
      await send('Performance.enable');
      const abMetric=async()=>{
        const result=await send('Performance.getMetrics');
        return Object.fromEntries(result.metrics.map(m=>[m.name,m.value]));
      };
      const abResults=[];
      for(let round=0;round<2;round++){
        for(const mode of (round===0?['old','new']:['new','old'])){
          await evaluate(`(()=>{
            document.querySelector('#hover-ab-previous')?.remove();
            if(${JSON.stringify(mode)}==='old'){
              const style=document.createElement('style');
              style.id='hover-ab-previous';
              style.textContent='.report-surface .report-table td.report-clickable-cell .count-drill:hover{background:rgba(73,124,98,.035)!important;outline:0!important;}';
              document.head.append(style);
            }
          })()`);
          await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:4,y:4});
          await evaluate('new Promise(r=>requestAnimationFrame(()=>r(true)))');
          const before=await abMetric();
          for(let i=0;i<36;i++){
            const p=abPoints[i%2];
            await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y});
            await evaluate('new Promise(r=>requestAnimationFrame(()=>r(true)))');
          }
          const after=await abMetric();
          const delta=n=>Math.round(((after[n]??0)-(before[n]??0))*1000*100)/100;
          abResults.push({round,mode,styleMs:delta('RecalcStyleDuration'),
            layoutMs:delta('LayoutDuration'),scriptMs:delta('ScriptDuration'),
            taskMs:delta('TaskDuration')});
        }
      }
      await evaluate("document.querySelector('#hover-ab-previous')?.remove()");
      await send('Performance.disable');
      console.log('CELL_HOVER_VISUAL_AB',JSON.stringify(abResults));
      // New 3D B contract: whole clickable report cell lifts, numeric badge
      // stays flat and the invisible button still covers the entire cell.
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:4,y:4});
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:abPoints[0].x,y:abPoints[0].y});
      await new Promise(resolve=>setTimeout(resolve,270));
      const hoverVisual=await evaluate(`(()=>{
        const button=document.elementFromPoint(${abPoints[0].x},${abPoints[0].y})?.closest('.count-drill');
        if(!button)return {ok:false,reason:'mouse missed the count'};
        const s=getComputedStyle(button),r=button.getBoundingClientRect(),td=button.closest('td').getBoundingClientRect();
        const pill=button.querySelector('span'),badge=getComputedStyle(pill),
          tdStyle=getComputedStyle(button.closest('td'));
        const others=[...document.querySelectorAll('.report-surface .count-drill')].filter(b=>b!==button);
        const onlyOne=others.every(b=>Math.abs(new DOMMatrixReadOnly(
          getComputedStyle(b.closest('td')).transform).m42)<.25);
        const oneCell=Math.abs(r.width-td.width)<3&&Math.abs(r.height-td.height)<3;
        return {ok:s.outlineStyle==='none'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&
          tdStyle.boxShadow.includes('8px 16px')&&
          Math.abs(new DOMMatrixReadOnly(tdStyle.transform).m42+3)<.25&&
          badge.boxShadow==='none'&&Math.abs(new DOMMatrixReadOnly(badge.transform).m42)<.25&&
          oneCell&&onlyOne,
          fullCellOutline:tdStyle.outline,fill:s.backgroundColor,cellShadow:tdStyle.boxShadow,
          cellLift:new DOMMatrixReadOnly(tdStyle.transform).m42,
          badgeShadow:badge.boxShadow,badgeLift:new DOMMatrixReadOnly(badge.transform).m42,
          oneCell,onlyOne};
      })()`);
      if(!hoverVisual.ok)throw Error('Report count must raise whole clickable cell while numeral stays flat: '+JSON.stringify(hoverVisual));
      console.log('CELL_HOVER_VISUAL_PASS',JSON.stringify(hoverVisual));
      // Real CDP pointer events at the lower-right INSIDE each data cell, not
      // .click() on the number. These corners used to miss the tiny count button.
      for(const selector of [
        '.report-surface tbody td.report-clickable-cell:not(.report-total-col)',
        '.report-surface tbody td.report-total-col.report-clickable-cell',
        '.report-surface tfoot td.report-total-col.report-clickable-cell'
      ]){
        const pos=await evaluate(`(()=>{
          const td=document.querySelector(${JSON.stringify(selector)});
          if(!td)return null;
          td.scrollIntoView({block:'center',inline:'center'});
          const rect=td.getBoundingClientRect(),button=td.querySelector('.count-drill');
          const x=Math.round(rect.right-5),y=Math.round(rect.bottom-5);
          const hit=document.elementFromPoint(x,y);
          return {x,y,covered:hit===button||button.contains(hit),width:rect.width,height:rect.height};
        })()`);
        if(!pos?.covered)throw Error('Cell corner is not clickable: '+selector+' '+JSON.stringify(pos));
        // Reset the pointer outside the scrolling table first. CDP otherwise
        // may keep the same hover target after scrollIntoView/modal close.
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:4,y:4});
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x,y:pos.y});
        const tooltipHovered=await evaluate(`(()=>{
          const button=document.elementFromPoint(${pos.x},${pos.y})?.closest('.count-drill');
          const tooltip=document.querySelector('#report-shared-tooltip');
          if(!button||!tooltip)return {ok:false,reason:'no pointed count'};
          const mode=tooltip.dataset.mode;
          const css=getComputedStyle(tooltip);
          const cell=button.getBoundingClientRect(),bubble=tooltip.getBoundingClientRect();
          const near=Math.abs((bubble.left+bubble.width/2)-(cell.left+cell.width/2))<240&&
            Math.min(Math.abs(bubble.top-cell.bottom),Math.abs(bubble.bottom-cell.top))<100;
          const visible=mode==='delegated'&&css.visibility==='visible'&&
            tooltip.dataset.visible==='true'&&near;
          const dx=Math.max(0,Math.min(cell.right,bubble.right)-Math.max(cell.left,bubble.left));
          const dy=Math.max(0,Math.min(cell.bottom,bubble.bottom)-Math.max(cell.top,bubble.top));
          return {ok:visible&&dx*dy===0&&tooltip.textContent==='Click để xem chi tiết'&&
              !button.textContent.includes('↗')&&
              !button.hasAttribute('aria-describedby'),mode,visibility:css.visibility,near,
              cell:[Math.round(cell.left),Math.round(cell.top)],
              tooltip:[Math.round(bubble.left),Math.round(bubble.top)]};
        })()`);
        if(!tooltipHovered?.ok)throw Error('Real pointer did not reveal native-anchored tooltip: '+selector+' '+JSON.stringify(tooltipHovered));
        await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pos.x,y:pos.y,button:'left',clickCount:1});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos.x,y:pos.y,button:'left',clickCount:1});
        await eventually("!!document.querySelector('dialog.report-detail-modal[open]')",
          'Full-cell corner click failed: '+selector);
        // Guest popup is a table with column filters only, no technical toolbar actions.
        const reportGrid=await evaluate(`(()=>{
          const modal=document.querySelector('dialog.report-detail-modal[open]');
          const grid=modal?.querySelector('.report-detail-grid');
          const cols=grid?.querySelectorAll('thead tr:first-child th').length??0;
          const rows=grid?.querySelectorAll('tbody tr').length??0;
          // Guest may see one permitted-data edit toggle but NEVER the admin
          // settings/presets/resize controls. No full login is needed.
          const forbidden=modal?.querySelector('.report-grid-search,.report-grid-quick-width,.report-grid-presets,.column-resizer,.report-grid-settings,.custom-cell-input');
          const toolbarButtons=[...(modal?.querySelectorAll('.report-grid-toolbar button')??[])];
          const allowedActions=toolbarButtons.every(button=>button.textContent.trim()==='Chỉnh sửa nháp'||button.textContent.trim()==='Về chế độ xem');
          const history=['note','specificProgress'].map(key=>
            grid?.querySelector('tbody tr:first-child td[data-col-key="'+key+'"] button.cell-history-action'));
          const irrelevant=!!grid?.querySelector('tbody tr:first-child td[data-col-key="content"] button.cell-history-action');
          return {ok:!!modal&&cols>=6&&cols<16&&rows>=1&&!forbidden&&
            allowedActions&&!modal.querySelector('.report-grid-toolbar input')&&
            !!grid?.querySelector('.report-grid-filter-row input,.report-grid-filter-row select')&&
            history.every(Boolean)&&!irrelevant,
            cols,rows,forbidden:!!forbidden,historyButtons:history.filter(Boolean).length,irrelevant};
        })()`);
        if(!reportGrid.ok)throw Error('Anonymous report grid controls/history regression: '+JSON.stringify(reportGrid));
        if(selector==='.report-surface tbody td.report-clickable-cell:not(.report-total-col)'){
          // Guest can inspect audit on these two fields even though the popup
          // remains strictly read-only and has no editing controls.
          await evaluate("document.querySelector('dialog.report-detail-modal[open] td[data-col-key=\\\"note\\\"] button.cell-history-action')?.click()");
          await eventually("!!document.querySelector('dialog.modal[open][aria-label^=\\\"Lịch sử sửa đổi\\\"]')",
            'Guest report history must open');
          const historyTitle=await evaluate(`[...document.querySelectorAll('dialog.modal[open]')].map(el=>el.getAttribute('aria-label')).find(x=>x?.includes('Lịch sử sửa đổi'))`);
          if(!historyTitle?.includes('Ghi chú'))throw Error('Guest popup opened wrong history field: '+historyTitle);
          await evaluate("document.querySelector('dialog.modal[open][aria-label^=\\\"Lịch sử sửa đổi\\\"] button[aria-label=\\\"Đóng cửa sổ\\\"]')?.click()");
          await eventually("!document.querySelector('dialog.modal[open][aria-label^=\\\"Lịch sử sửa đổi\\\"]')",
            'Guest nested history did not close');
          console.log('GUEST_REPORT_POPUP_HISTORY_PASS',historyTitle);
        }
        if(selector!=='.report-surface tfoot td.report-total-col.report-clickable-cell'){
          await evaluate("document.querySelector('dialog.report-detail-modal .modal-header button')?.click()");
          await eventually("!document.querySelector('dialog.report-detail-modal[open]')",
            'Intermediate detail dialog failed to close');
        }
      }
      const detailBackdrop=await evaluate(`(()=>{
        const dialog=document.querySelector('dialog.report-detail-modal[open]');
        return !!dialog&&getComputedStyle(dialog,'::backdrop').backdropFilter==='none';
      })()`);
      if(!detailBackdrop)throw Error('Report detail modal backdrop blur was not disabled');
      await evaluate("document.querySelector('dialog.report-detail-modal .modal-header button')?.click()");
      await eventually("!document.querySelector('dialog.report-detail-modal[open]')",
        'Report detail did not close promptly');
    }
    const geometry=await sharedGeometry();
    for(let i=0;i<originalGeometry.length;i++){
      if(!geometry[i]||!originalGeometry[i])throw Error('Missing shared nav geometry');
      if(Math.abs(geometry[i].left-originalGeometry[i].left)>2||
        Math.abs(geometry[i].width-originalGeometry[i].width)>2)
        throw Error('Page chrome shifted when switching '+tab+': '+JSON.stringify({geometry,originalGeometry}));
    }
  }
  // Regression: a tab with custom width centers top controls, two section cards,
  // and page content on the same vertical edges, rather than keeping nav at x=0.
  const alignedCustomWidth=async(width)=>evaluate(`(()=>{
    const shell=document.querySelector('.app-shell');
    shell.style.setProperty('--page-content-width',${JSON.stringify(width+'px')});
    const all=['.topbar','.nav-tabs','main']
      .map(selector=>document.querySelector(selector)?.getBoundingClientRect());
    const expected=Math.min(window.innerWidth-40,${width});
    const reference=all[2],nav=all[1],top=all[0];
    return {ok:all.every(r=>!!r)&&reference.width>=expected-15&&
      Math.abs(top.left-reference.left)<=2&&Math.abs(top.width-reference.width)<=2&&
      nav.width<=1000&&Math.abs((nav.left+nav.right)/2-(reference.left+reference.right)/2)<=3&&
      reference.left>=0&&reference.right<=window.innerWidth+1,
      shellClass:shell.className,activeTab:document.querySelector('.nav-tabs button[aria-current=page]')?.textContent?.trim(),
      mainCssWidth:getComputedStyle(document.querySelector('main')).width,
      boxes:all.map(r=>r?{left:r.left,width:r.width}:null)};
  })()`);
  for(const customWidth of [850,1280]){
    const aligned=await alignedCustomWidth(customWidth);
    if(!aligned.ok)throw Error('Top navigation not centered with '+customWidth+'px content: '+JSON.stringify(aligned));
  }
  await evaluate("document.querySelector('.app-shell')?.style.removeProperty('--page-content-width')");
  // Exercise the exact settings menu markup with the production CSS even in the guest-only
  // mock session. No login or Firebase mutation is required to catch cramped nested-summary CSS.
  const settingsMenuLayout=async()=>evaluate(`(()=>{
    const host=document.querySelector('.topbar .top-actions');
    if(!host)return {ok:false,reason:'No topbar actions'};
    let menu=document.getElementById('smoke-two-entry-settings');
    if(!menu){
      menu=document.createElement('details');menu.id='smoke-two-entry-settings';
      menu.className='options-menu';
      menu.innerHTML='<summary aria-label="Cài đặt">⚙</summary><div class="options-popover"><button type="button">Chỉnh sửa</button><button type="button">Tài khoản và dữ liệu</button></div>';
      host.append(menu);
    }
    menu.open=true;
    const pop=menu.querySelector('.options-popover');
    const buttons=[...pop.querySelectorAll(':scope > button')];
    const rect=pop.getBoundingClientRect();
    const buttonRects=buttons.map(button=>button.getBoundingClientRect());
    const ok=buttons.length===2 &&
      buttons.map(button=>button.textContent.trim()).join('|')==='Chỉnh sửa|Tài khoản và dữ liệu' &&
      pop.querySelectorAll('summary, details').length===0 &&
      rect.width>200&&rect.width<=280 &&
      rect.left>=-1&&rect.right<=window.innerWidth+1 &&
      buttonRects.every(bounds=>bounds.width>=200 && bounds.height>=36 && bounds.height<=52) &&
      buttons.every(button=>getComputedStyle(button).wordBreak==='normal');
    return {ok,viewport:window.innerWidth,rect:{left:rect.left,right:rect.right,width:rect.width},buttons:buttonRects.map(b=>({width:b.width,height:b.height}))};
  })()`);
  const desktopMenu=await settingsMenuLayout();
  if(!desktopMenu.ok)throw Error('Two-item settings menu geometry broken on desktop: '+JSON.stringify(desktopMenu));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:false});
  const mobileMenu=await settingsMenuLayout();
  if(!mobileMenu.ok)throw Error('Two-item settings menu geometry broken on 390px screen: '+JSON.stringify(mobileMenu));
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate("document.getElementById('smoke-two-entry-settings')?.remove()");
  // The full-width site chrome must use wide displays instead of a legacy 1600px cap;
  // report/list page contents can have independent, narrower widths.
  await send('Emulation.setDeviceMetricsOverride',{width:2200,height:1000,deviceScaleFactor:1,mobile:false});
  const wideShell=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),top=document.querySelector('.topbar');
    const main=document.querySelector('main');
    const sr=shell?.getBoundingClientRect(),tr=top?.getBoundingClientRect(),mr=main?.getBoundingClientRect();
    return !!sr&&!!tr&&!!mr&&sr.width>2000&&tr.width>2000&&
      getComputedStyle(shell).maxWidth==='none'&&mr.width<=sr.width;
  })()`);
  if(!wideShell)throw Error('Site shell still capped on 2200px desktop display');
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  const guestOptions=await evaluate(`(()=>{const b=document.querySelector('.guest-signin');b?.click();return !!b})()`);
  if(!guestOptions)throw Error('Guest must have login entry');
  await eventually("document.querySelector('.firebase-panel')!==null || document.querySelector('main')?.textContent?.includes('Tài khoản Firebase')===true",
    'Guest login did not open account page');
  const accountWidth=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell');
    const main=document.querySelector('main');
    const top=document.querySelector('.topbar');
    const tabs=document.querySelector('.nav-tabs');
    if(!shell?.classList.contains('settings-page')||!main||!top||!tabs)
      return {ok:false,reason:'Account settings frame missing'};
    const m=main.getBoundingClientRect(),t=top.getBoundingClientRect(),n=tabs.getBoundingClientRect();
    return {ok:Math.abs(m.width-1100)<3&&Math.abs(m.left-t.left)<3&&
      Math.abs(m.width-t.width)<3&&n.width<=1000&&
      Math.abs((n.left+n.right)/2-(m.left+m.right)/2)<3,
      main:m.width,top:t.width,tabs:n.width};
  })()`);
  if(!accountWidth.ok)throw Error('Account settings must use compact aligned frame: '+JSON.stringify(accountWidth));
  const shot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-ui-smoke-pass.png',Buffer.from(shot.data,'base64'));

  // Open the real ItemList component in a standalone, synthetic-only QA mount.
  // This is not the deployed admin user journey; it verifies actual production
  // merged-cell JSX + CSS, filters and options without live credentials.
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html'});
  await eventually("document.querySelector('[data-qa=compact-real-itemlist] .item-heading-row')!==null",
    'Real ItemList compact QA did not mount');
  // U01/U02 mandatory in the REAL ItemList, irrespective of legacy stored flags.
  const desktopGroups=await evaluate(`(()=>{
    const table=document.querySelector('.item-data-table');
    const columns=[...document.querySelectorAll('.item-heading-row th')]
      .map(x=>x.getAttribute('data-column-key'));
    const row=document.querySelector('.item-data-table tbody tr');
    const doc=row?.querySelector('td[data-col-key=content]');
    const stages=row?.querySelector('td[data-col-key=partyLevel]');
    const team=row?.querySelector('td[data-col-key=room]');
    const labels=[...stages?.querySelectorAll('.compact-stage-label')??[]]
      .map(x=>x.textContent?.trim());
    const docTop=doc?.querySelector('.compact-document-heading');
    const kind=docTop?.querySelector('.compact-document-badge');
    const department=docTop?.querySelector('.compact-document-department');
    return {ok:columns.length===6&&new Set(columns).size===6&&
      columns.includes('content')&&columns.includes('partyLevel')&&columns.includes('room')&&
      !columns.some(k=>['type','department','progressParty','progressBuild','progressCouncil',
        'specialist','ubndLeader','vpLeader'].includes(k))&&
      !!kind&&!!department&&!!doc?.querySelector('.compact-document-content')&&
      kind.textContent?.includes('QPPL')&&department.textContent?.includes('Sở mẫu A')&&
      stages?.querySelectorAll('.compact-stage-row').length===3&&
      labels.some(x=>x.includes('Thành ủy'))&&labels.some(x=>x.includes('Xây dựng NQ'))&&
      labels.some(x=>x.includes('Ban hành NQ'))&&
      team?.textContent?.includes('Phòng mẫu 1')&&
      !table.querySelector('.editable-cell')&&
      !!document.querySelector('.compact-columns-menu'),
      columns,labels,documentHeading:docTop?.textContent?.trim(),staff:team?.textContent?.slice(0,140)};
  })()`);
  if(!desktopGroups.ok)throw Error('U01/U02/team desktop regression: '+JSON.stringify(desktopGroups));
  console.log('COMPACT_U01_U02_DESKTOP_PASS',JSON.stringify(desktopGroups));

  // W0 is a DOM-only reconstruction using the prior saved source width (68px)
  // and the SAME synthetic data, viewport, browser and CSS. It is NOT a live
  // snapshot of the historical deployed version; the report explicitly says so.
  // W1 measures the real rendered ID cell. No backend or localStorage writes.
  const baselineId=await evaluate(`(()=>{
    const table=document.querySelector('.item-data-table');
    const col=table?.querySelector('colgroup col:first-child');
    const td=table?.querySelector('tbody tr td[data-col-key=displayCode]');
    if(!table||!col||!td)return null;
    window.__idMeasurement={table:table.style.width,col:col.style.width};
    const w1=td.getBoundingClientRect().width;
    col.style.width='68px';table.style.width=(parseFloat(table.style.width)+68-w1)+'px';
    const w0=td.getBoundingClientRect().width;
    return {w0,w1,source:68,viewport:innerWidth};
  })()`);
  if(!baselineId||!Number.isFinite(baselineId.w0)||!Number.isFinite(baselineId.w1))
    throw Error('Cannot measure real ID column geometry');
  const beforeIdShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-id-before-simulated.png',Buffer.from(beforeIdShot.data,'base64'));
  // Prior PR #90 version was 23px. This is a same-fixture DOM simulation for
  // side-by-side visuals, NOT a historical screenshot/deployed Pages image.
  await evaluate(`(()=>{
    const table=document.querySelector('.item-data-table');
    table.querySelector('colgroup col:first-child').style.width='23px';
    table.style.width=(parseFloat(window.__idMeasurement.table)+23-
      parseFloat(window.__idMeasurement.col))+'px';
  })()`);
  const old23Shot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-id-r04-before-23-simulated.png',Buffer.from(old23Shot.data,'base64'));
  const restoredId=await evaluate(`(()=>{
    const table=document.querySelector('.item-data-table');
    const col=table.querySelector('colgroup col:first-child');
    col.style.width=window.__idMeasurement.col;
    table.style.width=window.__idMeasurement.table;
    const td=table.querySelector('tbody tr td[data-col-key=displayCode]');
    const w1=td.getBoundingClientRect().width;
    const idText=td.querySelector('.code');
    const css=getComputedStyle(idText);
    const textRange=document.createRange();textRange.selectNodeContents(idText);
    return {w1,cellText:idText.textContent?.trim(),title:idText.getAttribute('title'),
      ariaLabel:idText.getAttribute('aria-label'),focusable:idText.tabIndex,
      overflow:td.scrollWidth>td.clientWidth+2,wrap:css.whiteSpace,
      lines:textRange.getClientRects().length,
      fullValue:idText.textContent?.trim(),textWidth:idText.scrollWidth};
  })()`);
  const afterIdShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-id-after.png',Buffer.from(afterIdShot.data,'base64'));
  const idRatio=baselineId.w0/restoredId.w1;
  if(Math.abs(restoredId.w1-baselineId.w1)>1||
     baselineId.w0<60||baselineId.w0>72||
     Math.abs(restoredId.w1-52)>1||restoredId.overflow||
     !restoredId.cellText||restoredId.focusable!==0||!restoredId.ariaLabel||
     restoredId.wrap!=='nowrap'||restoredId.lines!==1||restoredId.cellText!=='NQ01')
    throw Error('R04 ID 52px width, single-line and full title/focus contract: '+
      JSON.stringify({baselineId,restoredId,idRatio}));
  const r04Shot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-id-r04-after-52px.png',Buffer.from(r04Shot.data,'base64'));
  console.log('R04_ID_52PX_BROWSER',JSON.stringify({baselineId,restoredId,ratio:idRatio.toFixed(2),
    baselineMeaning:'DOM-only source-width reconstruction, not historical deployment'}));

  const menuOpened=await evaluate(`(()=>{
    const menu=document.querySelector('.compact-columns-menu');
    if(!menu)return false;menu.open=true;return !!menu.querySelector('.compact-columns-options');
  })()`);
  if(!menuOpened)throw Error('Staff compact menu missing');
  const compactMenuDesktop=await evaluate(`(()=>{
    const panel=document.querySelector('.compact-columns-options');
    const rect=panel?.getBoundingClientRect();
    const labels=[...panel?.querySelectorAll('label')??[]];
    return {ok:!!panel&&labels.length===6&&
      panel.querySelectorAll('.compact-more-options').length===1&&
      panel.querySelectorAll(':scope > label').length===4&&
      rect.left>=0&&rect.right<=innerWidth&&rect.height<580&&
      labels.some(label=>label.textContent.includes('Chuyên viên và phòng cùng dòng')),
      count:labels.length,rect:rect?{left:rect.left,right:rect.right,height:rect.height}:null};
  })()`);
  if(!compactMenuDesktop.ok)throw Error('Staff menu geometry/options regression: '+JSON.stringify(compactMenuDesktop));
  const groupShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-compact-desktop-pass.png',Buffer.from(groupShot.data,'base64'));

  const leaderToggle=await evaluate(`(()=>{
    const label=[...document.querySelectorAll('.compact-columns-options label')]
      .find(x=>x.textContent.includes('Lãnh đạo UBND + VP'));
    const checkbox=label?.querySelector('input');
    if(!checkbox)return false;checkbox.click();return true;
  })()`);
  if(!leaderToggle)throw Error('Leader pair switch missing');
  await eventually("document.querySelectorAll('.item-heading-row th').length===8",
    'Switch to leader pair must restore room and specialist source columns');
  const leaderKeys=await evaluate(`[...document.querySelectorAll('.item-heading-row th')].map(x=>x.dataset.columnKey)`);
  if(!leaderKeys.includes('room')||!leaderKeys.includes('specialist')||
    !leaderKeys.includes('vpLeader')||leaderKeys.includes('ubndLeader'))
    throw Error('Leader pair projection lost a staff source field: '+JSON.stringify(leaderKeys));
  const teamToggle=await evaluate(`(()=>{
    const label=[...document.querySelectorAll('.compact-columns-options label')]
      .find(x=>x.textContent.includes('UBND + VP + Phòng + CV'));
    const checkbox=label?.querySelector('input');
    if(!checkbox)return false;checkbox.click();return true;
  })()`);
  if(!teamToggle)throw Error('Team merge switch missing');
  await eventually("document.querySelectorAll('.item-heading-row th').length===6",
    'Restoring team must still preserve the mandatory document/stage groups');

  await send('Emulation.setDeviceMetricsOverride',{width:768,height:1000,deviceScaleFactor:1,mobile:false});
  const tabletGroups=await evaluate(`(()=>{
    const scroll=document.querySelector('.item-table-scroll');
    const doc=document.querySelector('.item-data-table td[data-col-key=content] .compact-document-group');
    const stage=document.querySelector('.item-data-table td[data-col-key=partyLevel]');
    const id=document.querySelector('.item-data-table td[data-col-key=displayCode]');
    const root=document.scrollingElement;
    const badge=doc?.querySelector('.compact-document-badge');
    return {ok:!!scroll&&scroll.scrollWidth>scroll.clientWidth&&
      root.scrollWidth<=innerWidth+4&&!!doc&&!!badge&&
      stage?.querySelectorAll('.compact-stage-row').length===3&&
      !!id&&Math.abs(id.getBoundingClientRect().width-52)<=1&&
      badge.getBoundingClientRect().width<=doc.getBoundingClientRect().width+2,
      viewport:innerWidth,idWidth:id?.getBoundingClientRect().width,
      scrollWidth:scroll?.scrollWidth,viewportWidth:scroll?.clientWidth,
      bodyScrollWidth:root?.scrollWidth};
  })()`);
  if(!tabletGroups.ok)throw Error('U01/U02/U03 768px viewport regression: '+JSON.stringify(tabletGroups));
  const tabletShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-compact-tablet-pass.png',Buffer.from(tabletShot.data,'base64'));
  console.log('COMPACT_TABLET_768_PASS',JSON.stringify(tabletGroups));

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:false});
  const mobileGroups=await evaluate(`(()=>{
    const menu=document.querySelector('.compact-columns-menu');if(menu)menu.open=true;
    const panel=document.querySelector('.compact-columns-options');
    const viewport=document.querySelector('.item-table-scroll');
    const rect=panel?.getBoundingClientRect();
    const html=document.scrollingElement;
    const labels=[...panel?.querySelectorAll('label')??[]];
    const id=document.querySelector('.item-data-table tbody td[data-col-key=displayCode]');
    return {ok:!!rect&&rect.left>=-1&&rect.right<=innerWidth+1&&
      rect.height<innerHeight-40&&getComputedStyle(panel).overflowY==='auto'&&
      labels.length===6&&viewport.scrollWidth>viewport.clientWidth&&
      html.scrollWidth<=innerWidth+4&&!!id&&Math.abs(id.getBoundingClientRect().width-52)<=1,
      viewport:innerWidth,labels:labels.length,
      menu:rect?{left:rect.left,right:rect.right,height:rect.height}:null,
      idWidth:id?.getBoundingClientRect().width,
      tableScrollWidth:viewport?.scrollWidth,bodyScrollWidth:html?.scrollWidth};
  })()`);
  if(!mobileGroups.ok)throw Error('Responsive U01/U02/U03 geometry regression: '+JSON.stringify(mobileGroups));
  const mobileShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-compact-mobile-pass.png',Buffer.from(mobileShot.data,'base64'));

  // QA-only in-memory field edit: all stages must be visible, while selecting
  // the Thành ủy cấp cannot mutate other independent source fields.
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?edit=1'});
  await eventually("document.querySelector('.item-data-table tbody tr td[data-col-key=partyLevel] .cell-picker-trigger')!==null",
    'Field-level staged editor missing');
  const beforeStageEdit=await evaluate(`(()=>{
    const cell=document.querySelector('.item-data-table tbody tr td[data-col-key=partyLevel]');
    return [...cell.querySelectorAll('.compact-stage-row')].map(x=>({
      value:x.querySelector('.compact-stage-state')?.textContent?.trim()??'',
      text:x.textContent?.trim()??''
    }));
  })()`);
  const editOpened=await evaluate(`(()=>{
    const cell=document.querySelector('.item-data-table tbody tr td[data-col-key=partyLevel]');
    const first=cell?.querySelector('.compact-stage-level .cell-picker-trigger');
    if(!first||cell.querySelectorAll('.compact-stage-row').length!==3)return false;
    first.click();return true;
  })()`);
  if(!editOpened)throw Error('Independent Cấp Thành ủy cell editor missing');
  await eventually("document.querySelector('.cell-picker-popover:popover-open .cell-picker-option')!==null",
    'Cấp stage cell picker popover did not open');
  const selected=await evaluate(`(()=>{
    const choices=[...document.querySelectorAll('.cell-picker-popover:popover-open .cell-picker-option')];
    const next=choices.find(x=>x.textContent?.trim()==='BTV');
    if(!next)return false;next.click();return true;
  })()`);
  if(!selected)throw Error('QA BTV choice missing');
  await eventually("document.querySelector('.item-data-table tbody tr td[data-col-key=partyLevel]')?.textContent?.includes('BTV')",
    'Selecting staged Cấp value failed');
  const isolatedEdit=await evaluate(`(()=>{
    const cell=document.querySelector('.item-data-table tbody tr td[data-col-key=partyLevel]');
    const rows=[...cell.querySelectorAll('.compact-stage-row')].map(x=>x.textContent.trim());
    const values=[...cell.querySelectorAll('.compact-stage-state')]
      .map(x=>x.textContent?.trim()??'');
    return {ok:rows.length===3&&rows[0].includes('BTV')&&
      rows[0]!==${JSON.stringify(beforeStageEdit[0].text)}&&
      rows[1]===${JSON.stringify(beforeStageEdit[1].text)}&&
      rows[2]===${JSON.stringify(beforeStageEdit[2].text)}&&
      values.every((value,i)=>value===${JSON.stringify(beforeStageEdit.map(x=>x.value))}[i]),
      rows,values};
  })()`);
  if(!isolatedEdit.ok)throw Error('Source stage editors must not cross-write: '+JSON.stringify(isolatedEdit));

  // U04 is OFF until a guest explicitly enables it; source and UID isolation
  // survives reload, while shared default and all source values remain intact.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?guest=1'});
  await eventually("document.querySelector('.guest-compact-menu-bar .compact-columns-menu')!==null",
    'Guest personal compact menu missing');
  const guestInitial=await evaluate(`(()=>{
    const menu=document.querySelector('.guest-compact-menu-bar .compact-columns-menu');
    menu.open=true;
    const label=[...menu.querySelectorAll('label')].find(x=>x.textContent.includes('Chuyên viên và phòng cùng dòng'));
    return {columns:document.querySelectorAll('.item-heading-row th').length,
      hasInline:!!document.querySelector('.compact-cv-room-line'),
      checkbox:label?.querySelector('input')?.checked??null};
  })()`);
  if(guestInitial.columns!==6||guestInitial.hasInline||guestInitial.checkbox!==false)
    throw Error('U04 must default off for guest and preserve 6 non-STT displayed columns: '+JSON.stringify(guestInitial));
  const guestToggle=await evaluate(`(()=>{
    const label=[...document.querySelectorAll('.guest-compact-menu-bar label')]
      .find(x=>x.textContent.includes('Chuyên viên và phòng cùng dòng'));
    const checkbox=label?.querySelector('input');
    if(!checkbox)return false;checkbox.click();return true;
  })()`);
  if(!guestToggle)throw Error('Guest cannot enable U04 inline CV/Phòng');
  await eventually("document.querySelector('.item-data-table tbody tr .compact-cv-room-line')!==null",
    'U04 inline staff rendering did not activate');
  const guestSaved=await evaluate(`(()=>{
    const key='hdnd.viewer-compact.v1:viewer-compact:compact-qa-synthetic-only:synthetic-guest';
    const prefs=JSON.parse(localStorage.getItem(key)||'null');
    return {ok:prefs?.cvRoomInline===true&&prefs?.teamTogether===true&&
      document.querySelectorAll('.item-heading-row th').length===6,
      inlineText:document.querySelector('.compact-cv-room-line')?.textContent?.slice(0,150)};
  })()`);
  if(!guestSaved.ok)throw Error('U04 guest localStorage scope or inline view regression: '+JSON.stringify(guestSaved));
  const guestShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-compact-guest-pass.png',Buffer.from(guestShot.data,'base64'));
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?guest=1'});
  await eventually("document.querySelector('.compact-cv-room-line')!==null",
    'U04 personal option did not survive reload');
  const resetGuest=await evaluate(`(()=>{
    const menu=document.querySelector('.guest-compact-menu-bar .compact-columns-menu');
    if(!menu)return false;menu.open=true;
    const button=[...menu.querySelectorAll('button')]
      .find(x=>x.textContent.includes('Khôi phục cách hiển thị chung'));
    if(!button)return false;button.click();return true;
  })()`);
  if(!resetGuest)throw Error('Guest reset option missing');
  await eventually("document.querySelector('.compact-cv-room-line')===null",
    'Reset must restore shared U04=false');
  if(!await evaluate("localStorage.getItem('hdnd.viewer-compact.v1:viewer-compact:compact-qa-synthetic-only:synthetic-guest')===null"))
    throw Error('Guest reset wrote to source or failed to clear local setting');
  console.log('U04_GUEST_LOCAL_ONLY_RELOAD_RESET_PASS',JSON.stringify(guestSaved));
  console.log('GROUPED_STAGED_FIELD_EDIT_IN_MEMORY_PASS',JSON.stringify(isolatedEdit));
  console.log('COMPACT_REAL_ITEMLIST_DESKTOP_MOBILE_PASS',JSON.stringify({desktopGroups,compactMenuDesktop,mobileGroups}));


  // V2 R01: exercise the real List toolbar on synthetic full-name records.
  // Searches always inspect ORIGINAL member fields even if projection shortens names.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?review-staff=1'});
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length===8",
    'R01 staff fixture did not render');
  const staffSearch=async(key,term,count)=>{
    const found=await evaluate(`(()=>{
      const input=document.querySelector('input[aria-label="Tìm kiếm không dấu"]');
      if(!input)return false;input.focus();return true;
    })()`);
    if(!found)throw Error('V2 R01 global search missing '+key);
    await send('Input.insertText',{text:term});
    await eventually(`document.querySelectorAll('.item-data-table tbody tr.color-row').length===${count}`,
      'V2 R01 did not match full source member '+term);
    const rows=await evaluate(`[...document.querySelectorAll('.item-data-table tbody tr.color-row')]
      .map(x=>x.querySelector('td[data-col-key="displayCode"]')?.textContent.trim())`);
    if(rows.length!==count)throw Error('V2 R01 count mismatch '+term);
    if(term==='Chuyên viên mẫu A'){
      const shot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync('hophdnd-review-r01-after.png',Buffer.from(shot.data,'base64'));
    }
    await evaluate("document.querySelector('.list-filter-clear')?.click()");
    await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length===8",
      'V2 R01 clearing global search must restore all records');
    return {term,count,ids:rows};
  };
  const r01=[];
  r01.push(await staffSearch('room','Chuyên viên mẫu A',2));
  r01.push(await staffSearch('room','Phong mau 2',2));
  r01.push(await staffSearch('vpLeader','PCVP Trần Văn B',1));
  r01.push(await staffSearch('ubndLeader','PCT Nguyễn Văn C',1));
  // Verify search AND exact dropdown, never a merged OR or substring match.
  await evaluate("document.querySelector('input[aria-label=\\\"Tìm kiếm không dấu\\\"]')?.focus()");
  await send('Input.insertText',{text:'Chuyên viên mẫu A'});
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length===2",
    'V2 R01 specialist search absent before AND check');
  const addDepartment=await evaluate(`(()=>{
    const select=document.querySelector('select[aria-label="Lọc Sở, ngành"]');
    if(!select||![...select.options].some(x=>x.value==='Sở mẫu B'))return false;
    select.value='Sở mẫu B';select.dispatchEvent(new Event('change',{bubbles:true}));return true;
  })()`);
  if(!addDepartment)throw Error('V2 R01 exact Sở dropdown missing');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('Không tìm thấy nội dung')===true",
    'V2 R01 search AND exact department did not exclude nonmatches');
  await evaluate("document.querySelector('.list-filter-clear')?.click()");
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length===8",
    'V2 R01 clearing AND conditions failed');

  const advanced=await evaluate(`(()=>{
    const detail=document.querySelector('details.list-filter-other');
    if(!detail)return {ok:false};detail.open=true;
    const choices=[...detail.querySelectorAll('select')].map(x=>x.getAttribute('aria-label'));
    return {ok:detail.open,choices};
  })()`);
  await eventually("document.querySelector('select[aria-label=\\\"Lọc Tiến độ Thành ủy chi tiết\\\"]')!==null",
    'V2 R01 advanced full-status selector did not mount');
  const advancedFields=await evaluate(`[...document.querySelectorAll('.list-filter-other-panel select')]
    .map(x=>x.getAttribute('aria-label'))`);
  if(!advanced.ok||!['Chọn trường tìm kiếm','Lọc Cấp Thành ủy cho ý kiến',
     'Lọc Tiến độ Thành ủy chi tiết','Lọc Tiến độ xây dựng NQ chi tiết',
     'Lọc Tiến độ ban hành NQ/BC chi tiết','Lọc Chuyên viên',
     'Lọc Lãnh đạo VP','Lọc Lãnh đạo UBND'].every(x=>advancedFields.includes(x)))
    throw Error('V2 advanced filter fields incomplete '+JSON.stringify({advanced,advancedFields}));
  await evaluate("document.querySelector('details.list-filter-other').open=false");
  await eventually("document.querySelector('.list-filter-other-panel')===null",
    'Advanced select DOM must unmount when panel closes');

  const toggleLeader=await evaluate(`(()=>{
    const menu=document.querySelector('.compact-columns-menu');if(!menu)return false;
    menu.open=true;
    const label=[...menu.querySelectorAll('label')]
      .find(x=>x.textContent.includes('Lãnh đạo UBND + VP'));
    const input=label?.querySelector('input');if(!input)return false;input.click();return true;
  })()`);
  if(!toggleLeader)throw Error('R01 cannot test leadersTogether');
  await eventually("!!document.querySelector('th[data-column-key=vpLeader]')",
    'R01 leadersTogether did not project');
  r01.push(await staffSearch('vpLeader','PCVP Tran Van B',1));
  r01.push(await staffSearch('vpLeader','PCT Nguyen Van C',1));
  const restoreTeam=await evaluate(`(()=>{
    const label=[...document.querySelectorAll('.compact-columns-options label')]
      .find(x=>x.textContent.includes('UBND + VP + Phòng + CV'));
    const input=label?.querySelector('input');if(!input)return false;input.click();return true;
  })()`);
  if(!restoreTeam)throw Error('R01 team restore missing');
  await eventually("!!document.querySelector('th[data-column-key=room]')",
    'R01 team source header did not return');
  const toggleInline=await evaluate(`(()=>{
    const label=[...document.querySelectorAll('.compact-columns-options label')]
      .find(x=>x.textContent.includes('Chuyên viên và phòng cùng dòng'));
    const input=label?.querySelector('input');if(!input)return false;input.click();return true;
  })()`);
  if(!toggleInline)throw Error('R01 U04 inline switch missing');
  await eventually("!!document.querySelector('.compact-cv-room-line')",
    'R01 U04 inline view not shown');
  r01.push(await staffSearch('room','Chuyen vien mau A',2));
  r01.push(await staffSearch('room','Phong mau 1',4));
  console.log('V2_R01_FULL_ORIGINAL_SEARCH_ADVANCED_AND_PASS',JSON.stringify(r01));

  // Review 005 / R03: exact on-screen colors, not a snapshot of JS props.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?highlight=1'});
  await eventually("!!document.querySelector('.compact-document-department')",'R03 highlighted list missing');
  const r03list=await evaluate(`(()=>{
    const row=document.querySelectorAll('.item-data-table tbody tr');
    const dept=row[0]?.querySelector('.compact-document-department');
    const type=row[0]?.querySelector('.compact-document-badge');
    const content=row[0]?.querySelector('.compact-document-content');
    const level=row[0]?.querySelector('.compact-stage-level');
    const stage=row[1]?.querySelectorAll('.compact-stage-state')[1];
    const color=el=>el?{background:getComputedStyle(el).backgroundColor,
      text:getComputedStyle(el).color,tag:el.dataset.highlighted??null}:null;
    const d=color(dept),t=color(type),c=color(content),l=color(level),p=color(stage);
    return {ok:d?.background==='rgb(204, 0, 0)'&&d.text==='rgb(255, 255, 255)'&&
      t?.background!=='rgb(204, 0, 0)'&&c?.background!=='rgb(204, 0, 0)'&&
      l?.background==='rgb(18, 52, 86)'&&p?.background==='rgb(255, 238, 85)'&&
      p?.text==='rgb(0, 0, 0)',dept:d,type:t,content:c,level:l,progressBuild:p};
  })()`);
  if(!r03list.ok)throw Error('R03 grouped colors not scoped by source member: '+JSON.stringify(r03list));
  const r03shot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-review-r03-after.png',Buffer.from(r03shot.data,'base64'));
  await evaluate(`[...document.querySelectorAll('.source-column-visibility button')]
    .find(x=>x.textContent.includes('Hiện đủ cột Excel'))?.click()`);
  await eventually("!!document.querySelector('td[data-col-key=department]')",
    'R03 source comparison did not ungroup');
  const sourceColor=await evaluate(`(()=>{
    const td=document.querySelector('td[data-col-key=department]');
    return getComputedStyle(td).backgroundColor;
  })()`);
  if(sourceColor!=='rgb(204, 0, 0)')
    throw Error('R03 original source rule changed: '+sourceColor);
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?highlight=1&hide-dept=1'});
  await eventually("!!document.querySelector('.compact-document-group')",
    'R03 hidden member fixture missing');
  const hiddenMember=await evaluate(`(()=>{
    const doc=document.querySelector('.item-data-table td[data-col-key=content]');
    return {hidden:!doc?.querySelector('.compact-document-department'),
      red:!!doc?.querySelector('[data-highlighted=true][style*="CC0000"]')};
  })()`);
  if(!hiddenMember.hidden||hiddenMember.red)throw Error('R03 hidden department leaked: '+JSON.stringify(hiddenMember));
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?highlight=1&edit=1'});
  await eventually("!!document.querySelector('.compact-document-department .cell-picker-trigger')",
    'R03 grouped editable field missing');
  const editColor=await evaluate(`(()=>{
    const button=document.querySelector('.compact-document-department .cell-picker-trigger');
    return {background:getComputedStyle(button).backgroundColor,text:getComputedStyle(button).color};
  })()`);
  if(editColor.background!=='rgb(204, 0, 0)'||editColor.text!=='rgb(255, 255, 255)')
    throw Error('R03 editable member lost rule: '+JSON.stringify(editColor));
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?highlight=1&popup=1'});
  await eventually("!!document.querySelector('.report-detail-grid .compact-document-department')",
    'R03 popup renderer did not mount');
  const popupColor=await evaluate(`(()=>{
    const group=document.querySelector('.report-detail-grid .compact-document-department');
    const color=getComputedStyle(group);
    const td=group.closest('td'),parent=getComputedStyle(td);
    return {bg:color.backgroundColor,fg:color.color,wholeCell:parent.backgroundColor,
      hasGroup:!!group.closest('.compact-document-group')};
  })()`);
  if(popupColor.bg!=='rgb(204, 0, 0)'||popupColor.fg!=='rgb(255, 255, 255)'||
    popupColor.wholeCell==='rgb(204, 0, 0)'||!popupColor.hasGroup)
    throw Error('R03 popup member source rule missing/overpainted: '+JSON.stringify(popupColor));
  console.log('R03_GROUPED_HIGHLIGHT_LIST_POPUP_PASS',JSON.stringify({r03list,sourceColor,hiddenMember,editColor,popupColor}));



  // Codex Lượt 013 / R05: verify the FULL stage frame (left number/label
  // AND right status) is tinted. All fixtures are local synthetic ItemList.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?r05=1'});
  await eventually("document.querySelector('.item-data-table tbody tr .compact-stage-row[data-progress-tone=office]')!==null",
    'R05 multitone list fixture missing');
  const stageFrames=(selector)=>evaluate(`(()=>{
    const cell=document.querySelector('${selector}');
    const stages=[...cell?.querySelectorAll('.compact-stage-row')??[]];
    return stages.map(el=>{
      const pill=el.querySelector('.compact-stage-state');
      const css=getComputedStyle(el),p=getComputedStyle(pill);
      const label=el.querySelector('.compact-stage-label').getBoundingClientRect();
      const state=pill.getBoundingClientRect(),frame=el.getBoundingClientRect();
      return {tone:el.dataset.progressTone,bg:css.backgroundColor,border:css.borderTopColor,
        gradient:css.backgroundImage,pill:p.backgroundColor,pillText:p.color,
        labelFits:label.right<=frame.right+1,stateFits:state.right<=frame.right+1,
        numberBg:getComputedStyle(el.querySelector('.compact-stage-number')).backgroundColor};
    });
  })()`);
  const r05List=await stageFrames('.item-data-table tbody tr:first-child td[data-col-key=partyLevel]');
  const r05Neutral=await stageFrames('.item-data-table tbody tr:nth-child(2) td[data-col-key=partyLevel]');
  const r05Unknown=await stageFrames('.item-data-table tbody tr:nth-child(3) td[data-col-key=partyLevel]');
  const target=[
    {tone:'not-submitted',bg:'rgb(255, 241, 243)',border:'rgb(239, 212, 218)'},
    {tone:'office',bg:'rgb(255, 248, 233)',border:'rgb(235, 223, 196)'},
    {tone:'done',bg:'rgb(238, 248, 241)',border:'rgb(208, 228, 215)'}
  ];
  if(r05List.length!==3||!r05List.every((x,i)=>x.tone===target[i].tone&&
      x.bg===target[i].bg&&x.border===target[i].border&&x.gradient==='none'&&
      x.pill===target[i].bg&&x.labelFits&&x.stateFits)||
    r05Neutral.length!==3||r05Neutral[0].tone!=='neutral'||
    r05Neutral[0].bg!=='rgb(248, 250, 252)'||
    r05Neutral[0].border!=='rgb(203, 213, 225)'||
    r05Neutral[1].tone!=='neutral'||r05Neutral[2].tone!=='done'||
    r05Unknown[0].tone!=='neutral'||r05Unknown[0].bg!=='rgb(248, 250, 252)')
    throw Error('R05 entire-frame colors / neutral / independent stages: '+
      JSON.stringify({r05List,r05Neutral,r05Unknown}));

  // The "before" is an explicitly simulated CSS-only replay of the old
  // near-white frame on the same checkout, NOT an old production screenshot.
  await evaluate(`(()=>{
    const style=document.createElement('style');style.id='r05-before-simulation';
    style.textContent='.compact-stage-row{background:#fbfdfc!important;border-color:#e5e7eb!important}';
    document.head.append(style);
  })()`);
  const r05Before=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-r05-before-white-simulated.png',Buffer.from(r05Before.data,'base64'));
  await evaluate("document.querySelector('#r05-before-simulation').remove()");
  const r05After=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-r05-after-multitone-list.png',Buffer.from(r05After.data,'base64'));
  const r05Clip=await evaluate(`(()=>{
    const r=document.querySelector('.item-data-table tbody tr:first-child td[data-col-key=partyLevel] .compact-stages').getBoundingClientRect();
    return {x:Math.max(0,r.left),y:Math.max(0,r.top),width:r.width,height:r.height,scale:1};
  })()`);
  const r05Crop=await send('Page.captureScreenshot',{format:'png',clip:r05Clip});
  writeFileSync('hophdnd-r05-after-list-stage-crop.png',Buffer.from(r05Crop.data,'base64'));

  // R03 is still member-scoped; its custom yellow rule must not repaint
  // the red ROW background of progressBuild in row 3.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?r05=1&highlight=1'});
  await eventually("document.querySelector('.compact-stage-state[data-highlighted=true]')!==null",
    'R05 highlighted member fixture missing');
  const r05Highlight=await evaluate(`(()=>{
    const cell=document.querySelector('.item-data-table tbody tr:nth-child(3) td[data-col-key=partyLevel]');
    const stage=cell.querySelectorAll('.compact-stage-row')[1],pill=stage.querySelector('.compact-stage-state');
    const first=document.querySelector('.item-data-table tbody tr:first-child .compact-stage-level');
    return {row:getComputedStyle(stage).backgroundColor,
      pill:getComputedStyle(pill).backgroundColor,highlight:pill.dataset.highlighted,
      level:getComputedStyle(first).backgroundColor};
  })()`);
  if(r05Highlight.row!=='rgb(255, 241, 243)'||
    r05Highlight.pill!=='rgb(255, 238, 85)'||r05Highlight.highlight!=='true'||
    r05Highlight.level!=='rgb(18, 52, 86)')
    throw Error('R05 stage color overrode R03 field highlight: '+JSON.stringify(r05Highlight));

  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?r05=1&r05-palette=1'});
  await eventually("document.querySelector('.compact-stage-row[data-progress-tone=office]')!==null",
    'R05 custom palette fixture missing');
  const r05Custom=await stageFrames('.item-data-table tbody tr:first-child td[data-col-key=partyLevel]');
  if(r05Custom[1].bg==='rgb(255, 248, 233)'||
    r05Custom[1].border==='rgb(235, 223, 196)'||
    r05Custom[1].pill!=='rgb(252, 221, 160)'||
    r05Custom[1].pillText!=='rgb(136, 68, 34)'||
    r05Custom[0].bg!=='rgb(255, 241, 243)')
    throw Error('R05 custom palette did not tint its own frame: '+JSON.stringify(r05Custom));

  // Popup uses the SAME CompactGroupedValue renderer, with a separate table.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?r05=1&popup=1&highlight=1'});
  await eventually("document.querySelector('.report-detail-grid .compact-stage-row')!==null",
    'R05 real popup stage rows missing');
  const r05Popup=await stageFrames('.report-detail-grid tbody tr:first-child');
  if(r05Popup.length!==3||!r05Popup.every((x,i)=>x.bg===target[i].bg&&
    x.border===target[i].border&&x.tone===target[i].tone))
    throw Error('R05 popup and list stage frames differ: '+JSON.stringify(r05Popup));
  const r05PopupShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-r05-after-multitone-popup.png',Buffer.from(r05PopupShot.data,'base64'));
  const popupClip=await evaluate(`(()=>{
    const r=document.querySelector('.report-detail-grid tbody tr:first-child .compact-stages').getBoundingClientRect();
    return {x:Math.max(0,r.left),y:Math.max(0,r.top),width:r.width,height:r.height,scale:1};
  })()`);
  const popupStageShot=await send('Page.captureScreenshot',{format:'png',clip:popupClip});
  writeFileSync('hophdnd-r05-after-popup-stage-crop.png',Buffer.from(popupStageShot.data,'base64'));

  const r05Responsive=[];
  for(const vw of [768,390]){
    await send('Emulation.setDeviceMetricsOverride',{width:vw,height:900,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?r05=1'});
    await eventually("document.querySelector('.compact-stage-row[data-progress-tone=office]')!==null",
      'R05 responsive fixture missing '+vw);
    const samples=await stageFrames('.item-data-table tbody tr:first-child td[data-col-key=partyLevel]');
    const geometry=await evaluate(`(()=>{
      const stages=document.querySelector('.item-data-table tbody tr:first-child .compact-stages');
      const row=stages?.querySelector('.compact-stage-row');
      const label=row?.querySelector('.compact-stage-label')?.getBoundingClientRect();
      const state=row?.querySelector('.compact-stage-state')?.getBoundingClientRect();
      const frame=row?.getBoundingClientRect();
      const id=document.querySelector('td[data-col-key=displayCode]');
      return {stageWidth:frame?.width,sideBySide:!!label&&!!state&&state.top<label.bottom,
        labelInFrame:!!label&&label.right<=frame.right+2,
        stateInFrame:!!state&&state.right<=frame.right+2,
        idWidth:id?.getBoundingClientRect().width,
        bodyWidth:document.scrollingElement.scrollWidth,viewport:innerWidth};
    })()`);
    if(!samples.every((x,i)=>x.bg===target[i].bg&&x.border===target[i].border&&
      x.labelFits&&x.stateFits)||!geometry.labelInFrame||!geometry.stateInFrame||
      geometry.idWidth!==52||geometry.bodyWidth>vw+5)
      throw Error('R05 responsive colored stage overflows '+vw+' '+JSON.stringify({samples,geometry}));
    const shot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync('hophdnd-r05-after-'+vw+'px.png',Buffer.from(shot.data,'base64'));
    r05Responsive.push({vw,geometry,colors:samples.map(x=>x.bg)});
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  console.log('R05_FULL_STAGE_FRAMES_LIST_POPUP_PALETTE_RESPONSIVE_PASS',
    JSON.stringify({r05List,r05Neutral,r05Unknown,r05Highlight,r05Custom,r05Popup,r05Responsive}));

  // Review 005 / R02: REAL keyboard header reorders + separator key and
  // pointer drag on the physical projected widths, no source DOM overrides.
  const widthSnapshot=()=>evaluate(`(()=>{
    const table=document.querySelector('.item-data-table');
    const cols=[...table.querySelectorAll('colgroup > col')];
    const keys=[...table.querySelectorAll('.item-heading-row th')].map(el=>el.dataset.columnKey);
    const widths=cols.map(el=>el.getBoundingClientRect().width);
    return {keys,widths,total:widths.reduce((a,b)=>a+b,0),
      table:table.getBoundingClientRect().width,
      content:widths[keys.indexOf('content')],id:widths[keys.indexOf('displayCode')],
      party:widths[keys.indexOf('partyLevel')]};
  })()`);
  const realArrow=async(key,modifier=0)=>{
    await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,
      modifiers:modifier,windowsVirtualKeyCode:key==='ArrowRight'?39:37});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,
      modifiers:modifier,windowsVirtualKeyCode:key==='ArrowRight'?39:37});
  };
  const moveLast=async(key)=>{
    for(let pass=0;pass<12;pass++){
      const state=await widthSnapshot();
      const current=state.keys.indexOf(key);
      if(current===state.keys.length-1)return;
      const focus=await evaluate(`(()=>{
        const el=document.querySelector('th[data-column-key="${key}"]');
        if(!el||el.tabIndex<0)return false;el.focus();return document.activeElement===el;
      })()`);
      if(!focus)throw Error('R02 cannot focus header for reorder '+key);
      await realArrow('ArrowRight',1);
      await eventually(`[...document.querySelectorAll('.item-heading-row th')]
        .findIndex(x=>x.dataset.columnKey==='${key}')===${current+1}`,
        'R02 Alt+Right did not move '+key);
    }
    throw Error('R02 failed to move '+key+' to last');
  };
  const assertSameTotal=(before,after,label)=>{
    if(Math.abs(before.total-after.total)>1||Math.abs(before.table-after.table)>1)
      throw Error(label+' changed physical total '+JSON.stringify({before,after}));
  };
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html'});
  await eventually("document.querySelectorAll('.item-heading-row th').length===6",
    'R02 baseline list missing');
  await moveLast('displayCode');
  const r02Before=await widthSnapshot();
  const focusResizer=await evaluate(`(()=>{
    const el=document.querySelector('th[data-column-key=content] .column-resizer');
    if(!el)return false;el.focus();return document.activeElement===el;
  })()`);
  if(!focusResizer)throw Error('R02 content separator unavailable with ID last');
  await realArrow('ArrowRight');
  await eventually("document.querySelector('td[data-col-key=partyLevel]')?.getBoundingClientRect().width<=310.5",
    'L019 adjacent progress group did not shrink when content grew');
  const r02Right=await widthSnapshot();
  assertSameTotal(r02Before,r02Right,'R02 ArrowRight');
  if(r02Right.content!==r02Before.content+10||
    r02Right.party!==r02Before.party-10||r02Right.id!==r02Before.id)
    throw Error('L019 neighbor-first changed wrong column: '+JSON.stringify({r02Before,r02Right}));
  await evaluate("document.querySelector('th[data-column-key=content] .column-resizer')?.focus()");
  await realArrow('ArrowLeft');
  await eventually("document.querySelector('td[data-col-key=partyLevel]')?.getBoundingClientRect().width>=320",
    'L019 ArrowLeft did not restore adjacent group width');
  const r02Left=await widthSnapshot();
  assertSameTotal(r02Before,r02Left,'L019 ArrowLeft');
  if(r02Left.content!==r02Before.content||r02Left.party!==r02Before.party||
    r02Left.id!==r02Before.id)
    throw Error('L019 round-trip drag has width drift: '+JSON.stringify({r02Before,r02Left}));
  const dragStart=await evaluate(`(()=>{
    const el=document.querySelector('th[data-column-key=content] .column-resizer');
    el.scrollIntoView({block:'center',inline:'nearest'});
    const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  if(dragStart.x<0||dragStart.x>1600)throw Error('R02 draggable divider off-screen');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...dragStart});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...dragStart,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:dragStart.x+5,y:dragStart.y,button:'left'});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:dragStart.x+5,y:dragStart.y,button:'left',clickCount:1});
  await eventually("document.querySelector('td[data-col-key=content]')?.getBoundingClientRect().width>433",
    'R02 real pointer drag did not resize');
  const r02Drag=await widthSnapshot();
  assertSameTotal(r02Before,r02Drag,'L019 adjacent pointer drag');
  if(r02Drag.content!==r02Before.content+5||
    r02Drag.party!==r02Before.party-5||r02Drag.id!==r02Before.id)
    throw Error('L019 pointer drag altered ID or trailing column: '+JSON.stringify({r02Before,r02Drag}));
  const r02shot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-review-r02-after.png',Buffer.from(r02shot.data,'base64'));

  // Owner L019 explicit fallback: group adjacent reaches physical minimum
  // before the last visible ID (52px default) begins to compensate.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html'});
  await eventually("document.querySelectorAll('.item-heading-row th').length===6",
    'L019 fallback baseline missing');
  await moveLast('displayCode');
  const fallbackBefore=await widthSnapshot();
  const fallbackEdge=await evaluate(`(()=>{
    const el=document.querySelector('th[data-column-key=content] .column-resizer');
    el.scrollIntoView({block:'center',inline:'nearest'});
    const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...fallbackEdge});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...fallbackEdge,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:fallbackEdge.x+160,y:fallbackEdge.y,button:'left'});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:fallbackEdge.x+160,y:fallbackEdge.y,button:'left',clickCount:1});
  await eventually("document.querySelector('td[data-col-key=displayCode]')?.getBoundingClientRect().width<=46.5",
    'L019 fallback failed to use last ID after adjacent reached minimum');
  const fallbackAfter=await widthSnapshot();
  assertSameTotal(fallbackBefore,fallbackAfter,'L019 adjacent exhausted => last fallback');
  if(fallbackAfter.content!==fallbackBefore.content+136||
    fallbackAfter.party!==190||fallbackAfter.id!==46)
    throw Error('L019 fallback exceeded min or skipped adjacent: '+
      JSON.stringify({fallbackBefore,fallbackAfter}));
  const l019BeforeShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-l019-adjacent-exhausted-fallback.png',Buffer.from(l019BeforeShot.data,'base64'));

  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?custom-id=1'});
  await eventually("document.querySelector('.item-data-table td[data-col-key=displayCode]')?.getBoundingClientRect().width>=95",
    'R02 custom ID source width 125 not projected');
  await moveLast('displayCode');
  const customBefore=await widthSnapshot();
  await evaluate("document.querySelector('th[data-column-key=content] .column-resizer')?.focus()");
  await realArrow('ArrowRight');
  await eventually("document.querySelector('.item-data-table td[data-col-key=partyLevel]')?.getBoundingClientRect().width<320",
    'L019 custom-ID adjacent group did not give pixels');
  const customAfter=await widthSnapshot();
  assertSameTotal(customBefore,customAfter,'R02 custom ID');
  if(customAfter.content!==customBefore.content+10||
    customAfter.party!==customBefore.party-10||customAfter.id!==customBefore.id)
    throw Error('L019 custom ID must stay untouched while adjacent can shrink: '+JSON.stringify({customBefore,customAfter}));

  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html'});
  await eventually("document.querySelectorAll('.item-heading-row th').length===6",'R02 grouped fixture missing');
  await moveLast('partyLevel');
  const groupedBefore=await widthSnapshot();
  await evaluate("document.querySelector('th[data-column-key=content] .column-resizer')?.focus()");
  await realArrow('ArrowRight');
  await eventually("document.querySelector('td[data-col-key=content]')?.getBoundingClientRect().width>=450",
    'R02 grouped last-column compensation did not move');
  const groupedAfter=await widthSnapshot();
  assertSameTotal(groupedBefore,groupedAfter,'R02 grouped last');
  console.log('L019_ADJACENT_ID_LAST_KEYBOARD_DRAG_CUSTOM_GROUP_PASS',
    JSON.stringify({r02Before,r02Right,r02Left,r02Drag,customBefore,customAfter,groupedBefore,groupedAfter}));



  // Owner L019: exact screenshot order — Tiến độ hiện tại is immediately
  // before the roomy Lãnh đạo / Phòng / CV group, with Ghi chú last.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+
    '/compact-qa/compact-qa.html?progress-before-staff=1'});
  await eventually("document.querySelectorAll('.item-heading-row th').length===6",
    'L019 reported column order missing');
  const reportedBefore=await widthSnapshot();
  const progressIndex=reportedBefore.keys.indexOf('specificProgress');
  if(progressIndex<0||reportedBefore.keys[progressIndex+1]!=='room'||
    reportedBefore.keys.at(-1)!=='note')
    throw Error('L019 fixture is not progress | staff | note: '+JSON.stringify(reportedBefore));
  const reportBeforeShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-l019-progress-staff-before.png',Buffer.from(reportBeforeShot.data,'base64'));
  const reportedEdge=await evaluate(`(()=>{
    const el=document.querySelector('th[data-column-key=specificProgress] .column-resizer');
    el.scrollIntoView({block:'center',inline:'nearest'});
    const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...reportedEdge});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...reportedEdge,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:reportedEdge.x+50,y:reportedEdge.y,button:'left'});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:reportedEdge.x+50,y:reportedEdge.y,button:'left',clickCount:1});
  await eventually("document.querySelector('td[data-col-key=specificProgress]')?.getBoundingClientRect().width>="+
    (reportedBefore.widths[progressIndex]+49.5),'L019 reported progress column not wider after pointer drag');
  const reportedAfter=await widthSnapshot();
  assertSameTotal(reportedBefore,reportedAfter,'L019 progress+staff exact sample');
  if(reportedAfter.widths[progressIndex]!==reportedBefore.widths[progressIndex]+50||
    reportedAfter.widths[progressIndex+1]!==reportedBefore.widths[progressIndex+1]-50||
    reportedAfter.widths[reportedAfter.keys.indexOf('note')]!==
      reportedBefore.widths[reportedBefore.keys.indexOf('note')])
    throw Error('L019 reported neighbor was not compensated: '+
      JSON.stringify({reportedBefore,reportedAfter}));
  const reportAfterShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-l019-progress-staff-after.png',Buffer.from(reportAfterShot.data,'base64'));
  // Distinct from manual drag: widening the selected List frame allocates
  // available width without a trailing white band; shrinking allows local
  // horizontal scroll if source minimums exceed the frame.
  const frameCases=[];
  for(const frame of ['900','auto']){
    await send('Page.navigate',{url:'http://127.0.0.1:'+port+
      '/compact-qa/compact-qa.html?fit=1'+(frame==='900'?'&frame=900':'')});
    await eventually("document.querySelector('.item-table-scroll colgroup')!==null",
      'L019 selected frame fixture '+frame+' missing');
    const shape=await evaluate(`(()=>{
      const wrap=document.querySelector('.item-table-scroll');
      const cols=[...wrap.querySelectorAll('colgroup col')];
      const widths=cols.map(x=>x.getBoundingClientRect().width);
      const sum=widths.reduce((a,b)=>a+b,0);
      const outer=wrap.getBoundingClientRect().width;
      // The visible vertical scrollbar occupies 12px in CI Chromium.
      // ResizeObserver fits against the actual content box, not border width.
      return {viewport:wrap.clientWidth,outer,scrollbar:outer-wrap.clientWidth,
        table:sum,id:widths[0],document:document.scrollingElement.scrollWidth,
        windowWidth:innerWidth};
    })()`);
    if(shape.table+1<shape.viewport||shape.document>shape.windowWidth+5||
      shape.id>53)
      throw Error('L019 frame fill/ID regression '+frame+': '+JSON.stringify(shape));
    frameCases.push({frame,...shape});
  }
  console.log('L019_PROGRESS_STAFF_ADJACENT_AND_FRAME_FILL_PASS',
    JSON.stringify({reportedBefore,reportedAfter,frameCases}));
  
  // Owner 29/10 screenshot: normal word spacing, a centered HC/department
  // heading and a full-height divider large enough to grab with a mouse.
  // Use editable synthetic mode so the real InlineNoteEditor buttons exist.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+
    '/compact-qa/compact-qa.html?progress-before-staff=1&edit=1'});
  await eventually("document.querySelector('th[data-column-key=specificProgress] .column-resizer')!==null",
    'L023 visible divider fixture missing');
  const textGeometry=await evaluate(`(()=>{
    const style=selector=>{const node=document.querySelector(selector);
      return node?getComputedStyle(node):null;};
    const badge=document.querySelector('.compact-document-badge');
    const dept=document.querySelector('.compact-document-department');
    const center=node=>node?(node.getBoundingClientRect().top+
      node.getBoundingClientRect().bottom)/2:null;
    return {
      grip:document.querySelector('th[data-column-key=specificProgress] .column-resizer')
        .getBoundingClientRect().width,
      progressAlign:style('td[data-col-key=specificProgress]')?.textAlign,
      progressButtonAlign:style('td[data-col-key=specificProgress] .inline-note-trigger')?.textAlign,
      noteAlign:style('td[data-col-key=note]')?.textAlign,
      noteButtonAlign:style('td[data-col-key=note] .inline-note-trigger')?.textAlign,
      contentAlign:style('.compact-document-content')?.textAlign,
      headingAlign:style('.compact-document-heading')?.alignItems,
      badgeY:center(badge),departmentY:center(dept)
    };
  })()`);
  if(textGeometry.grip<13||textGeometry.progressAlign!=='left'||
    textGeometry.progressButtonAlign!=='left'||textGeometry.noteAlign!=='left'||
    textGeometry.noteButtonAlign!=='left'||textGeometry.contentAlign!=='left'||
    textGeometry.headingAlign!=='center'||textGeometry.badgeY===null||
    textGeometry.departmentY===null||
    Math.abs(textGeometry.badgeY-textGeometry.departmentY)>7)
    throw Error('L023 text alignment/grip from owner screenshot: '+JSON.stringify(textGeometry));
  // Grouped Staff has 70px mandatory extra width (min physical 130px).
  // Drag 250px: first 110px from Staff (240→130), then 140px from Note.
  // The other physical widths stay put.
  const wideBefore=await widthSnapshot();
  const wideEdge=await evaluate(`(()=>{
    const r=document.querySelector('th[data-column-key=specificProgress] .column-resizer')
      .getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...wideEdge});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...wideEdge,
    button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:wideEdge.x+250,y:wideEdge.y,
    button:'left'});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:wideEdge.x+250,y:wideEdge.y,
    button:'left',clickCount:1});
  await eventually("document.querySelector('td[data-col-key=specificProgress]')?.getBoundingClientRect().width>=449",
    'L023 drag +250 stopped too early despite last-column fallback');
  const wideAfter=await widthSnapshot();
  assertSameTotal(wideBefore,wideAfter,'L023 owner wide drag');
  const ix=wideBefore.keys.indexOf('specificProgress');
  if(wideAfter.widths[ix]!==wideBefore.widths[ix]+250||
    wideAfter.widths[ix+1]!==130||
    wideAfter.widths.at(-1)!==wideBefore.widths.at(-1)-140||
    wideAfter.id!==wideBefore.id)
    throw Error('L023 adjacent→last fallback incorrect: '+JSON.stringify({wideBefore,wideAfter}));
  console.log('L023_OWNER_COLUMN_DRAG_250_AND_TEXT_ALIGNMENT_PASS',
    JSON.stringify({textGeometry,wideBefore,wideAfter}));

  // Owner L023: anonymous/read-only viewers may resize a column ONLY in
  // their live view; the shared layout is never written and reload resets it.
  const guestResizeUrl='http://127.0.0.1:'+port+
    '/compact-qa/compact-qa.html?progress-before-staff=1&guest=1';
  await send('Page.navigate',{url:guestResizeUrl});
  await eventually("document.querySelector('th[data-column-key=specificProgress] .column-resizer')!==null",
    'L023 guest must have a local-only width divider');
  const guestBefore=await widthSnapshot();
  const storedBefore=await evaluate("localStorage.getItem('hdnd.qa.group-labels-synthetic')");
  const guestEdge=await evaluate(`(()=>{
    const r=document.querySelector('th[data-column-key=specificProgress] .column-resizer')
      .getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...guestEdge});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',...guestEdge,
    button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:guestEdge.x+120,y:guestEdge.y,
    button:'left'});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:guestEdge.x+120,y:guestEdge.y,
    button:'left',clickCount:1});
  await eventually("document.querySelector('td[data-col-key=specificProgress]')?.getBoundingClientRect().width>=319",
    'L023 guest local width did not change');
  const guestAfter=await widthSnapshot();
  assertSameTotal(guestBefore,guestAfter,'L023 guest local-only');
  const gi=guestBefore.keys.indexOf('specificProgress');
  if(guestAfter.widths[gi]!==guestBefore.widths[gi]+120||
    guestAfter.widths[gi+1]!==130||
    guestAfter.widths.at(-1)!==guestBefore.widths.at(-1)-10||
    storedBefore!==await evaluate("localStorage.getItem('hdnd.qa.group-labels-synthetic')"))
    throw Error('L023 guest changed other widths or shared storage: '+JSON.stringify({guestBefore,guestAfter}));
  await send('Page.navigate',{url:guestResizeUrl});
  await eventually("document.querySelector('td[data-col-key=specificProgress]')!==null",
    'L023 guest remount missing');
  const guestReload=await widthSnapshot();
  if(JSON.stringify(guestReload.widths)!==JSON.stringify(guestBefore.widths))
    throw Error('L023 guest edit was not session-only: '+JSON.stringify({guestBefore,guestReload}));
  console.log('L023_GUEST_LOCAL_ONLY_RESIZE_NO_SHARED_WRITE_PASS',
    JSON.stringify({guestBefore,guestAfter,guestReload}));

  // Codex 008 / R02: 1600px physical cap on a grouped source field.
  // Check REAL keyboard and pointer, including when the capped group is last.
  const r02Cap=[];
  for(const sourceCap of [1470,1550,1600]){
    await send('Page.navigate',{url:'http://127.0.0.1:'+port+
      '/compact-qa/compact-qa.html?cap-party='+sourceCap});
    await eventually("document.querySelectorAll('.item-heading-row th').length===6",
      'R02 capped source fixture did not mount');
    const before=await widthSnapshot();
    if(Math.abs(before.party-1600)>1||Math.abs(before.total-2772)>1)
      throw Error('R04/R02 V2 no-STT cap baseline not 1600 / 2772: '+JSON.stringify({sourceCap,before}));
    const focusCap=await evaluate(`(()=>{
      const el=document.querySelector('th[data-column-key=partyLevel] .column-resizer');
      if(!el)return false;el.focus();return document.activeElement===el;
    })()`);
    if(!focusCap)throw Error('R02 cap group cannot receive keyboard focus');
    await realArrow('ArrowRight');
    const atCap=await widthSnapshot();
    assertSameTotal(before,atCap,'R02 cap ArrowRight source '+sourceCap);
    if(atCap.party!==1600||atCap.widths[atCap.keys.indexOf('note')]!==240)
      throw Error('R02 cap ArrowRight transferred hidden pixels: '+JSON.stringify(atCap));
    await evaluate("document.querySelector('th[data-column-key=partyLevel] .column-resizer').focus()");
    await realArrow('ArrowLeft');
    await eventually("document.querySelector('td[data-col-key=partyLevel]')?.getBoundingClientRect().width<=1590",
      'R02 cap ArrowLeft did not visibly shrink group');
    const left=await widthSnapshot();
    assertSameTotal(before,left,'R02 cap ArrowLeft source '+sourceCap);
    const nextAfterParty=left.keys[left.keys.indexOf('partyLevel')+1];
    if(left.party!==1590||left.widths[left.keys.indexOf(nextAfterParty)]!==
      before.widths[before.keys.indexOf(nextAfterParty)]+10||
      left.widths[left.keys.indexOf('note')]!==240)
      throw Error('L019 cap shrink must grow adjacent, not note: '+JSON.stringify(left));
    const point=await evaluate(`(()=>{
      const el=document.querySelector('th[data-column-key=partyLevel] .column-resizer');
      el.scrollIntoView({block:'center',inline:'nearest'});
      const r=el.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};
    })()`);
    if(point.x<0||point.x>1600)throw Error('R02 cap drag divider offscreen');
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});
    await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+20,y:point.y,button:'left'});
    await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+20,y:point.y,button:'left',clickCount:1});
    await eventually("document.querySelector('td[data-col-key=partyLevel]')?.getBoundingClientRect().width>=1599.5",
      'R02 cap pointer drag did not clamp to physical max');
    const drag=await widthSnapshot();
    assertSameTotal(before,drag,'R02 cap pointer source '+sourceCap);
    if(drag.party!==1600||drag.widths[drag.keys.indexOf('note')]!==240)
      throw Error('R02 cap drag mismatch: '+JSON.stringify(drag));
    if(sourceCap===1550){
      const shot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync('hophdnd-review-r02-cap-after.png',Buffer.from(shot.data,'base64'));
    }

    // Move grouped progress column to the last physical position; it now
    // compensates for content (target) instead of Ghi chú (last).
    await moveLast('partyLevel');
    const lastBefore=await widthSnapshot();
    if(lastBefore.keys.at(-1)!=='partyLevel')throw Error('R02 group not last');
    await evaluate("document.querySelector('th[data-column-key=content] .column-resizer').focus()");
    await realArrow('ArrowRight');
    const afterContentKey=lastBefore.keys[lastBefore.keys.indexOf('content')+1];
    await eventually("document.querySelector('td[data-col-key="+afterContentKey+"]')?.getBoundingClientRect().width<="+
      (lastBefore.widths[lastBefore.keys.indexOf(afterContentKey)]-10.0),
      'L019 capped group last must remain unchanged while neighbor compensates');
    const lastRight=await widthSnapshot();
    assertSameTotal(lastBefore,lastRight,'R02 cap group-last ArrowRight '+sourceCap);
    if(lastRight.content!==450||lastRight.party!==1600||
      lastRight.widths[lastRight.keys.indexOf(afterContentKey)]!==
        lastBefore.widths[lastBefore.keys.indexOf(afterContentKey)]-10)
      throw Error('L019 cap group-last: adjacent must compensate before capped group '+JSON.stringify(lastRight));
    await evaluate("document.querySelector('th[data-column-key=content] .column-resizer').focus()");
    await realArrow('ArrowLeft');
    await eventually("document.querySelector('td[data-col-key="+afterContentKey+"]')?.getBoundingClientRect().width>="+
      lastBefore.widths[lastBefore.keys.indexOf(afterContentKey)],
      'L019 group-last adjacent width not restored');
    const lastLeft=await widthSnapshot();
    assertSameTotal(lastBefore,lastLeft,'R02 cap group-last ArrowLeft '+sourceCap);
    if(lastLeft.content!==440||lastLeft.party!==1600||
      lastLeft.widths[lastLeft.keys.indexOf(afterContentKey)]!==
        lastBefore.widths[lastBefore.keys.indexOf(afterContentKey)])
      throw Error('L019 cap group-last reverse must restore neighbor '+JSON.stringify(lastLeft));
    await evaluate("document.querySelector('th[data-column-key=content] .column-resizer').focus()");
    await realArrow('ArrowLeft');
    const lastAtCap=await widthSnapshot();
    assertSameTotal(lastBefore,lastAtCap,'R02 cap group-last left at cap '+sourceCap);
    if(lastAtCap.party!==1600||lastAtCap.content!==430||
      lastAtCap.widths[lastAtCap.keys.indexOf(afterContentKey)]!==
        lastBefore.widths[lastBefore.keys.indexOf(afterContentKey)]+10)
      throw Error('L019 group-last uses adjacent and must not touch capped last '+JSON.stringify(lastAtCap));
    r02Cap.push({sourceCap,before,atCap,left,drag,lastBefore,lastRight,lastLeft,lastAtCap});
  }
  console.log('L019_ADJACENT_GROUP_1600_CAP_KEYBOARD_DRAG_PASS',JSON.stringify(r02Cap));


  // Lượt 018: real main-list cards and stable group titles, not report modal cards.
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?group-title=1&r05=1'});
  await eventually("document.querySelectorAll('.item-summary-grid [data-summary-card]').length===4",
    'Lượt 018: four summary cards missing from main list');
  const fourDesktop=await evaluate(`(()=>{
    const cards=[...document.querySelectorAll('.item-summary-grid > article')];
    const totalBounds=cards[0].getBoundingClientRect();
    const workflowBounds=cards.slice(1).map(c=>c.getBoundingClientRect());
    const summary=document.querySelector('.item-summary-grid').getBoundingClientRect();
    const table=document.querySelector('.item-table-scroll').getBoundingClientRect();
    const region=document.querySelector('.item-data-region').getBoundingClientRect();
    const headings=[...document.querySelectorAll('.item-heading-row th')].map(c=>c.textContent.trim());
    const total=Number(document.querySelector('[data-summary-card=total] .item-summary-total-count')?.textContent);
    const qppl=Number(document.querySelector('[data-summary-kind=qppl] strong')?.textContent);
    const hc=Number(document.querySelector('[data-summary-kind=hc] strong')?.textContent);
    const nqUnknown=Number(document.querySelector('[data-summary-kind=nq-unknown] strong')?.textContent??0);
    const nq=qppl+hc+nqUnknown;
    const bc=Number(document.querySelector('[data-summary-kind=bc] strong')?.textContent);
    const unclassified=Number(document.querySelector('[data-summary-kind=unclassified] strong')?.textContent??0);
    const stages=['party','build','nq'].map(k=>{
      const card=document.querySelector('[data-summary-card='+k+']');
      return {key:k,status:card.querySelectorAll('.item-summary-bucket').length,
        percent:card.querySelector('[role=progressbar]').getAttribute('aria-valuenow'),
        width:card.getBoundingClientRect().width};
    });
    // Owner: compact total is centered ABOVE the three-workflow row.
    return {ok:cards.length===4&&totalBounds.width>0&&totalBounds.width<summary.width*.75&&
      Math.abs(totalBounds.left+totalBounds.width/2-summary.left-summary.width/2)<2&&
      cards[0].scrollWidth<=cards[0].clientWidth+1&&
      totalBounds.bottom<workflowBounds[0].top&&workflowBounds.every(r=>
        Math.abs(r.top-workflowBounds[0].top)<2&&Math.abs(r.width-workflowBounds[0].width)<2)&&
      summary.bottom<table.top&&Math.abs(summary.width-region.width)<2&&
      headings.some(x=>x.includes('Hồ sơ tùy chỉnh'))&&
      headings.some(x=>x.includes('Ba khâu tùy chỉnh'))&&
      headings.some(x=>x.includes('Nhóm phụ trách tùy chỉnh'))&&
      total===nq+bc+unclassified&&stages.map(x=>x.status).join(',')==='4,4,3',
      total,nq,bc,unclassified,regionWidth:region.width,summaryWidth:summary.width,
      summaryBottom:summary.bottom,tableTop:table.top,headings,stages};
  })()`);
  if(!fourDesktop.ok)throw Error('Lượt 018 four-card/heading desktop geometry: '+JSON.stringify(fourDesktop));
  const fourDesktopShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-l018-four-cards-desktop.png',Buffer.from(fourDesktopShot.data,'base64'));
  const pr95List=await evaluate(`(()=>{
    const text=document.body.textContent??'';
    return {presets:!!document.querySelector('.list-view-tools'),
      personalName:text.includes('Mẫu hiển thị cá nhân')||text.includes('Tên mẫu mới')||
        text.includes('Lưu mẫu mới'),
      specialistToggle:text.includes('Chọn chuyên viên toàn cơ quan'),
      toolbar:!!document.querySelector('.list-filter-toolbar input[aria-label="Tìm kiếm không dấu"]'),
      legacyFilterRow:!!document.querySelector('.item-column-filter-row'),
      summaryCards:document.querySelectorAll('[data-summary-card]').length};
  })()`);
  if(pr95List.presets||pr95List.personalName||pr95List.specialistToggle||
    pr95List.summaryCards!==4||!pr95List.toolbar||pr95List.legacyFilterRow)
    throw Error('PR95 V2 compact toolbar/personal UI regression '+JSON.stringify(pr95List));
  const pr95ListShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-pr95-list-compact-synthetic.png',Buffer.from(pr95ListShot.data,'base64'));
  console.log('PR95_REMOVED_PERSONAL_PRESETS_RETAINED_COLUMN_FILTERS_PASS',JSON.stringify(pr95List));
  // Clickable summary counts use live normalized report conditions. Counts
  // retain column-filter context so another quick condition remains selectable.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?group-title=1'});
  await eventually("document.querySelectorAll('button.item-summary-bucket').length===11",
    'Summary quick-filter buttons missing');
  const summaryRows=()=>evaluate("document.querySelectorAll('.item-data-table tbody tr.color-row').length");
  const originalSummaryRows=await summaryRows();
  await evaluate("document.querySelector('[data-summary-report=party][data-summary-stage=next]').click()");
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length===2",
    'Party next must filter both post-VP records, not only one literal status');
  const v2NextRaw=await evaluate(`[...document.querySelectorAll('.item-data-table tbody tr.color-row td[data-col-key=partyLevel]')]
    .map(x=>x.textContent)`);
  if(!v2NextRaw.some(x=>x.includes('Đã gửi ĐU'))||
      !v2NextRaw.some(x=>x.includes('ĐU đã gửi TU, chưa họp')))
    throw Error('V2 grouped next stage replaced original distinct row statuses: '+JSON.stringify(v2NextRaw));
  console.log('V2_NEXT_BUCKET_RAW_LABELS_PRESERVED_PASS',JSON.stringify(v2NextRaw));

  const quickSummary=await evaluate(`({
    selected:document.querySelectorAll('.item-summary-bucket[aria-pressed=true]').length,
    total:Number(document.querySelector('.item-summary-total-count').textContent),
    result:document.querySelector('.item-summary-active-filter')?.textContent,
    totalLabelBeforeCount:document.querySelector('.item-summary-total-lead h3').getBoundingClientRect().right<=
      document.querySelector('.item-summary-total-count').getBoundingClientRect().left,
    bucketHeight:document.querySelector('.item-summary-bucket').getBoundingClientRect().height
  })`);
  if(quickSummary.selected!==1||quickSummary.total!==7||!quickSummary.result.includes('2/7')||
      !quickSummary.totalLabelBeforeCount||quickSummary.bucketHeight<44||quickSummary.bucketHeight>54)
    throw Error('Summary compact/order/selected-state regression: '+JSON.stringify(quickSummary));
  // Public PR QA: record the actual SELECTED filter on the synthetic 7-row
  // fixture. Mobile layout must not wrap any stage LABEL or spill the cards.
  const selectedDesktopShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-summary-filter-selected-desktop.png',
    Buffer.from(selectedDesktopShot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',
    {width:390,height:844,deviceScaleFactor:1,mobile:false});
  const selectedMobile=await evaluate(`(()=>{
    const grid=document.querySelector('.item-summary-grid');
    const buttons=[...grid.querySelectorAll('.item-summary-bucket')];
    const labels=buttons.map(b=>b.querySelector('span'));
    const active=grid.querySelector('.item-summary-active-filter');
    return {width:window.innerWidth,
      cardOverflow:grid.scrollWidth>grid.clientWidth+1,
      labelOverflow:labels.some(l=>l.scrollWidth>l.clientWidth+1),
      multilineLabels:labels.some(l=>l.getBoundingClientRect().height>
        parseFloat(getComputedStyle(l).lineHeight)*1.2),
      maxButtonHeight:Math.max(...buttons.map(b=>b.getBoundingClientRect().height)),
      selected:buttons.filter(b=>b.getAttribute('aria-pressed')==='true').length,
      active:!!active,clear:!!active?.querySelector('button')
    };
  })()`);
  if(selectedMobile.width!==390||selectedMobile.cardOverflow||
      selectedMobile.labelOverflow||selectedMobile.multilineLabels||
      selectedMobile.maxButtonHeight>58||selectedMobile.selected!==1||
      !selectedMobile.active||!selectedMobile.clear)
    throw Error('Mobile summary quick-filter layout regression: '+JSON.stringify(selectedMobile));
  const selectedMobileShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-summary-filter-selected-mobile-390.png',
    Buffer.from(selectedMobileShot.data,'base64'));
  await send('Emulation.setDeviceMetricsOverride',
    {width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  console.log('SUMMARY_SELECTED_DESKTOP_MOBILE_SCREENSHOTS_PASS',JSON.stringify(selectedMobile));
  await evaluate("document.querySelector('[data-summary-report=nq][data-summary-stage=source]').click()");
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length===3",
    'Choosing a new summary condition must replace the previous quick condition');
  await evaluate("document.querySelector('[data-summary-report=nq][data-summary-stage=source]').click()");
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length==="+originalSummaryRows,
    'Second click did not clear summary filter');
  await evaluate("document.querySelector('[data-summary-report=build][data-summary-stage=completed]').click()");
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length===0&&!!document.querySelector('.item-data-table td.empty')",
    'Zero-count summary condition must show an empty list');
  await evaluate("document.querySelector('.item-summary-active-filter button').click()");
  await eventually("document.querySelectorAll('.item-data-table tbody tr.color-row').length==="+originalSummaryRows,
    'Clear summary filter failed');
  await evaluate("document.querySelector('[data-summary-report=party][data-summary-stage=source]').focus()");
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await eventually("document.querySelector('[data-summary-report=party][data-summary-stage=source]').getAttribute('aria-pressed')==='true'",
    'Summary keyboard activation failed');
  // Native button also supports Space. Toggling it off must remove the badge
  // without removing any column filter; reselect for the next combined case.
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await eventually("!document.querySelector('.item-summary-active-filter')",
    'Space must deactivate the selected summary button');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space',windowsVirtualKeyCode:32});
  await eventually("!!document.querySelector('.item-summary-active-filter')",
    'Space must reactivate the selected summary button');
  console.log('SUMMARY_QUICK_FILTER_TOGGLE_SWITCH_ZERO_KEYBOARD_PASS',JSON.stringify(quickSummary));

  // Column filters intersect the quick condition; clearing the quick filter
  // must preserve the existing column filter and summary base counts.
  const inputFocus=await evaluate(`(()=>{
    const el=document.querySelector('input[aria-label="Tìm kiếm không dấu"]');
    if(!el)return false;el.focus();return document.activeElement===el;
  })()`);
  if(!inputFocus)throw Error('Lượt 018 ID filter missing');
  await send('Input.insertText',{text:'NQ01'});
  await eventually("document.querySelector('[data-summary-card=total] .item-summary-total-count')?.textContent==='1'",
    'Lượt 018 summary total failed to follow ID column filter');
  await evaluate("document.querySelector('.item-summary-active-filter button').click()");
  await eventually(`!document.querySelector('.item-summary-active-filter')&&document.querySelector('input[aria-label="Tìm kiếm không dấu"]')?.value==='NQ01'`,
    'Clearing summary condition must preserve the ID column filter');
  const filteredSummary=await evaluate(`(()=>{
    const cards=[...document.querySelectorAll('.item-summary-grid [data-summary-card]')];
    const total=Number(cards[0].querySelector('.item-summary-total-count').textContent);
    const rows=document.querySelectorAll('.item-data-table tbody tr.color-row').length;
    return {total,rows};
  })()`);
  if(filteredSummary.total!==1||filteredSummary.rows!==1)
    throw Error('Lượt 018 summary/list filter scope differs: '+JSON.stringify(filteredSummary));
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?group-title=1&popup=1'});
  await eventually("document.querySelector('.report-detail-grid .compact-stages')!==null",
    'Lượt 018 popup group missing');
  const popupHeadings=await evaluate(`[...document.querySelectorAll('.report-grid-heading-row th')].map(c=>c.textContent.trim())`);
  if(!popupHeadings.some(x=>x.includes('Hồ sơ tùy chỉnh'))||
      !popupHeadings.some(x=>x.includes('Ba khâu tùy chỉnh'))||
      (await evaluate("document.querySelector('.item-summary-grid')!==null")))
    throw Error('Lượt 018 popup title fallback or unexpected KPI cards: '+JSON.stringify(popupHeadings));
  const popupShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-l018-group-titles-popup.png',Buffer.from(popupShot.data,'base64'));

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?group-title=1&r05=1'});
  await eventually("document.querySelectorAll('.item-summary-grid [data-summary-card]').length===4",
    'Lượt 018 mobile cards missing');
  const fourMobile=await evaluate(`(()=>{
    const cards=[...document.querySelectorAll('.item-summary-grid > article')];
    const bounds=cards.map(x=>x.getBoundingClientRect());
    const s=document.querySelector('.item-summary-grid').getBoundingClientRect();
    const table=document.querySelector('.item-table-scroll').getBoundingClientRect();
    return {ok:bounds.length===4&&bounds.every((r,i)=>r.width<=s.width+2&&
      r.left>=s.left-1&&(i===0||r.top>=bounds[i-1].bottom-1))&&
      bounds[3].bottom<table.top&&document.scrollingElement.scrollWidth<=innerWidth+4,
      widths:bounds.map(r=>r.width),tops:bounds.map(r=>r.top),
      bottom:bounds.at(-1).bottom,tableTop:table.top,body:document.scrollingElement.scrollWidth,viewport:innerWidth};
  })()`);
  if(!fourMobile.ok)throw Error('Lượt 018 mobile stacked cards overflow: '+JSON.stringify(fourMobile));
  const l018MobileShot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-l018-four-cards-mobile.png',Buffer.from(l018MobileShot.data,'base64'));
  console.log('L018_GROUP_LABELS_AND_FOUR_CARDS_PASS',JSON.stringify({fourDesktop,filteredSummary,popupHeadings,fourMobile}));
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});


  // R12: an admin must see a DIRECT header-rename entry in the normal
  // list, not only a collapsed subpanel several screens into customization.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html'});
  await eventually("!!document.querySelector('.group-label-shortcut:not(:disabled)')",
    'R12 admin list header rename shortcut missing');
  await evaluate("document.querySelector('.group-label-shortcut').click()");
  await eventually("!!document.querySelector('.group-label-quick-editor input[aria-label=\\\"Đổi tên cột gộp partyTogether\\\"]')",
    'R12 header rename dialog missing');
  const quickNameFocus=await evaluate(`(()=>{
    const input=document.querySelector('.group-label-quick-editor input[aria-label="Đổi tên cột gộp partyTogether"]');
    input?.focus();return document.activeElement===input;
  })()`);
  if(!quickNameFocus)throw Error('R12 header title editor focus missing');
  await send('Input.insertText',{text:'Tiến độ công việc 3 bước'});
  await eventually("document.querySelector('.group-label-quick-editor input[aria-label=\\\"Đổi tên cột gộp partyTogether\\\"]')?.value==='Tiến độ công việc 3 bước'",
    'R12 header rename input lost controlled state');
  await evaluate("document.querySelector('.group-label-quick-editor button[type=submit]').click()");
  await eventually("document.querySelector('th[data-column-key=partyLevel] .column-heading-label')?.textContent.trim()==='Tiến độ công việc 3 bước'",
    'R12 shared CAS rename did not update live table title');
  const quickRename=await evaluate(`({
    heading:document.querySelector('th[data-column-key=partyLevel] .column-heading-label')?.textContent.trim(),
    modalOpen:!!document.querySelector('.group-label-quick-editor'),
    originalSourceField:!!document.querySelector('td[data-col-key=progressBuild]')
  })`);
  if(quickRename.modalOpen)throw Error('R12 save did not close rename popup');
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?guest=1'});
  await eventually("!!document.querySelector('.guest-compact-menu-bar')",
    'R12 guest layout failed to load');
  if(await evaluate("!!document.querySelector('.group-label-shortcut')"))
    throw Error('R12 guest received admin-only group-title edit control');
  console.log('R12_MAIN_LIST_GROUP_RENAME_SHORTCUT_PASS',JSON.stringify(quickRename));

  // Real administrator UI: type, cancel, save with the existing layout
  // persistence callback, remount from the saved synthetic snapshot and reset.
  await evaluate("localStorage.removeItem('hdnd.qa.group-labels-synthetic')");
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?layout-admin=1'});
  await eventually("document.querySelector('.group-label-editor summary')!==null",
    'Lượt 018 admin group-name panel missing');
  await evaluate("document.querySelector('.group-label-editor').open=true");
  const adminNameFocus=await evaluate(`(()=>{
    const el=document.querySelector('input[aria-label="Tên nhóm gộp partyTogether"]');
    if(!el)return false;el.focus();return document.activeElement===el;
  })()`);
  if(!adminNameFocus)throw Error('Lượt 018 admin title input not editable');
  await send('Input.insertText',{text:'Tên khâu do quản trị đặt'});
  await eventually("document.querySelector('input[aria-label=\"Tên nhóm gộp partyTogether\"]')?.value==='Tên khâu do quản trị đặt'",
    'Lượt 018 group-title input lost draft');
  await evaluate("document.querySelectorAll('.group-label-editor-row')[1]?.querySelector('button')?.click()");
  await eventually("document.querySelectorAll('.group-label-editor input')[1]?.value===''",
    'Lượt 018 Cancel did not restore last saved group name');
  const cancelled=await evaluate(`document.querySelector('input[aria-label="Tên nhóm gộp partyTogether"]')?.value`);
  if(cancelled!=='')throw Error('Lượt 018 Hủy did not restore saved blank name '+cancelled);
  await evaluate("document.querySelectorAll('.group-label-editor input')[1]?.focus()");
  await send('Input.insertText',{text:'Tên ba khâu sau lưu'});
  await eventually("document.querySelector('.column-save-button:not(:disabled)')!==null",
    'Lượt 018 shared Save not enabled after title edit');
  await evaluate("document.querySelector('.column-save-button').click()");
  await eventually("!!JSON.parse(localStorage.getItem('hdnd.qa.group-labels-synthetic')||'{}').groupLabels?.partyTogether",
    'Lượt 018 synthetic CAS save did not persist group title');
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?use-saved-layout=1'});
  await eventually("[...document.querySelectorAll('.item-heading-row th')].some(c=>c.textContent.includes('Tên ba khâu sau lưu'))",
    'Lượt 018 shared group-title reload not shown');
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?use-saved-layout=1&popup=1'});
  await eventually("[...document.querySelectorAll('.report-grid-heading-row th')].some(c=>c.textContent.includes('Tên ba khâu sau lưu'))",
    'Lượt 018 popup did not inherit saved shared group title');
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?layout-admin=1'});
  await eventually("document.querySelector('.group-label-editor summary')!==null",
    'Lượt 018 admin group-title reload missing');
  await evaluate("document.querySelector('.group-label-editor').open=true");
  await evaluate(`(()=>{
    const row=document.querySelector('input[aria-label="Tên nhóm gộp partyTogether"]').closest('.group-label-editor-row');
    [...row.querySelectorAll('button')].find(b=>b.textContent.includes('Khôi phục tên mặc định')).click();
  })()`);
  await eventually("document.querySelector('.column-save-button:not(:disabled)')!==null",
    'Lượt 018 default-title reset not detected as change');
  await evaluate("document.querySelector('.column-save-button').click()");
  await eventually("JSON.parse(localStorage.getItem('hdnd.qa.group-labels-synthetic')||'{}').groupLabels?.partyTogether===undefined",
    'Lượt 018 reset did not remove only the group override');
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa/compact-qa.html?use-saved-layout=1'});
  await eventually("[...document.querySelectorAll('.item-heading-row th')].some(c=>c.textContent.includes('Tiến độ 3 khâu'))",
    'Lượt 018 default title failed after reset/reload');
  await evaluate("localStorage.removeItem('hdnd.qa.group-labels-synthetic')");
  console.log('L018_GROUP_TITLE_ADMIN_SAVE_CANCEL_RELOAD_RESET_PASS');


  // Codex Lượt 020 R06/P1: this fixture MUST carry the actual App.tsx
  // wide-table-page + list-fit-page shell, not just a standalone ItemList.
  // Verify document scrolling to an actual data row and internal table scroll,
  // not merely grid stacking or horizontal body overflow.
  const r06Screens=[];
  for(const {width,height,mode} of [
    {width:390,height:844,mode:'mobile'},
    {width:768,height:750,mode:'tablet'},
    {width:1280,height:800,mode:'laptop'},
    {width:1280,height:600,mode:'short-desktop'}
  ]){
    await send('Emulation.setDeviceMetricsOverride',
      {width,height,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:'+port+
      '/compact-qa/compact-qa.html?app-shell=1&r05=1'});
    await eventually("document.querySelector('.app-shell.wide-table-page.list-fit-page .item-data-table tbody tr')!==null",
      'R06 real App shell fixture missing '+mode);
    const before=await evaluate(`(()=>{
      const root=document.querySelector('.app-shell'),grid=document.querySelector('.item-summary-grid');
      const table=document.querySelector('.item-table-scroll'),body=document.scrollingElement;
      const row=document.querySelector('.item-data-table tbody tr:first-child');
      const card=grid.getBoundingClientRect(),tb=table.getBoundingClientRect();
      return {shell:root.className,viewport:innerHeight,bodyHeight:body.scrollHeight,
        bodyClient:body.clientHeight,bodyOverflow:getComputedStyle(root).overflowY,
        cardsHeight:card.height,cardsBottom:card.bottom,tableTop:tb.top,tableHeight:tb.height,
        scrollMode:getComputedStyle(table).overflowY,
        firstRow:row.getBoundingClientRect().top,bodyWidth:body.scrollWidth,screenWidth:innerWidth};
    })()`);
    // R06 follow-up: CSS for wide-table-page is more specific than the old
    // list-fit rule; assert the 48dvh cap is really applied on each breakpoint.
    const intendedHeight=Math.min(520,Math.max(260,height*0.48));
    if(Math.abs(before.tableHeight-intendedHeight)>5)
      throw Error('R06 responsive table-height override lost CSS specificity at '+
        mode+': '+JSON.stringify({actual:before.tableHeight,intendedHeight}));
    if(!before.shell.includes('wide-table-page')||!before.shell.includes('list-fit-page')||
      before.tableHeight<260||before.bodyHeight<=height+20||
      before.bodyWidth>width+5||before.scrollMode!=='auto')
      throw Error('R06 P1: real list-fit App still clips table at '+mode+': '+JSON.stringify(before));
    if(mode==='mobile'){
      const shot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync('hophdnd-r06-mobile-app-shell-top.png',Buffer.from(shot.data,'base64'));
    }
    const scrolled=await evaluate(`(()=>{
      const table=document.querySelector('.item-table-scroll');
      // This is an actual user-reachable document scroll, not a DOM transform.
      table.scrollIntoView({block:'start'});
      const row=document.querySelector('.item-data-table tbody tr:first-child');
      const filter=document.querySelector('.list-filter-toolbar');
      const tableRect=table.getBoundingClientRect();
      const rowRect=row.getBoundingClientRect();
      const filterRect=filter.getBoundingClientRect();
      return {documentY:document.scrollingElement.scrollTop,tableTop:tableRect.top,
        tableBottom:tableRect.bottom,rowTop:rowRect.top,rowBottom:rowRect.bottom,
        filterTop:filterRect.top,filterBottom:filterRect.bottom,
        rowVisible:rowRect.bottom>Math.max(0,tableRect.top)&&
          rowRect.top<Math.min(innerHeight,tableRect.bottom),
        tableHeight:tableRect.height};
    })()`);
    if(scrolled.documentY<50||!scrolled.rowVisible||
      scrolled.tableTop>=height||scrolled.tableBottom<=0)
      throw Error('R06 P1: cannot scroll to live table row '+mode+': '+JSON.stringify({before,scrolled}));
    const internal=await evaluate(`(()=>{
      const table=document.querySelector('.item-table-scroll');
      const start=table.scrollTop;table.scrollTop+=180;
      const heading=document.querySelector('.item-data-table .item-heading-row');
      const filter=document.querySelector('.list-filter-toolbar');
      const viewport=table.getBoundingClientRect();
      return {start,end:table.scrollTop,scrollHeight:table.scrollHeight,
        clientHeight:table.clientHeight,headingTop:heading.getBoundingClientRect().top,
        filterTop:filter.getBoundingClientRect().top,viewportTop:viewport.top,
        filterBottom:filter.getBoundingClientRect().bottom};
    })()`);
    if(internal.end<=internal.start||internal.scrollHeight<=internal.clientHeight||
      !Number.isFinite(internal.headingTop)||!Number.isFinite(internal.filterTop))
      throw Error('R06 P1: sticky filter/internal table scroll regression '+mode+': '+JSON.stringify(internal));
    if(mode==='mobile'){
      const shot=await send('Page.captureScreenshot',{format:'png'});
      writeFileSync('hophdnd-r06-mobile-app-shell-table-reachable.png',Buffer.from(shot.data,'base64'));
    }
    r06Screens.push({mode,before,scrolled,internal});
  }
  // Desktop with sufficient space retains the original one-screen flex layout.
  await send('Emulation.setDeviceMetricsOverride',
    {width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+
    '/compact-qa/compact-qa.html?app-shell=1'});
  await eventually("document.querySelector('.app-shell.list-fit-page .item-data-table tbody tr')!==null",
    'R06 desktop App fixture missing');
  const r06Desktop=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),body=document.scrollingElement;
    const table=document.querySelector('.item-table-scroll').getBoundingClientRect();
    return {shell:getComputedStyle(shell).overflowY,body:body.scrollHeight,
      client:body.clientHeight,tableHeight:table.height,viewport:innerHeight};
  })()`);
  if(r06Desktop.body>r06Desktop.client+3||r06Desktop.tableHeight<250||
    r06Desktop.shell!=='hidden')
    throw Error('R06 desktop list-fit changed while enough room: '+JSON.stringify(r06Desktop));
  console.log('R06_APP_SHELL_MOBILE_TABLE_REACHABLE_PASS',JSON.stringify({r06Screens,r06Desktop}));

  // Codex Lượt 020 R07/P2: use real popup configuration input (not an
  // injected localStorage value).  Verify immediately after save, reopening
  // settings, closing/reopening modal via remount, and full reload.
  await evaluate(`Object.keys(localStorage).filter(k=>k.startsWith('hdnd.report-detail-grid.v1:')&&
    k.includes('compact-qa-synthetic-popup-only')).forEach(k=>localStorage.removeItem(k))`);
  const r07Url='http://127.0.0.1:'+port+
    '/compact-qa/compact-qa.html?group-title=1&popup=1&popup-settings=1';
  await send('Page.navigate',{url:r07Url});
  await eventually("document.querySelector('.report-grid-actions button[aria-expanded=false]')!==null",
    'R07 popup configuration controls missing');
  const popupTitle=()=>evaluate(`document.querySelector('.report-grid-heading-row th[data-column-key="progressParty"]')?.textContent.trim()`);
  const openR07=async()=>{
    await evaluate(`[...document.querySelectorAll('.report-grid-actions button')]
      .find(b=>b.textContent.includes('Cấu hình popup / cột'))?.click()`);
    await eventually("document.querySelector('.report-grid-group-labels summary')!==null",
      'R07 config panel did not open');
    await evaluate("document.querySelector('.report-grid-group-labels').open=true");
  };
  const inputR07=()=>evaluate(`document.querySelector('input[aria-label="Tên nhóm popup partyTogether"]')?.value`);
  const replaceR07=async(textValue)=>{
    const focused=await evaluate(`(()=>{
      const el=document.querySelector('input[aria-label="Tên nhóm popup partyTogether"]');
      if(!el)return false;el.focus();el.select();return document.activeElement===el;
    })()`);
    if(!focused)throw Error('R07 group-name input not focusable');
    if(textValue)await send('Input.insertText',{text:textValue});
    else{
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Backspace',code:'Backspace',windowsVirtualKeyCode:8});
    }
    await eventually("document.querySelector('input[aria-label=\"Tên nhóm popup partyTogether\"]')?.value==="+JSON.stringify(textValue),
      'R07 typed value was not reflected in controlled input');
  };
  const saveR07=async()=>{
    await evaluate(`[...document.querySelectorAll('.report-grid-settings-footer button')]
      .find(b=>b.textContent.includes('Lưu cấu hình cột'))?.click()`);
    await eventually("document.querySelector('.report-grid-settings')===null",
      'R07 popup settings failed to close after Save');
  };
  if((await popupTitle())!=='Ba khâu tùy chỉnh')
    throw Error('R07 shared title baseline missing: '+await popupTitle());
  await openR07();
  await replaceR07('Tên popup riêng');
  await saveR07();
  await eventually("document.querySelector('.report-grid-heading-row th[data-column-key=progressParty]')?.textContent.trim()==='Tên popup riêng'",
    'R07 popup override title not immediately rendered');
  await openR07();
  await replaceR07('   ');
  await saveR07();
  await eventually("document.querySelector('.report-grid-heading-row th[data-column-key=progressParty]')?.textContent.trim()==='Ba khâu tùy chỉnh'",
    'R07 whitespace-only title did not immediately inherit shared name');
  const r07Whitespace=await evaluate(`(()=>{
    const key=Object.keys(localStorage).find(k=>k.startsWith('hdnd.report-detail-grid.v1:')&&
      k.includes('compact-qa-synthetic-popup-only'));
    const stored=key?JSON.parse(localStorage.getItem(key)):null;
    return {title:document.querySelector('.report-grid-heading-row th[data-column-key=progressParty]')?.textContent.trim(),
      hasOverride:Object.prototype.hasOwnProperty.call(stored?.groupLabels??{},'partyTogether'),
      storedName:stored?.groupLabels?.partyTogether};
  })()`);
  if(r07Whitespace.hasOverride||r07Whitespace.title!=='Ba khâu tùy chỉnh')
    throw Error('R07 applied/persisted mismatch after whitespace Save: '+JSON.stringify(r07Whitespace));
  const r07Shot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-r07-popup-empty-save-fallback.png',Buffer.from(r07Shot.data,'base64'));
  await openR07();
  if((await inputR07())!=='')
    throw Error('R07 reopen settings did not use normalized state after whitespace save');
  await replaceR07('Tên riêng lần 2');
  await saveR07();
  await openR07();
  // "Khôi phục" removes only the popup override, no shared field mutation.
  await evaluate(`(()=>{
    const el=document.querySelector('input[aria-label="Tên nhóm popup partyTogether"]');
    el.closest('.group-label-editor-row').querySelector('button').click();
  })()`);
  await eventually("document.querySelector('input[aria-label=\"Tên nhóm popup partyTogether\"]')?.value===''",
    'R07 reset did not clear popup-only title draft');
  await saveR07();
  await eventually("document.querySelector('.report-grid-heading-row th[data-column-key=progressParty]')?.textContent.trim()==='Ba khâu tùy chỉnh'",
    'R07 restored title not visible after reset/save');
  await openR07();
  await replaceR07('Tên tạm để xóa');
  await replaceR07('');
  await saveR07();
  await eventually("document.querySelector('.report-grid-heading-row th[data-column-key=progressParty]')?.textContent.trim()==='Ba khâu tùy chỉnh'",
    'R07 empty-string title persisted in applied state');
  await send('Page.navigate',{url:r07Url});
  await eventually("document.querySelector('.report-grid-heading-row th[data-column-key=progressParty]')?.textContent.trim()==='Ba khâu tùy chỉnh'",
    'R07 empty title did not survive popup remount/reload');
  await openR07();
  if((await inputR07())!=='')throw Error('R07 saved empty override returned in reloaded settings');
  console.log('R07_POPUP_EMPTY_WHITESPACE_RESET_REOPEN_RELOAD_PASS',JSON.stringify(r07Whitespace));
  
  // L2 incremental REAL-Chromium two-tab witness. These are two separate
  // browser targets (not two Firebase SDK contexts). They validate the
  // current active-generation List/Report after an owner-seeded pointer swap.
  // This is READ-ONLY guest coverage; same-admin edit/lease/CAS + lost-ACK
  // remain explicit L1 harness requests, never claim them from this fixture.
  const twoTabConnections=[];
  const debuggerPort=new URL(tab.webSocketDebuggerUrl).port;
  async function makeUiTab(name,{waitForList=true}={}){
    const response=await fetch('http://127.0.0.1:'+debuggerPort+'/json/new?about:blank',
      {method:'PUT',signal:AbortSignal.timeout(5000)});
    if(!response.ok)throw Error('Could not create genuine Chrome tab '+name+': '+response.status);
    const target=await response.json();
    if(!target.id||!target.webSocketDebuggerUrl)throw Error('Tab '+name+' has no CDP target');
    const socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((done,fail)=>{
      socket.addEventListener('open',done,{once:true});
      socket.addEventListener('error',fail,{once:true});
    });
    const pendingTab=new Map();let tabSeq=0;
    socket.addEventListener('message',event=>{
      const data=JSON.parse(event.data),entry=pendingTab.get(data.id);
      if(!entry)return;
      pendingTab.delete(data.id);
      data.error?entry.reject(Error(JSON.stringify(data.error))):entry.resolve(data.result);
    });
    const call=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++tabSeq;pendingTab.set(id,{resolve,reject});
      socket.send(JSON.stringify({id,method,params}));
      setTimeout(()=>{if(pendingTab.has(id)){pendingTab.delete(id);
        reject(Error('Chrome tab '+name+' CDP timed out: '+method));}},16000);
    });
    const js=async expression=>{
      const result=await call('Runtime.evaluate',{
        expression,returnByValue:true,awaitPromise:true
      });
      if(result.exceptionDetails)throw Error('Chrome tab '+name+' JS error');
      return result.result?.value;
    };
    const until=async(expression,meaning)=>{
      for(let i=0;i<100;i++){
        if(await js(expression))return;
        await sleep(150);
      }
      throw Error('Two-tab '+name+' failed '+meaning);
    };
    twoTabConnections.push(socket);
    await call('Page.enable');
    await call('Runtime.enable');
    await call('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});
    await until("document.querySelector('.nav-tabs')!==null",'App shell');
    if(waitForList){
      await js("(()=>{const x=[...document.querySelectorAll('.nav-tabs button')].find(b=>b.textContent?.includes('Danh sách các ND trình HĐND'));x?.click();return !!x;})()");
      await until("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",
        'current-generation NQ01');
    }
    return {id:target.id,name,js,until,call,socket};
  }
  try{
    const first=await makeUiTab('A'),second=await makeUiTab('B');
    if(first.id===second.id)throw Error('Two-tab CDP returned the same target');
    const newOp='pr95_browser_two_tab_epoch_20261030';
    const newGen='gen_'+newOp;
    const changed=firebaseRows.map((row,index)=>index===0
      ?{...row,displayCode:'BC77',documentKind:'BC',
        content:'Nội dung generation mới xác nhận ở hai tab',department:'Sở V2 thử nghiệm'}
      :row);
    const newer=Object.fromEntries(changed.map(row=>[row.recordId,row]));
    const ownerHeaders={Authorization:'Bearer owner','Content-Type':'application/json'};
    const putFixture=async(path,value)=>{
      const result=await fetch(EMULATOR_DB+path+'.json?ns='+EMULATOR_NAMESPACE,{
        method:'PUT',headers:ownerHeaders,body:JSON.stringify(value),
        signal:AbortSignal.timeout(8000)
      });
      if(!result.ok)throw Error('Cannot stage two-tab Emulator fixture '+path+': '+result.status);
    };
    // Stage the immutable generation before flipping the active pointer,
    // exactly as the source subscribers expect. A privileged fixture PUT is
    // NOT a CAS test and is never described as one.
    await putFixture('/hdnd/datasetV2/generations/'+newGen+'/items',newer);
    await putFixture('/hdnd/datasetV2/permissions/'+newGen,{columns:{}});
    await putFixture('/hdnd/datasetV2/active',{
      generationId:newGen,operationId:newOp,revision:2,
      rowCount:changed.length,digest:'b'.repeat(64)
    });
    await Promise.all([first,second].map(async side=>{
      await side.until("document.querySelector('.item-data-table tbody')?.textContent?.includes('BC77')===true",
        'new active-generation record BC77');
      const view=await side.js(`(()=>{
        const rows=[...document.querySelectorAll('.item-data-table tbody tr')];
        return {rows:rows.length,newItem:rows.some(r=>r.textContent?.includes('BC77')&&
          r.textContent?.includes('Nội dung generation mới xác nhận ở hai tab')),
          oldItem:rows.some(r=>r.textContent?.includes('NQ01'))};
      })()`);
      if(view.rows!==54||!view.newItem||view.oldItem)
        throw Error('Two-tab '+side.name+' stale List: '+JSON.stringify(view));
      await side.js("document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')[0]?.click()");
      await side.until("document.querySelector('.report-table tbody')?.textContent?.includes('Sở V2 thử nghiệm')===true",
        'Report from new active generation');
    }));
    console.log('BROWSER_TWO_REAL_TABS_READ_SWITCH_PASS',JSON.stringify({
      distinctChromeTargets:true,firstTab:first.id,secondTab:second.id,
      previousGeneration:SMOKE_GENERATION,nextGeneration:newGen,
      currentRowsPerTab:54,reportedDepartment:'Sở V2 thử nghiệm',
      scope:'guest List/Report epoch switch only, NOT admin write/lease/lost ACK'
    }));
  }finally{
    for(const socket of twoTabConnections)socket.close();
  }

  // L2 Excel-only UI journey, ONE real Chrome tab authenticated through the
  // Auth Emulator Google-provider SDK bridge. Other lanes own two-tab CAS
  // and application/network ACK-loss investigations.
  const adminE2eDir=mkdtempSync(join(tmpdir(),'pr95-admin-ui-e2e-'));
  const adminTargets=[];
  try{
    const adminOwnerHeaders={Authorization:'Bearer owner','Content-Type':'application/json'};
    const rootSeed={hdnd:{
      items:Object.fromEntries(firebaseRows.slice(0,2).map(item=>[item.recordId,item])),
      permissions:{columns:{}},
      control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
      freezeControl:{mode:'FROZEN',revision:1,epoch:1,actor:'pr95-seed',
        changedAt:Date.now()-10000,deadline:0,closedAt:Date.now()-9000}
    }};
    const rootPut=await fetch(EMULATOR_ROOT,{
      method:'PUT',headers:adminOwnerHeaders,body:JSON.stringify(rootSeed),
      signal:AbortSignal.timeout(10000)
    });
    if(!rootPut.ok)throw Error('Cannot seed FROZEN legacy root in test Emulator: '+rootPut.status);
    const adminA=await makeUiTab('Excel admin',{waitForList:false});
    adminTargets.push(adminA);
    const adminIdentity=[];
    for(const side of adminTargets){
      await side.until("typeof window.__pr95EmulatorGoogleAdminSignIn==='function'",
        'Emulator Google-admin SDK hook');
      const credentials=await side.js("window.__pr95EmulatorGoogleAdminSignIn()");
      if(!credentials?.uid||credentials.email!=='cavoixanh638@gmail.com'||
        !credentials.emailVerified||!credentials.providerIds?.includes('google.com'))
        throw Error('Wrong Google Emulator SDK identity in '+side.name+': '+JSON.stringify(credentials));
      adminIdentity.push({tabId:side.id,...credentials});
      await side.until("document.querySelector('.options-menu summary[aria-label=\"Cài đặt\"]')!==null",
        'authenticated admin settings');
    }
    console.log('BROWSER_EXCEL_ADMIN_AUTH_PASS',JSON.stringify({
      targetId:adminA.id,identity:adminIdentity[0],
      source:'real Auth Emulator SDK signInWithCredential',
      notProductionGoogleLogin:true
    }));
    const headers=[
      'Mã nội dung','STT','Nội dung trình','Sở, ngành','Loại VB',
      'Cấp cho ý kiến Thành ủy','Tiến độ xin ý kiến Thành ủy',
      'Trình HĐND xây dựng NQ','Trình HĐND ban hành NQ',
      'Chuyên viên','Phòng','Lãnh đạo VP','Lãnh đạo UBND',
      'Tiến độ hiện tại','Ghi chú'
    ];
    const makeXlsx=(name,variant)=>{
      const workbook=XLSX.utils.book_new();
      const sheet=XLSX.utils.aoa_to_sheet([headers,
        ['NQ90',1,'PR95 '+variant+' nghị quyết','Sở QA '+variant,'QPPL',
          '','','','','Chuyên viên QA','Phòng QA','','','Sở đang thực hiện','Ghi chú '+variant],
        ['BC91',2,'PR95 '+variant+' báo cáo','Sở QA '+variant,'BC',
          '','','','','Chuyên viên QA','Phòng QA','','','Sở đang thực hiện','Ghi chú '+variant]]);
      XLSX.utils.book_append_sheet(workbook,sheet,'DATA_AO');
      const file=join(adminE2eDir,name);
      writeFileSync(file,XLSX.write(workbook,{type:'buffer',bookType:'xlsx'}));
      return file;
    };
    const initialXlsx=makeXlsx('pr95-initial.xlsx','INITIAL');
    const replaceXlsx=makeXlsx('pr95-replacement.xlsx','REPLACE');
    const clickText=async(side,selector,fragment)=>{
      const clicked=await side.js(`(()=>{
        const el=[...document.querySelectorAll(${JSON.stringify(selector)})]
          .find(x=>x.textContent?.includes(${JSON.stringify(fragment)}));
        if(!el||el.disabled)return false;el.click();return true;
      })()`);
      if(!clicked){
        const snapshot=await side.js(`(()=>{
          const el=[...document.querySelectorAll(${JSON.stringify(selector)})]
            .find(x=>x.textContent?.includes(${JSON.stringify(fragment)}));
          const panel=document.querySelector('section[aria-label="Thử nghiệm thế hệ Firebase"]');
          return {found:!!el,disabled:el?.disabled??null,
            panelText:panel?.innerText?.slice(0,1000)??null,
            notices:[...document.querySelectorAll('[role="alert"],[role="status"]')]
              .map(x=>x.innerText?.slice(0,160)).slice(-12)};
        })()`);
        console.error('PR95_ADMIN_UI_BLOCKER_DIAGNOSTIC',JSON.stringify({
          tab:side.name,action:fragment,selector,...snapshot
        }));
        // Best effort only; a failing CDP screenshot must never obscure the
        // original disabled button/state cause (the prior CI timed out here).
        try{
          const shot=await Promise.race([
            side.call('Page.captureScreenshot',{format:'png'}),
            sleep(2500).then(()=>null)
          ]);
          if(shot?.data)writeFileSync('hophdnd-pr95-admin-ui-blocker.png',
            Buffer.from(shot.data,'base64'));
        }catch(e){
          console.warn('PR95_ADMIN_UI_SCREENSHOT_NONFATAL',String(e));
        }
        throw Error(side.name+' cannot click '+fragment+' within '+selector+
          ' diagnostic='+JSON.stringify(snapshot));
      }
    };
    const enter=async(side,selector,value)=>{
      const focus=await side.js(`(()=>{
        const el=document.querySelector(${JSON.stringify(selector)});
        if(!el||el.disabled)return false;el.focus();el.select?.();return document.activeElement===el;
      })()`);
      if(!focus)throw Error(side.name+' cannot focus '+selector);
      await side.call('Input.insertText',{text:value});
      await side.until(`document.querySelector(${JSON.stringify(selector)})?.value===${JSON.stringify(value)}`,
        'controlled input value '+selector);
    };
    const upload=async(side,filename)=>{
      const {root}=await side.call('DOM.getDocument',{depth:1});
      const {nodeId}=await side.call('DOM.querySelector',{
        nodeId:root.nodeId,selector:'.business-excel-review input[type=file]'
      });
      if(!nodeId)throw Error(side.name+' no real business Excel file input');
      await side.call('DOM.setFileInputFiles',{nodeId,files:[filename]});
      await side.until("document.querySelector('.business-excel-review [role=status]')?.textContent?.includes('Đã chọn:')===true",
        'A-O file selected');
      await side.js(`(()=>{
        const el=document.querySelector('.business-excel-review select');
        if(!el)return false;const setter=Object.getOwnPropertyDescriptor(
          HTMLSelectElement.prototype,'value').set;
        setter.call(el,'DATA_AO');el.dispatchEvent(new Event('change',{bubbles:true}));return true;
      })()`);
      await side.until("document.querySelector('.business-excel-review select')?.value==='DATA_AO'",
        'explicit workbook sheet selection');
      await clickText(side,'.business-excel-review button','Kiểm tra toàn bộ file');
      await side.until("document.querySelector('section[aria-label=\"Bản xem trước chưa áp dụng\"]')!==null",
        'real file parsed/previewed');
    };
    const openTransfer=async side=>{
      await clickText(side,'.options-menu summary','⚙');
      await clickText(side,'.options-popover button','Tài khoản và dữ liệu');
      await side.until("document.querySelector('.settings-hub-tabs')!==null",'admin settings tabs');
      await clickText(side,'.settings-hub-tabs button','Excel · Nhập/Xuất');
      await side.until("document.querySelector('.business-excel-review')!==null",
        'business Excel importer visible');
    };
    const ownerValue=async path=>{
      const response=await fetch(EMULATOR_DB+path+'.json?ns='+EMULATOR_NAMESPACE,{
        headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(8000)});
      if(!response.ok)throw Error('Cannot verify real Emulator server '+path+' HTTP '+response.status);
      return response.json();
    };
    const operationCounts=async()=>{
      const v2=await ownerValue('/hdnd/datasetV2');
      return {active:v2?.active??null,
        operations:Object.keys(v2?.operations??{}),
        generations:Object.keys(v2?.generations??{})};
    };
    const stagedId=async side=>{
      // The App does not permit staging while the Firebase profile, current
      // generation, in-flight workspace refresh or stale draft is unsettled.
      // Wait for those guards rather than clicking a transient disabled UI.
      const selector='section[aria-label="Thử nghiệm thế hệ Firebase"] button';
      for(let i=0;i<100;i++){
        if(await side.js(`[...document.querySelectorAll(${JSON.stringify(selector)})]
          .some(x=>x.textContent?.includes('Ghi staging, đọc lại')&&!x.disabled)`))break;
        await sleep(120);
      }
      await clickText(side,selector,'Ghi staging, đọc lại và sao lưu thử nghiệm');
      await side.until("document.querySelector('section[aria-label=\"Xem trước dữ liệu staging\"] code')?.textContent?.includes(' V2 ')===true || document.querySelector('section[aria-label=\"Xem trước dữ liệu staging\"] code')?.textContent?.startsWith('THAY ')===true",
        'readback staging and confirmation');
      const text=await side.js("document.querySelector('section[aria-label=\"Xem trước dữ liệu staging\"] code')?.textContent");
      const op=text?.split(' ')[text.startsWith('THAY ')?1:3];
      if(!/^excel_[A-Za-z0-9_]{12,80}$/.test(op))throw Error('Invalid UI staged operationId '+text);
      return {text,op};
    };
    const verifyCommit=async(op,before,label)=>{
      const after=await operationCounts();
      const expectedRevision=(before.active?.revision??0)+1;
      if(after.active?.operationId!==op||after.active.revision!==expectedRevision||
        after.operations.filter(x=>x===op).length!==1||
        after.operations.length!==before.operations.length+1||
        after.generations.length!==before.generations.length+1)
        throw Error(label+' did not commit exactly once on Emulator server: '+JSON.stringify({before,after}));
      return after;
    };
    const takeShot=async(label)=>{
      try{
        const shot=await Promise.race([
          adminA.call('Page.captureScreenshot',{format:'png'}),
          sleep(3000).then(()=>null)
        ]);
        if(shot?.data){
          const file='hophdnd-pr95-excel-'+label+'.png';
          const bytes=Buffer.from(shot.data,'base64');
          writeFileSync(file,bytes);
          // Existing L1-owned workflow already uploads these two standard
          // screenshot paths. Preserve the actual initial UNKNOWN screen as
          // the failure artifact without modifying the workflow/runner.
          if(label==='initial-blocked')writeFileSync('hophdnd-ui-smoke-failure.png',bytes);
          if(label==='restore')writeFileSync('hophdnd-ui-smoke-pass.png',bytes);
          console.log('BROWSER_EXCEL_SCREENSHOT_SAVED',file);
        }else console.warn('BROWSER_EXCEL_SCREENSHOT_SKIPPED',label,'CDP timeout');
      }catch(e){console.warn('BROWSER_EXCEL_SCREENSHOT_SKIPPED',label,String(e));}
    };
    const assertUiCommitted=async(label,operationId)=>{
      let last=null;
      for(let attempt=0;attempt<115;attempt++){
        last=await adminA.js(`(()=>{
          const panel=document.querySelector('section[aria-label="Thử nghiệm thế hệ Firebase"]');
          const statuses=[...document.querySelectorAll('p[aria-label^="Trạng thái thao tác"]')];
          return {status:statuses.map(x=>x.innerText),messages:[...panel?.querySelectorAll('p[role="status"],p[role="alert"]')??[]].map(x=>x.innerText),
            panel:panel?.innerText.slice(-1000)??null,
            ready:!!panel,buttons:[...panel?.querySelectorAll('button')??[]].map(x=>({text:x.textContent.trim(),disabled:x.disabled}))};
        })()`);
        if(last.status.some(x=>x.includes('ĐÃ COMMIT')))return last;
        // Other status values can be transient; allow the documented
        // application to resolve operationId and render the final result.
        await sleep(180);
      }
      const server=await operationCounts();
      throw Error('REAL_UI_'+label+'_STATUS_NOT_CONFIRMED '+JSON.stringify({
        operationId,ui:last,server
      }));
    };
    await openTransfer(adminA);
    await upload(adminA,initialXlsx);
    await adminA.until("document.querySelector('section[aria-label=\"Thử nghiệm thế hệ Firebase\"]')?.textContent?.includes('Kích hoạt V2 lần đầu')===true",
      'initial activation UI on FROZEN legacy');
    const initial=await stagedId(adminA);
    const initialCandidate=JSON.parse(await ownerValue('/hdnd/datasetV2/candidates/'+initial.op));
    const initialRows=Object.values(initialCandidate.items??{});
    if(initialRows.length!==2||
      initialRows.some(row=>Object.hasOwn(row,'partyMeeting')||Object.hasOwn(row,'examined'))||
      !initialRows.some(row=>row.content==='PR95 INITIAL nghị quyết'))
      throw Error('V2 staging still contains legacy P/Q or did not preserve parsed A–O Excel content.');
    console.log('BROWSER_EXCEL_AO_V2_PAYLOAD_CANONICAL_PASS',JSON.stringify({
      operationId:initial.op,serverRows:initialRows.length,
      keys:Object.keys(initialRows[0]),nonemptyLegacyDropped:false
    }));
    const initialBefore=await operationCounts();
    await enter(adminA,'input[aria-label="Xác nhận kích hoạt V2 lần đầu"]',initial.text);
    await clickText(adminA,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
      'Kích hoạt V2 lần đầu bằng CAS');
    const checkLiveListReport=async(stage,expectedContent,expectedDepartment)=>{
      // The application intentionally disables the main navigation while
      // inside Excel settings. Use the visible "Về chế độ xem" UI action,
      // rather than bypassing React's disabled tab buttons.
      if(await adminA.js("document.querySelector('.nav-tabs button')?.disabled===true")){
        await clickText(adminA,'.card-header button','Về chế độ xem');
        await adminA.until("document.querySelector('.nav-tabs button')?.disabled===false",
          stage+' leave Excel settings through real UI');
      }
      await clickText(adminA,'.nav-tabs button','Danh sách các ND trình HĐND');
      await adminA.until(`document.querySelector('.item-data-table tbody')?.textContent?.includes(${JSON.stringify(expectedContent)})===true`,
        stage+' current List records');
      const list=await adminA.js(`(()=>{
        const rows=[...document.querySelectorAll('.item-data-table tbody tr')];
        return {count:rows.length,codes:rows.map(row=>row.textContent?.slice(0,150)),
          content:document.querySelector('.item-data-table tbody')?.textContent??''};
      })()`);
      if(list.count!==2||!list.content.includes(expectedContent)||
        !list.content.includes('NQ90')||!list.content.includes('BC91'))
        throw Error('LIVE_LIST_'+stage+'_MISMATCH '+JSON.stringify(list));
      await takeShot(stage.toLowerCase()+'-list');
      await clickText(adminA,'.nav-tabs button','Báo cáo tổng hợp');
      await adminA.until(`[...document.querySelectorAll('.report-table tbody')].some(x=>x.textContent?.includes(${JSON.stringify(expectedDepartment)}))`,
        stage+' current Report totals');
      const report=await adminA.js(`(()=>{
        const tables=[...document.querySelectorAll('.report-table')];
        return {tables:tables.length,rows:tables.map(t=>t.querySelectorAll('tbody tr').length),
          groups:tables.map(t=>t.querySelector('tbody')?.textContent?.slice(0,230))};
      })()`);
      if(report.tables<1||!report.groups.some(x=>x?.includes(expectedDepartment))||
        !report.groups.some(x=>x?.includes('2')))
        throw Error('LIVE_REPORT_'+stage+'_MISMATCH '+JSON.stringify(report));
      await takeShot(stage.toLowerCase()+'-report');
      console.log('BROWSER_EXCEL_'+stage+'_LIVE_LIST_REPORT_PASS',JSON.stringify({
        listRows:list.count,reportTables:report.tables,reportGroup:expectedDepartment,
        expectedContent,source:'live Chrome App reading active RTDB generation'
      }));
    };
    let initialBlocked=null;
    let initialAfter=null;
    try{
      await assertUiCommitted('INITIAL',initial.op);
      initialAfter=await verifyCommit(initial.op,initialBefore,'initial CAS');
      const initialV2=await ownerValue('/hdnd/datasetV2/generations/'+initialAfter.active.generationId+'/items');
      if(Object.keys(initialV2??{}).length!==2||
        !Object.values(initialV2).some(x=>x.content==='PR95 INITIAL nghị quyết'))
        throw Error('Initial generation not stored as parsed Excel business rows');
      console.log('BROWSER_EXCEL_INITIAL_UI_CAS_PASS',JSON.stringify({
        operationId:initial.op,revision:initialAfter.active.revision,
        serverRows:Object.keys(initialV2).length,backupVerified:true
      }));
      await takeShot('initial');
    }catch(error){
      const server=await operationCounts();
      console.error('BROWSER_EXCEL_INITIAL_UI_BLOCKED',JSON.stringify({
        operationId:initial.op,cause:String(error),server,
        noAutomaticRetry:true,noPrivilegedCasFallback:true
      }));
      await takeShot('initial-blocked');
      throw error; // Real UI CAS only: never substitute a privileged fixture.
    }
    await checkLiveListReport('INITIAL',
      'PR95 INITIAL nghị quyết','Sở QA INITIAL');
    await openTransfer(adminA);
    await adminA.until("document.querySelector('section[aria-label=\"Thử nghiệm thế hệ Firebase\"]')?.textContent?.includes('Thay dữ liệu theo thế hệ')===true",
      'active V2 switched in UI');
    await upload(adminA,replaceXlsx);
    const replacement=await stagedId(adminA);
    const replacementBefore=await operationCounts();
    await enter(adminA,'input[aria-label="Xác nhận thay thế toàn bộ"]',replacement.text);
    await clickText(adminA,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
      'Chuyển thế hệ bằng CAS');
    let replacementBlocked=null;
    try{
      await assertUiCommitted('REPLACE',replacement.op);
      const replacementAfter=await verifyCommit(replacement.op,replacementBefore,'replacement CAS');
      const replacementV2=await ownerValue('/hdnd/datasetV2/generations/'+replacementAfter.active.generationId+'/items');
      if(Object.keys(replacementV2??{}).length!==2||
        !Object.values(replacementV2).some(x=>x.content==='PR95 REPLACE nghị quyết'))
        throw Error('Replacement generation did not contain new Excel rows');
      console.log('BROWSER_EXCEL_REPLACEMENT_UI_CAS_PASS',JSON.stringify({
        operationId:replacement.op,revision:replacementAfter.active.revision,
        serverRows:Object.keys(replacementV2).length,backupVerified:true
      }));
      await takeShot('replacement');
    }catch(error){
      const server=await operationCounts();
      console.error('BROWSER_EXCEL_REPLACEMENT_UI_BLOCKED',JSON.stringify({
        operationId:replacement.op,cause:String(error),server,
        noAutomaticRetry:true,noPrivilegedCasFallback:true
      }));
      await takeShot('replacement-blocked');
      throw error; // A replace failure must not create a synthetic generation.
    }
    await checkLiveListReport('REPLACEMENT',
      'PR95 REPLACE nghị quyết','Sở QA REPLACE');
    await openTransfer(adminA);
    await enter(adminA,'input#v2-operation-lookup',replacement.op);
    await clickText(adminA,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
      'Tra cứu trạng thái operationId');
    const restoreOp='restore_pr95_excel_ui_20261030';
    await adminA.until("document.querySelector('input[aria-label=\"Mã khôi phục mới\"]')!==null",
      'restore UI from saved replacement backup');
    await enter(adminA,'input[aria-label="Mã khôi phục mới"]',restoreOp);
    await enter(adminA,'input[aria-label="Xác nhận khôi phục"]','KHOI PHUC '+restoreOp);
    const restoreBefore=await operationCounts();
    await clickText(adminA,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
      'Khôi phục bằng CAS');
    let restoreBlocked=null;
    try{
      await assertUiCommitted('RESTORE',restoreOp);
      const restoreAfter=await verifyCommit(restoreOp,restoreBefore,'restore CAS');
      const restoredV2=await ownerValue('/hdnd/datasetV2/generations/'+restoreAfter.active.generationId+'/items');
      if(Object.keys(restoredV2??{}).length!==2||
        !Object.values(restoredV2).some(x=>x.content==='PR95 INITIAL nghị quyết'))
        throw Error('Restored generation did not reproduce original Excel content');
      console.log('BROWSER_EXCEL_RESTORE_UI_CAS_PASS',JSON.stringify({
        operationId:restoreOp,revision:restoreAfter.active.revision,
        serverRows:Object.keys(restoredV2).length,restoredFrom:replacement.op
      }));
      await takeShot('restore');
      await checkLiveListReport('RESTORE','PR95 INITIAL nghị quyết','Sở QA INITIAL');
    }catch(error){
      const server=await operationCounts();
      restoreBlocked=String(error);
      console.error('BROWSER_EXCEL_RESTORE_UI_BLOCKED',JSON.stringify({
        operationId:restoreOp,reason:restoreBlocked,active:server.active,
        noAutomaticRetry:true
      }));
      await takeShot('restore-blocked');
    }
    if(initialBlocked||replacementBlocked||restoreBlocked)
      throw Error('PR95_REAL_EXCEL_UI_JOURNEY_INCOMPLETE '+JSON.stringify({
        initial:initialBlocked?'BLOCKED':'PASS',
        replacement:replacementBlocked?'BLOCKED':'PASS',
        restore:restoreBlocked?'BLOCKED':'PASS',
        fixtures:'disposable demo Emulator only; no skipped CAS marked PASS'
      }));
  }finally{
    for(const t of adminTargets)t.socket.close();
    rmSync(adminE2eDir,{recursive:true,force:true,maxRetries:6,retryDelay:120});
  }

  if(forbiddenNetwork.length)throw Error('Production/Sheets network access detected: '+JSON.stringify(forbiddenNetwork));
  await verifyExclusiveRules('after-browser-smoke');
  console.log('BROWSER_SMOKE_PASS: real Firebase Emulator V2 List/Report, guest-only controls, column search and UI regressions.');
}catch(error){
  // Do not overwrite the actual Excel admin-screen failure already captured
  // under the workflow's standard artifact path with an unrelated CDP tab.
  let preservedExcelFailure=false;
  try{preservedExcelFailure=statSync('hophdnd-ui-smoke-failure.png').isFile();}catch{}
  if(!preservedExcelFailure){
    try{if(ws?.readyState===WebSocket.OPEN){
      const shot=await Promise.race([
        send('Page.captureScreenshot',{format:'png'}),
        sleep(2500).then(()=>null)
      ]);
      if(shot?.data)writeFileSync('hophdnd-ui-smoke-failure.png',
        Buffer.from(shot.data,'base64'));
    }}catch{}
  }
  console.error('BROWSER_SMOKE_FAIL:',error);process.exitCode=1;
}finally{
  for(const p of pending.values())p.reject?.(Error('closing browser'));
  if(ws)ws.close();
  if(chrome)chrome.kill('SIGKILL');
  server.close();
  if(emulator&&emulator.exitCode===null)emulator.kill('SIGTERM');
  rmSync(userDir,{recursive:true,force:true,maxRetries:8,retryDelay:120});
  rmSync(emulatorConfigDir,{recursive:true,force:true,maxRetries:8,retryDelay:120});
}
