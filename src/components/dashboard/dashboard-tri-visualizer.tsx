import React, { useState } from 'react';
import {
  Activity,
  Coins,
  Cpu,
  Layers,
  Lock,
  Zap,
} from 'lucide-react';
import { money, number } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';
import type { MetallurgyAnalytics } from '@/lib/metallurgy-engine';

export type TechTab = 'otd' | 'aging' | 'workload' | 'metallurgy';
export type FinTab = 'trajectory' | 'risk' | 'unit_cost';

interface DashboardTriVisualizerProps {
  techTab: TechTab;
  setTechTab: (t: TechTab) => void;
  finTab: FinTab;
  setFinTab: (f: FinTab) => void;
  hasPricing: boolean;
  role: string;
  locale: string;
  openLotsCount: number;
  otdTrend: {
    weeks: { week: string; rate: number | null; count: number }[];
    delta: number;
  };
  agingTiers: {
    key: string;
    label: string;
    count: number;
    pct: number;
    color: string;
  }[];
  workshopCapacity: {
    workshop: string;
    lots: number;
    kg: number;
    pcs: number;
    overdue: number;
    sharePct: number;
  }[];
  vendorBreakdown: {
    vendor: string;
    lots: number;
    kg: number;
    pcs: number;
    overdue: number;
    cost: number;
    risk: number;
    totalCompleted: number;
    onTimeCompleted: number;
    otd: number | null;
  }[];
  periodCost: number;
  costAtRisk: number;
  allTimeCost: number;
  allTimeKg: number;
  allTimePcs: number;
  metallurgy: MetallurgyAnalytics;
  flowFunnel: {
    stage: string;
    lots: number;
    kg: number;
    pct: number;
    color: string;
  }[];
}

