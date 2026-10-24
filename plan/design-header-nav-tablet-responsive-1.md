---
goal: Dọn Dẹp Telemetry & Header, Chuyển Đổi Sidebar Thành Header Navigation & Nâng Cấp Trải Nghiệm Tablet Responsive (768px - 1024px)
version: 1.0
date_created: 2026-10-23
last_updated: 2026-10-24
owner: Frontend Taste Lead & UI/UX Specialist
status: 'Completed'
tags: ['design', 'header-nav', 'telemetry-cleanup', 'tablet-responsive', 'touch-grid', 'monozukuri']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch này kết hợp các nguyên lý từ **/design-taste-frontend** (Anti-Slop, giải phóng diện tích hiển thị dữ liệu thực tế), **/minimalist-ui** (tinh gọn, loại bỏ các nút dư thừa), và **/redesign-existing-projects** nhằm thực hiện 3 đột phá lớn về công thái học cho hệ thống MES DYNAMO VIETNAM:

1. **Dọn dẹp Header & Telemetry**:
   - Xóa div chứa 3 thẻ thống kê luân chuyển ("Chờ xuất", "Đang tại Vendor", "Đã nhập kho") trong thanh `ShopfloorTelemetry` (Cột 3), cân đối lại thanh telemetry thành 3 cột cân xứng (`md:grid-cols-3`).
   - Xóa 4 nút lọc phân xưởng ("ALL", "PIN", "INSERT", "MOLD") trong header (bảo toàn tính năng lọc xưởng độc lập ngay tại đầu cột `phong_sx`).
   - Xóa nút "Bật/tắt âm thanh" (`Volume2`/`VolumeX`) trong header.
2. **Chuyển đổi Sidebar sang Header Navigation**:
   - Dỡ bỏ hoàn toàn thanh `<aside>` bên trái màn hình.
   - Chuyển 2 mục điều hướng `/tracking` (Tracking Luân chuyển) và `/sync` (Đồng bộ Google Sheets) thành **Inline Nav Tabs** sang trọng trên thanh Header.
   - Tích hợp thông tin tài khoản (Avatar QT, Tên, Role badge), nút Đăng xuất (`LogOut`), Theme toggle (`Moon`/`Sun`), LED Clock lên Header một cách hài hòa.
   - Mở rộng 100% diện tích chiều ngang màn hình cho bảng dữ liệu MES.
3. **Nâng cấp trải nghiệm Tablet Responsive (768px – 1024px)**:
   - Mở rộng cơ chế Single-Viewport Lock (`h-screen overflow-hidden`) từ breakpoint `md:` (768px) trở lên.
   - Ghim cố định 2 cột đầu tiên (Checkbox 44px và Mã lô `ID_Key`) khi cuộn ngang trên tablet.
   - Mở rộng kích thước điểm chạm cảm ứng (touch targets tối thiểu 40-44px) cho các nút điều khiển, bộ lọc cột, checkbox.
   - Hỗ trợ thao tác chạm 1 lần (1-tap inline edit) trên icon bút chì hoặc ô để chỉnh sửa nhanh thay vì phải double click.
   - Sắp xếp linh hoạt thanh KPI Summary Toolbar và các thẻ filter chips trên tablet.

---

## 1. Requirements & Constraints

