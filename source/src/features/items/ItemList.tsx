import { useEffect, useMemo, useRef, useState } from 'react';
import type { Changes, Item, Patch, TextField, EditableField } from '../../../shared/types';
import { TEXT_FIELDS, STATUS_OPTIONS } from '../../../shared/field-definitions';
import { ContentEditor } from './ContentEditor';
import {InlineNoteEditor} from './InlineNoteEditor';
import { displayId, isMissingDisplayCode } from '../../domain/display-id';
import { EXCEL_COLUMN_KEYS, COMPACT_GROUP_LABEL_KEYS, validateCompactGroupLabels, cellHighlightStyle, overlayPersonalLayout, defaultItemLayout, loadItemLayout, saveItemLayout, validateItemLayout } from '../../data/item-preferences';
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
import type {ItemLayout,CompactGroupLabels} from '../../data/item-preferences';
import { ColumnHeader } from './ColumnHeader';
import {ColumnFilterCell,filterValue} from './ColumnFilterCell';
import {RoomSpecialistFilterCell} from './RoomSpecialistFilterCell';
import {CompactGroupFilterCell} from './CompactGroupFilterCell';
import {CompactGroupedValue} from './CompactGroupedValue';
import {statusPaletteTone,type StatusPaletteStore} from '../../data/status-palettes';
import {StatusPaletteManager} from './StatusPaletteManager';
import {COMPACT_OPTIONS,activeCompactPairs,
  compactVisibleColumns,compactFilterText,compactTypeTone,abbreviateVietnameseName,abbreviateLeaderName,COMPACT_GROUP_DEFAULT_LABELS,DEFAULT_COMPACT_DISPLAY,toggleCompactOption,readPersonalCompactDisplay,writePersonalCompactDisplay,clearPersonalCompactDisplay,type CompactDisplay,type CompactOption} from './compact-columns';
import { CellPicker } from './CellPicker';
import {isStatusDisplayField,projectedStatusFilterRows,statusDisplayValue,statusEditSelection,statusPickerValues,statusFilterText,statusReadOnlyValue} from './status-display';
import {LeaseTextInput} from './LeaseTextInput';
import type {CellEditSessionManager} from '../../data/cell-edit-leases';
import {activateEditableCell} from './activate-editable-cell';
import { reorderByKey } from '../../domain/reorder-columns';
import type {CellPermissions} from '../../data/firebase-repository';
import {InlinePermissionsTable} from './InlinePermissionsTable';
import './item-frame.css';
// Legacy ListViewTools no longer appears in the operational list.
import {sortItems,type ColumnSort} from '../../domain/sort-items';
import {ColumnResizeHandle} from '../../components/ColumnResizeHandle';
import {projectedIdWidth,projectedPhysicalLimits,projectedAdjacentBounds,resizeProjectedWithAdjacent} from '../../data/resize-last-column';
import {fitTableColumns} from '../../data/fit-table-columns';
import {ItemSummaryCards} from './ItemSummaryCards';
import type {SummarySelection} from '../../domain/item-summary';
import {DETAIL_FIELDS,SEARCH_FIELDS,newToolbarState,filterToolbarRows,filterByChips,
  hasToolbarFilters,exactChoices,shouldClearListOnEscape,
  type ListKind} from './list-toolbar-filters';
import './list-filter-toolbar.css';
import {useElementWidth} from '../../components/useElementWidth';
import {mountSharedEditTooltip} from '../../components/SharedEditTooltip';
import {buildLocked,buildLockReason,effectiveBuildStatus,effectiveItemField,projectedBuildDisplayItem,rejectsBuildChange} from '../../domain/pr95-v5-l4-build-effective';
import {CellHistoryAction} from '../../components/CellHistoryAction';
import {emptyListFilters,clearActivePersonalView,loadColorRules,saveColorRules,itemColor,type ColorRule} from '../../data/list-views';

