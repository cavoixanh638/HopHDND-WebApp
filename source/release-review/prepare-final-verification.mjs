/**
 * Independent checkout-only generator: appends reviewer tests to the unchanged
 * target SHA's existing genuine Auth -> both Functions -> FULL Rules harness.
 * This script never touches the upstream integrator branch or existing tests.
 */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve,dirname} from 'node:path';
const target=String(process.env.FINAL_VERIFY_TARGET_SHA??'').trim();
if(!/^[a-f0-9]{40}$/.test(target))throw Error('FRV_TARGET_SHA_NOT_PINNED');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(head!==target)throw Error('FRV_CHECKOUT_SHA_MISMATCH expected='+target+' actual='+head);
if(!/^(demo-hdnd|)$/.test(process.env.GCLOUD_PROJECT??''))
 throw Error('FRV_MUST_USE_DISPOSABLE_DEMO_EMULATOR');
const input='parent-commit-service/test/integration.test.ts';
const output='parent-commit-service/test/final-release-verification.generated.test.ts';
const runnerIn='parent-commit-service/test/run-functions.mjs';
const runnerOut='parent-commit-service/test/final-release-verification-run.generated.mjs';
const appendixPath=resolve(process.argv[2]??'');
const suffix=readFileSync(appendixPath,'utf8');
if(!suffix.includes('FINAL-RELEASE-VERIFICATION FRCR-01')||
 !suffix.includes('FINAL_RELEASE_VERIFICATION_POINTER_RACE'))
 throw Error('FRV_TEST_SOURCE_MISMATCH');
let integration=readFileSync(input,'utf8');
if(!integration.includes("const PROJECT='demo-hdnd'")||
 !integration.includes("const seeded=async(value:any)=>")||
 !integration.includes("it('DR-02 REGRESSION:")||
 !integration.includes("import {createHash,randomUUID}"))
 throw Error('FRV_TARGET_INTEGRATION_HARNESS_CHANGED_REVIEW_REQUIRED');
integration=integration.replace(
 "sourceSha:'98ead3ef8e2a94ed9b3d4c7e0be30cc3d2a0e847'",
 "sourceSha:'"+target+"'");
integration+='\n'+suffix;
mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,integration);
let runner=readFileSync(runnerIn,'utf8');
function replaceOnce(search,replacement){
 if(runner.split(search).length!==2)throw Error('FRV_RUNNER_CHANGED_OR_DUPLICATE '+search);
 runner=runner.replace(search,replacement);
}
replaceOnce("'parent-commit-service/test/integration.test.ts'",
 "'parent-commit-service/test/final-release-verification.generated.test.ts'");
replaceOnce("...(process.env.PARENT_ONLY_ACK_TESTS==='true'?['--testNamePattern','lost API completion|lost HTTP ACK']:[])",
 "...['--testNamePattern','FINAL-RELEASE-VERIFICATION']");
writeFileSync(runnerOut,runner);
console.log('FRV_PREPARED',JSON.stringify({sourceSha:target,reviewerOnly:true,
 tests:['FRCR-01 exact alternate rights denial and restore','FRCR-01 queued write during parent CAS'],
 targetTest:output,testRunner:runnerOut,
 untouchedOriginalHarness:input,
 rules:'firebase/database.exclusive-candidate.rules.json',
 functions:['asia-southeast1-cellEdit','us-central1-parentDatasetCommit']}));
