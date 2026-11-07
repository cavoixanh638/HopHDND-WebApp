/** F01: real Chromium paint-clipping regression, not only computed transform.
 * F01_MODE=before runs against unchanged CONTENT PASS SHA 9fb74b7, with script
 * copied into its detached worktree. F01_MODE=after is the current branch.
 * Same real ItemList/ReportDetailGrid fixture, viewports, selectors, browser.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const mode=process.env.PICKER_CONTENT_F01_MODE??'after';
assert(['before','after'].includes(mode),'F01 mode must be before or after');
const out=resolve('qa-results/picker-parity-content/f01/'+mode);
mkdirSync(out,{recursive:true});
const port=5204,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','preact',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],
 {cwd:resolve('.'),stdio:['ignore','pipe','pipe']});
let serverLog='',browser;
for(const s of [server.stdout,server.stderr])s.on('data',b=>(serverLog+=String(b),serverLog=serverLog.slice(-16000)));
const cases=[];
const srect=rect=>rect?{x:rect.x,y:rect.y,w:rect.width,h:rect.height,
  left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom}:null;
const epsilon=1.05;
const close=(a,b)=>Math.abs(a-b)<epsilon;
const common=(p,r)=>p&&r&&['x','y','w','h'].every(k=>close(p[k],r[k]));
const targetSelector=field=>'.compact-document-heading[data-metadata-mode="editable"] '+
  '[data-ui-reference-part="'+field+'"] button.cell-picker-trigger';
async function ready(){
 for(let n=0;n<120;n++){
  if(server.exitCode!==null)throw Error('Vite exited '+serverLog);
  try{if((await fetch(origin+'/ui-20261106-picker-fixture.html')).ok)return;}catch{}
  await delay(175);
 }
 throw Error('Vite did not start '+serverLog);
}
async function measurement(target){
 return target.evaluate(button=>{
  const box=e=>{if(!e)return null;const r=e.getBoundingClientRect();
   return {x:r.x,y:r.y,w:r.width,h:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom}};
  const css=e=>{if(!e)return null;const s=getComputedStyle(e);return {
   overflowX:s.overflowX,overflowY:s.overflowY,overflowClipMargin:s.overflowClipMargin,
   padding:s.padding,margin:s.margin,transform:s.transform,background:s.backgroundColor,
   outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,boxShadow:s.boxShadow,
   transition:s.transition,position:s.position,height:s.height,minHeight:s.minHeight}};
  const heading=button.closest('.compact-document-heading');
  const group=button.closest('[data-ui-reference-group="L01"]');
  const row=button.closest('tr');
  const sibling=button.closest('[data-ui-reference-part]')?.nextElementSibling;
  const buttonBox=box(button),outline=parseFloat(getComputedStyle(button).outlineWidth)||0;
  const outlineBox={left:buttonBox.left-outline-1,right:buttonBox.right+outline+1,
   top:buttonBox.top-outline-1,bottom:buttonBox.bottom+outline+1};
  // Conservative painted box for 8px-offset/16px-blur shadow plus halo.
  const shadowBox={left:buttonBox.left-17,right:buttonBox.right+17,
   top:buttonBox.top-13,bottom:buttonBox.bottom+27};
  let ancestors=[],node=button.parentElement;
  while(node){
   const s=getComputedStyle(node),r=node.getBoundingClientRect();
   const clipX=s.overflowX!=='visible',clipY=s.overflowY!=='visible';
   if(clipX||clipY||s.contain.includes('paint')||s.clipPath!=='none'){
    const margin=(s.overflowX==='clip'||s.overflowY==='clip')
      ?parseFloat(s.overflowClipMargin)||0:0;
    const rectangle={left:r.left+node.clientLeft-margin,
      right:r.left+node.clientLeft+node.clientWidth+margin,
      top:r.top+node.clientTop-margin,
      bottom:r.top+node.clientTop+node.clientHeight+margin};
    const fits=(q)=>({
     horizontal:!clipX||(q.left>=rectangle.left-1&&q.right<=rectangle.right+1),
     vertical:!clipY||(q.top>=rectangle.top-1&&q.bottom<=rectangle.bottom+1)
    });
    const border=fits(outlineBox),shadow=fits(shadowBox);
    ancestors.push({name:node.tagName.toLowerCase()+'.'+String(node.className).split(' ').join('.').slice(0,120),
     isHeading:node===heading,overflowX:s.overflowX,overflowY:s.overflowY,
     paintContain:s.contain,clipPath:s.clipPath,rect:box(node),scrollWidth:node.scrollWidth,
     clientWidth:node.clientWidth,clipRect:rectangle,
     outlineFits:border.horizontal&&border.vertical,shadowFits:shadow.horizontal&&shadow.vertical,
     outlineXY:border,shadowXY:shadow});
   }
   node=node.parentElement;
  }
  const doc=document.documentElement;
  return {button:box(button),buttonCss:css(button),outlineBox,shadowBox,heading:box(heading),
   headingCss:css(heading),group:box(group),row:box(row),
   nextRow:box(row?.nextElementSibling),sibling:box(sibling),
   focusVisible:button.matches(':focus-visible'),hover:button.matches(':hover'),
   active:document.activeElement===button,
   documentWidth:doc.scrollWidth,documentClient:doc.clientWidth,
   scrollX:window.scrollX,scrollY:window.scrollY,
   clips:ancestors};
 });
}
async function screenshot(page,rect,name){
 await page.screenshot({path:join(out,name+'.png'),fullPage:false});
 const pad=36;
 let x=Math.max(0,rect.x-pad),y=Math.max(0,rect.y-pad);
 let w=Math.min(page.viewportSize().width-x,rect.w+2*pad);
 let h=Math.min(page.viewportSize().height-y,rect.h+2*pad);
 if(w>0&&h>0)await page.screenshot({path:join(out,name+'-detail.png'),
  clip:{x,y,width:w,height:h}});
}
async function keyboardTabTo(page,target,label){
 await page.mouse.move(2,2);
 const info=await target.evaluate(button=>{
  const els=[...document.querySelectorAll(
   'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')]
   .filter(e=>{const s=getComputedStyle(e);return e.getClientRects().length>0&&
    s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[inert]');});
  const index=els.indexOf(button);
  if(index<=0)return {index,total:els.length};
  els[index-1].focus({preventScroll:true});
  return {index,total:els.length,previous:els[index-1].outerHTML.slice(0,150)};
 });
 assert(info.index>0,label+' target not reachable by Tab '+JSON.stringify(info));
 for(let n=0;n<6;n++){
  await page.keyboard.press('Tab');
  if(await target.evaluate(el=>document.activeElement===el))break;
 }
 assert(await target.evaluate(el=>document.activeElement===el),label+' Tab failed to focus target');
 assert(await target.evaluate(el=>el.matches(':focus-visible')),
  label+' genuine keyboard Tab did not create focus-visible');
 assert.equal(await target.evaluate(el=>el.matches(':hover')),false,
  label+' pointer still hovering during focus-visible');
}
function validateState(initial,state,label){
 assert(common(initial.heading,state.heading),label+' heading layout shift');
 assert(common(initial.row,state.row),label+' row layout shift');
 assert(common(initial.nextRow,state.nextRow),label+' next row displaced');
 assert.equal(initial.documentWidth,state.documentWidth,label+' document horizontal scroll changed');
 assert.equal(initial.heading.h,state.heading.h,label+' row height changed');
 assert.equal(state.buttonCss.background,initial.buttonCss.background,
  label+' member background changed');
 assert.equal(state.buttonCss.outlineWidth,'2px',label+' expected 2px outline');
 assert(state.buttonCss.boxShadow.includes('8px 16px'),label+' expected reference shadow');
 assert(Math.abs(state.button.y-(initial.button.y-3))<.7,
  label+' button lift must be 3px; before='+initial.button.y+' after='+state.button.y);
 // Regression: a 26px-high clip at the heading has NO paint room for
 // the lifted borderbox/outline. Inspect EVERY effective clip ancestor.
 const lostOutline=state.clips.filter(c=>!c.outlineFits);
 const lostShadow=state.clips.filter(c=>!c.shadowFits);
 if(mode==='after'){
  assert.equal(state.headingCss.overflowX,'visible',label+' horizontal heading clips');
  assert.equal(state.headingCss.overflowY,'visible',label+' vertical heading clips');
  assert.equal(lostOutline.length,0,label+' outline clipped '+JSON.stringify(lostOutline));
  assert.equal(lostShadow.length,0,label+' shadow clipped '+JSON.stringify(lostShadow));
 }
 return {lostOutline:lostOutline.map(c=>c.name),lostShadow:lostShadow.map(c=>c.name)};
}
async function run(){
 await ready();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({serviceWorkers:'block'});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 const external=[];
 await page.route(/https?:\/\/(?!127\.0\.0\.1)/,r=>{external.push(r.request().url());return r.abort();});
 for(const width of [1440,900,390]){
  for(const surface of ['list','popup'])for(const permission of ['edit','mixed']){
   await page.setViewportSize({width,height:width===390?844:900});
   await page.goto(origin+'/ui-20261106-picker-fixture.html?surface='+surface+'&mode='+permission);
   await page.locator('[data-ui-reference-group="L01"]').first().waitFor({timeout:12000});
   if(surface==='popup'){
    const toggle=page.getByRole('button',{name:'Chỉnh sửa nháp'});
    if(await toggle.count())await toggle.click();
   }
   for(const field of ['department','type']){
    const label=[width,surface,permission,field].join('-');
    const target=page.locator(targetSelector(field)).first();
    await target.waitFor({timeout:12000});
    // Long/narrow tables use THEIR existing horizontal scroll owner.
    await target.evaluate(el=>el.scrollIntoView({behavior:'instant',block:'center',inline:'center'}));
    await page.mouse.move(1,1);await page.waitForTimeout(230);
    const normal=await measurement(target);
    await screenshot(page,normal.heading,label+'-normal');
    await target.hover();await page.waitForTimeout(230);
    const hover=await measurement(target);
    const hoverLoss=validateState(normal,hover,label+' hover');
    await screenshot(page,hover.heading,label+'-hover');
    await keyboardTabTo(page,target,label);
    await page.waitForTimeout(230);
    const focus=await measurement(target);
    assert.equal(focus.focusVisible,true,label+' not focus-visible');
    assert.equal(focus.hover,false,label+' still hovered');
    const focusLoss=validateState(normal,focus,label+' Tab focus');
    await screenshot(page,focus.heading,label+'-keyboard-focus');
    cases.push({id:label,width,surface,permission,field,
     normal,hover,focus,hoverLoss,focusLoss});
    writeFileSync(join(out,label+'.json'),JSON.stringify(cases[cases.length-1],null,2));
    await page.keyboard.press('Escape');
    await page.mouse.move(1,1);
   }
  }
 }
 assert.equal(cases.length,24,'expected all 3 widths x 2 surfaces x 2 permissions x 2 fields');
 assert.equal(external.length,0,'unexpected external requests '+JSON.stringify(external));
 const clipped=cases.filter(c=>c.hoverLoss.lostOutline.length||c.hoverLoss.lostShadow.length||
   c.focusLoss.lostOutline.length||c.focusLoss.lostShadow.length).length;
 if(mode==='before')assert(clipped>0,'expected to reproduce F01 clipping on old tested source');
 else assert.equal(clipped,0,'F01 clipping still present');
 writeFileSync(join(out,'summary.json'),JSON.stringify({
  result:mode==='after'?'PASS':'EXPECTED_CLIPPING_REPRODUCED',mode,
  sourceSha:process.env.PICKER_CONTENT_F01_SOURCE_SHA??process.env.GITHUB_SHA??null,scenes:cases.length,clipped,external,cases},null,2));
 console.log('PICKER_PARITY_CONTENT_F01_'+(mode==='before'?'BEFORE_REPRODUCED':'AFTER_PASS')+
  ' scenes='+cases.length+' clipped='+clipped);
}
try{await run()}catch(error){
 writeFileSync(join(out,'failure.txt'),String(error?.stack??error)+'\n'+serverLog);
 console.error('PICKER_PARITY_CONTENT_F01_FAIL '+(error?.stack??error));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');server.stdout?.destroy();server.stderr?.destroy();
}
