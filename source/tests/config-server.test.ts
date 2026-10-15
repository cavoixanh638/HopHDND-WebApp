import {describe,it,expect,vi} from 'vitest';
import serverSource from '../server/Code.gs?raw';
import * as core from '../src/data/shared-config';
import {parseSheetConfig} from '../src/data/sheet-config';
import {catalogFromItems} from '../src/data/catalogs';
import {createDemoItems} from '../src/data/demo-items';
import {defaultReportLayout} from '../src/data/report-preferences';
import {defaultItemLayout} from '../src/data/item-preferences';
const source=parseSheetConfig('https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344');
const profile=()=>({catalogs:catalogFromItems(createDemoItems(3)),reports:defaultReportLayout(),items:defaultItemLayout()});
function server(serviceUrl='https://script.google.com/macros/s/FAKE_TEST_DEPLOY/exec'){
  const rows:unknown[][]=[['source','revision','part','parts','payload','updatedAt','operationId','committed']];
  let failCommit=false,released=0,locked=true;
  const sheet={getLastRow:()=>rows.length,getMaxRows:()=>1000,insertRowsAfter:()=>{},getRange:(start:number,column:number,count=1,width=1)=>({getValues:()=>Array.from({length:count},(_,i)=>rows[start-1+i].slice(column-1,column-1+width)),setValues:(values:unknown[][])=>{values.forEach((row,i)=>{rows[start-1+i]=[...row];});},setValue:(value:unknown)=>{if(failCommit)throw new Error('write failed');rows[start-1][column-1]=value;}})};
  const env={HDNDConfigCore:{...core,parseSheetConfig},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},ScriptApp:{getService:()=>({getUrl:()=>serviceUrl})},LockService:{getScriptLock:()=>({tryLock:()=>locked,releaseLock:()=>{released++;}})}};
  const api= new Function('HDNDConfigCore','SpreadsheetApp','ScriptApp','LockService',serverSource+'\nreturn {getDashboardConfig,saveDashboardConfig};')(env.HDNDConfigCore,env.SpreadsheetApp,env.ScriptApp,env.LockService) as {getDashboardConfig:(value:unknown)=>core.SharedConfig|null;saveDashboardConfig:(value:unknown)=>core.SharedConfig};
  return {api,rows,setFail:(value:boolean)=>{failCommit=value;},setLock:(value:boolean)=>{locked=value;},released:()=>released};
}
function init(test:ReturnType<typeof server>){return test.api.saveDashboardConfig({source,section:'all',value:profile(),baseRevision:0,operationId:'initialize-test-123'});}
describe('Apps Script config service, fake Google services (not a deployment test)',()=>{
  it('keeps a valid public deployment link when saving from the private dev preview',()=>{const test=server('https://script.google.com/macros/s/FAKE_DEV/dev');const first=init(test);expect(first.editorUrl).toMatch(/\/exec$/);expect(first.editorUrl).not.toMatch(/\/dev$/);expect(test.api.saveDashboardConfig({source,section:'items',value:{...first.items,frameWidth:800},baseRevision:1,operationId:'dev-frame-test-123'}).editorUrl).toBe(first.editorUrl);});
  it('reads and saves without browser URL APIs and rejects inconsistent source fields',()=>{
    vi.stubGlobal('URL',undefined);vi.stubGlobal('URLSearchParams',undefined);
    try {const test=server();expect(test.api.getDashboardConfig(source)).toBeNull();expect(init(test).revision).toBe(1);
      expect(()=>test.api.getDashboardConfig({...source,url:'https://evil.example/'})).toThrow(/Nguồn/);
      expect(()=>test.api.getDashboardConfig({...source,spreadsheetId:'another-source-id'})).toThrow(/Nguồn/);
    }finally{vi.unstubAllGlobals();}
  });
  it('initializes only complete profile and publishes a readable revision',()=>{const test=server();expect(test.api.getDashboardConfig(source)).toBeNull();const result=init(test);expect(result.revision).toBe(1);expect(result.editorUrl).toMatch(/script.google.com/);expect(test.api.getDashboardConfig(source)).toEqual(result);expect(test.released()).toBe(1);});
  it('saves one section preserving every other section',()=>{const test=server(),first=init(test);const items={...first.items,tableWidth:1100};const result=test.api.saveDashboardConfig({source,section:'items',value:items,baseRevision:1,operationId:'resize-test-123'});expect(result.revision).toBe(2);expect(result.items.tableWidth).toBe(1100);expect(result.catalogs).toEqual(first.catalogs);expect(result.reports).toEqual(first.reports);});
  it('rejects concurrent stale revision without overwriting',()=>{const test=server();init(test);expect(()=>test.api.saveDashboardConfig({source,section:'items',value:defaultItemLayout(),baseRevision:0,operationId:'stale-test-123'})).toThrow(/người khác sửa/);expect(test.api.getDashboardConfig(source)?.revision).toBe(1);expect(test.released()).toBe(2);});
  it('ignores interrupted chunks and keeps committed old revision',()=>{const test=server(),first=init(test);test.setFail(true);expect(()=>test.api.saveDashboardConfig({source,section:'items',value:{...first.items,tableWidth:1000},baseRevision:1,operationId:'failed-write-123'})).toThrow('write failed');expect(test.api.getDashboardConfig(source)?.revision).toBe(1);test.setFail(false);const saved=test.api.saveDashboardConfig({source,section:'items',value:{...first.items,tableWidth:1200},baseRevision:1,operationId:'retry-new-write-123'});expect(saved.revision).toBe(2);expect(saved.items.tableWidth).toBe(1200);});
  it('replays confirmed operation without appending and rejects changed payload',()=>{const test=server();const first=init(test),length=test.rows.length;expect(init(test).revision).toBe(1);expect(test.rows.length).toBe(length);expect(()=>test.api.saveDashboardConfig({source,section:'all',value:{...profile(),items:{...first.items,tableWidth:1000}},baseRevision:0,operationId:'initialize-test-123'})).toThrow(/nội dung khác/);});
  it('rejects wrong source, invalid sections, invalid widths and a held lock',()=>{const test=server(),first=init(test);expect(()=>test.api.getDashboardConfig({...source,gid:'99'})).toThrow(/Nguồn/);expect(()=>test.api.saveDashboardConfig({source,section:'content',baseRevision:1,operationId:'invalid-test-123'})).toThrow(/không hợp lệ/);expect(()=>test.api.saveDashboardConfig({source,section:'items',value:{...first.items,tableWidth:0},baseRevision:1,operationId:'invalid-width-123'})).toThrow(/600/);test.setLock(false);expect(()=>test.api.saveDashboardConfig({source,section:'items',value:first.items,baseRevision:1,operationId:'locked-test-123'})).toThrow(/đang lưu/);expect(test.api.getDashboardConfig(source)?.revision).toBe(1);});
});

describe('read-only source probe and older-client protection',()=>{it('does not write when native Sheets access to the source fails',()=>{const env={openById:()=>{throw new Error('not native Sheets');}};const api=new Function('SpreadsheetApp',serverSource+';return {getDashboardSourceStatus};')(env);expect(api.getDashboardSourceStatus(source)).toMatchObject({backendReady:false,canOpenAsSheets:false});expect(()=>api.getDashboardSourceStatus({...source,gid:'99'})).toThrow(/Nguồn/);});it('does not silently lose the new frame setting when an old client sends only table width',()=>{const test=server();init(test);const items=defaultItemLayout();delete items.frameWidth;expect(()=>test.api.saveDashboardConfig({source,section:'items',value:items,baseRevision:1,operationId:'old-client-123'})).toThrow(/Bản app cũ/);expect(test.api.getDashboardConfig(source)?.revision).toBe(1);});});
