import {layoutRecoveryScope} from './draft-checkpoints';
import {progressTone} from '../domain/progress-visual';

export type StatusPaletteGroup='not-submitted'|'office'|'done'|'other';
export type StatusSwatch={text:string;background:string};
export type StatusPalette=Record<StatusPaletteGroup,StatusSwatch>&{otherEnabled:boolean};
export interface NamedStatusPalette {id:string;name:string;colors:StatusPalette}
export interface StatusPaletteStore {version:1;active:StatusPalette;activePresetId:string;presets:NamedStatusPalette[]}
export const STATUS_PALETTE_GROUPS:readonly {key:StatusPaletteGroup;label:string;description:string}[]=[
  {key:'not-submitted',label:'Sở chưa trình',description:'Chờ sở, ngành gửi hồ sơ'},
  {key:'office',label:'Văn phòng đang thực hiện',description:'Bao gồm VP đang thực hiện / Đang ở Văn phòng'},
  {key:'done',label:'Hoàn thành và tương đương',description:'Theo từng cột: hoàn thành, đã có TBKL, không phải trình, đã trình HĐND…'},
  {key:'other',label:'Trạng thái khác',description:'Các trạng thái trung gian chưa thuộc ba nhóm trên'},
];
export const MAX_STATUS_PALETTES=20;
const validHex=/^#[0-9a-f]{6}$/i;
const color=(v:unknown)=>typeof v==='string'&&validHex.test(v)?v.toUpperCase():null;
export const defaultStatusPalette=():StatusPalette=>({
  'not-submitted':{text:'#D00025',background:'#FFE0E4'},
  office:{text:'#854D0E',background:'#FEF9C3'},
  done:{text:'#007A18',background:'#D5F0DE'},
  other:{text:'#426274',background:'#F2F6F9'},
  otherEnabled:false,
});
export const defaultStatusPaletteStore=():StatusPaletteStore=>({
  version:1,active:defaultStatusPalette(),activePresetId:'',presets:[],
});
export function validateStatusPalette(value:unknown):StatusPalette{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Bộ màu trạng thái không hợp lệ.');
  const input=value as Record<string,unknown>,result=defaultStatusPalette();
  for(const {key} of STATUS_PALETTE_GROUPS){
    const swatch=input[key];
    if(!swatch||typeof swatch!=='object'||Array.isArray(swatch))throw Error('Thiếu màu cho '+key);
    const text=color((swatch as Record<string,unknown>).text);
    const background=color((swatch as Record<string,unknown>).background);
    if(!text||!background)throw Error('Mã màu HEX phải ở dạng #RRGGBB.');
    result[key]={text,background};
  }
  if(typeof input.otherEnabled!=='boolean')throw Error('Thiếu tùy chọn tô màu trạng thái khác.');
  result.otherEnabled=input.otherEnabled;
  return result;
}
export function validateStatusPaletteStore(value:unknown):StatusPaletteStore{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Bộ màu lưu trên máy không hợp lệ.');
  const input=value as Record<string,unknown>;
  if(input.version!==1||!Array.isArray(input.presets)||input.presets.length>MAX_STATUS_PALETTES)
    throw Error('Danh sách bộ màu không hợp lệ.');
  const seenIds=new Set<string>(),seenNames=new Set<string>();
  const presets=input.presets.map((candidate:unknown):NamedStatusPalette=>{
    if(!candidate||typeof candidate!=='object')throw Error('Bộ màu đã lưu không hợp lệ.');
    const p=candidate as Record<string,unknown>;
    if(typeof p.id!=='string'||!/^[-\w]{1,90}$/.test(p.id)||
      typeof p.name!=='string'||!p.name.trim()||p.name.length>60)
      throw Error('Tên bộ màu không hợp lệ.');
    const name=p.name.trim(),fold=name.toLocaleLowerCase('vi-VN');
    if(seenIds.has(p.id)||seenNames.has(fold))throw Error('Có bộ màu trùng tên hoặc mã.');
    seenIds.add(p.id);seenNames.add(fold);
    return {id:p.id,name,colors:validateStatusPalette(p.colors)};
  });
  if(typeof input.activePresetId!=='string')throw Error('Mã bộ màu đang chọn không hợp lệ.');
  return {version:1,active:validateStatusPalette(input.active),
    activePresetId:presets.some(p=>p.id===input.activePresetId)?input.activePresetId:'',presets};
}
const keyFor=(source:string)=>'hdnd.status-palettes.v1:'+layoutRecoveryScope(source);
export function loadStatusPaletteStore(source:string):StatusPaletteStore{
  try{const raw=globalThis.localStorage?.getItem(keyFor(source));
    if(!raw)return defaultStatusPaletteStore();
    const store=validateStatusPaletteStore(JSON.parse(raw));
    // Only migrate an untouched legacy office default in the *active* view.
    // Explicit named presets (including Theme1) and user-picked colors stay
    // bit-for-bit unchanged. Never rewrite localStorage during a read.
    const original=defaultStatusPalette();
    if(!store.activePresetId&&store.presets.length===0&&
      store.active.office.text==='#B04700'&&store.active.office.background==='#FFE8B8'&&
      store.active.otherEnabled===original.otherEnabled&&
      (['not-submitted','done','other'] as const).every(group=>
        store.active[group].text===original[group].text&&
        store.active[group].background===original[group].background))
      return {...store,active:{...store.active,office:{...defaultStatusPalette().office}}};
    return store;
  }catch{return defaultStatusPaletteStore();}
}
export function saveStatusPaletteStore(source:string,value:StatusPaletteStore):boolean{
  try{
    const checked=validateStatusPaletteStore(value);
    if(!globalThis.localStorage)return false;
    globalThis.localStorage.setItem(keyFor(source),JSON.stringify(checked));
    return true;
  }catch{return false;}
}
export function statusPaletteTone(field:string,value:unknown,otherEnabled:boolean):StatusPaletteGroup|null{
  const primary=progressTone(field,value);
  if(primary)return primary;
  return otherEnabled&&['progressParty','progressBuild','progressCouncil','specificProgress'].includes(field)&&
    String(value??'').trim()?'other':null;
}
/** Row backgrounds faithfully match the source image with the default palette.
 * A custom swatch gently tints its entire stage, without changing stored colors. */
