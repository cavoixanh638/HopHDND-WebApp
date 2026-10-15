import { describe, expect, it } from 'vitest';
import { compareCatalogValues, orderValues } from '../src/domain/catalog-order';

describe('thứ tự danh mục', () => {
  it('áp dụng thứ tự đã lưu kể cả khi danh mục đầu vào bị đảo', () => {
    expect(orderValues(['Phòng C', 'Phòng A', 'Phòng B'], ['Phòng A', 'Phòng B', 'Phòng C']))
      .toEqual(['Phòng A', 'Phòng B', 'Phòng C']);
  });

  it('đưa giá trị chưa được ưu tiên về sau và sắp xếp theo tiếng Việt', () => {
    expect(orderValues(['Xã hội', 'Kinh tế', 'An ninh'], ['Kinh tế']))
      .toEqual(['Kinh tế', 'An ninh', 'Xã hội']);
  });

  it('giữ giá trị rỗng và chưa phân công như các giá trị bình thường', () => {
    expect(orderValues(['Chưa phân công', '', 'Phòng A'], ['Phòng A']))
      .toEqual(['Phòng A', '', 'Chưa phân công']);
  });

  it('giữ nguyên các bản sao đầu vào và không nhân bản theo thứ tự ưu tiên', () => {
    expect(orderValues(['B', 'A', 'A'], ['A', 'A', 'B'])).toEqual(['A', 'A', 'B']);
  });

  it('chỉ khớp chính xác, không gộp khác biệt dấu hoặc khoảng trắng', () => {
    expect(orderValues(['Ho so', 'Hồ sơ', 'Hồ sơ '], ['Hồ sơ']))
      .toEqual(['Hồ sơ', 'Ho so', 'Hồ sơ ']);
  });

  it('so sánh ổn định cho giá trị không có trong danh mục ưu tiên', () => {
    expect(compareCatalogValues('An ninh', 'Xã hội', [])).toBeLessThan(0);
    expect(compareCatalogValues('Xã hội', 'An ninh', [])).toBeGreaterThan(0);
  });
});
