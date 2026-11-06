# HANDOFF REPORT — Shell, Navigation, Login & Common UI Components
## Tiêu Chuẩn Hóa Tam Ngữ [VI] [EN] [JA] — DYNAMO MES v2.3

- **Tác nhân chuyển giao**: `teamwork_explorer` (explorer_shell)
- **Tác nhân nhận bàn giao**: `orchestrator_1` / Lead Agent (`934eddce-648a-4237-a754-5951df6a9240`)
- **Tài liệu khảo sát chi tiết kèm theo**: `.agents/teamwork/explorer_shell/survey.md`
- **Thời gian**: 2026-11-06T02:12:00Z
- **Loại bàn giao**: **Hard Handoff** (Nhiệm vụ khảo sát hoàn thành 100%)

---

### 1. OBSERVATION (Quan sát thực tế & Dẫn chứng cụ thể)

1. **Khung vỏ hệ thống & Header Navigation (`src/components/dynamo-shell.tsx`)**:
   - Dòng 35: Đã import `useTranslation, type Locale` từ `@/i18n`.
   - Dòng 79-82: Mảng `nav` chứa `labelKey` (`nav.tracking`, `nav.dashboard`, `nav.orders`, `nav.sync`) và `label` tĩnh (`LUÂN CHUYỂN`, `TỔNG QUAN`, `ĐƠN ĐẶT HÀNG`, `ĐỒNG BỘ`). Thuộc tính `label` được kiểm thử tại `src/test/i18n-and-header.test.ts:21-22` (`expect(shellSrc).toContain("label: 'LUÂN CHUYỂN'")`).
   - Dòng 505: Banner offline hiển thị chuỗi tĩnh `"MẤT KẾT NỐI MẠNG NHÀ MÁY · ĐANG HOẠT ĐỘNG Ở CHẾ ĐỘ NGOẠI TUYẾN (DỮ LIỆU ĐƯỢC LƯU CỤC BỘ)"` dù trong `src/i18n/locales/vi/common.json:15` đã có sẵn key `offlineAlert`.
   - Dòng 530: Tooltip tab điều hướng dùng chuỗi ghép nối tiếng Việt: `title={`${label} (Phím [${n.shortcut}])`}`.
   - Dòng 605-632: Đã tích hợp bộ chuyển đổi Tam Ngữ Micro-Pill Switcher (`VI | EN | JA`) điều khiển qua `locales.map` và `setLocale(item.code)`.
   - Dòng 188, 195, 311, 572: Các thông báo `toast.success`, `toast.error`, `toast.info` chứa văn bản tiếng Việt hardcoded.
   - Dòng 659: Huy hiệu giả lập role hiển thị `(GIẢ LẬP)` dạng chuỗi tĩnh.
   - Dòng 717-719: Chân trang (Footer) chứa chuỗi bản quyền và môi trường chạy: `"© 2026 DYNAMO VIETNAM QT - MES · Hệ thống luân chuyển nhiệt luyện & xi mạ"` và `"Môi trường mô phỏng (Edge Runtime)"`.

2. **Trang Đăng Nhập & Xác thực ULID (`src/routes/login.tsx`)**:
   - Tuyệt đối **không nạp `useTranslation()`** và **không có bộ chuyển đổi ngôn ngữ**.
   - Dòng 44-60: Danh sách `features` (Hero panel) gồm 3 tính năng đều hardcode tiếng Việt.
   - Dòng 64-69: Mảng `positions` khai báo nhãn vị trí công tác (`'BGĐ / IT hệ thống'`, `'Trưởng / Phó phòng'`, `'KTV / Nhân viên'`, `'Nhà cung cấp ngoài'`) bằng tiếng Việt.
   - Dòng 115, 119, 129, 135, 156: Các thông báo lỗi xác thực ULID đều là chuỗi tiếng Việt tĩnh.
   - Dòng 267-279, 321, 356, 418, 480, 523: Toàn bộ tiêu đề thẻ đăng nhập, tiến trình 2 bước, nhãn bàn phím cảm ứng Kiosk, cảnh báo tạm khóa thiết bị (`'Thiết bị tạm khóa an toàn'`) và nút submit (`'XÁC THỰC VỊ TRÍ & VÀO HỆ THỐNG'`) đều bị hardcode.

