import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultItemLayout, loadItemLayout, saveItemLayout, validateItemLayout } from '../src/data/item-preferences';

afterEach(() => vi.unstubAllGlobals());

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('Bố trí cột danh sách', () => {
  it('giữ thứ tự, trạng thái ẩn và độ rộng hợp lệ', () => {
    const layout = defaultItemLayout();
    layout.tableWidth = 2400;
    layout.columns[0].width = 125;
    layout.columns[1].visible = true;
    layout.columns[2].visible = false;
    const swapped = [layout.columns[1], layout.columns[0], ...layout.columns.slice(2)];
    const validated = validateItemLayout({ ...layout, columns: swapped });
    expect(validated.tableWidth).toBe(2400);
    expect(validated.columns.map(column => column.key).slice(0, 2)).toEqual(['stt', 'displayCode']);
    expect(validated.columns.find(column => column.key === 'displayCode')).toMatchObject({ width: 125, visible: true });
    expect(validated.columns[2].visible).toBe(false);
  });

  it('kiểm tra giới hạn độ rộng bảng và cột', () => {
    const layout = defaultItemLayout();
    expect(validateItemLayout({ ...layout, tableWidth: 600 }).tableWidth).toBe(600);
    expect(validateItemLayout({ ...layout, tableWidth: 6000 }).tableWidth).toBe(6000);
    expect(() => validateItemLayout({ ...layout, tableWidth: 599 })).toThrow();
    expect(() => validateItemLayout({ ...layout, tableWidth: 6001 })).toThrow();
    expect(() => validateItemLayout({ ...layout, tableWidth: 600.5 })).toThrow();
    for (const width of [60, 1600]) {
      const columns = layout.columns.map((column, index) => index === 0 ? { ...column, width } : column);
      expect(validateItemLayout({ ...layout, columns }).columns[0].width).toBe(width);
    }
    for (const width of [59, 1601]) {
      const columns = layout.columns.map((column, index) => index === 0 ? { ...column, width } : column);
      expect(() => validateItemLayout({ ...layout, columns })).toThrow();
    }
  });

  it('từ chối cột thiếu, trùng, không biết và cấu hình ẩn hết cột dữ liệu', () => {
    const layout = defaultItemLayout();
    expect(() => validateItemLayout({ ...layout, columns: layout.columns.slice(1) })).toThrow();
    expect(() => validateItemLayout({ ...layout, columns: [...layout.columns.slice(0, -1), layout.columns[0]] })).toThrow();
    expect(() => validateItemLayout({ ...layout, columns: layout.columns.map((column, index) => index === 0 ? { ...column, key: 'unknown' } : column) })).toThrow();
    expect(() => validateItemLayout({ ...layout, columns: layout.columns.map(column => ({ ...column, visible: column.key === 'history' })) })).toThrow();
  });
});

describe('Lưu bố trí theo nguồn', () => {
  it('lưu và tải riêng cấu hình của từng nguồn', () => {
    vi.stubGlobal('localStorage', storage());
    const first = defaultItemLayout();
    first.tableWidth = 1800;
    first.columns.reverse();
    first.columns[0].visible = false;
    const second = defaultItemLayout();
    second.tableWidth = 2200;
    expect(saveItemLayout('sheet:gid1', first)).toBe(true);
    expect(saveItemLayout('sheet:gid2', second)).toBe(true);
    expect(loadItemLayout('sheet:gid1')).toEqual(first);
    expect(loadItemLayout('sheet:gid2')).toEqual(second);
    expect(loadItemLayout('demo')).toEqual(defaultItemLayout());
  });

  it('trả về mặc định khi cấu hình bị hỏng hoặc localStorage bị chặn', () => {
    const store = storage();
    vi.stubGlobal('localStorage', store);
    store.setItem('hdnd.item-layout.v1:source', '{bad json');
    expect(loadItemLayout('source')).toEqual(defaultItemLayout());
    store.setItem('hdnd.item-layout.v1:source', JSON.stringify({ ...defaultItemLayout(), tableWidth: 1 }));
    expect(loadItemLayout('source')).toEqual(defaultItemLayout());
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    expect(loadItemLayout('source')).toEqual(defaultItemLayout());
    expect(saveItemLayout('source', defaultItemLayout())).toBe(false);
  });
});

describe('frame width migration',()=>{it('defaults old profiles to auto without reinterpreting the existing table width',()=>{const old=defaultItemLayout();delete old.frameWidth;const result=validateItemLayout({...old,tableWidth:2400});expect(result.frameWidth).toBe('auto');expect(result.tableWidth).toBe(2400);});it('stores frame width independently and rejects invalid committed dimensions',()=>{expect(validateItemLayout({...defaultItemLayout(),frameWidth:900}).frameWidth).toBe(900);for(const value of [0,319,6001,900.5,'wide'])expect(()=>validateItemLayout({...defaultItemLayout(),frameWidth:value})).toThrow(/khung/);});});
