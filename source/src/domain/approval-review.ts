import type {Item} from '../../shared/types';
import {TEXT_FIELDS} from '../../shared/field-definitions';

export const REVIEW_FIELDS=['stt','documentKind',...TEXT_FIELDS.map(f=>f.key),'isDropped','archivedAt'] as const;
export type ReviewValues=Record<string,string>;
export interface ReviewRow {recordId:string;displayCode:string;values:ReviewValues}
export interface ReviewSnapshot {schemaVersion:1;source:string;rows:ReviewRow[]}
export interface ReviewChange {field:string;label:string;before:string;after:string}
export interface ReviewDifference {key:string;code:string;kind:'added'|'removed'|'modified';changes:ReviewChange[]}
const labels:Record<string,string>={stt:'STT',documentKind:'Nhóm nội dung',isDropped:'Trình / Rút',archivedAt:'Lưu trữ'};
for(const field of TEXT_FIELDS)labels[field.key]=field.label;
export function snapshotFromItems(items:Item[],source:string):ReviewSnapshot{
  if(!source||items.length>10000)throw new Error('Nguồn hoặc số dòng vượt giới hạn mốc phê duyệt.');
  const rows=items.map(row=>{
    const values:ReviewValues={};
    for(const field of REVIEW_FIELDS)values[field]=String(row[field as keyof Item]??'');
    return {recordId:row.recordId,displayCode:row.displayCode,values};
  });
  return {schemaVersion:1,source,rows};
}
export function validateReviewSnapshot(value:unknown,source:string):ReviewSnapshot{
  if(!value||typeof value!=='object')throw new Error('Mốc phê duyệt bị lỗi.');
  const v=value as ReviewSnapshot;
  if(v.schemaVersion!==1||v.source!==source||!Array.isArray(v.rows)||v.rows.length>10000)throw new Error('Mốc phê duyệt không khớp nguồn hoặc phiên bản.');
  const used=new Set<string>();
  for(const row of v.rows){
    if(!row||typeof row.recordId!=='string'||typeof row.displayCode!=='string'||!row.values||typeof row.values!=='object'||Array.isArray(row.values))throw new Error('Dòng mốc phê duyệt không hợp lệ.');
    if(used.has(row.recordId))throw new Error('Mốc phê duyệt có ID dòng trùng.');
    used.add(row.recordId);
    for(const field of REVIEW_FIELDS)if(typeof row.values[field]!=='string')throw new Error('Giá trị mốc phê duyệt không hợp lệ: '+field);
  }
  return v;
}
function rowKeys(rows:ReviewRow[],other:ReviewRow[]){
  const count=(list:ReviewRow[])=>{const tally=new Map<string,number>();for(const row of list)tally.set(row.displayCode,(tally.get(row.displayCode)??0)+1);return tally;};
  const a=count(rows),b=count(other);
  return (row:ReviewRow)=>{
    const code=row.displayCode.trim();
    if(code&&!code.startsWith('Dòng ')&&a.get(code)===1&&b.get(code)===1)return 'code:'+code;
    return 'position:'+row.recordId;
  };
}
export function compareApprovedSnapshot(previous:ReviewSnapshot,current:ReviewSnapshot):ReviewDifference[]{
  if(previous.source!==current.source)throw new Error('Không thể so sánh hai nguồn dữ liệu khác nhau.');
  const key=rowKeys(previous.rows,current.rows);
  const oldRows=new Map(previous.rows.map(row=>[key(row),row]));
  const newRows=new Map(current.rows.map(row=>[key(row),row]));
  const result:ReviewDifference[]=[];
  for(const [id,row] of newRows){
    const before=oldRows.get(id);
    if(!before){result.push({key:id,code:row.displayCode,kind:'added',changes:[]});continue;}
    const changes:ReviewChange[]=[];
    for(const field of REVIEW_FIELDS){
      const original=before.values[field]??'',newValue=row.values[field]??'';
      if(original!==newValue)changes.push({field,label:labels[field]??field,before:original,after:newValue});
    }
    if(changes.length)result.push({key:id,code:row.displayCode,kind:'modified',changes});
  }
  for(const [id,row] of oldRows)if(!newRows.has(id))result.push({key:id,code:row.displayCode,kind:'removed',changes:[]});
  return result.sort((a,b)=>a.code.localeCompare(b.code,'vi'));
}
export function serializeReviewSnapshot(snapshot:ReviewSnapshot):string{
  const payload=JSON.stringify(snapshot);
  if(payload.length>850000)throw new Error('Mốc phê duyệt quá lớn; cần phương án lưu riêng trước khi duyệt.');
  return payload;
}
