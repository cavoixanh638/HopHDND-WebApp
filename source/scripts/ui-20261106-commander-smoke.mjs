/** Commander synthetic browser *baseline smoke*. Not a substitute for the worker
 * acceptance scripts for 4-person reference skin and 5 individual widths.
 * No live Firebase, Sheets, or external host. Exact SHA is pinned by CI.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname,join,sep} from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const root=resolve('dist-compact-qa'),out=resolve('ui-20261106-artifacts');
mkdirSync(out,{recursive:true});
const requests=[],errors=[],results=[];
const server=createServer((req,res)=>{
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  const file=resolve(root,'.'+(path==='/'?'/compact-qa.html':path));
  if(!file.startsWith(root+sep)||!statSync(file).isFile())throw Error('404');
  res.writeHead(200,{'content-type':({
   '.html':'text/html','.js':'text/javascript','.css':'text/css',
   '.svg':'image/svg+xml','.png':'image/png'
  })[extname(file)]??'application/octet-stream','cache-control':'no-store'});
  res.end(readFileSync(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/compact-qa.html';
let browser;
try{
 browser=await chromium.launch({headless:true,chromiumSandbox:false,executablePath:process.env.CHROME_PATH||undefined,
  args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({serviceWorkers:'block'});
 context.on('request',request=>requests.push(request.url()));
 for(const width of [1440,900,390]){
  const height=width===390?844:900;
  const page=await context.newPage();
  page.setDefaultTimeout(15000);
  await page.setViewportSize({width,height});
  page.on('pageerror',e=>errors.push(String(e)));
  for(const role of ['guest','admin']){
   await page.goto(base+'?full=1&preview-role='+role,{waitUntil:'networkidle'});
   const app=page.locator('[data-preview="pr95-l4-full"]');
   await app.waitFor();
   assert.equal(await app.getAttribute('data-role'),role);
   await page.locator('.item-data-table').first().waitFor();
   const evidence=await page.evaluate(()=>{
    const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();
     return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return {role:document.querySelector('[data-preview]')?.getAttribute('data-role'),
      rows:document.querySelectorAll('.item-data-table tbody tr').length,
      stages:[...document.querySelectorAll('.compact-stages')].slice(0,6).map(stage=>({
       layout:stage.getAttribute('data-level-layout'),rect:rect(stage),
       rows:[...stage.querySelectorAll('.compact-stage-row')].map(row=>({
        field:row.getAttribute('data-stage-field'),rect:rect(row),
        label:rect(row.querySelector('.compact-stage-label')),
        level:rect(row.querySelector('[data-level-editor]')),
        status:rect(row.querySelector('.compact-stage-state'))
       }))
      })),
      staff:[...document.querySelectorAll('.cell-picker-trigger')].slice(0,12)
       .map(element=>({text:element.textContent?.trim().slice(0,60),rect:rect(element)}))
    };
   });
   assert(evidence.rows>0,'Missing synthetic rows '+role+' '+width);
   const image=join(out,'full-list-'+role+'-'+width+'.png');
   await page.screenshot({path:image,fullPage:false});
   results.push({viewport:{width,height},role,page:'list',evidence,image});
   if(role==='admin'){
    await page.locator('.pr95-preview-gear').click();
    const menu=page.locator('#pr95-preview-gear-menu');
    await menu.getByRole('button',{name:'Tùy chỉnh cột và hiển thị'}).click();
    await page.locator('[aria-label="Danh sách hồ sơ demo"]').waitFor();
    await page.screenshot({path:join(out,'full-layout-admin-'+width+'.png')});
    results.push({role,page:'layout-admin',width,
      formControls:await page.locator('[aria-label="Danh sách hồ sơ demo"] input').count()});
   }else{
    assert.equal(await page.locator('[data-ui-reference-nav="reports"]').count(),0,
     'Guest has unauthorized admin navigation');
   }
  }
  await page.goto(base+'?mixed=1',{waitUntil:'networkidle'});
  await page.locator('.compact-stages[data-level-layout="editable"]').first().waitFor();
  await page.locator('.compact-stages[data-level-layout="readonly"]').first().waitFor();
  await page.screenshot({path:join(out,'mixed-legacy-list-'+width+'.png')});
  results.push({page:'mixed-list',width,editable:await page.locator(
   '.compact-stages[data-level-layout="editable"]').count(),
   readonly:await page.locator('.compact-stages[data-level-layout="readonly"]').count()});
  for(const mode of ['readonly','mixed']){
   const url=base+'?popup=1'+(mode==='mixed'?'&popup-mixed=1':'');
   await page.goto(url,{waitUntil:'networkidle'});
   await page.locator('.report-detail-grid').first().waitFor();
   if(mode==='mixed'){
    await page.getByRole('button',{name:'Chỉnh sửa nháp'}).first().click();
    await page.locator('.report-detail-grid .compact-stages[data-level-layout="editable"]').first().waitFor();
   }else{
    await page.locator('.report-detail-grid .compact-stages[data-level-layout="readonly"]').first().waitFor();
   }
   const popup=await page.evaluate(()=>{
    const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width,height:r.height};};
    return [...document.querySelectorAll('.report-detail-grid .compact-stages')].slice(0,4)
      .map(stage=>({mode:stage.getAttribute('data-level-layout'),rect:rect(stage),
        stages:[...stage.querySelectorAll('.compact-stage-row')].map(row=>({
         key:row.dataset.stageField,label:rect(row.querySelector('.compact-stage-label')),
         status:rect(row.querySelector('.compact-stage-state'))}))}));
   });
   assert(popup.length>0,'Missing popup stage '+mode+' '+width);
   const screenshot=join(out,'popup-'+mode+'-'+width+'.png');
   await page.screenshot({path:screenshot,fullPage:false});
   results.push({page:'popup',width,mode,popup,screenshot});
  }
  await page.close();
 }
 assert.equal(errors.length,0,'Browser errors '+JSON.stringify(errors));
 assert(requests.every(u=>{const host=new URL(u).hostname;
  return host==='127.0.0.1'||host==='localhost';}),
  'Unexpected external network request: '+JSON.stringify(requests.filter(u=>
    !['127.0.0.1','localhost'].includes(new URL(u).hostname))));
 const log={status:'BASELINE_SMOKE_PASS_FEATURE_ACCEPTANCE_PENDING',
  sourceSha:process.env.GITHUB_SHA??null,results,errors,requestCount:requests.length};
 writeFileSync(join(out,'commander-smoke-rects.json'),JSON.stringify(log,null,2));
 console.log('UI_20261106_COMMANDER_SMOKE_PASS '+JSON.stringify({
  sourceSha:log.sourceSha,screenshots:results.length,requests:requests.length}));
}catch(e){console.error('UI_20261106_COMMANDER_SMOKE_FAIL '+(e.stack??e));process.exitCode=1;}
finally{await browser?.close();server.close();}
