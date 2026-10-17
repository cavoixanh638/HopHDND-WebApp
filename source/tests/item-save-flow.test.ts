import {describe,it,expect,vi,beforeEach} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout,EXCEL_COLUMN_KEYS} from '../src/data/item-preferences';
const mock=vi.hoisted(()=>({dirty:false,markSaved:vi.fn()}));
vi.mock('react',()=>({
  useState:(initial:any)=>[typeof initial==='function'?initial():initial,vi.fn()],
  useRef:(initial:any)=>({current:initial}),useMemo:(fn:any)=>fn(),useEffect:vi.fn(),
}));
vi.mock('../src/state/use-recoverable-draft',()=>({
  useRecoverableDraft:(_scope:any,initial:any)=>({draft:initial,setDraft:vi.fn(),dirty:mock.dirty,
    markSaved:mock.markSaved,clearCheckpoint:vi.fn(),recoveryMessage:'',checkpointMessage:'',
    unmatchedCheckpoint:null,restoreOldDraft:vi.fn(),discardOldDraft:vi.fn()})
}));
import {ItemList} from '../src/features/items/ItemList';
import {ItemColumnPanel} from '../src/features/items/ItemColumnPanel';
import {CellPicker} from '../src/features/items/CellPicker';
function nodes(v:any):any[]{return Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?text(v.props?.children):typeof v==='string'?v:'';}
function list(readOnly=false) {
  const items=createDemoItems(1),id=items[0].recordId;
  const props={items,drafts:{[id]:{recordId:id,baseRevision:0,baseValues:{note:''},changes:{note:'new'},operationId:'fake-operation-001'}},
    errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),readOnly,sourceKind:'google' as const,
    customizing:true,sourceKey:'fake',catalog:catalogFromItems(items),onClose:vi.fn(),
    onSaveData:vi.fn().mockResolvedValue(true),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),
    initialLayout:defaultItemLayout(),onPersistLayout:vi.fn().mockResolvedValue(undefined)};
  const tree=ItemList(props),editor=nodes(tree).find(node=>node.type===ItemColumnPanel);
  const editorTree=ItemColumnPanel(editor.props);
  const button=nodes(editorTree).find(node=>node.type==='button'&&text(node)==='Lưu thay đổi');
  return{props,tree,button};
}
beforeEach(()=>{mock.dirty=false;mock.markSaved.mockReset();});
describe('separate item layout save and data draft',()=>{
  it('does not save layout or data if no layout change is pending',()=>{
    const t=list();
    expect(text(t.button)).toContain('Lưu thay đổi');
    expect(t.button.props.disabled).toBe(true);
    t.button.props.onClick();
    expect(t.props.onPersistLayout).not.toHaveBeenCalled();
    expect(t.props.onSaveData).not.toHaveBeenCalled();
    expect(t.props.onClose).not.toHaveBeenCalled();
  });
  it('saves the list layout while staying in editing mode and keeping trial cell drafts',async()=>{
    mock.dirty=true;const t=list(true);
    expect(t.button.props.disabled).toBe(false);
    t.button.props.onClick();
    await vi.waitFor(()=>expect(t.props.onPersistLayout).toHaveBeenCalledOnce());
    expect(mock.markSaved).toHaveBeenCalledOnce();
    expect(t.props.onClose).not.toHaveBeenCalled();
    expect(t.props.onSaveData).not.toHaveBeenCalled();
    expect(t.props.onDiscardData).not.toHaveBeenCalled();
  });
  it('does not silently submit editable data drafts together with layout changes',async()=>{
    mock.dirty=true;const t=list();
    t.button.props.onClick();
    await vi.waitFor(()=>expect(t.props.onPersistLayout).toHaveBeenCalledOnce());
    expect(t.props.onSaveData).not.toHaveBeenCalled();
    expect(t.props.onClose).not.toHaveBeenCalled();
  });
  it('shows every Excel source column A–O on the ordinary list even when the saved layout hides G/H/I',()=>{
    const items=createDemoItems(1);
    const layout=defaultItemLayout();
    for(const col of layout.columns)
      if(['type','partyLevel','progressParty','progressBuild','progressCouncil','specificProgress','note'].includes(col.key))
        col.visible=false;
    const tree=ItemList({items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google',customizing:false,anonymousViewer:true,
      sourceKey:'columns-full-view',catalog:catalogFromItems(items),onClose:vi.fn(),
      onSaveData:vi.fn().mockResolvedValue(false),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),
      initialLayout:layout});
    const headers=nodes(tree).filter(node=>node.props?.columnKey).map(node=>node.props.columnKey);
    for(const key of ['type','partyLevel','progressParty','progressBuild','progressCouncil','specificProgress','note'])
      expect(headers).toContain(key);
    expect(headers).not.toContain('history');
    const control=nodes(tree).find(node=>node.type==='button'&&node.props?.['aria-pressed']===true);
    expect(control).toBeDefined();
    expect(text(control)).toContain('Theo cột đã chọn');
  });
  it('enforces source A–O order in full view even when the old saved layout was reordered',()=>{
    const items=createDemoItems(1);
    const old=defaultItemLayout();
    old.columns.reverse();
    old.columns.splice(4,0,{key:'history',label:'Lịch sử',width:100,visible:true});
    const tree=ItemList({items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google',customizing:false,sourceKey:'old-layout-excel-order',
      catalog:catalogFromItems(items),onClose:vi.fn(),onSaveData:vi.fn().mockResolvedValue(false),
      onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),initialLayout:old});
    const keys=nodes(tree).filter(n=>n.props?.columnKey).map(n=>n.props.columnKey);
    expect(keys).toEqual(EXCEL_COLUMN_KEYS);
    expect(keys).not.toContain('history');
    expect(nodes(tree).filter(n=>n.type?.name==='ColumnFilterCell').map(n=>n.props.field)).toEqual(EXCEL_COLUMN_KEYS);
  });
  it('keeps shared hidden columns hidden in edit mode for an accurate saved-layout preview',()=>{
    const items=createDemoItems(1);
    const layout=defaultItemLayout();
    layout.columns=layout.columns.map(column=>column.key==='progressParty'?{...column,visible:false}:column);
    const tree=ItemList({items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google',customizing:true,sourceKey:'columns-editor',
      catalog:catalogFromItems(items),onClose:vi.fn(),
      onSaveData:vi.fn().mockResolvedValue(false),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),
      initialLayout:layout});
    expect(nodes(tree).filter(node=>node.props?.columnKey).map(node=>node.props.columnKey)).not.toContain('progressParty');
  });
  it('lets anonymous visitors edit only explicitly granted cells directly on the normal list',()=>{
    const items=createDemoItems(1),id=items[0].recordId;
    const tree=ItemList({items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google',customizing:false,anonymousViewer:true,
      sourceKey:'guest',catalog:catalogFromItems(items),onClose:vi.fn(),
      onSaveData:vi.fn().mockResolvedValue(false),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),
      initialLayout:defaultItemLayout(),canEditCell:(_id:string,field:string)=>_id===id&&field==='content'});
    expect(nodes(tree).some(n=>n.type==='button'&&n.props?.className==='content-button')).toBe(true);
    expect(nodes(tree).some(n=>n.type==='select'&&String(n.props?.['aria-label']??'').includes('Chuyên viên'))).toBe(false);
  });
  it('enables granted cells on the signed-in ordinary view but not ungranted cells or unauthenticated Sheets-only views',()=>{
    const items=createDemoItems(1),id=items[0].recordId;
    const props={
      items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google' as const,customizing:false,anonymousViewer:false,
      sourceKey:'signed-in-view-grants',catalog:catalogFromItems(items),onClose:vi.fn(),
      onSaveData:vi.fn().mockResolvedValue(false),onDiscardData:vi.fn(),
      onLayoutSaved:vi.fn(),initialLayout:defaultItemLayout()
    };
    const permitted=ItemList({...props,canEditCell:(_id:string,field:string)=>_id===id&&field==='content'});
    expect(nodes(permitted).some(n=>n.props?.className==='content-button')).toBe(true);
    expect(nodes(permitted).some(n=>n.props?.className==='cell-value-button')).toBe(false);
    const withoutFirebase=ItemList(props);
    expect(nodes(withoutFirebase).some(n=>n.props?.className==='content-button')).toBe(false);
  });

  it('uses one source of truth for Excel dropdowns: the shared catalog, not legacy column options',()=>{
    const items=createDemoItems(1),id=items[0].recordId;
    const catalog=catalogFromItems(items);
    catalog.options.progressParty.push('Giá trị từ danh mục chung');
    const layout=defaultItemLayout();
    layout.columns=layout.columns.map(column=>column.key==='progressParty'
      ?{...column,kind:'select' as const,options:['Lựa chọn cũ không còn sử dụng']}
      :column);
    const tree=ItemList({items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google',customizing:false,anonymousViewer:true,
      sourceKey:'single-dropdown-authority',catalog,onClose:vi.fn(),
      onSaveData:vi.fn().mockResolvedValue(false),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),
      initialLayout:layout,canEditCell:(_id:string,field:string)=>_id===id&&field==='progressParty'});
    const picker=nodes(tree).find(node=>node.type===CellPicker&&String(node.props?.label).includes('Tiến độ xin ý kiến Thành ủy'));
    expect(picker).toBeDefined();
    expect(picker.props.options).toContain('Giá trị từ danh mục chung');
    expect(picker.props.options).not.toContain('Lựa chọn cũ không còn sử dụng');
  });

});
