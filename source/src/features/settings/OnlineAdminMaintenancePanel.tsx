import {useEffect,useMemo,useState} from 'react';
import {GoogleAuthProvider,reauthenticateWithPopup,type User} from 'firebase/auth';
import type {Database} from 'firebase/database';
import type {Item} from '../../../shared/types';
import type {ActiveDatasetPointer} from '../../data/dataset-replacement-integrity';
import {activeBackupScope} from '../../data/admin-backup-service';
import {inspectBackupJson,type BackupInspection} from '../../data/admin-backup-format';
import {inspectBusinessExcel,parseBusinessExcel,type BusinessExcelInspection} from '../../data/business-excel';
import {previewDatasetReplacement} from '../../data/dataset-replacement-preview';
import {firebaseAdmin} from '../../data/firebase-repository';
import {AdminBackupManager} from './AdminBackupManager';
import {maintenanceApiUrl,exportOnlineAdminBackup,prepareOnlineMaintenance,
  commitOnlineMaintenance,statusOnlineMaintenance,type MaintenanceAction,
  type PreparedMaintenance,type MaintenanceOperationView} from '../../data/online-maintenance-client';

type UploadExcel={name:string;bytes:Uint8Array;inspected:BusinessExcelInspection};

/** One WebApp screen for admin only. All dangerous writes are sent to a
 * separately authenticated Worker. Without a verified backend, fail closed. */
