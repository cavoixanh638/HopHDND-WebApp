/**
 * FINAL-DATA-REVIEW candidate PR147 deterministic REAL parent endpoint vs
 * real PR145 backend callback, using the candidate's own FULL Rules.
 * Generated tests in a detached checkout only. No common source edits.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const origin='parent-commit-service/test/integration.test.ts';
const out='parent-commit-service/test/final-data-candidate.generated.test.ts';
let s=readFileSync(origin,'utf8');
if(!s.includes("it('lost API completion")||!s.includes('const records:any[]=[];'))
  throw Error('Candidate test source drift; refuse heuristic rewrite');
const extra=String.raw`
it.each(['renew','release','save'] as const)(
 'FINAL-DATA-REVIEW candidate in-flight %s across real authenticated replacement endpoint',
 async(action)=>{
  const now=Date.now(),prev='review_old_cell_gen_0001',next='review_new_parent_gen_0002';
  const oldGen='gen_'+prev;
  await seeded({hdnd:{
   control:{revision:1,editingLocked:false,changedAt:new Date(now).toISOString()},
   freezeControl:{mode:'OPEN',revision:1,epoch:0,actor:admin.uid,changedAt:1,deadline:0,closedAt:0},
   datasetV2:{
    active:{generationId:oldGen,operationId:prev,revision:1,rowCount:1,digest:'a'.repeat(64)},
    generations:{[oldGen]:{items:{r1:{...row('ORIGINAL OLD ROW'),
     operationId:prev,updatedAt:1,updatedBy:admin.uid}}}},
    permissions:{[oldGen]:{columns:{note:true}}},
    operations:{[prev]:{status:'COMMITTED',from:'legacy',to:oldGen,at:now-1000}}
   }
  }});
  const {getAuth:getAdminAuth}=await import('firebase-admin/auth');
  const {dispatchCellEdit}=await import('../../cell-edit-service/core.js');
  const verifier=adminInitialize({projectId:PROJECT},'final-review-verified-'+randomUUID());
  const claims=await getAdminAuth(verifier).verifyIdToken(await getIdToken(admin));
  const identity={uid:claims.uid,token:claims};
  const privateSecret=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');
  const base=(await witness()).datasetV2.active;
  const acquired=await dispatchCellEdit(identity,{action:'acquire',scope:'v2',
   generation:base,operationId:randomUUID(),recordId:'r1',field:'note',kind:'multiline',
   secret:privateSecret});
  expect(acquired.status).toBe('acquired');
  const lease=acquired.lease;
  const approval=await stageDatasetReplacement(db,admin,[row('APPROVED NEW ROW')],next,'review.xlsx');
  const before=await witness();
  let parentResponse:any=null,backendError:any=null,reached=false;
  try{
   const editOperationId=randomUUID();
   const request={action,scope:'v2',generation:base,
    operationId:editOperationId,recordId:'r1',field:'note',token:lease.token,secret:privateSecret,
    ...(action==='save'?{patch:{recordId:'r1',operationId:editOperationId,baseRevision:1,
      baseValues:{note:'ORIGINAL OLD ROW'},changes:{note:'MUST NOT WRITE OLD GENERATION'}},
      leases:{note:{token:lease.token,secret:privateSecret}}}:{})};
   await dispatchCellEdit(identity,request,
    {afterProof:async()=>{
     reached=true;
     parentResponse=await post(admin,{action:'replace',operationId:next,
      expected:approval.expected,
      confirmation:'THAY '+next+' '+approval.preview.oldCount+' '+approval.preview.newCount});
     if(parentResponse.status!==200||parentResponse.body.status!=='committed')
      throw Error('Parent did not commit at held checkpoint: '+JSON.stringify(parentResponse));
    }});
  }catch(error){backendError={code:error?.code??'error',message:String(error?.message??error)};}
  await adminDelete(verifier);
  const after=await witness();
  const oldLeaseBefore=before.datasetV2.leases?.[oldGen]?.r1?.note;
  const oldLeaseAfter=after.datasetV2.leases?.[oldGen]?.r1?.note;
  const oldChanged=stable(oldLeaseBefore)!==stable(oldLeaseAfter);
  const oldRowChanged=stable(before.datasetV2.generations[oldGen])!==
    stable(after.datasetV2.generations[oldGen]);
  const event={action,reached,parentHTTP:parentResponse?.status,
   parentStatus:parentResponse?.body?.status,
   backendError,oldLeaseBefore:{revision:oldLeaseBefore?.revision,expiresAt:oldLeaseBefore?.expiresAt},
   oldLeaseAfter:{revision:oldLeaseAfter?.revision,expiresAt:oldLeaseAfter?.expiresAt},
   oldChanged,oldRowChanged,activeBefore:before.datasetV2.active,
   activeAfter:after.datasetV2.active,
   previousGenerationUnchanged:!oldRowChanged,
   expected:'parent COMMITTED; old historical row and lease must remain immutable, stale write rejected at Rules transaction',
   finding:action==='save'
    ?(oldRowChanged?'REPRODUCED_OLD_ROW_WRITE':'OLD_ROW_RULES_DENIED')
    :(oldChanged?'REPRODUCED_OLD_LEASE_WRITE_AFTER_REAL_PARENT_COMMIT':'NO_STALE_LEASE_WRITE')};
  log('FINAL_DATA_REVIEW_real_parent_'+action,before,after,event,
   'real verified Firebase Auth token -> backend afterProof hold -> real authenticated PR147 parent endpoint -> scoped cell Admin transaction via merged FULL Rules');
  console.log('FINAL_DATA_REVIEW_CANDIDATE_CROSS '+JSON.stringify(event));
  expect(reached).toBe(true);
  expect(parentResponse?.body?.status).toBe('committed');
  expect(after.datasetV2.active.generationId).toBe('gen_'+next);
  expect(event.previousGenerationUnchanged).toBe(true);
  if(action==='save'){
   expect(oldChanged).toBe(false);
   expect(oldRowChanged).toBe(false);
   expect(backendError?.code,'old-generation SAVE must fail at Rules, not after committing').toBe('permission-denied');
  }else{
   expect(oldChanged,'Probing known stale-generation lease Rules vulnerability').toBe(true);
   expect(backendError?.code).toBe('failed-precondition');
  }
 }
);

it('FINAL-DATA-REVIEW candidate FROZEN receipt stays historical after approved parent switch',async()=>{
 const now=Date.now(),prev='review_frz_prev_0001',next='review_frz_next_0002';
 const oldGen='gen_'+prev;
 await seeded({hdnd:{control:{revision:1,editingLocked:false,changedAt:new Date(now).toISOString()},
 freezeControl:{mode:'OPEN',revision:1,epoch:0,actor:admin.uid,changedAt:1,deadline:0,closedAt:0},
 datasetV2:{active:{generationId:oldGen,operationId:prev,revision:1,rowCount:1,digest:'a'.repeat(64)},
 generations:{[oldGen]:{items:{r1:{...row('FROZEN ORIGINAL'),operationId:prev,updatedAt:1,updatedBy:admin.uid}}}},
 operations:{[prev]:{status:'COMMITTED',from:'legacy',to:oldGen,at:now-1000}}}}});
 const freeze=await import('../../src/data/freeze-control');
 const staged=await stageDatasetReplacement(db,admin,[row('AFTER FROZEN REPLACE')],next,'freeze.xlsx');
 const closed=await freeze.setFreezeMode(db,admin,await freeze.readFreeze(db),'FROZEN',true);
 const receipt=await freeze.createFreezeReceipt(db,admin,closed.epoch);
 const before=await witness();
 const response=await post(admin,{action:'replace',operationId:next,expected:staged.expected,
  confirmation:'THAY '+next+' '+staged.preview.oldCount+' '+staged.preview.newCount});
 const after=await witness();
 const historical=freeze.freezeReceiptIsCurrent(receipt,closed,after.datasetV2.active)===false;
 const event={http:response.status,status:response.body.status,
  oldReceiptImmutable:stable(before.freezeReceipts)===stable(after.freezeReceipts),
  historical,freezeModeAfter:after.freezeControl?.mode,
  oldGenerationImmutable:stable(before.datasetV2.generations[oldGen])===
   stable(after.datasetV2.generations[oldGen]),
  expected:'Old receipt preserved but never current; old generation immutable'};
 log('FINAL_DATA_REVIEW_frozen_receipt_historical_parent_switch',before,after,event);
 console.log('FINAL_DATA_REVIEW_FROZEN_RECEIPT '+JSON.stringify(event));
 expect(response.body.status).toBe('committed');
 expect(historical).toBe(true);expect(event.oldReceiptImmutable).toBe(true);
 expect(event.oldGenerationImmutable).toBe(true);
});
`;
s+='\n'+extra;
writeFileSync(out,s);
let runner=readFileSync('parent-commit-service/test/run.mjs','utf8');
const exact="prefix+'/test/integration.test.ts'";
if(runner.split(exact).length!==2)throw Error('Original runner changed unexpectedly');
runner=runner.replace(exact,"prefix+'/test/final-data-candidate.generated.test.ts'");
writeFileSync('parent-commit-service/test/final-data-candidate-run.generated.mjs',runner);
console.log('FINAL_DATA_REVIEW_CANDIDATE_GENERATED PR147 original runtime/source untouched');
