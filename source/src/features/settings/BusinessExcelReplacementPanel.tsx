import {useState} from 'react';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../../shared/types';
import {businessExcelTemplate,inspectBusinessExcel,listBusinessExcelSheets,type BusinessExcelResult} from '../../data/business-excel';
import {
  planDatasetReplacement,stageDatasetReplacement,verifyStagedDataset,
  backupBeforeReplacement,activateDatasetReplacement,restoreDatasetBackup,
  verifyReplacementOutcome,type ReplacementPlan
} from '../../data/versioned-dataset-replacement';

type Preview=BusinessExcelResult & {fileName:string;bytes:Uint8Array};
type Props={
  items:Item[];database?:Database;user?:User|null;
  isAdmin:boolean;disabled?:boolean;replacementEnabled?:boolean;
  onComplete?:()=>void;
};
const sheetLabel=(i:number)=>i.toLocaleString('vi-VN');
const classify=(items:readonly Item[])=>({
  total:items.length,
  qppl:items.filter(r=>r.documentKind==='NQ'&&/qppl/i.test(r.type)).length,
  hc:items.filter(r=>r.documentKind==='NQ'&&!/qppl/i.test(r.type)).length,
  bc:items.filter(r=>r.documentKind==='BC').length,
  unclassified:items.filter(r=>r.documentKind==='UNCLASSIFIED').length,
  firstStage:items.filter(r=>/chưa trình/i.test(r.specificProgress)).length
});
const downloadTemplate=()=>{
  const bytes=businessExcelTemplate();
  const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const anchor=document.createElement('a');anchor.href=url;
  anchor.download='HopHDND_mau_Excel_A-O.xlsx';anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
export function BusinessExcelReplacementPanel({
  items,database,user,isAdmin,disabled=false,replacementEnabled=false,onComplete
}:Props){
  const [filename,setFilename]=useState(''),[bytes,setBytes]=useState<Uint8Array|null>(null);
  const [sheets,setSheets]=useState<string[]>([]),[sheet,setSheet]=useState('');
  const [preview,setPreview]=useState<Preview|null>(null),[plan,setPlan]=useState<ReplacementPlan|null>(null);
  const [stage,setStage]=useState<'none'|'candidate'|'backed-up'|'applied'>('none');
  const [error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [confirm,setConfirm]=useState('');
  const [restoreOp,setRestoreOp]=useState(''),[restoreConfirm,setRestoreConfirm]=useState('');
  const reset=()=>{
    setPreview(null);setPlan(null);setStage('none');setConfirm('');
    setError('');
  };
  const load=async(file:File)=>{
    reset();setFilename(file.name);setBytes(null);setSheets([]);setSheet('');
    if(!/\.xlsx$/i.test(file.name)){setError('Chỉ nhận file .xlsx.');return;}
    try{
      const content=new Uint8Array(await file.arrayBuffer());
      const found=listBusinessExcelSheets(content);
      setBytes(content);setSheets(found);
      if(found.length===1)setSheet(found[0]);
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
  };
  const inspect=async()=>{
    if(!bytes||!sheet||!database||!user||!isAdmin)return;
    reset();setBusy(true);
    try{
      const checked=inspectBusinessExcel(bytes,sheet);
      setPreview({...checked,fileName:filename,bytes});
      if(checked.issues.length)return;
      setPlan(await planDatasetReplacement(database,user,filename,checked.items));
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  };
  const runStage=async()=>{
    if(!plan||!database||!user||!replacementEnabled)return;
    setBusy(true);setError('');
    try{
      await stageDatasetReplacement(database,user,plan);
      await verifyStagedDataset(database,user,plan);
      setStage('candidate');
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  };
  const backup=async()=>{
    if(!plan||!database||!user||stage!=='candidate'||!replacementEnabled)return;
    setBusy(true);setError('');
    try{await backupBeforeReplacement(database,user,plan);setStage('backed-up');}
    catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  };
  const apply=async()=>{
    if(!plan||!database||!user||stage!=='backed-up'||!replacementEnabled)return;
    if(confirm!==`THAY TOÀN BỘ ${plan.filename}`){
      setError('Phải nhập chính xác câu xác nhận và tên file trước khi thay thế.');return;
    }
    setBusy(true);setError('');
    try{
      await activateDatasetReplacement(database,user,plan,plan.filename);
      setStage('applied');onComplete?.();
    }catch(cause){
      // A failed HTTP acknowledgement does not imply the pointer was not set.
      let message=cause instanceof Error?cause.message:String(cause);
      try{
        const outcome=await verifyReplacementOutcome(database,plan.operationId,plan.digest);
        if(outcome==='APPLIED'){setStage('applied');onComplete?.();message='Máy chủ đã xác nhận thao tác thành công sau khi kiểm tra lại.';}
        else if(outcome==='UNKNOWN')message+=' Kết quả chưa rõ; không gửi lại thao tác. Tra cứu mã '+plan.operationId+'.';
      }catch{message+=' Mất kết nối, không được tự bấm nhập lại. Mã thao tác: '+plan.operationId;}
      setError(message);
    }finally{setBusy(false);}
  };
  const restore=async()=>{
    if(!database||!user||!isAdmin||!replacementEnabled||!restoreOp||
      restoreConfirm!==`KHÔI PHỤC ${restoreOp}`)return;
    setBusy(true);setError('');
    try{
      await restoreDatasetBackup(database,user,restoreOp,crypto.randomUUID());
      onComplete?.();setRestoreConfirm('');setStage('none');
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}
    finally{setBusy(false);}
  };
  const totals=preview&&!preview.issues.length?classify(preview.items):null;
  const valid=preview&&preview.issues.length===0&&plan;
  return <section className="card business-excel-import" aria-label="Nhập và thay toàn bộ từ Excel">
    <div className="card-header"><h3>Kiểm tra Excel nghiệp vụ — thay toàn bộ dữ liệu</h3></div>
    <p>File sử dụng đúng 15 cột A–O của bảng nghiệp vụ. Không yêu cầu các trường kỹ thuật
      recordId/documentKind. Chọn file chỉ kiểm tra tại trình duyệt, chưa ghi Firebase.</p>
    <button type="button" className="button ghost" onClick={downloadTemplate}>
      Tải mẫu Excel A–O
    </button>
    {!isAdmin&&<p role="status">Chỉ quản trị viên Google được kiểm tra và áp dụng file.</p>}
    {isAdmin&&<label className="field">Chọn file .xlsx
      <input type="file" accept=".xlsx" disabled={disabled||busy}
        onChange={event=>{const f=event.currentTarget.files?.[0];if(f)void load(f);
          event.currentTarget.value='';}}/>
    </label>}
    {sheets.length>0&&<label className="field">Chọn sheet dữ liệu
      <select value={sheet} disabled={disabled||busy} onChange={event=>{
        reset();setSheet(event.currentTarget.value);
      }}>
        <option value="">— Chọn sheet —</option>
        {sheets.map(name=><option key={name} value={name}>{name}</option>)}
      </select>
    </label>}
    {isAdmin&&<button type="button" className="button primary"
      disabled={!bytes||!sheet||!database||!user||disabled||busy} onClick={()=>void inspect()}>
      {busy?'Đang kiểm tra…':'Kiểm tra toàn bộ file'}
    </button>}
    {preview&&<div className="notice" role="status">
      <strong>{preview.fileName}</strong> · Sheet: <strong>{preview.sheet}</strong>
      {' · '}Dòng nội dung: {sheetLabel(preview.sourceRows)}
      {' · '}Dòng tiêu đề nhóm nhận diện: {sheetLabel(preview.sectionRows)}
      {preview.issues.length>0&&<>
        <p role="alert">Có {preview.issues.length} lỗi. Không được chạy thử hay thay dữ liệu.</p>
        <div className="table-wrap"><table><thead><tr><th>Sheet</th><th>Dòng</th><th>Cột</th><th>Vấn đề</th></tr></thead>
          <tbody>{preview.issues.map((issue,i)=><tr key={i}><td>{issue.sheet}</td>
            <td>{issue.row}</td><td>{issue.column}</td><td>{issue.message}</td></tr>)}</tbody></table></div>
      </>}
    </div>}
    {totals&&valid&&<section className="business-excel-candidate-preview" aria-label="Dữ liệu thử — chưa áp dụng">
      <h4>Dữ liệu thử — chưa áp dụng</h4>
      <p>Tổng: {totals.total} · NQ QPPL: {totals.qppl} · NQ HC: {totals.hc} · BC: {totals.bc}
        {' · '}Chưa phân loại: {totals.unclassified} · Chưa trình: {totals.firstStage}</p>
      <p>So với tập hiện tại ({items.length}): thêm {plan.added}, thay đổi {plan.changed},
        loại khỏi tập hoạt động {plan.removed}. Mã thao tác: <code>{plan.operationId}</code>.</p>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Mã</th><th>Nội dung</th><th>Loại VB</th><th>Tiến độ hiện tại</th></tr></thead>
        <tbody>{preview.items.map(row=><tr key={row.recordId}>
          <td>{row.displayCode}</td><td>{row.content}</td><td>{row.type}</td>
          <td>{row.specificProgress}</td></tr>)}</tbody>
      </table></div>
    </section>}
    {valid&&!replacementEnabled&&<p className="notice" role="status">
      Chưa mở nút áp dụng: phải được kiểm toán độc lập cơ chế dữ liệu theo phiên bản,
      sao lưu riêng tư, Firebase Rules và phục hồi trên Emulator trước khi được phát hành.
      Bản xem trước không thay đổi dữ liệu.
    </p>}
    {valid&&replacementEnabled&&isAdmin&&<div className="top-actions">
      <button type="button" disabled={busy||disabled||stage!=='none'}
        onClick={()=>void runStage()}>1. Tạo và đọc lại tập dữ liệu thử</button>
      <button type="button" disabled={busy||disabled||stage!=='candidate'}
        onClick={()=>void backup()}>2. Sao lưu và kiểm tra bản cũ</button>
      {stage==='backed-up'&&<label className="field">Gõ chính xác: THAY TOÀN BỘ {plan.filename}
        <input value={confirm} disabled={busy} onChange={event=>setConfirm(event.target.value)}/>
      </label>}
      <button type="button" className="button danger" disabled={busy||disabled||
        stage!=='backed-up'||confirm!==`THAY TOÀN BỘ ${plan.filename}`}
        onClick={()=>void apply()}>3. Xác nhận thay toàn bộ (chuyển phiên bản nguyên tử)</button>
      {stage==='applied'&&<p role="status">Máy chủ đã xác nhận dữ liệu mới; giữ nguyên sao lưu.</p>}
    </div>}
    {replacementEnabled&&isAdmin&&<section>
      <h4>Khôi phục bản đã sao lưu</h4>
      <p>Chỉ chuyển con trỏ về bộ dữ liệu đã xác minh, không xóa bộ hiện tại.</p>
      <label className="field">Mã thao tác sao lưu
        <input value={restoreOp} onChange={event=>{setRestoreOp(event.target.value);setRestoreConfirm('');}}/>
      </label>
      <label className="field">Xác nhận: KHÔI PHỤC {restoreOp}
        <input value={restoreConfirm} onChange={event=>setRestoreConfirm(event.target.value)}/>
      </label>
      <button className="button danger" disabled={busy||disabled||!restoreOp||
        restoreConfirm!==`KHÔI PHỤC ${restoreOp}`} onClick={()=>void restore()}>
        Khôi phục dữ liệu đã sao lưu
      </button>
    </section>}
    {error&&<p role="alert" className="error-text">{error}</p>}
  </section>;
}
