import type {Item} from '../../shared/types';
import {EDITABLE_FIELDS} from '../domain/items';
import {validateFirebaseItem} from './firebase-repository';

/**
 * A read-only integrity preflight for PR #95. This module never calls Firebase
 * setters/transactions. It is NOT authorization, Rules or a dataset swap.
 */
export interface DatasetGenerationManifest {
  schemaVersion:1;
  generationId:string;
  operationId:string;
  rowCount:number;
  digest:string;
}
export interface ActiveDatasetPointer {
  generationId:string;
  operationId:string;
  revision:number;
  rowCount:number;
  digest:string;
}
export type PointerSwapDecision='ready'|'already-committed';

const operationPattern=/^[A-Za-z0-9_-]{12,80}$/;
const digestPattern=/^[a-f0-9]{64}$/;
function checkOperationId(operationId:string):void {
  if(!operationPattern.test(operationId))
    throw Error('Mã thao tác thay thế phải dài 12–80 ký tự và chỉ gồm chữ, số, _ hoặc -.');
}
function checkManifest(manifest:DatasetGenerationManifest):void {
  checkOperationId(manifest.operationId);
  if(manifest.schemaVersion!==1||
    manifest.generationId!==`gen_${manifest.operationId}`||
    !Number.isSafeInteger(manifest.rowCount)||manifest.rowCount<1||manifest.rowCount>1000||
    !digestPattern.test(manifest.digest))
    throw Error('Manifest của tập dữ liệu ứng viên không hợp lệ.');
}
function normalizedRows(rows:readonly Item[]):unknown[][] {
  if(rows.length<1||rows.length>1000)
    throw Error('Bản ứng viên phải có từ 1 đến 1.000 hồ sơ.');
  const ids=new Set<string>(),codes=new Set<string>();
  const canonical=rows.map(input=>{
    const row=validateFirebaseItem(input);
    if(row.revision!==1||row.isDropped||row.archivedAt)
      throw Error('Ứng viên phải có revision=1, không mang trạng thái rút/lưu trữ: '+row.displayCode);
    if(ids.has(row.recordId)||codes.has(row.displayCode))
      throw Error('Bản ứng viên có mã hoặc recordId trùng: '+row.displayCode);
    ids.add(row.recordId);codes.add(row.displayCode);
    // Fixed field order; do not hash JS object insertion order or Firebase metadata.
    return [row.recordId,row.displayCode,row.stt,row.revision,row.archivedAt,
      ...EDITABLE_FIELDS.map(field=>row[field])];
  });
  return canonical.sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'en'));
}
/** Stable over row order, sensitive to every editable field and ID. */
export async function createDatasetManifest(
  rows:readonly Item[],operationId:string
):Promise<DatasetGenerationManifest>{
  checkOperationId(operationId);
  const canonical=normalizedRows(rows);
  if(!globalThis.crypto?.subtle)
    throw Error('Không có WebCrypto; không thể xác minh toàn vẹn bản ứng viên.');
  const source=new TextEncoder().encode(JSON.stringify(canonical));
  const bytes=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',source));
  const digest=Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');
  return {schemaVersion:1,generationId:`gen_${operationId}`,
    operationId,rowCount:rows.length,digest};
}
/** Compare independent Firebase server readback with the original manifest. */
export async function verifyCandidateReadback(
  rows:readonly Item[],manifest:DatasetGenerationManifest
):Promise<void>{
  checkManifest(manifest);
  const observed=await createDatasetManifest(rows,manifest.operationId);
  if(observed.rowCount!==manifest.rowCount||observed.digest!==manifest.digest)
    throw Error('Dữ liệu ứng viên đọc lại từ máy chủ khác checksum hoặc số dòng: KHÔNG thay thế.');
}
/**
 * Verify a REAL keyed RTDB snapshot, not just an array assembled by the UI.
 * The key must equal each row's recordId; missing/extra rows and altered
 * business values fail closed before any pointer authorization.
 */
export async function verifyCandidateServerReadback(
  payload:unknown,manifest:DatasetGenerationManifest
):Promise<void>{
  checkManifest(manifest);
  if(!payload||typeof payload!=='object'||Array.isArray(payload))
    throw Error('Đọc lại staging không phải đối tượng hồ sơ hợp lệ.');
  const entries=Object.entries(payload);
  if(entries.length!==manifest.rowCount)
    throw Error('Số hồ sơ staging đọc lại không khớp manifest: KHÔNG thay thế.');
  const rows=entries.map(([key,value])=>{
    const item=validateFirebaseItem(value);
    if(item.recordId!==key)
      throw Error('Khóa đường dẫn staging và recordId khác nhau: '+key);
    return item;
  });
  await verifyCandidateReadback(rows,manifest);
}
function validatePointer(pointer:ActiveDatasetPointer):void {
  checkOperationId(pointer.operationId);
  if(!pointer.generationId||!digestPattern.test(pointer.digest)||
    !Number.isSafeInteger(pointer.revision)||pointer.revision<1||
    !Number.isSafeInteger(pointer.rowCount)||pointer.rowCount<1||pointer.rowCount>1000)
    throw Error('Con trỏ tập dữ liệu hiện tại không hợp lệ.');
}
/**
 * Decision only. Server transaction MUST compare the authoritative pointer
 * and enforce matching epoch in RTDB Rules, not trust this client function.
 */
export function checkPointerSwap(
  current:ActiveDatasetPointer|null,
  expected:ActiveDatasetPointer,
  candidate:DatasetGenerationManifest
):PointerSwapDecision{
  checkManifest(candidate);
  validatePointer(expected);
  if(!current)throw Error('Không tìm thấy con trỏ hiện tại; không được khởi tạo ngầm.');
  validatePointer(current);
  if(current.generationId===candidate.generationId){
    if(current.operationId===candidate.operationId&&current.digest===candidate.digest&&
      current.rowCount===candidate.rowCount&&current.revision===expected.revision+1)
      return 'already-committed';
    throw Error('Generation ID đã được dùng với dữ liệu hoặc thao tác khác.');
  }
  if(candidate.generationId===expected.generationId)
    throw Error('Không được thay thế tập dữ liệu bằng chính generation hiện tại.');
  if(current.generationId!==expected.generationId||
    current.digest!==expected.digest||
    current.rowCount!==expected.rowCount||
    current.revision!==expected.revision||
    current.operationId!==expected.operationId)
    throw Error('Con trỏ đã thay đổi ở tab hoặc thao tác khác. Dừng, tải lại và đối chiếu.');
  return 'ready';
}
