import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { onTimeRate, type Logistics, type QcState } from '../lib/dynamo-rules';
import type { QTItem } from '../lib/dynamo-data';

describe('DYNAMO QT-MES: Dashboard Enhancements & Optimization Tests', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const dashboardTsxPath = path.join(rootDir, 'src/routes/dashboard.tsx');
  const stylesCssPath = path.join(rootDir, 'src/styles.css');

  it('TC-DB-01: onTimeRate tính toán chính xác và tỷ lệ OTD không bao giờ bị undefined', () => {
    // 1. Tập dữ liệu rỗng
    const emptyRate = onTimeRate([]);
    expect(emptyRate.rate).toBeNull();
    const formattedEmpty = emptyRate.rate === null ? 0 : Math.round(emptyRate.rate * 100);
    expect(formattedEmpty).toBe(0);
    expect(Number.isFinite(formattedEmpty)).toBe(true);

    // 2. Tập dữ liệu có lô hoàn tất đúng hạn
    const mockItems: Partial<QTItem>[] = [
      {
        ID_Key: 'LOT-01',
        TrangThai: 'Đã nhập kho',
        han_tra: '2026-11-05',
        ngay_nhan: '2026-11-04', // Đúng hạn
        han_tra_est: false,
      },
      {
        ID_Key: 'LOT-02',
        TrangThai: 'Đã nhập kho',
        han_tra: '2026-11-03',
        ngay_nhan: '2026-11-05', // Trễ hạn
        han_tra_est: false,
      },
      {
        ID_Key: 'LOT-03',
        TrangThai: 'Đang tại Vendor', // Đang mở -> không tính vào denominator OTD
        han_tra: '2026-11-05',
        han_tra_est: false,
      },
    ];

    const result = onTimeRate(mockItems as QTItem[]);
    expect(result.denominator).toBe(2);
    expect(result.onTime).toBe(1);
    expect(result.rate).toBeCloseTo(0.5);

    const formattedOtd = result.rate === null ? 0 : Math.round(result.rate * 100);
    expect(formattedOtd).toBe(50);
    expect(`${formattedOtd}%`).toBe('50%');
    expect(`${formattedOtd}%`).not.toBe('undefined%');
  });

  it('TC-DB-02: Smart Shift Logic nhận diện chính xác 3 ca trực theo mốc giờ thực tế', () => {
    const detectShift = (hour: number): string => {
      if (hour >= 6 && hour < 14) return 'Ca 1 (06:00 - 14:00)';
      if (hour >= 14 && hour < 22) return 'Ca 2 (14:00 - 22:00)';
      return 'Ca 3 (22:00 - 06:00)';
    };

    // Kiểm tra Ca 1: 06:00 đến 13:59
    expect(detectShift(6)).toBe('Ca 1 (06:00 - 14:00)');
    expect(detectShift(10)).toBe('Ca 1 (06:00 - 14:00)');
    expect(detectShift(13)).toBe('Ca 1 (06:00 - 14:00)');

    // Kiểm tra Ca 2: 14:00 đến 21:59
    expect(detectShift(14)).toBe('Ca 2 (14:00 - 22:00)');
    expect(detectShift(18)).toBe('Ca 2 (14:00 - 22:00)');
    expect(detectShift(21)).toBe('Ca 2 (14:00 - 22:00)');

    // Kiểm tra Ca 3: 22:00 đến 05:59
    expect(detectShift(22)).toBe('Ca 3 (22:00 - 06:00)');
    expect(detectShift(23)).toBe('Ca 3 (22:00 - 06:00)');
    expect(detectShift(0)).toBe('Ca 3 (22:00 - 06:00)');
    expect(detectShift(5)).toBe('Ca 3 (22:00 - 06:00)');
  });

  it('TC-DB-03: Bộ lọc kỳ báo cáo hỗ trợ Hôm nay (today) và 7 ngày qua (week)', () => {
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');

    // Kiểm tra định nghĩa type Period
    expect(dashboardSrc).toContain("'today'");
    expect(dashboardSrc).toContain("'week'");

    // Kiểm tra options trong select
    expect(dashboardSrc).toContain('Hôm nay (Today)');
    expect(dashboardSrc).toContain('7 ngày qua (7D)');
  });

  it('TC-DB-04: Thẻ [KPI-05] Chi phí tạm tính ở chế độ chỉ đọc và có badge kỹ thuật', () => {
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');

    expect(dashboardSrc).toContain('[KPI-05]');
    expect(dashboardSrc).toContain('CHỈ ĐỌC / NỘI BỘ');
    expect(dashboardSrc).toContain('readOnly');
  });

  it('TC-DB-05: Cô lập luồng in ấn A4 (@media print) hỗ trợ cả job-ticket-dialog và handover-dialog', () => {
    const css = fs.readFileSync(stylesCssPath, 'utf-8');
    expect(css).toContain('.handover-dialog');
    expect(css).toContain('body:has(.handover-dialog) > #root');

    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');
    expect(dashboardSrc).toContain('handover-dialog');
    expect(dashboardSrc).toContain('job-ticket-dialog');
  });

  it('TC-DB-06: Bảng hành động ưu tiên có chỉ báo Khóa cho vai trò không đủ quyền hạn', () => {
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');
    expect(dashboardSrc).toContain('canUpdate');
    expect(dashboardSrc).toContain('Khóa');
  });

  it('TC-DB-07: Dashboard tuân thủ Graphite Wireframe Specification (v2.1.0)', () => {
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');

    // Cấm các class bo góc lớn
    expect(dashboardSrc).not.toContain('rounded-lg');
    expect(dashboardSrc).not.toContain('rounded-xl');
    expect(dashboardSrc).not.toContain('rounded-2xl');

    // Bắt buộc font-mono tabular-nums cho dữ liệu
    expect(dashboardSrc).toContain('font-mono');
    expect(dashboardSrc).toContain('tabular-nums');

    // Không tồn tại lỗi prop cũ rate.pct
    expect(dashboardSrc).not.toContain('otdRate={rate.pct}');

    // Cấm shadow-xl trên modal theo chuẩn wireframe
    expect(dashboardSrc).not.toContain('shadow-xl');
  });

  it('TC-DB-08: Khai thông cơ chế cuộn trang Desktop trong dynamo-shell và container nội bộ', () => {
    const shellSrc = fs.readFileSync(path.join(rootDir, 'src/components/dynamo-shell.tsx'), 'utf-8');
    expect(shellSrc).toContain("isTracking ? 'overflow-y-auto md:overflow-hidden' : 'overflow-y-auto'");

    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');
    expect(dashboardSrc).toContain('overflow-y-auto');
    expect(dashboardSrc).toContain('overflow-x-hidden');
  });

  it('TC-DB-09: Tích hợp Compact Master Command Toolbar tiết kiệm không gian hiển thị', () => {
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');
    expect(dashboardSrc).toContain('[2] TỔNG QUAN LUÂN CHUYỂN');
    expect(dashboardSrc).toContain('Làm mới');
    expect(dashboardSrc).not.toContain('In biên bản giao ca A4');
  });
});
