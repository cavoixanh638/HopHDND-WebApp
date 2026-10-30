import type {TextField} from '../../../shared/types';
import {STATUS_OPTIONS} from '../../../shared/field-definitions';
import type {CatalogConfig} from '../../data/catalogs';

/** L1 popup choice projection. V3 workflow catalogs are authoritative menus:
 * never union obsolete saved/source aliases into selectable choices. The
 * CellPicker value prop still displays a legacy raw value unchanged until
 * the user explicitly selects a canonical choice.
 */
const WORKFLOW_FIELDS=new Set<TextField>([
  'partyLevel','progressParty','progressBuild','progressCouncil'
]);

export function popupFieldOptions(field:TextField,current:string,catalog:CatalogConfig):string[]{
  const configured=(catalog.options as Partial<Record<TextField,string[]>>)[field]??[];
  const standard=(STATUS_OPTIONS as Partial<Record<TextField,string[]>>)[field]??[];
  if(WORKFLOW_FIELDS.has(field)){
    // Once L3's official V3 catalog is wired, only its canonical choices
    // appear. An empty catalog falls back to field definitions; completion
    // must never be dropped by a special council whitelist.
    return [...new Set((configured.length?configured:standard).filter(Boolean))];
  }
  return [...new Set(['',...configured,...standard,current])];
}
