---
goal: Tái thiết kế UI/UX Bảng Luân chuyển QT - Sửa lỗi Sticky Thead, Chống xuyên thấu nội dung khi Hover, Giãn cách cột QC và Tối ưu 1-Click Header Sort
version: 2.0
date_created: 2026-10-22
last_updated: 2026-10-22
owner: Frontend Team & UX Lead
status: Completed
tags: ['refactor', 'ui', 'ux', 'tracking', 'table', 'debugger', 'frontend-design']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch này giải quyết triệt để 5 vấn đề cốt lõi về giao diện và hiệu năng tương tác trên bảng dữ liệu trang Quản lý Luân chuyển QT (`/tracking`):
1. **Lỗi biến mất ô MÃ LÔ ở thead khi cuộn dọc**: Do thẻ `th` Mã lô thiết lập `position: sticky; left: ...` nhưng thiếu `top: 0`, dẫn đến việc ô này chỉ bám dính theo chiều ngang mà bị cuộn trôi mất theo chiều dọc.
2. **Lỗi underlap/xuyên thấu nội dung khi hover cuộn ngang**: Do màu nền khi hover và select sử dụng độ trong suốt `bg-accent/30` và `bg-primary/15`, khiến dữ liệu các cột trượt bên dưới (`ĐƠN HÀNG`, `XƯỞNG`) bị nhìn xuyên thấu qua cột `MÃ LÔ`. Giải pháp: Ứng dụng kiến trúc nền đục 100% `bg-card` nguyên khối kết hợp lớp phủ giả lập `before:inset-0` cách ly triệt để.
3. **Cột QC và NGÀY GỬI quá sát nhau**: Bề rộng tối thiểu cũ của QC (`110px`) quá hẹp so với chuỗi văn bản của dropdown "Chưa kiểm tra" kèm padding, làm dồn sát vách sang cột NGÀY GỬI. Giải pháp: Mở rộng `qc` lên `130px - 140px` tạo nhịp thở thoáng đãng.
4. **Khoảng hở giữa các cột khi thu nhỏ hết cỡ không đồng đều**: Bảng hằng số `MIN_COL_WIDTHS` cũ phân bổ thông số chưa cân đối. Giải pháp: Tái đo đạc và chuẩn hóa toàn bộ 16 cột với biên đệm đối xứng chuẩn `~12px - 14px`.
5. **Cải tiến hiệu suất sắp xếp (1-Click Header Sort)**: Bấm trực tiếp vào tiêu đề cột để đảo chiều sắp xếp (None → Asc → Desc → None) tức thì mà không cần phải mở popover lọc, đồng thời giữ nút Phễu chuyên trách mở bộ lọc chi tiết.

## 1. Requirements & Constraints

