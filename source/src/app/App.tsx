import {useEffect,useMemo, useRef, useState, useCallback } from 'react';
import type {CSSProperties,ComponentType,ComponentProps} from 'react';
import type { Changes, EditableField, GroupField, Item, TextField } from '../../shared/types';
import { GROUP_OPTIONS, TEXT_FIELDS } from '../../shared/field-definitions';
import { MockRepository } from '../data/mock-repository';
import { createDemoItems } from '../data/demo-items';
import { useWorkspace } from '../state/use-workspace';
import { getKpis } from '../domain/reporting';
import { MemoReportTable } from '../features/reports/ReportTable';
import { ReportDetailGrid } from '../features/reports/ReportDetailGrid';
import {loadStatusPaletteStore,saveStatusPaletteStore,statusPaletteCssVariables,
  type StatusPaletteStore} from '../data/status-palettes';
import { ItemList } from '../features/items/ItemList';
import { HistoryDialog } from '../features/history/HistoryDialog';
import { Modal } from '../components/Modal';
import type { Repository } from '../data/repository';
import { SheetsRepository, readSheet } from '../data/sheets-repository';
import type {SheetSnapshot} from '../data/gviz-parser';
import { FirebaseMirrorRepository } from '../data/firebase-mirror-repository';
import { ExcelRepository } from '../data/excel-repository';
import { DEFAULT_SHEET_URL, clearSheetConfig, loadSheetConfig, parseSheetConfig, saveSheetConfig, type SheetConfig } from '../data/sheet-config';
import { ConnectionPanel } from '../features/settings/ConnectionPanel';
import { configuredReports, getReportFont, getReportFontSize, tableFontStack, loadReportLayout, reportPageWidth, saveReportLayout, type ReportLayout } from '../data/report-preferences';
import {loadSelectedWebFont} from '../data/on-demand-fonts';
import { ReportSettings } from '../features/settings/ReportSettings';
import { CatalogSettings } from '../features/catalogs/CatalogSettings';
import { assignmentIssue, loadCatalog, saveCatalog, mergeCatalogItems,type CatalogConfig,type CatalogKey } from '../data/catalogs';
import {loadItemLayout,saveItemLayout,overlayPersonalLayout,type ItemLayout} from '../data/item-preferences';
import {loadActiveListView,loadListViews} from '../data/list-views';
import {layoutRecoveryScope} from '../data/draft-checkpoints';
import {readConfirmedPageWidths,rememberConfirmedPageWidths} from '../data/confirmed-page-widths';
import type {LayoutConflictChoices} from '../data/item-layout-merge';
import {useSharedConfig} from '../state/use-shared-config';
import {googleCall,isGoogleHost} from '../data/google-bridge';
import {CONFIG_EDITOR_URL} from '../data/shared-store';
import {SyncPanel} from '../features/settings/SyncPanel';
import { readWorkspaceRecovery } from '../data/workspace-recovery';
import {FirebaseRepository,mayEdit} from '../data/firebase-repository';
import {bootstrapApprovedRowsToPrimary} from '../data/firebase-primary-bootstrap';
import {CellEditSessionManager,type EditorKind} from '../data/cell-edit-leases';
import {assertTransitionBaseline,type TransitionRowChange} from '../data/transition-import';
import type {FirebaseController} from '../state/use-firebase';
import {FirebasePanel} from '../features/settings/FirebasePanel';
import {ApprovalReviewPanel} from '../features/settings/ApprovalReviewPanel';
import {StartupTimingPanel} from '../components/StartupTimingPanel';
import {markStartup} from '../data/startup-timings';
import {compareSourceFromSearch,disableSessionCacheForBenchmark} from '../data/source-comparison';

type Page = 'overview' | 'items' | 'connection' | 'source' | 'customize' | 'items-customize' | 'items-permissions' | 'catalogs'|'sync'|'transfer'|'review';
declare global {interface Window {HDND_SOURCE?:string;HDND_EXCEL_ENABLED?:boolean;HDND_TEST?:boolean}}
const connectedRepository=(config:SheetConfig):Repository=>isGoogleHost()&&window.HDND_EXCEL_ENABLED===true&&window.HDND_SOURCE===config.url?new ExcelRepository(config):new SheetsRepository(config);

