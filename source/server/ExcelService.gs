// Registered Office source only. Disabled until an administrator explicitly
// configures HDND_EXCEL_REGISTRY and grants Drive scopes in this deployment.
var HDNDExcelService = (function () {
  var MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var SCOPES = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/script.external_request'];
  function fail(message) { throw new Error(message + ' Phần sửa trên máy vẫn được giữ.'); }
  function registry(source) {
    var raw = PropertiesService.getScriptProperties().getProperty('HDND_EXCEL_REGISTRY');
    if (!raw) fail('Chưa bật lưu vào file Excel nguồn.');
    var config = JSON.parse(raw);
    if (config.enabled !== true || !config.source || ['spreadsheetId', 'gid', 'url'].some(function (key) { return config.source[key] !== source[key]; }) || !config.sheetName || !config.ownerEmail || !/^[\w-]{10,}$/.test(config.backupFolderId || '') || !/^[\w-]{10,}$/.test(config.journalFolderId || '') || config.backupFolderId === config.journalFolderId) fail('Nguồn hoặc kho lưu an toàn chưa được thiết lập đúng.');
    return config;
  }
  function context(source) {
    var config = registry(source);
    var properties = PropertiesService.getScriptProperties();
    ScriptApp.requireScopes(ScriptApp.AuthMode.FULL, SCOPES);
    var token = ScriptApp.getOAuthToken(); // Never returned to HTML or logged.
    function request(url, method, payload, contentType, etag) {
      var headers = { Authorization: 'Bearer ' + token };
      if (etag) headers['If-Match'] = etag;
      var options = { method: method || 'get', headers: headers, muteHttpExceptions: true };
      if (payload !== undefined) { options.payload = payload; options.contentType = contentType; }
      return UrlFetchApp.fetch(url, options);
    }
    function json(response, label) {
      if (response.getResponseCode() !== 200) fail(label + ' (HTTP ' + response.getResponseCode() + ').');
      return JSON.parse(response.getContentText());
    }
    var about = json(request('https://www.googleapis.com/drive/v2/about?fields=user(emailAddress)'), 'Không xác nhận được tài khoản Google');
    var actor = about.user && about.user.emailAddress;
    if (!actor || actor.toLowerCase() !== config.ownerEmail.toLowerCase()) fail('Tài khoản Google hiện tại chưa được cho phép lưu nguồn này.');
    function metadata(id) {
      return json(request('https://www.googleapis.com/drive/v2/files/' + encodeURIComponent(id) + '?fields=id,title,etag,mimeType,fileSize,labels(trashed),parents(id),permissions(type,role),userPermission(role)'), 'Không đọc được thông tin tệp');
    }
    function privateFolder(id) {
      var meta = metadata(id);
      if (meta.id !== id || meta.mimeType !== 'application/vnd.google-apps.folder' || meta.labels?.trashed !== false || !meta.permissions?.length || meta.permissions.some(function (p) { return p.type !== 'user' || p.role !== 'owner'; })) fail('Thư mục sao lưu/nhật ký phải riêng tư cho chủ sở hữu.');
    }
    privateFolder(config.backupFolderId); privateFolder(config.journalFolderId);
    function hash(blob) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, blob.getBytes()).map(function (b) { return (b & 255).toString(16).padStart(2, '0'); }).join(''); }
    function digest(text) { return hash(Utilities.newBlob(text, 'text/plain')); }
    function inspect(blob) {
      if (blob.getBytes().length > 10 * 1024 * 1024) fail('File Excel vượt giới hạn 10 MB của bộ ghi này.');
      var entries = Utilities.unzip(blob.copyBlob().setContentType('application/zip'));
      if (entries.length > 500) fail('File Excel có quá nhiều thành phần.');
      var parts = Object.create(null), total = 0;
      entries.forEach(function (part) {
        var name = part.getName(); total += part.getBytes().length;
        if (total > 30 * 1024 * 1024 || Object.prototype.hasOwnProperty.call(parts, name) || /(^\/|\\|(?:^|\/)\.\.(?:\/|$))/.test(name) || ['__proto__','constructor','prototype'].includes(name)) fail('Cấu trúc ZIP không được hỗ trợ.');
        parts[name] = part;
      });
      if (!parts['xl/workbook.xml'] || !parts['xl/_rels/workbook.xml.rels']) fail('Không nhận diện được workbook Excel.');
      var path = HDNDExcelWriteCore.worksheetPath(parts['xl/workbook.xml'].getDataAsString('UTF-8'), parts['xl/_rels/workbook.xml.rels'].getDataAsString('UTF-8'), config.sheetName);
      if (!parts[path]) fail('Không tìm thấy trang tính đã đăng ký.');
      var strings = HDNDExcelWriteCore.sharedStrings(parts['xl/sharedStrings.xml']?.getDataAsString('UTF-8'));
      var xml = parts[path].getDataAsString('UTF-8'), cells = HDNDExcelWriteCore.cells(xml, strings);
      var maxRow = Object.keys(cells).reduce(function (max, ref) { return Math.max(max, Number(ref.match(/\d+$/)[0])); }, 0);
      if (maxRow > 10000) fail('Trang tính vượt giới hạn 10.000 hàng.');
      var rows = Array.from({ length: maxRow }, function (_, i) { return { c: Array.from({ length: 16 }, function (_, col) { return { v: cells[String.fromCharCode(65 + col) + (i + 1)]?.value || '' }; }) }; });
      var snapshot = HDNDConfigCore.parseGvizPayload({ status: 'ok', table: { cols: new Array(16).fill({}), rows: rows } }, source.spreadsheetId + ':' + source.gid);
      return { parts: parts, path: path, strings: strings, xml: xml, cells: cells, snapshot: snapshot };
    }
    function sourceMetadata() {
      var meta = metadata(source.spreadsheetId);
      if (meta.id !== source.spreadsheetId || meta.mimeType !== MIME || meta.labels?.trashed !== false || !meta.etag || !['owner', 'writer'].includes(meta.userPermission?.role) || config.expectedTitle && meta.title !== config.expectedTitle) fail('File nguồn không đúng Excel hoặc tài khoản chưa có quyền sửa.');
      if (config.requirePrivate === true && (!meta.permissions?.length || meta.permissions.some(function (p) { return p.type !== 'user' || p.role !== 'owner'; }))) fail('Bản thử phải dùng đúng bản sao riêng tư.');
      return meta;
    }
    function read() {
      var before = sourceMetadata();
      var response = request('https://www.googleapis.com/drive/v2/files/' + source.spreadsheetId + '?alt=media');
      if (response.getResponseCode() !== 200) fail('Không tải được dữ liệu Excel.');
      var blob = response.getBlob(), after = sourceMetadata();
      if (before.etag !== after.etag) fail('File thay đổi trong lúc đọc; hãy đọc lại.');
      var parsed = inspect(blob);
      return { blob: blob, hash: hash(blob), etag: after.etag, parsed: parsed };
    }
    var journalCache = Object.create(null);
    function find(name) {
      if (!/^[\w.-]+$/.test(name)) fail('Tên nhật ký không hợp lệ.');
      if (Object.prototype.hasOwnProperty.call(journalCache,name)) return journalCache[name];
      var batch=name.match(/^batch_([a-f0-9]{64})\.json$/),pointer=batch?properties.getProperty('HDND_BATCH_'+batch[1]):null;
      if(pointer){
        if(!/^[\w-]{10,}$/.test(pointer))fail('Chỉ mục nhật ký không hợp lệ.');
        var pointed=metadata(pointer);
        if(pointed.title!==name||pointed.mimeType!=='application/json'||!pointed.etag||pointed.labels?.trashed!==false||!pointed.parents?.some(function(parent){return parent.id===config.journalFolderId;}))fail('Nhật ký không nằm trong kho đã đăng ký.');
        var direct={meta:pointed,value:json(request('https://www.googleapis.com/drive/v2/files/'+pointer+'?alt=media'),'Không đọc được nhật ký')};
        journalCache[name]=direct;return direct;
      }
      var q = "'" + config.journalFolderId + "' in parents and title = '" + name + "' and trashed = false";
      var result = json(request('https://www.googleapis.com/drive/v2/files?q=' + encodeURIComponent(q) + '&maxResults=2&fields=items(id,etag,mimeType),nextPageToken'), 'Không đọc được chỉ mục nhật ký');
      if (!Array.isArray(result.items) || result.items.length > 1 || result.nextPageToken) fail('Nhật ký trùng hoặc không đầy đủ; chưa ghi nguồn.');
      var item = result.items[0];
      if (!item) {journalCache[name]=null;return null;}
      if (item.mimeType !== 'application/json' || !item.etag) fail('Tệp nhật ký không hợp lệ.');
      var found={ meta: item, value: json(request('https://www.googleapis.com/drive/v2/files/' + item.id + '?alt=media'), 'Không đọc được nội dung nhật ký') };
      journalCache[name]=found;return found;
    }
    function create(folder, title, blob) {
      var boundary = 'hdnd_' + Utilities.getUuid().replace(/-/g, '');
      var prefix = '--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ title: title, mimeType: blob.getContentType(), parents: [{ id: folder }] }) + '\r\n--' + boundary + '\r\nContent-Type: ' + blob.getContentType() + '\r\n\r\n';
      var bytes = Utilities.newBlob(prefix).getBytes().concat(blob.getBytes(), Utilities.newBlob('\r\n--' + boundary + '--\r\n').getBytes());
      var created = json(request('https://www.googleapis.com/upload/drive/v2/files?uploadType=multipart&convert=false&fields=id,mimeType,etag', 'post', bytes, 'multipart/related; boundary=' + boundary), 'Không tạo được bản sao/nhật ký');
      if (!created.id || created.mimeType !== blob.getContentType()) fail('Chưa xác nhận tệp sao lưu/nhật ký.');
      return created;
    }
    function store(name, value) {
      var old = find(name), blob = Utilities.newBlob(JSON.stringify(value), 'application/json', name);
      if (blob.getBytes().length > 5 * 1024 * 1024) fail('Nhật ký quá lớn; chưa ghi nguồn.');
      var saved=!old?create(config.journalFolderId,name,blob):json(request('https://www.googleapis.com/upload/drive/v2/files/' + old.meta.id + '?uploadType=media&convert=false&fields=id,mimeType,etag', 'put', blob, 'application/json', old.meta.etag), 'Không xác nhận được nhật ký');
      if(!saved.id||!saved.etag||saved.mimeType!=='application/json')fail('Chưa xác nhận được phiên bản nhật ký.');
      var batch=name.match(/^batch_([a-f0-9]{64})\.json$/);
      if(batch)properties.setProperty('HDND_BATCH_'+batch[1],saved.id);
      journalCache[name]={meta:saved,value:JSON.parse(blob.getDataAsString('UTF-8'))};
      return saved.id;
    }
    function validateRecords(records) {
      if (!Array.isArray(records) || !records.length || records.length > 100) fail('Danh sách sửa không hợp lệ.');
      var prefix = source.spreadsheetId + ':' + source.gid + ':row:';
      records.forEach(function (record) {
        if (!record || typeof record.recordId !== 'string' || !record.recordId.startsWith(prefix) || !/^[1-9]\d*$/.test(record.recordId.slice(prefix.length)) || typeof record.code !== 'string' || !record.code.trim() || record.code !== record.code.trim() || !record.changes || !record.baseValues || Array.isArray(record.changes) || Array.isArray(record.baseValues) || typeof record.changes !== 'object' || typeof record.baseValues !== 'object') fail('Mã nguồn hoặc trường sửa không hợp lệ.');
        if (Object.keys(record.changes).some(function (field) { return typeof record.changes[field] === 'string' && record.changes[field] !== record.changes[field].trim(); })) fail('Văn bản sửa cần bỏ khoảng trắng ở đầu/cuối trước khi gửi.');
      });
    }
    function confirmed(current, records) {
      return records.map(function (record) {
        var matches = current.parsed.snapshot.items.filter(function (item) { return item.displayCode === record.code; });
        if (matches.length !== 1 || Object.keys(record.changes).some(function (key) { return matches[0][key] !== record.changes[key]; })) fail('Dữ liệu đọc lại chưa khớp với phần vừa sửa.');
        // Row identity may have moved; the client's viewport keeps its original ID
        // until an explicit refresh. The writer always locates by original code.
        return { recordId: record.recordId, ok: true, item: Object.assign({}, matches[0], { recordId: record.recordId }) };
      });
    }
    var io = {
      actor: actor, now: function () { return new Date().toISOString(); }, digest: digest, read: read,
      receipt: function (key) { var entry = find('batch_' + key + '.json'); return entry ? entry.value : null; },
      storeReceipt: function (key, value) { return store('batch_' + key + '.json', value); },
      // Small synchronous indices contain IDs/hashes only, not row contents.
      // Durable direct IDs avoid Drive search-index lag on a retry.
      operation: function (id) { return properties.getProperty('HDND_OP_'+id); },
      storeOperation: function (id, key) { properties.setProperty('HDND_OP_'+id,key); },
      backup: function (before, key) {
        var id = create(config.backupFolderId, 'before_' + key + '.xlsx', before.blob.copyBlob().setContentType(MIME)).id;
        var response = request('https://www.googleapis.com/drive/v2/files/' + id + '?alt=media');
        if (response.getResponseCode() !== 200 || hash(response.getBlob()) !== before.hash) fail('Bản sao an toàn chưa đúng dữ liệu trước ghi; chưa ghi nguồn.');
        return id;
      },
      prepare: function (before, records) {
        validateRecords(records);
        var original = before.parsed;
        var patches = HDNDExcelWriteCore.recordPatches(original.xml, original.strings, records);
        var edited = HDNDExcelWriteCore.patchWorksheet(original.xml, original.strings, patches);
        XmlService.parse(edited);
        var blob = Utilities.zip(Object.keys(original.parts).map(function (name) { return name === original.path ? Utilities.newBlob(edited, 'application/xml', name) : original.parts[name]; }), 'Dashboard.xlsx').setContentType(MIME);
        var next = { blob: blob, hash: hash(blob), parsed: inspect(blob) };
        // Preserve existing assignments; validate relationships when changed.
        var shared = typeof getDashboardConfig === 'function' ? getDashboardConfig(source) : null;
        if(shared&&shared.catalogs)records.forEach(function(record){
          if(!Object.prototype.hasOwnProperty.call(record.changes,'specialist')&&!Object.prototype.hasOwnProperty.call(record.changes,'room'))return;
          var item=next.parsed.snapshot.items.find(function(candidate){return candidate.displayCode===record.code;});
          var issue=HDNDConfigCore.assignmentIssue(item,shared.catalogs);
          if(issue)fail(issue);
        });
        var keys = Object.keys(original.parts), nextKeys = Object.keys(next.parsed.parts);
        if (keys.length !== nextKeys.length || keys.some(function (name) { return !next.parsed.parts[name] || name !== original.path && hash(original.parts[name]) !== hash(next.parsed.parts[name]); })) fail('Không giữ được các thành phần workbook khác; chưa ghi.');
        var patched = {}; patches.forEach(function (patch) { patched[patch.ref] = true; });
        if (Object.keys(original.cells).some(function (ref) { return !patched[ref] && original.cells[ref].raw !== next.parsed.cells[ref]?.raw; })) fail('Không giữ được các ô Excel khác; chưa ghi.');
        confirmed(next, records);
        return next;
      },
      confirm: confirmed,
      write: function (prepared, etag) {
        var response = request('https://www.googleapis.com/upload/drive/v2/files/' + source.spreadsheetId + '?uploadType=media&convert=false&fields=id,etag,mimeType', 'put', prepared.blob, MIME, etag);
        return { status: response.getResponseCode() };
      }
    };
    return { config: config, io: io, actor: actor, find: find, request: request, json: json, validateRecords: validateRecords };
  }
  function status(source) {
    try { var ctx = context(source); ctx.io.read(); return { backendReady: true, actorLabel: ctx.actor, reason: 'Đã kết nối lưu app → Excel. Chỉ báo đã lưu sau khi đọc lại file xác nhận.' }; }
    catch (error) { return { backendReady: false, reason: error.message || 'Chưa bật lưu vào file Excel nguồn.' }; }
  }
  function list(source) { return context(source).io.read().parsed.snapshot; }
  function save(source, records) {
    var ctx = context(source); ctx.validateRecords(records);
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) fail('Đang có lần lưu khác; thử lại sau.');
    try { return HDNDExcelTransactions.save(ctx.io, source, records); }
    finally { lock.releaseLock(); }
  }
  function history(source, code) {
    if (typeof code !== 'string' || !code.trim() || code.length > 200) fail('Mã nguồn không hợp lệ.');
    var ctx = context(source), q = "'" + ctx.config.journalFolderId + "' in parents and title contains 'batch_' and trashed = false";
    var result = ctx.json(ctx.request('https://www.googleapis.com/drive/v2/files?q=' + encodeURIComponent(q) + '&maxResults=100&fields=items(id,title,mimeType),nextPageToken'), 'Không đọc được lịch sử');
    // Explicit bound; do not silently claim complete history on a truncated list.
    if (result.nextPageToken) fail('Lịch sử vượt giới hạn 100 lần lưu; cần mở rộng phân trang trước khi tra cứu.');
    var entries = [];
    (result.items || []).forEach(function (file) {
      if (!/^batch_[a-f0-9]{64}\.json$/.test(file.title) || file.mimeType !== 'application/json') return;
      var receipt = ctx.find(file.title)?.value;
      if (!receipt || receipt.phase !== 'committed' || receipt.source?.url !== source.url) return;
      receipt.records.filter(function (record) { return record.code === code; }).forEach(function (record) { entries.push({ operationId: record.operationId, recordId: record.recordId, at: receipt.confirmedAt, changes: record.changes, oldValues: record.baseValues }); });
    });
    return entries.sort(function (a, b) { return a.at.localeCompare(b.at); });
  }
  function enabled(source) { try { registry(source); return true; } catch (error) { return false; } }
  return { enabled: enabled, status: status, list: list, save: save, history: history };
})();
