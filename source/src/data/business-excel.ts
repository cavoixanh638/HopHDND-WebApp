import * as XLSX from 'xlsx';
import type {Item} from '../../shared/types';
import {TEXT_FIELDS,STATUS_OPTIONS} from '../../shared/field-definitions';
import {EXCEL_SOURCE_COLUMNS} from './item-preferences';
import {normalizeSearch} from '../domain/search';
import {summarizeListItems} from '../domain/item-summary';

export const BUSINESS_HEADERS=EXCEL_SOURCE_COLUMNS.map(col=>col.label);
export const BUSINESS_MAX_BYTES=5*1024*1024;
const MAX_ROWS=1000;
const LETTERS=(col:number)=>XLSX.utils.encode_col(col);
export type WorkbookInspection={sheets:string[];size:number};
export type ImportIssue={sheet:string;row:number;column:string;message:string};
export type BusinessReadResult={
  sheet:string;items:Item[];issues:ImportIssue[];
  statistics:ReturnType<typeof summarizeListItems>;
};
export type ImportDiff={added:number;changed:number;removed:number;unchanged:number;addedCodes:string[];removedCodes:string[]};
const emptySummary=()=>summarizeListItems([]);
function openWorkbook(input:ArrayBuffer|Uint8Array){
  const data=input instanceof Uint8Array?input:new Uint8Array(input);
  if(!data.length||data.length>BUSINESS_MAX_BYTES)
    throw new Error('Tệp Excel phải có dữ liệu và không vượt quá 5 MB.');
  try{return XLSX.read(data,{type:'array',cellFormula:true,cellDates:false});}
  catch{throw new Error('Tệp Excel .xlsx bị hỏng hoặc không đọc được.');}
}
export function inspectBusinessWorkbook(input:ArrayBuffer|Uint8Array):WorkbookInspection{
  const workbook=openWorkbook(input);
  if(!workbook.SheetNames.length)throw new Error('Tệp Excel không có sheet.');
  return {sheets:[...workbook.SheetNames],size:input.byteLength};
}
export function createBusinessTemplate():Uint8Array{
  const book=XLSX.utils.book_new();
  const sheet=XLSX.utils.aoa_to_sheet([BUSINESS_HEADERS]);
  XLSX.utils.book_append_sheet(book,sheet,'Danh sach');
  return new Uint8Array(XLSX.write(book,{bookType:'xlsx',type:'array'}) as ArrayBuffer);
}
const normalize=(value:unknown)=>normalizeSearch(String(value??'')).replace(/[\\s,;:()／/–—-]+/g,' ').trim();
const actual=(value:unknown)=>{
  if(value==null)return '';
  if(typeof value==='boolean')return value?'TRUE':'FALSE';
  return String(value).trim();
};
function stableBusinessId(code:string){
  // Deterministic from the business code, not from an Excel row number.
  // Collision detection remains mandatory and is verified below.
  let h=2166136261;
  for(const byte of new TextEncoder().encode(code.normalize('NFKC').trim().toUpperCase())){
    h=Math.imul(h^byte,16777619)>>>0;
  }
  const slug=normalize(code).replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'').slice(0,56)||'code';
  return 'biz_'+h.toString(16).padStart(8,'0')+'_'+slug;
}
const allowedStatus:Record<string,readonly string[]>=STATUS_OPTIONS;
const typeValues=new Set(['HC','QPPL','BC']);
/** Strict A–O business Excel import. No technical recordId/documentKind columns,
 * no first-sheet fallback, and no silent row skipping/normalisation.
 */