export function App({firebase,TransferPanel}:{firebase?:FirebaseController;TransferPanel?:ComponentType<ComponentProps<typeof import('../features/settings/ExcelTransferPanel').ExcelTransferPanel>>}={}) {
  const [configured, setConfigured] = useState(() => window.HDND_SOURCE?parseSheetConfig(window.HDND_SOURCE):loadSheetConfig() ?? parseSheetConfig(DEFAULT_SHEET_URL));
  const [browserRepository,setRepository] = useState<Repository>(()=>connectedRepository(configured));
  const [firebaseSourceSeed,setFirebaseSourceSeed]=useState<{url:string;snapshot:SheetSnapshot}|null>(null);
  // Explicit A/B URL: no administrator setting is saved or changed.
  const compareSource=compareSourceFromSearch(typeof window==='undefined'?'':window.location?.search??'');
  const comparison=!!firebase&&compareSource!==null;
  // Bench-only opt-in: do not let an old session snapshot masquerade as a live data speedup.
  const benchNoCache=disableSessionCacheForBenchmark(typeof window==='undefined'?'':window.location?.search??'');
  const activeViewerUid=useRef<string|null>(null);
  activeViewerUid.current=firebase?.user?.uid??null;
  const firebaseLive=useRef<FirebaseController|undefined>(firebase);
  firebaseLive.current=firebase;
  // A/B uses the same URL, Firebase auth and confirmed admin layout, changing
  // ONLY the read-only source of rows. The actual saved source is untouched.
  const selectedSource=comparison?compareSource:firebase?.profile?.dataSource;
  const repository=useMemo<Repository>(()=>firebase
    ?selectedSource==='primary'&&!comparison
      ?new FirebaseRepository(firebase.database,
        ()=>firebaseLive.current?.user??null,
        ()=>firebaseLive.current?.permissions??{columns:{}})
      :selectedSource==='database'
        ?new FirebaseMirrorRepository(firebase.database,configured,()=>activeViewerUid.current,!comparison,!comparison&&!benchNoCache)
        :new SheetsRepository(configured,firebaseSourceSeed?.url===configured.url?firebaseSourceSeed.snapshot:undefined,!comparison)
    :browserRepository,[firebase?.database,firebase?.user?.uid,selectedSource,comparison,benchNoCache,configured.url,browserRepository,firebaseSourceSeed]);
  const leaseManager=useMemo(()=>firebase&&selectedSource==='primary'&&!comparison
    ?new CellEditSessionManager(firebase.database,()=>firebaseLive.current?.user??null)
    :undefined,[firebase?.database,firebase?.user?.uid,selectedSource,comparison]);
  useEffect(()=>()=>{if(leaseManager)void leaseManager.dispose();},[leaseManager]);
  const isDemo = repository.sourceKind==='demo';
  // Administration is independent of the content repository.
  const isFirebase=!!firebase;
  const firebaseEditRevision=useRef(0);
  const privateTest=window.HDND_TEST===true;
  const [storageHint, setStorageHint] = useState('');
  const sourceKey = comparison?`compare:${compareSource}:${configured.url}`:isDemo?'demo':isFirebase&&selectedSource==='primary'?'pages:primary':isFirebase?`pages:sheets:${configured.url}`:configured.url;
  const [allowTemporaryLayout,setAllowTemporaryLayout]=useState(false);
  // A cached admin layout can paint immediately, but an unverified cached Excel
  // preference must NEVER trigger a GViz download while Firebase is still checking
  // the live admin-selected source. That caused 57 Excel rows before 55 RTDB rows.
  // An already-confirmed cached Database preference can start after authentication
  // while profile/permissions listeners validate the current configuration in parallel.
  // After a live confirmation, preserve mounted data through temporary Firebase
  // status errors. Never drop 55 rows just because permission/profile refresh failed.
  const verifiedRepository=useRef<Repository|null>(null);
  if(!firebase||firebase.common.status==='ready')verifiedRepository.current=repository;
  const sourceReady=!firebase||firebase.common.status==='ready'||allowTemporaryLayout||
    verifiedRepository.current===repository||
    (['database','primary'].includes(firebase.profile?.dataSource??'')&&!!firebase.user);
  // Fair A/B: start both data requests only after exactly the same auth+profile
  // gates. No provisional Excel request while the admin config is pending.
  const compareReady=!comparison||(!!firebase?.user&&firebase.common.status==='ready'&&!!firebase.profile);
  const canStartSource=sourceReady&&compareReady&&(repository.sourceKind!=='firebase'||!!firebase?.user);
  const workspace = useWorkspace(repository, sourceKey,canStartSource,leaseManager);
  // If a new visitor has no local snapshot and RTDB stalls, don't show an
  // indefinite blank loading state. Offer an explicit transport comparison.
  // Do not silently switch the protocol or bypass Firebase authentication.
  const [slowRealtime,setSlowRealtime]=useState(false);
  useEffect(()=>{
    if(repository.sourceKind!=='firebase'||!canStartSource||!workspace.busy||workspace.items.length>0){
      setSlowRealtime(false);return;
    }
    const id=window.setTimeout(()=>setSlowRealtime(true),10000);
    return()=>window.clearTimeout(id);
  },[repository.sourceKind,canStartSource,workspace.busy,workspace.items.length]);
  const retryWithLongPolling=()=>{
    const url=new URL(window.location.href);
    url.searchParams.set('dbTransport','longpoll');
    url.searchParams.set('startupMetrics','1');
    window.location.assign(url.toString());
  };
  useEffect(()=>{markStartup('react-commit');},[]);
  useEffect(()=>{
    if(canStartSource)markStartup('source-selected',repository.sourceKind==='firebase'?'Database':'Excel');
  },[canStartSource,repository.sourceKind]);
  const reportedPaint=useRef(false);
  // Presentation-only personal colors: no shared layout, permissions or source data.
  const [statusPaletteHolder,setStatusPaletteHolder]=useState(()=>
    ({source:sourceKey,store:loadStatusPaletteStore(sourceKey)}));
  const statusPaletteStore=statusPaletteHolder.source===sourceKey
    ?statusPaletteHolder.store:loadStatusPaletteStore(sourceKey);
  const updateStatusPaletteStore=(next:StatusPaletteStore):boolean=>{
    if(!saveStatusPaletteStore(sourceKey,next))return false;
    setStatusPaletteHolder({source:sourceKey,store:next});
    return true;
  };
  const [page, setPage] = useState<Page>('overview');
  const [editorUnsaved,setEditorUnsaved]=useState(false);
  const [editorExitRequest,setEditorExitRequest]=useState(0);
  const [catalogField,setCatalogField]=useState<CatalogKey|undefined>(undefined);
  // null means the list has not reported its own active width yet; 'auto' is an explicit setting.
  const [listFramePreview,setListFramePreview]=useState<'auto'|number|null>(null);
  const [reportWidthPreview,setReportWidthPreview]=useState<'auto'|number|null>(null);
  const [group, setGroup] = useState<GroupField>('department');
  const [selection, setSelection] = useState<{ title: string; items: Item[] } | null>(null);
  const [history, setHistory] = useState<{item:Item;field?:TextField}|null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const editingPage = page === 'customize' || page === 'items-customize' || page === 'items-permissions' || page === 'catalogs' || page === 'connection'||page==='source'||page==='sync'||page==='transfer'||page==='review';
  const googleCommon=useSharedConfig(configured,!firebase&&!isDemo&&!privateTest,editingPage);
  const common=firebase?firebase.common:googleCommon;
  const canCustomize=!comparison&&(isFirebase?!!firebase?.isAdmin&&common.status==='ready':isDemo||privateTest||(isGoogleHost()&&!!common.config));
  const canEditDraft=!comparison&&(repository.canDraft??!repository.readOnly)&&!workspace.cachePending;
  const changeDataSource=async(next:'excel'|'database'|'primary')=>{
    if(comparison)throw new Error('Đang chạy phép thử tốc độ; không thay đổi nguồn admin.');
    if(!firebase?.isAdmin||common.status!=='ready'||!firebase.profile)throw new Error('Cần quản trị và bản bố cục Firebase đã xác nhận.');
    if(dirtyCount>0)throw new Error('Có nội dung sửa chưa lưu. Hãy giữ lại bản nháp và xử lý trước khi đổi nguồn.');
    if(next==='database')await new FirebaseMirrorRepository(firebase.database,configured).list();
    if(next==='primary'){
      const existing=await new FirebaseRepository(firebase.database,()=>firebase.user,()=>firebase.permissions).list();
      if(!existing.length)throw new Error('Database chính chưa được khởi tạo. Hãy dùng chức năng chuyển dữ liệu một lần từ bản sao đã xác nhận.');
    }
    const updated=await firebase.common.save('dataSource',next,firebase.profile.revision);
    firebaseEditRevision.current=updated.revision;
    setLayoutMessage(next==='primary'?'Đã chuyển sang Firebase Database chính, cập nhật realtime.':next==='database'?'Đã chọn bản sao dữ liệu Excel trong Database.':'Đã chọn nguồn Excel dự phòng.');
  };
  // Production migration is not exposed as a one-click UI operation:
  // the historical Firebase mirror might be stale while staff are still
  // making edits elsewhere. Use a final approved, frozen source and the
  // documented operator cutover procedure only.
  const [sourceDiagnostic,setSourceDiagnostic]=useState('');
  const [viewerLabel,setViewerLabel]=useState('');
  useEffect(()=>{let active=true;setSourceDiagnostic('');setViewerLabel('');if(!isDemo&&isGoogleHost())void googleCall('getDashboardSourceStatus',configured).then(value=>{const v=value as {reason?:unknown;actorLabel?:unknown};if(active&&typeof v?.reason==='string')setSourceDiagnostic(v.reason);if(active&&typeof v?.actorLabel==='string')setViewerLabel(v.actorLabel);}).catch(()=>{});return()=>{active=false;};},[configured.url,isDemo]);
  const dataSaveHint=isFirebase?(selectedSource==='primary'?'Dữ liệu lưu vào Firebase chính và đồng bộ realtime sau khi máy chủ xác nhận. Khách chỉ sửa ô được cấp quyền. Khi mất mạng hoặc xung đột, bản nháp được giữ.':'Đang dùng nguồn Excel hoặc bản sao chỉ đọc. Thay đổi chưa lưu chung; quản trị có thể chuyển một lần sang Firebase chính.'): isDemo?'Dữ liệu mẫu: lưu chỉ giữ trong phiên thử.':(sourceDiagnostic||(repository.readOnly?'Chưa bật lưu vào file Excel nguồn. Thay đổi bạn sửa chỉ giữ trên trình duyệt này; file nguồn chưa được cập nhật.':'Lưu dữ liệu vào Excel có chiều app → file nguồn; chỉ báo thành công sau khi đọc lại xác nhận.'));
  const editorUrl=googleCommon.config?.editorUrl||(configured.url===DEFAULT_SHEET_URL?CONFIG_EDITOR_URL:'');
  const storedCatalog = useMemo(()=>loadCatalog(sourceKey,workspace.items),[sourceKey,workspace.items]);
  const [catalogState,setCatalogState]=useState<{source:string;config:CatalogConfig}|null>(null);
  const catalog=useMemo(()=>common.config&&!isDemo?mergeCatalogItems(common.config.catalogs,workspace.items):catalogState?.source===sourceKey?catalogState.config:storedCatalog,[common.config,isDemo,workspace.items,catalogState,sourceKey,storedCatalog]);
  if(repository instanceof FirebaseRepository){repository.checkAssignment=item=>assignmentIssue(item,catalog)??'';repository.leaseManager=leaseManager;}
  const saveCatalogConfig=async(next:CatalogConfig)=>{if(isFirebase){if(!canCustomize)throw new Error('Chỉ quản trị được lưu cấu hình chung.');const confirmed=await firebase!.common.save('catalogs',next,firebaseEditRevision.current);firebaseEditRevision.current=confirmed.revision;setLayoutMessage('');return;}if(!isDemo&&!privateTest){await common.save('catalogs',next);setLayoutMessage('');}else{if(!saveCatalog(sourceKey,next))throw new Error('Không lưu được danh mục trên máy. Nháp được giữ.');setCatalogState({source:sourceKey,config:next});setLayoutMessage('');}};
  // Manual transitional import: never runs during bootstrap or background polling.
  // A source's displayCode is matched to an existing Firebase row; every changed
  // field still needs its own server lease and normal CAS/audit write.
  const applyTransition=async(entries:TransitionRowChange[]):Promise<number>=>{
    if(!firebase?.isAdmin||!firebase.connected||!firebase.user||selectedSource!=='primary'||
      !(repository instanceof FirebaseRepository)||!leaseManager||
      firebase.freezeControl?.mode!=='OPEN'||common.status!=='ready')
      throw new Error('Chỉ quản trị viên được cập nhật khi Firebase chính đang kết nối và mở sửa.');
    if(workspace.busy||workspace.protectedRecovery||Object.keys(workspace.drafts).length)
      throw new Error('Còn dữ liệu/nháp chưa lưu. Hãy xử lý xong trước khi cập nhật từ nguồn chuyển tiếp.');
    if(entries.length<1||entries.length>20||new Set(entries.map(e=>e.recordId)).size!==entries.length)
      throw new Error('Mỗi lần chỉ cập nhật 1–20 hồ sơ duy nhất đã đối chiếu.');
    let confirmed=0;
    for(const entry of entries){
      const acquired:EditableField[]=[];
      try{
        if(!firebaseLive.current?.connected||firebaseLive.current?.freezeControl?.mode!=='OPEN')
          throw new Error('Firebase mất kết nối hoặc đã khóa/chốt dữ liệu.');
        const live=(await repository.list()).find(row=>row.recordId===entry.recordId);
        if(!live)throw new Error('Hồ sơ không còn trên Firebase: '+entry.displayCode);
        assertTransitionBaseline(entry,live);
        for(const field of entry.fields){
          const kind:EditorKind=field==='content'||field==='note'||field==='specificProgress'
            ?'long':field==='specialist'?'search':field.startsWith('progress')?'status':'short';
          await leaseManager.acquire(entry.recordId,field,kind);
          acquired.push(field);
        }
        const patch:import('../../shared/types').Patch={
          recordId:entry.recordId,sourceCode:entry.displayCode,
          baseRevision:live.revision,operationId:crypto.randomUUID(),
          baseValues:Object.fromEntries(entry.fields.map(field=>[field,live[field]])),
          changes:Object.fromEntries(entry.fields.map(field=>[field,entry.source[field]]))
        };
        const result=(await repository.save([patch]))[0];
        if(!result?.ok)throw new Error(result?.message??'Firebase không xác nhận thao tác.');
        const check=(await repository.list()).find(row=>row.recordId===entry.recordId);
        if(!check||check.revision<=live.revision||
          entry.fields.some(field=>check[field]!==entry.source[field]))
          throw new Error('Đã gửi dữ liệu nhưng chưa xác nhận được bản đọc lại từ Firebase.');
        confirmed++;
      }catch(error){
        throw new Error('Dừng ở hồ sơ '+entry.displayCode+'. Đã cập nhật và đọc lại thành công '+
          confirmed+' hồ sơ trước đó; KHÔNG tự thử lại. Lý do: '+
          (error instanceof Error?error.message:'lỗi kết nối/khóa ô')+
          '. Hãy đọc mới dữ liệu rồi đối chiếu lại các hồ sơ còn lại.');
      }finally{
        // Never leave locks on a failed batch. finish/cancel only remove our own locks.
        for(const field of acquired){
          try{await leaseManager.cancel(entry.recordId,field);}catch{}
        }
      }
    }
    return confirmed;
  };
  // One-shot admin launch from an explicitly reviewed CURRENT Sheets/Excel snapshot.
  // Never schedule this action or infer consent from an empty on-screen list.
  const importInitialFirebaseRows=async(rows:Item[]):Promise<number>=>{
    if(!firebase?.isAdmin||!firebase.user||!firebase.connected||
      firebase.profile?.dataSource==='primary'||common.status!=='ready'||
      firebase.freezeControl?.mode!=='OPEN')
      throw new Error('Cần tài khoản quản trị, Firebase kết nối và chế độ mở sửa; chưa được ở nguồn chính.');
    if(workspace.busy||workspace.protectedRecovery||Object.keys(workspace.drafts).length)
      throw new Error('Còn nháp hoặc dữ liệu chưa xác nhận; không khởi tạo Firebase.');
    const result=await bootstrapApprovedRowsToPrimary(firebase.database,firebase.user,rows);
    return result.importedCount;
  };
  const saveData = async () => { const issue = workspace.workingItems.filter(item => {const changes=workspace.drafts[item.recordId]?.changes;return changes&&('specialist' in changes||'room' in changes);}).map(item => assignmentIssue(item,catalog)).find(Boolean); if(issue){setLayoutMessage(issue);return false;} return workspace.save(); };
  useEffect(()=>{
    if(firebase?.freezeControl?.mode!=='DRAINING'||selectedSource!=='primary')return;
    window.dispatchEvent(new Event('hdnd:drain-editors'));
    const timer=window.setTimeout(()=>{void workspace.save();},1200);
    return()=>window.clearTimeout(timer);
  },[firebase?.freezeControl?.revision,selectedSource]);
  const updateDataDraft=(id:string,changes:Changes)=>{
    if(leaseManager&&Object.keys(changes).some(field=>!leaseManager.has(id,field as EditableField))){
      setLayoutMessage('Ô chưa được cấp khóa sửa độc quyền; dữ liệu chưa được áp dụng.');return;
    }
    if(leaseManager)Object.entries(changes).forEach(([field,value])=>{
      leaseManager.preserveDraft(id,field as EditableField,value);
      leaseManager.markPending(id,field as EditableField);
    });
    if(firebase&&!firebase.isAdmin&&firebase.editingLocked){setLayoutMessage('Quản trị đã khóa chỉnh sửa trên WebApp. Bạn vẫn có thể xem và lọc dữ liệu.');return;}
    if(firebase&&Object.keys(changes).some(field=>!(
      firebase.canEdit(id,field as EditableField)||
      (firebase.freezeControl?.mode==='DRAINING'&&!!leaseManager?.has(id,field as EditableField)&&
       mayEdit(firebase.permissions,id,field as EditableField,firebase.isAdmin))
    ))){setLayoutMessage('Ô này chưa được cấp quyền sửa.');return;}
    workspace.update(id,changes);
  };
  const storedLayout = useMemo(() => loadReportLayout(sourceKey), [sourceKey]);
  const [layoutState, setLayoutState] = useState<{ source: string; layout: ReportLayout[] } | null>(null);
  const layout = common.config&&!isDemo?common.config.reports:layoutState?.source === sourceKey ? layoutState.layout : storedLayout;
  const storedItems=useMemo(()=>loadItemLayout(sourceKey),[sourceKey]);
  const [itemState,setItemState]=useState<{source:string;layout:ItemLayout}|null>(null);
  const itemLayout=common.config&&!isDemo?common.config.items:itemState?.source===sourceKey?itemState.layout:storedItems;
  const saveItemLayoutConfig=async(next:ItemLayout,original:ItemLayout=itemLayout,resolutions?:LayoutConflictChoices):Promise<ItemLayout>=>{
    if(isFirebase){
      if(!canCustomize)throw new Error('Chỉ quản trị được lưu cấu hình chung.');
      const beforeRevision=firebaseEditRevision.current;
      const confirmed=resolutions?await firebase!.common.save('items',next,beforeRevision,original,resolutions):await firebase!.common.save('items',next,beforeRevision,original);
      firebaseEditRevision.current=confirmed.revision;
      setLayoutMessage(confirmed.revision>beforeRevision+1
        ?'Đã hợp nhất các thay đổi không xung đột với cách hiển thị Firebase mới. Dữ liệu Google Sheets không bị sửa.'
        :'Đã lưu cách hiển thị dùng chung vào Firebase. Dữ liệu Google Sheets không bị sửa.');
      return confirmed.items;
    }
    if(!isDemo&&!privateTest&&isGoogleHost()){
      await common.save('items',next);
      setLayoutMessage('Đã lưu khung, thứ tự và độ rộng cột vào Google Sheets riêng. Nội dung Excel chưa thay đổi.');
      return next;
    }
    if(!saveItemLayout(sourceKey,next))throw new Error('Không lưu được cách hiển thị trên máy. Nháp được giữ.');
    setItemState({source:sourceKey,layout:next});
    setLayoutMessage('Đã lưu cách hiển thị trên máy này; chưa đồng bộ cách hiển thị lên kho chung.');
    return next;
  };
  const reports = useMemo(() => configuredReports(layout), [layout]);
  const tableFont=getReportFont(layout);
  useEffect(()=>{loadSelectedWebFont(tableFont);},[tableFont]);
  const showReportDetails=useCallback((title:string,items:Item[])=>setSelection({title,items}),[]);
  const [layoutMessage, setLayoutMessage] = useState('');
  const saveLayout = async(next: ReportLayout[]) => {
    if(isFirebase){if(!canCustomize)throw new Error('Chỉ quản trị được lưu cấu hình chung.');const confirmed=await firebase!.common.save('reports',next,firebaseEditRevision.current);firebaseEditRevision.current=confirmed.revision;setLayoutMessage('');return;}
    if(!isDemo&&!privateTest){await common.save('reports',next);setLayoutMessage('');}
    else{if(!saveReportLayout(sourceKey,next))throw new Error('Không lưu được cách hiển thị trên máy. Nháp được giữ.');setLayoutState({source:sourceKey,layout:next});setLayoutMessage('');}
  };
  const openOptions = (next: Page, event: { currentTarget: HTMLElement }) => {
    event.currentTarget.closest('.options-menu')?.removeAttribute('open');
    if(editorUnsaved&&next!==page){setLayoutMessage('Có thay đổi chưa lưu. Hãy lưu hoặc bỏ phần đang chỉnh trước khi chuyển mục.');return;}
    if(isFirebase&&next==='source'&&!firebase?.isAdmin){setLayoutMessage('Chỉ quản trị được thay link Excel.');return;}
    if(isFirebase&&['items-customize','items-permissions','customize','catalogs'].includes(next)&&!canCustomize){setLayoutMessage('Chỉ tài khoản quản trị được thay đổi cấu hình nguồn và bố cục.');return;}
    if(['customize','catalogs'].includes(next)&&!canCustomize){setLayoutMessage(isFirebase?'Cần đăng nhập Google quản trị và đọc được cấu hình chung.':'Chờ cấu hình chung tải xong hoặc mở trình chỉnh chung trên Google.');return;}
    if(next==='review'&&!firebase?.isAdmin){setLayoutMessage('Chỉ quản trị mới xem và phê duyệt mốc dữ liệu.');return;}if(isFirebase){firebaseEditRevision.current=firebase!.profile?.revision??0;}
    setReportWidthPreview(null);
    setListFramePreview(null);
    setPage(next); setLayoutMessage('');
  };
  const kpis = useMemo(() => getKpis(workspace.items), [workspace.items]);
  const dirtyCount = Object.keys(workspace.drafts).length;
  const discard = () => setConfirmDiscard(true);
  const testConnection = async (config: SheetConfig) => {
    const snapshot = await readSheet(config);
    return { count: snapshot.items.length, warningCount: snapshot.warnings.length };
  };
  const connect = async (config: SheetConfig) => {
    if (dirtyCount) throw new Error('Hãy lưu hoặc bỏ phần sửa trên máy trước khi đổi file nguồn.');
    if(privateTest&&config.url!==window.HDND_SOURCE)throw new Error('Bản thử chỉ dùng bản sao Excel đã chỉ định.');
    const snapshot = await readSheet(config);
    setStorageHint(saveSheetConfig(config) ? '' : 'Đã kết nối, nhưng trình duyệt không lưu được lựa chọn. Lần mở sau có thể cần nhập lại link.');
    if(isFirebase)setFirebaseSourceSeed({url:config.url,snapshot});
    setConfigured(config); setRepository(!firebase&&isGoogleHost()&&window.HDND_EXCEL_ENABLED===true&&window.HDND_SOURCE===config.url?new ExcelRepository(config):new SheetsRepository(config,snapshot)); setSelection(null); setHistory(null);
  };
  const warnings = repository instanceof SheetsRepository ? repository.snapshot?.warnings ?? [] : repository instanceof ExcelRepository?repository.warnings:[];
  const sourceLabel = comparison?(compareSource==='excel'?'Google Sheets/Excel · so sánh':'Firebase Database · so sánh'):isDemo?'Dữ liệu mẫu':isFirebase&&firebase!.profile?.dataSource==='primary'?'Firebase Database · nguồn chính':isFirebase&&firebase!.profile?.dataSource==='database'?'Firebase · bản sao Excel':isFirebase?'Google Sheets/Excel':'Nguồn Excel';
  const listPage=page==='items'||page==='items-customize'||page==='items-permissions';
  const anonymousVisitor=isFirebase&&!firebase!.isAdmin&&(!firebase!.user||firebase!.user.isAnonymous);
  // The PUBLIC visitor receives automatic Firebase anonymous authentication.
  // The visible guest UI stays separate from admin, but a granted field can
  // be edited without Google login once server permissions/lease are ready.
  const viewerMayEdit=!comparison&&isFirebase&&selectedSource==='primary'&&
    !workspace.protectedRecovery&&!firebase!.editingLocked&&firebase!.editorAuthorized&&
    workspace.items.some(item=>TEXT_FIELDS.some(field=>firebase!.canEdit(item.recordId,field.key))||
      firebase!.canEdit(item.recordId,'isDropped'));
  const viewerMayEditText=viewerMayEdit&&workspace.items.some(item=>
    TEXT_FIELDS.some(field=>firebase!.canEdit(item.recordId,field.key)));
  // Width is independent per tab. The outer page header/navigation always uses the
  // viewport, while only the inner content region follows the selected tab width.
  // Calculate the exact first-frame width synchronously from the saved shared
  // profile AND any selected personal view. Never wait for the child effect.
  const viewFrameWidth=useMemo(()=>{
    if(!listPage)return itemLayout.frameWidth??'auto';
    const scope=layoutRecoveryScope(sourceKey);
    const activeId=loadActiveListView(scope);
    const preset=activeId?loadListViews(scope).find(view=>view.id===activeId):undefined;
    if(!canCustomize||!preset)return itemLayout.frameWidth??'auto';
    try{return overlayPersonalLayout(itemLayout,preset.layout).frameWidth??'auto';}
    catch{return itemLayout.frameWidth??'auto';}
  },[itemLayout,sourceKey,listPage,canCustomize]);
  // Cache only widths from an actually confirmed profile. This keeps the
  // header, tabs and loading placeholder at their last saved width on reload.
  // Without a prior profile, use a compact neutral loading shell rather than
  // making the entire screen flash at 100% width.
  const confirmedWidths=useMemo(()=>isFirebase?readConfirmedPageWidths(sourceKey):null,[isFirebase,sourceKey]);
  useEffect(()=>{
    if(!isFirebase||common.status!=='ready'||!common.config)return;
    rememberConfirmedPageWidths(sourceKey,{
      report:reportPageWidth(common.config.reports),
      list:common.config.items.frameWidth??'auto'
    });
  },[isFirebase,sourceKey,common.config,common.status]);
  const accountPage=page==='connection'||page==='source'||page==='review'||page==='transfer'||page==='sync';
  // Account/settings must be available even if auth is still establishing its
  // profile. These panels never require drawing a table with fallback widths.
  const layoutPending=!accountPage&&!allowTemporaryLayout&&
    !common.config&&common.status==='loading';
  const layoutUnavailable=!accountPage&&!allowTemporaryLayout&&isFirebase&&
    !common.config&&(common.status==='error'||!!firebase!.error);
  // Only report a FIRST paint once the correct datasource has arrived AND
  // the admin layout allows the table to be rendered. Previously this timing
  // fired on 57 provisional Excel rows even though the layout was blocked.
  useEffect(()=>{
    if(reportedPaint.current||layoutPending||layoutUnavailable||!canStartSource||!workspace.items.length)return;
    if(typeof requestAnimationFrame!=='function')return;
    const rows=workspace.items.length,kind=repository.sourceKind,fromCache=workspace.cachePending;
    const raf=requestAnimationFrame(()=>{reportedPaint.current=true;markStartup('first-data-painted',rows+' dòng · '+(kind==='firebase'?'Database':'Excel')+(fromCache?' · bản lưu đang xác minh':''));});
    return()=>cancelAnimationFrame(raf);
  },[workspace.items,workspace.cachePending,layoutPending,layoutUnavailable,canStartSource,repository.sourceKind]);
  const loadingWidth=page==='overview'||page==='customize'
    ?confirmedWidths?.report??1120
    :confirmedWidths?.list??1120;
  const frameChoice=accountPage?1100
    :layoutPending||layoutUnavailable?loadingWidth
    :page==='overview'||page==='customize'
      ?(page==='customize'?(reportWidthPreview??reportPageWidth(layout)):reportPageWidth(layout))
      :listPage?(listFramePreview??viewFrameWidth):'auto';
  const pageContentWidth=frameChoice==='auto'?'100%':`${Math.min(6000,Math.max(320,frameChoice))}px`;
  const frameStyle={'--page-content-width':pageContentWidth,
    '--table-font-family':tableFontStack(getReportFont(layout)),
    '--table-font-size':`${getReportFontSize(layout)}px`,
    ...statusPaletteCssVariables(statusPaletteStore.active)} as CSSProperties;
  return <div className={`app-shell imperial-sky-theme ${listPage?'wide-table-page':''} ${page==='items'?'list-fit-page':''} ${editingPage?'settings-page':''} ${anonymousVisitor?'guest-view':''}`} style={frameStyle}>
    {privateTest&&<p className="notice" role="status"><strong>BẢN THỬ · Bản sao Excel</strong> · Nút lưu chỉ ghi bản sao thử, không ghi file nhập liệu thật. Danh mục và cách hiển thị của bản thử giữ trên máy.</p>}<header className="topbar compact-topbar">
      <div className="top-actions">
        <span className="version">Bản {isFirebase?'0.7.1':'0.6.2'}</span>
        {anonymousVisitor
          ? <button type="button" className="button ghost guest-signin" title="Chỉ cần khi truy cập quyền quản trị" onClick={()=>setPage('connection')}>Quản trị</button>
          : <details className="options-menu"><summary aria-label="Cài đặt" title="Cài đặt">⚙</summary>
              <div className="options-popover" aria-label="Các nhóm cài đặt">
                <button type="button" onClick={event=>openOptions('items-customize',event)}>Chỉnh sửa</button>
                <button type="button" onClick={event=>openOptions('connection',event)}>Tài khoản và dữ liệu</button>
              </div>
            </details>}
      </div>
    </header>
    <nav className="nav-tabs primary-section-switcher" aria-label="Hai phần dữ liệu chính">
      {([['overview','Báo cáo tổng hợp'],
        ['items','Danh sách các ND trình HĐND']] as const)
        .map(([key,title])=><button type="button" key={key}
          disabled={editingPage} className={'primary-section-card'+(page===key?' active':'')}
          aria-current={page===key?'page':undefined}
          onClick={()=>{setListFramePreview(null);setPage(key);}}>
          <span className="section-card-copy">
            <strong className="section-card-title">{title}</strong>
          </span>
          <span className="section-card-state" aria-hidden="true">Đang xem</span>
        </button>)}
    </nav>
    <StartupTimingPanel/>
    {slowRealtime&&<div className="notice" role="alert">Firebase đang phản hồi chậm. Có thể do mạng hoặc giao thức kết nối. <button type="button" className="button ghost" onClick={retryWithLongPolling}>Thử kết nối tương thích</button> (sẽ tải lại trang; hãy lưu bản sửa trước khi thử).</div>}
    <main>
      {layoutPending?<div className="layout-loading-placeholder" role="status" aria-busy="true">
        <span>Đang tải bố cục đã lưu… Chờ xác nhận trước khi hiển thị bảng.</span>
        <button type="button" className="button ghost" onClick={()=>setAllowTemporaryLayout(true)}>Xem dữ liệu tạm (bố cục mặc định)</button>
      </div>:
      layoutUnavailable?<div className="layout-loading-placeholder" role="alert">
        <span>Chưa đọc được bố cục đã lưu từ Firebase. Không tự áp dụng cấu hình mặc định.</span>
        <button type="button" className="button ghost" onClick={()=>setAllowTemporaryLayout(true)}>Xem dữ liệu tạm (bố cục mặc định)</button>
      </div>:<>
      {page!=='overview'&&page!=='items'&&<div className="page-heading"><div><h1>{page==='sync'?'Danh mục và cách hiển thị dùng chung':page==='source'?'Nguồn dữ liệu Google Sheets':page==='review'?'Theo dõi thay đổi và phê duyệt':page==='connection'?(isFirebase?'Tài khoản Firebase':'Nguồn dữ liệu'):page==='transfer'?'Nhập / Xuất Excel':page==='customize'?'Tùy chỉnh bảng báo cáo':'Quản lý cột'}</h1></div><span className="muted">{workspace.busy?'Đang đọc dữ liệu…':workspace.loadedAt?`Đọc thành công: ${workspace.loadedAt}`:'Chưa đọc được dữ liệu'}</span></div>}
      {(page==='connection'||page==='source')&&<div className="account-source-actions">
        <button type="button" className="button ghost" disabled={workspace.busy||common.busy}
          onClick={()=>{void workspace.refresh();void common.refresh();}}>Làm mới dữ liệu</button>
        {!anonymousVisitor&&isFirebase&&<details className="account-source-details">
          <summary>Thông tin và khôi phục nguồn</summary>
          <p>Mã trang tính: <code>{configured.gid}</code></p>
          <button type="button" className="button ghost" disabled={workspace.busy||dirtyCount>0}
            onClick={()=>{const original=parseSheetConfig(DEFAULT_SHEET_URL);clearSheetConfig();setConfigured(original);
              setRepository(new SheetsRepository(original));setLayoutMessage('Đã chọn lại nguồn mặc định của ứng dụng; đang tải lại dữ liệu.');}}>
            Dùng lại nguồn mặc định
          </button>
        </details>}
      </div>}
      {!anonymousVisitor&&(['customize','items-customize','items-permissions','catalogs'].includes(page))&&<><nav className="settings-hub-tabs" aria-label="Nhóm chỉnh sửa chính">
        <button type="button" className={page==='customize'?'active':''} aria-current={page==='customize'?'page':undefined} onClick={event=>openOptions('customize',event)} disabled={!canCustomize}>Bảng thống kê</button>
        <button type="button" className={page!=='customize'?'active':''} aria-current={page!=='customize'?'page':undefined} onClick={event=>openOptions('items-customize',event)}>Danh sách dữ liệu</button>
        <button type="button" className="button ghost shared-view-exit" disabled={workspace.busy||common.busy} onClick={()=>setEditorExitRequest(value=>value+1)}>Về chế độ xem</button>
      </nav>
      </>}
      {!anonymousVisitor&&(['connection','review','source','transfer','sync'].includes(page))&&<nav className="settings-hub-tabs" aria-label="Tài khoản và quản trị">
        <button className={page==='connection'?'active':''} onClick={event=>openOptions('connection',event)}>Tài khoản</button>
        {isFirebase&&firebase!.isAdmin&&<button className={page==='review'?'active':''} onClick={event=>openOptions('review',event)}>Quản trị</button>}
        {isFirebase&&firebase!.isAdmin&&<><button className={page==='source'?'active':''} onClick={event=>openOptions('source',event)}>Google Sheets</button><button className={page==='transfer'?'active':''} onClick={event=>openOptions('transfer',event)}>Excel · Trích xuất</button></>}
        {!isFirebase&&<button className={page==='sync'?'active':''} onClick={event=>openOptions('sync',event)}>Cấu hình chung</button>}
      </nav>}
      {isFirebase&&common.config&&common.status!=='ready'&&<p className="muted" role="status">Đang xem bố cục admin đã lưu gần nhất trên máy; quyền đổi cấu hình vẫn bị khóa tới khi Firebase xác nhận.</p>}
      {comparison&&<p className="notice" role="status">ĐANG SO SÁNH TỐC ĐỘ — {compareSource==='excel'?'đọc Excel trực tiếp qua Google Sheets GViz':'đọc Firebase Realtime Database'}. Dữ liệu chỉ xem; không thay nguồn mặc định admin đã lưu. Hai nguồn có thể có số dòng/thời điểm cập nhật khác nhau.</p>}
      {workspace.cachePending&&<p className="notice" role="status">Đang hiển thị bản dữ liệu lưu trong phiên trên thiết bị này. Chỉ xem; đang xác nhận bản mới nhất trên Firebase.</p>}
      {isFirebase&&repository instanceof FirebaseMirrorRepository&&repository.snapshot&&!workspace.cachePending&&<p className="muted" role="status">Nguồn Database · Đồng bộ Excel thành công: {new Date(repository.snapshot.syncedAt).toLocaleString('vi-VN')}{Date.now()-Date.parse(repository.snapshot.syncedAt)>120000?' · Bản sao có thể chậm cập nhật':''}</p>}
      {!anonymousVisitor&&!isDemo&&!privateTest&&common.status==='error'&&<p className="notice" role="alert">Không tải được danh mục và cách hiển thị: {common.message} <button className="button ghost" disabled={common.busy} onClick={()=>void common.refresh()}>Thử lại</button>{!isFirebase&&!isGoogleHost()&&editorUrl&&<> · <a href={editorUrl} target="_blank" rel="noreferrer">Mở trang cấu hình trên Google</a></>}</p>}{workspace.message && <p className="notice" role="alert">{workspace.message}</p>}
      {storageHint && <p className="notice" role="status">{storageHint}</p>}
      {workspace.protectedRecovery&&<p className="notice">Có thay đổi trên máy chưa khớp dữ liệu nguồn hiện tại. <button className="button ghost" onClick={()=>{const bundle=readWorkspaceRecovery(sourceKey);if(!bundle)return;const blob=new Blob([JSON.stringify({schemaVersion:1,source:configured,bundle},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='HDND_nhap_can_doi_chieu.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Tải phần sửa trên máy để đối chiếu</button><button className="button danger" onClick={discard}>Bỏ phần sửa cũ trên máy</button></p>}
      {!anonymousVisitor&&workspace.autosaveMessage && <p className="muted" role="status">{workspace.autosaveMessage}</p>}{!anonymousVisitor&&layoutMessage && <p className="notice" role="status">{layoutMessage}</p>}
      {!anonymousVisitor&&warnings.length > 0 && <details className="notice source-warnings"><summary>{warnings.length} cảnh báo về dữ liệu nguồn</summary><ul>{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}
      {isFirebase&&!firebase!.isAdmin&&page==='items'&&(!viewerMayEdit||anonymousVisitor)&&
        <p className="guest-rights-hint" role="status">
          {!firebase!.connected?'Chưa kết nối Firebase; tạm thời chỉ xem, chưa thể lưu thay đổi.'
            :selectedSource!=='primary'?'Nguồn hiện tại chưa phải Firebase chính. Có thể xem dữ liệu, nhưng chưa được ghi nội dung vào dữ liệu chính.'
            :!firebase!.controlReady?'Đang xác nhận quyền chỉnh sửa từ Firebase.'
            :firebase!.editingLocked?'Quản trị đang tạm khóa chỉnh sửa.'
            :firebase!.freezeControl?.mode!=='OPEN'?'Dữ liệu đang được chốt hoặc tạm khóa; chưa thể mở lượt sửa mới.'
            :!firebase!.editorAuthorized?'Tài khoản Google này chưa được duyệt quyền UID chỉnh sửa.'
            :!viewerMayEdit?'Không có ô nào được cấp quyền sửa trong phần dữ liệu đang xem. Khách không cần đăng nhập; khi quản trị mở quyền ô, hãy chọn chính ô đó để sửa.'
            :anonymousVisitor?'Khách có thể chỉnh sửa các ô được quản trị cho phép; các ô khác chỉ xem. Không cần đăng nhập.'
            :'Chỉ các ô được cấp quyền mới được chỉnh sửa.'}
        </p>}
      {dirtyCount > 0 && <div className="draft-bar"><div><strong>{anonymousVisitor?`${dirtyCount} nội dung đang chờ đồng bộ`: `${dirtyCount} nội dung đang chờ lưu vào ${selectedSource==='primary'?'Firebase Database':isDemo?'dữ liệu mẫu':'nguồn hiện tại'}`}</strong><span> {selectedSource==='primary'?'Phần sửa đang được gửi lên Firebase. Chỉ khi máy chủ xác nhận thì mọi người mới thấy dữ liệu mới.':'Phần sửa hiện chỉ có trên trình duyệt; chưa cập nhật chung.'}</span></div><div className="top-actions"><button className="button ghost" onClick={discard} disabled={workspace.busy}>Bỏ các thay đổi</button>{repository.readOnly&&<button className="button ghost" onClick={workspace.keepDraft} disabled={workspace.busy}>Giữ thay đổi trên máy</button>}<button className="button primary" onClick={() => void saveData()} disabled={workspace.busy||!!repository.readOnly} title={repository.readOnly?dataSaveHint:undefined}>{workspace.busy ? "Đang lưu…" : repository.readOnly?(isFirebase?"Chỉ lưu nháp trên máy":"Chưa thể lưu vào Excel"):isFirebase?"Lưu lại vào Firebase":isDemo?"Lưu vào dữ liệu mẫu":"Lưu dữ liệu vào Excel"}</button></div></div>}
      {page === 'overview' && <>
        <div className="kpi-grid">{[['Đang trình', kpis.total, `${kpis.nq} nghị quyết · ${kpis.bc} báo cáo`], ['Sở chưa trình', kpis.pending, 'Chờ hồ sơ từ đơn vị'], ['VP đang thực hiện', kpis.doing, 'Đang xử lý và hoàn thiện'], ['Đã hoàn thành', kpis.completed, 'Trạng thái hoàn thành đã xác nhận']].map(([label, value, note]) => <article className="kpi-card" key={String(label)}><span>{label}</span><strong className="kpi-value">{value}</strong><span className="kpi-note">{note}</span></article>)}</div>
        
        <div className="toolbar"><label className="field">Phân nhóm theo<select value={group} onChange={e => setGroup(e.target.value as GroupField)}>{GROUP_OPTIONS.map(option => <option value={option.key} key={option.key}>{option.label}</option>)}</select></label><span className="muted">Bấm vào số lượng để xem nội dung. Rút/lưu trữ được loại khỏi báo cáo.</span></div>
        {reports.map(config => <MemoReportTable key={config.id} items={workspace.items} config={config} group={group} groupOrder={catalog.options[group]} sourceLabel={sourceLabel} onSelect={showReportDetails} />)}
        {!reports.length && <p className="empty">Các bảng báo cáo đang được ẩn. Mở ⚙ Cài đặt → Chỉnh sửa → Bảng thống kê để hiển thị lại.</p>}
      </>}
      {page === 'customize' && <ReportSettings storageLabel={isFirebase?'Firebase':'Google Sheets'} key={sourceKey} sourceKey={sourceKey} initial={layout} items={workspace.items} group={group} groupOrder={catalog.options[group]} sourceLabel={sourceLabel} onSave={saveLayout} onDirtyChange={setEditorUnsaved} onPreviewWidthChange={setReportWidthPreview} exitRequest={editorExitRequest} onClose={() => {setEditorUnsaved(false);setReportWidthPreview(null);setPage('overview');}} />}
      {page === 'catalogs'&&<CatalogSettings storageLabel={isFirebase?'Firebase':'Google Sheets'} key={`${sourceKey}:${catalogField??'default'}`} initialField={catalogField} columnLabels={Object.fromEntries(itemLayout.columns.map(column=>[column.key,column.label]))} sourceKey={sourceKey} items={workspace.items} config={catalog} onSave={saveCatalogConfig} onDirtyChange={setEditorUnsaved} exitRequest={editorExitRequest} onClose={()=>{setEditorUnsaved(false);setPage('overview');}}/>}
      {(page === 'items' || page === 'items-customize' || page==='items-permissions') && <ItemList key={`${sourceKey}:${page}`} statusPaletteStore={statusPaletteStore} onStatusPaletteChange={canCustomize?updateStatusPaletteStore:undefined} permissionModeOnly={false} externalSectionTabs={true} onPersistCatalog={saveCatalogConfig} canEditDraft={canEditDraft&&!workspace.protectedRecovery&&
          (!isFirebase||firebase!.isAdmin||!firebase!.editingLocked)} saveDataHint={dataSaveHint} onKeepDraft={workspace.keepDraft} sourceLabel={sourceLabel} draftOnly={isFirebase&&selectedSource!=='primary'&&!isDemo} viewerScope={isFirebase?firebase?.user?.uid??'signed-out':'local'} allowPersonalCompact={isFirebase} layoutSaveLabel={privateTest||!isDemo&&!isFirebase&&!isGoogleHost()?'Lưu cách hiển thị trên máy':'Lưu cách hiển thị chung'} sourceKey={sourceKey} initialLayout={itemLayout} onPersistLayout={saveItemLayoutConfig} 
        onPersistViewerLayout={isFirebase&&!!firebase?.isAdmin&&!!firebase.profile&&common.status==='ready'&&firebase.connected
          ?async(next,baseline)=>{firebaseEditRevision.current=firebase.profile?.revision??0;
            return saveItemLayoutConfig(next,baseline);}
          :undefined} catalog={catalog} items={workspace.workingItems} drafts={workspace.drafts} errors={workspace.errors} dataSaving={isFirebase&&workspace.busy} onFrameWidthChange={setListFramePreview} anonymousViewer={anonymousVisitor} permissions={isFirebase&&firebase!.isAdmin?firebase!.permissions:undefined} onSavePermissions={isFirebase&&firebase!.isAdmin?firebase!.savePermissions:undefined} onReloadPermissions={isFirebase&&firebase!.isAdmin?firebase!.refreshPermissions:undefined} canEditCell={isFirebase?(id,field)=>
          (firebase!.canEdit(id,field)||(firebase!.freezeControl?.mode==='DRAINING'&&!!leaseManager?.has(id,field)))&&
          mayEdit(firebase!.permissions,id,field,firebase!.isAdmin):undefined} allowLayout={isFirebase?canCustomize:true} busy={workspace.busy||common.busy} onUpdate={updateDataDraft} leaseManager={leaseManager} onHistory={(item)=>setHistory({item})}
        onCellHistory={(item,field)=>setHistory({item,field})} readOnly={!!repository.readOnly} sourceKind={repository.sourceKind} customizing={page === 'items-customize'||page==='items-permissions'} onClose={()=>{setEditorUnsaved(false);setListFramePreview(null);setPage('items');}} onDirtyChange={setEditorUnsaved} exitRequest={editorExitRequest} onSaveData={saveData} onDiscardData={workspace.discard} onLayoutSaved={setLayoutMessage} />}
      {page==='review'&&isFirebase&&firebase!.isAdmin&&<ApprovalReviewPanel source={configured} items={workspace.items} loadedAt={workspace.loadedAt} hasDrafts={dirtyCount>0||workspace.protectedRecovery} firebase={firebase!} onClose={()=>setPage('overview')}/>}
       {page==='sync'&&!isFirebase&&<SyncPanel source={configured} profile={{catalogs:catalog,reports:layout,items:itemLayout}} config={googleCommon.config} isHost={isGoogleHost()} busy={common.busy} onSave={async profile=>{await common.save('all',profile);}} onRefresh={()=>common.refresh(true)} onClose={()=>setPage('overview')}/>}
      {(page==='source'||page === 'connection' && !isFirebase) && <>{dirtyCount > 0 && <p className="notice">Lưu hoặc bỏ phần sửa trên máy trước khi đổi file nguồn.</p>}<ConnectionPanel onClose={()=>setPage('overview')} key={configured.url} initial={configured} onTest={testConnection} onConnect={connect} onDemo={() => { setRepository(new MockRepository(readWorkspaceRecovery('demo')?.items ?? createDemoItems())); setHistory(null); setSelection(null); }} disabled={workspace.busy || dirtyCount > 0} isDemo={isDemo} allowDemo={!isFirebase} /></>}
      {page==='connection'&&isFirebase&&<FirebasePanel firebaseDatabase={firebase!.database} userUid={firebase!.user?.uid??''} editorAuthorized={firebase!.editorAuthorized} editors={firebase!.editors} onSaveEditorAccess={firebase!.saveEditorAccess} dataSource={firebase!.profile?.dataSource??'excel'} onChangeDataSource={changeDataSource} onBootstrapPrimary={undefined} userLabel={firebase!.user?.isAnonymous?`Khách ẩn danh · ${firebase!.user.uid.slice(0,8)}`:firebase!.user?.email??''} isAdmin={firebase!.isAdmin} connected={firebase!.connected} permissions={firebase!.permissions} items={workspace.items} busy={workspace.busy||common.busy} onLogin={firebase!.login} onLogout={firebase!.logout} onSavePermissions={firebase!.savePermissions} onOpenItemsCustomize={()=>{firebaseEditRevision.current=firebase!.profile?.revision??0;setPage('items-customize');}} onClose={()=>setPage('overview')}/>}
      {page==='transfer'&&isFirebase&&TransferPanel&&<TransferPanel items={workspace.items} isAdmin={firebase!.isAdmin} profile={{catalogs:catalog,reports:layout,items:itemLayout}} onSaveProfile={async value=>{await firebase!.common.save('all',value,firebaseEditRevision.current);firebaseEditRevision.current++;}} disabled={workspace.busy||dirtyCount>0||!firebase!.connected} importEnabled={false}
         initialSheetUrl={configured.url}
         onInitialImport={selectedSource!=='primary'?importInitialFirebaseRows:undefined}
         initialImportDisabled={workspace.busy||dirtyCount>0||workspace.protectedRecovery||!firebase!.connected||firebase!.freezeControl?.mode!=='OPEN'||common.status!=='ready'}
         transitionSheetUrl={configured.url}
         onTransitionApply={selectedSource==='primary'?applyTransition:undefined}
         transitionDisabled={workspace.busy||dirtyCount>0||workspace.protectedRecovery||!firebase!.connected||firebase!.freezeControl?.mode!=='OPEN'||common.status!=='ready'}
         onImport={async()=>{throw new Error('Nhập dữ liệu chỉ mở khi có quyết định chuyển đổi chính thức. Hãy dùng cập nhật chuyển tiếp có đối chiếu khi Firebase đã được duyệt là nguồn chính.');}} onClose={()=>setPage('overview')}/>}
      </>}
    </main>
    {selection && <ReportDetailGrid key={sourceKey} title={selection.title}
      statusPaletteStore={statusPaletteStore} onStatusPaletteChange={canCustomize?updateStatusPaletteStore:undefined}
      selectedIds={selection.items.map(item=>item.recordId)}
      items={workspace.workingItems} sourceKey={sourceKey} catalog={catalog} listLayout={itemLayout}
       viewerCompactScope={isFirebase&&!firebase!.isAdmin?layoutRecoveryScope('viewer-compact:'+sourceKey+':'+(firebase!.user?.uid??'signed-out')):undefined}
      allowDraft={canEditDraft&&!workspace.protectedRecovery&&
        (!firebase||selectedSource==='primary'&&(!firebase.editingLocked||firebase.isAdmin))}
      guestViewer={anonymousVisitor}
      readOnlyViewer={isFirebase&&!firebase!.isAdmin&&!viewerMayEditText}
      canEditCell={(id,field)=>!firebase||selectedSource==='primary'&&
        ((firebase.canEdit(id,field)||(firebase.freezeControl?.mode==='DRAINING'&&!!leaseManager?.has(id,field)))&&
        mayEdit(firebase.permissions,id,field,firebase.isAdmin))}
      onUpdate={updateDataDraft} leaseManager={leaseManager} onKeepDraft={workspace.keepDraft}
      onHistory={anonymousVisitor?undefined:(item)=>setHistory({item})}
      onCellHistory={anonymousVisitor?undefined:(item,field)=>setHistory({item,field})}
      onOpenFullList={()=>{setSelection(null);setPage('items');}}
      dirtyIds={new Set(Object.keys(workspace.drafts))} errors={workspace.errors}
      onClose={()=>setSelection(null)}/>}
    {history && <HistoryDialog item={history.item} field={history.field} repository={repository} onClose={() => setHistory(null)} />}
    {confirmDiscard && <Modal title="Bỏ các thay đổi chưa lưu vào file nguồn?" onClose={() => setConfirmDiscard(false)}><div className="modal-body"><p>Phần chưa lưu của {workspace.protectedRecovery?'phần sửa cũ trên máy':`${dirtyCount} nội dung`} sẽ được bỏ. Dữ liệu trong file nguồn không bị thay đổi.</p></div><div className="modal-footer"><button className="button ghost" onClick={() => setConfirmDiscard(false)}>Tiếp tục sửa</button><button className="button danger" onClick={() => { workspace.discard(); setConfirmDiscard(false); }}>Bỏ các thay đổi</button></div></Modal>}
    {!anonymousVisitor&&<footer className="app-footer">{'Dashboard HĐND · Một file HTML · '+sourceLabel}</footer>}
  </div>;
}