export const DashboardTriVisualizer: React.FC<DashboardTriVisualizerProps> = ({
  techTab,
  setTechTab,
  finTab,
  setFinTab,
  hasPricing,
  role,
  locale,
  openLotsCount,
  otdTrend,
  agingTiers,
  workshopCapacity,
  vendorBreakdown,
  periodCost,
  costAtRisk,
  allTimeCost,
  allTimeKg,
  allTimePcs,
  metallurgy,
  flowFunnel,
}) => {
  const [hoveredFunnel, setHoveredFunnel] = useState<string | null>(null);
  const [hoveredHrc, setHoveredHrc] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* ========================================================================= */}
      {/* CỤM TRÁI: KỸ THUẬT & LUÂN CHUYỂN (TECHNICAL & FLOW ANALYTICS) */}
      {/* ========================================================================= */}
      <div className="rounded-xs border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase text-foreground">
            <Zap size={14} className="text-amber-500" />
            <span>PHÂN TÍCH KỸ THUẬT & LUÂN CHUYỂN</span>
          </div>

          {/* 4 Strategic Tech Tabs */}
          <div className="flex items-center gap-0.5 bg-secondary/60 p-0.5 rounded-xs border border-border">
            <button
              onClick={() => setTechTab('otd')}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
                techTab === 'otd' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              OTD 4 Tuần
            </button>
            <button
              onClick={() => setTechTab('aging')}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
                techTab === 'aging' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Aging Tiers
            </button>
            <button
              onClick={() => setTechTab('workload')}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
                techTab === 'workload' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tải Trọng Xưởng
            </button>
            <button
              onClick={() => setTechTab('metallurgy')}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors flex items-center gap-1 ${
                techTab === 'metallurgy' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Cpu size={10} />
              <span>Luyện Kim & FPY</span>
            </button>
          </div>
        </div>

        <div className="min-h-[148px] flex flex-col justify-center">
          {/* Tab 1: OTD Trend 4 Weeks */}
          {techTab === 'otd' && (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2">
                {otdTrend.weeks.map((w) => (
                  <div key={w.week} className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">{w.week}</div>
                    <div className="font-mono text-sm font-black tabular-nums my-0.5 text-foreground">
                      {w.rate !== null ? `${w.rate}%` : '---'}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">{w.count} Lô</div>
                  </div>
                ))}
              </div>
              <div className="font-mono text-[10px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
                <span>Delta tuần gần nhất: {otdTrend.delta > 0 ? `+${otdTrend.delta}%` : `${otdTrend.delta}%`}</span>
                <span className="text-primary font-bold">Mục tiêu OTD: &ge; 95%</span>
              </div>
            </div>
          )}

          {/* Tab 2: Aging Tiers Breakdown & WIP Flow Funnel */}
          {techTab === 'aging' && (
            <div className="space-y-2">
              {/* WIP Stage Pipeline Funnel (Pure SVG Wireframe) */}
              <div className="p-2 rounded-xs bg-background/50 border border-border/70 space-y-1">
                <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground uppercase">
                  <span className="flex items-center gap-1">
                    <Layers size={10} className="text-primary" />
                    <span>DÒNG CHẢY 4 CHẶNG LUÂN CHUYỂN (WIP PIPELINE FUNNEL)</span>
                  </span>
                  <span>Lead Time TB: {metallurgy.cycleTime.avgDays ?? '--'} ngày</span>
                </div>
                <div className="grid grid-cols-4 gap-1 relative">
                  {flowFunnel.map((st) => (
                    <div
                      key={st.stage}
                      onMouseEnter={() => setHoveredFunnel(st.stage)}
                      onMouseLeave={() => setHoveredFunnel(null)}
                      className="p-1 rounded-xs border border-border/60 bg-card hover:border-primary transition-colors cursor-default text-center relative"
                    >
                      <div className="font-mono text-[9px] text-muted-foreground truncate">{st.stage}</div>
                      <div className="font-mono text-xs font-black text-foreground">{number(st.lots)} Lô</div>
                      <div className="h-1 w-full bg-secondary rounded-xs overflow-hidden my-0.5">
                        <div className={`h-full ${st.color}`} style={{ width: `${Math.max(5, st.pct)}%` }} />
                      </div>
                      <div className="font-mono text-[9px] text-muted-foreground">{number(st.kg)} Kg ({st.pct}%)</div>

                      {/* Tooltip khi hover */}
                      {hoveredFunnel === st.stage && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                          <div className="font-bold">{st.stage}</div>
                          <div>Khối lượng: {number(st.kg)} Kg ({st.pct}%)</div>
                          <div>Số lượng: {number(st.lots)} Lô</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 4 Tầng Quá Hạn & Cận Hạn */}
              <div className="space-y-1">
                {agingTiers.map((tier) => (
                  <div key={tier.key} className="space-y-0.5">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="text-foreground font-semibold">{tier.label}</span>
                      <span className="tabular-nums font-bold text-muted-foreground">
                        {tier.count} Lô ({tier.pct}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-secondary rounded-xs overflow-hidden">
                      <div className={`h-full ${tier.color} transition-all duration-300`} style={{ width: `${tier.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 3: Workshop Capacity Allocation */}
          {techTab === 'workload' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground pb-1 border-b border-border/40">
                <span>Phân Xưởng Sản Xuất</span>
                <span>Khối Lượng & Tỷ Trọng Tải Lò (%)</span>
              </div>
              {workshopCapacity.map((ws) => (
                <div key={ws.workshop} className="space-y-0.5">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-foreground">Phân Xưởng {ws.workshop}</span>
                    <span className="tabular-nums text-foreground font-semibold">
                      {number(ws.kg)} Kg ({ws.sharePct}%) ·{' '}
                      <span className={ws.overdue > 0 ? 'text-destructive font-bold' : 'text-emerald-500'}>
                        {ws.overdue} trễ
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-xs overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${ws.sharePct}%` }} />
                  </div>
                </div>
              ))}
              <div className="font-mono text-[10px] text-muted-foreground pt-1 border-t border-border/40 flex justify-between">
                <span>Cơ cấu công suất lò nhiệt</span>
                <span className="text-primary font-bold">Chi tiết xem Ma trận bên dưới</span>
              </div>
            </div>
          )}

          {/* Tab 4: Metallurgy Quality & Yield (Mới - Chuẩn Senior DA) */}
          {techTab === 'metallurgy' && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                {/* Metric 1: First Pass Yield (FPY) */}
                <div className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                  <div className="font-mono text-[9px] text-muted-foreground uppercase">TỶ LỆ ĐẠT QC (FPY)</div>
                  <div className="font-mono text-base font-black text-emerald-500 my-0.5">
                    {metallurgy.fpy.rate !== null ? `${Math.round(metallurgy.fpy.rate * 100)}%` : '---'}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">
                    Đạt: {metallurgy.fpy.passed} / {metallurgy.fpy.evaluated} Lô
                  </div>
                </div>

                {/* Metric 2: Turnaround Time (TAT) */}
                <div className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                  <div className="font-mono text-[9px] text-muted-foreground uppercase">LEAD TIME BÌNH QUÂN</div>
                  <div className="font-mono text-base font-black text-foreground my-0.5">
                    {metallurgy.cycleTime.avgDays !== null ? `${metallurgy.cycleTime.avgDays}d` : '---'}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">
                    {metallurgy.cycleTime.measurableLots} Lô hoàn tất
                  </div>
                </div>

                {/* Metric 3: Delta HRC Deviation */}
                <div className="rounded-xs border border-border/70 bg-background/60 p-2 text-center">
                  <div className="font-mono text-[9px] text-muted-foreground uppercase">ĐỘ LỆCH CHUẨN HRC</div>
                  <div className={`font-mono text-base font-black my-0.5 ${
                    (metallurgy.avgHrcDelta ?? 0) === 0 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {metallurgy.avgHrcDelta !== null ? `${metallurgy.avgHrcDelta > 0 ? '+' : ''}${metallurgy.avgHrcDelta} HRC` : '0 HRC'}
                  </div>
                  <div className="font-mono text-[9px] text-muted-foreground">
                    {metallurgy.measuredLots} Lô đo cứng
                  </div>
                </div>
              </div>

              {/* Histogram Phân Bố Độ Cứng HRC (Pure SVG Wireframe) */}
              <div className="p-2 rounded-xs bg-background/50 border border-border/70 space-y-1">
                <div className="flex items-center justify-between font-mono text-[9px] text-muted-foreground uppercase">
                  <span>PHÂN BỐ ĐỘ CỨNG HRC THỰC TẾ VS YÊU CẦU</span>
                  <span>Tổng đo: {metallurgy.measuredLots} Lô</span>
                </div>
                <div className="grid grid-cols-3 gap-1 relative">
                  {/* Under Hard */}
                  <div
                    onMouseEnter={() => setHoveredHrc('under')}
                    onMouseLeave={() => setHoveredHrc(null)}
                    className="p-1 rounded-xs border border-border/60 bg-card hover:border-amber-500 transition-colors text-center relative"
                  >
                    <div className="font-mono text-[9px] text-amber-500 font-bold">THIẾU CỨNG (&lt; Min)</div>
                    <div className="font-mono text-xs font-black text-foreground">{metallurgy.hrcDistribution.under} Lô</div>
                    {hoveredHrc === 'under' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                        Độ cứng thực tế thấp hơn dải yêu cầu
                      </div>
                    )}
                  </div>

                  {/* In Range */}
                  <div
                    onMouseEnter={() => setHoveredHrc('inRange')}
                    onMouseLeave={() => setHoveredHrc(null)}
                    className="p-1 rounded-xs border border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500 transition-colors text-center relative"
                  >
                    <div className="font-mono text-[9px] text-emerald-500 font-bold">ĐẠT CHUẨN (In-Range)</div>
                    <div className="font-mono text-xs font-black text-emerald-500">{metallurgy.hrcDistribution.inRange} Lô</div>
                    {hoveredHrc === 'inRange' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                        Nằm trong dung sai thiết kế kỹ thuật
                      </div>
                    )}
                  </div>

                  {/* Over Hard */}
                  <div
                    onMouseEnter={() => setHoveredHrc('over')}
                    onMouseLeave={() => setHoveredHrc(null)}
                    className="p-1 rounded-xs border border-border/60 bg-card hover:border-destructive transition-colors text-center relative"
                  >
                    <div className="font-mono text-[9px] text-destructive font-bold">DƯ CỨNG (&gt; Max)</div>
                    <div className="font-mono text-xs font-black text-foreground">{metallurgy.hrcDistribution.over} Lô</div>
                    {hoveredHrc === 'over' && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-30 px-2 py-1 bg-popover border border-border text-foreground font-mono text-[10px] rounded-xs shadow-md whitespace-nowrap">
                        Độ cứng thực tế vượt trần, nguy cơ gãy giòn
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Mác Thép Chính */}
              <div className="flex items-center justify-between font-mono text-[10px] pt-0.5 text-muted-foreground">
                <span>Top Mác Thép:</span>
                <span className="font-bold text-foreground">
                  {metallurgy.materials.slice(0, 3).map((m) => `${m.material} (${number(m.totalKg)} Kg)`).join(' · ')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CỤM PHẢI: TÀI CHÍNH & GIÁ TRỊ (FINANCIAL & VALUE ANALYTICS) */}
      {/* ========================================================================= */}
      <div className="rounded-xs border border-border bg-card p-3 shadow-2xs flex flex-col justify-between">
        <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border/60 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5 font-mono text-xs font-black uppercase text-foreground">
            <Coins size={14} className="text-primary" />
            <span>PHÂN TÍCH TÀI CHÍNH & GIÁ TRỊ</span>
          </div>

          {/* 3 Strategic Financial Tabs */}
          <div className="flex items-center gap-0.5 bg-secondary/60 p-0.5 rounded-xs border border-border">
            <button
              onClick={() => setFinTab('trajectory')}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
                finTab === 'trajectory' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cơ Cấu Chi Phí
            </button>
            <button
              onClick={() => setFinTab('risk')}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
                finTab === 'risk' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Rủi Ro Đọng Vốn
            </button>
            <button
              onClick={() => setFinTab('unit_cost')}
              className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
                finTab === 'unit_cost' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Đơn Giá Kg/Pcs
            </button>
          </div>
        </div>

        <div className="min-h-[148px] flex flex-col justify-center">
          {!hasPricing ? (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <Lock size={24} className="text-muted-foreground mb-1.5" />
              <span className="font-mono text-xs font-bold text-foreground uppercase">DỮ LIỆU TÀI CHÍNH BẢO MẬT</span>
              <span className="font-mono text-[10px] text-muted-foreground mt-0.5">
                Tài khoản của bạn được cấp quyền giám sát sản lượng, không hiển thị giá trị dòng tiền.
              </span>
            </div>
          ) : (
            <>
              {/* Tab 1: Cost Structure */}
              {finTab === 'trajectory' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground pb-1 border-b border-border/40">
                    <span>Top Đối Tác Gia Công</span>
                    <span>Chi Phí Trong Kỳ (% Tỷ trọng)</span>
                  </div>
                  {vendorBreakdown.slice(0, 4).map((v) => {
                    const share = periodCost > 0 ? Math.round((v.cost / periodCost) * 100) : 0;
                    return (
                      <div key={v.vendor} className="space-y-0.5">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="font-bold text-foreground">{formatVendorName(v.vendor, role, locale)}</span>
                          <span className="tabular-nums text-foreground font-bold">
                            {money(v.cost)} ({share}%)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-xs overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab 2: Cost-at-Risk Allocation */}
              {finTab === 'risk' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between font-mono text-[10px] p-2 bg-destructive/10 border border-destructive/30 rounded-xs">
                    <span className="text-destructive font-bold uppercase">Tổng Vốn Bị "Giam" Do Trễ Hạn:</span>
                    <span className="text-destructive font-black text-sm tabular-nums">{money(costAtRisk)}</span>
                  </div>
                  <div className="space-y-1">
                    {vendorBreakdown.filter((v) => v.risk > 0).slice(0, 3).map((v) => (
                      <div
                        key={v.vendor}
                        className="flex items-center justify-between font-mono text-[10px] py-0.5 border-b border-border/30"
                      >
                        <span className="text-foreground">{formatVendorName(v.vendor, role, locale)}</span>
                        <span className="font-bold text-destructive tabular-nums">
                          {money(v.risk)} ({v.overdue} lô)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 3: Unit Cost Efficiency */}
              {finTab === 'unit_cost' && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xs border border-border/70 bg-background/60 p-2.5 text-center">
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">ĐƠN GIÁ BÌNH QUÂN / KG</div>
                    <div className="font-mono text-base font-black text-foreground my-1">
                      {allTimeKg > 0 ? money(Math.round(allTimeCost / allTimeKg)) : '---'}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">
                      Theo tổng sản lượng {number(allTimeKg)} Kg
                    </div>
                  </div>
                  <div className="rounded-xs border border-border/70 bg-background/60 p-2.5 text-center">
                    <div className="font-mono text-[10px] text-muted-foreground uppercase">ĐƠN GIÁ BÌNH QUÂN / PCS</div>
                    <div className="font-mono text-base font-black text-foreground my-1">
                      {allTimePcs > 0 ? money(Math.round(allTimeCost / allTimePcs)) : '---'}
                    </div>
                    <div className="font-mono text-[9px] text-muted-foreground">
                      Theo tổng số lượng {number(allTimePcs)} Pcs
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
