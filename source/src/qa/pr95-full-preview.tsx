/** PR95 V2 L4: purely in-memory, synthetic full-application preview.
 * Reuse baseline ItemList, ReportTable, ReportDetailGrid, InlinePermissionsTable
 * and real reporting domain. Never initialize Firebase/Google APIs here.
 */
import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import type {EditableField,GroupField,Item,TextField} from '../../shared/types';
import {TEXT_FIELDS} from '../../shared/field-definitions';
import {createDemoItems} from '../data/demo-items';
import {catalogFromItems,validateCatalog,type CatalogConfig} from '../data/catalogs';
import {defaultItemLayout,validateItemLayout,type ItemLayout} from '../data/item-preferences';
import {defaultStatusPaletteStore,statusPaletteCssVariables} from '../data/status-palettes';
import {DEFAULT_REPORTS,isActive} from '../domain/reporting';
import type {CellPermissions} from '../data/firebase-repository';
import {ItemList} from '../features/items/ItemList';
import {ReportTable} from '../features/reports/ReportTable';
import {ReportDetailGrid} from '../features/reports/ReportDetailGrid';
import {InlinePermissionsTable} from '../features/items/InlinePermissionsTable';
import {Pr95PreviewExcel} from './pr95-preview-excel';
import './pr95-full-preview.css';

type Page='items'|'reports'|'items-customize'|'permissions'|'excel'|'account'|'settings';
type AdminPage=Exclude<Page,'items'|'reports'>;
/** Pages are guarded in event handlers AND in rendering; role is synthetic only. */
export const previewCanOpenPage=(role:Role,page:Page):boolean=>
  role==='admin'||page==='items'||page==='reports';
export const PREVIEW_ADMIN_TOOLS:readonly {key:AdminPage;label:string}[]=[
  {key:'items-customize',label:'Tùy chỉnh cột và hiển thị'},
  {key:'permissions',label:'Phân quyền chỉnh sửa ô'},
  {key:'excel',label:'Excel · Nhập / Xuất'},
  {key:'account',label:'Tài khoản và dữ liệu'},
  {key:'settings',label:'Cài đặt báo cáo và màu sắc'},
];
type Role='admin'|'guest';
type Drill={title:string;ids:string[]};
const sourceKey='pr95-l4-preview-synthetic-only';
const permissionsInitial=():CellPermissions=>({columns:{},rows:{},cells:{}});
const baseLayout=():ItemLayout=>{
  const value=defaultItemLayout();
  return validateItemLayout({...value,
    compactDisplay:{...value.compactDisplay!,contentDetails:true,
      partyTogether:true,councilTogether:true,teamTogether:true,
      shortLeaders:true,shortSpecialist:true},
  });
};
/** Mirrored business precedence in a QA-only pure function.
 * This intentionally DOES NOT import the runtime Firebase adapter/SDK. */
export const previewCanEdit=(role:Role,permissions:CellPermissions,id:string,field:EditableField):boolean=>
  role==='admin'||(permissions.cells?.[id]?.[field]??permissions.rows?.[id]??permissions.columns[field])===true;
