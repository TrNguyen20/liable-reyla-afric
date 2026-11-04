---
title: DYNAMO QT-MES Design System Specification
standard: Graphite Wireframe UI
version: 2.1.0
last_updated: 2026-11-04
status: Active (Single Source of Truth)
tags: [design-system, graphite-wireframe, industrial-mes, tokens, primitives, navigation]
---

# DYNAMO QT-MES DESIGN SYSTEM
## Tiêu Chuẩn Thiết Kế Giao Diện Điều Hành Sản Xuất Công Nghiệp (Graphite Wireframe UI)

---

## 📜 Lịch Sử Phiên Bản & Changelog (Revision History)

| Phiên bản | Ngày | Tác giả / Đội ngũ | Loại thay đổi | Nội dung tóm tắt |
| :--- | :--- | :--- | :--- | :--- |
| **v2.1.0** | 2026-11-04 | Dynamo MES Architecture Team | **ROUTING & ENHANCEMENT** | **Tái kích hoạt Dashboard & Orders và tinh gọn hệ thống:**<br>• Mở lại `/dashboard` (Tổng quan & Biên bản giao ca A4) và `/orders` (Chi tiết đơn hàng).<br>• Đồng bộ hóa toàn bộ góc bo 2px (`rounded-xs`) và lưới số liệu `font-mono tabular-nums` cho 2 trang mới mở.<br>• Dọn dẹp hoàn toàn 2 trang vệ tinh dư thừa `/materials` và `/audit-costs`.<br>• Mở rộng thanh điều hướng Header và Command Palette lên 4 trang chính thức: `[1] /tracking`, `[2] /dashboard`, `[3] /orders`, `[4] /sync`.<br>• Cập nhật bài kiểm tra tự động `TC-DS-05` và `app-routing.test.tsx`. |
| **v2.0.0** | 2026-11-04 | Dynamo MES Architecture Team | **BREAKING / MAJOR** | **Chuyển đổi toàn diện sang chuẩn Graphite Wireframe UI:**<br>• Cố định bo góc tối thiểu 2px (`rounded-xs`) trên toàn hệ thống.<br>• Bảng biểu và số liệu định lượng bắt buộc sử dụng `font-mono tabular-nums`.<br>• Chuẩn hóa mã chỉ báo trạng thái công nghiệp `[WAIT]`, `[TRANSIT]`, `[STOCKED]`, `[PASS]`, `[FAIL]`.<br>• Loại bỏ toàn bộ `rounded-xl`, `rounded-2xl`, bóng mờ nặng `shadow-2xl` và gradient AI.<br>• Tích hợp bộ kiểm thử tự động `src/test/design-system-compliance.test.ts`. |
| **v1.0.0** | 2026-10-14 | Dynamo MES Team | **INITIAL** | Khởi tạo giao diện MES trên TanStack Start, tích hợp Dark mode và bảng tính live Google Sheets. |

---

## 🎯 1. Nguyên Lý Cốt Lõi (Core Principles)

Hệ thống **DYNAMO QT-MES** là phần mềm điều hành xưởng nhiệt luyện, xi mạ và gia công chi tiết khuôn (PIN, INSERT, MOLD). Môi trường vận hành bao gồm màn hình máy tính để bàn (Desktop), máy tính xưởng và màn hình cảm ứng công nghiệp (Kiosk).

1. **Graphite Wireframe Aesthetic (Thẩm mỹ Khung dây Graphite)**:
   - Viền khung 1px sắc nét (`border-border` / `border-graphite`), nền card phẳng kỹ thuật, độ tương phản cao, loại bỏ trang trí dư thừa.
   - Bóng mờ tối giản (`shadow-2xs` hoặc `shadow-xs`), tuyệt đối không dùng bóng mờ nhòe lớn `shadow-xl`, `shadow-2xl`.
2. **Bo góc tối thiểu 2px (`rounded-xs` / `rounded-[2px]`)**:
   - Tất cả Card, Khung chứa bảng, Nút bấm (Button), Hộp thoại (Dialog/Modal), Ô nhập liệu (Input), Popover đều dùng `rounded-xs` (2px) hoặc `rounded-sm` (tối đa 4px cho tag/pill nhỏ).
   - Nghiêm cấm các góc bo tròn lớn kiểu consumer app (`rounded-lg`, `rounded-xl`, `rounded-2xl`).
3. **Bố cục Bảng biểu Monospaced (`font-mono tabular-nums`)**:
   - Mọi dữ liệu kỹ thuật: Mã lô (`ID_Key`), Số đặt hàng (`So_DatHang`), Mã hàng (`ma_hang`), Mác thép (`vat_lieu`), Độ cứng (`do_cung`), Khối lượng (`kg_Lot`), Số lượng (`so_luong`), Ngày tháng (`ngay_gui_QT`, `han_tra`) phải hiển thị bằng font đơn cách để gióng hàng thẳng tắp theo trục dọc.
