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
  ghi_chu?: string;
};
export const statuses: Status[] = ['Chờ xuất xưởng','Đang tại Vendor','Kiểm tra QC','Đã nhập kho'];
export const money = (value: number) => isPricingVisible() ? new Intl.NumberFormat('vi-VN').format(value) + ' ₫' : '*** ₫';
export const number = (value: number, decimals = 0) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: decimals }).format(value);
export const date = (value: string) => new Date(value + 'T00:00:00').toLocaleDateString('vi-VN');
export const daysLate = (value: string) => Math.max(0, Math.floor((new Date().setHours(0,0,0,0) - new Date(value + 'T00:00:00').getTime()) / 86400000));
/** Overdue only when the due date is official (not estimated). Kept in sync with dynamo-rules.isOverdue. */
export const isLate = (row: QTItem) => row.TrangThai !== 'Đã nhập kho' && !row.han_tra_est && /^\d{4}-\d{2}-\d{2}$/.test(row.han_tra) && daysLate(row.han_tra) > 0;

