import {describe,it,expect} from 'vitest';
import {aggregateReport,DEFAULT_REPORTS} from '../src/domain/reporting';
import {createDemoItems} from '../src/data/demo-items';
import {configuredReports,defaultReportLayout,validateReportLayout} from '../src/data/report-preferences';

const build=DEFAULT_REPORTS.find(report=>report.id==='build')!;
const fixture=()=>{
  const [a,b,c]=createDemoItems(3);
  return [
    {...a,documentKind:'NQ' as const,progressBuild:'Không phải trình',isDropped:false,archivedAt:null},
    {...b,documentKind:'NQ' as const,progressBuild:'Sở chưa trình',isDropped:false,archivedAt:null},
    {...c,documentKind:'NQ' as const,progressBuild:'Đã có QĐ chấp thuận',isDropped:false,archivedAt:null},
  ];
};
describe('Build NQ excludes non-required items by default without touching the source',()=>{
  it('excludes Không phải trình in the denominator by default',()=>{
    const report=aggregateReport(fixture(),build,'department');
    expect(report.total).toBe(2);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(50);
    expect(report.rows.size).toBeGreaterThan(0);
  });
  it('excludes only Không phải trình from the scope, not from Excel',()=>{
    const original=fixture();
    const report=aggregateReport(original,{...build,includeNotRequired:false},'department');
    expect(report.total).toBe(2);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(50);
    expect(report.items.some(item=>item.progressBuild==='Không phải trình')).toBe(false);
    expect(original).toHaveLength(3);
    expect(original[0].progressBuild).toBe('Không phải trình');
  });
  it('normalizes the existing old non-required label before excluding it',()=>{
    const source=fixture().map((item,i)=>i===0?{...item,progressBuild:'Không phải trình xây dựng NQ'}:item);
    expect(aggregateReport(source,{...build,includeNotRequired:false},'department').total).toBe(2);
  });
  it('defaults missing or fresh profiles to exclusion, but respects an explicit saved inclusion',()=>{
    const old=defaultReportLayout();
    expect(configuredReports(validateReportLayout(old)).find(r=>r.id==='build')?.includeNotRequired).toBe(false);
    const updated=validateReportLayout(old.map(row=>row.id==='build'?{...row,includeNotRequired:true}:row));
    expect(configuredReports(updated).find(r=>r.id==='build')?.includeNotRequired).toBe(true);
    expect(configuredReports(updated).find(r=>r.id==='party')?.includeNotRequired).toBeUndefined();
    expect(configuredReports(validateReportLayout(old.map(row=>
      row.id==='build'?((({includeNotRequired:ignored,...rest})=>rest)(row)):row
    ))).find(r=>r.id==='build')?.includeNotRequired).toBe(false);
    expect(aggregateReport(fixture(),configuredReports(updated).find(r=>r.id==='build')!,'department').total).toBe(3);

    expect(()=>validateReportLayout(old.map(row=>row.id==='build'?{...row,includeNotRequired:'no'}:row))).toThrow();
  });
});
