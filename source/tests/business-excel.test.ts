import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,createBusinessExcelTemplate,inspectBusinessExcel,parseBusinessExcel} from '../src/data/business-excel';
function file(sheets:{name:string;rows:unknown[][]}[]):Uint8Array{
  const book=XLSX.utils.book_new();
  for(const s of sheets)XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(s.rows),s.name);
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
}
const row=(code='NQ001',stt=1)=>[code,stt,'Thông qua nghị quyết','Sở Tài chính','HC',
 'Thành ủy','Đang xin ý kiến','Đã trình','Đang xử lý','Chuyên viên A',
 'Phòng tổng hợp','Phó Chánh Văn phòng','Phó Chủ tịch','Chưa trình','Ghi chú'];
describe('business A–O Excel must never silently import wrong sheet or malformed rows',()=>{
  it('has no technical fields in exported template',()=>{
    const book=XLSX.read(createBusinessExcelTemplate(),{type:'array'});
    const header=XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[book.SheetNames[0]],{header:1})[0];
    expect(header).toEqual([...BUSINESS_HEADERS]);
    expect(header).not.toContain('recordId');expect(header).not.toContain('documentKind');
  });
  it('requires the human to select the correct sheet of a multi-tab workbook',()=>{
    const input=file([{name:'Hướng dẫn',rows:[['Không phải dữ liệu']]},
      {name:'Hồ sơ',rows:[[...BUSINESS_HEADERS],row()]}]);
    expect(inspectBusinessExcel(input)).toEqual({sheetNames:['Hướng dẫn','Hồ sơ'],validSheets:['Hồ sơ']});
    expect(()=>parseBusinessExcel(input,'')).toThrow('Phải chọn');
    expect(()=>parseBusinessExcel(input,'Hướng dẫn')).toThrow('Sheet "Hướng dẫn"');
    const result=parseBusinessExcel(input,'Hồ sơ');
    expect(result.count).toBe(1);
    expect(result.items[0].displayCode).toBe('NQ001');
    expect(result.items[0].content).toBe('Thông qua nghị quyết');
    expect(result.items[0].recordId).toMatch(/^x-[0-9a-f]+$/);
  });
  it('prevents empty file and wrong column order with precise sheet/column errors',()=>{
    expect(()=>parseBusinessExcel(new Uint8Array(),'Hồ sơ')).toThrow('không rỗng');
    const h=[...BUSINESS_HEADERS];[h[2],h[3]]=[h[3],h[2]];
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[h,row()]}]),'Hồ sơ'))
      .toThrow('C=Nội dung trình');
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[[...BUSINESS_HEADERS]]}]),'Hồ sơ'))
      .toThrow('không chứa hồ sơ');
  });
  it('rejects duplicate IDs, missing required text and unrecognized business types',()=>{
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[[...BUSINESS_HEADERS],row(),row()]}]),'Hồ sơ'))
      .toThrow('trùng dòng');
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[[...BUSINESS_HEADERS],[...row().slice(0,2),'',...row().slice(3)]]}]),'Hồ sơ'))
      .toThrow('cột C');
    const wrong=row();wrong[4]='UNKNOWN';
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[[...BUSINESS_HEADERS],wrong]}]),'Hồ sơ'))
      .toThrow('cột E');
  });
  it('does not discard additional notes outside the A–O data contract',()=>{
    const extras=[...row(),'Dữ liệu ngoài hợp đồng'];
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[[...BUSINESS_HEADERS],extras]}]),'Hồ sơ'))
      .toThrow('ngoài cột O');
  });
  it('returns stable IDs regardless of spreadsheet order',()=>{
    const a=parseBusinessExcel(file([{name:'Data',rows:[[...BUSINESS_HEADERS],row('NQ1',1),row('BC2',2).map((v,i)=>i===4?'BC':v)]}]),'Data');
    const b=parseBusinessExcel(file([{name:'Data',rows:[[...BUSINESS_HEADERS],row('BC2',2).map((v,i)=>i===4?'BC':v),row('NQ1',1)]}]),'Data');
    expect(Object.fromEntries(a.items.map(item=>[item.displayCode,item.recordId])))
      .toEqual(Object.fromEntries(b.items.map(item=>[item.displayCode,item.recordId])));
  });
});
