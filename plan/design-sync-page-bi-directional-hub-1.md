---
goal: Redesign trang /sync tinh gọn, tích hợp cổng kết nối hai chiều Google Sheets & Google Apps Script
version: 1.0
date_created: 2026-10-23
status: 'Completed'
tags: [redesign, sync, ui-ux, google-sheets, apps-script, poka-yoke]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch tái thiết kế giao diện và trải nghiệm người dùng (UI/UX) cho trang `/sync` (Liên kết & Đồng bộ Dữ liệu Sản xuất). Dựa trên yêu cầu tinh gọn hóa hệ thống, loại bỏ các thành phần hiển thị dư thừa (Micro-ribbon bộ nhớ đệm, 4 telemetry metric cards, và preview table 10 dòng đầu), đồng thời cấu trúc lại thành **Trung Tâm Kết Nối & Kiểm Soát Dữ Liệu Hai Chiều (Bi-Directional MES Data Gateway)**. Kiến trúc mới tích hợp trực quan ô cấu hình Google Apps Script Webhook (Outbound) song song với Google Sheets (Inbound), tối ưu trải nghiệm gọn gàng trong 1 khung màn hình Desktop không cần cuộn trang, tuân thủ nghiêm ngặt tiêu chuẩn Monozukuri Precision và Poka-Yoke.

## 1. Requirements & Constraints

- **REQ-001**: Xóa bỏ hoàn toàn section bảng "Xem Trước Dữ Liệu Kiểm Tra (10 Dòng Đầu)" khỏi trang `/sync` để giải phóng không gian hiển thị dọc.
- **REQ-002**: Xóa bỏ phần micro-ribbon `div` hiển thị "Nguồn hoạt động: Google Sheets Tổng nạp: 26.134 lô ~10.6 MB Bộ nhớ đệm" và hàng 4 thẻ telemetry ("KẾT NỐI SHEETS - Sẵn sàng (Live Feed) ...", độ trễ phản hồi, timer đồng bộ, outbox).
- **REQ-003**: Tái cấu trúc trang `/sync` theo bố cục 2 cột cân xứng (`grid grid-cols-1 xl:grid-cols-2 gap-4.5`), vừa vặn hoàn hảo trong 1 màn hình Desktop mà không cần cuộn trang.
- **REQ-004**: Tích hợp trực quan ô cấu hình và lưu đường dẫn Google Apps Script Webhook (POST `.exec`) ngay trong Cột Cổng Kết Nối 2 Chiều, hiển thị trạng thái kết nối trực tiếp (`KẾT NỐI SẴN SÀNG` / `CHƯA CẤU HÌNH`).
- **REQ-005**: Bảo toàn 100% cơ chế liên kết dữ liệu Google Sheets (kéo CSV dữ liệu phân quyền, tính tổng lô/đơn hàng/kg, tự động đồng bộ theo chu kỳ) và Google Apps Script Webhook (ghi ngược trạng thái lô sang `dynamo-webhook`).
- **REQ-006**: Đưa các thông số trạng thái thiết thực (mã nguồn dữ liệu, dung lượng bộ nhớ đệm, nút làm mới cache) vào khu vực Kiểm Soát Giao Dịch một cách tinh gọn, thẩm mỹ cao.
- **SEC-001**: Kiểm tra định dạng an toàn cho URL Apps Script (`https://script.google.com/macros/s/.../exec`) và Google Sheets URL trước khi nạp/ghi.
- **CON-001**: Không làm thay đổi giao diện hoặc logic nghiệp vụ của các trang khác (`/tracking`, `/analytics`, `/workshops`, `/export`).
- **CON-002**: Giữ nguyên khóa lưu trữ cục bộ `dynamo-webhook` trong `localStorage` để tương thích đồng bộ với modal cập nhật lô `src/components/lot-update-dialog.tsx`.
- **CON-003**: Duy trì hiệu năng tải trang và phản hồi người dùng dưới 100ms cho các tương tác trên giao diện.
- **GUD-001**: Áp dụng triết lý thiết kế Monozukuri Precision: font số monospace tabular-nums, nhãn phân cấp rõ ràng, màu sắc ngữ nghĩa tinh tế, không lạm dụng hiệu ứng gây phân tán thị giác.
- **GUD-002**: Tối ưu khả năng tương tác phím và công thái học công nghiệp: nút bấm có phản hồi xúc giác (`active:scale-[0.98]`), trạng thái focus rõ nét, thông báo toast chuẩn mực.
- **PAT-001**: Mô hình Cổng Kết Nối Hai Chiều (Bi-Directional Gateway Hub): Phân tách mạch lạc giữa luồng Inbound (Sheets -> MES) và luồng Outbound (MES -> Apps Script).
- **PAT-002**: Cơ chế Poka-Yoke xác nhận kép trước khi thực thi chế độ thay thế toàn bộ dữ liệu (`replace`).

