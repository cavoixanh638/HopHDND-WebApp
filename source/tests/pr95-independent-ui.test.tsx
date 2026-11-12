import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {createDemoItems} from '../src/data/demo-items';
import {ReportTable} from '../src/features/reports/ReportTable';
import {DEFAULT_REPORTS,aggregateReport} from '../src/domain/reporting';
import {sortItems} from '../src/domain/sort-items';
import {filterListBySummary,summarizeListItems} from '../src/domain/item-summary';
import type {Item} from '../shared/types';

/**
 * IMPORTANT: This is a SYNTHETIC COMPONENT/PROJECTION test, NOT browser E2E.
 * It cannot establish that App/useFirebase subscribe to the same live epoch.
 * The integration owner must run an actual two-tab browser+Emulator test.
 */
const generation=(epoch:string,count:number):Item[]=>createDemoItems(count).map((row,i)=>({
  ...row,recordId:epoch+'-r'+i,displayCode:'NQ'+(10+i),revision:1,
  archivedAt:null,isDropped:false,documentKind:'NQ' as const,
  department:epoch==='old'?'OLD_EPOCH_DEPARTMENT':'ACTIVE_EPOCH_DEPARTMENT',
  progressCouncil:i===0?'Sở chưa trình':'VP đang thực hiện'
}));

describe('PR95 L3 synthetic List/Report projection by a single supplied generation',()=>{
  const config=DEFAULT_REPORTS.find(x=>x.id==='nq')!;

  it('counts and drills ONLY active-epoch rows, even when codes are reused',()=>{
    const stale=generation('old',3),current=generation('current',2);
    expect(stale[0].displayCode).toBe(current[0].displayCode);
    const summary=summarizeListItems(current);
    const report=aggregateReport(current,config,'department');
    const list=sortItems(current,{key:'displayCode',direction:'asc'});
    expect(summary.total.total).toBe(2);
    expect(report.total).toBe(2);
    expect(list).toHaveLength(2);
    const drill=filterListBySummary(current,{report:'nq',stage:'source'});
    expect(drill.map(item=>item.recordId)).toEqual(['current-r0']);
    for(const row of [...report.items,...list,...drill])
      expect(row.recordId.startsWith('current-')).toBe(true);
    expect([...report.items,...list].some(row=>row.recordId.startsWith('old-')))
      .toBe(false);
  });

  it('SSR report only renders a supplied epoch (component test, not real Chromium)',()=>{
    const current=generation('current',2);
    const markup=renderToStaticMarkup(createElement(ReportTable,{
      items:current,config,group:'department',preview:true,sourceLabel:'Synthetic active generation',
      onSelect:()=>{}
    }));
    expect(markup).toContain('ACTIVE_EPOCH_DEPARTMENT');
    expect(markup).not.toContain('OLD_EPOCH_DEPARTMENT');
    expect(markup).toContain('Sở chưa trình');
  });

  it('a new generation has no implicit permission, history or lease inheritance',()=>{
    const old=generation('old',1)[0];
    const current=generation('current',1)[0];
    expect(old.displayCode).toBe(current.displayCode);
    expect(current.recordId).not.toBe(old.recordId);
    expect(Object.prototype.hasOwnProperty.call(current,'history')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(current,'editProofs')).toBe(false);
    // The Firebase Rules suite independently checks that same-code rights
    // cannot be used to write into the newly active generation.
  });
});
