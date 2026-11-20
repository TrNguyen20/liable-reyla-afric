---
name: qt-mes-i18n-audit
description: Quy trình kiểm toán, bóc tách và đồng bộ hóa đa ngữ 3 thứ tiếng (Tiếng Việt, English, Tiếng Nhật) trên Dynamo MES, bảo toàn test và tránh bẫy regex scanner. Sử dụng khi người dùng yêu cầu rà soát đa ngữ, bóc tách chuỗi hardcoded, kiểm tra đồng bộ vi/en/ja hoặc sửa lỗi i18n test.
---

# QT MES i18n Standardization & Audit Skill

## 1. Mục Tiêu & Nguyên Tắc Cốt Lõi
- Đảm bảo 100% chuỗi ký tự hiển thị được quốc tế hóa qua ma trận 3 ngôn ngữ:
  - `vi`: Tiếng Việt (Ngôn ngữ chuẩn nguồn - SSOT)
  - `en`: English (Tiếng Anh kỹ thuật cơ khí)
  - `ja`: 日本語 (Tiếng Nhật công nghiệp sản xuất)
- Bảo toàn 100% trạng thái PASS của toàn bộ 31 test suites trong repository.

## 2. Quy Trình 4 Bước Thực Hiện

### Bước 1: Quét Tĩnh Phát Hiện Chuỗi Tiếng Việt Chưa Bọc
Dùng node script quét ký tự có dấu `[\u00C0-\u1EF9]` bỏ qua comment:
```bash
node -e "
const fs = require('fs');
const content = fs.readFileSync('path/to/component.tsx', 'utf8');
const lines = content.split('\n');
const viRegex = /[\u00C0-\u1EF9]/;
lines.forEach((l, i) => {
  if (viRegex.test(l) && !l.includes('//') && !l.includes('/*') && !l.includes('t(')) {
    console.log((i + 1) + ': ' + l.trim());
  }
});
"
```

### Bước 2: Bổ Sung Từ Điển Đối Xứng (vi, en, ja)
Cập nhật đồng thời 3 file `src/i18n/locales/{vi,en,ja}/<namespace>.json`.
Chạy kiểm tra độ toàn vẹn đối xứng:
```bash
node scripts/verify_parity.cjs
```
Yêu cầu bắt buộc: `Total key parity diffs: 0`, `Total empty string values: 0`.

### Bước 3: Thay Thế Trong Component (Không Dùng Chuỗi Động Trong t())
- **Lỗi bẫy Regex Scanner (`TC-I18N-T4-05`)**:
  Hàm regex `t\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g` trong Vitest sẽ bóc sai nếu viết dạng `t('tracking.columns.' + col.key)`.
- **Giải pháp**: Dùng object mapping dictionary:
  ```tsx
  const COLUMN_LABEL_MAP: Record<string, string> = {
    ma_hang: 'tracking.columns.itemCode',
    // ...
  };
  // Trong JSX:
  {COLUMN_LABEL_MAP[col.key] ? (t(COLUMN_LABEL_MAP[col.key]) || col.label) : col.label}
  ```
- **Fallback chuẩn**:
  Luôn giữ nguyên chuỗi tiếng Việt gốc làm fallback:
  ```tsx
  {t('tracking.lotDetail.edit') || 'Chỉnh sửa'}
  ```

### Bước 4: Chạy Bộ Test Suite Xác Minh
```bash
npm test -- src/test/i18n-standardization.test.ts src/test/i18n-adversarial-stress.test.ts
npm test
```
Đảm bảo toàn bộ 31 test suites đều đạt trạng thái 100% Green.
