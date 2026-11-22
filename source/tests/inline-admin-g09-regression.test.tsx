/** G09 BASE real-module regression. No mocked Firebase writes; no DOM product changes. */
import {describe,it,expect} from 'vitest';
import {normalizeSearch,searchMatchRanges,createSearchIndex,matchesSearch} from '../src/domain/search';
import {reorderByKey} from '../src/domain/reorder-columns';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {planAdjacentTransfer,resizeProjectedWithAdjacent,projectedPhysicalWidth,projectedIdWidth} from '../src/data/resize-last-column';
import {createDemoItems} from '../src/data/demo-items';
import {getKpis,aggregateReport,DEFAULT_REPORTS} from '../src/domain/reporting';
import {summarizeListItems} from '../src/domain/item-summary';
import {mayEdit} from '../src/data/firebase-repository';

const physical=(layout:ReturnType<typeof defaultItemLayout>,key:string)=>
  projectedPhysicalWidth(layout.columns.find(column=>column.key===key)!.width,key);

describe('G09 | BASE: list, filter, report and authority regression',()=>{
  it('Vietnamese accent-insensitive filter preserves original text and source data',()=>{
    expect(normalizeSearch('  ĐẢNG ỦY - SỞ TÀI CHÍNH ')).toBe('dang uy - so tai chinh');
    const rows=createDemoItems(8),before=structuredClone(rows);
    const index=createSearchIndex(rows);
    const first=rows[0];
    expect(matchesSearch(first,'so mau a',index)).toBe(true);
    expect(matchesSearch(first,'so khong ton tai',index)).toBe(false);
    expect(searchMatchRanges('Phòng Nội vụ','phong')).toEqual([{start:0,end:5}]);
    expect(rows).toEqual(before);
  });

  it('pointer/keyboard reorder domain function keeps hidden column and does not mutate input',()=>{
    const columns=[{key:'content',visible:true},{key:'secret',visible:false},{key:'room',visible:true},{key:'note',visible:true}];
    const before=structuredClone(columns);
    const reordered=reorderByKey(columns,c=>c.key,'room','content');
    expect(reordered.map(c=>c.key)).toEqual(['room','content','secret','note']);
    expect(reordered.find(c=>c.key==='secret')?.visible).toBe(false);
    expect(columns).toEqual(before);
    expect(reorderByKey(columns,c=>c.key,'missing','note')).toEqual(columns);
  });

  it('adjacent-first resize matches preview and commit and retains table width',()=>{
    const layout=defaultItemLayout(),keys=['specificProgress','room','note'];
    const base=keys.map(key=>physical(layout,key));
    const planned=planAdjacentTransfer(base[0],280,{min:60,max:1600},
      {width:base[1],min:60,max:1600},{width:base[2],min:60,max:1600});
    const moved=resizeProjectedWithAdjacent(layout,keys,'specificProgress',280);
    expect([planned.target,planned.adjacent,planned.last]).toEqual(keys.map(key=>physical(moved,key)));
    expect(keys.reduce((sum,key)=>sum+physical(moved,key),0)).toBe(base.reduce((a,b)=>a+b,0));
    expect(validateItemLayout(moved)).toBeTruthy();
    expect(layout.columns.find(c=>c.key==='specificProgress')?.width).toBe(200);
  });

  it('clamps at 60/1600 and does not turn hidden/last columns into extra reservoirs',()=>{
    const layout=defaultItemLayout(),keys=['content','stt','displayCode'];
    const moved=resizeProjectedWithAdjacent(layout,keys,'content',99999);
    expect([physical(moved,'content'),physical(moved,'stt'),physical(moved,'displayCode')])
      .toEqual([456,60,46]);
    expect(resizeProjectedWithAdjacent(layout,keys,'displayCode',999)).toBe(layout);
    expect(projectedIdWidth(68)).toBe(52);
    expect(moved.columns.length).toBe(layout.columns.length);
  });

  it('hiding a column is only a layout projection, not source deletion',()=>{
    const before=defaultItemLayout();
    const key='note';
    const hidden=validateItemLayout({...before,columns:before.columns.map(column=>
      column.key===key?{...column,visible:false}:column)});
    expect(hidden.columns.length).toBe(before.columns.length);
    expect(hidden.columns.find(column=>column.key===key)?.visible).toBe(false);
    expect(before.columns.find(column=>column.key===key)?.visible).toBe(true);
    expect(createDemoItems(8)[0]).toHaveProperty('note');
  });

  it('summary drilldown counts agree with the canonical reports, independent of layout changes',()=>{
    const data=createDemoItems(24),snapshot=structuredClone(data);
    const kpis=getKpis(data),summary=summarizeListItems(data);
    expect(summary.total.total).toBe(kpis.total);
    expect(summary.total.pending+summary.total.doing+summary.total.completed).toBeLessThanOrEqual(kpis.total);
    for(const stage of summary.stages){
      const config=DEFAULT_REPORTS.find(report=>report.id===stage.id)!;
      const report=aggregateReport(data,config,'department');
      expect(stage.total).toBe(report.total);
      expect(stage.complete).toBe(report.completedCount);
      expect(stage.buckets.reduce((sum,bucket)=>sum+bucket.count,0)+stage.unmatched)
        .toBe(stage.total);
    }
    expect(data).toEqual(snapshot);
  });

  it('role permission gate rejects forged guest/staff edits; a column grant applies to all rows',()=>{
    expect(mayEdit(null,'demo-0001','note',false)).toBe(false);
    expect(mayEdit(null,'demo-0001','note',true)).toBe(true);
    const permissions={columns:{note:true},cells:{'demo-0001':{note:false}}} as Parameters<typeof mayEdit>[0];
    expect(mayEdit(permissions,'demo-0001','note',false)).toBe(true);
    expect(mayEdit(permissions,'demo-0002','note',false)).toBe(true);
    expect(mayEdit(permissions,'demo-0001','content',false)).toBe(false);
  });
});