import {beforeEach,describe,expect,it,vi} from 'vitest';
const hook=vi.hoisted(()=>({
  slots:[] as any[],index:0,
  begin(){this.index=0;},
  reset(){this.slots.length=0;this.index=0;},
  useState(initial:any){
    const id=this.index++;
    if(!(id in this.slots))this.slots[id]=typeof initial==='function'?initial():initial;
    return [this.slots[id],(next:any)=>{this.slots[id]=typeof next==='function'?next(this.slots[id]):next;}];
  },
}));
vi.mock('react',()=>({useState:(value:any)=>hook.useState(value),useRef:(value:any)=>({current:value}),useEffect:vi.fn()}));
import {ItemColumnPanel} from '../src/features/items/ItemColumnPanel';
import {ColumnChoiceEditor} from '../src/features/items/ColumnChoiceEditor';
import {catalogFromItems} from '../src/data/catalogs';
import {createDemoItems} from '../src/data/demo-items';
import {DeferredWidthInput,parseCommittedWidth} from '../src/features/items/DeferredWidthInput';
import {defaultItemLayout} from '../src/data/item-preferences';
const all=(node:any):any[]=>Array.isArray(node)?node.flatMap(all):node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
function panel(layout=defaultItemLayout(),onChange=vi.fn()){hook.begin();return {tree:ItemColumnPanel({layout,onChange}),onChange};}
const button=(tree:any,label:string)=>all(tree).find(n=>n.type==='button'&&n.props?.children===label);
beforeEach(()=>hook.reset());
describe('drag-only widths and compact column manager',()=>{
  it('offers no pixel inputs for any individual Excel column',()=>{
    const {tree}=panel();
    expect(all(tree).filter(n=>n.type===DeferredWidthInput&&String(n.props.label).includes('Độ rộng cột'))).toHaveLength(0);
    expect(all(tree).some(n=>n.type==='summary'&&n.props.children==='Quản lý cột')).toBe(false);
    expect(button(tree,'+ Thêm cột')).toBeDefined();
  });
  it('keeps page width independent but changes columns only by dragging the table headers',()=>{
    const layout={...defaultItemLayout(),frameWidth:500};
    const {tree,onChange}=panel(layout);
    const input=all(tree).find(n=>n.type===DeferredWidthInput&&n.props.label==='Chiều rộng trang (px)');
    expect(input?.props.value).toBe(500);
    input.props.onCommit(600);
    expect(onChange).toHaveBeenCalledWith({...layout,frameWidth:600});
    const widthLabel=all(tree).find(n=>n.type==='label'&&n.props?.className==='layout-visibility');
    const checkbox=all(widthLabel).find(n=>n.type==='input'&&n.props?.type==='checkbox');
    checkbox.props.onChange({currentTarget:{checked:true}});
    expect(onChange).toHaveBeenLastCalledWith({...layout,frameWidth:'auto'});
  });
  it('preserves warnings beside the column manager controls',()=>{
    const message='Tên cột không hợp lệ.';
    const {tree}=panel(defaultItemLayout(),vi.fn());
    expect(all(tree).filter(n=>n.type===DeferredWidthInput)).toHaveLength(0);
    const warning=panel(defaultItemLayout(),vi.fn());
    expect(warning.tree).toBeDefined();
  });
  it('adds a stable independent column and opens its properties',()=>{
    const layout=defaultItemLayout(),onChange=vi.fn();
    const {tree}=panel(layout,onChange);
    button(tree,'+ Thêm cột').props.onClick();
    const created=onChange.mock.calls[0][0];
    expect(created.columns).toHaveLength(16);
    expect(created.columns[15]).toMatchObject({origin:'custom',kind:'text',visible:true,label:'Cột mới',values:{}});
    expect(created.columns[15].key).toMatch(/^custom_/);
  });
  it('rejects malformed page dimensions at commit',()=>{
    expect(parseCommittedWidth('',320,6000)).toBeNull();
    expect(parseCommittedWidth('0',320,6000)).toBeNull();
    expect(parseCommittedWidth('1.',320,6000)).toBeNull();
    expect(parseCommittedWidth('319',320,6000)).toBeNull();
    expect(parseCommittedWidth('6001',320,6000)).toBeNull();
    expect(parseCommittedWidth('500',320,6000)).toBe(500);
  });
  it('shows one dropdown editor inside selected source column and allows a new choice to be saved separately',async()=>{
    const items=createDemoItems(1),catalog=catalogFromItems(items),layout=defaultItemLayout();
    const onSaveCatalog=vi.fn().mockResolvedValue(undefined);
    hook.begin();
    let tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items,onSaveCatalog});
    const open=all(tree).find(n=>n.type==='button'&&n.props['aria-label']==='Thiết lập cột Tiến độ xin ý kiến Thành ủy');
    expect(open).toBeDefined();open.props.onClick();
    hook.begin();
    tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items,onSaveCatalog});
    const chooser=all(tree).find(n=>n.type===ColumnChoiceEditor);
    expect(chooser).toBeDefined();
    expect(chooser.props.options).toEqual(catalog.options.progressParty);
    chooser.props.onChange([...chooser.props.options,'Thêm lựa chọn thử']);
    hook.begin();tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items,onSaveCatalog});
    const save=button(tree,'Lưu thay đổi');
    expect(save.props.disabled).toBe(false);
    save.props.onClick();
    await vi.waitFor(()=>expect(onSaveCatalog).toHaveBeenCalledOnce());
    expect(onSaveCatalog.mock.calls[0][0].options.progressParty).toContain('Thêm lựa chọn thử');
  });
  it('exposes the source dropdown choices even when a legacy layout still says text',()=>{
    const items=createDemoItems(1),catalog=catalogFromItems(items),layout=defaultItemLayout();
    layout.columns=layout.columns.map(c=>c.key==='progressParty'?{...c,kind:'text' as const}:c);
    hook.begin();
    let tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items});
    all(tree).find(n=>n.type==='button'&&n.props['aria-label']==='Thiết lập cột Tiến độ xin ý kiến Thành ủy').props.onClick();
    hook.begin();tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items});
    const editor=all(tree).find(n=>n.type===ColumnChoiceEditor);
    expect(editor).toBeDefined();
    expect(editor.props.options).toEqual(catalog.options.progressParty);
  });
  it('saves layout, source dropdown and column rights with one Save action',async()=>{
    const items=createDemoItems(1),catalog=catalogFromItems(items),layout=defaultItemLayout();
    const onSaveCatalog=vi.fn().mockResolvedValue(undefined);
    const onSavePermissions=vi.fn().mockResolvedValue(undefined);
    const onSaveLayout=vi.fn().mockResolvedValue(undefined);
    const base={layout,catalog,items,onChange:vi.fn(),layoutDirty:true,onSaveLayout,
      onSaveCatalog,onSavePermissions,permissions:{columns:{progressParty:false}}};
    hook.begin();let tree=ItemColumnPanel(base);
    const grant=all(tree).find(n=>n.type==='input'&&n.props['aria-label']==='Cho phép sửa cột Tiến độ xin ý kiến Thành ủy');
    grant.props.onChange({currentTarget:{checked:true}});
    const open=all(tree).find(n=>n.type==='button'&&n.props['aria-label']==='Thiết lập cột Tiến độ xin ý kiến Thành ủy');
    open.props.onClick();
    hook.begin();tree=ItemColumnPanel(base);
    const choice=all(tree).find(n=>n.type===ColumnChoiceEditor);
    choice.props.onChange([...choice.props.options,'Mục riêng']);
    hook.begin();tree=ItemColumnPanel(base);
    button(tree,'Lưu thay đổi').props.onClick();
    await vi.waitFor(()=>expect(onSaveLayout).toHaveBeenCalledOnce());
    expect(onSaveCatalog).toHaveBeenCalledOnce();
    expect(onSavePermissions).toHaveBeenCalledOnce();
    expect(onSaveCatalog.mock.invocationCallOrder[0]).toBeLessThan(onSavePermissions.mock.invocationCallOrder[0]);
    expect(onSavePermissions.mock.invocationCallOrder[0]).toBeLessThan(onSaveLayout.mock.invocationCallOrder[0]);
  });
  it('checks permission per Excel column and requires explicit legacy row/cell reset on save',async()=>{
    const items=createDemoItems(1),catalog=catalogFromItems(items),layout=defaultItemLayout();
    const permissions={columns:{progressParty:false},rows:{legacy:true},cells:{}};
    const onSavePermissions=vi.fn().mockResolvedValue(undefined);
    hook.begin();
    let tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items,permissions,onSavePermissions});
    const grant=all(tree).find(n=>n.type==='input'&&n.props['aria-label']==='Cho phép sửa cột Tiến độ xin ý kiến Thành ủy');
    expect(grant).toBeDefined();grant.props.onChange({currentTarget:{checked:true}});
    hook.begin();tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items,permissions,onSavePermissions});
    let save=button(tree,'Lưu thay đổi');expect(save.props.disabled).toBe(false);
    save.props.onClick();
    expect(onSavePermissions).not.toHaveBeenCalled();
    const legacy=all(tree).find(n=>n.type==='label'&&n.props.className==='column-rights-warning');
    expect(legacy).toBeDefined();
    all(legacy).find(n=>n.type==='input').props.onChange({currentTarget:{checked:true}});
    hook.begin();tree=ItemColumnPanel({layout,onChange:vi.fn(),catalog,items,permissions,onSavePermissions});
    save=button(tree,'Lưu thay đổi');save.props.onClick();
    await vi.waitFor(()=>expect(onSavePermissions).toHaveBeenCalledOnce());
    expect(onSavePermissions.mock.calls[0][0]).toEqual({columns:{progressParty:true},rows:{},cells:{}});
    expect(onSavePermissions.mock.calls[0][1]).toEqual(permissions);
  });

});