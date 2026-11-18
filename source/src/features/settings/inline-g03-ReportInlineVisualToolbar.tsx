import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  DEFAULT_TABLE_FONT_SIZE, MAX_TABLE_FONT_SIZE, MIN_TABLE_FONT_SIZE,
  REPORT_VARIANTS, TABLE_FONT_OPTIONS, type ReportVariant, type TableFont,
} from '../../data/report-preferences';
import { loadSelectedWebFont } from '../../data/on-demand-fonts';
import type { ReportInlineVisualChange, ReportInlineVisualValue } from './inline-g03-report-visual-adapter';
import './inline-g03-report-visual-toolbar.css';

export type ReportInlineVisualToolbarProps = {
  reportId: string;
  reportTitle: string;
  /** The host must pass its VERIFIED admin authorization, not merely sign-in. */
  canEdit: boolean;
  /** Local draft only; no persistence on change, pointer movement or typing. */
  value: ReportInlineVisualValue;
  onChange: (change: ReportInlineVisualChange) => void;
  /** Explicit action: host must reuse the existing admin revision/CAS writer. */
  onSave?: () => void | Promise<void>;
  /** Revert presentation fields from the host's last saved configuration. */
  onCancel?: () => void;
  dirty?: boolean;
  disabled?: boolean;
};

const EXAMPLES = [
  { key: 'source', label: 'Sở', value: 19 },
  { key: 'office', label: 'VP', value: 4 },
  { key: 'next', label: 'Tiếp', value: 2 },
  { key: 'completed', label: 'Xong', value: 1 },
] as const;

/**
 * Reusable, inline Aa / palette control. Designed to sit just above a report.
 * The toolbar never calls Firebase or localStorage: all previews update a
 * controlled draft, while Save/Cancel are separate explicit host callbacks.
 */
