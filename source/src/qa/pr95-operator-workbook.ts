import * as XLSX from 'xlsx';
import type {Item} from '../../shared/types';
import {BUSINESS_HEADERS,inspectBusinessExcel,parseBusinessExcel,type BusinessExcelInspection} from '../data/business-excel';

/** Strict preview-only compatibility adapter for the operator's titled A–O workbook.
 * All Excel formulas are treated as untrusted; just two exact known patterns are
 * verified from source-cell references plus cached value. Nothing is evaluated. */
const norm=(v:unknown)=>String(v??'').trim().toLocaleLowerCase('vi').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ');
const headings=['ID','STT','NỘI DUNG TRÌNH','SỞ, NGÀNH CHỦ TRÌ','Loại VB',
  'Cấp Thành ủy cho ý kiến','Tiến độ xin ý kiến Thành ủy',
  'Tiến độ trình HĐND xây dựng NQ','Tiến độ trình HĐND ban hành NQ/ BC',
  'Chuyên viên VPUB','Phòng chuyên môn','Lãnh đạo VP','Lãnh đạo UBND TP',
  'Tiến độ hiện tại','Ghi chú'];
const read=(input:ArrayBuffer|Uint8Array)=>{
  const b=input instanceof Uint8Array?input:new Uint8Array(input);
  if(!b.byteLength||b.byteLength>5*1024*1024)throw Error('Excel phải có dữ liệu và không quá 5 MB.');
  try{return XLSX.read(b,{type:'array',cellFormula:true,cellDates:false});}
  catch{throw Error('Tệp .xlsx không đọc được.');}
};
const rowsOf=(sheet:XLSX.WorkSheet):unknown[][]=>{
  const range=XLSX.utils.decode_range(sheet['!ref']??'A1');
  if(range.e.r>3000||range.e.c>50)throw Error('Vùng sheet lớn bất thường, không thể nhập an toàn.');
  return XLSX.utils.sheet_to_json<unknown[]>(sheet,
    {header:1,raw:true,defval:'',blankrows:true});
};
const isOperator=(sheet:XLSX.WorkSheet)=>{
  const line=rowsOf(sheet)[1]??[];
  return headings.every((text,i)=>norm(line[i])===norm(text));
};
export interface InferredOperatorCode {row:number;stt:number;code:string}
export interface PreviewBusinessImport {
  sheetName:string;items:Item[];warnings:string[];
  inferredCodes:InferredOperatorCode[];normalizedBytes?:Uint8Array;
}
export function inspectPreviewBusinessExcel(input:ArrayBuffer|Uint8Array):BusinessExcelInspection{
  const book=read(input),known=inspectBusinessExcel(input);
  const valid=new Set(known.validSheets);
  for(const name of book.SheetNames){
    try{if(isOperator(book.Sheets[name]))valid.add(name);}catch{/* not eligible */}
  }
  return {sheetNames:book.SheetNames,validSheets:book.SheetNames.filter(n=>valid.has(n))};
}
export function parsePreviewBusinessExcel(input:ArrayBuffer|Uint8Array,sheetName:string):PreviewBusinessImport{
  const book=read(input);
  if(!sheetName||!book.SheetNames.includes(sheetName))
    throw Error('Cần chọn chính xác sheet hồ sơ.');
  const sheet=book.Sheets[sheetName];
  if(!isOperator(sheet)){
    const parsed=parseBusinessExcel(input,sheetName);
    return {sheetName,items:parsed.items,warnings:[],inferredCodes:[]};
  }
  const rows=rowsOf(sheet);
  if((rows[2]??[]).some(v=>String(v??'').trim()))
    throw Error('Sheet "'+sheetName+'", dòng 3: dòng đệm phải trống.');
  const end=rows.reduce((last,row,i)=>i>=3&&row.slice(0,15)
    .some(v=>String(v??'').trim())?i:last,-1);
  if(end<3)throw Error('Sheet "'+sheetName+'": không tìm thấy hồ sơ.');
  if(end-2>1000)throw Error('Số hồ sơ vượt 1.000.');
  const converted:unknown[][]=[[...BUSINESS_HEADERS]];
  const warnings:string[]=[],inferredCodes:InferredOperatorCode[]=[];
  const codes=new Set<string>();
  let previous=0;
  for(let i=3;i<=end;i++){
    const n=i+1,values=rows[i]??[];
    if(!values.slice(0,15).some(v=>String(v??'').trim()))
      throw Error('Sheet "'+sheetName+'", dòng '+n+': có dòng trống giữa các hồ sơ.');
    if(values.slice(15).some(v=>String(v??'').trim()))
      throw Error('Sheet "'+sheetName+'", dòng '+n+': có dữ liệu ngoài cột O.');
    const bc=sheet['B'+n] as XLSX.CellObject|undefined;
    const stt=Number(bc?.v??values[1]);
    if(!Number.isSafeInteger(stt)||stt<=0)
      throw Error('Ô B'+n+': STT không phải số nguyên dương.');
    if(bc?.f!==undefined){
      const expected='B'+(n-1)+'+1';
      if(bc.f.replace(/\s/g,'').toUpperCase()!==expected||stt!==previous+1)
        throw Error('Ô B'+n+': công thức STT không đúng mẫu/giá trị.');
    }
    const ac=sheet['A'+n] as XLSX.CellObject|undefined;
    let code=String(ac?.v??values[0]??'');
    if(ac?.f!==undefined){
      const expected='CONCATENATE("NQ",B'+n+')';
      if(ac.f.replace(/\s/g,'').toUpperCase()!==expected)
        throw Error('Ô A'+n+': không cho phép công thức ID ngoài mẫu.');
      const calculated='NQ'+stt;
      if(code&&code!==calculated)
        throw Error('Ô A'+n+': kết quả cached của công thức khác '+calculated+'.');
      code=calculated;
    }else if(!code.trim()){
      if(!['hc','qppl'].includes(norm(values[4])))
        throw Error('Ô A'+n+': không thể suy ra mã cho loại VB này.');
      code='NQ'+stt;
      warnings.push('Dòng '+n+' (STT '+stt+'): ID trống; đề xuất '+code+' trong bản thử.');
      inferredCodes.push({row:n,stt,code});
    }
    if(code!==code.trim()||codes.has(code))
      throw Error('Ô A'+n+': mã trùng hoặc thừa khoảng trắng.');
    codes.add(code);
    for(let c=2;c<15;c++){
      const pos=XLSX.utils.encode_cell({r:i,c});
      const cell=sheet[pos] as XLSX.CellObject|undefined;
      if(cell?.f!==undefined||cell?.t==='e')
        throw Error('Ô '+pos+': không được dùng công thức hoặc chứa lỗi.');
    }
    converted.push([code,stt,...Array.from({length:13},(_,c)=>String(values[c+2]??''))]);
    previous=stt;
  }
  const wb=XLSX.utils.book_new(),ws=XLSX.utils.aoa_to_sheet(converted);
  for(const [pos,v] of Object.entries(ws)){
    if(pos.startsWith('!'))continue;
    const cell=v as XLSX.CellObject;
    if(typeof cell.v==='string'){cell.t='s';delete cell.f;}
  }
  XLSX.utils.book_append_sheet(wb,ws,'Du lieu HĐND');
  const normalizedBytes=new Uint8Array(XLSX.write(wb,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
  const parsed=parseBusinessExcel(normalizedBytes,'Du lieu HĐND');
  if(parsed.count!==converted.length-1)throw Error('Chuẩn hóa làm mất hồ sơ, không nhập.');
  return {items:parsed.items,sheetName,warnings,inferredCodes,normalizedBytes};
}
