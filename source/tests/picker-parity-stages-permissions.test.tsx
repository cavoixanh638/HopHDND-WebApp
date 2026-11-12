import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import type {CompactPair} from '../src/features/items/compact-columns';
import {createDemoItems} from '../src/data/demo-items';
import type {TextField} from '../shared/types';

const pair:CompactPair={
 anchor:'partyLevel',hidden:'progressParty',
 hiddenFields:['progressParty','progressBuild','progressCouncil'],
 memberFields:['partyLevel','progressParty','progressBuild','progressCouncil'],
 tags:['Cấp','Thành ủy','Xây dựng NQ','Ban hành NQ'],label:'Tiến độ 3 khâu',
 extraWidth:130,variant:'partyTogether'
};
const data=createDemoItems(5);
const render=(index:number,grants:TextField[])=>{
 const item=data[index];
 return renderToStaticMarkup(<CompactGroupedValue item={item} pair={pair}
  field={key=><span data-synthetic-field={key}>{item[key]}</span>}
  editable={key=>grants.includes(key)} tone={()=>undefined}/>);
};

describe('STAGES baseline DOM permission and Không guards',()=>{
 it('forces progressParty inert under partyLevel Không despite an explicit status grant',()=>{
  const html=render(4,['progressParty','progressBuild','progressCouncil']);
  expect(html).toContain('data-level-layout="readonly"');
  expect(html).toContain('data-level-not-required="true"');
  expect(html).not.toContain('data-editable="true" data-progress-tone="neutral"');
  expect(html).toContain('Không phải trình');
  expect(html).not.toContain('data-synthetic-field="progressParty"');
  expect(html).toContain('data-ui-reference-part="progressBuild"');
  expect(html).toContain('data-ui-reference-part="progressCouncil"');
 });
 it('keeps editable level as third rail independently from progress permissions',()=>{
  const html=render(0,['partyLevel','progressCouncil']);
  expect(html).toContain('data-level-layout="editable"');
  expect(html).toContain('data-level-editor="true"');
  expect(html).toContain('data-stage-field="progressParty"');
  expect(html).toContain('data-stage-field="progressCouncil"');
  expect(html).toContain('data-ui-reference-part="progressCouncil"');
  expect(html).toContain('data-editable="true"');
 });
 it('keeps readonly level in parentheses and no artificial level editor',()=>{
  const html=render(0,[]);
  expect(html).toContain('data-level-layout="readonly"');
  expect(html).toContain('compact-stage-level-open');
  expect(html).toContain('compact-stage-level-close');
  expect(html).not.toContain('data-level-editor="true"');
  expect(html).not.toContain('data-editable="true"');
 });
});
