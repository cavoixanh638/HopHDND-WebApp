import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Item,TextField} from '../shared/types';
import {createDemoItems} from '../src/data/demo-items';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {CellPicker,cellPickerCanClear} from '../src/features/items/CellPicker';
import {activeCompactPairs,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {defaultItemLayout} from '../src/data/item-preferences';

const css=readFileSync(new URL('../src/features/items/item-frame.css',import.meta.url),'utf8');
const pickerCss=readFileSync(new URL('../src/features/items/cell-picker.css',import.meta.url),'utf8');
const pickerSource=readFileSync(new URL('../src/features/items/CellPicker.tsx',import.meta.url),'utf8');
const group=activeCompactPairs(defaultItemLayout().columns,DEFAULT_COMPACT_DISPLAY)
  .find(x=>x.variant==='partyTogether')!;

const fixture={...createDemoItems(1)[0],partyLevel:'Ban Chấp hành',
  progressParty:'ĐU gửi TU, chưa họp',progressBuild:'VP đang thực hiện',
  progressCouncil:'Hoàn thành'} as Item;

const draw=(granted:readonly TextField[],record:Item=fixture)=>
  renderToStaticMarkup(createElement(CompactGroupedValue,{
    item:record,pair:group,
    editable:(key:TextField)=>granted.includes(key),
    tone:(key:TextField)=>key==='progressParty'?'not-submitted':
      key==='progressBuild'?'office':key==='progressCouncil'?'done':undefined,
    field:(key:TextField)=>granted.includes(key)?
      createElement(CellPicker,{field:key,recordId:record.recordId,
        label:'NQ02: '+key,value:String(record[key]??''),options:[
          'Không phải trình','Sở chưa trình','VP đang xử lý','Đã trình, chờ QĐ',
          'Đã có QĐ','Hoàn thành'
        ],onChange:()=>{}}):String(record[key]??''),
    highlight:(key:TextField)=>key==='progressBuild'?
      {backgroundColor:'#FCDDA0',color:'#884422'}:undefined
  }));

describe('UI V4 L2 source protections retained by REV2 standard L03 controls',()=>{
  it('marks only individually granted status members, not the group/nearby party-level editor',()=>{
    const html=draw(['progressBuild']);
    expect(html.match(/class="compact-stage-row"/g)).toHaveLength(3);
    expect(html.match(/data-editable="true"/g)).toHaveLength(1);
    expect(html.match(/class="cell-value-button cell-picker-trigger"/g)).toHaveLength(1);
    expect(html).toMatch(/data-stage-field="progressBuild"[\s\S]*?class="compact-stage-state"[^>]*data-editable="true"/);
    expect(html).not.toContain('aria-label="NQ02: partyLevel"');
    expect(html).not.toContain('aria-label="NQ02: progressParty"');
    expect(html).not.toContain('aria-label="NQ02: progressCouncil"');
  });
  it('never creates a false caret or click target in read-only List/Report sources',()=>{
    const html=draw([]);
    expect(html).not.toContain('cell-picker-trigger');
    expect(html).not.toContain('data-editable="true"');
    expect(html).not.toContain('aria-haspopup');
    expect(html).toContain('BCH');
    expect(html).not.toContain('Ban Chấp hành');
    expect(html).toContain('ĐU gửi TU, chưa họp');
  });
  it('supports old long labels and new canonical labels with the same hit-region structure',()=>{
    const old=draw(['progressParty','progressBuild','progressCouncil']);
    const canonical=draw(['progressParty','progressBuild','progressCouncil'],{
      ...fixture,partyLevel:'BCH',progressParty:'Đã xin ý kiến, chờ TBKL',
      progressBuild:'Đã trình, chờ QĐ',progressCouncil:'VP đang xử lý'
    });
    for(const html of [old,canonical]){
      expect(html.match(/class="cell-value-button cell-picker-trigger"/g)).toHaveLength(3);
      expect(html.match(/class="cell-picker-value-text"/g)).toHaveLength(3);
      expect(html.match(/data-editable="true"/g)).toHaveLength(3);
      expect(html).toContain('aria-expanded="false"');
      expect(html).not.toContain('cell-picker-popover');
    }
    expect(canonical).toContain('Đã xin ý kiến, chờ TBKL');
    expect(canonical).toContain('Đã trình, chờ QĐ');
  });
  it('keeps independently accessible full-width 36px buttons in the common grid track',()=>{
    expect(css).toContain('.compact-stages[data-rev2="true"]');
    expect(css).toContain('min-height:36px!important;height:auto!important');
    expect(css).toContain('grid-template-columns:var(--ui-stage-label-track) var(--ui-stage-level-track) var(--ui-stage-status-track)!important');
    expect(css).toContain('grid-template-columns:var(--ui-stage-label-track) var(--ui-stage-status-track)!important');
    expect(css).toContain('width:min(100%,var(--hdnd-l03-inner-width,100%));');
    expect(css).toContain('grid-template-columns:subgrid!important');
    expect(css).toContain('.compact-stage-state[data-editable="true"] button.cell-picker-trigger');
    expect(css).not.toContain('.compact-stage-row[role="button"]');
    expect(pickerCss).toContain('.cell-picker-value-text');
  });
  it('removes status dots while preserving three distinct workflow rows',()=>{
    expect(css).toMatch(/\.compact-stage-state\[data-progress-tone\]::before\s*\{[^}]*content:none;display:none;/s);
    expect(css).toContain('.compact-stage-state .workflow-status-value::before');
    expect(css).toContain('content:none!important;display:none!important;');
    const html=draw([]);
    expect(html.match(/class="compact-stage-row"/g)).toHaveLength(3);
    expect(html).toContain('Thành ủy');
    expect(html).toContain('Trình Xây dựng NQ');
    expect(html).toContain('Trình ban hành NQ');
  });
  it('preserves custom member highlight and semantic fill on the standard editable button',()=>{
    const html=draw(['progressBuild']);
    expect(html).toContain('background-color:#FCDDA0');
    expect(html).toContain('--member-highlight-text:#884422');
    expect(html).not.toMatch(/class="compact-stage-row"[^>]*style=/);
    expect(css).toContain('--ui-picker-bg:var(--workflow-bg,#F2F6F9);');
    expect(css).toContain('background:var(--ui-picker-bg,#F2F6F9)!important');
    expect(css).toContain('--ui-picker-fg:var(--workflow-text,#426274);');
    expect(css).toContain('color:var(--ui-picker-fg,#426274)!important');
    expect(css).toContain('background:var(--member-highlight-bg)!important');
    expect(css).toContain('color:var(--member-highlight-text)!important');
    expect(css).toMatch(/button\.cell-picker-trigger::before\{\s*content:none!important;display:none!important;/s);
    expect(css).toContain('border:0;border-right:1.8px solid currentColor');
    expect(css).toContain('background:transparent!important');
    expect(css).toContain('outline:2px solid #356D86!important');
  });
  it('retains unchanged CellPicker aria, keyboard, lease/save/clear contracts',()=>{
    for(const source of ["aria-haspopup=\"dialog\"","aria-selected={value === option.value}",
      "event.key === 'ArrowDown'","event.key === 'Escape'","leaseManager!.acquire",
      'onChange(nextValue)']){
      expect(pickerSource).toContain(source);
    }
    expect(cellPickerCanClear('vpLeader',['PCVP A'])).toBe(true);
    expect(cellPickerCanClear('ubndLeader',['PCT B'])).toBe(true);
    expect(cellPickerCanClear('progressBuild',['','VP đang xử lý'])).toBe(false);
    expect(cellPickerCanClear('progressCouncil',['','Hoàn thành'])).toBe(false);
  });
});