export function ReportInlineVisualToolbar({
  reportId, reportTitle, canEdit, value, onChange, onSave, onCancel,
  dirty = false, disabled = false,
}: ReportInlineVisualToolbarProps) {
  const [open, setOpen] = useState<'font' | 'palette' | null>(null);
  const id = useId();
  const fontButton = useRef<HTMLButtonElement>(null);
  const paletteButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (canEdit) loadSelectedWebFont(value.tableFont); }, [canEdit, value.tableFont]);

  if (!canEdit) return null;

  const change = (patch: ReportInlineVisualChange) => {
    if (!disabled) onChange(patch);
  };
  const escape = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Escape' || !open) return;
    event.preventDefault();
    event.stopPropagation(); // Do not close the parent ReportSettings editor.
    setOpen(null);
    (open === 'font' ? fontButton : paletteButton).current?.focus();
  };
  const selected = REPORT_VARIANTS.find(style => style.value === value.reportVariant);
  return <div className="inline-g03-visual-toolbar" data-g03-visual-toolbar={reportId}
    onKeyDown={escape}>
    <div className="inline-g03-toolbar-row" role="toolbar"
      aria-label={'Chỉnh kiểu hiển thị của ' + reportTitle}>
      <span className="inline-g03-toolbar-caption">Chỉnh ngay trên bảng</span>
      <button type="button" ref={fontButton} className="inline-g03-tool"
        aria-label="Phông chữ và cỡ chữ"
        aria-expanded={open === 'font'} aria-controls={id + '-font'}
        disabled={disabled}
        onClick={() => setOpen(previous => previous === 'font' ? null : 'font')}>
        <strong aria-hidden="true">Aa</strong><span>{value.tableFontSize}px</span>
      </button>
      <button type="button" ref={paletteButton} className="inline-g03-tool"
        aria-label="Phong cách và tô màu báo cáo"
        aria-expanded={open === 'palette'} aria-controls={id + '-palette'}
        disabled={disabled}
        onClick={() => setOpen(previous => previous === 'palette' ? null : 'palette')}>
        <span aria-hidden="true">🎨</span><span>{selected?.label.split('. ')[1] ?? 'Màu'}</span>
      </button>
      {dirty && <span className="inline-g03-unsaved" role="status">Đang xem trước · chưa lưu</span>}
      {onCancel && <button type="button" className="button ghost inline-g03-action"
        disabled={disabled || !dirty} onClick={() => { if (!disabled) { setOpen(null); onCancel(); } }}>
        Hủy kiểu bảng
      </button>}
      {onSave && <button type="button" className="button primary inline-g03-action"
        disabled={disabled || !dirty} onClick={() => { if (!disabled) { setOpen(null); void onSave(); } }}>
        Lưu kiểu bảng
      </button>}
    </div>

    {open === 'font' && <div id={id + '-font'} className="inline-g03-panel"
      role="group" aria-label="Phông và cỡ chữ dùng chung cho tất cả báo cáo">
      <label className="inline-g03-field" htmlFor={id + '-family'}>
        <span>Phông chữ · chung 5 bảng</span>
        <select id={id + '-family'} value={value.tableFont} disabled={disabled}
          onChange={event => change({ tableFont: event.currentTarget.value as TableFont })}>
          {TABLE_FONT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="inline-g03-field inline-g03-range" htmlFor={id + '-size'}>
        <span>Cỡ chữ · {MIN_TABLE_FONT_SIZE}–{MAX_TABLE_FONT_SIZE}px</span>
        <span className="inline-g03-range-line">
          <input id={id + '-size'} type="range" min={MIN_TABLE_FONT_SIZE}
            max={MAX_TABLE_FONT_SIZE} step={1} value={value.tableFontSize} disabled={disabled}
            onChange={event => change({ tableFontSize: Number(event.currentTarget.value) })}/>
          <output htmlFor={id + '-size'}>{value.tableFontSize}px</output>
        </span>
      </label>
      <button type="button" className="button ghost inline-g03-reset-size"
        disabled={disabled || value.tableFontSize === DEFAULT_TABLE_FONT_SIZE}
        onClick={() => change({ tableFontSize: DEFAULT_TABLE_FONT_SIZE })}>
        Mặc định {DEFAULT_TABLE_FONT_SIZE}px
      </button>
      <p className="inline-g03-hint">Phông và cỡ chữ áp dụng chung cho cả 5 bảng; bản xem trước thay đổi ngay.</p>
    </div>}

    {open === 'palette' && <div id={id + '-palette'} className="inline-g03-panel"
      role="group" aria-label="Kiểu tô màu và nhấn mạnh nội dung">
      <fieldset className="inline-g03-style-list">
        <legend>5 phong cách · áp dụng chung cho mọi báo cáo</legend>
        {REPORT_VARIANTS.map(option => <label
          key={option.value}
          className={'report-visual-option report-style-' + option.value + ' inline-g03-style-option'}>
          <span><input type="radio" name={id + '-style'} value={option.value}
            disabled={disabled} checked={value.reportVariant === option.value}
            onChange={() => change({ reportVariant: option.value as ReportVariant })}/>{option.label}</span>
          <small>{option.description}</small>
          <span className="report-visual-example" aria-hidden="true">
            {EXAMPLES.map(example => <span key={example.key}
              className={'report-example-cell report-example-' + example.key}>
              <b>{example.label}</b><i>{example.value}</i>
            </span>)}
          </span>
        </label>)}
      </fieldset>
      <label className="inline-g03-emphasis">
        <input type="checkbox" checked={value.emphasizeProgress} disabled={disabled}
          onChange={event => change({ emphasizeProgress: event.currentTarget.checked })}/>
        Tô màu các cột trạng thái · chỉ bảng này
      </label>
      <div className="inline-g03-highlight-row">
        <label className="inline-g03-field" htmlFor={id + '-accent'}>
          <span>Từ/cụm từ tô màu trong tên bảng này</span>
          <input id={id + '-accent'} type="text" maxLength={80}
            placeholder="Ví dụ: Nghị quyết" value={value.titleAccentText}
            disabled={disabled}
            onChange={event => change({ titleAccentText: event.currentTarget.value })}/>
        </label>
        <label className="inline-g03-field inline-g03-color-field" htmlFor={id + '-color'}>
          <span>Màu chữ</span>
          <input id={id + '-color'} type="color" value={value.titleAccentColor}
            disabled={disabled} aria-label="Màu chữ tô từ trong tên bảng"
            onChange={event => change({ titleAccentColor: event.currentTarget.value })}/>
        </label>
        <button type="button" className="button ghost inline-g03-remove-accent"
          disabled={disabled || !value.titleAccentText}
          onClick={() => change({ titleAccentText: '' })}>
          Bỏ tô màu
        </button>
      </div>
      <p className="inline-g03-hint">Kiểu màu là chung; màu trạng thái và từ khóa là riêng từng bảng. Không thay đổi số liệu hay trạng thái nguồn.</p>
    </div>}
  </div>;
}
