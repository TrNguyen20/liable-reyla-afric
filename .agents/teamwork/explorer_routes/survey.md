# BÁO CÁO KHẢO SÁT TOÀN DIỆN CÁC ROUTE CHÍNH & BỘ PHẬN BÁO CÁO
## Chuẩn Hóa Tam Ngữ [VI] [EN] [JA] — DYNAMO MES (Graphite Wireframe UI)

- **Người thực hiện**: `teamwork_explorer` (explorer_routes)
- **Ngày khảo sát**: 2026-11-06
- **Trạng thái**: Hoàn tất khảo sát chi tiết (Read-Only Investigation)
- **Tài liệu căn cứ**: `ORIGINAL_REQUEST.md`, `DESIGN-SYSTEM.md`, `AGENTS.md`
- **Mục tiêu**: Bóc tách 100% chuỗi ký tự hardcoded trên 4 route chính thức (`/tracking`, `/dashboard`, `/orders`, `/sync`) và các component báo cáo/in ấn, phân định thuật ngữ bất biến (Invariants) và lập cấu trúc từ điển i18n chuẩn hóa.

---

## 📑 MỤC LỤC
1. [Tổng Quan Kiến Trúc & Hiện Trạng i18n](#1-tổng-quan-kiến-trúc--hiện-trạng-i18n)
2. [Khảo Sát Chi Tiết Từng Route Chính Thức](#2-khảo-sát-chi-tiết-từng-route-chính-thức)
   - [2.1 Route `/tracking` (Điều độ Luân chuyển Nhiệt luyện QT)](#21-route-tracking-điều-độ-luân-chuyển-nhiệt-luyện-qt)
   - [2.2 Route `/dashboard` (Tổng quan & Biên bản Bàn giao ca A4)](#22-route-dashboard-tổng-quan--biên-bản-bàn-giao-ca-a4)
   - [2.3 Route `/orders` (Chi tiết Đơn đặt hàng & Linh kiện)](#23-route-orders-chi-tiết-đơn-đặt-hàng--linh-kiện)
   - [2.4 Route `/sync` (Đồng bộ Google Sheets & Webhook Hai Chiều)](#24-route-sync-đồng-bộ-google-sheets--webhook-hai-chiều)
3. [Khảo Sát Các Thành Phần Báo Cáo & In Ấn Kỹ Thuật (Printable Sheets)](#3-khảo-sát-các-thành-phần-báo-cáo--in-ấn-kỹ-thuật-printable-sheets)
   - [3.1 Phiếu Giao Nhận & Lệnh Gia Công Ngoài A4 (`SingleA4TicketContent`)](#31-phiếu-giao-nhận--lệnh-gia-công-ngoài-a4)
   - [3.2 Tem Pallet Kiện Hàng 100x150mm (`SinglePalletTagContent`)](#32-tem-pallet-kiện-hàng-100x150mm)
   - [3.3 Bảng Kê Tổng Hợp Lô Hàng Gia Công (`BatchJobTicketModal` Manifest)](#33-bảng-kê-tổng-hợp-lô-hàng-gia-công)
   - [3.4 Biên Bản Bàn Giao Ca Sản Xuất A4 (`ShiftHandoverModal`)](#34-biên-bản-bàn-giao-ca-sản-xuất-a4)
4. [Khảo Sát Các Hộp Thoại Điều Độ & Ngăn Kéo (Dialogs & Drawers)](#4-khảo-sát-các-hộp-thoại-điều-độ--ngăn-kéo-dialogs--drawers)
   - [4.1 Hộp Thoại Cập Nhật Tiến Độ Lô (`LotUpdateButton` / `lot-update-dialog.tsx`)](#41-hộp-thoại-cập-nhật-tiến-độ-lô)
   - [4.2 Hộp Thoại Sửa Hàng Loạt (`BulkEditDialog` trong `tracking.tsx`)](#42-hộp-thoại-sửa-hàng-loạt)
   - [4.3 Ngăn Kéo Chi Tiết Lô & Audit Trail (`LotDetailDrawer` trong `tracking.tsx`)](#43-ngăn-kéo-chi-tiết-lô--audit-trail)
5. [Danh Mục Thuật Ngữ Bất Biến (Invariant Domain Terms)](#5-danh-mục-thuật-ngữ-bất-biến-invariant-domain-terms)
6. [Phát Hiện Rủi Ro & Ràng Buộc Kiểm Thử Tự Động (Test Interlocks)](#6-phát-hiện-rủi-ro--ràng-buộc-kiểm-thử-tự-động-test-interlocks)
7. [Đề Xuất Ma Trận Khóa Từ Điển Chuẩn Hóa Tam Ngữ [VI] [EN] [JA]](#7-đề-xuất-ma-trận-khóa-từ-điển-chuẩn-hóa-tam-ngữ-vi-en-ja)

---

## 1. TỔNG QUAN KIẾN TRÚC & HIỆN TRẠNG i18n

### 1.1 Cấu Trúc Khung i18n Hiện Hữu
Hệ thống hiện sở hữu hạ tầng i18n tinh gọn tại `src/i18n/`:
- `config.ts`: Khai báo 3 ngôn ngữ `SUPPORTED_LOCALES = ['vi', 'en', 'ja']`, mặc định `DEFAULT_LOCALE = 'vi'`, chuỗi fallback `ja -> ['en', 'vi']`, `en -> ['vi']`.
- `index.tsx`: Cung cấp `I18nProvider`, hook `useTranslation()`, tự động đồng bộ cookie `dynamo-locale`, `localStorage` và `document.documentElement.lang`. Hỗ trợ cú pháp tham số `{param}`.
- `types.ts`: Định nghĩa 7 namespaces: `common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`.
- `formatters.ts`: Hỗ trợ định dạng chuẩn hóa ngày tháng `formatDate`, giờ `formatTime`, ca sản xuất `formatShift`, số học `formatNumber`.

### 1.2 Thực Trạng Triển Khai Trên Toàn Dự Án
Qua rà soát toàn bộ codebase:
- **Chỉ duy nhất `src/components/dynamo-shell.tsx`** đang gọi và sử dụng `useTranslation()`.
- **Cả 4 route nghiệp vụ chính** (`tracking.tsx`, `dashboard.tsx`, `orders.tsx`, `sync.tsx`) **hoàn toàn chưa import hay sử dụng `useTranslation()`**.
- Toàn bộ các component cốt lõi (`lot-update-dialog.tsx`, `job-ticket.tsx`, `shopfloor-telemetry.tsx`, `command-palette.tsx`) đều đang hardcode 100% tiếng Việt trong JSX, tiêu đề, nhãn lọc, thông báo lỗi và toast notifications.
- Các file JSON trong `src/i18n/locales/{vi,en,ja}/` mới chỉ ở dạng khung sơ khai (skeleton với 5-10 key mỗi namespace).

---

## 2. KHẢO SÁT CHI TIẾT TỪNG ROUTE CHÍNH THỨC

### 2.1 Route `/tracking` (Điều độ Luân chuyển Nhiệt luyện QT)
- **Tập tin**: `src/routes/tracking.tsx` (4.191 dòng mã).
- **Vai trò**: Trung tâm điều độ luân chuyển gia công nhiệt luyện, xi mạ, phân xưởng PIN, INSERT, MOLD.
- **Danh mục chuỗi ký tự Hardcoded**:

#### A. Meta Tags & Route Header (Dòng 57-67, 1558-1561):
- `title`: `'Luân chuyển QT | DYNAMO VIETNAM QT - MES'`
- `description`: `'Bảng theo dõi và điều độ luân chuyển gia công nhiệt luyện, xi mạ cho PIN, INSERT và MOLD.'`
- `og:description`: `'Giám sát tiến độ, hạn trả và điều độ các lô hàng gia công nhiệt luyện, xi mạ.'`
- Route Badge: `'[1] LUÂN CHUYỂN'`

#### B. Thanh Lọc Trọng Tâm (Focus Bar - Dòng 85-94):
- `'overdue'`: `'Lô quá hạn'`
- `'due_soon'`: `'Cận hạn 48h'`
- `'open'`: `'Lô đang mở'`
- `'stocked'`: `'Đã hoàn tất'`
- `'est_due'`: `'Hạn trả ước tính'`
- `'sync_failed'`: `'Ghi Sheet lỗi'`
- `'no_qc'`: `'Nhập kho chưa QC'`
- `'qc_fail'`: `'QC không đạt'`

#### C. Thanh Pill Lọc Đang Hoạt Động (Active Filter Pills - Dòng 1517-1552):
- Label tiêu đề: `'Đang lọc ({count}):'`
- Nút xóa từng tiêu chí: tooltip `'Bỏ tiêu chí này'`
- Nút xóa toàn bộ: `'Xóa tất cả lọc'`, tooltip `'Xóa toàn bộ các bộ lọc trên bảng'`
- Các nhãn lọc động (Dòng 892-1067):
  - `'Tìm: "{query}"'`
  - `'Lô: "{id}"'`
  - `'Đơn: "{order}"'`
  - `'Xưởng: {workshops}'`
  - `'Mã hàng: "{item}"'`
  - `'Vật liệu ({count}): {materials}'`
  - `'Độ cứng: "{hardness}"'`
  - `'Chưa có độ cứng'`
  - `'SL: {min} → {max}'`
  - `'Kg: {min} → {max}'`
  - `'Đối tác: {vendors}'`
  - `'Logistics: {status}'`
  - `'QC: {qc}'`
  - `'Gửi: {from} → {to}'`
  - `'Thiếu hạn trả'`
  - `'Hạn: {from} → {to}'`
  - `'Ghi chú: "{note}"'`
  - `'Có ghi chú'`
  - `'Quá hạn'`, `'Cận hạn 48h'`, `'Lô đang mở'`, `'Đã hoàn tất'`, `'Chưa đạt QC'`, `'Lỗi ghi Sheet'`

#### D. Toolbar Điều Độ (Dòng 1555-1820):
- Ô tìm kiếm nhanh: placeholder `'Tìm nhanh (nhấn /)...'`, tooltip nút X `'Xóa tìm kiếm (Phím tắt: Esc)'`
- Huy hiệu kết quả lọc: `'Khớp: {matched} / {total} lô'`
- Dropdown chọn phân xưởng:
  - Nút trigger: `'Xưởng: {selected}'` / `'Tất cả'`, tooltip `'Lọc nhanh theo phân xưởng gia công'`
  - Tiêu đề Popover: `'Chọn Phân Xưởng'`, nút `'Bỏ chọn'`
  - Lựa chọn: `'Tất cả phân xưởng'`, `'Xưởng PIN'`, `'Xưởng INSERT'`, `'Xưởng MOLD'`
- Nút chuyển mật độ dòng:
  - `'Nén'` (tooltip: `'Chế độ nén dòng cao độ (~32px)'`)
  - `'Chuẩn'` (tooltip: `'Chế độ dòng tiêu chuẩn (~42px)'`)
- Nút khôi phục cột: `'Khôi phục cỡ cột'` (tooltip: `'Khôi phục kích thước mặc định cho toàn bộ cột'`)
- Nút Làm Mới: `'Làm mới'` / `'Đang tải…'` (tooltip & aria-label: `'Làm mới dữ liệu từ Google Sheets (Phím tắt: Shift + R)'`)
- Nút Toàn màn hình: `'Toàn màn hình'` / `'Thu nhỏ'` (tooltip: `'Phóng to bảng toàn màn hình để tập trung điều độ (Phím tắt: Alt+F)'` / `'Thu nhỏ bảng về kích thước ban đầu (Phím tắt: Alt+F)'`)
- Nút Xuất CSV Dropdown:
  - Trigger: `'Xuất CSV'`, tooltip `'Tùy chọn xuất file CSV'`
  - Options:
    - `'Trang hiện tại'` ({count} lô)
    - `'Kết quả lọc'` ({count} lô)
    - `'Toàn bộ hệ thống'` ({count} lô)

#### E. Header Bảng & Popover Lọc Từng Cột (Dòng 1880-2680):
- Các tiêu đề cột:
  - Cột 1: Checkbox (chọn tất cả)
  - Cột 2: `'MÃ LÔ'`
  - Cột 3: `'ĐƠN HÀNG'`
  - Cột 4: `'MÃ HÀNG'`
  - Cột 5: `'VẬT LIỆU'`
  - Cột 6: `'ĐỘ CỨNG'`
  - Cột 7: `'SL'`
  - Cột 8: `'KG'`
  - Cột 9: `'ĐỐI TÁC'`
  - Cột 10: `'LOGISTICS'`
  - Cột 11: `'QC'`
  - Cột 12: `'NGÀY GỬI'`
  - Cột 13: `'HẠN TRẢ'`
  - Cột 14: `'GHI CHÚ'`
  - Cột 15: `'PHIẾU A4'`
- Thành phần điều khiển chung trong Popover (`HeaderSortControls` & `HeaderFilterCell`):
  - `'Sắp xếp cột này:'`, `'Đang chọn'`
  - `'A → Z (Tăng dần)'`, `'Z → A (Giảm dần)'`
  - Tooltip sắp xếp: `'Nhấp để sắp xếp: Tăng dần → Giảm dần'` / `'Giảm dần → Tăng dần'` / `'Giảm dần → Mặc định'`
  - Tooltip mở lọc: `'Mở bộ lọc {title}'`
  - Tooltip thanh kéo độ rộng: `'Kéo sang trái/phải để đổi độ rộng (Nhấp đúp để đặt lại mặc định)'`
- Nội dung chi tiết trong từng Popover cột:
  - Cột Mã lô: `'Tìm kiếm mã lô:'`, placeholder `'VD: Q2605...'`, nút `'Xóa lọc mã lô'`
  - Cột Đơn hàng: `'Tìm số đơn hàng (PO):'`, placeholder `'VD: QT260515...'`
  - Cột Mã hàng: `'Tìm mã linh kiện:'`, placeholder `'VD: 9075-P3...'`
  - Cột Vật liệu: `'Mác thép ({count}):'`, nút `'Chọn tất cả'` / `'Bỏ chọn hết'`, placeholder `'Tìm mác thép...'`
  - Cột Độ cứng: `'Tìm độ cứng yêu cầu:'`, placeholder `'VD: 58-62, 44±1...'`, checkbox `'Chỉ xem chưa có độ cứng (—)'`
  - Cột SL: `'Khoảng số lượng (pcs):'`, ascLabel `'Nhỏ nhất → Lớn nhất'`, descLabel `'Lớn nhất → Nhỏ nhất'`, placeholder `'Từ (Min)'`, `'Đến (Max)'`
  - Cột KG: `'Khoảng khối lượng (kg):'`, ascLabel `'Nhẹ nhất → Nặng nhất'`, descLabel `'Nặng nhất → Nhẹ nhất'`, placeholder `'Min kg'`, `'Max kg'`
  - Cột Đối tác: `'Nhà thầu gia công:'`, nút `'Chọn tất cả'` / `'Bỏ chọn hết'`
  - Cột Logistics: `'Trạng thái luân chuyển:'`, các mục: `'Chờ xuất xưởng'`, `'Đang tại Vendor'`, `'Đã nhập kho'`
  - Cột QC: `'Trạng thái kiểm tra QC:'`, các mục: `'Chưa kiểm tra'` (PENDING), `'Đang kiểm tra'` (INSPECT), `'Đạt'` (PASS), `'Không đạt'` (FAIL)
  - Cột Ngày gửi: `'Khoảng ngày gửi QT:'`, ascLabel `'Cũ nhất → Mới nhất'`, descLabel `'Mới nhất → Cũ nhất'`, các nút preset: `'Hôm nay'`, `'7 ngày'`, `'Tháng này'`, `'Tất cả'`
  - Cột Hạn trả: `'Khoảng hạn trả:'`, ascLabel `'Gần nhất → Xa nhất'`, descLabel `'Xa nhất → Gần nhất'`, các nút preset: `'Hôm nay'`, `'7 ngày tới'`, `'Tháng này'`, `'Tất cả'`, checkbox `'Chỉ xem lô thiếu hạn trả'`
  - Cột Ghi chú: `'Tìm kiếm ghi chú:'`, ascLabel `'A → Z (Theo ghi chú)'`, descLabel `'Z → A (Theo ghi chú)'`, placeholder `'Nội dung ghi chú...'`, checkbox `'Chỉ xem lô có ghi chú'`

#### F. Phân Trang & Thanh Tác Vụ Nổi (Floating Batch Action Bar - Dòng 3250-3440):
- Phân trang:
  - `'Trang trước'` (tooltip: `'Trang trước (Phím tắt: Alt + Mũi tên trái)'`)
  - `'Trang {current} / {total}'`
  - `'Trang sau'` (tooltip: `'Trang sau (Phím tắt: Alt + Mũi tên phải)'`)
- Thanh tác vụ hàng loạt:
  - aria-label: `'Thao tác hàng loạt'`
  - Đếm: `'{count} lô được chọn'`, `'{qty} chi tiết • {kg} kg'`
  - Nút `'Sửa hàng loạt'`
  - Nút `'In phiếu A4 ({count})'`
  - Nút `'Xuất CSV'`
  - Nút `'Copy mã'`
  - Nút hủy: tooltip `'Bỏ chọn toàn bộ (Phím tắt: Esc)'`

---

### 2.2 Route `/dashboard` (Tổng quan & Biên bản Bàn giao ca A4)
- **Tập tin**: `src/routes/dashboard.tsx` (1.112 dòng mã).
- **Vai trò**: Trung tâm chỉ huy, bảng điều khiển KPI, pipeline tiến độ 4 bước, phân tích nút thắt cổ chai, và biên bản giao ca A4 in ấn chuẩn SOP-MES-08.
- **Danh mục chuỗi ký tự Hardcoded**:

#### A. Meta & Toolbar (Dòng 43-53, 204-287):
- `title`: `'Tổng quan | DYNAMO VIETNAM QT - MES'`
- `description`: `'Trung tâm điều hành luân chuyển gia công QT cho PIN, INSERT và MOLD.'`
- Sub-Header Badge: `'[2] TỔNG QUAN LUÂN CHUYỂN'`
- Phân xưởng: `'TẤT CẢ PHÂN XƯỞNG'` / `'XƯỞNG {ws}'`
- Tổng lô: `'{count} LÔ'`
- Bộ lọc nhanh (Inline Fast Filters):
  - Label: `'LỌC:'`
  - Kỳ báo cáo (`period`):
    - `'all'`: `'Toàn bộ kỳ'`
    - `'today'`: `'Hôm nay (Today)'`
    - `'week'`: `'7 ngày qua (7D)'`
    - `'this'`: `'Tháng này'`
    - `'prev'`: `'Tháng trước'`
  - Đối tác (`vendor`): `'Tất cả đối tác'`
  - Logistics (`logi`): `'Mọi logistics'` (kèm các option `WAIT`, `TRANSIT`, `STOCKED`)
  - QC (`qc`): `'Mọi QC'` (kèm các option `PENDING`, `INSPECT`, `PASS`, `FAIL`)
  - Nút `'Đặt lại'` (reset filters)
  - Nút `'Làm mới'` / `'Đang tải…'` (Shift+R)
  - Nguồn dữ liệu & Giờ đồng bộ: `'{sourceLabel} · {time}'`

#### B. Thẻ KPI Vận Hành (Lines 296-345):
- `[KPI-01]`: Nhãn `'LÔ ĐANG MỞ'`, mô tả `'Chưa nhập kho / {count} lô'`
- `[KPI-02]`: Nhãn `'LÔ QUÁ HẠN'`, mô tả `'{count} trễ > 3d · bỏ qua {count} thiếu hạn'`
- `[KPI-03]`: Nhãn `'TRẢ HÀNG ĐÚNG HẠN'`, mô tả `'{onTime}/{denominator} lô · mục tiêu ≥ 95%'`, sparkline tooltip trend 4 tuần
- `[KPI-04]`: Nhãn `'NHẬP KHO CHƯA QC'`, mô tả `'Đã về kho, QC chưa đạt'`
- `[KPI-05]`: Nhãn `'CHI PHÍ TẠM TÍNH'`, mô tả `'{count} lô có giá · tạm tính nội bộ'`, huy hiệu `'CHỈ ĐỌC / NỘI BỘ'`

#### C. Quy Trình Pipeline 4 Công Đoạn (Lines 569-650):
- Bước 1: `'1. Chờ xuất xưởng'` (`{count} lô ({pct}%)`, `{kg} kg`, `[{late} trễ hạn]`)
- Bước 2: `'2. Đang tại Vendor'`
- Bước 3: `'3. Về kho, chờ QC'`
- Bước 4: `'4. Hoàn tất (QC đạt)'`

#### D. Cảnh Báo Theo Mức Ưu Tiên (Lines 352-383):
- Tiêu đề section: `'Cảnh báo theo mức ưu tiên'`, phụ đề: `'Bấm nhóm để lọc danh sách lô chi tiết'`
- 1. `'Quá hạn'` — `'Chưa nhập kho, đã qua hạn trả chính thức'`
- 2. `'Cận hạn 48h'` — `'Hạn trả chính thức trong 2 ngày tới'`
- 3. `'Thiếu hạn trả'` — `'Không có hạn trả hợp lệ từ nguồn — cần bổ sung'`
- 4. `'Nhập kho chưa QC'` — `'Đã về kho nhưng QC chưa đạt'`
- 5. `'QC không đạt'` — `'Cần xử lý lại với đối tác gia công'`
- 6. `'Ghi Sheet lỗi'` — `'Lần cập nhật gần nhất chưa ghi được lên Sheet'`

#### E. Bảng Hành Động Ưu Tiên (Action Items - Lines 385-465):
- Tiêu đề: `'Hành động ưu tiên'`, phụ đề `'Quá hạn → Cận hạn → Thiếu hạn trả → Lỗi ghi Sheet'`
- Link: `'Mở Luân chuyển'`
- Tiêu đề cột bảng:
  - `'MÃ LÔ'`, `'ĐƠN HÀNG'`, `'ĐỐI TÁC'`, `'XƯỞNG'`, `'LOGISTICS / QC'`, `'HẠN TRẢ'`, `'CẢNH BÁO'`, `'PHIẾU'`, `'XỬ LÝ'`
- Nội dung cell cảnh báo:
  - `'Thiếu hạn'`, `'Quá hạn {days} ngày'`, `'Cận hạn 48h'`, `'Thiếu hạn trả'`, `'Ghi Sheet lỗi'`
- Nút khóa phân quyền: `'Khóa'`, tooltip: `'Chỉ Quản trị viên hoặc đúng Đối tác gia công mới có quyền cập nhật tiến độ lô này'`
- Trạng thái rỗng: `'Không có lô cần xử lý trong phạm vi này.'`

#### F. Phân Tích Điểm Nghẽn (Bottlenecks Analysis - Lines 498-567):
- Tiêu đề: `'Điểm nghẽn theo đối tác gia công'` & `'Điểm nghẽn theo phân xưởng'`
- Phụ đề: `'Chỉ tính lô đang mở · Đỏ = quá hạn, Vàng = cận hạn'`
- Tiêu đề cột:
  - `'NHÓM'`, `'TẢI TRỌNG'`, `'SỐ LÔ'`, `'KG'`, `'PCS'`, `'QUÁ HẠN'`, `'CẬN HẠN'`

---

### 2.3 Route `/orders` (Chi tiết Đơn đặt hàng & Linh kiện)
- **Tập tin**: `src/routes/orders.tsx` (674 dòng mã).
- **Vai trò**: Master-Detail view tra cứu toàn bộ đơn đặt hàng, cơ cấu danh mục linh kiện khuôn, tiến độ gia công và giá trị đơn hàng.
- **Danh mục chuỗi ký tự Hardcoded**:

#### A. Meta & Sub-Header (Lines 33-43, 189-228):
- `title`: `'Đơn đặt hàng | DYNAMO VIETNAM QT - MES'`
- `description`: `'Chi tiết đơn đặt hàng và linh kiện gia công nhiệt luyện, xi mạ.'`
- Sub-Header Badge: `'[3] ĐƠN ĐẶT HÀNG'`
- Thống kê: `'{count} ĐƠN'`, `'{count} LÔ LINH KIỆN'`
- Nút Làm Mới: `'Làm mới'` / `'Đang tải…'` (Shift+R)

#### B. Cột Trái: Danh Sách Đơn Hàng (Order Master List - Lines 240-352):
- Tiêu đề: `'Danh sách đơn hàng'`, bộ đếm: `'{visible} / {total}'`
- Ô tìm kiếm: placeholder `'Lọc mã đơn, mã hàng...'`, aria-label `'Lọc danh sách đơn'`
- Tag lọc vật liệu: `'Mác thép: {material}'`, aria-label `'Bỏ lọc mác thép'`
- Thẻ đơn hàng:
  - Badge trễ/cận: `'{count} trễ'`, `'{count} cận'`, `'{count} mã'`
  - Đơn vị tính: `'{count} cái'`, `'{kg} kg'`
  - Thông báo giới hạn: `'Hiển thị {limit}/{total} đơn — lọc để tìm nhanh'`
  - Trạng thái rỗng: `'Không tìm thấy đơn khớp "{search}"'` / `'Chưa có đơn hàng trong phạm vi lọc'`

#### C. Cột Phải: Bảng Điều Khiển Chi Tiết Đơn (Order Detail Cockpit - Lines 363-655):
- Nút quay lại trên Mobile: `'Danh sách đơn'`
- Huy hiệu ngày gửi: `'GỬI {date}'`
- Đối tác: `'Đối tác: {vendor}'`
- Thanh tiến độ: `'Tiến độ:'`, `'{percent}%'`, `'({done}/{total} lô hoàn tất)'`
- Nút chuyển mật độ: `'Nén'` (tooltip: `'Chế độ nén dòng'`), `'Vừa'` (tooltip: `'Chế độ dòng tiêu chuẩn'`)
- Nút hành động:
  - `'In phiếu cả đơn'`
  - `'Xuất CSV'`
- Dải telemetry thống kê nhanh:
  - `'PX: {workshops}'`
  - `'ĐỐI TÁC: {vendor}'`
  - `'TỔNG KL: {kg} kg'`
  - `'TỔNG GIÁ TRỊ: {money}'` / `'TỔNG SỐ LƯỢNG: {pcs} cái'`
  - `'QUY CÁCH: {count} mã linh kiện'`
- Thanh tab lọc phụ (Sub-filter bar):
  - Nhãn: `'Xem:'`
  - `'Tất cả ({count})'`
  - `'Quá hạn ({count})'`
  - `'Cận hạn 48h ({count})'`
  - `'Đang gia công ({count})'`
  - `'Đã nhập kho ({count})'`
- Bảng chi tiết linh kiện:
  - Tiêu đề cột: `'MÃ HÀNG'`, `'MÁC THÉP / HRC'`, `'KÍCH THƯỚC'`, `'SL'`, `'KHỐI LƯỢNG'`, `'ĐƠN GIÁ'`, `'THÀNH TIỀN'`, `'HẠN TRẢ'`, `'TRẠNG THÁI'`, `'PDF'`, `'THAO TÁC'`
  - Tag hạn trả: `'Quá hạn {days}d'`, `'Cận hạn 48h'`, `'Hạn ước tính'`, `'Thiếu hạn trả'`
  - Giới hạn dòng: `'Hiển thị {limit}/{total} dòng — xuất CSV để tải toàn bộ'`
  - Thanh tổng kết đáy:
    - `'Đang hiển thị {shown}/{total} lô gia công'`
    - `'Tổng cộng đơn:'` (kèm tiền) / `'Tổng linh kiện:'` (kèm số lượng cái)
  - Trạng thái rỗng: `'Không có đơn hàng phù hợp bộ lọc'`

---

### 2.4 Route `/sync` (Đồng bộ Google Sheets & Webhook Hai Chiều)
- **Tập tin**: `src/routes/sync.tsx` (672 dòng mã).
- **Vai trò**: Cổng liên kết dữ liệu hai chiều, nạp bảng tính Google Sheets và cấu hình Webhook Google Apps Script.
- **Danh mục chuỗi ký tự Hardcoded**:

#### A. Meta & Sub-Header (Lines 33-50, 229-255):
- `title`: `'Liên kết Dữ liệu Hai Chiều | DYNAMO VIETNAM QT - MES'`
- `description`: `'Trung tâm tích hợp dữ liệu hai chiều: Nạp dữ liệu sản xuất từ Google Sheets và đồng bộ tiến độ qua Google Apps Script Webhook.'`
- Sub-Header Badge: `'[4] ĐỒNG BỘ'`
- Nhãn phụ: `'KẾT NỐI HAI CHIỀU'`
- Thống kê: `'{count} LÔ KHẢ DỤNG'`

#### B. Cột 1: Cổng Kết Nối Hai Chiều (Inbound & Outbound - Lines 260-483):
- Tiêu đề section: `'Cổng Kết Nối Hai Chiều'`, phụ đề `'Đồng bộ bảng tính Google Sheets và phản hồi qua Google Apps Script'`
- Khối 1: `'1. Tiếp Nhận Dữ Liệu (Inbound — Google Sheets)'`
  - Nhãn aria: `'Link Google Sheets'`
  - Tùy chọn tự động: `'Tự động đồng bộ:'` (`'Tắt (Thủ công)'`, `'Mỗi 5 phút'`, `'Mỗi 15 phút'`, `'Mỗi 30 phút'`)
  - Đồng hồ đếm ngược: `'({m}m {s}s)'`
  - Nút: `'Mặc định'` (tooltip: `'Khôi phục link bảng tính Google Sheets mặc định'`)
  - Nút: `'Tải & Phân Tích'` / `'Đang truy xuất...'`
  - Thông báo lỗi: `'Lỗi kết nối bảng tính'`
- Khối 2: `'2. Ghi Ngược Tiến Độ (Outbound — Google Apps Script)'`
  - Trạng thái kết nối: `'KẾT NỐI SẴN SÀNG'` / `'CHƯA CẤU HÌNH'`
  - Nhãn aria input: `'Link Google Apps Script Webhook'`
  - Nút kiểm tra: `'Kiểm tra kết nối'` / `'Đang test…'` (tooltip: `'Gửi gói tin ping kiểm tra kết nối tới Google Apps Script'`)
  - Nút lưu: `'Lưu'` / `'Đã lưu'`
  - Kết quả test: `'Kết nối Webhook hoạt động hoàn hảo ({latency}ms)'` / `'Kiểm tra kết nối thất bại ({latency}ms)'`
  - Dòng thông báo đẩy tự động: `'Đẩy tự động khi cập nhật lô: TrangThai · ngay_nhan_QT · do_cung'`
- Ghi chú bảo mật đáy: `'Mọi thay đổi trạng thái sẽ gửi payload JSON qua Webhook và ghi nhận vào nhật ký kiểm toán.'`

#### C. Cột 2: Kiểm Soát Giao Dịch & Bộ Nhớ Đệm (Staging & Commit - Lines 485-667):
- Tiêu đề: `'Kiểm Soát Giao Dịch & Bộ Nhớ Đệm'`
- Phụ đề: `'Sẵn sàng nạp {count} lô hàng mới từ Google Sheets (bỏ qua {dup} dòng trùng)'` / `'Đang chạy nguồn dữ liệu hiện hành ({count} lô)'`
- Badge trạng thái: `'ĐÃ ÁP DỤNG'`
- 4 thẻ metric:
  - `'SỐ LÔ HỢP LỆ'`, `'SỐ ĐƠN HÀNG QT'`, `'TỔNG KHỐI LƯỢNG'`, `'PHÂN XƯỞNG'`
- Thanh Cache: `'Nguồn: {sourceLabel} · ~{mb} MB Cache'`, nút `'Làm mới Cache'` (tooltip: `'Làm mới bộ nhớ đệm và nạp lại toàn bộ từ Google Sheets'`)
- Chế độ áp dụng: `'Chế độ áp dụng vào hệ thống: TRANSACTION MODE'`
  - Option 1: `'Thay thế toàn bộ (Replace)'` — `'Xóa cache cũ, nạp toàn bộ danh mục mới nhất từ Google Sheets.'`
  - Option 2: `'Cập nhật gộp lô (Upsert)'` — `'Thêm lô mới và cập nhật đè các lô trùng mã ID_Key.'`
- Footer hành động:
  - Thời gian: `'Đồng bộ gần nhất: {time}'` / `'Chưa có mốc thời gian'`
  - Xác nhận: `'Xác nhận thay thế toàn bộ dữ liệu hiện tại bằng {count} lô mới từ Google Sheets?'`
  - Nút: `'Áp dụng vào toàn hệ thống'` / `'Đã kích hoạt vào hệ thống'`
  - Quy tắc Poka-Yoke: `'Poka-Yoke: Tự động chuẩn hóa mã lô (ID_Key), mác thép, phân xưởng và tính tổng khối lượng tức thì trước khi commit.'`

#### D. Toasts Trong `sync.tsx`:
- `'Định dạng URL không đúng! Link Webhook phải có dạng https://script.google.com/macros/s/.../exec'`
- `'Đã lưu cấu hình Webhook tập trung vào hệ thống thành công.'`
- `'Đã xóa cấu hình Webhook ghi ngược trên toàn hệ thống.'`
- `'Lỗi lưu Webhook lên máy chủ: {error}'`
- `'Vui lòng nhập đường dẫn Webhook trước khi kiểm tra.'`
- `'Webhook phản hồi tốt ({latency}ms)!'`
- `'Kiểm tra Webhook thất bại: {error}'`
- `'Vui lòng nhập đường dẫn Google Sheets hợp lệ.'`
- `'Tự động đồng bộ thành công: {count} lô ({ms}ms)'`
- `'Tải thành công {count} lô từ Google Sheets ({ms}ms)'`
- `'Không kết nối được Google Sheets.'`
- `'Đã làm mới bộ nhớ đệm và kéo lại dữ liệu từ Google Sheets!'`
- `'Đã áp dụng thành công dữ liệu mới vào toàn bộ hệ thống!'`

---

## 3. KHẢO SÁT CÁC THÀNH PHẦN BÁO CÁO & IN ẤN KỸ THUẬT (PRINTABLE SHEETS)

### 3.1 Phiếu Giao Nhận & Lệnh Gia Công Ngoài A4 (`SingleA4TicketContent`)
- **Tập tin**: `src/components/job-ticket.tsx` (Dòng 176-394).
- **Chuẩn in**: Khổ giấy dọc A4 tiêu chuẩn (210 x 297 mm), 100% Vector Barcode Code 39 & QR Code.
- **Bóc tách văn bản cần bản địa hóa**:
  - Tiêu đề công ty: `'CÔNG TY TNHH DYNAMO VIỆT NAM'`
  - Phân xưởng phụ trách: `'KAIZEN MES · PHÂN XƯỞNG NHIỆT LUYỆN & GIA CÔNG NGOÀI (QT)'`
  - Mã phiếu & Số đơn: `'Số phiếu: {docCode} · Số ĐH: {orderNo}'`, `'(Trang {pageIndex}/{totalPages})'`
  - Biểu ngữ tài liệu: `'PHIẾU GIAO NHẬN & LỆNH GIA CÔNG NGOÀI'`
  - Quy trình kỹ thuật: `'Quy trình: Tôi chân không / Nhiệt luyện thể tích / Thấm Carbon / Xi mạ kỹ thuật'`
  - **Mục I. THÔNG TIN LINH KIỆN & YÊU CẦU KỸ THUẬT**:
    - `'Mã linh kiện:'`
    - `'Mã lô (ULID):'`
    - `'Phân xưởng giao:'`
    - `'Đơn vị nhận:'`
    - `'Mác thép / Vật liệu:'`
    - `'Độ cứng yêu cầu:'` (fallback: `'Theo bản vẽ'`)
    - `'Kích thước SP:'`
    - `'Số lượng xuất:'` (`'{count} chi tiết'`)
    - `'Tổng trọng lượng lô:'` (`'{weight} kg'`)
    - `'Ngày gửi xuất xưởng:'`
    - `'Hạn trả cam kết:'` (fallback: `'Theo thỏa thuận'`)
    - `'Trạng thái:'`
    - `'Đơn giá gia công:'`
    - `'Tổng thành tiền (tạm tính):'`
  - **Mục II. CHỈ DẪN KỸ THUẬT & QUY CÁCH ĐÓNG GÓI BÀN GIAO**:
    - `'Bảo vệ bề mặt:'` — `'Phun dầu chống gỉ sét, quấn màng co bảo vệ đối với bề mặt mài bóng định hình.'`
    - `'Tránh va chạm:'` — `'Đặt khay nhựa / ngăn chia chống cọ xát sứt mẻ góc cạnh và ren bu lông.'`
    - `'Kiểm soát biến dạng:'` — `'Độ cong vênh sau tôi ≤ 0.02 mm / 100mm chiều dài chi tiết.'`
    - `'Mẫu thử kèm theo (coupon):'` — `'Gia công cùng mẻ tôi để đo kiểm độ cứng mặt cắt và cơ tính vật liệu.'`
  - **Mục III. KẾT QUẢ ĐO KIỂM TIẾP NHẬN THỰC TẾ (QC INSPECTION LOG)**:
    - `'Điểm đo 1 (HRC)'`, `'Điểm đo 2 (HRC)'`, `'Điểm đo 3 (HRC)'`, `'Trung bình (HRC)'`
    - Đánh giá nghiệm thu: `'[ ] ĐẠT     [ ] KHÔNG ĐẠT'`
  - **Mục IV. 4 CHỮ KÝ PHÁP LÝ**:
    - 1. `'1. ĐIỀU VẬN DYNAMO'` (Phụ đề: `'Lập lệnh & xuất kho'`, `'Ký & ghi rõ họ tên'`)
    - 2. `'2. BẢO VỆ CỔNG'` (Phụ đề: `'Kiểm tra xuất cổng'`, `'Ký & ghi giờ xuất'`)
    - 3. `'3. ĐƠN VỊ GIA CÔNG'` (Phụ đề: `'Tiếp nhận & kiểm đếm'`, `'Ký & đóng dấu xác nhận'`)
    - 4. `'4. QC NHẬP KHO'` (Phụ đề: `'Nghiệm thu đạt chuẩn'`, `'Ký & ngày nhập kho'`)
  - Footer: `'Phương châm xưởng: KỶ LUẬT · CHÍNH XÁC · AN TOÀN · ĐÚNG HẠN'`, `'In lúc: {timestamp}'`

### 3.2 Tem Pallet Kiện Hàng 100x150mm (`SinglePalletTagContent`)
- **Tập tin**: `src/components/job-ticket.tsx` (Dòng 395-465).
- **Chuẩn in**: Thẻ kiện hàng dán pallet 100x150mm viền nét đứt.
- **Bóc tách văn bản**:
  - Header: `'DYNAMO VIỆT NAM · TEM PALLET'`, `'LÔ HÀNG GIA CÔNG NGOÀI (QT)'`, `'XƯỞNG {ws}'`
  - Tiêu đề trung tâm: `'MÃ LINH KIỆN KHUÔN'`, `'MÃ TRUY VẾT: {id}'`
  - Thông số kiện:
    - `'Số lượng & Khối lượng:'`
    - `'Mác thép & Độ cứng yêu cầu:'`
    - `'Số đơn hàng (PO):'`
    - `'Đơn vị nhận gia công:'`
    - `'Ngày gửi:'`, `'Hạn trả:'`

### 3.3 Bảng Kê Tổng Hợp Lô Hàng Gia Công (`BatchJobTicketModal` Manifest)
- **Tập tin**: `src/components/job-ticket.tsx` (Dòng 796-1028).
- **Chuẩn in**: Khổ ngang A4 danh sách nhiều lô hàng.
- **Bóc tách văn bản**:
  - Header Toolbar: `'IN PHIẾU HÀNG LOẠT ({count} LÔ)'`, `'Tổng cộng: {pcs} chi tiết · {kg} kg'`
  - Nút chuyển tab: `'1. Bảng kê tổng hợp ({count} lô)'`, `'2. Tập phiếu A4 từng lô ({count} trang)'`
  - Nút in: `'In Bảng kê tổng hợp'` / `'In Tất cả {count} phiếu A4'`
  - Tiêu đề Manifest: `'CÔNG TY TNHH DYNAMO VIỆT NAM'`, `'BẢNG KÊ GIAO NHẬN LÔ HÀNG GIA CÔNG NGOÀI (QT DISPATCH MANIFEST)'`
  - Dòng ngày lập: `'Ngày lập: {date} · Tổng số: {count} lô · Tổng trọng lượng: {weight} kg'`
  - Tiêu đề bảng: `'STT'`, `'Mã lô'`, `'Mã hàng'`, `'Số PO'`, `'Xưởng'`, `'Vật liệu'`, `'Độ cứng'`, `'SL'`, `'Kg'`, `'Đối tác'`, `'Hạn trả'`, `'Ký nhận'`
  - Dòng tổng kết footer: `'Tổng cộng:'`
  - 4 khối ký nhận: `'1. ĐIỀU VẬN DYNAMO'`, `'2. BẢO VỆ CỔNG'`, `'3. ĐƠN VỊ GIA CÔNG'`, `'4. QC NGHIỆM THU'`

### 3.4 Biên Bản Bàn Giao Ca Sản Xuất A4 (`ShiftHandoverModal`)
- **Tập tin**: `src/routes/dashboard.tsx` (Dòng 810-1112).
- **Chuẩn in**: Báo cáo SOP-MES-08 in 1 trang A4.
- **Bóc tách văn bản**:
  - Header Dialog: `'Biên bản bàn giao ca sản xuất A4'`, phụ đề `'Chuẩn hóa thông tin ca trực theo tiêu chuẩn MES Dynamo SOP-MES-08'`
  - Nút in: `'In báo cáo (A4) (P)'`
  - Vùng nhập liệu đầu vào:
    - `'Ca trực (Khóa giờ thực tế):'`, `'* Kỷ luật xưởng: Khóa theo giờ máy'`
    - `'Người giao ca:'`, placeholder `'VD: Nguyễn Văn A (Tổ trưởng)'`
    - `'Người nhận ca:'`, placeholder `'VD: Trần Văn B (Tổ trưởng)'`
  - Vùng in biên bản:
    - Header: `'CÔNG TY TNHH DYNAMO VIỆT NAM · MES WORKSHOP'`
    - Tiêu đề tài liệu: `'BIÊN BẢN BÀN GIAO CA SẢN XUẤT & ĐỐI TÁC QT'`
    - Phụ đề: `'Phân xưởng: {workshop} · Thời gian lập: {time}'`, mã `'DYNAMO-SOP-MES-08'`
    - Thẻ tổng hợp 4 ô:
      - `'Tổng lô đang mở:'` (`{count} lô`)
      - `'Tỷ lệ OTD đúng hạn:'` (`{rate}%`)
      - `'Lô quá hạn cảnh báo:'` (`{count} lô`)
      - `'Tổng trọng lượng:'` (`{weight} kg`)
    - Thông tin nhân sự ca: `'Bên giao ca: {name}'`, `'Bên nhận ca: {name}'`, fallback: `'Chưa điền họ tên'`
    - Tiêu đề danh sách lô quá hạn: `'DANH SÁCH LÔ TRỌNG ĐIỂM / CẦN THEO DÕI ĐẶC BIỆT ({shown} / {total})'`, ghi chú: `'* 6 lô trễ hạn nặng nhất'`
    - Bảng lô: cột `'Mã lô'`, `'Mã hàng'`, `'Đơn hàng'`, `'Đối tác QT'`, `'SL (kg)'`, `'Quá hạn'`, `'Ghi chú bàn giao'`
    - Dòng rỗng: `'Ca trực không có lô nào bị quá hạn. Tiến độ giao nhận đúng kế hoạch.'`
    - Ghi chú chân bảng: `'* Báo cáo A4 rút gọn 6 lô quá hạn tiêu biểu. Vui lòng kiểm tra màn hình Luân chuyển (/tracking) để xem chi tiết toàn bộ {count} lô quá hạn.'`
    - 4 chữ ký bàn giao:
      - 1. `'Người giao ca'` (phụ đề: `'(Ký & ghi họ tên)'`)
      - 2. `'Người nhận ca'` (phụ đề: `'(Ký & ghi họ tên)'`)
      - 3. `'Trưởng ca QC / KCS'` (phụ đề: `'(Xác nhận chất lượng)'`)
      - 4. `'Quản đốc xưởng'` (phụ đề: `'(Phê duyệt & lưu trữ)'`)

---

## 4. KHẢO SÁT CÁC HỘP THOẠI ĐIỀU ĐỘ & NGĂN KÉO (DIALOGS & DRAWERS)

### 4.1 Hộp Thoại Cập Nhật Tiến Độ Lô (`LotUpdateButton` / `lot-update-dialog.tsx`)
- **Tập tin**: `src/components/lot-update-dialog.tsx` (145 dòng mã).
- **Chuỗi văn bản**:
  - Nút bấm: tooltip `'Cập nhật tiến độ lô {id}'`, nhãn `'Cập nhật'`
  - Tiêu đề Modal: `'Cập nhật lô {id}'`
  - Mô tả Radix WAI-ARIA: `'Cập nhật trạng thái luân chuyển và thông số kiểm tra nhiệt luyện lô hàng'`
  - Thẻ thông tin tóm tắt: `'Mã hàng'`, `'Số đặt hàng'`, `'Đơn vị gia công'`, `'Hạn trả'` (fallback: `'Chưa có'`)
  - Form fields:
    - `'Trạng thái mới'` (`'{status} (giữ nguyên)'`, `'{next} — cần lý do'`)
    - `'Ngày nhận thực tế'`
    - `'Độ cứng thực tế'` (placeholder: `'58-62 HRC'`)
    - Checkbox QC: `'Tôi xác nhận lô đã QC đạt'`
    - Lý do: `'Lý do'`, placeholder `'VD: Độ cứng không đạt, trả vendor gia công lại'`
  - Thông báo & Lỗi:
    - `'Chưa có thay đổi nào để lưu.'`
    - `'Không kết nối được máy chủ.'`
    - `'Chưa ghi được lên Google Sheet: {err}. Dữ liệu chưa thay đổi — bấm Thử lại.'`
    - Xác nhận: `'Xác nhận chuyển {old} → {new}? Bấm lại để lưu.'`
    - Nút Footer: `'Hủy bỏ'`, `'Đang ghi…'`, `'Xác nhận & lưu'`, `'Thử lại'`, `'Lưu & ghi lên Sheet'`
    - Toast: `'Đã lưu và ghi lên Google Sheet: lô {id}'`

### 4.2 Hộp Thoại Sửa Hàng Loạt (`BulkEditDialog` trong `tracking.tsx`)
- **Tập tin**: `src/routes/tracking.tsx` (Dòng 3444-3746).
- **Chuỗi văn bản**:
  - Tiêu đề: `'Sửa hàng loạt ({count} lô)'`, phụ đề `'Cập nhật đồng bộ các thông số cho toàn bộ lô được chọn'`
  - Mục 1: Checkbox `'Chuyển trạng thái Logistics'` (các lựa chọn `'Chờ xuất xưởng'`, `'Đang tại Vendor'`, `'Đã nhập kho'`)
  - Mục 2: Checkbox `'Gia hạn / Cập nhật hạn trả hàng loạt'` (các nút `'+3 Ngày'`, `'+7 Ngày'`, `'Ngày cụ thể'`)
  - Mục 3: Checkbox `'Cập nhật độ cứng thực tế'` (placeholder: `'VD: 58-62 HRC hoặc 44±1'`)
  - Mục 4: Checkbox `'Chuyển đối tác gia công ngoài (Admin)'` (options: `YAMAICHI`, `PROVISION`)
  - Mục 5: Checkbox `'Điều chỉnh ngày gửi QT'`
  - Mục 6: Checkbox `'Cập nhật mác thép / vật liệu'` (placeholder: `'VD: DAC, SKD61, NAK80...'`)
  - Lý do: `'Lý do điều chỉnh (lưu vào Audit Trail):'`, placeholder `'VD: Gia hạn do đối tác quá tải lò; Chuyển xưởng hàng loạt ca sáng...'`
  - Danh sách xem trước: `'DANH SÁCH {count} LÔ BỊ TÁC ĐỘNG:'`
  - Nút Footer: `'Hủy bỏ'`, `'Xác nhận áp dụng ({count} lô)'`
  - Toast: `'Đã cập nhật hàng loạt cho {count} lô hàng!'`

### 4.3 Ngăn Kéo Chi Tiết Lô & Audit Trail (`LotDetailDrawer` trong `tracking.tsx`)
- **Tập tin**: `src/routes/tracking.tsx` (Dòng 3747-4191).
- **Chuỗi văn bản**:
  - Phân xưởng: `'Phân xưởng {ws}'`
  - Đơn hàng: `'Đơn hàng: {orderNo}'`
  - Nút chế độ sửa: `'✏️ Sửa lô này'` / `'Hủy sửa'`
  - Tiêu đề form sửa: `'Chỉnh sửa thông số lô {id}'`
    - Nhãn form: `'Mã hàng:'`, `'Số đơn hàng:'`, `'Mác thép / Vật liệu:'`, `'Độ cứng yêu cầu:'`, `'Số lượng xuất:'`, `'Khối lượng (kg):'`, `'Đơn vị gia công:'`, `'Trạng thái luân chuyển:'`, `'Ngày gửi QT:'`, `'Hạn trả gia công:'`, `'Kích thước sản phẩm:'` (placeholder `'VD: Ø30x120, 45x60x12...'`), `'Lý do thay đổi:'` (placeholder `'VD: Cập nhật mã hàng thực tế xưởng...'`)
    - Nút form: `'Hủy'`, `'Lưu thay đổi lô này'`
  - Lưới hiển thị kỹ thuật (View Mode):
    - `'Mác thép / Vật liệu:'`
    - `'Độ cứng yêu cầu:'` (fallback: `'Chưa có thông số'`)
    - `'Số lượng xuất:'` (`'{count} chi tiết'`)
    - `'Trọng lượng lô:'` (`'{weight} kg'`)
    - `'Kích thước SP:'`
    - `'Đơn vị nhận gia công:'`
    - `'Ngày gửi xuất xưởng:'`
    - `'Hạn trả gia công:'`
    - `'Đơn giá gia công:'` (fallback: `'Chưa có giá'`)
    - `'Thành tiền dự kiến:'`
    - `'Trạng thái luân chuyển:'`
  - Lịch sử kiểm toán:
    - Tiêu đề: `'NHẬT KÝ THAY ĐỔI & AUDIT TRAIL'`, đếm `'{count} bản ghi'`
    - Dòng log: `'Lý do: {reason}'`
    - Trạng thái rỗng: `'Chưa có thay đổi nào được ghi nhận cho lô này.'`
  - Nút Footer: `'In phiếu lệnh A4'`, `'Đóng'`

---

## 5. DANH MỤC THUẬT NGỮ BẤT BIẾN (INVARIANT DOMAIN TERMS)

Căn cứ nghiêm ngặt theo `ORIGINAL_REQUEST.md` (R2) và `DESIGN-SYSTEM.md`:
> *"Giữ nguyên không dịch các từ đặc trưng/đặc thù khái niệm: các mã trạng thái nghiệp vụ chuẩn (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`), mã định danh hệ thống (Order No, Lot ULID), ký hiệu kỹ thuật nhiệt luyện (QT, tôi dầu, ram...), và tên riêng/mã nhà cung cấp."*

### Bảng Phân Định Thuật Ngữ Giữ Nguyên Ở Cả 3 Ngôn Ngữ [VI] [EN] [JA]:

| Danh mục | Thuật ngữ / Mã Invariant | Giải thích kỹ thuật | Quy tắc hiển thị trên giao diện |
| :--- | :--- | :--- | :--- |
| **Mã trạng thái Logistics** | `WAIT` | Chờ xuất xưởng | Giữ nguyên 4 chữ in hoa monospaced viền vàng |
| | `TRANSIT` | Đang tại đối tác gia công | Giữ nguyên 7 chữ in hoa monospaced viền lam |
| | `STOCKED` | Đã nhập kho hoàn tất | Giữ nguyên 7 chữ in hoa monospaced viền xanh |
| **Mã trạng thái QC** | `PASS` | Kiểm tra đạt chuẩn kỹ thuật | Giữ nguyên 4 chữ in hoa monospaced viền xanh |
| | `FAIL` | Kiểm tra không đạt | Giữ nguyên `FAIL` kèm nhịp xung `andon-pulse` |
| | `PENDING` | Chưa kiểm tra QC | Giữ nguyên 7 chữ in hoa monospaced |
| | `INSPECT` | Đang trong quá trình đo kiểm | Giữ nguyên 7 chữ in hoa monospaced |
| **Định danh kỹ thuật** | `Order No` / `So_DatHang` | Số đặt hàng / Đơn mua hàng (PO) | Giữ nguyên chuỗi mã định danh thực tế |
| | `Lot ULID` / `ID_Key` | Mã lô truy vết (Barcode / QR) | Giữ nguyên tiền tố `Q...` hoặc `TEST-LOT-...` |
| | `ma_hang` | Mã linh kiện khuôn | Giữ nguyên ký hiệu bản vẽ (VD: `9075-P3`) |
| **Ký hiệu nhiệt luyện** | `QT` | Quenching & Tempering (Tôi + Ram) | Giữ nguyên 2 chữ in hoa `QT` |
| | `HRC` | Đơn vị đo độ cứng Rockwell C | Giữ nguyên `HRC` (VD: `58-62 HRC`, `44±1`) |
| | `Mác thép` | DAC, SKD61, NAK80, DC53, HPM38, SK3, S50C | Giữ nguyên tên chuẩn công nghiệp quốc tế |
| | `Kích thước SP` | Ø30x120, 45x60x12... | Giữ nguyên số đo hình học và ký hiệu phi `Ø` |
| **Đơn vị phân xưởng** | `PIN`, `INSERT`, `MOLD` | 3 phân xưởng cốt lõi nhà máy | Giữ nguyên tên viết hoa 3 phân xưởng |
| **Đối tác gia công** | `YAMAICHI`, `PROVISION` | Nhà thầu nhiệt luyện / xi mạ | Giữ nguyên hoặc hiển thị qua `formatVendorName` |
| **Quy chuẩn mã hóa tài liệu** | `DVN-QT-...`, `DYNAMO-SOP-MES-08` | Mã định danh biểu mẫu tiêu chuẩn | Giữ nguyên 100% không chuyển ngữ |
| **Số liệu định lượng** | `font-mono tabular-nums` | Cân nặng (kg), số lượng (pcs), tiền (đ/¥/$) | Bắt buộc định dạng số đơn cách gióng thẳng hàng |

---

## 6. PHÁT HIỆN RỦI RO & RÀNG BUỘC KIỂM THỬ TỰ ĐỘNG (TEST INTERLOCKS)

Qua phân tích các bài kiểm thử tự động hiện có (`npm test`):
Một số file test sử dụng `fs.readFileSync` để quét chuỗi ký tự thô (raw string matching) trực tiếp trên source code `.tsx`:

### 6.1 Ràng Buộc Trong `src/test/ui-ux-standardization.test.ts`
```typescript
// TC-UI-03: Cả 4 routes chính phải sở hữu huy hiệu định danh phân hệ thống nhất [1]..[4]
expect(tracking).toContain('[1] LUÂN CHUYỂN');
expect(dashboard).toContain('[2] TỔNG QUAN LUÂN CHUYỂN');
expect(orders).toContain('[3] ĐƠN ĐẶT HÀNG');
expect(sync).toContain('[4] ĐỒNG BỘ');

// TC-UI-06: LotUpdateDialog phải có nút Hủy bỏ, DialogDescription
expect(content).toContain('Hủy bỏ');
expect(content).toContain('<DialogDescription className="sr-only">');

// TC-UI-09 & TC-UI-10: Nút Làm Mới trên Dashboard và Orders
expect(dashboard).toContain('Làm mới');
expect(orders).toContain('Làm mới');
```

### 6.2 Ràng Buộc Trong `src/test/i18n-and-header.test.ts`
```typescript
// TC-HDR-02: Đồng bộ tên route [1] LUÂN CHUYỂN và [4] ĐỒNG BỘ
expect(trackingSrc).toContain('[1] LUÂN CHUYỂN');
expect(syncSrc).toContain('[4] ĐỒNG BỘ');
```

### 6.3 Ràng Buộc Trong `src/test/dashboard-enhancements.test.ts`
```typescript
expect(dashboardSrc).toContain('Hôm nay (Today)');
expect(dashboardSrc).toContain('7 ngày qua (7D)');
expect(dashboardSrc).toContain('[KPI-05]');
expect(dashboardSrc).toContain('CHỈ ĐỌC / NỘI BỘ');
expect(dashboardSrc).toContain('Khóa');
expect(dashboardSrc).toContain('[2] TỔNG QUAN LUÂN CHUYỂN');
expect(dashboardSrc).toContain('Làm mới');
```

### 6.4 Ràng Buộc Trong `src/test/orders-optimization.test.ts`
```typescript
expect(code).toContain('TỔNG GIÁ TRỊ');
expect(code).toContain('TỔNG SỐ LƯỢNG');
expect(code).toContain('THAO TÁC');
expect(code).toContain('In phiếu cả đơn');
expect(code).toContain('Danh sách đơn');
expect(code).toContain('Tiến độ:');
expect(code).toContain('lô hoàn tất');
```

### ⚠️ Khuyến Nghị Cho Nhóm Triển Khai (Actionable Directive for Implementers):
Khi thay thế các chuỗi này bằng `t(...)` trong component:
1. Đảm bảo từ điển tiếng Việt (`src/i18n/locales/vi/*.json`) giữ đúng chính xác từng ký tự của các chuỗi trên để khi render hoặc fallback không bị sai lệch.
2. Với các bài test đọc trực tiếp file nguồn bằng `fs.readFileSync`, nhóm triển khai cần cập nhật các câu lệnh `expect(code).toContain(...)` trong các file test trên để kiểm tra `t('...')` tương ứng HOẶC kết hợp kiểm tra render thông qua `@testing-library/react`.

---

## 7. ĐỀ XUẤT MA TRẬN KHÓA TỪ ĐIỂN CHUẨN HÓA TAM NGỮ [VI] [EN] [JA]

Dưới đây là cấu trúc mở rộng toàn diện cho các file từ điển trong `src/i18n/locales/{vi,en,ja}/`:

### 7.1 Namespace `tracking.json`
```json
{
  "title": "Luân chuyển QT",
  "metaDescription": "Bảng theo dõi và điều độ luân chuyển gia công nhiệt luyện, xi mạ cho PIN, INSERT và MOLD.",
  "columns": {
    "checkbox": "Chọn",
    "lotId": "MÃ LÔ",
    "orderNo": "ĐƠN HÀNG",
    "itemCode": "MÃ HÀNG",
    "material": "VẬT LIỆU",
    "hardness": "ĐỘ CỨNG",
    "quantity": "SL",
    "weight": "KG",
    "partner": "ĐỐI TÁC",
    "logistics": "LOGISTICS",
    "qc": "QC",
    "sentDate": "NGÀY GỬI",
    "dueDate": "HẠN TRẢ",
    "notes": "GHI CHÚ",
    "ticket": "PHIẾU A4"
  },
  "focus": {
    "overdue": "Lô quá hạn",
    "due_soon": "Cận hạn 48h",
    "open": "Lô đang mở",
    "stocked": "Đã hoàn tất",
    "est_due": "Hạn trả ước tính",
    "sync_failed": "Ghi Sheet lỗi",
    "no_qc": "Nhập kho chưa QC",
    "qc_fail": "QC không đạt"
  },
  "toolbar": {
    "searchPlaceholder": "Tìm nhanh (nhấn /)...",
    "clearSearch": "Xóa tìm kiếm (Phím tắt: Esc)",
    "filterActive": "Đang lọc ({count}):",
    "clearFilter": "Bỏ tiêu chí này",
    "clearAllFilters": "Xóa tất cả lọc",
    "matchedLots": "Khớp: {matched} / {total} lô",
    "workshopFilter": "Xưởng: {selected}",
    "allWorkshops": "Tất cả",
    "workshopPIN": "Xưởng PIN",
    "workshopINSERT": "Xưởng INSERT",
    "workshopMOLD": "Xưởng MOLD",
    "resetColWidths": "Khôi phục cỡ cột",
    "refresh": "Làm mới",
    "refreshing": "Đang tải…",
    "fullscreen": "Toàn màn hình",
    "minimize": "Thu nhỏ",
    "exportCsv": "Xuất CSV",
    "exportCurrentPage": "Trang hiện tại",
    "exportFiltered": "Kết quả lọc",
    "exportAll": "Toàn bộ hệ thống"
  },
  "sort": {
    "sortThisColumn": "Sắp xếp cột này:",
    "selected": "Đang chọn",
    "asc": "A → Z (Tăng dần)",
    "desc": "Z → A (Giảm dần)",
    "numAsc": "Nhỏ nhất → Lớn nhất",
    "numDesc": "Lớn nhất → Nhỏ nhất",
    "weightAsc": "Nhẹ nhất → Nặng nhất",
    "weightDesc": "Nặng nhất → Nhẹ nhất",
    "dateAsc": "Cũ nhất → Mới nhất",
    "dateDesc": "Mới nhất → Cũ nhất",
    "dueAsc": "Gần nhất → Xa nhất",
    "dueDesc": "Xa nhất → Gần nhất"
  },
  "bulk": {
    "barTitle": "{count} lô được chọn",
    "barSubtitle": "{qty} chi tiết • {kg} kg",
    "editButton": "Sửa hàng loạt",
    "printA4": "In phiếu A4 ({count})",
    "exportCsv": "Xuất CSV",
    "copyIds": "Copy mã",
    "clearSelection": "Bỏ chọn toàn bộ (Phím tắt: Esc)",
    "modalTitle": "Sửa hàng loạt ({count} lô)",
    "modalSubtitle": "Cập nhật đồng bộ các thông số cho toàn bộ lô được chọn",
    "changeLogistics": "Chuyển trạng thái Logistics",
    "extendDue": "Gia hạn / Cập nhật hạn trả hàng loạt",
    "add3Days": "+3 Ngày",
    "add7Days": "+7 Ngày",
    "customDate": "Ngày cụ thể",
    "updateHrc": "Cập nhật độ cứng thực tế",
    "changeVendor": "Chuyển đối tác gia công ngoài (Admin)",
    "updateSendDate": "Điều chỉnh ngày gửi QT",
    "updateMaterial": "Cập nhật mác thép / vật liệu",
    "reasonLabel": "Lý do điều chỉnh (lưu vào Audit Trail):",
    "impactedLots": "DANH SÁCH {count} LÔ BỊ TÁC ĐỘNG:",
    "cancel": "Hủy bỏ",
    "apply": "Xác nhận áp dụng ({count} lô)"
  },
  "drawer": {
    "lotDetails": "Chỉnh sửa thông số lô {id}",
    "editLot": "✏️ Sửa lô này",
    "cancelEdit": "Hủy sửa",
    "specsTitle": "Mác thép / Vật liệu:",
    "requiredHrc": "Độ cứng yêu cầu:",
    "noSpecs": "Chưa có thông số",
    "exportQty": "Số lượng xuất:",
    "lotWeight": "Trọng lượng lô:",
    "partDimensions": "Kích thước SP:",
    "subcontractor": "Đơn vị nhận gia công:",
    "dispatchDate": "Ngày gửi xuất xưởng:",
    "promisedDueDate": "Hạn trả gia công:",
    "unitPrice": "Đơn giá gia công:",
    "noPrice": "Chưa có giá",
    "estimatedTotal": "Thành tiền dự kiến:",
    "currentStatus": "Trạng thái luân chuyển:",
    "auditTrail": "NHẬT KÝ THAY ĐỔI & AUDIT TRAIL",
    "recordsCount": "{count} bản ghi",
    "noAuditLogs": "Chưa có thay đổi nào được ghi nhận cho lô này.",
    "printTicket": "In phiếu lệnh A4",
    "close": "Đóng"
  }
}
```

### 7.2 Namespace `dashboard.json`
```json
{
  "title": "TỔNG QUAN LUÂN CHUYỂN",
  "metaDescription": "Trung tâm điều hành luân chuyển gia công QT cho PIN, INSERT và MOLD.",
  "allWorkshops": "TẤT CẢ PHÂN XƯỞNG",
  "workshopScope": "XƯỞNG {ws}",
  "lotsCount": "{count} LÔ",
  "filterLabel": "LỌC:",
  "periods": {
    "all": "Toàn bộ kỳ",
    "today": "Hôm nay (Today)",
    "week": "7 ngày qua (7D)",
    "this": "Tháng này",
    "prev": "Tháng trước"
  },
  "allVendors": "Tất cả đối tác",
  "allLogistics": "Mọi logistics",
  "allQc": "Mọi QC",
  "resetFilters": "Đặt lại",
  "refresh": "Làm mới",
  "loading": "Đang tải…",
  "noLotsMatch": "Không có lô nào khớp bộ lọc. Hãy đổi kỳ báo cáo hoặc xóa bộ lọc.",
  "kpis": {
    "openLots": "LÔ ĐANG MỞ",
    "openLotsDetail": "Chưa nhập kho / {count} lô",
    "overdueLots": "LÔ QUÁ HẠN",
    "overdueLotsDetail": "{count} trễ > 3d · bỏ qua {missing} thiếu hạn",
    "otdRate": "TRẢ HÀNG ĐÚNG HẠN",
    "otdRateDetail": "{onTime}/{denominator} lô · mục tiêu ≥ 95%",
    "stockedNoQc": "NHẬP KHO CHƯA QC",
    "stockedNoQcDetail": "Đã về kho, QC chưa đạt",
    "estimatedCost": "CHI PHÍ TẠM TÍNH",
    "estimatedCostDetail": "{count} lô có giá · tạm tính nội bộ",
    "internalOnlyBadge": "CHỈ ĐỌC / NỘI BỘ"
  },
  "pipeline": {
    "stage1": "1. Chờ xuất xưởng",
    "stage2": "2. Đang tại Vendor",
    "stage3": "3. Về kho, chờ QC",
    "stage4": "4. Hoàn tất (QC đạt)",
    "lotsDetail": "{count} lô ({pct}%)",
    "lateIndicator": "[{count} trễ hạn]"
  },
  "alerts": {
    "title": "Cảnh báo theo mức ưu tiên",
    "subtitle": "Bấm nhóm để lọc danh sách lô chi tiết",
    "overdue": "Quá hạn",
    "overdueReason": "Chưa nhập kho, đã qua hạn trả chính thức",
    "dueSoon": "Cận hạn 48h",
    "dueSoonReason": "Hạn trả chính thức trong 2 ngày tới",
    "missingDue": "Thiếu hạn trả",
    "missingDueReason": "Không có hạn trả hợp lệ từ nguồn — cần bổ sung",
    "stockedNoQc": "Nhập kho chưa QC",
    "stockedNoQcReason": "Đã về kho nhưng QC chưa đạt",
    "qcFail": "QC không đạt",
    "qcFailReason": "Cần xử lý lại với đối tác gia công",
    "syncFailed": "Ghi Sheet lỗi",
    "syncFailedReason": "Lần cập nhật gần nhất chưa ghi được lên Sheet"
  },
  "actions": {
    "title": "Hành động ưu tiên",
    "subtitle": "Quá hạn → Cận hạn → Thiếu hạn trả → Lỗi ghi Sheet",
    "openTracking": "Mở Luân chuyển",
    "colLotId": "MÃ LÔ",
    "colOrderNo": "ĐƠN HÀNG",
    "colPartner": "ĐỐI TÁC",
    "colWorkshop": "XƯỞNG",
    "colLogisticsQc": "LOGISTICS / QC",
    "colDueDate": "HẠN TRẢ",
    "colAlert": "CẢNH BÁO",
    "colTicket": "PHIẾU",
    "colAction": "XỬ LÝ",
    "missingDue": "Thiếu hạn",
    "lockedTooltip": "Chỉ Quản trị viên hoặc đúng Đối tác gia công mới có quyền cập nhật tiến độ lô này",
    "lockBadge": "Khóa",
    "empty": "Không có lô cần xử lý trong phạm vi này."
  },
  "bottlenecks": {
    "vendorTitle": "Điểm nghẽn theo đối tác gia công",
    "workshopTitle": "Điểm nghẽn theo phân xưởng",
    "subtitle": "Chỉ tính lô đang mở · Đỏ = quá hạn, Vàng = cận hạn",
    "colGroup": "NHÓM",
    "colLoad": "TẢI TRỌNG",
    "colLots": "SỐ LÔ",
    "colKg": "KG",
    "colPcs": "PCS",
    "colOverdue": "QUÁ HẠN",
    "colDueSoon": "CẬN HẠN"
  },
  "shiftHandover": {
    "dialogTitle": "Biên bản bàn giao ca sản xuất A4",
    "dialogSubtitle": "Chuẩn hóa thông tin ca trực theo tiêu chuẩn MES Dynamo SOP-MES-08",
    "printA4": "In báo cáo (A4) (P)",
    "shiftLockLabel": "Ca trực (Khóa giờ thực tế):",
    "shiftLockNote": "* Kỷ luật xưởng: Khóa theo giờ máy",
    "giverLabel": "Người giao ca:",
    "giverPlaceholder": "VD: Nguyễn Văn A (Tổ trưởng)",
    "receiverLabel": "Người nhận ca:",
    "receiverPlaceholder": "VD: Trần Văn B (Tổ trưởng)",
    "companyHeader": "CÔNG TY TNHH DYNAMO VIỆT NAM · MES WORKSHOP",
    "documentTitle": "BIÊN BẢN BÀN GIAO CA SẢN XUẤT & ĐỐI TÁC QT",
    "workshopMeta": "Phân xưởng: {workshop} · Thời gian lập: {time}",
    "sopCode": "DYNAMO-SOP-MES-08",
    "statOpenLots": "Tổng lô đang mở:",
    "statOtdRate": "Tỷ lệ OTD đúng hạn:",
    "statOverdueLots": "Lô quá hạn cảnh báo:",
    "statTotalWeight": "Tổng trọng lượng:",
    "giverSide": "Bên giao ca: {name}",
    "receiverSide": "Bên nhận ca: {name}",
    "unfilledName": "Chưa điền họ tên",
    "tableTitle": "DANH SÁCH LÔ TRỌNG ĐIỂM / CẦN THEO DÕI ĐẶC BIỆT ({shown} / {total})",
    "tableSubtitle": "* 6 lô trễ hạn nặng nhất",
    "colLotId": "Mã lô",
    "colItemCode": "Mã hàng",
    "colOrderNo": "Đơn hàng",
    "colPartner": "Đối tác QT",
    "colWeight": "SL (kg)",
    "colOverdueDays": "Quá hạn",
    "colHandoverNotes": "Ghi chú bàn giao",
    "overdueDays": "{days} ngày",
    "followUpDelivery": "Kiểm tra tiến độ giao hàng",
    "emptyLots": "Ca trực không có lô nào bị quá hạn. Tiến độ giao nhận đúng kế hoạch.",
    "footerNotice": "* Báo cáo A4 rút gọn 6 lô quá hạn tiêu biểu. Vui lòng kiểm tra màn hình Luân chuyển (/tracking) để xem chi tiết toàn bộ {total} lô quá hạn.",
    "sigGiver": "Người giao ca",
    "sigReceiver": "Người nhận ca",
    "sigQcLeader": "Trưởng ca QC / KCS",
    "sigWorkshopManager": "Quản đốc xưởng",
    "sigSignNotice": "(Ký & ghi họ tên)",
    "sigQcNotice": "(Xác nhận chất lượng)",
    "sigApprovalNotice": "(Phê duyệt & lưu trữ)"
  }
}
```

### 7.3 Namespace `orders.json`
```json
{
  "title": "ĐƠN ĐẶT HÀNG",
  "metaDescription": "Chi tiết đơn đặt hàng và linh kiện gia công nhiệt luyện, xi mạ.",
  "ordersCount": "{count} ĐƠN",
  "lotsCount": "{count} LÔ LINH KIỆN",
  "refresh": "Làm mới",
  "loading": "Đang tải…",
  "masterList": {
    "title": "Danh sách đơn hàng",
    "searchPlaceholder": "Lọc mã đơn, mã hàng...",
    "materialFilter": "Mác thép: {material}",
    "clearMaterialFilter": "Bỏ lọc mác thép",
    "overdueTag": "{count} trễ",
    "dueSoonTag": "{count} cận",
    "partsCount": "{count} mã",
    "pcsUnit": "{count} cái",
    "weightUnit": "{weight} kg",
    "displayLimitNotice": "Hiển thị {limit}/{total} đơn — lọc để tìm nhanh",
    "notFound": "Không tìm thấy đơn khớp \"{search}\"",
    "empty": "Chưa có đơn hàng trong phạm vi lọc"
  },
  "detail": {
    "backToList": "Danh sách đơn",
    "sentDateBadge": "GỬI {date}",
    "partner": "Đối tác: {vendor}",
    "progressLabel": "Tiến độ:",
    "progressLots": "({done}/{total} lô hoàn tất)",
    "densityCompact": "Nén",
    "densityNormal": "Vừa",
    "printOrder": "In phiếu cả đơn",
    "exportCsv": "Xuất CSV",
    "statWorkshops": "PX: {workshops}",
    "statPartner": "ĐỐI TÁC: {vendor}",
    "statTotalWeight": "TỔNG KL: {weight} kg",
    "statTotalCost": "TỔNG GIÁ TRỊ: {money}",
    "statTotalPcs": "TỔNG SỐ LƯỢNG: {count} cái",
    "statItemTypes": "QUY CÁCH: {count} mã linh kiện",
    "subFilterView": "Xem:",
    "subFilterAll": "Tất cả ({count})",
    "subFilterOverdue": "Quá hạn ({count})",
    "subFilterDueSoon": "Cận hạn 48h ({count})",
    "subFilterOpen": "Đang gia công ({count})",
    "subFilterDone": "Đã nhập kho ({count})",
    "headers": {
      "itemCode": "MÃ HÀNG",
      "materialHardness": "MÁC THÉP / HRC",
      "dimensions": "KÍCH THƯỚC",
      "quantity": "SL",
      "weight": "KHỐI LƯỢNG",
      "unitPrice": "ĐƠN GIÁ",
      "totalAmount": "THÀNH TIỀN",
      "dueDate": "HẠN TRẢ",
      "status": "TRẠNG THÁI",
      "pdf": "PDF",
      "actions": "THAO TÁC"
    },
    "dueTags": {
      "overdue": "Quá hạn {days}d",
      "dueSoon": "Cận hạn 48h",
      "estimated": "Hạn ước tính",
      "missing": "Thiếu hạn trả"
    },
    "limitNotice": "Hiển thị {limit}/{total} dòng — xuất CSV để tải toàn bộ",
    "showingLots": "Đang hiển thị {shown}/{total} lô gia công",
    "totalOrderCost": "Tổng cộng đơn:",
    "totalOrderPcs": "Tổng linh kiện:",
    "empty": "Không có đơn hàng phù hợp bộ lọc"
  }
}
```

### 7.4 Namespace `sync.json`
```json
{
  "title": "ĐỒNG BỘ",
  "metaDescription": "Trung tâm tích hợp dữ liệu hai chiều: Nạp dữ liệu sản xuất từ Google Sheets và đồng bộ tiến độ qua Google Apps Script Webhook.",
  "biDirectional": "KẾT NỐI HAI CHIỀU",
  "availableLots": "{count} LÔ KHẢ DỤNG",
  "gateway": {
    "title": "Cổng Kết Nối Hai Chiều",
    "subtitle": "Đồng bộ bảng tính Google Sheets và phản hồi qua Google Apps Script",
    "inboundTitle": "1. Tiếp Nhận Dữ Liệu (Inbound — Google Sheets)",
    "csvLiveFeed": "CSV LIVE FEED",
    "autoSyncLabel": "Tự động đồng bộ:",
    "autoSyncOff": "Tắt (Thủ công)",
    "every5Min": "Mỗi 5 phút",
    "every15Min": "Mỗi 15 phút",
    "every30Min": "Mỗi 30 phút",
    "countdown": "({m}m {s}s)",
    "defaultBtn": "Mặc định",
    "defaultBtnTooltip": "Khôi phục link bảng tính Google Sheets mặc định",
    "loadAndAnalyze": "Tải & Phân Tích",
    "loading": "Đang truy xuất...",
    "connectionError": "Lỗi kết nối bảng tính",
    "outboundTitle": "2. Ghi Ngược Tiến Độ (Outbound — Google Apps Script)",
    "readyStatus": "KẾT NỐI SẴN SÀNG",
    "unconfiguredStatus": "CHƯA CẤU HÌNH",
    "testBtn": "Kiểm tra kết nối",
    "testingBtn": "Đang test…",
    "saveBtn": "Lưu",
    "savedBtn": "Đã lưu",
    "testSuccess": "Kết nối Webhook hoạt động hoàn hảo ({latency}ms)",
    "testFailed": "Kiểm tra kết nối thất bại ({latency}ms)",
    "autoPushNotice": "Đẩy tự động khi cập nhật lô: TrangThai · ngay_nhan_QT · do_cung",
    "securityNotice": "Mọi thay đổi trạng thái sẽ gửi payload JSON qua Webhook và ghi nhận vào nhật ký kiểm toán."
  },
  "staging": {
    "title": "Kiểm Soát Giao Dịch & Bộ Nhớ Đệm",
    "readyToLoad": "Sẵn sàng nạp {count} lô hàng mới từ Google Sheets{duplicatesNotice}",
    "duplicatesNotice": " (bỏ qua {count} dòng trùng)",
    "currentSource": "Đang chạy nguồn dữ liệu hiện hành ({count} lô)",
    "appliedBadge": "ĐÃ ÁP DỤNG",
    "metricValidLots": "SỐ LÔ HỢP LỆ",
    "metricOrders": "SỐ ĐƠN HÀNG QT",
    "metricWeight": "TỔNG KHỐI LƯỢNG",
    "metricWorkshops": "PHÂN XƯỞNG",
    "sourceLabel": "Nguồn:",
    "cacheSize": "~{size} MB Cache",
    "refreshCache": "Làm mới Cache",
    "refreshCacheTooltip": "Làm mới bộ nhớ đệm và nạp lại toàn bộ từ Google Sheets",
    "transactionMode": "Chế độ áp dụng vào hệ thống: TRANSACTION MODE",
    "replaceMode": "Thay thế toàn bộ (Replace)",
    "replaceModeDesc": "Xóa cache cũ, nạp toàn bộ danh mục mới nhất từ Google Sheets.",
    "upsertMode": "Cập nhật gộp lô (Upsert)",
    "upsertModeDesc": "Thêm lô mới và cập nhật đè các lô trùng mã ID_Key.",
    "lastSynced": "Đồng bộ gần nhất: {time}",
    "noSyncTime": "Chưa có mốc thời gian",
    "confirmReplace": "Xác nhận thay thế toàn bộ dữ liệu hiện tại bằng {count} lô mới từ Google Sheets?",
    "applyToSystem": "Áp dụng vào toàn hệ thống",
    "appliedToSystem": "Đã kích hoạt vào hệ thống",
    "pokaYokeNotice": "Poka-Yoke: Tự động chuẩn hóa mã lô (ID_Key), mác thép, phân xưởng và tính tổng khối lượng tức thì trước khi commit."
  }
}
```

---

## 8. KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG TIẾP THEO

1. **Khối lượng công việc**: Cả 4 route và các component báo cáo chứa khoảng 180-220 chuỗi văn bản cần được chuẩn hóa. Tuy nhiên cấu trúc phân lớp hiện tại rất sạch sẽ, tách biệt rõ giữa dữ liệu số và giao diện người dùng.
2. **Nguyên tắc Invariants**: Việc phân định các mã trạng thái (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`), mã kỹ thuật (`ID_Key`, `So_DatHang`, `ma_hang`), mác thép và phân xưởng đã hoàn tất rõ ràng, bảo vệ 100% tính toàn vẹn của DYNAMO MES.
3. **Phối hợp tiếp theo**:
   - Chuyển tiếp kết quả khảo sát cho `translator_engine` để sinh các bản dịch chuẩn xác bằng tiếng Anh [EN] và tiếng Nhật [JA] phù hợp thuật ngữ chuyên ngành cơ khí khuôn mẫu.
   - Bàn giao báo cáo cho `lead_orchestrator` để phân bổ tác vụ cho `developer_refactor` và cập nhật kiểm thử tự động.
