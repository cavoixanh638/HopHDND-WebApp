import {useMemo,useState} from 'react';
import type {Item} from '../../../shared/types';
import {parseSheetConfig} from '../../data/sheet-config';
import {readSheet} from '../../data/sheets-repository';
import {planTransitionImport,readTransitionalExcel,type TransitionPlan,type TransitionRowChange} from '../../data/transition-import';

type SourcePreview={origin:'google'|'excel';name:string;receivedAt:number;plan:TransitionPlan;warnings:string[]};
export function TransitionImportPanel({items,sheetUrl,disabled,onApply}:{
  items:Item[];sheetUrl:string;disabled:boolean;
  onApply:(entries:TransitionRowChange[])=>Promise<number>;
}){
  const [source,setSource]=useState<'google'|'excel'>('google');
  const [url,setUrl]=useState(sheetUrl);
  const [preview,setPreview]=useState<SourcePreview|null>(null);
  const [checked,setChecked]=useState<string[]>([]);
  const [ack,setAck]=useState('');
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  const [error,setError]=useState('');
  const chosen=useMemo(()=>preview?.plan.changes.filter(row=>checked.includes(row.recordId))??[],[preview,checked]);
  const clear=()=>{setPreview(null);setChecked([]);setAck('');setMessage('');setError('');};
  const load=async(file?:File)=>{
    if(disabled||busy)return;
    clear();setBusy(true);
    try{
      let rows:Item[],warnings:string[],origin:'google'|'excel'=source,name='';
      if(source==='google'){
        const config=parseSheetConfig(url);
        const snapshot=await readSheet(config);
        rows=snapshot.items;warnings=snapshot.warnings;
        name='Google Sheets · '+config.spreadsheetId+' / '+config.gid;
      }else{
        if(!file)throw new Error('Hãy chọn một file .xlsx.');
        if(!/\.xlsx$/i.test(file.name))throw new Error('Chỉ hỗ trợ file .xlsx.');
        const result=readTransitionalExcel(await file.arrayBuffer());
        rows=result.items;warnings=result.warnings;name=file.name;
      }
      const plan=planTransitionImport(rows,items);
      setPreview({origin,name,receivedAt:Date.now(),plan,warnings});
      setMessage('Đã đọc nguồn và đối chiếu trên trình duyệt. Chưa ghi bất kỳ dữ liệu nào lên Firebase.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Không kiểm tra được nguồn dữ liệu.');}
    finally{setBusy(false);}
  };
  const apply=async()=>{
    if(!preview||!chosen.length||ack!=='CAP NHAT FIREBASE'||busy||disabled)return;
    setError('');setMessage('');setBusy(true);
    try{
      if(Date.now()-preview.receivedAt>10*60*1000)throw new Error('Bản xem trước đã quá 10 phút. Hãy đọc lại nguồn và đối chiếu mới.');
      const saved=await onApply(chosen);
      setMessage('Đã nhận xác nhận đọc lại Firebase cho '+saved+' hồ sơ. Hãy nạp lại bản nguồn để kiểm tra tiếp.');
      setPreview(null);setChecked([]);setAck('');
    }catch(cause){
      setError(cause instanceof Error?cause.message:'Cập nhật bị dừng. Hãy kiểm tra các hồ sơ đã lưu trước khi thử lại.');
      // Retain source preview for user to reconcile, never retry automatically.
    }finally{setBusy(false);}
  };
  return <section className="card" aria-label="Cập nhật chuyển tiếp từ Google Sheets hoặc Excel">
    <div className="card-header"><div><h3>Cập nhật dữ liệu chuyển tiếp vào Firebase</h3>
      <p className="muted">Chỉ quản trị viên · cập nhật thủ công các hồ sơ đã tồn tại · không tự đồng bộ liên tục.</p>
    </div></div>
    <p className="notice">Google Sheets và Excel vẫn dùng trong giai đoạn chuyển tiếp. Trước khi ghi, hệ thống so sánh từng trường với Firebase. Không tự thêm/xóa hồ sơ, đổi ID, STT, trạng thái rút hay ghi đè các ô trống. Không thay quyền, chốt dữ liệu hoặc dữ liệu nguồn.</p>
    <div className="toolbar">
      <label className="field">Nguồn cập nhật
        <select aria-label="Nguồn cập nhật chuyển tiếp" disabled={busy} value={source} onChange={e=>{setSource(e.currentTarget.value as 'google'|'excel');clear();}}>
          <option value="google">Google Sheets (link bảng đang sử dụng)</option>
          <option value="excel">Tải file Excel (.xlsx)</option>
        </select>
      </label>
      {source==='google'?<label className="field">Đường dẫn Google Sheets
        <input aria-label="Link Google Sheets để đối chiếu" type="url" value={url} disabled={busy} onChange={e=>{setUrl(e.currentTarget.value);clear();}}/>
      </label>:null}
      {source==='google'?<button type="button" className="button primary" disabled={disabled||busy} onClick={()=>void load()}>
        {busy?'Đang đọc…':'Đọc và so sánh Google Sheets'}
      </button>:<label className="field">Chọn file Excel cần so sánh
        <input type="file" accept=".xlsx" disabled={disabled||busy} onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void load(f);e.currentTarget.value='';}}/>
      </label>}
    </div>
    {source==='excel'&&<p className="muted">Chấp nhận file xuất từ WebApp hoặc file Excel nghiệp vụ có các cột A–O đúng cấu trúc Google Sheets, dữ liệu tại worksheet đầu tiên (tối đa 5 MB).</p>}
    {error&&<p role="alert" className="error-text">{error}</p>}
    {message&&<p role="status" className="notice">{message}</p>}
    {preview&&<>
      <p><strong>Nguồn:</strong> {preview.name} · <strong>Đã đọc lúc:</strong> {new Date(preview.receivedAt).toLocaleString('vi-VN')}</p>
      <p><strong>{preview.plan.matches} hồ sơ khớp mã</strong> · {preview.plan.changes.length} hồ sơ có nội dung khác · {preview.plan.unchanged} hồ sơ không có thay đổi cần ghi · {preview.plan.unmatchedCodes.length} mã chưa tồn tại trên Firebase · {preview.plan.skippedBlankCells} ô nguồn trống được giữ nguyên Firebase.</p>
      {preview.warnings.length>0&&<details><summary>{preview.warnings.length} cảnh báo từ nguồn</summary><ul>{preview.warnings.slice(0,35).map((s,i)=><li key={i}>{s}</li>)}</ul></details>}
      {preview.plan.unmatchedCodes.length>0&&<details><summary>Mã chưa khớp — không được nhập tự động</summary><p>{preview.plan.unmatchedCodes.slice(0,80).join(', ')}</p></details>}
      <p className="muted">Mặc định chưa chọn hồ sơ nào. Chọn từng hồ sơ sau khi kiểm tra thay đổi. Tối đa 20 hồ sơ một lượt. Nếu ai đó sửa Firebase sau khi bạn xem trước, toàn bộ lượt cập nhật sẽ dừng tại hồ sơ bị xung đột.</p>
      <div className="table-wrap"><table className="data-table"><thead><tr><th>Chọn</th><th>Mã</th><th>Số trường đổi</th><th>Đối chiếu giá trị từng trường</th></tr></thead>
      <tbody>{preview.plan.changes.map(entry=><tr key={entry.recordId}><td><input aria-label={'Cập nhật '+entry.displayCode} type="checkbox" disabled={busy||disabled||!checked.includes(entry.recordId)&&checked.length>=20} checked={checked.includes(entry.recordId)}
        onChange={e=>setChecked(prev=>e.currentTarget.checked?[...prev,entry.recordId]:prev.filter(id=>id!==entry.recordId))}/></td>
        <td>{entry.displayCode}</td><td>{entry.fields.length}</td><td><details><summary>Xem các trường thay đổi</summary>
          <ul>{entry.fields.map(field=><li key={field}><strong>{field}</strong><div>Firebase: {String(entry.baseline[field])}</div><div>Nguồn mới: {String(entry.source[field])}</div></li>)}</ul>
        </details></td></tr>)}</tbody></table></div>
      {preview.plan.changes.length===0&&<p>Không có thay đổi thuộc các trường dữ liệu được phép cập nhật.</p>}
      <div className="toolbar"><label className="field">Gõ <code>CAP NHAT FIREBASE</code> để xác nhận {chosen.length} hồ sơ đã chọn
        <input aria-label="Xác nhận cập nhật dữ liệu chuyển tiếp" autoComplete="off" value={ack} onChange={e=>setAck(e.currentTarget.value)} disabled={busy||disabled}/>
      </label>
        <button type="button" className="button primary" disabled={disabled||busy||chosen.length===0||ack!=='CAP NHAT FIREBASE'} onClick={()=>void apply()}>
          {busy?'Đang cập nhật…':`Xác nhận cập nhật ${chosen.length} hồ sơ`}
        </button>
        <button type="button" className="button ghost" disabled={busy} onClick={clear}>Bỏ bản xem trước</button>
      </div>
    </>}
  </section>;
}
