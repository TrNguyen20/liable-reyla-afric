/**
 * ============================================================================
 * DYNAMO VIETNAM QT - MES (MANUFACTURING EXECUTION SYSTEM)
 * GOOGLE APPS SCRIPT WEBHOOK ĐỒNG BỘ HAI CHIỀU & REALTIME DELTA HUB (v2.5.0)
 * ============================================================================
 * 
 * Mục đích:
 * 1. Tiếp nhận payload JSON từ ứng dụng web DYNAMO MES khi người dùng cập nhật
 *    tiến độ lô gia công nhiệt luyện (so_luong, do_cung, ghi_chu, 12 cột phản hồi NCC, v.v.).
 * 2. Tìm kiếm dòng dữ liệu tương ứng theo mã khóa [id_nhiet_qt] hoặc [ID_Key]
 *    trong bảng tính 36 cột thực tế (hơn 27.000 dòng dữ liệu).
 * 3. Bảo vệ 7 cột Master cố định không bị ghi đè từ bảng điều độ:
 *    [id_nhiet_qt, ma_hang, ngay_tao, quoc_gia, phong_sx, doi_tuong_hang, cty_qt].
 * 4. Tự động ghi chép nhật ký kiểm toán toàn diện vào tab [AUDIT_LOG].
 * 5. Duy trì bộ nhớ đệm CacheService & ScriptProperties toàn cục để cung cấp
 *    cơ chế Delta Sync tức thì (< 100ms) cho mọi client mà không phụ thuộc vào CDN.
 *
 * Hướng dẫn triển khai (Deployment Guide):
 * 1. Mở Google Sheets (link mới chứa tab gid=1963478526).
 * 2. Chọn menu Tiện ích mở rộng (Extensions) > Apps Script.
 * 3. Dán toàn bộ mã này vào tệp Code.gs.
 * 4. Nhấn "Triển khai" (Deploy) > "Quản lý tùy chọn triển khai" (Manage deployments)
 *    hoặc "Tùy chọn triển khai mới" (New deployment) > chọn "Ứng dụng web" (Web App).
 *    + Mô tả: DYNAMO QT-MES Webhook v2.5.0 (36 Columns Schema)
 *    + Thực thi với tư cách (Execute as): "Tôi" (Me)
 *    + Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone)
 * 5. Sao chép Web App URL (dạng https://script.google.com/macros/s/.../exec)
 *    và dán vào mục cấu hình tại trang /sync của DYNAMO MES.
 */

// Cấu hình tùy chọn
var CONFIG = {
  // GID của tab chứa dữ liệu sản xuất chính (tab mới: 1963478526)
  TARGET_GID: '1963478526',
  // Tên tab dữ liệu dự phòng (nếu không dùng GID)
  TARGET_SHEET_NAME: '',
  // Tên tab lưu nhật ký kiểm toán
  AUDIT_SHEET_NAME: 'AUDIT_LOG',
  // Cột khóa chính nhận diện lô (hỗ trợ cả schema 36 cột mới và cũ)
  PRIMARY_KEY_COLS: ['id_nhiet_qt', 'id_key', 'id']
};

// 7 Cột Master bất biến (Strictly Read-Only - Không cho phép chỉnh sửa từ Webapp)
var IMMUTABLE_COLUMNS = [
  'id_nhiet_qt',
  'ma_hang',
  'ngay_tao',
  'quoc_gia',
  'phong_sx',
  'doi_tuong_hang',
  'id_ma_hang',
  'cty_qt'
];

var DELTAS_KEY = 'DYNAMO_RECENT_DELTAS';
var VERSION_KEY = 'DYNAMO_VERSION';
var CACHE_EXPIRY_SEC = 21600; // 6 giờ lưu trữ đệm

/**
 * Lấy số phiên bản hiện tại từ CacheService / ScriptProperties
 */
