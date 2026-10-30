import * as XLSX from 'xlsx';
import type {Item} from '../../shared/types';
import {parseGvizPayload} from './gviz-parser';
import {STATUS_OPTIONS} from '../../shared/field-definitions';
import {DEFAULT_REPORTS} from '../domain/reporting';

/** Public business workbook A–O; intentionally NOT the internal recordId template. */
export const BUSINESS_HEADERS=[
  'Mã nội dung','STT','Nội dung trình','Sở, ngành','Loại VB',
  'Cấp cho ý kiến Thành ủy','Tiến độ xin ý kiến Thành ủy',
  'Trình HĐND xây dựng NQ','Trình HĐND ban hành NQ',
  'Chuyên viên','Phòng','Lãnh đạo VP','Lãnh đạo UBND',
  'Tiến độ hiện tại','Ghi chú'
] as const;
const LIMIT_BYTES=5*1024*1024;
const LIMIT_ROWS=1000;
export interface BusinessExcelInspection {sheetNames:string[];validSheets:string[]}
export interface BusinessExcelResult {sheetName:string;items:Item[];count:number;headers:readonly string[]}
function readBook(bytes:Uint8Array):XLSX.WorkBook {
  if(!bytes.byteLength||bytes.byteLength>LIMIT_BYTES)
    throw Error('Excel: chỉ nhận tệp .xlsx không rỗng, tối đa 5 MB.');
  try {return XLSX.read(bytes,{type:'array',cellFormula:true,cellDates:false});}
  catch {throw Error('Excel: không đọc được file .xlsx hợp lệ.');}
}
function rowsOf(book:XLSX.WorkBook,name:string):unknown[][] {
  const sheet=book.Sheets[name];
  if(!sheet)throw Error('Excel: sheet "'+name+'" không tồn tại.');
  const range=XLSX.utils.decode_range(sheet['!ref']??'A1');
  if(range.e.r>LIMIT_ROWS+15)
    throw Error('Sheet "'+name+'", dòng '+(range.e.r+1)+': vượt vùng kiểm tra 1.000 hồ sơ.');
  for(const [address,value] of Object.entries(sheet)){
    if(address.startsWith('!'))continue;
    const cell=value as XLSX.CellObject;
    if(cell.f!==undefined)
      throw Error('Sheet "'+name+'", ô '+address+': không chấp nhận công thức.');
    if(cell.t==='e')
      throw Error('Sheet "'+name+'", ô '+address+': ô Excel chứa lỗi tính toán.');
    const position=XLSX.utils.decode_cell(address);
    if(position.c>=15&&cell.v!==undefined&&cell.v!==null&&String(cell.v)!=='')
      throw Error('Sheet "'+name+'", dòng '+(position.r+1)+', cột '+
        XLSX.utils.encode_col(position.c)+': không hỗ trợ dữ liệu ngoài cột O.');
  }
  if(range.e.c>=15)
    throw Error('Sheet "'+name+'", cột '+XLSX.utils.encode_col(range.e.c)+
      ': vùng dữ liệu vượt cấu trúc A–O.');
  return XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:false,defval:'',blankrows:true});
}
const normalized=(x:unknown)=>String(x??'').trim().toLocaleLowerCase('vi')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ');
// Recover a damaged header row from the unaffected columns. Otherwise a
// missing/duplicated C or D heading would incorrectly look like "no header".
const HEADER_ANCHORS:readonly (readonly [number,string])[]=[
  [0,'Mã nội dung'],[1,'STT'],[2,'Nội dung trình'],[3,'Sở, ngành'],
  [4,'Loại VB'],[5,'Cấp cho ý kiến Thành ủy'],[6,'Tiến độ xin ý kiến Thành ủy'],
  [9,'Chuyên viên'],[10,'Phòng'],[13,'Tiến độ hiện tại'],[14,'Ghi chú']
];
const headerIndex=(rows:unknown[][])=>rows.slice(0,10).findIndex(row=>
  (normalized(row[2]).includes('noi dung')&&normalized(row[3]).includes('so'))||
  HEADER_ANCHORS.filter(([column,label])=>normalized(row[column])===normalized(label)).length>=3);
