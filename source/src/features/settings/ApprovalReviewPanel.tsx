import {useEffect,useMemo,useState} from 'react';
import type {Item} from '../../../shared/types';
import type {SheetConfig} from '../../data/sheet-config';
import type {FirebaseController,ReviewBaseline} from '../../state/use-firebase';
import {approvalIdentityWarnings,compareApprovedSnapshot,snapshotFromItems} from '../../domain/approval-review';
import {readSheet} from '../../data/sheets-repository';
import {Modal} from '../../components/Modal';
import {FreezeAdminPanel} from './FreezeAdminPanel';

export function ApprovalReviewPanel({source,items,loadedAt,hasDrafts,firebase,onClose}:{
  source:SheetConfig;items:Item[];loadedAt:string;hasDrafts:boolean;firebase:FirebaseController;onClose:()=>void;
}){
  const [baseline,setBaseline]=useState<ReviewBaseline|null>(null);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [confirm,setConfirm]=useState(false);
  const snapshot=useMemo(()=>snapshotFromItems(items,source.spreadsheetId+':'+source.gid),[items,source.spreadsheetId,source.gid]);
  const changes=useMemo(()=>baseline?compareApprovedSnapshot(baseline.snapshot,snapshot):[],[baseline,snapshot]);
  const identityWarnings=useMemo(()=>approvalIdentityWarnings(snapshot),[snapshot]);
  const added=changes.filter(c=>c.kind==='added').length;
  const removed=changes.filter(c=>c.kind==='removed').length;
  const modified=changes.filter(c=>c.kind==='modified').length;
  const read=async()=>{
    if(!firebase.isAdmin)return;
    setBusy(true);setError('');
    try{const found=await firebase.readReview(source);setBaseline(found);setLoaded(true);}
    catch(cause){setLoaded(false);setError(cause instanceof Error?cause.message:'Không đọc được mốc đã duyệt.');}
    finally{setBusy(false);}
  };
  useEffect(()=>{void read();},[source.url,firebase.isAdmin]);
  const lock=async()=>{
    setBusy(true);setError('');setNotice('');
    try{await firebase.saveEditingLock(!firebase.editingLocked);
      setNotice(firebase.editingLocked?'Đã mở quyền sửa thử trong WebApp cho người được cấp quyền.':'Đã khóa chế độ sửa thử trên WebApp với các tài khoản không phải quản trị.');}
    catch(cause){setError(cause instanceof Error?cause.message:'Không đổi được trạng thái khóa.');}
    finally{setBusy(false);}
  };
  const approve=async()=>{
    setBusy(true);setError('');setNotice('');
    try{
      // Re-read the actual source immediately before a new approval. Never approve stale UI state.
      const fresh=await readSheet(source);
      if(!fresh.items.length)throw new Error('Nguồn vừa đọc trả về 0 nội dung; không phê duyệt.');
      const verified=snapshotFromItems(fresh.items,source.spreadsheetId+':'+source.gid);
      if(approvalIdentityWarnings(verified).length)
        throw new Error('Nguồn đang có mã nội dung thiếu hoặc trùng, chưa thể phê duyệt an toàn.');
      if(JSON.stringify(verified.rows)!==JSON.stringify(snapshot.rows))
        throw new Error('Dữ liệu nguồn đã thay đổi kể từ lần đọc trên giao diện. Hãy bấm Đọc lại dữ liệu Sheets, xem các thay đổi mới rồi phê duyệt.');
      const next=await firebase.approveReview(source,verified,baseline?.revision??0,changes.length);
      setBaseline(next);setLoaded(true);setConfirm(false);
      setNotice('Mốc phê duyệt '+next.revision+' đã được lưu. Hệ thống bắt đầu theo dõi từ mốc vừa phê duyệt.');
    }catch(cause){setConfirm(false);setError(cause instanceof Error?cause.message:'Không thể phê duyệt. Bản mốc cũ được giữ.');}
    finally{setBusy(false);}
  };
  if(firebase.profile?.dataSource==='primary')return <section className="card" aria-label="Quản trị chốt số liệu Firebase">
    <div className="card-header"><div><h3>Quản trị và chốt số liệu</h3>
      <p className="muted">Nguồn chính: Firebase. Chốt số liệu không đọc Google Sheets, chỉ ghi biên nhận dữ liệu đã được máy chủ xác nhận.</p></div>
      <button type="button" className="button ghost" onClick={onClose}>Về tổng quan</button>
    </div>
    <FreezeAdminPanel firebase={firebase}/>
  </section>;
  return <section className="card" aria-label="Thay đổi từ lần phê duyệt">
    <div className="card-header"><div><h3>Kiểm soát thay đổi và phê duyệt</h3>
      <p className="muted">Chỉ tài khoản quản trị. So sánh dữ liệu Google Sheets đang hiển thị với mốc đã duyệt gần nhất.</p></div>
      <div className="top-actions"><button type="button" className="button ghost" onClick={()=>void read()} disabled={busy}>Đọc lại mốc đã duyệt</button><button type="button" className="button ghost" onClick={onClose}>Về tổng quan</button></div>
    </div>
    {firebase.profile?.dataSource==='primary'&&<FreezeAdminPanel firebase={firebase}/>} 
    <div className="approval-control">
      <div><strong>Quyền chỉnh sửa của người khác trong WebApp</strong>
        <p className="muted">{firebase.editingLocked?'Đang khóa: người khác chỉ xem, lọc và tra cứu.':'Đang mở: người được cấp quyền có thể sửa thử trên trình duyệt.'}</p>
        <p className="muted">Không khóa quyền chỉnh sửa trực tiếp trong file Google Sheets; muốn khóa file nguồn phải thiết lập quyền tại Google.</p></div>
      <button type="button" className={'button '+(firebase.editingLocked?'primary':'danger')} disabled={busy||!firebase.controlReady||!firebase.connected} onClick={()=>void lock()}>
        {firebase.editingLocked?'Mở sửa trên WebApp':'Khóa sửa trên WebApp'}
      </button>
    </div>
    {error&&<p className="error-text" role="alert">{error}</p>}
    {identityWarnings.length>0&&<details className="unknown-note" open><summary>{identityWarnings.length} cảnh báo định danh — tạm khóa phê duyệt</summary>
      <ul>{identityWarnings.map((message,index)=><li key={index}>{message}</li>)}</ul>
      <p>Hãy bổ sung mã nội dung duy nhất trong Sheets rồi đọc lại trước khi xác nhận mốc.</p></details>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    <p className="muted">Nguồn: {source.spreadsheetId} · GID {source.gid} · Đọc dữ liệu lần cuối: {loadedAt||'Chưa đọc thành công'}</p>
    {!loaded?<p className="notice">Chưa có kết quả đọc mốc. Hãy xác thực quản trị và bấm Đọc lại mốc đã duyệt.</p>:
      !baseline?<p className="notice">Chưa có lần phê duyệt đầu tiên cho nguồn này. Tạo mốc ban đầu để bắt đầu so sánh các lần đọc tiếp theo.</p>:
      <p className="notice"><strong>Mốc phê duyệt #{baseline.revision}</strong> · {new Date(baseline.approvedAt).toLocaleString('vi-VN')} · {baseline.approvedBy}</p>}
    {loaded&&baseline&&<><div className="approval-summary">
      <span><strong>{changes.length}</strong> nội dung có thay đổi</span><span>{added} mới</span><span>{modified} chỉnh sửa</span><span>{removed} không còn trong nguồn</span>
    </div>
    {changes.length===0?<p className="muted">Không có thay đổi so với mốc đã phê duyệt.</p>:
      <div className="approval-differences">{changes.map(row=><article className="approval-row" key={row.key}>
        <strong>{row.code}</strong> <span className="status-pill">{row.kind==='added'?'Mới':row.kind==='removed'?'Không còn':'Đã chỉnh sửa'}</span>
        {row.kind!=='modified'&&<p className="muted">{row.kind==='removed'?'Nội dung không còn xuất hiện trong bản Google Sheets mới.':'Nội dung mới so với mốc đã duyệt.'}</p>}
        {row.changes.map(change=><div className="approval-change" key={change.field}>
          <strong>{change.label}</strong><div><span className="muted">Trước:</span> {change.before||'—'}</div>
          <div><span className="muted">Hiện tại:</span> {change.after||'—'}</div>
        </div>)}
      </article>)}</div>}
    </>}
    <div className="top-actions">
      <button type="button" className="button primary" disabled={!firebase.isAdmin||!firebase.connected||!loaded||busy||!loadedAt||!items.length||hasDrafts||identityWarnings.length>0} onClick={()=>setConfirm(true)}>
        {baseline?'Phê duyệt dữ liệu hiện tại và đặt mốc mới':'Tạo mốc phê duyệt ban đầu'}
      </button>
      {hasDrafts&&<span className="muted">Cần lưu hoặc bỏ nháp trên trình duyệt trước khi phê duyệt.</span>}
    </div>
    {baseline&&baseline.history.length>0&&<details><summary>Lịch sử các lần phê duyệt ({baseline.history.length} mốc gần nhất)</summary>
      <ul>{baseline.history.map(entry=><li key={entry.revision}>Mốc #{entry.revision}: {new Date(entry.at).toLocaleString('vi-VN')} · {entry.changedCount} nội dung thay đổi trước khi duyệt</li>)}</ul>
    </details>}
    {confirm&&<Modal title="Xác nhận phê duyệt mốc dữ liệu" onClose={()=>{if(!busy)setConfirm(false);}}>
      <div className="modal-body"><p>Bạn sắp xác nhận bản dữ liệu đã đọc lúc <strong>{loadedAt}</strong> là mốc mới.</p>
        <p>{baseline?'Có '+changes.length+' nội dung thay đổi kể từ mốc trước.':'Đây là lần phê duyệt đầu tiên.'} Sau khi lưu thành công, thống kê thay đổi sẽ bắt đầu lại từ bản này.</p>
        <p className="muted">Hệ thống đọc lại Google Sheets trước khi lưu mốc, từ chối nếu bản đang xem đã cũ. Thao tác không sửa Google Sheets. Thay đổi phát sinh đồng thời ngay sau lần kiểm tra vẫn có thể cần đối chiếu lại.</p></div>
      <div className="modal-footer"><button type="button" className="button ghost" disabled={busy} onClick={()=>setConfirm(false)}>Chưa phê duyệt</button><button type="button" className="button primary" disabled={busy} onClick={()=>void approve()}>Xác nhận phê duyệt</button></div>
    </Modal>}
  </section>;
}
