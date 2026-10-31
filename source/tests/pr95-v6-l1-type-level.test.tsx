import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompactGroupedValue,compactStageVisualTone} from '../src/features/items/CompactGroupedValue';
import {activeCompactPairs,compactTypeTone,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {defaultItemLayout} from '../src/data/item-preferences';
import {CellPicker,cellPickerCanClear} from '../src/features/items/CellPicker';
import {createDemoItems} from '../src/data/demo-items';
import {catalogFromItems} from '../src/data/catalogs';
import type {TextField} from '../shared/types';

const layout=defaultItemLayout();
const prefs={...DEFAULT_COMPACT_DISPLAY,contentDetails:true,partyTogether:true};
const pairs=activeCompactPairs(layout.columns,prefs);
const contentPair=pairs.find(x=>x.variant==='contentDetails')!;
const partyPair=pairs.find(x=>x.variant==='partyTogether')!;
const item=createDemoItems(1)[0];
describe('UI V6 L1 type palette/field semantics',()=>{
  it.each([['QPPL','QPPL'],['HC','HC'],['Báo cáo','BC'],['Loại cũ','other']])(
    'renders one type member with correct kind %s → %s',(raw,kind)=>{
      const sample={...item,type:raw};
      const html=renderToStaticMarkup(<CompactGroupedValue
        item={sample} pair={contentPair} tone={()=>undefined}
        editable={f=>f==='type'}
        field={(key:TextField)=>key==='type'?<CellPicker field="type"
          value={sample.type} label="Loại VB" options={['QPPL','HC','Báo cáo']}
          onChange={()=>{}}/>:String(sample[key]??'')}/>);
      expect(html).toContain('class="compact-document-badge"');
      expect(html).toContain('data-kind="'+kind+'"');
      expect(html).toContain('data-editable="true"');
      expect(html).toContain('class="cell-value-button cell-picker-trigger"');
      expect(html).not.toContain('custom-cell-input');
      expect(html).not.toContain('cell-picker-popover');
      if(raw==='Loại cũ')expect(html).toContain(raw);
    });
  it('uses existing catalog without inventing values and retains optional clear',()=>{
    const catalog=catalogFromItems([{...item,type:'Loại VB legacy'}]);
    expect(catalog.options.type).toContain('Loại VB legacy');
    expect(cellPickerCanClear('type',catalog.options.type)).toBe(true);
    expect(cellPickerCanClear('partyLevel',['BCH','BTV TU','TTTU'])).toBe(false);
  });
});
describe('UI V6 L1 party-level brackets',()=>{
  it.each([['BCH','BCH'],['BTV TU','BTV TU'],['TTTU','TTTU'],
    ['Ban Chấp hành Thành ủy','Ban Chấp hành Thành ủy']])(
    'retains raw source and explicit gap/independent level picker for %s',(raw)=>{
      const sample={...item,partyLevel:raw};
      const html=renderToStaticMarkup(<CompactGroupedValue item={sample}
        pair={partyPair} tone={()=>undefined}
        editable={f=>f==='partyLevel'}
        field={(key:TextField)=>key==='partyLevel'?<CellPicker field="partyLevel"
          label="Cấp Thành ủy" value={sample.partyLevel} options={['BCH','BTV TU','TTTU']}
          onChange={()=>{}}/>:String(sample[key]??'')}/>);
      expect(html).toContain('compact-stage-level-open');
      expect(html).toContain('compact-stage-level-close');
      const text=html.replace(/<[^>]*>/g,'').replace(/<!--\s*-->/g,'');
      expect(text).toContain('Thành ủy ('+raw+')');
      expect(html).toContain('aria-label="Cấp Thành ủy"');
      expect(html.match(/class="compact-stage-row"/g)).toHaveLength(3);
    });
  it('UI6-R01 preserves legacy long partyLevel and nonrequired source status',()=>{
    const sample={...item,partyLevel:'Ban Thường vụ Thành ủy lưu từ dữ liệu Excel cũ',
      progressParty:'Không phải trình'};
    const html=renderToStaticMarkup(<CompactGroupedValue item={sample}
      pair={partyPair} tone={()=>undefined} editable={()=>false}
      field={key=>String(sample[key]??'')}/>);
    const visibleText=html.replace(/<[^>]*>/g,'').replace(/<!--\\s*-->/g,'');
    expect(visibleText).toContain('Thành ủy ('+sample.partyLevel+')');
    expect(html).toContain(sample.partyLevel);
    expect(html).toContain('Không phải trình');
    expect(html).toContain('data-progress-tone="neutral"');
    expect(compactStageVisualTone(sample.progressParty,'done')).toBe('neutral');
    expect(sample.partyLevel).toBe('Ban Thường vụ Thành ủy lưu từ dữ liệu Excel cũ');
    expect(html).not.toContain('cell-picker-trigger');
  });
  it('does not make a read-only level into a control',()=>{
    const html=renderToStaticMarkup(<CompactGroupedValue item={item}
      pair={partyPair} tone={()=>undefined}
      editable={()=>false} field={key=>String(item[key]??'')}/>);
    expect(html).toContain('compact-stage-level-close');
    expect(html).not.toContain('cell-picker-trigger');
  });
});
