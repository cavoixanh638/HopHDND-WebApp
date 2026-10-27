import type {Item,TextField} from '../../shared/types';
import {TEXT_FIELDS} from '../../shared/field-definitions';

/** Preview of a one-way, admin-approved transitional import into existing Firebase rows.
 * Never changes record IDs, archives, permissions, revision, or creates/deletes rows.
 * Blank source cells never clear nonblank Firebase values implicitly.
 */
export interface TransitionRowChange {
  recordId:string;
  displayCode:string;
  baseline:Item;
  source:Item;
  fields:TextField[];
}
export interface TransitionPlan {
  matches:number;
  unchanged:number;
  unmatchedCodes:string[];
  skippedBlankCells:number;
  changes:TransitionRowChange[];
}
const fields=TEXT_FIELDS.map(x=>x.key);
const safeCode=(value:string)=>value.trim()&&!/^Dòng \d+ \(thiếu mã\)$/u.test(value);
export function planTransitionImport(source:readonly Item[],firebase:readonly Item[]):TransitionPlan {
  if(source.length===0||source.length>1000)throw new Error('Nguồn chuyển tiếp phải có từ 1 đến 1.000 hồ sơ.');
  if(!firebase.length)throw new Error('Firebase chưa có hồ sơ. Không được dùng chức năng cập nhật để tự khởi tạo dữ liệu chính.');
  const keyed=(rows:readonly Item[],name:string)=>{
    const map=new Map<string,Item>();
    const ids=new Set<string>();
    for(const item of rows){
      if(!item||typeof item.displayCode!=='string'||!safeCode(item.displayCode)||
        typeof item.recordId!=='string'||!item.recordId)
        throw new Error(name+': có hồ sơ thiếu mã hoặc ID hợp lệ. Dừng đối chiếu.');
      if(map.has(item.displayCode)||ids.has(item.recordId))
        throw new Error(name+': trùng mã hồ sơ hoặc recordId ('+item.displayCode+'). Không tự ghép dòng.');
      ids.add(item.recordId);
      map.set(item.displayCode,item);
    }
    return map;
  };
  const from=keyed(source,'Nguồn Google Sheets/Excel');
  const to=keyed(firebase,'Firebase');
  let unchanged=0,matches=0,skippedBlankCells=0;
  const unmatchedCodes:string[]=[];
  const changes:TransitionRowChange[]=[];
  for(const [code,item] of from){
    const current=to.get(code);
    if(!current){unmatchedCodes.push(code);continue;}
    matches++;
    const different:TextField[]=[];
    for(const field of fields){
      if(typeof item[field]!=='string')throw new Error('Cột '+field+' của hồ sơ '+code+' không phải văn bản.');
      if(!item[field].trim()){if(current[field])skippedBlankCells++;continue;}
      if(item[field]!==current[field])different.push(field);
    }
    if(!different.length){unchanged++;continue;}
    changes.push({recordId:current.recordId,displayCode:code,baseline:current,source:item,fields:different});
  }
  return {matches,unchanged,unmatchedCodes,skippedBlankCells,changes};
}

/** Recheck the EXACT approval snapshot before grabbing any field lease. */
export function assertTransitionBaseline(entry:TransitionRowChange,current:Item):void {
  if(current.recordId!==entry.recordId||current.displayCode!==entry.displayCode||
    current.revision!==entry.baseline.revision)
    throw new Error('Hồ sơ '+entry.displayCode+' đã thay đổi trên Firebase từ lúc xem trước. Hãy đọc và đối chiếu lại.');
  if(entry.fields.some(field=>current[field]!==entry.baseline[field]))
    throw new Error('Giá trị hồ sơ '+entry.displayCode+' không còn khớp bản xem trước.');
}
