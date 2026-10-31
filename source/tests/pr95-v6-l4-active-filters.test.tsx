import {describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Item} from '../shared/types';
import {createDemoItems} from '../src/data/demo-items';
import {summarizeListItems} from '../src/domain/item-summary';
import {filterToolbarRows,filterByChips,newToolbarState,shouldClearListOnEscape}
  from '../src/features/items/list-toolbar-filters';
import {activeListConditions,activeOtherFilterCount,removeActiveListCondition,
  type ActiveListConditionsState} from '../src/features/items/pr95-v6-l4-active-filters';
import {ActiveListFilters} from '../src/features/items/ActiveListFilters';
import {ItemSummaryCards} from '../src/features/items/ItemSummaryCards';

const items=createDemoItems(8);
const columns=[
  {key:'content',label:'Nội dung trình',origin:'source',removed:false},
  {key:'department',label:'Sở, ngành chủ trì',origin:'source',removed:false},
  {key:'progressBuild',label:'Xây dựng NQ',origin:'source',removed:false},
  {key:'room',label:'Phòng chuyên môn',origin:'source',removed:false},
  {key:'customTracking',label:'Cột phân công ẩn',origin:'custom',removed:false},
  {key:'customRemoved',label:'Cột đã xóa',origin:'custom',removed:true}
];
const initial=():ActiveListConditionsState=>({
  toolbar:newToolbarState(),columnFilters:{},kindSelection:null,summarySelection:null
});
const configured=():ActiveListConditionsState=>{
  const state=initial();
  state.toolbar.search='  ngân sách  ';
  state.toolbar.field='content';
  state.toolbar.department='Sở mẫu A';
  state.toolbar.room='Phòng mẫu 1';
  state.toolbar.details.progressParty='Sở chưa trình';
  state.toolbar.details.specialist='Chuyên viên mẫu A';
  state.kindSelection='qppl';
  state.summarySelection={report:'party',stage:'source'};
  state.columnFilters={
    content:'MẪU',progressBuild:'Không phải trình',
    customTracking:'nhóm α',customRemoved:'bị xóa'
  };
  return state;
};
const inventory=(state:ActiveListConditionsState)=>
  activeListConditions({...state,columns,
    summaryStages:summarizeListItems(items).stages});

