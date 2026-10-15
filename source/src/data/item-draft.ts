import { defaultItemLayout, validateItemLayout, type ItemLayout } from './item-preferences';
/** Nháp có thể đang nhập số 0/trống; chỉ bản áp dụng phải qua validation chặt. */
export function validateItemDraft(value: unknown): ItemLayout {
  const input = value as ItemLayout;
  if (!input || !Array.isArray(input.columns)) throw new Error('Nháp bố trí không hợp lệ.');
  const defaults = defaultItemLayout();
  if (input.columns.some(column=>typeof column.visible !== 'boolean')) throw new Error('Nháp hiển thị không hợp lệ.');
  const safe = validateItemLayout({ ...input, tableWidth: defaults.tableWidth,frameWidth:'auto', columns: input.columns.map((column,index) => ({ ...column, width: 170, visible: index===0 || column.visible })) });
  if (typeof input.tableWidth !== 'number' || input.columns.some(column => typeof column.width !== 'number')) throw new Error('Nháp độ rộng không hợp lệ.');
  if(input.frameWidth!==undefined&&input.frameWidth!=='auto'&&typeof input.frameWidth!=='number')throw new Error('Nháp khung không hợp lệ.');
  return { ...safe, tableWidth: input.tableWidth,frameWidth:input.frameWidth??'auto', columns: safe.columns.map(column => ({ ...column, width: input.columns.find(entry => entry.key === column.key)!.width, visible:input.columns.find(entry => entry.key===column.key)!.visible })) };
}
