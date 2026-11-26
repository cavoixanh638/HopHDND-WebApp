import {useEffect,useRef,useState,type CSSProperties,type KeyboardEvent,type MouseEvent,
  type PointerEvent,type ReactNode} from 'react';
import {L03_CELL_CHROME_PX,L03_RAIL_GAP_PX,PARTY_TRACK_NAMES,
  partyTrackModeWidth,type PartyTrackWidths} from '../../data/item-preferences';
import {RAILS,l03BoundaryRange,l03ResizeBoundary,type L03WidthMode} from './l03-width-geometry';
export {l03BoundaryRange,l03ResizeBoundary,type L03WidthMode} from './l03-width-geometry';
import './inline-g08-l03-widths.css';

/** The host MUST derive verifiedAdmin from trusted auth and recheck writes in
 * its existing revision/CAS writer. This module has no storage or Firebase I/O. */
export interface L03InlineWidthEditor {
  verifiedAdmin:boolean;
  layoutEditing:boolean;
  dataEditing?:boolean;
  disabled?:boolean;
  /** Lets layout editing preview both geometries WITHOUT enabling field editing. */
  previewMode?:L03WidthMode;
  widths:PartyTrackWidths;
  minimums?:PartyTrackWidths;
  onWidthsCommit:(next:PartyTrackWidths)=>void|boolean|Promise<void|boolean>;
}

const same=(a:PartyTrackWidths,b:PartyTrackWidths)=>JSON.stringify(a)===JSON.stringify(b);
type Gesture={
  kind:'pointer'|'keyboard';mode:L03WidthMode;boundary:number;
  baseline:string;start:PartyTrackWidths;last:PartyTrackWidths;
  pointerId?:number;startX?:number;
};
type Props={
  actualMode:L03WidthMode;editor?:L03InlineWidthEditor;
  children:(state:{mode:L03WidthMode;layoutEditing:boolean})=>ReactNode;
};

/** Overlay only; children retain their own field-scoped edit/lease semantics.
 * On pointer release or keyboard Enter, calls onWidthsCommit exactly once.
 * Escape, pointercancel, lost capture and keyboard blur discard the preview. */
