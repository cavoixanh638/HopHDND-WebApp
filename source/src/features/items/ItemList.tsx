import { useEffect, useMemo, useRef, useState } from 'react';
import type { Changes, Item, Patch, TextField, EditableField, ReportConfig } from '../../../shared/types';
import { TEXT_FIELDS, STATUS_OPTIONS } from '../../../shared/field-definitions';
import { ContentEditor } from './ContentEditor';
import {InlineNoteEditor} from './InlineNoteEditor';
import { displayId, isMissingDisplayCode } from '../../domain/display-id';
import { EXCEL_COLUMN_KEYS, cellHighlightStyle, overlayPersonalLayout, defaultItemLayout, loadItemLayout, saveItemLayout, validateItemLayout } from '../../data/item-preferences';
import {normalizeSearch} from '../../domain/search';
import {SearchHighlight} from './SearchHighlight';
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
import {ColumnFilterCell,filterValue} from './ColumnFilterCell';
import {RoomSpecialistFilterCell} from './RoomSpecialistFilterCell';
import {statusPaletteTone,type StatusPaletteStore} from '../../data/status-palettes';
import {StatusPaletteManager} from './StatusPaletteManager';
import {COMPACT_OPTIONS,activeCompactPairs,
  compactVisibleColumns,compactFilterText,abbreviateVietnameseName,abbreviateLeaderName,compactTypeTone,DEFAULT_COMPACT_DISPLAY,toggleCompactOption,readPersonalCompactDisplay,writePersonalCompactDisplay,clearPersonalCompactDisplay,type CompactDisplay,type CompactOption} from './compact-columns';
import { CellPicker } from './CellPicker';
import {LeaseTextInput} from './LeaseTextInput';
import type {CellEditSessionManager} from '../../data/cell-edit-leases';
import {activateEditableCell} from './activate-editable-cell';
import { reorderByKey } from '../../domain/reorder-columns';
import type {CellPermissions} from '../../data/firebase-repository';
import {InlinePermissionsTable} from './InlinePermissionsTable';
import './item-frame.css';
import './executive-layout.css';
import { ExecutiveProgressCards, getExecutiveCards, filterByExecutiveStage, type ExecutiveFilter } from './ExecutiveProgressCards';
import { ExecutiveDetailTable } from './ExecutiveDetailTable';
import {ListViewTools} from './ListViewTools';
import {sortItems,type ColumnSort} from '../../domain/sort-items';
import {ColumnResizeHandle} from '../../components/ColumnResizeHandle';
import {resizeWithLastColumn,trailingWidthBounds} from '../../data/resize-last-column';
import {mountSharedEditTooltip} from '../../components/SharedEditTooltip';
import {CellHistoryAction} from '../../components/CellHistoryAction';
import {emptyListFilters,loadListViews,loadActiveListView,loadColorRules,saveColorRules,itemColor,type SavedListView,type ColorRule} from '../../data/list-views';

