/**
 * Independent evidence gate for PR142 Chat2. Reads localhost Emulator witness
 * files; no network, no Rules bypass, no mutations. Baseline bypass COMMITTED
 * is an expected reproduction, NOT a security PASS.
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const dir=resolve(process.argv[2]??'.');
const read=name=>JSON.parse(readFileSync(join(dir,name),'utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
const source='98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847';
const cases={
 baseline:{
  bootstrap:['committed',true],activation:['committed',true],
  replace:['committed',true],restore:['committed',true],
  resolve_restore:['committed-active',false],
  valid_pointer:['committed',true],unscoped_pointer_only:['committed',true],
  leaf_release_own:['committed',true],leaf_release_foreign:['rejected',false],
  leaf_release_same_uid_copied:['committed',true],
  existing_lease_expire:['committed',true],
  new_generation_tamper:['committed',true],
  trusted_preflight_rejects:['rejected-in-process-before-write',false]
 },
 trial:{
  bootstrap:['committed',true],activation:['committed',true],
  replace:['committed',true],restore:['committed',true],
  resolve_restore:['committed-active',false],
  valid_pointer:['committed',true],unscoped_pointer_only:['rejected',false],
  leaf_release_own:['committed',true],leaf_release_foreign:['rejected',false],
  leaf_release_same_uid_copied:['committed',true],
  existing_foreign_lease_expire:['rejected',false],
  existing_lease_expire:['rejected',false],
  new_generation_tamper:['rejected',false],
  trusted_preflight_rejects:['rejected-in-process-before-write',false],
  trusted_replacement_commit:['committed',true]
 }
};
const report={sourceSha:source,overall:'FAIL',baseline:null,trial:null,
  cases:[],limitations:[
   'parentCasService is a SYNTHETIC Rules Unit Testing claim, not verified backend authentication',
   'Trusted coordinator checks contract inside its transaction; Rules alone cannot SHA256 staged JSON',
   'Same-UID raw leaf lease token replay remains a separate unresolved security blocker',
   'Privileged Emulator context is used for fixture seed only, not attack requests',
   'All before/after snapshots are separate localhost owner REST GET, redacted for archived evidence'
 ]};
let failed=false;
try{
 const manifest=read('rules-manifest.json');
 if(manifest.sourceBase!==source)throw Error('Unexpected baseline SHA');
 for(const mode of ['baseline','trial']){
  const rulesHash=sha(readFileSync(join(dir,mode+'.full.rules.json')));
  if(rulesHash!==(mode==='baseline'?manifest.fullSourceSha256:manifest.trialSha256))
   throw Error(mode+' Rules SHA256 mismatch');
  const doc=read(mode+'.witness.json');
  if(doc.sourceSha!==source||doc.mode!==mode||doc.project!=='demo-pr142-parent-cas'||
     doc.rulesHash!==rulesHash)throw Error(mode+' witness provenance mismatch');
  const seen=new Set();
  for(const o of doc.observations){
   if(seen.has(o.label))throw Error('Duplicate '+mode+'/'+o.label);
   seen.add(o.label);
   const expected=cases[mode][o.label];
   const foreignObservation=mode==='baseline'&&o.label==='existing_foreign_lease_expire';
   if(!expected&&!foreignObservation)throw Error('Unexpected '+mode+'/'+o.label);
   const state=o.result?.status;
   const changed=o.serverChanged===true;
   const hashCoherent=(o.serverBefore!==o.serverAfter)===changed;
   const hashesValid=typeof o.serverBefore==='string'&&o.serverBefore.length===64&&
     typeof o.serverAfter==='string'&&o.serverAfter.length===64;
   const snapshotsValid=o.before!==undefined&&o.after!==undefined;
   const statusOk=foreignObservation?['committed','rejected'].includes(state):state===expected[0];
   const changedOk=foreignObservation?
     (state==='committed'?changed&&o.existingLeaseChanged===true:!changed):
     changed===expected[1];
   const pass=hashCoherent&&hashesValid&&snapshotsValid&&statusOk&&changedOk;
   if(!pass)failed=true;
   report.cases.push({mode,label:o.label,requestResult:state,
     serverBefore:o.serverBefore,serverAfter:o.serverAfter,serverChanged:changed,
     existingRowChanged:o.existingRowChanged,existingLeaseChanged:o.existingLeaseChanged,
     transport:o.transport,pass});
  }
  const missing=Object.keys(cases[mode]).filter(label=>!seen.has(label));
  if(!seen.has('existing_foreign_lease_expire'))missing.push('existing_foreign_lease_expire');
  if(missing.length)throw Error('Missing '+mode+' observations: '+missing.join(','));
  report[mode]={observed:seen.size,
   pass:report.cases.filter(x=>x.mode===mode&&x.pass).length,
   fail:report.cases.filter(x=>x.mode===mode&&!x.pass).length};
 }
}catch(error){failed=true;report.error=String(error?.stack??error);}
report.overall=failed?'FAIL':'PASS';
writeFileSync(join(dir,'summary.json'),JSON.stringify(report,null,2)+'\n');
const lines=[
 '# PR142 parent-CAS Emulator — '+report.overall,'',
 'Baseline: '+JSON.stringify(report.baseline)+'; Trial: '+JSON.stringify(report.trial)+'.','',
 'Source SHA: '+source,
 'Two separate Auth+RTDB Emulator runs; complete redacted snapshots are in baseline.witness.json and trial.witness.json.','',
 '| Mode | Case | Request | Server changed | Existing row | Existing lease | Gate |',
 '|---|---|---|---|---|---|---|',
 ...report.cases.map(c=>'| '+c.mode+' | '+c.label+' | '+c.requestResult+
    ' | '+c.serverChanged+' | '+c.existingRowChanged+' | '+c.existingLeaseChanged+
    ' | '+(c.pass?'PASS':'FAIL')+' |'),
 '',
 'IMPORTANT: baseline replay COMMITTED = reproduced SECURITY FAILURE; not a security PASS.',
 'A trial synthetic service claim is not proof that any live service can authenticate or mint claims safely.','',
 ...report.limitations.map(s=>'- '+s),
 ...(report.error?['','ERROR: '+report.error]:[])
];
writeFileSync(join(dir,'summary.md'),lines.join('\n')+'\n');
console.log(JSON.stringify({overall:report.overall,baseline:report.baseline,
 trial:report.trial,error:report.error??null}));
if(failed)process.exitCode=1;
