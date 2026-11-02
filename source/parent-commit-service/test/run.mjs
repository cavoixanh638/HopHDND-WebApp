import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const prefix='parent-commit-service';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
   process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
   !String(process.env.GCLOUD_PROJECT||'demo-hdnd').startsWith('demo-'))
 throw Error('Full auth-endpoint test requires localhost Auth+RTDB and demo project');
mkdirSync(prefix+'/evidence',{recursive:true});
const env={...process.env,GCLOUD_PROJECT:'demo-hdnd',GCP_PROJECT:'demo-hdnd',
 FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',
 FIREBASE_DATABASE_EMULATOR_HOST:'127.0.0.1:9000',
 PARENT_DATABASE_URL:'https://demo-hdnd.firebaseio.com',
 PARENT_COMMIT_ENABLED:'true',PARENT_ALLOWED_ORIGINS:'http://127.0.0.1:4173',PARENT_PORT:'8787',
 PARENT_ENDPOINT:'http://127.0.0.1:8787/parentDatasetCommit'};
const service=spawn(process.execPath,[prefix+'/dev-server.mjs'],{env,stdio:'inherit'});
let exit=1;
try{
 const start=Date.now();let ok=false;
 while(Date.now()-start<25000){
  if(service.exitCode!==null)throw Error('Service exited before ready: '+service.exitCode);
  try{const r=await fetch('http://127.0.0.1:8787/health');
    if(r.ok&& (await r.json()).enabled){ok=true;break;}}
  catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 if(!ok)throw Error('Authenticating parent HTTP service failed readiness');
 const test=spawn(process.execPath,['node_modules/vitest/vitest.mjs','run',
   prefix+'/test/integration.test.ts','--config',prefix+'/test/vitest.config.mjs'],{env,stdio:'inherit'});
 exit=await new Promise((resolve,reject)=>{test.once('exit',code=>resolve(code??1));test.once('error',reject);});
}finally{
 service.kill('SIGTERM');
 await Promise.race([new Promise(resolve=>service.once('exit',resolve)),
   new Promise(resolve=>setTimeout(resolve,3500))]);
}
console.log('PARENT_REAL_AUTH_ENDPOINT_EMULATOR '+(exit===0?'PASS':'FAIL'));
process.exitCode=exit;