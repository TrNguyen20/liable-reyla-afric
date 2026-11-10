import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseFlexibleDate, dateTime, date } from '@/lib/dynamo-data';

describe('Tracking Grid Enhancements & Bug Fixes Suite', () => {
  describe('TC-DATE-01: Flexible Date & DateTime Parsing', () => {
    it('parses Google Sheets format "10/28/2026 18:04:16" correctly without Invalid Date', () => {
      const parsed = parseFlexibleDate('10/28/2026 18:04:16');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(9); // 0-indexed: October = 9
      expect(parsed?.getDate()).toBe(28);
      expect(parsed?.getHours()).toBe(18);
      expect(parsed?.getMinutes()).toBe(4);
      expect(parsed?.getSeconds()).toBe(16);

      const formatted = dateTime('10/28/2026 18:04:16');
      expect(formatted).not.toContain('Invalid Date');
      expect(formatted).toMatch(/28\/10\/2026/);
      expect(formatted).toMatch(/18:04/);
    });

    it('parses single-digit date "5/11/2026 7:51:15" correctly', () => {
      const parsed = parseFlexibleDate('5/11/2026 7:51:15');
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2026);
      expect(parsed?.getMonth()).toBe(4); // May = 4
      expect(parsed?.getDate()).toBe(11);

      const formatted = dateTime('5/11/2026 7:51:15');
      expect(formatted).not.toContain('Invalid Date');
      expect(formatted).toMatch(/11\/05\/2026/);
    });

    it('parses standard ISO date "2026-10-28" without timezone regression', () => {
      const formatted = date('2026-10-28');
      expect(formatted).not.toContain('Invalid Date');
      expect(formatted).toMatch(/28\/10\/2026/);
    });

    it('handles empty or undefined values gracefully', () => {
      expect(parseFlexibleDate('')).toBeNull();
      expect(parseFlexibleDate(undefined)).toBeNull();
      expect(dateTime('')).toBe('—');
      expect(dateTime(undefined as any)).toBe('—');
      expect(date('')).toBe('—');
    });
  });

  describe('TC-GRID-02: Tracking Table UI Controls Invariants', () => {
    const trackingTsx = fs.readFileSync(path.resolve(__dirname, '../routes/tracking.tsx'), 'utf-8');

    it('includes 500 and 1000 in PAGE_SIZES pagination options', () => {
      expect(trackingTsx).toMatch(/PAGE_SIZES\s*=\s*\[[^\]]*500[^\]]*1000[^\]]*\]/);
    });

    it('renders an interactive number input for direct page jumping', () => {
      expect(trackingTsx).toMatch(/<input[^>]*type="number"[^>]*value=\{jumpPageInput\}/);
      expect(trackingTsx).toContain('handleJumpPage');
    });

    it('enforces truncate and overflow prevention on ma_hang sticky column to prevent text overlap', () => {
      // Must contain overflow-hidden on the cell and truncate on the button/span
      expect(trackingTsx).toMatch(/overflow-hidden\s+\$\{isSelected/);
      expect(trackingTsx).toMatch(/truncate\s+max-w-full\s+block\s+text-left/);
    });

    it('renders inline edit triggers with PenLine icon on editable fields', () => {
      // so_luong
      expect(trackingTsx).toMatch(/startInlineEdit\(r\.ID_Key,\s*'so_luong'/);
      // vat_lieu
      expect(trackingTsx).toMatch(/startInlineEdit\(r\.ID_Key,\s*'vat_lieu'/);
      // do_cung
      expect(trackingTsx).toMatch(/startInlineEdit\(r\.ID_Key,\s*'do_cung'/);
      // ghi_chu
      expect(trackingTsx).toMatch(/startInlineEdit\(r\.ID_Key,\s*'ghi_chu'/);
      // PenLine icon
      expect(trackingTsx).toMatch(/<PenLine\s+size=\{10\}/);
    });

    it('renders Popover filters for dynamic columns', () => {
      // ngay_tao filter
      expect(trackingTsx).toContain('field="ngay_tao"');
      expect(trackingTsx).toContain('createdFrom');
      expect(trackingTsx).toContain('createdTo');

      // doi_tuong_hang filter
      expect(trackingTsx).toContain('field="doi_tuong_hang"');
      expect(trackingTsx).toContain('targetItemSearch');

      // trang_thai filter
      expect(trackingTsx).toContain('field="trang_thai"');
      expect(trackingTsx).toContain('sheetStatusSearch');

      // ncc_ket_qua_qc filter
      expect(trackingTsx).toContain('field="ncc_ket_qua_qc"');
      expect(trackingTsx).toContain('vendorQcVerdicts');
    });

    it('expands SortField to support dynamic operational and vendor columns', () => {
      expect(trackingTsx).toContain("'ngay_tao'");
      expect(trackingTsx).toContain("'thanh_tien'");
      expect(trackingTsx).toContain("'ncc_ngay_qt'");
    });

    it('TC-TOOLBAR-CLEANUP: eliminates redundant filter elements and positions clear filter next to reset col widths', () => {
      // 1. Redundant active filter pill banner must not exist
      expect(trackingTsx).not.toContain("tracking.actions.filtering");
      expect(trackingTsx).not.toMatch(/Đang lọc \(\$\{activeFilters\.length\}\):/);

      // 2. Redundant workshop toolbar button must not exist
      expect(trackingTsx).not.toContain("<Layers");
      expect(trackingTsx).not.toContain("tracking.workshops.filterTooltip");

      // 3. Redundant matched count badge on toolbar must not exist
      expect(trackingTsx).not.toContain("tracking.toolbars.matched");

      // 4. Conditional Xoa tat ca loc button must be placed next to handleResetAllColWidths
      const resetColIdx = trackingTsx.indexOf('onClick={handleResetAllColWidths}');
      const resetFiltersIdx = trackingTsx.indexOf('onClick={resetAllFilters}');
      expect(resetColIdx).toBeGreaterThan(0);
      expect(resetFiltersIdx).toBeGreaterThan(resetColIdx);
      // Ensure resetAllFilters is in close proximity after handleResetAllColWidths (within 1200 chars)
      expect(resetFiltersIdx - resetColIdx).toBeLessThan(1200);
    });

    it('TC-ACTIVE-FILTERS-SYNC: registers all 6 dynamic column filters into activeFilters with smart formatting and i18n', () => {
      // 1. Khoảng Ngày tạo
      expect(trackingTsx).toContain("key: 'createdDate'");
      expect(trackingTsx).toContain("t('tracking.columns.createdDate')");
      expect(trackingTsx).toContain("→");
      expect(trackingTsx).toContain("≥");
      expect(trackingTsx).toContain("≤");

      // 2. Quốc gia
      expect(trackingTsx).toContain("key: 'countries'");
      expect(trackingTsx).toContain("t('tracking.columns.country')");

      // 3. Đối tượng hàng
      expect(trackingTsx).toContain("key: 'targetItems'");
      expect(trackingTsx).toContain("t('tracking.columns.targetItem')");

      // 4. Trạng thái gốc
      expect(trackingTsx).toContain("key: 'sheetStatuses'");
      expect(trackingTsx).toContain("t('tracking.columns.sheetStatus')");

      // 5. Nghiệm thu QC NCC
      expect(trackingTsx).toContain("key: 'vendorQcVerdicts'");
      expect(trackingTsx).toContain("t('tracking.columns.vendorQcVerdict')");

      // 6. Trạng thái tiến độ NCC
      expect(trackingTsx).toContain("key: 'vendorStatuses'");
      expect(trackingTsx).toContain("t('tracking.columns.vendorStatus')");

      // Helper formatMultiLabel
      expect(trackingTsx).toContain('formatMultiLabel');
    });
  });
});
