// Whole server/RPC roundtrip on the fixed private COPY only. Never packaged
// into main server/dist. Restore original bytes only with matching hash + ETag.
function testIntegratedExcelSave(){
  var prepared=preparePrivateExcelTest();
  var source=HDND_TEST_SOURCE,mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var token=ScriptApp.getOAuthToken(),operationId=Utilities.getUuid();
  function request(url,method,blob,etag){var options={method:method||'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true};if(etag)options.headers['If-Match']=etag;if(blob){options.payload=blob;options.contentType=mime;}return UrlFetchApp.fetch(url,options);}
  function required(response){if(response.getResponseCode()!==200)throw new Error('Integration probe HTTP '+response.getResponseCode());return response;}
  function hash(blob){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,blob.getBytes()).map(function(b){return(b&255).toString(16).padStart(2,'0');}).join('');}
  function meta(){var value=JSON.parse(required(request('https://www.googleapis.com/drive/v2/files/'+source.spreadsheetId+'?fields=id,title,etag,mimeType,labels(trashed),permissions(type,role)')).getContentText());if(value.id!==source.spreadsheetId||value.title!=='Dashboard HĐND - THỬ GHI EXCEL - không dùng nhập liệu'||value.mimeType!==mime||value.labels?.trashed!==false||!value.etag||!value.permissions?.length||value.permissions.some(function(p){return p.type!=='user'||p.role!=='owner';}))throw new Error('Not the expected private COPY.');return value;}
  function read(){var before=meta(),blob=required(request('https://www.googleapis.com/drive/v2/files/'+source.spreadsheetId+'?alt=media')).getBlob(),after=meta();if(before.etag!==after.etag)throw new Error('COPY changed while reading.');return {blob:blob,hash:hash(blob),etag:after.etag};}
  var backup=read(),result=null,batchKey='',attempted=false;
  try{
    var snapshot=getDashboardData(source),item=snapshot.items.find(function(row){return row.recordId===source.spreadsheetId+':'+source.gid+':row:4';});
    if(!item||!item.displayCode||snapshot.items.filter(function(row){return row.displayCode===item.displayCode;}).length!==1)throw new Error('Unexpected COPY record.');
    var next='Nguyễn Văn Kỳ · THỬ '+operationId;
    var record={recordId:item.recordId,code:item.displayCode,baseRevision:0,operationId:operationId,baseValues:{specialist:item.specialist},changes:{specialist:next}};
    batchKey=hash(Utilities.newBlob(HDNDExcelTransactions.stable({source:source,operations:[operationId]}),'text/plain'));
    attempted=true;
    var saved=JSON.parse(saveDashboardData({source:source,records:[record]}));
    var after=getDashboardData(source),replay=JSON.parse(saveDashboardData({source:source,records:[record]})),history=getDashboardHistory({source:source,code:item.displayCode});
    result={test:'integrated-RPC-specialist-COPY',count:snapshot.items.length,sameRecord:saved.results?.[0]?.item?.recordId===item.recordId,savedSpecialist:saved.results?.[0]?.ok===true&&saved.results[0].item.specialist===next,readBack:after.items.find(function(row){return row.displayCode===item.displayCode;})?.specialist===next,replay:JSON.stringify(replay)===JSON.stringify(saved),audit:history.some(function(entry){return entry.operationId===operationId&&entry.changes.specialist===next&&entry.oldValues.specialist===item.specialist;})};
    result.verified=result.sameRecord&&result.savedSpecialist&&result.readBack&&result.replay&&result.audit;
    if(!result.verified)throw new Error('Integrated save verification failed.');
  }finally{
    if(attempted){
      var current=read();
      if(current.hash!==backup.hash){
        var receiptId=PropertiesService.getScriptProperties().getProperty('HDND_BATCH_'+batchKey);
        if(!receiptId)throw new Error('COPY outcome unclear. Rollback not attempted; inspect private backup.');
        var receipt=JSON.parse(required(request('https://www.googleapis.com/drive/v2/files/'+receiptId+'?alt=media')).getContentText());
        if(receipt.beforeHash!==backup.hash||receipt.afterHash!==current.hash)throw new Error('COPY has newer changes. Rollback skipped to protect them.');
        required(request('https://www.googleapis.com/upload/drive/v2/files/'+source.spreadsheetId+'?uploadType=media&convert=false&fields=id','put',backup.blob,current.etag));
      }
      if(read().hash!==backup.hash)throw new Error('COPY restoration not verified.');
    }
    if(result){result.restoredOriginalBytes=true;result.pass=result.verified===true;console.log(JSON.stringify(result));}
  }
  return result;
}
// Cleanup for the ONE UI trial: the known ecological-industrial-zone item.
// committed receipt and unchanged whole-file hash are required before restore.
function restorePrivateSpecialistUiTrial(){
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/script.external_request']);
  var source=HDND_TEST_SOURCE,token=ScriptApp.getOAuthToken(),mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var targets=getDashboardData(source).items.filter(function(item){return item.content==='Nghị quyết ban hành cơ chế, chính sách hỗ trợ chuyển đổi, xây dựng các khu công nghiệp sinh thái trên địa bàn thành phố Hải Phòng'&&item.specialist==='Nguyễn Văn Kỳ'&&item.room==='Tổng hợp';});
  if(targets.length!==1)throw new Error('UI trial target is not unique; no restore.');
  var target=targets[0]; // Original code, never a displayed/renumbered row label.
  function request(url,method,blob,etag){var options={method:method||'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true};if(etag)options.headers['If-Match']=etag;if(blob){options.payload=blob;options.contentType=mime;}var response=UrlFetchApp.fetch(url,options);if(response.getResponseCode()!==200)throw new Error('UI cleanup HTTP '+response.getResponseCode());return response;}
  function hash(blob){return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,blob.getBytes()).map(function(b){return(b&255).toString(16).padStart(2,'0');}).join('');}
  function meta(){var result=JSON.parse(request('https://www.googleapis.com/drive/v2/files/'+source.spreadsheetId+'?fields=id,title,etag,mimeType,labels(trashed),permissions(type,role)').getContentText());if(result.id!=='19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7'||result.title!=='Dashboard HĐND - THỬ GHI EXCEL - không dùng nhập liệu'||result.mimeType!==mime||result.labels?.trashed!==false||!result.etag||!result.permissions?.length||result.permissions.some(function(p){return p.type!=='user'||p.role!=='owner';}))throw new Error('Not the private UI COPY.');return result;}
  function read(){var before=meta(),blob=request('https://www.googleapis.com/drive/v2/files/'+source.spreadsheetId+'?alt=media').getBlob(),after=meta();if(before.etag!==after.etag)throw new Error('COPY changed while reading; no restore.');return {hash:hash(blob),etag:after.etag};}
  var current=read(),properties=PropertiesService.getScriptProperties().getProperties(),matches=[];
  Object.keys(properties).filter(function(key){return /^HDND_BATCH_[a-f0-9]{64}$/.test(key);}).forEach(function(key){
    var receipt=JSON.parse(request('https://www.googleapis.com/drive/v2/files/'+properties[key]+'?alt=media').getContentText());
    var record=receipt.records?.[0];
    if(receipt.phase==='committed'&&receipt.source?.url===source.url&&receipt.afterHash===current.hash&&receipt.records.length===1&&record.code===target.displayCode&&Object.keys(record.changes).length===1&&record.changes.specialist==='Nguyễn Văn Kỳ'&&record.baseValues.specialist==='Trương Việt Hải')matches.push(receipt);
  });
  if(matches.length!==1)throw new Error('No unique unchanged UI-trial receipt; no restore.');
  var receipt=matches[0],backup=request('https://www.googleapis.com/drive/v2/files/'+receipt.backupId+'?alt=media').getBlob();
  if(hash(backup)!==receipt.beforeHash)throw new Error('Backup mismatch; no restore.');
  request('https://www.googleapis.com/upload/drive/v2/files/'+source.spreadsheetId+'?uploadType=media&convert=false&fields=id','put',backup,current.etag);
  if(read().hash!==receipt.beforeHash)throw new Error('UI cleanup readback not confirmed.');
  console.log(JSON.stringify({test:'UI-trial-COPY-cleanup',restoredOriginalBytes:true,pass:true}));
}
// Read-only diagnostic; logs receipt state/guards, never cell contents or token.
function inspectPrivateUiTrial(){
  var source=HDND_TEST_SOURCE;getDashboardData(source);
  var token=ScriptApp.getOAuthToken(),properties=PropertiesService.getScriptProperties().getProperties();
  Object.keys(properties).filter(function(key){return /^HDND_BATCH_[a-f0-9]{64}$/.test(key);}).forEach(function(key){
    var response=UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+properties[key]+'?alt=media',{headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
    if(response.getResponseCode()!==200)throw new Error('Receipt inspection HTTP '+response.getResponseCode());
    var receipt=JSON.parse(response.getContentText()),record=receipt.records?.[0];
    console.log(JSON.stringify({phase:receipt.phase,sameSource:receipt.source?.url===source.url,count:receipt.records?.length,row4:record?.recordId===source.spreadsheetId+':'+source.gid+':row:4',fields:Object.keys(record?.changes||{}),expectedNew:record?.changes?.specialist==='Nguyễn Văn Kỳ',expectedOld:record?.baseValues?.specialist==='Trương Việt Hải',confirmed:!!receipt.results}));
  });
}
