/** Editable hover-motion audit against the LIVE React synthetic preview.
 * No CSS changes, no Firebase/Sheets. Reports computed 0/90/260ms transforms,
 * transition, active target and any clip ancestor for each member editor.
 */
import {createServer} from 'node:http';
import {readFileSync,statSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
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
 await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 await page.goto(base+'/compact-qa.html?full=1&preview-role=admin',{waitUntil:'networkidle'});
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
 console.log('HOVER_MOTION_DIAGNOSTIC '+JSON.stringify(report));
}finally{
 await context?.close().catch(()=>{});
 await browser?.close().catch(()=>{});
 await new Promise(done=>server.close(done));
}
