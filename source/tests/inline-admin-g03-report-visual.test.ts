import {describe,expect,it,vi} from 'vitest';
import {
  configuredReports,defaultReportLayout,getReportFontSize,getReportVariant,
  REPORT_VARIANTS,TABLE_FONT_OPTIONS,validateReportLayout,
} from '../src/data/report-preferences';
import {createDemoItems} from '../src/data/demo-items';
import {aggregateReport,getKpis} from '../src/domain/reporting';
import {
  inlineG03ApplyVisualChange,inlineG03RestoreVisual,
  inlineG03VisualEqual,inlineG03VisualValue,
} from '../src/features/settings/inline-g03-report-visual-adapter';

describe('G03 presentation-only inline report adapter',()=>{
  it('supports exactly all five existing styles on every preview and keeps one canonical shared owner',()=>{
    expect(REPORT_VARIANTS.map(row=>row.value)).toEqual(['classic','signal','compact','bars','band']);
    for(const variant of REPORT_VARIANTS){
      const base=defaultReportLayout();
      const next=inlineG03ApplyVisualChange(base,'bc',{reportVariant:variant.value});
      expect(getReportVariant(next)).toBe(variant.value);
      expect(configuredReports(next,true).every(row=>row.reportVariant===variant.value)).toBe(true);
      expect(next.filter(row=>row.reportVariant!==undefined)).toHaveLength(1);
      expect(next.find(row=>row.id==='party')?.reportVariant).toBe(variant.value);
      expect(base).toEqual(defaultReportLayout());
      expect(validateReportLayout(next)).toEqual(next);
    }
  });
  it('changes each supported font and integer size 11 through 20, without mutating input',()=>{
    for(const font of TABLE_FONT_OPTIONS){
      for(let size=11;size<=20;size++){
        const base=defaultReportLayout();
        const next=inlineG03ApplyVisualChange(base,'nq',{tableFont:font.value,tableFontSize:size});
        expect(configuredReports(next,true)).toHaveLength(5);
        expect(configuredReports(next,true).every(row=>row.tableFont===font.value&&row.tableFontSize===size)).toBe(true);
        expect(getReportFontSize(next)).toBe(size);
        expect(base).toEqual(defaultReportLayout());
        expect(validateReportLayout(next)).toEqual(next);
      }
    }
  });
  it('separates per-report emphasis and long title highlighting from global style',()=>{
    const base=defaultReportLayout();
    const title='Nghị quyết '.repeat(13) + 'Nghị quyết';
    const b=base.map(row=>row.id==='bc'?{...row,title}:row);
    const next=inlineG03ApplyVisualChange(b,'bc',{
      titleAccentText:'Nghị quyết',titleAccentColor:'#009955',emphasizeProgress:false,
    });
    const reports=configuredReports(next,true);
    expect(reports.find(row=>row.id==='bc')?.titleAccentText).toBe('Nghị quyết');
    expect(reports.find(row=>row.id==='bc')?.titleAccentColor).toBe('#009955');
    expect(reports.find(row=>row.id==='bc')?.emphasizeProgress).toBe(false);
    expect(reports.filter(row=>row.id!=='bc').every(row=>row.emphasizeProgress)).toBe(true);
    expect(next.find(row=>row.id==='bc')?.title).toBe(title);
    expect(next.find(row=>row.id==='party')?.titleAccentText).toBeUndefined();
    expect(validateReportLayout(next)).toEqual(next);
  });
  it('rejects bogus, overflowing, fractional and untrusted values with no business changes',()=>{
    const base=defaultReportLayout();
    const unchanged=inlineG03ApplyVisualChange(base,'nq',{
      tableFont:'bogus' as never,tableFontSize:20.5,reportVariant:'injected' as never,
      titleAccentColor:'javascript:evil',titleAccentText:'x'.repeat(81),
    });
    expect(unchanged).toEqual(base);
    expect(inlineG03ApplyVisualChange(base,'unknown',{tableFontSize:20})).toBe(base);
    for(const invalid of [-1,10,21,NaN,Infinity]){
      expect(inlineG03ApplyVisualChange(base,'party',{tableFontSize:invalid})).toEqual(base);
    }
  });
  it('cancel reverses visual edits only, preserving unrelated unfinished layout changes',()=>{
    const saved=defaultReportLayout();
    const changed=inlineG03ApplyVisualChange(saved,'bc',{
      tableFont:'inter',tableFontSize:20,reportVariant:'bars',
      emphasizeProgress:false,titleAccentText:'Nghị quyết',titleAccentColor:'#778899',
    }).map(row=>row.id==='bc'?{...row,visible:false,title:'Tên riêng',columnWidths:{__group:355}}:row);
    const reset=inlineG03RestoreVisual(changed,saved,'bc');
    expect(inlineG03VisualEqual(inlineG03VisualValue(saved,'bc'),inlineG03VisualValue(reset,'bc'))).toBe(true);
    expect(reset.find(row=>row.id==='bc')).toMatchObject({
      visible:false,title:'Tên riêng',columnWidths:{__group:355},
    });
    expect(validateReportLayout(reset)).toEqual(reset);
    expect(inlineG03RestoreVisual(changed,saved,'missing')).toBe(changed);
  });
  it('visual edits never change counters, ratios, or Không phải trình business rules',()=>{
    const items=createDemoItems(25),base=defaultReportLayout();
    const before=configuredReports(base,true);
    const next=inlineG03ApplyVisualChange(
      inlineG03ApplyVisualChange(base,'party',{reportVariant:'signal',tableFontSize:18,tableFont:'roboto'}),
      'party',{titleAccentText:'Tiến độ',emphasizeProgress:false});
    const after=configuredReports(next,true);
    expect(after.map(row=>row.id)).toEqual(before.map(row=>row.id));
    for(let index=0;index<before.length;index++){
      const a=aggregateReport(items,before[index],'department');
      const b=aggregateReport(items,after[index],'department');
      expect({total:b.total,percent:b.percent,completedCount:b.completedCount,hiddenCount:b.hiddenCount})
        .toEqual({total:a.total,percent:a.percent,completedCount:a.completedCount,hiddenCount:a.hiddenCount});
      expect(after[index].includeNotRequired).toEqual(before[index].includeNotRequired);
    }
    expect(getKpis(items)).toEqual(getKpis(createDemoItems(25)));
  });
});
