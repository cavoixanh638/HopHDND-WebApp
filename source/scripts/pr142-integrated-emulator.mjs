import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
 process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
 !process.env.FIREBASE_EMULATOR_HUB)throw Error('PR142 integrated tests: emulator-only');
// The Database Emulator uses a different default namespace when Functions
// contains no configured databaseURL. Test clients and both Functions use
// ?ns=demo-hdnd, so loading firebase.staging.json alone is NOT proof that
// this exact instance uses the candidate Rules. Install and re-read the
// checked-in FULL Rules on the disposable demo namespace, fail closed.
const exact=JSON.parse(readFileSync('firebase/database.exclusive-candidate.rules.json','utf8'));
if(exact.rules?.['.write']!==false||
   !String(exact.rules.hdnd.datasetV2['.write']).includes('parentCasService')||
   !String(exact.rules.hdnd.editLocks?.$id?.$field?.['.write']).includes('cellService'))
 throw Error('PR142_FULL_RULES_SOURCE_GUARD_MISSING');
const url='http://127.0.0.1:9000/.settings/rules.json?ns=demo-hdnd';
const headers={Authorization:'Bearer owner','Content-Type':'application/json'};
const before=await fetch(url,{headers,signal:AbortSignal.timeout(12000)});
if(!before.ok)throw Error('Cannot inspect local namespace Rules '+before.status);
const observed=await before.json();
if(!isDeepStrictEqual(observed,exact)){
 const apply=await fetch(url,{method:'PUT',headers,body:JSON.stringify(exact),signal:AbortSignal.timeout(12000)});
 if(!apply.ok)throw Error('Cannot apply exact candidate Rules on local namespace '+apply.status);
}
const after=await fetch(url,{headers,signal:AbortSignal.timeout(12000)});
if(!after.ok||!isDeepStrictEqual(await after.json(),exact))
 throw Error('PR142_NAMESPACE_RULES_NOT_EXACT_CANDIDATE');
console.log('PR142_SHARED_FULL_RULES_LIVE_EXACT',JSON.stringify({
  namespace:'demo-hdnd',project:'demo-hdnd',defaultNamespaceMatched:isDeepStrictEqual(observed,exact),
  sha256:createHash('sha256').update(JSON.stringify(exact)).digest('hex'),
  functions:['asia-southeast1-cellEdit','us-central1-parentDatasetCommit']
}));
const cmds=[
 ['node',['cell-edit-service/test/integration.mjs']],
 ['node',['cell-edit-service/test/browser-chrome.mjs']],
 ['node',['parent-commit-service/test/run-functions.mjs']],
 ['node',['cell-edit-service/test/full-app.mjs']],
];
for(const [command,args]of cmds){
 console.log('PR142_INTEGRATED_RUNNING',command,...args);
 const child=spawn(command,args,{stdio:'inherit',env:{...process.env,
  PARENT_COMMIT_ENABLED:'true',PARENT_DATABASE_URL:'https://demo-hdnd.firebaseio.com',
  PARENT_ALLOWED_ORIGINS:'http://127.0.0.1:4173,http://127.0.0.1:4174'}});
 const exit=await new Promise((resolve,reject)=>{child.once('exit',c=>resolve(c??1));child.once('error',reject);});
 if(exit!==0){console.error('PR142_INTEGRATED_GATE_FAIL',args.join(' '),exit);process.exit(exit);}
}
console.log('PR142_INTEGRATED_SERVICES_FULL_RULES_PASS');
