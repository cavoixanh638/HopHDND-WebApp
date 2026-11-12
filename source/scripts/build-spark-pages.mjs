import {spawnSync} from 'node:child_process';
const env={...process.env,VITE_FIREBASE_WRITE_MODE:'spark'};
if(process.argv.includes('--operator')){
  env.VITE_PARENT_REPLACEMENT_ENABLED='true';
  env.VITE_PARENT_COMMIT_ENDPOINT='http://127.0.0.1:8787/parentDatasetCommit';
}
const mode=process.argv.includes('--operator')?'pages-operator':'pages';
const out=process.argv.includes('--operator')?'dist-spark-operator':'dist-spark';
for(const args of [['node_modules/typescript/bin/tsc','--noEmit'],['node_modules/vite/bin/vite.js','build','--mode',mode,'--outDir',out],['scripts/prepare-pages.mjs',out]]){
 const child=spawnSync(process.execPath,args,{env,stdio:'inherit'});
 if(child.status!==0)process.exit(child.status??1);
}
