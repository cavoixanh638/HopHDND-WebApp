import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {EXCEL_STATUS_CHOICES,DEFAULT_STATUS_CHOICE_KEYS,OFFICIAL_STATUS_CHOICES,canonicalStatus,excelStatusLabel,isRecognizedStatus,type StatusCatalogField} from '../src/domain/status-contract';
import {BUSINESS_HEADERS,parseBusinessExcel} from '../src/data/business-excel';
import {inspectWorkbookSchema} from '../src/data/business-excel-schema-fingerprint';
import {statusPickerValues,statusReadOnlyValue,statusEditSelection} from '../src/features/items/status-display';
import {catalogFromItems,mergeCatalogItems} from '../src/data/catalogs';
import {DEFAULT_REPORTS,aggregateReport} from '../src/domain/reporting';
import {exactChoices,newToolbarState,filterToolbarRows} from '../src/features/items/list-toolbar-filters';
import {printStageTone} from '../src/features/items/list-print';

const DROPLIST={
  partyLevel:['TTTU','BTV TU','BCH','Không'],
  progressParty:['Không phải trình','Sở chưa trình','VP đang xử lý','UB đã gửi ĐU','ĐU đã gửi TU, chưa họp','Đã họp/gửi phiếu, chờ TBKL','Đã có TBKL'],
  progressBuild:['Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'],
  progressCouncil:['Sở chưa trình','VP đang xử lý','Hoàn thành']
};
function book(){
  const rows:unknown[][]=[['','Bảng thử nghiệm'],[...BUSINESS_HEADERS],[],['','I','NGHỊ QUYẾT']];
  for(let i=1;i<=43;i++)rows.push(['NQ'+i,i,'Nghị quyết mẫu '+i,'Đơn vị mẫu',i<=13?'HC':'QPPL',
    'BTV TU',DROPLIST.progressParty[3+(i-1)%4],i<=13?'Không phải trình':'Đã có QĐ','Hoàn thành','','','','','','']);
  rows.push(['','II','BÁO CÁO']);
  for(let i=1;i<=12;i++)rows.push(['BC'+String(i).padStart(2,'0'),43+i,'Báo cáo mẫu '+i,'Đơn vị mẫu','BC','Không','Không phải trình','Không phải trình','Hoàn thành','','','','','','']);
  const w=XLSX.utils.book_new(),sheet=XLSX.utils.aoa_to_sheet(rows);
  for(let i=1;i<=43;i++){const r=i+4;sheet['A'+r]={t:'s',f:'CONCATENATE("NQ",B'+r+')',v:'NQ'+i};}
  XLSX.utils.book_append_sheet(w,sheet,'Các nội dung trình HĐND');
  const d=XLSX.utils.aoa_to_sheet([['','Cấp cho ý kiến','Xin ý kiến Thành ủy','Loại NQ','Trình HĐND xây dựng NQ','Trình HĐND ban hành'],
    ...Array.from({length:7},(_,i)=>['',DROPLIST.partyLevel[i],DROPLIST.progressParty[i],['QPPL','HC','BC'][i],DROPLIST.progressBuild[i],DROPLIST.progressCouncil[i]])]);
  XLSX.utils.book_append_sheet(w,d,'Droplist');w.Workbook={Sheets:[{Hidden:0},{Hidden:1}]};
  return w;
}
const name='Các nội dung trình HĐND';
const bytes=(w:XLSX.WorkBook)=>new Uint8Array(XLSX.write(w,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
describe('Owner Excel dropdown default and grouped workbook 28/11',()=>{
  it('shows exact source dropdown labels/order while preserving deployed wire keys',()=>{
    expect(EXCEL_STATUS_CHOICES).toEqual(DROPLIST);
    for(const field of Object.keys(DROPLIST) as StatusCatalogField[]){
      const keys=statusPickerValues(field,[]);
      expect(keys).toEqual(DEFAULT_STATUS_CHOICE_KEYS[field]);
      expect(keys.map(value=>statusReadOnlyValue(field,value))).toEqual(DROPLIST[field]);
      expect(new Set(keys)).toEqual(new Set(OFFICIAL_STATUS_CHOICES[field]));
      for(const label of DROPLIST[field])expect(isRecognizedStatus(field,label)).toBe(true);
    }
    expect(statusEditSelection('progressParty','UB đã gửi ĐU','Đã gửi ĐU')).toBeNull();
    expect(statusEditSelection('progressParty','Sở chưa trình','Đã gửi ĐU')).toBe('Đã gửi ĐU');
    expect(statusEditSelection('partyLevel','TTTU','BTV')).toBe('BTV');
    expect(excelStatusLabel('progressParty','TU đã cho ý kiến')).toBe('TU đã cho ý kiến');
    expect(isRecognizedStatus('progressBuild','UB đã gửi ĐU')).toBe(false);
  });
  it('accepts exact grouped source shape and all 55 records, keeping original values and IDs',()=>{
    const input=bytes(book()),inspection=inspectWorkbookSchema(input);
    expect(inspection.validSheets).toEqual([name]);
    const parsed=parseBusinessExcel(input,name);
    expect(parsed.count).toBe(55);
    expect(parsed.items.filter(i=>i.documentKind==='NQ')).toHaveLength(43);
    expect(parsed.items.filter(i=>i.documentKind==='BC')).toHaveLength(12);
    expect(parsed.items[0].partyLevel).toBe('BTV TU');
    expect(parsed.items[0].progressParty).toBe('UB đã gửi ĐU');
    expect(parsed.items[2].progressParty).toBe('Đã họp/gửi phiếu, chờ TBKL');
    expect(parsed.items[43].displayCode).toBe('BC01');
    expect(new Set(parsed.items.map(i=>i.recordId)).size).toBe(55);
    const report=aggregateReport(parsed.items,DEFAULT_REPORTS[0],'department');
    expect(report.unknown).toEqual([]);expect(report.total).toBe(43);
    expect(report.rows.get('Đơn vị mẫu')?.get('Đã gửi ĐU')).toHaveLength(11);
    expect(printStageTone('progressParty','UB đã gửi ĐU')).toBe('waiting');
    const state=newToolbarState();state.details.progressParty='UB đã gửi ĐU';
    expect(filterToolbarRows(parsed.items,state)).toHaveLength(11);
    const saved=catalogFromItems(parsed.items);
    saved.options.partyLevel=['Không','TTTU','BTV','BCH'];
    expect(mergeCatalogItems(saved,parsed.items).options.partyLevel).toEqual(DEFAULT_STATUS_CHOICE_KEYS.partyLevel);
    expect(exactChoices(parsed.items,'partyLevel')).toEqual(DEFAULT_STATUS_CHOICE_KEYS.partyLevel);
    expect(canonicalStatus('progressParty','Đã họp/gửi phiếu, chờ TBKL')).toBe('Đã xin ý kiến, chờ TBKL');
  });
  it('does not bypass genuinely invalid records merely because a group label is present',()=>{
    const w=book();w.Sheets[name].D4={t:'s',v:'Có dữ liệu nghiệp vụ'};
    expect(()=>parseBusinessExcel(bytes(w),name)).toThrow(/dòng 4, cột A: thiếu mã/);
    const bad=book();bad.Sheets[name].A49={t:'s',v:'NQ1'};
    expect(()=>parseBusinessExcel(bytes(bad),name)).toThrow(/trùng dòng/);
    const unknown=book();unknown.Sheets[name].G5={t:'s',v:'Chưa xác nhận'};
    expect(()=>parseBusinessExcel(bytes(unknown),name)).toThrow(/dòng 5, cột G: trạng thái chưa chuẩn hóa/);
  });
});
