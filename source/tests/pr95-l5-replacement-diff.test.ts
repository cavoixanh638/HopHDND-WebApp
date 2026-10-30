import {describe,expect,it} from 'vitest';
import type {Item,DocumentKind} from '../shared/types';
import {previewDatasetReplacement} from '../src/data/dataset-replacement-preview';
import {filterListBySummary} from '../src/domain/item-summary';

function row(code:string,kind:DocumentKind='NQ',extra:Partial<Item>={}):Item{
  return {
    recordId:'old-'+code,displayCode:code,stt:1,documentKind:kind,
    content:'Nội dung '+code,department:'Sở giả lập',type:kind==='BC'?'BC':'HC',
    partyLevel:'BTV',progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',
    progressCouncil:'Sở chưa trình',specialist:'CV A',room:'Phòng A',
    vpLeader:'VP',ubndLeader:'UB',specificProgress:'',note:'',
    isDropped:false,archivedAt:null,revision:1,...extra,
  };
}

describe('PR95 L5: business-code replacement is a complete new snapshot',()=>{
  it('classifies by code, not row position, STT, recordId, revision or iteration order',()=>{
    const old=[row('NQ001'),row('NQ002'),row('NQ003'),row('NQ004')];
    const next=[
      {...old[2],recordId:'generation2-c',stt:3,revision:1},
      {...old[1],recordId:'generation2-b',stt:1,content:'Nội dung thay thế NQ002'},
      row('BC001','BC',{recordId:'generation2-new',stt:4}),
      {...old[0],recordId:'generation2-a',stt:2},
    ];
    const before=JSON.stringify({old,next});
    const result=previewDatasetReplacement(old,next);
    expect(result.oldCount).toBe(4);
    expect(result.newCount).toBe(4);
    expect(result.difference).toEqual({
      added:['BC001'],changed:['NQ002'],removed:['NQ004'],unchanged:['NQ003','NQ001'],
    });
    expect(result.totals.total).toEqual({
      total:4,nq:3,bc:1,unclassified:0,pending:4,doing:0,completed:0,
      qppl:0,hc:3,nqUnclassified:0,
    });
    expect(result.totals.stages.map(x=>x.total)).toEqual([4,3,3]);
    expect(result.totals.stages.every(x=>x.buckets.flatMap(b=>b.ids)
      .every(id=>!id.includes('NQ004')))).toBe(true);
    expect(filterListBySummary(next,{report:'party',stage:'source'}).map(x=>x.displayCode))
      .toEqual(['NQ003','NQ002','BC001','NQ001']);
    expect(JSON.stringify({old,next})).toBe(before);
  });

  it('a reused code with new contents is changed, not added + removed or unchanged',()=>{
    const old=[row('NQ005')];
    const next=[{...old[0],recordId:'new-5',stt:200,content:'Nội dung hoàn toàn khác'}];
    expect(previewDatasetReplacement(old,next).difference).toEqual({
      added:[],changed:['NQ005'],removed:[],unchanged:[],
    });
    expect(previewDatasetReplacement(old,[{...old[0],recordId:'next-5',stt:9}]).difference)
      .toEqual({added:[],changed:[],removed:[],unchanged:['NQ005']});
    expect(previewDatasetReplacement(old,[{...old[0],recordId:'next-5',isDropped:true}])
      .difference.changed).toEqual(['NQ005']);
    expect(previewDatasetReplacement(old,[{...old[0],recordId:'next-5',archivedAt:'2026-10-30'}])
      .difference.changed).toEqual(['NQ005']);
  });

  it('does not leak old rows when the new snapshot replaces all codes',()=>{
    const old=[row('OLD001'),row('OLD002')];
    const next=[row('NEW001','BC',{recordId:'g2-new',progressCouncil:'Hoàn thành'})];
    const result=previewDatasetReplacement(old,next);
    expect(result.difference).toEqual({
      added:['NEW001'],changed:[],removed:['OLD001','OLD002'],unchanged:[],
    });
    expect(result.totals.total).toEqual({
      total:1,nq:0,bc:1,unclassified:0,pending:0,doing:0,completed:1,
      qppl:0,hc:0,nqUnclassified:0,
    });
    expect(result.totals.stages.map(x=>x.total)).toEqual([1,0,0]);
    expect(result.totals.stages[0].buckets.find(b=>b.stage==='source')?.ids).toEqual(['g2-new']);
    expect(result.totals.stages[0].buckets.reduce((sum,b)=>sum+b.count,0)).toBe(1);
  });

  it('rejects blank / duplicate business codes (including padding), duplicate IDs and empty candidate',()=>{
    const old=[row('NQ001')],one=row('NQ002');
    expect(()=>previewDatasetReplacement(old,[])).toThrow('từ 1 đến 1.000');
    expect(()=>previewDatasetReplacement(old,[one,{...one,recordId:'new-unique',displayCode:' NQ002 '}]))
      .toThrow('trùng');
    expect(()=>previewDatasetReplacement(old,[one,{...one,displayCode:'NQ003'}]))
      .toThrow('trùng');
    expect(()=>previewDatasetReplacement(old,[{...one,displayCode:'   '}])).toThrow('trống');
    expect(()=>previewDatasetReplacement(old,[{...one,recordId:'  '}])).toThrow('trùng');
    expect(()=>previewDatasetReplacement([one,{...one,recordId:'different',displayCode:' NQ002 '}],
      [row('NQ003')])).toThrow('trùng');
  });
});
