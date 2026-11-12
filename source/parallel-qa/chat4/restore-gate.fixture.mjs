import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const script=resolve('scripts/firebase-backup-emulator-restore.mjs');
const digest=b=>createHash('sha256').update(b).digest('hex');
const fields=['content','department','type','partyLevel','progressParty','progressBuild',
 'progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note'];
const row={recordId:'x-31',displayCode:'NQ-OPS-GUARD',stt:1,revision:1,
 ...Object.fromEntries(fields.map(f=>[f,f==='content'?'Nội dung giả':'']))};
function setup(dir,filename,data,options={}){
 const bytes=Buffer.from(JSON.stringify(data)+'\n');
 const backup=join(dir,filename);
 const manifest=join(dir,filename+'.manifest.json');
 writeFileSync(backup,bytes);
 writeFileSync(manifest,JSON.stringify({projectId:'demo-hdnd',instanceId:'demo-hdnd',
  rtdbFile:filename,rtdbSha256:digest(bytes),rtdbBytes:bytes.length,
  hdndItemsCount:Object.keys(data.hdnd?.items??{}).length,hdndMirrorsCount:0,
  stability:'Two successive exports matched byte-for-byte',...options}));
 return {backup,manifest};
}
function invoke(env){
 const r=spawnSync(process.execPath,[script],{cwd:resolve('.'),
  env:{...process.env,FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9198',
   GCLOUD_PROJECT:'demo-hdnd-restore',...env},
  encoding:'utf8',timeout:8000});
 assert.equal(r.status,1,'expected guard to refuse before any emulator PUT');
 return r.stderr+r.stdout;
}
test('restore refuses missing paired manifest before network write',()=>{
 const dir=mkdtempSync(join(tmpdir(),'chat4-missing-'));
 try{
  const a=setup(dir,'snapshot.json',{hdnd:{items:{[row.recordId]:row}}});
  assert.match(invoke({HDND_PRIVATE_BACKUP:a.backup,HDND_PRIVATE_MANIFEST:''}),
    /Thiếu HDND_PRIVATE_MANIFEST/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('restore refuses forged/mismatched checksum before network write',()=>{
 const dir=mkdtempSync(join(tmpdir(),'chat4-tamper-'));
 try{
  const a=setup(dir,'snapshot.json',{hdnd:{items:{[row.recordId]:row}}},{rtdbSha256:'0'.repeat(64)});
  assert.match(invoke({HDND_PRIVATE_BACKUP:a.backup,HDND_PRIVATE_MANIFEST:a.manifest}),
    /Manifest file\/hash\/bytes\/project/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('restore refuses newer server ACK, changed rights or journal without overwriting',()=>{
 const dir=mkdtempSync(join(tmpdir(),'chat4-stale-'));
 try{
  const before=setup(dir,'old.json',{hdnd:{items:{[row.recordId]:row},permissions:{columns:{note:true}}}});
  const latest=setup(dir,'new.json',{hdnd:{items:{
   [row.recordId]:{...row,revision:2,note:'NEW SERVER ACK',history:{a:{before:'',after:'ACK'}}}},
   permissions:{columns:{note:true}},operations:{ack:{status:'COMMITTED'}}}});
  assert.match(invoke({HDND_PRIVATE_BACKUP:before.backup,
   HDND_PRIVATE_MANIFEST:before.manifest,HDND_CURRENT_BACKUP:latest.backup,
   HDND_CURRENT_MANIFEST:latest.manifest}),/STALE_SNAPSHOT_NEWER_ACK_OR_METADATA/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('restore refuses incomplete current checkpoint pair',()=>{
 const dir=mkdtempSync(join(tmpdir(),'chat4-pair-'));
 try{
  const x=setup(dir,'old.json',{hdnd:{items:{[row.recordId]:row}}});
  assert.match(invoke({HDND_PRIVATE_BACKUP:x.backup,HDND_PRIVATE_MANIFEST:x.manifest,
   HDND_CURRENT_BACKUP:join(dir,'new.json'),HDND_CURRENT_MANIFEST:''}),
   /Checkpoint mới phải có cả/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
