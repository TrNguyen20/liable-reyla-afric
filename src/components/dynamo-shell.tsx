import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import {
  Activity,
  ArrowLeftRight,
  Boxes,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Command,
  DatabaseZap,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  role: Role;
  resetDataset: () => void;
  updateItem: (id: string, patch: Partial<QTItem>) => void;
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
  to: '/dashboard' | '/orders' | '/tracking' | '/audit-costs' | '/materials' | '/sync';
  label: string;
  icon: typeof LayoutDashboard;
  section?: string;
  shortcut: string;
}[] = [
  { to: '/dashboard', label: 'TỔNG QUAN', icon: LayoutDashboard, section: 'ĐIỀU HÀNH', shortcut: '1' },
  { to: '/orders', label: 'ĐƠN ĐẶT HÀNG', icon: ClipboardList, shortcut: '2' },
  { to: '/tracking', label: 'LUÂN CHUYỂN QT', icon: ArrowLeftRight, shortcut: '3' },
  { to: '/audit-costs', label: 'ĐỐI SOÁT CHI PHÍ', icon: ShieldCheck, section: 'KIỂM SOÁT', shortcut: '4' },
  { to: '/materials', label: 'MÁC THÉP', icon: Boxes, shortcut: '5' },
  { to: '/sync', label: 'NẠP CSV / ĐỒNG BỘ', icon: DatabaseZap, section: 'HỆ THỐNG', shortcut: '6' },
] as const;