3. **Dải chỉ số đo xa Shopfloor Telemetry (`src/components/shopfloor-telemetry.tsx`)**:
   - **Chưa nạp `useTranslation()`**.
   - Dòng 11-16: Hàm `getShift()` trả về `'Ca 1 (06:00 - 14:00)'`, `'Ca 2 (14:00 - 22:00)'`, `'Ca 3 (22:00 - 06:00)'` hardcoded, trong khi `src/i18n/formatters.ts:51-56` đã có hàm `formatShift(shift, locale)`.
   - Dòng 98-105: Trạng thái đồng bộ (`syncText`) hardcode tiếng Việt: `'Đang đồng bộ...'`, `'Lỗi kết nối Google Sheets'`, `'Cập nhật lúc ...'`, `'Sẵn sàng đồng bộ'`.
   - Dòng 122, 129, 133, 155, 189, 201, 231: Toàn bộ nhãn `'Hàng ngoài:'`, `'Tải:'`, `'lô mở'`, `'Chỉ số KPI'`, `'Hàng ngoài xưởng'`, `'Tải theo xưởng'`, `'Thu gọn'` đều hardcoded.

4. **Menu Lệnh Toàn Cục Command Palette (`src/components/command-palette.tsx`)**:
   - **Chưa nạp `useTranslation()`**.
   - Dòng 76: `placeholder="Tìm kiếm mã hàng, số đơn hàng, mã lô hoặc thao tác nhanh... (ESC để đóng)"`.
   - Dòng 81, 84, 118, 143, 154: Các tiêu đề nhóm `"LÔ HÀNG & MÃ LINH KIỆN KHỚP"`, `"ĐIỀU HƯỚNG NHANH"`, `"LỌC PHÂN XƯỞNG"`, `"THAO TÁC HỆ THỐNG"` và nhãn thao tác đều hardcoded.

5. **Phiếu lệnh gia công A4 & Tem Pallet (`src/components/job-ticket.tsx`)**:
   - **Chưa nạp `useTranslation()`**.
   - Dòng 201-205, 224-229: Header phiếu in A4 `"CÔNG TY TNHH DYNAMO VIỆT NAM"`, `"KAIZEN MES · PHÂN XƯỞNG NHIỆT LUYỆN & GIA CÔNG NGOÀI (QT)"`, `"PHIẾU GIAO NHẬN & LỆNH GIA CÔNG NGOÀI"` hardcoded.
   - Dòng 235-300: Toàn bộ Mục I (Thông tin linh kiện, mác thép, độ cứng, số lượng, khối lượng, hạn trả, đơn giá, thành tiền).
   - Dòng 308-316: Mục II Chỉ dẫn kỹ thuật & quy cách đóng gói (Bảo vệ bề mặt, Tránh va chạm, Kiểm soát biến dạng, Mẫu thử coupon).
   - Dòng 322-348: Mục III Kết quả đo kiểm tiếp nhận thực tế (Điểm đo 1, 2, 3, Đánh giá nghiệm thu: ĐẠT / KHÔNG ĐẠT).
   - Dòng 353-380: Mục IV 4 Chữ ký pháp lý (`1. ĐIỀU VẬN DYNAMO`, `2. BẢO VỆ CỔNG`, `3. ĐƠN VỊ GIA CÔNG`, `4. QC NHẬP KHO`).
   - Dòng 408-461: Toàn bộ tem Pallet (`SinglePalletTagContent`).
   - Dòng 923-1003: Toàn bộ Bảng kê tổng hợp hàng loạt (`BẢNG KÊ GIAO NHẬN LÔ HÀNG GIA CÔNG NGOÀI`).

6. **Hộp thoại cập nhật tiến độ lô (`src/components/lot-update-dialog.tsx`) & Cấu hình Webhook (`src/components/webhook-config.tsx`)**:
   - Cả 2 component đều chưa nạp i18n, chứa hàng loạt thông điệp validation, nhãn form, trạng thái LED và thông báo toast tiếng Việt.

