import assert from 'node:assert/strict';
import {plan,verify,applyFixture} from './party-level-migration.mjs';
const item=(partyLevel,progressParty)=>({partyLevel,progressParty,revision:1,operationId:'fixture'});
const original={items:{
  a:item('Không phải trình','VP đang xử lý'),
  b:item('BTV TU','Đã có TBKL'),
  c:item('Không','Không phải trình'),
  d:item('BCH','Sở chưa trình'),
  e:item('TTTU','Đã gửi ĐU')
}};
const {report,publicManifest,privatePlan}=plan(original);
assert.equal(report.totalRows,5);
assert.equal(report.changedRows,2);
assert.equal(report.levelChanges,2);
assert.equal(report.progressChanges,1);
assert.equal(report.unknownCount,0);
assert.ok(!JSON.stringify(publicManifest).includes('"recordId"'));
assert.ok(!JSON.stringify(publicManifest).includes('"a"'));
const first=applyFixture(original,privatePlan,{stopAfter:1});
assert.equal(first.writes,1);
assert.equal(verify(first.snapshot,privatePlan).errors.length,1);
const resumed=applyFixture(first.snapshot,privatePlan);
assert.equal(resumed.writes,1);
assert.equal(resumed.skips,1);
assert.equal(verify(resumed.snapshot,privatePlan).errors.length,0);
const repeat=applyFixture(resumed.snapshot,privatePlan);
assert.equal(repeat.writes,0);
assert.equal(repeat.skips,2);
assert.equal(plan(resumed.snapshot).report.changedRows,0);
assert.equal(original.items.a.partyLevel,'Không phải trình','input is immutable');
const strange=plan({items:{...original.items,z:item('TU đã cho ý kiến','Sở chưa trình')}});
assert.equal(strange.report.unknownCount,1);
assert.equal(strange.report.changedRows,2);
assert.equal(strange.report.unknown['TU đã cho ý kiến'],1);
assert.throws(()=>applyFixture({...original,items:{...original.items,b:item('BTV TU','RACE changed')}},privatePlan),/CAS_CONFLICT/);
assert.throws(()=>plan({items:{bad:{partyLevel:'Không'}}}),/MIGRATION_SAFETY_ABORT/);
console.log('PARTY_LEVEL_FIXTURE_PASS '+JSON.stringify({
  totalRows:report.totalRows,changedRows:report.changedRows,
  levelChanges:report.levelChanges,progressChanges:report.progressChanges,
  interruptionResume:true,idempotent:true,unknownBlocked:true,casConflict:true
}));
