import { get, onValue, ref, runTransaction, serverTimestamp, update, type Database } from 'firebase/database';
import type { User } from 'firebase/auth';
import type { AuditEntry, EditableField, Item, Patch, SaveResult } from '../../shared/types';
import type { Repository } from './repository';
import { EDITABLE_FIELDS, validateChanges } from '../domain/items';
import { FIREBASE_ADMIN_EMAIL } from './firebase-config';

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
interface FirebaseEvent {operationId:string;recordId:string;at:number;actor:string;changesJson:string;oldValuesJson:string}
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
export class FirebaseRepository implements Repository {
  readonly sourceKind='firebase' as const;
  readonly canDraft=true;
  readonly readOnly=false;
  readonly subscribeInitial=true;
  checkAssignment?:(item:Item)=>string;
  constructor(readonly database:Database,private user:()=>User|null,private permissions:()=>CellPermissions,private readonly itemPath='hdnd/items'){}
  async list(){return rowsFrom((await get(ref(this.database,this.itemPath))).val());}
  subscribe(next:(items:Item[])=>void,error:(cause:Error)=>void){return onValue(ref(this.database,this.itemPath),snapshot=>{try{next(rowsFrom(snapshot.val()));}catch(cause){error(cause as Error);}},error);}
  async save(patches:Patch[]):Promise<SaveResult[]>{
    const results:SaveResult[]=[];
    for(const patch of patches){
      let reason='Dữ liệu đã thay đổi; phần sửa của bạn vẫn được giữ để đối chiếu.';
      try{
        const user=this.user();if(!user)throw new Error('Chưa đăng nhập Firebase.');
        const issue=validateChanges(patch.changes);if(issue)throw new Error(issue);
        const fields=Object.keys(patch.changes) as EditableField[];
        if(!fields.length||fields.some(field=>!(field in patch.baseValues)||!mayEdit(this.permissions(),patch.recordId,field,firebaseAdmin(user))))throw new Error('Bạn chưa được phép sửa ô này.');
        let replay=false;
        const transaction=await runTransaction(ref(this.database,`${this.itemPath}/${patch.recordId}`),raw=>{
          // A cold transaction cache may initially be null; returning null asks the
          // server to compare its version, then re-run with the actual record.
          if(raw===null)return raw;
          const current=validateFirebaseItem(raw);
          if(raw.operationId===patch.operationId){replay=fields.every(field=>current[field]===patch.changes[field]);return undefined;}
          const conflict=fields.find(field=>current[field]!==patch.baseValues[field]);
          if(conflict){reason=`Ô ${conflict} hiện ở nguồn là “${String(current[conflict])}”; phần bạn nhập “${String(patch.changes[conflict])}” vẫn được giữ. Bỏ phần sửa để nhận dữ liệu nguồn hoặc đối chiếu trước khi nhập lại.`;return undefined;}
          if(fields.some(field=>field==='specialist'||field==='room')){const issue=this.checkAssignment?.({...current,...patch.changes});if(issue)throw new Error(issue);}
          const next={...raw,...patch.changes,revision:current.revision+1,operationId:patch.operationId,updatedAt:serverTimestamp(),updatedBy:user.uid};
          const history:Record<string,FirebaseEvent>={...(raw.history??{})};
          history[String(next.revision%50)]={operationId:patch.operationId,recordId:patch.recordId,at:serverTimestamp() as unknown as number,actor:user.uid,changesJson:JSON.stringify(patch.changes),oldValuesJson:JSON.stringify(patch.baseValues)};
          return {...next,history};
        },{applyLocally:false});
        const item=transaction.snapshot.exists()?validateFirebaseItem(transaction.snapshot.val()):undefined;
        if(!item)reason='Dòng đã bị xóa hoặc chưa có trong Firebase.';
        const confirmed=(transaction.committed||replay)&&item&&fields.every(field=>item[field]===patch.changes[field]);
        results.push(confirmed?{recordId:patch.recordId,ok:true,item}:{recordId:patch.recordId,ok:false,error:item?'CONFLICT':'NOT_FOUND',message:reason});
      }catch(cause){results.push({recordId:patch.recordId,ok:false,error:'VALIDATION',message:`Chưa lưu: ${cause instanceof Error?cause.message:'lỗi kết nối'}. Phần sửa vẫn giữ trên máy.`});}
    }
    return results;
  }
  async history(recordId:string):Promise<AuditEntry[]>{
    const raw=(await get(ref(this.database,`${this.itemPath}/${recordId}/history`))).val()??{};
    return Object.values(raw as Record<string,FirebaseEvent>).sort((a,b)=>a.at-b.at).map(event=>({operationId:event.operationId,recordId:event.recordId,at:new Date(event.at).toISOString(),changes:JSON.parse(event.changesJson),oldValues:JSON.parse(event.oldValuesJson)}));
  }
  /** Explicit admin import only. Existing IDs are never silently overwritten. */
  async importItems(items:Item[]){
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
