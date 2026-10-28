import type {Item} from '../../../shared/types';
import type {ItemColumn,SharedCompactDisplay,CompactGroupLabels} from '../../data/item-preferences';
import {projectedGroupWidth} from '../../data/resize-last-column';

/** Personal presentation preferences only. Never changes source columns or permissions. */
export type CompactOption='typeInContent'|'contentDetails'|'partyTogether'|'councilTogether'|'leadersTogether'|'roomSpecialist'|'teamTogether'|'shortSpecialist'|'shortLeaders'|'cvRoomInline';
export type CompactDisplay=SharedCompactDisplay;
export const DEFAULT_COMPACT_DISPLAY:CompactDisplay={
  typeInContent:false,contentDetails:false,partyTogether:false,councilTogether:false,
  leadersTogether:false,roomSpecialist:false,teamTogether:false,shortSpecialist:false,shortLeaders:false,cvRoomInline:false,
};
export const COMPACT_OPTIONS:{key:CompactOption;label:string;detail:string;section:'merge'|'name'}[]=[
  {key:'leadersTogether',label:'Lãnh đạo UBND + VP',detail:'UBND trên, VP dưới',section:'merge'},
  {key:'roomSpecialist',label:'Phòng + Chuyên viên',detail:'Phòng trên, chuyên viên dưới',section:'merge'},
  {key:'teamTogether',label:'UBND + VP + Phòng + CV',detail:'Bốn thông tin theo nhóm',section:'merge'},
  {key:'cvRoomInline',label:'Chuyên viên và phòng cùng dòng',detail:'CV Tên chuyên viên (Tên phòng)',section:'merge'},
  {key:'shortSpecialist',label:'Viết tắt tên chuyên viên',detail:'Tên đầy đủ vẫn tìm được',section:'name'},
  {key:'shortLeaders',label:'Viết tắt tên lãnh đạo',detail:'Giữ nguyên chức danh',section:'name'},
];
/** Group choices are exclusive only if they would consume the same visible column. */
export function toggleCompactOption(prefs:CompactDisplay,option:CompactOption,checked:boolean):CompactDisplay {
  const next={...prefs,[option]:checked};
  // Legacy U01/U02 flags are inert: the source groups are mandatory in ordinary views.
  if(checked&&option==='teamTogether'){next.leadersTogether=false;next.roomSpecialist=false;}
  if(checked&&(option==='leadersTogether'||option==='roomSpecialist'))next.teamTogether=false;
  return next;
}
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
/** View-only override, isolated from the shared Firebase layout and legacy per-file prefs.
 * Return null when absent so an administrator's shared layout remains the default. */
const personalCompactKey=(scope:string)=>'hdnd.viewer-compact.v1:'+scope;
export function readPersonalCompactDisplay(scope:string):CompactDisplay|null {
  try {
    const raw=globalThis.localStorage?.getItem(personalCompactKey(scope));
    if(!raw)return null;
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const object=value as Record<string,unknown>;
    const keys=Object.keys(DEFAULT_COMPACT_DISPLAY) as CompactOption[];
    if(keys.some(key=>typeof object[key]!=='boolean'&&!(key==='cvRoomInline'&&object[key]===undefined)))return null;
    return Object.fromEntries(keys.map(key=>[key,object[key]??false])) as CompactDisplay;
  }catch{return null;}
}
export function writePersonalCompactDisplay(scope:string,prefs:CompactDisplay):boolean {
  try {
    if(!globalThis.localStorage)return false;
    globalThis.localStorage.setItem(personalCompactKey(scope),JSON.stringify(prefs));
    return true;
  }catch{return false;}
}
export function clearPersonalCompactDisplay(scope:string):boolean {
  try {
    if(!globalThis.localStorage)return false;
    globalThis.localStorage.removeItem(personalCompactKey(scope));
    return true;
  }catch{return false;}
}

/** Never abbreviate the underlying value, edit choice or search index. */
export function abbreviateVietnameseName(name:string):string {
  const words=name.trim().split(/\s+/u).filter(Boolean);
  if(words.length<2)return name.trim();
  return [...words.slice(0,-1).map(word=>Array.from(word)[0]?.toLocaleUpperCase('vi')+'.'),
    words[words.length-1]].join('');
}
/** A leader's office title is NEVER part of their abbreviated personal name.
 * Keep official labels (PCVP, Q.CVP, PCT, PCTT etc.) exactly as stored in Excel.
 * This changes displayed text only; source values and filters stay untouched. */
