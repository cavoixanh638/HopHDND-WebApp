import {describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {
  UI_REFERENCE_AREAS,UI_REFERENCE_LEGEND,UI_REFERENCE_FIELDS,
  UI_REFERENCE_STAGES,UI_REFERENCE_REPORT_IDS,resolveUiReferenceAnchors,
  resolveUiReferenceTarget,uiReferenceForCell,uiReferenceRecordSuffix
} from '../src/qa/ui-reference-codes';

const mockElement=(opts:{
  attrs?:Record<string,string>;classes?:string[];matches?:string[];
  ancestors?:Record<string,any>;children?:Record<string,any>;
})=>{
  const attrs=opts.attrs??{};
  const e={
    getAttribute:(key:string)=>attrs[key]??null,
    matches:(selector:string)=>opts.matches?.some(s=>selector.split(',').includes(s))??false,
    closest:(selector:string)=>{
      if(opts.ancestors?.[selector])return opts.ancestors[selector];
      for(const [match,node] of Object.entries(opts.ancestors??{}))
        if(selector.split(',').some(s=>s.trim()===match))return node;
      return null;
    },
    querySelector:(selector:string)=>opts.children?.[selector]??null,
    contains:(element:unknown)=>Object.values(opts.ancestors??{}).includes(element)||element===e
  };
  return e as unknown as Element;
};

describe('REF 05/11 semantic registry',()=>{
  it('keeps immutable meaning L03/L04/L06 across layout reorder',()=>{
    expect(UI_REFERENCE_FIELDS.partyLevel).toBe('03.1.LEVEL');
    expect(UI_REFERENCE_FIELDS.progressParty).toBe('03.1.STATUS');
    expect(UI_REFERENCE_FIELDS.progressBuild).toBe('03.2.STATUS');
    expect(UI_REFERENCE_FIELDS.progressCouncil).toBe('03.3.STATUS');
    expect(UI_REFERENCE_FIELDS.ubndLeader).toBe('04.1');
    expect(UI_REFERENCE_FIELDS.vpLeader).toBe('04.2');
    expect(UI_REFERENCE_FIELDS.room).toBe('04.3');
    expect(UI_REFERENCE_FIELDS.specialist).toBe('04.4');
    expect(UI_REFERENCE_FIELDS.note).toBe('06.1');
    expect(UI_REFERENCE_FIELDS.department).toBe('02.2');
    expect(UI_REFERENCE_FIELDS.type).toBe('02.3');
    expect(UI_REFERENCE_STAGES).toEqual({
      progressParty:'03.1',progressBuild:'03.2',progressCouncil:'03.3'
    });
    expect(new Set(Object.values(UI_REFERENCE_FIELDS)).size)
      .toBe(Object.keys(UI_REFERENCE_FIELDS).length);
    expect(UI_REFERENCE_AREAS.find(x=>x.code==='L03')?.selector).toContain('data-column-key');
    expect(UI_REFERENCE_AREAS.find(x=>x.code==='L04')?.selector).toContain('data-column-key');
    expect(UI_REFERENCE_AREAS.find(x=>x.code==='L06')?.selector).toContain('data-column-key="note"');
    expect(UI_REFERENCE_AREAS.find(x=>x.code==='P06')?.selector).toContain('data-column-key="note"');
    for(const region of UI_REFERENCE_AREAS)
      expect(region.selector).not.toMatch(/nth-child|nth-of-type|\[data-row-index\]/);
    expect(UI_REFERENCE_LEGEND.map(x=>x.prefix)).toEqual(['A','B','C','F','L','P','R']);
    expect(UI_REFERENCE_REPORT_IDS).toEqual({
      party:'R01',build:'R02',council:'R03',nq:'R04',bc:'R05'
    });
  });

  it('selects semantic stage and report anchors without duplicate codes',()=>{
    const requests:string[]=[];
    const root={querySelector:(s:string)=>{
      requests.push(s);return ({id:s}) as unknown as Element;
    }};
    const anchors=resolveUiReferenceAnchors(root as unknown as ParentNode);
    expect(new Set(anchors.map(x=>x.code)).size).toBe(anchors.length);
    expect(anchors.filter(x=>x.code.startsWith('C0')&&x.code.includes('.'))
      .map(x=>x.code)).toEqual([
        'C01.1','C01.2','C01.3','C01.4',
        'C02.1','C02.2','C02.3','C02.4','C03.1','C03.2','C03.3'
      ]);
    expect(anchors.slice(-5).map(x=>x.code))
      .toEqual(['R01','R02','R03','R04','R05']);
    expect(requests.some(x=>x.includes('data-ui-reference-report="party"'))).toBe(true);
  });

  it('rejects absent recordId rather than inventing a sort/filter-sensitive instance',()=>{
    expect(uiReferenceRecordSuffix(null)).toBeNull();
    expect(uiReferenceRecordSuffix(mockElement({attrs:{}}))).toBeNull();
    expect(uiReferenceRecordSuffix(mockElement({
      attrs:{'data-ui-reference-record-id':'opaque-A_002'}
    }))).toBe('@opaque-A_002');
    expect(uiReferenceRecordSuffix(mockElement({
      attrs:{'data-ui-reference-record-id':'record/42'}
    }))).toBe('@record%2F42');
    expect(uiReferenceRecordSuffix(mockElement({
      attrs:{'data-ui-reference-record-id':''}
    }))).toBeNull();
  });

  it('resolves exact grouped stages and notes from stable ID, not display text',()=>{
    const cases=[
      ['progressParty','L03.1.STATUS@stable-1'],
      ['progressBuild','L03.2.STATUS@stable-1'],
      ['progressCouncil','L03.3.STATUS@stable-1'],
    ];
    for(const [field,code] of cases){
      const table=mockElement({matches:['.item-data-table']});
      const row=mockElement({attrs:{'data-ui-reference-record-id':'stable-1'}});
      const cell=mockElement({attrs:{'data-col-key':'partyLevel'},
        ancestors:{'table':table,'tr':row}});
      const stage=mockElement({attrs:{'data-stage-field':field}});
      const state=mockElement({});
      const target=mockElement({ancestors:{
        'td[data-col-key]':cell,'table':table,
        '[data-stage-field]':stage,'.compact-stage-state':state
      }});
      const root={contains:()=>true} as unknown as Element;
      expect(uiReferenceForCell(target,root)).toBe(code);
    }
    const table=mockElement({matches:['.item-data-table']});
    const row=mockElement({attrs:{'data-ui-reference-record-id':'stable-1'}});
    const cell=mockElement({attrs:{'data-col-key':'note'},
      ancestors:{table,'tr':row}});
    const target=mockElement({ancestors:{'td[data-col-key]':cell,table}});
    expect(uiReferenceForCell(target,{contains:()=>true} as unknown as Element))
      .toBe('L06.1@stable-1');
    const noId=mockElement({attrs:{'data-col-key':'note'},
      ancestors:{table,'tr':mockElement({})}});
    expect(uiReferenceForCell(
      mockElement({ancestors:{'td[data-col-key]':noId,table}}),
      {contains:()=>true} as unknown as Element)).toBeNull();
  });

  it('popup namespace and semantics do not depend on column index',()=>{
    const table=mockElement({matches:['.report-detail-grid']});
    const row=mockElement({attrs:{'data-ui-reference-record-id':'rid-34'}});
    const cell=mockElement({attrs:{'data-col-key':'note'},
      ancestors:{table,'tr':row}});
    const target=mockElement({ancestors:{'td[data-col-key]':cell,table}});
    const root={contains:()=>true} as unknown as Element;
    expect(resolveUiReferenceTarget(target,root)?.code).toBe('P06.1@rid-34');
  });

  it('protects guest and uses an explicit copy action without source-data writes',()=>{
    const app=readFileSync(new URL('../src/app/App.tsx',import.meta.url),'utf8');
    const preview=readFileSync(new URL('../src/qa/pr95-full-preview.tsx',import.meta.url),'utf8');
    const overlay=readFileSync(new URL('../src/qa/ui-reference-codes.tsx',import.meta.url),'utf8');
    const css=readFileSync(new URL('../src/qa/ui-reference-codes.css',import.meta.url),'utf8');
    expect(app).toContain('const referenceCodesVisible=adminTools&&referenceCodesOn');
    expect(app).toContain('if(!adminTools)setReferenceCodesOn(false)');
    expect(preview).toContain('enabled={admin&&referenceCodesOn}');
    expect(preview).toContain("if(next!=='admin')setReferenceCodesOn(false)");
    expect(overlay).toContain('navigator.clipboard.writeText(value)');
    expect(overlay).toContain('data-ui-reference-record-id');
    expect(overlay).toContain('focusin');
    expect(overlay).not.toMatch(/firebase|localStorage|sessionStorage|XMLHttpRequest|\.write\(/i);
    expect(css).toContain('pointer-events:none!important');
    expect(css).toContain('pointer-events:auto!important');
    expect(css).toContain('@media print');
  });
});
