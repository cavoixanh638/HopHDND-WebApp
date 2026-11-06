/** Persistent business-group identities for report cells, independent of Item IDs.
 * Legacy A-R sheets only supply names. The initial deterministic bootstrap ID
 * becomes immutable inside the saved catalog registry. Renames MUST be explicit;
 * do not guess that two differently named source groups are identical.
 */
import type {GroupField,Item,ReportConfig} from '../../shared/types';
import {canonicalStatus} from './status-contract';

export const REPORT_GROUP_FIELDS:readonly GroupField[]=['department','room','vpLeader','ubndLeader'];
export interface ReportGroupIdentity {id:string;label:string;aliases:string[]}
export type ReportGroupIdentityRegistry=Partial<Record<GroupField,ReportGroupIdentity[]>>;
export const REPORT_REFERENCE_COLUMN={
  group:'__GROUP__',total:'__TOTAL__',percent:'__PERCENT__',
  unknown:'__UNKNOWN__',empty:'__EMPTY__'
} as const;
export const REPORT_REFERENCE_ROW={
  header:'__HEADER__',grand:'__GRAND__',empty:'__EMPTY__'
} as const;

const nameKey=(name:string)=>name.trim().normalize('NFC').toLocaleLowerCase('vi');
const display=(name:string)=>name.trim()||'Chưa phân công';
const validName=(value:unknown):value is string=>
  typeof value==='string'&&!!value.trim()&&value.trim().length<=200;

/** Deterministic one-time seed for PRE-registry profiles, not a dynamic row ID.
 * The persisted registry's ID remains the same even when the label changes. */
export function bootstrapReportGroupId(group:GroupField,label:string):string{
  const value=group+'\u0000'+nameKey(display(label));
  let a=0x811c9dc5,b=0x9e3779b9,c=0x85ebca6b;
  for(let i=0;i<value.length;i++){
    const n=value.charCodeAt(i);
    a=Math.imul(a^n,0x01000193)>>>0;
    b=Math.imul(b^(n+i),0x27d4eb2d)>>>0;
    c=Math.imul(c^(n+value.length),0x85ebca6b)>>>0;
  }
  const hex=(n:number)=>n.toString(16).padStart(8,'0');
  return 'group:'+group+':'+hex(a)+hex(b)+hex(c);
}
/** Keep old entries as tombstones, preserve aliases for source renames, reject
 * overlapping names and forged or duplicate IDs. Never mutate input. */
export function validateReportGroupIdentities(
  input:unknown,options:Partial<Record<GroupField,readonly string[]>>={}
):ReportGroupIdentityRegistry{
  if(input!==undefined&&(!input||typeof input!=='object'||Array.isArray(input)))
    throw Error('Registry ID nhóm báo cáo không hợp lệ.');
  const raw=(input??{}) as Record<string,unknown>;
  if(Object.keys(raw).some(key=>!REPORT_GROUP_FIELDS.includes(key as GroupField)))
    throw Error('Registry có loại nhóm không được hỗ trợ.');
  const output:ReportGroupIdentityRegistry={};
  for(const group of REPORT_GROUP_FIELDS){
    const source=raw[group]??[];
    if(!Array.isArray(source))throw Error('Registry nhóm '+group+' phải là danh sách.');
    const usedNames=new Set<string>(),ids=new Set<string>();
    const result:ReportGroupIdentity[]=[];
    const insert=(entry:ReportGroupIdentity)=>{
      if(ids.has(entry.id))throw Error('Mã ID nhóm '+group+' bị trùng.');
      for(const name of [entry.label,...entry.aliases]){
        const key=nameKey(name);
        if(usedNames.has(key))throw Error('Tên/alias nhóm '+group+' trùng hoặc mơ hồ: '+name);
        usedNames.add(key);
      }
      ids.add(entry.id);result.push(entry);
    };
    for(const candidate of source){
      if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))
        throw Error('Bản ghi ID nhóm '+group+' không hợp lệ.');
      const row=candidate as Partial<ReportGroupIdentity>;
      if(typeof row.id!=='string'||!row.id.startsWith('group:'+group+':')||
        !/^group:[A-Za-z]+:[0-9a-f]{24}$/.test(row.id)||!validName(row.label)||
        !Array.isArray(row.aliases)||row.aliases.some(alias=>!validName(alias)))
        throw Error('Tên/ID nhóm '+group+' không hợp lệ.');
      insert({id:row.id,label:row.label.trim(),aliases:row.aliases.map(alias=>alias.trim())});
    }
    for(const choice of options[group]??[]){
      if(!validName(choice)||usedNames.has(nameKey(choice)))continue;
      insert({id:bootstrapReportGroupId(group,choice),label:choice.trim(),aliases:[]});
    }
    output[group]=result;
  }
  return output;
}
/** On confirmed admin rename, transfer the old ID. A newly observed
 * destination with only a bootstrap ID can be explicitly reconciled; two
 * manually curated groups are never silently merged. */
export function renameReportGroupIdentity(
  registry:ReportGroupIdentityRegistry|undefined,group:GroupField,
  oldLabel:string,newLabel:string
):ReportGroupIdentityRegistry{
  if(!validName(newLabel))throw Error('Tên nhóm mới không hợp lệ.');
  const current=validateReportGroupIdentities(registry),entries=[...(current[group]??[])];
  const index=entries.findIndex(row=>nameKey(row.label)===nameKey(oldLabel));
  if(index<0)throw Error('Không tìm thấy ID nhóm gốc; phải xác nhận danh mục trước.');
  const original=entries[index],next=newLabel.trim();
  const collision=entries.findIndex((row,i)=>i!==index&&[row.label,...row.aliases]
    .some(name=>nameKey(name)===nameKey(next)));
  if(collision>=0){
    const other=entries[collision];
    if(other.aliases.length||other.id!==bootstrapReportGroupId(group,other.label))
      throw Error('Tên đích đã gắn ID nhóm riêng; không tự gộp hai đơn vị.');
    entries.splice(collision,1);
  }
  const at=entries.findIndex(row=>row.id===original.id);
  const aliases=[...new Set([...original.aliases,original.label])]
    .filter(name=>nameKey(name)!==nameKey(next));
  entries[at]={...original,label:next,aliases};
  return {...current,[group]:entries};
}
export function reportReferenceGroupValue(
  raw:string,group:GroupField,registry?:ReportGroupIdentityRegistry
):{id:string;label:string}{
  const label=display(raw),key=nameKey(label);
  const entry=registry?.[group]?.find(row=>[row.label,...row.aliases]
    .some(name=>nameKey(name)===key));
  if(entry)return {id:entry.id,label:entry.label};
  if(!raw.trim())return {id:'group:'+group+':unassigned',label};
  return {id:bootstrapReportGroupId(group,label),label};
}
export function reportReferenceGroupRows(
  items:readonly Item[],group:GroupField,registry?:ReportGroupIdentityRegistry
):Map<string,string>{
  const result=new Map<string,string>();
  for(const item of items){
    const entry=reportReferenceGroupValue(item[group],group,registry);
    result.set(entry.label,entry.id);
  }
  return result;
}
export function reportReferenceStatusColumn(config:ReportConfig,status:string):string{
  if(status==='Chưa chuẩn hóa')return REPORT_REFERENCE_COLUMN.unknown;
  const sourceKey=canonicalStatus(config.statusField,status);
  return 'status:'+config.statusField+':'+sourceKey;
}
