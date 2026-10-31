import {readFileSync} from 'node:fs';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import type {Item} from '../shared/types';
import {ItemSummaryCards} from '../src/features/items/ItemSummaryCards';
import {SummaryDiagnosticVisibilityProvider} from '../src/features/items/summary-diagnostic-visibility';
import {summarizeListItems,filterListBySummary} from '../src/domain/item-summary';
import {createDemoItems} from '../src/data/demo-items';
import {previewCanEdit} from '../src/qa/pr95-full-preview';

const normal=createDemoItems(3);
const unknownQppl:Item={
  ...normal[0],
  recordId:'l2-unknown-qppl',displayCode:'NQ-UNKNOWN-TEST',stt:999,
  documentKind:'NQ',type:'QPPL',isDropped:false,archivedAt:null,
  progressParty:'Chưa rõ bước Thành ủy',
  progressBuild:'Không xác định bước xây dựng',
  progressCouncil:'Không rõ bước ban hành'
};
// Not an HC fixture: the diagnostic must not disappear by business scope
// normalization introduced by the independent L4/L5 work.
const rows:Item[]=[...normal,unknownQppl];
const props={
  items:rows,selection:null,visibleCount:rows.length,
  kindSelection:null,onSelect:()=>{},onSelectKind:()=>{},onClear:()=>{}
};
const render=(enabled?:boolean)=>{
  const cards=createElement(ItemSummaryCards,props);
  return renderToStaticMarkup(enabled===undefined?cards:
    createElement(SummaryDiagnosticVisibilityProvider,{enabled,children:cards}));
};
const summary=summarizeListItems(rows);
const chipText=(html:string)=>[...html.matchAll(/data-summary-kind="([^"]+)"/g)].map(m=>m[1]);
const stageKeys=(html:string)=>[...html.matchAll(/data-summary-report="(party|build|nq)" data-summary-stage="([^"]+)"/g)]
  .map(m=>m[1]+':'+m[2]);
const stripped=(html:string)=>html.replace(/<p class="item-summary-unmatched" role="note">[\s\S]*?<\/p>/g,'');

describe('PR95 UI V5 L2 — admin-only diagnostics without numeric changes',()=>{
  it('fails closed with no context, and removes all 3 diagnostic notes from DOM for guest',()=>{
    const defaultHtml=render();
    const guestHtml=render(false);
    for(const html of [defaultHtml,guestHtml]){
      expect(html).not.toContain('Chưa chuẩn hóa / ngoài nhóm');
      expect(html).not.toContain('item-summary-unmatched');
      expect(html).not.toContain('role="note"');
      expect((html.match(/data-summary-card="/g)??[])).toHaveLength(4);
      expect((html.match(/class="item-summary-bucket /g)??[])).toHaveLength(11);
      expect(chipText(html)).toEqual(['qppl','hc','bc']);
    }
    expect(guestHtml).toBe(defaultHtml);
  });
  it('shows all 3 notes to admin with exact computed unmatched and totals, including zero',()=>{
    const html=render(true);
    expect((html.match(/class="item-summary-unmatched"/g)??[])).toHaveLength(3);
    for(const stage of summary.stages){
      const block=html.split('data-summary-card="'+stage.id+'"')[1]?.split('</article>')[0];
      expect(block).toBeTruthy();
      expect(block).toContain('Chưa chuẩn hóa / ngoài nhóm: <strong>'+stage.unmatched+'</strong> (thuộc tổng '+stage.total+')');
      expect(stage.unmatchedIds).toContain(unknownQppl.recordId);
    }
  });
  it('does not change any aggregate, percentage, 4–4–3 count, filter ID or source field when roles change',()=>{
    const guest=render(false),admin=render(true);
    expect(stripped(admin)).toBe(guest);
    expect(stageKeys(guest)).toEqual(stageKeys(admin));
    expect(stageKeys(guest).length).toBe(11);
    expect(stageKeys(guest).filter(x=>x.startsWith('party:'))).toHaveLength(4);
    expect(stageKeys(guest).filter(x=>x.startsWith('build:'))).toHaveLength(4);
    expect(stageKeys(guest).filter(x=>x.startsWith('nq:'))).toHaveLength(3);
    for(const stage of summary.stages){
      const total=stage.buckets.reduce((n,b)=>n+b.count,0)+stage.unmatched;
      expect(total).toBe(stage.total);
      for(const bucket of stage.buckets){
        expect(filterListBySummary(rows,{report:stage.id,stage:bucket.stage})
          .map(item=>item.recordId)).toEqual(bucket.ids);
      }
    }
    expect(rows.find(x=>x.recordId===unknownQppl.recordId)?.progressBuild)
      .toBe('Không xác định bước xây dựng');
  });
  it('a guest granted cell-edit permission is still NOT a summary administrator',()=>{
    const grants={columns:{progressParty:true},rows:{},cells:{
      [unknownQppl.recordId]:{note:true}
    }};
    expect(previewCanEdit('guest',grants,unknownQppl.recordId,'note')).toBe(true);
    expect(previewCanEdit('guest',grants,unknownQppl.recordId,'progressParty')).toBe(true);
    expect(render(false)).not.toContain('item-summary-unmatched');
    expect(render(true)).toContain('item-summary-unmatched');
  });
  it('production App derives context ONLY from verified adminTools, preview ONLY synthetic role',()=>{
    const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
    const preview=readFileSync(new URL('../src/qa/pr95-full-preview.tsx',import.meta.url),'utf8');
    const cards=readFileSync(new URL('../src/features/items/ItemSummaryCards.tsx',import.meta.url),'utf8');
    const context=readFileSync(new URL('../src/features/items/summary-diagnostic-visibility.tsx',import.meta.url),'utf8');
    expect(app).toContain('<SummaryDiagnosticVisibilityProvider enabled={adminTools}>');
    expect(app).toContain("common.status==='ready'");
    expect(app).toContain('firebase.connected&&firebase.datasetEpochReady');
    expect(preview).toContain('<SummaryDiagnosticVisibilityProvider enabled={admin}>');
    expect(cards).toContain('useSummaryDiagnosticVisibility()');
    expect(cards).toContain('{showDiagnostics&&<p className="item-summary-unmatched"');
    expect(context).toContain('createContext(false)');
    expect(context).not.toMatch(/localStorage|sessionStorage|canEditCell\s*\(/);
  });
});
