import React from 'react';
import {
  Boxes,
  Clock3,
  Coins,
  Lock,
  Package,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { money, number } from '@/lib/dynamo-data';
import type { Period } from './dashboard-toolbar';

interface DashboardKpiMatrixProps {
  hasPricing: boolean;
  allTimeCost: number;
  allTimeKg: number;
  allTimePcs: number;
  totalLotsCount: number;
  openLotsCount: number;
  openKg: number;
  openPcs: number;
  inTransitLotsCount: number;
  inTransitKg: number;
  totalFilteredRows: number;
  overdueLotsCount: number;
  maxDelay: number;
  criticalOverdueLotsCount: number;
  otdRate: number | null;
  otdTrendDelta: number;
  otdDenominator: number;
  period: Period;
  periodCost: number;
  periodSharePercent: number;
  costAtRisk: number;
}

export const DashboardKpiMatrix: React.FC<DashboardKpiMatrixProps> = ({
  hasPricing,
  allTimeCost,
  allTimeKg,
  allTimePcs,
  totalLotsCount,
  openLotsCount,
  openKg,
  openPcs,
  inTransitLotsCount,
  inTransitKg,
  totalFilteredRows,
  overdueLotsCount,
  maxDelay,
  criticalOverdueLotsCount,
  otdRate,
  otdTrendDelta,
  otdDenominator,
  period,
  periodCost,
  periodSharePercent,
  costAtRisk,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
      {/* KPI 1: TỔNG CHI PHÍ NHIỆT LUYỆN TOÀN THỜI GIAN (ALL-TIME COST) */}
      <div className="rounded-xs border border-primary/40 bg-card p-2.5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-primary">
            [KPI-01] TỔNG TIỀN NHIỆT (ALL-TIME)
          </span>
          {hasPricing ? <Coins size={14} className="text-primary" /> : <Lock size={13} className="text-muted-foreground" />}
        </div>
        <div className="my-1">
          {hasPricing ? (
            <div
              className="font-mono text-base font-black tabular-nums tracking-tight text-foreground truncate"
              title={`${number(allTimeCost)} VNĐ`}
            >
              {money(allTimeCost)}
            </div>
          ) : (
            <div className="font-mono text-xs font-bold text-muted-foreground py-0.5">CHỈ ĐỌC / NỘI BỘ</div>
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>{number(allTimeKg)} Kg</span>
          <span>{number(allTimePcs)} Pcs · {number(totalLotsCount)} Lô hệ thống</span>
        </div>
      </div>

      {/* KPI 2: TỔNG LÔ ĐANG MỞ (WIP ACTIVE) */}
      <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">LÔ ĐANG MỞ (WIP)</span>
          <Boxes size={14} className="text-info" />
        </div>
        <div className="my-1">
          <div className="font-mono text-base font-black tabular-nums tracking-tight text-foreground">
            {number(openLotsCount)} <span className="text-[11px] font-normal text-muted-foreground">Lô</span>
          </div>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>{number(openKg)} Kg</span>
          <span>{number(openPcs)} Pcs</span>
        </div>
      </div>

      {/* KPI 3: LÔ TẠI VENDOR (IN-TRANSIT / HEAT) */}
      <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">ĐANG NHIỆT / VENDOR</span>
          <Package size={14} className="text-amber-500" />
        </div>
        <div className="my-1">
          <div className="font-mono text-base font-black tabular-nums tracking-tight text-foreground">
            {number(inTransitLotsCount)} <span className="text-[11px] font-normal text-muted-foreground">Lô</span>
          </div>
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>Tải lò: {number(inTransitKg)} Kg</span>
          <span className="text-muted-foreground">
            {totalFilteredRows > 0 ? Math.round((inTransitLotsCount / totalFilteredRows) * 100) : 0}%
          </span>
        </div>
      </div>

      {/* KPI 4: QUÁ HẠN & MỨC ĐỘ TRỄ MAX (OVERDUE & SLA) */}
      <div
        className={`rounded-xs border p-2.5 shadow-2xs flex flex-col justify-between ${
          overdueLotsCount > 0 ? 'border-destructive/40 bg-destructive/5' : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-destructive">QUÁ HẠN (SLA)</span>
          <Clock3 size={14} className="text-destructive" />
        </div>
        <div className="my-1 flex items-baseline gap-1.5">
          <div className="font-mono text-base font-black tabular-nums tracking-tight text-destructive">
            {number(overdueLotsCount)} <span className="text-[11px] font-normal text-muted-foreground">Lô</span>
          </div>
          {maxDelay > 0 && (
            <span className="font-mono text-[10px] font-bold text-destructive">Max trễ: {maxDelay}d</span>
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>Trễ &gt;7d: {criticalOverdueLotsCount} Lô</span>
          <span className="text-destructive font-bold">
            {openLotsCount > 0 ? Math.round((overdueLotsCount / openLotsCount) * 100) : 0}% WIP
          </span>
        </div>
      </div>

      {/* KPI 5: TỶ LỆ ĐÚNG HẠN TRONG KỲ (OTD RATE) */}
      <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">ĐÚNG HẠN (OTD)</span>
          <ShieldCheck size={14} className="text-emerald-500" />
        </div>
        <div className="my-1 flex items-baseline gap-1.5">
          <div className="font-mono text-base font-black tabular-nums tracking-tight text-foreground">
            {otdRate !== null ? `${Math.round(otdRate * 100)}%` : '---'}
          </div>
          {otdTrendDelta !== 0 && (
            <span
              className={`font-mono text-[10px] font-bold flex items-center ${
                otdTrendDelta > 0 ? 'text-emerald-500' : 'text-destructive'
              }`}
            >
              {otdTrendDelta > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {otdTrendDelta > 0 ? `+${otdTrendDelta}%` : `${otdTrendDelta}%`}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>Đã giao: {number(otdDenominator)} Lô</span>
          <span className="text-primary font-semibold">&ge;95% Target</span>
        </div>
      </div>

      {/* KPI 6: CHI PHÍ TRONG KỲ ĐƯỢC CHỌN & RỦI RO ĐỌNG VỐN */}
      <div className="rounded-xs border border-border bg-card p-2.5 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
            {period === 'all' ? 'CHI PHÍ KỲ & RỦI RO' : 'NGÂN SÁCH KỲ NÀY'}
          </span>
          {hasPricing ? <Wallet size={14} className="text-primary" /> : <Lock size={13} className="text-muted-foreground" />}
        </div>
        <div className="my-1">
          {hasPricing ? (
            <div
              className="font-mono text-sm font-black tabular-nums tracking-tight text-foreground truncate"
              title={`Chi phí kỳ: ${number(periodCost)} VNĐ`}
            >
              {money(periodCost)}
              {period !== 'all' && (
                <span className="text-[10px] text-muted-foreground font-normal ml-1">
                  ({periodSharePercent}% tổng)
                </span>
              )}
            </div>
          ) : (
            <div className="font-mono text-xs font-bold text-muted-foreground py-0.5">CHỈ ĐỌC / NỘI BỘ</div>
          )}
        </div>
        <div className="flex items-center justify-between font-mono text-[10px] border-t border-border/50 pt-1">
          <span className="text-muted-foreground">Rủi ro trễ:</span>
          <span className="font-bold text-destructive tabular-nums truncate">
            {hasPricing ? money(costAtRisk) : `${number(overdueLotsCount)} Lô`}
          </span>
        </div>
      </div>
    </div>
  );
};
