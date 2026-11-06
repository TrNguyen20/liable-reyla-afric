import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AlignJustify,
  ArrowLeft,
  Download,
  Layers,
  Package,
  Printer,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDynamo } from '@/components/dynamo-shell';
import { useTranslation } from '@/i18n';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { formatVendorName, canViewPricing } from '@/lib/dynamo-auth';
import { isMaterialEquivalent } from '@/lib/materials-data';
import { StatusDot } from './dashboard';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { JobTicketButton, BatchJobTicketModal } from '@/components/job-ticket';
import { daysOver, isDueSoon, isMissingDue, isOverdue, isOpen, isDone } from '@/lib/dynamo-rules';

const dueTag = (i: QTItem, t?: (k: string, p?: any) => string) =>
  isOverdue(i)
    ? { t: t ? (t('tracking.dueTags.overdueDays', { days: daysOver(i) }) || `Quá hạn ${daysOver(i)}d`) : `Quá hạn ${daysOver(i)}d`, c: 'border-destructive/60 bg-destructive/15 text-destructive font-bold' }
    : isDueSoon(i)
    ? { t: t ? (t('tracking.dueTags.dueSoon48') || 'Cận hạn 48h') : 'Cận hạn 48h', c: 'border-warning/60 bg-warning/15 text-warning font-bold' }
    : isMissingDue(i)
    ? { t: i.han_tra_est ? (t ? (t('tracking.dueTags.estDue') || 'Hạn ước tính') : 'Hạn ước tính') : (t ? (t('tracking.dueTags.missingDue') || 'Thiếu hạn trả') : 'Thiếu hạn trả'), c: 'border-border bg-secondary text-muted-foreground' }
    : null;

