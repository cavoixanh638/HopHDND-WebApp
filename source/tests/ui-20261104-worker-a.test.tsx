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
    tone={key=>key==='progressCouncil'?'done':key==='progressParty'?'office':'neutral'}
    highlight={key=>key===highlightKey?{backgroundColor:'#FDE8B8',color:'#875000'}:undefined}
    field={key=>grants.includes(key)?<CellPicker field={key} recordId={item.recordId}
      label={'NQ01 '+key} value={String(item[key]??'')} options={[String(item[key]??'')]}
      onChange={()=>{}}/>:String(item[key]??'')}/>);
const plain=(html:string)=>html.replace(/<[^>]*>/g,'').replace(/<!--\s*-->/g,'');
const count=(html:string,needle:string)=>html.split(needle).length-1;

describe('Worker A REV2 — L01 source metadata',()=>{
 it('read-only retains approved source-driven parentheses/hyphen and quiet type',()=>{
   const html=render(doc,fixture);
   expect(plain(html)).toContain(fixture.content+'(Sở Nông nghiệp và Môi trường - HC)');
   expect(html).toContain('data-metadata-mode="readonly"');
   expect(html).not.toContain('cell-picker-trigger');
 });
 it.each([
   [{department:'',type:'HC'},'(HC)'],
   [{department:'Sở Mẫu',type:''},'(Sở Mẫu)'],
   [{department:'',type:''},''],
   [{department:'Sở rất dài '.repeat(16),type:'Báo cáo'},'(Sở rất dài ']
 ])('only nonempty read-only fields get punctuation: %j',(values,expected)=>{
   const html=render(doc,{...fixture,...values});
   if(expected)expect(plain(html)).toContain(expected);
   else expect(html).not.toContain('compact-document-heading');
   if(!values.department||!values.type)expect(html).not.toContain('compact-document-meta-separator');
 });
 it.each([
   {grants:['department'] as TextField[],typeButtons:0,departmentButtons:1},
   {grants:['type'] as TextField[],typeButtons:1,departmentButtons:0},
   {grants:['department','type'] as TextField[],typeButtons:1,departmentButtons:1},
 ])('editable metadata becomes a pair on ONE rail without punctuation: $grants',(testCase)=>{
   const html=render(doc,fixture,testCase.grants,'type');
   expect(html).toContain('data-metadata-mode="editable"');
   expect(html).not.toContain('compact-document-meta-mark');
   expect(html).not.toContain('compact-document-meta-separator');
   expect(html).toContain('Sở Nông nghiệp và Môi trường');
   expect(html).toContain('HC');
   expect(count(html,'aria-haspopup="dialog"')).toBe(testCase.typeButtons+testCase.departmentButtons);
   expect(html.includes('aria-label="NQ01 department"')).toBe(Boolean(testCase.departmentButtons));
   expect(html.includes('aria-label="NQ01 type"')).toBe(Boolean(testCase.typeButtons));
   expect(html).toContain('data-highlighted="true"');
 });
 it('keeps blank editable fields reachable, no source mutation, and no fake readonly editor',()=>{
   const item={...fixture,department:'',type:''};
   const one=render(doc,item,['department']);
   expect(one).toContain('aria-label="NQ01 department"');
   expect(one).not.toContain('aria-label="NQ01 type"');
   const both=render(doc,item,['department','type']);
   expect(count(both,'aria-haspopup="dialog"')).toBe(2);
   expect(both).not.toContain('compact-document-meta-mark');
   expect(item.department).toBe('');expect(item.type).toBe('');
 });
 it('locks the two editable members to a single non-wrapping row, no page-wide overflow',()=>{
   expect(css).toContain('.compact-document-heading[data-metadata-mode="editable"]');
   expect(css).toContain('display:flex;flex-flow:row nowrap;align-items:center;gap:8px');
   expect(css).toContain('overflow-x:auto;overflow-y:hidden');
   expect(css).toContain('--ui-picker-bg:var(--type-bg,#F1F5F9);');
   expect(css).toContain('background:var(--ui-picker-bg,#F2F6F9)!important');
   expect(css).toContain('outline:2px solid #356D86!important');
 });
});

