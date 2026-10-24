import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeftRight,
  CircleHelp,
  DatabaseZap,
  LogOut,
  Moon,
  Sun,
  WifiOff,
} from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback, memo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { type QTItem, type Workshop } from '@/lib/dynamo-data';
import logo from '@/assets/dynamo-logo.png';
import {
  canAccessRoute,
  fetchSession,
  roleBadge,
  roleLabel,
  setPricingVisible,
  canViewPricing,
  getVendorScope,
  type Role,
} from '@/lib/dynamo-auth';
import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';
import { clearDataset, loadDataset, saveDataset } from '@/lib/dynamo-source';
import { logoutSession } from '@/lib/auth.functions';
import { fetchScopedSheet } from '@/lib/sheet.functions';
import { LIVE_LABEL, LIVE_SHEET_URL } from '@/lib/live-sheet';
import { ShopfloorTelemetry } from '@/components/shopfloor-telemetry';
import { CommandPalette } from '@/components/command-palette';

type Filter = 'Tất cả' | Workshop;
type AppContextType = {
  workshop: Filter;
  setWorkshop: (v: Filter) => void;
  search: string;
  setSearch: (v: string) => void;
  filtered: QTItem[];
  dataset: QTItem[];
  sourceLabel: string;
  syncedAt: string;
  isLive: boolean;
  loading: boolean;
  loadError: string;
  applyDataset: (rows: QTItem[], label: string) => void;
  pullLive: () => Promise<void>;
  role: Role;
  actualRole: Role;
  impersonatedRole: Role | null;
  setImpersonatedRole: (r: Role | null) => void;
  resetDataset: () => void;
  updateItem: (id: string, patch: Partial<QTItem>) => void;
  bulkUpdateItems: (ids: string[], patch: Partial<QTItem>) => void;
};

// Keep one context instance across hot reloads; a re-created context leaves pages reading an empty provider.
const g = globalThis as { __dynamoCtx?: React.Context<AppContextType | null> };
const AppContext = (g.__dynamoCtx ??= createContext<AppContextType | null>(null));

export function useDynamo() {
  const context = useContext(AppContext);
  if (!context) throw new Error('Dynamo context missing');
  return context;
}

const nav: {
  to: '/tracking' | '/sync';
  label: string;
  icon: typeof ArrowLeftRight | typeof DatabaseZap;
  section?: string;
  shortcut: string;
}[] = [
  { to: '/tracking', label: 'LUÂN CHUYỂN QT', icon: ArrowLeftRight, section: 'ĐIỀU HÀNH', shortcut: '1' },
  { to: '/sync', label: 'LIÊN KẾT GOOGLE SHEETS', icon: DatabaseZap, section: 'HỆ THỐNG', shortcut: '2' },
] as const;

const LedClock = memo(function LedClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateLabel = now.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString('vi-VN', { hour12: false });

  return (
    <div className="led-clock flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-bold" aria-label="Đồng hồ thời gian thực">
      <span className="hidden text-[9px] font-semibold tracking-widest text-slate-400 sm:inline">
        {dateLabel}
      </span>
      <span className="inline-block size-1.5 rounded-full fx-run-dot" aria-hidden />
      <span className="font-mono tabular-nums">{timeLabel}</span>
    </div>
  );
});

