import {beforeEach,afterEach,describe,expect,it,vi} from 'vitest';

const hooks=vi.hoisted(()=>({cleanups:[] as Array<()=>void>}));
vi.mock('react',()=>({
  useRef:<T,>(value:T)=>({current:value}),
  useEffect:(fn:()=>void|(()=>void))=>{const cleanup=fn();if(cleanup)hooks.cleanups.push(cleanup);}
}));
import {ColumnResizeHandle} from '../src/components/ColumnResizeHandle';

type Column={style:{width:string}};
type FakeHandle={
  closest:(selector:string)=>unknown;setPointerCapture:(pointer:number)=>void;
  hasPointerCapture:(pointer:number)=>boolean;releasePointerCapture:(pointer:number)=>void;
  focus:()=>void;setAttribute:(name:string,value:string)=>void;attributes:Record<string,string>;
};
const key=(name:string,overrides:Record<string,unknown>={})=>({
  key:name,shiftKey:false,altKey:false,ctrlKey:false,metaKey:false,
  preventDefault:vi.fn(),stopPropagation:vi.fn(),...overrides
});
const create=(config:{
  width?:number;min?:number;max?:number;cols?:number[];index?:number;
  adjacent?:{index:number;width:number;min:number;max:number};
  fallback?:{index:number;width:number;min:number;max:number};
  compensator?:{index:number;width:number;min?:number;max?:number};
  direction?:'ltr'|'rtl';scale?:number;windowDragFallback?:boolean;
}={})=>{
  const cols=(config.cols??[200,170,240]).map(width=>({style:{width:width+'px'}}));
  const table={style:{width:'610px',minWidth:'610px'},offsetWidth:610,
    getBoundingClientRect:()=>({width:610*(config.scale??1)}),
    querySelectorAll:()=>({item:(index:number)=>cols[index]??null})};
  let captured:number|undefined;
  const handle:FakeHandle={
    closest:()=>table,
    setPointerCapture:pointer=>{captured=pointer;},
    hasPointerCapture:pointer=>captured===pointer,
    releasePointerCapture:pointer=>{if(captured===pointer)captured=undefined;},
    focus:vi.fn(),attributes:{},setAttribute(name,value){this.attributes[name]=value;}
  };
  const commit=vi.fn(),preview=vi.fn();
  const props={columnIndex:config.index??0,width:config.width??200,label:'Tiến độ',
    min:config.min??70,max:config.max??800,
    ...(config.adjacent?{adjacent:config.adjacent}:{}),
    ...(config.fallback?{fallback:config.fallback}:{}),
    ...(config.compensator?{compensator:config.compensator}:{}),
    windowDragFallback:config.windowDragFallback??true,
    onCommit:commit,onPreview:preview};
  const element=ColumnResizeHandle(props) as unknown as {props:Record<string,(e:any)=>void>&Record<string,unknown>};
  const pointer=(x:number,overrides:Record<string,unknown>={})=>({
    pointerId:11,clientX:x,button:0,isPrimary:true,currentTarget:handle,
    preventDefault:vi.fn(),stopPropagation:vi.fn(),...overrides
  });
  const dispatch=(event:string,pointerId:number,clientX=0)=>{
    const e=new Event(event) as PointerEvent;
    Object.defineProperties(e,{pointerId:{value:pointerId},clientX:{value:clientX}});
    window.dispatchEvent(e);
  };
  (window.getComputedStyle as ReturnType<typeof vi.fn>).mockReturnValue({direction:config.direction??'ltr'});
  return {element:element.props,cols,table,handle,commit,preview,pointer,dispatch};
};

beforeEach(()=>{
  hooks.cleanups.length=0;
  const win=Object.assign(new EventTarget(),{getComputedStyle:vi.fn(),blur:()=>{}});
  vi.stubGlobal('window',win);
});
afterEach(()=>{
  hooks.cleanups.splice(0).forEach(fn=>fn());
  vi.unstubAllGlobals();
});

