import {describe,it,expect} from 'vitest';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {resizeWithLastColumn,trailingWidthBounds,projectedIdWidth,projectedTrailingBounds,
  resizeProjectedWithLastColumn} from '../src/data/resize-last-column';
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
    expect(activeCompactPairs(layout.columns,prefs).filter(p=>p.variant==='roomSpecialist'||p.variant==='leadersTogether').map(p=>p.extraWidth)).toEqual([0,0]);
    expect(activeCompactPairs(layout.columns,prefs).find(p=>p.variant==='partyTogether')?.extraWidth).toBe(130);
    expect(cols.find(c=>c.key==='vpLeader')?.label).toBe('Lãnh đạo UBND / VP');
    const narrow=resizeWithLastColumn(layout,cols.map(c=>c.key),'room',80);
    expect(narrow.columns.find(c=>c.key==='room')?.width).toBe(80);
  });
  it('Excel column N maps to textarea editor, not an invented or select field',()=>{
    expect(TEXT_FIELDS.find(c=>c.key==='specificProgress')?.editor).toBe('textarea');
    expect(TEXT_FIELDS.find(c=>c.key==='note')?.editor).toBe('textarea');
  });
});

describe('R02/R04: physical compensation when the readable 52px ID is last',()=>{
  const physical=(layout:ReturnType<typeof defaultItemLayout>,key:string,extra=0)=>
    key==='displayCode'?projectedIdWidth(layout.columns.find(c=>c.key===key)!.width):
      layout.columns.find(c=>c.key===key)!.width+extra;
  it('ArrowRight at default 52px clamps at physical min46 without changing total',()=>{
    const layout=defaultItemLayout(),keys=['content','stt','displayCode'];
    const total=physical(layout,'content')+physical(layout,'stt')+physical(layout,'displayCode');
    expect(projectedTrailingBounds(layout,keys,'content')).toEqual({min:60,max:446});
    const right=resizeProjectedWithLastColumn(layout,keys,'content',450);
    expect(physical(right,'content')).toBe(446);
    expect(physical(right,'displayCode')).toBe(46);
    expect(physical(right,'content')+physical(right,'stt')+physical(right,'displayCode')).toBe(total);
    expect(validateItemLayout(right).columns.find(c=>c.key==='displayCode')!.width).toBe(60);
    expect(right.columns.filter(c=>c.width!==layout.columns.find(z=>z.key===c.key)?.width)
      .map(c=>c.key).sort()).toEqual(['content','displayCode']);
    expect(right.tableWidth).toBe(layout.tableWidth);
  });
  it('ArrowLeft and pointer drag keep a one-column reservoir and preserve displayed total',()=>{
    const layout=defaultItemLayout(),keys=['content','stt','displayCode'];
    for(const delta of [-10,-20,1,20]){
      const next=resizeProjectedWithLastColumn(layout,keys,'content',440+delta);
      const before=physical(layout,'content')+physical(layout,'displayCode');
      const after=physical(next,'content')+physical(next,'displayCode');
      expect(after).toBe(before);
      expect(physical(next,'stt')).toBe(physical(layout,'stt'));
      expect(validateItemLayout(next)).toBeTruthy();
    }
  });
  it('custom ID=125 and final grouped progress anchor use the correct physical bounds',()=>{
    const custom=defaultItemLayout();
    custom.columns=custom.columns.map(c=>c.key==='displayCode'?{...c,width:125}:c);
    const keys=['content','partyLevel','displayCode'];
    const original=physical(custom,'content')+physical(custom,'displayCode');
    const next=resizeProjectedWithLastColumn(custom,keys,'content',450);
    expect(physical(next,'content')+physical(next,'displayCode')).toBe(original);
    expect(physical(next,'displayCode')).toBe(86);
    expect(validateItemLayout(next)).toBeTruthy();
    const extras={partyLevel:130};
    const groupLast=['content','partyLevel'];
    const extended=resizeProjectedWithLastColumn(custom,groupLast,'content',470,extras);
    expect(physical(extended,'content')+physical(extended,'partyLevel',130))
      .toBe(physical(custom,'content')+physical(custom,'partyLevel',130));
    expect(extended.columns.find(c=>c.key==='partyLevel')?.width).toBe(160);
    expect(extended.columns.find(c=>c.key==='displayCode')?.width).toBe(125);
  });
  it('reloading a saved custom width maps the ID exactly once, not repeatedly',()=>{
    const layout=defaultItemLayout();
    const custom={...layout,columns:layout.columns.map(c=>c.key==='displayCode'?{...c,width:125}:c)};
    const loaded=validateItemLayout(custom);
    expect(projectedIdWidth(loaded.columns.find(c=>c.key==='displayCode')!.width)).toBe(96);
    expect(projectedIdWidth(validateItemLayout(loaded).columns.find(c=>c.key==='displayCode')!.width)).toBe(96);
  });
});

describe('R04 owner choice: default ID 52px, source remains 68px',()=>{
  it('maps default and custom widths monotonically, never rescales on reload',()=>{
    const raw=defaultItemLayout();
    expect(raw.columns.find(c=>c.key==='displayCode')!.width).toBe(68);
    expect(projectedIdWidth(68)).toBe(52);
    expect(projectedIdWidth(60)).toBe(46);
    expect(projectedIdWidth(125)).toBe(96);
    expect(projectedIdWidth(1600)).toBe(1224);
    const custom={...raw,columns:raw.columns.map(c=>c.key==='displayCode'?{...c,width:125}:c)};
    const loaded=validateItemLayout(custom);
    expect(loaded.columns.find(c=>c.key==='displayCode')!.width).toBe(125);
    expect(projectedIdWidth(loaded.columns.find(c=>c.key==='displayCode')!.width)).toBe(96);
    expect(projectedIdWidth(validateItemLayout(loaded).columns.find(c=>c.key==='displayCode')!.width)).toBe(96);
  });
  it('uses real physical delta at the minimum and inverts ID last only once',()=>{
    const layout=defaultItemLayout(),keys=['content','displayCode'];
    const start=440+projectedIdWidth(68);
    const next=resizeProjectedWithLastColumn(layout,keys,'content',446);
    expect(next.columns.find(c=>c.key==='content')!.width).toBe(446);
    expect(projectedIdWidth(next.columns.find(c=>c.key==='displayCode')!.width)).toBe(46);
    expect(next.columns.find(c=>c.key==='displayCode')!.width).toBe(60);
    expect(446+projectedIdWidth(60)).toBe(start);
    expect(resizeProjectedWithLastColumn(next,keys,'content',460)).toBe(next);
  });
});
