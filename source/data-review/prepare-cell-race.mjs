/**
 * Independent REVIEW HARNESS GENERATOR. Produces a temporary copy of the PR145
 * integration script in a separate checkout. NEVER edits PR145 or candidate.
 * Uses exact anchors so a PR145 source update fails closed.
 */
import {readFileSync,writeFileSync} from 'node:fs';
const original='cell-edit-service/test/integration.mjs';
const output='cell-edit-service/test/final-data-review.generated.mjs';
let source=readFileSync(original,'utf8');
const reviewer=String.raw`
const crossReview=[];
async function reviewInFlightOldGenerationLease(action){
  // Only the pointer flip is OWNER REST fixture setup. The cell operation is
  // real Auth-Emulator-verified backend core and real scoped RTDB Rules.
  await seed('v2');
  const lease=await acquire('v2','r1','note',adminTab);
  const oldPath=paths('v2').lease;
  const beforeLease=await ownerGet(oldPath);
  const beforePointer=await ownerGet('hdnd/datasetV2/active');
  const token=await getIdToken(adminTab.auth.currentUser);
  const verified=await getAdminAuth(verifiedAdmin).verifyIdToken(token);
  const operationId=randomUUID();
  let result={status:'unattempted'},reached=false;
  try{
    const {dispatchCellEdit}=await import('../core.js');
    const reply=await dispatchCellEdit({uid:verified.uid,token:verified},{
      ...scopeInfo('v2'),action,recordId:'r1',field:'note',
      operationId,token:lease.token,secret:lease.secret
    },{afterProof:async()=>{
      reached=true;
      await ownerPut('hdnd/datasetV2/active',{
        generationId:'gen_data_review_new_0002',
        operationId:'data_review_new_0002',
        revision:2,rowCount:2,digest:'b'.repeat(64)
      });
    }});
    result={status:'returned',answerStatus:reply.status};
  }catch(e){result={status:'rejected',code:e?.code??'error',message:String(e?.message??e)};}
  const afterLease=await ownerGet(oldPath);
  const afterPointer=await ownerGet('hdnd/datasetV2/active');
  const oldHash=hash(beforeLease),newHash=hash(afterLease);
  const observation={
    name:'inflight_'+action+'_after_generation_swap',
    fixedCellHead:'bf78bdddf336f16082ad68db1c1f39723bc95251',
    path:oldPath,operationId,reached,
    expected:'old generation lease is immutable after active pointer switch',
    transport:'real Auth Emulator JWT -> Admin verifyIdToken -> PR145 dispatchCellEdit test-only afterProof hook -> scoped Admin RTDB transaction through FULL test Rules',
    pointerTransition:'owner REST PUT fixture; NOT real parent service switch',
    beforePointer,afterPointer,leaseBeforeHash:oldHash,leaseAfterHash:newHash,
    before:{revision:beforeLease?.revision,expiresAt:beforeLease?.expiresAt,lastOperationId:beforeLease?.lastOperationId},
    after:{revision:afterLease?.revision,expiresAt:afterLease?.expiresAt,lastOperationId:afterLease?.lastOperationId},
    requestResult:result,serverLeaseChanged:oldHash!==newHash,
    verdict:oldHash!==newHash?'REPRODUCED_STALE_LEASE_MUTATION':'NO_STALE_LEASE_MUTATION'
  };
  crossReview.push(observation);
  console.log('FINAL_DATA_REVIEW_RACE_WITNESS '+JSON.stringify(observation));
  assert.equal(reached,true,'test did not reach proof-read checkpoint');
  assert.equal(afterPointer.generationId,'gen_data_review_new_0002');
}
`;
function replaceOnce(needle,replacement){
  if(source.split(needle).length!==2)throw Error('Source anchor not unique: '+needle.slice(0,60));
  source=source.replace(needle,replacement);
}
replaceOnce('async function run(){',reviewer+'\nasync function run(){');
replaceOnce('\n}\nlet fatal=null;',"\n  await reviewInFlightOldGenerationLease('renew');\n  await reviewInFlightOldGenerationLease('release');\n}\nlet fatal=null;");
replaceOnce(" writeFileSync(new URL('./witness.local.json',import.meta.url),JSON.stringify({",
  " writeFileSync(new URL('./final-data-review.local.json',import.meta.url),JSON.stringify({source:'independent reviewer, PR145 fixed SHA, separate checkout, NO runtime source edits',findings:crossReview},null,2));\n writeFileSync(new URL('./witness.local.json',import.meta.url),JSON.stringify({");
if(!source.includes('reviewInFlightOldGenerationLease'))throw Error('Injection missing');
writeFileSync(output,source);
console.log('FINAL_DATA_REVIEW_HARNESS_READY '+output+'; input preserved');
