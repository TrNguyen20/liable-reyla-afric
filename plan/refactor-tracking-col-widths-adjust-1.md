---
goal: Adjust Default Column Widths for Order Number to 120px and Notes to 165px in Tracking Table
version: 1.0.0
date_created: 2026-11-06
status: 'Completed'
tags: [tracking, table, column-widths, order-number, notes, ui-ux, graphite-wireframe]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch điều chỉnh tinh chỉnh kích thước hiển thị ban đầu (Default Column Widths) cho hai cột trên bảng điều độ sản xuất [`src/routes/tracking.tsx`](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/src/routes/tracking.tsx):
1. **ĐƠN HÀNG** (`So_DatHang`): Tăng từ **`110 px`** lên **`120 px`** (+10 px) để đảm bảo các mã đơn hàng dài (ví dụ: `PO-2026-XXXX`, `DH-QT-09218`) không bị ép sát biên hay nhảy dòng, giữ nguyên tính chất cố định (fixed, không co giãn).
2. **GHI CHÚ** (`ghi_chu`): Giảm từ **`180 px`** xuống **`165 px`** (-15 px) để tối ưu không gian cuộn ngang tổng thể mà vẫn đảm bảo vùng hiển thị văn bản ghi chú thoáng đãng, đồng thời điều chỉnh cữ co hẹp tối thiểu an toàn xuống `150 px` và cập nhật class `min-w-[165px]`.

Tổng bề rộng toàn bảng sau khi điều chỉnh chuyển từ **`1,533 px`** thành **`1,528 px`** (giảm tịnh tiến 5 px), gia tăng sự gọn gàng cho giao diện Graphite Wireframe UI.

## 1. Requirements & Constraints

- **REQ-001**: Cập nhật giá trị `So_DatHang` trong `DEFAULT_COL_WIDTHS` và `MIN_COL_WIDTHS` từ `110` lên `120` trong [`src/routes/tracking.tsx`](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/src/routes/tracking.tsx).
- **REQ-002**: Cập nhật giá trị `ghi_chu` trong `DEFAULT_COL_WIDTHS` từ `180` xuống `165` và `MIN_COL_WIDTHS` từ `160` xuống `150` trong [`src/routes/tracking.tsx`](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/src/routes/tracking.tsx).
- **REQ-003**: Cập nhật thuộc tính `min-w-[180px]` tại thẻ `<td>` của cột Ghi Chú (dòng 3130 trong `src/routes/tracking.tsx`) thành `min-w-[165px]`.
- **REQ-004**: Đồng bộ hóa bài kiểm thử tự động `TC-DS-07` trong [`src/test/design-system-compliance.test.ts`](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/src/test/design-system-compliance.test.ts) với các giá trị mới `So_DatHang: 120` và `ghi_chu: 165`.
- **CON-001**: Giữ nguyên cơ chế cố định (fixed) không có thanh kéo resizer cho cột `So_DatHang`.
- **CON-002**: Giữ nguyên cơ chế Sticky Pin 2 đầu: `checkbox` (40px) và `ID_Key` (130px) ghim trái, `ticket` (58px) ghim phải.
- **CON-003**: Tuân thủ tuyệt đối quy chuẩn Graphite Wireframe UI v2.5 (`rounded-xs`, `font-mono tabular-nums`).
- **GUD-001**: Đảm bảo 100% test suite (`npm test`) vượt qua thành công và `npm run build` không phát sinh lỗi.
- **PAT-001**: Duy trì mẫu dữ liệu Fluid-Fixed Hybrid Table với trạng thái lưu trữ cục bộ `localStorage` (`dynamo-tracking-col-widths`).

## 2. Implementation Steps

### Implementation Phase 1: Hiệu Chỉnh Mã Nguồn Tracking View

- GOAL-001: Cập nhật cấu hình kích thước cột ĐƠN HÀNG và GHI CHÚ trong bảng điều độ `src/routes/tracking.tsx`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Thay đổi `DEFAULT_COL_WIDTHS.So_DatHang` thành 120 và `MIN_COL_WIDTHS.So_DatHang` thành 120 tại `src/routes/tracking.tsx` | ✅ | 2026-11-06 |
| TASK-002 | Thay đổi `DEFAULT_COL_WIDTHS.ghi_chu` thành 165 và `MIN_COL_WIDTHS.ghi_chu` thành 150 tại `src/routes/tracking.tsx` | ✅ | 2026-11-06 |
| TASK-003 | Thay thế class `min-w-[180px]` thành `min-w-[165px]` tại thẻ cell nội dung ghi chú (dòng 3130 của `src/routes/tracking.tsx`) | ✅ | 2026-11-06 |