export function readBusinessWorkbook(input:ArrayBuffer|Uint8Array,sheetName?:string):BusinessReadResult{
  const book=openWorkbook(input);
  if(book.SheetNames.length!==1&&!sheetName)
    throw new Error('Tệp có nhiều sheet: phải chọn rõ sheet dữ liệu; không lấy sheet đầu tiên.');
  const name=sheetName??book.SheetNames[0];
  if(!name||!book.SheetNames.includes(name))
    throw new Error('Sheet dữ liệu không tồn tại trong tệp.');
  const sheet=book.Sheets[name];
  const issues:ImportIssue[]=[];
  const issue=(row:number,col:number,message:string)=>{
    issues.push({sheet:name,row,column:LETTERS(col),message});
  };
  const range=XLSX.utils.decode_range(sheet['!ref']??'A1');
  if(range.e.r>MAX_ROWS+20||range.e.c>63)
    throw new Error('Sheet vượt 1.000 hồ sơ hoặc quá 64 cột; hãy kiểm tra vùng dữ liệu.');
  const headerCount=BUSINESS_HEADERS.length;
  const data=XLSX.utils.sheet_to_json<unknown[]>(sheet,{
    header:1,raw:true,defval:null,blankrows:true
  });
  const rowIndex=data.slice(0,10).findIndex(row=>Array.isArray(row)&&
    normalize(row[2])===normalize(BUSINESS_HEADERS[2]));
  if(rowIndex<0){
    issue(1,2,'Không tìm được dòng tiêu đề Nội dung trình / Sở, ngành tại C/D trong 10 dòng đầu.');
    return {sheet:name,items:[],issues,statistics:emptySummary()};
  }
  const headers=data[rowIndex]??[];
  for(let col=0;col<headerCount;col++)
    if(normalize(headers[col])!==normalize(BUSINESS_HEADERS[col]))
      issue(rowIndex+1,col,'Tiêu đề phải là "'+BUSINESS_HEADERS[col]+'"; đang có "'+actual(headers[col])+'".');
  if(headers.slice(headerCount).some(cell=>actual(cell)))
    issue(rowIndex+1,headerCount,'Sheet có cột dữ liệu sau O; không tự bỏ qua.');
  const items:Item[]=[],seenCodes=new Set<string>(),seenIds=new Set<string>(),seenOrdinals=new Set<number>();
  for(let index=rowIndex+1;index<data.length;index++){
    const cells=data[index]??[];
    if(!cells.some(cell=>actual(cell)))continue;
    const excelRow=index+1;
    if(items.length>=MAX_ROWS){issue(excelRow,0,'Vượt số hồ sơ tối đa 1.000.');break;}
    for(const address of Object.keys(sheet)){
      if(address.startsWith('!'))continue;
      const decoded=XLSX.utils.decode_cell(address);
      if(decoded.r===index&&(sheet[address] as XLSX.CellObject).f!==undefined)
        issue(excelRow,decoded.c,'Không chấp nhận công thức; hãy chuyển sang giá trị tĩnh.');
    }
    if(cells.slice(headerCount).some(cell=>actual(cell)))
      issue(excelRow,headerCount,'Có nội dung sau cột O; không tự bỏ qua.');
    const values=Array.from({length:headerCount},(_,i)=>actual(cells[i]));
    const code=values[0],ordinal=cells[1],content=values[2],department=values[3],rawType=normalize(values[4]);
    if(!code)issue(excelRow,0,'Thiếu mã hồ sơ ở cột A.');
    if(!/^[-_\p{L}\p{N}.\/ ]{1,100}$/u.test(code))issue(excelRow,0,'Mã hồ sơ có ký tự không hỗ trợ hoặc dài quá 100 ký tự.');
    const folded=normalize(code);
    if(code&&seenCodes.has(folded))issue(excelRow,0,'Mã hồ sơ trùng trong file: '+code);
    seenCodes.add(folded);
    const stt=typeof ordinal==='number'?ordinal:Number(actual(ordinal));
    if(!Number.isSafeInteger(stt)||stt<1)issue(excelRow,1,'STT phải là số nguyên dương.');
    if(seenOrdinals.has(stt))issue(excelRow,1,'STT bị trùng trong file.');
    seenOrdinals.add(stt);
    if(!content)issue(excelRow,2,'Nội dung trình không được để trống.');
    if(!department)issue(excelRow,3,'Sở/ngành chủ trì không được để trống.');
    const type=rawType==='hc'||rawType==='hanh chinh'?'HC':
      rawType==='qppl'?'QPPL':rawType==='bc'||rawType==='bao cao'?'BC':'';
    if(!type||!typeValues.has(type))
      issue(excelRow,4,'Loại VB phải là HC, QPPL hoặc BC; không suy đoán theo mã.');
    for(const [field,col] of [['progressParty',6],['progressBuild',7],['progressCouncil',8]] as const){
      const value=values[col];
      if(value&&!allowedStatus[field].some(valid=>normalize(valid)===normalize(value)))
        issue(excelRow,col,'Trạng thái chưa chuẩn hóa: "'+value+'". Phải dùng giá trị danh mục hiện hành.');
    }
    const recordId=stableBusinessId(code);
    if(seenIds.has(recordId))issue(excelRow,0,'recordId dẫn xuất bị trùng; cần sửa mã.');
    seenIds.add(recordId);
    items.push({
      recordId,displayCode:code,stt,documentKind:type==='BC'?'BC':type?'NQ':'UNCLASSIFIED',
      ...Object.fromEntries(TEXT_FIELDS.map(field=>{
        const col=BUSINESS_HEADERS.findIndex(header=>header===field.label);
        return [field.key,values[col]??''];
      })),
      type:values[4],partyMeeting:'',examined:'',isDropped:false,archivedAt:null,revision:1
    } as Item);
  }
  if(!items.length)issue(rowIndex+2,0,'Không có hồ sơ để nhập; tệp rỗng không được thay dữ liệu.');
  return {sheet:name,items:issues.length?[]:items,issues,
    statistics:issues.length?emptySummary():summarizeListItems(items)};
}
export function compareBusinessImport(oldItems:readonly Item[],next:readonly Item[]):ImportDiff{
  const before=new Map(oldItems.map(x=>[normalize(x.displayCode),x]));
  const after=new Map(next.map(x=>[normalize(x.displayCode),x]));
  let changed=0,unchanged=0;
  for(const [code,item] of after){
    const prior=before.get(code);
    if(!prior)continue;
    const fields:readonly (keyof Item)[]=['content','department','type','partyLevel','progressParty',
      'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader','specificProgress','note'];
    if(fields.some(k=>prior[k]!==item[k]))changed++;else unchanged++;
  }
  return {added:[...after.keys()].filter(k=>!before.has(k)).length,changed,
    unchanged,removed:[...before.keys()].filter(k=>!after.has(k)).length,
    addedCodes:next.filter(x=>!before.has(normalize(x.displayCode))).map(x=>x.displayCode),
    removedCodes:oldItems.filter(x=>!after.has(normalize(x.displayCode))).map(x=>x.displayCode)};
}
