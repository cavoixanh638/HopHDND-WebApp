import {describe,it,expect} from 'vitest';
import {aggregateReport,DEFAULT_REPORTS} from '../src/domain/reporting';
import {createDemoItems} from '../src/data/demo-items';
import {configuredReports,defaultReportLayout,validateReportLayout,reportHiddenColumns} from '../src/data/report-preferences';

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
  it('hides Không phải trình by default while keeping original stage in source',()=>{
    const layout=defaultReportLayout(),buildLayout=layout.find(row=>row.id==='build')!;
    expect(build.hiddenColumns).toContain('Không phải trình');
    expect(buildLayout.hiddenColumns).toContain('Không phải trình');
    expect(buildLayout.showNotRequiredColumn).toBe(false);
    const config=configuredReports(layout).find(row=>row.id==='build')!;
    const report=aggregateReport(fixture(),config,'department');
    expect(report.total).toBe(2);
    expect(report.columns).not.toContain('Không phải trình');
    expect(fixture()[0].progressBuild).toBe('Không phải trình');
  });
  it('migrates old layout without flag to hidden, keeps other user layouts, and remembers explicit reveal',()=>{
    const old=defaultReportLayout().map(row=>({...row,hiddenColumns:[...row.hiddenColumns]}));
    const buildRow=old.find(row=>row.id==='build')!;
    delete buildRow.showNotRequiredColumn;
    buildRow.hiddenColumns=[];
    const migrated=validateReportLayout(old),restored=migrated.find(row=>row.id==='build')!;
    expect(restored.hiddenColumns).toContain('Không phải trình');
    expect(restored.showNotRequiredColumn).toBe(false);
    expect(migrated.find(row=>row.id==='party')?.hiddenColumns).toEqual(['Không phải trình']);
    expect(reportHiddenColumns({...restored,showNotRequiredColumn:true})).not.toContain('Không phải trình');
    const shown=validateReportLayout(migrated.map(row=>row.id==='build'
      ?{...row,showNotRequiredColumn:true}:row));
    const visibleConfig=configuredReports(shown).find(row=>row.id==='build')!;
    expect(visibleConfig.hiddenColumns).not.toContain('Không phải trình');
    // Column visibility does NOT override the independent counting policy.
    expect(aggregateReport(fixture(),visibleConfig,'department').total).toBe(2);
    const including=validateReportLayout(shown.map(row=>row.id==='build'
      ?{...row,includeNotRequired:true}:row));
    const withExempt=configuredReports(including).find(row=>row.id==='build')!;
    expect(aggregateReport(fixture(),withExempt,'department').columns).toContain('Không phải trình');
    expect(aggregateReport(fixture(),withExempt,'department').total).toBe(3);
    expect(()=>validateReportLayout(shown.map(row=>row.id==='build'
      ?{...row,showNotRequiredColumn:'invalid' as any}:row))).toThrow('hiển thị');
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
    expect(configuredReports(updated).find(r=>r.id==='party')?.includeNotRequired).toBe(false);
    expect(configuredReports(validateReportLayout(old.map(row=>
      row.id==='build'?((({includeNotRequired:ignored,...rest})=>rest)(row)):row
    ))).find(r=>r.id==='build')?.includeNotRequired).toBe(false);
    expect(aggregateReport(fixture(),configuredReports(updated).find(r=>r.id==='build')!,'department').total).toBe(3);

    expect(()=>validateReportLayout(old.map(row=>row.id==='build'?{...row,includeNotRequired:'no'}:row))).toThrow();
  });
});
