// PR95 UI V3 L4: real Chromium CDP smoke against the BUILT baseline ItemList.
// All fixtures are synthetic and served only from loopback. Never touch production.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try{
    const pathname=new URL(req.url??'/','http://127.0.0.1').pathname;
    const file=resolve(root,'.'+(pathname==='/'?'/compact-qa.html':pathname));
    if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('404');
    res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css',
      '.woff2':'font/woff2','.png':'image/png'}[extname(file)]??'application/octet-stream'),
      'cache-control':'no-store'});
    res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const executable=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(x=>spawnSync('which',[x],{encoding:'utf8'}).status===0);
if(!executable)throw Error('PR95 V6 L2 requires real Chrome/Chromium');
const profile=mkdtempSync(join(tmpdir(),'pr95-v6-l2-'));
let browser,ws,id=0;
const outstanding=new Map(),network=[];
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const current=++id;outstanding.set(current,{resolve,reject});
  ws.send(JSON.stringify({id:current,method,params}));
  setTimeout(()=>{if(outstanding.has(current)){
    outstanding.delete(current);reject(Error('CDP timeout: '+method));
  }},15000);
});
const evaluate=async expression=>{
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error('Chrome exception '+JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
const waitFor=async(expression,label)=>{
  for(let i=0;i<95;i++){
    try{const v=await evaluate(expression);if(v)return v;}catch{}
    await sleep(100);
  }
  throw Error('Timeout waiting for '+label);
};


const assert=(condition,message)=>{if(!condition)throw Error('PR95_V6_L2_ASSERT '+message);};
const browserFn=(fn,...args)=>evaluate('('+fn.toString()+')('+args.map(JSON.stringify).join(',')+')');
const capture=async name=>{
  const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const data=Buffer.from(shot.data,'base64');
  assert(data.length>9000&&data.subarray(0,8).toString('hex')==='89504e470d0a1a0a','bad Chrome screenshot '+name);
  writeFileSync(name,data);
  console.log('PR95_V6_L2_REAL_CHROME_SCREENSHOT '+JSON.stringify({name,bytes:data.length}));
};
const exact='MẪU: Điều chỉnh kế hoạch đầu tư công trung hạn từ nguồn ngân sách địa phương.';
const pickSource=function(source){
  return [...document.querySelectorAll('.item-data-table .compact-document-content .item-search-flow')]
    .find(node=>node.textContent===source)??null;
};
const beginFixture=function(source){
  const node=[...document.querySelectorAll('.item-data-table .compact-document-content .item-search-flow')]
    .find(x=>x.textContent===source);
  if(!node)throw Error('real React SearchHighlight sample unavailable');
  const holder=node.closest('.compact-document-content');
  window.__v6L2={plain:node.cloneNode(true),plainFont:getComputedStyle(holder).font,
    plainLineHeight:getComputedStyle(holder).lineHeight,source};
  return {source:node.textContent,parentDisplay:getComputedStyle(holder).display,
    directMarkup:node.outerHTML,flowCount:node.parentNode.querySelectorAll('.item-search-flow').length};
};
const setQuery=function(value){
  const input=document.querySelector('.list-filter-search');
  if(!input)throw Error('Real App filter input not mounted');
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
  setter.call(input,value);
  input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:value}));
  input.dispatchEvent(new Event('change',{bubbles:true}));
  return input.value;
};
const saveHighlighted=function(source,query){
  const node=[...document.querySelectorAll('.item-data-table .compact-document-content .item-search-flow')]
    .find(x=>x.textContent===source&&x.querySelector('mark.item-search-match'));
  if(!node)throw Error('real React highlighted component missing '+query);
  window.__v6L2.highlighted=node.cloneNode(true);
  return {value:node.textContent,mark:[...node.querySelectorAll('mark.item-search-match')].map(x=>x.textContent),
    directMarkup:node.outerHTML,parentDisplay:getComputedStyle(node.parentNode).display};
};
const compareSameWidth=function(width,layout){
  const pair=window.__v6L2;
  if(!pair?.plain||!pair.highlighted)throw Error('real React clones must be captured before geometries');
  const old=document.getElementById('pr95-v6-l2-geometry');
  old?.remove();
  const root=document.createElement('section');root.id='pr95-v6-l2-geometry';
  Object.assign(root.style,{position:'fixed',zIndex:'2147483646',left:'12px',top:'115px',
    padding:'8px',background:'white',border:'2px solid #294d76',
    width:(width+22)+'px',maxHeight:'calc(100vh - 130px)',overflow:'auto'});
  const make=(label,child)=>{
    const heading=document.createElement('div');heading.textContent=label;
    heading.style.cssText='font:11px sans-serif;color:#233; padding:3px 0';
    root.appendChild(heading);
    const control=document.createElement('div');
    Object.assign(control.style,{display:layout,width:width+'px',minWidth:'0px',
      maxWidth:width+'px',boxSizing:'border-box',alignItems:'flex-start',
      gap:'4px',font:pair.plainFont,lineHeight:pair.plainLineHeight,
      textAlign:'left',whiteSpace:'normal',overflowWrap:'break-word',
      border:'1px solid #c4cad2',padding:'0px'});
    if(layout==='grid')control.style.gridTemplateColumns='minmax(0,1fr) 16px';
    control.appendChild(child);
    const caret=document.createElement('span');caret.textContent='✎';
    Object.assign(caret.style,{display:'inline-block',flex:'0 0 16px',width:'16px',
      font:'12px sans-serif',pointerEvents:'none'});
    control.appendChild(caret);root.appendChild(control);
    return {control,child,caret};
  };
  const a=make('BEFORE / original text (real component)',pair.plain.cloneNode(true));
  const b=make('AFTER / highlighted (real component)',pair.highlighted.cloneNode(true));
  document.body.appendChild(root);
  const glyph=(node,parent)=>{
    const all=[],walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
    let textNode;
    while((textNode=walker.nextNode())){
      const value=textNode.textContent||'';
      for(let i=0;i<value.length;i++){
        const ch=value[i];const r=document.createRange();
        r.setStart(textNode,i);r.setEnd(textNode,i+1);
        const box=r.getBoundingClientRect();
        all.push({ch,x:box.x-parent.getBoundingClientRect().x,
          y:box.y-parent.getBoundingClientRect().y,width:box.width});
      }
    }
    return all;
  };
  const ga=glyph(a.child,a.control),gb=glyph(b.child,b.control);
  const visible=x=>x.filter(t=>!(/\s/u).test(t.ch)&&t.width>0);
  const x=visible(ga),y=visible(gb);
  const sameText=a.child.textContent===b.child.textContent&&b.child.textContent===pair.source;
  const sameWidth=Math.abs(a.control.getBoundingClientRect().width-b.control.getBoundingClientRect().width)<0.01;
  let drift=0;
  if(x.length===y.length){
    for(let i=0;i<x.length;i++)
      drift=Math.max(drift,Math.abs(x[i].x-y[i].x),Math.abs(x[i].y-y[i].y));
  }
  const lines=arr=>[...new Set(arr.map(g=>Math.round(g.y*2)/2))].length;
  const mark=b.child.querySelector('mark.item-search-match'),markStyle=mark&&getComputedStyle(mark);
  const childCount=[a.control.childNodes.length,b.control.childNodes.length];
  const inline=!!markStyle&&markStyle.display==='inline'&&
    parseFloat(markStyle.paddingLeft)===0&&parseFloat(markStyle.paddingRight)===0;
  const noOverflow=[a.control,b.control].every(c=>c.scrollWidth<=c.clientWidth+1);
  return {width,layout,sameText,sameWidth,childCount,
    chars:x.length,lines:[lines(x),lines(y)],maxGlyphDrift:drift,
    markText:mark?.textContent,markDisplay:markStyle?.display,
    markPadding:markStyle?.padding,inline,noOverflow,viewport:innerWidth};
};

