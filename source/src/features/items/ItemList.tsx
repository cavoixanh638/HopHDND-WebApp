import { useEffect, useMemo, useRef, useState } from 'react';
import type { Changes, Item, Patch, TextField, EditableField } from '../../../shared/types';
import { TEXT_FIELDS, STATUS_OPTIONS } from '../../../shared/field-definitions';
import { ContentEditor } from './ContentEditor';
import { displayId, isMissingDisplayCode } from '../../domain/display-id';
import { EXCEL_COLUMN_KEYS, overlayPersonalLayout, defaultItemLayout, loadItemLayout, saveItemLayout, validateItemLayout } from '../../data/item-preferences';
import {normalizeSearch} from '../../domain/search';
import { validateItemDraft } from '../../data/item-draft';
import { assignmentIssue, type CatalogConfig, type CatalogKey } from '../../data/catalogs';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';
import {layoutRecoveryScope} from '../../data/draft-checkpoints';
import { ItemColumnPanel } from './ItemColumnPanel';
import {LayoutConflictResolver} from './LayoutConflictResolver';
import {LayoutConflictError,type LayoutFieldConflict,type LayoutConflictChoices,type LayoutConflictChoice} from '../../data/item-layout-merge';
import { Modal } from '../../components/Modal';
import { orderValues } from '../../domain/catalog-order';
import type {ItemLayout} from '../../data/item-preferences';
import { ColumnHeader } from './ColumnHeader';
import {ColumnFilterCell} from './ColumnFilterCell';
import { CellPicker } from './CellPicker';
import { reorderByKey } from '../../domain/reorder-columns';
import type {CellPermissions} from '../../data/firebase-repository';
import {InlinePermissionsTable} from './InlinePermissionsTable';
import './item-frame.css';
import {ListViewTools} from './ListViewTools';
import {emptyListFilters,loadListViews,loadActiveListView,loadColorRules,saveColorRules,matchesColumnFilters,itemColor,type SavedListView,type ColorRule} from '../../data/list-views';

