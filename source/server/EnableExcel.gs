// Activation candidate, NOT part of the default build/deployment.
// Run only after the user approves main-app activation and personally grants
// its expanded Google scopes. This prepares storage, never writes source rows.
function prepareDashboardExcelStorage(){
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/script.external_request']);
  var source=sourceFromUrl_(),properties=PropertiesService.getScriptProperties(),token=ScriptApp.getOAuthToken();
  if(source.spreadsheetId!=='1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp'||source.gid!=='60961344')throw new Error('Không đúng nguồn Excel đã duyệt; chưa thiết lập.');
  function request(url,method,value){var options={method:method||'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true};if(value){options.payload=JSON.stringify(value);options.contentType='application/json';}var response=UrlFetchApp.fetch(url,options);if(response.getResponseCode()!==200){var reasons=[];try{reasons=JSON.parse(response.getContentText()).error.errors.map(function(error){return error.reason;}).filter(function(reason){return typeof reason==='string'&&/^[A-Za-z0-9_.-]+$/.test(reason);});}catch(ignored){}throw new Error('Chuẩn bị lưu Excel HTTP '+response.getResponseCode()+(reasons.length?' ('+reasons.join(', ')+')':''));}return JSON.parse(response.getContentText());}
  var actor=request('https://www.googleapis.com/drive/v2/about?fields=user(emailAddress)').user?.emailAddress;
  if(actor!=='phucpixel2025@gmail.com')throw new Error('Chỉ tài khoản quản trị đã duyệt được thiết lập bộ ghi.');
  var meta=request('https://www.googleapis.com/drive/v2/files/'+source.spreadsheetId+'?fields=id,mimeType,labels(trashed),userPermission(role)');
  if(meta.id!==source.spreadsheetId||meta.mimeType!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'||meta.labels?.trashed!==false||!['owner','writer'].includes(meta.userPermission?.role))throw new Error('Nguồn không đúng Excel hoặc chưa có quyền sửa; chưa thiết lập.');
  if(properties.getProperty('HDND_EXCEL_REGISTRY')){if(!HDNDExcelService.enabled(source))throw new Error('Đã có registry khác; kiểm tra trước khi đổi.');return {alreadyPrepared:true};}
  var lock=LockService.getScriptLock();if(!lock.tryLock(10000))throw new Error('Đang thiết lập bộ ghi; thử lại sau.');
  try{
    if(properties.getProperty('HDND_EXCEL_REGISTRY'))throw new Error('Registry vừa được tạo; đọc lại trước khi đổi.');
    function folder(label){return request('https://www.googleapis.com/drive/v2/files','post',{title:'Dashboard HĐND - '+label+' - '+Utilities.getUuid(),mimeType:'application/vnd.google-apps.folder'}).id;}
    var backup=folder('Sao lưu Excel'),journal=folder('Nhật ký lưu Excel');if(!backup||!journal)throw new Error('Chưa tạo đủ kho riêng.');
    properties.setProperty('HDND_EXCEL_REGISTRY',JSON.stringify({enabled:true,source:source,sheetName:'Sheet1',ownerEmail:actor,backupFolderId:backup,journalFolderId:journal}));
    return {prepared:true,sourceUrl:source.url,backupFolderId:backup,journalFolderId:journal};
  }finally{lock.releaseLock();}
}
// Read-only verification after setup. Never submits edits or logs cell contents.
function checkDashboardExcelConnection(){
  var source=sourceFromUrl_(),status=getDashboardSourceStatus(source);
  if(!status.backendReady)throw new Error(status.reason||'Bộ ghi chưa sẵn sàng.');
  var snapshot=getDashboardData(source),config=getDashboardConfig(source);
  var result={backendReady:status.backendReady,actor:status.actorLabel,count:snapshot.items.length,warnings:snapshot.warnings.length,configRevision:config?.revision??null};
  console.log(JSON.stringify(result));return result;
}
