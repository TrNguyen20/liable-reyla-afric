import { describe, it, expect } from 'vitest';
import {
  patchServerDataset,
  getServerDatasetVersion,
  getDeltasSince,
} from '@/lib/server-dataset';

describe('Server-Assisted Realtime Live Hub Unit Tests', () => {
  it('TC-RT-01: patchServerDataset cập nhật bộ nhớ và tăng version', () => {
    const vBefore = getServerDatasetVersion().version;
    const res = patchServerDataset('TEST-LOT-001', {
      TrangThai: 'Kiểm tra QC',
      do_cung: '58 HRC',
    }, 'admin');

    expect(res.ok).toBe(true);
    expect(res.version).toBeGreaterThan(vBefore);

    const vAfter = getServerDatasetVersion();
    expect(vAfter.version).toBe(res.version);
  });

  it('TC-RT-02: getDeltasSince trả về đúng các thay đổi phát sinh sau sinceVersion', () => {
    const v0 = getServerDatasetVersion().version;

    patchServerDataset('TEST-LOT-002', { TrangThai: 'Đã nhập kho' }, 'leader');
    patchServerDataset('TEST-LOT-003', { so_luong: 500 }, 'vendor');

    const result = getDeltasSince(v0);
    expect(result.resetRequired).toBe(false);
    expect(result.deltas.length).toBeGreaterThanOrEqual(2);

    const lot2 = result.deltas.find((d) => d.id === 'TEST-LOT-002');
    expect(lot2).toBeDefined();
    expect(lot2?.patch.TrangThai).toBe('Đã nhập kho');

    const lot3 = result.deltas.find((d) => d.id === 'TEST-LOT-003');
    expect(lot3).toBeDefined();
    expect(lot3?.patch.so_luong).toBe(500);
  });

  it('TC-RT-03: Trả về resetRequired = true nếu sinceVersion quá cũ hoặc bằng 0', () => {
    const result = getDeltasSince(0);
    expect(result.resetRequired).toBe(true);
  });
});
