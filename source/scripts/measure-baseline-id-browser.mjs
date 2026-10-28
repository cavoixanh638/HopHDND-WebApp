// Offline, synthetic-only CDP measurement for the exact pre-UI-V2 restore tree.
// Reads baseline dist-compact-qa only; never touches Firebase, Sheets or Pages.
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,statSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import WebSocket from 'ws';

const root=resolve(process.argv[2]??'dist-compact-qa');
const output=resolve(process.argv[3]??'hophdnd-id-before-real.png');
const server=createServer((req,res)=>{
 try{
   const pathname=new URL(req.url??'/','http://127.0.0.1').pathname;
   const file=pathname==='/'?resolve(root,'compact-qa.html'):resolve(root,'.'+pathname);
   if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('missing static file');
   const mime=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
   res.writeHead(200,{'content-type':mime+'; charset=utf-8','cache-control':'no-store'});
   res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const binary=['google-chrome','google-chrome-stable','chromium','chromium-browser']
 .find(name=>spawnSync('which',[name],{encoding:'utf8'}).status===0);
if(!binary)throw Error('Chrome/Chromium binary missing');
const profile=mkdtempSync(join(tmpdir(),'hophdnd-pre-ui-v2-'));
let browser,ws,seq=0;
const outstanding=new Map();
const send=(method,params={})=>new Promise((resolve,reject)=>{
 const id=++seq;outstanding.set(id,{resolve,reject});
 ws.send(JSON.stringify({id,method,params}));
 setTimeout(()=>{if(outstanding.has(id)){outstanding.delete(id);reject(Error('CDP timeout '+method));}},17000);
});
const evaluate=async expression=>{
 const x=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(x.exceptionDetails)throw Error(JSON.stringify(x.exceptionDetails));
 return x.result.value;
};
const probe=createServer();
await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));
const debug=probe.address().port;
await new Promise(resolve=>probe.close(resolve));
try{
 browser=spawn(binary,['--headless=new','--no-zygote','--no-sandbox','--disable-dev-shm-usage',
  '--disable-gpu','--disable-extensions','--disable-background-networking',
  '--no-first-run','--no-default-browser-check','--remote-debugging-port='+debug,
  '--remote-debugging-address=127.0.0.1','--user-data-dir='+profile,'about:blank'],
  {stdio:'ignore',env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
 let tab=null;
 for(let i=0;i<130;i++){
  try{
   const x=await fetch('http://127.0.0.1:'+debug+'/json/list',{signal:AbortSignal.timeout(800)});
   const json=await x.json();tab=json.find(t=>t.type==='page');
   if(tab)break;
  }catch{}
  await sleep(150);
 }
 if(!tab)throw Error('Baseline Chrome CDP did not start');
 ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject);});
 ws.on('message',buffer=>{
  const m=JSON.parse(String(buffer));
  if(!m.id||!outstanding.has(m.id))return;
  const p=outstanding.get(m.id);outstanding.delete(m.id);
  m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);
 });
 await send('Page.enable');
 await send('Runtime.enable');
 await send('Emulation.setDeviceMetricsOverride',{width:1600,height:1000,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});
 let measure;
 for(let i=0;i<90;i++){
  measure=await evaluate(`(()=>{
   const row=document.querySelector('.item-data-table tbody tr');
   const td=row?.querySelector('td[data-col-key="displayCode"]');
   const table=td?.closest('table');
   const name=td?.textContent?.trim();
   return td&&name?{w0:td.getBoundingClientRect().width,viewport:innerWidth,
     height:innerHeight,id:name,tableWidth:table?.getBoundingClientRect().width,
     font:getComputedStyle(td).fontFamily,zoom:devicePixelRatio,source:'8172c065 restore, real Chrome'}:null;
  })()`);
  if(measure?.w0)break;
  await sleep(200);
 }
 if(!measure?.w0)throw Error('Baseline QA ItemList did not render ID');
 const shot=await send('Page.captureScreenshot',{format:'png'});
 writeFileSync(output,Buffer.from(shot.data,'base64'));
 console.log('BASELINE_ID_BROWSER',JSON.stringify(measure));
}finally{
 outstanding.forEach(x=>x.reject?.(Error('Browser closing')));
 if(ws)ws.close();
 if(browser)browser.kill('SIGKILL');
 server.close();
 rmSync(profile,{recursive:true,force:true,maxRetries:8,retryDelay:150});
}
