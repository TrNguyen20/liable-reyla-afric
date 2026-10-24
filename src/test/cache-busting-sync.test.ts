import { describe, it, expect } from 'vitest';
import { sheetCsvUrl } from '@/lib/dynamo-source';

describe('Cache-Busting and Instant Refresh Unit Tests', () => {
  const sampleUrl = 'https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/edit#gid=1963478526';

  it('TC-CB-01: sheetCsvUrl tự động đính kèm tham số _t khi bustCache = true (mặc định)', () => {
    const csvUrl = sheetCsvUrl(sampleUrl);
    expect(csvUrl).not.toBeNull();
    expect(csvUrl).toContain('/export?format=csv&gid=1963478526&_t=');
    
    // Kiểm tra timestamp là số hợp lệ
    const timestampMatch = csvUrl?.match(/&_t=(\d+)/);
    expect(timestampMatch).not.toBeNull();
    const timestamp = Number(timestampMatch?.[1]);
    expect(Number.isFinite(timestamp)).toBe(true);
    expect(timestamp).toBeGreaterThan(1700000000000);
  });

  it('TC-CB-02: sheetCsvUrl không đính kèm _t khi bustCache = false', () => {
    const csvUrl = sheetCsvUrl(sampleUrl, false);
    expect(csvUrl).not.toBeNull();
    expect(csvUrl).toBe('https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/edit/export?format=csv&gid=1963478526'.replace('/edit/export', '/export'));
    expect(csvUrl).not.toContain('&_t=');
  });

  it('TC-CB-03: Mỗi lần gọi sheetCsvUrl(url, true) tạo ra timestamp mới độc lập', async () => {
    const url1 = sheetCsvUrl(sampleUrl, true);
    await new Promise((r) => setTimeout(r, 10));
    const url2 = sheetCsvUrl(sampleUrl, true);
    expect(url1).not.toBe(url2);
  });
});
