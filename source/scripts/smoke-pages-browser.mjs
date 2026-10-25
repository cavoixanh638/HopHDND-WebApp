// Headless Chromium smoke against a locally served, built Pages TEST artifact.
// GViz is intercepted with synthetic records; Firebase production is never contacted.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,writeFileSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const appRoot=resolve('dist-pages-test');
const html=readFileSync(resolve(appRoot,'index.html'));
const server=createServer((req,res)=>{
  try{
    const pathname=new URL(req.url??'/', 'http://127.0.0.1').pathname;
    const file=pathname==='/'?resolve(appRoot,'index.html'):resolve(appRoot,'.'+pathname);
    if(!file.startsWith(appRoot+'/')&&!file.startsWith(appRoot+'\\'))throw Error('Invalid path');
    const meta=statSync(file);
    if(!meta.isFile())throw Error('Not a file');
    const mime=file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8';
    res.writeHead(200,{'content-type':mime,'Cache-Control':'no-store'});res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const candidates=['google-chrome','google-chrome-stable','chromium','chromium-browser'];
const binary=candidates.find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!binary){server.close();throw Error('Chromium/Chrome not found on runner');}
const userDir=mkdtempSync(join(tmpdir(),'hophdnd-ui-'));
let chrome;
let chromeErrors='';
// GitHub hosted runners intermittently hang before creating DevToolsActivePort
// with --remote-debugging-port=0. Reserve an isolated loopback port and probe
// CDP directly; retry with a fresh profile and alternate headless flags only
// when launch fails. Browser assertions must still run and pass.
async function reservePort(){
  const probe=createServer();
  await new Promise((resolve,reject)=>{
    probe.once('error',reject);
    probe.listen(0,'127.0.0.1',resolve);
  });
  const result=probe.address().port;
  await new Promise((resolve,reject)=>probe.close(err=>err?reject(err):resolve()));
  return result;
}
async function launchChrome(){
  const strategies=[
    {mode:'new',flags:['--headless=new','--no-zygote']},
    {mode:'fallback',flags:['--headless','--disable-software-rasterizer']}
  ];
  for(let attempt=0;attempt<strategies.length;attempt++){
    const mode=strategies[attempt];
    const debugPort=await reservePort();
    const profile=join(userDir,'profile-'+attempt);
    chromeErrors='';
    chrome=spawn(binary,[...mode.flags,'--no-sandbox','--disable-dev-shm-usage',
      '--disable-gpu','--disable-extensions','--disable-background-networking',
      '--no-first-run','--no-default-browser-check',
      '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debugPort,
      '--window-size=1600,1000','--user-data-dir='+profile,'about:blank'],
      {stdio:['ignore','ignore','pipe'],env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
    chrome.stderr?.on('data',chunk=>{chromeErrors=(chromeErrors+String(chunk)).slice(-5000);});
    chrome.on('error',error=>{chromeErrors+=' SPAWN: '+error.message;});
    for(let i=0;i<140;i++){
      if(chrome.exitCode!==null)break;
      try{
        const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list',
          {signal:AbortSignal.timeout(900)});
        if(response.ok){
          const tabs=await response.json();
          if(tabs.some(t=>t.type==='page')){
            console.log('CHROME_DEBUG_READY',JSON.stringify({mode:mode.mode,attempt:attempt+1}));
            return tabs;
          }
        }
      }catch{}
      await sleep(150);
    }
    const reason='Attempt '+(attempt+1)+' ('+mode.mode+') Chrome CDP unavailable; exit='+
      chrome.exitCode+' binary='+binary+' stderr='+chromeErrors.slice(-1300);
    console.warn('CHROME_START_RETRY',reason);
    chrome.kill('SIGKILL');
    if(attempt===strategies.length-1)throw Error(reason);
  }
  throw Error('Chrome launch strategies exhausted');
}
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
const sourcePayload={status:'ok',table:{cols:Array.from({length:15},()=>({})),rows:[
  {c:Array.from({length:15},(_,i)=>({v:({
    2:'Nội dung trình',3:'Sở, ngành',4:'Loại VB',5:'Cấp Thành ủy cho ý kiến',
    6:'Tiến độ xin ý kiến Thành ủy',7:'Tiến độ trình HĐND xây dựng NQ',
    8:'Tiến độ trình HĐND ban hành NQ/BC',13:'Tiến độ hiện tại',14:'Ghi chú'
  })[i]??''}))},
  {c:['NQ01',1,'Nội dung kiểm thử smoke','Sở kiểm thử','QPPL','BTV','Sở chưa trình','Trình xây dựng NQ',
    'Đã trình HĐND','Chuyên viên mẫu','Phòng mẫu','PCVP Nguyễn Ngọc Hùng','PCT Trần Văn Quân','Sở đang thực hiện','Ghi chú nguồn O'].map(v=>({v}))},
  {c:['',2,'','','QPPL','','','','','','','','','',''].map(v=>({v}))},
  ...Array.from({length:52},(_,i)=>({c:[`NQ${i+3}`,i+3,`Nội dung kiểm thử thêm ${i+3}`,'Sở kiểm thử','QPPL','','','','','','','','','',''].map(v=>({v}))}))
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
  const tabs=await launchChrome();
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
  // A genuine clean Chrome profile measures cold UI shell render on this runner;
  // auth and Firebase production timing must still be tested on the user's network.
  const cold=await evaluate(`(()=>{const navigation=performance.getEntriesByType('navigation')[0];
    const resources=performance.getEntriesByType('resource');
    return {shellVisibleMs:Math.round(performance.now()),
      responseEndMs:Math.round(navigation?.responseEnd??0),
      moduleFetches:resources.filter(r=>r.initiatorType==='script'||r.name.endsWith('.js')).length,
      stylesheetFetches:resources.filter(r=>r.initiatorType==='link'||r.name.endsWith('.css')).length};})()`);
  console.log('COLD_CHROME_SHELL',JSON.stringify(cold));
  const nav=await evaluate("(()=>{const b=[...document.querySelectorAll('.nav-tabs button')].find(b=>b.textContent?.includes('Danh sách các ND trình HĐND'));if(!b)return false;b.click();return true})()");
  if(!nav)throw Error('Cannot navigate to content list');
  // This test intentionally blocks real Firebase. Keep normal first paint gated,
  // then explicitly opt in to temporary source viewing for isolated Sheets checks.
  await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Xem dữ liệu tạm'));button?.click();return true;})()");
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",'Mock Sheets row NQ01 did not render');
  // CSS-only hover: assert that the value's ink remains exactly unchanged
  // for an editable content button and a workflow status picker.
  const inkPoints=await evaluate(`(()=>{
    const fixture=document.createElement('div');
    fixture.id='hover-ink-fixture';
    fixture.style.cssText='position:fixed;left:180px;top:170px;z-index:100000;background:white;';
    fixture.innerHTML='<table class="item-data-table"><tbody><tr><td class="editable-cell" data-col-key="content"><button class="content-button" type="button">Nội dung thử</button></td><td class="editable-cell" data-progress-tone="office"><button class="cell-value-button cell-picker-trigger" type="button">VP đang thực hiện</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(fixture);
    return [...fixture.querySelectorAll('button')].map(button=>{
      const rect=button.getBoundingClientRect();
      return {x:rect.left+rect.width/2,y:rect.top+rect.height/2,color:getComputedStyle(button).color};
    });
  })()`);
  for(let index=0;index<inkPoints.length;index++){
    const item=inkPoints[index];
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:item.x,y:item.y});
    const color=await evaluate(`getComputedStyle(document.querySelectorAll('#hover-ink-fixture button')[${index}]).color`);
    if(color!==item.color)
      throw Error('Editable hover must preserve exact text ink: '+JSON.stringify({index,before:item.color,after:color}));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:7,y:7});
  await evaluate("document.querySelector('#hover-ink-fixture')?.remove()");
  console.log('EDITABLE_HOVER_INK_PRESERVED_PASS');

  // Overview report: the full clickable TD is the raised hover surface;
  // numeral stays flat, and a non-clickable/zero cell remains unchanged.
  const reportHit=await evaluate(`(()=>{
    const host=document.createElement('section');
    host.className='report-surface';host.id='report-cell-3d-probe';
    host.style.cssText='position:fixed;left:95px;top:350px;z-index:99999;width:400px;';
    host.innerHTML='<table class="data-table report-table" style="width:380px;table-layout:fixed"><tbody><tr><td class="report-number report-clickable-cell" style="width:175px;height:82px"><span class="report-cell-sizer" aria-hidden="true">12</span><button type="button" class="count-button count-drill"><span>12</span></button></td><td class="report-number" style="width:175px;height:82px">—</td></tr></tbody></table>';
    document.querySelector('.app-shell').appendChild(host);
    const clickable=host.querySelector('td.report-clickable-cell'),box=clickable.getBoundingClientRect();
    return {x:box.left+box.width*.8,y:box.top+box.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...reportHit});
  await new Promise(resolve=>setTimeout(resolve,260));
  const reportFullCell=await evaluate(`(()=>{
    const root=document.querySelector('#report-cell-3d-probe');
    const td=root.querySelector('td.report-clickable-cell'),button=td.querySelector('button'),
      badge=button.querySelector('span'),empty=root.querySelector('td:not(.report-clickable-cell)');
    const tdCss=getComputedStyle(td),badgeCss=getComputedStyle(badge),emptyCss=getComputedStyle(empty);
    return {hover:td.matches(':hover'),wholeLift:new DOMMatrixReadOnly(tdCss.transform).m42,
      wholeShadow:tdCss.boxShadow,badgeLift:new DOMMatrixReadOnly(badgeCss.transform).m42,
      badgeShadow:badgeCss.boxShadow,emptyLift:new DOMMatrixReadOnly(emptyCss.transform).m42,
      targetWidth:button.getBoundingClientRect().width,cellWidth:td.getBoundingClientRect().width};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:12,y:12});
  await new Promise(resolve=>setTimeout(resolve,220));
  const reportReset=await evaluate(`new DOMMatrixReadOnly(getComputedStyle(
    document.querySelector('#report-cell-3d-probe td.report-clickable-cell')).transform).m42`);
  await evaluate("document.querySelector('#report-cell-3d-probe')?.remove()");
  if(!reportFullCell.hover||Math.abs(reportFullCell.wholeLift+3)>.3||
    !reportFullCell.wholeShadow.includes('8px 16px')||
    Math.abs(reportFullCell.badgeLift)>.2||reportFullCell.badgeShadow!=='none'||
    Math.abs(reportFullCell.emptyLift)>.2||Math.abs(reportReset)>.3||
    reportFullCell.targetWidth<reportFullCell.cellWidth-8)
    throw Error('Overview must lift whole actionable count cell, not just numeral: '+
      JSON.stringify({reportFullCell,reportReset}));
  console.log('REPORT_FULL_CELL_3D_PASS',JSON.stringify(reportFullCell));
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
  const fullExcelColumns=await evaluate(`(()=>{
    const header=[...document.querySelectorAll('.item-heading-row th')].map(node=>node.querySelector('.column-heading-label')?.textContent?.trim()??'');
    const values=document.querySelector('.item-data-table tbody tr')?.textContent??'';
    return header.includes('Cấp Thành ủy cho ý kiến')&&
      header.includes('Tiến độ hiện tại')&&header.includes('Ghi chú')&&
      !header.includes('Đã thẩm tra chưa')&&
      values.includes('Sở đang thực hiện')&&values.includes('Ghi chú nguồn O');
  })()`);
  if(!fullExcelColumns)throw Error('Current 15-column E/F/G/N/O source values missing from viewer');

  // Read-only anonymous viewers have the same TWO field-history actions as
  // administrators. Neither history action grants edit rights.
  const listHistory=await evaluate(`(()=>{
    const historyFields=['note','specificProgress'];
    const find=key=>document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="'+key+'"]');
    const buttons=historyFields.map(key=>find(key)?.querySelector('button.cell-history-action'));
    const unrelated=['content','department','progressCouncil'].some(key=>
      !!find(key)?.querySelector('button.cell-history-action'));
    return {ok:buttons.every(Boolean)&&!unrelated,
      labels:buttons.map(button=>button?.getAttribute('aria-label'))};
  })()`);
  if(!listHistory.ok||!listHistory.labels.some(x=>x?.includes('Ghi chú'))||
    !listHistory.labels.some(x=>x?.includes('Tiến độ hiện tại')))
    throw Error('Guest must see history on note and current-progress only: '+JSON.stringify(listHistory));
  for(const field of ['specificProgress','note']){
    await evaluate(`document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="${field}"] button.cell-history-action').click()`);
    await eventually(`!!document.querySelector('dialog.modal[open][aria-label^="Lịch sử sửa đổi"]')`,
      'History dialog did not open for '+field);
    const modalField=await evaluate(`(()=>{
      const dialog=document.querySelector('dialog.modal[open]');
      return {title:dialog?.getAttribute('aria-label'),demo:!!dialog?.querySelector('.note-history-demo')};
    })()`);
    if(!modalField.title?.includes(field==='note'?'Ghi chú':'Tiến độ hiện tại')||
      modalField.demo!==(field==='note'))
      throw Error('History dialog must target exactly the requested column: '+
        JSON.stringify({field,modalField}));
    await evaluate("document.querySelector('dialog.modal[open] button[aria-label=\\\"Đóng cửa sổ\\\"]')?.click()");
    await eventually("!document.querySelector('dialog.modal[open]')",'History dialog did not close');
  }
  console.log('GUEST_TWO_FIELD_HISTORY_PASS',JSON.stringify(listHistory));
  const all15=await evaluate(`(()=>{
    const keys=[...document.querySelectorAll('.item-column-filter-row [data-filter-key]')]
      .map(el=>el.getAttribute('data-filter-key'));
    const headings=[...document.querySelectorAll('.item-heading-row th')]
      .map(el=>el.querySelector('.column-heading-label')?.textContent??'');
    const button=document.querySelector('.source-column-visibility button');
    const expected=['displayCode','stt','content','department','type','partyLevel','progressParty',
      'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader',
      'specificProgress','note'];
    return keys.length===15&&JSON.stringify(keys)===JSON.stringify(expected)&&
      !keys.includes('history')&&
      !headings.some(x=>x.trim()==='Rút')&&headings.includes('Cấp Thành ủy cho ý kiến')&&headings.includes('Tiến độ hiện tại')&&
      !headings.some(x=>x.includes('Trình / Rút'))&&
      ['type','partyLevel','progressParty','progressBuild','progressCouncil','specificProgress','note']
        .every(key=>keys.includes(key))&&
      headings.includes('Loại VB')&&
      !headings.some(x=>x.includes('Loại VB (HC/QPPL/BC)'))&&
      headings.some(x=>x.includes('Tiến độ xin ý kiến Thành ủy'))&&
      headings.some(x=>x.includes('Tiến độ trình HĐND xây dựng NQ'))&&
      headings.some(x=>x.includes('Tiến độ trình HĐND ban hành NQ/BC'))&&
      // Column visibility is an admin configuration, not a guest-side preference.
       !button;
  })()`);
  if(!all15)throw Error('Default Excel viewer must show all 15 source columns including E/F/G/N/O');

  const statusStyles=await evaluate(`(()=>{
    const status=document.querySelector('.item-data-table tbody td[data-col-key=progressParty]');
    const label=status?.querySelector('.workflow-status-value');
    const input=document.querySelector('[data-filter-key=content] input');
    const selector=document.querySelector('[data-filter-key=type] select');
    const th=document.querySelector('.item-heading-row th');
    if(!status||!label||!input||!selector||!th)return {ok:false,reason:'missing targets'};
    const style=getComputedStyle(label),header=getComputedStyle(th);
    const fontA=getComputedStyle(input).fontSize,fontB=getComputedStyle(selector).fontSize;
    // Verify semantic colors and the editing hierarchy with inert mock DOM only.
    // No Sheets/Firebase records or permissions are changed by this check.
    const colors=['office','done'].map(tone=>{
      const td=document.createElement('td');td.dataset.progressTone=tone;
      const span=document.createElement('span');span.className='workflow-status-value';
      span.textContent=tone;td.append(span);status.parentElement.append(td);
      const styled=getComputedStyle(span);
      const value={bg:styled.backgroundColor,fg:styled.color,weight:styled.fontWeight};
      td.remove();return value;
    });
    const td=document.createElement('td');td.className='editable-cell';
    const button=document.createElement('button');button.className='cell-picker-trigger';
    button.textContent='Giá trị khác';td.append(button);status.parentElement.append(td);
    const regularEditable=getComputedStyle(button);
    const editStyle={bg:regularEditable.backgroundColor,fg:regularEditable.color,
      weight:regularEditable.fontWeight,border:regularEditable.borderTopColor};
    td.remove();
    // Regression for the user's pink-pill screenshot: check EDITABLE dropdowns,
    // not just the guest's read-only status badges. Test both grids in Chrome.
    const editableStatuses=['item-data-table','report-detail-grid'].map(grid=>{
      let table;
      const row=grid==='item-data-table'?status.parentElement:(()=>{
        table=document.createElement('table');table.className='report-detail-grid';
        table.style.position='absolute';table.style.top='-10000px';
        const body=table.appendChild(document.createElement('tbody'));
        const tr=body.appendChild(document.createElement('tr'));
        document.querySelector('.app-shell').appendChild(table);return tr;
      })();
      const values=['not-submitted','office','done'].map(tone=>{
        const cell=document.createElement('td');
        cell.className='editable-cell has-history-action';cell.dataset.progressTone=tone;
        const trigger=document.createElement('button');
        trigger.className='cell-value-button cell-picker-trigger';
        trigger.type='button';trigger.textContent=tone;cell.appendChild(trigger);
        const history=document.createElement('button');
        history.type='button';history.className='cell-history-action';
        cell.appendChild(history);row.appendChild(cell);
        const style=getComputedStyle(trigger),h=getComputedStyle(history);
        const result={background:style.backgroundColor,color:style.color,weight:style.fontWeight,
          border:style.borderTopColor,historyOpacity:h.opacity,tag:trigger.tagName,
          arrow:getComputedStyle(trigger,'::after').content};
        cell.remove();return result;
      });
      if(table)table.remove();
      return values;
    });
    const expectedStatusColors=[
      ['rgb(255, 224, 228)','rgb(208, 0, 37)'],
      ['rgb(254, 249, 195)','rgb(133, 77, 14)'],
      ['rgb(213, 240, 222)','rgb(0, 122, 24)']];
    const coloredEditableOk=editableStatuses.every(group=>group.every((entry,i)=>
      entry.background===expectedStatusColors[i][0]&&entry.color===expectedStatusColors[i][1]&&
      entry.weight==='600'&&entry.historyOpacity==='0.42'&&entry.tag==='BUTTON'&&entry.arrow==='""'));
    return {ok:status.dataset.progressTone==='not-submitted'&&
      label.textContent?.includes('Sở chưa trình')&&
      style.backgroundColor==='rgb(255, 224, 228)'&&coloredEditableOk&&
      colors[0].bg==='rgb(254, 249, 195)'&&colors[1].bg==='rgb(213, 240, 222)'&&
      colors[0].fg==='rgb(133, 77, 14)'&&colors[0].weight==='600'&&
      colors[1].fg==='rgb(0, 122, 24)'&&colors[1].weight==='600'&&
      editStyle.bg==='rgb(242, 246, 249)'&&editStyle.fg==='rgb(66, 98, 116)'&&
      editStyle.weight==='550'&&editStyle.border==='rgb(183, 203, 214)'&&
      fontA==='15px'&&fontB==='15px'&&
      header.backgroundColor==='rgb(239, 245, 249)',
      colors,editStyle,editableStatuses,statusColor:style.backgroundColor,
      fontA,fontB,header:header.backgroundColor};
  })()`);
  if(!statusStyles.ok)throw Error('Workflow badges/header/filter typography regression: '+JSON.stringify(statusStyles));

  // Semantic report styling applies to both numeric totals and % completion.
  // Real CSS inheritance must not be replaced with a hardcoded color copy.
  const semanticCells=await evaluate(`(()=>{
    const root=document.createElement('section');root.id='report-semantic-probe';
    root.className='report-surface report-style-classic';
    root.style.cssText='position:fixed;left:480px;top:95px;z-index:11000';
    root.innerHTML='<table class="data-table report-table" style="width:480px;table-layout:fixed"><thead><tr><th class="report-group-heading">Sở, ngành chủ trì</th><th class="report-number-header report-percent-col">% hoàn thành</th></tr></thead><tbody><tr><th class="report-group-heading">Phòng</th><td class="report-number report-percent-col">25%</td></tr><tr><td class="report-number report-stage-source report-clickable-cell">2</td><td class="report-number report-stage-office report-clickable-cell">3</td><td class="report-number report-stage-completed report-clickable-cell">4</td></tr></tbody></table>';
    document.querySelector('.app-shell').append(root);
    const css=el=>{const c=getComputedStyle(el);return {bg:c.backgroundColor,ink:c.color,border:c.borderColor}};
    return {header:css(root.querySelector('th.report-group-heading')),
      percent:css(root.querySelector('td.report-percent-col')),
      complete:css(root.querySelector('td.report-stage-completed')),
      office:css(root.querySelector('td.report-stage-office')),
      statusCells:[...root.querySelectorAll('td.report-clickable-cell')].map(el=>({
        tone:el.className.split(' ').find(k=>k.startsWith('report-stage-')),
        rect:el.getBoundingClientRect().toJSON(),
        ink:getComputedStyle(el).color}))};
  })()`);
  if(semanticCells.header.bg!=='rgb(250, 251, 252)'||
    semanticCells.percent.bg!==semanticCells.complete.bg||
    semanticCells.percent.ink!==semanticCells.complete.ink||
    semanticCells.office.bg!=='rgb(254, 249, 195)'||
    semanticCells.office.ink!=='rgb(133, 77, 14)')
    throw Error('Semantic office/percent/header styling regression: '+JSON.stringify(semanticCells));
  const expectedBorder={ 'report-stage-source':'rgb(208, 0, 37)',
    'report-stage-office':'rgb(133, 77, 14)',
    'report-stage-completed':'rgb(0, 122, 24)'};
  for(const cell of semanticCells.statusCells){
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',
      x:cell.rect.x+cell.rect.width/2,y:cell.rect.y+cell.rect.height/2});
    await new Promise(resolve=>setTimeout(resolve,240));
    const style=await evaluate(`(()=>{
      const cell=[...document.querySelectorAll('#report-semantic-probe td.report-clickable-cell')]
        .find(el=>el.classList.contains(${JSON.stringify(cell.tone)}));
      const css=getComputedStyle(cell);return {color:css.outlineColor,width:css.outlineWidth,
        lift:new DOMMatrixReadOnly(css.transform).m42};
    })()`);
    if(style.color!==expectedBorder[cell.tone]||style.width!=='2px'||Math.abs(style.lift+3)>.3)
      throw Error('Entire report count cell needs semantic 3px hover: '+JSON.stringify({cell,style}));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:6,y:6});
  await evaluate("document.querySelector('#report-semantic-probe')?.remove()");
  console.log('SEMANTIC_HOVER_COLORS_AND_COMPLETION_PASS',JSON.stringify(semanticCells));


  // Hover anywhere in a LIST editable cell: no parent ring, only a compact
  // pale inner status button ring. Uses real Chrome pointer hover, fake data.
  const hoverProbe=await evaluate(`(()=>{
    const host=document.createElement('div');
    host.id='list-edit-hover-probe';
    host.style.cssText='position:fixed;left:18px;top:96px;width:340px;z-index:20000;background:#fff;';
    host.innerHTML='<table class="data-table item-data-table" style="width:340px;table-layout:fixed"><tbody><tr><td class="editable-cell" data-progress-tone="not-submitted" style="height:86px"><button type="button" class="cell-value-button cell-picker-trigger">Sở chưa trình</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const td=host.querySelector('td'),control=host.querySelector('button');
    const parent=td.getBoundingClientRect(),inner=control.getBoundingClientRect();
    return {x:parent.right-7,y:parent.top+parent.height/2,
      outerWidth:parent.width,innerWidth:inner.width,
      outsideInner:parent.right-7>inner.right};
  })()`);
  if(!hoverProbe.outsideInner||hoverProbe.innerWidth>=hoverProbe.outerWidth-25)
    throw Error('List status inner editor must be compact and leave clickable parent padding: '+JSON.stringify(hoverProbe));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:hoverProbe.x,y:hoverProbe.y});
  await new Promise(resolve=>setTimeout(resolve,270)); // let the moderate lift transition settle
  const listHoverRing=await evaluate(`(()=>{
    const td=document.querySelector('#list-edit-hover-probe td');
    const button=td?.querySelector('button');
    if(!td||!button)return {ok:false,missing:true};
    const outer=getComputedStyle(td),inner=getComputedStyle(button);
    return {ok:td.matches(':hover')&&!button.matches(':hover')&&
      outer.boxShadow==='none'&&outer.outlineStyle==='none'&&
      inner.borderTopColor==='rgb(208, 0, 37)'&&
      inner.boxShadow.includes('rgb(255, 224, 228)')&&
      inner.boxShadow.includes('8px 16px')&&
      Math.abs(new DOMMatrixReadOnly(inner.transform).m42+3)<.25&&
      inner.outlineStyle==='solid'&&inner.outlineColor==='rgb(208, 0, 37)',
      outerShadow:outer.boxShadow,outerOutline:outer.outlineStyle,
      innerBorder:inner.borderTopColor,innerShadow:inner.boxShadow,
      liftY:new DOMMatrixReadOnly(inner.transform).m42,
      hoverCell:td.matches(':hover'),hoverButton:button.matches(':hover')};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
  await new Promise(resolve=>setTimeout(resolve,270));
  const liftAfterLeave=await evaluate(`(()=>{
    const cell=document.querySelector('#list-edit-hover-probe td');
    const control=cell?.querySelector('button');
    return {noParentRing:getComputedStyle(cell).boxShadow==='none',
      liftY:new DOMMatrixReadOnly(getComputedStyle(control).transform).m42};
  })()`);
  await evaluate("document.querySelector('#list-edit-hover-probe')?.remove()");
  if(Math.abs(liftAfterLeave.liftY)>.25||!liftAfterLeave.noParentRing)
    throw Error('3D option B must reset after mouseleave: '+JSON.stringify(liftAfterLeave));
  if(!listHoverRing.ok)throw Error('Editable List cell must highlight only pale compact inner control when pointer is on outer cell: '+JSON.stringify({hoverProbe,listHoverRing}));
  console.log('LIST_INNER_HOVER_PASS',JSON.stringify(listHoverRing));

  // Note preview button also lifts, while an active multiline textarea stays flat.
  const noteProbe=await evaluate(`(()=>{
    const root=document.createElement('table');
    root.className='data-table item-data-table';root.id='hover-3d-note-probe';
    root.style.cssText='position:fixed;left:20px;top:130px;width:350px;z-index:20000;background:#fff';
    root.innerHTML='<tbody><tr><td class="editable-cell" data-col-key="note" style="width:345px;height:80px"><button type="button" class="inline-note-trigger">Nội dung ghi chú</button></td></tr></tbody>';
    document.querySelector('.app-shell').append(root);
    const box=root.querySelector('td').getBoundingClientRect();
    return {x:box.right-9,y:box.top+box.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:noteProbe.x,y:noteProbe.y});
  await new Promise(resolve=>setTimeout(resolve,270));
  const note3d=await evaluate(`(()=>{
    const cell=document.querySelector('#hover-3d-note-probe td'),button=cell.querySelector('button');
    const style=getComputedStyle(button),parent=getComputedStyle(cell);
    return {active:cell.matches(':hover'),outerShadow:parent.boxShadow,
      liftY:new DOMMatrixReadOnly(style.transform).m42,shadow:style.boxShadow,
      border:style.borderTopColor};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
  await evaluate("document.querySelector('#hover-3d-note-probe')?.remove()");
  if(!note3d.active||note3d.outerShadow!=='none'||Math.abs(note3d.liftY+3)>.25||
    !note3d.shadow.includes('8px 16px')||note3d.border!=='rgb(46, 111, 149)')
    throw Error('3D option B note affordance mismatch: '+JSON.stringify(note3d));
  console.log('HOVER_3D_B_LIST_NOTE_PASS',JSON.stringify(note3d));


  // Regression: textarea may remain focused for typing after pointer leaves.
  // That MUST NOT look like the active green/blue mouse-hover highlight.
  const inlineProbe=await evaluate(`(()=>{
    const host=document.createElement('div');host.id='inline-hover-off-probe';
    host.style.cssText='position:fixed;left:26px;top:103px;width:345px;z-index:20000;background:#fff;';
    host.innerHTML='<table class="data-table item-data-table" style="width:345px"><tbody><tr><td class="editable-cell" data-col-key="specificProgress"><textarea class="inline-note-textarea" rows="3">Đang xử lý</textarea></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const field=host.querySelector('textarea');
    field.focus({preventScroll:true});
    const box=field.getBoundingClientRect();
    return {x:box.left+box.width/2,y:box.top+box.height/2,focused:document.activeElement===field};
  })()`);
  if(!inlineProbe.focused)throw Error('Synthetic multiline editor could not receive focus');
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:inlineProbe.x,y:inlineProbe.y});
  const inlineHover=await evaluate(`(()=>{
    const td=document.querySelector('#inline-hover-off-probe td');
    const area=td?.querySelector('textarea');
    const style=area&&getComputedStyle(area);
    return {active:document.activeElement===area,hover:td?.matches(':hover'),
      border:style?.borderTopColor,shadow:style?.boxShadow};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
  const inlineAfterLeave=await evaluate(`(()=>{
    const td=document.querySelector('#inline-hover-off-probe td');
    const area=td?.querySelector('textarea');
    const style=area&&getComputedStyle(area);
    return {active:document.activeElement===area,hover:td?.matches(':hover'),
      border:style?.borderTopColor,shadow:style?.boxShadow,outline:style?.outlineStyle,
      tdShadow:td?getComputedStyle(td).boxShadow:null};
  })()`);
  await evaluate("document.querySelector('#inline-hover-off-probe')?.remove()");
  if(!inlineHover.active||!inlineHover.hover||
    inlineHover.border!=='rgb(167, 216, 237)'||
    !inlineHover.shadow.includes('rgb(221, 243, 253)')||
    !inlineAfterLeave.active||inlineAfterLeave.hover||
    inlineAfterLeave.border!=='rgb(205, 217, 212)'||
    inlineAfterLeave.shadow!=='none'||inlineAfterLeave.outline!=='none'||
    inlineAfterLeave.tdShadow!=='none')
    throw Error('Focused inline textarea kept hover highlight after pointer left: '+JSON.stringify({inlineHover,inlineAfterLeave}));
  console.log('INLINE_HOVER_LEAVE_CLEARS_HIGHLIGHT_PASS',JSON.stringify({inlineHover,inlineAfterLeave}));


  // Guest receives the palette but never an editable palette control.
  const hiddenGuestPalette=await evaluate(`!document.querySelector('.item-header-actions .status-palette-trigger')`);
  if(!hiddenGuestPalette)throw Error('Guest must not receive admin status palette editor');
  const paletteCascade=await evaluate(`(()=>{
    const root=document.querySelector('.app-shell');
    const sample=document.querySelector('.item-data-table tbody td[data-progress-tone="not-submitted"] .workflow-status-value');
    if(!root||!sample)return {ok:false,reason:'missing table/status'};
    root.style.setProperty('--hdnd-status-not-submitted-text','#A10022');
    root.style.setProperty('--hdnd-status-not-submitted-bg','#F1CBDB');
    const style=getComputedStyle(sample);
    const ok=style.color==='rgb(161, 0, 34)'&&style.backgroundColor==='rgb(241, 203, 219)';
    root.style.removeProperty('--hdnd-status-not-submitted-text');
    root.style.removeProperty('--hdnd-status-not-submitted-bg');
    return {ok,text:style.color,background:style.backgroundColor};
  })()`);
  if(!paletteCascade.ok)throw Error('Status palette CSS did not cascade: '+JSON.stringify(paletteCascade));
  const sortAndGuestLayout=await evaluate(`(()=>{
    const topbar=document.querySelector('.topbar'),nav=document.querySelector('.nav-tabs');
    const cardHeader=document.querySelector('.item-data-region .card-header');
    const viewport=document.querySelector('.item-table-scroll');
    const status=document.querySelector('.item-filter-status-slot');
    const stt=document.querySelector('.item-heading-row th[data-column-key="stt"]');
    const sort=stt?.querySelector('.column-sort-button');
    if(!topbar||!nav||!viewport||!stt||sort)return {ok:false,reason:'Missing guest chrome or sort incorrectly visible in view mode'};
    const top=topbar.getBoundingClientRect(),tabs=nav.getBoundingClientRect();
    const gap=viewport.getBoundingClientRect().top-tabs.bottom;
    const aligned=Math.abs((top.left+top.right)/2-(tabs.left+tabs.right)/2)<3&&tabs.width<=1000&&tabs.width<top.width;
    return {ok:aligned&&gap<115&&!status&&!cardHeader,aligned,gap,hasEmptyStatus:!!status,hasCounterHeader:!!cardHeader};
  })()`);
  if(!sortAndGuestLayout.ok)throw Error('Guest layout regression: '+JSON.stringify(sortAndGuestLayout));
  const mainSectionCards=await evaluate(`(()=>{
    const nav=document.querySelector('nav.primary-section-switcher');
    const cards=[...(nav?.querySelectorAll('button.primary-section-card')??[])];
    const labels=cards.map(el=>el.querySelector('.section-card-title')?.textContent);
    const boxes=cards.map(el=>el.getBoundingClientRect());
    const geometry=cards.map(el=>{
      const title=el.querySelector('.section-card-title'),slot=el.querySelector('.section-card-state');
      const r=title?.getBoundingClientRect(),badge=slot?.getBoundingClientRect(),button=el.getBoundingClientRect();
      const range=document.createRange();
      if(title)range.selectNodeContents(title);
      const pieces=range.getClientRects().length;
      return {lines:pieces,rightInset:button.right-(badge?.right??0),
        titleFits:!!r&&!!badge&&r.right<badge.left-2,
        overflow:!!title&&title.scrollWidth>title.clientWidth+1,
        badgeWidth:badge?.width};
    });
    const selected=cards.find(el=>el.classList.contains('active'));
    const unselected=cards.find(el=>!el.classList.contains('active'));
    const activeStyle=selected?getComputedStyle(selected):null;
    const idleStyle=unselected?getComputedStyle(unselected):null;
    const restrainedGradient=activeStyle?.backgroundImage.includes('linear-gradient')&&idleStyle?.backgroundImage==='none';
    const distinct=activeStyle?.backgroundColor!==idleStyle?.backgroundColor;
    const border=activeStyle?parseFloat(activeStyle.borderTopWidth)>=2:false;
    const noIcons=nav.querySelectorAll('.section-card-icon').length===0;
    const activeBadge=!!selected&&getComputedStyle(selected.querySelector('.section-card-state')).backgroundColor!=='rgba(0, 0, 0, 0)';
    const cardDepth=!!activeStyle?.boxShadow.includes('10px 24px')&&!!idleStyle?.boxShadow.includes('4px 14px');
    return {ok:nav?.getBoundingClientRect().width<=1000&&
      restrainedGradient&&distinct&&border&&noIcons&&activeBadge&&cardDepth&&
      geometry.length===2&&geometry.every(g=>g.lines===1&&g.titleFits&&!g.overflow&&g.rightInset>=15&&g.rightInset<=29)&&
      Math.abs(geometry[0].rightInset-geometry[1].rightInset)<1&&
      Math.abs(geometry[0].badgeWidth-geometry[1].badgeWidth)<1&&
      cards.length===2&&labels[0]==='Báo cáo tổng hợp'&&
      labels[1]==='Danh sách các ND trình HĐND'&&
      boxes.every(box=>box.width>=300&&box.height>=78&&box.height<=100)&&
      !nav.querySelector('.section-card-description')&&
      getComputedStyle(unselected.querySelector('.section-card-state')).visibility==='hidden'&&
      getComputedStyle(selected.querySelector('.section-card-state')).visibility==='visible'&&
      cards.every(el=>el.querySelector('.section-card-state')?.textContent==='Đang xem')&&
      Math.abs(boxes[0].width-boxes[1].width)<1&&
      Math.abs(boxes[0].height-boxes[1].height)<1&&
      cards.filter(el=>el.classList.contains('active')).length===1&&
      !document.querySelector('.brand,.demo-banner,.page-heading,.unknown-note'),
      labels,widths:boxes.map(box=>Math.round(box.width)),geometry,restrainedGradient,distinct,border,noIcons,activeBadge,cardDepth};
  })()`);
  if(!mainSectionCards.ok)throw Error('Two main section cards were not rendered cleanly: '+JSON.stringify(mainSectionCards));
  console.log('TAB_LABELS_RIGHT_AND_SINGLE_LINE_PASS',JSON.stringify(mainSectionCards.geometry));
  console.log('PRIMARY_CARD_TABS_NO_ICONS_PASS',JSON.stringify({widths:mainSectionCards.widths,cardDepth:mainSectionCards.cardDepth,activeBadge:mainSectionCards.activeBadge}));

  // Theme2 is a visual skin: a very subtle gradient ONLY on the active tab,
  // solid Imperial Sky action buttons, white/ice surfaces elsewhere.
  const imperial=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell');
    const tabs=[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')];
    const active=tabs.find(el=>el.classList.contains('active')),
      inactive=tabs.find(el=>!el.classList.contains('active'));
    const ac=getComputedStyle(active),ic=getComputedStyle(inactive);
    const fixture=document.createElement('div');
    fixture.style.cssText='position:fixed;top:80px;left:30px;z-index:100000;';
    fixture.innerHTML='<button class="button primary">Lưu</button><button class="button ghost">Khác</button><input type="text" />';
    shell.appendChild(fixture);
    const solid=getComputedStyle(fixture.querySelector('.button.primary')),
      ghost=getComputedStyle(fixture.querySelector('.button.ghost'));
    const result={scope:shell.classList.contains('imperial-sky-theme'),
      gradient:ac.backgroundImage,activeInk:ac.color,activeBorder:ac.borderTopColor,
      inactiveFill:ic.backgroundColor,inactiveInk:ic.color,
      actionFill:solid.backgroundColor,actionInk:solid.color,
      ghostInk:ghost.color,activeBox:active.getBoundingClientRect().width,
      inactiveBox:inactive.getBoundingClientRect().width};
    fixture.remove();return result;
  })()`);
  if(!imperial.scope||
    !imperial.gradient.includes('linear-gradient')||
    !imperial.gradient.includes('36, 90, 121')||
    !imperial.gradient.includes('46, 111, 149')||
    imperial.activeInk!=='rgb(248, 251, 253)'||
    imperial.activeBorder!=='rgb(36, 90, 121)'||
    imperial.inactiveFill!=='rgb(242, 248, 252)'||
    imperial.inactiveInk!=='rgb(53, 85, 107)'||
    imperial.actionFill!=='rgb(46, 111, 149)'||
    imperial.actionInk!=='rgb(255, 255, 255)'||
    imperial.ghostInk!=='rgb(53, 85, 107)'||
    Math.abs(imperial.activeBox-imperial.inactiveBox)>1)
    throw Error('Imperial Sky must style chrome without changing geometry: '+JSON.stringify(imperial));
  console.log('THEME2_IMPERIAL_SKY_CHROME_PASS',JSON.stringify(imperial));

  // The inactive label reserves exactly the same space as "Đang xem".
  // Switching either main tab must not resize either button.
  const beforeSwitch=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')]
    .map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))`);
  await evaluate("document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')[0].click()");
  await eventually("document.querySelector('nav.primary-section-switcher button.primary-section-card:first-child')?.classList.contains('active')===true",
    'Overview tab did not become active');
  const duringSwitch=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')]
    .map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
      state:getComputedStyle(el.querySelector('.section-card-state')).visibility,
      gradient:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}))`);
  await evaluate("document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')[1].click()");
  await eventually("document.querySelector('nav.primary-section-switcher button.primary-section-card:last-child')?.classList.contains('active')===true",
    'List tab did not become active again');
  const afterSwitch=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher button.primary-section-card')]
    .map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,
      state:getComputedStyle(el.querySelector('.section-card-state')).visibility,
      gradient:getComputedStyle(el).backgroundImage,color:getComputedStyle(el).color}))`);
  const stableSize=beforeSwitch.every((item,i)=>
    Math.abs(item.width-duringSwitch[i].width)<1&&
    Math.abs(item.height-duringSwitch[i].height)<1&&
    Math.abs(item.width-afterSwitch[i].width)<1&&
    Math.abs(item.height-afterSwitch[i].height)<1);
  if(!stableSize||duringSwitch[0].state!=='visible'||duringSwitch[1].state!=='hidden'||
    afterSwitch[0].state!=='hidden'||afterSwitch[1].state!=='visible'||
    !duringSwitch[0].gradient.includes('linear-gradient')||
    duringSwitch[1].gradient!=='none'||
    !afterSwitch[1].gradient.includes('linear-gradient')||
    afterSwitch[0].gradient!=='none')
    throw Error('Main tabs changed size/hidden-label spacing while switching: '+
      JSON.stringify({beforeSwitch,duringSwitch,afterSwitch}));
  console.log('PRIMARY_TABS_FIXED_SIZE_PASS',JSON.stringify({beforeSwitch,duringSwitch,afterSwitch}));

  for(const [selector,color] of [['.active','rgb(248, 251, 253)'],[':not(.active)','rgb(53, 85, 107)']]){
    const query='nav.primary-section-switcher .primary-section-card'+selector;
    const p=await evaluate(`(()=>{
      const el=document.querySelector(${JSON.stringify(query)});
      el?.scrollIntoView({block:'center',inline:'nearest'});
      const r=el?.getBoundingClientRect();return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;
    })()`);
    if(!p)throw Error('No main tab for 3D hover '+selector);
    await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y});
    await new Promise(resolve=>setTimeout(resolve,270));
    const hover=await evaluate(`(()=>{
      const el=document.querySelector(${JSON.stringify(query)});
      const style=getComputedStyle(el);
      return {hover:el.matches(':hover'),liftY:new DOMMatrixReadOnly(style.transform).m42,
        color:style.color,shadow:style.boxShadow,
        titleSize:parseFloat(getComputedStyle(el.querySelector('.section-card-title')).fontSize)};
    })()`);
    if(!hover.hover||Math.abs(hover.liftY+3)>.25||!hover.shadow.includes('12px 24px')||
      hover.color!==color||hover.titleSize<18)
      throw Error('Main tab 3D or lighter text mismatch: '+JSON.stringify({selector,hover}));
  }
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:785,y:9});
  await new Promise(resolve=>setTimeout(resolve,270));
  const navReset=await evaluate(`[...document.querySelectorAll('nav.primary-section-switcher .primary-section-card')]
    .every(el=>Math.abs(new DOMMatrixReadOnly(getComputedStyle(el).transform).m42)<.25)`);
  if(!navReset)throw Error('Main tabs still elevated after mouseleave');
  console.log('HOVER_3D_B_MAIN_TABS_PASS');

  const listHeadingAndLines=await evaluate(`(()=>{
    const card=document.querySelector('.item-data-region .card-header');
    const title=document.querySelector('.nav-tabs button[aria-current=page] .section-card-title');
    const headers=[...document.querySelectorAll('.item-heading-row th')];
    const first=headers[0];
    const label=first?.querySelector('.column-heading-label');
    const filter=document.querySelector('.item-column-filter-row th');
    const td=document.querySelector('.item-data-table tbody td');
    const thinLine=node=>node?getComputedStyle(node).borderRightWidth:null;
    return {ok:!card&&title?.textContent==='Danh sách các ND trình HĐND'&&
      !document.querySelector('.item-list-summary')&&
      headers.length>=10&&
      getComputedStyle(label).textAlign==='center'&&
      thinLine(first)==='1px'&&thinLine(filter)==='1px'&&thinLine(td)==='1px',
      heading:title?.textContent,headers:headers.length,
      align:label?getComputedStyle(label).textAlign:null,
      widths:[thinLine(first),thinLine(filter),thinLine(td)]};
  })()`);
  if(!listHeadingAndLines.ok)throw Error('List header or subtle separators regression: '+JSON.stringify(listHeadingAndLines));
  // Sorting is now edit-mode only. The viewer/anonymous guest must not
  // expose a sorting button or activate sort via the header itself.
  const viewerSortBlocked=await evaluate(`(()=>{
    const header=document.querySelector('.item-heading-row th[data-column-key="stt"]');
    header?.click();
    return !!header&&header.getAttribute('aria-sort')==='none'&&
      !header.querySelector('.column-sort-button');
  })()`);
  if(!viewerSortBlocked)throw Error('Viewer must not expose sorting');
  const guestEditMarkers=await evaluate(`document.querySelectorAll('.item-data-table tbody td.editable-cell').length`);
  if(guestEditMarkers)throw Error('Read-only guest must not see editable-cell markers');
  // Synthetic marked cell tests the one shared editing tooltip without granting
  // guest permissions or writing data; native title delay is not used.
  const instantEditCue=await evaluate(`(()=>{
    const td=document.querySelector('.item-data-table tbody td[data-col-key="department"]');
    const hint=document.getElementById('edit-shared-tooltip');
    if(!td||!hint)return {ok:false,reason:'missing table cell or singleton'};
    td.classList.add('editable-cell');
    let shown=false,hidden=false;
    try{
      td.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
      const source=td.getBoundingClientRect(),bubble=hint.getBoundingClientRect();
      const overlap=Math.max(0,Math.min(source.right,bubble.right)-Math.max(source.left,bubble.left))*
        Math.max(0,Math.min(source.bottom,bubble.bottom)-Math.max(source.top,bubble.top));
      shown=hint.matches(':popover-open')&&getComputedStyle(hint).display==='flex'&&
        hint.textContent==='Bấm để sửa'&&!td.hasAttribute('title')&&overlap===0;
      td.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
      hidden=!hint.matches(':popover-open');
    }finally{td.classList.remove('editable-cell');}
    return {ok:shown&&hidden,shown,hidden};
  })()`);
  if(!instantEditCue.ok)throw Error('Immediate edit tooltip regression: '+JSON.stringify(instantEditCue));
  // Emulate a visible history action without modifying guest permissions.
  // The shared hint should immediately switch its label and remain outside.
  const historyHint=await evaluate(`(()=>{
    const td=document.querySelector('.item-data-table tbody td[data-col-key="department"]');
    const tip=document.getElementById('edit-shared-tooltip');
    if(!td||!tip)return false;
    const btn=document.createElement('button');
    btn.type='button';btn.className='cell-history-action';
    btn.dataset.quickTooltip='Xem lần sửa gần nhất';
    td.append(btn);
    try {
      btn.dispatchEvent(new PointerEvent('pointerover',{bubbles:true,pointerType:'mouse'}));
      const a=tip.getBoundingClientRect(),b=btn.getBoundingClientRect();
      const overlap=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
        Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      return tip.matches(':popover-open')&&tip.textContent==='Xem lần sửa gần nhất'&&overlap===0;
    }finally{
      btn.dispatchEvent(new PointerEvent('pointerout',{bubbles:true,pointerType:'mouse'}));
      btn.remove();
    }
  })()`);
  if(!historyHint)throw Error('Quick history tooltip must not obscure its action');
  const cellAlignment=await evaluate(`(()=>{
    const regular=document.querySelector('.item-data-table tbody td[data-col-key="department"]');
    const long=document.querySelector('.item-data-table tbody td[data-col-key="content"]');
    return !!regular&&!!long&&
      getComputedStyle(regular).textAlign==='center'&&
      getComputedStyle(regular).verticalAlign==='middle'&&
      getComputedStyle(long).textAlign==='justify'&&
      getComputedStyle(long).verticalAlign==='top';
  })()`);
  if(!cellAlignment)throw Error('Column-key cell alignment regression');

  if(await evaluate("!!document.querySelector('.source-column-visibility button')"))
    throw Error('Guest must not change admin source column visibility');


  const visibleRows=await evaluate("document.querySelectorAll('.item-data-table tbody tr').length");
  if(visibleRows!==54)throw Error('All 54 Sheets records should render without 50-row pagination, got '+visibleRows);
  if(await evaluate("!!document.querySelector('.pagination')"))throw Error('Legacy pagination controls should be removed');
  const sticky=await evaluate(`(()=>{
    const scroll=document.querySelector('.item-table-scroll'),title=scroll?.querySelector('.item-heading-row th'),
      filter=scroll?.querySelector('.item-column-filter-row th');
    if(!scroll||!title||!filter)return false;
    if(getComputedStyle(scroll.querySelector('thead')).position!=='sticky')return false;
    if(getComputedStyle(title).whiteSpace!=='normal')return false;
    const titleBottom=title.getBoundingClientRect().bottom,filterTop=filter.getBoundingClientRect().top;
    if(filterTop<titleBottom-3)return false;
    if(getComputedStyle(document.querySelector('.item-sticky-search-controls')).position!=='sticky')return false;
    const before=title.getBoundingClientRect().top;
    if(scroll.scrollHeight<=scroll.clientHeight+30)return false;
    scroll.scrollTop=180;
    const after=title.getBoundingClientRect().top;
    return scroll.scrollTop>=100&&Math.abs(before-after)<3&&
      document.querySelectorAll('.item-column-filter-row input,.item-column-filter-row select').length>2;
  })()`);
  if(!sticky)throw Error('Sticky table header/filter/search and vertical scroll must work together');
  await eventually("document.querySelector('.guest-signin')!==null",'Anonymous viewer must have a simple login entry');
  const guestClean=await evaluate(`(()=>{
    const banner=document.querySelector('.demo-banner')?.textContent??'';
    return !!document.querySelector('.guest-signin')&&
      !document.querySelector('.options-menu')&&!document.querySelector('.list-view-box')&&
      !!document.querySelector('.version')&&
      !document.querySelector('.brand')&&!document.querySelector('.demo-banner')&&
      !document.querySelector('.settings-mode-bar')&&
      !document.querySelector('.app-footer')&&
      !document.body.textContent?.includes('Có thể bấm trực tiếp vào ô được cấp quyền để sửa thử.')&&
      !document.body.textContent?.includes('Dữ liệu tự cập nhật')&&
      !banner.includes('GID')&&
      !document.querySelector('.notice[role="status"]')?.textContent?.includes('Danh mục và bố trí')&&
      document.querySelector('[data-filter-key="displayCode"] input')?.placeholder===''&&
      document.querySelector('input[aria-label="Tìm kiếm cột Nội dung trình"]')?.placeholder==='Tìm kiếm (không dấu)';
  })()`);
  if(!guestClean)throw Error('Anonymous list still exposes admin configuration or outdated filter labels');
  // Guest footer and generic edit hint are intentionally removed. Use the
  // freed space for a vertically scrollable list, with sticky filters intact.
  const listViewport=await evaluate(`(()=>{
    const grid=document.querySelector('.item-table-scroll');
    const styles=grid?getComputedStyle(grid):null;
    return {height:grid?.clientHeight??0,scrollHeight:grid?.scrollHeight??0,
      overflow:styles?.overflowY??'',viewport:window.innerHeight};
  })()`);
  if(listViewport.viewport!==1000||listViewport.height<400||listViewport.height>900||
    listViewport.overflow!=='auto'||listViewport.scrollHeight<=listViewport.height+30)
    throw Error('List must use the taller viewport with its own vertical scrolling: '+JSON.stringify(listViewport));
  console.log('GUEST_LIST_VIEWPORT_EXPANDED_PASS',JSON.stringify(listViewport));
  // Viewport-fit list must own the only vertical scrollbar on normal screens.
  const fit=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),grid=document.querySelector('.item-table-scroll');
    const doc=document.scrollingElement,box=grid?.getBoundingClientRect();
    return {active:shell?.classList.contains('list-fit-page'),window:innerHeight,
      documentHeight:doc?.scrollHeight,documentClientHeight:doc?.clientHeight,
      tableBottom:box?.bottom,tableHeight:box?.height,overflow:grid?getComputedStyle(grid).overflowY:null};
  })()`);
  if(!fit.active||fit.documentHeight>fit.documentClientHeight+3||
    fit.tableBottom>fit.window+3||fit.tableHeight<250||fit.overflow!=='auto')
    throw Error('List page must fit one screen and scroll only inside table: '+JSON.stringify(fit));
  console.log('LIST_VIEWPORT_FIT_PASS',JSON.stringify(fit));
  const tablePosition=await evaluate(`(()=>{
    const grid=document.querySelector('.item-table-scroll'),host=document.querySelector('.item-data-region');
    const g=grid.getBoundingClientRect(),h=host.getBoundingClientRect();
    return {top:g.top-h.top,left:g.left-h.left,height:g.height,width:g.width};
  })()`);
  const assertStable=async(label)=>{
    const result=await evaluate(`(()=>{
      const g=document.querySelector('.item-table-scroll').getBoundingClientRect(),
        h=document.querySelector('.item-data-region').getBoundingClientRect();
      return {top:g.top-h.top,left:g.left-h.left,height:g.height,width:g.width};
    })()`);
    if(Math.abs(result.top-tablePosition.top)>2||Math.abs(result.left-tablePosition.left)>2||
       Math.abs(result.height-tablePosition.height)>2||Math.abs(result.width-tablePosition.width)>2)
      throw Error('List grid shifted while '+label+': '+JSON.stringify({tablePosition,result}));
  };

  const started=await evaluate(`(()=>{const input=document.querySelector('input[aria-label="Tìm kiếm cột Nội dung trình"]');input?.focus();return !!input})()`);
  if(!started)throw Error('Column filter UI is missing');
  await send('Input.insertText',{text:'Không khớp'});
  await eventually("document.querySelector('input[aria-label=\"Tìm kiếm cột Nội dung trình\"]')?.value==='Không khớp'",'Direct column filter value not shown');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('Không tìm thấy nội dung')===true",'Column filtering does not restrict the list');
  await assertStable('no matching rows');
  await evaluate("document.querySelector('[data-filter-key=\"content\"] .item-filter-clear')?.click()");
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",'Removing filter did not restore list');
  await assertStable('clearing column search');
  // Search without diacritics, highlight ALL occurrences inside the source
  // content cell without changing text or the underlying edit value.
  const began=Date.now();
  await evaluate("document.querySelector('input[aria-label=\\\"Tìm kiếm cột Nội dung trình\\\"]')?.focus()");
  await send('Input.insertText',{text:'kiem thu'});
  await eventually("document.querySelector('.item-data-table tbody td[data-col-key=\\\"content\\\"] mark.item-search-match')?.textContent?.toLowerCase().includes('kiểm thử')===true",
    'Vietnamese search matches must be marked in visible contents');
  const marked=await evaluate(`(()=>{
    const content=[...document.querySelectorAll('.item-data-table tbody td[data-col-key="content"]')];
    const marks=content.flatMap(cell=>[...cell.querySelectorAll('mark.item-search-match')]);
    const source=content[0]?.textContent??'';
    return {matches:marks.length,count:content.length,first:marks[0]?.textContent,
      fullTextPreserved:source.includes('Nội dung kiểm thử'),input:document.querySelector('[data-filter-key=content] input')?.value};
  })()`);
  if(marked.matches<40||!marked.fullTextPreserved||marked.input!=='kiem thu')
    throw Error('Search highlights must preserve Vietnamese text in all matching rows: '+JSON.stringify(marked));
  console.log('CONTENT_SEARCH_MARKED_PASS',JSON.stringify({...marked,elapsedMs:Date.now()-began}));
  await evaluate("document.querySelector('[data-filter-key=\\\"content\\\"] .item-filter-clear')?.click()");
  await eventually("document.querySelectorAll('.item-data-table mark.item-search-match').length===0",
    'Clearing content search must remove every yellow mark');
  const highlightLayout=await evaluate(`(()=>{
    const table=document.createElement('table');
    table.className='item-data-table';table.style.cssText='width:228px;table-layout:fixed;';
    const body=table.appendChild(document.createElement('tbody'));
    const row=body.appendChild(document.createElement('tr'));
    const td=row.appendChild(document.createElement('td'));
    td.dataset.colKey='specificProgress';td.style.width='228px';
    const trigger=td.appendChild(document.createElement('button'));
    trigger.className='inline-note-trigger';trigger.type='button';
    trigger.innerHTML='Đã có Tờ trình số <mark class="item-search-match item-search-match-atomic">254</mark> ngày 15/10 trình HĐND TP';
    document.body.appendChild(table);
    const mark=trigger.querySelector('mark'),range=document.createRange();
    range.selectNodeContents(mark);
    const style=getComputedStyle(trigger),markStyle=getComputedStyle(mark);
    const result={justify:style.textAlign,finalLine:style.textAlignLast,
      numberWhitespace:markStyle.whiteSpace,pieces:range.getClientRects().length,
      text:trigger.textContent};
    table.remove();return result;
  })()`);
  if(highlightLayout.justify!=='justify'||highlightLayout.finalLine!=='left'||
    highlightLayout.numberWhitespace!=='nowrap'||highlightLayout.pieces!==1||
    !highlightLayout.text.includes('số 254 ngày'))
    throw Error('Justified progress note must preserve unsplit numeric highlight: '+JSON.stringify(highlightLayout));
  console.log('JUSTIFY_AND_ATOMIC_SEARCH_HIGHLIGHT_PASS',JSON.stringify(highlightLayout));
  const placeholderSelect=await evaluate(`(()=>{
    const select=document.querySelector('.item-column-filter-row [data-filter-key="type"] select');
    const color=select?getComputedStyle(select).color:'';
    return {ok:!!select&&select.classList.contains('filter-placeholder')&&
      color==='rgb(154, 169, 160)'&&select.selectedOptions[0]?.textContent==='Chọn để lọc',color};
  })()`);
  if(!placeholderSelect.ok)throw Error('Category placeholder styling regression: '+JSON.stringify(placeholderSelect));
  // Focus the REAL sticky select through CDP after scrolling deep into the
  // grid. Opening a dropdown must not scroll all rows to the top.
  const stickySelectPoint=await evaluate(`(()=>{
    const grid=document.querySelector('.item-table-scroll');
    const select=document.querySelector('.item-column-filter-row [data-filter-key="type"] select');
    if(!grid||!select)return null;
    grid.scrollTop=320;
    const r=select.getBoundingClientRect();
    return {x:r.left+r.width/2,y:r.top+r.height/2,top:grid.scrollTop,
      actual:document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.tagName};
  })()`);
  if(!stickySelectPoint||stickySelectPoint.top<200||stickySelectPoint.actual!=='SELECT')
    throw Error('Sticky category dropdown not hittable when scrolled: '+JSON.stringify(stickySelectPoint));
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:stickySelectPoint.x,
    y:stickySelectPoint.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:stickySelectPoint.x,
    y:stickySelectPoint.y,button:'left',clickCount:1});
  await sleep(70);
  const afterOpenTop=await evaluate("document.querySelector('.item-table-scroll')?.scrollTop");
  if(Math.abs(afterOpenTop-stickySelectPoint.top)>2)
    throw Error('Opening sticky dropdown moved list rows: '+JSON.stringify({
      before:stickySelectPoint.top,after:afterOpenTop}));
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await evaluate("document.querySelector('.item-table-scroll').scrollTop=0");

  const selectedType=await evaluate(`(()=>{
    const select=document.querySelector('.item-column-filter-row [data-filter-key="type"] select');
    if(!select||select.options.length<2)return false;
    select.value=select.options[1].value;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  if(!selectedType)throw Error('Type dropdown filter missing');
  await eventually("document.querySelector('[data-filter-key=type] select')?.classList.contains('selected-filter-value')===true",
    'Type category filter did not apply');
  await evaluate(`(()=>{
    document.querySelector('[data-filter-key=type] select')?.dispatchEvent(
      new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
  })()`);
  await eventually("document.querySelector('[data-filter-key=type] select')?.value===''",
    'Escape did not clear selected type');

  // An unsaved edit must not highlight the whole row in yellow or paint an
  // amber stripe in the detail popup. Explicit user row color rules are separate.
  const noDraftRowYellow=await evaluate(`(()=>{
    const root=document.querySelector('.item-data-table tbody tr');
    if(!root)return false;
    const before=getComputedStyle(root).backgroundColor;
    root.classList.add('dirty-row');
    const after=getComputedStyle(root).backgroundColor;
    root.classList.remove('dirty-row');
    const popup=document.createElement('table');
    popup.className='report-detail-grid';popup.style.position='absolute';popup.style.left='-10000px';
    const body=popup.appendChild(document.createElement('tbody'));
    const test=body.appendChild(document.createElement('tr'));
    document.body.appendChild(popup);
    const plain=getComputedStyle(test).boxShadow;
    test.classList.add('report-grid-row-dirty');
    const dirty=getComputedStyle(test).boxShadow;popup.remove();
    return before===after&&plain===dirty;
  })()`);
  if(!noDraftRowYellow)throw Error('Unsaved record still highlights whole table row');

  // CSS contract for signed-in edit-mode popup using a synthetic cell. Guest
  // smoke may not enter editing; no Firebase write or authentication is needed.
  const compactEditRing=await evaluate(`(()=>{
    const host=document.createElement('div');
    host.className='report-grid-modal';
    host.style.cssText='position:fixed;left:30px;top:30px;width:355px;z-index:99999;';
    host.innerHTML='<table class="data-table report-detail-grid" style="width:340px"><tbody><tr><td class="editable-cell" data-col-key="progressBuild" data-progress-tone="not-submitted"><button type="button" class="cell-value-button cell-picker-trigger">Sở chưa trình</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const td=host.querySelector('td'),button=host.querySelector('button');
    button.focus({preventScroll:true});
    const parent=getComputedStyle(td),inner=getComputedStyle(button);
    const tdWidth=td.getBoundingClientRect().width;
    const buttonWidth=button.getBoundingClientRect().width;
    const result={ok:parent.boxShadow==='none'&&parent.outlineStyle==='none'&&
      buttonWidth<tdWidth-25&&
      inner.borderColor==='rgb(158, 207, 231)'&&
      inner.boxShadow.includes('rgb(216, 241, 252)')&&
      inner.outlineStyle==='none',
      parentShadow:parent.boxShadow,parentOutline:parent.outlineStyle,
      innerBorder:inner.borderColor,innerShadow:inner.boxShadow,
      innerOutline:inner.outlineStyle,tdWidth,buttonWidth};
    host.remove();return result;
  })()`);
  if(!compactEditRing.ok)throw Error('Popup edit highlight must be a compact soft-color ring, not the entire dark cell: '+JSON.stringify(compactEditRing));
  console.log('POPUP_COMPACT_SOFT_HIGHLIGHT_PASS',JSON.stringify(compactEditRing));

  const modalHoverPoint=await evaluate(`(()=>{
    const host=document.createElement('div');host.id='popup-3d-probe';host.className='report-grid-modal';
    host.style.cssText='position:fixed;left:25px;top:80px;width:355px;z-index:9999;';
    host.innerHTML='<table class="data-table report-detail-grid" style="width:340px"><tbody><tr><td class="editable-cell" data-progress-tone="not-submitted" style="height:70px"><button class="cell-value-button cell-picker-trigger" type="button">Sở chưa trình</button></td></tr></tbody></table>';
    document.querySelector('.app-shell').append(host);
    const r=host.querySelector('td').getBoundingClientRect();
    return {x:r.right-6,y:r.top+r.height/2};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',...modalHoverPoint});
  await new Promise(resolve=>setTimeout(resolve,270));
  const modalLift=await evaluate(`(()=>{
    const cell=document.querySelector('#popup-3d-probe td'),button=cell.querySelector('button');
    return {parent:getComputedStyle(cell).boxShadow,hover:cell.matches(':hover'),
      buttonHover:button.matches(':hover'),liftY:new DOMMatrixReadOnly(getComputedStyle(button).transform).m42,
      shadow:getComputedStyle(button).boxShadow,
      widths:[cell.getBoundingClientRect().width,button.getBoundingClientRect().width]};
  })()`);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:785,y:9});
  await new Promise(resolve=>setTimeout(resolve,270));
  const modalReset=await evaluate(`new DOMMatrixReadOnly(getComputedStyle(
    document.querySelector('#popup-3d-probe button')).transform).m42`);
  await evaluate("document.querySelector('#popup-3d-probe')?.remove()");
  if(!modalLift.hover||modalLift.buttonHover||modalLift.parent!=='none'||
    Math.abs(modalLift.liftY+3)>.25||!modalLift.shadow.includes('7px 13px')||
    modalLift.widths[1]>=modalLift.widths[0]-25||Math.abs(modalReset)>.25)
    throw Error('Popup must lift compact inner control, not table cell: '+JSON.stringify({modalLift,modalReset}));
  console.log('HOVER_3D_B_REPORT_POPUP_PASS',JSON.stringify(modalLift));


  // Compact column layout is an ADMIN shared setting. Viewer must have no
  // local control to diverge from the authoritative profile.
  const compactGuestBlocked=await evaluate(`!document.querySelector('.compact-columns-menu')`);
  if(!compactGuestBlocked)throw Error('Guest must not see or edit compact column options');
  // The duplicate top search toolbar is intentionally removed; every column has its own filter.
  if(await evaluate("!!document.querySelector('.search-field')"))throw Error('Redundant global search toolbar remains');
  // Switching Overview / List must never resize or horizontally relocate the shared page header.
  const sharedGeometry=()=>evaluate(`(()=>{
    const selectors=['.topbar','.nav-tabs'];
    return selectors.map(selector=>{
      const bounds=document.querySelector(selector)?.getBoundingClientRect();
      return bounds?{left:bounds.left,width:bounds.width}:null;
    });
  })()`);
  const originalGeometry=await sharedGeometry();
  for(const [tab,ready] of [['Báo cáo tổng hợp','Báo cáo tổng hợp'],['Danh sách các ND trình HĐND','Danh sách các ND trình HĐND']]){
    const clicked=await evaluate(`(()=>{
      const button=[...document.querySelectorAll('.nav-tabs button')].find(b=>b.querySelector('.section-card-title')?.textContent===${JSON.stringify(tab)});
      button?.click();return !!button;
    })()`);
    if(!clicked)throw Error('Missing navigation tab '+tab);
    await eventually("document.querySelector('.nav-tabs button[aria-current=page] .section-card-title')?.textContent==="+JSON.stringify(ready),"Navigation "+tab);
    const leftover=await evaluate(`(()=>{
      const elements=[...document.querySelectorAll('.page-heading,.demo-banner,main > .unknown-note')];
      return {active:document.querySelector('.nav-tabs button[aria-current=page] .section-card-title')?.textContent,
        elements:elements.map(el=>({class:el.className,text:el.textContent?.slice(0,100),parent:el.parentElement?.className}))};
    })()`);
    if(leftover.elements.length)throw Error('Redundant report/list title, source banner or unclassified notice visible: '+JSON.stringify(leftover));
    if(tab==='Báo cáo tổng hợp'){
      const reports=await evaluate(`(()=>{
        const tables=[...document.querySelectorAll('table.report-table')];
        if(tables.length<2)return {ok:false,reason:'Missing report tables'};
        const headers=tables.map(table=>table.querySelector('thead th:first-child')?.textContent?.trim());
        const widths=tables.map(table=>table.querySelector('thead th:first-child')?.getBoundingClientRect().width);
        return {ok:headers.every(text=>text==='Sở, ngành chủ trì')&&
          widths.every(width=>Math.abs(width-widths[0])<2),headers,widths};
      })()`);
      if(!reports.ok)throw Error('Report first-column heading/width mismatch: '+JSON.stringify(reports));
      const cells=await evaluate(`(()=>{
        const tables=[...document.querySelectorAll('table.report-table')];
        const samples=tables.flatMap(table=>[
          table.querySelector('thead th.report-number-header'),
          table.querySelector('tbody td.report-number'),
          table.querySelector('tfoot td.report-number')
        ]).filter(Boolean);
        const focus=[...document.querySelectorAll('.report-focus-button')];
        const summaries=[...document.querySelectorAll('.report-stage-summary')];
        const percents=tables.flatMap(table=>[...table.querySelectorAll('th.report-percent-col')]);
        const progress=tables.flatMap(table=>[...table.querySelectorAll('td.report-percent-col progress')]);
        const coloredHeaders=tables.flatMap(table=>[...table.querySelectorAll('thead th.report-stage-source')]);
        return {ok:samples.length>=6&&samples.every(cell=>getComputedStyle(cell).textAlign==='center')&&
          focus.length===0&&summaries.length>=8&&percents.length===tables.length&&
          progress.length>=tables.length&&progress.every(el=>el.value>=0&&el.value<=100)&&
          coloredHeaders.length>=1&&tables.every(t=>!!getComputedStyle(t).fontFamily),
          samples:samples.map(cell=>getComputedStyle(cell).textAlign),focus:focus.length,
          summaries:summaries.length,percents:percents.length,progress:progress.length,headers:coloredHeaders.length};
      })()`);
      if(!cells.ok)throw Error('Report numeric alignment or streamlined summary UI missing: '+JSON.stringify(cells));
      const colorConsistency=await evaluate(`(()=>{
        const table=[...document.querySelectorAll('table.report-table')]
          .find(t=>t.querySelector('thead th.report-stage-source'));
        if(!table)return {ok:false,reason:'No source-stage report'};
        const results=['source','office','next','completed'].map(stage=>{
          const css='.report-stage-'+stage;
          const cells=[
            table.querySelector('thead th'+css),
            table.querySelector('tbody td'+css),
            table.querySelector('tfoot td'+css)
          ];
          if(cells.some(cell=>!cell))return {stage,ok:true,skipped:true};
          const backgrounds=cells.map(cell=>getComputedStyle(cell).backgroundColor);
          const foregrounds=cells.map(cell=>getComputedStyle(cell).color);
          const same=backgrounds.every(c=>c===backgrounds[0])&&foregrounds.every(c=>c===foregrounds[0]);
          return {stage,ok:same&&backgrounds[0]!=='rgba(0, 0, 0, 0)'&&
            backgrounds[0]!=='rgb(255, 255, 255)',backgrounds,foregrounds};
        });
        return {ok:results.every(result=>result.ok)&&results.some(result=>result.stage==='source'&&!result.skipped),
          results};
      })()`);
      if(!colorConsistency.ok)throw Error('Report status header/body/footer palette mismatch: '+
        JSON.stringify(colorConsistency));
      // A report without intermediate stage must not show an empty
      // "Bước tiếp theo" action chip; Party and Build retain that chip.
      const intermediateChips=await evaluate(`(()=>{
        const titles=[...document.querySelectorAll('.report-surface > .card-header h3')];
        const reports=titles.map(title=>{
          const section=title.closest('.report-surface');
          const labels=[...section.querySelectorAll('.report-flow-summary .report-stage-summary')]
            .map(el=>el.textContent?.trim());
          return {title:title.textContent?.trim(),labels,hasNext:labels.some(l=>l?.includes('Bước tiếp theo'))};
        });
        return {ok:reports.length===5&&reports.every(r=>
          r.hasNext===(r.title.includes('xin ý kiến Thành ủy')||r.title.includes('xây dựng NQ'))),reports};
      })()`);
      if(!intermediateChips.ok)throw Error('Intermediate-stage chips mismatch: '+JSON.stringify(intermediateChips));
      console.log('REPORT_STAGE_SUMMARIES_MATCH_COLUMNS_PASS');
      const buildHeading=await evaluate(`(()=>{
        const title=[...document.querySelectorAll('.report-surface h3')]
          .find(node=>node.textContent?.includes('Tiến độ trình HĐND xây dựng NQ'));
        const heads=[...(title?.closest('.report-surface')?.querySelectorAll('thead th')??[])]
          .map(cell=>cell.textContent?.trim());
        return heads[1]==='Tổng số nội dung'&&heads[2]==='Sở chưa trình'&&
          !heads.includes('Không phải trình');
      })()`);
      if(!buildHeading)throw Error('Build NQ default must hide Không phải trình, preserving other stage columns');
      // Party report shares Build NQ's independently hidden exemption policy.
      // Real source values "Không phải trình" are normalized before collecting
      // unknown states, so no spurious Chưa chuẩn hóa warning should appear.
      const partyExemption=await evaluate(`(()=>{
        const section=[...document.querySelectorAll('.report-surface')]
          .find(node=>node.querySelector('h3')?.textContent?.includes('Tiến độ xin ý kiến Thành ủy'));
        const heads=[...(section?.querySelectorAll('thead th')??[])].map(el=>el.textContent?.trim());
        const total=section?.querySelector('tfoot td.report-total-col');
        const totalText=total?.querySelector('.count-drill > span')?.textContent?.trim()??
          total?.querySelector('strong')?.textContent?.trim()??'';
        const countText=section?.querySelector('.report-heading-count')?.textContent??'';
        const count=Number(countText.match(/\\d+/)?.[0]??-1);
        return {ok:!!section&&heads[1]==='Tổng số nội dung'&&heads[2]==='Sở chưa trình'&&
          !heads.includes('Không phải trình')&&Number(totalText)===count,
          heads,count,totalText};
      })()`);
      if(!partyExemption.ok)throw Error('Party must hide Không phải trình by default: '+JSON.stringify(partyExemption));
      console.log('PARTY_HIDDEN_EXEMPT_DEFAULT_PASS',JSON.stringify(partyExemption));
      // The excluded Build NQ column must be hidden in the initial view.
      // A middle milestone stays visible and appropriately muted.
      const hiddenBuild=await evaluate(`(()=>{
        const section=[...document.querySelectorAll('.report-surface')]
          .find(node=>node.querySelector('h3')?.textContent?.includes('Tiến độ trình HĐND xây dựng NQ'));
        const table=section?.querySelector('table.report-table');
        const header=[...(table?.querySelectorAll('thead th')??[])];
        const pending=header.find(el=>el.textContent?.includes('Đã trình HĐND, chưa có QĐ'));
        const total=table?.querySelector('tfoot td.report-total-col');
        const totalText=total?.querySelector('.count-drill > span')?.textContent?.trim() ??
          total?.querySelector('strong')?.textContent?.trim()??'';
        const rendered=section?.querySelector('.report-heading-count')?.textContent??'';
        const count=Number(rendered.match(/\\d+/)?.[0]??-1);
        return {ok:!!pending&&pending.classList.contains('report-stage-intermediate')&&
          !header.some(el=>el.textContent?.trim()==='Không phải trình')&&
          !table?.querySelector('.report-stage-excluded')&&
          Number(totalText)===count,
          pending:pending?.className,header:header.map(el=>el.textContent?.trim()),count,totalText};
      })()`);
      if(!hiddenBuild.ok)throw Error('Build NQ must hide exempt column without altering counted totals: '+JSON.stringify(hiddenBuild));
      console.log('BUILD_NQ_HIDDEN_EXEMPT_DEFAULT_PASS',JSON.stringify(hiddenBuild));
      // Delegated singleton uses one bounded geometry read per newly entered
      // count cell, never a per-frame pointermove read or global style selector.
      const leftReportTitles=await evaluate(`(()=>{
        const titles=[...document.querySelectorAll('.report-surface > .card-header h3')];
        const deltas=titles.map(h=>{
          const header=h.closest('.card-header');
          const head=header?.getBoundingClientRect(),txt=h.getBoundingClientRect();
          return {name:h.textContent?.slice(0,35),leftGap:head?Math.round(txt.left-head.left):null,
            align:getComputedStyle(h).textAlign,
            hasInlineCount:(h.textContent??'').includes(' nội dung)')&&(h.textContent??'').includes('(')};
        });
        return {ok:titles.length===5&&deltas.every(v=>v.leftGap!==null&&v.leftGap>=0&&
          v.leftGap<=32&&(v.align==='left'||v.align==='start')&&v.hasInlineCount)&&
          !document.querySelector('.report-surface .card-header p.muted,.report-flow-note,.report-focus-button'),
          count:titles.length,deltas};
      })()`);
      if(!leftReportTitles.ok)throw Error('Report titles must be left-aligned with inline totals and no redundant note/filter: '+JSON.stringify(leftReportTitles));
      const stageChips=await evaluate(`(()=>{
        const chips=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')];
        const active=chips.filter(c=>!c.disabled);
        const height=chips.map(c=>Math.round(c.getBoundingClientRect().height));
        const labels=chips.slice(0,4).map(c=>c.getAttribute('aria-label'));
        return {ok:chips.length===20&&active.length>0&&height.every(n=>n>=35)&&
          chips.every(c=>c.type==='button'&&c.hasAttribute('aria-label'))&&
          chips.every(c=>(parseInt(c.querySelector('strong')?.textContent??'0',10)===0)===c.disabled),
          count:chips.length,active:active.length,smallest:Math.min(...height),labels};
      })()`);
      if(!stageChips.ok)throw Error('Stage summary chips not enlarged or interactive: '+JSON.stringify(stageChips));

      // Option B applies only to clickable summary buttons. Do not lift
      // a disabled zero-count button or change record selection behavior.
      const stageHoverPoint=await evaluate(`(()=>{
        const button=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(b=>!b.disabled);
        button?.scrollIntoView({block:'center',inline:'nearest'});
        const rect=button?.getBoundingClientRect();
        return rect?{x:rect.left+rect.width/2,y:rect.top+rect.height/2}:null;
      })()`);
      if(!stageHoverPoint)throw Error('No active stage button available for 3D hover B test');
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...stageHoverPoint});
      await new Promise(resolve=>setTimeout(resolve,270));
      const stageHoverB=await evaluate(`(()=>{
        const button=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(b=>!b.disabled);
        const style=getComputedStyle(button);
        const disabled=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(b=>b.disabled);
        return {hover:button.matches(':hover'),liftY:new DOMMatrixReadOnly(style.transform).m42,
          shadow:style.boxShadow,border:style.borderTopColor,
          disabledLift:disabled?new DOMMatrixReadOnly(getComputedStyle(disabled).transform).m42:null};
      })()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:10});
      if(!stageHoverB.hover||Math.abs(stageHoverB.liftY+3)>.25||
        stageHoverB.border!=='rgb(167, 216, 237)'||
        !stageHoverB.shadow.includes('7px 13px')||
        (stageHoverB.disabledLift!==null&&Math.abs(stageHoverB.disabledLift)>.25))
        throw Error('3D hover B must lift only enabled summary buttons: '+JSON.stringify(stageHoverB));
      console.log('HOVER_3D_B_REPORT_STAGE_PASS',JSON.stringify(stageHoverB));

      const selectedChip=await evaluate(`(()=>{
        const button=[...document.querySelectorAll('.report-surface .report-flow-summary button.report-stage-summary')]
          .find(c=>!c.disabled);
        if(!button)return null;
        const count=Number(button.querySelector('strong')?.textContent??0);
        const label=button.getAttribute('aria-label');
        button.click();
        return {count,label};
      })()`);
      if(!selectedChip)throw Error('No populated stage summary to click');
      await eventually("!!document.querySelector('dialog.report-detail-modal[open]')",
        'Click on stage summary did not open detail list');
      const stageGrid=await evaluate("document.querySelector('dialog.report-detail-modal[open] .report-grid-summary strong')?.textContent??''");
      if(!stageGrid.includes(selectedChip.count+' nội dung'))
        throw Error('Stage summary count and popup selected records differ: '+JSON.stringify({selectedChip,stageGrid}));
      await evaluate("document.querySelector('dialog.report-detail-modal .modal-header button')?.click()");
      await eventually("!document.querySelector('dialog.report-detail-modal[open]')",
        'Stage detail dialog failed to close');

          const sharedTooltip=await evaluate(`(()=>{
        const buttons=[...document.querySelectorAll('.report-surface .count-drill')];
        const tip=document.getElementById('report-shared-tooltip');
        if(!tip||buttons.length<3||tip.dataset.mode!=='delegated')
          return {ok:false,reason:'delegated tooltip host missing'};
        const css=getComputedStyle(tip);
        if(tip.textContent!=='Click để xem chi tiết'||css.width!=='190px'||
          css.height!=='32px'||css.position!=='fixed'||tip.dataset.visible!=='false')
          return {ok:false,reason:'shared fixed panel changed'};
        const styles=[...document.styleSheets];
        const bad=styles.some(sheet=>{
          try{return [...sheet.cssRules].some(rule=>rule.cssText?.includes('body:has(.report-surface .report-table button.count-drill')); }
          catch{return false;}
        });
        if(bad||buttons.some(b=>b.textContent.includes('↗')||b.textContent.includes('Xem')||b.hasAttribute('title')))
          return {ok:false,reason:'global :has or arrows remain'};
        const evt=(type,b,x,y,next=null)=>b.dispatchEvent(new PointerEvent(type,{
          bubbles:true,pointerType:'mouse',clientX:x,clientY:y,relatedTarget:next
        }));
        const a=buttons[0],b=buttons[1];
        evt('pointerover',a,540,380);
        const opened=tip.dataset.visible==='true'&&!a.hasAttribute('aria-describedby');
        evt('pointerout',a,540,380,b);
        evt('pointerover',b,580,380);
        const shared=tip.dataset.visible==='true'&&tip===document.getElementById('report-shared-tooltip')&&
          !b.hasAttribute('aria-describedby');
        evt('pointerout',b,580,380);
        const hidden=tip.dataset.visible==='false';
        let reads=0;const orig=Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect=function(){reads++;return orig.call(this);};
        try {
          for(let i=0;i<300;i++){
            const button=buttons[i%buttons.length];
            evt('pointerover',button,540+i%10,380+i%8);
            evt('pointerout',button,540+i%10,380+i%8);
          }
        } finally{Element.prototype.getBoundingClientRect=orig;}
        return {ok:opened&&shared&&hidden&&reads===300&&
          tip.dataset.visible==='false'&&
          document.querySelectorAll('#report-shared-tooltip').length===1,
          opened,shared,hidden,reads,cycles:300,buttons:buttons.length};
      })()`);
      if(!sharedTooltip.ok)throw Error('Delegated tooltip regression: '+JSON.stringify(sharedTooltip));
      console.log('DELEGATED_TOOLTIP_STRESS',JSON.stringify(sharedTooltip));
      const fullCellGeometry=await evaluate(`(()=>{
        const tables=[...document.querySelectorAll('.report-surface .report-table')];
        if(tables.length!==5)return {ok:false,reason:'missing report tables: '+tables.length};
        const buttons=[...document.querySelectorAll('.report-surface .report-table td .count-drill')];
        if(buttons.length===0)return {ok:false,reason:'no populated drill-down cells'};
        const allFull=buttons.every(button=>{
          const td=button.closest('td'),rect=td.getBoundingClientRect(),
            hit=button.getBoundingClientRect();
          return td.classList.contains('report-clickable-cell')&&
            Math.abs(rect.left-hit.left)<=2&&Math.abs(rect.top-hit.top)<=2&&
            Math.abs(rect.width-hit.width)<=2&&Math.abs(rect.height-hit.height)<=2&&
            getComputedStyle(button).position==='absolute'&&
            !!td.querySelector('.report-cell-sizer')&&button.hasAttribute('aria-label');
        });
        const noEmptyActions=[...document.querySelectorAll('.report-surface .report-table td.report-number')]
          .every(td=>{
            const button=td.querySelector('.count-drill');
            return (!!button)===td.classList.contains('report-clickable-cell')&&
              (!td.classList.contains('report-percent-col')||!button)&&
              (td.textContent.trim()!=='—'||!button);
          });
        const bodyTotals=document.querySelectorAll('.report-surface tbody td.report-total-col.report-clickable-cell').length,
          footerTotals=document.querySelectorAll('.report-surface tfoot td.report-total-col.report-clickable-cell').length,
          statusCells=document.querySelectorAll('.report-surface tbody td.report-clickable-cell:not(.report-total-col)').length;
        const bad=buttons.flatMap(button=>{
          const td=button.closest('td'),r=td.getBoundingClientRect(),h=button.getBoundingClientRect();
          const widthDiff=h.width-r.width,heightDiff=h.height-r.height;
          if(Math.abs(widthDiff)<=2&&Math.abs(heightDiff)<=2&&
            Math.abs(r.left-h.left)<=2&&Math.abs(r.top-h.top)<=2&&
            getComputedStyle(button).position==='absolute'&&td.querySelector('.report-cell-sizer'))return [];
          return [{td:td.className,button:button.className,rect:[r.x,r.y,r.width,r.height],
            hit:[h.x,h.y,h.width,h.height],position:getComputedStyle(button).position,
            style:getComputedStyle(td).position,hasSizer:!!td.querySelector('.report-cell-sizer')}];
        }).slice(0,3);
        return {ok:allFull&&noEmptyActions&&bodyTotals>0&&footerTotals>0&&statusCells>0,
          buttons:buttons.length,bodyTotals,footerTotals,statusCells,allFull,noEmptyActions,bad};
      })()`);
      if(!fullCellGeometry.ok)throw Error('Report full-cell hit targets are incomplete: '+JSON.stringify(fullCellGeometry));

      const drillPoint=await evaluate(`(()=>{
        const b=document.querySelector('.report-surface .report-table td.report-clickable-cell .count-drill');
        b?.scrollIntoView({block:'center',inline:'nearest'});
        const r=b?.getBoundingClientRect();
        return r?{x:r.left+Math.max(9,r.width*.15),y:r.top+r.height/2}:null;
      })()`);
      if(!drillPoint)throw Error('No clickable report count');
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',...drillPoint});
      await new Promise(resolve=>setTimeout(resolve,270));
      const drillLift=await evaluate(`(()=>{
        const button=document.querySelector('.report-surface .report-table td.report-clickable-cell .count-drill');
        const td=button.closest('td'),pill=button.querySelector('span');
        const rect=button.getBoundingClientRect(),cell=td.getBoundingClientRect(),ps=getComputedStyle(pill);
        const tdCss=getComputedStyle(td);
        return {hover:button.matches(':hover'),fullHit:Math.abs(rect.width-cell.width)<2,
          cellLift:new DOMMatrixReadOnly(tdCss.transform).m42,cellShadow:tdCss.boxShadow,
          overlayLift:new DOMMatrixReadOnly(getComputedStyle(button).transform).m42,
          pillLift:new DOMMatrixReadOnly(ps.transform).m42,shadow:ps.boxShadow,border:ps.borderTopColor};
      })()`);
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:790,y:9});
      await new Promise(resolve=>setTimeout(resolve,270));
      const drillReset=await evaluate(`new DOMMatrixReadOnly(getComputedStyle(
        document.querySelector('.report-surface .report-table td.report-clickable-cell')).transform).m42`);
      if(!drillLift.hover||!drillLift.fullHit||Math.abs(drillLift.overlayLift)>.25||
        Math.abs(drillLift.cellLift+3)>.25||!drillLift.cellShadow.includes('8px 16px')||
        Math.abs(drillLift.pillLift)>.25||drillLift.shadow!=='none'||
        Math.abs(drillReset)>.25)
        throw Error('Report count must retain full-cell hit area and lift whole cell: '+JSON.stringify({drillLift,drillReset}));
      console.log('HOVER_3D_B_REPORT_COUNTERS_PASS',JSON.stringify(drillLift));

      // Compare new cell-only focus against the previous very faint .035
      // fill using the SAME Chrome, DOM, positions and 36 actual mouse moves.
      // CDP CPU counters are diagnostics, not a perceived-latency guarantee.
      const abPoints=await evaluate(`(()=>{
        const first=document.querySelector('.report-surface .report-table tbody tr');
        const buttons=[...(first?.querySelectorAll('.count-drill')??[])];
        if(buttons.length<2)return null;
        buttons[0].scrollIntoView({block:'center',inline:'center'});
        return buttons.slice(0,2).map(button=>{
          const r=button.getBoundingClientRect();
          return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};
        });
      })()`);
      if(!abPoints||abPoints.some(p=>p.x<10||p.x>=1600||p.y<10||p.y>=1000))
        throw Error('Cell-hover A/B positions invalid: '+JSON.stringify(abPoints));
      await send('Performance.enable');
      const abMetric=async()=>{
        const result=await send('Performance.getMetrics');
        return Object.fromEntries(result.metrics.map(m=>[m.name,m.value]));
      };
      const abResults=[];
      for(let round=0;round<2;round++){
        for(const mode of (round===0?['old','new']:['new','old'])){
          await evaluate(`(()=>{
            document.querySelector('#hover-ab-previous')?.remove();
            if(${JSON.stringify(mode)}==='old'){
              const style=document.createElement('style');
              style.id='hover-ab-previous';
              style.textContent='.report-surface .report-table td.report-clickable-cell .count-drill:hover{background:rgba(73,124,98,.035)!important;outline:0!important;}';
              document.head.append(style);
            }
          })()`);
          await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:4,y:4});
          await evaluate('new Promise(r=>requestAnimationFrame(()=>r(true)))');
          const before=await abMetric();
          for(let i=0;i<36;i++){
            const p=abPoints[i%2];
            await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x,y:p.y});
            await evaluate('new Promise(r=>requestAnimationFrame(()=>r(true)))');
          }
          const after=await abMetric();
          const delta=n=>Math.round(((after[n]??0)-(before[n]??0))*1000*100)/100;
          abResults.push({round,mode,styleMs:delta('RecalcStyleDuration'),
            layoutMs:delta('LayoutDuration'),scriptMs:delta('ScriptDuration'),
            taskMs:delta('TaskDuration')});
        }
      }
      await evaluate("document.querySelector('#hover-ab-previous')?.remove()");
      await send('Performance.disable');
      console.log('CELL_HOVER_VISUAL_AB',JSON.stringify(abResults));
      // New 3D B contract: whole clickable report cell lifts, numeric badge
      // stays flat and the invisible button still covers the entire cell.
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:4,y:4});
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:abPoints[0].x,y:abPoints[0].y});
      await new Promise(resolve=>setTimeout(resolve,270));
      const hoverVisual=await evaluate(`(()=>{
        const button=document.elementFromPoint(${abPoints[0].x},${abPoints[0].y})?.closest('.count-drill');
        if(!button)return {ok:false,reason:'mouse missed the count'};
        const s=getComputedStyle(button),r=button.getBoundingClientRect(),td=button.closest('td').getBoundingClientRect();
        const pill=button.querySelector('span'),badge=getComputedStyle(pill),
          tdStyle=getComputedStyle(button.closest('td'));
        const others=[...document.querySelectorAll('.report-surface .count-drill')].filter(b=>b!==button);
        const onlyOne=others.every(b=>Math.abs(new DOMMatrixReadOnly(
          getComputedStyle(b.closest('td')).transform).m42)<.25);
        const oneCell=Math.abs(r.width-td.width)<3&&Math.abs(r.height-td.height)<3;
        return {ok:s.outlineStyle==='none'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&
          tdStyle.boxShadow.includes('8px 16px')&&
          Math.abs(new DOMMatrixReadOnly(tdStyle.transform).m42+3)<.25&&
          badge.boxShadow==='none'&&Math.abs(new DOMMatrixReadOnly(badge.transform).m42)<.25&&
          oneCell&&onlyOne,
          fullCellOutline:tdStyle.outline,fill:s.backgroundColor,cellShadow:tdStyle.boxShadow,
          cellLift:new DOMMatrixReadOnly(tdStyle.transform).m42,
          badgeShadow:badge.boxShadow,badgeLift:new DOMMatrixReadOnly(badge.transform).m42,
          oneCell,onlyOne};
      })()`);
      if(!hoverVisual.ok)throw Error('Report count must raise whole clickable cell while numeral stays flat: '+JSON.stringify(hoverVisual));
      console.log('CELL_HOVER_VISUAL_PASS',JSON.stringify(hoverVisual));
      // Real CDP pointer events at the lower-right INSIDE each data cell, not
      // .click() on the number. These corners used to miss the tiny count button.
      for(const selector of [
        '.report-surface tbody td.report-clickable-cell:not(.report-total-col)',
        '.report-surface tbody td.report-total-col.report-clickable-cell',
        '.report-surface tfoot td.report-total-col.report-clickable-cell'
      ]){
        const pos=await evaluate(`(()=>{
          const td=document.querySelector(${JSON.stringify(selector)});
          if(!td)return null;
          td.scrollIntoView({block:'center',inline:'center'});
          const rect=td.getBoundingClientRect(),button=td.querySelector('.count-drill');
          const x=Math.round(rect.right-5),y=Math.round(rect.bottom-5);
          const hit=document.elementFromPoint(x,y);
          return {x,y,covered:hit===button||button.contains(hit),width:rect.width,height:rect.height};
        })()`);
        if(!pos?.covered)throw Error('Cell corner is not clickable: '+selector+' '+JSON.stringify(pos));
        // Reset the pointer outside the scrolling table first. CDP otherwise
        // may keep the same hover target after scrollIntoView/modal close.
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:4,y:4});
        await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:pos.x,y:pos.y});
        const tooltipHovered=await evaluate(`(()=>{
          const button=document.elementFromPoint(${pos.x},${pos.y})?.closest('.count-drill');
          const tooltip=document.querySelector('#report-shared-tooltip');
          if(!button||!tooltip)return {ok:false,reason:'no pointed count'};
          const mode=tooltip.dataset.mode;
          const css=getComputedStyle(tooltip);
          const cell=button.getBoundingClientRect(),bubble=tooltip.getBoundingClientRect();
          const near=Math.abs((bubble.left+bubble.width/2)-(cell.left+cell.width/2))<240&&
            Math.min(Math.abs(bubble.top-cell.bottom),Math.abs(bubble.bottom-cell.top))<100;
          const visible=mode==='delegated'&&css.visibility==='visible'&&
            tooltip.dataset.visible==='true'&&near;
          const dx=Math.max(0,Math.min(cell.right,bubble.right)-Math.max(cell.left,bubble.left));
          const dy=Math.max(0,Math.min(cell.bottom,bubble.bottom)-Math.max(cell.top,bubble.top));
          return {ok:visible&&dx*dy===0&&tooltip.textContent==='Click để xem chi tiết'&&
              !button.textContent.includes('↗')&&
              !button.hasAttribute('aria-describedby'),mode,visibility:css.visibility,near,
              cell:[Math.round(cell.left),Math.round(cell.top)],
              tooltip:[Math.round(bubble.left),Math.round(bubble.top)]};
        })()`);
        if(!tooltipHovered?.ok)throw Error('Real pointer did not reveal native-anchored tooltip: '+selector+' '+JSON.stringify(tooltipHovered));
        await send('Input.dispatchMouseEvent',{type:'mousePressed',x:pos.x,y:pos.y,button:'left',clickCount:1});
        await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:pos.x,y:pos.y,button:'left',clickCount:1});
        await eventually("!!document.querySelector('dialog.report-detail-modal[open]')",
          'Full-cell corner click failed: '+selector);
        // Guest popup is a table with column filters only, no technical toolbar actions.
        const reportGrid=await evaluate(`(()=>{
          const modal=document.querySelector('dialog.report-detail-modal[open]');
          const grid=modal?.querySelector('.report-detail-grid');
          const cols=grid?.querySelectorAll('thead tr:first-child th').length??0;
          const rows=grid?.querySelectorAll('tbody tr').length??0;
          const forbidden=modal?.querySelector('.report-grid-search,.report-grid-actions,.report-grid-quick-width,.report-grid-presets,.column-resizer,.report-grid-settings,.cell-value-button,.custom-cell-input');
          const history=['note','specificProgress'].map(key=>
            grid?.querySelector('tbody tr:first-child td[data-col-key="'+key+'"] button.cell-history-action'));
          const irrelevant=!!grid?.querySelector('tbody tr:first-child td[data-col-key="content"] button.cell-history-action');
          return {ok:!!modal&&cols>=6&&cols<16&&rows>=1&&!forbidden&&
            !modal.querySelector('.report-grid-toolbar button,.report-grid-toolbar input')&&
            !!grid?.querySelector('.report-grid-filter-row input,.report-grid-filter-row select')&&
            history.every(Boolean)&&!irrelevant,
            cols,rows,forbidden:!!forbidden,historyButtons:history.filter(Boolean).length,irrelevant};
        })()`);
        if(!reportGrid.ok)throw Error('Anonymous report grid controls/history regression: '+JSON.stringify(reportGrid));
        if(selector==='.report-surface tbody td.report-clickable-cell:not(.report-total-col)'){
          // Guest can inspect audit on these two fields even though the popup
          // remains strictly read-only and has no editing controls.
          await evaluate("document.querySelector('dialog.report-detail-modal[open] td[data-col-key=\\\"note\\\"] button.cell-history-action')?.click()");
          await eventually("!!document.querySelector('dialog.modal[open][aria-label^=\\\"Lịch sử sửa đổi\\\"]')",
            'Guest report history must open');
          const historyTitle=await evaluate(`[...document.querySelectorAll('dialog.modal[open]')].map(el=>el.getAttribute('aria-label')).find(x=>x?.includes('Lịch sử sửa đổi'))`);
          if(!historyTitle?.includes('Ghi chú'))throw Error('Guest popup opened wrong history field: '+historyTitle);
          await evaluate("document.querySelector('dialog.modal[open][aria-label^=\\\"Lịch sử sửa đổi\\\"] button[aria-label=\\\"Đóng cửa sổ\\\"]')?.click()");
          await eventually("!document.querySelector('dialog.modal[open][aria-label^=\\\"Lịch sử sửa đổi\\\"]')",
            'Guest nested history did not close');
          console.log('GUEST_REPORT_POPUP_HISTORY_PASS',historyTitle);
        }
        if(selector!=='.report-surface tfoot td.report-total-col.report-clickable-cell'){
          await evaluate("document.querySelector('dialog.report-detail-modal .modal-header button')?.click()");
          await eventually("!document.querySelector('dialog.report-detail-modal[open]')",
            'Intermediate detail dialog failed to close');
        }
      }
      const detailBackdrop=await evaluate(`(()=>{
        const dialog=document.querySelector('dialog.report-detail-modal[open]');
        return !!dialog&&getComputedStyle(dialog,'::backdrop').backdropFilter==='none';
      })()`);
      if(!detailBackdrop)throw Error('Report detail modal backdrop blur was not disabled');
      await evaluate("document.querySelector('dialog.report-detail-modal .modal-header button')?.click()");
      await eventually("!document.querySelector('dialog.report-detail-modal[open]')",
        'Report detail did not close promptly');
    }
    const geometry=await sharedGeometry();
    for(let i=0;i<originalGeometry.length;i++){
      if(!geometry[i]||!originalGeometry[i])throw Error('Missing shared nav geometry');
      if(Math.abs(geometry[i].left-originalGeometry[i].left)>2||
        Math.abs(geometry[i].width-originalGeometry[i].width)>2)
        throw Error('Page chrome shifted when switching '+tab+': '+JSON.stringify({geometry,originalGeometry}));
    }
  }
  // Regression: a tab with custom width centers top controls, two section cards,
  // and page content on the same vertical edges, rather than keeping nav at x=0.
  const alignedCustomWidth=async(width)=>evaluate(`(()=>{
    const shell=document.querySelector('.app-shell');
    shell.style.setProperty('--page-content-width',${JSON.stringify(width+'px')});
    const all=['.topbar','.nav-tabs','main']
      .map(selector=>document.querySelector(selector)?.getBoundingClientRect());
    const expected=Math.min(window.innerWidth-40,${width});
    const reference=all[2],nav=all[1],top=all[0];
    return {ok:all.every(r=>!!r)&&reference.width>=expected-15&&
      Math.abs(top.left-reference.left)<=2&&Math.abs(top.width-reference.width)<=2&&
      nav.width<=1000&&Math.abs((nav.left+nav.right)/2-(reference.left+reference.right)/2)<=3&&
      reference.left>=0&&reference.right<=window.innerWidth+1,
      shellClass:shell.className,activeTab:document.querySelector('.nav-tabs button[aria-current=page]')?.textContent?.trim(),
      mainCssWidth:getComputedStyle(document.querySelector('main')).width,
      boxes:all.map(r=>r?{left:r.left,width:r.width}:null)};
  })()`);
  for(const customWidth of [850,1280]){
    const aligned=await alignedCustomWidth(customWidth);
    if(!aligned.ok)throw Error('Top navigation not centered with '+customWidth+'px content: '+JSON.stringify(aligned));
  }
  await evaluate("document.querySelector('.app-shell')?.style.removeProperty('--page-content-width')");
  // Exercise the exact settings menu markup with the production CSS even in the guest-only
  // mock session. No login or Firebase mutation is required to catch cramped nested-summary CSS.
  const settingsMenuLayout=async()=>evaluate(`(()=>{
    const host=document.querySelector('.topbar .top-actions');
    if(!host)return {ok:false,reason:'No topbar actions'};
    let menu=document.getElementById('smoke-two-entry-settings');
    if(!menu){
      menu=document.createElement('details');menu.id='smoke-two-entry-settings';
      menu.className='options-menu';
      menu.innerHTML='<summary aria-label="Cài đặt">⚙</summary><div class="options-popover"><button type="button">Chỉnh sửa</button><button type="button">Tài khoản và dữ liệu</button></div>';
      host.append(menu);
    }
    menu.open=true;
    const pop=menu.querySelector('.options-popover');
    const buttons=[...pop.querySelectorAll(':scope > button')];
    const rect=pop.getBoundingClientRect();
    const buttonRects=buttons.map(button=>button.getBoundingClientRect());
    const ok=buttons.length===2 &&
      buttons.map(button=>button.textContent.trim()).join('|')==='Chỉnh sửa|Tài khoản và dữ liệu' &&
      pop.querySelectorAll('summary, details').length===0 &&
      rect.width>200&&rect.width<=280 &&
      rect.left>=-1&&rect.right<=window.innerWidth+1 &&
      buttonRects.every(bounds=>bounds.width>=200 && bounds.height>=36 && bounds.height<=52) &&
      buttons.every(button=>getComputedStyle(button).wordBreak==='normal');
    return {ok,viewport:window.innerWidth,rect:{left:rect.left,right:rect.right,width:rect.width},buttons:buttonRects.map(b=>({width:b.width,height:b.height}))};
  })()`);
  const desktopMenu=await settingsMenuLayout();
  if(!desktopMenu.ok)throw Error('Two-item settings menu geometry broken on desktop: '+JSON.stringify(desktopMenu));
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:850,deviceScaleFactor:1,mobile:false});
  const mobileMenu=await settingsMenuLayout();
  if(!mobileMenu.ok)throw Error('Two-item settings menu geometry broken on 390px screen: '+JSON.stringify(mobileMenu));
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate("document.getElementById('smoke-two-entry-settings')?.remove()");
  // The full-width site chrome must use wide displays instead of a legacy 1600px cap;
  // report/list page contents can have independent, narrower widths.
  await send('Emulation.setDeviceMetricsOverride',{width:2200,height:1000,deviceScaleFactor:1,mobile:false});
  const wideShell=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell'),top=document.querySelector('.topbar');
    const main=document.querySelector('main');
    const sr=shell?.getBoundingClientRect(),tr=top?.getBoundingClientRect(),mr=main?.getBoundingClientRect();
    return !!sr&&!!tr&&!!mr&&sr.width>2000&&tr.width>2000&&
      getComputedStyle(shell).maxWidth==='none'&&mr.width<=sr.width;
  })()`);
  if(!wideShell)throw Error('Site shell still capped on 2200px desktop display');
  await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
  const guestOptions=await evaluate(`(()=>{const b=document.querySelector('.guest-signin');b?.click();return !!b})()`);
  if(!guestOptions)throw Error('Guest must have login entry');
  await eventually("document.querySelector('.firebase-panel')!==null || document.querySelector('main')?.textContent?.includes('Tài khoản Firebase')===true",
    'Guest login did not open account page');
  const accountWidth=await evaluate(`(()=>{
    const shell=document.querySelector('.app-shell');
    const main=document.querySelector('main');
    const top=document.querySelector('.topbar');
    const tabs=document.querySelector('.nav-tabs');
    if(!shell?.classList.contains('settings-page')||!main||!top||!tabs)
      return {ok:false,reason:'Account settings frame missing'};
    const m=main.getBoundingClientRect(),t=top.getBoundingClientRect(),n=tabs.getBoundingClientRect();
    return {ok:Math.abs(m.width-1100)<3&&Math.abs(m.left-t.left)<3&&
      Math.abs(m.width-t.width)<3&&n.width<=1000&&
      Math.abs((n.left+n.right)/2-(m.left+m.right)/2)<3,
      main:m.width,top:t.width,tabs:n.width};
  })()`);
  if(!accountWidth.ok)throw Error('Account settings must use compact aligned frame: '+JSON.stringify(accountWidth));
  const shot=await send('Page.captureScreenshot',{format:'png'});
  writeFileSync('hophdnd-ui-smoke-pass.png',Buffer.from(shot.data,'base64'));
  console.log('BROWSER_SMOKE_PASS: guest-only controls, subtle column search, stable grid with zero/many rows and search clear.');
}catch(error){
  try{if(ws?.readyState===WebSocket.OPEN){const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync('hophdnd-ui-smoke-failure.png',Buffer.from(shot.data,'base64'));}}catch{}
  console.error('BROWSER_SMOKE_FAIL:',error);process.exitCode=1;
}finally{
  for(const p of pending.values())p.reject?.(Error('closing browser'));
  if(ws)ws.close();
  if(chrome)chrome.kill('SIGKILL');
  server.close();
  rmSync(userDir,{recursive:true,force:true,maxRetries:8,retryDelay:120});
}
