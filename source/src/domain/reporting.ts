import type { GroupField, Item, ReportConfig } from '../../shared/types';
import {normalizeSearch} from './search';
import {canonicalStatus,isNotRequiredStatus} from './status-contract';
export {PARTY_STATUS_ALIASES} from './status-contract';

export const COUNCIL_STAGE_COLUMNS = ['Sở chưa trình','VP đang xử lý','Hoàn thành'] as const;
export const DEFAULT_REPORTS: ReportConfig[] = [
  { id: 'party', title: 'Tiến độ xin ý kiến Thành ủy', source: 'party', statusField: 'progressParty',includeNotRequired:false,
    columns: ['Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU','ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL'],
    hiddenColumns:['Không phải trình'],completed:['Đã có TBKL'] },
  { id: 'build', title: 'Tiến độ trình HĐND xây dựng NQ', source: 'build', statusField: 'progressBuild',includeNotRequired:false,
    columns: ['Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'],
    hiddenColumns:['Không phải trình'],completed:['Đã có QĐ'] },
  { id: 'council', title: 'Tiến độ các Nghị quyết và Báo cáo trình HĐND', source: 'council',
    statusField: 'progressCouncil', columns:[...COUNCIL_STAGE_COLUMNS],
    hiddenColumns:[],completed:['Đã trình HĐND thành phố'] },
  { id: 'nq', title: 'Tiến độ trình HĐND ban hành NQ', source: 'nq', statusField: 'progressCouncil',
    columns:[...COUNCIL_STAGE_COLUMNS],hiddenColumns:[],completed:['Đã trình HĐND thành phố'] },
  { id: 'bc', title: 'Tiến độ trình HĐND ban hành BC', source: 'bc', statusField: 'progressCouncil',
    columns:[...COUNCIL_STAGE_COLUMNS],hiddenColumns:[],completed:['Đã trình HĐND thành phố'] },
];
export const isActive = (item: Item) => !item.isDropped && !item.archivedAt;
const canonical = (value: string) => value.trim().toLocaleLowerCase('vi');
/** Map only proven field-scoped predecessor labels in memory. The
 * original Excel/Item/history text is never changed or saved by reporting.
 * Blank and ambiguous old labels stay unknown, not implicitly submitted/done.
 */
export function normalizeReportStatus(raw:string,config:ReportConfig):string{
  return canonicalStatus(config.statusField,raw);
}
export function reportItems(items: Item[], config: ReportConfig): Item[] {
  return items.filter(item=>{
    if(!isActive(item))return false;
    const notRequired=isNotRequiredStatus(config.statusField,item[config.statusField]);
    if(['party','build'].includes(config.id)&&config.includeNotRequired!==true&&notRequired)
      return false;
    switch(config.source){
      case 'all':return true;
      case 'party':
        return config.includeNotRequired===true||
          !isNotRequiredStatus('partyLevel',item.partyLevel);
      case 'build':
        return item.documentKind==='NQ'&&!!normalizeSearch(item.progressBuild);
      case 'council':return item.documentKind==='NQ'||item.documentKind==='BC';
      case 'nq':return item.documentKind==='NQ';
      case 'bc':return item.documentKind==='BC';
      default:return false;
    }
  });
}
export function aggregateReport(items: Item[], config: ReportConfig, group: GroupField) {
  const scoped = reportItems(items, config);
  const rows = new Map<string, Map<string, Item[]>>();
  const unknown = new Set<string>();
  const completed = new Set(config.completed.map(canonical));
  const known = new Map(config.columns.map(column => [canonical(column), column]));
  let completedCount = 0;
  for (const item of scoped) {
    const raw = normalizeReportStatus(item[config.statusField],config);
    // Unknown Party source labels are NOT extra official milestones.
    // Unknown TU labels do NOT imply an issued TBKL or completion.
    const recognized=known.get(canonical(raw));
    const status=recognized??'Chưa chuẩn hóa';
    if (!recognized) unknown.add(raw);
    const label = item[group].trim() || 'Chưa phân công';
    if (!rows.has(label)) rows.set(label, new Map());
    const cells = rows.get(label)!;
    if (!cells.has(status)) cells.set(status, []);
    cells.get(status)!.push(item);
    if (completed.has(canonical(raw))) completedCount++;
  }
  // A single explicit data-quality column avoids synthesizing phantom Excel stages.
  const extra=unknown.size?['Chưa chuẩn hóa']:[];
  const columns = [...config.columns, ...extra].filter(c => !config.hiddenColumns.includes(c));
  const hiddenCount = scoped.filter(item => config.hiddenColumns.some(c => canonical(c) === canonical(normalizeReportStatus(item[config.statusField],config)))).length;
  return {
    items: scoped, rows, columns, unknown: [...unknown], hiddenCount,
    total: scoped.length, completedCount,
    percent: scoped.length ? Math.round(completedCount / scoped.length * 100) : null,
  };
}
export function getKpis(items: Item[]) {
  const active = items.filter(isActive);
  // The list KPI and the Council/NQ/BC report must count the same canonical
  // Council completion, including legacy "Hoàn thành" and other saved aliases.
  const council = DEFAULT_REPORTS.find(config => config.id === 'council')!;
  let pending = 0, doing = 0, completed = 0;
  for (const item of active) {
    const status = canonical(normalizeReportStatus(item.progressCouncil, council));
    if (status === canonical('Sở chưa trình')) pending++;
    else if (status === canonical('VP đang xử lý')) doing++;
    else if (status === canonical('Hoàn thành')) completed++;
    // Unrecognized states remain unclassified, never counted as completed.
  }
  return {
    total: active.length,
    nq: active.filter(i => i.documentKind === 'NQ').length,
    bc: active.filter(i => i.documentKind === 'BC').length,
    unclassified: active.filter(i => i.documentKind === 'UNCLASSIFIED').length,
    pending, doing, completed,
  };
}
