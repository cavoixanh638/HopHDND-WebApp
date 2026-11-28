import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CompactGroupedValue} from '../src/features/items/CompactGroupedValue';
import {activeCompactPairs,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import {defaultItemLayout} from '../src/data/item-preferences';
import {createDemoItems} from '../src/data/demo-items';
import {printStaffValues,LIST_A4_PRINT_CSS} from '../src/features/items/list-print';
const row={...createDemoItems(1)[0],ubndLeader:'PCT Nguyễn Văn A',vpLeader:'PCVP Trần Văn B',room:'Phòng Tổng hợp',specialist:'Lê Văn C'};
const variants=[{teamTogether:true},{leadersTogether:true},{roomSpecialist:true}];
describe('Web-only staff labels and independent A4 print',()=>{
  for(const variant of variants){
    for(const inline of [false,true]){
      it('preserves source members with or without labels '+JSON.stringify(variant)+' inline='+inline,()=>{
        const prefs={...DEFAULT_COMPACT_DISPLAY,...variant,cvRoomInline:inline};
        const pair=activeCompactPairs(defaultItemLayout().columns,prefs).find(p=>p.variant!=='contentDetails'&&p.variant!=='partyTogether')!;
        const draw=(showStaffLabels?:boolean)=>renderToStaticMarkup(createElement(CompactGroupedValue,{
          item:row,pair,field:key=>String(row[key]??''),tone:()=>undefined,cvRoomInline:inline,showStaffLabels
        }));
        const visible=draw(),hidden=draw(false);
        expect(visible).toContain('class="compact-pair-tag"');
        expect(hidden).not.toContain('class="compact-pair-tag"');
        expect(hidden).toContain('data-staff-labels="hidden"');
        const fields=(html:string)=>Array.from(html.matchAll(/data-ui-reference-part="([^"]+)"/g),m=>m[1]);
        expect(fields(hidden)).toEqual(fields(visible));
        expect(fields(hidden).sort()).toEqual([...pair.memberFields].sort());
        for(const key of pair.memberFields)expect(hidden).toContain(String(row[key as keyof typeof row]));
      });
    }
  }
  it('print remains source values only without regard to the WebApp flag',()=>{
    expect(printStaffValues(['ubndLeader','vpLeader','room','specialist'],row).map(p=>p.value)).toEqual([
      'PCT Nguyễn Văn A','PCVP Trần Văn B','Phòng Tổng hợp','Lê Văn C']);
    expect(LIST_A4_PRINT_CSS).not.toContain('hdnd-print-staff-tag');
    expect(LIST_A4_PRINT_CSS).not.toContain('showStaffLabels');
  });
});
