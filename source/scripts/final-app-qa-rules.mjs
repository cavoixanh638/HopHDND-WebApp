/**
 * FINAL-APP-REVIEW pinned PR147 candidate mode.
 * Copy candidate's existing FULL Rules BYTE-FOR-BYTE to QA artifact path;
 * never generate a candidate or deploy/update Rules. Guard exact SHA.
 */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const sha256=x=>createHash('sha256').update(x).digest('hex');
const pin=process.env.FINAL_APP_CANDIDATE_SHA;
const spark=process.env.FINAL_APP_SPARK==='true';
if(spark){
  if(pin)throw Error('Do not mix Spark integration QA and PR147 candidate pin');
  const source=resolve('firebase/database.spark.rules.json');
  const bytes=readFileSync(source);
  const root=JSON.parse(bytes.toString('utf8'))?.rules?.hdnd;
  if(!root?.sparkSessions||!root.freezeControl||!root.freezeReceipts||
    !String(root.datasetV2?.['.write']??'').includes('parentCasService'))
    throw Error('Missing complete Spark Rules contract');
  const output=resolve('qa-results/spark-final-app-review/generated/shared.rules.json');
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,bytes);
  const manifest={kind:'SPARK_INTEGRATION_RULES_UNMODIFIED_NOT_RELEASE',
    candidateSha:spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
    sourceSha256:sha256(bytes),combinedSha256:sha256(bytes),
    sourceRulesPath:'firebase/database.spark.rules.json',touchedRulePaths:[],functionsEmulator:false};
  writeFileSync(resolve('qa-results/spark-final-app-review/generated/rules-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log('FINAL_APP_SPARK_RULES',JSON.stringify(manifest));
}else if(pin){
  const p=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'});
  if(p.status!==0||p.stdout.trim()!==pin||!/^[a-f0-9]{40}$/.test(pin))
    throw Error('Refusing QA: checkout is not exact pinned official PR147 SHA '+pin);
  const file=resolve('firebase/database.exclusive-candidate.rules.json');
  const bytes=readFileSync(file);
  const obj=JSON.parse(bytes.toString('utf8'));
  const root=obj?.rules?.hdnd;
  if(!root?.freezeControl||!root?.freezeReceipts||
    !String(root?.datasetV2?.['.write']??'').includes('parentCasService')||
    !String(root?.datasetV2?.leases?.['$generation']?.['$id']?.['$field']?.['.write']??'').includes('cellService')||
    !String(root?.editLocks?.['$id']?.['$field']?.['.write']??'').includes('cellService'))
    throw Error('Candidate is missing PR145+PR146+PR143 FULL Rules contract');
  const output=resolve('qa-results/final-app-review/generated/shared.rules.json');
  mkdirSync(dirname(output),{recursive:true});
  writeFileSync(output,bytes); // EXACT bytes as PR147, no modifying Rules
  const manifest={
    kind:'PINNED_PR147_CANDIDATE_RULES_UNMODIFIED_NOT_RELEASE',
    candidateSha:pin,sourceSha256:sha256(bytes),
    combinedSha256:sha256(bytes),sourceRulesPath:'firebase/database.exclusive-candidate.rules.json',
    claims:['parentCasService','cellService','freezeControl','freezeReceipts'],
    touchedRulePaths:[],sourcePRs:[147]
  };
  writeFileSync(resolve('qa-results/final-app-review/generated/rules-manifest.json'),
    JSON.stringify(manifest,null,2)+'\n');
  console.log('FINAL_APP_PINNED_CANDIDATE_RULES',JSON.stringify(manifest));
}else{
/**
 * QA ONLY: compose PR143 candidate Rules + PR145 cell gateway + PR146 parent
 * service guard. Creates a generated file OUTSIDE published/candidate paths.
 * Does not edit the three PRs or assert that this is Chat1's release Rules.
 */
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
const digest=sha256;
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

}
