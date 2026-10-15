import type { ItemLayout } from '../../data/item-preferences';

type ItemColumnPanelProps = {
  layout: ItemLayout;
  onChange: (next: ItemLayout) => void;
};

export function ItemColumnPanel({ layout, onChange }: ItemColumnPanelProps) {
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

  return (
    <details className="card item-column-panel">
      <summary>Cột và khung bảng</summary>
      <div className="settings-grid">
        <div className="item-frame-controls">
          <label className="field">
            Độ rộng khung bảng
            <select
              value={layout.frameWidth === 'auto' || layout.frameWidth === undefined ? 'auto' : 'fixed'}
              onChange={event => onChange({ ...layout, frameWidth: event.target.value === 'auto' ? 'auto' : 1500 })}
            >
              <option value="auto">Tự động</option>
              <option value="fixed">Theo số px</option>
            </select>
          </label>
          {layout.frameWidth !== 'auto' && layout.frameWidth !== undefined && (
            <label className="field">
              Độ rộng khung bảng (px)
              <input
                type="number"
                min={320}
                max={6000}
                value={layout.frameWidth}
                onChange={event => onChange({ ...layout, frameWidth: Number(event.target.value) })}
              />
            </label>
          )}
          <p className="muted">Khung trắng bị giới hạn tối đa bằng màn hình; bảng rộng hơn sẽ cuộn bên trong khung.</p>
        </div>
        <details className="item-layout-advanced">
          <summary>Cấu hình nâng cao</summary>
          <label className="field">
            Độ rộng nội dung bảng (px)
            <input
              type="number"
              min={600}
              max={6000}
              value={layout.tableWidth}
              onChange={event => onChange({ ...layout, tableWidth: Number(event.target.value) })}
            />
          </label>
          <p className="muted">Chiều rộng tối thiểu của nội dung bảng, từ 600–6000 px. Nếu tổng độ rộng cột lớn hơn, bảng dùng tổng đó; nếu nhỏ hơn, các cột chia phần rộng còn lại.</p>
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
                <input
                  type="number"
                  min={60}
                  max={1600}
                  value={column.width}
                  aria-label={`Độ rộng cột ${column.label} (px)`}
                  onChange={event => updateColumn(index, { width: Number(event.target.value) })}
                />
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
