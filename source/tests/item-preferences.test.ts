import { afterEach, describe, expect, it, vi } from 'vitest';
import { EXCEL_SOURCE_COLUMNS, EXCEL_COLUMN_KEYS, cellHighlightStyle, defaultItemLayout, loadItemLayout, saveItemLayout, validateItemLayout } from '../src/data/item-preferences';

afterEach(() => vi.unstubAllGlobals());

const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
};

describe('Bố trí cột danh sách', () => {
  it('matches exactly 15 Excel A–O columns in the source order and labels, excluding app-only History',()=>{
    const expected=['displayCode','stt','content','department','type','partyLevel','progressParty',
      'progressBuild','progressCouncil','specialist','room','vpLeader','ubndLeader',
      'specificProgress','note'];
    const layout=defaultItemLayout();
    expect(EXCEL_COLUMN_KEYS).toEqual(expected);
    expect(EXCEL_SOURCE_COLUMNS).toHaveLength(15);
    expect(layout.columns.map(column=>column.key)).toEqual(expected);
    expect(layout.columns.map(column=>column.label)).toEqual([
      'ID','STT','Nội dung trình','Sở, ngành chủ trì','Loại VB',
      'Cấp Thành ủy cho ý kiến','Tiến độ xin ý kiến Thành ủy','Tiến độ trình HĐND xây dựng NQ',
      'Tiến độ trình HĐND ban hành NQ/BC','Chuyên viên VPUB','Phòng chuyên môn',
      'Lãnh đạo VP','Lãnh đạo UBND TP','Tiến độ hiện tại','Ghi chú']);
    expect(layout.columns.find(column=>column.key==='history')).toBeUndefined();
    expect(layout.columns).toHaveLength(15);
    expect(layout.columns.filter(c=>c.visible)).toHaveLength(15);
    for(const key of ['type','partyLevel','progressParty','specificProgress'])
      expect(layout.columns.find(c=>c.key===key)?.visible).toBe(true);
  });
  it('migrates old E label but preserves explicit custom labels',()=>{
    const old=defaultItemLayout();
    const column=old.columns.find(c=>c.key==='type')!;
    column.label='Loại VB (HC/QPPL/BC)';
    column.renamed=true;
    expect(validateItemLayout(old).columns.find(c=>c.key==='type')?.label).toBe('Loại VB');
    column.label='Loại văn bản riêng';
    expect(validateItemLayout(old).columns.find(c=>c.key==='type')?.label).toBe('Loại văn bản riêng');
  });
  it('drops the obsolete History column from previous Firebase/shared or personal layouts safely',()=>{
    const old=defaultItemLayout();
    old.columns.splice(3,0,{key:'history',label:'Lịch sử',width:100,visible:true});
    old.columns[0].width=199;
    old.columns[3].visible=true;
    const migrated=validateItemLayout(old);
    expect(migrated.columns).toHaveLength(15);
    expect(migrated.columns.find(c=>c.key==='history')).toBeUndefined();
    expect(migrated.columns.find(c=>c.key==='displayCode')?.width).toBe(199);
    expect(migrated.columns.map(c=>c.key)).toEqual(EXCEL_COLUMN_KEYS);
    expect(()=>validateItemLayout({...old,columns:old.columns.filter(c=>c.key!=='note')}))
      .toThrow('Thiếu cột bắt buộc');
  });
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

  it('migrates old 18-column Firebase layouts by removing obsolete Rút/Họp/Thẩm tra, preserving widths',()=>{
    const old=defaultItemLayout();
    old.columns.splice(14,0,
      {key:'isDropped',label:'Rút',width:120,visible:true},
      {key:'partyMeeting',label:'Họp Thành ủy',width:200,visible:true},
      {key:'examined',label:'Đã thẩm tra chưa',width:170,visible:true});
    old.columns.reverse();
    old.columns[0].width=399;
    old.columns[0].visible=false;
    const result=validateItemLayout(old);
    expect(result.columns).toHaveLength(15);
    expect(result.columns.some(c=>['isDropped','partyMeeting','examined'].includes(c.key))).toBe(false);
    expect(result.columns[0].width).toBe(399);
    expect(result.columns.length).toBe(defaultItemLayout().columns.length);
  });
  it('kiểm tra giới hạn độ rộng bảng và cột', () => {
    const layout = defaultItemLayout();
    expect(validateItemLayout({ ...layout, tableWidth: 500 }).tableWidth).toBe(500);
    expect(validateItemLayout({ ...layout, tableWidth: 6000 }).tableWidth).toBe(6000);
    expect(() => validateItemLayout({ ...layout, tableWidth: 499 })).toThrow();
    expect(() => validateItemLayout({ ...layout, tableWidth: 6001 })).toThrow();
    expect(() => validateItemLayout({ ...layout, tableWidth: 500.5 })).toThrow();
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

describe('frame width migration',()=>{it('defaults old profiles to auto without reinterpreting the existing table width',()=>{const old=defaultItemLayout();delete old.frameWidth;const result=validateItemLayout({...old,tableWidth:2400});expect(result.frameWidth).toBe('auto');expect(result.tableWidth).toBe(2400);});it('stores frame width independently and rejects invalid committed dimensions',()=>{expect(validateItemLayout({...defaultItemLayout(),frameWidth:900}).frameWidth).toBe(900);for(const value of [0,319,6001,900.5,'wide'])expect(()=>validateItemLayout({...defaultItemLayout(),frameWidth:value})).toThrow(/vùng danh sách/);});});


describe('Quy tắc tô ô theo từ khóa',()=>{
  it('khớp chứa từ không dấu đúng cột, kiểm mã màu',()=>{
    const layout=defaultItemLayout();
    layout.cellHighlights=[{id:'keyword_001',word:'Chưa trình',field:'progressCouncil',
      textColor:'#781111',backgroundColor:'#fff1d6'}];
    const valid=validateItemLayout(layout);
    expect(cellHighlightStyle('SỞ CHƯA TRÌNH','progressCouncil',valid.cellHighlights)).toEqual({
      color:'#781111',backgroundColor:'#fff1d6'});
    expect(cellHighlightStyle('Sở chưa trình','department',valid.cellHighlights)).toBeUndefined();
    const bad={...layout,cellHighlights:[{...layout.cellHighlights[0],backgroundColor:'javascript:0'}]};
    expect(()=>validateItemLayout(bad)).toThrow(/quy tắc/);
  });
});