export function DynamoShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const [workshop, setWorkshop] = useState<Filter>('Tất cả');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState('Quản lý QT');
  const [role, setRole] = useState<Role>('admin');
  const [ready, setReady] = useState(false);
  const [rawDataset, setDataset] = useState<QTItem[]>([]);
  const [sourceLabel, setSourceLabel] = useState(LIVE_LABEL);
  const [syncedAt, setSyncedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const booted = useRef(false);

  const isLive = rawDataset.length > 0;

  const applyDataset = (rows: QTItem[], label: string) => {
    const stamp = new Date().toISOString();
    setDataset(rows);
    setSourceLabel(label);
    setSyncedAt(stamp);
    void saveDataset({ items: rows, label, syncedAt: stamp });
  };

  const updateItem = (id: string, patch: Partial<QTItem>) =>
    setDataset((prev) => {
      const next = prev.map((i) => (i.ID_Key === id ? { ...i, ...patch } : i));
      void saveDataset({ items: next, label: sourceLabel, syncedAt });
      return next;
    });

  // Pull live rows through the server; the server scopes/masks them by the signed session role.
  const pullLive = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const r = await fetchScopedSheet({ data: { url: LIVE_SHEET_URL } });
      applyDataset(r.items, LIVE_LABEL);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Không tải được dữ liệu từ Google Sheets.');
    } finally {
      setLoading(false);
    }
  };

  const resetDataset = () => {
    void clearDataset().then(pullLive);
  };

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    const saved = window.localStorage.getItem('dynamo-theme');
    const next = saved === 'dark' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    setReady(true);
    return () => clearInterval(id);
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
      if (e.key >= '1' && e.key <= '6') {
        const routes: ('/dashboard' | '/orders' | '/tracking' | '/audit-costs' | '/materials' | '/sync')[] = [
          '/dashboard',
          '/orders',
          '/tracking',
          '/audit-costs',
          '/materials',
          '/sync',
        ];
        const targetRoute = routes[Number(e.key) - 1];
        if (targetRoute && canAccessRoute(role, targetRoute)) {
          e.preventDefault();
          navigate({ to: targetRoute });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [role, navigate]);

  useEffect(() => {
    setMobileOpen(false);
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
          navigate({ to: '/dashboard' });
        }
      })
      .catch(() => {
        if (alive) navigate({ to: '/login' });
      });
    return () => {
      alive = false;
    };
  }, [location.pathname, bare]);

  const visibleNav = nav.filter((n) => canAccessRoute(role, n.to));

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('dynamo-theme', next);
  };

  const logout = () => {
    ['dynamo-user', 'dynamo-role', 'dynamo-code'].forEach((k) => window.localStorage.removeItem(k));
    booted.current = false;
    setDataset([]);
    void logoutSession().finally(() => {
      void clearDataset();
      navigate({ to: '/login' });
    });
  };

  const vendor = getVendorScope(role);
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
  const dateLabel = now
    ? now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
    : '--/--/----';
  const timeLabel = now ? now.toLocaleTimeString('vi-VN', { hour12: false }) : '--:--:--';

  return (
    <AppContext.Provider
      value={{
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
        resetDataset,
        role,
        updateItem,
      }}
    >
      {bare ? (
        children
      ) : (
        <div className="min-h-screen bg-background text-foreground lg:flex">
          {mobileOpen && (
            <div className="fixed inset-0 z-30 bg-overlay lg:hidden" onClick={() => setMobileOpen(false)} />
          )}

          {/* Sidebar */}
          <aside
            className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${
              collapsed ? 'lg:w-[80px]' : 'lg:w-[248px]'
            } ${mobileOpen ? 'w-[248px] translate-x-0' : 'w-[248px] -translate-x-full lg:translate-x-0'}`}
          >
            <div className="flex h-[72px] items-center justify-between border-b border-sidebar-border px-5">
              <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden" aria-label="DYNAMO VIETNAM QT - MES">
                {collapsed ? (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-dynamo font-display text-lg font-black text-white">
                    D
                  </span>
                ) : (
                  <img src={logo} alt="Dynamo Vietnam" className="h-9 w-auto max-w-[190px] object-contain" />
                )}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Đóng menu"
                onClick={() => setMobileOpen(false)}
              >
                <X />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5">
              {visibleNav.map((n, index) => (
                <div key={n.to}>
                  {n.section && (
                    <p
                      className={`mb-2 mt-5 px-3 text-[10px] font-bold tracking-[.16em] text-sidebar-foreground/50 ${
                        index === 0 ? '!mt-0' : ''
                      } ${collapsed ? 'lg:text-center lg:px-0' : ''}`}
                    >
                      {collapsed ? <span className="lg:hidden">{n.section}</span> : n.section}
                    </p>
                  )}
                  <Link
                    to={n.to}
                    title={collapsed ? `${n.label} (Phím ${n.shortcut})` : undefined}
                    className={`mb-1 flex h-10 items-center gap-3 rounded-sm px-3 text-[12px] font-bold tracking-wide transition-colors ${
                      location.pathname === n.to
                        ? 'bg-sidebar-primary/20 text-sidebar-primary shadow-[inset_2px_0_0_var(--sidebar-primary)]'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    }`}
                  >
                    <n.icon size={16} className="shrink-0" />
                    <span className={`truncate flex-1 ${collapsed ? 'lg:hidden' : ''}`}>{n.label}</span>
                    <span
                      className={`font-mono text-[9px] text-sidebar-foreground/40 tabular-nums ${
                        collapsed ? 'lg:hidden' : ''
                      }`}
                    >
                      [{n.shortcut}]
                    </span>
                  </Link>
                </div>
              ))}
            </div>

            <div className="border-t border-sidebar-border p-3">
              <div className={`mb-3 flex items-center gap-3 px-2 py-2 ${collapsed ? 'lg:justify-center' : ''}`}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">
                  QT
                </span>
                <span className={collapsed ? 'lg:hidden' : ''}>
                  <span className="block text-xs font-bold">{user}</span>
                  <span
                    className={`mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${roleBadge(
                      role,
                    )}`}
                  >
                    {roleLabel(role).toUpperCase()}
                  </span>
                </span>
              </div>
              <p
                className={`mb-2 px-2 text-[9px] font-bold leading-snug tracking-[.12em] text-sidebar-foreground/45 ${
                  collapsed ? 'lg:hidden' : ''
                }`}
              >
                DYNAMO VIETNAM CO., LTD.
                <span className="block font-medium tracking-normal">QT Operations System</span>
              </p>
              <div className={`flex gap-1 ${collapsed ? 'lg:flex-col' : ''}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden flex-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex"
                  title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                  aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
                  onClick={() => setCollapsed((v) => !v)}
                >
                  {collapsed ? <ChevronRight /> : <ChevronLeft />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-destructive"
                  title="Đăng xuất"
                  aria-label="Đăng xuất"
                  onClick={logout}
                >
                  <LogOut size={16} />
                </Button>
              </div>
            </div>
          </aside>

          {/* Main Area */}
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 border-b border-border bg-card/95 text-foreground backdrop-blur-md transition-colors dark:bg-[#12161f]/95 dark:text-slate-100">
              <div className="flex min-h-[58px] flex-wrap items-center gap-2.5 px-4 py-2 xl:gap-3.5 xl:px-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden text-foreground hover:bg-secondary"
                  aria-label="Mở menu"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu size={18} />
                </Button>
                <div className="mr-auto flex min-w-[160px] items-center gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[.18em] text-muted-foreground uppercase">
                      DYNAMO VIETNAM QT - MES
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-2 rounded-full bg-primary" />
                      <p className="font-display text-base font-bold tracking-tight text-foreground">
                        {current?.label ?? 'TỔNG QUAN'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick Command Bar Trigger */}
                <button
                  type="button"
                  onClick={() => setPaletteOpen(true)}
                  className="relative order-last flex h-8.5 w-full items-center justify-between rounded-md border border-input bg-secondary/60 pl-8 pr-2.5 text-xs text-muted-foreground transition-colors hover:border-primary hover:bg-background sm:order-none sm:w-56 xl:w-68"
                >
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <span className="truncate">{search ? `Lọc: "${search}"` : 'Tìm kiếm nhanh lô hàng...'}</span>
                  <kbd className="pointer-events-none rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] font-bold text-foreground">
                    ⌘K
                  </kbd>
                </button>

                {/* Workshop Filter Selector */}
                <div
                  className="flex items-center rounded-md border border-border/80 bg-secondary/70 p-0.5"
                  aria-label="Lọc phân xưởng"
                >
                  {(['Tất cả', 'PIN', 'INSERT', 'MOLD'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setWorkshop(v)}
                      className={`h-7 rounded-sm px-2.5 text-[11px] font-bold tracking-wide transition-all ${
                        workshop === v
                          ? 'bg-card text-foreground shadow-xs border border-border/80 font-black'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      {v === 'Tất cả' ? 'ALL' : v}
                    </button>
                  ))}
                </div>

                {/* Digital LED Real-time Clock */}
                <div className="led-clock flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-bold" aria-label="Đồng hồ thời gian thực">
                  <span className="hidden text-[9px] font-semibold tracking-widest text-slate-400 sm:inline">
                    {dateLabel}
                  </span>
                  <span className="inline-block size-1.5 rounded-full fx-run-dot" aria-hidden />
                  <span className="font-mono tabular-nums">{timeLabel}</span>
                </div>

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
              </div>
            </header>

            {/* Shopfloor Telemetry Live Bar */}
            <ShopfloorTelemetry />

            {/* Main Page Content */}
            <main className="mx-auto max-w-[1700px] px-4 pb-14 pt-6 xl:px-6">
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
            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/40 px-4 py-3 text-[11px] text-muted-foreground xl:px-6">
              <span>© 2026 DYNAMO VIETNAM QT - MES · Hệ thống luân chuyển nhiệt luyện & xi mạ</span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-primary" /> Môi trường mô phỏng (Edge Runtime)
                <CircleHelp size={12} className="ml-2 opacity-70" />
              </span>
            </footer>
          </div>

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
