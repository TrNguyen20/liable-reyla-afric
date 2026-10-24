import { getSessionInfo, logoutSession, verifyAccessCode } from './auth.functions';
// Role is issued by the server in a signed HttpOnly session; helpers below only shape the UI.
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

const RESTRICTED = ['/sync'];
export const canAccessRoute = (role: Role, path: string) => {
  if (role === 'admin') return true;
  if (role === 'leader') return !path.startsWith('/sync');
  return !RESTRICTED.some(p => path.startsWith(p));
};
export const canViewPricing = (role: Role) => role === 'admin' || role === 'leader';

/**
 * Poka-Yoke Masking: Partner Security
 * Eliminates contractor name leaks for 'viewer' and 'leader' roles.
 * Only 'admin' or matched vendor partner ('qt_<vendor>') can view raw names.
 */
export const canViewVendorName = (role: Role, vendor?: string | null): boolean => {
  if (role === 'admin') return true;
  if (role.startsWith('qt_')) {
    const scope = getVendorScope(role);
    return Boolean(scope && (!vendor || vendor.trim().toUpperCase() === scope));
  }
  return false;
};

export const formatVendorName = (vendor: string | undefined | null, role: Role): string => {
  if (!vendor || vendor === '—') return '—';
  if (canViewVendorName(role, vendor)) return vendor;
  return 'Đã Ẩn';
};

export const formatVendorSummary = (vendors: Iterable<string>, role: Role): string => {
  const set = new Set([...vendors].map(v => v?.trim()).filter(Boolean));
  const list = [...set];
  if (list.length === 0) return '—';
  if (role === 'admin') return list.join(', ');
  if (role.startsWith('qt_')) {
    const scope = getVendorScope(role);
    if (scope && list.some(v => v.toUpperCase() === scope)) return scope;
    return 'Đã Ẩn';
  }
  return list.length > 1 ? `${list.length} đơn vị gia công ngoài` : 'Đã Ẩn';
};

/** Read the server-verified session with client-side fallback for iframe previews. Null means signed out. */
export async function fetchSession(): Promise<{ role: Role; note: string } | null> {
  try {
    const s = await getSessionInfo();
    const role = s ? normalizeRole(s.role) : null;
    if (s && role) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dynamo-session', JSON.stringify({ role, note: s.note, at: Date.now() }));
      }
      return { role, note: s.note };
    }
  } catch {
    // server session unreachable or cookie blocked in iframe preview
  }

  // Local storage session backup (persists 8h)
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('dynamo-session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.role && Date.now() - (parsed.at || 0) < 8 * 60 * 60 * 1000) {
          const role = normalizeRole(parsed.role);
          if (role) return { role, note: parsed.note || parsed.role };
        }
      }
    } catch {
      // ignore JSON error
    }
  }
  return null;
}

export const logout = async () => {
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem('dynamo-session');
  }
  try {
    await logoutSession();
  } catch {
    // ignore
  }
};

let pricingVisible = true;
export const setPricingVisible = (v: boolean) => { pricingVisible = v; };
export const isPricingVisible = () => pricingVisible;

type AuthEntry = { role: Role; note: string };

export class LockedError extends Error {
  constructor(public remainingMs: number) { super('LOCKED'); }
}
export class AttemptsError extends Error {
  constructor(public attemptsLeft: number) { super('INVALID'); }
}

/** Verify a ULID code on the server (the code list is never sent to the browser). */
export async function verifyCode(code: string): Promise<AuthEntry | null> {
  if (!code.trim()) return null;

  const res = await verifyAccessCode({ data: { code } });
  if (!res.ok) {
    if ('locked' in res && res.locked) throw new LockedError(res.remainingMs ?? 120000);
    if ('attemptsLeft' in res && typeof res.attemptsLeft === 'number') throw new AttemptsError(res.attemptsLeft);
    return null;
  }
  const role = normalizeRole(res.role);
  return role ? { role, note: res.note } : null;
}


/** Poka-Yoke interlock: declared login position must match the code's role. */
export const positionMatchesRole = (position: 'admin' | 'leader' | 'viewer' | 'partner', role: string): boolean => {
  const r = role.trim().toLowerCase();
  if (position === 'partner') return r.startsWith('qt_');
  return r === position;
};
