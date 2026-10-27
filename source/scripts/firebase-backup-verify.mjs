#!/usr/bin/env node
/** Offline verification only: never makes network requests or changes Firebase. */
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
import {fileURLToPath} from 'node:url';

const sha256=buf=>createHash('sha256').update(buf).digest('hex');
const FIELDS={data:['rtdbFile','rtdbSha256','rtdbBytes'],rules:['rulesFile','rulesSha256','rulesBytes']};
export async function verifyReadOnlyBackup(directory){
  const root=resolve(directory);
  const manifest=JSON.parse(await readFile(resolve(root,'manifest.json'),'utf8'));
  if(manifest.projectId!=='hophdnd-8b7b2'||
    manifest.instanceId!=='hophdnd-8b7b2-default-rtdb'||
    manifest.stability!=='Two successive exports matched byte-for-byte')
    throw Error('Sai project/instance hoặc manifest chưa được xác nhận ổn định.');
  const contents={};
  for(const [kind,[fileKey,hashKey,sizeKey]] of Object.entries(FIELDS)){
    const filename=manifest[fileKey];
    if(typeof filename!=='string'||filename!==basename(filename)||filename.includes('..'))
      throw Error('Tên tệp backup không hợp lệ.');
    const binary=await readFile(resolve(root,filename));
    if(binary.byteLength!==manifest[sizeKey]||sha256(binary)!==manifest[hashKey])
      throw Error('Hash/kích thước '+kind+' không khớp manifest — bản sao có thể đã bị sửa.');
    contents[kind]=JSON.parse(binary.toString('utf8'));
  }
  if(!contents.rules?.rules||typeof contents.rules.rules!=='object')
    throw Error('Rules không có trường rules hợp lệ.');
  if(!contents.data||typeof contents.data!=='object'||Array.isArray(contents.data))
    throw Error('Backup RTDB không chứa object gốc.');
  const hdnd=contents.data.hdnd??{};
  const count=x=>x&&typeof x==='object'&&!Array.isArray(x)?Object.keys(x).length:0;
  if(count(hdnd.items)!==manifest.hdndItemsCount||
    count(hdnd.mirrors)!==manifest.hdndMirrorsCount)
    throw Error('Số dòng của backup không khớp manifest.');
  return {projectId:manifest.projectId,instanceId:manifest.instanceId,
    items:manifest.hdndItemsCount,sha256:manifest.rtdbSha256,
    rulesHash:manifest.rulesSha256,sourceRulesVerified:manifest.productionRulesIndependentlyVerified===true,
    restoreDrill:manifest.restoreDrillPerformed===true,releaseAuthorized:manifest.releaseAuthorization===true};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  if(process.argv.length!==3){
    console.error('Usage: node scripts/firebase-backup-verify.mjs ABSOLUTE_PRIVATE_BACKUP_DIRECTORY');
    process.exitCode=2;
  }else{
    try{
      const result=await verifyReadOnlyBackup(process.argv[2]);
      console.log('BACKUP_INTEGRITY_PASS (offline only, NOT production GO)');
      console.log('Project/instance:',result.projectId,result.instanceId);
      console.log('Rows:',result.items,'Data SHA-256:',result.sha256,
        'Rules SHA-256:',result.rulesHash);
      if(!result.sourceRulesVerified||!result.restoreDrill||!result.releaseAuthorized)
        console.log('NO-GO: Rules provenance, restoration drill and explicit release approval are still required.');
    }catch(e){
      console.error('BACKUP_INTEGRITY_FAIL:',e.message);process.exitCode=1;
    }
  }
}
