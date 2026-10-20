import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const hooks=vi.hoisted(()=>{
  const slots:any[]=[];let cursor=0;
  return {start:()=>{cursor=0;},reset:()=>{slots.length=0;cursor=0;},
    state:(initial:any)=>{const id=cursor++;if(!(id in slots))slots[id]=typeof initial==='function'?initial():initial;
      return [slots[id],(next:any)=>{slots[id]=typeof next==='function'?next(slots[id]):next;}];}
  };
});
vi.mock('react',()=>({useState:hooks.state}));
import {ListViewTools} from '../src/features/items/ListViewTools';
import {defaultItemLayout} from '../src/data/item-preferences';
import {emptyListFilters,loadListViews} from '../src/data/list-views';
const nodes=(x:any):any[]=>Array.isArray(x)?x.flatMap(nodes):x&&typeof x==='object'?[x,...nodes(x.props?.children)]:[];
const find=(tree:any,type:string,label:string)=>nodes(tree).find(n=>n.type===type&&(n.props?.['aria-label']===label||n.props?.children===label));
const config={sourceKey:'test-source',filters:emptyListFilters(),layout:defaultItemLayout(),colors:[],
  onLoad:vi.fn().mockReturnValue(true),onColors:vi.fn(),disabled:false,customizing:true};
beforeEach(()=>{hooks.reset();const values=new Map<string,string>();vi.stubGlobal('localStorage',{
  getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)});});
afterEach(()=>vi.unstubAllGlobals());
const render=()=>{hooks.start();return ListViewTools(config);};
describe('saved list view editor',()=>{
  it('creates personal view and reopens its column filters without modifying shared settings',()=>{
    let tree=render();
    find(tree,'input','Tên mẫu giao diện').props.onChange({target:{value:'Chuyên viên tôi'}});
    tree=render();find(tree,'button','Lưu mẫu mới').props.onClick();
    const presets=loadListViews('test-source');
    expect(presets).toHaveLength(1);expect(presets[0].name).toBe('Chuyên viên tôi');
    tree=render();
    find(tree,'select','Mẫu giao diện đã lưu').props.onChange({target:{value:''}});
    expect(config.onLoad).toHaveBeenCalledWith(null);
  });
  it('builds a safe conditional-color rule with its chosen column and value',()=>{
    let tree=render();
    find(tree,'input','Giá trị kích hoạt màu').props.onChange({target:{value:'Hoàn thành'}});
    tree=render();find(tree,'button','Thêm quy tắc').props.onClick();
    expect(config.onColors).toHaveBeenCalledWith([expect.objectContaining({
      field:'progressCouncil',value:'Hoàn thành',color:'amber'
    })]);
  });
});
