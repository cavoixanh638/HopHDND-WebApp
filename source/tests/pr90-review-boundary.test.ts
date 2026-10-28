import {it,expect,describe} from 'vitest';
import {defaultItemLayout,validateItemLayout} from '../src/data/item-preferences';
import {DEFAULT_COMPACT_DISPLAY,compactVisibleColumns,activeCompactPairs} from '../src/features/items/compact-columns';
import {resizeProjectedWithLastColumn,projectedIdWidth,projectedTrailingBounds,projectedPhysicalWidth} from '../src/data/resize-last-column';
it('review R02: capped group resize keeps the actual projected total',()=>{
  const layout=defaultItemLayout();
  layout.columns=layout.columns.map(c=>c.key==='partyLevel'?{...c,width:1550}:c);
  const prefs={...DEFAULT_COMPACT_DISPLAY,teamTogether:true};
  const cols=compactVisibleColumns(layout.columns,prefs);
  const extras=Object.fromEntries(activeCompactPairs(layout.columns,prefs).map(p=>[p.anchor,p.extraWidth]));
  const renderedTotal=(value:typeof layout)=>compactVisibleColumns(value.columns,prefs)
    .reduce((sum,c)=>sum+(c.key==='displayCode'?projectedIdWidth(c.width):c.width),0);
  const target=cols.find(c=>c.key==='partyLevel')!;
  const next=resizeProjectedWithLastColumn(layout,cols.map(c=>c.key),'partyLevel',target.width+10,extras,true);
  expect(renderedTotal(next)).toBe(renderedTotal(layout));
  expect(compactVisibleColumns(next.columns,prefs).find(c=>c.key==='note')!.width).toBeLessThanOrEqual(240);
});

describe('R02 upper-cap projection boundary / keyboard and pointer deltas',()=>{
  const prefs={...DEFAULT_COMPACT_DISPLAY,teamTogether:true};
  const source=(width:number,tailKey='note')=>{
    const layout=defaultItemLayout();
    layout.columns=layout.columns.map(c=>c.key==='partyLevel'?{...c,width}:c);
    const visible=compactVisibleColumns(layout.columns,prefs);
    const extras=Object.fromEntries(activeCompactPairs(layout.columns,prefs).map(p=>[p.anchor,p.extraWidth]));
    const keys=visible.map(c=>c.key);
    const total=(x:typeof layout)=>compactVisibleColumns(x.columns,prefs)
      .reduce((sum,c)=>sum+(c.key==='displayCode'?projectedIdWidth(c.width):c.width),0);
    if(tailKey==='partyLevel'){
      keys.splice(keys.indexOf('partyLevel'),1);keys.push('partyLevel');
    }
    return {layout,extras,keys,total};
  };
  for(const sourceWidth of [1470,1550,1600]){
    it(`group target at source ${sourceWidth}: right cap is no-op, left10/drag transfers only visible pixels`,()=>{
      const {layout,extras,keys,total}=source(sourceWidth);
      const first=total(layout);
      const right=resizeProjectedWithLastColumn(layout,keys,'partyLevel',1610,extras,true);
      expect(right).toBe(layout);
      expect(total(right)).toBe(first);
      expect(projectedTrailingBounds(layout,keys,'partyLevel',extras,true)?.max).toBe(1600);
      const left=resizeProjectedWithLastColumn(layout,keys,'partyLevel',1590,extras,true);
      const party=compactVisibleColumns(left.columns,prefs).find(c=>c.key==='partyLevel')!;
      expect(party.width).toBe(1590);
      expect(left.columns.find(c=>c.key==='partyLevel')?.width).toBe(1460);
      expect(left.columns.find(c=>c.key==='note')?.width).toBe(250);
      expect(total(left)).toBe(first);
      expect(validateItemLayout(left)).toBeTruthy();
      const drag=resizeProjectedWithLastColumn(layout,keys,'partyLevel',1567,extras,true);
      expect(compactVisibleColumns(drag.columns,prefs).find(c=>c.key==='partyLevel')?.width).toBe(1567);
      expect(drag.columns.find(c=>c.key==='note')?.width).toBe(273);
      expect(total(drag)).toBe(first);
    });
    it(`group last at source ${sourceWidth}: right10 transfers from group; left10 cannot pass cap`,()=>{
      const {layout,extras,keys,total}=source(sourceWidth,'partyLevel');
      const first=total(layout);
      const right=resizeProjectedWithLastColumn(layout,keys,'content',450,extras,true);
      expect(right.columns.find(c=>c.key==='content')?.width).toBe(450);
      expect(right.columns.find(c=>c.key==='partyLevel')?.width).toBe(1460);
      expect(projectedPhysicalWidth(right.columns.find(c=>c.key==='partyLevel')!.width,'partyLevel',extras,true)).toBe(1590);
      expect(total(right)).toBe(first);
      const left=resizeProjectedWithLastColumn(layout,keys,'content',430,extras,true);
      expect(left).toBe(layout);
      expect(total(left)).toBe(first);
    });
  }
  it('R04 ID 52px-default projection: custom source last remains bounded without rescaling',()=>{
    const layout=defaultItemLayout();
    layout.columns=layout.columns.map(c=>c.key==='displayCode'?{...c,width:125}:c);
    const keys=['content','displayCode'];
    const right=resizeProjectedWithLastColumn(layout,keys,'content',450,{},true);
    expect(projectedIdWidth(right.columns.find(c=>c.key==='displayCode')!.width)).toBe(86);
    expect(validateItemLayout(right).columns.find(c=>c.key==='displayCode')?.width).toBe(112);
    const again=resizeProjectedWithLastColumn(right,keys,'content',450,{},true);
    expect(again).toBe(right);
  });
});
