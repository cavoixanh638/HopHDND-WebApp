/** PR147 one-time operator CLI. Production-capable only with explicit, independently approved input.
 * No Admin SDK/service-account bypass: Firebase Web Google Auth + existing CAS API.
 * The launcher bundles this TypeScript with the app's pinned esbuild toolchain.
 */
import {readFileSync,lstatSync,writeFileSync} from 'node:fs';
import {resolve,isAbsolute} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {initializeApp,deleteApp} from 'firebase/app';
import {connectAuthEmulator,getAuth,getIdTokenResult,GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {connectDatabaseEmulator,getDatabase,get,ref} from 'firebase/database';
import {parseBusinessExcel} from '../src/data/business-excel';
import {bootstrapApprovedRowsToPrimary} from '../src/data/firebase-primary-bootstrap';
import {firebaseAdmin} from '../src/data/firebase-repository';
import {firebaseConfig,FIREBASE_ADMIN_EMAIL} from '../src/data/firebase-config';
const fail=(reason:string):never=>{throw Error('PR147_BOOTSTRAP_HOLD_'+reason);};
const sha=(data:Uint8Array|string)=>createHash('sha256').update(data).digest('hex');
const args=process.argv.slice(2),opts:Record<string,string>={};
const known=new Set(['--mode','--project','--database-url','--api-key','--auth-domain','--app-id',
 '--xlsx','--sheet','--approval-file','--source-sha','--confirm','--output']);
function option(name:string){const value=opts[name];if(!value||value.includes('REQUIRED_UNVERIFIED'))fail(name.replace(/^--/,'').replace(/-/g,'_').toUpperCase()+'_REQUIRED');return value;}
function localFile(path:string,label:string,max:number){
 if(!isAbsolute(path))fail(label+'_ABSOLUTE_PATH_REQUIRED');
 const s=lstatSync(path);
 if(!s.isFile()||s.isSymbolicLink()||s.size<1||s.size>max)fail(label+'_FILE_INVALID');
 return readFileSync(path);
}
let app:any;
try{
 for(let i=0;i<args.length;i+=2){
   const key=args[i],val=args[i+1];
   if(!known.has(key)||!val||val.startsWith('--')||key in opts)fail('UNKNOWN_OR_DUPLICATE_CLI_OPTION');
   opts[key]=val;
 }
 const mode=option('--mode'),project=option('--project');
 if(!['emulator','production'].includes(mode))fail('MODE_MUST_BE_EMULATOR_OR_PRODUCTION');
 const databaseURL=option('--database-url'),sourceSha=option('--source-sha');
 const git=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(!/^[a-f0-9]{40}$/.test(git)||sourceSha!==git)fail('FROZEN_CHECKOUT_SHA_MISMATCH');
 if(!/^https:\/\/[a-zA-Z0-9.-]+\/?$/.test(databaseURL))fail('DATABASE_URL_MUST_BE_EXACT_HTTPS');
 const url=new URL(databaseURL);
 if(url.search||url.hash||url.username||url.password)fail('DATABASE_URL_UNSAFE');
 const workbookBytes=localFile(option('--xlsx'),'APPROVED_WORKBOOK',5*1024*1024);
 const workbookSha=sha(workbookBytes),sheet=option('--sheet');
 const parsed=parseBusinessExcel(workbookBytes,sheet);
 if(parsed.count<1||parsed.count>1000)fail('APPROVED_SOURCE_ROW_COUNT_INVALID');
 const approval=JSON.parse(localFile(option('--approval-file'),'OPERATOR_APPROVAL',16*1024).toString('utf8'));
 if(approval.schema!=='PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1'||
    approval.project!==project||approval.databaseURL!==url.href||
    approval.sourceSha!==git||approval.workbookSha256!==workbookSha||
    approval.sheet!==sheet||approval.expectedRows!==parsed.count||
    approval.expectedState!=='EMPTY_ROOT_CONFIRMED_IN_SNAPSHOT'||
    !/^[a-f0-9]{64}$/.test(approval.fullRootSnapshotSha256??'')||
    approval.operatorEmail!==FIREBASE_ADMIN_EMAIL||
    approval.approved!==true)fail('APPROVAL_DOES_NOT_BIND_SOURCE_PROJECT_EMPTY_STATE');
 const confirmed='IMPORT_ONCE_'+project+'_'+workbookSha.slice(0,12);
 if(option('--confirm')!==confirmed)fail('EXPLICIT_IMPORT_ONCE_CONFIRMATION_REQUIRED');
 const output=opts['--output'];
 if(output&&(!isAbsolute(output)||mode==='production'&&resolve(output).startsWith(resolve(process.cwd())+'/')))
   fail('PRIVATE_OUTPUT_ABSOLUTE_OUTSIDE_REPO_REQUIRED');
 if(mode==='emulator'){
   if(project!=='demo-hdnd'||url.href!=='https://demo-hdnd.firebaseio.com/'||
      process.env.GCLOUD_PROJECT!=='demo-hdnd'||
      process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
      process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
      !process.env.FIREBASE_EMULATOR_HUB)
     fail('EMULATOR_REQUIRES_EXACT_DISPOSABLE_DEMO_HOSTS');
   if(option('--api-key')!=='demo-key'||option('--auth-domain')!=='demo-hdnd.firebaseapp.com')
     fail('EMULATOR_IDENTITY_CONFIG_MISMATCH');
 }else{
   if(process.env.FIREBASE_AUTH_EMULATOR_HOST||process.env.FIREBASE_DATABASE_EMULATOR_HOST||
      process.env.GCLOUD_PROJECT!==project||
      process.env.PR147_OPERATOR_FIRST_IMPORT_APPROVED!=='YES')
     fail('PRODUCTION_EXTERNAL_APPROVAL_OR_CONTEXT_MISSING');
   if(project!==firebaseConfig.projectId||url.href!==new URL(firebaseConfig.databaseURL).href||
      option('--api-key')!==firebaseConfig.apiKey||
      option('--auth-domain')!==firebaseConfig.authDomain||
      option('--app-id')!==firebaseConfig.appId)
     fail('PRODUCTION_WEB_PROJECT_DATABASE_BINDING_UNVERIFIED');
   const required=['independentRulesApproved','publishedRulesHashReadbackVerified',
    'bothFunctionsAndIamVerified','liveFreshBackupRestoreVerified',
    'ownerSourceAndHistoryPolicyApproved','maintenanceWindowApproved',
    'operatorAuthorizedForThisExactImport'];
   if(required.some(k=>approval[k]!==true))fail('INDEPENDENT_PRODUCTION_GATES_REQUIRED');
   const checkpoint=Date.parse(approval.fullRootSnapshotReadAt??'');
   if(!Number.isFinite(checkpoint)||checkpoint>Date.now()||
      Date.now()-checkpoint>15*60*1000)fail('FRESH_EMPTY_ROOT_CHECKPOINT_REQUIRED');
 }
 // Only NOW read one-time identity from stdin. Never accept/log credentials
 // in argv, saved files, packages, stdout or the result manifest.
 const googleToken=readFileSync(0,'utf8').trim();
 if(!googleToken||googleToken.length>16384)fail('GOOGLE_ID_TOKEN_STDIN_REQUIRED');
 if(mode==='production'&&!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(googleToken))
   fail('PRODUCTION_GOOGLE_OAUTH_ID_TOKEN_INVALID');
 if(mode==='emulator'&&!googleToken.startsWith('{'))
   fail('EMULATOR_TEST_CREDENTIAL_JSON_REQUIRED');
 const options={apiKey:option('--api-key'),authDomain:option('--auth-domain'),projectId:project,
  databaseURL:url.href,appId:option('--app-id')};
 app=initializeApp(options,'pr147-first-import-'+process.pid);
 const auth=getAuth(app);
 if(mode==='emulator')connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const credential=GoogleAuthProvider.credential(googleToken);
 const user=(await signInWithCredential(auth,credential)).user;
 const result=await getIdTokenResult(user,true);
 if(!firebaseAdmin(user)||user.email!==FIREBASE_ADMIN_EMAIL||
   result.signInProvider!=='google.com'||result.claims.email_verified!==true)
   fail('VERIFIED_GOOGLE_ADMIN_REQUIRED');
 const db=getDatabase(app);
 if(mode==='emulator')connectDatabaseEmulator(db,'127.0.0.1',9000);
 // Raw /hdnd is intentionally unreadable under FULL Rules. Inspect every
 // independently readable relevant branch; operator's separate signed
 // full-root checkpoint is mandatory for proof of TRULY empty database.
 const paths=['hdnd/items','hdnd/datasetV2','hdnd/permissions','hdnd/editLocks',
  'hdnd/control','hdnd/freezeControl'];
 const values=await Promise.all(paths.map(async p=>(await get(ref(db,p))).val()));
 if(values.some(x=>x!==null))fail('LIVE_TARGET_NOT_TRULY_EMPTY');
 const imported=await bootstrapApprovedRowsToPrimary(db,user,parsed.items);
 if(imported.importedCount!==parsed.count)fail('CAS_IMPORTED_ROW_COUNT_MISMATCH');
 const snapshot=(await get(ref(db,'hdnd/items'))).val();
 if(!snapshot||Object.keys(snapshot).length!==parsed.count)fail('POST_CAS_READBACK_MISMATCH');
 for(const row of parsed.items){
   const actual=snapshot[row.recordId];
   if(!actual||actual.recordId!==row.recordId||actual.displayCode!==row.displayCode||
      actual.stt!==row.stt||actual.revision!==1||
      actual.updatedBy!==user.uid||!Number.isFinite(actual.updatedAt))
     fail('SERVER_READBACK_PROVENANCE_MISMATCH');
 }
 const report={schema:'PR147_OPERATOR_FIRST_IMPORT_RESULT_V1',mode,sourceSha:git,
  project,databaseURL:url.href,operation:'EMPTY_LEGACY_ITEMS_CAS_ONCE',
  workbookSha256:workbookSha,approvedSheet:sheet,rowCount:parsed.count,
  uid:user.uid,serverReadbackSha256:sha(JSON.stringify(snapshot)),
  imported:imported.importedCount,verifiedAdmin:true,readbackVerified:true,
  legacyRootOverwrite:false,usingAdminServiceBypass:false,
  productionAuthorizedByThisCLI:false};
 if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log('PR147_OPERATOR_FIRST_IMPORT_CAS_READBACK_PASS '+JSON.stringify(report));
}catch(error){
 // Never echo credential values or raw Firebase request payloads.
 console.error(error instanceof Error&&error.message.startsWith('PR147_BOOTSTRAP_HOLD_')
  ?error.message:'PR147_BOOTSTRAP_HOLD_AUTH_CAS_OR_SOURCE_ERROR');
 process.exitCode=2;
}finally{
 if(app)await deleteApp(app).catch(()=>{});
}
// All client requests and authoritative CAS/readback have completed above.
// Firebase Auth/RTDB networking can retain active connection handles after
// deleteApp on Node. This is a single-purpose CLI, not a persistent server.
process.exit(process.exitCode??0);
