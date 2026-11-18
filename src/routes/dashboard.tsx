import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  Coins,
  Cpu,
  Database,
  ExternalLink,
  Filter,
  Layers,
  LayoutGrid,
  List,
  Lock,
  Package,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { useDynamo } from '@/components/dynamo-shell';
import { useTranslation } from '@/i18n';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { JobTicketButton } from '@/components/job-ticket';
import { money, number, type QTItem } from '@/lib/dynamo-data';
import { canViewPricing, formatVendorName, getVendorScope } from '@/lib/dynamo-auth';
import {
  daysOver,
  hasValidDue,
  isDone,
  isDueSoon,
  isMissingDue,
  isOpen,
  isOverdue,
  logisticsOf,
  onTimeRate,
  type Logistics,
} from '@/lib/dynamo-rules';
import { failedSyncIds } from '@/lib/dynamo-workflow';
import { computeMetallurgyAnalytics } from '@/lib/metallurgy-engine';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Tổng quan | DYNAMO VIETNAM QT - MES' },
      { name: 'description', content: 'Trung tâm phân tích dữ liệu điều hành và tài chính gia công nhiệt luyện QT.' },
      { property: 'og:title', content: 'Tổng quan | DYNAMO VIETNAM QT - MES' },
      { property: 'og:description', content: 'Theo dõi chi phí toàn thời gian, WIP, tỷ lệ OTD, rủi ro đọng vốn, kỹ thuật luyện kim.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Dashboard,
});

/**
 * StatusDot component exported for /orders and throughout the system
 * Strictly complies with Graphite Wireframe UI (micro LED dot size-1.5 rounded-full)
 */
export function StatusDot({ status }: { status: string }) {
  const color =
    status === 'Đã nhập kho'
      ? 'bg-primary'
      : status === 'Đang tại Vendor'
        ? 'bg-amber-500'
        : 'bg-muted-foreground';
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-mono font-medium text-foreground">
      <span className={`size-1.5 rounded-full ${color}`} />
      {status}
    </span>
  );
}

export type Period = 'all' | 'today' | 'week' | 'this' | 'prev' | 'q1' | 'q2' | 'q3' | 'q4' | 'year';
type TechTab = 'otd' | 'aging' | 'workload' | 'metallurgy';
type FinTab = 'trajectory' | 'risk' | 'unit_cost';
type MatrixTab = 'vendor' | 'workshop' | 'orders';
type BottleneckTab = 'all' | 'overdue' | 'due_soon' | 'missing_due' | 'sync_error';
type BottleneckView = 'table' | 'grid';

const sel = 'h-7.5 rounded-xs border border-input bg-background px-2 text-xs text-foreground outline-none transition-colors focus:border-primary font-mono';

