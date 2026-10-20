import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Boxes, CircleAlert, Clock3, Filter, PackageCheck, RotateCcw, Wallet } from 'lucide-react';
import { useDynamo, PageHeading } from '@/components/dynamo-shell';
import { JobTicketButton } from '@/components/job-ticket';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';
import { daysOver, hasValidDue, isDone, isDueSoon, isMissingDue, isOpen, isOverdue, logisticsOf, onTimeRate, qcOf, type Logistics, type QcState } from '@/lib/dynamo-rules';
import { failedSyncIds } from '@/lib/dynamo-workflow';

export const Route = createFileRoute('/dashboard')({ head: () => ({ meta: [{title:'Tổng quan | DYNAMO QT'}, {name:'description',content:'Trung tâm điều hành luân chuyển gia công QT cho PIN, INSERT và MOLD.'}, {property:'og:title',content:'Tổng quan | DYNAMO QT'}, {property:'og:description',content:'Theo dõi lô mở, quá hạn, tỷ lệ đúng hạn và chi phí gia công QT.'}, {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary'}] }), component: Dashboard });

type Period = 'all' | 'this' | 'prev';
type Focus = 'overdue' | 'due_soon' | 'est_due' | 'sync_failed';
const sel = 'h-8.5 rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none transition-colors focus:border-primary';
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function Dashboard() {
  const { filtered, workshop, syncedAt, sourceLabel, role } = useDynamo();
  const [period, setPeriod] = useState<Period>('all');
  const [vendor, setVendor] = useState('all');
  const [logi, setLogi] = useState<'all' | Logistics>('all');
  const [qc, setQc] = useState<'all' | QcState>('all');
  const [failed, setFailed] = useState<Set<string>>(new Set());
  useEffect(() => { const f = () => setFailed(failedSyncIds()); f(); window.addEventListener('dynamo-audit', f); return () => window.removeEventListener('dynamo-audit', f); }, []);

  const rawVendors = useMemo(() => [...new Set(filtered.map(i => String(i.cty_QT)))].sort(), [filtered]);
  const now = new Date();
  const monthKey = period === 'this' ? ym(now) : period === 'prev' ? ym(new Date(now.getFullYear(), now.getMonth() - 1, 1)) : '';
  const rows = useMemo(() => filtered.filter(i => (!monthKey || i.ngay_gui_QT.startsWith(monthKey)) && (vendor === 'all' || i.cty_QT === vendor) && (logi === 'all' || logisticsOf(i) === logi) && (qc === 'all' || qcOf(i) === qc)), [filtered, monthKey, vendor, logi, qc]);

  const open = rows.filter(isOpen);
  const overdue = rows.filter(r => isOverdue(r)).sort((a, b) => daysOver(b) - daysOver(a));
  const soon = rows.filter(r => isDueSoon(r));
  const missing = rows.filter(isMissingDue);
  const stockedNoQc = rows.filter(r => isDone(r) && qcOf(r) !== 'Đạt');
  const qcFail = rows.filter(r => qcOf(r) === 'Không đạt');
  const syncErr = rows.filter(r => failed.has(r.ID_Key));
  const rate = onTimeRate(rows);
  const costRows = rows.filter(r => r.thanh_tien > 0);
  const cost = costRows.reduce((a, i) => a + i.thanh_tien, 0);
  const periodLabel = period === 'all' ? 'Toàn bộ dữ liệu' : `Tháng ${monthKey.slice(5)}/${monthKey.slice(0, 4)} (theo ngày gửi QT)`;

  const alerts: { label: string; reason: string; rows: QTItem[]; tone: string; focus?: Focus }[] = [
    { label: 'Quá hạn', reason: 'Chưa nhập kho, đã qua hạn trả chính thức', rows: overdue, tone: 'text-destructive', focus: 'overdue' },
    { label: 'Cận hạn 48h', reason: 'Hạn trả chính thức trong 2 ngày tới', rows: soon, tone: 'text-warning', focus: 'due_soon' },
    { label: 'Thiếu hạn trả', reason: 'Không có hạn trả hợp lệ từ nguồn — cần bổ sung', rows: missing, tone: 'text-warning', focus: 'est_due' },
    { label: 'Nhập kho chưa QC', reason: 'Đã về kho nhưng QC chưa đạt', rows: stockedNoQc, tone: 'text-info' },
    { label: 'QC không đạt', reason: 'Cần xử lý lại với đối tác gia công', rows: qcFail, tone: 'text-destructive' },
    { label: 'Ghi Sheet lỗi', reason: 'Lần cập nhật gần nhất chưa ghi được lên Sheet', rows: syncErr, tone: 'text-warning', focus: 'sync_failed' },
  ];

  const group = (key: (r: QTItem) => string) => {
    const m = new Map<string, QTItem[]>();
    for (const r of open) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
    return [...m.entries()].map(([name, list]) => ({ name, lots: list.length, kg: list.filter(r => r.don_vi_tinh === 'Kg').reduce((a, r) => a + r.kg_Lot, 0), pcs: list.filter(r => r.don_vi_tinh === 'pcs').reduce((a, r) => a + r.so_luong, 0), over: list.filter(r => isOverdue(r)).length, soon: list.filter(r => isDueSoon(r)).length })).sort((a, b) => b.over - a.over || b.lots - a.lots);
  };
  const reasonOf = (r: QTItem) => isOverdue(r) ? `Quá hạn ${daysOver(r)} ngày` : isDueSoon(r) ? 'Cận hạn 48h' : isMissingDue(r) ? 'Thiếu hạn trả' : failed.has(r.ID_Key) ? 'Ghi Sheet lỗi' : '';
  const actions = [...overdue, ...soon, ...missing, ...syncErr.filter(r => !isOverdue(r) && !isDueSoon(r) && !isMissingDue(r))].slice(0, 8);
  const reset = () => { setPeriod('all'); setVendor('all'); setLogi('all'); setQc('all'); };
  const filtersOn = period !== 'all' || vendor !== 'all' || logi !== 'all' || qc !== 'all';

  return <>
    <PageHeading
      eyebrow="TRUNG TÂM ĐIỀU HÀNH"
      title="Tổng quan luân chuyển QT"
      description={`${periodLabel} · ${workshop === 'Tất cả' ? 'Tất cả phân xưởng' : `Phân xưởng ${workshop}`}`}
      action={
        <div className="flex items-center gap-2 rounded-md border border-border/80 bg-card/60 px-3 py-1.5 text-xs text-muted-foreground shadow-2xs">
          <span className="size-2 rounded-full bg-primary" />
          <span>{sourceLabel}</span>
          {syncedAt ? <span className="font-mono text-[11px] tabular-nums text-foreground/80">· {new Date(syncedAt).toLocaleString('vi-VN')}</span> : <span className="text-[11px] opacity-75">· Chưa đồng bộ</span>}
        </div>
      }
    />

    {/* Filter Toolbar */}
    <div className="mb-5 flex flex-wrap items-center gap-2.5 rounded-lg border border-border bg-card/80 p-3 shadow-2xs">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Filter size={13} className="text-primary" />
        <span className="text-[11px] uppercase tracking-wider">Bộ lọc:</span>
      </div>
      <select aria-label="Kỳ báo cáo" className={sel} value={period} onChange={e => setPeriod(e.target.value as Period)}>
        <option value="all">Toàn bộ kỳ</option>
        <option value="this">Tháng này</option>
        <option value="prev">Tháng trước</option>
      </select>
      <select aria-label="Vendor" className={sel} value={vendor} onChange={e => setVendor(e.target.value)}>
        <option value="all">Tất cả đối tác</option>
        {rawVendors.map(v => <option key={v} value={v}>{formatVendorName(v, role)}</option>)}
      </select>
      <select aria-label="Trạng thái logistics" className={sel} value={logi} onChange={e => setLogi(e.target.value as Logistics)}>
        <option value="all">Mọi logistics</option>
        {(['Chờ xuất xưởng', 'Đang tại Vendor', 'Đã nhập kho'] as Logistics[]).map(s => <option key={s}>{s}</option>)}
      </select>
      <select aria-label="Trạng thái QC" className={sel} value={qc} onChange={e => setQc(e.target.value as QcState)}>
        <option value="all">Mọi QC</option>
        {(['Chưa kiểm tra', 'Đang kiểm tra', 'Đạt', 'Không đạt'] as QcState[]).map(s => <option key={s}>{s}</option>)}
      </select>
      {filtersOn && (
        <button onClick={reset} className="flex h-8.5 items-center gap-1 rounded-md px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10">
          <RotateCcw size={12} /> Đặt lại
        </button>
      )}
      <span className="ml-auto font-mono text-xs font-semibold tabular-nums text-muted-foreground">
        {number(rows.length)} lô
      </span>
    </div>

    {!rows.length ? (
      <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        Không có lô nào khớp bộ lọc. Hãy đổi kỳ báo cáo hoặc xóa bộ lọc.
      </div>
    ) : (
      <>
        {/* KPI Grid */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi icon={<Boxes size={18} />} label="LÔ ĐANG MỞ" value={number(open.length)} detail={`Chưa nhập kho / ${number(rows.length)} lô`} tone="blue" />
          <Kpi icon={<CircleAlert size={18} />} label="LÔ QUÁ HẠN" value={number(overdue.length)} detail={`${number(overdue.filter(r => daysOver(r) > 3).length)} trễ > 3d · bỏ qua ${number(missing.length)} thiếu hạn`} tone="red" to="overdue" />
          <Kpi icon={<PackageCheck size={18} />} label="TRẢ HÀNG ĐÚNG HẠN" value={rate.rate === null ? '—' : `${Math.round(rate.rate * 100)}%`} detail={`${number(rate.onTime)}/${number(rate.denominator)} lô · mục tiêu ≥ 95%`} tone="green" meter={rate.rate ?? undefined} />
          <Kpi icon={<Clock3 size={18} />} label="NHẬP KHO CHƯA QC" value={number(stockedNoQc.length)} detail="Đã về kho, QC chưa đạt" tone="amber" />
          <Kpi icon={<Wallet size={18} />} label="CHI PHÍ TẠM TÍNH" value={money(cost)} detail={`${number(costRows.length)} lô có giá · tạm tính nội bộ`} tone="amber" />
        </div>

        {/* Pipeline Process Flow */}
        <Pipeline rows={rows} />

        {/* Priority Alerts and Priority Actions */}
        <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.45fr]">
          <section className="rounded-lg border border-border bg-card p-5 shadow-2xs">
            <div className="mb-3.5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-extrabold text-foreground">Cảnh báo theo mức ưu tiên</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Bấm nhóm để lọc danh sách lô chi tiết</p>
              </div>
            </div>
            <div className="space-y-2">
              {alerts.map((a, i) => {
                const body = (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border/80 bg-background/70 p-3 transition-colors hover:border-primary/50 hover:bg-accent/40">
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${a.tone}`}>{i + 1}. {a.label}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{a.reason}</p>
                    </div>
                    <span className="shrink-0 font-mono text-lg font-bold tabular-nums text-foreground">{number(a.rows.length)}</span>
                  </div>
                );
                return a.focus && a.rows.length ? (
                  <Link key={a.label} to="/tracking" search={{ focus: a.focus }} className="block focus:outline-none focus:ring-1 focus:ring-primary">
                    {body}
                  </Link>
                ) : (
                  <div key={a.label} className={a.rows.length ? '' : 'opacity-50'}>{body}</div>
                );
              })}
            </div>
          </section>

          <section className="min-w-0 rounded-lg border border-border bg-card shadow-2xs">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-base font-extrabold text-foreground">Hành động ưu tiên</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Quá hạn → Cận hạn → Thiếu hạn trả → Lỗi ghi Sheet</p>
              </div>
              <Link to="/tracking" className="flex items-center gap-1 text-xs font-bold text-primary transition-transform hover:translate-x-0.5">
                Mở Luân chuyển <ArrowRight size={14} />
              </Link>
            </div>
            {actions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-xs">
                  <thead className="bg-secondary/70 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3">MÃ LÔ</th>
                      <th className="px-3 py-3">ĐƠN HÀNG</th>
                      <th className="px-3 py-3">ĐỐI TÁC</th>
                      <th className="px-3 py-3">XƯỞNG</th>
                      <th className="px-3 py-3">LOGISTICS / QC</th>
                      <th className="px-3 py-3">HẠN TRẢ</th>
                      <th className="px-4 py-3">CẢNH BÁO</th>
                      <th className="px-3 py-3 text-center">PHIẾU</th>
                      <th className="px-3 py-3 text-center">XỬ LÝ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map(r => (
                      <tr key={r.ID_Key} className="border-t border-border/70 transition-colors hover:bg-accent/30">
                        <td className="px-4 py-2.5 font-mono font-semibold text-primary">{r.ID_Key}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{r.So_DatHang}</td>
                        <td className="px-3 py-2.5 font-medium text-foreground">{formatVendorName(r.cty_QT, role)}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{r.phong_sx}</td>
                        <td className="px-3 py-2.5">
                          <span className="font-medium text-foreground">{logisticsOf(r)}</span>
                          <span className="block text-[10px] text-muted-foreground">QC: {qcOf(r)}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums">
                          {hasValidDue(r) ? date(r.han_tra) : <span className="text-warning font-semibold">Thiếu hạn</span>}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-destructive">{reasonOf(r)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <JobTicketButton item={r} role={role} variant="icon" />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <LotUpdateButton item={r} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-8 text-center text-xs text-muted-foreground">Không có lô cần xử lý trong phạm vi này.</p>
            )}
          </section>
        </div>

        {/* Bottleneck Analysis */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Bottleneck title="Điểm nghẽn theo đối tác gia công" rows={group(r => formatVendorName(String(r.cty_QT), role))} />
          <Bottleneck title="Điểm nghẽn theo phân xưởng" rows={group(r => r.phong_sx)} />
        </div>
      </>
    )}
  </>;
}

function Bottleneck({ title, rows }: { title: string; rows: { name: string; lots: number; kg: number; pcs: number; over: number; soon: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.lots));
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card shadow-2xs">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-display text-base font-extrabold text-foreground">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Chỉ tính lô đang mở · Đỏ = quá hạn, Vàng = cận hạn</p>
      </div>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-secondary/70 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-2.5">NHÓM</th>
                <th className="w-[30%] px-3 py-2.5">TẢI TRỌNG</th>
                <th className="px-3 py-2.5 text-right">SỐ LÔ</th>
                <th className="px-3 py-2.5 text-right">KG</th>
                <th className="px-3 py-2.5 text-right">PCS</th>
                <th className="px-3 py-2.5 text-right">QUÁ HẠN</th>
                <th className="px-5 py-2.5 text-right">CẬN HẠN</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.name} className="border-t border-border/70 transition-colors hover:bg-accent/20">
                  <td className="px-5 py-2.5 font-bold text-foreground">{r.name}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex h-2.5 overflow-hidden rounded-xs bg-secondary" style={{ width: `${(r.lots / max) * 100}%` }}>
                      <span className="bg-destructive" style={{ width: `${(r.over / r.lots) * 100}%` }} title={`Quá hạn: ${r.over}`} />
                      <span className="bg-warning" style={{ width: `${(r.soon / r.lots) * 100}%` }} title={`Cận hạn: ${r.soon}`} />
                      <span className="flex-1 bg-info/60" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums">{number(r.lots)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{number(r.kg, 1)}</td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums">{number(r.pcs)}</td>
                  <td className={`px-3 py-2.5 text-right font-mono tabular-nums ${r.over ? 'font-bold text-destructive' : ''}`}>{number(r.over)}</td>
                  <td className={`px-5 py-2.5 text-right font-mono tabular-nums ${r.soon ? 'font-bold text-warning' : ''}`}>{number(r.soon)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="p-6 text-center text-xs text-muted-foreground">Không có lô đang mở.</p>
      )}
    </section>
  );
}

function Pipeline({ rows }: { rows: QTItem[] }) {
  const stages = [
    { label: 'Chờ xuất xưởng', focus: undefined, test: (r: QTItem) => logisticsOf(r) === 'Chờ xuất xưởng', tone: 'bg-muted-foreground', textTone: 'text-muted-foreground' },
    { label: 'Đang tại Vendor', focus: undefined, test: (r: QTItem) => logisticsOf(r) === 'Đang tại Vendor', tone: 'bg-info', textTone: 'text-info' },
    { label: 'Về kho, chờ QC', focus: 'no_qc' as Focus, test: (r: QTItem) => isDone(r) && qcOf(r) !== 'Đạt', tone: 'bg-warning', textTone: 'text-warning' },
    { label: 'Hoàn tất (QC đạt)', focus: undefined, test: (r: QTItem) => isDone(r) && qcOf(r) === 'Đạt', tone: 'bg-primary', textTone: 'text-primary' },
  ].map(s => { const list = rows.filter(s.test); return { ...s, lots: list.length, kg: list.reduce((a, r) => a + r.kg_Lot, 0), late: list.filter(r => isOverdue(r)).length }; });
  const total = Math.max(1, stages.reduce((a, s) => a + s.lots, 0));

  return (
    <section className="mb-6 overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
      <div className="flex h-1.5">{stages.map(s => <span key={s.label} className={s.tone} style={{ width: `${(s.lots / total) * 100}%` }} />)}</div>
      <ol className="grid grid-cols-2 divide-x divide-border bg-border/40 sm:grid-cols-4">
        {stages.map((s, i) => {
          const content = (
            <div className="flex items-start gap-3 bg-card px-5 py-4 transition-all hover:bg-accent/30 group cursor-pointer h-full">
              <span className={`mt-1 size-2.5 shrink-0 rounded-xs ${s.tone} group-hover:scale-125 transition-transform`} aria-hidden />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold tracking-wide text-muted-foreground uppercase">{i + 1}. {s.label}</p>
                  <ArrowRight size={12} className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                  {number(s.lots)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">lô ({Math.round((s.lots / total) * 100)}%)</span>
                </p>
                <p className="mt-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {number(s.kg, 1)} kg
                  {s.late ? <b className="ml-2 font-bold text-destructive andon-pulse">{s.late} trễ hạn</b> : null}
                </p>
              </div>
            </div>
          );
          return (
            <li key={s.label}>
              {s.focus ? (
                <Link to="/tracking" search={{ focus: s.focus }} className="block h-full focus:outline-none">
                  {content}
                </Link>
              ) : (
                <Link to="/tracking" className="block h-full focus:outline-none">
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Kpi({ icon, label, value, detail, tone, to, meter }: { icon: React.ReactNode; label: string; value: string; detail: string; tone: 'blue' | 'green' | 'red' | 'amber'; to?: Focus; meter?: number | undefined }) {
  const cardContent = (
    <div className="relative flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4.5 shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
      <div>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold tracking-[.14em] text-muted-foreground uppercase">{label}</p>
          <span className={tone === 'blue' ? 'text-info' : tone === 'green' ? 'text-primary' : tone === 'red' ? 'text-destructive' : 'text-warning'}>
            {icon}
          </span>
        </div>
        <p className="font-mono text-2xl font-black tracking-tight tabular-nums text-foreground">{value}</p>
      </div>
      <div>
        {meter !== undefined && (
          <div className="relative my-2.5 h-1.5 overflow-hidden rounded-xs bg-secondary">
            <span className={`absolute inset-y-0 left-0 rounded-xs transition-all ${meter >= 0.95 ? 'bg-primary' : 'bg-warning'}`} style={{ width: `${meter * 100}%` }} />
            <span className="absolute -top-0.5 h-2.5 w-0.5 bg-foreground" style={{ left: '95%' }} title="Mục tiêu 95%" />
          </div>
        )}
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{detail}</p>
      </div>
    </div>
  );

  if (to) {
    return (
      <Link to="/tracking" search={{ focus: to }} className="block focus:outline-none focus:ring-1 focus:ring-primary">
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


