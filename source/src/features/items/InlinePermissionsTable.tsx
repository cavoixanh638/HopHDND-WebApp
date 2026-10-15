import {useEffect, useMemo, useRef, useState} from 'react';
import type {EditableField, Item} from '../../../shared/types';
import type {CellPermissions} from '../../data/firebase-repository';
import {TEXT_FIELDS} from '../../../shared/field-definitions';
import {displayId} from '../../domain/display-id';

type PermissionColumn = {key:string;label:string};
type Rule = 'inherit' | 'allow' | 'deny';
const editable = new Set<EditableField>([...TEXT_FIELDS.map(field=>field.key), 'isDropped', 'documentKind']);
const clone = (p:CellPermissions):CellPermissions=>({
  columns:{...p.columns},
  rows:{...(p.rows??{})},
  cells:Object.fromEntries(Object.entries(p.cells??{}).map(([id,fields])=>[id,{...fields}]))
});
const hasDiff=(a:CellPermissions,b:CellPermissions)=>JSON.stringify(a)!==JSON.stringify(b);
const labelFor=(item:Item,key:EditableField):string=>{
  const value=item[key];
  return typeof value==='boolean'?(value?'Đã rút':'Đang trình'):String(value??'').slice(0,90)||'—';
};

/** Inline table mode: all permission changes remain drafts until the admin saves with Firebase CAS. */
export function InlinePermissionsTable({items,columns,permissions,onSave,onBack,disabled=false}:{
  items:Item[];
  columns:ReadonlyArray<PermissionColumn>;
  permissions:CellPermissions;
  onSave:(next:CellPermissions,baseline:CellPermissions)=>Promise<void>;
  onBack:()=>void;
  disabled?:boolean;
}){
  const baseline=useRef(clone(permissions));
  const [draft,setDraft]=useState<CellPermissions>(()=>clone(permissions));
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [acknowledgeRows,setAcknowledgeRows]=useState(false);
  const locked=disabled||saving;
  const dirty=hasDiff(draft,baseline.current);
  const rowScopeChanged=JSON.stringify(draft.rows??{})!==JSON.stringify(baseline.current.rows??{})||
    JSON.stringify(draft.cells??{})!==JSON.stringify(baseline.current.cells??{});
  const cols=useMemo(()=>columns.filter(c=>editable.has(c.key as EditableField)),[columns]);

  useEffect(()=>{
    if(!dirty&&!saving){
      const received=clone(permissions);
      baseline.current=received;
      setDraft(previous=>hasDiff(previous,received)?received:previous);
    }
  },[permissions,dirty,saving]);

  const setColumn=(key:EditableField,allow:boolean)=>setDraft(old=>({...old,columns:{...old.columns,[key]:allow}}));
  const setRow=(id:string,rule:Rule)=>setDraft(old=>{
    const rows={...(old.rows??{})};
    if(rule==='inherit')delete rows[id];else rows[id]=rule==='allow';
    return {...old,rows};
  });
  const setCell=(id:string,key:EditableField,rule:Rule)=>setDraft(old=>{
    const cells={...(old.cells??{})},row={...(cells[id]??{})};
    if(rule==='inherit')delete row[key];else row[key]=rule==='allow';
    if(Object.keys(row).length)cells[id]=row;else delete cells[id];
    return {...old,cells};
  });
  const valueFor=(id:string,key:EditableField):Rule=>{
    const value=draft.cells?.[id]?.[key];
    return value===undefined?'inherit':value?'allow':'deny';
  };
  const save=async()=>{
    if(locked||!dirty||(rowScopeChanged&&!acknowledgeRows))return;
    setError('');setNotice('');setSaving(true);
    try{
      await onSave(clone(draft),clone(baseline.current));
      baseline.current=clone(draft);
      setAcknowledgeRows(false);
      setNotice('Đã lưu quyền vào Firebase. Thao tác sửa nghiệp vụ vẫn chỉ tạo nháp trên trình duyệt.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Không lưu được quyền. Phần sửa vẫn còn.');}
    finally{setSaving(false);}
  };
  const back=()=>{if(dirty){setError('Quyền đang chỉnh chưa được lưu. Hãy Lưu quyền hoặc Bỏ phần quyền đang sửa trước khi về bảng.');return;}onBack();};
  const revert=()=>{setDraft(clone(baseline.current));setAcknowledgeRows(false);setNotice('Đã bỏ phần quyền chưa lưu.');setError('');};
  return <section aria-label="Phân quyền ngay trên danh sách" className="inline-permissions">
    <div className="card-header"><div><h3>Phân quyền chỉnh sửa trực tiếp trên danh sách</h3>
      <p className="muted">Đánh dấu quyền cho cột ở tiêu đề; chọn quyền của từng dòng và từng ô ngay trên bảng. Ô ưu tiên hơn dòng, rồi cột. Các thay đổi chỉ có hiệu lực sau khi Lưu quyền.</p></div></div>
    <p className="notice">Quyền theo dòng/ô hiện dùng mã dòng gắn với vị trí trong Excel. Chèn hoặc sắp xếp hàng có thể khiến quyền áp vào dòng khác; ưu tiên quyền theo cột cho đến khi có ID ổn định.</p>
    {error&&<p role="alert" className="error-text">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}
    <div className="toolbar"><label className="field">Quyền trường loại nội dung (không có cột riêng)
      <select aria-label="Quyền cột loại nội dung" disabled={locked} value={draft.columns.documentKind===true?'allow':'deny'} onChange={event=>setColumn('documentKind',event.target.value==='allow')}>
        <option value="deny">Khóa</option><option value="allow">Cho phép</option>
      </select></label></div>
    <div className="table-wrap"><table className="data-table inline-permission-table">
      <thead><tr><th>Mã nội dung / Quyền dòng</th>{cols.map(c=>{
        const key=c.key as EditableField;return <th key={key}><span>{c.label}</span>
        <label className="permission-column-rule"><input type="checkbox" checked={draft.columns[key]===true} disabled={locked} onChange={event=>setColumn(key,event.currentTarget.checked)}/>Cho phép cột</label></th>;
      })}</tr></thead>
      <tbody>{items.map(item=><tr key={item.recordId}><td><strong className="code">{displayId(item)}</strong><br/>
        <select aria-label={`Quyền dòng ${displayId(item)}`} disabled={locked} value={draft.rows?.[item.recordId]===undefined?'inherit':draft.rows[item.recordId]?'allow':'deny'} onChange={event=>setRow(item.recordId,event.target.value as Rule)}>
          <option value="inherit">Theo quyền cột</option><option value="allow">Cho phép dòng</option><option value="deny">Khóa dòng</option>
        </select></td>
      {cols.map(c=>{const key=c.key as EditableField;return <td key={key}><select
        aria-label={`Quyền ô ${displayId(item)} – ${c.label}`}
        disabled={locked} value={valueFor(item.recordId,key)}
        onChange={event=>setCell(item.recordId,key,event.target.value as Rule)}>
        <option value="inherit">Kế thừa</option><option value="allow">Cho phép ô</option><option value="deny">Khóa ô</option>
      </select><small className="permission-cell-preview">{labelFor(item,key)}</small></td>;})}
      </tr>)}{!items.length&&<tr><td colSpan={Math.max(1,cols.length+1)} className="empty">Chưa có dữ liệu nguồn. Vẫn có thể phân quyền theo cột ở tiêu đề.</td></tr>}</tbody>
    </table></div>
    {rowScopeChanged&&<label className="layout-visibility"><input type="checkbox" aria-label="Xác nhận rủi ro quyền theo dòng/ô" checked={acknowledgeRows} disabled={locked} onChange={e=>setAcknowledgeRows(e.currentTarget.checked)}/>
      Tôi hiểu quyền theo dòng/ô có thể áp nhầm sau khi sắp xếp hoặc chèn dòng trong nguồn Excel.</label>}
    <div className="top-actions"><button type="button" className="button ghost" disabled={locked} onClick={back}>Về bảng Danh sách</button>
      <button type="button" className="button ghost" disabled={locked||!dirty} onClick={revert}>Bỏ quyền chưa lưu</button>
      <button type="button" className="button primary" disabled={locked||!dirty||(rowScopeChanged&&!acknowledgeRows)} onClick={()=>void save()}>{saving?'Đang lưu quyền…':'Lưu quyền chỉnh sửa'}</button></div>
  </section>;
}
