---
goal: Nâng Cấp Thẩm Mỹ UI/UX & Công Thái Học Toàn Diện Hệ Thống Dynamo Vietnam QT - MES
version: 1.0
date_created: 2026-10-23
last_updated: 2026-10-23
owner: Frontend Taste Lead & UI/UX Specialist
status: Planned
tags: ['design', 'taste', 'ui', 'ux', 'tracking', 'sync', 'login', 'kpi', 'ergonomics']
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Kế hoạch này tiến hành đánh giá thẩm mỹ chuyên sâu theo tiêu chuẩn **/design-taste-frontend** (Anti-Slop, tinh giản chuẩn xưởng Nhật Bản Monozukuri) kết hợp **/redesign-existing-projects** nhằm nâng cấp toàn diện các điểm chạm giao diện (Touchpoints) trên cả 3 trang chính của hệ thống DYNAMO VIETNAM QT - MES:
1. **Trang Luân Chuyển QT (`/tracking`)**: Flagship Screen điều hành sản xuất nhiệt luyện & xi mạ.
2. **Trang Liên Kết Dữ Liệu (`/sync`)**: Trung tâm tích hợp và kiểm soát luồng đồng bộ hai chiều với Google Sheets.
3. **Trang Kiosk Xác Thực (`/login`)**: Cổng đăng nhập công nghiệp 2 bước với phân quyền mã hóa và bàn phím cảm ứng.

## 1. Requirements & Constraints

- **REQ-001**: Nâng cấp thanh tóm tắt KPI (`KPI Summary Line`) trên `/tracking` từ văn bản phẳng sang hệ thống thẻ vi mô (Micro-Metric Badges) chuẩn phòng điều độ: có đèn LED trạng thái, font số JetBrains Mono sắc nét và đường viền phân định rõ ràng.
- **REQ-002**: Bổ sung nút hành động tức thì `"Xóa tất cả tiêu chí lọc"` (Clear Filters CTA) trực tiếp ngay bên trong khối Trạng thái Rỗng (Empty Result State) khi không có lô hàng nào khớp bộ lọc, giúp người vận hành không phải cuộn ngược lên đầu bảng.
- **REQ-003**: Nâng cấp cụm phân trang dưới đáy bảng (`Pagination Bar`): tích hợp biểu tượng mũi tên định hướng (`ChevronLeft`, `ChevronRight`), bổ sung phím tắt trực quan `[Alt+←] / [Alt+→]` và làm nổi bật tổng số trang/dòng dữ liệu.
- **REQ-004**: Tinh chỉnh bảng điều khiển thao tác hàng loạt nổi (`Floating Bulk Action Bar`): phân tách trực quan nhóm hành động xử lý sản xuất (In phiếu A4, Đổi trạng thái, Duyệt QC) với nhóm hành động hủy chọn / xóa lọc, bổ sung hiệu ứng đệm kính mờ cao cấp (`backdrop-blur-xl`).
- **REQ-005**: Tối ưu hóa bảng xem trước dữ liệu nguồn (`Preview Staged Table`) trên trang `/sync`: đồng bộ chiều cao dòng, padding viền và thanh tay nắm kéo cột đồng nhất 100% với bảng `/tracking`.
- **CON-001**: Bảo toàn 100% logic nghiệp vụ hiện có: không làm xáo trộn các bộ lọc Google Sheets, cơ chế 1-Click Header Sort, tính năng Inline Quick-Edit và sự cách ly Stacking Context (`isolation: isolate`).
- **CON-002**: Tuyệt đối không đưa vào các hiệu ứng thừa thãi (AI-slop, gradient tím/hồng vô nghĩa, chuyển động lặp vô tận gây phân tâm kỹ sư vận hành máy).
- **GUD-001**: Tôn chỉ thiết kế **Monozukuri Precision**: Khắc sâu bản sắc công nghiệp cơ khí khuôn mẫu chính xác cao của DYNAMO VIỆT NAM — vững chãi, minh bạch, tối ưu tốc độ đọc lướt số liệu trong môi trường nhà xưởng.
- **PAT-001**: Hệ thống phông chữ chuẩn: `Be Vietnam Pro` (tiêu đề, nhãn, văn bản) kết hợp `JetBrains Mono` (mã lô `ID_Key`, số lượng, khối lượng kg, đơn hàng PO, thời gian đồng hồ LED).

## 2. Implementation Steps

### Implementation Phase 1: Nâng Cấp Flagship Table & KPI Micro-Cards Trên `/tracking`

- GOAL-001: Nâng tầm visual hierarchy cụm chỉ số KPI và trạng thái rỗng của bảng luân chuyển QT.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Tái thiết kế cụm KPI summary line tại dòng 1282-1311 trong `src/routes/tracking.tsx`: chuyển thành các thẻ micro-badge có viền `border-border/70`, đèn tín hiệu LED xanh, và hiển thị khối lượng kg nổi bật | [x] | 2026-10-23 |
| TASK-002 | Nâng cấp Empty State tại dòng 2908-2915 trong `src/routes/tracking.tsx`: bổ sung nút bấm nhanh `"Xóa bộ lọc & Tải lại toàn bộ"` trực tiếp trong thông báo khi bộ lọc trả về 0 kết quả | [x] | 2026-10-23 |
| TASK-003 | Nâng cấp cụm phân trang tại dòng 2920-2975 trong `src/routes/tracking.tsx`: tích hợp icon `ChevronLeft`, `ChevronRight`, bổ sung tooltip chỉ dẫn phím tắt bàn phím và làm nổi bật nhãn số trang hiện tại | [x] | 2026-10-23 |

