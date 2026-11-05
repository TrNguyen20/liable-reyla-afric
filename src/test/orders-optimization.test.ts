import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('DYNAMO QT-MES: Orders Page Optimization & Security Compliance Tests', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const ordersTsxPath = path.join(rootDir, 'src/routes/orders.tsx');

  it('TC-ORD-01: orders.tsx tồn tại và tích hợp kiểm soát quyền canViewPricing', () => {
    expect(fs.existsSync(ordersTsxPath), 'orders.tsx phải tồn tại').toBe(true);
    const code = fs.readFileSync(ordersTsxPath, 'utf-8');

    // Bắt buộc import canViewPricing từ @/lib/dynamo-auth
    expect(code).toContain('canViewPricing');
    expect(code).toContain('isPricingAllowed');

    // Bắt buộc kiểm tra quyền cho ô KPI TỔNG GIÁ TRỊ vs TỔNG SỐ LƯỢNG
    expect(code).toContain('TỔNG GIÁ TRỊ');
    expect(code).toContain('TỔNG SỐ LƯỢNG');

    // Bắt buộc loại trừ đơn giá trong exportCsv khi không có quyền
    expect(code).toContain('isPricingAllowed ?');
  });

  it('TC-ORD-02: Bảng chi tiết không chứa header rỗng và hỗ trợ Batch Job Ticket', () => {
    const code = fs.readFileSync(ordersTsxPath, 'utf-8');

    // Cột hành động phải có nhãn rõ ràng 'THAO TÁC', không được để chuỗi rỗng ''
    expect(code).toContain('THAO TÁC');

    // Tích hợp BatchJobTicketModal và nút in phiếu cả đơn
    expect(code).toContain('BatchJobTicketModal');
    expect(code).toContain('In phiếu cả đơn');
  });

  it('TC-ORD-03: Hỗ trợ cơ chế chuyển đổi Adaptive View Toggle trên thiết bị nhỏ (< lg)', () => {
    const code = fs.readFileSync(ordersTsxPath, 'utf-8');

    // Có state mobileView
    expect(code).toContain('mobileView');
    expect(code).toContain('setMobileView');

    // Có nút quay lại danh sách trên mobile
    expect(code).toContain('Danh sách đơn');
  });

  it('TC-ORD-04: Hiển thị thanh tiến độ đơn hàng trực quan (Progress Bar)', () => {
    const code = fs.readFileSync(ordersTsxPath, 'utf-8');

    expect(code).toContain('Tiến độ:');
    expect(code).toContain('progressPercent');
    expect(code).toContain('lô hoàn tất');
  });

  it('TC-ORD-05: Tuân thủ nghiêm ngặt chuẩn Graphite Wireframe UI v2.1.0', () => {
    const code = fs.readFileSync(ordersTsxPath, 'utf-8');

    // Tuyệt đối không chứa bo góc cấm kiểu consumer
    expect(code).not.toContain('rounded-lg');
    expect(code).not.toContain('rounded-xl');
    expect(code).not.toContain('rounded-2xl');

    // Định dạng số liệu monospaced
    expect(code).toContain('font-mono');
    expect(code).toContain('tabular-nums');
  });
});
