import type { Item } from '../../shared/types';
import { defaultItemLayout, validateItemLayout, type ItemLayout } from './item-preferences';
import { normalizeSearch } from '../domain/search';
import {filterValue} from '../features/items/ColumnFilterCell';

export interface ListFilters {
  query: string; kind: string; lifecycle: string; leader: string; status: string;
  columns: Record<string,string>;
}
export interface ColorRule {
  id: string; field: string; value: string; color: 'mint'|'amber'|'rose'|'blue';
}
export interface SavedListView { id:string; name:string; filters:ListFilters; layout:ItemLayout; colors:ColorRule[] }
export const emptyListFilters=():ListFilters=>({query:'',kind:'all',lifecycle:'active',leader:'all',status:'all',columns:{}});
const layoutKeys=new Set(defaultItemLayout().columns.map(c=>c.key));
const palette=new Set<ColorRule['color']>(['mint','amber','rose','blue']);
const key=(source:string)=>'hdnd.list-views.v1:'+source;
const colorKey=(source:string)=>'hdnd.list-colors.v1:'+source;
const activeKey=(source:string)=>'hdnd.active-list-view.v1:'+source;
const cleanFilters=(value:unknown):ListFilters=>{
  const v=(value&&typeof value==='object'?value:{}) as Partial<ListFilters>;
  const read=(field:keyof Omit<ListFilters,'columns'>,fallback:string)=>typeof v[field]==='string'?(v[field] as string).slice(0,250):fallback;
  const columns:Record<string,string>={};
  if(v.columns&&typeof v.columns==='object'&&!Array.isArray(v.columns))
    for(const [field,term] of Object.entries(v.columns))if(layoutKeys.has(field)&&typeof term==='string'&&term.trim())columns[field]=term.slice(0,200);
  return {query:read('query',''),kind:read('kind','all'),lifecycle:read('lifecycle','active'),
    leader:read('leader','all'),status:read('status','all'),columns};
};
export const validateColorRules=(value:unknown):ColorRule[]=>{
  if(!Array.isArray(value))return [];
  return value.slice(0,30).flatMap((entry):ColorRule[]=>{
    const r=entry as Partial<ColorRule>|null;
    if(!r||typeof r.id!=='string'||typeof r.field!=='string'||!layoutKeys.has(r.field)||
      typeof r.value!=='string'||r.value.length>200||!palette.has(r.color as ColorRule['color']))return [];
    return [{id:r.id.slice(0,90),field:r.field,value:r.value,color:r.color as ColorRule['color']}];
  });
};
export function loadListViews(source:string):SavedListView[]{
  try{
    const value=JSON.parse(globalThis.localStorage?.getItem(key(source))??'[]') as unknown;
    if(!Array.isArray(value))return [];
    return value.slice(0,20).flatMap((v):SavedListView[]=>{
      if(!v||typeof v!=='object')return [];
      const row=v as Partial<SavedListView>;
      if(typeof row.id!=='string'||typeof row.name!=='string'||!row.name.trim())return [];
      try{return [{id:row.id.slice(0,90),name:row.name.trim().slice(0,60),
        filters:cleanFilters(row.filters),layout:validateItemLayout(row.layout),colors:validateColorRules(row.colors)}];}
      catch{return [];}
    });
  }catch{return [];}
}
export function saveListViews(source:string,views:SavedListView[]):boolean{
  if(views.length>20||views.some(v=>!v.name.trim()))return false;
  try{globalThis.localStorage?.setItem(key(source),JSON.stringify(views));return !!globalThis.localStorage;}
  catch{return false;}
}
export function loadActiveListView(source:string):string{
  try{return globalThis.localStorage?.getItem(activeKey(source))??'';}catch{return '';}
}
export function saveActiveListView(source:string,id:string):void{
  try{if(id)globalThis.localStorage?.setItem(activeKey(source),id);else globalThis.localStorage?.removeItem(activeKey(source));}catch{}
}
export function loadColorRules(source:string):ColorRule[]{
  try{return validateColorRules(JSON.parse(globalThis.localStorage?.getItem(colorKey(source))??'[]'));}catch{return [];}
}
export function saveColorRules(source:string,rules:ColorRule[]):boolean{
  try{globalThis.localStorage?.setItem(colorKey(source),JSON.stringify(validateColorRules(rules)));return !!globalThis.localStorage;}
  catch{return false;}
}
export function matchesColumnFilters(item:Item,columns:Record<string,string>):boolean{
  return Object.entries(columns).every(([field,term])=>{
    if(!layoutKeys.has(field)||!term.trim())return true;
    return normalizeSearch(filterValue(item,field)).includes(normalizeSearch(term));
  });
}
export function itemColor(item:Item,rules:ColorRule[]):ColorRule['color']|undefined{
  for(const rule of rules){
    if(!layoutKeys.has(rule.field))continue;
    const value=(item as unknown as Record<string,unknown>)[rule.field];
    if(normalizeSearch(String(value??''))===normalizeSearch(rule.value))return rule.color;
  }
  return undefined;
}
