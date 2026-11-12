/**
 * FINAL-APP-REVIEW — QA-only REAL business App browser journey.
 * Runs directly on the exact pinned PR147 candidate SHA. Only localhost demo-hdnd Auth / Functions / RTDB Emulator.
 * Never use fixture-only component pages as full E2E acceptance.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {dirname,join,resolve,relative} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {setTimeout as delay} from 'node:timers/promises';
import {createServer as createViteServer} from 'vite';
import * as XLSX from 'xlsx';

const requirePlaywright=createRequire(resolve('cell-edit-service/package.json'));
const {chromium}=requirePlaywright('playwright');
const PROJECT='demo-hdnd',NAMESPACE='demo-hdnd-default-rtdb';
const DB='http://127.0.0.1:9000',SITE='http://127.0.0.1:4179';
const ROOT=resolve('qa-results/final-app-review');
const RULES=resolve(ROOT,'generated/shared.rules.json');
const reportPath=resolve(ROOT,'witness.json');
const hash=s=>createHash('sha256').update(s).digest('hex');
const PIN=process.env.FINAL_APP_CANDIDATE_SHA||null;
const refs={candidatePR147:PIN,PR142:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847',
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
if(PIN){
  assert.match(PIN,/^[a-f0-9]{40}$/);
  assert.equal(checkout,PIN,'QA must checkout the precise PR147 SHA; no moving branch');
  assert.equal(manifest.kind,'PINNED_PR147_CANDIDATE_RULES_UNMODIFIED_NOT_RELEASE');
  assert.equal(manifest.candidateSha,PIN);
}else assert.equal(manifest.kind,'UNOFFICIAL_QA_SHARED_RULES_NOT_FOR_DEPLOY');
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
  const url=DB+'/'+(path?path.replace(/^\/+|\/+$/g,''):'')+'.json?ns='+NAMESPACE;
  const res=await fetch(url,{headers:{Authorization:'Bearer owner'},
    signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw Error('LOCAL OWNER READ '+path+' HTTP '+res.status);
  return res.json();
};
const ownerPut=async(path,value)=>{
  const url=DB+'/'+(path?path.replace(/^\/+|\/+$/g,''):'')+'.json?ns='+NAMESPACE;
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
        server:await state().catch(e=>({unavailable:safeError(e)})),
        parentServiceLog:logs.parent.slice(-2500),
        functionsEmulatorLog:logs.firebase.slice(-1200),
        ui:page?{
          route:page.url(),
          body:(await page.locator('body').innerText({timeout:3500}).catch(()=>''))?.slice(-2000),
          alerts:await page.locator('[role=alert]').allTextContents().catch(()=>[])
        }:null};
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
  page.on('console',msg=>{
    if(msg.type()==='error'||msg.type()==='warning')
      record('BROWSER_CONSOLE',{role,kind:msg.type(),text:msg.text().slice(0,400)});
  });
  page.on('response',async response=>{
    const url=response.url();
    if(response.status()<400||
      (!url.includes('/cellEdit')&&!url.includes('/parentDatasetCommit')))return;
    const parent=url.includes('/parentDatasetCommit');
    try{
      const body=await response.json();
      const error=body?.error??{};
      record(parent?'PARENT_HTTP_REJECTED':'CELL_CALLABLE_REJECTED',{
        role,httpStatus:response.status(),
        errorStatus:String(typeof error==='string'?error:error.status??'').slice(0,80),
        message:String(body?.message??error.message??'').slice(0,240)});
    }catch(error){record(parent?'PARENT_HTTP_REJECTED':'CELL_CALLABLE_REJECTED',{
      role,httpStatus:response.status(),parseError:String(error).slice(0,100)});}
  });
  page.on('requestfailed',req=>{
    if(req.url().includes('/cellEdit'))
      record('CELL_CALLABLE_NETWORK_FAILURE',{role,failure:req.failure()?.errorText??'unknown'});
  });
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
      // F/G must be a valid four-level party/status pair. Empty F is
      // permitted by the legacy read parser but REJECTED by the new-generation
      // RTDB Rules. Repair the synthetic fixture, never relax production Rules.
      ['NQQA001',1,'Nghị quyết kiểm thử kết nối','Sở mẫu A','HC',
        'TTTU','Sở chưa trình','','','','','','','Chờ xử lý','Bộ hồ sơ QA A'],
      ['BCQA002',2,'Báo cáo kiểm thử toàn ứng dụng','Sở mẫu B','BC',
        'BTV','VP đang xử lý','','','','','','','Chờ xử lý','Bộ hồ sơ QA B']
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
  const [a,b]=sourceRows.map(row=>{
    const {archivedAt,...rest}=row;
    return [row.recordId,{...rest,revision:1,operationId:seedPointer.operationId,
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
      permissions:{[seedPointer.generationId]:{columns:{}}},
      // V2 baseline must represent a real prior committed generation.
      // PR146 parent contract refuses insertion of an absent operations tree.
      operations:{[seedPointer.operationId]:{
        status:'COMMITTED',from:'legacy',to:seedPointer.generationId,
        at:Date.now()-1000}}
    }
  }};
  await ownerPut('',initial);
  assert.equal((await state()).rowCount,2);
  record('SERVER_SEED',{generation:seedPointer,rowIDs:Object.keys(v2)});
}
async function startServices(){
  const config=PIN?resolve('firebase.staging.json')
    :resolve(ROOT,'generated/emulators.json');
  if(PIN){
    const projectConfig=JSON.parse(readFileSync(config,'utf8'));
    assert.equal(projectConfig.database?.rules,
      'firebase/database.exclusive-candidate.rules.json');
    assert.deepEqual(projectConfig.functions.map(x=>x.source).sort(),
      ['cell-edit-service','parent-commit-service']);
    assert.equal(hash(readFileSync(resolve(projectConfig.database.rules))),
      manifest.combinedSha256,'Pinned candidate Rules changed since QA pin');
  }else{
    const contents={
      functions:[{source:relative(dirname(config),resolve('cell-edit-service')),codebase:'pr142-cell-edit',
        runtime:'nodejs22'}],
      database:{rules:RULES},
      emulators:{database:{host:'127.0.0.1',port:9000},
        auth:{host:'127.0.0.1',port:9099},
        functions:{host:'127.0.0.1',port:5001},
        ui:{enabled:false},singleProjectMode:true}
    };
    writeFileSync(config,JSON.stringify(contents,null,2));
  }
  const env={...process.env,CI:'true',GCLOUD_PROJECT:PROJECT,
    FIREBASE_DATABASE_URL:'https://demo-hdnd-default-rtdb.firebaseio.com',
    FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',
    FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',
    PARENT_DATABASE_URL:'https://demo-hdnd-default-rtdb.firebaseio.com',
    PARENT_ALLOWED_ORIGINS:SITE,PARENT_COMMIT_ENABLED:'true'};
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
  await wait(async()=>{
    const reply=await fetch('http://127.0.0.1:5001/'+PROJECT+
      '/asia-southeast1/cellEdit',{method:'POST',headers:{'Content-Type':'application/json'},
      body:'{}',signal:AbortSignal.timeout(2500)});
    return reply.status!==404&&reply.status!==502;
  },'Functions Emulator loaded real cellEdit callable',30000);
  const url=DB+'/.settings/rules.json?ns='+NAMESPACE;
  const put=await fetch(url,{method:'PUT',headers:{
    Authorization:'Bearer owner','Content-Type':'application/json'},
    body:JSON.stringify(expected),signal:AbortSignal.timeout(10000)});
  assert.equal(put.status,200,'Install exact combined QA Rules');
  const live=await(await fetch(url,{headers:{Authorization:'Bearer owner'}})).json();
  assert.deepEqual(live,expected,'Shared Rules differ from installed Emulator Rules');
  if(PIN){
    const parentURL='http://127.0.0.1:5001/'+PROJECT+'/us-central1/parentDatasetCommit';
    await wait(async()=>{
      const r=await fetch(parentURL,{method:'POST',
        headers:{Origin:SITE,'Content-Type':'application/json'},
        body:'{}',signal:AbortSignal.timeout(3500)});
      return r.status!==404&&r.status!==502&&r.status!==503;
    },'PR147 onRequest parentDatasetCommit available',45000);
  }else{
    const parentEnv={...env,PARENT_PORT:'8787'};
    parentServer=spawn(process.execPath,['parent-commit-service/dev-server.mjs'],
      {stdio:['ignore','pipe','pipe'],env:parentEnv});
    for(const out of [parentServer.stdout,parentServer.stderr])
      out.on('data',chunk=>{logs.parent=(logs.parent+String(chunk)).slice(-10000)});
    await wait(async()=>{
      if(parentServer.exitCode!==null)throw Error('Parent server exited '+logs.parent);
      const r=await fetch('http://127.0.0.1:8787/health');
      return r.ok&&(await r.json()).enabled;
    },'Real authenticated parent endpoint',35000);
  }
  vite=await createViteServer({configFile:'vite.config.ts',mode:'pages-test',
    server:{host:'127.0.0.1',port:4179,strictPort:true},
    logLevel:'error'});
  await vite.listen();
  await wait(async()=>{const r=await fetch(SITE+'/pages.html');
    return r.ok&&(await r.text()).includes('pages-main');},'Real business App pages.html',30000);
  record('FULL_EMULATOR_READY',{project:PROJECT,functions:5001,database:9000,auth:9099,
    parentEndpoint:PIN?5001:8787,rulesHash:manifest.combinedSha256,site:SITE,
    pinnedCandidateSha:PIN,disclaimer:PIN
      ?'PR147 Draft candidate exact SHA; not READY, no release authorization'
      :'QA checkout merged locally in CI; not official Chat1 candidate'});
}
async function loginVerifiedAdmin(page,label){
  // Login must follow the REAL App's asynchronous anonymous warmup. Calling
  // Google sign-in too early lets a later anonymous setPersistence overwrite it.
  await wait(async()=>page.evaluate(()=>{
    const probe=window.__pr95UiV2L3RightsProbe?.();
    return typeof window.__pr95EmulatorGoogleAdminSignIn==='function'&&
      probe?.userUid&&probe?.epochReady&&probe?.connected?probe:false;
  }),label+' guest Auth/epoch warmup has completed',26000);
  const result=await page.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn());
  assert.equal(result.emailVerified,true);
  assert.ok(result.providerIds.includes('google.com'));
  await wait(async()=>page.evaluate(expected=>{
    const probe=window.__pr95UiV2L3RightsProbe?.();
    return probe?.isAdmin===true&&probe?.userUid===expected&&
      probe?.epochReady&&probe?.connected&&probe?.commonBusy===false?probe:false;
  },result.uid),label+' authenticated App admin controller',30000);
  await page.locator('.options-menu summary').waitFor({state:'visible',timeout:18000});
  if(!adminIdentity)adminIdentity=result;
  else assert.equal(result.uid,adminIdentity.uid,'Two Chrome tabs must share verified admin UID');
  record('ADMIN_IDENTITY_READY',{role:label,uidHash:hash(result.uid).slice(0,12),
    realApp:true});
  return result;
}
async function newContext(role,viewport={width:1440,height:900}){
  const ctx=await browser.newContext({viewport,locale:'vi-VN'});
  const page=await ctx.newPage();monitor(page,role);
  await page.goto(SITE+'/pages.html',{waitUntil:'domcontentloaded'});
  await page.locator('.v3-settings-menu summary').waitFor({timeout:35000});
  if(role!=='guest')await loginVerifiedAdmin(page,role);
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
const waitRow=async(page,text)=>{
  // The business List renders semantic short IDs (NQ01/NQ02), not the
  // longer demo displayCode (NQ-MẪU-001). Assert the REAL App table and a
  // field from the original server-seeded item, never a fixture-only page.
  const rows=page.locator('.item-data-table tbody tr');
  await rows.first().waitFor({state:'visible',timeout:28000});
  await wait(async()=>{
    const visible=await rows.count();
    const body=await rows.first().innerText().catch(()=>'');
    return visible>=2&&body.includes('MẪU:')?{visible,body:body.slice(0,180)}:false;
  },'Actual semantic List rows for '+text,10000);
};
const noteRow=page=>page.locator('.item-data-table tbody tr').first()
  .locator('td[data-col-key="note"]');
async function editNote(page,value){
  await noteRow(page).locator('button.inline-note-trigger').first().click();
  const textarea=page.locator('textarea.inline-note-textarea');
  try{await textarea.waitFor({state:'visible',timeout:15000});}
  catch(error){
    record('EDITOR_NOT_OPENED',{
      error:safeError(error),url:page.url(),roles:await page.evaluate(()=>
        window.__pr95UiV2L3RightsProbe?.()??null).catch(()=>null),
      alerts:await page.locator('[role=alert]').allTextContents().catch(()=>[]),
      noteHtml:(await noteRow(page).innerHTML().catch(()=>''))?.slice(0,1800),
      server:await state()
    });
    throw error;
  }
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
  await loginVerifiedAdmin(admin,'admin-desktop');
  try{
    await waitRow(admin,sourceRows[0].displayCode);
    await waitRow(guest,sourceRows[0].displayCode);
  }catch(error){
    const diagnostics=async page=>({
      url:page.url(),
      title:await page.title().catch(()=>null),
      body:(await page.locator('body').innerText({timeout:4000}).catch(()=>''))?.slice(0,5000),
      tableCount:await page.locator('.item-data-table tbody tr').count().catch(()=>-1),
      alerts:await page.locator('[role=alert]').allTextContents().catch(()=>[]),
      networkText:await page.locator('[role=status]').allTextContents().catch(()=>[])
    });
    record('APP_BOOT_DIAGNOSTIC',{error:safeError(error),
      admin:await diagnostics(admin),guest:await diagnostics(guest),
      server:await state()});
    await screenshot(admin,'FAIL-APP-BOOT-DESKTOP');
    await screenshot(guest,'FAIL-APP-BOOT-MOBILE');
    throw error;
  }
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
  // Risk acknowledgement is needed only when row/cell scope changes.
  // Column-only grants have no risk checkbox; server readback below is the gate.
  const risk=admin.locator('.permission-risk-confirm input');
  if(await risk.count())await risk.check();
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
  await resetPages();
  // Login a second *actual App* Chrome target with the same verified admin.
  secondAdmin=await contextAdmin.newPage();
  monitor(secondAdmin,'admin-tab-2');
  await secondAdmin.goto(SITE+'/pages.html');
  const id2=await loginVerifiedAdmin(secondAdmin,'admin-tab-2');
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
  await loginVerifiedAdmin(secondAdmin,'admin-lease-before-freeze');
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
  let replaced;
  try{
    replaced=await wait(async()=>{
      const s=await state();
      return s.generation?.operationId===op?s:false;
    },'Real App Excel CAS switched active generation',28000);
  }catch(error){
    record('EXCEL_PARENT_COMMIT_DIAGNOSTIC',{
      operationId:op,confirmation,ui:(await stage.innerText().catch(()=>'')).slice(-1800),
      server:await state(),parentServiceLog:logs.parent.slice(-3700),
      emulatorLog:logs.firebase.slice(-950)});
    // The Emulator is isolated; export Rules evaluation evidence and only
    // non-sensitive QA fixture keys. Never derive a broad client write path
    // or alter Rules to make a red CI job green.
    try{
      const r=await fetch(DB+'/.inspect/coverage.json?ns='+NAMESPACE,{
        signal:AbortSignal.timeout(6000)});
      if(r.ok){
        const coverage=await r.json(),destination=resolve(ROOT,'rules-coverage.json');
        writeFileSync(destination,JSON.stringify(coverage,null,2));
        record('QA_PARENT_RULES_COVERAGE',{path:'rules-coverage.json',
          topLevelKeys:Object.keys(coverage),bytes:readFileSync(destination).byteLength});
      }else record('QA_PARENT_RULES_COVERAGE_UNAVAILABLE',{httpStatus:r.status});
    }catch(cause){record('QA_PARENT_RULES_COVERAGE_ERROR',{error:safeError(cause)});}
    try{
      const raw=await bodyOf('hdnd/datasetV2/candidates/'+op);
      const backup=await bodyOf('hdnd/datasetV2/backups/'+op);
      const unpack=value=>typeof value==='string'?JSON.parse(value):value;
      const candidate=unpack(raw),savedBackup=unpack(backup);
      const first=Object.values(candidate?.items??{})[0];
      record('QA_PARENT_STAGING_STRUCTURE',{
        candidateKeys:Object.keys(candidate??{}).slice(0,12),
        backupKeys:Object.keys(savedBackup??{}).slice(0,12),
        recordCount:Object.keys(candidate?.items??{}).length,
        itemFieldNames:Object.keys(first??{}).slice(0,35),
        partyLevels:[...new Set(Object.values(candidate?.items??{}).map(x=>x.partyLevel))],
        sourceBytes:typeof raw==='string'?Buffer.byteLength(raw):JSON.stringify(raw??{}).length});
    }catch(cause){record('QA_PARENT_STAGING_STRUCTURE_ERROR',{error:safeError(cause)});}
    await screenshot(admin,'FAIL-EXCEL-PARENT-CAS-409');
    throw error;
  }
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
  const before=await state();
  const note='QA FULL APP popup lưu qua Callable';
  // The first inline editor in a real report is often 'Tiến độ hiện tại',
  // not 'Ghi chú'. Selecting by index silently edited the wrong business
  // field: server revision increased but the note remained unchanged.
  // Target the requested exact field, not the first available editor.
  const noteTrigger=dialog.locator('button.inline-note-trigger[aria-label*="Ghi chú"]').first();
  if(!(await noteTrigger.count()))throw Error('Real popup has no granted Ghi chú editor');
  await noteTrigger.click();
  const textarea=dialog.locator('textarea.inline-note-textarea[aria-label*="Ghi chú"]').first();
  await textarea.waitFor({state:'visible',timeout:12000});
  await textarea.fill(note);
  await textarea.press('Control+Enter');
  await admin.locator('.draft-bar').waitFor({timeout:12000});
  await screenshot(admin,'17-real-popup-draft');
  // A native <dialog> is modal: clicking an underlying draft bar while
  // it is open is impossible for a real user. Close the popup first,
  // keep the draft, then use the genuine application Save control.
  await dialog.locator('.report-grid-footer button').filter({hasText:'Đóng'}).click();
  await dialog.waitFor({state:'detached',timeout:12000});
  await saveDraft(admin);
  const saved=await wait(async()=>{
    const current=await state();
    const match=Object.entries(current.rows).find(([id,x])=>
      x.note===note&&x.revision===Number(before.rows[id]?.revision??0)+1);
    return match?{id:match[0],row:match[1],generation:current.generation}:false;
  },'Popup save received by server with incremented revision',25000);
  assert.ok(saved.row.historyCount>0,'Popup save must have audit history');
  await admin.locator('.draft-bar').waitFor({state:'detached',timeout:15000});
  await screenshot(admin,'18-real-popup-saved');
  return {popupVisible:true,editableControls:editable,serverSaved:saved,
    beforeRevision:before.rows[saved.id]?.revision,afterRevision:saved.row.revision};
}
async function generationWithDraft(){
  await resetPages();
  // A real unsaved note in tab B remains when tab A changes the generation.
  secondAdmin=await contextAdmin.newPage();monitor(secondAdmin,'admin-draft-generation');
  await secondAdmin.goto(SITE+'/pages.html');
  const id=await loginVerifiedAdmin(secondAdmin,'admin-draft-generation');
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
/** UI 05/11: grant only partyLevel to an anonymous guest and prove the
 * dependent progressParty changes inside the same server transaction. */
