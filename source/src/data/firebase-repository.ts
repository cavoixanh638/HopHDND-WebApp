import { get, onValue, ref, runTransaction, serverTimestamp, update, type Database } from 'firebase/database';
import type { User } from 'firebase/auth';
import type { AuditEntry, EditableField, Item, Patch, SaveResult } from '../../shared/types';
import type { Repository } from './repository';
import { EDITABLE_FIELDS, validateChanges } from '../domain/items';
import { FIREBASE_ADMIN_EMAIL } from './firebase-config';
import type {CellEditSessionManager} from './cell-edit-leases';
import type {ActiveDatasetPointer} from './dataset-replacement-integrity';
import {violatesProgressBuildWritePolicy} from './pr95-v5-l5-progress-build-policy';
import {callCellEdit} from './cell-edit-api';

export interface CellPermissions {columns:Partial<Record<EditableField,boolean>>;rows?:Record<string,boolean>;cells?:Record<string,Partial<Record<EditableField,boolean>>>}
/** RTDB omits empty dictionaries and may reorder keys during transactions.
 * Canonicalize the logical grants for CAS without conflating false with absent.
 */
export function canonicalPermissions(input:CellPermissions|null|undefined):string {
  const flat:Record<string,boolean>={};
  const valid=new Set<string>(EDITABLE_FIELDS);
  for(const [key,value] of Object.entries(input?.columns??{}))
    if(valid.has(key)&&typeof value==='boolean')flat[`col:${key}`]=value;
  for(const [id,value] of Object.entries(input?.rows??{}))
    if(typeof value==='boolean')flat[`row:${id}`]=value;
  for(const [id,cells] of Object.entries(input?.cells??{}))
    for(const [key,value] of Object.entries(cells??{}))
      if(valid.has(key)&&typeof value==='boolean')flat[`cell:${id}:${key}`]=value;
  return JSON.stringify(Object.entries(flat).sort(([a],[b])=>a.localeCompare(b)));
}
export function samePermissions(a:CellPermissions|null|undefined,b:CellPermissions|null|undefined):boolean {
  return canonicalPermissions(a)===canonicalPermissions(b);
}
interface FirebaseEvent {operationId:string;recordId:string;at:number;actor:string;changes?:Partial<Record<EditableField,string|boolean>>;oldValues?:Partial<Record<EditableField,string|boolean>>;changesJson?:string;oldValuesJson?:string}
type StoredItem=Item & {operationId:string;updatedAt:number;updatedBy:string;history?:Record<string,FirebaseEvent>};
export const firebaseAdmin=(user:Pick<User,'email'|'emailVerified'|'providerData'>|null)=>!!user&&user.email===FIREBASE_ADMIN_EMAIL&&user.emailVerified&&user.providerData.some(provider=>provider.providerId==='google.com');
export const mayEdit=(permissions:CellPermissions,id:string,field:EditableField,admin=false)=>EDITABLE_FIELDS.includes(field)&&(admin||(permissions.cells?.[id]?.[field]??permissions.rows?.[id]??permissions.columns[field])===true);
export function validateFirebaseItem(value:unknown):Item {
  if(!value||typeof value!=='object')throw new Error('Dòng Firebase không hợp lệ.');
  const row=value as Item;
  if(typeof row.recordId!=='string'||!/^[A-Za-z0-9_:-]{1,200}$/.test(row.recordId)||typeof row.displayCode!=='string'||!row.displayCode||row.displayCode.length>100||!Number.isSafeInteger(row.stt)||row.stt<1||!Number.isSafeInteger(row.revision)||row.revision<1||!(row.archivedAt==null||typeof row.archivedAt==='string'))throw new Error('ID, STT hoặc phiên bản dòng Firebase không hợp lệ.');
  const changes=Object.fromEntries(EDITABLE_FIELDS.map(field=>[field,row[field]]));
  const issue=validateChanges(changes);if(issue)throw new Error(issue);
  return {recordId:row.recordId,displayCode:row.displayCode,stt:row.stt,revision:row.revision,archivedAt:row.archivedAt??null,...changes} as Item;
}
function rowsFrom(value:unknown):Item[]{
  if(value==null)return [];
  if(typeof value!=='object'||Array.isArray(value))throw new Error('Danh sách Firebase không hợp lệ.');
  const rows=Object.entries(value).map(([id,value])=>{const item=validateFirebaseItem(value);if(item.recordId!==id)throw new Error('ID không khớp đường dẫn dữ liệu.');return item;});
  return rows.sort((a,b)=>a.stt-b.stt||a.recordId.localeCompare(b.recordId));
}
/** Compare the complete epoch, not merely the reused recordId/generationId. */
export function sameDatasetEpoch(actual:unknown,expected:ActiveDatasetPointer):boolean{
  if(!actual||typeof actual!=='object')return false;
  const pointer=actual as Partial<ActiveDatasetPointer>;
  return pointer.generationId===expected.generationId&&
    pointer.operationId===expected.operationId&&pointer.revision===expected.revision&&
    pointer.rowCount===expected.rowCount&&pointer.digest===expected.digest;
}
export class FirebaseRepository implements Repository {
  readonly sourceKind='firebase' as const;
  readonly canDraft=true;
  readonly readOnly=false;
  readonly subscribeInitial=true;
  leaseManager?:CellEditSessionManager;
  checkAssignment?:(item:Item)=>string;
  constructor(readonly database:Database,private user:()=>User|null,private permissions:()=>CellPermissions,
    private readonly itemPath='hdnd/items',private readonly expectedActive?:ActiveDatasetPointer){}
  private async assertEpoch():Promise<void>{
    if(!this.expectedActive)return;
    const current=(await get(ref(this.database,'hdnd/datasetV2/active'))).val();
    if(!sameDatasetEpoch(current,this.expectedActive))
      throw new Error('Thế hệ Firebase đã thay đổi; phiên đọc/sửa cũ bị vô hiệu hóa.');
  }
  async list(){
    await this.assertEpoch();
    const rows=rowsFrom((await get(ref(this.database,this.itemPath))).val());
    await this.assertEpoch();
    return rows;
  }
  subscribe(next:(items:Item[])=>void,error:(cause:Error)=>void){
    if(!this.expectedActive)return onValue(ref(this.database,this.itemPath),snapshot=>{
      try{next(rowsFrom(snapshot.val()));}catch(cause){error(cause as Error);}
    },error);
    let valid=false,activeSeen=false,rows:Item[]|null=null,stopped=false;
    const publish=()=>{if(!stopped&&valid&&rows!==null)next(rows);};
    const stopPointer=onValue(ref(this.database,'hdnd/datasetV2/active'),snapshot=>{
      if(stopped)return;
      activeSeen=true;
      valid=sameDatasetEpoch(snapshot.val(),this.expectedActive!);
      if(!valid){rows=null;next([]);error(new Error('Con trỏ Firebase đã đổi; không hiển thị dữ liệu phiên cũ.'));}
      else publish();
    },cause=>{valid=false;rows=null;if(!stopped){next([]);error(cause);}});
    const stopItems=onValue(ref(this.database,this.itemPath),snapshot=>{
      if(stopped||(activeSeen&&!valid))return;
      try{rows=rowsFrom(snapshot.val());publish();}catch(cause){rows=null;error(cause as Error);}
    },cause=>{rows=null;if(!stopped)error(cause);});
    return()=>{stopped=true;stopPointer();stopItems();};
  }
  async save(patches:Patch[]):Promise<SaveResult[]>{
    const results:SaveResult[]=[];
    for(const patch of patches){
      try{
        await this.assertEpoch();
        const user=this.user();
        if(!user)throw new Error('Chưa đăng nhập Firebase.');
        const issue=validateChanges(patch.changes);
        if(issue)throw new Error(issue);
        const fields=Object.keys(patch.changes) as EditableField[];
        // No silent fallback to the old public-token RTDB write path.
        if(!this.leaseManager)throw new Error('Dịch vụ sửa ô chưa sẵn sàng; giữ bản nháp.');
        if(!fields.length||fields.some(field=>!(field in patch.baseValues)||
          !mayEdit(this.permissions(),patch.recordId,field,firebaseAdmin(user))))
          throw new Error('Bạn chưa được phép sửa ô này.');
        const leases:Record<string,{token:string;secret:string}>={};
        for(const field of fields){
          const credential=this.leaseManager.credential(patch.recordId,field);
          if(!credential)throw new Error('Mất khóa ô '+field+'; bản nháp được giữ.');
          leases[field]=credential;
        }
        if(fields.includes('specialist')||fields.includes('room')){
          const snapshot=(await get(ref(this.database,`${this.itemPath}/${patch.recordId}`))).val();
          const current=validateFirebaseItem(snapshot);
          const assignment=this.checkAssignment?.({...current,...patch.changes});
          if(assignment)throw new Error(assignment);
        }
        // Backend verifies trusted UID, private lease proof and FULL candidate
        // RTDB Rules at commit, including field grants, generation and freeze.
        const answer=await callCellEdit({
          action:'save',scope:this.expectedActive?'v2':'legacy',
          generation:this.expectedActive,operationId:patch.operationId,
          recordId:patch.recordId,patch,leases
        });
        if(answer.status!=='committed'||!answer.row)
          throw new Error('Dịch vụ chưa xác nhận bản ghi; không tự lưu lại.');
        await this.assertEpoch();
        const item=validateFirebaseItem(answer.row);
        if(item.recordId!==patch.recordId||
          fields.some(field=>item[field]!==patch.changes[field]))
          throw new Error('Máy chủ phản hồi giá trị không khớp bản nháp.');
        results.push({recordId:patch.recordId,ok:true,item});
      }catch(cause){
        results.push({recordId:patch.recordId,ok:false,error:'VALIDATION',
          message:`Chưa xác nhận lưu: ${cause instanceof Error?cause.message:'lỗi dịch vụ'}. Bản nháp và operationId vẫn được giữ; không ghi trực tiếp RTDB.`});
      }
    }
    return results;
  }
  async history(recordId:string):Promise<AuditEntry[]>{
    await this.assertEpoch();
    const raw=(await get(ref(this.database,`${this.itemPath}/${recordId}/history`))).val()??{};
    await this.assertEpoch();
    return Object.values(raw as Record<string,FirebaseEvent>).sort((a,b)=>a.at-b.at).map(event=>({
      operationId:event.operationId,recordId:event.recordId,at:new Date(event.at).toISOString(),
      changes:event.changes??JSON.parse(event.changesJson??'{}'),
      oldValues:event.oldValues??JSON.parse(event.oldValuesJson??'{}')
    }));
  }
  /** Explicit admin import only. Existing IDs are never silently overwritten. */
  async importItems(items:Item[]){
    if(this.expectedActive)throw new Error('Không nhập thêm qua API cũ khi V2 hoạt động; chỉ dùng staging có kiểm duyệt.');
    const user=this.user();if(!firebaseAdmin(user))throw new Error('Chỉ quản trị Google được nhập Excel.');
    const normalized=items.map(validateFirebaseItem),ids=new Set(normalized.map(item=>item.recordId));
    if(ids.size!==items.length||items.length>1000)throw new Error('ID trùng hoặc quá 1.000 dòng.');
    const current=await this.list();
    if(normalized.some(item=>current.some(row=>row.recordId===item.recordId||row.displayCode===item.displayCode)))throw new Error('Có ID hoặc mã đã tồn tại. Không nhập và không ghi đè dữ liệu cũ.');
    const additions=Object.fromEntries(normalized.map(item=>{const {archivedAt,...fields}=item;return[item.recordId,{...fields,...(archivedAt?{archivedAt}:{}),revision:1,operationId:crypto.randomUUID(),updatedAt:serverTimestamp(),updatedBy:user!.uid}];}));
    // One atomic multi-location update. Rules also require revision=1 only on
    // newly created rows, so a concurrent import of an existing ID is rejected.
    await update(ref(this.database,this.itemPath),additions);
  }
}
