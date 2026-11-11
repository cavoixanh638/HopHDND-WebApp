import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,inspectBusinessWorkbook,readBusinessWorkbook,
  createBusinessTemplate,compareBusinessImport} from '../src/data/business-excel';
const row=(code='ID01',kind='HC')=>[
  code,1,'Nội dung lập kế hoạch','Sở Tài chính',kind,
  '','Sở chưa trình','Sở chưa trình','Sở chưa trình',
  'Nguyễn A','Phòng B','','','Đang xử lý','Ghi chú'];
const file=(sheets:Record<string,unknown[][]>)=>{
  const book=XLSX.utils.book_new();
  for(const [name,rows] of Object.entries(sheets))
    XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),name);
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
};
describe('A–O business Excel import with no technical internal columns',()=>{
  it('provides an exact A–O template without recordId/documentKind',()=>{
    const x=inspectBusinessWorkbook(createBusinessTemplate());
    expect(x.sheets).toEqual(['Danh sach']);
    const read=readBusinessWorkbook(createBusinessTemplate());
    expect(read.issues).toEqual([expect.objectContaining({message:expect.stringContaining('rỗng')})]);
    expect(BUSINESS_HEADERS).toHaveLength(15);
    expect(BUSINESS_HEADERS).not.toContain('recordId');
  });
  it('reads a valid business file, derives stable IDs and preserves values',()=>{
    const workbook=file({Data:[BUSINESS_HEADERS as string[],row()]});
    const res=readBusinessWorkbook(workbook);
    expect(res.issues).toEqual([]);
    expect(res.items).toHaveLength(1);
    expect(res.items[0]).toMatchObject({displayCode:'ID01',documentKind:'NQ',type:'HC',stt:1,
      content:'Nội dung lập kế hoạch',note:'Ghi chú',revision:1});
    expect(res.items[0].recordId).toMatch(/^biz_/);
    expect(readBusinessWorkbook(workbook).items[0].recordId).toBe(res.items[0].recordId);
  });
  it('requires sheet selection if multiple tabs exist',()=>{
    const workbook=file({Cover:[['Không phải dữ liệu']],Data:[BUSINESS_HEADERS as string[],row()]});
    expect(()=>readBusinessWorkbook(workbook)).toThrow(/phải chọn rõ sheet/);
    expect(readBusinessWorkbook(workbook,'Data').items).toHaveLength(1);
    expect(readBusinessWorkbook(workbook,'Cover').issues.length).toBeGreaterThan(0);
  });
  it('reports exact sheet, row and column for wrong header, duplicates, invalid stage, empty content and formula',()=>{
    const head:string[]=[...BUSINESS_HEADERS];head[3]='Sai Sở';
    const duplicated=row();duplicated[1]=2;
    const bad=row('ID02','unknown');bad[1]=3;bad[2]='';bad[6]='Tùy ý';
    const workbook=file({Data:[head,row(),duplicated,bad]});
    const res=readBusinessWorkbook(workbook);
    expect(res.items).toHaveLength(0);
    expect(res.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({sheet:'Data',row:1,column:'D'}),
      expect.objectContaining({sheet:'Data',row:3,column:'A'}),
      expect.objectContaining({sheet:'Data',row:4,column:'C'}),
      expect.objectContaining({sheet:'Data',row:4,column:'G'}),
    ]));
  });
  it('fails closed for all blank rows and technical schema',()=>{
    const empty=file({Data:[BUSINESS_HEADERS as string[]]});
    expect(readBusinessWorkbook(empty).items).toEqual([]);
    expect(readBusinessWorkbook(empty).issues.length).toBeGreaterThan(0);
    const technical=file({Data:[['recordId','displayCode','documentKind'],['r1','ID1','NQ']]});
    expect(readBusinessWorkbook(technical).issues[0].message).toContain('tiêu đề');
  });
  it('counts additions, changes, removals without mixing old rows into the candidate',()=>{
    const old=readBusinessWorkbook(file({Data:[BUSINESS_HEADERS as string[],row('ID01')]})).items;
    const newer=row('ID02');newer[2]='Khác';
    const next=readBusinessWorkbook(file({Data:[BUSINESS_HEADERS as string[],newer]})).items;
    expect(compareBusinessImport(old,next)).toMatchObject({added:1,changed:0,removed:1,unchanged:0});
    expect(next.some(x=>x.displayCode==='ID01')).toBe(false);
  });
});
