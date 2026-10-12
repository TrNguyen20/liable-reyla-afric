import type { QTItem } from './dynamo-data';

// Shared business rules for Dashboard + Tracking. One source so a lot is classified the same everywhere.
export type Logistics = 'Chờ xuất xưởng' | 'Đang tại Vendor' | 'Đã nhập kho';
export type QcState = 'Chưa kiểm tra' | 'Đang kiểm tra' | 'Đạt' | 'Không đạt';

/** Legacy "Kiểm tra QC" = goods still counted at vendor, QC in progress (user-confirmed mapping). */
export const logisticsOf = (r: QTItem): Logistics => r.TrangThai === 'Kiểm tra QC' ? 'Đang tại Vendor' : r.TrangThai;
/** Entering "Đã nhập kho" requires the QC-passed confirmation, so stocked lots count as passed. */
export const qcOf = (r: QTItem): QcState => r.TrangThai === 'Kiểm tra QC' ? 'Đang kiểm tra' : r.TrangThai === 'Đã nhập kho' ? 'Đạt' : 'Chưa kiểm tra';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const validDate = (v?: string) => !!v && ISO.test(v) && !Number.isNaN(new Date(v + 'T00:00:00').getTime());
/** Official due date only: present, well-formed and not estimated. */
export const hasValidDue = (r: QTItem) => !r.han_tra_est && validDate(r.han_tra);
export const isDone = (r: QTItem) => r.TrangThai === 'Đã nhập kho';
export const isOpen = (r: QTItem) => !isDone(r);

const DAY = 86400000;
const today = (now = new Date()) => new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
export const daysOver = (r: QTItem, now = new Date()) => hasValidDue(r) ? Math.floor((today(now) - new Date(r.han_tra + 'T00:00:00').getTime()) / DAY) : 0;
export const isOverdue = (r: QTItem, now = new Date()) => isOpen(r) && hasValidDue(r) && daysOver(r, now) > 0;
export const isDueSoon = (r: QTItem, now = new Date()) => isOpen(r) && hasValidDue(r) && daysOver(r, now) <= 0 && daysOver(r, now) >= -2;
export const isMissingDue = (r: QTItem) => isOpen(r) && !hasValidDue(r);

export function onTimeRate(rows: QTItem[]) {
  const done = rows.filter(isDone);
  const measurable = done.filter(r => hasValidDue(r) && validDate(r.ngay_nhan));
  const onTime = measurable.filter(r => r.ngay_nhan! <= r.han_tra).length;
  return { onTime, denominator: measurable.length, excluded: done.length - measurable.length, rate: measurable.length ? onTime / measurable.length : null };
}

