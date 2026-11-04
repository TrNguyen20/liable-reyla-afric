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
    expect(trackingSrc).toContain('[WAIT]');
    expect(trackingSrc).toContain('[TRANSIT]');
    expect(trackingSrc).toContain('[STOCKED]');
  });

  it('TC-DS-05: Các trang Dashboard & Orders tuân thủ chuẩn bo góc tối thiểu 2px và font-mono tabular-nums', () => {
    expect(fs.existsSync(dashboardTsxPath), 'dashboard.tsx phải tồn tại').toBe(true);
    const dashboardSrc = fs.readFileSync(dashboardTsxPath, 'utf-8');
    expect(dashboardSrc).not.toContain('rounded-lg');
    expect(dashboardSrc).not.toContain('rounded-xl');
    expect(dashboardSrc).not.toContain('rounded-2xl');
    expect(dashboardSrc).toContain('font-mono');
    expect(dashboardSrc).toContain('tabular-nums');

    expect(fs.existsSync(ordersTsxPath), 'orders.tsx phải tồn tại').toBe(true);
    const ordersSrc = fs.readFileSync(ordersTsxPath, 'utf-8');
    expect(ordersSrc).not.toContain('rounded-lg');
    expect(ordersSrc).not.toContain('rounded-xl');
    expect(ordersSrc).not.toContain('rounded-2xl');
    expect(ordersSrc).toContain('font-mono');
    expect(ordersSrc).toContain('tabular-nums');
  });
});
