import { describe, expect, it } from 'vitest';
import { displayId } from '../src/domain/display-id';

describe('Mã ID hiển thị', () => {
  it.each([
    ['ID1', 'NQ', 'NQ01'],
    ['BC001', 'BC', 'BC01'],
    ['NQ123', 'NQ', 'NQ123'],
    ['NQ-MẪU-001', 'NQ', 'NQ01'],
  ])('định dạng %s theo loại %s thành %s', (displayCode, documentKind, expected) => {
    expect(displayId({ displayCode, documentKind: documentKind as 'NQ' | 'BC' })).toBe(expected);
  });

  it('giữ nguyên mã không nhận diện được', () => {
    expect(displayId({ displayCode: 'Ký hiệu hồ sơ', documentKind: 'NQ' })).toBe('Ký hiệu hồ sơ');
    expect(displayId({ displayCode: 'ID1', documentKind: 'UNCLASSIFIED' })).toBe('ID1');
  });

  it('chỉ tạo mã hiển thị và giữ nguyên recordId cùng mã nguồn', () => {
    const item = { recordId: 'sheet:row:7', displayCode: 'ID1', documentKind: 'NQ' as const };
    expect(displayId(item)).toBe('NQ01');
    expect(item).toEqual({ recordId: 'sheet:row:7', displayCode: 'ID1', documentKind: 'NQ' });
  });
});
