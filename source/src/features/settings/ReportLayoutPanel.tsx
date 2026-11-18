import type { GroupField, Item } from '../../../shared/types';
import type {ReportGroupIdentityRegistry} from '../../domain/report-reference-identity';
import {configuredReports,reportPageWidth,withReportPageWidth,type ReportLayout} from '../../data/report-preferences';
import {ReportInlineVisualToolbar} from './inline-g03-ReportInlineVisualToolbar';
import {inlineG03ApplyVisualChange,inlineG03VisualEqual,inlineG03VisualValue} from './inline-g03-report-visual-adapter';
import {DeferredWidthInput} from '../items/DeferredWidthInput';
import { ReportTable } from '../reports/ReportTable';

type ReportLayoutPanelProps = {
  draft: ReportLayout[];
  onChange: (next: ReportLayout[]) => void;
  items: Item[];
  group: GroupField;
  sourceLabel: string;
  groupOrder:string[];
  groupIdentities?:ReportGroupIdentityRegistry;
  /** Existing admin writer; this button MUST NOT directly access Firebase. */
  onSaveVisual?: () => void | Promise<void>;
  /** Restores only visual fields from the last confirmed save. */
  onCancelVisual?: (reportId:string) => void;
  savedVisualBaseline?: readonly ReportLayout[];
  visualDisabled?: boolean;
};

