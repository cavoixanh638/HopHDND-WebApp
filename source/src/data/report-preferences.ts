import type { ReportConfig } from '../../shared/types';
import { DEFAULT_REPORTS } from '../domain/reporting';
import {canonicalStatus,STATUS_ALIASES} from '../domain/status-contract';

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
  titleAccentText?:string;
  titleAccentColor?:string;
  visible: boolean;
  hiddenColumns: string[];
  /** Party/Build NQ: explicit opt-in to show the non-applicable column.
   * Old saved layouts without this flag receive the new hidden-by-default policy. */
  showNotRequiredColumn?:boolean;
  columnOrder: string[];
  /** Pixel widths of report columns, including reserved __group/__total/__percent keys. */
  columnWidths?:Record<string,number>;
  /** Visual emphasis only; does not affect report totals or source rules. */
  emphasizeProgress?:boolean;
  /** Party/Build-NQ: exclude 'Không phải trình' by default; explicit saved true stays valid. */
  includeNotRequired?:boolean;
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

/** Party and Build-NQ column visibility defaults to hidden independently of counting.
 * An explicit admin opt-in survives validation, sharing and future saves. */
export const reportHiddenColumns=(row:Pick<ReportLayout,'id'|'hiddenColumns'|'showNotRequiredColumn'>):string[]=>
  !['party','build'].includes(row.id)?[...row.hiddenColumns]:row.showNotRequiredColumn===true
    ?row.hiddenColumns.filter(col=>col!=='Không phải trình')
    :[...new Set([...row.hiddenColumns,'Không phải trình'])];

export const defaultReportLayout = (): ReportLayout[] => DEFAULT_REPORTS.map(report => ({
  id: report.id, title: report.title, visible: true, hiddenColumns: [...report.hiddenColumns], columnOrder: [...report.columns],emphasizeProgress:true,
  ...(['party','build'].includes(report.id)?{includeNotRequired:false,showNotRequiredColumn:false}:{}),
  ...(report.id===widthOwnerId?{tableFont:'segoe' as const,tableFontSize:DEFAULT_TABLE_FONT_SIZE,reportVariant:'classic' as const}:{}),
  ...(report.id===widthOwnerId?{pageWidth:'auto' as const}:{}),
}));

