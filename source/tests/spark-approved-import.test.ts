import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';
import {it,expect} from 'vitest';
import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref,set,goOffline} from 'firebase/database';
import {parseBusinessExcel} from '../src/data/business-excel';
import {bootstrapApprovedRowsToPrimary} from '../src/data/firebase-primary-bootstrap';
import {signInAsEmulatorGoogleAdmin} from '../src/state/firebase-emulator-admin-auth';
import {EDITABLE_FIELDS} from '../src/domain/items';
const enabled=!!process.env.SPARK_APPROVED_XLSX;
const sha=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const stable=(x:any):string=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
it.skipIf(!enabled)('imports the approved 59 records into a restored private snapshot and preserves every other branch',async()=>{
 if(process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099')throw Error('Local Auth+RTDB only');
 const folder=process.env.SPARK_PRIVATE_CHECKPOINT!;
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8'));
 const raw=fs.readFileSync(path.join(folder,'rtdb.before.json'));
 expect(sha(raw)).toBe(manifest.rtdbSha256);
 const before=JSON.parse(raw.toString('utf8'));
 expect(before.hdnd?.items??null).toBeNull();
 const bytes=fs.readFileSync(process.env.SPARK_APPROVED_XLSX!);
 const parsed=parseBusinessExcel(bytes,'Du lieu nhap');
 expect(parsed.count).toBe(59);
 const rules=fs.readFileSync('firebase/database.spark.rules.json','utf8');
 const env=await initializeTestEnvironment({projectId:'demo-hdnd',database:{host:'127.0.0.1',port:9000,rules}});
 const app=initializeApp({apiKey:'demo-key',authDomain:'demo-hdnd.firebaseapp.com',projectId:'demo-hdnd',databaseURL:'https://demo-hdnd.firebaseio.com',appId:'approved-import'},'spark-approved-import');
 const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
 const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
 const witness=async()=>{
   const r=await fetch('http://127.0.0.1:9000/.json?ns=demo-hdnd',{headers:{Authorization:'Bearer owner'}});
   if(!r.ok)throw Error('Local witness read failed');return r.json();
 };
 try{
   await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),before));
   const user=await signInAsEmulatorGoogleAdmin(auth);
   const result=await bootstrapApprovedRowsToPrimary(db,user,parsed.items);
   expect(result.importedCount).toBe(59);
   const after=await witness();
   for(const row of parsed.items){
     const actual=after.hdnd.items[row.recordId];
     for(const field of ['recordId','displayCode','stt',...EDITABLE_FIELDS])expect(actual[field],field).toEqual(row[field as keyof typeof row]);
   }
   const rest=structuredClone(after);delete rest.hdnd.items;
   expect(stable(rest)).toBe(stable(before));
   const baseline=sha(stable(after));
   await expect(bootstrapApprovedRowsToPrimary(db,user,parsed.items)).rejects.toThrow();
   expect(sha(stable(await witness()))).toBe(baseline);
   // Exercise the guarded executable against the real nonempty snapshot too.
   // This approval is explicitly demo-only and cannot authorize production.
   await env.withSecurityRulesDisabled(async ctx=>set(ref(ctx.database()),before));
   const sourceSha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
   const prefix=path.join(folder,'spark-cli-demo-'+Date.now());
   const approvalFile=prefix+'-approval.json',receiptFile=prefix+'-receipt.json';
   fs.writeFileSync(approvalFile,JSON.stringify({
     schema:'PR147_OPERATOR_FIRST_IMPORT_APPROVAL_V1',project:'demo-hdnd',
     databaseURL:'https://demo-hdnd.firebaseio.com/',sourceSha,
     workbookSha256:sha(bytes),sheet:'Du lieu nhap',expectedRows:59,
     expectedState:'LEGACY_ITEMS_EMPTY_IN_FULL_SNAPSHOT',
     fullRootSnapshotSha256:manifest.rtdbSha256,
     fullRootSnapshotReadAt:new Date().toISOString(),
     operatorEmail:'cavoixanh638@gmail.com',approved:true
   }));
   const cli=spawnSync(process.execPath,['scripts/operator-first-import.mjs',
     '--mode','emulator','--project','demo-hdnd',
     '--database-url','https://demo-hdnd.firebaseio.com',
     '--api-key','demo-key','--auth-domain','demo-hdnd.firebaseapp.com',
     '--app-id','demo-operator','--xlsx',process.env.SPARK_APPROVED_XLSX!,
     '--sheet','Du lieu nhap','--approval-file',approvalFile,
     '--source-sha',sourceSha,'--confirm','IMPORT_ONCE_demo-hdnd_'+sha(bytes).slice(0,12),
     '--output',receiptFile],{cwd:process.cwd(),encoding:'utf8',timeout:45000,
       input:JSON.stringify({sub:'spark-cli-approved-59-admin',email:'cavoixanh638@gmail.com',email_verified:true}),
       env:{...process.env,GCLOUD_PROJECT:'demo-hdnd'}});
   expect(cli.status,cli.stderr).toBe(0);
   expect(JSON.parse(fs.readFileSync(receiptFile,'utf8'))).toMatchObject({imported:59,readbackVerified:true,usingAdminServiceBypass:false});
   const cliAfter=await witness();
   for(const row of parsed.items)for(const field of ['recordId','displayCode','stt',...EDITABLE_FIELDS])
     expect(cliAfter.hdnd.items[row.recordId][field],field).toEqual(row[field as keyof typeof row]);
   const cliRest=structuredClone(cliAfter);delete cliRest.hdnd.items;
   expect(stable(cliRest)).toBe(stable(before));
   const report={status:'PASS_APPROVED_59_IMPORT_LOCAL_ONLY',records:59,businessCellsMatched:885,allOtherBranchesPreserved:true,duplicateDenied:true,guardedCliVerified:true,productionWrites:0,sourceSha256:sha(bytes),snapshotBeforeSha256:manifest.rtdbSha256,snapshotAfterCanonicalSha256:baseline,rulesSha256:sha(rules)};
   fs.writeFileSync(path.join(folder,'spark-approved-import-verdict.json'),JSON.stringify(report,null,2));
   const exported=JSON.stringify(after);
   fs.writeFileSync(path.join(folder,'rtdb.import-rehearsal.json'),exported);
   fs.writeFileSync(path.join(folder,'manifest.import-rehearsal.json'),JSON.stringify({...manifest,projectId:'demo-hdnd',rtdbFile:'rtdb.import-rehearsal.json',rtdbBytes:Buffer.byteLength(exported),rtdbSha256:sha(exported),hdndItemsCount:59,origin:'APPROVED_SOURCE_REHEARSAL_LOCAL_ONLY'},null,2));
   console.log(JSON.stringify(report));
 }finally{goOffline(db);await deleteApp(app);await env.cleanup();}
},45000);
