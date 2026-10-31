// UI V6 / L3: independent REAL Chrome geometry acceptance, synthetic QA only.
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
if(!chrome)throw Error('V6 L3 requires real Chrome');
const profile=mkdtempSync(join(tmpdir(),'pr95-v6-l3-'));
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
const assert=(ok,label)=>{if(!ok)throw Error('UI_V6_L3_FAIL '+label);};
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
  console.log('UI_V6_L3_SCREENSHOT '+name+' '+bytes.length);
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

const inspectLayout=async (label,expectedRole,hasNav)=>{
  const x=await js('('+function inspect(){
    const root=document.querySelector('[data-preview="pr95-l4-full"]');
    const nav=document.querySelector('.pr95-preview-nav');
    const gear=document.querySelector('.pr95-preview-gear');
    const list=document.querySelector('.item-data-table');
    const summary=document.querySelector('.item-summary-grid');
    const heading=document.querySelector('.item-list-page-title');
    const toolbar=document.querySelector('.list-filter-toolbar');
    const table=document.querySelector('.item-table-scroll');
    const cards=summary?[...summary.querySelectorAll('[data-summary-card]')]:[];
    const names=cards.map(e=>e.dataset.summaryCard);
    const before=(a,b)=>!!a&&!!b&&!!(a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING);
    const stage=cards.slice(1,4);
    const positions=[summary,heading,toolbar,table].map(e=>e?.getBoundingClientRect().toJSON()||null);
    const h=gear?.getBoundingClientRect();
    const menu=document.querySelector('.pr95-preview-gear-menu');
    return {
      role:root?.dataset.role,nav:!!nav,navCards:nav?.querySelectorAll('.primary-section-card').length||0,
      list:!!list,summary:!!summary,heading:heading?.textContent.trim(),
      headingCount:document.querySelectorAll('.item-list-page-title').length,
      duplicateExternalHeading:!!document.querySelector('.pr95-preview-section-heading h2'),
      names,readingOrder:cards.length===4&&before(cards[0],stage[0])&&
        stage.every((card,i)=>i===0||before(stage[i-1],card))&&
        before(stage[2],heading)&&before(heading,toolbar)&&before(toolbar,table),
      positions,
      gear:!!gear,gearName:gear?.getAttribute('aria-label'),
      gearRight:h?.right,gearTop:h?.top,
      menu:!!menu,
      pageScrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
      fakeNotice:document.querySelector('.pr95-preview-footnote')?.textContent.includes('Dữ liệu giả'),
      oldGuestSwitchNotice:document.body.innerText.includes('Đã chuyển sang khách MÔ PHỎNG'),
      firstSummarySourceCount:cards[0]?.querySelector('.item-summary-total-count')?.textContent,
      firstResultCount:document.querySelector('.list-filter-count')?.textContent
    };
  }.toString()+')()');
  assert(x.role===expectedRole,label+' role '+JSON.stringify(x));
  assert(x.nav===hasNav&&x.navCards===(hasNav?2:0),label+' exact primary nav DOM');
  assert(x.list&&x.summary&&x.headingCount===1&&x.heading==='Danh sách các ND trình HĐND'&&
    !x.duplicateExternalHeading,label+' single heading and List');
  assert(x.readingOrder,label+' B→C→heading→F→table actual DOM order '+JSON.stringify(x));
  assert(x.positions.every(Boolean)&&x.positions.every((r,i,a)=>i===0||r.top>=a[i-1].top),
    label+' on-screen order '+JSON.stringify(x.positions));
  assert(x.gear&&x.gearName==='Mở cài đặt demo'&&x.gearRight>=x.viewport-65,
    label+' accessible top-right gear '+JSON.stringify(x));
  assert(x.pageScrollWidth<=x.viewport+3,label+' no full page horizontal overflow');
  assert(x.fakeNotice,label+' synthetic-data identity preserved');
  assert(!x.oldGuestSwitchNotice,label+' obsolete guest transition notice absent');
  console.log('UI_V6_L3_DOM_RECT_PASS '+label+' '+JSON.stringify(x));
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
  await until('document.querySelector("[data-role=guest] .item-summary-grid")&&document.querySelector(".item-data-table")','preview guest List default');
  const guest=await inspectLayout('guest-1440', 'guest',false);
  await screenshot('pr95-v6-l3-guest-1440.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:850,deviceScaleFactor:1,mobile:false});
  await inspectLayout('guest-1280','guest',false);
  await screenshot('pr95-v6-l3-guest-1280.png');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await inspectLayout('guest-390','guest',false);
  await screenshot('pr95-v6-l3-guest-390.png');
  // Physical pointer, not synthetic HTMLElement.click.
  await mouseClick('.pr95-preview-gear');
  await until('document.querySelector(".pr95-preview-gear-menu button")','guest login menu');
  const login=await js('(()=>{const menu=document.querySelector(".pr95-preview-gear-menu");return {labels:[...menu.querySelectorAll("button")].map(b=>b.textContent.trim()),hiddenAdmin:!menu.textContent.includes("Excel")};})()');
  assert(login.labels.length===1&&login.labels[0]==='Đăng nhập quản trị (mô phỏng)'&&login.hiddenAdmin,
    'guest can only see small sign-in control '+JSON.stringify(login));
  await screenshot('pr95-v6-l3-guest-gear.png');
  await mouseClick('.pr95-preview-gear-menu button');
  await until('document.querySelector("[data-role=admin] .pr95-preview-nav .primary-section-card")','admin nav login');
  await inspectLayout('admin-390','admin',true);
  await screenshot('pr95-v6-l3-admin-390.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:920,deviceScaleFactor:1,mobile:false});
  await inspectLayout('admin-1440','admin',true);
  await screenshot('pr95-v6-l3-admin-1440.png');
  await nav('Báo cáo tổng hợp');
  await until('document.querySelectorAll(".report-surface").length===5','5 admin reports');
  assert((await js('document.querySelectorAll(".report-surface").length'))===5,'all 5 report tables retained');
  await screenshot('pr95-v6-l3-admin-reports.png');
  await mouseClick('.report-surface button.count-drill:not([disabled])');
  await until('document.querySelector("dialog.report-grid-modal[open]")','admin report popup');
  assert(await js('Boolean(document.querySelector("dialog.report-grid-modal[open] .report-detail-grid"))'),
    'report popup still available');
  await screenshot('pr95-v6-l3-admin-popup.png');
  await call('document.querySelector("dialog.report-grid-modal .modal-header button").click()');
  await until('!document.querySelector("dialog.report-grid-modal[open]")','popup close');
  await mouseClick('.pr95-preview-gear');
  await until('document.querySelector(".pr95-preview-gear-menu button")','admin menu');
  await call('const b=[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(x=>x.textContent.includes("Excel"));if(!b)throw Error("Admin Excel missing");b.click()');
  await until('document.querySelector(".pr95-preview-excel")','admin Excel page');
  await screenshot('pr95-v6-l3-admin-excel.png');
  await mouseClick('.pr95-preview-gear');
  await call('const b=[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(x=>x.textContent.includes("Cài đặt báo cáo"));if(!b)throw Error("Admin settings missing");b.click()');
  await until('document.querySelector(".pr95-preview-main h2")?.textContent.includes("Cài đặt bản xem thử")','admin settings');
  await nav('Báo cáo tổng hợp');
  await until('document.querySelectorAll(".report-surface").length===5','admin reports before logout');
  await mouseClick('.pr95-preview-gear');
  await call('const b=[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(x=>x.textContent.includes("Đăng xuất mô phỏng"));if(!b)throw Error("Logout missing");b.click()');
  await until('document.querySelector("[data-role=guest] .item-data-table")','guest logout List');
  await inspectLayout('guest-after-reports-logout','guest',false);
  await screenshot('pr95-v6-l3-guest-after-logout.png');
  // Guest permissions are unchanged by this shell test: a granted note/current
  // progress requires a separate permission fixture, not frontend role bypass.
  const forbidden=network.filter(url=>/firebaseio|firebasedatabase|identitytoolkit|securetoken|docs\.google\.com\/spreadsheets/i.test(url));
  assert(forbidden.length===0,'Unexpected cloud/production requests '+JSON.stringify(forbidden));
  console.log('UI_V6_L3_REAL_CHROME_PASS '+JSON.stringify({
    synthetic:true,guestDefault:'items',navGuestAbsent:true,headingCount:1,
    semanticOrder:true,adminReports:5,popup:true,excel:true,settings:true,
    logoutReturnsToList:true,desktop:[1440,1280],mobile:390,noProductionNetwork:true
  }));

}catch(e){
  console.error('UI_V6_L3_REAL_CHROME_FAIL',e);
  try{if(ws?.readyState===WebSocket.OPEN)await screenshot('pr95-v6-l3-failure.png');}catch{}
  process.exitCode=1;
}finally{
  try{ws?.close();}catch{}
  try{browser?.kill('SIGKILL');}catch{}
  server.close();rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:120});
}
