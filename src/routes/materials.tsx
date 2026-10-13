import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo } from 'react';
import { ArrowRight, Boxes, Gauge, Info } from 'lucide-react';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { number } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';
import { isOpen } from '@/lib/dynamo-rules';

export const Route = createFileRoute('/materials')({
  head: () => ({
    meta: [
      { title: 'Mác thép | DYNAMO QT' },
      { name: 'description', content: 'Danh mục tham khảo mác thép và dải độ cứng yêu cầu cho gia công khuôn.' },
      { property: 'og:title', content: 'Mác thép | DYNAMO QT' },
      { property: 'og:description', content: 'Tra cứu DAC, SKD61, DAC-MAGIC và mức sử dụng trong các đơn QT.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Materials,
});

// Static reference catalogue (not a stored master list).
const materials = [
  {
    code: 'SKD61',
    name: 'Thép dụng cụ gia công nóng',
    hrc: '46–52 HRC',
    application: 'Pin khuôn, insert, lõi khuôn chịu mài mòn cao',
    type: 'JIS / Tool Steel',
  },
  {
    code: 'DAC',
    name: 'Thép khuôn nóng tiêu chuẩn',
    hrc: '44–48 HRC',
    application: 'Insert, thân khuôn, chi tiết tạo hình đúc áp lực',
    type: 'Hot Work Die Steel',
  },
  {
    code: 'DAC-MAGIC',
    name: 'Thép khuôn nóng hiệu năng cao',
    hrc: '42–46 HRC',
    application: 'Lõi khuôn chính xác, insert chịu sốc nhiệt lớn',
    type: 'Premium Die Steel',
  },
];

type Usage = { lots: number; open: number; kg: number; workshops: Set<string>; vendors: Set<string>; hrc: Set<string> };

function Materials() {
  const { filtered, role } = useDynamo();

  const usage = useMemo(() => {
    const m = new Map<string, Usage>();
    for (const r of filtered) {
      const k = r.vat_lieu?.trim() || '(trống)';
      let u = m.get(k);
      if (!u) {
        u = { lots: 0, open: 0, kg: 0, workshops: new Set(), vendors: new Set(), hrc: new Set() };
        m.set(k, u);
      }
      u.lots++;
      if (isOpen(r)) u.open++;
      u.kg += r.kg_Lot || 0;
      u.workshops.add(r.phong_sx);
      u.vendors.add(r.cty_QT);
      if (r.do_cung) u.hrc.add(r.do_cung);
    }
    return m;
  }, [filtered]);

  const others = [...usage.entries()].filter(([k]) => !materials.some(m => m.code === k));

  return (
    <>
      <PageHeading
        eyebrow="KIỂM SOÁT / VẬT LIỆU"
        title="Danh mục mác thép"
        description={`Thư viện tham khảo kỹ thuật · Mức sử dụng tính từ ${number(filtered.length)} lô theo bộ lọc hiện tại.`}
      />

      {/* Primary Material Cards */}
      <div className="grid gap-5 lg:grid-cols-3">
        {materials.map(m => {
          const u = usage.get(m.code);
          const vendorLabels = u ? [...u.vendors].map(v => formatVendorName(v, role)).join(', ') : '—';
          return (
            <article key={m.code} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xs transition-all hover:border-primary/40 hover:shadow-xs">
              <div className="border-b border-border p-5">
                <div className="flex items-start justify-between">
                  <span className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Boxes size={20} />
                  </span>
                  <span className="rounded-xs bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase text-primary">
                    {m.type}
                  </span>
                </div>
                <h2 className="mt-4 font-mono text-2xl font-black tracking-tight text-foreground">{m.code}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{m.name}</p>
              </div>

              <dl className="grid grid-cols-2 divide-x border-b border-border bg-secondary/30 p-4 text-xs">
                <div>
                  <dt className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">HRC THAM KHẢO</dt>
                  <dd className="mt-1 flex items-center gap-1.5 font-mono text-base font-bold text-info">
                    <Gauge size={15} />
                    {m.hrc}
                  </dd>
                </div>
                <div className="pl-4">
                  <dt className="text-[10px] font-bold tracking-wider uppercase text-muted-foreground">ỨNG DỤNG CHÍNH</dt>
                  <dd className="mt-1 text-xs leading-snug text-foreground">{m.application}</dd>
                </div>
              </dl>

              <div className="flex flex-1 flex-col justify-between bg-card p-5 text-xs">
                <div>
                  <p className="mb-3 text-[10px] font-bold tracking-wider uppercase text-muted-foreground">
                    SỬ DỤNG TRONG DATASET HIỆN HÀNH
                  </p>
                  {u ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <Stat l="Số lô" v={number(u.lots)} />
                        <Stat l="Đang mở" v={number(u.open)} isWarning={u.open > 0} />
                        <Stat l="Khối lượng" v={`${number(u.kg, 1)} kg`} />
                      </div>
                      <div className="mt-3.5 space-y-1 text-[11px] text-muted-foreground">
                        <p>Phân xưởng: <b className="text-foreground">{[...u.workshops].join(', ')}</b></p>
                        <p>Đối tác: <b className="text-foreground">{vendorLabels}</b></p>
                        <p>HRC trên đơn: <b className="font-mono text-foreground">{[...u.hrc].slice(0, 4).join(' · ') || '—'}</b></p>
                      </div>
                    </>
                  ) : (
                    <p className="py-4 text-center text-xs text-muted-foreground">Không có lô nào dùng mác này theo bộ lọc hiện tại.</p>
                  )}
                </div>

                <div className="mt-4 border-t border-border/60 pt-3">
                  <Link to="/orders" className="flex items-center gap-1 font-bold text-xs text-primary transition-transform hover:translate-x-0.5">
                    Xem đơn hàng dùng mác này <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Secondary Steel Grades Table */}
      {others.length > 0 && (
        <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-foreground">
              Mác thép khác phát hiện trong dữ liệu ({others.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Chưa có trong danh mục kỹ thuật tiêu chuẩn — chỉ hiển thị số liệu thực tế từ dữ liệu đơn hàng.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-secondary/70 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  {['MÁC THÉP', 'SỐ LÔ', 'ĐANG MỞ', 'KHỐI LƯỢNG', 'PHÂN XƯỞNG', 'HRC TRÊN ĐƠN'].map(h => (
                    <th key={h} className="px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {others.map(([k, u]) => (
                  <tr key={k} className="border-t border-border/70 hover:bg-accent/40">
                    <td className="px-4 py-3 font-mono font-bold text-primary">{k}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{number(u.lots)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{number(u.open)}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{number(u.kg, 1)} kg</td>
                    <td className="px-4 py-3">{[...u.workshops].join(', ')}</td>
                    <td className="px-4 py-3 font-mono tabular-nums">{[...u.hrc].slice(0, 4).join(' · ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Technical Disclaimer Notice */}
      <div className="mt-6 flex items-start gap-3 rounded-lg border-l-4 border-warning bg-warning/10 p-4 text-xs text-muted-foreground">
        <Info size={18} className="shrink-0 text-warning mt-0.5" />
        <p className="leading-relaxed">
          Dải độ cứng HRC nêu trên là thông số định mức tham khảo cho chế tạo khuôn mẫu. Tiêu chuẩn nghiệm thu thực tế bắt buộc tuân theo bản vẽ kỹ thuật chi tiết và phiếu kết quả kiểm tra độ cứng (Hardness Test Report) đi kèm từng lô hàng.
        </p>
      </div>
    </>
  );
}

function Stat({ l, v, isWarning = false }: { l: string; v: string; isWarning?: boolean }) {
  return (
    <div className={`rounded border p-2.5 ${isWarning ? 'border-warning/40 bg-warning/5' : 'border-border bg-secondary/40'}`}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase">{l}</p>
      <p className="mt-1 font-mono text-sm font-bold tabular-nums text-foreground">{v}</p>
    </div>
  );
}


