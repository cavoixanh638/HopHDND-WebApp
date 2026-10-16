import {describe,it,expect,vi,beforeEach} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';
const mock=vi.hoisted(()=>({dirty:false}));
vi.mock('react',()=>({
  useState:(initial:any)=>[typeof initial==='function'?initial():initial,vi.fn()],
  useRef:(initial:any)=>({current:initial}),useMemo:(fn:any)=>fn(),useEffect:vi.fn(),
}));
vi.mock('../src/state/use-recoverable-draft',()=>({useRecoverableDraft:(_scope:any,initial:any)=>({draft:initial,setDraft:vi.fn(),dirty:mock.dirty,clearCheckpoint:vi.fn(),recoveryMessage:'',checkpointMessage:'',unmatchedCheckpoint:null,restoreOldDraft:vi.fn(),discardOldDraft:vi.fn()})}));
import {ItemList} from '../src/features/items/ItemList';
function nodes(value:any):any[]{if(Array.isArray(value))return value.flatMap(nodes);return value&&typeof value==='object'?[value,...nodes(value.props?.children)]:[];}
function text(value:any):string{if(Array.isArray(value))return value.map(text).join('');if(value&&typeof value==='object')return text(value.props?.children);return typeof value==='string'?value:'';}
function list(readOnly=false){
  const items=createDemoItems(1),id=items[0].recordId;
  const props={items,drafts:{[id]:{recordId:id,baseRevision:0,baseValues:{note:''},changes:{note:'new'},operationId:'fake-operation-001'}},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),readOnly,sourceKind:'google' as const,customizing:true,sourceKey:'fake',catalog:catalogFromItems(items),onClose:vi.fn(),onSaveData:vi.fn().mockResolvedValue(true),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),initialLayout:defaultItemLayout(),onPersistLayout:vi.fn().mockResolvedValue(undefined)};
  const tree=ItemList(props),button=nodes(tree).find(node=>node.type==='button'&&node.props.className==='button primary');
  return{props,tree,button};
}
beforeEach(()=>{mock.dirty=false;});
describe('item data save and layout save boundary (component with fake hooks)',()=>{
  it('shows Excel as source and saves data only without writing unchanged shared layout',async()=>{
    const test=list();expect(text(test.tree)).toContain('Nguồn Excel');expect(text(test.tree)).not.toContain('Dữ liệu mẫu');expect(text(test.button)).toBe('Lưu dữ liệu vào Excel');expect(test.button.props.disabled).toBe(false);
    test.button.props.onClick();await vi.waitFor(()=>expect(test.props.onClose).toHaveBeenCalled());expect(test.props.onSaveData).toHaveBeenCalledOnce();expect(test.props.onPersistLayout).not.toHaveBeenCalled();
  });
  it('does not save layout or leave the editor when data save remains unconfirmed',async()=>{
    mock.dirty=true;const test=list();test.props.onSaveData.mockResolvedValue(false);test.button.props.onClick();await vi.waitFor(()=>expect(test.props.onSaveData).toHaveBeenCalledOnce());await Promise.resolve();expect(test.props.onPersistLayout).not.toHaveBeenCalled();expect(test.props.onClose).not.toHaveBeenCalled();
  });
  it('saves layout alone on a Sheets read-only page while keeping trial cell edits local',async()=>{
    mock.dirty=true;const test=list(true);
    expect(text(test.button)).toContain('Lưu bố trí');
    expect(test.button.props.disabled).toBe(false);
    test.button.props.onClick();
    await vi.waitFor(()=>expect(test.props.onClose).toHaveBeenCalledOnce());
    expect(test.props.onPersistLayout).toHaveBeenCalledOnce();
    expect(test.props.onSaveData).not.toHaveBeenCalled();
    expect(test.props.onLayoutSaved).toHaveBeenCalledWith(expect.stringContaining('vẫn chỉ ở trên máy'));
  });
  it('keeps the source-save action disabled when no authenticated writer is connected',()=>{
    const test=list(true);expect(text(test.button)).toBe('Chưa thể lưu vào Excel');expect(test.button.props.disabled).toBe(true);expect(test.props.onSaveData).not.toHaveBeenCalled();
  });
});
