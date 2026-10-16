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
      <summary>Cột và độ rộng bảng</summary>
      <div className="settings-grid">
        <details className="item-layout-advanced">
          <summary>Độ rộng nội dung bảng</summary>
          <label className="field">
            Độ rộng tối thiểu của bảng (px)
            <input
              type="number"
              min={600}
              max={6000}
              value={layout.tableWidth}
              onChange={event => onChange({ ...layout, tableWidth: Number(event.target.value) })}
            />
          </label>
          <p className="muted">Khung và thanh công cụ luôn rộng bằng vùng làm việc. Bảng tự lấp đầy khung; nếu nhiều cột hoặc đặt độ rộng tối thiểu lớn hơn, phần bảng sẽ cuộn ngang bên trong.</p>
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
