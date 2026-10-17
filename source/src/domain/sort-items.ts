import type {Item} from '../../shared/types';
import {filterValue} from '../features/items/ColumnFilterCell';

export type ColumnSort={key:string;direction:'asc'|'desc'}|null;
const naturalVietnamese=new Intl.Collator('vi',{numeric:true,sensitivity:'base'});
const parseNumber=(s:string):number|null=>{
  const text=s.trim().replace(/\s/g,'');
  if(!/^[-+]?\d+(?:[.,]\d+)?$/.test(text))return null;
  const parsed=Number(text.replace(',','.'));
  return Number.isFinite(parsed)?parsed:null;
};
const blank=(s:string)=>!s.trim()||s.trim()==='—'||s.trim()==='-';

/** UI-only stable ordering. Missing values stay last for either direction. */
export function sortItems<T extends Item>(
  items:readonly T[],sort:ColumnSort,getCustom?:(item:T,key:string)=>string
):T[]{
  if(!sort)return [...items];
  const {key,direction}=sort;
  const values=items.map((item,index)=>({
    item,index,value:(key.startsWith('custom_')?(getCustom?.(item,key)??''):filterValue(item,key)).trim(),
  }));
  const sign=direction==='asc'?1:-1;
  values.sort((a,b)=>{
    if(blank(a.value)!==blank(b.value))return blank(a.value)?1:-1;
    if(blank(a.value)&&blank(b.value))return a.index-b.index;
    const aa=parseNumber(a.value),bb=parseNumber(b.value);
    const result=aa!==null&&bb!==null?aa-bb:naturalVietnamese.compare(a.value,b.value);
    return sign*Math.sign(result)||a.index-b.index;
  });
  return values.map(v=>v.item);
}
