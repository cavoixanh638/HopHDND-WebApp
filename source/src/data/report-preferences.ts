import type { ReportConfig } from '../../shared/types';
import { DEFAULT_REPORTS } from '../domain/reporting';

export type TableFont = 'segoe'|'system'|'arial'|'roboto'|'inter';
export type ReportVariant = 'signal'|'classic'|'compact';
export const TABLE_FONT_OPTIONS:ReadonlyArray<{value:TableFont;label:string;description:string}> = [
  {value:'segoe',label:'Segoe UI',description:'Font hiện tại trên Windows'},
  {value:'system',label:'System UI · phong cách Apple',description:'SF Pro trên thiết bị Apple; Segoe UI trên Windows'},
  {value:'arial',label:'Arial',description:'Gọn, quen thuộc với bảng văn bản'},
  {value:'roboto',label:'Roboto',description:'Ưu tiên Roboto nếu đã cài trên máy'},
  {value:'inter',label:'Inter',description:'Ưu tiên Inter nếu đã cài trên máy'}
];
export const REPORT_VARIANTS:ReadonlyArray<{value:ReportVariant;label:string;description:string}> = [
  {value:'signal',label:'Ưu tiên cảnh báo',description:'Đỏ – Sở chưa trình; vàng – Văn phòng; xanh – hoàn thành'},
  {value:'classic',label:'Báo cáo chuẩn',description:'Nền hàng và cột rõ nét, nhấn màu vừa phải'},
  {value:'compact',label:'Bảng cô đọng',description:'Nhiều dòng hơn trên màn hình, màu chỉ tập trung vào số'}
];
export function tableFontStack(font:TableFont):string {
  switch(font){
    case 'system': return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'arial': return 'Arial, "Helvetica Neue", sans-serif';
    case 'roboto': return 'Roboto, "Segoe UI", system-ui, sans-serif';
    case 'inter': return 'Inter, "Segoe UI", system-ui, sans-serif';
    default: return '"Segoe UI", system-ui, -apple-system, sans-serif';
  }
}
export function getReportFont(layout:readonly ReportLayout[]):TableFont {
  return layout.find(row=>row.id===widthOwnerId)?.tableFont??'segoe';
}
export function getReportVariant(layout:readonly ReportLayout[]):ReportVariant {
  return layout.find(row=>row.id===widthOwnerId)?.reportVariant??'signal';
}
export function withReportVisuals(layout:ReportLayout[],change:{tableFont?:TableFont;reportVariant?:ReportVariant}):ReportLayout[] {
  return layout.map(row=>row.id===widthOwnerId?{...row,...change}:row);
}

export interface ReportLayout {
  id: string;
  title: string;
  visible: boolean;
  hiddenColumns: string[];
  columnOrder: string[];
  /** Visual emphasis only; does not affect report totals or source rules. */
  emphasizeProgress?:boolean;
  /** Shared presentation settings, owned by the first canonical report. */
  tableFont?:TableFont;
  reportVariant?:ReportVariant;
  /** Shared page width, stored only on the fixed canonical report ID for backwards compatibility. */
  pageWidth?: 'auto'|number;
}

const widthOwnerId=DEFAULT_REPORTS[0].id;
export const reportPageWidth=(layout:readonly ReportLayout[]):'auto'|number=>layout.find(row=>row.id===widthOwnerId)?.pageWidth??'auto';
export const withReportPageWidth=(layout:ReportLayout[],pageWidth:'auto'|number):ReportLayout[]=>layout.map(row=>row.id===widthOwnerId?{...row,pageWidth}:row);
const key = (source: string) => `hdnd.report-layout.v1:${source}`;
export const defaultReportLayout = (): ReportLayout[] => DEFAULT_REPORTS.map(report => ({
  id: report.id, title: report.title, visible: true, hiddenColumns: [], columnOrder: [...report.columns],emphasizeProgress:true,
  ...(report.id===widthOwnerId?{tableFont:'segoe' as const,reportVariant:'signal' as const}:{}),
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
      const tableFont=row.tableFont??'segoe';
      const reportVariant=row.reportVariant??'signal';
      if(!TABLE_FONT_OPTIONS.some(option=>option.value===tableFont))
        throw new Error('Phông chữ của bảng không nằm trong danh sách cho phép.');
      if(!REPORT_VARIANTS.some(option=>option.value===reportVariant))
        throw new Error('Kiểu trình bày bảng không hợp lệ.');
      return { id:base.id,title:row.title.trim(),visible:row.visible,
        hiddenColumns:[...new Set(row.hiddenColumns)],columnOrder:[...order],
        pageWidth,emphasizeProgress:row.emphasizeProgress!==false,tableFont,reportVariant };
    }
    return { id: base.id, title: row.title.trim(), visible: row.visible, hiddenColumns: [...new Set(row.hiddenColumns)], columnOrder: [...order], emphasizeProgress:row.emphasizeProgress!==false };
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
  const tableFont=getReportFont(layout),reportVariant=getReportVariant(layout);
  return layout.filter(row => includeHidden || row.visible).map(row => ({
    ...DEFAULT_REPORTS.find(report => report.id === row.id)!, title: row.title, hiddenColumns: [...row.hiddenColumns], columns: [...row.columnOrder], emphasizeProgress:row.emphasizeProgress!==false,
    tableFont,reportVariant,
  }));
}
