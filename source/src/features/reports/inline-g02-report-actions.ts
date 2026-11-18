import type { ReportLayout } from '../../data/report-preferences';
import { reportHiddenColumns } from '../../data/report-preferences';
import { DEFAULT_REPORTS } from '../../domain/reporting';

/** Pure transformations: only the presentation profile changes, never Item data. */
export type InlineReportAction =
  | { type: 'rename'; reportId: string; title: string }
  | { type: 'report-visible'; reportId: string; visible: boolean }
  | { type: 'report-step'; reportId: string; direction: -1 | 1 }
  | { type: 'report-reorder'; reportId: string; targetId: string }
  | { type: 'status-visible'; reportId: string; column: string; visible: boolean }
  | { type: 'status-step'; reportId: string; column: string; direction: -1 | 1 }
  | { type: 'status-reorder'; reportId: string; column: string; target: string }
  | { type: 'column-width'; reportId: string; column: string; width: number };

const reservedWidths = new Set(['__group', '__total', '__percent', 'Chưa chuẩn hóa']);

function reorder<T>(list: readonly T[], source: number, target: number): T[] {
  if (source < 0 || target < 0 || source === target) return [...list];
  const next = [...list];
  const [value] = next.splice(source, 1);
  // Drop on a later element places the dragged item AFTER it; dropping on an
  // earlier element places it BEFORE. Works identically for keyboard steps.
  next.splice(target, 0, value);
  return next;
}

export function inlineHiddenColumns(row: ReportLayout): string[] {
  const hidden = new Set(reportHiddenColumns(row));
  return row.columnOrder.filter(column => hidden.has(column));
}

/** Invalid DOM/user actions never leak into Firebase; validation runs again at save. */
export function applyInlineReportAction(layout: readonly ReportLayout[], action: InlineReportAction): ReportLayout[] {
  const index = layout.findIndex(row => row.id === action.reportId);
  if (index < 0) throw new Error('Không tìm thấy bảng báo cáo để chỉnh.');
  const row = layout[index];
  const base = DEFAULT_REPORTS.find(report => report.id === row.id);
  if (!base) throw new Error('Mã bảng báo cáo không hợp lệ.');
  const replace = (nextRow: ReportLayout): ReportLayout[] =>
    layout.map(current => current.id === row.id ? nextRow : current);

  switch (action.type) {
    case 'rename': {
      const title = action.title.trim();
      if (!title || title.length > 160) throw new Error('Tên bảng cần từ 1 đến 160 ký tự.');
      return title === row.title ? [...layout] : replace({ ...row, title });
    }
    case 'report-visible':
      return row.visible === action.visible ? [...layout] : replace({ ...row, visible: action.visible });
    case 'report-step': {
      if (!row.visible) return [...layout];
      const visible = layout.filter(current => current.visible);
      const position = visible.findIndex(current => current.id === row.id);
      const neighbor = visible[position + action.direction];
      return neighbor ? reorder(layout, index, layout.findIndex(current => current.id === neighbor.id)) : [...layout];
    }
    case 'report-reorder': {
      const targetIndex = layout.findIndex(current => current.id === action.targetId && current.visible);
      if (!row.visible || targetIndex < 0) return [...layout];
      return reorder(layout, index, targetIndex);
    }
    case 'status-visible': {
      if (!base.columns.includes(action.column)) throw new Error('Cột trạng thái không thuộc bảng này.');
      const column = action.column;
      if (column === 'Không phải trình' && ['party', 'build'].includes(row.id)) {
        const hiddenColumns = action.visible
          ? row.hiddenColumns.filter(value => value !== column)
          : [...new Set([...row.hiddenColumns, column])];
        return replace({
          ...row,
          hiddenColumns,
          showNotRequiredColumn: action.visible,
          // includeNotRequired is intentionally untouched: visibility is NOT counting.
        });
      }
      const hiddenColumns = action.visible
        ? row.hiddenColumns.filter(value => value !== column)
        : [...new Set([...row.hiddenColumns, column])];
      return replace({ ...row, hiddenColumns });
    }
    case 'status-step': {
      if (!row.columnOrder.includes(action.column)) throw new Error('Cột không thuộc bảng.');
      const hidden = new Set(reportHiddenColumns(row));
      const visible = row.columnOrder.filter(column => !hidden.has(column));
      const position = visible.indexOf(action.column);
      const neighbor = visible[position + action.direction];
      if (position < 0 || !neighbor) return [...layout];
      return replace({ ...row, columnOrder: reorder(row.columnOrder,
        row.columnOrder.indexOf(action.column), row.columnOrder.indexOf(neighbor)) });
    }
    case 'status-reorder': {
      const hidden = new Set(reportHiddenColumns(row));
      if (!row.columnOrder.includes(action.column) || !row.columnOrder.includes(action.target) ||
        hidden.has(action.column) || hidden.has(action.target)) return [...layout];
      return replace({ ...row, columnOrder: reorder(row.columnOrder,
        row.columnOrder.indexOf(action.column), row.columnOrder.indexOf(action.target)) });
    }
    case 'column-width': {
      const valid = reservedWidths.has(action.column) || base.columns.includes(action.column);
      if (!valid || !Number.isSafeInteger(action.width) || action.width < 80 || action.width > 1200)
        throw new Error('Độ rộng cột báo cáo cần từ 80 đến 1200 px.');
      return replace({ ...row, columnWidths: { ...row.columnWidths, [action.column]: action.width } });
    }
  }
}
