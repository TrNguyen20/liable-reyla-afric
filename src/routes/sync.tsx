import { createFileRoute } from '@tanstack/react-router';
import { fetchScopedSheet } from '@/lib/sheet.functions';
import { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  DatabaseZap,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Info,
  Layers,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
  TableProperties,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { WebhookConfig } from '@/components/webhook-config';
import { items as sampleItems, money, number, type QTItem } from '@/lib/dynamo-data';
import { SHEET_URL, mapRows, parseCsvRows, type MapResult } from '@/lib/dynamo-source';
import { formatVendorName } from '@/lib/dynamo-auth';

export const Route = createFileRoute('/sync')({
  head: () => ({
    meta: [
      { title: 'Nạp CSV & Đồng bộ | DYNAMO VIETNAM QT - MES' },
      { name: 'description', content: 'Nạp tệp CSV hoặc đồng bộ trực tiếp từ Google Sheets công khai vào hệ thống luân chuyển QT.' },
      { property: 'og:title', content: 'Nạp CSV & Đồng bộ | DYNAMO VIETNAM QT - MES' },
      { property: 'og:description', content: 'Đồng bộ dữ liệu gia công QT từ CSV hoặc Google Sheets.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Sync,
});

const columns = [
  'ID_Key',
  'phong_sx',
  'doi_tuong_hang',
  'ma_hang',
  'so_luong',
  'vat_lieu',
  'do_cung',
  'Kich_Thuoc_SP',
  'kg_Lot',
  'don_vi_tinh',
  'don_gia',
  'thanh_tien',
  'ngay_gui_QT',
  'cty_QT',
  'TrangThai',
  'So_DatHang',
];

const preview = [
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
  const { applyDataset, resetDataset, sourceLabel, dataset, isLive, role } = useDynamo();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheetUrl, setSheetUrl] = useState(SHEET_URL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [label, setLabel] = useState('');
  const [rows, setRows] = useState<QTItem[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [stats, setStats] = useState<MapResult | null>(null);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [applied, setApplied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const stage = (result: MapResult, name: string) => {
    setStats(result);
    setRows(result.items);
    setSkipped(result.skipped);
    setLabel(name);
    setApplied(false);
    setError('');
  };

  const syncSheet = async () => {
    setBusy(true);
    setError('');
    setRows([]);
    setApplied(false);
    try {
      stage(await fetchScopedSheet({ data: { url: sheetUrl.trim() } }), 'Google Sheets');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không tải được Google Sheets.');
    } finally {
      setBusy(false);
    }
  };

  const loadFile = async (file?: File) => {
    if (!file) return;
    setError('');
    setApplied(false);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setRows([]);
      setError('Chỉ hỗ trợ tệp định dạng .CSV');
      return;
    }
    try {
      const parsed = parseCsvRows(await file.text());
      const missing = columns.filter((c) => !parsed.headers.includes(c));
      if (missing.length) {
        setRows([]);
        setError(`Tệp CSV thiếu các cột bắt buộc: ${missing.join(', ')}`);
        return;
      }
      const mapped = mapRows(parsed.rows);
      if (!mapped.items.length) {
        setRows([]);
        setError('Không có dòng dữ liệu hợp lệ trong tệp CSV đã tải lên.');
        return;
      }
      stage(mapped, file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lỗi khi phân tích tệp CSV.');
    }
  };

  const downloadSample = () => {
    const content = [
      columns.join(','),
      ...sampleItems.map((i) =>
        columns
          .map((k) => `"${String(i[k as keyof QTItem] ?? '').replaceAll('"', '""')}"`)
          .join(',')
      ),
    ].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' }));
    a.download = 'dynamo-qt-mau.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalCost = rows.reduce((a, i) => a + i.thanh_tien, 0);
  const byWorkshop = (['PIN', 'INSERT', 'MOLD'] as const).map((w) => ({
    w,
    n: rows.filter((i) => i.phong_sx === w).length,
  }));

  const steps = [
    { num: '01', title: 'Nạp nguồn', desc: 'Google Sheets / CSV', done: !!label || !!error },
    { num: '02', title: 'Kiểm tra chuẩn hóa', desc: 'Schema & Validation', done: !!stats },
    { num: '03', title: 'Xem trước & Chọn chế độ', desc: 'Upsert hoặc Thay thế', done: rows.length > 0 },
    { num: '04', title: 'Áp dụng', desc: 'Kích hoạt dữ liệu MES', done: applied },
  ];

  return (
    <>
      <PageHeading
        eyebrow="HỆ THỐNG / QUẢN TRỊ DỮ LIỆU"
        title="Đồng bộ Dữ liệu Lô QT"
        description="Nạp dữ liệu thực tế từ Google Sheets công khai hoặc tệp CSV kỹ thuật, kiểm tra tính toàn vẹn và cập nhật đồng bộ cho toàn bộ phân xưởng."
        action={
          <div className="flex items-center gap-2.5 rounded-sm border border-border bg-card/90 px-3.5 py-2 text-xs shadow-xs">
            <span className="flex size-2 rounded-full bg-run animate-pulse" />
            <span className="text-muted-foreground">Nguồn hoạt động:</span>
            <b className="font-mono text-foreground">{sourceLabel}</b>
            <span className="text-muted-foreground/60">·</span>
            <span className="font-mono font-bold tabular-nums text-primary">
              {dataset.length.toLocaleString('vi-VN')}
            </span>
            <span className="text-[11px] text-muted-foreground">lô</span>
          </div>
        }
      />

      <WebhookConfig />

      {/* Industrial Stepper Bar */}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((st, i) => (
          <div
            key={st.num}
            className={`relative flex items-center gap-3 rounded-sm border p-3 transition-colors ${
              st.done
                ? 'border-primary/40 bg-primary/5 text-foreground'
                : 'border-border bg-card/60 text-muted-foreground'
            }`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-sm font-mono text-xs font-bold ${
                st.done ? 'bg-primary text-primary-foreground' : 'border border-border bg-muted/50 text-muted-foreground'
              }`}
            >
              {st.done ? <CheckCircle2 size={14} /> : st.num}
            </span>
            <div className="min-w-0">
              <p className="font-display text-xs font-bold leading-none">{st.title}</p>
              <p className="mt-1 truncate text-[10px] text-muted-foreground">{st.desc}</p>
            </div>
            {i < steps.length - 1 && (
              <span className="pointer-events-none absolute -right-2 top-1/2 hidden -translate-y-1/2 sm:block">
                <ArrowRight size={12} className="text-border" />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Left Column: Data Ingestion Channels */}
        <div className="space-y-6">
          <section className="mes-card p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <Link2 size={20} />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">Kênh 1: Google Sheets Trực Tuyến</h2>
                  <p className="text-xs text-muted-foreground">Liên kết bảng tính Google Sheets chế độ công khai (CSV export)</p>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold text-muted-foreground">LIVE CSV FEED</span>
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
                  className="h-10 w-full rounded-sm border border-input bg-background/50 px-3 font-mono text-xs text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-primary"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSheetUrl(SHEET_URL)}
                  className="h-8 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw size={12} /> Khôi phục link mặc định
                </Button>

                <Button
                  onClick={syncSheet}
                  disabled={busy}
                  className="h-9 rounded-sm bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <DatabaseZap size={14} />}
                  {busy ? 'Đang truy xuất...' : 'Tải & Phân tích Schema'}
                </Button>
              </div>
            </div>

            <p className="mt-4 border-t border-border/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
              Hệ thống tự động lọc các dòng hợp lệ, chuẩn hóa trạng thái gia công, định dạng ngày gửi/nhận và tự động tính trọng số chi phí.
            </p>
          </section>

          <section className="mes-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-sm bg-setup/10 text-setup">
                  <UploadCloud size={20} />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">Kênh 2: Nạp Tệp CSV Ngoại Tuyến</h2>
                  <p className="text-xs text-muted-foreground">Nhập dữ liệu xuất xưởng nội bộ từ tệp .CSV chuẩn hóa</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={downloadSample} className="h-8 gap-1.5 text-xs">
                <Download size={13} /> Tải CSV mẫu
              </Button>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => void loadFile(e.target.files?.[0])}
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                void loadFile(e.dataTransfer.files[0]);
              }}
              className={`flex min-h-[140px] flex-col items-center justify-center rounded-sm border-2 border-dashed p-6 text-center transition-colors ${
                isDragOver
                  ? 'border-primary bg-primary/10'
                  : 'border-border/80 bg-muted/20 hover:border-primary/50 hover:bg-muted/30'
              }`}
            >
              <FileSpreadsheet size={30} className="mb-2 text-primary" />
              <p className="text-xs font-bold text-foreground">
                {label || 'Kéo thả tệp CSV vào đây, hoặc nhấn nút bên dưới'}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">Định dạng CSV UTF-8 với 16 cột kỹ thuật bắt buộc</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5 rounded-sm text-xs font-bold"
                onClick={() => fileRef.current?.click()}
              >
                <UploadCloud size={14} /> Chọn tệp từ máy tính
              </Button>
            </div>

            <div className="mt-4">
              <p className="mb-2 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                DANH MỤC CỘT BẮT BUỘC (16 TRƯỜNG):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((c) => (
                  <span
                    key={c}
                    className="rounded-sm border border-border/80 bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Inspection, Staging & Commit */}
        <section className="mes-card flex flex-col justify-between p-6">
          <div>
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-sm bg-info/10 text-info">
                  <FileCheck2 size={20} />
                </span>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Kết Quả Kiểm Tra Schema & Dữ Liệu
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {rows.length > 0
                      ? `Đang sẵn sàng nạp: ${label} (${rows.length} lô hợp lệ)`
                      : 'Chưa có dữ liệu kiểm tra. Hãy tải từ Google Sheets hoặc chọn CSV.'}
                  </p>
                </div>
              </div>
              {applied && (
                <span className="flex items-center gap-1 rounded-sm border border-run/40 bg-run/10 px-2.5 py-1 font-mono text-[10px] font-bold text-run">
                  <CheckCircle2 size={12} /> ĐÃ ÁP DỤNG
                </span>
              )}
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-sm border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Lỗi nạp dữ liệu</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {rows.length > 0 ? (
              <>
                {/* KPI Metrics */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-sm border border-border/70 bg-card p-3 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      DÒNG HỢP LỆ
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                      {number(rows.length)}
                      {stats && stats.total > rows.length && (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {' '}
                          / {number(stats.total)}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="rounded-sm border border-border/70 bg-card p-3 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      BỎ QUA / THIẾU
                    </p>
                    <p
                      className={`mt-1 font-mono text-xl font-bold tabular-nums ${
                        skipped > 0 ? 'text-amber-500' : 'text-foreground'
                      }`}
                    >
                      {number(skipped)}
                    </p>
                  </div>

                  <div className="rounded-sm border border-border/70 bg-card p-3 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      SỐ ĐƠN QT
                    </p>
                    <p className="mt-1 font-mono text-xl font-bold tabular-nums text-foreground">
                      {number(new Set(rows.map((i) => i.So_DatHang)).size)}
                    </p>
                  </div>

                  <div className="rounded-sm border border-border/70 bg-card p-3 shadow-2xs">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      TỔNG CHI PHÍ
                    </p>
                    <p className="mt-1 font-mono text-base font-bold tabular-nums text-foreground">
                      {money(totalCost)}
                    </p>
                  </div>
                </div>

                {/* Workshop breakdown chips */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-muted-foreground">PHÂN XƯỞNG:</span>
                  {byWorkshop.map((x) => (
                    <span
                      key={x.w}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-muted/40 px-2 py-0.5 font-mono text-[11px]"
                    >
                      <span className="text-muted-foreground">{x.w}:</span>
                      <b className="tabular-nums text-foreground">{number(x.n)}</b>
                    </span>
                  ))}
                </div>

                {/* Diagnostic Audit Checklist */}
                {stats && (() => {
                  const ids = new Set(dataset.map((i) => i.ID_Key));
                  const upd = rows.filter((r) => ids.has(r.ID_Key)).length;
                  const warnings = [
                    stats.skipped > 0 && `${number(stats.skipped)} dòng bị bỏ qua do thiếu ID_Key, ma_hang hoặc So_DatHang.`,
                    stats.duplicates.length > 0 &&
                      `${number(stats.duplicates.length)} dòng trùng mã ID_Key (giữ lại dòng xuất hiện đầu tiên): ${stats.duplicates.slice(0, 4).join(', ')}${stats.duplicates.length > 4 ? '…' : ''}.`,
                    stats.unknownStatus.length > 0 &&
                      `${number(stats.unknownStatus.length)} dòng có trạng thái chưa chuẩn hóa, tạm phân loại vào "Chờ xuất xưởng".`,
                    stats.badDates > 0 &&
                      `${number(stats.badDates)} dòng có ngày sai định dạng (khuyến nghị chuẩn MM/DD/YYYY hoặc YYYY-MM-DD).`,
                    stats.estimatedDue > 0 &&
                      `${number(stats.estimatedDue)} dòng thiếu han_tra — tạm tính tự động (ngày gửi + 7 ngày) và gắn nhãn ước tính.`,
                  ].filter(Boolean) as string[];

                  return (
                    <div className="mt-4 rounded-sm border border-border/80 bg-background/50 p-3.5 text-xs">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground">
                        <Sparkles size={13} className="text-primary" />
                        <span>CHẾ ĐỘ ÁP DỤNG & CẢNH BÁO KIỂM TRA</span>
                      </div>

                      <p className="mt-1.5 font-mono text-[11px] text-foreground">
                        {mode === 'replace'
                          ? `→ Sẽ thay thế toàn bộ ${number(dataset.length)} lô hiện hành bằng ${number(rows.length)} lô mới.`
                          : `→ Sẽ thêm mới ${number(rows.length - upd)} lô và cập nhật đè ${number(upd)} lô đã tồn tại.`}
                      </p>

                      {warnings.length > 0 && (
                        <div className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5">
                          {warnings.map((w, idx) => (
                            <p key={idx} className="flex items-start gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                              <span>{w}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Commit Mode Switcher & Execution Bar */}
                <div className="mt-6 border-t border-border/70 pt-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="inline-flex rounded-sm border border-border bg-muted/30 p-0.5 text-xs">
                      {(['replace', 'merge'] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => {
                            setMode(m);
                            setApplied(false);
                          }}
                          className={`rounded-xs px-3 py-1.5 font-medium transition-colors ${
                            mode === m
                              ? 'bg-primary font-bold text-primary-foreground shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {m === 'replace' ? 'Thay thế toàn bộ (Replace)' : 'Cập nhật gộp lô (Upsert)'}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => {
                          if (
                            mode === 'replace' &&
                            !window.confirm(
                              `Xác nhận thay thế toàn bộ ${dataset.length} lô hiện tại bằng ${rows.length} lô mới?`
                            )
                          ) {
                            return;
                          }
                          const name = label === 'Google Sheets' ? 'Google Sheets' : `Tệp ${label}`;
                          if (mode === 'merge') {
                            const map = new Map(dataset.map((i) => [i.ID_Key, i]));
                            for (const r of rows) map.set(r.ID_Key, r);
                            applyDataset([...map.values()], name);
                          } else {
                            applyDataset(rows, name);
                          }
                          setApplied(true);
                        }}
                        className="gap-1.5 rounded-sm bg-primary px-5 font-bold text-primary-foreground hover:bg-primary/90"
                      >
                        <CheckCircle2 size={15} />
                        {applied ? 'Đã áp dụng vào hệ thống' : 'Áp dụng vào toàn hệ thống'}
                      </Button>
                    </div>
                  </div>

                  {applied && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-run">
                      <CheckCircle2 size={14} /> Dữ liệu đã được cập nhật thành công cho phiên làm việc hiện tại.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-sm border border-dashed border-border/60 bg-muted/10 p-8 text-center text-muted-foreground">
                <TableProperties size={28} className="mb-2 text-muted-foreground/40" />
                <p className="text-xs font-medium">Chưa có tập dữ liệu nào được phân tích</p>
                <p className="mt-1 text-[11px] text-muted-foreground/80">
                  Nhấn "Tải & Phân tích Schema" từ Google Sheets hoặc nạp tệp CSV bên trái để kiểm tra dữ liệu.
                </p>
              </div>
            )}
          </div>

          {/* Reset button & footnote */}
          <div className="mt-6 border-t border-border/60 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Info size={14} className="text-primary" />
                <span>Dữ liệu lưu an toàn trong trình duyệt (Local Storage), không ghi đè bảng tính gốc.</span>
              </div>

              {isLive && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      !window.confirm(
                        'Đặt lại về bộ dữ liệu mẫu mặc định 12 dòng? Dữ liệu đã nạp trên phiên này sẽ bị xóa.'
                      )
                    ) {
                      return;
                    }
                    resetDataset();
                    setApplied(false);
                    setRows([]);
                  }}
                  className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw size={13} /> Khôi phục dữ liệu mẫu (12 dòng)
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Bottom Section: Preview Staged Rows (Adhering to Domain Rule #1 & #2) */}
      {rows.length > 0 && (
        <section className="mes-card mt-6 overflow-hidden">
          <div className="flex flex-col justify-between gap-2 border-b border-border/80 bg-muted/20 px-5 py-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Layers size={14} />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">
                  Xem Trước Dữ Liệu Kiểm Tra (10 Dòng Đầu)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Tổng số <b className="font-mono text-foreground">{number(rows.length)}</b> dòng hợp lệ sẵn sàng nạp
                </p>
              </div>
            </div>

            <span className="font-mono text-[10px] text-muted-foreground">
              PREVIEW MODE · VENDOR ANONYMIZATION APPLIED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                <tr>
                  {preview.map((col) => (
                    <th key={col} className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-wider">
                      {col === 'cty_QT' ? 'Đơn vị gia công' : col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {rows.slice(0, 10).map((r) => (
                  <tr key={r.ID_Key} className="transition-colors hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-mono text-[11px] font-bold text-foreground">{r.ID_Key}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.phong_sx}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{r.ma_hang}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.vat_lieu}</td>
                    <td className="px-4 py-2.5 font-mono text-[11px] font-bold tabular-nums text-foreground">
                      {number(r.so_luong)}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {/* Domain Rule #1: Partner Privacy Anonymization */}
                      {formatVendorName(r.cty_QT, role)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex rounded-sm border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] text-foreground">
                        {r.TrangThai}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">{r.So_DatHang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
