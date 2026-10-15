import type { Item } from '../../shared/types';
/** Định dạng hiển thị, không đổi recordId/mã gốc hoặc cắt số lớn. */
export function displayId(item: Pick<Item, 'displayCode' | 'documentKind'>): string {
  const raw = item.displayCode.trim();
  const match = /^(?:ID|NQ|BC)(?:[-_\s\p{L}]*?)(\d+)$/iu.exec(raw);
  if (!match || item.documentKind === 'UNCLASSIFIED') return raw;
  const number = match[1].replace(/^0+(?=\d)/, '');
  return `${item.documentKind}${number.padStart(2, '0')}`;
}
