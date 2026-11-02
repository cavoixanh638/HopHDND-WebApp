#!/usr/bin/env node
/** PR147 offline, deterministic PREVIEW packaging. No deployment and no network calls.
 * Requires an exact frozen checkout, both Node22 service locks, and two
 * independently built web outputs: disabled production Pages + demo Emulator.
 */
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync,mkdirSync,readdirSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {gzipSync} from 'node:zlib';
const sha=data=>createHash('sha256').update(data).digest('hex');
const required=(test,message)=>{if(!test)throw Error('PR147_PACKAGE_HOLD '+message)};
const source=resolve('.'),folder=resolve('qa-results/pr147-release-package');
const read=path=>readFileSync(resolve(source,path));
const json=path=>JSON.parse(read(path));
const git=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
function contents(path){
 const found=[];
 const walk=(p)=>{
  for(const f of readdirSync(resolve(source,p),{withFileTypes:true})){
   const rel=join(p,f.name);
   if(f.isDirectory())walk(rel);
   else if(f.isFile())found.push(rel);
   else throw Error('PR147_PACKAGE_HOLD symlink/unknown artifact '+rel);
  }
 };
 walk(path);
 return found.sort();
}
function archive(name,paths,root='source'){
 const base=root==='source'?source:resolve(source,root);
 const args=['--sort=name','--mtime=@0','--owner=0','--group=0','--numeric-owner',
  '--format=gnu','-C',base,'-cf','-',...paths];
 const tar=spawnSync('tar',args,{encoding:null,maxBuffer:128*1024*1024});
 required(tar.status===0,'TAR_FAIL '+name+' '+String(tar.stderr).slice(0,120));
 const bytes=gzipSync(tar.stdout,{level:9,mtime:0});
 const path=join(folder,name+'.tar.gz');
 writeFileSync(path,bytes);
 return {file:name+'.tar.gz',sha256:sha(bytes),bytes:bytes.length,
  files:paths.flatMap(p=>statSync(join(base,p)).isDirectory()?contents(join(root==='source'?'':root,p)):p)};
}
try{
 const head=git();
 required(/^[a-f0-9]{40}$/.test(head),'NO_GIT_SHA');
 const staged=json('firebase.release.json');
 required(staged.database.instance==='REQUIRED_UNVERIFIED','PRODUCTION_INSTANCE_MUST_REMAIN_UNVERIFIED');
 required(staged.database.rules==='firebase/database.exclusive-candidate.rules.json','WRONG_RELEASE_RULES');
 required(staged.functions?.length===2,'TWO_FUNCTIONS_REQUIRED');
 for(const s of ['cell-edit-service','parent-commit-service']){
  const pkg=json(s+'/package.json'),lock=json(s+'/package-lock.json');
  required(pkg.engines.node==='22'&&lock.lockfileVersion===3,'BACKEND_NODE22_LOCK_REQUIRED '+s);
  required(lock.packages[''].name===pkg.name,'BACKEND_PACKAGE_LOCK_MISMATCH '+s);
  for(const [name,v] of Object.entries(pkg.dependencies))
   required(lock.packages[''].dependencies?.[name]===v,'BACKEND_LOCK_DEP_MISMATCH '+s+'/'+name);
 }
 const web1=contents('dist-pages'),web2=contents('dist-pages-test');
 required(web1.some(x=>x.endsWith('/index.html'))&&web1.some(x=>x.includes('/assets/')),'PRODUCTION_DISABLED_PAGES_NOT_BUILT');
 required(web2.some(x=>x.endsWith('/index.html'))&&web2.some(x=>x.includes('/assets/')),'DEMO_REHEARSAL_PAGES_NOT_BUILT');
 const rulesRaw=read('firebase/database.exclusive-candidate.rules.json');
 const rules=json('firebase/database.exclusive-candidate.rules.json').rules;
 required(rules?.hdnd?.datasetV2?.permissions?.$generation?.['.write'].includes("active/generationId').val() === $generation"),'FRCR01_MISSING');
 required(rules.hdnd.datasetV2['.write'].includes('parentCasService'),'PARENT_CAS_MISSING');
 mkdirSync(folder,{recursive:true});
 const webDefault=archive('web-pages-default-disabled',['dist-pages']);
 const webDemo=archive('web-pages-test-emulator-only',['dist-pages-test']);
 const cell=archive('functions-cellEdit-node22',['index.js','core.js','package.json','package-lock.json'],'cell-edit-service');
 const parent=archive('functions-parentDatasetCommit-node22',['index.mjs','src','package.json','package-lock.json'],'parent-commit-service');
 const fullRules=archive('firebase-full-rules-frcr01',['firebase/database.exclusive-candidate.rules.json']);
 const operator=archive('operator-first-import-node22-sources',[
  'scripts/operator-first-import.mjs','scripts/operator-first-import-entry.ts',
  'scripts/pr147-default-deploy-guard.mjs','src','shared','package.json','package-lock.json']);
 // The tar archives above are deterministic for identical inputs. Validate
 // content digests in this same run and write unambiguous checksum file.
 const archives=[webDefault,webDemo,cell,parent,fullRules,operator];
 for(const a of archives)required(sha(readFileSync(join(folder,a.file)))===a.sha256,'INTERNAL_CHECKSUM_MISMATCH');
 const manifest={kind:'PR147_CI_REHEARSAL_PACKAGE_NOT_PRODUCTION',sourceSha:head,
  statuses:{CODE_READY:'CI_PENDING',PACKAGE_READY:'OFFLINE_REHEARSAL_ONLY',PRODUCTION_AUTHORIZED:false},
  rules:{path:'firebase/database.exclusive-candidate.rules.json',rawSha256:sha(rulesRaw)},
  runtime:{builderNode:process.version,builderNpm:execFileSync('npm',['--version'],{encoding:'utf8'}).trim(),
   serviceEngine:'node22',firebaseTools:json('package.json').devDependencies['firebase-tools'],
   vite:json('package.json').devDependencies.vite},
  sourceHashes:{rootLockSha256:sha(read('package-lock.json')),
   cellLockSha256:sha(read('cell-edit-service/package-lock.json')),
   parentLockSha256:sha(read('parent-commit-service/package-lock.json')),
   releaseConfigTemplateSha256:sha(read('firebase.release.json')),
   defaultFirebaseDeployHoldSha256:sha(read('firebase.json')),
   defaultDeployGuardSha256:sha(read('scripts/pr147-default-deploy-guard.mjs')),
   operatorCliSourceSha256:sha(read('scripts/operator-first-import.mjs')),
   operatorCliEntrySha256:sha(read('scripts/operator-first-import-entry.ts'))},
  buildFlags:{
   defaultWeb:'VITE_PARENT_REPLACEMENT_ENABLED absent: no approved V2 endpoint',
   rehearsalWeb:{mode:'pages-test',VITE_PARENT_REPLACEMENT_ENABLED:true,
     VITE_PARENT_COMMIT_ENDPOINT:'http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit',
     project:'demo-hdnd',deployForbidden:true}},
  operatorFirstImport:{sourceArchive:'operator-first-import-node22-sources.tar.gz',
    entrypoint:'node scripts/operator-first-import.mjs',
    requiredAuthority:'Verified Google Auth + approved exact source SHA/project/database/empty snapshot; operator only',
    deployPerformed:false,productionExecuted:false},
  defaultDeploy:{config:'firebase.json',status:'FAIL_CLOSED_MISSING_RULES_SOURCE',
    verify:'node scripts/pr147-default-deploy-guard.mjs',
    requiredReleaseConfig:'firebase.release.json'},
  archives,
  caution:'No live project/instance/HTTPS parent endpoint confirmed; demo Pages-test is localhost-only. CI archive is NOT an authorized production web or backend deployment.',
  sourceReproduction:[
   'npm ci --no-audit --no-fund',
   'npm ci --prefix cell-edit-service --no-audit --no-fund',
   'npm ci --prefix parent-commit-service --no-audit --no-fund',
   'node scripts/pr147-default-deploy-guard.mjs',
   'npm run build:pages',
   'VITE_PARENT_REPLACEMENT_ENABLED=true VITE_PARENT_COMMIT_ENDPOINT=http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit npm run build:pages:test',
   'node scripts/pr147-package-artifacts.mjs'
  ]};
 writeFileSync(join(folder,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 writeFileSync(join(folder,'SHA256SUMS'),archives.map(x=>x.sha256+'  '+x.file).join('\n')+'\n');
 console.log('PR147_RELEASE_REHEARSAL_PACKAGE_READY',JSON.stringify({
   sha:head,rulesRawSha256:sha(rulesRaw),artifacts:archives.map(x=>({file:x.file,sha256:x.sha256,bytes:x.bytes})),
   productionAuthorized:false}));
}catch(error){
 console.error(error instanceof Error?error.message:'PR147_PACKAGE_HOLD');
 process.exitCode=2;
}
