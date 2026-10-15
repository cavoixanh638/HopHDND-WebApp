import { useEffect,useMemo, useRef, useState } from 'react';
import type { Changes, EditableField, GroupField, Item } from '../../shared/types';
import { GROUP_OPTIONS } from '../../shared/field-definitions';
import { MockRepository } from '../data/mock-repository';
import { createDemoItems } from '../data/demo-items';
import { useWorkspace } from '../state/use-workspace';
import { getKpis } from '../domain/reporting';
import { ReportTable } from '../features/reports/ReportTable';
import { ItemList } from '../features/items/ItemList';
import { HistoryDialog } from '../features/history/HistoryDialog';
import { Modal } from '../components/Modal';
import type { Repository } from '../data/repository';
import { SheetsRepository, readSheet } from '../data/sheets-repository';
import { ExcelRepository } from '../data/excel-repository';
import { DEFAULT_SHEET_URL, clearSheetConfig, loadSheetConfig, parseSheetConfig, saveSheetConfig, type SheetConfig } from '../data/sheet-config';
import { ConnectionPanel } from '../features/settings/ConnectionPanel';
import { configuredReports, loadReportLayout, saveReportLayout, type ReportLayout } from '../data/report-preferences';
import { ReportSettings } from '../features/settings/ReportSettings';
import { CatalogSettings } from '../features/catalogs/CatalogSettings';
import { assignmentIssue, loadCatalog, saveCatalog, mergeCatalogItems,type CatalogConfig } from '../data/catalogs';
import {loadItemLayout,saveItemLayout,type ItemLayout} from '../data/item-preferences';
import {useSharedConfig} from '../state/use-shared-config';
import {googleCall,isGoogleHost} from '../data/google-bridge';
import {CONFIG_EDITOR_URL} from '../data/shared-store';
import {SyncPanel} from '../features/settings/SyncPanel';
import { readWorkspaceRecovery } from '../data/workspace-recovery';
import { displayId } from '../domain/display-id';
import type {FirebaseController} from '../state/use-firebase';
import {FirebasePanel} from '../features/settings/FirebasePanel';

type Page = 'overview' | 'items' | 'connection' | 'source' | 'help' | 'customize' | 'items-customize' | 'catalogs'|'sync'|'transfer';
declare global {interface Window {HDND_SOURCE?:string;HDND_EXCEL_ENABLED?:boolean;HDND_TEST?:boolean}}
const connectedRepository=(config:SheetConfig):Repository=>isGoogleHost()&&window.HDND_EXCEL_ENABLED===true&&window.HDND_SOURCE===config.url?new ExcelRepository(config):new SheetsRepository(config);

