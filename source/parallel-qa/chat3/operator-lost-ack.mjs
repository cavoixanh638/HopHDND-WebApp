/**
 * Operator real CLI: fail the RTDB WebSocket ACK after forwarding a genuine
 * hdnd/items CAS to the FULL Rules emulator. No mock CAS, no alternative writer,
 * and no monkey-patching the CLI. This file is demo-only and runs in CI.
 */
import {strict as assert} from 'node:assert';
import {createServer,connect} from 'node:net';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,parseBusinessExcel} from '../../src/data/business-excel.ts';

const sha=x=>createHash('sha256').update(x).digest('hex');
const project='demo-hdnd';
const dbHost='127.0.0.1', dbPort=9000, proxyPort=19003;
const endpoint='http://127.0.0.1:9000/hdnd.json?ns='+project;
const token=JSON.stringify({sub:'chat3-lost-ack-google-admin',
 email:'cavoixanh638@gmail.com',email_verified:true,name:'CHAT3_PRIVATE_TOKEN_NEVER_LOG'});
const folder=mkdtempSync(join(tmpdir(),'chat3-lost-ack-'));
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const env={...process.env,GCLOUD_PROJECT:project,FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',
 FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:'+proxyPort,FIREBASE_EMULATOR_HUB:'127.0.0.1:4400'};
const readOnly=async()=>{
 const res=await fetch(endpoint,{headers:{Authorization:'Bearer owner'}});
 assert.equal(res.status,200,'demo owner read-only witness HTTP status');
 return res.json();
};

/** Observe masked WebSocket frames WITHOUT logging or persisting payloads. */
function parseClientFrames(state,bytes,onWrite){
 state.pending=Buffer.concat([state.pending,bytes]);
 while(state.pending.length>=2){
  const b=state.pending;
  let length=b[1]&127,pos=2;
  if(length===126){
   if(b.length<4)return;
   length=b.readUInt16BE(2);pos=4;
  }else if(length===127){
   if(b.length<10)return;
   const wide=b.readBigUInt64BE(2);
   assert(wide<=BigInt(4*1024*1024),'unexpected giant WebSocket payload');
   length=Number(wide);pos=10;
  }
  const masked=!!(b[1]&128);
  if(b.length<pos+(masked?4:0)+length)return;
  const payload=Buffer.alloc(length);
  if(masked){
   const mask=b.subarray(pos,pos+4);pos+=4;
   for(let i=0;i<length;i++)payload[i]=b[pos+i]^mask[i%4];
  }else b.copy(payload,0,pos,pos+length);
  state.pending=b.subarray(pos+length);
  // The Firebase RTDB protocol uses put (a:p) with a data hash for CAS.
  // Regex only inspects wire text in memory and NEVER emits its contents.
  const frameText=payload.toString('utf8');
  if(frameText.includes('"a":"p"')&&frameText.includes('/hdnd/items'))
   onWrite();
 }
}

async function startLossyProxy(){
 let dropAcks=false,writeFrames=0,wsConnections=0,connected=0;
 const sockets=new Set();
 const server=createServer(client=>{
  const upstream=connect({host:dbHost,port:dbPort});
  connected++;sockets.add(client);sockets.add(upstream);
  const state={headers:Buffer.alloc(0),isWebsocket:false,pending:Buffer.alloc(0)};
  client.on('data',chunk=>{
   if(!state.isWebsocket){
    state.headers=Buffer.concat([state.headers,chunk]);
    const end=state.headers.indexOf('\r\n\r\n');
    if(end>=0){
     const intro=state.headers.subarray(0,end).toString('latin1').toLowerCase();
     state.isWebsocket=intro.includes('upgrade: websocket');
     if(state.isWebsocket){
      wsConnections++;
      const extra=state.headers.subarray(end+4);
      if(extra.length)parseClientFrames(state,extra,()=>{
       writeFrames++;dropAcks=true;
      });
     }
     state.headers=Buffer.alloc(0);
    }
   }else parseClientFrames(state,chunk,()=>{writeFrames++;dropAcks=true;});
   if(!upstream.destroyed)upstream.write(chunk);
  });
  upstream.on('data',chunk=>{
   // The *real* server receives and applies the CAS. Only the response
   // (ACK/readback) is blackholed; no manual database write is performed here.
   if(!dropAcks&&!client.destroyed)client.write(chunk);
  });
  client.on('error',()=>{});upstream.on('error',()=>{});
  client.on('close',()=>{sockets.delete(client);upstream.destroy();});
  upstream.on('close',()=>{sockets.delete(upstream);client.destroy();});
 });
 await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(proxyPort,'127.0.0.1',resolve);
 });
 return {
  summary:()=>({ackSuppressed:dropAcks,writeFrames,wsConnections,connected}),
  close:async()=>{
   for(const socket of sockets)socket.destroy();
   await new Promise(resolve=>server.close(resolve));
  }
 };
}

