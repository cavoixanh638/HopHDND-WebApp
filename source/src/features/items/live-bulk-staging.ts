/** Staged, lease-guarded clipboard edits on the real Firebase List.
 * This only prepares ordinary per-row drafts; it never writes RTDB directly.
 * The existing verified FirebaseRepository.save is the sole writer.
 */
import type {Item,TextField,EditableField,Changes} from '../../../shared/types';
import {BULK_PASTE_COLUMNS,type BulkPatch} from './bulk-paste';
import {rejectsBuildChange} from '../../domain/pr95-v5-l4-build-effective';
import type {EditorKind} from '../../data/cell-edit-leases';

const FIELDS=new Set<string>(BULK_PASTE_COLUMNS.map(column=>column.key));
export const MAX_LIVE_BULK_ROWS=20;
export const MAX_LIVE_BULK_CELLS=60;

export type BulkDraftLease={
  has:(recordId:string,field:EditableField)=>boolean;
  acquire:(recordId:string,field:EditableField,kind:EditorKind)=>Promise<boolean>;
  cancel:(recordId:string,field:EditableField)=>Promise<void>;
};
export type LiveBulkStage={
  patches:readonly BulkPatch[];
  items:readonly Item[];
  leaseManager:BulkDraftLease;
  canEdit:(recordId:string,field:TextField)=>boolean;
  getLiveItems:()=>Promise<readonly Item[]>;
  stageDraft:(recordId:string,changes:Changes)=>void;
};

const kindOf=(field:TextField):EditorKind=>
  field==='content'||field==='note'||field==='specificProgress'?'long':
  field==='specialist'?'search':
  field.startsWith('progress')?'status':'short';

/** All validation is done BEFORE acquiring a lock or staging the first draft.
 * Server refresh AFTER locks verifies the same revisions/baseline values.
 */
export async function stageLiveBulkPaste(args:LiveBulkStage):Promise<{rows:number;cells:number}>{
  const {patches,items,leaseManager,canEdit,getLiveItems,stageDraft}=args;
  if(!patches.length||patches.length>MAX_LIVE_BULK_ROWS)
    throw Error('Mỗi lần chỉ dán từ 1 đến '+MAX_LIVE_BULK_ROWS+' hồ sơ.');
  if(new Set(patches.map(p=>p.recordId)).size!==patches.length)
    throw Error('Có hồ sơ trùng lặp trong vùng dán.');
  const source=new Map(items.map(item=>[item.recordId,item]));
  const intended:{recordId:string;fields:TextField[];changes:Changes;original:Item}[]=[];
  let cells=0;
  for(const patch of patches){
    const original=source.get(patch.recordId);
    if(!original||original.revision!==patch.baseRevision)
      throw Error('Dữ liệu trên màn hình đã đổi. Hãy kiểm tra lại vùng dán.');
    const fields=Object.keys(patch.changes) as TextField[];
    if(!fields.length)throw Error('Vùng dán chứa hồ sơ không có thay đổi.');
    if('partyLevel' in patch.changes&&'progressParty' in patch.changes)
      throw Error('Không dán đồng thời cấp trình và tiến độ phụ thuộc; hãy tách hai lượt.');
    if(rejectsBuildChange(original,patch.changes))
      throw Error('Tiến độ xây dựng NQ đang bị khóa theo nghiệp vụ.');
    for(const field of fields){
      if(!FIELDS.has(field)||!canEdit(patch.recordId,field))
        throw Error('Không có quyền sửa cột '+field+' của hồ sơ '+original.displayCode+'.');
      if(typeof patch.changes[field]!=='string'||patch.changes[field]===original[field])
        throw Error('Vùng dán đã thay đổi hoặc có giá trị không hợp lệ.');
      if(leaseManager.has(patch.recordId,field))
        throw Error('Có ô đang mở sửa. Hãy đóng ô đó trước khi dán nhiều ô.');
      cells++;
    }
    intended.push({recordId:patch.recordId,fields,changes:patch.changes,original});
  }
  if(cells>MAX_LIVE_BULK_CELLS)
    throw Error('Mỗi lần chỉ dán tối đa '+MAX_LIVE_BULK_CELLS+' ô thay đổi.');
  const acquired:{id:string;field:EditableField}[]=[];
  let staged=false;
  try{
    for(const entry of intended)for(const field of entry.fields){
      if(!await leaseManager.acquire(entry.recordId,field,kindOf(field)))
        throw Error('Firebase chưa cấp khóa sửa ô '+field+'.');
      acquired.push({id:entry.recordId,field});
    }
    const live=new Map((await getLiveItems()).map(item=>[item.recordId,item]));
    for(const entry of intended){
      const current=live.get(entry.recordId);
      if(!current||current.revision!==entry.original.revision||
        entry.fields.some(field=>current[field]!==entry.original[field]))
        throw Error('Firebase đã đổi dữ liệu trong lúc xin khóa. Hãy xem lại trước khi dán.');
      if(entry.fields.some(field=>!leaseManager.has(entry.recordId,field)||
        !canEdit(entry.recordId,field)))
        throw Error('Quyền sửa hoặc khóa ô đã thay đổi, chưa đưa dữ liệu vào nháp.');
    }
    // The application batches these ordinary draft updates synchronously.
    // Existing workspace autosave (800ms) and verified server-side leases
    // perform all writes; a server failure retains its draft for review.
    for(const entry of intended)stageDraft(entry.recordId,entry.changes);
    staged=true;
    return {rows:intended.length,cells};
  }finally{
    if(!staged)for(const entry of acquired.reverse()){
      try{await leaseManager.cancel(entry.id,entry.field);}catch{/* avoid masking original error */}
    }
  }
}
