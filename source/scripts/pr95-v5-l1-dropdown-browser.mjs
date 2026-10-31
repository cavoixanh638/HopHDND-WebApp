// PR95 UI V5 L1: real Chromium verification of CURRENT synthetic demo records.
// The actual baseline ItemList, ReportTable and ReportDetailGrid are mounted.
// Only loopback + demo-only memory. No production Firebase, Sheets, publish/deploy.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try {
    const path=new URL(req.url??'/','http://127.0.0.1').pathname;
    const target=resolve(root,'.'+(path==='/'?'/compact-qa.html':path));
    if(!target.startsWith(root+'/')||!statSync(target).isFile())throw Error('404');
    res.writeHead(200,{'content-type':({
      '.html':'text/html','.js':'text/javascript','.css':'text/css',
      '.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'
    }[extname(target)]??'application/octet-stream'),'cache-control':'no-store'});
    res.end(readFileSync(target));
  }catch {res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const executable=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!executable)throw Error('PR95 V4 L4 requires real Chrome');
const profile=mkdtempSync(join(tmpdir(),'pr95-v5-l1-'));
let browser,ws,seq=0;
const pending=new Map();
const network=[];
const assert=(ok,description)=>{if(!ok)throw Error('PR95_V4_L4_ASSERT '+description);};
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq;pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){
    pending.delete(id);reject(Error('CDP timeout '+method));
  }},15000);
});
const evaluate=async expression=>{
  const response=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(response.exceptionDetails)throw Error('Chrome JS error: '+JSON.stringify(response.exceptionDetails));
  return response.result?.value;
};
const waitFor=async(expression,label)=>{
  for(let i=0;i<90;i++){
    try{if(await evaluate(expression))return;}catch{}
    await sleep(110);
  }
  throw Error('Chrome timeout '+label);
};
const screenshot=async name=>{
  await sleep(120);
  const result=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const bytes=Buffer.from(result.data,'base64');
  assert(bytes.length>1500&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a',
    'invalid screenshot '+name);
  writeFileSync(name,bytes);
  console.log('PR95_V4_L4_CHROME_IMAGE '+JSON.stringify({name,bytes:bytes.length}));
};
const checkTable=async(selector,label)=>{
  const state=await evaluate(`(()=>{
    const table=document.querySelector(${JSON.stringify(selector)});
    if(!table)return null;
    const source=table.querySelector('tbody')?.textContent??table.textContent??'';
    const legacy=['VP đang thực hiện','Ban Chấp hành','ĐU đã gửi TU',
      'Đã họp/xin phiếu','Đã trình HĐND, chưa có QĐ',
      'Không phải trình xây dựng NQ','Đã có QĐ chấp thuận'];
    return {rows:table.querySelectorAll('tbody tr').length,
      legacy:legacy.filter(value=>source.includes(value)),
      canonical:['VP đang xử lý','BCH','BTV TU','Đã trình, chờ QĐ',
        'ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL']
        .filter(value=>source.includes(value))};
  })()`);
  assert(!!state,label+' table not mounted');
  assert(state.rows>0,label+' empty table');
  assert(state.legacy.length===0,label+' still contains OLD DEMO values '+JSON.stringify(state));
  console.log('PR95_V4_L4_TABLE '+JSON.stringify({label,...state}));
  return state;
};
const clickText=async(selector,text)=>{
  const found=await evaluate(`(()=>{
    const target=[...document.querySelectorAll(${JSON.stringify(selector)})]
      .find(button=>button.textContent?.includes(${JSON.stringify(text)}));
    target?.click();return !!target;
  })()`);
  assert(found,'missing control '+selector+' '+text);
};

