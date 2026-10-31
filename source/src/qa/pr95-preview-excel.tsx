/** Standalone PR95 L4 file workflow, using the real local Excel parsers.
 * No Firebase import/replacement/staging/restore service is reachable.
 */
import {useState} from 'react';
import type {Item} from '../../shared/types';
import {createExcel,readExcel} from '../data/excel-transfer';
import {createBusinessExcelTemplate,inspectBusinessExcel,parseBusinessExcel,
  type BusinessExcelInspection} from '../data/business-excel';
import {previewDatasetReplacement} from '../data/dataset-replacement-preview';

type Mode='business'|'technical';
const download=(bytes:Uint8Array,name:string)=>{
  const blob=new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();
  anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
};
export function Pr95PreviewExcel({role,items,onReplace}:{
  role:'admin'|'guest';items:Item[];onReplace:(next:Item[])=>void;
}){
  const [mode,setMode]=useState<Mode>('business');
  const [file,setFile]=useState<{name:string;bytes:Uint8Array;inspection?:BusinessExcelInspection}|null>(null);
  const [sheet,setSheet]=useState('');
  const [candidate,setCandidate]=useState<Item[]|null>(null);
  const [error,setError]=useState('');
  const [confirm,setConfirm]=useState(false);
  const admin=role==='admin';
  // Defense in depth: guest never mounts file input, export, or review controls.
  // Parent also guards the page and every replace action.
  if(!admin)return null;
  const choose=async(upload?:File)=>{
    setError('');setCandidate(null);setFile(null);setSheet('');setConfirm(false);
    if(!upload)return;
    try{
      if(!/\.xlsx$/i.test(upload.name))throw Error('Chỉ chọn file .xlsx cục bộ.');
      if(upload.size>5*1024*1024)throw Error('File Excel vượt 5 MB.');
      const bytes=new Uint8Array(await upload.arrayBuffer());
      const inspection=mode==='business'?inspectBusinessExcel(bytes):undefined;
      setFile({name:upload.name,bytes,inspection});
    }catch(cause){setError(cause instanceof Error?cause.message:'Không đọc được Excel.');}
  };
  const check=()=>{
    setError('');setCandidate(null);setConfirm(false);
    if(!file)return;
    try{
      const result=mode==='business'?parseBusinessExcel(file.bytes,sheet).items:
        readExcel(file.bytes).items;
      if(!result.length)throw Error('Tệp không có hồ sơ hợp lệ.');
      setCandidate(result);
    }catch(cause){setError(cause instanceof Error?cause.message:'Dữ liệu không hợp lệ.');}
  };
  const delta=candidate?previewDatasetReplacement(items,candidate):null;
  return <section className="card pr95-preview-excel" aria-label="Excel cục bộ mô phỏng">
    <h2>Excel: nhập / xuất / kiểm tra file</h2>
    <p>Đây là workflow <strong>chỉ trong trình duyệt</strong>. Tệp được đọc bằng parser thật
      nhưng không tải lên máy chủ. Nút áp dụng chỉ thay thế danh sách giả trong RAM,
      không staging, backup, chuyển thế hệ, ghi Firebase hay tạo tài khoản.</p>
    <div className="toolbar">
      <button className="button ghost" type="button" onClick={()=>{
        try{download(createBusinessExcelTemplate(),'HDND_mau_nghiep_vu_A-O.xlsx');}
        catch(cause){setError(String(cause));}
      }}>Tải mẫu A–O thật</button>
      <button className="button ghost" type="button" onClick={()=>{
        try{download(createExcel(items),'HDND_du_lieu_gia_ky_thuat.xlsx');}
        catch(cause){setError(String(cause));}
      }}>Xuất dữ liệu giả hiện tại</button>
      <button className="button ghost" type="button" onClick={()=>{
        try{download(createExcel([]),'HDND_mau_ky_thuat.xlsx');}
        catch(cause){setError(String(cause));}
      }}>Tải mẫu kỹ thuật</button>
    </div>
    <label className="field">Định dạng cần kiểm tra
      <select aria-label="Định dạng Excel" value={mode} onChange={e=>{
        setMode(e.currentTarget.value as Mode);setFile(null);setCandidate(null);setSheet('');setError('');
      }}>
        <option value="business">Nghiệp vụ A–O (chọn sheet)</option>
        <option value="technical">Excel xuất từ ứng dụng (có recordId)</option>
      </select>
    </label>
    <label className="field">Chọn file Excel cục bộ (.xlsx, tối đa 5 MB)
      <input type="file" accept=".xlsx" aria-label="Chọn file Excel cục bộ"
        onChange={e=>{void choose(e.currentTarget.files?.[0]);e.currentTarget.value='';}}/>
    </label>
    {file&&<div className="pr95-preview-file-state">
      <p role="status">Tệp cục bộ: <strong>{file.name}</strong>{file.inspection?
        ' · '+file.inspection.sheetNames.length+' sheet':''}</p>
      {mode==='business'&&<label className="field">Sheet A–O
        <select aria-label="Sheet A–O" value={sheet}
          onChange={e=>{setSheet(e.currentTarget.value);setCandidate(null);setConfirm(false);}}>
          <option value="">Chọn sheet, không tự chọn sheet đầu</option>
          {file.inspection?.sheetNames.map(name=><option key={name} value={name}>
            {name}{file.inspection?.validSheets.includes(name)?' · Đúng tiêu đề':' · Kiểm tra lỗi'}
          </option>)}
        </select>
      </label>}
      <button type="button" className="button primary"
        disabled={mode==='business'&&!sheet} onClick={check}>Kiểm tra toàn bộ file</button>
    </div>}
    {error&&<p className="notice" role="alert">{error}</p>}
    {candidate&&delta&&<section aria-label="Xem trước Excel chưa áp dụng" className="pr95-preview-file-result">
      <h3>Xem trước chưa áp dụng</h3>
      <p><strong>{candidate.length}</strong> hồ sơ hợp lệ · NQ {delta.totals.total.nq} (QPPL {delta.totals.total.qppl}, HC {delta.totals.total.hc})
        · BC {delta.totals.total.bc}.</p>
      <p>Thêm {delta.difference.added.length}; thay đổi {delta.difference.changed.length};
        không còn {delta.difference.removed.length}; giữ nguyên {delta.difference.unchanged.length}.
        Đây là phép so sánh bằng domain hiện hành.</p>
      <div className="table-wrap"><table className="data-table"><thead><tr>
        <th>Mã</th><th>Nội dung</th><th>Đơn vị</th><th>Tiến độ hiện tại</th><th>Ghi chú</th>
      </tr></thead><tbody>{candidate.slice(0,12).map(item=><tr key={item.recordId}>
        <td>{item.displayCode}</td><td>{item.content}</td><td>{item.department}</td>
        <td>{item.specificProgress}</td><td>{item.note}</td>
      </tr>)}</tbody></table></div>
      {candidate.length>12&&<p>Hiển thị 12/{candidate.length}; parser đã kiểm tra toàn bộ.</p>}
      {admin?<div className="pr95-preview-file-actions">
        <button type="button" className="button ghost" onClick={()=>{setCandidate(null);setConfirm(false);}}>
          Hủy bản xem trước</button>
        {!confirm?<button type="button" className="button primary" onClick={()=>setConfirm(true)}>
          Dùng dữ liệu này trong bản demo (RAM)</button>:<div role="group" aria-label="Xác nhận thay dữ liệu mô phỏng">
          <p>Thay {items.length} hồ sơ giả bằng {candidate.length} hồ sơ chỉ trong bộ nhớ? Quyền giả sẽ đặt lại.</p>
          <button type="button" className="button ghost" onClick={()=>setConfirm(false)}>Quay lại</button>
          <button type="button" className="button primary" onClick={()=>{
            onReplace(candidate);setCandidate(null);setConfirm(false);
          }}>Xác nhận thay dữ liệu RAM</button></div>}
      </div>:<p className="notice">Khách chỉ được xem trước và xuất dữ liệu giả;
        không được thay danh sách mô phỏng.</p>}
    </section>}
    <p className="muted">Không hỗ trợ đăng nhập Google, Firebase live import, lease, server CAS, staging,
      backup, replace hoặc restore trên trang này. Để kiểm nghiệm nghiệp vụ thật phải dùng môi trường Emulator.</p>
  </section>;
}
