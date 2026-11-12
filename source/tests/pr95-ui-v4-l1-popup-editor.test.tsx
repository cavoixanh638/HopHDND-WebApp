import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import {defaultItemLayout} from '../src/data/item-preferences';

const hooks=vi.hoisted(()=>{
  let slots:any[]=[],index=0;
  return {begin:()=>{index=0;},reset:()=>{slots=[];index=0;},
    state:(initial:any)=>{const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;
      return [slots[i],(next:any)=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
    memo:(fn:any)=>fn()};
});
vi.mock('react',()=>({useState:hooks.state,useMemo:hooks.memo,useRef:()=>({current:null}),useEffect:()=>{}}));
import {ReportDetailGrid} from '../src/features/reports/ReportDetailGrid';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {CellPicker} from '../src/features/items/CellPicker';

type Node={type:any;props:Record<string,any>};
function nodes(v:any):Node[]{
  if(Array.isArray(v))return v.flatMap(nodes);
  if(!v||typeof v!=='object'||!('type' in v))return [];
  const tree=v.type===CompactGroupedValue?CompactGroupedValue(v.props):v.props?.children;
  return [v,...nodes(tree)];
}
function content(v:any):string{return Array.isArray(v)?v.map(content).join(''):
  v&&typeof v==='object'&&'type' in v?content(v.props?.children):typeof v==='string'?v:'';}
let store:Map<string,string>;
beforeEach(()=>{
  hooks.reset();store=new Map<string,string>();
  vi.stubGlobal('localStorage',{getItem:(k:string)=>store.get(k)??null,
    setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)});
  vi.stubGlobal('location',{pathname:'/preview/ui-v4-l1-test/'});
  vi.stubGlobal('window',{innerWidth:1500});
});
afterEach(()=>vi.unstubAllGlobals());

describe('UI V4 L1 popup real editor callbacks with legacy source',()=>{
  it('projects grouped legacy statuses; opening, canceling, or same canonical selection cannot patch',()=>{
    const first=createDemoItems(1)[0];
    const item={...first,recordId:'popup-old-NQ02',displayCode:'NQ02',
      partyLevel:'Ban Chấp hành',progressParty:'VP đang thực hiện',
      progressBuild:'Đã trình HĐND, chưa có QĐ',progressCouncil:'Đã trình HĐND thành phố'};
    const before=JSON.stringify(item);
    let granted=true;const onUpdate=vi.fn();
    const props={title:'Báo cáo V4',selectedIds:[item.recordId],items:[item],sourceKey:'v4-l1-popup',
      catalog:catalogFromItems([item]),listLayout:defaultItemLayout(),allowDraft:true,
      canEditCell:(_id:string,field:string)=>granted&&_id===item.recordId&&field==='progressBuild',
      onUpdate,onKeepDraft:vi.fn().mockReturnValue(true),dirtyIds:new Set<string>(),
      errors:{},onClose:vi.fn()};
    hooks.begin();let tree=ReportDetailGrid(props);
    const readOnly=nodes(tree).filter(n=>n.type===CompactGroupedValue&&n.props.pair?.variant==='partyTogether');
    expect(readOnly).toHaveLength(1);
    // Grouped read-only spans are resolved field-by-field against raw source.
    const staticText=content(CompactGroupedValue(readOnly[0].props as Parameters<typeof CompactGroupedValue>[0]));
    // The default popup hides partyLevel; its independent projection is covered by the List fixture.
    for(const shown of ['VP đang xử lý','Đã trình, chờ QĐ','Hoàn thành'])
      expect(staticText).toContain(shown);
    expect(onUpdate).not.toHaveBeenCalled();
    const edit=nodes(tree).find(n=>n.type==='button'&&content(n)==='Chỉnh sửa nháp');
    expect(edit).toBeDefined();edit!.props.onClick();
    hooks.begin();tree=ReportDetailGrid(props);
    const pickers=nodes(tree).filter(n=>n.type===CellPicker&&n.props.field==='progressBuild');
    expect(pickers).toHaveLength(1);
    const editor=pickers[0].props;
    expect(editor.value).toBe('Đã trình, chờ QĐ');
    expect(editor.displayValue).toBe('Đã trình, chờ QĐ');
    expect(editor.options).toEqual([
      'Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ','Đã có QĐ'
    ]);
    expect(editor.options).not.toContain(item.progressBuild);
    expect(onUpdate).not.toHaveBeenCalled();
    editor.onChange('Đã trình, chờ QĐ');
    expect(onUpdate).not.toHaveBeenCalled();
    granted=false;editor.onChange('Đã có QĐ');
    expect(onUpdate).not.toHaveBeenCalled(); // grant revoked after menu opens
    granted=true;editor.onChange('Đã có QĐ');
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate).toHaveBeenCalledWith(item.recordId,{progressBuild:'Đã có QĐ'});
    expect(JSON.stringify(item)).toBe(before);
  });
});
