import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Lot Detail Modal Floating Window (v2.8.0) Specification Suite (TDD)', () => {
  const rootDir = path.resolve(__dirname, '../../');
  const trackingPath = path.join(rootDir, 'src/routes/tracking.tsx');
  const modalPath = path.join(rootDir, 'src/components/tracking/lot-detail-modal.tsx');

  it('TC-LDM-01: LotDetailModal tồn tại ở src/components/tracking/lot-detail-modal.tsx và tuân thủ chuẩn Center Floating Pop-up Window (rounded-xl, max-w-5xl hoặc max-w-6xl, shadow-2xl)', () => {
    expect(fs.existsSync(modalPath), 'lot-detail-modal.tsx phải tồn tại').toBe(true);
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Tên component LotDetailModal
    expect(modalCode).toMatch(/function\s+LotDetailModal\s*\(/);
    // Căn giữa màn hình và bo góc rounded-xl theo Floating Window v2.7.0/v2.8.0
    expect(modalCode).toMatch(/justify-center/);
    expect(modalCode).toMatch(/max-w-(5xl|6xl)/);
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

  it('TC-LDM-03: Triệt tiêu hoàn toàn thẻ Logistics cũ và LotUpdateButton', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Không còn import hay sử dụng LotUpdateButton
    expect(modalCode).not.toContain('LotUpdateButton');
    // Không còn thẻ LOGISTICS riêng biệt với nút Cập nhật
    expect(modalCode).not.toContain('Cập nhật lô');
  });

  it('TC-LDM-04: Bố cục Bento Grid 4 Phân Vùng Khoa Học bao quát 36 cột Dynamo MES', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // 4 Phân vùng Bento Grid rõ rệt
    // Vùng 1: Định danh & Phôi (ma_hang, id_ma_hang, ngay_tao, nguoi_tao, quoc_gia, phong_sx, doi_tuong_hang)
    expect(modalCode).toMatch(/id_ma_hang/);
    expect(modalCode).toMatch(/ngay_tao/);
    expect(modalCode).toMatch(/quoc_gia/);
    expect(modalCode).toMatch(/doi_tuong_hang/);

    // Vùng 2: Thông số kỹ thuật & kích thước (vat_lieu, do_cung, kich_thuoc_sp, so_luong, kg_lot, don_vi_tinh, so_luong_tinh)
    expect(modalCode).toMatch(/vat_lieu/);
    expect(modalCode).toMatch(/do_cung/);
    expect(modalCode).toMatch(/Kich_Thuoc_SP|kich_thuoc_sp/);
    expect(modalCode).toMatch(/kg_Lot|kg_lot/);
    expect(modalCode).toMatch(/don_vi_tinh/);

    // Vùng 3: Tiến độ, Đơn giá & PO (so_dat_hang, cty_qt, ngay_gui_qt, don_gia, thanh_tien, ty_gia, ten_file_dat_hang, ghi_chu)
    expect(modalCode).toMatch(/so_dat_hang|So_DatHang/);
    expect(modalCode).toMatch(/cty_QT|cty_qt/);
    expect(modalCode).toMatch(/ngay_gui_QT|ngay_gui_qt/);
    expect(modalCode).toMatch(/don_gia/);
    expect(modalCode).toMatch(/thanh_tien/);
    expect(modalCode).toMatch(/ten_file_dat_hang/);

    // Vùng 4: Cổng Nhà cung cấp & QC Đo kiểm (ncc_ngay_qt, ncc_ngay_tra_qt, ncc_id_lot_qt, ncc_ket_qua_hrc, ncc_ket_qua_qc, ncc_giando, ncc_file1...)
    expect(modalCode).toMatch(/ncc_ngay_qt/);
    expect(modalCode).toMatch(/ncc_ngay_tra_qt/);
    expect(modalCode).toMatch(/ncc_id_lot_qt/);
    expect(modalCode).toMatch(/ncc_ket_qua_hrc/);
    expect(modalCode).toMatch(/ncc_ket_qua_qc/);
    expect(modalCode).toMatch(/ncc_giando/);
    expect(modalCode).toMatch(/ncc_file1/);
  });

  it('TC-LDM-05: Click-to-Search Inline Mã hàng ở Header & Input nhảy nhanh số lô index/ID ở Footer', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Header có tính năng tìm kiếm / input cho mã hàng
    expect(modalCode).toMatch(/searchItemCode|handleSearchItem|isSearchingItem/);
    // Footer có input cho phép gõ số thứ tự hoặc ID lô để nhảy nhanh
    expect(modalCode).toMatch(/jumpIndex|handleJumpLot|handleQuickJump/);
  });

  it('TC-LDM-06: Tích hợp Hover Preview (AttachmentHoverPreview) cho các tệp đính kèm', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Có component hoặc xử lý hover preview cho tệp
    expect(modalCode).toMatch(/AttachmentHoverPreview|hoverPreview|HoverCard/);
  });

  it('TC-LDM-07: In-Place Bento Editing tuân thủ 7 Master Identifiers khóa 🔒 và RBAC pricing', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Chế độ chỉnh sửa tại chỗ
    expect(modalCode).toMatch(/isEditing/);
    expect(modalCode).toMatch(/handleSave/);
    // Kiểm tra quyền đơn giá
    expect(modalCode).toMatch(/canViewPricing/);
    // 7 Master columns được bảo vệ hoặc có biểu tượng khóa
    expect(modalCode).toMatch(/Lock|readOnly|disabled/);
    // Ghi nhận audit trail và âm thanh
    expect(modalCode).toMatch(/appendAudit/);
    expect(modalCode).toMatch(/playAudioCue/);
  });

  it('TC-LDM-08: Audit Trail thu gọn thành Collapsible Accordion tiết kiệm không gian', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Accordion hoặc toggle ẩn hiện cho Audit Trail
    expect(modalCode).toMatch(/showAudit|auditOpen|Accordion|Collapsible/);
  });

  it('TC-LDM-09: Giản đồ nhiệt tích hợp HeatTreatmentCycle mini SVG và HoverCard CHU TRÌNH NHIỆT LUYỆN chuẩn tracking, click mở HeatCycleModal', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Tích hợp HeatTreatmentCycle và HeatCycleModal
    expect(modalCode).toContain('HeatTreatmentCycle');
    expect(modalCode).toContain('HeatCycleModal');
    // Có HoverCard hiển thị CHU TRÌNH NHIỆT LUYỆN và biến thể mini
    expect(modalCode).toMatch(/CHU TRÌNH NHIỆT LUYỆN/);
    expect(modalCode).toMatch(/variant="mini"/);
  });

  it('TC-LDM-10: Tên file tệp đính kèm tự động đồng bộ theo lotCode (ma_hang.pdf)', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Truyền mã hàng hoặc lotCode vào parseAttachments để đồng bộ tên file
    expect(modalCode).toMatch(/parseAttachments\([^,]+,\s*(?:item\.ma_hang|lotCode)/);
  });

  it('TC-LDM-11: Cửa sổ xem trước HoverCard nhúng trực tiếp iframe xem trước tài liệu văn bản với transformToPreviewUrl và nút Tải về / Mở tab mới', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Iframe nhúng preview trực tiếp nội dung văn bản
    expect(modalCode).toMatch(/<iframe[^>]*src=\{transformToPreviewUrl/);
    // Có nút hoặc link Tải về và Mở tab mới
    expect(modalCode).toMatch(/Tải về|Download/);
    expect(modalCode).toMatch(/Mở tab mới/);
  });

  it('TC-LDM-12: Chế độ 100% Read-only khi chưa bấm Chỉnh sửa (không nút Hiệu chỉnh/+ Giản đồ, click mở xem chi tiết)', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Không còn nút text "Hiệu chỉnh" hoặc "+ Giản đồ" tự do ở chế độ chỉ xem
    expect(modalCode).not.toMatch(/>\s*Hiệu chỉnh\s*<\/button>/);
    expect(modalCode).not.toMatch(/>\s*\+\s*Giản đồ\s*<\/button>/);
    // HeatCycleModal nhận canEdit={isEditing}
    expect(modalCode).toMatch(/canEdit=\{isEditing\}/);
  });

  it('TC-LDM-13: Chế độ Chỉnh sửa Giản đồ nhiệt: bỏ nút Đồ họa thừa, đổi thành Sửa với đồ họa và truyền prop value', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Nút [ Đồ họa ] cạnh input bị xóa bỏ
    expect(modalCode).not.toMatch(/>\s*Đồ họa\s*<\/button>/);
    // Đổi link thành "Sửa với đồ họa"
    expect(modalCode).toMatch(/Sửa với đồ họa/);
    // HeatCycleModal nhận prop value={...} thay vì initialShorthand
    expect(modalCode).toMatch(/<HeatCycleModal[\s\S]*?\bvalue=\{/);
  });

  it('TC-LDM-14: NCC Nghiệm thu QC đã loại bỏ hoàn toàn tùy chọn PENDING (chờ kiểm tra)', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Thẻ select của ncc_ket_qua_qc không còn PENDING
    expect(modalCode).not.toMatch(/value="PENDING"/);
  });

  it('TC-LDM-15: Tiến độ NCC (ncc_tatus) chuẩn hóa thành menu chọn WAIT, HEAT, TRANSIT, DONE', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // ncc_tatus khi edit là thẻ select với các tùy chọn chuẩn
    expect(modalCode).toMatch(/<select[\s\S]*?value=\{form\.ncc_tatus\}[\s\S]*?WAIT[\s\S]*?HEAT[\s\S]*?TRANSIT[\s\S]*?DONE/);
  });

  it('TC-LDM-16: Cơ chế cửa sổ lồng nhau (Back-by-back window stack): phím Escape và click backdrop không đóng nhầm modal mẹ', () => {
    const modalCode = fs.readFileSync(modalPath, 'utf-8');

    // Kiểm tra Escape key ưu tiên đóng sub-modal trước
    expect(modalCode).toMatch(/if\s*\(\s*lightboxFile\s*\)\s*\{\s*setLightboxFile\(null\);\s*return;\s*\}/);
    expect(modalCode).toMatch(/if\s*\(\s*heatCycleModalOpen\s*\)\s*\{\s*setHeatCycleModalOpen\(false\);\s*return;\s*\}/);
    // Kiểm tra backdrop click bảo vệ modal mẹ khi sub-modal đang mở
    expect(modalCode).toMatch(/if\s*\(\s*lightboxFile\s*\|\|\s*heatCycleModalOpen\s*\)\s*return;/);
  });
});