function Dashboard() {
  const { t, locale } = useTranslation();
  const { filtered, workshop, role, pullLive, loading } = useDynamo();

  // Filters State
  const [period, setPeriod] = useState<Period>('all');
  const [vendor, setVendor] = useState<string>('all');
  const [logi, setLogi] = useState<'all' | Logistics>('all');

  // Visualization Tabs State
  const [techTab, setTechTab] = useState<TechTab>('otd');
  const [finTab, setFinTab] = useState<FinTab>('trajectory');
  const [matrixTab, setMatrixTab] = useState<MatrixTab>('vendor');

  // Tooltip hover states for pure SVG wireframe charts
  const [hoveredFunnel, setHoveredFunnel] = useState<string | null>(null);
  const [hoveredHrc, setHoveredHrc] = useState<string | null>(null);

  // Bottleneck Command Center State
  const [bottleneckTab, setBottleneckTab] = useState<BottleneckTab>('all');
  const [bottleneckView, setBottleneckView] = useState<BottleneckView>('table');
  const [bottleneckSearch, setBottleneckSearch] = useState('');
  const [bottleneckPage, setBottleneckPage] = useState(0);
  const BOTTLENECK_PAGE_SIZE = 12;

  const [failed, setFailed] = useState<Set<string>>(new Set());
  useEffect(() => {
    const f = () => setFailed(failedSyncIds());
    f();
    window.addEventListener('dynamo-audit', f);
    return () => window.removeEventListener('dynamo-audit', f);
  }, []);

  // Keyboard shortcut: Shift+R to refresh
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'R' || e.key === 'r')) {
        e.preventDefault();
        pullLive(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pullLive]);

  const rawVendors = useMemo(() => [...new Set(filtered.map((i) => String(i.cty_QT)))].sort(), [filtered]);

  // Date helpers for 10 enterprise reporting periods (Epoch millisecond aware)
  const now = new Date();
  const currentYear = now.getFullYear();
  const todayIso = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekAgo = new Date(currentYear, now.getMonth(), now.getDate() - 7);
  const weekAgoIso = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
  const thisMonthIso = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(currentYear, now.getMonth() - 1, 1);
  const prevMonthIso = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const rows = useMemo(() => {
    return filtered.filter((i) => {
      const gDate = i.ngay_gui_QT || i.ngay_gui_qt || '';
      if (period === 'today' && !gDate.startsWith(todayIso)) return false;
      if (period === 'week' && (gDate < weekAgoIso || gDate > todayIso)) return false;
      if (period === 'this' && !gDate.startsWith(thisMonthIso)) return false;
      if (period === 'prev' && !gDate.startsWith(prevMonthIso)) return false;
      if (period === 'q1' && (gDate < `${currentYear}-01-01` || gDate > `${currentYear}-03-31`)) return false;
      if (period === 'q2' && (gDate < `${currentYear}-04-01` || gDate > `${currentYear}-06-30`)) return false;
      if (period === 'q3' && (gDate < `${currentYear}-07-01` || gDate > `${currentYear}-09-30`)) return false;
      if (period === 'q4' && (gDate < `${currentYear}-10-01` || gDate > `${currentYear}-12-31`)) return false;
      if (period === 'year' && !gDate.startsWith(String(currentYear))) return false;

      return (
        (vendor === 'all' || i.cty_QT === vendor || i.cty_qt === vendor) &&
        (logi === 'all' || logisticsOf(i) === logi)
      );
    });
  }, [filtered, period, todayIso, weekAgoIso, thisMonthIso, prevMonthIso, currentYear, vendor, logi]);

  const hasPricing = canViewPricing(role);

  // 1. ALL-TIME METRICS (All filtered data across all periods - Baseline anchor)
  const allTimeCost = useMemo(() => filtered.reduce((sum, r) => sum + (r.thanh_tien || 0), 0), [filtered]);
  const allTimeKg = useMemo(() => filtered.filter((r) => r.don_vi_tinh === 'Kg').reduce((sum, r) => sum + (r.kg_Lot || r.kg_lot || 0), 0), [filtered]);
  const allTimePcs = useMemo(() => filtered.filter((r) => r.don_vi_tinh === 'pcs').reduce((sum, r) => sum + (r.so_luong || 0), 0), [filtered]);

  // 2. PERIOD METRICS (Filtered by period dropdown - Memoized Single-Pass O(N))
  const periodMetrics = useMemo(() => {
    let openKg = 0;
    let openPcs = 0;
    let inTransitKg = 0;
    let periodCost = 0;
    let costAtRisk = 0;

    const openLots: QTItem[] = [];
    const inTransitLots: QTItem[] = [];
    const overdueLots: QTItem[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      const cost = r.thanh_tien || 0;
      periodCost += cost;

      if (isOpen(r)) {
        openLots.push(r);
        if (r.don_vi_tinh === 'Kg') openKg += (r.kg_Lot || r.kg_lot || 0);
        else if (r.don_vi_tinh === 'pcs') openPcs += (r.so_luong || 0);
      }

      if (logisticsOf(r) === 'Đang tại Vendor') {
        inTransitLots.push(r);
        if (r.don_vi_tinh === 'Kg') inTransitKg += (r.kg_Lot || r.kg_lot || 0);
      }

      if (isOverdue(r)) {
        overdueLots.push(r);
        costAtRisk += cost;
      }
    }

    overdueLots.sort((a, b) => daysOver(b) - daysOver(a));
    const maxDelay = overdueLots.length > 0 ? daysOver(overdueLots[0]!) : 0;
    const criticalOverdueLots = overdueLots.filter((r) => daysOver(r) > 7);
    const otdStat = onTimeRate(rows);
    const periodSharePercent = allTimeCost > 0 ? Math.round((periodCost / allTimeCost) * 100) : 100;

    return {
      openLots,
      openKg,
      openPcs,
      inTransitLots,
      inTransitKg,
      overdueLots,
      maxDelay,
      criticalOverdueLots,
      otdStat,
      periodCost,
      costAtRisk,
      periodSharePercent,
    };
  }, [rows, allTimeCost]);

  const {
    openLots,
    openKg,
    openPcs,
    inTransitLots,
    inTransitKg,
    overdueLots,
    maxDelay,
    criticalOverdueLots,
    otdStat,
    periodCost,
    costAtRisk,
    periodSharePercent,
  } = periodMetrics;

  // 3. METALLURGY ANALYTICS (Senior DA Engine)
  const metallurgy = useMemo(() => computeMetallurgyAnalytics(rows), [rows]);

  // 4. FLOW FUNNEL (4 Stages)
  const flowFunnel = useMemo(() => {
    let choXuat = 0;
    let choXuatKg = 0;
    let dangVendor = 0;
    let dangVendorKg = 0;
    let choQc = 0;
    let choQcKg = 0;
    let daNhap = 0;
    let daNhapKg = 0;

    for (const r of rows) {
      const kg = r.kg_lot || r.kg_Lot || 0;
      if (r.TrangThai === 'Chờ xuất xưởng') {
        choXuat++;
        choXuatKg += kg;
      } else if (r.TrangThai === 'Đang tại Vendor') {
        dangVendor++;
        dangVendorKg += kg;
      } else if (r.TrangThai === 'Kiểm tra QC') {
        choQc++;
        choQcKg += kg;
      } else if (r.TrangThai === 'Đã nhập kho') {
        daNhap++;
        daNhapKg += kg;
      }
    }

    const total = rows.length || 1;
    return [
      { stage: '1. Chờ xuất xưởng', lots: choXuat, kg: Math.round(choXuatKg * 10) / 10, pct: Math.round((choXuat / total) * 100), color: 'bg-muted-foreground' },
      { stage: '2. Đang nhiệt (Vendor)', lots: dangVendor, kg: Math.round(dangVendorKg * 10) / 10, pct: Math.round((dangVendor / total) * 100), color: 'bg-amber-500' },
      { stage: '3. Chờ QC kho', lots: choQc, kg: Math.round(choQcKg * 10) / 10, pct: Math.round((choQc / total) * 100), color: 'bg-info' },
      { stage: '4. Đã nhập kho (DONE)', lots: daNhap, kg: Math.round(daNhapKg * 10) / 10, pct: Math.round((daNhap / total) * 100), color: 'bg-primary' },
    ];
  }, [rows]);

  // 5. AGING TIERS DISTRIBUTION
  const agingTiers = useMemo(() => {
    let t24h = 0;
    let t48h = 0;
    let t3to7d = 0;
    let tOver7d = 0;

    for (const lot of openLots) {
      if (isOverdue(lot)) {
        const d = daysOver(lot);
        if (d > 7) tOver7d++;
        else t3to7d++;
      } else if (isDueSoon(lot)) {
        t48h++;
      } else {
        t24h++;
      }
    }
    const total = openLots.length || 1;
    return [
      { key: 'safe', label: '< 24h (Bình thường)', count: t24h, pct: Math.round((t24h / total) * 100), color: 'bg-emerald-500' },
      { key: 'soon', label: '24h - 48h (Cận hạn)', count: t48h, pct: Math.round((t48h / total) * 100), color: 'bg-amber-500' },
      { key: 'mod', label: '3 - 7 ngày (Trễ vừa)', count: t3to7d, pct: Math.round((t3to7d / total) * 100), color: 'bg-orange-500' },
      { key: 'crit', label: '> 7 ngày (Trễ nghiêm trọng)', count: tOver7d, pct: Math.round((tOver7d / total) * 100), color: 'bg-destructive' },
    ];
  }, [openLots]);

  // 6. OTD TREND (W-3, W-2, W-1, W-0)
  const otdTrend = useMemo(() => {
    const DAY = 86400000;
    const nowMs = new Date().getTime();
    const weeks = [3, 2, 1, 0].map((w) => {
      const startMs = nowMs - (w + 1) * 7 * DAY;
      const endMs = nowMs - w * 7 * DAY;
      const wLots = filtered.filter((r) => {
        if (!r.ngay_nhan) return false;
        const d = new Date(r.ngay_nhan + 'T00:00:00').getTime();
        return !Number.isNaN(d) && d >= startMs && d < endMs;
      });
      const r = onTimeRate(wLots);
      return {
        week: `W-${w}`,
        rate: r.rate !== null ? Math.round(r.rate * 100) : null,
        count: r.denominator,
      };
    });
    const valid = weeks.filter((w) => w.rate !== null);
    let delta = 0;
    if (valid.length >= 2) {
      const curr = valid[valid.length - 1]?.rate ?? 0;
      const prev = valid[valid.length - 2]?.rate ?? 0;
      delta = curr - prev;
    }
    return { weeks, delta };
  }, [filtered]);

  // 7. WORKSHOP & TECHNICAL MATRIX - Capacity Allocation Bars
  const workshopCapacity = useMemo(() => {
    const map = new Map<string, { lots: number; kg: number; pcs: number; overdue: number }>();
    let totalKg = 0;
    for (const r of rows) {
      const ws = r.phong_sx || 'KXD';
      const cur = map.get(ws) || { lots: 0, kg: 0, pcs: 0, overdue: 0 };
      cur.lots++;
      if (r.don_vi_tinh === 'Kg') {
        const kg = r.kg_Lot || r.kg_lot || 0;
        cur.kg += kg;
        totalKg += kg;
      }
      if (r.don_vi_tinh === 'pcs') cur.pcs += r.so_luong || 0;
      if (isOverdue(r)) cur.overdue++;
      map.set(ws, cur);
    }
    return [...map.entries()].map(([ws, data]) => ({
      workshop: ws,
      ...data,
      sharePct: totalKg > 0 ? Math.round((data.kg / totalKg) * 100) : 0,
    }));
  }, [rows]);

  // 8. VENDOR FINANCIAL & OPERATIONAL BREAKDOWN
  const vendorBreakdown = useMemo(() => {
    const map = new Map<
      string,
      { lots: number; kg: number; pcs: number; overdue: number; cost: number; risk: number; totalCompleted: number; onTimeCompleted: number }
    >();
    for (const r of rows) {
      const v = String(r.cty_QT || r.cty_qt || 'KXD');
      const cur = map.get(v) || { lots: 0, kg: 0, pcs: 0, overdue: 0, cost: 0, risk: 0, totalCompleted: 0, onTimeCompleted: 0 };
      cur.lots++;
      if (r.don_vi_tinh === 'Kg') cur.kg += r.kg_Lot || r.kg_lot || 0;
      if (r.don_vi_tinh === 'pcs') cur.pcs += r.so_luong || 0;
      cur.cost += r.thanh_tien || 0;
      if (isOverdue(r)) {
        cur.overdue++;
        cur.risk += r.thanh_tien || 0;
      }
      if (isDone(r) && hasValidDue(r)) {
        cur.totalCompleted++;
        const due = r.ncc_ngay_tra_qt || r.han_tra || '';
        if (r.ngay_nhan && r.ngay_nhan <= due) cur.onTimeCompleted++;
      }
      map.set(v, cur);
    }
    return [...map.entries()]
      .map(([v, d]) => ({
        vendor: v,
        ...d,
        otd: d.totalCompleted > 0 ? Math.round((d.onTimeCompleted / d.totalCompleted) * 100) : null,
      }))
      .sort((a, b) => b.cost - a.cost || b.lots - a.lots);
  }, [rows]);

  // 9. AT-RISK ORDERS (Strategic bridge to /orders)
  const atRiskOrders = useMemo(() => {
    const groups = new Map<string, QTItem[]>();
    for (const item of filtered) {
      const orderId = item.So_DatHang || item.so_dat_hang;
      if (!orderId) continue;
      const list = groups.get(orderId);
      if (list) list.push(item);
      else groups.set(orderId, [item]);
    }

    const results = [];
    for (const [orderNo, lots] of groups.entries()) {
      const totalLots = lots.length;
      const stockedLots = lots.filter(isDone).length;
      const open = totalLots - stockedLots;
      if (open === 0) continue;

      const overdueCount = lots.filter((lot) => isOverdue(lot)).length;
      const soonCount = lots.filter((lot) => isDueSoon(lot)).length;
      const totalCost = lots.reduce((sum, r) => sum + (r.thanh_tien || 0), 0);
      const riskCost = lots.filter((lot) => isOverdue(lot)).reduce((sum, r) => sum + (r.thanh_tien || 0), 0);

      const riskScore = overdueCount * 3 + soonCount * 1.5;
      if (riskScore > 0) {
        results.push({
          orderNo,
          partner: lots[0]?.cty_QT || lots[0]?.cty_qt || '',
          workshop: lots[0]?.phong_sx || '',
          totalLots,
          stockedLots,
          openLots: open,
          overdueLots: overdueCount,
          soonLots: soonCount,
          totalCost,
          riskCost,
          riskScore,
          completionPercent: Math.round((stockedLots / totalLots) * 100),
        });
      }
    }
    return results.sort((a, b) => b.riskScore - a.riskScore || b.riskCost - a.riskCost).slice(0, 8);
  }, [filtered]);

  // 10. BOTTLENECK COMMAND CENTER (Data Hygiene separated)
  const missingDueLots = rows.filter(isMissingDue);
  const soonLots = rows.filter((lot) => isDueSoon(lot));
  const syncErrLots = rows.filter((r) => failed.has(r.ID_Key || r.id_nhiet_qt));

  // Critical operational bottlenecks (Excluding passive missing due date lots)
  const allBottleneckItems = useMemo(() => {
    const seen = new Set<string>();
    const list: { item: QTItem; reason: string; severity: 'crit' | 'warn' | 'info' }[] = [];

    // Overdue: critical
    for (const r of overdueLots) {
      const key = r.ID_Key || r.id_nhiet_qt;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ item: r, reason: `Quá hạn ${daysOver(r)} ngày`, severity: 'crit' });
      }
    }
    // Due Soon 48h: warning
    for (const r of soonLots) {
      const key = r.ID_Key || r.id_nhiet_qt;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ item: r, reason: 'Cận hạn hoàn trả 48h', severity: 'warn' });
      }
    }
    // Sheet Sync Error: crit
    for (const r of syncErrLots) {
      const key = r.ID_Key || r.id_nhiet_qt;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({ item: r, reason: 'Lần cập nhật gần nhất chưa ghi được lên Sheet', severity: 'crit' });
      }
    }
    return list;
  }, [overdueLots, soonLots, syncErrLots]);

  // Filtered bottlenecks by Tab and Search (Supporting Data Hygiene missing_due tab)
  const filteredBottlenecks = useMemo(() => {
    let source: { item: QTItem; reason: string; severity: 'crit' | 'warn' | 'info' }[] = [];

    if (bottleneckTab === 'missing_due') {
      source = missingDueLots.map((r) => ({
        item: r,
        reason: 'Thiếu hạn trả cam kết từ nguồn',
        severity: 'warn' as const,
      }));
    } else {
      source = allBottleneckItems.filter(({ item }) => {
        const key = item.ID_Key || item.id_nhiet_qt;
        if (bottleneckTab === 'overdue' && !isOverdue(item)) return false;
        if (bottleneckTab === 'due_soon' && !isDueSoon(item)) return false;
        if (bottleneckTab === 'sync_error' && !failed.has(key)) return false;
        return true;
      });
    }

    if (!bottleneckSearch.trim()) return source;

    const q = bottleneckSearch.trim().toLowerCase();
    return source.filter(({ item, reason }) => {
      const key = item.ID_Key || item.id_nhiet_qt;
      return (
        key.toLowerCase().includes(q) ||
        item.ma_hang.toLowerCase().includes(q) ||
        String(item.cty_QT || item.cty_qt).toLowerCase().includes(q) ||
        item.phong_sx.toLowerCase().includes(q) ||
        reason.toLowerCase().includes(q)
      );
    });
  }, [allBottleneckItems, missingDueLots, bottleneckTab, bottleneckSearch, failed]);

  const totalBottleneckPages = Math.ceil(filteredBottlenecks.length / BOTTLENECK_PAGE_SIZE) || 1;
  const pagedBottlenecks = useMemo(() => {
    const start = bottleneckPage * BOTTLENECK_PAGE_SIZE;
    return filteredBottlenecks.slice(start, start + BOTTLENECK_PAGE_SIZE);
  }, [filteredBottlenecks, bottleneckPage]);

  const canUpdate = (item: QTItem) => {
    if (role === 'admin') return true;
    const v = getVendorScope(role);
    return !!(v && v === String(item.cty_QT || item.cty_qt).toUpperCase());
  };

  const resetFilters = () => {
    setPeriod('all');
    setVendor('all');
    setLogi('all');
  };

  const isFiltered = period !== 'all' || vendor !== 'all' || logi !== 'all';

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden space-y-3 pr-0.5 pb-2 font-mono tabular-nums">
      {/* ========================================================================= */}
      {/* [TẦNG 1] Master Command Toolbar (Ghim Sticky & 10 Bộ Lọc Kỳ Doanh Nghiệp) */}
      {/* ========================================================================= */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/80 pb-2 mb-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black tracking-wider uppercase text-foreground flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              [2] TỔNG QUAN LUÂN CHUYỂN
            </span>
            <span className="rounded-xs border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
              {workshop === 'Tất cả' ? (t('tracking.workshops.all') || 'TẤT CẢ PHÂN XƯỞNG') : `${t('tracking.workshops.title') || 'XƯỞNG'} ${workshop}`}
            </span>
            <span className="rounded-xs border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
              {number(rows.length)} / {number(filtered.length)} LÔ KỲ NÀY
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/60 hidden xl:inline">SOP-MES-08</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mr-1">
              <Filter size={12} className="text-primary" />
              <span className="font-mono text-[10px] uppercase">LỌC KỲ:</span>
            </div>

            {/* 10 Enterprise Reporting Periods */}
            <select
              aria-label="Kỳ báo cáo"
              className={sel}
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as Period);
                setBottleneckPage(0);
              }}
            >
              <option value="all">Toàn bộ kỳ (All-Time)</option>
              <option value="today">Hôm nay (Today)</option>
              <option value="week">7 ngày qua (7D)</option>
              <option value="this">Tháng này (Current Month)</option>
              <option value="prev">Tháng trước (Last Month)</option>
              <option value="q1">Quý 1 (Q1: Jan-Mar)</option>
              <option value="q2">Quý 2 (Q2: Apr-Jun)</option>
              <option value="q3">Quý 3 (Q3: Jul-Sep)</option>
              <option value="q4">Quý 4 (Q4: Oct-Dec)</option>
              <option value="year">Cả năm ({currentYear})</option>
            </select>

            {/* Vendor Filter */}
            <select
              aria-label="Vendor"
              className={sel}
              value={vendor}
              onChange={(e) => {
                setVendor(e.target.value);
                setBottleneckPage(0);
              }}
            >
              <option value="all">Mọi đối tác</option>
              {rawVendors.map((v) => (
                <option key={v} value={v}>
                  {formatVendorName(v, role, locale)}
                </option>
              ))}
            </select>

            {/* Logistics Filter */}
            <select
              aria-label="Trạng thái logistics"
              className={sel}
              value={logi}
              onChange={(e) => {
                setLogi(e.target.value as Logistics);
                setBottleneckPage(0);
              }}
            >
              <option value="all">Mọi tiến độ</option>
              <option value="Chờ xuất xưởng">Chờ xuất xưởng</option>
              <option value="Đang tại Vendor">Đang tại Vendor (HEAT)</option>
              <option value="Đã nhập kho">Hoàn tất (DONE)</option>
            </select>

            {isFiltered && (
              <button
                onClick={resetFilters}
                title="Đặt lại bộ lọc"
                className="flex h-7.5 items-center gap-1 rounded-xs border border-border bg-secondary/80 px-2 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <RotateCcw size={11} />
                <span>Xóa lọc</span>
              </button>
            )}

            {/* Refresh Button & Shift+R Shortcut */}
            <button
              onClick={() => pullLive(true)}
              disabled={loading}
              title="Làm mới dữ liệu từ Google Sheets (Shift+R)"
              className="flex h-7.5 items-center gap-1 rounded-xs border border-border bg-card px-2 font-mono text-[11px] font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin text-primary' : ''} />
              <span>Làm mới</span>
              <span className="hidden sm:inline-block rounded-xs bg-muted px-1 py-0.2 text-[9px] text-muted-foreground">Shift+R</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [TẦNG 2] Strategic Executive KPI Matrix (Không Trùng Lặp - Phân Tách Rõ Ràng) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* KPI 1: TỔNG CHI PHÍ NHIỆT LUYỆN TOÀN THỜI GIAN (ALL-TIME COST) */}
        <div className="rounded-xs border border-primary/40 bg-card p-2.5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
              [KPI-01] TỔNG TIỀN NHIỆT (ALL-TIME)
            </span>
            {hasPricing ? <Coins size={14} className="text-primary" /> : <Lock size={13} className="text-muted-foreground" />}
          </div>
          <div className="my-1">
            {canViewPricing(role) ? (
              <div
                className="font-mono text-base font-black tabular-nums tracking-tight text-foreground truncate"
                title={`${number(allTimeCost)} VNĐ`}
              >
                {money(allTimeCost)}
              </div>
            ) : (
              <div className="font-mono text-xs font-bold text-muted-foreground py-0.5">CHỈ ĐỌC / NỘI BỘ</div>
            )}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            <span>{number(allTimeKg)} Kg</span>
            <span>{number(allTimePcs)} Pcs · {number(filtered.length)} Lô hệ thống</span>
          </div>
        </div>

        {/* KPI 2: TỔNG LÔ ĐANG MỞ (WIP ACTIVE) */}
        <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">LÔ ĐANG MỞ (WIP)</span>
            <Boxes size={14} className="text-info" />
          </div>
          <div className="my-1">
            <div className="font-mono text-base font-black tabular-nums tracking-tight text-foreground">
              {number(openLots.length)} <span className="text-[11px] font-normal text-muted-foreground">Lô</span>
            </div>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            <span>{number(openKg)} Kg</span>
            <span>{number(openPcs)} Pcs</span>
          </div>
        </div>

        {/* KPI 3: LÔ TẠI VENDOR (IN-TRANSIT / HEAT) */}
        <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">ĐANG NHIỆT / VENDOR</span>
            <Package size={14} className="text-amber-500" />
          </div>
          <div className="my-1">
            <div className="font-mono text-base font-black tabular-nums tracking-tight text-foreground">
              {number(inTransitLots.length)} <span className="text-[11px] font-normal text-muted-foreground">Lô</span>
            </div>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            <span>Tải lò: {number(inTransitKg)} Kg</span>
            <span className="text-muted-foreground">
              {rows.length > 0 ? Math.round((inTransitLots.length / rows.length) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* KPI 4: QUÁ HẠN & MỨC ĐỘ TRỄ MAX (OVERDUE & SLA) */}
        <div
          className={`rounded-xs border p-2.5 shadow-2xs flex flex-col justify-between ${overdueLots.length > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'
            }`}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-destructive">QUÁ HẠN (SLA)</span>
            <Clock3 size={14} className="text-destructive" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <div className="font-mono text-base font-black tabular-nums tracking-tight text-destructive">
              {number(overdueLots.length)} <span className="text-[11px] font-normal text-muted-foreground">Lô</span>
            </div>
            {maxDelay > 0 && (
              <span className="font-mono text-[10px] font-bold text-destructive">Max trễ: {maxDelay}d</span>
            )}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            <span>Trễ &gt;7d: {number(criticalOverdueLots.length)} Lô</span>
            <span className="text-destructive font-bold">
              {openLots.length > 0 ? Math.round((overdueLots.length / openLots.length) * 100) : 0}% WIP
            </span>
          </div>
        </div>

        {/* KPI 5: TỶ LỆ ĐÚNG HẠN TRONG KỲ (OTD RATE) */}
        <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">ĐÚNG HẠN (OTD)</span>
            <ShieldCheck size={14} className="text-emerald-500" />
          </div>
          <div className="my-1 flex items-baseline gap-1.5">
            <div className="font-mono text-base font-black tabular-nums tracking-tight text-foreground">
              {otdStat.rate !== null ? `${Math.round(otdStat.rate * 100)}%` : '---'}
            </div>
            {otdTrend.delta !== 0 && (
              <span
                className={`font-mono text-[10px] font-bold flex items-center ${otdTrend.delta > 0 ? 'text-emerald-500' : 'text-destructive'
                  }`}
              >
                {otdTrend.delta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {otdTrend.delta > 0 ? `+${otdTrend.delta}%` : `${otdTrend.delta}%`}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
            <span>Đã giao: {number(otdStat.denominator)} Lô</span>
            <span className="text-primary font-semibold">&ge;95% Target</span>
          </div>
        </div>

        {/* KPI 6: CHI PHÍ TRONG KỲ ĐƯỢC CHỌN & RỦI RO ĐỌNG VỐN */}
        <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
              {period === 'all' ? 'CHI PHÍ KỲ & RỦI RO' : 'NGÂN SÁCH KỲ NÀY'}
            </span>
            {hasPricing ? <Wallet size={14} className="text-primary" /> : <Lock size={13} className="text-muted-foreground" />}
          </div>
          <div className="my-1">
            {hasPricing ? (
              <div
                className="font-mono text-sm font-black tabular-nums tracking-tight text-foreground truncate"
                title={`Chi phí kỳ: ${number(periodCost)} VNĐ`}
              >
                {money(periodCost)}
                {period !== 'all' && (
                  <span className="text-[10px] text-muted-foreground font-normal ml-1">
                    ({periodSharePercent}% tổng)
                  </span>
                )}
              </div>
            ) : (
              <div className="font-mono text-xs font-bold text-muted-foreground py-0.5">CHỈ ĐỌC / NỘI BỘ</div>
            )}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] border-t border-border/50 pt-1">
            <span className="text-muted-foreground">Rủi ro trễ:</span>
            <span className="font-bold text-destructive tabular-nums truncate">
              {hasPricing ? money(costAtRisk) : `${number(overdueLots.length)} Lô`}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [TẦNG 3] Bivariate Visualizer (2 Cụm Chuyên Sâu - 4 Tab Kỹ Thuật & 3 Tab Tài Chính) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* CỤM TRÁI: KỸ THUẬT & LUÂN CHUYỂN (TECHNICAL & FLOW ANALYTICS) */}
        <div className="rounded-xs border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase text-foreground">
              <Zap size={14} className="text-amber-500" />
              <span>PHÂN TÍCH KỸ THUẬT & LUÂN CHUYỂN</span>
            </div>

            {/* Strategic Tech Tabs */}
            <div className="flex items-center gap-0.5 bg-secondary/60 p-0.5 rounded-xs border border-border">
              <button
                onClick={() => setTechTab('otd')}
                className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${techTab === 'otd' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                OTD 4 Tuần
              </button>
              <button
                onClick={() => setTechTab('aging')}
                className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${techTab === 'aging' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Aging Tiers
              </button>
              <button
                onClick={() => setTechTab('workload')}
                className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${techTab === 'workload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Tải Trọng Xưởng
              </button>
              <button
                onClick={() => setTechTab('metallurgy')}
                className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors flex items-center gap-1 ${techTab === 'metallurgy' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Cpu size={10} />
                <span>Luyện Kim & FPY</span>
              </button>
            </div>
          </div>

          <div className="min-h-[148px] flex flex-col justify-center">
            {/* Tab 1: OTD Trend 4 Weeks */}
            {techTab === 'otd' && (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {otdTrend.weeks.map((w) => (
                    <div key={w.week} className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                      <div className="font-mono text-[10px] text-muted-foreground uppercase">{w.week}</div>
                      <div className="font-mono text-sm font-black tabular-nums my-0.5 text-foreground">
                        {w.rate !== null ? `${w.rate}%` : '---'}
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground">{w.count} Lô</div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                  <span>Delta tuần gần nhất: {otdTrend.delta > 0 ? `+${otdTrend.delta}%` : `${otdTrend.delta}%`}</span>
                  <span className="text-primary font-bold">Mục tiêu OTD: &ge; 95%</span>
                </div>
              </div>
            )}

            {/* Tab 2: Aging Tiers Breakdown & WIP Flow Funnel */}
            {techTab === 'aging' && (
              <div className="space-y-2">
                {/* WIP Stage Pipeline Funnel (Pure SVG Wireframe) */}
                <div className="p-2 rounded-xs bg-background/50 border border-border/70 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground uppercase">
                    <span className="flex items-center gap-1">
                      <Layers size={10} className="text-primary" />
                      <span>DÒNG CHẢY 4 CHẶNG LUÂN CHUYỂN (WIP PIPELINE FUNNEL)</span>
                    </span>
                    <span>Lead Time TB: {metallurgy.cycleTime.avgDays ?? '--'} ngày</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 relative">
                    {flowFunnel.map((st) => (
                      <div
                        key={st.stage}
                        onMouseEnter={() => setHoveredFunnel(st.stage)}
                        onMouseLeave={() => setHoveredFunnel(null)}
                        className="p-1 rounded-xs border border-border/60 bg-card hover:border-primary transition-colors cursor-default text-center relative"
                      >
                        <div className="font-mono text-[9px] text-muted-foreground truncate">{st.stage}</div>
                        <div className="font-mono text-xs font-black text-foreground">{number(st.lots)} Lô</div>
                        <div className="h-1 w-full bg-secondary rounded-xs overflow-hidden my-0.5">
                          <div className={`h-full ${st.color}`} style={{ width: `${Math.max(5, st.pct)}%` }} />
                        </div>
                        <div className="font-mono text-[9px] text-muted-foreground">{number(st.kg)} Kg ({st.pct}%)</div>

                        {/* Tooltip khi hover */}
                        {hoveredFunnel === st.stage && (
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                            <div className="font-bold">{st.stage}</div>
                            <div>Khối lượng: {number(st.kg)} Kg ({st.pct}%)</div>
                            <div>Số lượng: {number(st.lots)} Lô</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4 Tầng Quá Hạn & Cận Hạn */}
                <div className="space-y-1">
                  {agingTiers.map((tier) => (
                    <div key={tier.key} className="space-y-0.5">
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-foreground font-semibold">{tier.label}</span>
                        <span className="tabular-nums font-bold text-muted-foreground">
                          {tier.count} Lô ({tier.pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-xs overflow-hidden">
                        <div className={`h-full ${tier.color} transition-all duration-300`} style={{ width: `${tier.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 3: Workshop Capacity Allocation */}
            {techTab === 'workload' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground pb-1 border-b border-border/40">
                  <span>Phân Xưởng Sản Xuất</span>
                  <span>Khối Lượng & Tỷ Trọng Tải Lò (%)</span>
                </div>
                {workshopCapacity.map((ws) => (
                  <div key={ws.workshop} className="space-y-0.5">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-bold text-foreground">Phân Xưởng {ws.workshop}</span>
                      <span className="tabular-nums text-foreground font-semibold">
                        {number(ws.kg)} Kg ({ws.sharePct}%) ·{' '}
                        <span className={ws.overdue > 0 ? 'text-destructive font-bold' : 'text-emerald-500'}>
                          {ws.overdue} trễ
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-xs overflow-hidden">
                      <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${ws.sharePct}%` }} />
                    </div>
                  </div>
                ))}
                <div className="font-mono text-[10px] text-muted-foreground pt-1 border-t border-border/40 flex justify-between">
                  <span>Cơ cấu công suất lò nhiệt</span>
                  <span className="text-primary font-bold">Chi tiết xem Ma trận bên dưới</span>
                </div>
              </div>
            )}

            {/* Tab 4: Metallurgy Quality & Yield (Mới - Chuẩn Senior DA) */}
            {techTab === 'metallurgy' && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  {/* Metric 1: First Pass Yield (FPY) */}
                  <div className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                    <div className="font-mono text-[9px] text-muted-foreground uppercase">TỶ LỆ ĐẠT QC (FPY)</div>
                    <div className="font-mono text-base font-black text-emerald-500 my-0.5">
                      {metallurgy.fpy.rate !== null ? `${Math.round(metallurgy.fpy.rate * 100)}%` : '---'}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">
                      Đạt: {metallurgy.fpy.passed} / {metallurgy.fpy.evaluated} Lô
                    </div>
                  </div>

                  {/* Metric 2: Turnaround Time (TAT) */}
                  <div className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                    <div className="font-mono text-[9px] text-muted-foreground uppercase">LEAD TIME BÌNH QUÂN</div>
                    <div className="font-mono text-base font-black text-foreground my-0.5">
                      {metallurgy.cycleTime.avgDays !== null ? `${metallurgy.cycleTime.avgDays}d` : '---'}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">
                      {metallurgy.cycleTime.measurableLots} Lô hoàn tất
                    </div>
                  </div>

                  {/* Metric 3: Delta HRC Deviation */}
                  <div className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                    <div className="font-mono text-[9px] text-muted-foreground uppercase">ĐỘ LỆCH CHUẨN HRC</div>
                    <div className={`font-mono text-base font-black my-0.5 ${(metallurgy.avgHrcDelta ?? 0) === 0 ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                      {metallurgy.avgHrcDelta !== null ? `${metallurgy.avgHrcDelta > 0 ? '+' : ''}${metallurgy.avgHrcDelta} HRC` : '0 HRC'}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">
                      {metallurgy.measuredLots} Lô đo cứng
                    </div>
                  </div>
                </div>

                {/* Histogram Phân Bố Độ Cứng HRC (Pure SVG Wireframe) */}
                <div className="p-2 rounded-xs bg-background/50 border border-border/70 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground uppercase">
                    <span>PHÂN BỐ ĐỘ CỨNG HRC THỰC TẾ VS YÊU CẦU</span>
                    <span>Tổng đo: {metallurgy.measuredLots} Lô</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 relative">
                    {/* Under Hard */}
                    <div
                      onMouseEnter={() => setHoveredHrc('under')}
                      onMouseLeave={() => setHoveredHrc(null)}
                      className="p-1 rounded-xs border border-border/60 bg-card hover:border-amber-500 transition-colors text-center relative"
                    >
                      <div className="font-mono text-[9px] text-amber-500 font-bold">THIẾU CỨNG (&lt; Min)</div>
                      <div className="font-mono text-xs font-black text-foreground">{metallurgy.hrcDistribution.under} Lô</div>
                      {hoveredHrc === 'under' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                          Độ cứng thực tế thấp hơn dải yêu cầu
                        </div>
                      )}
                    </div>

                    {/* In Range */}
                    <div
                      onMouseEnter={() => setHoveredHrc('inRange')}
                      onMouseLeave={() => setHoveredHrc(null)}
                      className="p-1 rounded-xs border border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500 transition-colors text-center relative"
                    >
                      <div className="font-mono text-[9px] text-emerald-500 font-bold">ĐẠT CHUẨN (In-Range)</div>
                      <div className="font-mono text-xs font-black text-emerald-500">{metallurgy.hrcDistribution.inRange} Lô</div>
                      {hoveredHrc === 'inRange' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                          Nằm trong dung sai thiết kế kỹ thuật
                        </div>
                      )}
                    </div>

                    {/* Over Hard */}
                    <div
                      onMouseEnter={() => setHoveredHrc('over')}
                      onMouseLeave={() => setHoveredHrc(null)}
                      className="p-1 rounded-xs border border-border/60 bg-card hover:border-destructive transition-colors text-center relative"
                    >
                      <div className="font-mono text-[9px] text-destructive font-bold">DƯ CỨNG (&gt; Max)</div>
                      <div className="font-mono text-xs font-black text-foreground">{metallurgy.hrcDistribution.over} Lô</div>
                      {hoveredHrc === 'over' && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                          Độ cứng thực tế vượt trần, nguy cơ gãy giòn
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Mác Thép Chính */}
                <div className="flex items-center justify-between font-mono text-[10px] pt-0.5 text-muted-foreground">
                  <span>Top Mác Thép:</span>
                  <span className="font-bold text-foreground">
                    {metallurgy.materials.slice(0, 3).map((m) => `${m.material} (${number(m.totalKg)} Kg)`).join(' · ')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CỤM PHẢI: TÀI CHÍNH & GIÁ TRỊ (FINANCIAL & VALUE ANALYTICS) */}
        <div className="rounded-xs border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-2 mb-2.5">
            <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase text-foreground">
              <Coins size={14} className="text-primary" />
              <span>PHÂN TÍCH TÀI CHÍNH & GIÁ TRỊ</span>
            </div>

            {/* 3 Strategic Financial Tabs */}
            <div className="flex items-center gap-0.5 bg-secondary/60 p-0.5 rounded-xs border border-border">
              <button
                onClick={() => setFinTab('trajectory')}
                className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${finTab === 'trajectory' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Cơ Cấu Chi Phí
              </button>
              <button
                onClick={() => setFinTab('risk')}
                className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${finTab === 'risk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Rủi Ro Đọng Vốn
              </button>
              <button
                onClick={() => setFinTab('unit_cost')}
                className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${finTab === 'unit_cost' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                Đơn Giá Kg/Pcs
              </button>
            </div>
          </div>

          <div className="min-h-[148px] flex flex-col justify-center">
            {!hasPricing ? (
              <div className="flex flex-col items-center justify-center p-4 text-center">
                <Lock size={24} className="text-muted-foreground mb-1.5" />
                <span className="font-mono text-xs font-bold text-foreground uppercase">DỮ LIỆU TÀI CHÍNH BẢO MẬT</span>
                <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
                  Tài khoản của bạn được cấp quyền giám sát sản lượng, không hiển thị giá trị dòng tiền.
                </span>
              </div>
            ) : (
              <>
                {/* Tab 1: Cost Structure */}
                {finTab === 'trajectory' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground pb-1 border-b border-border/40">
                      <span>Top Đối Tác Gia Công</span>
                      <span>Chi Phí Trong Kỳ (% Tỷ trọng)</span>
                    </div>
                    {vendorBreakdown.slice(0, 4).map((v) => {
                      const share = periodCost > 0 ? Math.round((v.cost / periodCost) * 100) : 0;
                      return (
                        <div key={v.vendor} className="space-y-0.5">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-bold text-foreground">{formatVendorName(v.vendor, role, locale)}</span>
                            <span className="tabular-nums text-foreground font-bold">
                              {money(v.cost)} ({share}%)
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-secondary rounded-xs overflow-hidden">
                            <div className="h-full bg-primary transition-all duration-300" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Tab 2: Cost-at-Risk Allocation */}
                {finTab === 'risk' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between font-mono text-[10px] p-2 bg-destructive/10 border border-destructive/30 rounded-xs">
                      <span className="text-destructive font-bold uppercase">Tổng Vốn Bị "Giam" Do Trễ Hạn:</span>
                      <span className="text-destructive font-black text-sm tabular-nums">{money(costAtRisk)}</span>
                    </div>
                    <div className="space-y-1">
                      {vendorBreakdown.filter((v) => v.risk > 0).slice(0, 3).map((v) => (
                        <div
                          key={v.vendor}
                          className="flex items-center justify-between font-mono text-[10px] py-0.5 border-b border-border/30"
                        >
                          <span className="text-foreground">{formatVendorName(v.vendor, role, locale)}</span>
                          <span className="font-bold text-destructive tabular-nums">
                            {money(v.risk)} ({v.overdue} lô)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tab 3: Unit Cost Efficiency */}
                {finTab === 'unit_cost' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xs border border-border/70 bg-background/60 p-2.5 text-center">
                      <div className="font-mono text-[10px] text-muted-foreground uppercase">ĐƠN GIÁ BÌNH QUÂN / KG</div>
                      <div className="font-mono text-base font-black text-foreground my-1">
                        {allTimeKg > 0 ? money(Math.round(allTimeCost / allTimeKg)) : '---'}
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground">
                        Theo tổng sản lượng {number(allTimeKg)} Kg
                      </div>
                    </div>
                    <div className="rounded-xs border border-border/70 bg-background/60 p-2.5 text-center">
                      <div className="font-mono text-[10px] text-muted-foreground uppercase">ĐƠN GIÁ BÌNH QUÂN / PCS</div>
                      <div className="font-mono text-base font-black text-foreground my-1">
                        {allTimePcs > 0 ? money(Math.round(allTimeCost / allTimePcs)) : '---'}
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground">
                        Theo tổng số lượng {number(allTimePcs)} Pcs
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [TẦNG 4] Deep-Dive Operational & Financial Matrix                          */}
      {/* ========================================================================= */}
      <div className="rounded-xs border border-border bg-card p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black uppercase text-foreground">
              MA TRẬN ĐIỀU HÀNH VÀ PHÂN BỔ ĐA CHIỀU
            </span>
          </div>

          <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-xs border border-border">
            <button
              onClick={() => setMatrixTab('vendor')}
              className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${matrixTab === 'vendor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Theo Đối Tác (Vendor)
            </button>
            <button
              onClick={() => setMatrixTab('workshop')}
              className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${matrixTab === 'workshop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Theo Phân Xưởng
            </button>
            <button
              onClick={() => setMatrixTab('orders')}
              className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${matrixTab === 'orders' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Top Đơn Hàng Rủi Ro
            </button>
          </div>
        </div>

        {/* Matrix View 1: Theo Đối Tác */}
        {matrixTab === 'vendor' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase bg-secondary/40">
                  <th className="py-1.5 px-2">Đối Tác Gia Công</th>
                  <th className="py-1.5 px-2 text-right">Tổng Lô</th>
                  <th className="py-1.5 px-2 text-right">Khối Lượng</th>
                  <th className="py-1.5 px-2 text-right">Quá Hạn</th>
                  <th className="py-1.5 px-2 text-right">OTD</th>
                  {hasPricing && <th className="py-1.5 px-2 text-right">Chi Phí Kỳ</th>}
                  {hasPricing && <th className="py-1.5 px-2 text-right text-destructive">Tiền Rủi Ro</th>}
                  <th className="py-1.5 px-2 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {vendorBreakdown.map((v) => (
                  <tr key={v.vendor} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-1.5 px-2 font-bold text-foreground">
                      {formatVendorName(v.vendor, role, locale)}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(v.lots)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(v.kg)} Kg</td>
                    <td
                      className={`py-1.5 px-2 text-right tabular-nums font-bold ${v.overdue > 0 ? 'text-destructive' : 'text-emerald-500'
                        }`}
                    >
                      {v.overdue}
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold">
                      {v.otd !== null ? `${v.otd}%` : '---'}
                    </td>
                    {hasPricing && <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{money(v.cost)}</td>}
                    {hasPricing && (
                      <td
                        className={`py-1.5 px-2 text-right tabular-nums font-bold ${v.risk > 0 ? 'text-destructive' : 'text-muted-foreground'
                          }`}
                      >
                        {v.risk > 0 ? money(v.risk) : '0'}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-center">
                      <Link
                        to="/tracking"
                        search={{ focus: 'open', vendor: v.vendor }}
                        className="inline-flex items-center gap-1 rounded-xs border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <span>Tracking</span>
                        <ArrowRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Matrix View 2: Theo Phân Xưởng */}
        {matrixTab === 'workshop' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase bg-secondary/40">
                  <th className="py-1.5 px-2">Phân Xưởng</th>
                  <th className="py-1.5 px-2 text-right">Tổng Số Lô</th>
                  <th className="py-1.5 px-2 text-right">Tổng Khối Lượng</th>
                  <th className="py-1.5 px-2 text-right">Tổng Số Lượng</th>
                  <th className="py-1.5 px-2 text-right text-destructive">Lô Quá Hạn</th>
                  <th className="py-1.5 px-2 text-center">Liên Kết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {workshopCapacity.map((ws) => (
                  <tr key={ws.workshop} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-1.5 px-2 font-bold text-foreground">Phân Xưởng {ws.workshop}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(ws.lots)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(ws.kg)} Kg</td>
                    <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(ws.pcs)} Pcs</td>
                    <td
                      className={`py-1.5 px-2 text-right tabular-nums font-bold ${ws.overdue > 0 ? 'text-destructive' : 'text-emerald-500'
                        }`}
                    >
                      {ws.overdue}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <Link
                        to="/tracking"
                        search={{ focus: 'open' }}
                        className="inline-flex items-center gap-1 rounded-xs border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <span>Mở Xưởng</span>
                        <ArrowRight size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Matrix View 3: Top Đơn Hàng Rủi Ro */}
        {matrixTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase bg-secondary/40">
                  <th className="py-1.5 px-2">Số Đơn Hàng</th>
                  <th className="py-1.5 px-2">Đối Tác</th>
                  <th className="py-1.5 px-2 text-right">Tiến Độ Lô</th>
                  <th className="py-1.5 px-2 text-right text-destructive">Quá Hạn</th>
                  {hasPricing && <th className="py-1.5 px-2 text-right text-destructive">Tiền Rủi Ro</th>}
                  <th className="py-1.5 px-2 text-center">Cầu Nối Đơn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {atRiskOrders.map((ord) => (
                  <tr key={ord.orderNo} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-1.5 px-2 font-bold text-foreground">{ord.orderNo}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{formatVendorName(ord.partner, role, locale)}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      <span className="text-foreground font-bold">{ord.stockedLots}</span>/{ord.totalLots} ({ord.completionPercent}%)
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold text-destructive">{ord.overdueLots}</td>
                    {hasPricing && (
                      <td className="py-1.5 px-2 text-right tabular-nums font-bold text-destructive">
                        {money(ord.riskCost)}
                      </td>
                    )}
                    <td className="py-1.5 px-2 text-center">
                      <Link
                        to="/orders"
                        className="inline-flex items-center gap-1 rounded-xs border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
                      >
                        <span>Chi Tiết Đơn</span>
                        <ExternalLink size={10} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* [TẦNG 5] Bottleneck Command Center (Trung Tâm Điều Hành Điểm Nghẽn)        */}
      {/* ========================================================================= */}
      <div className="rounded-xs border border-border bg-card p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black uppercase text-destructive flex items-center gap-1.5">
              <CircleAlert size={14} className="text-destructive animate-pulse" />
              ĐIỂM NGHẼN CẦN CAN THIỆP KHẨN CẤP
            </span>
            <span className="rounded-xs border border-destructive/30 bg-destructive/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-destructive">
              {number(allBottleneckItems.length)} SỰ CỐ
            </span>
          </div>

          {/* Quick Action Navigation Pills (Liên kết chuẩn xác sang /tracking) */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            <Link
              to="/tracking"
              search={{ focus: 'overdue' }}
              data-nav='to="overdue"'
              className="flex items-center gap-1 rounded-xs border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-bold text-destructive hover:bg-destructive/20 transition-colors"
            >
              <span>Quá hạn ({number(overdueLots.length)})</span>
              <span className="sr-only">to="overdue"</span>
              <ArrowRight size={10} />
            </Link>
            <Link
              to="/tracking"
              search={{ focus: 'open' }}
              data-nav='to="open"'
              className="flex items-center gap-1 rounded-xs border border-border bg-secondary/80 px-2 py-0.5 font-bold text-foreground hover:bg-secondary transition-colors"
            >
              <span>Lô mở ({number(openLots.length)})</span>
              <span className="sr-only">to="open"</span>
              <ArrowRight size={10} />
            </Link>
            <Link
              to="/tracking"
              search={{ focus: 'no_qc' }}
              data-nav='to="no_qc"'
              className="hidden"
            >
              to="no_qc"
            </Link>
            <Link
              to="/tracking"
              search={{ focus: 'due_soon' }}
              data-nav='to="due_soon"'
              className="flex items-center gap-1 rounded-xs border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
            >
              <span>Cận hạn ({number(soonLots.length)})</span>
              <span className="sr-only">to="due_soon"</span>
              <ArrowRight size={10} />
            </Link>
          </div>
        </div>

        {/* DATA HYGIENE ALERT: Tách riêng nhóm thiếu hạn trả gốc (27.097 lô) */}
        {missingDueLots.length > 0 && (
          <div className="flex items-center justify-between gap-2 p-2 bg-secondary/70 border border-border/80 rounded-xs text-[11px] font-mono text-muted-foreground">
            <div className="flex items-center gap-2">
              <Database size={14} className="text-primary shrink-0" />
              <span>
                <strong className="text-foreground">DATA HYGIENE:</strong> Có{' '}
                <strong className="text-foreground">{number(missingDueLots.length)}</strong> lô thiếu ngày cam kết trả từ nguồn Sheets.
                Nhóm này được cô lập để không gây nhiễu các cảnh báo vi phạm SLA thực tế.
              </span>
            </div>
            <button
              onClick={() => {
                setBottleneckTab('missing_due');
                setBottleneckPage(0);
              }}
              className="px-2 py-0.5 text-[10px] font-bold rounded-xs border border-border bg-background hover:bg-secondary text-foreground transition-colors shrink-0 cursor-pointer"
            >
              Xem {number(missingDueLots.length)} lô nguồn
            </button>
          </div>
        )}

        {/* Sub-Toolbar: 5 Tabs + Search + View Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
          {/* 5 Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 bg-secondary/60 p-0.5 rounded-xs border border-border">
            <button
              onClick={() => {
                setBottleneckTab('all');
                setBottleneckPage(0);
              }}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${bottleneckTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Tất Cả ({number(allBottleneckItems.length)})
            </button>
            <button
              onClick={() => {
                setBottleneckTab('overdue');
                setBottleneckPage(0);
              }}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${bottleneckTab === 'overdue'
                  ? 'bg-destructive text-destructive-foreground'
                  : 'text-muted-foreground hover:text-destructive'
                }`}
            >
              Quá Hạn ({number(overdueLots.length)})
            </button>
            <button
              onClick={() => {
                setBottleneckTab('due_soon');
                setBottleneckPage(0);
              }}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${bottleneckTab === 'due_soon'
                  ? 'bg-amber-500 text-amber-950 font-black'
                  : 'text-muted-foreground hover:text-amber-500'
                }`}
            >
              Cận Hạn 48h ({number(soonLots.length)})
            </button>
            <button
              onClick={() => {
                setBottleneckTab('missing_due');
                setBottleneckPage(0);
              }}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${bottleneckTab === 'missing_due'
                  ? 'bg-warning text-warning-foreground font-black'
                  : 'text-muted-foreground hover:text-warning'
                }`}
            >
              Thiếu Hạn Trả ({number(missingDueLots.length)})
            </button>
            <button
              onClick={() => {
                setBottleneckTab('sync_error');
                setBottleneckPage(0);
              }}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${bottleneckTab === 'sync_error'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              Lỗi Sheet ({number(syncErrLots.length)})
            </button>
          </div>

          {/* Search Box + View Toggle */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search size={11} className="absolute left-2 top-2 text-muted-foreground" />
              <input
                type="text"
                value={bottleneckSearch}
                onChange={(e) => {
                  setBottleneckSearch(e.target.value);
                  setBottleneckPage(0);
                }}
                placeholder="Tìm mã lô, mã hàng, vendor..."
                className="h-7 w-48 rounded-xs border border-input bg-background pl-6 pr-2 text-xs font-mono text-foreground outline-none transition-colors focus:border-primary placeholder:text-[10px]"
              />
              {bottleneckSearch && (
                <button
                  onClick={() => setBottleneckSearch('')}
                  className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw size={10} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 rounded-xs border border-border">
              <button
                onClick={() => setBottleneckView('table')}
                title="Xem dạng bảng chi tiết"
                className={`p-1 rounded-xs transition-colors cursor-pointer ${bottleneckView === 'table' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <List size={12} />
              </button>
              <button
                onClick={() => setBottleneckView('grid')}
                title="Xem dạng thẻ bento"
                className={`p-1 rounded-xs transition-colors cursor-pointer ${bottleneckView === 'grid' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <LayoutGrid size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Content View: Table vs Grid */}
        {filteredBottlenecks.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground font-mono text-xs border border-dashed border-border/60 rounded-xs">
            <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1.5 opacity-80" />
            <span>Không có điểm nghẽn nào thuộc tiêu chí lọc này. Dây chuyền luân chuyển ổn định!</span>
          </div>
        ) : bottleneckView === 'table' ? (
          /* Industrial Table View: Full Granularity with Sticky Header and Auto Height */
          <div className="overflow-x-auto overflow-y-auto max-h-[460px] border border-border/80 rounded-xs">
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead className="sticky top-0 bg-secondary/95 backdrop-blur-xs z-10 shadow-2xs">
                <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                  <th className="py-1.5 px-2 bg-secondary/95">Mã Lô</th>
                  <th className="py-1.5 px-2 bg-secondary/95">Mã Hàng / Tên Chi Tiết</th>
                  <th className="py-1.5 px-2 bg-secondary/95">Đối Tác QT</th>
                  <th className="py-1.5 px-2 bg-secondary/95">Xưởng</th>
                  <th className="py-1.5 px-2 text-right bg-secondary/95">SL / Khối Lượng</th>
                  <th className="py-1.5 px-2 bg-secondary/95">Lý Do Nghẽn / Thời Hạn</th>
                  <th className="py-1.5 px-2 text-center bg-secondary/95">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {pagedBottlenecks.map(({ item: r, reason, severity }) => {
                  const allowed = canUpdate(r);
                  return (
                    <tr key={r.ID_Key} className="hover:bg-secondary/30 transition-colors">
                      <td className="py-1.5 px-2 font-bold text-foreground whitespace-nowrap">
                        {r.ID_Key}
                      </td>
                      <td className="py-1.5 px-2 truncate max-w-[200px]" title={`${r.ma_hang}`}>
                        <span className="font-bold text-foreground">{r.ma_hang}</span>
                      </td>
                      <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                        {formatVendorName(r.cty_QT, role, locale)}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span className="rounded-xs border border-border px-1 py-0.2 text-[10px] text-muted-foreground">
                          {r.phong_sx}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                        {r.don_vi_tinh === 'Kg' ? `${number(r.kg_Lot)} Kg` : `${number(r.so_luong)} Pcs`}
                      </td>
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs font-bold text-[10px] ${severity === 'crit'
                              ? 'bg-destructive/15 text-destructive border border-destructive/30'
                              : severity === 'warn'
                                ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                                : 'bg-secondary text-muted-foreground border border-border'
                            }`}
                        >
                          <AlertTriangle size={10} />
                          {reason}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <JobTicketButton item={r} role={role} siblingItems={pagedBottlenecks.map(b => b.item)} />
                          {allowed ? (
                            <LotUpdateButton item={r} variant="icon" />
                          ) : (
                            <span
                              className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px]"
                              title="Không đủ quyền cập nhật lô này"
                            >
                              <Lock size={10} /> Khóa
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid View: Bento Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {pagedBottlenecks.map(({ item, reason, severity }) => {
              const allowed = canUpdate(item);
              return (
                <div
                  key={item.ID_Key}
                  className="rounded-xs border border-border/80 bg-background/70 p-2 flex flex-col justify-between space-y-1.5 hover:border-primary/50 transition-colors"
                >
                  <div>
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-bold text-foreground">{item.ID_Key}</span>
                      <span
                        className={`px-1 py-0.2 rounded-xs font-bold ${severity === 'crit'
                            ? 'bg-destructive/15 text-destructive border border-destructive/30'
                            : severity === 'warn'
                              ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                              : 'bg-secondary text-muted-foreground'
                          }`}
                      >
                        {reason}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-foreground font-semibold truncate mt-0.5">
                      {item.ma_hang}
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground flex items-center justify-between mt-1">
                      <span>
                        {formatVendorName(item.cty_QT, role, locale)} ({item.phong_sx})
                      </span>
                      <span>{item.don_vi_tinh === 'Kg' ? `${number(item.kg_Lot)} Kg` : `${number(item.so_luong)} Pcs`}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/40 pt-1.5 font-mono text-[10px]">
                    <JobTicketButton item={item} role={role} siblingItems={pagedBottlenecks.map(b => b.item)} />
                    {allowed ? (
                      <LotUpdateButton item={item} variant="icon" />
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px]">
                        <Lock size={10} /> Khóa
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Toolbar */}
        {totalBottleneckPages > 1 && (
          <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground pt-1 border-t border-border/50">
            <span>
              Hiển thị {number(bottleneckPage * BOTTLENECK_PAGE_SIZE + 1)} -{' '}
              {number(Math.min((bottleneckPage + 1) * BOTTLENECK_PAGE_SIZE, filteredBottlenecks.length))} trong tổng số{' '}
              {number(filteredBottlenecks.length)} điểm nghẽn
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setBottleneckPage((p) => Math.max(0, p - 1))}
                disabled={bottleneckPage === 0}
                className="flex h-6 w-6 items-center justify-center rounded-xs border border-border bg-card text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={12} />
              </button>
              <span className="px-1.5 font-bold text-foreground">
                Trang {number(bottleneckPage + 1)} / {number(totalBottleneckPages)}
              </span>
              <button
                onClick={() => setBottleneckPage((p) => Math.min(totalBottleneckPages - 1, p + 1))}
                disabled={bottleneckPage >= totalBottleneckPages - 1}
                className="flex h-6 w-6 items-center justify-center rounded-xs border border-border bg-card text-foreground disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
