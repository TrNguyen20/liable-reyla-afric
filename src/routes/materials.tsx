import { createFileRoute, Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Gauge,
  Info,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { number } from '@/lib/dynamo-data';
import { formatVendorSummary, roleLabel } from '@/lib/dynamo-auth';
import { isOpen } from '@/lib/dynamo-rules';
import {
  TOP_MATERIALS,
  findMasterSpec,
  extractPopularHrc,
  type MaterialSpec,
  type MaterialCategory,
} from '@/lib/materials-data';

export const Route = createFileRoute('/materials')({
  head: () => ({
    meta: [
      { title: 'Mác thép & Nhiệt luyện | DYNAMO VIETNAM QT - MES' },
      { name: 'description', content: 'Thư viện mác thép chủ lực, trực quan hóa thước đo HRC và điều phối luân chuyển linh kiện khuôn.' },
      { property: 'og:title', content: 'Mác thép & Nhiệt luyện | DYNAMO VIETNAM QT - MES' },
      { property: 'og:description', content: 'Thư viện kỹ thuật chuẩn ISA-101 và bảo mật Poka-Yoke cho vật liệu nhiệt luyện.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Materials,
});

type CategoryFilter = 'ALL' | MaterialCategory;

interface MaterialUsageData {
  spec: MaterialSpec;
  lots: number;
  open: number;
  kg: number;
  workshops: Set<string>;
  vendors: Set<string>;
  hrcList: string[];
  detectedVariants: Map<string, number>;
}

interface OtherMaterialUsage {
  code: string;
  lots: number;
  open: number;
  kg: number;
  workshops: Set<string>;
  vendors: Set<string>;
  hrcList: string[];
}

export function Materials() {
  const { filtered, role } = useDynamo();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Process dataset: cluster by Top 6 master specs (including equivalents/aliases)
  const { masterUsage, otherUsage, totalKg, activeMasterCount } = useMemo(() => {
    const masterMap = new Map<string, MaterialUsageData>();
    for (const spec of TOP_MATERIALS) {
      masterMap.set(spec.code, {
        spec,
        lots: 0,
        open: 0,
        kg: 0,
        workshops: new Set(),
        vendors: new Set(),
        hrcList: [],
        detectedVariants: new Map(),
      });
    }

    const otherMap = new Map<string, OtherMaterialUsage>();
    let totalKgSum = 0;

    for (const r of filtered) {
      const rawMat = r.vat_lieu?.trim() || '(trống)';
      totalKgSum += r.kg_Lot || 0;

      const matchedSpec = findMasterSpec(rawMat);
      if (matchedSpec) {
        const u = masterMap.get(matchedSpec.code);
        if (u) {
          u.lots++;
          if (isOpen(r)) u.open++;
          u.kg += r.kg_Lot || 0;
          u.workshops.add(r.phong_sx);
          if (r.cty_QT) u.vendors.add(r.cty_QT);
          if (r.do_cung && r.do_cung !== '—') u.hrcList.push(r.do_cung);

          // Track how this variant was spelled in the dataset
          const variantKey = rawMat;
          u.detectedVariants.set(variantKey, (u.detectedVariants.get(variantKey) ?? 0) + 1);
        }
      } else {
        let o = otherMap.get(rawMat);
        if (!o) {
          o = {
            code: rawMat,
            lots: 0,
            open: 0,
            kg: 0,
            workshops: new Set(),
            vendors: new Set(),
            hrcList: [],
          };
          otherMap.set(rawMat, o);
        }
        o.lots++;
        if (isOpen(r)) o.open++;
        o.kg += r.kg_Lot || 0;
        o.workshops.add(r.phong_sx);
        if (r.cty_QT) o.vendors.add(r.cty_QT);
        if (r.do_cung && r.do_cung !== '—') o.hrcList.push(r.do_cung);
      }
    }

    const activeMasters = [...masterMap.values()].filter(u => u.lots > 0).length;

    return {
      masterUsage: [...masterMap.values()],
      otherUsage: [...otherMap.values()].sort((a, b) => b.lots - a.lots),
      totalKg: totalKgSum,
      activeMasterCount: activeMasters,
    };
  }, [filtered]);

  // Filtered master materials according to category tab and search query
  const displayedMasters = useMemo(() => {
    return masterUsage.filter(({ spec }) => {
      if (selectedCategory !== 'ALL' && spec.category !== selectedCategory) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        spec.code.toLowerCase().includes(q) ||
        spec.jisAisi.toLowerCase().includes(q) ||
        spec.categoryLabel.toLowerCase().includes(q) ||
        spec.primaryApplication.toLowerCase().includes(q) ||
        spec.aliases.some(a => a.toLowerCase().includes(q))
      );
    });
  }, [masterUsage, selectedCategory, searchQuery]);

  return (
    <>
      <PageHeading
        eyebrow="TIÊU CHUẨN KỸ THUẬT / PHÂN HỆ MOD-05"
        title="Danh mục mác thép & Nhiệt luyện"
        description="Thư viện mác thép chủ lực v2.0 (Industrial Precision), trực quan hóa dải độ cứng HRC và bảo mật luồng đối tác Poka-Yoke."
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
              <Lock size={13} />
              <span>Bảo mật: Poka-Yoke Active</span>
            </div>
          </div>
        }
      />

      {/* Industrial Telemetry KPI Strip */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Chỉ số vật liệu tổng quát">
        <div className="rounded-lg border border-border bg-card p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">THƯ VIỆN CHỦ LỰC</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-foreground">6 / 6</span>
            <span className="text-[11px] text-muted-foreground">mác thép (&gt;95% tải xưởng)</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">ĐANG HOẠT ĐỘNG</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black text-primary">{activeMasterCount}</span>
            <span className="text-[11px] text-muted-foreground">mác có lô gia công thực tế</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TỔNG KHỐI LƯỢNG LÔ</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-black tabular-nums text-foreground">{number(totalKg, 1)}</span>
            <span className="text-[11px] text-muted-foreground">kg gia công nhiệt</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-3.5 shadow-2xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">QUYỀN XEM ĐỐI TÁC</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-sm font-bold text-foreground">{roleLabel(role)}</span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            {role === 'admin'
              ? 'Toàn quyền hiển thị nhà thầu'
              : 'Ẩn danh hóa nhà thầu (Poka-Yoke)'}
          </p>
        </div>
      </section>

      {/* Filter and Category Controls */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1 text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`rounded-md px-3 py-1.5 font-bold transition-colors ${selectedCategory === 'ALL'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Tất cả ({TOP_MATERIALS.length})
          </button>
          <button
            onClick={() => setSelectedCategory('HOT_WORK')}
            className={`rounded-md px-3 py-1.5 font-bold transition-colors ${selectedCategory === 'HOT_WORK'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Khuôn dập nóng & Đúc (3)
          </button>
          <button
            onClick={() => setSelectedCategory('COLD_WORK')}
            className={`rounded-md px-3 py-1.5 font-bold transition-colors ${selectedCategory === 'COLD_WORK'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Khuôn dập nguội (1)
          </button>
          <button
            onClick={() => setSelectedCategory('SPECIALTY')}
            className={`rounded-md px-3 py-1.5 font-bold transition-colors ${selectedCategory === 'SPECIALTY'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
              }`}
          >
            Hợp kim cao cấp (2)
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm mác thép, mã tương đương..."
            aria-label="Tìm kiếm mác thép"
            className="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-xs outline-none transition-colors focus:border-primary"
          />
        </div>
      </div>

      {/* Rockwell Hardness Spectrum & International Equivalency Guide */}
      <section className="mb-6 overflow-hidden rounded-lg border border-border bg-card p-4 sm:p-5 shadow-2xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <Gauge size={16} className="text-primary" />
            <h2 className="font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
              Thước đo độ cứng Rockwell (HRC) &amp; Phân vùng công nghệ nhiệt luyện
            </h2>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            Tiêu chuẩn đo kiểm: ASTM E18 / JIS Z2245 (Tải trọng 150 kgf, Mũi kim cương 120°)
          </span>
        </div>

        {/* Visual Gradient HRC Spectrum Bar */}
        <div className="mt-4">
          <div className="relative h-4 overflow-hidden rounded-sm bg-gradient-to-r from-sky-500 via-amber-500 to-rose-600 shadow-inner">
            <div className="absolute inset-0 flex justify-between px-2 text-[9px] font-black text-white/90 font-mono">
              <span>20 HRC (Thép mềm)</span>
              <span>40 HRC (Dập nóng)</span>
              <span>50 HRC (Đúc áp lực)</span>
              <span>60 HRC (Dập nguội)</span>
              <span>65+ HRC (HSS)</span>
            </div>
          </div>

          {/* Spectrum Zones Grid */}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4 text-xs">
            <div className="rounded-xs border border-border/70 bg-secondary/30 p-2.5">
              <span className="font-mono text-[11px] font-extrabold text-sky-600 dark:text-sky-400">28 – 35 HRC</span>
              <p className="font-semibold text-foreground mt-0.5">Thép phôi / Khuôn nhựa</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">S50C, P20, NAK80. Gia công cắt gọt tốt, thấm carbon bề mặt.</p>
            </div>
            <div className="rounded-xs border border-border/70 bg-secondary/30 p-2.5">
              <span className="font-mono text-[11px] font-extrabold text-amber-600 dark:text-amber-400">42 – 50 HRC</span>
              <p className="font-semibold text-foreground mt-0.5">Khuôn dập nóng &amp; Đúc nhôm</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">SKD61, DAC, FDAC. Chịu mỏi nhiệt cao, ram 2 lần chống rạn nứt.</p>
            </div>
            <div className="rounded-xs border border-border/70 bg-secondary/30 p-2.5">
              <span className="font-mono text-[11px] font-extrabold text-rose-600 dark:text-rose-400">58 – 62 HRC</span>
              <p className="font-semibold text-foreground mt-0.5">Khuôn dập nguội &amp; Chày đột</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">SKD11, DC53, SLD. Chống mài mòn cực cao, tôi chân không.</p>
            </div>
            <div className="rounded-xs border border-border/70 bg-secondary/30 p-2.5">
              <span className="font-mono text-[11px] font-extrabold text-purple-600 dark:text-purple-400">62 – 66+ HRC</span>
              <p className="font-semibold text-foreground mt-0.5">Thép gió &amp; Dao cắt kỹ thuật</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">SKH51, HSS, Hợp kim Carbide. Chịu tải trọng cắt xé tốc độ cao.</p>
            </div>
          </div>
        </div>

        {/* International Cross-Reference Quick Bar */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3 text-[11px]">
          <span className="font-bold text-muted-foreground uppercase text-[10px]">Tra cứu tương đương:</span>
          {[
            { jis: 'SKD11', aisi: 'D2', din: '1.2379' },
            { jis: 'SKD61', aisi: 'H13', din: '1.2344' },
            { jis: 'S50C', aisi: '1050', din: '1.1213' },
            { jis: 'SCM440', aisi: '4140', din: '1.7225' },
            { jis: 'SUS304', aisi: '304', din: '1.4301' },
          ].map((pair) => (
            <button
              key={pair.jis}
              onClick={() => setSearchQuery(pair.jis)}
              className="flex items-center gap-1 rounded-sm border border-border bg-background px-2 py-0.5 font-mono text-[10px] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <b className="text-foreground">{pair.jis}</b>
              <span className="opacity-50">↔</span>
              <span>{pair.aisi}</span>
              <span className="opacity-50">↔</span>
              <span>{pair.din}</span>
            </button>
          ))}
        {/* Hardness Conversion Matrix Tool (ASTM E140 / ISO 18265) */}
        <div className="mt-3.5 border-t border-border/60 pt-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
              Quy đổi độ cứng tương đương (ASTM E140 / ISO 18265):
            </span>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
              <span className="rounded-xs border border-primary/40 bg-primary/10 px-2 py-0.5 text-primary font-bold">
                60 HRC ≈ 697 HV ≈ 654 HB ≈ 2180 MPa
              </span>
              <span className="rounded-xs border border-border bg-secondary/50 px-2 py-0.5 text-muted-foreground">
                50 HRC ≈ 513 HV ≈ 481 HB ≈ 1620 MPa
              </span>
              <span className="rounded-xs border border-border bg-secondary/50 px-2 py-0.5 text-muted-foreground">
                40 HRC ≈ 392 HV ≈ 371 HB ≈ 1220 MPa
              </span>
              <span className="rounded-xs border border-border bg-secondary/50 px-2 py-0.5 text-muted-foreground">
                30 HRC ≈ 302 HV ≈ 286 HB ≈ 940 MPa
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Top 6 Master Material Cards Grid */}
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {displayedMasters.map(({ spec, lots, open, kg, workshops, vendors, hrcList, detectedVariants }) => {
          const popularHrc = extractPopularHrc(hrcList);
          const vendorMaskedText = formatVendorSummary(vendors, role);
          const hasLots = lots > 0;

          // Theme styling based on category
          const categoryBadge =
            spec.category === 'HOT_WORK'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
              : spec.category === 'COLD_WORK'
                ? 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';

          const accentLine =
            spec.category === 'HOT_WORK'
              ? 'bg-amber-500'
              : spec.category === 'COLD_WORK'
                ? 'bg-sky-500'
                : 'bg-emerald-500';

          return (
            <article
              key={spec.code}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-2xs transition-all hover:border-primary/50 hover:shadow-sm"
            >
              {/* Category indicator line */}
              <div className={`h-1 w-full ${accentLine}`} />

              {/* Card Header */}
              <div className="border-b border-border/80 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${categoryBadge}`}>
                      {spec.category} · {spec.categoryLabel}
                    </span>
                    <h2 className="mt-2 font-mono text-2xl font-black tracking-tight text-foreground group-hover:text-primary transition-colors">
                      {spec.code}
                    </h2>
                    <p className="mt-0.5 font-mono text-xs font-semibold text-muted-foreground">{spec.jisAisi}</p>
                  </div>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary/50 text-foreground">
                    <Boxes size={18} />
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{spec.primaryApplication}</p>

                {/* Metallurgy Advantages Note */}
                <div className="mt-2.5 rounded-sm bg-secondary/40 px-2.5 py-1.5 text-[11px] text-foreground">
                  <span className="font-semibold text-primary">Ưu điểm:</span> {spec.advantages}
                </div>
              </div>

              {/* 3. Visual HRC Gauge Section (ISA-101 Standard 40 - 62 HRC) */}
              <div className="border-b border-border/80 bg-secondary/20 p-5">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground">
                    <Gauge size={14} className="text-primary" />
                    <span>Thước đo độ cứng nhiệt luyện</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-foreground">
                    Định mức: {spec.hrcTargetPopular}
                  </span>
                </div>

                {/* SVG Visual Gauge Component */}
                <HrcVisualGauge
                  min={40}
                  max={62}
                  specMin={spec.hrcMin}
                  specMax={spec.hrcMax}
                  category={spec.category}
                  pinnedHrcCentroid={popularHrc.value}
                  pinnedHrcLabel={popularHrc.label}
                  pinnedCount={popularHrc.count}
                />

                <div className="mt-3 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Quy trình: <b className="font-normal text-foreground">{spec.typicalHeatTreatment}</b></span>
                </div>
              </div>

              {/* Shopfloor Telemetry & Poka-Yoke Stats */}
              <div className="flex flex-1 flex-col justify-between p-5 text-xs">
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      DỮ LIỆU THỰC CHIẾN TẠI NHÀ XƯỞNG
                    </p>
                    {hasLots ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <CheckCircle2 size={12} /> Đang luân chuyển
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">Chưa có lô active</span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="rounded border border-border bg-secondary/40 p-2.5 text-center">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Tổng lô</p>
                      <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">{number(lots)}</p>
                    </div>

                    <div className={`rounded border p-2.5 text-center ${open > 0 ? 'border-warning/50 bg-warning/10' : 'border-border bg-secondary/40'}`}>
                      <p className={`text-[10px] font-semibold uppercase ${open > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
                        Đang mở
                      </p>
                      <p className={`mt-0.5 font-mono text-base font-bold tabular-nums ${open > 0 ? 'text-warning' : 'text-foreground'}`}>
                        {number(open)}
                      </p>
                    </div>

                    <div className="rounded border border-border bg-secondary/40 p-2.5 text-center">
                      <p className="text-[10px] font-semibold uppercase text-muted-foreground">Khối lượng</p>
                      <p className="mt-0.5 font-mono text-base font-bold tabular-nums text-foreground">{number(kg, 1)} kg</p>
                    </div>
                  </div>

                  {/* Metadata & Masked Vendor Section */}
                  <div className="mt-3 space-y-1.5 rounded-md border border-border/60 bg-card p-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phân xưởng sử dụng:</span>
                      <span className="font-medium text-foreground">{workshops.size > 0 ? [...workshops].join(', ') : '—'}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Đơn vị gia công (Poka-Yoke):</span>
                      <span className="font-semibold text-foreground">{vendorMaskedText}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Yêu cầu HRC thực tế:</span>
                      <span className="font-mono font-bold text-primary">
                        {popularHrc.label !== 'Chưa có dữ liệu' ? `${popularHrc.label} (${popularHrc.count} lô)` : 'Theo định mức'}
                      </span>
                    </div>

                    {/* Detected Equivalent Variants in Dataset */}
                    {detectedVariants.size > 0 && (
                      <div className="border-t border-border/40 pt-1.5">
                        <span className="text-muted-foreground">Biến thể ghi nhận: </span>
                        <span className="font-mono text-[10px] text-foreground">
                          {[...detectedVariants.entries()].map(([k, v]) => `${k} (${v})`).join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Deep-link Smart Actions */}
                <div className="mt-4 flex items-center gap-2 border-t border-border pt-3">
                  <Link
                    to="/tracking"
                    search={{ material: spec.code }}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    <span>Lô luân chuyển</span>
                    <ArrowRight size={13} />
                  </Link>

                  <Link
                    to="/orders"
                    search={{ material: spec.code }}
                    className="flex items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
                    title={`Xem danh sách đơn hàng sử dụng mác ${spec.code}`}
                  >
                    <span>Đơn hàng</span>
                    <ExternalLink size={12} className="text-muted-foreground" />
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Secondary Steel Grades Table (Others / Custom Alloys detected in live data) */}
      {otherUsage.length > 0 && (
        <section className="mt-8 overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
          <div className="flex flex-col justify-between border-b border-border p-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-sm font-extrabold uppercase tracking-wider text-foreground">
                Mác thép khác hoặc biến thể chưa phân loại ({otherUsage.length})
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Các mác thép phát hiện trong tập dữ liệu nằm ngoài danh mục Top 6 tiêu chuẩn. Kỹ sư có thể nhấp để kiểm tra lô luân chuyển.
              </p>
            </div>
            <span className="mt-2 inline-flex items-center gap-1 rounded bg-secondary px-2.5 py-1 font-mono text-[11px] font-semibold text-muted-foreground sm:mt-0">
              <Info size={13} /> {number(otherUsage.reduce((a, b) => a + b.lots, 0))} lô ngoại lệ
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-secondary/70 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">MÁC THÉP TRÊN ĐƠN</th>
                  <th className="px-4 py-3 text-right">SỐ LÔ</th>
                  <th className="px-4 py-3 text-right">ĐANG MỞ</th>
                  <th className="px-4 py-3 text-right">KHỐI LƯỢNG</th>
                  <th className="px-4 py-3">PHÂN XƯỞNG</th>
                  <th className="px-4 py-3">ĐỐI TÁC GIA CÔNG</th>
                  <th className="px-4 py-3">HRC YÊU CẦU</th>
                  <th className="px-4 py-3 text-center">THAO TÁC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {otherUsage.map(o => (
                  <tr key={o.code} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-foreground">{o.code}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{number(o.lots)}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-warning">
                      {number(o.open)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{number(o.kg, 1)} kg</td>
                    <td className="px-4 py-3 text-muted-foreground">{[...o.workshops].join(', ') || '—'}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatVendorSummary(o.vendors, role)}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                      {[...new Set(o.hrcList)].slice(0, 3).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to="/tracking"
                          search={{ material: o.code }}
                          className="rounded border border-input bg-card px-2 py-1 text-[11px] font-semibold text-primary hover:bg-accent"
                          title="Lọc tracking theo mác này"
                        >
                          Theo dõi
                        </Link>
                        <Link
                          to="/orders"
                          search={{ material: o.code }}
                          className="rounded border border-input bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-accent"
                          title="Lọc đơn hàng theo mác này"
                        >
                          Đơn hàng
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Technical Standards & Compliance Notice */}
      <footer className="mt-8 rounded-lg border border-border bg-card p-4 text-xs text-muted-foreground shadow-2xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold text-foreground">
                Quy chuẩn kỹ thuật nhiệt luyện & Bảo mật sản xuất (ISA-101 / CQI-9 / Poka-Yoke)
              </p>
              <p className="mt-0.5 leading-relaxed text-muted-foreground">
                Thông số độ cứng HRC hiển thị trên thước đo tuân theo dải tiêu chuẩn của nhà sản xuất phôi (Hitachi/Daido/Uddeholm). Nghiệm thu lô thành phẩm bắt buộc căn cứ trên chứng chỉ Hardness Test Report và bản vẽ gia công kèm theo. Tên nhà thầu gia công ngoài được bảo mật nghiêm ngặt theo phân quyền Poka-Yoke của nhà máy.
              </p>
            </div>
          </div>
          <div className="shrink-0 font-mono text-[10px] text-muted-foreground">
            DYNAMO-MES-MOD-05 · v2.0
          </div>
        </div>
      </footer>
    </>
  );
}

/**
 * Inline SVG Visual Hardness Gauge (ISA-101 Standard 40 to 62 HRC)
 */
function HrcVisualGauge({
  min = 40,
  max = 62,
  specMin,
  specMax,
  category,
  pinnedHrcCentroid,
  pinnedHrcLabel,
  pinnedCount,
}: {
  min?: number;
  max?: number;
  specMin: number;
  specMax: number;
  category: MaterialCategory;
  pinnedHrcCentroid: number | null;
  pinnedHrcLabel: string;
  pinnedCount: number;
}) {
  const range = max - min;
  const toPercent = (val: number) => {
    const clamped = Math.max(min, Math.min(max, val));
    return ((clamped - min) / range) * 100;
  };

  const zoneStart = toPercent(specMin);
  const zoneWidth = toPercent(specMax) - zoneStart;

  // Major ticks: 40, 45, 50, 55, 60, 62
  const ticks = [40, 45, 50, 55, 60, 62];

  // Pin position
  const pinPos = pinnedHrcCentroid !== null ? toPercent(pinnedHrcCentroid) : null;

  // Theme color for gauge band
  const bandFill =
    category === 'HOT_WORK'
      ? 'fill-amber-500/25 stroke-amber-500/80'
      : category === 'COLD_WORK'
        ? 'fill-sky-500/25 stroke-sky-500/80'
        : 'fill-emerald-500/25 stroke-emerald-500/80';

  const pinFill =
    category === 'HOT_WORK'
      ? '#d97706' // amber-600
      : category === 'COLD_WORK'
        ? '#0284c7' // sky-600
        : '#059669'; // emerald-600

  return (
    <div className="relative select-none pt-2 pb-1">
      {/* SVG Scale */}
      <svg
        viewBox="0 0 300 48"
        className="w-full overflow-visible"
        aria-label={`Thước đo độ cứng: tiêu chuẩn từ ${specMin} đến ${specMax} HRC`}
      >
        {/* Background Track */}
        <rect
          x="0"
          y="18"
          width="300"
          height="12"
          rx="3"
          className="fill-muted/70 stroke-border"
          strokeWidth="1"
        />

        {/* Standard Heat Treatment Zone Highlight */}
        <rect
          x={(zoneStart / 100) * 300}
          y="18"
          width={(zoneWidth / 100) * 300}
          height="12"
          rx="2"
          className={bandFill}
          strokeWidth="1.5"
        />

        {/* Tick marks and numbers */}
        {ticks.map(t => {
          const x = (toPercent(t) / 100) * 300;
          return (
            <g key={t} className="text-muted-foreground">
              <line x1={x} y1="31" x2={x} y2="36" stroke="currentColor" strokeWidth="1" />
              <text
                x={x}
                y="45"
                textAnchor={t === 40 ? 'start' : t === 62 ? 'end' : 'middle'}
                fontSize="8.5"
                fontWeight="600"
                fill="currentColor"
                className="font-mono"
              >
                {t}
              </text>
            </g>
          );
        })}

        {/* Standard Zone Range Labels */}
        <text
          x={((zoneStart + zoneWidth / 2) / 100) * 300}
          y="14"
          textAnchor="middle"
          fontSize="9"
          fontWeight="bold"
          fill="currentColor"
          className="font-mono text-foreground"
        >
          {specMin}–{specMax} HRC
        </text>

        {/* Pinned Marker: Actual Most Frequent Shopfloor Demand */}
        {pinPos !== null && (
          <g transform={`translate(${(pinPos / 100) * 300}, 24)`}>
            {/* Pulsing indicator circle */}
            <circle cx="0" cy="0" r="4.5" fill={pinFill} stroke="#ffffff" strokeWidth="1.5" />
            {/* Arrow Pin pointing down */}
            <path
              d="M -4 -10 L 4 -10 L 0 -3 Z"
              fill={pinFill}
            />
          </g>
        )}
      </svg>

      {/* Pin Information Tooltip Callout */}
      {pinPos !== null && (
        <div className="mt-1 flex items-center justify-between font-mono text-[10px]">
          <span className="flex items-center gap-1 font-bold text-foreground">
            <span className="size-2 rounded-full" style={{ backgroundColor: pinFill }} />
            Thực tế lô hàng: {pinnedHrcLabel}
          </span>
          <span className="text-muted-foreground">({pinnedCount} lô áp dụng)</span>
        </div>
      )}
    </div>
  );
}
export default Materials;