describe('G07: pointer capture and commit-on-end gestures',()=>{
  it('previews locally and commits once on pointer release; duplicate bubble/up cannot write',()=>{
    const a=create();
    a.element.onPointerDown(a.pointer(100));
    a.element.onPointerMove(a.pointer(130));
    a.dispatch('pointermove',11,130);
    expect(a.cols[0].style.width).toBe('230px');
    expect(a.commit).not.toHaveBeenCalled();
    expect(a.preview).toHaveBeenCalledTimes(1);
    a.dispatch('pointerup',11,150);
    a.element.onPointerUp(a.pointer(150));
    expect(a.commit).toHaveBeenCalledWith(250);
    expect(a.cols[0].style.width).toBe('200px');
    expect(a.table.style).toEqual({width:'610px',minWidth:'610px'});
    expect(a.handle.attributes['aria-valuenow']).toBe('250');
  });
  it('keeps adjacent-first compensation and clamps target when neighbor and reservoir run out',()=>{
    const a=create({adjacent:{index:1,width:170,min:60,max:1600},
      fallback:{index:2,width:240,min:60,max:1600}});
    a.element.onPointerDown(a.pointer(0));
    a.element.onPointerMove(a.pointer(180));
    expect(a.cols.map(c=>c.style.width)).toEqual(['380px','60px','170px']);
    a.element.onPointerMove(a.pointer(1500));
    expect(a.cols.map(c=>c.style.width)).toEqual(['490px','60px','60px']);
    a.element.onPointerUp(a.pointer(1500));
    expect(a.commit).toHaveBeenCalledWith(490);
    expect(a.cols.map(c=>c.style.width)).toEqual(['200px','170px','240px']);
  });
  it('restores original inline styles on cancel and ignores unrelated pointer IDs',()=>{
    const a=create();
    a.cols[0].style.width=''; // Snapshot must preserve style, not materialize a new inline width.
    a.element.onPointerDown(a.pointer(0));
    a.element.onPointerMove(a.pointer(100));
    a.dispatch('pointercancel',99,100);
    expect(a.cols[0].style.width).toBe('300px');
    a.element.onPointerCancel(a.pointer(100,{pointerId:99}));
    expect(a.commit).not.toHaveBeenCalled();
    a.dispatch('pointercancel',11,100);
    expect(a.cols[0].style.width).toBe('');
    expect(a.commit).not.toHaveBeenCalled();
    expect(a.handle.attributes['aria-valuenow']).toBe('200');
    a.dispatch('pointerup',11,100);
    expect(a.commit).not.toHaveBeenCalled();
  });
  it('Escape and window blur cancel a captured pointer, including when capture is lost',()=>{
    const a=create();
    a.element.onPointerDown(a.pointer(0));
    a.dispatch('pointermove',11,40);
    const escape=new Event('keydown') as KeyboardEvent;
    Object.defineProperty(escape,'key',{value:'Escape'});
    window.dispatchEvent(escape);
    expect(a.commit).not.toHaveBeenCalled();
    expect(a.cols[0].style.width).toBe('200px');
    a.element.onPointerDown(a.pointer(0));
    a.dispatch('pointermove',11,50);
    window.dispatchEvent(new Event('blur'));
    expect(a.cols[0].style.width).toBe('200px');
    expect(a.commit).not.toHaveBeenCalled();
  });
  it('fallback can continue outside the target and unmount releases listeners without saving',()=>{
    const a=create({windowDragFallback:true});
    a.element.onPointerDown(a.pointer(0));
    a.dispatch('pointermove',11,50);
    expect(a.cols[0].style.width).toBe('250px');
    hooks.cleanups.splice(0).forEach(fn=>fn());
    expect(a.cols[0].style.width).toBe('200px');
    a.dispatch('pointerup',11,100);
    expect(a.commit).not.toHaveBeenCalled();
  });
  it('does not start drag with non-primary touch or right mouse button',()=>{
    const a=create();
    a.element.onPointerDown(a.pointer(0,{button:2}));
    a.element.onPointerDown(a.pointer(0,{isPrimary:false,pointerType:'touch'}));
    a.element.onPointerMove(a.pointer(60));
    expect(a.commit).not.toHaveBeenCalled();
    expect(a.cols[0].style.width).toBe('200px');
  });
  it('uses CSS rendered scale and supports RTL direction',()=>{
    const a=create({scale:1.5,direction:'rtl'});
    a.element.onPointerDown(a.pointer(100));
    a.element.onPointerMove(a.pointer(130));
    expect(a.cols[0].style.width).toBe('180px');
    a.element.onPointerUp(a.pointer(130));
    expect(a.commit).toHaveBeenCalledWith(180);
  });
  it('clamps report bounds at 80 and 1200 and popup bounds at 70 and 800',()=>{
    for(const [min,max] of [[80,1200],[70,800]]){
      const a=create({min,max});
      a.element.onPointerDown(a.pointer(0));
      a.element.onPointerMove(a.pointer(3000));
      expect(a.cols[0].style.width).toBe(max+'px');
      a.element.onPointerUp(a.pointer(3000));
      expect(a.commit).toHaveBeenCalledWith(max);
    }
  });
});
describe('G07: keyboard and accessibility',()=>{
  it('Arrow/Shift+Arrow preview until keyup, then exactly one commit',()=>{
    const a=create();
    expect(a.element['role']).toBe('separator');
    expect(a.element['aria-valuemin']).toBe(70);
    expect(a.element['aria-valuemax']).toBe(800);
    a.element.onKeyDown({...key('ArrowRight'),currentTarget:a.handle});
    a.element.onKeyDown({...key('ArrowRight',{shiftKey:true}),currentTarget:a.handle});
    expect(a.cols[0].style.width).toBe('260px');
    expect(a.commit).not.toHaveBeenCalled();
    a.element.onKeyUp(key('ArrowRight'));
    a.element.onKeyUp(key('ArrowRight'));
    expect(a.commit).toHaveBeenCalledWith(260);
    expect(a.cols[0].style.width).toBe('200px');
  });
  it('Escape cancels keyboard changes and blur commits once',()=>{
    const a=create();
    a.element.onKeyDown({...key('ArrowLeft'),currentTarget:a.handle});
    a.element.onKeyDown(key('Escape'));
    a.element.onKeyUp(key('ArrowLeft'));
    expect(a.commit).not.toHaveBeenCalled();
    a.element.onKeyDown({...key('ArrowRight'),currentTarget:a.handle});
    a.element.onBlur();
    expect(a.commit).toHaveBeenCalledWith(210);
  });
  it('ignores Alt+arrow so parent header reorder remains independent',()=>{
    const a=create();
    a.element.onKeyDown({...key('ArrowRight',{altKey:true}),currentTarget:a.handle});
    a.element.onKeyUp(key('ArrowRight'));
    expect(a.commit).not.toHaveBeenCalled();
  });
  it('preserves adjacent limits at 1600 and does not write Firebase during preview',()=>{
    const a=create({width:1590,min:60,max:1600,cols:[1590,100,200],
      adjacent:{index:1,width:100,min:60,max:1600}});
    a.element.onPointerDown(a.pointer(0));
    a.element.onPointerMove(a.pointer(300));
    expect(a.cols[0].style.width).toBe('1600px');
    expect(a.cols[1].style.width).toBe('90px');
    expect(a.commit).not.toHaveBeenCalled();
    a.element.onPointerCancel(a.pointer(300));
    expect(a.commit).not.toHaveBeenCalled();
  });
});
