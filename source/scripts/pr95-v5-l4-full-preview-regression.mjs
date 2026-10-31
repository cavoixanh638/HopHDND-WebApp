/** UI V5 L4 dedicated regression fork of the existing full synthetic Chrome QA.
 * The baseline V4 script keeps its old immutable semantics. The ONLY changed
 * expectations here are the V5 effective Build status and locked HC/BC members.
 * All Excel/roles/guest-grant/revoke/file:// tests remain identical.
 */
// PR95 UI V3 L5: local-built synthetic preview + real Chromium CDP.
// No Firebase emulator, real network, auth, Google Sheets or deployment.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {setTimeout as sleep} from 'node:timers/promises';
import * as XLSX from 'xlsx';

const root=resolve('dist-compact-qa');
const server=createServer((request,response)=>{
  try{
    const url=new URL(request.url??'/','http://127.0.0.1');
    const path=url.pathname==='/'?'/compact-qa.html':url.pathname;
    const target=resolve(root,'.'+path);
    if(!(target===root||target.startsWith(root+'/'))||!statSync(target).isFile())throw Error('404');
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml',
      '.png':'image/png','.woff2':'font/woff2'}[extname(target)]??'application/octet-stream';
    response.writeHead(200,{'content-type':mime,'cache-control':'no-store'});
    response.end(readFileSync(target));
  }catch{response.writeHead(404);response.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('No Chromium available for L4 preview UI smoke');
const userDir=mkdtempSync(join(tmpdir(),'pr95-v5-l4-regression-preview-'));
let browser,ws,seq=0;
const pending=new Map();
const send=(method,params={})=>new Promise((done,fail)=>{
  const id=++seq;pending.set(id,{done,fail});
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);fail(Error('CDP timeout '+method));}},12000);
});
const evaluate=async js=>{
  const result=await send('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('Browser JS exception: '+JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};
const ensure=async(js,label)=>{
  const value=await evaluate('Boolean('+js+')');
  if(!value)throw Error('PR95_V3_L5_BROWSER_FAIL '+label);
};
const interact=async js=>evaluate('(()=>{'+js+';return true;})()');
const clickText=async text=>{
  const alias={'Tài khoản':'Tài khoản và dữ liệu','Cài đặt':'Cài đặt báo cáo và màu sắc',
    'Phân quyền chỉnh sửa':'Phân quyền chỉnh sửa ô'}[text]??text;
  const find='[...document.querySelectorAll("button")].some(x=>x.textContent?.trim()==='+JSON.stringify(alias)+'||(x.matches(".pr95-preview-nav .primary-section-card")&&x.textContent?.trim().startsWith('+JSON.stringify(alias)+')))';
  if(!await evaluate('Boolean('+find+')')){
    await interact('const gear=document.querySelector(".pr95-preview-gear");if(!gear)throw Error("No gear");gear.click()');
    await waitFor('[...document.querySelectorAll(".pr95-preview-gear-menu button")].some(x=>x.textContent?.trim()==='+JSON.stringify(alias)+')','gear menu item '+alias);
  }
  return interact('const label='+JSON.stringify(alias)+';'+
    'const button=[...document.querySelectorAll("button")].find(x=>x.textContent?.trim()===label||(x.matches(".pr95-preview-nav .primary-section-card")&&x.textContent?.trim().startsWith(label)));'+
    'if(!button)throw Error("Button missing: "+label);button.click()');
};
const selectValue=async(selector,value)=>{
  if(selector==='#pr95-role'){
    if(!['guest','admin'].includes(value))throw Error('Bad simulated role');
    return clickText(value==='guest'?'Đăng xuất mô phỏng':'Đăng nhập quản trị (mô phỏng)');
  }
  return interact('const input=document.querySelector('+JSON.stringify(selector)+');if(!input)throw Error("Select missing");'+
    'input.value='+JSON.stringify(value)+';input.dispatchEvent(new Event("change",{bubbles:true}))');
};
const screenshot=async name=>{
  const result=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const data=Buffer.from(result.data,'base64');
  if(data.length<10000)throw Error('Bad screenshot '+name+' '+data.length);
  writeFileSync(name,data);
  console.log('PR95_V3_L5_SCREENSHOT '+name+' '+data.length);
};

const assertV4StatusDisplay=async (scope,label,fullCatalog=false)=>{
  const info=await evaluate('(()=>{const root=document.querySelector('+JSON.stringify(scope)+');'+
    'if(!root)return null;const texts=[...root.querySelectorAll(".compact-stage-state,.compact-stage-level")]'+
    '.map(e=>e.textContent.trim()).filter(Boolean);return {count:texts.length,texts};})()');
  if(!info||info.count<3)throw Error('UI_V4_L1_MISSING_STAGES '+label);
  for(const old of ['Ban Chấp hành','VP đang thực hiện','ĐU đã gửi TU, chưa họp',
    'Đã họp/xin phiếu, chưa có TBKL','Đã trình HĐND, chưa có QĐ']){
    if(info.texts.some(t=>t.includes(old)))throw Error('UI_V4_L1_RAW_ALIAS_LEAK '+label+' '+old);
  }
  if(fullCatalog){
    // V5: HC/BC default Build is effectively "Không phải trình". The
    // intermediate milestone is *not* required to be seeded in the default
    // dataset; a separate QPPL A–O fixture below proves it is preserved.
    for(const current of ['BCH','BTV TU','VP đang xử lý','ĐU gửi TU, chưa họp','Không phải trình']){
      if(!info.texts.some(t=>t.includes(current)))throw Error('UI_V4_L1_CANONICAL_MISSING '+label+' '+current);
    }
    const types=await evaluate(`(()=>{
      const list=document.querySelector(".item-data-table");
      if(!list)return [];
      return [...list.querySelectorAll('tbody tr')].map(row=>{
        const kind=row.querySelector('.compact-document-badge')?.textContent?.trim()??'';
        const stage=row.querySelector('[data-stage-field=progressBuild]');
        const state=stage?.querySelector('.compact-stage-state');
        return {kind,value:state?.textContent?.trim()??'',locked:!!state?.querySelector('.business-build-locked'),
          editor:!!state?.querySelector('button.cell-picker-trigger')};
      }).filter(item=>item.kind==='HC'||item.kind==='Báo cáo');
    })()`);
    if(!types.length||types.some(x=>x.value!=='Không phải trình'||!x.locked||x.editor))
      throw Error('UI_V5_DEFAULT_HC_BC_EFFECTIVE_BUILD_FAIL '+JSON.stringify(types));
    console.log('UI_V5_DEFAULT_HC_BC_EFFECTIVE_BUILD_PASS '+JSON.stringify({
      scoped:types.length,hc:types.filter(x=>x.kind==='HC').length,
      bc:types.filter(x=>x.kind==='Báo cáo').length}));
  }
  console.log('UI_V4_L1_CANONICAL_DEFAULT_DEMO_PASS '+label+' '+JSON.stringify({stages:info.count}));
};

/* R-V3-04/05: inspect the ACTUAL rendered Chrome rectangles/computed CSS.
   These asserts supplement, never replace, keyboard/filter/permissions tests. */
const inspectSummary=async(label,expected)=>{
  const geometry=await evaluate('(()=>{const result={};for(const id of ["party","build","nq"]){'+
    'const card=document.querySelector(".item-summary-"+id);if(!card)return null;'+
    'const buckets=[...card.querySelectorAll(".item-summary-bucket")];'+
    'const tops=buckets.map(b=>Math.round(b.getBoundingClientRect().top));'+
    'const rows=[...new Set(tops)].map(t=>tops.filter(y=>y===t).length);'+
    'const labels=buckets.map(b=>{const span=b.querySelector("span");const range=document.createRange();range.selectNodeContents(span);'+
    'const text=range.getBoundingClientRect(),rect=b.getBoundingClientRect();return {label:span.textContent,fit:text.left>=rect.left+1&&text.right<=rect.right-1,top:Math.round(rect.top),width:Math.round(rect.width)};});'+
    'result[id]={width:Math.round(card.getBoundingClientRect().width),rows,labels};}return result;})()');
  if(!geometry)throw Error('R_V3_04_MISSING_SUMMARY '+label);
  for(const id of ['party','build','nq']){
    const found=geometry[id],want=expected[id];
    if(JSON.stringify(found.rows)!==JSON.stringify(want))
      throw Error('R_V3_04_BAD_BUCKET_ROWS '+label+' '+id+' '+JSON.stringify({want,found}));
    if(found.labels.some(l=>!l.fit))
      throw Error('R_V3_04_LABEL_OVERFLOW '+label+' '+id+' '+JSON.stringify(found.labels));
  }
  console.log('R_V3_04_SUMMARY_GEOMETRY_PASS '+label+' '+JSON.stringify(geometry));
};
const inspectGroupedReadOnly=async(scope,label,requireDone=false,allowDirectText=false)=>{
  const rows=await evaluate('document.querySelector('+JSON.stringify(scope)+')?.querySelectorAll(".compact-stage-row .compact-stage-state").length??0');
  if(!rows)throw Error('R_V3_05_MISSING_GROUPED_STAGES '+label);
  const values=await evaluate('(()=>{const root=document.querySelector('+JSON.stringify(scope)+');if(!root)return null;'+
    'return [...root.querySelectorAll(".compact-stage-row .compact-stage-state .workflow-status-value")].map(node=>{'+
    'const css=getComputedStyle(node),member=getComputedStyle(node.closest(".compact-stage-state"));'+
    'const dot=getComputedStyle(node,"::before");'+
    'return {text:node.textContent.trim(),tone:node.closest(".compact-stage-row").dataset.progressTone,'+
    'flat:["Top","Right","Bottom","Left"].every(x=>css["border"+x+"Width"]==="0px"&&css["padding"+x]==="0px"),'+
    'transparent:css.backgroundColor==="rgba(0, 0, 0, 0)"||css.backgroundColor==="transparent",'+
    'inherit:css.color===member.color,noSecondDot:dot.content==="none"||dot.display==="none"};});})()');
  // ItemList renders direct read-only text in grouped stages; ReportDetailGrid
  // wraps its read-only values in a legacy span. Both must keep one frame.
  if(!values||(values.length===0&&!allowDirectText)||
      values.some(x=>!x.flat||!x.transparent||!x.inherit||!x.noSecondDot)||
      (requireDone&&!values.some(x=>x.tone==='done')))
    throw Error('R_V3_05_NESTED_READONLY_FAIL '+label+' '+JSON.stringify({rows,values}));
  console.log('R_V3_05_GROUPED_READONLY_PASS '+label+' '+JSON.stringify({count:values.length,done:values.filter(x=>x.tone==='done').length,tones:[...new Set(values.map(x=>x.tone))]}));
};

async function waitFor(js,reason){
 for(let i=0;i<60;i++){try{if(await evaluate('Boolean('+js+')'))return;}catch{}await sleep(150);}
 try{
   console.log('PR95_V3_L5_WAIT_DIAGNOSTIC',await evaluate('JSON.stringify({title:document.title,url:location.href,root:document.getElementById("root")?.innerHTML.slice(0,3500),text:document.body.innerText?.slice(0,1200)})'));
 }catch(diag){console.log('PR95_V3_L5_DIAG_FAILED',String(diag));}
 console.log('PR95_V3_L5_CONSOLE_ERRORS',logs.slice(-8));
 throw Error('PR95_V3_L5_WAIT_TIMEOUT '+reason);
}
const logs=[];
const network=[];
try{
  const portProbe=createServer();await new Promise(done=>portProbe.listen(0,'127.0.0.1',done));
  const debuggingPort=portProbe.address().port;await new Promise(done=>portProbe.close(done));
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
    '--no-first-run','--no-default-browser-check','--disable-extensions',
    '--disable-background-networking','--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port='+debuggingPort,'--user-data-dir='+userDir,'about:blank'],
    {stdio:'ignore'});
  let tab;
  for(let i=0;i<80;i++){
    try{const res=await fetch('http://127.0.0.1:'+debuggingPort+'/json/list',{signal:AbortSignal.timeout(850)});
      tab=(await res.json()).find(v=>v.type==='page');if(tab)break;}catch{}
    await sleep(150);
  }
  if(!tab)throw Error('Chrome CDP page did not start');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.method==='Network.requestWillBeSent')network.push(m.params.request.url);
    if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')logs.push(JSON.stringify(m.params.args));
    if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.fail(Error(JSON.stringify(m.error))):p.done(m.result);}
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1'});
  await waitFor('document.querySelector("[data-preview=pr95-l4-full]")&&document.querySelector(".item-data-table tbody tr")','list default');
  await ensure('document.querySelectorAll(".pr95-preview-nav button").length===2','exactly two wide cards');
  await ensure('document.querySelector("[data-role=guest]")','guest default');
  await ensure('!document.querySelector(".pr95-preview-excel")&&!document.querySelector(".pr95-preview-role")','guest no Excel or role toolbar');
  await ensure('!document.querySelector(".source-column-visibility")&&!document.querySelector(".compact-columns-menu")','guest no column controls');
  await ensure('![...document.querySelectorAll(".item-data-table .column-resizer")].some(x=>getComputedStyle(x).display!=="none")','guest no visible resize affordance');
  await inspectSummary('1440-single-row',{party:[4],build:[4],nq:[3]});
  await inspectGroupedReadOnly('.item-data-table','main-guest-default',false,true);
  await assertV4StatusDisplay('.item-data-table','main-guest-default-canonical',true);
  await ensure('[...document.querySelectorAll(".item-data-table .compact-stage-state")].some(x=>x.querySelector(".business-build-locked"))','V5 HC/BC Build is visible and truly locked');
  await screenshot('pr95-v5-l4-integrated-main-default-canonical.png');
  await screenshot('pr95-v5-l4-regression-guest-1440.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:860,deviceScaleFactor:1,mobile:false});
  await inspectSummary('1280-paired',{party:[2,2],build:[2,2],nq:[3]});
  await screenshot('pr95-v5-l4-regression-guest-1280.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  // A narrow embedded frame on a wide monitor also uses deliberate pairs.
  await interact('document.querySelector(".item-summary-grid").style.maxWidth="960px"');
  await inspectSummary('960-narrow-frame',{party:[2,2],build:[2,2],nq:[3]});
  await screenshot('pr95-v5-l4-regression-summary-narrow-frame.png');
  await interact('document.querySelector(".item-summary-grid").style.removeProperty("max-width")');
  await interact('document.querySelector(".pr95-preview-gear").click()');
  await ensure('document.querySelectorAll(".pr95-preview-gear-menu button").length===1','guest gear login only');
  await ensure('!document.querySelector(".pr95-preview-gear-menu")?.textContent.includes("Excel")','guest menu no Excel');
  await screenshot('pr95-v5-l4-regression-guest-gear.png');
  await clickText('Đăng nhập quản trị (mô phỏng)');
  await waitFor('document.querySelector("[data-role=admin]")','simulated admin login');
  await interact('document.querySelector(".pr95-preview-gear").click()');
  await ensure('document.querySelectorAll(".pr95-preview-gear-menu button").length===7','admin five tools, reference toggle and logout');
  await screenshot('pr95-v5-l4-regression-admin-gear.png');
  await interact('document.querySelector(".pr95-preview-gear").click()');

  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-surface").length===5','all 5 real ReportTable');
  await ensure('document.querySelectorAll(".report-table").length===5','five report tables');
  await screenshot('pr95-v5-l4-regression-desktop-reports.png');
  await interact('const b=document.querySelector(".report-table .count-drill");if(!b)throw Error("No drill");b.click()');
  await waitFor('document.querySelector("dialog.report-grid-modal[open]")','actual report popup');
  await ensure('document.querySelector("dialog.report-grid-modal .report-grid-toolbar")','real popup controls');
  await inspectGroupedReadOnly('dialog.report-grid-modal .report-detail-grid','popup-default',true);
  await assertV4StatusDisplay('dialog.report-grid-modal .report-detail-grid','popup-default-canonical');
  await screenshot('pr95-v5-l4-integrated-popup-default-canonical.png');
  await screenshot('pr95-v5-l4-regression-desktop-popup.png');
  // CSS-only test fixture: local custom palette variables (no persisted settings
  // or source-row mutation), then an explicit one-member highlight.
  await interact('const root=document.querySelector(".pr95-full-preview");'+
    'root.style.setProperty("--hdnd-status-done-text","#14539A");'+
    'root.style.setProperty("--hdnd-stage-done-bg","#E7F3FF");'+
    'root.style.setProperty("--hdnd-stage-done-border","#94A8C9")');
  await ensure('(()=>{const row=document.querySelector("dialog.report-grid-modal .compact-stage-row[data-progress-tone=done]");'+
    'const member=row?.querySelector(".compact-stage-state"),inner=member?.querySelector(".workflow-status-value");'+
    'return !!inner&&getComputedStyle(row).backgroundColor==="rgb(231, 243, 255)"&&'+
    'getComputedStyle(member).color==="rgb(20, 83, 154)"&&getComputedStyle(inner).color===getComputedStyle(member).color})()',
    'custom palette per-stage text/frame, no nested pill');
  await inspectGroupedReadOnly('dialog.report-grid-modal .report-detail-grid','popup-custom-palette',true);
  await interact('const member=document.querySelector("dialog.report-grid-modal .compact-stage-row[data-progress-tone=done] .compact-stage-state");'+
    'member.dataset.highlighted="true";member.style.setProperty("--member-highlight-bg","#FFF1AC");'+
    'member.style.setProperty("--member-highlight-text","#714A12")');
  await ensure('(()=>{const member=document.querySelector("dialog.report-grid-modal .compact-stage-state[data-highlighted=true]");'+
    'const row=member.closest(".compact-stage-row"),inner=member.querySelector(".workflow-status-value");'+
    'const other=[...row.parentElement.querySelectorAll(".compact-stage-row")].find(x=>x!==row);'+
    'return !!other&&getComputedStyle(member).backgroundColor==="rgb(255, 241, 172)"&&'+
    'getComputedStyle(inner).color==="rgb(113, 74, 18)"&&'+
    'getComputedStyle(row).backgroundColor==="rgb(231, 243, 255)"&&'+
    'getComputedStyle(other).backgroundColor!==getComputedStyle(member).backgroundColor})()',
    'one-member highlight does not repaint neighboring stage or outer frame');
  await inspectGroupedReadOnly('dialog.report-grid-modal .report-detail-grid','popup-member-highlight',true);
  await screenshot('pr95-v5-l4-regression-desktop-popup-custom-highlight.png');
  await interact('const root=document.querySelector(".pr95-full-preview");'+
    'for(const v of ["--hdnd-status-done-text","--hdnd-stage-done-bg","--hdnd-stage-done-border"])root.style.removeProperty(v);'+
    'const member=document.querySelector("dialog.report-grid-modal .compact-stage-state[data-highlighted=true]");'+
    'member.removeAttribute("data-highlighted");member.style.removeProperty("--member-highlight-bg");member.style.removeProperty("--member-highlight-text")');
  await inspectGroupedReadOnly('dialog.report-grid-modal .report-detail-grid','popup-restored',true);
  // V5: the first Party drill can include HC/BC whose Build is correctly
  // locked. Exercise the positive Build editor using the *real Build report*
  // which only includes QPPL rows by default (no mocked grants or raw rewrites).
  await interact('document.querySelector("dialog.report-grid-modal button[aria-label=\\\"Đóng cửa sổ\\\"]")?.click()');
  await waitFor('!document.querySelector("dialog.report-grid-modal[open]")','close mixed-kind popup before QPPL Build editor test');
  await interact('const b=document.querySelector("section[data-ui-reference-report=build] .count-drill");if(!b)throw Error("V5 QPPL Build drill absent");b.click()');
  await waitFor('document.querySelector("dialog.report-grid-modal[open]")','QPPL-only Build report popup');
  await clickText('Chỉnh sửa nháp');
  await waitFor('document.querySelector("dialog.report-grid-modal .compact-stage-row[data-stage-field=progressBuild] button.cell-picker-trigger")','editable QPPL Build popup stage');
  const editableV4=await evaluate('(()=>{const rows=[...document.querySelectorAll("dialog.report-grid-modal .compact-stage-row")];'+
    'const metrics=rows.filter(r=>r.querySelector("button.cell-picker-trigger")).map(r=>{'+
    'const s=r.querySelector(".compact-stage-state"),b=s?.querySelector("button.cell-picker-trigger");'+
    'if(!s||!b)return {ok:false};const v=getComputedStyle(b),br=b.getBoundingClientRect(),sr=s.getBoundingClientRect(),'+
    'arrow=getComputedStyle(b,"::after"),rail=getComputedStyle(b,"::before"),dot=getComputedStyle(s,"::before");'+
    'return {ok:s.dataset.editable==="true"&&v.display==="grid"&&v.borderTopWidth==="0px"&&v.boxShadow==="none"&&'+
    'v.backgroundColor!=="rgba(0, 0, 0, 0)"&&br.height>=38&&Math.abs(br.width-sr.width)<1&&'+
    'dot.content==="none"&&arrow.content==="\\\"\\\""&&arrow.gridColumnStart==="2"&&'+
    'rail.content==="\\\"\\\""&&parseFloat(rail.width)>=33,'+
    'right:br.right,fill:v.backgroundColor,stage:r.dataset.stageField};});'+
    'const byStage=new Map();for(const m of metrics){if(!byStage.has(m.stage))byStage.set(m.stage,m.right);'+
    'else if(Math.abs(byStage.get(m.stage)-m.right)>5)m.ok=false;}'+
    'return {ok:metrics.length>0&&metrics.every(m=>m.ok),metrics};})()');
  if(!editableV4.ok)throw Error('UI_V4_L2_EDITABLE_SINGLE_FRAME_TONAL_RAIL_FAIL '+JSON.stringify(editableV4));
  console.log('UI_V4_L2_EDITABLE_SINGLE_FRAME_TONAL_RAIL_PASS '+JSON.stringify({count:editableV4.metrics.length}));
  // V5 integration: the first report drill can now contain only HC/BC,
  // whose Build fields are *correctly locked*. Inspect that protection
  // instead of requiring an invalid HC/BC editor. Keep keyboard/aria and
  // choices-only coverage on the editable Party stage in that same popup;
  // the separate imported QPPL Build fixture below checks EXACT five
  // Build choices, intermediate selection, Escape and same-value no-op.
  const popupPicker=await evaluate(`(()=>{
    const grid=document.querySelector('dialog.report-grid-modal .report-detail-grid');
    const build=[...grid?.querySelectorAll('[data-stage-field=progressBuild]')??[]];
    const buildButton=build.map(x=>x.querySelector('.compact-stage-state button.cell-picker-trigger')).find(Boolean);
    let field='progressBuild',button=buildButton;
    const locked=build.map(x=>({
      locked:!!x.querySelector('.business-build-locked'),
      value:x.querySelector('.compact-stage-state')?.textContent?.trim(),
      editable:!!x.querySelector('button.cell-picker-trigger')
    }));
    if(!button){
      if(!build.length||locked.some(x=>!x.locked||x.value!=='Không phải trình'||x.editable))
        return {ok:false,reason:'unexpected noneditable Build without HC/BC lock',locked};
      field='progressParty';
      button=grid?.querySelector('[data-stage-field=progressParty] .compact-stage-state button.cell-picker-trigger');
    }
    if(!button)return {ok:false,reason:'no editable status even for Party',locked};
    button.scrollIntoView({block:'center',inline:'nearest'});
    const selected=button.textContent?.trim();
    button.click();
    return {ok:true,field,selected,buildLocked:!buildButton,lockedCount:locked.filter(x=>x.locked).length};
  })()`);
  if(!popupPicker.ok)throw Error('UI_V5_POPUP_STATUS_PICKER_MISSING '+JSON.stringify(popupPicker));
  await waitFor('document.querySelector(".cell-picker-popover[role=dialog]")','V5 popup status dropdown');
  const choices=await evaluate('(()=>{const root=document.querySelector(".cell-picker-popover[role=dialog]");'+
    'const buttons=[...root.querySelectorAll("[role=option]")];'+
    'return {labels:buttons.map(b=>b.textContent.trim()),selected:buttons.filter(b=>b.getAttribute("aria-selected")==="true").map(b=>b.textContent.trim()),'+
    'rolesOk:buttons.every(b=>b.getAttribute("role")==="option"),'+
    'choicesOnly:root.dataset.choicesOnly==="true",header:!!root.querySelector("h1,h2,h3,.cell-picker-note,.cell-picker-search")};})()');
  const expectedBuild=['Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'];
  const expectedParty=['Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU',
    'ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL'];
  const expected=popupPicker.field==='progressBuild'?expectedBuild:expectedParty;
  if(JSON.stringify(choices.labels)!==JSON.stringify(expected)||
      choices.selected.length!==1||choices.selected[0]!==popupPicker.selected||
      !choices.rolesOk||!choices.choicesOnly||choices.header)
    throw Error('UI_V5_POPUP_STATUS_CHOICES_FAIL '+JSON.stringify({popupPicker,choices,expected}));
  console.log('UI_V5_POPUP_EFFECTIVE_LOCK_AND_PICKER_PASS '+JSON.stringify({popupPicker,choices}));

  const beforeDirty=await evaluate('document.querySelectorAll("dialog.report-grid-modal .report-grid-id small").length');
  await screenshot('pr95-v5-l4-integrated-canonical-picker.png');
  await interact('document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true}))');
  await waitFor('!document.querySelector(".cell-picker-popover[role=dialog]")','status Escape closes');
  const afterDirty=await evaluate('document.querySelectorAll("dialog.report-grid-modal .report-grid-id small").length');
  if(beforeDirty!==afterDirty)throw Error('UI_V4_L1_ESC_CREATED_PATCH');
  console.log('UI_V4_L1_CANONICAL_PICKER_ESC_NO_PATCH_PASS '+JSON.stringify(choices));
  await screenshot('pr95-v5-l4-regression-desktop-popup-editable.png');
  await interact('document.querySelector("dialog.report-grid-modal button[aria-label=\\"Đóng cửa sổ\\"]")?.click()');
  await waitFor('!document.querySelector("dialog.report-grid-modal[open]")','close popup');

  await clickText('Tùy chỉnh cột và hiển thị');
  await waitFor('document.querySelector(".column-manager")','real admin ItemColumnPanel');
  await ensure('document.querySelectorAll(".pr95-preview-nav button").length===2','admin customizer does not add tab');
  await screenshot('pr95-v5-l4-regression-admin-columns.png');
  await clickText('Tài khoản');await waitFor('document.querySelector("[aria-label=\\"Tài khoản mô phỏng\\"]")','account panel');
  await clickText('Cài đặt');await waitFor('document.querySelector("[aria-label=\\"Cài đặt demo\\"]")','settings panel');
  await clickText('Excel · Nhập / Xuất');await waitFor('document.querySelector(".pr95-preview-excel")','Excel panel');
  await ensure('document.querySelectorAll(".pr95-preview-excel input[type=file]").length===1','local file control');
  await ensure('document.querySelectorAll(".pr95-preview-excel button").length>=3','Excel export/template controls');

  // A–O sheet fixture is generated ONLY in Node memory; file enters the
  // browser File input, then the real parser and comparison domain run.
  const row=['NQ991',1,'MẪU: Nghị quyết kiểm thử L4','Sở mẫu A','QPPL','BTV',
    'Sở chưa trình','Đã trình, chờ QĐ','Sở chưa trình','CV giả','Phòng mẫu 1',
    'Lãnh đạo VP mẫu','Lãnh đạo UBND mẫu','Đang xử lý','Ghi chú chỉ demo'];
  const headings=['Mã nội dung','STT','Nội dung trình','Sở, ngành','Loại VB',
    'Cấp cho ý kiến Thành ủy','Tiến độ xin ý kiến Thành ủy',
    'Trình HĐND xây dựng NQ','Trình HĐND ban hành NQ',
    'Chuyên viên','Phòng','Lãnh đạo VP','Lãnh đạo UBND','Tiến độ hiện tại','Ghi chú'];
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([headings,row]),'DATA_AO');
  const bytes=Buffer.from(XLSX.write(book,{type:'buffer',bookType:'xlsx'}));
  const binary=bytes.toString('base64');
  await interact('const input=document.querySelector(".pr95-preview-excel input[type=file]");'+
    'const data=Uint8Array.from(atob('+JSON.stringify(binary)+'),c=>c.charCodeAt(0));'+
    'const f=new File([data],"synthetic-L4.xlsx",{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});'+
    'Object.defineProperty(input,"files",{configurable:true,value:[f]});input.dispatchEvent(new Event("change",{bubbles:true}))');
  await waitFor('document.querySelector(".pr95-preview-file-state")','Excel chosen');
  await selectValue('select[aria-label="Sheet A–O"]','DATA_AO');
  await clickText('Kiểm tra toàn bộ file');
  await waitFor('document.querySelector("[aria-label=\\"Xem trước Excel chưa áp dụng\\"]")','Excel full file review');
  await ensure('document.querySelector(".pr95-preview-file-result")?.textContent.includes("NQ991")','source workbook row present');
  await clickText('Dùng dữ liệu này trong bản demo (RAM)');
  await clickText('Xác nhận thay dữ liệu RAM');
  await waitFor('document.querySelector(".pr95-preview-context")?.textContent.includes("Hồ sơ: 1")','memory replacement');
  // V5 integration: explicit independent imported QPPL fixture, NOT a fake
  // milestone injected into the default demo. Test displayed effective Build,
  // exact canonical five options, selected status, Esc and same-value no-op.
  await clickText('Danh sách các ND trình HĐND');
  await waitFor('document.querySelector(".item-data-table tbody tr td[data-col-key=displayCode]")?.textContent?.includes("NQ991")',
    'isolated imported QPPL row visible in real ItemList');
  const qpplIntermediate=await evaluate(`(()=>{
    const row=[...document.querySelectorAll('.item-data-table tbody tr')].find(x=>
      x.querySelector('td[data-col-key=displayCode]')?.textContent?.trim()==='NQ991');
    const type=row?.querySelector('.compact-document-badge')?.textContent?.trim();
    const stage=row?.querySelector('[data-stage-field=progressBuild] .compact-stage-state');
    const editor=stage?.querySelector('button.cell-picker-trigger');
    return {ok:!!row&&type==='QPPL'&&!!editor&&
      stage.textContent?.trim()==='Đã trình, chờ QĐ'&&
      !stage.querySelector('.business-build-locked'),
      id:row?.querySelector('td[data-col-key=displayCode]')?.textContent?.trim(),
      type,value:stage?.textContent?.trim(),editor:!!editor};
  })()`);
  if(!qpplIntermediate.ok)throw Error('UI_V5_QPPL_IMPORTED_MILESTONE_MISSING '+JSON.stringify(qpplIntermediate));
  const beforeQpplDirty=await evaluate('!!document.querySelector(".pr95-preview-unsaved")');
  await interact('const row=[...document.querySelectorAll(".item-data-table tbody tr")].find(x=>'+
    'x.querySelector("td[data-col-key=displayCode]")?.textContent?.trim()==="NQ991");'+
    'const editor=row?.querySelector("[data-stage-field=progressBuild] button.cell-picker-trigger");'+
    'if(!editor)throw Error("QPPL milestone editor missing");editor.scrollIntoView({block:"center"});editor.click()');
  await waitFor('document.querySelector(".cell-picker-popover:popover-open .cell-picker-option")',
    'QPPL intermediate Build dropdown open');
  const qpplOptions=await evaluate(`(()=>{
    const p=document.querySelector('.cell-picker-popover:popover-open');
    const options=[...p?.querySelectorAll('[role=option]')??[]];
    return {labels:options.map(x=>x.textContent?.trim()),
      selected:options.filter(x=>x.getAttribute('aria-selected')==='true').map(x=>x.textContent?.trim()),
      choicesOnly:p?.dataset.choicesOnly==='true'};
  })()`);
  const expectedQppl=['Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'];
  if(!qpplOptions.choicesOnly||JSON.stringify(qpplOptions.labels)!==JSON.stringify(expectedQppl)||
      JSON.stringify(qpplOptions.selected)!==JSON.stringify(['Đã trình, chờ QĐ']))
    throw Error('UI_V5_QPPL_INTERMEDIATE_CANONICAL_PICKER_FAIL '+JSON.stringify(qpplOptions));
  await screenshot('pr95-v5-integrated-qppl-intermediate-selected.png');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','QPPL ESC close');
  await ensure('document.querySelector(".item-data-table tbody tr [data-stage-field=progressBuild] .compact-stage-state")?.textContent?.trim()==="Đã trình, chờ QĐ"',
    'QPPL Build unchanged after Esc');
  await interact('const button=document.querySelector(".item-data-table tbody tr [data-stage-field=progressBuild] button.cell-picker-trigger");'+
    'if(!button)throw Error("QPPL Build lost editor");button.click()');
  await waitFor('document.querySelector(".cell-picker-popover:popover-open [role=option][aria-selected=true]")',
    'QPPL same-value option ready');
  await interact('document.querySelector(".cell-picker-popover:popover-open [role=option][aria-selected=true]").click()');
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")','QPPL no-op option closes');
  await ensure('document.querySelector(".item-data-table tbody tr [data-stage-field=progressBuild] .compact-stage-state")?.textContent?.trim()==="Đã trình, chờ QĐ"',
    'QPPL Build unchanged after same-value option');
  const afterQpplDirty=await evaluate('!!document.querySelector(".pr95-preview-unsaved")');
  if(afterQpplDirty!==beforeQpplDirty)
    throw Error('UI_V5_QPPL_SAME_VALUE_CREATED_DRAFT '+JSON.stringify({beforeQpplDirty,afterQpplDirty}));
  console.log('UI_V5_IMPORTED_QPPL_INTERMEDIATE_ESC_NOOP_PASS '+JSON.stringify({
    fixture:qpplIntermediate,choiceCount:qpplOptions.labels.length,
    selected:qpplOptions.selected,noPatch:true}));
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','report after memory import');

  // Reset to 27 seed rows, demonstrate grant -> guest edit -> revoke.
  await clickText('Tài khoản');await clickText('Đặt lại dữ liệu mô phỏng');
  await waitFor('document.querySelector(".pr95-preview-context")?.textContent.includes("Hồ sơ: 27")','restore fixture');
  await clickText('Phân quyền chỉnh sửa');
  await waitFor('document.querySelector(".inline-permission-table")','real permissions grid');
  // V5: a synthetic admin may grant Build to everyone, but the business
  // eligibility rule still locks every HC and BC record for the guest.
  await interact('const head=[...document.querySelectorAll(".inline-permission-table thead th")].find(x=>x.querySelector(".permission-header-title")?.textContent.toLocaleLowerCase("vi").includes("xây dựng nq"));'+
    'const box=head?.querySelector("input[type=checkbox]");if(!box)throw Error("Build column missing");if(!box.checked)box.click()');
  await selectValue('select[aria-label*="Ghi chú"]','allow');
  // Real React setCell() is batched after the native select change. Wait until
  // the original mandatory row/individual-cell risk acknowledgment is actually
  // mounted. The test still MUST check it and click it; no permission bypass.
  await waitFor('document.querySelector(".permission-risk-confirm input[type=checkbox]")',
    'per-cell permission risk acknowledgment after React commit');
  await interact('const cb=document.querySelector("input[aria-label=\\"Xác nhận rủi ro quyền theo dòng/ô\\"]");if(!cb)throw Error("Missing risk acknowledgement");cb.click()');
  await clickText('Lưu quyền chỉnh sửa');
  await waitFor('document.querySelector(".permission-save-status")?.textContent.includes("đã được lưu")','RAM grant saved');
  await selectValue('#pr95-role','guest');
  await waitFor('document.querySelector("[data-role=guest]")','guest switch');
  await clickText('Danh sách các ND trình HĐND');
  await waitFor('document.querySelector(".item-data-table")','guest list');
  await ensure('(()=>{const rows=[...document.querySelectorAll(".item-data-table tbody tr")];'+
    'const noBuild=rows.filter(x=>["HC","Báo cáo"].includes(x.querySelector(".compact-document-badge")?.textContent?.trim()));'+
    'const qppl=rows.filter(x=>x.querySelector(".compact-document-badge")?.textContent?.trim()==="QPPL");'+
    'return noBuild.length>0&&noBuild.every(x=>{const stage=x.querySelector(".compact-stage-row[data-stage-field=progressBuild]");'+
    'return !!stage?.querySelector(".business-build-locked")&&!stage?.querySelector(".cell-picker-trigger")})&&'+
    'qppl.some(x=>!!x.querySelector(".compact-stage-row[data-stage-field=progressBuild] .cell-picker-trigger"))})()',
    'V5 guest HC/BC must stay locked even with full Build grant, while QPPL stays editable');
  await screenshot('pr95-v5-l4-regression-guest-build-grant-locked.png');
  await ensure('document.querySelectorAll(".inline-note-trigger[aria-label*=Ghi]").length>=1','guest granted note editor');
  const firstNote=await evaluate('document.querySelector(".inline-note-trigger[aria-label*=Ghi]")?.getAttribute("aria-label")');
  await interact('document.querySelector(".inline-note-trigger[aria-label*=Ghi]").click()');
  await waitFor('document.querySelector("textarea.inline-note-textarea")','guest textarea');
  await interact('const input=document.querySelector("textarea.inline-note-textarea");'+
    'const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,"value").set;'+
    'setter.call(input,"MẪU: Khách sửa quyền riêng ô");'+
    'input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}));'+
    'input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",ctrlKey:true,bubbles:true}))');
  await waitFor('document.querySelector("[data-testid=guest-edits]")?.textContent==="1"','guest edit RAM applied');
  await ensure('document.querySelector(".pr95-preview-unsaved")','guest retains RAM Save/Cancel');
  await screenshot('pr95-v5-l4-regression-desktop-guest-edited.png');
  await clickText('Lưu trong RAM');
  await waitFor('!document.querySelector(".pr95-preview-unsaved")','guest RAM save confirmed');
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','guest report access');
  await interact('const b=document.querySelector(".report-table .count-drill");if(!b)throw Error("No guest drill");b.click()');
  await waitFor('document.querySelector("dialog.report-grid-modal[open]")','guest popup');
  await ensure('!document.querySelector("dialog.report-grid-modal .report-grid-presets")&&!document.querySelector("dialog.report-grid-modal .report-grid-settings")','guest popup no admin customizations');
  await inspectGroupedReadOnly('dialog.report-grid-modal .report-detail-grid','popup-guest-after-RAM-edit');
  await screenshot('pr95-v5-l4-regression-guest-popup.png');
  await interact('document.querySelector("dialog.report-grid-modal button[aria-label=\\"Đóng cửa sổ\\"]")?.click()');
  await waitFor('!document.querySelector("dialog.report-grid-modal[open]")','guest popup closed');
  await selectValue('#pr95-role','admin');
  await clickText('Phân quyền chỉnh sửa');
  await waitFor('document.querySelector(".inline-permission-table")','permission revoke');
  await selectValue('select[aria-label*="Ghi chú"]','deny');
  await interact('document.querySelector("input[aria-label=\\"Xác nhận rủi ro quyền theo dòng/ô\\"]")?.click()');
  await clickText('Lưu quyền chỉnh sửa');
  await waitFor('document.querySelector(".permission-save-status")?.textContent.includes("đã được lưu")','RAM revoke saved');
  await selectValue('#pr95-role','guest');
  await clickText('Danh sách các ND trình HĐND');
  await waitFor('document.querySelector(".item-data-table")','revoked guest list');
  // React's synthetic role transition and the permissions snapshot resolve on
  // separate frames. Re-test the SAME exact revoked cell, but wait until the
  // read-only render has settled; do not weaken the permission assertion.
  await waitFor('![...document.querySelectorAll(".inline-note-trigger")].some(x=>x.getAttribute("aria-label")==='+JSON.stringify(firstNote)+')','revoke removes guest note editor');
  console.log('UI_V4_L1_REVOKED_GUEST_EDITOR_NOT_RENDERED_PASS '+JSON.stringify(firstNote));

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await inspectSummary('390-mobile',{party:[2,2],build:[2,2],nq:[3]});
  await screenshot('pr95-v5-l4-regression-mobile-list.png');
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','mobile reports');
  await screenshot('pr95-v5-l4-regression-mobile-reports.png');
  // Open the packaged one-file HTML by file:// in *real Chrome*, without HTTP.
  // This catches raw JS leaked into HTML, module/CORS failures, broken CSS and
  // component bootstrap bugs that a simple grep of bundle bytes cannot see.
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  const offlineUrl=pathToFileURL(join(root,'HopHDND_GopCot_XemThu.html')).href;
  await send('Page.navigate',{url:offlineUrl});
  await waitFor('document.querySelector("[data-preview=pr95-l4-full]") && document.querySelector(".item-data-table tbody tr")','offline file React mount');
  await ensure('document.querySelectorAll(".pr95-preview-nav button").length===2','offline two-card nav');
  await ensure('!document.body.textContent.includes("function Rf(")','offline no raw compiled JavaScript');
  await ensure('document.querySelector("[data-role=guest]")','offline guest default');
  await screenshot('pr95-v5-l4-regression-offline-guest.png');
  await clickText('Đăng nhập quản trị (mô phỏng)');
  await waitFor('document.querySelector("[data-role=admin]")','offline simulated login');
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','offline five real reports');
  await screenshot('pr95-v5-l4-regression-offline-desktop-reports.png');
  await clickText('Excel · Nhập / Xuất');
  await waitFor('document.querySelector(".pr95-preview-excel input[type=file]")','offline Excel controls');
  await clickText('Cài đặt');
  await waitFor('document.querySelector("[aria-label=\\"Cài đặt demo\\"]")','offline settings');
  await selectValue('#pr95-role','guest');
  await waitFor('document.querySelector("[data-role=guest]")','offline guest toggle');
  await ensure('!document.querySelector(".pr95-preview-excel")&&!document.querySelector(".inline-permission-table")','guest admin panels unmounted');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await clickText('Danh sách các ND trình HĐND');
  await waitFor('document.querySelector(".item-data-table")','offline guest list narrow');
  await screenshot('pr95-v5-l4-regression-offline-mobile-guest.png');
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','offline mobile report');
  await screenshot('pr95-v5-l4-regression-offline-mobile-reports.png');
  console.log('PR95_V3_L5_OFFLINE_FILE_CHROME_PASS '+JSON.stringify({
    fileScheme:true,reactMount:true,reports:5,excel:true,settings:true,guest:true,desktop:1440,mobile:390}));
  await ensure('!document.documentElement.classList.contains("is-printing")','no print state');
  await ensure('!document.querySelector("script[src*=firebase]")','no Firebase network bootstrap');
  const forbidden=network.filter(url=>['firebaseio','firebasedatabase','docs.google.com/spreadsheets','identitytoolkit','securetoken','sheets.googleapis.com'].some(fragment=>url.toLowerCase().includes(fragment)));
  if(forbidden.length)throw Error('PR95_V3_L5_FORBIDDEN_PRODUCTION_REQUEST '+JSON.stringify(forbidden.slice(0,12)));
  if(logs.length)console.log('PR95_V3_L5_BROWSER_CONSOLE_ERRORS',logs.slice(0,3));
  console.log('PR95_V3_L5_FULL_PREVIEW_BROWSER_PASS '+JSON.stringify({
    realReports:5,popup:'ReportDetailGrid',list:'ItemList',
    permission:'InlinePermissionsTable',file:'real A–O parse RAM replacement',
    roles:'admin guest grant edit revoke',mobile:390,productionRequests:forbidden.length}));
}finally{
 for(const entry of pending.values())entry.fail(Error('CDP closing'));pending.clear();
 ws?.close();browser?.kill('SIGKILL');server.close();
 rmSync(userDir,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
