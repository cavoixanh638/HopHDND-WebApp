import {useEffect,useRef,useState} from 'react';
import type {EditableField} from '../../../shared/types';
import type {CellEditSessionManager} from '../../data/cell-edit-leases';

export function LeaseTextInput({value,label,id,field,disabled,maxLength=1000,
 manager,onChange}:{value:string;label:string;id:string;field:EditableField;
 disabled?:boolean;maxLength?:number;manager?:CellEditSessionManager;
 onChange:(value:string)=>void}){
  const [ready,setReady]=useState(false);
  const composing=useRef(false);
  const [compositionDraft,setCompositionDraft]=useState(value);
  const [waiting,setWaiting]=useState(false);
  const [error,setError]=useState('');
  const inputRef=useRef<HTMLInputElement>(null);
  const mounted=useRef(false);
  const epoch=useRef(0);
  const inFlight=useRef<Promise<void>|null>(null);
  const releaseFence=useRef<Promise<void>>(Promise.resolve());
  const disabledRef=useRef(disabled);
  disabledRef.current=disabled;
  const previousDisabled=useRef(disabled);
  const activeFocusEpoch=useRef(0);

  /** A blur/drain/unmount fences an in-flight acquire BEFORE the next focus.
   * The backend ACK may arrive after the input disappears; it must then release
   * the lease, never mark an unfocused input editable. Do not cancel pending saves.
   */
  const invalidate=(updateState=true)=>{
    const generation=++epoch.current;
    // Keep the pending message mounted during pointerdown/blur, so buttons
    // immediately after the input do not jump out from under the click.
    if(updateState)setReady(false);
    if(!manager)return;
    const pending=inFlight.current;
    const release=releaseFence.current.catch(()=>{}).then(async()=>{
      await pending?.catch(()=>{});
      if(!manager.isPending(id,field))await manager.cancel(id,field);
    });
    // A subsequent focus must wait for any late ACK and its release, including
    // a slower network response. Never interpret a failed release as save ACK.
    releaseFence.current=release.catch(()=>{});
    void release.then(()=>{
      if(updateState&&mounted.current&&epoch.current===generation)setWaiting(false);
    }).catch(cause=>{
      if(updateState&&mounted.current&&epoch.current===generation){
        setWaiting(false);
        setError('Chưa xác nhận giải phóng khóa ô: '+
          (cause instanceof Error?cause.message:'Lỗi kết nối.'));
      }
    });
  };

  useEffect(()=>{
    mounted.current=true;
    if(!manager)return ()=>{mounted.current=false;epoch.current++;};
    const drain=()=>invalidate();
    window.addEventListener('hdnd:drain-editors',drain);
    return ()=>{
      mounted.current=false;
      invalidate(false); // Release after a late ACK, without setState on unmount.
      window.removeEventListener('hdnd:drain-editors',drain);
    };
  },[id,field,manager]);
  useEffect(()=>{
    if(disabled&&!previousDisabled.current)invalidate();
    previousDisabled.current=disabled;
  },[disabled]);

  const focus=()=>{
    if(!manager||ready||disabled||(waiting&&activeFocusEpoch.current===epoch.current))return;
    const generation=++epoch.current;
    activeFocusEpoch.current=generation;
    setError('');
    setWaiting(true);
    const operation=releaseFence.current.catch(()=>{}).then(async()=>{
      // The focus may have gone away while the earlier lease is releasing.
      if(generation!==epoch.current||!mounted.current||disabledRef.current||
          document.activeElement!==inputRef.current)return;
      const acquired=await manager.acquire(id,field,'short');
      if(!acquired)throw new Error('Chưa xác nhận quyền giữ khóa.');
      if(generation===epoch.current&&mounted.current&&!disabledRef.current&&
          document.activeElement===inputRef.current)setReady(true);
      // An invalidated request is released by invalidate()'s fence.
    }).catch(cause=>{
      if(mounted.current&&generation===epoch.current)
        setError(cause instanceof Error?cause.message:'Ô đang có người khác sửa.');
    }).finally(()=>{
      if(mounted.current&&generation===epoch.current)setWaiting(false);
    });
    inFlight.current=operation;
    void operation.then(()=>{if(inFlight.current===operation)inFlight.current=null;});
  };
  return <>
    <input ref={inputRef} className="custom-cell-input" aria-label={label}
      value={composing.current?compositionDraft:value} maxLength={maxLength} disabled={disabled}
      readOnly={!!manager&&!ready} onFocus={focus}
      onCompositionStart={()=>{composing.current=true;setCompositionDraft(value);}}
      onCompositionEnd={event=>{
        composing.current=false;
        const complete=event.currentTarget.value;
        if(manager&&!manager.has(id,field)){setError('Đã mất khóa ô, nội dung đang nhập được giữ làm nháp.');manager.preserveDraft(id,field,complete);return;}
        onChange(complete);
      }}
      onChange={event=>{
        if(manager&&!manager.has(id,field)){setError('Chưa được phép sửa ô này.');return;}
        if(composing.current){
          setCompositionDraft(event.currentTarget.value);
          if(manager)manager.preserveDraft(id,field,event.currentTarget.value);
          return;
        }
        onChange(event.currentTarget.value);
      }}
      onBlur={()=>invalidate()}/>
    {(waiting||error)&&<small role="status" className={error?'error-text':'muted'}>
      {error||'Đang xin quyền sửa ô…'}</small>}
  </>;
}
