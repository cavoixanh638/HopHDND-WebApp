import { afterEach, describe, expect, it, vi } from 'vitest';
import { assignmentIssue, CATALOG_KEYS, catalogFromItems, mergeCatalogItems, loadCatalog, saveCatalog, validateCatalog, type CatalogConfig } from '../src/data/catalogs';
import { createDemoItems } from '../src/data/demo-items';

afterEach(() => vi.unstubAllGlobals());

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
}

describe('Danh mục và quan hệ chuyên viên – phòng', () => {
  it('khởi tạo đủ 11 danh mục từ trạng thái và hồ sơ', () => {
    const items = createDemoItems(2);
    const catalogs = catalogFromItems(items);
    expect(Object.keys(catalogs.options)).toHaveLength(11);
    expect(Object.keys(catalogs.options)).toEqual(CATALOG_KEYS);
    expect(catalogs.options.department).toContain(items[0].department);
    expect(catalogs.options.progressCouncil).toContain('Hoàn thành');
    expect(catalogs.specialistRooms[items[0].specialist]).toContain(items[0].room);
  });

  it('từ chối giá trị trùng, quan hệ lạ và phòng ngoài danh mục', () => {
    const valid = catalogFromItems(createDemoItems(1));
    const duplicate = structuredClone(valid);
    duplicate.options.department.push(`  ${duplicate.options.department[0]}  `);
    expect(() => validateCatalog(duplicate)).toThrow();
    expect(() => validateCatalog({ ...valid, specialistRooms: { Unknown: [] } })).toThrow();
    expect(() => validateCatalog({ ...valid, specialistRooms: { [valid.options.specialist[0]]: ['Phòng không có'] } })).toThrow();
  });

  it('chuẩn hóa giá trị Sheets bẩn mà không thay đổi dữ liệu nguồn hoặc thứ tự danh mục',()=>{
    const items=createDemoItems(3);
    const before=items.map(item=>({...item}));
    items[0].department='  Sở mới  ';
    items[1].department='Sở mới';
    items[2].department='    ';
    items[0].progressBuild='  Sở chưa trình ';
    items[1].progressBuild='Sở chưa trình';
    items[2].progressBuild='x'.repeat(201);
    const originalItems=JSON.stringify(items);
    const catalogs=catalogFromItems(items);
    expect(()=>validateCatalog(catalogs)).not.toThrow();
    expect(catalogs.options.department.filter(x=>x==='Sở mới')).toHaveLength(1);
    expect(catalogs.options.department.every(x=>!!x.trim()&&x.length<=200)).toBe(true);
    expect(catalogs.options.progressBuild.filter(x=>x==='Sở chưa trình')).toHaveLength(1);
    expect(catalogs.options.progressBuild).not.toContain('x'.repeat(201));
    const saved=catalogFromItems(before);
    saved.options.progressBuild.reverse();
    const merged=mergeCatalogItems(saved,items);
    expect(()=>validateCatalog(merged)).not.toThrow();
    expect(merged.options.progressBuild.slice(0,saved.options.progressBuild.length))
      .toEqual(saved.options.progressBuild);
    expect(JSON.stringify(items)).toBe(originalItems);
  });

  it('chuẩn hóa tên chuyên viên/phòng khác chữ hoa, khoảng trắng mà không tạo quan hệ sai',()=>{
    const rows=createDemoItems(1);
    const person=rows[0].specialist,room=rows[0].room;
    const saved=catalogFromItems(rows);
    const updates=[{...rows[0],specialist:'  '+person.toLocaleUpperCase('vi')+' ',
      room:' '+room.toLocaleUpperCase('vi')+' '}];
    const merged=mergeCatalogItems(saved,updates);
    expect(()=>validateCatalog(merged)).not.toThrow();
    expect(merged.options.specialist.filter(x=>x.toLocaleLowerCase('vi')===person.toLocaleLowerCase('vi'))).toHaveLength(1);
    expect(merged.specialistRooms[person]).toContain(room);
    expect(updates[0].specialist).toMatch(/^  /);
  });

  it('updates stale specialist-room mappings using observed Excel J/K pairs without discarding unobserved manual links',()=>{
    const template=createDemoItems(1)[0];
    const rows=[
      {...template,specialist:'Nguyễn Ngọc Hùng',room:'Phòng TC'},
      {...template,recordId:'test-2',specialist:'Lê Quang Trường',room:'Phòng XD&CT'},
    ];
    const saved=catalogFromItems(rows);
    saved.options.room.push('Phòng NC','Phòng khác');
    saved.options.specialist.push('Chuyên viên lưu riêng');
    saved.specialistRooms['Nguyễn Ngọc Hùng']=['Phòng NC'];
    saved.specialistRooms['Lê Quang Trường']=['Phòng khác'];
    saved.specialistRooms['Chuyên viên lưu riêng']=['Phòng NC'];
    const merged=mergeCatalogItems(saved,rows);
    expect(merged.specialistRooms['Nguyễn Ngọc Hùng']).toEqual(['Phòng TC']);
    expect(merged.specialistRooms['Lê Quang Trường']).toEqual(['Phòng XD&CT']);
    expect(merged.specialistRooms['Chuyên viên lưu riêng']).toEqual(['Phòng NC']);
    expect(assignmentIssue(rows[0],merged)).toBe('');
    expect(assignmentIssue({...rows[0],room:'Phòng NC'},merged)).toContain('chưa được gán');
    expect(saved.specialistRooms['Nguyễn Ngọc Hùng']).toEqual(['Phòng NC']);
  });
  it('migrates only legacy Party catalog labels to exact Excel names and commas',()=>{
    const items=createDemoItems(1);
    const old=catalogFromItems(items);
    old.options.progressParty=['Sở chưa trình','ĐU đã gửi TU chưa họp','Đã họp chưa có TBKL','Đã báo cáo TU'];
    const merged=mergeCatalogItems(old,items);
    expect(merged.options.progressParty).toContain('ĐU đã gửi TU, chưa họp');
    expect(merged.options.progressParty).toContain('Đã họp, chưa có TBKL');
    expect(merged.options.progressParty).toContain('TU đã cho ý kiến');
    expect(merged.options.progressParty).toContain('Đã họp/xin phiếu, chưa có TBKL');
    expect(merged.options.progressParty).toContain('Đã có TBKL');
    expect(merged.options.progressParty).not.toContain('Đã báo cáo TU');
    expect(old.options.progressParty).toContain('Đã báo cáo TU');
    const edited=catalogFromItems(items);
    edited.options.progressParty=['Sở chưa trình'];
    expect(mergeCatalogItems(edited,items).options.progressParty).not.toContain('Đã có TBKL');
  });
  it('nêu rõ cột và giá trị không hợp lệ do quản trị nhập',()=>{
    const config=catalogFromItems([]);
    config.options.department.push('   ');
    expect(()=>validateCatalog(config)).toThrow(/department.*giá trị thứ/);
    config.options.department.pop();
    config.options.department.push('Đơn vị mới',' đơn vị MỚI ');
    expect(()=>validateCatalog(config)).toThrow(/department.*bị trùng/);
  });

  it('xử lý tên đặc biệt và khóa prototype an toàn', () => {
    const config = catalogFromItems([]);
    config.options.specialist = ['__proto__', 'constructor', 'Tên / có "dấu"'];
    config.options.room = ['__proto__', 'constructor', 'Phòng & khu vực'];
    config.specialistRooms['__proto__'] = ['__proto__', 'constructor'];
    const constructorName: string = 'constructor';
    config.specialistRooms[constructorName] = ['Phòng & khu vực'];
    const parsed = validateCatalog(config);
    expect(parsed.options.specialist).toEqual(config.options.specialist);
    expect(parsed.specialistRooms['__proto__']).toEqual(['__proto__', 'constructor']);
    expect(Object.getPrototypeOf(parsed.specialistRooms)).toBeNull();
  });

  it('tách cấu hình đã lưu theo nguồn và không dùng chung mảng với nguồn gốc', () => {
    vi.stubGlobal('localStorage', storage());
    const original = catalogFromItems(createDemoItems(1));
    const changed: CatalogConfig = structuredClone(original);
    changed.options.department.push('Danh mục riêng');
    expect(saveCatalog('sheet-a:gid-1', changed)).toBe(true);
    const loaded = loadCatalog('sheet-a:gid-1', []);
    expect(loaded.options.department).toContain('Danh mục riêng');
    expect(loadCatalog('sheet-a:gid-2', []).options.department).not.toContain('Danh mục riêng');
    expect(original.options.department).not.toContain('Danh mục riêng');
    loaded.options.department.push('Chỉ bản tải');
    expect(loadCatalog('sheet-a:gid-1', []).options.department).not.toContain('Chỉ bản tải');
  });

  it('dùng dữ liệu gốc khi JSON lưu bị hỏng hoặc cấu hình không hợp lệ', () => {
    const store = storage();
    vi.stubGlobal('localStorage', store);
    const items = createDemoItems(1);
    store.setItem('hdnd.catalogs.v1:source', '{broken');
    expect(loadCatalog('source', items)).toEqual(catalogFromItems(items));
    store.setItem('hdnd.catalogs.v1:source', JSON.stringify({ options: {}, specialistRooms: {} }));
    expect(loadCatalog('source', items)).toEqual(catalogFromItems(items));
  });

  it('giữ việc xóa trạng thái chưa dùng, thứ tự đã lưu và bổ sung giá trị mới quan sát được', () => {
    vi.stubGlobal('localStorage', storage());
    const items = createDemoItems(3).map(item => ({ ...item, progressCouncil: 'VP đang thực hiện' }));
    items[0].department = 'Đơn vị mới quan sát';
    const saved = catalogFromItems(items);
    saved.options.department.reverse();
    saved.options.progressCouncil = saved.options.progressCouncil.filter(value => value !== 'Sở xin rút');
    expect(saveCatalog('catalog-order', saved)).toBe(true);

    const loaded = loadCatalog('catalog-order', items);
    expect(loaded.options.progressCouncil).not.toContain('Sở xin rút');
    expect(loaded.options.department.slice(0, saved.options.department.length)).toEqual(saved.options.department);
    expect(loaded.options.department).toContain('Đơn vị mới quan sát');
  });

  it('chấp nhận chuyên viên có nhiều phòng và báo khi hồ sơ chọn nhầm phòng', () => {
    const items = createDemoItems(1);
    const item = { ...items[0] };
    const config = catalogFromItems(items);
    config.options.room.push('Phòng phối hợp');
    config.specialistRooms[item.specialist] = [item.room, 'Phòng phối hợp'];
    expect(validateCatalog(config).specialistRooms[item.specialist]).toHaveLength(2);
    expect(assignmentIssue(item, config)).toBe('');
    item.room = 'Phòng khác';
    expect(assignmentIssue(item, config)).toContain(`chưa được gán vào phòng ${item.room}`);
  });
});
