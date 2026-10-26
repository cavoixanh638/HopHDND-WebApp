import {get,ref,runTransaction,serverTimestamp,type Database} from 'firebase/database';
import type {User} from 'firebase/auth';
import type {Item} from '../../shared/types';
import type {SheetConfig} from './sheet-config';
import {mirrorPath,validateExcelMirror} from './firebase-mirror-repository';
import {firebaseAdmin,validateFirebaseItem} from './firebase-repository';
import {EDITABLE_FIELDS} from '../domain/items';

export interface PrimaryMigrationResult {sourceCount:number;importedCount:number}

/**
 * One-time, explicitly authorized admin migration. The mirror is read from
 * authenticated Firebase, never from a live Google Sheets URL.
 * - No overwrite of hdnd/items, including partially populated databases.
 * - Atomic empty -> full transition with compare-and-set at collection root.
 * - Preserve stable original record IDs so existing per-cell grants survive.
 * - Never activate the primary source until the server readback is verified.
 */
export async function migrateMirrorToPrimary(
  database:Database,user:Pick<User,'uid'|'email'|'emailVerified'|'providerData'>|null,
  source:SheetConfig
):Promise<PrimaryMigrationResult>{
  if(!user||!firebaseAdmin(user))throw new Error('Chỉ quản trị Google đã xác minh được chuyển nguồn.');
  const mirror=validateExcelMirror((await get(ref(database,mirrorPath(source)))).val(),source);
  const primaryRef=ref(database,'hdnd/items');
  if((await get(primaryRef)).exists())
    throw new Error('Database chính đã có dữ liệu. Không nhập chồng; kiểm tra và đối chiếu trước khi chuyển nguồn.');
  const ids=new Set<string>();
  const rows:Item[]=mirror.rows.map(row=>{
    const normalized=validateFirebaseItem({...row,revision:1,archivedAt:row.archivedAt??null});
    if(ids.has(normalized.recordId))
      throw new Error('Dữ liệu nguồn bị trùng ID nội dung; không chuyển.');
    ids.add(normalized.recordId);
    return normalized;
  });
  if(rows.length===0||rows.length>5000)throw new Error('Nguồn không có số lượng dòng hợp lệ để chuyển.');
  // Ignore any obsolete Excel metadata outside the defined domain fields.
  const payload=Object.fromEntries(rows.map(row=>{
    const values=Object.fromEntries(EDITABLE_FIELDS.map(field=>[field,row[field]]));
    return [row.recordId,{
      recordId:row.recordId,displayCode:row.displayCode,stt:row.stt,revision:1,
      ...(row.archivedAt?{archivedAt:row.archivedAt}:{}),
      ...values,operationId:crypto.randomUUID(),updatedAt:serverTimestamp(),updatedBy:user.uid
    }];
  }));
  const result=await runTransaction(primaryRef,current=>{
    // A server row set must NEVER be overwritten, even if it arrived during
    // this migration. Null is safe only after an authoritative get() above.
    if(current!==null)return undefined;
    return payload;
  },{applyLocally:false});
  if(!result.committed)
    throw new Error('Database chính đã được khởi tạo ở phiên khác. Không nhập lại.');
  const raw=(await get(primaryRef)).val();
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
    Object.keys(raw).length!==rows.length)
    throw new Error('Đã gửi dữ liệu nhưng chưa xác nhận đúng số dòng trên Database; không chuyển nguồn tự động.');
  for(const row of rows){
    const stored=raw[row.recordId];
    if(!stored)throw new Error('Bản ghi bị thiếu khi xác nhận chuyển nguồn: '+row.recordId);
    const checked=validateFirebaseItem(stored);
    if(checked.revision!==1||checked.displayCode!==row.displayCode||
      checked.stt!==row.stt||checked.archivedAt!==row.archivedAt||
      EDITABLE_FIELDS.some(field=>checked[field]!==row[field]))
      throw new Error('Nội dung Database sau chuyển chưa khớp nguồn; không kích hoạt.');
  }
  return {sourceCount:rows.length,importedCount:Object.keys(raw).length};
}
