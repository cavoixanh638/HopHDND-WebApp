import { describe, expect, it } from 'vitest';
import { createDemoItems } from '../src/data/demo-items';
import { aggregateReport, DEFAULT_REPORTS, getKpis } from '../src/domain/reporting';

describe('Báo cáo có cùng tập dữ liệu và không mất tổng', () => {
  it('fixture không đặt Không phải xin ý kiến cho nội dung cần xin ý kiến', () => {
    for (const item of createDemoItems(100)) {
      if (item.partyLevel !== 'Không phải xin ý kiến') expect(item.progressParty).not.toBe('Không phải xin ý kiến');
    }
  });
  it('rút/lưu trữ không tính nhưng đề nghị rút vẫn tính', () => {
    const seed = createDemoItems(4);
    seed[0].isDropped = true;
    seed[1].archivedAt = '2026-01-01';
    seed[2].progressCouncil = 'Sở xin rút';
    expect(getKpis(seed).total).toBe(2);
  });
  it('ẩn một cột không đổi tổng/tỷ lệ; giá trị lạ còn chi tiết', () => {
    const items = createDemoItems(3).map((item, i) => ({ ...item, documentKind: 'NQ' as const, progressCouncil: ['Hoàn thành', 'Sở chưa trình', 'Trạng thái mới'][i] }));
    const config = { ...DEFAULT_REPORTS[1], hiddenColumns: ['Hoàn thành'] };
    const report = aggregateReport(items, config, 'department');
    expect(report.total).toBe(3);
    expect(report.percent).toBe(33);
    expect(report.hiddenCount).toBe(1);
    expect(report.columns).not.toContain('Hoàn thành');
    expect(report.unknown).toEqual(['Trạng thái mới']);
    expect([...report.rows.values()].flatMap(cells => [...cells.values()].flat()).length).toBe(3);
    expect(getKpis(items).completed).toBe(report.completedCount);
  });
  it('loại BC rõ ràng bất kể mã có tiền tố NQ; nhóm __proto__ an toàn', () => {
    const item = { ...createDemoItems(1)[0], displayCode: 'NQ-0001', documentKind: 'BC' as const, department: '__proto__' };
    expect(aggregateReport([item], DEFAULT_REPORTS[1], 'department').total).toBe(0);
    expect(aggregateReport([item], DEFAULT_REPORTS[2], 'department').rows.has('__proto__')).toBe(true);
  });
});

