#!/usr/bin/env node
/**
 * Restore drill from an operator-private JSON snapshot to a LOCAL DEMO emulator.
 * No cloud Firebase project is contacted and nothing is written to GitHub.
 * Execute only under:
 * firebase emulators:exec --project demo-hdnd-restore \
 *  --config scripts/restore-emulator/firebase.json --only database \
 *  "node scripts/firebase-backup-emulator-restore.mjs"
 *
 * PowerShell: $env:HDND_PRIVATE_BACKUP="D:\...\database-1.json"
 */
import {readFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {isAbsolute,resolve,basename} from 'node:path';
import {audit} from '../docs/operations/pr149/offline-audit-core.mjs';
const EMULATOR='127.0.0.1:9198',PROJECT='demo-hdnd-restore';
const stop=msg=>{throw new Error('RESTORE_DRILL_HOLD: '+msg);};
function canonical(data){
  if(Array.isArray(data))return '['+data.map(canonical).join(',')+']';
  if(data!==null&&typeof data==='object')
    return '{'+Object.keys(data).sort().map(k=>JSON.stringify(k)+':'+canonical(data[k])).join(',')+'}';
  return JSON.stringify(data);
}
const sha=x=>createHash('sha256').update(x).digest('hex');
async function main(){
  if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!==EMULATOR)
    stop('Chưa thấy emulator local 127.0.0.1:9198. Không kết nối Database thật.');
  if(process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!==PROJECT)
    stop('Project phải là demo-hdnd-restore, tuyệt đối không dùng production.');
  const source=process.env.HDND_PRIVATE_BACKUP;
  if(!source||!isAbsolute(source))stop('Thiếu đường dẫn tuyệt đối HDND_PRIVATE_BACKUP.');
  const file=resolve(source),size=(await stat(file)).size;
  if(size<=2||size>100*1024*1024)stop('Bản sao lưu không có kích thước JSON phù hợp.');
  const bytes=await readFile(file);
  let data;
  try{data=JSON.parse(bytes.toString('utf8'));}catch{stop('Bản sao lưu không phải JSON hợp lệ.');}
  if(data===null||typeof data!=='object'||Array.isArray(data)||!data.hdnd)
    stop('Không tìm thấy nhánh nghiệp vụ hdnd trong bản sao lưu.');
  // No full-root write before a manifest that matches the actual input bytes.
  const manifestPath=process.env.HDND_PRIVATE_MANIFEST;
  if(!manifestPath||!isAbsolute(manifestPath))
    stop('Thiếu HDND_PRIVATE_MANIFEST tuyệt đối; không tin một JSON đơn lẻ.');
  let manifest;
  try{manifest=JSON.parse(await readFile(resolve(manifestPath),'utf8'));}
  catch{stop('Manifest không thể đọc hoặc không phải JSON.');}
  if(manifest.rtdbFile!==basename(file)||
     manifest.rtdbBytes!==bytes.length||manifest.rtdbSha256!==sha(bytes)||
     !['hophdnd-8b7b2','demo-hdnd'].includes(manifest.projectId))
    stop('Manifest file/hash/bytes/project không khớp nguồn; KHÔNG khôi phục.');
  const classification=audit({snapshot:data,rawBytes:bytes,manifest});
  if(!classification.verdict.startsWith('PASS'))
    stop('Auditor HOLD '+classification.target+' '+classification.issues.map(x=>x.code).join(','));
  const freshPath=process.env.HDND_CURRENT_BACKUP;
  const freshManifestPath=process.env.HDND_CURRENT_MANIFEST;
  if(Boolean(freshPath)!==Boolean(freshManifestPath))
    stop('Checkpoint mới phải có cả HDND_CURRENT_BACKUP và HDND_CURRENT_MANIFEST.');
  if(freshPath){
    if(!isAbsolute(freshPath)||!isAbsolute(freshManifestPath))
      stop('Checkpoint mới chỉ nhận đường dẫn tuyệt đối.');
    let freshBytes,fresh,freshManifest;
    try{
      freshBytes=await readFile(resolve(freshPath));
      fresh=JSON.parse(freshBytes.toString('utf8'));
      freshManifest=JSON.parse(await readFile(resolve(freshManifestPath),'utf8'));
    }catch{stop('Checkpoint mới không đọc được; KHÔNG khôi phục.');}
    if(freshManifest.rtdbFile!==basename(resolve(freshPath))||
       freshManifest.rtdbBytes!==freshBytes.length||
       freshManifest.rtdbSha256!==sha(freshBytes))
      stop('Checksum checkpoint mới không hợp lệ.');
    const freshCheck=audit({snapshot:fresh,rawBytes:freshBytes,manifest:freshManifest});
    if(!freshCheck.verdict.startsWith('PASS'))
      stop('Checkpoint mới chưa qua kiểm chứng: '+freshCheck.target);
    if(canonical(fresh)!==canonical(data))
      stop('STALE_SNAPSHOT_NEWER_ACK_OR_METADATA: snapshot mới khác; phải lấy backup mới và đối soát, không khôi phục snapshot cũ.');
  }
  const url='http://127.0.0.1:9198/.json?ns='+PROJECT;
  const reply=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:bytes});
  if(!reply.ok)stop('Emulator từ chối nhập bản sao, HTTP '+reply.status);
  await reply.arrayBuffer();
  const check=await fetch(url,{method:'GET'});
  if(!check.ok)stop('Không đọc lại được dữ liệu emulator, HTTP '+check.status);
  const restored=await check.json();
  const originalHash=sha(canonical(data)),restoredHash=sha(canonical(restored));
  if(originalHash!==restoredHash)stop('Dữ liệu đọc lại từ Emulator KHÔNG trùng nguồn theo JSON chuẩn hóa.');
  const count=x=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).length:0;
  const h=data.hdnd??{},rh=restored.hdnd??{};
  if(count(h.items)!==count(rh.items)||count(h.mirrors)!==count(rh.mirrors)||
      Boolean(h.profile)!==Boolean(rh.profile)||
      Boolean(h.permissions)!==Boolean(rh.permissions))
    stop('Sai cấu trúc nhánh nghiệp vụ sau khi thử khôi phục.');
  process.stdout.write(
    'LOCAL_EMULATOR_RESTORE_DRILL_PASS (NO production writes)\n'+
    'Parsed backup bytes: '+bytes.byteLength+'\n'+
    'Canonical JSON SHA256: '+originalHash+'\n'+
    'Primary item count: '+count(rh.items)+'\n'+
    'Mirror top-level sources: '+count(rh.mirrors)+'\n'+
    'Profile present: '+Boolean(rh.profile)+'\n'+
    'Permissions present: '+Boolean(rh.permissions)+'\n'+
    'Bản thử khôi phục chỉ tồn tại ở demo emulator local. Chưa đủ điều kiện GO production.\n'
  );
}
try{await main();}catch(error){console.error(error instanceof Error?error.message:'RESTORE_DRILL_HOLD');process.exitCode=1;}
