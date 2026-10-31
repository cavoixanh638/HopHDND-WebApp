// UI V4 L3 — full in-memory preview exercised by REAL headless Chrome.
// Loopback-only, no Firebase, Google, deployment or real record mutation.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,rmSync,statSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try{
    const name=new URL(req.url??'/','http://127.0.0.1').pathname;
    const file=resolve(root,'.'+(name==='/'?'/compact-qa.html':name));
    if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('Not found');
    res.writeHead(200,{'content-type':({'.js':'text/javascript','.html':'text/html',
      '.css':'text/css','.png':'image/png','.woff2':'font/woff2'}[extname(file)]??
      'application/octet-stream'),'cache-control':'no-store'});
    res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end('404');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('UI V4 L3 needs real Chrome');
const profile=mkdtempSync(join(tmpdir(),'pr95-v4-l3-'));
let browser,ws,seq=0;
const promises=new Map(),network=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq;promises.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(promises.has(id)){promises.delete(id);reject(Error('CDP timeout '+method));}},16000);
});
const js=async expression=>{
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('Chrome script exception '+JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};
const until=async(expression,label)=>{
  for(let i=0;i<110;i++){
    try{if(await js('Boolean('+expression+')'))return;}catch{}
    await sleep(110);
  }
  throw Error('Timeout '+label+': '+JSON.stringify(await js('document.body.innerText?.slice(0,1300)')));
};
const assert=(condition,message)=>{if(!condition)throw Error('PR95_V4_L3_ASSERTION '+message);};
const call=expression=>js('(()=>{'+expression+';return true})()');
const screenshot=async name=>{
  const result=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const bytes=Buffer.from(result.data,'base64');
  assert(bytes.length>8000&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a',
    'invalid screenshot '+name);
  writeFileSync(name,bytes);
  console.log('PR95_V4_L3_SCREENSHOT '+name+' '+bytes.length);
};
const click=async selector=>{
  const rect=await js('(()=>{const x=document.querySelector('+JSON.stringify(selector)+
    ');if(!x)throw Error("Missing "+'+JSON.stringify(selector)+');x.scrollIntoView({block:"center",inline:"nearest"});return x.getBoundingClientRect().toJSON()})()');
  await sleep(130);
  const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',x,y,clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x,y,clickCount:1});
};
const all=()=>js('[...document.querySelectorAll("[data-ui-ref-code]")].map(x=>({code:x.dataset.uiRefCode,hidden:x.hidden,rect:x.getBoundingClientRect().toJSON()}))');
const noRef=()=>js('!document.querySelector("[data-ui-reference-layer], [data-ui-ref-code]")');
const layerOk=()=>js('(()=>{const layer=document.querySelector("[data-ui-reference-layer]");return !!layer&&layer.getAttribute("aria-hidden")==="true"&&getComputedStyle(layer).pointerEvents==="none"&&[...layer.querySelectorAll("*")].every(node=>getComputedStyle(node).pointerEvents==="none")})()');
const nav=async title=>call('const b=[...document.querySelectorAll(".pr95-preview-nav button")].find(b=>b.textContent?.includes('+JSON.stringify(title)+'));if(!b)throw Error("no nav");b.click()');
const gear=()=>call('document.querySelector(".pr95-preview-gear").click()');
const toggle=()=>call('[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(b=>b.textContent.trim()==="Hiện mã khu vực").click()');
const login=()=>call('[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(b=>b.textContent.includes("Đăng nhập quản trị")).click()');
const logout=()=>call('[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(b=>b.textContent.includes("Đăng xuất mô phỏng")).click()');
try{
  const probe=createServer();await new Promise(ok=>probe.listen(0,'127.0.0.1',ok));
  const debug=probe.address().port;await new Promise(ok=>probe.close(ok));
  const chromeStderr=[];
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--remote-allow-origins=*',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debug,
    '--user-data-dir='+profile,'about:blank'],{
      stdio:['ignore','ignore','pipe'],env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
  browser.stderr.on('data',buf=>{if(chromeStderr.length<30)
    chromeStderr.push(String(buf).slice(0,450));});
  let tab;
  for(let i=0;i<100;i++){
    try{
      const response=await fetch('http://127.0.0.1:'+debug+'/json/list',{signal:AbortSignal.timeout(850)});
      tab=(await response.json()).find(x=>x.type==='page');
      if(tab)break;
    }catch{}
    await sleep(100);
  }
  assert(!!tab,'Chrome CDP unavailable: executable='+chrome+
    ' exit='+String(browser.exitCode)+' stderr='+JSON.stringify(chromeStderr.slice(-8)));
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Network.requestWillBeSent')network.push(message.params.request.url);
    if(message.id&&promises.has(message.id)){
      const entry=promises.get(message.id);promises.delete(message.id);
      message.error?entry.reject(Error(JSON.stringify(message.error))):entry.resolve(message.result);
    }
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:920,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1'});
  await until('document.querySelector("[data-preview=pr95-l4-full]")&&document.querySelector(".item-data-table tbody tr")',
    'full preview default guest List');
  assert(await noRef(),'default guest must have zero reference nodes');
  await gear();
  assert(await js('[...document.querySelectorAll(".pr95-preview-gear-menu button")].map(x=>x.textContent.trim()).join("|")')==='Đăng nhập quản trị (mô phỏng)',
    'guest gear contains only login');
  await screenshot('pr95-v4-l3-before-guest.png');
  await login();
  await until('document.querySelector("[data-role=admin]")','synthetic admin');
  await gear();
  assert(await js('[...document.querySelectorAll(".pr95-preview-gear-menu button")].some(b=>b.textContent.trim()==="Hiện mã khu vực"&&b.getAttribute("aria-pressed")==="false")'),
    'admin toggle defaults OFF');
  const before=await js('document.querySelector(".item-data-table").textContent');
  await toggle();
  await until('document.querySelector("[data-ui-reference-active=true]")&&document.querySelector("[data-ui-ref-code=A01]")',
    'visible admin reference overlay');
  assert(await layerOk(),'all badge/overlay hit areas MUST have pointer-events:none');
  const listMarkers=await all();
  for(const code of ['A01','A02','A03','B00','B01','B02','B03','C01','C02','C03','F01','F02','F03','F04','F05','L00','L01','L03','L05','L06']){
    assert(listMarkers.some(item=>item.code===code),'List semantic code missing '+code);
  }
  assert(await js('document.querySelector(".item-data-table").textContent')===before,
    'reference mode changed source/table text');
  const hit=await js('(()=>{const e=document.querySelector("[data-summary-kind=qppl]");const r=e.getBoundingClientRect();const x=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return !!x?.closest("[data-summary-kind=qppl]")})()');
  assert(hit,'overlay must not cover clickable chip');
  await screenshot('pr95-v4-l3-after-admin-list.png');
  await click('[data-summary-kind=qppl]');
  await until('document.querySelector("[data-summary-kind=qppl]").getAttribute("aria-pressed")==="true"',
    'click-through filter enabled');
  await click('[data-summary-kind=qppl]');
  await until('document.querySelector("[data-summary-kind=qppl]").getAttribute("aria-pressed")==="false"',
    'click-through filter restored');
  const hover=await js('(()=>{const el=document.querySelector(".item-data-table tbody tr:first-child [data-stage-field=progressBuild] .compact-stage-state");if(!el)return null;el.scrollIntoView({block:"center",inline:"nearest"});el.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,pointerId:1}));return document.querySelector(".item-data-table tbody tr:first-child td[data-col-key=displayCode] .code")?.textContent.trim()})()');
  assert(!!hover,'visible NQ/BC row id and compact stage required');
  await until('document.querySelector("[data-ui-reference-hover]")?.textContent?.includes("L03.2")',
    'hover field region');
  const hovered=await js('document.querySelector("[data-ui-reference-hover]").textContent');
  assert(hovered==='L03.2 · '+hover,'hover must use field key + displayed ID: '+hovered);
  const horizontal=await js('(()=>{const e=document.querySelector(".item-table-scroll");e.scrollLeft=160;e.dispatchEvent(new Event("scroll"));return e.scrollLeft})()');
  assert(horizontal>0,'horizontal table scroll available');
  await sleep(180);
  assert(await layerOk(),'scroll must not add pointer hitboxes');
  // Reorder a real header via its existing Alt+Arrow keyboard handler.
  const reordered=await js('(()=>{const t=document.querySelector(".item-data-table");const h=t.querySelector("th[data-column-key=note]");const before=[...t.querySelectorAll("thead th[data-column-key]")].map(x=>x.dataset.columnKey);if(!h)return null;h.focus();h.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowLeft",altKey:true,bubbles:true}));return before})()');
  assert(!!reordered,'Note column header required for reorder');
  await sleep(450);
  const order=await js('[...document.querySelectorAll(".item-data-table thead th[data-column-key]")].map(x=>x.dataset.columnKey)');
  assert(order.includes('note')&&order.includes('specificProgress'),'reorder preserved semantic column keys');
  assert((await all()).some(a=>a.code==='L06'),'note reference retains code after reorder');
  console.log('PR95_V4_L3_ADMIN_LIST_SCROLL_REORDER_PASS '+JSON.stringify({
    markers:listMarkers.length,hover:hovered,scrollLeft:horizontal,
    before:reordered,after:order,pointerEventsNone:true}));
  await nav('Báo cáo tổng hợp');
  await until('document.querySelectorAll(".report-surface[data-ui-reference-report]").length===5',
    'five ID-anchored real reports');
  // Markers are intentionally viewport-limited; scroll each report into
  // view rather than demanding an off-screen badge be rendered.
  await call('document.querySelector(\'.report-surface[data-ui-reference-report="party"] > .card-header\').scrollIntoView({block:"center"})');
  await until('document.querySelector("[data-ui-ref-code=R01]")','visible R01 semantic marker');
  for(const id of ['party','build','council','nq','bc'])
    assert(await js('document.querySelector(".report-surface[data-ui-reference-report='+id+']")!==null'),
      'report semantic id '+id);
  await call('document.querySelector(\'.report-surface[data-ui-reference-report="bc"] > .card-header\').scrollIntoView({block:"center"})');
  await until('document.querySelector("[data-ui-ref-code=R05]")','visible R05 after scroll');
  await call('document.querySelector(\'.report-surface[data-ui-reference-report="party"] > .card-header\').scrollIntoView({block:"center"})');
  await until('document.querySelector("[data-ui-ref-code=R01]")','R01 after return scroll');
  await screenshot('pr95-v4-l3-admin-reports.png');
  await click('.report-surface[data-ui-reference-report=party] button.count-drill:not([disabled])');
  await until('document.querySelector("dialog.report-grid-modal[open]")','actual popup opened');
  await until('document.querySelector("dialog.report-grid-modal [data-ui-ref-code=P00]")',
    'popup layer mounted inside top-level dialog');
  assert(await layerOk(),'popup overlay does not steal pointer/keyboard');
  const popup=await all();
  assert(popup.some(m=>m.code==='P00'),'P00 missing');
  await screenshot('pr95-v4-l3-admin-popup.png');
  const popupCell=await js('(()=>{const cell=document.querySelector("dialog.report-grid-modal .report-detail-grid tbody td[data-col-key]");if(!cell)return null;cell.dispatchEvent(new PointerEvent("pointermove",{bubbles:true,pointerId:1}));return cell.dataset.colKey})()');
  assert(!!popupCell,'real popup cell exists');
  await sleep(100);
  const hoverPopup=await js('document.querySelector("[data-ui-reference-hover]")?.textContent??""');
  assert(/^P(0[1-6]|03\.[123])(?: · .+)?$/.test(hoverPopup),
    'popup field code incorrect: '+hoverPopup);
  await call('document.querySelector("dialog.report-grid-modal .modal-header button").click()');
  await until('!document.querySelector("dialog.report-grid-modal[open]")','popup closed');
  await until('document.body > [data-ui-reference-layer]','overlay back in body');
  await gear();
  await toggle();
  await until('!document.querySelector("[data-ui-reference-layer]")','admin OFF cleanup');
  assert(await noRef(),'no leftover markers when toggle OFF');
  await screenshot('pr95-v4-l3-admin-off.png');
  await gear();await toggle();
  await until('document.querySelector("[data-ui-reference-layer]")','re-enabled overlay');
  await gear();await logout();
  await until('document.querySelector("[data-role=guest]")','admin logout');
  await until('!document.querySelector("[data-ui-reference-layer]")','logout hides markers');
  assert(await noRef(),'logout/guest leave no tag or layer');
  await gear();
  assert(!await js('[...document.querySelectorAll(".pr95-preview-gear-menu button")].some(b=>b.textContent.includes("mã khu vực"))'),
    'guest cannot see reference toggle');
  await screenshot('pr95-v4-l3-guest-after-logout.png');
  await login();await until('document.querySelector("[data-role=admin]")','login again');
  assert(await noRef(),'relogin must default off after logout');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await gear();await toggle();
  await until('document.querySelector("[data-ui-ref-code=A01]")','mobile viewport marker');
  const mobile=await js('(()=>{const layer=document.querySelector("[data-ui-reference-layer]");return {width:innerWidth,hit:getComputedStyle(layer).pointerEvents,tagCount:layer.querySelectorAll("[data-ui-ref-code]").length}})()');
  assert(mobile.width===390&&mobile.hit==='none'&&mobile.tagCount>=3,'mobile overlay responsive');
  await screenshot('pr95-v4-l3-mobile-admin.png');
  const forbidden=network.filter(url=>/firebaseio|firebasedatabase|identitytoolkit|securetoken|docs\.google\.com\/spreadsheets/i.test(url));
  assert(!forbidden.length,'never contact cloud Firebase or Sheets '+JSON.stringify(forbidden));
  console.log('PR95_UI_V4_L3_REFERENCE_OVERLAY_CHROME_PASS '+JSON.stringify({
    roleGuards:true,defaultHidden:true,logoutCleanup:true,codeCount:listMarkers.length,
    hover: hovered,popupField:hoverPopup,realPopup:true,reorder:true,scroll:true,
    clickThrough:true,rawTextUnchanged:true,mobile,source:'loopback synthetic full preview'
  }));
}catch(err){
  console.error('PR95_UI_V4_L3_REFERENCE_OVERLAY_FAIL',err);
  try{if(ws?.readyState===WebSocket.OPEN)await screenshot('pr95-v4-l3-failure.png');}catch{}
  process.exitCode=1;
}finally{
  try{ws?.close();}catch{}
  try{browser?.kill('SIGKILL');}catch{}
  server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:120});
}
