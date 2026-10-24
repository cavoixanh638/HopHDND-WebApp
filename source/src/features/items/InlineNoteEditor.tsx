import {useEffect,useRef,useState} from 'react';
import {SearchHighlight} from './SearchHighlight';

/** Reusable inline multiline editor for Note and Current progress; it changes only the existing draft via onCommit.
 * Escape discards local edits; Ctrl/Cmd+Enter or blur applies changes locally.
 * It never writes directly to Excel/Firebase and never grants permissions. */
export function InlineNoteEditor({value,label,highlightQuery,onCommit}:{
  value:string;label:string;highlightQuery?:string;onCommit:(next:string)=>boolean|void;
}){
  const [editing,setEditing]=useState(false);
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
    if(draft!==value&&onCommit(draft)===false){
      setError('Quyền sửa đã thay đổi. Nội dung chưa được áp dụng; hãy sao chép nội dung trước khi rời ô.');
      return;
    }
    completed.current=true;
    setEditing(false);
    setError('');
  };
  if(!editing)return <button type="button" className="inline-note-trigger"
    aria-label={label} onClick={()=>{
      cancelled.current=false;completed.current=false;setError('');
      setDraft(value);setEditing(true);
    }}><SearchHighlight value={value||'—'} query={highlightQuery}/></button>;
  return <div className="inline-note-editor">
    <textarea ref={textareaRef} className="inline-note-textarea" autoFocus aria-label={label}
      maxLength={20000} rows={Math.min(8,Math.max(3,draft.split('\n').length))}
      value={draft} onChange={event=>setDraft(event.currentTarget.value)}
      onBlur={apply} onKeyDown={event=>{
        if(event.key==='Escape'){
          event.preventDefault();event.stopPropagation();
          cancelled.current=true;setDraft(value);setError('');setEditing(false);
        }else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){
          event.preventDefault();apply();
        }
      }}/>
    {error&&<small className="error-text" role="alert">{error}</small>}
  </div>;
}
