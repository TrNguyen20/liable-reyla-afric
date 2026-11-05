---
goal: Tối ưu hóa phân bổ bố cục bảng điều độ luân chuyển /tracking theo chuẩn Fluid-Fixed Hybrid, Neo 2 đầu Pin Left/Right và Row Density Switcher
version: 1.0.0
date_created: 2026-11-05
status: 'Completed'
tags: [ui-ux, tracking, table-grid, graphite-wireframe, sticky-columns, density-switcher]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Bảng dữ liệu điều độ luân chuyển nhiệt luyện (`/tracking`) là thành phần cốt lõi và có tần suất sử dụng cao nhất của hệ thống Dynamo MES. Qua khảo sát thực tế và phân tích chuyên sâu UI/UX, bảng điều độ hiện tại với 16 cột đang gặp các bất cập:
1. **Phân bổ độ rộng cột chưa tối ưu**: Cột hành động `Phiếu A4` đang chiếm tới `90px`, `Vật liệu` `120px`, `Độ cứng` `115px`, khiến tổng bề ngang bị phình to trên màn hình chuẩn 1080p / laptop 14-16", chèn ép không gian hiển thị của cột `Ghi chú`.
2. **Thiếu neo cột hành động (Pin Right Action Column)**: Khi cuộn ngang để xem thông số kỹ thuật hoặc ghi chú, cột `Phiếu A4` bị trôi mất ra ngoài màn hình, buộc điều độ viên phải cuộn ngược lại chỉ để in phiếu hoặc xem chi tiết.
3. **Căn chỉnh số liệu chưa theo chuẩn tài chính/công nghiệp**: Cột `Số lượng` và `Khối lượng (Kg)` chưa được căn phải (`text-right`), làm giảm tốc độ quét mắt đối chiếu tổng sản lượng.
4. **Thiếu bộ chuyển đổi mật độ dòng (Row Density Switcher)**: Toàn bộ bảng áp dụng padding cố định (`py-2.5` - `py-3.5`), chưa đáp ứng nhu cầu xem nén dữ liệu cao độ (compact mode ~32px) trong các ca làm việc cần kiểm soát 20-30 lô hàng cùng lúc.
5. **Rủi ro rớt dòng (Content Wrapping)**: Một số ô dữ liệu dài làm nhảy chiều cao dòng, phá vỡ tính phẳng và độ sắc nét của Graphite Wireframe.

Kế hoạch này tái cấu trúc toàn diện bảng `/tracking` theo mô hình **Fluid-Fixed Hybrid Table**, tích hợp **Sticky Pin hai đầu** (Left: Checkbox + Mã lô, Right: Phiếu A4), **Row Density Toggle** (`compact` / `normal`), và chuẩn hóa căn chỉnh monospaced tabular-nums.

---

## 1. Requirements & Constraints

