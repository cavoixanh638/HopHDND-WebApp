import { useRef, useState, type ReactNode } from 'react';

type ColumnHeaderProps = {
  columnKey: string; disabled?: boolean; previousKey?: string; nextKey?: string;
  onMove: (fromKey: string, toKey: string) => void; onSort?: (key:string)=>void;
  sortDirection?: 'asc'|'desc'|null;sortLabel?:string; children: ReactNode;
};

/** Pointer capture supports embedded browsers and touch without native HTML drag/drop. */
export function ColumnHeader({ columnKey, disabled = false, previousKey, nextKey, onMove,onSort,sortDirection,sortLabel, children }: ColumnHeaderProps) {
  const start=useRef<{x:number;y:number;pointer:number}|null>(null);
  const [dragging,setDragging]=useState(false);
  // A drag must never also fire the sort action when the pointer is released.
  const justDragged=useRef(false);
  const cleanup=()=>{start.current=null;setDragging(false);};
  return <th scope="col" aria-sort={sortDirection?(sortDirection==='asc'?'ascending':'descending'):'none'} data-column-key={columnKey} tabIndex={onSort||!disabled?0:undefined}
    className={disabled?undefined:`column-movable ${dragging?'column-dragging':''}`}
    title={disabled?'Bấm tiêu đề để sắp xếp': 'Bấm để sắp xếp; giữ và kéo để chuyển cột; Alt+← hoặc Alt+→ để chuyển cột.'}
    onClick={event=>{
      if(!onSort)return;
      if(justDragged.current){justDragged.current=false;return;}
      if((event.target as HTMLElement).closest('.column-resizer,.column-sort-button'))return;
      onSort(columnKey);
    }}
    onPointerDown={event=>{
      if(disabled||event.button!==0||(event.target instanceof Element&&event.target.closest('.column-resizer,.column-sort-button')))return;
      justDragged.current=false;
      start.current={x:event.clientX,y:event.clientY,pointer:event.pointerId};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event=>{const drag=start.current;if(drag&&drag.pointer===event.pointerId&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5){justDragged.current=true;setDragging(true);}}}
    onPointerUp={event=>{
      const drag=start.current;
      if(!disabled&&drag&&drag.pointer===event.pointerId&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5){
        const target=document.elementFromPoint(event.clientX,event.clientY)?.closest('th[data-column-key]');
        const to=target?.getAttribute('data-column-key');
        if(to&&to!==columnKey&&target?.closest('table')===event.currentTarget.closest('table'))onMove(columnKey,to);
      }
      cleanup();
    }}
    onPointerCancel={cleanup} onLostPointerCapture={cleanup}
    onKeyDown={event=>{
      if(event.target!==event.currentTarget)return;
      if(!event.altKey&&(event.key==='Enter'||event.key===' ')){
        if(onSort){event.preventDefault();onSort(columnKey);}return;
      }
      if(disabled||!event.altKey)return;
      const to=event.key==='ArrowLeft'?previousKey:event.key==='ArrowRight'?nextKey:undefined;
      if(to){event.preventDefault();onMove(columnKey,to);}
    }}><span className="column-heading-content"><span className="column-heading-label">{children}</span>
      {onSort&&<button type="button" className={'column-sort-button'+(sortDirection?' active':'')}
        aria-label={'Sắp xếp cột '+(sortLabel??columnKey)+(sortDirection?(sortDirection==='asc'?', hiện tăng dần':', hiện giảm dần'):', chưa sắp xếp')}
        title={sortDirection==='asc'?'Đang tăng dần · bấm để giảm dần':sortDirection==='desc'?'Đang giảm dần · bấm để trở về thứ tự nguồn':'Sắp xếp tăng dần'}
        onPointerDown={event=>event.stopPropagation()} onClick={event=>{event.stopPropagation();onSort(columnKey);}}>
          {sortDirection==='asc'?'↑':sortDirection==='desc'?'↓':'↕'}
        </button>}
    </span></th>;
}
