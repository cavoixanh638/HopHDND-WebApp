/** Real App Spark acceptance with two separate Chromium processes.
 * The caller starts demo-hdnd Auth/RTDB Emulators. All records are synthetic.
 */
import assert from 'node:assert/strict';
import {createServer as createHttpServer} from 'node:http';
import {readFileSync,statSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname,sep} from 'node:path';
import {createRequire} from 'node:module';
import {createServer as createViteServer} from 'vite';

const require=createRequire(import.meta.url);
const {chromium}=require('../cell-edit-service/node_modules/playwright');
assert.equal(process.env.GCLOUD_PROJECT,'demo-hdnd','Requires the isolated demo-hdnd emulator');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST,'127.0.0.1:9099');
assert.equal(process.env.FIREBASE_DATABASE_EMULATOR_HOST,'127.0.0.1:9000');
const database='http://127.0.0.1:9000';
const ownerHeaders={Authorization:'Bearer owner','Content-Type':'application/json'};
async function request(path,method='GET',value){
  const response=await fetch(database+'/'+path+'.json?ns=demo-hdnd',{
    method,headers:ownerHeaders,body:value===undefined?undefined:JSON.stringify(value)});
  assert(response.ok,`Emulator ${method} ${path} returned ${response.status}`);
  return response.json();
}
const fixtureServer=await createViteServer({configFile:false,cacheDir:'.cache/pr188-fixture',
  server:{middlewareMode:true},appType:'custom'});
try{
  const {createDemoItems}=await fixtureServer.ssrLoadModule('/src/data/demo-items.ts');
  const {defaultItemLayout}=await fixtureServer.ssrLoadModule('/src/data/item-preferences.ts');
  const {createReferenceListLayout}=await fixtureServer.ssrLoadModule('/src/data/reference-list-layout.ts');
  const {defaultReportLayout}=await fixtureServer.ssrLoadModule('/src/data/report-preferences.ts');
  const {catalogFromItems}=await fixtureServer.ssrLoadModule('/src/data/catalogs.ts');
  const items=createDemoItems(3).map((item,index)=>{
    const {archivedAt,...row}=item;
    return {...row,displayCode:'NQ'+String(index+1).padStart(2,'0'),documentKind:'NQ',type:'QPPL',
      partyLevel:'BCH',progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',
      progressCouncil:'Sở chưa trình',revision:1,operationId:'seed',updatedAt:Date.now(),updatedBy:'seed'};
  });
  const profile={dataSource:'primary',catalogs:catalogFromItems(items),
    reports:defaultReportLayout(),items:createReferenceListLayout(defaultItemLayout())};
  await request('.settings/rules','PUT',JSON.parse(readFileSync('firebase/database.spark.rules.json','utf8')));
  await request('','PUT',{hdnd:{items:Object.fromEntries(items.map(row=>[row.recordId,row])),
    permissions:{columns:{progressCouncil:true,note:true}},
    profile:{revision:1,payload:JSON.stringify(profile)}}});
}finally{await fixtureServer.close();}

