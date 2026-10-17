import {useEffect,useState} from 'react';

export function parseCommittedWidth(raw:string,min:number,max:number):number|null {
  const text=raw.trim();
  if(!/^[0-9]+$/.test(text))return null;
  const parsed=Number(text);
  return Number.isSafeInteger(parsed)&&parsed>=min&&parsed<=max?parsed:null;
}

/** An input edit is local until the user presses Enter or leaves the field.
 * Clearing/retyping never writes zero into the live layout or its autosave checkpoint.
 */
export function DeferredWidthInput({value,min,max,label,onCommit,id}:{
  value:number;min:number;max:number;label:string;id?:string;onCommit:(next:number)=>void;
}){
  const [draft,setDraft]=useState(String(value));
  const [issue,setIssue]=useState('');
  useEffect(()=>{setDraft(String(value));setIssue('');},[value]);
  const commit=(raw:string)=>{
    const next=parseCommittedWidth(raw,min,max);
    if(next===null){
      setDraft(String(value));
      setIssue(`Nhập số nguyên từ ${min} đến ${max} px. Độ rộng cũ được giữ nguyên.`);
      return;
    }
    setIssue('');
    setDraft(String(next));
    if(next!==value)onCommit(next);
  };
  return <span className="deferred-width-field">
    <input id={id} type="number" inputMode="numeric" min={min} max={max} step={1}
      aria-label={label} aria-invalid={!!issue}
      value={draft}
      onChange={event=>{setDraft(event.currentTarget.value);setIssue('');}}
      onBlur={event=>commit(event.currentTarget.value)}
      onKeyDown={event=>{
        if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}
        if(event.key==='Escape'){event.preventDefault();setDraft(String(value));setIssue('');event.currentTarget.blur();}
      }}/>
    {issue&&<span className="deferred-width-error" role="alert">{issue}</span>}
  </span>;
}
