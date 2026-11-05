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
// Exercise an actual pointer hit on the target rather than dispatching a
// synthetic event while Chrome's real cursor is still over a different node.
const hover=async selector=>{
  const rect=await js('(()=>{const x=document.querySelector('+JSON.stringify(selector)+
    ');if(!x)throw Error("Missing "+'+JSON.stringify(selector)+
    ');x.scrollIntoView({block:"center",inline:"nearest"});return x.getBoundingClientRect().toJSON()})()');
  await sleep(130);
  const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
};
const all=()=>js('[...document.querySelectorAll("[data-ui-ref-code]")].map(x=>({code:x.dataset.uiRefCode,hidden:x.hidden,rect:x.getBoundingClientRect().toJSON()}))');
const noRef=()=>js('!document.querySelector("[data-ui-reference-layer], [data-ui-ref-code]")');

// Independent R-V4-01 visual acceptance: count only ACTUALLY PAINTED markers.
// Probe the glyph ranges and every visible clickable/arrow control under the
// current dialog/main UI. A tag in the DOM with hidden=true is NOT a visible tag.
const referenceVisualAudit=()=>js('('+function auditReferenceBadgeOcclusion(){
  const dialog=document.querySelector('dialog.report-grid-modal[open]');
  const root=dialog||document.querySelector('[data-preview="pr95-l4-full"]');
  if(!root)throw Error('visual audit root missing');
  const overlay=[...document.querySelectorAll('[data-ui-ref-code],[data-ui-reference-hover]')];
  const printed=overlay.filter(el=>{
    const cs=getComputedStyle(el),r=el.getBoundingClientRect();
    return !el.hidden&&cs.display!=='none'&&cs.visibility==='visible'&&
      r.width>0&&r.height>0&&r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&
      (dialog?dialog.contains(el):!el.closest('dialog'));
  });
  const hidden=overlay.filter(el=>el.matches('[data-ui-ref-code]')&&!printed.includes(el))
    .map(el=>({code:el.dataset.uiRefCode,reason:el.dataset.uiRefPlacement||'clipped'}));
  const clip=(rect,element)=>{
    let left=Math.max(0,rect.left),right=Math.min(innerWidth,rect.right);
    let top=Math.max(0,rect.top),bottom=Math.min(innerHeight,rect.bottom);
    for(let a=element.parentElement;a;a=a.parentElement){
      const style=getComputedStyle(a);
      if(/auto|scroll|hidden|clip/.test(style.overflowX+' '+style.overflowY)){
        const r=a.getBoundingClientRect();
        left=Math.max(left,r.left);right=Math.min(right,r.right);
        top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);
      }
      if(a===root)break;
    }
    return right>left&&bottom>top?{left,right,top,bottom}:null;
  };
  const content=[];
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const range=document.createRange();
  while(walker.nextNode()){
    const node=walker.currentNode,p=node.parentElement;
    if(!node.textContent?.trim()||!p||p.closest('[data-ui-reference-layer],script,style,[hidden],[aria-hidden="true"]'))continue;
    const style=getComputedStyle(p);
    if(style.display==='none'||style.visibility!=='visible'||Number(style.opacity)===0)continue;
    range.selectNodeContents(node);
    for(const r of range.getClientRects()){
      const clipped=clip(r,p);
      if(clipped)content.push({rect:clipped,type:'text',snippet:node.textContent.trim().slice(0,24)});
    }
  }
  for(const el of root.querySelectorAll('button,input,select,textarea,summary,svg,[role="button"],[role="combobox"],[class*="caret"],[class*="chevron"]')){
    if(el.closest('[data-ui-reference-layer],[hidden],[aria-hidden="true"]'))continue;
    const cs=getComputedStyle(el);
    if(cs.display==='none'||cs.visibility!=='visible'||Number(cs.opacity)===0)continue;
    const clipped=clip(el.getBoundingClientRect(),el);
    if(clipped)content.push({rect:clipped,type:'control',snippet:(el.className?.baseVal||el.className||el.tagName).toString().slice(0,32)});
  }
  const intersects=(a,b)=>a.left<b.right-.4&&a.right>b.left+.4&&
    a.top<b.bottom-.4&&a.bottom>b.top+.4;
  const failures=[];
  for(const tag of printed){
    const rect=tag.getBoundingClientRect();
    const box={left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom};
    for(const obj of content){
      if(intersects(box,obj.rect)){
        failures.push({code:tag.dataset.uiRefCode||'HOVER',type:obj.type,
          content:obj.snippet,x:Math.round(rect.left),y:Math.round(rect.top)});
        if(failures.length>=12)break;
      }
    }
    if(failures.length>=12)break;
  }
  return {mode:dialog?'popup':'main',visible:printed.map(el=>el.dataset.uiRefCode||'HOVER'),
    visibleCount:printed.length,hidden,hiddenCount:hidden.length,failures};
}.toString()+')()');
const verifyNoOcclusion=async stage=>{
  await sleep(240);
  const result=await referenceVisualAudit();
  assert(!result.failures.length,'R-V4-01 visual overlap in '+stage+' '+JSON.stringify(result.failures));
  console.log('R_V4_01_VISUAL_OCCLUSION_FREE '+stage+' '+JSON.stringify({
    visibleCount:result.visibleCount,visible:result.visible,
    suppressedCount:result.hiddenCount,suppressed:result.hidden
  }));
  return result;
};

