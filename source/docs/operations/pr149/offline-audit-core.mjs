#!/usr/bin/env node
/**
 * PR149 read-only snapshot inspector. Zero Firebase imports, network or writes
 * to any input; pure analysis of operator-provided files. Does NOT assert live.
 * A missing trusted full-root manifest is INCOMPLETE_SNAPSHOT, never "empty".
 */
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
export const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:stable(x)).digest('hex');
export const sort=x=>Array.isArray(x)?x.map(sort):x&&typeof x==='object'
  ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sort(x[k])])):x;
export const stable=x=>JSON.stringify(sort(x));
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const keys=x=>object(x)?Object.keys(x):[];
const fields=['content','department','type','partyLevel','progressParty','progressBuild','progressCouncil',
 'specialist','room','vpLeader','ubndLeader','specificProgress','note'];
const core=['recordId','displayCode','stt',...fields];
const masked=x=>sha(String(x)).slice(0,14);
const issue=(out,code,scope)=>out.issues.push({code,scope});
const summaryRows=(rows,out,scope)=>{
 if(rows==null)return{count:0,idsHash:sha([]),contentHash:sha([]),historyCount:0};
 if(!object(rows)){issue(out,'ROW_MAP_NOT_OBJECT',scope);return{count:0};}
 const values=[];const ids=keys(rows);const codes=new Set();let historyCount=0;
 for(const id of ids){
  const r=rows[id],key=scope+'/'+masked(id);
  if(!object(r)){issue(out,'ROW_INVALID',key);continue;}
  if(id!==r.recordId)issue(out,'RECORD_ID_KEY_MISMATCH',key);
  if(typeof r.displayCode!=='string'||!r.displayCode.trim())issue(out,'MISSING_DISPLAY_CODE',key);
  else if(codes.has(r.displayCode.normalize('NFC')))issue(out,'DUPLICATE_DISPLAY_CODE',key);
  codes.add(String(r.displayCode??'').normalize('NFC'));
  if(!Number.isSafeInteger(r.revision)||r.revision<1)issue(out,'BAD_REVISION',key);
  for(const f of core)if(r[f]===undefined)issue(out,'MISSING_FIELD_'+f,key);
  if(r.history!==undefined&&!object(r.history)&&!Array.isArray(r.history))issue(out,'INVALID_HISTORY',key);
  if(r.editProofs!==undefined&&!object(r.editProofs))issue(out,'INVALID_EDIT_PROOFS',key);
  historyCount+=Array.isArray(r.history)?r.history.length:keys(r.history).length;
  values.push([id,...core.map(f=>r[f]??null),r.revision??null,r.operationId??null,
    r.history??null,r.editProofs??null]);
 }
 values.sort((a,b)=>a[0].localeCompare(b[0],'en'));
 return{count:ids.length,idsHash:sha(ids.sort()),contentHash:sha(values),historyCount};
};
const equal=(a,b)=>stable(a??null)===stable(b??null);
export function audit({snapshot,manifest,rawBytes,sourceRows,previousSnapshot=null,expectedRawSha=null}){
 const report={schema:'pr149.offline-audit.v1',sourceSha:'02964722ae405a7ccf70f2b88bfe21cb7d0bcca7',
  verifiedCandidateSha:process.env.PR149_SOURCE_SHA??null,mode:'OFFLINE_ONLY',
  target:'UNREADABLE',snapshotIntegrity:'UNVERIFIED',verdict:'HOLD',issues:[],differences:[],
  counts:{},rights:{},journals:{},operations:{},restoreChecks:[]};
 if(!object(snapshot)&&snapshot!==null){issue(report,'ROOT_NOT_OBJECT','/');return report;}
 const rawHash=rawBytes?sha(rawBytes):null;
 if(expectedRawSha&&rawHash!==expectedRawSha)issue(report,'INPUT_HASH_MISMATCH','/');
 const complete=object(manifest)&&manifest.stability==='Two successive exports matched byte-for-byte'
  &&manifest.rtdbSha256===rawHash&&manifest.rtdbBytes===rawBytes?.byteLength
  &&manifest.rtdbFile&&Number.isInteger(manifest.hdndItemsCount);
 if(!complete){
  report.target='INCOMPLETE_SNAPSHOT';
  issue(report,'FULL_ROOT_PROVENANCE_MISSING_OR_MISMATCH','/');
  return report;
 }
 report.snapshotIntegrity='FULL_ROOT_BACKUP_HASH_VERIFIED';
 report.snapshotSha256=rawHash;
 if(keys(snapshot?.hdnd?.items).length!==manifest.hdndItemsCount||
   (Number.isInteger(manifest.hdndMirrorsCount)&&
    keys(snapshot?.hdnd?.mirrors).length!==manifest.hdndMirrorsCount)){
  report.target='INCONSISTENT';
  issue(report,'SNAPSHOT_COUNT_MISMATCH_OR_MISSING_ITEMS','/hdnd');
  return report;
 }
 const root=snapshot??{};
 if(!object(root)){issue(report,'ROOT_NOT_OBJECT','/');report.target='INCONSISTENT';return report;}
 if(keys(root).length===0){
  report.target='EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT';
  report.counts={legacy:0,active:0,source:sourceRows?.length??null};
  report.verdict=sourceRows?.length?'HOLD_EMPTY_BOOTSTRAP_REQUIRED':'PASS_EMPTY_STATE_ONLY';
  return report;
 }
 if(root.hdnd===undefined){
  report.target='EMPTY_HDND_CONFIRMED_IN_FULL_SNAPSHOT';
  report.counts={legacy:0,active:0,source:sourceRows?.length??null};
  report.verdict='HOLD_EMPTY_BOOTSTRAP_REQUIRED';return report;
 }
 if(!object(root.hdnd)){
  report.target='INCONSISTENT';issue(report,'HDND_NOT_OBJECT','/hdnd');return report;
 }
 const h=root.hdnd,v2=h.datasetV2;
 if(v2!==undefined&&!object(v2))issue(report,'V2_ROOT_MALFORMED','datasetV2');
 const legacy=summaryRows(h.items,report,'legacy');
 report.counts.legacy=legacy;report.rights.legacy={hash:sha(h.permissions??null),summary:keys(h.permissions)};
 if(v2?.active){
  const p=v2.active;report.target='V2_ACTIVE';
  const gen=p.generationId,op=p.operationId,active=v2.generations?.[gen]?.items;
  if(!/^gen_[A-Za-z0-9_-]{12,80}$/.test(gen??'')||gen!=='gen_'+op||
     !Number.isSafeInteger(p.revision)||p.revision<1||!/^[a-f0-9]{64}$/.test(p.digest??''))
    issue(report,'ACTIVE_POINTER_MALFORMED','datasetV2/active');
  const candidateJson=v2.candidates?.[op];
  if(candidateJson!==undefined){
   try{
    const c=JSON.parse(candidateJson);
    if(c.manifest?.generationId!==gen||c.manifest?.operationId!==op||
       c.manifest?.digest!==p.digest||c.manifest?.rowCount!==p.rowCount)
      issue(report,'ACTIVE_CANDIDATE_MANIFEST_DIGEST_MISMATCH','datasetV2/active');
   }catch{issue(report,'ACTIVE_CANDIDATE_MANIFEST_DIGEST_MISMATCH','datasetV2/candidates');}
  }
  const activeSummary=summaryRows(active,report,'active:'+String(gen));
  report.counts.active=activeSummary;
  if(!object(active)||activeSummary.count!==p.rowCount)
    issue(report,'ACTIVE_ROWCOUNT_OR_GENERATION_MISSING','datasetV2/active');
  const opLog=v2.operations?.[op];
  if(opLog?.status!=='COMMITTED'||opLog.to!==gen||!Number.isFinite(opLog.at))
    issue(report,'ACTIVE_JOURNAL_MISSING_OR_INVALID','datasetV2/operations');
  report.journals={count:keys(v2.operations).length,sha256:sha(v2.operations??null),
    committed:keys(v2.operations).filter(k=>v2.operations[k]?.status==='COMMITTED').length};
  report.rights.active={generation:gen,hash:sha(v2.permissions?.[gen]??null),
    grantsPresent:keys(v2.permissions?.[gen]).length>0,
    leaseHash:sha(v2.leases?.[gen]??null)};
  report.counts.generations={count:keys(v2.generations).length,
    summary:keys(v2.generations).map(g=>({idHash:masked(g),
      ...summaryRows(v2.generations[g]?.items,report,'generation:'+masked(g))}))};
  for(const [opId,operation] of Object.entries(v2.operations??{})){
    if(operation?.status!=='COMMITTED'||operation.to!=='gen_'+opId||
       !object(v2.generations?.[operation.to]))
      issue(report,'INVALID_COMMITTED_JOURNAL','operations/'+masked(opId));
  }
  for(const [backupOp,encoded] of Object.entries(v2.backups??{})){
    try{
      const b=typeof encoded==='string'?JSON.parse(encoded):null;
      const prev=b?.previous;
      const corresponding=v2.operations?.[backupOp];
      if(!object(b)||!object(prev)||!object(b.generation?.items)||
         corresponding?.status!=='COMMITTED'||corresponding?.from!==prev.generationId)
        throw Error('provenance');
      const historical=v2.generations?.[prev.generationId]?.items;
      const perms=JSON.parse(b.permissionsJson),leases=JSON.parse(b.leasesJson);
      const intact=equal(historical,b.generation.items)
        &&equal(v2.permissions?.[prev.generationId]??null,perms)
        &&equal(v2.leases?.[prev.generationId]??null,leases);
      report.restoreChecks.push({backupIdHash:masked(backupOp),
        historicalEligible:intact,sourceGenerationHash:masked(prev.generationId)});
      if(!intact)issue(report,'BACKUP_HISTORICAL_SCOPE_CHANGED','backups/'+masked(backupOp));
    }catch{issue(report,'BACKUP_PROVENANCE_OR_FORMAT_INVALID','backups/'+masked(backupOp));}
  }
 }else{
  report.target=legacy.count?'LEGACY_NONEMPTY_NO_V2':'LEGACY_ITEMS_EMPTY_IN_FULL_SNAPSHOT';
  report.counts.active=0;
  if(v2&&keys(v2.operations).length&&!v2.active)issue(report,'JOURNAL_WITHOUT_ACTIVE_POINTER','datasetV2');
 }
 if(sourceRows){
  report.counts.source=sourceRows.length;
  const displayed=new Set(),ids=new Set(),matched=report.target==='V2_ACTIVE'
     ?v2.generations[v2.active.generationId].items:h.items??{};
  const currentByCode=new Map(Object.values(object(matched)?matched:{}).map(r=>[r.displayCode,r]));
  const proposed=new Set();let added=0,changed=0,unchanged=0;
  for(const r of sourceRows){
    if(ids.has(r.recordId))issue(report,'SOURCE_DUPLICATE_ID',masked(r.recordId));
    if(displayed.has(r.displayCode))issue(report,'SOURCE_DUPLICATE_DISPLAY_CODE',masked(r.displayCode));
    ids.add(r.recordId);displayed.add(r.displayCode);
    if(!r.recordId||!r.displayCode||!r.content)issue(report,'SOURCE_MISSING_REQUIRED_FIELD',masked(r.recordId));
    const current=currentByCode.get(r.displayCode);proposed.add(r.displayCode);
    if(!current){added++;continue;}
    const differences=core.filter(f=>!equal(current[f],r[f]));
    if(differences.length){
      changed++;
      report.differences.push({codeHash:masked(r.displayCode),sourceIdHash:masked(r.recordId),
        activeIdHash:masked(current.recordId),fields:differences});
    }else unchanged++;
    if(current.recordId!==r.recordId)issue(report,'ID_MAPPING_REQUIRED',masked(r.displayCode));
  }
  const removed=[...currentByCode.keys()].filter(c=>!proposed.has(c)).length;
  report.comparison={added,removed,changed,unchanged};
  if((added||removed||changed)&&report.target==='V2_ACTIVE')
    issue(report,'DATA_DELTA_REQUIRES_APPROVAL','active');
 }
 if(previousSnapshot){
  const old=previousSnapshot.hdnd??{},oldV2=old.datasetV2??{},p=oldV2.active;
  const newer=v2?.active;
  if(p&&newer&&p.generationId!==newer.generationId)
   issue(report,'POST_BACKUP_POINTER_CHANGED_REQUIRE_RECONCILIATION','active');
  if(p&&newer&&p.generationId===newer.generationId){
    const original=oldV2.generations?.[p.generationId]?.items??{};
    const latest=v2.generations?.[p.generationId]?.items??{};
    if(!equal(original,latest)||!equal(oldV2.permissions?.[p.generationId],v2.permissions?.[p.generationId]))
      issue(report,'POST_BACKUP_SERVER_CHANGES_REQUIRE_RECONCILIATION','active');
  }
  for(const id of keys(oldV2.generations)){
    if(id!==newer?.generationId&&(!equal(oldV2.generations[id],v2?.generations?.[id])||
       !equal(oldV2.permissions?.[id],v2?.permissions?.[id])))
      issue(report,'HISTORICAL_GENERATION_MUTATED','generation:'+masked(id));
  }
  report.previousSnapshotHash=sha(previousSnapshot);
 }
 if(report.issues.some(x=>/INVALID|MALFORMED|ROWCOUNT|JOURNAL|BACKUP_|HISTORICAL_GENERATION|DIGEST_MISMATCH|SNAPSHOT_COUNT_MISMATCH/.test(x.code)))
  report.target='INCONSISTENT';
 report.verdict=report.issues.length?'HOLD':report.target==='V2_ACTIVE'?'PASS_VERIFIED_SNAPSHOT_STRUCTURE'
  :report.target==='LEGACY_NONEMPTY_NO_V2'?'PASS_LEGACY_PRESENT'
  :'HOLD_EMPTY_BOOTSTRAP_REQUIRED';
 return report;
}
export function loadLocal(snapshotPath,manifestPath){
 // No network path, no protocol, and no spawning Firebase CLI.
 for(const p of [snapshotPath,manifestPath])
  if(typeof p!=='string'||/^https?:|^gs:|^firebase:|^\\\\/.test(p))
    throw Error('PR149_OFFLINE_DENY_REMOTE_INPUT');
 const raw=readFileSync(resolve(snapshotPath));
 const snapshot=JSON.parse(raw.toString('utf8'));
 const manifest=JSON.parse(readFileSync(resolve(manifestPath),'utf8'));
 return{rawBytes:raw,snapshot,manifest};
}