async function narrowPartyLevelGrantJourney(){
  await resetPages();
  await menu(admin,'Chỉnh sửa');
  await settings(admin,'Phân quyền chỉnh sửa');
  // The real business field label is "Cấp Thành ủy cho ý kiến"; "Cấp trình"
  // is an internal short name, not the accessible aria-label in the permission grid.
  const grant=admin.locator('.inline-permission-table select[aria-label^="Quyền ô"][aria-label*="Cấp Thành ủy cho ý kiến"]').first();
  await grant.waitFor({state:'visible',timeout:16000});
  await grant.selectOption('allow');
  const risk=admin.locator('.permission-risk-confirm input');
  if(await risk.count())await risk.check();
  await click(admin,'.inline-permissions button','Lưu quyền chỉnh sửa');
  const recordId=sourceRows[0].recordId;
  const permissionsPath='hdnd/datasetV2/permissions/'+seedPointer.generationId;
  await wait(async()=>{
    const p=await bodyOf(permissionsPath);
    return p?.cells?.[recordId]?.partyLevel===true &&
      p?.cells?.[recordId]?.progressParty!==true ? p : false;
  },'Server has partyLevel-only cell grant',21000);
  const rowPath='hdnd/datasetV2/generations/'+seedPointer.generationId+'/items/'+recordId;
  const original=await bodyOf(rowPath);
  assert.ok(Number.isInteger(original?.revision)&&original.revision>=1,
    'QA09 must capture a real persisted base revision before permission-limited edits');
  // REST can materialize numeric revision keys as sparse arrays with null
  // slots (e.g. [null,null,audit2,audit3]); count actual audit events,
  // never array positions or synthetic holes.
  const audits=(item)=>Object.values(item?.history??{}).filter(entry=>
    entry&&typeof entry==='object'&&typeof entry.operationId==='string'&&
    entry.changes&&typeof entry.changes==='object');
  const oldHistory=audits(original).length;
  record('QA09_BASELINE',{revision:original.revision,auditCount:oldHistory});
  const row=guest.locator('.item-data-table tbody tr[data-ui-reference-record-id="'+recordId+'"]');
  const level=row.locator('.compact-stage-level button.cell-picker-trigger').first();
  await level.waitFor({state:'visible',timeout:22000});
  await level.click();
  await guest.locator('.cell-picker-popover:popover-open [role="option"]').filter({hasText:/^Không$/}).first().click();
  await guest.locator('.draft-bar').waitFor({state:'visible',timeout:12000});
  await screenshot(guest,'19-party-level-only-guest-draft');
  await saveDraft(guest);
  const levelNone=await wait(async()=>{
    const row=await bodyOf(rowPath);
    return row?.partyLevel==='Không' && row?.progressParty==='Không phải trình' ? row : false;
  },'Level-only grant atomically sets Không / Không phải trình',25000);
  assert.equal(levelNone.revision,original.revision+1,'One server revision for both dependent fields');
  assert.equal(audits(levelNone).length,oldHistory+1,'One valid audit addition for level+status');
  const firstAudit=audits(levelNone).find(entry=>entry.operationId===levelNone.operationId);
  assert.ok(firstAudit,'First revision must expose its committed operation audit');
  assert.deepEqual(
    {partyLevel:firstAudit.changes.partyLevel,progressParty:firstAudit.changes.progressParty},
    {partyLevel:'Không',progressParty:'Không phải trình'},
    'First audit must contain both dependent fields in one operation');
  await guest.locator('.draft-bar').waitFor({state:'detached',timeout:16000});
  assert.equal(await row.locator('.compact-stage-state[data-ui-reference-part="progressParty"] button.cell-picker-trigger').count(),0,
    'Không level must make dependent progress readonly');
  await screenshot(guest,'20-party-none-status-locked');
  await level.click();
  await guest.locator('.cell-picker-popover:popover-open [role="option"]').filter({hasText:/^TTTU$/}).first().click();
  await guest.locator('.draft-bar').waitFor({state:'visible',timeout:12000});
  await saveDraft(guest);
  const reopened=await wait(async()=>{
    const row=await bodyOf(rowPath);
    return row?.partyLevel==='TTTU' && row?.progressParty==='Sở chưa trình' ? row : false;
  },'Level-only grant atomically restores TTTU / Sở chưa trình',25000);
  assert.equal(reopened.revision,levelNone.revision+1,'Second level-only save increments exactly once');
  assert.equal(audits(reopened).length,oldHistory+2,'Exactly two real audit records across both saves');
  const secondAudit=audits(reopened).find(entry=>entry.operationId===reopened.operationId);
  assert.ok(secondAudit,'Second revision must expose its committed operation audit');
  assert.deepEqual(
    {partyLevel:secondAudit.changes.partyLevel,progressParty:secondAudit.changes.progressParty},
    {partyLevel:'TTTU',progressParty:'Sở chưa trình'},
    'Second audit must contain both dependent fields in one operation');
  assert.notEqual(firstAudit.operationId,secondAudit.operationId,'Two saves need distinct operation IDs');
  await screenshot(guest,'21-party-status-reopened');
  return {grant:'partyLevel only',noStatusGrant:true,
    first:{revision:levelNone.revision,level:levelNone.partyLevel,status:levelNone.progressParty},
    second:{revision:reopened.revision,level:reopened.partyLevel,status:reopened.progressParty}};
}
/** UI 06/11 TRACKS: save the five actual fields through the verified
 * Admin App + RTDB profile transaction, reload admin and guest from the
 * server, verify mode-independent computed rails and 390/900 viewport. */
