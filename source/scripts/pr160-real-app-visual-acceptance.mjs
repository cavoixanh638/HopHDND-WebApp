/**
 * PR #160 local visual acceptance for the actual Spark App vs its RAM-only UI.
 *
 * Requirements: local Auth/RTDB Emulators on 9099/9000, the approved rehearsal
 * root with 59 source rows, real App on 4173, and compact-QA build on 4175.
 * The only write is the two-step reference-layout CAS through the App UI into
 * demo-hdnd Emulator. No production host or credentials are accepted.
 * Screenshots/report are ignored qa-results artifacts; row content is omitted.
 */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const require=createRequire(resolve('cell-edit-service/package.json'));
const {chromium}=require('playwright');
const REAL='http://127.0.0.1:4173/pages.html';
const DEMO='http://127.0.0.1:4175/compact-qa.html?full=1&preview-role=admin';
const DB='http://127.0.0.1:9000';
const OUT=resolve('qa-results/pr160-visual-acceptance');
mkdirSync(OUT,{recursive:true});
const hash=value=>createHash('sha256').update(value).digest('hex');
const stable=value=>Array.isArray(value)?'['+value.map(stable).join(',')+']':
  value&&typeof value==='object'?'{'+Object.keys(value).sort().map(key=>
    JSON.stringify(key)+':'+stable(value[key])).join(',')+'}':JSON.stringify(value);
