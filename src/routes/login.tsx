import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
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
  Delete,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/dynamo-logo.png";
import { verifyCode, positionMatchesRole, LockedError, AttemptsError } from "@/lib/dynamo-auth";
import { Lock } from "lucide-react";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Đăng nhập | DYNAMO VIETNAM QT - MES" },
      {
        name: "description",
        content:
          "Đăng nhập hệ thống điều hành nhà thầu phụ, nhiệt luyện và luân chuyển QT của DYNAMO VIETNAM.",
      },
      { property: "og:title", content: "Đăng nhập | DYNAMO VIETNAM QT - MES" },
      {
        property: "og:description",
        content: "Điều hành gia công ngoài, nhiệt luyện và luân chuyển QT.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

type Position = "admin" | "leader" | "viewer" | "partner";

const Cross = ({ className }: { className: string }) => (
  <span aria-hidden className={`pointer-events-none absolute size-3 text-slate-700 ${className}`}>
    <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-current" />
    <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-current" />
  </span>
);

function Login() {
  const navigate = useNavigate();
  const { locale, setLocale, t, locales } = useTranslation();
  const [code, setCode] = useState("");
  const [position, setPosition] = useState<Position | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [kioskMode, setKioskMode] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  const lockLeft = Math.max(0, Math.ceil((lockUntil - now) / 1000));
  const locked = lockLeft > 0;
  const mmss = `${String(Math.floor(lockLeft / 60)).padStart(2, "0")}:${String(lockLeft % 60).padStart(2, "0")}`;

  const positions: { id: Position; label: string; note: string }[] = [
    {
      id: "admin",
      label: t("auth.positions.admin.label") || "BGĐ / IT hệ thống",
      note: t("auth.positions.admin.role") || "Admin",
    },
    {
      id: "leader",
      label: t("auth.positions.leader.label") || "Trưởng / Phó phòng",
      note: t("auth.positions.leader.role") || "Leader",
    },
    {
      id: "viewer",
      label: t("auth.positions.viewer.label") || "KTV / Nhân viên",
      note: t("auth.positions.viewer.role") || "Viewer",
    },
    {
      id: "partner",
      label: t("auth.positions.partner.label") || "Nhà cung cấp ngoài",
      note: t("auth.positions.partner.role") || "Partner",
    },
  ];

  const handleSelectPosition = (posId: Position) => {
    setPosition(posId);
    setError("");
    // 150ms tactile micro-delay for LED feedback, then 3D flip to back face
    setTimeout(() => {
      setIsFlipped(true);
      // Auto-focus access code input once flip animation has settled
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }, 150);
  };

  const handleBackToStep1 = () => {
    setIsFlipped(false);
    setError("");
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFlipped && !busy) {
        setIsFlipped(false);
        setError("");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFlipped, busy]);

  const features = [
    {
      icon: RefreshCcw,
      title: t("auth.features.tracking.title") || "Luân chuyển nhiệt luyện / xi mạ 24/7",
      desc:
        t("auth.features.tracking.desc") ||
        "Giám sát hành trình từng lô hàng từ phân xưởng PIN, INSERT, MOLD qua nhà thầu phụ về nhập kho.",
    },
    {
      icon: ShieldCheck,
      title: t("auth.features.leadTime.title") || "Kiểm soát trễ hạn đối tác",
      desc:
        t("auth.features.leadTime.desc") ||
        "Phát hiện và cảnh báo sớm các lô hàng quá hạn giao trả, đảm bảo tiến độ lắp ráp khuôn đúc.",
    },
    {
      icon: TrendingUp,
      title: t("auth.features.pricing.title") || "Đối soát đơn giá & định mức vật liệu",
      desc:
        t("auth.features.pricing.desc") ||
        "Tự động kiểm tra chênh lệch đơn giá theo quy cách Mác thép × Đơn vị tính × Nhà cung cấp.",
    },
  ];

  useEffect(() => {
    if (!lockUntil) return;
    const tTimer = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockUntil) {
        clearInterval(tTimer);
        setLockUntil(0);
        setError("");
        setAttemptsLeft(null);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
    }, 250);
    return () => clearInterval(tTimer);
  }, [lockUntil]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanCode = code.trim();
    if (!position) {
      setError(
        t("auth.errors.requirePosition") ||
        "Vui lòng chọn vị trí công tác (Bước 1) trước khi xác thực.",
      );
      return;
    }
    if (!cleanCode) {
      setError(t("auth.errors.requireCode") || "Vui lòng nhập mã định danh truy cập (Bước 2).");
      return;
    }
    setBusy(true);
    setError("");
    setAttemptsLeft(null);

    try {
      const entry = await verifyCode(cleanCode);
      if (!entry) {
        setError(t("auth.errors.invalidCode") || "Mã xác thực không hợp lệ hoặc đã hết hiệu lực.");
        setBusy(false);
        return;
      }
      if (!positionMatchesRole(position, entry.role)) {
        const label = positions.find((p) => p.id === position)?.label ?? "";
        setError(
          t("auth.errors.roleMismatch", { label }) ||
          `Mã truy cập này không thuộc thẩm quyền của vị trí ${label} đã chọn. Vui lòng kiểm tra lại.`,
        );
        setBusy(false);
        return;
      }

      // Session cookie is set by the server; local backup stores session for iframe resilience
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          "dynamo-session",
          JSON.stringify({ role: entry.role, note: entry.note, at: Date.now() }),
        );
      }
      navigate({ to: "/tracking" });
    } catch (err) {
      if (err instanceof LockedError) {
        setLockUntil(Date.now() + err.remainingMs);
        setCode("");
      } else if (err instanceof AttemptsError) {
        setError(t("auth.errors.invalidCode") || "Mã xác thực không hợp lệ hoặc đã hết hiệu lực.");
        setAttemptsLeft(err.attemptsLeft);
      } else {
        setError(
          t("auth.errors.networkError") ||
          "Lỗi kết nối khi xác thực mã. Vui lòng thử lại sau ít phút.",
        );
      }
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-12 transform-gpu">
      {/* Left Column: Industrial Plant Hero (Graphite Canvas) */}
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-[#0b0e14] px-12 py-10 text-slate-100 lg:col-span-7 lg:flex xl:col-span-7">
        {/* Subtle Engineering Grid Background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Top Header & Brand */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-4 rounded-xs border border-slate-800 bg-slate-900/60 p-2.5 pr-6 backdrop-blur-xs">
            <span className="flex items-center justify-center rounded-xs bg-card p-2 shadow-xs">
              <img src={logo} alt="Dynamo Vietnam" className="h-8 w-auto" />
            </span>
            <div>
              <p className="font-display text-base font-extrabold tracking-wide text-white">
                DYNAMO VIETNAM QT - MES
              </p>
              <p className="font-mono text-[9px] font-bold tracking-[.3em] text-white">
                PRECISION SHOPFLOOR SUBCONTRACT CONTROL
              </p>
            </div>
          </div>

          <div className="mt-10 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-xs border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
              <Cpu size={14} />
              <span>{t("auth.hero.badge") || "HỆ THỐNG ĐIỀU HÀNH QT NỘI BỘ"}</span>
            </div>
            <h1 className="font-display text-4xl font-black tracking-tight text-white xl:text-5xl leading-[3.5rem]">
              {t("auth.hero.title") || (
                <>
                  Quản Lý Nhà Thầu Phụ
                  <br />
                  Nhiệt Luyện &amp; Luân Chuyển QT
                </>
              )}
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              {t("auth.hero.subtitle") || (
                <>
                  Cổng điều hành tập trung phục vụ các xưởng PIN, INSERT, và MOLD.
                  <br />
                  Kiểm soát tiến độ từng lô gia công ngoài, giám sát thời hạn giao trả theo tiêu
                  chuẩn và đối soát vật tư khuôn đúc chính xác.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Technical Features Matrix */}
        <div className="relative z-10 my-8 max-w-3xl rounded-xs border border-slate-700/80 bg-slate-900/60 p-1">
          <Cross className="-left-1.5 -top-1.5" />
          <Cross className="-right-1.5 -top-1.5" />
          <Cross className="-bottom-1.5 -left-1.5" />
          <Cross className="-bottom-1.5 -right-1.5" />

          <div className="divide-y divide-slate-800/80">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 p-5 transition-colors hover:bg-slate-800/30">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xs border text-sky-400 bg-sky-500/10 border-sky-500/30">
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
            <Factory size={14} className="text-slate-500" />
            <span>
              {t("auth.plant.address") || "DYNAMO VIETNAM CO., LTD. · KHU CÔNG NGHIỆP ĐỒNG AN 2"}
            </span>
          </p>
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-run animate-pulse" />
              <span>MES QT CORE: R&D-V1.0-DEMO</span>
            </span>
            <span>·</span>
            <span>DATA SYNC: REAL-TIME</span>
          </div>
        </div>
      </section>

      {/* Right Column: High-Density Authentication Console */}
      <section className="relative flex flex-col justify-center bg-background px-6 py-12 sm:px-12 lg:col-span-5 xl:col-span-5">
        {/* Top Right Trilingual Switcher */}
        <div
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center rounded-xs border border-border/80 bg-secondary/50 p-0.5"
          title={
            t("common.langSwitcher.title") || "Chuyển đổi ngôn ngữ / Switch Language / 言語切替"
          }
          role="group"
          aria-label={t("common.langSwitcher.ariaLabel") || "Chọn ngôn ngữ hệ thống"}
        >
          {locales.map((item) => {
            const isCurrent = locale === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => setLocale(item.code)}
                className={`h-6 px-1.5 text-[10px] font-mono font-bold tracking-wider rounded-xs transition-all cursor-pointer ${isCurrent
                  ? "bg-slate-900 text-emerald-300 border border-slate-800 shadow-2xs font-black dark:bg-slate-100 dark:text-slate-950 dark:border-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  }`}
                title={`${item.label} (${item.nativeName})`}
              >
                {item.shortLabel}
              </button>
            );
          })}
        </div>

        <div className="mx-auto w-full max-w-md">
          {/* Mobile Logo & Title */}
          <div className="mb-8 lg:hidden">
            <img src={logo} alt="Dynamo Vietnam" className="mb-4 h-10 w-auto" />
            <p className="font-display text-base font-extrabold text-foreground">
              DYNAMO VIETNAM QT - MES
            </p>
            <p className="font-mono text-[9px] font-bold tracking-[.25em] text-white">
              PRECISION SHOPFLOOR SUBCONTRACT CONTROL
            </p>
          </div>

          {/* 3D Flip Card Container */}
          <div className="flip-card-container w-full">
            <div className={`flip-card-inner ${isFlipped ? "is-flipped" : ""}`}>
              {/* Mặt trước: BƯỚC 1 - VỊ TRÍ CÔNG TÁC */}
              <div
                className={`flip-card-front mes-card p-7 shadow-xs flex flex-col justify-start min-h-[360px] gap-5 ${isFlipped ? "absolute inset-0 pointer-events-none opacity-0" : "relative z-10 opacity-100"
                  } transition-opacity duration-300`}
                aria-hidden={isFlipped}
              >
                <div>
                  {/* Top Bar Mặt trước */}
                  <div className="h-7 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                        {t("auth.form.badge") || "XÁC THỰC DANH TÍNH"}
                      </span>
                      <span className="rounded-xs border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                        BƯỚC 1/2
                      </span>
                    </div>
                    <span className="font-mono text-[9px] font-bold tracking-wider text-muted-foreground uppercase">
                      PHÂN QUYỀN ID
                    </span>
                  </div>

                  {/* Header Mặt trước */}
                  <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    {t("auth.form.title") || "Đăng Nhập Hệ Thống"}
                  </h2>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-normal">
                    {t("auth.form.subtitle") ||
                      "Chọn vị trí công tác của bạn để mở khóa bảng điều hành tương ứng."}
                  </p>

                  <fieldset className="mt-6">
                    <legend className="mb-2 block font-mono text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
                      {t("auth.steps.step1") || "Bước 1 · Chọn vị trí công tác"}
                    </legend>
                    <div
                      role="radiogroup"
                      aria-label="Vị trí công tác"
                      className="grid grid-cols-2 gap-2"
                    >
                      {positions.map((p) => {
                        const active = position === p.id;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => handleSelectPosition(p.id)}
                            className={`flex min-h-[58px] items-start gap-2.5 p-3 rounded-xs border text-left transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary ${active
                              ? "border-primary bg-primary/10 text-primary shadow-[inset_0_0_0_1px_var(--color-primary)] font-bold"
                              : "border-border/80 bg-card hover:bg-muted/60 hover:border-primary/50 text-foreground"
                              }`}
                          >
                            <span
                              aria-hidden
                              className={`mt-1 size-2 shrink-0 rounded-full transition-all ${active
                                ? "bg-primary opacity-100 ring-2 ring-primary/30 fx-run-dot"
                                : "bg-primary/40 opacity-40"
                                }`}
                            />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold leading-snug">
                                {p.label}
                              </span>
                              <span className="block truncate text-[10px] text-muted-foreground mt-0.5">
                                {p.note}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                </div>

                <div className="mt-auto border-t border-border/60 pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-mono text-[10px]">
                    <ShieldCheck size={14} className="text-primary" />
                    Phân quyền truy cập ID · Bảo mật công nghiệp
                  </span>
                  <span className="font-mono text-[10px] text-primary font-bold">
                    CHỌN ĐỂ TIẾP TỤC →
                  </span>
                </div>
              </div>

              {/* Mặt sau: BƯỚC 2 - MÃ TRUY CẬP (ACCESS CODE) */}
              <div
                className={`flip-card-back mes-card p-7 shadow-xs flex flex-col justify-start min-h-[360px] gap-5 ${!isFlipped ? "absolute inset-0 pointer-events-none opacity-0" : "relative z-10 opacity-100"
                  } transition-opacity duration-300`}
                aria-hidden={!isFlipped}
              >
                <div>
                  {/* Top Bar Mặt sau */}
                  <div className="h-7 mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-xs border border-primary/20 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] font-bold text-primary">
                        BƯỚC 2/2
                      </span>
                      {position && (
                        <div className="inline-flex items-center gap-1.5 rounded-xs border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-mono font-bold text-primary">
                          <span className="size-1.5 rounded-full bg-primary fx-run-dot" />
                          <span>{positions.find((p) => p.id === position)?.label}</span>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleBackToStep1}
                      className="h-6 px-2 text-[11px] font-semibold border border-border/80 bg-secondary/50 rounded-xs hover:bg-secondary hover:border-primary/50 transition-colors cursor-pointer active:scale-98 inline-flex items-center gap-1 text-foreground"
                      title={t('auth.form.backToStep1Tooltip') || 'Quay lại chọn vị trí công tác khác (Phím tắt: Esc)'}
                    >
                      <ArrowLeft size={12} className="text-primary" />
                      <span>{t('auth.form.changeRole') || 'Đổi vị trí'}</span>
                    </button>
                  </div>

                  {/* Header Mặt sau */}
                  <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
                    Nhập Mã Xác Thực ID
                  </h2>
                  <p className="mt-1.5 text-xs text-muted-foreground leading-normal">
                    Nhập mã truy cập do Quản trị viên cấp để mở khóa quyền điều hành.
                  </p>

                  <form onSubmit={submit} className="mt-6 space-y-4">
                    <div>
                      <div className="mb-1.5 flex items-center justify-between">
                        <label
                          htmlFor="access-code"
                          className="font-mono text-[11px] font-bold tracking-wider text-muted-foreground uppercase"
                        >
                          {t("auth.form.codeLabel") || "Bước 2 · Mã truy cập"}
                        </label>
                        <button
                          type="button"
                          onClick={() => setKioskMode((v) => !v)}
                          className="flex items-center gap-1 font-mono text-[10px] font-bold text-primary hover:underline cursor-pointer"
                        >
                          <Smartphone size={12} />
                          {kioskMode
                            ? t("auth.form.kioskHide") || "Ẩn phím cảm ứng"
                            : t("auth.form.kioskShow") || "Phím số Kiosk"}
                        </button>
                      </div>
                      <div className="relative">
                        <KeyRound
                          size={16}
                          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                          id="access-code"
                          ref={inputRef}
                          disabled={locked}
                          type={showCode ? "text" : "password"}
                          autoComplete="off"
                          spellCheck={false}
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value);
                            setError("");
                          }}
                          placeholder={
                            position
                              ? t("auth.form.codePlaceholderPos", {
                                position: positions.find((p) => p.id === position)?.label ?? '',
                              }) ||
                              `Nhập mã truy cập của ${positions.find((p) => p.id === position)?.label}`
                              : "Nhập mã xác thực ID do Admin cấp..."
                          }
                          aria-label={t("auth.form.codeAria") || "Mã xác thực"}
                          aria-invalid={!!error}
                          className="h-11 w-full rounded-xs border border-input bg-background/60 pl-10 pr-20 font-mono tabular-nums text-xs tracking-wider text-foreground outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-muted-foreground/60 focus:border-primary aria-[invalid=true]:border-destructive"
                        />
                        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
                          {code && (
                            <button
                              type="button"
                              onClick={() => setCode("")}
                              aria-label={t("auth.form.clearAria") || "Xóa mã"}
                              className="flex size-8 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground active:scale-[0.98] cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowCode((v) => !v)}
                            aria-label={
                              showCode
                                ? t("auth.form.toggleAria") || "Ẩn mã"
                                : t("auth.form.toggleAria") || "Hiện mã"
                            }
                            className="flex size-8 items-center justify-center rounded-xs text-muted-foreground hover:text-foreground active:scale-[0.98] cursor-pointer"
                          >
                            {showCode ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>

                      {/* Industrial Touchscreen Virtual Numpad */}
                      {kioskMode && (
                        <div className="mt-3 overflow-hidden rounded-xs border border-border bg-card p-2.5 shadow-2xs">
                          <p className="mb-2 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t("auth.kiosk.heading") || "BÀN PHÍM CẢM ỨNG HIỆN TRƯỜNG (KIOSK MODE)"}
                          </p>
                          <div className="grid grid-cols-3 gap-1.5">
                            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                              <button
                                key={digit}
                                type="button"
                                disabled={locked}
                                onClick={() => {
                                  setCode((prev) => prev + digit);
                                  setError("");
                                }}
                                className="flex h-11 items-center justify-center rounded-xs border border-border/80 bg-background font-mono text-base font-bold text-foreground transition-all hover:bg-primary/10 hover:border-primary active:scale-95 disabled:opacity-40 cursor-pointer"
                              >
                                {digit}
                              </button>
                            ))}
                            <button
                              type="button"
                              disabled={locked || !code}
                              onClick={() => setCode("")}
                              className="flex h-11 items-center justify-center rounded-xs border border-border/80 bg-background font-mono text-xs font-bold text-destructive transition-all hover:bg-destructive/10 hover:border-destructive active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                              {t("auth.kiosk.clearAll") || "C (Xóa hết)"}
                            </button>
                            <button
                              type="button"
                              disabled={locked}
                              onClick={() => {
                                setCode((prev) => prev + "0");
                                setError("");
                              }}
                              className="flex h-11 items-center justify-center rounded-xs border border-border/80 bg-background font-mono text-base font-bold text-foreground transition-all hover:bg-primary/10 hover:border-primary active:scale-95 disabled:opacity-40 cursor-pointer"
                            >
                              0
                            </button>
                            <button
                              type="button"
                              disabled={locked || !code}
                              onClick={() => setCode((prev) => prev.slice(0, -1))}
                              className="flex h-11 items-center justify-center rounded-xs border border-border/80 bg-background font-mono text-xs font-bold text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95 disabled:opacity-40 cursor-pointer"
                              aria-label="Xóa 1 ký tự"
                            >
                              <Delete size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {locked ? (
                      <div
                        role="alert"
                        aria-live="polite"
                        className="overflow-hidden rounded-xs border border-destructive/60 bg-destructive/10"
                      >
                        <div className="h-1.5 w-full bg-[repeating-linear-gradient(45deg,var(--color-destructive)_0_8px,transparent_8px_16px)] opacity-70" />
                        <div className="flex items-center justify-between gap-3 p-3">
                          <div className="flex items-start gap-2 text-xs text-destructive">
                            <Lock size={14} className="mt-0.5 shrink-0" />
                            <div>
                              <p className="font-bold uppercase tracking-wider">
                                {t("auth.lock.title") || "Thiết bị tạm khóa an toàn"}
                              </p>
                              <p className="mt-0.5 text-destructive/80">
                                {t("auth.lock.desc") ||
                                  "Nhập sai 5 lần liên tiếp. Thử lại khi đồng hồ về 00:00."}
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-2xl font-bold tabular-nums text-destructive">
                            {mmss}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-destructive/20">
                          <div
                            className="h-full bg-destructive transition-[width] duration-1000 ease-linear"
                            style={{ width: `${(lockLeft / 120) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : error ? (
                      <div
                        role="alert"
                        className="rounded-xs border-l-2 border-destructive bg-destructive/10 p-3 text-xs text-destructive"
                      >
                        <p className="font-semibold">{error}</p>
                        {attemptsLeft !== null && (
                          <p className="mt-1 font-mono tabular-nums text-destructive/80">
                            {t("auth.lock.attemptsLeft", { attemptsLeft }) ||
                              `Còn ${attemptsLeft}/5 lần thử trước khi khóa thiết bị.`}
                          </p>
                        )}
                      </div>
                    ) : null}

                    <Button
                      type="submit"
                      disabled={busy || locked}
                      className="h-11 w-full gap-2 rounded-xs bg-primary font-display text-xs font-bold tracking-wider uppercase text-primary-foreground hover:bg-primary/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground cursor-pointer"
                    >
                      {locked ? (
                        <>
                          <Lock size={15} />{" "}
                          {t("auth.submit.locked", { mmss }) || (
                            <>
                              TẠM KHÓA · <span className="font-mono tabular-nums">{mmss}</span>
                            </>
                          )}
                        </>
                      ) : busy ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {t("auth.submit.verifying") || "ĐANG XÁC THỰC QUYỀN HẠN..."}
                        </>
                      ) : (
                        <>
                          {t("auth.submit.enter") || "XÁC THỰC VÀO HỆ THỐNG"}{" "}
                          <ArrowRight size={15} />
                        </>
                      )}
                    </Button>
                  </form>
                </div>

                <div className="mt-auto border-t border-border/60 pt-4 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <ShieldCheck size={14} className="mt-0.5 shrink-0 text-primary" />
                    <p>
                      {t("auth.support.text") ||
                        "Chưa có mã? Vui lòng liên hệ Quản trị viên để được cấp mã truy cập theo chức năng."}
                    </p>
                  </div>
                  <span className="hidden sm:inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground/70 shrink-0 ml-2">
                    <kbd className="rounded-xs border border-border bg-muted/60 px-1 py-0.5 text-[9px] font-bold">Esc</kbd>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="font-display text-xs font-bold tracking-wide text-foreground">
              {t("common.slogan") || "Kỷ Luật - Chính Xác - An Toàn - Đúng Hạn"}
            </p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">
              © 2026 DYNAMO VIET NAM CO., LTD. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
