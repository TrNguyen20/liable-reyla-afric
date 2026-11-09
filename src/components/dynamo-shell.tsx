import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  CircleHelp,
  DatabaseZap,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  Sun,
  WifiOff,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  memo,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/button";
import { type QTItem, type Workshop } from "@/lib/dynamo-data";
import logo from "@/assets/dynamo-logo.png";
import {
  canAccessRoute,
  fetchSession,
  roleBadge,
  roleLabel,
  setPricingVisible,
  canViewPricing,
  getVendorScope,
  type Role,
} from "@/lib/dynamo-auth";
import { toast } from "sonner";
import { playAudioCue } from "@/lib/audio-cues";
import { clearDataset, loadDataset, saveDataset } from "@/lib/dynamo-source";
import { checkDatasetVersion, fetchDatasetDeltas, logoutSession } from "@/lib/auth.functions";
import { fetchScopedSheet, type ScopedSheetResult } from "@/lib/sheet.functions";
import { LIVE_LABEL, LIVE_SHEET_URL } from "@/lib/live-sheet";
import { ShopfloorTelemetry } from "@/components/shopfloor-telemetry";
import { CommandPalette } from "@/components/command-palette";
import { useTranslation, type Locale } from "@/i18n";

type Filter = "Tất cả" | Workshop;
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
  pullLive: (isManual?: boolean) => Promise<void>;
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
  if (!context) throw new Error("Dynamo context missing");
  return context;
}

const nav: {
  to: "/tracking" | "/dashboard" | "/orders" | "/sync";
  labelKey: string;
  label: string;
  icon: typeof ArrowLeftRight | typeof LayoutDashboard | typeof Package | typeof DatabaseZap;
  section?: string;
  shortcut: string;
}[] = [
  {
    to: "/tracking",
    labelKey: "nav.tracking",
    // prettier-ignore
    label: 'LUÂN CHUYỂN',
    icon: ArrowLeftRight,
    section: "ĐIỀU HÀNH",
    shortcut: "1",
  },
  {
    to: "/dashboard",
    labelKey: "nav.dashboard",
    label: "TỔNG QUAN",
    icon: LayoutDashboard,
    section: "ĐIỀU HÀNH",
    shortcut: "2",
  },
  {
    to: "/orders",
    labelKey: "nav.orders",
    label: "ĐƠN ĐẶT HÀNG",
    icon: Package,
    section: "ĐIỀU HÀNH",
    shortcut: "3",
  },
  {
    to: "/sync",
    labelKey: "nav.sync",
    // prettier-ignore
    label: 'ĐỒNG BỘ',
    icon: DatabaseZap,
    section: "HỆ THỐNG",
    shortcut: "4",
  },
] as const;

