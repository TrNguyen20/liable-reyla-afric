import { verifyAccessCode } from './auth.functions';
// Client-side role simulation (no backend). Not real security — UI gating only.
// Roles: admin | leader | viewer | qt_<vendor> (partner, scoped to cty_QT = VENDOR).
export type Role = 'admin' | 'leader' | 'viewer' | `qt_${string}`;


export const getVendorScope = (role: Role): string | null => role.startsWith('qt_') ? role.slice(3).toUpperCase() : null;

export const normalizeRole = (raw: string): Role | null => {
  const r = raw.trim().toLowerCase();
  if (r === 'admin' || r === 'leader' || r === 'viewer') return r;
  if (r === 'qc') return 'viewer';
  if (/^qt_[a-z0-9_-]+$/.test(r)) return r as Role;
  return null;
};

export const roleLabel = (role: Role) => {
  const v = getVendorScope(role);
  if (v) return `Đối tác: ${v}`;
  return role === 'admin' ? 'Admin Điều hành' : role === 'leader' ? 'Leader Phân xưởng' : 'Viewer (Chỉ xem)';
};
export const roleBadge = (role: Role) => getVendorScope(role) ? 'bg-warning/20 text-warning' : role === 'admin' ? 'bg-dynamo/20 text-dynamo' : role === 'leader' ? 'bg-sidebar-primary/20 text-sidebar-primary' : 'bg-info/20 text-info';

const RESTRICTED = ['/sync', '/audit-costs'];
export const canAccessRoute = (role: Role, path: string) => {
  if (role === 'admin') return true;
  if (role === 'leader') return !path.startsWith('/sync');
  return !RESTRICTED.some(p => path.startsWith(p));
};
export const canViewPricing = (role: Role) => role === 'admin' || role === 'leader';

/**
 * Domain Rule: Partner Security
 * Only admin, leader, and authorized partner accounts (qt_*) can see real partner names.
 * For unauthenticated users or viewers, partner names are anonymized as "Đơn vị gia công [Mã]".
 */
export const canViewVendorName = (role: Role): boolean => {
  return role === 'admin' || role === 'leader' || role.startsWith('qt_');
};

export const formatVendorName = (vendor: string | undefined | null, role: Role): string => {
  if (!vendor || vendor === '—') return '—';
  if (canViewVendorName(role)) return vendor;
  // Anonymized code representation for external display
  const clean = vendor.trim().toUpperCase();
  const shortCode = clean.length > 3 ? clean.slice(0, 3) : clean;
  return `Đơn vị gia công [${shortCode}]`;
};

export const readRole = (): Role => {
  if (typeof window === 'undefined') return 'admin';
  return normalizeRole(window.localStorage.getItem('dynamo-role') ?? '') ?? 'viewer';
};

let pricingVisible = true;
export const setPricingVisible = (v: boolean) => { pricingVisible = v; };
export const isPricingVisible = () => pricingVisible;

type AuthEntry = { role: Role; note: string };

/** Verify a ULID code on the server (the code list is never sent to the browser). */
export async function verifyCode(code: string): Promise<AuthEntry | null> {
  if (!code.trim()) return null;

  const res = await verifyAccessCode({ data: { code } });
  if (!res.ok) return null;
  const role = normalizeRole(res.role);
  return role ? { role, note: res.note } : null;
}

