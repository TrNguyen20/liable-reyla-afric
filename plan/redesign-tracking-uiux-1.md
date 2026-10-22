---
goal: Tái thiết kế UI/UX và Khắc phục lỗi Bảng dữ liệu Luân chuyển QT - Chặn giới hạn kéo cột theo nội dung, Đồng bộ hiển thị Sticky khi chọn hàng loạt
version: 1.0
date_created: 2026-10-22
last_updated: 2026-10-22
owner: Frontend Team & UX Lead
status: Completed
tags: ['refactor', 'ui', 'ux', 'tracking', 'table', 'debugger', 'frontend-design']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch này tập trung giải quyết triệt để 2 lỗi hiển thị nghiêm trọng và nâng cấp toàn diện trải nghiệm người dùng (UI/UX) trên trang Quản lý Luân chuyển QT (`/tracking`):
1. **Lỗi thanh kéo cột (Column Resizer) kéo quá mức sang trái**: Khi người dùng nắm kéo mép cột sang trái, hiện tại có thể bị kéo quá hẹp làm nội dung bị bung tràn, các cột sau bị dồn đè lấn lên cột trước gây vỡ bố cục bảng. Giải pháp: Thiết lập cơ chế chặn cứng bề rộng tối thiểu theo nội dung thực tế (`MIN_COL_WIDTHS` & content measurement) cho từng cột, đảm bảo không thể kéo hẹp hơn tiêu đề, nút lọc và dữ liệu hiển thị.
2. **Lỗi UI/UX cột đầu tiên khi chọn hàng loạt (Sticky Selection Bug)**: Khi chọn một hoặc nhiều hàng (hoặc chọn tất cả), thẻ `<tr>` được đổi màu nền highlight nhưng 2 cột ghim đầu tiên (`Checkbox` và `Mã lô`) bị đè màu tĩnh `bg-card`, tạo ra các mảng trắng/xám đứt đoạn. Đồng thời checkbox header chưa có trạng thái `indeterminate` (gạch ngang khi chọn một phần) và thiếu hiệu ứng đổ bóng phân tách ranh giới cột ghim khi cuộn ngang.
3. **Nâng cấp công thái học bảng dữ liệu (Data Grid Ergonomics)**: Tinh chỉnh đường dẫn hướng khi kéo (drag guideline), tooltip kích thước px, tổng hợp nhanh dữ liệu các lô đã chọn (Selected Sum/Kg) và hỗ trợ phím tắt `Esc` bỏ chọn mượt mà.

## 1. Requirements & Constraints

- **REQ-001**: Khắc phục triệt để lỗi cột bị đè lấn khi kéo sang trái bằng cách chặn giới hạn bề rộng tối thiểu (`minWidth`) tương ứng với nội dung thực tế của từng cột (`MIN_COL_WIDTHS`), ngăn tuyệt đối việc co nhỏ hơn tiêu đề và icon lọc.
- **REQ-002**: Đồng bộ màu nền cho 2 cột ghim cố định (`Checkbox` và `Mã lô`) khi hàng được chọn (`isSelected`), đảm bảo toàn bộ dòng hiển thị liền mạch đồng nhất (`bg-primary/15`), không còn mảng đứt gãy màu `bg-card`.
- **REQ-003**: Checkbox ở tiêu đề bảng (`thead`) phải hỗ trợ đầy đủ 3 trạng thái: Chưa chọn (unchecked), Chọn một phần (indeterminate - gạch ngang), và Đã chọn tất cả trên trang (checked).
- **REQ-004**: Bổ sung hiệu ứng bóng đổ mép phải (`elevation shadow`) và đường viền phân tách mượt mà trên cột ghim Mã lô, tạo chiều sâu thị giác rõ rệt khi cuộn ngang dữ liệu.
- **REQ-005**: Cung cấp cơ chế lưu trữ kích thước cột tự động vào `localStorage` (`'dynamo-tracking-col-widths'`), hỗ trợ Double-Click vào thanh nắm kéo để tự động phục hồi về kích thước tối ưu mặc định.
- **CON-001**: Bảo toàn nguyên vẹn tính năng Popover lọc và sắp xếp kiểu Google Sheets trên từng cột hiện có, không làm thay đổi logic lọc hay dữ liệu nghiệp vụ.
- **CON-002**: Đảm bảo tốc độ phản hồi kéo chuột đạt 60fps mượt mà, không quét DOM liên tục trong vòng lặp `mousemove` (tránh layout thrashing).
- **GUD-001**: Tuân thủ bảng màu chuẩn của Dynamo MES (xanh lá công nghiệp `#16a34a` / primary), typography số liệu rõ ràng (`font-mono tabular-nums`), trạng thái tương tác rõ rệt cho môi trường xưởng sản xuất.
- **PAT-001**: Áp dụng pattern phân tầng Stacking Context chuẩn (`thead` z-10, sticky cells z-20, header shell z-40, modal/drawer z-50).

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Chuẩn hóa cơ chế giới hạn kéo cột thông minh theo nội dung (Content-Aware Column Resizer).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Khai báo hằng số `MIN_COL_WIDTHS` và `DEFAULT_COL_WIDTHS` cho toàn bộ 16 cột trong `src/routes/tracking.tsx`, quy định ngưỡng tối thiểu chính xác theo độ dài tiêu đề + icon lọc + nội dung ô | ✅ | 2026-10-22 |
| TASK-002 | Cập nhật hàm `handleResizeStart` trong `src/routes/tracking.tsx`: áp dụng `Math.max(MIN_COL_WIDTHS[colKey], ...)` chặn cứng không cho phép kéo cột nhỏ hơn ngưỡng tối thiểu | ✅ | 2026-10-22 |
| TASK-003 | Bổ sung thanh Resizer Handle (`cursor-col-resize`) tại mép phải của toàn bộ các cột `th` với hiệu ứng hover trực quan và hỗ trợ Double-Click để khôi phục kích thước chuẩn | ✅ | 2026-10-22 |
| TASK-004 | Áp dụng cấu trúc `tableLayout: 'fixed'` kết hợp `<colgroup>` với thẻ `<col>` kiểm soát bề rộng pixel chuẩn xác, ngăn ngừa hoàn toàn tình trạng cột sau chồng đè lên cột trước | ✅ | 2026-10-22 |

