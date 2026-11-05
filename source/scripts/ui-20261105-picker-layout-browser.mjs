/** UI 05/11: browser contract against the real compact-qa ItemList/popup.
 * Run: npm run build:compact:qa && node scripts/ui-20261105-picker-layout-browser.mjs
 * Local synthetic data ONLY; no Firebase or other production endpoint.
 */
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {launchRealChromiumCdp} from './ui-20261105-cdp-driver.mjs';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
const ROOT=resolve('dist-compact-qa');
const OUT=resolve(process.env.UI_20261105_ARTIFACT_DIR??'ui-20261105-artifacts');
mkdirSync(OUT,{recursive:true});
const server=createServer((req,res)=>{
 try{
  const pathname=new URL(req.url??'/','http://127.0.0.1').pathname;
  const file=resolve(ROOT,'.'+(pathname==='/'?'/compact-qa.html':pathname));
  if(!file.startsWith(ROOT+'/')||!statSync(file).isFile())throw Error('404');
  res.writeHead(200,{'content-type':({
   '.html':'text/html','.js':'text/javascript','.css':'text/css',
   '.png':'image/png','.svg':'image/svg+xml'
  })[extname(file)]??'application/octet-stream','cache-control':'no-store'});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/compact-qa.html';
let driver=null;
const requests=[];
const send=(method,params={})=>{
 if(!driver)throw Error('Real Chromium CDP pipe not ready');
 return driver.send(method,params);
};
const evalJs=async expression=>{
 const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(r.exceptionDetails)throw Error('Browser exception: '+JSON.stringify(r.exceptionDetails));
 return r.result?.value;
};
const waitFor=async(expr,label)=>{
 for(let i=0;i<120;i++){
  try{if(await evalJs('Boolean('+expr+')'))return;}catch{}
  await delay(125);
 }throw Error('Timeout '+label);
};
const shot=async name=>{
 const png=Buffer.from((await send('Page.captureScreenshot',{format:'png',fromSurface:true})).data,'base64');
 assert(png.length>1500,'Invalid screenshot '+name);
 const file=join(OUT,name+'.png');writeFileSync(file,png);
 return {file,bytes:png.length};
};
const rects=()=>evalJs(`(()=>{
 const stage=document.querySelector('.compact-stages[data-rev2=true]');
 if(!stage)return null;
 const r=el=>{if(!el)return null;const b=el.getBoundingClientRect();
  return {x:Math.round(b.x*10)/10,y:Math.round(b.y*10)/10,
   w:Math.round(b.width*10)/10,h:Math.round(b.height*10)/10};};
 const rows=[...stage.querySelectorAll('.compact-stage-row')];
 return {mode:stage.dataset.levelLayout,grid:getComputedStyle(stage).gridTemplateColumns,
  cell:r(stage.closest('td')),stage:r(stage),
  rows:rows.map(row=>({key:row.dataset.stageField,
   label:r(row.querySelector('.compact-stage-label')),
   level:r(row.querySelector('[data-level-editor=true]')),
   status:r(row.querySelector('.compact-stage-state')),
   button:r(row.querySelector('.compact-stage-state button.cell-picker-trigger')),
   editable:row.querySelector('.compact-stage-state')?.dataset.editable??'false'
  }))};
})()`);
const aligned=(a,mode)=>{
 assert(a&&a.rows.length===3,'Missing 3 stages '+mode);
 assert.equal(a.mode,mode,'L03 layout mode');
 assert(a.grid&&!a.grid.includes('1fr'),'Progress rail must not stretch');
 const labels=a.rows.map(x=>x.label?.x),states=a.rows.map(x=>x.status?.x);
 assert(labels.every(x=>Math.abs(x-labels[0])<1),'Label x not aligned: '+JSON.stringify(a));
 assert(states.every(x=>Math.abs(x-states[0])<1),'Status x not aligned: '+JSON.stringify(a));
 assert(a.rows.every(x=>x.status.w>=230&&x.status.w<=245),'Wrong progress width');
 assert(a.stage.w<=a.cell.w+1,'Stage extends beyond physical column');
 const buttonWidths=a.rows.filter(x=>x.button).map(x=>x.button.w);
 assert(buttonWidths.every(w=>Math.abs(w-buttonWidths[0])<1),'Unequal picker widths');
};
const navigate=async(query,width,height)=>{
 await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
 await send('Page.navigate',{url:base+'?'+query});
 await waitFor("document.querySelector('.compact-stages[data-rev2]')",'render '+query);
 await delay(230);
};
let summary=[];
try{
 driver=await launchRealChromiumCdp({name:'PICKER',
  onRequest:url=>requests.push(url)});
 for(const width of [1440,900,390]){
  await navigate('edit=1',width,Math.min(900,width===390?844:900));
  const layout=await rects();aligned(layout,'editable');
  const refs=await evalJs(`(()=>[...document.querySelectorAll('.compact-stages[data-rev2] [data-ui-reference-part]')].map(e=>e.dataset.uiReferencePart))()`);
  for(const part of ['partyLevel','progressParty','progressBuild','progressCouncil'])
   assert(refs.includes(part),'Reference part absent: '+part);
  const snap=await shot('ui-picker-edit-'+width);
  summary.push({viewport:width,mode:'editable',layout,screenshot:snap});
  // The picker is a real control. Click with real CDP pointer events,
  // and capture focus/disabled/lease evidence if the dialog does not open.
  const trigger=await evalJs(`(()=>{
   const b=document.querySelector('.compact-stages[data-level-layout=editable] [data-level-editor=true] button.cell-picker-trigger');
   if(!b)return null;
   b.scrollIntoView({block:'center',inline:'nearest'});
   const r=b.getBoundingClientRect();
   return {x:r.left+r.width/2,y:r.top+r.height/2,
    disabled:b.disabled,aria:b.getAttribute('aria-expanded'),
    text:b.textContent.trim().slice(0,60)};
  })()`);
  assert(trigger&&!trigger.disabled,'Missing or disabled editable level picker '+JSON.stringify(trigger));
  await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:trigger.x,y:trigger.y});
  await send('Input.dispatchMouseEvent',{type:'mousePressed',
   button:'left',x:trigger.x,y:trigger.y,clickCount:1});
  await send('Input.dispatchMouseEvent',{type:'mouseReleased',
   button:'left',x:trigger.x,y:trigger.y,clickCount:1});
  const openState=await evalJs(`(()=>{
    const b=document.querySelector('.compact-stages[data-level-layout=editable] [data-level-editor=true] button.cell-picker-trigger');
    return {expanded:b?.getAttribute('aria-expanded'),busy:b?.getAttribute('aria-busy'),
      connected:b?.isConnected,active:document.activeElement?.tagName,
      popovers:document.querySelectorAll('.cell-picker-popover').length,
      errors:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent?.slice(0,150))};
  })()`);
  console.log('UI_20261105_PICKER_POINTER '+JSON.stringify({viewport:width,trigger,openState}));
  await waitFor("document.querySelector('.cell-picker-popover:popover-open')",
   'picker opened');
  const count=await evalJs("document.querySelectorAll('.cell-picker-popover:popover-open [role=option]').length");
  assert(count>=4,'Missing level choices '+count);
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await waitFor("!document.querySelector('.cell-picker-popover:popover-open')",'Escape closed picker');
  const isClosed=await evalJs("document.querySelector('.compact-stages button.cell-picker-trigger')?.getAttribute('aria-expanded')");
  assert.equal(isClosed,'false','Escape did not reset expanded state');
  await navigate('guest=1',width,Math.min(900,width===390?844:900));
  const readonly=await rects();aligned(readonly,'readonly');
  assert(readonly.rows.every(row=>row.button===null),'Guest stage created picker');
  summary.push({viewport:width,mode:'readonly',layout:readonly,screenshot:await shot('ui-picker-readonly-'+width)});
 }
 await navigate('popup=1',1440,900);
 const popup=await rects();aligned(popup,'readonly');
 summary.push({mode:'popup',layout:popup,screenshot:await shot('ui-picker-popup-1440')});
 assert(requests.every(url=>!/(?:firebaseio|firebasedatabase|identitytoolkit|sheets.googleapis)/i.test(url)),
  'Production data request detected');
 const log={result:'PASS',summary,productionRequests:0};
 writeFileSync(join(OUT,'rects.json'),JSON.stringify(log,null,2));
 console.log('UI_20261105_PICKER_BROWSER_PASS '+JSON.stringify(log));
}catch(e){
 console.error('UI_20261105_PICKER_BROWSER_FAIL '+e.stack);
 process.exitCode=1;
}finally{
 try{await driver?.close();}catch{}
 server.close();
}
