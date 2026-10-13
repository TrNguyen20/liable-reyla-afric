import { Link } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useDynamo } from '@/components/dynamo-shell';
import { fetchSheetItems } from '@/lib/dynamo-source';
import { isDueSoon, isOpen, isOverdue } from '@/lib/dynamo-rules';
import { number } from '@/lib/dynamo-data';

const CADENCE = 60;
// Heat-treatment log sheet (DATA_XU_LY_NHIET).
export const LIVE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/edit#gid=1963478526';

export function ShopfloorTelemetry() {
  const { filtered, dataset, sourceLabel, syncedAt, applyDataset } = useDynamo();
  const auto = sourceLabel === 'Google Sheets';
  const [left, setLeft] = useState(CADENCE);
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle');
  const busy = useRef(false);

  const pull = async () => {
    if (busy.current) return;
    busy.current = true; setState('busy');
    try { const r = await fetchSheetItems(LIVE_SHEET_URL); applyDataset(r.items, 'Google Sheets'); setState('idle'); }
    catch { setState('error'); }
    finally { busy.current = false; setLeft(CADENCE); }
  };

  useEffect(() => {
    if (!auto) return;
    const id = setInterval(() => setLeft(s => s - 1), 1000);
    return () => clearInterval(id);
  }, [auto]);
  useEffect(() => { if (auto && left <= 0) void pull(); }, [left, auto]);

  const m = useMemo(() => {
    const open = filtered.filter(isOpen);
    const kg = open.filter(r => r.don_vi_tinh === 'Kg').reduce((a, r) => a + r.kg_Lot, 0);
    const pcs = open.filter(r => r.don_vi_tinh === 'pcs').reduce((a, r) => a + r.so_luong, 0);
    const ws = (['PIN', 'INSERT', 'MOLD'] as const).map(w => ({ w, n: open.filter(r => r.phong_sx === w).length }));
    return { open: open.length, kg, pcs, over: filtered.filter(r => isOverdue(r)).length, soon: filtered.filter(r => isDueSoon(r)).length, ws };
  }, [filtered]);
  const totalWs = m.ws.reduce((a, x) => a + x.n, 0) || 1;
  const led = state === 'error' ? 'bg-destructive' : state === 'busy' ? 'bg-warning animate-pulse' : auto ? 'bg-run' : 'bg-muted-foreground';
  const syncText = state === 'busy' ? 'Đang đồng bộ…' : state === 'error' ? 'Lỗi đồng bộ, thử lại sau 60s' : auto ? `Đồng bộ sau ${Math.max(left, 0)}s` : 'Đồng bộ tự động tắt';

  return <div className="relative border-b border-border bg-secondary">
    <div className="grid grid-cols-2 divide-x divide-border text-[11px] md:grid-cols-[1.3fr_1fr_1fr_1.2fr]">
      <div className="flex items-center gap-2 px-4 py-2 xl:px-6">
        <span className={`size-2 shrink-0 rounded-full ${led}`} aria-hidden />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{syncText}</p>
          <p className="truncate font-mono text-[10px] text-muted-foreground">{number(dataset.length)} dòng · {auto ? 'Google Sheets' : sourceLabel}{syncedAt ? ` · ${new Date(syncedAt).toLocaleTimeString('vi-VN', { hour12: false })}` : ''}</p>
        </div>
        {auto && <button onClick={() => void pull()} disabled={state === 'busy'} title="Đồng bộ ngay" aria-label="Đồng bộ ngay" className="ml-auto rounded-sm p-1 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"><RefreshCw size={13} className={state === 'busy' ? 'animate-spin' : ''} /></button>}
      </div>
      <div className="px-4 py-2">
        <p className="text-[10px] text-muted-foreground">Hàng đang ở ngoài xưởng</p>
        <p className="font-mono font-semibold tabular-nums text-foreground">{number(m.kg, 1)} kg <span className="text-muted-foreground">/ {number(m.pcs)} pcs</span></p>
      </div>
      <div className="flex items-center gap-1.5 px-4 py-2">
        <Link to="/tracking" search={{ focus: 'overdue' }} className={`rounded-sm border px-2 py-1 font-mono font-semibold ${m.over ? 'border-destructive/40 bg-destructive/10 text-destructive' : 'border-border text-muted-foreground'}`}>{m.over} quá hạn</Link>
        <Link to="/tracking" search={{ focus: 'due_soon' }} className={`rounded-sm border px-2 py-1 font-mono font-semibold ${m.soon ? 'border-warning/40 bg-warning/10 text-warning' : 'border-border text-muted-foreground'}`}>{m.soon} cận hạn</Link>
      </div>
      <div className="px-4 py-2 xl:px-6">
        <p className="mb-1 flex justify-between text-[10px] text-muted-foreground"><span>Lô mở theo xưởng</span><span className="font-mono">{number(m.open)}</span></p>
        <div className="flex h-1.5 gap-px overflow-hidden rounded-sm bg-border">{m.ws.map((x, i) => <span key={x.w} title={`${x.w}: ${x.n}`} style={{ width: `${(x.n / totalWs) * 100}%` }} className={['bg-info', 'bg-primary', 'bg-warning'][i]} />)}</div>
        <p className="mt-1 flex gap-3 font-mono text-[10px] text-muted-foreground">{m.ws.map(x => <span key={x.w}>{x.w} {Math.round((x.n / totalWs) * 100)}%</span>)}</p>
      </div>
    </div>
    {auto && <span className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[width] duration-1000 ease-linear" style={{ width: `${(Math.max(left, 0) / CADENCE) * 100}%` }} aria-hidden />}
  </div>;
}
