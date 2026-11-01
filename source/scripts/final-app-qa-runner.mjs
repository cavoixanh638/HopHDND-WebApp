/**
 * FINAL-APP-REVIEW — QA-only REAL business App browser journey.
 * Inputs are assembled ephemeral PR145+PR146+PR143 Git checkout, NOT Chat1
 * candidate. Only localhost demo-hdnd Auth / Functions / RTDB Emulator.
 * Never use fixture-only component pages as full E2E acceptance.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import {createServer as createViteServer} from 'vite';
import * as XLSX from 'xlsx';

const requirePlaywright=createRequire(resolve('cell-edit-service/package.json'));
const {chromium}=requirePlaywright('playwright');
const PROJECT='demo-hdnd',NAMESPACE='demo-hdnd';
const DB='http://127.0.0.1:9000',SITE='http://127.0.0.1:4179';
const ROOT=resolve('qa-results/final-app-review');
const RULES=resolve(ROOT,'generated/shared.rules.json');
const reportPath=resolve(ROOT,'witness.json');
const hash=s=>createHash('sha256').update(s).digest('hex');
const refs={PR142:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847',
  PR145:'bf78bdddf336f16082ad68db1c1f39723bc95251',
  PR146:'9424a52767e8acb57a1f50feba2515787fb2ad26',
  PR143:'c039405a9ad6802ae1d412465cc91b88745a0371'};
const git=(...args)=>{const r=spawnSync('git',args,{encoding:'utf8'});
  if(r.status!==0)throw Error('QA_GIT '+args.join(' ')+': '+r.stderr);
  return r.stdout.trim();};
const checkout=git('rev-parse','HEAD');
const manifest=JSON.parse(readFileSync(resolve(ROOT,'generated/rules-manifest.json'),'utf8'));
const expected=JSON.parse(readFileSync(RULES,'utf8'));
assert.equal(manifest.combinedSha256,hash(readFileSync(RULES)));
assert.equal(manifest.kind,'UNOFFICIAL_QA_SHARED_RULES_NOT_FOR_DEPLOY');
for(const k of ['FIREBASE_SERVICE_ACCOUNT','GOOGLE_APPLICATION_CREDENTIALS']){
  if(process.env[k])throw Error('PRODUCTION CREDENTIAL ENV FORBIDDEN '+k);
}
if(process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!==PROJECT)
  throw Error('Unexpected project ID');
const session=mkdtempSync(join(tmpdir(),'hophdnd-full-app-qa-'));
const events=[],cases=[],screenshots=[],logs={firebase:'',parent:'',vite:''};
let emulator=null,parentServer=null,vite=null,browser=null,contextAdmin=null,contextGuest=null;
let admin=null,secondAdmin=null,guest=null;
let sourceRows=[],excelPath='',seedPointer=null,adminIdentity=null,guestIdentity=null;
let baseProfile=null;
mkdirSync(ROOT,{recursive:true});
const safeError=e=>String(e?.stack??e).replace(/[A-Za-z0-9_-]{300,}/g,'[REDACTED]').slice(0,1800);
const record=(tag,value={})=>{
  const entry={tag,at:new Date().toISOString(),...value};events.push(entry);
  console.log('FINAL_APP_REVIEW '+JSON.stringify(entry));return entry;};
const wait=async(fn,label,timeout=25000)=>{
  let last='not-ready';const end=Date.now()+timeout;
  while(Date.now()<end){
    try{const value=await fn();if(value)return value;last='false';}
    catch(e){last=safeError(e).slice(0,220);}
    await delay(160);
  }
  throw Error('TIMEOUT '+label+' last='+last);
};
const bodyOf=async path=>{
  const url=DB+'/'+(path?path.replace(/^\/+|\/+$/g,'')+'.':'')+'json?ns='+NAMESPACE;
  const res=await fetch(url,{headers:{Authorization:'Bearer owner'},
    signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('LOCAL OWNER READ '+path+' HTTP '+res.status);
  return res.json();
};
const ownerPut=async(path,value)=>{
  const url=DB+'/'+(path?path.replace(/^\/+|\/+$/g,'')+'.':'')+'json?ns='+NAMESPACE;
  const res=await fetch(url,{method:'PUT',
    headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
    body:JSON.stringify(value),signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('LOCAL OWNER SEED '+path+' HTTP '+res.status);
  return res.json();
};
const state=async()=>{
  const root=(await bodyOf('hdnd'))??{},a=root.datasetV2?.active??null;
  const rows=a?root.datasetV2?.generations?.[a.generationId]?.items??{}:root.items??{};
  const perms=a?root.datasetV2?.permissions?.[a.generationId]??{}:root.permissions??{};
  const lease=a?root.datasetV2?.leases?.[a.generationId]??{}:root.editLocks??{};
  const revision=Object.fromEntries(Object.entries(rows).map(([id,item])=>[id,{
    revision:item.revision,operationId:item.operationId,note:item.note,
    updatedBy:item.updatedBy,historyCount:Object.keys(item.history??{}).length
  }]));
  return {generation:a,freeze:root.freezeControl??null,receipts:root.freezeReceipts??null,
    rowCount:Object.keys(rows).length,rows:revision,
    permissionCells:perms.cells??{},liveLeaseCount:Object.values(lease).flatMap(
      fields=>Object.values(fields??{})).filter(v=>Number(v?.expiresAt)>Date.now()).length};
};
async function screenshot(page,label){
  if(!page||page.isClosed())return;
  const filename=resolve(ROOT,label+'.png');
  try{
    await page.screenshot({path:filename,animations:'disabled',timeout:9000});
    screenshots.push(filename);record('SCREENSHOT',{file:filename});
  }catch(error){record('SCREENSHOT_UNAVAILABLE',{label,error:safeError(error)});}
}
const checks={
  async task(name,fn,page=admin){
    const started=Date.now();
    try{
      const result=await fn();
      const entry={name,status:'PASS',elapsedMs:Date.now()-started,
        evidence:result??{},server:await state()};
      cases.push(entry);record('CASE_PASS',{case:name,elapsedMs:entry.elapsedMs});
      return true;
    }catch(error){
      const entry={name,status:'FAIL',elapsedMs:Date.now()-started,error:safeError(error),
        server:await state().catch(e=>({unavailable:safeError(e)}))};
      cases.push(entry);record('CASE_FAIL',{case:name,error:entry.error});
      await screenshot(page,'FAIL-'+name.replace(/[^a-z0-9]+/gi,'-'));
      return false;
    }
  },
  unverified(name,reason){
    cases.push({name,status:'UNVERIFIED',reason});
    record('CASE_UNVERIFIED',{case:name,reason});
  }
};
function assertLocalUrl(url){
  try{
    const u=new URL(url);
    if(['blob:','data:','about:'].includes(u.protocol))return true;
    return ['127.0.0.1','localhost'].includes(u.hostname);
  }catch{return false;}
}
function monitor(page,role){
  page.on('pageerror',error=>record('BROWSER_EXCEPTION',{role,error:safeError(error)}));
  page.on('request',req=>{
    if(!assertLocalUrl(req.url()))record('BLOCK_EXTERNAL_REQUEST',{role,
      hostname:new URL(req.url()).hostname});
  });
  page.route('**/*',async route=>{
    if(!assertLocalUrl(route.request().url()))return route.abort('blockedbyclient');
    return route.continue();
  }).catch(error=>record('ROUTE_MONITOR_ERROR',{role,error:safeError(error)}));
}
async function seedWorkbook(){
  const seedVite=await createViteServer({configFile:'vite.config.ts',mode:'pages-test',
    server:{middlewareMode:true},appType:'custom',logLevel:'error'});
  try{
    const [demo,catalog,reports,item,integrity,business]=await Promise.all([
      '/src/data/demo-items.ts','/src/data/catalogs.ts',
      '/src/data/report-preferences.ts','/src/data/item-preferences.ts',
      '/src/data/dataset-replacement-integrity.ts','/src/data/business-excel.ts'
    ].map(p=>seedVite.ssrLoadModule(p)));
    sourceRows=demo.createDemoItems(2);
    const op='final_app_qa_initial_0001';
    const full=await integrity.createDatasetManifest(sourceRows,op);
    seedPointer={generationId:full.generationId,operationId:op,revision:1,
      rowCount:full.rowCount,digest:full.digest};
    baseProfile={dataSource:'primary',catalogs:catalog.catalogFromItems(sourceRows),
      reports:reports.defaultReportLayout(),items:item.defaultItemLayout()};
    const rows=[
      [...business.BUSINESS_HEADERS],
      ['NQQA001',1,'Nghị quyết kiểm thử kết nối','Sở mẫu A','HC',
        '','','','','','','','','Chờ xử lý','Bộ hồ sơ QA A'],
      ['BCQA002',2,'Báo cáo kiểm thử toàn ứng dụng','Sở mẫu B','BC',
        '','','','','','','','','Chờ xử lý','Bộ hồ sơ QA B']
    ];
    const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet(rows),'QA A-O');
    const bytes=new Uint8Array(XLSX.write(workbook,{type:'array',bookType:'xlsx'}));
    const parsed=business.parseBusinessExcel(bytes,'QA A-O');
    assert.equal(parsed.items.length,2,'QA workbook must be business-parser-valid');
    excelPath=resolve(ROOT,'qa-A-O.xlsx');writeFileSync(excelPath,bytes);
    record('WORKBOOK_READY',{bytes:bytes.length,parsedRows:parsed.items.length,
      sheet:'QA A-O',sha256:hash(bytes),initialGeneration:seedPointer});
  }finally{await seedVite.close();}
}
async function seed(){
  const [a,b]=sourceRows.map((row,index)=>{
    const {archivedAt,...rest}=row;
    return [row.recordId,{...rest,revision:1,operationId:'qa_seed_'+index,
      updatedAt:1,updatedBy:'qa-only'}];
  });
  const v2={[a[0]]:a[1],[b[0]]:b[1]};
  const initial={hdnd:{
    items:{legacy_different:{...a[1],recordId:'legacy_different',
      displayCode:'LEGACY-QA',note:'LEGACY_NOT_V2'}},
    permissions:{columns:{}},
    profile:{revision:1,payload:JSON.stringify(baseProfile)},
    control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
    freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:'qa-only',
      changedAt:1,deadline:0,closedAt:0},
    datasetV2:{active:seedPointer,generations:{
      [seedPointer.generationId]:{items:v2}},
      permissions:{[seedPointer.generationId]:{columns:{}}}}
  }};
  await ownerPut('',initial);
  assert.equal((await state()).rowCount,2);
  record('SERVER_SEED',{generation:seedPointer,rowIDs:Object.keys(v2)});
}
async function startServices(){
  const config=resolve(ROOT,'generated/emulators.json');
  const contents={
    functions:[{source:resolve('cell-edit-service'),codebase:'pr142-cell-edit',
      runtime:'nodejs22'}],
    database:{rules:RULES},
    emulators:{database:{host:'127.0.0.1',port:9000},
      auth:{host:'127.0.0.1',port:9099},
      functions:{host:'127.0.0.1',port:5001},
      ui:{enabled:false},singleProjectMode:true}
  };
  writeFileSync(config,JSON.stringify(contents,null,2));
  const env={...process.env,CI:'true',GCLOUD_PROJECT:PROJECT,
    FIREBASE_DATABASE_URL:'https://demo-hdnd.firebaseio.com'};
  emulator=spawn(process.execPath,[
    'node_modules/firebase-tools/lib/bin/firebase.js','emulators:start',
    '--only','auth,database,functions','--project',PROJECT,'--config',config
  ],{stdio:['ignore','pipe','pipe'],env});
  for(const out of [emulator.stdout,emulator.stderr])
    out.on('data',chunk=>{logs.firebase=(logs.firebase+String(chunk)).slice(-12000)});
  await wait(async()=>{
    if(emulator.exitCode!==null)throw Error('Firebase emulator crashed: '+logs.firebase);
    const res=await fetch('http://127.0.0.1:4400/emulators',{signal:AbortSignal.timeout(900)});
    if(!res.ok)return false;
    const ports=await res.json();
    return ports.auth?.port===9099&&ports.database?.port===9000&&
      ports.functions?.port===5001;
  },'Auth+Functions+RTDB Emulator ready',100000);
  const url=DB+'/.settings/rules.json?ns='+NAMESPACE;
  const put=await fetch(url,{method:'PUT',headers:{
    Authorization:'Bearer owner','Content-Type':'application/json'},
    body:JSON.stringify(expected),signal:AbortSignal.timeout(10000)});
  assert.equal(put.status,200,'Install exact combined QA Rules');
  const live=await(await fetch(url,{headers:{Authorization:'Bearer owner'}})).json();
  assert.deepEqual(live,expected,'Shared Rules differ from installed Emulator Rules');
  const parentEnv={...env,
    FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',
    FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',
    PARENT_DATABASE_URL:'https://demo-hdnd.firebaseio.com',
    PARENT_ALLOWED_ORIGINS:SITE,
    PARENT_COMMIT_ENABLED:'true',PARENT_PORT:'8787'};
  parentServer=spawn(process.execPath,['parent-commit-service/dev-server.mjs'],
    {stdio:['ignore','pipe','pipe'],env:parentEnv});
  for(const out of [parentServer.stdout,parentServer.stderr])
    out.on('data',chunk=>{logs.parent=(logs.parent+String(chunk)).slice(-10000)});
  await wait(async()=>{
    if(parentServer.exitCode!==null)throw Error('Parent server exited '+logs.parent);
    const r=await fetch('http://127.0.0.1:8787/health');
    return r.ok&&(await r.json()).enabled;
  },'Real authenticated parent endpoint',35000);
  vite=await createViteServer({configFile:'vite.config.ts',mode:'pages-test',
    server:{host:'127.0.0.1',port:4179,strictPort:true},
    logLevel:'error'});
  await vite.listen();
  await wait(async()=>{const r=await fetch(SITE+'/pages.html');
    return r.ok&&(await r.text()).includes('pages-main');},'Real business App pages.html',30000);
  record('FULL_EMULATOR_READY',{project:PROJECT,functions:5001,database:9000,auth:9099,
    parentEndpoint:8787,rulesHash:manifest.combinedSha256,site:SITE,
    disclaimer:'QA checkout merged locally in CI; no official Chat1 candidate'});
}
async function newContext(role,viewport={width:1440,height:900}){
  const ctx=await browser.newContext({viewport,locale:'vi-VN'});
  const page=await ctx.newPage();monitor(page,role);
  await page.goto(SITE+'/pages.html',{waitUntil:'domcontentloaded'});
  await page.locator('.v3-settings-menu summary').waitFor({timeout:35000});
  if(role!=='guest'){
    await wait(async()=>page.evaluate(()=>typeof window.__pr95EmulatorGoogleAdminSignIn==='function'),
      'Auth Emulator login hook '+role,26000);
    const result=await page.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn());
    assert.equal(result.emailVerified,true);
    assert.ok(result.providerIds.includes('google.com'));
    await wait(async()=>page.locator('.options-menu summary').count(),
      'Verified Google admin shell',25000);
    if(!adminIdentity)adminIdentity=result;
    else assert.equal(result.uid,adminIdentity.uid,'All admin tabs same verified UID');
  }
  return {ctx,page};
}
const click=async(page,selector,text)=>{
  const x=page.locator(selector).filter({hasText:text}).first();
  await x.waitFor({state:'visible',timeout:15000});
  await x.click({timeout:12000});
};
const menu=async(page,label)=>{
  const m=page.locator('.options-menu summary');
  await m.click();await click(page,'.options-popover button',label);
};
const settings=async(page,label)=>{
  await click(page,'nav.settings-hub-tabs button',label);
};
const waitRow=async(page,text)=>page.locator('.item-data-table tbody').getByText(text,{exact:false})
  .first().waitFor({timeout:28000});
