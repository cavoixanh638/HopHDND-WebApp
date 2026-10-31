import type {Item,TextField} from '../../../shared/types';
import {canonicalStatus,OFFICIAL_STATUS_CHOICES,type StatusCatalogField} from '../../domain/status-contract';

/** Pure presentation projection. Never mutate the raw Item, drafts, histories,
 * Excel, Firebase, leases or CAS baselines when an alias is merely displayed. */
export function isStatusDisplayField(field:string):field is StatusCatalogField {
  return Object.prototype.hasOwnProperty.call(OFFICIAL_STATUS_CHOICES,field);
}
export function statusDisplayValue(field:string,raw:string):string {
  return isStatusDisplayField(field)?canonicalStatus(field,raw):raw;
}
/** Only official menu presets. CellPicker may additionally display a currently
 * selected UNKNOWN source value, but never re-add a known legacy alias. */
export function statusPickerValues(field:string,choices:readonly string[]):string[]{
  return isStatusDisplayField(field)?[...OFFICIAL_STATUS_CHOICES[field]]:[...choices];
}
/** A no-op for opening/closing/Esc or selecting the canonical representation
 * of the current raw alias. Only explicit different official choices patch. */
export function statusEditSelection(field:string,raw:string,selected:string):string|null{
  if(selected===statusDisplayValue(field,raw)||selected===raw)return null;
  if(isStatusDisplayField(field)&&!OFFICIAL_STATUS_CHOICES[field].includes(selected))return null;
  return selected;
}
/** Match both canonical displayed text and historic source text in UI search. */
export function statusFilterText(field:string,raw:string):string{
  const shown=statusDisplayValue(field,raw);
  return shown===raw?raw:raw+' '+shown;
}
/** FILTER UI-only derived rows; original Item records continue to own all
 * change/lease/history/export/counted source values. */
export function projectedStatusFilterRows(items:readonly Item[]):Item[]{
  return items.map(item=>({...item,
    partyLevel:statusDisplayValue('partyLevel',item.partyLevel),
    progressParty:statusDisplayValue('progressParty',item.progressParty),
    progressBuild:statusDisplayValue('progressBuild',item.progressBuild),
    progressCouncil:statusDisplayValue('progressCouncil',item.progressCouncil)
  }));
}
export const statusReadOnlyValue=(field:TextField,value:string):string=>statusDisplayValue(field,value);
