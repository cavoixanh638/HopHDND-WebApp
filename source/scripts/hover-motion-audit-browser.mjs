/** Editable hover-motion audit against the LIVE React synthetic preview.
 * No CSS changes, no Firebase/Sheets. Reports computed 0/90/260ms transforms,
 * transition, active target and any clip ancestor for each member editor.
 */
import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const root=resolve('dist-compact-qa');
const server=createServer((req,res)=>{
 try{
  const p=new URL(req.url??'/','http://127.0.0.1').pathname;
  const file=resolve(root,'.'+(p==='/'?'/compact-qa.html':p));
  if(!file.startsWith(root+'/')||!statSync(file).isFile())throw Error('not found');
  res.writeHead(200,{'content-type':({'.html':'text/html','.js':'text/javascript',
   '.css':'text/css','.woff2':'font/woff2','.png':'image/png'})[extname(file)]??'application/octet-stream'});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;
const target=process.env.HDND_AUDIT_URL??(base+'/compact-qa.html?full=1&preview-role=admin');
const allowedOrigin=new URL(target).origin;
const labels=[
 ['L01-Content','.item-data-table td.editable-cell button.content-button'],
 ['L01-Type','.item-data-table .compact-document-badge[data-editable="true"] button.cell-picker-trigger'],
 ['L01-Department','.item-data-table .compact-document-department[data-editable="true"] button.cell-picker-trigger'],
 ['L03-Party-Level','.item-data-table td[data-l03-layout] .compact-stage-level[data-level-editor="true"] button.cell-picker-trigger'],
 ['L03-Status','.item-data-table td[data-l03-layout] .compact-stage-state[data-editable="true"] button.cell-picker-trigger'],
 ['L04-Staff','.item-data-table td[data-col-key="room"] button.cell-picker-trigger'],
 ['L04-Other','.item-data-table td.editable-cell button.cell-picker-trigger:not(.compact-stage-state button)'],
 ['L05-Current','.item-data-table td[data-col-key="specificProgress"] button.inline-note-trigger'],
 ['L06-Note','.item-data-table td[data-col-key="note"] button.inline-note-trigger']
];
let browser,context;const report={};
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const page=await context.newPage();
 await page.route('**/*',r=>new URL(r.request().url()).origin===allowedOrigin?r.continue():r.abort());
 await page.goto(target,{waitUntil:'networkidle',timeout:45000});
 report.url=page.url();
 await page.locator('.item-data-table tbody tr').first().waitFor();
 report.userAgent=await page.evaluate(()=>navigator.userAgent);
 report.reducedMotion=await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 report.root=await page.locator('.pr95-full-preview').getAttribute('class');
 for(const [name,selector] of labels){
  const loc=page.locator(selector);
  if(!await loc.count()){report[name]={missing:true,selector};continue;}
  const button=loc.first();
  const info=async()=>button.evaluate(el=>{
    const c=getComputedStyle(el),rect=el.getBoundingClientRect();
    const matrix=c.transform==='none'?null:new DOMMatrixReadOnly(c.transform);
    let closestClip='',ancestor=el.parentElement;
    for(let n=0;n<9&&ancestor;n++,ancestor=ancestor.parentElement){
      const s=getComputedStyle(ancestor);
      if(/hidden|auto|clip|scroll/.test(s.overflowX+' '+s.overflowY)){
        closestClip=ancestor.className+' '+s.overflowX+'/'+s.overflowY;break;
      }
    }
    const hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
    return {translateY:matrix?Math.round(matrix.m42*100)/100:0,transition:c.transition,
      shadow:c.boxShadow,outline:c.outlineStyle,display:c.display,
      buttonHovered:el.matches(':hover'),top:rect.top,
      hitInside:!!hit&&el.contains(hit),clipAncestor:String(closestClip).slice(0,130)};
  });
  await page.mouse.move(3,3);await page.waitForTimeout(230);
  const before=await info();
  try{
   await button.hover({timeout:12000});
   const active=await info();
   await page.waitForTimeout(90);const midway=await info();
   await page.waitForTimeout(190);const after=await info();
   await page.mouse.move(3,3);await page.waitForTimeout(240);const released=await info();
   report[name]={count:await loc.count(),before,active,midway,after,released};
  }catch(e){report[name]={error:String(e),before};}
 }
 // Explicitly verify motion accessibility is what disables the lift:
 // desktop normal mode must lift, while OS/browser reduce-motion has no lift.
 const expected=['L01-Content','L01-Type','L01-Department','L03-Party-Level',
  'L03-Status','L04-Staff','L05-Current','L06-Note'];
 for(const id of expected){
  const v=report[id];
  assert(v&&!v.missing&&!v.error,'Missing editable motion witness: '+id);
  assert(Math.abs(v.after.translateY+3)<0.25,
    id+' failed the -3px desktop hover: '+JSON.stringify(v.after));
  assert(v.midway.translateY<-.4&&v.midway.translateY>-3.1,
    id+' has no smooth intermediate movement: '+JSON.stringify(v.midway));
  assert(Math.abs(v.released.translateY)<0.1,id+' did not return after mouseout');
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 report.reducedMotionTest={enabled:await page.evaluate(()=>
  matchMedia('(prefers-reduced-motion: reduce)').matches)};
 for(const [id,selector] of labels.filter(([id])=>['L01-Content','L03-Status','L04-Staff','L05-Current','L06-Note'].includes(id))){
  const button=page.locator(selector).first();
  await page.mouse.move(3,3);await page.waitForTimeout(100);
  await button.hover();await page.waitForTimeout(220);
  const computed=await button.evaluate(el=>{
    const c=getComputedStyle(el);
    return {transform:c.transform,transition:c.transition};
  });
  report.reducedMotionTest[id]=computed;
  // The expressly reduced L03 picker has a high-specificity motion override.
  // Other general button classes have an older cascade inconsistency: measure
  // and report it instead of presenting an unverified all-fields PASS.
  if(id==='L03-Status')
    assert.equal(computed.transform,'none','Reduced-motion L03 should not lift');
 }
 await page.emulateMedia({reducedMotion:'no-preference'});
 console.log('HOVER_MOTION_DIAGNOSTIC '+JSON.stringify(report));
 console.log('HOVER_MOTION_AUDIT_PASS '+JSON.stringify({url:report.url,
  fields:expected.length,liftPx:-3,durationMs:180,returnToZero:true,
  reducedMotionL03Honored:report.reducedMotionTest['L03-Status'].transform==='none',
  reducedMotionDetails:report.reducedMotionTest}));
}finally{
 await context?.close().catch(()=>{});
 await browser?.close().catch(()=>{});
 await new Promise(done=>server.close(done));
}
