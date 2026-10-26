import { useState } from 'react';
import type { Item } from '../../../shared/types';
import { Modal } from '../../components/Modal';
import { useRecoverableDraft } from '../../state/use-recoverable-draft';
import { displayId } from '../../domain/display-id';

export function ContentEditor({ item, onSave, onClose, sourceKey, field = "content",sourceKind,draftOnly=false }: { item: Item; onSave: (content: string) => boolean | void; onClose: () => void; sourceKey:string;field?:"content"|"note"|"specificProgress";sourceKind?:string;draftOnly?:boolean }) {
  const label=field === "content" ? "Nội dung trình" : field==="specificProgress"?"Tiến độ hiện tại":"Ghi chú";
  const {draft:content,setDraft:setContent,dirty,clearCheckpoint,recoveryMessage,checkpointMessage,unmatchedCheckpoint,restoreOldDraft,discardOldDraft} = useRecoverableDraft(`${field}:${sourceKey}:${item.recordId}`,item[field],value=>{if(typeof value!=='string'||value.length>20000)throw new Error('Nội dung nháp không hợp lệ.');return value;});
  const [error, setError] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const close = () => { if (!dirty) onClose(); else setConfirmDiscard(true); };
  const save = () => { if (field === "content" && !content.trim()) { setError('Nội dung không được để trống.'); return; } if(onSave(content.trim())===false){setError('Quyền sửa đã thay đổi hoặc chức năng sửa tạm bị khóa. Nội dung vẫn được giữ trong cửa sổ này.');return;} clearCheckpoint();onClose(); };
  if(unmatchedCheckpoint)return <Modal title="Có phần sửa trên dữ liệu gốc cũ" onClose={onClose}><div className="modal-body"><p>Phần sửa cũ vẫn giữ trên trình duyệt. Nạp để đối chiếu không ghi vào file nguồn.</p></div><div className="modal-footer"><button className="button ghost" onClick={onClose}>Giữ phần sửa trên máy và đóng</button><button className="button danger" onClick={discardOldDraft}>Bỏ phần sửa cũ</button><button className="button primary" onClick={restoreOldDraft}>Nạp phần sửa để đối chiếu</button></div></Modal>;
  if (confirmDiscard) return <Modal title={`Áp dụng ${label.toLowerCase()} trước khi đóng?`} onClose={() => setConfirmDiscard(false)}><div className="modal-body"><p>Nội dung trong cửa sổ này đã thay đổi.</p>{error&&<p className="error-text">{error}</p>}</div><div className="modal-footer"><button className="button ghost" onClick={() => setConfirmDiscard(false)}>Tiếp tục sửa nội dung</button><button className="button danger" onClick={()=>{clearCheckpoint();onClose();}}>Bỏ sửa trong cửa sổ và đóng</button><button className="button primary" onClick={save}>Áp dụng vào bảng và đóng</button></div></Modal>;
  return <Modal title={`${label} · ${displayId(item)}`} onClose={close}>
    <div className="modal-body"><label className="field">{label}<textarea autoFocus rows={9} maxLength={20000} value={content} onChange={e => setContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); save(); } }} /></label>{error && <p className="error-text" role="alert">{error}</p>}{recoveryMessage&&<p className="notice">{recoveryMessage}</p>}<p className="muted" role="status">{checkpointMessage}</p><p className="muted">{draftOnly?'Thay đổi thử chỉ giữ trên trình duyệt, không ghi Google Sheets hoặc Firebase.':(sourceKind==='firebase'||sourceKind==='supabase')?`Bấm Áp dụng để đưa nội dung vào bảng và tự lưu ${sourceKind==='supabase'?'Supabase':'Firebase'}. Đóng khi chưa áp dụng sẽ có cảnh báo.`:'Thay đổi này mới giữ trên trình duyệt. Để ghi vào Excel, dùng nút Lưu thay đổi vào file nguồn khi chức năng ghi sẵn sàng.'}</p></div>
    <div className="modal-footer"><button className="button ghost" onClick={close}>Hủy</button><button className="button primary" onClick={save}>Áp dụng vào bảng</button></div>
  </Modal>;
}

