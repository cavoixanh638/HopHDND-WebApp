import {describe,it,expect} from 'vitest';
import {aggregateReport,DEFAULT_REPORTS} from '../src/domain/reporting';
import {createDemoItems} from '../src/data/demo-items';
import {configuredReports,defaultReportLayout,validateReportLayout} from '../src/data/report-preferences';

const build=DEFAULT_REPORTS.find(report=>report.id==='build')!;
const fixture=()=>{
  const [a,b,c]=createDemoItems(3);
  return [
    {...a,documentKind:'NQ' as const,progressBuild:'Không phải trình',isDropped:false,archivedAt:undefined},
    {...b,documentKind:'NQ' as const,progressBuild:'Sở chưa trình',isDropped:false,archivedAt:undefined},
    {...c,documentKind:'NQ' as const,progressBuild:'Đã có QĐ chấp thuận',isDropped:false,archivedAt:undefined},
  ];
};
describe('Build NQ counting option preserves source and existing default',()=>{
  it('includes Không phải trình in the denominator by default',()=>{
    const report=aggregateReport(fixture(),build,'department');
    expect(report.total).toBe(3);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(33);
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
  it('keeps saved older report profiles inclusive and supports a persistent dropdown value',()=>{
    const old=defaultReportLayout();
    expect(configuredReports(validateReportLayout(old)).find(r=>r.id==='build')?.includeNotRequired).toBe(true);
    const updated=validateReportLayout(old.map(row=>row.id==='build'?{...row,includeNotRequired:false}:row));
    expect(configuredReports(updated).find(r=>r.id==='build')?.includeNotRequired).toBe(false);
    expect(configuredReports(updated).find(r=>r.id==='party')?.includeNotRequired).toBeUndefined();
    expect(()=>validateReportLayout(old.map(row=>row.id==='build'?{...row,includeNotRequired:'no'}:row))).toThrow();
  });
});
