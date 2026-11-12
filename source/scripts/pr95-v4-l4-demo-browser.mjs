// PR95 UI V4 L4: real Chromium verification of CURRENT synthetic demo records.
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
const profile=mkdtempSync(join(tmpdir(),'pr95-v4-l4-'));
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
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1&preview-role=admin'});
  await waitFor("document.querySelector('[data-preview=pr95-l4-full][data-role=admin]') && document.querySelector('.item-data-table tbody tr')",'real full list');
  const initial=await checkTable('.item-data-table','desktop list');
  assert(initial.canonical.includes('VP đang xử lý'),'new office status is visible');
  const total=await evaluate("Number(document.querySelector('[data-summary-card=total] .item-summary-total-count')?.textContent)");
  assert(total===23,'current demo grand total not 23: '+total);
  const types=await evaluate("[...document.querySelectorAll('button[data-summary-kind]')].map(b=>[b.dataset.summaryKind,Number(b.querySelector('strong')?.textContent)])");
  assert(JSON.stringify(types.map(x=>x[0]))===JSON.stringify(['qppl','hc','bc']),'three kinds unchanged');
  assert(types.reduce((n,x)=>n+x[1],0)===total,'all active demo kinds accounted');
  await screenshot('pr95-v4-l4-desktop-list-canonical.png');

  await clickText('.pr95-preview-nav button','Báo cáo tổng hợp');
  await waitFor("document.querySelectorAll('table.report-table').length===5",'all five true reports');
  const reportInfo=await evaluate(`(()=>{
    const tables=[...document.querySelectorAll('table.report-table')];
    return tables.map(table=>({
      old:['VP đang thực hiện','ĐU đã gửi TU','Đã họp/xin phiếu',
        'Đã trình HĐND, chưa có QĐ'].some(value=>table.textContent.includes(value)),
      columns:[...table.querySelectorAll('thead th')].map(th=>th.textContent.trim())
    }));
  })()`);
  assert(reportInfo.length===5&&reportInfo.every(report=>!report.old),'legacy names in report table');
  await screenshot('pr95-v4-l4-desktop-five-reports.png');

  const clicked=await evaluate(`(()=>{
    const button=document.querySelector('table.report-table button.count-drill:not([disabled])');
    button?.click();return !!button;
  })()`);
  assert(clicked,'live nonzero report drilldown exists');
  await waitFor("document.querySelector('table.report-detail-grid tbody tr')",'real ReportDetailGrid popup');
  const popup=await checkTable('table.report-detail-grid','report popup');
  await screenshot('pr95-v4-l4-desktop-report-popup.png');

  // Close popup using the real modal close action; return to the List.
  const closed=await evaluate(`(()=>{
    const modal=document.querySelector('.report-detail-modal');
    const button=modal?.querySelector('button[aria-label*="Đóng"],button[aria-label*="đóng"],.modal-close');
    button?.click();return !!button;
  })()`);
  if(!closed){
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  }
  await waitFor("!document.querySelector('table.report-detail-grid')",'popup close');
  await clickText('.pr95-preview-nav button','Danh sách các ND trình HĐND');
  await waitFor("document.querySelector('.item-data-table tbody tr')",'list restored');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await waitFor("document.querySelector('.item-data-table')&&window.innerWidth===390",'mobile real list');
  await screenshot('pr95-v4-l4-mobile-list-canonical.png');
  const forbidden=network.filter(url=>['firebaseio','firebasedatabase',
    'identitytoolkit','securetoken','docs.google.com/spreadsheets','sheets.googleapis.com']
    .some(fragment=>url.toLowerCase().includes(fragment)));
  assert(forbidden.length===0,'production endpoint contacted '+JSON.stringify(forbidden));
  console.log('PR95_V4_L4_REAL_CHROME_PASS '+JSON.stringify({
    demoRecords:27,active:total,kindCounts:types,reportTables:reportInfo.length,
    popupRecords:popup.rows,listRecords:initial.rows,canonicalVisible:initial.canonical,
    desktop:1440,mobile:390,productionRequests:forbidden.length
  }));
}finally {
  for(const job of pending.values())job.reject(Error('Chrome closing'));
  pending.clear();ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
