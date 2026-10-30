import {useState} from 'react';
import {get,ref,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item,ReportConfig} from '../../../shared/types';
import {ReportTable} from '../reports/ReportTable';
import {datasetPreviewFingerprint} from '../../data/dataset-preview-fingerprint';
import {stageDatasetReplacement,readStagedDataset,commitDatasetReplacement,
  prepareInitialDatasetActivation,commitInitialDatasetActivation,
  resolveDatasetOperation,restoreDatasetBackup,type ReplacementApproval,
  type InitialActivationApproval}
  from '../../data/firebase-versioned-replacement';
import type {ActiveDatasetPointer} from '../../data/dataset-replacement-integrity';
import {activeEditLeaseCount,readFreeze,type FreezeControl} from '../../data/freeze-control';

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
  fileName,reports,active,enabled,readyForMutation=true,comparisonStale=false}:{
  database:Database;user:User|null;items:readonly Item[];
  current:readonly Item[];fileName:string;reports:readonly ReportConfig[];
  active?:ActiveDatasetPointer|null;enabled:boolean;
  readyForMutation?:boolean;comparisonStale?:boolean;
}){
  const [approval,setApproval]=useState<ReplacementApproval|InitialActivationApproval|null>(null);
  const [initialFreeze,setInitialFreeze]=useState<FreezeControl|null>(null);
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
  const isInitial=!!approval&&!('expected' in approval);
  const stale=!!approval&&(comparisonStale||baseline!==now||
    (isInitial?!!active:!active||active.generationId!==(approval as ReplacementApproval).expected.generationId||
    active.operationId!==(approval as ReplacementApproval).expected.operationId||
    active.revision!==(approval as ReplacementApproval).expected.revision||
    active.rowCount!==(approval as ReplacementApproval).expected.rowCount||
    active.digest!==(approval as ReplacementApproval).expected.digest));
  const allowed=enabled&&readyForMutation;
  const frozen=async(requireFrozen:boolean):Promise<FreezeControl|null>=>{
    if(!requireFrozen)return null;
    const confirmed=await readFreeze(database);
    if(confirmed.mode!=='FROZEN'||confirmed.revision<1||confirmed.epoch<1||
      confirmed.closedAt<=0)throw Error('Phải Đóng băng (FROZEN) và nhận ACK Firebase trước khi kích hoạt V2.');
    const activeLeases=await activeEditLeaseCount(database);
    if(activeLeases>0)throw Error('Còn '+activeLeases+' lease đang hoạt động; dừng kích hoạt V2.');
    return confirmed;
  };
  const stage=async()=>{
    // Disabled controls alone are not a transaction fence. Also refuse a
    // forced handler invocation when previous CAS ACK is still UNKNOWN.
    if(!allowed||!user||comparisonStale||
      (operationView?.status==='unknown'&&
        (submittedCommit===approval?.operationId||submittedRestore!==null)))return;
    setBusy(true);setMessage('');setOperationView(null);setBackupOperation('');
    setSubmittedCommit(null);setSubmittedRestore(null);
    setApproval(null);setStaged(null);setConfirm('');setInitialFreeze(null);
    try{
      const freeze=await frozen(!active);
      const operationId='excel_'+crypto.randomUUID().replaceAll('-','_');
      const result=active
        ?await stageDatasetReplacement(database,user,items,operationId,fileName)
        :await prepareInitialDatasetActivation(database,user,items,operationId,fileName);
      const serverItems=await readStagedDataset(database,result as ReplacementApproval);
      // The candidate/backup were independently read back by the backend.
      // Re-check active legacy freeze before allowing first-time confirmation.
      if(!active){
        const latest=await frozen(true);
        if(!latest||latest.revision!==freeze?.revision||latest.epoch!==freeze.epoch)
          throw Error('Freeze revision/epoch đã đổi khi lập staging; không được kích hoạt.');
      }
      setInitialFreeze(freeze);setApproval(result);setStaged(serverItems);setBaseline(now);
      setMessage(active?'Đã ghi staging, xác minh máy chủ và backup thế hệ riêng tư. Chưa thay dữ liệu.':
        'Đã xác minh staging SHA-256, backup legacy riêng tư và trạng thái FROZEN; chưa kích hoạt V2.');
    }catch(e){setMessage(e instanceof Error?e.message:'Không tạo được staging và backup.');}
    finally{setBusy(false);}
  };
  const commit=async()=>{
    if(!approval||!allowed||!user||stale||submittedCommit===approval.operationId)return;
    setSubmittedCommit(approval.operationId);
    setBusy(true);setMessage('');setOperationView(null);
    setLookupOperation(approval.operationId);
    try{
      if(!('expected' in approval)){
        const latest=await frozen(true);
        if(!initialFreeze||latest?.revision!==initialFreeze.revision||
          latest.epoch!==initialFreeze.epoch)
          throw Error('Freeze revision/epoch đã thay đổi. Phê duyệt khởi tạo không còn hợp lệ.');
      }
      const outcome='expected' in approval
        ?await commitDatasetReplacement(database,user,approval,confirm)
        :await commitInitialDatasetActivation(database,user,approval,confirm);
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
      if(verified.committed&&'expected' in approval)setBackupOperation(approval.operationId);
    }catch(e){
      // L1 can throw when a valid COMMITTED operation becomes historical
      // between the transaction and acknowledgment. One READ ONLY lookup
      // distinguishes that successful historical commit from a genuine unknown.
      const observed=await readOperationView(database,approval.operationId);
      setOperationView(observed.committed?observed:presentDatasetOperation(null,approval.operationId));
      if(observed.committed&&'expected' in approval)setBackupOperation(approval.operationId);
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
      // Recovery after reload/lost ACK requires a server-verified COMMITTED
      // operation AND an existing private V2 backup for that operation.
      // Legacy first activation has a DIFFERENT private legacyBackups path
      // and must never be offered as an ordinary V2 rollback candidate.
      if(observed.committed&&active){
        try{
          const backup=(await get(ref(database,'hdnd/datasetV2/backups/'+operationId))).val();
          if(typeof backup==='string'&&backup.length>0)setBackupOperation(operationId);
          else setMessage('Không có backup V2 riêng tư cho mã này; không mở khôi phục.');
        }catch{
          setMessage('Chưa xác minh được backup riêng tư; không mở khôi phục khi thiếu quyền hoặc mạng.');
        }
      }
    }finally{setBusy(false);}
  };
  const restore=async()=>{
    if(!allowed||!active||!user||!backupOperation||
      !/^[A-Za-z0-9_-]{12,80}$/.test(restoreId)||
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
    <h4>{active?'Thay dữ liệu theo thế hệ':'Kích hoạt V2 lần đầu từ legacy'} — chỉ Firebase Emulator</h4>
    <p>Chức năng ghi thật trên Emulator, không có quyền ghi production trong bản Draft. Hồ sơ mới không được kế thừa quyền hoặc lịch sử từ mã cũ.</p>
    {!active&&<p role="status">Chỉ sử dụng sau khi quản trị đã chủ động đóng băng FROZEN ở mục Quản trị; không tự chốt dữ liệu hoặc kích hoạt V2.</p>}
    {!readyForMutation&&<p role="alert" className="notice">Còn bản nháp, thao tác đang chạy hoặc dữ liệu chưa được xác minh; không ghi staging/commit.</p>}
    <button className="button primary" disabled={busy||!allowed||comparisonStale||
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
      <p>Nhập chính xác: <code>{(isInitial?'KHOI TAO V2 ':'THAY ')+approval.operationId+' '+
        (isInitial?(approval as InitialActivationApproval).legacyRowCount:approval.preview.oldCount)+
        ' '+approval.preview.newCount}</code></p>
      <input value={confirm} onChange={e=>setConfirm(e.currentTarget.value)}
        aria-label={isInitial?'Xác nhận kích hoạt V2 lần đầu':'Xác nhận thay thế toàn bộ'}/>
      <button className="button danger" disabled={busy||stale||!allowed||
        submittedCommit===approval.operationId||
        confirm!==(isInitial?'KHOI TAO V2 ':'THAY ')+approval.operationId+' '+
          (isInitial?(approval as InitialActivationApproval).legacyRowCount:approval.preview.oldCount)+
          ' '+approval.preview.newCount}
        onClick={()=>void commit()}>{isInitial?'Kích hoạt V2 lần đầu bằng CAS':'Chuyển thế hệ bằng CAS'}</button>
    </section>}
    <div className="field"><label htmlFor="v2-operation-lookup">Tra cứu operationId (không tự gửi lại)</label>
      <input id="v2-operation-lookup" value={lookupOperation} onChange={e=>setLookupOperation(e.currentTarget.value)}
        placeholder={approval?.operationId??'Mã thao tác trước đó'} />
      <button className="button ghost" disabled={busy||!enabled} onClick={()=>void check()}>Tra cứu trạng thái operationId</button>
    </div>
    {backupOperation&&active&&<section>
      <h4>Khôi phục từ backup riêng tư</h4>
      <p>Backup của thao tác <code>{backupOperation}</code> đã được xác minh.
        Nhập mã thao tác khôi phục mới (12–80 ký tự), rồi xác nhận riêng.
        Kích hoạt V2 từ legacy không phải backup thay thế thế hệ thông thường.</p>
      <input value={restoreId} onChange={e=>setRestoreId(e.currentTarget.value)}
        aria-label="Mã khôi phục mới"/>
      <input value={restoreConfirm} onChange={e=>setRestoreConfirm(e.currentTarget.value)}
        aria-label="Xác nhận khôi phục" placeholder="KHOI PHUC mã_khôi_phục"/>
      <button className="button danger" disabled={busy||!allowed||submittedRestore===restoreId||
        !/^[A-Za-z0-9_-]{12,80}$/.test(restoreId)||restoreConfirm!=='KHOI PHUC '+restoreId}
        onClick={()=>void restore()}>Khôi phục bằng CAS</button>
    </section>}
    {operationView&&<p className="notice" role={operationView.status==='unknown'?'alert':'status'}
      aria-label={'Trạng thái thao tác '+operationView.status}>{operationView.message}</p>}
    {message&&<p className="notice" role="status">{message}</p>}
  </section>;
}
