import {spawn} from 'node:child_process';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
const exact=fs.readFileSync('firebase/database.spark.rules.json');
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||process.env.GCLOUD_PROJECT!=='demo-hdnd')throw Error('Local demo Auth+RTDB required');
const reply=await fetch('http://127.0.0.1:4400/emulators');
const active=await reply.json();
if(active.functions)throw Error('Spark verification must run without Functions Emulator');
const env={...process.env,VITE_FIREBASE_WRITE_MODE:'spark'};
const commands=[
 ['node_modules/vitest/vitest.mjs','run','tests/firebase-emulator.test.ts','tests/exclusive-cell-freeze.test.ts','--pool=threads','--maxWorkers=1','--no-file-parallelism'],
 ['parent-commit-service/test/run.mjs']
];
if(process.env.SPARK_APPROVED_XLSX)commands.push(['node_modules/vitest/vitest.mjs','run','tests/spark-approved-import.test.ts','--pool=threads','--maxWorkers=1']);
for(const args of commands){
 const child=spawn(process.execPath,args,{env,stdio:'inherit'});
 const code=await new Promise((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject);});
 if(code!==0)process.exit(code??1);
}
console.log('SPARK_AUTH_RTDB_AND_LOCAL_OPERATOR_PASS',JSON.stringify({rulesSha256:createHash('sha256').update(exact).digest('hex'),functionsEmulator:false,productionWrites:0}));