describe('PR95 UI V6 L4 — inventory is exact and names only effective predicates',()=>{
  it('renders query with field scope, all F filters, B/C chips and hidden source/custom A–O columns',()=>{
    const conditions=inventory(configured());
    expect(conditions.map(x=>x.id)).toEqual([
      'search','department','room','detail:progressParty','detail:specialist',
      'kind','summary','column:content','column:progressBuild','column:customTracking'
    ]);
    expect(conditions.map(x=>x.label)).toEqual([
      'Tìm kiếm · Nội dung','Sở, ngành','Phòng',
      'Tiến độ Thành ủy chi tiết','Chuyên viên','Loại VB','Trình Thành ủy',
      'Cột · Nội dung trình','Cột · Xây dựng NQ','Cột · Cột phân công ẩn'
    ]);
    expect(conditions.find(x=>x.id==='summary')?.value).toBe('Sở chưa trình');
    expect(conditions.find(x=>x.id==='search')?.value).toBe('ngân sách');
    expect(conditions.find(x=>x.id==='kind')?.value).toBe('NQ QPPL');
    expect(conditions.some(x=>x.id.includes('customRemoved'))).toBe(false);
    expect(activeOtherFilterCount(configured().toolbar)).toBe(3);
  });
  it('does not count empty search even when scope is set, whitespace, sorting or removed columns',()=>{
    const state=initial();
    state.toolbar.field='displayCode';
    state.toolbar.search='   ';
    state.columnFilters={content:'  ',customRemoved:'orphaned'};
    expect(inventory(state)).toEqual([]);
    expect(activeOtherFilterCount(state.toolbar)).toBe(0);
    state.toolbar.search='254';
    expect(inventory(state)).toMatchObject([{id:'search',label:'Tìm kiếm · Mã',value:'254'}]);
    expect(activeOtherFilterCount(state.toolbar)).toBe(1);
    state.toolbar.field='all';
    expect(activeOtherFilterCount(state.toolbar)).toBe(0);
    expect(inventory(state)[0].label).toBe('Tìm kiếm · Tất cả trường');
  });
  it('maps every non-empty F detail field with human labels even after panel closes',()=>{
    const state=initial();
    for(const key of Object.keys(state.toolbar.details) as Array<keyof typeof state.toolbar.details>)
      state.toolbar.details[key]=key+' selected';
    const conditions=inventory(state);
    expect(conditions).toHaveLength(7);
    expect(activeOtherFilterCount(state.toolbar)).toBe(7);
    expect(conditions.every(x=>x.category==='detail'&&x.label.length>4&&!x.label.includes('progress'))).toBe(true);
  });
  it('shows all supported kind choices with friendly labels, without changing classification',()=>{
    const state=initial();
    for(const [kind,value] of [['qppl','NQ QPPL'],['hc','NQ HC'],['bc','BC'],
      ['nq-unknown','NQ chưa phân loại'],['unclassified','Chưa phân loại']] as const){
      state.kindSelection=kind;
      expect(inventory(state)).toMatchObject([{id:'kind',label:'Loại VB',value}]);
    }
  });
  it('uses actual latest report titles and bucket labels even at zero scope',()=>{
    const state=initial();
    state.summarySelection={report:'build',stage:'next'};
    expect(inventory(state)[0]).toMatchObject({
      id:'summary',label:'Trình HĐND xây dựng NQ',value:'Đã trình, chờ QĐ'
    });
    state.summarySelection={report:'nq',stage:'completed'};
    expect(inventory(state)[0]).toMatchObject({
      id:'summary',label:'Trình HĐND ban hành NQ',value:'Hoàn thành'
    });
  });
});
describe('PR95 UI V6 L4 — each chip removes just its own predicate',()=>{
  it('retains every non-target predicate, using immutable shallow copies',()=>{
    const source=configured(),raw=JSON.stringify(source);
    const before=inventory(source);
    for(const condition of before){
      const next=removeActiveListCondition(source,condition);
      const remaining=inventory(next);
      expect(remaining.map(x=>x.id)).toEqual(
        before.filter(x=>x.id!==condition.id).map(x=>x.id));
      const target=before.find(x=>x.id===condition.id);
      expect(target).toBeDefined();
      for(const key of ['kindSelection','summarySelection'] as const){
        if(condition.category!==key.replace('Selection','')&&condition.category!=='summary')
          expect(next[key]).toEqual(source[key]);
      }
      expect(JSON.stringify(source)).toBe(raw);
    }
  });
  it('removing column/custom exact key preserves other column values and toolbar',()=>{
    const source=configured();
    const next=removeActiveListCondition(source,{
      category:'column',key:'customTracking'
    });
    expect(next.columnFilters).toEqual({
      content:'MẪU',progressBuild:'Không phải trình',customRemoved:'bị xóa'
    });
    expect(next.toolbar).toBe(source.toolbar);
    expect(next.kindSelection).toBe('qppl');
    expect(next.summarySelection).toEqual({report:'party',stage:'source'});
    expect(source.columnFilters.customTracking).toBe('nhóm α');
  });
  it('removing search does not silently reset scope selector, details, room or sort',()=>{
    const source=configured();
    const next=removeActiveListCondition(source,{category:'search'});
    expect(next.toolbar.search).toBe('');
    expect(next.toolbar.field).toBe('content');
    expect(next.toolbar.details).toBe(source.toolbar.details);
    expect(next.toolbar.room).toBe(source.toolbar.room);
    expect(next.columnFilters).toBe(source.columnFilters);
    expect(next.kindSelection).toBe(source.kindSelection);
  });
  it('narrowing and removing independent conditions preserves AND/result IDs without changing source',()=>{
    const rows:Item[]=items.map(item=>({...item,isDropped:false,archivedAt:null}));
    const before=JSON.stringify(rows);
    const state=initial();
    state.toolbar.department='Sở mẫu A';
    state.toolbar.room='Phòng mẫu 1';
    state.kindSelection='qppl';
    const ids=(s:ActiveListConditionsState)=>filterByChips(
      filterToolbarRows(rows,s.toolbar),s.kindSelection,s.summarySelection)
      .map(row=>row.recordId);
    expect(ids(state)).toEqual(['demo-0001','demo-0005']);
    state.summarySelection={report:'party',stage:'source'};
    expect(ids(state)).toEqual(['demo-0001']);
    const withoutStage=removeActiveListCondition(state,{category:'summary'});
    expect(ids(withoutStage)).toEqual(['demo-0001','demo-0005']);
    const withoutKind=removeActiveListCondition(state,{category:'kind'});
    expect(ids(withoutKind)).toEqual(['demo-0001']);
    const withoutDepartment=removeActiveListCondition(state,{category:'department'});
    expect(ids(withoutDepartment)).toEqual(['demo-0001']);
    expect(JSON.stringify(rows)).toBe(before);
  });
  it('Esc clears outside editor only; inside search/popup/combobox it does not clear everything',()=>{
    const context={active:true,customizing:false,permissionMode:false,editorOpen:false,popupOpen:false};
    expect(shouldClearListOnEscape({
      key:'Escape',defaultPrevented:false,isComposing:false,repeat:false,target:null
    } as unknown as KeyboardEvent,context)).toBe(true);
    expect(shouldClearListOnEscape({
      key:'Escape',defaultPrevented:false,isComposing:false,repeat:false,target:null
    } as unknown as KeyboardEvent,{...context,popupOpen:true})).toBe(false);
    expect(shouldClearListOnEscape({
      key:'Escape',defaultPrevented:true,isComposing:false,repeat:false,target:null
    } as unknown as KeyboardEvent,context)).toBe(false);
  });
});
describe('PR95 UI V6 L4 — accessible consolidated view',()=>{
  it('renders each active condition as an independent keyboard button, counts X/source and clears zero results',()=>{
    const conditions=inventory(configured());
    const onRemove=vi.fn(),onClearAll=vi.fn();
    const html=renderToStaticMarkup(<ActiveListFilters conditions={conditions}
      visibleCount={0} sourceCount={27} onRemove={onRemove} onClearAll={onClearAll}/>);
    expect(html).toContain('Đang lọc (10)');
    expect(html).toContain('0</strong> / 27 nội dung');
    expect(html).toContain('Không có kết quả phù hợp');
    expect(html).toContain('aria-label="Xóa tất cả 10 điều kiện lọc"');
    expect((html.match(/class="list-active-filter-remove"/g)??[])).toHaveLength(10);
    expect((html.match(/data-active-filter-id="/g)??[])).toHaveLength(10);
    expect(html).toContain('Cột phân công ẩn');
    expect(html).not.toContain('customTracking');
    expect(html).not.toContain('customRemoved');
  });
  it('zero conditions stays visible but no fake Xóa tất cả action',()=>{
    const html=renderToStaticMarkup(<ActiveListFilters conditions={[]}
      visibleCount={27} sourceCount={27} onRemove={()=>{}} onClearAll={()=>{}}/>);
    expect(html).toContain('Đang lọc (0)');
    expect(html).toContain('Chưa áp dụng điều kiện lọc nào.');
    expect(html).not.toContain('Xóa tất cả');
  });
  it('only caller requesting consolidated bar removes duplicated summary footers',()=>{
    const state=configured();
    const props={
      items,selection:state.summarySelection,
      kindSelection:state.kindSelection,visibleCount:1,
      onSelect:()=>{},onSelectKind:()=>{},onClear:()=>{}
    };
    const regular=renderToStaticMarkup(<ItemSummaryCards {...props}/>);
    const consolidated=renderToStaticMarkup(<ItemSummaryCards {...props} showFilterFooters={false}/>);
    expect((regular.match(/class="item-summary-active-filter"/g)??[])).toHaveLength(2);
    expect(consolidated).not.toContain('class="item-summary-active-filter"');
    expect(consolidated).toContain('data-summary-kind="qppl"');
    expect(consolidated).toContain('data-summary-report="party"');
  });
});
