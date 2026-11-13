import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('UI/UX Graphite Wireframe Standardization (v2.2.0)', () => {
  const root = process.cwd();

  it('TC-UI-01: styles.css phải khai báo token --font-mono là Be Vietnam Pro trong @theme inline', () => {
    const cssPath = path.join(root, 'src', 'styles.css');
    const content = fs.readFileSync(cssPath, 'utf8');

    expect(content).toContain('--font-mono: "Be Vietnam Pro"');
    const themeInlineMatch = content.match(/@theme inline\s*{([^}]+)}/s);
    expect(themeInlineMatch).toBeTruthy();
    expect(themeInlineMatch![1]).toContain('--font-mono');
  });

  it('TC-UI-02: TrackingHeaderCell trong tracking.tsx phải dùng text-[10.5px] chuẩn v2.6.0', () => {
    const trackingPath = path.join(root, 'src', 'routes', 'tracking.tsx');
    const content = fs.readFileSync(trackingPath, 'utf8');

    expect(content).toContain('text-[10.5px] font-bold uppercase tracking-wider text-muted-foreground');
  });

  it('TC-UI-03: Cả 4 routes chính phải sở hữu huy hiệu định danh phân hệ thống nhất [1]..[4]', () => {
    const tracking = fs.readFileSync(path.join(root, 'src', 'routes', 'tracking.tsx'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'src', 'routes', 'dashboard.tsx'), 'utf8');
    const orders = fs.readFileSync(path.join(root, 'src', 'routes', 'orders.tsx'), 'utf8');
    const sync = fs.readFileSync(path.join(root, 'src', 'routes', 'sync.tsx'), 'utf8');

    expect(tracking).toContain('[1] LUÂN CHUYỂN');
    expect(dashboard).toContain('[2] TỔNG QUAN LUÂN CHUYỂN');
    expect(orders).toContain('[3] ĐƠN ĐẶT HÀNG');
    expect(sync).toContain('[4] ĐỒNG BỘ');
  });

  it('TC-UI-04: Sub-header của cả 4 routes phải đóng khung Wireframe Card chuẩn', () => {
    const tracking = fs.readFileSync(path.join(root, 'src', 'routes', 'tracking.tsx'), 'utf8');
    const dashboard = fs.readFileSync(path.join(root, 'src', 'routes', 'dashboard.tsx'), 'utf8');
    const orders = fs.readFileSync(path.join(root, 'src', 'routes', 'orders.tsx'), 'utf8');
    const sync = fs.readFileSync(path.join(root, 'src', 'routes', 'sync.tsx'), 'utf8');

    const cardClasses = 'rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs';
    expect(tracking).toContain(cardClasses);
    expect(dashboard).toContain(cardClasses);
    expect(orders).toContain(cardClasses);
    expect(sync).toContain(cardClasses);
  });

  it('TC-UI-05: LotUpdateButton hỗ trợ variant icon (size-7) và button (h-8)', () => {
    const lotUpdatePath = path.join(root, 'src', 'components', 'lot-update-dialog.tsx');
    const content = fs.readFileSync(lotUpdatePath, 'utf8');

    expect(content).toContain("variant?: 'icon' | 'button'");
    expect(content).toContain('size-7 rounded-xs');
    expect(content).toContain('variant === \'icon\' ?');
  });

  it('TC-UI-06: LotUpdateDialog phải có nút Hủy bỏ, DialogDescription và chuẩn hóa kích thước h-8.5', () => {
    const lotUpdatePath = path.join(root, 'src', 'components', 'lot-update-dialog.tsx');
    const content = fs.readFileSync(lotUpdatePath, 'utf8');

    // Nút Hủy bỏ
    expect(content).toContain('Hủy bỏ');
    expect(content).toContain('variant="ghost"');

    // DialogDescription cho Radix UI WAI-ARIA
    expect(content).toContain('<DialogDescription className="sr-only">');

    // Sizing chuẩn hóa h-8.5 font-mono text-xs
    expect(content).toContain('h-8.5 w-full rounded-xs border border-input bg-background px-2.5 font-mono text-xs');

    // Bo góc sắc nét rounded-xs trên alert và confirm
    expect(content).toContain('rounded-xs border border-destructive/30 bg-destructive/10');
    expect(content).toContain('rounded-xs border border-warning/40 bg-warning/10');
  });

  it('TC-UI-07: Bảng dữ liệu /dashboard và /orders phải dùng LotUpdateButton variant="icon"', () => {
    const dashboard = fs.readFileSync(path.join(root, 'src', 'routes', 'dashboard.tsx'), 'utf8');
    const orders = fs.readFileSync(path.join(root, 'src', 'routes', 'orders.tsx'), 'utf8');

    expect(dashboard).toContain('<LotUpdateButton item={r} variant="icon" />');
    expect(orders).toContain('<LotUpdateButton item={i} variant="icon" />');
  });

  it('TC-UI-08: Thanh công cụ /orders phải dùng ô tìm kiếm chuẩn h-8 rounded-xs', () => {
    const orders = fs.readFileSync(path.join(root, 'src', 'routes', 'orders.tsx'), 'utf8');
    expect(orders).toContain('h-8 w-full rounded-xs border border-input bg-background pl-8 pr-2.5 text-xs');
  });

  it('TC-UI-09: Trang /dashboard phải có nút Làm Mới gọi pullLive(true) và phím tắt Shift+R', () => {
    const dashboard = fs.readFileSync(path.join(root, 'src', 'routes', 'dashboard.tsx'), 'utf8');

    expect(dashboard).toContain('pullLive(true)');
    expect(dashboard).toContain('RefreshCw');
    expect(dashboard).toContain('Shift+R');
    expect(dashboard).toContain('Làm mới');
  });

  it('TC-UI-10: Trang /orders phải có nút Làm Mới gọi pullLive(true) trên Sub-Header Card', () => {
    const orders = fs.readFileSync(path.join(root, 'src', 'routes', 'orders.tsx'), 'utf8');

    expect(orders).toContain('pullLive(true)');
    expect(orders).toContain('RefreshCw');
    expect(orders).toContain('Shift+R');
    expect(orders).toContain('Làm mới');
  });
});
