import {useEffect,useRef} from 'react';
import {planAdjacentTransfer,type AdjacentCompensator} from '../data/resize-last-column';
import './inline-g07-resize.css';

type Compensator = {index:number;width:number;min?:number;max?:number};
type Neighbor = AdjacentCompensator & {index:number};
type Options = {
  width:number;min:number;max:number;
  compensator?:Compensator;adjacent?:Neighbor;fallback?:Neighbor;
};
type StyleSnapshot = {node:HTMLTableColElement;width:string};
type DragSession = {
  pointer:number|null;handle:HTMLSpanElement;startX:number;startWidth:number;currentWidth:number;
  direction:1|-1;scale:number;options:Options;
  col:HTMLTableColElement|null;compensatorCol:HTMLTableColElement|null;
  adjacentCol:HTMLTableColElement|null;fallbackCol:HTMLTableColElement|null;
  table:HTMLTableElement|null;tableWidth:number;originalTableWidth:string;originalMinWidth:string;
  originalCols:StyleSnapshot[];
};

export type ColumnResizeHandleProps = {
  columnIndex:number;width:number;label:string;onCommit:(next:number)=>void;min?:number;max?:number;
  /** Optional local, transient preview only. Never connect this to Firebase or autosave. */
  onPreview?:(next:number)=>void;
  /** Preserve the original popup opt-in for continuation after native capture is lost. */
  windowDragFallback?:boolean;
  compensator?:Compensator;
  adjacent?:Neighbor;
  fallback?:Neighbor;
};

function effectiveBounds(options:Options):{min:number;max:number}{
  const {width,min,max,compensator,adjacent,fallback}=options;
  if(adjacent){
    const tail=fallback?.index===adjacent.index?undefined:fallback;
    const plan=planAdjacentTransfer(width,width,{min,max},adjacent,tail);
    return {min:plan.min,max:plan.max};
  }
  const lower=compensator?Math.max(min,width+compensator.width-(compensator.max??1600)):min;
  const upper=compensator?Math.min(max,width+compensator.width-(compensator.min??60)):max;
  // Preserve the current width if a stale/invalid layout has no usable capacity.
  return lower<=upper?{min:lower,max:upper}:{min:width,max:width};
}

function nextWidth(options:Options,desired:number):number{
  if(!Number.isFinite(desired))return options.width;
  if(options.adjacent){
    const tail=options.fallback?.index===options.adjacent.index?undefined:options.fallback;
    return planAdjacentTransfer(options.width,desired,
      {min:options.min,max:options.max},options.adjacent,tail).target;
  }
  const limits=effectiveBounds(options);
  return Math.min(limits.max,Math.max(limits.min,Math.round(desired)));
}

