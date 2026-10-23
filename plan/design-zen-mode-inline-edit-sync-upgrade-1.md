---
goal: Nâng Cấp Zen Focus Mode (Tách Phím Esc), Tinh Gọn Inline Quick-Edit & Đồng Bộ Công Thái Học Trang /sync
version: 1.0
date_created: 2026-10-23
last_updated: 2026-10-23
owner: Frontend Taste Lead & UI/UX Specialist
status: Completed
tags: ['design', 'taste', 'zen-mode', 'inline-edit', 'sync', 'ergonomics', 'anti-slop']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch này kết hợp các nguyên lý từ **/design-taste-frontend** (loại bỏ chi tiết thừa thãi, tôn trọng không gian làm việc của thợ kỹ thuật), **/redesign-existing-projects** (nâng cấp trực diện các điểm nghẽn UX mà không làm xáo trộn luồng nghiệp vụ) và **/frontend-design** (thiết kế có chủ đích cho môi trường điều độ công nghiệp nhà máy) nhằm giải quyết 3 bài toán trọng tâm:

1. **Tách biệt hoàn toàn phím `Esc` khỏi Zen Focus Mode**: Khi kỹ sư đang đúp chuột để chỉnh sửa ô (Inline Edit) hoặc mở menu lọc, thao tác nhấn `Esc` là phản xạ tự nhiên để **hủy sửa ô hoặc đóng menu**; việc `Esc` kích hoạt thoát toàn bộ màn hình Zen Focus Mode gây gián đoạn công việc nghiêm trọng. Zen Focus Mode từ nay sẽ chỉ bật/tắt bằng phím tắt **`Alt+F`** hoặc nút bấm **"Thu nhỏ / Toàn màn hình"**, bảo toàn sự tập trung 100%.
2. **Tinh gọn ô Inline Quick-Edit (Loại bỏ nút Check & X chiếm diện tích)**: Hiện tại khi kích hoạt sửa ô, hệ thống render thêm 2 nút icon `Lưu (Enter)` và `Hủy (Esc)` bên trong ô bảng. Với các cột có độ rộng hẹp (85px - 130px), hai nút này nuốt trọn không gian, làm co quắp trường input chỉ còn 20-30px gây mất chữ. Thay vào đó, ô input sẽ mở rộng 100% diện tích ô theo chuẩn spreadsheet (Google Sheets / Excel): tự động lưu khi bấm `Enter`, `Tab` hoặc click ra ngoài (`onBlur`), và hủy bỏ khi bấm `Esc`.
3. **Chuẩn hóa công thái học trang `/sync` (Google Sheets Sync)**: Áp dụng cùng tiêu chuẩn Monozukuri như trang `/tracking`: loại bỏ component `PageHeading` trùng lặp gây lãng phí chiều cao, tinh gọn thanh Telemetry thành Live Health Ribbon tích hợp các nút vi điều khiển, và co giãn bố cục bảng preview gọn gàng trên Desktop.

## 1. Requirements & Constraints

- **REQ-001**: Gỡ bỏ phím `Esc` khỏi việc thoát chế độ Zen Focus Mode trong `src/routes/tracking.tsx`. Chế độ Zen Focus Mode duy nhất chỉ được bật/tắt thông qua phím tắt `Alt+F` hoặc nút bấm chuyên dụng trên thanh công cụ.
- **REQ-002**: Khi người dùng đang ở chế độ Inline Edit (`editingCell !== null`), phím `Esc` chỉ thực hiện duy nhất nhiệm vụ hủy sửa ô hiện tại (`setEditingCell(null)`) và giữ nguyên 100% khung nhìn Zen Focus Mode.
- **REQ-003**: Khi trình duyệt phát sinh sự kiện `fullscreenchange` do người dùng nhấn giữ Esc của trình duyệt, ứng dụng vẫn duy trì cờ `isTableFullscreen = true` ở chế độ CSS Zen Mode, không làm mất khung nhìn toàn màn hình bên trong tab làm việc.
- **REQ-004**: Tái cấu trúc các ô Inline Quick-Edit trên bảng `/tracking`: Loại bỏ hoàn toàn 2 nút bấm Check và X trong tất cả các ô đang sửa (`ngay_gui_QT`, `han_tra`, `so_luong`, `kg_Lot`, `ma_hang`, `cty_QT`, `vat_lieu`, `do_cung`).
- **REQ-005**: Thiết lập trường input/select trong ô edit chiếm trọn 100% chiều rộng của cell (`w-full h-7 rounded px-2 text-xs font-mono outline-none ring-2 ring-primary bg-background shadow-xs`), hỗ trợ tự động lưu khi `onBlur`, phím `Enter` (lưu và xuống dòng dưới), `Tab` (lưu và sang cột tiếp), `Esc` (hủy thay đổi).
- **REQ-006**: Loại bỏ component `<PageHeading ... />` trùng lặp trong thẻ `<main>` của trang `src/routes/sync.tsx`, giải phóng ~90px không gian dọc trên màn hình desktop.
- **REQ-007**: Chuyển đổi các thông số Cache (`Nguồn hoạt động`, `Số lô`, `Dung lượng Cache`) và nút `"Làm mới Cache"` trong PageHeading cũ thành thanh điều khiển vi mô tích hợp vào Live Health Ribbon của trang `/sync`.
- **REQ-008**: Tối ưu bố cục 2 cột (Cấu hình link Sheets + Phân tích Schema) và bảng Xem trước (Preview Table) trên trang `/sync` để vừa vặn, không sinh ra khoảng trắng thừa thãi trên màn hình máy tính bàn.
- **CON-001**: Bảo toàn 100% dữ liệu gốc và các hàm nghiệp vụ: `saveInlineEdit`, `applyDataset`, `resetDataset`, `syncSheet`, `WebhookConfig`.
- **CON-002**: Đảm bảo trải nghiệm responsive: Trên mobile và tablet (< lg), trang `/sync` và `/tracking` vẫn giữ luồng cuộn dọc tự nhiên.
- **GUD-001**: Tôn chỉ thiết kế **Spreadsheet Precision**: Mọi thao tác chỉnh sửa ô trên bảng phải nhanh như chớp, không cản trở tầm nhìn, dùng bàn phím làm phương tiện điều khiển chính.
- **PAT-001**: Chuẩn bàn phím Inline Grid: `Enter` = Lưu & dòng tiếp; `Tab` = Lưu & cột tiếp; `Shift+Enter` / `Shift+Tab` = Lưu & lùi; `Esc` = Hủy & giữ nguyên giá trị cũ; `Blur` = Tự động lưu giá trị đã nhập.

