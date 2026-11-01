import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
const source=resolve(process.argv[2]||'firebase/database.exclusive-candidate.rules.json');
const output=resolve(process.argv[3]||'parent-commit-service/.generated/trial.rules.json');
const original=readFileSync(source,'utf8'),rules=JSON.parse(original);
const expression=rules.rules?.hdnd?.datasetV2?.['.write'];
if(typeof expression!=='string'||!expression.includes('active/revision')||!expression.includes('bootstrap'))
  throw Error('Unexpected FULL candidate Rules; refusing to generate a trial');
rules.rules.hdnd.datasetV2['.write']=
  '(auth != null && auth.token.parentCasService === true) && ('+expression+')';
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(rules,null,2)+'\n');
const sha=x=>createHash('sha256').update(x).digest('hex');
const checked=JSON.parse(readFileSync(output));
checked.rules.hdnd.datasetV2['.write']=expression;
if(JSON.stringify(checked)!==JSON.stringify(JSON.parse(original)))
 throw Error('Trial unexpectedly changed any other Rules');
const manifest={sourceSha:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847',
 originalFullRules:sha(original),trialFullRules:sha(readFileSync(output)),
 delta:'ONLY hdnd/datasetV2/.write, trusted service claim; no changes to leaf/legacy/bootstrap'};
writeFileSync(dirname(output)+'/rules-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log('PARENT_FULL_RULES_MANIFEST',JSON.stringify(manifest));