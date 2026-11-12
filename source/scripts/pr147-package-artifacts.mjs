#!/usr/bin/env node
/**
 * PR147 SHA-pinned, source-to-archive build (OFFLINE from production).
 * No firebase deploy, hosting publish or production network calls.
 * Production web is built ONLY with external validated approval, never in CI.
 *
 * From a clean checkout of the requested SHA, with Node 22:
 *   node scripts/pr147-package-artifacts.mjs --source-sha <40-hex-commit>
 *
 * Optional, operator-only production WEB build (still NOT a deployment):
 *   ... --production-config /private/firebase.release.json --approval /private/approval.json
 */
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync,
        existsSync,rmSync,mkdtempSync} from 'node:fs';
import {resolve,join,relative,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {gzipSync} from 'node:zlib';

const root=resolve('.');
const output=resolve(root,'qa-results/pr147-release-package');
const sha256=data=>createHash('sha256').update(data).digest('hex');
const hold=(condition,reason)=>{if(!condition)throw Error('PR147_PACKAGE_HOLD '+reason);};
const read=p=>readFileSync(resolve(root,p));
const json=p=>JSON.parse(read(p));
const command=(program,args,env=process.env)=>{
  const result=spawnSync(program,args,{cwd:root,env,stdio:'inherit'});
  hold(result.status===0,'COMMAND_FAILED '+program+' '+args.slice(0,4).join(' '));
};
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const argv=process.argv.slice(2);
const get=name=>{const i=argv.indexOf(name);return i===-1?null:argv[i+1]??null;};
const sourceSha=get('--source-sha');
const productionConfig=get('--production-config');
const approval=get('--approval');
const hasProduction=productionConfig!==null||approval!==null;
const acceptable=new Set(['--source-sha','--production-config','--approval']);

function files(base,paths){
  const entries=[];
  const visit=p=>{
    hold(p!==''&&!p.startsWith('/')&&!p.split('/').includes('..'),'INVALID_ARCHIVE_PATH');
    const full=join(base,p);
    const st=statSync(full);
    hold(!st.isSymbolicLink(),'SYMLINK_IN_PACKAGE '+p);
    if(st.isDirectory()){
      for(const name of readdirSync(full).sort())visit(p==='.'?name:p+'/'+name);
    }else{
      hold(st.isFile(),'NON_REGULAR_PACKAGE_ENTRY '+p);
      const b=readFileSync(full);
      entries.push({path:p,sha256:sha256(b),bytes:b.length});
    }
  };
  for(const p of paths)visit(p);
  entries.sort((a,b)=>a.path.localeCompare(b.path,'en'));
  hold(entries.length>0,'EMPTY_ARCHIVE');
  hold(new Set(entries.map(x=>x.path)).size===entries.length,'DUPLICATE_ARCHIVE_PATH');
  return entries;
}
function archive(name,base,paths){
  const entries=files(base,paths);
  const tar=spawnSync('tar',['--sort=name','--mtime=@0','--owner=0','--group=0',
    '--numeric-owner','--format=gnu','--no-recursion','-C',base,'-cf','-',
    ...entries.map(x=>x.path)],{encoding:null,maxBuffer:128*1024*1024});
  hold(tar.status===0,'TAR_FAIL '+name+' '+String(tar.stderr).slice(0,180));
  const compressed=gzipSync(tar.stdout,{level:9,mtime:0});
  const filename=name+'.tar.gz',target=join(output,filename);
  writeFileSync(target,compressed);
  const extracted=mkdtempSync(join(tmpdir(),'pr147-archive-check-'));
  try{
    const r=spawnSync('tar',['-xzf',target,'-C',extracted,'--no-same-owner'],{encoding:'utf8'});
    hold(r.status===0,'EXTRACT_FAIL '+filename+' '+String(r.stderr).slice(0,180));
    const actual=files(extracted,['.']);
    const normalized=actual.map(x=>({...x,path:x.path.replace(/^\.\//,'')}));
    hold(JSON.stringify(normalized)===JSON.stringify(entries),'EXTRACT_DIGEST_MISMATCH '+filename);
  }finally{rmSync(extracted,{recursive:true,force:true});}
  return {file:filename,sha256:sha256(compressed),bytes:compressed.length,
    fileCount:entries.length,entries};
}
function builtAssets(directory){
  const entries=files(root,[directory]);
  hold(entries.some(x=>x.path===directory+'/index.html'),'WEB_INDEX_MISSING '+directory);
  hold(entries.some(x=>x.path.includes('/assets/')&&x.path.endsWith('.js')),'WEB_JS_MISSING '+directory);
  const bundle=entries.filter(x=>x.path.endsWith('.js')).map(x=>read(x.path).toString('utf8')).join('\n');
  return bundle;
}
function validateSource(){
  const base=json('firebase.json'),release=json('firebase.release.json');
  const sentinel='firebase/REQUIRED_UNVERIFIED_NO_DEFAULT_DEPLOY_DO_NOT_CREATE.rules.json';
  hold(base.database?.rules===sentinel&&!existsSync(resolve(root,sentinel)),'DEFAULT_DEPLOY_GUARD_NOT_HELD');
  hold(!base.functions&&!base.hosting&&!base.storage&&!base.firestore,'DEFAULT_BUNDLES_DEPLOY_TARGET');
  hold(release.database?.instance==='REQUIRED_UNVERIFIED','TRACKED_PRODUCTION_INSTANCE_MUST_BE_UNVERIFIED');
  hold(release.database?.rules==='firebase/database.exclusive-candidate.rules.json','NOT_FULL_RULES');
  hold(Array.isArray(release.functions)&&release.functions.length===2,'TWO_FUNCTIONS_REQUIRED');
  for(const [codebase,dir] of [['pr142-cell-edit','cell-edit-service'],['parent-v2','parent-commit-service']]){
    hold(release.functions.some(f=>f.codebase===codebase&&f.source===dir&&f.runtime==='nodejs22'),'FUNCTION_CONFIG_MISMATCH '+dir);
    const pkg=json(dir+'/package.json'),lock=json(dir+'/package-lock.json');
    hold(pkg.engines?.node==='22'&&lock.lockfileVersion===3,'NODE22_LOCK_REQUIRED '+dir);
    hold(pkg.name===lock.packages?.['']?.name,'LOCK_PACKAGE_MISMATCH '+dir);
    for(const [key,value] of Object.entries(pkg.dependencies))
      hold(lock.packages[''].dependencies?.[key]===value,'LOCK_DEPENDENCY_MISMATCH '+dir+'/'+key);
  }
  const rules=json('firebase/database.exclusive-candidate.rules.json')?.rules;
  hold(rules?.['.write']===false,'FULL_RULES_ROOT_WRITE_GUARD_MISSING');
  hold(String(rules.hdnd?.datasetV2?.['.write']).includes('parentCasService'),'PARENT_CAS_MISSING');
  hold(String(rules.hdnd?.datasetV2?.permissions?.$generation?.['.write']).includes("active/generationId').val() === $generation"),'FRCR01_MISSING');
  hold(read('cell-edit-service/index.js').toString().includes("region:'asia-southeast1'"),'CELL_REGION_MISMATCH');
  hold(read('parent-commit-service/index.mjs').toString().includes("region:'us-central1'"),'PARENT_REGION_MISMATCH');
}
try{
  hold(argv.length===(hasProduction?6:2)&&argv.every((x,i)=>i%2===0?acceptable.has(x):true),
    'USAGE_SOURCE_SHA_OPTIONAL_PRODUCTION_CONFIG_AND_APPROVAL');
  hold(/^[a-f0-9]{40}$/.test(sourceSha??''),'SOURCE_SHA_REQUIRED_40_HEX');
  hold(!hasProduction||(productionConfig&&approval&&isAbsolute(productionConfig)&&isAbsolute(approval)),
    'PRIVATE_ABSOLUTE_PRODUCTION_CONFIG_AND_APPROVAL_REQUIRED');
  hold(process.versions.node.split('.')[0]==='22','NODE22_BUILDER_REQUIRED');
  const head=git('rev-parse','HEAD');
  hold(sourceSha===head,'CHECKOUT_SHA_MISMATCH expected='+sourceSha+' actual='+head);
  hold(git('status','--porcelain','--untracked-files=normal','--','.',':!qa-results')==='','DIRTY_CHECKOUT');
  validateSource();
  command('node',['scripts/pr147-default-deploy-guard.mjs']);
  const rulesPath='firebase/database.exclusive-candidate.rules.json';
  const rulesSha=sha256(read(rulesPath));
  const sourceHashes={
    rootLockSha256:sha256(read('package-lock.json')),
    cellLockSha256:sha256(read('cell-edit-service/package-lock.json')),
    parentLockSha256:sha256(read('parent-commit-service/package-lock.json')),
    fullRulesRawSha256:rulesSha,
    releaseConfigTemplateSha256:sha256(read('firebase.release.json')),
    defaultConfigSha256:sha256(read('firebase.json')),
    defaultDeployGuardSha256:sha256(read('scripts/pr147-default-deploy-guard.mjs')),
    operatorCliSha256:sha256(read('scripts/operator-first-import.mjs')),
    operatorCliEntrySha256:sha256(read('scripts/operator-first-import-entry.ts')),
    operatorCliPathSha256:sha256(read('scripts/operator-first-import-path.mjs'))
  };
  // Run exactly the locked dependency installs and REBUILD each web mode.
  // Never package dist-pages from an earlier working tree or stale CI job.
  command('npm',['ci','--no-audit','--no-fund']);
  command('npm',['ci','--prefix','cell-edit-service','--no-audit','--no-fund']);
  command('npm',['ci','--prefix','parent-commit-service','--no-audit','--no-fund']);
  for(const f of ['cell-edit-service/index.js','cell-edit-service/core.js',
    'parent-commit-service/index.mjs','parent-commit-service/src/handler.mjs',
    'parent-commit-service/src/commit.mjs','parent-commit-service/src/parent-contract.mjs'])
    command('node',['--check',f]);
  const buildEnv={...process.env};
  delete buildEnv.VITE_PARENT_REPLACEMENT_ENABLED;
  delete buildEnv.VITE_PARENT_COMMIT_ENDPOINT;
  const demoEndpoint='http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit';
  const demoEnv={...buildEnv,VITE_PARENT_REPLACEMENT_ENABLED:'true',VITE_PARENT_COMMIT_ENDPOINT:demoEndpoint};
  rmSync(resolve(root,'dist-pages'),{recursive:true,force:true});
  rmSync(resolve(root,'dist-pages-test'),{recursive:true,force:true});
  rmSync(output,{recursive:true,force:true});
  command('npm',['run','build:pages'],buildEnv);
  const defaultJs=builtAssets('dist-pages');
  hold(!defaultJs.includes(demoEndpoint),'ORDINARY_WEB_CONTAINS_DEMO_ENDPOINT');
  command('npm',['run','build:pages:test'],demoEnv);
  const demoJs=builtAssets('dist-pages-test');
  hold(demoJs.includes(demoEndpoint),'DEMO_WEB_MISSING_EMULATOR_ENDPOINT');
  mkdirSync(output,{recursive:true});
  const archives=[
    archive('web-pages-default-disabled',root,['dist-pages']),
    archive('web-pages-test-emulator-only',root,['dist-pages-test']),
    archive('functions-cellEdit-node22',resolve(root,'cell-edit-service'),['index.js','core.js','package.json','package-lock.json']),
    archive('functions-parentDatasetCommit-node22',resolve(root,'parent-commit-service'),['index.mjs','src','package.json','package-lock.json']),
    archive('firebase-full-rules-frcr01',root,[rulesPath]),
    archive('operator-first-import-node22-sources',root,[
      'scripts/operator-first-import.mjs','scripts/operator-first-import-entry.ts',
      'scripts/operator-first-import-path.mjs',
      'scripts/pr147-default-deploy-guard.mjs','src','shared','package.json','package-lock.json'])
  ];
  let productionWeb={status:'NOT_BUILT_NOT_AUTHORIZED',publishable:false,artifact:null};
  if(hasProduction){
    // This is an OFFLINE check of operator-supplied evidence, NOT a live signoff.
    // Do not read or include the private approval file in any archive.
    command('node',['scripts/pr147-release-validate.mjs','--mode','production',
      '--config',productionConfig,'--approval',approval]);
    const url=new URL(process.env.VITE_PARENT_COMMIT_ENDPOINT??'');
    hold(url.protocol==='https:'&&url.hostname!=='localhost'&&url.hostname!=='127.0.0.1',
      'PRODUCTION_WEB_REQUIRES_APPROVED_PUBLIC_HTTPS_ENDPOINT');
    const productionEnv={...buildEnv,VITE_PARENT_REPLACEMENT_ENABLED:'true',
      VITE_PARENT_COMMIT_ENDPOINT:url.href};
    rmSync(resolve(root,'dist-pages'),{recursive:true,force:true});
    command('npm',['run','build:pages'],productionEnv);
    const prodJs=builtAssets('dist-pages');
    hold(prodJs.includes(url.href)&&!prodJs.includes(demoEndpoint),
      'PRODUCTION_WEB_ENDPOINT_NOT_EMBEDDED_OR_DEMO_LEAK');
    archives.push(archive('web-pages-production-offline-approval-required',root,['dist-pages']));
    productionWeb={status:'OFFLINE_BUILT_PENDING_LIVE_GO',publishable:false,
      artifact:'web-pages-production-offline-approval-required.tar.gz',
      endpoint:url.href,approvalRawSha256:sha256(readFileSync(approval))};
  }
  const manifest={
    schema:'hophdnd.pr147.sha-pinned-rehearsal.v3',
    kind:'SOURCE_REBUILT_CHECKED_OFFLINE_NOT_PRODUCTION',
    repository:'cavoixanh638/HopHDND-WebApp',
    sourceSha:head,sourceTreeSha:git('rev-parse','HEAD^{tree}'),
    artifactSetName:'pr147-release-rehearsal-'+head,
    checkoutCleanAtStart:true,buildsFromSourcePerformed:true,
    npmCiFromThreeLocksPerformed:true,
    statuses:{CODE_READY:'REQUIRES_EXACT_SHA_CI',PACKAGE_READY:'OFFLINE_REHEARSAL_ONLY',
      PRODUCTION_AUTHORIZED:false,PRODUCTION_DEPLOY_PERFORMED:false,WEB_PUBLISHED:false},
    webProfiles:{
      ordinary:{mode:'pages',V2Enabled:false,endpoint:null,publishable:false,
        artifact:'web-pages-default-disabled.tar.gz'},
      demo:{mode:'pages-test',V2Enabled:true,endpoint:demoEndpoint,project:'demo-hdnd',
        emulatorOnly:true,publishable:false,artifact:'web-pages-test-emulator-only.tar.gz'},
      production:productionWeb
    },
    rules:{path:rulesPath,rawSha256:rulesSha,fullRules:true},
    serviceRegions:{'pr142-cell-edit':'asia-southeast1','parent-v2':'us-central1'},
    runtime:{builderNode:process.version,
      builderNpm:execFileSync('npm',['--version'],{cwd:root,encoding:'utf8'}).trim(),
      serviceEngine:'node22',
      firebaseTools:json('package.json').devDependencies['firebase-tools'],
      vite:json('package.json').devDependencies.vite},
    sourceHashes,archives,
    defaultDeploy:{config:'firebase.json',status:'FAIL_CLOSED_MISSING_RULES_SOURCE',
      validator:'node scripts/pr147-default-deploy-guard.mjs'},
    reproduction:{
      checkout:'git checkout --detach '+head,
      run:'cd source && node scripts/pr147-package-artifacts.mjs --source-sha '+head,
      requires:'clean checkout, Node22, npm, GNU tar and npm registry; installs all three locks and rebuilds web twice',
      verify:'cd qa-results/pr147-release-package && sha256sum -c SHA256SUMS',
      regenerateAfterArtifactExpiry:true
    },
    caution:'Demo localhost web MUST NOT publish. Ordinary web V2 is off. Production requires external IAM/Rules/backup/operator GO and separate web LAST; no deployment performed.'
  };
  const manifestBytes=Buffer.from(JSON.stringify(manifest,null,2)+'\n');
  writeFileSync(join(output,'release-manifest.json'),manifestBytes);
  const sums=archives.map(a=>a.sha256+'  '+a.file);
  sums.push(sha256(manifestBytes)+'  release-manifest.json');
  writeFileSync(join(output,'SHA256SUMS'),sums.join('\n')+'\n');
  for(const item of archives)hold(sha256(readFileSync(join(output,item.file)))===item.sha256,
    'ARCHIVE_HASH_CHANGED '+item.file);
  console.log('PR147_SHA_PINNED_SOURCE_REBUILT_PACKAGE_READY',JSON.stringify({
    sourceSha:head,sourceTreeSha:manifest.sourceTreeSha,rulesRawSha256:rulesSha,
    archiveCount:archives.length,archives:archives.map(a=>({file:a.file,sha256:a.sha256,bytes:a.bytes})),
    productionWeb:productionWeb.status,productionAuthorized:false}));
}catch(error){
  console.error(error instanceof Error?error.message:'PR147_PACKAGE_HOLD');
  process.exitCode=2;
}