- **REQ-001**: Tái hiệu chuẩn 16 cột theo mô hình Fluid-Fixed Hybrid với `DEFAULT_COL_WIDTHS` và `MIN_COL_WIDTHS` tối ưu hóa không gian (Checkbox: 40px, Phiếu A4: 60px, SL: 70px, KG: 70px, Xưởng: 80px, Độ cứng: 80px, Vật liệu: 80px, Mã lô: 140px, Đơn hàng: 130px, Mã hàng: 130px, Đối tác: 120px, Ngày gửi: 100px, Hạn trả: 100px, Logistics: 140px, QC: 140px, Ghi chú: 220px/fluid).
- **REQ-002**: Neo cố định 2 đầu (Sticky Dual Pins): Cố định bên trái (`Pin Left`) cột `Checkbox` (left-0, 40px) và cột `Mã lô` (left-40px, 140px); Cố định bên phải (`Pin Right`) cột `Phiếu A4` (right-0, 60px) kèm phân cách viền `border-l border-border/80` và hiệu ứng đổ bóng âm `shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)]`.
- **REQ-003**: Chuẩn hóa căn phải (`text-right`) cho các cột số lượng định lượng (`Số lượng`, `Khối lượng Kg`) ở cả cấp độ Header và Body cell, kết hợp bắt buộc `font-mono tabular-nums`.
- **REQ-004**: Triển khai bộ chuyển đổi mật độ dòng (Row Density Switcher) hỗ trợ hai chế độ: `compact` (`py-1` đến `py-1.5`, row height ~32px) và `normal` (`py-2.5`, row height ~42px), có lưu trạng thái người dùng vào `localStorage` (`dynamo_tracking_density`).
- **REQ-005**: Áp dụng quy tắc chống rớt dòng tuyệt đối (`whitespace-nowrap truncate`) trên tất cả các cột dữ liệu text, bổ sung native tooltip `title={...}` với thời gian phản hồi tức thì khi hover để kiểm tra nội dung dài mà không làm nhảy độ cao dòng.
- **SEC-001**: Đảm bảo che chắn và bảo mật dữ liệu nhạy cảm theo phân quyền người dùng (`formatVendorName` theo quyền role, chỉ hiển thị đơn giá khi `canViewPricing`).
- **CON-001**: Tuân thủ tuyệt đối quy chuẩn Graphite Wireframe UI Specification v2.1.0 (`DESIGN-SYSTEM.md`): bo góc tối thiểu 2px (`rounded-xs`), không dùng shadow mềm người tiêu dùng (`shadow-2xl`), đường viền sắc nét 1px (`border-border`).
- **CON-002**: Giữ nguyên 100% tính năng hiện có: Resizing cột kéo thả qua chuột, Double-click khôi phục độ rộng mặc định, Inline-edit ngày/số lượng/ghi chú, Sắp xếp đa cột và Popover bộ lọc cột.
- **CON-003**: Không làm thay đổi lịch sử commit đã đẩy lên Lovable (không force-push/rebase).
- **GUD-001**: Phân tầng z-index khoa học: Sticky Header Pin z-50, Regular Header z-40, Sticky Body Pin z-20, Regular Body cell z-10, Popover/Modal z-50+.
- **PAT-001**: Áp dụng mẫu Micro-Control Bar đồng bộ kiểu dáng với module `/orders` (nút bấm segmented control gọn gàng với `rounded-xs border border-border bg-secondary/50 p-0.5`).

---

## 2. Implementation Steps

### Implementation Phase 1: Tái Cấu Trúc Khung Kích Thước & Neo Cột Hai Đầu (Sticky Pins)

- GOAL-001: Nâng cấp `DEFAULT_COL_WIDTHS`, `MIN_COL_WIDTHS`, cấu trúc `<col>`, thẻ `<th />` và `<td />` cho 16 cột với cơ chế Pin Left/Right.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Cập nhật `DEFAULT_COL_WIDTHS` và `MIN_COL_WIDTHS` trong `src/routes/tracking.tsx` theo tỷ lệ Fluid-Fixed tối ưu (Checkbox: 40px, Ticket: 60px, SL/KG: 70px, Xưởng/Vật liệu/Độ cứng: 80px, v.v.). | ✅ | 2026-11-05 |
| TASK-002 | Nâng cấp Header `Phiếu A4` thành Sticky Right Pin (`sticky top-0 right-0 z-50 bg-secondary border-l border-border/80 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.08)]`). | ✅ | 2026-11-05 |
| TASK-003 | Nâng cấp Body cell `Phiếu A4` thành Sticky Right Pin (`sticky right-0 z-20 bg-card group-hover:bg-accent/40 border-l border-border/80 shadow-[-4px_0_8px_-2px_rgba(0,0,0,0.08)]`). | ✅ | 2026-11-05 |
| TASK-004 | Đồng bộ kích thước cố định của cột `Checkbox` từ 44px về 40px, cập nhật `stickyLeft` của cột `Mã lô` tương ứng với vị trí mới (40px). | ✅ | 2026-11-05 |

