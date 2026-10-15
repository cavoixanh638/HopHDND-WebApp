import { describe, expect, it } from 'vitest';
import { createDemoItems } from '../src/data/demo-items';
import { catalogFromItems } from '../src/data/catalogs';
import { defaultItemLayout } from '../src/data/item-preferences';
import { defaultReportLayout } from '../src/data/report-preferences';
import { applyConfigSection, configFromRows, configRows, validateSharedConfig, type SharedConfig } from '../src/data/shared-config';

const source = { spreadsheetId: 'spreadsheet_123456', gid: '60961344' };

function profile(): SharedConfig {
  return {
    schemaVersion: 1, ...source, revision: 4, updatedAt: '2026-10-13T12:00:00.000Z', editorUrl: '',
    catalogs: catalogFromItems(createDemoItems(3)), reports: defaultReportLayout(), items: defaultItemLayout(),
  };
}

function committedRows(config: SharedConfig, operationId = 'operation-123'): unknown[][] {
  const rows = configRows(config, operationId);
  rows[0][7] = true;
  return rows;
}

describe('cấu hình dùng chung', () => {
  it('nhận diện profile hợp lệ được dựng từ các cấu hình mặc định', () => {
    expect(validateSharedConfig(profile(), source)).toEqual(profile());
  });

  it('ghi và đọc đủ các phần khi JSON vượt 4.000 ký tự', () => {
    const config = profile();
    config.catalogs.options.department = Array.from({ length: 60 }, (_, i) => `${i.toString().padStart(2, '0')} ${'Đơn vị '.repeat(10)}${i}`);
    const rows = committedRows(config);
    expect(rows.length).toBeGreaterThan(1);
    expect(rows.every(row => String(row[4]).length <= 4002)).toBe(true);
    expect(configFromRows(rows, source)).toEqual(config);
  });

  it('bỏ qua revision chưa commit', () => {
    expect(configFromRows(configRows(profile(), 'operation-123'), source)).toBeNull();
  });

  it('bỏ qua cấu hình của spreadsheet hoặc gid khác', () => {
    const rows = committedRows(profile());
    expect(configFromRows(rows, { ...source, spreadsheetId: 'another_sheet_123' })).toBeNull();
    expect(configFromRows(rows, { ...source, gid: '10' })).toBeNull();
  });

  it.each(['missing', 'duplicate'] as const)('từ chối chunk %s trong revision đã commit', kind => {
    const config = profile();
    config.catalogs.options.department = Array.from({ length: 60 }, (_, i) => `${i} ${'Đơn vị '.repeat(10)}${i}`);
    const rows = committedRows(config);
    if (kind === 'missing') rows.pop();
    else rows.push([...rows[0]]);
    expect(() => configFromRows(rows, source)).toThrow();
  });

  it('từ chối schema, độ rộng cột, quan hệ danh mục và editorUrl sai', () => {
    const badSchema = { ...profile(), schemaVersion: 2 };
    const badWidth = profile();
    badWidth.items.columns[0].width = 20;
    const badRelation = profile();
    badRelation.catalogs.specialistRooms['Chuyên viên lạ'] = [];
    const badUrl = { ...profile(), editorUrl: 'http://script.google.com/macros/s/id/exec' };
    for (const value of [badSchema, badWidth, badRelation, badUrl]) expect(() => validateSharedConfig(value)).toThrow();
  });

  it('cập nhật một phần và all nhưng giữ nguyên metadata nguồn, revision, thời gian và editor', () => {
    const base = profile();
    const next = profile();
    next.spreadsheetId = 'other_sheet_123';
    next.gid = '999';
    next.revision = 99;
    next.updatedAt = '2026-01-01T00:00:00.000Z';
    next.editorUrl = 'https://script.google.com/macros/s/abc-123/exec';
    next.catalogs.options.department.push('Đơn vị mới');

    const oneSection = applyConfigSection(base, 'catalogs', next.catalogs);
    expect(oneSection.catalogs.options.department).toContain('Đơn vị mới');
    expect(oneSection).toMatchObject({ ...base, catalogs: next.catalogs });
    expect(applyConfigSection(base, 'all', next)).toEqual({ ...base, catalogs: next.catalogs, reports: next.reports, items: next.items });
  });
});
