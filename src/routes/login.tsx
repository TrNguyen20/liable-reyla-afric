import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Factory,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/dynamo-logo.png';
import { verifyCode, positionMatchesRole } from '@/lib/dynamo-auth';

export const Route = createFileRoute('/login')({
  head: () => ({
    meta: [
      { title: 'Đăng nhập | DYNAMO VIETNAM QT - MES' },
      {
        name: 'description',
        content: 'Đăng nhập hệ thống điều hành nhà thầu phụ, nhiệt luyện và luân chuyển QT của DYNAMO VIETNAM.',
      },
      { property: 'og:title', content: 'Đăng nhập | DYNAMO VIETNAM QT - MES' },
      {
        property: 'og:description',
        content: 'Điều hành gia công ngoài, nhiệt luyện và luân chuyển QT.',
      },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Login,
});

const features = [
  {
    icon: RefreshCcw,
    title: 'Luân chuyển nhiệt luyện / xi mạ 24/7',
    desc: 'Giám sát hành trình từng lô hàng từ phân xưởng PIN, INSERT, MOLD qua nhà thầu phụ về nhập kho.',
  },
  {
    icon: ShieldCheck,
    title: 'Kiểm soát trễ hạn đối tác (ISA-101 Andon)',
    desc: 'Phát hiện và cảnh báo sớm các lô hàng quá hạn giao trả, đảm bảo tiến độ lắp ráp khuôn đúc.',
  },
  {
    icon: TrendingUp,
    title: 'Đối soát đơn giá & định mức vật liệu',
    desc: 'Tự động kiểm tra chênh lệch đơn giá theo quy cách Mác thép × Đơn vị tính × Nhà cung cấp.',
  },
];

type Position = 'admin' | 'leader' | 'viewer' | 'partner';

const positions: { id: Position; label: string; note: string; led: string }[] = [
  { id: 'admin', label: 'Quản trị viên', note: 'Admin', led: 'bg-dynamo' },
  { id: 'leader', label: 'Quản lý xưởng', note: 'Leader', led: 'bg-run' },
  { id: 'viewer', label: 'Giám sát viên', note: 'Viewer', led: 'bg-titan' },
  { id: 'partner', label: 'Đối tác', note: 'Đơn vị gia công theo chỉ định', led: 'bg-warning' },
];


const Cross = ({ className }: { className: string }) => (
  <span aria-hidden className={`pointer-events-none absolute size-3 text-slate-700 ${className}`}>
    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
  </span>
);

function Login() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!position) {
      setError('Vui lòng chọn vị trí công tác (Bước 1) trước khi xác thực.');
      return;
    }
    if (!cleanCode) {
      setError('Vui lòng nhập mã định danh truy cập (Bước 2).');
      return;
    }
    setBusy(true);
    setError('');

    try {
      const entry = await verifyCode(cleanCode);
      if (!entry) {
        setError(
          'Mã xác thực không hợp lệ hoặc đã hết hiệu lực.'
        );
        setBusy(false);
        return;
      }
      if (!positionMatchesRole(position, entry.role)) {
        const label = positions.find((p) => p.id === position)?.label ?? '';
        setError(`Mã truy cập này không thuộc thẩm quyền của vị trí ${label} đã chọn. Vui lòng kiểm tra lại.`);
        setBusy(false);
        return;
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('dynamo-user', entry.note || entry.role);
        window.localStorage.setItem('dynamo-role', entry.role);
        window.localStorage.setItem('dynamo-code', cleanCode);
      }
      navigate({ to: '/dashboard' });
    } catch {
      setError('Lỗi kết nối khi xác thực mã. Vui lòng thử lại sau ít phút.');
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-12">
      {/* Left Column: Industrial Plant Hero (Graphite Canvas) */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-[#0b0e14] p-12 text-slate-100 lg:col-span-7 lg:flex xl:col-span-8">
        {/* Subtle Engineering Grid Background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Top Header & Brand */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-4 rounded-sm border border-slate-800 bg-slate-900/60 p-2.5 pr-6 backdrop-blur-xs">
            <span className="flex items-center justify-center rounded-sm bg-card p-2 shadow-xs">
              <img src={logo} alt="Dynamo Vietnam" className="h-8 w-auto" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold tracking-wide text-white">
                DYNAMO VIETNAM QT - MES
              </p>
              <p className="font-mono text-[9px] font-bold tracking-[.3em] text-primary">
                PRECISION SHOPFLOOR SUBCONTRACT CONTROL
              </p>
            </div>
          </div>

          <div className="mt-14 max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Cpu size={14} />
              <span>HỆ THỐNG ĐIỀU HÀNH SẢN XUẤT NỘI BỘ</span>
            </div>
            <h1 className="font-display text-4xl font-black tracking-tight text-white xl:text-5xl">
              Điều Hành Nhà Thầu Phụ, Nhiệt Luyện & Luân Chuyển QT
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              Cổng chỉ huy tập trung dành cho phân xưởng PIN, INSERT và MOLD: kiểm soát tiến độ từng lô gia công ngoài,
              giám sát thời hạn giao trả theo tiêu chuẩn ISA-101 và tự động đối soát định mức vật liệu khuôn đúc chính xác.
            </p>
          </div>
        </div>

        {/* Technical Features Matrix */}
        <div className="relative z-10 my-10 max-w-2xl rounded-sm border border-slate-800/80 bg-slate-900/40 p-1">
          <Cross className="-left-1.5 -top-1.5" />
          <Cross className="-right-1.5 -top-1.5" />
          <Cross className="-bottom-1.5 -left-1.5" />
          <Cross className="-bottom-1.5 -right-1.5" />

          <div className="divide-y divide-slate-800/80">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 p-5 transition-colors hover:bg-slate-800/30">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <f.icon size={18} strokeWidth={2} />
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-white">{f.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Plant Telemetry Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800/80 pt-6 text-[11px] text-slate-500">
          <p className="flex items-center gap-2">
            <Factory size={14} className="text-primary" />
            <span>DYNAMO VIETNAM CO., LTD. · KHU CÔNG NGHIỆP ĐỒNG AN 2</span>
          </p>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-run animate-pulse" />
              <span>MES CORE: V1.0-STABLE</span>
            </span>
            <span>·</span>
            <span>DATA GUARD: ACTIVE</span>
          </div>
        </div>
      </section>

      {/* Right Column: High-Density Authentication Console */}
      <section className="flex flex-col justify-center bg-background px-6 py-12 sm:px-12 lg:col-span-5 xl:col-span-4">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo & Title */}
          <div className="mb-8 lg:hidden">
            <img src={logo} alt="Dynamo Vietnam" className="mb-4 h-10 w-auto" />
            <p className="font-display text-base font-extrabold text-foreground">DYNAMO VIETNAM QT - MES</p>
            <p className="font-mono text-[9px] font-bold tracking-[.25em] text-primary">
              PRECISION OPERATIONS
            </p>
          </div>

          {/* Login Card */}
          <div className="mes-card p-7 shadow-xs">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  XÁC THỰC DANH TÍNH
                </span>
                <span className="rounded-sm border border-primary/20 bg-primary/10 px-1.5 py-0.2 font-mono text-[9px] font-bold text-primary">
                  ULID TOKEN
                </span>
              </div>
              <h2 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
                Đăng Nhập Hệ Thống
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Nhập mã xác thực do ban điều hành cấp để phân quyền theo vai trò tương ứng.
              </p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <fieldset>
                <legend className="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Bước 1 · Vị trí công tác
                </legend>
                <div role="radiogroup" aria-label="Vị trí công tác" className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-border bg-border">
                  {positions.map((p) => {
                    const active = position === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => {
                          setPosition(p.id);
                          setError('');
                        }}
                        className={`flex min-h-[52px] items-start gap-2.5 p-2.5 text-left transition-[background-color,transform] duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${
                          active ? 'bg-muted shadow-[inset_0_0_0_1px_var(--color-foreground)]' : 'bg-card hover:bg-muted/50'
                        }`}
                      >
                        <span
                          aria-hidden
                          className={`mt-1 size-2 shrink-0 rounded-full transition-opacity ${p.led} ${active ? 'opacity-100' : 'opacity-25'}`}
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-foreground">{p.label}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">{p.note}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label htmlFor="access-code" className="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  Bước 2 · Mã truy cập (Access code)
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    id="access-code"
                    type={showCode ? 'text' : 'password'}
                    autoComplete="off"
                    spellCheck={false}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setError('');
                    }}
                    placeholder={
                      position
                        ? `Nhập mã định danh dành cho ${positions.find((p) => p.id === position)?.label}`
                        : 'Chọn vị trí ở Bước 1 trước'
                    }
                    aria-label="Mã xác thực"
                    aria-invalid={!!error}
                    className="h-11 w-full rounded-sm border border-input bg-background/60 pl-10 pr-20 font-mono tabular-nums text-xs tracking-wider text-foreground outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary aria-[invalid=true]:border-destructive"
                  />
                  <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
                    {code && (
                      <button
                        type="button"
                        onClick={() => setCode('')}
                        aria-label="Xóa mã"
                        className="flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground active:scale-[0.98]"
                      >
                        <X size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCode((v) => !v)}
                      aria-label={showCode ? 'Ẩn mã' : 'Hiện mã'}
                      className="flex size-8 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground active:scale-[0.98]"
                    >
                      {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-sm border-l-2 border-destructive bg-destructive/10 p-3 text-xs text-destructive"
                >
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                disabled={busy}
                className="h-11 w-full gap-2 rounded-sm bg-primary font-display text-xs font-bold tracking-wider uppercase text-primary-foreground hover:bg-primary/90"
              >
                {busy ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    ĐANG XÁC THỰC QUYỀN HẠN...
                  </>
                ) : (
                  <>
                    XÁC THỰC VỊ TRÍ & VÀO HỆ THỐNG <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 border-t border-border/60 pt-4 text-[11px] text-muted-foreground">
              <div className="flex items-start gap-2">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
                <p>
                  Chưa có mã? Vui lòng liên hệ Trưởng phòng Kỹ thuật hoặc Quản trị viên để được cấp mã truy cập theo phân xưởng.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-muted-foreground">
            Môi trường vận hành mô phỏng · Bản quyền thuộc về DYNAMO VIETNAM
          </p>
        </div>
      </section>
    </div>
  );
}
