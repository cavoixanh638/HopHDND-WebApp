import {
  getReportFont, getReportFontSize, getReportVariant,
  withReportVisuals, TABLE_FONT_OPTIONS, REPORT_VARIANTS,
  MIN_TABLE_FONT_SIZE, MAX_TABLE_FONT_SIZE,
  type ReportLayout, type ReportVariant, type TableFont,
} from '../../data/report-preferences';

/**
 * G03 adapter: shared font / size / style are owned by the canonical report,
 * while emphasis and title highlighting belong to the selected report.
 * This is presentation-only; it must never touch counting or business fields.
 */
export type ReportInlineVisualValue = Readonly<{
  tableFont: TableFont;
  tableFontSize: number;
  reportVariant: ReportVariant;
  emphasizeProgress: boolean;
  titleAccentText: string;
  titleAccentColor: string;
}>;
export type ReportInlineVisualChange = Partial<ReportInlineVisualValue>;

export function inlineG03VisualValue(
  layout: readonly ReportLayout[], reportId: string,
): ReportInlineVisualValue {
  const report = layout.find(row => row.id === reportId);
  return {
    tableFont: getReportFont(layout),
    tableFontSize: getReportFontSize(layout),
    reportVariant: getReportVariant(layout),
    emphasizeProgress: report?.emphasizeProgress !== false,
    titleAccentText: report?.titleAccentText ?? '',
    titleAccentColor: report?.titleAccentColor ?? '#b42318',
  };
}

export function inlineG03VisualEqual(
  first: ReportInlineVisualValue, second: ReportInlineVisualValue,
): boolean {
  return first.tableFont === second.tableFont &&
    first.tableFontSize === second.tableFontSize &&
    first.reportVariant === second.reportVariant &&
    first.emphasizeProgress === second.emphasizeProgress &&
    first.titleAccentText === second.titleAccentText &&
    first.titleAccentColor.toLowerCase() === second.titleAccentColor.toLowerCase();
}

/** Return a NEW layout; invalid UI values are ignored, never persisted. */
export function inlineG03ApplyVisualChange(
  layout: ReportLayout[], reportId: string, patch: ReportInlineVisualChange,
): ReportLayout[] {
  if (!layout.some(row => row.id === reportId)) return layout;
  const shared: { tableFont?: TableFont; tableFontSize?: number; reportVariant?: ReportVariant } = {};
  if (patch.tableFont !== undefined &&
      TABLE_FONT_OPTIONS.some(option => option.value === patch.tableFont))
    shared.tableFont = patch.tableFont;
  if (patch.tableFontSize !== undefined &&
      Number.isSafeInteger(patch.tableFontSize) &&
      patch.tableFontSize >= MIN_TABLE_FONT_SIZE &&
      patch.tableFontSize <= MAX_TABLE_FONT_SIZE)
    shared.tableFontSize = patch.tableFontSize;
  if (patch.reportVariant !== undefined &&
      REPORT_VARIANTS.some(option => option.value === patch.reportVariant))
    shared.reportVariant = patch.reportVariant;

  const next = Object.keys(shared).length ? withReportVisuals(layout, shared) : layout;
  const perReport: Pick<ReportInlineVisualChange, 'emphasizeProgress' | 'titleAccentText' | 'titleAccentColor'> = {};
  if (typeof patch.emphasizeProgress === 'boolean') perReport.emphasizeProgress = patch.emphasizeProgress;
  if (typeof patch.titleAccentText === 'string' && patch.titleAccentText.length <= 80)
    perReport.titleAccentText = patch.titleAccentText;
  if (typeof patch.titleAccentColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(patch.titleAccentColor))
    perReport.titleAccentColor = patch.titleAccentColor;
  if (!Object.keys(perReport).length) return next;
  return next.map(row => row.id === reportId ? { ...row, ...perReport } : row);
}

/** Cancel only visual edits; titles, widths, status counts and other drafts stay untouched. */
export function inlineG03RestoreVisual(
  draft: ReportLayout[], saved: readonly ReportLayout[], reportId: string,
): ReportLayout[] {
  if (!saved.some(row => row.id === reportId)) return draft;
  return inlineG03ApplyVisualChange(draft, reportId, inlineG03VisualValue(saved, reportId));
}
