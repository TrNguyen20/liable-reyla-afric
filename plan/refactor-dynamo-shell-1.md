---
goal: Loại bỏ nút kích hoạt tìm kiếm nhanh dư thừa trên Header của DynamoShell
version: 1.0
date_created: 2026-10-22
last_updated: 2026-10-22
owner: Frontend Team
status: Completed
tags: ['refactor', 'ui', 'dynamo-shell', 'cleanup']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch thực thi này nhằm loại bỏ nút kích hoạt tìm kiếm nhanh ("Tìm kiếm nhanh lô hàng... ⌘K") trên thanh Header của `DynamoShell` (`src/components/dynamo-shell.tsx`). Nút này hiện chiếm không gian đáng kể trên thanh điều hướng chính (chiếm toàn bộ 1 hàng trên mobile và 224px - 272px trên desktop), trong khi các trang tác nghiệp (như `/tracking`) đã được trang bị sẵn thanh lọc tìm kiếm chi tiết. Việc loại bỏ giúp giao diện Header gọn gàng, tăng không gian hiển thị cho các công cụ sản xuất trực tiếp (bộ lọc phân xưởng, đồng hồ LED thời gian thực, chế độ giả lập vai trò), đồng thời giữ lại phím tắt `⌘K` / `Ctrl+K` cho người dùng nâng cao.

## 1. Requirements & Constraints

- **REQ-001**: Xóa bỏ phần tử `<button>` kích hoạt Command Palette ("Tìm kiếm nhanh lô hàng...") tại Header của `src/components/dynamo-shell.tsx` (dòng 534 - 545).
- **REQ-002**: Dọn dẹp import `Search` từ thư viện `lucide-react` trong `src/components/dynamo-shell.tsx` để tránh cảnh báo biến không sử dụng (unused import).
- **REQ-003**: Duy trì hoạt động của phím tắt toàn cục `⌘K` / `Ctrl+K` và component `CommandPalette` trong DOM nền để người dùng thao tác nhanh không bị ảnh hưởng.
- **CON-001**: Giữ nguyên định nghĩa `search`, `setSearch`, và `filtered` trong `AppContextType` để bảo đảm tính tương thích với các component con đang tiêu thụ `useDynamo()` (`tracking.tsx`, `dashboard.tsx`, `shopfloor-telemetry.tsx`).
- **GUD-001**: Đảm bảo thanh Header duy trì khoảng cách (`gap`), căn lề linh hoạt (`mr-auto`) hài hòa trên mọi kích thước màn hình (Mobile < 640px, Tablet < 1024px, Desktop >= 1280px) sau khi gỡ nút.
- **PAT-001**: Giữ vững phong cách thiết kế giao diện điều hành sản xuất MES tinh gọn, rõ ràng theo tiêu chuẩn của hệ thống Dynamo MES.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Đánh giá chi tiết phạm vi ảnh hưởng và chuẩn bị môi trường thay đổi.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Rà soát cấu trúc Header và vị trí nút Quick Command Bar Trigger trong file `src/components/dynamo-shell.tsx` | ✅ | 2026-10-22 |
| TASK-002 | Kiểm tra toàn bộ tham chiếu của icon `Search` và state `search` trong `dynamo-shell.tsx` để xác nhận không gây tác dụng phụ | ✅ | 2026-10-22 |

### Implementation Phase 2

- GOAL-002: Thực hiện loại bỏ nút tìm kiếm và dọn dẹp mã nguồn trong DynamoShell.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | Xóa khối mã JSX của button Quick Command Bar Trigger (dòng 534-545) trong `src/components/dynamo-shell.tsx` | ✅ | 2026-10-22 |
| TASK-004 | Xóa bỏ import `Search` không còn sử dụng tại danh sách import `lucide-react` (dòng 14) trong `src/components/dynamo-shell.tsx` | ✅ | 2026-10-22 |
| TASK-005 | Kiểm tra và căn chỉnh lại các class Tailwind trên thẻ container `<div className="flex min-h-[58px] ...">` để đảm bảo bố cục các nút còn lại (Workshop Selector, LedClock, Theme/Sound Toggles) hiển thị cân đối | ✅ | 2026-10-22 |

### Implementation Phase 3

- GOAL-003: Xác thực chất lượng mã nguồn và kiểm thử giao diện người dùng.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Chạy lệnh kiểm tra cú pháp và kiểu dữ liệu TypeScript (`npm run build` hoặc lệnh build tương đương) | ✅ | 2026-10-22 |
| TASK-007 | Kiểm thử trực quan giao diện trên trình duyệt ở breakpoint mobile và desktop, xác nhận Header sạch sẽ và phím tắt ⌘K vẫn hoạt động | ✅ | 2026-10-22 |

## 3. Alternatives

- **ALT-001**: Xóa bỏ hoàn toàn component `CommandPalette` và hủy bỏ phím tắt `⌘K`. Bị loại bỏ vì `CommandPalette` vẫn mang lại giá trị tra cứu nhanh cho các chuyên viên quản lý vận hành khi dùng phím tắt trên máy tính.
- **ALT-002**: Thu nhỏ nút tìm kiếm thành một icon button đơn giản thay vì loại bỏ hẳn. Bị loại bỏ vì người dùng đã xác nhận nút tìm kiếm nhanh trên Header là dư thừa do trang con đã có bộ lọc riêng biệt.

## 4. Dependencies

- **DEP-001**: Thư viện `lucide-react` quản lý hệ thống icon giao diện.
- **DEP-002**: `@tanstack/react-router` quản lý định tuyến và component `CommandPalette`.

## 5. Files

- **FILE-001**: `src/components/dynamo-shell.tsx` - Thành phần khung bao quanh giao diện ứng dụng chứa thanh Header cần chỉnh sửa.

## 6. Testing

- **TEST-001**: Kiểm tra TypeScript typecheck và static analysis không phát sinh cảnh báo unused import hay lỗi biên dịch.
- **TEST-002**: Kiểm thử trực quan giao diện Header: không còn nút "Tìm kiếm nhanh lô hàng...", các thành phần còn lại (Logo, Phân xưởng, Đồng hồ LED, Nút âm thanh, Nút theme) dàn trải chuẩn xác trên cả màn hình nhỏ và màn hình lớn.

## 7. Risks & Assumptions

- **RISK-001**: Khoảng trống trên Header có thể rộng ra bất thường trên màn hình lớn nếu không có `mr-auto` giữ cho khối tiêu đề bên trái và các nút tiện ích bên phải tách rời hợp lý.
- **ASSUMPTION-001**: Người dùng chỉ muốn gỡ nút trigger hiển thị trên thanh Header, vẫn muốn giữ lại cơ chế lọc trong bảng của trang Tracking và khả năng mở Command Palette bằng phím tắt `⌘K` / `Ctrl+K`.

## 8. Related Specifications / Further Reading

- [dynamo-shell.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/components/dynamo-shell.tsx)
- [command-palette.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/components/command-palette.tsx)
- [tracking.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/tracking.tsx)
