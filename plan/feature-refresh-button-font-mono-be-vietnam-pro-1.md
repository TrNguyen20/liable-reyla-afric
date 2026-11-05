---
goal: Bổ sung nút Làm Mới trên Dashboard và Orders, đồng thời ép cứng toàn hệ thống font-mono sang Be Vietnam Pro
version: 1.0
date_created: 2026-11-05
status: 'Completed'
tags:
  - feature
  - refresh-button
  - typography
  - be-vietnam-pro
  - sub-header
  - orders
  - dashboard
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch kỹ thuật triển khai 2 cải tiến UX/UI trọng điểm theo yêu cầu của Product Owner:
1. **Ép cứng Typography `--font-mono` sang `"Be Vietnam Pro"`**: Thay thế `"JetBrains Mono"` bằng `"Be Vietnam Pro", system-ui, sans-serif;` trong `@theme inline` tại `src/styles.css`, mang lại diện mạo thuần Việt, phẳng và thanh lịch cho toàn bộ bảng biểu và mã kỹ thuật, đồng thời kết hợp `tabular-nums` để giữ vững tính gióng thẳng hàng của các cột dữ liệu định lượng.
2. **Bổ sung Nút "Làm Mới" (Shift+R) cho `/dashboard` và `/orders`**: Hiện tại 2 trang này chưa có nút làm mới dữ liệu tại chỗ. Giải pháp thiết lập thanh Sub-Header Wireframe Card chuẩn hóa, tích hợp nút "Làm Mới" với hiệu ứng xoay `animate-spin`, phím tắt `Shift+R` và chỉ báo telemetry kết nối đồng bộ.

---

## 1. Requirements & Constraints

### Yêu cầu chức năng & Giao diện (Functional & UI Requirements)
- **REQ-001**: Sửa khai báo `--font-mono` trong `@theme inline` của `src/styles.css` thành `--font-mono: "Be Vietnam Pro", system-ui, sans-serif;` nhằm ép cứng font chữ Be Vietnam Pro cho toàn hệ thống.
- **REQ-002**: Giữ nguyên thuộc tính `tabular-nums` trên toàn bộ các cột định lượng, ngày tháng, mã lô, đơn giá và số lượng để các ký tự số gióng hàng thẳng cột hoàn hảo.
- **REQ-003**: Cập nhật đặc tả Typography trong `DESIGN-SYSTEM.md` ghi nhận `--font-mono` sử dụng `"Be Vietnam Pro", system-ui, sans-serif`.
- **REQ-004**: Bổ sung nút "Làm Mới" trên thanh Sub-Header Command Toolbar của `src/routes/dashboard.tsx`:
  - Gọi hàm `pullLive(true)` từ `useDynamo()`
  - Trạng thái `disabled={loading}` kèm icon `RefreshCw` xoay `animate-spin`
  - Đặt cạnh nút "In biên bản giao ca A4" và chỉ báo sync telemetry
  - Nhãn hiển thị: `Làm mới` (hoặc `Đang tải…` khi busy) kèm phím tắt `Shift+R`
- **REQ-005**: Nâng cấp cấu trúc `src/routes/orders.tsx` bổ sung thanh Sub-Header Wireframe Card độc lập ở đầu trang (nằm trên khối chia đôi Master-Detail giống `/tracking`, `/dashboard`, `/sync`):
  - Cụm trái: Huy hiệu `[3] ĐƠN ĐẶT HÀNG`, đếm tổng số đơn và tổng số lô linh kiện
  - Cụm phải: Nút "Làm Mới" (Shift+R) gọi `pullLive(true)` và chỉ báo sync telemetry
- **REQ-006**: Đảm bảo toàn bộ controls trên thanh Sub-Header của `/orders` và `/dashboard` tuân thủ kích thước chuẩn `h-8` (32px), `rounded-xs border border-border/80 bg-card shadow-2xs`.

### Ràng buộc kỹ thuật (Constraints)
- **CON-001**: Giữ nguyên bo góc `rounded-xs` (2px) và bóng đổ vi mô `shadow-2xs` theo chuẩn Graphite Wireframe UI v2.2.0.
- **CON-002**: Bảo toàn lịch sử git trên Lovable: Không sử dụng `git push -f`, rebase hoặc squash commit.
- **CON-003**: 100% test suites trong Vitest phải pass và lệnh `npm run build` không phát sinh lỗi.

### Hướng dẫn & Mẫu thiết kế (Guidelines & Patterns)
- **GUD-001**: Đồng bộ cơ chế Realtime Live Hub: Mọi nút Làm Mới kích hoạt trực tiếp `pullLive(true)` để kéo delta từ Server Cache / Google Sheets.
- **PAT-001**: Unified Sub-Header Grammar: 4 route chính của QT-MES đều sở hữu Sub-Header Card vi mô đồng dạng với cấu trúc Trái (Huy hiệu Route `[N]` + Thống kê phạm vi) / Phải (Thao tác Làm mới + Telemetry).

---

## 2. Implementation Steps

