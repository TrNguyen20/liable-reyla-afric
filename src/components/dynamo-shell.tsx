import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Activity, ArrowLeftRight, Boxes, ChevronLeft, ChevronRight, CircleHelp, ClipboardList, DatabaseZap, LayoutDashboard, LogOut, Menu, Moon, Search, ShieldCheck, Sun, X } from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { items as sampleItems, type QTItem, type Workshop } from '@/lib/dynamo-data';
import logo from '@/assets/dynamo-logo.png';
import { canAccessRoute, readRole, roleBadge, roleLabel, setPricingVisible, canViewPricing, getVendorScope, type Role } from '@/lib/dynamo-auth';
import { toast } from 'sonner';
import { clearDataset, loadDataset, saveDataset } from '@/lib/dynamo-source';
import { ShopfloorTelemetry } from '@/components/shopfloor-telemetry';

type Filter = 'Tất cả' | Workshop;
type AppContextType = {
  workshop: Filter; setWorkshop: (v: Filter) => void;
  search: string; setSearch: (v: string) => void;
  filtered: QTItem[]; dataset: QTItem[];
  sourceLabel: string; syncedAt: string; isLive: boolean;
  applyDataset: (rows: QTItem[], label: string) => void;
  role: Role;
  resetDataset: () => void;
  updateItem: (id: string, patch: Partial<QTItem>) => void;
};
// Keep one context instance across hot reloads; a re-created context leaves pages reading an empty provider.
const g = globalThis as { __dynamoCtx?: React.Context<AppContextType | null> };
const AppContext = (g.__dynamoCtx ??= createContext<AppContextType | null>(null));
export function useDynamo() { const context = useContext(AppContext); if (!context) throw new Error('Dynamo context missing'); return context; }
const nav: { to: '/dashboard' | '/orders' | '/tracking' | '/audit-costs' | '/materials' | '/sync'; label: string; icon: typeof LayoutDashboard; section?: string }[] = [
  { to: '/dashboard', label: 'TỔNG QUAN', icon: LayoutDashboard, section: 'ĐIỀU HÀNH' },
  { to: '/orders', label: 'ĐƠN ĐẶT HÀNG', icon: ClipboardList },
  { to: '/tracking', label: 'LUÂN CHUYỂN QT', icon: ArrowLeftRight },
  { to: '/audit-costs', label: 'ĐỐI SOÁT CHI PHÍ', icon: ShieldCheck, section: 'KIỂM SOÁT' },
  { to: '/materials', label: 'MÁC THÉP', icon: Boxes },
  { to: '/sync', label: 'NẠP CSV / ĐỒNG BỘ', icon: DatabaseZap, section: 'HỆ THỐNG' },
] as const;
export function DynamoShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const [workshop, setWorkshop] = useState<Filter>('Tất cả');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [user, setUser] = useState('Quản lý QT');
  const [role, setRole] = useState<Role>('admin');
  const [ready, setReady] = useState(false);
  const [rawDataset, setDataset] = useState<QTItem[]>(sampleItems);
  const [sourceLabel, setSourceLabel] = useState('Bộ dữ liệu mẫu');
  const [syncedAt, setSyncedAt] = useState('');
  const isLive = sourceLabel !== 'Bộ dữ liệu mẫu';
  const applyDataset = (rows: QTItem[], label: string) => {
    const stamp = new Date().toISOString();
    setDataset(rows); setSourceLabel(label); setSyncedAt(stamp);
    void saveDataset({ items: rows, label, syncedAt: stamp });
  };
  const updateItem = (id: string, patch: Partial<QTItem>) => setDataset(prev => { const next = prev.map(i => i.ID_Key === id ? { ...i, ...patch } : i); void saveDataset({ items: next, label: sourceLabel, syncedAt }); return next; });
  const resetDataset = () => {
    setDataset(sampleItems); setSourceLabel('Bộ dữ liệu mẫu'); setSyncedAt('');
    void clearDataset();
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
    setUser(window.localStorage.getItem('dynamo-user') ?? 'Quản lý QT');
    const r = readRole(); setPricingVisible(canViewPricing(r)); setRole(r);
    void loadDataset().then(cached => {
      if (cached?.items?.length) { setDataset(cached.items); setSourceLabel(cached.label); setSyncedAt(cached.syncedAt); }
    });
    setReady(true);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => { if (!canAccessRoute(readRole(), location.pathname)) { toast.error('Vai trò của bạn không có quyền truy cập trang này.'); navigate({ to: '/dashboard' }); } }, [location.pathname, role]);
  const visibleNav = nav.filter(n => canAccessRoute(role, n.to));
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    window.localStorage.setItem('dynamo-theme', next);
  };
  const logout = () => {
    window.localStorage.removeItem('dynamo-user'); window.localStorage.removeItem('dynamo-role'); window.localStorage.removeItem('dynamo-code');
    navigate({ to: '/login' });
  };
  const vendor = getVendorScope(role);
  const scoped = useMemo(() => vendor ? rawDataset.filter(i => String(i.cty_QT).toUpperCase() === vendor) : rawDataset, [rawDataset, vendor]);
  const dataset = scoped;
  const filtered = useMemo(() => { const q = search.trim().toLowerCase(); return scoped.filter(i => (workshop === 'Tất cả' || i.phong_sx === workshop) && (!q || `${i.So_DatHang} ${i.ma_hang} ${i.ID_Key}`.toLowerCase().includes(q))); }, [scoped, workshop, search]);
  const current = nav.find(n => n.to === location.pathname);
  const dateLabel = now ? now.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }) : '--/--/----';
  const timeLabel = now ? now.toLocaleTimeString('vi-VN', { hour12: false }) : '--:--:--';
  return <AppContext.Provider value={{ workshop, setWorkshop, search, setSearch, filtered, dataset, sourceLabel, syncedAt, isLive, applyDataset, resetDataset, role, updateItem }}>
    {bare ? children : <div className="min-h-screen bg-background text-foreground lg:flex">
      {mobileOpen && <div className="fixed inset-0 z-30 bg-overlay lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-200 lg:sticky lg:top-0 lg:h-screen ${collapsed ? 'lg:w-[80px]' : 'lg:w-[248px]'} ${mobileOpen ? 'w-[248px] translate-x-0' : 'w-[248px] -translate-x-full lg:translate-x-0'}`}>
        <div className="flex h-[72px] items-center justify-between border-b border-sidebar-border px-5">
          <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden" aria-label="DYNAMO VIETNAM QT - MES">
            {collapsed ? <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-dynamo font-display text-lg font-black text-white">D</span> : <img src={logo} alt="Dynamo Vietnam" className="h-9 w-auto max-w-[190px] object-contain" />}
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" aria-label="Đóng menu" onClick={() => setMobileOpen(false)}><X /></Button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          {visibleNav.map((n, index) => <div key={n.to}>
            {n.section && <p className={`mb-2 mt-5 px-3 text-[10px] font-bold tracking-[.16em] text-sidebar-foreground/50 ${index === 0 ? '!mt-0' : ''} ${collapsed ? 'lg:text-center lg:px-0' : ''}`}>{collapsed ? <span className="lg:hidden">{n.section}</span> : n.section}</p>}
            <Link to={n.to} title={collapsed ? n.label : undefined} className={`mb-1 flex h-10 items-center gap-3 rounded-sm px-3 text-[12px] font-bold tracking-wide transition-colors ${location.pathname === n.to ? 'bg-sidebar-primary/20 text-sidebar-primary shadow-[inset_2px_0_0_var(--sidebar-primary)]' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}><n.icon size={16} className="shrink-0" /><span className={`truncate ${collapsed ? 'lg:hidden' : ''}`}>{n.label}</span></Link>
          </div>)}
        </div>
        <div className="border-t border-sidebar-border p-3">
          <div className={`mb-3 flex items-center gap-3 px-2 py-2 ${collapsed ? 'lg:justify-center' : ''}`}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20 text-xs font-bold text-sidebar-primary">QT</span>
            <span className={collapsed ? 'lg:hidden' : ''}><span className="block text-xs font-bold">{user}</span><span className={`mt-0.5 inline-block rounded-sm px-1.5 py-0.5 text-[9px] font-bold tracking-wide ${roleBadge(role)}`}>{roleLabel(role).toUpperCase()}</span></span>
          </div>
          <p className={`mb-2 px-2 text-[9px] font-bold leading-snug tracking-[.12em] text-sidebar-foreground/45 ${collapsed ? 'lg:hidden' : ''}`}>DYNAMO VIETNAM CO., LTD.<span className="block font-medium tracking-normal">QT Operations System</span></p>
          <div className={`flex gap-1 ${collapsed ? 'lg:flex-col' : ''}`}>
            <Button variant="ghost" size="icon" className="hidden flex-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:flex" title={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} aria-label={collapsed ? 'Mở rộng menu' : 'Thu gọn menu'} onClick={() => setCollapsed(v => !v)}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</Button>
            <Button variant="ghost" size="icon" className="w-full text-sidebar-foreground/60 hover:bg-destructive/20 hover:text-destructive" title="Đăng xuất" aria-label="Đăng xuất" onClick={logout}><LogOut size={16} /></Button>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-border bg-card/95 text-foreground backdrop-blur-md transition-colors dark:bg-[#12161f]/95 dark:text-slate-100">
          <div className="flex min-h-[58px] flex-wrap items-center gap-2.5 px-4 py-2 xl:gap-3.5 xl:px-6">
            <Button variant="ghost" size="icon" className="lg:hidden text-foreground hover:bg-secondary" aria-label="Mở menu" onClick={() => setMobileOpen(true)}><Menu size={18} /></Button>
            <div className="mr-auto flex min-w-[160px] items-center gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[.18em] text-muted-foreground uppercase">DYNAMO VIETNAM QT - MES</p>
                <div className="flex items-center gap-2">
                  <span className="inline-block size-2 rounded-full bg-primary" />
                  <p className="font-display text-base font-bold tracking-tight text-foreground">{current?.label ?? 'TỔNG QUAN'}</p>
                </div>
              </div>
            </div>
            <div className="relative order-last w-full sm:order-none sm:w-56 xl:w-64">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && search) navigate({ to: '/orders' }); }} placeholder="Tìm mã đơn, mã hàng..." aria-label="Tìm mã đơn, mã hàng" className="h-8.5 w-full rounded-md border border-input bg-secondary/60 pl-8 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background focus:ring-1 focus:ring-primary/20" />
            </div>
            <div className="flex items-center rounded-md border border-border/80 bg-secondary/70 p-0.5" aria-label="Lọc phân xưởng">
              {(['Tất cả', 'PIN', 'INSERT', 'MOLD'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setWorkshop(v)}
                  className={`h-7 rounded-sm px-2.5 text-[11px] font-bold tracking-wide transition-all ${workshop === v ? 'bg-card text-foreground shadow-xs border border-border/80 font-black' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
                >
                  {v === 'Tất cả' ? 'ALL' : v}
                </button>
              ))}
            </div>
            <div className="led-clock flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-bold" aria-label="Đồng hồ thời gian thực">
              <span className="hidden text-[9px] font-semibold tracking-widest text-slate-400 sm:inline">{dateLabel}</span>
              <span className="inline-block size-1.5 rounded-full fx-run-dot" aria-hidden />
              <span className="font-mono tabular-nums">{timeLabel}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8.5 w-8.5 text-muted-foreground hover:bg-secondary hover:text-foreground" title={theme === 'light' ? 'Chuyển Dark mode' : 'Chuyển Light mode'} aria-label={theme === 'light' ? 'Chuyển Dark mode' : 'Chuyển Light mode'} onClick={toggleTheme}>
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </Button>
          </div>
        </header>
        <ShopfloorTelemetry />
        <main className="mx-auto max-w-[1700px] px-4 pb-14 pt-6 xl:px-6">{ready ? children : <div className="flex min-h-[400px] items-center justify-center text-sm font-medium text-muted-foreground">Đang tải dữ liệu phân quyền…</div>}</main>
        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/40 px-4 py-3 text-[11px] text-muted-foreground xl:px-6">
          <span>© 2026 DYNAMO VIETNAM QT - MES · Hệ thống luân chuyển nhiệt luyện & xi mạ</span>
          <span className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-primary" /> Môi trường mô phỏng (Edge Runtime)
            <CircleHelp size={12} className="ml-2 opacity-70" />
          </span>
        </footer>
      </div>
    </div>}
  </AppContext.Provider>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
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


