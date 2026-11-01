import {it,expect} from 'vitest';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {parseBusinessExcel,inspectBusinessExcel} from '../../../src/data/business-excel';
import {audit,loadLocal,sha} from './offline-audit-core.mjs';

const spec=process.env.PR149_AUDIT_ARGS?JSON.parse(process.env.PR149_AUDIT_ARGS):null;
it.skipIf(!spec)('operator-provided source+full snapshot are checked offline using production A–O parser',()=>{
 const src=readFileSync(spec['--source']);
 const inspection=inspectBusinessExcel(src);
 expect(inspection.sheetNames).toContain(spec['--sheet']);
 const parsed=parseBusinessExcel(src,spec['--sheet']);
 const input=loadLocal(spec['--snapshot'],spec['--manifest']);
 const previous=spec['--previous']?JSON.parse(readFileSync(spec['--previous'],'utf8')):null;
 const report=audit({...input,sourceRows:parsed.items,previousSnapshot:previous});
 report.sourceWorkbookSha256=sha(src);
 report.sourceSheet=spec['--sheet'];
 report.parser='src/data/business-excel.ts::parseBusinessExcel';
 report.sourceDigestSha256=sha(parsed.items.map(x=>[
  x.recordId,x.displayCode,x.stt,x.content,x.department,x.type,x.partyLevel,
  x.progressParty,x.progressBuild,x.progressCouncil,x.specialist,x.room,
  x.vpLeader,x.ubndLeader,x.specificProgress,x.note]));
 const target=resolve(spec['--output']);mkdirSync(dirname(target),{recursive:true});
 writeFileSync(target,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('PR149_OFFLINE_CLASSIFICATION',JSON.stringify({
   target:report.target,integrity:report.snapshotIntegrity,verdict:report.verdict,
   issues:report.issues.map(x=>x.code),delta:report.comparison??null,
   legacyRows:report.counts.legacy?.count??0,activeRows:report.counts.active?.count??0,
   backupChecks:report.restoreChecks?.length??0,
   report:target,productionAccess:'NONE'}));
 expect(report.verdict.startsWith('PASS')||report.verdict==='HOLD_EMPTY_BOOTSTRAP_REQUIRED',
   'HOLD: inspect private report and obtain reconciliation; no import').toBe(true);
});
