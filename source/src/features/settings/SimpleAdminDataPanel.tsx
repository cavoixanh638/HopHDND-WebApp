import {useState} from 'react';
import type {Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../../shared/types';
import {firebaseAdmin} from '../../data/firebase-repository';
import {parseBusinessExcel} from '../../data/business-excel';
import {inspectWorkbookSchema,type WorkbookSchemaInspection} from '../../data/business-excel-schema-fingerprint';
import {previewDatasetReplacement} from '../../data/dataset-replacement-preview';
import {sha256String,stableBackupJson} from '../../data/admin-backup-format';
import {createSimpleBackup,downloadSimpleBackup,inspectSimpleBackup,
  simpleExcelCandidate,prepareSimpleChange,commitSimpleChange,
  type SimpleDraft} from '../../data/simple-admin-data';

type LocalExcel={name:string;bytes:Uint8Array;inspection:WorkbookSchemaInspection};
/** Small-data owner workflow: one JSON file + direct Google-admin RTDB transaction.
 * This is the legacy `hdnd/items` path only; no destructive root operation.
 */
export function SimpleAdminDataPanel({database,user,items,disabled=false}:{
  database:Database;user:User|null;items:readonly Item[];disabled?:boolean
}){
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');
  const [backupHash,setBackupHash]=useState('');
  const [excel,setExcel]=useState<LocalExcel|null>(null);
  const [sheet,setSheet]=useState('');
  const [draft,setDraft]=useState<SimpleDraft|null>(null);
  const [preview,setPreview]=useState('');
  const clearResult=()=>{setDraft(null);setPreview('');setError('');setNotice('');};
  const withBusy=async(task:()=>Promise<void>)=>{
    if(busy||disabled)return;
    setBusy(true);setError('');
    try{await task()}catch(e){setError(e instanceof Error?e.message:'Thao tác không hoàn thành.');}
    finally{setBusy(false);}
  };
  const backup=()=>withBusy(async()=>{
    const result=await createSimpleBackup(database,user);
    const file=downloadSimpleBackup(result);
    setBackupHash(await sha256String(stableBackupJson(result.payload.items)));
    setDraft(null);setPreview('');
    setNotice('Đã tạo file '+file+' ('+result.payload.count+
      ' hồ sơ). Giữ file trong máy hoặc thư mục lưu trữ bạn chọn.');
  });
  const prepare=async(action:SimpleDraft['action'],candidate:SimpleDraft['candidate'])=>{
    const next=await prepareSimpleChange(database,user,action,candidate);
    if(next.expectedSha256!==backupHash)
      throw Error('Hãy bấm “Tải backup JSON” của dữ liệu hiện tại trước khi tiếp tục.');
    setDraft(next);
    setPreview(action==='clear'
      ?'Xóa '+next.oldCount+' hồ sơ đang hoạt động (không xóa mirror/nguồn cũ).'
      :action==='restore'
        ?'Khôi phục '+next.newCount+' hồ sơ từ file backup; đang có '+next.oldCount+'.'
        :'Thay '+next.oldCount+' hồ sơ đang có bằng '+next.newCount+' hồ sơ trong Excel.');
  };
  const loadExcel=(file:File)=>withBusy(async()=>{
    clearResult();
    if(!/\.xlsx$/i.test(file.name)||file.size>5*1024*1024||file.size===0)
      throw Error('Chọn file .xlsx tối đa 5 MB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const inspection=inspectWorkbookSchema(bytes);
    setExcel({name:file.name,bytes,inspection});
    setSheet(inspection.recommendedSheet??'');
    if(!inspection.validSheets.length){
      const near=inspection.sheets.filter(sheet=>sheet.matchedColumns>=5)
        .sort((a,b)=>b.score-a.score).slice(0,2)
        .map(sheet=>sheet.name+': '+sheet.explanation);
      throw Error('Không tìm thấy sheet A–O hợp lệ sau khi quét tất cả sheet (kể cả ẩn). '+
        (near.length?near.join('; '):'Mở “Chi tiết nhận diện” để kiểm tra cấu trúc.'));
    }
    setNotice(inspection.ambiguous
      ?'Nhiều sheet cùng khớp A–O, kể cả sheet ẩn: hãy chọn chính xác một sheet trước khi nhập.'
      :'Đã nhận diện bảng A–O theo cấu trúc, không dựa tên file/sheet hay số dòng. Bấm “Xem trước nhập Excel”.');
  });
  const stageExcel=()=>withBusy(async()=>{
    if(!excel||!sheet)throw Error('Chưa chọn sheet Excel hợp lệ.');
    const parsed=parseBusinessExcel(excel.bytes,sheet);
    const difference=previewDatasetReplacement(items,parsed.items);
    await prepare('excel',simpleExcelCandidate(parsed.items,user?.uid??''));
    setPreview('Excel: '+difference.newCount+' hồ sơ; thêm '+difference.difference.added.length+
      ', thay đổi '+difference.difference.changed.length+', bỏ khỏi tập hiện tại '+
      difference.difference.removed.length+', giữ nguyên '+difference.difference.unchanged.length+'.');
  });
  const loadJson=(file:File)=>withBusy(async()=>{
    clearResult();
    if(!/\.json$/i.test(file.name)||!file.size||file.size>5*1024*1024)
      throw Error('Chọn backup JSON tối đa 5 MB.');
    const parsed=await inspectSimpleBackup(await file.text(),database);
    await prepare('restore',parsed.payload.items);
    setNotice('Đã kiểm tra checksum backup: '+file.name+'. Chưa có dữ liệu nào bị ghi.');
  });
  const stageClear=()=>withBusy(async()=>{
    clearResult();
    await prepare('clear',null);
  });
  const confirm=()=>withBusy(async()=>{
    if(!draft)throw Error('Chưa có bản xem trước cần xác nhận.');
    if(!backupHash||draft.expectedSha256!==backupHash)
      throw Error('Bản backup không còn trùng dữ liệu hiện tại.');
    const word=draft.action==='clear'?'XÓA':'THAY THẾ';
    if(!window.confirm(word+' danh sách hiện tại?\n'+preview+
      '\nFile backup vừa tải giúp bạn khôi phục khi cần.'))
      return;
    const count=await commitSimpleChange(database,user,draft);
    setDraft(null);setBackupHash('');setExcel(null);setSheet('');
    setPreview('');
    setNotice('Firebase xác nhận '+(draft.action==='clear'?'đã xóa danh sách': 'đã cập nhật')+
      ': '+count+' hồ sơ. Website Spark luôn đọc từ Firebase chính; hãy kiểm tra lại danh sách.');
  });
  if(!firebaseAdmin(user))return null;
  return <section className="card admin-data-maintenance" aria-label="Sao lưu và thay dữ liệu đơn giản">
    <h3>Quản lý dữ liệu — 3 thao tác</h3>
    <p>Sao lưu bằng file JSON trên máy. Không cần Cloudflare hay dịch vụ ngoài.
      Khi thay dữ liệu, ứng dụng tạm dừng chỉnh sửa để tránh ghi chồng.</p>
    <div className="toolbar">
      <button className="button primary" type="button" disabled={busy||disabled}
        onClick={()=>void backup()}>1. Tải backup JSON</button>
      <label className="field">2. Nhập Excel mới (.xlsx)
        <input type="file" accept=".xlsx" disabled={busy||disabled}
          onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void loadExcel(file);
            e.currentTarget.value='';}}/>
      </label>
      <label className="field">Hoặc khôi phục file backup (.json)
        <input type="file" accept=".json,application/json" disabled={busy||disabled}
          onChange={e=>{const file=e.currentTarget.files?.[0];if(file)void loadJson(file);
            e.currentTarget.value='';}}/>
      </label>
      <button className="button ghost" type="button" disabled={busy||disabled}
        onClick={()=>void stageClear()}>3. Xóa danh sách hiện tại</button>
    </div>
    {excel&&<div className="toolbar">
      <span>Excel: <strong>{excel.name}</strong></span>
      {excel.inspection.validSheets.length>1&&
        <label className="field">Sheet
          <select value={sheet} onChange={e=>{setSheet(e.currentTarget.value);clearResult();}}>
            <option value="">Chọn sheet</option>
            {excel.inspection.validSheets.map(name=><option key={name} value={name}>{name}</option>)}
          </select>
        </label>}
      <button className="button primary" type="button" disabled={!sheet||busy||disabled}
        onClick={()=>void stageExcel()}>Xem trước nhập Excel</button>
      <details>
        <summary>Chi tiết nhận diện {excel.inspection.sheets.length} sheet (gồm sheet ẩn)</summary>
        <p className="muted">Điểm chỉ tính cấu trúc 15 trường A–O, không tính số hồ sơ,
          tên file, tên sheet hay trạng thái ẩn/hiện. Dòng và cột ẩn luôn được đọc.</p>
        <ul>{excel.inspection.sheets.map(candidate=><li key={candidate.name}>
          <strong>{candidate.name}</strong>: {candidate.score}% · {candidate.matchedColumns}/15
          cột · {candidate.visibility==='visible'?'Hiển thị':
            candidate.visibility==='hidden'?'Sheet ẩn':'Sheet Very Hidden'}
          · {candidate.hiddenRows} dòng ẩn · {candidate.hiddenColumns.length} cột ẩn
          {candidate.hiddenColumns.length?' ('+candidate.hiddenColumns.join(', ')+')':''}.
          {' '}{candidate.explanation}
        </li>)}</ul>
      </details>
    </div>}
    {!backupHash&&<p className="notice">Trước khi xóa hoặc nhập đè, tải một file backup của dữ liệu hiện tại.</p>}
    {backupHash&&<p className="muted">Đã tạo backup trong lượt này. Nếu dữ liệu đổi, hệ thống yêu cầu tải lại.</p>}
    {draft&&<div role="status" className="card">
      <strong>Xem trước — chưa ghi Firebase</strong>
      <p>{preview}</p>
      <button type="button" className="button danger" disabled={busy||disabled}
        onClick={()=>void confirm()}>{busy?'Đang cập nhật…':
          draft.action==='clear'?'Xác nhận xóa danh sách':
          draft.action==='restore'?'Xác nhận khôi phục JSON':'Xác nhận thay bằng Excel'}</button>
      <button type="button" className="button ghost" disabled={busy}
        onClick={clearResult}>Hủy</button>
    </div>}
    {error&&<p className="error-text" role="alert">{error}</p>}
    {notice&&<p className="notice" role="status">{notice}</p>}
    <p className="muted">Chỉ quản lý <code>hdnd/items</code>; không xóa hồ sơ nguồn
      ở <code>/items</code>, <code>hdnd/mirrors</code>, cấu hình và phân quyền.</p>
  </section>;
}
