// PR95 UI V5 L2: real Chrome synthetic full-preview role transitions, counts & filters.
// All fixtures are synthetic and served only from loopback. Never touch production.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try{
    const pathname=new URL(req.url??'/','http://127.0.0.1').pathname;
    const file=resolve(root,'.'+(pathname==='/'?'/compact-qa.html':pathname));
    if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('404');
    res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css',
      '.woff2':'font/woff2','.png':'image/png'}[extname(file)]??'application/octet-stream'),
      'cache-control':'no-store'});
    res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const executable=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(x=>spawnSync('which',[x],{encoding:'utf8'}).status===0);
if(!executable)throw Error('PR95 V3 L4 requires real Chrome/Chromium');
const profile=mkdtempSync(join(tmpdir(),'pr95-v5-l2-'));
let browser,ws,id=0;
const outstanding=new Map(),network=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const current=++id;outstanding.set(current,{resolve,reject});
  ws.send(JSON.stringify({id:current,method,params}));
  setTimeout(()=>{if(outstanding.has(current)){
    outstanding.delete(current);reject(Error('CDP timeout: '+method));
  }},15000);
});
const evaluate=async expression=>{
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error('Chrome exception '+JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const waitFor=async(expression,label)=>{
  for(let i=0;i<95;i++){
    try{const v=await evaluate(expression);if(v)return v;}catch{}
    await sleep(100);
  }
  throw Error('Timeout waiting for '+label);
};
const capture=async name=>{
  const rect=await evaluate(`(()=>{
    const element=document.querySelector('.item-summary-grid');
    element.scrollIntoView({block:'center'});
    const r=element.getBoundingClientRect();
    return {x:Math.max(0,r.left-8),y:Math.max(0,r.top-8),
      width:Math.min(innerWidth,r.width+16),height:Math.min(innerHeight,r.height+16)};
  })()`);
  await sleep(70);
  const isMobile=await evaluate('innerWidth<=600');
  // On 390px screens the card occupies a much smaller area. Capture the real
  // viewport after scrolling it into view rather than rejecting a valid, well-
  // compressed clipped PNG by an arbitrary byte-size threshold.
  const params={format:'png',fromSurface:true};
  const shot=await send('Page.captureScreenshot',params);
  const bytes=Buffer.from(shot.data,'base64');
  if(bytes.length<900||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')
    throw Error('Invalid Chrome PNG: '+name+' ('+bytes.length+' bytes)');
  writeFileSync(name,bytes);
  console.log('V5_L2_CHROME_IMAGE '+JSON.stringify({name,bytes:bytes.length,
    width:rect.width,height:rect.height,fullMobileViewport:isMobile}));
};
const state=()=>evaluate(`(()=>{
  const section=document.querySelector('.item-summary-total');
  const chipNodes=[...section.querySelectorAll('button[data-summary-kind]')];
  const kinds=chipNodes.map(node=>({
    id:node.getAttribute('data-summary-kind'),
    label:node.childNodes[0]?.textContent?.trim(),
    count:Number(node.querySelector('strong')?.textContent),
    pressed:node.getAttribute('aria-pressed'),
    title:node.title,aria:node.getAttribute('aria-label'),
    type:node.getAttribute('type'),focusable:node.tabIndex>=0,
    bounds:node.getBoundingClientRect().toJSON()
  }));
  return {total:Number(section.querySelector('.item-summary-total-count')?.textContent),
    kinds,tableRows:document.querySelectorAll('.item-data-table tbody tr').length,
    status:document.querySelector('.item-summary-active-filter')?.textContent?.trim()??'',
    resultCount:document.querySelector('.list-filter-count')?.textContent?.trim()??'',
    stageCards:document.querySelectorAll('[data-summary-card="party"],[data-summary-card="build"],[data-summary-card="nq"]').length,
    width:innerWidth};
})()`);
const click=async kind=>{
  const rect=await evaluate(`(()=>{
    const e=document.querySelector('button[data-summary-kind="${kind}"]');
    if(!e)throw Error('Missing chip: ${kind}');
    e.scrollIntoView({block:'center',inline:'nearest'});
    return e.getBoundingClientRect().toJSON();
  })()`);
  await sleep(70);
  const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
};
const focus=kind=>evaluate(`(()=>{const e=document.querySelector('button[data-summary-kind="${kind}"]');e.focus();return document.activeElement===e})()`);
const keyboard=async(key,code,keyCode,{repeat=false}={})=>{
  await send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:keyCode,
    nativeVirtualKeyCode:keyCode,autoRepeat:repeat});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:keyCode,nativeVirtualKeyCode:keyCode});
};
const assert=(v,message)=>{if(!v)throw Error('V5 L2 assertion: '+message);};
try{
  const probe=createServer();await new Promise(ok=>probe.listen(0,'127.0.0.1',ok));
  const debugPort=probe.address().port;await new Promise(ok=>probe.close(ok));
  browser=spawn(executable,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'about:blank'],
    {stdio:'ignore',env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
  let tab=null;
  for(let i=0;i<100;i++){
    try{
      const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list',{signal:AbortSignal.timeout(750)});
      tab=(await response.json()).find(x=>x.type==='page');if(tab)break;
    }catch{}
    await sleep(110);
  }
  if(!tab)throw Error('Chrome CDP did not start');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Network.requestWillBeSent')network.push(m.params.request.url);
    if(m.id&&outstanding.has(m.id)){
      const p=outstanding.get(m.id);outstanding.delete(m.id);
      m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
    }
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1'});
  await waitFor("document.querySelector('[data-preview=pr95-l4-full]') && document.querySelector('.item-summary-total')",
    'full preview list with ItemSummaryCards');
  const initial=await state();
  // No actual Firebase/Google clients are mounted by this full-preview route.
  // Test the same React ItemSummaryCards across real synthetic role transitions.
  const diagnostic=()=>evaluate(`(()=>{
    const root=document.querySelector('.pr95-full-preview');
    const cards=[...document.querySelectorAll('.item-summary-card[data-summary-card]')];
    const stages=cards.filter(x=>x.dataset.summaryCard!=='total').map(x=>({
      id:x.dataset.summaryCard,
      fraction:x.querySelector('.item-summary-fraction')?.textContent.trim(),
      percent:x.querySelector('.item-summary-percent')?.textContent.trim(),
      buttons:[...x.querySelectorAll('button[data-summary-stage]')].map(b=>({
        stage:b.dataset.summaryStage,label:b.querySelector('span')?.textContent.trim(),
        count:Number(b.querySelector('strong')?.textContent),
        pressed:b.getAttribute('aria-pressed')
      })),
      note:x.querySelector('.item-summary-unmatched')?.textContent.trim()??null,
      unmatchedInDOM:!!x.querySelector('.item-summary-unmatched')
    }));
    const chips=[...document.querySelectorAll('.item-summary-kind-chip')].map(x=>({
      kind:x.dataset.summaryKind,count:Number(x.querySelector('strong')?.textContent),
      pressed:x.getAttribute('aria-pressed')
    }));
    return {role:root?.dataset.role,rows:document.querySelectorAll('.item-data-table tbody tr').length,
      total:Number(document.querySelector('.item-summary-total-count')?.textContent),
      chips,stages,
      unmatchedNodes:document.querySelectorAll('.item-summary-unmatched').length,
      leak:document.querySelector('.item-summary-grid')?.textContent?.includes('Chưa chuẩn hóa / ngoài nhóm')??false,
      appHeight:document.querySelector('.item-summary-grid')?.getBoundingClientRect().height};
  })()`);
  const safeNumbers=x=>JSON.stringify({total:x.total,chips:x.chips,
    stages:x.stages.map(y=>({id:y.id,fraction:y.fraction,percent:y.percent,buttons:y.buttons}))});
  const gearAction=async(label)=>{
    const press=async(selector)=>{
      const rect=await evaluate('(()=>{const el=document.querySelector('+JSON.stringify(selector)+');if(!el)return null;el.scrollIntoView({block:"center",inline:"nearest"});return el.getBoundingClientRect().toJSON()})()');
      assert(!!rect,'Gear action missing '+selector);
      await sleep(90);
      const x=rect.left+rect.width/2,y=rect.top+rect.height/2;
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
      await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
      await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
    };
    await press('.pr95-preview-gear');
    await waitFor('[...document.querySelectorAll(".pr95-preview-gear-menu button")].some(x=>x.textContent.trim()==='+JSON.stringify(label)+')','gear action '+label);
    const selector=await evaluate('(()=>{const wanted='+JSON.stringify(label)+';const b=[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(x=>x.textContent.trim()===wanted);if(!b)return "";b.dataset.v5l2Target="true";return ".pr95-preview-gear-menu button[data-v5l2-target=true]"})()');
    assert(!!selector,'Gear action target '+label);
    await press(selector);
    const role=label==='Đăng xuất mô phỏng'?'guest':'admin';
    await waitFor('document.querySelector(".pr95-full-preview")?.dataset.role==='+JSON.stringify(role),'role transition to '+role);
  };
  const guestInitial=await diagnostic();
  assert(guestInitial.role==='guest'&&guestInitial.unmatchedNodes===0&&!guestInitial.leak,
    'guest must not expose unmatched diagnostic DOM or accessible text');
  assert(guestInitial.chips.length===3&&guestInitial.stages.length===3,
    'three document kinds and three stage cards');
  assert(JSON.stringify(guestInitial.stages.map(x=>x.buttons.length))===JSON.stringify([4,4,3]),
    'guest retains 4/4/3 status buckets');
  await capture('pr95-v5-l2-preview-guest-before.png');
  await gearAction('Đăng nhập quản trị (mô phỏng)');
  const adminVisible=await diagnostic();
  assert(adminVisible.role==='admin'&&adminVisible.unmatchedNodes===3&&adminVisible.leak,
    'admin has exactly 3 diagnostic notes including zero counts');
  assert(adminVisible.stages.every(x=>x.unmatchedInDOM&&x.note.includes('Chưa chuẩn hóa / ngoài nhóm')),
    'all three diagnostic notes visible only to admin');
  assert(safeNumbers(adminVisible)===safeNumbers(guestInitial),
    'role must not change totals/chips/4–4–3 bucket counts');
  await capture('pr95-v5-l2-preview-admin.png');
  await gearAction('Đăng xuất mô phỏng');
  const guestAfterLogout=await diagnostic();
  assert(guestAfterLogout.role==='guest'&&guestAfterLogout.unmatchedNodes===0&&
    !guestAfterLogout.leak&&safeNumbers(guestAfterLogout)===safeNumbers(guestInitial),
    'logout must revoke diagnostic nodes without changing numeric results');
  await capture('pr95-v5-l2-preview-guest-after-logout.png');
  console.log('PR95_V5_L2_SYNTHETIC_ROLE_REVOKE_DOM_PASS '+JSON.stringify({
    guest:guestInitial.unmatchedNodes,admin:adminVisible.unmatchedNodes,
    guestAfterLogout:guestAfterLogout.unmatchedNodes,counts:safeNumbers(guestInitial),
    adminHeight:adminVisible.appHeight,guestHeight:guestInitial.appHeight}));

  assert(initial.kinds.length===3,'exactly 3 kind buttons');
  assert(JSON.stringify(initial.kinds.map(x=>x.id))===JSON.stringify(['qppl','hc','bc']),'kind order');
  assert(JSON.stringify(initial.kinds.map(x=>x.label))===JSON.stringify(['NQ QPPL','NQ HC','BC']),'user labels');
  assert(initial.kinds.every(x=>x.type==='button'&&x.focusable&&x.title.includes('Bấm để lọc')&&x.aria.includes('nội dung')&&x.pressed==='false'),
    'tooltip, accessible names, native buttons, inactive states');
  assert(initial.stageCards===3,'other stage cards preserved');
  assert(initial.total>0&&initial.kinds.reduce((n,x)=>n+x.count,0)<=initial.total,'count integrity');
  await capture('pr95-v5-l2-desktop-initial.png');
  for(const kind of ['qppl','hc','bc']){
    const item=initial.kinds.find(x=>x.id===kind);
    await click(kind);
    await waitFor(`document.querySelector('button[data-summary-kind="${kind}"]')?.getAttribute('aria-pressed')==='true'`,'mouse select '+kind);
    const on=await state();
    assert(on.kinds.filter(x=>x.pressed==='true').length===1,'one active kind');
    assert(on.tableRows===item.count,'filtered rows must equal real count of '+kind+': '+JSON.stringify(on));
    if(kind==='qppl')await capture('pr95-v5-l2-desktop-qppl-filtered.png');
    await click(kind);
    await waitFor(`document.querySelector('button[data-summary-kind="${kind}"]')?.getAttribute('aria-pressed')==='false'`,'mouse deselect '+kind);
    const off=await state();
    assert(off.kinds.every(x=>x.pressed==='false'),'mouse toggled off exactly once');
    assert(off.tableRows===initial.tableRows,'list restored after mouse toggle '+kind);
  }
  assert(await focus('hc'),'button focus via native DOM focus');
  await keyboard('Enter','Enter',13);
  await waitFor("document.querySelector('[data-summary-kind=hc]').getAttribute('aria-pressed')==='true'",'Enter selects once');
  assert((await state()).tableRows===initial.kinds[1].count,'Enter filter count');
  await keyboard('Enter','Enter',13,{repeat:true});
  assert((await state()).kinds[1].pressed==='true','repeated keyDown must not toggle');
  await keyboard('Enter','Enter',13);
  await waitFor("document.querySelector('[data-summary-kind=hc]').getAttribute('aria-pressed')==='false'",'Enter deselects once');
  await keyboard(' ','Space',32);
  await waitFor("document.querySelector('[data-summary-kind=hc]').getAttribute('aria-pressed')==='true'",'Space selects once');
  assert((await state()).tableRows===initial.kinds[1].count,'Space filter count');
  await keyboard(' ','Space',32,{repeat:true});
  assert((await state()).kinds[1].pressed==='true','repeated Space must not toggle');
  await keyboard(' ','Space',32);
  await waitFor("document.querySelector('[data-summary-kind=hc]').getAttribute('aria-pressed')==='false'",'Space deselects once');
  await click('bc');
  await waitFor("document.querySelector('[data-summary-kind=bc]').getAttribute('aria-pressed')==='true'",'selected for explicit clear');
  const clear=await evaluate(`(()=>{
    const b=[...document.querySelectorAll('.item-summary-active-filter button')].find(x=>x.textContent.includes('Bỏ lọc loại'));
    if(!b)return false;
    b.click();return true;
  })()`);
  assert(clear,'explicit clear-filter button works');
  await waitFor("document.querySelector('[data-summary-kind=bc]').getAttribute('aria-pressed')==='false'",'clear filter returns to all');
  assert((await state()).tableRows===initial.tableRows,'explicit clear restored rows');
  await capture('pr95-v5-l2-desktop-cleared.png');

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await waitFor("document.querySelector('.item-summary-total')!==null",'mobile summary card');
  const mobile=await state();
  assert(mobile.kinds.length===3&&mobile.width===390,'three kinds on mobile');
  assert(mobile.kinds.every(x=>x.bounds.left>=-1&&x.bounds.right<=391),'mobile chips not clipped');
  await capture('pr95-v5-l2-mobile-initial.png');
  await click('qppl');
  await waitFor("document.querySelector('[data-summary-kind=qppl]').getAttribute('aria-pressed')==='true'",'mobile click');
  assert((await state()).tableRows===mobile.kinds[0].count,'mobile count-filter integrity');
  await capture('pr95-v5-l2-mobile-filtered.png');
  const forbidden=network.filter(url=>['firebaseio','firebasedatabase','identitytoolkit','securetoken','docs.google.com/spreadsheets'].some(host=>url.toLowerCase().includes(host)));
  assert(forbidden.length===0,'no production endpoints queried');
  console.log('PR95_V5_L2_FULL_PREVIEW_CHROME_PASS '+JSON.stringify({
    chipKinds:initial.kinds.map(x=>x.id),chipCounts:initial.kinds.map(x=>x.count),
    total:initial.total,allRows:initial.tableRows,
    roleGuard:'guest-admin-guest, 0-3-0 diagnostic nodes',
    mouse:'3 toggles both directions',keyboard:'Enter Space repeat',tooltip:true,
    ariaPressed:true,clear:true,mobile:390,productionRequests:forbidden.length}));
}finally{
  for(const p of outstanding.values())p.reject(Error('Chrome shutting down'));outstanding.clear();
  ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