async function sharedPartyWidthsJourney(){
  await resetPages();
  const widths={readonly:{label:124,status:222},
    editable:{label:142,level:80,status:271}};
  const controls=admin.locator('.admin-l03-widths');
  await controls.waitFor({state:'visible',timeout:16000});
  await controls.getByRole('button',{name:/L03.*Chỉnh 5 độ rộng/}).click();
  const input=controls.locator('.admin-l03-width-editor');
  await input.getByRole('spinbutton',{name:'L03 Chỉ xem · Nhãn + cấp trình'}).fill(String(widths.readonly.label));
  await input.getByRole('spinbutton',{name:'L03 Chỉ xem · Tiến độ'}).fill(String(widths.readonly.status));
  await input.getByRole('spinbutton',{name:'L03 Được sửa · Nhãn'}).fill(String(widths.editable.label));
  await input.getByRole('spinbutton',{name:'L03 Được sửa · Cấp trình TU'}).fill(String(widths.editable.level));
  await input.getByRole('spinbutton',{name:'L03 Được sửa · Tiến độ'}).fill(String(widths.editable.status));
  assert.equal(await input.getByRole('spinbutton').count(),5,'Exactly five admin rail controls');
  await input.getByRole('button',{name:'Lưu 5 độ rộng dùng chung'}).click();
  const readonlySum=377,editableSum=532;
  await wait(async()=>((await controls.locator('.admin-l03-width-summary').innerText())||'').includes(readonlySum+'px') &&
    ((await controls.locator('.admin-l03-width-summary').innerText())||'').includes(editableSum+'px'),
    'Five independent rail widths committed via real admin profile',21000);
  await admin.reload({waitUntil:'domcontentloaded'});
  await waitRow(admin,sourceRows[0].displayCode);
  await guest.reload({waitUntil:'domcontentloaded'});
  await waitRow(guest,sourceRows[0].displayCode);
  const measure=page=>page.evaluate(()=>{
    const table=document.querySelector('.item-data-table');
    const cell=table?.querySelector('tbody tr:first-child td[data-l03-layout]');
    const stage=cell?.querySelector('.compact-stages');
    const style=table?getComputedStyle(table):null;
    const rect=cell?.getBoundingClientRect(),inner=stage?.getBoundingClientRect();
    const rails=stage?getComputedStyle(stage).gridTemplateColumns.trim().split(/\s+/).map(Number.parseFloat):[];
    const rows=[...(stage?.querySelectorAll('.compact-stage-row')??[])];
    const statuses=rows.map(row=>{const rect=row.querySelector('.compact-stage-state')?.getBoundingClientRect();
      return rect?{x:rect.x,width:rect.width}:null;});
    return {viewport:innerWidth,mode:table?.getAttribute('data-l03-physical-mode')??null,
      readonly:style?.getPropertyValue('--hdnd-l03-width-readonly').trim(),
      editable:style?.getPropertyValue('--hdnd-l03-width-editable').trim(),
      stageMode:stage?.getAttribute('data-level-layout')??null,
      cellWidth:rect?.width??null,stageWidth:inner?.width??null,rails,statuses};
  });
  const a=await measure(admin),g=await measure(guest);
  const check=proof=>{
    assert.equal(proof.readonly,readonlySum+'px');
    assert.equal(proof.editable,editableSum+'px');
    assert.ok(proof.cellWidth>0&&proof.stageWidth>0,'L03 actual cell and grid rects');
    assert.ok(proof.stageWidth<=proof.cellWidth+1,'Subgrid fits common physical column');
    const wanted=proof.stageMode==='editable'
      ?[widths.editable.label,widths.editable.level,widths.editable.status]
      :[widths.readonly.label,widths.readonly.status];
    assert.equal(proof.rails.length,wanted.length,'Exact 2/3 independent tracks');
    for(let i=0;i<wanted.length;i++)assert.ok(Math.abs(proof.rails[i]-wanted[i])<1,
      'Computed rail '+i+' must match server persisted value '+JSON.stringify(proof));
    assert.equal(proof.statuses.length,3,'All three stage statuses present');
    for(const status of proof.statuses){
      assert.ok(status&&Math.abs(status.x-proof.statuses[0].x)<1,
        'Three statuses vertically share x coordinate');
      assert.ok(Math.abs(status.width-wanted.at(-1))<1,
        'Three statuses share exact configured width');
    }
  };
  check(a);check(g);
  assert.equal(g.mode,'readonly','Guest L03 physical column uses readonly mode');
  assert.equal(g.stageMode,'readonly');
  assert.ok(Math.abs(g.cellWidth-readonlySum)<1.5,
    'Guest physical width must equal 124+222+8gap+23chrome');
  await screenshot(admin,'22-admin-l03-5-rails-reload');
  await screenshot(guest,'23-guest-l03-5-rails-reload');
  await guest.setViewportSize({width:900,height:900});
  const tablet=await measure(guest);check(tablet);
  await screenshot(guest,'24-guest-l03-900');
  await guest.setViewportSize({width:390,height:844});
  const mobile=await measure(guest);check(mobile);
  await screenshot(guest,'25-guest-l03-390');
  return {widths,admin:a,guest:g,tablet,mobile,serverBackedAcrossReload:true};
}
async function run(){
  record('QA_MODE',{kind:PIN?'PR147_EXACT_SHA_DRAFT_HOLD':'EPHEMERAL_QA_CHECKOUT_NOT_CHAT1_CANDIDATE',
    localCheckoutSha:checkout,refs,manifest});
  await seedWorkbook();await startServices();
  browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
  await resetPages();
  await checks.task('QA01_DESKTOP_MOBILE_GUEST_ADMIN',desktopMobileEvidence,admin);
  await checks.task('QA02_GRANT_GUEST_LIST_EDIT_SAVE_READBACK',grantAndGuestEdit,guest);
  // Same-UID admin collision is independently runnable even when guest-grant
  // path has an application error. Never suppress this security test.
  await checks.task('QA03_TWO_SAME_UID_TABS_REAL_APP',twoTabAndPopup,admin);
  await checks.task('QA04_LOST_ACK_DRAFT_RETRY',ackLostAndRetry,admin);
  await checks.task('QA05_REAL_APP_REPORT_POPUP',popupJourney,admin);
  await checks.task('QA06_FREEZE_NORMAL_FORCED_RECEIPT',freezeJourney,admin);
  await checks.task('QA07_EXCEL_FILE_PREVIEW_STAGE_COMMIT_RESTORE_LOOKUP',excelJourney,admin);
  await checks.task('QA08_GENERATION_CHANGE_WITH_UNSAVED_EDITOR',generationWithDraft,secondAdmin??admin);
  await checks.task('QA09_PARTYLEVEL_ONLY_GRANT_ATOMIC_DEPENDENCY',narrowPartyLevelGrantJourney,guest??admin);
  await checks.task('QA10_FIVE_TRACK_WIDTHS_PERSIST_GUEST_390_900',sharedPartyWidthsJourney,admin);
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
  const result={kind:PIN?'PR147_EXACT_SHA_DRAFT_NOT_APPROVED':'UNOFFICIAL_EPHEMERAL_QA_CHECKOUT_NOT_CANDIDATE',
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
