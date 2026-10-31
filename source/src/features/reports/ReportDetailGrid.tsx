import {useEffect,useMemo,useState,type CSSProperties,type ReactNode} from 'react';
import type {Changes,Item,TextField} from '../../../shared/types';
import {TEXT_FIELDS} from '../../../shared/field-definitions';
import type {CatalogConfig} from '../../data/catalogs';
import {EXCEL_SOURCE_COLUMNS,COMPACT_GROUP_LABEL_KEYS,cellHighlightStyle,type ItemLayout} from '../../data/item-preferences';
import {COMPACT_GROUP_DEFAULT_LABELS} from '../items/compact-columns';
import {loadDetailGridPreferences,saveDetailGridPreferences,defaultDetailGridPreferences,validateDetailGridPreferences,
  type DetailGridPreferences,type DetailColumnKey} from '../../data/report-detail-preferences';
import {normalizeSearch} from '../../domain/search';
import {sortItems,type ColumnSort} from '../../domain/sort-items';
import {displayId} from '../../domain/display-id';
import {Modal} from '../../components/Modal';
import {ColumnResizeHandle} from '../../components/ColumnResizeHandle';
import {CellHistoryAction} from '../../components/CellHistoryAction';
import {mountSharedEditTooltip} from '../../components/SharedEditTooltip';
import {ColumnHeader} from '../items/ColumnHeader';
import {ColumnFilterCell,filterValue} from '../items/ColumnFilterCell';
import {CompactGroupFilterCell} from '../items/CompactGroupFilterCell';
import {CompactGroupedValue} from '../items/CompactGroupedValue';
import {activeCompactPairs,compactVisibleColumns,DEFAULT_COMPACT_DISPLAY,readPersonalCompactDisplay} from '../items/compact-columns';
import {statusPaletteTone,type StatusPaletteStore} from '../../data/status-palettes';
import {StatusPaletteManager} from '../items/StatusPaletteManager';
import {CellPicker} from '../items/CellPicker';
import {isStatusDisplayField,projectedStatusFilterRows,statusDisplayValue,statusEditSelection,statusPickerValues,statusFilterText,statusReadOnlyValue} from '../items/status-display';
import {ContentEditor} from '../items/ContentEditor';
import {InlineNoteEditor} from '../items/InlineNoteEditor';
import {LeaseTextInput} from '../items/LeaseTextInput';
import type {CellEditSessionManager} from '../../data/cell-edit-leases';
import {DeferredWidthInput} from '../items/DeferredWidthInput';
import {reorderByKey} from '../../domain/reorder-columns';
import {assignmentIssue} from '../../data/catalogs';
import {popupFieldOptions} from './pr95-l1-popup-options';
import {itemColor,validateColorRules,type ColorRule} from '../../data/list-views';
import {loadDetailPresets,saveDetailPresets,loadDetailColors,saveDetailColors,type ReportDetailPreset} from '../../data/report-detail-presets';

type Props={
  title:string; selectedIds:string[];items:Item[];sourceKey:string;
  catalog:CatalogConfig;
  listLayout?:ItemLayout;
  viewerCompactScope?:string;
  allowDraft:boolean;
  readOnlyViewer?:boolean;
  guestViewer?:boolean;
  canEditCell:(id:string,field:TextField)=>boolean;
  onUpdate:(id:string,changes:Changes)=>void;
  leaseManager?:CellEditSessionManager;
  onKeepDraft:()=>boolean;
  onHistory?:(item:Item)=>void;
  onCellHistory?:(item:Item,field:TextField)=>void;
  onOpenFullList?:()=>void;
  dirtyIds:Set<string>;
  errors:Record<string,string>;
  onClose:()=>void;
  statusPaletteStore?:StatusPaletteStore;
  onStatusPaletteChange?:(next:StatusPaletteStore)=>boolean;
};