export const Route = createFileRoute('/orders')({
  head: () => ({
    meta: [
      { title: 'Đơn đặt hàng | DYNAMO VIETNAM QT - MES' },
      { name: 'description', content: 'Chi tiết đơn đặt hàng và linh kiện gia công nhiệt luyện, xi mạ.' },
      { property: 'og:title', content: 'Đơn đặt hàng | DYNAMO VIETNAM QT - MES' },
      { property: 'og:description', content: 'Tra cứu đơn đặt hàng và chi tiết linh kiện QT.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { material?: string } => ({
    ...(typeof s['material'] === 'string' && s['material'].trim() ? { material: s['material'].trim() } : {}),
  }),
  component: Orders,
});

const LIST_LIMIT = 100;
const ROW_LIMIT = 200;

type TableDensity = 'compact' | 'normal';
type SubFilter = 'all' | 'overdue' | 'due_soon' | 'open' | 'done';

function Orders() {
  const { t, locale } = useTranslation();
  const { filtered, role, sourceLabel, syncedAt, pullLive, loading } = useDynamo();
  const search = Route.useSearch();
  const [materialFilter, setMaterialFilter] = useState<string | null>(search.material ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');
  const [density, setDensity] = useState<TableDensity>('compact');
  const [subFilter, setSubFilter] = useState<SubFilter>('all');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);

  const isPricingAllowed = canViewPricing(role);

  useEffect(() => {
    setMaterialFilter(search.material ?? null);
  }, [search.material]);

  const { groups, byOrder } = useMemo(() => {
    const byOrder = new Map<string, QTItem[]>();
    for (const i of filtered) {
      if (materialFilter && !isMaterialEquivalent(i.vat_lieu, materialFilter)) continue;
      const list = byOrder.get(i.So_DatHang);
      if (list) list.push(i);
      else byOrder.set(i.So_DatHang, [i]);
    }
    const q = localSearch.trim().toLowerCase();
    const groups = [...byOrder.keys()]
      .sort()
      .reverse()
      .filter((id) => !q || id.toLowerCase().includes(q) || Boolean(byOrder.get(id)?.some((i) => i.ma_hang.toLowerCase().includes(q))));
    return { groups, byOrder };
  }, [filtered, localSearch, materialFilter]);

  const active = selected && byOrder.has(selected) ? selected : groups[0];
  const allRows = active ? byOrder.get(active) ?? [] : [];

  // Keyboard navigation for desktop: ArrowUp / ArrowDown to browse orders
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (!groups.length) return;

      const currentIndex = groups.indexOf(active ?? '');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex < groups.length - 1 ? currentIndex + 1 : 0;
        setSelected(groups[nextIndex] ?? null);
        setSubFilter('all');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : groups.length - 1;
        setSelected(groups[prevIndex] ?? null);
        setSubFilter('all');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, groups]);

  const filteredRows = useMemo(() => {
    if (subFilter === 'overdue') return allRows.filter((r) => isOverdue(r));
    if (subFilter === 'due_soon') return allRows.filter((r) => isDueSoon(r));
    if (subFilter === 'open') return allRows.filter((r) => isOpen(r));
    if (subFilter === 'done') return allRows.filter((r) => isDone(r));
    return allRows;
  }, [allRows, subFilter]);

  const shown = filteredRows.slice(0, ROW_LIMIT);
  const first = allRows[0];
  const total = allRows.reduce((a, i) => a + i.thanh_tien, 0);
  const totalPcs = allRows.reduce((a, i) => a + i.so_luong, 0);
  const totalKg = allRows.reduce((a, i) => a + i.kg_Lot, 0);
  const visibleGroups = groups.slice(0, LIST_LIMIT);

  const doneLots = allRows.filter((r) => isDone(r)).length;
  const progressPercent = allRows.length > 0 ? Math.round((doneLots / allRows.length) * 100) : 0;

  const counts = useMemo(
    () => ({
      all: allRows.length,
      overdue: allRows.filter((r) => isOverdue(r)).length,
      due_soon: allRows.filter((r) => isDueSoon(r)).length,
      open: allRows.filter((r) => isOpen(r)).length,
      done: allRows.filter((r) => isDone(r)).length,
    }),
    [allRows],
  );

  const exportCsv = () => {
    const keys: (keyof QTItem)[] = [
      'ID_Key',
      'phong_sx',
      'ma_hang',
      'so_luong',
      'vat_lieu',
      'do_cung',
      'Kich_Thuoc_SP',
      'kg_Lot',
      'don_vi_tinh',
      ...(isPricingAllowed ? (['don_gia', 'thanh_tien'] as (keyof QTItem)[]) : []),
      'ngay_gui_QT',
      'cty_QT',
      'TrangThai',
      'So_DatHang',
      'han_tra',
    ];
    const content = [
      keys.join(','),
      ...allRows.map((r) => keys.map((k) => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(',')),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
    a.download = `${active}-chi-tiet.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tableHeaders = [
    t('orders.headers.itemCode') || 'MÃ HÀNG',
    t('orders.headers.material') || 'MÁC THÉP / HRC',
    t('orders.headers.dimensions') || 'KÍCH THƯỚC',
    t('orders.headers.qty') || 'SL',
    t('orders.headers.weight') || 'KHỐI LƯỢNG',
    ...(isPricingAllowed ? [t('orders.headers.unitPrice') || 'ĐƠN GIÁ', t('orders.headers.totalAmount') || 'THÀNH TIỀN'] : []),
    t('tracking.columns.dueDate') || 'HẠN TRẢ',
    t('common.status') || 'TRẠNG THÁI',
    'PDF',
    t('orders.headers.actions') || 'THAO TÁC',
  ];

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2.5 overflow-hidden">
      {/* Sub-Header Wireframe Card (v2.2.0 Route 3) */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs">
        {/* Left: View Identity & Order Scope */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-black tracking-wider uppercase text-foreground">
            {t('nav.route3Title') || '[3] ĐƠN ĐẶT HÀNG'}
          </span>
          <span className="rounded-xs border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
            {number(groups.length)} {t('orders.orderCount', { count: '' }).trim() || 'ĐƠN'}
          </span>
          <span className="rounded-xs border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
            {number(filtered.length)} {t('orders.actions.partsCount', { count: '' }).trim() || 'LÔ LINH KIỆN'}
          </span>
        </div>

        {/* Right: Refresh & Realtime Telemetry Indicator */}
        <div className="flex items-center gap-2 text-[11px]">
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
            <span className="size-1.5 rounded-full bg-primary fx-run-dot" />
            <span className="font-mono text-[10px]">{sourceLabel}</span>
            {syncedAt ? (
              <span className="font-mono text-[10px] tabular-nums text-foreground/80">
                · {new Date(syncedAt).toLocaleTimeString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN', { hour12: false })}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Master-Detail Split Grid */}
      <div className="h-full flex-1 min-h-0 flex flex-col overflow-hidden rounded-xs border border-border bg-card shadow-2xs lg:grid lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[310px_minmax(0,1fr)]">
        {/* Left Side: Order Master List */}
        <div
          className={`${
            mobileView === 'detail' ? 'hidden' : 'flex'
          } lg:flex flex-col h-full min-h-0 border-b border-border bg-card/60 lg:border-b-0 lg:border-r overflow-hidden`}
        >
          {/* Search & Header Strip */}
          <div className="shrink-0 border-b border-border p-2.5 bg-secondary/20">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground font-mono">
                {t('orders.masterListTitle') || 'Danh sách đơn'}
              </h2>
              <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                {number(visibleGroups.length)} / {number(groups.length)}
              </span>
            </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder={t('orders.searchPlaceholder') || 'Lọc mã đơn, mã hàng...'}
              aria-label="Lọc danh sách đơn"
              className="h-8 w-full rounded-xs border border-input bg-background pl-8 pr-2.5 text-xs outline-none transition-colors focus:border-primary font-mono shadow-2xs"
            />
          </div>
          {materialFilter && (
            <div className="mt-1.5 flex items-center justify-between rounded-xs bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
              <span>
                {t('orders.headers.material') || 'Mác thép'}: <b>{materialFilter}</b>
              </span>
              <button
                type="button"
                onClick={() => setMaterialFilter(null)}
                className="rounded-xs p-0.5 hover:bg-primary/20 cursor-pointer"
                aria-label={t('tracking.actions.clearFilter') || 'Bỏ lọc mác thép'}
              >
                <X size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Order List */}
        <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-border/60">
          {visibleGroups.map((id) => {
            const g = byOrder.get(id)!;
            const overdueCount = g.filter((r) => isOverdue(r)).length;
            const dueSoonCount = g.filter((r) => isDueSoon(r)).length;
            const orderCost = g.reduce((a, i) => a + i.thanh_tien, 0);
            const orderPcs = g.reduce((a, i) => a + i.so_luong, 0);
            const isCurrent = active === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSelected(id);
                  setSubFilter('all');
                  setMobileView('detail');
                }}
                className={`w-full p-2.5 text-left transition-colors cursor-pointer ${
                  isCurrent ? 'border-l-2 border-l-primary bg-primary/10 shadow-inner' : 'hover:bg-accent/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono text-xs font-bold text-foreground">{id}</span>
                  <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums">
                    {overdueCount > 0 && (
                      <span className="rounded-xs bg-destructive/15 px-1 py-0.2 font-bold text-destructive">
                        {overdueCount} {t('dashboard.bottlenecks.overdueCol') || 'trễ'}
                      </span>
                    )}
                    {dueSoonCount > 0 && (
                      <span className="rounded-xs bg-warning/15 px-1 py-0.2 font-bold text-warning">
                        {dueSoonCount} {t('dashboard.bottlenecks.dueSoonCol') || 'cận'}
                      </span>
                    )}
                    <span className="text-muted-foreground">{g.length} {t('orders.actions.partsCount', { count: '' }).trim() || 'mã'}</span>
                  </div>
                </div>

                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span className="truncate max-w-[160px]">
                    {[...new Set(g.map((i) => i.phong_sx))].join(', ')} · {formatVendorName(g[0]?.cty_QT, role, locale)}
                  </span>
                  <span className="font-mono tabular-nums">{date(g[0]?.ngay_gui_QT ?? '')}</span>
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  {isPricingAllowed ? (
                    <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                      {money(orderCost)}
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-semibold tabular-nums text-foreground">
                      {number(orderPcs)} {t('common.units.pcs') || 'cái'}
                    </span>
                  )}
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {number(g.reduce((a, i) => a + i.kg_Lot, 0), 1)} kg
                  </span>
                </div>
              </button>
            );
          })}

          {groups.length > LIST_LIMIT && (
            <p className="p-3 text-center text-[10px] text-muted-foreground font-mono">
              Hiển thị {LIST_LIMIT}/{groups.length.toLocaleString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN')} đơn — lọc để tìm nhanh
            </p>
          )}
          {!groups.length && (
            <p className="p-6 text-center text-xs text-muted-foreground">
              {localSearch ? (t('orders.detail.emptyParts') || `Không tìm thấy đơn khớp "${localSearch}"`) : (t('orders.actions.noSelectedOrder') || 'Chưa có đơn hàng trong phạm vi lọc')}
            </p>
          )}
        </div>
      </div>

      {/* Right Side: Order Detail Cockpit */}
      <div
        className={`${
          mobileView === 'list' ? 'hidden' : 'flex'
        } lg:flex flex-col h-full min-h-0 min-w-0 bg-card overflow-hidden`}
      >
        {first ? (
          <>
            {/* Top Order Toolbar */}
            <div className="shrink-0 border-b border-border bg-secondary/25 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setMobileView('list')}
                  className="inline-flex lg:hidden items-center gap-1.5 rounded-xs border border-border bg-background px-2 py-1 text-xs font-bold text-foreground hover:bg-secondary cursor-pointer"
                >
                  <ArrowLeft size={13} /> {t('orders.masterListTitle') || 'Danh sách đơn'}
                </button>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-base xl:text-lg font-black tracking-tight text-foreground">
                    {active}
                  </span>
                  <span className="rounded-xs bg-primary/10 border border-primary/20 px-1.5 py-0.2 font-mono text-[10px] font-bold text-primary uppercase">
                    {t('tracking.columns.sentDate') || 'GỬI'} {date(first.ngay_gui_QT)}
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>·</span>
                  <span>{t('tracking.columns.partner') || 'Đối tác'}: <b className="text-foreground">{formatVendorName(first.cty_QT, role, locale)}</b></span>
                </div>

                {/* Inline Progress Bar */}
                <div className="hidden md:flex items-center gap-2 pl-2 border-l border-border/80">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">
                    {t('orders.progressPrefix') || 'Tiến độ:'}
                  </span>
                  <div className="h-2 w-24 xl:w-32 overflow-hidden rounded-xs border border-border bg-secondary">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                    {progressPercent}%
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    ({doneLots}/{allRows.length} {t('orders.progressSuffix') || 'lô hoàn tất'})
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Density toggle */}
                <div className="flex rounded-xs border border-border bg-background p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setDensity('compact')}
                    title={t('tracking.density.compact') || 'Chế độ nén dòng'}
                    className={`flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                      density === 'compact'
                        ? 'bg-card text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <AlignJustify size={12} /> {t('tracking.density.compact') || 'Nén'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDensity('normal')}
                    title={t('tracking.density.normal') || 'Chế độ dòng tiêu chuẩn'}
                    className={`flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${
                      density === 'normal'
                        ? 'bg-card text-foreground shadow-2xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Layers size={12} /> {t('tracking.density.normal') || 'Vừa'}
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBatchPrintOpen(true)}
                  className="h-7.5 px-2.5 gap-1.5 text-xs font-bold rounded-xs cursor-pointer"
                >
                  <Printer size={13} /> {t('orders.actions.printAll') || t('orders.actions.printOrderTickets') || 'In phiếu cả đơn'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                  className="h-7.5 px-2.5 gap-1.5 text-xs font-bold rounded-xs cursor-pointer"
                >
                  <Download size={13} /> {t('orders.actions.exportOrderCsv') || 'Xuất CSV'}
                </Button>
              </div>
            </div>

            {/* High-density Telemetry Stat Strip (Replaces bulky KPI tiles) */}
            <div className="shrink-0 h-8 border-b border-border bg-secondary/35 px-3.5 flex items-center gap-3 text-xs font-mono overflow-x-auto select-none">
              <span className="text-muted-foreground whitespace-nowrap">
                PX: <strong className="text-foreground">{[...new Set(allRows.map((i) => i.phong_sx))].join(', ')}</strong>
              </span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {t('tracking.columns.partner') || 'ĐỐI TÁC'}: <strong className="text-foreground">{formatVendorName(first.cty_QT, role, locale)}</strong>
              </span>
              <span className="text-border">|</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {t('orders.kpiTotalKg') || 'TỔNG KL'}: <strong className="text-foreground tabular-nums">{number(totalKg, 1)} kg</strong>
              </span>
              <span className="text-border">|</span>
              {isPricingAllowed ? (
                <span className="text-muted-foreground whitespace-nowrap">
                  {t('orders.kpis.totalValue') || t('orders.kpiTotalValue') || 'TỔNG GIÁ TRỊ'}: <strong className="text-primary font-black tabular-nums">{money(total)}</strong>
                </span>
              ) : (
                <span className="text-muted-foreground whitespace-nowrap">
                  {t('orders.kpis.totalQty') || t('orders.kpiTotalQty') || 'TỔNG SỐ LƯỢNG'}: <strong className="text-primary font-black tabular-nums">{number(totalPcs)} cái</strong>
                </span>
              )}
              <span className="text-border">|</span>
              <span className="text-muted-foreground whitespace-nowrap">
                {t('orders.detail.totalItems') || 'QUY CÁCH'}: <strong className="text-foreground tabular-nums">{allRows.length} {t('orders.actions.partsCount', { count: '' }).trim() || 'mã linh kiện'}</strong>
              </span>
            </div>

            {/* Sub-filter tab bar */}
            <div className="shrink-0 flex items-center gap-1.5 border-b border-border bg-secondary/15 px-3.5 py-1.5 text-xs overflow-x-auto select-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 font-mono">
                {t('common.view') || 'Xem'}:
              </span>
              <button
                type="button"
                onClick={() => setSubFilter('all')}
                className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  subFilter === 'all'
                    ? 'border-primary bg-primary text-primary-foreground font-bold'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('orders.subFilters.all', { count: counts.all }) || `Tất cả (${counts.all})`}
              </button>
              {counts.overdue > 0 && (
                <button
                  type="button"
                  onClick={() => setSubFilter('overdue')}
                  className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    subFilter === 'overdue'
                      ? 'border-destructive bg-destructive text-destructive-foreground'
                      : 'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20'
                  }`}
                >
                  {t('orders.subFilters.overdue', { count: counts.overdue }) || `Quá hạn (${counts.overdue})`}
                </button>
              )}
              {counts.due_soon > 0 && (
                <button
                  type="button"
                  onClick={() => setSubFilter('due_soon')}
                  className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    subFilter === 'due_soon'
                      ? 'border-warning bg-warning text-foreground'
                      : 'border-warning/40 bg-warning/10 text-warning hover:bg-warning/20'
                  }`}
                >
                  {t('orders.subFilters.due_soon', { count: counts.due_soon }) || `Cận hạn 48h (${counts.due_soon})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setSubFilter('open')}
                className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  subFilter === 'open'
                    ? 'border-info bg-info text-info-foreground font-bold'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('orders.subFilters.open', { count: counts.open }) || `Đang gia công (${counts.open})`}
              </button>
              <button
                type="button"
                onClick={() => setSubFilter('done')}
                className={`rounded-xs border px-2 py-0.5 font-mono text-[11px] transition-all cursor-pointer whitespace-nowrap ${
                  subFilter === 'done'
                    ? 'border-foreground bg-foreground text-background font-bold'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                {t('orders.subFilters.done', { count: counts.done }) || `Đã nhập kho (${counts.done})`}
              </button>
            </div>

            {/* Detail Items Table with 100% Flex-1 Scrollable Area */}
            <div className="flex-1 min-h-0 overflow-auto border-b border-border">
              <table className="w-full min-w-[950px] text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-border bg-secondary/95 backdrop-blur-xs text-[10px] font-bold tracking-wider text-muted-foreground uppercase font-mono">
                  <tr>
                    {tableHeaders.map((hdr) => (
                      <th key={hdr} className="px-3.5 py-2">
                        {hdr}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {shown.map((i) => {
                    const tag = dueTag(i, t);
                    const padY = density === 'compact' ? 'py-1.5' : 'py-2.5';
                    return (
                      <tr
                        key={i.ID_Key}
                        className={`align-top transition-colors hover:bg-accent/40 ${
                          isOverdue(i) ? 'bg-destructive/5' : ''
                        }`}
                      >
                        <td className={`px-3.5 ${padY}`}>
                          <p className="font-mono font-bold text-foreground">{i.ma_hang}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{i.ID_Key}</p>
                        </td>
                        <td className={`px-3.5 ${padY}`}>
                          <p className="font-semibold text-foreground font-mono">{i.vat_lieu}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{i.do_cung}</p>
                        </td>
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-muted-foreground`}>
                          {i.Kich_Thuoc_SP}
                        </td>
                        <td className={`px-3.5 ${padY} font-mono tabular-nums text-foreground`}>
                          {number(i.so_luong)}
                        </td>
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono tabular-nums text-foreground`}>
                          {number(i.kg_Lot, 1)} kg
                        </td>
                        {isPricingAllowed && (
                          <>
                            <td className={`whitespace-nowrap px-3.5 ${padY} font-mono tabular-nums text-foreground`}>
                              {money(i.don_gia)}
                              <span className="text-[10px] text-muted-foreground">/{i.don_vi_tinh}</span>
                            </td>
                            <td className={`whitespace-nowrap px-3.5 ${padY} font-mono font-bold tabular-nums text-foreground`}>
                              {money(i.thanh_tien)}
                            </td>
                          </>
                        )}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono tabular-nums`}>
                          {i.han_tra ? date(i.han_tra) : '—'}
                          {tag && (
                            <span className={`mt-0.5 block w-fit rounded-xs border px-1.5 py-0.2 text-[9px] ${tag.c}`}>
                              {tag.t}
                            </span>
                          )}
                        </td>
                        <td className={`px-3.5 ${padY}`}>
                          <StatusDot status={i.TrangThai} />
                        </td>
                        <td className={`px-3.5 ${padY}`}>
                          <JobTicketButton item={i} role={role} variant="icon" />
                        </td>
                        <td className={`px-3.5 ${padY}`}>
                          <LotUpdateButton item={i} variant="icon" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredRows.length > ROW_LIMIT && (
              <p className="shrink-0 border-t border-border px-4 py-1.5 text-[10px] text-muted-foreground font-mono bg-secondary/10">
                Hiển thị {ROW_LIMIT}/{filteredRows.length.toLocaleString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN')} dòng — xuất CSV để tải toàn bộ
              </p>
            )}

            {/* Bottom Summary Bar */}
            <div className="shrink-0 flex items-center justify-between border-t border-border bg-secondary/40 px-4 py-2 select-none">
              <span className="text-xs text-muted-foreground font-mono">
                {t('common.view') || 'Đang hiển thị'} {shown.length}/{filteredRows.length} {t('common.units.lots') || 'lô'}
              </span>
              <div className="flex items-center gap-3">
                {isPricingAllowed ? (
                  <>
                    <span className="text-xs font-semibold text-muted-foreground uppercase font-mono">{t('orders.kpis.totalValue') || t('orders.kpiTotalValue') || 'Tổng cộng đơn:'}</span>
                    <strong className="font-mono text-base font-black tabular-nums text-primary">{money(total)}</strong>
                  </>
                ) : (
                  <>
                    <span className="text-xs font-semibold text-muted-foreground uppercase font-mono">{t('orders.kpis.totalQty') || t('orders.kpiTotalQty') || 'Tổng linh kiện:'}</span>
                    <strong className="font-mono text-base font-black tabular-nums text-primary">
                      {number(totalPcs)} {t('common.units.pcs') || 'cái'}
                    </strong>
                  </>
                )}
              </div>
            </div>

            {/* Batch Job Tickets Modal */}
            <BatchJobTicketModal
              items={allRows}
              role={role}
              open={batchPrintOpen}
              onOpenChange={setBatchPrintOpen}
            />
          </>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-2.5 text-muted-foreground">
            <Package size={28} className="opacity-40" />
            <p className="text-xs font-semibold">{t('orders.detail.emptyParts') || 'Không có đơn hàng phù hợp bộ lọc'}</p>
          </div>
        )}
      </div>
    </div>
    </div>
  );
}