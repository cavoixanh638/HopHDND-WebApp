/** V5 L4: REAL headless Chromium integration, synthetic-only Vite build.
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
if(!chrome)throw Error('V5 L4 real Chrome not installed');
const tmp=mkdtempSync(join(tmpdir(),'pr95-v5-l4-chrome-'));
let browser,ws,sequence=0;
const jobs=new Map(),requests=[];
const assert=(condition,msg)=>{if(!condition)throw Error('PR95_V5_L4_FAIL '+msg);};
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
  throw Error('V5 L4 timeout '+label);
};
const screenshot=async file=>{
  await delay(130);
  const result=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const bytes=Buffer.from(result.data,'base64');
  assert(bytes.length>1500&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a',file+' is not PNG');
  writeFileSync(file,bytes);
  console.log('PR95_V5_L4_SCREENSHOT '+JSON.stringify({file,bytes:bytes.length}));
};
const click=async selector=>{
  const ok=await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});el?.click();return !!el;})()`);
  assert(ok,'missing click '+selector);
};
const buildRows=async selector=>evaluate(`(()=>{
  return [...document.querySelectorAll(${JSON.stringify(selector)})].map(row=>{
    const kind=row.querySelector('.compact-document-badge')?.textContent?.trim()??'';
    const build=row.querySelector('[data-stage-field="progressBuild"]');
    const value=build?.querySelector('.compact-stage-state');
    const locked=value?.querySelector('.business-build-locked');
    return {kind,rawText:value?.textContent?.trim()??'',
      locked:!!locked,editable:!!value?.querySelector('.cell-picker-trigger'),
      tooltip:locked?.getAttribute('data-quick-tooltip')??null,
      tone:build?.dataset.progressTone??null,
      id:row.querySelector('td[data-col-key="displayCode"]')?.textContent?.trim()??''};
  });
})()`);
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
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1&preview-role=admin'});
  await waitFor("document.querySelector('[data-preview=pr95-l4-full][data-role=admin]') && document.querySelectorAll('.item-data-table tbody tr').length===27",
    'mounted real admin ItemList');
  const before=await buildRows('.item-data-table tbody tr');
  assert(before.length===27,'missing 27 real demo rows');
  const hcBc=before.filter(r=>r.kind==='HC'||r.kind==='Báo cáo');
  assert(hcBc.length>0,'HC/BC fixture missing');
  assert(hcBc.every(r=>r.locked&&!r.editable&&r.rawText==='Không phải trình'&&r.tone==='neutral'&&
    r.tooltip?.includes('không thể chỉnh sửa')),
    'invalid HC/BC lock/tone/tooltip '+JSON.stringify(hcBc));
  const qppl=before.filter(r=>r.kind==='QPPL');
  assert(qppl.length>0&&qppl.some(r=>r.editable&&!r.locked),
    'QPPL Build still needs ordinary editable picker');
  await screenshot('pr95-v5-l4-desktop-hc-bc-build-locked.png');

  const focusTooltip=await evaluate(`(()=>{
    const target=document.querySelector('.item-data-table .business-build-locked');
    target?.focus({preventScroll:true});return {focused:document.activeElement===target,
      explanation:target?.getAttribute('data-quick-tooltip'),
      shown:!!document.querySelector('#edit-shared-tooltip:popover-open'),
      exists:!!document.getElementById('edit-shared-tooltip'),
      description:target?.getAttribute('aria-describedby'),
      inTable:!!target?.closest('table.item-data-table'),
      focusVisible:target?.matches(':focus-visible'),
      html:document.querySelector('#edit-shared-tooltip')?.outerHTML.slice(0,220)};
  })()`);
  assert(focusTooltip.focused&&focusTooltip.shown&&focusTooltip.description==='edit-shared-tooltip',
    'keyboard explanation not accessible '+JSON.stringify(focusTooltip));
  await screenshot('pr95-v5-l4-keyboard-locked-tooltip.png');

  // Switch type in RAM: changing QPPL -> HC must immediately remove its Build editor.
  await click('.item-data-table tbody tr:first-child .compact-document-badge .cell-picker-trigger');
  await waitFor("document.querySelector('.cell-picker-options .cell-picker-option')",'type chooser');
  const options=await evaluate("[...document.querySelectorAll('.cell-picker-option')].map(x=>x.textContent.trim())");
  assert(options.some(x=>x==='HC'),'HC option missing '+JSON.stringify(options));
  await click('.cell-picker-option:nth-child('+String(options.indexOf('HC')+1)+')');
  await waitFor("document.querySelector('.item-data-table tbody tr:first-child .compact-document-badge')?.textContent?.includes('HC') && document.querySelector('.item-data-table tbody tr:first-child .business-build-locked')",
    'QPPL to HC projection and immediate lock');
  const switched=await buildRows('.item-data-table tbody tr:first-child');
  assert(switched[0].kind==='HC'&&switched[0].locked&&!switched[0].editable,
    'type-switch lock failed '+JSON.stringify(switched));
  await screenshot('pr95-v5-l4-after-type-switch-to-hc.png');

  // BC report still covers BC records; drill opens the baseline real popup.
  await click('.pr95-preview-nav button:first-child');
  await waitFor("document.querySelectorAll('section[data-ui-reference-report]').length===5",
    'all five baseline reports');
  const count=await evaluate("document.querySelector('section[data-ui-reference-report=build] .report-heading-count')?.textContent?.trim()");
  assert(typeof count==='string'&&count.includes('nội dung'),'Build report count missing');
  await screenshot('pr95-v5-l4-reports-build-effective.png');
  const drill=await evaluate(`(()=>{
    const button=document.querySelector('section[data-ui-reference-report=bc] button.count-drill:not([disabled])');
    button?.click();return !!button;
  })()`);
  assert(drill,'BC report drilldown missing');
  await waitFor("document.querySelector('table.report-detail-grid tbody tr')",'real ReportDetailGrid');
  const popup=await buildRows('table.report-detail-grid tbody tr');
  assert(popup.length>0,'BC report popup rows missing');
  assert(popup.every(x=>x.locked&&!x.editable&&x.rawText==='Không phải trình'&&x.tone==='neutral'),
    'BC popup grouped Build not locked '+JSON.stringify(popup));
  await screenshot('pr95-v5-l4-popup-bc-build-locked.png');

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await screenshot('pr95-v5-l4-mobile-bc-popup.png');
  const forbidden=requests.filter(x=>/firebaseio|firebasedatabase|identitytoolkit|securetoken|sheets.googleapis.com|docs.google.com\/spreadsheets/i.test(x));
  assert(forbidden.length===0,'production request '+JSON.stringify(forbidden));
  console.log('PR95_V5_L4_REAL_CHROME_PASS '+JSON.stringify({
    seeded:before.length,lockedHcBc:hcBc.length,editableQppl:qppl.length,
    typeSwitch:switched[0].kind,role:'admin',keyboardTooltip:focusTooltip.shown,
    reports:5,bcPopupRows:popup.length,desktop:1440,mobile:390,
    forbiddenProductionRequests:0
  }));
}finally{
  for(const job of jobs.values())job.fail(Error('Chrome closing'));
  jobs.clear();ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(tmp,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
