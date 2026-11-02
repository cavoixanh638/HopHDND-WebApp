import {it,expect} from 'vitest';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {parseBusinessExcel,inspectBusinessExcel} from '../../../src/data/business-excel';
import {audit,loadLocal,sha} from './offline-audit-core.mjs';

const spec=process.env.PR149_AUDIT_ARGS?JSON.parse(process.env.PR149_AUDIT_ARGS):null;
it.skipIf(!spec)('operator-provided A–O + complete checkpoints: fail closed, always classify before exit',()=>{
 let step='READ_SOURCE';
 let report;
 try{
  const src=readFileSync(spec['--source']);
  step='PARSE_AO';
  const inspection=inspectBusinessExcel(src);
  if(!inspection.sheetNames.includes(spec['--sheet']))throw Error('approved sheet absent');
  const parsed=parseBusinessExcel(src,spec['--sheet']);
  step='READ_SNAPSHOT';
  const input=loadLocal(spec['--snapshot'],spec['--manifest']);
  step='READ_PREVIOUS';
  const prior=spec['--previous']
    ?loadLocal(spec['--previous'],spec['--previous-manifest']):null;
  const priorAudit=prior?audit(prior):null;
  step='AUDIT';
  report=audit({...input,sourceRows:parsed.items,
    previousSnapshot:prior?.snapshot??null});
  if(priorAudit&&(priorAudit.snapshotIntegrity!=='FULL_ROOT_BACKUP_HASH_VERIFIED'||
      priorAudit.issues.length)){
    report.issues.push({code:'PREVIOUS_CHECKPOINT_NOT_VERIFIED',scope:'previous'});
    report.target=priorAudit.target==='INCONSISTENT'?'INCONSISTENT':'INCOMPLETE_SNAPSHOT';
    report.verdict='HOLD';
  }
  report.sourceWorkbookSha256=sha(src);
  report.sourceSheet=spec['--sheet'];
  report.parser='src/data/business-excel.ts::parseBusinessExcel';
  report.sourceDigestSha256=sha(parsed.items.map(x=>[
   x.recordId,x.displayCode,x.stt,x.content,x.department,x.type,x.partyLevel,
   x.progressParty,x.progressBuild,x.progressCouncil,x.specialist,x.room,
   x.vpLeader,x.ubndLeader,x.specificProgress,x.note]));
 }catch{
  const sourceInvalid=step==='PARSE_AO';
  const internalFailure=step==='AUDIT';
  report={schema:'pr149.offline-audit.v1',mode:'OFFLINE_ONLY',
   target:sourceInvalid||internalFailure?'INCONSISTENT':'UNREADABLE',
   snapshotIntegrity:'UNVERIFIED',verdict:'HOLD',
   issues:[{code:sourceInvalid?'SOURCE_AO_INVALID':
    internalFailure?'AUDITOR_INCONSISTENT':'INPUT_FILE_UNREADABLE_OR_MALFORMED',
    scope:step}]};
 }
 // Private report must exist even when input is corrupt. No raw rows or UIDs.
 const target=resolve(spec['--output']);
 mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('PR149_OFFLINE_CLASSIFICATION',JSON.stringify({
   target:report.target,integrity:report.snapshotIntegrity,verdict:report.verdict,
   issues:report.issues.map(x=>x.code),delta:report.comparison??null,
   legacyRows:report.counts?.legacy?.count??0,activeRows:report.counts?.active?.count??0,
   backupChecks:report.restoreChecks?.length??0,
   report:target,productionAccess:'NONE'}));
 expect(report.verdict.startsWith('PASS'),
   'HOLD: source/snapshot/reconciliation/empty-root requires operator action; no import').toBe(true);
});