7. **Root Shell & Fail-Safe Boundary (`src/routes/__root.tsx`)**:
   - Trang 404 (`NotFoundComponent`) và trang xử lý lỗi nghiêm trọng (`ErrorComponent`) chứa các chuỗi kỹ thuật tiếng Việt hardcode và có vi phạm bo góc `rounded-md` thay vì `rounded-xs`.

---

### 2. LOGIC CHAIN (Chuỗi suy luận từ quan sát đến giải pháp)

1. *Từ Quan sát 1 & 2*: Dynamo Shell đã nạp i18n nhưng chưa triệt để (nhiều toast, tooltip, clock, footer còn hardcoded), trong khi `/login` hoàn toàn cô lập khỏi hệ thống i18n. Khi người dùng tiếng Anh hoặc tiếng Nhật truy cập vào hệ thống, họ gặp rào cản ngôn ngữ ngay từ bước đăng nhập đầu tiên.
   ➔ **Giải pháp**: Tích hợp `useTranslation()` vào `/login`, đặt bộ chuyển đổi Micro-Pill Switcher `[VI] [EN] [JA]` lên header/góc trên trang đăng nhập; đồng thời bóc tách toàn bộ chuỗi hardcode trong Shell sang các key i18n chuẩn.

2. *Từ Quan sát 3, 4, 5, 6*: Các component dùng chung (Shopfloor Telemetry, Command Palette, Job Ticket, Lot Update Dialog, Webhook Config) đều chưa gọi `useTranslation()`. Khi người dùng đổi ngôn ngữ ở header, các dải thông số và hộp thoại này không phản ứng theo ngôn ngữ đã chọn.
   ➔ **Giải pháp**: Nạp hook `useTranslation()` vào tất cả các component dùng chung nói trên; chuyển đổi động các nhãn hiển thị, tiêu đề, nút bấm, placeholder và toast thông báo.

3. *Từ Quan sát 1 về test `TC-HDR-01`*: Test file `src/test/i18n-and-header.test.ts` trực tiếp kiểm tra sự tồn tại của chuỗi `label: 'LUÂN CHUYỂN'` và `label: 'ĐỒNG BỘ'` trong `src/components/dynamo-shell.tsx`.
   ➔ **Hạn chế kỹ thuật bắt buộc**: Bắt buộc giữ nguyên thuộc tính `label: 'LUÂN CHUYỂN'` và `label: 'ĐỒNG BỘ'` trong mảng cấu hình `nav` của `dynamo-shell.tsx` làm giá trị fallback/test invariant, và hiển thị giao diện qua `t(n.labelKey) || n.label`.