### Implementation Phase 2: Căn Chỉnh Dữ Liệu Số Học & Chống Rớt Dòng (Anti-Wrap Discipline)

- GOAL-002: Chuẩn hóa căn lề, kiểu chữ số học và tooltip hiển thị nội dung cho các cột văn bản dài.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Cập nhật HeaderFilterCell và Body cell của cột `Số lượng` và `Khối lượng (Kg)` sang căn phải (`text-right`, `align="end"`), giữ vững `font-mono tabular-nums`. | ✅ | 2026-11-05 |
| TASK-006 | Bổ sung class `whitespace-nowrap truncate` và thuộc tính native `title={...}` cho các cell hiển thị Đơn hàng, Mã hàng, Đối tác, và Ghi chú nhằm triệt tiêu hiện tượng rớt dòng làm nhảy row height. | ✅ | 2026-11-05 |
| TASK-007 | Điều chỉnh cột `Ghi chú` (`ghi_chu`) thành cột bọt biển đàn hồi (Fluid Absorption), tự động chiếm trọn phần diện tích dư của bảng trên các màn hình độ phân giải cao. | ✅ | 2026-11-05 |

### Implementation Phase 3: Tích Hợp Row Density Switcher & Kiểm Thử Tự Động

- GOAL-003: Xây dựng bộ điều khiển mật độ dòng (`compact` / `normal`) và bổ sung test kiểm chuẩn CI/CD.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Khởi tạo state `density: TableDensity` (`'compact' | 'normal'`) trong `src/routes/tracking.tsx`, tích hợp đọc và ghi `localStorage` (`dynamo_tracking_density`). | ✅ | 2026-11-05 |
| TASK-009 | Gắn biến đệm dọc `padY` tương ứng (`compact: py-1` / `normal: py-2.5`) vào tất cả 16 ô của `<tbody>`, đảm bảo đồng bộ chiều cao dòng giữa các cột sticky và non-sticky. | ✅ | 2026-11-05 |
| TASK-010 | Bố trí UI chuyển đổi mật độ Segmented Control vào Micro-Control Bar của `/tracking` (cạnh phân trang và nút làm mới dữ liệu). | ✅ | 2026-11-05 |
| TASK-011 | Bổ sung bộ test kiểm chuẩn `TC-DS-07`, `TC-DS-08` và `TC-DS-09` trong `src/test/design-system-compliance.test.ts` để kiểm tra độ rộng cột, tính năng sticky 2 đầu và density switch. | ✅ | 2026-11-05 |
| TASK-012 | Thực thi kiểm thử toàn dự án `npm test` và kiểm tra build `npm run build` đảm bảo không phát sinh regression hay lỗi type. | ✅ | 2026-11-05 |

---

## 3. Alternatives

- **ALT-001**: Cho phép cột tự co giãn tự do (Fluid layout toàn phần không min-width). *Lý do từ chối*: Dẫn đến việc các cột mã lô hoặc ngày tháng bị bóp méo, văn bản bị cắt cụt không thể đọc được trên màn hình nhỏ.
- **ALT-002**: Không neo cột `Phiếu A4` bên phải mà đưa nút In vào trong Context Menu hoặc Drawer chi tiết. *Lý do từ chối*: Quy trình xưởng nhiệt luyện đòi hỏi in phiếu A4 cấp tốc theo từng lô, việc ẩn nút in vào menu phụ làm tăng số lần nhấp chuột và giảm năng suất thao tác.
- **ALT-003**: Dùng thư viện Tooltip dạng Popover ngoài (Radix Tooltip / Tippy.js) cho hàng ngàn cell. *Lý do từ chối*: Tạo ra quá nhiều DOM node và listener không cần thiết làm chậm tốc độ render bảng lớn; native HTML `title` hoàn toàn miễn phí về chi phí render và đáp ứng tốt tiêu chí hiển thị tức thì.

---

## 4. Dependencies

