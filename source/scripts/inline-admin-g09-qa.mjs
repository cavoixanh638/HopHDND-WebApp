/** G09: no-dependency Chrome CDP QA. Fixture != product. No production requests. */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,mkdtempSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {resolve,join,sep,extname} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as sleep} from 'node:timers/promises';
import {FIXTURE_HTML,FIXTURE_VERSION} from './inline-admin-g09-fixture.mjs';

const args=process.argv.slice(2),flag=(name,fallback)=>{
 const entry=args.find(arg=>arg.startsWith('--'+name+'='));return entry?entry.slice(name.length+3):fallback;
};
const mode=flag('mode','contract'),out=resolve(flag('out','qa-results/inline-admin-g09'));
const root=resolve(flag('dist','dist-compact-qa'));
const baseSha='2ace3304a299d23ca6414c6ba6dc30f16266e9c2';
const codeSha=process.env.G09_CODE_SHA||spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout?.trim()||null;
const acceptance=[
 ['rename-inline','G01/G02/G04','PENDING_INTEGRATION','Admin rename saves once on Enter; staff/guest DOM forgery denied'],
 ['hide-reorder-columns-cards','G01/G02','PENDING_INTEGRATION','Hidden is not deleted; no change to counts or Excel A-O'],
 ['report-order-resize','G02/G03','PENDING_INTEGRATION','Reorder/resize commits once; report totals unchanged'],
 ['status-colors-font','G03/G06','PENDING_INTEGRATION','Personal palette stays local; shared style uses CAS writer'],
 ['popup-width-labels','G04/G07','PENDING_INTEGRATION','Pointer/touch/keyboard min-max, rollback on conflict'],
 ['mini-catalog','G05','PENDING_INTEGRATION','Validate duplicates and permissions; Escape/focus/backdrop'],
 ['l03-five-rails','G08','PENDING_INTEGRATION','Five independent widths, clamp, all overflow cases'],
 ['two-user-firebase-cas-lease','G00','NOT_RUN','Needs localhost Auth+RTDB Emulator, genuine App; no production'],
 ['real-a4-export','G00','NOT_RUN','Requires integrated App report and print output review']
].map(([id,owner,status,expected])=>({id,owner,status,expected,observed:null}));
const report={suite:'INLINE_ADMIN_G09',mode,fixtureVersion:mode==='fixture'?FIXTURE_VERSION:null,
  scope:mode==='fixture'?'ISOLATED_BROWSER_MECHANICS_ONLY':'REAL_COMPACT_QA_COMPONENTS_SYNTHETIC_DATA',
  baseSha,codeSha,testedSha:codeSha,generatedAt:new Date().toISOString(),cases:[],acceptance,
  environment:{node:process.version,chrome:null,offline:true,productionFirebase:false},screenshots:[],
  externalRequests:[],browserErrors:[],counts:{PASS:0,FAIL:0,NOT_RUN:0,PENDING_INTEGRATION:acceptance.filter(x=>x.status==='PENDING_INTEGRATION').length}};
const record=(name,expected,observed,pass,detail='')=>{
 const status=pass?'PASS':'FAIL';report.cases.push({name,status,expected,observed,detail});report.counts[status]++;
 console.log('G09_CASE '+JSON.stringify(report.cases.at(-1)));return pass;
};
const check=(name,expected,observed,pass=JSON.stringify(expected)===JSON.stringify(observed),detail='')=>{
 record(name,expected,observed,pass,detail);assert.ok(pass,`${name}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(observed)}`);
};
const notRun=(name,reason)=>{report.cases.push({name,status:'NOT_RUN',expected:'test execution',observed:null,detail:reason});report.counts.NOT_RUN++};
const flush=()=>{mkdirSync(out,{recursive:true});writeFileSync(join(out,'results.json'),JSON.stringify(report,null,2)+'\n');};
const server=createServer((req,res)=>{
 try{const pathname=new URL(req.url||'/','http://127.0.0.1').pathname;
  if(mode==='fixture'){
    if(pathname!=='/'&&pathname!=='/index.html')throw Error('not found');
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});res.end(FIXTURE_HTML);return;
  }
  const file=resolve(root,'.'+(pathname==='/'?'/compact-qa.html':pathname));
  if(!file.startsWith(root+sep)||!statSync(file).isFile())throw Error('not found');
  res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream','cache-control':'no-store'});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end('Not found')}
});
let chromeProcess=null,profile=null,serverStarted=false;const pages=[];
const poll=async(run,label,attempts=90)=>{let last='not ready';for(let i=0;i<attempts;i++){
  try{const v=await run();if(v)return v}catch(e){last=String(e)}await sleep(120);
 }throw Error('Timeout '+label+' '+last)};
