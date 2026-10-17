import {describe,it,expect,vi,beforeEach} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';
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
function nodes(v:any):any[]{return Array.isArray(v)?v.flatMap(nodes):v&&typeof v==='object'?[v,...nodes(v.props?.children)]:[];}
function text(v:any):string{return Array.isArray(v)?v.map(text).join(''):v&&typeof v==='object'?text(v.props?.children):typeof v==='string'?v:'';}
function list(readOnly=false) {
  const items=createDemoItems(1),id=items[0].recordId;
  const props={items,drafts:{[id]:{recordId:id,baseRevision:0,baseValues:{note:''},changes:{note:'new'},operationId:'fake-operation-001'}},
    errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),readOnly,sourceKind:'google' as const,
    customizing:true,sourceKey:'fake',catalog:catalogFromItems(items),onClose:vi.fn(),
    onSaveData:vi.fn().mockResolvedValue(true),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),
    initialLayout:defaultItemLayout(),onPersistLayout:vi.fn().mockResolvedValue(undefined)};
  const tree=ItemList(props),button=nodes(tree).find(node=>node.type==='button'&&node.props?.className==='button primary');
  return{props,tree,button};
}
beforeEach(()=>{mock.dirty=false;mock.markSaved.mockReset();});
describe('separate item layout save and data draft',()=>{
  it('does not save layout or data if no layout change is pending',()=>{
    const t=list();
    expect(text(t.button)).toContain('Lưu cách hiển thị');
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
});
