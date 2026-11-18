import { describe, it, expect } from 'vitest';
import {
  parseHrcTarget,
  parseHrcActual,
  evaluateHrc,
  computeMetallurgyAnalytics,
} from '../lib/metallurgy-engine';
import type { QTItem } from '../lib/dynamo-data';

describe('Metallurgy Analytics Engine', () => {
  it('parses various HRC target formats correctly', () => {
    expect(parseHrcTarget('58-62 HRC')).toEqual({ min: 58, max: 62, target: 60, raw: '58-62 HRC' });
    expect(parseHrcTarget('58~62')).toEqual({ min: 58, max: 62, target: 60, raw: '58~62' });
    expect(parseHrcTarget('60 HRC')).toEqual({ min: 59, max: 61, target: 60, raw: '60 HRC' });
    expect(parseHrcTarget('HRC 55-60')).toEqual({ min: 55, max: 60, target: 57.5, raw: 'HRC 55-60' });
    expect(parseHrcTarget('invalid text')).toBeNull();
  });

  it('parses actual HRC readings with commas and suffixes', () => {
    expect(parseHrcActual('60.5')).toBe(60.5);
    expect(parseHrcActual('59 HRC')).toBe(59);
    expect(parseHrcActual('60,5')).toBe(60.5);
    expect(parseHrcActual('HRC 61')).toBe(61);
    expect(parseHrcActual('N/A')).toBeNull();
  });

  it('evaluates HRC results and computes delta accurately', () => {
    const res1 = evaluateHrc('58-62 HRC', '60');
    expect(res1.classification).toBe('IN_RANGE');
    expect(res1.delta).toBe(0);

    const res2 = evaluateHrc('58-62 HRC', '56');
    expect(res2.classification).toBe('UNDER_HARD');
    expect(res2.delta).toBe(-4);

    const res3 = evaluateHrc('58-62 HRC', '63.5');
    expect(res3.classification).toBe('OVER_HARD');
    expect(res3.delta).toBe(3.5);
  });

  it('computes aggregated metallurgy analytics, FPY, and lead time', () => {
    const mockItems: Partial<QTItem>[] = [
      {
        id_nhiet_qt: 'LOT-1',
        TrangThai: 'Đã nhập kho',
        do_cung: '58-62 HRC',
        ncc_ket_qua_hrc: '60',
        ncc_ket_qua_qc: 'PASS',
        vat_lieu: 'SKD11',
        kg_lot: 25.5,
        ngay_gui_qt: '2026-03-01',
        ngay_nhan: '2026-03-05',
        cty_QT: 'YAMAICHI',
      },
      {
        id_nhiet_qt: 'LOT-2',
        TrangThai: 'Đã nhập kho',
        do_cung: '58-62 HRC',
        ncc_ket_qua_hrc: '56',
        ncc_ket_qua_qc: 'FAIL',
        vat_lieu: 'SKD61',
        kg_lot: 10,
        ngay_gui_qt: '2026-03-01',
        ngay_nhan: '2026-03-07',
        cty_QT: 'PROVISION',
      },
      {
        id_nhiet_qt: 'LOT-3',
        TrangThai: 'Đang tại Vendor',
        do_cung: '58-62 HRC',
        ncc_ket_qua_hrc: undefined,
        vat_lieu: 'SKD11',
        kg_lot: 15,
        cty_QT: 'YAMAICHI',
      },
    ];

    const result = computeMetallurgyAnalytics(mockItems as QTItem[]);
    expect(result.totalLots).toBe(3);
    expect(result.measuredLots).toBe(2);
    expect(result.fpy.passed).toBe(1); // Chỉ có LOT-1 đạt PASS (LOT-3 chưa có dữ liệu nghiệm thu)
    expect(result.fpy.failed).toBe(1);
    expect(result.hrcDistribution.inRange).toBe(1);
    expect(result.hrcDistribution.under).toBe(1);
    expect(result.cycleTime.totalCompleted).toBe(2);
    expect(result.cycleTime.measurableLots).toBe(2);
    expect(result.cycleTime.avgDays).toBe(5); // (4 + 6) / 2 = 5
    expect(result.materials[0]?.material).toBe('SKD11');
  });
});
