import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseFlexibleDate } from '@/lib/dynamo-data';

describe('Tracking Sorting & Popover Filters Suite (TDD)', () => {
  describe('TC-SORT-01: Chronological Date Sorting with parseFlexibleDate', () => {
    it('correctly sorts dates chronologically rather than ASCII string order', () => {
      const rawGoogleSheetsDates = [
        '9/9/2026 17:41:00', // Sep 9, 2026 (starts with '9', highest ASCII)
        '5/11/2026 7:51:15', // May 11, 2026 (earliest in reality, starts with '5')
        '10/28/2026 18:04:16', // Oct 28, 2026 (latest in reality, starts with '1')
        '10/1/2026 10:18:00', // Oct 1, 2026 (starts with '1', lowest ASCII)
      ];

      // Sort Ascending (earliest first: May 11 -> Sep 9 -> Oct 1 -> Oct 28)
      const sortedAsc = [...rawGoogleSheetsDates].sort((a, b) => {
        const timeA = parseFlexibleDate(a)?.getTime() ?? 0;
        const timeB = parseFlexibleDate(b)?.getTime() ?? 0;
        return timeA - timeB;
      });

      expect(sortedAsc[0]).toBe('5/11/2026 7:51:15'); // May 11 is earliest
      expect(sortedAsc[1]).toBe('9/9/2026 17:41:00'); // Sep 9 is second
      expect(sortedAsc[2]).toBe('10/1/2026 10:18:00'); // Oct 1 is third
      expect(sortedAsc[3]).toBe('10/28/2026 18:04:16'); // Oct 28 is latest

      // Sort Descending (latest first: Oct 28 -> Oct 1 -> Sep 9 -> May 11)
      const sortedDesc = [...rawGoogleSheetsDates].sort((a, b) => {
        const timeA = parseFlexibleDate(a)?.getTime() ?? 0;
        const timeB = parseFlexibleDate(b)?.getTime() ?? 0;
        return timeB - timeA;
      });

      expect(sortedDesc[0]).toBe('10/28/2026 18:04:16'); // Oct 28 is on top
      expect(sortedDesc[1]).toBe('10/1/2026 10:18:00'); // Oct 1 is second
      expect(sortedDesc[2]).toBe('9/9/2026 17:41:00'); // Sep 9 is third
      expect(sortedDesc[3]).toBe('5/11/2026 7:51:15'); // May 11 is at bottom
    });
  });

  describe('TC-SORT-02: Tracking Route Sorting & Filter Invariants in tracking.tsx', () => {
    const trackingTsx = fs.readFileSync(path.resolve(__dirname, '../routes/tracking.tsx'), 'utf-8');

    it('has quoc_gia in SortField and handles quoc_gia in sorting switch', () => {
      expect(trackingTsx).toMatch(/export\s+type\s+SortField\s*=\s*[^;]*'quoc_gia'/);
      expect(trackingTsx).toMatch(/case\s+'quoc_gia':/);
    });

    it('uses Epoch timestamp comparison for ngay_tao in tracking.tsx sort comparator', () => {
      // Must not use raw localeCompare for ngay_tao
      expect(trackingTsx).not.toMatch(/case\s+'ngay_tao':\s*cmp\s*=\s*\(a\.ngay_tao/);
      expect(trackingTsx).toMatch(/case\s+'ngay_tao':[\s\S]*?parseFlexibleDate/);
    });

    it('sets default sort to ngay_tao descending on page load', () => {
      expect(trackingTsx).toMatch(/useState<SortField>\('ngay_tao'\)/);
      expect(trackingTsx).toMatch(/useState<SortDirection>\('desc'\)/);
    });

    it('wires onDirectSort and field for NƯỚC and XƯỞNG headers', () => {
      expect(trackingTsx).toContain('field="quoc_gia"');
      expect(trackingTsx).toContain('field="phong_sx"');
      expect(trackingTsx).toMatch(/field="quoc_gia"[\s\S]*?onDirectSort=/);
      expect(trackingTsx).toMatch(/field="phong_sx"[\s\S]*?onDirectSort=/);
    });

    it('removes redundant "Sắp xếp cột này:" HeaderSortControls from filter popovers', () => {
      expect(trackingTsx).not.toContain('<HeaderSortControls');
    });

    it('strictly excludes 7 fixed columns from EDITABLE_FIELDS', () => {
      // Non-editable from webapp: ma_hang, ngay_tao, quoc_gia, phong_sx, doi_tuong_hang, id_ma_hang, cty_qt
      expect(trackingTsx).not.toMatch(/EDITABLE_FIELDS\s*=\s*\[[^\]]*'ma_hang'/);
      expect(trackingTsx).not.toMatch(/EDITABLE_FIELDS\s*=\s*\[[^\]]*'ngay_tao'/);
      expect(trackingTsx).not.toMatch(/EDITABLE_FIELDS\s*=\s*\[[^\]]*'quoc_gia'/);
      expect(trackingTsx).not.toMatch(/EDITABLE_FIELDS\s*=\s*\[[^\]]*'phong_sx'/);
      expect(trackingTsx).not.toMatch(/EDITABLE_FIELDS\s*=\s*\[[^\]]*'doi_tuong_hang'/);
      expect(trackingTsx).not.toMatch(/EDITABLE_FIELDS\s*=\s*\[[^\]]*'id_ma_hang'/);
      expect(trackingTsx).not.toMatch(/EDITABLE_FIELDS\s*=\s*\[[^\]]*'cty_qt'/);
    });
  });
});