function getGlobalVersion() {
  try {
    var cache = CacheService.getScriptCache();
    var cached = cache.get(VERSION_KEY);
    if (cached) return Number(cached) || 1;
    var props = PropertiesService.getScriptProperties();
    var stored = props.getProperty(VERSION_KEY);
    var v = stored ? Number(stored) || 1 : 1;
    cache.put(VERSION_KEY, String(v), CACHE_EXPIRY_SEC);
    return v;
  } catch (e) {
    return 1;
  }
}

/**
 * Tăng số phiên bản toàn cục khi có thay đổi
 */
function incrementGlobalVersion() {
  try {
    var props = PropertiesService.getScriptProperties();
    var cur = Number(props.getProperty(VERSION_KEY)) || 1;
    var next = cur + 1;
    props.setProperty(VERSION_KEY, String(next));
    var cache = CacheService.getScriptCache();
    cache.put(VERSION_KEY, String(next), CACHE_EXPIRY_SEC);
    return next;
  } catch (e) {
    return Date.now();
  }
}

/**
 * Ghi delta thay đổi vào bộ đệm FIFO gần nhất (lưu tối đa 200 thay đổi)
 */
function recordDelta(delta) {
  try {
    var cache = CacheService.getScriptCache();
    var listRaw = cache.get(DELTAS_KEY);
    var list = [];
    if (listRaw) {
      try { list = JSON.parse(listRaw); } catch (e) { }
    } else {
      var props = PropertiesService.getScriptProperties();
      var pRaw = props.getProperty(DELTAS_KEY);
      if (pRaw) {
        try { list = JSON.parse(pRaw); } catch (e) { }
      }
    }
    list.push(delta);
    if (list.length > 200) {
      list = list.slice(list.length - 200);
    }
    var serialized = JSON.stringify(list);
    cache.put(DELTAS_KEY, serialized, CACHE_EXPIRY_SEC);
    PropertiesService.getScriptProperties().setProperty(DELTAS_KEY, serialized);
  } catch (err) {
    Logger.log('Lỗi lưu delta: ' + err.message);
  }
}

/**
 * Trả về các deltas phát sinh sau sinceVersion
 */
function getRecentDeltas(sinceVersion) {
  try {
    var cache = CacheService.getScriptCache();
    var listRaw = cache.get(DELTAS_KEY);
    var list = [];
    if (listRaw) {
      try { list = JSON.parse(listRaw); } catch (e) { }
    } else {
      var props = PropertiesService.getScriptProperties();
      var pRaw = props.getProperty(DELTAS_KEY);
      if (pRaw) {
        try { list = JSON.parse(pRaw); } catch (e) { }
      }
    }
    var threshold = Number(sinceVersion) || 0;
    return list.filter(function (d) {
      return (Number(d.version) || 0) > threshold;
    });
  } catch (err) {
    Logger.log('Lỗi đọc delta: ' + err.message);
    return [];
  }
}

/**
 * Xử lý yêu cầu HTTP GET
 * - action=checkVersion / version: Kiểm tra nhanh phiên bản (< 50ms)
 * - action=getDeltas / deltas: Lấy các thay đổi từ sau sinceVersion
 * - Mặc định: Trả về trạng thái Gateway chẩn đoán kết nối
 */