export function ReportDetailGrid({title,selectedIds,items,sourceKey,catalog,listLayout,viewerCompactScope,allowDraft,readOnlyViewer=false,guestViewer=false,canEditCell,
  onUpdate,leaseManager,onKeepDraft,onCellHistory,onOpenFullList,dirtyIds,errors,onClose,statusPaletteStore,onStatusPaletteChange}:Props){
  useEffect(()=>mountSharedEditTooltip(),[]);
  // One dialog per click; settings persist separately from both list/report layouts.
  const [applied,setApplied]=useState<DetailGridPreferences>(()=>loadDetailGridPreferences(sourceKey));
  const [pending,setPending]=useState<DetailGridPreferences>(applied);
  const [settings,setSettings]=useState(false);
  const [notice,setNotice]=useState('');
  const [editing,setEditing]=useState(false);
  const [filters,setFilters]=useState<Record<string,string>>({});
  const [sort,setSort]=useState<ColumnSort>(null);
  const [showAll,setShowAll]=useState(false);
  const [contentItem,setContentItem]=useState<{item:Item;field:'content'|'note'|'specificProgress'}|null>(null);
  const openContent=(item:Item,field:'content'|'note'|'specificProgress')=>{
    if(!leaseManager){setContentItem({item,field});return;}
    void leaseManager.acquire(item.recordId,field,'long').then(()=>setContentItem({item,field}))
      .catch(e=>setNotice(e instanceof Error?e.message:'Ô đã có người khác sửa.'));
  };
  const closeContent=()=>{
    if(contentItem&&leaseManager&&!leaseManager.isPending(contentItem.item.recordId,contentItem.field))
      void leaseManager.cancel(contentItem.item.recordId,contentItem.field);
    setContentItem(null);
  };
  const [presets,setPresets]=useState(()=>loadDetailPresets(sourceKey));
  const [selectedPreset,setSelectedPreset]=useState('');
  const [presetName,setPresetName]=useState('');
  const [colors,setColors]=useState<ColorRule[]>(()=>loadDetailColors(sourceKey));
  const [colorField,setColorField]=useState('progressCouncil');
  const [colorValue,setColorValue]=useState('');
  const [color,setColor]=useState<ColorRule['color']>('amber');
  const labelByKey=useMemo(()=>new Map<string,string>(EXCEL_SOURCE_COLUMNS.map(c=>[c.key,
    listLayout?.columns.find(col=>col.key===c.key)?.label??c.label])),[listLayout]);
  const ids=useMemo(()=>new Set(selectedIds),[selectedIds]);
  const subset=useMemo(()=>items.filter(item=>ids.has(item.recordId)),[items,ids]);
  const statusFilterItems=useMemo(()=>projectedStatusFilterRows(subset),[subset]);
  // Preview pending column changes while the settings panel is open.
  const displayedLayout=settings&&!guestViewer?pending:applied;
  const shownColumns=useMemo(()=>displayedLayout.columns.filter(c=>(c.visible||showAll&&!guestViewer)&&
    (c.key!=='stt'||showAll&&!guestViewer||settings&&!guestViewer)),
    [displayedLayout,showAll,settings,guestViewer]);
  // Popup retains its own source configuration; only the ordinary read view
  // projects visible source members into the same groups as the main list.
  const popupCompact=(!settings||guestViewer)&&(!showAll||guestViewer);
  const popupSource=shownColumns.map(c=>({...c,label:labelByKey.get(c.key)??c.key}));
  const popupPrefs={...DEFAULT_COMPACT_DISPLAY,...listLayout?.compactDisplay,
    ...(viewerCompactScope?readPersonalCompactDisplay(viewerCompactScope):null)};
  const popupPairs=popupCompact?activeCompactPairs(popupSource,popupPrefs):[];
  const popupTitles={...listLayout?.groupLabels,...displayedLayout.groupLabels};
  const renderedColumns=popupCompact?compactVisibleColumns(popupSource,popupPrefs,popupTitles):popupSource;
  const gridWidth=renderedColumns.reduce((sum,c)=>sum+c.width,0);
  const [confirmSettingsExit,setConfirmSettingsExit]=useState(false);
  const settingsDirty=settings&&JSON.stringify(pending)!==JSON.stringify(applied);
  const visible=useMemo(()=>{
    return sortItems(subset.filter(item=>{
      return Object.entries(filters).every(([key,value])=>!value.trim()||
        normalizeSearch(statusFilterText(key,filterValue(item,key))).includes(normalizeSearch(value)));
    }),sort);
  },[subset,filters,sort]);
  // Explicitly separate guest read-only report viewing from list edit grants.
  const popupMayEdit=!readOnlyViewer&&allowDraft;
  const editableFields=new Set<string>(TEXT_FIELDS.map(f=>f.key));
  const editable=popupMayEdit&&subset.some(item=>TEXT_FIELDS.some(field=>canEditCell(item.recordId,field.key)));
  const availableWidth=Math.min(2400,Math.max(640,
    (typeof window==='undefined'?1480:window.innerWidth||1480)-20));
  const minDialogWidth=Math.min(640,availableWidth);
  const changeDialogWidth=(width:number)=>{
    // Window sizing is a viewing preference, not permission to edit data.
    if(guestViewer||readOnlyViewer||!Number.isInteger(width)||width<minDialogWidth||width>availableWidth)return;
    if(settings){setPending(old=>({...old,dialogWidth:width}));return;}
    const next={...applied,dialogWidth:width};
    if(!saveDetailGridPreferences(sourceKey,next)){setNotice('Không lưu được độ rộng popup.');return;}
    setApplied(next);setPending(next);
  };
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
    if(guestViewer||readOnlyViewer)return;
    setPending(previous=>({...previous,columns:previous.columns.map(c=>c.key===key?{...c,...changes}:c)}));
  };
  const commitWidth=(key:DetailColumnKey,width:number)=>{
    if(readOnlyViewer||guestViewer)return;
    if(settings){patch(key,{width});return;}
    const next={...applied,columns:applied.columns.map(c=>c.key===key?{...c,width}:c)};
    if(!saveDetailGridPreferences(sourceKey,next)){
      setNotice('Không lưu được độ rộng mới trên trình duyệt. Cột chưa thay đổi.');return;
    }
    setApplied(next);setPending(next);
    setNotice('Đã giữ độ rộng cột của bảng popup trên trình duyệt.');
  };
  const moveHeader=(from:string,to:string)=>{
    if(guestViewer||readOnlyViewer||!settings)return;
    setPending(old=>({...old,columns:reorderByKey(old.columns,c=>c.key,from,to)}));
  };
  const closeSettings=()=>{
    if(settingsDirty){setConfirmSettingsExit(true);return;}
    setSettings(false);
  };
  const toggleSettings=()=>{
    if(readOnlyViewer||guestViewer)return;
    if(settings){closeSettings();return;}
    setPending(applied);setSettings(true);setNotice('');
  };
  const cycleSort=(key:string)=>setSort(old=>old?.key!==key
    ?{key,direction:'asc'}:old.direction==='asc'?{key,direction:'desc'}:null);
  const clearFilters=()=>{setFilters({});setSort(null);};
  const loadPreset=(id:string)=>{
    if(readOnlyViewer||guestViewer)return;
    const next=presets.find(v=>v.id===id);
    if(next){
      setApplied(next.layout);setPending(next.layout);setFilters({...next.filters});
      setColors(next.colors);if(!saveDetailColors(sourceKey,next.colors))setNotice('Không lưu được màu popup trên máy.');setSelectedPreset(id);setShowAll(false);
      setSettings(false);setNotice('Đã áp dụng mẫu hiển thị cá nhân. Bấm Lưu cấu hình cột để đặt làm mặc định.');
    }else{
      const original=loadDetailGridPreferences(sourceKey);
      setApplied(original);setPending(original);setFilters({});setColors([]);
      setSelectedPreset('');setShowAll(false);setNotice('Đã trở về cách hiển thị mặc định của popup.');
    }
  };
  const createPreset=()=>{
    if(readOnlyViewer||guestViewer)return;
    if(!presetName.trim()){setNotice('Nhập tên mẫu trước khi lưu.');return;}
    if(presets.length>=12){setNotice('Đã đạt tối đa 12 mẫu của bảng popup.');return;}
    const next:ReportDetailPreset={id:crypto.randomUUID(),name:presetName.trim().slice(0,60),
      layout:applied,filters,colors};
    const list=[...presets,next];
    if(!saveDetailPresets(sourceKey,list)){setNotice('Không lưu được mẫu trên trình duyệt.');return;}
    setPresets(list);setSelectedPreset(next.id);setPresetName('');setNotice('Đã lưu mẫu popup cá nhân.');
  };
  const updatePreset=()=>{
    if(readOnlyViewer||guestViewer)return;
    if(!selectedPreset)return;
    const list=presets.map(v=>v.id===selectedPreset?{...v,layout:applied,filters,colors}:v);
    if(!saveDetailPresets(sourceKey,list)){setNotice('Không cập nhật được mẫu.');return;}
    setPresets(list);setNotice('Đã cập nhật mẫu cá nhân.');
  };
  const removePreset=()=>{
    if(readOnlyViewer||guestViewer)return;
    if(!selectedPreset)return;
    const list=presets.filter(v=>v.id!==selectedPreset);
    if(!saveDetailPresets(sourceKey,list)){setNotice('Không xóa được mẫu.');return;}
    setPresets(list);setSelectedPreset('');setNotice('Đã xóa mẫu. Cấu hình popup đang hiển thị không đổi.');
  };
  const saveSettings=()=>{
    if(readOnlyViewer||guestViewer)return;
    if(!pending.columns.some(c=>c.visible)){setNotice('Cần giữ ít nhất một cột được hiển thị.');return;}
    // R07: storage *and* live state must use the SAME validated snapshot.
    // Empty/whitespace-only overrides are deleted by the validator, allowing
    // the shared group title to appear immediately, without a reload.
    let valid:DetailGridPreferences;
    try{valid=validateDetailGridPreferences(pending);}
    catch(error){setNotice(error instanceof Error?error.message:'Cấu hình cột không hợp lệ.');return;}
    if(!saveDetailGridPreferences(sourceKey,valid)){setNotice('Chưa lưu được cấu hình cột trên trình duyệt.');return;}
    setApplied(valid);setPending(valid);setSettings(false);
    setNotice('Đã lưu cấu hình cột riêng của bảng chi tiết trên trình duyệt này. Không thay đổi Danh sách nội dung hoặc dữ liệu nguồn.');
  };
  const cell=(item:Item,key:DetailColumnKey):ReactNode=>{
    const raw=String(item[key]??'');
    const shown=statusReadOnlyValue(key as TextField,raw);
    if(key==='displayCode')return <div className="report-grid-id">
      <strong className="code" title={item.displayCode}>{displayId(item)}</strong>

      {dirtyIds.has(item.recordId)&&<small>Chưa lưu</small>}
      {errors[item.recordId]&&<small className="error-text" role="alert">{errors[item.recordId]}</small>}
    </div>;
    if(!editing||!popupMayEdit||!editableFields.has(key)||!canEditCell(item.recordId,key as TextField))
      return statusPaletteTone(key,raw,statusPaletteStore?.active.otherEnabled??false)?<span className="workflow-status-value">{shown}</span>:shown||'—';
    const field=key as TextField;
    if(field==='note'||field==='specificProgress')return <InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field={field} value={raw}
      label={'Sửa '+(labelByKey.get(key)??field)+' · '+displayId(item)} onCommit={value=>{
        if(!editing||!popupMayEdit||!canEditCell(item.recordId,field))return false;
        onUpdate(item.recordId,{[field]:value});return true;
      }}/>;
    if(field==='content')
      return <button type="button" className="cell-value-button"
        aria-label={'Sửa '+labelByKey.get(key)+' · '+displayId(item)}
        onClick={()=>openContent(item,field)}>{raw||'—'}</button>;
    if(!isStatusDisplayField(field)&&listLayout?.columns.find(c=>c.key===key)?.kind==='text')
      return <LeaseTextInput manager={leaseManager} id={item.recordId} field={field}
        label={labelByKey.get(key)+' · '+displayId(item)} value={raw}
        onChange={value=>{if(editing&&popupMayEdit&&canEditCell(item.recordId,field))onUpdate(item.recordId,{[field]:value});}}/>;
    return <CellPicker leaseManager={leaseManager} recordId={item.recordId} field={field} editorKind={field==='specialist'?'search':'status'} label={labelByKey.get(key)+' · '+displayId(item)} value={statusDisplayValue(field,raw)}
      displayValue={isStatusDisplayField(field)?shown:undefined}
      searchable={field==='specialist'} options={statusPickerValues(field,popupFieldOptions(field,raw,catalog).filter(value=>
        field!=='specialist'||value===item.specialist||!item.room||
        !value||catalog.specialistRooms[value]?.includes(item.room)))}
      onChange={value=>{if(!editing||!popupMayEdit||!canEditCell(item.recordId,field))return;
        const next=statusEditSelection(field,raw,value);if(next!==null)onUpdate(item.recordId,{[field]:next});}}/>;
  };
  const inGroupDirty=subset.filter(item=>dirtyIds.has(item.recordId)).length;
  const canClose=()=>{
    if(settingsDirty){setConfirmSettingsExit(true);return;}
    onClose();
  };
  return <Modal title={title} onClose={canClose} className="report-detail-modal report-grid-modal"
    style={{'--report-grid-window-width':`${displayedLayout.dialogWidth}px`} as CSSProperties}>
    <div className="report-grid-toolbar">
      <div className="report-grid-summary">
        <strong>{selectedIds.length} nội dung trong ô báo cáo</strong>
        <span className="muted">Đang hiển thị {visible.length} nội dung · {renderedColumns.length}/15 cột nguồn</span>
        {inGroupDirty>0&&<span className="report-grid-draft">Có {inGroupDirty} nội dung đang sửa nháp</span>}
      </div>
      {!readOnlyViewer&&<div className="report-grid-actions">
        {!guestViewer&&<button type="button" className="button ghost" aria-pressed={showAll}
          onClick={()=>setShowAll(v=>!v)}>{showAll?'Theo cột đã chọn':'Hiện đủ cột Excel'}</button>}
        {!guestViewer&&<button type="button" className="button ghost" onClick={clearFilters}
          disabled={Object.keys(filters).length===0&&!sort}>Xóa bộ lọc</button>}
        {!guestViewer&&<label className="report-grid-quick-width">Rộng popup
          <DeferredWidthInput label="Độ rộng toàn popup (px)"
            min={minDialogWidth} max={availableWidth}
            value={Math.min(displayedLayout.dialogWidth,availableWidth)}
            onCommit={changeDialogWidth}/>
          <span>px</span>
        </label>}
        {!guestViewer&&statusPaletteStore&&onStatusPaletteChange&&<StatusPaletteManager compact
          store={statusPaletteStore} onStoreChange={onStatusPaletteChange}/>}
        {!guestViewer&&<button type="button" className="button ghost" aria-expanded={settings}
          onClick={toggleSettings}>Cấu hình popup / cột</button>}
        {!readOnlyViewer&&editable&&<button type="button" className="button ghost" aria-pressed={editing}
          onClick={()=>{if(editing)setSort(null);setEditing(!editing);}}>{editing?'Về chế độ xem':'Chỉnh sửa nháp'}</button>}
        {!guestViewer&&onOpenFullList&&<button type="button" className="button ghost"
          onClick={onOpenFullList}>Mở Danh sách dữ liệu</button>}
      </div>}
    </div>
    {!readOnlyViewer&&!guestViewer&&<div className="report-grid-presets" role="group" aria-label="Mẫu hiển thị riêng của bảng popup">
      <label>Mẫu bảng popup <select aria-label="Mẫu hiển thị popup" value={selectedPreset}
        onChange={e=>loadPreset(e.target.value)}>
        <option value="">Mặc định</option>
        {presets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select></label>
      <label>Tên mẫu mới <input type="text" maxLength={60} value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Ví dụ: Tiến độ nghị quyết"/></label>
      <button type="button" className="button ghost" disabled={!presetName.trim()||presets.length>=12}
        onClick={createPreset}>Lưu mẫu mới</button>
      {selectedPreset&&<><button type="button" className="button ghost"
        onClick={updatePreset}>Cập nhật mẫu</button>
        <button type="button" className="button ghost" onClick={removePreset}>Xóa mẫu</button></>}
    </div>}
    {!readOnlyViewer&&!guestViewer&&settings&&<section className="report-grid-settings" aria-label="Tùy chỉnh cột bảng chi tiết">
      <div className="report-grid-settings-intro">
        <strong>Cột của bảng chi tiết (độc lập)</strong>
        <p>Chọn hiện/ẩn, kéo mép phải của tiêu đề cột để chỉnh độ rộng trực tiếp (hoặc nhập px bên dưới), giữ/kéo tiêu đề để chuyển cột, dùng Alt+←/→. Thay đổi đang xem trước và chỉ lưu khi chọn Lưu cấu hình cột. Thiết lập riêng của popup.</p>
      </div>
      <div className="report-grid-window-width-control">
        <label htmlFor="report-grid-dialog-width">Độ rộng toàn cửa sổ popup</label>
        <DeferredWidthInput id="report-grid-dialog-width" label="Độ rộng toàn cửa sổ popup (px)"
          min={640} max={2400} value={pending.dialogWidth}
          onCommit={width=>setPending(previous=>({...previous,dialogWidth:width}))}/>
        <span>px</span>
        <span className="muted">Nhấn Enter hoặc rời ô để xem trước; Lưu cấu hình cột để ghi nhớ. Không thay đổi từng lần gõ.</span>
      </div>
      <details className="report-grid-group-labels">
         <summary>Đổi tên cột gộp trong popup</summary>
         <p className="muted">Tên riêng cho popup; nếu chưa nhập, dùng tên nhóm từ Danh sách. Không đổi tên Excel hoặc nhãn trong ô.</p>
         {COMPACT_GROUP_LABEL_KEYS.map(key=><div className="group-label-editor-row" key={key}>
           <label className="field">{COMPACT_GROUP_DEFAULT_LABELS[key]}
             <input type="text" maxLength={100} aria-label={'Tên nhóm popup '+key}
               value={pending.groupLabels?.[key]??''}
               placeholder={listLayout?.groupLabels?.[key]??COMPACT_GROUP_DEFAULT_LABELS[key]}
               onChange={e=>setPending(prev=>({...prev,groupLabels:{...(prev.groupLabels??{}),[key]:e.currentTarget.value}}))}/>
           </label>
           <button type="button" className="button ghost" disabled={!pending.groupLabels?.[key]}
             onClick={()=>setPending(prev=>{const next={...(prev.groupLabels??{})};delete next[key];return {...prev,groupLabels:next};})}>Khôi phục</button>
         </div>)}
       </details>
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
        <button type="button" className="button ghost" onClick={closeSettings}>Đóng tùy chỉnh</button>
        <button type="button" className="button primary" onClick={saveSettings} disabled={!pending.columns.some(c=>c.visible)}>Lưu cấu hình cột</button>
      </div>
      <details className="report-grid-color-config">
        <summary>Màu theo điều kiện (chỉ trong bảng popup · {colors.length} quy tắc)</summary>
        <div className="report-grid-color-editor">
          <label>Cột <select value={colorField} onChange={e=>setColorField(e.target.value)}>
            {EXCEL_SOURCE_COLUMNS.map(c=><option key={c.key} value={c.key}>{c.label}</option>)}
          </select></label>
          <label>Giá trị bằng <input maxLength={200} value={colorValue} onChange={e=>setColorValue(e.target.value)} placeholder="Giá trị đúng"/></label>
          <label>Màu <select value={color} onChange={e=>setColor(e.target.value as ColorRule['color'])}>
            <option value="mint">Xanh lá</option><option value="amber">Vàng</option>
            <option value="rose">Đỏ nhạt</option><option value="blue">Xanh dương</option>
          </select></label>
          <button type="button" className="button ghost" disabled={!colorValue.trim()||colors.length>=30}
            onClick={()=>{const next=validateColorRules([...colors,{
              id:crypto.randomUUID(),field:colorField,value:colorValue.trim(),color
            }]);if(saveDetailColors(sourceKey,next)){setColors(next);setColorValue('');}else setNotice('Không lưu được màu popup trên trình duyệt.');}}>Thêm quy tắc</button>
        </div>
        {colors.map(rule=><span className="report-grid-color-chip" key={rule.id}>
          {labelByKey.get(rule.field)} = {rule.value} · {rule.color}
          <button type="button" aria-label={'Xóa màu '+rule.value}
            onClick={()=>{const next=colors.filter(v=>v.id!==rule.id);if(saveDetailColors(sourceKey,next))setColors(next);else setNotice('Không lưu được thay đổi màu popup.');}}>×</button>
        </span>)}
        <p className="muted">Màu của popup được tự lưu riêng trên trình duyệt khi thêm/xóa; cũng được lưu trong mẫu cá nhân. Không ảnh hưởng màu của Danh sách hoặc báo cáo.</p>
      </details>
    </section>}
    {!readOnlyViewer&&!guestViewer&&confirmSettingsExit&&<div className="report-grid-settings-confirm" role="alertdialog" aria-label="Có thay đổi cột chưa lưu">
      <strong>Cột của popup có thay đổi chưa lưu.</strong>
      <button type="button" className="button ghost" onClick={()=>setConfirmSettingsExit(false)}>Tiếp tục tùy chỉnh</button>
      <button type="button" className="button ghost" onClick={()=>{
        setPending(applied);setSettings(false);setConfirmSettingsExit(false);
      }}>Bỏ thay đổi cột</button>
      <button type="button" className="button primary" onClick={()=>{
        saveSettings();setConfirmSettingsExit(false);
      }}>Lưu cấu hình cột</button>
    </div>}
    {(!readOnlyViewer||notice)&&<div className="report-grid-notices">
      {!readOnlyViewer&&<p className="muted" role="status">{editing&&editable
        ?'Đang sửa nháp: chỉ những ô được cấp quyền mới có thể sửa. Chưa ghi Excel/Firebase.'
        :'Chế độ xem: chỉ ô được cấp quyền mới có thể bật sửa nháp.'}</p>}
      {notice&&<p className="notice" role="status">{notice}</p>}
    </div>}
    <div className="report-grid-scroll" role="region" tabIndex={0} aria-label="Bảng chi tiết các nội dung trong ô báo cáo">
      <table className="data-table report-detail-grid"
        style={{width:gridWidth+'px',minWidth:gridWidth+'px',tableLayout:'fixed'}}>
        <colgroup>{renderedColumns.map(c=><col key={c.key} style={{width:c.width+'px'}}/>)}</colgroup>
        <thead>
          <tr className="report-grid-heading-row">{renderedColumns.map((c,index)=>
            <ColumnHeader key={c.key} columnKey={c.key} sortLabel={c.label}
              sortDirection={sort?.key===c.key?sort.direction:null} onSort={cycleSort}
              disabled={!settings} previousKey={renderedColumns[index-1]?.key}
              nextKey={renderedColumns[index+1]?.key} onMove={moveHeader}>
              {c.label}
              {!readOnlyViewer&&!guestViewer&&<ColumnResizeHandle columnIndex={index} label={labelByKey.get(c.key)??c.key}
                width={c.width} min={70+(popupPairs.find(p=>p.anchor===c.key)?.extraWidth??0)}
                max={800+(popupPairs.find(p=>p.anchor===c.key)?.extraWidth??0)} windowDragFallback
                onCommit={width=>commitWidth(c.key as DetailColumnKey,width-(popupPairs.find(p=>p.anchor===c.key)?.extraWidth??0))}/>}
            </ColumnHeader>)}</tr>
          <tr className="report-grid-filter-row">{renderedColumns.map(c=>popupPairs.some(pair=>pair.anchor===c.key&&
              (pair.variant==='contentDetails'||pair.variant==='partyTogether'))
            ?<CompactGroupFilterCell key={c.key} items={statusFilterItems}
              fields={popupPairs.find(pair=>pair.anchor===c.key)!.memberFields}
              values={filters} onChange={(field,value)=>setFilters(old=>{
                const next={...old};if(value)next[field]=value;else delete next[field];return next;
              })}/>
            :<ColumnFilterCell key={c.key} field={c.key} label={labelByKey.get(c.key)??c.key}
              items={statusFilterItems} value={filters[c.key]??''} onChange={value=>setFilters(old=>{
                const next={...old};if(value)next[c.key]=value;else delete next[c.key];return next;
              })}/>)}</tr>
        </thead>
        <tbody>
          {visible.map(item=><tr key={item.recordId} className={[itemColor(item,colors)?'report-grid-color-'+itemColor(item,colors):''].join(' ')}>
            {renderedColumns.map(c=>{const pair=popupPairs.find(p=>p.anchor===c.key);const writable=editing&&popupMayEdit&&editableFields.has(c.key)&&
              canEditCell(item.recordId,c.key as TextField);
              const showCellHistory=!!onCellHistory&&(c.key==='note'||c.key==='specificProgress');
              const showRowHistory=false;
              return <td key={c.key} data-col-key={c.key}
                data-progress-tone={statusPaletteTone(c.key,item[c.key as DetailColumnKey],statusPaletteStore?.active.otherEnabled??false)??undefined}
                className={[writable?'editable-cell':'',showCellHistory||showRowHistory?'has-history-action':''].filter(Boolean).join(' ')}
                data-edit-hint={writable?'Bấm để sửa':undefined}
                style={pair?undefined:cellHighlightStyle(item[c.key as DetailColumnKey],c.key,listLayout?.cellHighlights)}>
                {pair?<CompactGroupedValue item={item} pair={pair}
                  field={field=>cell(item,field as DetailColumnKey)} editable={field=>editing&&popupMayEdit&&canEditCell(item.recordId,field)}
                  tone={field=>statusPaletteTone(field,item[field],statusPaletteStore?.active.otherEnabled??false)??undefined}
                  highlight={field=>cellHighlightStyle(item[field],field,listLayout?.cellHighlights)}
                  cvRoomInline={popupPrefs.cvRoomInline}/>:cell(item,c.key as DetailColumnKey)}
                {showCellHistory&&<CellHistoryAction label={(labelByKey.get(c.key)??c.key)+' · '+displayId(item)}
                  onClick={()=>onCellHistory!(item,c.key as TextField)}/>}
                {c.key==='specialist'&&assignmentIssue(item,catalog)&&
              <small className="warning-text">{assignmentIssue(item,catalog)}</small>}</td>;})}
          </tr>)}
          {!visible.length&&<tr><td colSpan={renderedColumns.length} className="empty">Không có nội dung phù hợp với bộ lọc.</td></tr>}
        </tbody>
      </table>
    </div>
    <div className="modal-footer report-grid-footer">
      {!readOnlyViewer&&<span className="muted">Nháp ở đây và tại Danh sách nội dung dùng chung. Báo cáo chỉ tính theo dữ liệu nguồn đã xác nhận.</span>}
      <button type="button" className="button ghost" onClick={canClose}>Đóng</button>
      {!readOnlyViewer&&inGroupDirty>0&&<button type="button" className="button primary" onClick={()=>{
        setNotice(onKeepDraft()?'Đã giữ nháp trên trình duyệt, chưa ghi Excel/Firebase.':'Chưa lưu được nháp trên trình duyệt. Không đóng trang để tránh mất thay đổi.');
      }}>Giữ nháp trên máy</button>}
    </div>
    {!readOnlyViewer&&contentItem&&<ContentEditor key={contentItem.item.recordId+':'+contentItem.field}
      sourceKey={sourceKey} item={contentItem.item} field={contentItem.field}
      draftOnly={!leaseManager} sourceKind={leaseManager?'firebase':'google'} onSave={value=>{
        if(!editing||!popupMayEdit||!canEditCell(contentItem.item.recordId,contentItem.field)){
          setNotice('Ô này hiện không được cấp quyền sửa; nội dung chưa áp dụng.');
          return false;
        }
        onUpdate(contentItem.item.recordId,{[contentItem.field]:value});return true;
      }}
      onClose={closeContent}/>}
  </Modal>;
}
