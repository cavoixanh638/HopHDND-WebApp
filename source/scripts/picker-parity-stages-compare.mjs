/** F02 before/after oracle. Both files were captured by real Chromium
 * using ONE unmodified fixture in baseline/app worktrees. No snapshots are
 * synthesized by CSS or from strings; PNGs and raw runtime geometry are kept.
 */
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=resolve('qa-results/picker-parity-stages');
const load=v=>JSON.parse(readFileSync(join(root,'comparison',v,'measurements.json'),'utf8'));
const before=load('before'),after=load('after');
assert.equal(before.codeSHA,'e095205c1f4ea79ef81e8d2cd7b386dcfdb259fa',
 'Before must be immutable reference, not current app');
assert(before.codeSHA!==after.codeSHA,'Before and after application SHA accidentally equal');
assert.equal(before.realChromium,after.realChromium,'Must use exact same browser version');
assert.equal(before.cases.length,12,'Before requires 12 real modes');
assert.equal(after.cases.length,12,'After requires 12 real modes');
const byId=new Map(before.cases.map(x=>[x.id,x]));
const close=(a,b)=>Math.abs(a-b)<1;
const sha=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
const pairs=[];
for(const a of after.cases){
 const b=byId.get(a.id);
 assert(b,'Missing before case '+a.id);
 assert.equal(a.normal.layout,b.normal.layout,'Changed 2/3 mode '+a.id);
 assert.equal(a.normal.rows.length,3,'Missing AFTER stages '+a.id);
 assert.equal(b.normal.rows.length,3,'Missing BEFORE stages '+a.id);
 assert.equal(a.normal.columnGap,'8px','Unexpected after columnGap '+a.id);
 assert.equal(a.normal.rowGap,'5px','Unexpected after rowGap '+a.id);
 const sx=a.normal.rows.map(r=>r.status.x),sw=a.normal.rows.map(r=>r.status.width);
 assert(sx.every(x=>close(x,sx[0]))&&sw.every(x=>close(x,sw[0])),
  'After lost unified 3-row status rails '+a.id);
 const keys=['normal',...(a.mode==='all'?['hover','focus','open']:[])];
 const media={};
 for(const key of keys){
  const f1=b.screenshots[key]?.path,f2=a.screenshots[key]?.path;
  assert(f1&&f2,'Missing matched screenshot '+a.id+'/'+key);
  assert(statSync(f1).size>1500&&statSync(f2).size>1500,
   'Empty before/after PNG '+a.id+'/'+key);
  media[key]={before:{file:f1,sha256:sha(f1),bytes:statSync(f1).size},
   after:{file:f2,sha256:sha(f2),bytes:statSync(f2).size}};
 }
 if(a.mode==='all'){
  const l04Before=b.normal.referenceStyle,l04After=a.normal.referenceStyle;
  assert(l04Before&&l04After,'Missing L04 reference '+a.id);
  for(const key of ['font','fontSize','fontWeight','lineHeight','minHeight',
    'padding','gap','background','color','radius','border']){
   assert.equal(l04After[key],l04Before[key],
    'L04 personnel reference unexpectedly modified: '+a.id+'/'+key);
  }
  for(const r of a.normal.rows){
   assert(r.buttonStyle,'Missing after real status picker '+a.id+'/'+r.field);
   assert.equal(r.buttonStyle.fontSize,'11px','After font '+a.id+'/'+r.field);
   assert.equal(r.buttonStyle.minHeight,'26px','After min-height '+a.id+'/'+r.field);
  }
 }else{
  for(const r of a.normal.rows){
   assert.equal(r.button,null,'Readonly generated edit button '+a.id+'/'+r.field);
   assert.equal(r.statusStyle.fontSize,'13px','Readonly font '+a.id+'/'+r.field);
  }
 }
 pairs.push({id:a.id,baselineCodeSHA:before.codeSHA,afterCodeSHA:after.codeSHA,
  baseline:{mode:b.normal.layout,stage:b.normal.stage,grid:b.normal.computedColumns,
   labels:b.normal.rows.map(x=>x.label),status:b.normal.rows.map(x=>x.status),
   triggerStyles:b.normal.rows.map(x=>x.buttonStyle),l04:b.normal.referenceStyle},
  after:{mode:a.normal.layout,stage:a.normal.stage,grid:a.normal.computedColumns,
   labels:a.normal.rows.map(x=>x.label),status:a.normal.rows.map(x=>x.status),
   triggerStyles:a.normal.rows.map(x=>x.buttonStyle),l04:a.normal.referenceStyle},
  shots:media});
}
const result={status:'PASS',beforeSHA:before.codeSHA,afterSHA:after.codeSHA,
 browser:before.realChromium,matchedCases:pairs.length,pairs,
 verdict:'Same-source fixture; detached reference application never modified. '+
  'Independent permission/palette/keyboard witnesses are in review/review-witness.json.',
 backendPersistence:'NOT TESTED: synthetic RAM fixture and 5-width JSON regression only'};
writeFileSync(join(root,'comparison','matched-diff.json'),JSON.stringify(result,null,2));
console.log('PICKER_PARITY_STAGES_MATCHED_BEFORE_AFTER_PASS cases='+pairs.length+
 ' baseline='+before.codeSHA+' after='+after.codeSHA);
