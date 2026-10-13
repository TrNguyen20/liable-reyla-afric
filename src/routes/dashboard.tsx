import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Boxes, CircleAlert, Clock3, PackageCheck, Wallet } from 'lucide-react';
import { useDynamo, PageHeading } from '@/components/dynamo-shell';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { daysOver, hasValidDue, isDone, isDueSoon, isMissingDue, isOpen, isOverdue, logisticsOf, onTimeRate, qcOf, type Logistics, type QcState } from '@/lib/dynamo-rules';
import { failedSyncIds } from '@/lib/dynamo-workflow';

export const Route = createFileRoute('/dashboard')({ head: () => ({ meta: [{title:'Tổng quan | DYNAMO QT'}, {name:'description',content:'Trung tâm điều hành luân chuyển gia công QT cho PIN, INSERT và MOLD.'}, {property:'og:title',content:'Tổng quan | DYNAMO QT'}, {property:'og:description',content:'Theo dõi lô mở, quá hạn, tỷ lệ đúng hạn và chi phí gia công QT.'}, {property:'og:type',content:'website'}, {name:'twitter:card',content:'summary'}] }), component: Dashboard });

type Period = 'all' | 'this' | 'prev';
type Focus = 'overdue' | 'due_soon' | 'est_due' | 'sync_failed';
const sel = 'h-9 border border-input bg-background px-2 text-xs';
const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

