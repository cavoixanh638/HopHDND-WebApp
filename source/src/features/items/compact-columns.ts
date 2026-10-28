import type {Item} from '../../../shared/types';
import type {ItemColumn,SharedCompactDisplay} from '../../data/item-preferences';

/** Personal presentation preferences only. Never changes source columns or permissions. */
export type CompactOption='typeInContent'|'contentDetails'|'partyTogether'|'councilTogether'|'leadersTogether'|'roomSpecialist'|'teamTogether'|'shortSpecialist'|'shortLeaders';
export type CompactDisplay=SharedCompactDisplay;
export const DEFAULT_COMPACT_DISPLAY:CompactDisplay={
  typeInContent:false,contentDetails:false,partyTogether:false,councilTogether:false,
  leadersTogether:false,roomSpecialist:false,teamTogether:false,shortSpecialist:false,shortLeaders:false,
};
export const COMPACT_OPTIONS:{key:CompactOption;label:string;detail:string;section:'merge'|'name'}[]=[
  {key:'typeInContent',label:'Loại VB → Nội dung',detail:'Loại văn bản ở cuối nội dung',section:'merge'},
  {key:'contentDetails',label:'Loại VB + Sở → Nội dung',detail:'Nội dung, loại VB và sở chủ trì trong một ô',section:'merge'},
  {key:'partyTogether',label:'Cấp + Tiến độ Thành ủy',detail:'Giữ riêng cấp xin ý kiến và tiến độ',section:'merge'},
  {key:'councilTogether',label:'Xây dựng + Ban hành HĐND',detail:'Hai bước tiến độ trong cùng một ô',section:'merge'},
  {key:'leadersTogether',label:'Lãnh đạo UBND + VP',detail:'UBND trên, VP dưới',section:'merge'},
  {key:'roomSpecialist',label:'Phòng + Chuyên viên',detail:'Phòng trên, chuyên viên dưới',section:'merge'},
  {key:'teamTogether',label:'UBND + VP + Phòng + CV',detail:'Bốn thông tin, bốn dòng gọn',section:'merge'},
  {key:'shortSpecialist',label:'Viết tắt tên chuyên viên',detail:'Tên đầy đủ vẫn tìm được',section:'name'},
  {key:'shortLeaders',label:'Viết tắt tên lãnh đạo',detail:'Giữ nguyên chức danh',section:'name'},
];
/** Group choices are exclusive only if they would consume the same visible column. */
export function toggleCompactOption(prefs:CompactDisplay,option:CompactOption,checked:boolean):CompactDisplay {
  const next={...prefs,[option]:checked};
  if(checked&&option==='contentDetails')next.typeInContent=false;
  if(checked&&option==='typeInContent')next.contentDetails=false;
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
    if(keys.some(key=>typeof object[key]!=='boolean'))return null;
    return Object.fromEntries(keys.map(key=>[key,object[key]])) as CompactDisplay;
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
  anchor:'content'|'partyLevel'|'progressBuild'|'vpLeader'|'room';
  hidden:'type'|'department'|'progressParty'|'progressCouncil'|'ubndLeader'|'specialist';
  hiddenFields:readonly ('type'|'department'|'progressParty'|'progressCouncil'|'ubndLeader'|'vpLeader'|'specialist')[];
  memberFields:readonly ('content'|'type'|'department'|'partyLevel'|'progressParty'|'progressBuild'|'progressCouncil'|'ubndLeader'|'vpLeader'|'room'|'specialist')[];
  tags:readonly string[];label:string;extraWidth:number;variant:CompactOption;
};
const PAIRS:Partial<Record<CompactOption,CompactPair>>={
  typeInContent:{anchor:'content',hidden:'type',hiddenFields:['type'],
    memberFields:['content','type'],tags:['','Loại VB'],label:'Nội dung trình (Loại VB)',extraWidth:0,variant:'typeInContent'},
  contentDetails:{anchor:'content',hidden:'type',hiddenFields:['type','department'],
    memberFields:['content','type','department'],tags:['','Loại VB','Sở'],label:'Nội dung / Loại VB / Sở',extraWidth:60,variant:'contentDetails'},
  partyTogether:{anchor:'partyLevel',hidden:'progressParty',hiddenFields:['progressParty'],
    memberFields:['partyLevel','progressParty'],tags:['Cấp','Tiến độ'],label:'Thành ủy: Cấp / Tiến độ',extraWidth:40,variant:'partyTogether'},
  councilTogether:{anchor:'progressBuild',hidden:'progressCouncil',hiddenFields:['progressCouncil'],
    memberFields:['progressBuild','progressCouncil'],tags:['Xây dựng','Ban hành'],label:'HĐND: Xây dựng / Ban hành',extraWidth:50,variant:'councilTogether'},
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
export function activeCompactPairs(columns:readonly ItemColumn[],prefs:CompactDisplay):CompactPair[]{
  const keys=new Set(columns.map(c=>c.key));
  const selected:CompactOption[]=[
    prefs.contentDetails?'contentDetails':'typeInContent',
    'partyTogether','councilTogether',
    ...(prefs.teamTogether?['teamTogether' as const]:['leadersTogether' as const,'roomSpecialist' as const])
  ];
  const hidden=new Set<string>();
  return selected.flatMap(option=>{
    const group=PAIRS[option];
    if(!group||!prefs[option]||group.memberFields.some(key=>!keys.has(key)))return [];
    if(group.memberFields.some(key=>hidden.has(key)))return [];
    for(const key of group.hiddenFields)hidden.add(key);
    return [group];
  });
}
export function compactVisibleColumns(columns:readonly ItemColumn[],prefs:CompactDisplay):ItemColumn[]{
  const pairs=activeCompactPairs(columns,prefs);
  const hidden=new Set<string>(pairs.flatMap(pair=>pair.hiddenFields));
  return columns.filter(col=>!hidden.has(col.key)).map(col=>{
    const pair=pairs.find(p=>p.anchor===col.key);
    return pair?{...col,label:pair.label,width:Math.min(1600,col.width+pair.extraWidth)}:{...col};
  });
}
/** Search always indexes FULL strings of every source member in a merged cell. */
export function compactFilterText(item:Item,key:string,pairs:readonly CompactPair[]):string {
  const members=pairs.find(pair=>pair.anchor===key)?.memberFields??[key];
  const source=item as unknown as Record<string,unknown>;
  return members.map(field=>String(source[field]??'')).filter(Boolean).join(' ');
}

export type SemanticGroupId='identity'|'workflow'|'assignment'|'tracking';
export interface SemanticGroupMeta {
  id:SemanticGroupId;
  shortLabel:string;
  title:string;
}
export const SEMANTIC_GROUPS:Readonly<Record<SemanticGroupId,SemanticGroupMeta>>={
  identity:{id:'identity',shortLabel:'Hồ sơ & Nội dung',title:'Định danh và nội dung văn bản'},
  workflow:{id:'workflow',shortLabel:'Tiến độ 3 cấp',title:'Chuỗi tiến độ Thành ủy · Xây dựng · Ban hành'},
  assignment:{id:'assignment',shortLabel:'Đơn vị & Phân công',title:'Sở chủ trì, Phòng, Chuyên viên và Lãnh đạo'},
  tracking:{id:'tracking',shortLabel:'Diễn biến & Ghi chú',title:'Tiến độ hiện tại và ghi chú xử lý'},
};
export function columnSemanticGroup(key:string):SemanticGroupMeta {
  if(['displayCode','stt','content','type'].includes(key))return SEMANTIC_GROUPS.identity;
  if(['partyLevel','progressParty','progressBuild','progressCouncil'].includes(key))return SEMANTIC_GROUPS.workflow;
  if(['department','room','specialist','vpLeader','ubndLeader'].includes(key))return SEMANTIC_GROUPS.assignment;
  return SEMANTIC_GROUPS.tracking;
}