const portOnce=async()=>{const s=createServer();await new Promise(done=>s.listen(0,'127.0.0.1',done));
 const p=s.address().port;await new Promise(done=>s.close(done));return p};
class Target{
 constructor(url){this.url=url;this.ws=null;this.pending=new Map();this.serial=0;this.requests=[];this.errors=[]}
 async connect(tab){this.ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{this.ws.addEventListener('open',ok,{once:true});this.ws.addEventListener('error',fail,{once:true})});
  this.ws.addEventListener('message',evt=>{let message;try{message=JSON.parse(evt.data)}catch{return}
   if(message.id){const promise=this.pending.get(message.id);if(!promise)return;this.pending.delete(message.id);
    message.error?promise.reject(Error(message.error.message)):promise.resolve(message.result||{});return;}
   if(message.method==='Network.requestWillBeSent')this.requests.push(message.params.request.url);
   if(message.method==='Runtime.exceptionThrown')this.errors.push(message.params.exceptionDetails?.text||'Uncaught exception');
  });
  await this.send('Page.enable');await this.send('Runtime.enable');await this.send('Network.enable');
  await this.send('Page.navigate',{url:this.url});await this.wait('document.readyState === "complete"','load');
 }
 send(method,params={}){const id=++this.serial;return new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>{if(this.pending.delete(id))reject(Error('CDP TIMEOUT '+method))},20000);
  this.pending.set(id,{resolve:value=>{clearTimeout(timeout);resolve(value)},reject:error=>{clearTimeout(timeout);reject(error)}});
  this.ws.send(JSON.stringify({id,method,params}));
 })}
 async eval(expression){const r=await this.send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error('JS '+JSON.stringify(r.exceptionDetails).slice(0,1000));return r.result?.value}
 async wait(expr,label){return poll(async()=>{if(await this.eval('location.href === "chrome-error://chromewebdata/"'))throw Error('G09_CHROME_POLICY_BLOCKED_URL');return this.eval('Boolean('+expr+')')},label)}
 async rect(selector){const r=await this.eval(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)return null;e.scrollIntoView({block:'nearest'});return e.getBoundingClientRect().toJSON()})()`);
  assert(r&&r.width>0&&r.height>0,'Missing selector '+selector);return r;}
 async click(selector){const r=await this.rect(selector),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
  await this.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await this.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await this.send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});}
 async key(key,code=key,modifiers=0){await this.send('Input.dispatchKeyEvent',{type:'rawKeyDown',key,code,modifiers,
  windowsVirtualKeyCode:key==='ArrowRight'?39:key==='Escape'?27:key==='Enter'?13:key==='Tab'?9:37});
  await this.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers});}
 async type(selector,text){await this.eval(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el.value='';el.focus();el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'deleteContentBackward'}));})()`);
  await this.send('Input.insertText',{text});}
 async drag(selector,dx,hold){const r=await this.rect(selector),x=Math.round(r.x+r.width/2),y=Math.round(r.y+r.height/2);
  await this.send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await this.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  for(let i=1;i<=5;i++)await this.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:Math.round(x+dx*i/5),y,button:'left',buttons:1});
  if(hold)await hold();
  await this.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:Math.round(x+dx),y,button:'left',clickCount:1});}
 async viewport(width,height){await this.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<650});}
 async screenshot(name){const r=await this.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const bytes=Buffer.from(r.data,'base64');assert(bytes.length>1000,'Empty screenshot');const filename=join(out,name+'.png');
  mkdirSync(out,{recursive:true});writeFileSync(filename,bytes);report.screenshots.push(filename);}
 close(){for(const x of this.pending.values())x.reject(Error('target closed'));this.pending.clear();this.ws?.close();}
}
const connected=async(port,url,isFirst=false)=>{
 const endpoint='http://127.0.0.1:'+port;
 const target=await poll(async()=>{
  const r=isFirst?await fetch(endpoint+'/json/list'):await fetch(endpoint+'/json/new?about:blank',{method:'PUT'});
  if(!r.ok)return null;const d=await r.json();return isFirst?d.find(x=>x.type==='page'&&x.webSocketDebuggerUrl):d;
 },'Chrome target');
 const page=new Target(url);await page.connect(target);pages.push(page);return page;
};
const snap=page=>page.eval('window.__g09.snapshot()');
async function fixtureCases(debugPort,base){
 const admin=await connected(debugPort,base+'/?role=admin',true),guest=await connected(debugPort,base+'/?role=guest'),staff=await connected(debugPort,base+'/?role=staff');
 await Promise.all([admin.wait('!!window.__g09','admin fixture'),guest.wait('!!window.__g09','guest fixture'),staff.wait('!!window.__g09','staff fixture')]);
 for(const [role,page] of [['admin',admin],['guest',guest],['staff',staff]]){
  const got=await snap(page);check('ROLE_BASE_'+role,{role,sourceCount:4},{role:got.role,sourceCount:got.sourceCount});
  const visible=await page.eval('!document.querySelector("#edit-layout").hidden');check('EDITOR_VISIBILITY_'+role,role==='admin',visible);
 }
 check('DOM_FORGERY_GUEST_DENIED',false,await guest.eval('window.__g09.attemptUnauthorized()'));
 check('DOM_FORGERY_STAFF_DENIED',false,await staff.eval('window.__g09.attemptUnauthorized()'));
 await admin.click('#edit-layout');await admin.click('#rename');const before=(await snap(admin)).layoutWrites;
 await admin.type('#rename-input','Danh sach noi dung - G09');check('NO_WRITE_PER_KEYSTROKE',before,(await snap(admin)).layoutWrites);
 await admin.key('Enter');check('RENAME_ON_ENTER_ONCE',before+1,(await snap(admin)).layoutWrites);
 await guest.wait('window.__g09.snapshot().layout.title === "Danh sach noi dung - G09"','cross-tab title');
 check('CROSS_TAB_SHARED_REVISION',(await snap(admin)).layout.revision,(await snap(guest)).layout.revision);
 const widthBefore=(await snap(admin)).layout.columns[0].width,commitBefore=(await snap(admin)).layoutWrites;
 await admin.drag('th[data-col="content"] .resize',65,async()=>check('NO_SAVE_DURING_POINTER_MOVE',commitBefore,(await snap(admin)).layoutWrites));
 check('RESIZE_COMMIT_ON_RELEASE_ONCE',commitBefore+1,(await snap(admin)).layoutWrites);
 check('RESIZE_EXPECTED_WIDTH',widthBefore+65,(await snap(admin)).layout.columns[0].width);
 const reorderBefore=(await snap(admin)).layoutWrites;
 await admin.eval('document.querySelector("th[data-col=department] .drag").focus()');await admin.key('ArrowLeft','ArrowLeft',1);
 check('KEYBOARD_ALT_ARROW_REORDER', 'department',(await snap(admin)).layout.columns[0].key);
 check('KEYBOARD_REORDER_SINGLE_COMMIT',reorderBefore+1,(await snap(admin)).layoutWrites);
 const pointerBefore=(await snap(admin)).layoutWrites;
 const sourceGrip=await admin.rect('th[data-col=content] .drag'),targetHeader=await admin.rect('th[data-col=department]');
 const targetX=Math.round(targetHeader.x+targetHeader.width/2),sourceX=Math.round(sourceGrip.x+sourceGrip.width/2);
 await admin.drag('th[data-col=content] .drag',targetX-sourceX);
 check('POINTER_DRAG_REORDERS', 'content',(await snap(admin)).layout.columns[0].key);
 check('POINTER_DRAG_SINGLE_COMMIT',pointerBefore+1,(await snap(admin)).layoutWrites);
 await admin.click('#toggle-note');check('HIDE_NOT_DELETE_SOURCE',4,(await snap(admin)).sourceCount);
 check('HIDE_NOT_DELETE_SCHEMA',3,(await snap(admin)).layout.columns.length);
 await admin.click('#toggle-note');const paletteBefore=(await snap(admin)).layoutWrites;
 await admin.click('#set-status');check('PERSONAL_PALETTE_NO_SHARED_SAVE',paletteBefore,(await snap(admin)).layoutWrites);
 await guest.eval('window.__g09.personalPreference()');check('PERSONAL_PALETTE_ONLY_LOCAL',true,(await snap(guest)).localOnly);
 check('PERSONAL_COLOR_NOT_SHARED',false,(await snap(admin)).localOnly);
 await admin.type('#search','phong');check('SEARCH_NO_ACCENTS',3,(await snap(admin)).count);
 await admin.click('#drilldown');check('DRILLDOWN_COUNTS_MATCH',3,await admin.eval('document.querySelectorAll("#popup-rows .popup-row").length'));
 check('NO_DATA_WRITE_FROM_LAYOUT',0,(await snap(admin)).dataWrites);
 const popupBefore=(await snap(admin)).layoutWrites;
 await admin.eval('(()=>{const el=document.querySelector("#popup-width");el.value="520";el.dispatchEvent(new Event("input",{bubbles:true}))})()');
 check('POPUP_PREVIEW_NO_SAVE',popupBefore,(await snap(admin)).layoutWrites);
 await admin.eval('document.querySelector("#popup-width").dispatchEvent(new Event("change",{bubbles:true}))');
 check('POPUP_SAVE_AFTER_CHANGE',popupBefore+1,(await snap(admin)).layoutWrites);
 check('POPUP_VIEWPORT_CLAMP',true,await admin.eval('document.querySelector("#dialog").getBoundingClientRect().width <= innerWidth'));
 await admin.click('#close-modal');await admin.click('#open-dropdown');
 check('DROPDOWN_OPEN',true,(await snap(admin)).drawerOpen);await admin.key('Escape');check('ESC_DISMISSES_DROPDOWN',false,(await snap(admin)).drawerOpen);
 for(const [width,height] of [[1920,1080],[2560,1440],[900,760],[390,844]]){
  await admin.viewport(width,height);await admin.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const geometry=await admin.eval('(()=>({bodyOverflow:document.body.scrollWidth>innerWidth,scrollable:document.querySelector("#scroll").scrollWidth>document.querySelector("#scroll").clientWidth,reduce:matchMedia("(prefers-reduced-motion: reduce)").matches,tableRows:document.querySelectorAll("#body tr").length}))()');
  check('VIEWPORT_'+width,{bodyOverflow:false,reduce:true,tableRows:3}, {bodyOverflow:geometry.bodyOverflow,reduce:geometry.reduce,tableRows:geometry.tableRows});
  if(width===390){check('CROSS_COLUMN_SCROLL_NARROW',true,geometry.scrollable);
   await admin.eval('document.querySelector("#scroll").scrollLeft=350');check('SCROLL_CAN_MOVE',true,await admin.eval('document.querySelector("#scroll").scrollLeft>0'));
   await admin.click('#drilldown');check('POPUP_MOBILE_CLAMP',true,await admin.eval('document.querySelector("#dialog").getBoundingClientRect().width <= innerWidth-4'));
   await admin.click('#close-modal');}
  await admin.screenshot('fixture-admin-'+width);
 }
 await guest.viewport(390,844);await guest.screenshot('fixture-guest-390');await staff.viewport(900,760);await staff.screenshot('fixture-staff-900');
 check('GUEST_CAN_SEE_SHARED_NAME',true,(await snap(guest)).layout.title.includes('G09'));
 check('GUEST_NO_LAYOUT_CONTROL_AFTER_BROADCAST',true,await guest.eval('document.querySelector("#edit-layout").hidden'));
 check('STAFF_ZERO_BUSINESS_WRITES',0,(await snap(staff)).dataWrites);
 try{const result=await admin.send('Page.printToPDF',{printBackground:true,paperWidth:8.27,paperHeight:11.69});
 const pdf=Buffer.from(result.data||'', 'base64');check('A4_BROWSER_PDF_CAPABILITY',true,pdf.subarray(0,4).toString()==='%PDF');}
 catch(e){notRun('A4_BROWSER_PDF_CAPABILITY','Chrome policy may disable printing: '+String(e));}
 notRun('G09_REAL_APP_EMULATOR_CAS','No real Auth/RTDB emulator fixture in isolated G09 scope');
}
async function compactCases(debugPort,base){
 const admin=await connected(debugPort,base+'/compact-qa.html?full=1&preview-role=admin',true);
 await admin.wait('!!document.querySelector(".item-data-table")','REAL ItemList render');
 check('COMPACT_BASE_ITEM_ROWS',true,await admin.eval('document.querySelectorAll(".item-data-table tbody tr").length > 0'));
 check('COMPACT_BASE_ROLE_ADMIN','admin',await admin.eval('document.querySelector("[data-preview]")?.dataset.role'));
 check('COMPACT_BASE_FOUR_SUMMARY_CARDS',true,await admin.eval('!!document.querySelector(".item-summary-grid")'));
 await admin.screenshot('compact-admin-1920');
 const guest=await connected(debugPort,base+'/compact-qa.html?full=1&preview-role=guest');
 await guest.wait('!!document.querySelector(".item-data-table")','REAL ItemList guest');
 check('COMPACT_GUEST_READ_ONLY',true,await guest.eval('document.querySelectorAll(".editable-cell").length===0'));
 await guest.screenshot('compact-guest-1920');
 const popup=await connected(debugPort,base+'/compact-qa.html?popup=1');
 await popup.wait('!!document.querySelector(".report-detail-grid")','REAL ReportDetailGrid');
 check('COMPACT_BASE_POPUP_ROWS',true,await popup.eval('document.querySelectorAll(".report-detail-grid tbody tr").length>0'));
 await popup.screenshot('compact-popup-1920');
 notRun('COMPACT_REAL_FIREBASE_PERMISSION','Standalone compact QA mounts components with RAM data and fake role, not backend permissions');
 notRun('COMPACT_REAL_REPORT_DRILLDOWN','CompactQa fixture does not mount the full App overview or data-backed report drilldown');
}
try{
 if(!['contract','fixture','compact'].includes(mode))throw Error('Use --mode=contract, --mode=fixture or --mode=compact');
 if(mode==='contract'){
  check('FIXTURE_HAS_ADMIN_AND_ROLES',true,FIXTURE_HTML.includes("role!=='admin'")&&FIXTURE_HTML.includes('role=') );
  check('FIXTURE_HAS_FAKE_WRITER',true,FIXTURE_HTML.includes("localStorage.setItem(key")&&FIXTURE_HTML.includes('layoutWrites++'));
  check('FIXTURE_HAS_MULTI_TAB',true,FIXTURE_HTML.includes('new BroadcastChannel'));
  check('FIXTURE_HAS_KEYBOARD_AND_POINTER',true,FIXTURE_HTML.includes('onpointerup')&&FIXTURE_HTML.includes('onkeydown'));
  check('FIXTURE_NO_FIREBASE_SDK',false,/firebase\/database|https?:\/\/[^\s"']*(?:firebase|googleapis)/i.test(FIXTURE_HTML));
  check('FIXTURE_HAS_A11Y',true,FIXTURE_HTML.includes('aria-modal=')&&FIXTURE_HTML.includes('aria-label='));
  check('FIXTURE_STATUS_PALETTE_LOCAL',true,FIXTURE_HTML.includes("localStorage.setItem('g09:personal-palette:'+role"));
  notRun('REAL_BROWSER_EXERCISE','Use --mode=fixture in Chrome with localhost allowed; contracts do not exercise UI');
 }else if(mode==='compact'&&!existsSync(join(root,'compact-qa.html'))){notRun('COMPACT_BUILD_MISSING',`Build first with npm run build:compact:qa, missing ${root}`);
  console.log('G09_NOT_RUN_COMPACT_BUILD_MISSING');process.exitCode=2;
 }else{
  await new Promise(ok=>server.listen(0,'127.0.0.1',ok));serverStarted=true;
  const binary=process.env.CHROME_PATH||['chromium','google-chrome','google-chrome-stable','chromium-browser']
    .find(x=>spawnSync('which',[x],{encoding:'utf8'}).status===0);
  if(!binary){notRun('CHROMIUM_BINARY_MISSING','Install Chromium/Chrome and set CHROME_PATH');process.exitCode=2;}
  else{
   profile=mkdtempSync(join(tmpdir(),'hdnd-g09-'));const debugPort=await portOnce();
   chromeProcess=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run','--no-default-browser-check',
    '--disable-background-networking','--disable-extensions','--disable-sync','--disable-features=Translate,MediaRouter',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'about:blank'],
    {stdio:'ignore'});
   const target=await poll(async()=>{const r=await fetch('http://127.0.0.1:'+debugPort+'/json/version');return r.ok},'Chrome CDP start');
   assert(target);report.environment.chrome=binary;
   const base='http://127.0.0.1:'+server.address().port;
   mode==='fixture'?await fixtureCases(debugPort,base):await compactCases(debugPort,base);
   for(const page of pages){report.externalRequests.push(...page.requests.filter(url=>{
    try{const parsed=new URL(url);return ['http:','https:'].includes(parsed.protocol)&&!['127.0.0.1','localhost'].includes(parsed.hostname)}catch{return false}}));report.browserErrors.push(...page.errors)}
   check('NO_EXTERNAL_NETWORK_REQUESTS',0,report.externalRequests.length);
   check('NO_BROWSER_ERRORS',0,report.browserErrors.length);
  }
 }
}catch(e){const detail=String(e.stack||e);if(detail.includes('CHROME_POLICY_BLOCKED_URL')){notRun('LOCALHOST_CHROME_BLOCKED','Chrome enterprise URLBlocklist blocked 127.0.0.1; rerun in normal Chrome/CI');process.exitCode=2;}else{console.error('G09_QA_FAIL '+detail);report.fatal=detail;process.exitCode=1;}}
finally{for(const page of pages)page.close();chromeProcess?.kill('SIGTERM');if(serverStarted)await new Promise(ok=>server.close(ok));
 if(profile)rmSync(profile,{recursive:true,force:true,maxRetries:3,retryDelay:100});
 flush();console.log('G09_QA_SUMMARY '+JSON.stringify({mode,codeSha,counts:report.counts,report:join(out,'results.json'),exitCode:process.exitCode||0}));}