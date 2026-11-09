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
  trang_thai?: string | undefined; // Trạng thái gốc từ Google Sheets ('Đã tạo', 'Print PDF')
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
  ncc_thongtinkhac1?: string | undefined;   // Trường thông tin dự phòng mở rộng 1
  ncc_thongtinkhac2?: string | undefined;   // Trường thông tin dự phòng mở rộng 2
  ncc_file1?: string | undefined;           // Link file scan biên bản xuất xưởng / Chứng nhận QC
};

export const statuses: Status[] = ['Chờ xuất xưởng','Đang tại Vendor','Kiểm tra QC','Đã nhập kho'];
export const money = (value: number) => isPricingVisible() ? new Intl.NumberFormat('vi-VN').format(value) + ' ₫' : '*** ₫';
export const number = (value: number, decimals = 0) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: decimals }).format(value);
export const date = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString('vi-VN');
export const daysLate = (value: string) => Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(value + 'T00:00:00').getTime()) / 86400000));
/** Overdue only when the due date is official (not estimated). Kept in sync with dynamo-rules.isOverdue. */
export const isLate = (row: QTItem) => {
  const due = row.ncc_ngay_tra_qt || row.han_tra;
  return row.TrangThai !== 'Đã nhập kho' && !row.han_tra_est && !!due && /^\d{4}-\d{2}-\d{2}$/.test(due) && daysLate(due) > 0;
};