4. *Từ R2 trong ORIGINAL_REQUEST.md & DESIGN-SYSTEM.md*: Các mã trạng thái nghiệp vụ chuẩn (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`), mã định danh kỹ thuật (`Order No`, `Lot ID`, `ULID TOKEN`), ký hiệu nhiệt luyện (`QT`, `HRC`, `coupon`) và tên thương hiệu (`DYNAMO VIETNAM`, xưởng `PIN`, `INSERT`, `MOLD`) phải được giữ nguyên vẹn trên cả 3 ngôn ngữ.
   ➔ **Quy tắc chuyển ngữ**: Trong tệp từ điển `en/*.json` và `ja/*.json`, không dịch các thuật ngữ này, giữ nguyên định dạng in hoa/viết tắt chuyên ngành.

5. *Từ cấu trúc hiện tại của `src/i18n/`*: `src/i18n/types.ts` chỉ định nghĩa 7 namespaces. Nếu thêm namespace `auth`, cần cập nhật cả `types.ts`, `index.tsx`, và tạo 3 tệp `auth.json`. Hoặc cách tiếp cận an toàn hơn: đưa các chuỗi dùng chung và auth vào `common.json` (dưới dạng `common.auth.*`), vừa tận dụng cơ chế fallback 1 cấp của hàm `t()`, vừa bảo toàn 100% tính tương thích của test `TC-I18N-01`.

---

### 3. CAVEATS (Những điểm lưu ý & giới hạn phạm vi)

1. **Giới hạn phạm vi**: Báo cáo này chỉ khảo sát Khung vỏ (Shell), Thanh điều hướng (Header), Trang đăng nhập (/login) và các Component dùng chung (Dialogs, Modals, Telemetry, Command Palette, Job Ticket, Webhook Config). Không khảo sát nội dung bảng chi tiết bên trong các trang `/tracking`, `/dashboard`, `/orders`, `/sync` (do các explorer chuyên trách khác đảm nhận).
2. **Kích thước bản in A4 (`job-ticket.tsx`)**: Khi chuyển ngữ sang tiếng Nhật hoặc tiếng Anh, độ dài chuỗi ký tự có thể thay đổi (tiếng Nhật có thể ngắn hơn nhưng cần giãn dòng hợp lý; tiếng Anh thường dài hơn tiếng Việt 10-25%). Khi triển khai, cần kiểm soát ngắt dòng và font size để đảm bảo phiếu in A4 không bị tràn sang trang thứ 2 (giữ chuẩn 1 trang ISO 216).
3. **Phân quyền đối tác**: Tên đối tác gia công (`cty_QT`) phải luôn tuân thủ hàm `formatVendorName(item.cty_QT, role)` (trả về `'Đã Ẩn'` / Masked) để bảo mật danh tính nhà thầu phụ.
4. **Vi phạm bo góc hiện hữu**: Trong `src/routes/__root.tsx` (dòng 96, 102, 108) có `rounded-md` và trong `src/components/ui/alert-dialog.tsx` (dòng 37) có `sm:rounded-lg`. Tác nhân triển khai cần đồng thời chỉnh sửa về `rounded-xs` để đạt chuẩn 100% `TC-DS-03`.

---

### 4. CONCLUSION (Kết luận & Kiến nghị hành động)

1. **Kết luận khảo sát**: Toàn bộ chuỗi hardcoded trên Khung vỏ hệ thống, Thanh điều hướng, Trang Đăng nhập và các Component dùng chung đã được lập danh mục và định danh khóa i18n chi tiết tại tệp `.agents/teamwork/explorer_shell/survey.md`.
2. **Kiến nghị cấu trúc từ điển**:
   - Mở rộng tệp `src/i18n/locales/{vi,en,ja}/common.json` với các nhóm khóa: `auth`, `command`, `lotUpdate`, `ticket`, `pallet`, `manifest`, `errorBoundary`, `notFound`, `toasts`.
   - Mở rộng tệp `src/i18n/locales/{vi,en,ja}/nav.json` với `shortcutHint` và các `sections`.
   - Mở rộng tệp `src/i18n/locales/{vi,en,ja}/telemetry.json` với `shifts`, `syncStates`, `datasetRows`, `microMetrics`.
3. **Đề xuất giao diện**:
   - Bổ sung Trilingual Micro-Pill Switcher `[VI] [EN] [JA]` vào góc trên phải trang `/login` để trải nghiệm người dùng liền mạch ngay từ màn hình xác thực ban đầu.
   - Sửa đổi các class bo góc vi phạm sang `rounded-xs` (2px).
4. **Sẵn sàng triển khai**: Khảo sát đã hoàn tất đầy đủ cơ sở lý luận, mã nguồn dẫn chứng, và kế hoạch chuyển giao cho tác nhân kế tiếp thực thi code changes.

---

### 5. VERIFICATION METHOD (Phương pháp kiểm chứng độc lập)

1. **Kiểm tra tệp khảo sát chi tiết**:
   - Đọc tệp `.agents/teamwork/explorer_shell/survey.md` để đối soát toàn bộ danh mục chuỗi và khóa đề xuất.
2. **Kiểm chứng các file mã nguồn liên quan**:
   - `src/components/dynamo-shell.tsx`
   - `src/routes/login.tsx`
   - `src/components/shopfloor-telemetry.tsx`
   - `src/components/command-palette.tsx`
   - `src/components/job-ticket.tsx`
   - `src/components/lot-update-dialog.tsx`
   - `src/components/webhook-config.tsx`
   - `src/routes/__root.tsx`
3. **Chạy bộ kiểm thử tự động của dự án**:
   - Kiểm tra bộ test i18n & Header: `npx vitest run src/test/i18n-and-header.test.ts`
   - Kiểm tra chuẩn thiết kế: `npx vitest run src/test/design-system-compliance.test.ts`
   - Kiểm tra định tuyến: `npx vitest run src/test/app-routing.test.tsx`
   - Toàn bộ test suite: `npm test`
