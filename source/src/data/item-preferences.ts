export interface ItemColumn {
  key:string; label:string; width:number; visible:boolean;
  /** Excel source columns retain their mapping, even when hidden or removed from the table. */
  origin?:'custom'; removed?:boolean; renamed?:boolean;
  kind?:'text'|'select'; options?:string[];
  /** Independent column values keyed by stable app row ID; never written to Excel. */
  values?:Record<string,string>;
}
export interface CellHighlightRule {
  id:string;word:string;field:string;textColor:string;backgroundColor:string;
}
export type SharedCompactDisplay=Record<'typeInContent'|'contentDetails'|'partyTogether'|'councilTogether'|'leadersTogether'|'roomSpecialist'|'teamTogether'|'shortSpecialist'|'shortLeaders',boolean>;
export const EMPTY_COMPACT:SharedCompactDisplay={typeInContent:false,contentDetails:false,partyTogether:false,councilTogether:false,leadersTogether:false,roomSpecialist:false,teamTogether:false,shortSpecialist:false,shortLeaders:false};
export interface ItemLayout {
  columns:ItemColumn[];tableWidth:number;frameWidth?:'auto'|number;
  compactDisplay?:SharedCompactDisplay;
  cellHighlights?:CellHighlightRule[];
}
const hexColor=/^#[0-9a-fA-F]{6}$/;
export function cellHighlightStyle(value:unknown,field:string,rules:readonly CellHighlightRule[]|undefined):
  {color:string;backgroundColor:string}|undefined {
  if(!rules?.length)return undefined;
  const fold=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase();
  const text=fold(String(value??''));
  const matched=rules.find(r=>(r.field==='*'||r.field===field)&&
    r.word.trim()&&text.includes(fold(r.word.trim())));
  return matched?{color:matched.textColor,backgroundColor:matched.backgroundColor}:undefined;
}

/** Exact A–O structure of the current Excel source tab. Older A–R layouts are migrated. 
 * UI-only actions, derived metadata and audit history must not become Excel columns.
 */
export const EXCEL_SOURCE_COLUMNS = [
  {key:'displayCode',label:'ID',width:68},
  {key:'stt',label:'STT',width:70},
  {key:'content',label:'Nội dung trình',width:440},
  {key:'department',label:'Sở, ngành chủ trì',width:170},
  {key:'type',label:'Loại VB',width:170},
  {key:'partyLevel',label:'Cấp Thành ủy cho ý kiến',width:190},
  {key:'progressParty',label:'Tiến độ xin ý kiến Thành ủy',width:210},
  {key:'progressBuild',label:'Tiến độ trình HĐND xây dựng NQ',width:210},
  {key:'progressCouncil',label:'Tiến độ trình HĐND ban hành NQ/BC',width:210},
  {key:'specialist',label:'Chuyên viên VPUB',width:170},
  {key:'room',label:'Phòng chuyên môn',width:170},
  {key:'vpLeader',label:'Lãnh đạo VP',width:170},
  {key:'ubndLeader',label:'Lãnh đạo UBND TP',width:170},
  {key:'specificProgress',label:'Tiến độ hiện tại',width:200},
  {key:'note',label:'Ghi chú',width:240},
] as const;
export const EXCEL_COLUMN_KEYS: readonly string[] = EXCEL_SOURCE_COLUMNS.map(column=>column.key);
const expected=new Set<string>(EXCEL_COLUMN_KEYS);
const oldUiOnly=new Set(['history','isDropped','partyMeeting','examined']);

