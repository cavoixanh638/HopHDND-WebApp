export interface ItemColumn {
  key:string; label:string; width:number; visible:boolean;
  /** Excel source columns retain their mapping, even when hidden or removed from the table. */
  origin?:'custom'; removed?:boolean; renamed?:boolean;
  kind?:'text'|'select'; options?:string[];
  /** Independent column values keyed by stable app row ID; never written to Excel. */
  values?:Record<string,string>;
}
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
  {key:'specificProgress',label:'Tiến độ hiện tại',width:200},
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
    visible:true
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
  if(new Set(keys).size!==keys.length)throw new Error('Danh sách cột không hợp lệ hoặc bị trùng.');
  const customKeys=keys.filter(key=>!expected.has(key));
  if(customKeys.length>20||customKeys.some(key=>!/^custom_[a-zA-Z0-9_-]{8,36}$/.test(key)))
    throw new Error('Tối đa 20 cột tự tạo, mã cột phải hợp lệ.');
  // P/Q were introduced later; append any newly supported Excel columns without
  // discarding the user's prior order, visibility, widths, and separate permissions.
  const missing=defaults.columns.filter(col=>!keys.includes(col.key));
  // Only P/Q are approved implicit migrations; every other missing source
  // column means the saved layout is incomplete and must not be silently guessed.
  if(missing.some(col=>col.key!=='partyMeeting'&&col.key!=='examined'))
    throw new Error('Thiếu cột bắt buộc trong cấu hình A–R.');
  const withMissing=[...validSourceColumns,...missing];
  if(withMissing.length!==EXCEL_SOURCE_COLUMNS.length+customKeys.length)
    throw new Error('Danh sách cột cần đủ các cột A–R của nguồn Excel.');
  const columns=withMissing.map(column=>{
    const base=defaults.columns.find(entry=>entry.key===column.key);
    if(typeof column.visible!=='boolean'||!Number.isInteger(column.width)||
       column.width<60||column.width>1600)
      throw new Error('Độ rộng cột cần từ 60 đến 1600 px.');
    const isCustom=!base;
    if(isCustom&&column.origin!=='custom')
      throw new Error('Cột tự tạo phải có nguồn độc lập với Excel.');
    if(typeof column.label!=='string'||!column.label.trim()||column.label.length>100)
      throw new Error('Tên cột cần từ 1 đến 100 ký tự.');
    const kind=column.kind??'text';
    if(kind!=='text'&&kind!=='select')throw new Error('Kiểu giá trị của cột không hợp lệ.');
    const options=column.options??[];
    if(!Array.isArray(options)||options.length>50||
       options.some(v=>typeof v!=='string'||!v.trim()||v.length>100)||
       new Set(options).size!==options.length)
      throw new Error('Danh sách lựa chọn trùng hoặc không hợp lệ (tối đa 50).');
    const values:Record<string,string>={};
    if(isCustom){
      if(column.values!==undefined&&(!column.values||typeof column.values!=='object'||Array.isArray(column.values)))
        throw new Error('Dữ liệu cột tự tạo không hợp lệ.');
      for(const [id,value] of Object.entries(column.values??{})){
        if(!/^[a-zA-Z0-9_:-]{1,200}$/.test(id)||typeof value!=='string'||value.length>1000)
          throw new Error('Dữ liệu cột tự tạo có hàng hoặc giá trị không hợp lệ.');
        if(value)values[id]=value;
      }
      if(Object.keys(values).length>1000)throw new Error('Cột tự tạo vượt quá 1.000 dòng.');
    }
    return {...(base??{key:column.key,label:column.label,width:170,visible:true}),
      width:column.width,visible:column.visible,
      ...(isCustom?{origin:'custom' as const,values}:{ }),
      ...(column.removed?{removed:true}:{}),
      ...(column.renamed?{renamed:true,label:column.label.trim()}:isCustom?{label:column.label.trim()}:{}),
      ...(column.kind?{kind}:{ }),
      ...(kind==='select'?{options}:{}),
    };
  });
  if(!columns.some(column=>column.visible&&!column.removed))
    throw new Error('Cần ít nhất một cột dữ liệu hiển thị.');
  return {columns,tableWidth:input.tableWidth,frameWidth};
}
/** A personal view controls width, visibility and order only. Live shared schema
 * and independent values always come from the latest authoritative profile. */
export function overlayPersonalLayout(sharedInput:ItemLayout,presetInput:ItemLayout):ItemLayout{
  const shared=validateItemLayout(sharedInput),preset=validateItemLayout(presetInput);
  const byKey=new Map(shared.columns.map(c=>[c.key,c]));
  const used=new Set<string>();
  const columns=preset.columns.flatMap(old=>{
    const current=byKey.get(old.key);
    if(!current)return [];
    used.add(current.key);
    return [{...current,width:old.width,visible:old.visible}];
  });
  for(const column of shared.columns)if(!used.has(column.key))columns.push(column);
  return validateItemLayout({
    ...shared,columns,tableWidth:preset.tableWidth,frameWidth:preset.frameWidth
  });
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
