# HƯỚNG DẪN KIẾN TRÚC QUỐC TẾ HÓA TAM NGỮ (VI · EN · JA) CẤP ENTERPRISE
## DYNAMO VIETNAM MES & ECOSYSTEM BLUEPRINT

> **Phiên bản**: v1.0.0 (Graphite Enterprise Edition)  
> **Ngôn ngữ hỗ trợ**: Tiếng Việt (`vi`), English (`en`), 日本語 (`ja`)  
> **Kiến trúc cốt lõi**: Native Type-Safe i18n Engine (Zero External Dependency, SSR-Safe, Hydration Proof)

---

## 1. TỔNG QUAN KIẾN TRÚC (ARCHITECTURE OVERVIEW)

Hệ thống quốc tế hóa của Dynamo MES được thiết kế theo tiêu chuẩn công nghiệp Nhật Bản (JIS) và giải pháp kiến trúc B2B:

```
src/
├── i18n/
│   ├── index.tsx                     # React Context Provider & hook useTranslation()
│   ├── config.ts                     # Cấu hình supportedLocales, fallback map, metadata
│   ├── types.ts                      # Định nghĩa kiểu TypeScript Type-safe
│   ├── formatters.ts                 # Bộ định dạng Ngày, Giờ, Số lượng, Ca làm việc theo Locale
│   └── locales/
│       ├── vi/                       # Từ điển Tiếng Việt (Default Locale)
│       │   ├── common.json           # Nút bấm, vai trò, cảnh báo, thông báo
│       │   ├── nav.json              # Điều hướng: Luân chuyển, Tổng quan, Đơn hàng, Đồng bộ
│       │   ├── tracking.json         # Bảng điều độ: 15 cột, phân xưởng, bộ lọc, mật độ
│       │   ├── dashboard.json        # Biên bản bàn giao ca A4, KPI, biểu đồ
│       │   ├── orders.json           # Chi tiết đơn đặt hàng, tìm kiếm linh kiện
│       │   ├── sync.json             # Liên kết Google Sheets, trạng thái webhook
│       │   └── telemetry.json        # Trực ca xưởng, tải phân xưởng, Andon Live Hub
│       ├── en/                       # Từ điển Tiếng Anh kỹ thuật
│       │   └── ... (7 namespace tương ứng)
│       └── ja/                       # Từ điển Tiếng Nhật sản xuất (製造用語)
│           └── ... (7 namespace tương ứng)
```

### 1.1 Chuỗi Fallback Đa Tầng (Fallback Hierarchy)
Khi một từ khóa (translation key) bị thiếu trong một ngôn ngữ, hệ thống tự động tra cứu tuần tự:
- **Người dùng chọn `ja` (Tiếng Nhật)**: Nếu thiếu $\rightarrow$ tìm trong `en` $\rightarrow$ nếu thiếu $\rightarrow$ tìm trong `vi` (Gốc).
- **Người dùng chọn `en` (Tiếng Anh)**: Nếu thiếu $\rightarrow$ tìm trong `vi` (Gốc).
- **Trường hợp xấu nhất**: Hiển thị chính mã key (ví dụ: `nav.tracking`). Không bao giờ làm crash ứng dụng.

### 1.2 Cơ Chế Lưu Trữ Song Song (Storage Sync)
- **Client**: Lưu tại `localStorage.getItem('dynamo-locale')`.
- **Server SSR**: Đồng bộ tại cookie `dynamo-locale=...; path=/; max-age=31536000; SameSite=Lax`.
- **Lợi ích**: Khi SSR Nitro kết xuất trang, máy chủ đọc cookie để render HTML đúng ngôn ngữ ngay từ byte đầu tiên, triệt tiêu 100% hiện tượng flash giật nhãn hoặc lỗi Hydration Mismatch.

---

## 2. QUY TẮC BẤT BIẾN DỮ LIỆU KỸ THUẬT XƯỞNG (FACTORY DATA INVARIANTS)

