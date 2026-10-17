import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout,overlayPersonalLayout} from '../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';

const custom=(id='custom_workflow2026')=>({
  key:id,label:'Tiến độ riêng',origin:'custom' as const,kind:'select' as const,
  options:['Chưa làm','Đang làm','Hoàn thành'],
  values:{'sheet:42:row:3':'Đang làm'},visible:true,width:190
});

describe('independent table fields and values',()=>{
  it('keeps 18 original mapped source fields and adds an independent editable dropdown field',()=>{
    const base=defaultItemLayout();
    const valid=validateItemLayout({...base,columns:[...base.columns,custom()]});
    expect(valid.columns).toHaveLength(19);
    const extra=valid.columns.at(-1)!;
    expect(extra).toMatchObject(custom());
    expect(valid.columns.slice(0,18).map(c=>c.key)).toEqual(base.columns.map(c=>c.key));
    expect(JSON.parse(JSON.stringify(valid)).columns.at(-1).values).toEqual({'sheet:42:row:3':'Đang làm'});
  });
  it('allows rename and logical removal of Excel columns without changing their source mapping',()=>{
    const base=defaultItemLayout();
    base.columns[6]={...base.columns[6],label:'Tình hình trình TU',renamed:true,removed:true,visible:false};
    const updated=validateItemLayout(base);
    expect(updated.columns[6]).toMatchObject({
      key:'progressParty',label:'Tình hình trình TU',renamed:true,removed:true,visible:false,
    });
  });
  it('preserves source data after a previously renamed label when no rename flag exists',()=>{
    const base=defaultItemLayout();
    base.columns[13].label='Tiến độ cụ thể'; // previous client label
    expect(validateItemLayout(base).columns[13].label).toBe('Tiến độ hiện tại');
  });
  it('rejects malicious field names, unsafe values, oversize choice lists and invalid origins',()=>{
    const base=defaultItemLayout();
    expect(()=>validateItemLayout({...base,columns:[...base.columns,{...custom(),'key':'evil'}]})).toThrow();
    expect(()=>validateItemLayout({...base,columns:[...base.columns,{...custom(),origin:undefined}]})).toThrow();
    expect(()=>validateItemLayout({...base,columns:[...base.columns,{...custom(),values:{'evil.dot':'yes'}}]})).toThrow();
    expect(()=>validateItemLayout({...base,columns:[...base.columns,{...custom(),options:['Dupe','Dupe']}]})).toThrow();
    expect(()=>validateItemLayout({...base,columns:[...base.columns,{...custom(),values:{r1:'a'.repeat(1001)}}]})).toThrow();
  });
  it('keeps shared values and new fields current under stale personal saved views',()=>{
    const old=defaultItemLayout();old.columns.reverse();old.columns[0].width=315;
    const shared=validateItemLayout({...defaultItemLayout(),columns:[...defaultItemLayout().columns,custom()]});
    const overlay=overlayPersonalLayout(shared,old);
    expect(overlay.columns[0].key).toBe(old.columns[0].key);
    expect(overlay.columns[0].width).toBe(315);
    expect(overlay.columns.at(-1)).toMatchObject(custom());
  });
  it('merges edits on distinct row values in the same custom field without discarding either',()=>{
    const base=validateItemLayout({...defaultItemLayout(),columns:[...defaultItemLayout().columns,custom()]});
    const local=structuredClone(base),remote=structuredClone(base);
    local.columns.at(-1)!.values!['sheet:42:row:4']='Chưa làm';
    remote.columns.at(-1)!.values!['sheet:42:row:5']='Hoàn thành';
    const merged=mergeItemLayout(base,local,remote);
    expect(merged.columns.at(-1)!.values).toMatchObject({
      'sheet:42:row:3':'Đang làm','sheet:42:row:4':'Chưa làm','sheet:42:row:5':'Hoàn thành'
    });
  });
  it('requires deliberate conflict resolution for the same custom cell instead of silent overwrite',()=>{
    const base=validateItemLayout({...defaultItemLayout(),columns:[...defaultItemLayout().columns,custom()]});
    const local=structuredClone(base),remote=structuredClone(base);
    local.columns.at(-1)!.values!['sheet:42:row:3']='Chưa làm';
    remote.columns.at(-1)!.values!['sheet:42:row:3']='Hoàn thành';
    const id='columns.custom_workflow2026.values.sheet:42:row:3';
    expect(()=>mergeItemLayout(base,local,remote)).toThrow(LayoutConflictError);
    expect(mergeItemLayout(base,local,remote,{[id]:'local'}).columns.at(-1)!.values!['sheet:42:row:3']).toBe('Chưa làm');
    expect(mergeItemLayout(base,local,remote,{[id]:'remote'}).columns.at(-1)!.values!['sheet:42:row:3']).toBe('Hoàn thành');
  });
  it('adds a custom field concurrently with an unrelated source width change',()=>{
    const base=defaultItemLayout(),local=structuredClone(base),remote=structuredClone(base);
    local.columns.push(custom());remote.columns[2].width=720;
    const merged=mergeItemLayout(base,local,remote);
    expect(merged.columns[2].width).toBe(720);
    expect(merged.columns.at(-1)).toMatchObject(custom());
  });
});