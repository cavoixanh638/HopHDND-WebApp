import type {EditableField,Item} from '../../shared/types';
import {EDITABLE_FIELDS} from '../domain/items';
import type {SheetConfig} from './sheet-config';

/** A server-owned Excel snapshot is immutable. User changes live only in a
 * separate, source-scoped RTDB branch so future Excel mirror publications cannot
 * erase accepted edits. The existing record IDs are never rewritten. */
export interface MirrorEdit {
  revision:number;
  operationId:string;
  updatedAt:number;
  updatedBy:string;
  values:Partial<Pick<Item,EditableField>>;
}
export type MirrorEdits=Record<string,MirrorEdit>;
const editable=new Set<string>(EDITABLE_FIELDS);
export const mirrorEditsPath=(source:Pick<SheetConfig,'spreadsheetId'|'gid'>)=>
  'hdnd/mirrorEdits/'+source.spreadsheetId+'/'+source.gid;

export function mirrorEditKey(itemId:string,source:Pick<SheetConfig,'spreadsheetId'|'gid'>):string {
  const prefix=source.spreadsheetId+':'+source.gid+':row:';
  if(!itemId.startsWith(prefix))throw new Error('ID nội dung không thuộc nguồn Database đang chọn.');
  const index=itemId.slice(prefix.length);
  if(!/^[1-9][0-9]{0,4}$/.test(index))throw new Error('ID dòng Excel không hợp lệ.');
  return index;
}
export function parseMirrorEdits(raw:unknown):MirrorEdits {
  if(raw==null)return {};
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Dữ liệu sửa Database không hợp lệ.');
  const output:MirrorEdits={};
  for(const [index,value] of Object.entries(raw)){
    if(!/^[1-9][0-9]{0,4}$/.test(index)||!value||typeof value!=='object'||Array.isArray(value))
      throw new Error('Mã dòng sửa Database không hợp lệ.');
    const edit=value as MirrorEdit;
    if(!Number.isSafeInteger(edit.revision)||edit.revision<1||
      typeof edit.operationId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(edit.operationId)||
      typeof edit.updatedBy!=='string'||!edit.updatedBy||
      typeof edit.updatedAt!=='number'||!Number.isFinite(edit.updatedAt)||
      !edit.values||typeof edit.values!=='object'||Array.isArray(edit.values))
      throw new Error('Phiên bản sửa Database không hợp lệ.');
    for(const [field,v] of Object.entries(edit.values)){
      if(!editable.has(field)||(field==='isDropped'?typeof v!=='boolean':
        field==='documentKind'?!['NQ','BC','UNCLASSIFIED'].includes(String(v)):
        typeof v!=='string'||v.length>20000||(field==='content'&&!v.trim())))
        throw new Error('Giá trị sửa Database không hợp lệ: '+field);
    }
    output[index]=edit;
  }
  return output;
}
export function applyMirrorEdits(rows:readonly Item[],source:Pick<SheetConfig,'spreadsheetId'|'gid'>,edits:MirrorEdits):Item[]{
  // The mirror row set is the authority; a forged/nonexistent edit cannot add rows.
  return rows.map(row=>{
    const change=edits[mirrorEditKey(row.recordId,source)];
    if(!change)return row;
    return {...row,...change.values,revision:row.revision+change.revision};
  });
}
