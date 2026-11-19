import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Lot Detail Modal Floating Window (v2.7.0) Specification Suite (TDD)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const trackingPath = path.join(rootDir, 'src/routes/tracking.tsx');
  const modalPath = path.join(rootDir, 'src/components/tracking/lot-detail-modal.tsx');

  it('TC-LDM-01: LotDetailModal tồn tại ở src/components/tracking/lot-detail-modal.tsx và tuân thủ chuẩn Center Floating Pop-up Window (rounded-xl, max-w-5xl, shadow-2xl)', () => {
    expect(fs.existsSync(modalPath), 'lot-detail-modal.tsx phải tồn tại').toBe(true);
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Tên component LotDetailModal
    expect(modalCode).toMatch(/function\s+LotDetailModal\s*\(/);
    // Căn giữa màn hình và bo góc rounded-xl theo Floating Window v2.7.0
    expect(modalCode).toMatch(/justify-center/);
    expect(modalCode).toMatch(/max-w-5xl/);
    expect(modalCode).toMatch(/rounded-xl/);
    expect(modalCode).toMatch(/shadow-2xl/);
  });

  it('TC-LDM-02: tracking.tsx import và kích hoạt LotDetailModal, triệt tiêu hoàn toàn slide-over drawer mép phải', () => {
    expect(fs.existsSync(trackingPath), 'tracking.tsx phải tồn tại').toBe(true);
    const trackingCode = fs.readFileSync(trackingPath, 'utf-8');

    // Import LotDetailModal từ src/components/tracking/lot-detail-modal
    expect(trackingCode).toMatch(/import\s*\{\s*LotDetailModal\s*\}\s*from\s*['"]@\/components\/tracking\/lot-detail-modal['"]/);
    // Kích hoạt khi có detailLot
    expect(trackingCode).toMatch(/<LotDetailModal/);
    // Không còn sử dụng hay định nghĩa LotDetailDrawer
    expect(trackingCode).not.toContain('function LotDetailDrawer');
    expect(trackingCode).not.toMatch(/<LotDetailDrawer/);
    // Không còn slide-in-from-right hay justify-end trên drawer cũ
    expect(trackingCode).not.toContain('slide-in-from-right');
  });

  it('TC-LDM-03: Cấu trúc 2 cột Bento Grid rộng rãi (md:grid-cols-12 với phân tách cột 5:7)', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Cấu trúc Bento 12 cột với 2 phân vùng 5:7
    expect(modalCode).toMatch(/grid-cols-1\s+md:grid-cols-12/);
    expect(modalCode).toMatch(/md:col-span-5/);
    expect(modalCode).toMatch(/md:col-span-7/);
  });

  it('TC-LDM-04: Footer tích hợp bộ điều hướng duyệt lô nhanh (Lô trước / Lô sau) và In phiếu A4', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Có nút hoặc hàm duyệt Lô trước / Lô sau
    expect(modalCode).toMatch(/handlePrevLot|Lô trước/);
    expect(modalCode).toMatch(/handleNextLot|Lô sau/);
    // Tích hợp JobTicketButton
    expect(modalCode).toMatch(/JobTicketButton[^>]+item/);
  });

  it('TC-LDM-05: Bảo toàn chế độ chỉnh sửa phân nhóm, ô kích thước, và ghi nhận audit trail kèm âm thanh', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Xử lý chỉnh sửa
    expect(modalCode).toMatch(/handleSave|isEditing/);
    expect(modalCode).toMatch(/appendAudit/);
    expect(modalCode).toMatch(/playAudioCue/);
    expect(modalCode).toMatch(/Kich_Thuoc_SP/);
  });
});
