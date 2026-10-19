import {useMemo,useState,type ReactNode} from 'react';
import type {Changes,Item,TextField} from '../../../shared/types';
import {TEXT_FIELDS,STATUS_OPTIONS} from '../../../shared/field-definitions';
import type {CatalogConfig,CatalogKey} from '../../data/catalogs';
import {EXCEL_SOURCE_COLUMNS} from '../../data/item-preferences';
import {loadDetailGridPreferences,saveDetailGridPreferences,defaultDetailGridPreferences,
  type DetailGridPreferences,type DetailColumnKey} from '../../data/report-detail-preferences';
import {normalizeSearch} from '../../domain/search';
import {sortItems,type ColumnSort} from '../../domain/sort-items';
import {displayId} from '../../domain/display-id';
import {Modal} from '../../components/Modal';

type Props={
  title:string; selectedIds:string[];items:Item[];sourceKey:string;
  catalog:CatalogConfig;
  allowDraft:boolean;
  canEditCell:(id:string,field:TextField)=>boolean;
  onUpdate:(id:string,changes:Changes)=>void;
  onKeepDraft:()=>boolean;
  dirtyIds:Set<string>;
  errors:Record<string,string>;
  onClose:()=>void;
};

function DetailTextEditor({value,label,large,required,onApply}:{
  value:string;label:string;large:boolean;required:boolean;onApply:(value:string)=>void
}){
  const [draft,setDraft]=useState(value);
  const [error,setError]=useState('');
  const apply=()=>{
    const next=draft.trim();
    if(required&&!next){setError('Nội dung không được để trống.');return;}
    if(next!==value)onApply(next);
    setError('');
  };
  return <div className="detail-inline-editor">
    {large?<textarea aria-label={label} rows={2} maxLength={20000} value={draft}
      onChange={event=>setDraft(event.target.value)} onBlur={apply}
      onKeyDown={event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();apply();}}}/>
    :<input aria-label={label} maxLength={20000} value={draft}
      onChange={event=>setDraft(event.target.value)} onBlur={apply}
      onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();apply();}}}/>}
    {error&&<small className="error-text" role="alert">{error}</small>}
  </div>;
}