export const defaultItemLayout=():ItemLayout=>({
  tableWidth:1500,frameWidth:'auto',cellHighlights:[],compactDisplay:{...EMPTY_COMPACT},
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
  // Preserve historical source data but remove obsolete O/P/Q table columns
  // from layouts saved when the source had 18 fields. O is now Ghi chú.
  // Never erase backend permission or audit records here.
  const validSourceColumns=input.columns.filter(c=>!oldUiOnly.has(c.key));
  const keys=validSourceColumns.map(c=>c.key);
  if(new Set(keys).size!==keys.length)throw new Error('Danh sách cột không hợp lệ hoặc bị trùng.');
  const customKeys=keys.filter(key=>!expected.has(key));
  if(customKeys.length>20||customKeys.some(key=>!/^custom_[a-zA-Z0-9_-]{8,36}$/.test(key)))
    throw new Error('Tối đa 20 cột tự tạo, mã cột phải hợp lệ.');
  // P/Q were introduced later; append any newly supported Excel columns without
  // discarding the user's prior order, visibility, widths, and separate permissions.
  const missing=defaults.columns.filter(col=>!keys.includes(col.key));
  // Source fields have stable keys. The current schema has 15 columns,
  // while old snapshots may have 18. Only missing columns from an older
  // configuration are restored; no old removed field is reintroduced.
  if(missing.length)
    throw new Error('Thiếu cột bắt buộc trong cấu hình A–O.');
  const withMissing=[...validSourceColumns,...missing];
  if(withMissing.length!==EXCEL_SOURCE_COLUMNS.length+customKeys.length)
    throw new Error('Danh sách cột cần đủ các cột A–O của nguồn Excel.');
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
    // Correct only the obsolete app-generated E label in older saved layouts.
    const label=column.key==='type'&&column.label.trim()==='Loại VB (HC/QPPL/BC)'
      ?'Loại VB':column.label.trim();
    return {...(base??{key:column.key,label:column.label,width:170,visible:true}),
      // One-off migration of old generated 100px ID default, not custom widths.
      width:column.key==='displayCode'&&column.width===100?68:column.width,visible:column.visible,
      ...(isCustom?{origin:'custom' as const,values}:{ }),
      ...(column.removed?{removed:true}:{}),
      ...(column.renamed?{renamed:true,label}:isCustom?{label}:{}),
      ...(column.kind?{kind}:{ }),
      // Excel fields take their dropdown options from catalog.options only.
      // Discard legacy per-column copies to avoid two competing value lists.
      ...(kind==='select'&&isCustom?{options}:{}),
    };
  });
  const rawRules=input.cellHighlights??[];
  if(!Array.isArray(rawRules)||rawRules.length>30)throw new Error('Tối đa 30 quy tắc tô màu ô.');
  const ids=new Set<string>();
  const cellHighlights=rawRules.map(rule=>{
    if(!rule||typeof rule!=='object'||typeof rule.id!=='string'||
      !/^[a-zA-Z0-9_-]{8,100}$/.test(rule.id)||ids.has(rule.id)||
      typeof rule.word!=='string'||!rule.word.trim()||rule.word.length>100||
      typeof rule.field!=='string'||(rule.field!=='*'&&!keys.includes(rule.field))||
      typeof rule.textColor!=='string'||!hexColor.test(rule.textColor)||
      typeof rule.backgroundColor!=='string'||!hexColor.test(rule.backgroundColor))
      throw new Error('Từ khóa, tên cột hoặc mã màu trong quy tắc tô ô không hợp lệ.');
    ids.add(rule.id);
    return {id:rule.id,word:rule.word.trim(),field:rule.field,
      textColor:rule.textColor,backgroundColor:rule.backgroundColor};
  });
  const compactSource=input.compactDisplay??EMPTY_COMPACT;
  if(!compactSource||typeof compactSource!=='object'||Array.isArray(compactSource))
    throw new Error('Cấu hình gộp cột dùng chung không hợp lệ.');
  // Older saved Firebase layouts predate four new grouping options. Missing
  // NEW flags default to false; invalid values remain rejected, not coerced.
  const newOptions=new Set(['contentDetails','partyTogether','councilTogether','teamTogether']);
  if((Object.keys(EMPTY_COMPACT) as (keyof SharedCompactDisplay)[]).some(key=>
    typeof compactSource[key]!=='boolean'&&
    !(newOptions.has(key)&&compactSource[key]===undefined)))
    throw new Error('Cấu hình gộp cột dùng chung không hợp lệ.');
  const compactDisplay=Object.fromEntries((Object.keys(EMPTY_COMPACT) as (keyof SharedCompactDisplay)[])
    .map(key=>[key,compactSource[key]??false])) as SharedCompactDisplay;
  if(!columns.some(column=>column.visible&&!column.removed))
    throw new Error('Cần ít nhất một cột dữ liệu hiển thị.');
  return {columns,tableWidth:input.tableWidth,frameWidth,cellHighlights,compactDisplay};
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
