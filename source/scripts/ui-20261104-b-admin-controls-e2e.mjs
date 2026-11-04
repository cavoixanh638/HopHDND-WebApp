/**
 * PR95 V5 L2: real App verified admin vs guest, Auth/RTDB Emulator only.
 * Based on the independently passing V2 permission E2E, with additional
 * synthetic unknown-QPPL summary rows and exact DOM role assertions.
 * Run only with demo-hdnd Auth/RTDB Emulators and unchanged candidate Rules.
 * NO production Firebase, no Google Sheets, no privileged application writes.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createServer as createViteServer} from 'vite';
const PROJECT='demo-hdnd',NS='demo-hdnd',BASE='http://127.0.0.1:9000';
const OP='ui_b_admin_controls_20261104',GEN='gen_'+OP;
const PATH='hdnd/datasetV2',ROW='demo-0001',OTHER='demo-0002';
const candidate=JSON.parse(readFileSync(resolve('firebase/database.exclusive-candidate.rules.json'),'utf8'));
const rulesHash=createHash('sha256').update(JSON.stringify(candidate)).digest('hex');
const temp=mkdtempSync(join(resolve('.'),'.ui-b-admin-'));
const config=join(temp,'firebase.json');
writeFileSync(config,JSON.stringify({
 database:{rules:resolve('firebase/database.exclusive-candidate.rules.json')},
 functions:[{source:'../cell-edit-service',codebase:'pr142-cell-edit',runtime:'nodejs22'},
   {source:'../parent-commit-service',codebase:'parent-v2',runtime:'nodejs22'}],
 emulators:{database:{host:'127.0.0.1',port:9000},auth:{host:'127.0.0.1',port:9099},
   functions:{host:'127.0.0.1',port:5001},ui:{enabled:false},singleProjectMode:true}
}));
const step=(name,obj)=>console.log('UI_B_ADMIN_'+name+' '+JSON.stringify(obj));
const wait=async(fn,label,ms=20000)=>{
  const end=Date.now()+ms;let last;
  while(Date.now()<end){try{const result=await fn();if(result)return result;}catch(e){last=e;}
    await sleep(170);}
  throw Error('WAIT '+label+' '+String(last??''));
};
const ownerReq=async(path='',method='GET',body)=>{
  const response=await fetch(BASE+'/'+path.replace(/^\//,'')+'.json?ns='+NS,
    {method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Owner local '+path+' '+response.status+' '+(await response.text()).slice(0,500));
  return response.json();
};
let emu,host;let emuOutput='';const browsers=[];
async function startEmulator(){
  emu=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js',
    'emulators:start','--project',PROJECT,'--only','auth,database,functions','--config',config],
    {stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true',PARENT_COMMIT_ENABLED:'true',PARENT_DATABASE_URL:'https://demo-hdnd.firebaseio.com'}});
  for(const stream of [emu.stdout,emu.stderr])stream.on('data',p=>{emuOutput=(emuOutput+String(p)).slice(-9000)});
  await wait(async()=>{
    if(emu.exitCode!==null)throw Error('Emulator exited: '+emuOutput);
    const response=await fetch('http://127.0.0.1:4400/emulators',{signal:AbortSignal.timeout(1000)});
    if(!response.ok)return false;
    const e=await response.json();return e.auth?.port===9099&&e.database?.port===9000&&e.functions?.port===5001;
  },'Auth RTDB Emulator ready',40000);
  const url=BASE+'/.settings/rules.json?ns='+NS;
  const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
  const put=await fetch(url,{method:'PUT',headers,body:JSON.stringify(candidate)});
  assert.equal(put.status,200,'Failed to install exact candidate Rules in local emulator');
  const loaded=await (await fetch(url,{headers})).json();
  assert.ok(isDeepStrictEqual(loaded,candidate),'Actual emulator Rules != immutable V2 candidate');
  step('RULES_EXACT_PASS',{sha256:rulesHash,emulator:true});
}
async function seed(){
  // Reuse the actual production app's schema/defaults, not hand-crafted config.
  const vite=await createViteServer({configFile:'vite.config.ts',mode:'pages-test',
    server:{middlewareMode:true},appType:'custom',logLevel:'error'});
  let rows,profile;
  try{
    const [demo,catalog,reports,items]=await Promise.all([
      vite.ssrLoadModule('/src/data/demo-items.ts'),
      vite.ssrLoadModule('/src/data/catalogs.ts'),
      vite.ssrLoadModule('/src/data/report-preferences.ts'),
      vite.ssrLoadModule('/src/data/item-preferences.ts')]);
    rows=demo.createDemoItems(3);
    // Independent unknown-QPPL fixture: deliberately NOT HC/BC (their Build
    // scope is undergoing a separate V5 rule change in workers L4/L5).
    rows[2]={...rows[2],documentKind:'NQ',type:'QPPL',
      displayCode:'NQ-UNKNOWN-QPPL',progressParty:'Không rõ bước Thành ủy',
      progressBuild:'Không rõ bước xây dựng NQ',progressCouncil:'Không rõ ban hành NQ'};
    profile={dataSource:'primary',catalogs:catalog.catalogFromItems(rows),
      reports:reports.defaultReportLayout(),items:items.defaultItemLayout()};
  }finally{await vite.close();}
  const values=Object.fromEntries(rows.map((r,i)=>{
    const {archivedAt,...rest}=r;
    return [r.recordId,{...rest,revision:1,operationId:'l3-seed-'+(i+1),
      updatedAt:1,updatedBy:'l3-test'}];
  }));
  const seed={hdnd:{
    items:{},permissions:{columns:{}},profile:{revision:1,payload:JSON.stringify(profile)},
    control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
    freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:'l3-test',changedAt:1,deadline:0,closedAt:0},
    datasetV2:{
      active:{generationId:GEN,operationId:OP,revision:1,rowCount:3,digest:'a'.repeat(64)},
      generations:{[GEN]:{items:values}},
      permissions:{[GEN]:{columns:{}}}
    }
  }};
  await ownerReq('', 'PUT',seed);
  const read=await ownerReq(PATH+'/generations/'+GEN+'/items');
  assert.equal(Object.keys(read).length,3);assert.equal(read[ROW].recordId,ROW);
  assert.equal(read['demo-0003'].type,'QPPL');
  step('SYNTHETIC_SEED_PASS',{generation:GEN,rowIds:Object.keys(read),profileRevision:1});
}
const APP=resolve('dist-pages-test');
async function startSite(){
  host=createServer((req,res)=>{
    try{
      const url=new URL(req.url??'/', 'http://127.0.0.1');
      const file=resolve(APP,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(APP+'/')&&!file.startsWith(APP+'\\'))throw Error('bad file');
      if(!statSync(file).isFile())throw Error('not file');
      const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
      res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});
      res.end(readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise((ok,bad)=>{host.once('error',bad);host.listen(0,'127.0.0.1',ok);});
  return 'http://127.0.0.1:'+host.address().port+'/';
}
async function startChrome(url,role){
  const bin=['google-chrome','google-chrome-stable','chromium','chromium-browser']
    .find(n=>spawnSync('which',[n]).status===0);
  if(!bin)throw Error('Chromium/Chrome not found');
  const tcp=createServer();
  await new Promise((ok,bad)=>{tcp.once('error',bad);tcp.listen(0,'127.0.0.1',ok);});
  const port=tcp.address().port;await new Promise(ok=>tcp.close(ok));
  const processChrome=spawn(bin,['--headless=new','--no-sandbox','--no-zygote',
    '--disable-dev-shm-usage','--disable-gpu','--disable-extensions','--disable-background-networking',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,
    '--window-size=1500,1000','--user-data-dir='+join(temp,'chrome-'+role),'about:blank'],
    {stdio:['ignore','ignore','pipe'],env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
  browsers.push(processChrome);
  let stderr='';processChrome.stderr.on('data',p=>{stderr=(stderr+String(p)).slice(-1800)});
  const endpoint='http://127.0.0.1:'+port;
  await wait(async()=>{
    if(processChrome.exitCode!==null)throw Error('Chrome exit '+stderr);
    const res=await fetch(endpoint+'/json/version',{signal:AbortSignal.timeout(1000)});
    return res.ok;
  },'Chrome CDP '+role,20000);
  const page=await (await fetch(endpoint+'/json/new?'+encodeURIComponent(url),{method:'PUT'})).json();
  assert.ok(page.id&&page.webSocketDebuggerUrl);
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  let id=0;const pending=new Map(),outbound=[];
  ws.addEventListener('message',e=>{
    const msg=JSON.parse(e.data);
    if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);
      msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}
    if(msg.method==='Network.requestWillBeSent'){
      const to=String(msg.params?.request?.url??'');
      if(to.includes('hophdnd-8b7b2')||to.includes('docs.google.com/spreadsheets/'))
        outbound.push(to);
    }
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const serial=++id;pending.set(serial,{resolve,reject});
    ws.send(JSON.stringify({id:serial,method,params}));
    setTimeout(()=>{if(pending.has(serial)){pending.delete(serial);reject(Error('CDP '+method+' timed out'));}},18000);
  });
  const evalJs=async js=>{
    const value=await send('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});
    if(value.exceptionDetails)throw Error('Browser '+role+' JS '+JSON.stringify(value.exceptionDetails).slice(0,650));
    return value.result?.value;
  };
  const until=async(js,label,ms=19000)=>wait(()=>evalJs(js),role+' '+label,ms);
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  // V6 L3: guests and loading/unverified viewers have NO primary nav.
  // The accessible gear is the stable App shell witness for both roles.
  await until('!!document.querySelector(".v3-settings-menu summary")','real App shell');
  return {role,pageId:page.id,ws,send,evalJs,until,outbound};
}
async function clickText(tab,selector,needle){
  if(tab.role==='guest'&&selector==='nav.primary-section-switcher button'&&needle==='Danh sách'){
    // Guest does not have A01/A02. Validate the actual List route and
    // no navigation instead of synthesizing a click or granting admin.
    // Source/profile and layout arrive asynchronously after the shell.
    // Wait for the actual List rather than pretending the first shell paint
    // already contains a loaded table or requesting a vanished guest tab.
    await tab.until('!!document.querySelector(".item-data-region")&&'+
      '!document.querySelector("nav.primary-section-switcher")',
      'guest List region present without primary navigation',30000);
    return;
  }
  const ok=await tab.evalJs(`(()=>{const list=[...document.querySelectorAll(${JSON.stringify(selector)})];const el=list.find(e=>e.textContent?.includes(${JSON.stringify(needle)}));if(!el)return false;el.click();return true;})()`);
  assert.ok(ok,'Not found '+tab.role+' button '+needle+' in '+selector);
}
async function setSelect(tab,selector,value){
  const ok=await tab.evalJs(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});
    if(!el)return false;el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  assert.ok(ok,'Missing select '+selector);
}
async function capture(tab,name){
  const shot=await tab.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  assert.ok(shot.data?.length>1000);
  mkdirSync(resolve('ui-b-admin-artifacts'),{recursive:true});
  const path=resolve('ui-b-admin-artifacts/'+name+'.png');
  writeFileSync(path,Buffer.from(shot.data,'base64'));return path;
}
const read=()=>ownerReq(PATH+'/generations/'+GEN+'/items/'+ROW);
const rights=()=>ownerReq(PATH+'/permissions/'+GEN);
const summarySnapshot=tab=>tab.evalJs(`(()=>{
  const summary=document.querySelector('.item-summary-grid');
  const grids=[...document.querySelectorAll('.item-summary-grid')];
  const cards=[...summary?.querySelectorAll('.item-summary-card[data-summary-card]')??[]];
  const stages=cards.filter(x=>x.dataset.summaryCard!=='total').map(x=>({
    id:x.dataset.summaryCard,
    fraction:x.querySelector('.item-summary-fraction')?.textContent.trim(),
    percent:x.querySelector('.item-summary-percent')?.textContent.trim(),
    buckets:[...x.querySelectorAll('button[data-summary-stage]')].map(b=>({
      stage:b.dataset.summaryStage,count:Number(b.querySelector('strong')?.textContent),
      pressed:b.getAttribute('aria-pressed')
    })),
    note:x.querySelector('.item-summary-unmatched')?.textContent.trim()??null
  }));
  const chips=[...summary?.querySelectorAll('button[data-summary-kind]')??[]].map(b=>({
    kind:b.dataset.summaryKind,count:Number(b.querySelector('strong')?.textContent),
    pressed:b.getAttribute('aria-pressed')
  }));
  return {
    total:Number(summary?.querySelector('.item-summary-total-count')?.textContent),
    grids:grids.length,
    // React can temporarily retain more than one list during the draft/route
    // transition. Check every grid, but compare one stable card tree per role.
    sameTotalAcrossGrids:grids.length>0&&grids.every(x=>Number(x.querySelector('.item-summary-total-count')?.textContent)===Number(summary?.querySelector('.item-summary-total-count')?.textContent)),
    noUnmatchedInAnyGuestGrid:grids.every(x=>!x.querySelector('.item-summary-unmatched')),
    diagnostics:document.querySelectorAll('.item-summary-unmatched').length,
    leakedText:grids.some(x=>x.textContent?.includes('Chưa chuẩn hóa / ngoài nhóm')),
    stages,chips,buttons:stages.map(x=>x.buckets.length),
    guestClass:document.querySelector('.app-shell')?.classList.contains('guest-view')
  };
})()`);
const numericSnapshot=x=>JSON.stringify({
  total:x.total,chips:x.chips,
  stages:x.stages.map(y=>({id:y.id,fraction:y.fraction,percent:y.percent,buckets:y.buckets}))
});


/** Worker B, real App, real Auth + RTDB + Functions EMULATOR only. */
const adminSelect=(code)=>'.admin-summary-visibility input[aria-label^="Hiện '+code+'"]';
const saved=async()=>{
  const remote=await ownerReq('hdnd/profile');
  return {revision:remote.revision,profile:JSON.parse(remote.payload),raw:remote};
};
const stageState=async(tab)=>tab.evalJs('(()=>{const outer=document.querySelector(".item-list-card");'+
  'const cardIds=["total","party","build","nq"];return {'+
  'title:document.querySelector(".item-list-page-title")?.textContent.trim(),'+
  'nav:[...document.querySelectorAll("nav.primary-section-switcher button")].map(b=>b.textContent.trim()),'+
  'cards:Object.fromEntries(cardIds.map(id=>{const e=document.querySelector("[data-summary-card="+id+"]");return [id,{exists:!!e,visible:!!e&&getComputedStyle(e).display!=="none",text:e?.textContent.trim().slice(0,130)}]})),'+
  'rows:document.querySelectorAll(".item-data-table tbody tr").length,'+
  'total:document.querySelector(".item-summary-total-count")?.textContent.trim(),'+
  'controls:document.querySelectorAll(".admin-summary-visibility input[type=checkbox]").length,'+
  'rename:!!document.querySelector(".admin-list-rename-trigger"),'+
  'overflow:document.documentElement.scrollWidth-innerWidth,viewport:innerWidth,'+
  'filter:document.querySelector(".list-filter-toolbar")?.textContent.trim().slice(0,100),'+
  'reportTables:document.querySelectorAll(".report-table").length};})()');
