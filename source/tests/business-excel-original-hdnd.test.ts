import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {inspectBusinessExcel,parseBusinessExcel} from '../src/data/business-excel';

// Synthetic reproduction of the owner's original 59-row HĐND workbook:
// title row 1, alternate A-O header at row 2, blank row 3,
// 47 verified cached CONCATENATE formulas in A4:A50, 12 literal BC codes,
// formatted/empty rows through 978, extra summary/formula tabs.
// No original business records or personal data are included in this test.
const originalHeaders=[
  'ID','STT','NỘI DUNG TRÌNH','SỞ, NGÀNH CHỦ TRÌ','Loại VB',
  'Cấp Thành ủy cho ý kiến','Tiến độ xin ý kiến Thành ủy',
  'Tiến độ trình HĐND\nxây dựng NQ',
  'Tiến độ trình HĐND\nban hành NQ/ BC',
  'Chuyên viên VPUB','Phòng chuyên môn','Lãnh đạo VP',
  'Lãnh đạo UBND TP','Tiến độ hiện tại','Ghi chú'
];
const code=(i:number)=>i<47?'NQ'+(i+1):'BC'+String(i-46).padStart(2,'0');
function sourceBook():XLSX.WorkBook{
  const wb=XLSX.utils.book_new();
  const rows:unknown[][]=[
    ['', 'BẢNG THEO DÕI NỘI DUNG TRÌNH HĐND'],
    originalHeaders,
    Array(15).fill(''),
    ...Array.from({length:59},(_,i):unknown[]=>[
      code(i),i+1, i===0?'  Nội dung thử nghiệm\n2 dòng  ':'Nội dung mô phỏng '+(i+1),
      'Sở thử nghiệm',i<47?(i%2?'QPPL':'HC'):'BC',
      i<47?'BTV TU':'','Sở chưa trình','Không phải trình',
      'Sở chưa trình',i<47?'Người thử nghiệm':'','Phòng TH',
      i<47?'Lãnh đạo VP':'',i<47?'Lãnh đạo UBND':'',
      'Sở đang thực hiện',i===0?'  Ghi chú cần giữ nguyên  ':''
    ])
  ];
  const ws=XLSX.utils.aoa_to_sheet(rows);
  for(let i=0;i<47;i++){
    const line=i+4;
    ws['A'+line]={t:'s',f:'CONCATENATE("NQ",B'+line+')',v:'NQ'+(i+1)};
  }
  ws['!ref']='A1:O978';
  XLSX.utils.book_append_sheet(wb,ws,'Các nội dung trình HĐND');
  const summary=XLSX.utils.aoa_to_sheet([['Bảng tổng hợp'],['=COUNTIF(#REF!,B3)']]);
  summary['A2']={t:'n',f:'COUNTIF(#REF!,B3)',v:0};
  XLSX.utils.book_append_sheet(wb,summary,'Tổng hợp chuyên đề');
  return wb;
}
const bytes=(book:XLSX.WorkBook)=>new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
describe('Original Vietnamese 59-row HĐND workbook import without manual editing',()=>{
  it('accepts original aliases and cached NQ formulas, preserving all 59 rows',()=>{
    const input=bytes(sourceBook());
    expect(inspectBusinessExcel(input)).toEqual({
      sheetNames:['Các nội dung trình HĐND','Tổng hợp chuyên đề'],
      validSheets:['Các nội dung trình HĐND']
    });
    const result=parseBusinessExcel(input,'Các nội dung trình HĐND');
    expect(result.count).toBe(59);
    expect(new Set(result.items.map(x=>x.displayCode)).size).toBe(59);
    expect(result.items.filter(x=>x.documentKind==='NQ')).toHaveLength(47);
    expect(result.items.filter(x=>x.documentKind==='BC')).toHaveLength(12);
    expect(result.items[0].displayCode).toBe('NQ1');
    expect(result.items[46].displayCode).toBe('NQ47');
    expect(result.items[47].displayCode).toBe('BC01');
    expect(result.items[58].displayCode).toBe('BC12');
    expect(result.items[0].stt).toBe(1);
    expect(result.items[58].stt).toBe(59);
    expect(result.items[0].content).toBe('  Nội dung thử nghiệm\n2 dòng  ');
    expect(result.items[0].note).toBe('  Ghi chú cần giữ nguyên  ');
    expect(result.items[0].recordId).toBe('x-4e5131'); // UTF-8 NQ1, stable
  });
  it('rejects arbitrary A-column formula, even if its cached value looks right',()=>{
    const wb=sourceBook();
    wb.Sheets['Các nội dung trình HĐND']['A4']={
      t:'s',f:'WEBSERVICE("https://bad.invalid")',v:'NQ1'
    };
    const input=bytes(wb);
    expect(inspectBusinessExcel(input).validSheets).toEqual([]);
    expect(()=>parseBusinessExcel(input,'Các nội dung trình HĐND'))
      .toThrow(/chỉ chấp nhận công thức mã NQ/);
  });
  it('rejects tampered cached NQ codes and formula-row mismatch',()=>{
    for(const variant of ['bad-cache','bad-row']){
      const wb=sourceBook(),ws=wb.Sheets['Các nội dung trình HĐND'];
      ws['A4']=variant==='bad-cache'?
        {t:'s',f:'CONCATENATE("NQ",B4)',v:'NQ999'}:
        {t:'s',f:'CONCATENATE("NQ",B5)',v:'NQ1'};
      expect(inspectBusinessExcel(bytes(wb)).validSheets).toEqual([]);
    }
  });
  it('still rejects a blank gap between actual business rows',()=>{
    const wb=sourceBook(),ws=wb.Sheets['Các nội dung trình HĐND'];
    for(const letter of 'ABCDEFGHIJKLMNO')delete ws[letter+'5'];
    expect(()=>parseBusinessExcel(bytes(wb),'Các nội dung trình HĐND'))
      .toThrow(/dòng trống nằm giữa vùng hồ sơ/);
  });
  it('blocks swapped H/I fields even if headers are original-source aliases',()=>{
    const wb=sourceBook(),ws=wb.Sheets['Các nội dung trình HĐND'];
    const originalH=ws['H2'],originalI=ws['I2'];
    ws['H2']=originalI;ws['I2']=originalH;
    expect(inspectBusinessExcel(bytes(wb)).validSheets).toEqual([]);
    expect(()=>parseBusinessExcel(bytes(wb),'Các nội dung trình HĐND'))
      .toThrow(/cột H: yêu cầu tiêu đề/);
  });
});
