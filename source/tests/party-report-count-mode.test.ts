import { describe,it,expect } from 'vitest';
import { DEFAULT_REPORTS,aggregateReport,normalizeReportStatus } from '../src/domain/reporting';
import { defaultReportLayout,validateReportLayout,configuredReports,reportHiddenColumns } from '../src/data/report-preferences';
import { createDemoItems } from '../src/data/demo-items';
import { reportStage } from '../src/domain/report-workflow';

const party=DEFAULT_REPORTS.find(config=>config.id==='party')!;
const fixture=()=>{
  const records=createDemoItems(5);
  const states=['Không phải trình','Sở chưa trình','Đã có TBKL','TU đã cho ý kiến','Không phải xin ý kiến'];
  return records.map((item,i)=>({...item,partyLevel:'BTV',progressParty:states[i],
    isDropped:false,archivedAt:null,department:'Sở kiểm thử'}));
};

describe('Tiến độ xin ý kiến Thành ủy: Không phải trình là trạng thái hợp lệ và được loại trừ mặc định',()=>{
  it('default total and completion omit exemptions, no false Chưa chuẩn hóa warning',()=>{
    const data=fixture(),before=JSON.stringify(data);
    const report=aggregateReport(data,party,'department');
    expect(party.columns).toContain('Không phải trình');
    expect(party.hiddenColumns).toContain('Không phải trình');
    expect(party.includeNotRequired).toBe(false);
    expect(report.total).toBe(3);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(33);
    expect(report.columns).not.toContain('Không phải trình');
    expect(report.unknown).toEqual(['TU đã cho ý kiến']);
    expect(report.rows.get('Sở kiểm thử')?.get('Chưa chuẩn hóa')).toHaveLength(1);
    expect(JSON.stringify(data)).toBe(before);
  });
  it('separates count inclusion from visibility and preserves detailed drilldown records',()=>{
    const data=fixture(),layout=defaultReportLayout();
    const shown=validateReportLayout(layout.map(row=>row.id==='party'
      ?{...row,showNotRequiredColumn:true}:row));
    const hidden=aggregateReport(data,configuredReports(shown)[0],'department');
    expect(hidden.total).toBe(3);
    expect(hidden.columns).toContain('Không phải trình');
    expect(hidden.rows.get('Sở kiểm thử')?.has('Không phải trình')).toBe(false);
    const included=validateReportLayout(shown.map(row=>row.id==='party'
      ?{...row,includeNotRequired:true}:row));
    const includedParty=configuredReports(included)[0];
    const report=aggregateReport(data,includedParty,'department');
    expect(report.total).toBe(5);
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(20);
    expect(report.columns).toContain('Không phải trình');
    expect(report.rows.get('Sở kiểm thử')?.get('Không phải trình')).toHaveLength(2);
    expect(report.unknown).toEqual(['TU đã cho ý kiến']);
    expect(reportStage('Không phải trình',includedParty)).toBe('excluded');
    expect(aggregateReport(data,{...includedParty,hiddenColumns:['Không phải trình']},'department').total).toBe(5);
  });
  it('recognizes variants and does not mistake discontinued Party milestones for completed',()=>{
    for(const input of ['Không phải trình','Không phải trình Thành ủy',
      'Không phải trình xin ý kiến Thành ủy','Không phải xin ý kiến','Không xin ý kiến']){
      expect(normalizeReportStatus(input,party)).toBe('Không phải trình');
    }
    expect(normalizeReportStatus('TU đã cho ý kiến',party)).toBe('TU đã cho ý kiến');
  });
  it('migrates old saved Party layouts without overwriting user column order, name, font and widths',()=>{
    const base=defaultReportLayout();
    const old=base.map(row=>({...row,hiddenColumns:[...row.hiddenColumns],
      columnOrder:[...row.columnOrder]}));
    const oldParty=old.find(row=>row.id==='party')!;
    oldParty.title='Bảng thành ủy tự chọn';
    oldParty.hiddenColumns=['Đã gửi ĐU'];
    oldParty.columnOrder=oldParty.columnOrder.filter(col=>col!=='Không phải trình').reverse();
    oldParty.columnWidths={'__total':222,'Đã gửi ĐU':173};
    oldParty.tableFontSize=17;
    delete oldParty.showNotRequiredColumn;
    delete oldParty.includeNotRequired;
    const migrated=validateReportLayout(old),saved=migrated.find(row=>row.id==='party')!;
    expect(saved.title).toBe(oldParty.title);
    expect(saved.tableFontSize).toBe(17);
    expect(saved.columnWidths).toEqual(oldParty.columnWidths);
    expect(saved.columnOrder.filter(col=>col!=='Không phải trình')).toEqual(oldParty.columnOrder);
    expect(saved.hiddenColumns).toEqual(expect.arrayContaining(['Đã gửi ĐU','Không phải trình']));
    expect(saved.showNotRequiredColumn).toBe(false);
    expect(saved.includeNotRequired).toBe(false);
    expect(reportHiddenColumns({...saved,showNotRequiredColumn:true})).not.toContain('Không phải trình');
    expect(configuredReports(migrated)[0].includeNotRequired).toBe(false);
    expect(migrated.find(row=>row.id==='build')?.showNotRequiredColumn).toBe(false);
  });
  it('rejects invalid count and visibility settings for Party but keeps other reports untouched',()=>{
    const rows=defaultReportLayout();
    expect(()=>validateReportLayout(rows.map(row=>row.id==='party'
      ?{...row,includeNotRequired:'bad' as any}:row))).toThrow();
    expect(()=>validateReportLayout(rows.map(row=>row.id==='party'
      ?{...row,showNotRequiredColumn:'bad' as any}:row))).toThrow();
    const explicit=validateReportLayout(rows.map(row=>row.id==='party'
      ?{...row,includeNotRequired:true,showNotRequiredColumn:true}:row));
    expect(explicit.find(row=>row.id==='party')?.includeNotRequired).toBe(true);
    expect(configuredReports(explicit)[0].hiddenColumns).not.toContain('Không phải trình');
    expect(explicit.find(row=>row.id==='build')).toEqual(rows.find(row=>row.id==='build'));
  });
});