function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? String(e.parameter.action).trim() : '';
    var version = getGlobalVersion();

    if (action === 'checkVersion' || action === 'version') {
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        version: version,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'getDeltas' || action === 'deltas') {
      var since = Number((e.parameter && (e.parameter.since || e.parameter.sinceVersion)) || 0);
      var deltas = getRecentDeltas(since);
      return ContentService.createTextOutput(JSON.stringify({
        ok: true,
        version: version,
        deltas: deltas,
        count: deltas.length,
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var ss = getSpreadsheet();
    var sheet = findTargetSheet(ss);
    var colMap = getColumnMap(sheet);

    var response = {
      ok: true,
      service: 'DYNAMO VIETNAM QT - MES Webhook Gateway & Realtime Hub',
      version: version,
      schema: '36-column Google Sheets Schema (v2.5.0)',
      timestamp: new Date().toISOString(),
      spreadsheetName: ss.getName(),
      targetSheetName: sheet.getName(),
      targetSheetId: sheet.getSheetId(),
      totalRows: sheet.getLastRow(),
      detectedColumnsCount: Object.keys(colMap).length,
      detectedColumns: Object.keys(colMap),
      instructions: 'Gửi HTTP POST payload JSON để cập nhật lô, hoặc GET ?action=checkVersion / ?action=getDeltas để đồng bộ thời gian thực.'
    };

    return ContentService.createTextOutput(JSON.stringify(response, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Xử lý yêu cầu HTTP POST (Cập nhật dữ liệu từ MES Webhook)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (lockErr) {
    return createJsonResponse(false, 'Hệ thống Google Sheets đang bận xử lý giao dịch khác, vui lòng thử lại sau giây lát.');
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse(false, 'Yêu cầu không chứa nội dung dữ liệu (postData trống).');
    }

    var payload;
    try {
      payload = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return createJsonResponse(false, 'Định dạng dữ liệu không phải JSON hợp lệ: ' + parseErr.message);
    }

    var action = payload.action || 'updateLot';

    if (action === 'updateLot') {
      var result = handleUpdateLot(payload);
      return createJsonResponse(result.ok, result.message, result);
    } else if (action === 'bulkUpdateLots') {
      var bulkResult = handleBulkUpdateLots(payload);
      return createJsonResponse(bulkResult.ok, bulkResult.message, bulkResult);
    } else if (action === 'checkVersion' || action === 'version') {
      var currentVersion = getGlobalVersion();
      return createJsonResponse(true, 'OK', { version: currentVersion });
    } else if (action === 'getDeltas' || action === 'deltas') {
      var sinceVer = Number(payload.since || payload.sinceVersion || 0);
      var curVer = getGlobalVersion();
      var deltasList = getRecentDeltas(sinceVer);
      return createJsonResponse(true, 'OK', { version: curVer, deltas: deltasList });
    } else if (action === 'ping') {
      return createJsonResponse(true, 'DYNAMO MES Webhook phản hồi tốt.', {
        timestamp: new Date().toISOString(),
        version: getGlobalVersion()
      });
    } else {
      return createJsonResponse(false, 'Hành động (action) không được hỗ trợ: ' + action);
    }

  } catch (fatalErr) {
    return createJsonResponse(false, 'Lỗi ngoại lệ khi xử lý: ' + fatalErr.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Cập nhật một lô hàng duy nhất theo id_nhiet_qt / ID_Key
 */
function handleUpdateLot(payload) {
  var idKey = (payload.id_nhiet_qt || payload.ID_Key || '').trim();
  if (!idKey) {
    return { ok: false, message: 'Thiếu mã định danh lô [id_nhiet_qt / ID_Key] cần cập nhật.' };
  }

  var updates = payload.updates || {};
  var user = payload.user || 'Hệ thống MES';
  var vendor = payload.cty_QT || payload.cty_qt || '';

  var ss = getSpreadsheet();
  var sheet = findTargetSheet(ss);
  var colMap = getColumnMap(sheet);

  // Tìm vị trí cột khóa chính (hỗ trợ cả id_nhiet_qt và ID_Key)
  var keyColIndex = null;
  for (var k = 0; k < CONFIG.PRIMARY_KEY_COLS.length; k++) {
    var cand = CONFIG.PRIMARY_KEY_COLS[k].toLowerCase();
    if (colMap[cand]) {
      keyColIndex = colMap[cand];
      break;
    }
  }

  if (!keyColIndex) {
    return { ok: false, message: 'Không tìm thấy cột khóa chính [id_nhiet_qt / ID_Key] trong bảng tính.' };
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: false, message: 'Bảng tính không có dữ liệu hàng.' };
  }

  // Quét tìm dòng có id_nhiet_qt / ID_Key tương ứng
  var keyRange = sheet.getRange(2, keyColIndex, lastRow - 1, 1).getValues();
  var targetRow = -1;
  var normalizedId = idKey.toLowerCase();
  for (var i = 0; i < keyRange.length; i++) {
    if (String(keyRange[i][0]).trim().toLowerCase() === normalizedId) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    return { ok: false, message: 'Không tìm thấy lô có mã = "' + idKey + '" trong bảng tính.' };
  }

  var updatedFields = [];
  var skippedImmutableFields = [];
  var oldValues = {};
  var newValues = {};

  // Bản đồ Alias nhận diện tên cột chuẩn xác cho Schema 36 cột
  var fieldAliases = {
    // Nhóm trạng thái
    'trang_thai': ['trang_thai', 'trangthai', 'trạng thái', 'status', 'tình trạng'],
    'trangthai': ['trang_thai', 'trangthai', 'trạng thái', 'status'],
    // Nhóm kỹ thuật & vật tư
    'vat_lieu': ['vat_lieu', 'vật liệu', 'mác thép', 'material', 'chất liệu'],
    'do_cung': ['do_cung', 'độ cứng', 'hardness', 'hrc'],
    'kich_thuoc_sp': ['kich_thuoc_sp', 'quy cách kt', 'quy cach kt', 'kích thước sp', 'dimension'],
    'so_luong': ['so_luong', 'số lượng', 'quantity', 'qty'],
    'kg_lot': ['kg_lot', 'khối lượng', 'trọng lượng', 'kg', 'weight'],
    'don_vi_tinh': ['don_vi_tinh', 'dvt', 'uom', 'đơn vị tính'],
    'so_luong_tinh': ['so_luong_tinh', 'sl tinh', 'số lượng tính'],
    'don_gia': ['don_gia', 'đơn giá', 'unit_price', 'price'],
    'thanh_tien': ['thanh_tien', 'thành tiền', 'total_amount'],
    'ty_gia': ['ty_gia', 'tỷ giá', 'exchange_rate'],
    'ngay_gui_qt': ['ngay_gui_qt', 'ngày gửi', 'ngay_gui', 'ngày gửi qt', 'sent_date'],
    'han_tra': ['han_tra', 'hạn trả', 'due_date', 'ngày hẹn trả'],
    'ghi_chu_khi_gui': ['ghi_chu_khi_gui', 'ghi_chu', 'ghi chú', 'note', 'GHI CHÚ'],
    'ghi_chu': ['ghi_chu_khi_gui', 'ghi_chu', 'ghi chú', 'note'],
    // Nhóm 12 trường NCC (ncc_*)
    'ncc_ngay_qt': ['ncc_ngay_qt', 'NCC NGÀY QT', 'ncc vao lo', 'ngày NCC NGÀY QT', 'oven_date'],
    'ncc_ngay_tra_qt': ['ncc_ngay_tra_qt', 'ncc hạn trả', 'ncc han tra', 'ngày trả ncc'],
    'ncc_id_lot_qt': ['ncc_id_lot_qt', 'NCC LÔ QT', 'ncc ma me', 'mã mẻ ncc', 'mã lô ncc'],
    'ncc_name_qt': ['ncc_name_qt', 'NCC TÊN QT', 'kỹ thuật viên ncc', 'kỹ thuật ncc'],
    'ncc_giando': ['ncc_giando', 'giản đồ nhiệt', 'biểu đồ nhiệt', 'heat_diagram'],
    'ncc_ket_qua_hrc': ['ncc_ket_qua_hrc', 'hrc thực tế', 'độ cứng đo', 'actual_hrc'],
    'ncc_ket_qua_qc': ['ncc_ket_qua_qc', 'ncc nghiệm thu', 'nghiệm thu ncc', 'qc_result'],
    'ncc_don_gia': ['ncc_don_gia', 'ncc báo giá', 'đơn giá ncc', 'vendor_price'],
    'ncc_tatus': ['ncc_tatus', 'ncc tiến độ', 'trạng thái ncc', 'vendor_status'],
    'ncc_thongtinkhac1': ['ncc_thongtinkhac1', 'thông tin ghi chú 1', 'ncc_info1'],
    'ncc_thongtinkhac2': ['ncc_thongtinkhac2', 'thông tin mở rộng 2', 'ncc_info2'],
    'ncc_file1': ['ncc_file1', 'CHỨNG CHỈ QT', 'file chứng nhận', 'qc_file']
  };

  function findColumnForField(fieldKey) {
    var k = String(fieldKey).trim().toLowerCase();

    // 1. Khớp chính xác tên cột trong colMap (Ưu tiên số 1)
    if (colMap[k]) return colMap[k];

    // 2. Tra bảng bí danh (Aliases Match)
    var aliases = fieldAliases[k];
    if (aliases) {
      for (var a = 0; a < aliases.length; a++) {
        var alias = aliases[a].toLowerCase();
        if (colMap[alias]) return colMap[alias];
      }
    }

    // 3. Fallback an toàn: Khớp hoàn toàn không phân biệt hoa thường
    for (var colName in colMap) {
      if (colName === k) {
        return colMap[colName];
      }
    }
    return null;
  }

  // Cập nhật các trường được gửi lên trong updates
  for (var fieldKey in updates) {
    if (updates.hasOwnProperty(fieldKey)) {
      var val = updates[fieldKey];
      if (val === undefined || val === null) continue;

      var normKey = String(fieldKey).trim().toLowerCase();

      // Bảo vệ 7 cột Master không bị ghi đè trái phép từ màn hình webapp
      if (IMMUTABLE_COLUMNS.indexOf(normKey) !== -1 && !payload.forceMasterUpdate) {
        skippedImmutableFields.push(fieldKey);
        continue;
      }

      var colIdx = findColumnForField(fieldKey);
      if (colIdx) {
        var cell = sheet.getRange(targetRow, colIdx);
        oldValues[fieldKey] = cell.getValue();
        cell.setValue(val);
        newValues[fieldKey] = val;
        updatedFields.push(fieldKey);
      }
    }
  }

  // Ghi nhật ký vào sheet AUDIT_LOG
  logAuditTrail(ss, {
    timestamp: new Date(),
    ID_Key: idKey,
    user: user,
    vendor: vendor,
    fromStatus: oldValues['trang_thai'] || oldValues['TrangThai'] || '',
    toStatus: newValues['trang_thai'] || newValues['TrangThai'] || '',
    ncc_ket_qua_qc: newValues['ncc_ket_qua_qc'] || '',
    details: JSON.stringify(newValues)
  });

  // Tăng phiên bản toàn cục và lưu delta vào Realtime Cache Hub
  var newVersion = incrementGlobalVersion();
  recordDelta({
    id: idKey,
    patch: newValues,
    version: newVersion,
    timestamp: new Date().toISOString(),
    user: user
  });

  var msg = 'Đã cập nhật thành công lô ' + idKey + ' (' + updatedFields.join(', ') + ') tại dòng ' + targetRow;
  if (skippedImmutableFields.length > 0) {
    msg += ' [Đã bỏ qua các trường Master chỉ-đọc: ' + skippedImmutableFields.join(', ') + ']';
  }

  return {
    ok: true,
    message: msg,
    id_nhiet_qt: idKey,
    ID_Key: idKey,
    row: targetRow,
    updatedFields: updatedFields,
    skippedFields: skippedImmutableFields,
    version: newVersion,
    delta: {
      id: idKey,
      patch: newValues,
      version: newVersion
    },
    changes: { old: oldValues, current: newValues }
  };
}

/**
 * Cập nhật hàng loạt nhiều lô
 */
function handleBulkUpdateLots(payload) {
  var items = payload.items || [];
  if (!items.length) {
    return { ok: false, message: 'Danh sách lô cần cập nhật rỗng.' };
  }

  var successCount = 0;
  var errors = [];
  var lastVersion = getGlobalVersion();

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var res = handleUpdateLot({
      id_nhiet_qt: item.id_nhiet_qt || item.ID_Key,
      ID_Key: item.ID_Key || item.id_nhiet_qt,
      cty_QT: item.cty_QT || item.cty_qt || payload.cty_QT,
      user: payload.user,
      updates: item.updates || item
    });
    if (res.ok) {
      successCount++;
      if (res.version) lastVersion = res.version;
    } else {
      errors.push((item.id_nhiet_qt || item.ID_Key) + ': ' + res.message);
    }
  }

  return {
    ok: errors.length === 0,
    message: 'Cập nhật thành công ' + successCount + '/' + items.length + ' lô.',
    successCount: successCount,
    version: lastVersion,
    errors: errors
  };
}

/**
 * Ghi nhật ký kiểm toán vào sheet AUDIT_LOG
 */
function logAuditTrail(ss, record) {
  try {
    var auditSheet = ss.getSheetByName(CONFIG.AUDIT_SHEET_NAME);
    if (!auditSheet) {
      auditSheet = ss.insertSheet(CONFIG.AUDIT_SHEET_NAME);
      var headers = [
        'Thời Gian (Timestamp)',
        'Mã Lô (id_nhiet_qt)',
        'Người Thực Hiện (User/Role)',
        'Đơn Vị QT (Vendor)',
        'Trạng Thái Cũ',
        'Trạng Thái Mới',
        'Nghiệm Thu QC NCC',
        'Chi Tiết Thay Đổi'
      ];
      auditSheet.appendRow(headers);
      var headerRange = auditSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#1a237e');
      headerRange.setFontColor('#ffffff');
      headerRange.setFontWeight('bold');
      auditSheet.setFrozenRows(1);
    }

    auditSheet.appendRow([
      Utilities.formatDate(record.timestamp, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss'),
      record.ID_Key,
      record.user,
      record.vendor,
      record.fromStatus,
      record.toStatus,
      record.ncc_ket_qua_qc,
      record.details
    ]);
  } catch (e) {
    Logger.log('Không thể ghi audit log: ' + e.message);
  }
}

/**
 * Lấy đối tượng Spreadsheet đang gắn kết
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Tìm sheet dữ liệu sản xuất chính xác (theo GID, tên, hoặc quét cột id_nhiet_qt)
 */
function findTargetSheet(ss) {
  var sheets = ss.getSheets();

  // 1. Tìm theo TARGET_GID nếu có (tab 1963478526)
  if (CONFIG.TARGET_GID) {
    for (var i = 0; i < sheets.length; i++) {
      if (String(sheets[i].getSheetId()) === String(CONFIG.TARGET_GID)) {
        return sheets[i];
      }
    }
  }

  // 2. Tìm theo TARGET_SHEET_NAME nếu có
  if (CONFIG.TARGET_SHEET_NAME) {
    var s = ss.getSheetByName(CONFIG.TARGET_SHEET_NAME);
    if (s) return s;
  }

  // 3. Quét tự động sheet nào có chứa cột id_nhiet_qt hoặc ID_Key ở dòng 1
  for (var j = 0; j < sheets.length; j++) {
    var cur = sheets[j];
    if (cur.getName() === CONFIG.AUDIT_SHEET_NAME) continue;
    var lastCol = cur.getLastColumn();
    if (lastCol > 0) {
      var row1 = cur.getRange(1, 1, 1, lastCol).getValues()[0];
      for (var k = 0; k < row1.length; k++) {
        var colHeader = String(row1[k]).trim().toLowerCase();
        for (var p = 0; p < CONFIG.PRIMARY_KEY_COLS.length; p++) {
          if (colHeader === CONFIG.PRIMARY_KEY_COLS[p].toLowerCase()) {
            return cur;
          }
        }
      }
    }
  }

  return sheets[0];
}

/**
 * Lập bản đồ ánh xạ tên cột -> chỉ số cột (1-based index)
 */
function getColumnMap(sheet) {
  var map = {};
  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return map;

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    var colName = String(headers[i] || '').trim().toLowerCase();
    if (colName) {
      map[colName] = i + 1;
    }
  }
  return map;
}

/**
 * Trợ thủ trả về kết quả định dạng JSON
 */
function createJsonResponse(ok, message, extra) {
  var res = {
    ok: ok,
    message: message
  };
  if (extra) {
    for (var k in extra) {
      if (extra.hasOwnProperty(k) && k !== 'ok' && k !== 'message') {
        res[k] = extra[k];
      }
    }
  }
  return ContentService.createTextOutput(JSON.stringify(res))
    .setMimeType(ContentService.MimeType.JSON);
}
