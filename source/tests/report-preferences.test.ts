import { afterEach, describe, expect, it, vi } from 'vitest';
import { configuredReports, defaultReportLayout, loadReportLayout, reportPageWidth, saveReportLayout, validateReportLayout, withReportPageWidth } from '../src/data/report-preferences';
import { DEFAULT_REPORTS, aggregateReport, getKpis } from '../src/domain/reporting';
import { createDemoItems } from '../src/data/demo-items';

afterEach(() => vi.unstubAllGlobals());
const storage = () => {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
};
describe('Bố trí bảng không thay đổi nghiệp vụ', () => {
  it('tô màu riêng từ trong tên bảng, giữ được qua validate và chuyển thành ReportConfig',()=>{
    const layouts=defaultReportLayout();
    layouts[2].titleAccentText='Nghị quyết';
    layouts[2].titleAccentColor='#B42318';
    const saved=validateReportLayout(layouts);
    expect(saved[2].titleAccentText).toBe('Nghị quyết');
    expect(configuredReports(saved)[2].titleAccentColor).toBe('#B42318');
    const bad=structuredClone(layouts);
    bad[2].titleAccentColor='red';
    expect(()=>validateReportLayout(bad)).toThrow(/mã màu/);
    const legacy=validateReportLayout(defaultReportLayout());
    expect(legacy[2].titleAccentText).toBeUndefined();
  });
  it('đổi tên/thứ tự/ẩn bảng giữ ID, phạm vi và KPI; khôi phục không đụng mẫu gốc', () => {
    const original = JSON.stringify(DEFAULT_REPORTS);
    const items = createDemoItems();
    const layout = defaultReportLayout();
    layout[3].title = 'Tên nghị quyết mới'; layout[0].visible = false;
    const reports = configuredReports([layout[4],layout[3],layout[2],layout[1],layout[0]]);
    expect(reports.map(row => row.id)).toEqual(['bc','nq','council','build']);
    expect(reports[1].title).toBe('Tên nghị quyết mới');
    expect(aggregateReport(items, reports[1], 'room').total).toBe(aggregateReport(items, DEFAULT_REPORTS[3], 'room').total);
    expect(getKpis(items)).toEqual(getKpis(createDemoItems()));
    expect(JSON.stringify(DEFAULT_REPORTS)).toBe(original);
    expect(defaultReportLayout()[0].visible).toBe(true);
  });
  it('ẩn cột và cả bảng không mất cấu hình, mở được trong trình chỉnh', () => {
    const layout = defaultReportLayout().map(row => ({ ...row, visible: false }));
    layout[3].hiddenColumns = ['Đã trình HĐND thành phố'];
    expect(configuredReports(layout)).toEqual([]);
    expect(configuredReports(layout, true)).toHaveLength(5);
    const report = aggregateReport(createDemoItems(), configuredReports(layout, true)[3], 'department');
    expect(report.total).toBe(aggregateReport(createDemoItems(), DEFAULT_REPORTS[3], 'department').total);
    expect(report.columns).not.toContain('Hoàn thành');
  });
  it('migrates saved four-stage building NQ layout to the new explicit not-required column',()=>{
    const previous=defaultReportLayout();
    previous[1].columnOrder=previous[1].columnOrder.filter(col=>col!=='Không phải trình');
    const upgraded=validateReportLayout(previous);
    expect(upgraded[1].columnOrder[0]).toBe('Không phải trình');
    expect(upgraded[1].columnOrder).toEqual(DEFAULT_REPORTS[1].columns);
    expect(upgraded[1].columnWidths).toBeUndefined();
  });
  it('saves independent column widths per report and rejects unknown sizes',()=>{
    const source=defaultReportLayout();
    source[1].columnWidths={'__total':120,'Không phải trình':175};
    const saved=validateReportLayout(source);
    expect(configuredReports(saved)[1].columnWidths).toEqual(source[1].columnWidths);
    const corrupted=structuredClone(source);corrupted[1].columnWidths={'__invalid':500};
    expect(()=>validateReportLayout(corrupted)).toThrow('Độ rộng cột');
  });
  it('migrates saved 2026-10-17 Party headings without losing hidden columns or custom column order',()=>{
    const layout=defaultReportLayout();
    layout[0].title='Nội dung cần xin ý kiến Thành ủy';
    layout[3].title='Nội dung trình ban hành nghị quyết';
    layout[4].title='Báo cáo trình Hội đồng nhân dân';
    layout[0].columnOrder=['Sở xin rút','Sở chưa trình','VP đang thực hiện','Đã gửi ĐU',
      'ĐU đã gửi TU chưa họp','Đã họp chưa có TBKL','Đã báo cáo TU'];
    layout[0].hiddenColumns=['ĐU đã gửi TU chưa họp'];
    const migrated=validateReportLayout(layout);
    expect(migrated[0].title).toBe('Tiến độ xin ý kiến Thành ủy');
    expect(migrated[3].title).toBe(DEFAULT_REPORTS[3].title);
    expect(migrated[4].title).toBe(DEFAULT_REPORTS[4].title);
    expect(migrated[0].columnOrder).toHaveLength(DEFAULT_REPORTS[0].columns.length);
    expect(migrated[0].columnOrder.slice(0,3)).toEqual(['Sở chưa trình','VP đang thực hiện','Đã gửi ĐU']);
    expect(migrated[0].columnOrder).toContain('Đã có TBKL');
    expect(migrated[0].columnOrder).not.toContain('Đã báo cáo TU');
    expect(migrated[0].hiddenColumns).toEqual(['ĐU đã gửi TU, chưa họp','Không phải trình']);
    expect(aggregateReport(createDemoItems(9),configuredReports(migrated)[0],'department').columns).not.toContain('ĐU đã gửi TU, chưa họp');
    const unknown=structuredClone(layout);
    unknown[0].columnOrder=['Sở chưa trình'];
    expect(()=>validateReportLayout(unknown)).toThrow('Thứ tự cột cần đủ');
  });
  it('merges both previous Party meeting columns in a saved 9-column profile',()=>{
    const old=defaultReportLayout();
    const index=old[0].columnOrder.indexOf('Đã họp/xin phiếu, chưa có TBKL');
    old[0].columnOrder.splice(index,0,'Đã họp, chưa có TBKL');
    old[0].hiddenColumns=['Đã họp, chưa có TBKL'];
    const migrated=validateReportLayout(old);
    const correct=DEFAULT_REPORTS[0].columns;
    expect(migrated[0].columnOrder).toHaveLength(correct.length);
    expect(migrated[0].columnOrder.filter(value=>value==='Đã họp/xin phiếu, chưa có TBKL')).toHaveLength(1);
    expect(migrated[0].columnOrder).not.toContain('Đã họp, chưa có TBKL');
    expect(migrated[0].hiddenColumns).toEqual(['Đã họp/xin phiếu, chưa có TBKL','Không phải trình']);
    expect(migrated[0].columnOrder).toEqual(correct);
    expect(old[0].columnOrder).toContain('Đã họp, chưa có TBKL'); // draft not mutated
    const invalid=structuredClone(old);
    invalid[0].columnOrder[index]='Đã họp/xin phiếu, chưa có TBKL'; // duplicate identical names
    expect(()=>validateReportLayout(invalid)).toThrow(/bị trùng/);
  });
  it('migrates saved 8-column Party layout with only old name to the replacement',()=>{
    const old=defaultReportLayout();
    old[0].columnOrder=old[0].columnOrder.map(value=>
      value==='Đã họp/xin phiếu, chưa có TBKL'?'Đã họp, chưa có TBKL':value);
    const next=validateReportLayout(old);
    expect(next[0].columnOrder).toEqual(DEFAULT_REPORTS[0].columns);
  });
  it('từ chối tên trống/dài, mã lạ-trùng và cột lạ trước khi lưu', () => {
    for (const change of [{ title: '' }, { title: 'x'.repeat(161) }, { id: 'other' }, { id: 'nq' }, { visible: 'yes' }, { hiddenColumns: ['Không có trong bảng'] }]) {
      const layout = defaultReportLayout();
      expect(() => validateReportLayout([{ ...layout[0], ...change }, ...layout.slice(1)])).toThrow();
    }
    expect(() => validateReportLayout([])).toThrow();
    expect(validateReportLayout(defaultReportLayout().map(row => ({ ...row, title: `  ${row.title}  ` })))[0].title).toBe(DEFAULT_REPORTS[0].title);
  });
});
describe('Nâng cấp cấu hình 3/4 bảng sang 5 bảng',()=>{
  it('inserts construction NQ before issuance NQ while preserving all old settings',()=>{
    const old=defaultReportLayout().filter(row=>!['build','council'].includes(row.id));
    old[0].tableFont='inter';old[0].tableFontSize=18;old[0].reportVariant='bars';old[0].pageWidth=2500;
    old[1].title='Bảng NQ tôi đã đổi tên';
    old[1].visible=false;
    old[1].hiddenColumns=['Hoàn thành'];
    old[1].columnOrder.reverse();
    const before=JSON.stringify(old);
    const migrated=validateReportLayout(old);
    expect(migrated.map(row=>row.id)).toEqual(['party','build','council','nq','bc']);
    expect(migrated[0].tableFont).toBe('inter');
    expect(migrated[0].tableFontSize).toBe(18);
    expect(migrated[0].reportVariant).toBe('bars');
    expect(migrated[0].pageWidth).toBe(2500);
    expect(migrated[1].visible).toBe(true);
    expect(migrated[1].columnOrder).toEqual(DEFAULT_REPORTS[1].columns);
    expect(migrated[3].title).toBe('Bảng NQ tôi đã đổi tên');
    expect(migrated[3].visible).toBe(false);
    expect(migrated[3].hiddenColumns).toEqual(['Đã trình HĐND thành phố']);
    expect(migrated[3].columnOrder).toEqual([...old[1].columnOrder]);
    expect(JSON.stringify(old)).toBe(before);
  });
  it('loads a stored three-report profile without silently resetting the users other settings',()=>{
    const store=storage();vi.stubGlobal('localStorage',store);
    const old=defaultReportLayout().filter(row=>!['build','council'].includes(row.id));
    old[2].title='Báo cáo đã sửa';old[0].tableFontSize=17;
    store.setItem('hdnd.report-layout.v1:from-firebase',JSON.stringify({
      schemaVersion:1,source:'from-firebase',reports:old
    }));
    const upgraded=loadReportLayout('from-firebase');
    expect(upgraded.map(row=>row.id)).toEqual(['party','build','council','nq','bc']);
    expect(upgraded[4].title).toBe('Báo cáo đã sửa');
    expect(upgraded[0].tableFontSize).toBe(17);
    expect(saveReportLayout('from-firebase',upgraded)).toBe(true);
    expect(loadReportLayout('from-firebase')).toEqual(upgraded);
    expect(()=>validateReportLayout(old.slice(1))).toThrow(/Cấu hình cần đủ năm/);
  });
});

