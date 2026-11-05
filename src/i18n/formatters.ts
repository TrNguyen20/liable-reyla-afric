import type { Locale } from './types';

/**
 * Định dạng Ngày theo tiêu chuẩn của từng Locale:
 * - vi: DD/MM/YYYY
 * - en: MM/DD/YYYY hoặc DD/MM/YYYY
 * - ja: YYYY/MM/DD hoặc YYYY年MM月DD日
 */
export function formatDate(dateInput: Date | string | number, locale: Locale = 'vi', options?: { full?: boolean }): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return String(dateInput);

  if (locale === 'ja') {
    if (options?.full) {
      return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
    }
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
  }

  if (locale === 'en') {
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  }

  // Tiếng Việt (Default): DD/MM/YYYY
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Định dạng Giờ theo Locale
 */
export function formatTime(dateInput: Date | string | number, locale: Locale = 'vi'): string {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';

  return d.toLocaleTimeString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Định dạng Ca sản xuất theo văn hóa nhà máy:
 * - vi: Ca 1, Ca 2, Ca 3
 * - en: Shift 1, Shift 2, Shift 3
 * - ja: 1直, 2直, 3直
 */
export function formatShift(shiftNumber: number | string, locale: Locale = 'vi'): string {
  const num = Number(shiftNumber) || 1;
  if (locale === 'ja') return `${num}直`;
  if (locale === 'en') return `Shift ${num}`;
  return `Ca ${num}`;
}

/**
 * Định dạng số học và phân cách hàng nghìn
 */
export function formatNumber(val: number, locale: Locale = 'vi'): string {
  if (typeof val !== 'number' || Number.isNaN(val)) return '0';
  const loc = locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN';
  return new Intl.NumberFormat(loc).format(val);
}
