import { describe, expect, it } from 'vitest';
import { defaultReportLayout, validateReportLayout, configuredReports } from '../src/data/report-preferences';
import { applyInlineReportAction, inlineHiddenColumns } from '../src/features/reports/inline-g02-report-actions';
import { aggregateReport } from '../src/domain/reporting';
import { createDemoItems } from '../src/data/demo-items';

const base=()=>defaultReportLayout();
const apply=(action:Parameters<typeof applyInlineReportAction>[1],layout=base())=>
  validateReportLayout(applyInlineReportAction(layout,action));

describe('G02 inline report layout - presentation only',()=>{
  it('renames without touching report ID, source, totals or source records',()=>{
    const items=createDemoItems(27),before=base(),snapshot=JSON.stringify(items);
    const next=apply({type:'rename',reportId:'party',title:' Tiến độ mới '});
    expect(next[0].title).toBe('Tiến độ mới');
    expect(next[0].id).toBe('party');
    const countA=aggregateReport(items,configuredReports(before,true)[0],'department').total;
    const countB=aggregateReport(items,configuredReports(next,true)[0],'department').total;
    expect(countB).toBe(countA);
    expect(JSON.stringify(items)).toBe(snapshot);
    expect(()=>apply({type:'rename',reportId:'party',title:'  '})).toThrow();
    expect(()=>apply({type:'rename',reportId:'party',title:'x'.repeat(161)})).toThrow();
  });
  it('hides and restores a whole report without removing it or its counts',()=>{
    const hidden=apply({type:'report-visible',reportId:'build',visible:false});
    expect(hidden).toHaveLength(5);
    expect(configuredReports(hidden).some(r=>r.id==='build')).toBe(false);
    expect(configuredReports(hidden,true).some(r=>r.id==='build')).toBe(true);
    const restored=apply({type:'report-visible',reportId:'build',visible:true},hidden);
    expect(restored.map(r=>r.id)).toEqual(base().map(r=>r.id));
  });
  it('reorders report cards using same stable IDs and stays valid',()=>{
    const next=apply({type:'report-reorder',reportId:'party',targetId:'council'});
    expect(next.map(row=>row.id)).toEqual(['build','council','party','nq','bc']);
    expect(next[2].title).toBe(base()[0].title);
    const keyboard=apply({type:'report-step',reportId:'party',direction:-1},next);
    expect(keyboard.map(row=>row.id)).toEqual(['build','party','council','nq','bc']);
  });
  it('hides and reorders status columns without changing aggregate totals',()=>{
    const items=createDemoItems(31);
    const original=base();
    const before=aggregateReport(items,configuredReports(original,true)[0],'department');
    const first='Sở chưa trình';
    const hidden=apply({type:'status-visible',reportId:'party',column:first,visible:false});
    expect(inlineHiddenColumns(hidden[0])).toContain(first);
    const moved=apply({type:'status-step',reportId:'party',column:'VP đang xử lý',direction:1},hidden);
    const restored=apply({type:'status-visible',reportId:'party',column:first,visible:true},moved);
    expect(inlineHiddenColumns(restored[0])).not.toContain(first);
    const after=aggregateReport(items,configuredReports(restored,true)[0],'department');
    expect(after.total).toBe(before.total);
    expect(after.completedCount).toBe(before.completedCount);
    expect(after.percent).toBe(before.percent);
    expect(after.rows.size).toBe(before.rows.size);
    expect(()=>apply({type:'status-visible',reportId:'party',column:'NONEXISTENT',visible:false})).toThrow();
  });
  it('does not couple Không phải trình visibility to its denominator',()=>{
    const original=base(),itemCount=createDemoItems(24);
    const before=aggregateReport(itemCount,configuredReports(original,true)[0],'department').total;
    const shown=apply({type:'status-visible',reportId:'party',column:'Không phải trình',visible:true});
    expect(shown[0].includeNotRequired).toBe(false);
    expect(shown[0].showNotRequiredColumn).toBe(true);
    expect(inlineHiddenColumns(shown[0])).not.toContain('Không phải trình');
    const after=aggregateReport(itemCount,configuredReports(shown,true)[0],'department').total;
    expect(after).toBe(before);
    const hidden=apply({type:'status-visible',reportId:'party',column:'Không phải trình',visible:false},shown);
    expect(hidden[0].includeNotRequired).toBe(false);
    expect(inlineHiddenColumns(hidden[0])).toContain('Không phải trình');
  });
  it('bounds widths and blocks unknown synthetic status from saving',()=>{
    const resized=apply({type:'column-width',reportId:'nq',column:'__percent',width:250});
    expect(resized.find(row=>row.id==='nq')?.columnWidths?.__percent).toBe(250);
    expect(()=>apply({type:'column-width',reportId:'nq',column:'__percent',width:79})).toThrow();
    expect(()=>apply({type:'column-width',reportId:'nq',column:'__percent',width:1201})).toThrow();
    expect(()=>apply({type:'column-width',reportId:'nq',column:'fake',width:200})).toThrow();
  });
  it('keeps unknown actions invalid and leaves original immutable',()=>{
    const original=base(),snapshot=JSON.stringify(original);
    expect(()=>apply({type:'rename',reportId:'no-such-id',title:'Invalid'},original)).toThrow();
    expect(JSON.stringify(original)).toBe(snapshot);
  });
});
