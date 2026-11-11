import { isPricingVisible } from './dynamo-auth';
export type Workshop = 'PIN' | 'INSERT' | 'MOLD';
export type Vendor = 'YAMAICHI' | 'PROVISION';
export type Status = 'Chờ xuất xưởng' | 'Đang tại Vendor' | 'Kiểm tra QC' | 'Đã nhập kho';

export type QTItem = {
  // 1. Core Identifiers & Metadata (36-column schema)
  id_nhiet_qt: string;          // Khóa chính PK (thay thế ID_Key) - Ẩn trên Table Tracking
  ID_Key: string;               // Alias tương thích ngược nội bộ cho id_nhiet_qt
  id_ma_hang?: string | undefined; // Mã định danh gộp (Mã phôi/bản vẽ + Mã hàng)
  ma_hang: string;              // Mã hàng / Linh kiện (Ghim cố định mép trái left: 40px)
  so_dat_hang: string;          // Số PO / Đơn đặt hàng gia công
  So_DatHang: string;           // Alias tương thích ngược
  ten_file_dat_hang?: string | undefined; // Đường dẫn file PDF đơn đặt hàng gốc AppSheet
  ngay_tao?: string | undefined; // Thời điểm tạo lệnh/lô (DateTime ISO)
  nguoi_tao?: number | undefined; // Mã số nhân viên tạo lô (Integer)
  quoc_gia?: string | undefined; // Xuất xứ / Chi nhánh sản xuất (Mặc định 'Vietnam')
  phong_sx: Workshop;           // Phân xưởng sản xuất ('PIN' | 'MOLD' | 'INSERT')
  doi_tuong_hang?: string | undefined; // Loại chi tiết cơ khí (Pin, Insert, Cổng)

  // 2. Technical Specifications & Financials Monozukuri
  so_luong: number;             // Số lượng chi tiết giao nhiệt luyện (Integer)
  vat_lieu: string;             // Mác thép / Vật liệu chế tạo
  do_cung: string;              // Độ cứng yêu cầu kỹ thuật chuẩn HRC
  kich_thuoc_sp: string;        // Quy cách kích thước chi tiết (Kích thước SP)
  Kich_Thuoc_SP: string;        // Alias tương thích ngược
  kg_lot: number;               // Trọng lượng cả lô (Kg)
  kg_Lot: number;               // Alias tương thích ngược
  don_vi_tinh: 'Kg' | 'pcs';    // Đơn vị tính cơ sở
  so_luong_tinh?: number | undefined; // Khối lượng/số cái thực tế áp vào tính tiền
  don_gia: number;              // Đơn giá gia công VNĐ (Bảo mật theo RBAC)
  thanh_tien: number;           // Tổng giá trị thành tiền VNĐ = so_luong_tinh * don_gia
  ty_gia?: number | undefined;  // Tỷ giá quy đổi ngoại tệ (Mặc định: 1)

  // 3. Dispatch & Internal Tracking
  ngay_gui_qt: string;          // Ngày xuất kho gửi nhiệt luyện (YYYY-MM-DD)
  ngay_gui_QT: string;          // Alias tương thích ngược
  ghi_chu_khi_gui?: string | undefined; // Lưu ý đặc biệt khi xuất xưởng
  ghi_chu?: string | undefined; // Alias tương thích ngược
  cty_qt: Vendor;               // Đối tác nhiệt luyện ('YAMAICHI' | 'PROVISION')
  cty_QT: Vendor;               // Alias tương thích ngược
  trang_thai?: string | undefined; // TRẠNG THÁI từ Google Sheets ('Đã tạo', 'Print PDF')
  TrangThai: Status;            // Trạng thái chuẩn hóa DYNAMO MES
  cong_doan?: string | undefined; // Công đoạn gia công
  han_tra?: string | undefined; // Hạn trả cam kết (ncc_ngay_tra_qt hoặc fallback)
  han_tra_est?: boolean | undefined; // true khi ước tính hạn trả mặc định
  ngay_nhan?: string | undefined;

  // 4. Vendor Feedback Hub (12 Cột NCC_*)
  ncc_ngay_qt?: string | undefined;         // Ngày đối tác chính thức cho lô vào lò nhiệt
  ncc_ngay_tra_qt?: string | undefined;     // Ngày đối tác cam kết trả hàng về DYNAMO
  ncc_id_lot_qt?: string | undefined;       // Mã số mẻ lò / Mã lô nội bộ của bên Vendor
  ncc_name_qt?: string | undefined;         // Tên kỹ thuật viên phụ trách mẻ nhiệt của Vendor
  ncc_giando?: string | undefined;          // Link file ảnh/URL giản đồ nhiệt luyện (String URL)
  ncc_ket_qua_hrc?: string | undefined;     // Độ cứng HRC thực tế đo được sau nhiệt
  ncc_ket_qua_qc?: 'PASS' | 'FAIL' | string | undefined; // Kết luận nghiệm thu chất lượng ban đầu NCC
  ncc_don_gia?: number | undefined;         // Đơn giá báo lại từ phía NCC
  ncc_tatus?: string | undefined;           // Trạng thái tiến độ thực tế bên phía xưởng Vendor
  ncc_thongtinkhac1?: string | undefined;   // Trường thông tin dự phòng ghi chú 1
  ncc_thongtinkhac2?: string | undefined;   // Trường thông tin dự phòng GHI CHÚ 2
  ncc_file1?: string | undefined;           // Link file scan biên bản xuất xưởng / CHỨNG CHỈ QT
};

