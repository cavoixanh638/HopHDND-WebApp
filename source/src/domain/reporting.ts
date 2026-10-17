import type { GroupField, Item, ReportConfig } from '../../shared/types';
import {normalizeSearch} from './search';

export const DEFAULT_REPORTS: ReportConfig[] = [
  { id: 'party', title: 'Nội dung cần xin ý kiến Thành ủy', source: 'party', statusField: 'progressParty', columns: ['Sở chưa trình', 'VP đang thực hiện', 'Đã gửi ĐU', 'ĐU đã gửi TU chưa họp', 'Đã họp chưa có TBKL', 'Đã báo cáo TU', 'Sở xin rút'], hiddenColumns: [], completed: ['Đã báo cáo TU'] },
  { id: 'nq', title: 'Nội dung trình ban hành nghị quyết', source: 'nq', statusField: 'progressCouncil', columns: ['Sở chưa trình', 'VP đang thực hiện', 'Đã trình HĐND', 'Hoàn thành', 'Sở xin rút'], hiddenColumns: [], completed: ['Hoàn thành'] },
  { id: 'bc', title: 'Báo cáo trình Hội đồng nhân dân', source: 'bc', statusField: 'progressCouncil', columns: ['Sở chưa trình', 'VP đang thực hiện', 'Đã trình HĐND', 'Hoàn thành', 'Sở xin rút'], hiddenColumns: [], completed: ['Hoàn thành'] },
];
export const isActive = (item: Item) => !item.isDropped && !item.archivedAt;
const canonical = (value: string) => value.trim().toLocaleLowerCase('vi');
export function reportItems(items: Item[], config: ReportConfig): Item[] {
  return items.filter(item => isActive(item) && (
    config.source === 'all' ||
    (config.source === 'party' && item.partyLevel !== 'Không phải xin ý kiến') ||
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
    const raw = item[config.statusField].trim() || 'Sở chưa trình';
    const status = known.get(canonical(raw)) ?? raw;
    if (!known.has(canonical(raw))) unknown.add(status);
    const label = item[group].trim() || 'Chưa phân công';
    if (!rows.has(label)) rows.set(label, new Map());
    const cells = rows.get(label)!;
    if (!cells.has(status)) cells.set(status, []);
    cells.get(status)!.push(item);
    if (completed.has(canonical(raw))) completedCount++;
  }
  const columns = [...config.columns, ...unknown].filter(c => !config.hiddenColumns.includes(c));
  const hiddenCount = scoped.filter(item => config.hiddenColumns.some(c => canonical(c) === canonical(item[config.statusField].trim() || 'Sở chưa trình'))).length;
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