const root=resolve('dist-pages-test');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const server=createHttpServer((req,res)=>{
  try{
    const path=new URL(req.url??'/','http://127.0.0.1').pathname;
    const file=resolve(root,'.'+(path==='/'?'/index.html':path));
    if(!file.startsWith(root+sep)||!statSync(file).isFile())throw Error('Not found');
    res.writeHead(200,{'content-type':types[extname(file)]??'application/octet-stream','cache-control':'no-store'});
    res.end(readFileSync(file));
  }catch{res.writeHead(404);res.end();}
});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const origin='http://127.0.0.1:'+server.address().port;
const output='qa-results/pr188-two-browser';
mkdirSync(output,{recursive:true});
const browsers=[];
const blocked=[];
const samples=[];
const logs=[];
const writes=new Map();
let holdNextRow=null;
let heldWrite=null;
let releaseHeldWrite=null;
let writer,receiver;
const rowIds=['demo-0001','demo-0002','demo-0003'];
const metrics=[];
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
async function until(check,label,timeout=15000){
  const start=performance.now();
  while(performance.now()-start<timeout){
    const value=await check();
    if(value)return value;
    await sleep(10);
  }
  throw Error('Timed out: '+label);
}
function fieldButton(page,code){
  return page.getByRole('button',{name:new RegExp('^'+code+': Tiến độ trình HĐND ban hành NQ/BC:')});
}
async function open(page,code){
  const start=performance.now();
  await fieldButton(page,code).click();
  await page.getByRole('listbox',{name:code+': Tiến độ trình HĐND ban hành NQ/BC',exact:true}).waitFor();
  return performance.now()-start;
}
async function select(page,code,value){
  const picker=page.getByRole('listbox',{name:code+': Tiến độ trình HĐND ban hành NQ/BC',exact:true});
  await picker.getByRole('option',{name:value,exact:true}).click();
}
async function waitReleased(id){
  await until(async()=>{
    const lock=await request('hdnd/editLocks/'+id+'/progressCouncil');
    return lock&&lock.expiresAt===0;
  },'release '+id);
  await until(()=>fieldButton(writer,'NQ'+String(rowIds.indexOf(id)+1).padStart(2,'0')).isEnabled(),
    'row enabled after save');
}
function normalUiHasNoSaveMessage(page){
  return page.evaluate(()=>({
    draftBars:document.querySelectorAll('.draft-bar').length,
    status:[...document.querySelectorAll('[role=status]')].map(node=>node.textContent??'')
      .some(text=>/Đang đồng bộ|Đã lưu \d+ nội dung|đang chờ đồng bộ/.test(text))
  }));
}
try{
  for(let index=0;index<2;index++){
    const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||undefined,
      args:['--no-sandbox','--disable-dev-shm-usage']});
    browsers.push(browser);
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const page=await context.newPage();
    await page.route('**/*',route=>{
      const url=new URL(route.request().url());
      if(url.hostname==='127.0.0.1'||url.hostname==='localhost')return route.continue();
      blocked.push(url.origin);return route.abort();
    });
    await page.routeWebSocket('**/*',socket=>{
      const url=new URL(socket.url());
      assert(['127.0.0.1','localhost'].includes(url.hostname),'External websocket attempted');
      const upstream=socket.connectToServer();
      socket.onMessage(async message=>{
        let packet;
        try{packet=JSON.parse(String(message));}catch{}
        const data=packet?.d;
        const path=data?.b?.p?.replace(/^\//,'');
        if(index===0&&data?.a==='p'&&/^hdnd\/items\/[^/]+$/.test(path??'')){
          writes.set(path,(writes.get(path)??0)+1);
          if(holdNextRow===path){
            holdNextRow=null;
            heldWrite={path,packet};
            await new Promise(done=>{releaseHeldWrite=done;});
          }
        }
        upstream.send(message);
      });
      upstream.onMessage(message=>socket.send(message));
    });
    page.on('console',message=>{
      if(message.text().startsWith('HDND_RTDB_EDIT_PERF ')){
        const metric=JSON.parse(message.text().slice('HDND_RTDB_EDIT_PERF '.length));
        metrics.push({browser:index,at:performance.now(),...metric});
      }
    });
    page.on('pageerror',error=>logs.push({browser:index,error:String(error)}));
    await page.goto(origin+'/?editPerf=1',{waitUntil:'networkidle'});
    await page.getByRole('button',{name:'Danh sách các ND trình HĐND',exact:true}).click();
    await fieldButton(page,'NQ01').waitFor();
    assert.equal(await page.locator('.item-data-table tbody tr').count(),3);
    if(index===0)writer=page;else receiver=page;
  }
  assert.equal(browsers.length,2);
  await open(writer,'NQ01');
  const firstLock=await request('hdnd/editLocks/'+rowIds[0]+'/progressCouncil');
  const firstUid=firstLock.uid;
  await fieldButton(receiver,'NQ01').click();
  await receiver.getByRole('alert').filter({hasText:/phiên khác giữ khóa|người khác/}).waitFor();
  assert.equal(await receiver.getByRole('listbox',{name:'NQ01: Tiến độ trình HĐND ban hành NQ/BC'}).count(),0);
  assert.equal((await request('hdnd/items/'+rowIds[0])).revision,1);
  await writer.keyboard.press('Escape');
  await waitReleased(rowIds[0]);
  await open(receiver,'NQ01');
  const secondLock=await request('hdnd/editLocks/'+rowIds[0]+'/progressCouncil');
  assert.notEqual(secondLock.uid,firstUid,'Independent browser principals must differ');
  await receiver.keyboard.press('Escape');
  await waitReleased(rowIds[0]);

  for(let index=0;index<24;index++){
    const value=index%2===0?'VP đang xử lý':'Sở chưa trình';
    const lockMs=await open(writer,'NQ01');
    const priorMetric=metrics.length;
    const before=await request('hdnd/items/'+rowIds[0]);
    const start=performance.now();
    const receive=fieldButton(receiver,'NQ01').filter({hasText:value}).waitFor();
    await select(writer,'NQ01',value);
    await receive;
    const receiverMs=performance.now()-start;
    const metric=await until(()=>metrics.slice(priorMetric).find(m=>m.browser===0&&m.action==='save'),
      'writer save ACK');
    const ackMs=metric.at-start;
    await waitReleased(rowIds[0]);
    const after=await request('hdnd/items/'+rowIds[0]);
    assert.equal(after.progressCouncil,value);
    assert.equal(after.revision,before.revision+1);
    assert.equal(Object.values(after.history).filter(event=>event.operationId===after.operationId).length,1);
    assert.deepEqual(await normalUiHasNoSaveMessage(writer),{draftBars:0,status:false});
    samples.push({lockMs:Math.round(lockMs),ackMs:Math.round(ackMs),receiverMs:Math.round(receiverMs)});
  }

  // Hold the writer's row transaction in the network. Its locally rendered
  // draft cannot make the peer show success. A separate row remains editable.
  const beforeHeld=await request('hdnd/items/'+rowIds[0]);
  await open(writer,'NQ01');
  holdNextRow='hdnd/items/'+rowIds[0];
  await select(writer,'NQ01','VP đang xử lý');
  await until(()=>heldWrite,'outgoing CAS captured');
  assert.equal((await request('hdnd/items/'+rowIds[0])).revision,beforeHeld.revision);
  assert.match(await fieldButton(receiver,'NQ01').innerText(),/Sở chưa trình/);
  assert.equal(await writer.locator('.draft-bar').count(),0);
  await open(writer,'NQ02');
  await select(writer,'NQ02','Hoàn thành');
  releaseHeldWrite();
  await waitReleased(rowIds[0]);
  await fieldButton(receiver,'NQ02').filter({hasText:'Hoàn thành'}).waitFor();
  await waitReleased(rowIds[1]);
  assert.equal((await request('hdnd/items/'+rowIds[1])).progressCouncil,'Hoàn thành');

  // Existing test-only hook drops the caller ACK after the server commits.
  // The failed operation must stay explicit and never replay on another edit.
  await writer.waitForFunction(()=>typeof window.__pr159ArmSparkCellCallerAckLoss==='function');
  await writer.evaluate(()=>window.__pr159ArmSparkCellCallerAckLoss());
  await open(writer,'NQ03');
  await select(writer,'NQ03','VP đang xử lý');
  await writer.locator('.list-save-errors').waitFor();
  const uncertain=await request('hdnd/items/'+rowIds[2]);
  assert.equal(uncertain.progressCouncil,'VP đang xử lý');
  const rejectedWriteCount=writes.get('hdnd/items/'+rowIds[2]);
  await open(writer,'NQ02');
  await select(writer,'NQ02','Sở chưa trình');
  await fieldButton(receiver,'NQ02').filter({hasText:'Sở chưa trình'}).waitFor();
  await waitReleased(rowIds[1]);
  assert.equal(writes.get('hdnd/items/'+rowIds[2]),rejectedWriteCount,'Uncertain operation auto-replayed');
  assert.equal((await request('hdnd/items/'+rowIds[2])).revision,uncertain.revision);
  assert.equal(await writer.locator('.list-save-errors').isVisible(),true);
  assert.equal(await writer.locator('.draft-bar').isVisible(),true);
  assert.equal(blocked.length,0,'External requests attempted');
  assert.deepEqual(logs,[],'Browser runtime error');
  await writer.screenshot({path:output+'/writer-failed-ack-retained.png',fullPage:false});
  await receiver.screenshot({path:output+'/receiver-server-values.png',fullPage:false});
  const summarize=key=>{
    const values=samples.map(row=>row[key]).sort((a,b)=>a-b);
    return {n:values.length,p50Ms:values[Math.ceil(values.length*.5)-1],p95Ms:values[Math.ceil(values.length*.95)-1]};
  };
  const report={result:'PASS',syntheticOnly:true,productionWrites:0,browserProcesses:2,
    distinctAnonymousPrincipals:true,externalRequests:blocked.length,
    lock:summarize('lockMs'),clickToWriterAck:summarize('ackMs'),
    clickToPeerRendered:summarize('receiverMs'),samples,
    checks:['same-cell exclusion','server ACK before success','independent row while CAS held',
      '24 status saves with peer rendering','quiet success','uncertain ACK draft retained','no automatic replay']};
  writeFileSync(output+'/report.json',JSON.stringify(report,null,2)+'\n');
  console.log('PR188_TWO_BROWSER_PASS',JSON.stringify({...report,samples:undefined}));
}catch(error){
  writeFileSync(output+'/failure.json',JSON.stringify({error:String(error),blocked,logs,samples},null,2));
  if(writer)await writer.screenshot({path:output+'/failure-writer.png'}).catch(()=>{});
  throw error;
}finally{
  releaseHeldWrite?.();
  await Promise.all(browsers.map(browser=>browser.close()));
  await new Promise(done=>server.close(done));
}
