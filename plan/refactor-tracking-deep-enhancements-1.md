---
goal: 'Tracking Grid Deep Enhancements: Chronological Date Sorting, Distinct Values Popover Filters, and Full Editable Fields Expansion'
version: '1.0'
date_created: '2026-11-10'
owner: 'DYNAMO MES Team'
status: 'Completed'
tags: ['refactor', 'tracking', 'sorting', 'popover-filter', 'inline-edit', 'vendor-fields']
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-green)

Kế hoạch kỹ thuật chuyên sâu nhằm giải quyết triệt để 5 vấn đề cốt lõi trên bảng điều độ nhiệt luyện QT (`/tracking`):
1. Khắc phục triệt để lỗi logic sắp xếp cột ngày (`ngay_tao`, `ngay_gui_qt`, `ncc_ngay_qt`, `ncc_ngay_tra_qt`, `han_tra`) từ so sánh chuỗi ký tự (`localeCompare`) sang so sánh tem thời gian Epoch (`parseFlexibleDate()?.getTime()`).
2. Kích hoạt sắp xếp hai chiều (A-Z / Z-A) mượt mà cho 2 cột mới `QUỐC GIA` (`quoc_gia`) và `XƯỞNG` (`phong_sx`).
3. Mở rộng trải nghiệm chỉnh sửa nhanh (Inline Quick-Edit) & biểu tượng bút chì nhỏ (`PenLine`) cho toàn bộ các cột nghiệp vụ và 12 trường NCC (`ncc_*`), đồng thời bảo vệ nghiêm ngặt 7 trường cố định chỉ-đọc (Read-only) từ Webapp (`ma_hang`, `ngay_tao`, `quoc_gia`, `phong_sx`, `doi_tuong_hang`, `id_ma_hang`, `cty_qt`).
4. Chuẩn hóa cơ chế nghiệm thu nhà cung cấp `ncc_ket_qua_qc` hoạt động độc lập (`PASS` / `FAIL`).
5. Tái thiết kế toàn diện bộ lọc cột (Column Popover Filters) theo phong cách Modern Industrial Grid: loại bỏ khối sắp xếp dư thừa, hiển thị danh sách giá trị thực tế (Distinct Values Checklist), thanh tìm kiếm nhanh, hiển thị tối đa 10 dòng có thanh cuộn mượt mà.

---

## 1. Requirements & Constraints

- **REQ-001**: Toàn bộ các cột ngày tháng (`ngay_tao`, `ngay_gui_qt`, `ncc_ngay_qt`, `ncc_ngay_tra_qt`, `han_tra`) bắt buộc phải sắp xếp theo giá trị thời gian thực (Epoch timestamp ms) thay vì chuỗi ASCII. Thứ tự sắp xếp mặc định khi lần đầu tải trang `/tracking` được chuyển sang `ngay_tao` mới nhất ở trên cùng (descending).
- **REQ-002**: Tiêu đề cột `QUỐC GIA` và `XƯỞNG` phải có tương tác nhấp chuột kích hoạt sắp xếp A-Z / Z-A và hiển thị mũi tên chỉ hướng `ArrowUp` / `ArrowDown`.
- **REQ-003**: Loại bỏ khối "Sắp xếp cột này:" bên trong Filter Popover vì đã có tính năng nhấp tiêu đề cột.
- **REQ-004**: Thiết kế lại Filter Popover của các cột văn bản/danh mục sang giao diện Distinct Values Checklist: có ô tìm kiếm nhanh, nút Chọn tất cả/Bỏ chọn, danh sách tối đa 10 mục nhìn thấy, có thanh cuộn nếu vượt quá 10 mục.
- **REQ-005**: 7 trường dữ liệu cố định BẮT BUỘC KHÔNG CHO PHÉP sửa từ Webapp: `ma_hang`, `ngay_tao`, `quoc_gia`, `phong_sx`, `doi_tuong_hang`, `id_ma_hang`, `cty_qt`.
- **REQ-006**: Toàn bộ các trường còn lại (bao gồm 12 trường `ncc_*`) phải hỗ trợ hiển thị icon `PenLine` khi hover và nhấp/nhấp đúp để chỉnh sửa nhanh trực tiếp.
- **REQ-007**: Định dạng dữ liệu nhập của 12 trường `ncc_*`:
  - Ngày tháng (`ncc_ngay_qt`, `ncc_ngay_tra_qt`): `<input type="date">`.
  - Số (`ncc_don_gia`): `<input type="number">`.
  - Tiến độ (`ncc_tatus`): `<select>` gồm `WAIT` (Chờ xử lý), `HEAT` (Đang nhiệt), `DONE` (Hoàn thành).
  - Nghiệm thu (`ncc_ket_qua_qc`): `<select>` gồm `PASS` (Đạt), `FAIL` (Không đạt).
  - Tệp đính kèm (`ncc_giando`, `ncc_file1`): Hỗ trợ tải tệp ảnh (.jpg, .png, dung lượng < 1MB) hoặc nhập trực tiếp liên kết URL.
  - Chuỗi văn bản (`ncc_id_lot_qt`, `ncc_name_qt`, `ncc_ket_qua_hrc`, `ncc_thongtinkhac1`, `ncc_thongtinkhac2`): `<input type="text">`.