## 2. Implementation Steps

### Implementation Phase 1: Tách Biệt Phím Esc & Khóa Trọng Tâm Zen Focus Mode

- GOAL-001: Khóa chặt chế độ Zen Focus Mode chỉ chuyển đổi bằng `Alt+F` hoặc nút bấm; trả lại phím `Esc` cho việc hủy sửa ô và đóng popup.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Cập nhật `handleKeyDown` và `handleCellKeyDown` trong `src/routes/tracking.tsx`: Bỏ việc bắt phím `Esc` để thoát `isTableFullscreen`. Đảm bảo phím `Esc` chỉ gọi `setEditingCell(null)` để đóng ô đang sửa | [x] | 2026-10-23 |
| TASK-002 | Điều chỉnh bộ lắng nghe `fullscreenchange` trong `src/routes/tracking.tsx`: Khi trình duyệt thoát native fullscreen do Esc của trình duyệt, giữ nguyên trạng thái CSS Zen Mode `isTableFullscreen = true`, chỉ thoát khi người dùng bấm `Alt+F` hoặc click nút "Thu nhỏ" | [x] | 2026-10-23 |
| TASK-003 | Cập nhật tooltip và nhãn phím tắt của nút Toàn màn hình/Thu nhỏ trên KPI toolbar: Hiển thị hướng dẫn `[Alt+F: Bật/Tắt Toàn màn hình]` trực quan và rõ ràng | [x] | 2026-10-23 |

### Implementation Phase 2: Tinh Gọn Giao Diện Inline Quick-Edit (Xóa Nút Check/X Chiếm Chỗ)

- GOAL-002: Giải phóng 100% diện tích ô nhập liệu trong bảng, loại bỏ các nút Check/X rườm rà, áp dụng cơ chế tự động lưu theo chuẩn Google Sheets / Excel.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Rà soát và gỡ bỏ cụm nút Check (`Lưu`) và X (`Hủy`) khỏi tất cả các khối inline edit trong `src/routes/tracking.tsx` (áp dụng cho cột mã hàng, vật liệu, độ cứng, số lượng, khối lượng, vendor, ngày gửi, hạn trả) | [x] | 2026-10-23 |
| TASK-005 | Cấu hình ô input/select trong trạng thái edit thành `w-full h-7 rounded px-2 font-mono text-xs ring-2 ring-primary bg-background shadow-xs text-foreground outline-none` giúp hiển thị đầy đủ chuỗi ký tự mà không bị cắt xén | [x] | 2026-10-23 |
| TASK-006 | Bổ sung sự kiện `onBlur={() => saveInlineEdit(r)}` trên tất cả các thẻ input/select inline edit để kỹ sư chỉ cần click chuột ra ngoài là dữ liệu tự động lưu an toàn | [x] | 2026-10-23 |

### Implementation Phase 3: Chuẩn Hóa Công Thái Học & Tinh Gọn Giao Diện Trang /sync

