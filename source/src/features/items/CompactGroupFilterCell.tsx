import type {KeyboardEvent} from 'react';
import type {Item} from '../../../shared/types';
import {filterChoices} from './ColumnFilterCell';
import {preserveStickyFilterViewport} from './filter-scroll';

/** Every source filter survives the visual grouping. Independent source filters
 * combine with AND; Esc clears only the focused field. No group-only data index. */
export function CompactGroupFilterCell({items,fields,values,onChange}:{
  items:Item[];fields:readonly string[];values:Record<string,string>;
  onChange:(field:string,value:string)=>void;
}){
  return <th className="item-column-filter-cell compact-group-filter" scope="col">
    <div className="compact-group-filter-stack">
      {fields.map(field=>{
        const value=values[field]??'';
        const choices=filterChoices(items,field);
        const label=field==='type'?'Loại VB':field==='department'?'Sở/ngành':
          field==='partyLevel'?'Cấp trình':field==='progressParty'?'Thành ủy':
          field==='progressBuild'?'Xây dựng NQ':field==='progressCouncil'?'Ban hành NQ':'Nội dung';
        const clear=(e:KeyboardEvent<HTMLInputElement|HTMLSelectElement>)=>{
          if(e.key==='Escape'&&value){e.preventDefault();e.stopPropagation();onChange(field,'');}
        };
        return <div className="item-filter-input-wrap" key={field} data-filter-key={field}>
          {choices?<select aria-label={'Lọc '+label} value={value}
            className={value?'selected-filter-value':'filter-placeholder'}
            onPointerDown={e=>preserveStickyFilterViewport(e.currentTarget)}
            onChange={e=>onChange(field,e.currentTarget.value)} onKeyDown={clear}>
            <option value="">{label}</option>
            {choices.map(choice=><option key={choice} value={choice}>{choice}</option>)}
            {value&&!choices.includes(value)&&<option value={value}>{value}</option>}
          </select>:<input type="search" autoComplete="off" spellCheck={false} aria-label={'Lọc '+label}
            placeholder={label} value={value} onPointerDown={e=>preserveStickyFilterViewport(e.currentTarget)}
            onChange={e=>onChange(field,e.currentTarget.value)} onKeyDown={clear}/>}
          {value&&<button className="item-filter-clear" type="button" aria-label={'Xóa lọc '+label}
            onClick={()=>onChange(field,'')}>×</button>}
        </div>;
      })}
    </div>
  </th>;
}
