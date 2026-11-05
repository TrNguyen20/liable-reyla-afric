---
goal: Triển khai lộ trình tối ưu hóa toàn diện giao diện điều độ /tracking qua 3 giai đoạn (Interactive Badges, Poka-Yoke Quality Gate, SLA Thermometer, In-cell Badges, Omnibar Ctrl+K, Kiosk Card Stack, Macro 1-Chạm)
version: 1.0.0
date_created: 2026-11-05
status: 'Planned'
tags: [ui-ux, tracking, poka-yoke, omnibar, card-stack, macro-dispatch, graphite-wireframe]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Màn hình `/tracking` (Cockpit điều độ luân chuyển nhiệt luyện) là trái tim vận hành của hệ thống Dynamo MES. Sau khi đã tái cấu trúc thành công bảng dữ liệu theo chuẩn Fluid-Fixed Hybrid Table (với Sticky Pin 2 đầu và Row Density Switcher), đợt nâng cấp toàn diện này hiện thực hóa **Prioritized Execution Roadmap** gồm cả 3 giai đoạn:

1. **Giai đoạn 1 (Quick Wins - High ROI & Quality Gate)**: Khai thông tương tác 1-chạm trên thanh KPI Telemetry, thiết lập chốt chặn chất lượng Poka-Yoke (ngăn chặn xuất nhập kho khi chưa nghiệm thu QC), và bổ sung chỉ báo đếm ngược hạn trả OTD SLA trực quan.
2. **Giai đoạn 2 (Interaction Polish & Power Controls)**: Thay thế toàn bộ `<select>` native trong từng ô dữ liệu bằng Industrial Clickable Badges + Micro Popover sắc nét; trang bị hộp lệnh tìm kiếm toàn cục Omnibar Command Palette (`Ctrl+K` / `/`); bổ sung cơ chế hover preview siêu tốc cho cột ghi chú dài.
3. **Giai đoạn 3 (Multi-Device Kiosk & 1-Click Batch Macro)**: Thiết kế giao diện thẻ trượt công nghiệp (Card Stack) tối ưu riêng cho máy quét mã vạch cầm tay Zebra/Honeywell/tablet (< 1024px) kèm nút chuyển chế độ linh hoạt; tích hợp quy trình xuất xưởng 1-chạm (Batch Dispatch Run) tự động gán đối tác, cập nhật ngày hẹn và in vé hàng loạt.

---

## 1. Requirements & Constraints

