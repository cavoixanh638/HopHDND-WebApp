import {useState} from 'react';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {ReportConfig} from '../../../shared/types';
import type {ActiveDatasetPointer} from '../../data/dataset-replacement-integrity';
import {VersionedExcelReplacementPanel} from './VersionedExcelReplacementPanel';
import type {Item} from '../../../shared/types';
import {createBusinessExcelTemplate,inspectBusinessExcel,parseBusinessExcel,
  type BusinessExcelInspection,type BusinessExcelResult} from '../../data/business-excel';
import {previewDatasetReplacement,type ReplacementPreview} from '../../data/dataset-replacement-preview';
import {datasetPreviewFingerprint} from '../../data/dataset-preview-fingerprint';

/** Step A only: no Firebase write is available in this component. */
export function BusinessExcelReviewPanel({current,versioned}:{current:readonly Item[];
  versioned?:{database:Database;user:User|null;active:ActiveDatasetPointer;
    reports:readonly ReportConfig[];enabled:boolean}}){
  const [file,setFile]=useState<{name:string;bytes:Uint8Array;inspection:BusinessExcelInspection}|null>(null);
  const [sheet,setSheet]=useState('');
  const [result,setResult]=useState<BusinessExcelResult|null>(null);
  const [comparison,setComparison]=useState<ReplacementPreview|null>(null);
  const [error,setError]=useState('');
  // A snapshot may change via Firebase while an administrator reviews a file.
  // A previously rendered comparison must never be mistaken for current data.
  const currentSnapshot=datasetPreviewFingerprint(current);
  const [reviewedSnapshot,setReviewedSnapshot]=useState('');
  const download=()=>{
    const blob=new Blob([new Uint8Array(createBusinessExcelTemplate())],
      {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const url=URL.createObjectURL(blob),anchor=document.createElement('a');
    anchor.href=url;anchor.download='HDND_mau_nghiep_vu_A-O.xlsx';anchor.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  const load=async(upload:File)=>{
    setError('');setResult(null);setComparison(null);setSheet('');setFile(null);
    try{
      if(!/\.xlsx$/i.test(upload.name))throw Error('Chỉ chấp nhận tệp .xlsx.');
      const bytes=new Uint8Array(await upload.arrayBuffer());
      const inspection=inspectBusinessExcel(bytes);
      // Keep the workbook available even when every sheet has a malformed
      // header. Selecting a sheet then reports its exact row and column.
      setFile({name:upload.name,bytes,inspection});
      if(!inspection.validSheets.length)
        setError('Chưa có sheet nào đúng tiêu đề A–O. Chọn sheet và bấm Kiểm tra để xem cột sai cụ thể.');
    }catch(e){setError(e instanceof Error?e.message:'Không đọc được tệp Excel.');}
  };
  const examine=()=>{
    setError('');setResult(null);setComparison(null);
    if(!file||!sheet)return;
    try{
      const next=parseBusinessExcel(file.bytes,sheet);
      const difference=previewDatasetReplacement(current,next.items);
      setResult(next);setComparison(difference);setReviewedSnapshot(currentSnapshot);
    }catch(e){setError(e instanceof Error?e.message:'Excel có lỗi.');}
  };
  return <section className="card business-excel-review">
    <h3>Kiểm tra file Excel nghiệp vụ (chưa áp dụng)</h3>
    <p>Chỉ đọc file và lập bản xem trước; chưa tạo dữ liệu thử trên Firebase, chưa sao lưu và chưa có nút thay toàn bộ. Không dùng mẫu kỹ thuật recordId/documentKind.</p>
    <button type="button" className="button ghost" onClick={download}>Tải mẫu Excel A–O</button>
    <label className="field">Chọn file .xlsx
      <input type="file" accept=".xlsx" onChange={e=>{
        const upload=e.currentTarget.files?.[0];if(upload)void load(upload);
        e.currentTarget.value='';
      }}/>
    </label>
    {file&&<><p role="status">Đã chọn: <strong>{file.name}</strong>. File có {file.inspection.sheetNames.length} sheet.</p>
      <label className="field">Sheet dữ liệu
        <select value={sheet} onChange={e=>{setSheet(e.currentTarget.value);setResult(null);setComparison(null);}}>
          <option value="">— Chọn sheet, không tự lấy sheet đầu tiên —</option>
          {file.inspection.sheetNames.map(name=><option key={name} value={name}>{name}
            {file.inspection.validSheets.includes(name)?' · Đúng tiêu đề':' · Cần kiểm tra cấu trúc'}</option>)}
        </select>
      </label>
      <button type="button" className="button primary" disabled={!sheet} onClick={examine}>Kiểm tra toàn bộ file</button>
    </>}
    {error&&<p className="notice" role="alert">{error}</p>}
    {result&&comparison&&reviewedSnapshot!==currentSnapshot&&<p className="notice" role="alert">
      Dữ liệu hiện tại đã thay đổi sau khi kiểm tra Excel. Bản so sánh cũ không còn hiệu lực;
      hãy bấm “Kiểm tra toàn bộ file” để đối chiếu lại. Không áp dụng bản xem trước cũ.
    </p>}
    {result&&comparison&&reviewedSnapshot===currentSnapshot&&<section aria-label="Bản xem trước chưa áp dụng">
      <h4>Dữ liệu thử — chưa áp dụng</h4>
      <p><strong>{comparison.newCount}</strong> hồ sơ mới / {comparison.oldCount} đang sử dụng;
        NQ {comparison.totals.total.nq} (QPPL {comparison.totals.total.qppl}, HC {comparison.totals.total.hc}),
        BC {comparison.totals.total.bc}.
      </p>
      <p>Thêm {comparison.difference.added.length};
        thay đổi {comparison.difference.changed.length};
        loại khỏi tập hoạt động {comparison.difference.removed.length};
        giữ nguyên {comparison.difference.unchanged.length}.</p>
      <div className="table-wrap"><table className="data-table"><thead><tr>
        <th>Mã hồ sơ</th><th>Nội dung</th><th>Sở, ngành</th><th>Tiến độ hiện tại</th>
      </tr></thead><tbody>{result.items.slice(0,20).map(row=><tr key={row.recordId}>
        <td>{row.displayCode}</td><td>{row.content}</td>
        <td>{row.department}</td><td>{row.specificProgress}</td>
      </tr>)}</tbody></table></div>
      {result.count>20&&<p>Đang xem 20/{result.count} hồ sơ; toàn bộ file đã được kiểm tra.</p>}
      {versioned?<VersionedExcelReplacementPanel key={file?.name+':'+sheet+':'+reviewedSnapshot}
        database={versioned.database} user={versioned.user} active={versioned.active}
        reports={versioned.reports} enabled={versioned.enabled}
        fileName={file?.name??''} current={current} items={result.items}/>
      :<p className="notice">Chưa có thế hệ Firebase hoạt động để staging an toàn;
        không áp dụng bản Excel vào dữ liệu thực.</p>}
    </section>}
  </section>;
}
