import {beforeEach,describe,expect,it,vi} from 'vitest';
const hook=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;
  return {reset:()=>{slots.length=0;cursor=0;},begin:()=>{cursor=0;},
    useState:(seed:any)=>{const i=cursor++;if(!(i in slots))slots[i]=seed;return [slots[i],(next:any)=>{
      slots[i]=typeof next==='function'?next(slots[i]):next;
    }];},
    useRef:(seed:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:seed});}};
});
vi.mock('react',()=>({useState:hook.useState,useRef:hook.useRef,useEffect:()=>{}}));
import {InlineNoteEditor} from '../src/features/items/InlineNoteEditor';
const node=(tree:any,type:string):any=>{
  if(Array.isArray(tree))return tree.map(child=>node(child,type)).find(Boolean);
  if(!tree||typeof tree!=='object')return undefined;
  if(tree.type===type)return tree;
  return node(tree.props?.children,type);
};
beforeEach(()=>hook.reset());
describe('Inline Note editor never opens a popup',()=>{
  it('uses a multiline textarea and commits on Ctrl+Enter',()=>{
    const onCommit=vi.fn().mockReturnValue(true);
    const render=()=>{hook.begin();return InlineNoteEditor({value:'Bản gốc',label:'Ghi chú',onCommit});};
    let tree=render();
    expect(tree.type).toBe('button');tree.props.onClick();
    tree=render();
    const textarea=node(tree,'textarea');
    expect(textarea).toBeDefined();expect(textarea.props.rows).toBeGreaterThanOrEqual(3);
    textarea.props.onChange({currentTarget:{value:'Dòng 1\nDòng 2'}});
    tree=render();
    node(tree,'textarea').props.onKeyDown({key:'Enter',ctrlKey:true,metaKey:false,preventDefault:vi.fn()});
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('Dòng 1\nDòng 2');
    expect(render().type).toBe('button');
  });
  it('Escape cancels and later blur does not commit',()=>{
    const onCommit=vi.fn();
    const render=()=>{hook.begin();return InlineNoteEditor({value:'Giữ nguyên',label:'Ghi chú',onCommit});};
    render().props.onClick();
    let textarea=node(render(),'textarea');
    textarea.props.onChange({currentTarget:{value:'Chưa lưu'}});
    textarea=node(render(),'textarea');
    textarea.props.onKeyDown({key:'Escape',ctrlKey:false,metaKey:false,preventDefault:vi.fn(),stopPropagation:vi.fn()});
    textarea.props.onBlur();
    expect(onCommit).not.toHaveBeenCalled();
    expect(render().type).toBe('button');
  });
});
