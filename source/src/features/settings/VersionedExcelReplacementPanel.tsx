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

/** UI-only presentation of the L1 ACKed API-CHANGE-02 contract. */
export type OperationViewStatus =
  'committed-active'|'committed-historical'|'not-committed'|'unknown';
export interface OperationView {
  status:OperationViewStatus;
  message:string;
  committed:boolean;
}

/**
 * Accept the exact new L1 wire shape. A legacy string reply, mismatched ID,
 * malformed payload or unexpected status is UNKNOWN, never "not committed".
 * During independent branch work L1 may still expose the old string signature.
 */
export function presentDatasetOperation(raw:unknown,operationId:string):OperationView {
  const unknown:OperationView={status:'unknown',committed:false,
    message:'CHƯA RÕ TRẠNG THÁI thao tác '+operationId+
      '. Không tự gửi lại thao tác. Tra cứu lại operationId sau khi máy chủ sẵn sàng.'};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return unknown;
  const value=raw as {status?:unknown;operationId?:unknown;generationId?:unknown};
  if(value.operationId!==operationId||
    // In V2, an operation can only commit its immutable gen_<operationId>.
    // A contradictory optional generationId is not reliable evidence of success.
    (value.generationId!==undefined&&value.generationId!=='gen_'+operationId))
    return unknown;
  const generation=value.generationId?' — thế hệ '+value.generationId:'';
  if(value.status==='committed-active')
    return {status:'committed-active',committed:true,
      message:'ĐÃ COMMIT THÀNH CÔNG — ĐANG HOẠT ĐỘNG: '+operationId+generation+'.'};
  if(value.status==='committed-historical')
    return {status:'committed-historical',committed:true,
      message:'ĐÃ COMMIT THÀNH CÔNG TRONG LỊCH SỬ: '+operationId+generation+
        '. Thao tác không còn là thế hệ đang hoạt động; KHÔNG PHẢI thất bại.'};
  if(value.status==='not-committed')
    return {status:'not-committed',committed:false,
      message:'CHƯA GHI NHẬN COMMIT cho thao tác '+operationId+
        '. Không tự gửi lại; đối chiếu staging và trạng thái máy chủ trước khi quyết định.'};
  return unknown;
}

/** One read-only query, no retry. Read failures cannot prove non-commit. */
export async function readOperationView(database:Database,operationId:string):Promise<OperationView>{
  try {
    const raw:unknown=await resolveDatasetOperation(database,operationId);
    return presentDatasetOperation(raw,operationId);
  } catch {
    return presentDatasetOperation(null,operationId);
  }
}

