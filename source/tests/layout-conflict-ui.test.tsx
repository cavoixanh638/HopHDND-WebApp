import {describe,it,expect,vi} from 'vitest';
import {LayoutConflictResolver} from '../src/features/items/LayoutConflictResolver';
import type {LayoutFieldConflict} from '../src/data/item-layout-merge';
const inspect=(node:any):any[]=>Array.isArray(node)?node.flatMap(inspect):node&&typeof node==='object'?[node,...inspect(node.props?.children)]:[];
const conflicts:LayoutFieldConflict[]=[
 {id:'columns.isDropped.width',label:'độ rộng cột Trình / Rút',original:'130 px',local:'210 px',remote:'117 px'},
 {id:'frameWidth',label:'độ rộng vùng danh sách',original:'Tự động',local:'1500 px',remote:'500 px'},
];
describe('layout conflict resolution controls',()=>{
 it('shows precise differences and disables confirmation until every field is chosen',()=>{
   const onConfirm=vi.fn(),onChoose=vi.fn(),onCancel=vi.fn();
   const props={conflicts,choices:{'frameWidth':'local' as const},busy:false,onChoose,onConfirm,onCancel};
   const tree=LayoutConflictResolver(props);
   const nodes=inspect(tree);
   expect(nodes.filter(n=>n.type==='fieldset')).toHaveLength(2);
   const submit=nodes.find(n=>n.type==='button'&&n.props.className==='button primary');
   expect(submit.props.disabled).toBe(true);
   expect(nodes.map(n=>n.props?.children).flat().filter(v=>typeof v==='string').join(' ')).toContain('130 px');
   const mine=nodes.find(n=>n.type==='input'&&n.props.name==='conflict-columns.isDropped.width'&&n.props.value==='local');
   mine.props.onChange();
   expect(onChoose).toHaveBeenCalledWith('columns.isDropped.width','local');
   expect(onConfirm).not.toHaveBeenCalled();
   const completed=LayoutConflictResolver({...props,choices:{'frameWidth':'remote','columns.isDropped.width':'local'}});
   const ready=inspect(completed).find(n=>n.type==='button'&&n.props.className==='button primary');
   expect(ready.props.disabled).toBe(false);
   ready.props.onClick();expect(onConfirm).toHaveBeenCalledOnce();
 });
});
