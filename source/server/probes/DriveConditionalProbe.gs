// Isolated probe. Only creates/updates its own disposable binary file.
// No production file ID, no Sheets access, no public endpoint, no token in logs.
function testConditionalDriveWrite() {
  var createdId='';
  var token=ScriptApp.getOAuthToken();
  function call(url,method,payload,etag) {
    var headers={Authorization:'Bearer '+token};if(etag)headers['If-Match']=etag;
    return UrlFetchApp.fetch(url,{method:method,headers:headers,contentType:'application/octet-stream',payload:payload,muteHttpExceptions:true});
  }
  var nonce=Utilities.getUuid(),seed='HDND_DUMMY_'+nonce;
  try {
    var create=call('https://www.googleapis.com/upload/drive/v2/files?uploadType=media&fields=id,etag','post',seed);
    if(create.getResponseCode()!==200&&create.getResponseCode()!==201)throw new Error('Create test file failed: HTTP '+create.getResponseCode());
    var initial=JSON.parse(create.getContentText());createdId=initial.id;
    if(!createdId||!initial.etag)throw new Error('Test file did not return ID/ETag; no update attempted.');
    var first=call('https://www.googleapis.com/upload/drive/v2/files/'+encodeURIComponent(createdId)+'?uploadType=media&fields=id,etag','put','HDND_COMMITTED_'+nonce,initial.etag);
    if(first.getResponseCode()!==200)throw new Error('Conditional first update failed: HTTP '+first.getResponseCode());
    var stale=call('https://www.googleapis.com/upload/drive/v2/files/'+encodeURIComponent(createdId)+'?uploadType=media&fields=id,etag','put','HDND_STALE_'+nonce,initial.etag);
    var read=UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+encodeURIComponent(createdId)+'?alt=media',{headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});
    var result={testFileId:createdId,firstStatus:first.getResponseCode(),staleStatus:stale.getResponseCode(),staleRejected:stale.getResponseCode()===412,readBackPreserved:read.getContentText()==='HDND_COMMITTED_'+nonce};
    result.pass=result.staleRejected&&result.readBackPreserved;
    console.log(JSON.stringify(result));return result;
  } finally {
    if(createdId){var cleanup=UrlFetchApp.fetch('https://www.googleapis.com/drive/v2/files/'+encodeURIComponent(createdId)+'/trash',{method:'post',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true});console.log('Disposable test file moved to Trash: HTTP '+cleanup.getResponseCode());}
  }
}
