// Initial deployment: USER_ACCESSING + MYSELF (owner only).
// No doPost, anonymous write endpoint, shared password or OAuth token in HTML.
const HDND_STORE_ID = '1i7uIvxPUS1iXqoiwx9u2ShIg0aJ9pBfU4W49jKaCKDM';
const HDND_DATA_URL = 'https://docs.google.com/spreadsheets/d/1VzcGF_-dAS-6yanFk-xPQ2vbdcv9bDEp/edit?gid=60961344';
const HDND_EDITOR_URL='https://script.google.com/macros/s/AKfycbwV0mOUnaS3OuvFCE3qkkhdY_1kA6A7eW5cL2rmsmQqeKbyLojBec_vKYzB7XAsWlCb/exec';
const HDND_HEADERS = ['source','revision','part','parts','payload','updatedAt','operationId','committed'];
function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.sourceJson = JSON.stringify(HDND_DATA_URL).replace(/</g,'\\u003c');
  template.excelEnabledJson = JSON.stringify(typeof HDNDExcelService !== 'undefined' && HDNDExcelService.enabled(sourceFromUrl_()));
  return template.evaluate().setTitle('Dashboard HĐND · Cấu hình chung');
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Dashboard HĐND').addItem('Chuẩn bị kho cấu hình','prepareDashboardStore').addToUi();
}
function store_() { return SpreadsheetApp.openById(HDND_STORE_ID); }
function source_(source) {
  // Apps Script V8 has no browser URL/URLSearchParams APIs.
  // This deployment accepts only the canonical source emitted by its own client.
  const match=HDND_DATA_URL.match(/^https:\/\/docs\.google\.com\/spreadsheets\/d\/([\w-]+)\/edit\?gid=(\d+)$/);
  if(!match)throw new Error('Cấu hình nguồn trên server không hợp lệ.');
  if(!source||source.url!==HDND_DATA_URL||source.spreadsheetId!==match[1]||source.gid!==match[2])throw new Error('Nguồn không thuộc dashboard này.');
  return {spreadsheetId:match[1],gid:match[2],url:HDND_DATA_URL};
}
function sourceFromUrl_() {
  const match=HDND_DATA_URL.match(/\/d\/([\w-]+)\/edit\?gid=(\d+)$/);
  if(!match)throw new Error('Cấu hình nguồn không hợp lệ.');
  return {spreadsheetId:match[1],gid:match[2],url:HDND_DATA_URL};
}
function getDashboardData(source) {
  return HDNDExcelService.list(source_(source));
}
function saveDashboardData(request) {
  if(!request)throw new Error('Yêu cầu lưu dữ liệu không hợp lệ.');
  return JSON.stringify(HDNDExcelService.save(source_(request.source),request.records));
}
function getDashboardHistory(request) {
  if(!request)throw new Error('Yêu cầu lịch sử không hợp lệ.');
  return HDNDExcelService.history(source_(request.source),request.code);
}
function prepareDashboardStore() {
  const book=store_();
  let sheet=book.getSheetByName(HDNDConfigCore.CONFIG_TAB);
  if(!sheet){sheet=book.insertSheet(HDNDConfigCore.CONFIG_TAB);sheet.getRange(1,1,1,8).setValues([HDND_HEADERS]);sheet.setFrozenRows(1);sheet.hideSheet();}
  else checkHeader_(sheet);
  return {storeUrl:book.getUrl(),sourceUrl:HDND_DATA_URL};
}
function checkHeader_(sheet) {
  if(JSON.stringify(sheet.getRange(1,1,1,8).getValues()[0])!==JSON.stringify(HDND_HEADERS))throw new Error('Header kho cấu hình không khớp; chưa ghi đè dữ liệu.');
}
function read_(sheet,source) {
  checkHeader_(sheet);
  const rows=sheet.getLastRow()>1?sheet.getRange(2,1,sheet.getLastRow()-1,8).getValues():[];
  return {rows,config:HDNDConfigCore.configFromRows(rows,source)};
}
function getDashboardConfig(source) {
  const validated=source_(source),sheet=store_().getSheetByName(HDNDConfigCore.CONFIG_TAB);
  return sheet?read_(sheet,validated).config:null;
}
// Read-only diagnostic: never converts or writes the original Office workbook.
function getDashboardSourceStatus(source) {
  const validated=source_(source);
  if(typeof HDNDExcelService !== 'undefined')return HDNDExcelService.status(validated);
  try {
    const book=SpreadsheetApp.openById(validated.spreadsheetId);
    book.getSheets();
    return {backendReady:false,canOpenAsSheets:true,reason:'Chưa bật lưu vào file Excel nguồn. Thay đổi bạn sửa chỉ giữ trên trình duyệt này; file nguồn chưa được cập nhật.'};
  } catch(error) {
    return {backendReady:false,canOpenAsSheets:false,reason:'Chưa bật lưu vào file Excel nguồn. Thay đổi bạn sửa chỉ giữ trên trình duyệt này; file nguồn chưa được cập nhật.'};
  }
}
function saveDashboardConfig(request) {
  if(!request||!Number.isSafeInteger(request.baseRevision)||request.baseRevision<0||!['all','catalogs','reports','items'].includes(request.section)||!/^[\w-]{8,100}$/.test(request.operationId||''))throw new Error('Yêu cầu lưu không hợp lệ.');
  if((request.section==='items'||request.section==='all')&&!(request.section==='all'?request.value&&request.value.items:request.value)?.hasOwnProperty('frameWidth'))throw new Error('Bản app cũ chưa có độ rộng khung. Mở bản mới trước khi lưu để tránh mất bố trí.');
  const source=source_(request.source);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(10000))throw new Error('Người khác đang lưu. Giữ nháp và thử lại sau khi tải cấu hình.');
  try {
    // Drive/Sheets permissions of the accessing Google user control this write.
    // File link permissions alone do not authenticate an HTML downloaded from Drive.
    const sheet=store_().getSheetByName(HDNDConfigCore.CONFIG_TAB);
    if(!sheet)throw new Error('Chưa chuẩn bị kho cấu hình. Chạy prepareDashboardStore một lần.');
    const loaded=read_(sheet,source),current=loaded.config;
    const existing=loaded.rows.filter(row=>row[6]===request.operationId&&row[2]===0&&row[7]===true);
    if(existing.length){
      const old=HDNDConfigCore.configFromRows(loaded.rows.filter(row=>row[6]===request.operationId),source);
      const proposed=HDNDConfigCore.applyConfigSection(old,request.section,request.value);
      if(JSON.stringify(proposed)!==JSON.stringify(old))throw new Error('Mã thao tác đã dùng cho nội dung khác.');
      return current;
    }
    if((current?current.revision:0)!==request.baseRevision)throw new Error('Cấu hình đã được người khác sửa. Nháp được giữ; tải lại bản chung rồi đối chiếu trước khi lưu.');
    if(!current&&request.section!=='all')throw new Error('Khởi tạo cần đủ danh mục, báo cáo và bố trí danh sách.');
    const nextMeta={schemaVersion:1,spreadsheetId:source.spreadsheetId,gid:source.gid,revision:(current?current.revision:0)+1,updatedAt:new Date().toISOString(),editorUrl:current?.editorUrl||HDND_EDITOR_URL};
    const base=current||HDNDConfigCore.validateSharedConfig(Object.assign({},request.value,nextMeta));
    const next=HDNDConfigCore.validateSharedConfig(Object.assign({},HDNDConfigCore.applyConfigSection(base,request.section,request.value),nextMeta));
    const rows=HDNDConfigCore.configRows(next,request.operationId),start=sheet.getLastRow()+1;
    if(sheet.getMaxRows()<start+rows.length-1)sheet.insertRowsAfter(sheet.getMaxRows(),start+rows.length-1-sheet.getMaxRows());
    sheet.getRange(start,1,rows.length,8).setValues(rows);
    SpreadsheetApp.flush();
    sheet.getRange(start,8).setValue(true); // Publish only after every chunk was written.
    SpreadsheetApp.flush();
    return read_(sheet,source).config;
  } finally {lock.releaseLock();}
}
