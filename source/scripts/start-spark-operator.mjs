import {spawn} from 'node:child_process';
const emulator=process.argv.includes('--emulator');
const releaseIndex=process.argv.indexOf('--release-file');
const releaseFile=releaseIndex>=0?process.argv[releaseIndex+1]:undefined;
if(!emulator&&!releaseFile)throw Error('Private verified --release-file required for production');
if(emulator&&(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||process.env.GCLOUD_PROJECT!=='demo-hdnd'))throw Error('Local demo Auth+RTDB Emulators required');
if(!emulator&&(process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIREBASE_DATABASE_EMULATOR_HOST||process.env.FIREBASE_EMULATOR_HUB))throw Error('Mixed emulator/production context denied');
const env={...process.env,VITE_FIREBASE_WRITE_MODE:'spark',VITE_PARENT_REPLACEMENT_ENABLED:'true',
  VITE_PARENT_COMMIT_ENDPOINT:'http://127.0.0.1:8787/parentDatasetCommit',
  PARENT_DATABASE_URL:emulator?'https://demo-hdnd.firebaseio.com':'https://hophdnd-8b7b2-default-rtdb.asia-southeast1.firebasedatabase.app',
  ...(!emulator?{GCLOUD_PROJECT:'hophdnd-8b7b2',SPARK_LOCAL_OPERATOR_APPROVED:'YES'}:{})};
const children=[
  spawn(process.execPath,['parent-commit-service/operator-server.mjs',...(emulator?['--emulator']:['--production-approved','--release-file',releaseFile])],{env,stdio:'inherit'}),
  spawn(process.execPath,['node_modules/vite/bin/vite.js',...(emulator?['--mode','pages-test']:['preview','--mode','pages-operator','--outDir','dist-spark-operator']),'--host','127.0.0.1','--port','4173','--strictPort'],{env,stdio:'inherit'})
];
const stop=()=>children.forEach(child=>child.kill('SIGTERM'));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
for(const child of children)child.on('exit',code=>{stop();process.exitCode=code??1;});
