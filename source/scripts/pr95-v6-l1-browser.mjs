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
  const query=new URLSearchParams(params);
  const evidenceLabel=[query.get('view')??'list',query.get('role')??'admin',
    ...['highlight','split','narrow'].filter(key=>query.get(key)==='1'),width+'x'+height].join('-');
  await captureScrollEvidence('pr95-v6-l1-'+evidenceLabel+'-initial-before-scroll.png',
    query.get('view')==='popup'?'.report-detail-grid':'.item-data-table');
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
  const data=await evaluate('('+function inspect(rootSelector){
    const root=document.querySelector(rootSelector);
    if(!root)return null;
    const frame=root.matches(".compact-document-badge,.pr95-v6-type-cell")?root:
      root.querySelector(".compact-document-badge,.pr95-v6-type-cell");
    if(!frame)return null;
    const button=frame.querySelector("button.cell-picker-trigger");
    const grouped=!!frame.closest(".compact-document-heading[data-metadata-mode=editable]");
    const target=grouped&&button?button:frame;
    const css=getComputedStyle(target),outer=getComputedStyle(frame);
    const rect=target.getBoundingClientRect(),br=button?.getBoundingClientRect();
    const bc=button?getComputedStyle(button):null;
    return {kind:frame.dataset.kind,editable:!!button,grouped,
      text:frame.textContent.trim(),frame:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
      fill:css.backgroundColor,color:css.color,border:css.borderTopWidth,
      outerBorder:outer.borderTopWidth,outerRadius:css.borderRadius,
      button:button?{width:br.width,height:br.height,border:bc.borderTopWidth,
        background:bc.backgroundColor,cursor:bc.cursor}:null,
      borders:[...frame.querySelectorAll("*")].filter(x=>getComputedStyle(x).borderTopWidth!=="0px").length};
  }.toString()+')('+JSON.stringify(scope)+')');
  assert(data,'missing type frame '+scope);
  if(data.editable&&data.grouped)assert(data.outerBorder==='0px'&&data.border!=='0px'&&
    data.frame.height>=32&&data.frame.height<=38&&data.borders===1,
    'REV2 grouped type single picker frame '+JSON.stringify(data));
  else if(data.editable)assert(data.border==='1px'&&data.button.border==='0px',
    'standalone type picker frame '+JSON.stringify(data));
  else assert(data.border==='0px'&&data.frame.height>=14,
    'readonly type remains unframed '+JSON.stringify(data));
  return data;
};
// REV2: Compare left, width and HEIGHT of every progress track in each record.
const inspectLevels=async(rootSelector,label)=>{
  const data=await evaluate('('+function measure(rootSelector){
    const root=document.querySelector(rootSelector);if(!root)return null;
    const rect=e=>{const r=e?.getBoundingClientRect();return r?
      {left:r.left,right:r.right,width:r.width,height:r.height}:null;};
    const spread=a=>a.length?Math.max(...a)-Math.min(...a):0;
    return [...root.querySelectorAll('.compact-stages[data-rev2=true]')].slice(0,7).map(group=>{
      const rows=[...group.querySelectorAll('.compact-stage-row')],first=rows[0];
      const title=first?.querySelector('.compact-stage-title');
      const level=first?.querySelector('.compact-stage-level');
      const levelButton=level?.querySelector('button.cell-picker-trigger');
      const states=rows.map(r=>r.querySelector('.compact-stage-state'));
      const boxes=states.map(rect),buttons=states.map(e=>e?.querySelector('button.cell-picker-trigger'));
      const buttonBoxes=buttons.filter(Boolean).map(rect);
      const mod=group.dataset.levelLayout;
      const caption=levelButton||title;
      return {mode:mod,level:level?.textContent?.trim()??'',
        notRequired:first?.dataset.levelNotRequired==='true',
        labels:rows.map(r=>r.querySelector('.compact-stage-title')?.firstChild?.textContent?.trim()),
        levelButton:!!levelButton,levelAria:levelButton?.getAttribute('aria-label'),
        stateAria:buttons.map(b=>b?.getAttribute('aria-label')??null),
        stateRect:boxes,buttonRect:buttonBoxes,
        stateLeftSpread:spread(boxes.map(r=>r.left)),
        stateWidthSpread:spread(boxes.map(r=>r.width)),
        stateHeightSpread:spread(boxes.map(r=>r.height)),
        buttonLeftSpread:spread(buttonBoxes.map(r=>r.left)),
        buttonWidthSpread:spread(buttonBoxes.map(r=>r.width)),
        buttonHeightSpread:spread(buttonBoxes.map(r=>r.height)),
        captionStateGap:(boxes[0]?.left??0)-(rect(caption)?.right??0),
        insideScroll:group.scrollWidth>group.clientWidth,
        groupClient:group.clientWidth,groupScroll:group.scrollWidth,
        gridColumns:getComputedStyle(group).gridTemplateColumns,
        rowFrames:rows.map(r=>getComputedStyle(r).borderTopWidth),
        buttonRailPseudo:buttons.filter(Boolean).map(b=>getComputedStyle(b,'::before').content),
        paints:buttons.filter(Boolean).map(b=>({background:getComputedStyle(b).backgroundColor,
          color:getComputedStyle(b).color,border:getComputedStyle(b).borderTopWidth}))};
    });
  }.toString()+')('+JSON.stringify(rootSelector)+')');
  assert(data&&data.length>=6,'missing grouped L03 '+label+' '+JSON.stringify(data));
  assert(data.every(x=>JSON.stringify(x.labels)===JSON.stringify(
    ['Thành ủy','Trình Xây dựng NQ','Trình ban hành NQ'])),
    'REV2 labels '+label+' '+JSON.stringify(data));
  for(const row of data){
    assert((row.mode==='editable'||row.mode==='readonly')&&
      row.levelButton===(row.mode==='editable')&&
      (row.mode!=='editable'||!row.level.includes('(')),
      'REV2 2/3 tracks '+label+' '+JSON.stringify(row));
    assert(row.captionStateGap>=6&&row.stateLeftSpread<=2&&row.stateWidthSpread<=2&&
      row.stateHeightSpread<=2&&row.buttonLeftSpread<=2&&row.buttonWidthSpread<=2&&
      row.buttonHeightSpread<=2,
      'REV2 status rectangles align '+label+' '+JSON.stringify(row));
    assert(row.rowFrames.every(x=>x==='0px')&&row.buttonRailPseudo.every(x=>x==='none'),
      'REV2 no outer frame or shaded caret rail '+label+' '+JSON.stringify(row));
    assert(row.buttonRect.every(x=>x.height>=34&&x.height<=38)&&
      row.paints.every(x=>x.background!=='rgba(0, 0, 0, 0)'&&x.border!=='0px'),
      'REV2 actual colored standard button '+label+' '+JSON.stringify(row));
    assert(!row.notRequired||row.level==='',
      'REV2 no redundant readonly nonrequired level '+label+' '+JSON.stringify(row));
  }
  console.log('UI_A_REV2_L03_GEOMETRY_PASS '+label+' '+JSON.stringify(data));
  return data;
};
const assertStageHitTargets=async(rootSelector,label)=>{
  const data=await evaluate('(()=>{const root=document.querySelector('+JSON.stringify(rootSelector)+');'+
    'if(!root)return null;const rows=[...root.querySelectorAll(".compact-stage-row[data-stage-field=progressParty]")].slice(0,6);'+
    'const hit=target=>{if(!target)return {ok:false,reason:"missing"};'+
    'target.scrollIntoView({block:"nearest",inline:"center"});'+
    'const r=target.getBoundingClientRect();let left=Math.max(1,r.left+1),right=Math.min(innerWidth-1,r.right-1),'+
    'top=Math.max(1,r.top+1),bottom=Math.min(innerHeight-1,r.bottom-1);'+
    'for(let a=target.parentElement;a&&a!==document.body;a=a.parentElement){'+
    'const cs=getComputedStyle(a),ar=a.getBoundingClientRect();'+
    'if(cs.overflowX!=="visible"){left=Math.max(left,ar.left+2);right=Math.min(right,ar.right-2);}'+
    'if(cs.overflowY!=="visible"){top=Math.max(top,ar.top+2);bottom=Math.min(bottom,ar.bottom-2);}'+
    '}if(right-left<3||bottom-top<3)return {ok:false,reason:"clipped",left,right,top,bottom};'+
    'const x=(left+right)/2,y=(top+bottom)/2,found=document.elementFromPoint(x,y);'+
    'return {ok:!!found&&(target===found||target.contains(found)),x,y,hit:found?.className?.toString().slice(0,120)};};'+
    'return rows.map((row,i)=>{const level=row.querySelector(".compact-stage-level"),'+
    'state=row.querySelector(".compact-stage-state"),'+
    'levelTarget=level?.querySelector("button.cell-picker-trigger")||level||row.querySelector(".compact-stage-title"),'+
    'stateTarget=state?.querySelector("button.cell-picker-trigger")||state;'+
    'return {row:i,level:hit(levelTarget),state:hit(stateTarget),'+
    'independentTargets:!levelTarget?.contains(stateTarget)&&!stateTarget?.contains(levelTarget)};});})()');
  assert(data&&data.length===6&&data.every(x=>x.independentTargets&&x.level.ok&&x.state.ok),
    'UI6-R01 hit regions must remain independent '+label+' '+JSON.stringify(data));
  console.log('UI6_R01_INDEPENDENT_HIT_TARGETS_PASS '+label+' '+JSON.stringify(data));
  await captureScrollEvidence('pr95-v6-l1-'+label+'-after-field-scroll.png',rootSelector);
  return data;
};
const screenshotV6=async(name)=>{
  const img=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const data=Buffer.from(img.data,'base64');
  assert(data.length>4000,'invalid png '+name);
  writeFileSync(name,data);
  console.log('PR95_V6_L1_IMAGE '+JSON.stringify({name,bytes:data.length}));
};
// Read-only measurements: this helper never calls scrollIntoView, changes a
// saved width or moves a scrollbar. Initial and reached-after-scroll evidence
// must not be mistaken for all controls being simultaneously visible.
const captureScrollEvidence=async(name,rootSelector)=>{
  const state=await evaluate('('+function inspectInitialScroll(selector){
    const root=document.querySelector(selector);
    if(!root)return null;
    const visibleRect=element=>{
      if(!element)return null;
      const r=element.getBoundingClientRect();
      let left=Math.max(0,r.left),right=Math.min(innerWidth,r.right);
      let top=Math.max(0,r.top),bottom=Math.min(innerHeight,r.bottom);
      for(let ancestor=element.parentElement;ancestor;ancestor=ancestor.parentElement){
        const css=getComputedStyle(ancestor),a=ancestor.getBoundingClientRect();
        if(css.overflowX!=='visible'){left=Math.max(left,a.left);right=Math.min(right,a.right);}
        if(css.overflowY!=='visible'){top=Math.max(top,a.top);bottom=Math.min(bottom,a.bottom);}
      }
      const width=Math.max(0,right-left),height=Math.max(0,bottom-top);
      return {rect:r.toJSON(),visible:{left,top,width,height},
        fullyVisible:width>=r.width-1&&height>=r.height-1};
    };
    const scrollState=element=>element?{
      className:element.className,scrollLeft:element.scrollLeft,scrollTop:element.scrollTop,
      clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,
      clientHeight:element.clientHeight,scrollHeight:element.scrollHeight,
      overflowX:getComputedStyle(element).overflowX,rect:element.getBoundingClientRect().toJSON()
    }:null;
    return {viewport:{width:innerWidth,height:innerHeight},tableRows:root.querySelectorAll('tbody tr').length,
      documentScroll:{left:document.scrollingElement.scrollLeft,top:document.scrollingElement.scrollTop},
      tableViewport:scrollState(root.closest('.item-table-scroll,.report-grid-scroll')),
      stages:[...root.querySelectorAll('.compact-stage-row[data-stage-field=progressParty]')]
        .slice(0,6).map((row,index)=>({row:index,
          caption:visibleRect(row.querySelector('.compact-stage-title')),
          level:visibleRect(row.querySelector('.compact-stage-level')),
          state:visibleRect(row.querySelector('.compact-stage-state')),
          innerScroll:scrollState(row.closest('.compact-stages'))}))};
  }.toString()+')('+JSON.stringify(rootSelector)+')');
  assert(state&&state.tableRows>0,'missing scroll evidence '+name);
  console.log('PR95_V6_L1_SCROLL_VISIBILITY_EVIDENCE '+JSON.stringify({name,...state,
    interpretation:'Each visible rectangle belongs to this screenshot only; later scroll access is not simultaneous visibility.'}));
  await screenshotV6(name);
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
  await assertStageHitTargets('.item-data-table','list-admin-1440');
  assert(lv[0].level.replace(/[()]/g,'').trim()==='BCH'&&lv[1].level.replace(/[()]/g,'').trim()==='BTV TU'&&lv[2].level.replace(/[()]/g,'').trim()==='TTTU',
    'BCH/BTV TU/TTTU changed '+JSON.stringify(lv));
  const rails=lv[0].stateRect.map(r=>({left:r.left,width:r.width,height:r.height}));
  assert(rails.length===3&&lv[0].stateLeftSpread<=2&&lv[0].stateWidthSpread<=2&&lv[0].stateHeightSpread<=2,
    'REV2 status left/width/height alignment '+JSON.stringify(rails));
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
  await assertStageHitTargets('.item-data-table','list-readonly-1280');
  assert(readonlyLevels.slice(0,3).every(x=>!x.levelButton&&x.mode==='readonly'),
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
  await assertStageHitTargets('.item-data-table','list-mixed-1280');
  await evaluate('document.querySelector(".item-data-table tbody tr:nth-child(2) .compact-stage-level")?.scrollIntoView({block:"nearest",inline:"center"})');
  await screenshotV6('pr95-v6-l1-ui6-r01-mixed-bvt-tu-state-separated-1280.png');
  await evaluate('document.querySelector(".item-data-table tbody tr:nth-child(5) .compact-stage-state")?.scrollIntoView({block:"nearest",inline:"center"})');
  const notRequired=await evaluate('[...document.querySelectorAll(".item-data-table .compact-stage-state")].some(e=>e.textContent?.includes("Không phải trình"))');
  assert(notRequired,'UI6-R01 nonrequired status must appear in real List');
  await screenshotV6('pr95-v6-l1-ui6-r01-khong-phai-trinh-1280.png');
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
  await assertStageHitTargets('.item-data-table','list-saved-narrow-1280');
  const narrowScroll=await evaluate('(()=>{const s=document.querySelector(".item-data-table tbody tr:first-child .compact-stages");'+
    'return {client:s?.clientWidth,scroll:s?.scrollWidth,overflow:getComputedStyle(s).overflowX};})()');
  assert(narrowScroll&&narrowScroll.scroll>=narrowScroll.client,
    'narrow stage scrolling contract '+JSON.stringify(narrowScroll));
  await evaluate('document.querySelector(".item-data-table tbody tr:first-child .compact-stage-level")?.scrollIntoView({block:"nearest",inline:"center"})');
  await screenshotV6('pr95-v6-l1-saved-narrow-level-1280.png');
  console.log('PR95_V6_L1_NARROW_LEVEL_PASS '+JSON.stringify(narrowScroll));

  // Worker A: tablet-width geometry and read-only nonrequired caption.
  await visit('view=list&role=readonly',900,800);
  const tabletLevels=await inspectLevels('.item-data-table','list-readonly-900');
  // The V6 fixture can contain a nonrequired PROGRESS with a different
  // canonical party LEVEL. Do not fabricate a nonrequired level in that row.
  // Synthetic unit regression separately renders the exact level value.
  assert(tabletLevels.every(x=>!x.notRequired||x.level===''),
    'tablet: suppress only readonly nonrequired party LEVEL');
  await assertStageHitTargets('.item-data-table','list-readonly-900');
  await screenshotV6('worker-a-list-readonly-900.png');

  await visit('view=list&role=admin',390,844);
  await inspectLevels('.item-data-table','list-mobile-390');
  await assertStageHitTargets('.item-data-table','list-mobile-390');
  await screenshotV6('pr95-v6-l1-list-mobile-390.png');
  await evaluate('document.querySelector(".item-data-table tbody tr:first-child .compact-stage-level")?.scrollIntoView({block:"nearest",inline:"center"})');
  await sleep(120);
  await screenshotV6('pr95-v6-l1-list-mobile-390-level-visible.png');

  await visit('view=popup&role=readonly',1440,900);
  const pRead=await evaluate('(()=>{const td=document.querySelector(".report-detail-grid tbody tr:first-child");'+
    'return {badge:!!td?.querySelector(".compact-document-badge"),'+
    'typeEditable:!!td?.querySelector(".compact-document-badge .cell-picker-trigger")};})()');
  assert(!pRead.typeEditable,'popup readonly type unexpectedly editable '+JSON.stringify(pRead));
  await inspectLevels('.report-detail-grid','popup-readonly-1440');
  await assertStageHitTargets('.report-detail-grid','popup-readonly-1440');
  await screenshotV6('pr95-v6-l1-popup-readonly-1440.png');

  await visit('view=popup&role=readonly',900,800);
  await inspectLevels('.report-detail-grid','popup-readonly-900');
  await assertStageHitTargets('.report-detail-grid','popup-readonly-900');
  await screenshotV6('worker-a-popup-readonly-900.png');

  await visit('view=popup&role=admin',1440,900);
  await waitFor('[...document.querySelectorAll(".report-grid-actions button")].some(b=>b.textContent.includes("Chỉnh sửa nháp"))',
    'popup admin edit toggle');
  await evaluate('(()=>{const buttons=[...document.querySelectorAll(".report-grid-actions button")];'+
    'buttons.find(b=>b.textContent.includes("Chỉnh sửa nháp"))?.click();})()');
  await waitFor('!!document.querySelector(".report-detail-grid .compact-stage-level")','popup grouped level');
  await captureScrollEvidence('pr95-v6-l1-popup-admin-1440-edit-initial-before-scroll.png','.report-detail-grid');
  const popLevels=await inspectLevels('.report-detail-grid','popup-admin-1440');
  await assertStageHitTargets('.report-detail-grid','popup-admin-1440');
  await evaluate('document.querySelector(".report-detail-grid tbody tr:nth-child(2) .compact-stage-level")?.scrollIntoView({block:"nearest",inline:"center"})');
  await screenshotV6('pr95-v6-l1-ui6-r01-popup-bvt-tu-state-separated-1440.png');
  await evaluate('document.querySelector(".report-detail-grid tbody tr:nth-child(5) .compact-stage-state")?.scrollIntoView({block:"nearest",inline:"center"})');
  await screenshotV6('pr95-v6-l1-ui6-r01-popup-khong-phai-trinh-1440.png');
  const popupGroupedType=await detail('.report-detail-grid tbody tr:first-child .compact-document-badge');
  assert(popupGroupedType.editable&&popupGroupedType.grouped&&popupGroupedType.borders===1,
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
  await captureScrollEvidence('pr95-v6-l1-popup-admin-390-edit-initial-before-scroll.png','.report-detail-grid');
  await inspectLevels('.report-detail-grid','popup-mobile-390');
  await assertStageHitTargets('.report-detail-grid','popup-mobile-390');
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
    stageRails:rails,rev2:true,captionStateGapAsserted:true,independentHitTargets:true,
    nonrequiredScreenshot:true,productionRequests:0
  }));
}finally {
  for(const job of pending.values())job.reject(Error('Chrome closing'));
  pending.clear();ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
