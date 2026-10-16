import type { ItemLayout } from '../../data/item-preferences';
import { DeferredWidthInput } from './DeferredWidthInput';

type ItemColumnPanelProps = {
  layout: ItemLayout;
  onChange: (next: ItemLayout) => void;
  validationMessage?: string;
};

export function ItemColumnPanel({ layout, onChange, validationMessage }: ItemColumnPanelProps) {
  const updateColumn = (index: number, change: Partial<ItemLayout['columns'][number]>) => {
    onChange({
      ...layout,
      columns: layout.columns.map((column, current) => current === index ? { ...column, ...change } : column),
    });
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= layout.columns.length) return;
    const columns = [...layout.columns];
    [columns[index], columns[target]] = [columns[target], columns[index]];
    onChange({ ...layout, columns });
  };

  const invalidTable=!Number.isInteger(layout.tableWidth)||layout.tableWidth<500||layout.tableWidth>6000;
  const invalidColumns=layout.columns.filter(c=>!Number.isInteger(c.width)||c.width<60||c.width>1600);
  const repairOldWidths=()=>onChange({
    ...layout,
    tableWidth:invalidTable?1500:layout.tableWidth,
    columns:layout.columns.map(c=>invalidColumns.some(b=>b.key===c.key)?{...c,width:c.key==='content'?440:c.key==='note'?240:170}:c),
  });
  return (
    <details className="card item-column-panel">
      <summary>Cột và độ rộng bảng</summary>
      <div className="settings-grid">
        {(invalidTable||invalidColumns.length>0)&&<div className="layout-invalid-recovery" role="alert">
          <strong>Có độ rộng cũ chưa hợp lệ:</strong>
          {invalidTable&&<span>Phần cột bên trong = {layout.tableWidth} px (hợp lệ 500–6000 px).</span>}
          {invalidColumns.length>0&&<span>{invalidColumns.length} cột có độ rộng ngoài giới hạn 60–1600 px.</span>}
          <button type="button" className="button ghost" onClick={repairOldWidths}>Sửa các độ rộng cũ chưa hợp lệ</button>
        </div>}
        {validationMessage&&<div className="layout-inline-error" role="alert">
          <strong>Chưa lưu được bố trí: </strong>{validationMessage}
          <span>Kiểm tra ô độ rộng tương ứng ngay tại đây rồi bấm Lưu lại. Kích thước đang hiển thị vẫn được giữ nguyên.</span>
        </div>}
        <div className="item-frame-controls">
          <label className="field" htmlFor="item-visible-frame-width">
            Độ rộng vùng danh sách (px) — chỉ áp dụng khi nhấn Enter hoặc rời ô
          </label>
          <DeferredWidthInput id="item-visible-frame-width" label="Độ rộng vùng danh sách (px)"
            value={layout.frameWidth==='auto'||layout.frameWidth===undefined?1500:layout.frameWidth}
            min={320} max={6000}
            onCommit={frameWidth=>onChange({...layout,frameWidth})}/>
          <label className="layout-visibility">
            <input type="checkbox" checked={layout.frameWidth==='auto'||layout.frameWidth===undefined}
              onChange={event=>onChange({...layout,frameWidth:event.currentTarget.checked?'auto':1500})}/>
            Tự động theo độ rộng màn hình
          </label>
          <p className="muted">{layout.frameWidth==='auto'||layout.frameWidth===undefined
            ?'Đang tự động lấp đầy vùng làm việc. Nhập một số rồi nhấn Enter hoặc rời ô để áp dụng.'
            :`Vùng danh sách rộng ${layout.frameWidth} px (tối đa bằng cửa sổ). Nhấn Enter hoặc rời ô để áp dụng độ rộng mới; các cột sẽ cuộn ngang nếu rộng hơn.`}</p>
        </div>
        <details className="item-layout-advanced">
          <summary>Độ rộng tối thiểu phần cột bên trong (nâng cao)</summary>
          <label className="field">
            Độ rộng tối thiểu của các cột (px)
            <DeferredWidthInput label="Độ rộng tối thiểu các cột (px)"
              value={layout.tableWidth} min={500} max={6000}
              onCommit={tableWidth=>onChange({...layout,tableWidth})}/>
          </label>
          <p className="muted">Giá trị này không đổi độ rộng vùng danh sách phía ngoài. Tổng độ rộng các cột có thể lớn hơn; khi đó dùng thanh cuộn ngang bên trong bảng.</p>
        </details>
        <div className="column-config-grid">
          {layout.columns.map((column, index) => (
            <div className="column-config-row" key={column.key}>
              <label className="field">
                <input
                  type="checkbox"
                  checked={column.visible}
                  aria-label={`Hiện cột ${column.label}`}
                  onChange={event => updateColumn(index, { visible: event.target.checked })}
                />
                Hiện cột {column.label}
              </label>
              <label className="field">
                Độ rộng cột {column.label} (px)
                <DeferredWidthInput label={`Độ rộng cột ${column.label} (px)`}
                  value={column.width} min={60} max={1600}
                  onCommit={width=>updateColumn(index,{width})}/>
              </label>
              <div className="top-actions" aria-label={`Sắp xếp cột ${column.label}`}>
                <button className="button ghost" type="button" aria-label={`Đưa cột ${column.label} lên`} onClick={() => moveColumn(index, -1)} disabled={index === 0}>Lên</button>
                <button className="button ghost" type="button" aria-label={`Đưa cột ${column.label} xuống`} onClick={() => moveColumn(index, 1)} disabled={index === layout.columns.length - 1}>Xuống</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
