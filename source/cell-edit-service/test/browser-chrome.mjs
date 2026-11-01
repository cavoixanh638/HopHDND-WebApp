import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const PROJECT='demo-pr142-cell-edit',NS=PROJECT+'-default-rtdb';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
   process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000')
 throw Error('EMULATOR_ONLY Chrome test');
const base='http://127.0.0.1:4174';
const cases=[];
let browser=null,server=null;
const row={
 recordId:'r1',displayCode:'NQ01',stt:1,revision:1,documentKind:'NQ',
 content:'MẪU Nghị quyết',department:'Sở mẫu',type:'QPPL',partyLevel:'BCH',
 progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',
 progressCouncil:'Sở chưa trình',specialist:'Chuyên viên',
 room:'Phòng mẫu',vpLeader:'Lãnh đạo mẫu',ubndLeader:'Lãnh đạo UBND',
 specificProgress:'MẪU tiến độ',note:'MẪU chưa sửa',isDropped:false,
 operationId:'initial',updatedAt:Date.now(),updatedBy:'seed'
};
async function owner(method,path,data){
 const response=await fetch(`http://127.0.0.1:9000/${path}.json?ns=${NS}`,{
 method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
 ...(data===undefined?{}:{body:JSON.stringify(data)})});
 assert.equal(response.status,200,`Fixture owner ${method} ${path} failed ${response.status}`);
 return response.json();
}
async function step(name,callback){
 try{await callback();cases.push({name,status:'PASS'});console.log('CHROME PASS '+name);}
 catch(e){cases.push({name,status:'FAIL',reason:String(e?.message??e).slice(0,220)});
   console.log('CHROME FAIL '+name+' '+String(e?.message??e).slice(0,160));}
}
async function ready(url){
 for(let n=0;n<80;n++){
  try{const r=await fetch(url);if(r.status===200)return;}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,180));
 }
 throw Error('Vite browser test host did not start');
}
let fatal=null;
try{
 server=spawn(process.execPath,['node_modules/vite/bin/vite.js',
    '--host','127.0.0.1','--port','4174','--strictPort','--mode','pages-test'],
   {cwd:resolve('..'),stdio:'ignore',env:{...process.env}});
 await ready(base+'/cell-edit-service/test/browser-qa.html');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:1280,height:800}});
 const A=await ctx.newPage(),B=await ctx.newPage();
 await Promise.all([A.goto(base+'/cell-edit-service/test/browser-qa.html'),
   B.goto(base+'/cell-edit-service/test/browser-qa.html')]);
 await Promise.all([
   A.waitForFunction(()=>typeof window.qa==='object'),
   B.waitForFunction(()=>typeof window.qa==='object')
 ]);
 const [uidA,uidB]=await Promise.all([
   A.evaluate(()=>window.qa.init()),B.evaluate(()=>window.qa.init())
 ]);
 assert.equal(uidA,uidB,'Two Chrome tabs must be the SAME verified Google UID');
 await owner('PUT','hdnd',{
   items:{r1:row},editors:{[uidA]:true},permissions:{columns:{note:true}},
   control:{revision:1,editingLocked:false,changedAt:new Date().toISOString()},
   freezeControl:{mode:'OPEN',revision:1,epoch:'poc',changedAt:0,deadline:0}
 });
 await step('A acquires real manager lease',async()=>{
   const ok=await A.evaluate(()=>window.qa.acquire());
   assert.equal(ok,true);await A.screenshot({path:'test/browser-owner-acquired.local.png'});
 });
 await step('B same UID cannot acquire or use DB-readable public proof',async()=>{
   const publicLease=await B.evaluate(()=>window.qa.readPublic());
   assert.equal(publicLease.lease.proofHash.length,64);
   assert.ok(!('secret' in publicLease.lease));
   const held=await B.evaluate(()=>window.qa.acquire());
   assert.equal(held,false,'same UID B acquired A lease');
   assert.equal(await B.evaluate(()=>window.qa.copiedHashAttack()),'DENIED');
   await B.screenshot({path:'test/browser-other-tab-denied.local.png'});
 });
 await step('ACK lost after server commit retains draft and original operationId',async()=>{
   await A.locator('#draft').fill('MẪU Chrome sau mất ACK');
   let tripped=false;
   await A.route('**/cellEdit',async route=>{
     if(!tripped&&route.request().method()==='POST'){
       tripped=true;
       const serverReply=await route.fetch();
       assert.equal(serverReply.status(),200,'Function did not commit before ACK drop');
       await route.abort('failed');
     }else await route.continue();
   });
   const result=await A.evaluate(()=>window.qa.save());
   await A.unrouteAll({behavior:'wait'});
   assert.equal(tripped,true,'ACK-loss route did not intercept actual callable POST');
   assert.equal(result.ok,false,'UI falsely acknowledged an interrupted response');
   const draft=await A.evaluate(()=>window.qa.draft());
   assert.equal(draft.text,'MẪU Chrome sau mất ACK');
   assert.ok(draft.operationId,'original operationId lost on network error');
   const serverRow=await owner('GET','hdnd/items/r1');
   assert.equal(serverRow.revision,2);
   assert.equal(serverRow.note,draft.text);
   await A.screenshot({path:'test/browser-ack-lost-keeps-draft.local.png'});
 });
 await step('same operationId retry confirms once, no double audit/revision',async()=>{
   const result=await A.evaluate(()=>window.qa.save());
   assert.equal(result.ok,true,result.message);
   assert.equal(result.revision,2);
   const latest=await owner('GET','hdnd/items/r1');
   assert.equal(latest.revision,2);
   assert.equal(latest.history['2'].changes.note,'MẪU Chrome sau mất ACK');
   const clientDraft=await A.evaluate(()=>window.qa.draft());
   assert.equal(clientDraft.operationId,null);
   await A.screenshot({path:'test/browser-retry-confirmed.local.png'});
 });
 await ctx.close();
}catch(e){fatal=String(e?.stack??e).slice(0,1800);console.log('CHROME FATAL '+fatal);}
finally{
 if(browser)await browser.close();
 if(server){server.kill('SIGTERM');}
 writeFileSync('test/browser-witness.local.json',JSON.stringify({
   source:'Actual CellEditSessionManager + FirebaseRepository in Chrome with local Auth+Functions+FULL Rules RTDB',
   emulatorOnly:true,summary:{pass:cases.filter(x=>x.status==='PASS').length,
     fail:cases.filter(x=>x.status==='FAIL').length},fatal,cases
 },null,2));
}
console.log('CHROME SUMMARY '+cases.filter(c=>c.status==='PASS').length+' PASS / '+cases.filter(c=>c.status==='FAIL').length+' FAIL');
process.exit(fatal||cases.some(x=>x.status==='FAIL')?1:0);