### Implementation Phase 2: Trau Chuốt Floating Bulk Action Bar & Drawer Chi Tiết

- GOAL-002: Nâng cấp trải nghiệm tương tác hàng loạt và phiếu chi tiết lô hàng.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Tinh chỉnh thanh Bulk Action Bar tại dòng 2978-3040 trong `src/routes/tracking.tsx`: phân nhóm nút bấm với vạch ngăn divider mờ, bổ sung phím tắt Esc để hủy chọn nhanh, gia tăng độ bóng đổ `shadow-2xl` | [x] | 2026-10-23 |
| TASK-005 | Rà soát Drawer chi tiết lô hàng (`detailLot` modal): kiểm tra tính đồng bộ màu sắc mác thép, độ cứng, định dạng tiền tệ và lịch sử audit log | [x] | 2026-10-23 |

### Implementation Phase 3: Đồng Bộ Thẩm Mỹ Trang Liên Kết Dữ Liệu `/sync`

- GOAL-003: Tối ưu hóa giao diện trang cấu hình Google Sheets và kiểm định luồng dữ liệu.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Nâng cấp bảng xem trước (`previewCols table`) trong `src/routes/sync.tsx`: đồng bộ chiều cao dòng `h-9`, font mono cho mã lô và nhãn phân xưởng giống chuẩn `/tracking` | | |
| TASK-007 | Tinh chỉnh thanh Telemetry trạng thái mạng và độ trễ latency (`latencyMs`) trong `src/routes/sync.tsx`: bổ sung hiệu ứng nhịp tim xanh khi kết nối ổn định (<300ms) và vàng/đỏ khi suy giảm tín hiệu | | |

## 3. Alternatives

- **ALT-001**: Thiết kế lại toàn bộ bảng theo phong cách Dashboard đa thẻ nổi (SaaS Card Kit). *Lý do loại bỏ*: Đây là giao diện vận hành nhà máy cơ khí chính xác; kỹ sư cần mật độ thông tin cao (High Visual Density) dạng lưới bảng tính để đối soát hàng chục thông số cùng lúc thay vì các thẻ lớn chiếm chỗ.
- **ALT-002**: Sử dụng biểu đồ tròn/cột màu mè (Chart overload). *Lý do loại bỏ*: Gây chậm tốc độ tải và phân tán sự chú ý vào các số liệu cần can thiệp khẩn cấp (Lô quá hạn, QC lỗi).

## 4. Dependencies

- **DEP-001**: Lucide React Icons (`ChevronLeft`, `ChevronRight`, `RotateCcw`, `Sparkles`, `ShieldCheck`).
- **DEP-002**: Tailwind CSS v4 & OKLCH Theme tokens (`bg-card`, `bg-secondary`, `bg-primary`, `border-border`).
- **DEP-003**: Sonner toast library & audio cue system.

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` (KPI Micro-Badges, Empty State Clear Button, Pagination Icons, Bulk Action Polish).
- **FILE-002**: `src/routes/sync.tsx` (Bảng xem trước dữ liệu Google Sheets, Telemetry Health Bar).
- **FILE-003**: `plan/design-frontend-taste-upgrade-1.md` (Tài liệu kế hoạch thực thi).

## 6. Testing

- **TEST-001**: Mở `/tracking`, áp dụng bộ lọc không khớp (ví dụ tìm kiếm mã lô không tồn tại): xác nhận thông báo rỗng hiện ra kèm nút `"Xóa tiêu chí lọc"`; bấm nút và xác nhận bảng lập tức khôi phục đầy đủ dữ liệu.
- **TEST-002**: Kiểm tra cụm KPI summary: xác nhận số lượng lô, khối lượng kg và danh sách phân xưởng hiển thị sắc nét dưới dạng micro-badges chuyên nghiệp.
- **TEST-003**: Chọn thử 3 lô hàng bằng checkbox: xác nhận thanh Bulk Action Bar xuất hiện mượt mà ở đáy màn hình với phân vùng nút bấm rõ ràng.
- **TEST-004**: Mở trang `/sync`: xác nhận thanh Telemetry độ trễ mạng và bảng xem trước hiển thị đồng bộ chuẩn mực.

## 7. Risks & Assumptions

- **RISK-001**: Tinh chỉnh các nút trong Empty State không được ảnh hưởng đến hàm reset lọc `resetAllFilters()`. *Biện pháp*: Tái sử dụng trực tiếp hàm `resetAllFilters()` sẵn có.
- **ASSUMPTION-001**: Người dùng sử dụng độ phân giải màn hình từ Laptop 13" (1366x768) đến màn hình giám sát xưởng 24" (1920x1080).

## 8. Related Specifications / Further Reading

- [tracking.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/tracking.tsx)
- [sync.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/sync.tsx)
- [plan/refactor-tracking-table-grid-2.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/refactor-tracking-table-grid-2.md)
