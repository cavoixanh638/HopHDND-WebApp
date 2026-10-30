// Self-contained dedicated runner. Never changes source/firebase.json or Rules.
// No deployment: Firebase CLI emulators:exec on the synthetic demo project only.
import {spawn} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';

const project='demo-hdnd-network-ack';
if(!process.cwd().endsWith('/source')&&!process.cwd().endsWith('\\source'))
  throw Error('Run from source/ directory only');
if(process.env.FIREBASE_DATABASE_EMULATOR_HOST||process.env.FIREBASE_AUTH_EMULATOR_HOST)
  throw Error('Refusing to use already-running/unverified Emulator');
const work=mkdtempSync(join(tmpdir(),'pr95-network-ack-'));
const rules=resolve('firebase/database.exclusive-candidate.rules.json');
const config=join(work,'firebase.json');
writeFileSync(config,JSON.stringify({
  database:{rules},
  emulators:{
    database:{host:'127.0.0.1',port:9000},
    auth:{host:'127.0.0.1',port:9099},
    ui:{enabled:false},singleProjectMode:true
  }
},null,2));
const cmd='node node_modules/vitest/vitest.mjs run tests/pr95-network-ack-loss.test.ts --no-file-parallelism';
const args=['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec',
  '--project',project,'--only','database,auth','--config',config,cmd];
let exit=1;
try {
  exit=await new Promise((resolveCode,reject)=>{
    const child=spawn(process.execPath,args,{stdio:'inherit',
      env:{...process.env,GCLOUD_PROJECT:project,CI:'true'}});
    child.on('error',reject);
    child.on('exit',(code,signal)=>resolveCode(signal?1:code??1));
  });
}finally{rmSync(work,{recursive:true,force:true});}
if(exit!==0)throw Error('PR95 network ACK fault test failed (EXIT '+exit+'). No success claim.');
console.log('PR95_REAL_NETWORK_ACK_LOSS_SUITE_PASS: all operations proved by independent server REST');
