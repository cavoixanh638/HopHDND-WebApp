import {describe,it,expect} from 'vitest';
import {fitTableColumns} from '../src/data/fit-table-columns';
import {defaultItemLayout} from '../src/data/item-preferences';
import {projectedPhysicalWidth,resizeProjectedWithLastColumn} from '../src/data/resize-last-column';

describe('fill the selected list viewport without changing saved widths',()=>{
  const columns=[{key:'displayCode',width:52},{key:'stt',width:70},
    {key:'content',width:200},{key:'partyLevel',width:190},{key:'note',width:60}];
  const weights={content:3,partyLevel:3};
  it('fills the viewport exactly and keeps ID/STT compact',()=>{
    const fitted=fitTableColumns(columns,1400,weights);
    expect(Object.values(fitted).reduce((a,b)=>a+b,0)).toBe(1400);
    expect(fitted.displayCode).toBe(52);expect(fitted.stt).toBe(70);
    expect(fitted.content-200).toBeGreaterThan(fitted.note-60);
    expect(fitted.partyLevel).toBeGreaterThan(400);
    expect(columns.map(c=>c.width)).toEqual([52,70,200,190,60]);
  });
  it.each([390,0,NaN])('keeps pixel widths when viewport %s is narrower or not measured',viewport=>{
    expect(fitTableColumns(columns,viewport,weights)).toEqual(Object.fromEntries(columns.map(c=>[c.key,c.width])));
  });
  it('allocates to visible text columns only, including a sole text column',()=>{
    expect(fitTableColumns([{key:'displayCode',width:52},{key:'note',width:60}],900)).toEqual({displayCode:52,note:848});
    expect(fitTableColumns([],900)).toEqual({});
    expect(fitTableColumns([{key:'displayCode',width:52}],900)).toEqual({displayCode:52});
  });
  it('redistributes remaining space when a column reaches its existing 1600px cap',()=>{
    const fitted=fitTableColumns([{key:'content',width:1590},{key:'note',width:60}],2400,{content:3});
    expect(fitted).toEqual({content:1600,note:800});
  });
  it('retains viewport growth across a resize away from a fitted cap',()=>{
    const before=[{key:'content',width:1590},{key:'note',width:60}];
    const fitted=fitTableColumns(before,2400,{content:3});
    const growth=Object.fromEntries(before.map(c=>[c.key,fitted[c.key]-c.width]));
    const after=fitTableColumns([{key:'content',width:1580},{key:'note',width:70}],2400,{content:3},growth);
    expect(after).toEqual({content:1590,note:810});
    expect(fitTableColumns(before,2500,{content:3},growth)).toEqual({content:1600,note:900});
  });
  it.each([false,true])('target/last transfer stays exact after fitting (ID last: %s)',idLast=>{
    const layout=defaultItemLayout();
    layout.columns=layout.columns.map(c=>({...c,width:c.key==='displayCode'?125:250}));
    const keys=idLast?['partyLevel','note','content','displayCode']:['displayCode','partyLevel','content','note'];
    const weights={partyLevel:3,content:3};
    const extra={partyLevel:130};
    const bases=()=>keys.map(key=>({key,width:projectedPhysicalWidth(layout.columns.find(c=>c.key===key)!.width,key,extra)}));
    const original=bases(),fitted=fitTableColumns(original,1800,weights);
    const extras=Object.fromEntries(original.map(c=>[c.key,(c.key==='partyLevel'?130:0)+fitted[c.key]-c.width]));
    const target='partyLevel',last=keys.at(-1)!;
    const next=resizeProjectedWithLastColumn(layout,keys,target,fitted[target]-10,extras);
    expect(next).not.toBe(layout);
    const after=fitTableColumns(keys.map(key=>({key,width:projectedPhysicalWidth(next.columns.find(c=>c.key===key)!.width,key,extra)})),1800,weights);
    expect(after[target]).toBe(fitted[target]-10);expect(after[last]).toBe(fitted[last]+10);
    for(const key of keys.filter(k=>k!==target&&k!==last))expect(after[key]).toBe(fitted[key]);
    expect(Object.values(after).reduce((a,b)=>a+b,0)).toBe(1800);
    expect(next.columns.filter(c=>!keys.includes(c.key))).toEqual(layout.columns.filter(c=>!keys.includes(c.key)));
  });
});
