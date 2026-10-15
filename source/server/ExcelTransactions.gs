// Pure orchestration. Transport, durable receipts, backups and codec are injected.
// No source IDs, Google permissions or network calls in this module.
var HDNDExcelTransactions = (function () {
  function stable(value) {
    if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
    if (value && typeof value === 'object') return '{' + Object.keys(value).sort().map(function (key) { return JSON.stringify(key) + ':' + stable(value[key]); }).join(',') + '}';
    return JSON.stringify(value);
  }
  function save(io, source, records) {
    if (!Array.isArray(records) || !records.length || records.length > 100) throw new Error('Số nội dung cần lưu không hợp lệ.');
    var ids = {}, codes = {}, rows = {};
    records.forEach(function (record) {
      if (!record || !/^[\w-]{8,100}$/.test(record.operationId || '') || ids[record.operationId] || !record.code || codes[record.code] || !record.recordId || rows[record.recordId] || record.baseRevision !== 0) throw new Error('Mã thao tác, mã dòng hoặc phiên bản không hợp lệ.');
      ids[record.operationId] = true; codes[record.code] = true; rows[record.recordId] = true;
    });
    var ordered = records.slice().sort(function (a, b) { return a.operationId.localeCompare(b.operationId); });
    var key = io.digest(stable({ source: source, operations: ordered.map(function (r) { return r.operationId; }) }));
    var fingerprint = io.digest(stable({ source: source, records: ordered }));
    var existing = io.receipt(key);
    function confirm(receipt, current) {
      if (current.hash !== receipt.afterHash) throw new Error('Chưa xác định kết quả ghi Excel. Giữ phần sửa trên máy để đối chiếu; hệ thống không tự gửi lại.');
      var results = io.confirm(current, records);
      receipt.phase = 'committed'; receipt.results = results; receipt.confirmedAt = io.now();
      io.storeReceipt(key, receipt);
      return { results: results };
    }
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error('Mã thao tác đã được dùng cho nội dung khác. Phần sửa trên máy vẫn được giữ.');
      if (existing.phase === 'committed') return { results: existing.results };
      if (existing.phase === 'rejected') return { results: records.map(function (r) { return { recordId: r.recordId, ok: false, error: 'CONFLICT', message: 'File Excel đã thay đổi trước khi ghi. Giữ phần sửa để đối chiếu với nguồn mới.' }; }) };
      // A lost reply is never permission to repeat a whole-file write.
      return confirm(existing, io.read());
    }
    ordered.forEach(function (record) {
      var old = io.operation(record.operationId);
      if (old && old !== key) throw new Error('Thao tác này thuộc lần lưu chưa xử lý xong. Giữ phần sửa để đối chiếu trước khi tạo lần lưu khác.');
    });
    var before = io.read();
    // Codec validates every baseline and every record before ANY backup/write.
    var prepared = io.prepare(before, records);
    var backupId = io.backup(before, key);
    if (!backupId) throw new Error('Chưa xác nhận bản sao an toàn; chưa ghi Excel.');
    var receipt = { schemaVersion: 1, source: source, fingerprint: fingerprint, records: ordered, beforeHash: before.hash, afterHash: prepared.hash, backupId: backupId, phase: 'prepared', at: io.now(), actor: io.actor };
    io.storeReceipt(key, receipt);
    ordered.forEach(function (record) { io.storeOperation(record.operationId, key); });
    var response;
    try { response = io.write(prepared, before.etag); }
    catch (error) { return confirm(receipt, io.read()); }
    if (response.status === 412) {
      receipt.phase = 'rejected'; io.storeReceipt(key, receipt);
      return { results: records.map(function (r) { return { recordId: r.recordId, ok: false, error: 'CONFLICT', message: 'Có người sửa file Excel trong lúc lưu. Không ghi đè; phần sửa trên máy vẫn được giữ.' }; }) };
    }
    if (response.status !== 200) throw new Error('Google chưa xác nhận ghi Excel (HTTP ' + response.status + '). Giữ phần sửa trên máy; không tự gửi lại.');
    return confirm(receipt, io.read());
  }
  return { save: save, stable: stable };
})();
