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
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/dynamo-logo.png';
import { verifyCode } from '@/lib/dynamo-auth';

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

const demoCodes = [
  { role: 'Admin', code: '01m4hw6cqjyhzbh4dktdadbnqj', note: 'Toàn quyền điều hành & cài đặt' },
  { role: 'Leader', code: '01m4hw6cqjmcaft6fbx1s009ae', note: 'Trưởng / Phó phân xưởng sản xuất' },
  { role: 'Viewer', code: '01m4hw6cqj39r8p302yhgcy7g2', note: 'Xem tiến độ & dữ liệu đã ẩn danh' },
  { role: 'Đối tác', code: '01m4hw6cqj3vkzhf2v7x9eg6dc', note: 'Tài khoản nhà thầu phụ (YAMAICHI)' },
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!cleanCode) {
      setError('Vui lòng nhập mã xác nhận truy cập do Quản trị viên cấp.');
      return;
    }
    setBusy(true);
    setError('');

    try {
      const entry = await verifyCode(cleanCode);
      if (!entry) {
        setError(
          'Mã xác thực không hợp lệ hoặc đã hết hiệu lực. Vui lòng kiểm tra lại mã hoặc chọn mã mô phỏng bên dưới.'
        );
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

  const handleSelectDemo = (c: string) => {
    setCode(c);
    setError('');
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

            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                  MÃ TRUY CẬP (ACCESS CODE)
                </label>
                <div className="relative">
                  <KeyRound
                    size={16}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      setError('');
                    }}
                    placeholder="Dán hoặc nhập mã ULID"
                    aria-label="Mã xác thực"
                    aria-invalid={!!error}
                    className="h-11 w-full rounded-sm border border-input bg-background/60 pl-10 pr-3 font-mono text-xs tracking-wider text-foreground outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary aria-[invalid=true]:border-destructive"
                  />
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
                    XÁC THỰC & VÀO HỆ THỐNG <ArrowRight size={15} />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Code Chooser for Factory / Testing */}
            <div className="mt-6 border-t border-border/70 pt-5">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                  <Sparkles size={12} className="text-primary" /> MÃ MÔ PHỎNG KIỂM THỬ:
                </span>
                <span className="text-[10px] text-muted-foreground">Nhấn để điền nhanh</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {demoCodes.map((d) => (
                  <button
                    key={d.role}
                    type="button"
                    onClick={() => handleSelectDemo(d.code)}
                    className="flex flex-col items-start rounded-sm border border-border/80 bg-muted/30 p-2 text-left transition-colors hover:border-primary/50 hover:bg-muted/50 active:scale-[0.98]"
                  >
                    <div className="flex w-full items-center justify-between">
                      <span className="font-display text-xs font-bold text-foreground">{d.role}</span>
                      <span className="font-mono text-[9px] text-primary">Điền mã</span>
                    </div>
                    <span className="mt-0.5 truncate text-[10px] text-muted-foreground">{d.note}</span>
                  </button>
                ))}
              </div>
            </div>

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
