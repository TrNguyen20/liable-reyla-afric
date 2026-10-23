/**
 * ============================================================================
 * DYNAMO VIETNAM QT - MES (MANUFACTURING EXECUTION SYSTEM)
 * GOOGLE APPS SCRIPT WEBHOOK ĐỒNG BỘ HAI CHIỀU (BIDIRECTIONAL WRITEBACK)
 * ============================================================================
 * 
 * Mục đích:
 * 1. Tiếp nhận payload JSON từ ứng dụng web DYNAMO MES khi kỹ sư cập nhật
 *    tiến độ lô gia công nhiệt luyện (TrangThai, ngay_nhan_QT, do_cung, ghi_chu).
 * 2. Tìm kiếm dòng dữ liệu tương ứng theo mã khóa duy nhất [ID_Key] và ghi ngược
 *    trực tiếp vào bảng tính Google Sheets điều độ luân chuyển.
 * 3. Tự động ghi chép nhật ký kiểm toán (Audit Trail) vào sheet [AUDIT_LOG].
 *
 * Cài đặt nhanh:
 * - Mở Google Sheets > Tiện ích mở rộng (Extensions) > Apps Script.
 * - Dán toàn bộ mã này vào tệp Code.gs.
 * - Nhấn "Triển khai" (Deploy) > "Tùy chọn triển khai mới" (New deployment) > "Ứng dụng web" (Web App).
 *   + Thực thi với tư cách (Execute as): "Tôi" (Me).
 *   + Ai có quyền truy cập (Who has access): "Bất kỳ ai" (Anyone).
 * - Sao chép Web App URL (dạng https://script.google.com/macros/s/.../exec) và dán vào trang /sync.
 */

// Cấu hình tùy chọn (để trống nếu script gắn trực tiếp vào Google Sheets)
var CONFIG = {
  // GID của tab chứa dữ liệu sản xuất chính (mặc định tab 1963478526 hoặc tìm tự động)
  TARGET_GID: '1963478526',
  // Tên tab dữ liệu (nếu không dùng GID, vd: 'DATA', 'THEO DOI', 'Sheet1')
  TARGET_SHEET_NAME: '',
  // Tên tab lưu nhật ký thay đổi
  AUDIT_SHEET_NAME: 'AUDIT_LOG',
  // Tên cột khóa chính
  PRIMARY_KEY_COL: 'ID_Key'
};

/**
 * Xử lý yêu cầu HTTP GET (Kiểm tra trạng thái Webhook qua trình duyệt)
 */