/** Chỉ điều chỉnh trình bày; không nhận thay đổi bộ lọc hoặc quy tắc nghiệp vụ. */
export function validateReportLayout(value: unknown): ReportLayout[] {
  if(!Array.isArray(value))throw new Error('Cấu hình cần đủ năm bảng báo cáo.');
  // Backward compatible: saved profiles may contain three, four or five
  // reports. Insert new official reports without resetting custom settings.
  const savedIds=value.map(entry=>entry&&typeof entry==='object'?(entry as Partial<ReportLayout>).id:null);
  const uniqueIds=new Set(savedIds);
  if(savedIds.length<3||savedIds.length>5||
     uniqueIds.size!==savedIds.length||
     !['party','nq','bc'].every(id=>uniqueIds.has(id))||
     savedIds.some(id=>!DEFAULT_REPORTS.some(base=>base.id===id)))
    throw new Error('Cấu hình cần đủ năm bảng báo cáo.');
  const rows:unknown[]=[...value];
  for(const missingId of ['build','council']){
    if(uniqueIds.has(missingId))continue;
    const desired=DEFAULT_REPORTS.map(report=>report.id);
    const following=desired.slice(desired.indexOf(missingId)+1)
      .find(id=>rows.some(entry=>(entry as Partial<ReportLayout>).id===id));
    const before=following===undefined?rows.length
      :rows.findIndex(entry=>(entry as Partial<ReportLayout>).id===following);
    rows.splice(before,0,defaultReportLayout().find(row=>row.id===missingId)!);
  }
  if(rows.length!==DEFAULT_REPORTS.length)throw new Error('Cấu hình cần đủ năm bảng báo cáo.');
  const used = new Set<string>();
  return rows.map(entry => {
    if (!entry || typeof entry !== 'object') throw new Error('Cấu hình bảng không hợp lệ.');
    const row = entry as Partial<ReportLayout>;
    const base = DEFAULT_REPORTS.find(report => report.id === row.id);
    if (!base || used.has(base.id)) throw new Error('Mã bảng không hợp lệ hoặc bị trùng.');
    used.add(base.id);
    if (typeof row.title !== 'string' || !row.title.trim() || row.title.trim().length > 160) throw new Error('Tên bảng cần từ 1 đến 160 ký tự.');
    // Only presentation labels are migrated; source Excel cells are untouched.
    // Saved profiles from previous builds may include both superseded and new
    // columns. Collapse only recognized predecessor/successor pairs.
    const legacy=STATUS_ALIASES[base.statusField];
    // Old column labels which are ambiguous are no longer inferred as a
    // finished milestone. Drop ONLY the obsolete report presentation column
    // and preserve its source Item/status for "Chưa chuẩn hóa" inspection.
    const obsolete=new Set(base.id==='party'
      ?['Sở xin rút','TU đã cho ý kiến','Đã báo cáo TU']
      :['nq','bc','council'].includes(base.id)?['Sở xin rút']:[]);
    const rename=(col:string)=>canonicalStatus(base.statusField,col);
    const hiddenValues=row.hiddenColumns;
    if(typeof row.visible!=='boolean'||!Array.isArray(hiddenValues)||
      hiddenValues.some(col=>typeof col!=='string'||(!base.columns.includes(rename(col))&&!obsolete.has(col))))
      throw new Error('Cột hoặc trạng thái hiển thị không hợp lệ.');
    const hiddenColumns=[...new Set(hiddenValues.filter(col=>!obsolete.has(col)).map(rename))];
    if(['party','build'].includes(base.id)&&row.showNotRequiredColumn!==undefined&&
       typeof row.showNotRequiredColumn!=='boolean')
      throw new Error('Tùy chọn hiển thị cột Không phải trình phải là Có hoặc Không.');
    const normalizedHiddenColumns=reportHiddenColumns({
      id:base.id,hiddenColumns,showNotRequiredColumn:row.showNotRequiredColumn,
    });
    const notRequiredVisibility=['party','build'].includes(base.id)
      ?{showNotRequiredColumn:row.showNotRequiredColumn===true}:{};

    const rawOrder=row.columnOrder??base.columns;
    if(!Array.isArray(rawOrder)||rawOrder.some(col=>typeof col!=='string'))
      throw new Error('Thứ tự cột không hợp lệ.');
    const hasOld=rawOrder.some(col=>rename(col)!==col||obsolete.has(col));
    const order:string[]=[];
    const originals=new Map<string,string>();
    for(const original of rawOrder){
      if(obsolete.has(original))continue;
      const col=rename(original);
      if(!base.columns.includes(col))
        throw new Error('Thứ tự cột chứa trạng thái lạ hoặc bị trùng.');
      const previous=originals.get(col);
      if(previous!==undefined){
        const recognizedPair=previous!==original
          &&(rename(previous)!==previous||rename(original)!==original);
        if(!recognizedPair)throw new Error('Thứ tự cột chứa trạng thái lạ hoặc bị trùng.');
        continue;
      }
      originals.set(col,original);order.push(col);
    }
    if(order.length!==base.columns.length){
      const missing=base.columns.filter(col=>!order.includes(col));
      const introducingNotRequired=['party','build'].includes(base.id)&&missing.length===1&&missing[0]==='Không phải trình';
      if(!hasOld&&!introducingNotRequired)
        throw new Error('Thứ tự cột cần đủ các cột của bảng và không trùng.');
      for(const add of missing){
        const next=base.columns.slice(base.columns.indexOf(add)+1).find(col=>order.includes(col));
        order.splice(next?order.indexOf(next):order.length,0,add);
      }
    }
    const rawWidths=row.columnWidths??{};
    if(!rawWidths||typeof rawWidths!=='object'||Array.isArray(rawWidths)||
      Object.keys(rawWidths).some(key=>
        !['__group','__total','__percent','Chưa chuẩn hóa',...base.columns].includes(rename(key))&&
        !obsolete.has(key)))
      throw new Error('Độ rộng cột báo cáo không hợp lệ (80–1200 px).');
    if(Object.values(rawWidths).some(width=>
      !Number.isSafeInteger(width)||width<80||width>1200))
      throw new Error('Độ rộng cột báo cáo không hợp lệ (80–1200 px).');
    const widths:Record<string,number>={};
    // Prefer an explicit new key over its legacy alias on collisions.
    for(const [key,width] of Object.entries(rawWidths).sort(([a],[b])=>
      Number(a===rename(a))-Number(b===rename(b)))){
      if(obsolete.has(key))continue;
      widths[rename(key)]=width;
    }
    const columnWidths=Object.keys(widths).length>0?widths:undefined;
    if(['party','build'].includes(base.id)&&row.includeNotRequired!==undefined&&typeof row.includeNotRequired!=='boolean')
      throw new Error('Cách tính nội dung Không phải trình phải là Bao gồm hoặc Không bao gồm.');
    const notRequiredCountSetting=['party','build'].includes(base.id)?{includeNotRequired:row.includeNotRequired===true}:{};
    const accentText=row.titleAccentText??'';
    const accentColor=row.titleAccentColor??'#b42318';
    if(typeof accentText!=='string'||accentText.length>80||
      typeof accentColor!=='string'||!/^#[0-9a-fA-F]{6}$/.test(accentColor))
      throw new Error('Từ tô màu tên bảng hoặc mã màu không hợp lệ.');
    const accentSettings=accentText.trim()?{titleAccentText:accentText.trim(),titleAccentColor:accentColor}:{};
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
      return { id:base.id,title,...accentSettings,visible:row.visible,
        hiddenColumns:normalizedHiddenColumns,...notRequiredVisibility,...notRequiredCountSetting,columnOrder:[...order],...(columnWidths?{columnWidths}:{}),
        pageWidth,emphasizeProgress:row.emphasizeProgress!==false,tableFont,tableFontSize,reportVariant };
    }
    return { id: base.id, title, ...accentSettings, ...notRequiredCountSetting, visible: row.visible, hiddenColumns:normalizedHiddenColumns, ...notRequiredVisibility,columnOrder: [...order], ...(columnWidths?{columnWidths}:{}), emphasizeProgress:row.emphasizeProgress!==false };
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
    ...DEFAULT_REPORTS.find(report => report.id === row.id)!, title: row.title,
    ...(['party','build'].includes(row.id)?{includeNotRequired:row.includeNotRequired===true}:{}),
    ...(row.titleAccentText?{titleAccentText:row.titleAccentText,titleAccentColor:row.titleAccentColor}:{}), hiddenColumns: reportHiddenColumns(row), columns: [...row.columnOrder], emphasizeProgress:row.emphasizeProgress!==false,
    tableFont,tableFontSize,reportVariant,
    ...(row.columnWidths&&Object.keys(row.columnWidths).length?{columnWidths:{...row.columnWidths}}:{}),
  }));
}