### Implementation Phase 2

- GOAL-002: Khắc phục lỗi hiển thị Sticky Selection và nâng cấp trực quan cho các cột ghim cố định.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Cập nhật class màu nền động cho ô Checkbox (`td`) và ô Mã lô (`td`): chuyển từ `bg-card` tĩnh sang màu nền phụ thuộc trạng thái chọn `isSelected` (`bg-primary/15` và `group-hover:bg-primary/20`) | ✅ | 2026-10-22 |
| TASK-006 | Tích hợp thuộc tính `indeterminate` vào thẻ `<input type="checkbox">` ở `thead` thông qua `ref`, hiển thị biểu tượng gạch ngang chính xác khi người dùng chọn một phần danh sách | ✅ | 2026-10-22 |
| TASK-007 | Bổ sung hiệu ứng bóng đổ mép phải (`after:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)]` và `border-r border-border/80`) cho cột ghim Mã lô, tạo phân cách nổi bật khi cuộn ngang | ✅ | 2026-10-22 |
| TASK-008 | Gán tọa độ `left: colWidths.checkbox` động cho cột Mã lô, đảm bảo khi cột Checkbox thay đổi kích thước thì cột Mã lô vẫn bám khít tuyệt đối không bị đứt đoạn | ✅ | 2026-10-22 |

### Implementation Phase 3

- GOAL-003: Nâng cấp công thái học thao tác hàng loạt và tinh chỉnh thẩm mỹ UI/UX tổng thể.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Bổ sung thông tin tổng hợp nhanh trên thanh Floating Bulk Action Bar: hiển thị tổng số lượng (Sum Qty) và tổng khối lượng (Sum Kg) của các lô đang được chọn | ✅ | 2026-10-22 |
| TASK-010 | Bổ sung phím tắt bàn phím toàn cục `Escape` để hủy chọn nhanh toàn bộ hàng khi đang ở chế độ chọn hàng loạt | ✅ | 2026-10-22 |
| TASK-011 | Thêm nút "Khôi phục kích thước cột mặc định" (Reset Layout) trên thanh công cụ hỗ trợ người dùng đưa toàn bộ bảng về cấu hình ban đầu chỉ với 1 click | ✅ | 2026-10-22 |

### Implementation Phase 4

