import {describe,expect,it,vi} from 'vitest';
import {ItemColumnPanel} from '../src/features/items/ItemColumnPanel';
import {DeferredWidthInput,parseCommittedWidth} from '../src/features/items/DeferredWidthInput';
import {defaultItemLayout} from '../src/data/item-preferences';
const all=(node:any):any[]=>Array.isArray(node)?node.flatMap(all):node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
const numeric=(tree:any,label:string)=>all(tree).find(n=>n.type===DeferredWidthInput&&n.props?.label===label);
describe('deferred, validated list widths',()=>{
  it('keeps 500px frame independent from the width of the inner columns',()=>{
    const layout=defaultItemLayout(),onChange=vi.fn();
    const tree=ItemColumnPanel({layout,onChange});
    const input=numeric(tree,'Độ rộng trang Danh sách dữ liệu (px)');
    expect(input).toBeDefined();expect(input.props.value).toBe(1920);
    expect(onChange).not.toHaveBeenCalled();
    input.props.onCommit(500);
    expect(onChange).toHaveBeenCalledWith({...layout,frameWidth:500});
    expect(onChange.mock.calls[0][0].tableWidth).toBe(1500);
  });
  it('restores auto width with the checkbox without overwriting internal column widths',()=>{
    const layout={...defaultItemLayout(),frameWidth:500},onChange=vi.fn();
    const tree=ItemColumnPanel({layout,onChange});
    const checkbox=all(tree).find(n=>n.type==='input'&&n.props.type==='checkbox'&&n.props.checked===false);
    expect(checkbox).toBeDefined();
    checkbox.props.onChange({currentTarget:{checked:true}});
    expect(onChange).toHaveBeenCalledWith({...layout,frameWidth:'auto'});
  });
  it('renders dimension validation next to the width controls, not under the data table',()=>{
    const issue='Độ rộng tối thiểu phần cột bên trong cần từ 500 đến 6000 px.';
    const tree=ItemColumnPanel({layout:defaultItemLayout(),onChange:vi.fn(),validationMessage:issue});
    const alert=all(tree).find(n=>n.type==='div'&&n.props.className==='layout-inline-error');
    expect(alert?.props.role).toBe('alert');
    expect(JSON.stringify(alert)).toContain(issue);
    expect(all(tree).some(n=>n.type==='details'&&n.props.className==='item-layout-advanced')).toBe(true);
  });
  it('does not propagate 0, empty or partial numeric inputs to a saved layout',()=>{
    expect(parseCommittedWidth('',320,6000)).toBeNull();
    expect(parseCommittedWidth('0',320,6000)).toBeNull();
    expect(parseCommittedWidth('1.',320,6000)).toBeNull();
    expect(parseCommittedWidth('-30',320,6000)).toBeNull();
    expect(parseCommittedWidth('319',320,6000)).toBeNull();
    expect(parseCommittedWidth('6001',320,6000)).toBeNull();
    expect(parseCommittedWidth('500',320,6000)).toBe(500);
    expect(parseCommittedWidth('1500',320,6000)).toBe(1500);
    expect(parseCommittedWidth('500',500,6000)).toBe(500);
    expect(parseCommittedWidth('60',60,1600)).toBe(60);
  });
  it('defers changes for the advanced inner width and individual columns too',()=>{
    const layout={...defaultItemLayout(),tableWidth:500};
    const onChange=vi.fn(),tree=ItemColumnPanel({layout,onChange});
    const table=numeric(tree,'Độ rộng tối thiểu các cột (px)');
    expect(table.props.value).toBe(500);
    table.props.onCommit(1500);
    expect(onChange).toHaveBeenCalledWith({...layout,tableWidth:1500});
    const id=numeric(tree,'Độ rộng cột ID (px)');
    id.props.onCommit(200);
    expect(onChange).toHaveBeenLastCalledWith({...layout,columns:layout.columns.map((c,i)=>i===0?{...c,width:200}:c)});
  });
});
