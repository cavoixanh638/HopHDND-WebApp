/** Real Chrome viewport check, synthetic RAM-only demo. No Firebase credentials. */
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdtempSync,rmSync,writeFileSync,mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join,extname,sep} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
const root=resolve('dist-compact-qa'),artifactDir=resolve('compact-menu-viewport-artifacts');
const server=createServer((req,res)=>{
  try{
    const route=new URL(req.url??'/','http://127.0.0.1').pathname;
    const path=resolve(root,'.'+(route==='/'?'/compact-qa.html':route));
    if(!path.startsWith(root+sep)||!statSync(path).isFile())throw Error('404');
    res.writeHead(200,{'cache-control':'no-store','content-type':({
      '.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png',
      '.svg':'image/svg+xml','.woff2':'font/woff2'})[extname(path)]??'application/octet-stream'});
    res.end(readFileSync(path));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const port=server.address().port;
const chrome=process.env.CHROME_PATH||['google-chrome','google-chrome-stable','chromium','chromium-browser']
  .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!chrome)throw Error('Real Chrome not available');
const temp=mkdtempSync(join(tmpdir(),'hdnd-compact-menu-'));
let browser,ws,serial=0;
const jobs=new Map();
const assert=(ok,msg)=>{if(!ok)throw Error('RESPONSIBLE_MENU_FAIL '+msg)};
const send=(method,params={})=>new Promise((done,fail)=>{
  const id=++serial;jobs.set(id,{done,fail});ws.send(JSON.stringify({id,method,params}));
  setTimeout(()=>{if(jobs.has(id)){jobs.delete(id);fail(Error('CDP timeout '+method))}},17000);
});
const evaluate=async expression=>{
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails).slice(0,500));
  return r.result?.value;
};
const wait=async(expr,label)=>{
  for(let i=0;i<130;i++){
    try{if(await evaluate('Boolean('+expr+')'))return}catch{}
    await sleep(110);
  }
  throw Error('Timeout '+label);
};
const click=async selector=>{
  const rect=await evaluate('(()=>{const e=document.querySelector('+JSON.stringify(selector)+');if(!e)return null;e.scrollIntoView({block:"nearest"});return e.getBoundingClientRect().toJSON()})()');
  assert(rect&&rect.width>4&&rect.height>4,'click selector '+selector);
  const x=Math.round(rect.x+rect.width/2),y=Math.round(rect.y+rect.height/2);
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x,y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',x,y,button:'left',clickCount:1});
};
const setViewport=(width,height)=>send('Emulation.setDeviceMetricsOverride',
  {width,height,deviceScaleFactor:1,mobile:width<650});
const screenshot=async name=>{
  const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  const bytes=Buffer.from(r.data,'base64');assert(bytes.length>1500,'screenshot failed');
  mkdirSync(artifactDir,{recursive:true});writeFileSync(join(artifactDir,name+'.png'),bytes);
};
const geometry=()=>evaluate('(()=>{const p=document.querySelector("#hdnd-compact-columns-popup");'+
  'if(!p)return null;const b=p.getBoundingClientRect();return {'+
  'rect:b.toJSON(),parentIsBody:p.parentElement===document.body,side:p.dataset.popoverSide,'+
  'position:getComputedStyle(p).position,overflowY:getComputedStyle(p).overflowY,'+
  'checkboxes:p.querySelectorAll("input[type=checkbox]").length,'+
  'scrollHeight:p.scrollHeight,clientHeight:p.clientHeight,viewport:[innerWidth,innerHeight]}})()');
