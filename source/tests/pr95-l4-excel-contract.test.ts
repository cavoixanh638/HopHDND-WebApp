import {describe,expect,it} from 'vitest';
import * as XLSX from 'xlsx';
import {
  BUSINESS_HEADERS,createBusinessExcelTemplate,inspectBusinessExcel,parseBusinessExcel,
} from '../src/data/business-excel';

// Independent business fixture/oracle: do not construct expected cells or mappings
// from the production BUSINESS_HEADERS or the parser's column-index table.
const HEADINGS=[
  'Mã nội dung','STT','Nội dung trình','Sở, ngành','Loại VB',
  'Cấp cho ý kiến Thành ủy','Tiến độ xin ý kiến Thành ủy',
  'Trình HĐND xây dựng NQ','Trình HĐND ban hành NQ',
  'Chuyên viên','Phòng','Lãnh đạo VP','Lãnh đạo UBND',
  'Tiến độ hiện tại','Ghi chú',
];
const sheetRow=(code='NQ001',stt:unknown=1,kind='HC'):unknown[]=>[
  code,stt,'Nghị quyết phát triển Hải Phòng','Sở Tài chính',kind,
  'Ban Thường vụ Thành ủy','Đã gửi ĐU',
  'Đã trình HĐND, chưa có QĐ','Hoàn thành',
  'Nguyễn Thị Bình','Tài chính','VP: Lê Văn A','UBND: Trần Văn B',
  'Đang tổng hợp tài liệu','Đã kiểm tra',
];
type Sheet={name:string;rows:unknown[][];change?:(sheet:XLSX.WorkSheet)=>void};
const workbook=(sheets:Sheet[]):Uint8Array=>{
  const wb=XLSX.utils.book_new();
  for(const spec of sheets){
    const ws=XLSX.utils.aoa_to_sheet(spec.rows);
    spec.change?.(ws);
    XLSX.utils.book_append_sheet(wb,ws,spec.name);
  }
  return new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
};
const one=(values:unknown[]=sheetRow(),heading:unknown[]=HEADINGS)=>
  workbook([{name:'Hồ sơ',rows:[heading,values]}]);
const parse=(input:Uint8Array)=>parseBusinessExcel(input,'Hồ sơ');