- **REQ-001**: Xóa bỏ div chứa 3 thẻ trạng thái luân chuyển (`{m.waiting} Chờ xuất`, `{m.atVendor} Đang tại Vendor`, `{m.stocked} Đã nhập kho`) tại Cột 3 trong `ShopfloorTelemetry`.
- **REQ-002**: Tái cấu trúc thanh `ShopfloorTelemetry` thành layout 3 cột cân đối (`grid-cols-1 md:grid-cols-3`): Cột 1 (Sync Sheets & Ca kíp) | Cột 2 (Khối lượng ngoài xưởng kg/pcs) | Cột 3 (Tải theo xưởng % & số lô mở).
- **REQ-003**: Xóa bỏ nhóm 4 nút lọc phân xưởng ('Tất cả' / 'ALL', 'PIN', 'INSERT', 'MOLD') trong Header của `src/components/dynamo-shell.tsx`.
- **REQ-004**: Xóa bỏ nút chuyển đổi âm thanh (`soundOn ? <Volume2 /> : <VolumeX />`) trong Header của `src/components/dynamo-shell.tsx`.
- **REQ-005**: Dỡ bỏ toàn bộ sidebar `<aside>` bên trái trong `src/components/dynamo-shell.tsx`, giải phóng toàn bộ không gian ngang cho màn hình chính `<main>`.
- **REQ-006**: Xây dựng **Inline Nav Tabs** ngay trên thanh Header cho 2 phân hệ: `/tracking` (Tracking Luân chuyển) và `/sync` (Đồng bộ Google Sheets - chỉ hiển thị với vai trò có quyền truy cập), kèm phím tắt `[1]`, `[2]`.
- **REQ-007**: Chuyển thông tin người dùng (Avatar QT, tên tài khoản, Role badge, nút Đăng xuất `LogOut`) lên góc phải Header.
- **REQ-008**: Tối ưu Single-Viewport cho Tablet: Kích hoạt `h-screen overflow-hidden` từ breakpoint `md:` (768px), đảm bảo không phát sinh thanh cuộn dọc ngoài trình duyệt trên iPad/Tablet.
- **REQ-009**: Tối ưu Touch Target & Thao tác cảm ứng Tablet cho Bảng dữ liệu: Đảm bảo nút lọc cột `▾ Lọc`, checkbox, và các nút điều hướng phân trang đạt kích thước tối thiểu 40x40px; hỗ trợ chạm 1 lần vào icon bút chì để kích hoạt chế độ sửa nhanh.
- **CON-001**: Không làm gián đoạn tính năng phân quyền (Role switcher, impersonation) và khả năng bảo vệ route `/sync`.
- **CON-002**: Không ảnh hưởng đến bộ lọc phân xưởng chi tiết tại đầu cột `phong_sx` trong `src/routes/tracking.tsx`.
- **CON-003**: Giữ nguyên phím tắt toàn cục `⌘K` / `Ctrl+K` và phím số `1`, `2` chuyển tab nhanh.
- **GUD-001**: Triết lý thiết kế **Monozukuri Control Room**: Tận dụng từng pixel chiều ngang và chiều dọc cho dữ liệu sản xuất, tránh các khung viền cồng kềnh hoặc sidebar chiếm chỗ không cần thiết.
- **GUD-002**: Tuân thủ tiêu chuẩn Touch-Friendly của Apple Human Interface Guidelines / Material Design cho máy tính bảng (điểm chạm tối thiểu 44x44px đối với các nút bấm cảm ứng).
- **PAT-001**: Cấu trúc Header Navigation thống nhất: `Header (Logo + Inline Tabs + Controls + User & Logout)` -> `ShopfloorTelemetry (3 Cột)` -> `Main Area (100% Width)`.
- **PAT-002**: Touch-Friendly Table Header & Cells: Ghim 2 cột `sticky left-0` (Checkbox) và `sticky left-[44px]` (Mã lô `ID_Key`).

---

## 2. Implementation Steps

### Implementation Phase 1: Dọn Dẹp Telemetry & Header

- GOAL-001: Xóa div 3 trạng thái trong Telemetry bar, xóa 4 nút lọc phân xưởng và nút âm thanh trong Header.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Cập nhật `src/components/shopfloor-telemetry.tsx`: Xóa div Cột 3 chứa `{m.waiting} Chờ xuất`, `{m.atVendor} Đang tại Vendor`, `{m.stocked} Đã nhập kho`; tái cấu trúc grid thành `grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border/60` | ✅ | 2026-10-23 |
| TASK-002 | Cập nhật `src/components/dynamo-shell.tsx`: Xóa div chứa 4 button lọc phân xưởng ('Tất cả', 'PIN', 'INSERT', 'MOLD') tại dòng 573–591 | ✅ | 2026-10-23 |
| TASK-003 | Cập nhật `src/components/dynamo-shell.tsx`: Xóa nút bật/tắt âm thanh (`Volume2`/`VolumeX`) tại dòng 596–605 | ✅ | 2026-10-23 |

### Implementation Phase 2: Chuyển Đổi Sidebar Sang Header Navigation

- GOAL-002: Bỏ hẳn Sidebar bên trái và thiết kế lại Header chứa Logo, Inline Nav Tabs, Clock, Role Switcher, Theme Toggle, User Profile và nút Đăng xuất.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Dỡ bỏ thẻ `<aside>` cùng các state liên quan (`collapsed`, `mobileOpen`) trong `src/components/dynamo-shell.tsx` | ✅ | 2026-10-24 |
| TASK-005 | Thiết kế cụm **Inline Nav Tabs** trong Header: Hiển thị các tab `/tracking` và `/sync` (lọc theo quyền `canAccessRoute`), nổi bật tab đang chọn với viền active và badge phím tắt `[1]`, `[2]` | ✅ | 2026-10-24 |
| TASK-006 | Tích hợp cụm User Profile và nút Đăng xuất (`LogOut`) vào góc phải Header, đồng bộ giao diện Dark/Light mode và LedClock | ✅ | 2026-10-24 |

