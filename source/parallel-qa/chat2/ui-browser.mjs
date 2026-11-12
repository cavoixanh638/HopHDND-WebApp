/** Real Chromium interaction with mounted production UI components and synthetic
 * data/lease-manager ONLY; NOT Firebase integration or production acceptance.
 * Run from source/: node parallel-qa/chat2/ui-browser.mjs
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer as createViteServer} from 'vite';

const root=process.cwd(),out=resolve('parallel-qa/chat2/artifacts');
mkdirSync(out,{recursive:true});
const require=createRequire(resolve('cell-edit-service/package.json'));
const {chromium}=require('playwright');
let vite,browser;
const results=[],images=[],external=[];
const source='synthetic mounted React components; no Auth/RTDB/Functions, no production access';
const snap=page=>page.evaluate(()=>window.__chat2.snapshot());
const save=async(page,name)=>{
  if(!page||page.isClosed())return;
  const file=resolve(out,name+'.png');
  try{await page.screenshot({path:file,fullPage:true,animations:'disabled'});images.push(name+'.png');}
  catch(e){console.error('SCREENSHOT_FAILED',name,String(e));}
};
const check=async(name,run,page)=>{
  try{
    const detail=await run();
    results.push({name,status:'PASS',detail:detail??null});
    console.log('CHAT2_BROWSER_PASS',name);
  }catch(e){
    results.push({name,status:'FAIL',error:String(e?.stack??e)});
    console.error('CHAT2_BROWSER_FAIL',name,String(e?.stack??e));
    await save(page,'FAIL-'+name.replace(/[^a-z0-9-]/gi,'-'));
  }
};
try{
  vite=await createViteServer({root,configFile:resolve('vite.config.ts'),logLevel:'error',
    server:{host:'127.0.0.1',port:0,strictPort:false}});
  await vite.listen();
  const port=vite.httpServer.address().port;
  const base='http://127.0.0.1:'+port+'/parallel-qa/chat2/index.html';
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const make=async(mode,width,height=800)=>{
    const context=await browser.newContext({viewport:{width,height},locale:'vi-VN',serviceWorkers:'block'});
    const page=await context.newPage();
    page.on('request',request=>{
      if(!request.url().startsWith('http://127.0.0.1:'+port+'/')&&
         !request.url().startsWith('data:')&&!request.url().startsWith('blob:'))external.push(request.url());
    });
    await page.goto(base+'?mode='+mode,{waitUntil:'networkidle'});
    await page.locator(mode==='filter'?'dialog[open]':'input[aria-label="Ô nhập thử nghiệm"]').waitFor();
    return {context,page};
  };
  for(const width of [390,900,1440]){
    const {context,page}=await make('filter',width,width===390?760:900);
    await check('filter-Esc-empty-'+width,async()=>{
      const search=page.getByRole('searchbox',{name:'Tìm kiếm tên CV'});
      await search.focus();
      await page.keyboard.press('Escape');
      await page.waitForSelector('dialog[open]',{state:'detached',timeout:4000});
      assert.equal(await page.locator('dialog[open]').count(),0);
      return {viewport:width,role:'synthetic guest-style filter, no Auth'};
    },page);
    await check('filter-filled-then-empty-'+width,async()=>{
      await page.locator('[data-qa="reopen"]').click();
      await page.locator('dialog[open]').waitFor();
      const person=page.getByRole('searchbox',{name:'Tìm kiếm tên CV'});
      await person.fill('Nguyễn Thị Hồng');
      await save(page,'filter-filled-'+width);
      await page.keyboard.press('Escape');
      assert.equal(await person.inputValue(),'','first Escape removes only the active specialist filter');
      assert.equal(await page.locator('dialog[open]').count(),1,'first Escape must not dismiss popup');
      await page.keyboard.press('Escape');
      await page.waitForSelector('dialog[open]',{state:'detached',timeout:4000});
      return {viewport:width,utf8:true};
    },page);
    await check('filter-room-value-'+width,async()=>{
      await page.locator('[data-qa="reopen"]').click();
      await page.locator('dialog[open]').waitFor();
      const room=page.getByRole('combobox',{name:'Lọc theo Phòng'});
      await room.selectOption('Phòng Tổng hợp');
      await room.focus();
      await page.keyboard.press('Escape');
      assert.equal(await room.inputValue(),'','Escape should clear active room only');
      assert.equal(await page.locator('dialog[open]').count(),1);
      const geometry=await page.evaluate(()=>({
        viewport:window.innerWidth,bodyScrollWidth:document.documentElement.scrollWidth,
        dialog:document.querySelector('dialog')?.getBoundingClientRect().toJSON()
      }));
      assert.ok(geometry.bodyScrollWidth<=geometry.viewport+2,'whole-page horizontal overflow '+JSON.stringify(geometry));
      await save(page,'filter-room-cleared-'+width);
      return geometry;
    },page);
    await context.close();
  }
  for(const width of [390,1440]){
    const {context,page}=await make('lease',width,width===390?760:900);
    await check('lease-blur-before-ACK-'+width,async()=>{
      const input=page.getByRole('textbox',{name:'Ô nhập thử nghiệm'});
      await input.focus();
      await page.waitForFunction(()=>window.__chat2.snapshot().requests===1,{timeout:6000});
      await page.locator('[data-qa="outside"]').focus();
      await page.evaluate(()=>window.__chat2.ack());
      await page.waitForFunction(()=>window.__chat2.snapshot().events.includes('ack:1'),null,{timeout:6000});
      // Evidence screenshot is saved BEFORE assertion to expose the original stale-ACK bug.
      await save(page,'lease-late-ACK-'+width);
      await page.waitForTimeout(100);
      const state=await snap(page);
      assert.equal(state.held,false,'blur-before-ACK leaked an acquired lease');
      assert.equal(state.readOnly,true,'blur-before-ACK reopened an unfocused editor');
      assert.ok(state.events.includes('cancel:held'),'server-confirmed lease must be released after stale ACK');
      return state;
    },page);
    await context.close();
  }
  {
    const {context,page}=await make('lease',1440,900);
    await check('lease-unmount-before-ACK',async()=>{
      await page.getByRole('textbox',{name:'Ô nhập thử nghiệm'}).focus();
      await page.waitForFunction(()=>window.__chat2.snapshot().requests===1);
      await page.locator('[data-qa="unmount"]').click();
      await page.evaluate(()=>window.__chat2.ack());
      await page.waitForFunction(()=>window.__chat2.snapshot().events.includes('ack:1'),null,{timeout:6000});
      await page.waitForTimeout(100);
      const state=await snap(page);
      assert.equal(state.inputPresent,false);
      assert.equal(state.held,false,'unmount left a stale lease');
      return state;
    },page);
    await context.close();
  }
  {
    const {context,page}=await make('lease',1440,900);
    await check('lease-denial-is-not-ACK',async()=>{
      const input=page.getByRole('textbox',{name:'Ô nhập thử nghiệm'});
      await input.focus();
      await page.waitForFunction(()=>window.__chat2.snapshot().requests===1);
      await page.evaluate(()=>window.__chat2.deny());
      await page.getByRole('status').filter({hasText:'Mất mạng giả lập'}).waitFor({timeout:6000});
      const state=await snap(page);
      assert.equal(state.held,false);
      assert.equal(state.readOnly,true);
      await save(page,'lease-denied-1440');
      return state;
    },page);
    await context.close();
  }
  {
    const {context,page}=await make('lease',900,800);
    await check('lease-rapid-refocus-fenced',async()=>{
      const input=page.getByRole('textbox',{name:'Ô nhập thử nghiệm'});
      await input.focus();
      await page.waitForFunction(()=>window.__chat2.snapshot().requests===1);
      await page.locator('[data-qa="outside"]').focus();
      await input.focus();
      await page.evaluate(()=>window.__chat2.ack());
      await page.waitForFunction(()=>window.__chat2.snapshot().requests>=2,null,{timeout:7000});
      await page.waitForFunction(()=>window.__chat2.snapshot().held===true,null,{timeout:5000});
      const prior=await snap(page);
      assert.ok(prior.events.indexOf('cancel:held')<prior.events.indexOf('request:2'),'new acquire must follow old release');
      await input.fill('Đặng Thị Bích');
      assert.equal(await page.locator('[data-qa="value"]').innerText(),'Đặng Thị Bích');
      await page.locator('[data-qa="outside"]').focus();
      await page.waitForFunction(()=>window.__chat2.snapshot().held===false,null,{timeout:5000});
      await save(page,'lease-refocus-900');
      return await snap(page);
    },page);
    await context.close();
  }
  assert.deepEqual(external,[],'fixture attempted external requests');
}catch(e){
  results.push({name:'runner-startup',status:'FAIL',error:String(e?.stack??e)});
  console.error('CHAT2_BROWSER_RUNNER_FAIL',e);
}finally{
  try{await browser?.close();}catch{}
  try{await vite?.close();}catch{}
  const witness={kind:'CH2_SYNTHETIC_COMPONENT_ONLY',source,at:new Date().toISOString(),
    head:process.env.GITHUB_SHA??null,results,images,external,
    passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length};
  writeFileSync(resolve(out,'witness.json'),JSON.stringify(witness,null,2)+'\n');
  console.log('CHAT2_BROWSER_WITNESS',JSON.stringify({
    passed:witness.passed,failed:witness.failed,images:witness.images,external:witness.external
  }));
  if(witness.failed||external.length)process.exitCode=1;
}
