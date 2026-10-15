import {describe,it,expect} from 'vitest';
import {createHash} from 'node:crypto';
import coreSource from '../server/ExcelWriteCore.gs?raw';
import engineSource from '../server/ExcelTransactions.gs?raw';
import serviceSource from '../server/ExcelService.gs?raw';
import {parseGvizPayload} from '../src/data/gviz-parser';
import {assignmentIssue} from '../src/data/catalogs';

// Google HTTP and ZIP are fakes. The actual codec, parser and transaction engine
// run together; these checks do not substitute for an Apps Script deployment.
const MIME='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
class BlobFake {
  constructor(public text:string,public mime='application/octet-stream',public name=''){}
  getBytes(){return [...new TextEncoder().encode(this.text)];}
  getContentType(){return this.mime;}
  getName(){return this.name;}
  getDataAsString(){return this.text;}
  copyBlob(){return new BlobFake(this.text,this.mime,this.name);}
  setContentType(mime:string){this.mime=mime;return this;}
}
function fixture(){return {
  'xl/workbook.xml':'<workbook><sheets><sheet name="Dữ liệu" r:id="r1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships><Relationship Id="r1" Type="x/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':'<worksheet><sheetData><row r="1"><c r="C1" t="inlineStr"><is><t>Nội dung</t></is></c><c r="D1" t="inlineStr"><is><t>Sở</t></is></c></row><row r="4"><c r="A4" t="inlineStr"><is><t>NQ1</t></is></c><c r="B4"><v>1</v></c><c r="C4" t="inlineStr"><is><t>Nội dung cũ</t></is></c><c r="J4" s="4" t="inlineStr"><is><t>Nguyễn A</t></is></c><c r="K4" t="inlineStr"><is><t>Tổng hợp</t></is></c></row><row r="5"><c r="A5" t="inlineStr"><is><t>NQ2</t></is></c><c r="C5" t="inlineStr"><is><t>Nội dung khác</t></is></c></row></sheetData></worksheet>',
  'xl/worksheets/report.xml':'<worksheet><sheetData><row r="1"><c r="A1"><f>COUNTA(A:A)</f><v>2</v></c></row></sheetData></worksheet>',
  'xl/styles.xml':'<styleSheet><cellXfs/></styleSheet>',
};}
type File={id:string;title:string;mimeType:string;etag:string;blob:BlobFake;parent?:string;permissions:{type:string;role:string}[];labels:{trashed:boolean};userPermission:{role:string}};
function harness(options:{disabled?:boolean;wrongActor?:boolean;deniedScope?:boolean;publicFolder?:boolean;failBackup?:boolean;race?:boolean;lostReply?:boolean;readbackMismatch?:boolean;sharedCatalog?:unknown;hideCreatedFromList?:boolean}={}){
  const source={spreadsheetId:'fake-excel-source-001',gid:'123',url:'https://docs.google.com/spreadsheets/d/fake-excel-source-001/edit?gid=123'};
  const owner='owner@example.invalid',backupId='backup-folder-fake',journalId='journal-folder-fake';
  const registry={enabled:!options.disabled,source,sheetName:'Dữ liệu',ownerEmail:owner,backupFolderId:backupId,journalFolderId:journalId};
  const properties=new Map<string,string>(options.disabled?[]:[['HDND_EXCEL_REGISTRY',JSON.stringify(registry)]]);
  const files=new Map<string,File>();let counter=0,sourceWrites=0,tokenCalls=0,released=0;
  const calls:{url:string;method:string}[]=[];
  const make=(id:string,title:string,mime:string,blob=new BlobFake('',mime),parent?:string):File=>({id,title,mimeType:mime,etag:'e0',blob,parent,permissions:[{type:'user',role:'owner'}],labels:{trashed:false},userPermission:{role:'owner'}});
  files.set(source.spreadsheetId,make(source.spreadsheetId,'Fake source',MIME,new BlobFake(JSON.stringify(fixture()),MIME)));
  files.set(backupId,make(backupId,'Backup','application/vnd.google-apps.folder'));
  files.set(journalId,make(journalId,'Journal','application/vnd.google-apps.folder'));
  if(options.publicFolder)files.get(journalId)!.permissions.push({type:'anyone',role:'reader'});
  const response=(status:number,value:unknown,blob?:BlobFake)=>({getResponseCode:()=>status,getContentText:()=>JSON.stringify(value),getBlob:()=>blob!.copyBlob()});
  const fetch=(url:string,request:any)=>{
    const parsed=new URL(url),method=request.method??'get';calls.push({url,method});
    if(parsed.pathname.endsWith('/about'))return response(200,{user:{emailAddress:options.wrongActor?'wrong@example.invalid':owner}});
    const id=parsed.pathname.match(/\/files\/([^/]+)$/)?.[1];
    if(!id&&method==='get'){
      const q=parsed.searchParams.get('q')??'',parent=q.match(/^'([^']+)' in parents/)?.[1],title=q.match(/title = '([^']+)'/)?.[1];
      return response(200,{items:options.hideCreatedFromList?[]:[...files.values()].filter(f=>f.parent===parent&&!f.labels.trashed&&(title?f.title===title:f.title.startsWith('batch_'))).map(f=>({id:f.id,etag:f.etag,mimeType:f.mimeType,title:f.title}))});
    }
    if(!id&&method==='post'){
      if(options.failBackup)return response(500,{});
      const body=new TextDecoder().decode(new Uint8Array(request.payload)),boundary=request.contentType.split('boundary=')[1];
      const segments=body.split('--'+boundary),meta=JSON.parse(segments[1].split('\r\n\r\n')[1].trim()),data=segments[2].slice(segments[2].indexOf('\r\n\r\n')+4,-2);
      const file=make('created-file-'+(++counter),meta.title,meta.mimeType,new BlobFake(data,meta.mimeType),meta.parents[0].id);files.set(file.id,file);return response(200,{id:file.id,mimeType:file.mimeType,etag:file.etag});
    }
    const file=files.get(id!);if(!file)return response(404,{});
    if(method==='get')return parsed.searchParams.get('alt')==='media'?{...response(200,null,file.blob),getContentText:()=>file.blob.text}:response(200,{...file,parents:file.parent?[{id:file.parent}]:[]});
    if(method==='put'){
      if(id===source.spreadsheetId){sourceWrites++;if(options.race){file.etag='external-edit';return response(412,{});}}
      if(request.headers['If-Match']!==file.etag)return response(412,{});
      file.blob=request.payload.copyBlob();file.etag='e'+(++counter);
      if(id===source.spreadsheetId&&options.readbackMismatch)file.blob=new BlobFake(JSON.stringify(fixture()),MIME);
      if(id===source.spreadsheetId&&options.lostReply)throw new Error('Lost transport reply');
      return response(200,{id:file.id,etag:file.etag,mimeType:file.mimeType});
    }
    throw new Error('Unexpected fake endpoint '+method+' '+url);
  };
  const Utilities={
    DigestAlgorithm:{SHA_256:'sha256'},getUuid:()=> 'fake-uuid-001',
    newBlob:(value:string|number[],mime?:string,name?:string)=>new BlobFake(typeof value==='string'?value:new TextDecoder().decode(new Uint8Array(value)),mime,name),
    computeDigest:(_algorithm:string,bytes:number[])=>[...createHash('sha256').update(new Uint8Array(bytes)).digest()],
    unzip:(blob:BlobFake)=>Object.entries(JSON.parse(blob.text)).map(([name,text])=>new BlobFake(text as string,'application/xml',name)),
    zip:(parts:BlobFake[],name:string)=>new BlobFake(JSON.stringify(Object.fromEntries(parts.map(p=>[p.name,p.text]))),'application/zip',name),
  };
  const api=new Function('PropertiesService','ScriptApp','UrlFetchApp','Utilities','XmlService','LockService','HDNDConfigCore','getDashboardConfig',coreSource+'\n'+engineSource+'\n'+serviceSource+'\nreturn HDNDExcelService;')(
    {getScriptProperties:()=>({getProperty:(key:string)=>properties.get(key)??null,setProperty:(key:string,value:string)=>{properties.set(key,value);}})},
    {AuthMode:{FULL:'full'},requireScopes:()=>{if(options.deniedScope)throw new Error('Scopes required');},getOAuthToken:()=>{tokenCalls++;return 'TEST_TOKEN_NEVER_OUTPUT';}},
    {fetch},Utilities,{parse:()=>{}},{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{released++;}})},{parseGvizPayload,assignmentIssue},()=>options.sharedCatalog?{catalogs:options.sharedCatalog}:null,
  );
  const patch=()=>({recordId:source.spreadsheetId+':123:row:4',code:'NQ1',baseRevision:0,operationId:'fake-operation-001',baseValues:{specialist:'Nguyễn A'},changes:{specialist:'Nguyễn Văn Kỳ'}});
  return {api,source,files,patch,calls,counts:()=>({sourceWrites,tokenCalls,released})};
}
describe('ExcelService + real codec/parser/transaction with fake Google transport',()=>{
  it('saves a specialist, preserves other cells/parts, reads back, audits and replays without another write',()=>{
    const test=harness();const before=JSON.parse(test.files.get(test.source.spreadsheetId)!.blob.text);
    expect(test.api.list(test.source).items[0].specialist).toBe('Nguyễn A');
    const result=test.api.save(test.source,[test.patch()]);
    expect(result.results[0]).toMatchObject({ok:true,item:{recordId:test.patch().recordId,displayCode:'NQ1',specialist:'Nguyễn Văn Kỳ'}});
    const after=JSON.parse(test.files.get(test.source.spreadsheetId)!.blob.text);
    expect(after['xl/worksheets/report.xml']).toBe(before['xl/worksheets/report.xml']);expect(after['xl/styles.xml']).toBe(before['xl/styles.xml']);
    expect(after['xl/worksheets/sheet1.xml']).toContain('Nội dung khác');expect(after['xl/worksheets/sheet1.xml']).toContain('s="4"');
    expect(test.api.history(test.source,'NQ1')).toEqual([expect.objectContaining({changes:{specialist:'Nguyễn Văn Kỳ'},oldValues:{specialist:'Nguyễn A'}})]);
    expect(test.api.save(test.source,[test.patch()])).toEqual(result);expect(test.counts().sourceWrites).toBe(1);
    expect([...test.files.values()].some(f=>f.title.startsWith('before_')&&f.blob.text===JSON.stringify(before))).toBe(true);
  });
  it('resolves a lost reply only when the source blob matches the intended package',()=>{
    const test=harness({lostReply:true});expect(test.api.save(test.source,[test.patch()]).results[0].ok).toBe(true);expect(test.counts().sourceWrites).toBe(1);
  });
  it('retains uncertain receipts and does not reissue PUT after mismatched readback',()=>{
    const test=harness({readbackMismatch:true});expect(()=>test.api.save(test.source,[test.patch()])).toThrow(/Chưa xác định/);expect(()=>test.api.save(test.source,[test.patch()])).toThrow(/Chưa xác định/);expect(test.counts().sourceWrites).toBe(1);
  });
  it('rejects an intervening Office edit with 412 and leaves values unchanged',()=>{
    const test=harness({race:true});expect(test.api.save(test.source,[test.patch()]).results[0]).toMatchObject({ok:false,error:'CONFLICT'});expect(test.api.list(test.source).items[0].specialist).toBe('Nguyễn A');
  });
  it('checks changed baselines before backup/upload and rejects displayed aliases or readonly fields',()=>{
    const test=harness();expect(()=>test.api.save(test.source,[{...test.patch(),baseValues:{specialist:'other'}}])).toThrow(/Record conflict/);
    expect(()=>test.api.save(test.source,[{...test.patch(),code:'NQ01'}])).toThrow(/missing or duplicated/);
    expect(()=>test.api.save(test.source,[{...test.patch(),baseValues:{stt:1},changes:{stt:2}}])).toThrow(/not editable/);
    expect(test.calls.some(c=>c.method==='post'||c.method==='put')).toBe(false);
  });
  it.each([{disabled:true},{wrongActor:true},{deniedScope:true},{publicFolder:true},{failBackup:true}])('does not write with unavailable capability or unsafe storage %j',options=>{
    const test=harness(options);expect(()=>test.api.save(test.source,[test.patch()])).toThrow();expect(test.counts().sourceWrites).toBe(0);
    if(options.disabled||options.deniedScope)expect(test.counts().tokenCalls).toBe(0);
  });
  it('rejects a different source before obtaining a token',()=>{
    const test=harness();expect(()=>test.api.list({...test.source,spreadsheetId:'another-source'})).toThrow(/Nguồn/);expect(test.counts().tokenCalls).toBe(0);
  });
  it('uses the freshly created journal ID even while Drive search has not indexed it',()=>{
    const test=harness({hideCreatedFromList:true});const saved=test.api.save(test.source,[test.patch()]);expect(saved.results[0].ok).toBe(true);
    const batches=[...test.files.values()].filter(f=>f.title.startsWith('batch_'));expect(batches).toHaveLength(1);expect(JSON.parse(batches[0].blob.text).phase).toBe('committed');
    expect(test.api.save(test.source,[test.patch()])).toEqual(saved);expect(test.counts().sourceWrites).toBe(1);
  });
  it('validates changed assignments server-side but preserves an old mismatch when editing text',()=>{
    const test=harness({sharedCatalog:{specialistRooms:{'Nguyễn Văn Kỳ':['Phòng khác'],'Nguyễn A':['Phòng khác']}}});
    expect(()=>test.api.save(test.source,[test.patch()])).toThrow(/chưa được gán/);expect(test.counts().sourceWrites).toBe(0);
    expect(test.calls.some(c=>c.method==='post')).toBe(false);
    const patch={...test.patch(),baseValues:{content:'Nội dung cũ'},changes:{content:'Nội dung mới'}};
    expect(test.api.save(test.source,[patch]).results[0]).toMatchObject({ok:true,item:{content:'Nội dung mới',specialist:'Nguyễn A',room:'Tổng hợp'}});
  });
});
