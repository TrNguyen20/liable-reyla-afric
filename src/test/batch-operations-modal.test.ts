import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  calculateFieldDistribution,
  computeLotDiff,
  isFieldEditableByRole,
  BATCH_FIELDS_CONFIG,
  type BatchFieldDefinition,
} from '@/components/tracking/batch-operations-modal';
import type { QTItem } from '@/lib/dynamo-data';

describe('Batch Operations Modal Suite (Idea 2 - TDD)', () => {
  const sampleLots: QTItem[] = [
    {
      ID_Key: 'LOT-01',
      ma_hang: '9690-C17',
      so_luong: 50,
      kg_Lot: 12.5,
      phong_sx: 'PIN',
      vat_lieu: 'DAC',
      do_cung: '45-48',
      TrangThai: 'Đang tại Vendor',
      cty_QT: 'YAMAICHI',
      don_gia: 25000,
      ncc_file1: 'https://example.com/cert1.pdf',
    } as any,
    {
      ID_Key: 'LOT-02',
      ma_hang: '9690-C17',
      so_luong: 60,
      kg_Lot: 15.0,
      phong_sx: 'PIN',
      vat_lieu: 'DAC',
      do_cung: '45-48',
      TrangThai: 'Đang tại Vendor',
      cty_QT: 'YAMAICHI',
      don_gia: 25000,
    } as any,
    {
      ID_Key: 'LOT-03',
      ma_hang: '2439-P2',
      so_luong: 20,
      kg_Lot: 8.0,
      phong_sx: 'MOLD',
      vat_lieu: 'SKD11',
      do_cung: '58-62',
      TrangThai: 'Chờ xuất xưởng',
      cty_QT: 'PROVISION',
      don_gia: 35000,
    } as any,
  ];

  describe('TC-BOM-01: Field Distribution Summary Calculation', () => {
    it('summarizes current value distributions across selected lots', () => {
      const summaryHrc = calculateFieldDistribution(sampleLots, 'do_cung');
      expect(summaryHrc).toBe('45-48 (2 lô), 58-62 (1 lô)');

      const summaryStatus = calculateFieldDistribution(sampleLots, 'TrangThai');
      expect(summaryStatus).toContain('Đang tại Vendor (2 lô)');
      expect(summaryStatus).toContain('Chờ xuất xưởng (1 lô)');
    });

    it('handles empty or missing values in field distribution', () => {
      const summaryCert = calculateFieldDistribution(sampleLots, 'ncc_file1');
      expect(summaryCert).toContain('1 lô có dữ liệu');
      expect(summaryCert).toContain('2 lô trống');
    });
  });

  describe('TC-BOM-02: RBAC Master Columns & Pricing Permissions', () => {
    it('strictly locks 6 Master Identifiers for ALL roles', () => {
      const masterKeys = ['ma_hang', 'ngay_tao', 'quoc_gia', 'phong_sx', 'doi_tuong_hang', 'id_ma_hang'];
      const roles = ['admin', 'leader', 'viewer', 'qt_yamaichi'];

      for (const key of masterKeys) {
        for (const role of roles) {
          expect(isFieldEditableByRole(key as any, role as any)).toBe(false);
        }
      }
    });

    it('allows only admin to edit cty_qt (vendor partner) in batch mode', () => {
      expect(isFieldEditableByRole('cty_QT', 'admin')).toBe(true);
      expect(isFieldEditableByRole('cty_QT', 'leader')).toBe(false);
      expect(isFieldEditableByRole('cty_QT', 'viewer')).toBe(false);
      expect(isFieldEditableByRole('cty_QT', 'qt_yamaichi')).toBe(false);
    });

    it('allows only admin and leader to edit pricing fields', () => {
      expect(isFieldEditableByRole('don_gia', 'admin')).toBe(true);
      expect(isFieldEditableByRole('don_gia', 'leader')).toBe(true);
      expect(isFieldEditableByRole('don_gia', 'viewer')).toBe(false);
      expect(isFieldEditableByRole('don_gia', 'qt_yamaichi')).toBe(false);
    });

    it('allows editing technical and QC fields for appropriate roles', () => {
      expect(isFieldEditableByRole('do_cung', 'admin')).toBe(true);
      expect(isFieldEditableByRole('do_cung', 'leader')).toBe(true);
      expect(isFieldEditableByRole('ncc_ket_qua_qc', 'admin')).toBe(true);
      expect(isFieldEditableByRole('ncc_ket_qua_qc', 'qt_yamaichi')).toBe(true);
    });
  });

  describe('TC-BOM-03: Real-Time Live Diff Computation', () => {
    it('computes exact diff badges when fields are modified', () => {
      const lot = sampleLots[0]!;
      const patch = { do_cung: '48-52', TrangThai: 'Đã nhập kho' as const };
      const diffs = computeLotDiff(lot, patch);

      expect(diffs.length).toBe(2);
      expect(diffs).toContainEqual({ field: 'do_cung', from: '45-48', to: '48-52', label: 'Độ cứng yêu cầu' });
      expect(diffs).toContainEqual({ field: 'TrangThai', from: 'Đang tại Vendor', to: 'Đã nhập kho', label: 'Trạng thái Logistics' });
    });

    it('returns empty array if patch values match existing values', () => {
      const lot = sampleLots[0]!;
      const patch = { do_cung: '45-48' };
      const diffs = computeLotDiff(lot, patch);
      expect(diffs.length).toBe(0);
    });
  });

  describe('TC-BOM-04: Design System & Architectural Constraints', () => {
    const modalFilePath = path.resolve(__dirname, '../components/tracking/batch-operations-modal.tsx');

    it('ensures batch-operations-modal.tsx does not use rounded-xl or rounded-2xl', () => {
      if (fs.existsSync(modalFilePath)) {
        const modalSrc = fs.readFileSync(modalFilePath, 'utf-8');
        expect(modalSrc).not.toContain('rounded-xl');
        expect(modalSrc).not.toContain('rounded-2xl');
        expect(modalSrc).toContain('rounded-xs');
      }
    });

    it('ensures NO Audit Trail reason input exists in batch-operations-modal.tsx', () => {
      if (fs.existsSync(modalFilePath)) {
        const modalSrc = fs.readFileSync(modalFilePath, 'utf-8');
        expect(modalSrc).not.toContain('reasonInput');
        expect(modalSrc).not.toContain('Quick Reason Tags');
        expect(modalSrc).not.toContain('Lý do Audit Trail');
      }
    });
  });
});
