/** Real Chromium + real ItemList full synthetic UI. No production URLs/writes.
 * Run: npm run build:compact:qa && node scripts/ui-20261106-tracks-browser.mjs
 */
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join,extname} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
import {launchRealChromiumCdp} from './ui-20261105-cdp-driver.mjs';
const root=resolve('dist-compact-qa'),out=resolve('qa-results/ui-20261106-tracks');
mkdirSync(out,{recursive:true});
const server=createServer((req,res)=>{
 try{const path=new URL(req.url??'/','http://127.0.0.1').pathname;
  const file=resolve(root,'.'+(path==='/'?'/compact-qa.html':path));
  if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('404');
  res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[extname(file)]??'application/octet-stream'});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const uri='http://127.0.0.1:'+server.address().port+'/compact-qa.html';
let driver;
const send=(method,params={})=>driver.send(method,params);
const evaluate=async expression=>{
 const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
 if(r.exceptionDetails)throw Error('CDP runtime '+JSON.stringify(r.exceptionDetails));
 return r.result?.value;
};
const wait=async(expr,name)=>{
 for(let i=0;i<100;i++){if(await evaluate('Boolean('+expr+')'))return;await delay(120);}
 throw Error('Timed out: '+name);
};
const navigate=async(search,viewport)=>{
 await send('Emulation.setDeviceMetricsOverride',{width:viewport,height:viewport===390?844:900,deviceScaleFactor:1,mobile:viewport===390});
 await send('Page.navigate',{url:uri+search});
 await wait("document.querySelector('.compact-stages[data-rev2]')",'L03 mounted');
 await delay(200);
};
const measure=()=>evaluate(`(()=>{
 const stages=[...document.querySelectorAll('.compact-stages[data-rev2]')];
 const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};};
 return stages.slice(0,8).map(stage=>{
  const td=stage.closest('td');
  if(!td)throw Error('L03 stage missing ancestor TD');
  const rows=[...td.querySelectorAll('.compact-stage-row')];
  return {mode:td.dataset.l03Layout,physical:r(td),stage:r(stage),
   computed:getComputedStyle(stage).gridTemplateColumns,
   gap:parseFloat(getComputedStyle(stage).columnGap),
   padLeft:parseFloat(getComputedStyle(td).paddingLeft),
   padRight:parseFloat(getComputedStyle(td).paddingRight),
   borderRight:parseFloat(getComputedStyle(td).borderRightWidth),
   labels:rows.map(row=>r(row.querySelector('.compact-stage-label'))),
   levels:rows.map(row=>{const el=row.querySelector('[data-level-editor]');return el?r(el):null}),
   statuses:rows.map(row=>r(row.querySelector('.compact-stage-state'))),
   rowCount:rows.length};
 });
})`);
const assertGeometry=(measurements,{expected=null,mode=null}={})=>{
 assert(measurements.length>0,'L03 cells not found');
 for(const c of measurements){
  assert.equal(c.rowCount,3,'Three stage rows');
  if(mode)assert.equal(c.mode,mode);
  const rails=c.computed.split(' ').map(parseFloat);
  assert.equal(rails.length,c.mode==='readonly'?2:3,'2/3 physical rails');
  if(expected){const wanted=c.mode==='readonly'
   ?[expected.readonly.label,expected.readonly.status]
   :[expected.editable.label,expected.editable.level,expected.editable.status];
   for(let i=0;i<wanted.length;i++)assert(Math.abs(rails[i]-wanted[i])<1,JSON.stringify({rails,wanted,c}));
  }
  const statusX=c.statuses.map(x=>x.x),statusW=c.statuses.map(x=>x.w);
  assert(statusX.every(x=>Math.abs(x-statusX[0])<1),'Status x misaligned');
  assert(statusW.every(x=>Math.abs(x-statusW[0])<1),'Status widths diverged');
  assert(Math.abs(statusW[0]-rails.at(-1))<1,'Status rail mismatch');
  assert(Math.abs(c.gap-8)<.2,'Unexpected gap');
  assert(Math.abs(c.padLeft+c.padRight+c.borderRight-23)<.4,'Unexpected TD chrome');
  const sum=rails.reduce((a,b)=>a+b,0)+(rails.length-1)*8;
  assert(Math.abs(c.stage.w-sum)<1.2,'Mode stage width differs from rails+gaps');
  assert(c.stage.w<=c.physical.w+1,'Outer column clipping');
 }
};
const screenshot=async name=>{
 const result=await send('Page.captureScreenshot',{format:'png',fromSurface:true});
 writeFileSync(join(out,name+'.png'),Buffer.from(result.data,'base64'));
};
const wanted={readonly:{label:122,status:225},editable:{label:145,level:82,status:279}};
const records=[];
try{
 driver=await launchRealChromiumCdp({name:'TRACKS',onRequest:url=>{
   if(!url.startsWith('http://127.0.0.1'))throw Error('External request blocked: '+url);
 }});
 for(const viewport of [1440,900,390]){
  await navigate('?full=1&preview-role=admin',viewport);
  await wait("document.querySelector('button[aria-controls=admin-l03-width-editor]')",'admin editor trigger');
  await evaluate(`document.querySelector('button[aria-controls=admin-l03-width-editor]').click()`);
  await wait("document.querySelectorAll('#admin-l03-width-editor input').length===5",'five inputs');
  await evaluate(`(()=>{
    const values=${JSON.stringify({
      'L03 Chỉ xem · Nhãn + cấp trình':wanted.readonly.label,
      'L03 Chỉ xem · Tiến độ':wanted.readonly.status,
      'L03 Được sửa · Nhãn':wanted.editable.label,
      'L03 Được sửa · Cấp trình TU':wanted.editable.level,
      'L03 Được sửa · Tiến độ':wanted.editable.status
    })};
    for(const input of document.querySelectorAll('#admin-l03-width-editor input')){
      const value=String(values[input.getAttribute('aria-label')]);
      if(value==='undefined')throw Error('Unexpected rail input '+input.getAttribute('aria-label'));
      const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
      setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return true;
  })()`);
  await delay(150);
  const inputSnapshot=await evaluate(`[...document.querySelectorAll('#admin-l03-width-editor input')].map(e=>e.value)`);
  assert.deepEqual(inputSnapshot,['122','225','145','82','279'],'Five independent inputs');
  await evaluate(`document.querySelector('#admin-l03-width-editor button[type=submit]').click()`);
  await wait("!document.querySelector('#admin-l03-width-editor')",'save UI');
  const actual=await measure();
  assertGeometry(actual,{expected:wanted,mode:'editable'});
  await screenshot('tracks-admin-'+viewport);
  records.push({viewport,role:'admin',inputSnapshot,actual});
  // Role switches re-mount ItemList with the same confirmed shared layout.
  await evaluate(`document.querySelector('.pr95-preview-gear')?.click()`);
  await wait("document.querySelector('.pr95-preview-menu-user')",'open synthetic menu');
  await evaluate(`(()=>{
    const button=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Đăng xuất mô phỏng');
    if(!button)throw Error('No synthetic role switch');button.click();return true;
  })()`);
  await wait("document.querySelector('.pr95-full-preview[data-role=guest]')",'guest role');
  const readonly=await measure();
  assertGeometry(readonly,{expected:wanted,mode:'readonly'});
  await screenshot('tracks-guest-'+viewport);
  records.push({viewport,role:'guest',actual:readonly});
 }
 writeFileSync(join(out,'measured-rects.json'),JSON.stringify(records,null,2));
 console.log('UI_20261106_TRACKS_PASS '+JSON.stringify({modes:records.length,
  widths:wanted,screenshots:records.length}));
}catch(error){
 console.error('UI_20261106_TRACKS_FAIL',error);
 try{await screenshot('failure')}catch{}
 process.exitCode=1;
}finally{await driver?.close();server.close();}
