import {canonicalStatus} from './status-contract';
import {normalizeSearch} from './search';

/** Presentation only. The three visible colors follow REPORT stage meanings:
 * source=red, office=amber, completed=deep green. Rules here never change
 * source values, report aggregation or permissions.
 */
const STATUS_FIELDS=new Set(['progressParty','progressBuild','progressCouncil','specificProgress']);
export type ProgressTone='not-submitted'|'office'|'done';
const normalize=(value:unknown)=>normalizeSearch(String(value??'')).replace(/\s+/gu,' ').trim();
export function progressTone(field:string,value:unknown):ProgressTone|null {
  if(!STATUS_FIELDS.has(field))return null;
  const label=field==='specificProgress'?normalize(value):
    normalize(canonicalStatus(field as 'progressParty'|'progressBuild'|'progressCouncil',value));
  if(label==='so chua trinh')return 'not-submitted';
  if(['vp dang xu ly','vp dang thuc hien','dang o van phong','van phong dang thuc hien'].includes(label))
    return 'office';
  if(field==='specificProgress'&&['hoan thanh','da hoan thanh'].includes(label))return 'done';
  if(field==='progressParty'&&label==='da co tbkl')return 'done';
  if(field==='progressBuild'&&label==='da co qd')return 'done';
  // The council's terminal milestone is explicitly defined in Bảng tổng hợp.
  if(field==='progressCouncil'&&label==='hoan thanh')return 'done';
  return null;
}
