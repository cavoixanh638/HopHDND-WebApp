import {useEffect,useRef,useState} from 'react';
import type {EditableField} from '../../../shared/types';
import type {CellLeaseUiManager} from '../../data/cell-edit-leases';

export function LeaseTextInput({value,label,id,field,disabled,maxLength=1000,
 manager,onChange}:{value:string;label:string;id:string;field:EditableField;
 disabled?:boolean;maxLength?:number;manager?:CellLeaseUiManager;
 onChange:(value:string)=>void}){
  const [ready,setReady]=useState(false);
  const composing=useRef(false);
  const [compositionDraft,setCompositionDraft]=useState(value);
  const [waiting,setWaiting]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!manager)return;
    const drain=()=>{setReady(false);if(!manager.isPending(id,field))void manager.cancel(id,field);};
    window.addEventListener('hdnd:drain-editors',drain);
    return()=>window.removeEventListener('hdnd:drain-editors',drain);
  },[id,field,manager]);
  const focus=()=>{
    if(!manager||ready||waiting||disabled)return;
    setWaiting(true);
    void manager.acquire(id,field,'short').then(()=>setReady(true))
      .catch(e=>setError(e instanceof Error?e.message:'Ô đang có người khác sửa.'))
      .finally(()=>setWaiting(false));
  };
  return <>
    <input className="custom-cell-input" aria-label={label}
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
      onBlur={()=>{
        setReady(false);
        if(manager&&!manager.isPending(id,field))void manager.cancel(id,field);
      }}/>
    {(waiting||error)&&<small role="status" className={error?'error-text':'muted'}>
      {error||'Đang xin quyền sửa ô…'}</small>}
  </>;
}