export function ReportDetailGrid({title,selectedIds,items,sourceKey,catalog,allowDraft,canEditCell,
  onUpdate,onKeepDraft,dirtyIds,errors,onClose}:Props){
  // One dialog per click; settings persist separately from both list/report layouts.
  const [applied,setApplied]=useState<DetailGridPreferences>(()=>loadDetailGridPreferences(sourceKey));
  const [pending,setPending]=useState<DetailGridPreferences>(applied);
  const [settings,setSettings]=useState(false);
  const [notice,setNotice]=useState('');
  const [editing,setEditing]=useState(false);
  const [query,setQuery]=useState('');
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [sort,setSort]=useState<ColumnSort>(null);
  const labelByKey=useMemo(()=>new Map<string,string>(EXCEL_SOURCE_COLUMNS.map(c=>[c.key,c.label])),[]);
  const ids=useMemo(()=>new Set(selectedIds),[selectedIds]);
  const subset=useMemo(()=>items.filter(item=>ids.has(item.recordId)),[items,ids]);
  const shownColumns=useMemo(()=>applied.columns.filter(c=>c.visible),[applied]);
  const visible=useMemo(()=>{
    const q=normalizeSearch(query);
    return sortItems(subset.filter(item=>{
      if(q&&!EXCEL_SOURCE_COLUMNS.some(col=>normalizeSearch(String(item[col.key]??'')).includes(q)))return false;
      return Object.entries(filters).every(([key,value])=>!value.trim()||
        normalizeSearch(String(item[key as keyof Item]??'')).includes(normalizeSearch(value)));
    }),sort);
  },[subset,query,filters,sort]);
  const editableFields=new Set<string>(TEXT_FIELDS.map(f=>f.key));
  const editable=allowDraft&&subset.some(item=>TEXT_FIELDS.some(field=>canEditCell(item.recordId,field.key)));
  const move=(index:number,offset:number)=>{
    const next=index+offset;
    if(next<0||next>=pending.columns.length)return;
    setPending(previous=>{
      const columns=[...previous.columns];
      [columns[index],columns[next]]=[columns[next],columns[index]];
      return {...previous,columns};
    });
  };
  const patch=(key:DetailColumnKey,changes:Partial<{visible:boolean;width:number}>)=>{
    setPending(previous=>({...previous,columns:previous.columns.map(c=>c.key===key?{...c,...changes}:c)}));
  };
  const saveSettings=()=>{
    if(!pending.columns.some(c=>c.visible)){setNotice('Cần giữ ít nhất một cột được hiển thị.');return;}
    if(!saveDetailGridPreferences(sourceKey,pending)){setNotice('Chưa lưu được cấu hình cột trên trình duyệt.');return;}
    setApplied(pending);setSettings(false);
    setNotice('Đã lưu cấu hình cột riêng của bảng chi tiết trên trình duyệt này. Không thay đổi Danh sách nội dung hoặc dữ liệu nguồn.');
  };
  const options=(field:TextField,current:string)=>{
    const optionsFromCatalog=(catalog.options as Partial<Record<TextField,string[]>>)[field]??[];
    const standard=(STATUS_OPTIONS as Partial<Record<TextField,string[]>>)[field]??[];
    return [...new Set(['',...optionsFromCatalog,...standard,current])];
  };
  const cell=(item:Item,key:DetailColumnKey):ReactNode=>{
    const raw=String(item[key]??'');
    if(key==='displayCode')return <strong className="code">{displayId(item)}</strong>;
    if(!editing||!editableFields.has(key)||!canEditCell(item.recordId,key as TextField))return raw||'—';
    const field=key as TextField;
    if(field==='content'||field==='note')
      return <DetailTextEditor key={item.recordId+':'+field} value={raw}
        label={labelByKey.get(key)+' · '+displayId(item)} large required={field==='content'}
        onApply={value=>onUpdate(item.recordId,{[field]:value})}/>;
    return <select className="report-detail-select" aria-label={labelByKey.get(key)+' · '+displayId(item)}
      value={raw} onChange={event=>onUpdate(item.recordId,{[field]:event.target.value})}>
      {options(field,raw).map(value=><option key={value} value={value}>{value||'—'}</option>)}
    </select>;
  };
  const inGroupDirty=subset.filter(item=>dirtyIds.has(item.recordId)).length;
  return <Modal title={title} onClose={onClose} className="report-detail-modal report-grid-modal">
    <div className="report-grid-toolbar">
      <div className="report-grid-summary">
        <strong>{selectedIds.length} nội dung trong ô báo cáo</strong>
        <span className="muted">Đang hiển thị {visible.length} nội dung · {shownColumns.length}/15 cột nguồn</span>
        {inGroupDirty>0&&<span className="report-grid-draft">Có {inGroupDirty} nội dung đang sửa nháp</span>}
      </div>
      <label className="report-grid-search">Tìm trong nội dung của ô
        <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
          placeholder="Tìm mã, nội dung, tiến độ, sở…"/>
      </label>
      <div className="report-grid-actions">
        <button type="button" className="button ghost" aria-expanded={settings}
          onClick={()=>{setSettings(v=>!v);setPending(applied);setNotice('');}}>
          Cấu hình cột riêng
        </button>
        <button type="button" className="button ghost" aria-pressed={editing} disabled={!editable}
          title={!editable?'Chưa có quyền sửa nháp với những hồ sơ thuộc ô này':undefined}
          onClick={()=>setEditing(v=>!v)}>{editing?'Kết thúc sửa nháp':'Chỉnh sửa nháp'}</button>
      </div>
    </div>
    {settings&&<section className="report-grid-settings" aria-label="Tùy chỉnh cột bảng chi tiết">
      <div className="report-grid-settings-intro">
        <strong>Cột của bảng chi tiết (độc lập)</strong>
        <p>Chọn hiện/ẩn, đổi thứ tự và độ rộng. Chỉ lưu ở trình duyệt này theo nguồn dữ liệu; không thay đổi bảng Danh sách nội dung hoặc các bảng báo cáo.</p>
      </div>
      <div className="report-grid-settings-list">
        {pending.columns.map((c,index)=><div className="report-grid-settings-row" key={c.key}>
          <label><input type="checkbox" checked={c.visible}
            onChange={event=>patch(c.key,{visible:event.target.checked})}/> {labelByKey.get(c.key)}</label>
          <div className="report-grid-settings-buttons">
            <button type="button" className="button ghost" aria-label={'Đưa cột '+labelByKey.get(c.key)+' lên'} disabled={index===0} onClick={()=>move(index,-1)}>↑</button>
            <button type="button" className="button ghost" aria-label={'Đưa cột '+labelByKey.get(c.key)+' xuống'} disabled={index===pending.columns.length-1} onClick={()=>move(index,1)}>↓</button>
            <label>Rộng <input type="number" min={70} max={800} step={10} aria-label={'Độ rộng '+labelByKey.get(c.key)}
              value={c.width} onChange={event=>{const value=Number(event.target.value);if(Number.isInteger(value)&&value>=70&&value<=800)patch(c.key,{width:value});}}/> px</label>
          </div>
        </div>)}
      </div>
      <div className="report-grid-settings-footer">
        <button type="button" className="button ghost" onClick={()=>{setPending(defaultDetailGridPreferences());setNotice('');}}>Khôi phục mặc định</button>
        <button type="button" className="button ghost" onClick={()=>setSettings(false)}>Đóng tùy chỉnh</button>
        <button type="button" className="button primary" onClick={saveSettings} disabled={!pending.columns.some(c=>c.visible)}>Lưu cấu hình cột</button>
      </div>
    </section>}
    <div className="report-grid-notices">
      <p className="muted">{editing?'Thay đổi sử dụng bản nháp chung với Danh sách nội dung. Chỉnh sửa một ô không ghi Excel/Firebase.':'Bảng hiển thị từ cùng dữ liệu nguồn với Danh sách nội dung; bộ lọc chỉ áp dụng trong cửa sổ.'} Cấu hình cột được lưu riêng.</p>
      {!editable&&<p className="muted">Chế độ xem: không có quyền sửa nháp đối với các nội dung đang chọn.</p>}
      {notice&&<p className="notice" role="status">{notice}</p>}
    </div>
    <div className="report-grid-scroll" role="region" tabIndex={0} aria-label="Bảng chi tiết các nội dung trong ô báo cáo">
      <table className="data-table report-detail-grid">
        <colgroup>{shownColumns.map(c=><col key={c.key} style={{width:c.width+'px'}}/>)}</colgroup>
        <thead>
          <tr>{shownColumns.map(c=><th key={c.key} scope="col">
            <button type="button" className="report-grid-sort" onClick={()=>setSort(v=>v?.key!==c.key?{key:c.key,direction:'asc'}:v.direction==='asc'?{key:c.key,direction:'desc'}:null)}>
              {labelByKey.get(c.key)} <small aria-hidden="true">{sort?.key===c.key?(sort.direction==='asc'?'↑':'↓'):'↕'}</small>
            </button></th>)}</tr>
          <tr className="report-grid-filter-row">{shownColumns.map(c=><th key={c.key}>
            <input type="search" aria-label={'Lọc cột '+labelByKey.get(c.key)} placeholder="Lọc cột"
              value={filters[c.key]??''} onChange={event=>setFilters(v=>({...v,[c.key]:event.target.value}))}/>
          </th>)}</tr>
        </thead>
        <tbody>
          {visible.map(item=><tr key={item.recordId} className={dirtyIds.has(item.recordId)?'report-grid-row-dirty':''}>
            {shownColumns.map(c=><td key={c.key}>{cell(item,c.key)}{errors[item.recordId]&&c.key==='content'&&<small role="alert" className="error-text">{errors[item.recordId]}</small>}</td>)}
          </tr>)}
          {!visible.length&&<tr><td colSpan={shownColumns.length} className="empty">Không có nội dung phù hợp với bộ lọc.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="modal-footer report-grid-footer">
      <span className="muted">Nháp ở đây và tại Danh sách nội dung dùng chung. Báo cáo chỉ tính theo dữ liệu nguồn đã xác nhận.</span>
      <button type="button" className="button ghost" onClick={onClose}>Đóng</button>
      {inGroupDirty>0&&<button type="button" className="button primary" onClick={()=>{
        setNotice(onKeepDraft()?'Đã giữ nháp trên trình duyệt, chưa ghi Excel/Firebase.':'Chưa lưu được nháp trên trình duyệt. Không đóng trang để tránh mất thay đổi.');
      }}>Giữ nháp trên máy</button>}
    </div>
  </Modal>;
}
