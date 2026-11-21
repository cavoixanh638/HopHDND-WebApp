import {describe,expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ReportTable} from '../src/features/reports/ReportTable';
import {createDemoItems} from '../src/data/demo-items';
import {defaultReportLayout,configuredReports,validateReportLayout} from '../src/data/report-preferences';
import {applyInlineReportAction} from '../src/features/reports/inline-g02-report-actions';
import {aggregateReport} from '../src/domain/reporting';
import {readFileSync} from 'node:fs';

const items=createDemoItems(12);
const base=defaultReportLayout();
const report=configuredReports(base,true)[0];
const view=(quickVisibility:boolean)=>renderToStaticMarkup(createElement(ReportTable,{
  items,config:report,group:'department',onSelect:vi.fn(),
  onInlineAction:vi.fn(),inlineEditing:false,quickVisibility,
}));
const appSource=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
const popupSource=readFileSync(new URL('../src/features/reports/ReportDetailGrid.tsx',import.meta.url),'utf8');

describe('normal-view Admin report visibility',()=>{
  it('shows inline column tools only to an explicitly permitted Admin',()=>{
    const guest=view(false),admin=view(true);
    expect(guest).not.toContain('inline-excel-report-trigger');
    expect(guest).not.toContain('inline-excel-report-bar');
    expect(admin).toContain('inline-excel-report-trigger');
    expect(admin).toContain('Cột đã ẩn');
    expect(admin).toContain('Tùy chọn ẩn hiện cột');
    expect(admin).not.toContain('inline-g02-table-actions');
  });
  it('routes only status-visible actions outside advanced edit through the existing writer',()=>{
    expect(appSource).toContain("(!inlineEditing&&action.type!=='status-visible')");
    expect(appSource).toContain('quickVisibility={inlineAllowed}');
    expect(appSource).toContain("firebaseEditRevision.current=firebase?.profile?.revision??0");
    expect(appSource).toContain("saveLayout(next)");
    expect(popupSource).toContain('quickVisibility={mayCustomize&&!showAll}');
    expect(popupSource).toContain('onShow={key=>togglePopupColumns([key],true)}');
  });
  it('hiding a report status changes only its presentation, never totals or records',()=>{
    const source=JSON.stringify(items);
    const countBefore=aggregateReport(items,report,'department');
    const status=report.columns.find(col=>col!=='Không phải trình')!;
    const next=validateReportLayout(applyInlineReportAction(base,{
      type:'status-visible',reportId:report.id,column:status,visible:false,
    }));
    const after=aggregateReport(items,configuredReports(next,true)[0],'department');
    expect(after.total).toBe(countBefore.total);
    expect(after.completedCount).toBe(countBefore.completedCount);
    expect(JSON.stringify(items)).toBe(source);
    expect(next[0].hiddenColumns).toContain(status);
  });
});
