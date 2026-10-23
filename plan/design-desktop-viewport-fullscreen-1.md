---
goal: Nâng Cấp Công Thái Học Desktop - Loại Bỏ Tiêu Đề Trùng Lặp, Khóa Khung Hình Single-Viewport & Bổ Sung Chế Độ Table Fullscreen
version: 1.0
date_created: 2026-10-23
last_updated: 2026-10-23
owner: Frontend Taste Lead & UI/UX Specialist
status: Planned
tags: ['design', 'taste', 'desktop-viewport', 'fullscreen', 'tracking', 'ergonomics', 'anti-slop']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Kế hoạch này kết hợp các chỉ dẫn chuyên sâu từ **/design-taste-frontend** (Anti-Slop, tinh gọn tối đa khoảng thở thừa, loại bỏ trùng lặp nhãn mác) và **/frontend-design** (tôn trọng không gian hữu dụng, thiết kế có chủ đích cho người dùng nhà xưởng) nhằm giải quyết 3 bài toán công thái học trọng yếu trên màn hình điều hành Flagship `/tracking`:

1. **Loại bỏ lặp lại tiêu đề ("DYNAMO VIETNAM QT - MES + LUÂN CHUYỂN QT")**: Thanh điều hướng `header` trên cùng của hệ thống đã hiển thị rõ ràng cụm thương hiệu và tên phân hệ. Việc lặp lại một khối `PageHeading` lớn bên trong `<main>` gây lãng phí gần 90px chiều cao màn hình quý giá.
2. **Khóa khung nhìn Single-Viewport Lock trên Desktop**: Khắc phục triệt để hiện tượng "cuộn kép" (vừa cuộn trang web bên ngoài, vừa cuộn bảng bên trong). Trên màn hình máy tính (`lg:` trở lên), toàn bộ giao diện sẽ gói gọn hoàn hảo trong 1 khung màn hình `100dvh`, không xuất hiện thanh cuộn trang; thanh cuộn chỉ xuất hiện bên trong bảng dữ liệu với thanh phân trang được ghim cố định ở đáy.
3. **Chế độ Phóng To & Toàn Màn Hình (Table Fullscreen & Zen Focus Mode)**: Bổ sung chế độ Fullscreen chuyên dụng cho bảng dữ liệu, giúp điều độ viên và kỹ sư xưởng tập trung 100% vào việc rà soát các lô hàng mà không bị phân tâm bởi các thành phần xung quanh.

## 1. Requirements & Constraints

- **REQ-001**: Loại bỏ hoàn toàn khối `PageHeading` trùng lặp trong thẻ `<main>` của trang `/tracking` (loại bỏ lặp lại tiêu đề "DYNAMO VIETNAM QT - MES" và "LUÂN CHUYỂN QT").
- **REQ-002**: Tích hợp các nút hành động cốt lõi của `PageHeading` (Huy hiệu `{number(rows.length)} lô đang quản lý` và nút `Xuất CSV`) vào thanh điều khiển / KPI micro-badges một cách tinh gọn, đảm bảo không suy giảm bất kỳ tính năng nào.
- **REQ-003**: Khóa khung nhìn Desktop Viewport Lock (`h-[100dvh] flex flex-col overflow-hidden` trên màn hình `lg:`): Loại bỏ thanh cuộn ngoài của trang; chỉ cho phép cuộn bên trong vùng bảng dữ liệu (`flex-1 min-h-0 overflow-auto`).
- **REQ-004**: Ghim cố định cụm thanh phân trang (Pagination Bar) ở đáy bảng dữ liệu trên desktop để kỹ sư luôn nhìn thấy số trang và nút lật trang mà không cần cuộn chuột xuống đáy trang.
- **REQ-005**: Xây dựng tính năng Toàn Màn Hình / Phóng To Bảng (Table Fullscreen & Zen Focus Mode): Thêm nút phóng to (`Maximize2` / `Minimize2`) trên thanh công cụ bảng, hỗ trợ phím tắt `Alt+F` và `Esc` để thoát.
- **CON-001**: Bảo toàn 100% tính thích ứng (responsive) trên màn hình di động / tablet (`< lg`): Trên màn hình nhỏ, hệ thống vẫn duy trì luồng cuộn dọc trang tự nhiên và hỗ trợ cuộn ngang bảng.
- **CON-002**: Bảo đảm toàn vẹn Stacking Context (`isolation: isolate`) và sự hoạt động chính xác của Popover lọc header cột, Inline Quick-Edit và Floating Bulk Action Bar khi ở cả chế độ thông thường lẫn chế độ Fullscreen.
- **GUD-001**: Tôn chỉ thiết kế **Monozukuri Control Room**: Mỗi pixel chiều cao trên desktop phải dành cho việc hiển thị số liệu lô hàng, mã hàng, mác thép, hạn trả gia công; cắt bỏ mọi trang trí chữ dư thừa.
- **PAT-001**: Cấu trúc Flexbox Column chuẩn: `Shell (h-[100dvh] flex flex-col overflow-hidden)` -> `Header (shrink-0)` + `Telemetry (shrink-0)` + `Main (flex-1 min-h-0 flex flex-col overflow-hidden)` -> `Table Wrapper (flex-1 min-h-0 flex flex-col overflow-hidden)` -> `Table Scroll (flex-1 min-h-0 overflow-auto)` + `Pagination (shrink-0)`.

