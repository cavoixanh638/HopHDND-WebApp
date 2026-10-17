import { TEXT_FIELDS } from '../../shared/field-definitions';
export interface ItemColumn { key: string; label: string; width: number; visible: boolean }
export interface ItemLayout { columns: ItemColumn[]; tableWidth: number; frameWidth?: 'auto'|number }
export const defaultItemLayout = (): ItemLayout => ({ tableWidth: 1500, frameWidth:'auto',columns: [
  { key: 'displayCode', label: 'ID', width: 100, visible: true },
  { key: 'stt', label: 'STT', width: 70, visible: false },
  ...TEXT_FIELDS.map(field => ({ key: field.key, label: field.label, width: field.key === 'content' ? 440 : field.key === 'note' ? 240 : 170, visible: ['content', 'department', 'progressCouncil', 'specialist', 'room'].includes(field.key) })),
  { key: 'partyMeeting', label: 'Họp Thành ủy / xin ý kiến', width: 200, visible: true },
  { key: 'examined', label: 'Đã thẩm tra chưa', width: 170, visible: true },
  { key: 'isDropped', label: 'Trình / Rút', width: 130, visible: true },
  { key: 'history', label: 'Lịch sử', width: 100, visible: false },
] });
export function validateItemLayout(value: unknown): ItemLayout {
  if (!value || typeof value !== 'object') throw new Error('Bố trí danh sách không hợp lệ.');
  const input = value as ItemLayout, defaults = defaultItemLayout();
  if (!Number.isInteger(input.tableWidth) || input.tableWidth < 500 || input.tableWidth > 6000) throw new Error('Độ rộng tối thiểu phần cột bên trong cần từ 500 đến 6000 px (khác với độ rộng vùng danh sách).');
  const frameWidth=input.frameWidth??'auto';
  if(frameWidth!=='auto'&&(!Number.isInteger(frameWidth)||frameWidth<320||frameWidth>6000))throw new Error('Độ rộng vùng danh sách cần từ 320 đến 6000 px hoặc Tự động.');
  if (!Array.isArray(input.columns)||new Set(input.columns.map(column=>column.key)).size!==input.columns.length ||
      input.columns.some(column=>!defaults.columns.some(def=>def.key===column.key)))
    throw new Error('Danh sách cột không hợp lệ hoặc bị trùng.');
  // Saved Firebase/shared layouts were created before columns P/Q were supported.
  // Append the newly imported, read-only columns without discarding legacy order,
  // widths, filters or permissions.
  const columnsWithNewSourceFields = [
    ...input.columns,
    ...defaults.columns.filter(column=>!input.columns.some(existing=>existing.key===column.key) &&
      ['partyMeeting','examined'].includes(column.key)),
  ];
  if(columnsWithNewSourceFields.length!==defaults.columns.length)
    throw new Error('Danh sách cột cần đủ các cột của nguồn Excel.');
  const columns = columnsWithNewSourceFields.map(column => {
    const base = defaults.columns.find(entry => entry.key === column.key);
    if (!base || typeof column.visible !== 'boolean' || !Number.isInteger(column.width) || column.width < 60 || column.width > 1600) throw new Error('Độ rộng cột cần từ 60 đến 1600 px.');
    return { ...base, width: column.width, visible: column.visible };
  });
  if (!columns.some(column => column.visible && column.key !== 'history')) throw new Error('Cần ít nhất một cột dữ liệu hiển thị.');
  return { columns, tableWidth: input.tableWidth,frameWidth };
}
const key = (source: string) => `hdnd.item-layout.v1:${source}`;
export function loadItemLayout(source: string): ItemLayout { try { const raw = globalThis.localStorage?.getItem(key(source)); return raw ? validateItemLayout(JSON.parse(raw)) : defaultItemLayout(); } catch { return defaultItemLayout(); } }
export function saveItemLayout(source: string, value: ItemLayout): boolean { const layout = validateItemLayout(value); try { if (!globalThis.localStorage) return false; globalThis.localStorage.setItem(key(source), JSON.stringify(layout)); return true; } catch { return false; } }
