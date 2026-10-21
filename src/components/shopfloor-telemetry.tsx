import { Link } from '@tanstack/react-router';
import { fetchScopedSheet } from '@/lib/sheet.functions';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clock, RefreshCw, Zap } from 'lucide-react';
import { useDynamo } from '@/components/dynamo-shell';
import { isDueSoon, isOpen, isOverdue, onTimeRate } from '@/lib/dynamo-rules';
import { number } from '@/lib/dynamo-data';
import { LIVE_SHEET_URL } from '@/lib/live-sheet';

export { LIVE_SHEET_URL };

const CADENCE = 60;

function getShift(d = new Date()): string {
  const h = d.getHours();
  if (h >= 6 && h < 14) return 'Ca 1 (06:00 - 14:00)';
  if (h >= 14 && h < 22) return 'Ca 2 (14:00 - 22:00)';
  return 'Ca 3 (22:00 - 06:00)';
}

export function ShopfloorTelemetry() {
  const { filtered, dataset, sourceLabel, syncedAt, applyDataset } = useDynamo();
  const auto = true;
  const [left, setLeft] = useState(CADENCE);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const [shiftName, setShiftName] = useState('');
  const busy = useRef(false);

  useEffect(() => {
    setShiftName(getShift(new Date()));
    const shiftInterval = setInterval(() => setShiftName(getShift(new Date())), 60000);
    return () => clearInterval(shiftInterval);
  }, []);

  const pull = async () => {
    if (busy.current) return;
    busy.current = true;
    setState('busy');
    try {
      const r = await fetchScopedSheet({ data: { url: LIVE_SHEET_URL } });
      applyDataset(r.items, 'Google Sheets');
      setState('idle');
    } catch {
      setState('error');
    } finally {
      busy.current = false;
      setLeft(CADENCE);
    }
  };

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [auto]);

  useEffect(() => {
    if (auto && left <= 0) void pull();
  }, [left, auto]);

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
      : auto
      ? 'bg-run fx-run-dot'
      : 'bg-muted-foreground';

  const syncText =
    state === 'busy'
      ? 'Đang đồng bộ...'
      : state === 'error'
      ? 'Lỗi đồng bộ, thử lại sau 60s'
      : auto
      ? `Đồng bộ sau ${Math.max(left, 0)}s`
      : 'Đồng bộ tự động tắt';

  return (
    <div className="relative border-b border-border/80 bg-secondary/40 backdrop-blur-xs">
      <div className="grid grid-cols-2 divide-x divide-border/60 text-[11px] lg:grid-cols-[1.4fr_1fr_1.2fr_1.4fr]">
        {/* Cột 1: Trạng thái kết nối Sheet & Ca kíp */}
        <div className="flex items-center gap-2.5 px-4 py-2 xl:px-6">
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
              {number(dataset.length)} dòng · {auto ? 'Live Sheets' : sourceLabel}
              {syncedAt ? ` · ${new Date(syncedAt).toLocaleTimeString('vi-VN', { hour12: false })}` : ''}
            </p>
          </div>
          <button
            onClick={() => void pull()}
            disabled={state === 'busy'}
            title="Đồng bộ lại từ Google Sheets"
            aria-label="Đồng bộ lại từ Google Sheets"
            className="ml-auto rounded p-1 text-muted-foreground transition-colors hover:bg-background hover:text-foreground active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={state === 'busy' ? 'animate-spin text-primary' : ''} />
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

        {/* Cột 3: Tiến độ Luân chuyển thực tế */}
        <div className="flex items-center flex-wrap gap-1.5 px-4 py-2">
          <span className="rounded-sm border border-border/80 bg-background/80 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-foreground">
            {m.waiting} Chờ xuất
          </span>
          <span className="rounded-sm border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold tabular-nums text-primary">
            {m.atVendor} Đang tại Vendor
          </span>
          <span className="rounded-sm border border-border/60 bg-secondary/80 px-1.5 py-0.5 font-mono text-[10px] font-bold tabular-nums text-muted-foreground">
            {m.stocked} Đã nhập kho
          </span>
        </div>

        {/* Cột 4: Tải theo phân xưởng */}
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

      {auto && (
        <span
          className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[width] duration-1000 ease-linear"
          style={{ width: `${(Math.max(left, 0) / CADENCE) * 100}%` }}
          aria-hidden
        />
      )}
    </div>
  );
}