describe('Worker A REV2 — L03 permission drives entire group geometry',()=>{
 it('level editable: three tracks, exact captions, ONLY first row has own level picker',()=>{
   const html=render(stages,fixture,['partyLevel','progressParty','progressBuild','progressCouncil']);
   expect(html).toContain('data-level-layout="editable"');
   expect(count(html,'class="compact-stage-row"')).toBe(3);
   expect(plain(html)).toContain('Trình Xây dựng NQ');
   expect(plain(html)).toContain('Trình ban hành NQ');
   expect(html).toContain('data-level-editor="true"');
   expect(html).not.toContain('compact-stage-level-open');
   expect(html).not.toContain('compact-stage-level-close');
   expect(html).toContain('aria-label="NQ01 partyLevel"');
   expect(count(html,'aria-haspopup="dialog"')).toBe(4);
 });
 it('level readonly: two tracks, caption keeps real value, no fake level picker',()=>{
   const html=render(stages,fixture,['progressBuild']);
   expect(html).toContain('data-level-layout="readonly"');
   expect(plain(html)).toContain('Thành ủy (BTV)VP đang xử lý');
   expect(fixture.partyLevel).toBe('BTV TU'); // render-only alias, never writes source
   expect(html).not.toContain('data-level-editor="true"');
   expect(html).not.toContain('aria-label="NQ01 partyLevel"');
   expect(html).toContain('aria-label="NQ01 progressBuild"');
   expect(html).not.toContain('aria-label="NQ01 progressParty"');
 });
 it('readonly level Không phải trình is hidden, source progress remains independent',()=>{
   const item={...fixture,partyLevel:'Không phải trình',progressParty:'Không phải trình'};
   const html=render(stages,item,['progressParty']);
   expect(html).toContain('data-level-not-required="true"');
   expect(html).not.toContain('compact-stage-level-open');
   expect(html).not.toContain('compact-stage-level-close');
   expect(plain(html)).toContain('Thành ủyKhông phải trình');
   expect(html).toContain('data-progress-tone="neutral"');
   expect(item.partyLevel).toBe('Không phải trình');
 });
 it.each([
   {grants:['partyLevel'] as TextField[],layout:'editable',n:1},
   {grants:['progressParty'] as TextField[],layout:'readonly',n:1},
   {grants:['partyLevel','progressCouncil'] as TextField[],layout:'editable',n:2},
   {grants:['progressParty','progressBuild'] as TextField[],layout:'readonly',n:2}
 ])('mixed edit grants never inherit permission: $grants',({grants,layout,n})=>{
   const html=render(stages,fixture,grants,'progressCouncil');
   expect(html).toContain('data-level-layout="'+layout+'"');
   expect(count(html,'aria-haspopup="dialog"')).toBe(n);
   expect(html).toContain('data-highlighted="true"');
   expect(html).toContain('--member-highlight-bg');
 });
 it('uses standard dropdown frame, semantic background/ink and no shaded caret rail',()=>{
   expect(css).toContain('.compact-stages[data-rev2="true"]');
   expect(css).toContain('grid-template-columns:var(--ui-stage-label-track) var(--ui-stage-level-track) var(--ui-stage-status-track)!important');
   expect(css).toContain('grid-template-columns:var(--ui-stage-label-track) var(--ui-stage-status-track)!important');
   expect(css).toContain('min-height:36px!important;height:auto!important');
   expect(css).toContain('--ui-picker-bg:var(--workflow-bg,#F2F6F9);');
   expect(css).toContain('background:var(--ui-picker-bg,#F2F6F9)!important');
   expect(css).toContain('--ui-picker-fg:var(--workflow-text,#426274);');
   expect(css).toContain('color:var(--ui-picker-fg,#426274)!important');
   expect(css).toMatch(/button\.cell-picker-trigger::before\{\s*content:none!important;display:none!important;/s);
   expect(css).toContain('border:0;border-right:1.8px solid currentColor');
   expect(css).toContain('background:transparent!important');
   expect(css).toContain('grid-template-columns:subgrid!important');
   expect(css).toContain('overflow-x:auto;overflow-y:hidden');
 });
});
