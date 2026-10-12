import type { QTItem, Status } from './dynamo-data';

// Allowed status moves. `reason: true` = the move needs a written reason (rework / rollback).
type Move = { to: Status; reason?: boolean; adminOnly?: boolean };
export const TRANSITIONS: Record<Status, Move[]> = {
  'Chờ xuất xưởng': [{ to: 'Đang tại Vendor' }],
  'Đang tại Vendor': [{ to: 'Kiểm tra QC' }, { to: 'Chờ xuất xưởng', reason: true }],
  'Kiểm tra QC': [{ to: 'Đã nhập kho' }, { to: 'Đang tại Vendor', reason: true }],
  'Đã nhập kho': [{ to: 'Kiểm tra QC', reason: true, adminOnly: true }],
};

export const nextMoves = (from: Status, isAdmin: boolean) => TRANSITIONS[from].filter(m => isAdmin || !m.adminOnly);

const isIso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v + 'T00:00:00').getTime());
const HRC = /^[0-9.,\s–-]+(HRC)?$/i;

export type Draft = { status: Status; ngay_nhan: string; do_cung: string; reason: string; qcPassed: boolean };

/** Returns a list of blocking errors; empty list = the update may be saved. */
export function validateUpdate(item: QTItem, d: Draft, isAdmin: boolean): string[] {
  const errs: string[] = [];
  if (d.status !== item.TrangThai) {
    const move = nextMoves(item.TrangThai, isAdmin).find(m => m.to === d.status);
    if (!move) return [`Không được chuyển trực tiếp "${item.TrangThai}" → "${d.status}".`];
    if (move.reason && d.reason.trim().length < 5) errs.push('Nhập lý do (ít nhất 5 ký tự) cho thao tác trả/thu hồi.');
    if (d.status === 'Đang tại Vendor' && item.TrangThai === 'Chờ xuất xưởng') {
      if (!item.cty_QT) errs.push('Lô chưa có vendor.');
      if (!item.han_tra || !isIso(item.han_tra)) errs.push('Lô chưa có hạn trả hợp lệ.');
    }
    if (d.status === 'Kiểm tra QC' && item.TrangThai === 'Đang tại Vendor' && !d.ngay_nhan) errs.push('Cần ngày nhận hàng thực tế khi chuyển sang Kiểm tra QC.');
    if (d.status === 'Đã nhập kho') {
      if (!d.ngay_nhan) errs.push('Cần ngày nhận thực tế trước khi nhập kho.');
      if (!d.do_cung.trim()) errs.push('Cần độ cứng thực tế trước khi nhập kho.');
      if (!d.qcPassed) errs.push('Cần xác nhận "QC đạt" trước khi nhập kho.');
    }
  }
  if (d.ngay_nhan) {
    if (!isIso(d.ngay_nhan)) errs.push('Ngày nhận không hợp lệ.');
    else if (item.ngay_gui_QT && d.ngay_nhan < item.ngay_gui_QT) errs.push('Ngày nhận không được trước ngày gửi QT.');
    else if (d.ngay_nhan > new Date().toISOString().slice(0, 10)) errs.push('Ngày nhận không được ở tương lai.');
  }
  if (d.do_cung.trim() && !HRC.test(d.do_cung.trim())) errs.push('Độ cứng không hợp lệ (VD: 58-62 HRC).');
  return errs;
}

// ---- Audit log (browser storage; kept per device until a central store exists) ----
export type AuditEvent = {
  id: string; at: string; ID_Key: string; user: string; role: string;
  from?: Status; to?: Status; changes: Record<string, [string, string]>;
  reason: string; result: 'ok' | 'sync_failed'; error?: string;
};
const KEY = 'dynamo-audit';
const MAX = 3000;

export function readAudit(): AuditEvent[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(window.localStorage.getItem(KEY) ?? '[]') as AuditEvent[]; } catch { return []; }
}
export function appendAudit(e: Omit<AuditEvent, 'id' | 'at'>) {
  const all = readAudit();
  all.unshift({ ...e, id: crypto.randomUUID(), at: new Date().toISOString() });
  try { window.localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX))); } catch { /* storage full */ }
  window.dispatchEvent(new Event('dynamo-audit'));
}
export const auditFor = (id: string) => readAudit().filter(e => e.ID_Key === id);
/** Lots whose latest write-back attempt failed. */
export function failedSyncIds(): Set<string> {
  const seen = new Set<string>(); const failed = new Set<string>();
  for (const e of readAudit()) { if (seen.has(e.ID_Key)) continue; seen.add(e.ID_Key); if (e.result === 'sync_failed') failed.add(e.ID_Key); }
  return failed;
}

