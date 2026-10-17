export interface ItemColumn { key: string; label: string; width: number; visible: boolean }
export interface ItemLayout { columns: ItemColumn[]; tableWidth: number; frameWidth?: 'auto'|number }

/** Exact A–R structure of the source tab "Các nội dung trình HĐND".
 * UI-only actions, derived metadata and audit history must not become Excel columns.
 */
export const EXCEL_SOURCE_COLUMNS = [
  {key:'displayCode',label:'ID',width:100},
  {key:'stt',label:'STT',width:70},
  {key:'content',label:'Nội dung trình',width:440},
  {key:'department',label:'Sở, ngành chủ trì',width:170},
  {key:'type',label:'Loại VB (HC/QPPL/BC)',width:170},
  {key:'partyLevel',label:'Cấp cho ý kiến',width:170},
  {key:'progressParty',label:'Tiến độ xin ý kiến Thành ủy',width:210},
  {key:'progressBuild',label:'Tiến độ trình HĐND xây dựng NQ',width:210},
  {key:'progressCouncil',label:'Tiến độ trình HĐND ban hành NQ/BC',width:210},
  {key:'specialist',label:'Chuyên viên VPUB',width:170},
  {key:'room',label:'Phòng chuyên môn',width:170},
  {key:'vpLeader',label:'Lãnh đạo VP',width:170},
  {key:'ubndLeader',label:'Lãnh đạo UBND TP',width:170},
  {key:'specificProgress',label:'Tiến độ cụ thể',width:200},
  {key:'isDropped',label:'Rút',width:120},
  {key:'partyMeeting',label:'Họp Thành ủy / xin ý kiến',width:200},
  {key:'examined',label:'Đã thẩm tra chưa',width:170},
  {key:'note',label:'Ghi chú',width:240},
] as const;
export const EXCEL_COLUMN_KEYS: readonly string[] = EXCEL_SOURCE_COLUMNS.map(column=>column.key);
const expected=new Set<string>(EXCEL_COLUMN_KEYS);
const oldUiOnly=new Set(['history']);

export const defaultItemLayout=():ItemLayout=>({
  tableWidth:1500,frameWidth:'auto',
  columns:EXCEL_SOURCE_COLUMNS.map(column=>({...column,
    visible:['displayCode','content','department','progressCouncil','specialist','room','partyMeeting','examined','isDropped'].includes(column.key)
  })),
});
export function validateItemLayout(value:unknown):ItemLayout{
  if(!value||typeof value!=='object')throw new Error('Bố trí danh sách không hợp lệ.');
  const input=value as ItemLayout,defaults=defaultItemLayout();
  if(!Number.isInteger(input.tableWidth)||input.tableWidth<500||input.tableWidth>6000)
    throw new Error('Độ rộng tối thiểu phần cột bên trong cần từ 500 đến 6000 px (khác với độ rộng vùng danh sách).');
  const frameWidth=input.frameWidth??'auto';
  if(frameWidth!=='auto'&&(!Number.isInteger(frameWidth)||frameWidth<320||frameWidth>6000))
    throw new Error('Độ rộng vùng danh sách cần từ 320 đến 6000 px hoặc Tự động.');
  if(!Array.isArray(input.columns))throw new Error('Danh sách cột không hợp lệ.');
  // Old shared/personal layouts may contain the historical "history" UI column.
  // Remove it rather than rejecting the entire saved profile. Do not touch audit data.
  const validSourceColumns=input.columns.filter(c=>!oldUiOnly.has(c.key));
  const keys=validSourceColumns.map(c=>c.key);
  if(new Set(keys).size!==keys.length||keys.some(key=>!expected.has(key)))
    throw new Error('Danh sách cột không hợp lệ hoặc bị trùng.');
  // P/Q were introduced later; append any newly supported Excel columns without
  // discarding the user's prior order, visibility, widths, and separate permissions.
  const missing=defaults.columns.filter(col=>!keys.includes(col.key));
  // Only P/Q are approved implicit migrations; every other missing source
  // column means the saved layout is incomplete and must not be silently guessed.
  if(missing.some(col=>col.key!=='partyMeeting'&&col.key!=='examined'))
    throw new Error('Thiếu cột bắt buộc trong cấu hình A–R.');
  const withMissing=[...validSourceColumns,...missing];
  if(withMissing.length!==EXCEL_SOURCE_COLUMNS.length)
    throw new Error('Danh sách cột cần đủ các cột A–R của nguồn Excel.');
  const columns=withMissing.map(column=>{
    const base=defaults.columns.find(entry=>entry.key===column.key);
    if(!base||typeof column.visible!=='boolean'||!Number.isInteger(column.width)||
      column.width<60||column.width>1600)
      throw new Error('Độ rộng cột cần từ 60 đến 1600 px.');
    return {...base,width:column.width,visible:column.visible};
  });
  if(!columns.some(column=>column.visible))
    throw new Error('Cần ít nhất một cột dữ liệu hiển thị.');
  return {columns,tableWidth:input.tableWidth,frameWidth};
}
const key=(source:string)=>`hdnd.item-layout.v1:${source}`;
export function loadItemLayout(source:string):ItemLayout{
  try{const raw=globalThis.localStorage?.getItem(key(source));return raw?validateItemLayout(JSON.parse(raw)):defaultItemLayout();}
  catch{return defaultItemLayout();}
}
export function saveItemLayout(source:string,value:ItemLayout):boolean{
  const layout=validateItemLayout(value);
  try{if(!globalThis.localStorage)return false;
    globalThis.localStorage.setItem(key(source),JSON.stringify(layout));return true;
  }catch{return false;}
}