export function App({firebase,TransferPanel}:{firebase?:FirebaseController;TransferPanel?:typeof import('../features/settings/ExcelTransferPanel').ExcelTransferPanel}={}) {
  const [configured, setConfigured] = useState(() => window.HDND_SOURCE?parseSheetConfig(window.HDND_SOURCE):loadSheetConfig() ?? parseSheetConfig(DEFAULT_SHEET_URL));
  const [repository, setRepository] = useState<Repository>(() => firebase?new SheetsRepository(configured):connectedRepository(configured));
  const isDemo = repository.sourceKind==='demo';
  // Administration is independent of the content repository.
  const isFirebase=!!firebase;
  const firebaseEditRevision=useRef(0);
  const privateTest=window.HDND_TEST===true;
  const [storageHint, setStorageHint] = useState('');
  const sourceKey = isDemo?'demo':isFirebase?`pages:sheets:${configured.url}`:configured.url;
  const workspace = useWorkspace(repository, sourceKey);
  const [page, setPage] = useState<Page>('overview');
  const [group, setGroup] = useState<GroupField>('vpLeader');
  const [selection, setSelection] = useState<{ title: string; items: Item[] } | null>(null);
  const [history, setHistory] = useState<Item | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const editingPage = page === 'customize' || page === 'items-customize' || page === 'catalogs' || page === 'connection'||page==='source'||page==='sync'||page==='transfer';
  const googleCommon=useSharedConfig(configured,!firebase&&!isDemo&&!privateTest,editingPage);
  const common=firebase?firebase.common:googleCommon;
  const canCustomize=isFirebase?!!firebase?.isAdmin&&common.status==='ready':isDemo||privateTest||(isGoogleHost()&&!!common.config);
  const canEditDraft=repository.canDraft??!repository.readOnly;
  const [sourceDiagnostic,setSourceDiagnostic]=useState('');
  const [viewerLabel,setViewerLabel]=useState('');
  useEffect(()=>{let active=true;setSourceDiagnostic('');setViewerLabel('');if(!isDemo&&isGoogleHost())void googleCall('getDashboardSourceStatus',configured).then(value=>{const v=value as {reason?:unknown;actorLabel?:unknown};if(active&&typeof v?.reason==='string')setSourceDiagnostic(v.reason);if(active&&typeof v?.actorLabel==='string')setViewerLabel(v.actorLabel);}).catch(()=>{});return()=>{active=false;};},[configured.url,isDemo]);
  const dataSaveHint=isFirebase?'Google Sheets là nguồn chính. Sửa ô được cấp quyền chỉ để thử trên trình duyệt; không ghi Google Sheets hoặc Firebase. Nội dung/Ghi chú cần bấm Áp dụng trong popup.':isDemo?'Dữ liệu mẫu: lưu chỉ giữ trong phiên thử.':(sourceDiagnostic||(repository.readOnly?'Chưa bật lưu vào file Excel nguồn. Thay đổi bạn sửa chỉ giữ trên trình duyệt này; file nguồn chưa được cập nhật.':'Lưu dữ liệu vào Excel có chiều app → file nguồn; chỉ báo thành công sau khi đọc lại xác nhận.'));
  const editorUrl=googleCommon.config?.editorUrl||(configured.url===DEFAULT_SHEET_URL?CONFIG_EDITOR_URL:'');
  const storedCatalog = useMemo(()=>loadCatalog(sourceKey,workspace.items),[sourceKey,workspace.items]);
  const [catalogState,setCatalogState]=useState<{source:string;config:CatalogConfig}|null>(null);
  const catalog=useMemo(()=>common.config&&!isDemo?mergeCatalogItems(common.config.catalogs,workspace.items):catalogState?.source===sourceKey?catalogState.config:storedCatalog,[common.config,isDemo,workspace.items,catalogState,sourceKey,storedCatalog]);
  const saveCatalogConfig=async(next:CatalogConfig)=>{if(isFirebase){if(!canCustomize)throw new Error('Chỉ quản trị được lưu cấu hình chung.');await firebase!.common.save('all',{catalogs:next,reports:layout,items:itemLayout},firebaseEditRevision.current);firebaseEditRevision.current=firebaseEditRevision.current+1;setLayoutMessage('Đã lưu danh mục và quan hệ vào Firebase.');return;}if(!isDemo&&!privateTest){await common.save('catalogs',next);setLayoutMessage('Đã lưu danh mục và quan hệ vào Google Sheets riêng. Nội dung Excel chưa thay đổi.');}else{if(!saveCatalog(sourceKey,next))throw new Error('Không lưu được danh mục trên máy. Nháp được giữ.');setCatalogState({source:sourceKey,config:next});setLayoutMessage('Đã lưu danh mục thử trên máy.');}};
  const saveData = async () => { const issue = workspace.workingItems.filter(item => {const changes=workspace.drafts[item.recordId]?.changes;return changes&&('specialist' in changes||'room' in changes);}).map(item => assignmentIssue(item,catalog)).find(Boolean); if(issue){setLayoutMessage(issue);return false;} return workspace.save(); };
  const updateDataDraft=(id:string,changes:Changes)=>{
    if(firebase&&Object.keys(changes).some(field=>!firebase.canEdit(id,field as EditableField))){setLayoutMessage('Ô này chưa được cấp quyền sửa.');return;}
    workspace.update(id,changes);
  };
  const storedLayout = useMemo(() => loadReportLayout(sourceKey), [sourceKey]);
  const [layoutState, setLayoutState] = useState<{ source: string; layout: ReportLayout[] } | null>(null);
  const layout = common.config&&!isDemo?common.config.reports:layoutState?.source === sourceKey ? layoutState.layout : storedLayout;
  const storedItems=useMemo(()=>loadItemLayout(sourceKey),[sourceKey]);
  const [itemState,setItemState]=useState<{source:string;layout:ItemLayout}|null>(null);
  const itemLayout=common.config&&!isDemo?common.config.items:itemState?.source===sourceKey?itemState.layout:storedItems;
  const saveItemLayoutConfig=async(next:ItemLayout)=>{if(isFirebase){if(!canCustomize)throw new Error('Chỉ quản trị được lưu cấu hình chung.');await firebase!.common.save('all',{catalogs:catalog,reports:layout,items:next},firebaseEditRevision.current);firebaseEditRevision.current=firebaseEditRevision.current+1;setLayoutMessage('Đã lưu bố trí danh sách vào Firebase.');return;}if(!isDemo&&!privateTest&&isGoogleHost()){await common.save('items',next);setLayoutMessage('Đã lưu khung, thứ tự và độ rộng cột vào Google Sheets riêng. Nội dung Excel chưa thay đổi.');}else{if(!saveItemLayout(sourceKey,next))throw new Error('Không lưu được bố trí trên máy. Nháp được giữ.');setItemState({source:sourceKey,layout:next});setLayoutMessage('Đã lưu bố trí trên máy này; chưa đồng bộ bố trí lên kho chung.');}};
  const reports = useMemo(() => configuredReports(layout), [layout]);
  const [layoutMessage, setLayoutMessage] = useState('');
  const saveLayout = async(next: ReportLayout[]) => {
    if(isFirebase){if(!canCustomize)throw new Error('Chỉ quản trị được lưu cấu hình chung.');await firebase!.common.save('all',{catalogs:catalog,reports:next,items:itemLayout},firebaseEditRevision.current);firebaseEditRevision.current=firebaseEditRevision.current+1;setLayoutMessage('Đã lưu bố trí báo cáo vào Firebase.');return;}
    if(!isDemo&&!privateTest){await common.save('reports',next);setLayoutMessage('Đã lưu bố trí báo cáo vào Google Sheets riêng. Nội dung Excel chưa thay đổi.');}
    else{if(!saveReportLayout(sourceKey,next))throw new Error('Không lưu được bố trí trên máy. Nháp được giữ.');setLayoutState({source:sourceKey,layout:next});setLayoutMessage('Đã lưu bố trí mẫu trên máy.');}
  };
  const openOptions = (next: Page, event: { currentTarget: HTMLElement }) => {
    event.currentTarget.closest('details')?.removeAttribute('open');
    if(['customize','catalogs'].includes(next)&&!canCustomize){setLayoutMessage(isFirebase?'Cần đăng nhập Google quản trị và đọc được cấu hình chung.':'Chờ cấu hình chung tải xong hoặc mở trình chỉnh chung trên Google.');return;}
    if(isFirebase){firebaseEditRevision.current=firebase!.profile?.revision??0;}
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
  const sourceLabel = isDemo?'Dữ liệu mẫu':isFirebase?'Google Sheets':'Nguồn Excel';
  return <div className={`app-shell ${page === "items" || page === "items-customize" ? "wide-table-page" : ""}`}>
    {privateTest&&<p className="notice" role="status"><strong>BẢN THỬ · Bản sao Excel</strong> · Nút lưu chỉ ghi bản sao thử, không ghi file nhập liệu thật. Danh mục và bố trí của bản thử giữ trên máy.</p>}<header className="topbar"><div className="brand"><div className="brand-mark">HĐ</div><div className="brand-text"><strong>Nội dung trình HĐND</strong><span>Danh mục · Phân công · Tiến độ</span></div></div><div className="top-actions"><span className="version">Bản {isFirebase?'0.7.0 · Sửa 16/10':'0.6.2'}</span><button className="button ghost" disabled={workspace.busy||common.busy} onClick={() => { void workspace.refresh(); void common.refresh(); }}>{isFirebase?'Đọc lại dữ liệu Sheets và cấu hình':'Đọc lại dữ liệu và danh mục từ Google'}</button>{!editingPage && <details className="options-menu"><summary aria-label="Tùy chọn" title="Tùy chọn">⚙</summary><div className="options-popover"><button disabled={!canCustomize} onClick={event => openOptions('customize', event)}>Vào chế độ tùy chỉnh bảng báo cáo</button><button disabled={workspace.busy} onClick={event => openOptions('items-customize', event)}>Vào chế độ tùy chỉnh danh sách</button><button disabled={workspace.busy||!canCustomize} onClick={event => openOptions('catalogs', event)}>Danh mục và quan hệ chuyên viên – phòng</button><button onClick={event => openOptions('connection', event)}>{isFirebase?'Tài khoản Firebase':'Kết nối dữ liệu'}</button>{isFirebase&&<><button onClick={event=>openOptions('source',event)}>Kết nối dữ liệu Google Sheets</button><button onClick={event=>openOptions('transfer',event)}>Nhập / Xuất Excel</button></>}{!isFirebase&&<button disabled={isDemo||privateTest} onClick={event=>openOptions('sync',event)}>Danh mục và bố trí dùng chung</button>}</div></details>}</div></header>
    <div className="demo-banner"><strong>{sourceLabel}</strong>{isDemo ? ' · Lưu chỉ giữ trong phiên thử; mở lại app sẽ dùng nguồn Sheets đã chọn.' : <> · Làm mới mỗi 60 giây khi trang đang hoạt động. Cập nhật nội dung trong <a href={configured.url} target="_blank" rel="noopener noreferrer">{isFirebase?'Google Sheets nguồn':'file Excel nguồn'}</a>.</>} {isFirebase && <> · GID <code>{configured.gid}</code> · <button type="button" className="button ghost" disabled={workspace.busy || dirtyCount > 0} onClick={() => {const original=parseSheetConfig(DEFAULT_SHEET_URL);clearSheetConfig();setConfigured(original);setRepository(new SheetsRepository(original));setLayoutMessage('Đã chọn lại nguồn mặc định của ứng dụng; đang tải lại dữ liệu.');}}>Dùng lại nguồn mặc định</button></>}</div>
    {isFirebase&&<p className="muted">{firebase!.user?.isAnonymous?'Khách ẩn danh':firebase!.user?.email}{firebase!.isAdmin?' · Quản trị':''}{firebase!.emulator?' · KIỂM THỬ LOCAL, KHÔNG DÙNG FIREBASE THẬT':''}</p>}{viewerLabel&&<p className="muted">Đang dùng tài khoản Google: {viewerLabel}</p>}<nav className="nav-tabs" aria-label="Điều hướng">{([['overview', 'Tổng quan'], ['items', 'Danh sách nội dung'], ['help', 'Hướng dẫn']] as const).map(([key, title]) => <button disabled={editingPage} className={page === key ? 'active' : ''} aria-current={page === key ? 'page' : undefined} key={key} onClick={() => setPage(key)}>{title}</button>)}</nav>
    <main>
      <div className="page-heading"><div><p className="eyebrow">TỔNG HỢP NỘI DUNG TRÌNH</p><h1>{page==='sync'?'Danh mục và bố trí dùng chung':page === 'overview' ? 'Theo dõi tiến độ' : page === 'items' ? 'Danh sách làm việc' : page==='source'?'Nguồn dữ liệu Google Sheets':page === 'connection' ? (isFirebase?'Tài khoản Firebase':'Nguồn dữ liệu') : page==='transfer'?'Nhập / Xuất Excel' : page === 'customize' ? 'Tùy chỉnh bảng báo cáo' : page === 'catalogs' ? 'Danh mục và phân công' : page === 'items-customize' ? 'Tùy chỉnh danh sách' : 'Hướng dẫn sử dụng'}</h1></div><span className="muted">{workspace.busy ? 'Đang đọc dữ liệu…' : workspace.loadedAt ? `Đọc thành công: ${workspace.loadedAt}` : 'Chưa đọc được dữ liệu'}</span></div>
      {!isDemo&&!privateTest&&<p className="notice" role="status">Danh mục và bố trí: {common.message}{common.status==='error'&&<button className="button ghost" disabled={common.busy} onClick={()=>void common.refresh()}>Đọc lại danh mục và bố trí</button>}{!isFirebase&&!isGoogleHost()&&editorUrl&&<> · <a href={editorUrl} target="_blank" rel="noreferrer">Mở trang chỉnh danh mục và bố trí trên Google</a></>}{!isFirebase&&!isGoogleHost()&&<> · Tệp HTML cho sửa tạm và lưu bố trí trên máy; lưu danh mục và bố trí dùng chung tại trang Google.</>}</p>}{workspace.message && <p className="notice" role="alert">{workspace.message}</p>}
      {storageHint && <p className="notice" role="status">{storageHint}</p>}
      {workspace.protectedRecovery&&<p className="notice">Có thay đổi trên máy chưa khớp dữ liệu nguồn hiện tại. <button className="button ghost" onClick={()=>{const bundle=readWorkspaceRecovery(sourceKey);if(!bundle)return;const blob=new Blob([JSON.stringify({schemaVersion:1,source:configured,bundle},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='HDND_nhap_can_doi_chieu.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>Tải phần sửa trên máy để đối chiếu</button><button className="button danger" onClick={discard}>Bỏ phần sửa cũ trên máy</button></p>}
      {workspace.autosaveMessage && <p className="muted" role="status">{workspace.autosaveMessage}</p>}{layoutMessage && <p className="notice" role="status">{layoutMessage}</p>}
      {warnings.length > 0 && <details className="notice"><summary>{warnings.length} cảnh báo về dữ liệu nguồn</summary><ul>{warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></details>}
      {dirtyCount > 0 && <div className="draft-bar"><div><strong>{dirtyCount} nội dung đã sửa, chưa lưu vào {isDemo?"dữ liệu mẫu":"file nguồn"}</strong><span> Phần sửa đang giữ trên trình duyệt này; báo cáo vẫn dùng dữ liệu từ nguồn.</span></div><div className="top-actions"><button className="button ghost" onClick={discard} disabled={workspace.busy}>Bỏ các thay đổi</button>{repository.readOnly&&<button className="button ghost" onClick={workspace.keepDraft} disabled={workspace.busy}>Giữ thay đổi trên máy</button>}<button className="button primary" onClick={() => void saveData()} disabled={workspace.busy||!!repository.readOnly} title={repository.readOnly?dataSaveHint:undefined}>{workspace.busy ? "Đang lưu…" : repository.readOnly?(isFirebase?"Chỉ giữ thay đổi thử trên máy":"Chưa thể lưu vào Excel"):isFirebase?"Thử lưu lại vào Firebase":isDemo?"Lưu vào dữ liệu mẫu":"Lưu dữ liệu vào Excel"}</button></div></div>}
      {page === 'overview' && <>
        <div className="kpi-grid">{[['Đang trình', kpis.total, `${kpis.nq} nghị quyết · ${kpis.bc} báo cáo`], ['Sở chưa trình', kpis.pending, 'Chờ hồ sơ từ đơn vị'], ['VP đang thực hiện', kpis.doing, 'Đang xử lý và hoàn thiện'], ['Đã hoàn thành', kpis.completed, 'Trạng thái hoàn thành đã xác nhận']].map(([label, value, note]) => <article className="kpi-card" key={String(label)}><span>{label}</span><strong className="kpi-value">{value}</strong><span className="kpi-note">{note}</span></article>)}</div>
        {kpis.unclassified > 0 && <p className="unknown-note">Có {kpis.unclassified} nội dung chưa phân loại NQ/BC. Vẫn có trong tổng và danh sách; chưa đưa vào hai bảng theo loại.</p>}
        <div className="toolbar"><label className="field">Phân nhóm theo<select value={group} onChange={e => setGroup(e.target.value as GroupField)}>{GROUP_OPTIONS.map(option => <option value={option.key} key={option.key}>{option.label}</option>)}</select></label><span className="muted">Bấm vào số lượng để xem nội dung. Rút/lưu trữ được loại khỏi báo cáo.</span></div>
        {reports.map(config => <ReportTable key={config.id} items={workspace.items} config={config} group={group} groupOrder={catalog.options[group]} sourceLabel={sourceLabel} onSelect={(title, items) => setSelection({ title, items })} />)}
        {!reports.length && <p className="empty">Các bảng báo cáo đang được ẩn. Mở ⚙ Tùy chọn → chế độ tùy chỉnh bảng báo cáo để hiển thị lại.</p>}
      </>}
      {page === 'customize' && <ReportSettings storageLabel={isFirebase?'Firebase':'Google Sheets'} key={sourceKey} sourceKey={sourceKey} initial={layout} items={workspace.items} group={group} groupOrder={catalog.options[group]} sourceLabel={sourceLabel} onSave={saveLayout} onClose={() => setPage('overview')} />}
      {page === 'catalogs'&&<CatalogSettings storageLabel={isFirebase?'Firebase':'Google Sheets'} key={sourceKey} sourceKey={sourceKey} items={workspace.items} config={catalog} onSave={saveCatalogConfig} onClose={()=>setPage('overview')}/>}
      {(page === 'items' || page === 'items-customize') && <ItemList key={`${sourceKey}:${page}`} canEditDraft={canEditDraft&&!workspace.protectedRecovery} saveDataHint={dataSaveHint} onKeepDraft={workspace.keepDraft} sourceLabel={sourceLabel} draftOnly={isFirebase&&!isDemo} layoutSaveLabel={privateTest||!isDemo&&!isFirebase&&!isGoogleHost()?'Lưu bố trí trên máy':'Lưu bố trí dùng chung'} sourceKey={sourceKey} initialLayout={itemLayout} onPersistLayout={saveItemLayoutConfig} catalog={catalog} items={workspace.workingItems} drafts={workspace.drafts} errors={workspace.errors} dataSaving={isFirebase&&workspace.busy} permissions={isFirebase&&firebase!.isAdmin?firebase!.permissions:undefined} onSavePermissions={isFirebase&&firebase!.isAdmin?firebase!.savePermissions:undefined} canEditCell={isFirebase?firebase!.canEdit:undefined} allowLayout={isFirebase?canCustomize:true} busy={workspace.busy||common.busy} onUpdate={updateDataDraft} onHistory={setHistory} readOnly={!!repository.readOnly} sourceKind={repository.sourceKind} customizing={page === 'items-customize'} onClose={()=>setPage('items')} onSaveData={saveData} onDiscardData={workspace.discard} onLayoutSaved={setLayoutMessage} />}
      {page==='sync'&&!isFirebase&&<SyncPanel source={configured} profile={{catalogs:catalog,reports:layout,items:itemLayout}} config={googleCommon.config} isHost={isGoogleHost()} busy={common.busy} onSave={async profile=>{await common.save('all',profile);}} onRefresh={()=>common.refresh(true)} onClose={()=>setPage('overview')}/>}
      {(page==='source'||page === 'connection' && !isFirebase) && <>{dirtyCount > 0 && <p className="notice">Lưu hoặc bỏ phần sửa trên máy trước khi đổi file nguồn.</p>}<ConnectionPanel onClose={()=>setPage('overview')} key={configured.url} initial={configured} onTest={testConnection} onConnect={connect} onDemo={() => { setRepository(new MockRepository(readWorkspaceRecovery('demo')?.items ?? createDemoItems())); setHistory(null); setSelection(null); }} disabled={workspace.busy || dirtyCount > 0} isDemo={isDemo} allowDemo={!isFirebase} /></>}
      {page==='connection'&&isFirebase&&<FirebasePanel userLabel={firebase!.user?.isAnonymous?`Khách ẩn danh · ${firebase!.user.uid.slice(0,8)}`:firebase!.user?.email??''} isAdmin={firebase!.isAdmin} connected={firebase!.connected} permissions={firebase!.permissions} items={workspace.items} busy={workspace.busy||common.busy} onLogin={firebase!.login} onLogout={firebase!.logout} onSavePermissions={firebase!.savePermissions} onOpenItemsCustomize={()=>{firebaseEditRevision.current=firebase!.profile?.revision??0;setPage('items-customize');}} onClose={()=>setPage('overview')}/>}
      {page==='transfer'&&isFirebase&&TransferPanel&&<TransferPanel items={workspace.items} isAdmin={firebase!.isAdmin} profile={{catalogs:catalog,reports:layout,items:itemLayout}} onSaveProfile={async value=>{await firebase!.common.save('all',value,firebaseEditRevision.current);firebaseEditRevision.current++;}} disabled={workspace.busy||dirtyCount>0||!firebase!.connected} importEnabled={false} onImport={async()=>{throw new Error('Nhập dữ liệu chỉ mở khi có quyết định chuyển đổi chính thức.');}} onClose={()=>setPage('overview')}/>}
      {page==='help'&&isFirebase&&<section className="card"><h3>Sử dụng HopHDND 0.7.0</h3><p>Google Sheets là nguồn dữ liệu chính. Nhập và sửa dữ liệu tại Sheets; app đọc lại mỗi 60 giây khi tab hiển thị hoặc khi bấm Đọc lại. Nếu có nháp, app giữ nháp và chờ bạn bỏ phần sửa trước khi đọc lại.</p><p>Khách được xem, tìm kiếm, lọc và sửa thử những ô đã cấp quyền. Áp dụng trong popup chỉ đổi nháp trên trình duyệt, không ghi Google Sheets hoặc Firebase. Giữ thay đổi trên máy để đối chiếu; báo cáo và xuất Excel lấy bản đã đọc từ Sheets.</p><p>Quản trị đăng nhập Google trong Tài khoản và quyền chỉnh sửa. Chỉ cavoixanh638@gmail.com được lưu quyền ô/cột/dòng, danh mục và bố trí chung vào Firebase. Nhập dữ liệu Excel đang khóa, chờ quyết định chuyển đổi chính thức. Bảng cần quyền đọc GViz; đăng nhập quản trị không cấp quyền đọc Sheets riêng tư.</p></section>}
      {page === 'help' && !isFirebase && <div className="help-grid"><section className="card"><h3>Chọn nguồn dữ liệu</h3><ol><li>Mở ⚙ Tùy chọn → Kết nối dữ liệu, dán link Google Sheets.</li><li>Chọn gid đúng trang tính nếu bảng có nhiều tab. Nguồn mặc định dùng gid 60961344 như app cũ.</li><li>Bấm Kiểm tra kết nối hoặc Kết nối và tải dữ liệu.</li><li>Link được lưu trên trình duyệt khi trình duyệt cho phép. Muốn người khác dùng link mới, họ cần nhập link đó trên bản app của mình.</li></ol></section><section className="card"><h3>Đọc và cập nhật</h3><p>App đọc A–P theo cấu trúc hiện tại. Khi bộ ghi được kết nối trên trang Google, Lưu dữ liệu vào Excel gửi phần sửa từ app vào file nguồn và đọc lại để xác nhận. File HTML chưa kết nối bộ ghi chỉ giữ phần sửa trên máy. Bấm Đọc lại dữ liệu và danh mục từ Google để lấy dữ liệu từ Google vào app; không ghi ngược vào file.</p><p>Bảng cần quyền đọc qua GViz; app chưa có OAuth cho nguồn riêng tư. Lỗi đọc giữ bản trước và báo thời điểm đọc thành công gần nhất.</p><p>Link Excel nhập liệu được giữ nguyên. Danh mục, quan hệ chuyên viên – phòng, tên/thứ tự/ẩn cột và độ rộng được lưu trong Google Sheets riêng “Dashboard HĐND - Cấu hình dùng chung”. Đọc lại danh mục và bố trí lấy thiết lập từ kho này về app, không đọc hay ghi nội dung các dòng Excel.</p></section><section className="card"><h3>Tùy chỉnh và dữ liệu mẫu</h3><p>Mặc định chỉ xem. Mở ⚙ Tùy chọn để vào chế độ tùy chỉnh bảng hoặc danh sách. Đổi tên, thứ tự, ẩn/hiện bảng rồi Lưu; dữ liệu mẫu giữ cấu hình trên máy; nguồn thật cần mở trình chỉnh chung để lưu lên Google. Khi thoát có Lưu, Không lưu hoặc Tiếp tục sửa. Phần sửa chưa ghi file được giữ trên trình duyệt mỗi 10 giây, chỉ phục hồi khi dữ liệu gốc còn khớp. Danh mục và quan hệ chuyên viên – phòng mở từ cùng nhóm Tùy chọn.</p><p>Áp dụng vào bảng chỉ đưa nội dung popup vào phần sửa đang giữ trên máy. Lưu dữ liệu vào Excel có chiều app → Excel. Khi chưa kết nối bộ ghi, nút Chưa thể lưu vào Excel báo rõ trạng thái đó. Giữ thay đổi trên máy không cập nhật file.</p><p>Cột ẩn hoặc trạng thái mới không làm thiếu tổng. Dòng thiếu/trùng mã được báo để rà soát; app không sửa bảng gốc.</p></section></div>}
    </main>
    {selection && <Modal title={selection.title} onClose={() => setSelection(null)}><div className="modal-body"><p className="muted">{selection.items.length} nội dung</p>{selection.items.map(item => <article className="detail-item" key={item.recordId}><strong className="code">{displayId(item)}</strong><p>{item.content}</p><small>{item.department} · {item.room} · {item.specialist}</small></article>)}</div></Modal>}
    {history && <HistoryDialog item={history} repository={repository} onClose={() => setHistory(null)} />}
    {confirmDiscard && <Modal title="Bỏ các thay đổi chưa lưu vào file nguồn?" onClose={() => setConfirmDiscard(false)}><div className="modal-body"><p>Phần chưa lưu của {workspace.protectedRecovery?'phần sửa cũ trên máy':`${dirtyCount} nội dung`} sẽ được bỏ. Dữ liệu trong file nguồn không bị thay đổi.</p></div><div className="modal-footer"><button className="button ghost" onClick={() => setConfirmDiscard(false)}>Tiếp tục sửa</button><button className="button danger" onClick={() => { workspace.discard(); setConfirmDiscard(false); }}>Bỏ các thay đổi</button></div></Modal>}
    <footer className="app-footer">Dashboard HĐND · Một file HTML · {sourceLabel}</footer>
  </div>;
}




