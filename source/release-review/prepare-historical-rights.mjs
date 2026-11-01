/**
 * FINAL-RELEASE-CODE-REVIEW only. Append exactly one targeted test to an
 * isolated, detached checkout of 02964722. Never edit PR147's candidate.
 * The original Auth -> real onRequest -> scoped Admin SDK and FULL Rules
 * are retained by the original integration.test.ts test harness.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const input='parent-commit-service/test/integration.test.ts';
const output='parent-commit-service/test/final-release-review.generated.test.ts';
let source=readFileSync(input,'utf8');
if(!source.includes("it('DR-02 REGRESSION:")||
 !source.includes("const seeded=async(value:any)=>")||
 !source.includes("const PROJECT='demo-hdnd'"))
 throw Error('PINNED_02964722_SOURCE_CHANGED: fail closed');
const extra=String.raw`
it('FINAL-RELEASE-CODE-REVIEW historical admin permissions remain immutable after real parent replacement',async()=>{
 const first='review_hist_activate_0001', second='review_hist_replace_0002';
 const restoreId='review_hist_restore_0003';
 const boot=await bootstrapApprovedRowsToPrimary(db,admin,[row('LEGACY ORIGINAL')]);
 expect(boot.importedCount).toBe(1);
 const closed=await setFreezeMode(db,admin,initialFreeze,'FROZEN',true);
 expect(closed.mode).toBe('FROZEN');
 const firstApproval=await prepareInitialDatasetActivation(db,admin,[row('GENERATION A')],first,'reviewA.xlsx');
 const activated=await commitInitialDatasetActivation(db,admin,firstApproval,
  'KHOI TAO V2 '+first+' '+firstApproval.legacyRowCount+' '+firstApproval.preview.newCount);
 expect(activated.status).toBe('committed');
 const historic='gen_'+first;
 const permissionPath=ROOT+'/permissions/'+historic+'/columns/note';
 await set(ref(db,permissionPath),true);
 const replacementApproval=await stageDatasetReplacement(db,admin,[row('GENERATION B')],second,'reviewB.xlsx');
 const replaced=await commitDatasetReplacement(db,admin,replacementApproval,
  'THAY '+second+' '+replacementApproval.preview.oldCount+' '+replacementApproval.preview.newCount);
 expect(replaced.status).toBe('committed');
 const before=await witness();
 expect(before.datasetV2.active.generationId).toBe('gen_'+second);
 expect(before.datasetV2.permissions[historic].columns.note).toBe(true);
 const protectedBackup=before.datasetV2.backups[second];
 const parsed=JSON.parse(protectedBackup);
 expect(JSON.parse(parsed.permissionsJson).columns.note).toBe(true);
 expect(before.datasetV2.operations[second].status).toBe('COMMITTED');
 // Anonymous cannot do this, but the normal signed-in Google admin can.
 const anonymous=await sdk('review-historical-guest');
 await signInAnonymously(anonymous.auth);
 let guestStatus='unexpected-success';
 try{
  await set(ref(anonymous.database,permissionPath),false);
 }catch(e){guestStatus=String(e?.code??e?.message??e);}
 expect(guestStatus).toMatch(/permission.denied/i);
 const afterGuest=await witness();
 expect(stable(afterGuest)).toBe(stable(before));
 const beforePath=before.datasetV2.permissions[historic];
 // Exact suspect alternative write: ordinary authenticated client SDK,
 // NOT scoped parentCasService; no service token, no owner REST fixture.
 await set(ref(db,permissionPath),false);
 const afterUnauthorizedHistoricalEdit=await witness();
 const changed=afterUnauthorizedHistoricalEdit.datasetV2.permissions[historic].columns.note===false;
 expect(changed).toBe(true);
 expect(afterUnauthorizedHistoricalEdit.datasetV2.active).toEqual(before.datasetV2.active);
 expect(afterUnauthorizedHistoricalEdit.datasetV2.generations[historic])
   .toEqual(before.datasetV2.generations[historic]);
 expect(afterUnauthorizedHistoricalEdit.datasetV2.backups[second]).toBe(protectedBackup);
 expect(afterUnauthorizedHistoricalEdit.datasetV2.operations[second])
   .toEqual(before.datasetV2.operations[second]);
 const attempted=await post(admin,{action:'restore',operationId:restoreId,
  backupOperationId:second,expected:afterUnauthorizedHistoricalEdit.datasetV2.active,
  confirmation:'KHOI PHUC '+restoreId});
 const afterRestore=await witness();
 expect(attempted.status).toBe(409);
 expect(afterRestore.datasetV2.generations['gen_'+restoreId]).toBeUndefined();
 expect(stable(afterRestore)).toBe(stable(afterUnauthorizedHistoricalEdit));
 const detail={sha:'02964722ae405a7ccf70f2b88bfe21cb7d0bcca7',
   path:permissionPath,actor:'real Auth Emulator Google admin JWT, no service claim',
   guestRawWrite:guestStatus,
   sourceOperationCommitted:before.datasetV2.operations[second].status,
   oldPermissionBefore:beforePath.columns.note,
   oldPermissionAfter:afterUnauthorizedHistoricalEdit.datasetV2.permissions[historic].columns.note,
   historicRowsUnchanged:stable(before.datasetV2.generations[historic])===
     stable(afterUnauthorizedHistoricalEdit.datasetV2.generations[historic]),
   activePointerUnchanged:stable(before.datasetV2.active)===
     stable(afterUnauthorizedHistoricalEdit.datasetV2.active),
   backupUnchanged:afterUnauthorizedHistoricalEdit.datasetV2.backups[second]===protectedBackup,
   restoreHTTP:attempted.status,restoreError:attempted.body.error,
   restoreDetail:attempted.body.message,
   restoreCreatedGeneration:!!afterRestore.datasetV2.generations['gen_'+restoreId],
   expected:'historical permissions must be immutable; valid COMMITTED backup must remain restorable',
   verdict:changed&&attempted.status===409?
      'REPRODUCED_HISTORICAL_PERMISSION_MUTATION_BLOCKS_VALID_RESTORE':
      'NOT_REPRODUCED'};
 log('FINAL_RELEASE_HISTORICAL_PERMISSION_ALTERNATIVE_WRITE',before,
   afterUnauthorizedHistoricalEdit,detail,
   'real signed-in Firebase Auth Emulator admin -> standard RTDB SDK write to historical permissions');
 log('FINAL_RELEASE_COMMITTED_BACKUP_RESTORE_REFUSED_AFTER_HISTORICAL_RIGHTS_MUTATION',
   afterUnauthorizedHistoricalEdit,afterRestore,attempted,
   'real signed-in admin -> real parent onRequest -> scoped Rules');
 console.log('FINAL_RELEASE_CODE_REVIEW_WITNESS '+JSON.stringify(detail));
 expect(String(attempted.body.message)).toMatch(/historical permissions differ|historical/i);
});
`;
source+='\n'+extra;
writeFileSync(output,source);
console.log('FINAL_RELEASE_REVIEW_ONE_TARGETED_TEST_READY '+output);


const originalRunner='parent-commit-service/test/run-functions.mjs';
const reviewerRunner='parent-commit-service/test/final-release-review-run.generated.mjs';
let runner=readFileSync(originalRunner,'utf8');
function replaceExactly(oldText,newText){
 if(runner.split(oldText).length!==2)throw Error('PINNED_RUNNER_SHAPE_CHANGED: '+oldText);
 runner=runner.replace(oldText,newText);
}
replaceExactly("'parent-commit-service/test/integration.test.ts'",
 "'parent-commit-service/test/final-release-review.generated.test.ts'");
replaceExactly("...(process.env.PARENT_ONLY_ACK_TESTS==='true'?['--testNamePattern','lost API completion|lost HTTP ACK']:[])",
 "...['--testNamePattern','FINAL-RELEASE-CODE-REVIEW']");
writeFileSync(reviewerRunner,runner);
console.log('FINAL_RELEASE_REVIEW_ONE_TEST_ONLY_RUNNER_READY '+reviewerRunner);
