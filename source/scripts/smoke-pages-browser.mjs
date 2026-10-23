// Headless Chromium smoke against a locally served, built Pages TEST artifact.
// GViz is intercepted with synthetic records; Firebase production is never contacted.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
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
  const nav=await evaluate("(()=>{const b=[...document.querySelectorAll('.nav-tabs button')].find(b=>b.textContent?.includes('Danh sách các ND trình HĐND'));if(!b)return false;b.click();return true})()");
  if(!nav)throw Error('Cannot navigate to content list');
  // This test intentionally blocks real Firebase. Keep normal first paint gated,
  // then explicitly opt in to temporary source viewing for isolated Sheets checks.
  await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent?.includes('Xem dữ liệu tạm'));button?.click();return true;})()");
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
  const fullExcelColumns=await evaluate(`(()=>{
    const header=[...document.querySelectorAll('.item-heading-row th')].map(node=>node.querySelector('.column-heading-label')?.textContent?.trim()??'');
    const values=document.querySelector('.item-data-table tbody tr')?.textContent??'';
    return header.includes('Cấp Thành ủy cho ý kiến')&&
      header.includes('Tiến độ hiện tại')&&header.includes('Ghi chú')&&
      !header.includes('Đã thẩm tra chưa')&&
      values.includes('Sở đang thực hiện')&&values.includes('Ghi chú nguồn O');
  })()`);
  if(!fullExcelColumns)throw Error('Current 15-column E/F/G/N/O source values missing from viewer');
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
      button?.getAttribute('aria-pressed')==='false';
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
        document.body.appendChild(table);return tr;
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
      ['rgb(255, 232, 184)','rgb(176, 71, 0)'],
      ['rgb(213, 240, 222)','rgb(0, 122, 24)']];
    const coloredEditableOk=editableStatuses.every(group=>group.every((entry,i)=>
      entry.background===expectedStatusColors[i][0]&&entry.color===expectedStatusColors[i][1]&&
      entry.weight==='600'&&entry.historyOpacity==='0.42'&&entry.tag==='BUTTON'&&entry.arrow==='""'));
    return {ok:status.dataset.progressTone==='not-submitted'&&
      label.textContent?.includes('Sở chưa trình')&&
      style.backgroundColor==='rgb(255, 224, 228)'&&coloredEditableOk&&
      colors[0].bg==='rgb(255, 232, 184)'&&colors[1].bg==='rgb(213, 240, 222)'&&
      colors[0].fg==='rgb(176, 71, 0)'&&colors[0].weight==='600'&&
      colors[1].fg==='rgb(0, 122, 24)'&&colors[1].weight==='600'&&
      editStyle.bg==='rgb(242, 246, 249)'&&editStyle.fg==='rgb(66, 98, 116)'&&
      editStyle.weight==='550'&&editStyle.border==='rgb(183, 203, 214)'&&
      fontA==='15px'&&fontB==='15px'&&
      header.backgroundColor==='rgb(246, 249, 247)',
      colors,editStyle,editableStatuses,statusColor:style.backgroundColor,
      fontA,fontB,header:header.backgroundColor};
  })()`);
  if(!statusStyles.ok)throw Error('Workflow badges/header/filter typography regression: '+JSON.stringify(statusStyles));
  // Verify the REAL UI exists, and palette CSS variables cascade into list AND
  // popup status cells without writing any Sheets or Firebase test records.
  const paletteUi=await evaluate(`(()=>{
    const trigger=document.querySelector('.item-header-actions .status-palette-trigger');
    if(!trigger)return {ok:false,reason:'missing palette button'};
    trigger.click();return {ok:true};
  })()`);
  if(!paletteUi.ok)throw Error('Status palette button missing: '+JSON.stringify(paletteUi));
  await eventually(`!!document.querySelector('.status-palette-modal[open] input[aria-label="Mã màu chữ Sở chưa trình"]')`,
    'Status palette editor must expose HEX fields');
  const paletteStructure=await evaluate(`(()=>{
    const dialog=document.querySelector('.status-palette-modal[open]');
    const hexFields=[...(dialog?.querySelectorAll('.status-palette-color-controls input[type=text]')??[])];
    const pickers=[...(dialog?.querySelectorAll('.status-palette-color-controls input[type=color]')??[])];
    const options=dialog?.querySelector('select[aria-label="Chọn bộ màu trạng thái đã lưu"]');
    return {ok:hexFields.length===8&&pickers.length===8&&!!options&&
      !!dialog.querySelector('input[type=checkbox]')&&
      [...dialog.querySelectorAll('button')].some(b=>b.textContent.includes('Lưu bộ mới')),
      hexCount:hexFields.length,colorCount:pickers.length};
  })()`);
  if(!paletteStructure.ok)throw Error('Status palette editor fields missing: '+JSON.stringify(paletteStructure));
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
  await evaluate(`(()=>{
    document.querySelector('.status-palette-modal[open] .modal-footer button')?.click();
  })()`);
  await eventually(`!document.querySelector('.status-palette-modal[open]')`,
    'Status palette dialog should close normally');
  const sortAndGuestLayout=await evaluate(`(()=>{
    const topbar=document.querySelector('.topbar'),nav=document.querySelector('.nav-tabs');
    const cardHeader=document.querySelector('.item-data-region .card-header');
    const viewport=document.querySelector('.item-table-scroll');
    const status=document.querySelector('.item-filter-status-slot');
    const stt=document.querySelector('.item-heading-row th[data-column-key="stt"]');
    const sort=stt?.querySelector('.column-sort-button');
    if(!topbar||!nav||!cardHeader||!viewport||!stt||sort)return {ok:false,reason:'Missing guest chrome or sort incorrectly visible in view mode'};
    const top=topbar.getBoundingClientRect(),tabs=nav.getBoundingClientRect();
    const gap=viewport.getBoundingClientRect().top-cardHeader.getBoundingClientRect().bottom;
    const aligned=Math.abs((top.left+top.right)/2-(tabs.left+tabs.right)/2)<3&&tabs.width<=820&&tabs.width<top.width;
    return {ok:aligned&&gap<33&&!status,aligned,gap,hasEmptyStatus:!!status};
  })()`);
  if(!sortAndGuestLayout.ok)throw Error('Guest layout regression: '+JSON.stringify(sortAndGuestLayout));
  const mainSectionCards=await evaluate(`(()=>{
    const nav=document.querySelector('nav.primary-section-switcher');
    const cards=[...(nav?.querySelectorAll('button.primary-section-card')??[])];
    const labels=cards.map(el=>el.querySelector('.section-card-title')?.textContent);
    const boxes=cards.map(el=>el.getBoundingClientRect());
    const firstStyle=getComputedStyle(cards[0]),lastStyle=getComputedStyle(cards[1]);
    return {ok:nav?.getBoundingClientRect().width<=820&&
      firstStyle.backgroundImage!==lastStyle.backgroundImage&&
      cards.length===2&&labels[0]==='Báo cáo tổng hợp'&&
      labels[1]==='Danh sách các ND trình HĐND'&&
      boxes.every(box=>box.width>=200&&box.height>=60)&&
      cards.filter(el=>el.classList.contains('active')).length===1&&
      !document.querySelector('.brand,.demo-banner,.page-heading,.unknown-note'),
      labels,widths:boxes.map(box=>Math.round(box.width))};
  })()`);
  if(!mainSectionCards.ok)throw Error('Two main section cards were not rendered cleanly: '+JSON.stringify(mainSectionCards));
  const listHeadingAndLines=await evaluate(`(()=>{
    const card=document.querySelector('.item-data-region .card-header');
    const title=document.querySelector('.nav-tabs button[aria-current=page] .section-card-title');
    const headers=[...document.querySelectorAll('.item-heading-row th')];
    const first=headers[0];
    const label=first?.querySelector('.column-heading-label');
    const filter=document.querySelector('.item-column-filter-row th');
    const td=document.querySelector('.item-data-table tbody td');
    const thinLine=node=>node?getComputedStyle(node).borderRightWidth:null;
    return {ok:!!card&&title?.textContent==='Danh sách các ND trình HĐND'&&
      !card.querySelector('h3')&&!!card.querySelector('.item-list-summary')&&
      !card.querySelector('.status-pill')&&headers.length>=10&&
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
      getComputedStyle(long).textAlign==='left'&&
      getComputedStyle(long).verticalAlign==='top';
  })()`);
  if(!cellAlignment)throw Error('Column-key cell alignment regression');

  if(!await evaluate(`(()=>{
    const button=document.querySelector('.source-column-visibility button');
    if(!button)return false;
    button.click();return true;
  })()`))throw Error('Missing viewer column switch button');
  // New source layouts display all A–O by default, even in saved mode.
  // The control must switch state, not manufacture missing columns in a fresh layout.
  await eventually("document.querySelector('.source-column-visibility button')?.getAttribute('aria-pressed')==='true'",
    'Show-all column selection toggle did not switch state');
  if(!await evaluate(`(()=>{
    const button=document.querySelector('.source-column-visibility button');
    if(!button)return false;
    button.click();return true;
  })()`))throw Error('Cannot restore full column view');
  await eventually("document.querySelectorAll('.item-column-filter-row [data-filter-key]').length===15",
    'Returning to full A–O columns did not restore the source view');


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
      !banner.includes('GID')&&
      !document.querySelector('.notice[role="status"]')?.textContent?.includes('Danh mục và bố trí')&&
      document.querySelector('[data-filter-key="displayCode"] input')?.placeholder===''&&
      document.querySelector('input[aria-label="Tìm kiếm cột Nội dung trình"]')?.placeholder==='Tìm kiếm';
  })()`);
  if(!guestClean)throw Error('Anonymous list still exposes admin configuration or outdated filter labels');
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
  // Compact display preferences may hide presentation columns, never source data.
  const sourceWidth=await evaluate("document.querySelector('.item-data-table')?.getBoundingClientRect().width");
  const menuExists=await evaluate(`(()=>{
    const details=document.querySelector('.compact-columns-menu');
    if(!details)return false;
    details.open=true;
    return details.querySelectorAll('.compact-columns-options input[type=checkbox]').length===5;
  })()`);
  if(!menuExists)throw Error('Compact columns menu requires five independent options');
  for(let i=0;i<5;i++){
    const checked=await evaluate(`(()=>{
      const box=document.querySelectorAll('.compact-columns-options input[type=checkbox]')[${i}];
      if(!box)return false;
      box.click();return box.checked;
    })()`);
    if(!checked)throw Error('Compact option failed to enable: '+i);
  }
  await eventually("document.querySelectorAll('.item-heading-row th').length===12",
    'Three column pairs should compact 15 headers to 12');
  const compactRows=await evaluate(`(()=>{
    const headers=[...document.querySelectorAll('.item-heading-row th')].map(th=>th.dataset.columnKey);
    const content=document.querySelector('.item-data-table tbody td[data-col-key="content"]');
    const leaders=document.querySelector('.item-data-table tbody td[data-col-key="vpLeader"]');
    const specialist=document.querySelector('.item-data-table tbody td[data-col-key="room"]');
    return {ok:!headers.includes('type')&&!headers.includes('specialist')&&!headers.includes('ubndLeader')&&headers.includes('room')&&headers.includes('department')&&
      !!content?.textContent?.includes('(QPPL)')&&
      !!leaders?.textContent?.includes('UBND')&&
      !!leaders?.textContent?.includes('PCVP N.N.Hùng')&&
      !!leaders?.textContent?.includes('PCT T.V.Quân')&&
      !!specialist?.textContent?.includes('Phòng')&&!!specialist?.textContent?.includes('CV')&&
      !!specialist?.textContent?.includes('C.V.mẫu')&&
      document.querySelector('.item-data-table').getBoundingClientRect().width<${sourceWidth},
      headers,content:content?.textContent?.slice(-55),specialist:specialist?.textContent};
  })()`);
  if(!compactRows.ok)throw Error('Compact projection failed: '+JSON.stringify(compactRows));
  if(!await evaluate(`(()=>{
    const input=document.querySelector('[data-filter-key=room] input[aria-label="Tìm kiếm tên CV"]');
    input?.focus();return !!input;
  })()`))throw Error('Specialist must remain searchable by full name');
  await send('Input.insertText',{text:'Chuyên viên mẫu'});
  await eventually("document.querySelector('[data-filter-key=room] input[aria-label=\"Tìm kiếm tên CV\"]')?.value==='Chuyên viên mẫu'",
    'Full specialist name was not accepted by filter');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",
    'Full source specialist must match even when visually abbreviated');
  // Room drop-down AND specialist text search must coexist in one column.
  const roomsAvailable=await evaluate(`(()=>{
    const select=document.querySelector('[data-filter-key=room] select[aria-label="Chọn để lọc Phòng"]');
    return !!select&&[...select.options].some(o=>o.value==='Phòng mẫu');
  })()`);
  if(!roomsAvailable)throw Error('Room drop-down missing from merged Room/CV column');
  const roomFilterFont=await evaluate(`(()=>{
    const select=document.querySelector('[data-filter-key=room] select[aria-label="Chọn để lọc Phòng"]');
    const input=document.querySelector('[data-filter-key=room] input[aria-label="Tìm kiếm tên CV"]');
    if(!select||!input)return null;
    return {label:select.options[0]?.textContent,
      selectFont:parseFloat(getComputedStyle(select).fontSize),
      inputFont:parseFloat(getComputedStyle(input).fontSize),
      rowHeight:select.closest('tr')?.getBoundingClientRect().height,
      selectHeight:select.getBoundingClientRect().height,
      inputHeight:input.getBoundingClientRect().height};
  })()`);
  if(!roomFilterFont||roomFilterFont.label!=='Chọn để lọc Phòng'||
      roomFilterFont.selectFont<15||roomFilterFont.inputFont<15||
      roomFilterFont.rowHeight<84)
    throw Error('Room/CV filter size or text is incorrect: '+JSON.stringify(roomFilterFont));

  await evaluate(`(()=>{
    const select=document.querySelector('[data-filter-key=room] select[aria-label="Chọn để lọc Phòng"]');
    select.value='Phòng mẫu';select.dispatchEvent(new Event('change',{bubbles:true}));
  })()`);
  await eventually("document.querySelector('[data-filter-key=room] select')?.value==='Phòng mẫu'",
    'Room selection must apply while specialist search remains active');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",
    'AND combined filter lost the matching record');
  await evaluate("document.querySelector('[data-filter-key=room] input[aria-label=\"Tìm kiếm tên CV\"]')?.closest('.item-filter-input-wrap')?.querySelector('.item-filter-clear')?.click()");
  await evaluate("document.querySelector('[data-filter-key=room] select')?.closest('.item-filter-input-wrap')?.querySelector('.item-filter-clear')?.click()");
  // Even when both leaders share one visual column, the filter keeps full names.
  if(!await evaluate(`(()=>{
    const input=document.querySelector('[data-filter-key=vpLeader] input');
    input?.focus();return !!input;
  })()`))throw Error('Combined leaders must offer full-text filter');
  await send('Input.insertText',{text:'Trần Văn Quân'});
  await eventually("document.querySelector('[data-filter-key=vpLeader] input')?.value==='Trần Văn Quân'",
    'Full leader name not accepted by combined filter');
  await eventually("document.querySelector('.item-data-table tbody')?.textContent?.includes('NQ01')===true",
    'Combined leader filter lost original source name');
  await evaluate("document.querySelector('[data-filter-key=vpLeader] .item-filter-clear')?.click()");
  for(let i=0;i<4;i++){
    const unchecked=await evaluate(`(()=>{
      const box=document.querySelectorAll('.compact-columns-options input[type=checkbox]')[${i}];
      if(!box)return false;box.click();return !box.checked;
    })()`);
    if(!unchecked)throw Error('Compact option failed to disable: '+i);
  }
  await eventually("document.querySelectorAll('.item-heading-row th').length===15",
    'Unmerging all pairs must restore 15 source fields');
  const separateLeaders=await evaluate(`(()=>{
    const vp=document.querySelector('.item-data-table tbody td[data-col-key=vpLeader]');
    const ubnd=document.querySelector('.item-data-table tbody td[data-col-key=ubndLeader]');
    return !!vp?.textContent?.includes('PCVP N.N.Hùng')&&
      !!ubnd?.textContent?.includes('PCT T.V.Quân')&&
      vp?.querySelector('[aria-label="PCVP Nguyễn Ngọc Hùng"]')!==null&&
      ubnd?.querySelector('[aria-label="PCT Trần Văn Quân"]')!==null;
  })()`);
  if(!separateLeaders)throw Error('Short leader option must work with separate columns too');
  const restored=await evaluate(`(()=>{
    const box=document.querySelectorAll('.compact-columns-options input[type=checkbox]')[4];
    if(!box)return false;box.click();return !box.checked;
  })()`);
  if(!restored)throw Error('Short leader preference failed to turn off');
  await eventually("document.querySelector('.item-data-table tbody td[data-col-key=vpLeader]')?.textContent?.includes('Nguyễn Ngọc Hùng')===true",
    'Turning off leader abbreviation must restore full source name');
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
        return {ok:headers.every(text=>text==='Lãnh đạo VP')&&
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
          focus.length>=2&&summaries.length>=8&&percents.length===tables.length&&
          progress.length>=tables.length&&progress.every(el=>el.value>=0&&el.value<=100)&&
          coloredHeaders.length>=1&&tables.every(t=>!!getComputedStyle(t).fontFamily),
          samples:samples.map(cell=>getComputedStyle(cell).textAlign),focus:focus.length,
          summaries:summaries.length,percents:percents.length,progress:progress.length,headers:coloredHeaders.length};
      })()`);
      if(!cells.ok)throw Error('Report numeric alignment or focus UI missing: '+JSON.stringify(cells));
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
      const buildHeading=await evaluate(`(()=>{
        const title=[...document.querySelectorAll('.report-surface h3')]
          .find(node=>node.textContent?.includes('Tiến độ trình HĐND xây dựng NQ'));
        const heads=[...(title?.closest('.report-surface')?.querySelectorAll('thead th')??[])]
          .map(cell=>cell.textContent?.trim());
        return heads[1]==='Tổng số nội dung'&&heads[2]==='Không phải trình';
      })()`);
      if(!buildHeading)throw Error('Building NQ must show Không phải trình immediately after total');
      // The excluded build stage uses exactly the quiet pending-decision colors.
      const mutedBuild=await evaluate(`(()=>{
        const section=[...document.querySelectorAll('.report-surface')]
          .find(node=>node.querySelector('h3')?.textContent?.includes('Tiến độ trình HĐND xây dựng NQ'));
        const table=section?.querySelector('table.report-table');
        const excluded=table?.querySelector('thead th.report-stage-excluded');
        const pending=[...(table?.querySelectorAll('thead th')??[])]
          .find(th=>th.textContent?.includes('Đã trình HĐND, chưa có QĐ'));
        if(!excluded||!pending)return false;
        const visual=node=>{
          const style=getComputedStyle(node);
          return [style.backgroundColor,style.color,style.borderBottomColor].join('|');
        };
        return excluded.classList.contains('report-stage-intermediate')&&visual(excluded)===visual(pending)&&
          ['tbody','tfoot'].every(group=>{
            const a=table.querySelector(group+' td.report-stage-excluded');
            const b=table.querySelector(group+' td.report-stage-next.report-stage-intermediate');
            return !!a&&!!b&&visual(a)===visual(b);
          });
      })()`);
      if(!mutedBuild)throw Error('Không phải trình differs from muted pending-decision stage');
      // Delegated singleton uses one bounded geometry read per newly entered
      // count cell, never a per-frame pointermove read or global style selector.
      const centeredReportTitles=await evaluate(`(()=>{
        const titles=[...document.querySelectorAll('.report-surface > .card-header h3')];
        const deltas=titles.map(h=>{
          const header=h.closest('.card-header');
          const head=header?.getBoundingClientRect(),text=h.getBoundingClientRect();
          return {name:h.textContent?.slice(0,35),offset:head?Math.round(((text.left+text.right)-(head.left+head.right))/2):null,
            display:header?getComputedStyle(header).display:null,align:getComputedStyle(h).textAlign,
            headWidth:Math.round(head?.width??0),textWidth:Math.round(text.width)};
        });
        return {ok:titles.length===5&&deltas.every(v=>v.offset!==null&&Math.abs(v.offset)<4),
          count:titles.length,deltas};
      })()`);
      if(!centeredReportTitles.ok)throw Error('Report titles are no longer centered: '+JSON.stringify(centeredReportTitles));
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
      // Real pointer at a populated count: readable contrasting border, cell-
      // scoped fill, no box layout/row movement. Do not highlight empty cells.
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:4,y:4});
      await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:abPoints[0].x,y:abPoints[0].y});
      const hoverVisual=await evaluate(`(()=>{
        const button=document.elementFromPoint(${abPoints[0].x},${abPoints[0].y})?.closest('.count-drill');
        if(!button)return {ok:false,reason:'mouse missed the count'};
        const s=getComputedStyle(button),r=button.getBoundingClientRect(),td=button.closest('td').getBoundingClientRect();
        const others=[...document.querySelectorAll('.report-surface .count-drill')].filter(b=>b!==button);
        const onlyOne=others.every(b=>getComputedStyle(b).outlineStyle==='none'||
          getComputedStyle(b).outlineWidth==='0px');
        const oneCell=Math.abs(r.width-td.width)<3&&Math.abs(r.height-td.height)<3;
        const colored=s.backgroundColor==='rgba(9, 106, 113, 0.14)';
        return {ok:s.outlineStyle==='solid'&&s.outlineWidth==='2px'&&
          s.outlineColor==='rgb(8, 119, 123)'&&s.outlineOffset==='-2px'&&
          colored&&oneCell&&onlyOne,outline:s.outline,fill:s.backgroundColor,
          oneCell,onlyOne};
      })()`);
      if(!hoverVisual.ok)throw Error('Hovered count cell has no clear isolated outline: '+JSON.stringify(hoverVisual));
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
          return {ok:!!modal&&cols>=6&&cols<16&&rows>=1&&!forbidden&&
            !modal.querySelector('.report-grid-toolbar button,.report-grid-toolbar input')&&
            !!grid?.querySelector('.report-grid-filter-row input,.report-grid-filter-row select'),
            cols,rows,forbidden:!!forbidden};
        })()`);
        if(!reportGrid.ok)throw Error('Anonymous report grid controls regression: '+JSON.stringify(reportGrid));
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
      nav.width<=820&&Math.abs((nav.left+nav.right)/2-(reference.left+reference.right)/2)<=3&&
      reference.left>=0&&reference.right<=window.innerWidth+1,
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
      Math.abs(m.width-t.width)<3&&n.width<=820&&
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