export function ItemList({ items, drafts, errors, busy, onUpdate, onCellHistory, readOnly = false, sourceKind, customizing = false, sourceKey, catalog, onClose, onSaveData, onDiscardData, onLayoutSaved,initialLayout,onPersistLayout,canEditDraft=true,layoutSaveLabel='Lưu cách hiển thị',saveDataHint='',onKeepDraft,canEditCell,allowLayout=true,dataSaving=false,sourceLabel,draftOnly=false,permissions,onSavePermissions,onReloadPermissions,onFrameWidthChange,anonymousViewer=false,onDirtyChange,exitRequest=0,permissionModeOnly=false,externalSectionTabs=false,onOpenCatalog,onPersistCatalog,statusPaletteStore,onStatusPaletteChange,onPersistViewerLayout,leaseManager,viewerScope='browser',allowPersonalCompact=false,reportConfigs=[],summaryItems }: { items: Item[]; drafts: Record<string, Patch>; errors: Record<string, string>; busy: boolean; onUpdate: (id: string, changes: Changes) => void; onHistory: (item: Item) => void; onCellHistory?:(item:Item,field:TextField)=>void; readOnly?: boolean; sourceKind?: 'demo'|'google'|'firebase'; customizing?: boolean; sourceKey:string; catalog:CatalogConfig; onClose:()=>void; onSaveData:()=>Promise<boolean>; onDiscardData:()=>void; onLayoutSaved:(message:string)=>void;initialLayout?:ItemLayout;onPersistLayout?:(layout:ItemLayout,baseline?:ItemLayout,choices?:LayoutConflictChoices)=>Promise<ItemLayout|void>;canEditDraft?:boolean;layoutSaveLabel?:string;saveDataHint?:string;onKeepDraft?:()=>boolean;canEditCell?:(id:string,field:EditableField)=>boolean;allowLayout?:boolean;dataSaving?:boolean;sourceLabel?:string;draftOnly?:boolean;permissions?:CellPermissions;onSavePermissions?:(next:CellPermissions,expected:CellPermissions)=>Promise<void>;onReloadPermissions?:()=>Promise<CellPermissions>;onFrameWidthChange?:(width:'auto'|number)=>void; anonymousViewer?:boolean;onDirtyChange?:(dirty:boolean)=>void;exitRequest?:number;permissionModeOnly?:boolean;externalSectionTabs?:boolean;onOpenCatalog?:(key:string)=>void;onPersistCatalog?:(next:CatalogConfig)=>Promise<void>;statusPaletteStore?:StatusPaletteStore;onStatusPaletteChange?:(next:StatusPaletteStore)=>boolean;onPersistViewerLayout?:(layout:ItemLayout,baseline:ItemLayout)=>Promise<ItemLayout|void>;leaseManager?:CellEditSessionManager;viewerScope?:string;allowPersonalCompact?:boolean;reportConfigs?:ReportConfig[];summaryItems?:Item[] }) {
  useEffect(()=>mountSharedEditTooltip(),[]);
  const openContentForEdit=(item:Item,field:'content')=>{
    if(!leaseManager){setContentItem({item,field});return;}
    void leaseManager.acquire(item.recordId,field,'long').then(()=>setContentItem({item,field}))
      .catch(e=>onLayoutSaved(e instanceof Error?e.message:'Ô đang có người khác sửa.'));
  };
  const closeContentEditor=()=>{
    if(contentItem&&leaseManager&&!leaseManager.isPending(contentItem.item.recordId,contentItem.field))
      void leaseManager.cancel(contentItem.item.recordId,contentItem.field);
    setContentItem(null);
  };
  const personalScope=layoutRecoveryScope(sourceKey);
  // Display-only choices are scoped to the source and the current Firebase UID.
  const viewerCompactScope=layoutRecoveryScope('viewer-compact:'+sourceKey+':'+viewerScope);
  const [personalCompact,setPersonalCompact]=useState<CompactDisplay|null>(()=>
    readPersonalCompactDisplay(viewerCompactScope));
  const [compactStorageWarning,setCompactStorageWarning]=useState('');
  useEffect(()=>{
    setPersonalCompact(readPersonalCompactDisplay(viewerCompactScope));
    setCompactStorageWarning('');
  },[viewerCompactScope]);
  const selectedView=allowLayout?loadListViews(personalScope).find(v=>v.id===loadActiveListView(personalScope)):undefined;
  const [columnFilters,setColumnFilters]=useState<Record<string,string>>(selectedView?.filters.columns??{});
  const [columnSort,setColumnSort]=useState<ColumnSort>(null);
  const [personalViewActive,setPersonalViewActive]=useState(!!selectedView);
  // An ordinary viewer should immediately see every A–R source field. Saved
  // column settings remain available without a Firebase write.
  // A previously saved visible/hidden column selection wins on the first paint.
  const [showAllSourceColumns,setShowAllSourceColumns]=useState(false);
  const [showExecutive,setShowExecutive]=useState(true);
  const [executiveSearch,setExecutiveSearch]=useState('');
  const [executiveFilter,setExecutiveFilter]=useState<ExecutiveFilter>(null);
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
  // Only admin writes the shared Firebase layout; all other viewers get local preferences.
  const shareCompact=allowLayout&&!!onPersistViewerLayout&&!anonymousViewer&&!personalViewActive;
  const compactDisplay=customizing||shareCompact?activeLayout.compactDisplay??DEFAULT_COMPACT_DISPLAY:
    personalCompact??activeLayout.compactDisplay??DEFAULT_COMPACT_DISPLAY;
  // The viewer already receives the exact first-frame width from App. Avoid
  // a post-paint callback that can override the saved CSS with stale values.
  useEffect(()=>{if(customizing)onFrameWidthChange?.(activeLayout.frameWidth??'auto');},[customizing,activeLayout.frameWidth,onFrameWidthChange]);
  const columns = activeLayout.columns
    .filter(column=>!column.removed&&(EXCEL_COLUMN_KEYS.includes(column.key)||column.origin==='custom')&&
      (column.visible||(!customizing&&showAllSourceColumns&&EXCEL_COLUMN_KEYS.includes(column.key))))
    .sort((a,b)=>!customizing&&showAllSourceColumns
      ?(EXCEL_COLUMN_KEYS.includes(a.key)?EXCEL_COLUMN_KEYS.indexOf(a.key):1000+activeLayout.columns.indexOf(a))-
       (EXCEL_COLUMN_KEYS.includes(b.key)?EXCEL_COLUMN_KEYS.indexOf(b.key):1000+activeLayout.columns.indexOf(b))
      :0);
  // Visual projection only; administrative configuration keeps every Excel source field.
  const executiveMode=!customizing&&!showAllSourceColumns&&(anonymousViewer||showExecutive);
  const compactOn=(!customizing||anonymousViewer)&&!showAllSourceColumns;
  const compactPairs=compactOn?activeCompactPairs(columns,compactDisplay):[];
  const displayedColumns=compactOn?compactVisibleColumns(columns,compactDisplay):columns;
  const compactHiddenKeys=compactPairs.flatMap(pair=>pair.hiddenFields.filter(key=>!(pair.variant==='roomSpecialist'&&key==='specialist'))).join('|');
  // Prevent a saved filter for a now-merged hidden field from silently filtering rows.
  useEffect(()=>{
    if(!compactHiddenKeys)return;
    const hidden=new Set(compactHiddenKeys.split('|'));
    setColumnFilters(prev=>{
      const remaining=Object.entries(prev).filter(([key])=>!hidden.has(key));
      return remaining.length===Object.keys(prev).length?prev:Object.fromEntries(remaining);
    });
  },[compactHiddenKeys]);
  const updateCompact=(option:CompactOption,checked:boolean)=>{
    const next=toggleCompactOption(compactDisplay,option,checked);
    if(customizing){
      if(!allowLayout)return;
      setLayout(previous=>({...previous,compactDisplay:next}));
    }else if(shareCompact){
      void applyViewerLayout(previous=>({...previous,compactDisplay:next}));
    }else{
      setPersonalCompact(next);
      setCompactStorageWarning(writePersonalCompactDisplay(viewerCompactScope,next)?'':
        'Trình duyệt không cho lưu lựa chọn. Tùy chọn vẫn có hiệu lực trong phiên đang mở.');
    }
    const hidden=new Set<string>(activeCompactPairs(columns,next).flatMap(pair=>pair.hiddenFields.filter(key=>!(pair.variant==='roomSpecialist'&&key==='specialist'))));
    setColumnFilters(prev=>{
      const entries=Object.entries(prev).filter(([key])=>!hidden.has(key));
      return entries.length===Object.keys(prev).length?prev:Object.fromEntries(entries);
    });
  };
  const [confirmExit,setConfirmExit] = useState(false);
  const [layoutError,setLayoutError] = useState('');
  const [layoutConflicts,setLayoutConflicts] = useState<LayoutFieldConflict[]>([]);
  const [conflictChoices,setConflictChoices] = useState<LayoutConflictChoices>({});
  const [saveFeedback,setSaveFeedback] = useState('');
  const [allSpecialists,setAllSpecialists] = useState(false);
  const [saving,setSaving] = useState(false);
  const [viewSaving,setViewSaving]=useState(false);
  const viewSavingRef=useRef(false);
  const [permissionMode,setPermissionMode] = useState(permissionModeOnly);
  const [permissionSwitchRequest,setPermissionSwitchRequest] = useState(0);
  const [permissionDirty,setPermissionDirty] = useState(false);
  const [columnExtrasDirty,setColumnExtrasDirty]=useState(false);
  const exitAfterPermissions=useRef(false);
  const handledExitRequest=useRef(exitRequest);
  useEffect(()=>{onDirtyChange?.(customizing&&(dirty||permissionDirty||columnExtrasDirty));},[customizing,dirty,permissionDirty,columnExtrasDirty,onDirtyChange]);
  const locked=busy||saving||viewSaving||!!unmatchedCheckpoint&&customizing;
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
  const [contentItem, setContentItem] = useState<{item:Item;field:"content"|"note"|"specificProgress"} | null>(null);
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
  // Small source (normally ~55 rows): normalize every source value ONCE per
  // data/layout change rather than for every keystroke and every table cell.
  // Retain full original strings for display, editing and Vietnamese highlights.
  const filterIndex=useMemo(()=>{
    const result=new Map<string,Record<string,string>>();
    for(const item of items){
      const fields:Record<string,string>={};
      for(const key of EXCEL_COLUMN_KEYS)fields[key]=normalizeSearch(filterValue(item,key));
      for(const pair of compactPairs)
        fields['merged:'+pair.anchor]=normalizeSearch(compactFilterText(item,pair.anchor,compactPairs));
      for(const column of activeLayout.columns)
        if(column.origin==='custom')
          fields[column.key]=normalizeSearch(column.values?.[customRowKey(item)]??'');
      result.set(item.recordId,fields);
    }
    return result;
  },[items,activeLayout.columns,codeCounts,compactOn,compactDisplay,showAllSourceColumns]);
  const filtered=useMemo(()=>{
    const hidden=new Set<string>(compactPairs.flatMap(pair=>pair.hiddenFields));
    const roomSpecialist=compactPairs.some(pair=>pair.variant==='roomSpecialist');
    const anchors=new Set<string>(compactPairs.map(pair=>pair.anchor));
    const ordinary=Object.entries(columnFilters)
      .filter(([key,term])=>EXCEL_COLUMN_KEYS.includes(key)&&!hidden.has(key)&&!anchors.has(key)&&term.trim())
      .map(([key,term])=>({key,term:normalizeSearch(term)}));
    const roomTerm=roomSpecialist?(columnFilters.room??''):'';
    const personTerm=roomSpecialist?normalizeSearch(columnFilters.specialist??''):'';
    const merged=compactPairs.flatMap(pair=>pair.variant!=='roomSpecialist'&&columnFilters[pair.anchor]?.trim()
      ?[{key:'merged:'+pair.anchor,term:normalizeSearch(columnFilters[pair.anchor])}]:[]);
    const custom=Object.entries(columnFilters).flatMap(([key,term])=>
      term.trim()&&activeLayout.columns.some(column=>column.key===key&&column.origin==='custom')
        ?[{key,term:normalizeSearch(term)}]:[]);
    return items.filter(item=>{
      const values=filterIndex.get(item.recordId);
      if(!values)return false;
      return ordinary.every(({key,term})=>values[key]?.includes(term))&&
        (!roomTerm||item.room===roomTerm)&&
        (!personTerm||values.specialist?.includes(personTerm))&&
        merged.every(({key,term})=>values[key]?.includes(term))&&
        custom.every(({key,term})=>values[key]?.includes(term));
    });
  },[items,columnFilters,activeLayout.columns,compactOn,compactDisplay,showAllSourceColumns,filterIndex]);
  const rows=useMemo(()=>sortItems(filtered,columnSort,(item,key)=>{
    const column=activeLayout.columns.find(c=>c.key===key&&c.origin==='custom');
    return column?.values?.[customRowKey(item)]??'';
  }),[filtered,columnSort,activeLayout,codeCounts]);
  const executiveCards=getExecutiveCards(summaryItems??items,reportConfigs);
  const executiveRows=filterByExecutiveStage(rows,executiveCards,executiveFilter).filter(item=>{
    const term=normalizeSearch(executiveSearch);
    if(!term)return true;
    return activeLayout.columns.filter(column=>column.visible&&!column.removed)
      .map(column=>column.key==='displayCode'?displayId(item):
        column.origin==='custom'?(column.values?.[customRowKey(item)]??''):
          String(item[column.key as keyof Item]??''))
      .some(value=>normalizeSearch(value).includes(term));
  });
  const executiveFields=new Set(activeLayout.columns.filter(column=>column.visible&&!column.removed).map(column=>column.key));
  const cycleSort=(key:string)=>setColumnSort(current=>
    current?.key!==key?{key,direction:'asc'}:current.direction==='asc'?{key,direction:'desc'}:null);
  // CellPicker option lists used to be sorted once PER CELL PER KEYSTROKE.
  const optionCache=useMemo(()=>new Map<string,string[]>(),[catalog,items,allSpecialists]);
  const options = (field: TextField,item:Item) => {
    const cacheKey=item.recordId+'|'+field;
    const cached=optionCache.get(cacheKey);
    if(cached)return cached;
    const list=field in catalog.options?catalog.options[field as CatalogKey]:field in STATUS_OPTIONS?STATUS_OPTIONS[field as keyof typeof STATUS_OPTIONS]:[];
    const selected=orderValues([...new Set([...list,item[field]])].filter(Boolean),list)
      .filter(value=>field!=='specialist'||allSpecialists||value===item.specialist||!item.room||catalog.specialistRooms[value]?.includes(item.room));
    optionCache.set(cacheKey,selected);
    return selected;
  };
  const aliasCounts = useMemo(()=>{const counts=new Map<string,number>();items.filter(item=>!isMissingDisplayCode(item.displayCode)).forEach(item=>counts.set(displayId(item),(counts.get(displayId(item))??0)+1));return counts;},[items]);
  const visualWidth=(value:number)=>Math.min(1600,Math.max(60,Number.isFinite(value)?value:170));
  const shownWidth=displayedColumns.reduce((sum,column)=>sum+visualWidth(column.width),0);
  const tableWidth=compactPairs.length?Math.max(500,shownWidth):
    Math.max(Math.min(6000,Math.max(500,Number.isFinite(activeLayout.tableWidth)?activeLayout.tableWidth:1500)),shownWidth);
  // Admin can commit a one-shot shared layout change in view mode; the Firebase
  // merge/CAS logic always compares the original shared layout, not local presets.
  const canViewerArrange=!customizing&&!anonymousViewer&&!!onPersistViewerLayout&&
    !personalViewActive&&!showAllSourceColumns&&!locked;
  const applyViewerLayout=async(transform:(base:ItemLayout)=>ItemLayout)=>{
    if(!canViewerArrange||viewSavingRef.current||!onPersistViewerLayout||!initialLayout)return;
    const baseline=initialLayout;
    let next:ItemLayout;
    try{next=validateItemLayout(transform(baseline));}
    catch(error){setLayoutError(error instanceof Error?error.message:'Cấu hình cột không hợp lệ.');return;}
    if(JSON.stringify(next)===JSON.stringify(baseline))return;
    viewSavingRef.current=true;setViewSaving(true);setLayoutError('');
    setSaveFeedback('Đang lưu vị trí/độ rộng cột dùng chung…');
    setApplied(next); // optimistic only; revert on any failure
    try{
      const confirmed=await onPersistViewerLayout(next,baseline);
      const valid=validateItemLayout(confirmed??next);
      setApplied(valid);sharedBase.current=valid;
      setSaveFeedback('Đã lưu bố trí cột dùng chung. Các tài khoản khác nhận khi cập nhật cấu hình.');
    }catch(error){
      setApplied(initialLayout);
      setLayoutError(saveIssue(error));
      setSaveFeedback('Không lưu được vị trí/độ rộng. Đã hoàn lại bố trí trước thao tác.');
    }finally{viewSavingRef.current=false;setViewSaving(false);}
  };
  const moveColumn=(from:string,to:string)=>{
    if(customizing){if(locked||!allowLayout)return;
      setLayout(previous=>({...previous,columns:reorderByKey(previous.columns,column=>column.key,from,to)}));return;
    }
    void applyViewerLayout(base=>({...base,columns:reorderByKey(base.columns,column=>column.key,from,to)}));
  };
  const applyView=(view:SavedListView|null):boolean=>{
    if(dirty||pendingData)return false;
    const filters=view?.filters??emptyListFilters(),nextLayout=view?overlayPersonalLayout(initialLayout??loadItemLayout(sourceKey),view.layout):initialLayout??loadItemLayout(sourceKey);
    const hidden=new Set<string>(activeCompactPairs(nextLayout.columns.filter(c=>c.visible&&!c.removed),nextLayout.compactDisplay??DEFAULT_COMPACT_DISPLAY)
      .flatMap(pair=>pair.hiddenFields.filter(key=>!(pair.variant==='roomSpecialist'&&key==='specialist'))));
    setColumnFilters(Object.fromEntries(Object.entries(filters.columns).filter(([key])=>!hidden.has(key))));
    setShowAllSourceColumns(false);
    setApplied(nextLayout);setLayout(nextLayout);onFrameWidthChange?.(nextLayout.frameWidth??'auto');
    setColorRules(view?.colors??loadColorRules(personalScope));
    setPersonalViewActive(!!view);
    return true;
  };
  const changeColorRules=(next:ColorRule[])=>{if(saveColorRules(personalScope,next))setColorRules(next);else setLayoutError('Không lưu được màu trên trình duyệt này.');};
  const visibleWidth=activeLayout.frameWidth==='auto'||activeLayout.frameWidth===undefined
    ?'100%':`${Math.min(6000,Math.max(320,Number.isFinite(activeLayout.frameWidth)?activeLayout.frameWidth:1500))}px`;
  const widthError=layoutError.toLowerCase().includes('độ rộng');
  const editableField=(item:Item,field:TextField)=>
    canEdit&&!locked&&(!canEditCell||canEditCell(item.recordId,field));
  /** Source cells keep field-level permission and history when combined visually. */
  const compactField=(item:Item,field:TextField)=>{
    const editable=editableField(item,field);
    const original=item[field]||'—';
    const label=TEXT_FIELDS.find(entry=>entry.key===field)?.label??field;
    const kind=activeLayout.columns.find(c=>c.key===field)?.kind;
    const shortLeader=(executiveMode||compactOn&&compactDisplay.shortLeaders)&&
      (field==='vpLeader'||field==='ubndLeader');
    const shortPerson=(executiveMode||compactOn&&compactDisplay.shortSpecialist)&&field==='specialist';
    return <span className={'compact-part'+(editable?' compact-part-editable':'')}
      aria-label={field==='specialist'&&!editable?item.specialist:undefined}>
      {editable
        ?field==='content'
          ?<button type="button" className="content-button" disabled={locked}
            onClick={()=>openContentForEdit(item,'content')}><SearchHighlight value={original} query={columnFilters.content}/></button>
          :(field==='note'||field==='specificProgress')
            ?<InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field={field}
              value={item[field]} highlightQuery={columnFilters[field]}
              label={displayId(item)+': '+label}
              onCommit={value=>{if(!editable)return false;onUpdate(item.recordId,{[field]:value});return true;}}/>
          :kind==='text'
            ?<LeaseTextInput manager={leaseManager} id={item.recordId} field={field} label={displayId(item)+': '+label}
              value={String(item[field]??'')} disabled={locked}
              onChange={value=>onUpdate(item.recordId,{[field]:value})}/>
            :<CellPicker leaseManager={leaseManager} recordId={item.recordId} field={field} editorKind={field==='specialist'?'search':'status'} label={displayId(item)+': '+label} value={item[field]}
              displayValue={shortLeader?abbreviateLeaderName(item[field]):shortPerson?abbreviateVietnameseName(item[field]):undefined}
              options={options(field,item)} searchable={field==='specialist'} disabled={locked} highlightQuery={columnFilters[field]}
              onChange={value=>onUpdate(item.recordId,{[field]:value})}/>
        :(shortLeader||shortPerson)?<span title={item[field]} aria-label={item[field]}>
          {(shortLeader?abbreviateLeaderName(item[field]):abbreviateVietnameseName(item[field]))||'—'}</span>:field==='content'?<SearchHighlight value={original} query={columnFilters.content}/>:original}
      {onCellHistory&&(field==='note'||field==='specificProgress')&&<CellHistoryAction label={label+' · '+displayId(item)}
        onClick={()=>onCellHistory(item,field)}/>}
    </span>;
  };
  const compactMenu=!executiveMode&&compactOn&&!permissionMode&&!customizing&&(shareCompact||allowPersonalCompact)&&(<details className="compact-columns-menu">
        <summary aria-label="Tùy chọn gộp cột">Gộp cột <span aria-hidden="true">▾</span>
          {COMPACT_OPTIONS.filter(option=>compactDisplay[option.key]).length>0&&
            <small className="compact-active-count">{COMPACT_OPTIONS.filter(option=>compactDisplay[option.key]).length}</small>}
        </summary>
        <div className="compact-columns-options" role="group" aria-label="Hiển thị gọn cột">
          <strong>Gộp cột để xem gọn hơn</strong>
          {COMPACT_OPTIONS.filter(option=>['contentDetails','partyTogether','councilTogether','teamTogether'].includes(option.key)).map(option=><label key={option.key}>
            <input type="checkbox" checked={compactDisplay[option.key]}
              onChange={event=>updateCompact(option.key,event.currentTarget.checked)}/>
            <span>{option.label}<small>{option.detail}</small></span>
          </label>)}
          <details className="compact-more-options">
            <summary>Các cách gộp khác <small>3 lựa chọn</small></summary>
            {COMPACT_OPTIONS.filter(option=>option.section==='merge'&&
              !['contentDetails','partyTogether','councilTogether','teamTogether'].includes(option.key)).map(option=><label key={option.key}>
              <input type="checkbox" checked={compactDisplay[option.key]}
                onChange={event=>updateCompact(option.key,event.currentTarget.checked)}/>
              <span>{option.label}<small>{option.detail}</small></span>
            </label>)}
          </details>
          <details className="compact-more-options">
            <summary>Viết tắt tên <small>{COMPACT_OPTIONS.filter(option=>option.section==='name'&&compactDisplay[option.key]).length||'2 lựa chọn'}{COMPACT_OPTIONS.some(option=>option.section==='name'&&compactDisplay[option.key])?' đang bật':''}</small></summary>
            {COMPACT_OPTIONS.filter(option=>option.section==='name').map(option=><label key={option.key}>
              <input type="checkbox" checked={compactDisplay[option.key]}
                onChange={event=>updateCompact(option.key,event.currentTarget.checked)}/>
              <span>{option.label}<small>{option.detail}</small></span>
            </label>)}
          </details>
          <p>{shareCompact?'Quản trị: lưu bố cục dùng chung Firebase.':'Tùy chọn cá nhân trên trình duyệt · không ghi Firebase.'}</p>
          {compactStorageWarning&&<p className="muted" role="status">{compactStorageWarning}</p>}
          {!shareCompact&&personalCompact&&<button type="button" className="button ghost"
            onClick={()=>{setPersonalCompact(null);setCompactStorageWarning(
              clearPersonalCompactDisplay(viewerCompactScope)?'':
              'Trình duyệt không cho xóa lựa chọn đã lưu.');}}>
            Khôi phục cách hiển thị chung
          </button>}
        </div>
      </details>);
  return <section className="card item-list-card">
    {executiveMode&&<ExecutiveProgressCards items={summaryItems??items} configs={reportConfigs}
      selected={executiveFilter} onSelect={setExecutiveFilter}/>}
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
    {checkpointMessage&&<p className="muted" role="status">{checkpointMessage}</p>}{recoveryMessage&&<p className="notice">{recoveryMessage}</p>}{!externalSectionTabs&&<div className="customize-mode-toolbar" role="group" aria-label="Chọn nội dung tùy chỉnh">
  <div className="customize-mode-tabs">
    <button type="button" className={permissionMode?'mode-tab':'mode-tab active'} aria-pressed={!permissionMode} disabled={locked} onClick={()=>{
      if(permissionMode){setPermissionSwitchRequest(current=>current+1);return;}
      setPermissionMode(false);setLayoutError('');
    }}>Hiển thị bảng</button>
    {allowLayout&&permissions&&onSavePermissions&&<button type="button" className={permissionMode?'mode-tab active':'mode-tab'} aria-pressed={permissionMode} disabled={locked} onClick={()=>{setPermissionMode(true);setLayoutError('');}}>Quyền chỉnh sửa</button>}
  </div>
  <span className="muted">{permissionMode?'Cấp quyền sửa bằng thao tác trực tiếp trên bảng · Chưa lưu sẽ không có hiệu lực':'Hiện/ẩn, thay đổi vị trí, độ rộng cột và sửa thử nội dung trên bảng'}</span>
</div>}
{!permissionMode&&<fieldset className="settings-saving" disabled={locked||!allowLayout}><ItemColumnPanel catalog={catalog} items={items} permissions={permissions} layoutDirty={dirty} onSaveLayout={async()=>{try{await persistSavedLayout(validateItemLayout(layout));setLayoutError('');setSaveFeedback('');}catch(cause){handleLayoutFailure(cause);throw cause;}}} onSaveCatalog={onPersistCatalog} onSavePermissions={onSavePermissions} onDirtyChange={setColumnExtrasDirty} layout={layout} validationMessage={widthError?layoutError:undefined} onChange={value=>{setSaveFeedback('');setLayoutError('');setLayoutConflicts([]);setConflictChoices({});setLayout(value);}}/></fieldset>}
</>}
    <div className="item-data-region" style={{width:visibleWidth,maxWidth:'100%'}}>
    {anonymousViewer&&compactOn&&!permissionMode&&<div className="guest-compact-menu-bar" role="group"
       aria-label="Cách hiển thị cột của tôi">{compactMenu}</div>}
    {!anonymousViewer&&<div className="card-header">
    <div className="item-header-actions">
      {!customizing&&!permissionMode&&<div className="executive-mode-controls" role="group" aria-label="Chế độ xem danh sách">
        <button type="button" className={'button '+(executiveMode?'primary':'ghost')} aria-pressed={executiveMode}
          onClick={()=>{setShowExecutive(true);setShowAllSourceColumns(false);}}>Bố cục gọn</button>
        <button type="button" className={'button '+(!executiveMode?'primary':'ghost')} aria-pressed={!executiveMode}
          onClick={()=>setShowExecutive(false)}>Tùy chọn từng cột</button>
      </div>}
      {compactMenu}
      {!customizing&&!permissionMode&&statusPaletteStore&&onStatusPaletteChange&&
        <StatusPaletteManager store={statusPaletteStore} onStoreChange={onStatusPaletteChange}/>}
      {!customizing&&onPersistViewerLayout&&<span className="muted admin-column-arrange-hint"
        role="status">{viewSaving?'Đang lưu cột…':personalViewActive?'Mở giao diện chung để kéo cột dùng chung':showAllSourceColumns?'Tắt “Hiện đủ cột Excel” để kéo cột':'Admin: kéo đầu cột để đổi vị trí, kéo mép để đổi độ rộng · tự lưu dùng chung'}</span>}
      {allowLayout&&!customizing&&<div className="source-column-visibility" role="group" aria-label="Hiển thị cột nguồn Excel">
        <span>{displayedColumns.length} / {activeLayout.columns.filter(c=>!c.removed).length} cột dữ liệu</span>
        <button type="button" className="button ghost" aria-pressed={showAllSourceColumns}
          onClick={()=>{setShowExecutive(false);setShowAllSourceColumns(current=>!current);}}>
          {showAllSourceColumns?'Theo cột đã chọn':'Hiện đủ cột Excel'}
        </button>
      </div>}

    </div></div>}
    {!customizing&&onPersistViewerLayout&&(saveFeedback||layoutError)&&
      <p className={layoutError?'notice error-text':'muted'} role={layoutError?'alert':'status'}>{layoutError||saveFeedback}</p>}
    {customizing&&!anonymousViewer&&saveDataHint&&pendingData&&<p className="notice">{saveDataHint}</p>}
     {allowLayout&&!anonymousViewer&&!customizing&&<ListViewTools sourceKey={personalScope} filters={{...emptyListFilters(),columns:columnFilters}} layout={activeLayout} colors={colorRules} onLoad={applyView} onColors={changeColorRules} disabled={locked||pendingData} customizing={customizing}/>}
    <div className="item-sticky-search-controls">
    {canEdit&&!anonymousViewer&&<label className="layout-visibility"><input type="checkbox" disabled={locked} checked={allSpecialists} onChange={event=>setAllSpecialists(event.target.checked)}/>Chọn chuyên viên toàn cơ quan</label>}
    </div>
    {permissionMode&&permissions&&onSavePermissions?<InlinePermissionsTable showBackButton={!externalSectionTabs} items={rows} columns={columns} permissions={permissions} onSave={onSavePermissions} onReload={onReloadPermissions} onDirtyChange={setPermissionDirty} switchRequest={permissionSwitchRequest} onBack={()=>{
      setPermissionMode(false);setPermissionDirty(false);setLayoutError("");
      if(exitAfterPermissions.current){
        exitAfterPermissions.current=false;
        if(dirty||columnExtrasDirty||Object.keys(drafts).length)setConfirmExit(true);else onClose();
      }
    }} disabled={locked}/>:<>{executiveMode?<ExecutiveDetailTable items={executiveRows} visibleFields={executiveFields}
      renderField={compactField} hasDraft={item=>!!drafts[item.recordId]} errorFor={item=>errors[item.recordId]}
      query={executiveSearch} onQuery={setExecutiveSearch}/>:<div className="table-wrap item-table-scroll" tabIndex={0} role="region" aria-label="Bảng nội dung cuộn ngang và dọc"><table className="data-table item-data-table" style={{width:`max(100%, ${tableWidth}px)`,tableLayout:'fixed'}}><colgroup>{displayedColumns.map(column=><col key={column.key} style={{width:`${visualWidth(column.width)}px`}}/>)}</colgroup><thead><tr className="item-heading-row">{displayedColumns.map((column,index)=><ColumnHeader key={column.key} columnKey={column.key}
  sortLabel={column.label} sortDirection={columnSort?.key===column.key?columnSort.direction:null} onSort={customizing?cycleSort:undefined}
  disabled={!(customizing&&!locked&&allowLayout||canViewerArrange)}
  previousKey={displayedColumns[index-1]?.key} nextKey={displayedColumns[index+1]?.key}
  onMove={moveColumn}>{column.label}{((customizing&&!locked&&allowLayout)||canViewerArrange)&&
    index<displayedColumns.length-1&&
    trailingWidthBounds(activeLayout,displayedColumns.map(col=>col.key),column.key)&&
    <ColumnResizeHandle columnIndex={index} width={visualWidth(column.width)}
      compensator={{index:displayedColumns.length-1,
        width:visualWidth(displayedColumns[displayedColumns.length-1].width),min:60,max:1600}}
      min={60} max={1600} label={column.label} onCommit={width=>{
        const keys=displayedColumns.map(col=>col.key);
        // Displayed width includes the group padding; the source field must not.
        const extra=compactPairs.find(pair=>pair.anchor===column.key)?.extraWidth??0;
        const sourceWidth=Math.max(60,width-extra);
        if(customizing)setLayout(previous=>resizeWithLastColumn(previous,keys,column.key,sourceWidth));
        else void applyViewerLayout(base=>resizeWithLastColumn(base,keys,column.key,sourceWidth));
      }}/>}</ColumnHeader>)}</tr><tr className="item-column-filter-row">
  {displayedColumns.map(column=>compactPairs.some(pair=>pair.anchor===column.key&&pair.variant==='roomSpecialist')
    ?<RoomSpecialistFilterCell key={column.key} items={items}
      room={columnFilters.room??''} person={columnFilters.specialist??''}
      onRoom={value=>setColumnFilters(previous=>({...previous,room:value}))}
      onPerson={value=>setColumnFilters(previous=>({...previous,specialist:value}))}/>
    :<ColumnFilterCell key={column.key} field={column.key} label={column.label} items={items}
    getValue={compactPairs.some(pair=>pair.anchor===column.key)
      ?item=>compactFilterText(item,column.key,compactPairs)
      :column.origin==='custom'?(item)=>column.values?.[customRowKey(item)]??'':undefined}
    forceText={compactPairs.some(pair=>pair.anchor===column.key)||
      column.key==='specialist'&&compactOn&&compactDisplay.shortSpecialist}
    choices={column.origin==='custom'&&column.kind==='select'?column.options:undefined}
    value={columnFilters[column.key]??''} onChange={value=>{setColumnFilters(previous=>{const next={...previous};if(value)next[column.key]=value;else delete next[column.key];return next;});}} />)}
  </tr></thead><tbody>
      {rows.map(item => <tr key={item.recordId} className={['color-row',itemColor(item,colorRules)?'color-'+itemColor(item,colorRules):''].join(' ')}>{displayedColumns.map(column=>{const key=column.key as TextField;
        const pair=compactPairs.find(pair=>pair.anchor===column.key);
        if(pair){
          const anyEditable=pair.memberFields.some(field=>editableField(item,field));
          return <td key={column.key} data-col-key={column.key}
            className={anyEditable?'editable-cell compact-merged-cell':'compact-merged-cell'} onClick={activateEditableCell}
            data-edit-hint={anyEditable?'Bấm để sửa':undefined}
            style={cellHighlightStyle(item[key],column.key,activeLayout.cellHighlights)}>
            {key==='content'
              ?<div className="compact-content-group">
                <span className="compact-content-line">{compactField(item,'content')}
                  <span className="compact-type-suffix" data-kind={compactTypeTone(item.type)}>
                    ({compactField(item,'type')})
                  </span>
                </span>
                {pair.hiddenFields.includes('department')&&
                  <div className="compact-content-department">
                    <span className="compact-pair-tag">Sở</span>{compactField(item,'department')}
                  </div>}
              </div>
              :<div className="compact-pair-lines">
                {pair.memberFields.map((field,index)=><div key={field}>
                  <span className="compact-pair-tag">{pair.tags[index]}</span>
                  {compactField(item,field)}
                </div>)}
              </div>}
          </td>;
        }
        if(column.origin==='custom'){
          const rowKey=customRowKey(item),value=column.values?.[rowKey]??'';
          const updateCustom=(next:string)=>setLayout(previous=>({...previous,columns:previous.columns.map(c=>c.key!==column.key?c:{
            ...c,values:{...(c.values??{}),[rowKey]:next}
          })}));
          const writable=customizing&&allowLayout&&!locked;
          return <td key={column.key} data-col-key={column.key} className={writable?'editable-cell':undefined} onClick={activateEditableCell}
            data-edit-hint={writable?'Bấm để sửa':undefined}
            style={cellHighlightStyle(value,column.key,activeLayout.cellHighlights)}>{customizing&&allowLayout&&!locked
            ?column.kind==='select'
              ?<CellPicker label={`${displayId(item)}: ${column.label}`} value={value}
                options={column.options??[]} onChange={updateCustom}/>
              :<input className="custom-cell-input" aria-label={`${displayId(item)}: ${column.label}`}
                type="text" maxLength={1000} value={value} onChange={e=>updateCustom(e.currentTarget.value)}/>
            :<SearchHighlight value={value||'—'} query={columnFilters[column.key]}/>}</td>;
        }
        if(column.key==='displayCode')return <td key={column.key} data-col-key={column.key}
          style={cellHighlightStyle(displayId(item),column.key,activeLayout.cellHighlights)}><span className="code" title={isMissingDisplayCode(item.displayCode)?undefined:`Mã gốc: ${item.displayCode}`}>{displayId(item)}</span>{(aliasCounts.get(displayId(item))??0)>1&&<small className="warning-text">Trùng ID hiển thị · {item.displayCode}</small>}{drafts[item.recordId]&&<small>Chưa lưu</small>}{errors[item.recordId]&&<p className="error-text" role="alert">{errors[item.recordId]}</p>}</td>;
        if(column.key==='stt')return <td key={column.key} data-col-key={column.key} style={cellHighlightStyle(item.stt,column.key,activeLayout.cellHighlights)}>{item.stt}</td>;
        if(column.key==='isDropped')return <td key={column.key} data-col-key={column.key}
           className={canEdit&&!locked&&(!canEditCell||canEditCell(item.recordId,'isDropped'))?'editable-cell':undefined}
           onClick={activateEditableCell}>{canEdit&&(!canEditCell||canEditCell(item.recordId,'isDropped'))?<CellPicker leaseManager={leaseManager} recordId={item.recordId} field="isDropped" label={`${displayId(item)}: Rút`} value={item.isDropped?"Đã rút":"Chưa rút"} options={["Chưa rút","Đã rút"]} disabled={locked} onChange={value=>onUpdate(item.recordId,{isDropped:value==="Đã rút"})}/>:<span className={item.isDropped?'status-pill warning':''}>{item.isDropped?'Đã rút':'—'}</span>}</td>;
        // Excel columns P and Q are displayed and searchable but not editable.
        // They must not be offered as writable fields until a source writer and
        // server-side permission rules explicitly support these new columns.
        if(column.key==='partyMeeting'||column.key==='examined')
          return <td key={column.key} data-col-key={column.key}>{item[column.key]||'—'}</td>;
        const metadata=TEXT_FIELDS.find(field=>field.key===key)!;
        const writable=canEdit&&!locked&&(!canEditCell||canEditCell(item.recordId,key));
        return <td key={column.key} data-col-key={column.key}
          data-progress-tone={statusPaletteTone(key,item[key],statusPaletteStore?.active.otherEnabled??false)??undefined}
          className={[writable?'editable-cell':'',onCellHistory&&(key==='note'||key==='specificProgress')?'has-history-action':''].filter(Boolean).join(' ')} onClick={activateEditableCell}
          data-edit-hint={writable?'Bấm để sửa':undefined}
          style={cellHighlightStyle(item[key],column.key,activeLayout.cellHighlights)}>{canEdit&&(!canEditCell||canEditCell(item.recordId,key))?key==='content'?<button className="content-button" onClick={()=>openContentForEdit(item,'content')} disabled={locked}><SearchHighlight value={item.content||'—'} query={columnFilters.content}/></button>:key==='note'?<InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field="note" value={item.note} highlightQuery={columnFilters.note}
    label={`${displayId(item)}: ${metadata.label}`} onCommit={value=>{
      if(!writable)return false;
      onUpdate(item.recordId,{note:value});return true;
    }}/>:key==='specificProgress'?<InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field="specificProgress" value={item.specificProgress} highlightQuery={columnFilters.specificProgress}
    label={`${displayId(item)}: ${metadata.label}`} onCommit={value=>{
      if(!writable)return false;
      onUpdate(item.recordId,{specificProgress:value});return true;
    }}/>:column.kind==='text'
  ?<LeaseTextInput manager={leaseManager} id={item.recordId} field={key} label={`${displayId(item)}: ${column.label}`}
    maxLength={1000} value={String(item[key]??'')} disabled={locked}
    onChange={value=>onUpdate(item.recordId,{[key]:value})}/>
  :<CellPicker leaseManager={leaseManager} recordId={item.recordId} field={key} editorKind={key==='specialist'?'search':'status'} label={`${displayId(item)}: ${column.label}`} value={item[key]}
    displayValue={compactOn&&((key==='specialist'&&compactDisplay.shortSpecialist)||
      ((key==='vpLeader'||key==='ubndLeader')&&compactDisplay.shortLeaders))?
      (key==='vpLeader'||key==='ubndLeader'?abbreviateLeaderName(item[key]):abbreviateVietnameseName(item[key])):undefined}
    options={options(key,item)} searchable={key==="specialist"} disabled={locked} highlightQuery={columnFilters[key]}
    onChange={value=>onUpdate(item.recordId,{[key]:value})}/>:key==='specialist'&&compactOn&&compactDisplay.shortSpecialist
      ?<span aria-label={item.specialist} title={item.specialist}>{abbreviateVietnameseName(item.specialist)||'—'}</span>
      :(key==='vpLeader'||key==='ubndLeader')&&compactOn&&compactDisplay.shortLeaders
        ?<span title={item[key]} aria-label={item[key]}>{abbreviateLeaderName(item[key])||'—'}</span>
      :statusPaletteTone(key,item[key],statusPaletteStore?.active.otherEnabled??false)
        ?<span className="workflow-status-value"><SearchHighlight value={item[key]} query={columnFilters[key]}/></span>
      :<SearchHighlight value={item[key]||'—'} query={columnFilters[key]}/>} {key==='specialist'&&assignmentIssue(item,catalog)&&<small className="warning-text">{assignmentIssue(item,catalog)}</small>}
          {onCellHistory&&(key==='note'||key==='specificProgress')&&<CellHistoryAction label={metadata.label+' · '+displayId(item)}
            onClick={()=>onCellHistory(item,key)}/>}</td>;
      })}</tr>)}
      {!rows.length && <tr><td className="empty" colSpan={Math.max(1,displayedColumns.length)}>Không tìm thấy nội dung phù hợp. Hãy thử đổi từ khóa hoặc bộ lọc.</td></tr>}
    </tbody></table></div></>}
    </div>
    {canEdit && contentItem && <ContentEditor key={`${contentItem.item.recordId}:${contentItem.field}`} sourceKey={sourceKey} item={contentItem.item} field={contentItem.field} sourceKind={effectiveSourceKind} draftOnly={draftOnly} onSave={value => onUpdate(contentItem.item.recordId, { [contentItem.field]:value })} onClose={closeContentEditor} />}
    {customizing&&unmatchedCheckpoint&&<Modal title="Có thay đổi hiển thị cũ" onClose={onClose}><div className="modal-body"><p>Cách hiển thị đang giữ trên máy không khớp cách hiển thị dùng chung hiện tại. Nạp để đối chiếu không ghi Google hoặc Excel.</p><p className="muted">Đã giữ trên máy: {new Date(unmatchedCheckpoint.savedAt).toLocaleString('vi-VN')}</p></div><div className="modal-footer"><button className="button ghost" onClick={onClose}>Giữ thay đổi trên máy và về xem</button><button className="button danger" onClick={discardOldDraft}>Bỏ phần sửa cách hiển thị cũ</button><button className="button primary" onClick={()=>{if(unmatchedCheckpoint)setRestoredBase(unmatchedCheckpoint.base);restoreOldDraft();}}>Nạp phần sửa để đối chiếu</button></div></Modal>}
    {confirmExit&&<Modal title="Xử lý thay đổi trước khi về xem?" onClose={()=>{if(!locked)setConfirmExit(false);}}><div className="modal-body"><p>Phần bạn đang sửa chưa lưu. Giữ trên máy không ghi dữ liệu vào nguồn và không lưu cách hiển thị dùng chung.</p>{layoutError&&<p className="error-text">{layoutError}</p>}</div><div className="modal-footer"><button className="button ghost" disabled={locked} onClick={()=>setConfirmExit(false)}>Tiếp tục sửa</button><button className="button danger" disabled={locked||dataSaving} onClick={()=>{setLayout(applied);clearCheckpoint();onDiscardData();setConfirmExit(false);onClose();}}>Bỏ phần đang sửa và về xem</button>{cannotSaveData&&onKeepDraft?<button className="button primary" disabled={locked} onClick={()=>{if(onKeepDraft())onClose();}}>Giữ thay đổi trên máy và về xem</button>:<button className="button primary" disabled={locked||dataSaving} onClick={()=>{setConfirmExit(false);}} >Lưu riêng phần đang sửa trước khi về xem</button>}</div></Modal>}

  </section>;
}