describe('PR95 L4: independent A–O business workbook contract',()=>{
  it('exports exactly A–O and maps every column to its own field without swapping H/I, L/M or N/O',()=>{
    const rich=sheetRow('NQ-ĐẶC-BIỆT',7,'QPPL');
    rich[2]='  Nghị quyết về giáo dục\nDòng hai: bảo tồn dấu tiếng Việt  ';
    rich[3]=' Sở Nội vụ ';
    rich[6]='  Đã gửi ĐU  ';
    rich[9]='Chuyên viên Võ Thị Ánh';
    rich[11]='Lãnh đạo VP – Nguyễn A';
    rich[12]='Lãnh đạo UBND – Nguyễn B';
    rich[13]='  Đang kiểm tra\nLần 2  ';
    rich[14]=' Ghi chú:  Việt Nam\n  Dòng mới  ';
    const template=XLSX.read(createBusinessExcelTemplate(),{type:'array'});
    expect(XLSX.utils.sheet_to_json<unknown[]>(template.Sheets[template.SheetNames[0]],{header:1})[0])
      .toEqual(HEADINGS);
    expect([...BUSINESS_HEADERS]).toEqual(HEADINGS);
    const items=parse(one(rich)).items;
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      recordId:'x-'+Buffer.from('NQ-ĐẶC-BIỆT','utf8').toString('hex'),
      displayCode:'NQ-ĐẶC-BIỆT',stt:7,documentKind:'NQ',
      content:'  Nghị quyết về giáo dục\nDòng hai: bảo tồn dấu tiếng Việt  ',
      department:' Sở Nội vụ ',type:'QPPL',partyLevel:'Ban Thường vụ Thành ủy',
      progressParty:'  Đã gửi ĐU  ',
      progressBuild:'Đã trình HĐND, chưa có QĐ',progressCouncil:'Hoàn thành',
      specialist:'Chuyên viên Võ Thị Ánh',room:'Tài chính',
      vpLeader:'Lãnh đạo VP – Nguyễn A',ubndLeader:'Lãnh đạo UBND – Nguyễn B',
      specificProgress:'  Đang kiểm tra\nLần 2  ',
      note:' Ghi chú:  Việt Nam\n  Dòng mới  ',
      partyMeeting:'',examined:'',isDropped:false,archivedAt:null,revision:1,
    });
  });

  it('requires explicit selection among sheets and never substitutes the first/other tab',()=>{
    const bytes=workbook([
      {name:'Hướng dẫn',rows:[['Đây không phải hồ sơ']]},
      {name:'Lỗi',rows:[HEADINGS, [...sheetRow('NQ009'), 'P ngoài']]},
      {name:'Dữ liệu chuẩn',rows:[HEADINGS,sheetRow('001'),sheetRow('BC002',2,'BC')]},
    ]);
    // Structural P-column faults are excluded during sheet discovery.
    expect(inspectBusinessExcel(bytes)).toEqual({
      sheetNames:['Hướng dẫn','Lỗi','Dữ liệu chuẩn'],
      validSheets:['Dữ liệu chuẩn'],
    });
    expect(()=>parseBusinessExcel(bytes,'')).toThrow('Phải chọn đúng sheet');
    expect(()=>parseBusinessExcel(bytes,'Không tồn tại')).toThrow('Phải chọn đúng sheet');
    expect(()=>parseBusinessExcel(bytes,'Hướng dẫn')).toThrow('Sheet "Hướng dẫn"');
    expect(()=>parseBusinessExcel(bytes,'Lỗi')).toThrow('Sheet "Lỗi", dòng 2, cột P');
    const chosen=parseBusinessExcel(bytes,'Dữ liệu chuẩn');
    expect(chosen.count).toBe(2);
    expect(chosen.items.map(i=>[i.displayCode,i.documentKind]))
      .toEqual([['001','NQ'],['BC002','BC']]);
  });

  it('keeps leading zeros and creates collision-free UTF-8 IDs independent of row order',()=>{
    const names=['001','0001','NQ1','NQ-Á','NQ-A','NQ_1','NQ 1'];
    const rows=names.map((code,i)=>sheetRow(code,i+1));
    const forward=parse(workbook([{name:'Hồ sơ',rows:[HEADINGS,...rows]}])).items;
    const backward=parse(workbook([{name:'Hồ sơ',rows:[HEADINGS,...[...rows].reverse()]}])).items;
    expect(forward.map(x=>x.displayCode)).toEqual(names);
    expect(forward[0].recordId).toBe('x-303031');
    expect(forward[1].recordId).toBe('x-30303031');
    expect(new Set(forward.map(x=>x.recordId)).size).toBe(names.length);
    const ids=(items:typeof forward)=>Object.fromEntries(items.map(x=>[x.displayCode,x.recordId]));
    expect(ids(forward)).toEqual(ids(backward));
    // Excel's numeric custom format "000" is also displayed/preserved as 001.
    const formatted=workbook([{name:'Hồ sơ',rows:[HEADINGS,sheetRow('001')],
      change:ws=>{ws.A2={t:'n',v:1,z:'000'};},
    }]);
    expect(parse(formatted).items[0].displayCode).toBe('001');
    expect(parse(formatted).items[0].recordId).toBe('x-303031');
  });

  it('rejects duplicate codes including NFC/NFD lookalikes and surrounding spaces rather than renaming them',()=>{
    const duplicate=workbook([{name:'Hồ sơ',rows:[HEADINGS,sheetRow('NQ001'),sheetRow('NQ001',2)]}]);
    expect(()=>parse(duplicate)).toThrow('dòng 3, cột A: mã "NQ001" trùng dòng 2');
    const unicode=workbook([{name:'Hồ sơ',rows:[
      HEADINGS,sheetRow('NQ-é'),sheetRow('NQ-e\u0301',2),
    ]}]);
    expect(()=>parse(unicode)).toThrow('dòng 3, cột A');
    const caseVariant=workbook([{name:'Hồ sơ',rows:[
      HEADINGS,sheetRow('NQ-CODE'),sheetRow('nq-code',2),
    ]}]);
    const variants=parse(caseVariant).items;
    expect(variants).toHaveLength(2);
    expect(new Set(variants.map(item=>item.recordId)).size).toBe(2);
    for(const code of [' NQ001','NQ001 ','\tNQ001']){
      expect(()=>parse(one(sheetRow(code)))).toThrow('dòng 2, cột A: mã có khoảng trắng');
    }
  });

  it('rejects a too-long UTF-8 code with precise A-cell error instead of hashing to a colliding ID',()=>{
    expect(()=>parse(one(sheetRow('NQ'+('đ'.repeat(24))))))
      .toThrow('Sheet "Hồ sơ", dòng 2, cột A: mã hồ sơ quá dài');
  });

  it('points to exact sheet/row/column for missing or duplicate headings',()=>{
    const missing=[...HEADINGS];missing[2]='';
    expect(()=>parse(one(sheetRow(),missing))).toThrow('Sheet "Hồ sơ", dòng 1, cột C: yêu cầu tiêu đề');
    const duplicated=[...HEADINGS];duplicated[8]=duplicated[7];
    expect(()=>parse(one(sheetRow(),duplicated))).toThrow('Sheet "Hồ sơ", dòng 1, cột I: yêu cầu tiêu đề');
    const duplicateLeader=[...HEADINGS];duplicateLeader[12]=duplicateLeader[11];
    expect(()=>parse(one(sheetRow(),duplicateLeader))).toThrow('Sheet "Hồ sơ", dòng 1, cột M: yêu cầu tiêu đề');
  });

  it('rejects missing code/content and does not skip an interior blank record row',()=>{
    const noCode=sheetRow();noCode[0]='';
    expect(()=>parse(one(noCode))).toThrow('dòng 2, cột A: thiếu mã');
    const noContent=sheetRow();noContent[2]=' \t ';
    expect(()=>parse(one(noContent))).toThrow('dòng 2, cột C: thiếu nội dung');
    const gap=workbook([{name:'Hồ sơ',rows:[
      HEADINGS,sheetRow('NQ001',1),[],sheetRow('NQ002',2),
    ]}]);
    expect(()=>parse(gap)).toThrow('Sheet "Hồ sơ", dòng 3: dòng trống');
    expect(()=>parse(workbook([{name:'Hồ sơ',rows:[HEADINGS]}]))).toThrow('không chứa hồ sơ');
  });

  it.each([0,-2,1.5,'hai','1.5','9007199254740992'])(
    'rejects invalid ordinal %s with the B-cell address',stt=>{
      expect(()=>parse(one(sheetRow('NQ001',stt)))).toThrow('dòng 2, cột B: STT');
    }
  );
  it('rejects fractional STT hidden by the Excel numeric display format',()=>{
    const bytes=workbook([{name:'Hồ sơ',rows:[HEADINGS,sheetRow('NQ001',1.5)],
      change:ws=>{ws.B2.z='0';},
    }]);
    expect(()=>parse(bytes)).toThrow('dòng 2, cột B: STT');
  });

  it.each([
    [4,'SAI','E'],[6,'Trạng thái tự chế','G'],
    [7,'Trạng thái tự chế','H'],[8,'Trạng thái tự chế','I'],
  ] as const)('blocks incorrect type/status at column %s', (column,value,letter)=>{
    const bad=sheetRow();bad[column]=value;
    expect(()=>parse(one(bad))).toThrow('dòng 2, cột '+letter);
  });
  it('blocks type/code disagreement instead of silently reclassifying a record',()=>{
    expect(()=>parse(one(sheetRow('BC001',1,'HC')))).toThrow('dòng 2, cột E');
  });

  it('rejects used cells P and beyond with their actual location in either header or data',()=>{
    const extended=sheetRow();extended[15]='ngoài hợp đồng';
    expect(()=>parse(one(extended))).toThrow('Sheet "Hồ sơ", dòng 2, cột P');
    const extendedHeader=[...HEADINGS];extendedHeader[16]='Thêm cột Q';
    expect(()=>parse(one(sheetRow(),extendedHeader))).toThrow('Sheet "Hồ sơ", dòng 1, cột Q');
    const tooWide=sheetRow();tooWide[19]='Cột T';
    expect(()=>parse(one(tooWide))).toThrow('Sheet "Hồ sơ", dòng 2, cột T');
  });
  it('rejects all formula cells, including formulas with cached numerical values',()=>{
    const bytes=workbook([{name:'Hồ sơ',rows:[HEADINGS,sheetRow()],
      change:ws=>{ws.B2={t:'n',v:1,f:'1+0'};},
    }]);
    const read=XLSX.read(bytes,{type:'array',cellFormula:true});
    expect(read.Sheets['Hồ sơ'].B2.f).toBe('1+0'); // prove persisted fixture
    expect(()=>parse(bytes)).toThrow('Sheet "Hồ sơ", ô B2: không chấp nhận công thức');
  });
  it('does not accept an Excel calculation-error cell as ordinary source text',()=>{
    const bytes=workbook([{name:'Hồ sơ',rows:[HEADINGS,sheetRow()],
      change:ws=>{ws.O2={t:'e',v:0x07};},
    }]);
    expect(()=>parse(bytes)).toThrow('Sheet "Hồ sơ", ô O2: ô Excel chứa lỗi');
  });

  it('accepts exactly 1,000 records but rejects record 1,001',()=>{
    const rows=Array.from({length:1001},(_,i)=>sheetRow('NQ'+String(i+1).padStart(4,'0'),i+1));
    expect(parse(workbook([{name:'Hồ sơ',rows:[HEADINGS,...rows.slice(0,1000)]}])).count).toBe(1000);
    expect(()=>parse(workbook([{name:'Hồ sơ',rows:[HEADINGS,...rows]}])))
      .toThrow('vượt giới hạn 1.000 hồ sơ');
  });

  it('enforces 5 MiB strictly, accepting an exact-boundary byte length into the ZIP decoder',()=>{
    const limit=5*1024*1024;
    const exactly=new Uint8Array(limit);
    const beyond=new Uint8Array(limit+1);
    // At exactly 5 MiB the size gate accepts the bytes; the workbook
    // decoder or sheet selector may reject them for another reason.
    let boundaryError='';
    try{parse(exactly);}catch(error){boundaryError=String(error);}
    expect(boundaryError).toBeTruthy();
    expect(boundaryError).not.toContain('tối đa 5 MB');
    expect(()=>parse(beyond)).toThrow('tối đa 5 MB');
    expect(()=>parse(new Uint8Array(0))).toThrow('không rỗng');
  });
});
