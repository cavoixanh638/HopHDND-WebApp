/** Stable report *reference* keys, not real organization IDs.
 * The A-R source contains only display names for department/room/leaders:
 * it has NO immutable organization ID. Derive the row identity from a stable
 * member recordId across the unfiltered source, never from sort position,
 * the report title, the mutable group label or displayed cell text.
 *
 * Limitation: if the last surviving anchor record leaves the group, a new
 * identity must be established; a later upstream organization-ID field
 * should supersede this data-backed fallback. No source writes/storage.
 */
import type {GroupField,Item,ReportConfig} from '../../shared/types';
import {canonicalStatus} from './status-contract';

export const REPORT_REFERENCE_COLUMN={
  group:'__GROUP__',total:'__TOTAL__',percent:'__PERCENT__',
  unknown:'__UNKNOWN__',empty:'__EMPTY__'
} as const;
export const REPORT_REFERENCE_ROW={
  header:'__HEADER__',grand:'__GRAND__',empty:'__EMPTY__'
} as const;

export function reportReferenceGroupRows(items:readonly Item[],group:GroupField):Map<string,string>{
  const anchors=new Map<string,string>();
  for(const item of items){
    const label=item[group].trim()||'Chưa phân công';
    const id=item.recordId?.trim();
    if(!id)continue; // Never fabricate an instance code from a visible label.
    const prior=anchors.get(label);
    if(!prior||id<prior)anchors.set(label,id);
  }
  return new Map([...anchors].map(([label,id])=>[label,'record:'+id]));
}

export function reportReferenceStatusColumn(config:ReportConfig,status:string):string{
  if(status==='Chưa chuẩn hóa')return REPORT_REFERENCE_COLUMN.unknown;
  // Canonical status is the source's workflow key, not the rendered chip text.
  const sourceKey=canonicalStatus(config.statusField,status);
  return 'status:'+config.statusField+':'+sourceKey;
}
