import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems,validateCatalog} from '../src/data/catalogs';
import {ReportTable} from '../src/features/reports/ReportTable';
import {DEFAULT_REPORTS} from '../src/domain/reporting';
import {reportReferenceGroupRows,reportReferenceStatusColumn,renameReportGroupIdentity,
  REPORT_REFERENCE_COLUMN as RC,REPORT_REFERENCE_ROW as RR} from '../src/domain/report-reference-identity';
import {uiReferenceReportCellCode,uiReferenceShortCode} from '../src/qa/ui-reference-codes';
import type {Item} from '../shared/types';

const base=():Item[]=>createDemoItems(6).map((item,i)=>({
  ...item,isDropped:false,archivedAt:null,
  documentKind:'NQ',type:'QPPL',
  progressCouncil:i%2===0?'Sở chưa trình':'Hoàn thành',
  room:i<3?'Phòng A':'Phòng B'
}));

describe('UI 05/11 report matrix semantic identity (no label/index keys)',()=>{
  it('keeps confirmed registry group IDs across member churn, explicit rename and reload',()=>{
    const items=base(),catalog=catalogFromItems(items);
    const original=reportReferenceGroupRows(items,'room',catalog.groupIdentities);
    const afterAdd=reportReferenceGroupRows([{...items[0],recordId:'r00'},...items],'room',catalog.groupIdentities);
    const afterRemove=reportReferenceGroupRows(items.filter((_,index)=>index!==0),'room',catalog.groupIdentities);
    expect(afterAdd.get('Phòng A')).toBe(original.get('Phòng A'));
    expect(afterRemove.get('Phòng A')).toBe(original.get('Phòng A'));
    let registry=renameReportGroupIdentity(catalog.groupIdentities,'room','Phòng A','Tên phòng sau đổi');
    registry=renameReportGroupIdentity(registry,'room','Phòng B','Phòng B mới');
    const renamed=JSON.parse(JSON.stringify(items)).map((item:Item)=>({
      ...item,room:item.room==='Phòng A'?'Tên phòng sau đổi':'Phòng B mới'
    })) as Item[];
    const changed=reportReferenceGroupRows(renamed.reverse(),'room',registry);
    expect(changed.get('Tên phòng sau đổi')).toBe(original.get('Phòng A'));
    expect(changed.get('Phòng B mới')).toBe(original.get('Phòng B'));
    expect(original.get('Phòng A')).not.toBe(original.get('Phòng B'));
    // Persisted shared/catalog profile survives JSON round trip and source sort.
    const saved=validateCatalog({...catalog,groupIdentities:registry});
    expect(reportReferenceGroupRows(renamed,'room',
      validateCatalog(JSON.parse(JSON.stringify(saved))).groupIdentities)).toEqual(changed);
    expect([...original.values()].every(x=>x.startsWith('group:room:'))).toBe(true);
  });
  it('uses source status field + canonical business value, not displayed report title',()=>{
    const cfg=DEFAULT_REPORTS[2];
    expect(reportReferenceStatusColumn(cfg,'Sở chưa trình')).toBe(
      reportReferenceStatusColumn({...cfg,title:'Báo cáo đã đổi tên'},'Sở chưa trình'));
    expect(reportReferenceStatusColumn(cfg,'Hoàn thành')).not.toBe(
      reportReferenceStatusColumn(cfg,'Sở chưa trình'));
    expect(reportReferenceStatusColumn(cfg,'Chưa chuẩn hóa')).toBe(RC.unknown);
  });
  it('gives separate codes to each numerical cell including grand totals',()=>{
    const items=base();
    const cfg=DEFAULT_REPORTS[2];
    const row=reportReferenceGroupRows(items,'room').get('Phòng A')!;
    const statusA=reportReferenceStatusColumn(cfg,'Sở chưa trình');
    const statusB=reportReferenceStatusColumn(cfg,'Hoàn thành');
    const first=uiReferenceReportCellCode('council',row,statusA);
    const second=uiReferenceReportCellCode('council',row,statusB);
    expect(first).toMatch(/^R03\.CELL\./);
    expect(second).toMatch(/^R03\.CELL\./);
    expect(first).not.toBe(second);
    expect(uiReferenceReportCellCode('council',RR.grand,RC.total))
      .not.toBe(uiReferenceReportCellCode('council',RR.grand,RC.percent));
    expect(uiReferenceReportCellCode('council',row,RC.total))
      .not.toBe(uiReferenceReportCellCode('council',RR.grand,RC.total));
    expect(uiReferenceReportCellCode('unknown',row,statusA)).toBeNull();
    expect(uiReferenceReportCellCode('council','',statusA)).toBeNull();
    expect(uiReferenceReportCellCode('council',row,'')).toBeNull();
  });
  it('shows distinct compact numeric codes while retaining the full semantic ID for copy',()=>{
    const first=uiReferenceReportCellCode('party','record:demo-0001',RC.percent)!;
    const second=uiReferenceReportCellCode('party','record:demo-0002',RC.percent)!;
    const shortA=uiReferenceShortCode(first),shortB=uiReferenceShortCode(second);
    expect(shortA).toMatch(/^R01·[0-9a-z]{7}$/);
    expect(shortA).not.toBe(first);
    expect(shortA).not.toBe(shortB);
    expect(uiReferenceShortCode('L06.1@demo-0001')).toBe('L06.1');
  });
  it('renders stable report attributes on all headers, body, totals, percentages and empty row',()=>{
    const items=base(),cfg=DEFAULT_REPORTS[2];
    const html=renderToStaticMarkup(<ReportTable items={items} config={cfg}
      group="room" groupOrder={[]} onSelect={()=>{}}/>);
    const ids=reportReferenceGroupRows(items,'room');
    expect(html).toContain('data-ui-reference-report="council"');
    for(const id of ids.values())expect(html).toContain('data-ui-reference-report-row="'+id+'"');
    expect(html).toContain('data-ui-reference-report-row="'+RR.header+'"');
    expect(html).toContain('data-ui-reference-report-row="'+RR.grand+'"');
    for(const key of [RC.group,RC.total,RC.percent])
      expect(html).toContain('data-ui-reference-report-column="'+key+'"');
    for(const column of cfg.columns)expect(html).toContain(
      'data-ui-reference-report-column="'+reportReferenceStatusColumn(cfg,column)+'"');
    const renderedAgain=renderToStaticMarkup(<ReportTable items={items.slice().reverse()}
      config={{...cfg,title:'Một tên bảng báo cáo khác'}} group="room"
      groupOrder={['Phòng B','Phòng A']} onSelect={()=>{}}/>);
    for(const id of ids.values())expect(renderedAgain).toContain(
      'data-ui-reference-report-row="'+id+'"');
    const empty=renderToStaticMarkup(<ReportTable items={[]} config={cfg}
      group="room" groupOrder={[]} onSelect={()=>{}}/>);
    expect(empty).toContain('data-ui-reference-report-row="'+RR.empty+'"');
    expect(empty).toContain('data-ui-reference-report-column="'+RC.empty+'"');
  });
});
