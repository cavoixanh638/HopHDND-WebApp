import type { GroupField, Item } from '../../../shared/types';
import {configuredReports,getReportFont,getReportFontSize,getReportVariant,withReportVisuals,
  TABLE_FONT_OPTIONS,REPORT_VARIANTS,MIN_TABLE_FONT_SIZE,MAX_TABLE_FONT_SIZE,reportPageWidth,withReportPageWidth,
  type ReportLayout,type TableFont,type ReportVariant} from '../../data/report-preferences';
import {DeferredWidthInput} from '../items/DeferredWidthInput';
import { ReportTable } from '../reports/ReportTable';

type ReportLayoutPanelProps = {
  draft: ReportLayout[];
  onChange: (next: ReportLayout[]) => void;
  items: Item[];
  group: GroupField;
  sourceLabel: string;
  groupOrder:string[];
};

export function ReportLayoutPanel({ draft, onChange, items, group, sourceLabel, groupOrder }: ReportLayoutPanelProps) {
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
  const font=getReportFont(draft),fontSize=getReportFontSize(draft),variant=getReportVariant(draft);
  const updateVisual=(next:{tableFont?:TableFont;tableFontSize?:number;reportVariant?:ReportVariant})=>
    onChange(withReportVisuals(draft,next));

  return (
    <section className="card" aria-labelledby="report-layout-heading">
      <div className="card-header">
        <div>
          <h3 id="report-layout-heading">Bố trí bảng báo cáo</h3>
          <p className="muted">Thay đổi bố trí được áp dụng sau khi bấm Lưu.</p>
        </div>
      </div>
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
      <div className="report-visual-config" aria-label="Kiểu bảng và phông chữ thống kê">
        <h4>5 phong cách tô màu báo cáo</h4>
        <p className="report-font-hint">Mỗi phong cách có cách thể hiện khác nhau, không chỉ đổi độ đậm. Dữ liệu, cách tính và ý nghĩa trạng thái vẫn giữ nguyên. Gợi ý: Nhãn màu nổi để xem hằng ngày; Thanh dữ liệu để so sánh khối lượng.</p>
        <div className="report-visual-options" role="radiogroup" aria-label="Phong cách tô màu báo cáo">
          {REPORT_VARIANTS.map(option=><label className={'report-visual-option report-style-'+option.value} key={option.value}>
            <span><input type="radio" name="report-visual-variant"
              checked={variant===option.value}
              onChange={()=>updateVisual({reportVariant:option.value})}/>{option.label}</span>
            <small>{option.description}</small>
            <span className="report-visual-example" aria-hidden="true">
              {([["source","Sở",19],["office","VP",4],["next","Tiếp",2],["completed","Xong",1]] as const).map(([stage,label,count])=><span key={stage} className={"report-example-cell report-example-"+stage}>
                <b>{label}</b><i>{count}</i>
              </span>)}
            </span>
          </label>)}
        </div>
        <div className="report-font-control">
          <label htmlFor="report-font-family"><strong>Font chữ chung cho mọi bảng</strong></label>
          <select id="report-font-family" aria-label="Font chữ chung cho mọi bảng"
            value={font} onChange={event=>updateVisual({tableFont:event.currentTarget.value as TableFont})}>
            {TABLE_FONT_OPTIONS.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </div>
        <div className="report-font-size-control">
          <label htmlFor="report-font-size"><strong>Cỡ chữ tất cả các bảng</strong></label>
          <input id="report-font-size" aria-label="Cỡ chữ tất cả các bảng" type="range"
            min={MIN_TABLE_FONT_SIZE} max={MAX_TABLE_FONT_SIZE} step={1}
            value={fontSize} onChange={event=>updateVisual({tableFontSize:Number(event.currentTarget.value)})}/>
          <output htmlFor="report-font-size">{fontSize} px</output>
          <button type="button" className="button ghost" disabled={fontSize===13}
            onClick={()=>updateVisual({tableFontSize:13})}>Cỡ mặc định</button>
        </div>
        <p className="report-font-hint">{TABLE_FONT_OPTIONS.find(option=>option.value===font)?.description}.
          6 font mở (Inter, Roboto, Open Sans, Lato, Noto Sans, IBM Plex Sans) được tải qua Google Fonts khi có Internet.
          Font Apple/Microsoft/Helvetica/Arial phụ thuộc font có sẵn trên máy; khi không tải được font web, trình duyệt dùng font dự phòng.
          Xem trước ngay, chỉ áp dụng chung sau khi bấm Lưu Bảng báo cáo.</p>
      </div>
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
              <div className="report-title-accent-config">
                <label className="field">Từ/cụm từ trong tên bảng cần tô màu
                  <input type="text" maxLength={80} placeholder="Ví dụ: Nghị quyết"
                    aria-label={`Từ tô màu tên bảng ${index+1}`}
                    value={report.titleAccentText??''}
                    onChange={event=>update(index,{titleAccentText:event.currentTarget.value})}/>
                </label>
                <label className="field">Màu chữ
                  <input type="color" aria-label={`Màu chữ tên bảng ${index+1}`}
                    value={report.titleAccentColor??'#b42318'}
                    onChange={event=>update(index,{titleAccentColor:event.currentTarget.value})}/>
                </label>
                <button className="button ghost" type="button"
                  onClick={()=>update(index,{titleAccentText:''})}
                  disabled={!report.titleAccentText}>Bỏ tô màu</button>
              </div>
              <label className="field layout-visibility">
                <input
                  type="checkbox"
                  checked={report.visible}
                  onChange={event => update(index, { visible: event.target.checked })}
                />
                Hiển thị bảng {index + 1}
              </label>
              {!report.visible && <span className="status-pill">Đang ẩn</span>}
              <label className="field layout-visibility"><input type="checkbox" checked={report.emphasizeProgress!==false} onChange={event=>update(index,{emphasizeProgress:event.currentTarget.checked})}/>Tô màu các cột trạng thái trong bảng này</label>
              {report.id==='build'&&<label className="field build-count-setting" htmlFor="build-count-mode">
                Cách tính số liệu — nội dung “Không phải trình”
                <select id="build-count-mode" aria-label="Cách tính nội dung Không phải trình"
                  value={report.includeNotRequired===false?'exclude':'include'}
                  onChange={event=>update(index,{includeNotRequired:event.currentTarget.value==='include'})}>
                  <option value="include">Bao gồm nội dung “Không phải trình”</option>
                  <option value="exclude">Không bao gồm nội dung “Không phải trình”</option>
                </select>
                <small>Chỉ ảnh hưởng thống kê của bảng này; không đổi trạng thái trong Excel hoặc Danh sách dữ liệu.</small>
              </label>
              <div className="top-actions" aria-label={`Sắp xếp bảng ${index + 1}`}>
                <button className="button ghost" type="button" aria-label={`Đưa bảng ${index + 1} lên`} onClick={() => moveReport(index, -1)} disabled={index === 0}>Lên</button>
                <button className="button ghost" type="button" aria-label={`Đưa bảng ${index + 1} xuống`} onClick={() => moveReport(index, 1)} disabled={index === draft.length - 1}>Xuống</button>
              </div>
              <fieldset className="advanced-settings">
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
                  {preview.columns.map(column => <label key={column}><input type="checkbox" checked={!report.hiddenColumns.includes(column)} onChange={() => update(index, { hiddenColumns: report.hiddenColumns.includes(column) ? report.hiddenColumns.filter(value => value !== column) : [...report.hiddenColumns, column] })} />{column}</label>)}
                </div>
              </fieldset>
            </div>
            <div className="report-layout-preview">
              <p className="muted">Xem trước bố trí này{report.visible ? '' : ' (đang ẩn trên dashboard)'} · Kéo đường phân cách ở tiêu đề để thay đổi độ rộng cột.</p>
              <ReportTable items={items} config={preview} group={group} groupOrder={groupOrder} sourceLabel={sourceLabel} onSelect={() => {}} preview
                 onColumnResize={(column,width)=>update(index,{columnWidths:{...(report.columnWidths??{}),[column]:width}})} />
            </div>
          </article>;
        })}
      </div>
    </section>
  );
}