### Giai đoạn 1: Ép cứng Token Font-Mono & Cập nhật Đặc tả

- GOAL-001: Chuyển đổi `--font-mono` sang "Be Vietnam Pro" và đồng bộ tài liệu thiết kế.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-001 | Thay thế `--font-mono: "JetBrains Mono"...` bằng `--font-mono: "Be Vietnam Pro", system-ui, sans-serif;` trong `src/styles.css` | ✅ | 2026-11-05 |
| TASK-002 | Cập nhật mục Typography trong `DESIGN-SYSTEM.md` phản ánh quy chuẩn font chữ mới | ✅ | 2026-11-05 |
| TASK-003 | Cập nhật assertion kiểm tra font-mono trong `src/test/ui-ux-standardization.test.ts` | ✅ | 2026-11-05 |

### Giai đoạn 2: Tích hợp Nút Làm Mới trên Dashboard & Orders

- GOAL-002: Bổ sung nút Làm Mới (Shift+R) và chuẩn hóa Sub-Header Card cho `/dashboard` và `/orders`.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-004 | Bổ sung nút "Làm Mới" gọi `pullLive(true)` với icon `RefreshCw` trên thanh Sub-Header của `src/routes/dashboard.tsx` | ✅ | 2026-11-05 |
| TASK-005 | Thiết lập thanh Sub-Header Wireframe Card độc lập ở đầu trang `src/routes/orders.tsx` chứa huy hiệu `[3] ĐƠN ĐẶT HÀNG`, nút "Làm Mới" và telemetry | ✅ | 2026-11-05 |

### Giai đoạn 3: Kiểm thử Tự động & Biên dịch

- GOAL-003: Xây dựng bổ sung test case tự động và nghiệm thu toàn diện hệ thống.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-006 | Bổ sung test cases `TC-UI-09` và `TC-UI-10` trong `src/test/ui-ux-standardization.test.ts` kiểm tra nút Làm mới trên Dashboard và Orders | ✅ | 2026-11-05 |
| TASK-007 | Chạy toàn bộ test suite `npm test` và chạy `npm run build` | ✅ | 2026-11-05 |

---

## 3. Alternatives

- **ALT-001**: Đặt nút Làm Mới ở góc phải cột chi tiết đơn hàng thay vì thanh Sub-Header độc lập. *Lý do từ chối*: Trên thiết bị di động khi người dùng ở màn hình danh sách đơn (`mobileView === 'list'`), cột chi tiết bị ẩn khiến người dùng không tìm thấy nút làm mới.
- **ALT-002**: Giữ nguyên `"JetBrains Mono"` cho `--font-mono`. *Lý do từ chối*: Người dùng yêu cầu đồng bộ giao diện toàn hệ thống theo ngôn ngữ thiết kế phẳng, hiện đại và thuần Việt của "Be Vietnam Pro".

---

## 4. Dependencies

- **DEP-001**: `lucide-react`: Icon `RefreshCw` cho trạng thái tải xoay tròn.
- **DEP-002**: `useDynamo()` từ `@/components/dynamo-shell`: Cung cấp hàm `pullLive()` và cờ `loading`.

---

## 5. Files

- **FILE-001**: `src/styles.css` — Cập nhật `--font-mono`.
- **FILE-002**: `DESIGN-SYSTEM.md` — Cập nhật mục 2.1 Typography.
- **FILE-003**: `src/routes/dashboard.tsx` — Thêm nút "Làm Mới".
- **FILE-004**: `src/routes/orders.tsx` — Thêm Sub-Header Wireframe Card và nút "Làm Mới".
- **FILE-005**: `src/test/ui-ux-standardization.test.ts` — Cập nhật và bổ sung test cases.

---

## 6. Testing

- **TEST-001**: `TC-UI-01`: Kiểm tra `src/styles.css` khai báo `--font-mono: "Be Vietnam Pro"`.
- **TEST-002**: `TC-UI-09`: Kiểm tra `/dashboard` có nút Làm Mới với icon `RefreshCw` và gọi `pullLive`.
- **TEST-003**: `TC-UI-10`: Kiểm tra `/orders` có thanh Sub-Header Wireframe Card và nút Làm Mới.
- **TEST-004**: Chạy `npm test` xác nhận toàn bộ 11 test suites (59+ tests) pass 100%.

---

## 7. Risks & Assumptions

- **RISK-001**: Đổi sang "Be Vietnam Pro" có thể làm chiều rộng các con số biến thiên nếu thiếu `tabular-nums`. *Biện pháp giảm thiểu*: Hệ thống đã áp dụng triệt để `tabular-nums` trên tất cả các cột dữ liệu định lượng.
- **ASSUMPTION-001**: Thao tác `pullLive(true)` kích hoạt đồng bộ nền không làm gián đoạn trạng thái bộ lọc đang chọn của người dùng.

---

## 8. Related Specifications / Further Reading

- [Graphite Wireframe UI Specification (v2.2.0)](./DESIGN-SYSTEM.md)
- [TanStack Start Routing Architecture](./AGENTS.md)
