import {useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
import {inlineG04ViewportWidth,inlineG04WidthBounds,inlineG04ClampWidth,inlineG04DragWidth,type InlineG04Edge} from './inline-g04-popup-width';

/** G04: all resize pointer events are captured by transparent edge/corner controls.
 * Preview is RAM-only; onCommit fires exactly once at pointerup / keyboard step.
 */
export function InlineG04PopupHandles({width,onPreview,onCommit}:{
  width:number;onPreview:(n:number|null)=>void;onCommit:(n:number)=>void;
}){
  const [viewport,setViewport]=useState(()=>inlineG04ViewportWidth());
  const active=useRef<{pointer:number;edge:InlineG04Edge;x:number;start:number}|null>(null);
  const finish=(event:ReactPointerEvent<HTMLButtonElement>,commit:boolean)=>{
    const start=active.current;
    if(!start||start.pointer!==event.pointerId)return;
    const result=inlineG04DragWidth(start.start,event.clientX-start.x,start.edge,inlineG04ViewportWidth());
    active.current=null;onPreview(null);
    if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
    if(commit&&Math.abs(event.clientX-start.x)>=2&&inlineG04WidthBounds(inlineG04ViewportWidth()).canSave)onCommit(result);
  };
  if(!inlineG04WidthBounds(viewport).canSave)return null;
  return <>{(['left','right'] as const).flatMap(edge=>[false,true].map(corner=>
    <button key={edge+String(corner)} type="button" className="inline-g04-resize"
      data-edge={edge} data-corner={String(corner)}
      title="Kéo để chỉnh rộng; phím mũi tên đổi 10 px, Shift đổi 50 px"
      aria-label={'Chỉnh rộng popup từ '+(corner?'góc ':'cạnh ')+(edge==='left'?'trái':'phải')}
      onClick={event=>event.stopPropagation()}
      onPointerDown={event=>{
        if(event.button!==0)return;
        event.preventDefault();event.stopPropagation();
        setViewport(inlineG04ViewportWidth());
        active.current={pointer:event.pointerId,edge,x:event.clientX,start:width};
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event=>{
        const a=active.current;
        if(a?.pointer===event.pointerId)onPreview(inlineG04DragWidth(a.start,event.clientX-a.x,a.edge,inlineG04ViewportWidth()));
      }}
      onPointerUp={event=>finish(event,true)}
      onPointerCancel={event=>finish(event,false)}
      onLostPointerCapture={()=>{active.current=null;onPreview(null);}}
      onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();active.current=null;onPreview(null);return;}
        if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
        event.preventDefault();event.stopPropagation();
        onCommit(inlineG04ClampWidth(width+(event.key==='ArrowRight'?1:-1)*(event.shiftKey?50:10),inlineG04ViewportWidth()));
      }}/>))}</>;
}
