import {spawn} from 'node:child_process';
import {join,delimiter} from 'node:path';
// Always use a demo project; this runner cannot deploy or reach HopHDND.
const env={...process.env};
const pathKey=Object.keys(env).find(key=>key.toLowerCase()==='path')??'PATH';
if(env.JAVA_HOME)env[pathKey]=join(env.JAVA_HOME,'bin')+delimiter+env[pathKey];

const child=spawn(process.execPath,['node_modules/firebase-tools/lib/bin/firebase.js','emulators:exec','--project','demo-hdnd','--only','database,auth','node node_modules/vitest/vitest.mjs run tests/firebase-emulator.test.ts tests/firebase-production-rules.test.ts tests/exclusive-cell-freeze.test.ts tests/firebase-tab-auth.test.ts tests/firebase-versioned-replacement.test.ts --no-file-parallelism'],{stdio:'inherit',env});
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
