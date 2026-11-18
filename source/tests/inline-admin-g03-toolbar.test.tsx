import {beforeEach,describe,expect,it,vi} from 'vitest';
import {defaultReportLayout} from '../src/data/report-preferences';
import {inlineG03VisualValue} from '../src/features/settings/inline-g03-report-visual-adapter';

const hooks=vi.hoisted(()=>{
  let slots:unknown[]=[];let index=0;
  return {
    begin:()=>{index=0;},
    reset:()=>{slots=[];index=0;},
    state:(initial:unknown)=>{
      const i=index++;
      if(!(i in slots))slots[i]=typeof initial==='function'?(initial as ()=>unknown)():initial;
      return [slots[i],(next:unknown)=>{
        slots[i]=typeof next==='function'?(next as (previous:unknown)=>unknown)(slots[i]):next;
      }];
    },
  };
});
vi.mock('react',()=>({
  useState:hooks.state,
  useId:()=> 'g03-fixture',
  useRef:()=>({current:null}),
  useEffect:()=>{},
}));
import {ReportInlineVisualToolbar} from '../src/features/settings/inline-g03-ReportInlineVisualToolbar';
type Node={type:any;props:Record<string,any>};
function nodes(value:any):Node[]{
  return Array.isArray(value)?value.flatMap(nodes):
    value&&typeof value==='object'&&'type' in value?[value,...nodes(value.props?.children)]:[];
}
function label(value:any):string{
  return Array.isArray(value)?value.map(label).join(''):
    value&&typeof value==='object'&&'type' in value?label(value.props?.children):
      typeof value==='string'||typeof value==='number'?String(value):'';
}
const baseline=inlineG03VisualValue(defaultReportLayout(),'party');
function fixture(overrides:Record<string,unknown>={}){
  const onChange=vi.fn(),onSave=vi.fn(),onCancel=vi.fn();
  const props={reportId:'party',reportTitle:'Tiến độ xin ý kiến Thành ủy',
    value:baseline,canEdit:true,dirty:true,onChange,onSave,onCancel,...overrides};
  const render=()=>{hooks.begin();return ReportInlineVisualToolbar(props);};
  return {props,onChange,onSave,onCancel,render};
}
beforeEach(()=>hooks.reset());
describe('G03 Aa and palette toolbar functional contract',()=>{
  it('hides every control when admin authorization is missing',()=>{
    const f=fixture({canEdit:false});
    expect(f.render()).toBeNull();
    expect(f.onChange).not.toHaveBeenCalled();
    expect(f.onSave).not.toHaveBeenCalled();
  });
  it('opens compact Aa controls, updates font and range without persisting',()=>{
    const f=fixture();let tree=f.render();
    const font=nodes(tree).find(n=>n.type==='button'&&n.props['aria-label']==='Phông chữ và cỡ chữ');
    expect(font?.props['aria-expanded']).toBe(false);
    font!.props.onClick();
    tree=f.render();
    expect(nodes(tree).find(n=>n.type==='select')).toBeDefined();
    expect(nodes(tree).find(n=>n.type==='input'&&n.props.type==='range')?.props.value).toBe(13);
    nodes(tree).find(n=>n.type==='select')!.props.onChange({currentTarget:{value:'inter'}});
    nodes(tree).find(n=>n.type==='input'&&n.props.type==='range')!.props.onChange({currentTarget:{value:'20'}});
    expect(f.onChange).toHaveBeenNthCalledWith(1,{tableFont:'inter'});
    expect(f.onChange).toHaveBeenNthCalledWith(2,{tableFontSize:20});
    expect(f.onSave).not.toHaveBeenCalled();
    nodes(tree).find(n=>n.type==='div'&&n.props['data-g03-visual-toolbar'])!
      .props.onKeyDown({key:'Escape',preventDefault:vi.fn(),stopPropagation:vi.fn()});
    tree=f.render();
    expect(nodes(tree).some(n=>n.type==='select')).toBe(false);
  });
  it('offers five exact styles and per-report state/title highlight callbacks',()=>{
    const f=fixture();f.render();
    nodes(f.render()).find(n=>n.type==='button'&&n.props['aria-label']==='Phong cách và tô màu báo cáo')!.props.onClick();
    const tree=f.render(),all=nodes(tree);
    const radios=all.filter(n=>n.type==='input'&&n.props.type==='radio');
    expect(radios.map(n=>n.props.value)).toEqual(['classic','signal','compact','bars','band']);
    radios[3].props.onChange();
    all.find(n=>n.type==='input'&&n.props.type==='checkbox')!.props.onChange({currentTarget:{checked:false}});
    all.find(n=>n.type==='input'&&n.props.type==='text')!.props.onChange({currentTarget:{value:'Nghị quyết'}});
    all.find(n=>n.type==='input'&&n.props.type==='color')!.props.onChange({currentTarget:{value:'#128945'}});
    expect(f.onChange.mock.calls.map(call=>call[0])).toEqual([
      {reportVariant:'bars'},{emphasizeProgress:false},
      {titleAccentText:'Nghị quyết'},{titleAccentColor:'#128945'},
    ]);
    expect(f.onSave).not.toHaveBeenCalled();
  });
  it('saves and cancels only by explicit button actions',()=>{
    const f=fixture();const all=nodes(f.render());
    all.find(n=>n.type==='button'&&label(n)==='Lưu kiểu bảng')!.props.onClick();
    expect(f.onSave).toHaveBeenCalledOnce();
    all.find(n=>n.type==='button'&&label(n)==='Hủy kiểu bảng')!.props.onClick();
    expect(f.onCancel).toHaveBeenCalledOnce();
    const clean=fixture({dirty:false});
    const cleanActions=nodes(clean.render()).filter(n=>n.type==='button');
    expect(cleanActions.find(n=>label(n)==='Lưu kiểu bảng')?.props.disabled).toBe(true);
    expect(cleanActions.find(n=>label(n)==='Hủy kiểu bảng')?.props.disabled).toBe(true);
  });
  it('disables every mutation in saving state, leaving text accessible',()=>{
    const f=fixture({disabled:true});
    const tree=f.render(),all=nodes(tree);
    expect(label(tree)).toContain('Chỉnh ngay trên bảng');
    expect(all.filter(n=>n.type==='button').every(n=>n.props.disabled===true)).toBe(true);
    expect(f.onChange).not.toHaveBeenCalled();
  });
});
