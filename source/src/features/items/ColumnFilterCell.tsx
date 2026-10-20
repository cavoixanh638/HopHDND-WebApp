import type {Item} from '../../../shared/types';
import {displayId} from '../../domain/display-id';

/** A compact permanent header filter row; options are for short categorical lists.
 * The whole table owns scrolling so the heading and input remain aligned. */
export const filterValue=(item:Item,key:string):string=>{
  if(key==='displayCode')return displayId(item);
  if(key==='isDropped')return item.isDropped?'Đã rút':'';
  const value=(item as unknown as Record<string,unknown>)[key];
  return value==null?'':String(value);
};
export function filterChoices(items:Item[],field:string,getValue?:(item:Item)=>string):string[]|null{
  if(field==='isDropped')return ['Đã rút'];
  if(field==='content'||field==='note'||field==='displayCode'||field==='stt'||field==='history')return null;
  const options=[...new Set(items.map(item=>getValue?.(item)??filterValue(item,field)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  return options.length>0&&options.length<=12?options:null;
}

export function ColumnFilterCell({field,label,items,value,onChange,getValue,choices:configuredChoices}:{
  field:string;label:string;items:Item[];value:string;onChange:(next:string)=>void;
  getValue?:(item:Item)=>string;choices?:string[];
}){
  const choices=configuredChoices?.length?configuredChoices:filterChoices(items,field,getValue);
  const compact=field==='displayCode'||field==='stt';
  return <th className={'item-column-filter-cell '+(value?'has-filter':'')+(compact?' compact-filter':'')} scope="col" data-filter-key={field}>
    <div className="item-filter-input-wrap">
      {choices?<select aria-label={`Tìm kiếm cột ${label}`} title={`Tìm kiếm cột ${label}`} value={value} onChange={event=>onChange(event.currentTarget.value)}>
        <option value="">Chọn để lọc</option>
        {choices.map(option=><option value={option} key={option}>{option}</option>)}
        {value&&!choices.includes(value)&&<option value={value}>{value}</option>}
      </select>:<input aria-label={`Tìm kiếm cột ${label}`} title={`Tìm kiếm cột ${label}`}
        type="search" autoComplete="off" spellCheck={false} placeholder={compact?'':'Tìm kiếm'}
        value={value} onChange={event=>onChange(event.currentTarget.value)}/>}
      {value&&<button type="button" className="item-filter-clear" aria-label={`Xóa tìm kiếm cột ${label}`} title="Xóa tìm kiếm" onClick={()=>onChange('')}>×</button>}
    </div>
  </th>;
}
