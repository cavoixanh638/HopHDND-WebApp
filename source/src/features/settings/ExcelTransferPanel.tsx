import {useState} from 'react';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../../shared/types';
import {inspectBusinessWorkbook,readBusinessWorkbook,createBusinessTemplate,
  compareBusinessImport,type BusinessReadResult,type ImportIssue} from '../../data/business-excel';
import {AtomicDatasetReplacement,type StageReceipt} from '../../data/atomic-dataset-replacement';
import {ItemSummaryCards} from '../items/ItemSummaryCards';

type Props={
  items:Item[];isAdmin:boolean;disabled:boolean;onClose:()=>void;
  database?:Database;user?:User|null;
};
type LocalFile={name:string;bytes:ArrayBuffer;sheets:string[]};
const downloadTemplate=()=>{
  const bytes=createBusinessTemplate();
  const blob=new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='HopHDND_mau_A-O_giong_Google_Sheets.xlsx';a.click();
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
};
export function ExcelTransferPanel({items,isAdmin,disabled,onClose,database,user}:Props){
  const [file,setFile]=useState<LocalFile|null>(null);
  const [sheet,setSheet]=useState('');
  const [preview,setPreview]=useState<BusinessReadResult|null>(null);
  const [stage,setStage]=useState<StageReceipt|null>(null);
  const [activeView,setActiveView]=useState<'list'|'report'>('list');
  const [confirm,setConfirm]=useState(false);
  const [typed,setTyped]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [lookupId,setLookupId]=useState('');
  const [restoreId,setRestoreId]=useState('');
  const enabled=!!database&&!!user&&isAdmin&&!disabled;
  const service=database?new AtomicDatasetReplacement(database,()=>user??null):null;
  const reset=()=>{setPreview(null);setStage(null);setTyped('');setConfirm(false);
    setError('');setNotice('');};
  const choose=async(selected:File|null)=>{
    reset();setFile(null);setSheet('');
    if(!selected)return;
    try{
      if(!/\.xlsx$/i.test(selected.name))throw Error('Chỉ chấp nhận tệp .xlsx.');
      const bytes=await selected.arrayBuffer();
      const inspected=inspectBusinessWorkbook(bytes);
      setFile({name:selected.name,bytes,sheets:inspected.sheets});
      if(inspected.sheets.length===1)setSheet(inspected.sheets[0]);
      else setNotice('Tệp có nhiều sheet. Hãy chọn đúng sheet chứa bảng dữ liệu A–O; sẽ không tự chọn sheet đầu.');
    }catch(cause){setError((cause as Error).message);}
  };
  const parse=()=>{
    if(!file||!sheet)return;
    reset();
    try{
      const result=readBusinessWorkbook(file.bytes,sheet);
      setPreview(result);
      if(result.issues.length)setError('Tệp có '+result.issues.length+' lỗi. Hãy sửa toàn bộ; không bỏ qua dòng lỗi.');
      else setNotice('Đã kiểm tra '+result.items.length+' hồ sơ; CHƯA ghi dữ liệu nào lên Firebase.');
    }catch(cause){setError((cause as Error).message);}
  };
  const dryRun=async()=>{
    if(!preview||preview.issues.length||!preview.items.length||!file||!service||!enabled)return;
    setBusy(true);setError('');setNotice('');
    try{
      const operationId=crypto.randomUUID().replace(/-/g,'');
      const receipt=await service.stage(preview.items,file.name,operationId);
      setStage(receipt);setTyped('');setConfirm(false);
      setNotice('Ứng viên đã được máy chủ đọc lại và đối chiếu. Bản sao lưu riêng tư đã tạo; dữ liệu đang dùng CHƯA thay đổi.');
    }catch(cause){setError((cause as Error).message);}
    finally{setBusy(false);}
  };
  const apply=async()=>{
    if(!stage||!file||!enabled||!confirm||
      typed!==`THAY TOAN BO ${stage.newCount}`||!service)return;
    setBusy(true);setError('');setNotice('');
    try{
      const result=await service.activate(stage.operationId,file.name);
      if(!result.confirmed)throw Error('Máy chủ chưa xác nhận đầy đủ.');
      setNotice('ĐÃ XÁC NHẬN trên server và đọc lại đủ '+result.count+
        ' hồ sơ. Mã thao tác '+result.operationId+'. Bản sao lưu giữ riêng tư.');
      setStage(null);setPreview(null);setConfirm(false);setTyped('');
    }catch(cause){
      setError((cause as Error).message+' Không tự gửi lại thao tác. Tra cứu mã ở phía dưới.');
    }finally{setBusy(false);}
  };
  const lookup=async()=>{
    if(!service||!lookupId.trim())return;
    setBusy(true);setError('');
    try{setNotice('Mã '+lookupId+': '+await service.status(lookupId.trim()));}
    catch(cause){setError((cause as Error).message);}
    finally{setBusy(false);}
  };
  const restore=async()=>{
    if(!service||!restoreId.trim()||!enabled||!file)return;
    setBusy(true);setError('');setStage(null);
    try{
      const newOp=crypto.randomUUID().replace(/-/g,'');
      const receipt=await service.restore(restoreId.trim(),newOp);
      setStage(receipt);setFile({...file,name:'KHOI PHUC '+restoreId.trim()});
      setConfirm(false);setTyped('');
      setNotice('Bản sao lưu đã được tạo thành ứng viên KHÔI PHỤC. Chưa thay dữ liệu đang sử dụng; hãy xác nhận riêng.');
    }catch(cause){setError((cause as Error).message);}
    finally{setBusy(false);}
  };
  const rows=stage?.newPreview??preview?.items??[];
  const diff=stage?.changes??compareBusinessImport(items,rows);
  const issues:ImportIssue[]=preview?.issues??[];
  return <section className="card business-excel-transfer" aria-label="Nhập Excel A–O thay toàn bộ dữ liệu">
    <div className="card-header"><div><h3>Nhập Excel A–O vào Firebase</h3>
      <p className="muted">File Excel chỉ là nguồn nhập; Danh sách và Báo cáo vận hành từ Firebase. Chỉ quản trị viên được thao tác.</p>
    </div><button className="button ghost" disabled={busy} onClick={onClose}>Về chế độ xem</button></div>
    <p className="notice">Thay toàn bộ hồ sơ là thao tác quan trọng. Không nhập nối. Dữ liệu cũ chỉ rời tập đang hoạt động sau khi bản ứng viên và sao lưu được máy chủ kiểm chứng. Không xóa cấu hình, quản trị viên hoặc bản sao lưu.</p>
    <div className="top-actions"><button type="button" className="button ghost" onClick={downloadTemplate}>
      Tải mẫu Excel A–O đúng cấu trúc nguồn</button></div>
    <label className="field">Chọn tệp Excel .xlsx
      <input type="file" accept=".xlsx" disabled={busy||!isAdmin}
        onChange={event=>void choose(event.currentTarget.files?.[0]??null)}/>
    </label>
    {file&&<><p><strong>Tệp:</strong> {file.name} · {file.sheets.length} sheet</p>
      <label className="field">Chọn sheet có dữ liệu
        <select value={sheet} disabled={busy||stage!==null} onChange={event=>{setSheet(event.currentTarget.value);reset();}}>
          <option value="">— Chọn đúng sheet —</option>
          {file.sheets.map(name=><option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <button type="button" className="button primary" disabled={!sheet||busy||stage!==null}
        onClick={parse}>A. Kiểm tra toàn bộ file và xem trước</button>
    </>}
    {error&&<p className="error-text" role="alert">{error}</p>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    {issues.length>0&&<div className="table-wrap" aria-label="Lỗi file Excel theo sheet/dòng/cột">
      <table className="data-table"><thead><tr><th>Sheet</th><th>Dòng</th><th>Cột</th><th>Lỗi</th></tr></thead>
      <tbody>{issues.map((problem,i)=><tr key={i}><td>{problem.sheet}</td><td>{problem.row}</td>
        <td>{problem.column}</td><td>{problem.message}</td></tr>)}</tbody></table>
    </div>}
    {preview&&!issues.length&&<section className="notice" aria-label="Xem trước dữ liệu ứng viên">
      <h3>Dữ liệu thử — chưa áp dụng</h3>
      <p>Hồ sơ: <strong>{rows.length}</strong> · NQ QPPL: <strong>{preview.statistics.total.qppl}</strong>
        {' '}· NQ HC: <strong>{preview.statistics.total.hc}</strong>
        {' '}· BC: <strong>{preview.statistics.total.bc}</strong></p>
      <p>Thêm: <strong>{diff.added}</strong> · Thay đổi: <strong>{diff.changed}</strong>
        {' '}· Không đổi: {diff.unchanged} · Loại khỏi tập hoạt động: <strong>{diff.removed}</strong></p>
      <div className="top-actions">
        <button className="button ghost" aria-pressed={activeView==='list'} onClick={()=>setActiveView('list')}>Xem thử Danh sách</button>
        <button className="button ghost" aria-pressed={activeView==='report'} onClick={()=>setActiveView('report')}>Xem thử Báo cáo</button>
      </div>
      {activeView==='report'?<ItemSummaryCards items={rows} selection={null} onSelect={()=>{}} onClear={()=>{}} visibleCount={rows.length}/>:
        <div className="table-wrap"><table className="data-table"><thead><tr><th>Mã</th><th>Nội dung</th><th>Loại VB</th><th>Sở</th><th>Tiến độ hiện tại</th></tr></thead>
          <tbody>{rows.slice(0,50).map(item=><tr key={item.recordId}><td>{item.displayCode}</td>
            <td>{item.content}</td><td>{item.type}</td><td>{item.department}</td><td>{item.specificProgress}</td></tr>)}</tbody>
        </table></div>}
      {rows.length>50&&<p className="muted">Đang hiển thị 50 hồ sơ đầu; kiểm tra áp dụng cho đủ {rows.length} hồ sơ.</p>}
      {!stage&&<button className="button primary" disabled={busy||!enabled} onClick={()=>void dryRun()}>
        B. Tạo ứng viên, sao lưu riêng và kiểm tra đọc lại</button>}
    </section>}
    {stage&&file&&<section className="notice" aria-label="Xác nhận thay toàn bộ">
      <h3>C. Xác nhận thay toàn bộ sau khi thử nhập đạt</h3>
      <p><strong>Tệp:</strong> {file.name} · <strong>Sheet:</strong> {sheet} ·
        Hồ sơ đang dùng: <strong>{stage.oldCount}</strong> · Hồ sơ mới: <strong>{stage.newCount}</strong></p>
      <p>Mã thao tác: <code>{stage.operationId}</code>. Bản sao lưu riêng tư đã đọc lại và đối chiếu.
        Những hồ sơ không có trong file mới sẽ rời tập hoạt động. Không tự nhập lại nếu mất mạng.</p>
      <label className="field"><input type="checkbox" checked={confirm} disabled={busy}
        onChange={event=>setConfirm(event.currentTarget.checked)}/>
        Tôi hiểu thao tác thay toàn bộ, đã xem dữ liệu thử và đồng ý chuyển sang tập mới.
      </label>
      <label className="field">Nhập chính xác <code>THAY TOAN BO {stage.newCount}</code>
        <input autoComplete="off" value={typed} disabled={busy} onChange={event=>setTyped(event.currentTarget.value)}/>
      </label>
      <button className="button danger" disabled={!enabled||busy||!confirm||typed!==`THAY TOAN BO ${stage.newCount}`}
        onClick={()=>void apply()}>D. Thay toàn bộ bằng một giao dịch nguyên tử</button>
    </section>}
    {isAdmin&&<details><summary>Tra cứu thao tác bị ngắt / khôi phục bản sao lưu</summary>
      <label className="field">Mã thao tác cần kiểm tra
        <input value={lookupId} onChange={event=>setLookupId(event.currentTarget.value)}/></label>
      <button className="button ghost" disabled={busy||!lookupId} onClick={()=>void lookup()}>Tra cứu trạng thái server</button>
      <label className="field">Mã bản sao lưu muốn khôi phục
        <input value={restoreId} onChange={event=>setRestoreId(event.currentTarget.value)}/></label>
      <button className="button ghost" disabled={!enabled||busy||!restoreId||!file}
        onClick={()=>void restore()}>Tạo ứng viên khôi phục — chưa áp dụng</button>
    </details>}
    {!enabled&&<p className="notice">Cần tài khoản Google quản trị, kết nối Firebase và không có phần sửa chưa lưu. Không có quyền thì không thể tạo ứng viên hoặc thay dữ liệu.</p>}
  </section>;
}
