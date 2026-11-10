import { describe, it, expect } from 'vitest';
import { mapRows } from '@/lib/dynamo-source';

describe('DYNAMO MES: Dynamo Source Data Integrity & Ingestion Suite', () => {
  it('TC-SRC-01: Dòng có mã nhiệt và mã hàng nhưng thiếu số đơn hàng PO thì tự động gán CHƯA_CÓ_PO và nạp thành công', () => {
    const rawRows = [
      {
        id_nhiet_qt: 'Q260616A988',
        ma_hang: '9615-V1 NG',
        so_dat_hang: '', // Thiếu PO
        phong_sx: 'PIN',
      },
      {
        ID_Key: 'Q2606243174',
        ma_hang: '9117-S5',
        So_DatHang: '   ', // Trống khoảng trắng
        phong_sx: 'INSERT',
      },
    ];

    const result = mapRows(rawRows);

    expect(result.skipped).toBe(0);
    expect(result.total).toBe(2);
    expect(result.items.length).toBe(2);

    expect(result.items[0]?.ID_Key).toBe('Q260616A988');
    expect(result.items[0]?.So_DatHang).toBe('CHƯA_CÓ_PO');
    expect(result.items[0]?.so_dat_hang).toBe('CHƯA_CÓ_PO');

    expect(result.items[1]?.ID_Key).toBe('Q2606243174');
    expect(result.items[1]?.So_DatHang).toBe('CHƯA_CÓ_PO');
    expect(result.items[1]?.so_dat_hang).toBe('CHƯA_CÓ_PO');
  });

  it('TC-SRC-02: Dòng thiếu mã nhiệt (id_nhiet_qt) hoặc mã hàng (ma_hang) bị skipped để tránh rác dữ liệu', () => {
    const rawRows = [
      {
        id_nhiet_qt: '', // Thiếu mã nhiệt
        ma_hang: '9615-V1',
        so_dat_hang: 'PO-2026-001',
      },
      {
        id_nhiet_qt: 'Q2606243175',
        ma_hang: '', // Thiếu mã hàng
        so_dat_hang: 'PO-2026-002',
      },
      {
        id_nhiet_qt: 'Q2606243176',
        ma_hang: '9117-S6',
        so_dat_hang: 'PO-2026-003',
      },
    ];

    const result = mapRows(rawRows);

    expect(result.skipped).toBe(2);
    expect(result.total).toBe(3);
    expect(result.items.length).toBe(1);
    expect(result.items[0]?.ID_Key).toBe('Q2606243176');
  });

  it('TC-SRC-03: Dòng trùng lặp mã nhiệt id_nhiet_qt được ghi nhận vào danh sách duplicates', () => {
    const rawRows = [
      {
        id_nhiet_qt: 'DUP-001',
        ma_hang: 'PART-A',
        so_dat_hang: 'PO-001',
      },
      {
        id_nhiet_qt: 'DUP-001', // Trùng
        ma_hang: 'PART-B',
        so_dat_hang: '',
      },
    ];

    const result = mapRows(rawRows);

    expect(result.items.length).toBe(1);
    expect(result.duplicates).toEqual(['DUP-001']);
    expect(result.skipped).toBe(0);
  });

  it('TC-SRC-04: Mô phỏng 27.097 dòng Google Sheets (gồm 89 dòng trống PO) nạp đủ 100% không bị sót', () => {
    const totalDataRows = 27097;
    const emptyPoCount = 89;

    const mockRows: Record<string, string>[] = [];
    for (let i = 1; i <= totalDataRows; i++) {
      mockRows.push({
        id_nhiet_qt: `Q260624${String(i).padStart(5, '0')}`,
        ma_hang: `PART-${i}`,
        // 89 dòng đầu tiên để trống PO
        so_dat_hang: i <= emptyPoCount ? '' : `PO-2026-${String(i).padStart(5, '0')}`,
        phong_sx: 'PIN',
      });
    }

    const result = mapRows(mockRows);

    expect(result.total).toBe(27097);
    expect(result.skipped).toBe(0);
    expect(result.items.length).toBe(27097);

    // Xác nhận 89 dòng thiếu PO đều nhận nhãn 'CHƯA_CÓ_PO'
    for (let i = 0; i < emptyPoCount; i++) {
      expect(result.items[i]?.so_dat_hang).toBe('CHƯA_CÓ_PO');
      expect(result.items[i]?.So_DatHang).toBe('CHƯA_CÓ_PO');
    }

    // Xác nhận các dòng còn lại giữ nguyên mã PO gốc
    expect(result.items[emptyPoCount]?.so_dat_hang).toBe('PO-2026-00090');
  });
});
