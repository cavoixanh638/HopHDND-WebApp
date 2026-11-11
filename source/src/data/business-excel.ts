import * as XLSX from 'xlsx';
import {parseGvizPayload} from './gviz-parser';
import type {Item} from '../../shared/types';
import {normalizeSearch} from '../domain/search';

/**
 * A–O is the operating spreadsheet format, NOT the internal transfer format.
 * No technical recordId/documentKind columns are required from users.
 * This is a read-only preflight parser: it never writes to Firebase.
 */
export const BUSINESS_EXCEL_HEADERS = [
  'Mã hồ sơ','STT','Nội dung trình','Sở, ngành','Loại VB',
  'Cấp Thành ủy cho ý kiến','Tiến độ xin ý kiến Thành ủy',
  'Trình HĐND xây dựng NQ','Trình HĐND ban hành NQ',
  'Chuyên viên','Phòng','Lãnh đạo Văn phòng','Lãnh đạo UBND',
  'Tiến độ hiện tại','Ghi chú'
] as const;
export interface BusinessExcelIssue {
  sheet:string; row:number; column:string; message:string;
}
export interface BusinessExcelResult {
  sheet:string; sheetNames:string[]; items:Item[]; issues:BusinessExcelIssue[];
  sourceRows:number; sectionRows:number;
}
const MAX_BYTES=5*1024*1024;
const MAX_ROWS=1000;
const col=(i:number)=>XLSX.utils.encode_col(i);
const clean=(v:unknown)=>v==null?'':String(v);
const stableId=(code:string)=>{
  const raw=new TextEncoder().encode(code.trim());
  const encoded=Array.from(raw,b=>b.toString(16).padStart(2,'0')).join('');
  if(encoded.length>88)throw new Error('Mã hồ sơ quá dài để tạo khóa ổn định (tối đa 44 byte UTF-8).');
  return 'code_'+encoded;
};
export function listBusinessExcelSheets(input:ArrayBuffer|Uint8Array):string[]{
  const book=open(input);
  return [...book.SheetNames];
}
const open=(input:ArrayBuffer|Uint8Array)=>{
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.byteLength===0||bytes.byteLength>MAX_BYTES)
    throw new Error('File .xlsx rỗng hoặc vượt quá 5 MB.');
  try{return XLSX.read(bytes,{type:'array',cellDates:false,cellFormula:true});}
  catch{throw new Error('Không đọc được file .xlsx. Kiểm tra tệp và thử lại.');}
};
export function businessExcelTemplate():Uint8Array{
  const book=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet([Array.from(BUSINESS_EXCEL_HEADERS)]),'Du lieu');
  return new Uint8Array(XLSX.write(book,{type:'array',bookType:'xlsx',cellDates:false}) as ArrayBuffer);
}
/** Fail closed: never pick sheet zero on behalf of the user. */
export function inspectBusinessExcel(input:ArrayBuffer|Uint8Array,sheetName:string):BusinessExcelResult{
  const book=open(input),issues:BusinessExcelIssue[]=[];
  if(!book.SheetNames.includes(sheetName))
    throw new Error('Chưa chọn đúng sheet dữ liệu. Hãy chọn một sheet trong file.');
  const sheet=book.Sheets[sheetName];
  const area=sheet['!ref'];
  if(!area)throw new Error('Sheet "'+sheetName+'" không có dữ liệu.');
  const bounds=XLSX.utils.decode_range(area);
  if(bounds.e.c>40||bounds.e.r>MAX_ROWS+30)
    throw new Error('Sheet "'+sheetName+'" vượt giới hạn 1.000 hồ sơ hoặc 41 cột.');
  const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:'',blankrows:true});
  const text=(v:unknown)=>clean(v).trim();
  const headerIndex=rows.findIndex(row=>Array.isArray(row)&&
    normalizeSearch(text(row[2])).includes('noi dung')&&
    normalizeSearch(text(row[3])).includes('so'));
  if(headerIndex<0){
    return {sheet:sheetName,sheetNames:book.SheetNames,items:[],sourceRows:0,sectionRows:0,
      issues:[{sheet:sheetName,row:1,column:'C/D',message:'Không thấy tiêu đề Nội dung trình / Sở, ngành ở cột C/D.'}]};
  }
  const header=rows[headerIndex]??[];
  const required=[2,3,4,5,6,7,8,13,14];
  for(const i of required){
    const expected=normalizeSearch(BUSINESS_EXCEL_HEADERS[i]).replace('trinh hdnd','trinh hdnd');
    const actual=normalizeSearch(text(header[i]));
    // Preserve parser's canonical semantic aliases (HĐND captions may vary).
    const fragment=i===2?'noi dung':i===3?'so':i===4?'loai':
      i===5?'cap':i===6?'tien do xin y kien':i===7||i===8?'trinh hdnd':
      i===13?'tien do hien tai':'ghi chu';
    if(!actual.includes(fragment))issues.push({sheet:sheetName,row:headerIndex+1,
      column:col(i),message:'Tiêu đề cột không khớp: '+BUSINESS_EXCEL_HEADERS[i]+' (nhận: '+text(header[i])+').'});
    void expected;
  }
  const records=rows.slice(headerIndex+1);
  if(records.length>MAX_ROWS+25)issues.push({sheet:sheetName,row:headerIndex+2,column:'A:O',
    message:'Vượt giới hạn 1.000 hồ sơ.'});
  const seen=new Set<string>();
  let sourceRows=0,sectionRows=0;
  for(let i=0;i<records.length;i++){
    const row=records[i]??[],rowNumber=headerIndex+2+i;
    if(row.slice(0,15).every(v=>text(v)===''))continue;
    // Explicitly recognize section separators rather than silently dropping
    // arbitrary malformed rows. Section count is displayed in the preview.
    const section=!text(row[0])&&/^[IVXLCDM]+\.?$/i.test(text(row[1]))&&!!text(row[2]);
    if(section){sectionRows++;continue;}
    sourceRows++;
    if(!text(row[0]))issues.push({sheet:sheetName,row:rowNumber,column:'A',message:'Thiếu mã hồ sơ.'});
    if(!text(row[2]))issues.push({sheet:sheetName,row:rowNumber,column:'C',message:'Thiếu Nội dung trình.'});
    if(!Number.isSafeInteger(Number(row[1]))||Number(row[1])<=0)
      issues.push({sheet:sheetName,row:rowNumber,column:'B',message:'STT phải là số nguyên dương.'});
    const key=normalizeSearch(text(row[0]));
    if(key&&seen.has(key))issues.push({sheet:sheetName,row:rowNumber,column:'A',message:'Mã hồ sơ trùng: '+text(row[0])});
    seen.add(key);
    for(let j=0;j<15;j++){
      const addr=XLSX.utils.encode_cell({r:rowNumber-1,c:j}),cell=sheet[addr] as XLSX.CellObject|undefined;
      if(cell?.f)issues.push({sheet:sheetName,row:rowNumber,column:col(j),message:'Không chấp nhận công thức.'});
      if(cell?.t==='e')issues.push({sheet:sheetName,row:rowNumber,column:col(j),message:'Ô Excel có lỗi.'});
      if(typeof row[j]==='number'&&![1].includes(j))
        issues.push({sheet:sheetName,row:rowNumber,column:col(j),message:'Giá trị số nằm trong cột văn bản; chưa tự chuyển kiểu.'});
      if(typeof row[j]==='boolean'||row[j] instanceof Date)
        issues.push({sheet:sheetName,row:rowNumber,column:col(j),message:'Kiểu dữ liệu không phải văn bản theo nguồn.'});
      if(typeof row[j]==='string'&&(row[j] as string)!==(row[j] as string).trim())
        issues.push({sheet:sheetName,row:rowNumber,column:col(j),message:'Văn bản có khoảng trắng đầu/cuối; cần chuẩn hóa trong file trước khi nhập.'});
    }
    const kind=normalizeSearch(text(row[4]));
    if(!['hc','hanh chinh','qppl','nq','bc','bao cao'].includes(kind))
      issues.push({sheet:sheetName,row:rowNumber,column:'E',message:'Loại văn bản chưa chuẩn hóa (HC/QPPL/BC).'});
    try{if(key)stableId(text(row[0]));}catch(error){issues.push({sheet:sheetName,row:rowNumber,column:'A',message:(error as Error).message});}
  }
  if(!sourceRows)issues.push({sheet:sheetName,row:headerIndex+2,column:'A:O',message:'File không có hồ sơ dữ liệu.'});
  if(issues.length)return {sheet:sheetName,sheetNames:book.SheetNames,items:[],issues,sourceRows,sectionRows};
  // Reuse the existing official A–O semantic mapping and business-kind logic.
  // Feed only selected sheet values; never call Google Sheets or GViz network.
  const sourceRowsGviz=rows.map(row=>({c:Array.from({length:15},(_,i)=>({v:row?.[i]===''?null:row?.[i]}))}));
  const parsed=parseGvizPayload({status:'ok',table:{cols:Array.from({length:15},()=>({})),rows:sourceRowsGviz}},'excel');
  const items:Item[]=[];
  for(const item of parsed.items){
    const sourceIndex=Number(item.recordId.split(':row:')[1]);
    const code=item.displayCode;
    let id='';
    try{id=stableId(code);}catch(error){issues.push({sheet:sheetName,row:sourceIndex,column:'A',message:(error as Error).message});continue;}
    items.push({...item,recordId:id,revision:1});
  }
  for(const message of parsed.warnings)
    issues.push({sheet:sheetName,row:headerIndex+2,column:'A:O',message});
  if(items.length!==sourceRows)issues.push({sheet:sheetName,row:headerIndex+2,column:'A:O',
    message:'Số hồ sơ nhận diện không khớp dữ liệu gốc; cần kiểm tra các dòng chưa được phân loại.'});
  return {sheet:sheetName,sheetNames:book.SheetNames,items:issues.length?[]:items,issues,sourceRows,sectionRows};
}
