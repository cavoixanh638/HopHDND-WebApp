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
  const composing=useRef(false);
  const drainRequested=useRef(false);
  const latestDraft=useRef(value);
  const completed=useRef(false);
  // Editing must be instantaneous even while the Firebase exclusive lease is
  // in flight. Only the actual COMMIT, never typing, waits for server ACK.
  const editingNow=useRef(false);
  const pendingAcquire=useRef<Promise<boolean>|null>(null);
  const commitAfterAcquire=useRef(false);
  const applyRef=useRef<()=>void>(()=>{});
  const mounted=useRef(true);
  const [saveQueued,setSaveQueued]=useState(false);
  const textareaRef=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{if(!editing){setDraft(value);latestDraft.current=value;}},[value,editing]);
  // In the Pages Preact build, don't rely only on autoFocus. Without DOM focus,
  // blur may never fire and several textareas can remain open simultaneously.
  useEffect(()=>{if(editing&&textareaRef.current&&document.activeElement!==textareaRef.current)
    textareaRef.current.focus();},[editing]);
  // Do not leak a newly obtained cell lease when the editor is unmounted by
  // sorting, filtering or navigation. Never release an in-flight save lease.
  useEffect(()=>{
    mounted.current=true;
    return ()=>{
      mounted.current=false;
      if(leaseManager&&recordId&&field&&leaseManager.has(recordId,field)&&
        !leaseManager.isPending(recordId,field))
        void leaseManager.cancel(recordId,field).catch(()=>{});
    };
  },[leaseManager,recordId,field]);
  const apply=()=>{
    if(composing.current){drainRequested.current=true;return;}
    if(cancelled.current){cancelled.current=false;return;}
    if(completed.current||!editingNow.current)return;
    const current=latestDraft.current;
    if(current!==value&&leaseManager&&recordId&&field&&!leaseManager.has(recordId,field)){
      if(pendingAcquire.current){
        // Blur/Ctrl+Enter while the lease request is outstanding must NEVER
        // discard the text or attempt an unauthorized optimistic write.
        commitAfterAcquire.current=true;
        setSaveQueued(true);
        return;
      }
      setError('Chưa kết nối được để lưu ô này. Nội dung vẫn ở đây; chọn Thử lại để gửi sau khi được cấp quyền.');
      return;
    }
    if(current!==value&&onCommit(current)===false){
      setError('Quyền sửa hoặc dữ liệu đã thay đổi. Nội dung chưa được áp dụng; hãy sao chép nội dung trước khi rời ô.');
      return;
    }
    completed.current=true;
    editingNow.current=false;
    commitAfterAcquire.current=false;
    setSaveQueued(false);
    setEditing(false);
    if(leaseManager&&recordId&&field&&current===value)
      void leaseManager.cancel(recordId,field).catch(()=>{});
    setError('');
  };
  applyRef.current=apply;
  useEffect(()=>{
    if(!editing)return;
    const drain=()=>apply();
    window.addEventListener('hdnd:drain-editors',drain);
    return()=>window.removeEventListener('hdnd:drain-editors',drain);
  },[editing,draft,value]);
  // Empty source fields stay visually blank at rest. The pencil is an
  // interaction hint only, not content; the same editor still checks lease
  // and permissions before any save.
  const emptyValue=value.trim().length===0;
  const addHint=field==='specificProgress'?'Thêm tiến độ hiện tại':'Thêm ghi chú';
  const shownValue=emptyValue
    ?<svg className="inline-note-pencil" aria-hidden="true" focusable="false"
      width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
    :<SearchHighlight value={value} query={highlightQuery}/>;
  const savedDraft=leaseManager&&recordId&&field?leaseManager.recoverDraft(recordId,field):null;
  const beginLease=()=>{
    if(!leaseManager||!recordId||!field||leaseManager.has(recordId,field)){
      setWaiting(false);return;
    }
    setWaiting(true);
    // A quick Escape/reopen must share the original request rather than
    // launching two overlapping acquisitions for the same record/field.
    if(pendingAcquire.current)return;
    const request=leaseManager.acquire(recordId,field,'multiline');
    pendingAcquire.current=request;
    void request.then(()=>{
      if(pendingAcquire.current!==request)return;
      pendingAcquire.current=null;
      if(!mounted.current||!editingNow.current){
        // Undo a late successful acquisition after Escape/unmount, unless the
        // application has already started a confirmed server-save transaction.
        if(!leaseManager.isPending(recordId,field))
          void leaseManager.cancel(recordId,field).catch(()=>{});
        return;
      }
      setWaiting(false);
      if(commitAfterAcquire.current){
        commitAfterAcquire.current=false;
        setSaveQueued(false);
        applyRef.current();
      }
    }).catch(cause=>{
      if(pendingAcquire.current!==request)return;
      pendingAcquire.current=null;
      if(!mounted.current||!editingNow.current)return;
      setWaiting(false);
      setSaveQueued(false);
      const reason=cause instanceof Error?cause.message:'Không thể kết nối máy chủ.';
      setError(reason+' Nội dung đang nhập được giữ nguyên; chọn Thử lại khi kết nối sẵn sàng.');
    });
  };
  const beginEdit=(initial:string)=>{
    if(editingNow.current)return;
    // Open/focus immediately. Lease acquisition is a background prerequisite
    // to saving, not to viewing or typing in the local draft textarea.
    cancelled.current=false;completed.current=false;editingNow.current=true;
    commitAfterAcquire.current=false;setSaveQueued(false);
    latestDraft.current=initial;setDraft(initial);setError('');setEditing(true);
    beginLease();
  };
  if(!editing&&!leaseManager)return <button type="button" className={emptyValue?'inline-note-trigger inline-note-empty':'inline-note-trigger'}
    aria-label={emptyValue?label+': '+addHint:label}
    data-add-hint={emptyValue?addHint:undefined} title={emptyValue?addHint:undefined}
    onClick={()=>beginEdit(value)}>
      {shownValue}
    </button>;
  if(!editing)return <span className="inline-note-entry">
    <button type="button" className={emptyValue?'inline-note-trigger inline-note-empty':'inline-note-trigger'}
      aria-label={emptyValue?label+': '+addHint:label}
      data-add-hint={emptyValue?addHint:undefined} title={emptyValue?addHint:undefined}
      onClick={()=>beginEdit(value)}>
      {shownValue}
    </button>
    {savedDraft!==null&&savedDraft!==value&&<button type="button" className="button ghost"
      onClick={()=>beginEdit(savedDraft)} title="Nháp chỉ có trên máy này, chưa lưu vào Firebase">Khôi phục nháp chưa lưu</button>}
    {error&&<small className="error-text" role="alert">{error}</small>}
  </span>;
  return <div className="inline-note-editor">
    <textarea ref={textareaRef} className="inline-note-textarea" autoFocus aria-label={label}
      maxLength={20000} rows={Math.min(8,Math.max(3,draft.split('\n').length))}
      value={draft} onChange={event=>{
        const next=event.currentTarget.value;
        if(leaseManager&&recordId&&field)leaseManager.preserveDraft(recordId,field,next);
        latestDraft.current=next;setDraft(next);
      }}
      onCompositionStart={()=>{composing.current=true;}}
      onCompositionEnd={event=>{
        composing.current=false;
        const finalText=event.currentTarget.value;
        latestDraft.current=finalText;setDraft(finalText);
        if(leaseManager&&recordId&&field)leaseManager.preserveDraft(recordId,field,finalText);
        if(drainRequested.current){drainRequested.current=false;apply();}
      }}
      onBlur={apply} onKeyDown={event=>{
        if(event.key==='Escape'){
          event.preventDefault();event.stopPropagation();
          cancelled.current=true;editingNow.current=false;commitAfterAcquire.current=false;
          setSaveQueued(false);setDraft(value);setError('');setEditing(false);
          if(leaseManager&&recordId&&field&&leaseManager.has(recordId,field))
            void leaseManager.cancel(recordId,field).catch(()=>{});
        }else if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){
          event.preventDefault();apply();
        }
      }}/>
    {saveQueued&&waiting&&<small className="muted" role="status">Đã giữ nội dung; sẽ lưu khi kết nối được xác nhận.</small>}
    {error&&<div className="inline-note-save-error" role="alert">
      <span>{error}</span>
      {leaseManager&&recordId&&field&&!leaseManager.has(recordId,field)&&
        <button type="button" className="button ghost inline-note-retry"
          onMouseDown={event=>event.preventDefault()}
          onClick={()=>{setError('');beginLease();}}>Thử lại</button>}
    </div>}
  </div>;
}