export function L03InlineWidthControl({actualMode,editor,children}:Props){
  const active=!!editor?.verifiedAdmin&&!!editor.layoutEditing&&!editor.dataEditing&&
    !editor.disabled&&typeof editor.onWidthsCommit==='function';
  const mode=active?(editor?.previewMode??actualMode):actualMode;
  const [draft,setDraft]=useState<PartyTrackWidths|null>(null);
  const [error,setError]=useState('');
  const gesture=useRef<Gesture|null>(null);
  const signature=JSON.stringify(editor?.widths);
  const widths=draft??editor?.widths;
  useEffect(()=>{
    const running=gesture.current;
    if(!active||(running&&(running.baseline!==signature||running.mode!==mode))){
      gesture.current=null;setDraft(null);
    }
  },[active,signature,mode]);
  const cancel=()=>{
    gesture.current=null;setDraft(null);
  };
  const finish=()=>{
    const running=gesture.current;
    if(!running)return;
    gesture.current=null;setDraft(null);
    if(!active||!editor||running.baseline!==signature||same(running.start,running.last))
      return;
    try {
      void Promise.resolve(editor.onWidthsCommit(running.last)).then(result=>{
        if(result===false)setError('L03: thay đổi độ rộng chưa được lưu.');
      }).catch(()=>setError('L03: không lưu được độ rộng; bố cục cũ được giữ lại.'));
    }catch{setError('L03: không lưu được độ rộng; bố cục cũ được giữ lại.');}
  };
  const intercept=(event:MouseEvent<HTMLSpanElement>)=>{
    event.preventDefault();event.stopPropagation();
  };
  const onPointerStart=(event:PointerEvent<HTMLSpanElement>,boundary:number)=>{
    if(!active||!editor||!widths)return;
    if(event.pointerType==='mouse'&&event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    event.currentTarget.focus({preventScroll:true});
    setError('');
    gesture.current={kind:'pointer',mode,boundary,baseline:signature,
      start:editor.widths,last:editor.widths,startX:event.clientX,
      pointerId:event.pointerId};
    setDraft(editor.widths);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove=(event:PointerEvent<HTMLSpanElement>,boundary:number)=>{
    const current=gesture.current;
    if(!current||current.kind!=='pointer'||current.pointerId!==event.pointerId||
      current.boundary!==boundary)return;
    event.preventDefault();event.stopPropagation();
    const next=l03ResizeBoundary(current.start,current.mode,boundary,
      event.clientX-(current.startX??event.clientX),editor?.minimums);
    if(!same(next,current.last)){current.last=next;setDraft(next);}
  };
  const onPointerEnd=(event:PointerEvent<HTMLSpanElement>)=>{
    const current=gesture.current;
    if(!current||current.kind!=='pointer'||current.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopPropagation();
    finish();
    if(event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onPointerCancel=(event:PointerEvent<HTMLSpanElement>)=>{
    if(gesture.current?.kind!=='pointer'||gesture.current.pointerId!==event.pointerId)return;
    event.preventDefault();event.stopPropagation();
    cancel();
    if(event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeys=(event:KeyboardEvent<HTMLSpanElement>,boundary:number)=>{
    if(!active||!editor)return;
    if(event.key==='Escape'){
      if(gesture.current){event.preventDefault();event.stopPropagation();cancel();}
      return;
    }
    if(event.key==='Enter'){
      event.preventDefault();event.stopPropagation();
      if(gesture.current?.kind==='keyboard'&&gesture.current.boundary===boundary)
        finish();
      return;
    }
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight')return;
    event.preventDefault();event.stopPropagation();
    const previous=gesture.current;
    if(previous?.kind==='pointer')return;
    if(previous&&(previous.mode!==mode||previous.boundary!==boundary))cancel();
    const running=gesture.current?.kind==='keyboard'?gesture.current:null;
    const start=running?.start??editor.widths;
    const current=running?.last??editor.widths;
    const step=event.altKey||event.shiftKey?10:1;
    const next=l03ResizeBoundary(current,mode,boundary,
      (event.key==='ArrowRight'?1:-1)*step,editor.minimums);
    setError('');
    gesture.current={kind:'keyboard',mode,boundary,baseline:signature,
      start,last:next};
    setDraft(next);
  };
  const style:CSSProperties|undefined=active&&widths?{
    '--hdnd-l03-label-track':String(widths[mode].label)+'px',
    '--hdnd-l03-level-track':String(widths.editable.level)+'px',
    '--hdnd-l03-status-track':String(widths[mode].status)+'px',
    '--hdnd-l03-inner-width':String(partyTrackModeWidth(widths,mode)-L03_CELL_CHROME_PX)+'px'
  } as CSSProperties:undefined;
  const values=widths?.[mode] as Record<string,number>|undefined;
  const names=RAILS[mode];
  return <div className={'compact-stages'+(active?' inline-g08-active':'')}
    data-rev2="true" data-ui-reference-group="L03" data-level-layout={mode}
    data-inline-g08-mode={active?mode:undefined} style={style}>
    {children({mode,layoutEditing:active})}
    {active&&widths&&values&&<div className="inline-g08-overlay" aria-label="Điều chỉnh độ rộng L03">
      {names.slice(0,-1).map((left,index)=>{
        const right=names[index+1];
        const leftWidth=values[left],rightWidth=values[right];
        const range=l03BoundaryRange(widths,mode,index,editor?.minimums);
        const offset=names.slice(0,index+1).reduce((sum,name)=>sum+values[name],0)+
          L03_RAIL_GAP_PX*index+L03_RAIL_GAP_PX/2;
        const labels=PARTY_TRACK_NAMES[mode] as Record<string,string>;
        const tooltip=labels[left]+': '+leftWidth+' px · '+labels[right]+': '+rightWidth+' px';
        const selected=gesture.current?.mode===mode&&gesture.current.boundary===index;
        return <span key={mode+'-'+index} role="separator" tabIndex={0}
          className="inline-g08-handle" data-inline-g08-boundary={index}
          data-inline-g08-selected={selected?'true':undefined}
          data-inline-g08-tooltip={tooltip} title={tooltip+'; ← → xem trước, Enter lưu, Esc hủy'}
          aria-orientation="vertical"
          aria-label={'L03 · ranh giới '+labels[left]+' / '+labels[right]}
          aria-valuemin={leftWidth+range.minDelta}
          aria-valuemax={leftWidth+range.maxDelta}
          aria-valuenow={leftWidth}
          aria-valuetext={tooltip}
          style={{left:String(offset)+'px'}}
          onClickCapture={intercept} onDoubleClickCapture={intercept}
          onPointerDown={event=>onPointerStart(event,index)}
          onPointerMove={event=>onPointerMove(event,index)}
          onPointerUp={onPointerEnd} onPointerCancel={onPointerCancel}
          onLostPointerCapture={event=>{
            if(gesture.current?.kind==='pointer'&&gesture.current.pointerId===event.pointerId)
              cancel();
          }}
          onKeyDown={event=>onKeys(event,index)}
          onKeyUp={event=>{
            if(['ArrowLeft','ArrowRight','Enter','Escape'].includes(event.key))
              event.stopPropagation();
          }}
          onBlur={()=>{
            if(gesture.current?.kind==='keyboard'&&gesture.current.boundary===index)cancel();
          }}/>
      })}
    </div>}
    {active&&error&&<span className="inline-g08-error" role="alert">{error}</span>}
  </div>;
}
