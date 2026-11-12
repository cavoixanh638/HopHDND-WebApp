import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const url='http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
 process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
 (process.env.GCLOUD_PROJECT??'demo-hdnd')!=='demo-hdnd')
 throw Error('INTEGRATED_EMULATOR_ONLY');
const env={...process.env,GCLOUD_PROJECT:'demo-hdnd',GCP_PROJECT:'demo-hdnd',
 PARENT_DATABASE_URL:'https://demo-hdnd.firebaseio.com',PARENT_COMMIT_ENABLED:'true',
 PARENT_ALLOWED_ORIGINS:'http://127.0.0.1:4173,http://127.0.0.1:4174',
 PARENT_ENDPOINT:url,VITE_PARENT_COMMIT_ENDPOINT:url};
let ready=false;
for(let i=0;i<60;i++){
 try{const response=await fetch(url+'/health');
  if(response.ok&&(await response.json()).enabled===true){ready=true;break;}}
 catch{}
 await new Promise(resolve=>setTimeout(resolve,300));
}
if(!ready)throw Error('Real Functions Emulator onRequest wrapper not ready');
console.log('PARENT_REAL_FUNCTIONS_WRAPPER_READY',url);
mkdirSync('parent-commit-service/evidence',{recursive:true});
const child=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run',
 'parent-commit-service/test/integration.test.ts','--config','parent-commit-service/test/vitest.config.mjs',
 ...(process.env.PARENT_ONLY_ACK_TESTS==='true'?['--testNamePattern','lost API completion|lost HTTP ACK']:[])],
 {env,stdio:'inherit'});
const exit=await new Promise((resolve,reject)=>{child.once('exit',c=>resolve(c??1));child.once('error',reject);});
console.log('PARENT_ACTUAL_ONREQUEST_FUNCTIONS_EMULATOR '+(exit===0?'PASS':'FAIL'));
process.exitCode=exit;
