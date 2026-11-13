import * as XLSX from 'xlsx';
import {BUSINESS_HEADERS,parseBusinessExcel} from './business-excel';

/**
 * Business-sheet SCHEMA fingerprint, NOT a hash of business values, row count,
 * file/sheet name or visibility. All workbook tabs, including Hidden and
 * VeryHidden, and all populated cells including hidden rows/columns are read.
 * A near match is a diagnostic ONLY. Only a full ordered 15-field match that
 * passes the strict business importer can be offered for upload.
 */
const HEADER_ALIASES:readonly (readonly string[])[]=[
  ['Mã nội dung','ID'],['STT'],['Nội dung trình'],
  ['Sở, ngành','Sở, ngành chủ trì'],['Loại VB'],
  ['Cấp cho ý kiến Thành ủy','Cấp Thành ủy cho ý kiến'],
  ['Tiến độ xin ý kiến Thành ủy'],
  ['Trình HĐND xây dựng NQ','Trình HĐND xây dựng nghị quyết',
   'Tiến độ trình HĐND xây dựng NQ'],
  ['Trình HĐND ban hành NQ','Trình HĐND ban hành nghị quyết',
   'Tiến độ trình HĐND ban hành NQ/ BC'],
  ['Chuyên viên','Chuyên viên VPUB'],['Phòng','Phòng chuyên môn'],
  ['Lãnh đạo VP','Lãnh đạo Văn phòng'],
  ['Lãnh đạo UBND','Lãnh đạo Ủy ban nhân dân','Lãnh đạo UBND TP'],
  ['Tiến độ hiện tại'],['Ghi chú']
];
const normalize=(value:unknown)=>String(value??'').trim().toLocaleLowerCase('vi')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d')
  .replace(/\s+/g,' ');
const match=(value:unknown,col:number)=>
  HEADER_ALIASES[col].some(alias=>normalize(alias)===normalize(value));
const SCHEMA_ROLES=BUSINESS_HEADERS.map((_,col)=>String(col)+':'+normalize(BUSINESS_HEADERS[col])).join('|');
function schemaHash():string {
  let hash=2166136261;
  for(const byte of new TextEncoder().encode('hdnd:ao:v1|'+SCHEMA_ROLES)){
    hash=Math.imul(hash^byte,16777619)>>>0;
  }
  return 'HDND-AO-V1-'+hash.toString(16).padStart(8,'0');
}
export type SheetVisibility='visible'|'hidden'|'very-hidden';
export interface SheetSchemaFingerprint{
  name:string;
  visibility:SheetVisibility;
  /** 0-100: only the 15 expected semantic header roles, not the record count */
  score:number;
  matchedColumns:number;
  totalColumns:15;
  headerRow:number|null;
  fingerprint:string|null;
  hiddenRows:number;
  hiddenColumns:string[];
  eligible:boolean;
  explanation:string;
}
export interface WorkbookSchemaInspection{
  sheets:SheetSchemaFingerprint[];
  validSheets:string[];
  /** Null if none OR if multiple matching sheets, including hidden sheets. */
  recommendedSheet:string|null;
  ambiguous:boolean;
}
function hiddenColumns(sheet:XLSX.WorkSheet):string[]{
  return (sheet['!cols']??[]).flatMap((col,index)=>
    col?.hidden?[XLSX.utils.encode_col(index)]:[]);
}
function hiddenRows(sheet:XLSX.WorkSheet):number{
  return (sheet['!rows']??[]).reduce((total,row)=>total+(row?.hidden?1:0),0);
}
function contentHeaders(sheet:XLSX.WorkSheet):Map<number,(string|number|boolean|null)[]>{
  const rows=new Map<number,(string|number|boolean|null)[]>();
  for(const [address,unknownCell] of Object.entries(sheet)){
    if(!/^[A-Z]+[1-9][0-9]*$/.test(address))continue;
    const position=XLSX.utils.decode_cell(address);
    if(position.c>=BUSINESS_HEADERS.length)continue;
    const cell=unknownCell as XLSX.CellObject;
    // A header may be located in a hidden row or a hidden column. Do not use
    // !ref extent, autofilter, sheet visibility, or !rows/!cols to skip cells.
    if(cell.v===undefined||cell.v===null)continue;
    const row=rows.get(position.r)??Array(BUSINESS_HEADERS.length).fill(null);
    row[position.c]=cell.v as string|number|boolean;
    rows.set(position.r,row);
  }
  return rows;
}
export function inspectWorkbookSchema(input:ArrayBuffer|Uint8Array):WorkbookSchemaInspection{
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(!bytes.byteLength||bytes.byteLength>5*1024*1024)
    throw Error('Excel: chỉ nhận tệp .xlsx không rỗng, tối đa 5 MB.');
  let book:XLSX.WorkBook;
  try{book=XLSX.read(bytes,{type:'array',cellFormula:true,cellDates:false,cellStyles:true});}
  catch{throw Error('Excel: không đọc được file .xlsx hợp lệ.');}
  const sheets=book.SheetNames.map((name,index):SheetSchemaFingerprint=>{
    const sheet=book.Sheets[name], state=book.Workbook?.Sheets?.[index]?.Hidden??0;
    const visibility:SheetVisibility=state===2?'very-hidden':state===1?'hidden':'visible';
    const candidates=[...contentHeaders(sheet).entries()].map(([r,cells])=>({
      row:r+1,matched:HEADER_ALIASES.reduce((sum,_,col)=>sum+Number(match(cells[col],col)),0),
      cells
    })).sort((a,b)=>b.matched-a.matched||a.row-b.row);
    const best=candidates[0],matched=best?.matched??0;
    const score=Math.round(matched/HEADER_ALIASES.length*100);
    const full=candidates.filter(candidate=>candidate.matched===HEADER_ALIASES.length);
    const info:SheetSchemaFingerprint={
      name,visibility,score,matchedColumns:matched,totalColumns:15,
      headerRow:best?.row??null,
      fingerprint:matched===HEADER_ALIASES.length?schemaHash():null,
      hiddenRows:hiddenRows(sheet),hiddenColumns:hiddenColumns(sheet),
      eligible:false,explanation:''
    };
    if(matched!==HEADER_ALIASES.length){
      const missing=best?HEADER_ALIASES.flatMap((_,col)=>
        match(best.cells[col],col)?[]:[XLSX.utils.encode_col(col)]):[];
      info.explanation=matched===0?'Không có hàng tiêu đề nghiệp vụ HĐND':
        'Khác cấu trúc tại cột '+missing.join(', ');
      return info;
    }
    if(full.length>1){
      info.explanation='Phát hiện nhiều bảng A–O trong cùng sheet; không tự chọn.';
      return info;
    }
    // Strict parse validates every populated row, including hidden rows.
    // No numeric row count is read by or contributes to the fingerprint score.
    try{
      parseBusinessExcel(bytes,name);
      info.eligible=true;
      info.explanation='Khớp đủ 15 trường A–O và dữ liệu được kiểm tra hợp lệ.';
    }catch(error){
      info.explanation=error instanceof Error?error.message:'Không đọc được dữ liệu của sheet.';
    }
    return info;
  });
  const validSheets=sheets.filter(sheet=>sheet.eligible).map(sheet=>sheet.name);
  return {sheets,validSheets,
    recommendedSheet:validSheets.length===1?validSheets[0]:null,
    ambiguous:validSheets.length>1};
}
