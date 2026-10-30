import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import type {Item} from '../shared/types';
import {PARTY_LEVEL_OPTIONS,STATUS_OPTIONS} from '../shared/field-definitions';
import {canonicalStatus,isRecognizedStatus,OFFICIAL_STATUS_CHOICES} from '../src/domain/status-contract';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems,mergeCatalogItems} from '../src/data/catalogs';
import {DEFAULT_REPORTS,aggregateReport,normalizeReportStatus,reportItems,getKpis} from '../src/domain/reporting';
import {reportStage} from '../src/domain/report-workflow';
import {summarizeListItems,filterListBySummary} from '../src/domain/item-summary';
import {newToolbarState,filterToolbarRows,exactChoices} from '../src/features/items/list-toolbar-filters';
import {progressTone} from '../src/domain/progress-visual';
import {BUSINESS_HEADERS,parseBusinessExcel} from '../src/data/business-excel';
import {createExcel,readExcel} from '../src/data/excel-transfer';
import {defaultReportLayout,validateReportLayout,configuredReports} from '../src/data/report-preferences';

const seed=createDemoItems(1)[0];
const mk=(id:string,fields:Partial<Item>={}):Item=>({...seed,recordId:id,
  displayCode:id,stt:1,isDropped:false,archivedAt:null,
  documentKind:'NQ',type:'QPPL',partyLevel:'BTV TU',
  progressParty:'Sở chưa trình',progressBuild:'Sở chưa trình',
  progressCouncil:'Sở chưa trình',...fields});
const ids=(items:readonly Item[])=>items.map(item=>item.recordId);
const workbook=(values:unknown[][])=>{
  const book=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(values),'Hồ sơ');
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
};
const excelRow=(code:string,stt:number,level:string,party:string,build:string,council:string)=>
  [code,stt,'Hồ sơ kiểm chứng','Sở Kiểm thử','QPPL',level,party,build,council,
    'Nguyễn An','Phòng Tổng hợp','Lãnh đạo VP','Lãnh đạo UBND','Tiến độ hiện tại','Ghi chú'];

