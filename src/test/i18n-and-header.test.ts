import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { formatDate, formatShift, formatTime, formatNumber } from '../i18n/formatters';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, FALLBACK_CHAIN } from '../i18n/config';

describe('DYNAMO MES: Header v2.3 & Trilingual i18n Architecture Tests', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const dynamoShellPath = path.join(rootDir, 'src/components/dynamo-shell.tsx');
  const trackingPath = path.join(rootDir, 'src/routes/tracking.tsx');
  const syncPath = path.join(rootDir, 'src/routes/sync.tsx');
  const stylesPath = path.join(rootDir, 'src/styles.css');
  const designSystemPath = path.join(rootDir, 'DESIGN-SYSTEM.md');

  it('TC-HDR-01: Header toàn trang đạt chuẩn h-[48px] và tích hợp Segmented Nav Rail', () => {
    const shellSrc = fs.readFileSync(dynamoShellPath, 'utf-8');
    expect(shellSrc).toContain('h-[48px]');
    expect(shellSrc).toContain('border-border/70 bg-secondary/35 p-0.5');

    // Kiểm tra tên route mới trong nav: LUÂN CHUYỂN và ĐỒNG BỘ
    expect(shellSrc).toContain("label: 'LUÂN CHUYỂN'");
    expect(shellSrc).toContain("label: 'ĐỒNG BỘ'");
    expect(shellSrc).not.toContain("label: 'LUÂN CHUYỂN QT'");
    expect(shellSrc).not.toContain("label: 'LIÊN KẾT GOOGLE SHEETS'");
  });

  it('TC-HDR-02: Đồng bộ tên route [1] LUÂN CHUYỂN và [4] ĐỒNG BỘ trên toàn hệ thống', () => {
    const trackingSrc = fs.readFileSync(trackingPath, 'utf-8');
    expect(trackingSrc).toContain('[1] LUÂN CHUYỂN');
    expect(trackingSrc).not.toContain('[1] LUÂN CHUYỂN QT');

    const syncSrc = fs.readFileSync(syncPath, 'utf-8');
    expect(syncSrc).toContain('[4] ĐỒNG BỘ');
    expect(syncSrc).not.toContain('[4] LIÊN KẾT GOOGLE SHEETS');

    const dsSrc = fs.readFileSync(designSystemPath, 'utf-8');
    expect(dsSrc).toContain('[1] LUÂN CHUYỂN');
    expect(dsSrc).toContain('[4] ĐỒNG BỘ');
  });

  it('TC-HDR-03: Header tích hợp Trilingual Segmented Micro-Pill Switcher (VI | EN | JA)', () => {
    const shellSrc = fs.readFileSync(dynamoShellPath, 'utf-8');
    expect(shellSrc).toContain('useTranslation');
    expect(shellSrc).toContain('locales.map');
    expect(shellSrc).toContain('item.shortLabel');
    expect(shellSrc).toContain('setLocale(item.code)');
  });

  it('TC-I18N-01: Cấu hình và từ điển 7 namespaces tồn tại đầy đủ cho 3 ngôn ngữ', () => {
    expect(SUPPORTED_LOCALES).toEqual(['vi', 'en', 'ja']);
    expect(DEFAULT_LOCALE).toBe('vi');
    expect(FALLBACK_CHAIN.ja).toEqual(['en', 'vi']);
    expect(FALLBACK_CHAIN.en).toEqual(['vi']);

    const locales = ['vi', 'en', 'ja'];
    const namespaces = ['common', 'nav', 'tracking', 'dashboard', 'orders', 'sync', 'telemetry'];

    for (const loc of locales) {
      for (const ns of namespaces) {
        const filePath = path.join(rootDir, `src/i18n/locales/${loc}/${ns}.json`);
        expect(fs.existsSync(filePath), `Tệp từ điển ${loc}/${ns}.json phải tồn tại`).toBe(true);
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(Object.keys(content).length).toBeGreaterThan(0);
      }
    }
  });

  it('TC-I18N-02: Bộ định dạng Formatters theo Locale (Ngày, Giờ, Ca kíp, Số học)', () => {
    // 1. Kiểm tra Ca sản xuất (Shift)
    expect(formatShift(1, 'vi')).toBe('Ca 1');
    expect(formatShift(2, 'en')).toBe('Shift 2');
    expect(formatShift(3, 'ja')).toBe('3直');

    // 2. Kiểm tra Ngày theo văn hóa địa phương
    const testDate = new Date('2026-11-05T12:00:00Z');
    expect(formatDate(testDate, 'vi')).toContain('05/11/2026');
    expect(formatDate(testDate, 'en')).toContain('11/05/2026');
    expect(formatDate(testDate, 'ja')).toContain('2026/11/05');
    expect(formatDate(testDate, 'ja', { full: true })).toBe('2026年11月05日');

    // 3. Phân cách hàng nghìn số học
    expect(formatNumber(28442, 'vi')).toBe('28.442');
  });

  it('TC-I18N-03: Cấu hình Font tiếng Nhật và Kerning Balance trong CSS', () => {
    const css = fs.readFileSync(stylesPath, 'utf-8');
    expect(css).toContain('Noto Sans JP');
    expect(css).toContain('Hiragino Sans');
  });
});
