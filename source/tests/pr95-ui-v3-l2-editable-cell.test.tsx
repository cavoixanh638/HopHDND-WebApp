import {readFileSync} from 'node:fs';
import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {CellPicker,cellPickerCanClear} from '../src/features/items/CellPicker';
import {activeCompactPairs,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {defaultItemLayout} from '../src/data/item-preferences';
import {createDemoItems} from '../src/data/demo-items';
import type {Item,TextField} from '../shared/types';

const css=readFileSync(new URL('../src/features/items/item-frame.css',import.meta.url),'utf8');
const pickerSource=readFileSync(new URL('../src/features/items/CellPicker.tsx',import.meta.url),'utf8');
const item:Item={...createDemoItems(1)[0],displayCode:'NQ02',
  partyLevel:'BTV',progressParty:'Sở chưa trình',
  progressBuild:'VP đang thực hiện',progressCouncil:'Đã trình HĐND'};
const pair=activeCompactPairs(defaultItemLayout().columns,DEFAULT_COMPACT_DISPLAY)
  .find(entry=>entry.variant==='partyTogether')!;
const statusTone=(key:TextField)=>key==='progressParty'?'not-submitted':
  key==='progressBuild'?'office':key==='progressCouncil'?'done':undefined;

const stageHtml=(granted:readonly TextField[]=[],highlighted?:TextField)=>
  renderToStaticMarkup(createElement(CompactGroupedValue,{
    item,pair,tone:statusTone,
    editable:(key:TextField)=>granted.includes(key),
    field:(key:TextField)=>granted.includes(key)
      ?createElement(CellPicker,{
        label:key+' · NQ02',value:String(item[key]??''),
        options:[String(item[key]??''),'Sở chưa trình','Hoàn thành'],
        onChange:()=>{}
      })
      :String(item[key]??''),
    highlight:(key:TextField)=>key===highlighted?
      {color:'#111111',backgroundColor:'#FFEE55'}:undefined
  }));

describe('PR95 UI V3 L2 single-frame grouped editors',()=>{
  it('shows no false dropdown arrow or clickable editor when all source cells are read-only',()=>{
    const html=stageHtml();
    expect(html.match(/data-stage-field="progress(?:Party|Build|Council)"/g)).toHaveLength(3);
    expect(html.match(/class="compact-stage-row"/g)).toHaveLength(3);
    expect(html).not.toContain('cell-picker-trigger');
    expect(html).not.toContain('aria-haspopup="dialog"');
    for(const value of ['Sở chưa trình','VP đang thực hiện','Đã trình HĐND'])expect(html).toContain(value);
  });
  it('renders only an independently granted stage as a real, accessible button',()=>{
    const html=stageHtml(['progressBuild']);
    expect(html.match(/class="cell-value-button cell-picker-trigger"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="progressBuild · NQ02"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('data-stage-field="progressBuild"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain('class="cell-picker-popover"');
  });
  it('does not alias partyLevel editing to the adjacent progressParty source field',()=>{
    const html=stageHtml(['partyLevel','progressBuild']);
    expect(html.match(/class="cell-value-button cell-picker-trigger"/g)).toHaveLength(2);
    expect(html).toContain('aria-label="partyLevel · NQ02"');
    expect(html).toContain('aria-label="progressBuild · NQ02"');
    expect(html).not.toContain('aria-label="progressParty · NQ02"');
  });
  it('preserves per-field highlight without painting the whole stage or sibling',()=>{
    const html=stageHtml(['progressBuild'],'progressBuild');
    expect(html).toMatch(/compact-stage-state[^>]*style="[^"]*--member-highlight-bg:#FFEE55/);
    expect(html).toContain('data-highlighted="true"');
    expect(html).not.toMatch(/class="compact-stage-row"[^>]*style=/);
    expect(css).toContain('background-color:var(--member-highlight-bg)!important');
    expect(css).toContain('color:var(--member-highlight-text)!important');
  });
  it('has one normal row surface in both List and popup, no nested state/editor border',()=>{
    expect(css).toContain('.compact-stage-row .compact-stage-state[data-progress-tone]{');
    expect(css).toContain('padding:0;border:0;border-radius:0;background:transparent');
    expect(css).toContain(':is(.item-data-table,.report-detail-grid) tbody td .compact-stage-row');
    expect(css).toContain('border:0!important;background:transparent!important;');
    expect(css).toContain('box-shadow:none!important;outline:0!important;transform:none!important;');
    expect(css).toContain('.compact-stage-row:has(button.cell-picker-trigger:is(:focus-visible,[aria-expanded="true"]))');
    expect(css).toContain('button.cell-picker-trigger:not(:disabled)::after');
    expect(css).toContain('button.cell-picker-trigger:disabled::after{display:none}');
    expect(css).toContain('overflow-wrap:break-word;word-break:normal');
  });
  it('keeps status popup visual content choices-only while preserving aria and keyboard',()=>{
    expect(pickerSource).toContain("data-choices-only={!searchable ? 'true' : undefined}");
    expect(pickerSource).toContain('role="dialog"');
    expect(pickerSource).toContain('aria-label={label}');
    expect(pickerSource).toContain('role="listbox"');
    expect(pickerSource).toContain('aria-selected={value === option.value}');
    expect(pickerSource).toContain("event.key === 'Escape'");
    expect(pickerSource).toContain("event.key === 'ArrowDown'");
    expect(pickerSource).not.toContain('Giá trị hiện tại “{value}” không khớp bộ lọc.');
    expect(pickerSource).not.toContain('${value} (giá trị hiện tại)');
    expect(pickerSource).toContain("...(cellPickerCanClear(field,options) ? [{ value: '', label: '—' }] : []),");
  });
});


describe('R-V3-01: optional non-status picker clear while status menus stay exact',()=>{
  it('restores clear for VP/UBND leaders with List-like nonempty choices',()=>{
    const listValues=['PCVP Trần Văn B','PCT Nguyễn Văn C'];
    expect(listValues).not.toContain('');
    expect(cellPickerCanClear('vpLeader',listValues)).toBe(true);
    expect(cellPickerCanClear('ubndLeader',listValues)).toBe(true);
  });
  it('restores clear for optional assignments in List and popup regardless of catalog normalization',()=>{
    for(const field of ['specialist','room','department','type'] as const){
      expect(cellPickerCanClear(field,['Đã phân công'])).toBe(true);
      expect(cellPickerCanClear(field,['','Đã phân công'])).toBe(true);
    }
    // No field identity: preserve backwards compatibility with an explicit
    // empty custom-column choice; don't invent a new empty option otherwise.
    expect(cellPickerCanClear(undefined,['','Một lựa chọn'])).toBe(true);
    expect(cellPickerCanClear(undefined,['Một lựa chọn'])).toBe(false);
  });
  it('never adds a fake clear value to the four V3 catalogs, even if popup passes empty',()=>{
    for(const field of ['partyLevel','progressParty','progressBuild','progressCouncil'] as const){
      expect(cellPickerCanClear(field,['Sở chưa trình','Hoàn thành'])).toBe(false);
      expect(cellPickerCanClear(field,['','Sở chưa trình','Hoàn thành'])).toBe(false);
    }
    expect(cellPickerCanClear('isDropped',['','Chưa rút','Đã rút'])).toBe(false);
  });
  it('keeps selection callback from chosen option and does not overwrite statuses',()=>{
    expect(pickerSource).toContain('onClick={() => choose(option.value)}');
    expect(pickerSource).toContain('onChange(nextValue)');
    expect(pickerSource).toContain('aria-selected={value === option.value}');
    expect(pickerSource).toContain("if(nextValue===value)");
    expect(pickerSource).toContain("event.key === 'Escape'");
    expect(pickerSource).toContain("...(selectedIsFilteredOut ? [{ value, label: value }] : []),");
    expect(pickerSource).not.toContain(' (giá trị hiện tại)');
  });
});