/** Explicitly opt-in during emulator QA only. No production action is exposed. */
export function VersionedExcelReplacementPanel({database,user,items,current,
  fileName,reports,active,enabled}:{database:Database;user:User|null;items:readonly Item[];
  current:readonly Item[];fileName:string;reports:readonly ReportConfig[];
  active:ActiveDatasetPointer;enabled:boolean}){
  const [approval,setApproval]=useState<ReplacementApproval|null>(null);
  const [staged,setStaged]=useState<Item[]|null>(null);
  const [confirm,setConfirm]=useState('');
  const [backupOperation,setBackupOperation]=useState('');
  const [lookupOperation,setLookupOperation]=useState('');
  const [restoreId,setRestoreId]=useState('');
  const [restoreConfirm,setRestoreConfirm]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
  const [operationView,setOperationView]=useState<OperationView|null>(null);
  // Terminal per-operation UI fence: a lost ACK never triggers a second write.
  const [submittedCommit,setSubmittedCommit]=useState<string|null>(null);
  const [submittedRestore,setSubmittedRestore]=useState<string|null>(null);
  const [baseline,setBaseline]=useState('');
  const now=datasetPreviewFingerprint(current);
  const stale=!!approval&&(baseline!==now||active.generationId!==approval.expected.generationId||
    active.operationId!==approval.expected.operationId||active.revision!==approval.expected.revision||
    active.rowCount!==approval.expected.rowCount||active.digest!==approval.expected.digest);
  const stage=async()=>{
    if(!enabled||!user)return;
    setBusy(true);setMessage('');setOperationView(null);setBackupOperation('');
    setSubmittedCommit(null);setSubmittedRestore(null);
    setApproval(null);setStaged(null);setConfirm('');
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
    if(!approval||!enabled||!user||stale||submittedCommit===approval.operationId)return;
    setSubmittedCommit(approval.operationId);
    setBusy(true);setMessage('');setOperationView(null);
    setLookupOperation(approval.operationId);
    try{
      const outcome=await commitDatasetReplacement(database,user,approval,confirm);
      if(outcome.status==='unknown'){
        setOperationView(presentDatasetOperation(null,approval.operationId));
        return; // Lost ACK: never send the commit again automatically.
      }
      const observed=await readOperationView(database,approval.operationId);
      // If the commit API confirmed success but a status read disagrees, this is
      // ambiguous, NOT proof of a failed commit. Never silently retry.
      const verified=observed.status==='not-committed'
        ?presentDatasetOperation(null,approval.operationId):observed;
      setOperationView(verified);
      if(verified.committed)setBackupOperation(approval.operationId);
    }catch(e){
      // L1 can throw when a valid COMMITTED operation becomes historical
      // between the transaction and acknowledgment. One READ ONLY lookup
      // distinguishes that successful historical commit from a genuine unknown.
      const observed=await readOperationView(database,approval.operationId);
      setOperationView(observed.committed?observed:presentDatasetOperation(null,approval.operationId));
      if(observed.committed)setBackupOperation(approval.operationId);
      else setMessage('Không xác minh được kết quả ghi: '+
        (e instanceof Error?e.message:'lỗi kết nối')+'. Không tự gửi lại thao tác.');
    }finally{setBusy(false);}
  };
  const check=async()=>{
    if(!enabled)return;
    const operationId=lookupOperation.trim()||approval?.operationId||'';
    if(!/^[A-Za-z0-9_-]{12,80}$/.test(operationId)){
      setOperationView(null);
      setMessage('Nhập mã operationId hợp lệ để tra cứu; không suy đoán trạng thái.');return;
    }
    setBusy(true);setMessage('');setOperationView(null);
    try{
      const observed=await readOperationView(database,operationId);
      setOperationView(observed);
      // Recovery after reload/lost ACK requires a fresh server confirmation.
      if(observed.committed&&approval?.operationId===operationId)setBackupOperation(operationId);
    }finally{setBusy(false);}
  };
  const restore=async()=>{
    if(!enabled||!user||!backupOperation||!/^[A-Za-z0-9_-]{12,80}$/.test(restoreId)||
      submittedRestore===restoreId)return;
    setSubmittedRestore(restoreId);
    setBusy(true);setMessage('');setOperationView(null);
    setLookupOperation(restoreId);
    try{
      const result=await restoreDatasetBackup(database,user,backupOperation,restoreId,
        active,restoreConfirm);
      if(result.status==='unknown'){
        setOperationView(presentDatasetOperation(null,restoreId));
        return; // Do not blindly retry restore after an unknown acknowledgement.
      }
      const observed=await readOperationView(database,restoreId);
      setOperationView(observed.status==='not-committed'
        ?presentDatasetOperation(null,restoreId):observed);
    }catch(e){
      const observed=await readOperationView(database,restoreId);
      setOperationView(observed.committed?observed:presentDatasetOperation(null,restoreId));
      if(!observed.committed)setMessage('Không xác minh được kết quả khôi phục: '+
        (e instanceof Error?e.message:'lỗi kết nối')+'. Không tự khôi phục lại.');
    }finally{setBusy(false);}
  };
  return <section className="card" aria-label="Thử nghiệm thế hệ Firebase">
    <h4>Thay dữ liệu theo thế hệ — chỉ Firebase Emulator</h4>
    <p>Chức năng ghi thật trên Emulator, không có quyền ghi production trong bản Draft. Hồ sơ mới không được kế thừa quyền hoặc lịch sử từ mã cũ.</p>
    <button className="button primary" disabled={busy||!enabled||
      (operationView?.status==='unknown'&&
        (submittedCommit===approval?.operationId||submittedRestore!==null))}
      onClick={()=>void stage()}>
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
        submittedCommit===approval.operationId||
        confirm!=='THAY '+approval.operationId+' '+approval.preview.oldCount+' '+approval.preview.newCount}
        onClick={()=>void commit()}>Chuyển thế hệ bằng CAS</button>
    </section>}
    <div className="field"><label htmlFor="v2-operation-lookup">Tra cứu operationId (không tự gửi lại)</label>
      <input id="v2-operation-lookup" value={lookupOperation} onChange={e=>setLookupOperation(e.currentTarget.value)}
        placeholder={approval?.operationId??'Mã thao tác trước đó'} />
      <button className="button ghost" disabled={busy||!enabled} onClick={()=>void check()}>Tra cứu trạng thái operationId</button>
    </div>
    {backupOperation&&<section>
      <h4>Khôi phục từ backup riêng tư</h4>
      <p>Nhập mã thao tác khôi phục mới (12–80 ký tự), rồi xác nhận riêng.</p>
      <input value={restoreId} onChange={e=>setRestoreId(e.currentTarget.value)}
        aria-label="Mã khôi phục mới"/>
      <input value={restoreConfirm} onChange={e=>setRestoreConfirm(e.currentTarget.value)}
        aria-label="Xác nhận khôi phục" placeholder="KHOI PHUC mã_khôi_phục"/>
      <button className="button danger" disabled={busy||!enabled||submittedRestore===restoreId||
        !/^[A-Za-z0-9_-]{12,80}$/.test(restoreId)||restoreConfirm!=='KHOI PHUC '+restoreId}
        onClick={()=>void restore()}>Khôi phục bằng CAS</button>
    </section>}
    {operationView&&<p className="notice" role={operationView.status==='unknown'?'alert':'status'}
      aria-label={'Trạng thái thao tác '+operationView.status}>{operationView.message}</p>}
    {message&&<p className="notice" role="status">{message}</p>}
  </section>;
}
