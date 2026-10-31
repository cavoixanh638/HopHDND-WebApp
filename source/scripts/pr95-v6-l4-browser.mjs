/** V6 L4: REAL headless Chromium integration, synthetic-only Vite build.
 * No Firebase/Sheets/backend credentials, no mutation outside in-memory QA.
 */
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';

const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try{
    const request=new URL(req.url??'/','http://127.0.0.1').pathname;
    const target=resolve(root,'.'+(request==='/'?'/compact-qa.html':request));
    if(!target.startsWith(root+'/')||!statSync(target).isFile())throw Error('404');
    res.writeHead(200,{'content-type':({
      '.html':'text/html','.js':'text/javascript','.css':'text/css',
      '.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'
    })[extname(target)]??'application/octet-stream','cache-control':'no-store'});
    res.end(readFileSync(target));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('V6 L4 real Chrome not installed');
const tmp=mkdtempSync(join(tmpdir(),'pr95-v6-l4-chrome-'));
let browser,ws,sequence=0;
const jobs=new Map(),requests=[];
const assert=(condition,msg)=>{if(!condition)throw Error('PR95_V6_L4_FAIL '+msg);};
const send=(method,params={})=>new Promise((done,fail)=>{
  const id=++sequence;jobs.set(id,{done,fail});
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(jobs.has(id)){jobs.delete(id);fail(Error('CDP timeout '+method));}},15000);
});
const evaluate=async expression=>{
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('Browser JS exception: '+JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};
const waitFor=async(js,label)=>{
  for(let i=0;i<120;i++){
    try{if(await evaluate('Boolean('+js+')'))return;}catch{}
    await delay(120);
  }
  throw Error('V6 L4 timeout '+label);
};
const screenshot=async file=>{
  await delay(130);
  const result=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const bytes=Buffer.from(result.data,'base64');
  assert(bytes.length>1500&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a',file+' is not PNG');
  writeFileSync(file,bytes);
  console.log('PR95_V6_L4_SCREENSHOT '+JSON.stringify({file,bytes:bytes.length}));
};
const click=async selector=>{
  const ok=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el?.click();return !!el;})()`);
  assert(ok,'missing click '+selector);
};
try {
  const probe=createServer();await new Promise(done=>probe.listen(0,'127.0.0.1',done));
  const debuggerPort=probe.address().port;await new Promise(done=>probe.close(done));
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--no-first-run','--no-default-browser-check','--disable-background-networking',
    '--remote-debugging-port='+debuggerPort,'--remote-debugging-address=127.0.0.1',
    '--user-data-dir='+tmp,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let stderr='';browser.stderr.on('data',x=>{stderr=(stderr+String(x)).slice(-1200);});
  let tab;
  for(let i=0;i<130;i++){
    try{const r=await fetch('http://127.0.0.1:'+debuggerPort+'/json/list',
      {signal:AbortSignal.timeout(800)});
      tab=(await r.json()).find(x=>x.type==='page');if(tab)break;}catch{}
    await delay(140);
  }
  assert(tab,'Chrome CDP launch '+stderr);
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{
    ws.addEventListener('open',done,{once:true});
    ws.addEventListener('error',fail,{once:true});
  });
  ws.addEventListener('message',event=>{
    const packet=JSON.parse(event.data);
    if(packet.method==='Network.requestWillBeSent')requests.push(packet.params.request.url);
    if(packet.id&&jobs.has(packet.id)){
      const job=jobs.get(packet.id);jobs.delete(packet.id);
      packet.error?job.fail(Error(JSON.stringify(packet.error))):job.done(packet.result);
    }
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');await send('Page.bringToFront');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1&preview-role=admin'});

  await waitFor("document.querySelector('[data-preview=pr95-l4-full][data-role=admin]') && document.querySelectorAll('.item-data-table tbody tr:not(:has(td.empty))').length===27",
    'V6 full preview mounted 27 rows');
  const inventory=async()=>evaluate(`(()=>{
    const zone=document.querySelector('.list-active-filters');
    return {count:Number(zone?.getAttribute('data-active-filter-count')??-1),
      ids:[...zone?.querySelectorAll('[data-active-filter-id]')??[]].map(x=>x.getAttribute('data-active-filter-id')),
      results:zone?.querySelector('.list-active-filter-results')?.textContent?.trim()??'',
      visible:document.querySelectorAll('.item-data-table tbody tr:not(:has(td.empty))').length,
      summaryFooters:document.querySelectorAll('.item-summary-active-filter').length,
      other:document.querySelector('.list-filter-other-count')?.textContent?.trim()??'',
      noResults:!!zone?.querySelector('.list-active-filter-empty')};
  })()`);
  const expectInventory=async(count,visible,label)=>{
    await waitFor(`document.querySelector('.list-active-filters')?.dataset.activeFilterCount===${JSON.stringify(String(count))}
      && document.querySelectorAll('.item-data-table tbody tr:not(:has(td.empty))').length===${visible}`,label);
    const actual=await inventory();
    assert(actual.count===count&&actual.visible===visible,label+': '+JSON.stringify(actual));
    return actual;
  };
  const setInput=async(selector,value)=>{
    const found=await evaluate(`(()=>{
      const input=document.querySelector(${JSON.stringify(selector)});
      if(!input)return false;
      const descriptor=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');
      descriptor.set.call(input,${JSON.stringify(value)});
      input.dispatchEvent(new Event('input',{bubbles:true}));
      return true;
    })()`);
    assert(found,'missing input '+selector);
  };
  const setSelect=async(selector,value)=>{
    const found=await evaluate(`(()=>{
      const select=document.querySelector(${JSON.stringify(selector)});
      if(!select)return false;
      select.value=${JSON.stringify(value)};
      select.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    })()`);
    assert(found,'missing select '+selector);
  };
  const initial=await expectInventory(0,27,'initial 27 unfiltered rows');
  assert(initial.results.includes('27')&&!initial.ids.length,'default zero conditions');
  await screenshot('pr95-v6-l4-desktop-before-active.png');

  // Real React-input events: manual ID + department + room + detail + B/C.
  await setInput('.list-filter-search','NQ-MẪU-001');
  let condition=await expectInventory(1,1,'ID search unique');
  assert(condition.ids[0]==='search'&&condition.results.includes('/ 27'),JSON.stringify(condition));
  await setSelect('select[aria-label="Lọc Sở, ngành"]','Sở mẫu A');
  await expectInventory(2,1,'department AND search');
  await setSelect('select[aria-label="Lọc Phòng"]','Phòng mẫu 1');
  await expectInventory(3,1,'room AND department AND search');
  await click('.list-filter-other>summary');
  await waitFor("document.querySelector('.list-filter-other-panel')",'other panel opened');
  await setSelect('select[aria-label="Chọn trường tìm kiếm"]','displayCode');
  await waitFor("document.querySelector('.list-filter-other-count')?.textContent?.trim()==='1'",'scope count in other');
  await setSelect('select[aria-label="Lọc Tiến độ Thành ủy chi tiết"]','Sở chưa trình');
  await waitFor("document.querySelector('.list-filter-other-count')?.textContent?.trim()==='2'",'detail count in other');
  await expectInventory(4,1,'detail AND others');
  await click('.list-filter-other>summary');
  await waitFor("!document.querySelector('.list-filter-other-panel')",'other panel collapsed');
  await click('[data-summary-kind="qppl"]');
  await expectInventory(5,1,'B kind AND existing predicates');
  await click('[data-summary-report="party"][data-summary-stage="source"]');
  const all=await expectInventory(6,1,'C stage AND existing predicates');
  assert(all.summaryFooters===0&&all.other==='2','consolidated filter footers or collapsed other counter '+JSON.stringify(all));
  assert(JSON.stringify(all.ids)===JSON.stringify(['search','department','room','detail:progressParty','kind','summary']),
    'unexpected active chips '+JSON.stringify(all.ids));
  const controls=await evaluate(`(()=>{
    const query=document.querySelector('.list-filter-search');
    const dept=document.querySelector('select[aria-label="Lọc Sở, ngành"]');
    const other=document.querySelector('.list-filter-other');
    const kind=document.querySelector('[data-summary-kind=qppl]');
    const stage=document.querySelector('[data-summary-report=party][data-summary-stage=source]');
    return {query:query?.dataset.filterActive,dept:dept?.dataset.filterActive,
      other:other?.dataset.filterActive,kind:kind?.getAttribute('aria-pressed'),
      stage:stage?.getAttribute('aria-pressed'),
      queryBorder:getComputedStyle(query).borderTopColor,otherBorder:getComputedStyle(other.querySelector('summary')).borderTopColor,
      otherCount:other.querySelector('.list-filter-other-count')?.textContent?.trim()};
  })()`);
  assert(controls.query==='true'&&controls.dept==='true'&&controls.other==='true'&&
    controls.kind==='true'&&controls.stage==='true'&&controls.otherCount==='2',
    'active control highlights '+JSON.stringify(controls));
  await screenshot('pr95-v6-l4-desktop-six-active-filters.png');

  // One X must not remove the other five AND conditions.
  await click('[data-active-filter-id="department"] button');
  condition=await expectInventory(5,1,'remove only department');
  assert(!condition.ids.includes('department')&&condition.ids.includes('summary')&&condition.ids.includes('search'),
    'clear-one side effects '+JSON.stringify(condition));
  await click('[data-active-filter-id="summary"] button');
  condition=await expectInventory(4,1,'remove only stage');
  assert(condition.ids.includes('kind')&&condition.ids.includes('detail:progressParty'),
    'stage clear changed kind/other '+JSON.stringify(condition));

  // A true zero result still announces all conditions and the clear action.
  await setInput('.list-filter-search','NONEXISTENT-L4-ZERO-RESULT');
  condition=await expectInventory(4,0,'zero result with four active filters');
  assert(condition.noResults&&condition.results.includes('0')&&condition.results.includes('/ 27'),
    'zero state must offer clear '+JSON.stringify(condition));
  await screenshot('pr95-v6-l4-desktop-zero-results.png');
  await click('.list-active-filter-empty button');
  await expectInventory(0,27,'zero-state clear-all restores 27');
  const returned=await evaluate("document.querySelectorAll('.item-data-table tbody tr:not(:has(td.empty))').length");
  assert(returned===27,'clear all changed source scope');

  // Esc in an input is local; outside an editor/popup it clears all predicates.
  await setInput('.list-filter-search','NQ-MẪU-001');
  await expectInventory(1,1,'esc scope setup');
  await evaluate(`(()=>{
    document.querySelector('.list-filter-search').dispatchEvent(
      new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  })()`);
  await expectInventory(1,1,'Esc inside input must not clear global filters');
  await evaluate(`(()=>{
    document.querySelector('.list-filter-search').blur();
    window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  })()`);
  await expectInventory(0,27,'global Escape clears filters');

  // Physical keyboard Enter activates a single X, not the full reset.
  await setSelect('select[aria-label="Lọc Sở, ngành"]','Sở mẫu A');
  await setSelect('select[aria-label="Lọc Phòng"]','Phòng mẫu 1');
  await expectInventory(2,7,'keyboard X preconditions'); // 27 demo, A room1 => 7 rows
  const focus=await evaluate("(()=>{const button=document.querySelector('[data-active-filter-id=department] button');button.focus({preventScroll:true});return {focus:document.activeElement===button,hasFocus:document.hasFocus(),tag:document.activeElement?.tagName}})()");
  assert(focus.focus,'keyboard remove button could not receive focus '+JSON.stringify(focus));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  console.log('PR95_V6_L4_KEYBOARD_DIAGNOSTIC '+JSON.stringify({focus,after:await inventory()}));
  condition=await expectInventory(1,13,'keyboard Enter removes only department');
  assert(condition.ids[0]==='room','keyboard removed wrong chip '+JSON.stringify(condition));
  await click('.list-active-filter-clear-all');
  await expectInventory(0,27,'clear all without changing row data');

  // Guest switch: no admin-only leak or stale filter inventory after remount.
  await click('.pr95-preview-gear');
  await waitFor("document.querySelector('.pr95-preview-gear-menu')",'admin gear opened');
  await evaluate(`(()=>{
    const b=[...document.querySelectorAll('.pr95-preview-gear-menu button')]
      .find(x=>x.textContent.includes('Đăng xuất mô phỏng'));
    if(!b)throw Error('Logout missing');b.click();
  })()`);
  await waitFor("document.querySelector('[data-role=guest]') && document.querySelector('.list-active-filters')",'guest list reset');
  await expectInventory(0,27,'guest initial list zero filters');

  // Mobile: several chips wrap INSIDE the list region, never full-page overflow.
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await setInput('.list-filter-search','MẪU');
  await setSelect('select[aria-label="Lọc Sở, ngành"]','Sở mẫu A');
  await setSelect('select[aria-label="Lọc Phòng"]','Phòng mẫu 1');
  await expectInventory(3,7,'mobile three conditions, 27-source scope');
  await click('.list-filter-other>summary');
  await waitFor("document.querySelector('.list-filter-other-panel')",'mobile other details opened');
  await setSelect('select[aria-label="Lọc Tiến độ ban hành NQ/BC chi tiết"]','Sở chưa trình');
  condition=await expectInventory(4,3,'mobile long detail label and 3 AND records');
  await click('.list-filter-other>summary');
  await waitFor("!document.querySelector('.list-filter-other-panel')",'mobile other closed with count');
  const geometry=await evaluate(`(()=>{
    const zone=document.querySelector('.list-active-filters');
    const r=zone.getBoundingClientRect();
    return {viewport:innerWidth,zoneLeft:r.left,zoneRight:r.right,
      zoneWidth:r.width,client:zone.clientWidth,scroll:zone.scrollWidth,
      chips:[...zone.querySelectorAll('.list-active-filter-chip')].map(x=>{
        const b=x.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,height:b.height};
      })};
  })()`);
  assert(geometry.zoneRight<=geometry.viewport+2&&geometry.scroll<=geometry.client+2&&
    geometry.chips.every(c=>c.right<=geometry.viewport+2),
    'mobile filter horizontal overflow '+JSON.stringify(geometry));
  await screenshot('pr95-v6-l4-mobile-filter-chips.png');
  const forbidden=requests.filter(url=>/firebaseio|firebasedatabase|identitytoolkit|securetoken|sheets.googleapis.com|docs.google.com\/spreadsheets/i.test(url));
  assert(forbidden.length===0,'unexpected production requests '+JSON.stringify(forbidden));
  console.log('PR95_V6_L4_REAL_CHROME_PASS '+JSON.stringify({
    baselineRows:27,searchUnique:1,sixConditions:all.count,
    otherClosedCount:all.other,zeroResults:true,independentClear:true,
    escEditorSafe:true,keyboardSingleRemove:true,guestRole:true,
    mobileWidth:390,mobileChips:geometry.chips.length,productionRequests:0,
    mobileGeometry:geometry
  }));
}finally{
  for(const job of jobs.values())job.fail(Error('Chrome closing'));
  jobs.clear();ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
