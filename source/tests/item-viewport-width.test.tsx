import {describe,expect,it,vi} from 'vitest';
import {ItemColumnPanel} from '../src/features/items/ItemColumnPanel';
import {defaultItemLayout} from '../src/data/item-preferences';
const all=(node:any):any[]=>Array.isArray(node)?node.flatMap(all):node&&typeof node==='object'?[node,...all(node.props?.children)]:[];
const find=(tree:any,type:string,label:string)=>all(tree).find(n=>n.type===type&&(n.props?.['aria-label']===label||n.props?.htmlFor===label));
describe('live adjustable list viewport',()=>{
  it('typing 500 changes frame width immediately and preserves inside column width',()=>{
    const layout=defaultItemLayout();const onChange=vi.fn();
    const tree=ItemColumnPanel({layout,onChange});
    const input=find(tree,'input','Độ rộng vùng danh sách (px)');
    expect(input).toBeDefined();expect(input.props.value).toBe('');
    input.props.onChange({currentTarget:{value:'500'}});
    expect(onChange).toHaveBeenCalledWith({...layout,frameWidth:500});
    expect(onChange.mock.calls[0][0].tableWidth).toBe(1500);
  });
  it('auto checkbox restores responsive width and keeps the saved value independent',()=>{
    const layout={...defaultItemLayout(),frameWidth:500};const onChange=vi.fn();
    const tree=ItemColumnPanel({layout,onChange});
    const checkbox=all(tree).find(n=>n.type==='input'&&n.props.type==='checkbox'&&n.props.checked===false);
    expect(checkbox).toBeDefined();checkbox.props.onChange({currentTarget:{checked:true}});
    expect(onChange).toHaveBeenCalledWith({...layout,frameWidth:'auto'});
  });
});
