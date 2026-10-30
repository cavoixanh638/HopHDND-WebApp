import {useState} from 'react';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item,ReportConfig} from '../../../shared/types';
import {ReportTable} from '../reports/ReportTable';
import {datasetPreviewFingerprint} from '../../data/dataset-preview-fingerprint';
import {stageDatasetReplacement,readStagedDataset,commitDatasetReplacement,
  resolveDatasetOperation,restoreDatasetBackup,type ReplacementApproval}
  from '../../data/firebase-versioned-replacement';
import type {ActiveDatasetPointer} from '../../data/dataset-replacement-integrity';

/** Explicitly opt-in during emulator QA only. No production action is exposed. */
export function VersionedExcelReplacementPanel({database,user,items,current,
  fileName,reports,active,enabled}:{database:Database;user:User|null;items:readonly Item[];
  current:readonly Item[];fileName:string;reports:readonly ReportConfig[];
  active:ActiveDatasetPointer;enabled:boolean}){
  const [approval,setApproval]=useState<ReplacementApproval|null>(null);
  const [staged,setStaged]=useState<Item[]|null>(null);
  const [confirm,setConfirm]=useState('');
  const [backupOperation,setBackupOperation]=useState('');
  const [restoreId,setRestoreId]=useState('');
  const [restoreConfirm,setRestoreConfirm]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [baseline,setBaseline]=useState('');
  const now=datasetPreviewFingerprint(current);
  const stale=!!approval&&(baseline!==now||active.generationId!==approval.expected.generationId||
    active.revision!==approval.expected.revision);
  const stage=async()=>{
    if(!enabled||!user)return;
    setBusy(true);setMessage('');setApproval(null);setStaged(null);setConfirm('');
    try{
      const operationId='excel_'+crypto.randomUUID().replaceAll('-','_');
      const result=await stageDatasetReplacement(database,user,items,operationId,fileName);
      const serverItems=await readStagedDataset(database,result);
      setApproval(result);setStaged(serverItems);setBaseline(now);
      setMessage('Đã ghi staging, xác minh máy chủ và backup riêng tư. Chưa chuyển thế hệ.');
    }catch(e){setMessage(e instanceof Error?e.message:'Không tạo được staging và backup.');}
    finally{setBusy(false);}
  };
  const commit=async()=>{
    if(!approval||!enabled||!user||stale)return;
    setBusy(true);
    try{
      const outcome=await commitDatasetReplacement(database,user,approval,confirm);
      if(outcome.status==='unknown')setMessage('CHƯA RÕ TRẠNG THÁI: tra cứu mã thao tác, không tự nhập lại.');
      else{setMessage('Đã xác minh '+outcome.status+' trên Firebase Emulator.');setBackupOperation(approval.operationId);}
    }catch(e){setMessage(e instanceof Error?e.message:'Giao dịch bị từ chối; không thử lại tự động.');}
    finally{setBusy(false);}
  };
  const check=async()=>{
    if(!approval)return;
    setMessage('Trạng thái máy chủ: '+await resolveDatasetOperation(database,approval.operationId));
  };
  const restore=async()=>{
    if(!enabled||!user||!backupOperation)return;
    setBusy(true);
    try{
      const result=await restoreDatasetBackup(database,user,backupOperation,restoreId,
        active,restoreConfirm);
      setMessage('Khôi phục '+result.status+'; xác minh bản dữ liệu mới trước khi phát hành.');
    }catch(e){setMessage(e instanceof Error?e.message:'Khôi phục không thành công.');}
    finally{setBusy(false);}
  };
  return <section className="card" aria-label="Thử nghiệm thế hệ Firebase">
    <h4>Thay dữ liệu theo thế hệ — chỉ Firebase Emulator</h4>
    <p>Chức năng ghi thật trên Emulator, không có quyền ghi production trong bản Draft. Hồ sơ mới không được kế thừa quyền hoặc lịch sử từ mã cũ.</p>
    <button className="button primary" disabled={busy||!enabled} onClick={()=>void stage()}>
      Ghi staging, đọc lại và sao lưu thử nghiệm</button>
    {approval&&staged&&<section aria-label="Xem trước dữ liệu staging">
      <p>Ứng viên {approval.manifest.generationId}: {staged.length} hồ sơ;
        SHA-256 {approval.manifest.digest.slice(0,16)}…</p>
      <h4>Danh sách thử nghiệm ({staged.length} hồ sơ)</h4>
      <div className="table-wrap"><table className="data-table"><thead><tr>
        <th>Mã</th><th>Nội dung</th><th>Sở, ngành</th><th>Tiến độ</th>
      </tr></thead><tbody>{staged.map(item=><tr key={item.recordId}>
        <td>{item.displayCode}</td><td>{item.content}</td><td>{item.department}</td>
        <td>{item.specificProgress}</td></tr>)}</tbody></table></div>
      <h4>Báo cáo thử nghiệm</h4>
      {reports.map(config=><ReportTable key={config.id} items={staged}
        config={config} group="department" preview
        sourceLabel="DỮ LIỆU THỬ — CHƯA ÁP DỤNG" onSelect={()=>{}}/>)}
      {stale&&<p role="alert" className="notice">Thế hệ hoặc dữ liệu đang dùng đã thay đổi;
        bản phê duyệt cũ bị vô hiệu hóa. Tạo staging mới, không nhập lại mã thao tác cũ.</p>}
      <p>Nhập chính xác: <code>{'THAY '+approval.operationId+' '+approval.preview.oldCount+
        ' '+approval.preview.newCount}</code></p>
      <input value={confirm} onChange={e=>setConfirm(e.currentTarget.value)}
        aria-label="Xác nhận thay thế toàn bộ"/>
      <button className="button danger" disabled={busy||stale||!enabled||
        confirm!=='THAY '+approval.operationId+' '+approval.preview.oldCount+' '+approval.preview.newCount}
        onClick={()=>void commit()}>Chuyển thế hệ bằng CAS</button>
      <button className="button ghost" disabled={busy} onClick={()=>void check()}>
        Tra cứu trạng thái operationId</button>
    </section>}
    {backupOperation&&<section>
      <h4>Khôi phục từ backup riêng tư</h4>
      <p>Nhập mã thao tác khôi phục mới (12–80 ký tự), rồi xác nhận riêng.</p>
      <input value={restoreId} onChange={e=>setRestoreId(e.currentTarget.value)}
        aria-label="Mã khôi phục mới"/>
      <input value={restoreConfirm} onChange={e=>setRestoreConfirm(e.currentTarget.value)}
        aria-label="Xác nhận khôi phục" placeholder="KHOI PHUC mã_khôi_phục"/>
      <button className="button danger" disabled={busy||!enabled||restoreConfirm!=='KHOI PHUC '+restoreId}
        onClick={()=>void restore()}>Khôi phục bằng CAS</button>
    </section>}
    {message&&<p className="notice" role="status">{message}</p>}
  </section>;
}
