const fs = require('fs');
const path = require('path');

const localesDir = path.resolve('src/i18n/locales');
const locales = ['vi', 'en', 'ja'];
const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];

function readJson(loc, ns) {
  return JSON.parse(fs.readFileSync(path.join(localesDir, loc, `${ns}.json`), 'utf-8'));
}

function writeJson(loc, ns, data) {
  fs.writeFileSync(path.join(localesDir, loc, `${ns}.json`), JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

// 1. UPDATE COMMON.JSON
const commonVi = readJson('vi', 'common');
const commonEn = readJson('en', 'common');
const commonJa = readJson('ja', 'common');

// ticket.fields.orderNo
commonVi.ticket.fields.orderNo = 'Số đơn hàng (PO):';
commonEn.ticket.fields.orderNo = 'PO / Order No:';
commonJa.ticket.fields.orderNo = '発注番号 (PO):';

// loading string and flat keys for sub-namespace lookup
commonVi.loading = 'Đang tải dữ liệu...';
commonVi['loading.permissions'] = 'Đang tải dữ liệu phân quyền…';
commonVi['loading.failedTitle'] = 'Chưa tải được dữ liệu sản xuất';
commonVi['loading.syncing'] = 'Đang đồng bộ dữ liệu nhiệt luyện từ Google Sheets…';

commonEn.loading = 'Loading data...';
commonEn['loading.permissions'] = 'Loading authorization data…';
commonEn['loading.failedTitle'] = 'Failed to load production data';
commonEn['loading.syncing'] = 'Syncing heat treatment data from Google Sheets…';

commonJa.loading = 'データ読込中...';
commonJa['loading.permissions'] = '権限データ読込中…';
commonJa['loading.failedTitle'] = '製造データを読み込めませんでした';
commonJa['loading.syncing'] = 'Googleスプレッドシートから熱処理データを同期中…';

// top-level additions
commonVi.source = 'Nguồn';
commonEn.source = 'Source';
commonJa.source = 'データ元';

commonVi.cache = 'Cache';
commonEn.cache = 'Cache';
commonJa.cache = 'キャッシュ';

commonVi.lastSynced = 'Đồng bộ gần nhất';
commonEn.lastSynced = 'Last synced';
commonJa.lastSynced = '最終同期';

commonVi.noTimestamp = 'Chưa có mốc thời gian';
commonEn.noTimestamp = 'No timestamp';
commonJa.noTimestamp = '時刻記録なし';

commonVi.thisMonth = 'Tháng này';
commonEn.thisMonth = 'This month';
commonJa.thisMonth = '今月';

commonVi.lastMonth = 'Tháng trước';
commonEn.lastMonth = 'Last month';
commonJa.lastMonth = '先月';

commonVi.selected = 'Đang chọn';
commonEn.selected = 'Selected';
commonJa.selected = '選択中';

// filters object
commonVi.filters = {
  search: 'Tìm kiếm...',
  clear: 'Xóa lọc mã lô',
  deselect: 'Bỏ chọn',
  deselectAll: 'Bỏ chọn hết',
  selectAll: 'Chọn tất cả',
  min: 'Từ (Min)',
  max: 'Đến (Max)',
  allPartners: 'Tất cả đối tác',
  allStatus: 'Mọi logistics',
  resetFilter: 'Đặt lại'
};
commonEn.filters = {
  search: 'Search...',
  clear: 'Clear filter',
  deselect: 'Deselect',
  deselectAll: 'Deselect all',
  selectAll: 'Select all',
  min: 'Min',
  max: 'Max',
  allPartners: 'All partners',
  allStatus: 'All logistics',
  resetFilter: 'Reset'
};
commonJa.filters = {
  search: '検索...',
  clear: 'フィルター解除',
  deselect: '選択解除',
  deselectAll: '全解除',
  selectAll: '全選択',
  min: '最小 (Min)',
  max: '最大 (Max)',
  allPartners: '全外注先',
  allStatus: '全ステータス',
  resetFilter: 'リセット'
};

// pagination object
commonVi.pagination = {
  prev: 'Trang trước',
  page: 'Trang',
  next: 'Trang sau'
};
commonEn.pagination = {
  prev: 'Previous',
  page: 'Page',
  next: 'Next'
};
commonJa.pagination = {
  prev: '前へ',
  page: 'ページ',
  next: '次へ'
};

// jobTicket object
commonVi.jobTicket = {
  sec1: {
    size: 'Kích thước SP',
    unitPrice: 'Đơn giá gia công',
    totalPrice: 'Thành tiền dự kiến'
  }
};
commonEn.jobTicket = {
  sec1: {
    size: 'Dimensions',
    unitPrice: 'Unit Price',
    totalPrice: 'Estimated Total'
  }
};
commonJa.jobTicket = {
  sec1: {
    size: '製品寸法',
    unitPrice: '加工単価',
    totalPrice: '概算金額'
  }
};

// Preserve QT in ja/common.json
commonJa.meta.description = '精密機械加工工場向けの熱処理・外注 QT 工程管理システム。';
commonJa.notFound.backAction = 'QT 熱処理工程管理へ戻る';
commonJa.errorBoundary.goHome = 'QT 熱処理工程管理へ';
commonJa.auth.meta.desc = '熱処理・外注 QT 工程管理システムへのログイン。';
commonJa.auth.hero.badge = '社内 QT 熱処理管理システム';
commonJa.auth.hero.title = '熱処理外注・QT 工程管理システム';
commonJa.lotUpdate.dateBeforeSent = '受入日は QT 発送日より前にはできません。';

writeJson('vi', 'common', commonVi);
writeJson('en', 'common', commonEn);
writeJson('ja', 'common', commonJa);


// 2. UPDATE TRACKING.JSON
const trackingVi = readJson('vi', 'tracking');
const trackingEn = readJson('en', 'tracking');
const trackingJa = readJson('ja', 'tracking');

trackingVi.columns.partNo = 'MÃ HÀNG';
trackingEn.columns.partNo = 'PART NO';
trackingJa.columns.partNo = '品番';

trackingVi.status.inspect = 'INSPECT';
trackingEn.status.inspect = 'INSPECT';
trackingJa.status.inspect = 'INSPECT';

trackingVi.dueTags.overdue = 'trễ hạn';
trackingEn.dueTags.overdue = 'overdue';
trackingJa.dueTags.overdue = '納期遅延';

trackingVi.filters = trackingVi.filters || {};
trackingEn.filters = trackingEn.filters || {};
trackingJa.filters = trackingJa.filters || {};

trackingVi.filters.missingHardness = 'Chưa có độ cứng';
trackingEn.filters.missingHardness = 'Missing hardness';
trackingJa.filters.missingHardness = '硬度未設定';

trackingVi.filters.hasNote = 'Có ghi chú';
trackingEn.filters.hasNote = 'Has notes';
trackingJa.filters.hasNote = '備考あり';

trackingVi.actions.allFiltersCleared = 'Đã xóa toàn bộ bộ lọc trên bảng.';
trackingEn.actions.allFiltersCleared = 'All table filters have been cleared.';
trackingJa.actions.allFiltersCleared = 'すべてのテーブルフィルターを解除しました。';

trackingVi.actions.filtering = 'Đang lọc ({count}):';
trackingEn.actions.filtering = 'Filtering ({count}):';
trackingJa.actions.filtering = '絞り込み中 ({count}):';

trackingVi.actions.clearFilterItem = 'Bỏ tiêu chí này';
trackingEn.actions.clearFilterItem = 'Remove filter';
trackingJa.actions.clearFilterItem = 'この条件を解除';

trackingVi.actions.clearFilterTooltip = 'Xóa toàn bộ các bộ lọc trên bảng';
trackingEn.actions.clearFilterTooltip = 'Clear all table filters';
trackingJa.actions.clearFilterTooltip = '全フィルターを解除';

trackingVi.workshops.filterTooltip = 'Lọc nhanh theo phân xưởng gia công';
trackingEn.workshops.filterTooltip = 'Quick filter by processing workshop';
trackingJa.workshops.filterTooltip = '加工工場でクイック絞り込み';

trackingVi.density.compactTooltip = 'Chế độ nén dòng cao độ (~32px)';
trackingEn.density.compactTooltip = 'Compact row density mode (~32px)';
trackingJa.density.compactTooltip = 'コンパクト表示モード (~32px)';

trackingVi.density.normalTooltip = 'Chế độ dòng tiêu chuẩn (~42px)';
trackingEn.density.normalTooltip = 'Standard row density mode (~42px)';
trackingJa.density.normalTooltip = '標準表示モード (~42px)';

trackingVi.toolbars.clearSearch = 'Xóa tìm kiếm (Phím tắt: Esc)';
trackingEn.toolbars.clearSearch = 'Clear search (Esc)';
trackingJa.toolbars.clearSearch = '検索クリア (Esc)';

trackingVi.toolbars.matched = 'Khớp';
trackingEn.toolbars.matched = 'Matched';
trackingJa.toolbars.matched = '一致';

trackingVi.toolbars.resetColWidthsTooltip = 'Khôi phục kích thước mặc định cho toàn bộ cột';
trackingEn.toolbars.resetColWidthsTooltip = 'Reset all column widths to default';
trackingJa.toolbars.resetColWidthsTooltip = '全列の幅をデフォルトに戻す';

trackingVi.toolbars.resetColWidths = 'Khôi phục cỡ cột';
trackingEn.toolbars.resetColWidths = 'Reset column widths';
trackingJa.toolbars.resetColWidths = '列幅リセット';

trackingVi.toolbars.exitFullscreen = 'Thu nhỏ bảng về kích thước ban đầu (Phím tắt: Alt+F)';
trackingEn.toolbars.exitFullscreen = 'Exit fullscreen (Alt+F)';
trackingJa.toolbars.exitFullscreen = '全画面表示を終了 (Alt+F)';

trackingVi.toolbars.enterFullscreen = 'Phóng to bảng toàn màn hình để tập trung điều độ (Phím tắt: Alt+F)';
trackingEn.toolbars.enterFullscreen = 'Enter fullscreen mode (Alt+F)';
trackingJa.toolbars.enterFullscreen = '全画面表示に切替 (Alt+F)';

trackingVi.toolbars.minimize = 'Thu nhỏ';
trackingEn.toolbars.minimize = 'Minimize';
trackingJa.toolbars.minimize = '縮小';

trackingVi.toolbars.fullscreen = 'Toàn màn hình';
trackingEn.toolbars.fullscreen = 'Fullscreen';
trackingJa.toolbars.fullscreen = '全画面';

trackingVi.toolbars.exportCsvTooltip = 'Tùy chọn xuất file CSV';
trackingEn.toolbars.exportCsvTooltip = 'CSV export options';
trackingJa.toolbars.exportCsvTooltip = 'CSVエクスポートオプション';

trackingVi.toolbars.exportCsv = 'Xuất CSV';
trackingEn.toolbars.exportCsv = 'Export CSV';
trackingJa.toolbars.exportCsv = 'CSV出力';

trackingVi.toolbars.exportCurrentPage = 'Trang hiện tại';
trackingEn.toolbars.exportCurrentPage = 'Current page';
trackingJa.toolbars.exportCurrentPage = '現在のページ';

trackingVi.toolbars.exportFiltered = 'Kết quả lọc';
trackingEn.toolbars.exportFiltered = 'Filtered results';
trackingJa.toolbars.exportFiltered = '絞り込み結果';

trackingVi.toolbars.exportAll = 'Toàn bộ hệ thống';
trackingEn.toolbars.exportAll = 'All records';
trackingJa.toolbars.exportAll = '全件出力';

trackingVi.toolbars.workshopSelect = 'Cập nhật đồng bộ các thông số cho toàn bộ lô được chọn';
trackingEn.toolbars.workshopSelect = 'Batch update parameters for all selected lots';
trackingJa.toolbars.workshopSelect = '選択された全ロットのパラメータを一括更新';

trackingVi.sort.sortThisCol = 'Sắp xếp cột này:';
trackingEn.sort.sortThisCol = 'Sort by this column:';
trackingJa.sort.sortThisCol = 'この列で並べ替え:';

trackingVi.sort.minToMax = 'Nhỏ nhất → Lớn nhất';
trackingEn.sort.minToMax = 'Min → Max';
trackingJa.sort.minToMax = '最小 → 最大';

trackingVi.sort.maxToMin = 'Lớn nhất → Nhỏ nhất';
trackingEn.sort.maxToMin = 'Max → Min';
trackingJa.sort.maxToMin = '最大 → 最小';

trackingVi.sort.lightToHeavy = 'Nhẹ nhất → Nặng nhất';
trackingEn.sort.lightToHeavy = 'Lightest → Heaviest';
trackingJa.sort.lightToHeavy = '軽量順 → 重量順';

trackingVi.sort.heavyToLight = 'Nặng nhất → Nhẹ nhất';
trackingEn.sort.heavyToLight = 'Heaviest → Lightest';
trackingJa.sort.heavyToLight = '重量順 → 軽量順';

writeJson('vi', 'tracking', trackingVi);
writeJson('en', 'tracking', trackingEn);
writeJson('ja', 'tracking', trackingJa);


// 3. UPDATE ORDERS.JSON
const ordersVi = readJson('vi', 'orders');
const ordersEn = readJson('en', 'orders');
const ordersJa = readJson('ja', 'orders');

ordersVi.actions.printAll = 'In phiếu cả đơn';
ordersEn.actions.printAll = 'Print all tickets';
ordersJa.actions.printAll = '全伝票を一括印刷';

ordersVi.kpis = ordersVi.kpis || {};
ordersEn.kpis = ordersEn.kpis || {};
ordersJa.kpis = ordersJa.kpis || {};

ordersVi.kpis.totalValue = 'TỔNG GIÁ TRỊ';
ordersEn.kpis.totalValue = 'TOTAL VALUE';
ordersJa.kpis.totalValue = '発注総額';

ordersVi.kpis.totalQty = 'TỔNG SỐ LƯỢNG';
ordersEn.kpis.totalQty = 'TOTAL QUANTITY';
ordersJa.kpis.totalQty = '総数量';

ordersVi.kpis.openLots = 'Tổng lô đang mở:';
ordersEn.kpis.openLots = 'Total open lots:';
ordersJa.kpis.openLots = '未完了ロット総数:';

ordersVi.telemetry = ordersVi.telemetry || {};
ordersEn.telemetry = ordersEn.telemetry || {};
ordersJa.telemetry = ordersJa.telemetry || {};

ordersVi.telemetry.viewing = 'Đang xem';
ordersEn.telemetry.viewing = 'Viewing';
ordersJa.telemetry.viewing = '表示中';

writeJson('vi', 'orders', ordersVi);
writeJson('en', 'orders', ordersEn);
writeJson('ja', 'orders', ordersJa);


// 4. UPDATE DASHBOARD.JSON
const dashVi = readJson('vi', 'dashboard');
const dashEn = readJson('en', 'dashboard');
const dashJa = readJson('ja', 'dashboard');

dashVi.bottlenecks.subtitle = 'Chỉ tính lô đang mở · Đỏ = quá hạn, Vàng = cận hạn';
dashEn.bottlenecks.subtitle = 'Open lots only · Red = overdue, Yellow = due soon';
dashJa.bottlenecks.subtitle = '未完了ロット対象 · 赤 = 納期超過, 黄 = 期日切迫';

dashVi.bottlenecks.groupCol = 'NHÓM';
dashEn.bottlenecks.groupCol = 'GROUP';
dashJa.bottlenecks.groupCol = 'グループ';

dashVi.bottlenecks.loadCol = 'TẢI TRỌNG';
dashEn.bottlenecks.loadCol = 'LOAD';
dashJa.bottlenecks.loadCol = '負荷';

dashVi.handover.unspecifiedName = 'Chưa điền họ tên';
dashEn.handover.unspecifiedName = 'Name not specified';
dashJa.handover.unspecifiedName = '氏名未記入';

dashVi.handover.top6Overdue = '* 6 lô trễ hạn nặng nhất';
dashEn.handover.top6Overdue = '* Top 6 most overdue lots';
dashJa.handover.top6Overdue = '* 最重要遅延6ロット';

dashVi.handover.urgentCheckProgress = 'Kiểm tra tiến độ giao hàng';
dashEn.handover.urgentCheckProgress = 'Check delivery progress';
dashJa.handover.urgentCheckProgress = '納品進捗確認';

dashVi.handover.noOverdueNotice = 'Ca trực không có lô nào bị quá hạn. Tiến độ giao nhận đúng kế hoạch.';
dashEn.handover.noOverdueNotice = 'No overdue lots in this shift. Delivery schedule is on track.';
dashJa.handover.noOverdueNotice = '今直において納期超過ロットはありません。納品進捗は計画通りです。';

dashVi.handover.a4Notice = '* Báo cáo A4 rút gọn 6 lô quá hạn tiêu biểu. Vui lòng kiểm tra màn hình Luân chuyển (/tracking) để xem chi tiết toàn bộ {total} lô quá hạn.';
dashEn.handover.a4Notice = '* A4 report summarizes top 6 overdue lots. Please check Tracking (/tracking) for details on all {total} overdue lots.';
dashJa.handover.a4Notice = '* A4報告書は代表的な遅延6ロットを抜粋表示しています。全 {total} 件の遅延ロットの詳細は工程管理画面 (/tracking) をご確認ください。';

dashVi.handover.signQc = 'Trưởng ca QC / KCS';
dashEn.handover.signQc = 'QC / KCS Shift Leader';
dashJa.handover.signQc = 'QC / KCS 直長';

dashVi.handover.signQcNote = '(Xác nhận chất lượng)';
dashEn.handover.signQcNote = '(Quality verification)';
dashJa.handover.signQcNote = '(品質確認)';

dashVi.handover.signSupervisorNote = '(Phê duyệt & lưu trữ)';
dashEn.handover.signSupervisorNote = '(Approval & filing)';
dashJa.handover.signSupervisorNote = '(承認・保管)';

// Preserve QT in ja/dashboard.json docHeader
dashJa.handover.docHeader = '製造引渡および外注熱処理 (QT) 工程報告書';

dashVi.quickPresets = dashVi.quickPresets || {};
dashEn.quickPresets = dashEn.quickPresets || {};
dashJa.quickPresets = dashJa.quickPresets || {};

dashVi.quickPresets.sevenDays = '7 ngày';
dashEn.quickPresets.sevenDays = '7 days';
dashJa.quickPresets.sevenDays = '7日間';

dashVi.quickPresets.thisMonth = 'Tháng này';
dashEn.quickPresets.thisMonth = 'This month';
dashJa.quickPresets.thisMonth = '今月';

writeJson('vi', 'dashboard', dashVi);
writeJson('en', 'dashboard', dashEn);
writeJson('ja', 'dashboard', dashJa);


// 5. UPDATE SYNC.JSON
const syncVi = readJson('vi', 'sync');
const syncEn = readJson('en', 'sync');
const syncJa = readJson('ja', 'sync');

syncVi.gateway.modeReplaceDesc = 'Xóa cache cũ, nạp toàn bộ danh mục mới nhất từ Google Sheets.';
syncEn.gateway.modeReplaceDesc = 'Clear existing cache and reload all latest records from Google Sheets.';
syncJa.gateway.modeReplaceDesc = '既存キャッシュを消去し、Googleスプレッドシートから最新データを全件再取得します。';

syncVi.gateway.modeMergeDesc = 'Thêm lô mới và cập nhật đè các lô trùng mã ID_Key.';
syncEn.gateway.modeMergeDesc = 'Append new lots and overwrite existing records with matching ID_Key.';
syncJa.gateway.modeMergeDesc = '新規ロットを追加し、ID_Key が重複する既存ロットを上書き更新します。';

syncVi.twoWay = syncVi.twoWay || {};
syncEn.twoWay = syncEn.twoWay || {};
syncJa.twoWay = syncJa.twoWay || {};

syncVi.twoWay.recentHeader = 'NHẬT KÝ THAY ĐỔI & AUDIT TRAIL';
syncEn.twoWay.recentHeader = 'CHANGE LOG & AUDIT TRAIL';
syncJa.twoWay.recentHeader = '変更履歴・監査ログ (AUDIT TRAIL)';

syncVi.preview = syncVi.preview || {};
syncEn.preview = syncEn.preview || {};
syncJa.preview = syncJa.preview || {};

syncVi.preview.recordsUnit = 'bản ghi';
syncEn.preview.recordsUnit = 'records';
syncJa.preview.recordsUnit = '件';

writeJson('vi', 'sync', syncVi);
writeJson('en', 'sync', syncEn);
writeJson('ja', 'sync', syncJa);

console.log('Successfully expanded and synchronized all dictionaries!');
