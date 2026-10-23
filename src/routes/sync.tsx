import { createFileRoute } from '@tanstack/react-router';
import { fetchScopedSheet } from '@/lib/sheet.functions';
import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DatabaseZap,
  Globe,
  Info,
  Layers,
  Link2,
  Loader2,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TableProperties,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { WebhookConfig } from '@/components/webhook-config';
import { number, type QTItem } from '@/lib/dynamo-data';
import { SHEET_URL, type MapResult } from '@/lib/dynamo-source';
import { formatVendorName } from '@/lib/dynamo-auth';
import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';

export const Route = createFileRoute('/sync')({
  head: () => ({
    meta: [
      { title: 'Liên kết Google Sheets | DYNAMO VIETNAM QT - MES' },
      { name: 'description', content: 'Liên kết trực tiếp và tự động đồng bộ hai chiều với bảng tính Google Sheets điều hành luân chuyển QT.' },
      { property: 'og:title', content: 'Liên kết Google Sheets | DYNAMO VIETNAM QT - MES' },
      { property: 'og:description', content: 'Đồng bộ dữ liệu gia công nhiệt luyện từ Google Sheets.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Sync,
});

const previewCols = [
  'ID_Key',
  'phong_sx',
  'ma_hang',
  'vat_lieu',
  'so_luong',
  'cty_QT',
  'TrangThai',
  'So_DatHang',
];

function Sync() {
  const { applyDataset, resetDataset, sourceLabel, dataset, isLive, role, syncedAt } = useDynamo();
  const [sheetUrl, setSheetUrl] = useState(SHEET_URL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stagedRows, setStagedRows] = useState<QTItem[]>([]);
  const [stats, setStats] = useState<MapResult | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [applied, setApplied] = useState(false);

  // Proposal 6: Live Health Telemetry & Auto-Refresh states
  const [latencyMs, setLatencyMs] = useState<number | null>(128);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = off, 300 = 5m, 900 = 15m, 1800 = 30m
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [outboxCount, setOutboxCount] = useState<number>(0);

  // Read outbox count from localStorage audit log
  useEffect(() => {
    try {
      const logs = JSON.parse(localStorage.getItem('dynamo-audit') || '[]');
      const pending = logs.filter((l: any) => l.result === 'sync_failed' || l.result === 'pending').length;
      setOutboxCount(pending);
    } catch {
      setOutboxCount(0);
    }
  }, []);

  const syncSheet = async (isAuto = false) => {
    if (!sheetUrl.trim()) {
      setError('Vui lòng nhập đường dẫn Google Sheets hợp lệ.');
      return;
    }
    setBusy(true);
    setError('');
    const t0 = performance.now();
    try {
      const res = await fetchScopedSheet({ data: { url: sheetUrl.trim() } });
      const elapsed = Math.round(performance.now() - t0);
      setLatencyMs(elapsed);
      setStats(res);
      setStagedRows(res.items);
      setApplied(false);

      if (isAuto) {
        applyDataset(res.items, 'Google Sheets (Tự động)');
        setApplied(true);
        toast.info(`Tự động đồng bộ thành công: ${res.items.length} lô (${elapsed}ms)`);
      } else {
        toast.success(`Tải thành công ${res.items.length} lô từ Google Sheets (${elapsed}ms)`);
        playAudioCue('success');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không kết nối được Google Sheets.');
      playAudioCue('error');
    } finally {
      setBusy(false);
    }
  };

  // Proposal 6: Auto-refresh Countdown Timer
  useEffect(() => {
    if (!autoRefreshInterval) {
      setSecondsRemaining(0);
      return;
    }
    setSecondsRemaining(autoRefreshInterval);
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          void syncSheet(true);
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, sheetUrl]);

  const totalKg = (stagedRows.length ? stagedRows : dataset).reduce((a, i) => a + i.kg_Lot, 0);
  const uniqueOrders = new Set((stagedRows.length ? stagedRows : dataset).map((i) => i.So_DatHang)).size;

  const cacheSizeMb = (JSON.stringify(dataset).length / (1024 * 1024)).toFixed(1);

  return (
    <>
      <PageHeading
        eyebrow="HỆ THỐNG / QUẢN TRỊ DỮ LIỆU"
        title="LIÊN KẾT GOOGLE SHEETS"
        description="Kết nối trực tiếp đến bảng tính Google Sheets điều độ luân chuyển QT của nhà máy Dynamo Vietnam, hỗ trợ kiểm tra đường truyền và đồng bộ ngầm định kỳ."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2.5 rounded-sm border border-border bg-card/90 px-3.5 py-2 text-xs shadow-xs">
              <span className="flex size-2 rounded-full bg-run animate-pulse" />
              <span className="text-muted-foreground">Nguồn hoạt động:</span>
              <b className="font-mono text-foreground">{sourceLabel}</b>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-mono font-bold tabular-nums text-primary">
                {dataset.length.toLocaleString('vi-VN')}
              </span>
              <span className="text-[11px] text-muted-foreground">lô</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="font-mono text-[11px] text-muted-foreground">
                ~{cacheSizeMb} MB Cache
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetDataset();
                toast.success('Đã xóa bộ nhớ đệm và kéo lại dữ liệu từ Google Sheets!');
              }}
              className="gap-1.5 text-xs font-semibold cursor-pointer"
              title="Làm mới bộ nhớ đệm và kéo lại toàn bộ từ Google Sheets"
            >
              <RotateCcw size={13} /> Làm mới Cache
            </Button>
          </div>
        }
      />

      {/* Webhook Configuration for Two-Way AppScript Writeback */}
      <WebhookConfig />

      {/* Proposal 6: Live Health Telemetry Bar */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Metric 1: Connection Status */}
        <div className="mes-card p-3.5 rounded-lg flex items-center gap-3 shadow-2xs border border-border/80">
          <div className="relative flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Radio size={18} className="animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">KẾT NỐI SHEETS</p>
            <p className="font-bold text-xs text-foreground flex items-center gap-1.5 mt-0.5">
              <span>Sẵn sàng (Live Feed)</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Ping Latency (TASK-007) */}
        <div className="mes-card p-3.5 rounded-lg flex items-center gap-3 shadow-2xs border border-border/80">
          <div
            className={`relative flex size-9 shrink-0 items-center justify-center rounded-md transition-colors ${
              latencyMs === null
                ? 'bg-muted text-muted-foreground'
                : latencyMs < 300
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : latencyMs < 800
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}
          >
            <Activity
              size={18}
              className={latencyMs !== null && latencyMs < 300 ? 'animate-pulse' : ''}
            />
            {latencyMs !== null && latencyMs < 300 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">ĐỘ TRỄ PHẢN HỒI</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="font-mono font-bold text-xs text-foreground">
                {latencyMs !== null ? `${latencyMs} ms` : '—'}
              </span>
              {latencyMs !== null && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-sans ${
                    latencyMs < 300
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : latencyMs < 800
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : 'bg-destructive/10 text-destructive'
                  }`}
                >
                  {latencyMs < 300 ? 'Tối ưu' : latencyMs < 800 ? 'Ổn định' : 'Chậm'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 3: Auto-Sync Timer */}
        <div className="mes-card p-3.5 rounded-lg flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-warning/10 text-warning">
            <Clock size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">ĐỒNG BỘ ĐỊNH KỲ</p>
            <p className="font-mono text-xs font-bold text-foreground mt-0.5">
              {autoRefreshInterval > 0 ? (
                <span className="text-primary font-bold">
                  Còn {Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s
                </span>
              ) : (
                <span className="text-muted-foreground">Đang tắt</span>
              )}
            </p>
          </div>
        </div>

        {/* Metric 4: Offline Outbox Queue */}
        <div className="mes-card p-3.5 rounded-lg flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Layers size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">HÀNG ĐỢI GHI LẠI</p>
            <p className="font-mono text-xs font-bold text-foreground mt-0.5">
              {outboxCount > 0 ? (
                <span className="text-warning font-bold">{outboxCount} mục chờ ghi</span>
              ) : (
                <span className="text-primary font-bold">Đã đồng bộ 100%</span>
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left Column: Google Sheets URL Connection & Settings */}
        <div className="space-y-6">
          <section className="mes-card p-6 rounded-lg">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <Link2 size={20} />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Cấu Hình Liên Kết Google Sheets
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Đường dẫn bảng tính Google Sheets chế độ xuất bản công khai (hoặc xem công khai)
                  </p>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                CSV LIVE FEED
              </span>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  value={sheetUrl}
                  onChange={(e) => {
                    setSheetUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  aria-label="Link Google Sheets"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Proposal 6: Auto-refresh selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
                <div className="flex items-center gap-2 text-xs">
                  <Clock size={14} className="text-muted-foreground" />
                  <span className="font-medium text-muted-foreground">Tự động đồng bộ ngầm:</span>
                  <select
                    value={autoRefreshInterval}
                    onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                    className="rounded border border-input bg-background px-2.5 py-1 text-xs text-foreground font-semibold outline-none"
                  >
                    <option value={0}>Tắt (Thủ công)</option>
                    <option value={300}>Mỗi 5 phút</option>
                    <option value={900}>Mỗi 15 phút</option>
                    <option value={1800}>Mỗi 30 phút</option>
                  </select>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetUrl(SHEET_URL)}
                  className="h-8 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <RotateCcw size={12} /> Khôi phục link chuẩn
                </Button>
              </div>

              <div className="flex items-center justify-end pt-2">
                <Button
                  onClick={() => void syncSheet(false)}
                  disabled={busy}
                  className="h-9 rounded-md bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs gap-1.5"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <DatabaseZap size={14} />}
                  {busy ? 'Đang truy xuất dữ liệu...' : 'Tải & Phân Tích Dữ Liệu'}
                </Button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Lỗi kết nối bảng tính</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-md border border-border/80 bg-secondary/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-1">Quy tắc nạp an toàn (Poka-Yoke):</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Hệ thống tự động nhận dạng mã lô (<b className="font-mono">ID_Key</b>), mã hàng, phân xưởng, vật liệu và số lượng.</li>
                <li>Dữ liệu được lưu trữ đệm trong trình duyệt; thao tác xem không làm thay đổi bảng tính gốc Google Sheets.</li>
                <li>Mọi thay đổi trạng thái sẽ được ghi nhận vào nhật ký Audit Trail và chuyển tiếp qua Webhook (nếu được cấu hình).</li>
              </ul>
            </div>
          </section>
        </div>

        {/* Right Column: Inspection, Staging & Commit */}
        <section className="mes-card flex flex-col justify-between p-6 rounded-lg">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-sm bg-info/10 text-info">
                  <TableProperties size={20} />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Kiểm Tra & Phân Tích Schema
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {stagedRows.length > 0
                      ? `Sẵn sàng nạp ${number(stagedRows.length)} lô hàng hợp lệ`
                      : `Đang chạy nguồn dữ liệu hiện hành (${number(dataset.length)} lô)`}
                  </p>
                </div>
              </div>
              {applied && (
                <span className="flex items-center gap-1 rounded-sm border border-run/40 bg-run/10 px-2.5 py-1 font-mono text-[10px] font-bold text-run">
                  <CheckCircle2 size={12} /> ĐÃ ÁP DỤNG
                </span>
              )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-border bg-card p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SỐ LÔ HỢP LỆ</p>
                <p className="mt-1 font-mono text-xl font-black text-foreground">
                  {number(stagedRows.length || dataset.length)}
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">SỐ ĐƠN HÀNG QT</p>
                <p className="mt-1 font-mono text-xl font-black text-foreground">
                  {number(uniqueOrders)}
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">TỔNG TRỌNG LƯỢNG</p>
                <p className="mt-1 font-mono text-xl font-black text-foreground">
                  {number(totalKg, 1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
                </p>
              </div>

              <div className="rounded-md border border-border bg-card p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PHÂN XƯỞNG</p>
                <p className="mt-1 font-bold text-xs text-primary truncate">
                  PIN, INSERT, MOLD
                </p>
              </div>
            </div>

            {/* Commit Mode Switcher */}
            <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-xs text-foreground">Chế độ áp dụng vào hệ thống:</span>
                <span className="font-mono text-[10px] text-muted-foreground">TRANSACTION MODE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label
                  className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors ${
                    mode === 'replace'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'replace'}
                    onChange={() => setMode('replace')}
                    className="mt-0.5 text-primary focus:ring-primary accent-primary"
                  />
                  <div>
                    <span className="block text-xs font-bold text-foreground">Thay thế toàn bộ (Replace)</span>
                    <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                      Làm sạch cache cũ, nạp toàn bộ danh mục mới nhất từ Google Sheets.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2 rounded-md border p-2.5 cursor-pointer transition-colors ${
                    mode === 'merge'
                      ? 'border-primary bg-primary/10 text-primary font-bold'
                      : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={mode === 'merge'}
                    onChange={() => setMode('merge')}
                    className="mt-0.5 text-primary focus:ring-primary accent-primary"
                  />
                  <div>
                    <span className="block text-xs font-bold text-foreground">Cập nhật gộp lô (Upsert)</span>
                    <span className="block text-[10px] text-muted-foreground font-normal mt-0.5">
                      Thêm lô mới và cập nhật đè các lô trùng mã ID_Key.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="mt-6 border-t border-border pt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {syncedAt ? `Đồng bộ gần nhất: ${new Date(syncedAt).toLocaleString('vi-VN')}` : 'Chưa có mốc thời gian'}
            </span>

            <Button
              disabled={stagedRows.length === 0}
              onClick={() => {
                if (
                  mode === 'replace' &&
                  !window.confirm(`Xác nhận thay thế toàn bộ dữ liệu hiện tại bằng ${stagedRows.length} lô mới từ Google Sheets?`)
                ) {
                  return;
                }
                if (mode === 'merge') {
                  const map = new Map(dataset.map((i) => [i.ID_Key, i]));
                  for (const r of stagedRows) map.set(r.ID_Key, r);
                  applyDataset([...map.values()], 'Google Sheets');
                } else {
                  applyDataset(stagedRows, 'Google Sheets');
                }
                setApplied(true);
                toast.success('Đã áp dụng thành công dữ liệu mới vào toàn bộ hệ thống!');
                playAudioCue('success');
              }}
              className="gap-1.5 rounded-md bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer shadow-xs"
            >
              <CheckCircle2 size={15} />
              {applied ? 'Đã kích hoạt vào hệ thống' : 'Áp dụng vào toàn hệ thống'}
            </Button>
          </div>
        </section>
      </div>

      {/* Staged Data Preview Table (10 sample rows) */}
      <section className="mes-card mt-6 overflow-hidden rounded-lg">
        <div className="flex flex-col justify-between gap-2 border-b border-border bg-secondary/40 px-5 py-3.5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 items-center justify-center rounded bg-primary/10 text-primary">
              <Layers size={14} />
            </span>
            <div>
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                Xem Trước Dữ Liệu Kiểm Tra (10 Dòng Đầu)
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Dữ liệu trích xuất từ bảng tính Google Sheets điều độ luân chuyển
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-muted-foreground">
            PREVIEW MODE · VENDOR ANONYMIZATION ACTIVE
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs border-collapse">
            <thead className="border-b border-border bg-secondary/50 text-muted-foreground font-bold text-[10px] uppercase tracking-wider">
              <tr>
                <th className="px-3.5 py-2.5 font-mono text-foreground/80">MÃ LÔ (ID_KEY)</th>
                <th className="px-3 py-2.5">XƯỞNG</th>
                <th className="px-3.5 py-2.5">MÃ HÀNG</th>
                <th className="px-3 py-2.5">MÁC THÉP</th>
                <th className="px-3 py-2.5 text-right font-mono">SỐ LƯỢNG</th>
                <th className="px-3.5 py-2.5">ĐƠN VỊ QT</th>
                <th className="px-3 py-2.5">TRẠNG THÁI</th>
                <th className="px-3.5 py-2.5 font-mono">ĐƠN HÀNG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {(stagedRows.length ? stagedRows : dataset).slice(0, 10).map((r) => (
                <tr key={r.ID_Key} className="h-9 transition-colors hover:bg-secondary/40">
                  <td className="px-3.5 py-1.5 font-mono font-bold text-primary text-xs">
                    {r.ID_Key}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted/80 text-[10px] font-bold text-foreground border border-border/60">
                      {r.phong_sx}
                    </span>
                  </td>
                  <td className="px-3.5 py-1.5 font-mono font-bold text-foreground text-xs">
                    {r.ma_hang}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs text-foreground/85">
                    {r.vat_lieu || '—'}
                  </td>
                  <td className="px-3 py-1.5 font-mono font-bold tabular-nums text-foreground text-xs text-right">
                    {number(r.so_luong)}
                  </td>
                  <td className="px-3.5 py-1.5 font-medium text-foreground text-xs">
                    {formatVendorName(r.cty_QT, role)}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center rounded-md border border-border/80 bg-background/80 px-2 py-0.5 font-mono text-[10px] text-foreground font-semibold shadow-2xs">
                      {r.TrangThai}
                    </span>
                  </td>
                  <td className="px-3.5 py-1.5 font-mono text-xs text-muted-foreground">
                    {r.So_DatHang}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
