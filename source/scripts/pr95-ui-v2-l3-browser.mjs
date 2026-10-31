/**
 * PR95 V2 L3 real-App grant -> guest edit -> revoke E2E.
 * Run only with demo-hdnd Auth/RTDB Emulators and unchanged candidate Rules.
 * NO production Firebase, no Google Sheets, no privileged application writes.
 */
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {setTimeout as sleep} from 'node:timers/promises';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {createServer as createViteServer} from 'vite';
const PROJECT='demo-hdnd',NS='demo-hdnd',BASE='http://127.0.0.1:9000';
const OP='pr95_ui_v2_l3_perm_seed_20261030',GEN='gen_'+OP;
const PATH='hdnd/datasetV2',ROW='demo-0001',OTHER='demo-0002';
const candidate=JSON.parse(readFileSync(resolve('firebase/database.exclusive-candidate.rules.json'),'utf8'));
const rulesHash=createHash('sha256').update(JSON.stringify(candidate)).digest('hex');
const temp=mkdtempSync(join(resolve('.'),'.pr95-ui-v2-l3-'));
const config=join(temp,'firebase.json');
writeFileSync(config,JSON.stringify({database:{rules:resolve('firebase/database.exclusive-candidate.rules.json')},
  emulators:{database:{host:'127.0.0.1',port:9000},auth:{host:'127.0.0.1',port:9099},ui:{enabled:false},singleProjectMode:true}}));