export function ItemList({ items, drafts, errors, busy, onUpdate, onHistory, readOnly = false, sourceKind, customizing = false, sourceKey, catalog, onClose, onSaveData, onDiscardData, onLayoutSaved,initialLayout,onPersistLayout,canEditDraft=true,layoutSaveLabel='Lưu cách hiển thị',saveDataHint='',onKeepDraft,canEditCell,allowLayout=true,dataSaving=false,sourceLabel,draftOnly=false,permissions,onSavePermissions,onReloadPermissions,onFrameWidthChange,anonymousViewer=false,onDirtyChange,exitRequest=0,permissionModeOnly=false,externalSectionTabs=false,onOpenCatalog,onPersistCatalog }: { items: Item[]; drafts: Record<string, Patch>; errors: Record<string, string>; busy: boolean; onUpdate: (id: string, changes: Changes) => void; onHistory: (item: Item) => void; readOnly?: boolean; sourceKind?: 'demo'|'google'|'firebase'; customizing?: boolean; sourceKey:string; catalog:CatalogConfig; onClose:()=>void; onSaveData:()=>Promise<boolean>; onDiscardData:()=>void; onLayoutSaved:(message:string)=>void;initialLayout?:ItemLayout;onPersistLayout?:(layout:ItemLayout,baseline?:ItemLayout,choices?:LayoutConflictChoices)=>Promise<ItemLayout|void>;canEditDraft?:boolean;layoutSaveLabel?:string;saveDataHint?:string;onKeepDraft?:()=>boolean;canEditCell?:(id:string,field:EditableField)=>boolean;allowLayout?:boolean;dataSaving?:boolean;sourceLabel?:string;draftOnly?:boolean;permissions?:CellPermissions;onSavePermissions?:(next:CellPermissions,expected:CellPermissions)=>Promise<void>;onReloadPermissions?:()=>Promise<CellPermissions>;onFrameWidthChange?:(width:'auto'|number)=>void; anonymousViewer?:boolean;onDirtyChange?:(dirty:boolean)=>void;exitRequest?:number;permissionModeOnly?:boolean;externalSectionTabs?:boolean;onOpenCatalog?:(key:string)=>void;onPersistCatalog?:(next:CatalogConfig)=>Promise<void> }) {
  const personalScope=layoutRecoveryScope(sourceKey);
  const selectedView=loadListViews(personalScope).find(v=>v.id===loadActiveListView(personalScope));
  const [columnFilters,setColumnFilters]=useState<Record<string,string>>(selectedView?.filters.columns??{});
  // An ordinary viewer should immediately see every A–R source field. Saved
  // column settings remain available without a Firebase write.
  const [showAllSourceColumns,setShowAllSourceColumns]=useState(!customizing);
  const [colorRules,setColorRules]=useState<ColorRule[]>(selectedView?.colors??loadColorRules(personalScope));
  const effectiveSourceKind = sourceKind ?? (readOnly ? 'google' : 'demo');

  // Admin customizations always start from the one Firebase shared layout.
  // Personal saved views are viewing presets, never an alternative shared baseline.
  const [applied, setApplied] = useState(() => {
    const authoritative=initialLayout??loadItemLayout(sourceKey);
    return !customizing&&selectedView?overlayPersonalLayout(authoritative,selectedView.layout):authoritative;
  });
  // The Firebase baseline must be the original *shared* layout when editing began,
  // not a local saved view nor the profile revision emitted after another write.
  const sharedBase=useRef<ItemLayout>(initialLayout??applied);
  const [restoredBase,setRestoredBase]=useState<ItemLayout|null>(null);
  const saveBaseline=restoredBase??sharedBase.current;
  useEffect(()=>{if(initialLayout&&!customizing&&!loadActiveListView(personalScope))setApplied(initialLayout);},[initialLayout,customizing]);
  const {draft:layout,setDraft:setLayout,dirty,markSaved,clearCheckpoint,recoveryMessage,checkpointMessage,unmatchedCheckpoint,restoreOldDraft,discardOldDraft} = useRecoverableDraft(layoutRecoveryScope(`items:${sourceKey}`),applied,validateItemDraft,undefined,customizing);
  const activeLayout = customizing ? layout : applied;
  useEffect(()=>{onFrameWidthChange?.(activeLayout.frameWidth??'auto');},[activeLayout.frameWidth,onFrameWidthChange]);
  const columns = activeLayout.columns
    .filter(column=>!column.removed&&(EXCEL_COLUMN_KEYS.includes(column.key)||column.origin==='custom')&&
      (column.visible||(!customizing&&showAllSourceColumns&&EXCEL_COLUMN_KEYS.includes(column.key))))
    .sort((a,b)=>!customizing&&showAllSourceColumns
      ?(EXCEL_COLUMN_KEYS.includes(a.key)?EXCEL_COLUMN_KEYS.indexOf(a.key):1000+activeLayout.columns.indexOf(a))-
       (EXCEL_COLUMN_KEYS.includes(b.key)?EXCEL_COLUMN_KEYS.indexOf(b.key):1000+activeLayout.columns.indexOf(b))
      :0);
  const [confirmExit,setConfirmExit] = useState(false);
  const [layoutError,setLayoutError] = useState('');
  const [layoutConflicts,setLayoutConflicts] = useState<LayoutFieldConflict[]>([]);
  const [conflictChoices,setConflictChoices] = useState<LayoutConflictChoices>({});
  const [saveFeedback,setSaveFeedback] = useState('');
  const [allSpecialists,setAllSpecialists] = useState(false);
  const [saving,setSaving] = useState(false);
  const [permissionMode,setPermissionMode] = useState(permissionModeOnly);
  const [permissionSwitchRequest,setPermissionSwitchRequest] = useState(0);
  const [permissionDirty,setPermissionDirty] = useState(false);
  const [columnExtrasDirty,setColumnExtrasDirty]=useState(false);
  const exitAfterPermissions=useRef(false);
  const handledExitRequest=useRef(exitRequest);
  useEffect(()=>{onDirtyChange?.(customizing&&(dirty||permissionDirty||columnExtrasDirty));},[customizing,dirty,permissionDirty,columnExtrasDirty,onDirtyChange]);
  const locked=busy||saving||!!unmatchedCheckpoint&&customizing;
  const pendingData=Object.keys(drafts).length>0;
  const cannotSaveData=readOnly&&pendingData;
  const saveIssue=(cause:unknown)=>{
    const message=cause instanceof Error?cause.message:'Chưa lưu được cách hiển thị.';
    if(/permission[_ -]?denied/i.test(message))return 'Firebase từ chối quyền ghi cách hiển thị (permission_denied). Kiểm tra Rules của hdnd/profile và đăng nhập Google quản trị; phần sửa vẫn ở trên máy.';
    if(/network|offline|disconnected/i.test(message))return 'Không kết nối được Firebase để lưu. Vui lòng thử lại khi có mạng; phần sửa vẫn được giữ trên máy.';
    return message;
  };
  const handleLayoutFailure=(cause:unknown)=>{
    setSaveFeedback('');
    if(cause instanceof LayoutConflictError){
      setLayoutConflicts(cause.conflicts);
      setConflictChoices({});
      setLayoutError('');
    }else{
      setLayoutConflicts([]);
      setLayoutError(saveIssue(cause));
    }
  };
  const persistSavedLayout=async(valid:ItemLayout,choices?:LayoutConflictChoices)=>{
    if(!allowLayout)throw new Error('Chỉ quản trị được lưu cách hiển thị chung.');
    let merged:ItemLayout=valid;
    if(onPersistLayout){
      const confirmed=await onPersistLayout(valid,saveBaseline,choices);
      if(confirmed)merged=validateItemLayout(confirmed);
    }else{
      if(!saveItemLayout(sourceKey,valid))throw new Error('Không lưu được cách hiển thị. Nháp được giữ.');
      onLayoutSaved('Đã lưu cách hiển thị danh sách trên trình duyệt.');
    }
    sharedBase.current=merged;
    setApplied(merged);markSaved(merged);setRestoredBase(null);
    setLayoutConflicts([]);setConflictChoices({});
    return merged;
  };
  const savingRef=useRef(false);
  const resizing=useRef<{key:string;x:number;width:number}|null>(null);
  const [contentItem, setContentItem] = useState<{item:Item;field:"content"|"note"} | null>(null);
  // Any Firebase viewer (including the signed-in admin) may draft explicitly
  // granted cells in the ordinary list. Non-Firebase views stay read-only;
  // the per-cell checker still enforces the live permission and lock state.
  const canEdit = canEditDraft && !permissionMode && (customizing || anonymousViewer || !!canEditCell);
  useEffect(() => { if (!customizing) { setContentItem(null); } }, [customizing]);
  const latestExit=useRef({dirty:dirty||columnExtrasDirty,dataDirty:Object.keys(drafts).length>0,onClose,customizing,locked,permissionMode}); latestExit.current={dirty:dirty||columnExtrasDirty,dataDirty:Object.keys(drafts).length>0,onClose,customizing,locked,permissionMode};
  const exit = () => {
    if(locked||dataSaving)return;
    if(permissionMode){exitAfterPermissions.current=true;setPermissionSwitchRequest(current=>current+1);return;}
    if(dirty||columnExtrasDirty||Object.keys(drafts).length)setConfirmExit(true);
    else onClose();
  };
  useEffect(()=>{if(exitRequest===handledExitRequest.current)return;handledExitRequest.current=exitRequest;exit();},[exitRequest]);
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{const current=latestExit.current;if(current.customizing&&!current.locked&&event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')){event.preventDefault();if(current.permissionMode){setLayoutError('Hãy trở về bảng Danh sách từ chế độ phân quyền trước khi thoát.');}else if(current.dirty||current.dataDirty)setConfirmExit(true);else current.onClose();}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  const resolveAndSaveLayout=async()=>{
    if(locked||savingRef.current||!dirty||!onPersistLayout||layoutConflicts.some(c=>!conflictChoices[c.id]))return;
    savingRef.current=true;setSaving(true);setLayoutError('');setSaveFeedback('Đang đối chiếu bản Firebase mới nhất…');
    try{
      await persistSavedLayout(validateItemLayout(layout),conflictChoices);
      setSaveFeedback('Đã lưu lựa chọn vào Firebase. Có thể tiếp tục chỉnh sửa.');
    }catch(cause){handleLayoutFailure(cause);}
    finally{savingRef.current=false;setSaving(false);}
  };
  // Column filters are the single visible source of truth; old saved global filters must not silently hide results.
  // A unique Excel ID survives row insertions/reordering; missing or repeated
  // IDs intentionally fall back to their original source-row identity.
  const codeCounts=useMemo(()=>{
    const result=new Map<string,number>();
    for(const item of items)result.set(item.displayCode,(result.get(item.displayCode)??0)+1);
    return result;
  },[items]);
  const customRowKey=(item:Item)=>/^[A-Za-z0-9_-]{1,100}$/.test(item.displayCode)&&
    codeCounts.get(item.displayCode)===1?`code:${item.displayCode}`:item.recordId;
  const filtered = useMemo(() => items.filter(item =>
    matchesColumnFilters(item,Object.fromEntries(Object.entries(columnFilters).filter(([key])=>EXCEL_COLUMN_KEYS.includes(key)))) &&
    Object.entries(columnFilters).every(([key,term])=>{
      const column=activeLayout.columns.find(c=>c.key===key&&c.origin==='custom');
      return !column||!term.trim()||normalizeSearch(column.values?.[customRowKey(item)]??'').includes(normalizeSearch(term));
    })),[items,columnFilters,activeLayout,codeCounts]);
  const rows = filtered;
  const options = (field: TextField,item:Item) => {
    const list=field in catalog.options?catalog.options[field as CatalogKey]:field in STATUS_OPTIONS?STATUS_OPTIONS[field as keyof typeof STATUS_OPTIONS]:[];
    return orderValues([...new Set([...list,item[field]])].filter(Boolean),list).filter(value=>field!=='specialist'||allSpecialists||value===item.specialist||!item.room||catalog.specialistRooms[value]?.includes(item.room));
  };
  const aliasCounts = useMemo(()=>{const counts=new Map<string,number>();items.filter(item=>!isMissingDisplayCode(item.displayCode)).forEach(item=>counts.set(displayId(item),(counts.get(displayId(item))??0)+1));return counts;},[items]);
  const visualWidth=(value:number)=>Math.min(1600,Math.max(60,Number.isFinite(value)?value:170));
  const tableWidth=Math.max(Math.min(6000,Math.max(500,Number.isFinite(activeLayout.tableWidth)?activeLayout.tableWidth:1500)),columns.reduce((sum,column)=>sum+visualWidth(column.width),0));
  const moveColumn=(from:string,to:string)=>{if(!customizing||locked||!allowLayout)return;setLayout(previous=>({...previous,columns:reorderByKey(previous.columns,column=>column.key,from,to)}));};
  const applyView=(view:SavedListView|null):boolean=>{
    if(dirty||pendingData)return false;
    const filters=view?.filters??emptyListFilters(),nextLayout=view?overlayPersonalLayout(initialLayout??loadItemLayout(sourceKey),view.layout):initialLayout??loadItemLayout(sourceKey);
    setColumnFilters({...filters.columns});
    setShowAllSourceColumns(view===null);
    setApplied(nextLayout);setLayout(nextLayout);setColorRules(view?.colors??loadColorRules(personalScope));
    return true;
  };
  const changeColorRules=(next:ColorRule[])=>{if(saveColorRules(personalScope,next))setColorRules(next);else setLayoutError('Không lưu được màu trên trình duyệt này.');};
  const visibleWidth=activeLayout.frameWidth==='auto'||activeLayout.frameWidth===undefined
    ?'100%':`${Math.min(6000,Math.max(320,Number.isFinite(activeLayout.frameWidth)?activeLayout.frameWidth:1500))}px`;
  const widthError=layoutError.toLowerCase().includes('độ rộng');
  return <section className="card item-list-card">
    {customizing&&anonymousViewer&&<div className="guest-edit-bar">
      <strong>Sửa thử nội dung được cấp quyền</strong>
      <div className="top-actions">
        {pendingData&&onKeepDraft&&<button className="button ghost" onClick={()=>{if(onKeepDraft())onClose();}}>Giữ phần sửa trên máy</button>}
        <button className="button ghost" onClick={exit}>Về danh sách</button>
      </div>
    </div>}
    {customizing&&!anonymousViewer&&!permissionMode&&<>
    {layoutError&&!widthError&&<div className="layout-save-alert" role="alert"><strong>Chưa lưu được.</strong><span>{layoutError}</span></div>}
    {saveFeedback&&<p className="notice layout-save-feedback" role="status">{saveFeedback}</p>}
    {customizing&&layoutConflicts.length>0&&<LayoutConflictResolver
      conflicts={layoutConflicts} choices={conflictChoices}
      busy={locked||dataSaving}
      onChoose={(field:string,choice:LayoutConflictChoice)=>setConflictChoices(current=>({...current,[field]:choice}))}
      onConfirm={()=>void resolveAndSaveLayout()}
      onCancel={()=>{setLayoutConflicts([]);setConflictChoices({});}}/>}
    <p className="muted" role="status">{checkpointMessage}</p>{recoveryMessage&&<p className="notice">{recoveryMessage}</p>}{!externalSectionTabs&&<div className="customize-mode-toolbar" role="group" aria-label="Chọn nội dung tùy chỉnh">
  <div className="customize-mode-tabs">
    <button type="button" className={permissionMode?'mode-tab':'mode-tab active'} aria-pressed={!permissionMode} disabled={locked} onClick={()=>{
      if(permissionMode){setPermissionSwitchRequest(current=>current+1);return;}
      setPermissionMode(false);setLayoutError('');
    }}>Hiển thị bảng</button>
    {allowLayout&&permissions&&onSavePermissions&&<button type="button" className={permissionMode?'mode-tab active':'mode-tab'} aria-pressed={permissionMode} disabled={locked} onClick={()=>{setPermissionMode(true);setLayoutError('');}}>Quyền chỉnh sửa</button>}
  </div>
  <span className="muted">{permissionMode?'Cấp quyền sửa bằng thao tác trực tiếp trên bảng · Chưa lưu sẽ không có hiệu lực':'Hiện/ẩn, thay đổi vị trí, độ rộng cột và sửa thử nội dung trên bảng'}</span>
</div>}
{!permissionMode&&<fieldset className="settings-saving" disabled={locked||!allowLayout}><ItemColumnPanel catalog={catalog} items={items} permissions={permissions} layoutDirty={dirty} onSaveLayout={()=>persistSavedLayout(validateItemLayout(layout)).then(()=>{setLayoutError('');setSaveFeedback('');})} onSaveCatalog={onPersistCatalog} onSavePermissions={onSavePermissions} onDirtyChange={setColumnExtrasDirty} layout={layout} validationMessage={widthError?layoutError:undefined} onChange={value=>{setSaveFeedback('');setLayoutError('');setLayoutConflicts([]);setConflictChoices({});setLayout(value);}}/></fieldset>}
</>}
    <div className="item-data-region" style={{width:visibleWidth,maxWidth:'100%'}}>
    <div className="card-header"><div><h3>Danh sách nội dung</h3><p className="muted"><span className="item-result-count">{filtered.length} / {items.length}</span> nội dung{!anonymousViewer&&' · Tìm kiếm hỗ trợ tiếng Việt không dấu'}</p></div>{!anonymousViewer&&<div className="top-actions"><span className="status-pill">{sourceLabel??(effectiveSourceKind==='firebase'?'Firebase HopHDND':effectiveSourceKind==='google'?'Nguồn Excel':'Dữ liệu mẫu')}</span></div>}</div>
    {customizing&&!anonymousViewer&&saveDataHint&&<p className="notice">{saveDataHint}</p>}
     {!customizing&&<div className="source-column-visibility" role="group" aria-label="Hiển thị cột nguồn Excel">
       <span>{columns.length} / {activeLayout.columns.filter(c=>!c.removed).length} cột dữ liệu</span>
       <button type="button" className="button ghost" aria-pressed={showAllSourceColumns}
         onClick={()=>setShowAllSourceColumns(current=>!current)}>
         {showAllSourceColumns?'Theo cột đã chọn':'Hiện đủ cột Excel'}
       </button>
     </div>}
     {!anonymousViewer&&<ListViewTools sourceKey={personalScope} filters={{...emptyListFilters(),columns:columnFilters}} layout={activeLayout} colors={colorRules} onLoad={applyView} onColors={changeColorRules} disabled={locked||pendingData} customizing={customizing}/>}
    <div className="item-sticky-search-controls">
    <div className="item-filter-status-slot" role="status" aria-label="Các điều kiện tìm kiếm đang áp dụng">
    <div className="active-filter-bar" aria-hidden={!Object.entries(columnFilters).some(([,term])=>term.trim())}>
      {Object.entries(columnFilters).some(([,term])=>term.trim())&&<><strong>Đang tìm trong cột:</strong>{Object.entries(columnFilters).filter(([,term])=>term.trim()).map(([key,term])=><span className="filter-chip" key={key}>{columns.find(c=>c.key===key)?.label??key}: {term}<button type="button" className="chip-remove" aria-label={'Bỏ lọc '+key} onClick={()=>{setColumnFilters(old=>{const next={...old};delete next[key];return next;});}}>×</button></span>)}<button type="button" className="button ghost" onClick={()=>{setColumnFilters({});}}>Xóa tìm kiếm theo cột</button></>}</div></div>
    {canEdit&&!anonymousViewer&&<label className="layout-visibility"><input type="checkbox" disabled={locked} checked={allSpecialists} onChange={event=>setAllSpecialists(event.target.checked)}/>Chọn chuyên viên toàn cơ quan</label>}
    </div>
    {permissionMode&&permissions&&onSavePermissions?<InlinePermissionsTable showBackButton={!externalSectionTabs} items={rows} columns={columns} permissions={permissions} onSave={onSavePermissions} onReload={onReloadPermissions} onDirtyChange={setPermissionDirty} switchRequest={permissionSwitchRequest} onBack={()=>{
      setPermissionMode(false);setPermissionDirty(false);setLayoutError("");
      if(exitAfterPermissions.current){
        exitAfterPermissions.current=false;
        if(dirty||columnExtrasDirty||Object.keys(drafts).length)setConfirmExit(true);else onClose();
      }
    }} disabled={locked}/>:<><div className="table-wrap item-table-scroll" tabIndex={0} role="region" aria-label="Bảng nội dung cuộn ngang và dọc"><table className="data-table item-data-table" style={{width:`max(100%, ${tableWidth}px)`,tableLayout:'fixed'}}><colgroup>{columns.map(column=><col key={column.key} style={{width:`${visualWidth(column.width)}px`}}/>)}</colgroup><thead><tr className="item-heading-row">{columns.map((column,index)=><ColumnHeader key={column.key} columnKey={column.key} disabled={!customizing||locked||!allowLayout} previousKey={columns[index-1]?.key} nextKey={columns[index+1]?.key} onMove={moveColumn}>{column.label}{customizing&&!locked&&allowLayout&&<span draggable={false} className="column-resizer" role="separator" aria-label={`Kéo độ rộng cột ${column.label}`} aria-orientation="vertical" tabIndex={0} onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setLayout(previous=>({...previous,columns:previous.columns.map(entry=>entry.key===column.key?{...entry,width:Math.min(1600,Math.max(60,entry.width+(event.key==='ArrowRight'?10:-10)))}:entry)}));}}} onPointerDown={event=>{resizing.current={key:column.key,x:event.clientX,width:column.width};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerMove={event=>{const drag=resizing.current;if(drag&&drag.key===column.key)setLayout(previous=>({...previous,columns:previous.columns.map(entry=>entry.key===drag.key?{...entry,width:Math.min(1600,Math.max(60,Math.round(drag.width+event.clientX-drag.x)))}:entry)}));}} onPointerUp={()=>{resizing.current=null;}} onPointerCancel={()=>{resizing.current=null;}}/>}</ColumnHeader>)}</tr><tr className="item-column-filter-row">
  {columns.map(column=><ColumnFilterCell key={column.key} field={column.key} label={column.label} items={items}
    getValue={column.origin==='custom'?(item)=>column.values?.[customRowKey(item)]??'':undefined}
    choices={column.origin==='custom'&&column.kind==='select'?column.options:undefined}
    value={columnFilters[column.key]??''} onChange={value=>{setColumnFilters(previous=>{const next={...previous};if(value)next[column.key]=value;else delete next[column.key];return next;});}} />)}
  </tr></thead><tbody>
      {rows.map(item => <tr key={item.recordId} className={['color-row',itemColor(item,colorRules)?'color-'+itemColor(item,colorRules):'',drafts[item.recordId]?'dirty-row':''].join(' ')}>{columns.map(column=>{const key=column.key as TextField;
        if(column.origin==='custom'){
          const rowKey=customRowKey(item),value=column.values?.[rowKey]??'';
          const updateCustom=(next:string)=>setLayout(previous=>({...previous,columns:previous.columns.map(c=>c.key!==column.key?c:{
            ...c,values:{...(c.values??{}),[rowKey]:next}
          })}));
          return <td key={column.key}>{customizing&&allowLayout&&!locked
            ?column.kind==='select'
              ?<CellPicker label={`${displayId(item)}: ${column.label}`} value={value}
                options={column.options??[]} onChange={updateCustom}/>
              :<input className="custom-cell-input" aria-label={`${displayId(item)}: ${column.label}`}
                type="text" maxLength={1000} value={value} onChange={e=>updateCustom(e.currentTarget.value)}/>
            :value||'—'}</td>;
        }
        if(column.key==='displayCode')return <td key={column.key}><span className="code" title={isMissingDisplayCode(item.displayCode)?undefined:`Mã gốc: ${item.displayCode}`}>{displayId(item)}</span>{customizing&&!anonymousViewer&&<button type="button" className="item-history-action" title="Xem lịch sử chỉnh sửa" aria-label={`Xem lịch sử ${displayId(item)}`} onClick={()=>onHistory(item)}>↺</button>}{(aliasCounts.get(displayId(item))??0)>1&&<small className="warning-text">Trùng ID hiển thị · {item.displayCode}</small>}{drafts[item.recordId]&&<small>Chưa lưu</small>}{errors[item.recordId]&&<p className="error-text" role="alert">{errors[item.recordId]}</p>}</td>;
        if(column.key==='stt')return <td key={column.key}>{item.stt}</td>;
        if(column.key==='isDropped')return <td key={column.key}>{canEdit&&(!canEditCell||canEditCell(item.recordId,'isDropped'))?<CellPicker label={`${displayId(item)}: Rút`} value={item.isDropped?"Đã rút":"Chưa rút"} options={["Chưa rút","Đã rút"]} disabled={locked} onChange={value=>onUpdate(item.recordId,{isDropped:value==="Đã rút"})}/>:<span className={item.isDropped?'status-pill warning':''}>{item.isDropped?'Đã rút':'—'}</span>}</td>;
        // Excel columns P and Q are displayed and searchable but not editable.
        // They must not be offered as writable fields until a source writer and
        // server-side permission rules explicitly support these new columns.
        if(column.key==='partyMeeting'||column.key==='examined')
          return <td key={column.key}>{item[column.key]||'—'}</td>;
        const metadata=TEXT_FIELDS.find(field=>field.key===key)!;
        return <td key={column.key}>{canEdit&&(!canEditCell||canEditCell(item.recordId,key))?key==='content'?<button className="content-button" onClick={()=>setContentItem({item,field:"content"})} disabled={locked}>{item.content||'—'}</button>:key==='note'?<button className="cell-value-button" aria-label={`${displayId(item)}: ${metadata.label}`} onClick={()=>setContentItem({item,field:"note"})} disabled={locked}>{item.note||'—'}</button>:column.kind==='text'
  ?<input className="custom-cell-input" aria-label={`${displayId(item)}: ${column.label}`} maxLength={1000} value={String(item[key]??'')} disabled={locked}
    onChange={event=>onUpdate(item.recordId,{[key]:event.currentTarget.value})}/>
  :<CellPicker label={`${displayId(item)}: ${column.label}`} value={item[key]} options={options(key,item)} searchable={key==="specialist"} disabled={locked} onChange={value=>onUpdate(item.recordId,{[key]:value})}/>:item[key]||'—'}{key==='specialist'&&assignmentIssue(item,catalog)&&<small className="warning-text">{assignmentIssue(item,catalog)}</small>}</td>;
      })}</tr>)}
      {!rows.length && <tr><td className="empty" colSpan={Math.max(1,columns.length)}>Không tìm thấy nội dung phù hợp. Hãy thử đổi từ khóa hoặc bộ lọc.</td></tr>}
    </tbody></table></div></>}
    </div>
    {canEdit && contentItem && <ContentEditor key={`${contentItem.item.recordId}:${contentItem.field}`} sourceKey={sourceKey} item={contentItem.item} field={contentItem.field} sourceKind={effectiveSourceKind} draftOnly={draftOnly} onSave={value => onUpdate(contentItem.item.recordId, { [contentItem.field]:value })} onClose={() => setContentItem(null)} />}
    {customizing&&unmatchedCheckpoint&&<Modal title="Có thay đổi hiển thị cũ" onClose={onClose}><div className="modal-body"><p>Cách hiển thị đang giữ trên máy không khớp cách hiển thị dùng chung hiện tại. Nạp để đối chiếu không ghi Google hoặc Excel.</p><p className="muted">Đã giữ trên máy: {new Date(unmatchedCheckpoint.savedAt).toLocaleString('vi-VN')}</p></div><div className="modal-footer"><button className="button ghost" onClick={onClose}>Giữ thay đổi trên máy và về xem</button><button className="button danger" onClick={discardOldDraft}>Bỏ phần sửa cách hiển thị cũ</button><button className="button primary" onClick={()=>{if(unmatchedCheckpoint)setRestoredBase(unmatchedCheckpoint.base);restoreOldDraft();}}>Nạp phần sửa để đối chiếu</button></div></Modal>}
    {confirmExit&&<Modal title="Xử lý thay đổi trước khi về xem?" onClose={()=>{if(!locked)setConfirmExit(false);}}><div className="modal-body"><p>Phần bạn đang sửa chưa lưu. Giữ trên máy không ghi dữ liệu vào nguồn và không lưu cách hiển thị dùng chung.</p>{layoutError&&<p className="error-text">{layoutError}</p>}</div><div className="modal-footer"><button className="button ghost" disabled={locked} onClick={()=>setConfirmExit(false)}>Tiếp tục sửa</button><button className="button danger" disabled={locked||dataSaving} onClick={()=>{setLayout(applied);clearCheckpoint();onDiscardData();setConfirmExit(false);onClose();}}>Bỏ phần đang sửa và về xem</button>{cannotSaveData&&onKeepDraft?<button className="button primary" disabled={locked} onClick={()=>{if(onKeepDraft())onClose();}}>Giữ thay đổi trên máy và về xem</button>:<button className="button primary" disabled={locked||dataSaving} onClick={()=>{setConfirmExit(false);}} >Lưu riêng phần đang sửa trước khi về xem</button>}</div></Modal>}

  </section>;
}



