import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { auditFor, failedSyncIds } from '@/lib/dynamo-workflow';
import { ArrowRight, ChevronLeft, ChevronRight, CircleAlert, Download, GanttChart, PackageOpen, Table2, X } from 'lucide-react';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { date, daysLate, money, number, type QTItem } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';
import { daysOver, hasValidDue, isDueSoon, isOverdue, logisticsOf, qcOf, type Logistics, type QcState } from '@/lib/dynamo-rules';

export const Route = createFileRoute('/tracking')({
  head: () => ({ meta: [{ title: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' }, { name: 'description', content: 'Timeline giám sát lô gia công theo đơn hàng từ xuất xưởng đến nhập kho.' }, { property: 'og:title', content: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' }, { property: 'og:description', content: 'Theo dõi tiến độ và cảnh báo quá hạn gia công ngoài.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  validateSearch: (s: Record<string, unknown>): { focus?: Focus } => (FOCUS.some(f => f.key === s['focus']) ? { focus: s['focus'] as Focus } : {}),
  component: Tracking,
});

type Priority = 'critical' | 'warning' | 'due_soon' | 'on_track' | 'done';
const PRIORITIES: { key: Priority; label: string; dot: string; chip: string }[] = [
  { key: 'critical', label: 'Quá hạn > 3 ngày', dot: 'bg-destructive', chip: 'border-destructive/60 bg-destructive/15 text-destructive' },
  { key: 'warning', label: 'Trễ 1 – 3 ngày', dot: 'bg-warning', chip: 'border-warning/60 bg-warning/15 text-warning' },
  { key: 'due_soon', label: 'Cận hạn trong 48h', dot: 'bg-info', chip: 'border-info/60 bg-info/15 text-info' },
  { key: 'on_track', label: 'Đúng hạn (đang chạy)', dot: 'bg-primary', chip: 'border-primary/60 bg-primary/15 text-primary' },
  { key: 'done', label: 'Đã nhập kho', dot: 'bg-muted-foreground', chip: 'border-border bg-secondary text-muted-foreground' },
];
type Focus = 'overdue' | 'due_soon' | 'est_due' | 'sync_failed' | 'no_qc' | 'qc_fail';
const FOCUS: { key: Focus; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Quá hạn', tone: 'border-destructive/60 bg-destructive/15 text-destructive' },
  { key: 'due_soon', label: 'Cận hạn 48h', tone: 'border-warning/60 bg-warning/15 text-warning' },
  { key: 'est_due', label: 'Hạn trả ước tính', tone: 'border-border bg-secondary text-muted-foreground' },
  { key: 'sync_failed', label: 'Ghi Sheet lỗi', tone: 'border-warning/60 bg-warning/15 text-warning' },
  { key: 'no_qc', label: 'Nhập kho chưa QC', tone: 'border-info/60 bg-info/15 text-info' },
  { key: 'qc_fail', label: 'QC không đạt', tone: 'border-destructive/60 bg-destructive/15 text-destructive' },
];
const PAGE_SIZES = [10, 30, 50, 100];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY = 86400000;

// Priority uses the shared rules: estimated due dates never count as late or near-due.
function priorityOf(row: QTItem): Priority {
  if (row.TrangThai === 'Đã nhập kho') return 'done';
  if (!hasValidDue(row)) return 'on_track';
  const late = daysOver(row);
  if (late > 3) return 'critical';
  if (late > 0) return 'warning';
  if (late >= -2) return 'due_soon';
  return 'on_track';
}
const RANK: Record<Priority, number> = { critical: 0, warning: 1, due_soon: 2, on_track: 3, done: 4 };

function Tracking() {
  const { filtered: all, role } = useDynamo();

  const search = Route.useSearch();
  const [focus, setFocus] = useState<Focus | null>(search.focus ?? null);
  const [failed, setFailed] = useState<Set<string>>(new Set());
  useEffect(() => { const f = () => setFailed(failedSyncIds()); f(); window.addEventListener('dynamo-audit', f); return () => window.removeEventListener('dynamo-audit', f); }, []);
  useEffect(() => { setFocus(search.focus ?? null); }, [search.focus]);
  const inFocus = (r: QTItem, f: Focus) =>
    f === 'overdue' ? isOverdue(r) : f === 'due_soon' ? isDueSoon(r) : f === 'est_due' ? !!r.han_tra_est && r.TrangThai !== 'Đã nhập kho'
    : f === 'no_qc' ? r.TrangThai === 'Đã nhập kho' && qcOf(r) !== 'Đạt' : f === 'qc_fail' ? qcOf(r) === 'Không đạt' : failed.has(r.ID_Key);
  const focusCounts = useMemo(() => Object.fromEntries(FOCUS.map(f => [f.key, all.filter(r => inFocus(r, f.key)).length])) as Record<Focus, number>, [all, failed]);
  const filtered = useMemo(() => (focus ? all.filter(r => inFocus(r, focus)) : all), [all, focus, failed]);
  const [view, setView] = useState<'timeline' | 'table'>('timeline');
  const [orderLimit, setOrderLimit] = useState(30);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [detail, setDetail] = useState<QTItem | null>(null);
  const [picked, setPicked] = useState<Priority[]>([]);
  const [vendor, setVendor] = useState('all');
  const [logi, setLogi] = useState<'all' | Logistics>('all');
  const [qc, setQc] = useState<'all' | QcState>('all');
  const [missDue, setMissDue] = useState(false);
  const [sort, setSort] = useState<'priority' | 'han_tra' | 'ID_Key'>('priority');
  const [dateField, setDateField] = useState<'ngay_gui_QT' | 'han_tra'>('ngay_gui_QT');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pageSize, setPageSize] = useState(30);
  const [shown, setShown] = useState<Record<string, number>>({});
  const [tablePage, setTablePage] = useState(0);
  const [range, setRange] = useState<'all' | 'today' | 'week' | 'this' | 'prev' | 'custom'>('all');

  const enriched = useMemo(() => filtered.map((row) => ({ row, p: priorityOf(row) })), [filtered]);

  const rows = useMemo(() => {
    const set = new Set(picked);
    return enriched
      .filter(({ row, p }) => {
        if (set.size && !set.has(p)) return false;
        if (vendor !== 'all' && row.cty_QT !== vendor) return false;
        if (logi !== 'all' && logisticsOf(row) !== logi) return false;
        if (qc !== 'all' && qcOf(row) !== qc) return false;
        if (missDue && hasValidDue(row)) return false;
        const d = row[dateField];
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      })
      .sort((a, b) => sort === 'ID_Key' ? a.row.ID_Key.localeCompare(b.row.ID_Key)
        : sort === 'han_tra' ? a.row.han_tra.localeCompare(b.row.han_tra) || a.row.ID_Key.localeCompare(b.row.ID_Key)
        : RANK[a.p] - RANK[b.p] || a.row.han_tra.localeCompare(b.row.han_tra))
      .map((x) => x.row);
  }, [enriched, picked, vendor, logi, qc, missDue, dateField, from, to, sort]);

  const counts = useMemo(() => {
    const map = { critical: 0, warning: 0, due_soon: 0, on_track: 0, done: 0 } as Record<Priority, number>;
    for (const e of enriched) map[e.p]++;
    return map;
  }, [enriched]);

  const vendors = useMemo(() => [...new Set(all.map(i => String(i.cty_QT)))].sort(), [all]);
  const lateCount = useMemo(() => rows.filter((r) => isOverdue(r)).length, [rows]);
  const totalKg = useMemo(() => rows.reduce((a, i) => a + i.kg_Lot, 0), [rows]);

  const toggle = (p: Priority) => { setPicked((v) => (v.includes(p) ? v.filter((x) => x !== p) : [...v, p])); setShown({}); setTablePage(0); };
  const reset = () => { setPicked([]); setVendor('all'); setLogi('all'); setQc('all'); setMissDue(false); setSort('priority'); setFrom(''); setTo(''); setShown({}); setTablePage(0); };
  const preset = (kind: 'today' | 'week' | 'this' | 'prev' | 'all') => {
    const now = new Date();
    if (kind === 'all') { setFrom(''); setTo(''); }
    if (kind === 'today') { const t = ymd(now); setFrom(t); setTo(t); }
    if (kind === 'week') { setFrom(ymd(new Date(now.getTime() - 6 * DAY))); setTo(ymd(now)); }
    if (kind === 'this') { setFrom(ymd(new Date(now.getFullYear(), now.getMonth(), 1))); setTo(ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0))); }
    if (kind === 'prev') { setFrom(ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1))); setTo(ymd(new Date(now.getFullYear(), now.getMonth(), 0))); }
    setShown({}); setTablePage(0);
  };
  const shiftMonth = (dir: -1 | 1) => {
    const base = from ? new Date(from + 'T00:00:00') : new Date();
    const m = new Date(base.getFullYear(), base.getMonth() + dir, 1);
    setFrom(ymd(m)); setTo(ymd(new Date(m.getFullYear(), m.getMonth() + 1, 0))); setShown({}); setTablePage(0);
  };

  const exportCsv = () => {
    // Follows every active filter and the signed-in user's vendor scope (rows are already scoped).
    const head = ['ID_Key', 'So_DatHang', 'phong_sx', 'ma_hang', 'vat_lieu', 'do_cung', 'so_luong', 'kg_Lot', 'cty_QT', 'Logistics', 'QC', 'ngay_gui_QT', 'han_tra', 'Han_tra_uoc_tinh', 'Tre_ngay'];
    const body = rows.map((r) => [r.ID_Key, r.So_DatHang, r.phong_sx, r.ma_hang, r.vat_lieu, r.do_cung, r.so_luong, r.kg_Lot, r.cty_QT, logisticsOf(r), qcOf(r), r.ngay_gui_QT, r.han_tra, r.han_tra_est ? 1 : 0, hasValidDue(r) && isOverdue(r) ? daysOver(r) : 0].join(','));
    const url = URL.createObjectURL(new Blob(['\ufeff' + [head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'luan-chuyen-qt.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const tableRows = rows.slice(tablePage * pageSize, tablePage * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  return (
    <>
      <PageHeading
        eyebrow="GIÁM SÁT / LUÂN CHUYỂN"
        title="Theo dõi luân chuyển"
        description="Tiến độ từng lô hàng từ phân xưởng qua đối tác gia công đến nhập kho."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive"><CircleAlert size={15} />{number(lateCount)} lô quá hạn</span>
            <div className="flex border border-border">
              <button onClick={() => setView('timeline')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${view === 'timeline' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}><GanttChart size={14} /> Timeline</button>
              <button onClick={() => setView('table')} className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}><Table2 size={14} /> Bảng</button>
            </div>
          </div>
        }
      />

      <div className="mb-3.5 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="font-bold uppercase tracking-wider text-muted-foreground">Cần xử lý:</span>
        {FOCUS.map(f => (
          <button
            key={f.key}
            onClick={() => { setFocus(v => v === f.key ? null : f.key); setShown({}); setTablePage(0); }}
            aria-pressed={focus === f.key}
            className={`rounded-sm border px-2.5 py-1 text-xs font-semibold transition-all ${f.tone} ${focus === f.key ? 'ring-2 ring-primary ring-offset-1' : 'opacity-90 hover:opacity-100'}`}
          >
            {f.label} <b className="ml-1 font-mono tabular-nums">{number(focusCounts[f.key])}</b>
          </button>
        ))}
        {focus && (
          <button onClick={() => setFocus(null)} className="flex items-center gap-1 text-xs text-muted-foreground underline hover:text-foreground">
            <X size={12} /> Bỏ lọc
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/80 p-3 shadow-2xs">
        <details className="relative">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] font-semibold text-foreground">
            Ưu tiên: <b>{picked.length ? `${picked.length} đã chọn` : 'Tất cả'}</b>
            <ChevronRight size={12} className="rotate-90 text-muted-foreground" />
          </summary>
          <div className="absolute left-0 z-30 mt-1 w-64 rounded-md border border-border bg-popover p-1.5 shadow-lg">
            {PRIORITIES.map((p) => (
              <label key={p.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-[11px] hover:bg-accent">
                <input type="checkbox" checked={picked.includes(p.key)} onChange={() => toggle(p.key)} className="rounded" />
                <span className={`size-2 rounded-full ${p.dot}`} />
                <span>{p.label}</span>
                <b className="ml-auto font-mono tabular-nums text-foreground">{number(counts[p.key])}</b>
              </label>
            ))}
          </div>
        </details>

        <select value={dateField} onChange={(e) => { setDateField(e.target.value as 'ngay_gui_QT' | 'han_tra'); setShown({}); setTablePage(0); }} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
          <option value="ngay_gui_QT">Theo ngày gửi QT</option>
          <option value="han_tra">Theo hạn trả</option>
        </select>

        <select value={range} onChange={(e) => { const v = e.target.value as typeof range; setRange(v); if (v !== 'custom') preset(v); }} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
          <option value="all">Thời gian: Tất cả</option>
          <option value="today">Hôm nay</option>
          <option value="week">7 ngày qua</option>
          <option value="this">Tháng này</option>
          <option value="prev">Tháng trước</option>
          <option value="custom">Tùy chọn ngày…</option>
        </select>

        {range === 'custom' && (
          <div className="flex items-center gap-1.5">
            <button onClick={() => shiftMonth(-1)} aria-label="Tháng trước" className="rounded border border-input bg-background p-1.5 text-muted-foreground hover:text-foreground"><ChevronLeft size={14} /></button>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setShown({}); setTablePage(0); }} className="rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground" />
            <span className="text-[11px] text-muted-foreground">→</span>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setShown({}); setTablePage(0); }} className="rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground" />
            <button onClick={() => shiftMonth(1)} aria-label="Tháng sau" className="rounded border border-input bg-background p-1.5 text-muted-foreground hover:text-foreground"><ChevronRight size={14} /></button>
          </div>
        )}

        <select aria-label="Vendor" value={vendor} onChange={(e) => { setVendor(e.target.value); setShown({}); setTablePage(0); }} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
          <option value="all">Tất cả đối tác</option>
          {vendors.map(v => <option key={v} value={v}>{formatVendorName(v, role)}</option>)}
        </select>

        <select aria-label="Logistics" value={logi} onChange={(e) => { setLogi(e.target.value as Logistics); setShown({}); setTablePage(0); }} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
          <option value="all">Logistics: Tất cả</option>
          {(['Chờ xuất xưởng', 'Đang tại Vendor', 'Đã nhập kho'] as Logistics[]).map(l => <option key={l}>{l}</option>)}
        </select>

        <select aria-label="QC" value={qc} onChange={(e) => { setQc(e.target.value as QcState); setShown({}); setTablePage(0); }} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
          <option value="all">QC: Tất cả</option>
          {(['Chưa kiểm tra', 'Đang kiểm tra', 'Đạt', 'Không đạt'] as QcState[]).map(q => <option key={q}>{q}</option>)}
        </select>

        <label className="flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground">
          <input type="checkbox" checked={missDue} onChange={(e) => { setMissDue(e.target.checked); setTablePage(0); }} />
          <span>Thiếu hạn trả</span>
        </label>

        <select aria-label="Sắp xếp" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-md border border-input bg-background px-2 py-1.5 text-[11px] text-foreground outline-none">
          <option value="priority">Sắp xếp: Mức ưu tiên</option>
          <option value="han_tra">Sắp xếp: Hạn trả</option>
          <option value="ID_Key">Sắp xếp: Mã lô</option>
        </select>

        {(picked.length > 0 || from || to || vendor !== 'all' || logi !== 'all' || qc !== 'all' || missDue) && (
          <button onClick={() => { reset(); setRange('all'); }} className="flex items-center gap-1 rounded px-2 py-1 text-[11px] font-semibold text-primary hover:underline">
            <X size={12} /> Xóa lọc
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-mono tabular-nums text-foreground">{number(rows.length)} / {number(filtered.length)} lô khớp</span>
        <span className="size-1 rounded-full bg-border" />
        <span className="font-mono tabular-nums text-foreground">{number(totalKg, 1)} kg tổng khối lượng</span>
        <span className="size-1 rounded-full bg-border" />
        <span>Phân xưởng: {all.length ? [...new Set(all.map(i => i.phong_sx))].join(', ') : '—'}</span>
      </div>

      {view === 'timeline' ? (() => {
        const groups: { id: string; lots: QTItem[] }[] = [];
        const idx = new Map<string, number>();
        for (const r of rows) { const k = idx.get(r.So_DatHang); if (k === undefined) { idx.set(r.So_DatHang, groups.length); groups.push({ id: r.So_DatHang, lots: [r] }); } else groups[k]!.lots.push(r); }
        const visible = groups.slice(0, orderLimit);
        const today = ymd(new Date());
        let min = today, max = today;
        for (const g of visible) for (const l of g.lots) { if (l.ngay_gui_QT < min) min = l.ngay_gui_QT; const e = l.ngay_nhan ?? l.han_tra; if (e > max) max = e; if (l.han_tra > max) max = l.han_tra; }
        const t0 = new Date(min + 'T00:00:00').getTime(); const span = Math.max(DAY, new Date(max + 'T00:00:00').getTime() + DAY - t0);
        const pos = (d: string) => ((new Date(d + 'T00:00:00').getTime() - t0) / span) * 100;
        const ticks = Array.from({ length: 6 }, (_, k) => ymd(new Date(t0 + (span * k) / 5)));
        const barColor: Record<Priority, string> = { critical: 'bg-destructive', warning: 'bg-warning', due_soon: 'bg-info', on_track: 'bg-primary/80', done: 'bg-muted-foreground/60' };
        return (
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
            <div className="grid grid-cols-[minmax(240px,320px)_1fr] border-b border-border bg-secondary/80 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              <div className="px-4 py-2.5">ĐƠN HÀNG / LÔ GIA CÔNG</div>
              <div className="relative h-8">
                {ticks.map((t, k) => (
                  <span key={k} className="absolute top-2 -translate-x-1/2 font-mono text-[10px] tabular-nums" style={{ left: `${Math.min(96, Math.max(4, k * 20))}%` }}>
                    {date(t)}
                  </span>
                ))}
              </div>
            </div>
            {visible.length ? visible.map((g) => {
              const open = !collapsed[g.id];
              const late = g.lots.filter((l) => isOverdue(l)).length;
              return (
                <div key={g.id} className="border-b border-border/70 last:border-b-0">
                  <button onClick={() => setCollapsed((c) => ({ ...c, [g.id]: open }))} className="grid w-full grid-cols-[minmax(240px,320px)_1fr] bg-secondary/40 text-left transition-colors hover:bg-secondary/70">
                    <span className="flex items-center gap-2 px-4 py-2.5">
                      <ChevronRight size={14} className={`text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
                      <b className="font-mono text-xs font-bold text-primary">{g.id}</b>
                      <span className="text-[11px] text-muted-foreground">
                        {g.lots.length} lô · {formatVendorName(g.lots[0]?.cty_QT, role)}
                      </span>
                    </span>
                    <span className="flex items-center px-4 text-[11px]">
                      {late > 0 && <b className="font-mono tabular-nums text-destructive">{late} lô trễ hạn</b>}
                    </span>
                  </button>
                  {open && g.lots.slice(0, 50).map((l) => {
                    const p = priorityOf(l);
                    const end = l.ngay_nhan ?? (today > l.ngay_gui_QT ? today : l.ngay_gui_QT);
                    const left = pos(l.ngay_gui_QT); const width = Math.max(1, pos(end) + (DAY / span) * 100 - left);
                    return (
                      <button key={l.ID_Key} onClick={() => setDetail(l)} className="grid w-full grid-cols-[minmax(240px,320px)_1fr] border-t border-border/50 text-left transition-colors hover:bg-accent/40">
                        <span className="min-w-0 px-4 py-2 pl-9">
                          <span className="block truncate font-mono text-[11px] font-bold text-foreground">{l.ma_hang}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {l.ID_Key} · {l.phong_sx} · {l.vat_lieu} · {logisticsOf(l)}
                            {qcOf(l) !== 'Chưa kiểm tra' ? ` · QC: ${qcOf(l)}` : ''}
                            {l.han_tra_est ? ' · Hạn ước tính' : ''}
                          </span>
                        </span>
                        <span className="relative my-2 mr-4 h-6">
                          <span className="absolute inset-y-0 w-0.5 bg-destructive/70" style={{ left: `${pos(today)}%` }} title="Hôm nay" />
                          <span className="absolute inset-y-0 w-0.5 border-l border-dashed border-muted-foreground/60" style={{ left: `${pos(l.han_tra) + (DAY / span) * 100}%` }} title={`Hạn trả ${date(l.han_tra)}`} />
                          <span
                            className={`absolute top-1 flex h-4.5 items-center overflow-hidden rounded-xs px-1.5 font-mono text-[9px] font-bold tabular-nums text-primary-foreground ${barColor[p]} ${p === 'critical' ? 'animate-pulse' : ''}`}
                            style={{ left: `${left}%`, width: `${width}%` }}
                          >
                            {isOverdue(l) ? `Trễ ${daysOver(l)}d` : ''}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {open && g.lots.length > 50 && (
                    <p className="px-9 py-2 font-mono text-[10px] text-muted-foreground">
                      +{g.lots.length - 50} lô khác — chuyển sang chế độ Bảng để xem toàn bộ
                    </p>
                  )}
                </div>
              );
            }) : (
              <div className="flex min-h-36 flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
                <PackageOpen size={24} className="opacity-40" />
                <p className="text-xs">Không có lô hàng khớp bộ lọc</p>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
              <span className="flex flex-wrap items-center gap-3">
                {PRIORITIES.map((p) => (
                  <span key={p.key} className="flex items-center gap-1.5">
                    <span className={`size-2 rounded-full ${p.dot}`} />
                    <span>{p.label}</span>
                  </span>
                ))}
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-0.5 bg-destructive" />
                  <span>Hôm nay</span>
                </span>
              </span>
              {groups.length > visible.length && (
                <button onClick={() => setOrderLimit((n) => n + pageSize)} className="rounded-md border border-border px-3 py-1 font-semibold text-primary transition-colors hover:bg-primary/10">
                  Đang xem {number(visible.length)} / {number(groups.length)} đơn — Tải thêm {pageSize} đơn
                </button>
              )}
            </div>
          </div>
        );
      })() : (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-xs">
              <thead className="bg-secondary/70 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  {['Mã lô', 'Đơn hàng', 'Xưởng', 'Mã hàng', 'Vật liệu', 'Độ cứng', 'SL', 'Kg', 'Đối tác', 'Logistics', 'QC', 'Ngày gửi', 'Hạn trả', 'Cảnh báo', 'Trễ'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3.5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.length ? tableRows.map((r) => (
                  <tr key={r.ID_Key} className="border-t border-border/70 transition-colors hover:bg-accent/40">
                    <td className="whitespace-nowrap px-3.5 py-3 font-mono font-bold text-primary">{r.ID_Key}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 font-mono text-muted-foreground">{r.So_DatHang}</td>
                    <td className="px-3.5 py-3 font-medium text-foreground">{r.phong_sx}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 font-mono font-bold text-foreground">{r.ma_hang}</td>
                    <td className="px-3.5 py-3 text-foreground">{r.vat_lieu}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 font-mono text-muted-foreground">{r.do_cung}</td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums text-foreground">{number(r.so_luong)}</td>
                    <td className="px-3.5 py-3 text-right font-mono tabular-nums text-foreground">{number(r.kg_Lot, 1)}</td>
                    <td className="px-3.5 py-3 font-medium text-foreground">{formatVendorName(r.cty_QT, role)}</td>
                    <td className="whitespace-nowrap px-3.5 py-3">{logisticsOf(r)}</td>
                    <td className="whitespace-nowrap px-3.5 py-3">{qcOf(r)}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 font-mono tabular-nums text-muted-foreground">{date(r.ngay_gui_QT)}</td>
                    <td className="whitespace-nowrap px-3.5 py-3 font-mono tabular-nums">
                      {date(r.han_tra)}
                      {r.han_tra_est && <span className="ml-1 text-[9px] text-warning" title="Hạn trả ước tính">+7d</span>}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3">
                      {!hasValidDue(r) && r.TrangThai !== 'Đã nhập kho' ? (
                        <span className="rounded-xs bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">Thiếu hạn</span>
                      ) : qcOf(r) === 'Không đạt' ? (
                        <span className="rounded-xs bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">QC lỗi</span>
                      ) : r.TrangThai === 'Đã nhập kho' && qcOf(r) !== 'Đạt' ? (
                        <span className="rounded-xs bg-info/15 px-1.5 py-0.5 text-[10px] font-bold text-info">Chưa QC</span>
                      ) : '—'}
                    </td>
                    <td className="px-3.5 py-3 font-mono tabular-nums">
                      {isOverdue(r) ? <b className="font-bold text-destructive">{daysOver(r)} ngày</b> : '—'}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={15} className="px-3.5 py-12 text-center text-xs text-muted-foreground">
                      Không có lô hàng khớp bộ lọc
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-2 font-mono tabular-nums">
              Đang xem {number(rows.length ? tablePage * pageSize + 1 : 0)} – {number(Math.min((tablePage + 1) * pageSize, rows.length))} / {number(rows.length)} lô
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setTablePage(0); }} className="rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground">
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} dòng/trang</option>)}
              </select>
              <button onClick={exportCsv} className="flex items-center gap-1.5 rounded border border-border bg-background px-2.5 py-1 font-semibold text-foreground hover:bg-accent">
                <Download size={13} /> Xuất CSV
              </button>
            </span>
            <div className="flex items-center gap-2">
              <button disabled={tablePage === 0} onClick={() => setTablePage((p) => p - 1)} className="rounded border border-border bg-background px-2.5 py-1 disabled:opacity-40 hover:bg-accent">
                Trang trước
              </button>
              <span className="font-mono tabular-nums">Trang {tablePage + 1} / {number(totalPages)}</span>
              <button disabled={tablePage + 1 >= totalPages} onClick={() => setTablePage((p) => p + 1)} className="rounded border border-border bg-background px-2.5 py-1 disabled:opacity-40 hover:bg-accent">
                Trang sau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inspector Detail Modal */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/80 backdrop-blur-xs p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="font-mono text-xs font-bold text-primary">{detail.So_DatHang}</p>
                <h3 className="font-mono text-xl font-black text-foreground">{detail.ma_hang}</h3>
              </div>
              <button onClick={() => setDetail(null)} aria-label="Đóng" className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-md border border-border/80 bg-secondary/30 p-4 text-xs">
              {([
                ['Mã lô', detail.ID_Key, true],
                ['Phân xưởng', detail.phong_sx, false],
                ['Kích thước SP', detail.Kich_Thuoc_SP, true],
                ['Mác thép', detail.vat_lieu, false],
                ['Độ cứng', detail.do_cung, true],
                ['Số lượng / Kg', `${number(detail.so_luong)} pcs · ${number(detail.kg_Lot, 1)} kg`, true],
                ['Đơn giá', `${money(detail.don_gia)}/${detail.don_vi_tinh}`, true],
                ['Thành tiền', money(detail.thanh_tien), true],
                ['Đối tác gia công', formatVendorName(detail.cty_QT, role), false],
                ['Logistics', logisticsOf(detail), false],
                ['QC', qcOf(detail), false],
                ['Ngày gửi', date(detail.ngay_gui_QT), true],
                ['Hạn trả', hasValidDue(detail) ? date(detail.han_tra) : `${date(detail.han_tra)} (ước tính)`, true],
                ['Ngày nhận', detail.ngay_nhan ? date(detail.ngay_nhan) : '—', true],
                ['Trễ hạn', isOverdue(detail) ? `${daysOver(detail)} ngày` : '—', true],
              ] as const).map(([k, v, isMono]) => (
                <div key={k}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className={`mt-0.5 font-semibold text-foreground ${isMono ? 'font-mono tabular-nums' : ''}`}>{v}</dd>
                </div>
              ))}
            </dl>
            {(() => {
              const live = all.find(r => r.ID_Key === detail.ID_Key) ?? detail;
              const log = auditFor(detail.ID_Key);
              return (
                <>
                  {live.han_tra_est && (
                    <p className="mt-3 text-[11px] text-warning">
                      Hạn trả là ước tính (+7 ngày sau ngày gửi) do nguồn dữ liệu chưa có cột hạn trả chính thức.
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-xs font-bold text-foreground">
                      Trạng thái hiện tại: <b className="text-primary">{live.TrangThai}</b>
                    </span>
                    <LotUpdateButton key={live.TrangThai + live.ngay_nhan} item={live} />
                  </div>
                  <h4 className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">Lịch sử thay đổi</h4>
                  {log.length ? (
                    <ol className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded border border-border/60 bg-background/50 p-2.5 text-[11px]">
                      {log.map(e => (
                        <li key={e.id} className="border-l-2 border-primary/50 pl-2">
                          <b className="font-mono tabular-nums">{new Date(e.at).toLocaleString('vi-VN')}</b> · {e.user} ({e.role}) — {e.result === 'ok' ? <span className="font-bold text-primary">Đã ghi Sheet</span> : <span className="font-bold text-destructive">Lỗi: {e.error}</span>}
                          <br />
                          {Object.entries(e.changes).map(([k, [a, b]]) => `${k}: ${a || '—'} → ${b || '—'}`).join('; ')}
                          {e.reason && <><br />Lý do: {e.reason}</>}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="mt-1 text-[11px] text-muted-foreground">Chưa có thay đổi nào được ghi nhận cho lô này.</p>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}

      <p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ArrowRight size={13} className="text-primary" /> Dữ liệu phản ánh nguồn đã áp dụng trong mục Đồng bộ; bảng tính gốc Google Sheets không bị ghi đè trực tiếp ngoài luồng cập nhật.
      </p>

    </>
  );
}

