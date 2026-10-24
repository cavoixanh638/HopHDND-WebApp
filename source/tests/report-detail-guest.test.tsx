import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';
import {ReportDetailGrid} from '../src/features/reports/ReportDetailGrid';
import {ColumnResizeHandle} from '../src/components/ColumnResizeHandle';
import {CellPicker} from '../src/features/items/CellPicker';
import {ContentEditor} from '../src/features/items/ContentEditor';
import {InlineNoteEditor} from '../src/features/items/InlineNoteEditor';
import {DeferredWidthInput} from '../src/features/items/DeferredWidthInput';

const hooks=vi.hoisted(()=>{
  let slots:any[]=[];let index=0;
  return {begin:()=>{index=0;},reset:()=>{slots=[];index=0;},
    state:(initial:any)=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i],(v:any)=>{slots[i]=typeof v==='function'?v(slots[i]):v;}];},
    memo:(fn:any)=>fn()};
});
vi.mock('react',()=>({useState:hooks.state,useMemo:hooks.memo,useEffect:()=>{}}));
type Node={type:any;props:Record<string,any>};
function nodes(v:any):Node[]{return Array.isArray(v)?v.flatMap(nodes):
  v&&typeof v==='object'&&'type' in v?[v,...nodes(v.props?.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):
  v&&typeof v==='object'&&'type' in v?text(v.props?.children):typeof v==='string'?v:'';}
const mockStorage=()=>{
  const values=new Map<string,string>();
  return {values,getItem:(k:string)=>values.get(k)??null,
    setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)};
};
let storage:ReturnType<typeof mockStorage>;
const testProps=()=>{
  const items=createDemoItems(2);
  return {title:'Ô tiến độ',selectedIds:items.map(i=>i.recordId),items,
    sourceKey:'test-popup-scope',catalog:catalogFromItems(items),listLayout:defaultItemLayout(),
    allowDraft:true,canEditCell:vi.fn().mockReturnValue(true),
    onUpdate:vi.fn(),onKeepDraft:vi.fn().mockReturnValue(true),
    dirtyIds:new Set<string>(),errors:{},onClose:vi.fn()};
};
beforeEach(()=>{
  hooks.reset();storage=mockStorage();
  vi.stubGlobal('localStorage',storage);
  vi.stubGlobal('location',{pathname:'/preview/guest-test/'});
  vi.stubGlobal('window',{innerWidth:1500});
});
afterEach(()=>vi.unstubAllGlobals());
describe('Bảng chi tiết — khách chỉ xem và độ rộng cửa sổ',()=>{
  it('does not expose edits, presets, settings, resize handles or saving for anonymous guests even if list rights allow edits',()=>{
    const props={...testProps(),readOnlyViewer:true};
    hooks.begin();const tree=ReportDetailGrid(props);const all=nodes(tree);
    expect(text(tree)).not.toContain('Chỉnh sửa nháp');
    expect(text(tree)).not.toContain('Cấu hình popup / cột');
    expect(text(tree)).not.toContain('Mẫu bảng popup');
    expect(text(tree)).not.toContain('Giữ nháp trên máy');
    expect(all.some(n=>n.type===ContentEditor||n.type===CellPicker||n.type===ColumnResizeHandle)).toBe(false);
    // Guests only receive column-level filters; no duplicate search or layout toolbar.
    expect(all.some(n=>n.type===DeferredWidthInput)).toBe(false);
    expect(all.some(n=>n.type==='input'&&n.props.type==='range')).toBe(false);
    expect(text(tree)).not.toContain('Tìm trong nội dung của ô');
    expect(text(tree)).not.toContain('Hiện đủ cột Excel');
    expect(text(tree)).not.toContain('Xóa bộ lọc');
    expect(text(tree)).not.toContain('Rộng popup');
    expect(all.some(n=>n.type==='button'&&text(n)==='Mở Danh sách dữ liệu')).toBe(false);
    expect(all.some(n=>n.props?.className==='cell-history-action')).toBe(false);
    expect(props.onUpdate).not.toHaveBeenCalled();
  });
  it('keeps a separate edit mode for a signed-in user and refuses save after permission is revoked',()=>{
    const props={...testProps(),readOnlyViewer:false};
    let permitted=true;
    props.canEditCell=vi.fn((_id:string,field:string)=>permitted&&field==='note');
    hooks.begin();let tree=ReportDetailGrid(props);
    const edit=nodes(tree).find(n=>n.type==='button'&&text(n)==='Chỉnh sửa nháp');
    expect(edit).toBeDefined();edit!.props.onClick();
    hooks.begin();tree=ReportDetailGrid(props);
    expect(text(tree)).toContain('Về chế độ xem');
    const editor=nodes(tree).find(n=>n.type===InlineNoteEditor);
    expect(editor).toBeDefined();
    expect(nodes(tree).some(n=>n.type===ContentEditor)).toBe(false);
    permitted=false;
    expect(editor!.props.onCommit('Sửa không còn quyền')).toBe(false);
    expect(props.onUpdate).not.toHaveBeenCalled();
    permitted=true;
    expect(editor!.props.onCommit('Sửa được cấp quyền')).toBe(true);
    expect(props.onUpdate).toHaveBeenCalledOnce();
  });
  it('changes and persists the width of the whole dialog independently from column widths',()=>{
    const props={...testProps(),readOnlyViewer:false};
    hooks.begin();let tree=ReportDetailGrid(props);
    const widthField=nodes(tree).find(n=>n.type===DeferredWidthInput&&n.props.label==='Độ rộng toàn popup (px)');
    expect(widthField).toBeDefined();
    // Only explicit field commit updates layout, not typing individual digits.
    widthField!.props.onCommit(960);
    hooks.begin();tree=ReportDetailGrid(props);
    expect(tree.props.style['--report-grid-window-width']).toBe('960px');
    const key=[...storage.values.keys()].find(k=>k.startsWith('hdnd.report-detail-grid.v1:'));
    expect(key).toBeDefined();
    const saved=JSON.parse(storage.values.get(key!)!);
    expect(saved.dialogWidth).toBe(960);
    expect(saved.columns).toHaveLength(15);
    hooks.reset();hooks.begin();
    const fresh=ReportDetailGrid(props);
    expect(fresh.props.style['--report-grid-window-width']).toBe('960px');
  });
});
