import {describe,it,expect} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {newToolbarState,filterToolbarRows,SEARCHABLE_ITEM_FIELDS} from '../src/features/items/list-toolbar-filters';

describe('Admin configurable unaccented search fields',()=>{
  it('defaults to the legacy all-field search unless explicitly configured',()=>{
    const row={...createDemoItems(1)[0],content:'Nội dung bất kỳ',department:'Sở Tài chính'};
    const search={...newToolbarState(),search:'tai chinh'};
    expect(filterToolbarRows([row],search)).toHaveLength(1);
    expect(filterToolbarRows([row],search,undefined,['content'])).toHaveLength(0);
    expect(filterToolbarRows([row],search,undefined,['department'])).toHaveLength(1);
  });
  it('includes selected custom columns only when explicitly enabled',()=>{
    const row={...createDemoItems(1)[0],content:'Nội dung',note:'Không có'};
    const search={...newToolbarState(),search:'mau-doc-nhat'};
    const custom=()=> 'Mẫu-độc-nhất';
    expect(filterToolbarRows([row],search,custom,['content'])).toHaveLength(0);
    expect(filterToolbarRows([row],search,custom,['*'])).toHaveLength(1);
  });
  it('keeps ID searchable via displayCode and single field override still works',()=>{
    const row={...createDemoItems(1)[0],displayCode:'NQ-TEST-919'};
    const state={...newToolbarState(),search:'test-919'};
    expect(filterToolbarRows([row],state,undefined,['displayCode'])).toHaveLength(1);
    expect(filterToolbarRows([row],state,undefined,['note'])).toHaveLength(0);
    expect(SEARCHABLE_ITEM_FIELDS).toContain('content');
    expect(SEARCHABLE_ITEM_FIELDS).toContain('note');
  });
});
