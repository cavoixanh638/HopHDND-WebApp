import {useState} from 'react';
import type {Item} from '../../../shared/types';
import type {CellPermissions} from '../../data/firebase-repository';

type Props = {
  userLabel:string;
  isAdmin:boolean;
  connected:boolean;
  permissions:CellPermissions;
  items:Item[];
  busy:boolean;
  onLogin:()=>Promise<void>;
  onLogout:()=>Promise<void>;
  onSavePermissions:(next:CellPermissions,expected:CellPermissions)=>Promise<void>;
  onOpenItemsCustomize:()=>void;
  onClose:()=>void;
  dataSource?:'excel'|'database'|'primary';
  onChangeDataSource?:(next:'excel'|'database'|'primary')=>Promise<void>;
  onBootstrapPrimary?:()=>Promise<void>;
};

/** Authentication only. Permission editing is now directly inside ItemList customization. */
export function FirebasePanel({userLabel,isAdmin,connected,busy,onLogin,onLogout,onOpenItemsCustomize,onClose,dataSource='excel',onChangeDataSource,onBootstrapPrimary}:Props){
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [confirmPrimary,setConfirmPrimary]=useState(false);
  const [notice,setNotice]=useState('');
  const login=async()=>{setWorking(true);setError('');try{await onLogin();}catch(cause){setError(cause instanceof Error?cause.message:'Không đăng nhập được.');}finally{setWorking(false);}};
  const logout=async()=>{setWorking(true);setError('');try{await onLogout();}catch(cause){setError(cause instanceof Error?cause.message:'Không đăng xuất được.');}finally{setWorking(false);}};
  const isGuest=userLabel.startsWith('Khách ẩn danh');
  return <section className="card" aria-label="Tài khoản Firebase">
    <div className="settings-mode-bar"><div><strong>Tài khoản Firebase</strong>
      <p>Xác thực tài khoản tại đây. Quản trị phân quyền cột/dòng/ô ngay trên bảng Danh sách trong chế độ tùy chỉnh, không ở màn hình riêng.</p></div>
      <div className="top-actions"><button type="button" className="button ghost" onClick={onClose} disabled={busy||working}>Về chế độ xem</button></div>
    </div>
    <div className="card-header"><div><h3>Trạng thái đăng nhập</h3><p className="muted">{connected?'Đã kết nối Firebase':'Chưa kết nối Firebase'} · {userLabel||'Chưa xác định tài khoản'}</p></div></div>
    {error&&<p className="error-text" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}
    <div className="top-actions">
      <button type="button" className="button primary" disabled={busy||working} onClick={()=>void login()}>{isAdmin?'Đổi tài khoản Google':'Đăng nhập Google quản trị'}</button>
      {!isGuest&&<button type="button" className="button ghost" disabled={busy||working} onClick={()=>void logout()}>Đăng xuất</button>}
      {isAdmin&&<button type="button" className="button primary" disabled={busy||working} onClick={onOpenItemsCustomize}>Mở tùy chỉnh Danh sách và phân quyền ô</button>}
    </div>
    {isAdmin&&onChangeDataSource&&<div className="card-header"><div><h3>Nguồn dữ liệu hiển thị</h3>
      <p className="muted">Firebase chính hoạt động độc lập với link Google Sheets và hỗ trợ lưu realtime. Bản sao Excel chỉ dùng để chuyển dữ liệu ban đầu hoặc dự phòng, không phải nguồn dữ liệu lâu dài.</p>
      <label className="field">Nguồn đọc bảng
        <select aria-label="Nguồn đọc bảng" value={dataSource} disabled={busy||working} onChange={async e=>{
          const next=e.target.value as 'excel'|'database'|'primary';setWorking(true);setError('');
          try{await onChangeDataSource(next);setNotice(next==='primary'?'Đã kích hoạt Database chính.':'Đã đổi nguồn đọc dữ liệu.');}catch(cause){setError(cause instanceof Error?cause.message:'Không đổi được nguồn dữ liệu.');}
          finally{setWorking(false);}
        }}><option value="excel">Link Excel / Google Sheets (trực tiếp)</option><option value="database">Firebase Database (bản sao Excel, tạm thời)</option><option value="primary">Firebase Database chính (độc lập, realtime)</option></select>
      </label>
    </div></div>}
    {isAdmin&&onBootstrapPrimary&&dataSource!=='primary'&&<div className="notice" role="group" aria-label="Chuyển dữ liệu một lần lên Database chính">
      <strong>Chuyển sang Database chính (một lần)</strong>
      <p>Hệ thống sẽ đọc bản sao đã xác nhận trong Firebase và ghi sang dữ liệu nghiệp vụ chính. Không đọc link Google Sheets, không ghi đè Database đã có dữ liệu. Chỉ sau khi kiểm tra đủ bản ghi mới chuyển nguồn hiển thị cho mọi người.</p>
      {!confirmPrimary
        ?<button type="button" className="button ghost" disabled={busy||working||!connected} onClick={()=>{setConfirmPrimary(true);setNotice('');}}>Chuẩn bị chuyển dữ liệu</button>
        :<div className="top-actions">
          <button type="button" className="button primary" disabled={busy||working||!connected} onClick={async()=>{
            setWorking(true);setError('');setNotice('');
            try{await onBootstrapPrimary();setNotice('Đã kiểm tra và chuyển dữ liệu. Database chính đang được kích hoạt.');setConfirmPrimary(false);}
            catch(cause){setError(cause instanceof Error?cause.message:'Không xác nhận được dữ liệu Database chính.');}
            finally{setWorking(false);}
          }}>Xác nhận chuyển dữ liệu và kích hoạt realtime</button>
          <button type="button" className="button ghost" disabled={busy||working} onClick={()=>setConfirmPrimary(false)}>Hủy</button>
        </div>}
    </div>}
    <p className="muted">{dataSource==='primary'?'Dữ liệu chính nằm trên Firebase. Người có quyền sửa được tự động lưu vào Database, các phiên khác nhận thay đổi realtime. Excel chỉ dùng để xuất/nhập theo thao tác chủ động.':'Dữ liệu nguồn hiện chưa ghi trực tiếp trên Firebase chính. Các chỉnh sửa chỉ là bản nháp cục bộ cho đến khi quản trị chuyển nguồn an toàn.'}</p>
  </section>;
}
