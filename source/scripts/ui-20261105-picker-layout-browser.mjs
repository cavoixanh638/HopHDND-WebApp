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
const rects=(at=0)=>evalJs(`(()=>{
 const stage=[...document.querySelectorAll('.compact-stages[data-rev2=true]')][${at}];
 if(!stage)return null;
 const r=el=>{if(!el)return null;const b=el.getBoundingClientRect();
  return {x:Math.round(b.x*10)/10,y:Math.round(b.y*10)/10,
   w:Math.round(b.width*10)/10,h:Math.round(b.height*10)/10};};
 const glyph=el=>{
   if(!el)return null;
   const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   const fragments=[];
   while(walker.nextNode()){
     const node=walker.currentNode;
     if(!node.textContent?.trim()||node.parentElement?.closest('[hidden],[aria-hidden="true"]'))continue;
     const range=document.createRange();range.selectNodeContents(node);
     for(const box of range.getClientRects()){
       if(box.width>.2&&box.height>.2)fragments.push({
         x:Math.round(box.x*10)/10,y:Math.round(box.y*10)/10,
         w:Math.round(box.width*10)/10,h:Math.round(box.height*10)/10,
         cy:Math.round((box.y+box.height/2)*10)/10
       });
     }
   }
   fragments.sort((a,b)=>a.y-b.y||a.x-b.x);
   const lines=fragments.filter((entry,index,list)=>
     !list.slice(0,index).some(previous=>Math.abs(previous.y-entry.y)<2));
   return {first:lines[0]??null,lines:lines.length,fragments,
     lastBottom:Math.max(0,...fragments.map(x=>x.y+x.h)),
     firstX:Math.min(Infinity,...fragments.map(x=>x.x)),
     lastRight:Math.max(0,...fragments.map(x=>x.x+x.w)),
     text:el.textContent?.trim().slice(0,95)};
 };
 const rows=[...stage.querySelectorAll('.compact-stage-row')];
 return {mode:stage.dataset.levelLayout,grid:getComputedStyle(stage).gridTemplateColumns,
  cell:r(stage.closest('td')),stage:r(stage),
  rows:rows.map(row=>({key:row.dataset.stageField,
   row:r(row),
   titleText:glyph(row.querySelector('.compact-stage-title')),
   statusText:glyph(row.querySelector('.compact-stage-state')),
   partAlign:(()=>{const part=row.querySelector('.compact-stage-state > .compact-part');
     return part?getComputedStyle(part).alignItems:null;})(),
   part:r(row.querySelector('.compact-stage-state > .compact-part')),
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
 const railColumns=a.grid.trim().split(/\s+/).map(value=>Number.parseFloat(value));
 const expected=railColumns.at(-1);
 assert(Number.isFinite(expected)&&expected>0&&a.rows.every(x=>Math.abs(x.status.w-expected)<1),
  'Progress width must equal configured rail, not historical 238px cap: '+JSON.stringify(a));
 assert(a.stage.w<=a.cell.w+1,'Stage extends beyond physical column');
 const buttonWidths=a.rows.filter(x=>x.button).map(x=>x.button.w);
 assert(buttonWidths.every(w=>Math.abs(w-buttonWidths[0])<1),'Unequal picker widths');
};
const glyphAligned=(layout,context,{wrap=false}={})=>{
 assert(layout&&layout.rows.length===3,'Missing stage glyphs '+context);
 for(const member of layout.rows){
   const label=member.titleText,state=member.statusText,outer=member.row,value=member.status;
   assert(label?.first&&state?.first,'Missing REAL text rect '+context+' '+JSON.stringify(member));
   assert(value&&outer,'Missing text container '+context);
   assert(state.first.y>=outer.y-2&&state.lastBottom<=outer.y+outer.h+2,
     'Value text clipped vertically '+context+' '+JSON.stringify(member));
   assert(state.firstX>=value.x-2&&state.lastRight<=value.x+value.w+2,
     'Value text clipped horizontally '+context+' '+JSON.stringify(member));
   if(label.lines===1&&state.lines===1){
     const delta=Math.abs(label.first.cy-state.first.cy);
     assert(delta<=2.8,'REAL L03 glyph center drift '+context+' '+member.key+
       ' delta='+delta+' text='+JSON.stringify({label,state,partAlign:member.partAlign,
       row:outer,status:value}));
   }else if(wrap){
     assert(state.lines>=1&&state.lastBottom<=outer.y+outer.h+2,
       'Multiline must stay legible '+context+' '+JSON.stringify(member));
   }
   if(member.editable!=='true'&&member.part){
     assert(member.partAlign==='center',
       'Read-only content still stretches at top '+context+' '+member.key);
   }
 }
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
  const layout=await rects();aligned(layout,'editable');glyphAligned(layout,'editable-'+width);
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
  const readonly=await rects();aligned(readonly,'readonly');glyphAligned(readonly,'readonly-'+width);
  assert(readonly.rows.every(row=>row.button===null),'Guest stage created picker');
  summary.push({viewport:width,mode:'readonly',layout:readonly,screenshot:await shot('ui-picker-readonly-'+width)});
  await navigate('mixed=1',width,Math.min(900,width===390?844:900));
  const mixedThree=await rects(0),mixedTwo=await rects(1);
  aligned(mixedThree,'editable');aligned(mixedTwo,'readonly');
  glyphAligned(mixedThree,'mixed-3-track-'+width);
  glyphAligned(mixedTwo,'mixed-2-track-'+width);
  assert(mixedThree.rows[0].editable==='false'&&mixedThree.rows[2].editable==='true',
    'Three-track mixed row lost independent progress grants');
  assert(mixedTwo.rows[0].editable==='true'&&mixedTwo.rows[2].editable==='false',
    'Two-track mixed row lost independent progress grants');
  summary.push({viewport:width,mode:'mixed',three:mixedThree,two:mixedTwo,
    screenshot:await shot('ui-picker-mixed-'+width)});
  await navigate('guest=1&wrap-status=1',width,Math.min(900,width===390?844:900));
  const wrapped=await rects();
  aligned(wrapped,'readonly');glyphAligned(wrapped,'wrapped-readonly-'+width,{wrap:true});
  assert(wrapped.rows[2].statusText.lines>=2,'Expected genuine multiline read-only value');
  summary.push({viewport:width,mode:'wrapped-readonly',layout:wrapped,
    screenshot:await shot('ui-picker-wrapped-readonly-'+width)});
 }
 await navigate('popup=1',1440,900);
 const popup=await rects();aligned(popup,'readonly');glyphAligned(popup,'popup-readonly-1440');
 summary.push({mode:'popup',layout:popup,screenshot:await shot('ui-picker-popup-1440')});
 for(const width of [1440,900,390]){
   await navigate('popup=1',width,Math.min(900,width===390?844:900));
   const readonlyPopup=await rects();
   aligned(readonlyPopup,'readonly');
   glyphAligned(readonlyPopup,'popup-readonly-'+width);
   summary.push({viewport:width,mode:'popup-readonly',layout:readonlyPopup,
     screenshot:await shot('ui-picker-popup-readonly-'+width)});
   await navigate('popup=1&popup-mixed=1',width,Math.min(900,width===390?844:900));
   await evalJs(`(()=>{
     const trigger=[...document.querySelectorAll('button')]
       .find(button=>button.textContent?.trim()==='Chỉnh sửa nháp');
     if(!trigger)throw Error('Missing popup edit-mode toggle');
     trigger.click();return true;
   })()`);
   const popupProbe=await evalJs(`(()=>{
     const toggle=[...document.querySelectorAll('button')].find(button=>
       button.textContent?.trim()==='Về chế độ xem'||button.textContent?.trim()==='Chỉnh sửa nháp');
     return {toggle:toggle?.textContent?.trim(),pressed:toggle?.getAttribute('aria-pressed'),
       tables:document.querySelectorAll('.report-detail-grid').length,
       stages:[...document.querySelectorAll('.compact-stages[data-rev2]')].slice(0,4)
         .map(stage=>({mode:stage.dataset.levelLayout,
           rows:[...stage.querySelectorAll('.compact-stage-row')].map(row=>({
             key:row.dataset.stageField,levelEditor:!!row.querySelector('[data-level-editor=true]'),
             editable:row.querySelector('.compact-stage-state')?.dataset.editable??'false'
           }))})),
       errors:[...document.querySelectorAll('[role=alert]')].map(el=>el.textContent?.slice(0,80))}
   })()`);
   console.log('REVIEW3_L03_POPUP_MIXED_PROBE '+JSON.stringify({width,...popupProbe}));
   await waitFor("document.querySelector('.report-detail-grid .compact-stages[data-level-layout=editable]')",
     'real popup mixed permission mode '+JSON.stringify(popupProbe));
   const popupThree=await rects(0),popupTwo=await rects(1);
   aligned(popupThree,'editable');aligned(popupTwo,'readonly');
   glyphAligned(popupThree,'popup-mixed-3-track-'+width);
   glyphAligned(popupTwo,'popup-mixed-2-track-'+width);
   summary.push({viewport:width,mode:'popup-mixed',three:popupThree,two:popupTwo,
     screenshot:await shot('ui-picker-popup-mixed-'+width)});
   await navigate('popup=1&wrap-status=1',width,Math.min(900,width===390?844:900));
   const popupWrapped=await rects();
   glyphAligned(popupWrapped,'popup-wrapped-'+width,{wrap:true});
   assert(popupWrapped.rows[2].statusText.lines>=2,
     'Expected multiline status in actual read-only popup');
   summary.push({viewport:width,mode:'popup-wrapped',layout:popupWrapped,
     screenshot:await shot('ui-picker-popup-wrapped-'+width)});
 }

 // Exercise actual stage CSS at the newly allowed whole-column budgets.
 // Existing QA10 verifies persistence and physical column projection separately.
 for(const [mode,budgets] of [['readonly',[180,260,320]],['editable',[260,340,420]]]){
  for(const budget of budgets){
   await navigate(mode==='readonly'?'guest=1':'edit=1',900,900);
   await evalJs(`document.querySelector('.compact-stages[data-rev2=true]').style.width='${budget-16}px'`);
   const narrow=await rects();
   assert.equal(narrow.mode,mode);
   assert(Math.abs(narrow.stage.w-(budget-16))<1,'Whole-cluster width ignored');
   const states=narrow.rows.map(row=>row.status);
   assert(states.every(state=>Math.abs(state.x-states[0].x)<1&&Math.abs(state.w-states[0].w)<1),
     'Narrow status controls must share aligned columns and equal widths');
   assert(states.every(state=>state.x+state.w<=narrow.stage.x+narrow.stage.w+1),
     'Narrow status extends beyond requested whole-cluster width');
   glyphAligned(narrow,'narrow-'+mode+'-'+budget,{wrap:true});
   summary.push({mode:'narrow-'+mode,budget,layout:narrow,
     screenshot:await shot('ui-picker-narrow-'+mode+'-'+budget)});
  }
 }
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
