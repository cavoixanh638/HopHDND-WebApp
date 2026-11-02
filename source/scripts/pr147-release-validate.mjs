#!/usr/bin/env node
/**
 * PR147 frozen-candidate release preflight. OFFLINE ONLY.
 * Does not execute firebase, open a network connection, read real RTDB,
 * generate privileged credentials, deploy, or publish.
 *
 * Examples from source/:
 *   GCLOUD_PROJECT=demo-hdnd ... node scripts/pr147-release-validate.mjs --mode rehearsal --config firebase.release.json
 *   node scripts/pr147-release-validate.mjs --mode production --config /PRIVATE/APPROVED/firebase.release.json --approval /PRIVATE/APPROVED/approval.json
 */
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const fail=(reason)=>{throw Error('PR147_RELEASE_HOLD '+reason)};
const args=process.argv.slice(2);
const get=(name)=>{const i=args.indexOf(name);return i<0?null:args[i+1]??null};
const mode=get('--mode'),configPath=get('--config'),approvalPath=get('--approval');
const allowed=mode==='rehearsal'||mode==='production';
const needed=(value,label)=>{if(typeof value!=='string'||!value.trim()||value.includes('REQUIRED_UNVERIFIED'))fail(label+'_REQUIRED_UNVERIFIED');return value.trim()};
const json=(path)=>JSON.parse(readFileSync(resolve(path),'utf8'));
const content=(path)=>readFileSync(resolve(path),'utf8');
const env=(key)=>needed(process.env[key],key);
const endpoint=(value,protocol,label)=>{
  const url=new URL(needed(value,label));
  if(url.protocol!==protocol||url.username||url.password||url.hash||url.search)fail(label+'_UNSAFE_URL');
  return url;
};
const source=text=>{const x=text.match(/projectId:\s*'([^']+)'/),y=text.match(/databaseURL:\s*'([^']+)'/);if(!x||!y)fail('WEB_CONFIG_MISSING');return {project:x[1],database:y[1]};};
const lockedSha=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
try{
  if(!allowed||!configPath||args.length!==(mode==='production'?6:4)||
    args.filter(x=>x==='--config').length!==1)fail('USAGE_MODE_CONFIG_AND_APPROVAL');
  if(mode==='production'&&!approvalPath)fail('APPROVAL_REQUIRED');
  if(mode==='rehearsal'&&approvalPath)fail('REHEARSAL_CANNOT_USE_APPROVAL');
  const file=json(configPath),defaultCfg=json('firebase.json');
  const rulesFile='firebase/database.exclusive-candidate.rules.json';
  if(file?.database?.rules!==rulesFile||!existsSync(rulesFile))fail('WRONG_FULL_RULES');
  if(defaultCfg?.database?.rules!=='firebase/REQUIRED_UNVERIFIED_NO_DEFAULT_DEPLOY_DO_NOT_CREATE.rules.json'||existsSync(defaultCfg.database.rules)||defaultCfg.functions||defaultCfg.hosting)fail('DEFAULT_FIREBASE_DEPLOY_NOT_FAIL_CLOSED');
  const services=file.functions;
  const want={'pr142-cell-edit':['cell-edit-service','nodejs22'],
    'parent-v2':['parent-commit-service','nodejs22']};
  if(!Array.isArray(services)||services.length!==2)fail('MISSING_TWO_FUNCTIONS');
  for(const item of services){
    const spec=want[item?.codebase];
    if(!spec||item.source!==spec[0]||item.runtime!==spec[1])fail('WRONG_FUNCTION_RUNTIME_CODEBASE');
    const packageJson=json(item.source+'/package.json');
    if(packageJson.engines?.node!=='22')fail('FUNCTION_NODE_ENGINE_NOT_22');
    delete want[item.codebase];
  }
  if(Object.keys(want).length)fail('MISSING_FUNCTION_CODEBASE');
  // A release config is deliberately NOT allowed to publish hosting with the
  // two backend services; web promotion has its own final authorization.
  if(file.hosting!==undefined||file.firebaserc!==undefined)fail('HOSTING_BUNDLED_WITH_BACKEND');
  const rules=json(rulesFile)?.rules;
  if(rules?.['.write']!==false||
    !String(rules.hdnd?.datasetV2?.['.write']).includes('parentCasService')||
    !String(rules.hdnd?.datasetV2?.permissions?.$generation?.['.write']).includes("active/generationId').val() === $generation")||
    !String(rules.hdnd?.datasetV2?.leases?.$generation?.$id?.$field?.['.write']).includes('cellService'))
    fail('FULL_RULES_SECURITY_GUARD_MISSING');
  const cell=content('cell-edit-service/index.js'),parent=content('parent-commit-service/index.mjs'),parentApi=content('src/data/parent-commit-api.ts'),cellApi=content('src/data/cell-edit-api.ts');
  if(!cell.includes("region:'asia-southeast1'")||!cellApi.includes("'asia-southeast1'"))fail('CELL_REGION_MISMATCH');
  if(!parent.includes("region:'us-central1'")||!parentApi.includes('VITE_PARENT_COMMIT_ENDPOINT'))fail('PARENT_REGION_ENDPOINT_MISMATCH');
  const web=source(content('src/data/firebase-config.ts'));
  const project=env('GCLOUD_PROJECT');
  const parentDb=endpoint(env('PARENT_DATABASE_URL'),'https:','PARENT_DATABASE_URL');
  const cellDb=endpoint(env('FIREBASE_DATABASE_URL'),'https:','FIREBASE_DATABASE_URL');
  if(parentDb.href!==cellDb.href)fail('FUNCTION_DATABASE_BINDING_MISMATCH');
  const origin=endpoint(env('VITE_PARENT_COMMIT_ENDPOINT'),
    mode==='production'?'https:':'http:','VITE_PARENT_COMMIT_ENDPOINT');
  if(process.env.VITE_PARENT_REPLACEMENT_ENABLED!=='true')fail('VITE_PARENT_REPLACEMENT_FLAG_REQUIRED');
  const allowedOrigins=env('PARENT_ALLOWED_ORIGINS').split(',').map(x=>x.trim());
  if(allowedOrigins.some(x=>!x||x==='*'||endpoint(x,mode==='production'?'https:':'http:','PARENT_ALLOWED_ORIGINS').origin!==x))
    fail('BAD_CORS_ORIGINS');
  if(!process.env.PARENT_COMMIT_ENABLED||!['true','false'].includes(process.env.PARENT_COMMIT_ENABLED))
    fail('PARENT_COMMIT_ENABLED_MISSING');
  const pg=content('../.github/workflows/publish-pages.yml');
  if(!pg.includes('branches: [main]')||!pg.includes('git push origin HEAD:main')||!pg.includes('HOPHDND_PAGES_APPROVED_MAIN_SHA')||!pg.includes('HOPHDND_RELEASE_BACKENDS_CONFIRMED'))fail('UNREVIEWED_PAGES_AUTOPUBLISH');
  if(mode==='rehearsal'){
    if(project!=='demo-hdnd'||parentDb.href!=='https://demo-hdnd.firebaseio.com/'||
       !allowedOrigins.every(x=>x.startsWith('http://127.0.0.1:'))||
       origin.href!=='http://127.0.0.1:5001/demo-hdnd/us-central1/parentDatasetCommit'||
       file.database.instance!=='REQUIRED_UNVERIFIED')
      fail('NOT_EXACT_LOCAL_EMULATOR_REHEARSAL');
  }else{
    const approval=json(approvalPath);
    const target=needed(file.database.instance,'DATABASE_INSTANCE');
    if(project!==web.project||parentDb.href!==new URL(web.database).href||
       cellDb.href!==new URL(web.database).href)
      fail('LIVE_PROJECT_DATABASE_MISMATCH_WITH_FROZEN_WEB');
    if(approval.sourceSha!==lockedSha()||approval.project!==project||
       approval.databaseInstance!==target||approval.databaseUrl!==web.database||
       approval.parentEndpoint!==origin.href||
       !allowedOrigins.includes(approval.webOrigin))
      fail('APPROVED_TARGET_INCONSISTENT');
    const must=['operatorIdentityVerified','databaseInstanceVerified','liveRulesReviewed',
      'fullRulesIndependentlyApproved','functionIamReviewed','webAuthorizedDomainVerified',
      'functionPackagesLocked','freshBackupAndRestoreVerified','maintenanceWindowApproved',
      'pagesPublishSuppressed','rolloutRollbackApproved'];
    if(must.some(key=>approval[key]!==true))fail('EXTERNAL_RELEASE_GATES_UNVERIFIED');
    if(process.env.PARENT_COMMIT_ENABLED==='true'&&approval.enableParentApproved!==true)
      fail('PARENT_BACKEND_ENABLE_NOT_AUTHORIZED');
    if(origin.pathname!=='/'+project+'/us-central1/parentDatasetCommit'&&
       !approval.nonstandardEndpointReviewed)fail('NONSTANDARD_PARENT_ENDPOINT_NOT_REVIEWED');
  }
  const digest=createHash('sha256').update(content(rulesFile)).digest('hex');
  console.log('PR147_RELEASE_CONFIG_OFFLINE_PASS mode='+mode+' sha='+lockedSha());
  console.log('FULL_RULES_SHA256='+digest);
  console.log('CODEBASES=pr142-cell-edit:nodejs22,parent-v2:nodejs22');
  console.log('HOSTING_RELEASE=SEPARATE_WEB_LAST');
  console.log('PRODUCTION_DEPLOY_PERFORMED=false');
  console.log('NOTE=Offline validation does not prove live IAM/published Rules/data.');
}catch(error){
  console.error(error instanceof Error?error.message:'PR147_RELEASE_HOLD');
  process.exitCode=2;
}