- **SEC-001**: Tệp tải lên phải được kiểm tra định dạng MIME (image/jpeg, image/png) và giới hạn kích thước nghiêm ngặt $\le 1\text{MB}$ trước khi mã hóa Base64 lưu trữ/đồng bộ.
- **CON-001**: Tuân thủ tuyệt đối quy chuẩn Graphite Wireframe (`DESIGN-SYSTEM.md`): bo góc tối đa 2px (`rounded-xs`), kiểu chữ số `font-mono tabular-nums`.
- **GUD-001**: Lưu giữ trạng thái lọc và sắp xếp không làm giật lag giao diện, đảm bảo độ mượt với 27.000+ dòng dữ liệu.
- **PAT-001**: Sử dụng Popover / PopoverContent từ `@/components/ui/popover` với cơ chế render có điều kiện để tối ưu DOM.

---

## 2. Implementation Steps

### Implementation Phase 1: Sửa lỗi Sắp xếp Ngày & Kích hoạt Sort Quốc Gia / Xưởng

- GOAL-001: Khắc phục lỗi so sánh chuỗi ngày tháng và bổ sung sắp xếp cho Quốc Gia và Xưởng.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-001 | Viết test kiểm thử lỗi sắp xếp ngày tháng (`ngay_tao`, `ncc_ngay_tra_qt`) và sắp xếp `quoc_gia`, `phong_sx` trong `src/test/tracking-sorting-and-filters.test.ts` | Yes | 2026-11-10 |
| TASK-002 | Cập nhật kiểu `SortField` bao gồm `'quoc_gia'` trong `src/routes/tracking.tsx` | Yes | 2026-11-10 |
| TASK-003 | Chuyển đổi toàn bộ `switch (sortCol)` cho các cột ngày (`ngay_tao`, `ngay_gui_qt`, `ncc_ngay_qt`, `ncc_ngay_tra_qt`, `han_tra`) sang Epoch timestamp `parseFlexibleDate(val)?.getTime() ?? 0` | Yes | 2026-11-10 |
| TASK-004 | Thêm `case 'quoc_gia'` vào bộ sắp xếp và gắn props `field="quoc_gia"` & `field="phong_sx"` cùng `onDirectSort={handleToggleSort}` vào `<HeaderFilterCell>` | Yes | 2026-11-10 |

### Implementation Phase 2: Tái cấu trúc UI Bộ Lọc Cột (Distinct Values Popover Filter)

- GOAL-002: Thay thế khối "Sắp xếp cột này" bằng menu lọc giá trị đa chọn trực quan, cuộn tối đa 10 dòng.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-005 | Viết component `DistinctValueFilterPopover` tái sử dụng: thanh tìm kiếm, chọn/bỏ chọn tất cả, danh sách checkbox tối đa 10 dòng (`max-h-52 overflow-y-auto`), số lượng đếm mẫu cho từng giá trị | Yes | 2026-11-10 |
| TASK-006 | Loại bỏ `HeaderSortControls` khỏi các ô tiêu đề cột trong `src/routes/tracking.tsx` | Yes | 2026-11-10 |
| TASK-007 | Tích hợp `DistinctValueFilterPopover` cho các cột danh mục: `quoc_gia`, `phong_sx`, `doi_tuong_hang`, `vat_lieu`, `cty_qt`, `trang_thai`, `ncc_ket_qua_qc`, `ncc_tatus` | Yes | 2026-11-10 |
| TASK-008 | Duy trì bộ lọc dải ngày (Date Range Filter: Từ ngày - Đến ngày) chuyên biệt cho `ngay_tao` và `ngay_gui_qt` | Yes | 2026-11-10 |

### Implementation Phase 3: Mở rộng Chỉnh sửa Nhanh & Icon PenLine cho Toàn Bộ Cột Hợp Lệ

- GOAL-003: Cho phép chỉnh sửa nhanh các trường nghiệp vụ và 12 trường NCC với định dạng chuẩn, cô lập 7 trường bất biến.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-009 | Cập nhật danh sách `EDITABLE_FIELDS` và hàm kiểm tra `isFieldEditable(col)` loại trừ nghiêm ngặt 7 trường cố định (`ma_hang`, `ngay_tao`, `quoc_gia`, `phong_sx`, `doi_tuong_hang`, `id_ma_hang`, `cty_qt`) | Yes | 2026-11-10 |
| TASK-010 | Mở rộng component cell render: Thêm hiệu ứng hover hiển thị icon bút chì nhỏ `PenLine` cho các ô được phép sửa | Yes | 2026-11-10 |
| TASK-011 | Xây dựng trình chỉnh sửa chuyên biệt theo kiểu dữ liệu: Date picker cho ngày tháng, Select dropdown cho `ncc_tatus` (`WAIT`/`HEAT`/`DONE`) và `ncc_ket_qua_qc` (`PASS`/`FAIL`), Number input cho đơn giá/số lượng, File/URL uploader cho `ncc_giando` và `ncc_file1` | Yes | 2026-11-10 |
| TASK-012 | Cập nhật hàm đồng bộ hai chiều `syncWriteBack` truyền đúng payload của 12 trường NCC lên Google Apps Script Webhook | Yes | 2026-11-10 |

