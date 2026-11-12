/** TRUSTED SERVER ONLY — deterministic authenticated HopHDND archive.
 *
 * The browser's unsigned SHA-256 envelope detects transmission corruption,
 * not authorship. A production restore service must independently READ the
 * source snapshot, verify authorization/Rules/backup provenance, then seal it
 * using a backend secret. This module NEVER reads credentials from a browser
 * request and cannot write to Firebase.
 *
 * Keys must be 32+ random bytes stored OUTSIDE repo and backed up separately.
 * Keep retired keys for historical restores. Call verify before any restore
 * staging; a MAC proves the issuer knew the key, not that current data is
 * unchanged. A subsequent Rules-scoped generation CAS is still essential.
 */
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {stable} from './parent-contract.mjs';

export const SERVER_BACKUP_PATHS=Object.freeze([
  'hdnd/items','hdnd/permissions','hdnd/profile','hdnd/control',
  'hdnd/editLocks','hdnd/freezeControl','hdnd/freezeReceipts',
  'hdnd/editors','hdnd/mirrors','hdnd/datasetV2','hdndReviews'
]);
const check=(ok,reason)=>{if(!ok)throw Error('BACKUP_ATTESTATION_DENIED: '+reason);};
const record=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const hex=/^[a-f0-9]{64}$/;
const keyIdPattern=/^[A-Za-z0-9_-]{4,40}$/;
const fixed=(a,b)=>a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
function secretBuffer(secret){
  const key=typeof secret==='string'?Buffer.from(secret,'base64'):secret;
  check(Buffer.isBuffer(key)&&key.length>=32,'key must have 32+ random bytes');
  return key;
}
function validatePayload(payload,{projectId,databaseURL}){
  check(record(payload)&&payload.format==='hophdnd-admin-archive'&&payload.schemaVersion===1,
    'unknown archive schema');
  check(payload.projectId===projectId&&payload.databaseURL===databaseURL,
    'project or database mismatch');
  check(typeof payload.createdAt==='string'&&Number.isFinite(Date.parse(payload.createdAt))&&
    Date.parse(payload.createdAt)<Date.now()+300000,'invalid/future backup date');
  check(Array.isArray(payload.paths)&&
    stable(payload.paths)===stable(SERVER_BACKUP_PATHS),
    'unapproved backup scope');
  check(record(payload.nodes)&&
    Object.keys(payload.nodes).length===SERVER_BACKUP_PATHS.length&&
    SERVER_BACKUP_PATHS.every(path=>Object.hasOwn(payload.nodes,path)),
    'missing/extra path');
  const freeze=payload.nodes['hdnd/freezeControl'];
  check(record(freeze)&&freeze.mode==='FROZEN'&&Number.isSafeInteger(freeze.revision)&&
    freeze.revision>=1,'backup was not frozen');
  const text=stable(payload);
  check(Buffer.byteLength(text,'utf8')<=30*1024*1024,'backup exceeds size limit');
  return text;
}
const mac=(body,key)=>createHmac('sha256',key).update(body).digest('hex');

/** Server must call only after independent frozen source readback and signed
 * restore-proof evidence (not provided to this helper by an untrusted client).
 */
export function sealServerBackup(payload,{keyId,secret,projectId,databaseURL}){
  check(typeof keyId==='string'&&keyIdPattern.test(keyId),'invalid signing key id');
  const key=secretBuffer(secret),source=validatePayload(payload,{projectId,databaseURL});
  const sha256=createHash('sha256').update(source).digest('hex');
  const header={format:'hophdnd-server-sealed-backup',schemaVersion:1,
    algorithm:'HMAC-SHA256',keyId,sha256,payload};
  return {...header,signature:mac(stable(header),key)};
}
/** The key ring comes from the server's protected secret store. HMAC is never
 * verified with a client-provided key or a client-provided verification result.
 */
export function verifyServerBackup(envelope,{keyRing,projectId,databaseURL}){
  check(record(envelope)&&envelope.format==='hophdnd-server-sealed-backup'&&
    envelope.schemaVersion===1&&envelope.algorithm==='HMAC-SHA256'&&
    Object.keys(envelope).length===7,'unknown signed archive format');
  check(typeof envelope.keyId==='string'&&keyIdPattern.test(envelope.keyId),
    'unrecognized key id');
  check(record(keyRing)&&Object.hasOwn(keyRing,envelope.keyId),
    'signing key is unavailable');
  check(typeof envelope.sha256==='string'&&hex.test(envelope.sha256)&&
    typeof envelope.signature==='string'&&hex.test(envelope.signature),
    'missing secure digests');
  const key=secretBuffer(keyRing[envelope.keyId]);
  const content=validatePayload(envelope.payload,{projectId,databaseURL});
  const actualHash=createHash('sha256').update(content).digest('hex');
  check(fixed(actualHash,envelope.sha256),'backup payload digest mismatch');
  const header={format:envelope.format,schemaVersion:envelope.schemaVersion,
    algorithm:envelope.algorithm,keyId:envelope.keyId,sha256:envelope.sha256,
    payload:envelope.payload};
  const expectedMac=mac(stable(header),key);
  check(fixed(expectedMac,envelope.signature),'server HMAC authentication failed');
  return {payload:envelope.payload,sha256:actualHash,keyId:envelope.keyId};
}
