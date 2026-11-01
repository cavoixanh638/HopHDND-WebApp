import {spawn} from 'node:child_process';
if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
 process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
 !process.env.FIREBASE_EMULATOR_HUB)throw Error('PR142 integrated tests: emulator-only');
const cmds=[
 ['node',['cell-edit-service/test/integration.mjs']],
 ['node',['cell-edit-service/test/browser-chrome.mjs']],
 ['node',['parent-commit-service/test/run-functions.mjs']],
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
