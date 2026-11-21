import {beforeEach,describe,expect,it,vi} from 'vitest';
import {ColumnHeader} from '../src/features/items/ColumnHeader';

const hooks=vi.hoisted(()=>{
  let slots:unknown[]=[];
  let cursor=0;
  return {
    reset:()=>{slots=[];cursor=0;},
    begin:()=>{cursor=0;},
    state:(initial:unknown)=>{
      const at=cursor++;
      if(!(at in slots))slots[at]=typeof initial==='function'?(initial as ()=>unknown)():initial;
      return [slots[at],(next:unknown)=>{
        slots[at]=typeof next==='function'?(next as (value:unknown)=>unknown)(slots[at]):next;
      }];
    },
  };
});
vi.mock('react',()=>({
  useState:hooks.state,
  useRef:(initial:unknown)=>({current:initial}),
  useEffect:()=>{},
}));

type Node={type:any;props:Record<string,any>};
const nodes=(root:any):Node[]=>
  root&&Array.isArray(root)?root.flatMap(nodes):
  root&&typeof root==='object'&&'type' in root?
    [root,...nodes(root.props?.children)]:[];

const render=(extra:Record<string,unknown>={})=>{
  hooks.begin();
  return ColumnHeader({
    columnKey:'content',sortLabel:'Nội dung trình',children:'Nội dung trình',
    onMove:vi.fn(),onSort:vi.fn(),disabled:false,...extra,
  });
};
beforeEach(()=>hooks.reset());

describe('Excel-like admin header visibility in normal view',()=>{
  it('exposes a right-click menu with hide and restore without advanced edit',()=>{
    const onHide=vi.fn(),onShow=vi.fn(),onShowAll=vi.fn();
    const props={quickVisibility:true,canHide:true,onHide,onShow,onShowAll,
      hiddenColumns:[{key:'room',label:'Phòng'},{key:'type',label:'Loại văn bản'}]};
    let tree=render(props);
    expect(nodes(tree).some(n=>n.type==='button'&&n.props['aria-label']==='Tùy chọn cột Nội dung trình')).toBe(true);
    tree.props.onContextMenu({target:null,preventDefault:vi.fn(),stopPropagation:vi.fn()});
    tree=render(props);
    const buttons=nodes(tree).filter(n=>n.type==='button');
    const hide=buttons.find(n=>n.props['aria-label']==='Ẩn cột Nội dung trình');
    expect(hide?.props.disabled).toBe(false);
    hide!.props.onClick();
    expect(onHide).toHaveBeenCalledWith('content');
    // Open once more and restore using the SAME visible table header.
    tree.props.onContextMenu({target:null,preventDefault:vi.fn(),stopPropagation:vi.fn()});
    tree=render(props);
    const restore=nodes(tree).find(n=>n.type==='button'&&n.props['aria-label']==='Hiện cột Phòng');
    restore!.props.onClick();
    expect(onShow).toHaveBeenCalledWith('room');
    tree.props.onContextMenu({target:null,preventDefault:vi.fn(),stopPropagation:vi.fn()});
    tree=render(props);
    expect(nodes(tree).some(n=>n.type==='button'&&n.props.children==='Hiện tất cả cột')).toBe(true);
    expect(onShowAll).not.toHaveBeenCalled();
  });
  it('never exposes controls to a guest without a verified visibility capability',()=>{
    const tree=render({quickVisibility:false,onHide:vi.fn(),onShow:vi.fn(),
      hiddenColumns:[{key:'room',label:'Phòng'}]});
    expect(tree.props.onContextMenu).toBeUndefined();
    expect(nodes(tree).some(n=>n.props.className==='inline-g01-column-menu-trigger')).toBe(false);
  });
  it('keeps protected ID unhide-only and supports Shift+F10 keyboard access',()=>{
    const props={quickVisibility:true,canHide:false,onHide:vi.fn(),onShow:vi.fn(),
      hiddenColumns:[{key:'room',label:'Phòng'}]};
    let tree=render(props);
    const block=vi.fn(),target={};
    tree.props.onKeyDown({key:'F10',shiftKey:true,altKey:false,target,currentTarget:target,
      preventDefault:block});
    expect(block).toHaveBeenCalledTimes(1);
    tree.props.onContextMenu({target:null,preventDefault:block,stopPropagation:vi.fn()});
    tree=render(props);
    const hide=nodes(tree).find(n=>n.props['aria-label']==='Ẩn cột Nội dung trình');
    expect(hide!.props.disabled).toBe(true);
    expect(nodes(tree).some(n=>n.props['aria-label']==='Hiện cột Phòng')).toBe(true);
  });
});
