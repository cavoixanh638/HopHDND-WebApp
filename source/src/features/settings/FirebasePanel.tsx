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
};

/** Authentication only. Permission editing is now directly inside ItemList customization. */
export function FirebasePanel({userLabel,isAdmin,connected,busy,onLogin,onLogout,onOpenItemsCustomize,onClose}:Props){
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const login=async()=>{setWorking(true);setError('');try{await onLogin();}catch(cause){setError(cause instanceof Error?cause.message:'Không đăng nhập được.');}finally{setWorking(false);}};
  const logout=async()=>{setWorking(true);setError('');try{await onLogout();}catch(cause){setError(cause instanceof Error?cause.message:'Không đăng xuất được.');}finally{setWorking(false);}};
  const isGuest=userLabel.startsWith('Khách ẩn danh');
  return <section className="card" aria-label="Tài khoản Firebase">
    <div className="settings-mode-bar"><div><strong>Tài khoản Firebase</strong>
      <p>Xác thực tài khoản tại đây. Quản trị phân quyền cột/dòng/ô ngay trên bảng Danh sách trong chế độ tùy chỉnh, không ở màn hình riêng.</p></div>
      <div className="top-actions"><button type="button" className="button ghost" onClick={onClose} disabled={busy||working}>Về chế độ xem</button></div>
    </div>
    <div className="card-header"><div><h3>Trạng thái đăng nhập</h3><p className="muted">{connected?'Đã kết nối Firebase':'Chưa kết nối Firebase'} · {userLabel||'Chưa xác định tài khoản'}</p></div></div>
    {error&&<p className="error-text" role="alert">{error}</p>}
    <div className="top-actions">
      <button type="button" className="button primary" disabled={busy||working} onClick={()=>void login()}>{isAdmin?'Đổi tài khoản Google':'Đăng nhập Google quản trị'}</button>
      {!isGuest&&<button type="button" className="button ghost" disabled={busy||working} onClick={()=>void logout()}>Đăng xuất</button>}
      {isAdmin&&<button type="button" className="button primary" disabled={busy||working} onClick={onOpenItemsCustomize}>Mở tùy chỉnh Danh sách và phân quyền ô</button>}
    </div>
    <p className="muted">Khách chỉ được sửa thử những ô được quản trị viên cấp quyền. Bảng Google Sheets và dữ liệu Firebase nghiệp vụ không bị ghi bởi các thao tác sửa thử này.</p>
  </section>;
}
