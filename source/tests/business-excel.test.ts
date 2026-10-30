import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,createBusinessExcelTemplate,inspectBusinessExcel,parseBusinessExcel} from '../src/data/business-excel';
function file(sheets:{name:string;rows:unknown[][]}[]):Uint8Array{
  const book=XLSX.utils.book_new();
  for(const s of sheets)XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(s.rows),s.name);
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
}
const row=(code='NQ001',stt=1)=>[code,stt,'Thông qua nghị quyết','Sở Tài chính','HC',
 'Thành ủy','Sở chưa trình','Đã trình HĐND, chưa có QĐ','VP đang thực hiện','Chuyên viên A',
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
      .toThrow('Sheet "Hồ sơ", dòng 1, cột C: yêu cầu tiêu đề');
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[[...BUSINESS_HEADERS]]}]),'Hồ sơ'))
      .toThrow('không chứa hồ sơ');
  });
  it.each([[7,8,'H'],[11,12,'L']] as const)(
    'blocks swapped business headers and values at %s/%s even with valid statuses',
    (left,right,column)=>{
      const header=[...BUSINESS_HEADERS],values=row();
      // Both H and I statuses deliberately use legitimate overlapping values.
      values[7]='Sở chưa trình';values[8]='VP đang thực hiện';
      [header[left],header[right]]=[header[right],header[left]];
      [values[left],values[right]]=[values[right],values[left]];
      const input=file([{name:'Hồ sơ đảo',rows:[header,values]}]);
      expect(inspectBusinessExcel(input).validSheets).toEqual([]);
      expect(()=>parseBusinessExcel(input,'Hồ sơ đảo'))
        .toThrow('Sheet "Hồ sơ đảo", dòng 1, cột '+column+': yêu cầu tiêu đề');
    }
  );
  it('rejects ambiguous generic headings and accepts only explicitly enumerated synonyms',()=>{
    const ambiguous:string[]=[...BUSINESS_HEADERS];
    ambiguous[7]='Trình';ambiguous[11]='Lãnh đạo';
    expect(()=>parseBusinessExcel(file([{name:'Sai',rows:[ambiguous,row()]}]),'Sai'))
      .toThrow('dòng 1, cột H');
    const leader:string[]=[...BUSINESS_HEADERS];leader[11]='Lãnh đạo';
    expect(()=>parseBusinessExcel(file([{name:'Sai',rows:[leader,row()]}]),'Sai'))
      .toThrow('dòng 1, cột L');
    const aliases:string[]=[...BUSINESS_HEADERS];
    aliases[7]='Trình HĐND xây dựng nghị quyết';
    aliases[8]='Trình HĐND ban hành nghị quyết';
    aliases[11]='Lãnh đạo Văn phòng';
    aliases[12]='Lãnh đạo Ủy ban nhân dân';
    expect(parseBusinessExcel(file([{name:'Đúng',rows:[aliases,row()]}]),'Đúng').count).toBe(1);
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
  it('reports the precise column when a business progress status is unrecognized',()=>{
    const invalid=row();invalid[6]='Không biết trạng thái';
    expect(()=>parseBusinessExcel(file([{name:'Hồ sơ',rows:[[...BUSINESS_HEADERS],invalid]}]),'Hồ sơ'))
      .toThrow('dòng 2, cột G: trạng thái chưa chuẩn hóa');
  });
  it('returns stable IDs regardless of spreadsheet order',()=>{
    const a=parseBusinessExcel(file([{name:'Data',rows:[[...BUSINESS_HEADERS],row('NQ1',1),row('BC2',2).map((v,i)=>i===4?'BC':v)]}]),'Data');
    const b=parseBusinessExcel(file([{name:'Data',rows:[[...BUSINESS_HEADERS],row('BC2',2).map((v,i)=>i===4?'BC':v),row('NQ1',1)]}]),'Data');
    expect(Object.fromEntries(a.items.map(item=>[item.displayCode,item.recordId])))
      .toEqual(Object.fromEntries(b.items.map(item=>[item.displayCode,item.recordId])));
  });
});
