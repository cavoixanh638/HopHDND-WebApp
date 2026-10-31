import {describe,it,expect} from 'vitest';
import * as XLSX from 'xlsx';
import {createDemoItems} from '../src/data/demo-items';
import {createLegacyDemoItemsForTests,legacyUnknownBlankFixtureForTests} from './fixtures/pr95-v4-l4-legacy-demo';
import {OFFICIAL_STATUS_CHOICES,canonicalStatus,isRecognizedStatus} from '../src/domain/status-contract';
import {catalogFromItems} from '../src/data/catalogs';
import {BUSINESS_HEADERS,parseBusinessExcel,inspectBusinessExcel} from '../src/data/business-excel';
import {DEFAULT_REPORTS,aggregateReport,getKpis,reportItems,isActive} from '../src/domain/reporting';
import {summarizeListItems,filterListBySummary,type SummarySelection} from '../src/domain/item-summary';
import {newToolbarState,filterToolbarRows,filterByChips} from '../src/features/items/list-toolbar-filters';
import type {Item} from '../shared/types';

const fields=['partyLevel','progressParty','progressBuild','progressCouncil'] as const;
const stableFields=(item:Item)=>Object.fromEntries(
  Object.entries(item).filter(([key])=>!(fields as readonly string[]).includes(key))
);
const ids=(items:readonly Item[])=>items.map(item=>item.recordId);
const reportCells=(items:Item[],report:typeof DEFAULT_REPORTS[number])=>{
  const r=aggregateReport(items,report,'department');
  return {
    columns:r.columns,unknown:r.unknown,hiddenCount:r.hiddenCount,
    total:r.total,completedCount:r.completedCount,percent:r.percent,
    group:Object.fromEntries([...r.rows].map(([group,cells])=>[
      group,Object.fromEntries([...cells].map(([status,rows])=>[status,ids(rows)]))
    ]))
  };
};

