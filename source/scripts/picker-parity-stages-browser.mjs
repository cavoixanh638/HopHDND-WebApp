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
  fontSize:s.fontSize,fontWeight:s.fontWeight,fontFamily:s.fontFamily,
  lineHeight:s.lineHeight,gap:s.gap,
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
   // In List this may be .compact-part; popup can use a nested
   // .workflow-status-value with legacy font declarations.
   readonlyTextStyle:!button&&status?
    cs(status.querySelector('.workflow-status-value,.compact-part')||status):null,
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
   assert.equal(n(row.statusStyle.fontSize),11,context+' readonly status size '+row.field);
   assert.equal(n(row.statusStyle.fontWeight),550,context+' readonly status weight '+row.field);
   assert.equal(n(row.readonlyTextStyle.fontSize),11,
    context+' readonly nested text size '+row.field);
   assert.equal(n(row.readonlyTextStyle.fontWeight),550,
    context+' readonly nested text weight '+row.field);
   const editableButton=p.rows.find(r=>r.editable)?.buttonStyle;
   if(editableButton){
    for(const property of ['fontSize','fontWeight','fontFamily','lineHeight']){
     assert.equal(row.statusStyle[property],editableButton[property],
      context+' mixed readonly/status picker typography mismatch '+row.field+' '+property);
     assert.equal(row.readonlyTextStyle[property],editableButton[property],
      context+' mixed nested readonly/picker typography mismatch '+row.field+' '+property);
    }
   }
   // Height parity with the interactive 26px picker: borderless readonly
   // compensates the 1px top/bottom button borders with 5px padding.
   assert.equal(n(row.statusStyle.minHeight),26,context+' readonly min-height '+row.field);
   assert.equal(row.statusStyle.padding,'5px 4px',
    context+' readonly must match editable vertical box model '+row.field);
   assert.equal(n(row.statusStyle.border),0,context+' readonly must remain borderless '+row.field);
   assert(row.status.h>=25.75,context+' readonly actual height under 26px '+row.field);
   const otherEditable=p.rows.find(r=>r.editable&&near(r.button?.h,26,.35));
   if(otherEditable&&near(row.status.h,26,.35)){
    assert(near(row.status.h,otherEditable.button.h,.35),
     context+' one-line readonly height differs from editable '+row.field);
   }
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
 // Exactly two prose fields use a small hit target (NOT the whole TD).
 // This tests real mouse events and real InlineNoteEditor controls in both
 // operational surfaces. Synthetic fixture uses RAM, no production writes.
 for(const surface of ['list','popup'])for(const field of ['specificProgress','note']){
  await page.setViewportSize({width:1440,height:900});
  // Reuse the established RAM-only fixture that already mounts both
  // REAL editors with explicit field permissions in List and popup.
  const url=base+'/ui-20261106-picker-fixture.html?'+
   new URLSearchParams({surface,mode:'edit'});
  await page.goto(url,{waitUntil:'networkidle'});
  if(surface==='popup'){
   await page.getByRole('button',{name:'Chỉnh sửa nháp'}).click();
   await page.getByRole('button',{name:'Về chế độ xem'}).waitFor();
  }
  const root=surface==='popup'?'.report-detail-grid':'.item-data-table';
  const td=page.locator(root+' tbody td[data-col-key="'+field+'"].editable-cell').first();
  const btn=td.locator('button.inline-note-trigger').first();
  // Capture the real mounted table and visibility before assuming a field
  // is editable: a compact view may project/hide one of the Excel columns.
  await page.waitForTimeout(400);
  const diagnostic=await page.evaluate(()=>{
   const table=document.querySelector('.item-data-table,.report-detail-grid');
   return {title:document.title,table:!!table,body:document.body.innerText.slice(0,650),
    keys:[...document.querySelectorAll('tbody td[data-col-key]')].slice(0,35).map(e=>({
     key:e.getAttribute('data-col-key'),editable:e.classList.contains('editable-cell'),
     buttons:e.querySelectorAll('button.inline-note-trigger').length
    }))};
  });
  const geometry=await page.locator(root+' tbody td[data-col-key="'+field+'"].editable-cell')
   .evaluateAll(cells=>cells.slice(0,5).map(cell=>{
    const btn=cell.querySelector('button.inline-note-trigger');
    const info=el=>{
     if(!el)return null;
     const st=getComputedStyle(el),r=el.getBoundingClientRect();
     return {tag:el.tagName,className:el.className,display:st.display,
      visibility:st.visibility,opacity:st.opacity,overflow:st.overflow,
      width:st.width,height:st.height,rect:{x:r.x,y:r.y,w:r.width,h:r.height}};
    };
    return {row:info(cell.parentElement),td:info(cell),wrapper:info(btn?.parentElement),
      button:info(btn),matches:btn?.matches(':hover')};
   }));
  console.log('INLINE_HIT_MOUNT_DIAGNOSTIC '+JSON.stringify({surface,field,diagnostic,geometry}));
  // The horizontally scrollable List can defer offscreen rendering.
  // Bring the actual TD/button into the scroll viewport BEFORE waiting for
  // browser visibility (never force an invisible editor into a click).
  await td.evaluate(cell=>cell.scrollIntoView({block:'center',inline:'center'}));
  await btn.evaluate(button=>button.scrollIntoView({block:'center',inline:'center'}));
  await btn.waitFor({timeout:7000});
  const blank=await td.evaluate(cell=>{
   const rect=cell.getBoundingClientRect(),button=cell.querySelector('button.inline-note-trigger');
   if(!button)throw Error('Missing real inline prose editor trigger');
   const b=button.getBoundingClientRect();
   const points=[
    {x:rect.left+3,y:rect.top+3},{x:rect.right-3,y:rect.top+3},
    {x:rect.left+3,y:rect.bottom-3},{x:rect.right-3,y:rect.bottom-3}
   ];
   const point=points.find(p=>{
    if(p.x<0||p.y<0||p.x>=innerWidth||p.y>=innerHeight)return false;
    if(p.x>=b.left&&p.x<=b.right&&p.y>=b.top&&p.y<=b.bottom)return false;
    const hit=document.elementFromPoint(p.x,p.y);
    return hit&&cell.contains(hit)&&!hit.closest('button,input,textarea,select,a,[role="button"]');
   });
   if(!point)throw Error('No blank TD padding outside inner editor');
   return {...point,tdWidth:rect.width,buttonWidth:b.width};
  });
  assert(blank.buttonWidth<blank.tdWidth-5,
   'Inner prose editor extends into all TD padding '+surface+'/'+field+JSON.stringify(blank));
  await page.mouse.move(0,0);await page.waitForTimeout(80);
  await page.mouse.move(blank.x,blank.y);await page.waitForTimeout(230);
  const style=()=>btn.evaluate(el=>{
   const c=getComputedStyle(el);
   return {transform:c.transform,shadow:c.boxShadow,border:c.borderColor,
    background:c.backgroundColor};
  });
  const lift=s=>{
   if(s.transform==='none')return 0;
   const raw=s.transform,open=raw.indexOf('('),close=raw.lastIndexOf(')');
   if(open<0||close<=open)return NaN;
   const parts=raw.slice(open+1,close).split(',').map(Number);
   return raw.startsWith('matrix3d(')?parts[13]:parts[5];
  };
  const blankHover=await style();
  assert(near(lift(blankHover),0,.15)&&blankHover.shadow==='none',
   'Blank TD paints editor hover '+surface+'/'+field+JSON.stringify(blankHover));
  assert.equal(await page.locator('#edit-shared-tooltip:popover-open').count(),0,
   'Blank TD incorrectly displays edit tooltip '+surface+'/'+field);
  await page.mouse.click(blank.x,blank.y);
  assert.equal(await td.locator('textarea.inline-note-textarea').count(),0,
   'Click on blank TD unexpectedly opened editing '+surface+'/'+field);
  await btn.hover();await page.waitForTimeout(230);
  const hovered=await style();
  assert(lift(hovered)<-1.4&&hovered.shadow!=='none',
   'Actual editor did not lift on button hover '+surface+'/'+field+JSON.stringify(hovered));
  assert.equal(await page.locator('#edit-shared-tooltip:popover-open').count(),1,
   'Hover on actual button no longer offers edit tooltip '+surface+'/'+field);
  await page.mouse.move(blank.x,blank.y);await page.waitForTimeout(230);
  const afterExit=await style();
  assert(near(lift(afterExit),0,.15)&&afterExit.shadow==='none',
   'Glow remains after pointer leaves editor for blank TD '+surface+'/'+field);
  assert.equal(await page.locator('#edit-shared-tooltip:popover-open').count(),0,
   'Edit tooltip remains on blank TD '+surface+'/'+field);
  await btn.click();
  const textarea=td.locator('textarea.inline-note-textarea');
  await textarea.waitFor({timeout:15000});
  // Press through the actual focused editor rather than trusting a stale
  // page-level activeElement after opening the tooltip/inner edit control.
  await textarea.press('Escape');
  await btn.waitFor({timeout:5000});
  assert.equal(await td.locator('textarea.inline-note-textarea').count(),0,
   'Escape did not dismiss inline editor '+surface+'/'+field);
  results.push({name:'inner-hit-'+surface+'-'+field,
   initial:{blank,blankHover},states:{hovered,afterExit,clickedRealButton:true}});
  await screenshot(page,'inner-hit-'+surface+'-'+field);
 }
 for(const width of [1440,900,390])
  for(const surface of ['list','popup']){
   for(const mode of ['edit','guest','mixed'])
    await scenario(page,{width,surface,mode});
   await scenario(page,{width,surface,mode:'edit',long:true});
  }

 // B00 and C01-C03 must show SOURCE totals, independently of F01/F02
 // filters, even when the List becomes empty. Uses real React controls.
 await page.setViewportSize({width:1440,height:900});
 await page.goto(base+'/compact-qa.html?full=1&preview-role=admin',{waitUntil:'networkidle'});
 await page.locator('[data-preview="pr95-l4-full"]').waitFor();
 const summaryState=()=>page.evaluate(()=>{
  const blocks=[...document.querySelectorAll('.item-summary-grid [data-summary-card]')];
  const normalize=s=>String(s??'').replace(/\s+/g,' ').trim();
  return {cards:blocks.map(c=>({id:c.dataset.summaryCard,text:normalize(c.textContent)})),
   rows:document.querySelectorAll('.item-data-table tbody td[data-col-key="displayCode"]').length,
   visible:normalize(document.querySelector('.list-active-filter-results')?.textContent)};
 });
 const totals=await summaryState();
 const quietLayout=await page.evaluate(()=>{
   const main=document.querySelector('.pr95-preview-main');
   const card=document.querySelector('.item-list-card');
   const region=document.querySelector('.item-data-region');
   return {
     filterAbsent:!document.querySelector('.list-active-filters'),
     technicalAbsent:!document.querySelector('.pr95-preview-main .pr95-preview-context'),
     outerBorder:getComputedStyle(main).borderTopWidth,
     cardBorder:getComputedStyle(card).borderTopWidth,
     cardPadding:getComputedStyle(card).paddingTop,
     toolsHidden:region.dataset.previewOptions==='closed'&&
       getComputedStyle(region.querySelector('.admin-list-controls')).display==='none'&&
       getComputedStyle(region.querySelector(':scope>.card-header')).display==='none'
   };
 });
 assert.deepEqual(quietLayout,{
   filterAbsent:true,technicalAbsent:true,outerBorder:'0px',cardBorder:'0px',
   cardPadding:'0px',toolsHidden:true
 },'Unfiltered List still wastes vertical screen space: '+JSON.stringify(quietLayout));
 await page.getByRole('button',{name:'Mở hoặc đóng các tùy chọn hiển thị và công cụ quản trị Danh sách'}).click();
 await page.locator('.admin-list-controls').waitFor({state:'visible'});
 await page.getByRole('button',{name:'Mở hoặc đóng các tùy chọn hiển thị và công cụ quản trị Danh sách'}).click();
 await page.locator('.admin-list-controls').waitFor({state:'hidden'});
 assert.deepEqual(totals.cards.map(x=>x.id),['total','party','build','nq'],
  'Expected four summary cards B00/C01-C03');
 assert(totals.rows>1,'Source list fixture has insufficient rows');
 await page.locator('.list-filter-search').fill('NONEXISTENT_F_20261108');
 await page.waitForTimeout(170);
 const noResults=await summaryState();
 assert.equal(noResults.rows,0,'F01 did not filter the List down to zero');
 assert.deepEqual(noResults.cards,totals.cards,
  'B00/C01-C03 card values changed when F01 filtered to zero rows');
 await page.locator('.list-filter-search').fill('');
 await page.locator('select[aria-label="Lọc Sở, ngành"]').selectOption({index:1});
 await page.waitForTimeout(170);
 const byDepartment=await summaryState();
 assert(byDepartment.rows<totals.rows,'F02 department filter did not reduce List rows');
 assert.deepEqual(byDepartment.cards,totals.cards,
  'B00/C01-C03 changed when F02 filtered List rows');
 const defaultColors=await page.locator('[data-preview="pr95-l4-full"]').evaluate(el=>{
  const v=getComputedStyle(el);
  return {office:[v.getPropertyValue('--hdnd-status-office-text').trim(),
    v.getPropertyValue('--hdnd-status-office-bg').trim()],
   done:[v.getPropertyValue('--hdnd-status-done-text').trim(),
    v.getPropertyValue('--hdnd-status-done-bg').trim()]};
 });
 assert.deepEqual(defaultColors,{office:['#80531F','#FFEEDA'],done:['#256441','#DEF3E5']},
  'Synthetic default palette did not adopt clearer VP/completion swatches');
 results.push({name:'summary-F-independent',initial:totals,
  states:{F01:noResults,F02:byDepartment,colors:defaultColors}});
 await screenshot(page,'summary-F-independent');
 // 08/11: verify actual responsive preview shell across 21/24/27-inch
 // typical CSS viewport widths. Physical inches are not browser pixels.
 for(const width of [390,1280,1920,2560]){
  await page.setViewportSize({width,height:900});
  await page.goto(base+'/compact-qa.html?full=1&preview-role=admin',
   {waitUntil:'networkidle'});
  await page.locator('.pr95-preview-main').waitFor();
  const measure=await page.evaluate(()=>{
   const shell=document.querySelector('.pr95-full-preview');
   const main=shell.querySelector('.pr95-preview-main');
   const nav=shell.querySelector('.pr95-preview-nav');
   const rect=e=>e.getBoundingClientRect();
   const root=rect(shell),body=rect(main);
   return {window:innerWidth,root:{left:root.left,right:root.right},
    main:{left:body.left,right:body.right,width:body.width,top:body.top},
    gutters:[body.left-root.left,root.right-body.right],
    nav:!!nav,footer:shell.querySelectorAll('.pr95-preview-footnote').length,
    scroll:document.documentElement.scrollWidth};
  });
  assert(near(measure.gutters[0],measure.gutters[1],1.4),
   'Unequal left/right gutters at '+width+': '+JSON.stringify(measure));
  assert(measure.main.width<=2200.5,
   'Main exceeds max width 2200px at '+width);
  assert.equal(measure.footer,0,'Removed bottom demo footnote still present');
  assert(measure.nav,'Admin navigation missing at '+width);
  assert(measure.scroll<=width+3,'Full page overflow at '+width);
  results.push({name:'responsive-centered-admin-'+width,initial:measure,states:{}});
  if(width===1920){
   const prefilterLayout=await page.evaluate(()=>{
    const td=document.querySelector('.item-data-table tbody td[data-col-key="content"]');
    const f01=document.querySelector('.list-filter-search');
    const b=document.querySelector('.item-summary-total-count');
    const bcard=document.querySelector('.item-summary-total');
    const title=document.querySelector('.item-summary-total h3');
    const pc=document.querySelector('.item-summary-card[data-summary-card="party"] .item-summary-percent');
    const ch=document.querySelector('.item-summary-card[data-summary-card="party"] .item-summary-card-head');
    return {contentVAlign:td?getComputedStyle(td).verticalAlign:null,
      f01Font:f01?getComputedStyle(f01).fontSize:null,
      baseTableColor:document.querySelector('.item-data-table')?getComputedStyle(document.querySelector('.item-data-table')).color:null,
      totalFont:b?getComputedStyle(b).fontSize:null,totalColor:b?getComputedStyle(b).color:null,
      totalBG:bcard?getComputedStyle(bcard).backgroundImage:null,
      totalLabelColor:title?getComputedStyle(title).color:null,
      pctFont:pc?getComputedStyle(pc).fontSize:null,
      pctColor:pc?getComputedStyle(pc).color:null,
      pctHeaderHeight:ch?.getBoundingClientRect().height};
   });
   assert.equal(prefilterLayout.contentVAlign,'middle',
    'L01 content is not vertically centered before filtering');
   assert.equal(prefilterLayout.f01Font,'12px','F01 font size not compact');
   const filterLine=await page.evaluate(()=>{
     const f=document.querySelector('.list-filter-search');
     const s=document.querySelector('select[aria-label="Lọc Phòng"]');
     return {
       searchHeight:f.getBoundingClientRect().height,
       selectHeight:s.getBoundingClientRect().height,
       selectedOutline:getComputedStyle(s).outlineStyle
     };
   });
   assert.equal(filterLine.searchHeight,28,'F search input is too high');
   assert.equal(filterLine.selectHeight,28,'F selector is too high');
   await page.locator('select[aria-label="Lọc Phòng"]').selectOption({index:1});
   const selected=await page.locator('select[aria-label="Lọc Phòng"]').evaluate(el=>{
     const s=getComputedStyle(el);
     return {border:s.borderTopWidth,shadow:s.boxShadow};
   });
   assert.equal(selected.shadow,'none','Selected filter has duplicate inset stroke');
   await page.locator('select[aria-label="Lọc Phòng"]').focus();
   const focused=await page.locator('select[aria-label="Lọc Phòng"]').evaluate(el=>{
     const s=getComputedStyle(el);
     return {border:s.borderTopWidth,outline:s.outlineStyle,shadow:s.boxShadow,height:el.getBoundingClientRect().height};
   });
   assert.deepEqual(focused,{border:'2px',outline:'none',shadow:'none',height:28},
     'Filter focus draws multiple rings '+JSON.stringify(focused));
   await page.locator('select[aria-label="Lọc Phòng"]').selectOption({index:0});
   await page.locator('select[aria-label="Lọc Phòng"]').blur();
   await page.waitForFunction(()=>{
     const el=document.querySelector('.item-data-region .item-table-scroll');
     return !!el?.style.getPropertyValue('--hdnd-preview-table-fill-height');
   });
   const fit=await page.evaluate(()=>{
     const el=document.querySelector('.item-data-region .item-table-scroll');
     const rect=el.getBoundingClientRect();
     return {height:rect.height,topDoc:rect.top+scrollY,viewport:innerHeight,
       variable:el.style.getPropertyValue('--hdnd-preview-table-fill-height')};
   });
   const expected=Math.min(1300,Math.max(320,Math.round(fit.viewport-fit.topDoc-32)));
   assert(Math.abs(fit.height-expected)<=2,'Preview table does not fill remaining viewport '+JSON.stringify(fit));
   assert.equal(prefilterLayout.totalFont,'38px','B00 total count is not 38px');
   assert.equal(prefilterLayout.totalColor,'rgb(8, 117, 83)','B00 count is not deep green');
   assert(prefilterLayout.totalBG?.includes('linear-gradient'),'B00 ribbon lacks gentle emphasis');
   assert.equal(prefilterLayout.totalLabelColor,'rgb(31, 41, 55)','B00 label is not neutral');
   assert.equal(prefilterLayout.baseTableColor,'rgb(36, 49, 61)','Ordinary list text is not neutral');
   assert.equal(prefilterLayout.pctFont,'24px','C01 completion percentage not enlarged');
   assert.equal(prefilterLayout.pctColor,'rgb(21, 134, 77)','C01 completion green changed');
   assert(prefilterLayout.pctHeaderHeight<=28,
    'C01 header became taller after font enlargement: '+JSON.stringify(prefilterLayout));
   await page.locator('select[aria-label="Lọc Sở, ngành"]').selectOption({index:1});
   await page.locator('[data-summary-report="party"][data-summary-stage="source"]').click();
   await page.locator('[data-active-filter-count="2"]').waitFor();
   const filterGeometry=await page.evaluate(()=>{
    const zone=document.querySelector('.list-active-filters');
    const chips=[...zone.querySelectorAll('.list-active-filter-chip')];
    const dots=[...zone.querySelectorAll('.list-active-filter-signal')];
    const zr=zone.getBoundingClientRect(),rr=chips.map(e=>e.getBoundingClientRect());
    const left=Math.min(...rr.map(r=>r.left)),right=Math.max(...rr.map(r=>r.right));
    const style=dots[0]?getComputedStyle(dots[0]):null;
    const badge=zone.querySelector('.list-active-filter-summary');
    const b=badge.getBoundingClientRect();
    const head=document.querySelector('.item-summary-card[data-summary-card="party"] .item-summary-card-head');
    const h3=head.querySelector('h3'),pct=head.querySelector('.item-summary-percent');
    const first=Math.min(h3.getBoundingClientRect().left,pct.getBoundingClientRect().left);
    const last=Math.max(h3.getBoundingClientRect().right,pct.getBoundingClientRect().right);
    const hr=head.getBoundingClientRect();
    const combinedLeft=Math.min(left,b.left),combinedRight=Math.max(right,b.right);
    return {count:chips.length,centerDeviation:(combinedLeft+combinedRight-zr.left-zr.right)/2,
     centered:Math.abs((combinedLeft+combinedRight-zr.left-zr.right)/2)<4,
     title:badge.textContent.replace(/\s+/g,' ').trim(),
     visibleChips:chips.map(e=>e.querySelector('.list-active-filter-chip-value')?.textContent.trim()),
     sameLine:Math.abs(b.top-chips[0].getBoundingClientRect().top)<5,
     inlineLayout:!!zone.querySelector('.list-active-filter-inline'),
     chipColors:chips.map(e=>getComputedStyle(e.querySelector('.list-active-filter-chip-value')).color),
     emphasisColor:getComputedStyle(badge.querySelector('.list-active-filter-emphasis')).color,
     nounColor:getComputedStyle(badge.querySelector('.list-active-filter-noun')).color,
     dotColor:style?.backgroundColor,
     hasVisibleFieldLabels:chips.some(e=>e.querySelector('.list-active-filter-chip-label')),
     c01HeadDeviation:(first+last-hr.left-hr.right)/2,
     c01PercentColor:getComputedStyle(pct).color,
     animation:style?.animationName,iterations:style?.animationIterationCount,
     background:getComputedStyle(zone).backgroundImage};
   });
   assert(filterGeometry.centered,
    'Combined filter header and values not centered: '+JSON.stringify(filterGeometry));
   assert.equal(filterGeometry.count,2,'Must show exactly two active filters');
   assert(filterGeometry.inlineLayout&&filterGeometry.sameLine,
    'Desktop active-filter heading/chips should share a row '+JSON.stringify(filterGeometry));
   assert(filterGeometry.title.startsWith('Đang lọc ')&&filterGeometry.title.endsWith('/27 nội dung'),
    'Noncompact filtering label: '+filterGeometry.title);
   assert.equal(filterGeometry.hasVisibleFieldLabels,false,'Chip labels still visibly repeated');
   assert(filterGeometry.visibleChips.every(Boolean),'Filter values missing');
   assert.equal(filterGeometry.emphasisColor,'rgb(199, 32, 55)','Active filter count is not red');
   assert.equal(filterGeometry.nounColor,'rgb(38, 52, 66)','Normal noun must not be red');
   assert(filterGeometry.chipColors.every(c=>c==='rgb(199, 32, 55)'),'Filter values are not red');
   assert.equal(filterGeometry.dotColor,'rgb(243, 39, 63)','Pulse dot is not bright red');
   assert(Math.abs(filterGeometry.c01HeadDeviation)<2,'C01 title/percentage not centered');
   assert.equal(filterGeometry.c01PercentColor,'rgb(21, 134, 77)','C01 percent not brighter green');
   assert.equal(filterGeometry.animation,'hdnd-filter-red-pulse',
    'Continuous red attention signal missing for active filters');
   assert.equal(filterGeometry.iterations,'infinite','Red signal must keep pulsing while filtered');
   await page.emulateMedia({reducedMotion:'reduce'});
   const reducedFilter=await page.locator('.list-active-filter-signal').first().evaluate(el=>
    getComputedStyle(el).animationName);
   assert.equal(reducedFilter,'none','Reduced-motion users see flashing filters');
   await page.emulateMedia({reducedMotion:'no-preference'});
   results.push({name:'filter-chips-inline-continuous-pulse',
    initial:filterGeometry,states:{reducedFilter}});
   await screenshot(page,'filter-chips-centered-desktop');
  }
 }
 // Without admin nav there must be NO empty top row for the small gear.
 for(const width of [390,1440,2560]){
  await page.setViewportSize({width,height:900});
  await page.goto(base+'/compact-qa.html?full=1',{waitUntil:'networkidle'});
  await page.locator('[data-preview="pr95-l4-full"][data-role="guest"]').waitFor();
  const guest=await page.evaluate(()=>{
   const shell=document.querySelector('.pr95-full-preview');
   const header=shell.querySelector('.pr95-preview-header');
   const main=shell.querySelector('.pr95-preview-main');
   const gear=shell.querySelector('.pr95-preview-gear');
   const rect=e=>e.getBoundingClientRect(),p=rect(main),r=rect(shell),g=rect(gear);
   return {viewport:innerWidth,headerHeight:rect(header).height,
    gutters:[p.left-r.left,r.right-p.right],mainTop:p.top,
    gear:{left:g.left,right:g.right,top:g.top,width:g.width},
    opacity:getComputedStyle(gear).opacity,footer:!!shell.querySelector('.pr95-preview-footnote'),
    pageScroll:document.documentElement.scrollWidth};
  });
  assert(guest.headerHeight<=1,'Guest gear still occupies a full header row '+JSON.stringify(guest));
  assert(near(guest.gutters[0],guest.gutters[1],1.4),
   'Guest shell is not centered at '+width+': '+JSON.stringify(guest));
  assert(guest.gear.right<=width+2&&guest.gear.left>=width-70&&
   guest.gear.width<=29,'Small gear no longer tucked in top right '+JSON.stringify(guest));
  assert(guest.pageScroll<=width+3,'Guest overflow at '+width);
  assert.equal(guest.footer,false,'Removed demo footer still visible');
  const gear=page.getByRole('button',{name:'Mở cài đặt demo'});
  await gear.click();
  const menu=page.locator('.pr95-preview-gear-menu');
  await menu.waitFor();
  await gear.focus();
  // React attaches the document-level Escape listener in a passive effect
  // after committing the opened menu. Wait a paint before firing the key.
  await page.waitForTimeout(170);
  await page.keyboard.press('Escape');
  await menu.waitFor({state:'detached',timeout:5000});
  results.push({name:'guest-no-gear-row-'+width,initial:guest,states:{gearMenuUsable:true}});
  await screenshot(page,'guest-compact-gear-'+width);
 }
 // Text uses the approved 145px rail and may wrap, without clipping.
 // A user can expand it (e.g. to 170px) for a single-line display.
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
   td.style.setProperty('--hdnd-l03-status-track','170px');
   td.style.setProperty('--hdnd-l03-inner-width','351px'); // 110+55+170+2*8
   const widenedStatus=measure(status,'ĐU gửi TU, chưa họp');
   return {...atDefault,widenedStatus};
  });
  writeFileSync(join(out,'packing-'+surface+'.json'),JSON.stringify(packing,null,2));
  assert(near(packing.status.width,145,.3),'Status physical rail not 145px '+surface);
  assert(near(packing.level.width,55,.3),'Level physical rail not 55px '+surface);
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
  assert(near(packing.widenedStatus.width,170,.3),
   'User-adjusted status rail not 170px '+surface);
  assert.equal(packing.widenedStatus.lines,1,
   'User-adjusted 170px rail still wraps '+surface+': '+JSON.stringify(packing.widenedStatus));
  results.push({name:'packing-'+surface,initial:packing,states:{}});
  await screenshot(page,'packing-'+surface);
 }
 // Compare actual one-line readonly and editable status box heights for BOTH
 // real surfaces. The source value is mutated only in this browser fixture.
 for(const surface of ['list','popup']){
  await page.setViewportSize({width:1440,height:900});
  await page.goto(base+'/ui-20261106-picker-fixture.html?'+
   new URLSearchParams({surface,mode:'mixed'}),{waitUntil:'networkidle'});
  const root=surface==='popup'?'.report-detail-grid':'.item-data-table';
  await page.locator(root+' .compact-stages[data-rev2="true"]').first().waitFor();
  if(surface==='popup'){
   await page.getByRole('button',{name:'Chỉnh sửa nháp'}).click();
   await page.getByRole('button',{name:'Về chế độ xem'}).waitFor();
  }
  const parity=await page.locator(root+' .compact-stages[data-rev2="true"]').first().evaluate(stage=>{
   const readonly=stage.querySelector('.compact-stage-state:not([data-editable="true"])');
   const editable=stage.querySelector('.compact-stage-state[data-editable="true"] button.cell-picker-trigger');
   if(!readonly||!editable)throw Error('Missing mixed rights for status height equality');
   const roText=readonly.querySelector('.workflow-status-value,.compact-part')||readonly;
   const editText=editable.querySelector('.cell-picker-value-text');
   if(!editText)throw Error('No real editable CellPicker value span');
   roText.textContent='Hoàn thành';editText.textContent='Hoàn thành';
   const a=readonly.getBoundingClientRect(),b=editable.getBoundingClientRect();
   return {readonly:{height:a.height,width:a.width,
      minHeight:getComputedStyle(readonly).minHeight,padding:getComputedStyle(readonly).padding,
      border:getComputedStyle(readonly).borderTopWidth},
    editable:{height:b.height,width:b.width,
      minHeight:getComputedStyle(editable).minHeight,padding:getComputedStyle(editable).padding,
      border:getComputedStyle(editable).borderTopWidth}};
  });
  assert(near(parity.readonly.height,parity.editable.height,.35),
   'L03 mixed one-line statuses differ in height '+surface+': '+JSON.stringify(parity));
  assert(near(parity.readonly.height,26,.35),'One-line readonly is not 26px '+surface);
  assert.equal(parity.readonly.padding,'5px 4px','Readonly vertical compensation '+surface);
  assert.equal(parity.readonly.border,'0px','Readonly unexpectedly has button border '+surface);
  writeFileSync(join(out,'height-parity-'+surface+'.json'),JSON.stringify(parity,null,2));
  results.push({name:'height-parity-'+surface,initial:parity,states:{}});
  await screenshot(page,'height-parity-'+surface);
 }
 // Exercise standard, previously saved and NEW MINIMUM five-rail configurations against actual CSS subgrid
 // in BOTH surfaces and 2/3-track modes. This is an in-page geometry probe,
 // not a claim that an injected value was persisted to Firebase.
 const railPresets=[
  {readonly:{label:122,status:225},editable:{label:145,level:82,status:279}},
  {readonly:{label:93,status:127},editable:{label:93,level:87,status:133}},
  {readonly:{label:64,status:72},editable:{label:64,level:48,status:72}}
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