- GOAL-003: Đồng bộ trang `/sync` theo phong cách Monozukuri Precision: loại bỏ tiêu đề lặp lại, tích hợp thanh Live Health Ribbon và tối ưu bố cục co giãn trên desktop.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Xóa bỏ component `<PageHeading>` tại dòng 145-179 trong `src/routes/sync.tsx` nhằm loại bỏ sự lặp lại của tiêu đề "LIÊN KẾT GOOGLE SHEETS" | [x] | 2026-10-23 |
| TASK-008 | Tích hợp badge thông số nguồn dữ liệu (`sourceLabel`, `dataset.length`, `cacheSizeMb`) và nút `"Làm mới Cache"` vào thanh Live Health Telemetry Bar trong `src/routes/sync.tsx`, tạo thành một Live Health Ribbon tinh gọn và chuyên nghiệp | [x] | 2026-10-23 |
| TASK-009 | Tối ưu bố cục lưới 2 cột và bảng xem trước (Preview Table) trong `src/routes/sync.tsx`: Giảm bớt các khoảng đệm thừa (`p-6` -> `p-4 sm:p-5`), khóa chiều cao cuộn cố định cho bảng preview (`max-h-[360px] overflow-auto`), giúp giao diện hiển thị trọn vẹn và vừa vặn trên desktop | [x] | 2026-10-23 |

## 3. Alternatives

- **ALT-001**: Giữ nút Check và X nhưng thu nhỏ icon xuống 8px. *Lý do loại bỏ*: Vẫn gây chật chội và làm co ngắn thẻ input trong các cột 85px (như số lượng, kg). Thói quen của người dùng bảng tính là gõ và ấn Enter hoặc click ô khác để lưu.
- **ALT-002**: Dùng popup popover nổi lên trên ô để chứa nút Lưu/Hủy. *Lý do loại bỏ*: Gây che khuất các dòng lân cận, làm chậm nhịp thao tác nạp dữ liệu liên tục của kỹ sư xưởng.

## 4. Dependencies

- **DEP-001**: `lucide-react` icons (`Maximize2`, `Minimize2`, `RotateCcw`, `DatabaseZap`, `Radio`, `Activity`, `Clock`, `Layers`).
- **DEP-002**: Web Audio Cues (`playAudioCue('pop')`, `playAudioCue('success')`).

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` (Tách biệt Esc khỏi Zen Mode, loại bỏ nút Check/X trong inline edit, bổ sung onBlur tự lưu).
- **FILE-002**: `src/routes/sync.tsx` (Xóa PageHeading trùng lặp, nâng cấp Live Health Ribbon, tối ưu bố cục desktop).
- **FILE-003**: `plan/design-zen-mode-inline-edit-sync-upgrade-1.md` (Tài liệu kế hoạch thực thi).

## 6. Testing

- **TEST-001**: Kích hoạt Zen Focus Mode (`Alt+F`), sau đó đúp chuột vào một ô bất kỳ để sửa; bấm `Esc`: Xác nhận chỉ hủy sửa ô và đóng ô nhập, giao diện VẪN Ở TRONG CHẾ ĐỘ ZEN FOCUS MODE.
- **TEST-002**: Trong Zen Focus Mode, bấm `Alt+F` hoặc click nút "Thu nhỏ": Xác nhận thoát khỏi Focus Mode mượt mà.
- **TEST-003**: Trong bảng `/tracking`, đúp chuột vào ô ngày gửi hoặc số lượng: Xác nhận ô input phủ kín 100% bề ngang ô, không còn 2 nút Check và X chiếm chỗ.
- **TEST-004**: Nhập giá trị mới vào ô rồi click chuột ra vùng khác trên bảng (blur): Xác nhận giá trị mới được tự động lưu và có hiệu ứng flash highlight xanh thành công.
- **TEST-005**: Mở trang `/sync` trên desktop: Xác nhận không còn xuất hiện khối `PageHeading` trùng lặp, thanh thông số Live Health hiển thị đầy đủ và bảng preview mẫu co giãn mượt mà.

## 7. Risks & Assumptions

- **RISK-001**: Người dùng nhập sai dữ liệu rồi click chuột ra ngoài khiến giá trị sai bị tự động lưu. *Biện pháp*: Giữ nguyên phím `Esc` để hủy trước khi blur; nếu đã lỡ lưu, cơ chế Audit Trail cho phép xem lại lịch sử thay đổi ngay lập tức.
- **ASSUMPTION-001**: Người thao tác trên hệ thống MES quen thuộc với luồng phím tắt spreadsheet tiêu chuẩn (`Enter` lưu, `Esc` hủy).

## 8. Related Specifications / Further Reading

- [src/routes/tracking.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/tracking.tsx)
- [src/routes/sync.tsx](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/src/routes/sync.tsx)
- [plan/design-desktop-viewport-fullscreen-1.md](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/plan/design-desktop-viewport-fullscreen-1.md)
