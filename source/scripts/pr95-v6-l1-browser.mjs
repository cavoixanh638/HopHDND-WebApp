// PR95 UI V6 L1: real Chromium verification of CURRENT synthetic demo records.
// The actual baseline ItemList, ReportTable and ReportDetailGrid are mounted.
// Only loopback + demo-only memory. No production Firebase, Sheets, publish/deploy.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

import {build} from 'vite';
await build({root:process.cwd(),configFile:false,base:'./',logLevel:'warn',
  build:{outDir:resolve('dist-pr95-v6-l1'),emptyOutDir:true,
    rolldownOptions:{input:resolve('pr95-v6-l1-qa.html')}}});
const root=resolve('dist-pr95-v6-l1');
const server=createServer((req,res)=>{
  try {
    const path=new URL(req.url??'/','http://127.0.0.1').pathname;
    const target=resolve(root,'.'+(path==='/'?'/pr95-v6-l1-qa.html':path));
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
const profile=mkdtempSync(join(tmpdir(),'pr95-v6-l1-'));
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

const visit=async(params,width=1440,height=900)=>{
  await send('Emulation.setDeviceMetricsOverride',
    {width,height,deviceScaleFactor:1,mobile:width<=390});
  await send('Page.navigate',{
    url:'http://127.0.0.1:'+port+'/pr95-v6-l1-qa.html?'+params
  });
  await waitFor("document.querySelector('[data-qa=pr95-v6-l1]')&&window.__v6L1",
    'new V6 page');
  await sleep(250);
  console.log('PR95_V6_L1_BOOT_DIAG '+JSON.stringify(await evaluate('(()=>({root:!!document.querySelector("[data-qa=pr95-v6-l1]"),'+
    'tables:[...document.querySelectorAll("table")].map(t=>({className:t.className,rows:t.querySelectorAll("tbody tr").length})),rootText:document.body.textContent.slice(-1800),html:document.body.innerHTML.slice(-400),'+
    'windowError:window.__v6L1BootError??null}))()')));
  await waitFor("!!document.querySelector('table.item-data-table tbody tr,table.report-detail-grid tbody tr')",
    'mounted REAL table');
};
const testClick=async(js)=>{
  const coords=await evaluate('(()=>{const e='+js+';if(!e)return null;'+
    'e.scrollIntoView({block:"nearest",inline:"center"});'+
    'const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;'+
    'return {x,y,w:r.width,h:r.height,visible:document.elementFromPoint(x,y)?.closest("button")===e};})()');
  assert(coords&&coords.visible,'native click hit target '+js+' '+JSON.stringify(coords));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:coords.x,y:coords.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:coords.x,y:coords.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:coords.x,y:coords.y,button:'left',clickCount:1});
  return coords;
};
const esc=async()=>{
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
};
const typeRow=i=>'.item-data-table tbody tr:nth-child('+i+') .compact-document-badge';
const levelRow=i=>'.item-data-table tbody tr:nth-child('+i+') .compact-stage-level';
const detail=async(scope)=>{
  const data=await evaluate('(()=>{const root=document.querySelector('+JSON.stringify(scope)+');'+
    'if(!root)return null;const frame=root.matches(".compact-document-badge,.pr95-v6-type-cell")?root:'+
    'root.querySelector(".compact-document-badge,.pr95-v6-type-cell");'+
    'if(!frame)return null;const button=frame.querySelector(".cell-picker-trigger");'+
    'const css=getComputedStyle(frame),b=button&&getComputedStyle(button);'+
    'const rect=frame.getBoundingClientRect(),buttonRect=button?.getBoundingClientRect();'+
    'return {kind:frame.dataset.kind,editable:!!button,readonly:!button,'+
    'text:frame.textContent.trim(),frame:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},'+
    'fill:css.backgroundColor,color:css.color,border:css.borderTopWidth,outerRadius:css.borderRadius,'+
    'button:button?{width:buttonRect.width,height:buttonRect.height,border:b.borderTopWidth,'+
    'background:b.backgroundColor,pseudo:getComputedStyle(button,"::after").display,'+
    'cursor:b.cursor}:null,'+
    'allBorders:[...frame.querySelectorAll("*")].filter(x=>getComputedStyle(x).borderTopWidth!=="0px").length};})()');
  assert(data, 'missing type frame '+scope);
  assert(data.border==='1px'&&data.frame.height>=28&&data.frame.height<=38,'type frame height '+JSON.stringify(data));
  if(data.editable)assert(data.button.border==='0px'&&data.allBorders===0,
    'nested type border '+JSON.stringify(data));
  return data;
};
const inspectLevels=async(rootSelector,label)=>{
  const data=await evaluate('(()=>{const root=document.querySelector('+JSON.stringify(rootSelector)+');'+
    'if(!root)return null;const rows=[...root.querySelectorAll(".compact-stage-row[data-stage-field=progressParty]")];'+
    'return rows.slice(0,4).map(row=>{const title=row.querySelector(".compact-stage-title"),'+
    'l=row.querySelector(".compact-stage-level"),button=l?.querySelector(".cell-picker-trigger"),'+
    'open=l?.querySelector(".compact-stage-level-open"),close=l?.querySelector(".compact-stage-level-close");'+
    'if(!l||!open||!close)return null;const lr=l.getBoundingClientRect(),o=open.getBoundingClientRect(),'+
    'c=close.getBoundingClientRect(),br=button?.getBoundingClientRect();'+
    'let textRight=0;if(title.firstChild?.nodeType===Node.TEXT_NODE){const range=document.createRange();'+
    'range.selectNodeContents(title.firstChild);textRight=range.getBoundingClientRect().right;}'+
    'return {text:title.textContent,level:l.textContent,open:o.left,close:c.left,'+
    'buttonRight:br?.right??null,buttonLeft:br?.left??null,margin:parseFloat(getComputedStyle(l).marginLeft),'+
    'line:Math.round(lr.height),titleLine:Math.round(title.getBoundingClientRect().height),'+
    'space:o.left-textRight,caretDisplay:button?getComputedStyle(button,"::after").display:null,'+
    'buttonWidth:br?.width??null};});})()');
  assert(data&&data.length>=3&&data.slice(0,3).every(x=>x&&x.text.includes('Thành ủy (')&&
    x.space>=4&&x.line<=30&&x.titleLine<=30),
    'party label spacing / one line '+label+' '+JSON.stringify(data));
  for(const x of data){
    if(!x)continue;
    if(x.buttonRight!==null)assert(x.buttonRight+1<=x.close,
      'party caret touches closing parenthesis '+label+' '+JSON.stringify(x));
  }
  console.log('PR95_V6_L1_LEVEL_GEOMETRY '+label+' '+JSON.stringify(data));
  return data;
};
const screenshotV6=async(name)=>{
  const img=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const data=Buffer.from(img.data,'base64');
  assert(data.length>4000,'invalid png '+name);
  writeFileSync(name,data);
  console.log('PR95_V6_L1_IMAGE '+JSON.stringify({name,bytes:data.length}));
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
    if(message.method==='Runtime.exceptionThrown')
      console.log('PR95_V6_L1_JS_EXCEPTION '+JSON.stringify(message.params.exceptionDetails));
    if(message.id&&pending.has(message.id)){
      const job=pending.get(message.id);pending.delete(message.id);
      message.error?job.reject(Error(JSON.stringify(message.error))):job.resolve(message.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

  await visit('view=list&role=admin&highlight=1',1440,900);
  const types=[];
  for(let i=1;i<=4;i++)types.push(await detail(typeRow(i)));
  assert(JSON.stringify(types.slice(0,3).map(x=>x.kind))===JSON.stringify(['QPPL','HC','BC']),
    'three kind identity '+JSON.stringify(types));
  assert(new Set(types.slice(0,3).map(x=>x.fill)).size===3,
    'QPPL/HC/BC must NOT share a color '+JSON.stringify(types));
  assert(types[3].text.includes('Loại VB legacy'),'unknown type preserved '+JSON.stringify(types[3]));
  const dept=await evaluate('(()=>{const b=document.querySelector(".item-data-table tbody tr:first-child .compact-document-department .cell-picker-trigger");'+
    'const r=b?.getBoundingClientRect();return r?{w:r.width,h:r.height}:null;})()');
  assert(dept&&Math.abs(types[0].frame.height-dept.h)<=5,
    'type/Sở height mismatch '+JSON.stringify({type:types[0],dept}));
  const lv=await inspectLevels('.item-data-table','list-admin-1440');
  assert(lv[0].level==='(BCH)'&&lv[1].level==='(BTV TU)'&&lv[2].level==='(TTTU)',
    'BCH/BTV TU/TTTU changed '+JSON.stringify(lv));
  const rails=await evaluate('(()=>[...document.querySelectorAll(".item-data-table tbody tr:first-child .compact-stage-row .compact-stage-state button.cell-picker-trigger")].map(b=>Math.round(b.getBoundingClientRect().right)))()');
  assert(rails.length===3&&Math.max(...rails)-Math.min(...rails)<=1,
    'three progress carets changed alignment '+JSON.stringify(rails));
  console.log('PR95_V6_L1_MAIN_THREE_TYPES_LEVELS_PASS '+JSON.stringify({types,dept,rails,levels:lv}));
  await screenshotV6('pr95-v6-l1-list-admin-three-kinds-1440.png');

  const pickType='.item-data-table tbody tr:first-child .compact-document-badge button.cell-picker-trigger';
  await testClick('document.querySelector('+JSON.stringify(pickType)+')');
  await waitFor('!!document.querySelector(".cell-picker-popover:popover-open")','type picker opened');
  const options=await evaluate('[...document.querySelectorAll(".cell-picker-popover:popover-open .cell-picker-option")].map(b=>({value:b.textContent.trim(),selected:b.getAttribute("aria-selected")}))');
  assert(options.some(x=>x.value==='—')&&options.some(x=>x.value==='QPPL'&&x.selected==='true'),
    'type optional clear & unchanged selection '+JSON.stringify(options));
  await screenshotV6('pr95-v6-l1-type-real-dropdown.png');
  await esc();await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','type Esc');
  const noPatch=await evaluate('window.__v6L1.snapshot().patches.length');
  assert(noPatch===0,'Esc should not patch source');

  // Custom highlight above intentionally overrides QPPL. Inspect the real
  // base palette separately without that override, not just three variants.
  await visit('view=list&role=admin',1440,900);
  const kindPalette=[];
  for(let i=1;i<=3;i++)kindPalette.push(await detail(typeRow(i)));
  assert(JSON.stringify(kindPalette.map(x=>x.fill))===JSON.stringify([
    'rgb(245, 243, 255)','rgb(239, 246, 255)','rgb(241, 245, 249)'
  ]),'document-kind palette changed or status colors leaked '+JSON.stringify(kindPalette));
  assert(JSON.stringify(kindPalette.map(x=>x.color))===JSON.stringify([
    'rgb(91, 33, 182)','rgb(29, 78, 216)','rgb(51, 65, 85)'
  ]),'type inks must preserve contrast '+JSON.stringify(kindPalette));
  console.log('PR95_V6_L1_TYPE_PALETTE_BASE_AND_CUSTOM_PASS '+JSON.stringify({base:kindPalette,custom:types[0]}));
  await screenshotV6('pr95-v6-l1-list-palette-without-highlight.png');

  await visit('view=list&role=readonly',1280,850);
  const readonly=await detail(typeRow(1));
  assert(!readonly.editable,'readonly still editable');
  const readonlyLevels=await inspectLevels('.item-data-table','list-readonly-1280');
  assert(readonlyLevels.slice(0,3).every(x=>x.buttonRight===null),
    'readonly level editor unexpectedly exists');
  await screenshotV6('pr95-v6-l1-list-readonly-1280.png');

  await visit('view=list&role=mixed',1280,850);
  const mixed=await evaluate('(()=>{const rows=[...document.querySelectorAll(".item-data-table tbody tr")];'+
    'return rows.slice(0,3).map(r=>({type:!!r.querySelector(".compact-document-badge .cell-picker-trigger"),'+
    'level:!!r.querySelector(".compact-stage-level .cell-picker-trigger"),'+
    'stages:r.querySelectorAll(".compact-stage-state button.cell-picker-trigger").length}));})()');
  assert(mixed[0].type&& !mixed[0].level&&mixed[0].stages===0&&
    !mixed[1].type&&mixed[1].level&&mixed[1].stages===0&&
    !mixed[2].type&&!mixed[2].level,
    'mixed grants leak across field '+JSON.stringify(mixed));
  await inspectLevels('.item-data-table','list-mixed-1280');
  await screenshotV6('pr95-v6-l1-list-mixed-grants-1280.png');
  await testClick('document.querySelector(".item-data-table tbody tr:first-child .compact-document-badge button.cell-picker-trigger")');
  await waitFor('!!document.querySelector(".cell-picker-popover:popover-open")','granted type');
  await esc();

  await visit('view=list&role=admin&split=1',1440,900);
  const standalone=await detail('.item-data-table tbody tr:first-child td[data-col-key=type]');
  assert(standalone.editable&&standalone.kind==='QPPL','separate type editor missing '+JSON.stringify(standalone));
  await screenshotV6('pr95-v6-l1-type-standalone-1440.png');

  // Saved narrow widths must not split the Cấp trình caption/caret,
  // even when the stage group uses its horizontal inner scroll fallback.
  await visit('view=list&role=admin&narrow=1',1280,760);
  await inspectLevels('.item-data-table','list-saved-narrow-1280');
  const narrowScroll=await evaluate('(()=>{const s=document.querySelector(".item-data-table tbody tr:first-child .compact-stages");'+
    'return {client:s?.clientWidth,scroll:s?.scrollWidth,overflow:getComputedStyle(s).overflowX};})()');
  assert(narrowScroll&&narrowScroll.scroll>=narrowScroll.client,
    'narrow stage scrolling contract '+JSON.stringify(narrowScroll));
  await evaluate('document.querySelector(".item-data-table tbody tr:first-child .compact-stage-level")?.scrollIntoView({block:"nearest",inline:"center"})');
  await screenshotV6('pr95-v6-l1-saved-narrow-level-1280.png');
  console.log('PR95_V6_L1_NARROW_LEVEL_PASS '+JSON.stringify(narrowScroll));

  await visit('view=list&role=admin',390,844);
  await inspectLevels('.item-data-table','list-mobile-390');
  await screenshotV6('pr95-v6-l1-list-mobile-390.png');
  await evaluate('document.querySelector(".item-data-table tbody tr:first-child .compact-stage-level")?.scrollIntoView({block:"nearest",inline:"center"})');
  await sleep(120);
  await screenshotV6('pr95-v6-l1-list-mobile-390-level-visible.png');

  await visit('view=popup&role=readonly',1440,900);
  const pRead=await evaluate('(()=>{const td=document.querySelector(".report-detail-grid tbody tr:first-child");'+
    'return {badge:!!td?.querySelector(".compact-document-badge"),'+
    'typeEditable:!!td?.querySelector(".compact-document-badge .cell-picker-trigger")};})()');
  assert(!pRead.typeEditable,'popup readonly type unexpectedly editable '+JSON.stringify(pRead));
  await screenshotV6('pr95-v6-l1-popup-readonly-1440.png');

  await visit('view=popup&role=admin',1440,900);
  await waitFor('[...document.querySelectorAll(".report-grid-actions button")].some(b=>b.textContent.includes("Chỉnh sửa nháp"))',
    'popup admin edit toggle');
  await evaluate('(()=>{const buttons=[...document.querySelectorAll(".report-grid-actions button")];'+
    'buttons.find(b=>b.textContent.includes("Chỉnh sửa nháp"))?.click();})()');
  await waitFor('!!document.querySelector(".report-detail-grid .compact-stage-level")','popup grouped level');
  const popLevels=await inspectLevels('.report-detail-grid','popup-admin-1440');
  const popupGroupedType=await detail('.report-detail-grid tbody tr:first-child .compact-document-badge');
  assert(popupGroupedType.editable&&popupGroupedType.allBorders===0,
    'popup grouped Loại VB has double border '+JSON.stringify(popupGroupedType));
  console.log('PR95_V6_L1_POPUP_GROUPED_TYPE_PASS '+JSON.stringify(popupGroupedType));
  await screenshotV6('pr95-v6-l1-popup-admin-grouped-1440.png');
  // The UI's "Hiện đủ cột Excel" legitimately switches away from grouping.
  await evaluate('(()=>{const buttons=[...document.querySelectorAll(".report-grid-actions button")];'+
    'buttons.find(b=>b.textContent.includes("Hiện đủ cột Excel"))?.click();})()');
  await waitFor('!!document.querySelector(".report-detail-grid td[data-col-key=type] .cell-picker-trigger")',
    'popup standalone type');
  const popupInspect=await detail('.report-detail-grid tbody tr:first-child td[data-col-key=type]');
  assert(popupInspect.editable&&popupInspect.kind==='QPPL',
    'popup ungrouped type must stay dropdown '+JSON.stringify(popupInspect));
  console.log('PR95_V6_L1_POPUP_EDITOR '+JSON.stringify(popupInspect));
  await screenshotV6('pr95-v6-l1-popup-admin-standalone-1440.png');
  await visit('view=popup&role=admin',390,844);
  await waitFor('[...document.querySelectorAll(".report-grid-actions button")].some(b=>b.textContent.includes("Chỉnh sửa nháp"))',
    'mobile popup edit toggle');
  await evaluate('(()=>{const b=[...document.querySelectorAll(".report-grid-actions button")];'+
    'b.find(x=>x.textContent.includes("Chỉnh sửa nháp"))?.click();})()');
  await waitFor('!!document.querySelector(".report-detail-grid .compact-stage-level")','mobile grouped stage');
  await inspectLevels('.report-detail-grid','popup-mobile-390');
  await screenshotV6('pr95-v6-l1-popup-mobile-grouped-390.png');
  await evaluate('document.querySelector(".report-detail-grid tbody tr:first-child .compact-stage-level")?.scrollIntoView({block:"nearest",inline:"center"})');
  await sleep(120);
  await screenshotV6('pr95-v6-l1-popup-mobile-390-level-visible.png');
  await evaluate('(()=>{const b=[...document.querySelectorAll(".report-grid-actions button")];'+
    'b.find(x=>x.textContent.includes("Hiện đủ cột Excel"))?.click();})()');
  await waitFor('!!document.querySelector(".report-detail-grid td[data-col-key=type] .cell-picker-trigger")','mobile popup standalone type');
  await screenshotV6('pr95-v6-l1-popup-mobile-standalone-390.png');
  await evaluate('document.querySelector(".report-detail-grid tbody tr:first-child td[data-col-key=type] .cell-picker-trigger")?.scrollIntoView({block:"nearest",inline:"center"})');
  await sleep(120);
  await screenshotV6('pr95-v6-l1-popup-mobile-390-type-visible.png');
  const forbidden=network.filter(x=>['firebaseio','firebasedatabase','identitytoolkit','securetoken',
    'docs.google.com/spreadsheets','sheets.googleapis.com'].some(z=>x.toLowerCase().includes(z)));
  assert(forbidden.length===0,'production endpoint accessed '+JSON.stringify(forbidden));
  console.log('PR95_V6_L1_CHROME_PASS '+JSON.stringify({
    threeKinds:['QPPL','HC','BC'],legacy:true,levels:['BCH','BTV TU','TTTU'],
    main:true,popup:true,readonly:true,admin:true,mixed:true,separate:true,
    desktop:1440,medium:1280,mobile:390,narrow:true,noPatch:true,
    stageRails:rails,productionRequests:0
  }));
}finally {
  for(const job of pending.values())job.reject(Error('Chrome closing'));
  pending.clear();ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
