/** Baseline e095 independent, unmodified real fixture screenshot capture.
 * Copy this runner into detached baseline worktree; never change its App source.
 */
import {spawn} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
const root=resolve(process.env.PICKER_CONTENT_BASELINE_DIR??'qa-results/picker-parity-content/before');
mkdirSync(root,{recursive:true});
const port=5211,origin='http://127.0.0.1:'+port;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--mode','preact',
 '--host','127.0.0.1','--port',String(port),'--strictPort'],{
 cwd:resolve('.'),stdio:['ignore','pipe','pipe']});
let log='',browser;
for(const s of [server.stdout,server.stderr])s.on('data',x=>log=(log+String(x)).slice(-16000));
try{
 for(let i=0;i<120;i++){
  if(server.exitCode!==null)throw Error('Vite exited: '+log);
  try{if((await fetch(origin+'/ui-20261106-picker-fixture.html')).ok)break}catch{}
  await delay(200);
 }
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage(),scenes=[];
 for(const width of [1440,900,390]){
  await page.setViewportSize({width,height:width===390?844:900});
  for(const surface of ['list','popup'])for(const mode of ['edit','mixed','guest']){
   await page.goto(origin+'/ui-20261106-picker-fixture.html?surface='+surface+'&mode='+mode);
   await page.locator('[data-ui-reference-group="L01"]').first().waitFor({timeout:12000});
   if(surface==='popup'&&mode!=='guest'){
    const toggle=page.getByRole('button',{name:'Chỉnh sửa nháp'});
    if(await toggle.count())await toggle.click();
   }
   const id=[width,surface,mode].join('-')+'-normal';
   const selected=await page.evaluate(()=>{
    const el=document.querySelector('[data-ui-reference-group="L01"]');
    const h=el?.querySelector('.compact-document-heading');
    const summary=e=>{if(!e)return null;const b=e.getBoundingClientRect(),s=getComputedStyle(e);
      return {x:b.x,y:b.y,w:b.width,h:b.height,bg:s.backgroundColor,
      fontSize:s.fontSize,fontWeight:s.fontWeight,padding:s.padding,border:s.borderColor}};
    return {group:summary(el),heading:summary(h),
      department:summary(h?.querySelector('[data-ui-reference-part="department"]')),
      type:summary(h?.querySelector('[data-ui-reference-part="type"]')),
      departmentButton:summary(h?.querySelector('[data-ui-reference-part="department"] button.cell-picker-trigger')),
      typeButton:summary(h?.querySelector('[data-ui-reference-part="type"] button.cell-picker-trigger'))};
   });
   writeFileSync(join(root,id+'.json'),JSON.stringify(selected,null,2));
   writeFileSync(join(root,id+'.png'),await page.screenshot({fullPage:false}));
   scenes.push({id,selected});
  }
 }
 assert.equal(scenes.length,18,'baseline matrix incomplete');
 writeFileSync(join(root,'summary.json'),JSON.stringify({result:'CAPTURED',baseline:'e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa',scenes},null,2));
 console.log('PICKER_PARITY_CONTENT_BASELINE_CAPTURED '+scenes.length);
}catch(error){
 writeFileSync(join(root,'failure.txt'),String(error?.stack??error)+'\n'+log);
 console.error('PICKER_PARITY_CONTENT_BASELINE_FAIL '+String(error?.stack??error));
 process.exitCode=1;
}finally{
 await browser?.close().catch(()=>{});
 server.kill('SIGTERM');server.stdout?.destroy();server.stderr?.destroy();
}
