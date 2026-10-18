import type { ReportConfig } from '../../shared/types';
import { DEFAULT_REPORTS } from '../domain/reporting';

/** Font choices use local/system fonts only; unavailable families fall back. */
export type TableFont =
  'segoe'|'system'|'arial'|'roboto'|'inter'|
  'helvetica'|'openSans'|'lato'|'notoSans'|'plex';
/** Backward compatible values: each value now controls colors ONLY. */
export type ReportVariant = 'signal'|'classic'|'compact';
export const TABLE_FONT_OPTIONS:ReadonlyArray<{value:TableFont;label:string;description:string}> = [
  {value:'system',label:'Apple / System UI (SF Pro trên Apple)',description:'Tự chọn font hệ điều hành'},
  {value:'segoe',label:'Segoe UI (Microsoft)',description:'Font Windows, giao diện hiện tại'},
  {value:'inter',label:'Inter',description:'Thiết kế UI hiện đại, ưu tiên số liệu'},
  {value:'roboto',label:'Roboto (Google)',description:'Dễ đọc trên màn hình'},
  {value:'helvetica',label:'Helvetica Neue',description:'Phong cách tối giản'},
  {value:'arial',label:'Arial',description:'Phổ biến trong văn bản'},
  {value:'openSans',label:'Open Sans',description:'Dễ đọc nhiều dòng'},
  {value:'lato',label:'Lato',description:'Mềm mại, rõ nét'},
  {value:'notoSans',label:'Noto Sans',description:'Hỗ trợ chữ có dấu tốt'},
  {value:'plex',label:'IBM Plex Sans',description:'Phong cách dữ liệu chuyên nghiệp'}
];
export const REPORT_VARIANTS:ReadonlyArray<{value:ReportVariant;label:string;description:string}> = [
  {value:'classic',label:'Dịu – rõ ràng',description:'Pastel phân biệt các giai đoạn; đọc lâu dễ chịu'},
  {value:'signal',label:'Nổi bật – ưu tiên',description:'Nền đậm màu hơn, dễ phát hiện nội dung cần chú ý'},
  {value:'compact',label:'Tương phản cao',description:'Nền đậm nhất, chữ nổi rõ; cùng bố cục với hai mẫu trên'}
];
export const DEFAULT_TABLE_FONT_SIZE=13;
export const MIN_TABLE_FONT_SIZE=11;
export const MAX_TABLE_FONT_SIZE=20;
export function tableFontStack(font:TableFont):string {
  switch(font){
    case 'system': return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    case 'arial': return 'Arial, "Helvetica Neue", sans-serif';
    case 'roboto': return 'Roboto, "Segoe UI", system-ui, sans-serif';
    case 'inter': return 'Inter, "Segoe UI", system-ui, sans-serif';
    case 'helvetica': return '"Helvetica Neue", Helvetica, Arial, sans-serif';
    case 'openSans': return '"Open Sans", "Segoe UI", system-ui, sans-serif';
    case 'lato': return 'Lato, "Segoe UI", system-ui, sans-serif';
    case 'notoSans': return '"Noto Sans", "Segoe UI", system-ui, sans-serif';
    case 'plex': return '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif';
    default: return '"Segoe UI", system-ui, -apple-system, sans-serif';
  }
}
export function getReportFont(layout:readonly ReportLayout[]):TableFont {
  return layout.find(row=>row.id===widthOwnerId)?.tableFont??'segoe';
}
export function getReportFontSize(layout:readonly ReportLayout[]):number {
  return layout.find(row=>row.id===widthOwnerId)?.tableFontSize??DEFAULT_TABLE_FONT_SIZE;
}
export function getReportVariant(layout:readonly ReportLayout[]):ReportVariant {
  return layout.find(row=>row.id===widthOwnerId)?.reportVariant??'classic';
}
export function withReportVisuals(layout:ReportLayout[],
  change:{tableFont?:TableFont;tableFontSize?:number;reportVariant?:ReportVariant}):ReportLayout[] {
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
  tableFontSize?:number;
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
  ...(report.id===widthOwnerId?{tableFont:'segoe' as const,tableFontSize:DEFAULT_TABLE_FONT_SIZE,reportVariant:'classic' as const}:{}),
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
      const tableFontSize=row.tableFontSize??DEFAULT_TABLE_FONT_SIZE;
      const reportVariant=row.reportVariant??'classic';
      if(!TABLE_FONT_OPTIONS.some(option=>option.value===tableFont))
        throw new Error('Phông chữ của bảng không nằm trong danh sách cho phép.');
      if(!Number.isSafeInteger(tableFontSize)||tableFontSize<MIN_TABLE_FONT_SIZE||tableFontSize>MAX_TABLE_FONT_SIZE)
        throw new Error('Cỡ chữ bảng phải từ 11 đến 20 px.');
      if(!REPORT_VARIANTS.some(option=>option.value===reportVariant))
        throw new Error('Kiểu trình bày bảng không hợp lệ.');
      return { id:base.id,title:row.title.trim(),visible:row.visible,
        hiddenColumns:[...new Set(row.hiddenColumns)],columnOrder:[...order],
        pageWidth,emphasizeProgress:row.emphasizeProgress!==false,tableFont,tableFontSize,reportVariant };
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
  const tableFont=getReportFont(layout),tableFontSize=getReportFontSize(layout),reportVariant=getReportVariant(layout);
  return layout.filter(row => includeHidden || row.visible).map(row => ({
    ...DEFAULT_REPORTS.find(report => report.id === row.id)!, title: row.title, hiddenColumns: [...row.hiddenColumns], columns: [...row.columnOrder], emphasizeProgress:row.emphasizeProgress!==false,
    tableFont,tableFontSize,reportVariant,
  }));
}