function Dashboard() {
  const { filtered, workshop, syncedAt, sourceLabel } = useDynamo();
  const [period, setPeriod] = useState<Period>('all');
  const [vendor, setVendor] = useState('all');
  const [logi, setLogi] = useState<'all' | Logistics>('all');
  const [qc, setQc] = useState<'all' | QcState>('all');
  const [failed, setFailed] = useState<Set<string>>(new Set());
  useEffect(() => { const f = () => setFailed(failedSyncIds()); f(); window.addEventListener('dynamo-audit', f); return () => window.removeEventListener('dynamo-audit', f); }, []);

  const vendors = useMemo(() => [...new Set(filtered.map(i => String(i.cty_QT)))].sort(), [filtered]);
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
    { label: 'QC không đạt', reason: 'Cần xử lý lại với vendor', rows: qcFail, tone: 'text-destructive' },
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
    <PageHeading eyebrow="TRUNG TÂM ĐIỀU HÀNH" title="Tổng quan luân chuyển QT" description={`${periodLabel} · ${workshop === 'Tất cả' ? 'Tất cả phân xưởng' : `Phân xưởng ${workshop}`}`} action={<span className="text-xs text-muted-foreground">{sourceLabel}{syncedAt ? ` · đồng bộ ${new Date(syncedAt).toLocaleString('vi-VN')}` : ' · chưa đồng bộ từ nguồn thật'}</span>} />
    <div className="mb-5 flex flex-wrap items-center gap-2 border border-border bg-card p-3">
      <select aria-label="Kỳ báo cáo" className={sel} value={period} onChange={e => setPeriod(e.target.value as Period)}><option value="all">Toàn bộ kỳ</option><option value="this">Tháng này</option><option value="prev">Tháng trước</option></select>
      <select aria-label="Vendor" className={sel} value={vendor} onChange={e => setVendor(e.target.value)}><option value="all">Tất cả vendor</option>{vendors.map(v => <option key={v}>{v}</option>)}</select>
      <select aria-label="Trạng thái logistics" className={sel} value={logi} onChange={e => setLogi(e.target.value as Logistics)}><option value="all">Mọi trạng thái logistics</option>{(['Chờ xuất xưởng', 'Đang tại Vendor', 'Đã nhập kho'] as Logistics[]).map(s => <option key={s}>{s}</option>)}</select>
      <select aria-label="Trạng thái QC" className={sel} value={qc} onChange={e => setQc(e.target.value as QcState)}><option value="all">Mọi trạng thái QC</option>{(['Chưa kiểm tra', 'Đang kiểm tra', 'Đạt', 'Không đạt'] as QcState[]).map(s => <option key={s}>{s}</option>)}</select>
      {filtersOn && <button onClick={reset} className="h-9 px-3 text-xs font-medium text-primary hover:underline">Xóa bộ lọc</button>}
      <span className="ml-auto text-xs text-muted-foreground">{number(rows.length)} lô trong phạm vi</span>
    </div>

    {!rows.length ? <div className="border border-border bg-card p-10 text-center text-sm text-muted-foreground">Không có lô nào khớp bộ lọc. Hãy đổi kỳ báo cáo hoặc xóa bộ lọc.</div> : <>
      <div className="mb-4 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={<Boxes size={16} />} label="LÔ ĐANG MỞ" value={number(open.length)} detail={`Chưa nhập kho / ${number(rows.length)} lô`} tone="blue" />
        <Kpi icon={<CircleAlert size={16} />} label="LÔ QUÁ HẠN" value={number(overdue.length)} detail={`${number(overdue.filter(r => daysOver(r) > 3).length)} lô trễ > 3 ngày · không tính ${number(missing.length)} lô thiếu hạn`} tone="red" to="overdue" />
        <Kpi icon={<PackageCheck size={16} />} label="TRẢ HÀNG ĐÚNG HẠN" value={rate.rate === null ? '—' : `${Math.round(rate.rate * 100)}%`} detail={`${number(rate.onTime)}/${number(rate.denominator)} lô · mục tiêu ≥ 95%`} tone="green" meter={rate.rate ?? undefined} />
        <Kpi icon={<Clock3 size={16} />} label="NHẬP KHO CHƯA QC" value={number(stockedNoQc.length)} detail="Đã về kho, QC chưa đạt" tone="amber" />
        <Kpi icon={<Wallet size={16} />} label="CHI PHÍ TẠM TÍNH" value={money(cost)} detail={`${number(costRows.length)} lô có đơn giá · chưa phải chi phí thanh toán`} tone="amber" />
      </div>
      <Pipeline rows={rows} />

      <div className="mb-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_1.4fr]">
        <section className="border border-border bg-card p-5">
          <h2 className="font-display text-base font-bold">Cảnh báo theo mức ưu tiên</h2>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">Bấm một nhóm để mở danh sách lô</p>
          <div className="space-y-2">{alerts.map((a, i) => {
            const body = <div className="flex items-center justify-between gap-3 border border-border bg-background p-3"><div className="min-w-0"><p className={`text-xs font-semibold ${a.tone}`}>{i + 1}. {a.label}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{a.reason}</p></div><span className="shrink-0 font-mono text-lg font-semibold">{number(a.rows.length)}</span></div>;
            return a.focus && a.rows.length ? <Link key={a.label} to="/tracking" search={{ focus: a.focus }} className="block hover:ring-2 hover:ring-ring">{body}</Link> : <div key={a.label} className={a.rows.length ? '' : 'opacity-60'}>{body}</div>;
          })}</div>
        </section>
        <section className="min-w-0 border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="font-display text-base font-bold">Hành động ưu tiên</h2><p className="mt-1 text-xs text-muted-foreground">Quá hạn → cận hạn → thiếu hạn trả → lỗi ghi Sheet</p></div><Link to="/tracking" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">Mở Luân chuyển <ArrowRight size={14} /></Link></div>
          {actions.length ? <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="bg-secondary/60 text-[10px] font-semibold tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">MÃ LÔ</th><th className="px-3 py-3">ĐƠN HÀNG</th><th className="px-3 py-3">VENDOR</th><th className="px-3 py-3">XƯỞNG</th><th className="px-3 py-3">LOGISTICS / QC</th><th className="px-3 py-3">HẠN TRẢ</th><th className="px-4 py-3">LÝ DO</th></tr></thead><tbody>{actions.map(r => <tr key={r.ID_Key} className="border-t border-border/70"><td className="px-4 py-2.5 font-mono font-medium">{r.ID_Key}</td><td className="px-3 py-2.5 text-muted-foreground">{r.So_DatHang}</td><td className="px-3 py-2.5 text-muted-foreground">{r.cty_QT}</td><td className="px-3 py-2.5 text-muted-foreground">{r.phong_sx}</td><td className="px-3 py-2.5">{logisticsOf(r)}<span className="block text-[10px] text-muted-foreground">QC: {qcOf(r)}</span></td><td className="px-3 py-2.5">{hasValidDue(r) ? date(r.han_tra) : <span className="text-warning">Thiếu hạn trả</span>}</td><td className="px-4 py-2.5 font-medium text-destructive">{reasonOf(r)}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-xs text-muted-foreground">Không có lô cần xử lý trong phạm vi này.</p>}
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Bottleneck title="Điểm nghẽn theo vendor" rows={group(r => String(r.cty_QT))} />
        <Bottleneck title="Điểm nghẽn theo phân xưởng" rows={group(r => r.phong_sx)} />
      </div>
    </>}
  </>;
}

function Bottleneck({ title, rows }: { title: string; rows: { name: string; lots: number; kg: number; pcs: number; over: number; soon: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.lots));
  return <section className="min-w-0 border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="font-display text-base font-bold">{title}</h2><p className="mt-1 text-xs text-muted-foreground">Chỉ lô đang mở · thanh = số lô, phần đỏ = quá hạn</p></div>
    {rows.length ? <table className="w-full text-left text-xs"><thead className="bg-secondary/60 text-[10px] font-semibold tracking-wider text-muted-foreground"><tr><th className="px-5 py-2.5">NHÓM</th><th className="w-[30%] px-3 py-2.5">TẢI</th><th className="px-3 py-2.5 text-right">SỐ LÔ</th><th className="px-3 py-2.5 text-right">KG</th><th className="px-3 py-2.5 text-right">PCS</th><th className="px-3 py-2.5 text-right">QUÁ HẠN</th><th className="px-5 py-2.5 text-right">CẬN HẠN</th></tr></thead><tbody>{rows.map(r => <tr key={r.name} className="border-t border-border/70"><td className="px-5 py-2.5 font-semibold">{r.name}</td><td className="px-3 py-2.5"><div className="flex h-2" style={{ width: `${(r.lots / max) * 100}%` }}><span className="bg-destructive" style={{ width: `${(r.over / r.lots) * 100}%` }} /><span className="bg-warning" style={{ width: `${(r.soon / r.lots) * 100}%` }} /><span className="flex-1 bg-info/60" /></div></td><td className="px-3 py-2.5 text-right font-mono tabular-nums">{number(r.lots)}</td><td className="px-3 py-2.5 text-right font-mono tabular-nums">{number(r.kg, 1)}</td><td className="px-3 py-2.5 text-right font-mono tabular-nums">{number(r.pcs)}</td><td className={`px-3 py-2.5 text-right font-mono tabular-nums ${r.over ? 'font-semibold text-destructive' : ''}`}>{number(r.over)}</td><td className={`px-5 py-2.5 text-right font-mono tabular-nums ${r.soon ? 'text-warning' : ''}`}>{number(r.soon)}</td></tr>)}</tbody></table> : <p className="p-6 text-center text-xs text-muted-foreground">Không có lô đang mở.</p>}
  </section>;
}

function Pipeline({ rows }: { rows: QTItem[] }) {
  const stages = [
    { label: 'Chờ xuất xưởng', test: (r: QTItem) => logisticsOf(r) === 'Chờ xuất xưởng', tone: 'bg-muted-foreground' },
    { label: 'Đang gia công ngoài', test: (r: QTItem) => logisticsOf(r) === 'Đang tại Vendor', tone: 'bg-info' },
    { label: 'Về kho, chờ QC đạt', test: (r: QTItem) => isDone(r) && qcOf(r) !== 'Đạt', tone: 'bg-warning' },
    { label: 'Hoàn tất (QC đạt)', test: (r: QTItem) => isDone(r) && qcOf(r) === 'Đạt', tone: 'bg-primary' },
  ].map(s => { const list = rows.filter(s.test); return { ...s, lots: list.length, kg: list.reduce((a, r) => a + r.kg_Lot, 0), late: list.filter(r => isOverdue(r)).length }; });
  const total = Math.max(1, stages.reduce((a, s) => a + s.lots, 0));
  return <section className="mb-6 border border-border bg-card">
    <div className="flex h-2">{stages.map(s => <span key={s.label} className={s.tone} style={{ width: `${(s.lots / total) * 100}%` }} />)}</div>
    <ol className="grid grid-cols-2 gap-px bg-border md:grid-cols-4">{stages.map((s, i) => <li key={s.label} className="flex items-start gap-3 bg-card px-5 py-4">
      <span className={`mt-1 size-2.5 shrink-0 rounded-sm ${s.tone}`} aria-hidden />
      <div className="min-w-0"><p className="text-[11px] font-semibold text-muted-foreground">{i + 1}. {s.label}</p>
        <p className="mt-1 font-mono text-xl font-bold tabular-nums">{number(s.lots)} <span className="text-xs font-medium text-muted-foreground">lô · {Math.round((s.lots / total) * 100)}%</span></p>
        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{number(s.kg, 1)} kg{s.late ? <b className="ml-2 text-destructive">{s.late} quá hạn</b> : null}</p></div>
    </li>)}</ol>
  </section>;
}

function Kpi({icon,label,value,detail,tone,to,meter}:{icon:React.ReactNode;label:string;value:string;detail:string;tone:'blue'|'green'|'red'|'amber';to?:Focus;meter?:number}) { if (to) return <Link to="/tracking" search={{focus:to}} className="block bg-card hover:bg-accent/40"><Kpi icon={icon} label={label} value={value} detail={detail} tone={tone} meter={meter}/></Link>; const colors={blue:'text-info',green:'text-primary',red:'text-destructive',amber:'text-warning'}; return <div className="h-full bg-card px-5 py-4"><div className="mb-3 flex items-center justify-between gap-2"><p className="text-[10px] font-bold tracking-[.12em] text-muted-foreground">{label}</p><span className={colors[tone]}>{icon}</span></div><p className="font-mono text-2xl font-bold tabular-nums">{value}</p>{meter!==undefined&&<div className="relative mt-2 h-1 bg-border"><span className={`absolute inset-y-0 left-0 ${meter>=0.95?'bg-primary':'bg-warning'}`} style={{width:`${meter*100}%`}}/><span className="absolute -top-1 h-3 w-px bg-foreground" style={{left:'95%'}} title="Mục tiêu 95%"/></div>}<p className="mt-2 text-[11px] text-muted-foreground">{detail}</p></div> }
export function StatusDot({status}:{status:string}) {const color=status==='Đã nhập kho'?'bg-primary':status==='Đang tại Vendor'?'bg-info':status==='Kiểm tra QC'?'bg-warning':'bg-muted-foreground';return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px]"><i className={`size-1.5 rounded-full ${color}`}/>{status}</span>}