## 2. Implementation Steps

### Implementation Phase 1: Loại Bỏ Tiêu Đề Trùng Lặp & Tinh Gọn Không Gian Main

- GOAL-001: Giải phóng ~90px không gian chiều dọc bằng cách xóa `PageHeading` trùng lặp và tích hợp tiện ích vào thanh KPI Toolbar.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Xóa bỏ component `<PageHeading>` tại dòng 1225-1244 trong `src/routes/tracking.tsx` nhằm loại bỏ sự lặp lại của chuỗi "DYNAMO VIETNAM QT - MES" và "LUÂN CHUYỂN QT" | [x] | 2026-10-23 |
| TASK-002 | Tái cấu trúc cụm KPI Summary Line tại dòng 1285+ trong `src/routes/tracking.tsx`: Bổ sung badge số lô đang quản lý và nút hành động nhanh `"Xuất CSV"` vào góc phải thanh công cụ, tạo thành một thanh điều khiển vi mô hoàn chỉnh | [x] | 2026-10-23 |

### Implementation Phase 2: Thiết Lập Kiến Trúc Single-Viewport Lock Cho Desktop

- GOAL-002: Đóng khung giao diện vừa khít 1 màn hình trên Desktop (`100dvh`), loại bỏ thanh cuộn trang bên ngoài và chỉ cuộn trong bảng.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | Cập nhật layout container trong `src/components/dynamo-shell.tsx`: Cấu hình vùng `div.min-w-0.flex-1` và thẻ `main` trên màn hình `lg:` thành cấu trúc Flex Column `h-screen lg:h-[100dvh] overflow-hidden flex flex-col`, giảm padding `pt-2 pb-2 px-4` | | |
| TASK-004 | Tái cấu trúc container bảng dữ liệu trong `src/routes/tracking.tsx`: Thay thế `max-h-[750px]` bằng `flex-1 min-h-0 flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xs` để bảng tự co giãn theo chiều cao khả dụng của màn hình | | |
| TASK-005 | Cập nhật khu vực cuộn bảng và thanh phân trang: Thẻ `table` nằm trong khối `flex-1 min-h-0 overflow-auto` với sticky header, thanh phân trang gắn chặt ở đáy bảng (`shrink-0 border-t border-border`) luôn luôn nằm trong tầm mắt | | |

### Implementation Phase 3: Chế Độ Phóng To Bảng & Table Fullscreen Zen Focus Mode

- GOAL-003: Triển khai tính năng phóng to toàn màn hình cho bảng dữ liệu phục vụ theo dõi điều độ chuyên sâu.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Bổ sung trạng thái `isTableFullscreen` trong `src/routes/tracking.tsx`, tích hợp cả Browser Fullscreen API (`requestFullscreen()`) và lớp phủ Zen Mode (`fixed inset-0 z-50 bg-background flex flex-col p-4`) với phím tắt `Esc` | | |
| TASK-007 | Thêm nút chuyển đổi Fullscreen (`Maximize2` / `Minimize2`) trên thanh công cụ KPI của bảng, có tooltip và huy hiệu phím tắt trực quan `[Alt+F]` | | |
| TASK-008 | Kiểm tra tương thích phím tắt và Stacking Context: Đảm bảo thanh Floating Bulk Action Bar và modal cập nhật lô vẫn hiển thị chuẩn xác khi ở chế độ Fullscreen | | |

