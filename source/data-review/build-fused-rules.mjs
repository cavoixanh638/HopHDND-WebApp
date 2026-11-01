/**
 * FINAL-DATA-REVIEW combined FULL Rules generator, TEST WORKSPACE ONLY.
 * Input: exact PR143 FULL candidate Rules. Adds only PR145 cellService
 * and PR146 parentCasService gates. No runtime merge/commit.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const [source,out]=process.argv.slice(2);
if(!source||!out)throw Error('Usage: build-fused-rules.mjs <PR143 FULL Rules> <test-only output>');
const original=readFileSync(resolve(source),'utf8');
const base=JSON.parse(original),modified=structuredClone(base);
const root=modified.rules?.hdnd;
if(!root?.datasetV2?.['.write']||!root?.freezeReceipts?.$epoch?.['.validate']?.includes('datasetV2'))
  throw Error('PR143 FULL Rules shape unexpected');
const beforeParent=root.datasetV2['.write'];
const beforeFreeze=JSON.stringify({freezeControl:root.freezeControl,freezeReceipts:root.freezeReceipts});
const cellPaths=[
  root.items?.$id,
  root.editLocks?.$id?.$field,
  root.datasetV2?.generations?.$generation?.items?.$id,
  root.datasetV2?.leases?.$generation?.$id?.$field
];
if(cellPaths.some(node=>typeof node?.['.write']!=='string'||
  node['.write'].includes('cellService')))throw Error('PR145 leaf path unexpected');
for(const node of cellPaths)node['.write']='auth != null && auth.token.cellService === true && ('+node['.write']+')';
for(const lease of [root.editLocks.$id.$field,root.datasetV2.leases.$generation.$id.$field]){
  if(lease.$other?.['.validate']!==false)throw Error('PR145 lease validator shape unexpected');
  lease.proofHash={'.validate':"newData.isString() && newData.val().matches(/^[a-f0-9]{64}$/)"};
  lease.lastOperationId={'.validate':"newData.isString() && newData.val().matches(/^[0-9a-f-]{36}$/)"};
}
root.datasetV2['.write']='(auth != null && auth.token.parentCasService === true) && ('+beforeParent+')';
if(JSON.stringify({freezeControl:root.freezeControl,freezeReceipts:root.freezeReceipts})!==beforeFreeze)
  throw Error('PR143 freeze/receipt changed while adding services');
const target=resolve(out);mkdirSync(dirname(target),{recursive:true});
writeFileSync(target,JSON.stringify(modified,null,2)+'\n');
const sha=s=>createHash('sha256').update(s).digest('hex');
const trial=readFileSync(target,'utf8');
const report={mode:'test-only ephemeral composition; NOT candidate or integrator',
  refs:{cell:'bf78bdddf336f16082ad68db1c1f39723bc95251',
    parent:'9424a52767e8acb57a1f50feba2515787fb2ad26',
    freeze:'c039405a9ad6802ae1d412465cc91b88745a0371'},
  originalFullPR143Sha256:sha(original),fusedFullSha256:sha(trial),
  delta:'one parent .write gate + four leaf .write gates + two lease validation pairs; PR143 freeze/receipt exact',
  parentGate:root.datasetV2['.write'].startsWith('(auth != null && auth.token.parentCasService === true)'),
  cellGates:cellPaths.length,
  freezeMatched:true};
writeFileSync(dirname(target)+'/final-data-review-rules-manifest.json',JSON.stringify(report,null,2)+'\n');
console.log('FINAL_DATA_REVIEW_FUSED_RULES',JSON.stringify(report));
