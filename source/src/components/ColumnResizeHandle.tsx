import { useEffect, useRef } from 'react';

type DragSession = {
  pointer: number; startX: number; startWidth: number; currentWidth: number;
  col: HTMLTableColElement | null; table: HTMLTableElement | null;
  originalTableWidth: string; originalMinWidth: string; tableWidth: number;
};

/** Drag the actual column edge without rerendering a large table on every pixel.
 * Only commit the new width to React / shared configuration on pointer release. */
export function ColumnResizeHandle({columnIndex,width,label,onCommit,min=80,max=1200,windowDragFallback=false}:{
  columnIndex:number;width:number;label:string;onCommit:(next:number)=>void;min?:number;max?:number;
  /** For a nested dialog: keep drag tracking if the native pointer capture is lost. */
  windowDragFallback?:boolean;
}) {
  const active=useRef<DragSession|null>(null);
  const windowListeners=useRef<AbortController|null>(null);
  useEffect(()=>()=>windowListeners.current?.abort(),[]);
  const clamp=(value:number)=>Math.min(max,Math.max(min,Math.round(value)));
  const preview=(value:number)=>{
    const session=active.current;if(!session)return;
    session.currentWidth=clamp(value);
    if(session.col)session.col.style.width=`${session.currentWidth}px`;
    if(session.table){
      const next=Math.max(0,session.tableWidth+session.currentWidth-session.startWidth);
      session.table.style.width=`${next}px`;
      session.table.style.minWidth=`${next}px`;
    }
  };
  const finish=(save:boolean)=>{
    windowListeners.current?.abort();windowListeners.current=null;
    const session=active.current;if(!session)return;
    active.current=null;
    if(session.table){
      session.table.style.width=session.originalTableWidth;
      session.table.style.minWidth=session.originalMinWidth;
    }
    if(session.col)session.col.style.width=`${session.startWidth}px`;
    if(save&&session.currentWidth!==session.startWidth)onCommit(session.currentWidth);
  };
  return <span draggable={false} className="column-resizer" role="separator" tabIndex={0}
    aria-label={`Kéo ranh giới để đổi độ rộng cột ${label}`} aria-orientation="vertical"
    aria-valuemin={min} aria-valuemax={max} aria-valuenow={width}
    title="Đưa chuột vào đường kẻ dọc giữa hai cột và kéo để chỉnh độ rộng; dùng phím mũi tên khi được chọn"
    onPointerDown={event=>{
      if(event.button!==0)return;
      event.preventDefault();event.stopPropagation();
      const table=event.currentTarget.closest('table');
      const col=table?.querySelectorAll('colgroup > col').item(columnIndex) as HTMLTableColElement|null;
      active.current={
        pointer:event.pointerId,startX:event.clientX,startWidth:width,currentWidth:width,
        col:col??null,table:table??null,originalTableWidth:table?.style.width??'',
        originalMinWidth:table?.style.minWidth??'',tableWidth:table?.getBoundingClientRect().width??width,
      };
      if(windowDragFallback){
        windowListeners.current?.abort();
        const controller=new AbortController();windowListeners.current=controller;
        const move=(e:PointerEvent)=>{
          const session=active.current;
          if(session?.pointer===e.pointerId)preview(session.startWidth+e.clientX-session.startX);
        };
        const up=(e:PointerEvent)=>{
          const session=active.current;
          if(session?.pointer!==e.pointerId)return;
          preview(session.startWidth+e.clientX-session.startX);
          finish(true);
        };
        window.addEventListener('pointermove',move,{capture:true,signal:controller.signal});
        window.addEventListener('pointerup',up,{capture:true,signal:controller.signal});
        window.addEventListener('pointercancel',()=>finish(false),{capture:true,signal:controller.signal});
        window.addEventListener('blur',()=>finish(false),{signal:controller.signal});
      }
      try{event.currentTarget.setPointerCapture(event.pointerId);}
      catch{ /* Window listeners continue the drag in nested dialogs. */ }
    }}
    onPointerMove={event=>{
      const session=active.current;
      if(session?.pointer===event.pointerId)preview(session.startWidth+event.clientX-session.startX);
    }}
    onPointerUp={event=>{
      const session=active.current;
      if(session?.pointer!==event.pointerId)return;
      preview(session.startWidth+event.clientX-session.startX);
      finish(true);
    }}
    onPointerCancel={()=>finish(false)} onLostPointerCapture={()=>{if(!windowDragFallback)finish(false);}}
    onKeyDown={event=>{
      if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
      event.preventDefault();event.stopPropagation();
      onCommit(clamp(width+(event.key==='ArrowRight'?10:-10)));
    }}/>;
}
