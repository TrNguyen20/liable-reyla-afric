# Kế Hoạch Tổng Thể: Tinh Gọn Header Toàn Trang v2.3 & Kiến Trúc Tam Ngữ (VI · EN · JA) Chuẩn Enterprise

> **Trạng thái**: Đã phê duyệt (Approved) — Tiến hành triển khai toàn diện.
> **Mục tiêu**:
> 1. Tinh gọn & hiện đại hóa Header toàn trang (Graphite Wireframe UI v2.3, h: 48px), chuẩn hóa tên Route: `LUÂN CHUYỂN QT` $\rightarrow$ `LUÂN CHUYỂN`, `LIÊN KẾT GOOGLE SHEETS` $\rightarrow$ `ĐỒNG BỘ`.
> 2. Triển khai Kiến trúc Quốc tế hóa Tam ngữ (Việt - Anh - Nhật) theo quy trình 3 giai đoạn chuẩn mực, có hệ thống Fallback đa tầng (JA $\rightarrow$ EN $\rightarrow$ VI), tích hợp Segmented Micro-Pill Switcher `[VI] [EN] [JA]` trên Header và đóng gói Blueprint cho hệ sinh thái Webapp tương lai.

---

## 📋 CHI TIẾT 3 GIAI ĐOẠN TRIỂN KHAI

### Giai Đoạn 1: Tinh Gọn Header v2.3, Chuẩn Hóa Tên Route & Khởi Tạo i18n Engine
1. **Chuẩn hóa nhãn Route**:
   - `[1] LUÂN CHUYỂN QT` $\rightarrow$ `[1] LUÂN CHUYỂN`
   - `[4] LIÊN KẾT GOOGLE SHEETS` $\rightarrow$ `[4] ĐỒNG BỘ`
   - Cập nhật trong `dynamo-shell.tsx`, `tracking.tsx`, `sync.tsx`, `DESIGN-SYSTEM.md`.
2. **Hiện đại hóa Header toàn trang**:
   - Chiều cao chuẩn `h-[48px]`.
   - Segmented Nav Rail siêu nét với viền `border-border/80`, chỉ báo tab active sắc sảo.
   - Tinh gọn cụm tiện ích phải (Góc nhìn, LedClock, Theme, User Capsule, Logout).
3. **Khởi tạo Native Type-Safe i18n Core (`src/i18n/`)**:
   - `src/i18n/types.ts`: Khai báo kiểu Locale (`'vi' | 'en' | 'ja'`) và Translation Key map.
   - `src/i18n/config.ts`: Cấu hình danh sách ngôn ngữ, fallback map (`ja` $\rightarrow$ `en` $\rightarrow$ `vi`).
   - `src/i18n/index.tsx`: React Context, `I18nProvider`, hook `useTranslation()` đồng bộ `localStorage` và `cookie`.
   - `src/i18n/formatters.ts`: Hỗ trợ định dạng thời gian, ca sản xuất chuẩn Nhật/Anh/Việt.
   - Tích hợp **Segmented Micro-Pill Switcher `[VI] [EN] [JA]`** trực tiếp trên Header, kết nối mượt mà với Context.

### Giai Đoạn 2: Xây Dựng Bộ Từ Điển 7 Namespace & Audit UI Tam Ngữ
1. **Thiết lập thư mục `src/i18n/locales/`**:
   - `vi/`: `common.json`, `nav.json`, `tracking.json`, `dashboard.json`, `orders.json`, `sync.json`, `telemetry.json`.
   - `en/`: Các file JSON tương ứng dịch thuật ngữ kỹ thuật công nghiệp chuẩn mực.
   - `ja/`: Các file JSON dịch thuật ngữ sản xuất Nhật Bản (製造業用語).
2. **Bảo vệ Bất biến Dữ liệu Kỹ thuật (Factory Data Invariants)**:
   - Tuyệt đối không dịch: Mã lô, Mã hàng, Đơn hàng, Phân xưởng (`PIN/INSERT/MOLD`), Mác thép (`SKD11/DC53`), Độ cứng (`58-62 HRC`), Trạng thái Andon (`WAIT/TRANSIT/STOCKED/PASS/FAIL`).
3. **Typography & Kerning Tiếng Nhật**:
   - Bổ sung cấu hình font trong `src/styles.css` với `Noto Sans JP` và tối ưu font-display.

### Giai Đoạn 3: Đóng Gói Template Chuẩn Mực & Xác Minh Tự Động
1. **Tài liệu hướng dẫn**: Xuất bản `docs/I18N_ARCHITECTURE_GUIDE.md` quy định tiêu chuẩn mở rộng đa ngôn ngữ cho toàn bộ các webapp tương lai của doanh nghiệp.
2. **Kiểm thử tự động**:
   - Bổ sung bài kiểm tra Vitest xác minh cơ chế Fallback i18n, tính toàn vẹn của Header mới và tên Route mới.
   - Chạy `npm test` và `npm run build` xác nhận không có lỗi biên dịch.
