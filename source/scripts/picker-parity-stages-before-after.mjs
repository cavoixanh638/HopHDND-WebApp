/**
 * Same F02 fixture, Chromium version, viewport and selectors on:
 *  - detached e095205c application source, unchanged application components/CSS
 *  - current STAGES source.
 * Worktree only receives this test harness/HTML (never modified source/CSS).
 */
import {spawn,execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const variant=process.env.STAGES_VARIANT;
assert(['before','after'].includes(variant),'STAGES_VARIANT before|after required');
const root=resolve(process.env.STAGES_ARTIFACT_DIR??'qa-results/picker-parity-stages');
const out=join(root,'comparison',variant);
mkdirSync(out,{recursive:true});
const port=Number(process.env.STAGES_COMPARISON_PORT??'5208');
const origin='http://127.0.0.1:'+port;
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','preact',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{
 cwd:resolve('.'),env:{...process.env,BROWSER:'none'},stdio:['ignore','pipe','pipe']});
let viteLog='',browser,network=[],cases=[];
for(const s of [vite.stdout,vite.stderr])
 s.on('data',b=>viteLog=(viteLog+String(b)).slice(-16000));
async function ready(){
 for(let i=0;i<160;i++){
  if(vite.exitCode!==null)throw Error('Vite exited '+vite.exitCode+' '+viteLog);
  try{if((await fetch(origin+'/picker-parity-stages-review-fixture.html')).ok)return;}catch{}
  await delay(150);
 }
 throw Error('Vite unavailable '+viteLog);
}
const rootSel=surface=>surface==='popup'?'.report-detail-grid':'.item-data-table';
const measure=(page,surface,mode)=>page.evaluate(({root,mode})=>{
 const selector=root+' [data-ui-reference-record-id="demo-0001"]';
 const stage=document.querySelector(selector+' .compact-stages[data-rev2="true"]');
 if(!stage)throw Error('Missing real L03 from same fixture: '+selector);
 const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();
  return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
 const style=e=>{if(!e)return null;const s=getComputedStyle(e),a=getComputedStyle(e,'::after'),b=getComputedStyle(e,'::before');
  return {background:s.backgroundColor,color:s.color,font:s.font,
   fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,
   minHeight:s.minHeight,padding:s.padding,gap:s.gap,border:s.border,
   radius:s.borderRadius,boxShadow:s.boxShadow,outline:s.outline,transform:s.transform,
   after:{content:a.content,width:a.width,height:a.height,clip:a.clipPath,
    display:a.display},before:{content:b.content,display:b.display}};
 };
 const rows=[...stage.querySelectorAll(':scope > .compact-stage-row')].map(row=>{
  const status=row.querySelector('.compact-stage-state');
  const label=row.querySelector('.compact-stage-label');
  const level=row.querySelector('[data-level-editor="true"]');
  const btn=status?.querySelector('button.cell-picker-trigger');
  const lvl=level?.querySelector('button.cell-picker-trigger');
  return {field:row.dataset.stageField,text:status?.textContent?.trim(),
   labelText:label?.textContent?.trim(),editable:status?.dataset.editable==='true',
   row:rect(row),label:rect(label),status:rect(status),level:rect(level),
   button:rect(btn),buttonStyle:style(btn),statusStyle:style(status),
   levelButton:rect(lvl),levelStyle:style(lvl)};
 });
 const reference=document.querySelector(selector+' [data-ui-reference-group="L04"] button.cell-picker-trigger')||
  document.querySelector(selector+' .compact-pair-lines .compact-highlight-member button.cell-picker-trigger');
 return {surface:root,mode,layout:stage.dataset.levelLayout,
  stage:rect(stage),computedColumns:getComputedStyle(stage).gridTemplateColumns,
  rowGap:getComputedStyle(stage).rowGap,columnGap:getComputedStyle(stage).columnGap,
  rows,reference:rect(reference),referenceStyle:style(reference)};
},{root:rootSel(surface),mode});
const snap=async(page,key)=>{
 const path=join(out,key+'.png');
 const bytes=await page.screenshot();
 assert(bytes.length>1500,'empty before/after screenshot '+key);
 writeFileSync(path,bytes);
 return {path,bytes:bytes.length};
};
try{
 await ready();
 browser=await chromium.launch({headless:true,chromiumSandbox:false,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const ctx=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 await ctx.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(!['127.0.0.1','localhost'].includes(u.hostname)){
   network.push(u.href);return route.abort();
  }
  return route.continue();
 });
 const page=await ctx.newPage();
 for(const width of [1440,900,390])
  for(const surface of ['list','popup'])
   for(const mode of ['all','guest']){
    await page.setViewportSize({width,height:width===390?844:900});
    await page.goto(origin+'/picker-parity-stages-review-fixture.html?'+
     new URLSearchParams({surface,mode,scenario:'comparison'}),{waitUntil:'networkidle'});
    const first=page.locator(rootSel(surface)+' [data-ui-reference-record-id="demo-0001"] .compact-stages[data-rev2="true"]');
    await first.waitFor();
    if(surface==='popup'&&mode==='all'){
     await page.getByRole('button',{name:'Chỉnh sửa nháp'}).click();
     await page.waitForTimeout(100);
    }
    await first.scrollIntoViewIfNeeded();
    await page.mouse.move(0,0);
    await page.waitForTimeout(180);
    const id=width+'-'+surface+'-'+(mode==='all'?'3track':'2track');
    const normal=await measure(page,surface,mode);
    assert(normal.rows.length===3,'No three L03 stages '+variant+'/'+id);
    assert.equal(normal.layout,mode==='all'?'editable':'readonly',
     'Wrong 2/3 mode '+variant+'/'+id);
    const screenshots={normal:await snap(page,id+'-normal')};
    const evidence={id,viewport:width,surface,mode,normal,screenshots};
    if(mode==='all'){
     const btn=first.locator('.compact-stage-state[data-editable="true"] button.cell-picker-trigger').first();
     await btn.hover();await page.waitForTimeout(225);
     evidence.hover=await measure(page,surface,mode);
     screenshots.hover=await snap(page,id+'-hover');
     await btn.focus();
     evidence.focus=await measure(page,surface,mode);
     screenshots.focus=await snap(page,id+'-focus');
     await btn.click();
     await page.locator('.cell-picker-popover:popover-open').waitFor();
     evidence.open=await measure(page,surface,mode);
     screenshots.open=await snap(page,id+'-open');
     await page.keyboard.press('Escape');
    }
    cases.push(evidence);
   }
 assert.deepEqual(network,[],'External network in baseline comparison');
 const result={variant,codeSHA:sha,source:variant==='before'?'detached baseline application':'current STAGES application',
  fixture:'picker-parity-stages-review-fixture.tsx (same bytes both sides)',
  realChromium:browser.version(),result:'PASS',
  conditions:'List/popup x 1440/900/390 x 2/3 tracks',cases,network};
 writeFileSync(join(out,'measurements.json'),JSON.stringify(result,null,2));
 console.log('PICKER_PARITY_STAGES_COMPARISON_'+variant.toUpperCase()+'_PASS cases='+cases.length+' sha='+sha);
}catch(e){
 writeFileSync(join(out,'failure.txt'),String(e?.stack??e)+'\n'+viteLog);
 console.error('PICKER_PARITY_STAGES_COMPARISON_'+variant.toUpperCase()+'_FAIL '+String(e?.stack??e));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 vite.kill('SIGTERM');vite.stdout?.destroy();vite.stderr?.destroy();
}
