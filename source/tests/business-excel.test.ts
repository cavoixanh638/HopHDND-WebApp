import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {BUSINESS_EXCEL_HEADERS,businessExcelTemplate,inspectBusinessExcel,listBusinessExcelSheets} from '../src/data/business-excel';
const sample=(code='ID01',kind='HC')=>[code,1,'Nội dung thử nghiệm','Sở X',''+kind,
  'Có','Sở chưa trình','Đang soạn','Chưa trình','Nguyễn A','Phòng 1',
  'Lãnh đạo VP','Lãnh đạo UB','Chưa trình','Ghi chú'];
const make=(sheets:Record<string,unknown[][]>)=>{
  const wb=XLSX.utils.book_new();
  for(const [name,rows] of Object.entries(sheets))
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),name);
  return new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
};
describe('strict operating Excel A:O preflight (no Firebase writes)',()=>{
  it('produces template with exactly 15 business headers and no technical columns',()=>{
    const bytes=businessExcelTemplate();
    const wb=XLSX.read(bytes,{type:'array'});
    const header=XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]],{header:1})[0];
    expect(header).toEqual(BUSINESS_EXCEL_HEADERS);
    expect(header).not.toContain('recordId');
    expect(header).not.toContain('documentKind');
  });
  it('requires selected sheet; does not silently pick the first wrong tab',()=>{
    const bytes=make({HDSD:[['Lời giới thiệu']],DuLieu:[BUSINESS_EXCEL_HEADERS as unknown as string[],sample()]});
    expect(listBusinessExcelSheets(bytes)).toEqual(['HDSD','DuLieu']);
    expect(()=>inspectBusinessExcel(bytes,'')).toThrow('Chưa chọn đúng sheet');
    expect(inspectBusinessExcel(bytes,'HDSD').issues.length).toBeGreaterThan(0);
    const parsed=inspectBusinessExcel(bytes,'DuLieu');
    expect(parsed.issues).toEqual([]);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]).toMatchObject({displayCode:'ID01',documentKind:'NQ',note:'Ghi chú'});
  });
  it('returns stable record identifiers across row ordering changes',()=>{
    const a=sample('ID01'),b=sample('BC02','BC');b[1]=2;
    const x=make({Data:[BUSINESS_EXCEL_HEADERS as unknown as string[],a,b]});
    const y=make({Data:[BUSINESS_EXCEL_HEADERS as unknown as string[],b,a]});
    const l=inspectBusinessExcel(x,'Data'),r=inspectBusinessExcel(y,'Data');
    expect(l.issues).toEqual([]);expect(r.issues).toEqual([]);
    expect(Object.fromEntries(l.items.map(i=>[i.displayCode,i.recordId])))
      .toEqual(Object.fromEntries(r.items.map(i=>[i.displayCode,i.recordId])));
  });
  it('rejects empty, missing code/content, duplicate code and invalid business type',()=>{
    const bad=sample('', 'UNKNOWN');bad[2]='';
    const rows=[BUSINESS_EXCEL_HEADERS as unknown as string[],sample(),sample('id01'),bad];
    const v=inspectBusinessExcel(make({Data:rows}),'Data');
    expect(v.items).toHaveLength(0);
    expect(v.issues.some(x=>x.column==='A'&&x.message.includes('trùng'))).toBe(true);
    expect(v.issues.some(x=>x.column==='A'&&x.message.includes('Thiếu'))).toBe(true);
    expect(v.issues.some(x=>x.column==='C'&&x.message.includes('Thiếu'))).toBe(true);
    expect(v.issues.some(x=>x.column==='E'&&x.message.includes('chưa chuẩn hóa'))).toBe(true);
    const empty=inspectBusinessExcel(make({Data:[BUSINESS_EXCEL_HEADERS as unknown as string[]]}),'Data');
    expect(empty.items).toEqual([]);expect(empty.issues.length).toBeGreaterThan(0);
  });
  it('rejects formulas, wrong column headings and values needing normalization',()=>{
    const b=sample();b[3]=' Sở X ';
    const wb=XLSX.utils.book_new();
    const sh=XLSX.utils.aoa_to_sheet([BUSINESS_EXCEL_HEADERS as unknown as string[],b]);
    sh['O2']={t:'n',f:'1+1',v:2};sh['E1']={t:'s',v:'Tên sai'};
    XLSX.utils.book_append_sheet(wb,sh,'Data');
    const v=inspectBusinessExcel(new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer),'Data');
    expect(v.items).toEqual([]);
    expect(v.issues.some(x=>x.column==='E'&&x.row===1)).toBe(true);
    expect(v.issues.some(x=>x.column==='O'&&x.message.includes('công thức'))).toBe(true);
    expect(v.issues.some(x=>x.column==='D'&&x.message.includes('khoảng trắng'))).toBe(true);
  });
});