try{
  const probe=createServer();await new Promise(done=>probe.listen(0,'127.0.0.1',done));
  const debugPort=probe.address().port;await new Promise(done=>probe.close(done));
  browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--no-first-run','--disable-background-networking',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+debugPort,
    '--user-data-dir='+temp,'about:blank'],{stdio:['ignore','ignore','pipe']});
  let stderr='';browser.stderr.on('data',x=>{stderr=(stderr+String(x)).slice(-1200)});
  let tab;
  for(let i=0;i<130;i++){
    try{
      const r=await fetch('http://127.0.0.1:'+debugPort+'/json/list',
        {signal:AbortSignal.timeout(800)});
      tab=(await r.json()).find(x=>x.type==='page');if(tab)break;
    }catch{}
    await sleep(130);
  }
  assert(tab,'CDP launch '+stderr);
  ws=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((done,fail)=>{
    ws.addEventListener('open',done,{once:true});ws.addEventListener('error',fail,{once:true});
  });
  ws.addEventListener('message',e=>{
    const m=JSON.parse(e.data);
    if(m.id&&jobs.has(m.id)){const p=jobs.get(m.id);jobs.delete(m.id);
      m.error?p.fail(Error(JSON.stringify(m.error))):p.done(m.result)}
  });
  await send('Runtime.enable');await send('Page.enable');
  await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/compact-qa.html?full=1&preview-role=admin'});
  await wait('document.querySelector(".admin-preview-options-toggle")','List admin options toggle');
  // The approved compact demo intentionally hides seldom-used settings at rest.
  // Expose the controls by a REAL pointer click, not DOM mutation.
  await click('.admin-preview-options-toggle');
  await wait('document.querySelector(".compact-columns-menu>summary")?.getClientRects().length>0',
    'responsible-person menu visible after opening admin options');
  for(const [width,height] of [[1440,900],[453,420],[390,560]]){
    await setViewport(width,height);
    await evaluate('document.querySelector(".compact-columns-menu>summary").scrollIntoView({block:"center",inline:"nearest"})');
    await sleep(150);
    await click('.compact-columns-menu>summary');
    await wait('document.querySelector("#hdnd-compact-columns-popup")','menu mounted');
    const g=await geometry();
    assert(g?.parentIsBody,'portal is not in document.body '+JSON.stringify(g));
    assert(g.position==='fixed'&&g.overflowY==='auto','menu positioning and scroll '+JSON.stringify(g));
    assert(g.rect.left>=8&&g.rect.right<=width-8&&g.rect.top>=8&&g.rect.bottom<=height-8,
      'popup outside viewport '+JSON.stringify(g));
    assert(g.checkboxes>=4,'options were removed '+JSON.stringify(g));
    await evaluate('document.querySelector("#hdnd-compact-columns-popup").scrollTop=99999');
    await sleep(90);
    const reached=await evaluate('(()=>{const p=document.querySelector("#hdnd-compact-columns-popup");'+
      'const last=p.lastElementChild.getBoundingClientRect(),outer=p.getBoundingClientRect();'+
      'return last.top<outer.bottom+1&&last.bottom<=outer.bottom+2})()');
    assert(reached,'last option not reachable by internal scroll '+JSON.stringify(g));
    console.log('RESPONSIBLE_MENU_GEOMETRY_PASS '+JSON.stringify({width,height,side:g.side,rect:g.rect,scroll:g.scrollHeight-g.clientHeight}));
    await screenshot('compact-menu-'+width+'x'+height);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape'});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape'});
    await wait('!document.querySelector("#hdnd-compact-columns-popup")','Escape closes');
  }
  await setViewport(453,420);
  await click('.compact-columns-menu>summary');
  await wait('document.querySelector("#hdnd-compact-columns-popup")','open for checkbox test');
  const before=await evaluate('document.querySelector("#hdnd-compact-columns-popup input[type=checkbox]").checked');
  await click('#hdnd-compact-columns-popup input[type=checkbox]');
  await sleep(110);
  const after=await evaluate('document.querySelector("#hdnd-compact-columns-popup input[type=checkbox]").checked');
  assert(before!==after,'checkbox failed to toggle');
  assert(await evaluate('!!document.querySelector("#hdnd-compact-columns-popup")'),'menu closes during option selection');
  await click('.item-list-page-title');
  await wait('!document.querySelector("#hdnd-compact-columns-popup")','outside click closes');
  console.log('RESPONSIBLE_MENU_INTERACTION_PASS '+JSON.stringify({checkbox:true,escape:true,outsideClick:true,productionCalls:0}));
}finally{
  if(ws)try{ws.close()}catch{}
  if(browser)browser.kill('SIGTERM');
  await new Promise(done=>server.close(done));await sleep(230);
  rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}
