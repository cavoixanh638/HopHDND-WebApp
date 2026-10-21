import type {Item} from '../../../shared/types';
import type {ItemColumn} from '../../data/item-preferences';

/** Personal presentation preferences only. Never changes source columns or permissions. */
export type CompactOption='typeInContent'|'leadersTogether'|'departmentRoom'|'shortSpecialist';
export type CompactDisplay=Record<CompactOption,boolean>;
export const DEFAULT_COMPACT_DISPLAY:CompactDisplay={
  typeInContent:false,leadersTogether:false,departmentRoom:false,shortSpecialist:false,
};
export const COMPACT_OPTIONS:{key:CompactOption;label:string;detail:string}[]=[
  {key:'typeInContent',label:'Loại VB → Nội dung trình',detail:'Ví dụ: Nội dung nghị quyết (QPPL)'},
  {key:'leadersTogether',label:'Gộp Lãnh đạo VP và UBND TP',detail:'Hai dòng có nhãn VP / UBND'},
  {key:'departmentRoom',label:'Gộp Sở chủ trì và Phòng chuyên môn',detail:'Hai dòng có nhãn Sở / Phòng'},
  {key:'shortSpecialist',label:'Viết tắt tên chuyên viên',detail:'Nguyễn Ngọc Hùng → N.N.Hùng; tìm theo tên đầy đủ'},
];
const keyFor=(scope:string)=>'hdnd.compact-display.v1:'+scope;
export function readCompactDisplay(scope:string):CompactDisplay {
  try{
    const raw=globalThis.localStorage?.getItem(keyFor(scope));
    if(!raw)return {...DEFAULT_COMPACT_DISPLAY};
    const val:unknown=JSON.parse(raw);
    if(!val||typeof val!=='object'||Array.isArray(val))return {...DEFAULT_COMPACT_DISPLAY};
    return Object.fromEntries((Object.keys(DEFAULT_COMPACT_DISPLAY) as CompactOption[])
      .map(key=>[key,(val as Record<string,unknown>)[key]===true])) as CompactDisplay;
  }catch{return {...DEFAULT_COMPACT_DISPLAY};}
}
export function writeCompactDisplay(scope:string,prefs:CompactDisplay):void {
  try{globalThis.localStorage?.setItem(keyFor(scope),JSON.stringify(prefs));}catch{}
}
/** Never abbreviate the underlying value, edit choice or search index. */
export function abbreviateVietnameseName(name:string):string {
  const words=name.trim().split(/\s+/u).filter(Boolean);
  if(words.length<2)return name.trim();
  return [...words.slice(0,-1).map(word=>Array.from(word)[0]?.toLocaleUpperCase('vi')+'.'),
    words[words.length-1]].join('');
}
export type CompactPair={anchor:'content'|'vpLeader'|'department';hidden:'type'|'ubndLeader'|'room';label:string;extraWidth:number};
const PAIRS:Record<'typeInContent'|'leadersTogether'|'departmentRoom',CompactPair>={
  typeInContent:{anchor:'content',hidden:'type',label:'Nội dung trình (Loại VB)',extraWidth:0},
  leadersTogether:{anchor:'vpLeader',hidden:'ubndLeader',label:'Lãnh đạo VP / UBND TP',extraWidth:75},
  departmentRoom:{anchor:'department',hidden:'room',label:'Sở chủ trì / Phòng chuyên môn',extraWidth:65},
};
export function activeCompactPairs(columns:readonly ItemColumn[],prefs:CompactDisplay):CompactPair[]{
  const keys=new Set(columns.map(c=>c.key));
  return (['typeInContent','leadersTogether','departmentRoom'] as const)
    .filter(opt=>prefs[opt]&&keys.has(PAIRS[opt].anchor)&&keys.has(PAIRS[opt].hidden))
    .map(opt=>PAIRS[opt]);
}
export function compactVisibleColumns(columns:readonly ItemColumn[],prefs:CompactDisplay):ItemColumn[]{
  const pairs=activeCompactPairs(columns,prefs);
  return columns.filter(col=>!pairs.some(p=>p.hidden===col.key)).map(col=>{
    const pair=pairs.find(p=>p.anchor===col.key);
    return pair?{...col,label:pair.label,width:Math.min(1600,col.width+pair.extraWidth)}:{...col};
  });
}
/** Use *both full source values* to filter a visible merged field. */
export function compactFilterText(item:Item,key:string,pairs:readonly CompactPair[]):string {
  const other=pairs.find(pair=>pair.anchor===key)?.hidden;
  const source=item as unknown as Record<string,unknown>;
  return [key,other].filter((k):k is string=>!!k)
    .map(k=>String(source[k]??'')).filter(Boolean).join(' ');
}
