/** L01 full real ItemList + ReportDetailGrid RAM-only visual/interaction regression.
 * Runs against unchanged ui-20261106-picker-fixture.html (NOT a CSS mock).
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const root=resolve('qa-results/picker-parity-content');
mkdirSync(root,{recursive:true});
const port=5199,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','preact','--host','127.0.0.1','--port',String(port),'--strictPort'],{cwd:resolve('.'),stdio:['ignore','pipe','pipe']});
let log='',browser;
for(const s of [server.stdout,server.stderr])s.on('data',b=>log=(log+String(b)).slice(-20000));
const results=[];
async function waitServer(){
 for(let i=0;i<120;i++){
  if(server.exitCode!==null)throw Error('Vite quit '+log);
  try{if((await fetch(origin+'/ui-20261106-picker-fixture.html')).ok)return}catch{}
  await delay(200);
 }throw Error('Vite unavailable '+log);
}
const probe=async page=>page.evaluate(()=>{
 const sty=e=>{if(!e)return null;const s=getComputedStyle(e),a=getComputedStyle(e,'::after'),b=e.getBoundingClientRect();return {
  x:b.x,y:b.y,w:b.width,h:b.height,bg:s.backgroundColor,color:s.color,border:s.borderColor,
  radius:s.borderRadius,padding:s.padding,fs:s.fontSize,fw:s.fontWeight,lh:s.lineHeight,
  shadow:s.boxShadow,outline:s.outlineColor,outlineWidth:s.outlineWidth,transform:s.transform,
  caret:{width:a.width,height:a.height,display:a.display,clip:a.clipPath,bg:a.backgroundColor}}};
 const group=document.querySelector('[data-ui-reference-group="L01"]');
 const heading=group?.querySelector('.compact-document-heading');
 const refs={};
 for(const field of ['department','type']){
  const wrapper=group?.querySelector('[data-ui-reference-part="'+field+'"]');
  const button=wrapper?.querySelector('button.cell-picker-trigger');
  refs[field]={wrapper:sty(wrapper),button:sty(button),editable:!!button,disabled:button?.disabled??null,
   expanded:button?.getAttribute('aria-expanded'),text:wrapper?.textContent?.trim()??''};
 }
 const l04=document.querySelector('[data-ui-reference-group="L04"] .compact-highlight-member');
 return {heading:sty(heading),mode:heading?.dataset.metadataMode,department:refs.department,type:refs.type,
  reference:sty(l04),popovers:document.querySelectorAll('.cell-picker-popover:popover-open').length,
  patches:document.querySelector('[data-qa="last-patch"]')?.textContent??'',
  pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
});
async function shot(page,name){
 const data=await probe(page);
 writeFileSync(join(root,name+'.json'),JSON.stringify(data,null,2));
 writeFileSync(join(root,name+'.png'),await page.screenshot({fullPage:false}));
 return data;
}
function approx(s,n,epsilon=1){return Math.abs(Number.parseFloat(s)-n)<=epsilon}
function check(p,mode,id){
 assert(p.heading,id+' missing L01');
 assert(p.reference,id+' missing L04 reference');
 const edit=mode==='edit',guest=mode==='guest';
 const n=[p.department,p.type].filter(f=>f.editable).length;
 assert.equal(n,edit?2:guest?0:1,id+' permission count');
 if(n>0)assert.equal(p.mode,'editable',id+' mixed editable group');
 else assert.equal(p.mode,'readonly',id+' readonly group');
 for(const f of [p.department,p.type]){
  if(f.editable){
   assert(!f.disabled,id+' disabled editable');
   assert(approx(f.button.fs,11,.3),id+' font size '+f.button.fs);
   assert(approx(f.button.fw,550,1),id+' font weight '+f.button.fw);
   assert(approx(f.button.radius,6,.6),id+' radius '+f.button.radius);
   assert(approx(f.button.h,26,5)||f.button.h>26,id+' height '+f.button.h);
   assert(approx(f.button.caret.width,5,.5)&&approx(f.button.caret.height,3,.5),id+' caret');
  }else {
   assert.equal(f.button,null,id+' fake readonly picker');
   assert(f.wrapper&&approx(f.wrapper.fs,13,.4),id+' readonly font');
  }
 }
 if(n===2||n===1){
  const a=p.department.wrapper,b=p.type.wrapper;
  if(a&&b)assert(Math.abs((a.y+a.h/2)-(b.y+b.h/2))<9,id+' metadata not same line');
 }
 if(n===0)assert(p.department.text||p.type.text,id+' missing readonly metadata');
}
async function main(){
 await waitServer();
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();
 const blocked=[];
 await page.route(/https?:\/\/(?!127\.0\.0\.1)/,route=>{blocked.push(route.request().url());return route.abort()});
 for(const width of [1440,900,390])for(const surface of ['list','popup'])for(const mode of ['edit','mixed','guest']){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto(origin+'/ui-20261106-picker-fixture.html?surface='+surface+'&mode='+mode);
  await page.locator('[data-ui-reference-group="L01"]').first().waitFor({timeout:12000});
  if(surface==='popup'&&mode!=='guest'){
   const toggle=page.getByRole('button',{name:'Chỉnh sửa nháp'});
   if(await toggle.count())await toggle.click();
  }
  const id=[width,surface,mode].join('-');
  const normal=await shot(page,id+'-normal');
  check(normal,mode,id);
  let states={normal};
  const key=mode==='mixed'?'department':'type';
  const target=page.locator('[data-ui-reference-group="L01"] [data-ui-reference-part="'+key+'"] button.cell-picker-trigger').first();
  if(mode!=='guest'){
   await target.scrollIntoViewIfNeeded();
   await target.hover();
   await page.waitForTimeout(220);
   const hover=await shot(page,id+'-hover');
   const before=normal[key].button,after=hover[key].button;
   assert.equal(after.bg,before.bg,id+' hover changed background');
   assert(after.transform!=='none',id+' hover missing lift');
   await target.focus();
   await page.waitForTimeout(220);
   const focus=await shot(page,id+'-focus');
   assert.equal(focus[key].button.bg,before.bg,id+' focus changed background');
   await target.click();
   await page.locator('.cell-picker-popover:popover-open').waitFor({timeout:10000});
   const opened=await shot(page,id+'-open');
   assert(opened.popovers>0,id+' popover not open');
   const popupRect=await page.locator('.cell-picker-popover:popover-open').boundingBox();
   assert(popupRect&&popupRect.x>=-1&&popupRect.x+popupRect.width<=width+1,
    id+' popover outside horizontal viewport '+JSON.stringify(popupRect));
   const options=page.locator('.cell-picker-popover:popover-open [role="option"]');
   assert(await options.count()>0,id+' no options');
   // Resize/scroll an already-confirmed-open picker, rather than attempting
   // a second open after changing fixture/navigation state.
   if(width===390&&surface==='list'&&mode==='edit'){
    await page.setViewportSize({width:420,height:740});
    await page.waitForTimeout(260);
    if(await page.locator('.cell-picker-popover:popover-open').count()){
     const rect=await page.locator('.cell-picker-popover:popover-open').boundingBox();
     assert(rect&&rect.x>=-1&&rect.x+rect.width<=421,
      id+' dynamic resize overflow '+JSON.stringify(rect));
    }
    await page.mouse.wheel(0,280);await page.waitForTimeout(260);
    if(await page.locator('.cell-picker-popover:popover-open').count()){
     const rect=await page.locator('.cell-picker-popover:popover-open').boundingBox();
     assert(rect&&rect.x>=-1&&rect.x+rect.width<=421,
      id+' dynamic scroll overflow '+JSON.stringify(rect));
    }
    await shot(page,id+'-resize-scroll');
    await page.setViewportSize({width:390,height:844});
   }

   if(await page.locator('.cell-picker-popover:popover-open').count()){
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.cell-picker-popover:popover-open').count(),0,id+' Escape');
   }
   await target.click();
   await page.locator('.cell-picker-popover:popover-open').waitFor();
   await page.mouse.click(2,2);
   assert.equal(await page.locator('.cell-picker-popover:popover-open').count(),0,id+' outside click');
   // The picker coordinator settles the outside-pointer dismissal asynchronously.
   await page.waitForTimeout(280);
   // Real option selection and RAM patch, not a synthetic change event.
   // Exercise this on one canonical admin List fixture before other views.
   if(width===1440&&surface==='list'&&mode==='edit'){
    await target.click();
    await page.locator('.cell-picker-popover:popover-open').waitFor();
    const available=page.locator('.cell-picker-popover:popover-open [role="option"]');
    let chosen=false;
    for(let i=0;i<await available.count();i++){
     const candidate=available.nth(i);
     if(await candidate.getAttribute('aria-selected')!=='true'&&(await candidate.innerText()).trim()){
      await candidate.click();chosen=true;break;
     }
    }
    assert(chosen,id+' no alternative option');
    await page.waitForFunction(()=>document.querySelector('[data-qa="last-patch"]')?.textContent?.includes('type'),{timeout:7000});
    await target.focus();
    await page.keyboard.press('Enter');
    await page.locator('.cell-picker-popover:popover-open').waitFor();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.cell-picker-popover:popover-open').count(),0,id+' keyboard Escape');
   }
   states={normal,hover,focus,opened};
  }
  results.push({width,surface,mode,states});
 }
 // Full synthetic App route, not merely the isolated component fixture.
 // Navigation is the real preview's two-tab shell; do not change the fixture.
 for(const width of [1440,900,390])for(const role of ['admin','guest']){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto(origin+'/compact-qa.html?full=1&preview-role='+role);
  await page.locator('[data-preview="pr95-l4-full"]').waitFor({timeout:12000});
  // Guest intentionally has no admin navigation; its initial page is List.
  if(role==='admin')await page.locator('[data-ui-reference-nav="items"]').click();
  await page.locator('.item-data-table [data-ui-reference-group="L01"]').first().waitFor({timeout:12000});
  const id='full-app-'+width+'-'+role;
  const measured=await shot(page,id+'-list');
  assert(measured.heading,id+' missing real L01');
  assert(measured.reference,id+' missing unchanged L04');
  results.push({width,role,surface:'full-app-list',states:{measured}});
  // Open the full App's REAL ReportDetailGrid through a report drill action.
  // Guest has no admin nav; guest popup is covered in RAM component fixture.
  if(role==='admin'){
   await page.locator('[data-ui-reference-nav="reports"]').click();
   const drill=page.locator('.report-table button.count-drill').first();
   await drill.waitFor({timeout:10000});
   await drill.click();
   await page.locator('.report-detail-grid [data-ui-reference-group="L01"]').first().waitFor({timeout:12000});
   const popup=await shot(page,id+'-popup');
   // Report drill may contain a subset of columns without L04; L04 was
   // measured unchanged in this same full-App List before opening the popup.
   assert(popup.heading,id+' full-App popup missing L01');
   results.push({width,role,surface:'full-app-popup',states:{popup}});
  }
 }
 // Business palette and per-member highlight on actual compact synthetic App.
 for(const width of [1440,900,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto(origin+'/compact-qa.html?highlight=1&edit=1');
  const decorated=page.locator('[data-ui-reference-group="L01"] [data-ui-reference-part="department"][data-highlighted="true"]').first();
  await decorated.waitFor({timeout:12000});
  const highlighted=decorated.locator('button.cell-picker-trigger');
  const initialBg=await highlighted.evaluate(el=>getComputedStyle(el).backgroundColor);
  await highlighted.hover();await page.waitForTimeout(220);
  const hoverBg=await highlighted.evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.equal(hoverBg,initialBg,'custom highlight background changed on hover '+width);
  await highlighted.focus();await page.waitForTimeout(220);
  assert.equal(await highlighted.evaluate(el=>getComputedStyle(el).backgroundColor),initialBg,
   'custom highlight background changed on focus '+width);
  const visual=await shot(page,'highlight-'+width);
  results.push({width,surface:'highlight',states:{visual,initialBg,hoverBg}});
  await page.goto(origin+'/compact-qa.html?r05-palette=1&edit=1');
  await page.locator('[data-ui-reference-group="L01"]').first().waitFor({timeout:12000});
  const palette=await shot(page,'palette-'+width);
  assert(palette.heading,'palette variant lost document metadata '+width);
  results.push({width,surface:'custom-status-palette',states:{palette}});
 }
 // A long personnel fixture also keeps L01 metadata aligned at phone size.
 for(const width of [1440,900,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto(origin+'/ui-20261106-picker-fixture.html?surface=list&mode=edit&long=1');
  await page.locator('[data-ui-reference-group="L01"]').first().waitFor();
  const long=await shot(page,'long-label-fixture-'+width);
  check(long,'edit','long-label-fixture-'+width);
  results.push({width,surface:'long-label-fixture',states:{long}});
 }
 // Reduced motion / print: affordance cannot lift or cast a drop shadow.
 await page.setViewportSize({width:900,height:900});
 await page.goto(origin+'/ui-20261106-picker-fixture.html?surface=list&mode=edit');
 const motion=page.locator('[data-ui-reference-group="L01"] [data-ui-reference-part="type"] button.cell-picker-trigger').first();
 await page.emulateMedia({reducedMotion:'reduce'});
 await motion.hover();await page.waitForTimeout(220);
 const reduced=await shot(page,'reduced-motion');
 assert.equal(reduced.type.button.transform,'none','reduced-motion lifted editable picker');
 await page.emulateMedia({media:'print',reducedMotion:'no-preference'});
 await motion.hover();await page.waitForTimeout(220);
 const printed=await shot(page,'print');
 assert.equal(printed.type.button.transform,'none','print lifted picker');
 assert.equal(printed.type.button.shadow,'none','print left shadow');
 await page.emulateMedia({media:'screen',reducedMotion:'no-preference'});
 results.push({surface:'accessibility-media',states:{reduced,printed}});
 assert.equal(blocked.filter(x=>/firebaseio|firebasedatabase|sheets.googleapis/i.test(x)).length,0,'Production traffic');
 writeFileSync(join(root,'summary.json'),JSON.stringify({result:'PASS',scenarios:results.length,results,blocked},null,2));
 console.log('PICKER_PARITY_CONTENT_BROWSER_PASS scenarios='+results.length);
}
try{await main()}catch(e){
 writeFileSync(join(root,'failure.txt'),String(e?.stack??e)+'\n'+log);
 console.error('PICKER_PARITY_CONTENT_BROWSER_FAIL '+(e?.stack??e));
 process.exitCode=1;
}finally{await browser?.close().catch(()=>{});server.kill('SIGTERM');server.stdout?.destroy();server.stderr?.destroy()}
