import {useMemo,useState} from 'react';
import {normalizeSearch} from '../../domain/search';
import type {G05ChoiceAction} from './inline-g05-catalog-logic';
import {g05Identity} from './inline-g05-catalog-logic';
import './inline-g05-choice-editor.css';

export type G05ChoiceEditorProps={
  label:string;options:readonly string[];usedValues?:readonly string[];
  locked?:boolean; onApply:(action:G05ChoiceAction)=>void;
};
/** Self-contained mini-editor: draft keystrokes never reach the persistence callback. */
export function G05ChoiceEditor({label,options,usedValues=[],locked=false,onApply}:G05ChoiceEditorProps){
  const [query,setQuery]=useState('');
  const [addValue,setAddValue]=useState('');
  const [editing,setEditing]=useState<string|null>(null);
  const [renameValue,setRenameValue]=useState('');
  const [error,setError]=useState('');
  const usage=useMemo(()=>{
    const counts=new Map<string,number>();
    for(const value of usedValues){const key=g05Identity(value);counts.set(key,(counts.get(key)??0)+1);}
    return counts;
  },[usedValues]);
  const count=(value:string)=>usage.get(g05Identity(value))??0;
  const visible=options.filter(value=>normalizeSearch(value).includes(normalizeSearch(query)));
  const apply=(action:G05ChoiceAction)=>{
    try{
      onApply(action);
      setError('');
      if(action.type==='add')setAddValue('');
      if(action.type==='rename')setEditing(null);
    }catch(error){setError(error instanceof Error?error.message:'Không thực hiện được thay đổi.');}
  };
  return <section className="inline-g05-editor" aria-label={'Quản lý lựa chọn '+label}>
    <div className="inline-g05-top">
      <strong>{label} · {options.length} lựa chọn</strong>
      <span className="muted">Các mục đang sử dụng được giữ nguyên; chỉ lưu cấu hình khi chọn Lưu.</span>
    </div>
    <div className="inline-g05-sticky">
      <label className="field">Tìm không dấu<input type="search" aria-label={'Tìm lựa chọn '+label} value={query}
        onChange={e=>setQuery(e.currentTarget.value)} placeholder="Tìm lựa chọn..."/></label>
      {!locked&&<div className="inline-g05-add">
        <input value={addValue} maxLength={200} aria-label={'Thêm lựa chọn '+label}
          placeholder="Tên lựa chọn mới" onChange={e=>setAddValue(e.currentTarget.value)}
          onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply({type:'add',value:addValue});}}}/>
        <button type="button" className="button ghost" onClick={()=>apply({type:'add',value:addValue})}>+ Thêm</button>
      </div>}
    </div>
    {locked&&<p className="muted" role="status">Danh sách trạng thái chuẩn đã khóa; chỉ được tra cứu, không được thêm, đổi tên hoặc xóa.</p>}
    {error&&<p role="alert" className="error-text">{error}</p>}
    <ol className="inline-g05-values">
      {visible.map(value=>{
        const index=options.indexOf(value),used=count(value),isEditing=editing===value;
        return <li key={value} className="inline-g05-entry">
          {isEditing?<div className="inline-g05-rename">
            <input autoFocus aria-label={'Tên mới cho '+value} maxLength={200} value={renameValue}
              onChange={e=>setRenameValue(e.currentTarget.value)}
              onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();apply({type:'rename',previous:value,value:renameValue});}else if(e.key==='Escape'){setEditing(null);setError('');}}}/>
            <button type="button" className="button primary" onClick={()=>apply({type:'rename',previous:value,value:renameValue})}>Lưu tên</button>
            <button type="button" className="button ghost" onClick={()=>setEditing(null)}>Hủy</button>
          </div>:<>
            <span className="inline-g05-name">{value} <small className="muted">({used} nội dung)</small></span>
            {!locked&&<div className="inline-g05-actions">
              <button type="button" className="button ghost" disabled={index===0} aria-label={'Đưa '+value+' lên'} onClick={()=>apply({type:'move',value,to:index-1})}>↑</button>
              <button type="button" className="button ghost" disabled={index===options.length-1} aria-label={'Đưa '+value+' xuống'} onClick={()=>apply({type:'move',value,to:index+1})}>↓</button>
              <button type="button" className="button ghost" disabled={used>0} onClick={()=>{setEditing(value);setRenameValue(value);setError('');}}>Đổi tên</button>
              <button type="button" className="button danger" disabled={used>0} onClick={()=>apply({type:'remove',value})}>Xóa</button>
            </div>}
          </>}
        </li>;
      })}
      {visible.length===0&&<li className="muted">Không có giá trị khớp tìm kiếm.</li>}
    </ol>
  </section>;
}
