import React from 'react';
import { Filter, RefreshCw, RotateCcw } from 'lucide-react';
import { number } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';
import type { Logistics } from '@/lib/dynamo-rules';

export type Period = 'all' | 'today' | 'week' | 'this' | 'prev' | 'q1' | 'q2' | 'q3' | 'q4' | 'year';

interface DashboardToolbarProps {
  period: Period;
  setPeriod: (p: Period) => void;
  vendor: string;
  setVendor: (v: string) => void;
  logi: 'all' | Logistics;
  setLogi: (l: 'all' | Logistics) => void;
  rawVendors: string[];
  workshop: string;
  filteredCount: number;
  totalCount: number;
  currentYear: number;
  role: string;
  locale: string;
  t: (key: string) => string;
  loading: boolean;
  pullLive: (force?: boolean) => void;
  resetFilters: () => void;
  isFiltered: boolean;
}

const sel = 'h-7.5 rounded-xs border border-input bg-background px-2 text-xs text-foreground outline-none transition-colors focus:border-primary font-mono';

export const DashboardToolbar: React.FC<DashboardToolbarProps> = ({
  period,
  setPeriod,
  vendor,
  setVendor,
  logi,
  setLogi,
  rawVendors,
  workshop,
  filteredCount,
  totalCount,
  currentYear,
  role,
  locale,
  t,
  loading,
  pullLive,
  resetFilters,
  isFiltered,
}) => {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border/80 pb-2 mb-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-black tracking-wider uppercase text-foreground flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-primary animate-pulse" />
            [2] TỔNG QUAN LUÂN CHUYỂN
          </span>
          <span className="rounded-xs border border-primary/30 bg-primary/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary">
            {workshop === 'Tất cả' ? (t('tracking.workshops.all') || 'TẤT CẢ PHÂN XƯỞNG') : `${t('tracking.workshops.title') || 'XƯỞNG'} ${workshop}`}
          </span>
          <span className="rounded-xs border border-border bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-muted-foreground">
            {number(filteredCount)} / {number(totalCount)} LÔ KỲ NÀY
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60 hidden xl:inline">SOP-MES-08</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground mr-1">
            <Filter size={12} className="text-primary" />
            <span className="font-mono text-[10px] uppercase">LỌC KỲ:</span>
          </div>

          {/* 10 Enterprise Reporting Periods */}
          <select
            aria-label="Kỳ báo cáo"
            className={sel}
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
          >
            <option value="all">Toàn bộ kỳ (All-Time)</option>
            <option value="today">Hôm nay (Today)</option>
            <option value="week">7 ngày qua (7D)</option>
            <option value="this">Tháng này (Current Month)</option>
            <option value="prev">Tháng trước (Last Month)</option>
            <option value="q1">Quý 1 (Q1: Jan-Mar)</option>
            <option value="q2">Quý 2 (Q2: Apr-Jun)</option>
            <option value="q3">Quý 3 (Q3: Jul-Sep)</option>
            <option value="q4">Quý 4 (Q4: Oct-Dec)</option>
            <option value="year">Cả năm ({currentYear})</option>
          </select>

          {/* Vendor Filter */}
          <select
            aria-label="Vendor"
            className={sel}
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          >
            <option value="all">Mọi đối tác</option>
            {rawVendors.map((v) => (
              <option key={v} value={v}>
                {formatVendorName(v, role, locale)}
              </option>
            ))}
          </select>

          {/* Logistics Filter */}
          <select
            aria-label="Trạng thái logistics"
            className={sel}
            value={logi}
            onChange={(e) => setLogi(e.target.value as Logistics)}
          >
            <option value="all">Mọi tiến độ</option>
            <option value="Chờ xuất xưởng">Chờ xuất xưởng</option>
            <option value="Đang tại Vendor">Đang tại Vendor (HEAT)</option>
            <option value="Đã nhập kho">Hoàn tất (DONE)</option>
          </select>

          {isFiltered && (
            <button
              onClick={resetFilters}
              title="Đặt lại bộ lọc"
              className="flex h-7.5 items-center gap-1 rounded-xs border border-border bg-secondary/80 px-2 text-[11px] font-semibold text-foreground hover:bg-secondary transition-colors"
            >
              <RotateCcw size={11} />
              <span>Xóa lọc</span>
            </button>
          )}

          {/* Refresh Button & Shift+R Shortcut */}
          <button
            onClick={() => pullLive(true)}
            disabled={loading}
            title="Làm mới dữ liệu từ Google Sheets (Shift+R)"
            className="flex h-7.5 items-center gap-1 rounded-xs border border-border bg-card px-2 font-mono text-[11px] font-bold text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin text-primary' : ''} />
            <span>Làm mới</span>
            <span className="hidden sm:inline-block rounded-xs bg-muted px-1 py-0.2 text-[9px] text-muted-foreground">Shift+R</span>
          </button>
        </div>
      </div>
    </div>
  );
};
