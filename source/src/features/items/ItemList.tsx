import { useEffect, useMemo, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import type {CSSProperties} from 'react';
import type { Changes, Item, Patch, TextField, EditableField } from '../../../shared/types';
import { TEXT_FIELDS, STATUS_OPTIONS } from '../../../shared/field-definitions';
import { ContentEditor } from './ContentEditor';
import {InlineNoteEditor} from './InlineNoteEditor';
import { displayId, isMissingDisplayCode } from '../../domain/display-id';
import { DEFAULT_LIST_TITLE, SUMMARY_CARD_KEYS, validateListTitle, EXCEL_SOURCE_COLUMNS, EXCEL_COLUMN_KEYS, COMPACT_GROUP_LABEL_KEYS, validateCompactGroupLabels, cellHighlightStyle, overlayPersonalLayout, defaultItemLayout, loadItemLayout, saveItemLayout, validateItemLayout,validatePartyTrackWidths,resolvedPartyTrackWidths,partyTrackPhysicalWidth,partyTrackModeWidth,PARTY_TRACK_WIDTH_LIMITS,PARTY_TRACK_NAMES } from '../../data/item-preferences';
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
import {selectablePartyProgress,partyProgressEditIssue} from '../../domain/party-progress-edit';
import {LeaseTextInput} from './LeaseTextInput';
import type {CellEditSessionManager} from '../../data/cell-edit-leases';
import {activateEditableCell} from './activate-editable-cell';
import { reorderByKey } from '../../domain/reorder-columns';
import type {CellPermissions} from '../../data/firebase-repository';
import {InlinePermissionsTable} from './InlinePermissionsTable';
import './item-frame.css';
import './admin-list-controls.css';
import './real-list-visual-parity.css';
import './l03-track-widths.css';
import './pr95-v6-l3-page-layout.css';
import './inline-note-hit-area.css';
// Legacy ListViewTools no longer appears in the operational list.
import {sortItems,type ColumnSort} from '../../domain/sort-items';
import {ColumnResizeHandle} from '../../components/ColumnResizeHandle';
import {projectedIdWidth,projectedPhysicalLimits,projectedAdjacentBounds,resizeProjectedWithAdjacent} from '../../data/resize-last-column';
import {fitTableColumns} from '../../data/fit-table-columns';
import {ItemSummaryCards} from './ItemSummaryCards';
import {summarizeListItems,type SummarySelection} from '../../domain/item-summary';
import {DETAIL_FIELDS,SEARCH_FIELDS,SEARCHABLE_ITEM_FIELDS,newToolbarState,filterToolbarRows,filterByChips,
  exactChoices,shouldClearListOnEscape,
  type ListKind} from './list-toolbar-filters';
import './list-filter-toolbar.css';
import {ActiveListFilters} from './ActiveListFilters';
import {BulkPasteModal} from './BulkPasteModal';
import type {BulkPatch} from './bulk-paste';
import {printVisibleListA4} from './list-print';
import {activeListConditions,activeOtherFilterCount,removeActiveListCondition,
  type ActiveListCondition} from './pr95-v6-l4-active-filters';
import {useElementWidth} from '../../components/useElementWidth';
import {mountSharedEditTooltip} from '../../components/SharedEditTooltip';
import {buildLocked,buildLockReason,effectiveBuildStatus,effectiveItemField,projectedBuildDisplayItem,rejectsBuildChange} from '../../domain/pr95-v5-l4-build-effective';
import {CellHistoryAction} from '../../components/CellHistoryAction';
import {emptyListFilters,clearActivePersonalView,loadColorRules,saveColorRules,itemColor,type ColorRule} from '../../data/list-views';
import {createReferenceListLayout,referenceListLayoutNeedsSync} from '../../data/reference-list-layout';
import {placeCompactMenu, type CompactMenuPlacement} from './compact-menu-placement';

export function ItemList({ items, drafts, errors, savingRows, busy, onUpdate, onCellHistory, readOnly = false, sourceKind, customizing = false, sourceKey, catalog, onClose, onSaveData, onDiscardData, onLayoutSaved,initialLayout,onPersistLayout,canEditDraft=true,layoutSaveLabel='Lưu cách hiển thị',saveDataHint='',onKeepDraft,canEditCell,allowLayout=true,dataSaving=false,sourceLabel,draftOnly=false,permissions,onSavePermissions,onReloadPermissions,onFrameWidthChange,anonymousViewer=false,onDirtyChange,exitRequest=0,permissionModeOnly=false,externalSectionTabs=false,onOpenCatalog,onPersistCatalog,statusPaletteStore,onStatusPaletteChange,onPersistViewerLayout,leaseManager,viewerScope='browser',allowPersonalCompact=false,compactPreview=false,compactChrome=false,onBulkApply }: { items: Item[]; drafts: Record<string, Patch>; errors: Record<string, string>; savingRows?:ReadonlySet<string>; busy: boolean; onUpdate: (id: string, changes: Changes) => boolean|void; onHistory: (item: Item) => void; onCellHistory?:(item:Item,field:TextField)=>void; readOnly?: boolean; sourceKind?: 'demo'|'google'|'firebase'; customizing?: boolean; sourceKey:string; catalog:CatalogConfig; onClose:()=>void; onSaveData:()=>Promise<boolean>; onDiscardData:()=>void; onLayoutSaved:(message:string)=>void;initialLayout?:ItemLayout;onPersistLayout?:(layout:ItemLayout,baseline?:ItemLayout,choices?:LayoutConflictChoices)=>Promise<ItemLayout|void>;canEditDraft?:boolean;layoutSaveLabel?:string;saveDataHint?:string;onKeepDraft?:()=>boolean;canEditCell?:(id:string,field:EditableField)=>boolean;allowLayout?:boolean;dataSaving?:boolean;sourceLabel?:string;draftOnly?:boolean;permissions?:CellPermissions;onSavePermissions?:(next:CellPermissions,expected:CellPermissions)=>Promise<void>;onReloadPermissions?:()=>Promise<CellPermissions>;onFrameWidthChange?:(width:'auto'|number)=>void; anonymousViewer?:boolean;onDirtyChange?:(dirty:boolean)=>void;exitRequest?:number;permissionModeOnly?:boolean;externalSectionTabs?:boolean;onOpenCatalog?:(key:string)=>void;onPersistCatalog?:(next:CatalogConfig)=>Promise<void>;statusPaletteStore?:StatusPaletteStore;onStatusPaletteChange?:(next:StatusPaletteStore)=>boolean;onPersistViewerLayout?:(layout:ItemLayout,baseline:ItemLayout,choices?:LayoutConflictChoices)=>Promise<ItemLayout|void>;leaseManager?:CellEditSessionManager;viewerScope?:string;allowPersonalCompact?:boolean;compactPreview?:boolean;compactChrome?:boolean;onBulkApply?:(patches:readonly BulkPatch[])=>Promise<void>|void }) {
  useEffect(()=>mountSharedEditTooltip(),[]);
  // Dense visual chrome is independent of RAM-only preview tools.
  const denseChrome=compactPreview||compactChrome;
  const [referencePresetConfirm,setReferencePresetConfirm]=useState(false);
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
  const [listTitleDraft,setListTitleDraft]=useState<string|null>(null);
  const [titleEditorOpen,setTitleEditorOpen]=useState(false);
  const [previewOptionsOpen,setPreviewOptionsOpen]=useState(false);
  const [bulkPasteOpen,setBulkPasteOpen]=useState(false);
  const searchStorageKey=(compactPreview?'hdnd-preview-search-columns:':'hdnd-list-search-columns:')+sourceKey;
  const searchChoices=[...SEARCHABLE_ITEM_FIELDS,'*'];
  const [selectedSearchColumns,setSelectedSearchColumns]=useState<string[]>(()=>{
    if(typeof window==='undefined'||!denseChrome)return searchChoices;
    try{
      const saved=JSON.parse(window.localStorage.getItem(searchStorageKey)??'null');
      if(Array.isArray(saved)&&saved.length&&saved.every((x:unknown)=>typeof x==='string')&&
         saved.every((x:string)=>searchChoices.includes(x)))
        return [...new Set(saved)] as string[];
    }catch{/* settings unavailable, use all columns */}
    return searchChoices;
  });
  useEffect(()=>{
    if(!denseChrome||typeof window==='undefined')return;
    try{window.localStorage.setItem(searchStorageKey,JSON.stringify(selectedSearchColumns));}
    catch{/* browser storage denied, state still works */}
  },[denseChrome,searchStorageKey,selectedSearchColumns]);
  const [titleValidationError,setTitleValidationError]=useState('');
  const [l03WidthEditorOpen,setL03WidthEditorOpen]=useState(false);
  const [l03WidthsDraft,setL03WidthsDraft]=useState({readonly:{label:'',status:''},editable:{label:'',level:'',status:''}});
  const [l03WidthErrors,setL03WidthErrors]=useState<Record<string,string>>({});
  const l03EditBaseline=useRef<ItemLayout|null>(null);
  const listTitleBaseline=useRef<ItemLayout|null>(null);
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
  useEffect(()=>{if(initialLayout&&!customizing){setApplied(initialLayout);sharedBase.current=initialLayout;}},[initialLayout,customizing]);
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
  // The old absolutely positioned menu was clipped by the viewport-fit List's
  // overflow:hidden containers. Only this display-options popup uses a body portal.
  const compactDetailsRef=useRef<HTMLDetailsElement>(null);
  const compactSummaryRef=useRef<HTMLElement>(null);
  const compactPanelRef=useRef<HTMLDivElement>(null);
  const [compactMenuOpen,setCompactMenuOpen]=useState(false);
  const [compactMenuPlacement,setCompactMenuPlacement]=useState<CompactMenuPlacement|null>(null);
  useEffect(()=>{
    if(!compactMenuOpen||typeof window==='undefined')return;
    let animationFrame=0;
    const updatePosition=()=>{
      const summary=compactSummaryRef.current;
      if(!summary)return;
      const next=placeCompactMenu(summary.getBoundingClientRect(),window.innerWidth,window.innerHeight);
      setCompactMenuPlacement(previous=>
        previous&&Object.keys(next).every(key=>previous[key as keyof CompactMenuPlacement]===
          next[key as keyof CompactMenuPlacement])?previous:next);
    };
    const schedulePosition=()=>{
      window.cancelAnimationFrame(animationFrame);
      animationFrame=window.requestAnimationFrame(updatePosition);
    };
    const close=()=>{
      if(compactDetailsRef.current)compactDetailsRef.current.open=false;
      setCompactMenuOpen(false);
    };
    const onPointerDown=(event:PointerEvent)=>{
      const node=event.target;
      if(!(node instanceof Node))return;
      if(compactDetailsRef.current?.contains(node)||compactPanelRef.current?.contains(node))return;
      close();
    };
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key!=='Escape')return;
      event.preventDefault();
      event.stopPropagation();
      close();
      compactSummaryRef.current?.focus();
    };
    updatePosition();
    window.addEventListener('resize',schedulePosition);
    window.addEventListener('scroll',schedulePosition,true);
    document.addEventListener('pointerdown',onPointerDown,true);
    document.addEventListener('keydown',onKeyDown,true);
    return()=>{
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener('resize',schedulePosition);
      window.removeEventListener('scroll',schedulePosition,true);
      document.removeEventListener('pointerdown',onPointerDown,true);
      document.removeEventListener('keydown',onKeyDown,true);
    };
  },[compactMenuOpen]);
  useEffect(()=>{
    if(compactMenuOpen&&compactMenuPlacement)compactPanelRef.current?.focus({preventScroll:true});
  },[compactMenuOpen,!!compactMenuPlacement]);

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
  const [viewLayoutConflicts,setViewLayoutConflicts]=useState<LayoutFieldConflict[]>([]);
  const [viewLayoutChoices,setViewLayoutChoices]=useState<LayoutConflictChoices>({});
  const pendingViewLayout=useRef<{baseline:ItemLayout;next:ItemLayout;kind:'title'|'cards'|'layout'}|null>(null);
  const [permissionMode,setPermissionMode] = useState(permissionModeOnly);
  useEffect(()=>{
    if(!compactOn||customizing||permissionMode){
      setCompactMenuOpen(false);
      setCompactMenuPlacement(null);
    }
  },[compactOn,customizing,permissionMode]);
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
  const guardBuildUpdate=(id:string,changes:Changes):boolean=>{
    const latest=latestItems.current.find(entry=>entry.recordId===id);
    if(!latest||rejectsBuildChange(latest,changes))return false;
    const issue=partyProgressEditIssue(latest,changes);
    if(issue){onLayoutSaved(issue);return false;}
    return onUpdate(id,changes)!==false;
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
    // Even a hidden configured source/custom column retains its existing AND filter.
    const permitted=new Set(activeLayout.columns.filter(c=>!c.removed).map(c=>c.key));
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
      term.trim()&&activeLayout.columns.some(column=>column.key===key&&column.origin==='custom'&&!column.removed)
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
    },denseChrome?selectedSearchColumns:undefined),
    [columnFiltered,toolbar,customizing,permissionMode,activeLayout.columns,codeCounts,
      denseChrome,selectedSearchColumns]);
  const filtered=useMemo(()=>customizing||permissionMode?columnFiltered:
    filterByChips(toolbarBase,kindSelection,summarySelection),
    [columnFiltered,toolbarBase,kindSelection,summarySelection,customizing,permissionMode]);
  const summaryStagesForFilters=useMemo(()=>
    summarySelection?summarizeListItems(toolbarBase).stages:[],
    [summarySelection,toolbarBase]);
  const activeConditions=useMemo(()=>activeListConditions({
    toolbar,columnFilters,kindSelection,summarySelection,
    columns:activeLayout.columns,summaryStages:summaryStagesForFilters
  }),[toolbar,columnFilters,kindSelection,summarySelection,activeLayout.columns,summaryStagesForFilters]);
  const otherActiveCount=activeOtherFilterCount(toolbar);
  const removeOneCondition=(condition:ActiveListCondition)=>{
    const next=removeActiveListCondition({toolbar,columnFilters,kindSelection,summarySelection},condition);
    if(next.toolbar!==toolbar)setToolbar(next.toolbar);
    if(next.columnFilters!==columnFilters)setColumnFilters(next.columnFilters);
    if(next.kindSelection!==kindSelection)setKindSelection(next.kindSelection);
    if(next.summarySelection!==summarySelection)setSummarySelection(next.summarySelection);
  };
  const selectKind=(kind:ListKind)=>setKindSelection(old=>old===kind?null:kind);
  const anyListFilter=activeConditions.length>0;
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
  const rows=useMemo(()=>sortItems(filtered,adminControls?columnSort:null,(item,key)=>{
    const column=activeLayout.columns.find(c=>c.key===key&&c.origin==='custom');
    return column?.values?.[customRowKey(item)]??'';
  }),[filtered,columnSort,activeLayout,codeCounts,adminControls]);
  const cycleSort=(key:string)=>{if(!adminControls)return;setColumnSort(current=>
    current?.key!==key?{key,direction:'asc'}:current.direction==='asc'?{key,direction:'desc'}:null);};
  // CellPicker option lists used to be sorted once PER CELL PER KEYSTROKE.
  const optionCache=useMemo(()=>new Map<string,string[]>(),[catalog,items]);
  const options = (field: TextField,item:Item) => {
    const cacheKey=item.recordId+'|'+field;
    const cached=optionCache.get(cacheKey);
    if(cached)return cached;
    const list=field in catalog.options?catalog.options[field as CatalogKey]:field in STATUS_OPTIONS?STATUS_OPTIONS[field as keyof typeof STATUS_OPTIONS]:[];
    const available=statusPickerValues(field,orderValues([...new Set([...list,item[field]])].filter(Boolean),list)
      .filter(value=>field!=='specialist'||value===item.specialist||!item.room||catalog.specialistRooms[value]?.includes(item.room)));
    // A guest must never be offered an option that Spark rejects after
    // acquiring a lease (BCH/BTV/TTTU + "Không phải trình").
    const selected=field==='progressParty'
      ?selectablePartyProgress(item.partyLevel,available):available;
    optionCache.set(cacheKey,selected);
    return selected;
  };
  const aliasCounts = useMemo(()=>{const counts=new Map<string,number>();items.filter(item=>!isMissingDisplayCode(item.displayCode)).forEach(item=>counts.set(displayId(item),(counts.get(displayId(item))??0)+1));return counts;},[items]);
  // Recompute from source layout exactly once: do not persist scaled ID widths.
  const baseVisualWidth=(value:number,key?:string)=>key==='displayCode'&&!customizing&&!showAllSourceColumns
    ?projectedIdWidth(Math.min(1600,Math.max(60,Number.isFinite(value)?value:68)))
    :Math.min(1600,Math.max(60,Number.isFinite(value)?value:170));
  const {ref:tableViewportRef,width:viewportWidth}=useElementWidth();
  const printTableRef=useRef<HTMLTableElement|null>(null);

  // UI preview-only: fit the internal table viewport to the remaining screen
  // without changing the source data, column widths or production layout.
  // Measure DOCUMENT top, not viewport top, so scrolling does not make the
  // table grow recursively. Recompute on zoom, resize or filter wrapping.
  useEffect(()=>{
    // Some source-only/SSR tests intentionally expose a minimal document.
    if(typeof document==='undefined'||typeof document.querySelector!=='function')return;
    const table=document.querySelector<HTMLElement>(
      '.pr95-full-preview .item-data-region .item-table-scroll');
    if(!table)return;
    let frame=0;
    const sync=()=>{
      if(window.innerWidth<900||window.innerHeight<650){
        table.style.removeProperty('--hdnd-preview-table-fill-height');return;
      }
      const documentTop=table.getBoundingClientRect().top+window.scrollY;
      const remaining=window.innerHeight-documentTop-32;
      const height=Math.min(1300,Math.max(320,Math.round(remaining)));
      table.style.setProperty('--hdnd-preview-table-fill-height',height+'px');
    };
    const schedule=()=>{
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(sync);
    };
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
    for(const selector of ['.item-summary-grid','.item-list-page-title',
      '.list-filter-toolbar','.list-active-filters']){
      const target=table.closest('.item-data-region')?.querySelector(selector);
      if(target)observer?.observe(target);
    }
    window.addEventListener('resize',schedule);
    window.visualViewport?.addEventListener('resize',schedule);
    schedule();
    return ()=>{
      cancelAnimationFrame(frame);observer?.disconnect();
      window.removeEventListener('resize',schedule);
      window.visualViewport?.removeEventListener('resize',schedule);
      table.style.removeProperty('--hdnd-preview-table-fill-height');
    };
  },[customizing,permissionMode,otherFiltersOpen,previewOptionsOpen,activeConditions.length]);
  // A single physical <col> per group: all visible readonly rows use the 2-track
  // width, but one editable party-level row requires the larger mode width.
  // Status editability alone must NOT switch a row to the three-track layout.
  const l03Pair=compactPairs.find(pair=>pair.variant==='partyTogether');
  const l03Key=l03Pair?.anchor;
  const l03Widths=resolvedPartyTrackWidths(activeLayout);
  const hasEditablePartyLevel=!!l03Pair&&l03Pair.memberFields.includes('partyLevel')&&
    rows.some(item=>canEdit&&!locked&&(!canEditCell||canEditCell(item.recordId,'partyLevel')));
  const l03PhysicalWidth=partyTrackPhysicalWidth(l03Widths,hasEditablePartyLevel);
  const baseWidths=displayedColumns.map(c=>({key:c.key,
    width:l03Key===c.key?l03PhysicalWidth:baseVisualWidth(c.width,c.key)}));
  const fitWeights=Object.fromEntries(compactPairs.map(pair=>[pair.anchor,
    pair.variant==='contentDetails'||pair.variant==='partyTogether'?3:2]));
  const weights:Record<string,number>={content:3,specificProgress:2,...fitWeights};
  const fitGrowth=useRef<{signature:string;growth:Record<string,number>}|null>(null);
  const fitSignature=JSON.stringify(baseWidths.map(c=>[c.key,weights[c.key]??1]));
  // L03 is an explicit shared setting, never a flexible 1fr viewport filler.
  // Give any spare viewport pixels to OTHER columns while respecting their cap.
  const flexibleWidths=baseWidths.filter(c=>c.key!==l03Key);
  const priorGrowth=fitGrowth.current?.signature===fitSignature
    ?Object.fromEntries(flexibleWidths.map(c=>[c.key,fitGrowth.current!.growth[c.key]??0])):undefined;
  const fittedOther=fitTableColumns(flexibleWidths,
    !customizing&&!showAllSourceColumns
      ?Math.max(0,Math.max(500,viewportWidth)-(l03Key?l03PhysicalWidth:0)):0,
    weights,priorGrowth);
  const fittedWidths=l03Key
    ?{...fittedOther,[l03Key]:l03PhysicalWidth}:fittedOther;
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
  // Do not let L03 become a resize reservoir: its widths belong only to the two
  // explicit administrator modes. Ordinary columns still resize against their
  // next physical neighbor and the final *other* column as backup.
  const resizeKeys=displayedColumns.filter(c=>c.key!==l03Key).map(c=>c.key);
  const shownWidth=displayedColumns.reduce((sum,column)=>sum+visualWidth(column.width,column.key),0);
  const tableWidth=compactOn?shownWidth:
    Math.max(Math.min(6000,Math.max(500,Number.isFinite(activeLayout.tableWidth)?activeLayout.tableWidth:1500)),shownWidth);
  // Admin can commit a one-shot shared layout change in view mode; the Firebase
  // merge/CAS logic always compares the original shared layout, not local presets.
  const isRamAdminList=effectiveSourceKind==='demo';
  // Display settings are available even when the admin is viewing all source
  // columns. Column drag/resize remains restricted by canViewerArrange.
  const canEditListSettings=adminControls&&!customizing&&!permissionMode&&!locked&&
    (!!onPersistViewerLayout||isRamAdminList);
  const canViewerArrange=adminControls&&!customizing&&!anonymousViewer&&!!onPersistViewerLayout&&
    !personalViewActive&&!showAllSourceColumns&&!locked&&!permissionMode;
  // A visual column drag is not a shared-layout write. Only verified admins
  // use the Firebase CAS writer; demo edits remain in this component's RAM.
  const canViewerResize=adminControls&&!customizing&&!showAllSourceColumns&&!permissionMode;
  const applyViewerLayout=async(transform:(base:ItemLayout)=>ItemLayout,
    baselineOverride?:ItemLayout,choices:LayoutConflictChoices={},
    kind:'title'|'cards'|'layout'='layout'):Promise<boolean>=>{
    if(!canEditListSettings||viewSavingRef.current)return false;
    // The locally confirmed layout can be newer than the last profile prop:
    // rapid off/on toggles must not collapse into a false no-op.
    const baseline=validateItemLayout(baselineOverride??sharedBase.current);
    let next:ItemLayout;
    try{next=validateItemLayout(transform(baseline));}
    catch(error){setLayoutError(error instanceof Error?error.message:'Cấu hình danh sách không hợp lệ.');return false;}
    if(JSON.stringify(next)===JSON.stringify(baseline))return true;
    viewSavingRef.current=true;setViewSaving(true);setLayoutError('');
    setSaveFeedback(isRamAdminList&&!onPersistViewerLayout
      ?'Đang áp dụng cấu hình demo trong RAM…':'Đang lưu cấu hình Danh sách dùng chung…');
    setApplied(next); // optimistic only; revert on conflict, denial or offline
    try{
      const confirmed=onPersistViewerLayout
        ?await onPersistViewerLayout(next,baseline,choices):next;
      const valid=validateItemLayout(confirmed??next);
      setApplied(valid);sharedBase.current=valid;
      pendingViewLayout.current=null;setViewLayoutConflicts([]);setViewLayoutChoices({});
      const message=onPersistViewerLayout
        ?'Đã lưu cấu hình Danh sách dùng chung. Các tài khoản khác nhận khi cập nhật cấu hình.'
        :'Đã áp dụng cấu hình vào RAM demo; tải lại trang sẽ khôi phục mặc định.';
      setSaveFeedback(message);
      if(!onPersistViewerLayout)onLayoutSaved(message);
      return true;
    }catch(error){
      setApplied(sharedBase.current);
      if(error instanceof LayoutConflictError){
        pendingViewLayout.current={baseline,next,kind};
        setViewLayoutConflicts(error.conflicts);setViewLayoutChoices({});
        setLayoutError('Cấu hình đã được sửa ở tab khác. Chọn giá trị cần giữ cho từng mục bên dưới; chưa có gì bị ghi đè.');
      }else{
        pendingViewLayout.current=null;setViewLayoutConflicts([]);setViewLayoutChoices({});
        setLayoutError(saveIssue(error));
      }
      setSaveFeedback('Chưa lưu được thay đổi; bản hiển thị đã được hoàn lại.');
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
  const openL03WidthEditor=()=>{
    const snapshot=validateItemLayout(sharedBase.current),saved=resolvedPartyTrackWidths(snapshot);
    l03EditBaseline.current=snapshot;
    setL03WidthsDraft({readonly:{label:String(saved.readonly.label),status:String(saved.readonly.status)},
      editable:{label:String(saved.editable.label),level:String(saved.editable.level),status:String(saved.editable.status)}});
    setL03WidthErrors({});setL03WidthEditorOpen(true);
  };
  const saveL03Widths=async()=>{
    if(!canEditListSettings||viewSaving)return;
    const errors:Record<string,string>={};
    const parse=(mode:'readonly'|'editable',field:'label'|'level'|'status')=>{
      const value=(l03WidthsDraft[mode] as Record<string,string>)[field]??'';
      const lim=(PARTY_TRACK_WIDTH_LIMITS[mode] as Record<string,{min:number;max:number}>)[field];
      const n=/^\d+$/.test(value.trim())?Number(value.trim()):NaN;
      if(!Number.isInteger(n)||n<lim.min||n>lim.max)
        errors[mode+'.'+field]=(PARTY_TRACK_NAMES[mode] as Record<string,string>)[field]+
          ': nhập số nguyên '+lim.min+'–'+lim.max+' px.';
      return n;
    };
    const input={readonly:{label:parse('readonly','label'),status:parse('readonly','status')},
      editable:{label:parse('editable','label'),level:parse('editable','level'),status:parse('editable','status')}};
    if(Object.keys(errors).length){setL03WidthErrors(errors);return;}
    let widths;
    try{widths=validatePartyTrackWidths(input);}
    catch(error){setL03WidthErrors({global:saveIssue(error)});return;}
    const saved=await applyViewerLayout(base=>({...base,partyTrackWidths:widths}),
      l03EditBaseline.current??undefined);
    if(saved){setL03WidthEditorOpen(false);setL03WidthErrors({});l03EditBaseline.current=null;}
    else setL03WidthErrors({global:'Chưa xác nhận lưu. Đã giữ nguyên 5 số nháp.'});
  };
  const editableField=(item:Item,field:TextField)=>
    canEdit&&!locked&&!savingRows?.has(item.recordId)&&!(field==='progressBuild'&&buildLocked(item))&&
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
              onChange={value=>{const next=statusEditSelection(field,rawValue,value);
                return next===null?false:guardBuildUpdate(item.recordId,{[field]:next});}}/>
        :(shortLeader||shortPerson)?<span title={item[field]} aria-label={item[field]}>
          {(shortLeader?abbreviateLeaderName(item[field]):abbreviateVietnameseName(item[field]))||'—'}</span>:field==='content'?<SearchHighlight value={original} query={columnFilters.content||(!customizing&&(toolbar.field==='all'||toolbar.field==='content')?toolbar.search:'')}/>:original}
      {onCellHistory&&(field==='note'||field==='specificProgress')&&<CellHistoryAction label={label+' · '+displayId(item)}
        onClick={()=>onCellHistory(item,field)}/>}
    </span>;
  };
  const canJoinCvRoom=compactDisplay.teamTogether&&compactPairs.some(p=>
    p.variant==='teamTogether'&&p.memberFields.includes('room')&&p.memberFields.includes('specialist'));
  const compactMenu=adminControls&&compactOn&&!permissionMode&&!customizing&&(shareCompact||allowPersonalCompact)&&
    (<>
      <details className="compact-columns-menu" ref={compactDetailsRef}
        onToggle={event=>{
          const opened=event.currentTarget.open;
          setCompactMenuOpen(opened);
          if(!opened)setCompactMenuPlacement(null);
        }}>
        <summary ref={compactSummaryRef} aria-label="Tùy chọn gộp cột"
          aria-controls="hdnd-compact-columns-popup">Tùy chọn người phụ trách <span aria-hidden="true">▾</span></summary>
      </details>
      {compactMenuOpen&&compactMenuPlacement&&typeof document!=='undefined'&&createPortal(
        <div id="hdnd-compact-columns-popup" ref={compactPanelRef} tabIndex={-1}
          className="compact-columns-options compact-columns-options-floating"
          role="group" aria-label="Hiển thị gọn cột"
          data-popover-side={compactMenuPlacement.side}
          style={{
            top:compactMenuPlacement.top,
            left:compactMenuPlacement.left,
            width:compactMenuPlacement.width,
            maxHeight:compactMenuPlacement.maxHeight,
          }}>
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
        </div>,document.body)}
    </>);
  return <section className="card item-list-card" data-compact-chrome={denseChrome?"true":undefined} data-hide-party={activeLayout.summaryCards?.party===false} data-hide-build={activeLayout.summaryCards?.build===false} data-hide-nq={activeLayout.summaryCards?.nq===false} data-visible-stages={SUMMARY_CARD_KEYS.filter(key=>activeLayout.summaryCards?.[key]!==false).length}>
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
    <div className="item-data-region"
      data-preview-options={denseChrome?(previewOptionsOpen?'open':'closed'):undefined}
      style={{width:visibleWidth,maxWidth:'100%'}}>
    {/* B00–B03 and C01–C03 summarize all source items, regardless of F
        filters. Keep toolbarBase for filtered table rows / visible count. */}
    {!customizing&&!permissionMode&&<>
      <ItemSummaryCards items={items}
        selection={summarySelection} onSelect={selectSummary}
        kindSelection={kindSelection} onSelectKind={selectKind}
        onClear={()=>setSummarySelection(null)} visibleCount={filtered.length}
        showFilterFooters={false}/>
      {Object.keys(errors).length>0&&<section className="list-save-errors"
        role="alert" aria-live="polite">
        <strong>{Object.keys(errors).length} hồ sơ chưa được Firebase xác nhận lưu.</strong>
        <span>Giá trị vừa chọn có thể chỉ là bản nháp trên máy, chưa phải dữ liệu đã lưu.
          Không nhập lại hoặc gửi lặp khi chưa kiểm tra nguyên nhân.</span>
        <details>
          <summary>Xem nguyên nhân theo từng hồ sơ</summary>
          <ul>{Object.entries(errors).map(([recordId,reason])=>{
            const source=items.find(item=>item.recordId===recordId);
            return <li key={recordId}>
              <strong>{source?displayId(source):'Hồ sơ chưa xác định'}:</strong>{' '}{reason}
            </li>;
          })}</ul>
        </details>
      </section>}
      {adminControls&&(onPersistViewerLayout||isRamAdminList)?<div className="admin-list-heading">
        <h2 className="item-list-page-title">{activeLayout.listTitle??DEFAULT_LIST_TITLE}</h2>
        {denseChrome&&<button type="button"
          className="button ghost admin-preview-options-toggle"
          aria-label="Mở hoặc đóng các tùy chọn hiển thị và công cụ quản trị Danh sách"
          title="Tùy chọn hiển thị bảng, thẻ tổng hợp và độ rộng L03"
          aria-expanded={previewOptionsOpen} aria-controls="admin-list-controls"
          onClick={()=>setPreviewOptionsOpen(open=>!open)}>
          {previewOptionsOpen?'Ẩn tùy chọn':'Tùy chọn'}
        </button>}
        {compactChrome&&canEditListSettings&&referenceListLayoutNeedsSync(activeLayout)&&
          <button type="button" className="button admin-reference-sync-shortcut"
            title="Chỉ cập nhật cấu hình Danh sách; giữ nguyên dữ liệu, quyền và lịch sử"
            onClick={()=>{setPreviewOptionsOpen(true);setReferencePresetConfirm(true);}}>
            Đồng bộ bố cục demo
          </button>}
        {denseChrome&&<button type="button" className="button ghost admin-list-print-trigger"
          aria-label="In hoặc lưu PDF A4 ngang" title="Chỉ tiêu đề và bảng đang hiển thị"
          onClick={()=>{
            const table=printTableRef.current;
            if(!table){onLayoutSaved('Không có bảng để in.');return;}
            try{printVisibleListA4(activeLayout.listTitle??DEFAULT_LIST_TITLE,table,
              displayedColumns.map(col=>col.label));}
            catch(cause){onLayoutSaved(cause instanceof Error?cause.message:'Không in được bảng.');}
          }}>In / PDF A4</button>}
        <button type="button"
          className="button ghost admin-list-rename-trigger"
          aria-expanded={titleEditorOpen} aria-controls="admin-list-title-editor"
          disabled={!canEditListSettings||viewSaving}
          onClick={()=>{if(titleEditorOpen){setTitleEditorOpen(false);setListTitleDraft(null);
            listTitleBaseline.current=null;setTitleValidationError('');}
          else {if(denseChrome)setPreviewOptionsOpen(true);
            listTitleBaseline.current=validateItemLayout(sharedBase.current);
            setListTitleDraft(activeLayout.listTitle??DEFAULT_LIST_TITLE);
            setTitleEditorOpen(true);setTitleValidationError('');}}}>
          {titleEditorOpen?'Đóng sửa tên':'Đổi tên danh sách'}
        </button>
      </div>:<h2 className="item-list-page-title">{activeLayout.listTitle??DEFAULT_LIST_TITLE}</h2>}
      {adminControls&&(onPersistViewerLayout||isRamAdminList)&&<div
        className="admin-list-controls" id={denseChrome?'admin-list-controls':undefined}
        hidden={denseChrome&&!previewOptionsOpen}
        aria-label="Tùy chọn quản trị danh sách">
        {compactChrome&&<div className="admin-reference-preset" aria-label="Bố cục mẫu giống demo">
          {referencePresetConfirm?<div className="admin-reference-preset-confirm" role="group"
            aria-label="Xác nhận áp dụng bố cục mẫu">
            <strong>Áp dụng thứ tự cột, độ rộng và chế độ gộp như bản demo?</strong>
            <span>Chỉ thay cấu hình hiển thị chung. Không sửa dữ liệu Excel, phân quyền,
              ghi chú hoặc lịch sử. Tên cột đã đổi và các cột tự tạo được giữ lại.</span>
            <div className="admin-reference-preset-actions">
              <button type="button" className="button primary"
                disabled={!canEditListSettings||personalViewActive}
                onClick={()=>{void applyViewerLayout(createReferenceListLayout).then(saved=>{
                  if(saved){setReferencePresetConfirm(false);setShowAllSourceColumns(false);}
                });}}>Xác nhận áp dụng mẫu</button>
              <button type="button" className="button ghost"
                onClick={()=>setReferencePresetConfirm(false)}>Hủy</button>
            </div>
          </div>:<button type="button" className="button ghost"
            aria-label="Áp dụng bố cục mẫu như bản demo đã duyệt"
            disabled={!canEditListSettings||personalViewActive}
            title={personalViewActive?'Đóng giao diện cá nhân trước khi đổi bố cục dùng chung':
              !canEditListSettings?'Chờ quyền quản trị và kết nối cấu hình dùng chung':'Không thay đổi dữ liệu nghiệp vụ'}
            onClick={()=>setReferencePresetConfirm(true)}>Áp dụng bố cục mẫu (như demo)</button>}
          <small>Chỉ lưu khi quản trị xác nhận và Firebase phản hồi thành công.</small>
        </div>}
        {titleEditorOpen&&<form id="admin-list-title-editor" className="admin-list-title-editor"
          onSubmit={event=>{event.preventDefault();
            try{const title=validateListTitle(listTitleDraft??activeLayout.listTitle??DEFAULT_LIST_TITLE);
              setTitleValidationError('');
              void applyViewerLayout(base=>({...base,listTitle:title}),listTitleBaseline.current??undefined,{},'title')
                .then(saved=>{if(saved){setListTitleDraft(null);listTitleBaseline.current=null;
                  setTitleEditorOpen(false);}});
            }catch(error){setTitleValidationError(error instanceof Error?error.message:'Tên không hợp lệ.');}
          }}>
          <label htmlFor="admin-list-title-input">Tên danh sách mới</label>
          <input id="admin-list-title-input" aria-label="Tên danh sách mới" maxLength={100}
            aria-invalid={!!titleValidationError}
            aria-describedby={titleValidationError?'admin-list-title-error':undefined}
            value={listTitleDraft??activeLayout.listTitle??DEFAULT_LIST_TITLE}
            onChange={event=>{setTitleValidationError('');setListTitleDraft(event.currentTarget.value);}}
            disabled={!canEditListSettings||viewSaving}/>
          <button type="submit" className="button" disabled={!canEditListSettings||viewSaving}>
            Lưu tên danh sách
          </button>
          {titleValidationError&&<p id="admin-list-title-error" role="alert">{titleValidationError}</p>}
        </form>}
        {denseChrome&&<fieldset className="admin-search-scope">
          <legend>Ô “Tìm kiếm không dấu” tìm trong cột nào?</legend>
          <div className="admin-search-scope-options">
            {searchChoices.map(key=><label key={key}>
              <input type="checkbox" aria-label={'Tìm trong '+(
                key==='*'?'Cột tùy chỉnh':EXCEL_SOURCE_COLUMNS.find(c=>c.key===key)?.label??key)}
                checked={selectedSearchColumns.includes(key)}
                onChange={event=>{
                  const next=event.currentTarget.checked
                    ?searchChoices.filter(value=>value===key||selectedSearchColumns.includes(value))
                    :selectedSearchColumns.filter(value=>value!==key);
                  if(next.length)setSelectedSearchColumns(next);
                }}/>
              <span>{key==='*'?'Cột tùy chỉnh':
                EXCEL_SOURCE_COLUMNS.find(c=>c.key===key)?.label??key}</span>
            </label>)}
          </div>
          <button type="button" className="button ghost" onClick={()=>
            setSelectedSearchColumns(searchChoices)}>Chọn tất cả</button>
          <small>Áp dụng khi chọn “Tất cả trường”; lưu trên trình duyệt hiện tại.</small>
        </fieldset>}
        {denseChrome&&onBulkApply&&<div className="admin-bulk-paste-tools">
          <button type="button" className="button ghost" disabled={locked||!rows.length}
            onClick={()=>setBulkPasteOpen(true)}>Dán nhiều ô từ Excel</button>
          <small>Copy nhiều hàng/cột C–O, xem trước và xác nhận. {sourceKind==='firebase'?'Firebase sẽ kiểm tra khóa và tự lưu sau khi duyệt.':''}</small>
        </div>}
        <fieldset className="admin-summary-visibility" disabled={!canEditListSettings||viewSaving}>
          <legend>Hiện/ẩn thẻ tổng hợp</legend>
          <span className="admin-summary-fixed" title="C00 luôn hiển thị">C00 · Tổng số (luôn hiện)</span>
          {SUMMARY_CARD_KEYS.map((key,index)=><label key={key}>
            <input type="checkbox" checked={activeLayout.summaryCards?.[key]!==false}
              aria-label={'Hiện C0'+(index+1)+' · '+(['Trình Thành ủy','Trình HĐND xây dựng NQ','Trình HĐND ban hành NQ'][index])}
              onChange={event=>{const checked=event.currentTarget.checked;
                void applyViewerLayout(base=>({...base,summaryCards:{
                  party:true,build:true,nq:true,...base.summaryCards,[key]:checked}}),undefined,{},'cards');}}/>
            <span>{'C0'+(index+1)+' · '+(['Trình Thành ủy','Trình HĐND xây dựng NQ','Trình HĐND ban hành NQ'][index])}</span>
          </label>)}
        </fieldset>
        {canEditListSettings&&<div className="admin-l03-widths">
          <button type="button" className="button ghost" aria-expanded={l03WidthEditorOpen}
            aria-controls="admin-l03-width-editor" disabled={viewSaving} onClick={()=>{
              if(l03WidthEditorOpen){setL03WidthEditorOpen(false);setL03WidthErrors({});l03EditBaseline.current=null;}
              else openL03WidthEditor();
            }}>L03 · Chỉnh 5 độ rộng cột nhỏ</button>
          <span className="admin-l03-width-summary">Chỉ xem: {partyTrackModeWidth(l03Widths,'readonly')}px · Được sửa: {partyTrackModeWidth(l03Widths,'editable')}px</span>
          {l03WidthEditorOpen&&<form noValidate id="admin-l03-width-editor" className="admin-l03-width-editor"
            onSubmit={event=>{event.preventDefault();void saveL03Widths();}}>
            {(['readonly','editable'] as const).map(mode=><fieldset className="admin-l03-mode" key={mode}>
              <legend>{mode==='readonly'?'Chỉ xem cấp trình (2 cột)':'Được sửa cấp trình (3 cột)'}</legend>
              <div className="admin-l03-rails">
                {(Object.keys(PARTY_TRACK_WIDTH_LIMITS[mode]) as ('label'|'level'|'status')[]).map(field=>{
                  const name=(PARTY_TRACK_NAMES[mode] as Record<string,string>)[field];
                  const lim=(PARTY_TRACK_WIDTH_LIMITS[mode] as Record<string,{min:number;max:number}>)[field];
                  const id=mode+'.'+field;
                  return <label key={id}>
                    <strong>{name}</strong><span>Riêng (px) · {lim.min}–{lim.max}</span>
                    <input type="number" step="1" min={lim.min} max={lim.max}
                      value={(l03WidthsDraft[mode] as Record<string,string>)[field]}
                      aria-label={'L03 '+(mode==='readonly'?'Chỉ xem':'Được sửa')+' · '+name}
                      aria-invalid={!!l03WidthErrors[id]}
                      onChange={event=>{const value=event.currentTarget.value;
                        setL03WidthErrors(previous=>{
                          const next={...previous};delete next[id];delete next.global;return next;});
                        setL03WidthsDraft(previous=>({...previous,[mode]:{...previous[mode],[field]:value}}));
                      }} disabled={viewSaving}/>
                    {l03WidthErrors[id]&&<small className="admin-l03-field-error" role="alert">{l03WidthErrors[id]}</small>}
                  </label>;
                })}
              </div>
              <output className="admin-l03-mode-total">Tổng cụm: {
                Object.values(l03WidthsDraft[mode]).every(value=>/^\d+$/.test(value.trim()))
                  ?Object.values(l03WidthsDraft[mode]).reduce((sum,value)=>sum+Number(value),
                    23+(mode==='readonly'?8:16))+' px':'—'
              }</output>
            </fieldset>)}
            <button className="button" type="submit" disabled={viewSaving}>Lưu 5 độ rộng dùng chung</button>
            {l03WidthErrors.global&&<p role="alert">{l03WidthErrors.global}</p>}
            <small>Tổng = rail + 8px mỗi khoảng + 23px padding/viền. Khi mode khác nhau, cột vật lý chọn tổng lớn nhất.</small>
          </form>}
        </div>}
      </div>}
    </>}
    {/* Admin tools stay distinct and AFTER the shared summary/heading. */}
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
    {!customizing&&(onPersistViewerLayout||isRamAdminList)&&(saveFeedback||layoutError)&&
      <p className={layoutError?'notice error-text':'muted'} role={layoutError?'alert':'status'}>{layoutError||saveFeedback}</p>}
    {!customizing&&adminControls&&viewLayoutConflicts.length>0&&pendingViewLayout.current&&
      <LayoutConflictResolver conflicts={viewLayoutConflicts} choices={viewLayoutChoices}
        busy={viewSaving}
        onChoose={(field,choice)=>setViewLayoutChoices(current=>({...current,[field]:choice}))}
        onCancel={()=>{pendingViewLayout.current=null;setViewLayoutConflicts([]);setViewLayoutChoices({});
          setLayoutError('');listTitleBaseline.current=null;}}
        onConfirm={()=>{const request=pendingViewLayout.current;
          if(request)void applyViewerLayout(()=>request.next,request.baseline,viewLayoutChoices,request.kind)
            .then(saved=>{if(saved&&request.kind==='title'){
              setListTitleDraft(null);listTitleBaseline.current=null;
            }});
        }}/>}

    {customizing&&!anonymousViewer&&saveDataHint&&pendingData&&<p className="notice">{saveDataHint}</p>}
     {/* ColumnFilterCell remains accessible in editing and popup.
         Ordinary List uses compact AND toolbar, without a tall header row. */}
    {!customizing&&!permissionMode&&<>
      <div className="list-filter-toolbar" role="search" aria-label="Bộ lọc Danh sách">
        <input className={'list-filter-search'+(toolbar.search.trim()?' is-filter-active':'')} data-filter-active={toolbar.search.trim()?'true':'false'} type="search"
          aria-label="Tìm kiếm không dấu" placeholder="Tìm kiếm không dấu…"
          value={toolbar.search}
          onChange={e=>setToolbar(old=>({...old,search:e.currentTarget.value}))}/>
        <select className={'list-filter-organisation'+(toolbar.department?' is-filter-active':'')} data-filter-active={toolbar.department?'true':'false'} aria-label="Lọc Sở, ngành"
          value={toolbar.department}
          onChange={e=>setToolbar(old=>({...old,department:e.currentTarget.value}))}>
          <option value="">Tất cả Sở/ngành</option>
          {exactChoices(items,'department').map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <select className={'list-filter-organisation'+(toolbar.room?' is-filter-active':'')} data-filter-active={toolbar.room?'true':'false'} aria-label="Lọc Phòng"
          value={toolbar.room}
          onChange={e=>setToolbar(old=>({...old,room:e.currentTarget.value}))}>
          <option value="">Tất cả Phòng</option>
          {exactChoices(items,'room').map(value=><option key={value} value={value}>{value}</option>)}
        </select>
        <details className="list-filter-other" data-filter-active={otherActiveCount>0?'true':'false'}
          onToggle={e=>setOtherFiltersOpen(e.currentTarget.open)}>
          <summary>Lọc khác {otherActiveCount>0&&<strong className="list-filter-other-count" aria-label={otherActiveCount+' điều kiện lọc khác'}>{otherActiveCount}</strong>} <span aria-hidden="true">▾</span></summary>
          {otherFiltersOpen&&<div className="list-filter-other-panel" role="group" aria-label="Các trường lọc chi tiết">
            <label>Chọn trường tìm kiếm
              <select aria-label="Chọn trường tìm kiếm" className={toolbar.search.trim()&&toolbar.field!=='all'?'is-filter-active':undefined} value={toolbar.field}
                onChange={e=>setToolbar(old=>({...old,field:e.currentTarget.value}))}>
                {SEARCH_FIELDS.map(field=><option key={field.key} value={field.key}>{field.label}</option>)}
                {activeLayout.columns.filter(c=>c.origin==='custom'&&!c.removed).map(c=>
                  <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </label>
            {DETAIL_FIELDS.map(({key,label})=><label key={key}>{label}
              <select aria-label={'Lọc '+label} className={toolbar.details[key]?'is-filter-active':undefined} value={toolbar.details[key]}
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
      </div>
      <ActiveListFilters conditions={activeConditions} visibleCount={filtered.length}
        sourceCount={items.length} onRemove={removeOneCondition} onClearAll={clearAllListFilters}/>
    </>}
    {permissionMode&&permissions&&onSavePermissions?<InlinePermissionsTable showBackButton={!externalSectionTabs} items={rows} columns={columns} permissions={permissions} onSave={onSavePermissions} onReload={onReloadPermissions} onDirtyChange={setPermissionDirty} switchRequest={permissionSwitchRequest} onBack={()=>{
      setPermissionMode(false);setPermissionDirty(false);setLayoutError("");
      if(exitAfterPermissions.current){
        exitAfterPermissions.current=false;
        if(dirty||columnExtrasDirty||Object.keys(drafts).length)setConfirmExit(true);else onClose();
      }
    }} disabled={locked}/>:<><div ref={tableViewportRef} className="table-wrap item-table-scroll" tabIndex={0} role="region" aria-label="Bảng nội dung cuộn ngang và dọc"><table ref={printTableRef} className="data-table item-data-table" data-l03-physical-mode={l03Key?(hasEditablePartyLevel?'mixed-or-editable':'readonly'):undefined} style={{width:`${tableWidth}px`,minWidth:`${tableWidth}px`,tableLayout:'fixed',
  '--hdnd-l03-width-readonly':`${partyTrackModeWidth(l03Widths,'readonly')}px`,
  '--hdnd-l03-width-editable':`${partyTrackModeWidth(l03Widths,'editable')}px`} as CSSProperties}><colgroup>{displayedColumns.map(column=><col key={column.key} style={{width:`${visualWidth(column.width,column.key)}px`}}/>)}</colgroup><thead><tr className="item-heading-row">{displayedColumns.map((column,index)=><ColumnHeader key={column.key} columnKey={column.key}
  sortLabel={column.label} sortDirection={adminControls&&columnSort?.key===column.key?columnSort.direction:null} onSort={adminControls&&!permissionMode?cycleSort:undefined}
  disabled={!(customizing&&!locked&&adminControls||canViewerArrange)}
  previousKey={displayedColumns[index-1]?.key} nextKey={displayedColumns[index+1]?.key}
  onMove={moveColumn}>{column.label}{((customizing&&!locked&&allowLayout)||canViewerArrange||canViewerResize)&&
    index<displayedColumns.length-1&&column.key!=='displayCode'&&
    // No per-track or indirect neighbor resize may silently alter the L03 modes.
    column.key!==l03Key&&displayedColumns[index+1]?.key!==l03Key&&
    resizeKeys.indexOf(column.key)<resizeKeys.length-1&&
    projectedAdjacentBounds(activeLayout,resizeKeys,column.key,
      projectedExtras,compactOn,groupExtras)&&
    <ColumnResizeHandle windowDragFallback columnIndex={index} width={visualWidth(column.width,column.key)}
      adjacent={{index:index+1,
        width:visualWidth(displayedColumns[index+1].width,displayedColumns[index+1].key),
        ...projectedPhysicalLimits(displayedColumns[index+1].key,groupExtras,compactOn)}}
      fallback={resizeKeys.indexOf(column.key)<resizeKeys.length-2?{
        index:displayedColumns.findIndex(c=>c.key===resizeKeys.at(-1)),
        width:visualWidth(activeLayout.columns.find(c=>c.key===resizeKeys.at(-1))!.width,resizeKeys.at(-1)),
        ...projectedPhysicalLimits(resizeKeys.at(-1)!,groupExtras,compactOn)}:undefined}
      {...projectedPhysicalLimits(column.key,groupExtras,compactOn)}
      label={column.label} onCommit={width=>{
        const keys=resizeKeys;
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
      {rows.map(item => <tr key={item.recordId} data-ui-reference-record-id={item.recordId} className={['color-row',itemColor(item,colorRules)?'color-'+itemColor(item,colorRules):''].join(' ')}>{displayedColumns.map(column=>{const key=column.key as TextField;
        const pair=compactPairs.find(pair=>pair.anchor===column.key);
        if(pair){
          const anyEditable=pair.memberFields.some(field=>editableField(item,field as TextField));
          return <td key={column.key} data-col-key={column.key}
            data-l03-layout={pair.variant==='partyTogether'
              ?editableField(item,'partyLevel')?'editable':'readonly':undefined}
            className={anyEditable?'editable-cell compact-merged-cell':'compact-merged-cell'} onClick={activateEditableCell}
            data-edit-hint={anyEditable?'Bấm để sửa':undefined}
            style={pair.variant==='partyTogether'?{
               '--hdnd-l03-label-track':`${editableField(item,'partyLevel')?l03Widths.editable.label:l03Widths.readonly.label}px`,
               '--hdnd-l03-level-track':`${l03Widths.editable.level}px`,
               '--hdnd-l03-status-track':`${editableField(item,'partyLevel')?l03Widths.editable.status:l03Widths.readonly.status}px`,
               '--hdnd-l03-inner-width':`${partyTrackModeWidth(l03Widths,editableField(item,'partyLevel')?'editable':'readonly')-23}px`
             } as CSSProperties:undefined}>
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
          style={cellHighlightStyle(displayId(item),column.key,activeLayout.cellHighlights)}><span className="code" tabIndex={0} aria-label={"Mã hồ sơ "+displayId(item)} title={isMissingDisplayCode(item.displayCode)?undefined:`Mã gốc: ${item.displayCode}`}>{displayId(item)}</span>{(aliasCounts.get(displayId(item))??0)>1&&<small className="warning-text">Trùng ID hiển thị · {item.displayCode}</small>}{drafts[item.recordId]&&<small>Chưa lưu</small>}{errors[item.recordId]&&<span className="item-save-error-marker"
              aria-label={'Lỗi lưu hồ sơ '+displayId(item)+'; xem thông báo trên bảng'}
              title={errors[item.recordId]}>Lỗi lưu</span>}</td>;
        if(column.key==='stt')return <td key={column.key} data-col-key={column.key} style={cellHighlightStyle(item.stt,column.key,activeLayout.cellHighlights)}>{item.stt}</td>;
        if(column.key==='isDropped')return <td key={column.key} data-col-key={column.key}
           className={canEdit&&!locked&&!savingRows?.has(item.recordId)&&(!canEditCell||canEditCell(item.recordId,'isDropped'))?'editable-cell':undefined}
           onClick={activateEditableCell}>{canEdit&&!savingRows?.has(item.recordId)&&(!canEditCell||canEditCell(item.recordId,'isDropped'))?<CellPicker leaseManager={leaseManager} recordId={item.recordId} field="isDropped" label={`${displayId(item)}: Rút`} value={item.isDropped?"Đã rút":"Chưa rút"} options={["Chưa rút","Đã rút"]} disabled={locked} onChange={value=>onUpdate(item.recordId,{isDropped:value==="Đã rút"})}/>:<span className={item.isDropped?'status-pill warning':''}>{item.isDropped?'Đã rút':'—'}</span>}</td>;
        // Excel columns P and Q are displayed and searchable but not editable.
        // They must not be offered as writable fields until a source writer and
        // server-side permission rules explicitly support these new columns.
        if(column.key==='partyMeeting'||column.key==='examined')
          return <td key={column.key} data-col-key={column.key}>{item[column.key]||'—'}</td>;
        const metadata=TEXT_FIELDS.find(field=>field.key===key)!;
        const writable=editableField(item,key);
        return <td key={column.key} data-col-key={column.key}
           data-ui-reference-part={key==='note'||key==='specificProgress'?key:undefined}
          data-progress-tone={key==='progressBuild'&&buildLocked(item)?undefined:statusPaletteTone(key,effectiveItemField(item,key),statusPaletteStore?.active.otherEnabled??false)??undefined}
          className={[writable?'editable-cell':'',onCellHistory&&(key==='note'||key==='specificProgress')?'has-history-action':''].filter(Boolean).join(' ')} onClick={activateEditableCell}
          data-edit-hint={writable&&key!=='note'&&key!=='specificProgress'?'Bấm để sửa':undefined}
          style={cellHighlightStyle(effectiveItemField(item,key),column.key,activeLayout.cellHighlights)}>{key==='type'
          ?<span className="pr95-v6-type-cell" data-kind={compactTypeTone(item.type)}
            data-editable={writable?'true':undefined}
            style={cellHighlightStyle(item.type,'type',activeLayout.cellHighlights)}>
            {writable
              ?<CellPicker leaseManager={leaseManager} recordId={item.recordId} field="type"
                label={`${displayId(item)}: ${metadata.label}`} value={item.type}
                options={options('type',item)} disabled={locked} highlightQuery={columnFilters.type}
                onChange={next=>next===item.type?false:guardBuildUpdate(item.recordId,{type:next})}/>
              :<SearchHighlight value={item.type||'—'} query={columnFilters.type}/>}
           </span>
          :key==='progressBuild'&&buildLocked(item)?buildLockedHint(item):writable?key==='content'?<button className="content-button" onClick={()=>openContentForEdit(item,'content')} disabled={locked}><SearchHighlight value={item.content||'—'} query={columnFilters.content||(!customizing&&(toolbar.field==='all'||toolbar.field==='content')?toolbar.search:'')}/></button>:key==='note'?<InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field="note" value={item.note} highlightQuery={columnFilters.note}
    label={`${displayId(item)}: ${metadata.label}`} onCommit={value=>{
      if(!writable)return false;
      return onUpdate(item.recordId,{note:value})!==false;
    }}/>:key==='specificProgress'?<InlineNoteEditor leaseManager={leaseManager} recordId={item.recordId} field="specificProgress" value={item.specificProgress} highlightQuery={columnFilters.specificProgress}
    label={`${displayId(item)}: ${metadata.label}`} onCommit={value=>{
      if(!writable)return false;
      return onUpdate(item.recordId,{specificProgress:value})!==false;
    }}/>:column.kind==='text'&&!isStatusDisplayField(key)
  ?<LeaseTextInput manager={leaseManager} id={item.recordId} field={key} label={`${displayId(item)}: ${column.label}`}
    maxLength={1000} value={String(item[key]??'')} disabled={locked}
    onChange={value=>onUpdate(item.recordId,{[key]:value})}/>
  :<CellPicker leaseManager={leaseManager} recordId={item.recordId} field={key} editorKind={key==='specialist'?'search':'status'} label={`${displayId(item)}: ${column.label}`} value={statusDisplayValue(key,item[key])}
    displayValue={isStatusDisplayField(key)?statusDisplayValue(key,item[key]):compactOn&&((key==='specialist'&&compactDisplay.shortSpecialist)||
      ((key==='vpLeader'||key==='ubndLeader')&&compactDisplay.shortLeaders))?
      (key==='vpLeader'||key==='ubndLeader'?abbreviateLeaderName(item[key]):abbreviateVietnameseName(item[key])):undefined}
    options={options(key,item)} searchable={key==="specialist"} disabled={locked} highlightQuery={columnFilters[key]}
    onChange={value=>{const next=statusEditSelection(key,item[key],value);
      return next===null?false:guardBuildUpdate(item.recordId,{[key]:next});}}/>:key==='specialist'&&compactOn&&compactDisplay.shortSpecialist
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
    {bulkPasteOpen&&denseChrome&&onBulkApply&&<BulkPasteModal rows={rows} live={sourceKind==='firebase'}
      canEdit={(id,field)=>!locked&&!!canEditCell?.(id,field)}
      onApply={onBulkApply} onClose={()=>setBulkPasteOpen(false)}/>}
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



