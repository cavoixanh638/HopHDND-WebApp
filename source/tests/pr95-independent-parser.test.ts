import {describe,expect,it} from 'vitest';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,inspectBusinessExcel,parseBusinessExcel} from '../src/data/business-excel';

/** INDEPENDENT: no fixture/workbook from the existing parser suite is imported. */
type Sheet={name:string;rows:unknown[][]};
function workbook(sheets:Sheet[]):Uint8Array {
  const book=XLSX.utils.book_new();
  for(const sheet of sheets)XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(sheet.rows),sheet.name);
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
}
function business(code='NQ41',order=1):unknown[]{
  return [code,order,'Nội dung kiểm thử độc lập','Sở thử nghiệm','QPPL','Trình',
    'Sở chưa trình','Sở chưa trình','VP đang thực hiện',
    'CV A','Phòng A','Lãnh đạo VP A','Lãnh đạo UBND B','Chưa trình','Ghi chú riêng'];
}
const one=(rows:unknown[][],name='Dữ liệu')=>workbook([{name,rows:[[...BUSINESS_HEADERS],...rows]}]);

describe('PR95 L3 independent Excel contract: A–O, selected sheet, no silent repair',()=>{
  it.each([
    {left:7,right:8,column:'H',name:'H/I xây dựng–ban hành'},
    {left:11,right:12,column:'L',name:'L/M lãnh đạo VP–UBND'}
  ])('fails closed on swapped HEADERS AND VALUES for $name',({left,right,column})=>{
    const header=[...BUSINESS_HEADERS],values=business();
    // Both H/I values are independently valid statuses: value validation alone
    // would miss a silent column/semantic swap.
    [header[left],header[right]]=[header[right],header[left]];
    [values[left],values[right]]=[values[right],values[left]];
    const file=workbook([{name:'Đảo cột',rows:[header,values]}]);
    expect(inspectBusinessExcel(file).validSheets).not.toContain('Đảo cột');
    expect(()=>parseBusinessExcel(file,'Đảo cột')).toThrow('cột '+column);
  });

  it('does not pick the first sheet, copy guide rows or silently combine sheets',()=>{
    const file=workbook([
      {name:'Hướng dẫn',rows:[['Đây không phải dữ liệu']]},
      {name:'Bản cũ',rows:[[...BUSINESS_HEADERS],business('NQ01')]},
      {name:'Bản mới',rows:[[...BUSINESS_HEADERS],business('NQ02')]}
    ]);
    expect(inspectBusinessExcel(file).validSheets).toEqual(['Bản cũ','Bản mới']);
    expect(()=>parseBusinessExcel(file,'')).toThrow();
    expect(()=>parseBusinessExcel(file,'Hướng dẫn')).toThrow();
    expect(parseBusinessExcel(file,'Bản mới').items.map(r=>r.displayCode)).toEqual(['NQ02']);
  });

  it('rejects empty bytes, header-only sheets, whitespace-only data and duplicate codes',()=>{
    expect(()=>parseBusinessExcel(new Uint8Array(),'Dữ liệu')).toThrow();
    expect(()=>parseBusinessExcel(one([]),'Dữ liệu')).toThrow();
    expect(()=>parseBusinessExcel(one([Array(15).fill('')]),'Dữ liệu')).toThrow();
    expect(()=>parseBusinessExcel(one([business('NQ41'),business('NQ41',2)]),'Dữ liệu'))
      .toThrow('trùng dòng');
  });

  it.each([
    {label:'missing code',patch:(r:unknown[])=>{r[0]='';},column:'A'},
    {label:'invalid serial',patch:(r:unknown[])=>{r[1]='1.5';},column:'B'},
    {label:'missing content',patch:(r:unknown[])=>{r[2]=' ';},column:'C'},
    {label:'ambiguous type',patch:(r:unknown[])=>{r[4]='NQ';},column:'E'},
    {label:'unsupported party status',patch:(r:unknown[])=>{r[6]='Trạng thái giả';},column:'G'},
    {label:'unsupported build status',patch:(r:unknown[])=>{r[7]='Trạng thái giả';},column:'H'},
    {label:'unsupported council status',patch:(r:unknown[])=>{r[8]='Trạng thái giả';},column:'I'}
  ])('rejects $label with the precise physical column',({patch,column})=>{
    const row=business();patch(row);
    expect(()=>parseBusinessExcel(one([row]),'Dữ liệu')).toThrow('cột '+column);
  });

  it('rejects formula injection and non-contract column P rather than stripping values',()=>{
    const withP=[...business(),'Không được bỏ qua'];
    expect(()=>parseBusinessExcel(one([withP]),'Dữ liệu')).toThrow('ngoài cột O');
    const book=XLSX.utils.book_new();
    const sheet=XLSX.utils.aoa_to_sheet([[...BUSINESS_HEADERS],business()]);
    sheet.C2={t:'n',f:'1+1',v:2};
    XLSX.utils.book_append_sheet(book,sheet,'Công thức');
    const bytes=new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
    expect(()=>parseBusinessExcel(bytes,'Công thức')).toThrow('không chấp nhận công thức');
  });

  it('preserves stable, distinct IDs when rows move and when codes differ only in case',()=>{
    const first=business('NQabc'),second=business('NQABC',2);
    const a=parseBusinessExcel(one([first,second]),'Dữ liệu').items;
    const b=parseBusinessExcel(one([second,first]),'Dữ liệu').items;
    expect(new Set(a.map(x=>x.recordId)).size).toBe(2);
    expect(Object.fromEntries(a.map(x=>[x.displayCode,x.recordId])))
      .toEqual(Object.fromEntries(b.map(x=>[x.displayCode,x.recordId])));
  });
});
