import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('DYNAMO QT-MES: Graphite Wireframe Design System Compliance Tests', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const stylesCssPath = path.join(rootDir, 'src/styles.css');
  const designSystemMdPath = path.join(rootDir, 'DESIGN-SYSTEM.md');
  const agentsMdPath = path.join(rootDir, 'AGENTS.md');
  const trackingTsxPath = path.join(rootDir, 'src/routes/tracking.tsx');
  const dashboardTsxPath = path.join(rootDir, 'src/routes/dashboard.tsx');
  const ordersTsxPath = path.join(rootDir, 'src/routes/orders.tsx');

  it('TC-DS-01: Tài liệu tối thượng DESIGN-SYSTEM.md tồn tại và được liên kết trong AGENTS.md', () => {
    expect(fs.existsSync(designSystemMdPath), 'DESIGN-SYSTEM.md phải tồn tại ở thư mục gốc').toBe(true);
    const designDoc = fs.readFileSync(designSystemMdPath, 'utf-8');
    expect(designDoc).toContain('Graphite Wireframe UI');
    expect(designDoc).toContain('2px');

    expect(fs.existsSync(agentsMdPath), 'AGENTS.md phải tồn tại').toBe(true);
    const agentsDoc = fs.readFileSync(agentsMdPath, 'utf-8');
    expect(agentsDoc).toContain('DESIGN-SYSTEM.md');
    expect(agentsDoc).toContain('Graphite Wireframe UI');
  });

  it('TC-DS-02: Design Tokens trong src/styles.css phải cố định chuẩn bo góc tối thiểu 2px', () => {
    const css = fs.readFileSync(stylesCssPath, 'utf-8');
    // :root và .dark phải định nghĩa --radius: 2px
    expect(css).toMatch(/--radius:\s*2px;/);
    expect(css).toMatch(/--radius-sm:\s*2px;/);
    expect(css).toMatch(/--radius-md:\s*2px;/);

    // Kiểm tra các token màu công nghiệp
    expect(css).toContain('--color-graphite');
    expect(css).toContain('--color-run');
    expect(css).toContain('--color-wait');
    expect(css).toContain('--color-breakdown');
  });

  it('TC-DS-03: UI Primitives (Button, Card, Badge, Input, Dialog) tuân thủ chuẩn bo góc 2px', () => {
    const buttonSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/button.tsx'), 'utf-8');
    expect(buttonSrc).not.toContain('rounded-md');
    expect(buttonSrc).not.toContain('rounded-lg');
    expect(buttonSrc).not.toContain('rounded-xl');
    expect(buttonSrc).toContain('rounded-xs');

    const cardSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/card.tsx'), 'utf-8');
    expect(cardSrc).not.toContain('rounded-xl');
    expect(cardSrc).not.toContain('rounded-lg');
    expect(cardSrc).toContain('rounded-xs');

    const badgeSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/badge.tsx'), 'utf-8');
    expect(badgeSrc).not.toContain('rounded-md');
    expect(badgeSrc).toContain('rounded-xs');

    const dialogSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/dialog.tsx'), 'utf-8');
    expect(dialogSrc).not.toContain('sm:rounded-lg');
    expect(dialogSrc).toContain('sm:rounded-xs');

    const inputSrc = fs.readFileSync(path.join(rootDir, 'src/components/ui/input.tsx'), 'utf-8');
    expect(inputSrc).not.toContain('rounded-md');
    expect(inputSrc).toContain('rounded-xs');
  });

  it('TC-DS-04: Bảng điều độ tracking.tsx không chứa rounded-xl, rounded-2xl và có font-mono tabular-nums', () => {
    const trackingSrc = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Không chứa rounded-xl hoặc rounded-2xl
    expect(trackingSrc).not.toContain('rounded-xl');
    expect(trackingSrc).not.toContain('rounded-2xl');

    // Chứa font-mono và tabular-nums
    expect(trackingSrc).toContain('font-mono');
    expect(trackingSrc).toContain('tabular-nums');

    // Chứa mã trạng thái công nghiệp wireframe
    expect(trackingSrc).toContain('WAIT');
    expect(trackingSrc).toContain('TRANSIT');
    expect(trackingSrc).toContain('STOCKED');
  });

  it('TC-DS-05: Các trang Dashboard & Orders tuân thủ chuẩn bo góc tối thiểu 2px và font-mono tabular-nums', () => {
    expect(fs.existsSync(dashboardTsxPath), 'dashboard.tsx phải tồn tại').toBe(true);
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');
    expect(dashboardSrc).not.toContain('rounded-lg');
    expect(dashboardSrc).not.toContain('rounded-xl');
    expect(dashboardSrc).not.toContain('rounded-2xl');
    expect(dashboardSrc).not.toContain('shadow-2xl');
    expect(dashboardSrc).not.toContain('neutral-900');
    expect(dashboardSrc).toContain('font-mono');
    expect(dashboardSrc).toContain('tabular-nums');
    expect(dashboardSrc).toContain('[KPI-01]');

    expect(fs.existsSync(ordersTsxPath), 'orders.tsx phải tồn tại').toBe(true);
    const ordersSrc = fs.readFileSync(ordersTsxPath, 'utf-8');
    expect(ordersSrc).not.toContain('rounded-lg');
    expect(ordersSrc).not.toContain('rounded-xl');
    expect(ordersSrc).not.toContain('rounded-2xl');
    expect(ordersSrc).toContain('font-mono');
    expect(ordersSrc).toContain('tabular-nums');
  });

  it('TC-DS-06: Khai thông liên kết drill-down 2 chiều giữa /dashboard và /tracking', () => {
    const trackingSrc = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Kiểm tra tracking.tsx hỗ trợ đầy đủ các focus từ Dashboard
    expect(trackingSrc).toContain("'overdue'");
    expect(trackingSrc).toContain("'due_soon'");
    expect(trackingSrc).toContain("'no_qc'");
    expect(trackingSrc).toContain("'qc_fail'");
    expect(trackingSrc).toContain("'open'");
    expect(trackingSrc).toContain("'stocked'");

    // Kiểm tra tracking.tsx hỗ trợ lọc theo vendor và workshop
    expect(trackingSrc).toContain('vendor?: string');
    expect(trackingSrc).toContain('workshop?: Workshop');
    expect(trackingSrc).toContain('logistics?: Logistics');

    // Kiểm tra dashboard.tsx có liên kết sang tracking kèm tham số
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');
    expect(dashboardSrc).toContain('to="/tracking"');
    expect(dashboardSrc).toContain('to="open"');
    expect(dashboardSrc).toContain('to="overdue"');
    expect(dashboardSrc).toContain('to="no_qc"');
  });

  it('TC-DS-07: Chuẩn hóa phân bổ kích thước cột Fluid-Fixed Hybrid bảng /tracking', () => {
    const trackingSrc = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Kiểm tra tỷ lệ kích thước mặc định tối ưu
    expect(trackingSrc).toContain('checkbox: 40');
    expect(trackingSrc).toContain('ID_Key: 130');
    expect(trackingSrc).toContain('So_DatHang: 120');
    expect(trackingSrc).toContain('ma_hang: 110');
    expect(trackingSrc).toContain('vat_lieu: 100');
    expect(trackingSrc).toContain('do_cung: 100');
    expect(trackingSrc).toContain('so_luong: 70');
    expect(trackingSrc).toContain('kg_Lot: 70');
    expect(trackingSrc).toContain('cty_QT: 125');
    expect(trackingSrc).toContain('TrangThai: 110');
    expect(trackingSrc).toContain('qc: 100');
    expect(trackingSrc).toContain('ngay_gui_QT: 115');
    expect(trackingSrc).toContain('han_tra: 115');
    expect(trackingSrc).toContain('ghi_chu: 165');
    expect(trackingSrc).toContain('ticket: 58');

    // Kiểm tra giới hạn co giãn tối thiểu an toàn
    expect(trackingSrc).toContain('so_luong: 60');
    expect(trackingSrc).toContain('kg_Lot: 60');
    expect(trackingSrc).toContain('vat_lieu: 90');
    expect(trackingSrc).toContain('do_cung: 90');
  });

  it('TC-DS-08: Cơ chế Sticky Pin 2 đầu (Pin Left Checkbox/Mã lô & Pin Right Phiếu A4)', () => {
    const trackingSrc = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Pin Left: Checkbox (left-0) và Mã lô (left-[checkbox])
    expect(trackingSrc).toContain('sticky left-0');
    expect(trackingSrc).toContain('stickyLeft={colWidths.checkbox}');
    expect(trackingSrc).toContain('shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)]');

    // Pin Right: Cột Phiếu A4 ở cả Header và Body
    expect(trackingSrc).toContain('sticky top-0 right-0 z-50');
    expect(trackingSrc).toContain('sticky right-0 z-20');
    expect(trackingSrc).toContain('shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.08)]');
    expect(trackingSrc).toContain('border-l border-slate-200 dark:border-border/80');
  });

  it('TC-DS-09: Chuẩn hóa High-Density Industrial Grid (chiều cao 34px, micro-spacing py-1 px-2 và font-mono tabular-nums)', () => {
    const trackingSrc = fs.readFileSync(trackingTsxPath, 'utf-8');
    // Kiểm tra chuẩn hóa chiều cao dòng 34px, padding 4px x 8px, font size và viền slate-200
    expect(trackingSrc).toContain('h-[34px]');
    expect(trackingSrc).toContain('text-[10.5px]');
    expect(trackingSrc).toContain('text-[11.5px]');
    expect(trackingSrc).toContain('border-slate-200');

    // Kiểm tra căn phải và monospace định lượng số học
    expect(trackingSrc).toContain('text-right font-mono tabular-nums text-foreground');
  });

  it('TC-DS-10: Cơ chế chuyển đổi sắp xếp tuần tự liên tục cột Ngày gửi (ngay_gui_QT)', () => {
    const trackingSrc = fs.readFileSync(trackingTsxPath, 'utf-8');

    // 1. Kiểm tra mã nguồn tracking.tsx có nhánh xử lý đặc biệt cho ngay_gui_QT
    expect(trackingSrc).toContain("field === 'ngay_gui_QT' ? 'desc' : 'asc'");
    expect(trackingSrc).toMatch(/if\s*\(field\s*===\s*'ngay_gui_QT'\)\s*\{\s*setSortDir\('asc'\);/);
    expect(trackingSrc).toMatch(/field\s*===\s*'ngay_gui_QT'\s*\?\s*'Giảm dần → Tăng dần'/);

    // 2. Kiểm thử logic mô phỏng state machine của handleToggleSort
    let sortCol = 'ngay_gui_QT';
    let sortDir: 'asc' | 'desc' = 'desc';

    const simulateToggleSort = (field: string) => {
      if (sortCol !== field) {
        sortCol = field;
        sortDir = field === 'ngay_gui_QT' ? 'desc' : 'asc';
      } else if (sortDir === 'asc') {
        sortDir = 'desc';
      } else {
        if (field === 'ngay_gui_QT') {
          sortDir = 'asc';
        } else {
          sortCol = 'ngay_gui_QT';
          sortDir = 'desc';
        }
      }
    };

    // Kiểm tra cột Ngày gửi: khởi đầu là desc -> click 1: asc -> click 2: desc -> click 3: asc (không bị dừng/mắc kẹt ở desc)
    expect(sortCol).toBe('ngay_gui_QT');
    expect(sortDir).toBe('desc');

    simulateToggleSort('ngay_gui_QT');
    expect(sortCol).toBe('ngay_gui_QT');
    expect(sortDir).toBe('asc');

    simulateToggleSort('ngay_gui_QT');
    expect(sortCol).toBe('ngay_gui_QT');
    expect(sortDir).toBe('desc');

    simulateToggleSort('ngay_gui_QT');
    expect(sortCol).toBe('ngay_gui_QT');
    expect(sortDir).toBe('asc');

    // Kiểm tra cột khác (ví dụ: vat_lieu): click 1: asc -> click 2: desc -> click 3: reset về ngay_gui_QT (desc)
    simulateToggleSort('vat_lieu');
    expect(sortCol).toBe('vat_lieu');
    expect(sortDir).toBe('asc');

    simulateToggleSort('vat_lieu');
    expect(sortCol).toBe('vat_lieu');
    expect(sortDir).toBe('desc');

    simulateToggleSort('vat_lieu');
    expect(sortCol).toBe('ngay_gui_QT');
    expect(sortDir).toBe('desc');
  });
});
