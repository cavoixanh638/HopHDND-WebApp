import type {Changes,Item,TextField} from '../../../shared/types';
import {displayId} from '../../domain/display-id';
import {isRecognizedStatus,type StatusCatalogField} from '../../domain/status-contract';
import {rejectsBuildChange} from '../../domain/pr95-v5-l4-build-effective';

/** These are the original consecutive Excel C–O columns, NOT merged UI cells. */
export const BULK_PASTE_COLUMNS:readonly {key:TextField;label:string;letter:string}[]=[
  {key:'content',label:'Nội dung trình',letter:'C'},
  {key:'department',label:'Sở, ngành chủ trì',letter:'D'},
  {key:'type',label:'Loại VB',letter:'E'},
  {key:'partyLevel',label:'Cấp Thành ủy cho ý kiến',letter:'F'},
  {key:'progressParty',label:'Tiến độ xin ý kiến Thành ủy',letter:'G'},
  {key:'progressBuild',label:'Trình HĐND xây dựng NQ',letter:'H'},
  {key:'progressCouncil',label:'Trình HĐND ban hành NQ',letter:'I'},
  {key:'specialist',label:'Chuyên viên VPUB',letter:'J'},
  {key:'room',label:'Phòng',letter:'K'},
  {key:'vpLeader',label:'Lãnh đạo VP',letter:'L'},
  {key:'ubndLeader',label:'Lãnh đạo UBND',letter:'M'},
  {key:'specificProgress',label:'Tiến độ hiện tại',letter:'N'},
  {key:'note',label:'Ghi chú',letter:'O'}
];
export interface BulkPatch {recordId:string;baseRevision:number;changes:Changes}
export interface BulkPreviewCell {
  recordId:string;code:string;field:TextField;column:string;before:string;after:string;
}
export interface BulkPastePlan {
  patches:BulkPatch[];cells:BulkPreviewCell[];rowsCovered:number;columnsCovered:number;
}
/** Excel's clipboard TSV supports CRLF and RFC-style quoted multiline cells. */
export function parseExcelClipboard(value:string):string[][]{
  if(value.length>500000)throw Error('Vùng dán vượt 500.000 ký tự.');
  if(!value)return [];
  const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,atStart=true;
  const finishCell=()=>{row.push(cell);cell='';atStart=true;};
  const finishRow=()=>{finishCell();rows.push(row);row=[];if(rows.length>1000)throw Error('Chỉ dán tối đa 1.000 hàng.');};
  for(let i=0;i<value.length;i++){
    const ch=value[i];
    if(ch==='"'){
      if(quoted&&value[i+1]==='"'){cell+='"';i++;continue;}
      if(quoted){quoted=false;continue;}
      if(atStart){quoted=true;atStart=false;continue;}
    }
    if(!quoted&&(ch==='\t'||ch==='\n'||ch==='\r')){
      if(ch==='\t'){finishCell();continue;}
      finishRow();if(ch==='\r'&&value[i+1]==='\n')i++;
      continue;
    }
    cell+=ch;atStart=false;
    if(cell.length>20000)throw Error('Một ô vượt quá 20.000 ký tự.');
  }
  if(quoted)throw Error('Dữ liệu Excel có dấu ngoặc kép chưa đóng.');
  if(row.length||cell.length||!/[\r\n]$/.test(value))finishRow();
  return rows;
}
export function planBulkPaste(args:{
  rows:readonly Item[];startRecordId:string;startField:TextField;text:string;
  canEdit?:(recordId:string,field:TextField)=>boolean;
}):BulkPastePlan{
  const {rows,startRecordId,startField,text,canEdit}=args;
  const start=rows.findIndex(item=>item.recordId===startRecordId);
  if(start<0)throw Error('Không tìm thấy dòng bắt đầu trong danh sách đang hiển thị.');
  const first=BULK_PASTE_COLUMNS.findIndex(col=>col.key===startField);
  if(first<0)throw Error('Chỉ dán vào các cột dữ liệu C–O, không thay ID hoặc STT.');
  const grid=parseExcelClipboard(text);
  if(!grid.length)throw Error('Chưa có dữ liệu được dán.');
  if(grid.length>rows.length-start)
    throw Error('Vùng dán dài hơn số dòng đang hiển thị. Không tự ghi sang dòng ẩn.');
  const columnsCovered=Math.max(...grid.map(cells=>cells.length));
  if(!columnsCovered||first+columnsCovered>BULK_PASTE_COLUMNS.length)
    throw Error('Vùng dán vượt cột O. Chọn lại cột bắt đầu hoặc giảm số cột.');
  const patches:BulkPatch[]=[],cells:BulkPreviewCell[]=[];
  for(let ri=0;ri<grid.length;ri++){
    const item=rows[start+ri],changes:Changes={};
    for(let ci=0;ci<grid[ri].length;ci++){
      const {key,letter}=BULK_PASTE_COLUMNS[first+ci];
      const after=grid[ri][ci];
      if(!after.trim())continue; // blank Excel cell must NEVER clear source silently
      if(after.length>20000)throw Error('Dòng '+(ri+1)+', cột '+letter+': văn bản quá dài.');
      if(after[0]==='='&&/^=[A-Z_]+\(/i.test(after))
        throw Error('Dòng '+(ri+1)+', cột '+letter+': chỉ dán giá trị, không dán công thức Excel.');
      if(key==='content'&&!after.trim())throw Error('Nội dung trình không được trống.');
      if((['partyLevel','progressParty','progressBuild','progressCouncil'] as string[]).includes(key)&&
        !isRecognizedStatus(key as StatusCatalogField,after))
        throw Error('Dòng '+(ri+1)+', cột '+letter+': trạng thái "'+after+'" không nằm trong lựa chọn hợp lệ.');
      if(key==='type'&&!['hc','qppl','bc'].includes(after.trim().toLowerCase()))
        throw Error('Dòng '+(ri+1)+', cột E: loại VB phải là HC, QPPL hoặc BC.');
      if(item[key]===after)continue;
      if(canEdit&&!canEdit(item.recordId,key))
        throw Error('Không có quyền sửa '+letter+' của hồ sơ '+displayId(item)+'.');
      changes[key]=after;
      cells.push({recordId:item.recordId,code:displayId(item),field:key,column:letter,
        before:item[key],after});
    }
    if(rejectsBuildChange(item,changes))
      throw Error('Hồ sơ '+displayId(item)+': Tiến độ xây dựng NQ đang bị khóa theo nghiệp vụ.');
    if(Object.keys(changes).length)
      patches.push({recordId:item.recordId,baseRevision:item.revision,changes});
  }
  if(!cells.length)throw Error('Vùng dán không có ô nào thay đổi (ô trống được bỏ qua).');
  return {patches,cells,rowsCovered:grid.length,columnsCovered};
}