async function pointer(tab,selector){
  const rect=await tab.evalJs('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');'+
    'if(!e)throw Error("Missing pointer target: "+'+JSON.stringify(selector)+');'+
    'e.scrollIntoView({block:"center",inline:"nearest"});return e.getBoundingClientRect().toJSON();})()');
  assert.ok(rect.width>=8&&rect.height>=8,'click target too small '+selector);
  await sleep(100);
  const x=rect.x+rect.width/2,y=rect.y+rect.height/2;
  await tab.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await tab.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await tab.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
}
async function insert(tab,selector,value){
  await pointer(tab,selector);
  const focused=await tab.evalJs('document.activeElement===document.querySelector('+JSON.stringify(selector)+')');
  assert.ok(focused,'input did not receive real mouse focus: '+selector);
  await tab.send('Input.dispatchKeyEvent',{type:'keyDown',key:'a',code:'KeyA',modifiers:2});
  await tab.send('Input.dispatchKeyEvent',{type:'keyUp',key:'a',code:'KeyA',modifiers:2});
  await tab.send('Input.insertText',{text:value});
  assert.equal(await tab.evalJs('document.querySelector('+JSON.stringify(selector)+').value'),value);
}
async function keyboardSpace(tab,selector){
  await tab.evalJs('document.querySelector('+JSON.stringify(selector)+').focus()');
  assert.equal(await tab.evalJs('document.activeElement===document.querySelector('+JSON.stringify(selector)+')'),true);
  await tab.send('Input.dispatchKeyEvent',{type:'keyDown',key:' ',code:'Space',text:' '});
  await tab.send('Input.dispatchKeyEvent',{type:'keyUp',key:' ',code:'Space'});
}
const titleInput='#admin-list-title-input';
async function rename(tab,title){
  await pointer(tab,'.admin-list-rename-trigger');
  await tab.until('!!document.querySelector("#admin-list-title-input")','rename form shown');
  await insert(tab,titleInput,title);
  await pointer(tab,'.admin-list-title-editor button[type="submit"]');
}
async function viewport(tab,role,width){
  await tab.send('Emulation.setDeviceMetricsOverride',{
    width,height:width===390?844:960,deviceScaleFactor:1,mobile:width===390});
  await sleep(150);
  await tab.evalJs('document.querySelector(".admin-summary-visibility, .item-list-page-title")?.scrollIntoView({block:"center"})');
  const state=await stageState(tab);
  assert.equal(state.viewport,width,'wrong viewport metrics');
  assert.ok(state.overflow<=3,'whole-page overflow '+JSON.stringify(state));
  if(role==='admin'){
    assert.equal(state.controls,3,'admin C01-C03 not visible');
    assert.equal(state.rename,true,'admin rename shortcut missing');
  }else{
    assert.equal(state.controls,0,'guest must not mount admin controls');
    assert.equal(state.rename,false,'guest must not mount rename');
  }
  await capture(tab,'B-'+role+'-'+width);
  step('VIEWPORT_PASS',{role,width,overflow:state.overflow,controls:state.controls,
    title:state.title});
}
async function setRules(value){
  const response=await fetch(BASE+'/.settings/rules.json?ns='+NS,{
    method:'PUT',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
    body:JSON.stringify(value),signal:AbortSignal.timeout(12000)});
  assert.equal(response.status,200,'local emulator Rules change failed');
}
async function reloadList(tab,role){
  await tab.send('Page.reload',{ignoreCache:true});
  if(role==='admin'){
    await tab.until('!!document.querySelector("nav.primary-section-switcher")',
      'admin Auth survived reload',30000);
    await clickText(tab,'nav.primary-section-switcher button','Danh sách');
  }else{
    await tab.until('!!document.querySelector(".item-data-region")&&'+
      '!document.querySelector("nav.primary-section-switcher")',
      'guest Auth/role after reload',30000);
  }
  await tab.until('!!document.querySelector(".item-summary-total-count")','summary after reload',30000);
}
async function runControlsE2E(admin,guest,url){
  await admin.until('!!document.querySelector(".admin-summary-visibility input")&&'+
    '!document.querySelector(".admin-summary-visibility").disabled',
    'verified admin controls enabled',20000);
  const prior=await saved();
  assert.equal(prior.profile.items.listTitle,'Danh sách các ND trình HĐND');
  const guest0=await stageState(guest),admin0=await stageState(admin);
  assert.equal(guest0.rename,false);assert.equal(guest0.controls,0);
  assert.equal(admin0.rename,true);assert.equal(admin0.controls,3);
  assert.equal(guest0.total,admin0.total);assert.equal(admin0.total,'3');
  for(const width of [1440,900,390]){
    await viewport(admin,'admin',width);
    await viewport(guest,'guest',width);
  }
  await admin.send('Emulation.setDeviceMetricsOverride',
    {width:1440,height:960,deviceScaleFactor:1,mobile:false});
  // Empty title: correct client-side validation and zero Firebase writes.
  await rename(admin,'   ');
  await admin.until('!!document.querySelector("#admin-list-title-error")',
    'blank title validation');
  assert.equal((await saved()).revision,prior.revision,
    'invalid title wrote Firebase');
  assert.equal((await stageState(admin)).title,prior.profile.items.listTitle);
  await capture(admin,'B-invalid-title-rollback');
  step('EMPTY_TITLE_DENIED_PASS',{revision:prior.revision});
  // Actual mouse and physical keyboard typing into the real App form.
  const chosen='Danh sách kiểm thử quản trị B';
  await insert(admin,titleInput,chosen);
  await pointer(admin,'.admin-list-title-editor button[type="submit"]');
  await wait(async()=>{const s=await saved();return s.profile.items.listTitle===chosen?s:false},
    'real Firebase title save',25000);
  await admin.until('!document.querySelector("#admin-list-title-input")&&'+
    'document.querySelector(".item-list-page-title")?.textContent.trim()=== '+
    JSON.stringify(chosen),'confirmed title rendered');
  await admin.until('[...document.querySelectorAll("nav.primary-section-switcher button")].some(b=>b.textContent.includes('+
    JSON.stringify(chosen)+'))','admin nav title');
  await guest.until('document.querySelector(".item-list-page-title")?.textContent.trim()=== '+
    JSON.stringify(chosen),'guest observes shared Firebase title',25000);
  step('TITLE_SAVE_LIVE_GUEST_PASS',{revision:(await saved()).revision,title:chosen});
  await capture(admin,'B-title-saved-admin');
  await capture(guest,'B-title-saved-guest');
  await reloadList(admin,'admin');await reloadList(guest,'guest');
  await admin.until('document.querySelector(".item-list-page-title")?.textContent.trim()=== '+
    JSON.stringify(chosen),'admin title persisted reload',24000);
  await guest.until('document.querySelector(".item-list-page-title")?.textContent.trim()=== '+
    JSON.stringify(chosen),'guest title persisted reload',24000);
  step('TITLE_RELOAD_PASS',{title:chosen,revision:(await saved()).revision});
  // Three independently persisted toggles, C00 invariant, no source mutation.
  const rowBefore=await ownerReq(PATH+'/generations/'+GEN+'/items');
  const counters=numericSnapshot(await summarySnapshot(admin));
  for(const [i,key] of ['party','build','nq'].entries()){
    const code='C0'+(i+1),selector=adminSelect(code);
    await admin.until('!!document.querySelector('+JSON.stringify(selector)+')&&'+
      '!document.querySelector(".admin-summary-visibility").disabled',
      code+' enabled');
    assert.equal(await admin.evalJs('document.querySelector('+JSON.stringify(selector)+').checked'),true);
    await pointer(admin,selector);
    await wait(async()=>{const s=await saved();return s.profile.items.summaryCards[key]===false?s:false},
      code+' OFF stored in Firebase',24000);
    await admin.until('!document.querySelector(".admin-summary-visibility").disabled',
      code+' OFF acknowledgement',20000);
    let state=await stageState(admin);
    assert.equal(state.cards[key].visible,false,code+' must be hidden');
    assert.equal(state.cards.total.visible,true,'C00 must remain visible');
    for(const other of ['party','build','nq'].filter(x=>x!==key))
      assert.equal(state.cards[other].visible,true,'unrelated '+other+' was hidden');
    assert.equal(state.total,'3');assert.equal(state.rows,admin0.rows);
    assert.equal(numericSnapshot(await summarySnapshot(admin)),counters,
      'toggle affected report/filter arithmetic');
    await capture(admin,'B-'+code+'-hidden');
    // Restore via genuine browser keyboard Space, not synthetic DOM click.
    await keyboardSpace(admin,selector);
    await wait(async()=>{const s=await saved();return s.profile.items.summaryCards[key]===true?s:false},
      code+' ON stored in Firebase',24000);
    await admin.until('!document.querySelector(".admin-summary-visibility").disabled',
      code+' ON acknowledgement',20000);
    state=await stageState(admin);
    assert.equal(state.cards[key].visible,true,code+' not restored');
    assert.equal(state.cards.total.visible,true);
    step('CARD_TOGGLE_MOUSE_KEYBOARD_PASS',{code,key,revision:(await saved()).revision,
      rows:state.rows,total:state.total});
  }
  assert.deepEqual(await ownerReq(PATH+'/generations/'+GEN+'/items'),rowBefore,
    'layout toggles changed business dataset');
  await clickText(admin,'nav.primary-section-switcher button','Báo cáo tổng hợp');
  await admin.until('document.querySelectorAll(".report-table").length===5',
    'five reports after toggles');
  assert.equal(await admin.evalJs('document.querySelectorAll(".report-table").length'),5);
  await capture(admin,'B-reports-after-toggles');
  await clickText(admin,'nav.primary-section-switcher button',chosen);
  await admin.until('!!document.querySelector(".admin-summary-visibility")',
    'back to list controls');
  step('DATA_REPORTS_FILTERS_UNCHANGED_PASS',{rows:admin0.rows,total:admin0.total,reports:5});
  // Two genuinely authenticated, independent Chrome targets simulate tab CAS.
  const other=await startChrome(url,'admin-second');
  await other.until('typeof window.__pr95EmulatorGoogleAdminSignIn==="function"',
    'second admin sign in');
  await other.evalJs('window.__pr95EmulatorGoogleAdminSignIn()');
  await other.until('!!document.querySelector("nav.primary-section-switcher")',
    'second admin authorized',30000);
  await clickText(other,'nav.primary-section-switcher button',chosen);
  await other.until('!!document.querySelector(".admin-list-rename-trigger")',
    'second admin controls');
  await pointer(admin,'.admin-list-rename-trigger');
  await admin.until('!!document.querySelector("#admin-list-title-input")',
    'first tab title baseline pinned');
  const wantedLocal='Tên từ tab cũ chưa lưu';
  await insert(admin,titleInput,wantedLocal);
  const wantedRemote='Tên từ tab quản trị thứ hai';
  await rename(other,wantedRemote);
  await wait(async()=>{const s=await saved();return s.profile.items.listTitle===wantedRemote?s:false},
    'second tab accepted title');
  await pointer(admin,'.admin-list-title-editor button[type="submit"]');
  await admin.until('!!document.querySelector(".layout-conflict-resolver")',
    'same-field CAS conflict requires explicit resolution',25000);
  assert.equal((await saved()).profile.items.listTitle,wantedRemote,
    'stale tab silently overwrote remote');
  await capture(admin,'B-real-two-tabs-CAS-conflict');
  await pointer(admin,'.layout-conflict-resolver input[value="remote"]');
  await pointer(admin,'.layout-conflict-resolver .layout-conflict-actions button:last-child');
  await admin.until('!document.querySelector(".layout-conflict-resolver")',
    'explicit conflict resolved',25000);
  assert.equal((await saved()).profile.items.listTitle,wantedRemote);
  step('TWO_REAL_TABS_CAS_RESOLVED_PASS',{title:wantedRemote});
  // Deny profile writes at the real Emulator Rules layer (NEVER production).
  const beforeDeny=await saved();
  const deny=structuredClone(candidate);
  deny.rules.hdnd.profile['.write']=false;
  await setRules(deny);
  try{
    await admin.until('!!document.querySelector('+JSON.stringify(adminSelect('C01'))+')',
      'C01 before denied write');
    await pointer(admin,adminSelect('C01'));
    await admin.until('!!document.querySelector(".item-data-region .error-text")',
      'admin denied by Emulator and UI rollback',25000);
    const afterDeny=await saved();
    assert.equal(afterDeny.revision,beforeDeny.revision,'denied request revised Firebase');
    assert.equal(afterDeny.profile.items.summaryCards.party,true,
      'denied request changed C01 remote');
    assert.equal((await stageState(admin)).cards.party.visible,true,
      'optimistic UI was not rolled back');
    await capture(admin,'B-emulator-permission-denied-rollback');
    step('EMULATOR_DENIED_ROLLBACK_PASS',{revision:afterDeny.revision});
  }finally{await setRules(candidate);}
  const finalRules=await (await fetch(BASE+'/.settings/rules.json?ns='+NS,
    {headers:{Authorization:'Bearer owner'}})).json();
  assert.ok(isDeepStrictEqual(finalRules,candidate),'Emulator Rules not restored');
  for(const tab of [admin,guest,other])assert.equal(tab.outbound.length,0,
    'Production request forbidden');
  step('ADMIN_E2E_PASS',{source:'real App + Auth/RTDB/Functions emulator',
    verifiedSha:process.env.GITHUB_SHA??'local',screens:[1440,900,390],
    title:true,guest:true,reload:true,threeCards:true,mouse:true,keyboard:true,
    twoTabsCAS:true,permissionDenied:true,noProductionNetwork:true});
}
async function test(){
  await startEmulator();await seed();
  const url=await startSite();
  const admin=await startChrome(url,'admin');
  const guest=await startChrome(url,'guest');
  await guest.until('!!document.querySelector(".item-data-table tbody")&&'+
    '!document.querySelector("nav.primary-section-switcher")','real guest list',30000);
  await admin.until('typeof window.__pr95EmulatorGoogleAdminSignIn==="function"',
    'admin Auth hook');
  const principal=await admin.evalJs('window.__pr95EmulatorGoogleAdminSignIn()');
  assert.ok(principal.uid&&principal.emailVerified&&principal.providerIds.includes('google.com'));
  await admin.until('!!document.querySelector("nav.primary-section-switcher")',
    'admin actual account verified',30000);
  await clickText(admin,'nav.primary-section-switcher button','Danh sách');
  await admin.until('!!document.querySelector(".admin-summary-visibility")',
    'actual admin controls visible',30000);
  await runControlsE2E(admin,guest,url);
}

let failed=false;
try{await test();}
catch(e){failed=true;console.error('UI_B_ADMIN_E2E_FAIL',e?.stack??e);process.exitCode=1;}
finally{
  for(const p of browsers)try{p.kill('SIGTERM')}catch{}
  if(host)await new Promise(ok=>host.close(ok));
  if(emu)try{emu.kill('SIGTERM')}catch{}
  await sleep(450);rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  if(failed)console.error('UI_B_ADMIN_EMULATOR_LOG_TAIL '+emuOutput.slice(-1800));
}