- **REQ-001**: Khắc phục dứt điểm lỗi mất tiêu đề MÃ LÔ khi cuộn dọc bảng bằng cách bổ sung `top-0` và nâng cấp tầng hiển thị `z-30` cho toàn bộ các ô `th` cố định (`Checkbox` và `MÃ LÔ`).
- **REQ-002**: Triệt tiêu hoàn toàn hiện tượng xuyên thấu chữ (underlap) của các cột cuộn bên dưới qua cột ghim `MÃ LÔ` bằng cách khóa cứng nền đục 100% `bg-card` và tạo lớp phủ màu `before:absolute before:inset-0`.
- **REQ-003**: Nới rộng bề rộng mặc định và bề rộng tối thiểu của cột `qc` (Default: 140px, Min: 130px), đảm bảo nhãn trạng thái và dropdown có khoảng đệm tối thiểu 15px so với cột `NGÀY GỬI`.
- **REQ-004**: Cân chỉnh lại bộ hằng số `MIN_COL_WIDTHS` và `DEFAULT_COL_WIDTHS` cho toàn bộ 16 cột, đảm bảo nhịp khoảng cách padding khi co hẹp hết cỡ đồng đều trên mọi trường thông tin.
- **REQ-005**: Hỗ trợ tương tác 1-Click Sort trực tiếp khi click vào vùng tiêu đề cột trong `thead` với mũi tên chỉ hướng trực quan, giữ nút Phễu lọc độc lập với `e.stopPropagation()`.
- **CON-001**: Bảo toàn đầy đủ các tính năng lọc nâng cao hiện có (tìm kiếm chuỗi, checkbox đa chọn, khoảng ngày, lọc rỗng).
- **CON-002**: Không làm tăng bundle size, tuân thủ bảng màu chuẩn Dynamo MES và giữ tốc độ cuộn mượt mà 60fps.
- **GUD-001**: Tôn trọng nguyên tắc thiết kế công thái học: thông tin nhận diện (Mã lô) phải luôn neo giữ chắc chắn, không bị xáo trộn thị giác khi di chuột hoặc cuộn ngang/dọc.
- **PAT-001**: Stacking Context phân cấp chuẩn: `thead non-sticky th` z-10, `tbody sticky td` z-20, `thead sticky th` z-30, `popover/dropdown` z-50.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Khắc phục lỗi hiển thị Sticky Thead và triệt tiêu lỗi underlap chữ khi cuộn ngang.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Cập nhật thẻ `th` Checkbox và `HeaderFilterCell` Mã lô trong `src/routes/tracking.tsx`: bổ sung `sticky top-0 z-30 bg-secondary`, đảm bảo tiêu đề cố định tuyệt đối cả 2 chiều ngang và dọc khi cuộn | ✅ | 2026-10-22 |
| TASK-002 | Nâng cấp cấu trúc nền của các ô `td` ghim cố định (`Checkbox` và `Mã lô`) trong `src/routes/tracking.tsx`: gán nền cứng `bg-card` 100% đục kèm lớp phủ `before:absolute before:inset-0` cho trạng thái hover/selected, ngăn triệt để chữ cột sau nhìn xuyên thấu | ✅ | 2026-10-22 |

### Implementation Phase 2

- GOAL-002: Tái cân chuẩn nhịp khoảng cách 16 cột và giãn cách vùng tiếp giáp QC - Ngày gửi.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-003 | Cập nhật hằng số `DEFAULT_COL_WIDTHS` và `MIN_COL_WIDTHS` trong `src/routes/tracking.tsx`: nâng `qc` lên 140px/130px, `ngay_gui_QT` lên 125px/115px, cân chỉnh lại các cột `phong_sx`, `ma_hang`, `so_luong`, `kg_Lot` cho biên đệm ~12px đồng đều | ✅ | 2026-10-22 |
| TASK-004 | Tinh chỉnh padding và khoảng cách hiển thị của dropdown QC và ô Ngày gửi trong `tbody`, đảm bảo khoảng hở thoáng đãng không dính sát viền | ✅ | 2026-10-22 |

### Implementation Phase 3

- GOAL-003: Triển khai cơ chế 1-Click Header Sort và tối ưu hóa phân quyền tương tác `thead`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Mở rộng component `HeaderFilterCell` trong `src/routes/tracking.tsx`: bổ sung prop `onDirectSort`, gắn sự kiện click vào vùng tiêu đề cột để đảo chiều sắp xếp (None → Asc → Desc → None) | ✅ | 2026-10-22 |
| TASK-006 | Bổ sung biểu tượng chỉ báo hướng sắp xếp (`ArrowUp`, `ArrowDown`, `ArrowUpDown` khi hover) trực tiếp ngay cạnh chữ tiêu đề trong `HeaderFilterCell` | ✅ | 2026-10-22 |
| TASK-007 | Tách biệt hoàn toàn nút Phễu lọc với `e.stopPropagation()`, đảm bảo bấm vào icon lọc chỉ mở popover mà không kích hoạt đảo chiều sắp xếp cột | ✅ | 2026-10-22 |

### Implementation Phase 4