> [!CAUTION]
> **CẢNH BÁO AN TOÀN SẢN XUẤT**: Tuyệt đối không bao giờ được dịch các trường dữ liệu kỹ thuật sau sang bất kỳ ngôn ngữ nào. Việc dịch nhầm các trường này sẽ làm sai lệch mã QR/barcode truy vết và gây lỗi gia công nghiêm trọng:

1. **Mã định danh duy nhất**: `ID_Key` (Mã lô), `So_DatHang` (Đơn hàng), `ma_hang` (Mã linh kiện).
2. **Mã phân xưởng**: `PIN`, `INSERT`, `MOLD`.
3. **Mác thép & Vật liệu kỹ thuật**: `SKD11`, `DC53`, `SUS420`, `S50C`, `HPM38` (Theo tiêu chuẩn JIS G 4404 / AISI).
4. **Chỉ số độ cứng Rockwell**: `58-62 HRC`, `44±1 HRC`.
5. **Trạng thái Andon Lean**: `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`.
6. **Tên pháp nhân đối tác**: `YAMAICHI`, `PROVISION`.

---

## 3. HƯỚNG DẪN SỬ DỤNG TRONG REACT COMPONENTS

### 3.1 Sử Dụng Hook `useTranslation`
```tsx
import { useTranslation } from '@/i18n';

export function MyComponent() {
  const { t, locale, setLocale, locales } = useTranslation();

  return (
    <div>
      {/* Lấy nhãn từ namespace nav */}
      <h2>{t('nav.tracking')}</h2>

      {/* Lấy nhãn từ namespace common */}
      <button onClick={() => setLocale('ja')}>
        {t('common.save')}
      </button>

      {/* Thay thế biến động {count} */}
      <span>{t('tracking.actions.selectedCount', { count: 5 })}</span>
    </div>
  );
}
```

### 3.2 Định Dạng Ngày Tháng & Ca Sản Xuất Chuẩn Hóa
```tsx
import { formatDate, formatTime, formatShift, formatNumber } from '@/i18n/formatters';

// Định dạng ngày theo văn hóa từng nước:
// vi: 11/04/2026 | en: 04/11/2026 | ja: 2026/04/11 (hoặc 2026年04月11日 nếu full: true)
formatDate(new Date(), locale);

// Định dạng ca sản xuất:
// vi: Ca 1 | en: Shift 1 | ja: 1直
formatShift(1, locale);

// Định dạng số lượng:
formatNumber(28442, locale); // vi/en: 28,442 | ja: 28,442
```

---

## 4. HƯỚNG DẪN MỞ RỘNG (SCALING & REUSABILITY)

### 4.1 Thêm Ngôn Ngữ Thứ 4 (Ví dụ: Tiếng Trung `zh` hoặc Tiếng Hàn `ko`) trong 3 Bước:
1. **Bước 1**: Mở `src/i18n/types.ts` $\rightarrow$ bổ sung `export type Locale = 'vi' | 'en' | 'ja' | 'zh';`.
2. **Bước 2**: Mở `src/i18n/config.ts` $\rightarrow$ thêm `'zh'` vào `SUPPORTED_LOCALES`, khai báo metadata và chuỗi fallback `zh: ['en', 'vi']`.
3. **Bước 3**: Tạo thư mục `src/i18n/locales/zh/` $\rightarrow$ copy 7 file JSON từ `vi/` hoặc `en/` sang và dịch nội dung.
*(Toàn bộ UI, bộ chuyển ngữ và cơ chế lưu trữ tự động nhận diện ngôn ngữ mới mà không cần sửa code giao diện).*

### 4.2 Tái Sử Dụng Cho 10 Webapp Khác Trong Doanh Nghiệp (ERP, WMS, QMS):
- Sao chép nguyên vẹn thư mục `src/i18n/` sang dự án mới.
- Bọc `<I18nProvider>` quanh Root Component của dự án đó.
- Kế thừa ngay lập tức toàn bộ từ điển công nghiệp chuẩn mực và giao diện chuyển ngữ siêu nhẹ!
