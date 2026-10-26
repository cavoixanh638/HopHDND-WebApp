import {test} from 'vitest';
import assert from 'node:assert/strict';
import {convertFirebaseRows,generateSql} from './generate-private-supabase-parity-sql.mjs';

function sample(count=55){
  return Object.fromEntries(Array.from({length:count},(_,i)=>{
    const n=i+1,id='qa-private-'+n;
    return [id,{recordId:id,displayCode:'ABC-'+n,stt:n,revision:n%3+1,
      archivedAt:null,documentKind:'NQ',content:"Private QA synthetic A'B "+n,
      department:'D',type:'T',partyLevel:'',progressParty:'',progressBuild:'',
      progressCouncil:'',specialist:'',room:'',vpLeader:'',ubndLeader:'',
      specificProgress:'',note:'',isDropped:false}];
  }));
}
test('exactly 55 source records, no hidden source data in repository',()=>{
  const items=convertFirebaseRows(sample());
  assert.equal(items.length,55);
  const sql=generateSql(items);
  assert.match(sql,/SECURITY_GATE/);
  assert.match(sql,/STAGING_NOT_EMPTY/);
  assert.match(sql,/admin/);
  assert.match(sql,/A''B/);
  assert.match(sql,/<> 55/);
  assert.doesNotMatch(sql,/ON CONFLICT DO UPDATE/);
});
test('a six-row Supabase-only fixture is never accepted as actual parity',()=>{
  assert.throws(()=>convertFirebaseRows(sample(6)),/50/);
});
test('duplicated Firebase code, missing field, path mismatch are blocked',()=>{
  const a=sample();
  a['qa-private-2'].displayCode=a['qa-private-1'].displayCode;
  assert.throws(()=>convertFirebaseRows(a),/displayCode/);
  const c=sample();delete c['qa-private-2'].content;
  assert.throws(()=>convertFirebaseRows(c),/content/);
  const d=sample();d['qa-private-3'].recordId='other';
  assert.throws(()=>convertFirebaseRows(d),/recordId/);
});

test('source mirror envelope with 55 Excel rows and revision zero is valid',()=>{
  const a=Object.values(sample()).map(row=>({...row,revision:0}));
  const mirror={schemaVersion:1,source:'1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp:60961344',sha256:'a'.repeat(64),rows:a};
  const out=convertFirebaseRows(mirror);
  assert.equal(out.length,55);
  assert.equal(out[0].revision,1);
  assert.throws(()=>convertFirebaseRows({...mirror,source:'OTHER'}),/source/);
});
