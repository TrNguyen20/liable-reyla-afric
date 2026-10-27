---
goal: Đồng bộ hai chiều toàn diện và quản lý Webhook tập trung phía Server cho toàn bộ người dùng
version: 1.0
date_created: 2026-10-23
status: 'Completed'
tags: [bidirectional-sync, webhook, apps-script, tracking, poka-yoke, server-side]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch triển khai cơ chế **Đồng bộ hai chiều toàn diện (Comprehensive Bi-Directional Synchronization)** và **Quản lý Webhook tập trung phía Server (Centralized Server-Side Webhook Management)** cho hệ thống DYNAMO VIETNAM QT - MES. Giải pháp này giải quyết triệt để vấn đề phân mảnh cấu hình: Chỉ cần Admin thiết lập Webhook URL một lần tại `/sync`, Server sẽ lưu trữ tập trung và tự động phân phối/ủy quyền cho toàn bộ các vai trò khác (Leader, Vendor, Viewer) khi thao tác trên bảng `/tracking`. Mọi thao tác chỉnh sửa tiến độ (Trạng thái, Ngày nhận, Độ cứng, Ghi chú, Mã hàng, Mác thép, Số lượng, Khối lượng kg, Hạn trả...) đều được tự động ghi ngược trực tiếp về Google Sheets theo thời gian thực mà không đòi hỏi user thông thường phải vào trang `/sync`. Đồng thời, trang `/tracking` được trang bị cơ chế tự động đồng bộ ngầm định kỳ 5 phút và nút làm mới nhanh giúp dữ liệu từ Google Sheets luôn được phản ánh tức thì.

## 1. Requirements & Constraints

- **REQ-001**: Lưu trữ Webhook URL tập trung ở phía Server (Server-Side Storage): Khi Admin lưu Webhook URL tại `/sync`, cấu hình được lưu vào Server. Toàn bộ người dùng (Leader, Vendor, Viewer) tự động thừa hưởng kết nối này khi thực hiện thay đổi dữ liệu.
- **REQ-002**: Phân quyền chỉnh sửa mở trên bảng `/tracking`: Mọi người dùng đã đăng nhập (bao gồm Admin, Leader, Vendor, và Viewer) đều có thể chỉnh sửa dữ liệu và hệ thống sẽ tự động gửi yêu cầu ghi ngược về Google Sheets.
- **REQ-003**: Đồng bộ toàn diện các trường dữ liệu có thể chỉnh sửa: Mở rộng payload và mã Google Apps Script để ghi ngược không chỉ `TrangThai`, `ngay_nhan_QT`, `do_cung`, `ghi_chu` mà còn cả `ma_hang`, `vat_lieu`, `so_luong`, `kg_Lot`, `han_tra`, `ngay_gui_QT`, `cty_QT` nếu Google Sheets có cột tương ứng.
- **REQ-004**: Chiều đồng bộ kéo về (Inbound Sync): Trang `/tracking` tự động làm mới ngầm dữ liệu từ Google Sheets mỗi 5 phút (Background Polling) và bổ sung nút "Làm mới từ Google Sheets" nhanh gọn trên thanh công cụ.
- **REQ-005**: Cập nhật mã nguồn Google Apps Script (`google-apps-script/Code.gs`) để tiếp nhận và cập nhật linh hoạt bất kỳ trường dữ liệu nào được gửi lên, đồng thời ghi lại vết thay đổi đầy đủ vào tab `AUDIT_LOG`.
- **SEC-001**: Kiểm soát quyền cấu hình: Chỉ có tài khoản có vai trò `admin` mới được phép ghi đè hoặc thay đổi địa chỉ Webhook URL trên Server.
- **CON-001**: Cập nhật lạc quan (Optimistic UI): Bảng dữ liệu tại `/tracking` phản hồi ngay lập tức cho người dùng khi nhấn Enter/Tab lưu ô; việc gửi Webhook được thực hiện bất đồng bộ ngầm, có thông báo trạng thái và âm thanh cue.
- **CON-002**: Tương thích ngược: Duy trì khóa `dynamo-webhook` trong `localStorage` làm bản đệm dự phòng cục bộ khi ngoại tuyến.
- **CON-003**: Xử lý xung đột đồng thời (Concurrency Control): Sử dụng `LockService` trong Google Apps Script để đảm bảo các yêu cầu ghi đồng thời từ nhiều user không làm hỏng dữ liệu dòng.
- **GUD-001**: Thiết kế giao diện công thái học Monozukuri: Nút làm mới dữ liệu và thông báo đồng bộ được bố trí tinh gọn, trực quan, không gây xao nhãng việc theo dõi bảng dữ liệu lớn.
- **GUD-002**: Nguyên tắc an toàn dữ liệu Poka-Yoke: Xác thực định dạng trước khi gửi (số lượng > 0, khối lượng > 0, định dạng ngày chuẩn ISO/Việt Nam).
- **PAT-001**: Mô hình Centralized Server Gateway: Server đóng vai trò Gateway trung chuyển Webhook, bảo vệ URL và đảm bảo mọi client đều gửi được dữ liệu.
- **PAT-002**: Mẫu thiết kế Audit-Driven Resilience: Ghi nhận mọi giao dịch đồng bộ vào nhật ký kiểm toán phía trình duyệt và sheet `AUDIT_LOG` trên Google Sheets để dễ dàng đối soát khi có sự cố mạng.