4. **Chỉ báo Trạng thái Công nghiệp (Industrial Instrumentation & Andon)**:
   - Trạng thái phản ánh như bảng đồng hồ kỹ thuật: kèm tiền tố mã hóa viền wireframe (`[WAIT]`, `[TRANSIT]`, `[STOCKED]`, `[PASS]`, `[FAIL]`).
   - Đèn LED tín hiệu sử dụng nhịp xung công nghiệp (`fx-run-dot`, `andon-pulse`), không dùng hiệu ứng ping tiêu dùng.

---

## 🧱 2. Kiến Trúc 3 Tầng Giao Diện

```
TẦNG 1: DESIGN TOKENS        -> src/styles.css (@theme inline, :root, .dark)
TẦNG 2: UI PRIMITIVES        -> src/components/ui/ (button, card, badge, dialog, input, table...)
TẦNG 3: VIEWS & COMPOSITES   -> src/components/ & src/routes/ (dynamo-shell, telemetry, tracking, dashboard, orders, sync, login)
```

### 2.1 Tầng 1: Design Tokens (`src/styles.css`)

#### Bán kính Bo góc (Border Radius):
```css
@theme inline {
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 4px;
  --radius-xl: 6px;
  --radius-2xl: 8px;
}

:root {
  --radius: 2px; /* Gốc chuẩn hóa 2px */
}

.dark {
  --radius: 2px;
}
```

#### Bảng màu Công nghiệp (OKLCH Format):
| Tên biến | Token Class | Vai trò | Light Value | Dark Value |
| :--- | :--- | :--- | :--- | :--- |
| `--background` | `bg-background` | Nền canvas chính | `oklch(0.968 0.003 250)` | `oklch(0.18 0.02 250)` |
| `--card` | `bg-card` | Khối bảng / Thẻ kỹ thuật | `oklch(1 0 0)` | `oklch(0.24 0.02 250)` |
| `--border` | `border-border` | Viền khung wireframe 1px | `oklch(0.89 0.008 250)` | `oklch(0.34 0.02 250)` |
| `--primary` | `bg-primary`, `text-primary` | Màu nhận diện điều độ | `oklch(0.585 0.166 149.3)` | `oklch(0.68 0.16 150)` |
| `--run` | `bg-run`, `text-run` | Trạng thái Đang chạy / Hoàn tất | `var(--primary)` | `oklch(0.68 0.16 150)` |
| `--warning` | `bg-warning`, `text-warning` | Cảnh báo / Chờ xuất xưởng | `oklch(0.80 0.16 85)` | `oklch(0.82 0.15 85)` |
| `--destructive`| `bg-destructive` | Sự cố / QC Không đạt / Lỗi | `oklch(0.55 0.22 27)` | `oklch(0.63 0.22 27)` |
| `--info` | `bg-info`, `text-info` | Thông tin / Tại Vendor | `oklch(0.62 0.17 250)` | `oklch(0.72 0.14 250)` |
| `--graphite` | `bg-graphite` | Tông than chì Graphite | `oklch(0.22 0.02 250)` | `oklch(0.18 0.02 250)` |

#### Typography:
- **Font Display / Giao diện chính**: `"Be Vietnam Pro", system-ui, sans-serif`.
- **Font Monospaced / Kỹ thuật & Bảng biểu**: `"JetBrains Mono", ui-monospace, monospace` (kèm `tabular-nums` cho số liệu).

---

### 2.2 Tầng 2: UI Primitives (`src/components/ui/`)

| Thành phần | File nguồn | Quy chuẩn bắt buộc |
| :--- | :--- | :--- |
| **Button** | `src/components/ui/button.tsx` | `rounded-xs` (2px), chiều cao h-8 (sm) hoặc h-9 (default), phản hồi chạm `active:scale-[0.98]`. |
| **Card** | `src/components/ui/card.tsx` | `rounded-xs border border-border bg-card shadow-2xs`. Cấm `rounded-xl`. |
| **Badge** | `src/components/ui/badge.tsx` | `rounded-xs font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5`. |
| **Dialog / Modal** | `src/components/ui/dialog.tsx` | `sm:rounded-xs border border-border shadow-lg p-5`. Header có đường kẻ phân cách wireframe. |
| **Input / Select** | `src/components/ui/input.tsx` | `rounded-xs border border-input bg-background font-mono text-xs px-2.5 py-1.5`. |
| **Table** | `src/components/ui/table.tsx` | Bảng gióng hàng theo layout `table-layout: fixed`, `font-mono tabular-nums` cho các ô số liệu. |

---

### 2.3 Tầng 3: Composite Views & Layout

#### 1. App Shell (`src/components/dynamo-shell.tsx`)
- Navigation Tabs: `rounded-xs font-mono text-[12px] font-bold px-3 py-1.5`.
  - `[1] LUÂN CHUYỂN QT` (`/tracking`)
  - `[2] TỔNG QUAN` (`/dashboard`)
  - `[3] ĐƠN ĐẶT HÀNG` (`/orders`)
  - `[4] LIÊN KẾT GOOGLE SHEETS` (`/sync`, phân quyền `admin`)
- Profile Badge: Khối squircle 2px `size-6.5 rounded-xs font-mono font-black`.
- Realtime Clock: Đồng hồ LED công nghiệp `led-clock rounded-xs font-mono tabular-nums`.

