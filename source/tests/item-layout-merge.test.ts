import {describe,it,expect} from 'vitest';
import {defaultItemLayout} from '../src/data/item-preferences';
import {mergeItemLayout,LayoutConflictError} from '../src/data/item-layout-merge';

describe('concurrent Firebase list-layout safety',()=>{
  it('preserves remotely changed columns and reports when the user only adjusts frameWidth',()=>{
    const base=defaultItemLayout();
    const draft={...base,frameWidth:1500 as const};
    const current={...base,tableWidth:2000,columns:base.columns.map(c=>c.key==='room'?{...c,width:230}:c)};
    const merged=mergeItemLayout(base,draft,current);
    expect(merged.frameWidth).toBe(1500);
    expect(merged.tableWidth).toBe(2000);
    expect(merged.columns.find(c=>c.key==='room')?.width).toBe(230);
  });
  it('merges disjoint edits in the same list section without losing either',()=>{
    const base=defaultItemLayout();
    const local={...base,columns:base.columns.map(c=>c.key==='room'?{...c,width:300}:c)};
    const remote={...base,columns:base.columns.map(c=>c.key==='content'?{...c,width:570}:c)};
    const merged=mergeItemLayout(base,local,remote);
    expect(merged.columns.find(c=>c.key==='room')?.width).toBe(300);
    expect(merged.columns.find(c=>c.key==='content')?.width).toBe(570);
  });
  it('refuses simultaneous different edits to the same field',()=>{
    const base=defaultItemLayout(),local={...base,frameWidth:1500 as const},remote={...base,frameWidth:500 as const};
    expect(()=>mergeItemLayout(base,local,remote)).toThrow(LayoutConflictError);
    expect(()=>mergeItemLayout(base,local,remote)).toThrow('độ rộng vùng danh sách');
  });
  it('recognizes identical concurrent edits as safe and conserves remote order',()=>{
    const base=defaultItemLayout();
    const reordered={...base,columns:[...base.columns].reverse()};
    const local={...base,tableWidth:1800,frameWidth:1500 as const};
    const remote={...reordered,tableWidth:1800};
    const merged=mergeItemLayout(base,local,remote);
    expect(merged.columns.map(c=>c.key)).toEqual(reordered.columns.map(c=>c.key));
    expect(merged.tableWidth).toBe(1800);
    expect(merged.frameWidth).toBe(1500);
  });
  it('shows exact original, browser and Firebase values then allows explicit per-field decisions',()=>{
    const base=defaultItemLayout();
    const local={...base,frameWidth:1500 as const,columns:base.columns.map(c=>c.key==='note'?{...c,width:300}:c)};
    const remote={...base,frameWidth:500 as const,columns:base.columns.map(c=>c.key==='note'?{...c,width:117}:c)};
    let found:unknown;
    try{mergeItemLayout(base,local,remote);}catch(error){found=error;}
    expect(found).toBeInstanceOf(LayoutConflictError);
    const conflicts=(found as LayoutConflictError).conflicts;
    expect(conflicts).toEqual(expect.arrayContaining([
      expect.objectContaining({id:'frameWidth',original:'Tự động',local:'1500 px',remote:'500 px'}),
      expect.objectContaining({id:'columns.note.width',local:'300 px',remote:'117 px'}),
    ]));
    expect(conflicts).toHaveLength(2);
    expect(()=>mergeItemLayout(base,local,remote,{'frameWidth':'remote'})).toThrow(LayoutConflictError);
    const merged=mergeItemLayout(base,local,remote,{'frameWidth':'remote','columns.note.width':'local'});
    expect(merged.frameWidth).toBe(500);
    expect(merged.columns.find(c=>c.key==='note')?.width).toBe(300);
  });
  it('preserves an unrelated server edit while the admin explicitly keeps their own conflicted width',()=>{
    const base=defaultItemLayout();
    const local={...base,columns:base.columns.map(c=>c.key==='note'?{...c,width:210}:c)};
    const remote={...base,tableWidth:1900,columns:base.columns.map(c=>c.key==='note'?{...c,width:117}:c)};
    const merged=mergeItemLayout(base,local,remote,{'columns.note.width':'local'});
    expect(merged.tableWidth).toBe(1900);
    expect(merged.columns.find(c=>c.key==='note')?.width).toBe(210);
  });
  it('refuses competing reorders of visible columns',()=>{
    const base=defaultItemLayout();
    const a={...base,columns:[base.columns[1],base.columns[0],...base.columns.slice(2)]};
    const b={...base,columns:[...base.columns.slice(1),base.columns[0]]};
    expect(()=>mergeItemLayout(base,a,b)).toThrow('thứ tự cột');
  });
  it('does not overwrite new source configuration when restored draft leaves fields untouched',()=>{
    const base=defaultItemLayout();
    const draft={...base,frameWidth:1500 as const};
    const live={...base,tableWidth:500,columns:base.columns.map(c=>({...c,visible:c.key==='content'||c.key==='displayCode'}))};
    const merged=mergeItemLayout(base,draft,live);
    expect(merged.tableWidth).toBe(500);
    expect(merged.columns.find(c=>c.key==='room')?.visible).toBe(false);
    expect(merged.frameWidth).toBe(1500);
  });
});