describe('V3 L3 official status contract, no source rewrites',()=>{
  it('exposes exactly four fields and official labels in approved order',()=>{
    expect(PARTY_LEVEL_OPTIONS).toEqual(['TTTU','BTV TU','BCH','Không phải trình']);
    expect(STATUS_OPTIONS.progressParty).toEqual([
      'Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU',
      'ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL']);
    expect(STATUS_OPTIONS.progressBuild).toEqual([
      'Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ']);
    expect(STATUS_OPTIONS.progressCouncil).toEqual([
      'Sở chưa trình','VP đang xử lý','Hoàn thành']);
    expect(Object.keys(OFFICIAL_STATUS_CHOICES)).toEqual([
      'partyLevel','progressParty','progressBuild','progressCouncil']);
    expect(STATUS_OPTIONS.progressParty).not.toContain('Bước tiếp theo');
  });

  it('accepts safe field-specific old aliases while preserving unknown/ambiguous originals',()=>{
    const scenarios=[
      ['partyLevel','Ban Chấp hành','BCH'],
      ['partyLevel','BTV','BTV TU'],
      ['partyLevel','Không phải xin ý kiến','Không phải trình'],
      ['progressParty','VP đang thực hiện','VP đang xử lý'],
      ['progressParty','ĐU đã gửi TU, chưa họp','ĐU gửi TU, chưa họp'],
      ['progressParty','Đã họp/xin phiếu, chưa có TBKL','Đã xin ý kiến, chờ TBKL'],
      ['progressParty','Không phải xin ý kiến','Không phải trình'],
      ['progressBuild','Không phải trình xây dựng NQ','Không phải trình'],
      ['progressBuild','Đã trình HĐND, chưa có QĐ','Đã trình, chờ QĐ'],
      ['progressBuild','Đã có QĐ chấp thuận','Đã có QĐ'],
      ['progressCouncil','Đã trình HĐND thành phố','Hoàn thành'],
      ['progressCouncil','VP đang thực hiện','VP đang xử lý'],
    ] as const;
    for(const [field,old,modern] of scenarios){
      expect(canonicalStatus(field,old)).toBe(modern);
      expect(isRecognizedStatus(field,old)).toBe(true);
    }
    for(const value of ['TU đã cho ý kiến','Đã báo cáo TU','Không xác định','']){
      expect(canonicalStatus('progressParty',value)).toBe(value);
      expect(isRecognizedStatus('progressParty',value)).toBe(false);
    }
    expect(canonicalStatus('progressBuild','Đã có TBKL')).toBe('Đã có TBKL');
    expect(isRecognizedStatus('progressBuild','Đã có TBKL')).toBe(false);
    expect(canonicalStatus('progressCouncil','Đã trình, chờ QĐ')).toBe('Đã trình, chờ QĐ');
    expect(isRecognizedStatus('progressCouncil','Đã trình, chờ QĐ')).toBe(false);
  });

  it('overrides only status choice projections from old saved catalogs and source observation',()=>{
    const items=[mk('NQ01',{partyLevel:'Ban Chấp hành',progressParty:'ĐU đã gửi TU, chưa họp',
      progressBuild:'Đã trình HĐND, chưa có QĐ',progressCouncil:'Đã trình HĐND thành phố'})];
    const before=JSON.stringify(items);
    const original=catalogFromItems(items);
    for(const [key,options] of Object.entries(OFFICIAL_STATUS_CHOICES)){
      expect(original.options[key as keyof typeof original.options]).toEqual(options);
    }
    const saved=structuredClone(original);
    saved.options.progressParty=['VP đang thực hiện','ĐU đã gửi TU, chưa họp','Đã có TBKL'];
    saved.options.progressBuild=['Đã trình HĐND, chưa có QĐ'];
    saved.options.partyLevel=['Ban Chấp hành','BTV','Không phải xin ý kiến'];
    saved.options.progressCouncil=['Đã trình HĐND thành phố'];
    saved.options.department.unshift('Đơn vị được đặt riêng');
    const merged=mergeCatalogItems(saved,items);
    expect(merged.options.progressParty).toEqual(STATUS_OPTIONS.progressParty);
    expect(merged.options.progressBuild).toEqual(STATUS_OPTIONS.progressBuild);
    expect(merged.options.progressCouncil).toEqual(STATUS_OPTIONS.progressCouncil);
    expect(merged.options.partyLevel).toEqual(PARTY_LEVEL_OPTIONS);
    expect(merged.options.department[0]).toBe('Đơn vị được đặt riêng');
    expect(JSON.stringify(items)).toBe(before);
    expect(saved.options.progressParty[0]).toBe('VP đang thực hiện');
  });

  it('counts Party next exactly three details while retaining raw labels and active eligibility',()=>{
    const values=['Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU',
      'ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL',
      'ĐU đã gửi TU, chưa họp','Đã họp/xin phiếu, chưa có TBKL',
      'TU đã cho ý kiến',''];
    const rows=values.map((value,i)=>mk('n'+i,{progressParty:value}));
    rows.push(mk('no-party',{partyLevel:'Không phải trình',progressParty:'Đã có TBKL'}));
    rows.push(mk('dropped',{isDropped:true,progressParty:'Đã có TBKL'}));
    rows.push(mk('archived',{archivedAt:'2026-10-01',progressParty:'Đã có TBKL'}));
    const original=JSON.stringify(rows);
    const report=aggregateReport(rows,DEFAULT_REPORTS[0],'department');
    expect(report.total).toBe(10); // 11 statuses minus not-required; three inactive/level ineligible excluded
    expect(report.completedCount).toBe(1);
    expect(report.percent).toBe(10);
    const stage=summarizeListItems(rows).stages.find(s=>s.id==='party')!;
    expect(stage.buckets.find(b=>b.stage==='next')!.ids).toEqual(['n3','n4','n5','n7','n8']);
    expect(ids(filterListBySummary(rows,{report:'party',stage:'next'}))).toEqual(['n3','n4','n5','n7','n8']);
    expect(stage.unmatchedIds).toEqual(['n9','n10']);
    expect(JSON.stringify(rows)).toBe(original);
    expect(rows[8].progressParty).toBe('Đã họp/xin phiếu, chưa có TBKL');
    const notRequired={...DEFAULT_REPORTS[0],includeNotRequired:true};
    expect(reportItems(rows,notRequired)).toHaveLength(12);
    expect(aggregateReport(rows,notRequired,'department').completedCount).toBe(2);
  });

  it('treats build pending QĐ as intermediate and council done only as done',()=>{
    const build=['Không phải trình','Sở chưa trình','VP đang xử lý',
      'Đã trình, chờ QĐ','Đã có QĐ','Đã trình HĐND, chưa có QĐ','Đã có QĐ chấp thuận',
      'Không rõ',''];
    const rows=build.map((value,i)=>mk('b'+i,{progressBuild:value,
      progressCouncil:i===4?'Hoàn thành':i===6?'Đã trình HĐND thành phố':'VP đang xử lý'}));
    const config=DEFAULT_REPORTS[1];
    const report=aggregateReport(rows,config,'department');
    expect(report.total).toBe(7); // exclude not-required and blank
    expect(report.completedCount).toBe(2); // only approval, plus old explicit approval
    expect(report.percent).toBe(29);
    expect(ids(filterListBySummary(rows,{report:'build',stage:'next'}))).toEqual(['b3','b5']);
    expect(reportStage('Đã trình, chờ QĐ',config)).toBe('next');
    expect(reportStage('Đã trình HĐND, chưa có QĐ',config)).toBe('next');
    expect(reportStage('Không phải trình',config)).toBe('excluded');
    expect(report.unknown).toEqual(['Không rõ']);
    const council=aggregateReport(rows,DEFAULT_REPORTS[2],'department');
    expect(council.completedCount).toBe(2);
    expect(getKpis(rows).completed).toBe(2);
    expect(progressTone('progressBuild','Đã trình, chờ QĐ')).toBeNull();
    expect(progressTone('progressBuild','Không phải trình')).toBeNull();
    expect(progressTone('progressCouncil','Hoàn thành')).toBe('done');
    expect(progressTone('progressCouncil','Không phải trình')).toBeNull();
  });

  it('detail filter choices and predicates treat old and new labels identically without altering rows',()=>{
    const rows=[
      mk('p1',{progressParty:'ĐU đã gửi TU, chưa họp',partyLevel:'Ban Chấp hành'}),
      mk('p2',{progressParty:'ĐU gửi TU, chưa họp',partyLevel:'BCH'}),
      mk('p3',{progressParty:'Đã họp/xin phiếu, chưa có TBKL'}),
      mk('p4',{progressParty:'TU đã cho ý kiến'})
    ];
    expect(exactChoices(rows,'progressParty').slice(0,7)).toEqual(STATUS_OPTIONS.progressParty);
    expect(exactChoices(rows,'progressParty')).toContain('TU đã cho ý kiến');
    expect(exactChoices(rows,'progressParty')).not.toContain('ĐU đã gửi TU, chưa họp');
    const state=newToolbarState();
    state.details.progressParty='ĐU gửi TU, chưa họp';
    expect(ids(filterToolbarRows(rows,state))).toEqual(['p1','p2']);
    state.details.progressParty='Đã xin ý kiến, chờ TBKL';
    expect(ids(filterToolbarRows(rows,state))).toEqual(['p3']);
    state.details.progressParty='';state.details.partyLevel='BCH';
    expect(ids(filterToolbarRows(rows,state))).toEqual(['p1','p2']);
    expect(rows[0].partyLevel).toBe('Ban Chấp hành');
  });

  it('loads saved report layouts with old headings and widths, keeping custom title and order',()=>{
    const previous=defaultReportLayout();
    previous[0].title='Báo cáo riêng của quản trị';
    previous[0].columnOrder=previous[0].columnOrder.map(label=>
      label==='VP đang xử lý'?'VP đang thực hiện':
      label==='ĐU gửi TU, chưa họp'?'ĐU đã gửi TU, chưa họp':label);
    previous[0].hiddenColumns=['ĐU đã gửi TU, chưa họp'];
    previous[0].columnWidths={'ĐU đã gửi TU, chưa họp':216,'__group':300};
    previous[1].columnOrder=previous[1].columnOrder.map(label=>
      label==='Đã trình, chờ QĐ'?'Đã trình HĐND, chưa có QĐ':
      label==='Đã có QĐ'?'Đã có QĐ chấp thuận':label);
    previous[2].columnOrder=previous[2].columnOrder.map(label=>
      label==='Hoàn thành'?'Đã trình HĐND thành phố':label);
    const validated=validateReportLayout(previous);
    expect(validated[0].title).toBe('Báo cáo riêng của quản trị');
    expect(validated[0].columnOrder).toEqual(DEFAULT_REPORTS[0].columns);
    expect(validated[0].columnWidths?.['ĐU gửi TU, chưa họp']).toBe(216);
    expect(validated[0].columnWidths?.__group).toBe(300);
    expect(validated[0].hiddenColumns).toContain('ĐU gửi TU, chưa họp');
    expect(validated[1].columnOrder).toEqual(DEFAULT_REPORTS[1].columns);
    expect(validated[2].columnOrder).toEqual(DEFAULT_REPORTS[2].columns);
    expect(configuredReports(validated)[0].columns).toEqual(DEFAULT_REPORTS[0].columns);
    expect(previous[0].columnOrder).toContain('ĐU đã gửi TU, chưa họp');
  });

  it('validates A–O F–I with old safe aliases but keeps text, code and STT unchanged',()=>{
    const values=[
      excelRow('NQ101',27,'BTV TU','Đã gửi ĐU','Đã trình, chờ QĐ','Hoàn thành'),
      excelRow('NQ102',28,'Ban Chấp hành','ĐU đã gửi TU, chưa họp',
        'Đã trình HĐND, chưa có QĐ','Đã trình HĐND thành phố'),
    ];
    const parsed=parseBusinessExcel(workbook([[...BUSINESS_HEADERS],...values]),'Hồ sơ');
    expect(parsed.count).toBe(2);
    expect(parsed.items.map(i=>[i.displayCode,i.stt])).toEqual([['NQ101',27],['NQ102',28]]);
    expect(parsed.items[1].partyLevel).toBe('Ban Chấp hành');
    expect(parsed.items[1].progressParty).toBe('ĐU đã gửi TU, chưa họp');
    expect(parsed.items[1].progressBuild).toBe('Đã trình HĐND, chưa có QĐ');
    expect(parsed.items[1].progressCouncil).toBe('Đã trình HĐND thành phố');
    const internal=readExcel(createExcel(parsed.items)).items;
    expect(internal.map(i=>[i.recordId,i.displayCode,i.stt])).toEqual(
      parsed.items.map(i=>[i.recordId,i.displayCode,i.stt]));
    expect(internal.map(i=>i.progressParty)).toEqual(parsed.items.map(i=>i.progressParty));
    expect(canonicalStatus('progressParty',internal[1].progressParty)).toBe('ĐU gửi TU, chưa họp');
    const badF=[...values[0]];badF[5]='Thành ủy';
    expect(()=>parseBusinessExcel(workbook([[...BUSINESS_HEADERS],badF]),'Hồ sơ'))
      .toThrow('dòng 2, cột F: trạng thái chưa chuẩn hóa');
    const badH=[...values[0]];badH[7]='Đã có TBKL';
    expect(()=>parseBusinessExcel(workbook([[...BUSINESS_HEADERS],badH]),'Hồ sơ'))
      .toThrow('dòng 2, cột H: trạng thái chưa chuẩn hóa');
    const badG=[...values[0]];badG[6]='Bước tiếp theo';
    expect(()=>parseBusinessExcel(workbook([[...BUSINESS_HEADERS],badG]),'Hồ sơ'))
      .toThrow('dòng 2, cột G: trạng thái chưa chuẩn hóa');
  });
});
