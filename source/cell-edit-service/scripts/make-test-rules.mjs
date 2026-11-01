import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
// Read the FULL exact candidate as input; do not edit/replace the candidate in the repo.
// The generated, ignored file is used only by isolated Auth+RTDB+Functions Emulators.
const source=resolve(import.meta.dirname,'../../firebase/database.exclusive-candidate.rules.json');
const output=resolve(import.meta.dirname,'../generated/database.rules.json');
const original=readFileSync(source,'utf8');
const candidate=JSON.parse(original);
const root=candidate.rules.hdnd;
const entries=[
  root.items.$id,
  root.editLocks.$id.$field,
  root.datasetV2.generations.$generation.items.$id,
  root.datasetV2.leases.$generation.$id.$field
];
if(entries.some(entry=>typeof entry?.['.write']!=='string'))throw Error('FULL candidate Rules layout changed: stop');
for(const entry of entries){
  entry['.write']="auth != null && auth.token.cellService === true && ("+entry['.write']+")";
}
for(const lease of [root.editLocks.$id.$field,root.datasetV2.leases.$generation.$id.$field]){
  if(lease.$other?.['.validate']!==false)throw Error('Lease schema unexpected: stop');
  lease.proofHash={'.validate':"newData.isString() && newData.val().matches(/^[a-f0-9]{64}$/)"};
  lease.lastOperationId={'.validate':"newData.isString() && newData.val().matches(/^[0-9a-f-]{36}$/)"};
}
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(candidate,null,2)+'\n');
console.log('FULL_CANDIDATE_COPY_ONLY sha256='+createHash('sha256').update(original).digest('hex'));
console.log('ISOLATED_RULES_READY '+output);