function validateHeader(rows:unknown[][],name:string):number {
  const idx=headerIndex(rows);
  if(idx<0)throw Error('Sheet "'+name+'": không tìm thấy hàng tiêu đề, C=Nội dung trình và D=Sở, ngành.');
  const row=rows[idx];
  // Explicit allowlist per POSITION; never accept substring matches such as
  // "trình" (H/I) or "lãnh đạo" (L/M). An accidental swap must fail even
  // when the status values in both columns are otherwise valid.
  const allowed:readonly (readonly string[])[]=[
    ['Mã nội dung'],['STT'],['Nội dung trình'],['Sở, ngành'],['Loại VB'],
    ['Cấp cho ý kiến Thành ủy'],['Tiến độ xin ý kiến Thành ủy'],
    ['Trình HĐND xây dựng NQ','Trình HĐND xây dựng nghị quyết'],
    ['Trình HĐND ban hành NQ','Trình HĐND ban hành nghị quyết'],
    ['Chuyên viên'],['Phòng'],['Lãnh đạo VP','Lãnh đạo Văn phòng'],
    ['Lãnh đạo UBND','Lãnh đạo Ủy ban nhân dân'],
    ['Tiến độ hiện tại'],['Ghi chú']
  ];
  for(let column=0;column<allowed.length;column++){
    const names=allowed[column];
    if(!names.some(name=>normalized(row[column])===normalized(name)))
      throw Error('Sheet "'+name+'", dòng '+(idx+1)+', cột '+String.fromCharCode(65+column)+
        ': yêu cầu tiêu đề "'+names[0]+'"'+(names.length>1?' (hoặc '+names.slice(1).join(', ')+')':'')+
        '; đang có "'+String(row[column]??'')+'".');
  }
  return idx;
}
export function inspectBusinessExcel(input:ArrayBuffer|Uint8Array):BusinessExcelInspection {
  const book=readBook(input instanceof Uint8Array?input:new Uint8Array(input));
  return {sheetNames:[...book.SheetNames],validSheets:book.SheetNames.filter(name=>{
    try{return validateHeader(rowsOf(book,name),name)>=0;}catch{return false;}
  })};
}
function identifier(code:string,name:string,row:number):string {
  // Exact reversible UTF-8 hex encoding; do not use row number or a lossy slug.
  const hex=Array.from(new TextEncoder().encode(code),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(hex.length>96)throw Error('Sheet "'+name+'", dòng '+row+', cột A: mã hồ sơ quá dài để tạo ID ổn định.');
  return 'x-'+hex;
}
export function parseBusinessExcel(input:ArrayBuffer|Uint8Array,sheetName:string):BusinessExcelResult {
  const book=readBook(input instanceof Uint8Array?input:new Uint8Array(input));
  if(!sheetName||!book.SheetNames.includes(sheetName))
    throw Error('Phải chọn đúng sheet dữ liệu; ứng dụng không tự lấy sheet đầu tiên.');
  const rows=rowsOf(book,sheetName),head=validateHeader(rows,sheetName),data=rows.slice(head+1);
  if(!data.length)throw Error('Sheet "'+sheetName+'": file không chứa hồ sơ.');
  const seen=new Map<string,number>(),checked:unknown[][]=[];
  const lastDataIndex=data.findLastIndex(values=>values.some(cell=>String(cell??'').trim()));
  for(let index=0;index<=lastDataIndex;index++){
    const values=data[index],line=head+index+2;
    if(values.every(cell=>!String(cell??'').trim()))
      throw Error('Sheet "'+sheetName+'", dòng '+line+': dòng trống nằm giữa vùng hồ sơ; không tự bỏ dòng.');
    const code=String(values[0]??'');
    if(!code.trim())throw Error('Sheet "'+sheetName+'", dòng '+line+', cột A: thiếu mã hồ sơ.');
    if(code!==code.trim())
      throw Error('Sheet "'+sheetName+'", dòng '+line+', cột A: mã có khoảng trắng đầu/cuối; hãy sửa trong Excel, không tự cắt mã.');
    const codeKey=code.normalize('NFC').toLocaleLowerCase('vi');
    if(seen.has(codeKey))throw Error('Sheet "'+sheetName+'", dòng '+line+', cột A: mã "'+code+
      '" trùng dòng '+seen.get(codeKey)+'.');
    seen.set(codeKey,line);
    const ordinal=String(values[1]??'').trim();
    const rawOrdinal=book.Sheets[sheetName][XLSX.utils.encode_cell({r:line-1,c:1})] as XLSX.CellObject|undefined;
    if(!/^\d+$/.test(ordinal)||!Number.isSafeInteger(Number(ordinal))||Number(ordinal)<1||
      (typeof rawOrdinal?.v==='number'&&
        (!Number.isSafeInteger(rawOrdinal.v)||rawOrdinal.v!==Number(ordinal))))
      throw Error('Sheet "'+sheetName+'", dòng '+line+', cột B: STT phải là số nguyên dương an toàn.');
    if(!String(values[2]??'').trim())throw Error('Sheet "'+sheetName+'", dòng '+line+', cột C: thiếu nội dung trình.');
    const kind=normalized(values[4]);
    if(!['hc','hanh chinh','qppl','bc','bao cao'].includes(kind))
      throw Error('Sheet "'+sheetName+'", dòng '+line+', cột E: Loại VB phải là HC, QPPL hoặc BC (NQ chung chưa xác định HC/QPPL); đang có "'+values[4]+'".');
    const typed=kind==='bc'||kind==='bao cao'?'BC':'NQ';
    if(/^BC/i.test(code)&&typed!=='BC'||/^(?:ID|NQ)/i.test(code)&&typed!=='NQ')
      throw Error('Sheet "'+sheetName+'", dòng '+line+', cột E: loại văn bản mâu thuẫn với mã '+code+'.');
    const checks:[number,'progressParty'|'progressBuild'|'progressCouncil',string][]=[
      [6,'progressParty','G'],[7,'progressBuild','H'],[8,'progressCouncil','I']];
    for(const [index,field,column] of checks){
      const value=String(values[index]??'').trim();
      const expected=new Set<string>([
        ...STATUS_OPTIONS[field],...DEFAULT_REPORTS.filter(report=>report.statusField===field)
          .flatMap(report=>report.columns)
      ].map(normalized));
      if(value&&!expected.has(normalized(value)))
        throw Error('Sheet "'+sheetName+'", dòng '+line+', cột '+column+
          ': trạng thái chưa chuẩn hóa "'+value+'". Hãy chọn một trạng thái nghiệp vụ hợp lệ, không tự đổi giá trị.');
    }
    identifier(code,sheetName,line);
    checked.push(values);
  }
  if(!checked.length)throw Error('Sheet "'+sheetName+'": không có hồ sơ hợp lệ.');
  if(checked.length>LIMIT_ROWS)throw Error('Sheet "'+sheetName+'": vượt giới hạn 1.000 hồ sơ.');
  const canonical=[rows[head],...checked];
  const payload={status:'ok',table:{cols:Array.from({length:15},()=>({})),
    rows:canonical.map(row=>({c:Array.from({length:15},(_,i)=>({v:String(row[i]??'')}))}))}};
  const parsed=parseGvizPayload(payload,'validated:business');
  if(parsed.warnings.length||parsed.items.length!==checked.length||parsed.ignoredRows!==1)
    throw Error('Sheet "'+sheetName+'": dữ liệu chưa chuẩn hóa: '+(parsed.warnings[0]??'có dòng bị bỏ qua hoặc sai cấu trúc.'));
  const items=parsed.items.map((item,index):Item=>{
    const source=checked[index],code=String(source[0]);
    // GViz trims every text cell. Keep the actual Excel text, including
    // significant surrounding whitespace, line breaks and Vietnamese Unicode.
    // GViz is used only for the shared classification and structure check.
    const asText=(column:number)=>String(source[column]??'');
    return {...item,
      recordId:identifier(code,sheetName,head+index+2),displayCode:code,revision:1,
      content:asText(2),department:asText(3),type:asText(4),
      partyLevel:asText(5),progressParty:asText(6),progressBuild:asText(7),
      progressCouncil:asText(8),specialist:asText(9),room:asText(10),
      vpLeader:asText(11),ubndLeader:asText(12),
      specificProgress:asText(13),note:asText(14)
    };
  });
  return {sheetName,items,count:items.length,headers:BUSINESS_HEADERS};
}
export function createBusinessExcelTemplate():Uint8Array {
  const workbook=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([[...BUSINESS_HEADERS]]);
  XLSX.utils.book_append_sheet(workbook,sheet,'Du lieu HĐND');
  return new Uint8Array(XLSX.write(workbook,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
}
