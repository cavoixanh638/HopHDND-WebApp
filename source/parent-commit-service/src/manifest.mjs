import {createHash} from 'node:crypto';
import {stable} from './parent-contract.mjs';

export const EDITABLE_FIELDS = Object.freeze([
  'content','department','type','partyLevel','progressParty','progressBuild',
  'progressCouncil','specialist','room','vpLeader','ubndLeader',
  'specificProgress','note','isDropped','documentKind'
]);
const unsafe = new Set(['history','editProofs','permissions','leases','operationId','updatedAt','updatedBy']);
const pattern = /^[A-Za-z0-9_-]{12,80}$/;
const check=(value,message)=>{if(!value)throw Error('PARENT_INTEGRITY_DENIED: '+message);};
export const operationValid=x=>typeof x==='string'&&pattern.test(x);
export const sha256=x=>createHash('sha256').update(x).digest('hex');
export function validateManifest(items,operationId){
  check(operationValid(operationId),'bad operationId');
  check(items&&typeof items==='object'&&!Array.isArray(items),'missing staged rows');
  const keys=Object.keys(items);
  check(keys.length>0&&keys.length<=1000,'staged row count outside limits');
  const seen=new Set();
  const canon=keys.map(key=>{
    const r=items[key];
    check(r&&typeof r==='object'&&!Array.isArray(r),'invalid row '+key);
    check(key===r.recordId&&/^[A-Za-z0-9_:-]{1,200}$/.test(key),'row ID mismatch');
    check(typeof r.displayCode==='string'&&r.displayCode.length>0&&r.displayCode.length<=100,'bad business code');
    check(!seen.has(r.displayCode),'duplicate business code');seen.add(r.displayCode);
    check(Number.isSafeInteger(r.stt)&&r.stt>=1&&r.revision===1,'invalid staged STT or revision');
    check(r.archivedAt==null&&r.isDropped===false,'archived/dropped staged row');
    check(![...unsafe].some(k=>Object.hasOwn(r,k)),'staged row contains private metadata');
    check((r.partyMeeting??'')===''&&(r.examined??'')==='','legacy P/Q in staged row');
    for(const f of EDITABLE_FIELDS){
      if(f==='isDropped')check(typeof r[f]==='boolean','invalid '+f);
      else if(f==='documentKind')check(['NQ','BC','UNCLASSIFIED'].includes(r[f]),'invalid documentKind');
      else check(typeof r[f]==='string'&&r[f].length<=20000,'invalid '+f);
    }
    check(r.content.trim().length>0,'blank staged content');
    return [r.recordId,r.displayCode,r.stt,r.revision,r.archivedAt??null,
      ...EDITABLE_FIELDS.map(f=>r[f])];
  }).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'en'));
  const digest=sha256(JSON.stringify(canon));
  return {schemaVersion:1,generationId:'gen_'+operationId,operationId,
    rowCount:keys.length,digest};
}
export function decodeCandidate(encoded,operationId){
  check(typeof encoded==='string'&&encoded.length>0&&encoded.length<=5_000_000,'missing candidate');
  const raw=JSON.parse(encoded);
  const computed=validateManifest(raw.items,operationId);
  check(stable(raw.manifest)===stable(computed),'staging SHA256/manifest mismatch');
  return {candidate:raw,manifest:computed};
}
export function verifyBackup(backupJson){
  check(typeof backupJson==='string'&&backupJson.length>0&&backupJson.length<=5_000_000,'missing backup');
  const backup=JSON.parse(backupJson);
  check(backup&&typeof backup==='object','malformed backup');
  const result={active:backup.previous,items:backup.generation?.items,
    permissions:JSON.parse(backup.permissionsJson),leases:JSON.parse(backup.leasesJson)};
  check(backup.baseline===stable(result),'backup checksum/baseline mismatch');
  return backup;
}
export function scoped(snapshot){
  const g=snapshot.active?.generationId;
  check(g&&snapshot.generations?.[g]?.items,'active generation missing');
  return {active:snapshot.active,items:snapshot.generations[g].items,
    permissions:snapshot.permissions?.[g]??null,leases:snapshot.leases?.[g]??null};
}
export function sameEpoch(a,b){return a&&b&&
  ['generationId','operationId','revision','rowCount','digest'].every(k=>a[k]===b[k]);}
export function freezeEvidence(raw){
  check(raw?.mode==='FROZEN'&&Number.isSafeInteger(raw.revision)&&raw.revision>=1&&
    Number.isSafeInteger(raw.epoch)&&raw.epoch>=1&&
    Number.isFinite(raw.closedAt)&&raw.closedAt>0,'legacy must be FROZEN');
  return {mode:'FROZEN',revision:raw.revision,epoch:raw.epoch,closedAt:raw.closedAt};
}
export function legacySnapshot(root){
  check(root?.hdnd?.items&&typeof root.hdnd.items==='object','missing legacy rows');
  const items=root.hdnd.items;
  check(Object.keys(items).length>=1&&Object.keys(items).length<=1000,'legacy row count invalid');
  for(const [id,row] of Object.entries(items))check(row?.recordId===id,'legacy ID mismatch');
  return {legacy:{items,permissions:root.hdnd.permissions??null,editLocks:root.hdnd.editLocks??null},
    freeze:freezeEvidence(root.hdnd.freezeControl)};
}