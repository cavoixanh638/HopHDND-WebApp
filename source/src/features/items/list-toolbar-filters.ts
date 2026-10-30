import type {Item} from '../../../shared/types';
import {normalizeSearch} from '../../domain/search';
import {isActive} from '../../domain/reporting';
import type {SummarySelection} from '../../domain/item-summary';
import {filterListBySummary} from '../../domain/item-summary';

export type ListKind='qppl'|'hc'|'bc'|'nq-unknown'|'unclassified';
export type DetailKey='partyLevel'|'progressParty'|'progressBuild'|'progressCouncil'|
  'specialist'|'vpLeader'|'ubndLeader';
export type ListSearchField='all'|'displayCode'|'content'|'specificProgress'|'note'|string;
export interface ListToolbarState {
  search:string;field:ListSearchField;department:string;room:string;
  details:Record<DetailKey,string>;
}
export const DETAIL_FIELDS:readonly {key:DetailKey;label:string}[]=[
  {key:'partyLevel',label:'Cấp Thành ủy cho ý kiến'},
  {key:'progressParty',label:'Tiến độ Thành ủy chi tiết'},
  {key:'progressBuild',label:'Tiến độ xây dựng NQ chi tiết'},
  {key:'progressCouncil',label:'Tiến độ ban hành NQ/BC chi tiết'},
  {key:'specialist',label:'Chuyên viên'},
  {key:'vpLeader',label:'Lãnh đạo VP'},
  {key:'ubndLeader',label:'Lãnh đạo UBND'},
];
export const SEARCH_FIELDS:readonly {key:string;label:string}[]=[
  {key:'all',label:'Tất cả trường'},
  {key:'displayCode',label:'Mã'},
  {key:'content',label:'Nội dung'},
  {key:'specificProgress',label:'Tiến độ hiện tại'},
  {key:'note',label:'Ghi chú'}
];
export const newToolbarState=():ListToolbarState=>({
  search:'',field:'all',department:'',room:'',
  details:{partyLevel:'',progressParty:'',progressBuild:'',progressCouncil:'',
    specialist:'',vpLeader:'',ubndLeader:''}
});
const searchable:readonly (keyof Item)[]=['displayCode','content','department','room',
  'specialist','vpLeader','ubndLeader','partyLevel','progressParty','progressBuild',
  'progressCouncil','specificProgress','note','type'];
export function kindOf(item:Item):ListKind {
  if(item.documentKind==='BC')return 'bc';
  if(item.documentKind!=='NQ')return 'unclassified';
  const value=normalizeSearch(item.type).replace(/\s+/g,' ');
  if(value==='qppl')return 'qppl';
  if(value==='hc'||value==='hanh chinh')return 'hc';
  return 'nq-unknown';
}
export function filterToolbarRows(
  items:readonly Item[],state:ListToolbarState,
  customValue?:(item:Item,field:string)=>string
):Item[]{
  const needle=normalizeSearch(state.search.trim());
  return items.filter(item=>{
    // These are EXACT selected categories, not fuzzy substring matches.
    if(state.department&&item.department!==state.department)return false;
    if(state.room&&item.room!==state.room)return false;
    if(DETAIL_FIELDS.some(({key})=>state.details[key]&&item[key]!==state.details[key]))
      return false;
    if(!needle)return true;
    const values=state.field==='all'
      ?[...searchable.map(key=>String(item[key]??'')),...(customValue
        ?[customValue(item,'*')]:[])]
      :[state.field in item?String((item as unknown as Record<string,unknown>)[state.field]??''):
        customValue?.(item,state.field)??''];
    return values.some(value=>normalizeSearch(value).includes(needle));
  });
}
export const filterByKind=(items:Item[],kind:ListKind|null):Item[]=>
  kind===null?items:items.filter(item=>isActive(item)&&kindOf(item)===kind);
export const filterByChips=(items:Item[],kind:ListKind|null,stage:SummarySelection|null):Item[]=>
  filterListBySummary(filterByKind(items,kind),stage);
export const hasToolbarFilters=(state:ListToolbarState):boolean=>
  !!(state.search.trim()||state.department||state.room||state.field!=='all'&&state.search.trim()||
    DETAIL_FIELDS.some(({key})=>state.details[key]));
export const exactChoices=(items:readonly Item[],key:keyof Item):string[]=>
  [...new Set(items.map(item=>String(item[key]??'')).filter(Boolean))]
    .sort((a,b)=>a.localeCompare(b,'vi'));
export function shouldClearListOnEscape(event:KeyboardEvent,context:{
  active:boolean;customizing:boolean;permissionMode:boolean;editorOpen:boolean;
  popupOpen:boolean
}):boolean {
  if(event.key!=='Escape'||event.defaultPrevented||event.isComposing||
    !context.active||context.customizing||context.permissionMode||
    context.editorOpen||context.popupOpen)return false;
  const target=event.target;
  if(target instanceof Element){
    if(target.closest('input,textarea,select,[contenteditable="true"],[role="combobox"],[role="listbox"],[role="dialog"],dialog,[role="menu"],[role="menuitem"]'))return false;
  }
  // Includes native dialogs, custom modal backdrops and expanded popovers.
  if(document.querySelector('dialog[open],[role="dialog"],[role="listbox"],[aria-modal="true"],details[open],.options-popover[open]'))
    return false;
  return true;
}
