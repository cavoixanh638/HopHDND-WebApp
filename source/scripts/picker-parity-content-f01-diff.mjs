/** F01 baseline vs after: unchanged geometry and source UI, only unclip paint. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
const root=resolve('qa-results/picker-parity-content/f01');
const load=mode=>JSON.parse(readFileSync(root+'/'+mode+'/summary.json','utf8'));
const before=load('before'),after=load('after');
assert.equal(before.mode,'before');assert.equal(after.mode,'after');
assert.equal(before.scenes,24);assert.equal(after.scenes,24);
assert(before.clipped>0,'prior F01 clip was not reproduced');
assert.equal(after.clipped,0,'fix leaves clipped scenes');
const bmap=new Map(before.cases.map(entry=>[entry.id,entry]));
const deltas=[];
const epsilon=1.1;
for(const a of after.cases){
 const b=bmap.get(a.id);
 assert(b,'missing BEFORE '+a.id);
 for(const phase of ['normal','hover','focus']){
  const old=b[phase],now=a[phase];
  for(const part of ['heading','row','nextRow','group','button']){
   if(!old[part]&&!now[part])continue;
   assert(old[part]&&now[part],a.id+' '+phase+' missing '+part);
   for(const key of ['x','y','w','h']){
    const diff=Math.abs(old[part][key]-now[part][key]);
    deltas.push({id:a.id,phase,part,key,diff});
    assert(diff<epsilon,a.id+' '+phase+' '+part+'.'+key+
      ' changed '+old[part][key]+' -> '+now[part][key]);
   }
  }
  assert(now.documentWidth<=old.documentWidth+1,a.id+' '+phase+' added page horizontal scroll');
  assert.equal(now.buttonCss.background,old.buttonCss.background,
    a.id+' '+phase+' source fill drift');
  assert.equal(now.buttonCss.boxShadow,old.buttonCss.boxShadow,
    a.id+' '+phase+' shadow specification drift');
  assert.equal(now.buttonCss.transform,old.buttonCss.transform,
    a.id+' '+phase+' reference lift drift');
 }
 assert.notEqual(b.hover.headingCss.overflowY,'visible',
   a.id+' prior clipping mechanism not present');
 assert.equal(a.hover.headingCss.overflowY,'visible',a.id+' after clips');
}
const maxDelta=Math.max(...deltas.map(d=>d.diff));
const report={result:'PASS',oldSource:'9fb74b7fda1ab4492011dc675df5d656e74f6000',
 newSource:after.sourceSha,scenes:after.scenes,clippedBefore:before.clipped,clippedAfter:after.clipped,
 maxLayoutDeltaPx:maxDelta,comparedValues:deltas.length};
writeFileSync(root+'/before-vs-after.json',JSON.stringify(report,null,2));
console.log('PICKER_PARITY_CONTENT_F01_DIFF_PASS '+JSON.stringify(report));
