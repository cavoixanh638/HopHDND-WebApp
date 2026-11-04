import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Item,TextField} from '../shared/types';
import {createDemoItems} from '../src/data/demo-items';
import {defaultItemLayout} from '../src/data/item-preferences';
import {activeCompactPairs,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {CellPicker} from '../src/features/items/CellPicker';

const css=readFileSync(new URL('../src/features/items/item-frame.css',import.meta.url),'utf8');
const pairs=activeCompactPairs(defaultItemLayout().columns,DEFAULT_COMPACT_DISPLAY);
const doc=pairs.find(pair=>pair.variant==='contentDetails')!;
const stages=pairs.find(pair=>pair.variant==='partyTogether')!;
const seed=createDemoItems(1)[0]!;
const fixture:Item={...seed,department:'Sở Nông nghiệp và Môi trường',
  type:'HC',partyLevel:'BTV TU',progressParty:'VP đang xử lý',
  progressBuild:'Đã trình, chờ QĐ',progressCouncil:'Hoàn thành'};
const render=(pair:typeof doc,item:Item,grants:TextField[]=[],highlightKey?:TextField)=>
  renderToStaticMarkup(<CompactGroupedValue item={item} pair={pair}
    editable={key=>grants.includes(key)}
    tone={key=>key==='progressCouncil'?'done':undefined}
    highlight={key=>key===highlightKey?{backgroundColor:'#FDE8B8',color:'#875000'}:undefined}
    field={key=>grants.includes(key)?<CellPicker field={key} recordId={item.recordId}
      label={'NQ01 '+key} value={String(item[key]??'')} options={[String(item[key]??'')]}
      onChange={()=>{}}/>:String(item[key]??'')}/>);
const plain=(html:string)=>html.replace(/<[^>]*>/g,'').replace(/<!--\s*-->/g,'');

describe('Worker A — source metadata, not a second visual badge',()=>{
 it('puts populated Sở and Loại VB after content with parentheses and a single hyphen',()=>{
   const html=render(doc,fixture);
   expect(plain(html)).toContain(fixture.content+'(Sở Nông nghiệp và Môi trường - HC)');
   expect(html).toContain('data-source-metadata="true"');
   expect(html).not.toContain('cell-picker-trigger');
 });
 it.each([
   [{department:'',type:'HC'},'(HC)'],
   [{department:'Sở Mẫu',type:''},'(Sở Mẫu)'],
   [{department:'',type:''},''],
   [{department:'Sở rất dài '.repeat(16),type:'Báo cáo'},'(Sở rất dài ']
 ])('keeps optional metadata punctuation for %j',(values,expected)=>{
   const item={...fixture,...values};
   const html=render(doc,item);
   if(expected)expect(plain(html)).toContain(expected);
   else expect(html).not.toContain('compact-document-heading');
   if(!item.department||!item.type)expect(html).not.toContain('compact-document-meta-separator');
 });
 it('preserves separate editor/accessibility per source member, even with an empty field',()=>{
   const html=render(doc,{...fixture,department:''},['department','type'],'type');
   expect(html.match(/class="cell-value-button cell-picker-trigger"/g)).toHaveLength(2);
   expect(html).toContain('aria-label="NQ01 department"');
   expect(html).toContain('aria-label="NQ01 type"');
   expect(html).toContain('data-highlighted="true"');
   expect(html).not.toContain('compact-document-meta-separator');
 });
});

describe('Worker A — aligned three-stage L03 with source-based permission',()=>{
 it('gives the writable level and status independent accessible buttons and tracks',()=>{
   const html=render(stages,fixture,['partyLevel','progressParty']);
   expect(html.match(/class="compact-stage-row"/g)).toHaveLength(3);
   expect(html).toContain('data-level-editable="true"');
   expect(html).toContain('data-level-editor="true"');
   expect(html).toContain('aria-label="NQ01 partyLevel"');
   expect(html).toContain('aria-label="NQ01 progressParty"');
   expect(html).not.toContain('aria-label="NQ01 progressBuild"');
   expect(html.match(/class="cell-value-button cell-picker-trigger"/g)).toHaveLength(2);
 });
 it('renders the entire readonly caption in the first two tracks, without fake controls',()=>{
   const html=render(stages,fixture);
   expect(plain(html)).toContain('Thành ủy (BTV TU)VP đang xử lý');
   expect(html).not.toContain('data-level-editor="true"');
   expect(html).not.toContain('cell-picker-trigger');
 });
 it('omits only redundant non-required readonly level; progress is still visible',()=>{
   const item={...fixture,partyLevel:'Không phải trình',progressParty:'Không phải trình'};
   const html=render(stages,item);
   expect(html).toContain('data-level-not-required="true"');
   expect(html).not.toContain('compact-stage-level-open');
   expect(plain(html)).toContain('Thành ủyKhông phải trình');
   expect(html).toContain('data-progress-tone="neutral"');
   expect(item.partyLevel).toBe('Không phải trình');
 });
 it('does not infer progress permission from party level or vice versa',()=>{
   const level=render(stages,fixture,['partyLevel']);
   const state=render(stages,fixture,['progressParty']);
   expect(level).toContain('data-level-editor="true"');
   expect(level).not.toContain('aria-label="NQ01 progressParty"');
   expect(state).not.toContain('data-level-editor="true"');
   expect(state).toContain('aria-label="NQ01 progressParty"');
 });
 it('uses subgrid and never collapses stage rows on narrow mobile/container widths',()=>{
   expect(css).toContain('grid-template-columns:max-content max-content minmax(166px,1fr)');
   expect(css).toContain('grid-column:1 / 3');
   expect(css).toContain('grid-column:3;margin-left:0!important');
   expect(css).toContain('grid-template-columns:subgrid');
   expect(css).toContain('overflow-x:auto');
   expect(css).toContain('outline:2px solid #356C8B!important');
 });
});
