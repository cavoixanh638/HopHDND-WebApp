// UI V5 / L3: independent REAL Chrome geometry acceptance, synthetic QA only.
// Runs against fixed source build on 127.0.0.1; does not deploy or call Firebase.
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
    if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('404');
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
if(!chrome)throw Error('V5 L3 requires real Chrome');
const profile=mkdtempSync(join(tmpdir(),'pr95-v5-l3-'));
let browser,ws,seq=0;
const pending=new Map(),network=[];
const send=(method,params={})=>new Promise((ok,bad)=>{
  const id=++seq;pending.set(id,{ok,bad});
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);bad(Error('CDP timeout '+method));}},16000);
});
const js=async expression=>{
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error('Browser evaluation '+JSON.stringify(r.exceptionDetails));
  return r.result?.value;
};
const assert=(ok,label)=>{if(!ok)throw Error('UI_V5_L3_FAIL '+label);};
const until=async (expr,label)=>{
  for(let n=0;n<100;n++){try{if(await js('Boolean('+expr+')'))return;}catch{}
    await sleep(100);}
  throw Error('Timeout '+label);
};
const call=s=>js('(()=>{'+s+';return true})()');
const screenshot=async name=>{
  const r=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const bytes=Buffer.from(r.data,'base64');
  assert(bytes.length>8000,'bad image '+name);
  writeFileSync(name,bytes);
  console.log('UI_V5_L3_SCREENSHOT '+name+' '+bytes.length);
};
const mouseClick=async selector=>{
  const r=await js('(()=>{const el=document.querySelector('+JSON.stringify(selector)+
    ');if(!el)throw Error("Missing control");el.scrollIntoView({block:"center",inline:"nearest"});return el.getBoundingClientRect().toJSON()})()');
  await sleep(140);
  const x=r.left+r.width/2,y=r.top+r.height/2;
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',x,y,clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',x,y,clickCount:1});
};
const nav=t=>call('const b=[...document.querySelectorAll(".pr95-preview-nav button")].find(b=>b.textContent.includes('+JSON.stringify(t)+'));if(!b)throw Error("Nav missing");b.click()');
const audit=()=>js('('+function geometryV5(){
  const dialog=document.querySelector('dialog.report-grid-modal[open]');
  const scope=dialog||document.querySelector('.item-data-table');
  if(!scope)return {error:'no scope'};
  const rows=[...scope.querySelectorAll('.compact-stage-row')];
  const visible=rows.filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight;});
  const collect=(row)=>{
    const label=row.querySelector('.compact-stage-title'),state=row.querySelector('.compact-stage-state');
    const button=state?.querySelector('button.cell-picker-trigger');
    const level=row.querySelector('.compact-stage-level');
    const firstRect=e=>{
      if(!e)return null;
      const walker=document.createTreeWalker(e,NodeFilter.SHOW_TEXT);
      while(walker.nextNode()){
        const n=walker.currentNode;
        if(!n.textContent?.trim())continue;
        const range=document.createRange();
        range.selectNodeContents(n);
        const r=range.getClientRects()[0];
        if(r&&r.width>0)return r.toJSON();
      }
      return null;
    };
    const l=firstRect(label),v=firstRect(button?.querySelector('.cell-picker-value-text')||state);
    const lineHeight=e=>parseFloat(getComputedStyle(e).lineHeight);
    const lr=l?l.top+Math.min(l.height,lineHeight(label||row))*.78:null;
    const vr=v?v.top+Math.min(v.height,lineHeight(button||state||row))*.78:null;
    const cr=button?.getBoundingClientRect();
    const css=button?getComputedStyle(button):null;
    const rail=button?getComputedStyle(button,'::before'):null;
    return {field:row.dataset.stageField,title:label?.textContent.trim(),
      level:level?.textContent.trim(),nowrap:label?getComputedStyle(label).whiteSpace:null,
      rowBorder:getComputedStyle(row).borderTopWidth,
      oneStageBorder:getComputedStyle(state).borderTopWidth==='0px',
      baselines:l&&v?{label:lr,state:vr,delta:Math.abs(lr-vr)}:null,
      editable:!!button,buttonBorder:css?.borderTopWidth,buttonRadius:css?.borderTopLeftRadius,
      railRadius:rail?.borderTopRightRadius,hitHeight:cr?.height,caretRight:cr?.right,
      firstValue:v?.top,labelTop:l?.top};
  };
  const frame=scope.querySelector('.compact-stages');
  const docs=[...scope.querySelectorAll('.compact-document-badge[data-kind="QPPL"]')];
  const classification=docs.map(el=>{
    const b=el.querySelector('button.cell-picker-trigger,input.custom-cell-input');
    const c=getComputedStyle(el),bc=b&&getComputedStyle(b);
    return {outerBorder:c.borderTopWidth,hasEditor:!!b,editorTag:b?.tagName,
      editorBorder:bc?.borderTopWidth,editorBackground:bc?.backgroundColor,
      originalText:el.textContent.trim()};
  });
  const stageRows=visible.slice(0,9).map(collect);
  return {count:visible.length,stageRows,classification,
    stageScroll:frame?{width:frame.clientWidth,scrollWidth:frame.scrollWidth,overflow:getComputedStyle(frame).overflowX}:null,
    wholePageWidth:document.documentElement.scrollWidth,viewport:innerWidth,dialog:!!dialog};
}.toString()+')()');
const verify=async stage=>{
  await sleep(180);
  const x=await audit();
  assert(!x.error&&x.count>=3,stage+' stage list exists '+JSON.stringify(x));
  const first=x.stageRows.slice(0,3);
  for(const r of first){
    assert(r.rowBorder==='1px'&&r.oneStageBorder,stage+' single outer stage frame '+JSON.stringify(r));
    assert(r.baselines&&r.baselines.delta<=5,stage+' first text line alignment '+JSON.stringify(r));
    assert(r.nowrap==='nowrap',stage+' nowrap label '+JSON.stringify(r));
    if(r.editable){
      assert(r.buttonBorder==='0px',stage+' no inner border');
      assert(r.buttonRadius==='7px'&&r.railRadius==='7px',stage+' rounded value and rail '+JSON.stringify(r));
      assert(r.hitHeight>=38,stage+' clickable height');
    }
  }
  for(const c of x.classification){
    assert(c.outerBorder==='1px',stage+' QPPL one outer border');
    if(c.hasEditor)assert(c.editorBorder==='0px'&&
      (c.editorBackground==='rgba(0, 0, 0, 0)'||c.editorBackground==='transparent'),
      stage+' QPPL no second button frame '+JSON.stringify(c));
  }
  // Each record can have a longer Party-level title than the preceding
  // record. Measure EVERY visible 3-stage group; checking only row 1 misses
  // the BTV TU caret drift observed in the initial Chrome run.
  const groups=[];let group=[];
  for(const row of x.stageRows){
    if(row.field==='progressParty'&&group.length){groups.push(group);group=[];}
    group.push(row);
  }
  if(group.length)groups.push(group);
  const caretSpreads=[];
  for(const rows of groups){
    const buttons=rows.filter(r=>r.editable);
    if(buttons.length>1){
      const dif=Math.max(...buttons.map(r=>r.caretRight))-
        Math.min(...buttons.map(r=>r.caretRight));
      caretSpreads.push(dif);
      assert(dif<=2,stage+' each record fixed caret right edge: '+dif+' '+JSON.stringify(rows));
    }
  }
  console.log('UI_V5_L3_CARET_GROUPS '+stage+' '+JSON.stringify(caretSpreads));
  assert(x.wholePageWidth<=x.viewport+3,stage+' no page-level horizontal overflow');
  console.log('UI_V5_L3_RECT_PASS '+stage+' '+JSON.stringify(x));
  return x;
};
try{
  const probe=createServer();await new Promise(ok=>probe.listen(0,'127.0.0.1',ok));
  const debug=probe.address().port;await new Promise(ok=>probe.close(ok));
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--remote-allow-origins=*',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debug,
    '--user-data-dir='+profile,'about:blank'],{stdio:['ignore','ignore','pipe'],
      env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
  let tab;
  for(let i=0;i<100;i++){
    try{const response=await fetch('http://127.0.0.1:'+debug+'/json/list',{signal:AbortSignal.timeout(850)});
      tab=(await response.json()).find(x=>x.type==='page');if(tab)break;}catch{}
    await sleep(100);
  }
  assert(tab,'Chrome CDP unavailable');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
  ws.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.method==='Network.requestWillBeSent')network.push(m.params.request.url);
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);
      m.error?p.bad(Error(JSON.stringify(m.error))):p.ok(m.result);}
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:920,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1'});
  await until('document.querySelector("[data-preview=pr95-l4-full]")&&document.querySelector(".compact-stages")','List guest');
  await verify('list-1440-guest-readonly');
  await screenshot('pr95-v5-l3-list-1440-guest.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:850,deviceScaleFactor:1,mobile:false});
  await verify('list-1280-guest-readonly');
  await screenshot('pr95-v5-l3-list-1280-guest.png');
  // This temporary DOM style is only a geometry probe; no saved layout write.
  const narrowed=await js('(()=>{const e=document.querySelector(".item-data-table .compact-stages");e.style.width="190px";return {client:e.clientWidth,scroll:e.scrollWidth}})()');
  assert(narrowed.client<=192&&narrowed.scroll>=310,'narrow column uses internal scroll '+JSON.stringify(narrowed));
  await verify('list-saved-narrow-simulated');
  await screenshot('pr95-v5-l3-list-narrow-scroll.png');
  await call('document.querySelector(".item-data-table .compact-stages").style.removeProperty("width")');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await call('document.querySelector(".item-data-table .compact-stages").scrollIntoView({block:"center",inline:"nearest"})');
  await verify('list-390-guest-readonly');
  await screenshot('pr95-v5-l3-list-390-guest.png');
  await nav('Báo cáo tổng hợp');
  await until('document.querySelector(".report-surface[data-ui-reference-report=party]")','Reports');
  await mouseClick('.report-surface[data-ui-reference-report=party] button.count-drill:not([disabled])');
  await until('document.querySelector("dialog.report-grid-modal[open] .compact-stages")','popup guest');
  await verify('popup-390-guest-readonly');
  await screenshot('pr95-v5-l3-popup-390-guest.png');
  await call('document.querySelector("dialog.report-grid-modal .modal-header button").click()');
  await until('!document.querySelector("dialog.report-grid-modal[open]")','popup closed');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:920,deviceScaleFactor:1,mobile:false});
  await call('document.querySelector(".pr95-preview-gear").click()');
  await call('[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(b=>b.textContent.includes("Đăng nhập quản trị")).click()');
  await until('document.querySelector("[data-role=admin]")','admin');
  await nav('Báo cáo tổng hợp');
  await until('document.querySelector(".report-surface[data-ui-reference-report=party]")','admin Reports');
  await mouseClick('.report-surface[data-ui-reference-report=party] button.count-drill:not([disabled])');
  await until('document.querySelector("dialog.report-grid-modal[open] .compact-stages")','admin popup');
  await call('const b=[...document.querySelectorAll("dialog.report-grid-modal button")].find(e=>e.textContent.trim()==="Chỉnh sửa nháp");if(!b)throw Error("draft button unavailable");b.click()');
  await until('document.querySelector("dialog.report-grid-modal .compact-stage-state[data-editable=true] button.cell-picker-trigger")','popup editor');
  await verify('popup-1440-admin-editable');
  await screenshot('pr95-v5-l3-popup-1440-admin.png');
  await call('document.querySelector("dialog.report-grid-modal .modal-header button").click()');
  await until('!document.querySelector("dialog.report-grid-modal[open]")','admin popup closed');
  await nav('Danh sách');
  await until('document.querySelector(".item-data-table .compact-document-badge")',
    'admin List type badge');
  const adminTypeProbe=await js('(()=>{const root=document.querySelector("[data-preview=pr95-l4-full]");'+
    'const badges=[...document.querySelectorAll(".item-data-table .compact-document-badge")];'+
    'return {role:root?.dataset.role,count:badges.length,'+
    'examples:badges.slice(0,3).map(e=>e.outerHTML.slice(0,650))};})()');
  console.log('UI_V5_L3_ADMIN_TYPE_PROBE '+JSON.stringify(adminTypeProbe));
  await screenshot('pr95-v5-l3-admin-type-probe.png');
  await until('document.querySelector(".item-data-table .compact-document-badge[data-kind=QPPL] :is(button.cell-picker-trigger,input.custom-cell-input)")',
    'admin List real QPPL editor');
  await call('document.querySelector(".item-data-table .compact-stages").scrollIntoView({block:"center",inline:"nearest"})');
  const editableList=await verify('list-1440-admin-editable');
  assert(editableList.classification.some(x=>x.hasEditor&&x.editorTag==='BUTTON'&&x.outerBorder==='1px'&&x.editorBorder==='0px'),
    'admin QPPL classification single border on actual nested CellPicker');
  await screenshot('pr95-v5-l3-list-1440-admin.png');
  // Presentation-only color test: temporary CSS variables and a member highlight.
  // No edit callback, source mutation, layout setting or account write.
  const skin=await js('(()=>{const root=document.querySelector(".pr95-full-preview");'+
    'root.style.setProperty("--hdnd-stage-office-bg","#E7F3FF");'+
    'root.style.setProperty("--hdnd-stage-office-border","#94A8C9");'+
    'const member=document.querySelector(".item-data-table .compact-stage-state[data-editable=true]");'+
    'member.dataset.highlighted="true";'+
    'member.style.setProperty("--member-highlight-bg","#FFF1AC");'+
    'member.style.setProperty("--member-highlight-text","#714A12");'+
    'const doc=document.querySelector(".item-data-table .compact-document-badge[data-kind=QPPL]");'+
    'doc.dataset.highlighted="true";'+
    'doc.style.setProperty("--member-highlight-bg","#FFF1AC");'+
    'doc.style.setProperty("--member-highlight-text","#714A12");'+
    'return {memberBackground:getComputedStyle(member).backgroundColor,'+
    'docBackground:getComputedStyle(doc).backgroundColor,'+
    'docButtonBorder:getComputedStyle(doc.querySelector("button.cell-picker-trigger")).borderTopWidth,'+
    'docButtonBackground:getComputedStyle(doc.querySelector("button.cell-picker-trigger")).backgroundColor};})()');
  assert(skin.memberBackground==='rgb(255, 241, 172)'&&
    skin.docBackground==='rgb(255, 241, 172)'&&
    skin.docButtonBorder==='0px'&&skin.docButtonBackground==='rgba(0, 0, 0, 0)',
    'custom highlight must stay on member with one classification frame '+JSON.stringify(skin));
  await verify('list-1440-admin-custom-palette-highlight');
  await screenshot('pr95-v5-l3-list-admin-highlight.png');
  const cloud=network.filter(s=>/firebaseio|firebasedatabase|identitytoolkit|securetoken|docs\.google\.com\/spreadsheets/i.test(s));
  assert(cloud.length===0,'unexpected production/cloud request '+JSON.stringify(cloud));
  console.log('UI_V5_L3_REAL_CHROME_PASS '+JSON.stringify({synthetic:true,main:true,popup:true,narrow:true,
    guest:true,admin:true,noProductionRequests:true}));
}catch(e){
  console.error('UI_V5_L3_REAL_CHROME_FAIL',e);
  try{if(ws?.readyState===WebSocket.OPEN)await screenshot('pr95-v5-l3-failure.png');}catch{}
  process.exitCode=1;
}finally{
  try{ws?.close();}catch{}
  try{browser?.kill('SIGKILL');}catch{}
  server.close();rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:120});
}
