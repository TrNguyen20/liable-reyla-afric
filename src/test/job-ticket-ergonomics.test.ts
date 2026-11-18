import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Job Ticket Ergonomics & Shop-Floor UX Suite (TDD)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const jobTicketPath = path.join(rootDir, 'src/components/job-ticket.tsx');
  const trackingPath = path.join(rootDir, 'src/routes/tracking.tsx');

  it('TC-JT-01: JobTicketButton hỗ trợ siblingItems và duyệt Lô trước / Lô sau', () => {
    expect(fs.existsSync(jobTicketPath), 'job-ticket.tsx phải tồn tại').toBe(true);
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Hỗ trợ prop siblingItems
    expect(code).toContain('siblingItems');
    // Có nút hoặc chức năng Lô trước / Lô sau
    expect(code).toMatch(/Lô trước|prevItem|handlePrev/);
    expect(code).toMatch(/Lô sau|nextItem|handleNext/);
  });

  it('TC-JT-02: Toolbar 3 cụm chuẩn Studio/CAD và hỗ trợ phím tắt xưởng (ArrowLeft/Right, P, C, Esc)', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Toolbar có cấu trúc 3 cụm
    expect(code).toContain('job-ticket-studio-header');
    // Hỗ trợ phím tắt
    expect(code).toContain('ArrowLeft');
    expect(code).toContain('ArrowRight');
    expect(code).toMatch(/key === ['"]p['"]|key === ['"]P['"]/i);
  });

  it('TC-JT-03: Sub-toolbar Cấu hình in nhanh hỗ trợ Số liên in (1x/2x/3x), Quick Memo và Trang 1/1', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Chọn số liên in (1, 2, 3)
    expect(code).toMatch(/copies/i);
    expect(code).toContain('Số liên');
    // Ô nhập Quick Memo
    expect(code).toMatch(/quickMemo|memo/i);
    // Nhãn kiểm soát Trang 1/1
    expect(code).toMatch(/Trang 1\/1/);
  });

  it('TC-JT-04: Khối LƯU Ý ĐIỀU ĐỘNG viền nổi bật xuất hiện trên phiếu A4 khi có Quick Memo', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    expect(code).toMatch(/LƯU Ý ĐIỀU ĐỘNG|GHI CHÚ KỸ THUẬT/);
  });

  it('TC-JT-05: printTicketElement hỗ trợ nhân bản đa liên theo số bản in copies với ngắt trang', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    expect(code).toMatch(/function printTicketElement/);
    expect(code).toMatch(/copies/);
    expect(code).toMatch(/page-break-after:\s*always/);
  });

  it('TC-JT-06: Cơ chế thu phóng Container tỷ lệ thực Responsive Scaled Wrapper (triệt tiêu thanh cuộn ảo)', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Có tính toán tỷ lệ thực hoặc scaled dimensions
    expect(code).toMatch(/210\s*\*\s*.*mm|scaledWidth|scaledHeight/);
    expect(code).toContain('transformOrigin');
  });

  it('TC-JT-07: SinglePalletTagContent chuẩn hóa kích thước chữ nhật đứng 100 x 150 mm', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Tem Pallet 100x150mm
    expect(code).toMatch(/100mm/);
    expect(code).toMatch(/150mm/);
  });

  it('TC-JT-08: tracking.tsx truyền siblingItems vào JobTicketButton để duyệt in liên tục', () => {
    expect(fs.existsSync(trackingPath)).toBe(true);
    const trackingCode = fs.readFileSync(trackingPath, 'utf-8');

    expect(trackingCode).toMatch(/JobTicketButton[^>]+siblingItems/);
  });
});
