import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  CircleAlert,
  Clock3,
  Download,
  FileText,
  Filter,
  Lock,
  PackageCheck,
  Printer,
  RefreshCw,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { useDynamo, PageHeading } from '@/components/dynamo-shell';
import { useTranslation } from '@/i18n';
import { JobTicketButton } from '@/components/job-ticket';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { playAudioCue } from '@/lib/audio-cues';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { formatVendorName, getVendorScope, type Role } from '@/lib/dynamo-auth';
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
  qcOf,
  type Logistics,
  type QcState,
} from '@/lib/dynamo-rules';
import { failedSyncIds } from '@/lib/dynamo-workflow';

export const Route = createFileRoute('/dashboard')({
  head: () => ({
    meta: [
      { title: 'Tổng quan | DYNAMO VIETNAM QT - MES' },
      { name: 'description', content: 'Trung tâm điều hành luân chuyển gia công QT cho PIN, INSERT và MOLD.' },
      { property: 'og:title', content: 'Tổng quan | DYNAMO VIETNAM QT - MES' },
      { property: 'og:description', content: 'Theo dõi lô mở, quá hạn, tỷ lệ đúng hạn và chi phí gia công QT.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Dashboard,
});

type Period = 'all' | 'today' | 'week' | 'this' | 'prev';
type Focus = 'overdue' | 'due_soon' | 'est_due' | 'sync_failed' | 'no_qc' | 'qc_fail' | 'open' | 'stocked';
const sel = 'h-8.5 rounded-xs border border-input bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary';
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function Dashboard() {
  const { t, locale } = useTranslation();
  const { filtered, workshop, syncedAt, sourceLabel, role, pullLive, loading } = useDynamo();
  const [period, setPeriod] = useState<Period>('all');
  const [vendor, setVendor] = useState('all');
  const [logi, setLogi] = useState<'all' | Logistics>('all');
  const [qc, setQc] = useState<'all' | QcState>('all');
  const [failed, setFailed] = useState<Set<string>>(new Set());
  useEffect(() => {
    const f = () => setFailed(failedSyncIds());
    f();
    window.addEventListener('dynamo-audit', f);
    return () => window.removeEventListener('dynamo-audit', f);
  }, []);

  const rawVendors = useMemo(() => [...new Set(filtered.map((i) => String(i.cty_QT)))].sort(), [filtered]);
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const weekAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
  const weekAgoIso = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, '0')}-${String(weekAgo.getDate()).padStart(2, '0')}`;
  const monthKey = period === 'this' ? ym(now) : period === 'prev' ? ym(new Date(now.getFullYear(), now.getMonth() - 1, 1)) : '';

  const rows = useMemo(
    () =>
      filtered.filter((i) => {
        if (period === 'today' && !i.ngay_gui_QT.startsWith(todayIso)) return false;
        if (period === 'week' && (i.ngay_gui_QT < weekAgoIso || i.ngay_gui_QT > todayIso)) return false;
        if ((period === 'this' || period === 'prev') && !i.ngay_gui_QT.startsWith(monthKey)) return false;
        return (
          (vendor === 'all' || i.cty_QT === vendor) &&
          (logi === 'all' || logisticsOf(i) === logi) &&
          (qc === 'all' || qcOf(i) === qc)
        );
      }),
    [filtered, period, todayIso, weekAgoIso, monthKey, vendor, logi, qc],
  );

  const open = rows.filter(isOpen);
  const overdue = rows.filter((r) => isOverdue(r)).sort((a, b) => daysOver(b) - daysOver(a));
  const soon = rows.filter((r) => isDueSoon(r));
  const missing = rows.filter(isMissingDue);
  const stockedNoQc = rows.filter((r) => isDone(r) && qcOf(r) !== 'Đạt');
  const qcFail = rows.filter((r) => qcOf(r) === 'Không đạt');
  const syncErr = rows.filter((r) => failed.has(r.ID_Key));
  const rate = onTimeRate(rows);
  const costRows = rows.filter((r) => r.thanh_tien > 0);
  const cost = costRows.reduce((a, i) => a + i.thanh_tien, 0);

  const periodLabel =
    period === 'all'
      ? 'Toàn bộ dữ liệu'
      : period === 'today'
        ? `Hôm nay · ${todayIso}`
        : period === 'week'
          ? `7 ngày qua (${weekAgoIso} ~ ${todayIso})`
          : `Tháng ${monthKey.slice(5)}/${monthKey.slice(0, 4)} (theo ngày gửi QT)`;

  // OTD Trend across last 4 weeks (W-3, W-2, W-1, W-0)
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

  const canUpdate = (item: QTItem) => {
    if (role === 'admin') return true;
    const v = getVendorScope(role);
    return !!(v && v === String(item.cty_QT).toUpperCase());
  };

  const alerts: { label: string; reason: string; rows: QTItem[]; tone: string; focus?: Focus }[] = [
    { label: 'Quá hạn', reason: 'Chưa nhập kho, đã qua hạn trả chính thức', rows: overdue, tone: 'text-destructive', focus: 'overdue' },
    { label: 'Cận hạn 48h', reason: 'Hạn trả chính thức trong 2 ngày tới', rows: soon, tone: 'text-warning', focus: 'due_soon' },
    { label: 'Thiếu hạn trả', reason: 'Không có hạn trả hợp lệ từ nguồn — cần bổ sung', rows: missing, tone: 'text-warning', focus: 'est_due' },
    { label: 'Nhập kho chưa QC', reason: 'Đã về kho nhưng QC chưa đạt', rows: stockedNoQc, tone: 'text-info', focus: 'no_qc' },
    { label: 'QC không đạt', reason: 'Cần xử lý lại với đối tác gia công', rows: qcFail, tone: 'text-destructive', focus: 'qc_fail' },
    { label: 'Ghi Sheet lỗi', reason: 'Lần cập nhật gần nhất chưa ghi được lên Sheet', rows: syncErr, tone: 'text-warning', focus: 'sync_failed' },
  ];

  const group = (key: (r: QTItem) => string, rawKey?: (r: QTItem) => string) => {
    const m = new Map<string, { label: string; raw: string; list: QTItem[] }>();
    for (const r of open) {
      const k = key(r);
      const raw = rawKey ? rawKey(r) : k;
      const existing = m.get(k);
      if (existing) {
        existing.list.push(r);
      } else {
        m.set(k, { label: k, raw, list: [r] });
      }
    }
    return [...m.values()]
      .map(({ label, raw, list }) => ({
        name: label,
        raw,
        lots: list.length,
        kg: list.filter((r) => r.don_vi_tinh === 'Kg').reduce((a, r) => a + r.kg_Lot, 0),
        pcs: list.filter((r) => r.don_vi_tinh === 'pcs').reduce((a, r) => a + r.so_luong, 0),
        over: list.filter((r) => isOverdue(r)).length,
        soon: list.filter((r) => isDueSoon(r)).length,
      }))
      .sort((a, b) => b.over - a.over || b.lots - a.lots);
  };
  const reasonOf = (r: QTItem) =>
    isOverdue(r) ? `Quá hạn ${daysOver(r)} ngày` : isDueSoon(r) ? 'Cận hạn 48h' : isMissingDue(r) ? 'Thiếu hạn trả' : failed.has(r.ID_Key) ? 'Ghi Sheet lỗi' : '';
  const actions = [...overdue, ...soon, ...missing, ...syncErr.filter((r) => !isOverdue(r) && !isDueSoon(r) && !isMissingDue(r))].slice(0, 8);
  const reset = () => {
    setPeriod('all');
    setVendor('all');
    setLogi('all');
    setQc('all');
  };
  const filtersOn = period !== 'all' || vendor !== 'all' || logi !== 'all' || qc !== 'all';

  const [handoverOpen, setHandoverOpen] = useState(false);

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden space-y-3 pr-0.5 pb-8">
      {/* Compact Master Command Toolbar (v2.1.0 High-Density Layout) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs">
        {/* Left: View Identity & Workshop Scope */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-black tracking-wider uppercase text-foreground">
            {t('nav.route2Title') || '[2] TỔNG QUAN LUÂN CHUYỂN'}
          </span>
          <span className="rounded-xs border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
            {workshop === 'Tất cả' ? (t('tracking.workshops.all') || 'TẤT CẢ PHÂN XƯỞNG') : `${t('tracking.workshops.title') || 'XƯỞNG'} ${workshop}`}
          </span>
          <span className="rounded-xs border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
            {number(rows.length)} {t('common.units.lots') || 'LÔ'}
          </span>
        </div>

        {/* Center: Inline Fast Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mr-1">
            <Filter size={12} className="text-primary" />
            <span className="font-mono text-[10px] uppercase">{t('common.filter') || 'LỌC'}:</span>
          </div>
          <select aria-label="Kỳ báo cáo" className={sel} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
            <option value="all">{t('dashboard.periods.allTime') || 'Toàn bộ kỳ'}</option>
            <option value="today">{t('dashboard.periods.today') || 'Hôm nay (Today)'}</option>
            <option value="week">{t('dashboard.periods.sevenDays') || '7 ngày qua (7D)'}</option>
            <option value="this">{t('common.thisMonth') || 'Tháng này'}</option>
            <option value="prev">{t('common.lastMonth') || 'Tháng trước'}</option>
          </select>
          <select aria-label="Vendor" className={sel} value={vendor} onChange={(e) => setVendor(e.target.value)}>
            <option value="all">{t('common.filters.allPartners') || 'Tất cả đối tác'}</option>
            {rawVendors.map((v) => (
              <option key={v} value={v}>
                {formatVendorName(v, role, locale)}
              </option>
            ))}
          </select>
          <select aria-label="Trạng thái logistics" className={sel} value={logi} onChange={(e) => setLogi(e.target.value as Logistics)}>
            <option value="all">{t('common.filters.allStatus') || 'Mọi logistics'}</option>
            <option value="Chờ xuất xưởng">{t('tracking.status.wait') || 'WAIT'}</option>
            <option value="Đang tại Vendor">{t('tracking.status.transit') || 'TRANSIT'}</option>
            <option value="Đã nhập kho">{t('tracking.status.stocked') || 'STOCKED'}</option>
          </select>
          <select aria-label="Trạng thái QC" className={sel} value={qc} onChange={(e) => setQc(e.target.value as QcState)}>
            <option value="all">{t('common.filters.allStatus') || 'Mọi QC'}</option>
            <option value="Chưa kiểm tra">{t('tracking.status.pending') || 'PENDING'}</option>
            <option value="Đang kiểm tra">{t('tracking.status.inspect') || 'INSPECT'}</option>
            <option value="Đạt">{t('tracking.status.pass') || 'PASS'}</option>
            <option value="Không đạt">{t('tracking.status.fail') || 'FAIL'}</option>
          </select>
          {filtersOn && (
            <button
              onClick={reset}
              className="flex h-8 items-center gap-1 rounded-xs px-2 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10 cursor-pointer"
            >
              <RotateCcw size={11} /> {t('common.filters.resetFilter') || 'Đặt lại'}
            </button>
          )}
        </div>

        {/* Right: Primary Action & Realtime Sync Indicator */}
        <div className="flex items-center gap-2">
          {/* Nút Làm Mới (Shift+R) */}
          <button
            type="button"
            onClick={() => void pullLive(true)}
            disabled={loading}
            title={t('tracking.toolbars.refresh') || 'Làm mới dữ liệu từ Google Sheets (Phím tắt: Shift + R)'}
            aria-label="Làm mới dữ liệu từ Google Sheets"
            className="inline-flex h-8 items-center gap-1.5 rounded-xs border border-border/80 bg-card px-2.5 text-xs font-bold text-foreground hover:bg-secondary transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-98 touch-manipulation disabled:opacity-60"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin text-primary' : 'text-primary'} />
            <span>{loading ? (t('common.loading') || 'Đang tải…') : (t('common.refresh') || 'Làm mới')}</span>
            <kbd className="hidden md:inline-block font-mono text-[9px] text-muted-foreground bg-muted/80 px-1 py-0.2 rounded-xs border border-border/50">
              Shift+R
            </kbd>
          </button>
          <div className="hidden 2xl:flex h-8 items-center gap-1.5 rounded-xs border border-border/80 bg-secondary/40 px-2 text-[11px] text-muted-foreground shadow-2xs">
            <span className="size-1.5 rounded-full bg-primary" />
            <span className="font-mono text-[10px]">{sourceLabel}</span>
            {syncedAt ? (
              <span className="font-mono text-[10px] tabular-nums text-foreground/80">
                · {new Date(syncedAt).toLocaleTimeString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN', { hour12: false })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {!rows.length ? (
        <div className="rounded-xs border border-border bg-card p-10 text-center text-xs text-muted-foreground">
          {t('dashboard.alerts.empty') || 'Không có lô nào khớp bộ lọc. Hãy đổi kỳ báo cáo hoặc xóa bộ lọc.'}
        </div>
      ) : (
        <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi
              code={t('dashboard.kpis.kpi1Code') || '[KPI-01]'}
              icon={<Boxes size={16} />}
              label={t('dashboard.kpis.kpi1Title') || 'LÔ ĐANG MỞ'}
              value={number(open.length)}
              detail={t('dashboard.kpis.kpi1Detail', { total: number(rows.length) }) || `Chưa nhập kho / ${number(rows.length)} lô`}
              tone="blue"
              to="open"
            />
            <Kpi
              code={t('dashboard.kpis.kpi2Code') || '[KPI-02]'}
              icon={<CircleAlert size={16} />}
              label={t('dashboard.kpis.kpi2Title') || 'LÔ QUÁ HẠN'}
              value={number(overdue.length)}
              detail={t('dashboard.kpis.kpi2Detail', { over3d: number(overdue.filter((r) => daysOver(r) > 3).length), missing: number(missing.length) }) || `${number(overdue.filter((r) => daysOver(r) > 3).length)} trễ > 3d · bỏ qua ${number(missing.length)} thiếu hạn`}
              tone="red"
              to="overdue"
            />
            <Kpi
              code={t('dashboard.kpis.kpi3Code') || '[KPI-03]'}
              icon={<PackageCheck size={16} />}
              label={t('dashboard.kpis.kpi3Title') || 'TRẢ HÀNG ĐÚNG HẠN'}
              value={rate.rate === null ? '—' : `${Math.round(rate.rate * 100)}%`}
              detail={t('dashboard.kpis.kpi3Detail', { onTime: number(rate.onTime), total: number(rate.denominator) }) || `${number(rate.onTime)}/${number(rate.denominator)} lô · mục tiêu ≥ 95%`}
              tone="green"
              meter={rate.rate ?? undefined}
              to="stocked"
              extra={<OtdSparkline trend={otdTrend} />}
            />
            <Kpi
              code={t('dashboard.kpis.kpi4Code') || '[KPI-04]'}
              icon={<Clock3 size={16} />}
              label={t('dashboard.kpis.kpi4Title') || 'NHẬP KHO CHƯA QC'}
              value={number(stockedNoQc.length)}
              detail={t('dashboard.kpis.kpi4Detail') || 'Đã về kho, QC chưa đạt'}
              tone="amber"
              to="no_qc"
            />
            <Kpi
              code={t('dashboard.kpis.kpi5Code') || '[KPI-05]'}
              icon={<Wallet size={16} />}
              label={t('dashboard.kpis.kpi5Title') || 'CHI PHÍ TẠM TÍNH'}
              value={money(cost)}
              detail={t('dashboard.kpis.kpi5Detail', { count: number(costRows.length) }) || `${number(costRows.length)} lô có giá · tạm tính nội bộ`}
              tone="amber"
              readOnly
              badge={t('dashboard.kpis.kpi5ReadOnly') || 'CHỈ ĐỌC / NỘI BỘ'}
            />
          </div>

          {/* Pipeline Process Flow */}
          <Pipeline rows={rows} />

          {/* Priority Alerts and Priority Actions */}
          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[1fr_1.45fr]">
            <section className="rounded-xs border border-border bg-card p-4 shadow-2xs">
              <div className="mb-2.5 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-sm font-extrabold text-foreground">{t('dashboard.alerts.title') || 'Cảnh báo theo mức ưu tiên'}</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t('dashboard.alerts.subtitle') || 'Bấm nhóm để lọc danh sách lô chi tiết'}</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {alerts.map((a, i) => {
                  const body = (
                    <div className="flex items-center justify-between gap-3 rounded-xs border border-border/80 bg-background/70 px-3 py-2 transition-colors hover:border-primary/50 hover:bg-accent/40">
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${a.tone}`}>
                          {i + 1}. {a.label}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{a.reason}</p>
                      </div>
                      <span className="shrink-0 font-mono text-base font-bold tabular-nums text-foreground">{number(a.rows.length)}</span>
                    </div>
                  );
                  return a.focus && a.rows.length ? (
                    <Link key={a.label} to="/tracking" search={{ focus: a.focus }} className="block focus:outline-none focus:ring-1 focus:ring-primary">
                      {body}
                    </Link>
                  ) : (
                    <div key={a.label} className={a.rows.length ? '' : 'opacity-50'}>
                      {body}
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="min-w-0 rounded-xs border border-border bg-card shadow-2xs">
              <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                <div>
                  <h2 className="font-display text-sm font-extrabold text-foreground">{t('dashboard.alerts.title') || 'Hành động ưu tiên'}</h2>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{t('dashboard.alerts.subtitle') || 'Quá hạn → Cận hạn → Thiếu hạn trả → Lỗi ghi Sheet'}</p>
                </div>
                <Link to="/tracking" className="flex items-center gap-1 text-xs font-bold text-primary transition-transform hover:translate-x-0.5">
                  {t('nav.tracking') || 'Mở Luân chuyển'} <ArrowRight size={13} />
                </Link>
              </div>
              {actions.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] text-left text-xs">
                    <thead className="bg-secondary/70 text-[10px] font-bold tracking-wider text-muted-foreground uppercase font-mono">
                      <tr>
                        <th className="px-3 py-2">{t('tracking.columns.lotId') || 'MÃ LÔ'}</th>
                        <th className="px-2.5 py-2">{t('tracking.columns.orderNo') || 'ĐƠN HÀNG'}</th>
                        <th className="px-2.5 py-2">{t('tracking.columns.partner') || 'ĐỐI TÁC'}</th>
                        <th className="px-2.5 py-2">{t('tracking.workshops.title') || 'XƯỞNG'}</th>
                        <th className="px-2.5 py-2">LOGISTICS / QC</th>
                        <th className="px-2.5 py-2">{t('tracking.columns.dueDate') || 'HẠN TRẢ'}</th>
                        <th className="px-3 py-2">{t('common.status') || 'CẢNH BÁO'}</th>
                        <th className="px-2.5 py-2 text-center">{t('tracking.columns.ticket') || 'PHIẾU'}</th>
                        <th className="px-2.5 py-2 text-center">{t('common.actions') || 'XỬ LÝ'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((r) => (
                        <tr key={r.ID_Key} className="border-t border-border/70 transition-colors hover:bg-accent/30">
                          <td className="px-3 py-1.5 font-mono font-semibold text-primary">{r.ID_Key}</td>
                          <td className="px-2.5 py-1.5 font-mono text-muted-foreground">{r.So_DatHang}</td>
                          <td className="px-2.5 py-1.5 font-medium text-foreground">{formatVendorName(r.cty_QT, role, locale)}</td>
                          <td className="px-2.5 py-1.5 text-muted-foreground font-mono">{r.phong_sx}</td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap font-mono text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center rounded-xs border px-1.5 py-0.5 font-bold uppercase tracking-wider ${logisticsOf(r) === 'Đã nhập kho'
                                  ? 'border-run/50 bg-run/10 text-run'
                                  : logisticsOf(r) === 'Đang tại Vendor'
                                    ? 'border-info/50 bg-info/10 text-info'
                                    : 'border-warning/50 bg-warning/10 text-warning'
                                }`}>
                                {logisticsOf(r) === 'Đã nhập kho' ? 'STOCKED' : logisticsOf(r) === 'Đang tại Vendor' ? 'TRANSIT' : 'WAIT'}
                              </span>
                              <span className="text-muted-foreground">
                                QC: {qcOf(r)}
                              </span>
                            </div>
                          </td>
                          <td className="px-2.5 py-1.5 font-mono tabular-nums">
                            {hasValidDue(r) ? date(r.ncc_ngay_tra_qt || r.han_tra || "") : <span className="text-warning font-semibold">{t('tracking.dueTags.missingDue') || 'Thiếu hạn'}</span>}
                          </td>
                          <td className="px-3 py-1.5 font-semibold">
                            <span className={`font-mono text-xs ${isOverdue(r) ? 'text-destructive font-bold andon-pulse' : isDueSoon(r) ? 'text-warning font-bold' : 'text-muted-foreground'}`}>
                              {reasonOf(r)}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            <JobTicketButton item={r} role={role} variant="icon" />
                          </td>
                          <td className="px-2 py-1.5 text-center">
                            {canUpdate(r) ? (
                              <LotUpdateButton item={r} variant="icon" />
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-xs border border-border/60 bg-muted/20 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground/70"
                                title={t('dashboard.tooltips.permissionDenied') || 'Chỉ Quản trị viên hoặc đúng Đối tác gia công mới có quyền cập nhật tiến độ lô này'}
                              >
                                <Lock size={11} className="opacity-70" /> Khóa
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-6 text-center text-xs text-muted-foreground">{t('dashboard.alerts.empty') || 'Không có lô cần xử lý trong phạm vi này.'}</p>
              )}
            </section>
          </div>

          {/* Bottleneck Analysis */}
          <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-2">
            <Bottleneck
              title={t('dashboard.bottlenecks.byPartner') || 'Điểm nghẽn theo đối tác gia công'}
              type="vendor"
              rows={group((r) => formatVendorName(String(r.cty_QT), role, locale), (r) => String(r.cty_QT))}
            />
            <Bottleneck
              title={t('dashboard.bottlenecks.byWorkshop') || 'Điểm nghẽn theo phân xưởng'}
              type="workshop"
              rows={group((r) => r.phong_sx, (r) => r.phong_sx)}
            />
          </div>
        </>
      )}

      {handoverOpen && (
        <ShiftHandoverModal
          open={handoverOpen}
          onClose={() => setHandoverOpen(false)}
          workshop={workshop}
          openLots={open}
          overdueLots={overdue}
          otdRate={rate.rate === null ? 0 : Math.round(rate.rate * 100)}
          role={role}
        />
      )}
    </div>
  );
}

function Bottleneck({
  title,
  rows,
  type,
}: {
  title: string;
  rows: { name: string; raw: string; lots: number; kg: number; pcs: number; over: number; soon: number }[];
  type: 'vendor' | 'workshop';
}) {
  const { t } = useTranslation();
  const max = Math.max(1, ...rows.map((r) => r.lots));
  return (
    <section className="min-w-0 rounded-xs border border-border bg-card shadow-2xs">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-base font-extrabold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground font-mono">{t('dashboard.bottlenecks.subtitle') || 'Chỉ tính lô đang mở · Đỏ = quá hạn, Vàng = cận hạn'}</p>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/70 text-[10px] font-bold tracking-wider text-muted-foreground uppercase font-mono">
              <tr>
                <th className="px-5 py-2.5">{t('dashboard.bottlenecks.groupCol') || 'NHÓM'}</th>
                <th className="w-[30%] px-3 py-2.5">{t('dashboard.bottlenecks.loadCol') || 'TẢI TRỌNG'}</th>
                <th className="px-3 py-2.5 text-right">{t('dashboard.bottlenecks.openLotsCol') || 'SỐ LÔ'}</th>
                <th className="px-3 py-2.5 text-right">{t('common.units.kg') || 'KG'}</th>
                <th className="px-3 py-2.5 text-right">{t('common.units.pcs') || 'PCS'}</th>
                <th className="px-3 py-2.5 text-right">{t('dashboard.bottlenecks.overdueCol') || 'QUÁ HẠN'}</th>
                <th className="px-5 py-2.5 text-right">{t('dashboard.bottlenecks.dueSoonCol') || 'CẬN HẠN'}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-t border-border/70 transition-colors hover:bg-accent/20">
                  <td className="px-5 py-2.5 font-bold text-foreground">
                    <Link
                      to="/tracking"
                      search={type === 'vendor' ? { vendor: r.raw } : { workshop: r.raw as any }}
                      className="hover:text-primary transition-colors inline-flex items-center gap-1.5 group/link"
                    >
                      <span>{r.name}</span>
                      <ArrowRight size={11} className="text-muted-foreground/40 group-hover/link:text-primary group-hover/link:translate-x-0.5 transition-all" />
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex h-2.5 overflow-hidden rounded-xs bg-secondary" style={{ width: `${(r.lots / max) * 100}%` }}>
                      <span className="bg-destructive" style={{ width: `${(r.over / r.lots) * 100}%` }} title={t('dashboard.tooltips.overdueLots', { count: r.over }) || `Quá hạn: ${r.over}`} />
                      <span className="bg-warning" style={{ width: `${(r.soon / r.lots) * 100}%` }} title={t('dashboard.tooltips.dueSoonLots', { count: r.soon }) || `Cận hạn: ${r.soon}`} />
                      <span className="flex-1 bg-info/60" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">{number(r.lots)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{number(r.kg, 1)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{number(r.pcs)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${r.over ? 'font-bold text-destructive' : ''}`}>
                    {number(r.over)}
                  </td>
                  <td className={`px-5 py-2.5 text-right font-mono tabular-nums ${r.soon ? 'font-bold text-warning' : ''}`}>
                    {number(r.soon)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-6 text-center text-xs text-muted-foreground">{t('dashboard.bottlenecks.emptyNotice') || 'Không có lô đang mở.'}</p>
      )}
    </section>
  );
}

function Pipeline({ rows }: { rows: QTItem[] }) {
  const { t } = useTranslation();
  const stages = [
    {
      label: t('dashboard.pipeline.stage1') || 'Chờ xuất xưởng',
      logistics: 'Chờ xuất xưởng' as Logistics,
      focus: undefined,
      test: (r: QTItem) => logisticsOf(r) === 'Chờ xuất xưởng',
      tone: 'bg-muted-foreground',
      textTone: 'text-muted-foreground',
    },
    {
      label: t('dashboard.pipeline.stage2') || 'Đang tại Vendor',
      logistics: 'Đang tại Vendor' as Logistics,
      focus: undefined,
      test: (r: QTItem) => logisticsOf(r) === 'Đang tại Vendor',
      tone: 'bg-info',
      textTone: 'text-info',
    },
    {
      label: t('dashboard.pipeline.stage3') || 'Về kho, chờ QC',
      logistics: undefined,
      focus: 'no_qc' as Focus,
      test: (r: QTItem) => isDone(r) && qcOf(r) !== 'Đạt',
      tone: 'bg-warning',
      textTone: 'text-warning',
    },
    {
      label: t('dashboard.pipeline.stage4') || 'Hoàn tất (QC đạt)',
      logistics: 'Đã nhập kho' as Logistics,
      focus: 'stocked' as Focus,
      test: (r: QTItem) => isDone(r) && qcOf(r) === 'Đạt',
      tone: 'bg-primary',
      textTone: 'text-primary',
    },
  ].map((s) => {
    const list = rows.filter(s.test);
    return { ...s, lots: list.length, kg: list.reduce((a, r) => a + r.kg_Lot, 0), late: list.filter((r) => isOverdue(r)).length };
  });
  const total = Math.max(1, stages.reduce((a, s) => a + s.lots, 0));

  return (
    <section className="overflow-hidden rounded-xs border border-border bg-card shadow-2xs">
      <div className="flex h-1">
        {stages.map((s) => (
          <span key={s.label} className={s.tone} style={{ width: `${(s.lots / total) * 100}%` }} />
        ))}
      </div>
      <ol className="grid grid-cols-2 divide-x divide-border bg-border/40 sm:grid-cols-4">
        {stages.map((s, i) => {
          const content = (
            <div className="flex items-start gap-2.5 bg-card px-3 py-2 transition-all hover:bg-accent/30 group cursor-pointer h-full">
              <span className={`mt-0.5 size-2 shrink-0 rounded-xs ${s.tone} group-hover:scale-125 transition-transform`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold tracking-wide text-muted-foreground uppercase font-mono">
                    {i + 1}. {s.label}
                  </p>
                  <ArrowRight size={11} className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">
                  {number(s.lots)}{' '}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {t('dashboard.pipeline.lotsCount', { count: '', percent: Math.round((s.lots / total) * 100) }).replace(/^ /, '') || `lô (${Math.round((s.lots / total) * 100)}%)`}
                  </span>
                </p>
                <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                  {number(s.kg, 1)} kg
                  {s.late ? <b className="ml-1.5 font-bold text-destructive andon-pulse font-mono">[{s.late} {t('tracking.dueTags.overdue') || 'trễ hạn'}]</b> : null}
                </p>
              </div>
            </div>
          );
          return (
            <li key={s.label}>
              <Link
                to="/tracking"
                search={{
                  ...(s.focus ? { focus: s.focus } : {}),
                  ...(s.logistics ? { logistics: s.logistics } : {}),
                }}
                className="block h-full focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function OtdSparkline({
  trend,
}: {
  trend: {
    weeks: { week: string; rate: number | null; count: number }[];
    delta: number;
  };
}) {
  const validRates = trend.weeks.map((w) => (w.rate !== null ? w.rate : 0));
  const minRate = Math.min(80, ...validRates);
  const maxRate = Math.max(100, ...validRates);
  const range = Math.max(1, maxRate - minRate);

  const points = trend.weeks
    .map((w, idx) => {
      const x = 4 + idx * 17;
      const r = w.rate ?? minRate;
      const y = 16 - ((r - minRate) / range) * 14;
      return `${x},${y}`;
    })
    .join(' ');

  const isUp = trend.delta >= 0;

  return (
    <div className="my-1.5 flex items-center justify-between border-t border-border/50 pt-1.5">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-muted-foreground uppercase">Xu hướng 4W:</span>
        <svg className="h-4.5 w-15 overflow-visible" viewBox="0 0 60 18" aria-hidden>
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isUp ? 'text-primary' : 'text-warning'}
            points={points}
          />
          {trend.weeks.map((w, idx) => {
            const x = 4 + idx * 17;
            const r = w.rate ?? minRate;
            const y = 16 - ((r - minRate) / range) * 14;
            return (
              <circle
                key={w.week}
                cx={x}
                cy={y}
                r="1.75"
                className={idx === 3 ? (isUp ? 'fill-primary' : 'fill-warning') : 'fill-muted-foreground'}
              />
            );
          })}
        </svg>
      </div>
      <span
        className={`font-mono text-[10px] font-bold tabular-nums inline-flex items-center gap-0.5 ${isUp ? 'text-primary' : 'text-warning'
          }`}
      >
        {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
        {trend.delta > 0 ? `+${trend.delta}%` : `${trend.delta}%`}
      </span>
    </div>
  );
}

function Kpi({
  code,
  icon,
  label,
  value,
  detail,
  tone,
  to,
  meter,
  readOnly,
  badge,
  extra,
}: {
  code?: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: 'blue' | 'green' | 'red' | 'amber';
  to?: Focus;
  meter?: number | undefined;
  readOnly?: boolean;
  badge?: string;
  extra?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const cardContent = (
    <div
      className={`relative flex h-full flex-col justify-between rounded-xs border border-border bg-card p-3 shadow-2xs transition-all ${to
          ? 'hover:border-primary/60 hover:bg-accent/20 cursor-pointer'
          : readOnly
            ? 'cursor-default'
            : 'hover:border-primary/40'
        }`}
    >
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {code && <span className="font-mono text-[10px] font-bold text-primary/80">{code}</span>}
            <p className="text-[10px] font-bold tracking-[.14em] text-muted-foreground uppercase font-mono truncate">{label}</p>
            {badge && (
              <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-xs border border-border/80 bg-muted/40 text-muted-foreground">
                [{badge}]
              </span>
            )}
          </div>
          <span className={tone === 'blue' ? 'text-info' : tone === 'green' ? 'text-primary' : tone === 'red' ? 'text-destructive' : 'text-warning'}>
            {icon}
          </span>
        </div>
        <p className="font-mono text-xl sm:text-2xl font-black tracking-tight tabular-nums text-foreground">{value}</p>
      </div>
      <div>
        {meter !== undefined && (
          <div className="relative my-1.5 h-1.5 overflow-hidden rounded-xs bg-secondary">
            <span
              className={`absolute inset-y-0 left-0 rounded-xs transition-all ${meter >= 0.95 ? 'bg-primary' : 'bg-warning'}`}
              style={{ width: `${meter * 100}%` }}
            />
            <span className="absolute -top-0.5 h-2.5 w-0.5 bg-foreground" style={{ left: '95%' }} title={t('dashboard.tooltips.target95') || 'Mục tiêu 95%'} />
          </div>
        )}
        {extra}
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground font-mono">{detail}</p>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to="/tracking" search={{ focus: to }} className="block focus:outline-none focus:ring-1 focus:ring-primary h-full">
        {cardContent}
      </Link>
    );
  }
  return cardContent;
}

export function StatusDot({ status }: { status: string }) {
  const color = status === 'Đã nhập kho' ? 'bg-primary' : status === 'Đang tại Vendor' ? 'bg-info' : status === 'Kiểm tra QC' ? 'bg-warning' : 'bg-muted-foreground';
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-foreground">
      <i className={`size-1.5 rounded-full ${color}`} />
      {status}
    </span>
  );
}

function ShiftHandoverModal({
  open,
  onClose,
  workshop,
  openLots,
  overdueLots,
  otdRate,
  role,
}: {
  open: boolean;
  onClose: () => void;
  workshop: string;
  openLots: QTItem[];
  overdueLots: QTItem[];
  otdRate: number;
  role: Role;
}) {
  const { t, locale } = useTranslation();
  const shift = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 6 && h < 14) return 'Ca 1 (06:00 - 14:00)';
    if (h >= 14 && h < 22) return 'Ca 2 (14:00 - 22:00)';
    return 'Ca 3 (22:00 - 06:00)';
  }, []);

  const [giver, setGiver] = useState(() => {
    try {
      return (
        window.localStorage.getItem('dynamo_handover_giver') ||
        (role === 'admin'
          ? 'Quản đốc hệ thống'
          : (role as string) === 'qa'
            ? 'Trưởng ca QC / KCS'
            : (role as string) === 'operator'
              ? 'Kỹ thuật viên xưởng'
              : '')
      );
    } catch {
      return '';
    }
  });
  const [receiver, setReceiver] = useState(() => {
    try {
      return window.localStorage.getItem('dynamo_handover_receiver') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      if (giver) window.localStorage.setItem('dynamo_handover_giver', giver);
    } catch { }
  }, [giver]);

  useEffect(() => {
    try {
      if (receiver) window.localStorage.setItem('dynamo_handover_receiver', receiver);
    } catch { }
  }, [receiver]);

  const totalKg = openLots.reduce((a, r) => a + r.kg_Lot, 0);

  const handlePrint = () => {
    playAudioCue('success');
    window.print();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'p' || e.key === 'P') && !['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        handlePrint();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="job-ticket-dialog handover-dialog max-h-[94vh] w-[96vw] max-w-4xl overflow-y-auto p-6 shadow-2xs rounded-xs border border-border bg-card">
        <DialogTitle className="sr-only">{t('dashboard.handover.dialogTitle') || 'Biên bản bàn giao ca sản xuất A4'}</DialogTitle>
        <DialogDescription className="sr-only">
          {t('dashboard.handover.dialogSubtitle') || 'Chuẩn hóa thông tin ca trực theo tiêu chuẩn MES Dynamo SOP-MES-08'}
        </DialogDescription>

        {/* Modal Toolbar (hidden during print) */}
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xs bg-primary/10 text-primary">
              <FileText size={18} />
            </span>
            <div>
              <h2 className="text-base font-black text-foreground">{t('dashboard.handover.dialogTitle') || 'Biên bản bàn giao ca sản xuất A4'}</h2>
              <p className="text-xs text-muted-foreground">{t('dashboard.handover.dialogSubtitle') || 'Chuẩn hóa thông tin ca trực theo tiêu chuẩn MES Dynamo'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xs bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 cursor-pointer"
            >
              <Printer size={15} /> {t('dashboard.handover.printBtn') || 'In báo cáo (A4)'} <span className="opacity-75 text-[10px] ml-1 font-mono">{t('dashboard.handover.printShortcut') || '(P)'}</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-xs border border-border p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              aria-label={t('common.close') || 'Đóng'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Input Controls for Shift Info (no-print) */}
        <div className="no-print mb-6 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xs border border-border bg-secondary/30 p-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">{t('dashboard.handover.shiftLabel') || 'Ca trực (Khóa giờ thực tế):'}</label>
            <div className="flex h-8 items-center gap-1.5 rounded-xs border border-border bg-background px-2.5 text-xs font-mono font-bold text-foreground">
              <Lock size={12} className="text-primary" />
              <span>{shift}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono mt-0.5 block">{t('dashboard.handover.shiftDiscipline') || '* Kỷ luật xưởng: Khóa theo giờ máy'}</span>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">{t('dashboard.handover.giverLabel') || 'Người giao ca:'}</label>
            <input
              type="text"
              value={giver}
              onChange={(e) => setGiver(e.target.value)}
              placeholder={t('dashboard.handover.giverPlaceholder') || 'VD: Nguyễn Văn A (Tổ trưởng)'}
              className="w-full h-8 rounded-xs border border-input bg-background px-2.5 text-xs text-foreground"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">{t('dashboard.handover.receiverLabel') || 'Người nhận ca:'}</label>
            <input
              type="text"
              value={receiver}
              onChange={(e) => setReceiver(e.target.value)}
              placeholder={t('dashboard.handover.receiverPlaceholder') || 'VD: Trần Văn B (Tổ trưởng)'}
              className="w-full h-8 rounded-xs border border-input bg-background px-2.5 text-xs text-foreground"
            />
          </div>
        </div>

        {/* Printable Sheet (single A4 layout) */}
        <div className="printable-job-ticket border border-border bg-card p-6 text-foreground rounded-xs font-sans text-xs">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-border pb-3 mb-4">
            <div>
              <p className="text-[11px] font-bold tracking-wider uppercase text-muted-foreground font-mono">
                {t('dashboard.handover.secCompany') || 'CÔNG TY TNHH DYNAMO VIỆT NAM · MES WORKSHOP'}
              </p>
              <h1 className="text-xl font-black tracking-tight text-foreground uppercase font-display">
                {t('dashboard.handover.docHeader') || 'BIÊN BẢN BÀN GIAO CA SẢN XUẤT & ĐỐI TÁC QT'}
              </h1>
              <p className="text-[11px] text-muted-foreground font-mono">
                {t('dashboard.handover.metaWorkshop') || 'Phân xưởng:'} <b className="text-foreground">{workshop}</b> · {t('dashboard.handover.metaCreatedAt') || 'Thời gian lập:'}{' '}
                {new Date().toLocaleString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN')}
              </p>
            </div>
            <div className="text-right font-mono">
              <span className="inline-flex items-center gap-1 rounded-xs border border-border px-2 py-0.5 text-xs font-black">
                {shift}
              </span>
              <p className="text-[10px] text-muted-foreground mt-1">{t('dashboard.handover.sopCode') || 'DYNAMO-SOP-MES-08'}</p>
            </div>
          </div>

          {/* Handover Metadata Grid */}
          <div className="grid grid-cols-4 gap-3 border border-border bg-secondary/40 p-3 mb-4 text-[11px]">
            <div>
              <span className="text-muted-foreground block">{t('orders.kpis.openLots') || 'Tổng lô đang mở:'}</span>
              <b className="font-mono text-base font-black tabular-nums">{number(openLots.length)} {t('common.units.lots') || 'lô'}</b>
            </div>
            <div>
              <span className="text-muted-foreground block">{t('dashboard.kpis.kpi3Title') || 'Tỷ lệ OTD đúng hạn:'}</span>
              <b className={`font-mono text-base font-black tabular-nums ${otdRate >= 95 ? 'text-run' : 'text-warning'}`}>
                {otdRate}%
              </b>
            </div>
            <div>
              <span className="text-muted-foreground block">{t('dashboard.kpis.kpi2Title') || 'Lô quá hạn cảnh báo:'}</span>
              <b className={`font-mono text-base font-black tabular-nums ${overdueLots.length ? 'text-destructive andon-pulse' : 'text-run'}`}>
                {overdueLots.length} {t('common.units.lots') || 'lô'}
              </b>
            </div>
            <div>
              <span className="text-muted-foreground block">{t('dashboard.summary.totalWeight') || 'Tổng trọng lượng:'}</span>
              <b className="font-mono text-base font-black tabular-nums">{number(totalKg, 1)} kg</b>
            </div>
          </div>

          {/* Shift Personnel Info */}
          <div className="grid grid-cols-2 gap-4 border-b border-border pb-3 mb-4 text-xs">
            <div>
              <span className="text-muted-foreground">{t('dashboard.handover.giverLabel') || 'Bên giao ca:'} </span>
              <b className="font-semibold text-foreground">{giver || (t('dashboard.handover.unspecifiedName') || 'Chưa điền họ tên')}</b>
            </div>
            <div>
              <span className="text-muted-foreground">{t('dashboard.handover.receiverLabel') || 'Bên nhận ca:'} </span>
              <b className="font-semibold text-foreground">{receiver || (t('dashboard.handover.unspecifiedName') || 'Chưa điền họ tên')}</b>
            </div>
          </div>

          {/* Urgent / Overdue Lots Table */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black tracking-wide uppercase text-foreground font-mono">
                {t('dashboard.handover.urgentLotsTitle') || 'DANH SÁCH LÔ TRỌNG ĐIỂM / CẦN THEO DÕI ĐẶC BIỆT'} ({Math.min(6, overdueLots.length)} / {overdueLots.length})
              </h3>
              {overdueLots.length > 6 && (
                <span className="text-[10px] text-muted-foreground font-mono italic">
                  {t('dashboard.handover.top6Overdue') || '* 6 lô trễ hạn nặng nhất'}
                </span>
              )}
            </div>
            <table className="w-full text-left text-[11px] border border-border">
              <thead className="bg-secondary/70 font-bold uppercase text-[9px] text-muted-foreground font-mono">
                <tr>
                  <th className="border-b border-border px-2 py-1.5">{t('tracking.columns.lotId') || 'Mã lô'}</th>
                  <th className="border-b border-border px-2 py-1.5">{t('tracking.columns.partNo') || 'Mã hàng'}</th>
                  <th className="border-b border-border px-2 py-1.5">{t('tracking.columns.orderNo') || 'Đơn hàng'}</th>
                  <th className="border-b border-border px-2 py-1.5">{t('tracking.columns.partner') || 'Đối tác QT'}</th>
                  <th className="border-b border-border px-2 py-1.5 text-right">{t('tracking.columns.weight') || 'SL (kg)'}</th>
                  <th className="border-b border-border px-2 py-1.5 text-right">{t('dashboard.bottlenecks.overdueCol') || 'Quá hạn'}</th>
                  <th className="border-b border-border px-2 py-1.5">{t('tracking.columns.notes') || 'Ghi chú bàn giao'}</th>
                </tr>
              </thead>
              <tbody>
                {overdueLots.length ? (
                  overdueLots.slice(0, 6).map((r) => (
                    <tr key={r.ID_Key} className="border-b border-border last:border-b-0 hover:bg-accent/20">
                      <td className="px-2 py-1 font-mono font-bold text-primary">{r.ID_Key}</td>
                      <td className="px-2 py-1 font-mono">{r.ma_hang}</td>
                      <td className="px-2 py-1 font-mono text-muted-foreground">{r.So_DatHang}</td>
                      <td className="px-2 py-1">{formatVendorName(r.cty_QT, role, locale)}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">{number(r.kg_Lot, 1)}</td>
                      <td className="px-2 py-1 text-right font-mono font-bold text-destructive tabular-nums">
                        {daysOver(r)} {t('common.units.days') || 'ngày'}
                      </td>
                      <td className="px-2 py-1 text-muted-foreground italic">{t('dashboard.handover.urgentCheckProgress') || 'Kiểm tra tiến độ giao hàng'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-2 py-3 text-center text-muted-foreground italic">
                      {t('dashboard.handover.noOverdueNotice') || 'Ca trực không có lô nào bị quá hạn. Tiến độ giao nhận đúng kế hoạch.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {overdueLots.length > 6 && (
              <p className="mt-1 text-[10px] text-muted-foreground italic font-mono">
                {t('dashboard.handover.a4Notice', { total: overdueLots.length }) || `* Báo cáo A4 rút gọn 6 lô quá hạn tiêu biểu. Vui lòng kiểm tra màn hình Luân chuyển (/tracking) để xem chi tiết toàn bộ ${overdueLots.length} lô quá hạn.`}
              </p>
            )}
          </div>

          {/* 4 Signatures Block */}
          <div className="mt-8 grid grid-cols-4 gap-2 pt-2 text-center text-[11px]">
            <div className="flex flex-col items-center">
              <span className="font-bold uppercase tracking-wider text-foreground font-mono text-[10px]">
                {t('dashboard.handover.signGiver') || 'Người giao ca'}
              </span>
              <span className="text-[10px] text-muted-foreground italic">{t('dashboard.handover.signNote') || '(Ký & ghi họ tên)'}</span>
              <div className="h-16 w-full" />
              <span className="font-semibold text-foreground">{giver || '..............................'}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold uppercase tracking-wider text-foreground font-mono text-[10px]">
                {t('dashboard.handover.signReceiver') || 'Người nhận ca'}
              </span>
              <span className="text-[10px] text-muted-foreground italic">{t('dashboard.handover.signNote') || '(Ký & ghi họ tên)'}</span>
              <div className="h-16 w-full" />
              <span className="font-semibold text-foreground">{receiver || '..............................'}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold uppercase tracking-wider text-foreground font-mono text-[10px]">
                {t('dashboard.handover.signQc') || 'Trưởng ca QC / KCS'}
              </span>
              <span className="text-[10px] text-muted-foreground italic">{t('dashboard.handover.signQcNote') || '(Xác nhận chất lượng)'}</span>
              <div className="h-16 w-full" />
              <span className="font-semibold text-foreground">..............................</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-bold uppercase tracking-wider text-foreground font-mono text-[10px]">
                {t('dashboard.handover.signSupervisor') || 'Quản đốc xưởng'}
              </span>
              <span className="text-[10px] text-muted-foreground italic">{t('dashboard.handover.signSupervisorNote') || '(Phê duyệt & lưu trữ)'}</span>
              <div className="h-16 w-full" />
              <span className="font-semibold text-foreground">..............................</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
