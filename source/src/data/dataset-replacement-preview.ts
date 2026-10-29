import type {Item} from '../../shared/types';
import {summarizeListItems} from '../domain/item-summary';
import {EDITABLE_FIELDS} from '../domain/items';

export interface ReplacementDifference {added:string[];changed:string[];removed:string[];unchanged:string[]}
export interface ReplacementPreview {
  oldCount:number;newCount:number;difference:ReplacementDifference;
  totals:ReturnType<typeof summarizeListItems>;
}
const comparable=(item:Item)=>JSON.stringify({
  displayCode:item.displayCode,stt:item.stt,documentKind:item.documentKind,
  ...Object.fromEntries(EDITABLE_FIELDS.map(field=>[field,item[field]])),
  archivedAt:item.archivedAt??null,
});
/** READ-ONLY comparison. It never merges, updates, deletes or drops a row. */
export function previewDatasetReplacement(oldRows:readonly Item[],newRows:readonly Item[]):ReplacementPreview {
  if(!newRows.length||newRows.length>1000)throw Error('File thay thế phải có từ 1 đến 1.000 hồ sơ.');
  const map=(rows:readonly Item[],name:string)=>{
    const codes=new Map<string,Item>(),ids=new Set<string>();
    for(const row of rows){
      if(!row.displayCode?.trim()||!row.recordId||ids.has(row.recordId)||codes.has(row.displayCode))
        throw Error(name+': mã hồ sơ trống/trùng hoặc recordId trùng: '+row.displayCode);
      ids.add(row.recordId);codes.set(row.displayCode,row);
    }
    return codes;
  };
  const old=map(oldRows,'Dữ liệu đang dùng'),next=map(newRows,'Dữ liệu Excel');
  const difference:ReplacementDifference={added:[],changed:[],removed:[],unchanged:[]};
  for(const [code,item] of next){
    const before=old.get(code);
    if(!before)difference.added.push(code);
    else if(comparable(before)!==comparable(item))difference.changed.push(code);
    else difference.unchanged.push(code);
  }
  for(const code of old.keys())if(!next.has(code))difference.removed.push(code);
  return {oldCount:oldRows.length,newCount:newRows.length,difference,
    totals:summarizeListItems([...newRows])};
}
