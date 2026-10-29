import * as XLSX from 'xlsx';
import type {Item} from '../../shared/types';
import {parseGvizPayload} from './gviz-parser';

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
  if(range.e.r>LIMIT_ROWS+15||range.e.c>17)
    throw Error('Sheet "'+name+'": vượt giới hạn 1.000 hồ sơ hoặc 18 cột.');
  for(const [address,cell] of Object.entries(sheet))
    if(!address.startsWith('!')&&(cell as XLSX.CellObject).f!==undefined)
      throw Error('Sheet "'+name+'", ô '+address+': không chấp nhận công thức.');
  return XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:false,defval:'',blankrows:true});
}
const normalized=(x:unknown)=>String(x??'').trim().toLocaleLowerCase('vi')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ');
const headerIndex=(rows:unknown[][])=>rows.slice(0,10).findIndex(row=>
  normalized(row[2]).includes('noi dung')&&normalized(row[3]).includes('so'));
function validateHeader(rows:unknown[][],name:string):number {
  const idx=headerIndex(rows);
  if(idx<0)throw Error('Sheet "'+name+'": không tìm thấy hàng tiêu đề, C=Nội dung trình và D=Sở, ngành.');
  const row=rows[idx];
  const required:[number,string,string][]=[
    [0,'Mã nội dung','ma'],[1,'STT','stt'],[2,'Nội dung trình','noi dung'],
    [3,'Sở, ngành','so'],[4,'Loại VB','loai'],
    [5,'Cấp cho ý kiến Thành ủy','cap'],[6,'Tiến độ xin ý kiến Thành ủy','tien do xin y kien'],
    [7,'Trình HĐND xây dựng NQ','trinh'],[8,'Trình HĐND ban hành NQ','trinh'],
    [9,'Chuyên viên','chuyen vien'],[10,'Phòng','phong'],
    [11,'Lãnh đạo VP','lanh dao'],[12,'Lãnh đạo UBND','lanh dao'],
    [13,'Tiến độ hiện tại','tien do hien tai'],[14,'Ghi chú','ghi chu']];
  for(const [column,label,term] of required)
    if(!normalized(row[column]).includes(term))
      throw Error('Sheet "'+name+'", dòng '+(idx+1)+', cột '+String.fromCharCode(65+column)+
        ': yêu cầu tiêu đề "'+label+'"; đang có "'+String(row[column]??'')+'".');
  if(row.slice(15).some(value=>String(value??'').trim()))
    throw Error('Sheet "'+name+'", dòng '+(idx+1)+': có cột ngoài A–O; không tự đoán cấu trúc.');
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
  const hex=Array.from(new TextEncoder().encode(code.trim()),byte=>byte.toString(16).padStart(2,'0')).join('');
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
  for(let index=0;index<data.length;index++){
    const values=data[index],line=head+index+2;
    if(values.every(cell=>!String(cell??'').trim()))continue;
    if(values.slice(15).some(v=>String(v??'').trim()))
      throw Error('Sheet "'+sheetName+'", dòng '+line+': không hỗ trợ dữ liệu ngoài cột O.');
    const code=String(values[0]??'').trim();
    if(!code)throw Error('Sheet "'+sheetName+'", dòng '+line+', cột A: thiếu mã hồ sơ.');
    if(seen.has(code))throw Error('Sheet "'+sheetName+'", dòng '+line+', cột A: mã "'+code+
      '" trùng dòng '+seen.get(code)+'.');
    seen.set(code,line);
    if(!/^\d+$/.test(String(values[1]??'').trim())||Number(values[1])<1)
      throw Error('Sheet "'+sheetName+'", dòng '+line+', cột B: STT phải là số nguyên dương.');
    if(!String(values[2]??'').trim())throw Error('Sheet "'+sheetName+'", dòng '+line+', cột C: thiếu nội dung trình.');
    const kind=normalized(values[4]);
    if(!['hc','hanh chinh','qppl','nq','bc','bao cao'].includes(kind))
      throw Error('Sheet "'+sheetName+'", dòng '+line+', cột E: Loại VB phải là HC, QPPL, NQ hoặc BC; đang có "'+values[4]+'".');
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
    const code=String(checked[index][0]).trim();
    return {...item,recordId:identifier(code,sheetName,head+index+2),displayCode:code,revision:1};
  });
  return {sheetName,items,count:items.length,headers:BUSINESS_HEADERS};
}
export function createBusinessExcelTemplate():Uint8Array {
  const workbook=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([[...BUSINESS_HEADERS]]);
  XLSX.utils.book_append_sheet(workbook,sheet,'Du lieu HĐND');
  return new Uint8Array(XLSX.write(workbook,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
}
