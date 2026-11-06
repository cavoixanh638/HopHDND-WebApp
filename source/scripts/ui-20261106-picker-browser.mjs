/**
 * PICKER real-Chromium regression. Run in source/ after npm ci and
 * npm ci --prefix cell-edit-service:
 *   node scripts/ui-20261106-picker-browser.mjs
 * Same URL, fixture, font, viewport and selectors for
 * PICKER_VARIANT=reference | baseline | after.
 * Uses local Vite and Playwright Chromium only; no Firebase/Sheets.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const variant=process.env.PICKER_VARIANT??'after';
const root=resolve(process.env.PICKER_ARTIFACT_DIR??'qa-results/ui-20261106-picker/'+variant);
mkdirSync(root,{recursive:true});
const port=Number(process.env.PICKER_PORT||'5196');
const origin='http://127.0.0.1:'+port;
// Launch Vite directly: killing the npm wrapper can leave Vite alive with
// inherited stdout/stderr pipes, preventing CI from ending after browser PASS.
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','preact',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{
 cwd:resolve('.'),env:{...process.env,BROWSER:'none'},stdio:['ignore','pipe','pipe']});
let serverLog='';
for(const stream of [server.stdout,server.stderr])
 stream.on('data',buf=>{serverLog+=String(buf);if(serverLog.length>16000)serverLog=serverLog.slice(-16000);});
let browser;
const results=[];
const fieldKeys=['ubndLeader','vpLeader','room','specialist'];
const inputFields=['department','type','partyLevel','progressParty','progressBuild','progressCouncil'];
async function ready(){
 for(let i=0;i<120;i++){
  if(server.exitCode!==null)throw Error('Vite exited '+server.exitCode+' '+serverLog);
  try{const r=await fetch(origin+'/ui-20261106-picker-fixture.html');if(r.ok)return;}catch{}
  await delay(175);
 }throw Error('Vite did not become ready '+serverLog);
}
// The reference SHA predates data-ui-reference-group/part attributes.
// These human-visible tags are stable in all three real versions (not CSS
// nth-child hooks): UBND, VP, Phòng and CV. Reuse the same fixture/source.
const fieldTags={ubndLeader:'UBND',vpLeader:'VP',room:'Phòng',specialist:'CV'};
const getProbe=async page=>page.evaluate(({fields,extra,fieldTags})=>{
 const wrapperFor=(key)=>{
  const modern=document.querySelector(
   '[data-ui-reference-group="L04"] [data-ui-reference-part="'+key+'"]');
  if(modern)return modern;
  const tag=fieldTags[key];
  if(!tag)return null;
  const row=[...document.querySelectorAll('.compact-pair-lines > div')].find(el=>
   el.querySelector(':scope > .compact-pair-tag')?.textContent?.trim()===tag);
  return row?.querySelector('.compact-highlight-member')??null;
 };
 const find=(key)=>wrapperFor(key)?.querySelector('button.cell-picker-trigger')??null;
 const rc=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height};};
 const st=e=>{const s=getComputedStyle(e),a=getComputedStyle(e,'::after'),p=getComputedStyle(e,'::before');
 return {rect:rc(e),background:s.backgroundColor,border:s.borderColor,borderWidth:s.borderWidth,
  borderRadius:s.borderRadius,padding:s.padding,font:s.font,fontWeight:s.fontWeight,
  fontSize:s.fontSize,lineHeight:s.lineHeight,color:s.color,display:s.display,
  boxShadow:s.boxShadow,transform:s.transform,caret:{content:a.content,display:a.display,
  width:a.width,height:a.height,color:a.color,background:a.backgroundColor,
  clip:a.clipPath,border:a.borderRight,margin:a.margin,transform:a.transform},
  rail:{content:p.content,display:p.display,background:p.backgroundColor}}};
 const out={fields:{},other:{},totalPickers:document.querySelectorAll(
  '.item-data-table tbody td button.cell-picker-trigger, .report-detail-grid tbody td button.cell-picker-trigger').length,
  disabled:document.querySelector('[data-qa="disabled-case"] button.cell-picker-trigger')?.disabled,
  patch:document.querySelector('[data-qa="last-patch"]')?.textContent};
 for(const f of fields){const b=find(f),wrapper=wrapperFor(f);
  out.fields[f]={editable:!!b,text:wrapper?.textContent?.trim(),wrapper:wrapper?st(wrapper):null,
   trigger:b?st(b):null,expanded:b?.getAttribute('aria-expanded'),disabled:b?.disabled};
 }
 for(const f of extra){
  const wrapper=document.querySelector('[data-ui-reference-part="'+f+'"]');
  const b=wrapper?.querySelector('button.cell-picker-trigger');
  out.other[f]={editable:!!b,trigger:b?st(b):null,wrapper:wrapper?st(wrapper):null};
 }
 return out;
},{fields:fieldKeys,extra:inputFields,fieldTags});
const cssSize=s=>Number.parseFloat(s??'0');
async function assertCaret(probe,scope){
 if(variant!=='after')return;
 for(const [name,entry] of Object.entries({...probe.fields,...probe.other})){
  if(!entry.editable)continue;
  const t=entry.trigger,a=t.caret;
  assert.equal(a.content,'""',scope+' caret content '+name);
  assert.notEqual(a.display,'none',scope+' caret displayed '+name);
  assert(cssSize(a.width)>=5&&cssSize(a.width)<=6.1,scope+' caret width '+name);
  assert(cssSize(a.height)>=3&&cssSize(a.height)<=4.1,scope+' caret height '+name);
  assert(a.clip.includes('polygon'),scope+' caret is a filled triangle '+name);
  assert(a.background!=='rgba(0, 0, 0, 0)',scope+' caret invisible '+name);
  assert(['none','normal'].includes(t.rail.content),scope+' rail remains '+name);
 }
}
const snapshot=async(page,id)=>{
 const png=await page.screenshot({fullPage:false});
 assert(png.length>2500,'Empty Chromium screenshot '+id);
 writeFileSync(join(root,id+'.png'),png);
 const probe=await getProbe(page);writeFileSync(join(root,id+'.json'),JSON.stringify(probe,null,2));
 return probe;
};
async function openPopupEditor(page){
 const toggle=page.getByRole('button',{name:'Chỉnh sửa nháp'});
 await toggle.waitFor({timeout:12000});await toggle.click();
 await page.waitForTimeout(130);
}
async function scenario(page,{surface,mode,width,height=900,long=false}){
 await page.setViewportSize({width,height});
 const url=origin+'/ui-20261106-picker-fixture.html?'+new URLSearchParams({
  surface,mode,long:long?'1':'0'}).toString();
 await page.goto(url,{waitUntil:'networkidle'});
 await page.locator('[data-qa="ui-20261106-picker-fixture"]').waitFor();
 if(surface==='popup'&&mode!=='guest')await openPopupEditor(page);
 const id=[surface,mode,width,long?'long':'short'].join('-');
 const rootSelector=surface==='popup'?'.report-detail-grid':'.item-data-table';
 await page.locator(rootSelector).waitFor();
 // Move cursor away from the previous scenario's target and let UI
 // transitions settle before a neutral-state skin comparison.
 await page.mouse.move(0,0);
 await page.waitForTimeout(400);
 const p=await snapshot(page,id+'-normal');
 const editable=mode==='edit';
 if(editable)for(const k of fieldKeys)
  assert(p.fields[k].editable,id+' field missing '+k);
 if(mode==='guest')for(const k of fieldKeys)
  assert(!p.fields[k].editable,id+' guest has fake picker '+k);
 assert.equal(p.disabled,true,id+' missing disabled fixture');
 await assertCaret(p,id);
 results.push({id,mode,surface,width,height,long,normal:p});
 if(mode==='guest')return;
 let first=fieldKeys.find(k=>p.fields[k].editable);
 assert(first,id+' no permitted personnel field');
 const tag=fieldTags[first];
 const trigger=page.locator('.compact-pair-lines > div')
  .filter({has:page.locator('.compact-pair-tag',{hasText:tag})})
  .locator('.compact-highlight-member button.cell-picker-trigger').first();
 await trigger.scrollIntoViewIfNeeded();
 await trigger.hover({force:true});
 await page.waitForTimeout(400);
 const hover=await snapshot(page,id+'-hover');
 await trigger.focus();
 await page.waitForTimeout(400);
 const focus=await snapshot(page,id+'-focus');
 await trigger.click({force:true});
 await page.locator('.cell-picker-popover:popover-open').waitFor({timeout:10000});
 await page.waitForTimeout(400);
 const expanded=await snapshot(page,id+'-expanded');
 assert.equal(expanded.fields[first].expanded,'true',id+' not expanded');
 const pop=page.locator('.cell-picker-popover:popover-open');
 assert(await pop.getByRole('option').count()>=2,id+' missing actual choices');
 // Keyboard Arrow/Enter selection, followed by RAM-only patch witness.
 await page.keyboard.press('ArrowDown');
 await page.keyboard.press('Enter');
 await page.waitForTimeout(100);
 const afterKeyboard=await getProbe(page);
 assert(!await page.locator('.cell-picker-popover:popover-open').count(),id+' Enter did not close');
 // A real click/Enter selection must reach the in-memory draft writer,
 // not just toggle aria-expanded. It may be unchanged if the first option
 // is the current value, so force a distinct option if necessary.
 if(!afterKeyboard.patch){
   await trigger.click({force:true});
   await page.locator('.cell-picker-popover:popover-open').waitFor();
   const pop=page.locator('.cell-picker-popover:popover-open');
   const initial=await trigger.innerText();
   const choices=pop.getByRole('option');
   let picked=false;
   for(let i=0;i<await choices.count();i++){
     const text=(await choices.nth(i).innerText()).trim();
     if(text&&text!==initial&&text!=='—'){
       await choices.nth(i).click();
       picked=true;
       break;
     }
   }
   assert(picked,id+' no distinct synthetic choice');
   await page.waitForTimeout(100);
 }
 const saved=await getProbe(page);
 assert(saved.patch&&saved.patch.includes(first),id+' choice did not update RAM draft: '+saved.patch);
 // Focus and Escape leave the underlying persisted value unchanged.
 await trigger.focus();await page.keyboard.press('Enter');
 await page.locator('.cell-picker-popover:popover-open').waitFor();
 await page.keyboard.press('Escape');
 await page.waitForTimeout(100);
 assert.equal(await trigger.getAttribute('aria-expanded'),'false',id+' Escape failed');
 results.at(-1).states={hover,focus,expanded,afterKeyboard,saved};
}
async function run(){
 await ready();
 browser=await chromium.launch({headless:true,chromiumSandbox:false,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 let external=[];
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname!=='127.0.0.1'&&u.hostname!=='localhost'){external.push(u.href);return route.abort();}
  return route.continue();
 });
 const page=await context.newPage();
 for(const width of [1440,900,390]){
  for(const surface of ['list','popup']){
   for(const mode of ['edit','guest','mixed'])
    await scenario(page,{surface,mode,width,height:width===390?844:900});
   await scenario(page,{surface,mode:'edit',width,height:width===390?844:900,long:true});
  }
 }
 assert.equal(external.length,0,'External network request(s): '+external.join(','));
 writeFileSync(join(root,'summary.json'),JSON.stringify({result:'PASS',variant,external,results},null,2));
 console.log('UI_20261106_PICKER_BROWSER_PASS '+variant+' scenarios='+results.length);
}
try{await run()}catch(error){
 writeFileSync(join(root,'failure.txt'),String(error?.stack??error)+'\n'+serverLog);
 console.error('UI_20261106_PICKER_BROWSER_FAIL '+String(error?.stack??error));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');
 server.stdout?.destroy();
 server.stderr?.destroy();
}