#### 2. Shopfloor Telemetry Live Bar (`src/components/shopfloor-telemetry.tsx`)
- Thanh tải phân xưởng PIN / INSERT / MOLD với vạch chia wireframe 1px, tỷ lệ hiển thị `font-mono tabular-nums`.
- Nút Làm Mới Tinh Gọn (Shift+R): Bo góc `rounded-xs`, hiệu ứng xoay đồng bộ.

#### 3. Main Tracking Dashboard (`src/routes/tracking.tsx`)
- Cấu trúc bảng 17 cột: Header cố định (`sticky top-0 z-40`), Cột Checkbox (`sticky left-0`) và Mã lô (`sticky left-[44px]`).
- Mã trạng thái Logistics & QC công nghiệp:
  - `Chờ xuất xưởng`: `border-warning/50 bg-warning/10 text-warning [WAIT]`
  - `Đang tại Vendor`: `border-info/50 bg-info/10 text-info [TRANSIT]`
  - `Đã nhập kho`: `border-run/50 bg-run/10 text-run [STOCKED]`
  - `Đạt`: `border-run/50 bg-run/10 text-run [QC:PASS]`
  - `Không đạt`: `border-destructive/50 bg-destructive/10 text-destructive andon-pulse [QC:FAIL]`
  - `Chưa kiểm tra`: `border-border/80 bg-secondary/60 text-muted-foreground [QC:PENDING]`
- Thanh tác vụ nổi (Floating Batch Action Bar): Cố định đáy màn hình với `rounded-xs border border-border/80 bg-card/98 shadow-xl max-w-[calc(100vw-1.5rem)]`.

#### 4. System Overview Dashboard (`src/routes/dashboard.tsx`)
- 5 Thẻ chỉ báo KPI kỹ thuật với viền sắc 1px và thanh đồng hồ đo OTD (`meter`).
- Pipeline tiến trình trực quan 4 công đoạn (`Chờ xuất xưởng` -> `Tại Vendor` -> `Về kho chờ QC` -> `Hoàn tất`).
- Bảng phân tích điểm nghẽn (Bottlenecks) theo đối tác và phân xưởng với biểu đồ thanh tải tỷ lệ.
- Hộp thoại Biên bản bàn giao ca sản xuất A4 tích hợp in chuẩn kỹ thuật (Printable SOP-MES-08).

#### 5. Orders Management View (`src/routes/orders.tsx`)
- Danh mục Master-Detail 2 cột: Cột trái liệt kê danh sách đơn đặt hàng với bộ lọc tức thì và số mã linh kiện.
- Cột phải hiển thị chi tiết mã hàng, mác thép, độ cứng, kích thước, số lượng, đơn vị tính, đơn giá và thành tiền theo `font-mono tabular-nums`.
- Nút chuyển đổi mật độ hiển thị (Nén / Vừa) và nút xuất dữ liệu CSV đơn hàng.

---

## 🚫 3. Điều Kiện Phủ Định Tuyệt Đối (Negative Constraints)

Khi can thiệp hoặc viết thêm mã nguồn mới, **TUYỆT ĐỐI KHÔNG**:
1. ❌ **KHÔNG** sử dụng các class bo tròn lớn: `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` (ngoại lệ duy nhất cho `rounded-full` là các chấm tròn đèn LED tín hiệu `size-1.5` hoặc `size-2`).
2. ❌ **KHÔNG** sử dụng bóng mờ nhòe lớn: `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`. Chỉ sử dụng `shadow-2xs` hoặc viền `border border-border`.
3. ❌ **KHÔNG** sử dụng gradient màu tím AI (`from-purple-500`, `to-indigo-500`, v.v.).
4. ❌ **KHÔNG** hiển thị số lượng, khối lượng hoặc mã kỹ thuật bằng font proportional thông thường; bắt buộc dùng `font-mono tabular-nums`.
5. ❌ **KHÔNG** phá vỡ cấu trúc responsive trên máy tính xưởng: thanh công cụ và dialog không được tràn màn hình theo chiều ngang (`overflow-x-hidden`, `max-w-[calc(100vw-X)]`).

---

## 🤖 4. Cơ Chế Tự Kiểm Tra & Duy Trì (Automated Enforcement)

Mọi commit hoặc pull request phải vượt qua bài kiểm tra tự động tại:
- `src/test/design-system-compliance.test.ts`
- `src/test/app-routing.test.tsx`

Quy trình kích hoạt:
```powershell
npm test
```
Bài kiểm tra sẽ tự động quét mã nguồn và chặn đứng (throw error) nếu:
- `--radius` trong `src/styles.css` khác `2px`.
- Xuất hiện class cấm (`rounded-lg`, `rounded-xl`, `rounded-2xl`, v.v.) trong `src/components/ui/` hoặc các màn hình chính (`tracking.tsx`, `dashboard.tsx`, `orders.tsx`).
- Các cell số liệu trên bảng điều độ bị thiếu class `font-mono` hoặc `tabular-nums`.
- Tuyến đường điều hướng trên App Shell không khớp với định tuyến hệ thống.