const step=(name,obj)=>console.log('PR95_UI_V2_L3_'+name+' '+JSON.stringify(obj));
const wait=async(fn,label,ms=20000)=>{
  const end=Date.now()+ms;let last;
  while(Date.now()<end){try{const result=await fn();if(result)return result;}catch(e){last=e;}
    await sleep(170);}
  throw Error('WAIT '+label+' '+String(last??''));
};
const ownerReq=async(path='',method='GET',body)=>{
  const response=await fetch(BASE+'/'+path.replace(/^\//,'')+'.json?ns='+NS,
    {method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('Owner local '+path+' '+response.status+' '+(await response.text()).slice(0,500));
  return response.json();
};
let emu,host;let emuOutput='';const browsers=[];
async function startEmulator(){
  emu=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js',
    'emulators:start','--project',PROJECT,'--only','auth,database','--config',config],
    {stdio:['ignore','pipe','pipe'],env:{...process.env,CI:'true'}});
  for(const stream of [emu.stdout,emu.stderr])stream.on('data',p=>{emuOutput=(emuOutput+String(p)).slice(-9000)});
  await wait(async()=>{
    if(emu.exitCode!==null)throw Error('Emulator exited: '+emuOutput);
    const response=await fetch('http://127.0.0.1:4400/emulators',{signal:AbortSignal.timeout(1000)});
    if(!response.ok)return false;
    const e=await response.json();return e.auth?.port===9099&&e.database?.port===9000;
  },'Auth RTDB Emulator ready',40000);
  const url=BASE+'/.settings/rules.json?ns='+NS;
  const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
  const put=await fetch(url,{method:'PUT',headers,body:JSON.stringify(candidate)});
  assert.equal(put.status,200,'Failed to install exact candidate Rules in local emulator');
  const loaded=await (await fetch(url,{headers})).json();
  assert.ok(isDeepStrictEqual(loaded,candidate),'Actual emulator Rules != immutable V2 candidate');
  step('RULES_EXACT_PASS',{sha256:rulesHash,emulator:true});
}
async function seed(){
  // Reuse the actual production app's schema/defaults, not hand-crafted config.
  const vite=await createViteServer({configFile:'vite.config.ts',mode:'pages-test',
    server:{middlewareMode:true},appType:'custom',logLevel:'error'});
  let rows,profile;
  try{
    const [demo,catalog,reports,items]=await Promise.all([
      vite.ssrLoadModule('/src/data/demo-items.ts'),
      vite.ssrLoadModule('/src/data/catalogs.ts'),
      vite.ssrLoadModule('/src/data/report-preferences.ts'),
      vite.ssrLoadModule('/src/data/item-preferences.ts')]);
    rows=demo.createDemoItems(2);
    profile={dataSource:'primary',catalogs:catalog.catalogFromItems(rows),
      reports:reports.defaultReportLayout(),items:items.defaultItemLayout()};
  }finally{await vite.close();}
  const values=Object.fromEntries(rows.map((r,i)=>{
    const {archivedAt,...rest}=r;
    return [r.recordId,{...rest,revision:1,operationId:'l3-seed-'+(i+1),
      updatedAt:1,updatedBy:'l3-test'}];
  }));
  const seed={hdnd:{
    items:{},permissions:{columns:{}},profile:{revision:1,payload:JSON.stringify(profile)},
    control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
    freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:'l3-test',changedAt:1,deadline:0,closedAt:0},
    datasetV2:{
      active:{generationId:GEN,operationId:OP,revision:1,rowCount:2,digest:'a'.repeat(64)},
      generations:{[GEN]:{items:values}},
      permissions:{[GEN]:{columns:{}}}
    }
  }};
  await ownerReq('', 'PUT',seed);
  const read=await ownerReq(PATH+'/generations/'+GEN+'/items');
  assert.equal(Object.keys(read).length,2);assert.equal(read[ROW].recordId,ROW);
  step('SYNTHETIC_SEED_PASS',{generation:GEN,rowIds:Object.keys(read),profileRevision:1});
}
const APP=resolve('dist-pages-test');
async function startSite(){
  host=createServer((req,res)=>{
    try{
      const url=new URL(req.url??'/', 'http://127.0.0.1');
      const file=resolve(APP,'.'+(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(APP+'/')&&!file.startsWith(APP+'\\'))throw Error('bad file');
      if(!statSync(file).isFile())throw Error('not file');
      const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
      res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});
      res.end(readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise((ok,bad)=>{host.once('error',bad);host.listen(0,'127.0.0.1',ok);});
  return 'http://127.0.0.1:'+host.address().port+'/';
}
async function startChrome(url,role){
  const bin=['google-chrome','google-chrome-stable','chromium','chromium-browser']
    .find(n=>spawnSync('which',[n]).status===0);
  if(!bin)throw Error('Chromium/Chrome not found');
  const tcp=createServer();
  await new Promise((ok,bad)=>{tcp.once('error',bad);tcp.listen(0,'127.0.0.1',ok);});
  const port=tcp.address().port;await new Promise(ok=>tcp.close(ok));
  const processChrome=spawn(bin,['--headless=new','--no-sandbox','--no-zygote',
    '--disable-dev-shm-usage','--disable-gpu','--disable-extensions','--disable-background-networking',
    '--remote-debugging-address=127.0.0.1','--remote-debugging-port='+port,
    '--window-size=1500,1000','--user-data-dir='+join(temp,'chrome-'+role),'about:blank'],
    {stdio:['ignore','ignore','pipe'],env:{...process.env,DBUS_SESSION_BUS_ADDRESS:''}});
  browsers.push(processChrome);
  let stderr='';processChrome.stderr.on('data',p=>{stderr=(stderr+String(p)).slice(-1800)});
  const endpoint='http://127.0.0.1:'+port;
  await wait(async()=>{
    if(processChrome.exitCode!==null)throw Error('Chrome exit '+stderr);
    const res=await fetch(endpoint+'/json/version',{signal:AbortSignal.timeout(1000)});
    return res.ok;
  },'Chrome CDP '+role,20000);
  const page=await (await fetch(endpoint+'/json/new?'+encodeURIComponent(url),{method:'PUT'})).json();
  assert.ok(page.id&&page.webSocketDebuggerUrl);
  const ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,bad)=>{ws.addEventListener('open',ok,{once:true});ws.addEventListener('error',bad,{once:true})});
  let id=0;const pending=new Map(),outbound=[];
  ws.addEventListener('message',e=>{
    const msg=JSON.parse(e.data);
    if(msg.id&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);
      msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}
    if(msg.method==='Network.requestWillBeSent'){
      const to=String(msg.params?.request?.url??'');
      if(to.includes('hophdnd-8b7b2')||to.includes('docs.google.com/spreadsheets/'))
        outbound.push(to);
    }
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const serial=++id;pending.set(serial,{resolve,reject});
    ws.send(JSON.stringify({id:serial,method,params}));
    setTimeout(()=>{if(pending.has(serial)){pending.delete(serial);reject(Error('CDP '+method+' timed out'));}},18000);
  });
  const evalJs=async js=>{
    const value=await send('Runtime.evaluate',{expression:js,returnByValue:true,awaitPromise:true});
    if(value.exceptionDetails)throw Error('Browser '+role+' JS '+JSON.stringify(value.exceptionDetails).slice(0,650));
    return value.result?.value;
  };
  const until=async(js,label,ms=19000)=>wait(()=>evalJs(js),role+' '+label,ms);
  await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
  // V6 L3: guests and loading/unverified viewers have NO primary nav.
  // The accessible gear is the stable App shell witness for both roles.
  await until('!!document.querySelector(".v3-settings-menu summary")','real App shell');
  return {role,pageId:page.id,ws,send,evalJs,until,outbound};
}
async function clickText(tab,selector,needle){
  if(tab.role==='guest'&&selector==='nav.primary-section-switcher button'&&needle==='Danh sách'){
    // Guest does not have A01/A02. Validate the actual List route and
    // no navigation instead of synthesizing a click or granting admin.
    assert.equal(await tab.evalJs('Boolean(document.querySelector(".item-data-region"))&&'+
      '!document.querySelector("nav.primary-section-switcher")'),true,
      'Guest should already be on the real List without nav tiles');
    return;
  }
  const ok=await tab.evalJs(`(()=>{const list=[...document.querySelectorAll(${JSON.stringify(selector)})];const el=list.find(e=>e.textContent?.includes(${JSON.stringify(needle)}));if(!el)return false;el.click();return true;})()`);
  assert.ok(ok,'Not found '+tab.role+' button '+needle+' in '+selector);
}
async function setSelect(tab,selector,value){
  const ok=await tab.evalJs(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});
    if(!el)return false;el.value=${JSON.stringify(value)};el.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  assert.ok(ok,'Missing select '+selector);
}
async function capture(tab,name){
  const shot=await tab.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  assert.ok(shot.data?.length>1000);
  mkdirSync(resolve('pr95-ui-v2-l3-artifacts'),{recursive:true});
  const path=resolve('pr95-ui-v2-l3-artifacts/'+name+'.png');
  writeFileSync(path,Buffer.from(shot.data,'base64'));return path;
}
const read=()=>ownerReq(PATH+'/generations/'+GEN+'/items/'+ROW);
const rights=()=>ownerReq(PATH+'/permissions/'+GEN);
async function test(){
  await startEmulator();await seed();
  const url=await startSite();
  const admin=await startChrome(url,'admin');
  const guest=await startChrome(url,'guest');
  assert.notEqual(admin.pageId,guest.pageId);
  await guest.until('!!document.querySelector(".v3-settings-menu .v3-gear-login")','anonymous V3 gear-only login');
  await clickText(guest,'nav.primary-section-switcher button','Danh sách');
  try{
    await guest.until('document.querySelector(".item-data-table tbody")?.textContent?.includes("NQ01")===true','real data row, not loading placeholder');
  }catch(error){
    step('GUEST_APP_DIAGNOSTIC',{body:await guest.evalJs('document.body.textContent.slice(0,2500)'),
      table:await guest.evalJs('document.querySelector(".item-data-table tbody")?.textContent?.slice(0,1000)'),
      rows:await guest.evalJs('document.querySelectorAll(".item-data-table tbody tr").length'),
      forbidden:guest.outbound});
    throw error;
  }
  const initial=await guest.evalJs(`(()=>{const cell=document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="note"]');
    return {noteEditable:!!cell?.classList.contains('editable-cell'),noteCellExists:!!cell,accountButton:!!document.querySelector('.v3-settings-menu .v3-gear-login'),
      hiddenAdmin:!!document.querySelector('.v3-settings-menu')&&
        ![...document.querySelectorAll('.v3-settings-menu .options-popover > button')]
          .some(button=>button.textContent?.includes('Chỉnh sửa')||
            button.textContent?.includes('Excel')||button.textContent?.includes('Phân quyền'))};})()`);
  assert.equal(initial.noteEditable,false);assert.ok(initial.accountButton&&initial.hiddenAdmin);
  step('GUEST_INITIAL_DENIED_PASS',initial);
  await capture(guest,'00-v3-guest-list-corner-gear');
  await admin.until('typeof window.__pr95EmulatorGoogleAdminSignIn==="function"','admin Auth hook');
  const principal=await admin.evalJs('window.__pr95EmulatorGoogleAdminSignIn()');
  assert.ok(principal.uid&&principal.emailVerified&&principal.providerIds.includes('google.com'));
  await admin.until('!!document.querySelector(".options-menu summary")','admin menu');
  await admin.until('!document.body.textContent.includes("Chưa xác minh được thế hệ Firebase") && !document.body.textContent.includes("Đang xem bố cục admin đã lưu") && document.body.textContent.includes("Sở mẫu A")','admin profile and epoch confirmed',30000);
  step('ADMIN_BEFORE_ROUTE',{nav:await admin.evalJs('document.querySelector(".options-menu")?.outerHTML.slice(0,850)'),body:await admin.evalJs('document.body.textContent.slice(0,650)')});
  await admin.evalJs('document.querySelector(".options-menu summary").click()');
  const v3Menu=await admin.evalJs(`(()=>{
    const menu=document.querySelector('details.v3-settings-menu');
    const actions=[...menu?.querySelectorAll('.options-popover > button')??[]]
      .map(button=>button.textContent?.trim());
    const gear=menu?.querySelector('summary')?.getBoundingClientRect();
    const cards=[...document.querySelectorAll('nav.primary-section-switcher .primary-section-card')];
    return {open:menu?.open,actions,gearWidth:gear?.width,
      heights:cards.map(c=>c.getBoundingClientRect().height)};
  })()`);
  assert.deepEqual(v3Menu.actions,[
    'Chỉnh sửa','Phân quyền chỉnh sửa ô','Tùy chỉnh báo cáo',
    'Tài khoản và dữ liệu','Nhập / Xuất Excel','Hiện mã khu vực'
  ]);
  assert.equal(v3Menu.open,true);
  assert.equal(v3Menu.gearWidth,34);
  assert.ok(v3Menu.heights.every(height=>Math.abs(height-50)<1));
  await capture(admin,'00-v3-admin-list-open-settings-gear');
  step('V3_L1_REAL_ADMIN_GEAR_50PX_TABS_PASS',v3Menu);
  await clickText(admin,'.options-popover button','Chỉnh sửa');
  await admin.until('!!document.querySelector("nav.settings-hub-tabs")','real edit settings tabs');
  await clickText(admin,'nav.settings-hub-tabs button','Phân quyền chỉnh sửa');
  await admin.until('!!document.querySelector("section.inline-permissions")','real InlinePermissionsTable');
  assert.equal(await admin.evalJs('!!document.querySelector(".item-data-table")'),false,
    'Permission route must render actual permission table, not ordinary list');
  assert.equal(await admin.evalJs('!!document.querySelector(".inline-permission-table select")'),true);
  await capture(admin,'01-admin-permission-table');
  step('ADMIN_REAL_APP_ENTRY_PASS',{adminUid:principal.uid,chromeTarget:admin.pageId,realApp:true});
  // Grant ONE exact note cell of row 1, no column or row blanket grant.
  const noteSelector='.inline-permission-table select[aria-label^="Quyền ô"][aria-label*="Ghi chú"]';
  // Select only first row: the first of multiple note controls.
  await setSelect(admin,noteSelector,'allow');
  await admin.until('!!document.querySelector(".permission-risk-confirm input")','row/permission acknowledgement');
  await admin.evalJs('document.querySelector(".permission-risk-confirm input").click()');
  await clickText(admin,'.inline-permissions button','Lưu quyền chỉnh sửa');
  await wait(async()=>{
    const p=await rights();return p?.cells?.[ROW]?.note===true?p:false;
  },'server grants exact cell');
  let p=await rights();
  assert.deepEqual(p.columns??{},{});assert.deepEqual(p.rows??{},{});
  assert.equal(p.cells?.[ROW]?.note,true);
  assert.equal(p.cells?.[OTHER]?.note,undefined);
  step('ADMIN_GRANT_SERVER_CAS_PASS',{path:PATH+'/permissions/'+GEN,cell:ROW+'/note'});
  // Independent real anonymous Auth Emulator token, read EXACT active generation
  // permission path; no owner credentials in guest rights assertion.
  const anonLogin=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-test-key',{
    method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({returnSecureToken:true})});
  assert.ok(anonLogin.ok,'Anonymous Auth Emulator sign-in failed');
  const anon=await anonLogin.json();
  const scoped=await fetch(BASE+'/'+PATH+'/permissions/'+GEN+'.json?ns='+NS+
    '&auth='+encodeURIComponent(anon.idToken));
  const grantedText=await scoped.text();
  step('ANONYMOUS_SCOPED_RIGHTS_SERVER_READ',{status:scoped.status,text:grantedText.slice(0,450)});
  if(scoped.ok){
    const granted=JSON.parse(grantedText);
    assert.equal(granted?.cells?.[ROW]?.note,true,'Anonymous readback must observe granted cell');
  }
  // Wait for the guest's OWN Firebase SDK/controller permission witness.
  // A separate REST owner read cannot authorize the browser's editor.
  await guest.until('window.__pr95UiV2L3RightsProbe?.().canEditNote===true',
    'guest Firebase permission controller acknowledges cell grant',16000);
  step('GUEST_CONTROLLER_SERVER_GRANT_PASS',{
    snapshot:await guest.evalJs('window.__pr95UiV2L3RightsProbe?.()')});
  // Then navigate the actual App to the editable List. Never replace a
  // React route check with a fixture or privileged test-only client write.
  await clickText(guest,'nav.primary-section-switcher button','Danh sách');
  await guest.until('window.__pr95UiV2L3RightsProbe?.().page==="items"',
    'real guest route Danh sách after permission update',6500);
  try{
    await guest.until(`(()=>{const a=[...document.querySelectorAll('.item-data-table tbody tr')];
      return !!a[0]?.querySelector('td[data-col-key="note"].editable-cell')&&
        !a[0]?.querySelector('td[data-col-key="content"].editable-cell')&&
        !a[1]?.querySelector('td[data-col-key="note"].editable-cell');})()`,
      'guest exact permission appears');
  }catch(err){
    step('GUEST_GRANT_DIAGNOSTIC',{rows:await guest.evalJs(`[...document.querySelectorAll('.item-data-table tbody tr')].map(tr=>({
      code:tr.textContent.slice(0,18),note:tr.querySelector('td[data-col-key="note"]')?.outerHTML.slice(0,360),
      content:tr.querySelector('td[data-col-key="content"]')?.className}))`),
      statuses:await guest.evalJs(`[...document.querySelectorAll('[role=status],[role=alert]')].map(x=>x.textContent.slice(0,150)).slice(0,15)`),
      appClass:await guest.evalJs('document.querySelector(".app-shell")?.className'),
      actualAppRights:await guest.evalJs('window.__pr95UiV2L3RightsProbe?.()'),
      actualGuestSdkRead:await guest.evalJs('window.__pr95UiV2L3RightsRead?.().catch(error=>String(error))'),
      secondListener:await guest.evalJs('window.__pr95UiV2L3RightsWatch')});
    throw err;
  }
  await capture(guest,'02-guest-note-only');
  // Real App note editor: acquire real lease, create draft, Save from UI.
  await guest.evalJs(`document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="note"] button.inline-note-trigger').click()`);
  await guest.until('!!document.querySelector("textarea.inline-note-textarea")','guest real editor');
  const note='L3 quyền ô: khách sửa thật trên Emulator';
  await guest.evalJs(`(()=>{const el=document.querySelector('textarea.inline-note-textarea');
    const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    setter.call(el,${JSON.stringify(note)});el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Enter',ctrlKey:true}));return true;})()`);
  await guest.until('!!document.querySelector(".draft-bar")','business draft after note edit');
  await clickText(guest,'.draft-bar button','Lưu lại vào Firebase');
  await wait(async()=>{const row=await read();return row.note===note&&row.revision===2?row:false;},
    'server confirmed real App guest edit');
  let row=await read();
  assert.equal(row.history['2'].changes.note,note);
  assert.equal(row.history['2'].actor,row.updatedBy);
  assert.ok(row.updatedBy&&row.updatedBy!==principal.uid,'Anonymous editor must not share admin UID');
  step('GUEST_EDIT_SERVER_HISTORY_PASS',{revision:row.revision,note:row.note,
    actorUid:row.updatedBy,auditOperation:row.history['2'].operationId});
  // Wait for React's original Save to settle (server ACK can precede the
  // visible app transition), then reopen the real List and note editor.
  await guest.until(`!window.__pr95UiV2L3RightsProbe?.().workspaceBusy &&
    !document.querySelector(".draft-bar")`,'first save settled in UI',10000);
  await clickText(guest,'nav.primary-section-switcher button','Danh sách');
  await guest.until('window.__pr95UiV2L3RightsProbe?.().page==="items"',
    'real guest list before second edit',6000);
  await guest.until('!!document.querySelector(\'.item-data-table tbody tr:first-child td[data-col-key="note"] button.inline-note-trigger\')',
    'available note editor after save',6500);
  // Create an actual unsaved guest draft BEFORE admin revokes permission.
  await guest.evalJs(`document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="note"] button.inline-note-trigger').click()`);
  await guest.until('!!document.querySelector("textarea.inline-note-textarea")','second edit open');
  await guest.evalJs(`(()=>{const el=document.querySelector('textarea.inline-note-textarea');
    const setter=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;
    setter.call(el,'KHÔNG ĐƯỢC GHI SAU THU HỒI');el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Enter',ctrlKey:true}));return true;})()`);
  await guest.until('!!document.querySelector(".draft-bar")','second local draft exists');
  await setSelect(admin,noteSelector,'inherit');
  await admin.evalJs('document.querySelector(".permission-risk-confirm input")?.click()');
  await clickText(admin,'.inline-permissions button','Lưu quyền chỉnh sửa');
  await wait(async()=>{const q=await rights();return !q?.cells?.[ROW]?.note?true:false;},
    'revoke confirmed on server');
  p=await rights();assert.equal(p?.cells?.[ROW]?.note,undefined);
  await guest.until(`!document.querySelector('.item-data-table tbody tr:first-child td[data-col-key="note"].editable-cell')`,
    'revocation updates live guest App');
  // A revocation may close the unsaved draft action immediately; if a Save
  // button remains, actually attempt it. Both paths must leave server intact.
  const staleSubmit=await guest.evalJs(`[...document.querySelectorAll('.draft-bar button')]
    .some(button=>button.textContent?.includes('Lưu lại vào Firebase'))`);
  if(staleSubmit)await clickText(guest,'.draft-bar button','Lưu lại vào Firebase');
  else step('REVOKED_GUEST_SAVE_CONTROL_REMOVED_PASS',{staleSubmit:false});
  await sleep(550);
  row=await read();
  assert.equal(row.revision,2,'Revoked guest must not increment revision');
  assert.equal(row.note,note,'Revoked guest must not overwrite prior accepted edit');
  step('REVOKE_STALE_DRAFT_SERVER_DENIED_PASS',{revision:row.revision,
    stillOriginalNote:true,noNewAudit:!row.history?.['3']});
  // Nav regression: App reports, account sign-in, exported Excel controls.
  await admin.evalJs('document.querySelector(".options-menu summary").click()');
  await clickText(admin,'.options-popover button','Tài khoản và dữ liệu');
  await admin.until('!!document.querySelector("section.card .settings-mode-bar")','real account/login');
  const account=await admin.evalJs(`(()=>{const t=document.body.textContent;
    return {user:t.includes('Tài khoản Firebase'),rightEntry:t.includes('Phân quyền chỉnh sửa (cột, dòng, ô)'),
      googleLogin:t.includes('Đổi tài khoản Google')};})()`);
  assert.ok(account.user&&account.rightEntry&&account.googleLogin);
  await clickText(admin,'section[aria-label="Tài khoản Firebase"] button','Phân quyền chỉnh sửa (cột, dòng, ô)');
  await admin.until('!!document.querySelector("section.inline-permissions")','account entry to rights');
  await clickText(admin,'nav.settings-hub-tabs button','Về chế độ xem');
  await admin.until('!!document.querySelector(".item-data-table")','leave permission route');
  await clickText(admin,'nav.primary-section-switcher button','Báo cáo tổng hợp');
  await admin.until('!!document.querySelector(".report-table")','real reports');
  await admin.evalJs('document.querySelector(".options-menu summary").click()');
  await clickText(admin,'.options-popover button','Tài khoản và dữ liệu');
  await admin.until('!!document.querySelector("section.card .settings-mode-bar")','account second visit');
  await clickText(admin,'nav.settings-hub-tabs button','Excel · Nhập/Xuất');
  await admin.until('!!document.querySelector(".business-excel-review")','real Excel review');
  const excel=await admin.evalJs(`(()=>{const t=document.body.textContent;
    return {export:t.includes('Xuất dữ liệu đã lưu'),template:t.includes('Tải mẫu Excel'),
      preview:t.includes('Kiểm tra file Excel nghiệp vụ'),oldCopy:t.includes('Google Sheets đang là nguồn chính'),
      locked:t.includes('Nhập nguyên lô trực tiếp đã khóa')};})()`);
  assert.ok(excel.export&&excel.template&&excel.preview&&!excel.oldCopy&&excel.locked);
  await capture(admin,'03-admin-excel-review');
  step('ACCOUNT_REPORT_EXCEL_APP_REGRESSION_PASS',{account,excel});
  // A data draft cannot be silently dropped by opening admin permissions.
  await admin.evalJs('document.querySelector(".options-menu summary").click()');
  await clickText(admin,'.options-popover button','Chỉnh sửa');
  await admin.until('!!document.querySelector("nav.settings-hub-tabs")','admin settings second entry');
  await clickText(admin,'nav.settings-hub-tabs button','Phân quyền chỉnh sửa');
  await admin.until('!!document.querySelector("section.inline-permissions")','admin rights entry again');
  const after=await ownerReq(PATH+'/generations/'+GEN+'/items/'+ROW);
  assert.equal(after.revision,2);
  const effective=await (await fetch(BASE+'/.settings/rules.json?ns='+NS,
    {headers:{Authorization:'Bearer owner'}})).json();
  assert.ok(isDeepStrictEqual(effective,candidate),'Candidate Rules changed during browser test');
  for(const t of [admin,guest])assert.equal(t.outbound.length,0,'Forbidden cloud/Sheets request');
  step('REAL_APP_PERMISSION_E2E_PASS',{adminTarget:admin.pageId,guestTarget:guest.pageId,
    grantedCell:ROW+'/note',serverRevision:after.revision,candidateHash:rulesHash,synthetic:true});
}
let failed=false;
try{await test();}
catch(e){failed=true;console.error('PR95_UI_V2_L3_E2E_FAIL',e?.stack??e);process.exitCode=1;}
finally{
  for(const p of browsers)try{p.kill('SIGTERM')}catch{}
  if(host)await new Promise(ok=>host.close(ok));
  if(emu)try{emu.kill('SIGTERM')}catch{}
  await sleep(450);rmSync(temp,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  if(failed)console.error('PR95_UI_V2_L3_EMULATOR_LOG_TAIL '+emuOutput.slice(-1800));
}
