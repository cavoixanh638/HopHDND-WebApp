/**
 * Reviewer-only read-only offline manifest/package audit.
 * Usage from a detached target/source checkout:
 * node ../../reviewer/source/release-review/audit-release-manifest.mjs ../../release/source/docs/releases/PR147_RELEASE_MANIFEST.json
 * No network access, no Firebase CLI, no production account. Fail gates are
 * reported as structured evidence rather than secretly patched.
 */
import {readFileSync,existsSync,writeFileSync,statSync,readdirSync} from 'node:fs';
import {resolve,dirname,relative,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const cwd=process.cwd(),sha=x=>createHash('sha256').update(x).digest('hex');
const target=String(process.env.FINAL_VERIFY_TARGET_SHA??'');
const manifestFile=resolve(process.argv[2]??'');
if(!existsSync(manifestFile))throw Error('FRV_MANIFEST_FILE_MISSING');
const m=JSON.parse(readFileSync(manifestFile,'utf8'));
const findings=[];
const check=(label,ok,detail='')=>{
 findings.push({label,status:ok?'PASS':'OPEN',detail});
 console.log('FRV_RELEASE_AUDIT '+JSON.stringify(findings.at(-1)));
};
const originalHead=execFileSync('git',['rev-parse','HEAD'],{cwd:resolve(cwd,'..'),encoding:'utf8'}).trim();
check('PINNED_SOURCE_CHECKOUT',/^[a-f0-9]{40}$/.test(target)&&originalHead===target,
 'expected '+target+' actual '+originalHead);
check('MANIFEST_BINDS_SOURCE_SHA',m.source?.releaseSourceSha===target&&m.evidence?.sourceSha===target,
 'manifest SHA '+m.source?.releaseSourceSha+' run SHA '+m.evidence?.sourceSha);
const expected=m.source?.sourceFilesSha256Utf8Raw??{};
const keys=Object.keys(expected);
check('MANIFEST_SOURCE_FILE_LIST',keys.length>=16&&keys.includes('package-lock.json')&&
 keys.includes('firebase/database.exclusive-candidate.rules.json'),
 'count '+keys.length);
let badFiles=[];
for(const [path,digest] of Object.entries(expected)){
 const file=resolve(cwd,path);
 const valid=file.startsWith(cwd+'/')&&existsSync(file)&&statSync(file).isFile();
 if(!valid||sha(readFileSync(file))!==digest)badFiles.push(path);
}
check('SOURCE_FILE_SHA256_MATCH',badFiles.length===0,'mismatched='+JSON.stringify(badFiles));
const fullFile=resolve(cwd,'firebase/database.exclusive-candidate.rules.json');
const full=JSON.parse(readFileSync(fullFile,'utf8'));
const fullSha=sha(readFileSync(fullFile));
check('FULL_RULES_RAW_HASH',m.artifacts?.fullRules?.rawSha256===fullSha,
 'manifest '+m.artifacts?.fullRules?.rawSha256+' observed '+fullSha);
const enforced=full.rules?.hdnd?.datasetV2?.permissions?.['$generation']?.['.write'];
check('FRCR01_HISTORICAL_RIGHTS_BOUND_IN_RULES',
 typeof enforced==='string'&&enforced.includes('active/generationId')&&enforced.includes('$generation'),
 'V2 historical permissions .write active generation fence = '+
 (typeof enforced==='string'&&enforced.includes('active/generationId')));
const v2=full.rules?.hdnd?.datasetV2;
check('PARENT_AND_CELL_RULES_SERVICES',
 v2?.['.write']?.includes('parentCasService')&&
 full.rules?.hdnd?.items?.['$id']?.['.write']?.includes('cellService')&&
 v2?.leases?.['$generation']?.['$id']?.['$field']?.['.write']?.includes('active/generationId'),
 'parent,cell,DR01 generation-write fences');
const app=JSON.parse(readFileSync(resolve(cwd,'package.json'),'utf8'));
const configs={
 default:JSON.parse(readFileSync(resolve(cwd,'firebase.json'),'utf8')),
 stage:JSON.parse(readFileSync(resolve(cwd,'firebase.staging.json'),'utf8'))
};
const functions=configs.stage.functions??[];
const want=new Map([['pr142-cell-edit','cell-edit-service'],['parent-v2','parent-commit-service']]);
check('STAGING_RULES_DUAL_FUNCTIONS',configs.stage.database?.rules==='firebase/database.exclusive-candidate.rules.json'&&
 functions.length===2&&functions.every(x=>x.runtime==='nodejs22'&&want.get(x.codebase)===x.source),
 'staging='+configs.stage.database?.rules+' functions='+functions.map(x=>x.codebase+':'+x.runtime).join(','));
const explicitConfig=m.configuration?.productionDeploymentConfigFile||
 m.configuration?.reviewedReleaseConfigPath||
 m.artifacts?.releaseConfig?.path||
 m.releaseConfigPath;
let releaseCfg=null;
if(typeof explicitConfig==='string'){
 const path=resolve(cwd,explicitConfig.replace(/^source\//,''));
 if(path.startsWith(cwd+'/')&&existsSync(path))releaseCfg=JSON.parse(readFileSync(path,'utf8'));
}
const correctlyBound=releaseCfg?.database?.rules==='firebase/database.exclusive-candidate.rules.json'&&
 Array.isArray(releaseCfg.functions)&&releaseCfg.functions.length===2&&
 releaseCfg.functions.every(x=>want.get(x.codebase)===x.source&&x.runtime==='nodejs22');
const defaultCorrect=configs.default.database?.rules==='firebase/database.exclusive-candidate.rules.json'&&
 Array.isArray(configs.default.functions)&&configs.default.functions.length===2&&
 configs.default.functions.every(x=>want.get(x.codebase)===x.source&&x.runtime==='nodejs22');
check('EXPLICIT_OR_SAFE_DEFAULT_RELEASE_CONFIG',Boolean(correctlyBound||defaultCorrect),
 'defaultRules='+configs.default.database?.rules+
 ' releaseConfig='+String(explicitConfig??'NOT_DECLARED')+
 ' no silent legacy Rules allowed');
check('APP_ROOT_DEPENDENCY_LOCK',existsSync('package-lock.json')&&
 typeof app.dependencies?.firebase==='string'&&!!app.devDependencies?.vite,
 'root npm ci supported');
for(const service of ['cell-edit-service','parent-commit-service']){
 const pack=JSON.parse(readFileSync(resolve(cwd,service,'package.json'),'utf8'));
 const lock=resolve(cwd,service,'package-lock.json');
 check('IMMUTABLE_NODE22_DEPENDENCIES_'+service,
   pack.engines?.node==='22'&&existsSync(lock)&&
   !!m.source?.sourceFilesSha256Utf8Raw?.[service+'/package-lock.json']&&
   sha(readFileSync(lock))===m.source.sourceFilesSha256Utf8Raw[service+'/package-lock.json'],
   'node='+pack.engines?.node+' lock='+existsSync(lock)+
   ' manifestLocked='+Boolean(m.source?.sourceFilesSha256Utf8Raw?.[service+'/package-lock.json']));
}
const deployable=m.artifacts?.cellFunction?.deployableImmutableZip;
const parentBundle=m.artifacts?.parentFunction?.deployableImmutableZip;
check('FUNCTION_DEPLOY_ARTIFACTS_PINNED',![deployable,parentBundle].some(x=>!x||x==='REQUIRED_UNVERIFIED'||x==='NOT_LOCKED_UNVERIFIED'),
 'cell='+String(deployable)+' parent='+String(parentBundle));
const web=m.artifacts?.web;
const webGate=web?.fullV2ParentEnabledWeb??{};
check('WEB_BUNDLE_SOURCE_AND_ENABLEMENT',Boolean(web?.ciArchive?.artifactId)&&
 Boolean(web?.ciArchive?.archiveZipSha256)&&web?.ciArchive?.workflowRunId&&
 webGate.status==='PASS'&&m.source?.releaseSourceSha===target,
 'webArtifact='+String(web?.ciArchive?.artifactId)+
 ' webV2status='+String(webGate.status));
const sourceConfig=readFileSync(resolve(cwd,'src/data/firebase-config.ts'),'utf8');
const expectedDb=(sourceConfig.match(/databaseURL:\s*'([^']+)'/)??[])[1];
const parentApi=readFileSync(resolve(cwd,'src/data/parent-commit-api.ts'),'utf8');
const cellApi=readFileSync(resolve(cwd,'src/data/cell-edit-api.ts'),'utf8');
const cellIndex=readFileSync(resolve(cwd,'cell-edit-service/index.js'),'utf8');
const parentIndex=readFileSync(resolve(cwd,'parent-commit-service/index.mjs'),'utf8');
check('BACKEND_FRONTEND_SERVICE_REGION',
 parentApi.includes('VITE_PARENT_COMMIT_ENDPOINT')&&
 cellApi.includes("getFunctions(database?.app??getApp('hdnd-pages'),'asia-southeast1')")&&
 cellIndex.includes("region:'asia-southeast1'")&&parentIndex.includes("region:'us-central1'"),
 'cell Asia Southeast1 callable, parent us-central1 HTTPS; URL must still be verified externally');
check('RUNTIME_DATABASE_URL_DECLARED',
 Boolean(expectedDb)&&
 m.configuration?.backendRuntime?.PARENT_DATABASE_URL?.status!=='REQUIRED_UNVERIFIED'&&
 m.configuration?.backendRuntime?.FIREBASE_DATABASE_URL_or_FIREBASE_CONFIG_databaseURL?.status!=='REQUIRED_UNVERIFIED',
 'webRTDB='+expectedDb+' backend matching env requires independent deploy evidence');
const forbiddenSecretPatterns=[
 /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
 /"private_key"\s*:\s*"-----BEGIN/,
 /"refresh_token"\s*:\s*"[^"]{18,}"/,
 /"client_secret"\s*:\s*"[^"]{18,}"/
];
const tree=[];
function walk(dir){
 if(!existsSync(dir))return;
 for(const ent of readdirSync(dir,{withFileTypes:true})){
  const abs=join(dir,ent.name);
  if(ent.isDirectory()){if(['node_modules','.git'].includes(ent.name))continue;walk(abs);}
  else if(ent.isFile()&&statSync(abs).size<10_000_000)tree.push(abs);
 }
}
for(const part of ['dist-pages','dist-hosting','cell-edit-service','parent-commit-service'])walk(resolve(cwd,part));
const leaks=tree.filter(file=>forbiddenSecretPatterns.some(re=>re.test(readFileSync(file,'utf8'))))
 .map(file=>relative(cwd,file));
check('ARTIFACT_FILES_NO_CREDENTIAL_PATTERNS',leaks.length===0,
 'examinedFiles='+tree.length+' matchedFiles='+JSON.stringify(leaks));
const report={schema:'frv.release-audit.v1',sourceSha:target,releaseManifestPath:manifestFile,
 releaseManifestSha256:sha(readFileSync(manifestFile)),status:findings.every(x=>x.status==='PASS')?'PASS':'HOLD',
 findings,environment:'isolated reviewer checkout; no production access'};
writeFileSync('parent-commit-service/evidence/final-release-audit.json',JSON.stringify(report,null,2)+'\n');
console.log('FRV_RELEASE_AUDIT_SUMMARY '+JSON.stringify({sourceSha:target,manifestSha256:report.releaseManifestSha256,
 status:report.status,passed:findings.filter(x=>x.status==='PASS').length,open:findings.filter(x=>x.status!=='PASS').map(x=>x.label)}));
