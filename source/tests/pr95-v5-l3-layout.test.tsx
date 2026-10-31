import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Item,TextField} from '../shared/types';
import {createDemoItems} from '../src/data/demo-items';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {CellPicker} from '../src/features/items/CellPicker';
import {defaultItemLayout} from '../src/data/item-preferences';
import {activeCompactPairs} from '../src/features/items/compact-columns';

const css=readFileSync(new URL('../src/features/items/item-frame.css',import.meta.url),'utf8');
const cols=defaultItemLayout().columns;
const groups=activeCompactPairs(cols,{
  typeInContent:false,contentDetails:true,partyTogether:true,councilTogether:true,
  leadersTogether:false,teamTogether:false,roomSpecialist:false,
  shortLeaders:false,shortSpecialist:false,cvRoomInline:false
});
const doc=groups.find(pair=>pair.variant==='contentDetails')!;
const party=groups.find(pair=>pair.variant==='partyTogether')!;
const seed=createDemoItems(1)[0]!;
const fixture={...seed,type:'QPPL',partyLevel:'BTV TU',
  progressParty:'Đã xin ý kiến, chờ TBKL',
  progressBuild:'Đã trình, chờ QĐ',
  progressCouncil:'VP đang xử lý'} as Item;
const draw=(pair:typeof doc,grants:TextField[],item:Item=fixture)=>
  renderToStaticMarkup(createElement(CompactGroupedValue,{
    item,pair,tone:(k:TextField)=>k==='progressBuild'?'office':'neutral',
    editable:(k:TextField)=>grants.includes(k),
    field:(k:TextField)=>grants.includes(k)?
      createElement(CellPicker,{field:k,recordId:item.recordId,
        label:'NQ02: '+k,value:String(item[k]??''),options:[String(item[k]??'')],
        onChange:()=>{}}):String(item[k]??''),
    highlight:(k:TextField)=>k==='progressBuild'?
      {backgroundColor:'#FDE8B8',color:'#875000'}:undefined
  }));
describe('PR95 UI V5 L3 — layout-only contract',()=>{
  it('classification has one badge owner regardless of type field editor',()=>{
    const edit=draw(doc,['type']);
    const view=draw(doc,[]);
    for(const html of [edit,view]){
      expect(html).toContain('class="compact-document-badge"');
      expect(html).toContain('data-kind="QPPL"');
    }
    expect(edit).toMatch(/compact-document-badge[^>]*>[\s\S]*?button[^>]*cell-picker-trigger/);
    expect(view).not.toContain('cell-picker-trigger');
    expect(css).toContain('.compact-document-badge > button.cell-picker-trigger');
    expect(css).toContain('border:0!important');
    expect(css).toContain('background:transparent!important');
  });
  it('keeps the exact party level visible on one semantic title line, without joining editors',()=>{
    for(const level of ['BCH','TTTU','BTV TU']){
      const html=draw(party,['partyLevel','progressBuild'],{...fixture,partyLevel:level});
      expect(html).toContain('class="compact-stage-title"');
      expect(html).toContain('class="compact-stage-level"');
      expect(html).toContain(level);
      expect(html).toContain('aria-label="NQ02: partyLevel"');
      expect(html).toContain('aria-label="NQ02: progressBuild"');
      expect(html).not.toContain('aria-label="NQ02: progressParty"');
      expect(html.match(/class="compact-stage-row"/g)).toHaveLength(3);
    }
  });
  it('keeps default and legacy long status values and raw IDs untouched',()=>{
    for(const partyLevel of ['Ban Chấp hành','BTV TU']){
      const html=draw(party,[],{...fixture,partyLevel,progressBuild:'Đã trình HĐND, chưa có QĐ'});
      expect(html).toContain(partyLevel);
      expect(html).toContain('Đã trình HĐND, chưa có QĐ');
      expect(html).not.toContain('cell-picker-trigger');
    }
  });
  it('retains one framed row, caret rail, rounded edit value and internal narrow scrolling',()=>{
    expect(css).toContain('min-width:310px');
    expect(css).toContain('overflow-x:auto');
    expect(css).toContain('grid-template-columns:max-content minmax(138px,1fr)');
    expect(css).toContain('border-radius:7px!important');
    expect(css).toContain('border-radius:0 7px 7px 0');
    expect(css).toContain('padding-top:5px');
    expect(css).toContain('white-space:nowrap');
    expect(css).toContain('--v4-caret-track:22px');
    expect(css).toContain('border:1px solid var(--stage-border)');
    expect(css).not.toContain('.compact-stage-row[role="button"]');
  });
  it('does not change owner scope or permissions by passing through another group',()=>{
    const html=draw(party,['progressCouncil']);
    expect(html.match(/data-editable="true"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="NQ02: progressCouncil"');
    expect(html).not.toContain('aria-label="NQ02: progressBuild"');
    expect(html).not.toContain('aria-label="NQ02: partyLevel"');
  });
});