const permissionSignature=(value:CellPermissions):string=>JSON.stringify([
  ...Object.entries(value.columns??{}).map(([field,allowed])=>['c',field,allowed]),
  ...Object.entries(value.rows??{}).map(([id,allowed])=>['r',id,allowed]),
  ...Object.entries(value.cells??{}).flatMap(([id,cells])=>
    Object.entries(cells).map(([field,allowed])=>['e',id,field,allowed])),
].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
export const previewPermissionSave=(current:CellPermissions,next:CellPermissions,expected:CellPermissions):CellPermissions=>{
  if(permissionSignature(current)!==permissionSignature(expected))
    throw Error('Quyền mô phỏng đã thay đổi; đọc lại trước khi lưu.');
  return {
    columns:{...next.columns},rows:{...next.rows},
    cells:Object.fromEntries(Object.entries(next.cells??{}).map(([id,fields])=>[id,{...fields}]))
  };
};
const nav:readonly {key:'items'|'reports';label:string}[]=[
  {key:'reports',label:'Báo cáo tổng hợp'},
  {key:'items',label:'Danh sách các ND trình HĐND'},
];
export function Pr95FullPreview(){
  const [items,setItems]=useState<Item[]>(()=>createDemoItems(27));
  const [confirmedItems,setConfirmedItems]=useState<Item[]>(items);
  // Explicit URL fixture for browser QA; default preview stays guest.
  const [role,setRole]=useState<Role>(()=>typeof window!=='undefined'&&
    new URLSearchParams(window.location.search).get('preview-role')==='admin'?'admin':'guest');
  const [menuOpen,setMenuOpen]=useState(false);
  const gearZone=useRef<HTMLDivElement|null>(null);
  const [sessionScope]=useState(()=>Math.random().toString(36).slice(2));
  const [catalogOverride,setCatalogOverride]=useState<CatalogConfig|null>(null);
  const [page,setPage]=useState<Page>('items');
  const [permissions,setPermissions]=useState<CellPermissions>(permissionsInitial);
  const [layout,setLayout]=useState<ItemLayout>(baseLayout);
  const [group,setGroup]=useState<GroupField>('department');
  const [drill,setDrill]=useState<Drill|null>(null);
  const [dirtyIds,setDirtyIds]=useState<Set<string>>(new Set());
  const [notice,setNotice]=useState('');
  const [revision,setRevision]=useState(0);
  const [guestEditCount,setGuestEditCount]=useState(0);
  const [reportVariant,setReportVariant]=useState<'classic'|'compact'|'bars'>('classic');
  const catalog=useMemo(()=>catalogOverride??catalogFromItems(items),[items,catalogOverride]);
  const [palette,setPalette]=useState(defaultStatusPaletteStore);
  const configs=useMemo(()=>DEFAULT_REPORTS.map(report=>({...report,reportVariant})),[reportVariant]);
  const active=items.filter(isActive).length;
  const admin=role==='admin';
  const canEdit=(id:string,field:EditableField)=>previewCanEdit(role,permissions,id,field);
  const update=(id:string,changes:Partial<Item>)=>{
    const fields=Object.keys(changes) as EditableField[];
    if(!fields.length||fields.some(field=>!canEdit(id,field))){
      setNotice('Ô đã bị khóa theo quyền mô phỏng hiện tại; không áp dụng thay đổi.');
      return;
    }
    setItems(previous=>previous.map(item=>item.recordId===id
      ?{...item,...changes,revision:item.revision+1}:item));
    setDirtyIds(previous=>new Set([...previous,id]));
    if(!admin)setGuestEditCount(v=>v+1);
    setNotice('Đã sửa dữ liệu giả trong bộ nhớ. Tải lại trang sẽ trả về dữ liệu ban đầu.');
  };
  // Escape is handled before the list's own global filter shortcut when gear is open.
  useEffect(()=>{
    if(!menuOpen)return;
    const outside=(event:PointerEvent)=>{
      if(!gearZone.current?.contains(event.target as Node))setMenuOpen(false);
    };
    const escape=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||event.isComposing||event.defaultPrevented)return;
      event.preventDefault();event.stopPropagation();setMenuOpen(false);
      gearZone.current?.querySelector<HTMLButtonElement>('.pr95-preview-gear')?.focus();
    };
    document.addEventListener('pointerdown',outside,true);
    document.addEventListener('keydown',escape,true);
    return()=>{document.removeEventListener('pointerdown',outside,true);
      document.removeEventListener('keydown',escape,true);};
  },[menuOpen]);
  const switchRole=(next:Role)=>{
    setMenuOpen(false);setDrill(null);setRole(next);
    if(next==='guest')setPage(previous=>previewCanOpenPage('guest',previous)?previous:'items');
    setNotice('Đã chuyển sang '+(next==='admin'?'quản trị':'khách')+
      ' MÔ PHỎNG — không đăng nhập Google/Firebase; không cấp quyền thật.');
  };
  const openPage=(next:Page)=>{
    setMenuOpen(false);
    if(!previewCanOpenPage(role,next)){
      setNotice('Khách không được mở trang quản trị trong bản demo.');return;
    }
    setPage(next);setDrill(null);
  };
  const savePermissions=async(next:CellPermissions,expected:CellPermissions)=>{
    setPermissions(old=>previewPermissionSave(old,next,expected));
    setNotice('Đã cập nhật quyền giả trong RAM. Không gọi Rules hoặc Firebase.');
  };
  const saveLayout=async(next:ItemLayout)=>{
    const checked=validateItemLayout(next);setLayout(checked);return checked;
  };
  const saveCatalog=async(next:CatalogConfig)=>{setCatalogOverride(validateCatalog(next));};
  const saveRAM=async()=>{
    setConfirmedItems(items);setDirtyIds(new Set());
    setNotice('Đã xác nhận phần sửa trong RAM, không ghi lên hệ thống thật.');return true;
  };
  const discardRAM=()=>{
    setItems(confirmedItems);setDirtyIds(new Set());
    setNotice('Đã bỏ phần sửa chưa xác nhận trong RAM.');
  };
  const onSelect=(title:string,entries:Item[])=>setDrill({title,ids:entries.map(item=>item.recordId)});
  const reset=()=>{
    const seed=createDemoItems(27);setItems(seed);setConfirmedItems(seed);
    setPermissions(permissionsInitial());setCatalogOverride(null);
    setDirtyIds(new Set());setLayout(baseLayout());setPalette(defaultStatusPaletteStore());
    setReportVariant('classic');setDrill(null);setMenuOpen(false);
    setGuestEditCount(0);setRevision(v=>v+1);
    setNotice('Đã đặt lại hồ sơ và quyền mô phỏng trong bộ nhớ.');
  };
  return <div className="app-shell imperial-sky-theme pr95-full-preview"
    data-qa="compact-real-itemlist" data-preview="pr95-l4-full" data-role={role}
    style={statusPaletteCssVariables(palette.active) as CSSProperties}>
    <header className="pr95-preview-header">
      <div className="pr95-preview-product" aria-label="HopHDND bản xem thử">
        HopHDND <span>UI V3 · DEMO</span>
      </div>
      <nav className="nav-tabs primary-section-switcher pr95-preview-nav"
        aria-label="Hai phần dữ liệu chính">
        {nav.map(entry=><button key={entry.key} type="button"
          className={'primary-section-card'+(page===entry.key?' active':'')}
          aria-current={page===entry.key?'page':undefined}
          onClick={()=>openPage(entry.key)}>
          <span className="section-card-copy"><strong className="section-card-title">{entry.label}</strong></span>
          {page===entry.key&&<span className="section-card-state">Đang xem</span>}
        </button>)}
      </nav>
      <div className="pr95-preview-gear-zone" ref={gearZone}>
        <button type="button" className="pr95-preview-gear" aria-label="Mở cài đặt demo"
          aria-haspopup="true" aria-controls="pr95-preview-gear-menu" aria-expanded={menuOpen}
          onClick={()=>setMenuOpen(open=>!open)}>⚙</button>
        {menuOpen&&<div className="pr95-preview-gear-menu" id="pr95-preview-gear-menu"
          aria-label={admin?'Công cụ quản trị mô phỏng':'Cài đặt khách'}>
          {admin?<>
            <div className="pr95-preview-menu-user"><strong>Quản trị viên mô phỏng</strong>
              Không đăng nhập Google · chỉ dữ liệu giả</div>
            {PREVIEW_ADMIN_TOOLS.map(tool=><button key={tool.key} type="button"
              onClick={()=>openPage(tool.key)}>{tool.label}</button>)}
            <div className="pr95-preview-menu-footer">
              <button type="button" onClick={()=>switchRole('guest')}>Đăng xuất mô phỏng</button>
            </div>
          </>:<button type="button" onClick={()=>switchRole('admin')}>
            Đăng nhập quản trị (mô phỏng)</button>}
        </div>}
      </div>
    </header>
    <main className="pr95-preview-main">
      {admin&&<div className="pr95-preview-context" role="note">
        <span>Quản trị <strong>MÔ PHỎNG</strong></span>
        <span>Hồ sơ: <strong>{items.length}</strong> · Đang trình: <strong>{active}</strong></span>
        <span>Quyền ô: <strong>{Object.values(permissions.cells??{}).reduce((n,c)=>n+Object.keys(c).length,0)}</strong></span>
        <span>Lượt sửa khách: <strong>{guestEditCount}</strong></span>
      </div>}
      <span data-testid="guest-edits" className="pr95-preview-qa-only" hidden>{guestEditCount}</span>
      {notice&&<p className="notice pr95-preview-notice" role="status">{notice}</p>}
      {dirtyIds.size>0&&<div className="pr95-preview-unsaved" role="status">
        <span>{dirtyIds.size} hồ sơ đã sửa · Chưa xác nhận (RAM)</span>
        <div><button type="button" onClick={discardRAM}>Bỏ thay đổi</button>
          <button type="button" onClick={()=>void saveRAM()}>Lưu trong RAM</button></div>
      </div>}
      {page==='reports'&&<section aria-label="Năm bảng báo cáo tổng hợp">
        <div className="pr95-preview-section-heading">
          <h2>Báo cáo tổng hợp</h2>
          <label>Nhóm theo
            <select value={group} aria-label="Nhóm báo cáo theo" onChange={e=>setGroup(e.currentTarget.value as GroupField)}>
              <option value="department">Sở, ngành</option><option value="room">Phòng</option>
              <option value="vpLeader">Lãnh đạo VP</option><option value="ubndLeader">Lãnh đạo UBND</option>
            </select>
          </label>
        </div>
        <p>Nhấp số đếm trong bảng để xem popup bằng ReportDetailGrid thật;
          dữ liệu, tỷ lệ và nhóm tính bằng domain/reporting hiện hành.</p>
        {configs.map(config=><ReportTable key={config.id} items={items} config={config}
          group={group} onSelect={onSelect} sourceLabel="Dữ liệu giả PR95" />)}
      </section>}
      {page==='items'&&<section aria-label="Danh sách hồ sơ demo">
        <div className="pr95-preview-section-heading"><h2>Danh sách các ND trình HĐND</h2>
          <span>Editor chỉ tác động lên state bộ nhớ · không lưu máy chủ</span></div>
        <ItemList key={'preview-list-'+revision+'-'+role} items={items} drafts={{}} errors={{}}
          busy={false} readOnly={false} sourceKind="demo" sourceKey={sourceKey}
          catalog={catalog} initialLayout={layout}
          canEditDraft canEditCell={canEdit}
          anonymousViewer={!admin} viewerScope={admin?'pr95-l4-admin':'pr95-l4-guest'}
          allowPersonalCompact={!admin} allowLayout={admin}
          statusPaletteStore={palette}
          onUpdate={update} onHistory={()=>setNotice('Lịch sử server không mô phỏng; không có log Firebase.')}
          onCellHistory={()=>setNotice('Không có lịch sử server trong preview bộ nhớ.')}
          onClose={()=>openPage('reports')}
          onSaveData={async()=>{setNotice('Đã cập nhật trong bộ nhớ; không có ACK Firebase.');return true;}}
          onDiscardData={()=>setNotice('Không có giao dịch Firebase để hủy.')}
          onLayoutSaved={setNotice}
          onPersistViewerLayout={admin?async next=>{const checked=validateItemLayout(next);setLayout(checked);return checked;}:undefined}
        />
      </section>}
      {page==='permissions'&&admin&&<section aria-label="Quyền chỉnh sửa mô phỏng">
        <h2>Phân quyền chỉnh sửa — bộ nhớ</h2>
        <p>Thử đặt quyền riêng ô: chọn <strong>Cho phép sửa</strong> tại một ô, lưu quyền,
          chuyển vai trò Khách, sửa ô đó rồi quay lại Quản trị để thu hồi.
          Nút lưu chỉ cập nhật state mô phỏng.</p>
        <InlinePermissionsTable key={'preview-permission-'+revision} items={items}
          columns={TEXT_FIELDS.map(f=>({key:f.key,label:f.label}))}
          permissions={permissions}
          onSave={async(next,expected)=>{
            setPermissions(old=>previewPermissionSave(old,next,expected));
            setNotice('Đã cập nhật quyền mô phỏng trong RAM, không gọi Rules.');
          }}
          onReload={async()=>permissions} onBack={()=>openPage('items')}/>
      </section>}
      {page==='excel'&&<Pr95PreviewExcel role={role} items={items} onReplace={next=>{
        if(!admin){setNotice('Khách không được áp dụng dữ liệu demo.');return;}
        setItems(next);setPermissions(permissionsInitial());setDirtyIds(new Set());
        setRevision(v=>v+1);setDrill(null);
        setNotice('Đã thay thế dữ liệu mô phỏng TRONG RAM; quyền cũ đã xóa, không có Firebase/backup.');
      }}/>}
      {page==='account'&&<section className="card" aria-label="Tài khoản mô phỏng">
        <h2>Tài khoản / Phiên truy cập</h2>
        <p><strong>{admin?'Quản trị mô phỏng duy nhất':'Khách mô phỏng'}</strong> — không có UID/Google token.
          Vai trò phía trên là nút thử giao diện, không cung cấp quyền vào hệ thống thật.</p>
        <p>Trạng thái hồ sơ: {items.length} bản ghi giả; {guestEditCount} lượt sửa bởi khách trên phiên này.</p>
        <button className="button ghost" type="button" onClick={()=>switchRole(admin?'guest':'admin')}>
          Chuyển sang {admin?'Khách':'Quản trị'} mô phỏng
        </button>
        <button className="button ghost" type="button" onClick={reset}>Đặt lại dữ liệu mô phỏng</button>
      </section>}
      {page==='settings'&&admin&&<section className="card" aria-label="Cài đặt demo">
        <h2>Cài đặt bản xem thử</h2>
        <p>Các lựa chọn dưới đây chỉ đổi state trên trang QA. Để chỉnh cấu hình Firebase thật
          phải dùng App quản trị đã xác thực; preview không cung cấp đường ghi.</p>
        <label className="field">Kiểu bảng báo cáo
          <select value={reportVariant} onChange={e=>setReportVariant(e.currentTarget.value as typeof reportVariant)}>
            <option value="classic">Phủ màu toàn ô (baseline)</option>
            <option value="compact">Viền màu phân cột</option>
            <option value="bars">Thanh dữ liệu</option>
          </select>
        </label>
        <label className="field">Độ rộng vùng danh sách
          <select value={String(layout.frameWidth??'auto')}
            onChange={e=>setLayout(old=>validateItemLayout({...old,frameWidth:e.currentTarget.value==='auto'?'auto':Number(e.currentTarget.value)}))}>
            <option value="auto">Tự động</option><option value="900">900 px</option><option value="1200">1200 px</option>
          </select>
        </label>
        <button type="button" className="button ghost" onClick={reset}>Khôi phục dữ liệu và quyền giả</button>
      </section>}
    </main>
    {drill&&<ReportDetailGrid key={'pr95-popup-'+drill.title+'-'+role}
      title={drill.title} selectedIds={drill.ids} items={items}
      sourceKey={sourceKey+'-popup'} catalog={catalog} listLayout={layout}
      allowDraft readOnlyViewer={false} guestViewer={!admin}
      canEditCell={(id,field:TextField)=>canEdit(id,field)}
      onUpdate={update} onKeepDraft={()=>true} onClose={()=>setDrill(null)}
      onOpenFullList={()=>{setDrill(null);openPage('items');}}
      dirtyIds={dirtyIds} errors={{}} statusPaletteStore={palette}/>}
  </div>;
}
