import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {activeCompactPairs,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import type {TextField} from '../shared/types';

const pair=activeCompactPairs(defaultItemLayout().columns,DEFAULT_COMPACT_DISPLAY)
 .find(p=>p.variant==='contentDetails')!;
const original={...createDemoItems(1)[0],department:'Sở Kế hoạch và Đầu tư',
 type:'QPPL',content:'Dự thảo văn bản'};
const render=(department:boolean,type:boolean,empty=false)=>{
 const item={...original,department:empty?'':original.department,type:empty?'':original.type};
 return renderToStaticMarkup(createElement(CompactGroupedValue,{
  item,pair,tone:()=>undefined,
  editable:(key:TextField)=>key==='department'?department:key==='type'?type:false,
  field:(key:TextField)=>key==='department'||key==='type'
   ?(key==='department'?department:type)
      ?createElement('button',{className:'cell-picker-trigger'},item[key]||'Chọn')
      :item[key]:item[key]
 }));
};
describe('CONTENT L01 independent field permissions and semantics',()=>{
 it('editable department/type each remains an actual picker without punctuation',()=>{
  const html=render(true,true);
  expect((html.match(/class="cell-picker-trigger"/g)||[])).toHaveLength(2);
  expect(html).toContain('data-metadata-mode="editable"');
  expect(html).not.toContain('compact-document-meta-mark');
  expect(html).not.toContain('compact-document-meta-separator');
  expect(html).toContain('data-ui-picker-skin="standard"');
  expect(html.indexOf('data-ui-reference-part="type"')).toBeLessThan(html.indexOf('data-ui-reference-part="department"'));
 });
 it('mixed authority retains a plain sibling and no false caret',()=>{
  for(const [d,t] of [[true,false],[false,true]]){
   const html=render(d,t);
   expect((html.match(/class="cell-picker-trigger"/g)||[])).toHaveLength(1);
   expect(html).toContain('data-metadata-mode="editable"');
   expect(html).not.toContain('compact-document-meta-separator');
   expect(html).not.toContain('compact-document-meta-mark');
   expect(html.indexOf('data-ui-reference-part="type"')).toBeLessThan(html.indexOf('data-ui-reference-part="department"'));
  }
 });
 it('both readonly preserve parentheses, separator and individual type token',()=>{
  const html=render(false,false);
  expect(html).toContain('data-metadata-mode="readonly"');
  expect(html).toContain('compact-document-meta-mark');
  expect(html).toContain('compact-document-meta-separator');
  expect(html).toContain('data-kind="QPPL"');
  expect(html).not.toContain('cell-picker-trigger');
  expect(html.indexOf('data-ui-reference-part="type"')).toBeLessThan(html.indexOf('data-ui-reference-part="department"'));
 });
 it('empty editable members remain individually reachable',()=>{
  const html=render(true,true,true);
  expect((html.match(/class="cell-picker-trigger"/g)||[])).toHaveLength(2);
  expect(html).toContain('data-ui-reference-part="department"');
  expect(html).toContain('data-ui-reference-part="type"');
 });
 it('empty readonly metadata does not create phantom brackets',()=>{
  const html=render(false,false,true);
  expect(html).not.toContain('compact-document-heading');
  expect(html).not.toContain('compact-document-meta-mark');
 });
});
