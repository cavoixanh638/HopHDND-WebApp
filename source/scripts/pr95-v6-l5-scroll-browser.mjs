/** V6 L5 real Chrome source-level scroll/visualViewport regression.
 * Runs against the V5 baseline compact QA bundle (real ItemList/CellPicker).
 * Only loopback synthetic data. No Firebase/Sheets/production requests.
 */
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,statSync,writeFileSync,rmSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';

const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
  try{
    const path=new URL(req.url??'/','http://localhost').pathname;
    const file=resolve(root,'.'+(path==='/'?'/compact-qa.html':path));
    if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('404');
    const type={'.html':'text/html','.js':'text/javascript','.css':'text/css',
      '.png':'image/png','.svg':'image/svg+xml'}[extname(file)]??'application/octet-stream';
    res.writeHead(200,{'content-type':type,'cache-control':'no-store'});
    res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('PR95_V6_L5_SCROLL_NO_REAL_CHROME');
const profile=mkdtempSync(join(tmpdir(),'pr95-v6-l5-scroll-'));
const pending=new Map();
const network=[];
let browser,ws,sequence=0;
const assert=(ok,message)=>{if(!ok)throw Error('PR95_V6_L5_SCROLL_FAIL '+message);};
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++sequence;pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout '+method));}},15000);
});
const evaluate=async expr=>{
  const result=await send('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('Chrome expression '+JSON.stringify(result.exceptionDetails));
  return result.result?.value;
};
const waitFor=async(expr,label)=>{
  for(let i=0;i<100;i++){
    try{if(await evaluate(expr))return;}catch{}
    await sleep(100);
  }
  throw Error('PR95_V6_L5_SCROLL_TIMEOUT '+label);
};
const trigger='document.querySelector(".item-data-table tbody tr:first-child .compact-stage-row[data-stage-field=progressBuild] button.cell-picker-trigger")';
const geom=()=>evaluate('(()=>{const t='+trigger+';const p=document.querySelector(".cell-picker-popover:popover-open");'+
  'const s=t?.closest(".item-table-scroll"),vv=visualViewport;'+
  'if(!t)return null;const a=t.getBoundingClientRect(),b=p?.getBoundingClientRect();'+
  'return {trigger:{x:a.left,y:a.top,bottom:a.bottom,width:a.width},'+
  'menu:p?{x:b.left,y:b.top,bottom:b.bottom,height:b.height,side:p.dataset.placement}:null,'+
  'gap:p?(p.dataset.placement==="above"?a.top-b.bottom:b.top-a.bottom):null,'+
  'scroll:s?{top:s.scrollTop,left:s.scrollLeft,max:s.scrollHeight-s.clientHeight}:null,'+
  'viewport:{left:vv?.offsetLeft??0,top:vv?.offsetTop??0,width:vv?.width??innerWidth,'+
  'height:vv?.height??innerHeight,scale:vv?.scale??1},patch:window.__l2LastPatch??null};})()');
const screenshot=async name=>{
  const shot=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const bytes=Buffer.from(shot.data,'base64');
  assert(bytes.length>2000&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a',
    'invalid screenshot '+name);
  writeFileSync(name,bytes);
};
const pointer=async()=>{
  const p=await evaluate('(()=>{const b='+trigger+';if(!b)return null;'+
    'b.scrollIntoView({block:"center",inline:"nearest"});const r=b.getBoundingClientRect();'+
    'const x=r.left+r.width/2,y=r.top+r.height/2;return {x,y,hit:document.elementFromPoint(x,y)?.closest("button")===b};})()');
  assert(p?.hit,'no physical pointer target '+JSON.stringify(p));
  for(const [type,fields] of [['mouseMoved',{}],['mousePressed',{button:'left',clickCount:1}],
    ['mouseReleased',{button:'left',clickCount:1}]]){
    await send('Input.dispatchMouseEvent',{type,x:p.x,y:p.y,...fields});
  }
};
const key=async key=>{
  const code=key==='Escape'?27:9;
  await send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code});
};
const assertPlaced=(g,label)=>{
  if(!g?.menu)return;
  assert(g.gap>=3&&g.gap<=9,label+' gap '+JSON.stringify(g));
  assert(g.menu.y>=g.viewport.top+5&&g.menu.bottom<=g.viewport.top+g.viewport.height-5,
    label+' viewport '+JSON.stringify(g));
};
try{
  const probe=createServer();await new Promise(ok=>probe.listen(0,'127.0.0.1',ok));
  const portDebug=probe.address().port;await new Promise(ok=>probe.close(ok));
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port='+portDebug,'--user-data-dir='+profile,'about:blank'],
    {stdio:['ignore','ignore','pipe']});
  let tab;
  for(let i=0;i<150;i++){
    try{
      const r=await fetch('http://127.0.0.1:'+portDebug+'/json/list',
        {signal:AbortSignal.timeout(850)});
      tab=(await r.json()).find(t=>t.type==='page');
      if(tab)break;
    }catch{}
    await sleep(100);
  }
  assert(!!tab,'Chrome startup');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true});});
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.method==='Network.requestWillBeSent')network.push(m.params.request.url);
    if(m.id&&pending.has(m.id)){
      const p=pending.get(m.id);pending.delete(m.id);
      m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
    }
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',
    {width:1440,height:600,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?edit=1&review-staff=1'});
  await waitFor('!!'+trigger,'real List picker');
  await pointer();
  await waitFor('!!document.querySelector(".cell-picker-popover:popover-open")','real open');
  await sleep(170);
  const before=await geom();assertPlaced(before,'before scroll');
  await screenshot('pr95-v6-l5-before-scroll.png');

  // Move a scrollable table container while the popover stays open.
  const changed=await evaluate('(()=>{const t='+trigger+';'+
    'const s=t.closest(".item-table-scroll");const before=s.scrollTop;'+
    's.scrollTop=Math.min(s.scrollHeight-s.clientHeight,before+22);'+
    'return {before,after:s.scrollTop,max:s.scrollHeight-s.clientHeight};})()');
  assert(changed&&changed.after>changed.before+2,
    'fixture lacks real scrollable table; cannot claim scroll tested '+JSON.stringify(changed));
  await sleep(230);
  const after=await geom();
  assertPlaced(after,'after scroll');
  assert(after.menu&&after.trigger.y<before.trigger.y-2,
    'scroll did not move/reposition mounted picker '+JSON.stringify({before,after}));
  assert(after.patch===null,'scroll emitted data patch');
  await screenshot('pr95-v6-l5-after-scroll.png');

  // A table scroll that hides the anchor must dismiss the floating menu.
  await evaluate('(()=>{const t='+trigger+';const s=t.closest(".item-table-scroll");s.scrollTop=s.scrollHeight;})()');
  await waitFor('!document.querySelector(".cell-picker-popover:popover-open")',
    'scrolling trigger out of clipped table closes editor');
  const offscreen=await geom();
  assert(offscreen.patch===null,'scroll-away changed raw source');

  // Pinch viewport is not the same as resizing the layout viewport. Test
  // actual visualViewport.scale + resize event in mobile Chrome.
  await send('Emulation.setDeviceMetricsOverride',
    {width:390,height:844,deviceScaleFactor:1,mobile:true});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?edit=1&review-staff=1'});
  await waitFor('!!'+trigger,'mobile real picker');
  await pointer();await waitFor('!!document.querySelector(".cell-picker-popover:popover-open")','mobile open');
  await sleep(180);
  const mobileBefore=await geom();assertPlaced(mobileBefore,'mobile original viewport');
  await send('Emulation.setPageScaleFactor',{pageScaleFactor:1.25});
  await sleep(300);
  const mobileAfter=await geom();
  assert(mobileAfter.viewport.scale>mobileBefore.viewport.scale+0.1,
    'visualViewport scale event not actually exercised '+JSON.stringify({mobileBefore,mobileAfter}));
  // Menu must either be correctly anchored in the new visible viewport, or
  // close because its source is outside the visible/clipped area.
  assertPlaced(mobileAfter,'pinch visualViewport');
  assert(mobileAfter.patch===null,'pinch modified raw data');
  await screenshot('pr95-v6-l5-visual-viewport.png');
  if(mobileAfter.menu)await key('Escape');
  const blocked=network.filter(url=>
    ['firebaseio','firebasedatabase','identitytoolkit','securetoken','sheets.googleapis.com','docs.google.com/spreadsheets']
      .some(fragment=>url.toLowerCase().includes(fragment)));
  assert(blocked.length===0,'unexpected production URL '+JSON.stringify(blocked));
  console.log('PR95_V6_L5_SCROLL_VISUAL_VIEWPORT_PASS '+JSON.stringify({
    before,after,offscreen,mobileBefore,mobileAfter,
    patchCount:0,screenshots:3,productionRequests:0
  }));
}finally{
  for(const p of pending.values())p.reject(Error('Chrome closing'));pending.clear();
  ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