describe('PR95 UI V4 L4 — default synthetic demo uses approved current status labels',()=>{
  it.each([0,1,4,5,8,24,27,65,128])('all four fields belong to canonical menus for %i demo records',count=>{
    const rows=createDemoItems(count);
    expect(rows).toHaveLength(count);
    const menu=catalogFromItems(rows);
    for(const item of rows){
      for(const field of fields){
        expect(OFFICIAL_STATUS_CHOICES[field],item.recordId+' '+field)
          .toContain(item[field]);
        expect(canonicalStatus(field,item[field])).toBe(item[field]);
        expect(isRecognizedStatus(field,item[field])).toBe(true);
        expect(menu.options[field]).toEqual(OFFICIAL_STATUS_CHOICES[field]);
      }
    }
    // Even the largest fixture retains unique, predictable technical IDs.
    expect(new Set(ids(rows)).size).toBe(count);
    expect(rows.every((r,i)=>r.stt===i+1)).toBe(true);
  });

  it('keeps each ordinal status/meaning, including not-required and unfinished build, without adding done data',()=>{
    const rows=createDemoItems(8);
    expect(rows.map(item=>[item.partyLevel,item.progressParty,item.progressBuild,item.progressCouncil]))
      .toEqual([
        ['BCH','Sở chưa trình','Không phải trình','Sở chưa trình'],
        ['BTV TU','VP đang xử lý','Sở chưa trình','VP đang xử lý'],
        ['TTTU','Đã gửi ĐU','VP đang xử lý','Hoàn thành'],
        ['BCH','ĐU gửi TU, chưa họp','Đã trình, chờ QĐ','Sở chưa trình'],
        ['Không phải trình','Không phải trình','Không phải trình','VP đang xử lý'],
        ['TTTU','Đã có TBKL','Sở chưa trình','Hoàn thành'],
        ['BCH','Sở chưa trình','VP đang xử lý','Sở chưa trình'],
        ['BTV TU','VP đang xử lý','Đã trình, chờ QĐ','VP đang xử lý'],
      ]);
    expect(rows[7].isDropped).toBe(true);
    expect(rows.every(item=>item.progressBuild!=='Đã có QĐ')).toBe(true);
  });

  it.each([0,1,3,8,23,24,27,52,120])('preserves all non-status properties and field-scoped meanings for %i rows',count=>{
    const current=createDemoItems(count),legacy=createLegacyDemoItemsForTests(count);
    expect(current).toHaveLength(legacy.length);
    for(let i=0;i<current.length;i++){
      expect(stableFields(current[i])).toEqual(stableFields(legacy[i]));
      for(const field of fields)
        expect(canonicalStatus(field,legacy[i][field]),legacy[i].recordId+' '+field)
          .toBe(current[i][field]);
    }
    expect(ids(current)).toEqual(ids(legacy));
    expect(current.map(item=>item.documentKind)).toEqual(legacy.map(item=>item.documentKind));
    expect(current.map(item=>item.type)).toEqual(legacy.map(item=>item.type));
    expect(current.map(item=>[item.isDropped,item.archivedAt])).toEqual(
      legacy.map(item=>[item.isDropped,item.archivedAt]));
  });

  it('retains the 27-row total/active IDs, all reports, stages, completion numerators and exact filter IDs',()=>{
    const current=createDemoItems(27),legacy=createLegacyDemoItemsForTests(27);
    expect(current).toHaveLength(27);
    expect(ids(current.filter(isActive))).toEqual(ids(legacy.filter(isActive)));
    expect(ids(current.filter(isActive))).toHaveLength(23);
    expect(getKpis(current)).toEqual(getKpis(legacy));
    expect(summarizeListItems(current)).toEqual(summarizeListItems(legacy));
    for(const config of DEFAULT_REPORTS){
      expect(reportCells(current,config)).toEqual(reportCells(legacy,config));
      expect(ids(reportItems(current,config))).toEqual(ids(reportItems(legacy,config)));
    }
    for(const stage of summarizeListItems(current).stages)
      for(const bucket of stage.buckets){
        const selector:SummarySelection={report:stage.id,stage:bucket.stage};
        expect(ids(filterListBySummary(current,selector))).toEqual(bucket.ids);
        expect(ids(filterListBySummary(current,selector)))
          .toEqual(ids(filterListBySummary(legacy,selector)));
        for(const kind of ['qppl','hc','bc'] as const)
          expect(ids(filterByChips(current,kind,selector)))
            .toEqual(ids(filterByChips(legacy,kind,selector)));
      }
    // Canonical detail selectors must filter old aliases and current labels identically.
    for(const field of fields){
      for(const value of OFFICIAL_STATUS_CHOICES[field]){
        const toolbar=newToolbarState();
        toolbar.details[field]=value;
        expect(ids(filterToolbarRows(current,toolbar)))
          .toEqual(ids(filterToolbarRows(legacy,toolbar)));
      }
    }
  });

  it('keeps old aliases, ambiguous and blank source records in NEGATIVE TEST fixtures only',()=>{
    const legacy=createLegacyDemoItemsForTests(27);
    expect(legacy.some(item=>item.partyLevel==='Ban Chấp hành')).toBe(true);
    expect(legacy.some(item=>item.progressCouncil==='VP đang thực hiện')).toBe(true);
    expect(legacy.some(item=>item.progressParty==='ĐU đã gửi TU, chưa họp')).toBe(true);
    expect(legacy.some(item=>item.progressBuild==='Đã trình HĐND, chưa có QĐ')).toBe(true);
    const negative=legacyUnknownBlankFixtureForTests();
    expect(negative).toHaveLength(3);
    for(const field of fields){
      expect(negative[0][field]).toBeTruthy();
      expect(isRecognizedStatus(field,negative[0][field])).toBe(false);
      expect(canonicalStatus(field,negative[0][field])).toBe(negative[0][field]);
      expect(negative[1][field]).toBe('');
      expect(isRecognizedStatus(field,negative[1][field])).toBe(false);
    }
    expect(canonicalStatus('partyLevel',negative[2].partyLevel)).toBe('BCH');
    expect(canonicalStatus('progressParty',negative[2].progressParty))
      .toBe('Đã xin ý kiến, chờ TBKL');
    expect(canonicalStatus('progressBuild',negative[2].progressBuild)).toBe('Đã có QĐ');
    expect(canonicalStatus('progressCouncil',negative[2].progressCouncil)).toBe('Hoàn thành');
    expect(getKpis([negative[0]]).completed).toBe(0);
    expect(negative[0].progressCouncil).toBe('Đã xử lý xong');
    expect(negative[2].progressCouncil).toBe('Đã trình HĐND TP'); // raw fixture unchanged
    expect(createDemoItems(27).some(item=>fields.some(field=>
      !isRecognizedStatus(field,item[field])))).toBe(false);
  });

  it('validates synthetic A–O workbook round-trip without altering IDs/STT/type or introducing a legacy status',()=>{
    const seed=createDemoItems(7);
    const header=[...BUSINESS_HEADERS];
    const excelRow=(item:Item)=>[
      item.displayCode,item.stt,item.content,item.department,item.documentKind==='BC'?'BC':item.type,
      item.partyLevel,item.progressParty,item.progressBuild,item.progressCouncil,
      item.specialist,item.room,item.vpLeader,item.ubndLeader,item.specificProgress,item.note
    ];
    const workbook=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,XLSX.utils.aoa_to_sheet([header,...seed.map(excelRow)]),'Demo V4');
    const bytes=new Uint8Array(XLSX.write(workbook,{type:'array',bookType:'xlsx'}) as ArrayBuffer);
    expect(inspectBusinessExcel(bytes).validSheets).toEqual(['Demo V4']);
    const parsed=parseBusinessExcel(bytes,'Demo V4');
    expect(parsed.count).toBe(seed.length);
    for(let i=0;i<seed.length;i++){
      const actual=parsed.items[i],original=seed[i];
      expect(actual.displayCode).toBe(original.displayCode);
      expect(actual.stt).toBe(original.stt);
      expect(actual.documentKind).toBe(original.documentKind);
      expect(actual.recordId).toMatch(/^x-/); // separate, stable import ID contract
      for(const field of fields)expect(actual[field]).toBe(original[field]);
      expect(actual.content).toBe(original.content);
      expect(actual.note).toBe(original.note);
    }
  });
});
