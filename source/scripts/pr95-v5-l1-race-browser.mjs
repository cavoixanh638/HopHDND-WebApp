/** R-V5-02 controlled ACK real Chrome, isolated React CellPicker lifecycle.
 * Uses a genuine HTML/Vite-built React mount; simulated lease manager only.
 * No production Firebase or backend; no publish/deploy. */
import {build} from 'vite';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,extname} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
const root=resolve('dist-pr95-v5-l1-race');
await build({root:process.cwd(),configFile:false,base:'./',logLevel:'warn',
  build:{outDir:root,emptyOutDir:true,rolldownOptions:{input:resolve('pr95-v5-l1-race.html')}}});
const server=createServer((req,res)=>{
  try{
    const path=new URL(req.url??'/','http://127.0.0.1').pathname;
    const target=resolve(root,'.'+(path==='/'?'/pr95-v5-l1-race.html':path));
    if(!target.startsWith(root+'/')||!statSync(target).isFile())throw Error('not found');
    res.writeHead(200,{'content-type':{'.html':'text/html','.js':'text/javascript',
      '.css':'text/css'}[extname(target)]??'application/octet-stream','cache-control':'no-store'});
    res.end(readFileSync(target));
  }catch{res.writeHead(404);res.end('404');}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const port=server.address().port;
const chrome=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(x=>spawnSync('which',[x],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('R-V5-02 needs real Chrome');
const profile=mkdtempSync(join(tmpdir(),'pr95-v5-l1-race-'));
let browser,ws,seq=0;
const pending=new Map(),network=[];
const assert=(condition,message)=>{if(!condition)throw Error('R_V5_02_FAIL '+message);};
const send=(method,params={})=>new Promise((resolve,reject)=>{
  const id=++seq;pending.set(id,{resolve,reject});
  ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout '+method));}},15000);
});
const evaluate=async expression=>{
  const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(data.exceptionDetails)throw Error('Chrome JS exception '+JSON.stringify(data.exceptionDetails));
  return data.result?.value;
};
const snapshot=()=>evaluate('window.__pr95V5L1Race.snapshot()');
const waitFor=async(predicate,name)=>{
  for(let i=0;i<100;i++){
    try{if(await evaluate(predicate))return;}catch{}
    await sleep(85);
  }
  throw Error('R_V5_02_TIMEOUT '+name+' '+JSON.stringify(await snapshot().catch(()=>null)));
};
const pointer=async(selector)=>{
  const target=await evaluate('(()=>{const b=document.querySelector('+JSON.stringify(selector)+');'+
    'if(!b)return null;const r=b.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;'+
    'return {x,y,visible:document.elementFromPoint(x,y)?.closest("button")===b,'+
    'rect:r.toJSON()};})()');
  assert(target?.visible,'pointer target unavailable '+selector+' '+JSON.stringify(target));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:target.x,y:target.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x:target.x,y:target.y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x:target.x,y:target.y,button:'left',clickCount:1});
};
const screenshot=async name=>{
  const pic=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
  const bytes=Buffer.from(pic.data,'base64');
  assert(bytes.length>2000,'PNG too small '+name);
  writeFileSync(name,bytes);
  console.log('R_V5_02_CHROME_IMAGE '+JSON.stringify({name,bytes:bytes.length}));
};
try{
  const probe=createServer();
  await new Promise(done=>probe.listen(0,'127.0.0.1',done));
  const debugPort=probe.address().port;
  await new Promise(done=>probe.close(done));
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--disable-extensions','--disable-background-networking',
    '--no-first-run','--no-default-browser-check','--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port='+debugPort,'--user-data-dir='+profile,'about:blank'],
    {stdio:['ignore','ignore','pipe']});
  let tab;
  for(let i=0;i<150;i++){
    try{
      const rr=await fetch('http://127.0.0.1:'+debugPort+'/json/list',
        {signal:AbortSignal.timeout(850)});
      tab=(await rr.json()).find(x=>x.type==='page');
      if(tab)break;
    }catch{}
    await sleep(100);
  }
  assert(!!tab,'headless Chrome did not start');
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{
    ws.addEventListener('open',ok,{once:true});
    ws.addEventListener('error',bad,{once:true});
  });
  ws.addEventListener('message',e=>{
    const msg=JSON.parse(e.data);
    if(msg.method==='Network.requestWillBeSent')network.push(msg.params.request.url);
    if(msg.id&&pending.has(msg.id)){
      const p=pending.get(msg.id);pending.delete(msg.id);
      msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);
    }
  });
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/pr95-v5-l1-race.html'});
  await waitFor("!!document.querySelector('[data-race=popup] .cell-picker-trigger')&&!!window.__pr95V5L1Race",
    'real mounted A+B');
  await pointer('[data-race=popup] .cell-picker-trigger');
  await waitFor('window.__pr95V5L1Race.snapshot().count===1&&'+
    'document.querySelector("[data-race=popup] .cell-picker-trigger")?.getAttribute("aria-busy")==="true"',
    'A pending acquire');
  let state=await snapshot();
  assert(state.held===null&&state.events.join(',')==='acquire:A','A not pending '+JSON.stringify(state));
  console.log('R_V5_02_PENDING_A '+JSON.stringify(state));

  await pointer('[data-race=popup] [data-race=unmount-popup]');
  await waitFor('!document.querySelector("[data-race=popup]")','popup A unmounted');
  await pointer('[data-race=list] .cell-picker-trigger'); // exactly ONE genuine click
  await waitFor('window.__pr95V5L1Race.snapshot().waitingB==="true"','B is waiting');
  state=await snapshot();
  assert(state.count===1&&state.events.join(',')==='acquire:A'&&state.held===null&&
    state.expandedB==='false'&&state.patches===0,
    'B bypassed unresolved old acquire or canceled too early '+JSON.stringify(state));
  await screenshot('pr95-v5-l1-race-pending-popup-unmount.png');
  console.log('R_V5_02_FENCE_BLOCKS_NEW_ACQUIRE_PASS '+JSON.stringify(state));

  // Controlled "server ACK" occurs AFTER popup unmount and one-click B.
  await evaluate('window.__pr95V5L1Race.ackOld()');
  await waitFor('window.__pr95V5L1Race.snapshot().activeB===true','B opened after late ACK');
  state=await snapshot();
  assert(state.events.join(',')==='acquire:A,ack:A,cancel:A,acquire:B,ack:B'&&
    state.held==='B'&&state.count===2&&state.canceledA===1&&state.canceledB===0&&
    state.patches===0&&state.visiblePopovers===1,
    'late A release damaged B/new lease or produced double-cancel '+JSON.stringify(state));
  await screenshot('pr95-v5-l1-race-late-ack-b-open.png');
  console.log('R_V5_02_LATE_ACK_SINGLE_CLICK_SAME_FIELD_PASS '+JSON.stringify(state));

  // Unmount an unclaimed same-field sibling while B owns the lease. No
  // stale cleanup may cancel B, even if the old popup is already gone.
  await evaluate('window.__pr95V5L1Race.unmountUnused()');
  await waitFor('!document.querySelector("[data-race=unused]")','unclaimed sibling unmounted');
  await sleep(120);
  state=await snapshot();
  assert(state.held==='B'&&state.canceledA===1&&state.canceledB===0&&
    state.visiblePopovers===1&&state.patches===0,
    'unclaimed same-field cleanup revoked B '+JSON.stringify(state));
  console.log('R_V5_02_NO_STALE_OR_DUPLICATE_CANCEL_PASS '+JSON.stringify(state));

  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await waitFor('window.__pr95V5L1Race.snapshot().held===null&&'+
    '!document.querySelector(".cell-picker-popover:popover-open")','B closed and released');
  state=await snapshot();
  assert(state.canceledA===1&&state.canceledB===1&&state.patches===0&&
    state.listenerCounts.pointerdown===0&&state.listenerCounts.keydown===0&&
    state.listenerCounts.resize===0&&state.listenerCounts.scroll===0,
    'no-op or listener cleanup regression '+JSON.stringify(state));
  console.log('R_V5_02_LEASE_NOOP_LISTENER_CLEANUP_PASS '+JSON.stringify(state));
  const unauthorized=network.filter(url=>['firebaseio','firebasedatabase','identitytoolkit',
    'securetoken','docs.google.com','sheets.googleapis.com']
    .some(x=>url.toLowerCase().includes(x)));
  assert(unauthorized.length===0,'forbidden production endpoint '+JSON.stringify(unauthorized));
  console.log('R_V5_02_REAL_CELL_PICKER_CHROME_PASS '+JSON.stringify({
    headScenario:'A pending → unmount popup → single pointer B → late ACK A → cancel A → acquire B',
    events:state.events,leaseReleased:true,canceledA:1,canceledB:1,
    patchCount:0,listeners:state.listenerCounts,productionRequests:0}));
}finally{
  for(const p of pending.values())p.reject(Error('Chrome closing'));pending.clear();
  ws?.close();browser?.kill('SIGKILL');server.close();
  rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