export function OnlineAdminMaintenancePanel({database,user,active,items,disabled=false}:{
  database:Database;user:User|null;active:ActiveDatasetPointer|null|undefined;
  items:readonly Item[];disabled?:boolean;
}){
  const [capabilities,setCapabilities]=useState<{reads:boolean;writes:boolean}|null>(null);
  const [operation,setOperation]=useState<MaintenanceAction>('replace');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [reauthenticated,setReauthenticated]=useState(false);
  const [backupDownloaded,setBackupDownloaded]=useState(false);
  const [backedUpEpoch,setBackedUpEpoch]=useState('');
  const [excel,setExcel]=useState<UploadExcel|null>(null);
  const [sheet,setSheet]=useState('');
  const [restoreFile,setRestoreFile]=useState<{name:string;payload:unknown;inspection:BackupInspection}|null>(null);
  const [prepared,setPrepared]=useState<PreparedMaintenance|null>(null);
  const [confirmation,setConfirmation]=useState('');
  const [lastOperation,setLastOperation]=useState('');
  const [verifiedStatus,setVerifiedStatus]=useState<MaintenanceOperationView|null>(null);
  const [approvalChecklist,setApprovalChecklist]=useState(false);
  const [finalized,setFinalized]=useState(false);
  const admin=firebaseAdmin(user);
  useEffect(()=>{
    let cancelled=false;
    let base='';try{base=maintenanceApiUrl();}catch{base='';}
    if(!base){setCapabilities(null);return;}
    void fetch(base+'/health',{cache:'no-store',credentials:'omit'})
      .then(async res=>res.ok?res.json():null)
      .then(result=>{
        if(cancelled)return;
        setCapabilities({reads:result?.ready===true,writes:result?.ready===true&&result?.mutationsEnabled===true});
      }).catch(()=>{if(!cancelled)setCapabilities(null);});
    return()=>{cancelled=true};
  },[]);
  const parsed=useMemo(()=>{
    if(!excel||!sheet)return null;
    try{return parseBusinessExcel(excel.bytes,sheet)}catch{return null;}
  },[excel,sheet]);
  const comparison=useMemo(()=>{
    if(!parsed)return null;
    try{return previewDatasetReplacement(items,parsed.items)}catch{return null;}
  },[parsed,items]);
  const currentEpoch=active?JSON.stringify({
    generationId:active.generationId,operationId:active.operationId,
    revision:active.revision,rowCount:active.rowCount,digest:active.digest
  }):'';
  const stale=prepared&&active?[
    'generationId','operationId','revision','rowCount','digest'
  ].some(key=>prepared.expected[key as keyof ActiveDatasetPointer]!==active[key as keyof ActiveDatasetPointer]):false;
  const canRead=admin&&capabilities?.reads===true&&!disabled&&!busy;
  const canMutate=canRead&&capabilities?.writes===true&&reauthenticated&&!!active&&!finalized;
  const resetReview=()=>{setPrepared(null);setConfirmation('');setVerifiedStatus(null);setNotice('');setError('');setFinalized(false);};
  const download=async()=>{
    if(!canRead)return;
    setBusy(true);setError('');setNotice('');
    try{
      const result=await exportOnlineAdminBackup(user,database,active??null);
      setBackupDownloaded(true);
      setBackedUpEpoch(currentEpoch);
      setNotice('Đã tải backup được niêm phong bằng chữ ký máy chủ: '+result.name+
        '. Hãy lưu file ở hai nơi riêng tư và kiểm tra có thể mở file.');
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  };
  const reauth=async()=>{
    if(!admin||!user)return;
    setBusy(true);setError('');
    try{
      await reauthenticateWithPopup(user,new GoogleAuthProvider());
      setReauthenticated(true);
      setNotice('Đã xác thực lại Google. Bạn có tối đa 10 phút để chuẩn bị và xác nhận thao tác.');
    }catch(e){setReauthenticated(false);setError('Chưa xác thực lại: '+(e as Error).message);}
    finally{setBusy(false);}
  };
  const loadExcel=async(file:File)=>{
    resetReview();setExcel(null);setSheet('');
    try{
      if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024)
        throw Error('Chỉ nhận Excel .xlsx tối đa 5 MB.');
      const bytes=new Uint8Array(await file.arrayBuffer());
      const inspected=inspectBusinessExcel(bytes);
      if(!inspected.validSheets.length)throw Error('Không tìm thấy sheet A–O hợp lệ; kiểm tra tiêu đề và công thức.');
      setExcel({name:file.name,bytes,inspected});
      setNotice('Đã nhận file, chọn sheet và kiểm tra bản đối chiếu trước khi chuẩn bị.');
    }catch(e){setError((e as Error).message);}
  };
  const loadBackup=async(file:File)=>{
    resetReview();setRestoreFile(null);
    try{
      if(!/\.json$/i.test(file.name)||file.size>3*1024*1024)
        throw Error('Chỉ nhận backup JSON đã niêm phong, tối đa 3 MB.');
      const raw=await file.text();
      const inspected=await inspectBackupJson(raw,activeBackupScope(database));
      const archive=JSON.parse(raw) as {serverSeal?:{algorithm?:string;signature?:string}};
      if(archive.serverSeal?.algorithm!=='HMAC-SHA256'||
        !/^[A-Za-z0-9_-]{43}$/.test(archive.serverSeal.signature??''))
        throw Error('File backup chưa có chữ ký máy chủ. Không thể khôi phục online an toàn.');
      setRestoreFile({name:file.name,payload:archive,inspection:inspected});
      setNotice('File qua kiểm tra cú pháp và SHA-256 phía trình duyệt. Máy chủ sẽ xác minh chữ ký HMAC độc lập khi chuẩn bị khôi phục.');
    }catch(e){setError((e as Error).message);}
  };
  const stage=async()=>{
    if(!canMutate||!active||!approvalChecklist||!backupDownloaded||
      backedUpEpoch!==currentEpoch)return;
    setError('');setNotice('');setBusy(true);setPrepared(null);
    const operationId='maint_'+crypto.randomUUID().replaceAll('-','');
    setLastOperation(operationId);
    try{
      const args=operation==='clear'?{action:'clear' as const,operationId,expected:active}:
        operation==='replace'?{action:'replace' as const,operationId,expected:active,
          rows:parsed?.items,sourceName:excel?.name}:
          {action:'restore' as const,operationId,expected:active,archive:restoreFile?.payload};
      if(operation==='replace'&&!parsed)throw Error('Chưa chọn sheet Excel hợp lệ.');
      if(operation==='restore'&&!restoreFile)throw Error('Chưa chọn backup có chữ ký máy chủ.');
      const result=await prepareOnlineMaintenance(user,args);
      setPrepared(result);
      setNotice('Máy chủ đã tạo staging và bản sao lưu riêng tư. Chưa chuyển dữ liệu. Nhập chính xác câu xác nhận.');
    }catch(e){setError((e as Error).message+' Mã thao tác: '+operationId+'. Nếu chưa rõ trạng thái, tra cứu mã này trước khi làm tiếp.');}
    finally{setBusy(false);}
  };
  const commit=async()=>{
    if(!canMutate||!prepared||stale||backedUpEpoch!==currentEpoch||
      confirmation!==prepared.confirmation)return;
    setBusy(true);setError('');setNotice('');
    try{
      const result=await commitOnlineMaintenance(user,prepared.operationId,confirmation);
      setFinalized(true);setPrepared(null);setConfirmation('');
      setBackupDownloaded(false);setBackedUpEpoch('');
      setNotice('Đã được máy chủ xác nhận '+result.status+' cho '+result.operationId+
        '. Chờ WebApp đồng bộ thế hệ mới rồi kiểm tra dữ liệu và đóng/mở băng.');
    }catch(e){
      setError((e as Error).message+' Không nhấn xác nhận lại. Hãy bấm Tra cứu trạng thái.');
    }finally{setBusy(false);}
  };
  const resolve=async()=>{
    if(!admin||!lastOperation||busy)return;
    setBusy(true);setError('');
    try{
      const outcome=await statusOnlineMaintenance(user,lastOperation);
      setVerifiedStatus(outcome);
      if(outcome.status==='committed-active'||outcome.status==='committed-historical'){
        setFinalized(true);setPrepared(null);
        setBackupDownloaded(false);setBackedUpEpoch('');
      }
    }catch(e){setError((e as Error).message);}
    finally{setBusy(false);}
  };
  if(!admin)return null;
  // Do not hide the existing safe browser backup/export when a Worker URL is
  // configured but the service is offline or not approved for reads yet.
  // This fallback cannot write/delete/restore Firebase data.
  if(!capabilities?.reads)return <section className="card online-maintenance-panel"
    aria-label="Dịch vụ quản trị chưa sẵn sàng">
    <p className="notice" role="status">Dịch vụ quản trị online chưa hoạt động hoặc chưa được phê duyệt.
      Bạn vẫn có thể sao lưu và kiểm tra file bằng chế độ an toàn trên trình duyệt.
      Không có thao tác xóa, thay thế hoặc khôi phục dữ liệu trực tiếp nào được bật.</p>
    <AdminBackupManager database={database} user={user} disabled={disabled}/>
  </section>;
  return <section className="card online-maintenance-panel" aria-label="Quản trị dữ liệu trực tuyến">
    <h3>Quản lý dữ liệu online — tài khoản admin</h3>
    <p>Thao tác tại website duy nhất. Việc ghi dữ liệu thực hiện qua dịch vụ HTTPS xác thực độc lập, không cấp quyền xóa Firebase trực tiếp cho trình duyệt.</p>
    {!capabilities?.reads&&<p className="notice" role="status">Dịch vụ sao lưu online chưa được cấu hình hoặc chưa được phê duyệt. Không có thao tác dữ liệu nào được bật.</p>}
    {capabilities?.reads&&!capabilities?.writes&&<p className="notice">Dịch vụ hiện chỉ cho phép đọc/sao lưu; chức năng xóa, nạp và khôi phục đang khóa theo cổng nghiệm thu.</p>}
    <div className="toolbar">
      <button type="button" className="button primary" disabled={!canRead}
        onClick={()=>void download()}>{busy?'Đang xử lý…':'Tải backup có chữ ký máy chủ'}</button>
      <button type="button" className="button ghost" disabled={!canRead}
        onClick={()=>void reauth()}>Xác thực lại tài khoản Google</button>
    </div>
    <p className="muted">Trước khi thay dữ liệu: đóng băng chỉnh sửa, kiểm tra không còn khóa ô, tải và giữ backup đã kiểm tra. Tài khoản Auth/Rules không nằm trong backup này.</p>
    <fieldset disabled={!canMutate}>
      <legend>Chọn thao tác dữ liệu</legend>
      <label><input type="radio" checked={operation==='replace'} onChange={()=>{setOperation('replace');resetReview();}}/> Nạp Excel mới, thay thế toàn bộ danh sách đang hoạt động</label>
      <label><input type="radio" checked={operation==='restore'} onChange={()=>{setOperation('restore');resetReview();}}/> Khôi phục danh sách từ backup có chữ ký</label>
      <label><input type="radio" checked={operation==='clear'} onChange={()=>{setOperation('clear');resetReview();}}/> Xóa toàn bộ hồ sơ đang hoạt động (vẫn giữ các thế hệ cũ để khôi phục)</label>
    </fieldset>
    {operation==='replace'&&<div className="toolbar">
      <label className="field">Excel nghiệp vụ A–O (.xlsx)
        <input type="file" accept=".xlsx" disabled={!canMutate}
          onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void loadExcel(file);e.currentTarget.value='';}}/>
      </label>
      {excel&&<label className="field">Chọn sheet hợp lệ
        <select value={sheet} onChange={e=>{resetReview();setSheet(e.currentTarget.value);}}>
          <option value="">Chọn sheet…</option>
          {excel.inspected.validSheets.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
      </label>}
    </div>}
    {operation==='replace'&&comparison&&<p role="status">Xem trước: {comparison.oldCount} → <strong>{comparison.newCount} hồ sơ</strong>; thêm {comparison.difference.added.length}, thay đổi {comparison.difference.changed.length}, loại khỏi tập hoạt động {comparison.difference.removed.length}, giữ nguyên {comparison.difference.unchanged.length}.</p>}
    {operation==='restore'&&<label className="field">Backup JSON đã niêm phong
      <input type="file" accept=".json,application/json" disabled={!canMutate}
        onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void loadBackup(file);e.currentTarget.value='';}}/>
      {restoreFile&&<span>Đã chọn {restoreFile.name} · {restoreFile.inspection.activeRows} hồ sơ V2</span>}
    </label>}
    {operation==='clear'&&<p className="notice" role="alert"><strong>Lưu ý:</strong> Danh sách đang hoạt động sẽ về 0 hồ sơ. Cấu hình, phân quyền quản trị, lịch sử và thế hệ cũ không bị xóa vật lý.</p>}
    <label><input type="checkbox" checked={approvalChecklist} disabled={!canMutate}
      onChange={e=>setApprovalChecklist(e.currentTarget.checked)}/>
      Tôi đã đóng băng chỉnh sửa, tải backup từ máy chủ và hiểu rằng thay thế có thể làm mất nội dung mới hơn trong Excel/backup.</label>
    <div className="top-actions">
      <button type="button" className="button primary" disabled={!canMutate||!approvalChecklist||!backupDownloaded||
        backedUpEpoch!==currentEpoch||
        operation==='replace'&&!parsed||operation==='restore'&&!restoreFile||!!prepared}
        onClick={()=>void stage()}>{busy?'Đang xử lý…':'Chuẩn bị (chưa áp dụng)'}</button>
    </div>
    {prepared&&<section className="card" aria-label="Xác nhận thao tác toàn bộ dữ liệu">
      <p>Đã chuẩn bị: <strong>{prepared.oldCount} → {prepared.newCount}</strong> hồ sơ; mã <code>{prepared.operationId}</code>.</p>
      <p>Hết hạn: {new Date(prepared.expiresAt).toLocaleString('vi-VN')}. Dữ liệu thật chưa thay đổi.</p>
      <label className="field">Nhập nguyên văn: <code>{prepared.confirmation}</code>
        <input value={confirmation} onChange={e=>setConfirmation(e.currentTarget.value)}
          disabled={!canMutate||!!stale} autoComplete="off" placeholder="Nhập chính xác câu xác nhận"/>
      </label>
      {stale&&<p className="notice">Con trỏ dữ liệu đã thay đổi trong khi xem trước. Không được xác nhận tiếp.</p>}
      <button type="button" className="button danger" disabled={!canMutate||!!stale||
        backedUpEpoch!==currentEpoch||confirmation!==prepared.confirmation}
        onClick={()=>void commit()}>{busy?'Đang xác minh…':'Xác nhận thay thế trên máy chủ'}</button>
    </section>}
    {lastOperation&&<section className="card" aria-label="Tra cứu trạng thái giao dịch">
      <p>Mã thao tác gần nhất: <code>{lastOperation}</code></p>
      <button type="button" className="button ghost" disabled={!admin||busy}
        onClick={()=>void resolve()}>Tra cứu trạng thái trên máy chủ</button>
      {verifiedStatus&&<p role="status">Trạng thái: <strong>{verifiedStatus.status}</strong>. Không tạo mã mới nếu trạng thái chưa rõ.</p>}
    </section>}
    {backupDownloaded&&backedUpEpoch!==currentEpoch&&
      <p className="notice" role="alert">Bản backup vừa tải thuộc thế hệ khác.
        Hãy tải bản sao mới trước khi tiếp tục.</p>}
    {finalized&&<button type="button" className="button ghost"
      disabled={busy} onClick={()=>{
        resetReview();setBackupDownloaded(false);setBackedUpEpoch('');
        setReauthenticated(false);setApprovalChecklist(false);
        setExcel(null);setSheet('');setRestoreFile(null);setLastOperation('');
      }}>Bắt đầu thao tác quản trị mới</button>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    {error&&<p className="notice" role="alert">{error}</p>}
  </section>;
}
