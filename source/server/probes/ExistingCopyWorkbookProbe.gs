// Prepared, not executed. Fixed disposable COPY only. No production file ID.
// Requires HDNDExcelWriteCore; never packaged into the app.
function testExistingCopyExcelRoundtrip(){
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/script.external_request']);
  const copyId='19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7';
  const copyTitle='Dashboard HĐND - THỬ GHI EXCEL - không dùng nhập liệu';
  const mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const token=ScriptApp.getOAuthToken(),lock=LockService.getScriptLock();
  if(!lock.tryLock(5000))throw new Error('Another probe is running.');
  let backup=null,savedEtag='',needsRestore=false,result=null;
  function request(url,method,payload,etag){const headers={Authorization:'Bearer '+token};if(etag)headers['If-Match']=etag;const options={method:method||'get',headers,muteHttpExceptions:true};if(payload!==undefined){options.payload=payload;options.contentType=mime;}return UrlFetchApp.fetch(url,options);}
  function required(response,label){if(response.getResponseCode()!==200)throw new Error(label+' HTTP '+response.getResponseCode());return response;}
  function metadata(){const meta=JSON.parse(required(request('https://www.googleapis.com/drive/v2/files/'+copyId+'?fields=id,title,etag,mimeType,labels(trashed),permissions(role,type)'),'Copy metadata').getContentText());if(meta.id!==copyId||meta.title!==copyTitle||meta.mimeType!==mime||meta.labels?.trashed!==false||!meta.etag||!meta.permissions?.length||meta.permissions.some(p=>p.type!=='user'||p.role!=='owner'))throw new Error('Target is not the expected private Excel COPY; no write.');return meta;}
  function read(){return required(request('https://www.googleapis.com/drive/v2/files/'+copyId+'?alt=media'),'Read copy blob').getBlob();}
  function hash(blob){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,blob.getBytes()).map(b=>(b&255).toString(16).padStart(2,'0')).join('');}
  function inspect(blob){const parts={};for(const part of Utilities.unzip(blob.copyBlob().setContentType('application/zip'))){if(parts[part.getName()])throw new Error('Duplicate ZIP part.');parts[part.getName()]=part;}const path=HDNDExcelWriteCore.worksheetPath(parts['xl/workbook.xml'].getDataAsString('UTF-8'),parts['xl/_rels/workbook.xml.rels'].getDataAsString('UTF-8'),'Sheet1');const strings=HDNDExcelWriteCore.sharedStrings(parts['xl/sharedStrings.xml']?.getDataAsString('UTF-8'));const xml=parts[path].getDataAsString('UTF-8');return {parts,path,strings,xml,cells:HDNDExcelWriteCore.cells(xml,strings)};}
  const uploadUrl='https://www.googleapis.com/upload/drive/v2/files/'+copyId+'?uploadType=media&convert=false&fields=id,etag,mimeType';
  try{
    const before=metadata();backup=read();const after=metadata();if(before.etag!==after.etag)throw new Error('Copy changed during read; no write.');
    const current=inspect(backup),code=current.cells.A4?.value?.trim(),base=current.cells.C4?.value;
    if(!code||!base?.trim()||Object.keys(current.parts).length!==18)throw new Error('Unexpected copy shape; no write.');
    const marker='HDND_COPY_TEST_'+Utilities.getUuid(),next=base.trim()+'\n'+marker;
    const patches=HDNDExcelWriteCore.recordPatches(current.xml,current.strings,[{code,baseValues:{content:base.trim()},changes:{content:next}}]);
    // Explicitly verify the known copy record remains on C4 for this one-off proof.
    if(patches.length!==1||patches[0].ref!=='C4')throw new Error('Unexpected copy record position; no write.');
    const edited=HDNDExcelWriteCore.patchWorksheet(current.xml,current.strings,patches);XmlService.parse(edited);
    const updated=Utilities.zip(Object.keys(current.parts).map(name=>name===current.path?Utilities.newBlob(edited,'application/xml',name):current.parts[name]),'HDND_COPY_TEST.xlsx').setContentType(mime);
    const response=required(request(uploadUrl,'put',updated,after.etag),'Conditional COPY write'),saved=JSON.parse(response.getContentText());
    if(saved.id!==copyId||!saved.etag)throw new Error('Unexpected COPY write response; inspect copy before retry.');
    savedEtag=saved.etag;needsRestore=true;
    const actualBlob=read(),actual=inspect(actualBlob);
    const otherPartsPreserved=Object.keys(current.parts).length===Object.keys(actual.parts).length&&Object.keys(current.parts).filter(name=>name!==current.path).every(name=>actual.parts[name]&&hash(actual.parts[name])===hash(current.parts[name]));
    const otherCellsPreserved=Object.keys(current.cells).filter(ref=>ref!=='C4').every(ref=>actual.cells[ref]?.raw===current.cells[ref].raw);
    const stale=request(uploadUrl,'put',backup,after.etag);
    if(stale.getResponseCode()!==412)throw new Error('COPY stale write not rejected: HTTP '+stale.getResponseCode());
    result={copyFileId:copyId,sameFileId:true,mimePreserved:saved.mimeType===mime,staleStatus:stale.getResponseCode(),contentReadBack:actual.cells.C4?.value===next,blobMatchesUpload:hash(actualBlob)===hash(updated),otherPartsPreserved,otherCellsPreserved};
    result.packagePass=result.mimePreserved&&result.contentReadBack&&result.blobMatchesUpload&&otherPartsPreserved&&otherCellsPreserved;
    if(!result.packagePass)throw new Error('COPY workbook preservation failed.');
    return result;
  }finally{
    try{
      if(needsRestore&&backup&&savedEtag){
        // Never restore over a direct edit made after our test write.
        const latest=metadata();if(latest.etag!==savedEtag)throw new Error('COPY changed after test. Rollback skipped to protect newer edits.');
        required(request(uploadUrl,'put',backup,savedEtag),'Conditional COPY rollback');
        const restored=hash(read())===hash(backup);if(!restored)throw new Error('COPY rollback readback mismatch.');
        if(result){result.restoredOriginalBytes=true;result.pass=result.packagePass;console.log(JSON.stringify(result));}
      }
    }finally{lock.releaseLock();}
  }
}
