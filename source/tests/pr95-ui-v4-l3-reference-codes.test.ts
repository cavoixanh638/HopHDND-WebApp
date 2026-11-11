import {describe,expect,it} from 'vitest';
import {
  UI_REFERENCE_AREAS,UI_REFERENCE_LEGEND,UI_REFERENCE_REPORT_IDS,
  resolveUiReferenceAnchors,uiReferenceForCell
} from '../src/qa/ui-reference-codes';
import {readFileSync} from 'node:fs';

describe('UI V4 L3 locked semantic codes — no source data / STT / physical index',()=>{
  it('has seven public code families and exact immutable A/B/F/L/P/R registry',()=>{
    expect(UI_REFERENCE_LEGEND.map(x=>x.prefix)).toEqual(['A','B','C','F','L','P','R']);
    expect(Object.keys(UI_REFERENCE_REPORT_IDS)).toEqual(['party','build','council','nq','bc']);
    expect(Object.values(UI_REFERENCE_REPORT_IDS)).toEqual(['R01','R02','R03','R04','R05']);
    expect(UI_REFERENCE_AREAS.map(area=>area.code)).toEqual([
      'A01','A02','A03','B00','B01','B02','B03',
      'C01','C02','C03','F01','F02','F03','F04','F05',
      'L00','L01','L02','L03','L04','L05','L06',
      'P00','P01','P02','P03','P04','P05','P06'
    ]);
    expect(UI_REFERENCE_AREAS.filter(x=>x.code.startsWith('L')).every(x=>
      !/nth-child|textContent|stt|progressParty\s*=/.test(x.selector))).toBe(true);
    expect(UI_REFERENCE_AREAS.find(x=>x.code==='A01')?.selector).toContain('data-ui-reference-nav');
    expect(UI_REFERENCE_AREAS.find(x=>x.code==='L03')?.selector).toContain('data-column-key');
  });
  it('selects all 11 C bucket codes by semantic status key, and five report IDs independent of title/order',()=>{
    const requests:string[]=[];
    const root={querySelector:(s:string)=>{requests.push(s);return ({id:s}) as unknown as Element;}};
    const anchors=resolveUiReferenceAnchors(root as unknown as ParentNode);
    const codes=anchors.map(x=>x.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.filter(x=>x.startsWith('C0')&&x.includes('.'))).toEqual([
      'C01.1','C01.2','C01.3','C01.4','C02.1','C02.2','C02.3','C02.4',
      'C03.1','C03.2','C03.3'
    ]);
    expect(codes.slice(-5)).toEqual(['R01','R02','R03','R04','R05']);
    expect(requests.find(x=>x.includes('[data-summary-report="nq"][data-summary-stage="completed"]'))).toBeTruthy();
    expect(requests.find(x=>x.includes('[data-ui-reference-report="nq"]'))).toBeTruthy();
    expect(requests.every(x=>!x.includes('textContent')&&!x.includes('NQ02')&&!x.includes('STT'))).toBe(true);
  });
  it('does not fabricate a code for a missing/collapsed DOM region',()=>{
    const root={querySelector:(s:string)=>s.includes('data-ui-reference-nav="items"')?({id:'tab'}):null};
    expect(resolveUiReferenceAnchors(root as unknown as ParentNode).map(x=>x.code)).toEqual(['A02']);
  });
  it('uses original field key/step for hovered main and popup cells, ID only when visible',()=>{
    const make=(popup:boolean,field:string,step?:string,id='NQ02')=>{
      const table={matches:(selector:string)=>selector===(popup?'.report-detail-grid':'.item-data-table')};
      const idCell={textContent:id,getClientRects:()=>id?[{width:10}]:[]};
      const row={querySelector:(_selector:string)=>idCell};
      const cell={getAttribute:()=>field,closest:(selector:string)=>
        selector==='table'?table:selector==='tr'?row:null};
      const member={getAttribute:()=>step};
      const target={closest:(selector:string)=>
        selector==='td[data-col-key]'?cell:
        selector==='[data-stage-field]'?(step?member:null):
        selector==='.compact-stage-level'?null:null};
      const root={contains:(value:unknown)=>value===cell};
      return uiReferenceForCell(target as unknown as Element,root as unknown as Element);
    };
    expect(make(false,'partyLevel','progressBuild')).toBe('L03.2 · NQ02');
    expect(make(false,'partyLevel','progressCouncil')).toBe('L03.3 · NQ02');
    expect(make(false,'note')).toBe('L06 · NQ02');
    expect(make(false,'content')).toBe('L02 · NQ02');
    expect(make(true,'partyLevel','progressCouncil')).toBe('P03.3 · NQ02');
    expect(make(true,'content')).toBe('P02 · NQ02');
    expect(make(true,'note',undefined,'')).toBe('P06');
    expect(make(false,'arbitraryField')).toBe('L00');
  });
  it('mounts only for verified admin, ephemeral default OFF and no network/storage flow',()=>{
    const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
    const demo=readFileSync(new URL('../src/qa/pr95-full-preview.tsx',import.meta.url),'utf8');
    const overlay=readFileSync(new URL('../src/qa/ui-reference-codes.tsx',import.meta.url),'utf8');
    const style=readFileSync(new URL('../src/qa/ui-reference-codes.css',import.meta.url),'utf8');
    expect(app).toContain('const referenceCodesVisible=adminTools&&referenceCodesOn');
    expect(app).toContain('if(!adminTools)setReferenceCodesOn(false)');
    expect(app).toContain('aria-pressed={referenceCodesVisible}');
    expect(app).toContain('Hiện mã khu vực');
    expect(demo).toContain('enabled={admin&&referenceCodesOn}');
    expect(demo).toContain("if(next!=='admin')setReferenceCodesOn(false)");
    expect(style).toContain('pointer-events:none!important');
    expect(style).toContain('@media print');
    expect(overlay).not.toMatch(/firebase|localStorage|sessionStorage|fetch\(|XMLHttpRequest|\.write\(/i);
    expect(overlay).toContain("layer.setAttribute('aria-hidden','true')");
    expect(overlay).not.toContain('innerHTML');
  });
});
