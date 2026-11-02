/**
 * Read-only verifier for a downloaded PR147 immutable rehearsal Actions artifact.
 * Run in the detached target/source checkout with argv[2] package artifact dir.
 * Does NOT use production or modify the candidate repository.
 */
import {readFileSync,existsSync,readdirSync,statSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const digest=v=>createHash('sha256').update(v).digest('hex');
const root=process.cwd(),folder=resolve(process.argv[2]??'');
const expectedSha=process.env.FINAL_VERIFY_TARGET_SHA;
if(!/^[a-f0-9]{40}$/.test(expectedSha??''))throw Error('FRV_ARTIFACT_SHA_UNSET');
if(!folder.startsWith(resolve(root,'..')+'/')||!existsSync(folder))throw Error('FRV_ARTIFACT_DIR_INVALID');
const read=p=>readFileSync(join(folder,p)),json=p=>JSON.parse(read(p).toString('utf8'));
const actualSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(expectedSha!==actualSha)throw Error('FRV_ARTIFACT_CHECKOUT_MISMATCH');
const manifest=json('release-manifest.json'),checks=read('SHA256SUMS').toString('utf8').trim().split(/\r?\n/);
const findings=[];function assert(label,ok,details={}){const item={label,status:ok?'PASS':'FAIL',...details};findings.push(item);console.log('FRV_ARTIFACT_ASSERT '+JSON.stringify(item));if(!ok)throw Error('FRV_ARTIFACT_INVALID '+label);}
assert('PINNED_MANIFEST_SOURCE_SHA',manifest.sourceSha===expectedSha,{sourceSha:manifest.sourceSha});
assert('NON_PRODUCTION_REHEARSAL_STATUS',manifest.statuses?.PRODUCTION_AUTHORIZED===false&&manifest.kind==='PR147_CI_REHEARSAL_PACKAGE_NOT_PRODUCTION',{statuses:manifest.statuses});
const ruleHash=digest(readFileSync('firebase/database.exclusive-candidate.rules.json'));
assert('EXACT_RULES_CONTENT_SHA256',manifest.rules?.rawSha256===ruleHash,{manifest:manifest.rules?.rawSha256,current:ruleHash});
const wanted=['web-pages-default-disabled.tar.gz','web-pages-test-emulator-only.tar.gz',
 'functions-cellEdit-node22.tar.gz','functions-parentDatasetCommit-node22.tar.gz',
 'firebase-full-rules-frcr01.tar.gz','operator-first-import-node22-sources.tar.gz'];
assert('SIX_DISTINCT_REQUIRED_ARCHIVES',wanted.length===manifest.archives?.length&&wanted.every(name=>manifest.archives.some(x=>x.file===name)),
 {files:manifest.archives?.map(x=>x.file)});
const observedLines=checks.map(s=>s.match(/^([0-9a-f]{64})  ([A-Za-z0-9._-]+\.tar\.gz)$/)).filter(Boolean);
assert('SHA256SUMS_PARSE_AND_COUNT',observedLines.length===wanted.length);
const dirs=[];
for(const file of wanted){
 const full=join(folder,file);
 const entry=manifest.archives.find(x=>x.file===file);
 assert('ARCHIVE_'+file,existsSync(full)&&entry.sha256===digest(readFileSync(full))&&
   entry.bytes===statSync(full).size&&observedLines.some(x=>x[1]===entry.sha256&&x[2]===file),
   {sha256:digest(readFileSync(full)),bytes:statSync(full).size});
 const listed=execFileSync('tar',['-tzf',full],{encoding:'utf8'}).trim().split('\n').filter(Boolean);
 assert('SAFE_TAR_PATHS_'+file,listed.length>0&&listed.every(n=>!n.startsWith('/')&&!n.split('/').includes('..')),{entries:listed.length});
 const destination=resolve('parent-commit-service/evidence/frv-verified-package',file.replace(/\.tar\.gz$/,''));
 mkdirSync(destination,{recursive:true});
 execFileSync('tar',['-xzf',full,'-C',destination],{stdio:['ignore','pipe','pipe']});
 dirs.push({file,dir:destination,listed});
}
function extracted(archive,p){return readFileSync(join(dirs.find(x=>x.file===archive).dir,p));}
const tarCell='functions-cellEdit-node22.tar.gz',tarParent='functions-parentDatasetCommit-node22.tar.gz';
for(const file of ['index.js','core.js','package.json','package-lock.json'])
 assert('CELL_CONTENT_'+file,digest(extracted(tarCell,file))===digest(readFileSync('cell-edit-service/'+file)));
for(const file of ['index.mjs','src/handler.mjs','src/commit.mjs','src/manifest.mjs','src/parent-contract.mjs','package.json','package-lock.json'])
 assert('PARENT_CONTENT_'+file,digest(extracted(tarParent,file))===digest(readFileSync('parent-commit-service/'+file)));
assert('RULES_CONTENT',digest(extracted('firebase-full-rules-frcr01.tar.gz','firebase/database.exclusive-candidate.rules.json'))===ruleHash);
const tarOperator='operator-first-import-node22-sources.tar.gz';
for(const file of ['scripts/operator-first-import.mjs','scripts/operator-first-import-entry.ts',
 'scripts/pr147-default-deploy-guard.mjs','package.json','package-lock.json']){
 assert('OPERATOR_CONTENT_'+file,
   digest(extracted(tarOperator,file))===digest(readFileSync(file)));
}
assert('OPERATOR_REQUIRED_ENTRYPOINT',manifest.operatorFirstImport?.sourceArchive===tarOperator &&
 manifest.operatorFirstImport?.entrypoint==='node scripts/operator-first-import.mjs' &&
 manifest.operatorFirstImport?.deployPerformed===false &&
 manifest.operatorFirstImport?.productionExecuted===false);
assert('DEFAULT_DEPLOY_HOLD_SOURCE_HASH',
 manifest.sourceHashes?.defaultFirebaseDeployHoldSha256===digest(readFileSync('firebase.json')) &&
 manifest.sourceHashes?.defaultDeployGuardSha256===digest(readFileSync('scripts/pr147-default-deploy-guard.mjs')) &&
 manifest.defaultDeploy?.status==='FAIL_CLOSED_MISSING_RULES_SOURCE');
assert('OPERATOR_LOCK_AND_SOURCE_HASHES',
 manifest.sourceHashes?.operatorCliSourceSha256===digest(readFileSync('scripts/operator-first-import.mjs')) &&
 manifest.sourceHashes?.operatorCliEntrySha256===digest(readFileSync('scripts/operator-first-import-entry.ts')));
for(const archive of wanted.slice(0,2)){
 const listed=dirs.find(x=>x.file===archive).listed;
 assert('WEB_ASSET_PRESENT_'+archive,listed.some(x=>/index\.html$/.test(x))&&listed.some(x=>/\/assets\/.*\.js$/.test(x)));
}
assert('CELL_DEPENDENCY_LOCK_SHA',manifest.sourceHashes?.cellLockSha256===digest(readFileSync('cell-edit-service/package-lock.json')));
assert('PARENT_DEPENDENCY_LOCK_SHA',manifest.sourceHashes?.parentLockSha256===digest(readFileSync('parent-commit-service/package-lock.json')));
assert('APP_DEPENDENCY_LOCK_SHA',manifest.sourceHashes?.rootLockSha256===digest(readFileSync('package-lock.json')));
assert('RELEASE_CONFIG_TEMPLATE_SHA',manifest.sourceHashes?.releaseConfigTemplateSha256===digest(readFileSync('firebase.release.json')));
assert('WEB_EXPLICIT_EMULATOR_LOCALHOST_ONLY',manifest.buildFlags?.rehearsalWeb?.deployForbidden===true&&
 String(manifest.buildFlags?.rehearsalWeb?.VITE_PARENT_COMMIT_ENDPOINT).startsWith('http://127.0.0.1:5001/')&&
 manifest.buildFlags?.rehearsalWeb?.project==='demo-hdnd');
assert('DEFAULT_WEB_NOT_V2_ENABLED',/absent|disabled|no approved/i.test(String(manifest.buildFlags?.defaultWeb)));
const inspected=[];
function collect(dir){for(const ent of readdirSync(dir,{withFileTypes:true})){
 const full=join(dir,ent.name);if(ent.isDirectory())collect(full);else if(ent.isFile())inspected.push(full);
}}
for(const {dir} of dirs)collect(dir);
const secrets=[];
const scanner=[
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 /"private_key"\s*:\s*"-----BEGIN/,
 /"refresh_token"\s*:\s*"[^"]{18,}"/,
 /"client_secret"\s*:\s*"[^"]{18,}"/,
 /"proofHash"\s*:\s*"[a-f0-9]{64}"/,
 /"secret"\s*:\s*"[a-f0-9]{64}"/
];
for(const file of inspected){const raw=readFileSync(file);
 if(raw.length>3e7)continue;
 if(scanner.some(rx=>rx.test(raw.toString('utf8'))))secrets.push(relative(root,file));
}
assert('NO_PRIVATE_KEYS_TOKENS_OR_LEASE_SECRET_PATTERNS',secrets.length===0,{scannedFiles:inspected.length,suspectFiles:secrets});
const report={schema:'frv.rehearsal-package.v1',sourceSha:expectedSha,
  artifactManifestSha256:digest(read('release-manifest.json')),fullRulesSha256:ruleHash,
  findings,verdict:'REHEARSAL_PACKAGE_PASS_PRODUCTION_UNVERIFIED'};
const path='parent-commit-service/evidence/frv-package-audit.json';
writeFileSync(path,JSON.stringify(report,null,2)+'\n');
console.log('FRV_ARTIFACT_RELEASE_REHEARSAL_PASS '+JSON.stringify({
 sourceSha:expectedSha,archiveCount:wanted.length,checks:findings.length,
 manifestSha256:report.artifactManifestSha256,fullRulesSha256:ruleHash,
 productionApproved:false,scannedFiles:inspected.length}));
