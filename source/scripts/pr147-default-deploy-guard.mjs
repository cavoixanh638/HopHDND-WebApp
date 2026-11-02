#!/usr/bin/env node
/** Local-only, mandatory guard. NEVER runs firebase deploy or contacts a project. */
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
const hold=reason=>{throw Error('PR147_DEFAULT_FIREBASE_DEPLOY_HOLD '+reason)};
try{
 const current=JSON.parse(readFileSync(resolve('firebase.json'),'utf8'));
 const expected='firebase/REQUIRED_UNVERIFIED_NO_DEFAULT_DEPLOY_DO_NOT_CREATE.rules.json';
 if(current?.database?.rules!==expected)hold('DEFAULT_MUST_POINT_TO_INTENTIONALLY_MISSING_RULES');
 if(existsSync(resolve(expected)))hold('DANGER_MISSING_RULES_SENTINEL_FILE_NOW_EXISTS');
 if('functions' in current||'hosting' in current||'storage' in current||'firestore' in current)
   hold('DEFAULT_MUST_NOT_BUNDLE_ANY_DEPLOYABLE_COMPONENT');
 const release=JSON.parse(readFileSync(resolve('firebase.release.json'),'utf8'));
 if(release.database?.rules!=='firebase/database.exclusive-candidate.rules.json')
   hold('APPROVED_TEMPLATE_MUST_USE_FULL_RULES');
 if(release.database?.instance!=='REQUIRED_UNVERIFIED')
   hold('UNAPPROVED_INSTANCE_IN_TRACKED_RELEASE_TEMPLATE');
 const services=release.functions??[];
 const expectedServices=[['pr142-cell-edit','cell-edit-service'],['parent-v2','parent-commit-service']];
 if(services.length!==2||expectedServices.some(([codebase,source])=>
   !services.some(service=>service.codebase===codebase&&service.source===source&&service.runtime==='nodejs22')))
   hold('MISSING_PRODUCTION_FUNCTIONS_IN_EXPLICIT_TEMPLATE');
 for(const [,source] of expectedServices){
   const p=JSON.parse(readFileSync(resolve(source,'package.json'),'utf8'));
   if(p.engines?.node!=='22'||!existsSync(resolve(source,'package-lock.json')))
     hold('UNPINNED_FUNCTION_GRAPH_'+source);
 }
 console.log('PR147_DEFAULT_DEPLOY_FAIL_CLOSED_PASS',JSON.stringify({
  defaultConfig:'firebase.json',
  outcome:'MISSING_RULES_FILE_PREVENTS_UNQUALIFIED_DATABASE_DEPLOY',
  intentionallyMissingRules:expected,
  defaultFunctions:0,defaultHosting:false,
  explicitProductionConfig:'firebase.release.json',
  explicitConfigProductionInstanceVerified:false,
  liveNetworkCalls:0,deployCommandsExecuted:0
 }));
}catch(error){
 console.error(error instanceof Error?error.message:'PR147_DEFAULT_FIREBASE_DEPLOY_HOLD');
 process.exitCode=2;
}
