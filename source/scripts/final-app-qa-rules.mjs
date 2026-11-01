/**
 * QA ONLY: compose PR143 candidate Rules + PR145 cell gateway + PR146 parent
 * service guard. Creates a generated file OUTSIDE published/candidate paths.
 * Does not edit the three PRs or assert that this is Chat1's release Rules.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve('firebase/database.exclusive-candidate.rules.json');
const output=resolve('qa-results/final-app-review/generated/shared.rules.json');
const base=JSON.parse(readFileSync(source,'utf8'));
const root=base?.rules?.hdnd;
if(!root||!root.datasetV2||!root.freezeControl||!root.freezeReceipts)
  throw Error('Missing full PR143 baseline: no combined Rules generated');
const parent=root.datasetV2;
const entry=[
  root.items?.$id,
  root.editLocks?.$id?.$field,
  parent.generations?.$generation?.items?.$id,
  parent.leases?.$generation?.$id?.$field
];
if(entry.some(v=>typeof v?.['.write']!=='string')||
   typeof parent['.write']!=='string')
  throw Error('Unexpected shared Rules paths; fail closed');
for(const node of entry)
  node['.write']="auth != null && auth.token.cellService === true && ("+node['.write']+")";
for(const lease of [entry[1],entry[3]]){
  if(lease?.$other?.['.validate']!==false)throw Error('Unexpected lease schema');
  lease.proofHash={'.validate':"newData.isString() && newData.val().matches(/^[a-f0-9]{64}$/)"};
  lease.lastOperationId={'.validate':"newData.isString() && newData.val().matches(/^[0-9a-f-]{36}$/)"};
}
parent['.write']="(auth != null && auth.token.parentCasService === true) && ("+parent['.write']+")";
mkdirSync(dirname(output),{recursive:true});
const content=JSON.stringify(base,null,2)+'\n';
writeFileSync(output,content);
const digest=x=>createHash('sha256').update(x).digest('hex');
const manifest={
  kind:'UNOFFICIAL_QA_SHARED_RULES_NOT_FOR_DEPLOY',
  sourceSha256:digest(readFileSync(source)),
  combinedSha256:digest(content),
  exactlyChanged:[
    'hdnd/items/$id/.write','hdnd/editLocks/$id/$field/.write',
    'hdnd/datasetV2/generations/$generation/items/$id/.write',
    'hdnd/datasetV2/leases/$generation/$id/$field/.write',
    'hdnd/editLocks/$id/$field/proofHash/.validate',
    'hdnd/editLocks/$id/$field/lastOperationId/.validate',
    'hdnd/datasetV2/leases/$generation/$id/$field/proofHash/.validate',
    'hdnd/datasetV2/leases/$generation/$id/$field/lastOperationId/.validate',
    'hdnd/datasetV2/.write'
  ],
  sourcePRs:[143,145,146]
};
writeFileSync(resolve('qa-results/final-app-review/generated/rules-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('FINAL_APP_QA_RULES_READY',JSON.stringify(manifest));