- **REQ-001**: Khai thông tính năng lọc tương tác trên 3 Badge của thanh Telemetry Toolbar (`Lô quản lý`, `Khối lượng`, `Phân xưởng`), cho phép click 1-chạm để lọc nhanh hoặc mở popover chọn phân xưởng.
- **REQ-002**: Thiết lập cơ chế chốt chặn chất lượng Poka-Yoke (Poka-Yoke Quality Gate): Khóa cứng thao tác chuyển sang `[STOCKED]` đối với tài khoản `operator`/`viewer` khi QC chưa `Đạt`. Với tài khoản `leader`/`admin`/`qa`, hiển thị hộp thoại cảnh báo rủi ro `PokaYokeStockingDialog` yêu cầu chọn lý do ngoại lệ và ghi log vào hệ thống `appendAudit`.
- **REQ-003**: Hiển thị nhãn đếm ngược hạn trả OTD SLA trực quan trong cột `Hạn trả` (`han_tra`): `[OTD: -Xd]` (đỏ/quá hạn), `[OTD: Xh]` (vàng/sắp đến hạn < 24h), `[OTD: OK]` (graphite/an toàn).
- **REQ-004**: Thay thế các thẻ `<select>` native trong 2 cột `TrangThai` và `qc` bằng Clickable Industrial Badges + Micro Popover, triệt tiêu DOM bloat, hỗ trợ phím tắt 1-2-3 và touch-friendly.
- **REQ-005**: Tích hợp thanh tìm kiếm điều hướng toàn cục Omnibar Command Palette (`cmdk`), kích hoạt qua phím tắt `Ctrl + K` hoặc `/`, hỗ trợ tìm nhanh mã lô, số PO, mã hàng và kích hoạt nhanh các bộ lọc trọng điểm.
- **REQ-006**: Bổ sung popover xem nhanh ghi chú dài (Hover Quick-Peek) khi rê chuột hoặc chạm nhẹ vào ô `ghi_chu`, hiển thị trọn vẹn văn bản mà không cần click đúp vào chế độ edit.
- **REQ-007**: Xây dựng chế độ xem thẻ công nghiệp (Industrial Card Stack View) tối ưu cho màn hình cảm ứng cầm tay và máy quét PDA (< 1024px), với các nút bấm thao tác lớn $\ge 44\text{px}$.
- **REQ-008**: Bổ sung nút chuyển đổi chế độ xem (View Mode Switcher: `Bảng` ↔ `Thẻ`) trên Micro-Control Bar với khả năng tự động thích ứng responsive breakpoint.
- **REQ-009**: Tích hợp quy trình xuất xưởng đối tác 1-chạm (One-Click Batch Dispatch Run) trong thanh Dock nổi (Floating Bulk Dock): Chọn đối tác, gán ngày xuất/hạn trả, cập nhật trạng thái `[TRANSIT]` và in phiếu A4 chỉ trong một thao tác duy nhất.
- **SEC-001**: Bảo vệ phân quyền nghiêm ngặt: Chỉ `admin`/`leader` có thẩm quyền phê duyệt ngoại lệ Poka-Yoke và chỉ định đối tác gia công nhiệt luyện.
- **CON-001**: Tuân thủ tuyệt đối quy chuẩn Graphite Wireframe UI Specification v2.1.0 (`DESIGN-SYSTEM.md`): bo góc tối thiểu 2px (`rounded-xs`), đường viền 1px (`border-border`), font số monospaced `tabular-nums`.
- **CON-002**: Đảm bảo không làm chậm tốc độ render bảng dữ liệu quy mô lớn (22.000+ bản ghi), không làm vỡ các tính năng sticky dual-edge pins đã hoàn thiện.
- **GUD-001**: Phân cấp tầng z-index minh bạch: Sticky Header Pin `z-50`, Table Body Pin `z-20`, Floating Bulk Dock `z-45`, Popover/Modal Dialog `z-50+`.
- **PAT-001**: Tận dụng triệt để các thư viện primitives sẵn có trong dự án (`cmdk`, `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `lucide-react`).

---

## 2. Implementation Steps

### Implementation Phase 1: High-ROI Quick Wins & Safety Foundation

- GOAL-001: Hiện thực hóa tính năng lọc 1-chạm trên Telemetry Bar, chốt chặn Poka-Yoke chất lượng và nhãn OTD SLA đếm ngược.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Nâng cấp 3 Badge Telemetry (`Lô quản lý`, `Khối lượng`, `Phân xưởng`) thành các nút bấm tương tác 1-chạm có phản hồi hover và âm thanh click `beep`. | | |
| TASK-002 | Xây dựng component `PokaYokeStockingDialog` và tích hợp kiểm soát chuyển trạng thái `[STOCKED]` (khóa cứng Operator, yêu cầu lý do ngoại lệ với Leader/Admin). | | |
| TASK-003 | Bổ sung hàm tính toán `getOtdSlaBadge(dateStr)` và render nhãn OTD SLA đếm ngược trực quan trong cột `Hạn trả`. | | |

### Implementation Phase 2: Interaction Polish & Power-User Controls

- GOAL-002: Thay thế native `<select>` bằng Clickable Industrial Badges, trang bị Omnibar `Ctrl+K`, và hỗ trợ hover preview ghi chú.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Xây dựng component `IndustrialStatusBadge` và `IndustrialQcBadge` dạng Clickable Popover thay thế thẻ `<select>` native trong `src/routes/tracking.tsx`. | | |
| TASK-005 | Xây dựng `TrackingCommandDialog` sử dụng `cmdk`, tích hợp phím tắt `Ctrl+K` và `/` để tìm kiếm siêu tốc mã lô, đơn hàng, và kích hoạt bộ lọc. | | |
| TASK-006 | Bổ sung `GhiChuHoverPreview` dạng Popover nhỏ gọn hiển thị toàn văn ghi chú khi rê chuột qua ô bị cắt ngắn (`truncate`). | | |

### Implementation Phase 3: Multi-Device Kiosk & 1-Click Batch Macro

- GOAL-003: Xây dựng chế độ xem thẻ Card Stack cho thiết bị quét mã vạch cầm tay và quy trình xuất xưởng 1-chạm (Batch Dispatch Run).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Xây dựng component `TrackingCardStack` hiển thị danh sách lô hàng dạng thẻ công nghiệp cảm ứng lớn cho màn hình nhỏ và máy quét mã vạch PDA. | | |
| TASK-008 | Thêm nút chuyển đổi chế độ xem `Grid` (Bảng) / `Cards` (Thẻ) vào Micro-Control Bar kèm cơ chế tự động chuyển đổi theo kích thước màn hình. | | |
| TASK-009 | Bổ sung hộp thoại quy trình `BatchDispatchRunModal` vào Floating Bulk Dock để xuất xưởng lô hàng loạt, gán vendor, sinh hạn trả và in phiếu A4 trong 1 click. | | |
| TASK-010 | Bổ sung bộ test kiểm chuẩn tự động `TC-DS-10`, `TC-DS-11`, `TC-DS-12` vào `src/test/design-system-compliance.test.ts`. | | |
| TASK-011 | Chạy toàn bộ test suites (`npm test`) và build sản phẩm (`npm run build`) đảm bảo 100% pass và không phát sinh lỗi. | | |

---

## 3. Alternatives

- **ALT-001**: Giữ nguyên thẻ `<select>` native và chỉ chỉnh CSS bo góc. *Lý do từ chối*: Vẫn gây phình DOM với hàng trăm node `<select>`, giao diện hiển thị không đồng nhất trên các hệ điều hành và thiết bị quét cầm tay.
- **ALT-002**: Hard lock 100% mọi role khi QC chưa Đạt mà không có cơ chế ngoại lệ. *Lý do từ chối*: Trong thực tế xưởng cơ khí, có các trường hợp bán thành phẩm nhiệt luyện cần nhập kho đệm khẩn cấp hoặc chờ phân tích kim tương bổ sung; cấm tuyệt đối sẽ gây ách tắc dây chuyền.
- **ALT-003**: Tạo một trang route riêng cho thiết bị di động (ví dụ `/m-tracking`). *Lý do từ chối*: Gây phân mảnh mã nguồn, tăng chi phí bảo trì và làm mất tính đồng bộ trạng thái tìm kiếm/bộ lọc giữa các thiết bị.

---

## 4. Dependencies

- **DEP-001**: `cmdk` - Thư viện nền tảng cho Omnibar Command Palette.
- **DEP-002**: `@radix-ui/react-dialog` & `@radix-ui/react-popover` - Primitives cho modal và popover.
- **DEP-003**: `lucide-react` - Các biểu tượng công nghiệp (`ShieldAlert`, `Zap`, `Sparkles`, `Clock`, `Smartphone`, `LayoutGrid`).
- **DEP-004**: `src/lib/types.ts` & `src/lib/dynamo-workflow.ts` - Hệ thống dữ liệu, phân quyền và ghi log audit.

---

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` - Tích hợp Telemetry filters, Poka-Yoke interlock, SLA badge, Clickable badges, Omnibar trigger, Card Stack và Macro run.
- **FILE-002**: `src/components/poka-yoke-dialog.tsx` - Hộp thoại kiểm soát chất lượng ngoại lệ Poka-Yoke.
- **FILE-003**: `src/components/tracking-command-dialog.tsx` - Omnibar Command Palette cho màn hình điều độ.
- **FILE-004**: `src/components/tracking-card-stack.tsx` - Chế độ hiển thị thẻ công nghiệp cho máy quét cầm tay và thiết bị di động.
- **FILE-005**: `src/test/design-system-compliance.test.ts` - Bộ kiểm thử tự động CI/CD cho các tính năng mới.
- **FILE-006**: `plan/design-tracking-cockpit-mega-roadmap-1.md` - Tài liệu kế hoạch lưu trữ trong mã nguồn.

---

## 6. Testing

- **TEST-001**: Kiểm tra sự hiện diện và hoạt động của hộp thoại Poka-Yoke khi cố gắng chuyển trạng thái lô chưa QC Đạt sang `Đã nhập kho`.
- **TEST-002**: Kiểm tra nhãn OTD SLA countdown hiển thị chính xác các khoảng thời gian quá hạn, sắp đến hạn và đúng hạn.
- **TEST-003**: Kiểm tra Clickable Industrial Badges cho Logistics và QC (thay thế thẻ select native).
- **TEST-004**: Kiểm tra phím tắt `Ctrl+K` và `/` kích hoạt Omnibar Command Palette.
- **TEST-005**: Kiểm tra chế độ xem Card Stack và nút chuyển đổi chế độ xem trên thanh điều khiển.
- **TEST-006**: Chạy toàn bộ test suites hiện có qua `npm test` để xác nhận 100% pass.
- **TEST-007**: Chạy `npm run build` để xác nhận biên dịch client và SSR server thành công 100%.

---

## 7. Risks & Assumptions

- **RISK-001**: Hiệu năng mở Command Dialog (`cmdk`) khi danh sách lô lên tới hàng ngàn bản ghi. *Biện pháp giảm thiểu*: Giới hạn kết quả tìm kiếm tức thì ở 50 bản ghi phù hợp nhất và phân nhóm rõ ràng (Mã lô, Đơn hàng, Hành động nhanh).
- **RISK-002**: Xung đột phím tắt trình duyệt khi nhấn `Ctrl+K` hoặc `/`. *Biện pháp giảm thiểu*: Sử dụng `e.preventDefault()` có điều kiện, bỏ qua khi người dùng đang gõ trong ô `<input>` hoặc `<textarea>`.
- **ASSUMPTION-001**: Điều độ viên xưởng có thể sử dụng cả chuột, phím tắt hoặc màn hình cảm ứng để tương tác với hệ thống.
- **ASSUMPTION-002**: Dữ liệu ngày gửi và hạn trả hợp lệ theo định dạng chuẩn ISO (YYYY-MM-DD) để tính toán chính xác chỉ số OTD SLA.

---

## 8. Related Specifications / Further Reading

- [DESIGN-SYSTEM.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/DESIGN-SYSTEM.md) - Graphite Wireframe UI Specification v2.1.0
- [AGENTS.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/AGENTS.md) - MES Design System & Subagent Protocol
- [refactor-tracking-fluid-fixed-table-1.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/plan/refactor-tracking-fluid-fixed-table-1.md) - Kế hoạch tái cấu trúc bảng Fluid-Fixed