/** Handles only visual previews. Existing callers remain the sole owners of CAS/personal commits. */
export function ColumnResizeHandle({
  columnIndex,width,label,onCommit,onPreview,min=80,max=1200,
  windowDragFallback=false,compensator,adjacent,fallback
}:ColumnResizeHandleProps){
  const active=useRef<DragSession|null>(null);
  const listeners=useRef<AbortController|null>(null);
  const callbacks=useRef({onCommit,onPreview});
  callbacks.current={onCommit,onPreview};
  const finishRef=useRef<(save:boolean)=>void>(()=>{});
  const options:Options={width,min,max,compensator,adjacent,fallback};
  const bounds=effectiveBounds(options);

  const begin=(handle:HTMLSpanElement,pointer:number|null,startX:number):DragSession=>{
    const table=handle.closest('table');
    const cols=table?.querySelectorAll('colgroup > col');
    const find=(index:number|undefined)=>index===undefined?null:
      cols?.item(index) as HTMLTableColElement|null ?? null;
    const col=find(columnIndex);
    const compensatorCol=find(compensator?.index);
    const adjacentCol=find(adjacent?.index);
    const fallbackCol=find(fallback?.index);
    const originalCols=[col,compensatorCol,adjacentCol,fallbackCol]
      .filter((node,index,array):node is HTMLTableColElement=>!!node&&array.indexOf(node)===index)
      .map(node=>({node,width:node.style.width}));
    const rectWidth=table?.getBoundingClientRect().width??0;
    const layoutWidth=table?.offsetWidth??0;
    const scale=rectWidth>0&&layoutWidth>0?rectWidth/layoutWidth:1;
    const direction=window.getComputedStyle(handle).direction==='rtl'?-1:1;
    return {pointer,handle,startX,startWidth:width,currentWidth:width,direction,scale,
      options:{...options},col,compensatorCol,adjacentCol,fallbackCol,table,
      tableWidth:layoutWidth||rectWidth,originalTableWidth:table?.style.width??'',
      originalMinWidth:table?.style.minWidth??'',originalCols};
  };

  const preview=(desired:number)=>{
    const session=active.current;
    if(!session)return;
    const next=nextWidth(session.options,desired);
    if(next===session.currentWidth)return; // React + window can observe the same event.
    session.currentWidth=next;
    if(session.col)session.col.style.width=String(next)+'px';
    if(session.options.adjacent&&session.adjacentCol){
      const {startWidth,options}=session;
      const tail=options.fallback?.index===options.adjacent.index?undefined:options.fallback;
      const plan=planAdjacentTransfer(startWidth,next,{min:options.min,max:options.max},
        options.adjacent,tail);
      session.adjacentCol.style.width=String(plan.adjacent)+'px';
      if(tail&&session.fallbackCol&&plan.last!==undefined)
        session.fallbackCol.style.width=String(plan.last)+'px';
    }else if(session.options.compensator&&session.compensatorCol){
      const other=session.options.compensator.width-(next-session.startWidth);
      session.compensatorCol.style.width=String(other)+'px';
    }else if(session.table){
      const tableWidth=Math.max(0,session.tableWidth+next-session.startWidth);
      session.table.style.width=String(tableWidth)+'px';
      session.table.style.minWidth=String(tableWidth)+'px';
    }
    session.handle.setAttribute('aria-valuenow',String(next));
    session.handle.setAttribute('aria-valuetext',String(next)+' px');
    callbacks.current.onPreview?.(next);
  };

  const finish=(save:boolean)=>{
    const session=active.current;
    if(!session)return;
    active.current=null; // Guard against pointerup at both window capture + React bubble.
    listeners.current?.abort();
    listeners.current=null;
    if(session.pointer!==null){
      try {
        if(session.handle.hasPointerCapture(session.pointer))
          session.handle.releasePointerCapture(session.pointer);
      }catch{/* The element may already be detached or capture may be lost. */}
    }
    for(const snapshot of session.originalCols)
      snapshot.node.style.width=snapshot.width;
    if(session.table){
      session.table.style.width=session.originalTableWidth;
      session.table.style.minWidth=session.originalMinWidth;
    }
    const committed=save?session.currentWidth:session.startWidth;
    session.handle.setAttribute('aria-valuenow',String(committed));
    session.handle.setAttribute('aria-valuetext',String(committed)+' px');
    if(!save&&session.currentWidth!==session.startWidth)
      callbacks.current.onPreview?.(session.startWidth);
    if(save&&session.currentWidth!==session.startWidth)
      callbacks.current.onCommit(session.currentWidth);
  };
  finishRef.current=finish;
  useEffect(()=>()=>{finishRef.current(false);listeners.current?.abort();},[]);

  const movePointer=(pointer:number,x:number)=>{
    const session=active.current;
    if(!session||session.pointer!==pointer)return;
    preview(session.startWidth+session.direction*(x-session.startX)/session.scale);
  };
  const releasePointer=(pointer:number,x:number)=>{
    const session=active.current;
    if(!session||session.pointer!==pointer)return;
    movePointer(pointer,x);
    finish(true);
  };
  const installWindowListeners=()=>{
    listeners.current?.abort();
    const controller=new AbortController();
    listeners.current=controller;
    const capturing={capture:true,signal:controller.signal};
    window.addEventListener('pointermove',event=>movePointer(event.pointerId,event.clientX),capturing);
    window.addEventListener('pointerup',event=>releasePointer(event.pointerId,event.clientX),capturing);
    window.addEventListener('pointercancel',event=>{
      if(active.current?.pointer===event.pointerId)finish(false);
    },capturing);
    window.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&active.current?.pointer!==null&&active.current){
        event.preventDefault();event.stopPropagation();finish(false);
      }
    },capturing);
    window.addEventListener('blur',()=>finish(false),{signal:controller.signal});
  };
  const currentWidth=()=>active.current?.currentWidth??width;

  return <span draggable={false} className="column-resizer inline-g07-resizer" role="separator"
    tabIndex={0} aria-orientation="vertical"
    aria-label={'Chỉnh độ rộng cột '+label}
    aria-valuemin={bounds.min} aria-valuemax={bounds.max} aria-valuenow={width}
    aria-valuetext={String(width)+' px'}
    title={'Kéo vạch giữa các cột; mũi tên ±10 px, Shift+mũi tên ±50 px; Esc hủy thao tác'}
    onClick={event=>event.stopPropagation()}
    onPointerDown={event=>{
      if(event.button!==0||event.isPrimary===false||active.current)return;
      event.preventDefault();event.stopPropagation();
      event.currentTarget.focus({preventScroll:true});
      active.current=begin(event.currentTarget,event.pointerId,event.clientX);
      installWindowListeners();
      try{event.currentTarget.setPointerCapture(event.pointerId);}
      catch{/* Window listeners handle pointer movement even without capture. */}
    }}
    onPointerMove={event=>movePointer(event.pointerId,event.clientX)}
    onPointerUp={event=>releasePointer(event.pointerId,event.clientX)}
    onPointerCancel={event=>{
      if(active.current?.pointer===event.pointerId)finish(false);
    }}
    onLostPointerCapture={event=>{
      if(!windowDragFallback&&active.current?.pointer===event.pointerId)finish(false);
    }}
    onKeyDown={event=>{
      if(event.key==='Escape'){
        if(active.current){
          event.preventDefault();event.stopPropagation();finish(false);
        }
        return;
      }
      if(event.key==='Enter'){
        if(active.current?.pointer===null){
          event.preventDefault();event.stopPropagation();finish(true);
        }
        return;
      }
      if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
      if(event.altKey||event.ctrlKey||event.metaKey||active.current?.pointer!==undefined&&
        active.current.pointer!==null)return;
      event.preventDefault();event.stopPropagation();
      if(!active.current)active.current=begin(event.currentTarget,null,0);
      const session=active.current;
      const step=event.shiftKey?50:10;
      const delta=(event.key==='ArrowRight'?step:-step)*session.direction;
      preview(currentWidth()+delta);
    }}
    onKeyUp={event=>{
      if((event.key==='ArrowLeft'||event.key==='ArrowRight')&&active.current?.pointer===null){
        event.preventDefault();event.stopPropagation();finish(true);
      }
    }}
    onBlur={()=>{if(active.current?.pointer===null)finish(true);}}
  />;
}