- **DEP-001**: `@tanstack/react-router` - Quản lý navigation và search params.
- **DEP-002**: `lucide-react` - Các biểu tượng công nghiệp (`Printer`, `SlidersHorizontal`, `Layers`, `Maximize2`, `Minimize2`).
- **DEP-003**: `src/lib/types.ts` & `src/lib/mock-data.ts` - Định nghĩa kiểu dữ liệu `LotItem` và dữ liệu vận hành.
- **DEP-004**: `DESIGN-SYSTEM.md` - Tiêu chuẩn Graphite Wireframe Specification v2.1.0.

---

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` - Tái cấu trúc bảng điều độ luân chuyển nhiệt luyện (Fluid-Fixed column widths, Pin Right action, Density Switcher, Anti-wrap styles).
- **FILE-002**: `src/test/design-system-compliance.test.ts` - Bộ kiểm thử tự động xác nhận tính tuân thủ của cấu trúc bảng, sticky pins và density toggle.
- **FILE-003**: `plan/refactor-tracking-fluid-fixed-table-1.md` - Bản kế hoạch lưu trữ trong mã nguồn dự án.

---

## 6. Testing

- **TEST-001**: Kiểm tra độ rộng mặc định và độ rộng tối thiểu của 16 cột trong `src/routes/tracking.tsx` (xác nhận `checkbox: 40`, `ticket: 60`, `so_luong: 70`, `kg_Lot: 70`).
- **TEST-002**: Kiểm tra cấu trúc Sticky Pin Left (cột 1 Checkbox left-0, cột 2 Mã lô left-40) và Sticky Pin Right (cột 16 Phiếu A4 right-0 kèm bóng đổ shadow âm).
- **TEST-003**: Kiểm tra sự hiện diện của kiểu `TableDensity` và state `density` (`compact` / `normal`).
- **TEST-004**: Kiểm tra việc áp dụng `font-mono tabular-nums` và `text-right` cho 2 cột số học `so_luong` và `kg_Lot`.
- **TEST-005**: Chạy toàn bộ test suites hiện có qua `npm test` để đảm bảo 100% test cases pass.
- **TEST-006**: Chạy `npm run build` để đảm bảo biên dịch TypeScript và SSR Nitro server thành công 100%.

---

## 7. Risks & Assumptions

- **RISK-001**: Xung đột độ cao dòng (`line-height`) giữa các cột sticky và non-sticky khi có nội dung dài. *Biện pháp giảm thiểu*: Cưỡng chế `whitespace-nowrap truncate` và đồng bộ cùng một lớp padding dọc `padY` cho toàn bộ 16 ô trong cùng một thẻ `<tr />`.
- **RISK-002**: Đổ bóng `shadow` của Sticky Right Pin có thể bị che khuất bởi thuộc tính overflow của container cha. *Biện pháp giảm thiểu*: Sử dụng lớp đổ bóng ngoài `shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.08)]` và đảm bảo `z-index` phân cấp rõ ràng (z-20 so với z-10 của body cell).
- **ASSUMPTION-001**: Người dùng sử dụng trình duyệt hiện đại (Chrome, Edge, Firefox, Safari) hỗ trợ đầy đủ `position: sticky` trên thẻ `<th>` và `<td>`.
- **ASSUMPTION-002**: Mật độ dòng `compact` được ưu tiên mặc định cho các ca làm việc dày đặc, nhưng người dùng có thể linh hoạt chuyển sang `normal` và được ghi nhớ trên máy cá nhân.

---

## 8. Related Specifications / Further Reading

- [DESIGN-SYSTEM.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/DESIGN-SYSTEM.md) - Graphite Wireframe UI Specification v2.1.0
- [AGENTS.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/AGENTS.md) - MES Design System & Subagent Protocol
- [design-dashboard-graphite-wireframe-ui-ux-1.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/plan/design-dashboard-graphite-wireframe-ui-ux-1.md) - Kế hoạch nâng cấp Dashboard đồng bộ
