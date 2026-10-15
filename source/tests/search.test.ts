import { describe, expect, it } from 'vitest';
import { createDemoItems } from '../src/data/demo-items';
import { createSearchIndex, matchesSearch, normalizeSearch } from '../src/domain/search';

describe('search helpers', () => {
  it('normalizes Vietnamese accents, đ, case, and surrounding whitespace', () => {
    expect(normalizeSearch('  ĐÃ TRÌNH HĐND  ')).toBe('da trinh hdnd');
  });

  it('finds demo records by code, content, department, room, or specialist', () => {
    const items = createDemoItems();
    const index = createSearchIndex(items);
    const first = items[0];
    for (const query of ['NQ-MẪU-001', 'nông nghiệp', 'Sở mẫu A', 'Phòng mẫu 1', 'Chuyên viên mẫu A']) {
      expect(matchesSearch(first, query, index), query).toBe(true);
    }
    expect(matchesSearch(first, 'không có kết quả', index)).toBe(false);
  });

  it('treats a blank search as no filter and can search without a prebuilt index entry', () => {
    const item = createDemoItems(1)[0];
    expect(matchesSearch(item, '   ', new Map())).toBe(true);
    expect(matchesSearch(item, 'chuyen vien mau a', new Map())).toBe(true);
  });
});
