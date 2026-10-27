import {useState} from 'react';
import type {Item} from '../../../shared/types';
import {parseSheetConfig} from '../../data/sheet-config';
import {readSheet} from '../../data/sheets-repository';
import {readTransitionalExcel} from '../../data/transition-excel';

type ImportSnapshot={label:string;receivedAt:number;rows:Item[];warnings:string[]};
/** Manual launch-only import. Always reads the current source again and requires
 * an explicit operator acknowledgement. The backend rejects any nonempty RTDB.
 */
export function InitialFirebaseImportPanel({initialSheetUrl,disabled,onImport}:{
  initialSheetUrl:string;disabled:boolean;onImport:(rows:Item[])=>Promise<number>;
}){
  const [mode,setMode]=useState<'sheets'|'excel'>('sheets');
  const [url,setUrl]=useState(initialSheetUrl);
  const [preview,setPreview]=useState<ImportSnapshot|null>(null);
  const [checked,setChecked]=useState(false);
  const [ack,setAck]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const reset=()=>{setPreview(null);setChecked(false);setAck('');setNotice('');setError('');};
  const read=async(file?:File)=>{
    if(busy||disabled)return;
    reset();setBusy(true);
    try{
      let rows:Item[],warnings:string[],label:string;
      if(mode==='sheets'){
        const conf=parseSheetConfig(url);
        const result=await readSheet(conf);
        rows=result.items;warnings=result.warnings;
        label='Google Sheets · '+conf.spreadsheetId+' · tab '+conf.gid;
      }else{
        if(!file||!/\.xlsx$/i.test(file.name))throw new Error('Chỉ chọn file Excel .xlsx hợp lệ.');
        const result=readTransitionalExcel(await file.arrayBuffer());
        rows=result.items;warnings=result.warnings;
        label=file.name;
      }
      if(!rows.length||rows.length>1000)
        throw new Error('Nguồn phải có từ 1 đến 1.000 hồ sơ hợp lệ.');
      if(warnings.length)
        throw new Error('Nguồn có '+warnings.length+' cảnh báo. Không được nhập cho đến khi xử lý các cảnh báo: '+warnings.slice(0,3).join('; '));
      const ids=new Set<string>(),codes=new Set<string>();
      for(const row of rows){
        if(!row.recordId||!row.displayCode?.trim()||codes.has(row.displayCode)||ids.has(row.recordId)||
          /^Dòng \d+ \(thiếu mã\)$/u.test(row.displayCode))
          throw new Error('Mã hoặc ID bị trùng/thiếu: '+String(row.displayCode)+'. Không thể khởi tạo an toàn.');
        ids.add(row.recordId);codes.add(row.displayCode);
      }
      setPreview({label,receivedAt:Date.now(),rows,warnings});
      setNotice('Đã đọc nguồn để xem trước; CHƯA có thao tác ghi Firebase.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Không đọc được dữ liệu nguồn.');}
    finally{setBusy(false);}
  };
  const save=async()=>{
    if(!preview||disabled||busy||!checked||ack!=='KHOI TAO FIREBASE')return;
    setBusy(true);setError('');setNotice('');
    try{
      if(Date.now()-preview.receivedAt>10*60*1000)
        throw new Error('Bản nguồn đã xem trước quá 10 phút. Hãy đọc lại từ đầu.');
      const count=await onImport(preview.rows);
      setPreview(null);setAck('');setChecked(false);
      setNotice('Firebase xác nhận đã khởi tạo và đọc lại đủ '+count+
        ' hồ sơ. Chưa tự chuyển nguồn; hãy vào Tài khoản Firebase chọn Database chính sau khi đối chiếu.');
    }catch(cause){setError(cause instanceof Error?cause.message:'Firebase chưa xác nhận. KHÔNG thử lại khi chưa kiểm tra trạng thái dữ liệu.');}
    finally{setBusy(false);}
  };
  return <section className="card" aria-label="Khởi tạo lần đầu dữ liệu Firebase">
    <div className="card-header"><div>
      <h3>Khởi tạo Firebase lần đầu từ nguồn đã duyệt</h3>
      <p className="muted">Chỉ dùng một lần khi `hdnd/items` còn trống. Chỉ quản trị viên Google được phép xác nhận.</p>
    </div></div>
    <p className="notice">Cảnh báo: đây là thao tác GHI dữ liệu thật lên Firebase, không phải xem thử. Chỉ thực hiện sau khi đã sao lưu RTDB, đối chiếu Rules đang áp dụng và chốt nguồn. Không tự nhập chồng, xóa, hoặc thay dữ liệu đã có.</p>
    <div className="toolbar">
      <label className="field">Chọn nguồn ban đầu
        <select value={mode} disabled={busy} aria-label="Nguồn khởi tạo Firebase" onChange={e=>{setMode(e.currentTarget.value as 'sheets'|'excel');reset();}}>
          <option value="sheets">Google Sheets hiện tại</option>
          <option value="excel">Tệp Excel .xlsx đã chốt</option>
        </select>
      </label>
      {mode==='sheets'?<>
        <label className="field">Link Google Sheets
          <input type="url" value={url} disabled={busy} aria-label="Link nguồn khởi tạo Firebase" onChange={e=>{setUrl(e.currentTarget.value);reset();}}/>
        </label>
        <button type="button" className="button ghost" disabled={busy||disabled} onClick={()=>void read()}>
          {busy?'Đang đọc…':'Đọc nguồn để xem trước'}
        </button>
      </>:<label className="field">Excel (.xlsx, tối đa 5 MB)
        <input type="file" accept=".xlsx" disabled={busy||disabled} onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void read(file);e.currentTarget.value='';}}/>
      </label>}
    </div>
    {error&&<p className="error-text" role="alert">{error}</p>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    {preview&&<>
      <p><strong>Nguồn:</strong> {preview.label} · <strong>{preview.rows.length} hồ sơ</strong> · {new Date(preview.receivedAt).toLocaleString('vi-VN')}</p>
      <div className="table-wrap"><table className="data-table">
        <thead><tr><th>Mã hồ sơ</th><th>Nội dung</th><th>Sở/ngành</th></tr></thead>
        <tbody>{preview.rows.slice(0,25).map(row=><tr key={row.recordId}><td>{row.displayCode}</td><td>{row.content}</td><td>{row.department}</td></tr>)}</tbody>
      </table></div>
      {preview.rows.length>25&&<p className="muted">Đang hiện 25 hồ sơ đầu để kiểm tra; lần khởi tạo sẽ ghi đủ {preview.rows.length} hồ sơ.</p>}
      <label className="field">
        <input type="checkbox" checked={checked} disabled={busy||disabled} onChange={e=>setChecked(e.currentTarget.checked)}/>
        Tôi đã sao lưu RTDB và Rules, kiểm tra Rules ứng viên, chốt danh sách nguồn, xác nhận Firebase chính chưa có dữ liệu.
      </label>
      <label className="field">Nhập đúng <code>KHOI TAO FIREBASE</code> để xác nhận lần đầu
        <input aria-label="Xác nhận khởi tạo lần đầu" autoComplete="off" value={ack}
          disabled={busy||disabled} onChange={e=>setAck(e.currentTarget.value)}/>
      </label>
      <div className="top-actions">
        <button type="button" className="button primary"
          disabled={busy||disabled||!checked||ack!=='KHOI TAO FIREBASE'}
          onClick={()=>void save()}>{busy?'Đang xác nhận…':'Khởi tạo dữ liệu Firebase (một lần)'}</button>
        <button type="button" className="button ghost" disabled={busy} onClick={reset}>Bỏ bản xem trước</button>
      </div>
    </>}
  </section>;
}
