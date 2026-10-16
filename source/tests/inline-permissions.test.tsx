import {beforeEach,describe,expect,it,vi} from 'vitest';
const hooks=vi.hoisted(()=>{
  const slots:any[]=[];let index=0;
  return {
    start:()=>{index=0;},reset:()=>{slots.length=0;index=0;},
    state:(initial:any)=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    ref:(value:any)=>{const i=index++;return slots[i]??(slots[i]={current:value});},
    memo:(fn:any)=>fn(),
    effect:()=>{}
  };
});
vi.mock('react',()=>({useState:hooks.state,useRef:hooks.ref,useMemo:hooks.memo,useEffect:hooks.effect}));
import {InlinePermissionsTable} from '../src/features/items/InlinePermissionsTable';
import type {Item} from '../shared/types';
const nodes=(tree:any):any[]=>Array.isArray(tree)?tree.flatMap(nodes):tree&&typeof tree==='object'?[tree,...nodes(tree.props?.children)]:[];
const label=(n:any):string=>nodes(n).map(x=>typeof x==='string'?x:'').join('');
function render(onSave:(next:any,baseline:any)=>Promise<void>){
  hooks.start();
  return InlinePermissionsTable({
    items:[{recordId:'sheet:60961344:row:3',displayCode:'NQ01',content:'Nội dung kiểm thử',isDropped:false} as Item],
    columns:[{key:'content',label:'Nội dung'},{key:'isDropped',label:'Trình / Rút'}],
    permissions:{columns:{content:false}},
    onSave,
    onBack:vi.fn()
  });
}
beforeEach(()=>hooks.reset());
describe('inline admin rights',()=>{
  it('keeps permission toggles local until Save and requires a warning acknowledgment for row/cell grants',async()=>{
    const save=vi.fn().mockResolvedValue(undefined);
    let tree=render(save);
    const column=nodes(tree).find(n=>n.type==='input'&&n.props?.type==='checkbox'&&n.props?.checked===false);
    expect(column).toBeDefined();
    column.props.onChange({currentTarget:{checked:true}});
    tree=render(save);
    expect(nodes(tree).find(n=>n.type==='input'&&n.props?.checked===true)).toBeDefined();
    const cell=nodes(tree).find(n=>n.type==='select'&&String(n.props?.['aria-label']??'').includes('Quyền ô'));
    expect(cell).toBeDefined();cell.props.onChange({target:{value:'allow'}});
    tree=render(save);
    const saveButton=nodes(tree).find(n=>n.type==='button'&&n.props?.children==='Lưu quyền chỉnh sửa');
    expect(saveButton.props.disabled).toBe(true);
    const ack=nodes(tree).find(n=>n.type==='input'&&n.props?.['aria-label']==='Xác nhận rủi ro quyền theo dòng/ô');
    expect(ack).toBeDefined();ack.props.onChange({currentTarget:{checked:true}});
    tree=render(save);
    const enabled=nodes(tree).find(n=>n.type==='button'&&n.props?.children==='Lưu quyền chỉnh sửa');
    expect(enabled.props.disabled).toBe(false);
    await enabled.props.onClick();
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0].columns.content).toBe(true);
    expect(save.mock.calls[0][0].cells['sheet:60961344:row:3'].content).toBe(true);
    expect(save.mock.calls[0][1]).toEqual({columns:{content:false},rows:{},cells:{}});
  });
  it('explains inherited rights in everyday language and previews effective edit rights',()=>{
    const save=vi.fn().mockResolvedValue(undefined);
    let tree=render(save);
    const cell=nodes(tree).find(n=>n.type==='select'&&String(n.props?.['aria-label']??'').includes('Quyền ô'));
    expect(cell.props.children.map((x:any)=>x.props.children)).toEqual(['Theo quyền dòng/cột','Cho phép sửa','Không cho sửa']);
    expect(JSON.stringify(tree)).toContain('Chỉ xem');
    const column=nodes(tree).find(n=>n.type==='input'&&n.props?.type==='checkbox'&&n.props?.checked===false);
    column.props.onChange({currentTarget:{checked:true}});
    tree=render(save);
    expect(JSON.stringify(tree)).toContain('Được sửa');
    expect(save).not.toHaveBeenCalled();
  });
  it('explains NQ/BC classification permission inline rather than hidden-fields accordion',()=>{
    const tree=render(vi.fn());
    const printed=JSON.stringify(tree);
    expect(printed).not.toContain('Các trường không hiển thị thành cột trong bảng');
    expect(printed).toContain('Quyền sửa loại nội dung (NQ/BC)');
    expect(nodes(tree).find(n=>n.type==='select'&&n.props?.['aria-label']==='Quyền cột loại nội dung')).toBeDefined();
  });
  it('does not allow saving unchanged rules',()=>{
    const tree=render(vi.fn());
    const button=nodes(tree).find(n=>n.type==='button'&&n.props?.children==='Lưu quyền chỉnh sửa');
    expect(button.props.disabled).toBe(true);
  });
});
