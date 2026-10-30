/** PR95 V2 L4: purely in-memory, synthetic full-application preview.
 * Reuse baseline ItemList, ReportTable, ReportDetailGrid, InlinePermissionsTable
 * and real reporting domain. Never initialize Firebase/Google APIs here.
 */
import {useMemo,useState,type CSSProperties} from 'react';
import type {EditableField,GroupField,Item,TextField} from '../../shared/types';
import {TEXT_FIELDS} from '../../shared/field-definitions';
import {createDemoItems} from '../data/demo-items';
import {catalogFromItems} from '../data/catalogs';
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

type Page='items'|'reports'|'permissions'|'excel'|'account'|'settings';
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
const nav:readonly {key:Page;label:string}[]=[
  {key:'reports',label:'Báo cáo tổng hợp'},
  {key:'items',label:'Danh sách các ND trình HĐND'},
  {key:'permissions',label:'Phân quyền chỉnh sửa'},
  {key:'excel',label:'Excel · Nhập / Xuất'},
  {key:'account',label:'Tài khoản'},
  {key:'settings',label:'Cài đặt'},
];
export function Pr95FullPreview(){
  const [items,setItems]=useState<Item[]>(()=>createDemoItems(27));
  const [role,setRole]=useState<Role>('admin');
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
  const catalog=useMemo(()=>catalogFromItems(items),[items]);
  const palette=useMemo(()=>defaultStatusPaletteStore(),[]);
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
  const switchRole=(next:Role)=>{setRole(next);setDrill(null);setNotice('Đã chuyển vai trò mô phỏng; không đăng nhập Google hoặc Firebase.');if(next==='guest'&&(page==='permissions'||page==='settings'))setPage('items');};
  const openPage=(next:Page)=>{if(!admin&&(next==='permissions'||next==='settings')){setNotice('Khách không được cấp quyền quản trị trong bản mô phỏng.');return;}setPage(next);setDrill(null);};
  const onSelect=(title:string,entries:Item[])=>setDrill({title,ids:entries.map(item=>item.recordId)});
  const reset=()=>{
    setItems(createDemoItems(27));setPermissions(permissionsInitial());
    setDirtyIds(new Set());setLayout(baseLayout());setDrill(null);
    setGuestEditCount(0);setRevision(v=>v+1);
    setNotice('Đã đặt lại hồ sơ và quyền mô phỏng trong bộ nhớ.');
  };
  return <div className="app-shell imperial-sky-theme pr95-full-preview"
    data-qa="compact-real-itemlist" data-preview="pr95-l4-full" data-role={role}
    style={statusPaletteCssVariables(palette.active) as CSSProperties}>
    <header className="topbar pr95-preview-header">
      <div><h1>HopHDND · Bản xem thử V2</h1>
        <p>Bản xem thử · Dữ liệu giả — không đăng nhập, không kết nối Firebase/Google Sheets</p></div>
      <div className="pr95-preview-role">
        <label htmlFor="pr95-role">Vai trò <strong>MÔ PHỎNG</strong></label>
        <select id="pr95-role" aria-label="Vai trò mô phỏng" value={role}
          onChange={event=>switchRole(event.currentTarget.value as Role)}>
          <option value="admin">Quản trị (1 admin mô phỏng)</option>
          <option value="guest">Khách ẩn danh mô phỏng</option>
        </select>
      </div>
    </header>
    <div className="pr95-preview-safety" role="note">
      <strong>CHỈ DEMO BỘ NHỚ.</strong> Không xác thực thật, không khóa lease/CAS server,
      không lưu Firebase, không nạp dữ liệu thật. Quyền sửa chỉ minh họa trên cùng trang trình duyệt.
    </div>
    <nav className="pr95-preview-nav" aria-label="Điều hướng bản xem thử">
      {nav.filter(entry=>admin||!['permissions','settings'].includes(entry.key)).map(entry=>
        <button key={entry.key} type="button" aria-current={page===entry.key?'page':undefined}
          onClick={()=>openPage(entry.key)}>{entry.label}</button>)}
    </nav>
    <main className="pr95-preview-main">
      <div className="pr95-preview-context">
        <span>Vai trò: <strong>{admin?'Quản trị mô phỏng':'Khách mô phỏng'}</strong></span>
        <span>Hồ sơ: <strong>{items.length}</strong> · Đang trình: <strong>{active}</strong></span>
        <span>Quyền theo ô: <strong>{Object.values(permissions.cells??{}).reduce((n,c)=>n+Object.keys(c).length,0)}</strong></span>
        <span>Dữ liệu chỉ trong RAM · Lượt sửa khách: <strong data-testid="guest-edits">{guestEditCount}</strong></span>
      </div>
      {notice&&<p className="notice" role="status">{notice}</p>}
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
