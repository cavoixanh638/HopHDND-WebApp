import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const PROJECT='demo-hdnd',ROOT='http://127.0.0.1:4174';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
   process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
   !process.env.FIREBASE_EMULATOR_HUB)
  throw Error('PR142 full App Chrome: AUTH+RTDB+FUNCTIONS EMULATOR only');
const generation='gen_pr142_fullapp_real_0001',operation='pr142_fullapp_real_0001';
const rows={
 r1:makeRow('r1','NQ01',1,'MẪU ghi chú trước khi sửa'),
 r2:makeRow('r2','NQ02',2,'MẪU nội dung giữ khóa')
};
function makeRow(id,displayCode,stt,note){
 return {recordId:id,displayCode,stt,revision:1,documentKind:'NQ',
   content:'MẪU nội dung trình HĐND '+displayCode,department:'Sở mẫu A',
   type:'QPPL',partyLevel:'BCH',progressParty:'Sở chưa trình',
   progressBuild:'Sở chưa trình',progressCouncil:'Sở chưa trình',
   specialist:'Chuyên viên mẫu A',room:'Phòng mẫu 1',
   vpLeader:'Lãnh đạo VPUB',ubndLeader:'Lãnh đạo UBND',
   specificProgress:'MẪU đang xử lý',note,isDropped:false,
   operationId:'seed',updatedAt:Date.now(),updatedBy:'local-emulator-seed'};
}
async function owner(method,path,value){
 const url='http://127.0.0.1:9000/'+path+'.json?ns='+PROJECT;
 const res=await fetch(url,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer owner'},
   ...(value===undefined?{}:{body:JSON.stringify(value)})});
 assert.equal(res.status,200,'Owner Emulator '+method+' '+path+' got '+res.status);
 return res.json();
}
const read=path=>owner('GET',path);
const write=(path,value)=>owner('PUT',path,value);
const cases=[],screens=[];
async function step(name,fn){
 try{await fn();cases.push({name,status:'PASS'});console.log('PR142_FULL_APP_PASS',name);}
 catch(e){cases.push({name,status:'FAIL',reason:String(e?.message??e).slice(0,350)});
  console.log('PR142_FULL_APP_FAIL',name,String(e?.message??e).slice(0,350));}
}
function snapshot(page,path){
 const name='full-app-'+path+'.local.png';
 screens.push(name);return page.screenshot({path:resolve(import.meta.dirname,name),fullPage:false});
}
async function hostReady(){
 for(let i=0;i<85;i++){
  try{const r=await fetch(ROOT+'/pages.html');if(r.ok)return;}
  catch{}
  await new Promise(r=>setTimeout(r,180));
 }
 throw Error('Vite pages-test localhost did not start');
}
async function loaded(page){
 await page.waitForSelector('.item-data-table tbody tr',{timeout:30000});
 await page.waitForSelector('.item-list-page-title',{timeout:30000});
}
const noteButton=(page,code)=>page.locator('button.inline-note-trigger[aria-label="'+code+': Ghi chú"]');
async function begin(page,code){
 await noteButton(page,code).first().click();
 const textarea=page.locator('textarea.inline-note-textarea[aria-label="'+code+': Ghi chú"]');
 await textarea.waitFor({state:'visible',timeout:15000});
 return textarea;
}
async function save(page,code,newText){
 const textarea=await begin(page,code);
 await textarea.fill(newText);
 await textarea.press('Control+Enter');
 await textarea.waitFor({state:'hidden',timeout:7000});
}
async function waitRow(field,value,id='r1',ms=12000){
 for(let i=0;i<Math.ceil(ms/180);i++){
  const row=await read('hdnd/datasetV2/generations/'+generation+'/items/'+id);
  if(row?.[field]===value)return row;
  await new Promise(r=>setTimeout(r,180));
 }
 throw Error('RTDB did not confirm '+id+'/'+field+' = '+value);
}
let server,chrome,error;
try{
 await write('hdnd',{datasetV2:{
     active:{generationId:generation,operationId:operation,revision:1,rowCount:2,digest:'a'.repeat(64)},
     generations:{[generation]:{items:rows}},
     permissions:{[generation]:{columns:{note:true,specificProgress:true,progressBuild:true}}},
     operations:{[operation]:{status:'COMMITTED',from:'legacy',to:generation,at:Date.now()}}
   },permissions:{columns:{note:true,specificProgress:true,progressBuild:true}},
   control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
   freezeControl:{mode:'OPEN',revision:1,epoch:1,actor:'local-fixture',changedAt:Date.now(),
      deadline:0,closedAt:0}
 });
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1',
  '--port','4174','--strictPort','--mode','pages-test'],
  {cwd:resolve(import.meta.dirname,'../..'),env:{...process.env},stdio:'ignore'});
 await hostReady();
 chrome=await chromium.launch({headless:true,args:['--no-sandbox']});
 const guestContext=await chrome.newContext({viewport:{width:1280,height:900}});
 const guest=await guestContext.newPage();
 await guest.goto(ROOT+'/pages.html');await loaded(guest);
 await step('guest editable List note uses real callable and server audit',async()=>{
  assert.ok(await noteButton(guest,'NQ01').isVisible(),'Granted guest note trigger not visible');
  await save(guest,'NQ01','MẪU guest thật đã lưu');
  const row=await waitRow('note','MẪU guest thật đã lưu');
  assert.equal(row.revision,2);assert.equal(row.history['2'].changes.note,'MẪU guest thật đã lưu');
  assert.equal(row.history['2'].oldValues.note,'MẪU ghi chú trước khi sửa');
  await snapshot(guest,'guest-list-saved');
 });
 await step('revoked individual cell cannot open even if column remains granted',async()=>{
  await write('hdnd/datasetV2/permissions/'+generation+'/cells/r1/note',false);
  await guest.waitForFunction(()=>!document.querySelector('button.inline-note-trigger[aria-label="NQ01: Ghi chú"]'),
    {timeout:12000});
  assert.equal((await read('hdnd/datasetV2/generations/'+generation+'/items/r1')).revision,2);
  await snapshot(guest,'guest-permission-revoked');
 });
 await write('hdnd/datasetV2/permissions/'+generation+'/cells/r1/note',true);
 const adminContext=await chrome.newContext({viewport:{width:1280,height:900}});
 const A=await adminContext.newPage(),B=await adminContext.newPage();
 await Promise.all([A.goto(ROOT+'/pages.html'),B.goto(ROOT+'/pages.html')]);
 await Promise.all([A.waitForFunction(()=>typeof window.__pr95EmulatorGoogleAdminSignIn==='function'),
   B.waitForFunction(()=>typeof window.__pr95EmulatorGoogleAdminSignIn==='function')]);
 const [authA,authB]=await Promise.all([
   A.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn()),
   B.evaluate(()=>window.__pr95EmulatorGoogleAdminSignIn())
 ]);
 assert.equal(authA.uid,authB.uid);
 // Admin Auth changes can leave either page on Overview; the navigation
 // component mounts asynchronously. Wait for a visible real List tab instead
 // of a one-time count() that can race the Auth state transition.
 for(const page of [A,B]){
   if(!(await page.locator('.item-list-page-title').isVisible())){
     const button=page.locator('nav.primary-section-switcher button')
       .filter({hasText:'Danh sách'}).first();
     await button.waitFor({state:'visible',timeout:20000});
     await button.click();
   }
 }
 try{await Promise.all([loaded(A),loaded(B)]);}
 catch(error){
   const diagnostics=await Promise.all([A,B].map(async page=>
     page.evaluate(()=>({route:location.pathname,
       listTitle:!!document.querySelector('.item-list-page-title'),
       rows:document.querySelectorAll('.item-data-table tbody tr').length,
       nav:document.querySelector('nav.primary-section-switcher')?.textContent?.slice(0,200)
     })).catch(e=>({error:String(e)}))));
   console.log('PR142_ADMIN_LIST_WAIT_DIAGNOSTIC',JSON.stringify(diagnostics));
   await Promise.allSettled([snapshot(A,'admin-a-list-timeout'),snapshot(B,'admin-b-list-timeout')]);
   throw error;
 }
 await step('two Chrome FULL App admin tabs same UID cannot share a lease',async()=>{
   const textareaA=await begin(A,'NQ02');
   assert.ok(await textareaA.isVisible());
   await noteButton(B,'NQ02').first().click();
   await B.waitForSelector('.inline-note-entry .error-text',{timeout:9000});
   assert.equal(await B.locator('textarea.inline-note-textarea[aria-label="NQ02: Ghi chú"]').count(),0);
   assert.match(await B.locator('.inline-note-entry .error-text').first().innerText(),/Ô đang|khóa|phiên/i);
   await snapshot(B,'same-uid-other-tab-denied');
 });
 await step('admin A saves held note, revision and actor verified, B stays denied',async()=>{
   const textarea=A.locator('textarea.inline-note-textarea[aria-label="NQ02: Ghi chú"]');
   await textarea.fill('MẪU A giữ khóa và đã lưu');
   await textarea.press('Control+Enter');
   const row=await waitRow('note','MẪU A giữ khóa và đã lưu','r2');
   assert.equal(row.revision,2);assert.equal(row.updatedBy,authA.uid);
   assert.equal(row.history['2'].actor,authA.uid);
   await snapshot(A,'admin-owner-confirmed');
 });
 await step('in-flight FROZEN prevents new edit and preserves old server row',async()=>{
   const before=await read('hdnd/datasetV2/generations/'+generation+'/items/r1');
   await write('hdnd/freezeControl',{mode:'FROZEN',revision:2,epoch:2,
     actor:authA.uid,changedAt:Date.now(),deadline:0,closedAt:Date.now(),
     datasetV2:{generationId:generation,operationId:operation,revision:1,rowCount:2,
       digest:'a'.repeat(64)},closeKind:'forced'});
   await A.waitForFunction(()=>!document.querySelector('button.inline-note-trigger[aria-label="NQ01: Ghi chú"]'),
     {timeout:12000});
   const after=await read('hdnd/datasetV2/generations/'+generation+'/items/r1');
   assert.deepEqual(after,before);
   await snapshot(A,'frozen-list-blocked');
 });
 await guestContext.close();await adminContext.close();
}catch(e){error=String(e?.stack??e).slice(0,1500);console.log('PR142_FULL_APP_FATAL',error);}
finally{
 if(chrome)await chrome.close();
 if(server)server.kill('SIGTERM');
 const result={demoProject:PROJECT,source:'real Pages App+Auth+Functions+RTDB Emulator FULL candidate Rules',
   summary:{pass:cases.filter(x=>x.status==='PASS').length,fail:cases.filter(x=>x.status==='FAIL').length},
   error,cases,screens};
 mkdirSync('cell-edit-service/test',{recursive:true});
 writeFileSync(resolve(import.meta.dirname,'full-app-witness.local.json'),JSON.stringify(result,null,2));
}
console.log('PR142_FULL_APP_SUMMARY',cases.filter(x=>x.status==='PASS').length,
 cases.filter(x=>x.status==='FAIL').length);
process.exit(error||cases.some(x=>x.status==='FAIL')?1:0);
