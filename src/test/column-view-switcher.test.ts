import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

export type ColumnView = 'ALL' | 'TECH' | 'COMM' | 'VENDOR_QC';

export const COLUMN_VIEW_SPECS: Record<ColumnView, { label: string; shortLabel: string; description: string }> = {
  ALL: {
    label: 'Tất cả cột (36)',
    shortLabel: 'Tất cả (36)',
    description: 'Toàn bộ 36 cột từ Google Sheets mới',
  },
  TECH: {
    label: 'Hình 1: Kỹ thuật',
    shortLabel: 'Kỹ thuật',
    description: 'Mã bản vẽ, vật liệu, độ cứng, quy cách, số lượng, khối lượng kg',
  },
  COMM: {
    label: 'Hình 2: Đơn giá & PO',
    shortLabel: 'Đơn giá & PO',
    description: 'Đơn giá, thành tiền, ngày gửi, hạn trả, đơn hàng PO, đối tác',
  },
  VENDOR_QC: {
    label: 'Hình 3: NCC & QC',
    shortLabel: 'NCC & QC',
    description: 'Hạn trả NCC, mã mẻ lò, giản đồ nhiệt, đo HRC, nghiệm thu QC, báo giá',
  },
};

export function isColumnVisibleInView(colKey: string, view: ColumnView): boolean {
  // Master pinned columns are ALWAYS visible
  if (colKey === 'checkbox' || colKey === 'ma_hang' || colKey === 'ticket') {
    return true;
  }

  if (view === 'ALL') return true;

  if (view === 'TECH') {
    return [
      'ngay_tao',
      'nguoi_tao',
      'quoc_gia',
      'phong_sx',
      'doi_tuong_hang',
      'id_ma_hang',
      'so_luong',
      'vat_lieu',
      'do_cung',
      'kich_thuoc_sp',
      'kg_Lot',
      'don_vi_tinh',
      'so_luong_tinh',
    ].includes(colKey);
  }

  if (view === 'COMM') {
    return [
      'phong_sx',
      'don_gia',
      'thanh_tien',
      'ty_gia',
      'ngay_gui_qt',
      'cty_qt',
      'trang_thai',
      'han_tra',
      'so_dat_hang',
      'ten_file_dat_hang',
      'ghi_chu_khi_gui',
    ].includes(colKey);
  }

  if (view === 'VENDOR_QC') {
    return [
      'cty_qt',
      'ncc_ngay_qt',
      'ncc_ngay_tra_qt',
      'ncc_id_lot_qt',
      'ncc_name_qt',
      'ncc_giando',
      'ncc_ket_qua_hrc',
      'ncc_ket_qua_qc',
      'ncc_don_gia',
      'ncc_tatus',
      'ncc_thongtinkhac1',
      'ncc_thongtinkhac2',
      'ncc_file1',
    ].includes(colKey);
  }

  return true;
}

export function computeVisibleTableWidth(
  colWidths: Record<string, number>,
  view: ColumnView,
): number {
  return Object.entries(colWidths).reduce((total, [key, width]) => {
    if (isColumnVisibleInView(key, view)) {
      return total + width;
    }
    return total;
  }, 0);
}

