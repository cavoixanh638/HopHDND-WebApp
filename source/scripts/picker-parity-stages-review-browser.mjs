/**
 * Codex F02 STAGES: actual mounted React List and ReportDetailGrid, zero live IO.
 * Independent of the previously PASS 32-scenario browser + five-rail tests.
 * Artifact includes PNG, runtime styles, permission grants and raw-vs-projection.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const out=resolve('qa-results/picker-parity-stages/review');
mkdirSync(out,{recursive:true});
const port=5207,origin='http://127.0.0.1:'+port;
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','preact',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{
 cwd:resolve('.'),env:{...process.env,BROWSER:'none'},stdio:['ignore','pipe','pipe']});
let viteLog='',browser,network=[],cases=[];
for(const s of [vite.stdout,vite.stderr])
 s.on('data',b=>viteLog=(viteLog+String(b)).slice(-14000));
async function ready(){
 for(let i=0;i<150;i++){
  if(vite.exitCode!==null)throw Error('Vite exit '+vite.exitCode+' '+viteLog);
  try{if((await fetch(origin+'/picker-parity-stages-review-fixture.html')).ok)return;}catch{}
  await delay(160);
 }
 throw Error('STAGES review Vite not ready '+viteLog);
}
const rootFor=surface=>surface==='popup'?'.report-detail-grid':'.item-data-table';
const url=({surface,mode,scenario,highlight=false})=>origin+
 '/picker-parity-stages-review-fixture.html?'+new URLSearchParams({
  surface,mode,scenario,highlight:highlight?'1':'0'});
const hex=h=>'rgb('+[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)).join(', ')+')';
const close=(a,b)=>Math.abs(a-b)<1.2;
async function go(page,{surface,mode,scenario,highlight,width}){
 await page.setViewportSize({width,height:width===390?844:900});
 await page.goto(url({surface,mode,scenario,highlight}),{waitUntil:'networkidle'});
 await page.locator(rootFor(surface)+' [data-ui-reference-record-id="demo-0001"] .compact-stages[data-rev2="true"]')
  .first().waitFor();
 if(surface==='popup'&&mode!=='guest'){
  const edit=page.getByRole('button',{name:'Chỉnh sửa nháp'});
  await edit.waitFor();await edit.click();await page.waitForTimeout(150);
 }
}
async function capture(page,surface,id='demo-0001'){
 return page.evaluate(({root,id})=>{
  const stage=document.querySelector(root+
   ' [data-ui-reference-record-id="'+id+'"] .compact-stages[data-rev2="true"]');
  if(!stage)throw Error('Missing REAL L03 '+root+'/'+id);
  const rect=el=>{if(!el)return null;const b=el.getBoundingClientRect();
   return {x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom};};
  const style=el=>{if(!el)return null;
   const s=getComputedStyle(el),a=getComputedStyle(el,'::after');
   return {color:s.color,background:s.backgroundColor,transform:s.transform,
    fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,
    shadow:s.boxShadow,outline:s.outlineStyle,
    pseudo:{content:a.content,display:a.display,width:a.width,height:a.height}};
  };
  const rows=[...stage.querySelectorAll(':scope > .compact-stage-row')].map(row=>{
   const st=row.querySelector('.compact-stage-state');
   const lb=row.querySelector('.compact-stage-label');
   const lvl=row.querySelector('.compact-stage-level[data-level-editor="true"]');
   const btn=st?.querySelector('button.cell-picker-trigger');
   const lvlBtn=lvl?.querySelector('button.cell-picker-trigger');
   return {field:row.dataset.stageField,progressTone:st?.dataset.progressTone,
    editable:st?.dataset.editable==='true',highlighted:st?.dataset.highlighted==='true',
    text:st?.textContent?.trim(),label:lb?.textContent?.trim(),
    row:rect(row),labelRect:rect(lb),status:rect(st),
    statusStyle:style(st),button:rect(btn),buttonStyle:style(btn),
    buttonExpanded:btn?.getAttribute('aria-expanded'),
    level:rect(lvl),levelButton:rect(lvlBtn),levelStyle:style(lvlBtn)};
  });
  const source=document.querySelector('[data-qa="raw-first-record"]')?.textContent??'';
  const grants=document.querySelector('[data-qa="declared-grants"]')?.textContent??'';
  return {recordId:id,surface:root,mode:stage.dataset.levelLayout,
   stage:rect(stage),grid:getComputedStyle(stage).gridTemplateColumns,
   gap:getComputedStyle(stage).columnGap,
   rows,source:source?JSON.parse(source):null,grants:grants?JSON.parse(grants):null};
 },{root:rootFor(surface),id});
}
const row=(snap,key)=>{const r=snap.rows.find(x=>x.field===key);
 assert(r,'Missing stage field '+key);return r;};
async function shot(page,key){
 const file=join(out,key+'.png');
 writeFileSync(file,await page.screenshot({fullPage:false}));
 return file;
}
async function notRequired(page,{surface,width}){
 const key='khong-'+surface+'-'+width;
 await go(page,{surface,scenario:'not-required',mode:'party-grant',width});
 const selector=rootFor(surface)+' [data-ui-reference-record-id="demo-0001"] .compact-stages[data-rev2="true"]';
 await page.locator(selector).scrollIntoViewIfNeeded();
 const snap=await capture(page,surface);
 assert.equal(snap.mode,'readonly',key+' expected 2 tracks');
 assert.deepEqual(snap.grants.slice(0,4),[
  ['partyLevel',false],['progressParty',true],['progressBuild',true],['progressCouncil',true]
 ],key+' grant proof must be independent');
 assert.equal(snap.source.partyLevel,'Không',key+' raw level');
 assert.equal(snap.source.progressParty,'Sở chưa trình',key+' raw progress must remain untouched');
 const p=row(snap,'progressParty');
 assert.equal(p.text,'Không phải trình',key+' projected inert text');
 assert.equal(p.editable,false,key+' progressParty remains editable despite Không');
 assert.equal(p.button,null,key+' false button for Không');
 assert.equal(p.statusStyle.transform,'none',key+' readonly lift');
 assert.equal(p.statusStyle.shadow,'none',key+' readonly shadow');
 assert(p.statusStyle.background!=='rgba(0, 0, 0, 0)',key+' no member background');
 assert(p.label.includes('Thành ủy'),key+' party label lost');
 for(const field of ['progressBuild','progressCouncil']){
  const member=row(snap,field);
  assert(member.editable&&member.button,key+' independent '+field+' editor denied');
  assert(member.buttonStyle?.pseudo.content==='""',key+' missing caret for '+field);
 }
 const buttons=page.locator(selector+' [data-stage-field="progressParty"] button');
 assert.equal(await buttons.count(),0,key+' forbidden real button');
 const filename=await shot(page,key);
 cases.push({case:key,kind:'khong',snap,filename,result:'PASS'});
}
function colorFor(field,{highlight}){
 const palette={
  progressParty:{bg:'#C4E4FF',fg:'#154E85'},
  progressBuild:highlight?{bg:'#F2D1FC',fg:'#5B187B'}:{bg:'#FDE6B7',fg:'#8A4512'},
  progressCouncil:highlight?{bg:'#B8F1F2',fg:'#004B50'}:{bg:'#C5F4DA',fg:'#155E3B'}
 };
 return palette[field];
}
function assertPalette(snap,key,{highlight}){
 for(const field of ['progressParty','progressBuild','progressCouncil']){
  const r=row(snap,field),wanted=colorFor(field,{highlight});
  const s=r.editable?r.buttonStyle:r.statusStyle;
  assert(s,key+' missing style '+field);
  assert.equal(s.background,hex(wanted.bg),key+' wrong background '+field);
  assert.equal(s.color,hex(wanted.fg),key+' wrong ink '+field);
  if(!r.editable){
   assert.equal(r.button,null,key+' readonly fake button '+field);
   assert.equal(r.statusStyle.shadow,'none',key+' readonly has shadow '+field);
   assert.equal(r.statusStyle.transform,'none',key+' readonly has lift '+field);
  }
  if(highlight&&['progressBuild','progressCouncil'].includes(field))
   assert(r.highlighted,key+' highlight missing '+field);
 }
}
async function paletteCase(page,{surface,width,mode,highlight}){
 const key='palette-'+surface+'-'+mode+'-'+width+(highlight?'-highlight':'');
 await go(page,{surface,scenario:'palette',mode,highlight,width});
 const firstSel=rootFor(surface)+' [data-ui-reference-record-id="demo-0001"] .compact-stages[data-rev2="true"]';
 await page.locator(firstSel).scrollIntoViewIfNeeded();
 const initial=await capture(page,surface);
 assert.equal(initial.mode,mode==='guest'?'readonly':'editable',key+' wrong first track mode');
 assertPalette(initial,key,{highlight});
 if(mode==='mixed'){
  const second=await capture(page,surface,'demo-0002');
  assert.equal(second.mode,'readonly',key+' second record must remain 2 tracks');
  // Secondary record has no highlight mismatch for progressParty; Build/Council
  // are deliberately canonical same strings, so highlight should still apply.
  const b=row(second,'progressBuild'),c=row(second,'progressCouncil');
  for(const [r,f] of [[b,'progressBuild'],[c,'progressCouncil']]){
   const wanted=colorFor(f,{highlight});
   assert.equal((r.editable?r.buttonStyle:r.statusStyle).background,hex(wanted.bg),
    key+' mixed 2track fill '+f);
  }
 }
 const evidence={normal:initial};
 const editable=initial.rows.find(x=>x.editable&&x.field==='progressBuild')||
   initial.rows.find(x=>x.editable&&x.field==='progressParty');
 if(editable){
  const target=page.locator(firstSel+' [data-stage-field="'+editable.field+'"] button.cell-picker-trigger');
  await target.hover();await page.waitForTimeout(235);
  evidence.hover=await capture(page,surface);
  assertPalette(evidence.hover,key+' hover',{highlight});
  await target.focus();await page.waitForTimeout(50);
  evidence.focus=await capture(page,surface);
  assertPalette(evidence.focus,key+' focus',{highlight});
  await target.click();
  await page.locator('.cell-picker-popover:popover-open').waitFor();
  evidence.open=await capture(page,surface);
  assertPalette(evidence.open,key+' open',{highlight});
  assert.equal(row(evidence.open,editable.field).buttonExpanded,'true',key+' no real open');
  await page.keyboard.press('Escape');
  assert.equal(await target.getAttribute('aria-expanded'),'false',key+' Escape');
 }
 const filename=await shot(page,key);
 cases.push({case:key,kind:'palette',mode,highlight,evidence,filename,result:'PASS'});
}
async function keyboardCase(page,{surface,width,selection}){
 const key='keyboard-'+surface+'-'+selection+'-'+width;
 await go(page,{surface,scenario:'level',mode:'all',width});
 const selector=rootFor(surface)+' [data-ui-reference-record-id="demo-0001"] .compact-stages[data-rev2="true"]';
 await page.locator(selector).scrollIntoViewIfNeeded();
 const target=page.locator(selector+' [data-stage-field="progressParty"] [data-level-editor="true"] button.cell-picker-trigger');
 await target.waitFor();
 const pre=await capture(page,surface);
 assert.equal(pre.mode,'editable',key+' expected party level editor 3 tracks');
 assert(row(pre,'progressParty').levelButton,key+' missing actual level picker');
 // Exercise actual keyboard Escape, not only status-pointer escape.
 await target.click();await page.locator('.cell-picker-popover:popover-open').waitFor();
 await page.keyboard.press('Escape');
 assert.equal(await target.getAttribute('aria-expanded'),'false',key+' level Escape failed');
 // Real pointer outside click must close a level picker too.
 await target.click();await page.locator('.cell-picker-popover:popover-open').waitFor();
 await page.mouse.click(5,5);
 assert.equal(await page.locator('.cell-picker-popover:popover-open').count(),0,
  key+' level outside click failed');
 await target.click();await page.locator('.cell-picker-popover:popover-open').waitFor();
 const selectedOption=page.locator('.cell-picker-popover:popover-open [role="option"][aria-selected="true"]');
 await selectedOption.waitFor();
 const selected=await selectedOption.textContent();
 assert.equal(selected?.trim(),'BTV',key+' unexpected starting level');
 // Popover visibility is immediate; focusFirstOption is on next RAF. Focus
 // the REAL selected option before sending real Chromium Arrow/Enter/Space.
 await selectedOption.focus();
 await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='option');
 const trail=[];
 const readFocus=()=>page.evaluate(()=>({text:document.activeElement?.textContent?.trim(),
  role:document.activeElement?.getAttribute('role')}));
 if(selection==='enter'){
  for(const name of ['ArrowDown','ArrowUp','ArrowUp']){
   await page.keyboard.press(name);trail.push({key:name,...await readFocus()});
  }
  assert.equal(trail.at(-1).text,'TTTU',key+' expected ArrowUp to select different level');
  await page.keyboard.press('Enter');
 }else{
  for(const name of ['ArrowUp','ArrowUp']){
   await page.keyboard.press(name);trail.push({key:name,...await readFocus()});
  }
  assert.equal(trail.at(-1).text,'Không',key+' expected Không option');
  await page.keyboard.press('Space');
 }
 const wanted=selection==='enter'?'TTTU':'Không';
 await page.waitForFunction(value=>{
  try{return JSON.parse(document.querySelector('[data-qa="raw-first-record"]')?.textContent??'{}').partyLevel===value}
  catch{return false}
 },wanted);
 assert.equal(await page.locator('.cell-picker-popover:popover-open').count(),0,key+' dialog not closed by keyboard');
 const patch=JSON.parse((await page.locator('[data-qa="last-patch"]').textContent())||'{}');
 assert.deepEqual(patch.changes,{partyLevel:wanted},key+' wrong synthetic writer field');
 const post=await capture(page,surface);
 assert.equal(post.source.partyLevel,wanted,key+' RAM projection failed');
 if(wanted==='Không'){
  const p=row(post,'progressParty');
  assert.equal(p.text,'Không phải trình',key+' party projection not suppressed');
  assert.equal(p.button,null,key+' status button persists under Không');
  assert.equal(p.editable,false,key+' status edit grant incorrectly retained under Không');
  assert.equal(post.source.progressParty,'Sở chưa trình',key+' UI rewrote raw source');
  for(const field of ['progressBuild','progressCouncil'])
   assert(row(post,field).button,key+' status sibling unexpectedly disabled '+field);
 }
 const filename=await shot(page,key);
 cases.push({case:key,kind:'keyboard-party-level',selection,pre,post,trail,patch,filename,result:'PASS'});
}
try{
 await ready();
 browser=await chromium.launch({headless:true,chromiumSandbox:false,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900},serviceWorkers:'block'});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(!['127.0.0.1','localhost'].includes(u.hostname)){
   network.push(u.href);return route.abort();
  }
  return route.continue();
 });
 const page=await context.newPage();
 for(const width of [1440,900,390]){
  for(const surface of ['list','popup']){
   await notRequired(page,{surface,width});
   for(const mode of ['all','guest','mixed']){
    await paletteCase(page,{surface,width,mode,highlight:false});
    await paletteCase(page,{surface,width,mode,highlight:true});
   }
   for(const selection of ['enter','space'])
    await keyboardCase(page,{surface,width,selection});
  }
 }
 assert.deepEqual(network,[],'Production/outside network detected');
 writeFileSync(join(out,'review-witness.json'),JSON.stringify({
  result:'PASS',kind:'mounted real ItemList/ReportDetailGrid',
  coverage:{notRequired:6,palette:36,keyboard:12,total:cases.length},
  cases,network,backendPersistence:'NOT TESTED: local RAM callbacks only',
 },null,2));
 console.log('PICKER_PARITY_STAGES_REVIEW_BROWSER_PASS cases='+cases.length+
  ' khong=6 palette=36 keyboard=12');
}catch(e){
 writeFileSync(join(out,'failure.txt'),String(e?.stack??e)+'\n'+viteLog);
 console.error('PICKER_PARITY_STAGES_REVIEW_BROWSER_FAIL '+String(e?.stack??e));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 vite.kill('SIGTERM');vite.stdout?.destroy();vite.stderr?.destroy();
}