## 3. Alternatives

- **ALT-001**: Giữ nguyên `PageHeading` nhưng thu nhỏ chữ lại. *Lý do loại bỏ*: Vẫn gây lặp lại nội dung đã có trên header hệ thống, tốn diện tích vô ích trên màn hình nhà xưởng.
- **ALT-002**: Dùng `max-h-[85vh]` cố định thay vì cấu trúc Flex `min-h-0`. *Lý do loại bỏ*: Không tương thích hoàn hảo giữa các màn hình laptop 13" (768p) và màn hình phòng điều độ 24" (1080p/1440p), vẫn có thể sinh ra cuộn trang ngoài.

## 4. Dependencies

- **DEP-001**: `lucide-react` icons (`Maximize2`, `Minimize2`, `Layers`, `Download`, `RotateCcw`).
- **DEP-002**: Tailwind CSS v4 layout flex tokens (`h-[100dvh]`, `flex-1`, `min-h-0`, `overflow-hidden`, `overflow-auto`).

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` (Xóa PageHeading lặp lại, nâng cấp KPI toolbar, khóa flex table, thêm Fullscreen mode).
- **FILE-002**: `src/components/dynamo-shell.tsx` (Khóa Desktop viewport height `100dvh`, điều chỉnh flex column không cuộn trang ngoài).
- **FILE-003**: `plan/design-desktop-viewport-fullscreen-1.md` (Tài liệu kế hoạch thực thi).

## 6. Testing

- **TEST-001**: Mở `/tracking` trên máy tính desktop: Xác nhận không còn xuất hiện 2 lần tiêu đề "DYNAMO VIETNAM QT - MES" và "LUÂN CHUYỂN QT".
- **TEST-002**: Kiểm tra cuộn trang trên desktop: Thao tác lăn chuột ở bất kỳ vị trí nào trên trang, xác nhận thanh cuộn của trình duyệt ngoài KHÔNG di chuyển; chỉ có vùng dữ liệu bảng bên trong cuộn mượt mà.
- **TEST-003**: Kiểm tra thanh phân trang: Xác nhận thanh phân trang luôn nằm cố định ở đáy bảng dữ liệu mà không bị che khuất hay rơi xuống đáy màn hình.
- **TEST-004**: Bấm nút Fullscreen (hoặc nhấn `Alt+F`): Xác nhận bảng phóng to tràn toàn bộ màn hình, hiển thị nhiều dòng nhất có thể; nhấn `Esc` xác nhận trở về bình thường.
- **TEST-005**: Thu nhỏ màn hình xuống kích thước mobile (< 768px): Xác nhận trang vẫn giữ cơ chế cuộn tự nhiên, không bị lỗi vỡ khung.

## 7. Risks & Assumptions

- **RISK-001**: Trình duyệt chặn Fullscreen API nếu không có sự kiện tương tác người dùng trực tiếp. *Biện pháp*: Luôn kích hoạt Fullscreen qua sự kiện click hoặc phím tắt người dùng, kèm cơ chế fallback CSS Zen Mode toàn màn hình.
- **RISK-002**: Thanh Floating Bulk Action Bar bị che khuất khi ở chế độ Fullscreen. *Biện pháp*: Thiết lập `z-50` và đảm bảo thanh Bulk Bar nằm trong vùng hiển thị của chế độ Fullscreen.
- **ASSUMPTION-001**: Phần lớn kỹ sư và điều độ viên sử dụng máy tính bàn/laptop màn hình từ 1366x768 trở lên.
- **ASSUMPTION-002**: Khi ở chế độ Fullscreen, người dùng mong muốn tập trung cao độ vào việc đọc lướt và chỉnh sửa các ô trong bảng dữ liệu.

## 8. Related Specifications / Further Reading

- [src/routes/tracking.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/tracking.tsx)
- [src/components/dynamo-shell.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/components/dynamo-shell.tsx)
- [plan/design-frontend-taste-upgrade-1.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/design-frontend-taste-upgrade-1.md)
