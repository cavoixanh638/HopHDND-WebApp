// Isolated Office test. Accepts no file ID; targets only its own synthetic workbook.
// Requires ExcelWriteCore.gs and the synthetic bytes in WorkbookRoundtripProbe.gs.
// Not packaged, not a production adapter. No tokens or actual data in logs.
var HDNDOfficeConcurrencyProbe=(function(){
  const key='HDND_OWN_OFFICE_TEST',mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  function request(url,method,payload,etag,contentType){
    const headers={Authorization:'Bearer '+ScriptApp.getOAuthToken()};if(etag)headers['If-Match']=etag;
    const options={method:method||'get',headers,muteHttpExceptions:true};
    if(payload!==undefined){options.payload=payload;options.contentType=contentType||mime;}
    return UrlFetchApp.fetch(url,options);
  }
  function required(response,label){if(response.getResponseCode()!==200)throw new Error(label+' HTTP '+response.getResponseCode());return response;}
  function properties(){return PropertiesService.getScriptProperties();}
  function tracked(){const saved=properties().getProperty(key);if(!saved)throw new Error('No own test workbook. Run prepare first.');const state=JSON.parse(saved);if(!state.id||!state.nonce||!state.etag)throw new Error('Invalid test state; no write.');return state;}
  function metadata(id){return JSON.parse(required(request('https://www.googleapis.com/drive/v2/files/'+encodeURIComponent(id)+'?fields=id,title,etag,mimeType,headRevisionId'),'Metadata').getContentText());}
  function read(id){return required(request('https://www.googleapis.com/drive/v2/files/'+encodeURIComponent(id)+'?alt=media'),'Read own workbook').getBlob();}
  function hash(blob){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,blob.getBytes()).map(b=>(b&255).toString(16).padStart(2,'0')).join('');}
  function unpack(blob){const map={};for(const part of Utilities.unzip(blob.copyBlob().setContentType('application/zip'))){if(map[part.getName()])throw new Error('Duplicate ZIP part');map[part.getName()]=part;}return map;}
  function inspect(blob){const parts=unpack(blob),path=HDNDExcelWriteCore.worksheetPath(parts['xl/workbook.xml'].getDataAsString('UTF-8'),parts['xl/_rels/workbook.xml.rels'].getDataAsString('UTF-8'),'Du lieu');const strings=HDNDExcelWriteCore.sharedStrings(parts['xl/sharedStrings.xml']?.getDataAsString('UTF-8'));const xml=parts[path].getDataAsString('UTF-8');return {parts,path,strings,xml,cells:HDNDExcelWriteCore.cells(xml,strings)};}
  function original(){return Utilities.newBlob(Utilities.base64Decode(HDND_FIXTURE_XLSX_B64),mime,'HDND_SYNTHETIC_OFFICE_TEST.xlsx');}
  function prepare(){
    if(properties().getProperty(key))throw new Error('Own test already exists. Inspect or clean up before preparing another.');
    const created=request('https://www.googleapis.com/upload/drive/v2/files?uploadType=media&convert=false&fields=id,etag,mimeType','post',original());
    if(![200,201].includes(created.getResponseCode()))throw new Error('Create synthetic Office workbook HTTP '+created.getResponseCode());
    const meta=JSON.parse(created.getContentText());if(!meta.id||!meta.etag||meta.mimeType!==mime)throw new Error('Unexpected created workbook');
    const state={id:meta.id,etag:meta.etag,nonce:Utilities.getUuid(),phase:'prepared'};properties().setProperty(key,JSON.stringify(state));
    const title='HĐND THỬ Excel giả - không nhập liệu thật';
    required(request('https://www.googleapis.com/drive/v2/files/'+state.id+'?fields=id,etag,mimeType','patch',JSON.stringify({title}),undefined,'application/json'),'Name own workbook');
    state.etag=metadata(state.id).etag;properties().setProperty(key,JSON.stringify(state));
    const result={testFileId:state.id,mimePreserved:true,officeCell:'C5',officeValue:'HDND_OFFICE_'+state.nonce,openUrl:'https://docs.google.com/spreadsheets/d/'+state.id+'/edit',next:'Edit only C5 in this synthetic Office workbook, wait for Saved to Drive, then verify.'};console.log(JSON.stringify(result));return result;
  }
  function verify(){
    const state=tracked(),officeValue='HDND_OFFICE_'+state.nonce,appValue='HDND_APP_'+state.nonce;
    const before=metadata(state.id);if(before.mimeType!==mime)throw new Error('Test is no longer Excel; no write.');
    const blob=read(state.id),current=inspect(blob),afterRead=metadata(state.id);
    if(before.etag!==afterRead.etag)throw new Error('File changed during read; retry without writing.');
    if(current.cells.C5?.value!==officeValue){const pending={pass:false,waitingForOfficeBlob:true,testFileId:state.id,phase:state.phase};console.log(JSON.stringify(pending));return pending;}
    if(state.phase==='committed'){
      const result={testFileId:state.id,lateReadOnly:true,officeValuePreserved:true,appValuePreserved:current.cells.C4?.value===appValue};result.pass=result.appValuePreserved;console.log(JSON.stringify(result));return result;
    }
    if(afterRead.etag===state.etag)throw new Error('Office marker present without a changed ETag; no stale write attempted.');
    const stale=request('https://www.googleapis.com/upload/drive/v2/files/'+state.id+'?uploadType=media&convert=false&fields=id,etag,mimeType','put',original(),state.etag);
    if(stale.getResponseCode()!==412)throw new Error('Office stale write was not rejected: HTTP '+stale.getResponseCode());
    const meta=metadata(state.id);if(meta.etag!==afterRead.etag)throw new Error('File changed after stale test; retry without writing.');
    const baseline=inspect(original());
    const patches=HDNDExcelWriteCore.recordPatches(current.xml,current.strings,[{code:'ID1',baseValues:{content:baseline.cells.C4.value},changes:{content:appValue}}]);
    const edited=HDNDExcelWriteCore.patchWorksheet(current.xml,current.strings,patches);XmlService.parse(edited);
    const updated=Utilities.zip(Object.keys(current.parts).map(name=>name===current.path?Utilities.newBlob(edited,'application/xml',name):current.parts[name]),'HDND_SYNTHETIC_OFFICE_TEST.xlsx').setContentType(mime);
    const saved=required(request('https://www.googleapis.com/upload/drive/v2/files/'+state.id+'?uploadType=media&convert=false&fields=id,etag,mimeType','put',updated,meta.etag),'Conditional write after Office');
    const savedMeta=JSON.parse(saved.getContentText()),readback=read(state.id),actual=inspect(readback);
    const otherPartsPreserved=Object.keys(current.parts).length===Object.keys(actual.parts).length&&Object.keys(current.parts).filter(name=>name!==current.path).every(name=>actual.parts[name]&&hash(actual.parts[name])===hash(current.parts[name]));
    const otherCellsPreserved=Object.keys(current.cells).filter(ref=>ref!=='C4').every(ref=>actual.cells[ref]?.raw===current.cells[ref].raw);
    const result={testFileId:state.id,officeChangedETag:true,staleStatus:stale.getResponseCode(),sameFileId:savedMeta.id===state.id,mimePreserved:savedMeta.mimeType===mime,officeValuePreserved:actual.cells.C5?.value===officeValue,appValueReadBack:actual.cells.C4?.value===appValue,blobMatchesUpload:hash(readback)===hash(updated),otherPartsPreserved,otherCellsPreserved};
    result.pass=result.sameFileId&&result.mimePreserved&&result.officeValuePreserved&&result.appValueReadBack&&result.blobMatchesUpload&&otherPartsPreserved&&otherCellsPreserved;
    state.phase='committed';properties().setProperty(key,JSON.stringify(state));console.log(JSON.stringify(result));return result;
  }
  function cleanup(){const state=tracked();const response=required(request('https://www.googleapis.com/drive/v2/files/'+state.id+'/trash','post'),'Trash own synthetic workbook');properties().deleteProperty(key);const result={testFileId:state.id,trashed:true,http:response.getResponseCode()};console.log(JSON.stringify(result));return result;}
  return {prepare,verify,cleanup};
})();
function prepareOwnOfficeConcurrencyTest(){return HDNDOfficeConcurrencyProbe.prepare();}
function verifyOwnOfficeConcurrencyTest(){return HDNDOfficeConcurrencyProbe.verify();}
function cleanupOwnOfficeConcurrencyTest(){return HDNDOfficeConcurrencyProbe.cleanup();}