function launch(args,override={}){
 return spawn(process.execPath,['scripts/operator-first-import.mjs',...args],{
  cwd:process.cwd(),env:{...env,...override},stdio:['pipe','pipe','pipe']});
}
async function waitForExit(child,timeoutMs){
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{
   child.kill('SIGKILL');
   reject(Error('real CLI did not terminate in '+timeoutMs+'ms'));
  },timeoutMs);
  child.once('error',error=>{clearTimeout(timer);reject(error);});
  child.once('exit',code=>{clearTimeout(timer);resolve(code);});
 });
}
let proxy;
try{
 const before=await readOnly();
 assert.equal(before,null,'loss test requires a new disposable EMPTY hdnd root');
 const wb=XLSX.utils.book_new();
 const data=['NQ-CHAT3-ACK-01',1,'Hồ sơ MẪU ACK','Sở MẪU','QPPL','BCH',
  'Sở chưa trình','Sở chưa trình','Sở chưa trình','Chuyên viên MẪU','Phòng MẪU',
  'Lãnh đạo VP MẪU','Lãnh đạo UBND MẪU','MẪU đang xử lý','Ghi chú MẪU'];
 XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([[...BUSINESS_HEADERS],data]),'Approved');
 const bytes=Buffer.from(XLSX.write(wb,{bookType:'xlsx',type:'buffer'}));
 const parsed=parseBusinessExcel(bytes,'Approved');
 assert.equal(parsed.count,1);
 const workbook=join(folder,'synthetic.xlsx'),approvalFile=join(folder,'approval.json');
 const output=join(folder,'attempt-result.json'),replay=join(folder,'replay-result.json');
 writeFileSync(workbook,bytes);
 const workbookSha256=sha(bytes);
 const approval={schema:'PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1',
  project,databaseURL:'https://demo-hdnd.firebaseio.com/',sourceSha,
  workbookSha256,sheet:'Approved',expectedRows:1,
  expectedState:'EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT',
  fullRootSnapshotSha256:sha('null'),operatorEmail:'cavoixanh638@gmail.com',
  approved:true};
 writeFileSync(approvalFile,JSON.stringify(approval));
 const args=['--mode','emulator','--project',project,'--database-url',
  'https://demo-hdnd.firebaseio.com','--api-key','demo-key','--auth-domain',
  'demo-hdnd.firebaseapp.com','--app-id','demo-operator','--xlsx',workbook,
  '--sheet','Approved','--approval-file',approvalFile,'--source-sha',sourceSha,
  '--confirm','IMPORT_ONCE_'+project+'_'+workbookSha256.slice(0,12),
  '--output',output];
 proxy=await startLossyProxy();
 const child=launch(args);
 let stderr='',stdout='';
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',part=>{stdout+=part;});
 child.stderr.on('data',part=>{stderr+=part;});
 child.stdin.end(token);
 const code=await waitForExit(child,65000);
 const wire=proxy.summary();
 // Show only sanitized counts and status; NEVER raw Firebase/Google payload.
 assert.equal(wire.ackSuppressed,true,'CAS frame was not detected by proxy: '+JSON.stringify(wire));
 assert(wire.writeFrames>=1,'a real transaction request must have crossed the proxy');
 assert.equal(code,3,'lost-ACK must be UNKNOWN, not success or prewrite HOLD: '+stderr);
 assert.match(stderr,/PR147_BOOTSTRAP_UNKNOWN_AFTER_CAS_ATTEMPT_DO_NOT_RETRY_READ_SERVER/);
 assert.doesNotMatch(stdout,/PR147_OPERATOR_FIRST_IMPORT_CAS_READBACK_PASS/);
 assert.doesNotMatch(stderr+stdout,/CHAT3_PRIVATE_TOKEN_NEVER_LOG/);
 const marker=JSON.parse(readFileSync(output,'utf8'));
 assert.equal(statSync(output).mode&0o777,0o600,'private attempt receipt permissions');
 assert.equal(marker.schema,'PR147_OPERATOR_FIRST_IMPORT_ATTEMPT_V1');
 assert.equal(marker.status,'UNKNOWN_AFTER_CAS_ATTEMPT_DO_NOT_RETRY');
 assert.equal(marker.readbackVerified,false);
 assert.equal(marker.workbookSha256,workbookSha256);
 assert(!JSON.stringify(marker).includes('CHAT3_PRIVATE_TOKEN_NEVER_LOG'));
 assert(!JSON.stringify(marker).includes('Hồ sơ MẪU ACK'));
 await proxy.close();proxy=null;
 const after=await readOnly();
 assert(after?.items&&Object.keys(after.items).length===1,
  'the real emulator must have committed the write despite the missing ACK');
 const original=parsed.items[0],stored=after.items[original.recordId];
 assert(stored,'stable recordId must exist on server');
 for(const field of ['recordId','displayCode','stt','revision','content','department',
  'type','partyLevel','progressParty','progressBuild','progressCouncil','specialist',
  'room','vpLeader','ubndLeader','specificProgress','note'])
  assert.equal(stored[field],original[field],'server retained approved A–O '+field);
 assert.equal(typeof stored.updatedAt,'number');
 assert.equal(stored.updatedBy,marker.uid);
 const afterDigest=sha(JSON.stringify(after));
 // This is only a negative repeat test; neither the CLI nor QA retries CAS.
 const duplicate=spawnSync(process.execPath,
  ['scripts/operator-first-import.mjs',...args.slice(0,-2),'--output',replay],
  {cwd:process.cwd(),env:{...env,FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000'},
   encoding:'utf8',input:token,timeout:60000});
 assert.equal(duplicate.status,2,'nonempty root must block replay: '+duplicate.stderr);
 assert.match(duplicate.stderr,/LIVE_TARGET_NOT_TRULY_EMPTY/);
 assert.equal(sha(JSON.stringify(await readOnly())),afterDigest,
  'unknown replay must never overwrite the committed server state');
 assert(!String(duplicate.stderr+duplicate.stdout).includes('CHAT3_PRIVATE_TOKEN_NEVER_LOG'));
 console.log('CHAT3_REAL_CAS_LOST_ACK_UNKNOWN_PASS',JSON.stringify({
  realClient:true,authAndFullRulesEmulator:true,writeFrames:wire.writeFrames,
  responseSuppressed:true,exitCode:code,receiptStatus:marker.status,
  committedServerRowCount:1,serverUnchangedOnReplay:true,
  workbookSha256,serverSnapshotSha256:afterDigest,production:false
 }));
}finally{
 if(proxy)await proxy.close().catch(()=>{});
 rmSync(folder,{recursive:true,force:true});
}
