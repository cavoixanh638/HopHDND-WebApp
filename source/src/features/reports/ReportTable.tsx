import { useMemo, useRef } from 'react';
import type { GroupField, Item, ReportConfig } from '../../../shared/types';
import { aggregateReport } from '../../domain/reporting';
import { compareCatalogValues } from '../../domain/catalog-order';

export function ReportTable({ items, config, group, onSelect, sourceLabel = 'Dữ liệu mẫu', preview = false, groupOrder = [] }: { items: Item[]; config: ReportConfig; group: GroupField; onSelect: (title: string, items: Item[]) => void; sourceLabel?: string; preview?: boolean; groupOrder?:string[] }) {
  const report = useMemo(() => aggregateReport(items, config, group), [items, config, group]);
  const ref = useRef<HTMLElement>(null);
  const print = () => {
    if (!ref.current) return;
    const element = document.createElement('section');
    element.id = 'print-target';
    element.innerHTML = ref.current.innerHTML;
    element.querySelectorAll('button').forEach(button => button.replaceWith(document.createTextNode(button.textContent ?? '')));
    const note = document.createElement('p');
    note.textContent = `${sourceLabel} · In lúc ${new Date().toLocaleString('vi-VN')} · Tổng ${report.total}`;
    element.prepend(note);
    document.body.append(element);
    document.body.classList.add('is-printing');
    try { window.print(); } finally { document.body.classList.remove('is-printing'); element.remove(); }
  };
  return <section className="card" ref={ref}>
    <div className="card-header"><div><h3>{config.title}</h3><p className="muted">{report.total} nội dung · Xác nhận hoàn thành: {report.percent === null ? '—' : `${report.percent}%`}</p></div>{!preview && <button className="button ghost" onClick={print}>In / PDF</button>}</div>
    {report.unknown.length > 0 && <p className="unknown-note">Chưa chuẩn hóa: {report.unknown.join(', ')}. Các nội dung này vẫn được tính trong tổng.</p>}
    {report.hiddenCount > 0 && <p className="unknown-note">Có {report.hiddenCount} nội dung thuộc cột ẩn; tổng và tỷ lệ vẫn tính đầy đủ.</p>}
    <div className="table-wrap"><table className="data-table report-table"><thead><tr><th>Nhóm phụ trách</th>{report.columns.map(column => <th key={column}>{column}</th>)}<th>Tổng</th></tr></thead><tbody>
      {[...report.rows.entries()].sort(([a], [b]) => compareCatalogValues(a,b,groupOrder)).map(([label, cells]) => <tr key={label}><th>{label}</th>{report.columns.map(column => {
        const entries = cells.get(column) ?? [];
        return <td key={column}>{entries.length ? preview ? <strong>{entries.length}</strong> : <button className="count-button" aria-label={`${label}: ${column}, ${entries.length} nội dung`} onClick={() => onSelect(`${label} · ${column}`, entries)}>{entries.length}</button> : '—'}</td>;
      })}<td><strong>{[...cells.values()].reduce((sum, rows) => sum + rows.length, 0)}</strong></td></tr>)}
      {!report.total && <tr><td className="empty" colSpan={report.columns.length + 2}>Không có nội dung trong phạm vi này.</td></tr>}
    </tbody><tfoot><tr><th>Tổng cộng</th>{report.columns.map(column => <td key={column}>{[...report.rows.values()].reduce((sum, cells) => sum + (cells.get(column)?.length ?? 0), 0)}</td>)}<td>{report.total}</td></tr></tfoot></table></div>
  </section>;
}
