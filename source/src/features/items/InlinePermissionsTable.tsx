import {useEffect, useMemo, useRef, useState} from 'react';
import type {EditableField, Item} from '../../../shared/types';
import {samePermissions,type CellPermissions} from '../../data/firebase-repository';
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
const hasDiff=(a:CellPermissions,b:CellPermissions)=>!samePermissions(a,b);
const labelFor=(item:Item,key:EditableField):string=>{
  const value=item[key];
  return typeof value==='boolean'?(value?'Đã rút':'Đang trình'):String(value??'').slice(0,90)||'—';
};

/** Inline table mode: all permission changes remain drafts until the admin saves with Firebase CAS. */
export function InlinePermissionsTable({items,columns,permissions,onSave,onBack,onDirtyChange,switchRequest=0,disabled=false}:{
  items:Item[];
  columns:ReadonlyArray<PermissionColumn>;
  permissions:CellPermissions;
  onSave:(next:CellPermissions,baseline:CellPermissions)=>Promise<void>;
  onBack:()=>void;
  onDirtyChange?:(dirty:boolean)=>void;
  switchRequest?:number;
  disabled?:boolean;
}){
  const baseline=useRef(clone(permissions));
  const [draft,setDraft]=useState<CellPermissions>(()=>clone(permissions));
  const [saving,setSaving]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [acknowledgeRows,setAcknowledgeRows]=useState(false);
  const [confirmSwitch,setConfirmSwitch]=useState(false);
  const handledSwitch=useRef(switchRequest);
  const locked=disabled||saving;
  const dirty=hasDiff(draft,baseline.current);
  useEffect(()=>{onDirtyChange?.(dirty);},[dirty,onDirtyChange]);
  const rowScopeChanged=!samePermissions(
    {columns:{},rows:draft.rows,cells:draft.cells},
    {columns:{},rows:baseline.current.rows,cells:baseline.current.cells});
  const cols=useMemo(()=>columns.filter(c=>editable.has(c.key as EditableField)),[columns]);
  const effective=(id:string,key:EditableField)=>(draft.cells?.[id]?.[key]??draft.rows?.[id]??draft.columns[key])===true;
  const totalVisibleCells=items.length*cols.length;
  const allowedVisibleCells=items.reduce((count,item)=>count+cols.filter(column=>effective(item.recordId,column.key as EditableField)).length,0);
  const overrideCount=Object.values(draft.cells??{}).reduce((count,row)=>count+Object.keys(row).length,0);


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
  const save=async(switchAfter=false)=>{
    if(locked||!dirty||(rowScopeChanged&&!acknowledgeRows))return;
    setError('');setNotice('');setSaving(true);
    try{
      await onSave(clone(draft),clone(baseline.current));
      baseline.current=clone(draft);
      setAcknowledgeRows(false);
      setNotice('Đã lưu quyền vào Firebase. Thao tác sửa nghiệp vụ vẫn chỉ tạo nháp trên trình duyệt.');
      setConfirmSwitch(false);
      if(switchAfter)onBack();
    }catch(cause){setError((cause instanceof Error?cause.message:'Không lưu được quyền.')+' Nếu quyền không khớp, hãy Đọc lại dữ liệu và đối chiếu; bản nháp chưa bị xóa.');}
    finally{setSaving(false);}
  };
  const back=()=>{if(dirty){setConfirmSwitch(true);return;}setConfirmSwitch(false);onBack();};
  useEffect(()=>{
    if(switchRequest===handledSwitch.current)return;
    handledSwitch.current=switchRequest;
    back();
  },[switchRequest]);
  const revert=()=>{setDraft(clone(baseline.current));setAcknowledgeRows(false);setNotice('Đã bỏ phần quyền chưa lưu.');setError('');};
  return <section aria-label="Phân quyền ngay trên danh sách" className="inline-permissions">
    <div className="permission-panel-header">
      <div>
        <h3>Thiết lập quyền chỉnh sửa</h3>
        <p className="muted">Chọn quyền chung trên tiêu đề cột, hoặc đặt quyền riêng tại từng dòng / ô. Mọi thay đổi được xem trước trước khi lưu.</p>
      </div>
      <div className="permission-stats" aria-label="Tổng quan quyền trên trang hiện tại">
        <span><strong>{allowedVisibleCells}</strong> ô được sửa</span>
        <span><strong>{totalVisibleCells-allowedVisibleCells}</strong> ô chỉ xem</span>
        <span><strong>{overrideCount}</strong> ô có quyền riêng</span>
      </div>
    </div>
    <div className="permission-explainer" role="note">
      <strong>Cách áp dụng:</strong> Quyền riêng của ô được ưu tiên; nếu chưa đặt quyền ô, hệ thống xét quyền dòng rồi đến quyền cột.
      <details><summary>Xem ví dụ</summary><p>Khi cột “Nội dung” được cho sửa nhưng dòng NQ01 đặt “Không cho sửa dòng”, ô Nội dung của NQ01 sẽ chỉ xem. Bạn vẫn có thể chọn “Cho phép sửa” riêng cho ô này.</p></details>
    </div>
    <div className="permission-risk" role="note"><strong>Lưu ý:</strong> Quyền theo dòng hoặc ô đang phụ thuộc vị trí hàng Excel. Nếu chèn hoặc sắp xếp hàng, nên kiểm tra lại quyền; ưu tiên quyền cột trong thời gian chưa có ID ổn định.</div>
    {error&&<p role="alert" className="error-text">{error}</p>}{notice&&<p role="status" className="notice">{notice}</p>}

    {confirmSwitch&&<div className="permission-switch-confirm" role="alertdialog" aria-label="Có quyền chỉnh sửa chưa lưu">
      <strong>Quyền chỉnh sửa chưa được lưu.</strong>
      <span>Chọn lưu quyền hoặc bỏ thay đổi trước khi chuyển sang Giao diện bảng. Không tự động ghi đè quyền.</span>
      <div className="top-actions">
        <button type="button" className="button ghost" onClick={()=>setConfirmSwitch(false)}>Tiếp tục chỉnh quyền</button>
        <button type="button" className="button ghost" disabled={locked} onClick={()=>{revert();setConfirmSwitch(false);onBack();}}>Bỏ quyền chưa lưu và chuyển</button>
        <button type="button" className="button primary" disabled={locked||(rowScopeChanged&&!acknowledgeRows)} onClick={()=>void save(true)}>Lưu quyền và chuyển</button>
      </div>
    </div>}
    {rowScopeChanged&&<label className="permission-risk-confirm"><input type="checkbox" aria-label="Xác nhận rủi ro quyền theo dòng/ô" checked={acknowledgeRows} disabled={locked} onChange={e=>setAcknowledgeRows(e.currentTarget.checked)}/>
      Tôi đã kiểm tra và hiểu quyền dòng/ô có thể thay đổi đối tượng khi Excel chèn hoặc sắp xếp hàng.</label>}
    <div className="permission-action-bar">
      <span className="permission-save-status" role="status">{dirty?'Có thay đổi quyền chưa lưu':'Quyền đang hiển thị đã được lưu'}</span>
      <div className="top-actions">
        <button type="button" className="button ghost" disabled={locked} onClick={back}>Về giao diện bảng</button>
        <button type="button" className="button ghost" disabled={locked||!dirty} onClick={revert}>Bỏ quyền chưa lưu</button>
        <button type="button" className="button primary" disabled={locked||!dirty||(rowScopeChanged&&!acknowledgeRows)} onClick={()=>void save()}>{saving?'Đang lưu quyền…':'Lưu quyền chỉnh sửa'}</button>
      </div>
    </div>
    <div className="table-wrap permission-table-scroll" tabIndex={0} aria-label="Bảng phân quyền có thể cuộn ngang"><table className="data-table inline-permission-table">
      <thead><tr><th scope="col">Nội dung / Quyền dòng</th>{cols.map(c=>{
        const key=c.key as EditableField;return <th scope="col" key={key}><span className="permission-header-title">{c.label}</span>
        <label className="permission-column-rule"><input type="checkbox" checked={draft.columns[key]===true} disabled={locked} onChange={event=>setColumn(key,event.currentTarget.checked)}/>Cho phép sửa cả cột</label></th>;
      })}</tr></thead>
      <tbody>{items.map(item=><tr key={item.recordId}><th scope="row" className="permission-row-head"><strong className="code">{displayId(item)}</strong>
        <select aria-label={`Quyền dòng ${displayId(item)}`} disabled={locked} value={draft.rows?.[item.recordId]===undefined?'inherit':draft.rows[item.recordId]?'allow':'deny'} onChange={event=>setRow(item.recordId,event.target.value as Rule)}>
          <option value="inherit">Theo quyền cột</option><option value="allow">Cho phép sửa cả dòng</option><option value="deny">Không cho sửa dòng</option>
        </select></th>
      {cols.map(c=>{const key=c.key as EditableField;const allowed=effective(item.recordId,key);const specific=valueFor(item.recordId,key)!=='inherit';
        return <td key={key} className={allowed?'permission-effective-allow':'permission-effective-deny'}>
          <div className="permission-cell-header"><span className="permission-effective-label">{allowed?'Được sửa':'Chỉ xem'}</span>{specific&&<span className="permission-specific-label" title="Đang có quy định riêng cho ô này">Riêng</span>}</div>
          <select aria-label={`Quyền ô ${displayId(item)} – ${c.label}`}
            disabled={locked} value={valueFor(item.recordId,key)}
            onChange={event=>setCell(item.recordId,key,event.target.value as Rule)}>
            <option value="inherit">Theo quyền dòng/cột</option><option value="allow">Cho phép sửa</option><option value="deny">Không cho sửa</option>
          </select><small className="permission-cell-preview" title={labelFor(item,key)}>{labelFor(item,key)}</small>
        </td>;})}
      </tr>)}{!items.length&&<tr><td colSpan={Math.max(1,cols.length+1)} className="empty">Chưa có nội dung trong bộ lọc này. Bạn vẫn có thể cấp quyền cho cả cột ở phía trên.</td></tr>}</tbody>
    </table></div>
  </section>;
}
