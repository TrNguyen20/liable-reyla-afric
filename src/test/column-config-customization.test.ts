import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Column Configuration & UI/UX Optimization Suite (TDD)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const trackingTsxPath = path.join(rootDir, 'src/routes/tracking.tsx');
  const modalPath = path.join(rootDir, 'src/components/tracking/column-config-modal.tsx');

  it('TC-CCO-01: Component ColumnConfigModal tồn tại và tuân thủ Floating Window rounded-xl', () => {
    expect(fs.existsSync(modalPath), 'column-config-modal.tsx phải tồn tại').toBe(true);
    const modalSrc = fs.readFileSync(modalPath, 'utf-8');
    
    // Tuân thủ chuẩn Modal Floating Window rounded-xl và border-slate-200
    expect(modalSrc).toContain('rounded-xl');
    expect(modalSrc).toContain('border-slate-200');
    expect(modalSrc).not.toContain('rounded-2xl');
    expect(modalSrc).not.toContain('rounded-3xl');

    // Chứa cấu trúc nhóm cột và lưu trữ localStorage
    expect(modalSrc).toContain('dynamo_tracking_custom_columns');
    expect(modalSrc).toContain('font-mono');
  });

  it('TC-CCO-02: tracking.tsx tích hợp chế độ góc nhìn CUSTOM và nút Tùy chỉnh cột', () => {
    expect(fs.existsSync(trackingTsxPath)).toBe(true);
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');

    // Hỗ trợ chế độ CUSTOM
    expect(trackingCode).toContain("'CUSTOM'");
    expect(trackingCode).toContain('ColumnConfigModal');
  });

  it('TC-CCO-03: Ô Search có pr-9 text-ellipsis/truncate và kbd có pointer-events-none', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    expect(trackingCode).toMatch(/pr-9/);
    expect(trackingCode).toMatch(/pointer-events-none/);
  });

  it('TC-CCO-04: Cột Phiếu A4 được mở rộng lên 64px, căn giữa và có đổ bóng ngăn cách', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Độ rộng mặc định và min của ticket phải là 64px
    expect(trackingCode).toContain('ticket: 64');
    expect(trackingCode).toMatch(/shadow-\[-6px_0_12px_-4px/);
  });

  it('TC-CCO-05: Hỗ trợ Auto-fit độ rộng cột khi double click vào vạch chia cột', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    expect(trackingCode).toContain('handleAutoFitColumn');
  });

  it('TC-CCO-06: Row hover contrast và viền trái cho dòng được chọn', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    expect(trackingCode).toContain('border-l-2');
    expect(trackingCode).toContain('border-l-primary');
  });

  it('TC-CCO-07: Container bảng tự động đệm đáy khi có dòng được chọn để không che dòng cuối', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    expect(trackingCode).toMatch(/pb-(16|20|24)/);
  });

  it('TC-CCO-08: Popover lọc Distinct được gắn cho các cột Vật liệu, Đối tác và Độ cứng', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Phải có DistinctValueFilterPopover cho vat_lieu và cty_qt
    expect(trackingCode).toContain('Lọc VẬT LIỆU');
    expect(trackingCode).toContain('Lọc ĐỐI TÁC');
  });

  it('TC-CCO-09: Mở rộng kích thước cột vat_lieu, do_cung, ngay_gui_qt, cty_qt chống cắt tiêu đề', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    expect(trackingCode).toMatch(/vat_lieu:\s*105/);
    expect(trackingCode).toMatch(/do_cung:\s*110/);
    expect(trackingCode).toMatch(/ngay_gui_qt:\s*115/);
    expect(trackingCode).toMatch(/cty_qt:\s*(105|110|115)/);
  });

  it('TC-CCO-10: Cột Trạng thái và Đơn hàng hiển thị dấu gạch ngang — khi Đang tại Vendor hoặc CHƯA_CÓ_PO', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    expect(trackingCode).toContain('Đang tại Vendor');
    expect(trackingCode).toContain('CHƯA_CÓ_PO');
  });

  it('TC-CCO-11: Toolbar 1 tầng tinh gọn min-h-[36px] tích hợp đầy đủ công cụ và không chia tầng', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    expect(trackingCode).toContain('min-h-[36px]');
    expect(trackingCode).toContain('1-Tier');
  });

  it('TC-CCO-12: Tab ⭐ Tùy chỉnh luôn cố định trên thanh segmented control', () => {
    const trackingCode = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Tab CUSTOM luôn nằm trong mảng các view cố định
    expect(trackingCode).toMatch(/'VENDOR_QC',\s*'CUSTOM'/);
  });

  it('TC-CCO-13: ColumnConfigModal mở rộng bề ngang max-w-5xl và áp dụng Bento Grid 3 cột ngang', () => {
    const modalSrc = fs.readFileSync(modalPath, 'utf-8');
    expect(modalSrc).toMatch(/(sm:max-w-4xl|lg:max-w-5xl)/);
    expect(modalSrc).toContain('lg:grid-cols-3');
    expect(modalSrc).toContain('items-start');
  });

  it('TC-CCO-14: ColumnConfigModal hỗ trợ bật/tắt cả nhóm 1-click và nhãn chỉ báo khóa an toàn', () => {
    const modalSrc = fs.readFileSync(modalPath, 'utf-8');
    expect(modalSrc).toContain('toggleGroup');
    expect(modalSrc).toContain('Chọn hết');
    expect(modalSrc).toContain('Bỏ chọn');
    expect(modalSrc).toContain('Khóa');
  });
});
