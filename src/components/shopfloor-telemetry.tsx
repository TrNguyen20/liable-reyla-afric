import { Link } from '@tanstack/react-router';
import { fetchScopedSheet } from '@/lib/sheet.functions';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock, RefreshCw, Zap } from 'lucide-react';
import { useDynamo } from '@/components/dynamo-shell';
import { isDueSoon, isOpen, isOverdue, onTimeRate } from '@/lib/dynamo-rules';
import { number } from '@/lib/dynamo-data';
import { LIVE_SHEET_URL } from '@/lib/live-sheet';

import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';

export { LIVE_SHEET_URL };

function getShift(d = new Date()): string {
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'Ca 1 (06:00 - 14:00)';
  if (h >= 14 && h < 22) return 'Ca 2 (14:00 - 22:00)';
  return 'Ca 3 (22:00 - 06:00)';
}

export function ShopfloorTelemetry() {
  const { filtered, dataset, sourceLabel, syncedAt, pullLive, loading, loadError } = useDynamo();
  const [shiftName, setShiftName] = useState('');

  useEffect(() => {
    setShiftName(getShift(new Date()));
    const shiftInterval = setInterval(() => setShiftName(getShift(new Date())), 60000);
    return () => clearInterval(shiftInterval);
  }, []);

  const state = loading ? 'busy' : loadError ? 'error' : 'idle';

  const m = useMemo(() => {
    let waiting = 0;
    let atVendor = 0;
    let stocked = 0;
    let kg = 0;
    let pcs = 0;
    const wsMap: Record<string, number> = { PIN: 0, INSERT: 0, MOLD: 0 };

    for (let i = 0; i < filtered.length; i++) {
      const r = filtered[i];
      if (r.TrangThai === 'Chờ xuất xưởng') waiting++;
      else if (r.TrangThai === 'Đang tại Vendor') atVendor++;
      else if (r.TrangThai === 'Đã nhập kho') stocked++;

      if (isOpen(r)) {
        if (r.don_vi_tinh === 'Kg') kg += r.kg_Lot;
        else pcs += r.so_luong;
        if (wsMap[r.phong_sx] !== undefined) wsMap[r.phong_sx]++;
      }
    }

    const ws = (['PIN', 'INSERT', 'MOLD'] as const).map((w) => ({
      w,
      n: wsMap[w] || 0,
    }));

    return {
      open: waiting + atVendor,
      kg,
      pcs,
      waiting,
      atVendor,
      stocked,
      ws,
    };
  }, [filtered]);

  const totalWs = m.ws.reduce((a, x) => a + x.n, 0) || 1;
  const led =
    state === 'error'
      ? 'bg-destructive'
      : state === 'busy'
      ? 'bg-warning animate-pulse'
      : 'bg-run fx-run-dot';

  const syncText =
    state === 'busy'
      ? 'Đang đồng bộ...'
      : state === 'error'
      ? 'Lỗi kết nối Google Sheets'
      : syncedAt
      ? `Cập nhật lúc ${new Date(syncedAt).toLocaleTimeString('vi-VN', { hour12: false })}`
      : 'Sẵn sàng đồng bộ';

  return (
    <div className="relative border-b border-border/80 bg-secondary/40 backdrop-blur-xs">
      <div className="grid grid-cols-1 divide-y divide-border/60 text-[11px] md:grid-cols-3 md:divide-y-0 md:divide-x lg:grid-cols-[1.5fr_1fr_1.5fr]">
        {/* Cột 1: Trạng thái kết nối Sheet & Nút Làm Mới Tinh Gọn */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 xl:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`size-2 shrink-0 rounded-full transition-colors ${led}`} aria-hidden />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground tracking-tight">{syncText}</p>
                {shiftName && (
                  <span className="hidden font-mono text-[9px] font-bold text-muted-foreground sm:inline rounded-xs bg-muted/60 px-1 py-0.2">
                    {shiftName}
                  </span>
                )}
              </div>
              <p className="truncate font-mono text-[10px] text-muted-foreground tabular-nums">
                {number(dataset.length)} dòng · {sourceLabel}
              </p>
            </div>
          </div>

          <button
            onClick={() => void pullLive(true)}
            disabled={state === 'busy'}
            title="Làm mới dữ liệu tức thì từ Google Sheets (Phím tắt: Shift + R)"
            aria-label="Làm mới dữ liệu từ Google Sheets"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/80 bg-background/90 hover:bg-background px-2.5 py-1 text-[11px] font-bold text-foreground shadow-2xs hover:border-primary/50 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={12} className={state === 'busy' ? 'animate-spin text-primary' : 'text-primary'} />
            <span>{state === 'busy' ? 'Đang tải…' : 'Làm mới'}</span>
            <kbd className="hidden font-mono text-[9px] text-muted-foreground sm:inline-block bg-muted/80 px-1 py-0.2 rounded border border-border/50">
              Shift+R
            </kbd>
          </button>
        </div>

        {/* Cột 2: Khối lượng hàng ngoài xưởng */}
        <div className="px-4 py-2">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">Hàng ngoài xưởng</p>
          <p className="font-mono font-bold tabular-nums text-foreground">
            {number(m.kg, 1)} <span className="text-[11px] font-normal text-muted-foreground">kg</span>{' '}
            <span className="text-muted-foreground">/</span>{' '}
            {number(m.pcs)} <span className="text-[11px] font-normal text-muted-foreground">pcs</span>
          </p>
        </div>

        {/* Cột 3: Tải theo phân xưởng */}
        <div className="px-4 py-2 xl:px-6">
          <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-bold tracking-wider uppercase">Tải theo xưởng</span>
            <span className="font-mono font-bold tabular-nums text-foreground">{number(m.open)} lô mở</span>
          </div>
          <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-xs bg-border/80">
            {m.ws.map((x, i) => (
              <span
                key={x.w}
                title={`${x.w}: ${x.n} lô (${Math.round((x.n / totalWs) * 100)}%)`}
                style={{ width: `${(x.n / totalWs) * 100}%` }}
                className={['bg-info', 'bg-primary', 'bg-warning'][i]}
              />
            ))}
          </div>
          <p className="mt-1 flex gap-3 font-mono text-[10px] text-muted-foreground tabular-nums">
            {m.ws.map((x) => (
              <span key={x.w}>
                <b className="font-semibold text-foreground/80">{x.w}</b> {Math.round((x.n / totalWs) * 100)}%
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  );
}