describe('Độ rộng trang báo cáo độc lập, tương thích cấu hình cũ',()=>{
  it('keeps report width when reordering or hiding and rejects invalid widths',()=>{
    const original=defaultReportLayout();
    const wide=withReportPageWidth(original,3200);
    expect(reportPageWidth(wide)).toBe(3200);
    expect(original).toEqual(defaultReportLayout());
    expect(reportPageWidth([wide[4],wide[3],wide[2],wide[1],wide[0]])).toBe(3200);
    expect(reportPageWidth(validateReportLayout([wide[4],wide[3],wide[2],wide[1],wide[0]]))).toBe(3200);
    for(const bad of [0,319,6001,3.2,-2,NaN]){
      expect(()=>validateReportLayout(withReportPageWidth(original,bad))).toThrow('Độ rộng trang báo cáo');
    }
  });
  it('reads legacy report profiles without pageWidth as auto, and saves 3600px',()=>{
    const store=storage();vi.stubGlobal('localStorage',store);
    const legacy=defaultReportLayout().map(({pageWidth:_width,...rest})=>rest);
    store.setItem('hdnd.report-layout.v1:legacy',JSON.stringify({schemaVersion:1,source:'legacy',reports:legacy}));
    const loaded=loadReportLayout('legacy');
    expect(reportPageWidth(loaded)).toBe('auto');
    const wide=withReportPageWidth(loaded,3600);
    expect(saveReportLayout('legacy',wide)).toBe(true);
    expect(reportPageWidth(loadReportLayout('legacy'))).toBe(3600);
  });
});
describe('Lưu cấu hình theo nguồn', () => {
  it('nạp cấu hình 0.3 thiếu columnOrder và đổi thứ tự không đổi tổng/tỷ lệ', () => {
    const store=storage();vi.stubGlobal('localStorage',store);
    const legacy=defaultReportLayout().map(({columnOrder: _order,...row})=>row);
    store.setItem('hdnd.report-layout.v1:old',JSON.stringify({schemaVersion:1,source:'old',reports:legacy}));
    const loaded=loadReportLayout('old');
    expect(loaded[1].columnOrder).toEqual(DEFAULT_REPORTS[1].columns);
    loaded[1].columnOrder.reverse();
    const changed=aggregateReport(createDemoItems(),configuredReports(loaded)[1],'department');
    const original=aggregateReport(createDemoItems(),DEFAULT_REPORTS[1],'department');
    expect(changed.total).toBe(original.total);expect(changed.percent).toBe(original.percent);
    expect(changed.columns[0]).toBe(loaded[1].columnOrder[0]);
    const duplicate=defaultReportLayout();duplicate[0].columnOrder[0]=duplicate[0].columnOrder[1];
    expect(()=>validateReportLayout(duplicate)).toThrow();
  });
  it('giữ tên/thứ tự/ẩn-cột qua tải lại và tách nguồn Sheet/gid/mẫu', () => {
    vi.stubGlobal('localStorage', storage());
    const layout = defaultReportLayout().reverse();
    layout[0].title = 'Báo cáo riêng'; layout[1].visible = false; layout[1].hiddenColumns = ['Đã trình HĐND thành phố'];
    expect(saveReportLayout('file:gid1', layout)).toBe(true);
    expect(loadReportLayout('file:gid1')).toEqual(layout);
    expect(loadReportLayout('file:gid2')).toEqual(defaultReportLayout());
    expect(loadReportLayout('demo')).toEqual(defaultReportLayout());
  });
  it('cấu hình lỗi/khác phiên bản hoặc nguồn không phá mặc định', () => {
    const store = storage(); vi.stubGlobal('localStorage', store);
    for (const value of ['{bad', JSON.stringify({ schemaVersion: 2, source: 'one', reports: defaultReportLayout() }), JSON.stringify({ schemaVersion: 1, source: 'other', reports: defaultReportLayout() }), JSON.stringify({ schemaVersion: 1, source: 'one', reports: [] })]) {
      store.setItem('hdnd.report-layout.v1:one', value);
      expect(loadReportLayout('one')).toEqual(defaultReportLayout());
    }
  });
  it('lưu bị chặn báo false và không ghi cấu hình lỗi đè bản tốt', () => {
    const store = storage(); vi.stubGlobal('localStorage', store);
    saveReportLayout('one', defaultReportLayout());
    expect(() => saveReportLayout('one', [])).toThrow();
    expect(loadReportLayout('one')).toEqual(defaultReportLayout());
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } });
    expect(saveReportLayout('one', defaultReportLayout())).toBe(false);
    expect(loadReportLayout('one')).toEqual(defaultReportLayout());
  });
});