export function DynamoShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const [workshop, setWorkshopState] = useState<Filter>('Tất cả');
  const [search, setSearch] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState('Quản lý QT');
  const [role, setRole] = useState<Role>('admin');
  const [impersonatedRole, setImpersonatedRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [rawDataset, setDataset] = useState<QTItem[]>([]);
  const [sourceLabel, setSourceLabel] = useState(LIVE_LABEL);
  const [syncedAt, setSyncedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const booted = useRef(false);

  const effectiveRole = impersonatedRole ?? role;
  const isLive = rawDataset.length > 0;

  const applyDataset = useCallback((rows: QTItem[], label: string) => {
    const stamp = new Date().toISOString();
    setDataset(rows);
    setSourceLabel(label);
    setSyncedAt(stamp);
    void saveDataset({ items: rows, label, syncedAt: stamp });
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<QTItem>) =>
    setDataset((prev) => {
      const next = prev.map((i) => (i.ID_Key === id ? { ...i, ...patch } : i));
      void saveDataset({ items: next, label: sourceLabel, syncedAt });
      return next;
    }), [sourceLabel, syncedAt]);

  const bulkUpdateItems = useCallback((ids: string[], patch: Partial<QTItem>) =>
    setDataset((prev) => {
      const idSet = new Set(ids);
      const next = prev.map((i) => (idSet.has(i.ID_Key) ? { ...i, ...patch } : i));
      void saveDataset({ items: next, label: sourceLabel, syncedAt });
      return next;
    }), [sourceLabel, syncedAt]);

  // Pull live rows through the server; the server scopes/masks them by the signed session role.
  const pullLive = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const t0 = performance.now();
    try {
      const r = await fetchScopedSheet({ data: { url: LIVE_SHEET_URL } });
      const elapsed = Math.round(performance.now() - t0);
      applyDataset(r.items, LIVE_LABEL);
      toast.success(`Đã làm mới ${r.items.length} lô từ Google Sheets (${elapsed}ms)`);
      playAudioCue('success');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Không tải được dữ liệu từ Google Sheets.';
      setLoadError(msg);
      toast.error(`Lỗi tải dữ liệu Google Sheets: ${msg}`);
      playAudioCue('error');
    } finally {
      setLoading(false);
    }
  }, [applyDataset]);

  const resetDataset = useCallback(() => {
    void clearDataset().then(pullLive);
  }, [pullLive]);

  const location = useLocation();
  const navigate = useNavigate();
  const isTracking = location.pathname === '/tracking';

  useEffect(() => {
    const saved = window.localStorage.getItem('dynamo-theme');
    const next = saved === 'dark' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    const savedWs = window.localStorage.getItem('dynamo-workshop') as Filter | null;
    if (savedWs && ['Tất cả', 'PIN', 'INSERT', 'MOLD'].includes(savedWs)) {
      setWorkshopState(savedWs);
    }
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    setReady(true);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const setWorkshop = useCallback((w: Filter) => {
    setWorkshopState(w);
    window.localStorage.setItem('dynamo-workshop', w);
  }, []);

  // Keyboard navigation & Command Palette listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.shiftKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        void pullLive();
        return;
      }
      if (e.key >= '1' && e.key <= '2') {
        const routes: ('/tracking' | '/sync')[] = [
          '/tracking',
          '/sync',
        ];
        const targetRoute = routes[Number(e.key) - 1];
        if (targetRoute && canAccessRoute(effectiveRole, targetRoute)) {
          e.preventDefault();
          navigate({ to: targetRoute });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [effectiveRole, navigate, pullLive]);

  useEffect(() => {
    if (bare) return;
    let alive = true;
    void fetchSession()
      .then((s) => {
        if (!alive) return;
        if (!s) {
          setRole('viewer');
          setPricingVisible(false);
          navigate({ to: '/login' });
          return;
        }
        setRole(s.role);
        setPricingVisible(canViewPricing(s.role));
        setUser(s.note || s.role);
        if (!booted.current) {
          booted.current = true;
          setLoading(true);
          void loadDataset().then((cached) => {
            if (cached?.items?.length) {
              setDataset(cached.items);
              setSourceLabel(cached.label);
              setSyncedAt(cached.syncedAt);
              setLoading(false);
            } else {
              void pullLive();
            }
          });
        }
        if (!canAccessRoute(s.role, location.pathname)) {
          toast.error('Vai trò của bạn không có quyền truy cập trang này.');
          navigate({ to: '/tracking' });
        }
      })
      .catch(() => {
        if (alive) navigate({ to: '/login' });
      });
    return () => {
      alive = false;
    };
  }, [location.pathname, bare]);

  const visibleNav = nav.filter((n) => canAccessRoute(effectiveRole, n.to));

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('dynamo-theme', next);
  };

  const logout = () => {
    ['dynamo-user', 'dynamo-role', 'dynamo-code', 'dynamo-session'].forEach((k) => window.localStorage.removeItem(k));
    booted.current = false;
    setDataset([]);
    void logoutSession().finally(() => {
      void clearDataset();
      navigate({ to: '/login' });
    });
  };

  const vendor = getVendorScope(effectiveRole);
  const scoped = useMemo(
    () => (vendor ? rawDataset.filter((i) => String(i.cty_QT).toUpperCase() === vendor) : rawDataset),
    [rawDataset, vendor],
  );
  const dataset = scoped;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter(
      (i) =>
        (workshop === 'Tất cả' || i.phong_sx === workshop) &&
        (!q || `${i.So_DatHang} ${i.ma_hang} ${i.ID_Key} ${i.vat_lieu}`.toLowerCase().includes(q)),
    );
  }, [scoped, workshop, search]);

  const current = nav.find((n) => n.to === location.pathname);

  const contextValue = useMemo(
    () => ({
      workshop,
      setWorkshop,
      search,
      setSearch,
      filtered,
      dataset,
      sourceLabel,
      syncedAt,
      isLive,
      loading,
      loadError,
      applyDataset,
      pullLive,
      resetDataset,
      role: effectiveRole,
      actualRole: role,
      impersonatedRole,
      setImpersonatedRole,
      updateItem,
      bulkUpdateItems,
    }),
    [
      workshop,
      setWorkshop,
      search,
      setSearch,
      filtered,
      dataset,
      sourceLabel,
      syncedAt,
      isLive,
      loading,
      loadError,
      applyDataset,
      pullLive,
      resetDataset,
      effectiveRole,
      role,
      impersonatedRole,
      setImpersonatedRole,
      updateItem,
      bulkUpdateItems,
    ],
  );

  return (
    <AppContext.Provider value={contextValue}>
      {bare ? (
        children
      ) : (
        <div className="min-h-screen md:h-screen md:max-h-[100dvh] md:overflow-hidden bg-background text-foreground flex flex-col">
          {!isOnline && (
            <div className="shrink-0 flex items-center justify-center gap-2 border-b border-warning/60 bg-warning/20 px-4 py-1.5 text-center font-mono text-xs font-bold text-warning">
              <WifiOff size={13} />
              <span>MẤT KẾT NỐI MẠNG NHÀ MÁY · ĐANG HOẠT ĐỘNG Ở CHẾ ĐỘ NGOẠI TUYẾN (DỮ LIỆU ĐƯỢC LƯU CỤC BỘ)</span>
            </div>
          )}

          {/* Top Header Navigation */}
          <header className="shrink-0 sticky top-0 z-30 border-b border-border bg-card/95 text-foreground backdrop-blur-md transition-colors dark:bg-[#12161f]/95 dark:text-slate-100">
            <div className="flex min-h-[58px] items-center justify-between gap-2 px-3 py-1.5 md:px-5 xl:px-6">
              {/* Left Area: Logo & Inline Navigation Tabs */}
              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                <Link to="/tracking" className="flex items-center gap-2.5 shrink-0" aria-label="DYNAMO VIETNAM QT - MES">
                  <img src={logo} alt="Dynamo Vietnam" className="h-8 md:h-9 w-auto max-w-[145px] md:max-w-[175px] object-contain" />
                  <span className="hidden xl:inline-block rounded-xs bg-primary/10 border border-primary/20 px-1.5 py-0.5 text-[9px] font-mono font-bold tracking-wider text-primary">
                    MES
                  </span>
                </Link>

                {/* Inline Nav Tabs */}
                <nav className="flex items-center gap-1 overflow-x-auto py-0.5" aria-label="Thanh điều hướng chính">
                  {visibleNav.map((n) => {
                    const isActive = location.pathname === n.to;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        title={`${n.label} (Phím [${n.shortcut}])`}
                        className={`flex h-9 items-center gap-2 rounded-md px-3 text-[12px] font-bold tracking-wide transition-all whitespace-nowrap active:scale-98 ${
                          isActive
                            ? 'bg-primary/15 text-primary border border-primary/30 shadow-2xs font-black'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent'
                        }`}
                      >
                        <n.icon size={15} className={`shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span>{n.label}</span>
                        <span
                          className={`font-mono text-[9px] tabular-nums rounded px-1 py-0.2 hidden sm:inline-block ${
                            isActive ? 'bg-primary/25 text-primary' : 'bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          [{n.shortcut}]
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Right Area: Controls, Role Switcher, Clock, Theme, User & Logout */}
              <div className="flex items-center gap-1.5 md:gap-2.5 shrink-0">
                {/* Role Impersonation Switcher (Chỉ cho Admin) */}
                {role === 'admin' && (
                  <div
                    className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition-colors ${
                      impersonatedRole
                        ? 'border-warning bg-warning/15 text-warning font-bold'
                        : 'border-border/80 bg-secondary/70 text-foreground'
                    }`}
                    title="Chuyển đổi góc nhìn kiểm tra phân quyền"
                  >
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden 2xl:inline">
                      Góc nhìn:
                    </span>
                    <select
                      value={impersonatedRole ?? 'admin'}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImpersonatedRole(val === 'admin' ? null : (val as Role));
                        toast.info(
                          val === 'admin'
                            ? 'Đã quay lại góc nhìn Admin thực tế'
                            : `Đang giả lập góc nhìn: ${roleLabel(val as Role)}`,
                        );
                      }}
                      className="bg-transparent text-[11px] font-bold text-foreground outline-none cursor-pointer"
                    >
                      <option value="admin" className="bg-popover text-popover-foreground">🛡️ Admin (Toàn quyền)</option>
                      <option value="leader" className="bg-popover text-popover-foreground">👷 Leader (Phân xưởng)</option>
                      <option value="viewer" className="bg-popover text-popover-foreground">👁️ Viewer (Mã hóa đối tác)</option>
                      <option value="qt_yamaichi" className="bg-popover text-popover-foreground">🏭 Đối tác YAMAICHI</option>
                      <option value="qt_provision" className="bg-popover text-popover-foreground">🏭 Đối tác PROVISION</option>
                    </select>
                    {impersonatedRole && (
                      <button
                        type="button"
                        onClick={() => setImpersonatedRole(null)}
                        className="rounded bg-destructive/20 px-1 py-0.5 text-[10px] font-bold text-destructive hover:bg-destructive/30 cursor-pointer"
                        title="Hủy giả lập"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* Digital LED Real-time Clock */}
                <div className="hidden lg:block">
                  <LedClock />
                </div>

                {/* Theme Toggle Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title={theme === 'light' ? 'Chuyển Dark mode' : 'Chuyển Light mode'}
                  aria-label={theme === 'light' ? 'Chuyển Dark mode' : 'Chuyển Light mode'}
                  onClick={toggleTheme}
                >
                  {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                </Button>

                {/* User Profile Pill */}
                <div className="flex items-center gap-2 rounded-md border border-border/80 bg-secondary/50 px-2 py-1">
                  <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[10px] font-black text-primary">
                    QT
                  </span>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-[11px] font-bold leading-tight truncate max-w-[120px]">{user}</span>
                    <div className="flex items-center gap-1">
                      <span className={`inline-block rounded-xs px-1 py-0.2 text-[8px] font-bold tracking-wide ${roleBadge(effectiveRole)}`}>
                        {roleLabel(effectiveRole).toUpperCase()}
                      </span>
                      {impersonatedRole && (
                        <span className="text-[8px] text-warning font-mono font-bold">
                          (GIẢ LẬP)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8.5 w-8.5 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  title="Đăng xuất khỏi hệ thống"
                  aria-label="Đăng xuất"
                  onClick={logout}
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </div>
          </header>

          {/* Shopfloor Telemetry Live Bar */}
          <div className="shrink-0">
            <ShopfloorTelemetry />
          </div>

          {/* Main Page Content */}
          <main className="w-full flex-1 min-h-0 flex flex-col px-2.5 py-1.5 md:px-4 md:py-2 overflow-y-auto md:overflow-hidden">
            {!ready ? (
              <div className="flex min-h-[400px] items-center justify-center text-sm font-medium text-muted-foreground">
                Đang tải dữ liệu phân quyền…
              </div>
            ) : loading && rawDataset.length === 0 ? (
              <BootSkeleton />
            ) : loadError && rawDataset.length === 0 ? (
              <div role="alert" className="mes-card mx-auto mt-10 max-w-xl p-6">
                <p className="font-semibold text-foreground">Chưa tải được dữ liệu sản xuất</p>
                <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
                <Button className="mt-4 active:scale-[0.98]" onClick={() => void pullLive()}>
                  Thử lại
                </Button>
              </div>
            ) : (
              children
            )}
          </main>

          {/* Footer */}
          <footer
            className={`flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/40 px-4 py-2 text-[10px] text-muted-foreground xl:px-6 shrink-0 ${
              isTracking ? 'md:hidden' : ''
            }`}
          >
            <span>© 2026 DYNAMO VIETNAM QT - MES · Hệ thống luân chuyển nhiệt luyện & xi mạ</span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" /> Môi trường mô phỏng (Edge Runtime)
              <CircleHelp size={12} className="ml-2 opacity-70" />
            </span>
          </footer>

          {/* Global Command Palette (⌘K) */}
          <CommandPalette
            open={paletteOpen}
            onOpenChange={setPaletteOpen}
            onToggleTheme={toggleTheme}
            onLogout={logout}
          />
        </div>
      )}
    </AppContext.Provider>
  );
}

export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border/40 pb-4">
      <div>
        <p className="mb-1 text-[10px] font-bold tracking-[.2em] text-primary uppercase">{eyebrow}</p>
        <h1 className="font-display text-[24px] font-extrabold tracking-tight text-foreground md:text-[28px]">{title}</h1>
        <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function BootSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-warning" />
        Đang đồng bộ dữ liệu nhiệt luyện từ Google Sheets…
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mes-card h-24 animate-pulse bg-muted/40" />
        ))}
      </div>
      <div className="mes-card space-y-3 p-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 animate-pulse rounded bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
