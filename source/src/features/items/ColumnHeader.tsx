import { useRef, useState, type ReactNode } from 'react';

type ColumnHeaderProps = {
  columnKey: string; disabled?: boolean; previousKey?: string; nextKey?: string;
  onMove: (fromKey: string, toKey: string) => void; children: ReactNode;
};

/** Pointer capture supports embedded browsers and touch without native HTML drag/drop. */
export function ColumnHeader({ columnKey, disabled = false, previousKey, nextKey, onMove, children }: ColumnHeaderProps) {
  const start=useRef<{x:number;y:number;pointer:number}|null>(null);
  const [dragging,setDragging]=useState(false);
  const cleanup=()=>{start.current=null;setDragging(false);};
  return <th data-column-key={columnKey} tabIndex={disabled?undefined:0}
    className={disabled?undefined:`column-movable ${dragging?'column-dragging':''}`}
    title={disabled?undefined:'Giữ và kéo tiêu đề để đổi vị trí; Alt+← hoặc Alt+→ để chuyển cột.'}
    onPointerDown={event=>{
      if(disabled||event.button!==0||(event.target instanceof Element&&event.target.closest('.column-resizer')))return;
      start.current={x:event.clientX,y:event.clientY,pointer:event.pointerId};
      event.currentTarget.setPointerCapture(event.pointerId);
    }}
    onPointerMove={event=>{const drag=start.current;if(drag&&drag.pointer===event.pointerId&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5)setDragging(true);}}
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
      if(disabled||!event.altKey||event.target!==event.currentTarget)return;
      const to=event.key==='ArrowLeft'?previousKey:event.key==='ArrowRight'?nextKey:undefined;
      if(to){event.preventDefault();onMove(columnKey,to);}
    }}>{children}</th>;
}
