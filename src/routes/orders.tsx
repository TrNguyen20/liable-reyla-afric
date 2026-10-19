import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, Package, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';
import { isMaterialEquivalent } from '@/lib/materials-data';
import { StatusDot } from './dashboard';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { daysOver, isDueSoon, isMissingDue, isOverdue } from '@/lib/dynamo-rules';

const dueTag = (i: QTItem) =>
  isOverdue(i)
    ? { t: `Quá hạn ${daysOver(i)}d`, c: 'border-destructive/60 bg-destructive/15 text-destructive font-bold' }
    : isDueSoon(i)
    ? { t: 'Cận hạn 48h', c: 'border-warning/60 bg-warning/15 text-warning font-bold' }
    : isMissingDue(i)
    ? { t: i.han_tra_est ? 'Hạn ước tính' : 'Thiếu hạn trả', c: 'border-border bg-secondary text-muted-foreground' }
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
const ROW_LIMIT = 150;

function Orders() {
  const { filtered, role } = useDynamo();
  const search = Route.useSearch();
  const [materialFilter, setMaterialFilter] = useState<string | null>(search.material ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');

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
      .filter(id => !q || id.toLowerCase().includes(q) || byOrder.get(id)!.some(i => i.ma_hang.toLowerCase().includes(q)));
    return { groups, byOrder };
  }, [filtered, localSearch, materialFilter]);

  const active = selected && byOrder.has(selected) ? selected : groups[0];
  const rows = active ? byOrder.get(active) ?? [] : [];
  const shown = rows.slice(0, ROW_LIMIT);
  const first = rows[0];
  const total = rows.reduce((a, i) => a + i.thanh_tien, 0);
  const visibleGroups = groups.slice(0, LIST_LIMIT);

  const exportCsv = () => {
    const keys: (keyof QTItem)[] = [
      'ID_Key', 'phong_sx', 'ma_hang', 'so_luong', 'vat_lieu', 'do_cung', 'Kich_Thuoc_SP', 'kg_Lot',
      'don_vi_tinh', 'don_gia', 'thanh_tien', 'ngay_gui_QT', 'cty_QT', 'TrangThai', 'So_DatHang', 'han_tra',
    ];
    const content = [
      keys.join(','),
      ...rows.map(r => keys.map(k => `"${String(r[k] ?? '').replaceAll('"', '""')}"`).join(',')),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
    a.download = `${active}-chi-tiet.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeading
        eyebrow="ĐƠN ĐẶT HÀNG / CHI TIẾT"
        title="Đơn gia công QT"
        description="Tra cứu đơn hàng, chi tiết linh kiện và tiến độ theo từng lô gia công ngoài."
      />

      <div className="grid min-h-[640px] grid-cols-1 overflow-hidden rounded-lg border border-border bg-card shadow-2xs lg:grid-cols-[290px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left Side: Order Master List */}
        <div className="border-b border-border bg-card/60 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Danh sách đơn hàng</h2>
              <span className="font-mono text-xs font-semibold tabular-nums text-foreground">{number(groups.length)} đơn</span>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
                placeholder="Lọc mã đơn, mã hàng..."
                aria-label="Lọc danh sách đơn"
                className="h-8.5 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none transition-colors focus:border-primary"
              />
            </div>
            {materialFilter && (
              <div className="mt-2 flex items-center justify-between rounded bg-primary/10 px-2 py-1 text-[11px] text-primary">
                <span>Mác thép: <b>{materialFilter}</b></span>
                <button
                  type="button"
                  onClick={() => setMaterialFilter(null)}
                  className="rounded p-0.5 hover:bg-primary/20"
                  aria-label="Bỏ lọc mác thép"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[580px] overflow-y-auto divide-y divide-border/60">
            {visibleGroups.map(id => {
              const g = byOrder.get(id)!;
              const overdueCount = g.filter(r => isOverdue(r)).length;
              const dueSoonCount = g.filter(r => isDueSoon(r)).length;
              const orderCost = g.reduce((a, i) => a + i.thanh_tien, 0);
              const isCurrent = active === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`w-full p-3.5 text-left transition-colors ${
                    isCurrent
                      ? 'border-l-3 border-l-primary bg-primary/10 shadow-inner'
                      : 'hover:bg-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-foreground">{id}</span>
                    <div className="flex items-center gap-1 font-mono text-[10px] tabular-nums">
                      {overdueCount > 0 && (
                        <span className="rounded-xs bg-destructive/15 px-1.5 py-0.5 font-bold text-destructive">
                          {overdueCount} trễ
                        </span>
                      )}
                      {dueSoonCount > 0 && (
                        <span className="rounded-xs bg-warning/15 px-1.5 py-0.5 font-bold text-warning">
                          {dueSoonCount} cận
                        </span>
                      )}
                      <span className="text-muted-foreground">{g.length} mã</span>
                    </div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate max-w-[170px]">
                      {[...new Set(g.map(i => i.phong_sx))].join(', ')} · {formatVendorName(g[0]?.cty_QT, role)}
                    </span>
                    <span className="font-mono tabular-nums">{date(g[0]?.ngay_gui_QT ?? '')}</span>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-xs font-bold tabular-nums text-foreground">
                      {money(orderCost)}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                      {number(g.reduce((a, i) => a + i.kg_Lot, 0), 1)} kg
                    </span>
                  </div>
                </button>
              );
            })}

            {groups.length > LIST_LIMIT && (
              <p className="p-4 text-center text-[11px] text-muted-foreground">
                Hiển thị {LIST_LIMIT}/{groups.length.toLocaleString('vi-VN')} đơn — dùng ô lọc để tìm nhanh
              </p>
            )}
            {!groups.length && (
              <p className="p-8 text-center text-xs text-muted-foreground">
                {localSearch ? `Không tìm thấy đơn khớp "${localSearch}"` : 'Chưa có đơn hàng trong phạm vi lọc'}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Order Detail */}
        <div className="min-w-0 bg-card">
          {first ? (
            <>
              {/* Order Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-xs bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary uppercase">
                      CHI TIẾT ĐƠN HÀNG
                    </span>
                    <span className="text-xs text-muted-foreground">Gửi ngày {date(first.ngay_gui_QT)}</span>
                  </div>
                  <h2 className="mt-1 font-mono text-2xl font-black tracking-tight text-foreground">{active}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Đối tác gia công: <b className="text-foreground">{formatVendorName(first.cty_QT, role)}</b> · {rows.length.toLocaleString('vi-VN')} mã linh kiện
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={exportCsv} className="h-8.5 gap-1.5 text-xs font-bold">
                  <Download size={14} /> Xuất CSV
                </Button>
              </div>

              {/* Technical Summary KPI Tiles */}
              <div className="grid grid-cols-2 divide-x divide-y border-b border-border bg-secondary/30 sm:grid-cols-4 sm:divide-y-0">
                <Summary label="PHÂN XƯỞNG" value={[...new Set(rows.map(i => i.phong_sx))].join(', ')} />
                <Summary label="ĐỐI TÁC GIA CÔNG" value={formatVendorName(first.cty_QT, role)} />
                <Summary label="TỔNG KHỐI LƯỢNG" value={`${number(rows.reduce((a, i) => a + i.kg_Lot, 0), 1)} kg`} isMono />
                <Summary label="TỔNG GIÁ TRỊ" value={money(total)} isMono isPrimary />
              </div>

              {/* Priority Warning Banner */}
              {(() => {
                const o = rows.filter(r => isOverdue(r)).length;
                const d = rows.filter(r => isDueSoon(r)).length;
                const m = rows.filter(isMissingDue).length;
                return o || d || m ? (
                  <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/20 px-5 py-2.5 text-xs">
                    {o > 0 && (
                      <span className="rounded-xs border border-destructive/40 bg-destructive/10 px-2 py-1 font-mono font-bold tabular-nums text-destructive">
                        {o} lô quá hạn
                      </span>
                    )}
                    {d > 0 && (
                      <span className="rounded-xs border border-warning/40 bg-warning/10 px-2 py-1 font-mono font-bold tabular-nums text-warning">
                        {d} lô cận hạn 48h
                      </span>
                    )}
                    {m > 0 && (
                      <span className="rounded-xs border border-border bg-secondary px-2 py-1 font-mono text-muted-foreground tabular-nums">
                        {m} lô thiếu hạn trả
                      </span>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Detail Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left text-xs">
                  <thead className="bg-secondary/70 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    <tr>
                      {['MÃ HÀNG', 'MÁC THÉP / HRC', 'KÍCH THƯỚC', 'SL', 'KHỐI LƯỢNG', 'ĐƠN GIÁ', 'THÀNH TIỀN', 'HẠN TRẢ', 'TRẠNG THÁI', 'PDF', ''].map(t => (
                        <th key={t} className="px-4 py-3">{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map(i => {
                      const tag = dueTag(i);
                      return (
                        <tr
                          key={i.ID_Key}
                          className={`border-t border-border/70 align-top transition-colors hover:bg-accent/40 ${
                            isOverdue(i) ? 'bg-destructive/5' : ''
                          }`}
                        >
                          <td className="px-4 py-3.5">
                            <p className="font-mono font-bold text-foreground">{i.ma_hang}</p>
                            <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{i.ID_Key}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-foreground">{i.vat_lieu}</p>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{i.do_cung}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono text-muted-foreground">
                            {i.Kich_Thuoc_SP}
                          </td>
                          <td className="px-4 py-3.5 font-mono tabular-nums text-foreground">
                            {number(i.so_luong)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono tabular-nums text-foreground">
                            {number(i.kg_Lot, 1)} kg
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono tabular-nums text-foreground">
                            {money(i.don_gia)}
                            <span className="text-[10px] text-muted-foreground">/{i.don_vi_tinh}</span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold tabular-nums text-foreground">
                            {money(i.thanh_tien)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono tabular-nums">
                            {i.han_tra ? date(i.han_tra) : '—'}
                            {tag && (
                              <span className={`mt-1 block w-fit rounded-xs border px-1.5 py-0.5 text-[10px] ${tag.c}`}>
                                {tag.t}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <StatusDot status={i.TrangThai} />
                          </td>
                          <td className="px-4 py-3.5">
                            <span title="Chưa có phiếu PDF cho lô này" className="inline-flex p-1 text-muted-foreground/50"><FileText size={16} aria-label={`Chưa có phiếu PDF cho ${i.ma_hang}`} /></span>
                          </td>
                          <td className="px-4 py-3.5">
                            <LotUpdateButton item={i} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {rows.length > ROW_LIMIT && (
                <p className="border-t border-border px-5 py-3 text-[11px] text-muted-foreground">
                  Hiển thị {ROW_LIMIT}/{rows.length.toLocaleString('vi-VN')} dòng đầu — xuất CSV để tải toàn bộ
                </p>
              )}

              <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-5 py-3.5">
                <span className="text-xs text-muted-foreground">Tệp PDF là phiếu thông tin minh họa cho môi trường mô phỏng.</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Tổng cộng:</span>
                  <strong className="font-mono text-xl font-black tabular-nums text-primary">{money(total)}</strong>
                </div>
              </div>
            </>
          ) : (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 text-muted-foreground">
              <Package size={32} className="opacity-40" />
              <p className="text-sm font-medium">Không có đơn hàng phù hợp bộ lọc</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Summary({ label, value, isMono = false, isPrimary = false }: { label: string; value: string; isMono?: boolean; isPrimary?: boolean }) {
  return (
    <div className="p-4">
      <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">{label}</p>
      <p className={`mt-1 text-sm font-bold ${isMono ? 'font-mono tabular-nums' : ''} ${isPrimary ? 'text-primary font-black' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}


