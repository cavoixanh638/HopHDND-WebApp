// Headless Chromium smoke against a locally served, built Pages TEST artifact.
// GViz is intercepted with synthetic records; Firebase production is never contacted.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const html=readFileSync(resolve('dist-pages-test/index.html'));
const server=createServer((req,res)=>{
  if(!req.url||req.url==='/'||req.url.startsWith('/index.html')){res.writeHead(200,{'content-type':'text/html; charset=utf-8'});res.end(html);}
  else{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const candidates=['google-chrome','google-chrome-stable','chromium','chromium-browser'];
const binary=candidates.find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!binary){server.close();throw Error('Chromium/Chrome not found on runner');}
const userDir=mkdtempSync(join(tmpdir(),'hophdnd-ui-'));
const chrome=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu',
  '--disable-extensions','--no-first-run','--no-default-browser-check','--remote-debugging-port=0',
  '--window-size=1600,1000','--user-data-dir='+userDir,'about:blank'],{stdio:['ignore','ignore','pipe']});
let chromeErrors='';
chrome.stderr?.on('data',chunk=>{chromeErrors+=String(chunk).slice(0,2000);});
chrome.on('error',error=>{chromeErrors+=' SPAWN: '+error.message;});
let ws;
let seq=0;
const pending=new Map();
let interceptError=null;
function send(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++seq;pending.set(id,{resolve,reject});
    ws.send(JSON.stringify({id,method,params}));
    setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout: '+method));}},16000);
  });
}
const sourcePayload={status:'ok',table:{cols:Array.from({length:16},()=>({})),rows:[
  {c:[null,null,{v:'Nội dung trình'},{v:'Sở, ngành'}]},
  {c:['NQ01',1,'Nội dung kiểm thử smoke','Sở kiểm thử','QPPL','BTV','Sở chưa trình','Trình xây dựng NQ',
    'Đã trình HĐND','Chuyên viên mẫu','Phòng mẫu','Lãnh đạo VP','Lãnh đạo UBND','','Ghi chú',false].map(v=>({v}))},
  {c:['',2,'','','QPPL','','','','','','','','','','',false].map(v=>({v}))}
]}};
async function evaluate(expression){
  const res=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(res.exceptionDetails)throw Error('Evaluate error: '+JSON.stringify(res.exceptionDetails));
  return res.result?.value;
}
async function eventually(expression,why,tries=75){
  for(let i=0;i<tries;i++){
    if(interceptError)throw interceptError;
    if(await evaluate(expression))return;
    await sleep(200);
  }
  throw Error('Browser smoke failed: '+why);
}
try{
  let chromePort=0;
  const debugFile=join(userDir,'DevToolsActivePort');
  for(let i=0;i<250;i++){
    if(existsSync(debugFile)){chromePort=Number(readFileSync(debugFile,'utf8').split('\n')[0]);break;}
    if(chrome.exitCode!==null)break;
    await sleep(100);
  }
  if(!chromePort)throw Error('Chrome debugging port unavailable; exit='+chrome.exitCode+
    ' binary='+binary+' stderr='+chromeErrors.slice(-2000));
  const tabs=await (await fetch('http://127.0.0.1:'+chromePort+'/json/list')).json();
  const tab=tabs.find(t=>t.type==='page');
  if(!tab)throw Error('Chrome did not open a page');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
  ws.addEventListener('message',ev=>{
    const data=JSON.parse(ev.data);
    if(data.id&&pending.has(data.id)){const p=pending.get(data.id);pending.delete(data.id);data.error?p.reject(Error(JSON.stringify(data.error))):p.resolve(data.result);return;}
    if(data.method==='Fetch.requestPaused'){
      try{
        const url=new URL(data.params.request.url),handler=url.searchParams.get('tqx')?.split('responseHandler:')[1];
        if(!handler||!/^[A-Za-z_][A-Za-z0-9_]*$/.test(handler))throw Error('Unexpected GViz callback');
        const script=handler+'('+JSON.stringify(sourcePayload)+');';
        void send('Fetch.fulfillRequest',{requestId:data.params.requestId,responseCode:200,
          responseHeaders:[{name:'Content-Type',value:'application/javascript; charset=utf-8'}],
          body:Buffer.from(script).toString('base64')}).catch(err=>{interceptError=err;});
      }catch(err){interceptError=err;}
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await send('Fetch.enable',{patterns:[{urlPattern:'*docs.google.com/spreadsheets/*/gviz/tq*',requestStage:'Request'}]});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});
  await eventually("document.querySelector('.nav-tabs')!==null",'App did not render');
  const nav=await evaluate("(()=>{const b=[...document.querySelectorAll('.nav-tabs button')].find(b=>b.textContent?.includes('Danh sách nội dung'));if(!b)return false;b.click();return true})()");
  if(!nav)throw Error('Cannot navigate to content list');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",'Mock Sheets row NQ01 did not render');
  const layoutAndBlanks=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),card=document.querySelector('.item-list-card'),
      viewport=document.querySelector('.item-list-card .table-wrap'),table=document.querySelector('.item-data-table');
    if(!shell||!card||!viewport||!table)return false;
    const shellStyle=getComputedStyle(shell),usable=shell.clientWidth-parseFloat(shellStyle.paddingLeft)-parseFloat(shellStyle.paddingRight);
    const listRows=[...document.querySelectorAll('.item-data-table tbody tr')];
    const blank=listRows.find(row=>row.querySelector('td:first-child')?.textContent?.trim()==='—');
    return Math.abs(card.getBoundingClientRect().width-usable)<=3&&
      table.getBoundingClientRect().width>=viewport.clientWidth-3&&
      !!blank&&blank.querySelectorAll('td').length>=5&&
      [...blank.querySelectorAll('td')].some(cell=>cell.textContent?.trim()==='—')&&
      !/Chưa phân công|Chưa chọn|thiếu mã/.test(blank.textContent??'');
  })()`);
  if(!layoutAndBlanks)throw Error('List/card width diverged or blank Sheet values are not shown as dash');
  const started=await evaluate(`(()=>{const b=document.querySelector('.column-filter summary[aria-label="Lọc cột Sở/đơn vị"]');if(!b)return false;b.click();const input=document.querySelector('input[aria-label="Tìm trong cột Sở/đơn vị"]');input?.focus();return !!input})()`);
  if(!started)throw Error('Column filter UI is missing');
  await send('Input.insertText',{text:'Không khớp'});
  await eventually("document.querySelector('.active-filter-bar')?.textContent?.includes('Không khớp')===true",'Active filter chip not shown');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('Không tìm thấy nội dung')===true",'Column filtering does not restrict the list');
  await evaluate("([...document.querySelectorAll('button')].find(b=>b.textContent==='Bỏ tất cả lọc cột'))?.click()");
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",'Removing filter did not restore list');
  await evaluate(`document.querySelector('input[aria-label="Tên mẫu giao diện"]').focus()`);
  await send('Input.insertText',{text:'Mẫu smoke'});
  await evaluate("([...document.querySelectorAll('button')].find(b=>b.textContent==='Lưu mẫu mới'))?.click()");
  await eventually(`[...document.querySelectorAll('select[aria-label="Mẫu giao diện đã lưu"] option')].some(o=>o.textContent==='Mẫu smoke')`,'Saved view not available');
  const options=await evaluate("(()=>{const s=document.querySelector('.options-menu summary');s?.click();return !!s})()");
  if(!options)throw Error('Options menu missing');
  await evaluate("([...document.querySelectorAll('.options-popover button')].find(b=>b.textContent?.includes('Vào chế độ tùy chỉnh danh sách')))?.click()");
  const frameOk=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),card=document.querySelector('.item-list-card');
    if(!shell||!card)return false;
    const shellStyle=getComputedStyle(shell);
    const usable=shell.clientWidth-parseFloat(shellStyle.paddingLeft)-parseFloat(shellStyle.paddingRight);
    const table=card.querySelector('.item-data-table'),wrap=card.querySelector('.table-wrap');
    return shell.classList.contains('wide-table-page') &&
      Math.abs(card.getBoundingClientRect().width-usable)<=3 &&
      !card.hasAttribute('style') &&
      table?.getBoundingClientRect().width>=wrap?.clientWidth-3 &&
      !![...card.querySelectorAll('summary')].find(x=>x.textContent?.includes('Cột và độ rộng bảng')) &&
      !card.textContent.includes('Cột và khung bảng');
  })()`);
  if(!frameOk)throw Error('Customizing view still uses a narrow fixed frame or stale column title');
  const widthControl=await evaluate(`(()=>{
    // The Pages smoke uses anonymous emulator auth; allow layout inputs here
    // strictly to exercise admin-only width geometry, without saving any data.
    const group=document.querySelector('fieldset.settings-saving');
    if(group?.disabled)group.disabled=false;
    const summary=document.querySelector('.item-column-panel > summary');
    summary?.click();
    const input=document.querySelector('input[aria-label="Độ rộng vùng danh sách (px)"]');
    if(!input)return false;
    input.focus();input.select();
    return document.activeElement===input&&!input.matches(':disabled');
  })()`);
  if(!widthControl)throw Error('The live viewport-width control is absent');
  await send('Input.insertText',{text:'500'});
  await sleep(550);
  console.log('WIDTH_DEBUG',JSON.stringify(await evaluate(`(()=>{
    const rect=q=>{const e=document.querySelector(q);if(!e)return null;const r=e.getBoundingClientRect();return {left:r.left,width:r.width,scroll:e.scrollWidth,client:e.clientWidth};};
    return {input:document.querySelector('input[aria-label="Độ rộng vùng danh sách (px)"]')?.value,
      rootStyle:document.querySelector('.app-shell')?.getAttribute('style'),
      root:rect('.app-shell'),main:rect('.wide-table-page main'),card:rect('.item-list-card'),
      title:rect('.wide-table-page .page-heading'),topbar:rect('.wide-table-page > .topbar'),
      banner:rect('.wide-table-page > .demo-banner'),nav:rect('.wide-table-page > .nav-tabs'),
      wrap:rect('.item-list-card .table-wrap'),table:rect('.item-data-table'),
      status:document.querySelector('.item-frame-controls .muted')?.textContent};
  })()`)));
  await eventually(`(()=>{
    const select=q=>document.querySelector(q)?.getBoundingClientRect();
    const width=q=>select(q)?.width??0;
    const main=select('.wide-table-page main'),card=select('.item-list-card'),
      title=select('.wide-table-page .page-heading');
    const wrap=document.querySelector('.item-list-card .table-wrap');
    return Math.abs(width('.wide-table-page main')-500)<3&&
      Math.abs(width('.item-list-card')-500)<3&&
      Math.abs(width('.wide-table-page > .topbar')-500)<3&&
      Math.abs(width('.wide-table-page > .demo-banner')-500)<3&&
      Math.abs(width('.wide-table-page > .nav-tabs')-500)<3&&
      Math.abs(title?.left-card?.left)<3&&
      Math.abs(title?.width-card?.width)<3&&
      !!wrap&&wrap.scrollWidth>wrap.clientWidth;
  })()`,'Typing 500 did not resize and center page headers, controls and scrollable list');
  const backToAuto=await evaluate(`(()=>{
    const checkbox=[...document.querySelectorAll('.item-frame-controls input[type="checkbox"]')][0];
    if(!checkbox)return false;checkbox.click();return checkbox.checked;
  })()`);
  if(!backToAuto)throw Error('Automatic list width toggle not available');
  await eventually("document.querySelector('.item-list-card')?.getBoundingClientRect().width>1000",'Auto width did not restore full viewport');
  await eventually("document.querySelector('.list-color-editor summary')!==null",'Conditional color settings unavailable');
  await evaluate(`document.querySelector('.list-color-editor summary').click();document.querySelector('input[aria-label="Giá trị kích hoạt màu"]').focus()`);
  await send('Input.insertText',{text:'Đã trình HĐND'});
  await evaluate("([...document.querySelectorAll('button')].find(b=>b.textContent==='Thêm quy tắc'))?.click()");
  await eventually("document.querySelector('.item-data-table tr.color-amber')!==null",'Conditional color not applied to matching row');
  const visual=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-ui-smoke-pass.png',Buffer.from(visual.data,'base64'));
  console.log('BROWSER_SMOKE_PASS: 500px editable centered list+headers, auto reset, mock GViz blank cells, filters, presets and colors.');
}catch(error){
  try{if(ws?.readyState===WebSocket.OPEN){const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync('hophdnd-ui-smoke-failure.png',Buffer.from(shot.data,'base64'));}}catch{}
  console.error('BROWSER_SMOKE_FAIL:',error);process.exitCode=1;
}finally{
  for(const p of pending.values())p.reject?.(Error('closing browser'));
  if(ws)ws.close();
  chrome.kill('SIGKILL');
  server.close();
  rmSync(userDir,{recursive:true,force:true});
}