export const statuses: Status[] = ['Chờ xuất xưởng', 'Đang tại Vendor', 'Kiểm tra QC', 'Đã nhập kho'];
export const money = (value: number) => isPricingVisible() ? new Intl.NumberFormat('vi-VN').format(value) + ' ₫' : '*** ₫';
export const number = (value: number, decimals = 0) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: decimals }).format(value);

/** Parses ISO YYYY-MM-DD, ISO with time, or Google Sheets format (e.g. M/D/YYYY [H:m:s] or D/M/YYYY) */
export const parseFlexibleDate = (value: string | undefined): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // 1. Standard ISO format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    if (raw.length === 10) {
      const d = new Date(raw + 'T00:00:00');
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // 2. Formats with slashes: M/D/YYYY HH:mm:ss or D/M/YYYY HH:mm:ss
  // e.g. "10/28/2026 18:04:16" or "5/11/2026 7:51:15"
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    const part1 = Number(match[1]);
    const part2 = Number(match[2]);
    const year = Number(match[3]);
    const hours = match[4] !== undefined ? Number(match[4]) : 0;
    const minutes = match[5] !== undefined ? Number(match[5]) : 0;
    const seconds = match[6] !== undefined ? Number(match[6]) : 0;

    let month = part1;
    let day = part2;
    if (part1 > 12) {
      day = part1;
      month = part2;
    }

    const d = new Date(year, month - 1, day, hours, minutes, seconds);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  // 3. Fallback to native Date parser
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
};

export const date = (value: string) => {
  const d = parseFlexibleDate(value);
  return d ? d.toLocaleDateString('vi-VN') : '—';
};

export const dateTime = (value: string) => {
  const d = parseFlexibleDate(value);
  if (!d) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  const dStr = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const tStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${dStr} ${tStr}`;
};

export const daysLate = (value: string) => {
  const d = parseFlexibleDate(value);
  if (!d) return 0;
  return Math.max(0, Math.floor((new Date().setHours(0, 0, 0, 0) - d.getTime()) / 86400000));
};

/** Overdue only when the due date is official (not estimated). Kept in sync with dynamo-rules.isOverdue. */
export const isLate = (row: QTItem) => {
  const due = row.ncc_ngay_tra_qt || row.han_tra;
  return row.TrangThai !== 'Đã nhập kho' && !row.han_tra_est && !!due && daysLate(due) > 0;
};
