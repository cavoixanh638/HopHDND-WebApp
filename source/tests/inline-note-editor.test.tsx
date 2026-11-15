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
import type {CellEditSessionManager} from '../src/data/cell-edit-leases';
const node=(tree:any,type:string):any=>{
  if(Array.isArray(tree))return tree.map(child=>node(child,type)).find(Boolean);
  if(!tree||typeof tree!=='object')return undefined;
  if(tree.type===type)return tree;
  return node(tree.props?.children,type);
};
beforeEach(()=>hook.reset());
describe('Inline Note editor never opens a popup',()=>{
  it('renders a legible + with hover tip, without mutating a blank source value',()=>{
    const onCommit=vi.fn();
    const render=()=>{hook.begin();return InlineNoteEditor({value:'',label:'Ghi chú',onCommit});};
    const button=render();
    expect(button.type).toBe('button');
    expect(button.props.className).toContain('inline-note-empty');
    expect(button.props['data-add-hint']).toBe('Thêm ghi chú');
    expect(button.props.title).toBe('Thêm ghi chú');
    expect(node(button,'span')?.props.children).toBe('+');
    button.props.onClick();
    expect(node(render(),'textarea')).toBeDefined();
    expect(onCommit).not.toHaveBeenCalled();
  });
  it('opens immediately while Firebase lease is pending, then saves queued blur after ACK',async()=>{
    let ack!:(ok:boolean)=>void;
    let held=false;
    const onCommit=vi.fn(()=>true);
    const leaseManager={
      has:vi.fn(()=>held),
      acquire:vi.fn(()=>new Promise<boolean>(resolve=>{ack=resolve;})),
      isPending:vi.fn(()=>false),
      cancel:vi.fn(async()=>{}),
      preserveDraft:vi.fn(()=>true),
      recoverDraft:vi.fn(()=>null)
    } as unknown as CellEditSessionManager;
    const render=()=>{hook.begin();return InlineNoteEditor({
      value:'',label:'Ghi chú',onCommit,leaseManager,recordId:'NQ01',field:'note'
    });};
    node(render(),'button').props.onClick();
    // The prior bug waited until acquire resolved before rendering textarea.
    let textarea=node(render(),'textarea');
    expect(textarea).toBeDefined();
    expect(leaseManager.acquire).toHaveBeenCalledOnce();
    textarea.props.onChange({currentTarget:{value:'Ghi chú mới'}});
    textarea=node(render(),'textarea');
    textarea.props.onBlur();
    expect(onCommit).not.toHaveBeenCalled();
    expect(node(render(),'textarea')).toBeDefined();
    held=true;ack(true);
    await Promise.resolve();await Promise.resolve();
    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit).toHaveBeenCalledWith('Ghi chú mới');
    expect(node(render(),'textarea')).toBeUndefined();
  });
  it('never commits after Escape before the delayed lease ACK; releases late lock',async()=>{
    let ack!:(ok:boolean)=>void;
    let held=false;
    const onCommit=vi.fn();
    const leaseManager={
      has:vi.fn(()=>held),
      acquire:vi.fn(()=>new Promise<boolean>(resolve=>{ack=resolve;})),
      isPending:vi.fn(()=>false),
      cancel:vi.fn(async()=>{}),
      preserveDraft:vi.fn(()=>true),
      recoverDraft:vi.fn(()=>null)
    } as unknown as CellEditSessionManager;
    const render=()=>{hook.begin();return InlineNoteEditor({
      value:'',label:'Ghi chú',onCommit,leaseManager,recordId:'NQ01',field:'note'
    });};
    node(render(),'button').props.onClick();
    let textarea=node(render(),'textarea');
    textarea.props.onChange({currentTarget:{value:'Nháp đã hủy'}});
    textarea=node(render(),'textarea');
    textarea.props.onKeyDown({
      key:'Escape',ctrlKey:false,metaKey:false,preventDefault:vi.fn(),stopPropagation:vi.fn()
    });
    textarea.props.onBlur();
    held=true;ack(true);
    await Promise.resolve();await Promise.resolve();
    expect(onCommit).not.toHaveBeenCalled();
    expect(leaseManager.cancel).toHaveBeenCalledOnce();
    expect(node(render(),'textarea')).toBeUndefined();
  });
  it('keeps text intact and offers retry if the server rejects lock acquisition',async()=>{
    const onCommit=vi.fn();
    const leaseManager={
      has:vi.fn(()=>false),
      acquire:vi.fn(async()=>{throw Error('Firebase không phản hồi.');}),
      isPending:vi.fn(()=>false),
      cancel:vi.fn(async()=>{}),
      preserveDraft:vi.fn(()=>true),
      recoverDraft:vi.fn(()=>null)
    } as unknown as CellEditSessionManager;
    const render=()=>{hook.begin();return InlineNoteEditor({
      value:'',label:'Ghi chú',onCommit,leaseManager,recordId:'NQ01',field:'note'
    });};
    node(render(),'button').props.onClick();
    node(render(),'textarea').props.onChange({currentTarget:{value:'Chưa được lưu'}});
    await Promise.resolve();await Promise.resolve();await Promise.resolve();
    const tree=render();
    expect(node(tree,'textarea').props.value).toBe('Chưa được lưu');
    expect(node(tree,'div')).toBeDefined();
    expect(onCommit).not.toHaveBeenCalled();
    expect(leaseManager.preserveDraft).toHaveBeenCalled();
  });
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
