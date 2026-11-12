#!/usr/bin/env node
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
 process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
 !process.env.FIREBASE_EMULATOR_HUB||
 (process.env.GCLOUD_PROJECT??'demo-hdnd')!=='demo-hdnd')
 throw Error('PR149_REFUSES_NON_DEMO_EMULATOR');
const exact=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
if(exact.rules['.write']!==false||
 !String(exact.rules?.hdnd?.datasetV2?.['.write']??'').includes('parentCasService'))
 throw Error('PR149_MISSING_EXCLUSIVE_RULES');
const url='http://127.0.0.1:9000/.settings/rules.json?ns=demo-hdnd';
const head={Authorization:'Bearer owner','Content-Type':'application/json'};
const existing=await fetch(url,{headers:head});
if(!existing.ok)throw Error('Cannot GET demo Rules '+existing.status);
if(!isDeepStrictEqual(await existing.json(),exact)){
 const changed=await fetch(url,{method:'PUT',headers:head,body:JSON.stringify(exact)});
 if(!changed.ok)throw Error('Cannot PUT demo Rules '+changed.status);
}
const verify=await fetch(url,{headers:head});
if(!verify.ok||!isDeepStrictEqual(await verify.json(),exact))
 throw Error('PR149_RULES_READBACK_MISMATCH');
const check=await fetch('http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit/health');
if(!check.ok||(await check.json()).enabled!==true)
 throw Error('PR149_PARENT_NOT_READY');
mkdirSync('pr149-ops-evidence',{recursive:true});
const original=process.env.PR149_SOURCE_SHA??'02964722ae405a7ccf70f2b88bfe21cb7d0bcca7';
const originalRulesHash='45d74efaa73e7ff8f18b301630f2bbba9ca88d27340687df7ad577c99d912cd5';
const observed=createHash('sha256').update(readFileSync('firebase/database.exclusive-candidate.rules.json')).digest('hex');
if(!/^[0-9a-f]{40}$/.test(original))throw Error('MALFORMED_CANDIDATE_SHA');
if(original=== '02964722ae405a7ccf70f2b88bfe21cb7d0bcca7'&&observed!==originalRulesHash)
 throw Error('PR149_SOURCE_SHA_RULES_HASH_UNEXPECTED');
const fact={schema:'pr149.run.v1',lockedOriginalSha:'02964722ae405a7ccf70f2b88bfe21cb7d0bcca7',
 candidateUnderTestSha:original,sourceRulesRawSha256:observed,liveEmulatorRulesCompactSha256:
 createHash('sha256').update(JSON.stringify(exact)).digest('hex'),
 project:'demo-hdnd',functions:['cellEdit','parentDatasetCommit'],
 transport:'real Auth+RTDB+both Functions via emulator',production:'NONE',
 frcrFixedExpected:process.env.PR149_EXPECT_FRCR_FIXED==='true'};
writeFileSync('pr149-ops-evidence/environment.json',JSON.stringify(fact,null,2)+'\n');
console.log('PR149_EMULATOR_FULL_RULES_READY',JSON.stringify(fact));
const testPath=process.env.PR149_ONLY_OPERATOR_BOOTSTRAP==='true'
 ?'docs/operations/pr149/bootstrap-operator.test.ts'
 :'docs/operations/pr149/operational-drill.test.ts';
const cmd=['node_modules/vitest/vitest.mjs','run',testPath,
  '--config','parent-commit-service/test/vitest.config.mjs',
  '--maxWorkers=1','--reporter=verbose'];
const p=spawn(process.execPath,cmd,{stdio:'inherit',env:{...process.env,PR149_CANDIDATE_SHA:original,
 PARENT_COMMIT_ENABLED:'true',PARENT_DATABASE_URL:'https://demo-hdnd.firebaseio.com',
 PARENT_ALLOWED_ORIGINS:'http://127.0.0.1:4173',
 PARENT_ENDPOINT:'http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit',
 VITE_PARENT_COMMIT_ENDPOINT:'http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit'}});
const exit=await new Promise((resolve,reject)=>{p.once('exit',code=>resolve(code??1));p.once('error',reject);});
console.log('PR149_OPERATIONS_EMULATOR_TESTS_'+(exit===0?'PASS':'FAIL'),exit);
process.exitCode=exit;
