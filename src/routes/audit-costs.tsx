import { createFileRoute } from '@tanstack/react-router';
import { Fragment, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  Lock,
  Search,
  ShieldAlert,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { JobTicketButton } from '@/components/job-ticket';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { canViewPricing, formatVendorName } from '@/lib/dynamo-auth';

export const Route = createFileRoute('/audit-costs')({
  head: () => ({
    meta: [
      { title: 'Đối soát chi phí | DYNAMO QT' },
      { name: 'description', content: 'Đối soát đơn giá gia công theo đối tác, mác thép và đơn vị tính.' },
      { property: 'og:title', content: 'Đối soát chi phí | DYNAMO QT' },
      { property: 'og:description', content: 'Phát hiện đơn giá lệch tham chiếu nội bộ trong lô gia công QT.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Audit,
});

const THRESHOLD = 0.05;
type Verdict = 'flag' | 'ok' | 'insufficient';
type SubFilter = 'all' | 'flag' | 'ok' | 'insufficient';

interface Group {
  key: string;
  vendor: string;
  grade: string;
  unit: string;
  rows: QTItem[];
  valid: QTItem[];
  invalid: number;
  ref: number | null;
  maxDev: number | null;
  qty: number;
  verdict: Verdict;
}

const median = (v: number[]): number | null => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  const mid = s[m];
  const prev = s[m - 1];
  if (s.length % 2) return mid !== undefined ? mid : null;
  return mid !== undefined && prev !== undefined ? (prev + mid) / 2 : null;
};

// Billing basis per source definition: Kg -> kg_Lot, pcs -> so_luong. Units never mix.
const qtyOf = (r: QTItem) => (r.don_vi_tinh === 'Kg' ? r.kg_Lot : r.so_luong);

function Audit() {
  const { filtered, sourceLabel, role } = useDynamo();
  const [open, setOpen] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [subFilter, setSubFilter] = useState<SubFilter>('all');

  const pricingAllowed = canViewPricing(role);

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, QTItem[]>();
    for (const i of filtered) {
      const k = `${i.cty_QT}|${i.vat_lieu}|${i.don_vi_tinh}`;
      const l = map.get(k);
      if (l) l.push(i);
      else map.set(k, [i]);
    }
    return [...map.entries()]
      .map(([key, rows]) => {
        const valid = rows.filter((r) => Number.isFinite(r.don_gia) && r.don_gia > 0);
        const ref = valid.length >= 2 ? median(valid.map((r) => r.don_gia)) : null;
        const maxDev = ref ? Math.max(...valid.map((r) => Math.abs(r.don_gia - ref) / ref)) : null;
        const verdict: Verdict = ref === null ? 'insufficient' : (maxDev ?? 0) > THRESHOLD ? 'flag' : 'ok';
        const first = rows[0];
        return {
          key,
          vendor: first?.cty_QT ?? '',
          grade: first?.vat_lieu ?? '',
          unit: first?.don_vi_tinh ?? '',
          rows,
          valid,
          invalid: rows.length - valid.length,
          ref,
          maxDev,
          qty: rows.reduce((a, r) => a + qtyOf(r), 0),
          verdict,
        };
      })
      .sort((a, b) => {
        const order: Record<Verdict, number> = { flag: 0, insufficient: 1, ok: 2 };
        return order[a.verdict] - order[b.verdict] || a.vendor.localeCompare(b.vendor);
      });
  }, [filtered]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter((g) => {
      if (subFilter !== 'all' && g.verdict !== subFilter) return false;
      if (q && !g.vendor.toLowerCase().includes(q) && !g.grade.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [groups, subFilter, search]);

  const total = filtered.reduce((a, i) => a + (Number.isFinite(i.thanh_tien) ? i.thanh_tien : 0), 0);
  const flagged = groups.filter((g) => g.verdict === 'flag').length;
  const insufficient = groups.filter((g) => g.verdict === 'insufficient').length;
  const okCount = groups.filter((g) => g.verdict === 'ok').length;

  const exportAuditCsv = () => {
    const head = [
      'DoiTac',
      'MacThep',
      'DonVi',
      'SoLo',
      'SanLuong',
      'DonGiaThamChieu',
      'DoLechToiDaPhanTram',
      'DanhGia',
    ];
    const body = filteredGroups.map((g) =>
      [
        `"${formatVendorName(g.vendor, role)}"`,
        `"${g.grade}"`,
        `"${g.unit}"`,
        g.rows.length,
        g.qty.toFixed(1),
        g.ref ? g.ref.toFixed(0) : '0',
        g.maxDev ? (g.maxDev * 100).toFixed(1) : '0',
        `"${g.verdict === 'flag' ? 'Vuot nguong' : g.verdict === 'ok' ? 'Trong nguong' : 'Chua du can cu'}"`,
      ].join(',')
    );

    const blob = new Blob(['\ufeff' + [head.join(','), ...body].join('\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doi-soat-chi-phi-dynamo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pricingAllowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-destructive/10 p-4 text-destructive">
          <Lock size={36} />
        </div>
        <h2 className="mt-4 font-display text-lg font-bold text-foreground">Khu vực kiểm soát tài chính bảo mật</h2>
        <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
          Trang đối soát chi phí chứa thông tin đơn giá hợp đồng và ngân sách thanh toán. Chỉ tài khoản Quản trị viên (Admin)
          hoặc Trưởng phân xưởng (Leader) mới có quyền truy cập.
        </p>
      </div>
    );
  }

  return (
    <>
      <PageHeading
        eyebrow="KIỂM SOÁT / CHI PHÍ"
        title="Đối soát chi phí"
        description="So sánh đơn giá áp dụng với giá tham chiếu nội bộ theo đối tác, mác thép và đơn vị tính."
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={exportAuditCsv}
            className="gap-1.5 font-bold text-xs"
          >
            <Download size={14} /> Xuất báo cáo lệch giá (CSV)
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Wallet size={20} className="text-primary" />}
          label="TỔNG THÀNH TIỀN TẠM TÍNH"
          value={money(total)}
          hint={`Nguồn: ${sourceLabel} · ${number(filtered.length)} lô theo bộ lọc`}
        />
        <Kpi
          icon={<BadgeCheck size={20} className="text-info" />}
          label="NHÓM ĐƠN GIÁ"
          value={number(groups.length)}
          hint="Đối tác × Mác thép × Đơn vị tính"
        />
        <Kpi
          icon={<AlertTriangle size={20} className="text-warning" />}
          label={`NHÓM VƯỢT NGƯỠNG ${THRESHOLD * 100}%`}
          value={number(flagged)}
          hint="Cần rà soát kiểm tra, chưa phải kết luận sai lệch"
          isWarning={flagged > 0}
        />
        <Kpi
          icon={<CircleHelp size={20} className="text-muted-foreground" />}
          label="CHƯA ĐỦ CĂN CỨ"
          value={number(insufficient)}
          hint="Dưới 2 đơn giá hợp lệ để lập trung vị tham chiếu"
        />
      </div>

      {/* Table Container */}
      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
        {/* Header & Sub-Filter Bar */}
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-extrabold text-foreground">Bảng đối soát đơn giá</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Giá tham chiếu = trung vị đơn giá hợp lệ (&gt; 0) trong cùng nhóm. Ngưỡng cảnh báo: lệch &gt; {THRESHOLD * 100}%.
                Nhấn vào một nhóm để mở danh sách lô cấu thành.
              </p>
            </div>

            {/* Sub-Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-secondary/50 p-1">
              {[
                { id: 'all' as SubFilter, label: 'Tất cả', count: groups.length },
                { id: 'flag' as SubFilter, label: 'Vượt ngưỡng', count: flagged, tone: 'text-warning' },
                { id: 'ok' as SubFilter, label: 'Trong ngưỡng', count: okCount, tone: 'text-primary' },
                { id: 'insufficient' as SubFilter, label: 'Chưa đủ căn cứ', count: insufficient },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSubFilter(tab.id)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition-all ${
                    subFilter === tab.id
                      ? 'bg-background text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <span className={tab.tone}>{tab.label}</span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">({tab.count})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Search Input */}
          <div className="mt-3.5 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm nhanh đối tác gia công hoặc mác thép..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-8 pr-3 py-1.5 text-xs text-foreground outline-none focus:border-primary"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
              Hiển thị {filteredGroups.length} / {groups.length} nhóm
            </span>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-xs">
            <thead className="bg-secondary/70 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
              <tr>
                {['', 'ĐỐI TÁC GIA CÔNG', 'MÁC THÉP', 'ĐƠN VỊ', 'SỐ LÔ', 'SẢN LƯỢNG', 'ĐƠN GIÁ ÁP DỤNG', 'GIÁ THAM CHIẾU', 'LỆCH TỐI ĐA', 'ĐÁNH GIÁ'].map((x, i) => (
                  <th key={i} className="px-4 py-3">{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((g) => {
                const isOpen = open === g.key;
                const prices = [...new Set(g.valid.map((x) => x.don_gia))];
                return (
                  <Fragment key={g.key}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : g.key)}
                      className={`cursor-pointer border-t border-border/70 transition-colors hover:bg-accent/40 ${
                        g.verdict === 'flag' ? 'bg-warning/5' : ''
                      }`}
                    >
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-foreground">{formatVendorName(g.vendor, role)}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-primary">{g.grade}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">{g.unit}</td>
                      <td className="px-4 py-3.5 font-mono tabular-nums">{g.rows.length}</td>
                      <td className="whitespace-nowrap px-4 py-3.5 font-mono tabular-nums">
                        {number(g.qty, 1)} {g.unit}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold tabular-nums">
                        {prices.length ? prices.map(money).join(' / ') : '—'}
                        {g.invalid > 0 && (
                          <p className="text-[10px] font-normal text-destructive">{g.invalid} lô thiếu đơn giá</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums text-muted-foreground">
                        {g.ref === null ? '—' : money(g.ref)}
                      </td>
                      <td className="px-4 py-3.5 font-mono tabular-nums">
                        {g.maxDev === null ? (
                          '—'
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={g.maxDev > THRESHOLD ? 'font-bold text-warning' : 'text-foreground'}>
                              {number(g.maxDev * 100, 1)}%
                            </span>
                            <div className="relative h-1.5 w-14 overflow-hidden rounded-xs bg-secondary">
                              <span
                                className={`absolute inset-y-0 left-0 ${
                                  g.maxDev > THRESHOLD ? 'bg-warning' : 'bg-primary'
                                }`}
                                style={{ width: `${Math.min(100, (g.maxDev / (THRESHOLD * 2)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {g.verdict === 'flag' ? (
                          <span className="inline-flex items-center gap-1 rounded-xs bg-warning/15 px-2 py-0.5 font-bold text-warning">
                            <AlertTriangle size={13} /> Vượt ngưỡng
                          </span>
                        ) : g.verdict === 'ok' ? (
                          <span className="inline-flex items-center gap-1 rounded-xs bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                            <BadgeCheck size={13} /> Trong ngưỡng
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-xs bg-secondary px-2 py-0.5 text-muted-foreground">
                            <CircleHelp size={13} /> Chưa đủ căn cứ
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Lot Sub-Table */}
                    {isOpen && (
                      <tr className="border-t border-border bg-secondary/30">
                        <td colSpan={10} className="px-6 py-4">
                          <p className="mb-2.5 text-[11px] text-muted-foreground">
                            {g.verdict === 'flag'
                              ? `Có lô lệch quá ${THRESHOLD * 100}% so với trung vị ${money(g.ref!)}/${g.unit}.`
                              : g.verdict === 'ok'
                              ? 'Mọi đơn giá hợp lệ nằm trong ngưỡng tham chiếu nội bộ.'
                              : 'Cần ít nhất 2 lô có đơn giá > 0 để lập tham chiếu.'}{' '}
                            Sản lượng tính theo {g.unit === 'Kg' ? 'kg_Lot' : 'so_luong'}.
                          </p>
                          <div className="overflow-x-auto rounded border border-border/60 bg-card">
                            <table className="w-full text-[11px]">
                              <thead className="bg-secondary/60 text-muted-foreground uppercase text-[10px] font-bold">
                                <tr>
                                  {['MÃ LÔ', 'MÃ HÀNG', 'ĐƠN HÀNG', 'NGÀY GỬI', 'SẢN LƯỢNG', 'ĐƠN GIÁ', 'LỆCH', 'THÀNH TIỀN', 'PHIẾU'].map((h) => (
                                    <th key={h} className="py-2 px-3 text-left">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {g.rows.map((r) => {
                                  const bad = !(r.don_gia > 0);
                                  const dev = !bad && g.ref ? (r.don_gia - g.ref) / g.ref : null;
                                  return (
                                    <tr key={r.ID_Key} className="border-t border-border/50 hover:bg-accent/20">
                                      <td className="py-2 px-3 font-mono font-bold text-primary">{r.ID_Key}</td>
                                      <td className="py-2 px-3 font-mono font-semibold">{r.ma_hang}</td>
                                      <td className="py-2 px-3 font-mono text-muted-foreground">{r.So_DatHang}</td>
                                      <td className="py-2 px-3 font-mono tabular-nums text-muted-foreground">
                                        {date(r.ngay_gui_QT)}
                                      </td>
                                      <td className="py-2 px-3 font-mono tabular-nums">
                                        {number(qtyOf(r), 1)} {g.unit}
                                      </td>
                                      <td className={`py-2 px-3 font-mono tabular-nums ${bad ? 'font-bold text-destructive' : ''}`}>
                                        {bad ? 'Thiếu / Không hợp lệ' : money(r.don_gia)}
                                      </td>
                                      <td className={`py-2 px-3 font-mono tabular-nums ${dev !== null && Math.abs(dev) > THRESHOLD ? 'font-bold text-warning' : ''}`}>
                                        {dev === null ? '—' : `${dev > 0 ? '+' : ''}${number(dev * 100, 1)}%`}
                                      </td>
                                      <td className="py-2 px-3 font-mono font-bold tabular-nums text-foreground">
                                        {money(r.thanh_tien)}
                                      </td>
                                      <td className="py-2 px-3">
                                        <JobTicketButton item={r} role={role} variant="icon" />
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!filteredGroups.length && (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Không có nhóm đơn giá nào khớp với điều kiện lọc hiện tại.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  isWarning = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  isWarning?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-5 shadow-2xs transition-all ${
        isWarning ? 'border-warning/50 bg-warning/5' : 'border-border bg-card'
      }`}
    >
      <div className="mb-3">{icon}</div>
      <p className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-black tracking-tight tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
