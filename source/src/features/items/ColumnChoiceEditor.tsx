import {useState} from 'react';

type Props={
  label:string;
  options:string[];
  usedValues?:readonly string[];
  onChange:(next:string[],previous?:string,replacement?:string)=>void;
};

/** One inline editor for both Excel source catalogs and independently created fields. */
export function ColumnChoiceEditor({label,options,usedValues=[],onChange}:Props){
  const [newValue,setNewValue]=useState('');
  const [renaming,setRenaming]=useState<string|null>(null);
  const [renameValue,setRenameValue]=useState('');
  const [error,setError]=useState('');
  const normalize=(value:string)=>value.trim().toLocaleLowerCase('vi');
  const check=(value:string,exclude?:string)=>{
    const trimmed=value.trim();
    if(!trimmed)return 'Giá trị không được để trống.';
    if(trimmed.length>100)return 'Giá trị không được dài quá 100 ký tự.';
    if(options.some(entry=>entry!==exclude&&normalize(entry)===normalize(trimmed)))
      return 'Giá trị đã tồn tại.';
    if(exclude===undefined&&options.length>=50)return 'Tối đa 50 lựa chọn cho mỗi cột.';
    return '';
  };
  const add=()=>{
    const issue=check(newValue);
    if(issue){setError(issue);return;}
    onChange([...options,newValue.trim()]);
    setNewValue('');setError('');
  };
  const rename=(previous:string)=>{
    if(usedValues.includes(previous)){
      setError('Giá trị này đang được dùng trong dữ liệu nguồn. Không đổi tên trực tiếp để tránh làm sai dữ liệu hiện có.');
      return;
    }
    const issue=check(renameValue,previous);
    if(issue){setError(issue);return;}
    const value=renameValue.trim();
    onChange(options.map(entry=>entry===previous?value:entry),previous,value);
    setRenaming(null);setError('');
  };
  const remove=(value:string)=>{
    if(usedValues.includes(value)){
      setError('Giá trị đang được sử dụng; chưa thể xóa để tránh mất lựa chọn của dữ liệu nguồn.');
      return;
    }
    onChange(options.filter(entry=>entry!==value),value);
    setError('');
  };
  const move=(index:number,offset:-1|1)=>{
    const to=index+offset;
    if(to<0||to>=options.length)return;
    const copy=[...options];
    [copy[index],copy[to]]=[copy[to],copy[index]];
    onChange(copy);setError('');
  };
  return <section className="column-choice-editor" aria-label={'Giá trị chọn của '+label}>
    <div className="column-choice-heading">
      <strong>Danh sách lựa chọn · {options.length} giá trị</strong>
      <span className="muted">Thêm, đổi tên, xóa và sắp xếp ngay tại đây. Giá trị đang dùng không bị tự sửa trong Excel.</span>
    </div>
    <div className="column-choice-add">
      <input value={newValue} maxLength={100} aria-label={'Thêm lựa chọn cho '+label}
        placeholder="Nhập giá trị lựa chọn mới" onChange={e=>setNewValue(e.currentTarget.value)}
        onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();add();}}}/>
      <button type="button" className="button ghost" onClick={add}>+ Thêm</button>
    </div>
    {error&&<p className="error-text" role="alert">{error}</p>}
    <ol className="column-choice-values">
      {options.map((value,index)=><li key={value}>
        {renaming===value?<><input autoFocus value={renameValue} maxLength={100}
          aria-label={'Tên mới cho '+value} onChange={e=>setRenameValue(e.currentTarget.value)}
          onKeyDown={e=>{if(e.key==='Enter')rename(value);if(e.key==='Escape'){setRenaming(null);setError('');}}}/>
          <button type="button" className="button ghost" onClick={()=>rename(value)}>Lưu tên</button>
          <button type="button" className="button ghost" onClick={()=>{setRenaming(null);setError('');}}>Hủy</button>
        </>:<>
          <span className="column-choice-value">{value}{usedValues.includes(value)&&<small className="muted"> · Đang dùng</small>}</span>
          <button type="button" className="button ghost" disabled={index===0} onClick={()=>move(index,-1)} aria-label={'Đưa '+value+' lên'}>↑</button>
          <button type="button" className="button ghost" disabled={index===options.length-1} onClick={()=>move(index,1)} aria-label={'Đưa '+value+' xuống'}>↓</button>
          <button type="button" className="button ghost" onClick={()=>{setRenaming(value);setRenameValue(value);setError('');}}>Đổi tên</button>
          <button type="button" className="button danger" onClick={()=>remove(value)}>Xóa</button>
        </>}
      </li>)}
    </ol>
  </section>;
}