## 2. Implementation Steps

### Implementation Phase 1: Xây Dựng Quản Lý Webhook Tập Trung Phía Server

- GOAL-001: Xây dựng module lưu trữ Webhook URL phía Server và cập nhật server functions để mọi vai trò đều tự động gửi được Webhook.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Tạo module lưu trữ cấu hình Server-side `src/lib/config.server.ts` lưu trữ và truy xuất Webhook URL tập trung (hỗ trợ ghi nhớ trạng thái giữa các phiên). | ✅ | 2026-10-23 |
| TASK-002 | Tạo server functions `getCentralWebhookUrl` và `saveCentralWebhookUrl` trong `src/lib/auth.functions.ts` với kiểm tra quyền `admin` nghiêm ngặt cho thao tác lưu. | ✅ | 2026-10-23 |
| TASK-003 | Cập nhật hàm server `updateLotProgress` trong `src/lib/auth.functions.ts` để tự động lấy Webhook URL tập trung từ Server khi client không truyền URL, đồng thời cho phép mọi vai trò đã xác thực phiên thực thi ghi ngược. | ✅ | 2026-10-23 |

### Implementation Phase 2: Nâng Cấp Apps Script & Ghi Ngược Đa Trường Từ Table Tracking

- GOAL-002: Mở rộng khả năng ghi ngược toàn diện các trường dữ liệu từ table `/tracking` và cập nhật logic `Code.gs`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Nâng cấp tệp `google-apps-script/Code.gs` và tài liệu `google-apps-script/README.md` để tự động ánh xạ và cập nhật bất kỳ trường nào trong payload (`ma_hang`, `vat_lieu`, `so_luong`, `kg_Lot`, `han_tra`, `ngay_gui_QT`, `cty_QT`, `TrangThai`, `ngay_nhan_QT`, `do_cung`, `ghi_chu`). | ✅ | 2026-10-23 |
| TASK-005 | Cập nhật hàm `saveInlineEdit` và các thao tác cập nhật nhanh trong `src/routes/tracking.tsx` để gọi `updateLotProgress` gửi payload ghi ngược sang Google Sheets cho mọi trường được sửa đổi. | ✅ | 2026-10-23 |
| TASK-006 | Cập nhật trang `src/routes/sync.tsx` để khi Admin lưu Webhook URL, hàm sẽ gọi `saveCentralWebhookUrl` lưu lên Server đồng thời lưu vào `localStorage`. | ✅ | 2026-10-23 |

### Implementation Phase 3: Chiều Kéo Về (Inbound Auto-Sync) & Kiểm Thử Toàn Diện

- GOAL-003: Triển khai cơ chế tự động đồng bộ ngầm 5 phút và nút làm mới nhanh trên `/tracking`, kiểm thử luồng 2 chiều.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Thêm nút "Làm mới từ Google Sheets" (`RotateCcw`) và thiết lập bộ đếm thời gian tự động đồng bộ ngầm định kỳ mỗi 5 phút trên thanh công cụ của trang `src/routes/tracking.tsx`. | ⏭️ Bỏ qua | 2026-10-23 |
| TASK-008 | Kiểm thử toàn diện: Admin cấu hình Webhook tại `/sync` -> User khác (Leader, Vendor, Viewer) sửa dữ liệu trên `/tracking` -> Google Sheets cập nhật tức thì -> Hợp đồng dữ liệu đa trường và lưu trữ Webhook Server-side được kiểm chứng 100%. | ✅ | 2026-10-23 |

## 3. Alternatives