- GOAL-004: Xác thực toàn diện chất lượng UI/UX, kiểm thử cuộn 2 chiều và công thái học thao tác.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Kiểm thử cuộn dọc: xác nhận tiêu đề MÃ LÔ và Checkbox luôn ghim chặt ở hàng đầu bảng dữ liệu, không bị biến mất hay trôi mất | ✅ | 2026-10-22 |
| TASK-009 | Kiểm thử cuộn ngang và di chuột: xác nhận khi hover vào dòng bất kỳ và cuộn sang phải, văn bản cột Đơn hàng và Xưởng bị che khuất 100% phía sau cột Mã lô, không còn hiện tượng underlap | ✅ | 2026-10-22 |
| TASK-010 | Kiểm thử khoảng cách QC - Ngày gửi và kiểm tra độ rộng tối thiểu của tất cả 16 cột khi thu hẹp hết cỡ | ✅ | 2026-10-22 |
| TASK-011 | Kiểm thử 1-Click Sort trên các cột `Mã lô`, `Đơn hàng`, `Mã hàng`, `SL`, `Kg`, `QC`, `Ngày gửi`, `Hạn trả` | ✅ | 2026-10-22 |

## 3. Alternatives

- **ALT-001**: Dùng thư viện ngoài như AG-Grid hoặc TanStack Table full virtualizer. *Lý do không chọn*: Dự án đang vận hành hệ thống state quản lý nghiệp vụ gia công QT hoàn chỉnh, việc tích hợp thư viện bảng mới sẽ làm xáo trộn cấu trúc và tốn thời gian kiểm thử hồi quy.
- **ALT-002**: Sử dụng thuộc tính CSS `backdrop-filter: blur(8px)` cho cột ghim. *Lý do không chọn*: Hiệu ứng làm mờ vẫn để lộ bóng chữ cuộn bên dưới và gây sụt giảm FPS đáng kể khi cuộn bảng trên các thiết bị máy tính bảng xưởng.

## 4. Dependencies

- **DEP-001**: Lucide icons (`ArrowUp`, `ArrowDown`, `ArrowUpDown`, `Filter`, `RotateCcw`, `Check`).
- **DEP-002**: Tailwind CSS token system (`bg-card`, `bg-secondary`, `bg-primary/15`, `shadow-xs`).
- **DEP-003**: LocalStorage key `'dynamo-tracking-col-widths'` để duy trì trạng thái kích thước tùy biến của người dùng.

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` (Triển khai sửa `sticky top-0`, chống underlap opaque, 1-Click Sort, và cân chuẩn `MIN_COL_WIDTHS`).
- **FILE-002**: `plan/refactor-tracking-table-grid-2.md` (Tài liệu kế hoạch thực thi).

## 6. Testing

- **TEST-001**: Cuộn dọc xuống 50 dòng, xác nhận tiêu đề MÃ LÔ hiển thị rõ ràng trên nền xám nhẹ `bg-secondary`.
- **TEST-002**: Di chuột qua dòng 2, cuộn ngang sang phải: xác nhận mã lô `Q2610196611` hiển thị sắc nét trên nền trắng/tối đục hoàn toàn, không có chữ `20261019-0948-P` hay `PIN` in đè bên dưới.
- **TEST-003**: Quan sát cột QC và Ngày gửi: xác nhận khoảng cách giữa 2 cột có độ hở tối thiểu 15px, các lựa chọn dropdown hiển thị trọn vẹn.
- **TEST-004**: Bấm 1 click vào chữ "ĐƠN HÀNG" trong `thead`: xác nhận bảng lập tức sắp xếp A→Z và hiện mũi tên hướng lên; bấm tiếp lần 2: sắp xếp Z→A và hiện mũi tên hướng xuống; bấm tiếp lần 3: khôi phục thứ tự mặc định.
- **TEST-005**: Bấm vào icon Phễu ở cột "ĐƠN HÀNG": xác nhận chỉ mở Popover lọc mà không làm thay đổi trạng thái sắp xếp.

## 7. Risks & Assumptions

- **RISK-001**: Việc thêm `onDirectSort` có thể bị xung đột sự kiện kéo cột nếu người dùng click nhầm vào resizer handle. *Phòng ngừa*: Resizer handle có vùng click độc lập và gọi `e.stopPropagation()`.
- **ASSUMPTION-001**: Thao tác 1-Click Sort trực tiếp vào header là chuẩn công thái học quen thuộc với toàn bộ nhân sự vận hành nhà máy.

## 8. Related Specifications / Further Reading

- [tracking.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/tracking.tsx)
- [plan/redesign-tracking-uiux-1.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/redesign-tracking-uiux-1.md)