const noteRow=page=>page.locator('.item-data-table tbody tr').first()
  .locator('td[data-col-key="note"]');
async function editNote(page,value){
  await noteRow(page).locator('button.inline-note-trigger').first().click();
  const textarea=page.locator('textarea.inline-note-textarea');
  await textarea.waitFor({state:'visible',timeout:15000});
  await textarea.fill(value);
  await textarea.press('Control+Enter');
  await page.locator('.draft-bar').waitFor({timeout:13000});
}
async function saveDraft(page){
  await click(page,'.draft-bar button','Lưu lại vào Firebase');
}
async function resetPages(){
  for(const x of [contextAdmin,contextGuest])if(x)await x.close().catch(()=>{});
  contextAdmin=null;contextGuest=null;
  admin=null;secondAdmin=null;guest=null;adminIdentity=null;guestIdentity=null;
  await seed();
  browser?.contexts().forEach(()=>{});
  contextGuest=await browser.newContext({viewport:{width:390,height:844},locale:'vi-VN'});
  guest=await contextGuest.newPage();monitor(guest,'guest-mobile');
  await guest.goto(SITE+'/pages.html');
  await guest.locator('.v3-settings-menu summary').waitFor({timeout:30000});
  contextAdmin=await browser.newContext({viewport:{width:1440,height:900},locale:'vi-VN'});
  admin=await contextAdmin.newPage();monitor(admin,'admin-desktop');
  await admin.goto(SITE+'/pages.html');
  await wait(async()=>admin.evaluate(()=>typeof window.__pr95EmulatorGoogleAdminSignIn==='function'),
    'Admin Auth Emulator hook',20000);
  adminIdentity=await admin.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn());
  assert.equal(adminIdentity.emailVerified,true);
  await admin.locator('.options-menu summary').waitFor({timeout:20000});
  await waitRow(admin,sourceRows[0].displayCode);
  await waitRow(guest,sourceRows[0].displayCode);
}
async function closeGuest(){if(contextGuest)await contextGuest.close();contextGuest=null;guest=null;}
async function desktopMobileEvidence(){
  await screenshot(admin,'01-full-app-desktop-admin');
  await screenshot(guest,'02-full-app-mobile-guest');
  const geometry=async page=>page.evaluate(()=>({
    width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
    nav:!!document.querySelector('nav.primary-section-switcher'),
    table:!!document.querySelector('.item-data-table'),
    alerts:[...document.querySelectorAll('[role=alert]')].map(x=>x.textContent?.slice(0,220))
  }));
  const desk=await geometry(admin),mobile=await geometry(guest);
  assert.equal(desk.table,true);assert.equal(mobile.table,true);
  assert.equal(mobile.nav,false,'Guest mobile has no admin navigation');
  assert.ok(mobile.scrollWidth<Math.max(mobile.width+800,1200),
    'Document-wide uncontrolled mobile overflow');
  return {desktop:desk,mobile};
}
async function grantAndGuestEdit(){
  await menu(admin,'Chỉnh sửa');
  await settings(admin,'Phân quyền chỉnh sửa');
  const permission=admin.locator('.inline-permission-table select[aria-label^="Quyền ô"][aria-label*="Ghi chú"]').first();
  await permission.selectOption('allow');
  await admin.locator('.permission-risk-confirm input').check();
  await click(admin,'.inline-permissions button','Lưu quyền chỉnh sửa');
  const path='hdnd/datasetV2/permissions/'+seedPointer.generationId;
  await wait(async()=>{const x=await bodyOf(path);return x?.cells?.[sourceRows[0].recordId]?.note===true;},
    'Admin grant confirmed RTDB');
  await wait(async()=>guest.evaluate(()=>{
    const probe=window.__pr95UiV2L3RightsProbe;
    return probe&&probe().canEditNote===true;
  }), 'Guest SDK grants updated',18000);
  await noteRow(guest).locator('button.inline-note-trigger').waitFor({timeout:17000});
  const updated='QA FULL APP khách lưu qua Callable';
  await editNote(guest,updated);
  await screenshot(guest,'03-mobile-guest-draft');
  await saveDraft(guest);
  const rowPath='hdnd/datasetV2/generations/'+seedPointer.generationId+
    '/items/'+sourceRows[0].recordId;
  const saved=await wait(async()=>{
    const x=await bodyOf(rowPath);
    return x?.note===updated&&x?.revision===2?x:false;
  },'Guest real App save and server audit',25000);
  assert.equal(saved.history?.['2']?.changes?.note,updated);
  assert.ok(saved.updatedBy&&saved.updatedBy!==adminIdentity.uid);
  await guest.locator('.draft-bar').waitFor({state:'detached',timeout:16000});
  await screenshot(guest,'04-mobile-guest-saved');
  return {uid:adminIdentity.uid,guestUid:saved.updatedBy,permissionPath:path,
    note:saved.note,revision:saved.revision,operationId:saved.operationId,
    auditCount:Object.keys(saved.history??{}).length};
}
async function twoTabAndPopup(){
  // Login a second *actual App* Chrome target with the same verified admin.
  secondAdmin=await contextAdmin.newPage();
  monitor(secondAdmin,'admin-tab-2');
  await secondAdmin.goto(SITE+'/pages.html');
  await wait(async()=>secondAdmin.evaluate(()=>
    typeof window.__pr95EmulatorGoogleAdminSignIn==='function'),
    'Second real App admin Auth hook');
  const id2=await secondAdmin.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn());
  assert.equal(id2.uid,adminIdentity.uid);
  await waitRow(secondAdmin,sourceRows[0].displayCode);
  await click(admin,'nav.settings-hub-tabs button','Về chế độ xem').catch(async()=>{
    await menu(admin,'Chỉnh sửa');await settings(admin,'Về chế độ xem');
  });
  await waitRow(admin,sourceRows[0].displayCode);
  await noteRow(admin).locator('button.inline-note-trigger').click();
  await admin.locator('textarea.inline-note-textarea').waitFor();
  await noteRow(secondAdmin).locator('button.inline-note-trigger').click();
  const conflict=await wait(async()=>{
    const text=await secondAdmin.locator('.item-data-table').innerText();
    return /đang sửa|được giữ|khóa|không thể|phiên khác/i.test(text)?text.slice(0,400):false;
  },'Second tab same-UID lease conflict',16000);
  const before=await state();
  assert.ok(before.liveLeaseCount>=1);
  await screenshot(admin,'05-admin-a-owns-lease');
  await screenshot(secondAdmin,'06-admin-b-sameuid-denied');
  // Close editor without corrupting current text.
  await admin.locator('textarea.inline-note-textarea').press('Escape').catch(()=>{});
  return {sameUid:id2.uid,activeLeases:before.liveLeaseCount,conflictText:conflict};
}
async function ackLostAndRetry(){
  await resetPages();
  const rowPath='hdnd/datasetV2/generations/'+seedPointer.generationId+
    '/items/'+sourceRows[0].recordId;
  const value='QA ACK LOST committed once';
  let intercepted=false,postDataAction='';
  await admin.route('**/cellEdit',async route=>{
    let action='';
    try{action=route.request().postDataJSON()?.data?.action??'';}catch{}
    if(action==='save'&&!intercepted){
      intercepted=true;postDataAction=action;
      const response=await route.fetch({timeout:23000});
      assert.equal(response.status(),200,'Server must commit before ACK drop');
      return route.abort('failed');
    }
    return route.continue();
  });
  await editNote(admin,value);
  await saveDraft(admin);
  await wait(async()=>intercepted,'Actual POST save ACK intercepted',18000);
  const recorded=await wait(async()=>{
    const x=await bodyOf(rowPath);
    return x?.note===value&&x?.revision===2?x:false;
  },'Server commit independently observed after ACK cut',18000);
  const op=recorded.operationId,rev=recorded.revision;
  const audit=JSON.stringify(recorded.history);
  assert.ok((await admin.locator('.draft-bar').count())>0,
    'Do not clear draft just because server committed on lost ACK');
  await screenshot(admin,'07-ack-lost-draft-retained');
  await admin.unroute('**/cellEdit');
  await saveDraft(admin);
  await wait(async()=>!(await admin.locator('.draft-bar').count()),
    'User retry receives idempotent acknowledgement',16000);
  const after=await bodyOf(rowPath);
  assert.equal(after.revision,rev,'Retry must not add a revision');
  assert.equal(after.operationId,op,'Retry reuses original operationId');
  assert.equal(JSON.stringify(after.history),audit,'Retry must not duplicate audit');
  await screenshot(admin,'08-ack-retry-once');
  return {action:postDataAction,operationId:op,revision:rev,
    auditSlots:Object.keys(after.history??{}).length,retainedDraft:true};
}
async function openAdminRoute(label){
  await menu(admin,'Tài khoản và dữ liệu');
  await admin.locator('nav.settings-hub-tabs').waitFor({timeout:14000});
  await settings(admin,label);
}
async function freezeJourney(){
  await resetPages();
  await openAdminRoute('Quản trị');
  const panel=admin.locator('section[aria-label="Kiểm soát khóa dữ liệu"]');
  await panel.waitFor({timeout:15000});
  await click(admin,'section[aria-label="Kiểm soát khóa dữ liệu"] button','Yêu cầu lưu rồi chốt');
  await wait(async()=>{const s=await state();return s.freeze?.mode==='FROZEN'?s:false;},
    'Orderly freeze acknowledged and receipt recorded',25000);
  const orderly=await state();
  const receipt=orderly.receipts?.[String(orderly.freeze.epoch)];
  assert.equal(receipt?.closeKind,'orderly');
  assert.equal(receipt?.datasetV2?.generationId,seedPointer.generationId);
  await screenshot(admin,'09-freeze-orderly-receipt');
  await click(admin,'section[aria-label="Kiểm soát khóa dữ liệu"] button','Mở lại chỉnh sửa');
  await wait(async()=>(await state()).freeze?.mode==='OPEN','OPEN server after thaw');
  // Keep a real inline editor lease open in admin tab 2 during FORCE.
  secondAdmin=await contextAdmin.newPage();monitor(secondAdmin,'admin-lease-before-freeze');
  await secondAdmin.goto(SITE+'/pages.html');
  await wait(async()=>secondAdmin.evaluate(()=>typeof window.__pr95EmulatorGoogleAdminSignIn==='function'),'second admin login');
  await secondAdmin.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn());
  await waitRow(secondAdmin,sourceRows[0].displayCode);
  await noteRow(secondAdmin).locator('button.inline-note-trigger').click();
  await secondAdmin.locator('textarea.inline-note-textarea').waitFor();
  await wait(async()=>(await state()).liveLeaseCount>0,'Real active lease before forced freeze',13000);
  await click(admin,'section[aria-label="Kiểm soát khóa dữ liệu"] button','Đóng băng khẩn cấp');
  const forced=await wait(async()=>{
    const x=await state();
    const rc=x.receipts?.[String(x.freeze?.epoch)];
    return x.freeze?.mode==='FROZEN'&&rc?.closeKind==='forced'?x:false;
  },'Force FROZEN and receipt from real App',25000);
  assert.ok(forced.liveLeaseCount>=1);
  await wait(async()=>(await panel.innerText()).includes('CƯỠNG BỨC'),
    'UI forced status',15000);
  await screenshot(admin,'10-freeze-forced-draft-warning');
  return {orderly:{revision:orderly.freeze.revision,receiptRows:receipt.rows},
    forced:{mode:forced.freeze.mode,liveLeaseCount:forced.liveLeaseCount,
      closeKind:forced.receipts?.[String(forced.freeze.epoch)]?.closeKind}};
}
async function excelJourney(){
  await resetPages();
  await openAdminRoute('Excel · Nhập/Xuất');
  const panel=admin.locator('.business-excel-review');
  await panel.waitFor({timeout:18000});
  await panel.locator('input[type=file]').setInputFiles(excelPath);
  await wait(async()=>panel.getByText('Đã chọn:').count(),'Browser accepted actual .xlsx file',15000);
  await panel.locator('select').first().selectOption('QA A-O');
  await click(admin,'.business-excel-review button','Kiểm tra toàn bộ file');
  await admin.locator('section[aria-label="Bản xem trước chưa áp dụng"]').waitFor({timeout:16000});
  assert.ok((await panel.innerText()).includes('2 hồ sơ mới'));
  await screenshot(admin,'11-real-excel-selected-preview');
  const stage=panel.locator('section[aria-label="Thử nghiệm thế hệ Firebase"]');
  await click(admin,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
    'Ghi staging, đọc lại và sao lưu thử nghiệm');
  await stage.locator('section[aria-label="Xem trước dữ liệu staging"]').waitFor({timeout:27000});
  const confirmation=await stage.locator('section[aria-label="Xem trước dữ liệu staging"] code')
    .first().innerText();
  assert.ok(confirmation.startsWith('THAY excel_'));
  const op=confirmation.split(' ')[1];
  const before=await state();
  assert.equal(before.generation.generationId,seedPointer.generationId);
  await screenshot(admin,'12-real-excel-staging-server');
  await stage.locator('input[aria-label="Xác nhận thay thế toàn bộ"]').fill(confirmation);
  await click(admin,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
    'Chuyển thế hệ bằng CAS');
  const replaced=await wait(async()=>{
    const s=await state();
    return s.generation?.operationId===op?s:false;
  },'Real App Excel CAS switched active generation',35000);
  assert.equal(replaced.rowCount,2);
  await screenshot(admin,'13-excel-replaced-generation');
  const view=await wait(async()=>{
    const text=await stage.innerText();
    return /ĐÃ COMMIT|Đã commit|đã commit/i.test(text)?text.slice(-900):false;
  },'App confirms committed operation',14000);
  await click(admin,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
    'Tra cứu trạng thái operationId');
  await wait(async()=>{const t=await stage.innerText();return t.includes(op)&&/COMMIT/i.test(t);},
    'Read-only operationId status');
  const restoreId='qa_restore_'+randomUUID().replaceAll('-','_');
  const restoreField=stage.locator('input[aria-label="Mã khôi phục mới"]');
  await restoreField.waitFor({timeout:20000});
  await restoreField.fill(restoreId);
  await stage.locator('input[aria-label="Xác nhận khôi phục"]').fill('KHOI PHUC '+restoreId);
  await click(admin,'section[aria-label="Thử nghiệm thế hệ Firebase"] button','Khôi phục bằng CAS');
  const restored=await wait(async()=>{
    const x=await state();return x.generation?.operationId===restoreId?x:false;
  },'Real App restore CAS new generation',30000);
  assert.equal(restored.rowCount,2);
  await screenshot(admin,'14-excel-restore-and-operation');
  return {filename:excelPath,stageOperation:op,replacedGeneration:replaced.generation,
    restoredGeneration:restored.generation,restoreOperation:restoreId,operationView:view,
    distinctGenerations:seedPointer.generationId!==replaced.generation.generationId&&
      replaced.generation.generationId!==restored.generation.generationId};
}
async function popupJourney(){
  await resetPages();
  await click(admin,'nav.primary-section-switcher button','Báo cáo tổng hợp');
  await admin.locator('.report-table').first().waitFor({timeout:20000});
  const drill=admin.locator('.report-table .count-drill').first();
  await drill.waitFor({timeout:12000});await drill.click();
  const dialog=admin.locator('dialog.report-grid-modal[open]');
  await dialog.waitFor({timeout:15000});
  await screenshot(admin,'15-real-report-popup');
  await click(admin,'dialog.report-grid-modal button','Chỉnh sửa nháp');
  const editable=await wait(async()=>{
    const x=await dialog.locator('button.inline-note-trigger,button.cell-picker-trigger').count();
    return x>0?x:false;
  },'Real popup editable controls',16000);
  await screenshot(admin,'16-real-popup-editable');
  return {popupVisible:true,editableControls:editable};
}
async function generationWithDraft(){
  await resetPages();
  // A real unsaved note in tab B remains when tab A changes the generation.
  secondAdmin=await contextAdmin.newPage();monitor(secondAdmin,'admin-draft-generation');
  await secondAdmin.goto(SITE+'/pages.html');
  await wait(async()=>secondAdmin.evaluate(()=>typeof window.__pr95EmulatorGoogleAdminSignIn==='function'),
    'Tab B Google Auth hook');
  const id=await secondAdmin.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn());
  assert.equal(id.uid,adminIdentity.uid);
  await waitRow(secondAdmin,sourceRows[0].displayCode);
  await editNote(secondAdmin,'UNSAVED_QA_GENERATION_OLD');
  const prior=await state();
  assert.equal(prior.generation.generationId,seedPointer.generationId);
  // Replace only after actual Excel file selection in admin A, no module shortcut.
  await openAdminRoute('Excel · Nhập/Xuất');
  const panel=admin.locator('.business-excel-review');
  await panel.locator('input[type=file]').setInputFiles(excelPath);
  await wait(async()=>panel.getByText('Đã chọn:').count(),'Actual Excel chosen');
  await panel.locator('select').first().selectOption('QA A-O');
  await click(admin,'.business-excel-review button','Kiểm tra toàn bộ file');
  const stage=admin.locator('section[aria-label="Thử nghiệm thế hệ Firebase"]');
  await click(admin,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
    'Ghi staging, đọc lại và sao lưu thử nghiệm');
  await stage.locator('section[aria-label="Xem trước dữ liệu staging"]').waitFor({timeout:30000});
  const phrase=await stage.locator('section[aria-label="Xem trước dữ liệu staging"] code').first().innerText();
  await stage.locator('input[aria-label="Xác nhận thay thế toàn bộ"]').fill(phrase);
  await click(admin,'section[aria-label="Thử nghiệm thế hệ Firebase"] button',
    'Chuyển thế hệ bằng CAS');
  const next=await wait(async()=>{
    const v=await state();
    return v.generation?.operationId===phrase.split(' ')[1]?v:false;
  },'Generation changed with real stale tab draft',30000);
  assert.equal(next.rowCount,2);
  await screenshot(secondAdmin,'17-old-generation-unsaved-draft');
  const draftButtons=secondAdmin.locator('.draft-bar button').filter({hasText:'Lưu lại vào Firebase'});
  if(await draftButtons.count())await draftButtons.click();
  await wait(async()=>{
    const s=await state();return s.generation?.operationId===next.generation.operationId?s:false;
  },'Stale generation cannot alter current pointer');
  const final=await state();
  assert.equal(final.generation.generationId,next.generation.generationId);
  assert.ok(!Object.values(final.rows).some(x=>String(x.note).includes('UNSAVED_QA_GENERATION_OLD')),
    'Old draft must not mutate new generation');
  await screenshot(secondAdmin,'18-old-draft-server-fenced');
  return {old:prior.generation,newGeneration:next.generation,draftNotApplied:true,
    draftStillVisible:await secondAdmin.locator('.draft-bar').count()>0};
}
async function run(){
  record('QA_MODE',{kind:'EPHEMERAL_QA_CHECKOUT_NOT_CHAT1_CANDIDATE',
    localCheckoutSha:checkout,refs,manifest});
  await seedWorkbook();await startServices();
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  await resetPages();
  await checks.task('QA01_DESKTOP_MOBILE_GUEST_ADMIN',desktopMobileEvidence,admin);
  const permissionOK=await checks.task('QA02_GRANT_GUEST_LIST_EDIT_SAVE_READBACK',grantAndGuestEdit,guest);
  if(permissionOK)await checks.task('QA03_TWO_SAME_UID_TABS_REAL_APP',twoTabAndPopup,admin);
  else checks.unverified('QA03_TWO_SAME_UID_TABS_REAL_APP','QA02 failed; run independently after grant/navigation repair');
  await checks.task('QA04_LOST_ACK_DRAFT_RETRY',ackLostAndRetry,admin);
  await checks.task('QA05_REAL_APP_REPORT_POPUP',popupJourney,admin);
  await checks.task('QA06_FREEZE_NORMAL_FORCED_RECEIPT',freezeJourney,admin);
  await checks.task('QA07_EXCEL_FILE_PREVIEW_STAGE_COMMIT_RESTORE_LOOKUP',excelJourney,admin);
  await checks.task('QA08_GENERATION_CHANGE_WITH_UNSAVED_EDITOR',generationWithDraft,secondAdmin??admin);
  // All cases require the actual App route and independent owner server reads.
  const outcome=cases.every(x=>x.status==='PASS')?'QA_CHECKOUT_PASS':'QA_CHECKOUT_HAS_GAPS';
  record('FINAL_APP_REVIEW_RESULT',{outcome,cases:cases.map(c=>({name:c.name,status:c.status})),
    screenshots:screenshots.length});
}
try{await run();}
catch(error){
  cases.push({name:'QA_SETUP_OR_FATAL',status:'FAIL',error:safeError(error)});
  record('FATAL',{error:safeError(error),firebaseLog:logs.firebase.slice(-2800),
    parentLog:logs.parent.slice(-1600)});
  process.exitCode=1;
}finally{
  const result={kind:'UNOFFICIAL_EPHEMERAL_QA_CHECKOUT_NOT_CANDIDATE',
    checkedOutSha:checkout,refs,sharedRules:manifest,
    cases,events,screenshots:screenshots.map(x=>x.replace(ROOT+'/','')),
    logSummary:{firebase:logs.firebase.slice(-1600),parent:logs.parent.slice(-1600)},
    verdict:cases.length&&cases.every(x=>x.status==='PASS')?'FULL_APP_QA_PASS':'FULL_APP_QA_INCOMPLETE_OR_FAIL',
    productionUsed:false,published:false,emulator:true};
  try{writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');}catch{}
  if(result.verdict!=='FULL_APP_QA_PASS')process.exitCode=1;
  for(const ctx of [contextGuest,contextAdmin])try{await ctx?.close()}catch{}
  try{await browser?.close()}catch{}
  try{await vite?.close()}catch{}
  for(const proc of [parentServer,emulator])try{proc?.kill('SIGTERM')}catch{}
  await delay(450);
  rmSync(session,{recursive:true,force:true});
}