const layerOk=()=>js('(()=>{const layer=document.querySelector("[data-ui-reference-layer]");return !!layer&&getComputedStyle(layer).pointerEvents==="none"&&[...layer.querySelectorAll("*")].every(node=>node.matches(".ui-reference-copy")?getComputedStyle(node).pointerEvents==="auto":getComputedStyle(node).pointerEvents==="none")})()');
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
  await until('document.querySelector("[data-ui-reference-active=true]")&&document.querySelector("[data-ui-reference-layer]")',
    'enabled admin reference inspection');
  assert(await layerOk(),'overlay must be inert except explicit copy button');
  assert((await all()).length===0,'no permanent markers may be painted without hover');
  assert(await js('document.querySelector(".item-data-table").textContent')===before,
    'reference mode changed table text');
  await hover('.item-data-table th[data-column-key=note] .column-heading-label');
  await until(`document.querySelector('[data-ui-ref-code="L06.TITLE"]')`,'note hovered reference');
  let badgeList=await all();
  assert(badgeList.length===1,'only one hover marker allowed');
  assert(badgeList[0].code==='L06.TITLE','note semantic title code retains L06');
  await screenshot('pr95-v4-l3-r-v4-01-desktop-list.png');
  await verifyNoOcclusion('desktop-list');
  await click('[data-summary-kind=qppl]');
  await until('document.querySelector("[data-summary-kind=qppl]").getAttribute("aria-pressed")==="true"',
    'click-through filter enabled');
  await click('[data-summary-kind=qppl]');
  await until('document.querySelector("[data-summary-kind=qppl]").getAttribute("aria-pressed")==="false"',
    'click-through filter restored');
  // Without the UI worker's record-id contract, an instance code must not
  // silently fall back to displayCode, STT or row index.
  const rowCode=await js('document.querySelector(".item-data-table tbody td[data-col-key=note]")?.closest("tr")?.getAttribute("data-ui-reference-record-id")??null');
  await hover('.item-data-table tbody td[data-col-key=note]');
  await sleep(150);
  if(!rowCode)assert(!await js('document.querySelector("[data-ui-ref-code]")?.dataset.uiRefCode?.startsWith("L06.1@")'),
    'missing record-id must suppress instance code');
  const horizontal=await js('(()=>{const e=document.querySelector(".item-table-scroll");e.scrollLeft=160;e.dispatchEvent(new Event("scroll"));return e.scrollLeft})()');
  assert(horizontal>0,'horizontal table scroll');
  await sleep(150);
  assert(await layerOk(),'scroll must leave copy the only actionable overlay control');
  const reordered=await js('(()=>{const t=document.querySelector(".item-data-table");const h=t.querySelector("th[data-column-key=note]");const before=[...t.querySelectorAll("thead th[data-column-key]")].map(x=>x.dataset.columnKey);h.focus();h.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowLeft",altKey:true,bubbles:true}));return before})()');
  assert(!!reordered,'note header required');
  await sleep(400);
  const order=await js('[...document.querySelectorAll(".item-data-table thead th[data-column-key]")].map(x=>x.dataset.columnKey)');
  assert(order.includes('note'),'reorder preserved note field');
  await hover('.item-data-table th[data-column-key=note] .column-heading-label');
  await until(`document.querySelector('[data-ui-ref-code="L06.TITLE"]')`,'note semantic code after reorder');
  await verifyNoOcclusion('desktop-reordered-list');
  console.log('REF_LIST_SEMANTIC_PASS '+JSON.stringify({before:reordered,after:order,scrollLeft:horizontal}));
  await nav('Báo cáo tổng hợp');
  await until('document.querySelectorAll(".report-surface[data-ui-reference-report]").length===5',
    'five ID-anchored real reports');
  for(const id of ['party','build','council','nq','bc']){
    const found=await js('!!document.querySelector(".report-surface[data-ui-reference-report='+id+']")');
    assert(found,'stable report registry '+id);
  }
  await hover('.report-surface[data-ui-reference-report=party] > .card-header');
  await until('document.querySelector(\'[data-ui-ref-code="R01.HEADER"]:not([hidden])\')','report header hover');
  await verifyNoOcclusion('desktop-reports');
  await screenshot('pr95-v4-l3-admin-reports.png');
  await click('.report-surface[data-ui-reference-report=party] button.count-drill:not([disabled])');
  await until('document.querySelector("dialog.report-grid-modal[open]")','actual popup opened');
  await until('document.querySelector("dialog.report-grid-modal [data-ui-reference-layer]")',
    'popup layer inside native dialog');
  assert(await layerOk(),'popup overlay layer must preserve pointer behavior');
  await hover('dialog.report-grid-modal .report-detail-grid tbody td[data-col-key]');
  await sleep(120);
  const popupCount=(await all()).filter(m=>!m.hidden).length;
  assert(popupCount<=1,'popup shows at most one reference marker');
  await verifyNoOcclusion('desktop-popup');
  await screenshot('pr95-v4-l3-r-v4-01-desktop-popup.png');
  const hoverPopup=await js('document.querySelector("[data-ui-reference-hover]")?.dataset.uiRefCode??""');
  await call('document.querySelector("dialog.report-grid-modal .modal-header button").click()');
  await until('!document.querySelector("dialog.report-grid-modal[open]")','popup closed');
  await until('!!document.querySelector("body > [data-ui-reference-layer]")','persistent body overlay after popup close');
  await hover('.report-surface[data-ui-reference-report=party] > .card-header');
  await until('document.querySelector("body > [data-ui-reference-layer] [data-ui-ref-code]")',
    'body overlay resumes after popup closes');
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
  await nav('Danh sách');
  await until('document.querySelector(".item-data-table tbody tr")','mobile actual List');
  await call('window.scrollTo(0,0)');
  await gear();await toggle();
  await until('document.querySelector("[data-ui-reference-layer]")','mobile admin overlay');
  assert(await js('!!document.querySelector(".item-data-table")'),'mobile list mounted');
  const mobile=await js('(()=>{const layer=document.querySelector("[data-ui-reference-layer]");return {width:innerWidth,hit:getComputedStyle(layer).pointerEvents}})()');
  assert(mobile.width===390&&mobile.hit==='none','mobile overlay responsive');
  await verifyNoOcclusion('mobile-list');
  await screenshot('pr95-v4-l3-r-v4-01-mobile-list.png');
  await screenshot('pr95-v4-l3-mobile-admin.png');
  await call('document.querySelector(".item-data-table").scrollIntoView({block:"center"})');
  await verifyNoOcclusion('mobile-list-table');
  await screenshot('pr95-v4-l3-r-v4-01-mobile-table.png');
  await nav('Báo cáo tổng hợp');
  await until('document.querySelector(".report-surface[data-ui-reference-report=party]")',
    'mobile real report before popup');
  await click('.report-surface[data-ui-reference-report=party] button.count-drill:not([disabled])');
  await until('document.querySelector("dialog.report-grid-modal[open]")','mobile popup opened');
  await verifyNoOcclusion('mobile-popup');
  await screenshot('pr95-v4-l3-r-v4-01-mobile-popup.png');
  const forbidden=network.filter(url=>/firebaseio|firebasedatabase|identitytoolkit|securetoken|docs\.google\.com\/spreadsheets/i.test(url));
  assert(!forbidden.length,'never contact cloud Firebase or Sheets '+JSON.stringify(forbidden));
  console.log('PR95_UI_V4_L3_REFERENCE_OVERLAY_CHROME_PASS '+JSON.stringify({
    roleGuards:true,defaultHidden:true,logoutCleanup:true,
    popupField:hoverPopup,realPopup:true,reorder:true,scroll:true,
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