### Implementation Phase 4: Kiểm thử Tự động, Hồi quy & Nghiệm thu Toàn diện

- GOAL-004: Đảm bảo 100% kiểm thử tự động vượt qua và tuân thủ bộ quy tắc Design System.

| Task | Description | Completed | Date |
|---|---|---|---|
| TASK-013 | Chạy toàn bộ test suite `npm test` bao gồm design-system compliance và tracking tests | Yes | 2026-11-10 |
| TASK-014 | Kiểm tra build TypeScript `npx tsc --noEmit` không phát sinh cảnh báo kiểu | Yes | 2026-11-10 |
| TASK-015 | Đóng gói nghiệm thu và xuất báo cáo walkthrough cho người dùng | Yes | 2026-11-10 |

---

## 3. Alternatives

- **ALT-001**: Giữ nguyên sắp xếp chuỗi nhưng chuẩn hóa chuỗi về định dạng ISO `YYYY-MM-DD` trước khi so sánh. Bị từ chối vì tốn tài nguyên chuyển đổi chuỗi liên tục trên mỗi lần render/so sánh; so sánh số nguyên Epoch timestamp (`getTime()`) nhanh hơn 10x và hoàn toàn tin cậy.
- **ALT-002**: Cho phép sửa trực tiếp Mã hàng (`ma_hang`) trên bảng. Bị từ chối vì `ma_hang` là khóa định danh gắn liền với bản vẽ phôi và đơn đặt hàng PO; việc tùy tiện sửa trên bảng tracking sẽ làm gãy tính toàn vẹn liên kết với hệ thống AppSheet gốc.

---

## 4. Dependencies

- **DEP-001**: `@/lib/dynamo-data.ts` - Hàm `parseFlexibleDate` và các utility định dạng ngày tháng.
- **DEP-002**: `@/components/ui/popover.tsx` - Radix UI Popover primitive cho dropdown lọc.
- **DEP-003**: `lucide-react` - Các biểu tượng `Filter`, `ArrowUp`, `ArrowDown`, `PenLine`, `Check`, `Upload`, `X`.

---

## 5. Files

- **FILE-001**: `src/routes/tracking.tsx` - Giao diện chính bảng điều độ nhiệt luyện QT.
- **FILE-002**: `src/lib/dynamo-data.ts` - Mô hình dữ liệu và hàm phân tích ngày giờ.
- **FILE-003**: `src/test/tracking-sorting-and-filters.test.ts` - File unit test kiểm thử các tính năng mới.

---

## 6. Testing

- **TEST-001**: Kiểm thử so sánh ngày: Đảm bảo `5/11/2026` đứng trước `10/28/2026` khi sắp xếp tăng dần, và `10/28/2026` đứng đầu khi sắp xếp giảm dần.
- **TEST-002**: Kiểm thử sắp xếp `quoc_gia` và `phong_sx` trả về đúng thứ tự chữ cái A-Z và Z-A.
- **TEST-003**: Kiểm thử `HeaderFilterCell` không còn chứa chuỗi "Sắp xếp cột này:" trong DOM.
- **TEST-004**: Kiểm thử 7 cột bất biến (`ma_hang`, `ngay_tao`, `quoc_gia`, `phong_sx`, `doi_tuong_hang`, `id_ma_hang`, `cty_qt`) không xuất hiện icon `PenLine` và không cho phép kích hoạt `editingCell`.
- **TEST-005**: Kiểm thử 12 trường `ncc_*` kích hoạt chỉnh sửa thành công với đúng kiểu input tương ứng.

---

## 7. Risks & Assumptions

- **RISK-001**: Tải tệp ảnh kích thước lớn làm quá tải bộ nhớ và Payload của Google Apps Script Webhook.
  - *Giải pháp*: Kiểm soát chặn kích thước tối đa 1MB, khuyến khích nhập URL nếu có sẵn.
- **ASSUMPTION-001**: Cột `ngay_tao` lưu trên Google Sheet có thể ở dạng `M/D/YYYY HH:mm:ss` hoặc `D/M/YYYY HH:mm:ss`; bộ phân tích `parseFlexibleDate` xử lý linh hoạt cả 2 trường hợp.

---

## 8. Related Specifications / Further Reading

- [DESIGN-SYSTEM.md](./DESIGN-SYSTEM.md) - Graphite Wireframe UI Specification v2.2.0.
- [AGENTS.md](./AGENTS.md) - Superpowers Engineering Protocol & Subagent Orchestration.
