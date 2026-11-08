/** STAGES real-browser parity on REAL ItemList/ReportDetailGrid (RAM fixture).
 * Requires npm ci, npm ci --prefix cell-edit-service, playwright chromium.
 * The source fixture is shared with the prior picker acceptance, not an
 * HTML/CSS imitation. No production URL or writes are permitted.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const out=resolve('qa-results/picker-parity-stages');
mkdirSync(out,{recursive:true});
const port=5199,base='http://127.0.0.1:'+port;
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','preact',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{
 cwd:resolve('.'),env:{...process.env,BROWSER:'none'},stdio:['ignore','pipe','pipe']});
let serverLog='',browser,results=[],external=[];
for(const s of [vite.stdout,vite.stderr])s.on('data',b=>serverLog=(serverLog+String(b)).slice(-16000));
async function ready(){
 for(let i=0;i<120;i++){if(vite.exitCode!==null)throw Error('Vite exit '+vite.exitCode+' '+serverLog);
  try{if((await fetch(base+'/ui-20261106-picker-fixture.html')).ok)return;}catch{}
  await delay(175);
 }throw Error('Vite not ready '+serverLog);
}
const near=(a,b,t=1)=>Math.abs(a-b)<=t;
const n=s=>Number.parseFloat(s||'0');
const probe=async page=>page.evaluate(()=>{
 const tables=['.item-data-table','.report-detail-grid'];
 const table=tables.find(t=>document.querySelector(t+' .compact-stages[data-rev2="true"]'));
 const stage=document.querySelector(table+' .compact-stages[data-rev2="true"]');
 if(!stage)throw Error('Missing mounted L03');
 const rc=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};};
 const cs=e=>{const s=getComputedStyle(e),a=getComputedStyle(e,'::after'),b=getComputedStyle(e,'::before');
 return {display:s.display,width:s.width,minHeight:s.minHeight,height:s.height,padding:s.padding,
  border:s.borderWidth,borderColor:s.borderColor,borderRadius:s.borderRadius,
  outlineColor:s.outlineColor,justifyContent:s.justifyContent,textAlign:s.textAlign,
  color:s.color,background:s.backgroundColor,
  fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,gap:s.gap,
  alignItems:s.alignItems,transform:s.transform,
  translateY:s.transform==='none'?0:new DOMMatrixReadOnly(s.transform).m42,
  transition:s.transition,
  boxShadow:s.boxShadow,outline:s.outlineStyle,overflowX:s.overflowX,
  after:{content:a.content,width:a.width,height:a.height,display:a.display,clip:a.clipPath,
   gridColumn:a.gridColumn,background:a.backgroundColor},before:{content:b.content,display:b.display}};};
 const rows=[...stage.querySelectorAll(':scope > .compact-stage-row')].map(r=>{
  const label=r.querySelector('.compact-stage-label'),status=r.querySelector('.compact-stage-state');
  const level=r.querySelector('.compact-stage-level[data-level-editor="true"]');
  const button=status?.querySelector('button.cell-picker-trigger'),levelButton=level?.querySelector('button.cell-picker-trigger');
  return {field:r.dataset.stageField,rect:rc(r),rowStyle:cs(r),label:rc(label),status:rc(status),
   level:rc(level),button:rc(button),levelButton:rc(levelButton),
   editable:status?.dataset.editable==='true',
   labelStyle:label?cs(label):null,statusStyle:status?cs(status):null,
   buttonStyle:button?cs(button):null,levelStyle:levelButton?cs(levelButton):null,
   buttonExpanded:button?.getAttribute('aria-expanded'),
   statusText:status?.textContent?.trim().slice(0,80)};
 });
 const ref=document.querySelector(table+' [data-ui-reference-group="L04"] button.cell-picker-trigger');
 const rootStyle=getComputedStyle(stage);
 return {table,mode:stage.dataset.levelLayout,rect:rc(stage),grid:rootStyle.gridTemplateColumns,
  columnGap:rootStyle.columnGap,rowGap:rootStyle.rowGap,
  scrollWidth:stage.scrollWidth,clientWidth:stage.clientWidth,overflowX:rootStyle.overflowX,
  rows,reference:ref?cs(ref):null,widthInputs:document.querySelectorAll('#admin-l03-width-editor input').length,
  bodyOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth};
});
function check(p,context){
 assert.equal(p.rows.length,3,context+' stage count');
 assert.equal(p.rowGap,'5px',context+' row gap');
 assert.equal(p.columnGap,'8px',context+' column gap');
 const rails=p.grid.trim().split(/\s+/).map(n);
 assert.equal(rails.length,p.mode==='editable'?3:2,context+' rails '+p.grid);
 assert(p.rows.every(x=>x.label&&x.status),context+' missing label/status');
 const statuses=p.rows.map(x=>x.status);
 assert(statuses.every(s=>near(s.x,statuses[0].x)&&near(s.w,statuses[0].w)),context+' mixed width or x');
 assert(statuses.every(s=>near(s.w,rails.at(-1))),context+' status width not rail');
 assert(p.rows.every(x=>x.labelStyle.alignItems==='center'),context+' label center');
 for(const row of p.rows){
  if(!row.editable){
   assert.equal(row.button,null,context+' forbidden fake picker '+row.field);
   assert.equal(n(row.statusStyle.fontSize),13,context+' readonly size '+row.field);
   assert.equal(n(row.statusStyle.fontWeight),400,context+' readonly weight '+row.field);
   assert.equal(row.statusStyle.transform,'none',context+' readonly lifted '+row.field);
   assert.equal(row.statusStyle.boxShadow,'none',context+' readonly shadow '+row.field);
   assert.equal(row.statusStyle.justifyContent,'center',context+' readonly wrapper not centered '+row.field);
   assert.equal(row.statusStyle.textAlign,'center',context+' readonly text not centered '+row.field);
   assert.notEqual(row.statusStyle.background,'rgba(0, 0, 0, 0)',context+' readonly lost member tint '+row.field);
  }else{
   assert(row.button&&row.buttonStyle,context+' missing picker '+row.field);
   const s=row.buttonStyle;
   assert.equal(n(s.minHeight),26,context+' trigger height '+row.field);
   assert.equal(n(s.fontSize),11,context+' font '+row.field);
   assert.equal(n(s.fontWeight),550,context+' weight '+row.field);
   assert.equal(n(s.borderRadius),6,context+' radius '+row.field);
   assert.equal(s.padding,'4px',context+' compact L03 padding '+s.padding);
   assert.equal(s.gap,'3px',context+' L03 value/caret gap '+s.gap);
   assert.equal(s.after.width,'5px',context+' caret width '+row.field);
   assert.equal(s.after.height,'3px',context+' caret height '+row.field);
   assert(s.after.clip.includes('polygon'),context+' caret '+row.field);
   assert.equal(s.before.display,'none',context+' old rail '+row.field);
   assert(near(row.button.w,row.status.w),context+' button must equal rail '+row.field);
  }
 }
 if(p.mode==='editable'){
  const first=p.rows[0];
  assert(first.levelButton&&first.levelStyle,context+' missing level picker');
  assert.equal(n(first.levelStyle.minHeight),26,context+' level height');
  assert.equal(n(first.levelStyle.fontSize),11,context+' level font');
  assert.equal(first.levelStyle.padding,'4px',context+' level padding');
  assert.equal(first.levelStyle.gap,'3px',context+' level caret gap');
  assert(near(first.levelButton.w,first.level.w),context+' level track fill');
 }else assert(p.rows.every(r=>r.levelButton===null),context+' readonly level fake picker');
}
async function screenshot(page,key){const path=join(out,key+'.png');writeFileSync(path,await page.screenshot());return path;}
async function scenario(page,{surface,mode,width,long=false}){
 await page.setViewportSize({width,height:width===390?844:900});
 await page.goto(base+'/ui-20261106-picker-fixture.html?'+new URLSearchParams({
  surface,mode,long:long?'1':'0'}),{waitUntil:'networkidle'});
 const root=surface==='popup'?'.report-detail-grid':'.item-data-table';
 await page.locator(root+' .compact-stages[data-rev2="true"]').first().waitFor();
 if(surface==='popup'&&mode!=='guest'){
  await page.getByRole('button',{name:'Chỉnh sửa nháp'}).click();
  await page.waitForTimeout(100);
 }
 await page.mouse.move(0,0);
 await page.waitForTimeout(250);
 const name=[surface,mode,width,long?'long':'short'].join('-');
 const initial=await probe(page);
 check(initial,name);
 if(mode==='edit')assert.equal(initial.mode,'editable',name+' expected three tracks');
 if(mode==='guest')assert.equal(initial.mode,'readonly',name+' expected two tracks');
 if(mode==='mixed')assert(initial.rows.some(r=>r.editable)&&initial.rows.some(r=>!r.editable),
  name+' missing mixed rights');
 await screenshot(page,name);
 const rec={name,initial,states:{}};
 results.push(rec);
 if(mode==='guest')return;
 const target=page.locator(root+' .compact-stages[data-rev2="true"] .compact-stage-state[data-editable="true"] button.cell-picker-trigger').first();
 await target.scrollIntoViewIfNeeded();
 await page.mouse.move(0,0);
 await page.waitForTimeout(230);
 const beforeHover=await probe(page);
 const beforeActive=beforeHover.rows.find(r=>r.editable);
 assert(beforeActive?.button&&beforeActive?.buttonStyle,name+' missing normal button');
 assert(near(beforeActive.buttonStyle.translateY,0,.15),name+' button lifted before hover');
 await target.hover();
 await page.waitForTimeout(250);
 let now=await probe(page);
 const active=now.rows.find(r=>r.editable);
 assert(active?.button&&active?.buttonStyle,name+' hover button disappeared');
 // A non-identity matrix alone is NOT proof of 3px movement. Verify actual
 // button geometry and computed CSS, while the row and wrapper remain fixed.
 const deltaY=active.button.y-beforeActive.button.y;
 assert(near(active.buttonStyle.translateY,-3,.15),
   name+' hover CSS lift != -3px: '+active.buttonStyle.transform);
 assert(near(deltaY,-3,.35),name+' hover painted lift != -3px: '+deltaY);
 assert(near(active.rect.y,beforeActive.rect.y,.35),
   name+' hover moved the stage row instead of just its button');
 assert(near(active.status.y,beforeActive.status.y,.35),
   name+' hover moved the colored status wrapper');
 assert(near(active.button.w,beforeActive.button.w,.35),
   name+' hover changed saved status track width');
 assert.equal(active.rowStyle.outline,'none',
   name+' hover outlined the stage row, not the button');
 assert.notEqual(active.buttonStyle.boxShadow,'none',
   name+' hover missing individual button shadow');
 assert(near(n(active.buttonStyle.border),n(beforeActive.buttonStyle.border),.01),
   name+' hover changed border thickness');
 assert(near(n(active.buttonStyle.border),1,.01),
   name+' status border must remain 1px');
 assert.equal(active.buttonStyle.borderColor,active.buttonStyle.color,
   name+' hover border not matched to own text');
 assert.equal(active.buttonStyle.outlineColor,active.buttonStyle.color,
   name+' hover outline not matched to own text');
 assert(active.buttonStyle.outline==='solid'||active.buttonStyle.outline.includes('solid'),name+' hover missing outline');
 assert.equal(active.buttonStyle.background,initial.rows.find(r=>r.editable).buttonStyle.background,
  name+' hover changed business fill');
 rec.states.hover={style:active.buttonStyle,deltaY,button:active.button,
  row:active.rect,status:active.status,before:beforeActive.button};
 await screenshot(page,name+'-hover');
 await target.focus();
 await page.waitForTimeout(220);
 now=await probe(page);rec.states.focus=now.rows.find(r=>r.editable).buttonStyle;
 await target.click();
 await page.locator('.cell-picker-popover:popover-open').waitFor();
 now=await probe(page);rec.states.open=now.rows.find(r=>r.editable).buttonStyle;
 assert.equal(rec.states.open.background,rec.states.hover.style.background,name+' open changed fill');
 // aria-expanded by itself must not keep a 3px lift after pointer exit.
 await page.mouse.move(0,0);
 await page.waitForTimeout(230);
 const expandedAfterExit=(await probe(page)).rows.find(r=>r.editable);
 assert(near(expandedAfterExit.buttonStyle.translateY,0,.15),
  name+' expanded picker stuck lifted: '+expandedAfterExit.buttonStyle.transform);
 rec.states.openAfterPointerExit=expandedAfterExit.buttonStyle;
 const popup=page.locator('.cell-picker-popover:popover-open');
 assert(await popup.getByRole('option').count()>=2,name+' missing real choices');
 await page.keyboard.press('Escape');
 assert.equal(await target.getAttribute('aria-expanded'),'false',name+' Escape');
 if(surface==='list'&&mode==='edit'&&width===1440&&!long){
  // Genuine outside pointer (not dispatchEvent), then test repositioning
  // while a real CellPicker is open. Never assert a fake overlay remains.
  await target.click();
  await page.locator('.cell-picker-popover:popover-open').waitFor();
  await page.mouse.click(5,5);
  assert.equal(await page.locator('.cell-picker-popover:popover-open').count(),0,
   name+' outside click did not close');
  await target.click();
  await page.locator('.cell-picker-popover:popover-open').waitFor();
  await page.evaluate(()=>window.scrollBy(0,200));
  await page.setViewportSize({width:900,height:900});
  await page.waitForTimeout(150);
  const visible=page.locator('.cell-picker-popover:popover-open');
  if(await visible.count()){
   const rect=await visible.boundingBox();
   assert(rect&&rect.x>=-1&&rect.y>=-1&&rect.x+rect.width<=901&&
    rect.y+rect.height<=901,name+' scroll/resize off-screen popover: '+JSON.stringify(rect));
  }
  await page.keyboard.press('Escape');
  await page.setViewportSize({width,height:900});
  await target.scrollIntoViewIfNeeded();
 }
 await target.click();
 await page.locator('.cell-picker-popover:popover-open').waitFor();
 const choices=page.locator('.cell-picker-popover:popover-open [role="option"]');
 const original=(await target.innerText()).trim();
 let picked=false;
 for(let i=0;i<await choices.count();i++){
  const label=(await choices.nth(i).innerText()).trim();
  if(label&&label!==original&&label!=='—'){
   await choices.nth(i).click();picked=true;break;
  }
 }
 assert(picked,name+' no different choice');
 const patch=await page.locator('[data-qa="last-patch"]').textContent();
 assert(patch&&patch.includes('progress'),name+' selection did not reach RAM callback '+patch);
 rec.states.patch=patch;
}
try{
 await ready();
 browser=await chromium.launch({headless:true,chromiumSandbox:false,args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(!['127.0.0.1','localhost'].includes(url.hostname)){
   external.push(url.href);return route.abort();
  }
  return route.continue();
 });
 const page=await context.newPage();
 for(const width of [1440,900,390])
  for(const surface of ['list','popup']){
   for(const mode of ['edit','guest','mixed'])
    await scenario(page,{width,surface,mode});
   await scenario(page,{width,surface,mode:'edit',long:true});
  }
 // Text uses the available 120px rail and may wrap, without clipping.
 // A user can expand that rail (e.g. to 160px) for a single-line display.
 // Probe actual React pickers in Chromium, but never write source data.
 for(const surface of ['list','popup']){
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/ui-20261106-picker-fixture.html?'+
   new URLSearchParams({surface,mode:'edit'}),{waitUntil:'networkidle'});
  if(surface==='popup'){
   await page.getByRole('button',{name:'Chỉnh sửa nháp'}).click();
   await page.getByRole('button',{name:'Về chế độ xem'}).waitFor();
  }
  const root=surface==='popup'?'.report-detail-grid':'.item-data-table';
  const packing=await page.locator(root+' .compact-stages[data-rev2="true"]').first().evaluate(stage=>{
   function measure(button,text){
    if(!button)throw Error('Missing editable L03 button for packing check');
    const value=button.querySelector('.cell-picker-value-text');
    if(!value)throw Error('Missing actual CellPicker value span');
    value.textContent=text; // browser-only fixture, never writes Item or server
    const s=getComputedStyle(button),vs=getComputedStyle(value);
    const r=button.getBoundingClientRect(),vr=value.getBoundingClientRect();
    const range=document.createRange();range.selectNodeContents(value);
    const lineRects=[...range.getClientRects()].map(x=>({w:x.width,h:x.height,y:x.y}));
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
    ctx.font=vs.font;
    return {text,width:r.width,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,
      gap:s.columnGap,caretWidth:getComputedStyle(button,'::after').width,
      valueWidth:vr.width,valueHeight:vr.height,lineHeight:vs.lineHeight,
      estimatedInkWidth:ctx.measureText(text).width,lines:lineRects.length,
      lineRects};
   }
   const status=stage.querySelector('.compact-stage-state[data-editable="true"] button.cell-picker-trigger');
   const level=stage.querySelector('.compact-stage-level[data-level-editor="true"] button.cell-picker-trigger');
   const atDefault={status:measure(status,'ĐU gửi TU, chưa họp'),level:measure(level,'BCH')};
   // Simulate only the configurable status rail becoming 160px. The actual
   // app persists rails via its layout editor; this is a visual CSS probe.
   const td=stage.closest('td');
   td.style.setProperty('--hdnd-l03-status-track','160px');
   td.style.setProperty('--hdnd-l03-inner-width','372px'); // 120+76+160+2*8
   const widenedStatus=measure(status,'ĐU gửi TU, chưa họp');
   return {...atDefault,widenedStatus};
  });
  writeFileSync(join(out,'packing-'+surface+'.json'),JSON.stringify(packing,null,2));
  assert(near(packing.status.width,120,.3),'Status physical rail not 120px '+surface);
  assert(near(packing.level.width,76,.3),'Level physical rail not 76px '+surface);
  assert.equal(packing.status.paddingLeft,'4px','Status left padding must be 4px');
  assert.equal(packing.status.paddingRight,'4px','Status right padding must be 4px');
  assert.equal(packing.status.gap,'3px','Status caret gap must be 3px');
  // Wrapping is acceptable if the text cannot physically fit. Reject only
  // clipping/overflow, excessive wasted space or unintended truncation.
  assert(packing.status.lines>=1&&packing.status.lines<=3,
   'Status unexpectedly wraps or clips '+surface+': '+JSON.stringify(packing.status));
  assert(packing.status.lineRects.every(x=>x.w<=packing.status.valueWidth+1.5),
   'Status has horizontally overflowing text '+surface+': '+JSON.stringify(packing.status));
  assert(packing.status.valueWidth>=100,
   'Status lost too much horizontal room to decoration '+surface);
  assert.equal(packing.level.lines,1,'BCH not on one line '+surface);
  assert.equal(packing.level.paddingLeft,'4px','Level left padding');
  assert.equal(packing.level.paddingRight,'4px','Level right padding');
  assert.equal(packing.level.gap,'3px','Level caret gap');
  assert(near(packing.widenedStatus.width,160,.3),
   'User-adjusted status rail not 160px '+surface);
  assert.equal(packing.widenedStatus.lines,1,
   'User-adjusted 160px rail still wraps '+surface+': '+JSON.stringify(packing.widenedStatus));
  results.push({name:'packing-'+surface,initial:packing,states:{}});
  await screenshot(page,'packing-'+surface);
 }
 // Exercise TWO distinct five-rail configurations against actual CSS subgrid
 // in BOTH surfaces and 2/3-track modes. This is an in-page geometry probe,
 // not a claim that an injected value was persisted to Firebase.
 const railPresets=[
  {readonly:{label:122,status:225},editable:{label:145,level:82,status:279}},
  {readonly:{label:93,status:127},editable:{label:93,level:87,status:133}}
 ];
 for(const preset of railPresets)for(const surface of ['list','popup'])
  for(const mode of ['edit','guest']){
   await page.setViewportSize({width:900,height:900});
   await page.goto(base+'/ui-20261106-picker-fixture.html?'+
    new URLSearchParams({surface,mode}),{waitUntil:'networkidle'});
   const root=surface==='popup'?'.report-detail-grid':'.item-data-table';
   await page.locator(root+' .compact-stages[data-rev2="true"]').first().waitFor();
   if(surface==='popup'&&mode==='edit')
    await page.getByRole('button',{name:'Chỉnh sửa nháp'}).click();
   const values=mode==='edit'?preset.editable:preset.readonly;
   const widths=mode==='edit'?[values.label,values.level,values.status]:
    [values.label,values.status];
   const inner=widths.reduce((a,b)=>a+b,0)+8*(widths.length-1);
   await page.evaluate(({root,values,inner})=>{
    const td=document.querySelector(root+' .compact-stages[data-rev2="true"]')?.closest('td');
    if(!td)throw Error('No L03 td to probe saved rail geometry');
    td.style.setProperty('--hdnd-l03-label-track',values.label+'px');
    td.style.setProperty('--hdnd-l03-level-track',(values.level??76)+'px');
    td.style.setProperty('--hdnd-l03-status-track',values.status+'px');
    td.style.setProperty('--hdnd-l03-inner-width',inner+'px');
   },{root,values,inner});
   const actual=await probe(page);
   check(actual,'rail-'+mode+'-'+surface+'-'+inner);
   const numbers=actual.grid.trim().split(/\s+/).map(n);
   assert(numbers.length===widths.length&&
    numbers.every((x,i)=>near(x,widths[i])), 'Asymmetric rail mismatch '+JSON.stringify({surface,mode,widths,actual:actual.grid}));
   // A saved 5-rail configuration may be wider than a deliberately narrow
   // outer L03 column. The real app grows the column when an administrator
   // saves widths; this direct CSS-variable probe deliberately does not.
   // In that case, all px tracks must remain exact and scroll internally,
   // rather than forcing the field or the whole table to reflow.
   assert(actual.rect.w<=inner+1.25,
    'Saved rail overexpanded narrow host '+JSON.stringify({inner,actual:actual.rect}));
   if(inner>actual.rect.w+1.25){
    assert.equal(actual.overflowX,'auto','Constrained saved rails lost inner scroll');
    assert(actual.scrollWidth>=inner-2,
      'Saved rails clipped rather than scrolled '+JSON.stringify({inner,scrollWidth:actual.scrollWidth,viewport:actual.rect.w}));
   }else assert(near(actual.rect.w,inner,1.25),
    'Saved rail sum drift '+JSON.stringify({inner,actual:actual.rect}));
   results.push({name:'rail-'+mode+'-'+surface+'-'+inner,initial:actual,states:{preset}});
  }
 // Reduced-motion still has the outline, but never lifts an editable stage.
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto(base+'/ui-20261106-picker-fixture.html?surface=list&mode=edit',
  {waitUntil:'networkidle'});
 const reduced=page.locator('.item-data-table .compact-stages[data-rev2="true"] .compact-stage-state[data-editable="true"] button.cell-picker-trigger').first();
 await reduced.hover();await page.waitForTimeout(220);
 let motion=await reduced.evaluate(el=>({transform:getComputedStyle(el).transform,
  outline:getComputedStyle(el).outlineStyle}));
 assert.equal(motion.transform,'none','Reduced motion must remove lift');
 assert.equal(motion.outline,'solid','Reduced motion must preserve focus affordance');
 await page.emulateMedia({reducedMotion:'no-preference',media:'print'});
 motion=await reduced.evaluate(el=>({transform:getComputedStyle(el).transform,
  shadow:getComputedStyle(el).boxShadow}));
 assert.equal(motion.transform,'none','Print must not lift');
 assert.equal(motion.shadow,'none','Print must not shadow');
 await page.emulateMedia({media:'screen'});

 assert.equal(external.length,0,'Blocked production requests: '+external);
 writeFileSync(join(out,'computed-rects.json'),JSON.stringify({result:'PASS',results,external},null,2));
 console.log('PICKER_PARITY_STAGES_BROWSER_PASS scenarios='+results.length);
}catch(e){
 writeFileSync(join(out,'failure.txt'),String(e?.stack??e)+'\n'+serverLog);
 console.error('PICKER_PARITY_STAGES_BROWSER_FAIL '+String(e?.stack??e));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 vite.kill('SIGTERM');vite.stdout?.destroy();vite.stderr?.destroy();
}
