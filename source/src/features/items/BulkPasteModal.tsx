import {useState} from 'react';
import type {Item,TextField} from '../../../shared/types';
import {displayId} from '../../domain/display-id';
import {Modal} from '../../components/Modal';
import {BULK_PASTE_COLUMNS,planBulkPaste,
  type BulkPastePlan,type BulkPatch} from './bulk-paste';

/** Browser-only staged paste. No file upload; no server or lease write. */
export function BulkPasteModal({rows,onClose,onApply,canEdit,live=false}:{
  rows:readonly Item[];onClose:()=>void;live?:boolean;
  onApply:(patches:readonly BulkPatch[])=>Promise<void>|void;
  canEdit:(id:string,field:TextField)=>boolean;
}){
  const [rowId,setRowId]=useState(rows[0]?.recordId??'');
  const [field,setField]=useState<TextField>('content');
  const [clipboard,setClipboard]=useState('');
  const [plan,setPlan]=useState<BulkPastePlan|null>(null);
  const [error,setError]=useState('');
  const [applying,setApplying]=useState(false);
  const reset=()=>{setPlan(null);setError('');};
  const preview=()=>{
    reset();
    try{setPlan(planBulkPaste({rows,startRecordId:rowId,startField:field,
      text:clipboard,canEdit}));}
    catch(cause){setError(cause instanceof Error?cause.message:'Không kiểm tra được vùng dán.');}
  };
  const apply=async()=>{
    if(!plan||applying)return;
    setApplying(true);
    try{
      const fresh=planBulkPaste({rows,startRecordId:rowId,startField:field,
        text:clipboard,canEdit});
      if(JSON.stringify(fresh)!==JSON.stringify(plan))
        throw Error('Dữ liệu đã thay đổi, cần xem trước lại.');
      await onApply(fresh.patches);
      onClose();
    }catch(cause){setError(cause instanceof Error?cause.message:'Không áp dụng được dữ liệu.');setPlan(null);}
    finally{setApplying(false);}
  };
  return <Modal title="Dán dữ liệu hàng loạt từ Excel" className="bulk-paste-modal" onClose={onClose}>
    <div className="modal-body bulk-paste-body">
      <p>Copy một cột hoặc vùng ô liền nhau từ Excel, sau đó dán vào ô dưới.
        Chỉ các cột nguồn <strong>C–O</strong> được sửa; không thay ID/STT.
        Dữ liệu được đối chiếu theo thứ tự <strong>các dòng đang hiển thị</strong>.</p>
      <div className="bulk-paste-settings">
        <label className="field">Dòng bắt đầu
          <select aria-label="Dòng bắt đầu dán Excel" value={rowId}
            onChange={e=>{setRowId(e.currentTarget.value);reset();}}>
            {rows.map(item=><option key={item.recordId} value={item.recordId}>
              {displayId(item)} · {item.content.slice(0,60)}
            </option>)}
          </select>
        </label>
        <label className="field">Cột bắt đầu (Excel)
          <select aria-label="Cột bắt đầu dán Excel" value={field}
            onChange={e=>{setField(e.currentTarget.value as TextField);reset();}}>
            {BULK_PASTE_COLUMNS.map(c=><option key={c.key} value={c.key}>
              {c.letter} · {c.label}
            </option>)}
          </select>
        </label>
      </div>
      <label className="field">Dán vùng đã copy từ Excel (Ctrl+V)
        <textarea rows={7} aria-label="Dán dữ liệu nhiều ô từ Excel"
          placeholder={'Ví dụ: Nội dung 1\tSở Tài chính\nNội dung 2\tSở Nội vụ'}
          value={clipboard} onChange={e=>{setClipboard(e.currentTarget.value);reset();}}/>
      </label>
      <p className="muted">Ô trống luôn được bỏ qua (không xóa nội dung cũ).
        Một lỗi về số dòng, trạng thái hay quyền sửa sẽ chặn <strong>toàn bộ</strong> vùng dán.
        {live
          ?' Khi xác nhận, ứng dụng xin khóa ô, kiểm tra dữ liệu mới và tạo bản nháp để Firebase tự lưu từng hồ sơ. Nếu lưu bị lỗi, kiểm tra kết quả trước khi thử lại; không có cam kết giao dịch nhiều hồ sơ nguyên khối.'
          :' Bản xem thử chỉ ghi vào bộ nhớ RAM, không gửi Firebase hoặc Google Sheets.'}</p>
      {error&&<p role="alert" className="notice error-text">{error}</p>}
      {plan&&<section className="bulk-paste-review" aria-label="Xem trước dữ liệu dán">
        <p role="status">Dự kiến sửa <strong>{plan.cells.length} ô</strong> trên
          <strong> {plan.patches.length} hồ sơ</strong>
          {' · '}vùng copy {plan.rowsCovered} hàng × {plan.columnsCovered} cột.</p>
        <div className="table-wrap">
          <table className="data-table"><thead><tr>
            <th>ID</th><th>Cột</th><th>Nội dung cũ</th><th>Sẽ thay bằng</th>
          </tr></thead><tbody>
            {plan.cells.slice(0,12).map((cell,index)=><tr key={cell.recordId+'-'+cell.field+'-'+index}>
              <td>{cell.code}</td><td>{cell.column}</td>
              <td className="bulk-paste-cell-text">{cell.before||'—'}</td>
              <td className="bulk-paste-cell-text">{cell.after}</td>
            </tr>)}
          </tbody></table>
        </div>
        {plan.cells.length>12&&<small>Hiển thị 12/{plan.cells.length} ô thay đổi; toàn bộ vùng đã được kiểm tra.</small>}
      </section>}
    </div>
    <div className="modal-footer">
      <button type="button" className="button ghost" disabled={applying} onClick={onClose}>Hủy, không thay dữ liệu</button>
      <button type="button" className="button" disabled={!clipboard||!rowId||applying}
        onClick={preview}>Kiểm tra và xem trước</button>
      <button type="button" className="button primary" disabled={!plan||applying}
        onClick={()=>void apply()}>{applying?'Đang xin khóa và kiểm tra…':
          live?'Xác nhận áp dụng '+(plan?.cells.length??0)+' ô trên Firebase':
          'Xác nhận dán '+(plan?.cells.length??0)+' ô vào RAM'}</button>
    </div>
  </Modal>;
}
