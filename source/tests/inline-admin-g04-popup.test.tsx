import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {inlineG04ClampWidth,inlineG04DragWidth,inlineG04WidthBounds} from '../src/features/reports/inline-g04-popup-width';
import {ReportDetailGrid} from '../src/features/reports/ReportDetailGrid';
import {InlineG04PopupHandles} from '../src/features/reports/inline-g04-popup-handles';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';

const hooks=vi.hoisted(()=>{
  let slots:any[]=[],index=0;
  return {begin:()=>{index=0;},reset:()=>{slots=[];index=0;},
    state:(init:any)=>{const at=index++;if(!(at in slots))slots[at]=typeof init==='function'?init():init;
      return [slots[at],(next:any)=>{slots[at]=typeof next==='function'?next(slots[at]):next;}];},
    memo:(fn:any)=>fn()};
});
vi.mock('react',()=>({useState:hooks.state,useMemo:hooks.memo,useRef:(initial:any)=>({current:initial}),useEffect:()=>{}}));
type Node={type:any;props:Record<string,any>};
const nodes=(root:any):Node[]=>root&&Array.isArray(root)?root.flatMap(nodes):
  root&&typeof root==='object'&&'type' in root?[root,...nodes(root.props?.children)]:[];
const text=(root:any):string=>root&&Array.isArray(root)?root.map(text).join(''):
  root&&typeof root==='object'&&'type' in root?text(root.props?.children):typeof root==='string'?root:'';
const storage=()=>{
  const map=new Map<string,string>();
  return {map,getItem:(key:string)=>map.get(key)??null,
    setItem:(key:string,val:string)=>{map.set(key,val);},removeItem:(key:string)=>map.delete(key)};
};
let store:ReturnType<typeof storage>;
const props=()=>{
  const items=createDemoItems(2);
  return {title:'Bảng báo cáo',items,selectedIds:items.map(v=>v.recordId),
    sourceKey:'g04-check',catalog:catalogFromItems(items),listLayout:defaultItemLayout(),
    allowDraft:true,canEditCell:vi.fn().mockReturnValue(true),
    onUpdate:vi.fn(),onKeepDraft:vi.fn().mockReturnValue(true),onClose:vi.fn(),
    dirtyIds:new Set<string>(),errors:{}};
};
const render=(p:ReturnType<typeof props>&{guestViewer?:boolean;readOnlyViewer?:boolean;canCustomizePopup?:boolean})=>{
  hooks.begin();return ReportDetailGrid(p);
};
const button=(tree:any,label:string)=>nodes(tree).find(n=>n.type==='button'&&n.props['aria-label']?.includes(label));

beforeEach(()=>{hooks.reset();store=storage();vi.stubGlobal('localStorage',store);
  vi.stubGlobal('location',{pathname:'/qa/g04/'});
  vi.stubGlobal('window',{innerWidth:1920});});
afterEach(()=>vi.unstubAllGlobals());

describe('G04 geometry: viewport bounds and offscreen drag',()=>{
  it('keeps saved values in 640..2400 and clamps visual sizes to narrow/zoomed viewports',()=>{
    expect(inlineG04WidthBounds(1920)).toEqual({min:640,max:1900,canSave:true});
    expect(inlineG04WidthBounds(900)).toEqual({min:640,max:880,canSave:true});
    expect(inlineG04WidthBounds(480)).toEqual({min:460,max:460,canSave:false});
    expect(inlineG04ClampWidth(1480,900)).toBe(880);
    expect(inlineG04ClampWidth(1480,480)).toBe(460);
    expect(inlineG04ClampWidth(999999,2560)).toBe(2400);
  });
  it('handles both edges/corners, negative drags, huge drags and no pixel writes',()=>{
    expect(inlineG04DragWidth(900,100,'right',1920)).toBe(1000);
    expect(inlineG04DragWidth(900,100,'left',1920)).toBe(800);
    expect(inlineG04DragWidth(900,999999,'right',900)).toBe(880);
    expect(inlineG04DragWidth(900,-999999,'right',900)).toBe(640);
  });
});

describe('G04 popup local presentation without data patch',()=>{
  it('exposes direct controls to layout-authorized admin, hides a column, then restores on same local scope',()=>{
    const p=props();
    let tree=render(p);
    expect(nodes(tree).some(n=>n.type===InlineG04PopupHandles)).toBe(true);
    const hide=button(tree,'Ẩn cột ');
    expect(hide).toBeDefined();
    hide!.props.onClick({stopPropagation:()=>{}});
    tree=render(p);
    expect(text(tree)).toContain('Cột ẩn (');
    expect(store.map.size).toBe(1);
    const saved=JSON.parse([...store.map.values()][0]);
    expect(saved.columns.some((c:any)=>!c.visible)).toBe(true);
    const restore=nodes(tree).find(n=>n.type==='button'&&text(n).startsWith('+ '));
    expect(restore).toBeDefined();
    restore!.props.onClick();
    expect(p.onUpdate).not.toHaveBeenCalled();
    expect(p.onKeepDraft).not.toHaveBeenCalled();
  });
  it('keeps readonly, guest and explicitly unauthorized layouts non-editable',()=>{
    for(const restriction of [{guestViewer:true},{readOnlyViewer:true},{canCustomizePopup:false}]){
      hooks.reset();
      const p={...props(),...restriction};
      const tree=render(p);
      expect(nodes(tree).some(n=>n.type===InlineG04PopupHandles)).toBe(false);
      expect(button(tree,'Ẩn cột ')).toBeUndefined();
      expect(button(tree,'Đổi tên nhóm ')).toBeUndefined();
      expect(text(tree)).not.toContain('Cột ẩn (');
      expect(p.onUpdate).not.toHaveBeenCalled();
    }
  });
  it('does not change Excel source, list-layout, drafts or onUpdate when saving local popup width',()=>{
    const p=props();
    const before=JSON.stringify(p.items),list=JSON.stringify(p.listLayout);
    let tree=render(p);
    const handle=nodes(tree).find(n=>n.type===InlineG04PopupHandles);
    expect(handle).toBeDefined();
    handle!.props.onCommit(900);
    tree=render(p);
    expect(tree.props.style['--report-grid-window-width']).toBe('900px');
    expect(JSON.parse([...store.map.values()][0]).dialogWidth).toBe(900);
    expect(JSON.stringify(p.items)).toBe(before);
    expect(JSON.stringify(p.listLayout)).toBe(list);
    expect(p.onUpdate).not.toHaveBeenCalled();
    expect(p.onKeepDraft).not.toHaveBeenCalled();
    hooks.reset();tree=render(p);
    expect(tree.props.style['--report-grid-window-width']).toBe('900px');
  });
});
