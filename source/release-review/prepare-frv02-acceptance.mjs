/** Detached-checkout-only QA generator. No changes to PR147 source branch. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
const sha=process.env.FINAL_VERIFY_TARGET_SHA;
if(!/^[a-f0-9]{40}$/.test(sha??''))throw Error('QA_SHA_MISSING');
const actual=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(actual!==sha)throw Error('QA_CANDIDATE_SHA_MISMATCH '+actual);
if(process.env.GCLOUD_PROJECT!=='demo-hdnd')throw Error('QA_REQUIRES_DISPOSABLE_DEMO_PROJECT');
const orig='parent-commit-service/test/integration.test.ts';
const generated='parent-commit-service/test/frv02-acceptance.generated.test.ts';
let source=readFileSync(orig,'utf8');
for(const snippet of ['FINAL-RELEASE-VERIFICATION FRCR-01','FRV-02 OPERATOR:',
 'FRV_EDITED_HISTORICAL_A_RESTORE_WITNESS','FRV_RESTORE_ORIGINAL_COMMITTED_BACKUP'])
 if(!source.includes(snippet))throw Error('QA_REQUIRED_ORIGINAL_TEST_ABSENT '+snippet);
const legacy="sourceSha:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847'";
if(source.split(legacy).length!==2)throw Error('QA_LEGACY_WITNESS_MARKER_CHANGED');
source=source.replace(legacy,"sourceSha:'"+sha+"'");
const extra=readFileSync(resolve(process.argv[2]??''),'utf8');
for(const snippet of ['FINAL-ACCEPTANCE independent operator negative matrix',
 'FINAL-ACCEPTANCE independent operator nonempty','FINAL-ACCEPTANCE independent direct audit'])
 if(!extra.includes(snippet))throw Error('QA_NEGATIVE_SUITE_MISSING '+snippet);
writeFileSync(generated,source+'\n'+extra);
let runner=readFileSync('parent-commit-service/test/run-functions.mjs','utf8');
const find="'parent-commit-service/test/integration.test.ts'";
if(runner.split(find).length!==2)throw Error('QA_RUNNER_TARGET_CHANGED');
runner=runner.replace(find,"'"+generated+"'");
writeFileSync('parent-commit-service/test/frv02-acceptance-run.generated.mjs',runner);
mkdirSync('parent-commit-service/evidence',{recursive:true});
console.log('FINAL_ACCEPTANCE_QA_PREPARED '+JSON.stringify({
 candidateSha:sha,tests:generated,runner:'frv02-acceptance-run.generated.mjs',
 guardedSourceUntouched:true,externalTestAppendOnly:true,
 realServices:['asia-southeast1/cellEdit','us-central1/parentDatasetCommit']}));
