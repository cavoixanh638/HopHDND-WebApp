import {describe,it,expect,vi,beforeEach} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {emptyListFilters,loadListViews,saveListViews,saveActiveListView,loadActiveListView,clearActivePersonalView,matchesColumnFilters,itemColor,validateColorRules} from '../src/data/list-views';
describe('saved views, per-column filters and conditional colors',()=>{
  const values=new Map<string,string>();
  beforeEach(()=>{values.clear();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>{values.set(k,v);},removeItem:(k:string)=>{values.delete(k);}});});
  it('roundtrips multiple named presets with layouts and filters',()=>{
    const a={id:'a',name:'Phòng tôi',filters:{...emptyListFilters(),columns:{department:'Sở mẫu A'}},layout:defaultItemLayout(),colors:[]};
    expect(saveListViews('source',[a,{...a,id:'b',name:'Chưa trình'}])).toBe(true);
    expect(loadListViews('source').map(v=>v.name)).toEqual(['Phòng tôi','Chưa trình']);
    expect(loadListViews('other')).toEqual([]);
  });
  it('clears a previously active personal preset without destroying its stored definition',()=>{
    const preset={id:'old',name:'Mẫu cũ',filters:{...emptyListFilters(),columns:{room:'Phòng khác'}},
      layout:defaultItemLayout(),colors:[]};
    saveListViews('source',[preset]);
    saveActiveListView('source','old');
    expect(loadActiveListView('source')).toBe('old');
    clearActivePersonalView('source');
    expect(loadActiveListView('source')).toBe('');
    expect(loadListViews('source')).toHaveLength(1);
    expect(loadListViews('source')[0].filters.columns.room).toBe('Phòng khác');
  });
  it('ignores invalid column filters and malicious colors',()=>{
    const item=createDemoItems(1)[0];
    expect(matchesColumnFilters(item,{content:'MẪU',secret:'something'})).toBe(true);
    expect(matchesColumnFilters(item,{department:'không tồn tại'})).toBe(false);
    expect(validateColorRules([{id:'a',field:'progressCouncil',value:item.progressCouncil,color:'amber'},{id:'b',field:'nonsense',value:'x',color:'rose'}])).toHaveLength(1);
    expect(itemColor(item,[{id:'a',field:'progressCouncil',value:item.progressCouncil,color:'amber'}])).toBe('amber');
  });
});
