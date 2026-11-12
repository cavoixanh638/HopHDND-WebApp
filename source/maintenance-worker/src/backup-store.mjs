/** Independent archive store: Cloudflare R2 binding, never public or in the SPA.
 * Every mutation must persist and read back a server-signed snapshot outside RTDB.
 * Bucket retention / versioning and an independent restore drill remain release gates.
 */
import {assertOperationId,object,requireCondition,sha256,stableJson} from './domain.mjs';

const PREFIX='maintenance-archives/v1/';
const MAX_ARCHIVE_BYTES=3*1024*1024;
function assertStore(bucket){
  requireCondition(!!bucket&&typeof bucket.put==='function'&&typeof bucket.get==='function',
    'OFFSITE_BACKUP_STORE_NOT_CONFIGURED');
}
function archiveRef(operationId,digest){
  assertOperationId(operationId);
  requireCondition(typeof digest==='string'&&/^[a-f0-9]{64}$/.test(digest),
    'INVALID_OFFSITE_BACKUP_DIGEST');
  return PREFIX+operationId+'/'+digest+'.json';
}
export async function persistVerifiedArchive(bucket,operationId,archive){
  assertStore(bucket);
  requireCondition(object(archive)&&object(archive.payload)&&object(archive.serverSeal),
    'INVALID_OFFSITE_ARCHIVE');
  const body=stableJson(archive);
  requireCondition(new TextEncoder().encode(body).length<=MAX_ARCHIVE_BYTES,
    'OFFSITE_BACKUP_TOO_LARGE');
  const digest=await sha256(body);
  const key=archiveRef(operationId,digest);
  // Prevent accidental overwrite on this key; true immutability/retention must
  // additionally be configured on the private bucket outside this code.
  requireCondition(!(await bucket.get(key)),'OFFSITE_BACKUP_KEY_ALREADY_EXISTS');
  await bucket.put(key,body,{httpMetadata:{contentType:'application/json'}});
  const stored=await bucket.get(key);
  requireCondition(stored&&typeof stored.text==='function','OFFSITE_BACKUP_READBACK_FAILED');
  const observed=await stored.text();
  requireCondition(observed===body&&await sha256(observed)===digest,
    'OFFSITE_BACKUP_READBACK_MISMATCH');
  return {key,digest};
}
export async function readVerifiedArchive(bucket,reference){
  assertStore(bucket);
  requireCondition(object(reference)&&typeof reference.key==='string'&&
    reference.key===archiveRef(reference.operationId,reference.digest),
    'INVALID_OFFSITE_BACKUP_REFERENCE');
  const stored=await bucket.get(reference.key);
  requireCondition(stored&&typeof stored.text==='function','OFFSITE_BACKUP_MISSING');
  const raw=await stored.text();
  requireCondition(new TextEncoder().encode(raw).length<=MAX_ARCHIVE_BYTES,
    'OFFSITE_BACKUP_TOO_LARGE');
  requireCondition(await sha256(raw)===reference.digest,'OFFSITE_BACKUP_CORRUPTED');
  let archive;try{archive=JSON.parse(raw)}catch{throw Error('OFFSITE_BACKUP_CORRUPTED')}
  requireCondition(object(archive)&&object(archive.payload)&&object(archive.serverSeal),
    'OFFSITE_BACKUP_CORRUPTED');
  return archive;
}
