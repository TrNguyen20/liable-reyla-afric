import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { mapRows } from '@/lib/dynamo-source';

describe('DYNAMO MES: Dashboard Comprehensive Bug Fixes Verification Suite', () => {
  const rootDir = process.cwd();
  const dashboardTsx = fs.readFileSync(path.join(rootDir, 'src/routes/dashboard.tsx'), 'utf-8');
  const bottleneckTsx = fs.readFileSync(path.join(rootDir, 'src/components/dashboard/dashboard-bottleneck-center.tsx'), 'utf-8');
  const stylesCss = fs.readFileSync(path.join(rootDir, 'src/styles.css'), 'utf-8');
  const shellTsx = fs.readFileSync(path.join(rootDir, 'src/components/dynamo-shell.tsx'), 'utf-8');
  const telemetryTsx = fs.readFileSync(path.join(rootDir, 'src/components/shopfloor-telemetry.tsx'), 'utf-8');

  // =========================================================================
  // 1. Kiểm tra Lỗi hiển thị chuỗi code thô & Định dạng số
  // =========================================================================
  it('TC-FIX-01: Không lộ chuỗi code thô to="overdue", to="open", to="due_soon" trên text nút bấm', () => {
    // Chuỗi test-token phải được đặt trong sr-only hoặc data-nav, text hiển thị là tiếng Việt
    expect(dashboardTsx).toContain('Quá hạn ({number(overdueLots.length)})');
    expect(dashboardTsx).toContain('Lô mở ({number(openLots.length)})');
    expect(dashboardTsx).toContain('Cận hạn ({number(soonLots.length)})');
    expect(dashboardTsx).toContain('<span className="sr-only">to="overdue"</span>');
    expect(dashboardTsx).toContain('<span className="sr-only">to="open"</span>');

    expect(bottleneckTsx).toContain('Quá hạn ({number(overdueLotsCount)})');
    expect(bottleneckTsx).toContain('Lô mở ({number(openLotsCount)})');
    expect(bottleneckTsx).toContain('Cận hạn ({number(soonLotsCount)})');
    expect(bottleneckTsx).toContain('<span className="sr-only">to="overdue"</span>');
  });

  it('TC-FIX-02: Định dạng hàng nghìn có dấu chấm phân cách đồng nhất trên phân trang & thẻ lọc', () => {
    // Phân trang dùng number()
    expect(dashboardTsx).toContain('Trang {number(bottleneckPage + 1)} / {number(totalBottleneckPages)}');
    expect(dashboardTsx).toContain('Hiển thị {number(bottleneckPage * BOTTLENECK_PAGE_SIZE + 1)}');
    expect(dashboardTsx).toContain('Tất Cả ({number(allBottleneckItems.length)})');
    expect(dashboardTsx).toContain('Quá Hạn ({number(overdueLots.length)})');
    expect(dashboardTsx).toContain('Trễ &gt;7d: {number(criticalOverdueLots.length)} Lô');

    expect(bottleneckTsx).toContain('Trang {number(bottleneckPage + 1)} / {number(totalBottleneckPages)}');
    expect(bottleneckTsx).toContain('Tất Cả ({number(allBottleneckItems.length)})');
  });

  // =========================================================================
  // 2. Kiểm tra Bố cục & Trải nghiệm cuộn trang (Layout / UX)
  // =========================================================================
  it('TC-FIX-03: Khóa window scroll trên html, body để triệt tiêu khoảng trắng thừa dưới footer', () => {
    expect(stylesCss).toMatch(/html,\s*body\s*\{[\s\S]*?overflow:\s*hidden;/);
  });

  it('TC-FIX-04: Bảng điểm nghẽn có sticky header và vùng cuộn tối đa 460px', () => {
    expect(dashboardTsx).toContain('max-h-[460px]');
    expect(dashboardTsx).toContain('sticky top-0');
    expect(dashboardTsx).toContain('bg-secondary/95');

    expect(bottleneckTsx).toContain('max-h-[460px]');
    expect(bottleneckTsx).toContain('sticky top-0');
  });

  it('TC-FIX-05: Navbar điều hướng chính ẩn thanh cuộn ngang chống cắt xén chữ', () => {
    expect(shellTsx).toContain('scrollbar-none');
    expect(shellTsx).toContain('[scrollbar-width:none]');
  });

  // =========================================================================
  // 3. Kiểm tra Logic dữ liệu & Tính toán KPI
  // =========================================================================
  it('TC-FIX-06: Cô lập Data Hygiene - Không gộp các lô thiếu hạn trả cam kết vào bộ đếm sự cố khẩn cấp', () => {
    // allBottleneckItems chỉ phụ thuộc vào overdueLots, soonLots, syncErrLots
    expect(dashboardTsx).toContain('const allBottleneckItems = useMemo(() => {');
    expect(dashboardTsx).toContain('}, [overdueLots, soonLots, syncErrLots]);');
    // Nhóm thiếu hạn trả tách riêng
    expect(dashboardTsx).toContain("if (bottleneckTab === 'missing_due')");
  });

  it('TC-FIX-07: Đồng bộ khối lượng hàng ngoài lò trên Shopfloor Telemetry khớp thẻ KPI ĐANG NHIỆT / VENDOR', () => {
    expect(telemetryTsx).toContain('r.TrangThai === "Chờ xuất xưởng"');
    expect(telemetryTsx).toContain('r.TrangThai === "Đang tại Vendor"');
    expect(telemetryTsx).toContain('Chờ xuất:');
    expect(telemetryTsx).toContain('waitingKg');
  });

  it('TC-FIX-08: dynamo-source mapRows nhận diện ngày nhận và trạng thái hoàn tất thành công', () => {
    const rawRows = [
      {
        id_nhiet_qt: 'LOT-DONE-01',
        ma_hang: 'PART-A',
        so_dat_hang: 'PO-01',
        ngay_nhan: '2026-03-20', // Đã nhận về
      },
      {
        id_nhiet_qt: 'LOT-DONE-02',
        ma_hang: 'PART-B',
        so_dat_hang: 'PO-02',
        trang_thai: 'Hoàn tất', // Trạng thái hoàn tất tiếng Việt
      },
      {
        id_nhiet_qt: 'LOT-WIP-01',
        ma_hang: 'PART-C',
        so_dat_hang: 'PO-03',
        ncc_ngay_qt: '2026-03-21',
      },
    ];

    const result = mapRows(rawRows);
    expect(result.items.length).toBe(3);
    expect(result.items[0]?.TrangThai).toBe('Đã nhập kho');
    expect(result.items[1]?.TrangThai).toBe('Đã nhập kho');
    expect(result.items[2]?.TrangThai).toBe('Đang tại Vendor');
  });
});
