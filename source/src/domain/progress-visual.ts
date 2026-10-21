import {normalizeSearch} from './search';

/** Presentation only; never change source statuses or classify unrelated steps as done.
 * Works for status values in A-O workflow columns, not arbitrary text/names.
 */
const STATUS_FIELDS=new Set(['progressParty','progressBuild','progressCouncil','specificProgress']);
export type ProgressTone='not-submitted'|'office'|'done';
export function progressTone(field:string,value:unknown):ProgressTone|null {
  if(!STATUS_FIELDS.has(field))return null;
  const normalized=normalizeSearch(String(value??'')).trim().replace(/\s+/gu,' ');
  if(normalized==='so chua trinh')return 'not-submitted';
  if(normalized==='vp dang thuc hien'||normalized==='dang o van phong'||
    normalized==='van phong dang thuc hien')return 'office';
  if(normalized==='hoan thanh'||normalized==='da hoan thanh')return 'done';
  return null;
}
