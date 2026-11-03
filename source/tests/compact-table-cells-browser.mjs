// Synthetic real-component Chrome acceptance. Run from source after build:compact:qa.
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync} from 'node:fs';
import {resolve,extname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {setTimeout as sleep} from 'node:timers/promises';
const out=resolve('docs/tasks/parallel-20261103-ui/evidence/A');mkdirSync(out,{recursive:true});
const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{try{const path=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!path.startsWith(root))throw Error();res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':extname(path)==='.css'?'text/css':'text/html');res.end(readFileSync(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=spawn(process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',['--headless=new','--no-first-run','--disable-gpu','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+mkdtempSync(join(tmpdir(),'cells-a-')),'about:blank'],{windowsHide:true});
let endpoint='';browser.stderr.on('data',d=>{const m=String(d).match(/DevTools listening on (ws:\/\/\S+)/);if(m)endpoint=m[1];});
let ws;const pending=new Map();let seq=0;
const send=(method,params={})=>new Promise((ok,bad)=>{const id=++seq;pending.set(id,{ok,bad});setTimeout(()=>{if(pending.has(id)){pending.delete(id);bad(Error('CDP timeout '+method));}},10000).unref();ws.send(JSON.stringify({id,method,params}));});
const js=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
const results=[];const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
try{
 for(let i=0;!endpoint&&i<100;i++)await sleep(100);assert(endpoint,'Chrome did not start');
 console.log('Chrome ready',endpoint);const targets=await (await fetch('http://'+new URL(endpoint).host+'/json')).json();ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.addEventListener('open',r));ws.addEventListener('message',e=>{const r=JSON.parse(e.data);if(r.id){const p=pending.get(r.id);pending.delete(r.id);r.error?p.bad(r.error):p.ok(r.result);}});
 await send('Runtime.enable');await send('Page.enable');console.log('runtime',await js('1+1'));
 for(const width of [1440,900,390])for(const mode of ['admin','guest','popup','highlight']){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});
  console.log('Fixture',width,mode);const query={admin:'edit=1',guest:'guest=1',popup:'popup=1',highlight:'edit=1&highlight=1'}[mode];
  await send('Page.navigate',{url:`http://127.0.0.1:${server.address().port}/compact-qa.html?${query}`});
  await sleep(1000);for(let n=0;n<100;n++){if(await js('!!document.querySelector(".compact-stages")'))break;await sleep(100);}await sleep(200);
  const measurement=await js(`(()=>{
   const rect=e=>e.getBoundingClientRect().toJSON();
   const groups=[...document.querySelectorAll('.compact-stages')].map(g=>({rows:[...g.querySelectorAll('.compact-stage-row')].map(r=>{const state=r.querySelector('.compact-stage-state'), text=state.querySelector('.cell-picker-value-text')||state.querySelector('.workflow-status-value')||state;return {label:r.querySelector('.compact-stage-title').textContent,stateX:rect(state).x,textX:rect(text).x+(text===state?parseFloat(getComputedStyle(state).paddingLeft):0),bg:getComputedStyle(state).backgroundColor,level:r.querySelector('.compact-stage-level')?rect(r.querySelector('.compact-stage-level')):null,title:rect(r.querySelector('.compact-stage-title'))};}),clientWidth:g.clientWidth,scrollWidth:g.scrollWidth,overflow:getComputedStyle(g).overflowX}));
   const contents=[...document.querySelectorAll('.compact-document-group')].map(g=>({children:[...g.children].map(c=>c.className),content:rect(g.querySelector('.compact-document-content')),metadata:rect(g.querySelector('.compact-document-heading'))}));
   const id=document.querySelector('th[data-column-key="displayCode"]');const label=id?.querySelector('.column-heading-label'),sort=id?.querySelector('.column-sort-button');
   const vertical=[...document.querySelectorAll('tbody td[data-col-key="specificProgress"],tbody td[data-col-key="note"]')].map(c=>getComputedStyle(c).verticalAlign);
   return {groups,contents,vertical,id:id?{rect:rect(id),label:rect(label),text:label.textContent,scroll:label.scrollWidth,client:label.clientWidth,sort:sort?rect(sort):null}:null,body:{width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth},highlights:[...document.querySelectorAll('[data-highlighted="true"]')].map(e=>({class:e.className,bg:getComputedStyle(e).backgroundColor}))};
  })()`);
  results.push({width,mode,...measurement});writeFileSync(join(out,'dom-measurements.json'),JSON.stringify(results,null,2));
  for(const g of measurement.groups){assert(g.rows.length===3,'three rows');assert(Math.max(...g.rows.map(r=>r.stateX))-Math.min(...g.rows.map(r=>r.stateX))<1,'state alignment');assert(Math.max(...g.rows.map(r=>r.textX))-Math.min(...g.rows.map(r=>r.textX))<1,'text alignment');assert(g.scrollWidth<=g.clientWidth+1||g.overflow==='auto','internal overflow');for(const r of g.rows)if(r.level)assert(Math.abs(r.level.y-r.title.y)<8,'inline level');}
  for(const c of measurement.contents){assert(c.children.length===2&&c.children[0]==='compact-document-content','content first and once');assert(c.metadata.y>=c.content.bottom-1,'metadata below');}
  assert(measurement.vertical.every(v=>v==='middle'),'vertical centering');
  if(measurement.id){const h=measurement.id;if(mode!=='popup')assert(Math.abs(h.rect.width-52)<1,'List ID width 52');assert(h.scroll<=h.client+1,'ID no clipping');if(h.sort)assert(h.label.right<=h.sort.x+1,'ID sort no overlap');}
  assert(measurement.body.scroll<=measurement.body.width+1,'no page overflow');
  if(mode==='highlight')assert(measurement.highlights.length>0,'highlight retained');
  if(width===900){const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(join(out,mode+'-900.png'),Buffer.from(shot.data,'base64'));}
 }
 console.log('PASS: 12 viewport/role fixtures, alignment, content ordering, ID, vertical centering, internal scroll and highlights.');
}finally{ws?.close();browser.kill();server.close();}
