import type { QTItem, Vendor } from '@/lib/dynamo-data';

export const HIDDEN_VENDOR = 'Đã ẩn' as Vendor;

/** Server-side scoping: what each role may receive. Runs before data leaves the server. */
export function scopeItemsForRole(items: QTItem[], role: string | null | undefined): QTItem[] {
  const r = (role ?? '').toLowerCase();
  if (r === 'admin' || r === 'leader') return items;
  if (r.startsWith('qt_')) {
    const vendor = r.slice(3).toUpperCase();
    return items.filter(i => String(i.cty_QT).toUpperCase() === vendor);
  }
  // viewer or no session: drop prices and partner names
  return items.map(i => ({ ...i, don_gia: 0, thanh_tien: 0, cty_QT: HIDDEN_VENDOR }));
}

const attempts = new Map<string, { fails: number; until: number }>();
export const MAX_FAILS = 5;
export const LOCK_MS = 2 * 60 * 1000;

export function isLocked(key: string, now = Date.now()) {
  const a = attempts.get(key);
  return !!a && a.until > now;
}
export function lockRemainingMs(key: string, now = Date.now()) {
  const a = attempts.get(key);
  return a && a.until > now ? a.until - now : 0;
}
/** Records a failure; returns attempts left (0 means the device is now locked). */
export function recordFail(key: string, now = Date.now()): number {
  const a = attempts.get(key) ?? { fails: 0, until: 0 };
  a.fails += 1;
  let left = MAX_FAILS - a.fails;
  if (a.fails >= MAX_FAILS) { a.until = now + LOCK_MS; a.fails = 0; left = 0; }
  attempts.set(key, a);
  return left;
}
export function clearFails(key: string) { attempts.delete(key); }