- GOAL-004: Xác thực toàn diện chất lượng UI/UX, kiểm thử giới hạn kéo cột và hành vi chọn hàng loạt.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Kiểm thử kéo cột sang trái hết mức ở tất cả 16 cột, xác nhận thanh kéo dừng chính xác tại mép nội dung và không còn hiện tượng cột sau chồng lên cột trước | ✅ | 2026-10-22 |
| TASK-013 | Kiểm thử chọn 1 hàng, nhiều hàng và chọn tất cả hàng trên trang: xác nhận 2 cột sticky đổi màu nền đồng bộ, checkbox header hiển thị đúng trạng thái gạch ngang (indeterminate) hoặc tích chọn (checked) | ✅ | 2026-10-22 |
| TASK-014 | Kiểm thử cuộn ngang bảng dữ liệu: xác nhận hiệu ứng đổ bóng ở mép cột ghim Mã lô phân tách mượt mà giữa dữ liệu ghim và dữ liệu cuộn | ✅ | 2026-10-22 |
| TASK-015 | Kiểm thử nút "Khôi phục kích thước cột mặc định" và phím tắt `Escape` để bỏ chọn hàng loạt | ✅ | 2026-10-22 |

## 3. Alternatives

- **ALT-001**: Tính toán động bằng cách quét DOM `scrollWidth` của toàn bộ các thẻ td trên mỗi lần chuột di chuyển (`mousemove`). *Lý do không chọn*: Quét DOM trong vòng lặp `mousemove` gây reflow/repaint liên tục (layout thrashing), làm tụt FPS khi kéo chuột. Phương án lập bảng chuẩn hóa ngưỡng `MIN_COL_WIDTHS` dựa trên phân tích đo đạc nội dung cho kết quả 60fps mượt mà và an toàn hơn.
- **ALT-002**: Bỏ tính năng cố định (sticky) của cột Checkbox và Mã lô để tránh xung đột z-index và màu nền. *Lý do không chọn*: Cột Mã lô và Checkbox ghim cố định là yêu cầu cốt lõi giúp người dùng nhà máy theo dõi thông tin chính xác khi cuộn ngang qua nhiều trường dữ liệu.

## 4. Dependencies

- **DEP-001**: `localStorage` của trình duyệt lưu trữ cấu hình `'dynamo-tracking-col-widths'`.
- **DEP-002**: React standard hooks (`useRef`, `useState`, `useEffect`, `useCallback`, `useMemo`).
- **DEP-003**: `lucide-react` icons (`RotateCcw`, `Check`, `Minus`, `Filter`, `Zap`, `Download`, `Printer`, `X`, v.v.).

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` (Triển khai logic chặn kéo cột theo nội dung, sửa lỗi sticky selection, checkbox indeterminate, hiệu ứng bóng đổ và nâng cấp floating bulk bar).
- **FILE-002**: `src/components/dynamo-shell.tsx` (Bảo toàn z-index z-40 để header luôn nằm trên bảng dữ liệu khi cuộn).

## 6. Testing

- **TEST-001**: Kiểm thử kéo hẹp cột: Nắm kéo resizer của từng cột sang trái với lực kéo mạnh nhất, xác nhận cột không bị co nhỏ hơn ngưỡng nội dung và không bị chồng đè lấn nhau.
- **TEST-002**: Kiểm thử chọn hàng loạt: Chọn 1 hàng, chọn 3 hàng ngẫu nhiên, bấm chọn tất cả trang -> xác nhận các ô Checkbox và Mã lô có màu nền xanh nhạt `bg-primary/15` đồng bộ hoàn toàn với thân dòng.
- **TEST-003**: Kiểm thử Checkbox Header: Khi chọn một vài hàng, checkbox ở tiêu đề phải hiện dấu gạch ngang (`indeterminate`). Khi chọn hết trang thì chuyển sang dấu tích (`checked`). Khi bấm vào thì toggle chọn/bỏ chọn toàn bộ.
- **TEST-004**: Kiểm thử cuộn ngang: Lăn chuột ngang sang phải, xác nhận đường phân cách và bóng đổ của cột Mã lô che phủ và phân biệt rõ ràng với các cột đang trượt phía sau.
- **TEST-005**: Kiểm thử phím `Escape`: Khi đang chọn 5 lô, nhấn phím `Escape` trên bàn phím -> xác nhận toàn bộ lựa chọn được hủy tức thì.

## 7. Risks & Assumptions

- **RISK-001**: Trên các màn hình có độ phân giải nhỏ (dưới 1280px), tổng các giá trị tối thiểu của 16 cột sẽ lớn hơn chiều rộng màn hình, đòi hỏi thanh cuộn ngang (`overflow-x-auto`) phải luôn hoạt động trơn tru.
- **ASSUMPTION-001**: Người dùng nhà máy ưu tiên việc đọc rõ ràng thông tin hơn là việc có thể ép nhỏ cột đến mức che mất nội dung.

## 8. Related Specifications / Further Reading

- [tracking.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/tracking.tsx)
- [dynamo-shell.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/components/dynamo-shell.tsx)
