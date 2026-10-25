import {useEffect,useRef,useState} from 'react';
import {SearchHighlight} from './SearchHighlight';
import type {CellEditSessionManager} from '../../data/cell-edit-leases';
import type {EditableField} from '../../../shared/types';

/** Reusable inline multiline editor for Note and Current progress; it changes only the existing draft via onCommit.
 * Escape discards local edits; Ctrl/Cmd+Enter or blur applies changes locally.
 * It never writes directly to Excel/Firebase and never grants permissions. */
export function InlineNoteEditor({value,label,highlightQuery,onCommit,leaseManager,recordId,field}:{
  value:string;label:string;highlightQuery?:string;onCommit:(next:string)=>boolean|void;
  leaseManager?:CellEditSessionManager;recordId?:string;field?:EditableField;
}){
  const [editing,setEditing]=useState(false);
  const [waiting,setWaiting]=useState(false);
  const [draft,setDraft]=useState(value);
  const [error,setError]=useState('');
  const cancelled=useRef(false);
  const completed=useRef(false);
  const textareaRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{if(!editing)setDraft(value);},[value,editing]);
  // In the Pages Preact build, don't rely only on autoFocus. Without DOM focus,
  // blur may never fire and several textareas can remain open simultaneously.
  useEffect(()=>{if(editing&&textareaRef.current&&document.activeElement!==textareaRef.current)
    textareaRef.current.focus();},[editing]);
  const apply=()=>{
    if(cancelled.current){cancelled.current=false;return;}
    if(completed.current)return;
    if(draft!==value&&leaseManager&&recordId&&field&&!leaseManager.has(recordId,field)){
      setError('Quyền sửa ô đã hết hạn. Hãy sao chép nội dung trước khi rời ô.');return;
    }
    if(draft!==value&&onCommit(draft)===false){
      setError('Quyền sửa đã thay đổi. Nội dung chưa được áp dụng; hãy sao chép nội dung trước khi rời ô.');
      return;
    }
    completed.current=true;
    setEditing(false);
    if(leaseManager&&recordId&&field&&draft===value)void leaseManager.cancel(recordId,field);
    setError('');
  };
  useEffect(()=>{
    if(!editing)return;
    const drain=()=>apply();
    window.addEventListener('hdnd:drain-editors',drain);
    return()=>window.removeEventListener('hdnd:drain-editors',drain);
  },[editing,draft,value]);
  if(!editing)return <button type="button" className="inline-note-trigger"
    aria-label={label} disabled={waiting} onClick={()=>{
      const begin=()=>{
        cancelled.current=false;completed.current=false;setError('');
        setDraft(value);setEditing(true);
      };
      if(!leaseManager||!recordId||!field){begin();return;}
      setWaiting(true);
      void leaseManager.acquire(recordId,field,'multiline').then(begin)
        .catch(e=>setError(e instanceof Error?e.message:'Ô đang có người khác sửa.'))
        .finally(()=>setWaiting(false));
    }}><SearchHighlight value={value||'—'} query={highlightQuery}/></button>;
  return <div className="inline-note-editor">
    <textarea ref={textareaRef} className="inline-note-textarea" autoFocus aria-label={label}
      maxLength={20000} rows={Math.min(8,Math.max(3,draft.split('\n').length))}
      value={draft} onChange={event=>{
        const next=event.currentTarget.value;
        if(leaseManager&&recordId&&field)leaseManager.preserveDraft(recordId,field,next);
        setDraft(next);
      }}
      onBlur={apply} onKeyDown={event=>{
        if(event.key==='Escape'){
          event.preventDefault();event.stopPropagation();
          cancelled.current=true;setDraft(value);setError('');setEditing(false);
          if(leaseManager&&recordId&&field)void leaseManager.cancel(recordId,field);
        }else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){
          event.preventDefault();apply();
        }
      }}/>
    {error&&<small className="error-text" role="alert">{error}</small>}
  </div>;
}
