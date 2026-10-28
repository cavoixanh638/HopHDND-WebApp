import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {createDemoItems} from '../src/data/demo-items';
import {cellHighlightStyle,defaultItemLayout,type CellHighlightRule} from '../src/data/item-preferences';
import {CompactGroupedValue,compactStageVisualTone} from '../src/features/items/CompactGroupedValue';
import {activeCompactPairs,DEFAULT_COMPACT_DISPLAY} from '../src/features/items/compact-columns';
import type {Item,TextField} from '../shared/types';

const example={...createDemoItems(1)[0],
  department:'Sở mẫu A',type:'QPPL',content:'Dự thảo nghị quyết',
  partyLevel:'Ban Chấp hành',progressParty:'Sở chưa trình',
  progressBuild:'VP đang thực hiện',progressCouncil:'Đã trình HĐND',
  room:'Phòng TC',specialist:'Nguyễn Văn A',ubndLeader:'PCT Nguyễn Văn C',
  vpLeader:'PCVP Trần Văn B'} as Item;
const rules:CellHighlightRule[]=[
  {id:'department',field:'department',word:'Sở mẫu A',textColor:'#FFFFFF',backgroundColor:'#CC0000'},
  {id:'progress',field:'progressBuild',word:'VP đang',textColor:'#000000',backgroundColor:'#FFEE55'},
  {id:'any',field:'*',word:'Ban Chấp hành',textColor:'#FFFFFF',backgroundColor:'#123456'},
];
const draw=(variant:string,ruleList=rules,hidden:string[]=[],inline=false,editing=false)=>{
 const cols=defaultItemLayout().columns.map(c=>({...c,visible:!hidden.includes(c.key)}));
 const group=activeCompactPairs(cols,{...DEFAULT_COMPACT_DISPLAY,teamTogether:true})
   .find(p=>p.variant===variant)!;
 return renderToStaticMarkup(createElement(CompactGroupedValue,{
   item:example,pair:group,field:(key:TextField)=>editing
     ?createElement('button',{className:'cell-picker-trigger'},example[key]):example[key],
   tone:(key:TextField)=>key==='progressParty'?'not-submitted':key==='progressBuild'?'office':'done',
   editable:()=>editing,highlight:(key:TextField)=>cellHighlightStyle(example[key],key,ruleList),
   cvRoomInline:inline
 }));
};
describe('R03: grouped source fields retain independent highlight precedence',()=>{
 it('U01 department rule affects its strong only, not the badge/content or group',()=>{
   const html=draw('contentDetails');
   expect(html).toMatch(/compact-document-department[^>]*style="[^"]*background-color:#CC0000[^"]*"[^>]*>Sở mẫu A/);
   expect(html).not.toMatch(/compact-document-badge[^>]*data-highlighted="true"/);
   expect(html).not.toMatch(/compact-document-content[^>]*data-highlighted="true"/);
 });
 it('U02 wildcard Cấp and specific progressBuild rule affect only their source regions',()=>{
   const html=draw('partyTogether');
   expect(html).toMatch(/compact-stage-level[^>]*background-color:#123456/);
   expect(html).toMatch(/data-progress-tone="office"[^>]*background-color:#FFEE55/);
   expect(html).toMatch(/data-progress-tone="not-submitted"[^>]*>Sở chưa trình/);
   expect(html).not.toMatch(/data-progress-tone="not-submitted"[^>]*data-highlighted="true"/);
 });
 it('disabled/hidden source member cannot leak a rule into visible region',()=>{
   const html=draw('contentDetails',rules,['department']);
   expect(html).not.toContain('Sở mẫu A');
   expect(html).not.toContain('#CC0000');
 });
 it('wildcard and specific match obey existing first-rule priority, including editable member',()=>{
   const both:CellHighlightRule[]=[
     {id:'wild',field:'*',word:'Sở mẫu A',textColor:'#006600',backgroundColor:'#ABCD12'},
     rules[0]
   ];
   const html=draw('contentDetails',both,[],false,true);
   expect(html).toContain('background-color:#ABCD12');
   expect(html).not.toContain('background-color:#CC0000');
   expect(html).toContain('data-highlighted="true"');
   expect(html).toContain('cell-picker-trigger');
 });
 it('U04 combined CV (Phòng) styles each field separately, same as ordinary staff view',()=>{
   const roomRule:CellHighlightRule[]=[
     {id:'room',field:'room',word:'Phòng TC',textColor:'#FFFFFF',backgroundColor:'#CC0000'}
   ];
   for(const inline of [false,true]){
     const html=draw('teamTogether',roomRule,[],inline);
     expect(html).toMatch(/compact-(?:cv-room-name|highlight-member)[^>]*background-color:#CC0000/);
     expect(html).not.toMatch(/compact-stage-row[^>]*background-color:#CC0000/);
   }
 });
});

describe('R05: entire stage frames carry independent visual tones',()=>{
 it('applies source-specific tones to the whole frame, not just the pill',()=>{
   const html=draw('partyTogether');
   expect(html).toMatch(/compact-stage-row"[^>]*data-progress-tone="not-submitted"/);
   expect(html).toMatch(/compact-stage-row"[^>]*data-progress-tone="office"/);
   expect(html).toMatch(/compact-stage-row"[^>]*data-progress-tone="done"/);
   expect(html.match(/class="compact-stage-row"/g)).toHaveLength(3);
   expect(html).toMatch(/compact-stage-row"[^>]*data-progress-tone="office"[^>]*>[\s\S]*?data-progress-tone="office"/);
 });
 it('never treats not-required or unknown stages as done in the UI',()=>{
   expect(compactStageVisualTone('Không phải trình','done')).toBe('neutral');
   expect(compactStageVisualTone('Không phải trình xây dựng NQ','done')).toBe('neutral');
   expect(compactStageVisualTone('Không phải xin ý kiến','done')).toBe('neutral');
   expect(compactStageVisualTone('Không xin ý kiến','done')).toBe('neutral');
   expect(compactStageVisualTone('Đang rà soát',undefined)).toBe('neutral');
   expect(compactStageVisualTone('Đã trình HĐND','done')).toBe('done');
   expect(compactStageVisualTone('Sở chưa trình','not-submitted')).toBe('not-submitted');
   const cols=defaultItemLayout().columns;
   const group=activeCompactPairs(cols,DEFAULT_COMPACT_DISPLAY).find(p=>p.variant==='partyTogether')!;
   const html=renderToStaticMarkup(createElement(CompactGroupedValue,{
     item:{...example,progressParty:'Không phải xin ý kiến',progressBuild:'Không phải trình',progressCouncil:'Đang rà soát'},
     pair:group,field:(key:TextField)=>String(example[key]??''),
     tone:(key:TextField)=>key==='progressCouncil'?undefined:'done',
   }));
   expect(html.match(/data-progress-tone="neutral"/g)).toHaveLength(6);
   expect(html).not.toContain('data-progress-tone="done"');
 });
 it('keeps R03 per-field highlight without tinting a group or its siblings',()=>{
   const html=draw('partyTogether');
   expect(html).toMatch(/compact-stage-row"[^>]*data-progress-tone="office"/);
   expect(html).toMatch(/compact-stage-level[^>]*background-color:#123456/);
   expect(html).toMatch(/compact-stage-state[^>]*data-progress-tone="office"[^>]*background-color:#FFEE55/);
   expect(html).not.toMatch(/compact-stage-row"[^>]*style="[^"]*background-color:#FFEE55/);
   const editable=draw('partyTogether',rules,[],false,true);
   expect(editable).toContain('cell-picker-trigger');
   expect(editable).toMatch(/compact-stage-row"[^>]*data-progress-tone="office"/);
 });
});