function doGet(e) {
  try {
    var ss = getSpreadsheet();
    var sheet = findTargetSheet(ss);
    var colMap = getColumnMap(sheet);
    
    var response = {
      ok: true,
      service: 'DYNAMO VIETNAM QT - MES Webhook Gateway',
      status: 'ONLINE',
      timestamp: new Date().toISOString(),
      spreadsheetName: ss.getName(),
      targetSheetName: sheet.getName(),
      targetSheetId: sheet.getSheetId(),
      totalRows: sheet.getLastRow(),
      detectedColumns: Object.keys(colMap),
      instructions: 'Gửi yêu cầu HTTP POST với payload JSON để cập nhật dữ liệu lô hàng.'
    };
    
    return ContentService.createTextOutput(JSON.stringify(response, null, 2))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: err.message
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Xử lý yêu cầu HTTP POST (Cập nhật dữ liệu từ MES Webhook)
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  // Khóa tối đa 15 giây tránh race-condition khi nhiều bên ghi cùng lúc
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
    } else if (action === 'ping') {
      return createJsonResponse(true, 'DYNAMO MES Webhook phản hồi tốt.', { timestamp: new Date().toISOString() });
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
 * Cập nhật một lô hàng duy nhất theo ID_Key
 */
function handleUpdateLot(payload) {
  var idKey = (payload.ID_Key || '').trim();
  if (!idKey) {
    return { ok: false, message: 'Thiếu mã khóa [ID_Key] cần cập nhật.' };
  }

  var updates = payload.updates || {};
  var user = payload.user || 'Hệ thống MES';
  var vendor = payload.cty_QT || '';

  var ss = getSpreadsheet();
  var sheet = findTargetSheet(ss);
  var colMap = getColumnMap(sheet);

  if (!colMap[CONFIG.PRIMARY_KEY_COL.toLowerCase()]) {
    return { ok: false, message: 'Không tìm thấy cột khóa chính [' + CONFIG.PRIMARY_KEY_COL + '] trong bảng tính.' };
  }

  var keyColIndex = colMap[CONFIG.PRIMARY_KEY_COL.toLowerCase()];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: false, message: 'Bảng tính không có dữ liệu hàng.' };
  }

  // Quét tìm dòng có ID_Key tương ứng
  var keyRange = sheet.getRange(2, keyColIndex, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < keyRange.length; i++) {
    if (String(keyRange[i][0]).trim() === idKey) {
      targetRow = i + 2; // +2 vì index bắt đầu từ 0 và dòng tiêu đề là 1
      break;
    }
  }

  if (targetRow === -1) {
    return { ok: false, message: 'Không tìm thấy lô có ID_Key = "' + idKey + '" trong bảng tính.' };
  }

  var updatedFields = [];
  var oldValues = {};
  var newValues = {};

  // 1. Cập nhật TrangThai
  if (updates.TrangThai !== undefined && colMap['trangthai']) {
    var col = colMap['trangthai'];
    var cell = sheet.getRange(targetRow, col);
    oldValues['TrangThai'] = cell.getValue();
    cell.setValue(updates.TrangThai);
    newValues['TrangThai'] = updates.TrangThai;
    updatedFields.push('TrangThai');
  }

  // 2. Cập nhật ngay_nhan_QT (hoặc ngay_nhan)
  var dateCol = colMap['ngay_nhan_qt'] || colMap['ngay_nhan'];
  if (updates.ngay_nhan_QT !== undefined && dateCol) {
    var cellDate = sheet.getRange(targetRow, dateCol);
    oldValues['ngay_nhan_QT'] = cellDate.getValue();
    cellDate.setValue(updates.ngay_nhan_QT);
    newValues['ngay_nhan_QT'] = updates.ngay_nhan_QT;
    updatedFields.push('ngay_nhan_QT');
  }

  // 3. Cập nhật do_cung
  if (updates.do_cung !== undefined && colMap['do_cung']) {
    var colHrc = colMap['do_cung'];
    var cellHrc = sheet.getRange(targetRow, colHrc);
    oldValues['do_cung'] = cellHrc.getValue();
    cellHrc.setValue(updates.do_cung);
    newValues['do_cung'] = updates.do_cung;
    updatedFields.push('do_cung');
  }

  // 4. Cập nhật ghi_chu (nếu có)
  var noteCol = colMap['ghi_chu'] || colMap['ghi chú'] || colMap['note'];
  if (updates.ghi_chu !== undefined && noteCol) {
    var cellNote = sheet.getRange(targetRow, noteCol);
    oldValues['ghi_chu'] = cellNote.getValue();
    cellNote.setValue(updates.ghi_chu);
    newValues['ghi_chu'] = updates.ghi_chu;
    updatedFields.push('ghi_chu');
  }

  // Ghi nhật ký vào sheet AUDIT_LOG
  logAuditTrail(ss, {
    timestamp: new Date(),
    ID_Key: idKey,
    user: user,
    vendor: vendor,
    fromStatus: oldValues['TrangThai'] || '',
    toStatus: newValues['TrangThai'] || '',
    do_cung: newValues['do_cung'] || '',
    ngay_nhan: newValues['ngay_nhan_QT'] || '',
    details: JSON.stringify(newValues)
  });

  return {
    ok: true,
    message: 'Đã cập nhật thành công lô ' + idKey + ' tại dòng ' + targetRow,
    ID_Key: idKey,
    row: targetRow,
    updatedFields: updatedFields,
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

  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var res = handleUpdateLot({
      ID_Key: item.ID_Key,
      cty_QT: item.cty_QT || payload.cty_QT,
      user: payload.user,
      updates: item.updates || item
    });
    if (res.ok) {
      successCount++;
    } else {
      errors.push(item.ID_Key + ': ' + res.message);
    }
  }

  return {
    ok: errors.length === 0,
    message: 'Cập nhật thành công ' + successCount + '/' + items.length + ' lô.',
    successCount: successCount,
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
      // Tạo hàng tiêu đề chuyên nghiệp
      var headers = [
        'Thời Gian (Timestamp)',
        'Mã Lô (ID_Key)',
        'Người Thực Hiện (User/Role)',
        'Đơn Vị QT (Vendor)',
        'Trạng Thái Cũ',
        'Trạng Thái Mới',
        'Độ Cứng Thực Tế',
        'Ngày Nhận QT',
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
      record.do_cung,
      record.ngay_nhan,
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
 * Tìm sheet dữ liệu sản xuất chính xác (theo GID, tên, hoặc quét cột ID_Key)
 */
function findTargetSheet(ss) {
  var sheets = ss.getSheets();

  // 1. Tìm theo TARGET_GID nếu có
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

  // 3. Quét tự động sheet nào có chứa cột ID_Key ở dòng 1
  for (var j = 0; j < sheets.length; j++) {
    var cur = sheets[j];
    if (cur.getName() === CONFIG.AUDIT_SHEET_NAME) continue;
    var lastCol = cur.getLastColumn();
    if (lastCol > 0) {
      var row1 = cur.getRange(1, 1, 1, lastCol).getValues()[0];
      for (var k = 0; k < row1.length; k++) {
        if (String(row1[k]).trim().toLowerCase() === CONFIG.PRIMARY_KEY_COL.toLowerCase()) {
          return cur;
        }
      }
    }
  }

  // Fallback: Lấy sheet đầu tiên
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

/**
 * ============================================================================
 * HÀM THỬ NGHIỆM TRỰC TIẾP TRONG APPS SCRIPT (TEST RUNNER)
 * ============================================================================
 * Bạn có thể chọn hàm này trong trình chỉnh sửa Apps Script rồi bấm "Run" để kiểm tra.
 */
function testUpdateLot() {
  var ss = getSpreadsheet();
  var sheet = findTargetSheet(ss);
  var colMap = getColumnMap(sheet);
  
  Logger.log('Đã phát hiện sheet: ' + sheet.getName() + ' (ID: ' + sheet.getSheetId() + ')');
  Logger.log('Các cột phát hiện: ' + JSON.stringify(colMap));

  // Thử nghiệm ping
  var fakeEvent = {
    postData: {
      contents: JSON.stringify({
        action: 'ping'
      })
    }
  };
  var pingRes = doPost(fakeEvent);
  Logger.log('Kết quả Ping test: ' + pingRes.getContent());
}
