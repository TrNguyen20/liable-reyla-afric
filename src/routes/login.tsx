import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Factory, KeyRound, Loader2, RefreshCcw, ShieldCheck, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/dynamo-logo.png';
import { verifyCode } from '@/lib/dynamo-auth';
export const Route = createFileRoute('/login')({ head: () => ({ meta: [{ title: 'Đăng nhập | DYNAMO VIETNAM QT - MES' }, { name: 'description', content: 'Đăng nhập hệ thống điều hành nhà thầu phụ, nhiệt luyện và luân chuyển QT của DYNAMO VIETNAM QT - MES.' }, { property: 'og:title', content: 'Đăng nhập | DYNAMO VIETNAM QT - MES' }, { property: 'og:description', content: 'Điều hành gia công ngoài, nhiệt luyện và luân chuyển QT.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }), component: Login });
const features = [
  { icon: RefreshCcw, title: 'Luân chuyển nhiệt luyện / xi mạ 24/7', desc: 'Theo dõi từng lô từ phân xưởng qua đối tác về nhập kho.' },
  { icon: ShieldCheck, title: 'Kiểm soát trễ hạn đối tác', desc: 'Cảnh báo Andon tức thì cho lô trễ hơn 3 ngày.' },
  { icon: TrendingUp, title: 'Đối soát đơn giá tức thì', desc: 'Phát hiện lệch chuẩn theo Vendor × Mác thép × Đơn vị tính.' },
];
function Login() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { setError('Vui lòng nhập mã xác nhận do Admin cấp.'); return; }
    setBusy(true);
    const entry = await verifyCode(code);
    setBusy(false);
    if (!entry) { setError('Mã xác nhận không hợp lệ hoặc chưa được kích hoạt. Vui lòng liên hệ Admin hệ thống DYNAMO để được cấp quyền.'); return; }
    window.localStorage.setItem('dynamo-user', entry.note || entry.role);
    window.localStorage.setItem('dynamo-role', entry.role);
    window.localStorage.setItem('dynamo-code', code.trim());
    navigate({ to: '/dashboard' });
  };
  return <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
    <section className="relative hidden flex-col justify-between overflow-hidden bg-graphite p-10 text-slate-100 lg:flex">
      <div className="pointer-events-none absolute -left-24 top-1/3 size-[420px] rounded-full opacity-40 blur-3xl" style={{ background: 'radial-gradient(circle, color-mix(in oklch, var(--dynamo) 60%, transparent), transparent 70%)' }} aria-hidden />
      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="rounded-sm bg-card px-3 py-2 shadow-[0_0_28px_color-mix(in_oklch,var(--dynamo)_45%,transparent)]"><img src={logo} alt="Dynamo Vietnam" className="h-10 w-auto" /></span>
          <div>
            <p className="font-display text-lg font-extrabold tracking-wide">DYNAMO VIETNAM QT - MES</p>
            <p className="text-[10px] font-bold tracking-[.28em] text-dynamo">QT OPERATIONS SYSTEM</p>
          </div>
        </div>
        <h1 className="mt-14 max-w-md font-display text-4xl font-black leading-tight">Điều hành nhà thầu phụ, nhiệt luyện và luân chuyển QT</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">Một hệ thống duy nhất cho phân xưởng PIN, INSERT và MOLD: theo dõi lô hàng tại YAMAICHI & PROVISION, kiểm soát hạn trả và đối soát chi phí gia công.</p>
      </div>
      <div className="relative space-y-5">
        {features.map(f => <div key={f.title} className="flex gap-4">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm bg-white/5 text-dynamo"><f.icon size={18} /></span>
          <div><p className="text-sm font-bold">{f.title}</p><p className="mt-1 text-xs text-slate-400">{f.desc}</p></div>
        </div>)}
      </div>
      <p className="relative flex items-center gap-2 text-[11px] text-slate-500"><Factory size={13} /> DYNAMO VIETNAM CO., LTD. · Hệ thống mô phỏng nội bộ</p>
    </section>
    <section className="flex flex-col justify-center bg-background px-6 py-12 sm:px-14">
      <div className="mx-auto w-full max-w-sm">
        <img src={logo} alt="Dynamo Vietnam" className="mb-6 h-12 w-auto" />
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <div><p className="font-display text-base font-extrabold">DYNAMO VIETNAM QT - MES</p><p className="text-[9px] font-bold tracking-[.24em] text-dynamo">QT OPERATIONS SYSTEM</p></div>
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground">Đăng nhập hệ thống</h2>
        <p className="mt-2 text-[13px] text-muted-foreground">Nhập mã xác nhận do Admin cấp để truy cập theo đúng quyền của bạn.</p>
        <form onSubmit={submit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold tracking-wide text-muted-foreground">MÃ XÁC NHẬN</span>
            <div className="relative"><KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="password" autoComplete="off" spellCheck={false} value={code} onChange={e => { setCode(e.target.value); setError(''); }} placeholder="Nhập mã xác nhận" aria-label="Mã xác nhận" className="h-11 w-full rounded-sm border border-input bg-card pl-9 pr-3 font-mono text-sm text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground/60 focus:border-primary" /></div>
          </label>
          {error && <p role="alert" className="border border-destructive/30 bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">{error}</p>}
          <Button type="submit" disabled={busy} className="h-11 w-full rounded-sm bg-dynamo font-display text-sm font-bold tracking-widest text-white hover:bg-dynamo/90">{busy ? <><Loader2 size={16} className="animate-spin" /> ĐANG XÁC THỰC…</> : <>XÁC THỰC & ĐĂNG NHẬP <ArrowRight size={16} /></>}</Button>
        </form>
        <p className="mt-6 flex items-start gap-2 border border-border bg-card p-3 text-[11px] text-muted-foreground"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />Chưa có mã? Vui lòng liên hệ Admin hệ thống DYNAMO để được cấp quyền truy cập.</p>
        <p className="mt-8 text-center text-[11px] text-muted-foreground">Môi trường mô phỏng — dữ liệu hiển thị là bộ mẫu chuẩn hóa.</p>
      </div>
    </section>
  </div>;
}

