import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {resizeWithLastColumn,trailingWidthBounds} from '../src/data/resize-last-column';
import {activeCompactPairs,compactVisibleColumns,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {TEXT_FIELDS} from '../shared/field-definitions';

describe('Width transfers to trailing visible column, never the other columns',()=>{
  it('narrows default four-character ID and migrates only old 100px default',()=>{
    const layout=defaultItemLayout();
    expect(layout.columns.find(c=>c.key==='displayCode')?.width).toBe(68);
    const prior={...layout,columns:layout.columns.map(c=>c.key==='displayCode'?{...c,width:100}:c)};
    expect(validateItemLayout(prior).columns.find(c=>c.key==='displayCode')?.width).toBe(68);
    const custom={...layout,columns:layout.columns.map(c=>c.key==='displayCode'?{...c,width:125}:c)};
    expect(validateItemLayout(custom).columns.find(c=>c.key==='displayCode')?.width).toBe(125);
  });
  it('resizes preceding column only by withdrawing/returning pixels from the LAST visible column',()=>{
    const old=defaultItemLayout();
    const keys=old.columns.map(c=>c.key);
    const first=old.columns[2],last=old.columns.at(-1)!;
    const changed=resizeWithLastColumn(old,keys,first.key,first.width+80);
    expect(changed.columns.find(c=>c.key===first.key)?.width).toBe(first.width+80);
    expect(changed.columns.find(c=>c.key===last.key)?.width).toBe(last.width-80);
    expect(changed.columns.every(c=>c.key===first.key||c.key===last.key||
      c.width===old.columns.find(orig=>orig.key===c.key)?.width)).toBe(true);
    expect(changed.columns.reduce((sum,c)=>sum+c.width,0)).toBe(old.columns.reduce((sum,c)=>sum+c.width,0));
    expect(resizeWithLastColumn(changed,keys,first.key,first.width)).toEqual(old);
  });
  it('clamps when final column reaches minimum and reserves last edge',()=>{
    const old=defaultItemLayout(),keys=old.columns.map(c=>c.key);
    const id=old.columns[0].width,final=old.columns.at(-1)!.width;
    expect(trailingWidthBounds(old,keys,'displayCode')?.max).toBe(id+final-60);
    const resized=resizeWithLastColumn(old,keys,'displayCode',1000);
    expect(resized.columns.at(-1)?.width).toBe(60);
    expect(resized.columns[0].width).toBe(id+final-60);
    expect(resizeWithLastColumn(old,keys,keys.at(-1)!,999)).toBe(old);
  });
  it('when last visible column is different (hidden, reordered), only that one compensates',()=>{
    const original=defaultItemLayout();
    const keys=['displayCode','stt','room','specificProgress'];
    const updated=resizeWithLastColumn(original,keys,'room',100);
    expect(updated.columns.find(c=>c.key==='specificProgress')?.width).toBe(270);
    expect(updated.columns.find(c=>c.key==='note')?.width).toBe(240);
    expect(updated.columns.find(c=>c.key==='room')?.width).toBe(100);
    expect(updated.tableWidth).toBe(original.tableWidth);
  });
  it('merged Room/CV and Leader UBND/VP have no forced extra width',()=>{
    const layout=defaultItemLayout();
    const prefs={...DEFAULT_COMPACT_DISPLAY,roomSpecialist:true,leadersTogether:true};
    const cols=compactVisibleColumns(layout.columns, prefs);
    expect(cols.find(c=>c.key==='room')?.width).toBe(170);
    expect(cols.find(c=>c.key==='vpLeader')?.width).toBe(170);
    expect(activeCompactPairs(layout.columns,prefs).map(p=>p.extraWidth)).toEqual([0,0]);
    expect(cols.find(c=>c.key==='vpLeader')?.label).toBe('Lãnh đạo UBND / VP');
    const narrow=resizeWithLastColumn(layout,cols.map(c=>c.key),'room',80);
    expect(narrow.columns.find(c=>c.key==='room')?.width).toBe(80);
  });
  it('Excel column N maps to textarea editor, not an invented or select field',()=>{
    expect(TEXT_FIELDS.find(c=>c.key==='specificProgress')?.editor).toBe('textarea');
    expect(TEXT_FIELDS.find(c=>c.key==='note')?.editor).toBe('textarea');
  });
});