const actual=async(expr,scroll=false)=>{
  const point=await evaluate('(()=>{const e='+expr+';if(!e)return null;'+
    (scroll?"e.scrollIntoView({block:'center',inline:'nearest'});":'')+
    'const r=e.getBoundingClientRect();const x=r.left+r.width/2,y=r.top+r.height/2;'+
    'return {x,y,rect:{left:r.left,top:r.top,width:r.width,height:r.height},'+
    'hit:document.elementFromPoint(x,y)?.closest("button.cell-picker-trigger")===e};})()');
  assert(point&&point.rect.width>20&&point.rect.height>20&&point.hit,
    'real pointer target hidden/covered '+expr+' '+JSON.stringify(point));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:point.x,y:point.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x,y:point.y,button:'left',clickCount:1});
  return point;
};
const actualAt=async(x,y)=>{
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
};
const key=async(name,virtual)=>{
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:name,code:name,windowsVirtualKeyCode:virtual});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:name,code:name,windowsVirtualKeyCode:virtual});
};
const first=(part)=>'[...document.querySelectorAll(".item-data-table tbody tr:first-child button.cell-picker-trigger")].find(b=>b.getAttribute("aria-label")?.includes('+JSON.stringify(part)+'))';
const popupFirst=(part)=>'[...document.querySelectorAll(".report-detail-grid tbody tr:first-child button.cell-picker-trigger")].find(b=>b.getAttribute("aria-label")?.includes('+JSON.stringify(part)+'))';
const stage=(field)=>'document.querySelector(".item-data-table tbody tr:first-child .compact-stage-row[data-stage-field='+field+'] button.cell-picker-trigger")';
const openPop=async(term)=>{
  await waitFor('(()=>{const p=document.querySelector(".cell-picker-popover:popover-open");return !!p&&p.getAttribute("aria-label")?.includes('+JSON.stringify(term)+')&&document.querySelectorAll(".cell-picker-popover:popover-open").length===1;})()',
    'open target only '+term);
};
const geometry=async(expr,label)=>{
  // Native popover focus may scroll its source during the opening frame;
  // assert only after the placement scroll/ResizeObserver rAF has run.
  await sleep(150);
  const r=await evaluate('(()=>{const t='+expr+';const p=document.querySelector(".cell-picker-popover:popover-open");'+
    'if(!t||!p)return null;const a=t.getBoundingClientRect(),b=p.getBoundingClientRect();'+
    'const vv=visualViewport,top=vv?.offsetTop??0,h=vv?.height??innerHeight,left=vv?.offsetLeft??0,w=vv?.width??innerWidth;'+
    'const side=p.dataset.placement;const gap=side==="above"?a.top-b.bottom:b.top-a.bottom;'+
    'return {side,gap,anchor:{x:a.left,y:a.top,bottom:a.bottom,width:a.width},'+
    'menu:{x:b.left,y:b.top,bottom:b.bottom,height:b.height,scrollHeight:p.scrollHeight,clientHeight:p.clientHeight},'+
    'viewport:{top,height:h,left,width:w},count:p.querySelectorAll("[role=option]").length,'+
    'scrollable:p.scrollHeight>p.clientHeight+1,focused:p.contains(document.activeElement)};})()');
  assert(r&&r.gap>=3&&r.gap<=9&&r.menu.y>=r.viewport.top+6&&
    r.menu.bottom<=r.viewport.top+r.viewport.height-6,
    'menu must hug visible source '+label+' '+JSON.stringify(r));
  console.log('PR95_V5_L1_RECT '+label+' '+JSON.stringify(r));
  return r;
};
try {
  const probe=createServer();
  await new Promise(done=>probe.listen(0,'127.0.0.1',done));
  const debugPort=probe.address().port;
  await new Promise(done=>probe.close(done));
  browser=spawn(executable,[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debugPort,
    '--user-data-dir='+profile,'about:blank'
  ],{stdio:['ignore','ignore','pipe']});
  let chromeStderr='',chromeSpawnError='';
  browser.stderr.on('data',chunk=>{chromeStderr=(chromeStderr+String(chunk)).slice(-3000);});
  browser.on('error',error=>{chromeSpawnError=String(error);});
  let tab=null;
  for(let i=0;i<160;i++){
    try{
      const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list',
        {signal:AbortSignal.timeout(850)});
      tab=(await response.json()).find(item=>item.type==='page');
      if(tab)break;
    }catch{}
    if(browser.exitCode!==null)break;
    await sleep(150);
  }
  assert(!!tab,'Chrome debugger started '+JSON.stringify({
    command:executable,exitCode:browser.exitCode,spawnError:chromeSpawnError,
    stderr:chromeStderr.slice(-1800)}));
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{
    ws.addEventListener('open',done,{once:true});
    ws.addEventListener('error',fail,{once:true});
  });
  ws.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Network.requestWillBeSent')network.push(message.params.request.url);
    if(message.id&&pending.has(message.id)){
      const job=pending.get(message.id);pending.delete(message.id);
      message.error?job.reject(Error(JSON.stringify(message.error))):job.resolve(message.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?edit=1&review-staff=1'});
  await waitFor('document.querySelector(".item-data-table tbody tr:first-child .compact-stage-row[data-stage-field=progressBuild] button.cell-picker-trigger")',
    'baseline real editable List');
  const labels=await evaluate('(()=>[...document.querySelectorAll(".item-data-table tbody tr:first-child button.cell-picker-trigger")].map(b=>({label:b.getAttribute("aria-label"),col:b.closest("td")?.dataset.colKey,rect:(()=>{const r=b.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()})))()');
  console.log('PR95_V5_L1_VISIBLE_EDITORS '+JSON.stringify(labels));
  const leaders=labels.filter(x=>x.label?.includes('Lãnh đạo'));
  const departments=labels.filter(x=>x.label?.includes('Sở, ngành'));
  assert(leaders.length>0&&departments.length>0,'status / leader / department must use actual CellPicker '+JSON.stringify(labels));
  const leader=first('Lãnh đạo UBND'),dept=first('Sở, ngành');
  const progress=stage('progressBuild');
  // Set a common scroll position BEFORE opening A; switching must never
  // depend on re-playing a click or silently scrolling the target underneath.
  await evaluate('(()=>{const b='+leader+';b.scrollIntoView({block:"nearest",inline:"nearest"});})()');
  await actual(progress,true);
  await sleep(250);
  console.log('PR95_V5_L1_OPEN_DIAGNOSTIC '+JSON.stringify(await evaluate('(()=>{const b='+progress+';'+
    'const p=document.querySelector(".cell-picker-popover");return {button:{expanded:b?.getAttribute("aria-expanded"),'+
    'busy:b?.getAttribute("aria-busy"),disabled:b?.disabled,connected:b?.isConnected},'+
    'popover:!!p,shown:p?.matches(":popover-open"),label:p?.getAttribute("aria-label"),'+
    'focus:document.activeElement?.outerHTML?.slice(0,250),'+
    'notes:[...document.querySelectorAll(".cell-picker-feedback,.error-text")].map(x=>x.textContent.trim()),'+
    'table:document.querySelector(".item-table-scroll")?.getBoundingClientRect().toJSON()};})()')));
  await openPop('Tiến độ trình HĐND xây dựng NQ');
  const a=await geometry(progress,'main-status-before-handoff');
  await screenshot('pr95-v5-l1-main-status-open.png');
  await actual(leader);
  await openPop('Lãnh đạo UBND');
  const b=await geometry(leader,'main-one-pointer-status-to-leader');
  await screenshot('pr95-v5-l1-main-one-click-leader.png');
  await actual(dept);
  await openPop('Sở, ngành');
  const c=await geometry(dept,'main-one-pointer-leader-to-department');
  await screenshot('pr95-v5-l1-main-one-click-department.png');
  const noPatch=await evaluate('(()=>({patch:window.__l2LastPatch??null,dirty:!!document.querySelector(".item-data-table tr.dirty-row"),'+
    'open:document.querySelectorAll(".cell-picker-popover:popover-open").length}))()');
  assert(!noPatch.patch&&!noPatch.dirty&&noPatch.open===1,
    'pointer handoff must not choose/save A '+JSON.stringify(noPatch));
  console.log('PR95_V5_L1_REAL_POINTER_SINGLE_CLICK_HANDOFF_PASS '+JSON.stringify({a,b,c,noPatch}));

  // Click the same trigger to toggle closed; then ordinary outside pointer.
  await actual(dept);
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','second trigger click closes');
  await actual(progress);
  await openPop('Tiến độ trình HĐND xây dựng NQ');
  await actualAt(14,65);
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','outside click closes without patch');
  console.log('PR95_V5_L1_OUTSIDE_AND_SAME_TRIGGER_PASS');
  // Keyboard enters the selected (same-value) choice: no mutation.
  await actual(progress);
  await openPop('Tiến độ trình HĐND xây dựng NQ');
  const selected=await evaluate('document.querySelector(".cell-picker-popover:popover-open [role=option][aria-selected=true]")?.textContent?.trim()');
  assert(!!selected,'selected option must exist');
  await key('Enter',13);
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','Enter same value closes');
  assert(!await evaluate('window.__l2LastPatch'),'no-op Enter creates a patch');
  await actual(progress);
  await openPop('Tiến độ trình HĐND xây dựng NQ');
  await key('Escape',27);
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','Escape close');
  const escFocus=await evaluate('document.activeElement==='+progress);
  assert(escFocus,'Escape restores trigger focus');
  await actual(progress);
  await openPop('Tiến độ trình HĐND xây dựng NQ');
  for(let i=0;i<12;i++){
    if(!await evaluate('!!document.querySelector(".cell-picker-popover:popover-open")'))break;
    await key('Tab',9);
    await sleep(30);
  }
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','Tab out closes');
  assert(!await evaluate('window.__l2LastPatch'),'keyboard close created patch');
  console.log('PR95_V5_L1_ENTER_TAB_ESC_NOOP_PASS '+JSON.stringify({selected,escFocus}));

  // Natural menu height at a bottom-edge row; real event, not .click().
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:520,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?edit=1&review-staff=1'});
  await waitFor('document.querySelector(".item-data-table tbody tr:last-child .compact-stage-row[data-stage-field=progressParty] button.cell-picker-trigger")','last-row status');
  const bottom='document.querySelector(".item-data-table tbody tr:last-child .compact-stage-row[data-stage-field=progressParty] button.cell-picker-trigger")';
  await actual(bottom,true);
  await openPop('Tiến độ xin ý kiến Thành ủy');
  const bottomRect=await geometry(bottom,'bottom-edge-seven-choices');
  await screenshot('pr95-v5-l1-bottom-flip-desktop.png');
  await key('Escape',27);
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','close bottom picker');

  // Searchable specialist: filtering shrinks natural menu; observe re-anchor.
  const specialist=first('Chuyên viên');
  const hasSpecialist=await evaluate('!!'+specialist);
  assert(hasSpecialist,'searchable specialist must be mounted');
  await actual(specialist,true);
  await openPop('Chuyên viên');
  const beforeSearch=await geometry(specialist,'searchable-before-filter');
  await evaluate('document.querySelector(".cell-picker-popover input[type=search]")?.focus()');
  await send('Input.insertText',{text:'khong-co-ket-qua-v5'});
  await waitFor('!!document.querySelector(".cell-picker-popover .cell-picker-empty")','empty filtered choice');
  await sleep(160);
  const afterSearch=await geometry(specialist,'searchable-after-filter');
  assert(afterSearch.menu.height<beforeSearch.menu.height,
    'filter did not reduce rendered menu height '+JSON.stringify({beforeSearch,afterSearch}));
  await screenshot('pr95-v5-l1-search-filter-reposition.png');
  await key('Escape',27);
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','search Escape');

  // Permissions: a guest grant to leaders must not expose forbidden status.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?edit=1&clear-qa=1&review-staff=1'});
  await waitFor('document.querySelector(".item-data-table tbody tr:first-child")','grant fixture list');
  const denied=await evaluate('(()=>{const row=document.querySelector(".item-data-table tbody tr:first-child");return {'+
    'status:row.querySelectorAll(".compact-stage-row button.cell-picker-trigger").length,'+
    'leader:[...row.querySelectorAll("button.cell-picker-trigger")].filter(b=>b.getAttribute("aria-label")?.includes("Lãnh đạo")).length};})()');
  assert(denied.status===0&&denied.leader>=2,'unauthorized status must stay inert '+JSON.stringify(denied));
  await actual(first('Lãnh đạo VP'),true);
  await openPop('Lãnh đạo VP');
  await geometry(first('Lãnh đạo VP'),'granted-leader-only');
  await key('Escape',27);
  assert(!await evaluate('window.__l2LastPatch'),'grant-only Escape changed raw source');
  console.log('PR95_V5_L1_GRANT_DENY_NOOP_PASS '+JSON.stringify(denied));

  // Real ReportDetailGrid: activate edit and show the actual leader columns
  // using existing UI. Same picker implementation must honor popup viewport.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?popup=1&popup-clear-qa=1&review-staff=1'});
  await waitFor('[...document.querySelectorAll(".report-grid-actions button")].some(b=>b.textContent.includes("Chỉnh sửa nháp"))','popup edit option');
  await evaluate('(()=>{const buttons=[...document.querySelectorAll(".report-grid-actions button")];'+
    'buttons.find(b=>b.textContent.includes("Chỉnh sửa nháp"))?.click();'+
    'buttons.find(b=>b.textContent.includes("Hiện đủ cột Excel"))?.click();})()');
  await waitFor('!!'+popupFirst('Lãnh đạo VP'),'popup leader picker');
  await actual(popupFirst('Lãnh đạo VP'),true);
  await openPop('Lãnh đạo VP');
  const popupA=await geometry(popupFirst('Lãnh đạo VP'),'popup-leader');
  await screenshot('pr95-v5-l1-popup-open-desktop.png');
  await actual(popupFirst('Lãnh đạo UBND'));
  await openPop('Lãnh đạo UBND');
  const popupB=await geometry(popupFirst('Lãnh đạo UBND'),'popup-one-click-switch');
  await screenshot('pr95-v5-l1-popup-one-click-switch.png');
  await key('Escape',27);
  assert(!await evaluate('window.__l2LastPatch'),'popup handoff saved data');
  console.log('PR95_V5_L1_POPUP_HANDOFF_PASS '+JSON.stringify({popupA,popupB}));

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?edit=1&review-staff=1'});
  await waitFor('!!'+progress,'mobile status');
  await actual(progress,true);
  await openPop('Tiến độ trình HĐND xây dựng NQ');
  const mobile=await geometry(progress,'mobile-390-status');
  await screenshot('pr95-v5-l1-mobile-390-status.png');
  await key('Escape',27);
  const forbidden=network.filter(url=>['firebaseio','firebasedatabase','identitytoolkit',
    'securetoken','docs.google.com/spreadsheets','sheets.googleapis.com']
    .some(fragment=>url.toLowerCase().includes(fragment)));
  assert(forbidden.length===0,'production endpoint contacted '+JSON.stringify(forbidden));
  console.log('PR95_V5_L1_REAL_CHROME_PASS '+JSON.stringify({
    pointerHandoffs:2,popupHandoffs:1,main:true,popup:true,bottom:bottomRect,
    searchBefore:beforeSearch,searchAfter:afterSearch,mobile,
    enterTabEscape:true,permissionGrant:true,productionRequests:0
  }));
}finally {
  for(const job of pending.values())job.reject(Error('Chrome closing'));
  pending.clear();ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
