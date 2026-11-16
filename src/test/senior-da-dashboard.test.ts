import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Senior DA Strategic Dashboard Unit & Integration Tests', () => {
  const rootDir = process.cwd();
  const dashboardTsxPath = path.join(rootDir, 'src/routes/dashboard.tsx');
  const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');

  it('TC-SDA-01: Bắt buộc hỗ trợ 10 Enterprise Reporting Periods', () => {
    expect(dashboardSrc).toContain("value=\"all\"");
    expect(dashboardSrc).toContain("value=\"today\"");
    expect(dashboardSrc).toContain("value=\"week\"");
    expect(dashboardSrc).toContain("value=\"this\"");
    expect(dashboardSrc).toContain("value=\"prev\"");
    expect(dashboardSrc).toContain("value=\"q1\"");
    expect(dashboardSrc).toContain("value=\"q2\"");
    expect(dashboardSrc).toContain("value=\"q3\"");
    expect(dashboardSrc).toContain("value=\"q4\"");
    expect(dashboardSrc).toContain("value=\"year\"");
  });

  it('TC-SDA-02: Bắt buộc có KPI Tổng Tiền Nhiệt Luyện Toàn Thời Gian (All-Time Cumulative Cost)', () => {
    expect(dashboardSrc).toContain('TỔNG TIỀN NHIỆT (ALL-TIME)');
    expect(dashboardSrc).toContain('allTimeCost');
    expect(dashboardSrc).toContain('allTimeKg');
    expect(dashboardSrc).toContain('allTimePcs');
  });

  it('TC-SDA-03: Cụm Trái hỗ trợ đủ 3 Tab Kỹ Thuật (OTD 4 Tuần, Aging Tiers, Tải Trọng Xưởng)', () => {
    expect(dashboardSrc).toContain("setTechTab('otd')");
    expect(dashboardSrc).toContain("setTechTab('aging')");
    expect(dashboardSrc).toContain("setTechTab('workload')");
    expect(dashboardSrc).toContain('PHÂN TÍCH KỸ THUẬT & LUÂN CHUYỂN');
  });

  it('TC-SDA-04: Cụm Phải hỗ trợ đủ 3 Tab Tài Chính (Cơ Cấu Chi Phí, Rủi Ro Đọng Vốn, Đơn Giá Kg/Pcs)', () => {
    expect(dashboardSrc).toContain("setFinTab('trajectory')");
    expect(dashboardSrc).toContain("setFinTab('risk')");
    expect(dashboardSrc).toContain("setFinTab('unit_cost')");
    expect(dashboardSrc).toContain('PHÂN TÍCH TÀI CHÍNH & GIÁ TRỊ');
  });

  it('TC-SDA-05: Bảo mật dữ liệu tài chính đa tầng (Gated canViewPricing & getVendorScope)', () => {
    expect(dashboardSrc).toContain('canViewPricing(role)');
    expect(dashboardSrc).toContain('formatVendorName');
    expect(dashboardSrc).toContain('getVendorScope(role)');
    expect(dashboardSrc).toContain('DỮ LIỆU TÀI CHÍNH BẢO MẬT');
  });

  it('TC-SDA-06: Loại bỏ 100% tàn tích Biên Bản Bàn Giao Ca A4 (Shift Handover)', () => {
    expect(dashboardSrc).not.toContain('handover-dialog');
    expect(dashboardSrc).not.toContain('Biên bản bàn giao ca');
    expect(dashboardSrc).not.toContain('In biên bản');
    expect(dashboardSrc).not.toContain('handoverOpen');
  });

  it('TC-SDA-07: Tuân thủ nghiêm ngặt Graphite Wireframe v2.5.0 (2px corners, font-mono tabular-nums)', () => {
    expect(dashboardSrc).not.toContain('rounded-lg');
    expect(dashboardSrc).not.toContain('rounded-xl');
    expect(dashboardSrc).not.toContain('rounded-2xl');
    expect(dashboardSrc).toContain('rounded-xs');
    expect(dashboardSrc).toContain('font-mono');
    expect(dashboardSrc).toContain('tabular-nums');
  });

  it('TC-SDA-08: Tích hợp đầy đủ Cầu Nối Chiến Lược (Bridges to /orders & /tracking)', () => {
    expect(dashboardSrc).toContain('to="/tracking"');
    expect(dashboardSrc).toContain('to="/orders"');
    expect(dashboardSrc).toContain('atRiskOrders');
  });
});