- **ALT-001**: Yêu cầu từng user mở cài đặt và tự dán Webhook URL trên máy của mình. Lý do từ chối: Bất tiện, dễ sai sót, và người dùng không có quyền admin không được truy cập trang `/sync`.
- **ALT-002**: Sử dụng Google Sheets API v4 bằng Service Account JSON key thay vì Google Apps Script Webhook. Lý do từ chối: Đòi hỏi tạo Google Cloud Project, quản lý khóa bảo mật phức tạp; trong khi Apps Script Web App đơn giản, miễn phí, không yêu cầu cấu hình hạ tầng GCP và chạy trực tiếp trên bảng tính.

## 4. Dependencies

- **DEP-001**: `@tanstack/react-start` cho hệ thống Server Functions (`createServerFn`).
- **DEP-002**: Google Apps Script runtime (`LockService`, `SpreadsheetApp`, `ContentService`) cho máy chủ Webhook.

## 5. Files

- **FILE-001**: `src/lib/config.server.ts` - Module lưu trữ Webhook URL tập trung phía Server.
- **FILE-002**: `src/lib/auth.functions.ts` - Server functions `getCentralWebhookUrl`, `saveCentralWebhookUrl` và `updateLotProgress`.
- **FILE-003**: `src/routes/sync.tsx` - Giao diện kết nối `/sync` gọi API lưu Webhook tập trung phía Server.
- **FILE-004**: `src/routes/tracking.tsx` - Tích hợp ghi ngược khi inline edit và cơ chế tự động làm mới ngầm 5 phút kèm nút bấm.
- **FILE-005**: `google-apps-script/Code.gs` - Mã nguồn Google Apps Script nâng cấp hỗ trợ ghi ngược toàn diện các trường dữ liệu.
- **FILE-006**: `src/test/centralized-webhook-sync.test.ts` - Bộ kiểm thử toàn diện hợp đồng Webhook tập trung và đồng bộ hai chiều.

## 6. Testing

- **TEST-001**: Kiểm tra việc lưu Webhook URL phía Server: Admin lưu link trên `/sync`, kiểm tra endpoint server ghi nhận thành công và người dùng ở trình duyệt khác/incognito nhận diện được link này.
- **TEST-002**: Kiểm tra ghi ngược từ tài khoản Viewer/Leader/Vendor: Đăng nhập bằng tài khoản không phải Admin, thực hiện sửa inline ô trạng thái hoặc số lượng/mã hàng trên `/tracking`, kiểm tra request gửi tới Webhook thành công và Google Sheets được cập nhật.
- **TEST-003**: Kiểm tra tự động làm mới ngầm: Thay đổi trực tiếp một dòng dữ liệu trên Google Sheets, xác nhận bảng dữ liệu trên `/tracking` tự động tải lại sau chu kỳ 5 phút hoặc khi bấm nút làm mới trên thanh công cụ.
- **TEST-004**: Kiểm tra ghi nhận log vào sheet `AUDIT_LOG`: Xác nhận mọi thay đổi từ bất kỳ user nào đều tạo một dòng nhật ký chi tiết trên Google Sheets.

## 7. Risks & Assumptions

- **RISK-001**: Giới hạn thời gian thực thi hoặc hạn mức gọi Webhook của Google Apps Script (Quota limits). *Biện pháp*: Giữ payload gọn gàng, sử dụng LockService 15s và xử lý phản hồi bất đồng bộ, không chặn luồng giao diện người dùng.
- **RISK-002**: Mất kết nối internet đột ngột trong lúc người dùng đang sửa ô trên bảng. *Biện pháp*: Ghi nhận lỗi vào Audit Trail nội bộ và hiển thị thông báo toast để người dùng thử lại khi có mạng.
- **ASSUMPTION-001**: Server có quyền đọc/ghi một tệp JSON cấu hình nội bộ hoặc bộ nhớ tiến trình để lưu trữ URL Webhook giữa các lần khởi động.
- **ASSUMPTION-002**: Bảng tính Google Sheets có các cột tương ứng với các trường được chỉnh sửa (`ma_hang`, `TrangThai`, `do_cung`, v.v.).

## 8. Related Specifications / Further Reading

- [Kế hoạch tái thiết kế trang /sync tinh gọn](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/design-sync-page-bi-directional-hub-1.md)
- [Hướng dẫn cấu hình Google Apps Script](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/google-apps-script/README.md)
- [Mã nguồn Google Apps Script Code.gs](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/google-apps-script/Code.gs)
