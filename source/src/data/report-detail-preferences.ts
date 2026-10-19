import {EXCEL_SOURCE_COLUMNS} from './item-preferences';
import {layoutRecoveryScope} from './draft-checkpoints';

/** Presentation-only settings for the drill-down grid. Never shared with
 * the main ItemList layout, report layout, Firebase or Excel workbook. */
export type DetailColumnKey=(typeof EXCEL_SOURCE_COLUMNS)[number]['key'];
export type DetailColumn={key:DetailColumnKey;visible:boolean;width:number};
export interface DetailGridPreferences {version:1;columns:DetailColumn[]}
const keys=new Set<string>(EXCEL_SOURCE_COLUMNS.map(c=>c.key));
const keyFor=(source:string)=>'hdnd.report-detail-grid.v1:'+layoutRecoveryScope(source);
export const defaultDetailGridPreferences=():DetailGridPreferences=>({
  version:1,
  columns:EXCEL_SOURCE_COLUMNS.map(c=>({
    key:c.key,visible:['displayCode','content','department','progressParty','progressBuild',
      'progressCouncil','specialist','room','specificProgress','note'].includes(c.key),width:c.width
  })),
});
/** Reject polluted or stale source configurations instead of introducing
 * columns not present in the verified A–O sheet schema. */
export function validateDetailGridPreferences(value:unknown):DetailGridPreferences{
  if(!value||typeof value!=='object')throw Error('Cấu hình bảng chi tiết không hợp lệ.');
  const v=value as Partial<DetailGridPreferences>;
  if(v.version!==1||!Array.isArray(v.columns)||v.columns.length!==EXCEL_SOURCE_COLUMNS.length)
    throw Error('Cấu hình cột bảng chi tiết không đúng phiên bản A–O.');
  const seen=new Set<string>();
  const columns=v.columns.map(c=>{
    if(!c||!keys.has(c.key)||seen.has(c.key)||typeof c.visible!=='boolean'||
      !Number.isInteger(c.width)||c.width<70||c.width>800)
      throw Error('Cột hoặc độ rộng bảng chi tiết không hợp lệ.');
    seen.add(c.key);
    return {key:c.key,visible:c.visible,width:c.width} as DetailColumn;
  });
  if(!columns.some(c=>c.visible))throw Error('Phải hiển thị ít nhất một cột.');
  return {version:1,columns};
}
export function loadDetailGridPreferences(source:string):DetailGridPreferences{
  try{const raw=globalThis.localStorage?.getItem(keyFor(source));
    return raw?validateDetailGridPreferences(JSON.parse(raw)):defaultDetailGridPreferences();
  }catch{return defaultDetailGridPreferences();}
}
export function saveDetailGridPreferences(source:string,value:DetailGridPreferences):boolean{
  const valid=validateDetailGridPreferences(value);
  try{globalThis.localStorage?.setItem(keyFor(source),JSON.stringify(valid));return !!globalThis.localStorage;}
  catch{return false;}
}
