import { useEffect, useMemo, useRef, useState } from 'react';
import type { Changes, Item, Patch, TextField, EditableField } from '../../../shared/types';
import { TEXT_FIELDS, STATUS_OPTIONS } from '../../../shared/field-definitions';
import { createSearchIndex, matchesSearch } from '../../domain/search';
import { ContentEditor } from './ContentEditor';
import { displayId } from '../../domain/display-id';
import { defaultItemLayout, loadItemLayout, saveItemLayout, validateItemLayout } from '../../data/item-preferences';
import { validateItemDraft } from '../../data/item-draft';
import { assignmentIssue, type CatalogConfig, type CatalogKey } from '../../data/catalogs';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';
import { ItemColumnPanel } from './ItemColumnPanel';
import { Modal } from '../../components/Modal';
import { orderValues } from '../../domain/catalog-order';
import type {ItemLayout} from '../../data/item-preferences';
import { ColumnHeader } from './ColumnHeader';
import { CellPicker } from './CellPicker';
import { reorderByKey } from '../../domain/reorder-columns';
import type {CellPermissions} from '../../data/firebase-repository';
import {InlinePermissionsTable} from './InlinePermissionsTable';
import './item-frame.css';
import {ListViewTools} from './ListViewTools';
import {emptyListFilters,loadListViews,loadActiveListView,loadColorRules,saveColorRules,matchesColumnFilters,itemColor,type SavedListView,type ColorRule} from '../../data/list-views';