export function ReportLayoutPanel({ draft, onChange, items, group, sourceLabel, groupOrder, groupIdentities,
  onSaveVisual, onCancelVisual, savedVisualBaseline, visualDisabled=false }: ReportLayoutPanelProps) {
  const update = (index: number, change: Partial<ReportLayout>) => {
    onChange(draft.map((report, current) => current === index ? { ...report, ...change } : report));
  };

  const moveReport = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const moveColumn = (reportIndex: number, columnIndex: number, direction: -1 | 1) => {
    const report = draft[reportIndex];
    const order = [...report.columnOrder];
    const target = columnIndex + direction;
    if (target < 0 || target >= order.length) return;
    [order[columnIndex], order[target]] = [order[target], order[columnIndex]];
    update(reportIndex, { columnOrder: order });
  };

  const previews = configuredReports(draft, true);
  const pageWidth=reportPageWidth(draft);

  return (
    <section className="card" aria-labelledby="report-layout-heading">
      <div className="card-header">
        <div>
          <h3 id="report-layout-heading">Bố trí bảng báo cáo</h3>
          <p className="muted">Thay đổi bố trí được áp dụng sau khi bấm Lưu.</p>
        </div>
      </div>
      <details className="report-global-options"><summary>Thiết lập chung: độ rộng, màu sắc, phông chữ</summary>
      <div className="report-page-width-controls">
        <strong>Độ rộng trang Bảng báo cáo</strong>
        <label className="field" htmlFor="report-page-width">Độ rộng trang (px)</label>
        <DeferredWidthInput id="report-page-width" label="Độ rộng trang Bảng báo cáo (px)"
          value={pageWidth==='auto'?1920:pageWidth} min={320} max={6000}
          onCommit={width=>onChange(withReportPageWidth(draft,width))}/>
        <label className="layout-visibility">
          <input type="checkbox" checked={pageWidth==='auto'}
            onChange={event=>onChange(withReportPageWidth(draft,event.currentTarget.checked?'auto':1920))}/>
          Tự động sử dụng toàn bộ chiều rộng màn hình
        </label>
      </div>
      <p className="report-font-hint">Kiểu bảng, phông chữ và màu được chỉnh ngay trên phần xem trước từng bảng bên dưới; phông/cỡ chữ và phong cách là cấu hình dùng chung cho cả 5 bảng.</p>
      </details>
      <h4 className="report-per-table-heading">Thiết lập từng bảng ({draft.length} bảng)</h4>
      <div className="settings-grid">
        {draft.map((report, index) => {
          const preview = previews.find(candidate => candidate.id === report.id)!;
          return <article className="layout-row" key={report.id}>
            <div className="layout-row-main">
              <label className="field">
                Tên bảng {index + 1}
                <input
                  type="text"
                  maxLength={160}
                  value={report.title}
                  onChange={event => update(index, { title: event.target.value })}
                />
              </label>
              <label className="field layout-visibility">
                <input
                  type="checkbox"
                  checked={report.visible}
                  onChange={event => update(index, { visible: event.target.checked })}
                />
                Hiển thị bảng {index + 1}
              </label>
              {!report.visible && <span className="status-pill">Đang ẩn</span>}
              {['party','build'].includes(report.id)&&<label className="field build-count-setting" htmlFor={`${report.id}-count-mode`}>
                Cách tính số liệu — nội dung “Không phải trình”
                <select id={`${report.id}-count-mode`} aria-label={`Cách tính nội dung Không phải trình - ${report.title}`}
                  value={report.includeNotRequired===true?'include':'exclude'}
                  onChange={event=>update(index,{includeNotRequired:event.currentTarget.value==='include'})}>
                  <option value="include">Bao gồm nội dung “Không phải trình”</option>
                  <option value="exclude">Không bao gồm nội dung “Không phải trình”</option>
                </select>
                <small><strong>Quy tắc tính số liệu:</strong> thay đổi này ảnh hưởng tổng đếm trên bảng báo cáo, không chỉ màu sắc hay cách hiển thị. Không đổi giá trị nguồn Excel hoặc Danh sách dữ liệu.</small>
              </label>}
              <div className="top-actions" aria-label={`Sắp xếp bảng ${index + 1}`}>
                <button className="button ghost" type="button" aria-label={`Đưa bảng ${index + 1} lên`} onClick={() => moveReport(index, -1)} disabled={index === 0}>Lên</button>
                <button className="button ghost" type="button" aria-label={`Đưa bảng ${index + 1} xuống`} onClick={() => moveReport(index, 1)} disabled={index === draft.length - 1}>Xuống</button>
              </div>
              <details className="advanced-settings report-columns-disclosure"><summary>Thứ tự và hiển thị cột · Nâng cao</summary><fieldset>
                <legend>Thứ tự cột</legend>
                <ol className="column-order-list">
                  {report.columnOrder.map((column, columnIndex) => <li key={column}>
                    <span>{column}</span>
                    <span className="top-actions">
                      <button className="button ghost" type="button" aria-label={`Đưa cột ${column} lên`} onClick={() => moveColumn(index, columnIndex, -1)} disabled={columnIndex === 0}>Lên</button>
                      <button className="button ghost" type="button" aria-label={`Đưa cột ${column} xuống`} onClick={() => moveColumn(index, columnIndex, 1)} disabled={columnIndex === report.columnOrder.length - 1}>Xuống</button>
                    </span>
                  </li>)}
                </ol>
                <div className="column-choices">
                  {report.columnOrder.map(column => {
                    // Use all canonical columns here, not preview.columns (which
                    // intentionally omit hidden ones), so admin can show them again.
                    const exempt=['party','build'].includes(report.id)&&column==='Không phải trình';
                    const shown=exempt?report.showNotRequiredColumn===true:
                      !report.hiddenColumns.includes(column);
                    return <label key={column}><input type="checkbox" checked={shown}
                      onChange={()=>update(index,{
                        hiddenColumns:shown?[...new Set([...report.hiddenColumns,column])]:
                          report.hiddenColumns.filter(value=>value!==column),
                        ...(exempt?{showNotRequiredColumn:!shown}:{})
                      })}/>{column}</label>;
                  })}
                </div>
              </fieldset></details>
            </div>
            <div className="report-layout-preview">
              <ReportInlineVisualToolbar
                reportId={report.id} reportTitle={report.title} canEdit
                disabled={visualDisabled}
                value={inlineG03VisualValue(draft,report.id)}
                dirty={!!savedVisualBaseline&&!inlineG03VisualEqual(
                  inlineG03VisualValue(draft,report.id),
                  inlineG03VisualValue(savedVisualBaseline,report.id))}
                onChange={change=>onChange(inlineG03ApplyVisualChange(draft,report.id,change))}
                onSave={onSaveVisual}
                onCancel={onCancelVisual?()=>onCancelVisual(report.id):undefined}/>
              <details className="report-preview-disclosure">
                <summary>Xem trước bảng {index+1}: {report.title}{report.visible?'':' (đang ẩn)'}</summary>
                <p className="muted">Kéo đường phân cách ở tiêu đề để điều chỉnh độ rộng cột. Chỉ áp dụng chung sau khi bấm Lưu Bảng báo cáo.</p>
                <ReportTable items={items} config={preview} group={group} groupOrder={groupOrder} groupIdentities={groupIdentities} sourceLabel={sourceLabel} onSelect={() => {}} preview
                  onColumnResize={(column,width)=>update(index,{columnWidths:{...(report.columnWidths??{}),[column]:width}})} />
              </details>
            </div>
          </article>;
        })}
      </div>
    </section>
  );
}
