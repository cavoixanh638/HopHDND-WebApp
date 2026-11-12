/** Pure read-only previews for future trusted online maintenance.
 * Never mutates Firebase. The backend must independently verify uploaded bytes,
 * schema, source generation, freeze epoch, signed backup and CAS transaction.
 */
import type {Item} from '../../shared/types';
import {validateFirebaseItem} from './firebase-repository';
import {previewDatasetReplacement,type ReplacementPreview} from './dataset-replacement-preview';
import type {BackupInspection} from './admin-backup-format';

const record=(value:unknown):value is Record<string,unknown>=>
  value!==null&&typeof value==='object'&&!Array.isArray(value);
const fromKeyedRows=(raw:unknown):Item[]=>{
  if(!record(raw))throw Error('Backup không có danh sách hồ sơ ở nhánh đã chọn.');
  const ids=new Set<string>(),codes=new Set<string>();
  const items=Object.entries(raw).map(([id,rawItem])=>{
    const row=validateFirebaseItem(rawItem);
    if(row.recordId!==id)throw Error('Backup chứa ID khác khóa hồ sơ: '+id);
    if(ids.has(row.recordId)||codes.has(row.displayCode))
      throw Error('Backup chứa mã hồ sơ hoặc ID trùng: '+row.displayCode);
    ids.add(row.recordId);codes.add(row.displayCode);
    return row;
  }).sort((a,b)=>a.stt-b.stt||a.recordId.localeCompare(b.recordId));
  if(items.length<1||items.length>1000)
    throw Error('Khôi phục phải có 1–1.000 hồ sơ. Nguồn rỗng dùng quy trình kỳ họp mới.');
  return items;
};
export interface RestoreDraftPreview {
  source:'v2'|'legacy';
  backupDigest:string;
  backupCreatedAt:string;
  items:Item[];
  comparison:ReplacementPreview;
}
export function previewBackupRestore(current:readonly Item[],inspection:BackupInspection):
  RestoreDraftPreview {
  const {envelope,mode}=inspection;
  const nodes=envelope.payload.nodes;
  let rows:unknown;
  if(mode==='v2'){
    const v2=nodes['hdnd/datasetV2'];
    if(!record(v2)||!record(v2.active)||!record(v2.generations))
      throw Error('Backup V2 thiếu con trỏ hoặc generations.');
    const generationId=v2.active.generationId;
    if(typeof generationId!=='string'||!record(v2.generations[generationId]))
      throw Error('Backup V2 thiếu thế hệ đang hoạt động.');
    rows=v2.generations[generationId].items;
  }else{
    rows=nodes['hdnd/items'];
  }
  const items=fromKeyedRows(rows);
  if(items.length!==(mode==='v2'?inspection.activeRows:inspection.legacyRows))
    throw Error('Backup không khớp số lượng hồ sơ đã kiểm tra.');
  const comparison=previewDatasetReplacement(current,items);
  return {
    source:mode,
    backupDigest:envelope.sha256,
    backupCreatedAt:inspection.createdAt,
    items,comparison,
  };
}
export interface ClearDraftPreview {
  action:'clear-active-only';
  count:number;
  codes:string[];
  explanation:string;
}
export function previewClearActive(current:readonly Item[]):ClearDraftPreview {
  const codes=new Set<string>();
  for(const row of current){
    validateFirebaseItem(row);
    if(codes.has(row.displayCode))throw Error('Dữ liệu có mã trùng; dừng quy trình xóa.');
    codes.add(row.displayCode);
  }
  return {
    action:'clear-active-only',
    count:current.length,
    codes:[...codes].sort((a,b)=>a.localeCompare(b,'vi')),
    explanation:'Chỉ ẩn toàn bộ hồ sơ của thế hệ đang hoạt động. Không xóa Auth, quyền quản trị, cấu hình, lịch sử và bản sao lưu.',
  };
}