export function ItemList({ items, drafts, errors, busy, onUpdate, onHistory, readOnly = false, sourceKind, customizing = false, sourceKey, catalog, onClose, onSaveData, onDiscardData, onLayoutSaved,initialLayout,onPersistLayout,canEditDraft=true,layoutSaveLabel='Lưu bố trí',saveDataHint='',onKeepDraft,canEditCell,allowLayout=true,dataSaving=false,sourceLabel,draftOnly=false,permissions,onSavePermissions }: { items: Item[]; drafts: Record<string, Patch>; errors: Record<string, string>; busy: boolean; onUpdate: (id: string, changes: Changes) => void; onHistory: (item: Item) => void; readOnly?: boolean; sourceKind?: 'demo'|'google'|'firebase'; customizing?: boolean; sourceKey:string; catalog:CatalogConfig; onClose:()=>void; onSaveData:()=>Promise<boolean>; onDiscardData:()=>void; onLayoutSaved:(message:string)=>void;initialLayout?:ItemLayout;onPersistLayout?:(layout:ItemLayout)=>Promise<void>;canEditDraft?:boolean;layoutSaveLabel?:string;saveDataHint?:string;onKeepDraft?:()=>boolean;canEditCell?:(id:string,field:EditableField)=>boolean;allowLayout?:boolean;dataSaving?:boolean;sourceLabel?:string;draftOnly?:boolean;permissions?:CellPermissions;onSavePermissions?:(next:CellPermissions,expected:CellPermissions)=>Promise<void> }) {
  const selectedView=loadListViews(sourceKey).find(v=>v.id===loadActiveListView(sourceKey));
  const [columnFilters,setColumnFilters]=useState<Record<string,string>>(selectedView?.filters.columns??{});
  const [colorRules,setColorRules]=useState<ColorRule[]>(selectedView?.colors??loadColorRules(sourceKey));
  const [query, setQuery] = useState(selectedView?.filters.query??'');
  const [kind, setKind] = useState(selectedView?.filters.kind??'all');
  const [lifecycle, setLifecycle] = useState(selectedView?.filters.lifecycle??'active');
  const [leader, setLeader] = useState(selectedView?.filters.leader??'all');
  const [status, setStatus] = useState(selectedView?.filters.status??'all');
  const effectiveSourceKind = sourceKind ?? (readOnly ? 'google' : 'demo');

  const [applied, setApplied] = useState(() => selectedView?.layout??initialLayout??loadItemLayout(sourceKey));
  useEffect(()=>{if(initialLayout&&!customizing&&!loadActiveListView(sourceKey))setApplied(initialLayout);},[initialLayout,customizing]);
  const {draft:layout,setDraft:setLayout,dirty,clearCheckpoint,recoveryMessage,checkpointMessage,unmatchedCheckpoint,restoreOldDraft,discardOldDraft} = useRecoverableDraft(`items:${sourceKey}`,applied,validateItemDraft,undefined,customizing);
  const activeLayout = customizing ? layout : applied;
  const columns = activeLayout.columns.filter(column=>column.visible && (!readOnly || column.key !== 'history'));
  const [confirmExit,setConfirmExit] = useState(false);
  const [layoutError,setLayoutError] = useState('');
  const [allSpecialists,setAllSpecialists] = useState(false);
  const [saving,setSaving] = useState(false);
  const [permissionMode,setPermissionMode] = useState(false);
  const [permissionDirty,setPermissionDirty] = useState(false);
  const locked=busy||saving||!!unmatchedCheckpoint&&customizing;
  const pendingData=Object.keys(drafts).length>0;
  const cannotSaveData=readOnly&&pendingData;
  const blockedSaveLabel=draftOnly?'Chỉ giữ thay đổi thử trên máy':'Chưa thể lưu vào Excel';
  const sourceSaveLabel=effectiveSourceKind==='firebase'?'Lưu vào Firebase':effectiveSourceKind==='google'?'Lưu dữ liệu vào Excel':'Lưu dữ liệu mẫu';
  const saveActionLabel=pendingData?`${sourceSaveLabel}${dirty?' và bố trí':''}`:dirty?'Lưu bố trí và về xem':'Không có thay đổi';
  const savingRef=useRef(false);
  const resizing=useRef<{key:string;x:number;width:number}|null>(null);
  const [page, setPage] = useState(0);
  const [contentItem, setContentItem] = useState<{item:Item;field:"content"|"note"} | null>(null);
  const canEdit = customizing && canEditDraft && !permissionMode;
  useEffect(() => { if (!customizing) { setContentItem(null); } }, [customizing]);
  const latestExit=useRef({dirty,dataDirty:Object.keys(drafts).length>0,onClose,customizing,locked,permissionMode}); latestExit.current={dirty,dataDirty:Object.keys(drafts).length>0,onClose,customizing,locked,permissionMode};
  const exit = () => { if(permissionMode){setLayoutError('Hãy trở về bảng Danh sách từ chế độ phân quyền trước khi thoát.');return;}if(locked||dataSaving)return;if(dirty || Object.keys(drafts).length) setConfirmExit(true); else onClose(); };
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{const current=latestExit.current;if(current.customizing&&!current.locked&&event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')){event.preventDefault();if(current.permissionMode){setLayoutError('Hãy trở về bảng Danh sách từ chế độ phân quyền trước khi thoát.');}else if(current.dirty||current.dataDirty)setConfirmExit(true);else current.onClose();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  const save = async () => {
    if(locked||savingRef.current||permissionMode)return;
    savingRef.current=true;setSaving(true);
    try {
      const layoutToSave=dirty?validateItemLayout(layout):null;
      const issue=items.filter(item=>{const changes=drafts[item.recordId]?.changes;return changes&&('specialist' in changes||'room' in changes);}).map(item=>assignmentIssue(item,catalog)).find(Boolean);
      if(issue) throw new Error(issue);
      if(cannotSaveData)throw new Error('Chưa bật lưu vào file Excel. Giữ thay đổi trên máy hoặc quay lại để lưu riêng bố trí.');
      if(Object.keys(drafts).length && !await onSaveData()) throw new Error('Chưa xác nhận lưu dữ liệu. Phần sửa vẫn được giữ; xem thông báo lỗi phía trên để xử lý.');
      if(layoutToSave){
        if(!allowLayout)throw new Error('Chỉ quản trị được lưu bố trí chung.');
        if(onPersistLayout)await onPersistLayout(layoutToSave);
        else {const persisted=saveItemLayout(sourceKey,layoutToSave);if(!persisted)throw new Error('Không lưu được bố trí. Nháp được giữ.');onLayoutSaved('Đã lưu bố trí danh sách trên trình duyệt.');}
        setApplied(layoutToSave);setLayout(layoutToSave);clearCheckpoint();
      }
      setConfirmExit(false);onClose();
    } catch(cause){setLayoutError(cause instanceof Error?cause.message:'Chưa lưu được bố trí.');}
    finally{savingRef.current=false;setSaving(false);}
  };
  const validateAndSaveLayout=async()=>{if(locked||savingRef.current||!dirty||!allowLayout)return;savingRef.current=true;setSaving(true);try{const valid=validateItemLayout(layout);if(onPersistLayout)await onPersistLayout(valid);else if(!saveItemLayout(sourceKey,valid))throw new Error('Không lưu được bố trí.');setApplied(valid);setLayout(valid);clearCheckpoint();setLayoutError('');}catch(cause){setLayoutError(cause instanceof Error?cause.message:'Không lưu được bố trí.');}finally{savingRef.current=false;setSaving(false);}};
  const index = useMemo(() => createSearchIndex(items), [items]);
  const filtered = useMemo(() => items.filter(item =>
    matchesColumnFilters(item,columnFilters) && matchesSearch(item, query, index) && (kind === 'all' || item.documentKind === kind) &&
    (leader === 'all' || item.vpLeader === leader) && (status === 'all' || item.progressCouncil === status) &&
    (lifecycle === 'all' || (lifecycle === 'archived' ? !!item.archivedAt : !item.archivedAt && (lifecycle === 'active' ? !item.isDropped : item.isDropped)))
  ), [items, query, index, kind, lifecycle, leader, status, columnFilters]);
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const currentPage = Math.min(page, pages - 1);
  const rows = filtered.slice(currentPage * 50, currentPage * 50 + 50);
  const options = (field: TextField,item:Item) => {
    const list=field in catalog.options?catalog.options[field as CatalogKey]:field in STATUS_OPTIONS?STATUS_OPTIONS[field as keyof typeof STATUS_OPTIONS]:[];
    return orderValues([...new Set([...list,item[field]])].filter(Boolean),list).filter(value=>field!=='specialist'||allSpecialists||value===item.specialist||!item.room||catalog.specialistRooms[value]?.includes(item.room));
  };
  const leaders = orderValues([...new Set(items.map(i => i.vpLeader))],catalog.options.vpLeader);
  const statuses = orderValues([...new Set(items.map(i => i.progressCouncil))],catalog.options.progressCouncil);
  const aliasCounts = useMemo(()=>{const counts=new Map<string,number>();items.forEach(item=>counts.set(displayId(item),(counts.get(displayId(item))??0)+1));return counts;},[items]);
  const visualWidth=(value:number)=>Math.min(1600,Math.max(60,Number.isFinite(value)?value:170));
  const tableWidth=Math.max(Math.min(6000,Math.max(600,Number.isFinite(activeLayout.tableWidth)?activeLayout.tableWidth:1500)),columns.reduce((sum,column)=>sum+visualWidth(column.width),0));
  const moveColumn=(from:string,to:string)=>{if(!customizing||locked||!allowLayout)return;setLayout(previous=>({...previous,columns:reorderByKey(previous.columns,column=>column.key,from,to)}));};
  const applyView=(view:SavedListView|null):boolean=>{
    if(dirty||pendingData)return false;
    const filters=view?.filters??emptyListFilters(),nextLayout=view?.layout??initialLayout??loadItemLayout(sourceKey);
    setQuery(filters.query);setKind(filters.kind);setLifecycle(filters.lifecycle);setLeader(filters.leader);
    setStatus(filters.status);setColumnFilters({...filters.columns});
    setApplied(nextLayout);setLayout(nextLayout);setColorRules(view?.colors??loadColorRules(sourceKey));
    setPage(0);return true;
  };
  const changeColorRules=(next:ColorRule[])=>{if(saveColorRules(sourceKey,next))setColorRules(next);else setLayoutError('Không lưu được màu trên trình duyệt này.');};
  const frameWidth=activeLayout.frameWidth==='auto'||activeLayout.frameWidth===undefined?'100%':`${Math.min(6000,Math.max(320,Number.isFinite(activeLayout.frameWidth)?activeLayout.frameWidth:320))}px`;
  return <section className="card item-list-card" style={{width:frameWidth}}>
    {customizing&&<><div className="settings-mode-bar"><div><strong>Chế độ tùy chỉnh danh sách</strong><p>{draftOnly?'Sửa thử các ô được cấp quyền; phần sửa chỉ giữ trên trình duyệt. Chỉ quản trị được lưu bố trí chung.':effectiveSourceKind==='firebase'?'Bấm ô được cấp quyền để sửa; thay đổi sẽ tự lưu vào Firebase. Nội dung/Ghi chú cần bấm Áp dụng trong popup.':'Kéo tiêu đề để đổi vị trí cột; kéo mép cột để đổi độ rộng. Bấm ô để sửa trên bảng; phần sửa được giữ trên trình duyệt và chưa ghi vào Excel. Nút lưu bố trí chỉ lưu khung, thứ tự và độ rộng cột.'}</p></div><div className="top-actions">{!permissionMode&&<button className="button ghost" disabled={locked||!allowLayout} onClick={()=>setLayout(defaultItemLayout())}>Khôi phục bố trí</button>}<button className="button ghost" disabled={locked||dataSaving||permissionMode} title={permissionMode?"Quay về Bố trí bảng để thoát":undefined} onClick={exit}>Về chế độ xem</button>{readOnly&&onKeepDraft&&!permissionMode&&<button className="button ghost" disabled={locked} onClick={()=>{if(onKeepDraft())onClose();}}>Giữ thay đổi trên máy và về xem</button>}{!permissionMode&&<button className="button primary" disabled={locked||dataSaving||cannotSaveData||(!dirty&&!pendingData)} onClick={()=>void save()}>{cannotSaveData?blockedSaveLabel:saveActionLabel}</button>}</div></div><p className="muted" role="status">{checkpointMessage}</p>{recoveryMessage&&<p className="notice">{recoveryMessage}</p>}<div className="customize-mode-toolbar" role="group" aria-label="Chọn nội dung tùy chỉnh">
  <div className="customize-mode-tabs">
    <button type="button" className={permissionMode?'mode-tab':'mode-tab active'} aria-pressed={!permissionMode} disabled={locked} onClick={()=>{
      if(permissionMode&&permissionDirty){setLayoutError('Quyền chưa lưu. Hãy Lưu hoặc Bỏ thay đổi quyền trước khi chuyển sang Bố trí bảng.');return;}
      setPermissionMode(false);setLayoutError('');
    }}>Bố trí bảng và cột</button>
    {allowLayout&&permissions&&onSavePermissions&&<button type="button" className={permissionMode?'mode-tab active':'mode-tab'} aria-pressed={permissionMode} disabled={locked} onClick={()=>{setPermissionMode(true);setLayoutError('');}}>Quyền chỉnh sửa</button>}
  </div>
  <span className="muted">{permissionMode?'Cấp quyền sửa bằng thao tác trực tiếp trên bảng · Chưa lưu sẽ không có hiệu lực':'Hiện/ẩn, thay đổi vị trí, độ rộng cột và sửa thử nội dung trên bảng'}</span>
</div>
{!permissionMode&&<fieldset className="settings-saving" disabled={locked||!allowLayout}><ItemColumnPanel layout={layout} onChange={setLayout}/><button className="button ghost" disabled={!dirty} onClick={()=>void validateAndSaveLayout()}>{layoutSaveLabel}</button></fieldset>}
{layoutError&&<p className="error-text" role="alert">{layoutError}</p>}</>}
    <div className="card-header"><div><h3>Danh sách nội dung</h3><p className="muted">{filtered.length} / {items.length} nội dung · Tìm kiếm hỗ trợ tiếng Việt không dấu</p></div><div className="top-actions"><span className="status-pill">{sourceLabel??(effectiveSourceKind==='firebase'?'Firebase HopHDND':effectiveSourceKind==='google'?'Nguồn Excel':'Dữ liệu mẫu')}</span></div></div>
    {customizing&&saveDataHint&&<p className="notice">{saveDataHint}</p>}
    <div className="toolbar"><label className="field search-field">Tìm kiếm<input type="search" placeholder="Nội dung, mã, sở, chuyên viên…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
      <label className="field">Loại nội dung<select value={kind} onChange={e => { setKind(e.target.value); setPage(0); }}><option value="all">Tất cả loại</option><option value="NQ">Nghị quyết</option><option value="BC">Báo cáo</option><option value="UNCLASSIFIED">Chưa phân loại</option></select></label>
      <label className="field">Phạm vi<select value={lifecycle} onChange={e => { setLifecycle(e.target.value); setPage(0); }}><option value="active">Đang trình</option><option value="dropped">Đã rút</option><option value="archived">Đã lưu trữ</option><option value="all">Tất cả</option></select></label>
      <label className="field">Lãnh đạo VP<select value={leader} onChange={e => { setLeader(e.target.value); setPage(0); }}><option value="all">Tất cả lãnh đạo</option>{leaders.map(value => <option key={value}>{value}</option>)}</select></label>
      <label className="field">Tiến độ<select value={status} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="all">Tất cả tiến độ</option>{statuses.map(value => <option key={value}>{value}</option>)}</select></label>
    </div>
    {canEdit&&<label className="layout-visibility"><input type="checkbox" disabled={locked} checked={allSpecialists} onChange={event=>setAllSpecialists(event.target.checked)}/>Chọn chuyên viên toàn cơ quan</label>}
    {permissionMode&&permissions&&onSavePermissions?<InlinePermissionsTable items={rows} columns={columns} permissions={permissions} onSave={onSavePermissions} onDirtyChange={setPermissionDirty} onBack={()=>{setPermissionMode(false);setPermissionDirty(false);setLayoutError("");}} disabled={locked}/>:<><div className="table-wrap"><table className="data-table item-data-table" style={{width:`${tableWidth}px`}}><colgroup>{columns.map(column=><col key={column.key} style={{width:`${visualWidth(column.width)}px`}}/>)}</colgroup><thead><tr>{columns.map((column,index)=><ColumnHeader key={column.key} columnKey={column.key} disabled={!customizing||locked||!allowLayout} previousKey={columns[index-1]?.key} nextKey={columns[index+1]?.key} onMove={moveColumn}>{column.label}{customizing&&!locked&&allowLayout&&<span draggable={false} className="column-resizer" role="separator" aria-label={`Kéo độ rộng cột ${column.label}`} aria-orientation="vertical" tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setLayout(previous=>({...previous,columns:previous.columns.map(entry=>entry.key===column.key?{...entry,width:Math.min(1600,Math.max(60,entry.width+(event.key==='ArrowRight'?10:-10)))}:entry)}));}}} onPointerDown={event=>{resizing.current={key:column.key,x:event.clientX,width:column.width};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{const drag=resizing.current;if(drag&&drag.key===column.key)setLayout(previous=>({...previous,columns:previous.columns.map(entry=>entry.key===drag.key?{...entry,width:Math.min(1600,Math.max(60,Math.round(drag.width+event.clientX-drag.x)))}:entry)}));}} onPointerUp={()=>{resizing.current=null;}} onPointerCancel={()=>{resizing.current=null;}}/>}</ColumnHeader>)}</tr></thead><tbody>
      {rows.map(item => <tr key={item.recordId} className={drafts[item.recordId] ? 'dirty-row' : ''}>{columns.map(column=>{const key=column.key as TextField;
        if(column.key==='displayCode')return <td key={column.key}><span className="code" title={`Mã gốc: ${item.displayCode}`}>{displayId(item)}</span>{(aliasCounts.get(displayId(item))??0)>1&&<small className="warning-text">Trùng ID hiển thị · {item.displayCode}</small>}{drafts[item.recordId]&&<small>Chưa lưu</small>}{errors[item.recordId]&&<p className="error-text" role="alert">{errors[item.recordId]}</p>}</td>;
        if(column.key==='stt')return <td key={column.key}>{item.stt}</td>;
        if(column.key==='history')return <td key={column.key}><button className="button ghost" onClick={()=>onHistory(item)}>Xem</button></td>;
        if(column.key==='isDropped')return <td key={column.key}>{canEdit&&(!canEditCell||canEditCell(item.recordId,'isDropped'))?<CellPicker label={`${displayId(item)}: Trình / Rút`} value={item.isDropped?"Đã rút":"Đang trình"} options={["Đang trình","Đã rút"]} disabled={locked} onChange={value=>onUpdate(item.recordId,{isDropped:value==="Đã rút"})}/>:<span className={`status-pill ${item.isDropped?'warning':'success'}`}>{item.archivedAt?'Lưu trữ':item.isDropped?'Đã rút':'Đang trình'}</span>}</td>;
        const metadata=TEXT_FIELDS.find(field=>field.key===key)!;
        return <td key={column.key}>{canEdit&&(!canEditCell||canEditCell(item.recordId,key))?key==='content'?<button className="content-button" onClick={()=>setContentItem({item,field:"content"})} disabled={locked}>{item.content}</button>:key==='note'?<button className="cell-value-button" aria-label={`${displayId(item)}: ${metadata.label}`} onClick={()=>setContentItem({item,field:"note"})} disabled={locked}>{item.note||"Chưa có ghi chú"}</button>:<CellPicker label={`${displayId(item)}: ${metadata.label}`} value={item[key]} options={options(key,item)} searchable={key==="specialist"} disabled={locked} onChange={value=>onUpdate(item.recordId,{[key]:value})}/>:item[key]||'—'}{key==='specialist'&&assignmentIssue(item,catalog)&&<small className="warning-text">{assignmentIssue(item,catalog)}</small>}</td>;
      })}</tr>)}
      {!rows.length && <tr><td className="empty" colSpan={Math.max(1,columns.length)}>Không tìm thấy nội dung phù hợp. Hãy thử đổi từ khóa hoặc bộ lọc.</td></tr>}
    </tbody></table></div></>}
    <div className="pagination"><span className="muted">Trang {currentPage + 1}/{pages} · tối đa 50 dòng/trang</span><button className="button ghost" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Trước</button><button className="button ghost" disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Sau</button></div>
    {canEdit && contentItem && <ContentEditor key={`${contentItem.item.recordId}:${contentItem.field}`} sourceKey={sourceKey} item={contentItem.item} field={contentItem.field} sourceKind={effectiveSourceKind} draftOnly={draftOnly} onSave={value => onUpdate(contentItem.item.recordId, { [contentItem.field]:value })} onClose={() => setContentItem(null)} />}
    {customizing&&unmatchedCheckpoint&&<Modal title="Có phần sửa trên bố trí cũ" onClose={onClose}><div className="modal-body"><p>Bố trí đang giữ trên máy không khớp bố trí dùng chung hiện tại. Nạp để đối chiếu không ghi Google hoặc Excel.</p><p className="muted">Đã giữ trên máy: {new Date(unmatchedCheckpoint.savedAt).toLocaleString('vi-VN')}</p></div><div className="modal-footer"><button className="button ghost" onClick={onClose}>Giữ thay đổi trên máy và về xem</button><button className="button danger" onClick={discardOldDraft}>Bỏ phần sửa bố trí cũ</button><button className="button primary" onClick={restoreOldDraft}>Nạp phần sửa để đối chiếu</button></div></Modal>}
    {confirmExit&&<Modal title="Xử lý thay đổi trước khi về xem?" onClose={()=>{if(!locked)setConfirmExit(false);}}><div className="modal-body"><p>Phần bạn đang sửa chưa lưu. Giữ trên máy không ghi dữ liệu vào nguồn và không lưu bố trí dùng chung.</p>{layoutError&&<p className="error-text">{layoutError}</p>}</div><div className="modal-footer"><button className="button ghost" disabled={locked} onClick={()=>setConfirmExit(false)}>Tiếp tục sửa</button><button className="button danger" disabled={locked||dataSaving} onClick={()=>{setLayout(applied);clearCheckpoint();onDiscardData();setConfirmExit(false);onClose();}}>Bỏ phần đang sửa và về xem</button>{cannotSaveData&&onKeepDraft?<button className="button primary" disabled={locked} onClick={()=>{if(onKeepDraft())onClose();}}>Giữ thay đổi trên máy và về xem</button>:<button className="button primary" disabled={locked||dataSaving} onClick={()=>void save()}>{saveActionLabel}</button>}</div></Modal>}

  </section>;
}



