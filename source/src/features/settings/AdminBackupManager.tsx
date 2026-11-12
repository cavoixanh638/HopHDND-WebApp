import {useState} from 'react';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import {firebaseAdmin} from '../../data/firebase-repository';
import {activeBackupScope,buildAdminAppBackup,saveBackupFile} from '../../data/admin-backup-service';
import {inspectBackupJson,type BackupInspection} from '../../data/admin-backup-format';

/** This screen is intentionally public-site SAFE: read/export and local file
 * inspection only. No direct RTDB root writes, no backup upload to a service,
 * no delete button which silently bypasses the protected parent operation.
 */
export function AdminBackupManager({database,user,disabled=false}:{
  database:Database;user:User|null;disabled?:boolean;
}){
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [fileName,setFileName]=useState('');
  const [checked,setChecked]=useState<BackupInspection|null>(null);
  const isAdmin=firebaseAdmin(user);
  const download=async()=>{
    if(!isAdmin||disabled||busy)return;
    setBusy(true);setMessage('');
    try{
      const envelope=await buildAdminAppBackup(database,user);
      const name=saveBackupFile(envelope);
      setMessage('Đã tạo bản sao lưu và kiểm tra SHA-256: '+name+
        '. Giữ file này ở nơi an toàn, không đưa lên GitHub hoặc chia sẻ công khai.');
    }catch(e){setMessage(e instanceof Error?e.message:'Sao lưu không hoàn thành.');}
    finally{setBusy(false);}
  };
  const examine=async(file:File)=>{
    setFileName(file.name);setChecked(null);setMessage('');setBusy(true);
    try{
      if(!/\.json$/i.test(file.name)||file.size>30*1024*1024||file.size===0)
        throw Error('Chọn backup JSON HopHDND hợp lệ, tối đa 30 MB.');
      const inspected=await inspectBackupJson(await file.text(),activeBackupScope(database));
      setChecked(inspected);
      setMessage('SHA-256 và định danh Firebase khớp. Đây mới là bước đọc thử file trên thiết bị, không nhập dữ liệu.');
    }catch(e){setMessage(e instanceof Error?e.message:'File backup không hợp lệ.');}
    finally{setBusy(false);}
  };
  if(!isAdmin)return null;
  return <section className="card admin-data-maintenance" aria-label="Quản lý bản sao và thay thế dữ liệu">
    <h3>Sao lưu · Xóa · Nạp dữ liệu</h3>
    <p>Chức năng dành riêng cho quản trị viên Google đã xác minh. Bản sao lưu chỉ chứa
      các nhánh dữ liệu ứng dụng được khai báo, bao gồm hồ sơ, thế hệ dữ liệu,
      phân quyền, cấu hình và lịch sử trong database. <strong>Không bao gồm</strong>
      Firebase Authentication, Security Rules, các session tạm hoặc những nhánh khác
      ngoài hệ thống HĐND.</p>
    <div className="admin-maintenance-grid" style={{
      display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,280px),1fr))',gap:12
    }}>
      <section className="card" aria-label="Trích xuất bản sao lưu">
        <h4>1. Tải bản sao lưu</h4>
        <p>Đóng băng chỉnh sửa và chờ mọi người hoàn tất ô đang sửa. Hệ thống
          đọc và đối chiếu dữ liệu hai lần, tạo file JSON kèm SHA-256.</p>
        <button type="button" className="button primary" disabled={busy||disabled}
          onClick={()=>void download()}>{busy?'Đang kiểm tra…':'Tải backup ứng dụng (.json)'}</button>
        <p className="muted">Chưa phải bản sao toàn bộ Firebase project/Rules. Giữ file
          trong kho lưu trữ riêng tư và có bản sao dự phòng độc lập.</p>
      </section>
      <section className="card" aria-label="Kiểm tra file backup trước khi nạp">
        <h4>2. Kiểm tra file backup</h4>
        <label className="field">Chọn file backup .json
          <input type="file" accept=".json,application/json"
            disabled={busy||disabled}
            onChange={e=>{const file=e.currentTarget.files?.[0];
              if(file)void examine(file);e.currentTarget.value='';}}/>
        </label>
        {fileName&&<p className="muted">File đã chọn: {fileName}</p>}
        {checked&&<div role="status">
          <p><strong>Backup hợp lệ</strong> · {checked.mode==='v2'?'Nguồn V2':'Nguồn legacy'}</p>
          <p>V2: {checked.activeRows} hồ sơ · Legacy: {checked.legacyRows} hồ sơ</p>
          <p>Ngày tạo: {new Date(checked.createdAt).toLocaleString('vi-VN')}</p>
          <p>SHA-256: <code>{checked.envelope.sha256}</code></p>
          <p className="muted">File chỉ được đọc trên trình duyệt, chưa gửi lên Firebase.</p>
        </div>}
      </section>
      <section className="card" aria-label="Xóa và nạp dữ liệu có bảo vệ">
        <h4>3. Xóa / Nạp lại toàn bộ hồ sơ</h4>
        <p>Đây là thao tác có thể làm mất dữ liệu đã chỉnh sửa. Bản hiện tại
          <strong> chưa mở quyền xóa hoặc ghi đè trực tiếp trên website</strong> vì
          Rules yêu cầu dịch vụ giao dịch quản trị xác thực.</p>
        <button type="button" className="button danger" disabled
          title="Chưa có dịch vụ quản trị trực tuyến đã thẩm định">Xóa toàn bộ hồ sơ (chưa khả dụng)</button>
        <p className="muted">Nạp Excel mới: sử dụng bộ kiểm tra A–O ngay phía dưới.
          Khôi phục từ backup JSON sẽ được bật sau khi dịch vụ quản trị trực tuyến
          xác minh backup, sao lưu bản hiện tại và kiểm tra phiên dữ liệu.</p>
      </section>
    </div>
    {message&&<p className="notice" role="status">{message}</p>}
    <p className="muted">Không tự xóa cấu hình, phân quyền, tài khoản Google hoặc lịch sử khi
      chỉ muốn bắt đầu kỳ họp mới. Cần giữ khả năng khôi phục và truy vết.</p>
  </section>;
}
