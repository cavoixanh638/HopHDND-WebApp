import {useEffect,useMemo, useRef, useState, useCallback } from 'react';
import type {CSSProperties} from 'react';
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
import { FirebaseMirrorRepository } from '../data/firebase-mirror-repository';
import { ExcelRepository } from '../data/excel-repository';
import { DEFAULT_SHEET_URL, clearSheetConfig, loadSheetConfig, parseSheetConfig, saveSheetConfig, type SheetConfig } from '../data/sheet-config';
import { ConnectionPanel } from '../features/settings/ConnectionPanel';
import { configuredReports, getReportFont, getReportFontSize, tableFontStack, loadReportLayout, reportPageWidth, saveReportLayout, type ReportLayout } from '../data/report-preferences';
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
import {mayEdit} from '../data/firebase-repository';
import type {FirebaseController} from '../state/use-firebase';
import {FirebasePanel} from '../features/settings/FirebasePanel';
import {ApprovalReviewPanel} from '../features/settings/ApprovalReviewPanel';

type Page = 'overview' | 'items' | 'connection' | 'source' | 'customize' | 'items-customize' | 'items-permissions' | 'catalogs'|'sync'|'transfer'|'review';
declare global {interface Window {HDND_SOURCE?:string;HDND_EXCEL_ENABLED?:boolean;HDND_TEST?:boolean}}
const connectedRepository=(config:SheetConfig):Repository=>isGoogleHost()&&window.HDND_EXCEL_ENABLED===true&&window.HDND_SOURCE===config.url?new ExcelRepository(config):new SheetsRepository(config);

