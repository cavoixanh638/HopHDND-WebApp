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
        <div className="item-frame-controls">
          <label className="field" htmlFor="item-visible-frame-width">
            Độ rộng vùng danh sách (px) — thay đổi ngay
          </label>
          <input id="item-visible-frame-width" aria-label="Độ rộng vùng danh sách (px)"
            type="number" min={320} max={6000} step={1}
            placeholder="Tự động theo màn hình"
            value={layout.frameWidth==='auto'||layout.frameWidth===undefined?'':layout.frameWidth}
            onChange={event=>{
              const raw=event.currentTarget.value;
              onChange({...layout,frameWidth:raw===''?'auto':Number(raw)});
            }}/>
          <label className="layout-visibility">
            <input type="checkbox" checked={layout.frameWidth==='auto'||layout.frameWidth===undefined}
              onChange={event=>onChange({...layout,frameWidth:event.currentTarget.checked?'auto':1500})}/>
            Tự động theo độ rộng màn hình
          </label>
          <p className="muted">{layout.frameWidth==='auto'||layout.frameWidth===undefined
            ?'Đang tự động lấp đầy vùng làm việc. Nhập một số để đặt độ rộng cố định và xem thay đổi ngay.'
            :`Vùng danh sách rộng ${layout.frameWidth} px (tối đa bằng cửa sổ). Tiêu đề, bộ lọc và các khung sẽ căn giữa theo cùng độ rộng; bảng cuộn ngang nếu cột rộng hơn.`}</p>
        </div>
        <details className="item-layout-advanced">
          <summary>Độ rộng tối thiểu phần cột bên trong (nâng cao)</summary>
          <label className="field">
            Độ rộng tối thiểu của các cột (px)
            <input
              type="number"
              min={600}
              max={6000}
              value={layout.tableWidth}
              onChange={event => onChange({ ...layout, tableWidth: Number(event.target.value) })}
            />
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
