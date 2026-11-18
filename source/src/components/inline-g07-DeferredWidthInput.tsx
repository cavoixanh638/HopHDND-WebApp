import {useEffect,useRef,useState} from 'react';

/** Drop-in alternative for the existing DeferredWidthInput (owned by another stream).
 * The host may opt in without changing the existing writer/permission logic.
 * No callback occurs while typing, including when an external preview rerenders.
 */
export function parseInlineG07Width(raw:string,min:number,max:number):number|null{
  const text=raw.trim();
  if(!/^\d+$/.test(text))return null;
  const number=Number(text);
  return Number.isSafeInteger(number)&&number>=min&&number<=max?number:null;
}
export function InlineG07DeferredWidthInput({value,min,max,label,onCommit,id}:{
  value:number;min:number;max:number;label:string;id?:string;onCommit:(next:number)=>void;
}){
  const [draft,setDraft]=useState(String(value));
  const [error,setError]=useState('');
  const editing=useRef(false);
  const skippedBlur=useRef(false);
  const lastSubmitted=useRef<number|null>(null);
  const latest=useRef(value);
  latest.current=value;
  useEffect(()=>{
    if(!editing.current){
      setDraft(String(value));setError('');lastSubmitted.current=null;
    }
  },[value]);

  const save=(text:string)=>{
    const parsed=parseInlineG07Width(text,min,max);
    if(parsed===null){
      setError(`Nhập số nguyên từ ${min} đến ${max} px. Chưa thay đổi độ rộng.`);
      return;
    }
    setError('');
    setDraft(String(parsed));
    if(parsed!==latest.current&&parsed!==lastSubmitted.current){
      lastSubmitted.current=parsed;
      onCommit(parsed);
    }
  };
  return <span className="deferred-width-field inline-g07-deferred-width">
    <input id={id} type="number" inputMode="numeric" min={min} max={max} step={1}
      aria-label={label} aria-invalid={!!error} aria-describedby={error&&id?id+'-error':undefined}
      value={draft} onFocus={()=>{editing.current=true;skippedBlur.current=false;}}
      onChange={event=>{setDraft(event.currentTarget.value);setError('');lastSubmitted.current=null;}}
      onBlur={event=>{
        editing.current=false;
        if(skippedBlur.current){skippedBlur.current=false;return;}
        save(event.currentTarget.value);
      }}
      onKeyDown={event=>{
        if(event.key==='Enter'){
          event.preventDefault();
          save(event.currentTarget.value);
          event.currentTarget.blur();
        }else if(event.key==='Escape'){
          event.preventDefault();
          skippedBlur.current=true;
          setDraft(String(latest.current));
          setError('');
          event.currentTarget.blur();
        }
      }}/>
    {error&&<span id={id?id+'-error':undefined} className="deferred-width-error" role="alert">{error}</span>}
  </span>;
}
