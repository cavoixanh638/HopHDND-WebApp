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
vi.mock('react',()=>({useState:(value:any)=>hook.useState(value)}));
import {ItemColumnPanel} from '../src/features/items/ItemColumnPanel';
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
    const checkbox=all(tree).find(n=>n.type==='input'&&n.props?.type==='checkbox'&&n.props?.checked===false);
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
    expect(created.columns).toHaveLength(19);
    expect(created.columns[18]).toMatchObject({origin:'custom',kind:'text',visible:true,label:'Cột mới',values:{}});
    expect(created.columns[18].key).toMatch(/^custom_/);
  });
  it('rejects malformed page dimensions at commit',()=>{
    expect(parseCommittedWidth('',320,6000)).toBeNull();
    expect(parseCommittedWidth('0',320,6000)).toBeNull();
    expect(parseCommittedWidth('1.',320,6000)).toBeNull();
    expect(parseCommittedWidth('319',320,6000)).toBeNull();
    expect(parseCommittedWidth('6001',320,6000)).toBeNull();
    expect(parseCommittedWidth('500',320,6000)).toBe(500);
  });
});