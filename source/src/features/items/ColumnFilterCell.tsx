import type {Item} from '../../../shared/types';
import {displayId} from '../../domain/display-id';

/** A compact permanent header filter row; options are for short categorical lists.
 * The whole table owns scrolling so the heading and input remain aligned. */
export const filterValue=(item:Item,key:string):string=>{
  if(key==='displayCode')return displayId(item);
  if(key==='isDropped')return item.archivedAt?'Lưu trữ':item.isDropped?'Đã rút':'Đang trình';
  const value=(item as unknown as Record<string,unknown>)[key];
  return value==null?'':String(value);
};
export function filterChoices(items:Item[],field:string):string[]|null{
  if(field==='isDropped')return ['Đang trình','Đã rút','Lưu trữ'];
  if(field==='content'||field==='note'||field==='displayCode'||field==='stt'||field==='history')return null;
  const options=[...new Set(items.map(item=>filterValue(item,field)).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  return options.length>0&&options.length<=12?options:null;
}

export function ColumnFilterCell({field,label,items,value,onChange}:{
  field:string;label:string;items:Item[];value:string;onChange:(next:string)=>void;
}){
  const choices=filterChoices(items,field);
  return <th className={'item-column-filter-cell '+(value?'has-filter':'')} scope="col" data-filter-key={field}>
    <div className="item-filter-input-wrap">
      {choices?<select aria-label={`Lọc cột ${label}`} title={`Lọc cột ${label}`} value={value} onChange={event=>onChange(event.currentTarget.value)}>
        <option value="">Tất cả</option>
        {choices.map(option=><option value={option} key={option}>{option}</option>)}
        {value&&!choices.includes(value)&&<option value={value}>{value}</option>}
      </select>:<input aria-label={`Lọc cột ${label}`} title={`Tìm trong cột ${label}`}
        type="search" autoComplete="off" spellCheck={false} placeholder="⌕ Lọc…"
        value={value} onChange={event=>onChange(event.currentTarget.value)}/>}
      {value&&<button type="button" className="item-filter-clear" aria-label={`Bỏ lọc cột ${label}`} title="Bỏ lọc cột" onClick={()=>onChange('')}>×</button>}
    </div>
  </th>;
}
