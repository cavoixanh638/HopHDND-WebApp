import type {Item} from '../../shared/types';
import {normalizeSearch} from './search';

/** UI/report-only business projection. Do not write this value to Item, Patch,
 * Excel, history, Firebase or any dataset replacement. Raw legacy H survives.
 */
export const HC_BC_BUILD_VALUE='Không phải trình';
export type NonBuildKind='HC'|'BC'|null;
const name=(raw:unknown)=>normalizeSearch(String(raw??'')).replace(/\s+/gu,' ').trim();

/** Explicit types only. Unknown NQ/UNCLASSIFIED is NOT silently classified. */
export function nonBuildKind(item:Pick<Item,'type'|'documentKind'>):NonBuildKind {
  if(item.documentKind==='BC')return 'BC';
  const value=name(item.type);
  if(value==='bc'||value==='bao cao')return 'BC';
  if(value==='hc'||value==='hanh chinh')return 'HC';
  return null;
}
export const buildLocked=(item:Pick<Item,'type'|'documentKind'>):boolean=>nonBuildKind(item)!==null;
export function buildLockReason(item:Pick<Item,'type'|'documentKind'>):string|null{
  const kind=nonBuildKind(item);
  return kind?('Loại VB '+kind+' không phải trình xây dựng NQ nên trạng thái này không thể chỉnh sửa.'):null;
}
/** Field-scoped effective read: never return a cloned, writable Item. */
export function effectiveBuildStatus(item:Pick<Item,'type'|'documentKind'|'progressBuild'>):string{
  return buildLocked(item)?HC_BC_BUILD_VALUE:item.progressBuild;
}
export function effectiveItemField(item:Item,field:string):string{
  if(field==='progressBuild')return effectiveBuildStatus(item);
  return String((item as unknown as Record<string,unknown>)[field]??'');
}
/** A stale picker callback may fire after a type change. Deny based on the
 * latest snapshot and the prospective post-patch kind, not on its open-time type.
 * Unchanged legacy raw H is allowed when editing some OTHER field.
 */
export function rejectsBuildChange(item:Item,changes:Partial<Item>):boolean{
  if(changes.progressBuild===undefined||changes.progressBuild===item.progressBuild)return false;
  return buildLocked(item)||buildLocked({...item,...changes});
}
/** Render-only object for existing compact renderer which reads item[stage]
 * to compute tone. Never supply this object to onUpdate/exports/history.
 */
export function projectedBuildDisplayItem(item:Item):Item{
  if(!buildLocked(item))return item;
  return {...item,progressBuild:HC_BC_BUILD_VALUE};
}