const rootRead=async()=>{
  const response=await fetch(DB+'/.json?ns=demo-hdnd',{
    headers:{Authorization:'Bearer owner'},signal:AbortSignal.timeout(8000)});
  assert.equal(response.status,200,'Local Emulator root read');
  assert.equal(response.headers.get('x-firebase-project-id'),'demo-hdnd',
    'Only the demo-hdnd Emulator is accepted');
  return response.json();
};
const profileOf=root=>root?.hdnd?.profile??{};
const businessOf=root=>({
  active:root?.hdnd?.datasetV2?.active??null,
  rows:root?.hdnd?.datasetV2?.active
    ?root.hdnd.datasetV2.generations?.[root.hdnd.datasetV2.active.generationId]?.items??{}
    :root?.hdnd?.items??{},
  permissions:root?.hdnd?.datasetV2?.active
    ?root.hdnd.datasetV2.permissions?.[root.hdnd.datasetV2.active.generationId]??{}
    :root?.hdnd?.permissions??{},
  legacyMirror:root?.items??{},
  freeze:root?.hdnd?.freezeControl??null,
  settings:root?.settings??null,
});
const viewports=[
  {name:'1920x1080',width:1920,height:1080},
  {name:'1600x900',width:1600,height:900},
  {name:'1440x900',width:1440,height:900},
  {name:'900x900',width:900,height:900},
  {name:'390x844',width:390,height:844},
];
const errors=[],external=[];
const localOnly=url=>{
  const parsed=new URL(url);
  return parsed.protocol==='http:'&&parsed.hostname==='127.0.0.1'&&
    [4173,4175,8787,9000,9099].includes(Number(parsed.port));
};
let browser;
try{
  const before=await rootRead();
  const initialRows=businessOf(before).rows;
  assert.equal(Object.keys(initialRows).length,59,
    'Visual App must load the approved 59-row Emulator rehearsal');
  const initialBusinessHash=hash(stable(businessOf(before)));
  const initialProfile=profileOf(before);
  assert.ok(Number.isInteger(initialProfile.revision)&&initialProfile.revision>0,
    'Shared list layout baseline exists');

  browser=await chromium.launch({headless:true,
    ...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{}),
    args:['--no-sandbox','--disable-dev-shm-usage']});
  const context=await browser.newContext({viewport:viewports[2],locale:'vi-VN'});
  await context.route('**/*',async route=>{
    const url=route.request().url();
    if(!localOnly(url)){external.push(url);return route.abort('blockedbyclient');}
    return route.continue();
  });
  const real=await context.newPage();
  real.on('pageerror',error=>errors.push(String(error)));
  real.on('console',message=>{
    if(message.type()==='error')errors.push(message.text());
  });
  await real.goto(REAL,{waitUntil:'domcontentloaded'});
  await real.locator('.item-data-table tbody tr').first().waitFor({timeout:30000});
  await real.waitForFunction(()=>document.querySelectorAll(
    '.item-data-table tbody tr').length===59,{timeout:30000});
  assert.equal(await real.locator('.item-data-table tbody tr').count(),59);
  await real.waitForFunction(()=>typeof window.__pr95EmulatorGoogleAdminSignIn==='function',
    {timeout:10000});
  const signIn=await real.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn());
  assert.equal(signIn.emailVerified,true);
  await real.waitForFunction(()=>{
    const probe=window.__pr95UiV2L3RightsProbe?.();
    return probe?.isAdmin===true&&probe.connected&&probe.commonBusy===false;
  },{timeout:25000});
  const toggle=real.getByRole('button',{
    name:'Mở hoặc đóng các tùy chọn hiển thị và công cụ quản trị Danh sách'});
  await toggle.waitFor({state:'visible',timeout:12000});
  assert.equal(await toggle.getAttribute('aria-expanded'),'false',
    'Rarely used controls start collapsed in the real App');
  await toggle.click();
  const preset=real.getByRole('button',{
    name:'Áp dụng bố cục mẫu như bản demo đã duyệt'});
  await preset.waitFor({state:'visible',timeout:12000});
  await preset.click();
  const confirm=real.getByRole('group',{name:'Xác nhận áp dụng bố cục mẫu'});
  await confirm.waitFor({state:'visible',timeout:8000});
  const noWriteRevision=profileOf(await rootRead()).revision;
  await confirm.getByRole('button',{name:'Hủy'}).click();
  await confirm.waitFor({state:'hidden',timeout:8000});
  assert.equal(profileOf(await rootRead()).revision,noWriteRevision,
    'Cancel leaves the shared layout untouched');
  await preset.click();
  const confirmAgain=real.getByRole('group',{name:'Xác nhận áp dụng bố cục mẫu'});
  await confirmAgain.waitFor({state:'visible',timeout:8000});
  await confirmAgain.getByRole('button',{name:'Xác nhận áp dụng mẫu'}).click();
  await confirmAgain.waitFor({state:'hidden',timeout:15000});
  const savedRoot=await rootRead();
  const confirmedRevision=profileOf(savedRoot).revision;
  assert.ok(confirmedRevision===noWriteRevision||confirmedRevision===noWriteRevision+1,
    'Confirmed layout either matches the existing preset or commits once through shared-profile CAS');
  const presetWasNoop=confirmedRevision===noWriteRevision;
  assert.equal(hash(stable(businessOf(savedRoot))),initialBusinessHash,
    'The full business dataset, permissions and freeze state did not change');
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-expanded'),'false',
    'Low-frequency admin options return to the collapsed default');
  await real.waitForFunction(()=>document.querySelector('.item-data-table .item-heading-row th'),
    {timeout:12000});
  const headers=await real.locator('.item-data-table .item-heading-row th')
    .evaluateAll(nodes=>nodes.map(node=>({key:node.getAttribute('data-column-key'),
      label:node.innerText.trim(),width:Math.round(node.getBoundingClientRect().width)})));
  assert.deepEqual(headers.map(header=>header.key),[
    'displayCode','content','partyLevel','room','specificProgress','note'],
    'The actual rendered real-App columns follow the reference grouping/order');
  assert.equal(await real.locator('.item-data-table tbody tr').count(),59,
    'All 59 source rows remain visible after the preset');

  const realMetrics=[];
  for(const viewport of viewports){
    await real.setViewportSize({width:viewport.width,height:viewport.height});
    await real.waitForTimeout(100);
    const metrics=await real.evaluate(()=>{
      const region=document.querySelector('.item-table-scroll');
      const summary=document.querySelector('.item-summary-grid');
      const table=document.querySelector('.item-data-table');
      return {viewport:{width:innerWidth,height:innerHeight},
        documentWidth:document.documentElement.scrollWidth,
        tableViewport:{width:region?.clientWidth??0,scrollWidth:region?.scrollWidth??0},
        summary:summary?summary.getBoundingClientRect().toJSON():null,
        table:table?table.getBoundingClientRect().toJSON():null,
        rowHeight:table?.querySelector('tbody tr')?.getBoundingClientRect().height??0,
        headers:[...table?.querySelectorAll('.item-heading-row th')??[]].map(th=>({
          key:th.getAttribute('data-column-key'),width:Math.round(th.getBoundingClientRect().width)}))};
    });
    realMetrics.push({name:viewport.name,...metrics});
    await real.screenshot({path:resolve(OUT,'real-'+viewport.name+'.png'),
      fullPage:false,animations:'disabled'});
  }

  const demo=await context.newPage();
  demo.on('pageerror',error=>errors.push(String(error)));
  demo.on('console',message=>{
    if(message.type()==='error')errors.push(message.text());
  });
  await demo.goto(DEMO,{waitUntil:'domcontentloaded'});
  await demo.locator('.item-data-table tbody tr').first().waitFor({timeout:20000});
  await demo.waitForFunction(()=>document.querySelectorAll(
    '.item-data-table tbody tr').length===27,{timeout:20000});
  const demoMetrics=[];
  for(const viewport of viewports){
    await demo.setViewportSize({width:viewport.width,height:viewport.height});
    await demo.waitForTimeout(100);
    const metrics=await demo.evaluate(()=>{
      const region=document.querySelector('.item-table-scroll');
      const summary=document.querySelector('.item-summary-grid');
      const table=document.querySelector('.item-data-table');
      return {viewport:{width:innerWidth,height:innerHeight},
        documentWidth:document.documentElement.scrollWidth,
        tableViewport:{width:region?.clientWidth??0,scrollWidth:region?.scrollWidth??0},
        summary:summary?summary.getBoundingClientRect().toJSON():null,
        table:table?table.getBoundingClientRect().toJSON():null,
        rowHeight:table?.querySelector('tbody tr')?.getBoundingClientRect().height??0,
        rows:table?.querySelectorAll('tbody tr').length??0,
        headers:[...table?.querySelectorAll('.item-heading-row th')??[]].map(th=>({
          key:th.getAttribute('data-column-key'),width:Math.round(th.getBoundingClientRect().width)}))};
    });
    demoMetrics.push({name:viewport.name,...metrics});
    await demo.screenshot({path:resolve(OUT,'demo-'+viewport.name+'.png'),
      fullPage:false,animations:'disabled'});
  }
  const parity=viewports.map((viewport,index)=>{
    const realView=realMetrics[index],demoView=demoMetrics[index];
    assert.ok(realView.documentWidth<=viewport.width,
      `Real App has no page-level horizontal overflow at ${viewport.name}`);
    assert.ok(demoView.documentWidth<=viewport.width,
      `Demo has no page-level horizontal overflow at ${viewport.name}`);
    assert.equal(demoView.rows,27,`Demo renders its 27 synthetic reference rows at ${viewport.name}`);
    assert.deepEqual(realView.headers.map(header=>header.key),
      demoView.headers.map(header=>header.key),
      `Real App and demo render the same column order at ${viewport.name}`);
    return {viewport:viewport.name,tableViewportWidthDelta:
      realView.tableViewport.width-demoView.tableViewport.width,
      tableTopDelta:Math.round(realView.table.y-demoView.table.y),
      realRows:59,demoRows:demoView.rows,
      columns:realView.headers.map(header=>header.key),
      realDocumentWidth:realView.documentWidth,demoDocumentWidth:demoView.documentWidth};
  });
  assert.equal(external.length,0,'The local App made no external network requests');
  assert.deepEqual(errors,[],'No browser runtime or console errors');
  mkdirSync(OUT,{recursive:true});
  const report={
    status:'PASS_LOCAL_REAL_APP_VISUAL_ACCEPTANCE',
    sourceCommit:'2c7c66c577ab987f1d834c964b9acf8890ebde6d',
    project:'demo-hdnd',functionsEmulator:false,productionWrites:0,
    reference:'compact-qa build from the unchanged 09 Nov UI parent used by the linked demo; live GitHub Pages probe was network-inaccessible',
    sourceRows:59,presetConfirmedByUi:true,presetWasNoop,
    presetCasRevision:profileOf(savedRoot).revision,
    businessDataHashBefore:initialBusinessHash,
    businessDataHashAfter:hash(stable(businessOf(savedRoot))),
    actualHeaders:headers,viewports:realMetrics,demo:demoMetrics,
    parity,
    browserErrors:errors,externalRequests:external,screenshots:'qa-results/pr160-visual-acceptance/',
  };
  writeFileSync(resolve(OUT,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({status:report.status,sourceRows:59,
    presetCasRevision:report.presetCasRevision,presetWasNoop,
    viewports:viewports.map(v=>v.name),
    businessDataUnchanged:report.businessDataHashBefore===report.businessDataHashAfter,
    parity,
    actualHeaders:headers,externalRequests:external.length,browserErrors:errors.length}));
}catch(error){
  console.error(error?.stack??String(error));
  process.exitCode=1;
}finally{try{await browser?.close()}catch{}}
