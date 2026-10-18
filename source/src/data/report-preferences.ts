import type { ReportConfig } from '../../shared/types';
import { DEFAULT_REPORTS, PARTY_STATUS_ALIASES } from '../domain/reporting';

/** Open-source families are loaded as web fonts; OS-proprietary families remain local-only. */
export type TableFont =
  'segoe'|'system'|'arial'|'roboto'|'inter'|
  'helvetica'|'openSans'|'lato'|'notoSans'|'plex';
/** Keep the three existing stored IDs valid; they now select different visual techniques. */
export type ReportVariant = 'signal'|'classic'|'compact'|'bars'|'band';
export const TABLE_FONT_OPTIONS:ReadonlyArray<{value:TableFont;label:string;description:string}> = [
  {value:'system',label:'Apple / System UI (SF Pro trên Apple)',description:'Tự chọn font hệ điều hành'},
  {value:'segoe',label:'Segoe UI (Microsoft)',description:'Font Windows, giao diện hiện tại'},
  {value:'inter',label:'Inter (Web font)',description:'Tải tự động từ Google Fonts khi có Internet'},
  {value:'roboto',label:'Roboto (Web font)',description:'Tải tự động từ Google Fonts khi có Internet'},
  {value:'helvetica',label:'Helvetica Neue',description:'Phong cách tối giản'},
  {value:'arial',label:'Arial',description:'Phổ biến trong văn bản'},
  {value:'openSans',label:'Open Sans (Web font)',description:'Tải tự động từ Google Fonts khi có Internet'},
  {value:'lato',label:'Lato (Web font)',description:'Tải tự động từ Google Fonts khi có Internet'},
  {value:'notoSans',label:'Noto Sans (Web font)',description:'Tải tự động từ Google Fonts khi có Internet'},
  {value:'plex',label:'IBM Plex Sans (Web font)',description:'Tải tự động từ Google Fonts khi có Internet'}
];
export const REPORT_VARIANTS:ReadonlyArray<{value:ReportVariant;label:string;description:string}> = [
  {value:'classic',label:'1. Phủ màu toàn ô',description:'Cả tiêu đề và ô số cùng nền màu trạng thái; nhìn rõ từng cột.'},
  {value:'signal',label:'2. Nhãn màu nổi',description:'Giống ảnh tham khảo: nền trắng, tiêu đề dạng nhãn, số nằm trong huy hiệu.'},
  {value:'compact',label:'3. Viền màu phân cột',description:'Giữ ô trắng, dùng viền cạnh và gạch chân màu để nhận biết cột.'},
  {value:'bars',label:'4. Thanh dữ liệu',description:'Thanh ngang thể hiện số lượng tương đối trong từng cột trạng thái.'},
  {value:'band',label:'5. Dải tiêu đề màu',description:'Tô đậm cả hàng tiêu đề theo trạng thái, thân bảng trung tính.'}
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
  if(!Array.isArray(value))throw new Error('Cấu hình cần đủ bốn bảng báo cáo.');
  // Existing Firebase/Sheets/local users have three saved reports. Insert the
  // new construction-NQ report before the issuance-NQ report WITHOUT losing
  // visibility, custom titles, column order, widths or any unsaved profile IDs.
  const legacyIds=value.map(entry=>entry&&typeof entry==='object'?(entry as Partial<ReportLayout>).id:null);
  const isLegacy=value.length===3&&
    new Set(legacyIds).size===3&&['party','nq','bc'].every(id=>legacyIds.includes(id));
  const rows:unknown[]=isLegacy?[...value]:value;
  if(isLegacy){
    const nqIndex=legacyIds.indexOf('nq');
    rows.splice(nqIndex,0,defaultReportLayout().find(row=>row.id==='build')!);
  }
  if(rows.length!==DEFAULT_REPORTS.length)throw new Error('Cấu hình cần đủ bốn bảng báo cáo.');
  const used = new Set<string>();
  return rows.map(entry => {
    if (!entry || typeof entry !== 'object') throw new Error('Cấu hình bảng không hợp lệ.');
    const row = entry as Partial<ReportLayout>;
    const base = DEFAULT_REPORTS.find(report => report.id === row.id);
    if (!base || used.has(base.id)) throw new Error('Mã bảng không hợp lệ hoặc bị trùng.');
    used.add(base.id);
    if (typeof row.title !== 'string' || !row.title.trim() || row.title.trim().length > 160) throw new Error('Tên bảng cần từ 1 đến 160 ký tự.');
    const rename=(column:string)=>base.id==='party'?PARTY_STATUS_ALIASES[column]??column:column;
    if (typeof row.visible !== 'boolean' || !Array.isArray(row.hiddenColumns) || row.hiddenColumns.some(column => typeof column !== 'string' || !base.columns.includes(rename(column)))) throw new Error('Cột hoặc trạng thái hiển thị không hợp lệ.');
    const hiddenColumns=[...new Set(row.hiddenColumns.map(rename))];
    const rawOrder = row.columnOrder ?? base.columns;
    if (!Array.isArray(rawOrder) || rawOrder.some(column=>typeof column!=='string')) throw new Error('Thứ tự cột không hợp lệ.');
    // Migrate the previous nine-column Party profile (old + replacement
    // meeting milestones were both stored) into one canonical column.
    // Only a legacy name COLLIDING with its exact replacement may be deduped;
    // repeated identical names and other invalid profiles remain errors.
    const order:string[]=[];
    const originalOf=new Map<string,string>();
    for(const rawColumn of rawOrder){
      const column=rename(rawColumn);
      if(!base.columns.includes(column))throw new Error('Thứ tự cột chứa trạng thái lạ hoặc bị trùng.');
      const seen=originalOf.get(column);
      if(seen!==undefined){
        const legacyPair=base.id==='party'&&column==='Đã họp/xin phiếu, chưa có TBKL'
          &&seen!==rawColumn
          &&[seen,rawColumn].some(name=>name==='Đã họp, chưa có TBKL'||name==='Đã họp chưa có TBKL');
        if(!legacyPair)throw new Error('Thứ tự cột chứa trạng thái lạ hoặc bị trùng.');
        continue;
      }
      originalOf.set(column,rawColumn);
      order.push(column);
    }
    if(order.length!==base.columns.length){
      // Older saved profiles had no 'Đã có TBKL' column. Add only that
      // explicitly introduced milestone; preserve every other user ordering.
      const missing=base.columns.filter(column=>!order.includes(column));
      if(base.id!=='party'||missing.length!==1||missing[0]!=='Đã có TBKL')
        throw new Error('Thứ tự cột cần đủ các cột của bảng và không trùng.');
      const next=base.columns.slice(base.columns.indexOf(missing[0])+1).find(col=>order.includes(col));
      order.splice(next?order.indexOf(next):order.length,0,missing[0]);
    }
    const title=base.id==='party'&&row.title==='Nội dung cần xin ý kiến Thành ủy'?base.title
      :base.id==='nq'&&row.title==='Nội dung trình ban hành nghị quyết'?base.title
      :base.id==='bc'&&row.title==='Báo cáo trình Hội đồng nhân dân'?base.title:row.title.trim();
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
      return { id:base.id,title,visible:row.visible,
        hiddenColumns,columnOrder:[...order],
        pageWidth,emphasizeProgress:row.emphasizeProgress!==false,tableFont,tableFontSize,reportVariant };
    }
    return { id: base.id, title, visible: row.visible, hiddenColumns, columnOrder: [...order], emphasizeProgress:row.emphasizeProgress!==false };
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
