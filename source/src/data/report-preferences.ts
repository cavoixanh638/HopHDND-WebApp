import type { ReportConfig } from '../../shared/types';
import { DEFAULT_REPORTS } from '../domain/reporting';

export interface ReportLayout {
  id: string;
  title: string;
  visible: boolean;
  hiddenColumns: string[];
  columnOrder: string[];
  /** Shared page width, stored only on the fixed canonical report ID for backwards compatibility. */
  pageWidth?: 'auto'|number;
}

const widthOwnerId=DEFAULT_REPORTS[0].id;
export const reportPageWidth=(layout:readonly ReportLayout[]):'auto'|number=>layout.find(row=>row.id===widthOwnerId)?.pageWidth??'auto';
export const withReportPageWidth=(layout:ReportLayout[],pageWidth:'auto'|number):ReportLayout[]=>layout.map(row=>row.id===widthOwnerId?{...row,pageWidth}:row);
const key = (source: string) => `hdnd.report-layout.v1:${source}`;
export const defaultReportLayout = (): ReportLayout[] => DEFAULT_REPORTS.map(report => ({
  id: report.id, title: report.title, visible: true, hiddenColumns: [], columnOrder: [...report.columns],
  ...(report.id===widthOwnerId?{pageWidth:'auto' as const}:{}),
}));

/** Chỉ điều chỉnh trình bày; không nhận thay đổi bộ lọc hoặc quy tắc nghiệp vụ. */
export function validateReportLayout(value: unknown): ReportLayout[] {
  if (!Array.isArray(value) || value.length !== DEFAULT_REPORTS.length) throw new Error('Cấu hình cần đủ ba bảng báo cáo.');
  const used = new Set<string>();
  return value.map(entry => {
    if (!entry || typeof entry !== 'object') throw new Error('Cấu hình bảng không hợp lệ.');
    const row = entry as Partial<ReportLayout>;
    const base = DEFAULT_REPORTS.find(report => report.id === row.id);
    if (!base || used.has(base.id)) throw new Error('Mã bảng không hợp lệ hoặc bị trùng.');
    used.add(base.id);
    if (typeof row.title !== 'string' || !row.title.trim() || row.title.trim().length > 160) throw new Error('Tên bảng cần từ 1 đến 160 ký tự.');
    if (typeof row.visible !== 'boolean' || !Array.isArray(row.hiddenColumns) || row.hiddenColumns.some(column => typeof column !== 'string' || !base.columns.includes(column))) throw new Error('Cột hoặc trạng thái hiển thị không hợp lệ.');
    const order = row.columnOrder ?? base.columns;
    if (!Array.isArray(order) || order.length !== base.columns.length || new Set(order).size !== order.length || order.some(column => !base.columns.includes(column))) throw new Error('Thứ tự cột cần đủ các cột của bảng và không trùng.');
    // Old report profiles have no pageWidth. A single, stable report ID carries
    // the tab width so reordering or hiding reports does not alter this setting.
    if(base.id===widthOwnerId){
      const pageWidth=row.pageWidth??'auto';
      if(pageWidth!=='auto'&&(!Number.isSafeInteger(pageWidth)||pageWidth<320||pageWidth>6000))
        throw new Error('Độ rộng trang báo cáo cần từ 320 đến 6000 px hoặc Tự động.');
      return { id:base.id,title:row.title.trim(),visible:row.visible,hiddenColumns:[...new Set(row.hiddenColumns)],columnOrder:[...order],pageWidth };
    }
    return { id: base.id, title: row.title.trim(), visible: row.visible, hiddenColumns: [...new Set(row.hiddenColumns)], columnOrder: [...order] };
  });
}

export function loadReportLayout(source: string): ReportLayout[] {
  try {
    const raw = globalThis.localStorage?.getItem(key(source));
    if (!raw) return defaultReportLayout();
    const saved = JSON.parse(raw);
    if (saved.schemaVersion !== 1 || saved.source !== source) return defaultReportLayout();
    return validateReportLayout(saved.reports);
  } catch { return defaultReportLayout(); }
}

export function saveReportLayout(source: string, layout: ReportLayout[]): boolean {
  const reports = validateReportLayout(layout);
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key(source), JSON.stringify({ schemaVersion: 1, source, reports }));
    return true;
  } catch { return false; }
}

export function configuredReports(layout: ReportLayout[], includeHidden = false): ReportConfig[] {
  return layout.filter(row => includeHidden || row.visible).map(row => ({
    ...DEFAULT_REPORTS.find(report => report.id === row.id)!, title: row.title, hiddenColumns: [...row.hiddenColumns], columns: [...row.columnOrder],
  }));
}
