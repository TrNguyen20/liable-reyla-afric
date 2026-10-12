import { createFileRoute } from '@tanstack/react-router';
import { Fragment, useMemo, useState } from 'react';
import { AlertTriangle, BadgeCheck, ChevronDown, ChevronRight, CircleHelp, Wallet } from 'lucide-react';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
export const Route = createFileRoute('/audit-costs')({head:()=>({meta:[{title:'Đối soát chi phí | DYNAMO QT'},{name:'description',content:'Đối soát đơn giá gia công theo đối tác, mác thép và đơn vị tính.'},{property:'og:title',content:'Đối soát chi phí | DYNAMO QT'},{property:'og:description',content:'Phát hiện đơn giá lệch tham chiếu nội bộ trong lô gia công QT.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:Audit});

const THRESHOLD = 0.05;
type Verdict = 'flag' | 'ok' | 'insufficient';
type Group = { key: string; vendor: string; grade: string; unit: string; rows: QTItem[]; valid: QTItem[]; invalid: number; ref: number | null; maxDev: number | null; qty: number; verdict: Verdict };
const median = (v: number[]): number | null => { if (!v.length) return null; const s = [...v].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2; };
// Billing basis per source definition: Kg -> kg_Lot, pcs -> so_luong. Units never mix.
const qtyOf = (r: QTItem) => r.don_vi_tinh === 'Kg' ? r.kg_Lot : r.so_luong;

function Audit() {
  const { filtered, sourceLabel } = useDynamo();
  const [open, setOpen] = useState<string | null>(null);
  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, QTItem[]>();
    for (const i of filtered) { const k = `${i.cty_QT}|${i.vat_lieu}|${i.don_vi_tinh}`; const l = map.get(k); if (l) l.push(i); else map.set(k, [i]); }
    return [...map.entries()].map(([key, rows]) => {
      const valid = rows.filter(r => Number.isFinite(r.don_gia) && r.don_gia > 0);
      const ref = valid.length >= 2 ? median(valid.map(r => r.don_gia)) : null;
      const maxDev = ref ? Math.max(...valid.map(r => Math.abs(r.don_gia - ref) / ref)) : null;
      const verdict: Verdict = ref === null ? 'insufficient' : maxDev! > THRESHOLD ? 'flag' : 'ok';
      return { key, vendor: rows[0]!.cty_QT, grade: rows[0]!.vat_lieu, unit: rows[0]!.don_vi_tinh, rows, valid, invalid: rows.length - valid.length, ref, maxDev, qty: rows.reduce((a, r) => a + qtyOf(r), 0), verdict };
    }).sort((a, b) => ({ flag: 0, insufficient: 1, ok: 2 }[a.verdict] - { flag: 0, insufficient: 1, ok: 2 }[b.verdict]) || a.vendor.localeCompare(b.vendor));
  }, [filtered]);
  const total = filtered.reduce((a, i) => a + (Number.isFinite(i.thanh_tien) ? i.thanh_tien : 0), 0);
  const flagged = groups.filter(g => g.verdict === 'flag').length;
  const insufficient = groups.filter(g => g.verdict === 'insufficient').length;
  return <>
    <PageHeading eyebrow="KIỂM SOÁT / CHI PHÍ" title="Đối soát chi phí" description="So sánh đơn giá áp dụng với giá tham chiếu nội bộ theo đối tác, mác thép và đơn vị tính." />
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Kpi icon={<Wallet size={20} className="text-primary" />} label="TỔNG THÀNH TIỀN TẠM TÍNH" value={money(total)} hint={`Nguồn: ${sourceLabel} · ${number(filtered.length)} lô theo bộ lọc`} />
      <Kpi icon={<BadgeCheck size={20} className="text-info" />} label="NHÓM ĐƠN GIÁ" value={number(groups.length)} hint="Đối tác × mác thép × đơn vị" />
      <Kpi icon={<AlertTriangle size={20} className="text-warning" />} label={`NHÓM VƯỢT NGƯỠNG ${THRESHOLD * 100}%`} value={number(flagged)} hint="Cần rà soát, chưa phải kết luận sai phạm" />
      <Kpi icon={<CircleHelp size={20} className="text-muted-foreground" />} label="CHƯA ĐỦ CĂN CỨ" value={number(insufficient)} hint="Dưới 2 đơn giá hợp lệ để tham chiếu" />
    </div>
    <section className="border border-border bg-card">
      <div className="border-b border-border p-5">
        <h2 className="font-display text-base font-bold">Bảng đối soát đơn giá</h2>
        <p className="mt-1 text-xs text-muted-foreground">Giá tham chiếu = trung vị đơn giá hợp lệ (&gt; 0) trong cùng nhóm của dataset hiện hành — đây là tham chiếu nội bộ, <b>không phải bảng giá hợp đồng</b>. Ngưỡng cảnh báo đang dùng: lệch &gt; {THRESHOLD * 100}%. Nhấn một nhóm để xem các lô cấu thành.</p>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs">
        <thead className="bg-secondary/60 text-[10px] tracking-wide text-muted-foreground"><tr>{['', 'ĐỐI TÁC', 'MÁC THÉP', 'ĐƠN VỊ', 'SỐ LÔ', 'SẢN LƯỢNG', 'ĐƠN GIÁ ÁP DỤNG', 'GIÁ THAM CHIẾU', 'LỆCH LỚN NHẤT', 'ĐÁNH GIÁ'].map((x, i) => <th key={i} className="px-4 py-3 font-bold">{x}</th>)}</tr></thead>
        <tbody>{groups.map(g => { const isOpen = open === g.key; const prices = [...new Set(g.valid.map(x => x.don_gia))]; return <Fragment key={g.key}>
          <tr onClick={() => setOpen(isOpen ? null : g.key)} className={`cursor-pointer border-t border-border hover:bg-accent/50 ${g.verdict === 'flag' ? 'bg-warning/5' : ''}`}>
            <td className="px-4 py-4 text-muted-foreground">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
            <td className="px-4 py-4 font-semibold">{g.vendor}</td>
            <td className="px-4 py-4 font-mono">{g.grade}</td>
            <td className="px-4 py-4 text-muted-foreground">{g.unit}</td>
            <td className="px-4 py-4">{g.rows.length}</td>
            <td className="whitespace-nowrap px-4 py-4">{number(g.qty, 1)} {g.unit}</td>
            <td className="px-4 py-4 font-semibold">{prices.length ? prices.map(money).join(' / ') : '—'}{g.invalid > 0 && <p className="text-[10px] font-normal text-destructive">{g.invalid} lô thiếu/sai đơn giá</p>}</td>
            <td className="px-4 py-4 text-muted-foreground">{g.ref === null ? '—' : money(g.ref)}</td>
            <td className="px-4 py-4">{g.maxDev === null ? '—' : `${number(g.maxDev * 100, 1)}%`}</td>
            <td className="px-4 py-4">{g.verdict === 'flag' ? <span className="inline-flex items-center gap-1 font-semibold text-warning"><AlertTriangle size={13} /> Vượt ngưỡng</span> : g.verdict === 'ok' ? <span className="inline-flex items-center gap-1 text-primary"><BadgeCheck size={13} /> Trong ngưỡng</span> : <span className="inline-flex items-center gap-1 text-muted-foreground"><CircleHelp size={13} /> Chưa đủ căn cứ</span>}</td>
          </tr>
          {isOpen && <tr className="border-t border-border bg-secondary/40"><td colSpan={10} className="px-6 py-4">
            <p className="mb-2 text-[11px] text-muted-foreground">{g.verdict === 'flag' ? `Có lô lệch quá ${THRESHOLD * 100}% so với trung vị ${money(g.ref!)}/${g.unit}.` : g.verdict === 'ok' ? 'Mọi đơn giá hợp lệ nằm trong ngưỡng.' : 'Cần ít nhất 2 lô có đơn giá > 0 để lập tham chiếu.'} Sản lượng tính theo {g.unit === 'Kg' ? 'kg_Lot' : 'so_luong'}.</p>
            <table className="w-full text-[11px]"><thead className="text-muted-foreground"><tr>{['ID_Key', 'Mã hàng', 'Đơn hàng', 'Ngày gửi', 'Sản lượng', 'Đơn giá', 'Lệch', 'Thành tiền'].map(h => <th key={h} className="py-1 pr-4 text-left font-semibold">{h}</th>)}</tr></thead>
              <tbody>{g.rows.map(r => { const bad = !(r.don_gia > 0); const dev = !bad && g.ref ? (r.don_gia - g.ref) / g.ref : null; return <tr key={r.ID_Key} className="border-t border-border/60">
                <td className="py-1.5 pr-4 font-mono">{r.ID_Key}</td><td className="pr-4 font-mono">{r.ma_hang}</td><td className="pr-4">{r.So_DatHang}</td><td className="pr-4">{date(r.ngay_gui_QT)}</td><td className="pr-4">{number(qtyOf(r), 1)} {g.unit}</td>
                <td className={`pr-4 ${bad ? 'text-destructive' : ''}`}>{bad ? 'Thiếu / không hợp lệ' : money(r.don_gia)}</td>
                <td className={`pr-4 ${dev !== null && Math.abs(dev) > THRESHOLD ? 'font-semibold text-warning' : ''}`}>{dev === null ? '—' : `${dev > 0 ? '+' : ''}${number(dev * 100, 1)}%`}</td><td>{money(r.thanh_tien)}</td></tr>; })}</tbody></table>
          </td></tr>}
        </Fragment>; })}</tbody>
      </table>{!groups.length && <div className="p-10 text-center text-xs text-muted-foreground">Không có dữ liệu theo bộ lọc hiện tại</div>}</div>
    </section>
  </>;
}
function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint: string }) { return <div className="border border-border bg-card p-5"><div className="mb-4">{icon}</div><p className="text-[10px] font-bold tracking-wide text-muted-foreground">{label}</p><p className="mt-2 font-display text-2xl font-bold">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{hint}</p></div>; }

