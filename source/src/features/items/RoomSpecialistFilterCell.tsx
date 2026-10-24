import type {Item} from '../../../shared/types';
import type {KeyboardEvent} from 'react';
import {preserveStickyFilterViewport} from './filter-scroll';

/** Independent AND filters for the visually merged Room / Specialist column. */
export function RoomSpecialistFilterCell({items,room,person,onRoom,onPerson}:{
  items:Item[];room:string;person:string;
  onRoom:(next:string)=>void;onPerson:(next:string)=>void;
}){
  const rooms=[...new Set(items.map(item=>item.room).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'vi'));
  const clear=(event:KeyboardEvent<HTMLInputElement|HTMLSelectElement>,fn:(v:string)=>void)=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();fn('');}
  };
  return <th className={'item-column-filter-cell room-specialist-filter'+(room||person?' has-filter':'')}
    scope="col" data-filter-key="room">
    <div className="room-specialist-filter-stack">
      <div className="item-filter-input-wrap">
        <select aria-label="Lọc theo Phòng" title="Lọc theo Phòng" value={room}
          className={room?'selected-filter-value':'filter-placeholder'}
          onPointerDown={e=>preserveStickyFilterViewport(e.currentTarget)}
          onChange={e=>onRoom(e.currentTarget.value)} onKeyDown={e=>clear(e,onRoom)}>
          <option value="">Lọc theo Phòng</option>
          {rooms.map(option=><option key={option} value={option}>{option}</option>)}
          {room&&!rooms.includes(room)&&<option value={room}>{room}</option>}
        </select>
        {room&&<button type="button" className="item-filter-clear" aria-label="Xóa lọc Phòng"
          onClick={()=>onRoom('')}>×</button>}
      </div>
      <div className="item-filter-input-wrap">
        <input type="search" autoComplete="off" spellCheck={false}
          aria-label="Tìm kiếm tên CV" placeholder="Tìm kiếm tên CV" value={person}
          onPointerDown={e=>preserveStickyFilterViewport(e.currentTarget)}
          onChange={e=>onPerson(e.currentTarget.value)}
          onKeyDown={e=>clear(e,onPerson)}/>
        {person&&<button type="button" className="item-filter-clear"
          aria-label="Xóa tìm kiếm tên CV" onClick={()=>onPerson('')}>×</button>}
      </div>
    </div>
  </th>;
}