## 2. Implementation Steps

### Implementation Phase 1: Loại Bỏ Các Khối Thừa & Chuẩn Bị Khung Giao Diện

- GOAL-001: Loại bỏ triệt để 3 thành phần rườm rà (preview table, cache ribbon, telemetry cards) và dọn dẹp các biến/import không còn sử dụng trong `src/routes/sync.tsx`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Rà soát và gỡ bỏ section bảng "Xem Trước Dữ Liệu Kiểm Tra (10 Dòng Đầu)" (dòng 531-603) cùng mảng hằng số `previewCols` không còn dùng. | ✅ | 2026-10-23 |
| TASK-002 | Gỡ bỏ div micro-ribbon "Nguồn hoạt động: Google Sheets..." và hàng 4 card telemetry ("KẾT NỐI SHEETS", "ĐỘ TRỄ PHẢN HỒI", "ĐỒNG BỘ ĐỊNH KỲ", "HÀNG ĐỢI GHI LẠI") (dòng 145-280). | ✅ | 2026-10-23 |
| TASK-003 | Tinh gọn hóa danh sách icon và biến trạng thái dư thừa, bảo lưu hàm `resetDataset`, `syncedAt`, `cacheSizeMb`, và logic `syncSheet` phục vụ nạp dữ liệu. | ✅ | 2026-10-23 |

### Implementation Phase 2: Tái Thiết Kế Giao Diện Tinh Gọn (Bi-Directional Hub)

- GOAL-002: Tái cấu trúc layout 2 cột cân xứng: Cột 1 tích hợp đồng bộ 2 chiều (Sheets Inbound + Apps Script Outbound); Cột 2 kiểm soát giao dịch & áp dụng dữ liệu.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Xây dựng Cột 1 (Cổng Kết Nối Hai Chiều): Tích hợp liền mạch Khối Inbound Google Sheets (URL input, khôi phục link, chu kỳ tự động, nút nạp) và Khối Outbound Google Apps Script Webhook (URL input, badge POST, trạng thái kết nối, nút lưu, ghi chú tự động ghi ngược). | ✅ | 2026-10-23 |
| TASK-005 | Xây dựng Cột 2 (Kiểm Soát Giao Dịch & Bộ Nhớ Đệm): Thiết kế card chỉ số tổng hợp compact (Số lô, Đơn hàng, Khối lượng, Phân xưởng), bộ chọn chế độ commit (Replace vs Upsert), thanh điều khiển áp dụng vào hệ thống kèm nút "Làm mới Cache", và ghi chú quy tắc nạp an toàn Poka-Yoke. | ✅ | 2026-10-23 |
| TASK-006 | Đảm bảo đồng bộ khóa `dynamo-webhook` trong `localStorage` với xác thực regex URL Apps Script chuẩn xác, hiển thị toast phản hồi tức thì. | ✅ | 2026-10-23 |

### Implementation Phase 3: Đánh Bóng UX/UI, Đáp Ứng Desktop Không Cuộn & Kiểm Thử Toàn Diện

- GOAL-003: Tinh chỉnh thẩm mỹ Monozukuri, độ tương phản Light/Dark mode, kiểm thử 100% tính năng liên kết 2 chiều và xác nhận trải nghiệm Desktop 1 màn hình.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Tinh chỉnh CSS flexbox/grid, khoảng cách padding/gap nhằm đảm bảo toàn bộ trang `/sync` hiển thị trọn vẹn trong 1 khung màn hình Desktop tiêu chuẩn (không phát sinh scrollbar dọc ngoài ý muốn). | ✅ | 2026-10-23 |
| TASK-008 | Kiểm thử toàn diện quy trình: Nạp sheet từ URL chuẩn, đổi chế độ giao dịch, áp dụng dataset vào Context, cấu hình Webhook Apps Script, và xác minh dữ liệu trong modal cập nhật tiến độ lô. | ✅ | 2026-10-23 |

## 3. Alternatives

