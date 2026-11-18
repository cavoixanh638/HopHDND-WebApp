import {describe,expect,it} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {createDemoItems} from '../src/data/demo-items';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {l03BoundaryRange,l03ResizeBoundary} from '../src/features/items/L03InlineWidthControl';
import {DEFAULT_PARTY_TRACK_WIDTHS,PARTY_TRACK_WIDTH_LIMITS,partyTrackModeWidth,
  validatePartyTrackWidths,type PartyTrackWidths} from '../src/data/item-preferences';
import type {CompactPair} from '../src/features/items/compact-columns';
import type {TextField} from '../shared/types';

const pair:CompactPair={anchor:'partyLevel',hidden:'progressParty',
  hiddenFields:['progressParty','progressBuild','progressCouncil'],
  memberFields:['partyLevel','progressParty','progressBuild','progressCouncil'],
  tags:['Cấp','Thành ủy','Xây dựng NQ','Ban hành NQ'],
  label:'Tiến độ 3 khâu',extraWidth:130,variant:'partyTogether'};
const base=DEFAULT_PARTY_TRACK_WIDTHS;
const copy=():PartyTrackWidths=>({readonly:{...base.readonly},editable:{...base.editable}});
const render=(admin:boolean,layoutEditing:boolean,dataEditing=false,disabled=false,mode:'readonly'|'editable'='readonly')=>{
  const item={...createDemoItems(1)[0],partyLevel:'BTV',
    progressParty:'Sở chưa trình',progressBuild:'VP đang xử lý',progressCouncil:'Hoàn thành'};
  return renderToStaticMarkup(createElement(CompactGroupedValue,{
    item,pair,field:(key:TextField)=>createElement('button',{'data-picker':key},'PICKER '+item[key]),
    tone:()=>undefined,
    editable:()=>true,
    l03InlineEditor:{verifiedAdmin:admin,layoutEditing,dataEditing,disabled,
      previewMode:mode,widths:copy(),onWidthsCommit:()=>{}}
  }));
};
describe('G08 L03 inline resize isolated geometry and permissions',()=>{
  it('keeps readonly 2 and editable 3 rails and all original min/max limits',()=>{
    expect(Object.keys(base.readonly)).toEqual(['label','status']);
    expect(Object.keys(base.editable)).toEqual(['label','level','status']);
    expect(PARTY_TRACK_WIDTH_LIMITS).toEqual({
      readonly:{label:{min:64,max:1400},status:{min:72,max:1400}},
      editable:{label:{min:64,max:1400},level:{min:48,max:900},status:{min:72,max:1400}}
    });
    expect(l03BoundaryRange(base,'readonly',0)).toEqual({minDelta:-46,maxDelta:63});
    expect(l03BoundaryRange(base,'editable',0)).toEqual({minDelta:-46,maxDelta:7});
    expect(l03BoundaryRange(base,'editable',1)).toEqual({minDelta:-7,maxDelta:73});
    expect(()=>l03BoundaryRange(base,'readonly',1)).toThrow();
  });
  it('transfers pixels only between adjacent rails, preserving physical total and original input',()=>{
    for(const mode of ['readonly','editable'] as const){
      for(let boundary=0;boundary<(mode==='readonly'?1:2);boundary++){
        for(const change of [-3000,-10,-1,0,1,10,3000]){
          const input=copy(),before=partyTrackModeWidth(input,mode);
          const otherMode=mode==='readonly'?'editable':'readonly';
          const next=l03ResizeBoundary(input,mode,boundary,change);
          expect(partyTrackModeWidth(next,mode)).toBe(before);
          expect(next[otherMode]).toEqual(input[otherMode]);
          expect(validatePartyTrackWidths(next)).toEqual(next);
          expect(input).toEqual(base);
        }
      }
    }
  });
  it('clamps at existing bounds and does not mutate adjacent outer table column widths',()=>{
    const widths=copy(),outer=[60,250,198,310];
    const upper=l03ResizeBoundary(widths,'editable',0,999999);
    expect(upper.editable.level).toBe(48);
    expect(upper.editable.label).toBe(117);
    const lower=l03ResizeBoundary(widths,'editable',0,-999999);
    expect(lower.editable.label).toBe(64);
    expect(lower.editable.level).toBe(101);
    expect(outer).toEqual([60,250,198,310]);
    expect(l03ResizeBoundary(widths,'readonly',0,NaN)).toBe(widths);
  });
  it('does not render handles for guest/staff/disabled/data edit, even with forged editor props',()=>{
    for(const [admin,layout,data,disabled] of [
      [false,true,false,false],[true,false,false,false],
      [true,true,true,false],[true,true,false,true]
    ]){
      const markup=render(admin,layout,data,disabled);
      expect(markup).not.toContain('role="separator"');
      expect(markup).not.toContain('inline-g08-active');
      expect(markup).toContain('data-picker="progressParty"');
    }
    const noEditor=renderToStaticMarkup(createElement(CompactGroupedValue,{
      item:createDemoItems(1)[0],pair,
      field:(field:TextField)=>createElement('span',{},String(field)),
      tone:()=>undefined
    }));
    expect(noEditor).not.toContain('inline-g08-overlay');
  });
  it('layout editing renders inert source values and both layout track sets, without status picker',()=>{
    const readonly=render(true,true,false,false,'readonly');
    expect(readonly).toContain('data-inline-g08-mode="readonly"');
    expect(readonly.match(/role="separator"/g)).toHaveLength(1);
    expect(readonly).not.toContain('data-picker=');
    expect(readonly).toContain('Sở chưa trình');
    expect(readonly).toContain('Hoàn thành');
    expect(readonly).toContain('aria-valuenow="110"');
    expect(readonly).toContain('data-ui-reference-group="L03"');
    const editable=render(true,true,false,false,'editable');
    expect(editable.match(/role="separator"/g)).toHaveLength(2);
    expect(editable).toContain('data-inline-g08-mode="editable"');
    expect(editable).toContain('data-level-layout="editable"');
    expect(editable).toContain('data-level-editor="true"');
    expect(editable).not.toContain('data-picker=');
    expect(editable).toContain('BTV');
    expect(editable).toContain('VP đang xử lý');
    expect(editable).toContain('px');
  });
});
