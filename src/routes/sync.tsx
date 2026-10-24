import { createFileRoute } from '@tanstack/react-router';
import { fetchScopedSheet } from '@/lib/sheet.functions';
import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  Clock,
  Database,
  DatabaseZap,
  Globe,
  Layers,
  Link2,
  Loader2,
  RotateCcw,
  Send,
  ShieldCheck,
  TableProperties,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDynamo } from '@/components/dynamo-shell';
import { number, type QTItem } from '@/lib/dynamo-data';
import { SHEET_URL, type MapResult } from '@/lib/dynamo-source';
import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';
import {
  fetchCentralWebhookConfig,
  saveCentralWebhookConfig,
  testWebhookConnection,
} from '@/lib/auth.functions';

export const Route = createFileRoute('/sync')({
  head: () => ({
    meta: [
      { title: 'Liên kết Dữ liệu Hai Chiều | DYNAMO VIETNAM QT - MES' },
      {
        name: 'description',
        content:
          'Trung tâm tích hợp dữ liệu hai chiều: Nạp dữ liệu sản xuất từ Google Sheets và đồng bộ tiến độ qua Google Apps Script Webhook.',
      },
      { property: 'og:title', content: 'Liên kết Dữ liệu Hai Chiều | DYNAMO VIETNAM QT - MES' },
      {
        property: 'og:description',
        content: 'Đồng bộ hai chiều dữ liệu gia công nhiệt luyện với Google Sheets & Apps Script.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Sync,
});

function Sync() {
  const { applyDataset, resetDataset, sourceLabel, dataset, syncedAt } = useDynamo();

  // Inbound Sheets State
  const [sheetUrl, setSheetUrl] = useState(SHEET_URL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [stagedRows, setStagedRows] = useState<QTItem[]>([]);
  const [stats, setStats] = useState<MapResult | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [applied, setApplied] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  // Outbound Webhook State (Google Apps Script)
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isWebhookSaved, setIsWebhookSaved] = useState(false);

  // Load existing Webhook URL from localStorage and Central Server
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('dynamo-webhook') ?? '';
      if (stored) {
        setWebhookUrl(stored);
        setIsWebhookSaved(true);
      }
    }
    // Đồng bộ từ server cấu hình tập trung
    void fetchCentralWebhookConfig().then((res) => {
      if (res?.url) {
        setWebhookUrl(res.url);
        setIsWebhookSaved(true);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('dynamo-webhook', res.url);
        }
      }
    }).catch(() => {
      // Fallback giữ local
    });
  }, []);

  const saveWebhook = async () => {
    const v = webhookUrl.trim();
    if (v && !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(v)) {
      toast.error('Định dạng URL không đúng! Link Webhook phải có dạng https://script.google.com/macros/s/.../exec');
      return;
    }
    try {
      // Lưu tập trung lên Server để mọi user khác đều được thừa hưởng
      await saveCentralWebhookConfig({ data: { url: v } });
      if (typeof window !== 'undefined') {
        if (v) {
          window.localStorage.setItem('dynamo-webhook', v);
          setIsWebhookSaved(true);
        } else {
          window.localStorage.removeItem('dynamo-webhook');
          setIsWebhookSaved(false);
        }
      }
      if (v) {
        toast.success('Đã lưu cấu hình Webhook tập trung vào hệ thống thành công.');
        playAudioCue('success');
      } else {
        toast.info('Đã xóa cấu hình Webhook ghi ngược trên toàn hệ thống.');
      }
    } catch (err: any) {
      toast.error(`Lỗi lưu Webhook lên máy chủ: ${err.message || 'Không có quyền'}`);
    }
  };

  // Ping Test Webhook State & Function
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
    latency?: number;
  } | null>(null);

  const handleTestWebhook = async () => {
    const v = webhookUrl.trim();
    if (!v) {
      toast.error('Vui lòng nhập đường dẫn Webhook trước khi kiểm tra.');
      return;
    }
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const res = await testWebhookConnection({ data: { url: v } });
      if (res.ok) {
        setTestResult({
          ok: true,
          message: res.message || 'Kết nối Webhook thành công!',
          latency: res.latency,
        });
        toast.success(`Webhook phản hồi tốt (${res.latency ?? 0}ms)!`);
        playAudioCue('success');
      } else {
        setTestResult({
          ok: false,
          message: res.error || 'Lỗi không xác định khi kết nối Apps Script',
          latency: res.latency,
        });
        toast.error(`Kiểm tra Webhook thất bại: ${res.error}`);
        playAudioCue('error');
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Không thể gửi yêu cầu kiểm tra',
      });
      toast.error(`Lỗi: ${err.message}`);
      playAudioCue('error');
    } finally {
      setTestingWebhook(false);
    }
  };

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

  // Auto-refresh countdown timer
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

  const activeData = stagedRows.length ? stagedRows : dataset;
  const totalKg = activeData.reduce((a, i) => a + i.kg_Lot, 0);
  const uniqueOrders = new Set(activeData.map((i) => i.So_DatHang)).size;
  const cacheSizeMb = (JSON.stringify(dataset).length / (1024 * 1024)).toFixed(1);

  return (
    <div className="flex-1 min-h-0 flex flex-col justify-start">
      {/* 2-Column Balanced Hub: Left Gateway (Inbound & Outbound) / Right Staging & Commit */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* COLUMN 1: KẾT NỐI HAI CHIỀU (INBOUND SHEETS + OUTBOUND APPS SCRIPT) */}
        <section className="mes-card p-4 sm:p-5 rounded-lg flex flex-col justify-between border border-border/80 shadow-2xs space-y-4">
          <div className="space-y-4">
            {/* Header Column 1 */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <ArrowLeftRight size={18} />
                </span>
                <div>
                  <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
                    Cổng Kết Nối Hai Chiều
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    Đồng bộ bảng tính Google Sheets và phản hồi qua Google Apps Script
                  </p>
                </div>
              </div>
              <span className="font-mono text-[9px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                BI-DIRECTIONAL
              </span>
            </div>

            {/* BLOCK 1: INBOUND GOOGLE SHEETS */}
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={15} className="text-primary" />
                  <span className="font-display text-xs font-bold text-foreground">
                    1. Tiếp Nhận Dữ Liệu (Inbound — Google Sheets)
                  </span>
                </div>
                <span className="font-mono text-[9px] font-semibold text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded border border-border/60">
                  CSV LIVE FEED
                </span>
              </div>

              <div>
                <input
                  value={sheetUrl}
                  onChange={(e) => {
                    setSheetUrl(e.target.value);
                    setError('');
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  aria-label="Link Google Sheets"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground outline-none focus:border-primary transition-colors"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Clock size={13} className="text-muted-foreground/70" />
                  <span>Tự động đồng bộ:</span>
                  <select
                    value={autoRefreshInterval}
                    onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                    className="rounded border border-input bg-background px-2 py-0.5 text-xs text-foreground font-semibold outline-none cursor-pointer"
                  >
                    <option value={0}>Tắt (Thủ công)</option>
                    <option value={300}>Mỗi 5 phút</option>
                    <option value={900}>Mỗi 15 phút</option>
                    <option value={1800}>Mỗi 30 phút</option>
                  </select>
                  {autoRefreshInterval > 0 && (
                    <span className="font-mono text-[10px] text-primary font-bold">
                      ({Math.floor(secondsRemaining / 60)}m {secondsRemaining % 60}s)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSheetUrl(SHEET_URL)}
                    className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Khôi phục link bảng tính Google Sheets mặc định"
                  >
                    <RotateCcw size={11} className="mr-1" /> Mặc định
                  </Button>

                  <Button
                    onClick={() => void syncSheet(false)}
                    disabled={busy}
                    size="sm"
                    className="h-8 rounded-md bg-primary px-3.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer shadow-2xs gap-1.5"
                  >
                    {busy ? <Loader2 size={13} className="animate-spin" /> : <DatabaseZap size={13} />}
                    {busy ? 'Đang truy xuất...' : 'Tải & Phân Tích'}
                  </Button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive"
                >
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Lỗi kết nối bảng tính</p>
                    <p className="mt-0.5 leading-relaxed text-[11px]">{error}</p>
                  </div>
                </div>
              )}
            </div>

            {/* BLOCK 2: OUTBOUND GOOGLE APPS SCRIPT WEBHOOK */}
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={15} className="text-primary" />
                  <span className="font-display text-xs font-bold text-foreground">
                    2. Ghi Ngược Tiến Độ (Outbound — Google Apps Script)
                  </span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                    isWebhookSaved
                      ? 'border border-run/30 bg-run/10 text-run'
                      : 'border border-border bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      isWebhookSaved ? 'bg-run animate-pulse' : 'bg-muted-foreground'
                    }`}
                  />
                  {isWebhookSaved ? 'KẾT NỐI SẴN SÀNG' : 'CHƯA CẤU HÌNH'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-bold text-muted-foreground">
                    POST
                  </span>
                  <input
                    value={webhookUrl}
                    onChange={(e) => {
                      setWebhookUrl(e.target.value);
                      setIsWebhookSaved(false);
                      setTestResult(null);
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    aria-label="Link Google Apps Script Webhook"
                    className="h-9 w-full rounded-md border border-input bg-background pl-13 pr-3 font-mono text-xs text-foreground placeholder:font-sans placeholder:text-muted-foreground/60 outline-none focus:border-primary transition-colors"
                  />
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    onClick={handleTestWebhook}
                    disabled={testingWebhook}
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 rounded-md px-2.5 text-xs font-semibold hover:border-primary/50 cursor-pointer shadow-2xs"
                    title="Gửi gói tin ping kiểm tra kết nối tới Google Apps Script"
                  >
                    {testingWebhook ? <Loader2 size={13} className="animate-spin text-primary" /> : <Zap size={13} className="text-warning" />}
                    {testingWebhook ? 'Đang test…' : 'Kiểm tra kết nối'}
                  </Button>

                  <Button
                    onClick={saveWebhook}
                    size="sm"
                    className="h-9 gap-1 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground hover:bg-primary/90 active:scale-[0.98] cursor-pointer shadow-2xs"
                  >
                    {isWebhookSaved ? <CheckCircle2 size={13} /> : <Send size={13} />}
                    {isWebhookSaved ? 'Đã lưu' : 'Lưu'}
                  </Button>
                </div>
              </div>

              {testResult && (
                <div
                  className={`flex items-start gap-2 rounded-md p-2.5 text-xs border ${
                    testResult.ok
                      ? 'border-run/30 bg-run/10 text-run font-medium'
                      : 'border-destructive/30 bg-destructive/10 text-destructive'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold">
                      {testResult.ok ? 'Kết nối Webhook hoạt động hoàn hảo' : 'Kiểm tra kết nối thất bại'}
                      {testResult.latency !== undefined && (
                        <span className="ml-1.5 font-mono text-[10px] font-semibold opacity-85">
                          ({testResult.latency}ms)
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed opacity-95">
                      {testResult.message}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                <span className="flex items-center gap-1">
                  <Link2 size={12} className="text-primary shrink-0" />
                  Đẩy tự động khi cập nhật lô:
                </span>
                <span className="font-mono text-[10px] text-primary space-x-1.5">
                  <code>TrangThai</code>
                  <span className="text-muted-foreground/40">·</span>
                  <code>ngay_nhan_QT</code>
                  <span className="text-muted-foreground/40">·</span>
                  <code>do_cung</code>
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Security Note */}
          <div className="rounded-md border border-border/60 bg-muted/30 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck size={14} className="text-primary shrink-0" />
            <span>Mọi thay đổi trạng thái sẽ gửi payload JSON qua Webhook và ghi nhận vào nhật ký kiểm toán.</span>
          </div>
        </section>

        {/* COLUMN 2: KIỂM SOÁT GIAO DỊCH & BỘ NHỚ ĐỆM (STAGING & COMMIT) */}
        <section className="mes-card p-4 sm:p-5 rounded-lg flex flex-col justify-between border border-border/80 shadow-2xs space-y-4">
          <div className="space-y-4">
            {/* Header Column 2 */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-md bg-info/10 text-info">
                  <TableProperties size={18} />
                </span>
                <div>
                  <h2 className="font-display text-sm font-bold tracking-tight text-foreground">
                    Kiểm Soát Giao Dịch & Bộ Nhớ Đệm
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    {stagedRows.length > 0
                      ? `Sẵn sàng nạp ${number(stagedRows.length)} lô hàng mới từ Google Sheets${
                          stats && stats.duplicates > 0 ? ` (bỏ qua ${stats.duplicates} dòng trùng)` : ''
                        }`
                      : `Đang chạy nguồn dữ liệu hiện hành (${number(dataset.length)} lô)`}
                  </p>
                </div>
              </div>
              {applied && (
                <span className="flex items-center gap-1 rounded-sm border border-run/40 bg-run/10 px-2 py-0.5 font-mono text-[9px] font-bold text-run">
                  <CheckCircle2 size={11} /> ĐÃ ÁP DỤNG
                </span>
              )}
            </div>

            {/* Quick Metrics Grid (4 compact cards) */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <div className="rounded-md border border-border/70 bg-card p-2.5 shadow-2xs">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">SỐ LÔ HỢP LỆ</p>
                <p className="mt-0.5 font-mono text-lg font-black text-foreground">
                  {number(activeData.length)}
                </p>
              </div>

              <div className="rounded-md border border-border/70 bg-card p-2.5 shadow-2xs">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">SỐ ĐƠN HÀNG QT</p>
                <p className="mt-0.5 font-mono text-lg font-black text-foreground">
                  {number(uniqueOrders)}
                </p>
              </div>

              <div className="rounded-md border border-border/70 bg-card p-2.5 shadow-2xs">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">TỔNG KHỐI LƯỢNG</p>
                <p className="mt-0.5 font-mono text-lg font-black text-foreground">
                  {number(totalKg, 1)} <span className="text-[10px] font-normal text-muted-foreground">kg</span>
                </p>
              </div>

              <div className="rounded-md border border-border/70 bg-card p-2.5 shadow-2xs">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">PHÂN XƯỞNG</p>
                <p className="mt-1 font-bold text-xs text-primary truncate">
                  PIN, INSERT, MOLD
                </p>
              </div>
            </div>

            {/* Source Status & Cache Overview Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-secondary/20 px-3 py-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="flex size-2 rounded-full bg-run animate-pulse" />
                <span className="text-muted-foreground font-medium">Nguồn:</span>
                <span className="font-mono font-semibold text-foreground">{sourceLabel}</span>
                <span className="text-muted-foreground/40">·</span>
                <span className="font-mono text-[11px] text-muted-foreground">~{cacheSizeMb} MB Cache</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  resetDataset();
                  toast.success('Đã làm mới bộ nhớ đệm và kéo lại dữ liệu từ Google Sheets!');
                  playAudioCue('success');
                }}
                className="h-6 px-2 text-[10px] font-semibold gap-1 cursor-pointer hover:bg-secondary"
                title="Làm mới bộ nhớ đệm và nạp lại toàn bộ từ Google Sheets"
              >
                <RotateCcw size={10} /> Làm mới Cache
              </Button>
            </div>

            {/* Commit Mode Switcher */}
            <div className="rounded-lg border border-border/70 bg-secondary/20 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground">Chế độ áp dụng vào hệ thống:</span>
                <span className="font-mono text-[9px] font-semibold text-muted-foreground">TRANSACTION MODE</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label
                  className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
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
                    <span className="block text-[10px] text-muted-foreground font-normal mt-0.5 leading-snug">
                      Xóa cache cũ, nạp toàn bộ danh mục mới nhất từ Google Sheets.
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-2 rounded-md border p-2 cursor-pointer transition-colors ${
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
                    <span className="block text-[10px] text-muted-foreground font-normal mt-0.5 leading-snug">
                      Thêm lô mới và cập nhật đè các lô trùng mã ID_Key.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Action Footer & Poka-Yoke Rules */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
              <span className="text-[11px] text-muted-foreground">
                {syncedAt ? `Đồng bộ gần nhất: ${new Date(syncedAt).toLocaleString('vi-VN')}` : 'Chưa có mốc thời gian'}
              </span>

              <Button
                disabled={stagedRows.length === 0}
                onClick={() => {
                  if (
                    mode === 'replace' &&
                    !window.confirm(
                      `Xác nhận thay thế toàn bộ dữ liệu hiện tại bằng ${stagedRows.length} lô mới từ Google Sheets?`
                    )
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
                className="gap-1.5 rounded-md bg-primary px-4 font-bold text-xs text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:opacity-40 cursor-pointer shadow-xs h-9"
              >
                <CheckCircle2 size={14} />
                {applied ? 'Đã kích hoạt vào hệ thống' : 'Áp dụng vào toàn hệ thống'}
              </Button>
            </div>

            <div className="rounded-md border border-border/60 bg-muted/20 p-2 text-[10px] text-muted-foreground leading-relaxed flex items-center gap-1.5">
              <Layers size={13} className="text-primary shrink-0" />
              <span>
                Poka-Yoke: Tự động chuẩn hóa mã lô (<code className="font-mono text-primary font-bold">ID_Key</code>), mác thép, phân xưởng và tính tổng khối lượng tức thì trước khi commit.
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
