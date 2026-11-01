/**
 * FINAL-DATA-REVIEW: separate PR146 checkout. All edits are generated test
 * copies in the CI workspace. Backend/runtime files and candidate untouched.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const source='parent-commit-service/test/integration.test.ts';
const output='parent-commit-service/test/final-data-review.generated.test.ts';
let text=readFileSync(source,'utf8');
const testSource=String.raw`
it('FINAL-DATA-REVIEW: forged admin-writable backup must not activate an unapproved restore',async()=>{
  // Test fixture seeds a real active generation, then the ordinary verified
  // admin CLIENT stages a new "backup" at the allowed RTDB backups child.
  // No owner REST PUT is used to forge or commit the payload.
  const now=Date.now(),oldOp='review_existing_0001',restoreOp='review_restore_forged_0002';
  const oldGen='gen_'+oldOp,fakeBackup='review_unapproved_backup_0001';
  await seeded({hdnd:{freezeControl:{
    mode:'OPEN',revision:1,epoch:1,actor:admin.uid,changedAt:now-1000,deadline:0,closedAt:0
  },datasetV2:{
    active:{generationId:oldGen,operationId:oldOp,revision:1,rowCount:1,digest:'a'.repeat(64)},
    generations:{[oldGen]:{items:{r1:{...row('LEGITIMATE ACTIVE'),
      operationId:oldOp,updatedAt:1,updatedBy:admin.uid}}}},
    operations:{[oldOp]:{status:'COMMITTED',from:'legacy',to:oldGen,at:now-1000}}
  }}});
  const business=row('UNAPPROVED INJECTED RESTORE');
  const previous={generationId:'gen_never_approved_0000',
    operationId:'never_approved_0000',revision:4,rowCount:1,digest:'f'.repeat(64)};
  const perms={columns:{note:true}};
  const fake={previous,generation:{items:{r1:business}},
    permissionsJson:JSON.stringify(perms),leasesJson:'null',
    baseline:stable({active:previous,items:{r1:business},permissions:perms,leases:null})};
  // Actual Rules-authorized signed-in browser write: backup path is immutable
  // but the *first* value is client-authored, with no sealed stage approval.
  const w=await runTransaction(ref(db,ROOT+'/backups/'+fakeBackup),
    current=>current===null?JSON.stringify(fake):undefined,{applyLocally:false});
  expect(w.committed,'Authenticated admin must be able to stage first write').toBe(true);
  const before=await witness();
  const request={action:'restore',operationId:restoreOp,
    backupOperationId:fakeBackup,expected:before.datasetV2.active,
    confirmation:'KHOI PHUC '+restoreOp};
  const response=await post(admin,request);
  const after=await witness();
  const committed=after.datasetV2?.active?.generationId==='gen_'+restoreOp;
  const restored=after.datasetV2?.generations?.['gen_'+restoreOp]?.items?.r1;
  const actualDigest=after.datasetV2?.active?.digest;
  // The digest of row business data is computed independently; the fake
  // previous.digest deliberately has no relationship to this row.
  const verifiedBusinessDigest=(await import('../src/manifest.mjs'))
    .validateManifest({r1:business},restoreOp).digest;
  const inconsistent=committed&&actualDigest!==verifiedBusinessDigest&&
    restored?.note==='UNAPPROVED INJECTED RESTORE';
  const event={requestResult:response,expected:'Reject arbitrary/nonexistent source backup, unchanged active/rows',
    observed:committed?'COMMITTED forged content':'DENIED',
    restoredNote:restored?.note,digestFromPointer:actualDigest,
    independentlyComputedDigest:verifiedBusinessDigest,
    digestMismatch:actualDigest!==verifiedBusinessDigest,
    sourceGenerationExists:!!before.datasetV2.generations[previous.generationId],
    beforeActive:before.datasetV2.active,afterActive:after.datasetV2.active,
    serverChanged:stable(before)!==stable(after),
    finding:inconsistent?'REPRODUCED_UNAPPROVED_RESTORE':'NOT_REPRODUCED'};
  log('FINAL_DATA_REVIEW_forged_backup_restore',before,after,event,
      'real Google Auth Emulator admin -> normal browser Rules write at backups/$op -> real authenticated parent endpoint -> scoped Admin Rules parent transaction');
  console.log('FINAL_DATA_REVIEW_FORGED_BACKUP '+JSON.stringify(event));
  expect(inconsistent,'Test expected to reproduce forgery; inspect server witness if fixed').toBe(true);
  expect(after.datasetV2.generations[oldGen]).toEqual(before.datasetV2.generations[oldGen]);
  expect(after.datasetV2.leases?.['gen_'+restoreOp]).toBeUndefined();
});
`;
if(!text.includes("it('lost API completion")||!text.includes("afterAll(async()=>")){
  throw Error('PR146 expected reviewed test structure changed; fail closed');
}
text=text+"\n"+testSource;
writeFileSync(output,text);
const sourceRunner='parent-commit-service/test/run.mjs';
const runnerOutput='parent-commit-service/test/final-data-review-run.generated.mjs';
let runner=readFileSync(sourceRunner,'utf8');
const target="prefix+'/test/integration.test.ts'";
if(runner.split(target).length!==2)throw Error('Runner path unexpectedly changed');
runner=runner.replace(target,"prefix+'/test/final-data-review.generated.test.ts'");
writeFileSync(runnerOutput,runner);
console.log('FINAL_DATA_REVIEW_PARENT_HARNESS_READY generated copy only');
