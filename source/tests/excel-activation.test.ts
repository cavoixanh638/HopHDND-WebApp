import {describe,it,expect,vi} from 'vitest';
import setupSource from '../server/EnableExcel.gs?raw';
import manifest from '../server/enable-excel.appsscript.json';
const original={spreadsheetId:'1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp',gid:'60961344',url:'https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344'};
function setup(options:{denied?:boolean;wrongSource?:boolean;wrongActor?:boolean;wrongMime?:boolean;existing?:boolean;http403?:boolean}={}){
  const values=new Map<string,string>();if(options.existing)values.set('HDND_EXCEL_REGISTRY','existing');
  const calls:{url:string;method:string}[]=[];let count=0;
  const token=vi.fn(()=> 'FAKE_TEST_TOKEN'),released=vi.fn();
  const api=new Function('ScriptApp','sourceFromUrl_','PropertiesService','UrlFetchApp','LockService','Utilities','HDNDExcelService',setupSource+';return prepareDashboardExcelStorage;')(
    {AuthMode:{FULL:'full'},requireScopes:()=>{if(options.denied)throw new Error('scope required');},getOAuthToken:token},
    ()=>options.wrongSource?{...original,spreadsheetId:'wrong'}:original,
    {getScriptProperties:()=>({getProperty:(key:string)=>values.get(key)??null,setProperty:(key:string,value:string)=>values.set(key,value)})},
    {fetch:(url:string,request:any)=>{
      calls.push({url,method:request.method});let value:unknown;
      if(options.http403&&url.includes('/about?'))return{getResponseCode:()=>403,getContentText:()=>JSON.stringify({error:{errors:[{reason:'accessNotConfigured'}]}})};
      if(url.includes('/about?'))value={user:{emailAddress:options.wrongActor?'wrong@example.invalid':'phucpixel2025@gmail.com'}};
      else if(url.includes('/files/'+original.spreadsheetId))value={id:original.spreadsheetId,mimeType:options.wrongMime?'application/vnd.google-apps.spreadsheet':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',labels:{trashed:false},userPermission:{role:'writer'}};
      else {expect(request.method).toBe('post');expect(JSON.parse(request.payload).mimeType).toBe('application/vnd.google-apps.folder');value={id:'private-folder-'+(++count)};}
      return{getResponseCode:()=>200,getContentText:()=>JSON.stringify(value)};
    }},{getScriptLock:()=>({tryLock:()=>true,releaseLock:released})},{getUuid:()=> 'fixture-id'},{enabled:()=>true},
  );
  return{api,calls,values,token,released};
}
function checkConnection(){
  const calls:string[]=[],logs:unknown[]=[];
  const save=vi.fn(()=>{calls.push('save');});
  const fetch=vi.fn(()=>{calls.push('http');});
  const api=new Function('sourceFromUrl_','getDashboardSourceStatus','getDashboardData','getDashboardConfig','saveDashboardData','UrlFetchApp','console',setupSource+';return checkDashboardExcelConnection;')(
    ()=>original,
    (source:unknown)=>{calls.push('status');expect(source).toEqual(original);return{backendReady:true,actorLabel:'Chỉ huy'};},
    (source:unknown)=>{calls.push('snapshot');expect(source).toEqual(original);return{items:[{},{}],warnings:['cảnh báo']};},
    (source:unknown)=>{calls.push('config');expect(source).toEqual(original);return{revision:7};},
    save,{fetch},{log:(value:unknown)=>logs.push(value)},
  );
  return{result:api(),calls,logs,save,fetch};
}
describe('main activation overlay, fake Google only (never invoked on source)',()=>{
  it('preserves USER_ACCESSING/MYSELF and explicitly includes new scopes',()=>{expect(manifest.webapp).toEqual({executeAs:'USER_ACCESSING',access:'MYSELF'});expect(manifest.oauthScopes).toContain('https://www.googleapis.com/auth/drive');});
  it('only reads source metadata, creates private folders and registers its fixed source; never uploads workbook',()=>{
    const test=setup();expect(test.api()).toMatchObject({prepared:true});expect(test.calls.filter(c=>c.method==='post')).toHaveLength(2);expect(test.calls.some(c=>c.url.includes('/upload/')||c.method==='put'||c.method==='patch')).toBe(false);
    expect(JSON.parse(test.values.get('HDND_EXCEL_REGISTRY')!)).toMatchObject({source:original,sheetName:'Sheet1',backupFolderId:'private-folder-1',journalFolderId:'private-folder-2',ownerEmail:'phucpixel2025@gmail.com'});expect(test.released).toHaveBeenCalledOnce();
  });
  it.each([{denied:true},{wrongSource:true},{wrongActor:true},{wrongMime:true}])('does not configure or create storage when a guard fails %j',options=>{
    const test=setup(options);expect(()=>test.api()).toThrow();expect(test.values.has('HDND_EXCEL_REGISTRY')).toBe(false);expect(test.calls.some(c=>c.method==='post')).toBe(false);if(options.denied)expect(test.token).not.toHaveBeenCalled();
  });
  it('does not replace an existing registry or create another set of folders',()=>{const test=setup({existing:true});expect(test.api()).toEqual({alreadyPrepared:true});expect(test.values.get('HDND_EXCEL_REGISTRY')).toBe('existing');expect(test.calls.some(c=>c.method==='post')).toBe(false);});
  it('reports a filtered API 403 reason without creating a registry or storage',()=>{
    const test=setup({http403:true});
    expect(()=>test.api()).toThrow(/HTTP 403 \(accessNotConfigured\)/);
    expect(test.values.has('HDND_EXCEL_REGISTRY')).toBe(false);
    expect(test.calls).toHaveLength(1);
    expect(test.calls[0].url).toContain('/about?');
    expect(test.calls.some(c=>c.method==='post')).toBe(false);
  });
  it('checks connection read-only and logs only status, count, warnings and config revision',()=>{
    const test=checkConnection();
    expect(test.result).toEqual({backendReady:true,actor:'Chỉ huy',count:2,warnings:1,configRevision:7});
    expect(test.calls).toEqual(['status','snapshot','config']);
    expect(test.save).not.toHaveBeenCalled();
    expect(test.fetch).not.toHaveBeenCalled();
    expect(test.logs).toEqual([JSON.stringify(test.result)]);
  });
});
