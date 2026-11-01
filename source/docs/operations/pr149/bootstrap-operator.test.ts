/** PR149 distinct operator bootstrap: approved workbook -> existing protected
 * bootstrapApprovedRowsToPrimary API, NO privileged seeding and no production.
 */
import {it,expect} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {resolve,isAbsolute} from 'node:path';
import {initializeApp,deleteApp} from 'firebase/app';
import {getAuth,connectAuthEmulator,GoogleAuthProvider,signInWithCredential} from 'firebase/auth';
import {getDatabase,connectDatabaseEmulator,get,ref} from 'firebase/database';
import {parseBusinessExcel} from '../../../src/data/business-excel';
import {bootstrapApprovedRowsToPrimary} from '../../../src/data/firebase-primary-bootstrap';
import {sha} from './offline-audit-core.mjs';

it('operator wrapper: genuine Auth Emulator verified admin imports A-O exactly once through existing CAS API',async()=>{
 const file=process.env.PR149_BOOTSTRAP_XLSX,sheet=process.env.PR149_BOOTSTRAP_SHEET;
 if(process.env.FIREBASE_AUTH_EMULATOR_HOST!=='127.0.0.1:9099'||
    process.env.FIREBASE_DATABASE_EMULATOR_HOST!=='127.0.0.1:9000'||
    process.env.GCLOUD_PROJECT!=='demo-hdnd'||!process.env.FIREBASE_EMULATOR_HUB||
    !file||!isAbsolute(file)||!sheet)
  throw Error('PR149_OPERATOR_BOOTSTRAP_EMULATOR_ONLY_REQUIRES_ABSOLUTE_XLSX');
 const source=readFileSync(resolve(file));
 const approved=parseBusinessExcel(source,sheet);
 expect(approved.count).toBeGreaterThan(0);
 const app=initializeApp({apiKey:'demo-key',projectId:'demo-hdnd',
  authDomain:'demo-hdnd.firebaseapp.com',databaseURL:'https://demo-hdnd.firebaseio.com',
  appId:'operator-bootstrap-demo'},'pr149-operator-'+randomUUID());
 try{
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const admin=(await signInWithCredential(auth,GoogleAuthProvider.credential(JSON.stringify({
    sub:'pr149-bootstrap-test-admin',email:'cavoixanh638@gmail.com',
    email_verified:true,name:'synthetic operator only'})))).user;
  const db=getDatabase(app);connectDatabaseEmulator(db,'127.0.0.1',9000);
  const before=(await get(ref(db,'hdnd/items'))).val();
  expect(before).toBe(null);
  const applied=await bootstrapApprovedRowsToPrimary(db,admin,approved.items);
  expect(applied.importedCount).toBe(approved.count);
  const readback=(await get(ref(db,'hdnd/items'))).val();
  expect(Object.keys(readback)).toHaveLength(approved.count);
  for(const row of approved.items){
    const actual=readback[row.recordId];
    expect(actual).toMatchObject({recordId:row.recordId,displayCode:row.displayCode,
      content:row.content,note:row.note,revision:1});
  }
  const raw=sha(readback);
  await expect(bootstrapApprovedRowsToPrimary(db,admin,approved.items)).rejects.toThrow();
  const after=(await get(ref(db,'hdnd/items'))).val();
  expect(sha(after)).toBe(raw);
  const out={result:'PASS_OPERATOR_PROTECTED_EMPTY_CAS',sourceSha:
    process.env.PR149_SOURCE_SHA??'UNKNOWN',project:'demo-hdnd',
    workbookSha256:sha(Buffer.from(source)),readbackSha256:raw,rows:approved.count,
    duplicateImportDenied:true,sourceFileOnlyLocal:true,
    noRulesBypass:true,usedImplementation:'src/data/firebase-primary-bootstrap.ts',
    productionWrites:0,standaloneOutsideExistingFixture:true};
  mkdirSync('pr149-ops-evidence',{recursive:true});
  writeFileSync('pr149-ops-evidence/operator-bootstrap-demo.json',JSON.stringify(out,null,2)+'\n');
  console.log('PR149_OPERATOR_BOOTSTRAP_EMULATOR_PASS',JSON.stringify(out));
 }finally{await deleteApp(app);}
});
