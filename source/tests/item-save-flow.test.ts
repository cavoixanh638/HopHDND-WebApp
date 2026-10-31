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
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {ColumnFilterCell} from '../src/features/items/ColumnFilterCell';
import {DETAIL_FIELDS,SEARCH_FIELDS} from '../src/features/items/list-toolbar-filters';
import {CellHistoryAction} from '../src/components/CellHistoryAction';
function nodes(v:any):any[]{
  return Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'
    ?[v,...(v.type===CompactGroupedValue?nodes(CompactGroupedValue(v.props)):nodes(v.props?.children))]:[];
}
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
  it('respects hidden Excel columns from saved settings on first viewer paint',()=>{
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
      expect(headers).not.toContain(key);
    expect(headers).not.toContain('history');
    // Guests must see their configured columns, but no admin visibility toolbar.
    const control=nodes(tree).find(node=>node.type==='button'&&node.props?.['aria-pressed']===false);
    expect(control).toBeUndefined();
  });
  it('preserves saved column order and removes obsolete phantom history',()=>{
    const items=createDemoItems(1);
    const old=defaultItemLayout();
    old.columns.reverse();
    old.columns.splice(4,0,{key:'history',label:'Lịch sử',width:100,visible:true});
    const tree=ItemList({items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google',customizing:false,sourceKey:'old-layout-excel-order',
      catalog:catalogFromItems(items),onClose:vi.fn(),onSaveData:vi.fn().mockResolvedValue(false),
      onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),initialLayout:old});
    const keys=nodes(tree).filter(n=>n.props?.columnKey).map(n=>n.props.columnKey);
    expect(keys).toEqual([...EXCEL_COLUMN_KEYS].reverse().filter(k=>
      !['stt','type','department','progressParty','progressBuild','progressCouncil'].includes(k)));
    // STT remains Excel column B and the Item source value, not a view column.
    expect(EXCEL_COLUMN_KEYS[1]).toBe('stt');
    expect(items[0].stt).toBeGreaterThan(0);
    expect(keys).not.toContain('stt');
    expect(keys).not.toContain('history');
    // V2 uses the single List toolbar rather than a second full table-filter row.
    const controls=nodes(tree);
    expect(controls.some(n=>n.props?.className==='list-filter-toolbar')).toBe(true);
    expect(controls.some(n=>n.type==='input'&&n.props?.['aria-label']==='Tìm kiếm không dấu')).toBe(true);
    for(const label of ['Lọc Sở, ngành','Lọc Phòng'])
      expect(controls.some(n=>n.type==='select'&&n.props?.['aria-label']===label)).toBe(true);
    expect(controls.some(n=>n.props?.className==='list-filter-other')).toBe(true);
    expect(DETAIL_FIELDS.map(f=>f.key)).toEqual([
      'partyLevel','progressParty','progressBuild','progressCouncil',
      'specialist','vpLeader','ubndLeader'
    ]);
    expect(SEARCH_FIELDS.map(f=>f.key)).toEqual([
      'all','displayCode','content','specificProgress','note'
    ]);
    // Existing source-level column filters are retained in the editing view.
    const editTree=ItemList({items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
      readOnly:true,sourceKind:'google',customizing:true,sourceKey:'old-layout-edit-filters',
      catalog:catalogFromItems(items),onClose:vi.fn(),onSaveData:vi.fn().mockResolvedValue(false),
      onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),initialLayout:old});
    const editFilters=nodes(editTree).filter(n=>n.type===ColumnFilterCell);
    expect(editFilters.map(n=>n.props.field)).toEqual(expect.arrayContaining([
      'type','department','content','partyLevel','progressParty',
      'progressBuild','progressCouncil'
    ]));
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
  it('offers read-only history on only Ghi chú and Tiến độ hiện tại in the guest list',()=>{
    const items=createDemoItems(1),onCellHistory=vi.fn();
    const tree=ItemList({items,drafts:{},errors:{},busy:false,
      onUpdate:vi.fn(),onHistory:vi.fn(),onCellHistory,
      readOnly:true,sourceKind:'firebase',customizing:false,anonymousViewer:true,
      sourceKey:'guest-two-field-history',catalog:catalogFromItems(items),onClose:vi.fn(),
      onSaveData:vi.fn().mockResolvedValue(false),onDiscardData:vi.fn(),
      onLayoutSaved:vi.fn(),initialLayout:defaultItemLayout(),
      canEditCell:()=>false});
    const historyButtons=nodes(tree).filter(node=>node.type===CellHistoryAction);
    expect(historyButtons).toHaveLength(2);
    expect(historyButtons.map(node=>node.props.label)).toEqual(expect.arrayContaining([
      expect.stringContaining('Ghi chú'),expect.stringContaining('Tiến độ hiện tại')
    ]));
    for(const button of historyButtons)button.props.onClick();
    expect(onCellHistory.mock.calls.map(([,field])=>field).sort())
      .toEqual(['note','specificProgress']);
    expect(nodes(tree).filter(n=>n.type==='button'&&n.props.className==='content-button'))
      .toHaveLength(0);
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

  it('keeps official status dropdowns canonical even if old catalog and old column selections disagree',()=>{
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
    expect(picker.props.options).toEqual([
      'Không phải trình','Sở chưa trình','VP đang xử lý','Đã gửi ĐU',
      'ĐU gửi TU, chưa họp','Đã xin ý kiến, chờ TBKL','Đã có TBKL'
    ]);
    expect(picker.props.options).not.toContain('Giá trị từ danh mục chung');
    expect(picker.props.options).not.toContain('Lựa chọn cũ không còn sử dụng');
    // The raw alias is displayed as the canonical selected option, not written back.
    expect(picker.props.value).toBe('Sở chưa trình');
  });

  it('V4 L1: List edits only a newly selected canonical status; alias display does not rewrite source',()=>{
    const original=createDemoItems(1)[0];
    const item={...original,partyLevel:'Ban Chấp hành',progressParty:'VP đang thực hiện',
      progressBuild:'Đã trình HĐND, chưa có QĐ',progressCouncil:'Đã trình HĐND thành phố'};
    const before=JSON.stringify(item),onUpdate=vi.fn();
    const props={items:[item],drafts:{},errors:{},busy:false,onUpdate,onHistory:vi.fn(),
      readOnly:true,sourceKind:'google' as const,customizing:false,anonymousViewer:true,
      sourceKey:'v4-l1-status-legacy-list',catalog:catalogFromItems([item]),onClose:vi.fn(),
      onSaveData:vi.fn().mockResolvedValue(false),onDiscardData:vi.fn(),
      onLayoutSaved:vi.fn(),initialLayout:defaultItemLayout(),
      canEditCell:(_id:string,field:string)=>_id===item.recordId&&field==='progressBuild'};
    const tree=ItemList(props);
    const buttons=nodes(tree).filter(node=>node.type===CellPicker&&node.props.field==='progressBuild');
    expect(buttons).toHaveLength(1);
    const picker=buttons[0].props;
    expect(picker.value).toBe('Đã trình, chờ QĐ');
    expect(picker.displayValue).toBe('Đã trình, chờ QĐ');
    expect(picker.options).toEqual([
      'Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'
    ]);
    expect(picker.options).not.toContain(item.progressBuild);
    expect(onUpdate).not.toHaveBeenCalled(); // render/open/Esc is non-mutating
    picker.onChange('Đã trình, chờ QĐ');
    expect(onUpdate).not.toHaveBeenCalled(); // same canonical selection
    picker.onChange('Đã có QĐ');
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(item.recordId,{progressBuild:'Đã có QĐ'});
    expect(JSON.stringify(item)).toBe(before);
    const noGrant=nodes(ItemList({...props,canEditCell:()=>false}))
      .filter(node=>node.type===CellPicker&&node.props.field==='progressBuild');
    expect(noGrant).toHaveLength(0);
  });

});
