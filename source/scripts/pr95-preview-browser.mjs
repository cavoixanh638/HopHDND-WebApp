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
const userDir=mkdtempSync(join(tmpdir(),'pr95-v3-l5-preview-'));
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
  return interact('const label='+JSON.stringify(alias)+';'+
    'let button=[...document.querySelectorAll("button")].find(x=>x.textContent?.trim()===label);'+
    'if(!button){const gear=document.querySelector(".pr95-preview-gear");if(gear)gear.click();'+
    'button=[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(x=>x.textContent?.trim()===label);}'+
    'if(!button)throw Error("Button missing: "+label);button.click()');
};
const selectValue=async(selector,value)=>{
  if(selector==='#pr95-role'){
    if(!['guest','admin'].includes(value))throw Error('Bad simulated role');
    const action=value==='guest'?'Đăng xuất mô phỏng':'Đăng nhập quản trị (mô phỏng)';
    return interact('const gear=document.querySelector(".pr95-preview-gear");gear.click();'+
      'const button=[...document.querySelectorAll(".pr95-preview-gear-menu button")].find(x=>x.textContent?.trim()==='+JSON.stringify(action)+');'+
      'if(!button)throw Error("Simulated role action missing");button.click()');
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
  await screenshot('pr95-v3-l5-guest-1440.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1280,height:860,deviceScaleFactor:1,mobile:false});
  await screenshot('pr95-v3-l5-guest-1280.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await interact('document.querySelector(".pr95-preview-gear").click()');
  await ensure('document.querySelectorAll(".pr95-preview-gear-menu button").length===1','guest gear login only');
  await ensure('!document.querySelector(".pr95-preview-gear-menu")?.textContent.includes("Excel")','guest menu no Excel');
  await screenshot('pr95-v3-l5-guest-gear.png');
  await clickText('Đăng nhập quản trị (mô phỏng)');
  await waitFor('document.querySelector("[data-role=admin]")','simulated admin login');
  await interact('document.querySelector(".pr95-preview-gear").click()');
  await ensure('document.querySelectorAll(".pr95-preview-gear-menu button").length===6','admin five tools and logout');
  await screenshot('pr95-v3-l5-admin-gear.png');
  await interact('document.querySelector(".pr95-preview-gear").click()');

  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-surface").length===5','all 5 real ReportTable');
  await ensure('document.querySelectorAll(".report-table").length===5','five report tables');
  await screenshot('pr95-v3-l5-desktop-reports.png');
  await interact('const b=document.querySelector(".report-table .count-drill");if(!b)throw Error("No drill");b.click()');
  await waitFor('document.querySelector("dialog.report-grid-modal[open]")','actual report popup');
  await ensure('document.querySelector("dialog.report-grid-modal .report-grid-toolbar")','real popup controls');
  await screenshot('pr95-v3-l5-desktop-popup.png');
  await interact('document.querySelector("dialog.report-grid-modal button[aria-label=\\"Đóng cửa sổ\\"]")?.click()');
  await waitFor('!document.querySelector("dialog.report-grid-modal[open]")','close popup');

  await clickText('Tài khoản');await waitFor('document.querySelector("[aria-label=\\"Tài khoản mô phỏng\\"]")','account panel');
  await clickText('Cài đặt');await waitFor('document.querySelector("[aria-label=\\"Cài đặt demo\\"]")','settings panel');
  await clickText('Excel · Nhập / Xuất');await waitFor('document.querySelector(".pr95-preview-excel")','Excel panel');
  await ensure('document.querySelectorAll(".pr95-preview-excel input[type=file]").length===1','local file control');
  await ensure('document.querySelectorAll(".pr95-preview-excel button").length>=3','Excel export/template controls');

  // A–O sheet fixture is generated ONLY in Node memory; file enters the
  // browser File input, then the real parser and comparison domain run.
  const row=['NQ991',1,'MẪU: Nghị quyết kiểm thử L4','Sở mẫu A','QPPL','BTV',
    'Sở chưa trình','Sở chưa trình','Sở chưa trình','CV giả','Phòng mẫu 1',
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
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','report after memory import');

  // Reset to 27 seed rows, demonstrate grant -> guest edit -> revoke.
  await clickText('Tài khoản');await clickText('Đặt lại dữ liệu mô phỏng');
  await waitFor('document.querySelector(".pr95-preview-context")?.textContent.includes("Hồ sơ: 27")','restore fixture');
  await clickText('Phân quyền chỉnh sửa');
  await waitFor('document.querySelector(".inline-permission-table")','real permissions grid');
  await selectValue('select[aria-label*="Ghi chú"]','allow');
  await interact('const cb=document.querySelector("input[aria-label=\\"Xác nhận rủi ro quyền theo dòng/ô\\"]");if(!cb)throw Error("Missing risk acknowledgement");cb.click()');
  await clickText('Lưu quyền chỉnh sửa');
  await waitFor('document.querySelector(".permission-save-status")?.textContent.includes("đã được lưu")','RAM grant saved');
  await selectValue('#pr95-role','guest');
  await waitFor('document.querySelector("[data-role=guest]")','guest switch');
  await clickText('Danh sách các ND trình HĐND');
  await waitFor('document.querySelector(".item-data-table")','guest list');
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
  await screenshot('pr95-v3-l5-desktop-guest-edited.png');
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
  await ensure('![...document.querySelectorAll(".inline-note-trigger")].some(x=>x.getAttribute("aria-label")==='+JSON.stringify(firstNote)+')','revoke removes guest note editor');

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await screenshot('pr95-v3-l5-mobile-list.png');
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','mobile reports');
  await screenshot('pr95-v3-l5-mobile-reports.png');
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
  await screenshot('pr95-v3-l5-offline-guest.png');
  await clickText('Đăng nhập quản trị (mô phỏng)');
  await waitFor('document.querySelector("[data-role=admin]")','offline simulated login');
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','offline five real reports');
  await screenshot('pr95-v3-l5-offline-desktop-reports.png');
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
  await screenshot('pr95-v3-l5-offline-mobile-guest.png');
  await clickText('Báo cáo tổng hợp');
  await waitFor('document.querySelectorAll(".report-table").length===5','offline mobile report');
  await screenshot('pr95-v3-l5-offline-mobile-reports.png');
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
