import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {defaultItemLayout,type ItemLayout} from '../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
const hooks=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;let effects:(()=>void)[]=[];
  const memo=(fn:any,deps:any[])=>{const i=cursor++,prev=slots[i];
    if(!prev||deps.some((d,j)=>!Object.is(d,prev.deps[j])))slots[i]={deps,value:fn()};
    return slots[i].value;};
  return {state:(initial:any)=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
    return [slots[i],(value:any)=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];},
    ref:(initial:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:initial});},
    memo,begin:()=>{cursor=0;},
    effect:(fn:any,deps:any[])=>{const i=cursor++,prev=slots[i];
      if(!prev||deps.some((d,j)=>!Object.is(d,prev.deps[j])))
        effects.push(()=>{prev?.cleanup?.();slots[i]={deps,cleanup:fn()};});},
    flush:()=>{const tasks=effects;effects=[];tasks.forEach(task=>task());},
    reset:()=>{slots.length=0;cursor=0;effects=[];}};
});
vi.mock('react',()=>({useState:hooks.state,useRef:hooks.ref,useMemo:hooks.memo,
  useEffect:hooks.effect,useCallback:(fn:any,deps:any[])=>hooks.memo(()=>fn,deps)}));
vi.mock('../src/components/useElementWidth',()=>({useElementWidth:()=>({ref:vi.fn(),width:1200})}));
vi.mock('../src/components/SharedEditTooltip',()=>({mountSharedEditTooltip:()=>{}}));
import {ItemList} from '../src/features/items/ItemList';
import {LayoutConflictResolver} from '../src/features/items/LayoutConflictResolver';
function nodes(node:any):any[]{return Array.isArray(node)?node.flatMap(nodes):
  node&&typeof node==='object'?[node,...nodes(node.props?.children)]:[];}
function view(props:any){hooks.begin();const tree=ItemList(props);hooks.flush();return tree;}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
const inputs=(tree:any)=>nodes(tree).filter(n=>n.type==='input'&&
  n.props?.['aria-label']==='Đổi tên cột gộp partyTogether');
const form=(tree:any)=>nodes(tree).find(n=>n.type==='form'&&
  n.props?.className==='modal-body group-label-quick-editor');
const shortcut=(tree:any)=>nodes(tree).find(n=>n.type==='button'&&
  n.props?.className?.includes('group-label-shortcut'));
function propsFor(onPersistViewerLayout:any,initialLayout:ItemLayout){
  const items=createDemoItems(2);
  return {items,drafts:{},errors:{},busy:false,onUpdate:vi.fn(),onHistory:vi.fn(),
    onClose:vi.fn(),onSaveData:vi.fn(),onDiscardData:vi.fn(),onLayoutSaved:vi.fn(),
    sourceKey:'r15-ui-test',catalog:catalogFromItems(items),initialLayout,
    onPersistViewerLayout,allowLayout:true,readOnly:true};
}
beforeEach(()=>{
  hooks.reset();
  const storage=new Map<string,string>();
  vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,
    setItem:(key:string,v:string)=>storage.set(key,v),
    removeItem:(key:string)=>storage.delete(key)});
  vi.stubGlobal('window',{setInterval:()=>1,clearInterval:()=>{},
    setTimeout:()=>1,clearTimeout:()=>{},addEventListener:vi.fn(),
    removeEventListener:vi.fn(),innerWidth:1280});
  vi.stubGlobal('document',{hidden:false,addEventListener:vi.fn(),
    removeEventListener:vi.fn()});
});
afterEach(()=>vi.unstubAllGlobals());
describe('R15 group header two-tab editing regression',()=>{
  it('uses the open-time baseline, blocks competing rename, and requires explicit remote/local decision',async()=>{
    const baseline=defaultItemLayout(),remote={
      ...baseline,groupLabels:{partyTogether:'Tab B'}};
    const saver=vi.fn(async(next:ItemLayout,old:ItemLayout,choices={})=>
      mergeItemLayout(old,next,remote,choices));
    const props=propsFor(saver,baseline);
    let tree=view(props);
    shortcut(tree).props.onClick();tree=view(props);
    expect(inputs(tree)).toHaveLength(1);
    inputs(tree)[0].props.onChange({currentTarget:{value:'Tab A'}});
    tree=view(props);
    // Simulate Firebase listener replacing initialLayout while dialog stays open.
    props.initialLayout=remote;
    tree=view(props);
    form(tree).props.onSubmit({preventDefault:()=>{}});await settle();
    expect(saver).toHaveBeenCalledTimes(1);
    expect(saver.mock.calls[0][1].groupLabels).toEqual(baseline.groupLabels);
    expect(saver.mock.calls[0][0].groupLabels?.partyTogether).toBe('Tab A');
    tree=view(props);
    const resolver=nodes(tree).find(n=>n.type===LayoutConflictResolver);
    expect(resolver).toBeDefined();
    expect(resolver.props.conflicts).toEqual([
      expect.objectContaining({id:'groupLabels.partyTogether',
        local:'Tab A',remote:'Tab B'})]);
    expect(inputs(tree)[0].props.value).toBe('Tab A');
    resolver.props.onChoose('groupLabels.partyTogether','remote');
    tree=view(props);
    nodes(tree).find(n=>n.type===LayoutConflictResolver).props.onConfirm();
    await settle();
    expect(saver).toHaveBeenCalledTimes(2);
    expect(saver.mock.calls[1][1].groupLabels).toEqual(baseline.groupLabels);
    expect(saver.mock.calls[1][2]).toEqual({'groupLabels.partyTogether':'remote'});
    expect(inputs(view(props))).toHaveLength(0);
  });
  it('keeps independent names from both tabs and never rewrites remote unrelated labels',async()=>{
    const baseline=defaultItemLayout(),remote={...baseline,
      groupLabels:{contentDetails:'Tab B: Hồ sơ'}};
    const saver=vi.fn(async(next:ItemLayout,old:ItemLayout,choices={})=>
      mergeItemLayout(old,next,remote,choices));
    const props=propsFor(saver,baseline);
    let tree=view(props);shortcut(tree).props.onClick();tree=view(props);
    inputs(tree)[0].props.onChange({currentTarget:{value:'Tab A: Tiến độ'}});
    props.initialLayout=remote;
    tree=view(props);form(tree).props.onSubmit({preventDefault:()=>{}});
    await settle();
    const confirmed=await saver.mock.results[0].value;
    expect(confirmed.groupLabels).toEqual({
      contentDetails:'Tab B: Hồ sơ',partyTogether:'Tab A: Tiến độ'});
    expect(inputs(view(props))).toHaveLength(0);
  });
  it('does not write to Firebase if no label was changed while the other tab edited',async()=>{
    const baseline=defaultItemLayout(),saver=vi.fn();
    const props=propsFor(saver,baseline);
    let tree=view(props);shortcut(tree).props.onClick();tree=view(props);
    props.initialLayout={...baseline,groupLabels:{partyTogether:'Remote'}};
    tree=view(props);form(tree).props.onSubmit({preventDefault:()=>{}});
    await settle();
    expect(saver).not.toHaveBeenCalled();
    expect(inputs(view(props))).toHaveLength(0);
  });
});
