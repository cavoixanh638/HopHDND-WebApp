import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';

const [src,out]=process.argv.slice(2);
if(!src||!out)throw Error('Usage: node build-trial-rules.mjs <full-candidate-Rules.json> <output-directory>');
const original=readFileSync(resolve(src),'utf8');
const full=JSON.parse(original);
const node=full.rules?.hdnd?.datasetV2;
if(typeof node?.['.write']!=='string'||!node['.write'].includes('active/revision')||!node['.write'].includes('bootstrap'))
  throw Error('Unexpected candidate Rules; fail closed, do not patch');
const changed=JSON.parse(original);
// No client-side admin privilege can grant the root parent CAS. The special
// claim is exclusively for a future trusted coordinator. Test harness minting
// this claim does NOT prove a deployed service can authenticate it correctly.
changed.rules.hdnd.datasetV2['.write']=
  `(auth != null && auth.token.parentCasService === true) && (${node['.write']})`;
mkdirSync(resolve(out),{recursive:true});
const candidate=join(resolve(out),'baseline.full.rules.json');
const trial=join(resolve(out),'trial.full.rules.json');
writeFileSync(candidate,original);
writeFileSync(trial,JSON.stringify(changed,null,2)+'\n');
const sha=data=>createHash('sha256').update(data).digest('hex');
const delta=JSON.parse(readFileSync(trial,'utf8'));
if(JSON.stringify({...delta.rules.hdnd.datasetV2,['.write']:node['.write']})!==JSON.stringify({...full.rules.hdnd.datasetV2}))
  throw Error('Trial unexpectedly changed fields other than datasetV2/.write');
writeFileSync(join(resolve(out),'rules-manifest.json'),JSON.stringify({
  fullSourceSha256:sha(original),trialSha256:sha(readFileSync(trial)),
  change:'ONLY hdnd/datasetV2/.write, parentCasService gated; staging, children and other Rules unchanged',
  sourceBase:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847'
},null,2));
console.log(`FULL_RULES ${sha(original)} TRIAL_RULES ${sha(readFileSync(trial))}`);
