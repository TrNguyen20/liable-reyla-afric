import { isPricingVisible } from './dynamo-auth';
export type Workshop = 'PIN' | 'INSERT' | 'MOLD';
export type Vendor = 'YAMAICHI' | 'PROVISION';
export type Status = 'Chờ xuất xưởng' | 'Đang tại Vendor' | 'Kiểm tra QC' | 'Đã nhập kho';
export type QTItem = {
  ID_Key: string; phong_sx: Workshop; doi_tuong_hang: string; ma_hang: string;
  so_luong: number; vat_lieu: string; do_cung: string; Kich_Thuoc_SP: string;
  kg_Lot: number; don_vi_tinh: 'Kg' | 'pcs'; don_gia: number; thanh_tien: number;
  ngay_gui_QT: string; cty_QT: Vendor; TrangThai: Status; So_DatHang: string;
  han_tra: string; ngay_nhan?: string | undefined; cong_doan: string;
  /** true when the source had no han_tra and the default 7-day rule was applied. */
  han_tra_est?: boolean;
};
const item = (ID_Key: string, phong_sx: Workshop, ma_hang: string, so_luong: number, vat_lieu: string, do_cung: string, Kich_Thuoc_SP: string, kg_Lot: number, don_vi_tinh: 'Kg' | 'pcs', don_gia: number, ngay_gui_QT: string, cty_QT: Vendor, TrangThai: Status, So_DatHang: string, han_tra: string, cong_doan: string, ngay_nhan?: string): QTItem => ({ ID_Key, phong_sx, doi_tuong_hang: phong_sx === 'MOLD' ? 'Khuôn' : 'Linh kiện khuôn', ma_hang, so_luong, vat_lieu, do_cung, Kich_Thuoc_SP, kg_Lot, don_vi_tinh, don_gia, thanh_tien: Math.round((don_vi_tinh === 'Kg' ? kg_Lot : so_luong) * don_gia), ngay_gui_QT, cty_QT, TrangThai, So_DatHang, han_tra, cong_doan, ngay_nhan });
export const items: QTItem[] = [
  item('QT-2609-001','PIN','PN-08342-A',240,'SKD61','48–52 HRC','Ø12 × 86 mm',18.4,'Kg',42000,'2026-09-23','YAMAICHI','Đang tại Vendor','PO-2609-041','2026-09-27','Nhiệt luyện'),
  item('QT-2609-002','PIN','PN-08342-B',180,'SKD61','48–52 HRC','Ø16 × 102 mm',24.8,'Kg',42000,'2026-09-25','YAMAICHI','Kiểm tra QC','PO-2609-041','2026-09-30','Nhiệt luyện'),
  item('QT-2609-003','INSERT','IN-21408-C',96,'DAC','44–48 HRC','35 × 28 × 62 mm',32.6,'Kg',48000,'2026-09-24','PROVISION','Đang tại Vendor','PO-2609-042','2026-09-28','Nhiệt luyện'),
  item('QT-2609-004','MOLD','MD-00571-01',12,'DAC-MAGIC','42–46 HRC','120 × 85 × 45 mm',46.2,'Kg',72000,'2026-09-26','PROVISION','Đang tại Vendor','PO-2609-043','2026-10-05','Nhiệt luyện'),
  item('QT-2609-005','INSERT','IN-21408-D',120,'DAC','44–48 HRC','22 × 18 × 54 mm',14.5,'Kg',48000,'2026-09-27','PROVISION','Chờ xuất xưởng','PO-2609-042','2026-10-06','Nhiệt luyện'),
  item('QT-2609-006','PIN','PN-09115-X',360,'SKD61','46–50 HRC','Ø10 × 64 mm',15.3,'pcs',8500,'2026-09-29','YAMAICHI','Chờ xuất xưởng','PO-2609-044','2026-10-08','Xi mạ'),
  item('QT-2609-007','MOLD','MD-00612-02',8,'SKD61','48–52 HRC','160 × 110 × 70 mm',68.4,'Kg',42000,'2026-09-22','YAMAICHI','Đã nhập kho','PO-2609-045','2026-09-30','Nhiệt luyện','2026-09-29'),
  item('QT-2609-008','INSERT','IN-21902-A',75,'DAC-MAGIC','42–46 HRC','42 × 32 × 75 mm',28.9,'Kg',72000,'2026-09-20','PROVISION','Đã nhập kho','PO-2609-046','2026-09-29','Nhiệt luyện','2026-09-30'),
  item('QT-2609-009','PIN','PN-08970-P',500,'SKD61','48–52 HRC','Ø8 × 48 mm',11.2,'pcs',8500,'2026-09-18','YAMAICHI','Đã nhập kho','PO-2609-047','2026-09-26','Xi mạ','2026-09-26'),
  item('QT-2610-010','MOLD','MD-00618-01',16,'DAC','44–48 HRC','90 × 75 × 60 mm',58.1,'Kg',48000,'2026-10-01','PROVISION','Kiểm tra QC','PO-2610-048','2026-10-04','Nhiệt luyện'),
  item('QT-2610-011','INSERT','IN-22117-B',144,'SKD61','48–52 HRC','25 × 20 × 48 mm',22.4,'Kg',42000,'2026-10-01','YAMAICHI','Chờ xuất xưởng','PO-2610-049','2026-10-09','Nhiệt luyện'),
  item('QT-2610-012','MOLD','MD-00624-03',10,'DAC-MAGIC','42–46 HRC','135 × 95 × 55 mm',52.7,'Kg',72000,'2026-09-19','PROVISION','Đang tại Vendor','PO-2609-050','2026-09-26','Nhiệt luyện'),
];
export const statuses: Status[] = ['Chờ xuất xưởng','Đang tại Vendor','Kiểm tra QC','Đã nhập kho'];
export const money = (value: number) => isPricingVisible() ? new Intl.NumberFormat('vi-VN').format(value) + ' ₫' : '*** ₫';
export const number = (value: number, decimals = 0) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: decimals }).format(value);
export const date = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString('vi-VN');
export const daysLate = (value: string) => Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(value + 'T00:00:00').getTime()) / 86400000));
/** Overdue only when the due date is official (not estimated). Kept in sync with dynamo-rules.isOverdue. */
export const isLate = (row: QTItem) => row.TrangThai !== 'Đã nhập kho' && !row.han_tra_est && /^\d{4}-\d{2}-\d{2}$/.test(row.han_tra) && daysLate(row.han_tra) > 0;
export const orderIds = [...new Set(items.map(i => i.So_DatHang))];