### Implementation Phase 3: Nâng Cấp Tablet Responsive & Touch UX

- GOAL-003: Tối ưu hiển thị và tương tác cảm ứng cho Máy tính bảng (768px – 1024px) trên toàn bộ hệ thống và bảng Tracking.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Cập nhật layout container trong `src/components/dynamo-shell.tsx`: Mở rộng viewport lock `h-screen overflow-hidden flex flex-col` từ breakpoint `md:` (768px), căn chỉnh padding `<main>` trên tablet | ✅ | 2026-10-24 |
| TASK-008 | Tối ưu bảng dữ liệu trong `src/routes/tracking.tsx` cho tablet: Cố định 2 cột đầu (Checkbox & Mã lô), tối ưu thanh KPI Summary Toolbar và thanh phân trang tự xếp hàng linh hoạt | ✅ | 2026-10-24 |
| TASK-009 | Nâng cấp touch-target trên tablet cho bảng: Mở rộng vùng chạm cho nút `▾ Lọc`, checkbox hàng/cột; hỗ trợ 1-tap vào icon `Edit2` để sửa nhanh trên màn hình cảm ứng | ✅ | 2026-10-24 |

### Implementation Phase 4: Kiểm Thử Toàn Diện & Tinh Chỉnh

- GOAL-004: Xác minh tính toàn vẹn chức năng trên Desktop và Tablet viewports, đảm bảo không có lỗi linter/build.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Kiểm tra chức năng điều hướng, phím tắt `1`, `2`, `⌘K`, giả lập quyền Admin, đăng xuất, chuyển theme | ✅ | 2026-10-24 |
| TASK-011 | Kiểm tra hiển thị và thao tác trên độ phân giải Tablet (768x1024, 820x1180, 1024x768): Cuộn bảng, ghim cột, lọc popover, inline edit | ✅ | 2026-10-24 |

---

## 3. Alternatives

- **ALT-001**: Giữ Sidebar dạng thanh Slim Icon Rail (60px). *Lý do không chọn*: Người dùng đã quyết định chọn phương án chuyển sang Header Navigation để giải phóng trọn vẹn 100% bề ngang cho bảng dữ liệu 16 cột.
- **ALT-002**: Chuyển bảng trên tablet thành dạng Card / Kanban. *Lý do không chọn*: Người dùng chọn phương án Touch Data Grid đầy đủ 16 cột với 2 cột ghim cố định và cuộn ngang mượt mà.

---

## 4. Dependencies

- **DEP-001**: `lucide-react` cho các biểu tượng điều hướng và thao tác.
- **DEP-002**: `@tanstack/react-router` cho định tuyến và kiểm tra `location.pathname`.

---

## 5. Files

- **FILE-001**: `src/components/shopfloor-telemetry.tsx` - Xóa div Cột 3 và cân chỉnh lại grid 3 cột.
- **FILE-002**: `src/components/dynamo-shell.tsx` - Xóa nút header, xóa sidebar, xây dựng Header Navigation mới, tối ưu layout container.
- **FILE-003**: `src/routes/tracking.tsx` - Tối ưu thanh toolbar, điểm chạm touch-target, ghim cột và inline-edit cho tablet.

---

## 6. Testing

- **TEST-001**: Kiểm tra thanh Telemetry hiển thị chính xác 3 cột cân đối trên màn hình desktop và tablet.
- **TEST-002**: Kiểm tra Header hiển thị đầy đủ Logo, Tabs điều hướng, LedClock, Theme toggle, User badge và nút Logout.
- **TEST-003**: Kiểm tra thao tác chuyển tab bằng click và phím số `1`, `2`.
- **TEST-004**: Kiểm tra bảng dữ liệu trên Tablet: Cuộn ngang không mất cột Checkbox và Mã lô, nút lọc bấm nhạy, thanh phân trang ở đáy không bị che khuất.

---

## 7. Risks & Assumptions

- **RISK-001**: Trên các màn hình tablet bề ngang hẹp (768px), thanh Header có thể bị chật nếu có quá nhiều thành phần. *Biện pháp giảm thiểu*: Tự động thu gọn text của nhãn trên màn hình nhỏ và chỉ hiển thị icon + badge ngắn gọn.
- **ASSUMPTION-001**: Người dùng sử dụng tablet ở cả chế độ dọc (portrait) và ngang (landscape), hệ thống cần thích ứng trơn tru với cả 2 hướng xoay.

---

## 8. Related Specifications / Further Reading

- [design-desktop-viewport-fullscreen-1.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/design-desktop-viewport-fullscreen-1.md)
- [feature-centralized-bidirectional-sync-1.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/feature-centralized-bidirectional-sync-1.md)