const LedClock = memo(function LedClock({ locale = "vi" }: { locale?: Locale }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const dateLabel =
    locale === "ja"
      ? `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, "0")}月${String(now.getDate()).padStart(2, "0")}日`
      : now.toLocaleDateString(locale === "en" ? "en-US" : "vi-VN", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
  const timeLabel = now.toLocaleTimeString(
    locale === "ja" ? "ja-JP" : locale === "en" ? "en-US" : "vi-VN",
    { hour12: false },
  );

  return (
    <div
      className="led-clock flex h-7 items-center gap-1.5 rounded-xs px-2 text-xs font-bold"
      aria-label={t("common.clock.ariaLabel") || "Đồng hồ thời gian thực"}
    >
      <span className="hidden text-[9px] font-semibold tracking-widest text-slate-400 sm:inline">
        {dateLabel}
      </span>
      <span className="inline-block size-1.5 rounded-full fx-run-dot" aria-hidden />
      <span className="font-mono tabular-nums">{timeLabel}</span>
    </div>
  );
});

export function DynamoShell({ children, bare = false }: { children: ReactNode; bare?: boolean }) {
  const { locale, setLocale, t, locales } = useTranslation();
  const [workshop, setWorkshopState] = useState<Filter>("Tất cả");
  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [user, setUser] = useState("Quản lý QT");
  const [role, setRole] = useState<Role>("admin");
  const [impersonatedRole, setImpersonatedRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const [rawDataset, setDataset] = useState<QTItem[]>([]);
  const [sourceLabel, setSourceLabel] = useState(LIVE_LABEL);
  const [syncedAt, setSyncedAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
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

  const updateItem = useCallback(
    (id: string, patch: Partial<QTItem>) =>
      setDataset((prev) => {
        const next = prev.map((i) => (i.ID_Key === id ? { ...i, ...patch } : i));
        void saveDataset({ items: next, label: sourceLabel, syncedAt });
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("dynamo-realtime-bus");
            bc.postMessage({ type: "PATCH_ITEM", id, patch });
            bc.close();
          }
        } catch {
          /* ignore */
        }
        return next;
      }),
    [sourceLabel, syncedAt],
  );

  const bulkUpdateItems = useCallback(
    (ids: string[], patch: Partial<QTItem>) =>
      setDataset((prev) => {
        const idSet = new Set(ids);
        const next = prev.map((i) => (idSet.has(i.ID_Key) ? { ...i, ...patch } : i));
        void saveDataset({ items: next, label: sourceLabel, syncedAt });
        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("dynamo-realtime-bus");
            bc.postMessage({ type: "BULK_PATCH", ids, patch });
            bc.close();
          }
        } catch {
          /* ignore */
        }
        return next;
      }),
    [sourceLabel, syncedAt],
  );

  const [clientVersion, setClientVersion] = useState<number>(0);
  const isSyncingDeltas = useRef(false);

  // Pull live rows through the server; the server scopes/masks them by the signed session role.
  const pullLive = useCallback(
    async (isManual = true) => {
      if (isManual) setLoading(true);
      setLoadError("");
      const t0 = performance.now();
      try {
        const rawRes = await fetchScopedSheet({ data: { url: LIVE_SHEET_URL } });
        const r: ScopedSheetResult = rawRes instanceof Response ? await rawRes.json() : (rawRes as unknown as ScopedSheetResult);
        const elapsed = Math.round(performance.now() - t0);
        applyDataset(r.items, LIVE_LABEL);
        if (r.version) {
          setClientVersion(r.version);
        }
        if (isManual) {
          toast.success(
            t("common.toasts.refreshSuccess", { count: r.items.length, elapsed }) ||
              `Đã làm mới ${r.items.length} lô từ hệ thống (${elapsed}ms)`,
          );
          playAudioCue("success");
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : t("common.toasts.loadFailed") || "Không tải được dữ liệu từ hệ thống.";
        setLoadError(msg);
        if (isManual) {
          toast.error(t("common.toasts.loadError", { msg }) || `Lỗi tải dữ liệu: ${msg}`);
          playAudioCue("error");
        }
      } finally {
        if (isManual) setLoading(false);
      }
    },
    [applyDataset, t],
  );

  const resetDataset = useCallback(() => {
    void clearDataset().then(() => void pullLive());
  }, [pullLive]);

  const location = useLocation();
  const navigate = useNavigate();
  const isTracking = location.pathname === "/tracking";
  const isCockpitRoute = ["/tracking", "/orders"].includes(location.pathname);

  useEffect(() => {
    const saved = window.localStorage.getItem("dynamo-theme");
    const next = saved === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    const savedWs = window.localStorage.getItem("dynamo-workshop") as Filter | null;
    if (savedWs && ["Tất cả", "PIN", "INSERT", "MOLD"].includes(savedWs)) {
      setWorkshopState(savedWs);
    }
    setIsOnline(navigator.onLine);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setReady(true);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const setWorkshop = useCallback((w: Filter) => {
    setWorkshopState(w);
    window.localStorage.setItem("dynamo-workshop", w);
  }, []);

  // Keyboard navigation & Command Palette listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.shiftKey && (e.key === "r" || e.key === "R")) {
        e.preventDefault();
        void pullLive();
        return;
      }
      if (e.key >= "1" && e.key <= "4") {
        const routes: ("/tracking" | "/dashboard" | "/orders" | "/sync")[] = [
          "/tracking",
          "/dashboard",
          "/orders",
          "/sync",
        ];
        const targetRoute = routes[Number(e.key) - 1];
        if (targetRoute && canAccessRoute(effectiveRole, targetRoute)) {
          e.preventDefault();
          navigate({ to: targetRoute });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [effectiveRole, navigate, pullLive]);

  useEffect(() => {
    if (bare) return;
    let alive = true;
    void fetchSession()
      .then((s) => {
        if (!alive) return;
        if (!s) {
          setRole("viewer");
          setPricingVisible(false);
          navigate({ to: "/login" });
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
              // Đồng bộ ngầm với bộ nhớ Server để nhận phiên bản mới nhất
              void pullLive(false);
            } else {
              void pullLive(false);
            }
          });
        }
        if (!canAccessRoute(s.role, location.pathname)) {
          toast.error(
            t("common.toasts.accessDenied") || "Vai trò của bạn không có quyền truy cập trang này.",
          );
          navigate({ to: "/tracking" });
        }
      })
      .catch(() => {
        if (alive) navigate({ to: "/login" });
      });
    return () => {
      alive = false;
    };
  }, [location.pathname, bare, pullLive]);

  // Lắng nghe BroadcastChannel để đồng bộ tức thì (< 5ms) giữa các tab trong cùng trình duyệt
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const bc = new BroadcastChannel("dynamo-realtime-bus");
    bc.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;
      if (msg.type === "PATCH_ITEM") {
        setDataset((prev) => prev.map((i) => (i.ID_Key === msg.id ? { ...i, ...msg.patch } : i)));
      } else if (msg.type === "BULK_PATCH") {
        const idSet = new Set(msg.ids);
        setDataset((prev) => prev.map((i) => (idSet.has(i.ID_Key) ? { ...i, ...msg.patch } : i)));
      }
    };
    return () => {
      bc.close();
    };
  }, []);

  // Vòng lặp Realtime Sync Hub: Nhận biết phiên bản dữ liệu từ Server & Google Apps Script
  const pollDeltas = useCallback(async () => {
    if (isSyncingDeltas.current) return;
    try {
      const vInfo = await checkDatasetVersion();
      if (!vInfo) return;

      // Khởi tạo clientVersion nếu chưa có
      if (clientVersion === 0) {
        setClientVersion(vInfo.version);
        return;
      }

      if (vInfo.version > clientVersion) {
        isSyncingDeltas.current = true;
        const deltaRes = await fetchDatasetDeltas({ data: { sinceVersion: clientVersion } });
        if (deltaRes.resetRequired) {
          void pullLive(false);
        } else if (deltaRes.deltas && deltaRes.deltas.length > 0) {
          const patchMap = new Map<string, Partial<QTItem>>();
          for (const d of deltaRes.deltas) {
            const prev = patchMap.get(d.id) || {};
            patchMap.set(d.id, { ...prev, ...d.patch });
          }
          setDataset((prev) => {
            const next = prev.map((item) => {
              const patch = patchMap.get(item.ID_Key);
              return patch ? { ...item, ...patch } : item;
            });
            void saveDataset({
              items: next,
              label: LIVE_LABEL,
              syncedAt: new Date().toISOString(),
            });
            return next;
          });
          setSyncedAt(new Date().toISOString());
          setClientVersion(deltaRes.version);
        } else {
          setClientVersion(deltaRes.version);
        }
      }
    } catch {
      // Heartbeat ngầm bỏ qua lỗi mạng tạm thời
    } finally {
      isSyncingDeltas.current = false;
    }
  }, [clientVersion, pullLive]);

  useEffect(() => {
    if (bare) return;

    // Polling định kỳ mỗi 1.8s
    const interval = setInterval(() => {
      void pollDeltas();
    }, 1800);

    // Kích hoạt đồng bộ ngay lập tức khi người dùng chuyển sang tab (visibilitychange / focus)
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        void pollDeltas();
      }
    };

    window.addEventListener("focus", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onVisibilityChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [bare, pollDeltas]);

  const visibleNav = nav.filter((n) => canAccessRoute(effectiveRole, n.to));

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    window.localStorage.setItem("dynamo-theme", next);
  };

  const logout = () => {
    ["dynamo-user", "dynamo-role", "dynamo-code", "dynamo-session"].forEach((k) =>
      window.localStorage.removeItem(k),
    );
    booted.current = false;
    setDataset([]);
    void logoutSession().finally(() => {
      void clearDataset();
      navigate({ to: "/login" });
    });
  };

  const vendor = getVendorScope(effectiveRole);
  const scoped = useMemo(
    () =>
      vendor ? rawDataset.filter((i) => String(i.cty_QT).toUpperCase() === vendor) : rawDataset,
    [rawDataset, vendor],
  );
  const dataset = scoped;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scoped.filter(
      (i) =>
        (workshop === "Tất cả" || i.phong_sx === workshop) &&
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
              <span>
                {t("common.offlineAlert") ||
                  "MẤT KẾT NỐI MẠNG NHÀ MÁY · ĐANG HOẠT ĐỘNG Ở CHẾ ĐỘ NGOẠI TUYẾN (DỮ LIỆU ĐƯỢC LƯU CỤC BỘ)"}
              </span>
            </div>
          )}

          {/* Top Header Navigation */}
          <header className="shrink-0 sticky top-0 z-30 border-b border-border bg-card/95 text-foreground backdrop-blur-md transition-colors dark:bg-[#12161f]/95 dark:text-slate-100">
            <div className="flex h-[48px] items-center justify-between gap-2 px-3 md:px-5 xl:px-6">
              {/* Left Area: Logo & Inline Navigation Tabs */}
              <div className="flex items-center gap-2.5 md:gap-4 min-w-0">
                <Link
                  to="/tracking"
                  className="flex items-center gap-2 shrink-0"
                  aria-label="DYNAMO VIETNAM QT - MES"
                >
                  <img
                    src={logo}
                    alt="Dynamo Vietnam"
                    className="h-7 md:h-8 w-auto max-w-[135px] md:max-w-[160px] object-contain"
                  />
                  <span className="hidden xl:inline-block rounded-xs bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-wider text-primary">
                    MES
                  </span>
                </Link>

                {/* Inline Nav Tabs with Segmented Rail Styling */}
                <nav
                  className="flex items-center gap-0.5 rounded-xs border border-border/70 bg-secondary/35 p-0.5 overflow-x-auto"
                  aria-label={t("nav.ariaLabel") || "Thanh điều hướng chính"}
                >
                  {visibleNav.map((n) => {
                    const isActive = location.pathname === n.to;
                    const label = t(n.labelKey) || n.label;
                    const shortcutText =
                      t("nav.shortcutHint", { key: n.shortcut }) || `Phím [${n.shortcut}]`;
                    return (
                      <Link
                        key={n.to}
                        to={n.to}
                        title={`${label} (${shortcutText})`}
                        className={`flex h-7.5 items-center gap-1.5 rounded-xs px-2.5 text-[11px] font-bold tracking-wide transition-all whitespace-nowrap active:scale-98 ${
                          isActive
                            ? "bg-slate-900 text-white border border-slate-800 shadow-sm font-black dark:bg-slate-100 dark:text-slate-950 dark:border-white"
                            : "text-muted-foreground hover:bg-card hover:text-foreground border border-transparent"
                        }`}
                      >
                        <n.icon
                          size={13.5}
                          className={`shrink-0 ${isActive ? "text-emerald-400 dark:text-emerald-600" : "text-muted-foreground"}`}
                        />
                        <span>{label}</span>
                        <span
                          className={`font-mono text-[9px] tabular-nums rounded-xs px-1 py-0.2 hidden sm:inline-block ${
                            isActive
                              ? "bg-slate-800 text-emerald-300 border border-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:border-slate-300 font-bold"
                              : "bg-muted/60 text-muted-foreground/80"
                          }`}
                        >
                          [{n.shortcut}]
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              {/* Right Area: Controls, Role Switcher, Clock, Language Switcher, Theme, User & Logout */}
              <div className="flex items-center gap-1 md:gap-2 shrink-0">
                {/* Role Impersonation Switcher (Chỉ cho Admin) */}
                {role === "admin" && (
                  <div
                    className={`flex h-7 items-center gap-1 rounded-xs border px-1.5 text-xs transition-colors ${
                      impersonatedRole
                        ? "border-warning bg-warning/15 text-warning font-bold"
                        : "border-border/80 bg-secondary/70 text-foreground"
                    }`}
                    title={
                      t("common.rolesExtended.switcherTooltip") ||
                      "Chuyển đổi góc nhìn kiểm tra phân quyền"
                    }
                  >
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground hidden 2xl:inline">
                      {t("common.view") || "Góc nhìn"}:
                    </span>
                    <select
                      value={impersonatedRole ?? "admin"}
                      onChange={(e) => {
                        const val = e.target.value;
                        setImpersonatedRole(val === "admin" ? null : (val as Role));
                        toast.info(
                          val === "admin"
                            ? t("common.rolesExtended.revertToast") ||
                                "Đã quay lại góc nhìn Admin thực tế"
                            : t("common.rolesExtended.impersonateToast", {
                                role: roleLabel(val as Role),
                              }) || `Đang giả lập góc nhìn: ${roleLabel(val as Role)}`,
                        );
                      }}
                      className="bg-transparent text-[10px] font-bold text-foreground outline-none cursor-pointer"
                    >
                      <option value="admin" className="bg-popover text-popover-foreground">
                        🛡️ {t("common.roles.admin") || "Admin (Toàn quyền)"}
                      </option>
                      <option value="leader" className="bg-popover text-popover-foreground">
                        👷 {t("common.roles.leader") || "Leader (Phân xưởng)"}
                      </option>
                      <option value="viewer" className="bg-popover text-popover-foreground">
                        👁️ {t("common.roles.viewer") || "Viewer (Mã hóa đối tác)"}
                      </option>
                      <option value="qt_yamaichi" className="bg-popover text-popover-foreground">
                        🏭 {t("common.roles.qt_yamaichi") || "Đối tác YAMAICHI"}
                      </option>
                      <option value="qt_provision" className="bg-popover text-popover-foreground">
                        🏭 {t("common.roles.qt_provision") || "Đối tác PROVISION"}
                      </option>
                    </select>
                    {impersonatedRole && (
                      <button
                        type="button"
                        onClick={() => setImpersonatedRole(null)}
                        className="rounded-xs bg-destructive/20 px-1 py-0.2 text-[9px] font-bold text-destructive hover:bg-destructive/30 cursor-pointer"
                        title={t("common.rolesExtended.cancelImpersonate") || "Hủy giả lập"}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}

                {/* Digital LED Real-time Clock */}
                <div className="hidden lg:block">
                  <LedClock locale={locale} />
                </div>

                {/* Trilingual Segmented Micro-Pill Switcher (VI | EN | JA) */}
                <div
                  className="flex items-center rounded-xs border border-border/80 bg-secondary/50 p-0.5"
                  title={
                    t("common.langSwitcher.title") ||
                    "Chuyển đổi ngôn ngữ / Switch Language / 言語切替"
                  }
                  role="group"
                  aria-label={t("common.langSwitcher.ariaLabel") || "Chọn ngôn ngữ hệ thống"}
                >
                  {locales.map((item) => {
                    const isCurrent = locale === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => {
                          setLocale(item.code);
                          playAudioCue("beep");
                        }}
                        className={`h-6 px-1.5 text-[10px] font-mono font-bold tracking-wider rounded-xs transition-all cursor-pointer ${
                          isCurrent
                            ? "bg-slate-900 text-emerald-300 border border-slate-800 shadow-2xs font-black dark:bg-slate-100 dark:text-slate-950 dark:border-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                        title={`${item.label} (${item.nativeName})`}
                      >
                        {item.shortLabel}
                      </button>
                    );
                  })}
                </div>

                {/* Theme Toggle Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  title={
                    theme === "light"
                      ? t("common.themeDark") || "Chuyển Dark mode"
                      : t("common.themeLight") || "Chuyển Light mode"
                  }
                  aria-label={theme === "light" ? "Chuyển Dark mode" : "Chuyển Light mode"}
                  onClick={toggleTheme}
                >
                  {theme === "light" ? <Moon size={14} /> : <Sun size={14} />}
                </Button>

                {/* User Profile Pill */}
                <div className="flex h-7 items-center gap-1.5 rounded-xs border border-border/80 bg-secondary/50 px-2 py-0.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-xs bg-primary/20 text-[9px] font-mono font-black text-primary">
                    QT
                  </span>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-[10px] font-bold leading-none truncate max-w-[100px]">
                      {user}
                    </span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`inline-block rounded-xs px-0.5 py-0 text-[7px] font-bold tracking-wide ${roleBadge(effectiveRole)}`}
                      >
                        {roleLabel(effectiveRole).toUpperCase()}
                      </span>
                      {impersonatedRole && (
                        <span className="text-[7px] text-warning font-mono font-bold">
                          {t("common.rolesExtended.impersonatedBadge") || "(GIẢ LẬP)"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                  title={t("common.logout") || "Đăng xuất khỏi hệ thống"}
                  aria-label={t("common.rolesExtended.logoutAria") || "Đăng xuất"}
                  onClick={logout}
                >
                  <LogOut size={14} />
                </Button>
              </div>
            </div>
          </header>

          {/* Shopfloor Telemetry Live Bar */}
          <div className="shrink-0">
            <ShopfloorTelemetry />
          </div>

          {/* Main Page Content */}
          <main
            // prettier-ignore
            className={`w-full flex-1 min-h-0 flex flex-col px-2.5 py-1.5 md:px-4 md:py-2 ${
              isTracking ? 'overflow-y-auto md:overflow-hidden' : 'overflow-y-auto'
            }`}
          >
            {!ready ? (
              <div className="flex min-h-[400px] items-center justify-center text-sm font-medium text-muted-foreground">
                {t("common.loading.permissions") || "Đang tải dữ liệu phân quyền…"}
              </div>
            ) : loading && rawDataset.length === 0 ? (
              <BootSkeleton />
            ) : loadError && rawDataset.length === 0 ? (
              <div role="alert" className="mes-card mx-auto mt-10 max-w-xl p-6">
                <p className="font-semibold text-foreground">
                  {t("common.loading.failedTitle") || "Chưa tải được dữ liệu sản xuất"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
                <Button className="mt-4 active:scale-[0.98]" onClick={() => void pullLive()}>
                  {t("common.retry") || "Thử lại"}
                </Button>
              </div>
            ) : (
              children
            )}
          </main>

          {/* Footer */}
          <footer
            className={`flex flex-wrap items-center justify-between gap-2 border-t border-border bg-card/40 px-4 py-2 text-[10px] text-muted-foreground xl:px-6 shrink-0 ${
              isCockpitRoute ? "md:hidden" : ""
            }`}
          >
            <span>
              {t("common.footer.copyright") ||
                "© 2026 DYNAMO VIETNAM QT - MES · Hệ thống luân chuyển nhiệt luyện & xi mạ"}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-primary" />{" "}
              {t("common.footer.runtime") || "Môi trường mô phỏng (Edge Runtime)"}
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
        <p className="mb-1 text-[10px] font-bold tracking-[.2em] text-primary uppercase">
          {eyebrow}
        </p>
        <h1 className="font-display text-[24px] font-extrabold tracking-tight text-foreground md:text-[28px]">
          {title}
        </h1>
        <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function BootSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <div className="flex items-center gap-2.5 text-sm font-medium text-muted-foreground">
        <span className="size-2 animate-pulse rounded-full bg-warning" />
        {t("common.loading.syncing") || "Đang đồng bộ dữ liệu nhiệt luyện từ Google Sheets…"}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="mes-card h-24 animate-pulse bg-muted/40" />
        ))}
      </div>
      <div className="mes-card space-y-3 p-5">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 animate-pulse rounded-xs bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
