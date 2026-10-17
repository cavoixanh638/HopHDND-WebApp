import type { Item } from '../../shared/types';
/** Định dạng hiển thị: mã tạm của dòng Sheets thiếu mã vẫn được giữ bên trong để kiểm soát dữ liệu, nhưng ô trên bảng chỉ hiện gạch ngang. */
export const isMissingDisplayCode = (raw:string)=>!raw.trim()||(raw.startsWith('Dòng ')&&raw.includes('(thiếu mã)'));
export function displayId(item: Pick<Item, 'displayCode' | 'documentKind'>): string {
  const raw = item.displayCode.trim();
  if(isMissingDisplayCode(raw))return '—';
  const match = /^(?:ID|NQ|BC)(?:[-_\s\p{L}]*?)(\d+)$/iu.exec(raw);
  if (!match || item.documentKind === 'UNCLASSIFIED') return raw;
  const number = match[1].replace(/^0+(?=\d)/, '');
  return `${item.documentKind}${number.padStart(2, '0')}`;
}
