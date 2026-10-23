import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import type {Item} from '../shared/types';
import type {Repository} from '../src/data/repository';
import {createDemoItems} from '../src/data/demo-items';

// Minimal React lifecycle simulation: prove the DB listener owns the initial
// payload; do not make any real Firebase request or use production credentials.
const h=vi.hoisted(()=>{
 const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];
 const memo=(fn:any,deps:any[])=>{
   const i=cursor++,old=slots[i];
   if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))slots[i]={deps,value:fn()};
   return slots[i].value;
 };
 return {state:(init:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof init==='function'?init():init;
   return[slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
   ref:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});},
   memo,callback:(fn:any,deps:any[])=>memo(()=>fn,deps),
   effect:(fn:any,deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((v,j)=>!Object.is(v,old.deps[j])))effects.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
   render:()=>{cursor=0;},flush:()=>{const todo=effects;effects=[];todo.forEach(x=>x());},
   reset:()=>{slots.length=0;cursor=0;effects=[];},
   dispose:()=>slots.forEach(x=>x?.cleanup?.())
 };
});
vi.mock('react',()=>({useState:h.state,useRef:h.ref,useMemo:h.memo,useCallback:h.callback,useEffect:h.effect}));
import {useWorkspace} from '../src/state/use-workspace';

describe('Realtime Database initial read is a single authenticated listener',()=>{
 let receive:((items:Item[])=>void)|undefined;
 const rows=createDemoItems(3);
 const list=vi.fn(async()=>rows);
 const subscribe=vi.fn((listener:(items:Item[])=>void)=>{
   receive=listener;return vi.fn();
 });
 const repo:Repository={sourceKind:'firebase',readOnly:true,canDraft:false,
   subscribeInitial:true,list,subscribe,history:async()=>[],save:async()=>[]};
 function render(authorized:boolean,selected:Repository=repo){
   h.render();
   const result=useWorkspace(selected,'fixture',authorized);
   h.flush();
   return result;
 }
 beforeEach(()=>{
   h.reset();list.mockClear();subscribe.mockClear();receive=undefined;
   vi.stubGlobal('window',{setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval,setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout,addEventListener:vi.fn(),removeEventListener:vi.fn()});
   vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),removeEventListener:vi.fn()});
 });
 afterEach(()=>{h.dispose();vi.unstubAllGlobals();});
 it('renders a read-only recent session snapshot once the viewer is authenticated, then confirms online',()=>{
   const recent=[{...rows[0],note:'Bản lưu tạm'}];
   const cachedRows=vi.fn(()=>recent);
   const viewerRepo:Repository={...repo,cachedRows};
   let status=render(false,viewerRepo);
   expect(status.items).toHaveLength(0);
   expect(cachedRows).not.toHaveBeenCalled();
   status=render(true,viewerRepo);
   expect(cachedRows).toHaveBeenCalledTimes(1);
   expect(status.items).toHaveLength(0); // React state update needs the following render.
   status=render(true,viewerRepo);
   expect(status.items).toEqual(recent);
   expect(status.busy).toBe(false);
   expect(status.cachePending).toBe(true);
   expect(list).not.toHaveBeenCalled();
   receive!(rows);
   status=render(true,viewerRepo);
   expect(status.items).toEqual(rows);
   expect(status.cachePending).toBe(false);
   expect(subscribe).toHaveBeenCalledTimes(1);
 });
 it('starts no protected request before authentication and only one listener after',()=>{
   render(false);
   expect(list).not.toHaveBeenCalled();
   expect(subscribe).not.toHaveBeenCalled();
   render(true);
   expect(subscribe).toHaveBeenCalledTimes(1);
   expect(list).not.toHaveBeenCalled();
   expect(render(true).busy).toBe(true);
   receive!(rows);
   const state=render(true);
   expect(state.items).toEqual(rows);
   expect(state.busy).toBe(false);
   expect(list).not.toHaveBeenCalled();
   expect(subscribe).toHaveBeenCalledTimes(1);
 });
});