export function ItemList({ items, drafts, errors, busy, onUpdate, onCellHistory, readOnly = false, sourceKind, customizing = false, sourceKey, catalog, onClose, onSaveData, onDiscardData, onLayoutSaved,initialLayout,onPersistLayout,canEditDraft=true,layoutSaveLabel='Lưu cách hiển thị',saveDataHint='',onKeepDraft,canEditCell,allowLayout=true,dataSaving=false,sourceLabel,draftOnly=false,permissions,onSavePermissions,onReloadPermissions,onFrameWidthChange,anonymousViewer=false,onDirtyChange,exitRequest=0,permissionModeOnly=false,externalSectionTabs=false,onOpenCatalog,onPersistCatalog,statusPaletteStore,onStatusPaletteChange,onPersistViewerLayout,leaseManager,viewerScope='browser',allowPersonalCompact=false }: { items: Item[]; drafts: Record<string, Patch>; errors: Record<string, string>; busy: boolean; onUpdate: (id: string, changes: Changes) => void; onHistory: (item: Item) => void; onCellHistory?:(item:Item,field:TextField)=>void; readOnly?: boolean; sourceKind?: 'demo'|'google'|'firebase'; customizing?: boolean; sourceKey:string; catalog:CatalogConfig; onClose:()=>void; onSaveData:()=>Promise<boolean>; onDiscardData:()=>void; onLayoutSaved:(message:string)=>void;initialLayout?:ItemLayout;onPersistLayout?:(layout:ItemLayout,baseline?:ItemLayout,choices?:LayoutConflictChoices)=>Promise<ItemLayout|void>;canEditDraft?:boolean;layoutSaveLabel?:string;saveDataHint?:string;onKeepDraft?:()=>boolean;canEditCell?:(id:string,field:EditableField)=>boolean;allowLayout?:boolean;dataSaving?:boolean;sourceLabel?:string;draftOnly?:boolean;permissions?:CellPermissions;onSavePermissions?:(next:CellPermissions,expected:CellPermissions)=>Promise<void>;onReloadPermissions?:()=>Promise<CellPermissions>;onFrameWidthChange?:(width:'auto'|number)=>void; anonymousViewer?:boolean;onDirtyChange?:(dirty:boolean)=>void;exitRequest?:number;permissionModeOnly?:boolean;externalSectionTabs?:boolean;onOpenCatalog?:(key:string)=>void;onPersistCatalog?:(next:CatalogConfig)=>Promise<void>;statusPaletteStore?:StatusPaletteStore;onStatusPaletteChange?:(next:StatusPaletteStore)=>boolean;onPersistViewerLayout?:(layout:ItemLayout,baseline:ItemLayout,choices?:LayoutConflictChoices)=>Promise<ItemLayout|void>;leaseManager?:CellEditSessionManager;viewerScope?:string;allowPersonalCompact?:boolean }) {
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
  // Clear only the obsolete active-preset pointer. Keep the existing saved
  // presets in storage as non-active historical user data.
  useEffect(()=>{clearActivePersonalView(personalScope);},[personalScope]);
  const [columnFilters,setColumnFilters]=useState<Record<string,string>>({});
  const [summarySelection,setSummarySelection]=useState<SummarySelection|null>(null);
  const [kindSelection,setKindSelection]=useState<ListKind|null>(null);
  const [toolbar,setToolbar]=useState(newToolbarState);
  const [otherFiltersOpen,setOtherFiltersOpen]=useState(false);
  const [columnSort,setColumnSort]=useState<ColumnSort>(null);
  const personalViewActive=false;
  // An ordinary viewer should immediately see every A–R source field. Saved
  // column settings remain available without a Firebase write.
  // A previously saved visible/hidden column selection wins on the first paint.
  const [showAllSourceColumns,setShowAllSourceColumns]=useState(false);
  const [colorRules,setColorRules]=useState<ColorRule[]>(loadColorRules(personalScope));
  const effectiveSourceKind = sourceKind ?? (readOnly ? 'google' : 'demo');

  // Admin customizations always start from the one Firebase shared layout.
  // Personal saved views are viewing presets, never an alternative shared baseline.
  const [applied, setApplied] = useState(() => {
    const authoritative=initialLayout??loadItemLayout(sourceKey);
    return authoritative;
  });
  // The Firebase baseline must be the original *shared* layout when editing began,
  // not a local saved view nor the profile revision emitted after another write.
  const sharedBase=useRef<ItemLayout>(initialLayout??applied);
  const [restoredBase,setRestoredBase]=useState<ItemLayout|null>(null);
  const saveBaseline=restoredBase??sharedBase.current;
  useEffect(()=>{if(initialLayout&&!customizing)setApplied(initialLayout);},[initialLayout,customizing]);
  const {draft:layout,setDraft:setLayout,dirty,markSaved,clearCheckpoint,recoveryMessage,checkpointMessage,unmatchedCheckpoint,restoreOldDraft,discardOldDraft} = useRecoverableDraft(layoutRecoveryScope(`items:${sourceKey}`),applied,validateItemDraft,undefined,customizing);
  const activeLayout = customizing ? layout : applied;
  // Only admin writes the shared Firebase layout; all other viewers get local preferences.
  const adminControls=allowLayout&&!anonymousViewer;
  const shareCompact=adminControls&&!!onPersistViewerLayout&&!personalViewActive;
  const compactDisplay=!adminControls||customizing||shareCompact
    ?activeLayout.compactDisplay??DEFAULT_COMPACT_DISPLAY
    :personalCompact??activeLayout.compactDisplay??DEFAULT_COMPACT_DISPLAY;
  // The viewer already receives the exact first-frame width from App. Avoid
  // a post-paint callback that can override the saved CSS with stale values.
  useEffect(()=>{if(customizing)onFrameWidthChange?.(activeLayout.frameWidth??'auto');},[customizing,activeLayout.frameWidth,onFrameWidthChange]);
  const columns = activeLayout.columns
    .filter(column=>!column.removed&&(EXCEL_COLUMN_KEYS.includes(column.key)||column.origin==='custom')&&
      (column.visible||(!customizing&&showAllSourceColumns&&EXCEL_COLUMN_KEYS.includes(column.key)))&&
      (column.key!=='stt'||showAllSourceColumns||customizing))
    .sort((a,b)=>!customizing&&showAllSourceColumns
      ?(EXCEL_COLUMN_KEYS.includes(a.key)?EXCEL_COLUMN_KEYS.indexOf(a.key):1000+activeLayout.columns.indexOf(a))-
       (EXCEL_COLUMN_KEYS.includes(b.key)?EXCEL_COLUMN_KEYS.indexOf(b.key):1000+activeLayout.columns.indexOf(b))
      :0);
  // Visual projection only; administrative configuration keeps every Excel source field.
  const compactOn=(!customizing||anonymousViewer)&&!showAllSourceColumns;
  const compactPairs=compactOn?activeCompactPairs(columns,compactDisplay):[];
  const displayedColumns=compactOn?compactVisibleColumns(columns,compactDisplay,activeLayout.groupLabels):columns;
  // Preserve per-source filters even when projection hides their physical columns.
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
  };
  const [confirmExit,setConfirmExit] = useState(false);
  const [layoutError,setLayoutError] = useState('');
  const [layoutConflicts,setLayoutConflicts] = useState<LayoutFieldConflict[]>([]);
  const [conflictChoices,setConflictChoices] = useState<LayoutConflictChoices>({});
  const [saveFeedback,setSaveFeedback] = useState('');
  // Specialist selection defaults to the current room; no global toggle in the list.
  const [saving,setSaving] = useState(false);
  const [viewSaving,setViewSaving]=useState(false);
  const [editingGroupLabels,setEditingGroupLabels]=useState<CompactGroupLabels|null>(null);
  // Immutable baseline captured when the rename dialog opens, not when Save is
  // pressed. A second tab can refresh initialLayout while this draft is open.
  const [groupLabelBaseline,setGroupLabelBaseline]=useState<ItemLayout|null>(null);
  const [groupLabelConflicts,setGroupLabelConflicts]=useState<LayoutFieldConflict[]>([]);
  const [groupLabelChoices,setGroupLabelChoices]=useState<LayoutConflictChoices>({});
  const [groupLabelsError,setGroupLabelsError]=useState('');
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
  const latestItems=useRef(items);
  latestItems.current=items;
  const guardBuildUpdate=(id:string,changes:Changes):void=>{
    const latest=latestItems.current.find(entry=>entry.recordId===id);
    if(latest&&rejectsBuildChange(latest,changes))return;
    onUpdate(id,changes);
  };
  const buildLockedHint=(item:Item)=><span className="business-build-locked"
    tabIndex={0} data-quick-tooltip={buildLockReason(item)??undefined}
    aria-label={'Tiến độ xây dựng NQ: Không phải trình. '+buildLockReason(item)}>
    Không phải trình
  </span>;
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
      for(const key of EXCEL_COLUMN_KEYS)fields[key]=normalizeSearch(key==='progressBuild'?effectiveBuildStatus(item):statusFilterText(key,filterValue(item,key)));
      for(const pair of compactPairs)
        fields['merged:'+pair.anchor]=normalizeSearch([compactFilterText(projectedBuildDisplayItem(item),pair.anchor,compactPairs),
          ...pair.memberFields.map(key=>statusDisplayValue(key,effectiveItemField(item,key)))].join(' '));
      for(const column of activeLayout.columns)
        if(column.origin==='custom')
          fields[column.key]=normalizeSearch(column.values?.[customRowKey(item)]??'');
      result.set(item.recordId,fields);
    }
    return result;
  },[items,activeLayout.columns,codeCounts,compactOn,compactDisplay,showAllSourceColumns]);
  const statusFilterItems=useMemo(()=>projectedStatusFilterRows(items),[items]);
  const columnFiltered=useMemo(()=>{
    const permitted=new Set(columns.map(c=>c.key));
    const roomSpecialist=compactPairs.some(pair=>pair.variant==='roomSpecialist');
    // Staff headers search the FULL strings of every projected member.
    // U01/U02 use independent source filters (AND), not group-wide OR.
    const staffGroupKeys=new Set(compactPairs
      .filter(p=>p.variant==='teamTogether'||p.variant==='leadersTogether')
      .map(p=>p.anchor));
    const staffGroupTerms=Object.entries(columnFilters)
      .filter(([key,term])=>staffGroupKeys.has(key)&&term.trim())
      .map(([key,term])=>({key:'merged:'+key,term:normalizeSearch(term)}));
    const ordinary=Object.entries(columnFilters)
      .filter(([key,term])=>EXCEL_COLUMN_KEYS.includes(key)&&permitted.has(key)&&
        !staffGroupKeys.has(key)&&term.trim())
      .map(([key,term])=>({key,term:normalizeSearch(term)}));
    const roomTerm=roomSpecialist?(columnFilters.room??''):'';
    const personTerm=roomSpecialist?normalizeSearch(columnFilters.specialist??''):'';

    const custom=Object.entries(columnFilters).flatMap(([key,term])=>
      term.trim()&&activeLayout.columns.some(column=>column.key===key&&column.origin==='custom')
        ?[{key,term:normalizeSearch(term)}]:[]);
    return items.filter(item=>{
      const values=filterIndex.get(item.recordId);
      if(!values)return false;
      return ordinary.every(({key,term})=>values[key]?.includes(term))&&
        staffGroupTerms.every(({key,term})=>values[key]?.includes(term))&&
        (!roomTerm||item.room===roomTerm)&&
        (!personTerm||values.specialist?.includes(personTerm))&&
        custom.every(({key,term})=>values[key]?.includes(term));
    });
  },[items,columnFilters,activeLayout.columns,compactOn,compactDisplay,showAllSourceColumns,filterIndex]);

  const toolbarBase=useMemo(()=>customizing||permissionMode?columnFiltered:
    filterToolbarRows(columnFiltered,toolbar,(item,key)=>{
      if(key==='*')return activeLayout.columns.filter(col=>col.origin==='custom')
        .map(col=>col.values?.[customRowKey(item)]??'').join(' ')+' '+
        ['partyLevel','progressParty','progressBuild','progressCouncil']
          .map(key=>statusDisplayValue(key,effectiveItemField(item,key))).join(' ');
      return activeLayout.columns.find(col=>col.key===key&&col.origin==='custom')
        ?.values?.[customRowKey(item)]??'';
    }),[columnFiltered,toolbar,customizing,permissionMode,activeLayout.columns,codeCounts]);
  const filtered=useMemo(()=>customizing||permissionMode?columnFiltered:
    filterByChips(toolbarBase,kindSelection,summarySelection),
    [columnFiltered,toolbarBase,kindSelection,summarySelection,customizing,permissionMode]);
  const selectKind=(kind:ListKind)=>setKindSelection(old=>old===kind?null:kind);
  const anyListFilter=hasToolbarFilters(toolbar)||!!kindSelection||!!summarySelection||
    Object.values(columnFilters).some(Boolean);
  const clearAllListFilters=()=>{
    setToolbar(newToolbarState());setColumnFilters({});
    setSummarySelection(null);setKindSelection(null);
  };
  const latestListFilterState=useRef({anyListFilter,customizing,permissionMode,
    editorOpen:!!contentItem});
  latestListFilterState.current={anyListFilter,customizing,permissionMode,
    editorOpen:!!contentItem};
  useEffect(()=>{
    const handler=(event:KeyboardEvent)=>{
      const state=latestListFilterState.current;
      if(!shouldClearListOnEscape(event,{
        active:state.anyListFilter,customizing:state.customizing,
        permissionMode:state.permissionMode,editorOpen:state.editorOpen,popupOpen:false
      }))return;
      event.preventDefault();
      setToolbar(newToolbarState());setColumnFilters({});
      setSummarySelection(null);setKindSelection(null);
    };
    window.addEventListener('keydown',handler);
    return()=>window.removeEventListener('keydown',handler);
  },[]);
  const selectSummary=(selection:SummarySelection)=>setSummarySelection(previous=>
    previous?.report===selection.report&&previous?.stage===selection.stage?null:selection);
  const rows=useMemo(()=>sortItems(filtered,columnSort,(item,key)=>{
    const column=activeLayout.columns.find(c=>c.key===key&&c.origin==='custom');
    return column?.values?.[customRowKey(item)]??'';
  }),[filtered,columnSort,activeLayout,codeCounts]);
  const cycleSort=(key:string)=>setColumnSort(current=>
    current?.key!==key?{key,direction:'asc'}:current.direction==='asc'?{key,direction:'desc'}:null);
  // CellPicker option lists used to be sorted once PER CELL PER KEYSTROKE.
  const optionCache=useMemo(()=>new Map<string,string[]>(),[catalog,items]);
  const options = (field: TextField,item:Item) => {
    const cacheKey=item.recordId+'|'+field;
    const cached=optionCache.get(cacheKey);
    if(cached)return cached;
    const list=field in catalog.options?catalog.options[field as CatalogKey]:field in STATUS_OPTIONS?STATUS_OPTIONS[field as keyof typeof STATUS_OPTIONS]:[];
    const selected=statusPickerValues(field,orderValues([...new Set([...list,item[field]])].filter(Boolean),list)
      .filter(value=>field!=='specialist'||value===item.specialist||!item.room||catalog.specialistRooms[value]?.includes(item.room)));
    optionCache.set(cacheKey,selected);
    return selected;
  };
  const aliasCounts = useMemo(()=>{const counts=new Map<string,number>();items.filter(item=>!isMissingDisplayCode(item.displayCode)).forEach(item=>counts.set(displayId(item),(counts.get(displayId(item))??0)+1));return counts;},[items]);
  // Recompute from source layout exactly once: do not persist scaled ID widths.
  const baseVisualWidth=(value:number,key?:string)=>key==='displayCode'&&!customizing&&!showAllSourceColumns
    ?projectedIdWidth(Math.min(1600,Math.max(60,Number.isFinite(value)?value:68)))
    :Math.min(1600,Math.max(60,Number.isFinite(value)?value:170));
  const {ref:tableViewportRef,width:viewportWidth}=useElementWidth();
  const baseWidths=displayedColumns.map(c=>({key:c.key,width:baseVisualWidth(c.width,c.key)}));
  const fitWeights=Object.fromEntries(compactPairs.map(pair=>[pair.anchor,
    pair.variant==='contentDetails'||pair.variant==='partyTogether'?3:2]));
  const weights:Record<string,number>={content:3,specificProgress:2,...fitWeights};
  const fitGrowth=useRef<{signature:string;growth:Record<string,number>}|null>(null);
  const fitSignature=JSON.stringify(baseWidths.map(c=>[c.key,weights[c.key]??1]));
  const fittedWidths=fitTableColumns(baseWidths,
    !customizing&&!showAllSourceColumns?Math.max(500,viewportWidth):0,weights,
    fitGrowth.current?.signature===fitSignature?fitGrowth.current.growth:undefined);
  fitGrowth.current={signature:fitSignature,growth:Object.fromEntries(baseWidths.map(c=>
    [c.key,fittedWidths[c.key]-c.width]))};
  const visualWidth=(value:number,key?:string)=>key&&fittedWidths[key]!==undefined
    ?fittedWidths[key]:baseVisualWidth(value,key);
  // Treat transient viewport expansion as a projection extra, so drag preview
  // and source-width inverse transfer the SAME pixels to the last column.
  const groupExtras=Object.fromEntries(compactPairs.map(pair=>[pair.anchor,pair.extraWidth]));
  const projectedExtras=Object.fromEntries(displayedColumns.map(c=>[c.key,
    (compactPairs.find(pair=>pair.anchor===c.key)?.extraWidth??0)+
    fittedWidths[c.key]-baseVisualWidth(c.width,c.key)]));
  const shownWidth=displayedColumns.reduce((sum,column)=>sum+visualWidth(column.width,column.key),0);
  const tableWidth=compactOn?Math.max(500,shownWidth):
    Math.max(Math.min(6000,Math.max(500,Number.isFinite(activeLayout.tableWidth)?activeLayout.tableWidth:1500)),shownWidth);
  // Admin can commit a one-shot shared layout change in view mode; the Firebase
  // merge/CAS logic always compares the original shared layout, not local presets.
  const canViewerArrange=!customizing&&!anonymousViewer&&!!onPersistViewerLayout&&
    !personalViewActive&&!showAllSourceColumns&&!locked;
  // A visual column drag is not a shared-layout write. All viewers may resize
  // their current view; only authorized administrators use CAS to persist it.
  // Personal/anonymous viewers never call the shared Firebase writer.
  const canViewerResize=adminControls&&!customizing&&!showAllSourceColumns&&!permissionMode;
  const applyViewerLayout=async(transform:(base:ItemLayout)=>ItemLayout):Promise<boolean>=>{
    if(!canViewerArrange||viewSavingRef.current||!onPersistViewerLayout||!initialLayout)return false;
    const baseline=initialLayout;
    let next:ItemLayout;
    try{next=validateItemLayout(transform(baseline));}
    catch(error){setLayoutError(error instanceof Error?error.message:'Cấu hình cột không hợp lệ.');return false;}
    if(JSON.stringify(next)===JSON.stringify(baseline))return true;
    viewSavingRef.current=true;setViewSaving(true);setLayoutError('');
    setSaveFeedback('Đang lưu vị trí/độ rộng cột dùng chung…');
    setApplied(next); // optimistic only; revert on any failure
    try{
      const confirmed=await onPersistViewerLayout(next,baseline);
      const valid=validateItemLayout(confirmed??next);
      setApplied(valid);sharedBase.current=valid;
      setSaveFeedback('Đã lưu bố trí/tên cột dùng chung. Các tài khoản khác nhận khi cập nhật cấu hình.');
      return true;
    }catch(error){
      setApplied(initialLayout);
      setLayoutError(saveIssue(error));
      setSaveFeedback('Không lưu được thay đổi. Đã hoàn lại bố trí trước thao tác.');
      return false;
    }finally{viewSavingRef.current=false;setViewSaving(false);}
  };
  const closeGroupLabelEditor=()=>{
    if(viewSavingRef.current)return;
    setEditingGroupLabels(null);setGroupLabelBaseline(null);
    setGroupLabelConflicts([]);setGroupLabelChoices({});setGroupLabelsError('');
  };
  const openGroupLabelEditor=()=>{
    if(!canViewerArrange)return;
    const snapshot=validateItemLayout(initialLayout??activeLayout);
    setGroupLabelBaseline(snapshot);
    setEditingGroupLabels({...snapshot.groupLabels});
    setGroupLabelConflicts([]);setGroupLabelChoices({});setGroupLabelsError('');
  };
  const saveGroupLabels=async(choices:LayoutConflictChoices={})=>{
    if(!editingGroupLabels||!groupLabelBaseline||!canViewerArrange||
      viewSavingRef.current||!onPersistViewerLayout)return;
    let next:ItemLayout;
    try{
      next=validateItemLayout({...groupLabelBaseline,
        groupLabels:validateCompactGroupLabels(editingGroupLabels)});
    }catch(error){setGroupLabelsError(saveIssue(error));return;}
    // No-op edits should not create unnecessary Firebase revisions or
    // overwrite an edit made in another tab while this dialog was open.
    if(JSON.stringify(next.groupLabels)===JSON.stringify(groupLabelBaseline.groupLabels)){
      closeGroupLabelEditor();return;
    }
    viewSavingRef.current=true;setViewSaving(true);setGroupLabelsError('');
    try{
      // The Firebase transaction compares exactly this open-time snapshot to
      // the latest remote layout. Disjoint keys merge; competing keys fail
      // closed and require explicit choices (local vs Firebase) below.
      const confirmed=await onPersistViewerLayout(next,groupLabelBaseline,choices);
      const valid=validateItemLayout(confirmed??next);
      setApplied(valid);sharedBase.current=valid;
      setSaveFeedback('Đã lưu tên cột gộp dùng chung và hợp nhất các thay đổi không xung đột.');
      setLayoutError('');
      setGroupLabelConflicts([]);setGroupLabelChoices({});
      setEditingGroupLabels(null);setGroupLabelBaseline(null);
    }catch(error){
      if(error instanceof LayoutConflictError){
        setGroupLabelConflicts(error.conflicts);setGroupLabelChoices({});
        setGroupLabelsError('Một tab khác đã đổi tên nhóm gộp. Chọn giá trị cần giữ cho từng tên xung đột; chưa có gì bị ghi đè.');
      }else{
        setGroupLabelsError(saveIssue(error));
      }
    }finally{viewSavingRef.current=false;setViewSaving(false);}
  };
  const moveColumn=(from:string,to:string)=>{
    if(customizing){if(locked||!allowLayout)return;
      setLayout(previous=>({...previous,columns:reorderByKey(previous.columns,column=>column.key,from,to)}));return;
    }
    void applyViewerLayout(base=>({...base,columns:reorderByKey(base.columns,column=>column.key,from,to)}));
  };
  const changeColorRules=(next:ColorRule[])=>{if(saveColorRules(personalScope,next))setColorRules(next);else setLayoutError('Không lưu được màu trên trình duyệt này.');};
  const visibleWidth=activeLayout.frameWidth==='auto'||activeLayout.frameWidth===undefined
    ?'100%':`${Math.min(6000,Math.max(320,Number.isFinite(activeLayout.frameWidth)?activeLayout.frameWidth:1500))}px`;
  const widthError=layoutError.toLowerCase().includes('độ rộng');
  const editableField=(item:Item,field:TextField)=>
    canEdit&&!locked&&!(field==='progressBuild'&&buildLocked(item))&&
      (!canEditCell||canEditCell(item.recordId,field));
  /** Source cells keep field-level permission and history when combined visually. */
  const compactField=(item:Item,field:TextField)=>{
    const editable=editableField(item,field);
    const rawValue=String(item[field]??'');
    const original=statusReadOnlyValue(field,effectiveItemField(item,field))||'—';
    const label=TEXT_FIELDS.find(entry=>entry.key===field)?.label??field;
    const kind=activeLayout.columns.find(c=>c.key===field)?.kind;
    const shortLeader=compactOn&&compactDisplay.shortLeaders&&
      (field==='vpLeader'||field==='ubndLeader');
    const shortPerson=compactOn&&compactDisplay.shortSpecialist&&field==='specialist';
    if(field==='progressBuild'&&buildLocked(item))return <span className="compact-part">{buildLockedHint(item)}</span>;
    return <span className={'compact-part'+(editable?' compact-part-editable':'')}
      aria-label={field==='specialist'&&!editable?item.specialist:undefined}>
      {editable
        ?field==='content'
          ?<button type="button" className="content-button" disabled={locked}
            onClick={()=>openContentForEdit(item,'content')}><SearchHighlight value={original} query={columnFilters.content||(!customizing&&(toolbar.field==='all'||toolbar.field==='content')?toolbar.search:'')}/></button>
          :kind==='text'&&!isStatusDisplayField(field)&&field!=='type'
            ?<LeaseTextInput manager={leaseManager} id={item.recordId} field={field} label={displayId(item)+': '+label}
              value={String(item[field]??'')} disabled={locked}
              onChange={value=>onUpdate(item.recordId,{[field]:value})}/>
            :<CellPicker leaseManager={leaseManager} recordId={item.recordId} field={field} editorKind={field==='specialist'?'search':'status'} label={displayId(item)+': '+label} value={statusDisplayValue(field,rawValue)}
              displayValue={isStatusDisplayField(field)?statusDisplayValue(field,rawValue):shortLeader?abbreviateLeaderName(item[field]):shortPerson?abbreviateVietnameseName(item[field]):undefined}
              options={options(field,item)} searchable={field==='specialist'} disabled={locked} highlightQuery={columnFilters[field]}
              onChange={value=>{const next=statusEditSelection(field,rawValue,value);if(next!==null)guardBuildUpdate(item.recordId,{[field]:next});}}/>
        :(shortLeader||shortPerson)?<span title={item[field]} aria-label={item[field]}>
          {(shortLeader?abbreviateLeaderName(item[field]):abbreviateVietnameseName(item[field]))||'—'}</span>:field==='content'?<SearchHighlight value={original} query={columnFilters.content||(!customizing&&(toolbar.field==='all'||toolbar.field==='content')?toolbar.search:'')}/>:original}
      {onCellHistory&&(field==='note'||field==='specificProgress')&&<CellHistoryAction label={label+' · '+displayId(item)}
        onClick={()=>onCellHistory(item,field)}/>}
    </span>;
  };
  const canJoinCvRoom=compactDisplay.teamTogether&&compactPairs.some(p=>
    p.variant==='teamTogether'&&p.memberFields.includes('room')&&p.memberFields.includes('specialist'));
  const compactMenu=adminControls&&compactOn&&!permissionMode&&!customizing&&(shareCompact||allowPersonalCompact)&&
    (<details className="compact-columns-menu">
      <summary aria-label="Tùy chọn gộp cột">Tùy chọn người phụ trách <span aria-hidden="true">▾</span></summary>
      <div className="compact-columns-options" role="group" aria-label="Hiển thị gọn cột">
        <strong>Hồ sơ và tiến độ 3 khâu luôn gộp khi xem</strong>
        {COMPACT_OPTIONS.filter(option=>option.section==='merge'&&
          (option.key!=='cvRoomInline'||canJoinCvRoom)).map(option=><label key={option.key}>
          <input type="checkbox" checked={compactDisplay[option.key]}
            onChange={event=>updateCompact(option.key,event.currentTarget.checked)}/>
          <span>{option.label}<small>{option.detail}</small></span>
        </label>)}
        <details className="compact-more-options">
          <summary>Viết tắt tên</summary>
          {COMPACT_OPTIONS.filter(option=>option.section==='name').map(option=><label key={option.key}>
            <input type="checkbox" checked={compactDisplay[option.key]}
              onChange={event=>updateCompact(option.key,event.currentTarget.checked)}/>
            <span>{option.label}<small>{option.detail}</small></span>
          </label>)}
        </details>
        <p>{shareCompact?'Quản trị: lưu bố cục dùng chung qua Firebase.':'Tùy chọn cá nhân trên trình duyệt · không ghi Firebase.'}</p>
        {compactStorageWarning&&<p className="muted" role="status">{compactStorageWarning}</p>}
        {!shareCompact&&personalCompact&&<button type="button" className="button ghost" onClick={()=>{
          setPersonalCompact(null);setCompactStorageWarning(clearPersonalCompactDisplay(viewerCompactScope)?'':
            'Trình duyệt không cho xóa lựa chọn đã lưu.');}}>Khôi phục cách hiển thị chung</button>}
      </div>
    </details>);
  return <section className="card item-list-card">
    {customizing&&anonymousViewer&&<div className="guest-edit-bar">
      <strong>Sửa thử nội dung được cấp quyền</strong>
      <div className="top-actions">
        {pendingData&&onKeepDraft&&<button className="button ghost" onClick={()=>{if(onKeepDraft())onClose();}}>Giữ phần sửa trên máy</button>}
        <button className="button ghost" onClick={exit}>Về danh sách</button>
      </div>
    </div>}
    {customizing&&adminControls&&!permissionMode&&<>
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
{!permissionMode&&<fieldset className="settings-saving" disabled={locked||!allowLayout}><ItemColumnPanel catalog={catalog} items={items} permissions={permissions} layoutDirty={dirty} savedGroupLabels={saveBaseline.groupLabels} onSaveLayout={async()=>{try{await persistSavedLayout(validateItemLayout(layout));setLayoutError('');setSaveFeedback('');}catch(cause){handleLayoutFailure(cause);throw cause;}}} onSaveCatalog={onPersistCatalog} onSavePermissions={onSavePermissions} onDirtyChange={setColumnExtrasDirty} layout={layout} validationMessage={widthError?layoutError:undefined} onChange={value=>{setSaveFeedback('');setLayoutError('');setLayoutConflicts([]);setConflictChoices({});setLayout(value);}}/></fieldset>}
</>}
    <div className="item-data-region" style={{width:visibleWidth,maxWidth:'100%'}}>
    {/* Guest never mounts the obsolete personal column menu or its empty spacer. */}
    {adminControls&&<div className="card-header">
    <div className="item-header-actions">
      {compactMenu}
      {!customizing&&compactOn&&onPersistViewerLayout&&<button type="button"
        className="button ghost group-label-shortcut"
        disabled={!canViewerArrange}
        title={personalViewActive?'Đóng giao diện cá nhân để sửa tên cột dùng chung':!canViewerArrange?'Chờ bố cục dùng chung tải xong':'Đổi tiêu đề cột gộp, không đổi dữ liệu Excel'}
        onClick={openGroupLabelEditor}>
        Đổi tên cột gộp
      </button>}
      {!customizing&&!permissionMode&&statusPaletteStore&&onStatusPaletteChange&&
        <StatusPaletteManager store={statusPaletteStore} onStoreChange={onStatusPaletteChange}/>}
      {!customizing&&onPersistViewerLayout&&<span className="muted admin-column-arrange-hint"
        role="status">{viewSaving?'Đang lưu cột…':personalViewActive?'Mở giao diện chung để kéo cột dùng chung':showAllSourceColumns?'Tắt “Hiện đủ cột Excel” để kéo cột':'Admin: kéo đầu cột để đổi vị trí, kéo mép để đổi độ rộng · tự lưu dùng chung'}</span>}
      {adminControls&&!customizing&&<div className="source-column-visibility" role="group" aria-label="Hiển thị cột nguồn Excel">
        <span>{displayedColumns.length} / {activeLayout.columns.filter(c=>!c.removed).length} cột dữ liệu</span>
        <button type="button" className="button ghost" aria-pressed={showAllSourceColumns}
          onClick={()=>setShowAllSourceColumns(current=>!current)}>
          {showAllSourceColumns?'Theo cột đã chọn':'Hiện đủ cột Excel'}
        </button>
      </div>}

    </div></div>}
    {!customizing&&onPersistViewerLayout&&(saveFeedback||layoutError)&&
      <p className={layoutError?'notice error-text':'muted'} role={layoutError?'alert':'status'}>{layoutError||saveFeedback}</p>}
    {customizing&&!anonymousViewer&&saveDataHint&&pendingData&&<p className="notice">{saveDataHint}</p>}
     {/* ColumnFilterCell remains accessible in editing and popup.
         Ordinary List uses compact AND toolbar, without a tall header row. */}
    {!customizing&&!permissionMode&&<>
      <div className="list-filter-toolbar" role="search" aria-label="Bộ lọc Danh sách">
        <input className="list-filter-search" type="search"
          aria-label="Tìm kiếm không dấu" placeholder="Tìm kiếm không dấu…"
          value={toolbar.search}
          onChange={e=>setToolbar(old=>({...old,search:e.currentTarget.value}))}/>
        <select className="list-filter-organisation" aria-label="Lọc Sở, ngành"
          value={toolbar.department}
          onChange={e=>setToolbar(old=>({...old,department:e.currentTarget.value}))}>
          <option value="">Tất cả Sở/ngành</option>
          {exactChoices(items,'department').map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <select className="list-filter-organisation" aria-label="Lọc Phòng"
          value={toolbar.room}
          onChange={e=>setToolbar(old=>({...old,room:e.currentTarget.value}))}>
          <option value="">Tất cả Phòng</option>
          {exactChoices(items,'room').map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <details className="list-filter-other"
          onToggle={e=>setOtherFiltersOpen(e.currentTarget.open)}>
          <summary>Lọc khác <span aria-hidden="true">▾</span></summary>
          {otherFiltersOpen&&<div className="list-filter-other-panel" role="group" aria-label="Các trường lọc chi tiết">
            <label>Chọn trường tìm kiếm
              <select aria-label="Chọn trường tìm kiếm" value={toolbar.field}
                onChange={e=>setToolbar(old=>({...old,field:e.currentTarget.value}))}>
                {SEARCH_FIELDS.map(field=><option key={field.key} value={field.key}>{field.label}</option>)}
                {activeLayout.columns.filter(c=>c.origin==='custom'&&!c.removed).map(c=>
                  <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            {DETAIL_FIELDS.map(({key,label})=><label key={key}>{label}
              <select aria-label={'Lọc '+label} value={toolbar.details[key]}
                onChange={e=>setToolbar(old=>({...old,details:{...old.details,
                  [key]:e.currentTarget.value}}))}>
                <option value="">Tất cả</option>
                {exactChoices(items,key).map(value=><option key={value} value={value}>{value}</option>)}
              </select>
            </label>)}
          </div>}
        </details>
        <button type="button" className="button ghost list-filter-clear"
          onClick={clearAllListFilters} disabled={!anyListFilter}
          title="Xóa mọi bộ lọc Danh sách (Esc khi không ở trong ô nhập)">
          Xóa lọc · Esc</button>
        <span className="list-filter-count" role="status">{filtered.length} kết quả</span>
      </div>
      <ItemSummaryCards items={toolbarBase}
        selection={summarySelection} onSelect={selectSummary}
        kindSelection={kindSelection} onSelectKind={selectKind}
        onClear={()=>setSummarySelection(null)} visibleCount={filtered.length}/>
    </>}
    {permissionMode&&permissions&&onSavePermissions?<InlinePermissionsTable showBackButton={!externalSectionTabs} items={rows} columns={columns} permissions={permissions} onSave={onSavePermissions} onReload={onReloadPermissions} onDirtyChange={setPermissionDirty} switchRequest={permissionSwitchRequest} onBack={()=>{
      setPermissionMode(false);setPermissionDirty(false);setLayoutError("");
      if(exitAfterPermissions.current){
        exitAfterPermissions.current=false;
        if(dirty||columnExtrasDirty||Object.keys(drafts).length)setConfirmExit(true);else onClose();
      }
    }} disabled={locked}/>:<><div ref={tableViewportRef} className="table-wrap item-table-scroll" tabIndex={0} role="region" aria-label="Bảng nội dung cuộn ngang và dọc"><table className="data-table item-data-table" style={{width:`${tableWidth}px`,tableLayout:'fixed'}}><colgroup>{displayedColumns.map(column=><col key={column.key} style={{width:`${visualWidth(column.width,column.key)}px`}}/>)}</colgroup><thead><tr className="item-heading-row">{displayedColumns.map((column,index)=><ColumnHeader key={column.key} columnKey={column.key}
  sortLabel={column.label} sortDirection={columnSort?.key===column.key?columnSort.direction:null} onSort={!permissionMode?cycleSort:undefined}
  disabled={!(customizing&&!locked&&adminControls||canViewerArrange)}
  previousKey={displayedColumns[index-1]?.key} nextKey={displayedColumns[index+1]?.key}
  onMove={moveColumn}>{column.label}{((customizing&&!locked&&allowLayout)||canViewerArrange||canViewerResize)&&
    index<displayedColumns.length-1&&column.key!=='displayCode'&&
    projectedAdjacentBounds(activeLayout,displayedColumns.map(col=>col.key),column.key,
      projectedExtras,compactOn,groupExtras)&&
    <ColumnResizeHandle windowDragFallback columnIndex={index} width={visualWidth(column.width,column.key)}
      adjacent={{index:index+1,
        width:visualWidth(displayedColumns[index+1].width,displayedColumns[index+1].key),
        ...projectedPhysicalLimits(displayedColumns[index+1].key,groupExtras,compactOn)}}
      fallback={index+1<displayedColumns.length-1?{
        index:displayedColumns.length-1,
        width:visualWidth(displayedColumns.at(-1)!.width,displayedColumns.at(-1)!.key),
        ...projectedPhysicalLimits(displayedColumns.at(-1)!.key,groupExtras,compactOn)}:undefined}
      {...projectedPhysicalLimits(column.key,groupExtras,compactOn)}
      label={column.label} onCommit={width=>{
        const keys=displayedColumns.map(col=>col.key);
        // Same pair-first transfer in preview and CAS commit. Bake viewport
        // growth only upon an explicit drag, so a wide neighbor can shrink.
        if(customizing)setLayout(previous=>resizeProjectedWithAdjacent(previous,keys,
          column.key,width,projectedExtras,compactOn,groupExtras));
        else if(canViewerArrange)void applyViewerLayout(base=>resizeProjectedWithAdjacent(base,keys,
          column.key,width,projectedExtras,compactOn,groupExtras));
        else if(canViewerResize)setApplied(previous=>resizeProjectedWithAdjacent(previous,keys,
          column.key,width,projectedExtras,compactOn,groupExtras));
      }}/>}</ColumnHeader>)}</tr>{adminControls&&(customizing||permissionMode)&&<tr className="item-column-filter-row">
  {displayedColumns.map(column=>compactPairs.some(pair=>pair.anchor===column.key&&
      (pair.variant==='contentDetails'||pair.variant==='partyTogether'))
    ?<CompactGroupFilterCell key={column.key} items={statusFilterItems}
      fields={compactPairs.find(pair=>pair.anchor===column.key)!.memberFields}
      values={columnFilters} onChange={(field,value)=>setColumnFilters(previous=>{
        const next={...previous};if(value)next[field]=value;else delete next[field];return next;
      })}/>
    :compactPairs.some(pair=>pair.anchor===column.key&&pair.variant==='roomSpecialist')
    ?<RoomSpecialistFilterCell key={column.key} items={items}
      room={columnFilters.room??''} person={columnFilters.specialist??''}
      onRoom={value=>setColumnFilters(previous=>({...previous,room:value}))}
      onPerson={value=>setColumnFilters(previous=>({...previous,specialist:value}))}/>
    :<ColumnFilterCell key={column.key} field={column.key} label={column.label} items={statusFilterItems}
    getValue={compactPairs.some(pair=>pair.anchor===column.key)
      ?item=>compactFilterText(item,column.key,compactPairs)
      :column.origin==='custom'?(item)=>column.values?.[customRowKey(item)]??'':undefined}
    forceText={compactPairs.some(pair=>pair.anchor===column.key)||
      column.key==='specialist'&&compactOn&&compactDisplay.shortSpecialist}
    choices={column.origin==='custom'&&column.kind==='select'?column.options:undefined}
    value={columnFilters[column.key]??''} onChange={value=>{setColumnFilters(previous=>{const next={...previous};if(value)next[column.key]=value;else delete next[column.key];return next;});}} />)}
  </tr>}</thead><tbody>
      {rows.map(item => <tr key={item.recordId} className={['color-row',itemColor(item,colorRules)?'color-'+itemColor(item,colorRules):''].join(' ')}>{displayedColumns.map(column=>{const key=column.key as TextField;
        const pair=compactPairs.find(pair=>pair.anchor===column.key);
        if(pair){
          const anyEditable=pair.memberFields.some(field=>editableField(item,field as TextField));
          return <td key={column.key} data-col-key={column.key}
            className={anyEditable?'editable-cell compact-merged-cell':'compact-merged-cell'} onClick={activateEditableCell}
            data-edit-hint={anyEditable?'Bấm để sửa':undefined}
            style={undefined}>
            <CompactGroupedValue item={projectedBuildDisplayItem(item)} pair={pair}
              field={field=>compactField(item,field)} editable={field=>editableField(item,field)}
              tone={field=>field==='progressBuild'&&buildLocked(item)?undefined:statusPaletteTone(field,effectiveItemField(item,field),statusPaletteStore?.active.otherEnabled??false)??undefined}
              highlight={field=>cellHighlightStyle(effectiveItemField(item,field),field,activeLayout.cellHighlights)}
              cvRoomInline={compactDisplay.cvRoomInline}/>
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
          style={cellHighlightStyle(displayId(item),column.key,activeLayout.cellHighlights)}><span className="code" tabIndex={0} aria-label={"Mã hồ sơ "+displayId(item)} title={isMissingDisplayCode(item.displayCode)?undefined:`Mã gốc: ${item.displayCode}`}>{displayId(item)}</span>{(aliasCounts.get(displayId(item))??0)>1&&<small className="warning-text">Trùng ID hiển thị · {item.displayCode}</small>}{drafts[item.recordId]&&<small>Chưa lưu</small>}{errors[item.recordId]&&<p className="error-text" role="alert">{errors[item.recordId]}</p>}</td>;
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
        const writable=editableField(item,key);
        return <td key={column.key} data-col-key={column.key}
          data-progress-tone={key==='progressBuild'&&buildLocked(item)?undefined:statusPaletteTone(key,effectiveItemField(item,key),statusPaletteStore?.active.otherEnabled??false)??undefined}
          className={[writable?'editable-cell':'',onCellHistory&&(key==='note'||key==='specificProgress')?'has-history-action':''].filter(Boolean).join(' ')} onClick={activateEditableCell}
          data-edit-hint={writable?'Bấm để sửa':undefined}
          style={cellHighlightStyle(effectiveItemField(item,key),column.key,activeLayout.cellHighlights)}>{key==='type'
          ?<span className="pr95-v6-type-cell" data-kind={compactTypeTone(item.type)}
            data-editable={writable?'true':undefined}
            style={cellHighlightStyle(item.type,'type',activeLayout.cellHighlights)}>
            {writable
              ?<CellPicker leaseManager={leaseManager} recordId={item.recordId} field="type"
                label={`${displayId(item)}: ${metadata.label}`} value={item.type}
                options={options('type',item)} disabled={locked} highlightQuery={columnFilters.type}
                onChange={next=>{if(next!==item.type)guardBuildUpdate(item.recordId,{type:next});}}/>
              :<SearchHighlight value={item.type||'—'} query={columnFilters.type}/>}
           </span>
          :key==='progressBuild'&&buildLocked(item)?buildLockedHint(item):writable?key==='content'?<button className="content-button" onClick={()=>openContentForEdit(item,'content')} disabled={locked}><SearchHighlight value={item.content||'—'} query={columnFilters.content||(!customizing&&(toolbar.field==='all'||toolbar.field==='content')?toolbar.search:'')}/></button>:key==='note'?<InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field="note" value={item.note} highlightQuery={columnFilters.note}
    label={`${displayId(item)}: ${metadata.label}`} onCommit={value=>{
      if(!writable)return false;
      onUpdate(item.recordId,{note:value});return true;
    }}/>:key==='specificProgress'?<InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field="specificProgress" value={item.specificProgress} highlightQuery={columnFilters.specificProgress}
    label={`${displayId(item)}: ${metadata.label}`} onCommit={value=>{
      if(!writable)return false;
      onUpdate(item.recordId,{specificProgress:value});return true;
    }}/>:column.kind==='text'&&!isStatusDisplayField(key)&&key!=='type'
  ?<LeaseTextInput manager={leaseManager} id={item.recordId} field={key} label={`${displayId(item)}: ${column.label}`}
    maxLength={1000} value={String(item[key]??'')} disabled={locked}
    onChange={value=>onUpdate(item.recordId,{[key]:value})}/>
  :<CellPicker leaseManager={leaseManager} recordId={item.recordId} field={key} editorKind={key==='specialist'?'search':'status'} label={`${displayId(item)}: ${column.label}`} value={statusDisplayValue(key,item[key])}
    displayValue={isStatusDisplayField(key)?statusDisplayValue(key,item[key]):compactOn&&((key==='specialist'&&compactDisplay.shortSpecialist)||
      ((key==='vpLeader'||key==='ubndLeader')&&compactDisplay.shortLeaders))?
      (key==='vpLeader'||key==='ubndLeader'?abbreviateLeaderName(item[key]):abbreviateVietnameseName(item[key])):undefined}
    options={options(key,item)} searchable={key==="specialist"} disabled={locked} highlightQuery={columnFilters[key]}
    onChange={value=>{const next=statusEditSelection(key,item[key],value);if(next!==null)guardBuildUpdate(item.recordId,{[key]:next});}}/>:key==='specialist'&&compactOn&&compactDisplay.shortSpecialist
      ?<span aria-label={item.specialist} title={item.specialist}>{abbreviateVietnameseName(item.specialist)||'—'}</span>
      :(key==='vpLeader'||key==='ubndLeader')&&compactOn&&compactDisplay.shortLeaders
        ?<span title={item[key]} aria-label={item[key]}>{abbreviateLeaderName(item[key])||'—'}</span>
      :statusPaletteTone(key,effectiveItemField(item,key),statusPaletteStore?.active.otherEnabled??false)
        ?<span className="workflow-status-value"><SearchHighlight value={statusReadOnlyValue(key,effectiveItemField(item,key))} query={columnFilters[key]}/></span>
      :<SearchHighlight value={statusReadOnlyValue(key,effectiveItemField(item,key))||'—'} query={columnFilters[key]}/>} {key==='specialist'&&assignmentIssue(item,catalog)&&<small className="warning-text">{assignmentIssue(item,catalog)}</small>}
          {onCellHistory&&(key==='note'||key==='specificProgress')&&<CellHistoryAction label={metadata.label+' · '+displayId(item)}
            onClick={()=>onCellHistory(item,key)}/>}</td>;
      })}</tr>)}
      {!rows.length && <tr><td className="empty" colSpan={Math.max(1,displayedColumns.length)}>Không tìm thấy nội dung phù hợp. Hãy thử đổi từ khóa hoặc bộ lọc.</td></tr>}
    </tbody></table></div></>}
    </div>
    {editingGroupLabels!==null&&<Modal title="Đổi tên cột gộp dùng chung" onClose={closeGroupLabelEditor}>
      <form className="modal-body group-label-quick-editor" onSubmit={event=>{event.preventDefault();void saveGroupLabels();}}>
        <p className="muted">Chỉ đổi tiêu đề các cột gộp. Không đổi dữ liệu, quyền sửa hoặc tên trường Excel. Bỏ trống để dùng tên mặc định.</p>
        {COMPACT_GROUP_LABEL_KEYS.map(key=><div className="group-label-editor-row" key={key}>
          <label className="field">{COMPACT_GROUP_DEFAULT_LABELS[key]}
            <input type="text" maxLength={100} value={editingGroupLabels[key]??''}
              aria-label={'Đổi tên cột gộp '+key}
              placeholder={COMPACT_GROUP_DEFAULT_LABELS[key]}
              disabled={viewSaving}
              onChange={event=>{const value=event.currentTarget.value;
                setEditingGroupLabels(prev=>({...prev,[key]:value}));}}/>
          </label>
          <button type="button" className="button ghost" disabled={viewSaving||!editingGroupLabels[key]}
            onClick={()=>setEditingGroupLabels(prev=>{const next={...prev};delete next[key];return next;})}>
            Mặc định
          </button>
        </div>)}
        {groupLabelsError&&<p role="alert" className="error-text">{groupLabelsError}</p>}
        {groupLabelConflicts.length>0&&<LayoutConflictResolver
          conflicts={groupLabelConflicts} choices={groupLabelChoices} busy={viewSaving}
          onChoose={(field,choice)=>setGroupLabelChoices(current=>({...current,[field]:choice}))}
          onConfirm={()=>void saveGroupLabels(groupLabelChoices)}
          onCancel={()=>{setGroupLabelConflicts([]);setGroupLabelChoices({});setGroupLabelsError('');}}/>}
        <div className="modal-footer">
          <button type="button" className="button ghost" disabled={viewSaving}
            onClick={closeGroupLabelEditor}>Hủy</button>
          <button type="submit" className="button primary"
            disabled={viewSaving||!canViewerArrange||groupLabelConflicts.length>0}>
            {viewSaving?'Đang lưu…':'Lưu tên cột dùng chung'}
          </button>
        </div>
      </form>
    </Modal>}
    {canEdit && contentItem && <ContentEditor key={`${contentItem.item.recordId}:${contentItem.field}`} sourceKey={sourceKey} item={contentItem.item} field={contentItem.field} sourceKind={effectiveSourceKind} draftOnly={draftOnly} onSave={value => onUpdate(contentItem.item.recordId, { [contentItem.field]:value })} onClose={closeContentEditor} />}
    {customizing&&unmatchedCheckpoint&&<Modal title="Có thay đổi hiển thị cũ" onClose={onClose}><div className="modal-body"><p>Cách hiển thị đang giữ trên máy không khớp cách hiển thị dùng chung hiện tại. Nạp để đối chiếu không ghi Google hoặc Excel.</p><p className="muted">Đã giữ trên máy: {new Date(unmatchedCheckpoint.savedAt).toLocaleString('vi-VN')}</p></div><div className="modal-footer"><button className="button ghost" onClick={onClose}>Giữ thay đổi trên máy và về xem</button><button className="button danger" onClick={discardOldDraft}>Bỏ phần sửa cách hiển thị cũ</button><button className="button primary" onClick={()=>{if(unmatchedCheckpoint)setRestoredBase(unmatchedCheckpoint.base);restoreOldDraft();}}>Nạp phần sửa để đối chiếu</button></div></Modal>}
    {confirmExit&&<Modal title="Xử lý thay đổi trước khi về xem?" onClose={()=>{if(!locked)setConfirmExit(false);}}><div className="modal-body"><p>Phần bạn đang sửa chưa lưu. Giữ trên máy không ghi dữ liệu vào nguồn và không lưu cách hiển thị dùng chung.</p>{layoutError&&<p className="error-text">{layoutError}</p>}</div><div className="modal-footer"><button className="button ghost" disabled={locked} onClick={()=>setConfirmExit(false)}>Tiếp tục sửa</button><button className="button danger" disabled={locked||dataSaving} onClick={()=>{setLayout(applied);clearCheckpoint();onDiscardData();setConfirmExit(false);onClose();}}>Bỏ phần đang sửa và về xem</button>{cannotSaveData&&onKeepDraft?<button className="button primary" disabled={locked} onClick={()=>{if(onKeepDraft())onClose();}}>Giữ thay đổi trên máy và về xem</button>:<button className="button primary" disabled={locked||dataSaving} onClick={()=>{setConfirmExit(false);}} >Lưu riêng phần đang sửa trước khi về xem</button>}</div></Modal>}

  </section>;
}



