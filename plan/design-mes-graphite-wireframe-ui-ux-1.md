---
goal: Tối ưu hóa UI/UX toàn diện chuẩn Graphite Wireframe cho hệ thống MES
version: 1.0
date_created: 2026-11-04
last_updated: 2026-11-04
owner: Dynamo Vietnam MES Team
status: 'Completed'
tags: [design, ui-ux, graphite-wireframe, mes-dashboard, monospaced]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch khởi động quy trình tối ưu hóa UI/UX toàn diện cho dự án Manufacturing Execution System (MES). Áp dụng chuẩn thiết kế graphite wireframe UI (bố cục bảng biểu monospaced, chỉ báo trạng thái công nghiệp, bo góc tối thiểu 2px), tiến hành UI Audit và khắc phục lỗi trực tiếp trên mã nguồn.

## 1. Requirements & Constraints

- **REQ-001**: Áp dụng chuẩn bo góc tối thiểu 2px (`rounded-xs` / `rounded-[2px]`, tối đa 4px cho các nút bấm và tag nhỏ) trên toàn bộ hệ thống.
- **REQ-002**: Bố cục bảng biểu và các chỉ số định lượng phải sử dụng font monospaced (`font-mono tabular-nums`) để phục vụ môi trường kỹ thuật chính xác cao.
- **REQ-003**: Nâng cấp các chỉ báo trạng thái sang chuẩn công nghiệp (Industrial Status Indicators) với mã định danh kỹ thuật `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `[FAIL]` và đèn tín hiệu Andon/Run LED.
- **CON-001**: Không làm thay đổi logic nghiệp vụ, bảo vệ toàn vẹn các hàm BFF RPC Server Functions (`sheet.functions.ts`, `auth.functions.ts`) và quy tắc phân quyền (RBAC).
- **CON-002**: Giữ nguyên tính tương thích với Tailwind CSS v4 và TanStack Start router / query engine.
- **GUD-001**: Tuân thủ hướng dẫn chống lỗi giao diện của Anti-Slop Frontend và Redesign Skill: loại bỏ bóng mờ nặng, gradient rực rỡ và bo góc lớn kiểu tiêu dùng.
- **PAT-001**: Chuẩn thiết kế Graphite Wireframe: 1px border sắc nét, màu trung tính cool slate/graphite, độ tương phản cao, tối ưu cho màn hình cảm ứng Kiosk và máy tính xưởng xí nghiệp.

## 2. Implementation Steps

### Implementation Phase 1: Chuẩn hóa Tokens & UI Primitives

- GOAL-001: Tái cấu trúc Design Tokens và chuẩn hóa toàn bộ các component cốt lõi trong `src/components/ui/` theo tiêu chuẩn Graphite Wireframe 2px.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Cập nhật Design Tokens trong `src/styles.css` (`--radius: 2px`, `--radius-sm: 2px`, `--radius-md: 2px`, utility classes wireframe) | ✅ | 2026-11-04 |
| TASK-002 | Chuẩn hóa `src/components/ui/button.tsx` sang `rounded-xs` (2px), active tactile feedback `active:scale-[0.98]` | ✅ | 2026-11-04 |
| TASK-003 | Chuẩn hóa `src/components/ui/card.tsx` sang `rounded-xs` (2px), 1px border, loại bỏ bóng mờ nặng | ✅ | 2026-11-04 |
| TASK-004 | Chuẩn hóa `src/components/ui/badge.tsx`, `dialog.tsx`, `input.tsx` sang chuẩn wireframe 2px | ✅ | 2026-11-04 |

### Implementation Phase 2: Khắc phục Lỗi UI & Bảng biểu Dashboard

- GOAL-002: Rà soát và sửa đổi `src/routes/tracking.tsx`, áp dụng bố cục bảng monospaced và chỉ báo trạng thái công nghiệp.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Thay thế toàn bộ 38 vị trí `rounded-lg`, `rounded-xl`, `rounded-2xl` trong `src/routes/tracking.tsx` sang `rounded-xs` | ✅ | 2026-11-04 |
| TASK-006 | Đồng bộ hóa toàn bộ các cell dữ liệu trong bảng điều độ (Mã lô, PO, Xưởng, Part, Mác thép, Độ cứng, Qty, Kg, Ngày tháng) sang `font-mono tabular-nums` | ✅ | 2026-11-04 |
| TASK-007 | Nâng cấp dropdown/badge trạng thái logistics và QC sang Industrial Status Indicators (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `[FAIL]`) | ✅ | 2026-11-04 |
| TASK-008 | Tối ưu hóa thanh tác vụ nổi (Batch Action Bar) và modal A4 không bị tràn trên màn hình nhỏ/tablet | ✅ | 2026-11-04 |

### Implementation Phase 3: Đồng bộ Shell, Telemetry & Các Trang Phụ

- GOAL-003: Áp dụng chuẩn Graphite Wireframe trên App Shell, Thanh Telemetry thời gian thực, trang Liên kết Sheets và Đăng nhập.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Chuẩn hóa Navigation Tabs, Squircle User Badge và LED Clock trong `src/components/dynamo-shell.tsx` | ✅ | 2026-11-04 |
| TASK-010 | Chuẩn hóa thanh `ShopfloorTelemetry.tsx` với vạch tải xưởng và nút làm mới 2px | ✅ | 2026-11-04 |
| TASK-011 | Chuẩn hóa giao diện Gateway 2 cột trong `src/routes/sync.tsx` và Kiosk Keyboard trong `src/routes/login.tsx` | ✅ | 2026-11-04 |
| TASK-012 | Chạy kiểm thử tự động `npm test` và kiểm tra build `npm run build` đảm bảo không có lỗi hồi quy | ✅ | 2026-11-04 |

## 3. Alternatives

- **ALT-001**: Giữ nguyên `--radius: 6px` và chỉ tinh chỉnh cục bộ một số nút bấm. Bị từ chối vì không tạo được trải nghiệm Graphite Wireframe đồng bộ, vi phạm yêu cầu bo góc tối thiểu 2px.
- **ALT-002**: Thay đổi font hệ thống toàn bộ thành Courier/Monospace thuần túy. Bị từ chối vì làm giảm khả năng đọc tiêu đề tiếng Việt; giải pháp tối ưu là giữ `Be Vietnam Pro` cho tiêu đề và áp dụng `JetBrains Mono` (`font-mono tabular-nums`) cho bảng dữ liệu kỹ thuật và con số.

## 4. Dependencies

- **DEP-001**: Tailwind CSS v4 (`@tailwindcss/vite`, `src/styles.css`)
- **DEP-002**: Radix UI Primitives (`@radix-ui/react-*`)
- **DEP-003**: TanStack Start & TanStack Router (`@tanstack/react-start`, `@tanstack/react-router`)

## 5. Files

- **FILE-001**: `src/styles.css` (Tầng tokens và CSS base)
- **FILE-002**: `src/components/ui/button.tsx` (UI Primitive Button)
- **FILE-003**: `src/components/ui/card.tsx` (UI Primitive Card)
- **FILE-004**: `src/components/ui/badge.tsx` (UI Primitive Badge)
- **FILE-005**: `src/components/ui/dialog.tsx` (UI Primitive Dialog)
- **FILE-006**: `src/components/ui/input.tsx` (UI Primitive Input)
- **FILE-007**: `src/routes/tracking.tsx` (Bảng điều độ và theo dõi luân chuyển QT)
- **FILE-008**: `src/components/dynamo-shell.tsx` (Layout shell, Header, User Badge)
- **FILE-009**: `src/components/shopfloor-telemetry.tsx` (Thanh đo đạc xưởng)
- **FILE-010**: `src/components/lot-update-dialog.tsx` (Hộp thoại cập nhật tiến độ lô)
- **FILE-011**: `src/routes/sync.tsx` (Cổng liên kết Sheets hai chiều)
- **FILE-012**: `src/routes/login.tsx` (Cổng xác thực xưởng)

## 6. Testing

- **TEST-001**: `npm test` - Kiểm tra 8 bộ test suites (28 tests) bao gồm luồng bảo mật, phân quyền, đồng bộ cache, webhook và bài test mới `design-system-compliance.test.ts`.
- **TEST-002**: `npm run build` - Kiểm tra biên dịch production của TanStack Start và Vite.
- **TEST-003**: Kiểm tra trực quan giao diện bảng điều khiển `/tracking` về bo góc 2px, font monospaced và chỉ báo trạng thái công nghiệp.

## 7. Risks & Assumptions

- **RISK-001**: Thay đổi `--radius` có thể ảnh hưởng đến các thành phần bên thứ ba như thư viện biểu đồ Recharts hoặc Sonner Toast. *Khắc phục*: Giới hạn can thiệp an toàn ở cấp độ CSS variables và custom classes, đảm bảo toast và chart kế thừa viền sắc nét mượt mà.
- **ASSUMPTION-001**: Font `JetBrains Mono` đã được nhúng sẵn thông qua Google Fonts trong `src/routes/__root.tsx` và đã khai báo biến monospaced trong CSS.

## 8. Related Specifications / Further Reading

- [Design Desktop Viewport Fullscreen Plan](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/plan/design-desktop-viewport-fullscreen-1.md)
- [Design Sync Page Bi-directional Hub Plan](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/plan/design-sync-page-bi-directional-hub-1.md)
- [DYNAMO QT-MES Master Design System Specification](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20(internet)/liable-reyla-afric/DESIGN-SYSTEM.md)