- **ALT-001**: Giữ lại preview table nhưng làm nút thu gọn (collapsible accordion). Lý do từ chối: Người dùng đã chỉ định rõ ràng cần xóa bỏ section này vì chức năng xem/kiểm tra dữ liệu chi tiết đã có trang `/tracking` với đầy đủ bộ lọc, tìm kiếm và Zen Focus Mode.
- **ALT-002**: Giữ Webhook dưới dạng một trang hoặc tab cấu hình riêng biệt (`/settings/webhook`). Lý do từ chối: Tích hợp ngay trên trang `/sync` giúp kỹ sư điều độ có một trung tâm kết nối duy nhất (Unified Connection Hub), quản lý cả chiều nhận dữ liệu từ Sheets và chiều đẩy trạng thái về Apps Script tại một nơi.

## 4. Dependencies

- **DEP-001**: `@tanstack/react-router` cho định tuyến và route definition của `/sync`.
- **DEP-002**: `lucide-react` cho hệ thống icon trực quan (Link2, Globe, DatabaseZap, CheckCircle2, RotateCcw, Clock, Send, ShieldCheck, AlertCircle).

## 5. Files

- **FILE-001**: `src/routes/sync.tsx` - Tệp tin chính được tái thiết kế giao diện và tích hợp cổng kết nối hai chiều.
- **FILE-002**: `src/components/webhook-config.tsx` - Thành phần cấu hình webhook hiện tại (được thay thế trực tiếp bằng khối tích hợp tối ưu trong sync.tsx hoặc giữ làm reference).
- **FILE-003**: `src/components/lot-update-dialog.tsx` - Tệp tin tiêu thụ khóa `dynamo-webhook` từ `localStorage` để gửi payload cập nhật tiến độ lô.
- **FILE-004**: `google-apps-script/Code.gs` - Mã nguồn Google Apps Script Webhook xử lý ghi ngược dữ liệu và lưu vết AUDIT_LOG trên Google Sheets.
- **FILE-005**: `google-apps-script/README.md` - Tài liệu hướng dẫn chi tiết 5 bước cài đặt và triển khai Web App trên Google Sheets.
- **FILE-006**: `src/lib/auth.functions.ts` - Hàm server `updateLotProgress` chuyển tiếp HTTP POST payload tới Apps Script Webhook.

## 6. Testing

- **TEST-001**: Kiểm tra việc xóa bỏ hoàn toàn preview table, micro-ribbon và 4 card telemetry, xác nhận không còn tồn tại trên DOM.
- **TEST-002**: Kiểm tra chức năng kéo dữ liệu Google Sheets (Inbound): Bấm "Tải & Phân Tích Dữ Liệu", kiểm tra hiển thị số lô, tổng kg, số đơn hàng và phân xưởng.
- **TEST-003**: Kiểm tra chức năng cấu hình Google Apps Script Webhook (Outbound): Nhập URL webhook hợp lệ/không hợp lệ, bấm "Lưu kết nối", kiểm tra cờ trạng thái `KẾT NỐI SẴN SÀNG` và giá trị lưu trữ trong `localStorage('dynamo-webhook')`.
- **TEST-004**: Kiểm tra khả năng hiển thị vừa vặn trên màn hình Desktop độ phân giải từ 1366x768 đến 1920x1080 mà không bị cuộn trang ngoài ý muốn.

## 7. Risks & Assumptions

- **RISK-001**: Người dùng vô tình bấm nhầm "Áp dụng vào toàn hệ thống" ở chế độ `replace` làm mất dữ liệu cục bộ tạm thời. Giảm thiểu: Áp dụng hộp thoại xác nhận Poka-Yoke trước khi áp dụng thay thế toàn bộ.
- **RISK-002**: Đường dẫn Webhook Google Apps Script nhập sai cú pháp làm lỗi khi người dùng cập nhật lô trên trang Tracking. Giảm thiểu: Áp dụng bộ kiểm tra regex định dạng `https://script.google.com/macros/s/.../exec` ngay khi lưu và cảnh báo trực quan.
- **ASSUMPTION-001**: Trình duyệt của người dùng hỗ trợ `localStorage` để lưu trữ URL Webhook và danh mục cache dữ liệu sản xuất.
- **ASSUMPTION-002**: Đường dẫn Google Sheets mặc định `SHEET_URL` đã được cấp quyền xuất bản hoặc chia sẻ công khai chế độ đọc CSV.

## 8. Related Specifications / Further Reading

- [Kế hoạch tối ưu Zen Focus Mode & Inline Edit](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/design-zen-mode-inline-edit-sync-upgrade-1.md)
- [Cấu hình điều hành Luân chuyển QT & Dynamo Shell](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/components/dynamo-shell.tsx)
- [Hàm nạp dữ liệu Google Sheets Scoped](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/lib/sheet.functions.ts)
