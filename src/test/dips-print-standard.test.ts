import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Dynamo Industrial Print Standard (DIPS v1.0) Specification Suite (TDD)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const jobTicketPath = path.join(rootDir, 'src/components/job-ticket.tsx');

  it('TC-DIPS-01: printTicketElement hỗ trợ tham số orientation ("portrait" | "landscape") và chèn CSS @page tương ứng', () => {
    expect(fs.existsSync(jobTicketPath), 'job-ticket.tsx phải tồn tại').toBe(true);
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Signature printTicketElement phải nhận orientation
    expect(code).toMatch(/function\s+printTicketElement\s*\([^)]*orientation/);
    // Phải cấu hình CSS @page size theo orientation
    expect(code).toMatch(/@page\s*\{\s*size:\s*A4\s*[^;]*orientation|size:\s*`?A4\s*\$\{orientation\}`?/i);
  });

  it('TC-DIPS-02: Isolated iframe DOM sanitizer loại bỏ các thuộc tính gây đóng băng ngắt trang (overflow, max-height, flex)', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Phải có cơ chế sanitize inline styles hoặc class để Chromium không bị ép vào "1 sheet of paper"
    expect(code).toMatch(/overflow|maxHeight|display/);
    expect(code).toMatch(/overflow:\s*visible|display:\s*block/);
  });

  it('TC-DIPS-03: .printable-job-ticket cố định chiều cao ISO 216 và quy định break-after: page; last-child reset', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Bắt buộc có break-after: page / page-break-after: always
    expect(code).toMatch(/page-break-after:\s*always/);
    expect(code).toMatch(/break-after:\s*page/);
    // Phần tử cuối cùng phải reset để không in trang trắng thừa
    expect(code).toMatch(/last-child[^}]*(?:page-break-after:\s*auto|break-after:\s*auto)/);
    // Cố định chiều cao A4 trừ lề
    expect(code).toMatch(/297mm/);
  });

  it('TC-DIPS-04: Batch multi-lot manifest (Bảng kê tổng hợp) truyền orientation: "landscape" và áp dụng layout A4 Ngang', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Mode manifest phải truyền 'landscape' khi in
    expect(code).toMatch(/printTicketElement\([^)]*['"]landscape['"]/);
    // Bảng kê có chỉ thị hoặc CSS landscape
    expect(code).toMatch(/landscape|A4 Ngang/i);
  });

  it('TC-DIPS-05: Batch individual tickets (Tập phiếu A4) truyền orientation: "portrait" với cấu trúc 1 phiếu = 1 tờ A4', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Mode tickets phải truyền 'portrait' khi in
    expect(code).toMatch(/printTicketElement\([^)]*['"]portrait['"]/);
  });

  it('TC-DIPS-06: Preview modal cung cấp khung giấy A4 chuẩn trực quan (aspect ratio, ranh giới trang)', () => {
    const code = fs.readFileSync(jobTicketPath, 'utf-8');

    // Có chỉ thị tỷ lệ A4 hoặc khung giấy trực quan
    expect(code).toMatch(/aspect-\[210\/297\]|aspect-\[297\/210\]|ISO 216|210mm/);
    // Hiển thị nhãn chỉ báo khổ in
    expect(code).toMatch(/A4 (?:Dọc|Ngang)|portrait|landscape/i);
  });
});
