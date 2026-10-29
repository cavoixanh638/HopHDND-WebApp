import {useState} from 'react';
import type {Database} from 'firebase/database';
import {checkLiveFirebaseReadiness,type LiveFirebaseReadiness} from '../../data/firebase-live-readiness';
import type {Item} from '../../../shared/types';
import type {CellPermissions} from '../../data/firebase-repository';

type Props = {
  firebaseDatabase?:Database;
  userLabel:string;
  isAdmin:boolean;
  userUid:string;
  editorAuthorized:boolean;
  editors:Record<string,boolean>;
  onSaveEditorAccess:(uid:string,approved:boolean)=>Promise<void>;
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
export function FirebasePanel({firebaseDatabase,userLabel,isAdmin,userUid,editorAuthorized,editors,onSaveEditorAccess,connected,busy,onLogin,onLogout,onOpenItemsCustomize,onClose,_dataSource='excel'}:Props){
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [editorUid,setEditorUid]=useState('');
  const [liveCheck,setLiveCheck]=useState<LiveFirebaseReadiness|null>(null);
  const [liveChecking,setLiveChecking]=useState(false);
  const [liveError,setLiveError]=useState('');
  const inspectLive=async()=>{
    if(!isAdmin||!connected||!firebaseDatabase||liveChecking)return;
    setLiveCheck(null);setLiveError('');setLiveChecking(true);
    try{
      setLiveCheck(await checkLiveFirebaseReadiness(firebaseDatabase));
    }catch(cause){
      setLiveError('Không đọc được trạng thái Firebase từ máy chủ: '+
        (cause instanceof Error?cause.message:'Lỗi kết nối hoặc quyền truy cập')+
        '. Không coi phiên kiểm tra này là đạt.');
    }finally{setLiveChecking(false);}
  };
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
      <button type="button" className="button primary" disabled={busy||working} onClick={()=>void login()}>{isAdmin?'Đổi tài khoản Google':'Đăng nhập Google nhân viên'}</button>
      {!isGuest&&<button type="button" className="button ghost" disabled={busy||working} onClick={()=>void logout()}>Đăng xuất</button>}
      {isAdmin&&<button type="button" className="button primary" disabled={busy||working} onClick={onOpenItemsCustomize}>Mở tùy chỉnh Danh sách và phân quyền ô</button>}
    </div>
    <div className="card-header"><div>
      <h3>Quyền tài khoản</h3>
      <p className="muted">Mã UID Firebase: <code>{userUid||'Đang kết nối'}</code>. {isGuest?'Khách được xác thực ẩn danh tự động, không cần đăng nhập Google. Chỉ các ô quản trị đã cấp quyền mới được sửa.':'Nhân viên đăng nhập Google gửi UID cho quản trị nếu cần quyền sửa theo tài khoản.'}</p>
      <p className="muted">{isAdmin?'Quản trị toàn hệ thống':isGuest?'Khách công khai: chỉ được sửa các ô mở quyền, không được thay bố cục hay cấp quyền.':editorAuthorized?'Tài khoản đã được duyệt; chỉ sửa các ô được cấp quyền.':'Chưa được duyệt UID nhân viên; chỉ được xem.'}</p>
    </div></div>
    {isAdmin&&<section className="notice" aria-label="Quản lý quyền nhân viên Google">
      <h3>Nhân viên được phép chỉnh sửa</h3>
      <p>Danh sách UID chỉ dành cho nhân viên Google được phê duyệt riêng. Khách công khai không cần UID trong danh sách này; họ được chỉnh sửa những ô quản trị đã mở quyền tại bảng. Mọi lượt sửa vẫn phải có khóa ô và được Firebase Rules xác nhận.</p>
      <div className="top-actions">
        <input aria-label="UID Firebase nhân viên" type="text" value={editorUid} onChange={event=>setEditorUid(event.target.value.trim())} placeholder="Dán UID của nhân viên" disabled={busy||working}/>
        <button type="button" className="button primary" disabled={busy||working||!connected||!/^[A-Za-z0-9_-]{1,128}$/.test(editorUid)} onClick={async()=>{
          setWorking(true);setError('');setNotice('');
          try{await onSaveEditorAccess(editorUid,true);setNotice('Đã cấp quyền tài khoản; vẫn cần phân quyền ô.');setEditorUid('');}
          catch(cause){setError(cause instanceof Error?cause.message:'Không cấp được quyền nhân viên.');}
          finally{setWorking(false);}
        }}>Cấp quyền UID</button>
      </div>
      <ul>{Object.entries(editors).filter(([,enabled])=>enabled).sort(([a],[b])=>a.localeCompare(b)).map(([uid])=><li key={uid}><code>{uid}</code>{' '}
        <button type="button" className="button ghost" disabled={busy||working||!connected} onClick={async()=>{
          setWorking(true);setError('');setNotice('');
          try{await onSaveEditorAccess(uid,false);setNotice('Đã thu hồi quyền UID.');}
          catch(cause){setError(cause instanceof Error?cause.message:'Không thu hồi được quyền.');}
          finally{setWorking(false);}
        }}>Thu hồi</button>
      </li>)}</ul>
    </section>}
    {isAdmin&&firebaseDatabase&&<section className="notice" aria-label="Kiểm tra vận hành Firebase">
      <h3>Kiểm tra vận hành Firebase</h3>
      <p className="muted">Đọc trực tiếp Firebase của website, không ghi dữ liệu hoặc thay quyền. Dùng trước khi chuyển sang nguồn chính và sau khi kiểm tra đăng nhập.</p>
      <button type="button" className="button ghost" disabled={busy||liveChecking||!connected}
        onClick={()=>void inspectLive()}>
        {liveChecking?'Đang kiểm tra…':'Kiểm tra Firebase đang sử dụng'}
      </button>
      {liveError&&<p role="alert" className="error-text">{liveError}</p>}
      {liveCheck&&<div role="status">
        <p><strong>Đã đọc từ Firebase:</strong> {new Date(liveCheck.checkedAt).toLocaleString('vi-VN')}
          {' '}· Nguồn dữ liệu: <strong>{liveCheck.source==='primary'?'Firebase chính':liveCheck.source==='database'?'Firebase mirror':liveCheck.source==='excel'?'Google Sheets/Excel':'Chưa xác định'}</strong></p>
        <p>Hồ sơ Firebase chính: <strong>{liveCheck.primaryCount}</strong>
          {' '}· Cấu hình: {liveCheck.profilePresent?'Có':'Chưa có'}
          {' '}· Phân quyền ô: {liveCheck.permissionsPresent?'Có':'Chưa có'}
          {' '}· Tài khoản nhân viên được cấp: {liveCheck.editorAccounts}</p>
        <p>Khóa chỉnh sửa: {liveCheck.editingLocked?'Đang bật':'Không bật'}
          {' '}· Chế độ chốt dữ liệu: {liveCheck.freezeMode}</p>
        {liveCheck.problems.length?<ul>{liveCheck.problems.map(message=><li key={message}>{message}</li>)}</ul>
          :<p>Những điều kiện dữ liệu kiểm tra được đều phù hợp. Cần xác nhận Rules đã publish và kiểm thử lưu bằng hai tài khoản trước khi sử dụng.</p>}
        <p className="muted">Lưu ý: bảng trên chỉ xác nhận các dữ liệu đã đọc bằng tài khoản hiện tại. Nó không xác nhận Security Rules đang publish, khả năng ghi thực tế hay tình trạng sao lưu.</p>
      </div>}
    </section>}
    <p className="muted" role="status">
      Nguồn dữ liệu vận hành duy nhất là Firebase Database. Excel chỉ được đọc khi quản trị viên chủ động
      chọn file trong chức năng Nhập Excel. Không có chế độ chuyển lại Google Sheets.
    </p>
    <p className="muted">Đăng nhập Google của quản trị viên vẫn hoạt động độc lập với nguồn Excel.
      Quyền ghi dữ liệu được Firebase Security Rules kiểm soát.</p>
  </section>;
}
