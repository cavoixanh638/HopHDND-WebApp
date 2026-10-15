// Isolated UI candidate: ONLY the already approved private Excel copy.
// Package separately; do not include Code.gs or connect the main config store.
var HDND_TEST_SOURCE = {spreadsheetId:'19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7',gid:'60961344',url:'https://docs.google.com/spreadsheets/d/19fv9wGwsT2U0zPaFWpa-mnoKLsW2xBD7/edit?gid=60961344'};
function testSource_(source) {
  if(!source||['spreadsheetId','gid','url'].some(function(key){return source[key]!==HDND_TEST_SOURCE[key];}))throw new Error('Bản thử chỉ dùng đúng bản sao Excel riêng.');
  return HDND_TEST_SOURCE;
}
function doGet() {
  var template=HtmlService.createTemplateFromFile('Index');
  template.sourceJson=JSON.stringify(HDND_TEST_SOURCE.url);
  template.excelEnabledJson=JSON.stringify(HDNDExcelService.enabled(HDND_TEST_SOURCE));
  return template.evaluate().setTitle('Dashboard HĐND · THỬ LƯU BẢN SAO');
}
function getDashboardSourceStatus(source){return HDNDExcelService.status(testSource_(source));}
function getDashboardData(source){return HDNDExcelService.list(testSource_(source));}
function saveDashboardData(request){if(!request)throw new Error('Yêu cầu không hợp lệ.');return JSON.stringify(HDNDExcelService.save(testSource_(request.source),request.records));}
function getDashboardHistory(request){if(!request)throw new Error('Yêu cầu không hợp lệ.');return HDNDExcelService.history(testSource_(request.source),request.code);}
function getDashboardConfig(source){testSource_(source);return null;}
function saveDashboardConfig(){throw new Error('Bản thử giữ bố trí trên máy; không ghi kho chung.');}
// Run manually in the authorized separate test project AFTER reviewing this
// package. Creates owner-only backup/journal folders; never changes source ACLs.
function preparePrivateExcelTest(){
  ScriptApp.requireScopes(ScriptApp.AuthMode.FULL,['https://www.googleapis.com/auth/drive','https://www.googleapis.com/auth/script.external_request']);
  var token=ScriptApp.getOAuthToken(),properties=PropertiesService.getScriptProperties();
  function request(url,method,payload){var options={method:method||'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true};if(payload){options.payload=JSON.stringify(payload);options.contentType='application/json';}var response=UrlFetchApp.fetch(url,options);if(response.getResponseCode()!==200)throw new Error('Chuẩn bị bản thử HTTP '+response.getResponseCode());return JSON.parse(response.getContentText());}
  var actor=request('https://www.googleapis.com/drive/v2/about?fields=user(emailAddress)').user?.emailAddress;
  if(actor!=='phucpixel2025@gmail.com')throw new Error('Không phải tài khoản chủ bản sao thử.');
  var meta=request('https://www.googleapis.com/drive/v2/files/'+HDND_TEST_SOURCE.spreadsheetId+'?fields=id,title,mimeType,labels(trashed),permissions(type,role)');
  if(meta.id!==HDND_TEST_SOURCE.spreadsheetId||meta.title!=='Dashboard HĐND - THỬ GHI EXCEL - không dùng nhập liệu'||meta.mimeType!=='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'||meta.labels?.trashed!==false||!meta.permissions?.length||meta.permissions.some(function(p){return p.type!=='user'||p.role!=='owner';}))throw new Error('Không đúng bản sao riêng; chưa thiết lập.');
  if(properties.getProperty('HDND_EXCEL_REGISTRY')){if(!HDNDExcelService.enabled(HDND_TEST_SOURCE))throw new Error('Thiết lập đã có nhưng không khớp. Kiểm tra trước khi thay.');return {alreadyPrepared:true};}
  function folder(label){return request('https://www.googleapis.com/drive/v2/files','post',{title:'HĐND THỬ - '+label+' - '+Utilities.getUuid(),mimeType:'application/vnd.google-apps.folder'}).id;}
  var backup=folder('Sao lưu Excel'),journal=folder('Nhật ký lưu Excel');
  if(!backup||!journal)throw new Error('Chưa tạo đủ kho an toàn.');
  properties.setProperty('HDND_EXCEL_REGISTRY',JSON.stringify({enabled:true,source:HDND_TEST_SOURCE,sheetName:'Sheet1',ownerEmail:actor,expectedTitle:meta.title,requirePrivate:true,backupFolderId:backup,journalFolderId:journal}));
  return {prepared:true,source:'Bản sao thử riêng',backupFolderId:backup,journalFolderId:journal};
}