const stageColor=(current:StatusSwatch,base:StatusSwatch,exact:string)=>
  current.text===base.text&&current.background===base.background?exact:
    `color-mix(in srgb, ${current.background} 38%, white)`;
const stageBorder=(current:StatusSwatch,base:StatusSwatch,exact:string)=>
  current.text===base.text&&current.background===base.background?exact:
    `color-mix(in srgb, ${current.text} 24%, white)`;
/** Presentation only: vars cascade into the normal table AND the report modal. */
export function statusPaletteCssVariables(colors:StatusPalette):Record<string,string>{
  const base=defaultStatusPalette();
  return {
    '--hdnd-stage-not-submitted-bg':stageColor(colors['not-submitted'],base['not-submitted'],'#FFF1F2'),
    '--hdnd-stage-not-submitted-border':stageBorder(colors['not-submitted'],base['not-submitted'],'#FECDD3'),
    '--hdnd-stage-office-bg':stageColor(colors.office,base.office,'#FFFBEB'),
    '--hdnd-stage-office-border':stageBorder(colors.office,base.office,'#FDE68A'),
    '--hdnd-stage-done-bg':stageColor(colors.done,base.done,'#F0FDF4'),
    '--hdnd-stage-done-border':stageBorder(colors.done,base.done,'#BBF7D0'),
    '--hdnd-status-not-submitted-text':colors['not-submitted'].text,
    '--hdnd-status-not-submitted-bg':colors['not-submitted'].background,
    '--hdnd-status-office-text':colors.office.text,
    '--hdnd-status-office-bg':colors.office.background,
    '--hdnd-status-done-text':colors.done.text,
    '--hdnd-status-done-bg':colors.done.background,
    '--hdnd-status-other-text':colors.other.text,
    '--hdnd-status-other-bg':colors.other.background,
  };
}
