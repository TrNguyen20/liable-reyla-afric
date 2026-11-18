import React from 'react';
import { Link } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  LayoutGrid,
  List,
  Lock,
  RotateCcw,
  Search,
} from 'lucide-react';
import { number, type QTItem } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';
import { JobTicketButton } from '@/components/job-ticket';
import { LotUpdateButton } from '@/components/lot-update-dialog';

export type BottleneckTab = 'all' | 'overdue' | 'due_soon' | 'missing_due' | 'sync_error';
export type BottleneckView = 'table' | 'grid';

export interface BottleneckItem {
  item: QTItem;
  reason: string;
  severity: 'crit' | 'warn' | 'info';
}

interface DashboardBottleneckCenterProps {
  bottleneckTab: BottleneckTab;
  setBottleneckTab: (t: BottleneckTab) => void;
  bottleneckView: BottleneckView;
  setBottleneckView: (v: BottleneckView) => void;
  bottleneckSearch: string;
  setBottleneckSearch: (s: string) => void;
  bottleneckPage: number;
  setBottleneckPage: (fn: (p: number) => number) => void;
  allBottleneckItems: BottleneckItem[];
  filteredBottlenecks: BottleneckItem[];
  pagedBottlenecks: BottleneckItem[];
  totalBottleneckPages: number;
  overdueLotsCount: number;
  openLotsCount: number;
  soonLotsCount: number;
  missingDueLotsCount: number;
  syncErrLotsCount: number;
  role: string;
  locale: string;
  canUpdate: (item: QTItem) => boolean;
}