export function abbreviateLeaderName(value:string):string {
  const input=value.trim();
  if(!input)return input;
  const leading=input.match(/^((?:Q\.\s*CVP|Q\.?\s*CT|PCVP|CVP|PCTT|PCT|CT))(\s*[:：–-]\s*|\s+)(.+)$/iu);
  if(leading){
    const [,title,separator,name]=leading;
    const abbreviated=abbreviateVietnameseName(name);
    return title+(separator.trim()?separator:' ')+abbreviated;
  }
  const trailing=input.match(/^(.+?)\s+(\((?:Q\.\s*CVP|Q\.?\s*CT|PCVP|CVP|PCTT|PCT|CT)\))$/iu);
  if(trailing)return abbreviateVietnameseName(trailing[1])+' '+trailing[2];
  // A bare title is a role, not a person: never turn it into initials.
  return abbreviateVietnameseName(input);
}
/** A visual group of source fields; edits and RLS/lease remain per original field. */
export type CompactPair={
  anchor:string; hidden:string; hiddenFields:readonly string[];memberFields:readonly string[];
  tags:readonly string[];label:string;extraWidth:number;variant:CompactOption;
};
/** These are optional staff-only presentation groups. U01/U02 are unconditional
 * projections declared in activeCompactPairs; no saved flag can turn them off. */
const PAIRS:Partial<Record<CompactOption,CompactPair>>={
  leadersTogether:{anchor:'vpLeader',hidden:'ubndLeader',hiddenFields:['ubndLeader'],
    memberFields:['ubndLeader','vpLeader'],tags:['UBND','VP'],label:'Lãnh đạo UBND / VP',extraWidth:0,variant:'leadersTogether'},
  roomSpecialist:{anchor:'room',hidden:'specialist',hiddenFields:['specialist'],
    memberFields:['room','specialist'],tags:['Phòng','CV'],label:'Phòng chuyên môn / Chuyên viên',extraWidth:0,variant:'roomSpecialist'},
  teamTogether:{anchor:'room',hidden:'specialist',hiddenFields:['specialist','ubndLeader','vpLeader'],
    memberFields:['ubndLeader','vpLeader','room','specialist'],tags:['UBND','VP','Phòng','CV'],
    label:'Lãnh đạo / Phòng / CV',extraWidth:70,variant:'teamTogether'},
};
export function compactTypeTone(value:string):'HC'|'QPPL'|'BC'|'other'{
  const plain=value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  if(plain==='HC'||plain==='HANH CHINH')return 'HC';
  if(plain==='QPPL')return 'QPPL';
  if(plain==='BC'||plain==='BAO CAO')return 'BC';
  return 'other';
}
/** A group contains only fields that are visible to the viewer. A removed/hidden
 * source field is NEVER reintroduced by projection; if the anchor is absent,
 * the first available member becomes the stable rendered anchor for this view. */
export function activeCompactPairs(columns:readonly ItemColumn[],prefs:CompactDisplay):CompactPair[]{
  const keys=new Set(columns.filter(c=>c.visible&&!c.removed).map(c=>c.key));
  const mandatory=[
    {variant:'contentDetails' as const,order:['type','department','content'],anchor:'content',
      label:'Nội dung trình',tags:['Loại VB','Sở','Nội dung'],extraWidth:0},
    {variant:'partyTogether' as const,order:['partyLevel','progressParty','progressBuild','progressCouncil'],
      anchor:'partyLevel',label:'Tiến độ 3 khâu',tags:['Cấp','Thành ủy','Xây dựng NQ','Ban hành NQ'],extraWidth:130}
  ].flatMap(def=>{
    const memberFields=def.order.filter(key=>keys.has(key));
    if(memberFields.length===0)return [];
    const anchor=keys.has(def.anchor)?def.anchor:memberFields[0];
    return [{anchor,hidden:memberFields.find(k=>k!==anchor)??anchor,
      hiddenFields:memberFields.filter(k=>k!==anchor),memberFields,
      tags:memberFields.map(k=>def.tags[def.order.indexOf(k)]),
      label:def.label,extraWidth:def.extraWidth,variant:def.variant} satisfies CompactPair];
  });
  const selected=prefs.teamTogether?['teamTogether' as const]:['leadersTogether' as const,'roomSpecialist' as const];
  const optional=selected.flatMap(option=>{
    const group=PAIRS[option];
    if(!group||!prefs[option]||group.memberFields.some(key=>!keys.has(key)))return [];
    return [group];
  });
  return [...mandatory,...optional];
}
/** Group title follows the stable variant, not a hidden/reordered anchor.
 * Source columns and editor field names never inherit this display-only title. */
export function compactVisibleColumns(columns:readonly ItemColumn[],prefs:CompactDisplay,
  groupLabels:CompactGroupLabels={}):ItemColumn[]{
  const pairs=activeCompactPairs(columns,prefs);
  const hidden=new Set<string>(pairs.flatMap(pair=>pair.hiddenFields));
  return columns.filter(col=>!hidden.has(col.key)).map(col=>{
    const pair=pairs.find(p=>p.anchor===col.key);
    return pair?{...col,label:groupLabels[pair.variant as keyof CompactGroupLabels]??pair.label,
      width:projectedGroupWidth(col.width,pair.extraWidth)}:{...col};
  });
}
/** Search always indexes FULL strings of every source member in a merged cell. */
export function compactFilterText(item:Item,key:string,pairs:readonly CompactPair[]):string {
  const members=pairs.find(pair=>pair.anchor===key)?.memberFields??[key];
  const source=item as unknown as Record<string,unknown>;
  return members.map(field=>String(source[field]??'')).filter(Boolean).join(' ');
}
