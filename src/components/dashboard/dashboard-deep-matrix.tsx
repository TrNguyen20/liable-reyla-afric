import React from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { money, number } from '@/lib/dynamo-data';
import { formatVendorName } from '@/lib/dynamo-auth';

export type MatrixTab = 'vendor' | 'workshop' | 'orders';

export interface AtRiskOrder {
  orderNo: string;
  partner: string;
  workshop: string;
  totalLots: number;
  stockedLots: number;
  openLots: number;
  overdueLots: number;
  soonLots: number;
  totalCost: number;
  riskCost: number;
  riskScore: number;
  completionPercent: number;
}

interface DashboardDeepMatrixProps {
  matrixTab: MatrixTab;
  setMatrixTab: (m: MatrixTab) => void;
  hasPricing: boolean;
  role: string;
  locale: string;
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
  workshopCapacity: {
    workshop: string;
    lots: number;
    kg: number;
    pcs: number;
    overdue: number;
    sharePct: number;
  }[];
  atRiskOrders: AtRiskOrder[];
}

export const DashboardDeepMatrix: React.FC<DashboardDeepMatrixProps> = ({
  matrixTab,
  setMatrixTab,
  hasPricing,
  role,
  locale,
  vendorBreakdown,
  workshopCapacity,
  atRiskOrders,
}) => {
  return (
    <div className="rounded-xs border border-border bg-card p-3 shadow-2xs space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-black uppercase text-foreground">
            MA TRẬN ĐIỀU HÀNH VÀ PHÂN BỔ ĐA CHIỀU
          </span>
        </div>

        <div className="flex items-center gap-1 bg-secondary/60 p-0.5 rounded-xs border border-border">
          <button
            onClick={() => setMatrixTab('vendor')}
            className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
              matrixTab === 'vendor' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Theo Đối Tác (Vendor)
          </button>
          <button
            onClick={() => setMatrixTab('workshop')}
            className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
              matrixTab === 'workshop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Theo Phân Xưởng
          </button>
          <button
            onClick={() => setMatrixTab('orders')}
            className={`px-2.5 py-0.5 font-mono text-[10px] font-bold rounded-xs transition-colors ${
              matrixTab === 'orders' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Top Đơn Hàng Rủi Ro
          </button>
        </div>
      </div>

      {/* Matrix View 1: Theo Đối Tác */}
      {matrixTab === 'vendor' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase bg-secondary/40">
                <th className="py-1.5 px-2">Đối Tác Gia Công</th>
                <th className="py-1.5 px-2 text-right">Tổng Lô</th>
                <th className="py-1.5 px-2 text-right">Khối Lượng</th>
                <th className="py-1.5 px-2 text-right">Quá Hạn</th>
                <th className="py-1.5 px-2 text-right">OTD</th>
                {hasPricing && <th className="py-1.5 px-2 text-right">Chi Phí Kỳ</th>}
                {hasPricing && <th className="py-1.5 px-2 text-right text-destructive">Tiền Rủi Ro</th>}
                <th className="py-1.5 px-2 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {vendorBreakdown.map((v) => (
                <tr key={v.vendor} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-1.5 px-2 font-bold text-foreground">
                    {formatVendorName(v.vendor, role, locale)}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(v.lots)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(v.kg)} Kg</td>
                  <td
                    className={`py-1.5 px-2 text-right tabular-nums font-bold ${
                      v.overdue > 0 ? 'text-destructive' : 'text-emerald-500'
                    }`}
                  >
                    {v.overdue}
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-bold">
                    {v.otd !== null ? `${v.otd}%` : '---'}
                  </td>
                  {hasPricing && <td className="py-1.5 px-2 text-right tabular-nums text-foreground">{money(v.cost)}</td>}
                  {hasPricing && (
                    <td
                      className={`py-1.5 px-2 text-right tabular-nums font-bold ${
                        v.risk > 0 ? 'text-destructive' : 'text-muted-foreground'
                      }`}
                    >
                      {v.risk > 0 ? money(v.risk) : '0'}
                    </td>
                  )}
                  <td className="py-1.5 px-2 text-center">
                    <Link
                      to="/tracking"
                      search={{ focus: 'open', vendor: v.vendor }}
                      className="inline-flex items-center gap-1 rounded-xs border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <span>Tracking</span>
                      <ArrowRight size={10} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Matrix View 2: Theo Phân Xưởng */}
      {matrixTab === 'workshop' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase bg-secondary/40">
                <th className="py-1.5 px-2">Phân Xưởng</th>
                <th className="py-1.5 px-2 text-right">Tổng Số Lô</th>
                <th className="py-1.5 px-2 text-right">Tổng Khối Lượng</th>
                <th className="py-1.5 px-2 text-right">Tổng Số Lượng</th>
                <th className="py-1.5 px-2 text-right text-destructive">Lô Quá Hạn</th>
                <th className="py-1.5 px-2 text-center">Liên Kết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {workshopCapacity.map((ws) => (
                <tr key={ws.workshop} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-1.5 px-2 font-bold text-foreground">Phân Xưởng {ws.workshop}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(ws.lots)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(ws.kg)} Kg</td>
                  <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{number(ws.pcs)} Pcs</td>
                  <td
                    className={`py-1.5 px-2 text-right tabular-nums font-bold ${
                      ws.overdue > 0 ? 'text-destructive' : 'text-emerald-500'
                    }`}
                  >
                    {ws.overdue}
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    <Link
                      to="/tracking"
                      search={{ focus: 'open' }}
                      className="inline-flex items-center gap-1 rounded-xs border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    >
                      <span>Mở Xưởng</span>
                      <ArrowRight size={10} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Matrix View 3: Top Đơn Hàng Rủi Ro */}
      {matrixTab === 'orders' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border text-[10px] font-bold text-muted-foreground uppercase bg-secondary/40">
                <th className="py-1.5 px-2">Số Đơn Hàng</th>
                <th className="py-1.5 px-2">Đối Tác</th>
                <th className="py-1.5 px-2 text-right">Tiến Độ Lô</th>
                <th className="py-1.5 px-2 text-right text-destructive">Quá Hạn</th>
                {hasPricing && <th className="py-1.5 px-2 text-right text-destructive">Tiền Rủi Ro</th>}
                <th className="py-1.5 px-2 text-center">Cầu Nối Đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {atRiskOrders.map((ord) => (
                <tr key={ord.orderNo} className="hover:bg-secondary/30 transition-colors">
                  <td className="py-1.5 px-2 font-bold text-foreground">{ord.orderNo}</td>
                  <td className="py-1.5 px-2 text-muted-foreground">{formatVendorName(ord.partner, role, locale)}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">
                    <span className="text-foreground font-bold">{ord.stockedLots}</span>/{ord.totalLots} ({ord.completionPercent}%)
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums font-bold text-destructive">{ord.overdueLots}</td>
                  {hasPricing && (
                    <td className="py-1.5 px-2 text-right tabular-nums font-bold text-destructive">
                      {money(ord.riskCost)}
                    </td>
                  )}
                  <td className="py-1.5 px-2 text-center">
                    <Link
                      to="/orders"
                      className="inline-flex items-center gap-1 rounded-xs border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors"
                    >
                      <span>Chi Tiết Đơn</span>
                      <ExternalLink size={10} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
