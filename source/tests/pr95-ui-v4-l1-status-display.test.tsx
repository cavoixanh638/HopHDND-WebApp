import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Item,TextField} from '../shared/types';
import {createDemoItems} from '../src/data/demo-items';
import {OFFICIAL_STATUS_CHOICES,canonicalStatus} from '../src/domain/status-contract';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {activeCompactPairs,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {defaultItemLayout} from '../src/data/item-preferences';
import {CellPicker} from '../src/features/items/CellPicker';
import {isStatusDisplayField,projectedStatusFilterRows,statusDisplayValue,
  statusPickerValues,statusEditSelection,statusFilterText,statusReadOnlyValue
} from '../src/features/items/status-display';

/** Explicit historic fixture: independent of the L4 demo-items rewrite. */
const legacy:Item={
  ...createDemoItems(1)[0],recordId:'v4-l1-legacy-001',displayCode:'NQ02',
  partyLevel:'Ban Chấp hành',progressParty:'VP đang thực hiện',
  progressBuild:'Đã trình HĐND, chưa có QĐ',
  progressCouncil:'Đã trình HĐND thành phố'
};
const unknown:Item={...legacy,recordId:'v4-l1-unknown',partyLevel:'TU đã cho ý kiến',
  progressParty:'Đã báo cáo TU',progressBuild:'Đã trình chưa rõ',
  progressCouncil:'Đã trình, chờ QĐ'};
const fields=['partyLevel','progressParty','progressBuild','progressCouncil'] as const;
const expected=['BCH','VP đang xử lý','Đã trình, chờ QĐ','Hoàn thành'];
const sourceSnapshot=()=>JSON.stringify(legacy);

describe('UI V4 L1: source-preserving status presentation in List and popup',()=>{
  it('projects all four validated aliases, leaves source Item and uncertain states untouched',()=>{
    const before=sourceSnapshot();
    for(let index=0;index<fields.length;index++){
      expect(isStatusDisplayField(fields[index])).toBe(true);
      expect(statusDisplayValue(fields[index],legacy[fields[index]])).toBe(expected[index]);
      expect(statusReadOnlyValue(fields[index],legacy[fields[index]])).toBe(expected[index]);
      expect(canonicalStatus(fields[index],legacy[fields[index]])).toBe(expected[index]);
      expect(statusDisplayValue(fields[index],unknown[fields[index]])).toBe(unknown[fields[index]]);
    }
    expect(isStatusDisplayField('specificProgress')).toBe(false);
    expect(statusDisplayValue('specificProgress','VP đang thực hiện')).toBe('VP đang thực hiện');
    expect(statusDisplayValue('progressParty','')).toBe('');
    expect(statusDisplayValue('progressCouncil','Không phải trình')).toBe('Không phải trình');
    expect(sourceSnapshot()).toBe(before);
  });
  it('honors ALL official choices in exact order, no old alias and no synthetic aggregate/preset',()=>{
    for(const key of fields){
      expect(statusPickerValues(key,['VP đang thực hiện',legacy[key],unknown[key],'Bước tiếp theo']))
        .toEqual(OFFICIAL_STATUS_CHOICES[key]);
      expect(statusPickerValues(key,[])).toEqual(OFFICIAL_STATUS_CHOICES[key]);
    }
    expect(statusPickerValues('vpLeader',['','Lãnh đạo A'])).toEqual(['','Lãnh đạo A']);
  });
  it('does not patch opening/closing/Esc/same displayed canonical; one changed field patches only itself',()=>{
    const before=sourceSnapshot();
    const patches:Record<string,string>[]=[];
    const choose=(field:TextField,value:string)=>{
      const selected=statusEditSelection(field,legacy[field],value);
      if(selected!==null)patches.push({[field]:selected});
    };
    choose('partyLevel','BCH');
    choose('progressParty','VP đang xử lý');
    choose('progressBuild','Đã trình, chờ QĐ');
    choose('progressCouncil','Hoàn thành');
    expect(patches).toEqual([]);
    for(const key of fields){
      expect(statusEditSelection(key,legacy[key],legacy[key])).toBeNull();
    }
    choose('progressBuild','Đã có QĐ');
    expect(patches).toEqual([{progressBuild:'Đã có QĐ'}]);
    expect(sourceSnapshot()).toBe(before); // no background migration
    expect(statusEditSelection('progressBuild',unknown.progressBuild,'Đã có QĐ'))
      .toBe('Đã có QĐ'); // explicit user decision, not guessed
    expect(statusEditSelection('progressBuild',unknown.progressBuild,'Hoàn thành')).toBeNull();
    expect(statusEditSelection('progressCouncil',unknown.progressCouncil,'Đã trình, chờ QĐ')).toBeNull();
  });
  it('matches raw alias AND canonical display, with filter-only row copies',()=>{
    const before=sourceSnapshot();
    for(const key of fields){
      const indexed=statusFilterText(key,legacy[key]);
      expect(indexed).toContain(legacy[key]);
      expect(indexed).toContain(statusDisplayValue(key,legacy[key]));
    }
    const projected=projectedStatusFilterRows([legacy,unknown]);
    expect(projected[0]).not.toBe(legacy);
    for(let i=0;i<fields.length;i++)expect(projected[0][fields[i]]).toBe(expected[i]);
    for(const key of fields)expect(projected[1][key]).toBe(unknown[key]);
    expect(projected[0].recordId).toBe(legacy.recordId);
    expect(projected[0].revision).toBe(legacy.revision);
    expect(sourceSnapshot()).toBe(before);
  });
  it('renders grouped READONLY list/popup values canonical without mutating source or CSS',()=>{
    const before=sourceSnapshot();
    const pair=activeCompactPairs(defaultItemLayout().columns,DEFAULT_COMPACT_DISPLAY)
      .find(p=>p.variant==='partyTogether')!;
    const html=renderToStaticMarkup(createElement(CompactGroupedValue,{
      item:legacy,pair,tone:()=>undefined,
      field:(key:TextField)=>statusReadOnlyValue(key,legacy[key])
    }));
    for(const text of expected)expect(html).toContain(text);
    for(const key of fields)expect(html).not.toContain(legacy[key]);
    expect(html).toContain('data-stage-field="progressParty"');
    expect(html).toContain('data-stage-field="progressCouncil"');
    expect(sourceSnapshot()).toBe(before);
  });
  it('renders editor trigger text and aria from projected value, never from raw alias',()=>{
    const raw=legacy.progressBuild;
    const shown=statusDisplayValue('progressBuild',raw);
    const html=renderToStaticMarkup(createElement(CellPicker,{
      label:'Tiến độ xây dựng NQ · NQ02',field:'progressBuild',
      recordId:legacy.recordId,value:shown,displayValue:shown,
      options:statusPickerValues('progressBuild',[raw,'VP đang thực hiện']),
      onChange:()=>{throw Error('render must never save');}
    }));
    expect(html).toContain('Đã trình, chờ QĐ');
    expect(html).toContain('aria-label="Tiến độ xây dựng NQ · NQ02: Đã trình, chờ QĐ"');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain(raw);
    expect(html).not.toContain('cell-picker-popover');
  });
});
