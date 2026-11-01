import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assertSafeParentTransition} from './parent-contract.mjs';
const op='replace_parent_0002',g='gen_'+op,old='gen_seed_parent_0001',actor='admin_fake',backup='backup_parent_0001';
const row={recordId:'r1',note:'APPROVED',revision:1,content:'seed',documentKind:'NQ',isDropped:false};
const changed=(v)=>structuredClone(v);
const p={generationId:old,operationId:'seed_parent_0001',revision:1,rowCount:1,digest:'a'.repeat(64)};
const live={items:{r1:{...row,note:'OLD',operationId:'seed_parent_0001',updatedAt:1,updatedBy:actor}}};
const lease={uid:actor,session:'session',token:'token',revision:1,expiresAt:9000000};
const expected={generationId:g,operationId:op,revision:2,rowCount:1,digest:'b'.repeat(64)};
const before={active:p,generations:{[old]:live},permissions:{[old]:{columns:{note:true}}},leases:{[old]:{r1:{note:lease}}},operations:{seed_parent_0001:{status:'COMMITTED',from:'legacy',to:old,at:1}},candidates:{[op]:JSON.stringify({manifest:{generationId:g,operationId:op,rowCount:1,digest:'b'.repeat(64)},items:{r1:row}})},backups:{[op]:JSON.stringify({previous:p,generation:live,permissionsJson:JSON.stringify({columns:{note:true}}),leasesJson:JSON.stringify({r1:{note:lease}}),baseline:'v1'})}};
function proposal(){return {...changed(before),active:expected,generations:{...changed(before.generations),[g]:{items:{r1:{...row,operationId:op,updatedBy:actor,updatedAt:{'.sv':'timestamp'}}}}},permissions:{...changed(before.permissions),[g]:{columns:{}}},operations:{...changed(before.operations),[op]:{status:'COMMITTED',from:old,to:g,at:2}}};}
const opt={mode:'replace',operationId:op,actor};
test('trusted contract accepts approved pointer transition',()=>assert.equal(assertSafeParentTransition(before,proposal(),opt),true));
test('rejects foreign/own current lease bundled in pointer transition',()=>{const n=proposal();n.leases[old].r1.note.expiresAt=0;assert.throws(()=>assertSafeParentTransition(before,n,opt),/root leases modified/)});
test('rejects staged generation content altered after approved manifest',()=>{const n=proposal();n.generations[g].items.r1.note='TAMPERED';assert.throws(()=>assertSafeParentTransition(before,n,opt),/staged content differs/)});
test('rejects old row modification even when same revision',()=>{const n=proposal();n.generations[old].items.r1.note='WRONG';assert.throws(()=>assertSafeParentTransition(before,n,opt),/existing generations/)});
test('rejects mutation of candidate staging during commit',()=>{const n=proposal();n.candidates[op]='{}';assert.throws(()=>assertSafeParentTransition(before,n,opt),/root candidates modified/)});
test('rejects extra generation appended',()=>{const n=proposal();n.generations.extra={items:{}};assert.throws(()=>assertSafeParentTransition(before,n,opt),/generations added keys/)});
test('rejects backup modification',()=>{const n=proposal();n.backups[op]='untrusted';assert.throws(()=>assertSafeParentTransition(before,n,opt),/root backups modified/)});
test('restore is exact cloned backup rows, no inherited leases',()=>{
 const restoreOp='restore_parent_0003',restoreGen='gen_'+restoreOp;
 const b=changed(before);b.active=expected;b.generations[g]={items:{r1:row}};b.permissions[g]={columns:{}};b.operations[op]={status:'COMMITTED',from:old,to:g,at:2};
 const n=changed(b);n.active={...p,generationId:restoreGen,operationId:restoreOp,revision:3,digest:p.digest};n.generations[restoreGen]={items:{r1:{...live.items.r1,operationId:restoreOp,updatedAt:{'.sv':'timestamp'},updatedBy:actor}}};n.permissions[restoreGen]={columns:{note:true}};n.operations[restoreOp]={status:'COMMITTED',from:g,to:restoreGen,at:3};
 assert.equal(assertSafeParentTransition(b,n,{mode:'restore',operationId:restoreOp,backupOperationId:op,actor}),true);
 const tampered=changed(n);tampered.leases[restoreGen]={r1:{note:lease}};
 assert.throws(()=>assertSafeParentTransition(b,tampered,{mode:'restore',operationId:restoreOp,backupOperationId:op,actor}),/root leases modified/);
});
test('activation creates first generation from approved staging and sealed legacy backup',()=>{
 const ao='activate_parent_0001',ag='gen_'+ao;
 const legacy={freeze:{mode:'FROZEN',revision:1,epoch:1},baseline:'sealed-baseline',manifest:{generationId:ag,operationId:ao,digest:'c'.repeat(64),rowCount:1}};
 const b={candidates:{[ao]:JSON.stringify({manifest:legacy.manifest,items:{r1:row}})},legacyBackups:{[ao]:JSON.stringify(legacy)}};
 const n={...changed(b),active:{generationId:ag,operationId:ao,revision:1,rowCount:1,digest:'c'.repeat(64)},generations:{[ag]:{items:{r1:{...row,operationId:ao,updatedBy:actor,updatedAt:1}}}},permissions:{[ag]:{columns:{}}},operations:{[ao]:{status:'COMMITTED',from:'legacy',to:ag,at:3}},bootstrap:{operationId:ao,legacyBaseline:'sealed-baseline',freezeRevision:1,freezeEpoch:1}};
 assert.equal(assertSafeParentTransition(b,n,{mode:'activate',operationId:ao,actor}),true);
});
