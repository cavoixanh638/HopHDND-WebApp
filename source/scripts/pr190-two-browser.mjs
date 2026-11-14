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
const output='qa-results/pr190-two-browser';
mkdirSync(output,{recursive:true});
const browsers=[];
const blocked=[];
const samples=[];
const logs=[];
const diagnostics=[];
const writes=new Map();
let holdNextRow=null;
let heldWrite=null;
let releaseHeldWrite=null;
let holdNextLease=null;
let heldLeaseWrite=null;
let releaseHeldLease=null;
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
  const picker=page.getByRole('listbox',{name:code+': Tiến độ trình HĐND ban hành NQ/BC',exact:true});
  await picker.waitFor();
  const visibleMs=performance.now()-start;
  // Visibility is NOT permission to write. Keep the historic "lockMs"
  // measure tied to the actual server grant, not speculative popup paint.
  await until(()=>picker.getByRole('option').first().isEnabled(),'authorized picker '+code);
  return {lockMs:performance.now()-start,visibleMs};
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
    if(index===0)writer=page;else receiver=page;
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
            holdNextRow=null;heldWrite={path,packet};
            await new Promise(done=>{releaseHeldWrite=done;});
          }
        }
        upstream.send(message);
      });
      upstream.onMessage(message=>socket.send(message));
    });
    page.on('console',message=>{
      if(['error','warning'].includes(message.type()))
        diagnostics.push({browser:index,type:message.type(),text:message.text()});
      if(message.text().startsWith('HDND_RTDB_EDIT_PERF ')){
        const metric=JSON.parse(message.text().slice('HDND_RTDB_EDIT_PERF '.length));
        metrics.push({browser:index,at:performance.now(),...metric});
      }
    });
    page.on('pageerror',error=>logs.push({browser:index,error:String(error)}));
    await page.goto(origin+'/?editPerf=1',{waitUntil:'networkidle'});
    await fieldButton(page,'NQ01').waitFor();
    assert.equal(await page.locator('.item-data-table tbody tr').count(),3);
    if(index===0)writer=page;else receiver=page;
  }
  // Opening and choosing an allowed status require no network lease.
  const firstOpen=await open(writer,'NQ01');
  const ready=writer.getByRole('listbox',{name:'NQ01: Tiến độ trình HĐND ban hành NQ/BC',exact:true});
  assert.equal(await ready.getByRole('option',{name:'VP đang xử lý'}).isEnabled(),true);
  assert.equal(await request('hdnd/editLocks/'+rowIds[0]+'/progressCouncil'),null);
  await writer.keyboard.press('Escape');
  assert.equal((await request('hdnd/items/'+rowIds[0])).revision,1);
  // Realtime peer rendering + server ACK in 24 *distinct* row CAS operations.
  for(let index=0;index<24;index++){
    const value=index%2===0?'VP đang xử lý':'Sở chưa trình';
    const openMs=await open(writer,'NQ02');
    const before=await request('hdnd/items/'+rowIds[1]);
    const priorMetric=metrics.length;
    const start=performance.now();
    const peer=fieldButton(receiver,'NQ02').filter({hasText:value}).waitFor();
    await select(writer,'NQ02',value);
    await peer;
    const peerMs=performance.now()-start;
    const ack=await until(()=>metrics.slice(priorMetric).find(m=>
      m.browser===0&&m.action==='saveStatus'),'direct writer confirmed ACK');
    const ackMs=ack.at-start;
    const after=await request('hdnd/items/'+rowIds[1]);
    assert.equal(after.progressCouncil,value);
    assert.equal(after.revision,before.revision+1);
    assert.equal(Object.values(after.history).filter(e=>e?.operationId===after.operationId).length,1);
    assert.deepEqual(await normalUiHasNoSaveMessage(writer),{draftBars:0,status:false});
    samples.push({openMs:Math.round(openMs),ackMs:Math.round(ackMs),peerMs:Math.round(peerMs)});
  }
  // Caller callback loss after server accepted: peer sees data, writer retains
  // draft/error until human resolves; unrelated edit MUST NOT replay operation.
  await writer.waitForFunction(()=>typeof window.__pr159ArmSparkCellCallerAckLoss==='function');
  await writer.evaluate(()=>window.__pr159ArmSparkCellCallerAckLoss());
  await open(writer,'NQ03');
  await select(writer,'NQ03','VP đang xử lý');
  await writer.locator('.list-save-errors').waitFor();
  const uncertain=await request('hdnd/items/'+rowIds[2]);
  assert.equal(uncertain.progressCouncil,'VP đang xử lý');
  const uncertainWrites=writes.get('hdnd/items/'+rowIds[2]);
  await open(writer,'NQ02');
  await select(writer,'NQ02','VP đang xử lý');
  await fieldButton(receiver,'NQ02').filter({hasText:'VP đang xử lý'}).waitFor();
  assert.equal(writes.get('hdnd/items/'+rowIds[2]),uncertainWrites,
    'Uncertain direct-CAS operation was replayed');
  assert.equal((await request('hdnd/items/'+rowIds[2])).revision,uncertain.revision);
  assert.equal(await writer.locator('.list-save-errors').isVisible(),true);
  // Deterministic simultaneous same-field conflict using a held *row* CAS
  // on browser A while browser B commits from the unchanged baseline.
  await open(writer,'NQ01');
  await open(receiver,'NQ01');
  holdNextRow='hdnd/items/'+rowIds[0];
  await select(writer,'NQ01','VP đang xử lý');
  await until(()=>heldWrite,'hold writer single-CAS before server');
  assert.equal((await request('hdnd/items/'+rowIds[0])).revision,1);
  await select(receiver,'NQ01','Hoàn thành');
  await until(async()=>((await request('hdnd/items/'+rowIds[0])).revision===2),
    'peer CAS commits first');
  releaseHeldWrite();releaseHeldWrite=null;
  await writer.locator('.list-save-errors').waitFor();
  const conflict=await request('hdnd/items/'+rowIds[0]);
  assert.equal(conflict.revision,2);
  assert.equal(conflict.progressCouncil,'Hoàn thành');
  assert.equal(Object.keys(conflict.history).length,1);
  assert.equal(await request('hdnd/editLocks/'+rowIds[0]+'/progressCouncil'),null);
  assert.equal(blocked.length,0,'External request attempted');
  assert.deepEqual(logs,[],'Browser runtime error');
  await writer.screenshot({path:output+'/writer-conflict-draft.png',fullPage:false});
  await receiver.screenshot({path:output+'/receiver-confirmed-status.png',fullPage:false});
  const summarize=key=>{
    const values=samples.map(row=>row[key]).sort((a,b)=>a-b);
    return {n:values.length,p50Ms:values[Math.ceil(values.length*.5)-1],
      p95Ms:values[Math.ceil(values.length*.95)-1]};
  };
  const report={result:'PASS',syntheticOnly:true,productionWrites:0,browserProcesses:2,
    distinctAnonymousPrincipals:true,externalRequests:blocked.length,
    firstOpenMs:Math.round(firstOpen),popup:summarize('openMs'),
    clickToWriterAck:summarize('ackMs'),clickToPeerRendered:summarize('peerMs'),
    samples,checks:['no preselection lease and immediately enabled options',
      '24 single row CAS with peer rendering','no routine save indicators',
      'lost caller ACK retains draft, no replay',
      'two-browser same-field conflict first-CAS-wins',
      'revision/history truthful','no production writes']};
  writeFileSync(output+'/report.json',JSON.stringify(report,null,2)+'\n');
  console.log('PR190_SINGLE_CAS_TWO_BROWSER_PASS',JSON.stringify({...report,samples:undefined}));
}catch(error){
  writeFileSync(output+'/failure.json',JSON.stringify({error:String(error),blocked,logs,diagnostics,samples,
    writerText:await writer?.locator('body').innerText().catch(()=>''),
    receiverText:await receiver?.locator('body').innerText().catch(()=>'')},null,2));
  if(writer)await writer.screenshot({path:output+'/failure-writer.png'}).catch(()=>{});
  throw error;
}finally{
  releaseHeldWrite?.();
  releaseHeldLease?.();
  await Promise.all(browsers.map(browser=>browser.close()));
  await new Promise(done=>server.close(done));
}