try{
  const probe=createServer();await new Promise(ok=>probe.listen(0,'127.0.0.1',ok));
  const debugPort=probe.address().port;await new Promise(ok=>probe.close(ok));
  browser=spawn(executable,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'about:blank'],
    {stdio:'ignore',env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
  let tab=null;
  for(let i=0;i<100;i++){
    try{
      const response=await fetch('http://127.0.0.1:'+debugPort+'/json/list',{signal:AbortSignal.timeout(750)});
      tab=(await response.json()).find(x=>x.type==='page');if(tab)break;
    }catch{}
    await sleep(110);
  }
  if(!tab)throw Error('Chrome CDP did not start');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',fail,{once:true});});
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Network.requestWillBeSent')network.push(m.params.request.url);
    if(m.id&&outstanding.has(m.id)){
      const p=outstanding.get(m.id);outstanding.delete(m.id);
      m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
    }
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1'});
  await waitFor("document.querySelector('[data-preview=pr95-l4-full]') && document.querySelector('.item-summary-total')",
    'full preview list with ItemSummaryCards');

  const sourceBefore=await browserFn(beginFixture,exact);
  assert(sourceBefore.source===exact&&sourceBefore.flowCount===1,
    'readonly source text and one React flow wrapper');
  await capture('pr95-v6-l2-before-desktop-1440.png');
  assert(await browserFn(setQuery,'ngan sach')==='ngan sach','guest search input updates via native input');
  await waitFor("document.querySelector('.item-data-table .compact-document-content mark.item-search-match')?.textContent==='ngân sách'",
    'real guest inline highlight with accentless query');
  const highlighted=await browserFn(saveHighlighted,exact,'ngan sach');
  assert(highlighted.value===exact&&JSON.stringify(highlighted.mark)===JSON.stringify(['ngân sách']),
    'exact original text and marked substring');
  const mainFlex=await browserFn(compareSameWidth,275,'flex');
  assert(mainFlex.sameText&&mainFlex.sameWidth&&mainFlex.inline&&mainFlex.noOverflow&&
    JSON.stringify(mainFlex.childCount)===JSON.stringify([2,2])&&
    mainFlex.lines[0]===mainFlex.lines[1]&&mainFlex.maxGlyphDrift<2.6,
    'flex same-width glyph/line difference '+JSON.stringify(mainFlex));
  await capture('pr95-v6-l2-after-desktop-1440.png');
  const mainGrid=await browserFn(compareSameWidth,275,'grid');
  assert(mainGrid.sameText&&mainGrid.sameWidth&&mainGrid.inline&&mainGrid.noOverflow&&
    mainGrid.lines[0]===mainGrid.lines[1]&&mainGrid.maxGlyphDrift<2.6,
    'grid same-width glyph/line difference '+JSON.stringify(mainGrid));
  // Re-enter with accents (the normalizer is the existing one).
  await browserFn(setQuery,'ngân sách');
  await waitFor("document.querySelector('.item-data-table .compact-document-content mark.item-search-match')?.textContent==='ngân sách'",
    'real NFC Vietnamese query');
  const accented=await browserFn(saveHighlighted,exact,'ngân sách');
  assert(accented.value===exact,'accented query preserves source identity');

  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  const mobile=await browserFn(compareSameWidth,250,'flex');
  assert(mobile.viewport===390&&mobile.sameText&&mobile.sameWidth&&mobile.noOverflow&&
    mobile.lines[0]===mobile.lines[1]&&mobile.maxGlyphDrift<2.6,
    '390px mobile same-width glyph/line '+JSON.stringify(mobile));
  await capture('pr95-v6-l2-after-mobile-390.png');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});

  // Genuine admin uses ContentEditor affordance, but the matching text still
  // has the same inline wrapper. The role is synthetic, not a Firebase bypass.
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1&preview-role=admin'});
  await waitFor("document.querySelector('[data-preview=pr95-l4-full][data-role=admin]')?.querySelector('.content-button .item-search-flow')",
    'real admin editable content with SearchHighlight');
  const editor=await browserFn(function(source){
    const node=[...document.querySelectorAll('button.content-button .item-search-flow')]
      .find(x=>x.textContent===source);
    const picker=document.querySelector('.item-data-table .cell-picker-value-text .item-search-flow');
    const note=document.querySelector('.item-data-table .inline-note-trigger .item-search-flow');
    const button=node?.closest('button');
    return {matched:!!node,contentText:node?.textContent,picker:!!picker,
      note:!!note,clickable:!!button&&!button.disabled,
      sourceChildCount:button?.querySelectorAll(':scope > .item-search-flow').length};
  },exact);
  assert(editor.matched&&editor.clickable&&editor.picker&&editor.sourceChildCount===1,
    'real admin content button and CellPicker use one flow; '+JSON.stringify(editor));
  // The list's existing read-only and editable cell pickers retain their hitbox.
  const pickerOpen=await browserFn(function(){
    const b=document.querySelector('.item-data-table .compact-stage-row button.cell-picker-trigger');
    if(!b||b.disabled)return false;
    b.click();return true;
  });
  assert(pickerOpen,'admin status picker still clickable');
  await waitFor("!!document.querySelector('.cell-picker-popover:popover-open [role=option]')",
    'status picker opened with accessible options');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await waitFor("!document.querySelector('.cell-picker-popover:popover-open')",
    'status picker ESC no-op closure');

  // ReportDetailGrid currently does NOT invoke SearchHighlight for its raw
  // content. Exercise the shared CSS inside the ACTUAL open report dialog with
  // clones captured from real SearchHighlight (not claim a live popup hit).
  const reportOpened=await browserFn(function(){
    const button=[...document.querySelectorAll('.pr95-preview-nav button')]
      .find(x=>x.textContent.includes('Báo cáo tổng hợp'));
    if(!button)return false;button.click();return true;
  });
  assert(reportOpened,'real reports navigation exists');
  await waitFor("!!document.querySelector('.report-table .count-drill')",'report drill exists');
  assert(await browserFn(function(){const b=document.querySelector('.report-table .count-drill');b.click();return true;}),
    'real report drill activates');
  await waitFor("!!document.querySelector('dialog.report-grid-modal[open] .report-detail-grid')",
    'real report dialog is mounted');
  const popup=await browserFn(function(){
    const dialog=document.querySelector('dialog.report-grid-modal[open]');
    const original=document.querySelector('#pr95-v6-l2-geometry');
    original?.remove();
    const host=document.createElement('div');host.id='pr95-v6-l2-popup-proof';
    host.className='report-detail-grid';
    Object.assign(host.style,{position:'fixed',top:'160px',left:'18px',
      zIndex:'2147483646',width:'280px',background:'white',padding:'8px',
      border:'2px solid #294d76',font:'13px sans-serif'});
    const line=document.createElement('div');
    Object.assign(line.style,{display:'flex',width:'260px',gap:'4px',minWidth:'0px'});
    const content=window.__v6L2?.highlighted?.cloneNode(true);
    if(!content)return {ok:false};
    line.appendChild(content);
    const icon=document.createElement('span');icon.textContent='✎';icon.style.flex='0 0 16px';line.appendChild(icon);
    host.appendChild(line);dialog.appendChild(host);
    const mark=content.querySelector('mark');
    const style=mark&&getComputedStyle(mark);
    return {ok:!!mark&&style.display==='inline'&&style.paddingLeft==='0px'&&
      content.textContent===window.__v6L2.source,
      matches:content.querySelectorAll('mark').length,width:line.getBoundingClientRect().width,
      markDisplay:style?.display,source:content.textContent};
  });
  // A fresh page load clears window.__v6L2, so re-create the fixed-width
  // popup fixture using the *same React component output* from current page
  // if necessary; explicit evidence scope prevents falsely claiming a live hit.
  if(!popup.ok)throw Error('PR95_V6_L2_POPUP_CONTEXT_FAIL '+JSON.stringify(popup));
  await capture('pr95-v6-l2-popup-styled-fixture-1440.png');
  const forbidden=network.filter(url=>['firebaseio','firebasedatabase','identitytoolkit','securetoken','docs.google.com/spreadsheets']
    .some(part=>url.toLowerCase().includes(part)));
  assert(forbidden.length===0,'no production endpoints queried '+JSON.stringify(forbidden));
  console.log('PR95_V6_L2_INLINE_GEOMETRY_PASS '+JSON.stringify({
    mainFlex,mainGrid,mobile,editor,popup,source:exact,queries:['ngan sach','ngân sách'],
    productionRequests:forbidden.length,notes:'popup CSS fixture in real ReportDetailGrid; not a live popup search highlight'}));

}finally{
  for(const p of outstanding.values())p.reject(Error('Chrome shutting down'));outstanding.clear();
  ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
