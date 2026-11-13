import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,parseBusinessExcel} from '../src/data/business-excel';
import {inspectWorkbookSchema} from '../src/data/business-excel-schema-fingerprint';

const sample=(i:number):unknown[]=>[
  'NQ'+i,i,'Nội dung kỳ họp '+i,'Sở Tài chính','HC','BTV TU',
  'Sở chưa trình','Đã trình HĐND, chưa có QĐ','VP đang thực hiện',
  'Chuyên viên A','Phòng tổng hợp','Phó Chánh Văn phòng','Phó Chủ tịch',
  'Chưa trình','Ghi chú '+i
];
function build(sheets:{name:string;rows:unknown[][];hidden?:0|1|2;
  hiddenRows?:number[];hiddenColumns?:number[];styledTail?:boolean}[]):Uint8Array{
  const book=XLSX.utils.book_new();
  for(const candidate of sheets){
    const sheet=XLSX.utils.aoa_to_sheet(candidate.rows);
    const last=BUSINESS_HEADERS.length;
    sheet['!rows']=Array.from({length:candidate.rows.length},(_,i)=>
      candidate.hiddenRows?.includes(i+1)?{hidden:true}:{});
    sheet['!cols']=Array.from({length:last+2},(_,i)=>
      candidate.hiddenColumns?.includes(i)?{hidden:true}:{});
    if(candidate.styledTail)sheet['!ref']='A1:P100000';
    XLSX.utils.book_append_sheet(book,sheet,candidate.name);
  }
  book.Workbook={Sheets:sheets.map(candidate=>({Hidden:candidate.hidden??0}))};
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
}
describe('A–O structural sheet fingerprints — no row count/name/visibility bias',()=>{
  it('identifies the SAME schema with 1, 5 or 59 records and unrelated sheet names',()=>{
    const results=[1,5,59].map((count,i)=>{
      const bytes=build([{name:['Bất kỳ','Tờ số 3','Đã đổi tên'][i],
        rows:[[...BUSINESS_HEADERS],...Array.from({length:count},(_,k)=>sample(k+1))]}]);
      const found=inspectWorkbookSchema(bytes);
      expect(found.sheets[0].score).toBe(100);
      expect(found.validSheets).toHaveLength(1);
      expect(found.recommendedSheet).toBe(['Bất kỳ','Tờ số 3','Đã đổi tên'][i]);
      expect(found.sheets[0].eligible).toBe(true);
      return found.sheets[0].fingerprint;
    });
    expect(new Set(results).size).toBe(1);
  });
  it('reads hidden DATA rows and hidden A–O columns; they are included in import',()=>{
    const bytes=build([{name:'Không quan trọng',rows:[
      [...BUSINESS_HEADERS],sample(1),sample(2),sample(3)
    ],hiddenRows:[1,3],hiddenColumns:[0,7,14]}]);
    const found=inspectWorkbookSchema(bytes);
    expect(found.sheets[0]).toMatchObject({eligible:true,score:100,
      hiddenRows:2,hiddenColumns:['A','H','O'],headerRow:1});
    const parsed=parseBusinessExcel(bytes,'Không quan trọng');
    expect(parsed.count).toBe(3);
    expect(parsed.items.map(item=>item.displayCode)).toEqual(['NQ1','NQ2','NQ3']);
    expect(parsed.items[1].progressBuild).toBe('Đã trình HĐND, chưa có QĐ');
  });
  it('inspects hidden and VeryHidden sheets; never silently prefers visible by name',()=>{
    const bytes=build([
      {name:'Bảng thống kê',rows:[['Tổng số'],[1]],hidden:0},
      {name:'Nháp ẩn',rows:[[...BUSINESS_HEADERS],sample(1)],hidden:1},
      {name:'Nguồn chính rất ẩn',rows:[[...BUSINESS_HEADERS],sample(2)],hidden:2}
    ]);
    const found=inspectWorkbookSchema(bytes);
    expect(found.validSheets).toEqual(['Nháp ẩn','Nguồn chính rất ẩn']);
    expect(found.ambiguous).toBe(true);
    expect(found.recommendedSheet).toBe(null);
    expect(found.sheets.map(sheet=>sheet.visibility)).toEqual(['visible','hidden','very-hidden']);
    expect(found.sheets[1].fingerprint).toBe(found.sheets[2].fingerprint);
  });
  it('selects a sole hidden sheet when it is the only valid data structure',()=>{
    const bytes=build([
      {name:'Bảng phụ hiển thị',rows:[['BẢNG TỔNG HỢP']],hidden:0},
      {name:'Dữ liệu ẩn',rows:[[...BUSINESS_HEADERS],sample(1)],hidden:1}
    ]);
    const found=inspectWorkbookSchema(bytes);
    expect(found.recommendedSheet).toBe('Dữ liệu ẩn');
    expect(found.sheets[1].visibility).toBe('hidden');
    expect(parseBusinessExcel(bytes,found.recommendedSheet!).count).toBe(1);
  });
  it('ignores styled-only rows and columns but rejects populated hidden P',()=>{
    const harmless=build([{name:'Dữ liệu A-O',rows:[[...BUSINESS_HEADERS],sample(1)],
      styledTail:true,hiddenColumns:[15]}]);
    expect(inspectWorkbookSchema(harmless).validSheets).toEqual(['Dữ liệu A-O']);
    expect(parseBusinessExcel(harmless,'Dữ liệu A-O').count).toBe(1);
    const workbook=XLSX.read(harmless,{type:'array',cellFormula:true});
    const sheet=workbook.Sheets['Dữ liệu A-O'];
    sheet.P2={t:'s',v:'Không được âm thầm bỏ cột P ẩn'};
    sheet['!ref']='A1:P100000';
    sheet['!cols']![15]={hidden:true};
    const populated=new Uint8Array(XLSX.write(workbook,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
    const found=inspectWorkbookSchema(populated);
    expect(found.sheets[0].score).toBe(100);
    expect(found.validSheets).toHaveLength(0);
    expect(found.sheets[0].explanation).toMatch(/cột P/);
  });
  it('never guesses from similar sheet names or a partial/scrambled schema',()=>{
    const headers=[...BUSINESS_HEADERS];
    [headers[7],headers[8]]=[headers[8],headers[7]];
    const bytes=build([
      {name:'ĐÚNG DỮ LIỆU',rows:[['BÁO CÁO'],['Tổng số'],[3]]},
      {name:'Bảng gốc',rows:[headers,sample(1)]}
    ]);
    const found=inspectWorkbookSchema(bytes);
    expect(found.validSheets).toEqual([]);
    expect(found.recommendedSheet).toBe(null);
    expect(found.sheets[1].score).toBeLessThan(100);
    expect(found.sheets[1].explanation).toContain('H');
  });
  it('scans headers below decorative rows, including a hidden header',()=>{
    const front=Array.from({length:14},(_,i)=>['Tiêu đề báo cáo '+i]);
    const bytes=build([{name:'Không đặt chuẩn',rows:[
      ...front,[...BUSINESS_HEADERS],sample(1)
    ],hiddenRows:[15],hiddenColumns:[2,3]}]);
    const found=inspectWorkbookSchema(bytes);
    expect(found.validSheets).toEqual(['Không đặt chuẩn']);
    expect(found.sheets[0].headerRow).toBe(15);
    expect(parseBusinessExcel(bytes,'Không đặt chuẩn').count).toBe(1);
  });
});
