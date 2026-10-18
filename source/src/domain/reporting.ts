import type { GroupField, Item, ReportConfig } from '../../shared/types';
import {normalizeSearch} from './search';

export const DEFAULT_REPORTS: ReportConfig[] = [
  { id: 'party', title: 'Tiến độ xin ý kiến Thành ủy', source: 'party', statusField: 'progressParty', columns: ['Sở chưa trình', 'VP đang thực hiện', 'Đã gửi ĐU', 'ĐU đã gửi TU, chưa họp', 'Đã họp/xin phiếu, chưa có TBKL', 'Đã có TBKL', 'TU đã cho ý kiến', 'Sở xin rút'], hiddenColumns: [], completed: ['TU đã cho ý kiến'] },
  { id: 'build', title: 'Tiến độ trình HĐND xây dựng NQ', source: 'build', statusField: 'progressBuild', columns: ['Sở chưa trình', 'VP đang thực hiện', 'Đã trình HĐND, chưa có QĐ', 'Đã có QĐ chấp thuận'], hiddenColumns: [], completed: ['Đã có QĐ chấp thuận'] },
  { id: 'nq', title: 'Tiến độ trình HĐND ban hành NQ', source: 'nq', statusField: 'progressCouncil', columns: ['Sở chưa trình', 'VP đang thực hiện', 'Đã trình HĐND', 'Hoàn thành', 'Sở xin rút'], hiddenColumns: [], completed: ['Hoàn thành'] },
  { id: 'bc', title: 'Tiến độ trình HĐND ban hành BC', source: 'bc', statusField: 'progressCouncil', columns: ['Sở chưa trình', 'VP đang thực hiện', 'Đã trình HĐND', 'Hoàn thành', 'Sở xin rút'], hiddenColumns: [], completed: ['Hoàn thành'] },
];
export const isActive = (item: Item) => !item.isDropped && !item.archivedAt;
const canonical = (value: string) => value.trim().toLocaleLowerCase('vi');
/** Preserve legacy records and saved aliases, but display the punctuation and
 * final milestone dictated by the current Excel workbook's Sheet2 legend. */
export const PARTY_STATUS_ALIASES:Readonly<Record<string,string>>={
  'ĐU đã gửi TU chưa họp':'ĐU đã gửi TU, chưa họp',
  'Đã họp chưa có TBKL':'Đã họp/xin phiếu, chưa có TBKL',
  'Đã họp, chưa có TBKL':'Đã họp/xin phiếu, chưa có TBKL',
  'Đã họp/xin phiếu chưa có TBKL':'Đã họp/xin phiếu, chưa có TBKL',
  'Đã báo cáo TU':'TU đã cho ý kiến',
  'VP đang xử lý':'VP đang thực hiện',
};
const legacyMap=new Map(Object.entries(PARTY_STATUS_ALIASES).map(([old,modern])=>[normalizeSearch(old),modern]));
export function normalizeReportStatus(raw:string,config:ReportConfig):string{
  const value=raw.trim()||'Sở chưa trình';
  return config.id==='party'?legacyMap.get(normalizeSearch(value))??value:value;
}
export function reportItems(items: Item[], config: ReportConfig): Item[] {
  return items.filter(item => isActive(item) && (
    config.source === 'all' ||
    (config.source === 'party' && !['khong','khong phai xin y kien','khong xin y kien'].includes(normalizeSearch(item.partyLevel)) && normalizeSearch(item.progressParty)!=='khong phai xin y kien') ||
    (config.source === 'build' && item.documentKind === 'NQ' &&
      !['', 'khong phai trinh xay dung nq'].includes(normalizeSearch(item.progressBuild))) ||
    (config.source === 'nq' && item.documentKind === 'NQ') ||
    (config.source === 'bc' && item.documentKind === 'BC')
  ));
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
    // In particular "Đã xin ý kiến TU" means requested, not approved: never
    // merge it into "TU đã cho ý kiến" or the completed KPI.
    const recognized=known.get(canonical(raw));
    const status=recognized??(config.id==='party'?'Chưa chuẩn hóa':raw);
    if (!recognized) unknown.add(raw);
    const label = item[group].trim() || 'Chưa phân công';
    if (!rows.has(label)) rows.set(label, new Map());
    const cells = rows.get(label)!;
    if (!cells.has(status)) cells.set(status, []);
    cells.get(status)!.push(item);
    if (completed.has(canonical(raw))) completedCount++;
  }
  const extra=config.id==='party'&&unknown.size?['Chưa chuẩn hóa']:[...unknown];
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
  const count = (value: string) => active.filter(i => canonical(i.progressCouncil.trim() || 'Sở chưa trình') === canonical(value)).length;
  return {
    total: active.length,
    nq: active.filter(i => i.documentKind === 'NQ').length,
    bc: active.filter(i => i.documentKind === 'BC').length,
    unclassified: active.filter(i => i.documentKind === 'UNCLASSIFIED').length,
    pending: count('Sở chưa trình'), doing: count('VP đang thực hiện'), completed: count('Hoàn thành'),
  };
}