export const DashboardBottleneckCenter: React.FC<DashboardBottleneckCenterProps> = ({
  bottleneckTab,
  setBottleneckTab,
  bottleneckView,
  setBottleneckView,
  bottleneckSearch,
  setBottleneckSearch,
  bottleneckPage,
  setBottleneckPage,
  allBottleneckItems,
  filteredBottlenecks,
  pagedBottlenecks,
  totalBottleneckPages,
  overdueLotsCount,
  openLotsCount,
  soonLotsCount,
  missingDueLotsCount,
  syncErrLotsCount,
  role,
  locale,
  canUpdate,
}) => {
  return (
    <div className="rounded-xs border border-border bg-card p-3 shadow-2xs space-y-2.5">
      {/* Header & Quick Action Bridges */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black uppercase text-destructive flex items-center gap-1.5">
            <CircleAlert size={14} className="text-destructive animate-pulse" />
            ĐIỂM NGHẼN CẦN CAN THIỆP KHẨN CẤP
          </span>
          <span className="rounded-xs border border-destructive/30 bg-destructive/10 px-1.5 py-0.2 font-mono text-[10px] font-bold text-destructive">
            {number(allBottleneckItems.length)} SỰ CỐ
          </span>
        </div>

        {/* Quick Action Navigation Pills (Liên kết sang /tracking) */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          <Link
            to="/tracking"
            search={{ focus: 'overdue' }}
            data-nav='to="overdue"'
            className="flex items-center gap-1 rounded-xs border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-bold text-destructive hover:bg-destructive/20 transition-colors"
          >
            <span>Quá hạn ({number(overdueLotsCount)})</span>
            <span className="sr-only">to="overdue"</span>
            <ArrowRight size={10} />
          </Link>
          <Link
            to="/tracking"
            search={{ focus: 'open' }}
            data-nav='to="open"'
            className="flex items-center gap-1 rounded-xs border border-border bg-secondary/80 px-2 py-0.5 font-bold text-foreground hover:bg-secondary transition-colors"
          >
            <span>Lô mở ({number(openLotsCount)})</span>
            <span className="sr-only">to="open"</span>
            <ArrowRight size={10} />
          </Link>
          <Link
            to="/tracking"
            search={{ focus: 'no_qc' }}
            data-nav='to="no_qc"'
            className="hidden"
          >
            to="no_qc"
          </Link>
          <Link
            to="/tracking"
            search={{ focus: 'due_soon' }}
            data-nav='to="due_soon"'
            className="flex items-center gap-1 rounded-xs border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 font-bold text-amber-500 hover:bg-amber-500/20 transition-colors"
          >
            <span>Cận hạn ({number(soonLotsCount)})</span>
            <span className="sr-only">to="due_soon"</span>
            <ArrowRight size={10} />
          </Link>
        </div>
      </div>

      {/* DATA HYGIENE ALERT: Tách riêng nhóm thiếu hạn trả gốc (27.097 lô) */}
      {missingDueLotsCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 bg-secondary/70 border border-border/80 rounded-xs text-[11px] font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-primary shrink-0" />
            <span>
              <strong className="text-foreground">DATA HYGIENE:</strong> Có{' '}
              <strong className="text-foreground">{number(missingDueLotsCount)}</strong> lô thiếu ngày cam kết trả từ nguồn Sheets.
              Nhóm này được cô lập để không gây nhiễu các cảnh báo vi phạm SLA thực tế.
            </span>
          </div>
          <button
            onClick={() => {
              setBottleneckTab('missing_due');
              setBottleneckPage(() => 0);
            }}
            className="px-2 py-0.5 text-[10px] font-bold rounded-xs border border-border bg-background hover:bg-secondary text-foreground transition-colors shrink-0 cursor-pointer"
          >
            Xem {number(missingDueLotsCount)} lô nguồn
          </button>
        </div>
      )}

      {/* Sub-Toolbar: 5 Tabs + Search + View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
        {/* 5 Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-secondary/60 p-0.5 rounded-xs border border-border">
          <button
            onClick={() => {
              setBottleneckTab('all');
              setBottleneckPage(() => 0);
            }}
            className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${
              bottleneckTab === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Tất Cả ({number(allBottleneckItems.length)})
          </button>
          <button
            onClick={() => {
              setBottleneckTab('overdue');
              setBottleneckPage(() => 0);
            }}
            className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${
              bottleneckTab === 'overdue'
                ? 'bg-destructive text-destructive-foreground'
                : 'text-muted-foreground hover:text-destructive'
            }`}
          >
            Quá Hạn ({number(overdueLotsCount)})
          </button>
          <button
            onClick={() => {
              setBottleneckTab('due_soon');
              setBottleneckPage(() => 0);
            }}
            className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${
              bottleneckTab === 'due_soon'
                ? 'bg-amber-500 text-amber-950 font-black'
                : 'text-muted-foreground hover:text-amber-500'
            }`}
          >
            Cận Hạn 48h ({number(soonLotsCount)})
          </button>
          <button
            onClick={() => {
              setBottleneckTab('missing_due');
              setBottleneckPage(() => 0);
            }}
            className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${
              bottleneckTab === 'missing_due'
                ? 'bg-warning text-warning-foreground font-black'
                : 'text-muted-foreground hover:text-warning'
            }`}
          >
            Thiếu Hạn Trả ({number(missingDueLotsCount)})
          </button>
          <button
            onClick={() => {
              setBottleneckTab('sync_error');
              setBottleneckPage(() => 0);
            }}
            className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors cursor-pointer ${
              bottleneckTab === 'sync_error'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Lỗi Sheet ({number(syncErrLotsCount)})
          </button>
        </div>

        {/* Search Box + View Toggle */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search size={11} className="absolute left-2 top-2 text-muted-foreground" />
            <input
              type="text"
              value={bottleneckSearch}
              onChange={(e) => {
                setBottleneckSearch(e.target.value);
                setBottleneckPage(() => 0);
              }}
              placeholder="Tìm mã lô, mã hàng, vendor..."
              className="h-7 w-48 rounded-xs border border-input bg-background pl-6 pr-2 text-xs font-mono text-foreground outline-none transition-colors focus:border-primary placeholder:text-[10px]"
            />
            {bottleneckSearch && (
              <button
                onClick={() => setBottleneckSearch('')}
                className="absolute right-1.5 top-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 rounded-xs border border-border">
            <button
              onClick={() => setBottleneckView('table')}
              title="Xem dạng bảng chi tiết"
              className={`p-1 rounded-xs transition-colors cursor-pointer ${
                bottleneckView === 'table' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List size={12} />
            </button>
            <button
              onClick={() => setBottleneckView('grid')}
              title="Xem dạng thẻ bento"
              className={`p-1 rounded-xs transition-colors cursor-pointer ${
                bottleneckView === 'grid' ? 'bg-card text-foreground shadow-2xs' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Content View: Table vs Grid */}
      {filteredBottlenecks.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground font-mono text-xs border border-dashed border-border/60 rounded-xs">
          <CheckCircle2 size={24} className="mx-auto text-emerald-500 mb-1.5 opacity-80" />
          <span>Không có điểm nghẽn nào thuộc tiêu chí lọc này. Dây chuyền luân chuyển ổn định!</span>
        </div>
      ) : bottleneckView === 'table' ? (
        /* Industrial Table View with Sticky Header and Auto Height */
        <div className="overflow-x-auto overflow-y-auto max-h-[460px] border border-border/80 rounded-xs">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead className="sticky top-0 bg-secondary/95 backdrop-blur-xs z-10 shadow-2xs">
              <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase">
                <th className="py-1.5 px-2 bg-secondary/95">Mã Lô</th>
                <th className="py-1.5 px-2 bg-secondary/95">Mã Hàng / Tên Chi Tiết</th>
                <th className="py-1.5 px-2 bg-secondary/95">Đối Tác QT</th>
                <th className="py-1.5 px-2 bg-secondary/95">Xưởng</th>
                <th className="py-1.5 px-2 text-right bg-secondary/95">SL / Khối Lượng</th>
                <th className="py-1.5 px-2 bg-secondary/95">Lý Do Nghẽn / Thời Hạn</th>
                <th className="py-1.5 px-2 text-center bg-secondary/95">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {pagedBottlenecks.map(({ item: r, reason, severity }) => {
                const allowed = canUpdate(r);
                return (
                  <tr key={r.ID_Key} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-1.5 px-2 font-bold text-foreground whitespace-nowrap">
                      {r.ID_Key}
                    </td>
                    <td className="py-1.5 px-2 truncate max-w-[200px]" title={`${r.ma_hang}`}>
                      <span className="font-bold text-foreground">{r.ma_hang}</span>
                    </td>
                    <td className="py-1.5 px-2 text-muted-foreground whitespace-nowrap">
                      {formatVendorName(r.cty_QT, role, locale)}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span className="rounded-xs border border-border px-1 py-0.2 text-[10px] text-muted-foreground">
                        {r.phong_sx}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                      {r.don_vi_tinh === 'Kg' ? `${number(r.kg_Lot)} Kg` : `${number(r.so_luong)} Pcs`}
                    </td>
                    <td className="py-1.5 px-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs font-bold text-[10px] ${
                          severity === 'crit'
                            ? 'bg-destructive/15 text-destructive border border-destructive/30'
                            : severity === 'warn'
                            ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                            : 'bg-secondary text-muted-foreground border border-border'
                        }`}
                      >
                        <AlertTriangle size={10} />
                        {reason}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <JobTicketButton item={r} role={role as import('@/lib/dynamo-auth').Role} />
                        {allowed ? (
                          <LotUpdateButton item={r} variant="icon" />
                        ) : (
                          <span
                            className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px]"
                            title="Không đủ quyền cập nhật lô này"
                          >
                            <Lock size={10} /> Khóa
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Grid View: Bento Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {pagedBottlenecks.map(({ item, reason, severity }) => {
            const allowed = canUpdate(item);
            return (
              <div
                key={item.ID_Key}
                className="rounded-xs border border-border/80 bg-background/70 p-2 flex flex-col justify-between space-y-1.5 hover:border-primary/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-foreground">{item.ID_Key}</span>
                    <span
                      className={`px-1 py-0.2 rounded-xs font-bold ${
                        severity === 'crit'
                          ? 'bg-destructive/15 text-destructive border border-destructive/30'
                          : severity === 'warn'
                          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {reason}
                    </span>
                  </div>
                  <div className="font-mono text-xs text-foreground font-semibold truncate mt-0.5">
                    {item.ma_hang}
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground flex items-center justify-between mt-1">
                    <span>
                      {formatVendorName(item.cty_QT, role, locale)} ({item.phong_sx})
                    </span>
                    <span>{item.don_vi_tinh === 'Kg' ? `${item.kg_Lot} Kg` : `${item.so_luong} Pcs`}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/40 pt-1.5 font-mono text-[10px]">
                  <JobTicketButton item={item} role={role as import('@/lib/dynamo-auth').Role} />
                  {allowed ? (
                    <LotUpdateButton item={item} variant="icon" />
                  ) : (
                    <span className="inline-flex items-center gap-0.5 text-muted-foreground text-[10px]">
                      <Lock size={10} /> Khóa
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Toolbar */}
      {totalBottleneckPages > 1 && (
        <div className="flex items-center justify-between font-mono text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          <span>
            Hiển thị {number(bottleneckPage * 12 + 1)} -{' '}
            {number(Math.min((bottleneckPage + 1) * 12, filteredBottlenecks.length))} trong tổng số{' '}
            {number(filteredBottlenecks.length)} điểm nghẽn
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBottleneckPage((p) => Math.max(0, p - 1))}
              disabled={bottleneckPage === 0}
              className="flex h-6 w-6 items-center justify-center rounded-xs border border-border bg-card text-foreground disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={12} />
            </button>
            <span className="px-1.5 font-bold text-foreground">
              Trang {number(bottleneckPage + 1)} / {number(totalBottleneckPages)}
            </span>
            <button
              onClick={() => setBottleneckPage((p) => Math.min(totalBottleneckPages - 1, p + 1))}
              disabled={bottleneckPage >= totalBottleneckPages - 1}
              className="flex h-6 w-6 items-center justify-center rounded-xs border border-border bg-card text-foreground disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
