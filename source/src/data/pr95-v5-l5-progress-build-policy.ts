import type {Changes,Item} from '../../shared/types';
import {normalizeSearch} from '../domain/search';

/** Server/repository write policy: after-change classification, never a UI
 * projection. Legacy raw progressBuild is preserved on reads and on unrelated
 * writes; only a NEW change to that field is prohibited for HC or BC.
 */
export function buildNotRequiredForType(item:Pick<Item,'type'|'documentKind'>):boolean{
  const type=normalizeSearch(item.type).replace(/\s+/gu,' ');
  return item.documentKind==='BC'||type==='hc'||type==='hanh chinh'||
    type==='bc'||type==='bao cao';
}

/** Evaluate against the server-current Item inside the CAS transaction, NOT
 * the stale Item/permission snapshot used when a dropdown was opened.
 * Deliberately ignore an unchanged legacy build value in a patch touching
 * other fields; do not normalize or implicitly migrate source data.
 */
export function violatesProgressBuildWritePolicy(
  current:Pick<Item,'type'|'documentKind'|'progressBuild'>,changes:Changes
):boolean{
  if(!Object.hasOwn(changes,'progressBuild')||
    changes.progressBuild===current.progressBuild)return false;
  return buildNotRequiredForType({
    type:changes.type??current.type,
    documentKind:changes.documentKind??current.documentKind
  });
}