### Implementation Phase 2: Cập Nhật Test Tự Động & Tài Liệu Thiết Kế

- GOAL-002: Đồng bộ hóa bài kiểm tra Design System và tài liệu hướng dẫn kỹ thuật.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Cập nhật `TC-DS-07` trong `src/test/design-system-compliance.test.ts` kiểm tra `So_DatHang: 120` và `ghi_chu: 165` | ✅ | 2026-11-06 |
| TASK-005 | Cập nhật tài liệu `DESIGN-SYSTEM.md` ghi nhận thông số cột Đơn Hàng 120px và Ghi Chú 165px | ✅ | 2026-11-06 |
| TASK-006 | Chạy toàn bộ kiểm thử tự động `npm test` và kiểm tra lệnh đóng gói `npm run build` | ✅ | 2026-11-06 |

## 3. Alternatives

- **ALT-001**: Giữ nguyên `MIN_COL_WIDTHS.ghi_chu` ở mức 160px khi giảm default về 165px. Lựa chọn này bị loại bỏ vì biên độ co giãn khả dụng chỉ còn 5px, gây gượng ép khi người dùng kéo thanh resizer; giảm xuống 150px tạo biên độ linh hoạt 15px hợp lý hơn.
- **ALT-002**: Cho phép cột ĐƠN HÀNG co giãn tùy ý bằng resizer. Lựa chọn này bị loại bỏ vì đơn hàng là trường định danh kỹ thuật quan trọng cần cố định kích thước đồng bộ để tránh vỡ giao diện trên các máy tính xưởng.

## 4. Dependencies

- **DEP-001**: TanStack Table / Custom Resizer Hooks trong `src/routes/tracking.tsx`.
- **DEP-002**: Vitest runner cho `src/test/design-system-compliance.test.ts`.

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` - Khai báo `DEFAULT_COL_WIDTHS`, `MIN_COL_WIDTHS` và cell width class.
- **FILE-002**: `src/test/design-system-compliance.test.ts` - Bộ kiểm thử tự động tuân thủ Design System (TC-DS-07).
- **FILE-003**: `DESIGN-SYSTEM.md` - Đặc tả hệ thống thiết kế công nghiệp Graphite Wireframe UI.
- **FILE-004**: `walkthrough.md` - Tài liệu tổng kết nghiệm thu thay đổi giao diện.

## 6. Testing

- **TEST-001**: `npm test src/test/design-system-compliance.test.ts` - Kiểm tra assertion `So_DatHang: 120` và `ghi_chu: 165` thành công.
- **TEST-002**: `npm test` - Đảm bảo toàn bộ 12 test suites (66 tests) đều PASS.
- **TEST-003**: `npm run build` - Kiểm tra biên dịch TypeScript và đóng gói Vite thành công không có lỗi type.

## 7. Risks & Assumptions

- **RISK-001**: Trình duyệt người dùng đã lưu cache kích thước cũ `110px` / `180px` trong `localStorage` (`dynamo-tracking-col-widths`). Giải pháp: Khi người dùng bấm nút "Khôi phục cỡ cột" hoặc double-click vào vạch chia, hệ thống lập tức áp dụng ngay kích thước mới `120px` / `165px`.
- **ASSUMPTION-001**: Người dùng sử dụng màn hình máy tính xưởng với độ phân giải tối thiểu 1366x768 hoặc tiêu chuẩn 1920x1080 FHD, trong đó tổng bề rộng bảng 1,528px vận hành mượt mà với thanh cuộn mượt.

## 8. Related Specifications / Further Reading

- [`DESIGN-SYSTEM.md`](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/DESIGN-SYSTEM.md) - Đặc tả Graphite Wireframe UI Specification v2.5.
- [`plan/refactor-tracking-default-col-widths-1.md`](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/plan/refactor-tracking-default-col-widths-1.md) - Kế hoạch chuẩn hóa kích thước cột ban đầu.