export function App({firebase,TransferPanel}:{firebase?:FirebaseController;TransferPanel?:typeof import('../features/settings/ExcelTransferPanel').ExcelTransferPanel}={}) {
  const [configured, setConfigured] = useState(() => window.HDND_SOURCE?parseSheetConfig(window.HDND_SOURCE):loadSheetConfig() ?? parseSheetConfig(DEFAULT_SHEET_URL));
  const [browserRepository,setRepository] = useState<Repository>(()=>connectedRepository(configured));
  // When selected, the verified Firebase mirror replaces slow GViz reads for all viewers.
  const repository=useMemo<Repository>(()=>firebase
    ?firebase.profile?.dataSource==='database'
      ?new FirebaseMirrorRepository(firebase.database,configured)
      :new SheetsRepository(configured)
    :browserRepository,[firebase?.database,firebase?.user?.uid,firebase?.profile?.dataSource,configured.url,browserRepository]);
  const isDemo = repository.sourceKind==='demo';
  // Administration is independent of the content repository.
  const isFirebase=!!firebase;
  const firebaseEditRevision=useRef(0);
  const privateTest=window.HDND_TEST===true;
  const [storageHint, setStorageHint] = useState('');
  const sourceKey = isDemo?'demo':isFirebase?`pages:sheets:${configured.url}`:configured.url;
  const workspace = useWorkspace(repository, sourceKey);
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
  const [allowTemporaryLayout,setAllowTemporaryLayout]=useState(false);
  const [editorExitRequest,setEditorExitRequest]=useState(0);
  const [catalogField,setCatalogField]=useState<CatalogKey|undefined>(undefined);
  // null means the list has not reported its own active width yet; 'auto' is an explicit setting.
  const [listFramePreview,setListFramePreview]=useState<'auto'|number|null>(null);
  const [reportWidthPreview,setReportWidthPreview]=useState<'auto'|number|null>(null);
  const [group, setGroup] = useState<GroupField>('vpLeader');
  const [selection, setSelection] = useState<{ title: string; items: Item[] } | null>(null);
  const [history, setHistory] = useState<{item:Item;field?:TextField}|null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const editingPage = page === 'customize' || page === 'items-customize' || page === 'items-permissions' || page === 'catalogs' || page === 'connection'||page==='source'||page==='sync'||page==='transfer'||page==='review';
  const googleCommon=useSharedConfig(configured,!firebase&&!isDemo&&!privateTest,editingPage);
  const common=firebase?firebase.common:googleCommon;
  const canCustomize=isFirebase?!!firebase?.isAdmin&&common.status==='ready':isDemo||privateTest||(isGoogleHost()&&!!common.config);
  const canEditDraft=repository.canDraft??!repository.readOnly;
  const changeDataSource=async(next:'excel'|'database')=>{
    if(!firebase?.isAdmin||common.status!=='ready'||!firebase.profile)throw new Error('Cần quản trị và bản bố cục Firebase đã xác nhận.');
    if(next==='database')await new FirebaseMirrorRepository(firebase.database,configured).list();
    const updated=await firebase.common.save('dataSource',next,firebase.profile.revision);
    firebaseEditRevision.current=updated.revision;
    setLayoutMessage(next==='database'?'Đã chọn Database đã xác nhận.':'Đã chọn nguồn Excel trực tiếp.');
  };
  const [sourceDiagnostic,setSourceDiagnostic]=useState('');
  const [viewerLabel,setViewerLabel]=useState('');
  useEffect(()=>{let active=true;setSourceDiagnostic('');setViewerLabel('');if(!isDemo&&isGoogleHost())void googleCall('getDashboardSourceStatus',configured).then(value=>{const v=value as {reason?:unknown;actorLabel?:unknown};if(active&&typeof v?.reason==='string')setSourceDiagnostic(v.reason);if(active&&typeof v?.actorLabel==='string')setViewerLabel(v.actorLabel);}).catch(()=>{});return()=>{active=false;};},[configured.url,isDemo]);
  const dataSaveHint=isFirebase?'Google Sheets là nguồn chính. Sửa ô được cấp quyền chỉ để thử trên trình duyệt; không ghi Google Sheets hoặc Firebase. Nội dung/Ghi chú cần bấm Áp dụng trong popup.':isDemo?'Dữ liệu mẫu: lưu chỉ giữ trong phiên thử.':(sourceDiagnostic||(repository.readOnly?'Chưa bật lưu vào file Excel nguồn. Thay đổi bạn sửa chỉ giữ trên trình duyệt này; file nguồn chưa được cập nhật.':'Lưu dữ liệu vào Excel có chiều app → file nguồn; chỉ báo thành công sau khi đọc lại xác nhận.'));
  const editorUrl=googleCommon.config?.editorUrl||(configured.url===DEFAULT_SHEET_URL?CONFIG_EDITOR_URL:'');
  const storedCatalog = useMemo(()=>loadCatalog(sourceKey,workspace.items),[sourceKey,workspace.items]);
  const [catalogState,setCatalogState]=useState<{source:string;config:CatalogConfig}|null>(null);
  const catalog=useMemo(()=>common.config&&!isDemo?mergeCatalogItems(common.config.catalogs,workspace.items):catalogState?.source===sourceKey?catalogState.config:storedCatalog,[common.config,isDemo,workspace.items,catalogState,sourceKey,storedCatalog]);
  const saveCatalogConfig=async(next:CatalogConfig)=>{if(isFirebase){if(!canCustomize)throw new Error('Chỉ quản trị được lưu cấu hình chung.');const confirmed=await firebase!.common.save('catalogs',next,firebaseEditRevision.current);firebaseEditRevision.current=confirmed.revision;setLayoutMessage('');return;}if(!isDemo&&!privateTest){await common.save('catalogs',next);setLayoutMessage('');}else{if(!saveCatalog(sourceKey,next))throw new Error('Không lưu được danh mục trên máy. Nháp được giữ.');setCatalogState({source:sourceKey,config:next});setLayoutMessage('');}};
  const saveData = async () => { const issue = workspace.workingItems.filter(item => {const changes=workspace.drafts[item.recordId]?.changes;return changes&&('specialist' in changes||'room' in changes);}).map(item => assignmentIssue(item,catalog)).find(Boolean); if(issue){setLayoutMessage(issue);return false;} return workspace.save(); };
  const updateDataDraft=(id:string,changes:Changes)=>{
    if(firebase&&!firebase.isAdmin&&firebase.editingLocked){setLayoutMessage('Quản trị đã khóa chỉnh sửa trên WebApp. Bạn vẫn có thể xem và lọc dữ liệu.');return;}
    if(firebase&&Object.keys(changes).some(field=>!firebase.canEdit(id,field as EditableField))){setLayoutMessage('Ô này chưa được cấp quyền sửa.');return;}
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
    if(isFirebase&&['items-customize','items-permissions','customize','catalogs','source'].includes(next)&&!canCustomize){setLayoutMessage('Chỉ tài khoản quản trị được thay đổi cấu hình nguồn và bố cục.');return;}
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
    setConfigured(config); setRepository(!firebase&&isGoogleHost()&&window.HDND_EXCEL_ENABLED===true&&window.HDND_SOURCE===config.url?new ExcelRepository(config):new SheetsRepository(config,snapshot)); setSelection(null); setHistory(null);
  };
  const warnings = repository instanceof SheetsRepository ? repository.snapshot?.warnings ?? [] : repository instanceof ExcelRepository?repository.warnings:[];
  const sourceLabel = isDemo?'Dữ liệu mẫu':isFirebase&&firebase!.profile?.dataSource==='database'?'Firebase Database':isFirebase?'Google Sheets/Excel':'Nguồn Excel';
  const listPage=page==='items'||page==='items-customize'||page==='items-permissions';
  const anonymousVisitor=isFirebase&&!firebase!.isAdmin&&(!firebase!.user||firebase!.user.isAnonymous);
  const guestMayEdit=anonymousVisitor&&!firebase!.editingLocked&&!workspace.protectedRecovery&&
    workspace.items.some(item=>TEXT_FIELDS.some(field=>firebase!.canEdit(item.recordId,field.key))||
      firebase!.canEdit(item.recordId,'isDropped'));
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
  },[itemLayout,sourceKey,listPage]);
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
  return <div className={`app-shell ${listPage?'wide-table-page':''} ${editingPage?'settings-page':''} ${anonymousVisitor?'guest-view':''}`} style={frameStyle}>
    {privateTest&&<p className="notice" role="status"><strong>BẢN THỬ · Bản sao Excel</strong> · Nút lưu chỉ ghi bản sao thử, không ghi file nhập liệu thật. Danh mục và cách hiển thị của bản thử giữ trên máy.</p>}<header className="topbar compact-topbar">
      <div className="top-actions">
        <span className="version">Bản {isFirebase?'0.7.1':'0.6.2'}</span>
        {anonymousVisitor
          ? <button type="button" className="button ghost guest-signin" onClick={()=>setPage('connection')}>Đăng nhập</button>
          : <details className="options-menu"><summary aria-label="Cài đặt" title="Cài đặt">⚙</summary>
              <div className="options-popover" aria-label="Các nhóm cài đặt">
                <button type="button" onClick={event=>openOptions('items-customize',event)}>Chỉnh sửa</button>
                <button type="button" onClick={event=>openOptions('connection',event)}>Tài khoản và dữ liệu</button>
              </div>
            </details>}
      </div>
    </header>
    <nav className="nav-tabs primary-section-switcher" aria-label="Hai phần dữ liệu chính">
      {([['overview','Báo cáo tổng hợp','Tổng hợp số liệu, tiến độ và trạng thái'],
        ['items','Danh sách các ND trình HĐND','Tra cứu và cập nhật từng nội dung']] as const)
        .map(([key,title,description])=><button type="button" key={key}
          disabled={editingPage} className={'primary-section-card'+(page===key?' active':'')}
          aria-current={page===key?'page':undefined}
          onClick={()=>{setListFramePreview(null);setPage(key);}}>
          <span className="section-card-icon" aria-hidden="true">{key==='overview'?'▦':'▤'}</span>
          <span className="section-card-copy">
            <strong className="section-card-title">{title}</strong>
            <small className="section-card-description">{description}</small>
          </span>
          <span className="section-card-state" aria-hidden="true">{page===key?'Đang xem':'Xem'}</span>
        </button>)}
    </nav>
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
      {isFirebase&&repository instanceof FirebaseMirrorRepository&&repository.snapshot&&<p className="muted" role="status">Nguồn Database · Đồng bộ Excel thành công: {new Date(repository.snapshot.syncedAt).toLocaleString('vi-VN')}{Date.now()-Date.parse(repository.snapshot.syncedAt)>120000?' · Bản sao có thể chậm cập nhật':''}</p>}
      {!anonymousVisitor&&!isDemo&&!privateTest&&common.status==='error'&&<p className="notice" role="alert">Không tải được danh mục và cách hiển thị: {common.message} <button className="button ghost" disabled={common.busy} onClick={()=>void common.refresh()}>Thử lại</button>{!isFirebase&&!isGoogleHost()&&editorUrl&&<> · <a href={editorUrl} target="_blank" rel="noreferrer">Mở trang cấu hình trên Google</a></>}</p>}{workspace.message && <p className="notice" role="alert">{workspace.message}</p>}
      {storageHint && <p className="notice" role="status">{storageHint}</p>}
      {workspace.protectedRecovery&&<p className="notice">Có thay đổi trên máy chưa khớp dữ liệu nguồn hiện tại. <button className="button ghost" onClick={()=>{const bundle=readWorkspaceRecovery(sourceKey);if(!bundle)return;const blob=new Blob([JSON.stringify({schemaVersion:1,source:configured,bundle},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='HDND_nhap_can_doi_chieu.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Tải phần sửa trên máy để đối chiếu</button><button className="button danger" onClick={discard}>Bỏ phần sửa cũ trên máy</button></p>}
      {!anonymousVisitor&&workspace.autosaveMessage && <p className="muted" role="status">{workspace.autosaveMessage}</p>}{!anonymousVisitor&&layoutMessage && <p className="notice" role="status">{layoutMessage}</p>}
      {!anonymousVisitor&&warnings.length > 0 && <details className="notice source-warnings"><summary>{warnings.length} cảnh báo về dữ liệu nguồn</summary><ul>{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}
      {anonymousVisitor&&page==='items'&&<p className="guest-rights-hint" role="status">{!firebase!.connected?'Chưa kết nối Firebase để kiểm tra quyền sửa.':!firebase!.controlReady?'Đang đọc trạng thái quyền sửa.':firebase!.editingLocked?'Quản trị đang khóa chế độ sửa thử.':guestMayEdit?'Có thể bấm trực tiếp vào ô được cấp quyền để sửa thử. Thay đổi chỉ giữ trên trình duyệt, không ghi vào Google Sheets.':'Chưa có ô nào được cấp quyền sửa cho tài khoản khách trên dữ liệu đang xem. Nếu quản trị vừa cấp quyền, hãy bấm Làm mới dữ liệu và kiểm tra lại quyền.'}</p>}
      {dirtyCount > 0 && <div className="draft-bar"><div><strong>{anonymousVisitor?`${dirtyCount} nội dung đã sửa thử trên máy`: `${dirtyCount} nội dung đã sửa, chưa lưu vào ${isDemo?"dữ liệu mẫu":"file nguồn"}`}</strong><span> Phần sửa đang giữ trên trình duyệt này; báo cáo vẫn dùng dữ liệu từ nguồn.</span></div><div className="top-actions"><button className="button ghost" onClick={discard} disabled={workspace.busy}>Bỏ các thay đổi</button>{repository.readOnly&&<button className="button ghost" onClick={workspace.keepDraft} disabled={workspace.busy}>Giữ thay đổi trên máy</button>}<button className="button primary" onClick={() => void saveData()} disabled={workspace.busy||!!repository.readOnly} title={repository.readOnly?dataSaveHint:undefined}>{workspace.busy ? "Đang lưu…" : repository.readOnly?(isFirebase?"Chỉ giữ thay đổi thử trên máy":"Chưa thể lưu vào Excel"):isFirebase?"Thử lưu lại vào Firebase":isDemo?"Lưu vào dữ liệu mẫu":"Lưu dữ liệu vào Excel"}</button></div></div>}
      {page === 'overview' && <>
        <div className="kpi-grid">{[['Đang trình', kpis.total, `${kpis.nq} nghị quyết · ${kpis.bc} báo cáo`], ['Sở chưa trình', kpis.pending, 'Chờ hồ sơ từ đơn vị'], ['VP đang thực hiện', kpis.doing, 'Đang xử lý và hoàn thiện'], ['Đã hoàn thành', kpis.completed, 'Trạng thái hoàn thành đã xác nhận']].map(([label, value, note]) => <article className="kpi-card" key={String(label)}><span>{label}</span><strong className="kpi-value">{value}</strong><span className="kpi-note">{note}</span></article>)}</div>
        
        <div className="toolbar"><label className="field">Phân nhóm theo<select value={group} onChange={e => setGroup(e.target.value as GroupField)}>{GROUP_OPTIONS.map(option => <option value={option.key} key={option.key}>{option.label}</option>)}</select></label><span className="muted">Bấm vào số lượng để xem nội dung. Rút/lưu trữ được loại khỏi báo cáo.</span></div>
        {reports.map(config => <MemoReportTable key={config.id} items={workspace.items} config={config} group={group} groupOrder={catalog.options[group]} sourceLabel={sourceLabel} onSelect={showReportDetails} />)}
        {!reports.length && <p className="empty">Các bảng báo cáo đang được ẩn. Mở ⚙ Cài đặt → Chỉnh sửa → Bảng thống kê để hiển thị lại.</p>}
      </>}
      {page === 'customize' && <ReportSettings storageLabel={isFirebase?'Firebase':'Google Sheets'} key={sourceKey} sourceKey={sourceKey} initial={layout} items={workspace.items} group={group} groupOrder={catalog.options[group]} sourceLabel={sourceLabel} onSave={saveLayout} onDirtyChange={setEditorUnsaved} onPreviewWidthChange={setReportWidthPreview} exitRequest={editorExitRequest} onClose={() => {setEditorUnsaved(false);setReportWidthPreview(null);setPage('overview');}} />}
      {page === 'catalogs'&&<CatalogSettings storageLabel={isFirebase?'Firebase':'Google Sheets'} key={`${sourceKey}:${catalogField??'default'}`} initialField={catalogField} columnLabels={Object.fromEntries(itemLayout.columns.map(column=>[column.key,column.label]))} sourceKey={sourceKey} items={workspace.items} config={catalog} onSave={saveCatalogConfig} onDirtyChange={setEditorUnsaved} exitRequest={editorExitRequest} onClose={()=>{setEditorUnsaved(false);setPage('overview');}}/>}
      {(page === 'items' || page === 'items-customize' || page==='items-permissions') && <ItemList key={`${sourceKey}:${page}`} statusPaletteStore={statusPaletteStore} onStatusPaletteChange={canCustomize?updateStatusPaletteStore:undefined} permissionModeOnly={false} externalSectionTabs={true} onPersistCatalog={saveCatalogConfig} canEditDraft={canEditDraft&&!workspace.protectedRecovery&&(!isFirebase||firebase!.isAdmin||!firebase!.editingLocked)} saveDataHint={dataSaveHint} onKeepDraft={workspace.keepDraft} sourceLabel={sourceLabel} draftOnly={isFirebase&&!isDemo} layoutSaveLabel={privateTest||!isDemo&&!isFirebase&&!isGoogleHost()?'Lưu cách hiển thị trên máy':'Lưu cách hiển thị chung'} sourceKey={sourceKey} initialLayout={itemLayout} onPersistLayout={saveItemLayoutConfig} 
        onPersistViewerLayout={isFirebase&&!!firebase?.isAdmin&&!!firebase.profile&&common.status==='ready'&&firebase.connected
          ?async(next,baseline)=>{firebaseEditRevision.current=firebase.profile?.revision??0;
            return saveItemLayoutConfig(next,baseline);}
          :undefined} catalog={catalog} items={workspace.workingItems} drafts={workspace.drafts} errors={workspace.errors} dataSaving={isFirebase&&workspace.busy} onFrameWidthChange={setListFramePreview} anonymousViewer={anonymousVisitor} permissions={isFirebase&&firebase!.isAdmin?firebase!.permissions:undefined} onSavePermissions={isFirebase&&firebase!.isAdmin?firebase!.savePermissions:undefined} onReloadPermissions={isFirebase&&firebase!.isAdmin?firebase!.refreshPermissions:undefined} canEditCell={isFirebase?(id,field)=>firebase!.canEdit(id,field) &&
        (page!=='items'||mayEdit(firebase!.permissions,id,field,false)):undefined} allowLayout={isFirebase?canCustomize:true} busy={workspace.busy||common.busy} onUpdate={updateDataDraft} onHistory={(item)=>setHistory({item})}
        onCellHistory={(item,field)=>setHistory({item,field})} readOnly={!!repository.readOnly} sourceKind={repository.sourceKind} customizing={page === 'items-customize'||page==='items-permissions'} onClose={()=>{setEditorUnsaved(false);setListFramePreview(null);setPage('items');}} onDirtyChange={setEditorUnsaved} exitRequest={editorExitRequest} onSaveData={saveData} onDiscardData={workspace.discard} onLayoutSaved={setLayoutMessage} />}
      {page==='review'&&isFirebase&&firebase!.isAdmin&&<ApprovalReviewPanel source={configured} items={workspace.items} loadedAt={workspace.loadedAt} hasDrafts={dirtyCount>0||workspace.protectedRecovery} firebase={firebase!} onClose={()=>setPage('overview')}/>}
       {page==='sync'&&!isFirebase&&<SyncPanel source={configured} profile={{catalogs:catalog,reports:layout,items:itemLayout}} config={googleCommon.config} isHost={isGoogleHost()} busy={common.busy} onSave={async profile=>{await common.save('all',profile);}} onRefresh={()=>common.refresh(true)} onClose={()=>setPage('overview')}/>}
      {(page==='source'||page === 'connection' && !isFirebase) && <>{dirtyCount > 0 && <p className="notice">Lưu hoặc bỏ phần sửa trên máy trước khi đổi file nguồn.</p>}<ConnectionPanel onClose={()=>setPage('overview')} key={configured.url} initial={configured} onTest={testConnection} onConnect={connect} onDemo={() => { setRepository(new MockRepository(readWorkspaceRecovery('demo')?.items ?? createDemoItems())); setHistory(null); setSelection(null); }} disabled={workspace.busy || dirtyCount > 0} isDemo={isDemo} allowDemo={!isFirebase} /></>}
      {page==='connection'&&isFirebase&&<FirebasePanel dataSource={firebase!.profile?.dataSource??'excel'} onChangeDataSource={changeDataSource} userLabel={firebase!.user?.isAnonymous?`Khách ẩn danh · ${firebase!.user.uid.slice(0,8)}`:firebase!.user?.email??''} isAdmin={firebase!.isAdmin} connected={firebase!.connected} permissions={firebase!.permissions} items={workspace.items} busy={workspace.busy||common.busy} onLogin={firebase!.login} onLogout={firebase!.logout} onSavePermissions={firebase!.savePermissions} onOpenItemsCustomize={()=>{firebaseEditRevision.current=firebase!.profile?.revision??0;setPage('items-customize');}} onClose={()=>setPage('overview')}/>}
      {page==='transfer'&&isFirebase&&TransferPanel&&<TransferPanel items={workspace.items} isAdmin={firebase!.isAdmin} profile={{catalogs:catalog,reports:layout,items:itemLayout}} onSaveProfile={async value=>{await firebase!.common.save('all',value,firebaseEditRevision.current);firebaseEditRevision.current++;}} disabled={workspace.busy||dirtyCount>0||!firebase!.connected} importEnabled={false} onImport={async()=>{throw new Error('Nhập dữ liệu chỉ mở khi có quyết định chuyển đổi chính thức.');}} onClose={()=>setPage('overview')}/>}
      </>}
    </main>
    {selection && <ReportDetailGrid key={sourceKey} title={selection.title}
      statusPaletteStore={statusPaletteStore} onStatusPaletteChange={canCustomize?updateStatusPaletteStore:undefined}
      selectedIds={selection.items.map(item=>item.recordId)}
      items={workspace.workingItems} sourceKey={sourceKey} catalog={catalog} listLayout={itemLayout}
      allowDraft={canEditDraft&&!workspace.protectedRecovery&&(!firebase||firebase.isAdmin||!firebase.editingLocked)}
      readOnlyViewer={isFirebase&&!firebase!.isAdmin}
      canEditCell={(id,field)=>!firebase||firebase.canEdit(id,field)&&mayEdit(firebase.permissions,id,field,false)}
      onUpdate={updateDataDraft} onKeepDraft={workspace.keepDraft}
      onHistory={anonymousVisitor?undefined:(item)=>setHistory({item})}
      onCellHistory={anonymousVisitor?undefined:(item,field)=>setHistory({item,field})}
      onOpenFullList={()=>{setSelection(null);setPage('items');}}
      dirtyIds={new Set(Object.keys(workspace.drafts))} errors={workspace.errors}
      onClose={()=>setSelection(null)}/>}
    {history && <HistoryDialog item={history.item} field={history.field} repository={repository} onClose={() => setHistory(null)} />}
    {confirmDiscard && <Modal title="Bỏ các thay đổi chưa lưu vào file nguồn?" onClose={() => setConfirmDiscard(false)}><div className="modal-body"><p>Phần chưa lưu của {workspace.protectedRecovery?'phần sửa cũ trên máy':`${dirtyCount} nội dung`} sẽ được bỏ. Dữ liệu trong file nguồn không bị thay đổi.</p></div><div className="modal-footer"><button className="button ghost" onClick={() => setConfirmDiscard(false)}>Tiếp tục sửa</button><button className="button danger" onClick={() => { workspace.discard(); setConfirmDiscard(false); }}>Bỏ các thay đổi</button></div></Modal>}
    <footer className="app-footer">{anonymousVisitor?'Nội dung trình HĐND · Dữ liệu tự cập nhật':'Dashboard HĐND · Một file HTML · '+sourceLabel}</footer>
  </div>;
}