describe('Column View Switcher Suite (4 Tab Góc Nhìn Cột - TDD)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const trackingTsxPath = path.join(rootDir, 'src/routes/tracking.tsx');

  const defaultColWidths: Record<string, number> = {
    checkbox: 40,
    ma_hang: 125,
    ngay_tao: 130,
    nguoi_tao: 85,
    quoc_gia: 85,
    phong_sx: 85,
    doi_tuong_hang: 110,
    id_ma_hang: 155,
    so_luong: 65,
    vat_lieu: 95,
    do_cung: 95,
    kich_thuoc_sp: 115,
    kg_Lot: 65,
    don_vi_tinh: 60,
    so_luong_tinh: 75,
    don_gia: 95,
    thanh_tien: 110,
    ty_gia: 65,
    ngay_gui_qt: 105,
    cty_qt: 120,
    trang_thai: 115,
    han_tra: 105,
    so_dat_hang: 140,
    ten_file_dat_hang: 95,
    ghi_chu_khi_gui: 150,
    ncc_ngay_qt: 105,
    ncc_ngay_tra_qt: 105,
    ncc_id_lot_qt: 115,
    ncc_name_qt: 110,
    ncc_giando: 100,
    ncc_ket_qua_hrc: 95,
    ncc_ket_qua_qc: 105,
    ncc_don_gia: 100,
    ncc_tatus: 115,
    ncc_thongtinkhac1: 110,
    ncc_thongtinkhac2: 110,
    ncc_file1: 100,
    ticket: 58,
  };

  it('TC-CVS-01: Định nghĩa 4 chế độ góc nhìn chuẩn và nhãn tiếng Việt', () => {
    expect(COLUMN_VIEW_SPECS.ALL.shortLabel).toContain('Tất cả');
    expect(COLUMN_VIEW_SPECS.TECH.shortLabel).toBe('Kỹ thuật');
    expect(COLUMN_VIEW_SPECS.COMM.shortLabel).toBe('Đơn giá & PO');
    expect(COLUMN_VIEW_SPECS.VENDOR_QC.shortLabel).toBe('NCC & QC');
  });

  it('TC-CVS-02: Phân loại cột chính xác theo từng chế độ góc nhìn', () => {
    // 1. Chế độ ALL: Mọi cột đều hiển thị
    Object.keys(defaultColWidths).forEach((key) => {
      expect(isColumnVisibleInView(key, 'ALL')).toBe(true);
    });

    // 2. Chế độ TECH: Chỉ hiển thị cột kỹ thuật, ẩn đơn giá và NCC
    expect(isColumnVisibleInView('so_luong', 'TECH')).toBe(true);
    expect(isColumnVisibleInView('vat_lieu', 'TECH')).toBe(true);
    expect(isColumnVisibleInView('do_cung', 'TECH')).toBe(true);
    expect(isColumnVisibleInView('kich_thuoc_sp', 'TECH')).toBe(true);
    expect(isColumnVisibleInView('kg_Lot', 'TECH')).toBe(true);
    expect(isColumnVisibleInView('don_gia', 'TECH')).toBe(false);
    expect(isColumnVisibleInView('thanh_tien', 'TECH')).toBe(false);
    expect(isColumnVisibleInView('ncc_file1', 'TECH')).toBe(false);

    // 3. Chế độ COMM: Chỉ hiển thị cột thương mại, ẩn chi tiết quy cách và NCC
    expect(isColumnVisibleInView('don_gia', 'COMM')).toBe(true);
    expect(isColumnVisibleInView('thanh_tien', 'COMM')).toBe(true);
    expect(isColumnVisibleInView('so_dat_hang', 'COMM')).toBe(true);
    expect(isColumnVisibleInView('ten_file_dat_hang', 'COMM')).toBe(true);
    expect(isColumnVisibleInView('kich_thuoc_sp', 'COMM')).toBe(false);
    expect(isColumnVisibleInView('ncc_giando', 'COMM')).toBe(false);

    // 4. Chế độ VENDOR_QC: Chỉ hiển thị cột NCC và KCS
    expect(isColumnVisibleInView('ncc_ngay_qt', 'VENDOR_QC')).toBe(true);
    expect(isColumnVisibleInView('ncc_id_lot_qt', 'VENDOR_QC')).toBe(true);
    expect(isColumnVisibleInView('ncc_giando', 'VENDOR_QC')).toBe(true);
    expect(isColumnVisibleInView('ncc_ket_qua_qc', 'VENDOR_QC')).toBe(true);
    expect(isColumnVisibleInView('ncc_file1', 'VENDOR_QC')).toBe(true);
    expect(isColumnVisibleInView('so_luong', 'VENDOR_QC')).toBe(false);
    expect(isColumnVisibleInView('don_gia', 'VENDOR_QC')).toBe(false);
  });

  it('TC-CVS-03: Cột Checkbox, Mã hàng và Phiếu A4 luôn hiển thị ở cả 4 chế độ góc nhìn', () => {
    const views: ColumnView[] = ['ALL', 'TECH', 'COMM', 'VENDOR_QC'];
    views.forEach((v) => {
      expect(isColumnVisibleInView('checkbox', v), `checkbox must be visible in ${v}`).toBe(true);
      expect(isColumnVisibleInView('ma_hang', v), `ma_hang must be visible in ${v}`).toBe(true);
      expect(isColumnVisibleInView('ticket', v), `ticket must be visible in ${v}`).toBe(true);
    });
  });

  it('TC-CVS-04: Độ rộng bảng co giãn thông minh, giảm hơn 50% ở các chế độ tập trung', () => {
    const totalAll = computeVisibleTableWidth(defaultColWidths, 'ALL');
    const totalTech = computeVisibleTableWidth(defaultColWidths, 'TECH');
    const totalComm = computeVisibleTableWidth(defaultColWidths, 'COMM');
    const totalVendor = computeVisibleTableWidth(defaultColWidths, 'VENDOR_QC');

    // Chế độ ALL khoảng ~3900px
    expect(totalAll).toBeGreaterThan(3500);

    // Các chế độ rút gọn phải nhỏ hơn 2100px (giảm trên 50% áp lực cuộn ngang)
    expect(totalTech).toBeLessThan(totalAll * 0.55);
    expect(totalComm).toBeLessThan(totalAll * 0.55);
    expect(totalVendor).toBeLessThan(totalAll * 0.55);
  });

  it('TC-CVS-05: tracking.tsx phải chứa mã tích hợp Column View Switcher và persistence', () => {
    expect(fs.existsSync(trackingTsxPath)).toBe(true);
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');

    // Phải có định nghĩa hoặc import ColumnView
    expect(trackingCode).toContain('ColumnView');
    expect(trackingCode).toContain('dynamo-column-view');
    expect(trackingCode).toContain('isColVisible');

    // Phải có 4 nút tab chuyển đổi trên Toolbar
    expect(trackingCode).toContain("'ALL'");
    expect(trackingCode).toContain("'TECH'");
    expect(trackingCode).toContain("'COMM'");
    expect(trackingCode).toContain("'VENDOR_QC'");
  });
});
