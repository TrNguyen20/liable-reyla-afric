import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useDynamo } from "@/components/dynamo-shell";
import { isOpen } from "@/lib/dynamo-rules";
import { number } from "@/lib/dynamo-data";
import { LIVE_SHEET_URL } from "@/lib/live-sheet";
import { playAudioCue } from "@/lib/audio-cues";
import { useTranslation } from "@/i18n";
import { formatShift, formatTime } from "@/i18n/formatters";

export { LIVE_SHEET_URL };

function getShiftNumber(d = new Date()): 1 | 2 | 3 {
  const h = d.getHours();
  if (h >= 6 && h < 14) return 1;
  if (h >= 14 && h < 22) return 2;
  return 3;
}

export function ShopfloorTelemetry() {
  const { filtered, dataset, sourceLabel, syncedAt, loading, loadError } = useDynamo();
  const { t, locale } = useTranslation();
  const [shiftNum, setShiftNum] = useState<1 | 2 | 3>(() => getShiftNumber(new Date()));
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = window.localStorage.getItem("dynamo-telemetry-collapsed");
        return saved === "true";
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("dynamo-telemetry-collapsed", String(next));
      } catch {
        /* ignore */
      }
      playAudioCue("pop");
      return next;
    });
  };

  useEffect(() => {
    setShiftNum(getShiftNumber(new Date()));
    const shiftInterval = setInterval(() => setShiftNum(getShiftNumber(new Date())), 60000);
    return () => clearInterval(shiftInterval);
  }, []);

  const state = loading ? "busy" : loadError ? "error" : "idle";

  const m = useMemo(() => {
    let waiting = 0;
    let atVendor = 0;
    let stocked = 0;
    let kg = 0;
    let pcs = 0;
    const wsMap: Record<string, number> = { PIN: 0, INSERT: 0, MOLD: 0 };

    for (let i = 0; i < filtered.length; i++) {
      const r = filtered[i];
      if (!r) continue;
      if (r.TrangThai === "Chờ xuất xưởng") waiting++;
      else if (r.TrangThai === "Đang tại Vendor") atVendor++;
      else if (r.TrangThai === "Đã nhập kho") stocked++;

      if (isOpen(r)) {
        if (r.don_vi_tinh === "Kg") kg += r.kg_Lot;
        else pcs += r.so_luong;
        const count = wsMap[r.phong_sx];
        if (count !== undefined) wsMap[r.phong_sx] = count + 1;
      }
    }

    const ws = (["PIN", "INSERT", "MOLD"] as const).map((w) => ({
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
    state === "error"
      ? "bg-destructive"
      : state === "busy"
        ? "bg-warning animate-pulse"
        : "bg-run fx-run-dot";

  const syncText =
    state === "busy"
      ? t("telemetry.states.syncing")
      : state === "error"
        ? t("telemetry.states.error")
        : syncedAt
          ? `${t("telemetry.updatedAt")} ${formatTime(syncedAt, locale)}`
          : t("telemetry.states.ready");

  const shiftText = t(`telemetry.shifts.shift${shiftNum}`);
  const shiftBadge = formatShift(shiftNum, locale);

  // Chế độ 1: Thu gọn siêu nhỏ (Compact Status Bar cao 26px - Chiến lược 1)
  if (isCollapsed) {
    return (
      <div className="relative border-b border-border/80 bg-secondary/40 backdrop-blur-xs select-none">
        <div className="flex h-[26px] items-center justify-between gap-2 px-3 text-[11px]">
          {/* Trái: LED nhịp xung + Trạng thái đồng bộ + Ca làm việc + Số dòng dataset */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`size-1.5 shrink-0 rounded-full transition-colors ${led}`}
              aria-hidden
            />
            <span className="font-bold text-foreground tracking-tight text-[11px] truncate">
              {syncText}
            </span>
            {shiftText && (
              <span
                title={shiftBadge}
                className="hidden font-mono text-[9px] font-bold text-muted-foreground sm:inline rounded-xs bg-muted/60 px-1 py-0.2"
              >
                {shiftText}
              </span>
            )}
            <span className="hidden md:inline font-mono text-[10px] text-muted-foreground tabular-nums">
              {t("telemetry.ribbon.datasetRows", { count: number(dataset.length) })} · {sourceLabel}
            </span>
          </div>

          {/* Giữa: Tóm tắt Micro-metrics dạng inline wireframe */}
          <div className="hidden lg:flex items-center gap-3 text-muted-foreground font-mono text-[10px] tabular-nums">
            <span>
              {t("telemetry.ribbon.externalShort")}{" "}
              <b className="text-foreground">{number(m.kg, 1)}</b> kg /{" "}
              <b className="text-foreground">{number(m.pcs)}</b> pcs
            </span>
            <span className="text-border/70">|</span>
            <span>
              {t("telemetry.ribbon.loadShort")}{" "}
              <b className="text-foreground">
                {t("telemetry.ribbon.openLots", { count: number(m.open) })}
              </b>
            </span>
            <span className="text-border/70">|</span>
            <div className="flex items-center gap-2">
              {m.ws.map((x) => (
                <span key={x.w}>
                  <b className="font-semibold text-foreground/80">{x.w}</b>{" "}
                  {Math.round((x.n / totalWs) * 100)}%
                </span>
              ))}
            </div>
          </div>

          {/* Phải: Nút Mở rộng Chevron */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleCollapsed}
              title={t("telemetry.ribbon.expandTooltip")}
              aria-label={t("telemetry.ribbon.kpiMetrics")}
              className="inline-flex items-center gap-1 rounded-xs border border-border/80 bg-background/90 hover:bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground shadow-2xs hover:border-primary/50 transition-all active:scale-95 cursor-pointer"
            >
              <ChevronDown size={11} className="text-primary" />
              <span className="hidden sm:inline">{t("telemetry.ribbon.kpiMetrics")}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chế độ 2: Dải Ribbon mở rộng 3 cột đầy đủ (Expanded KPI Ribbon)
  return (
    <div className="relative border-b border-border/80 bg-secondary/40 backdrop-blur-xs select-none">
      <div className="grid grid-cols-1 divide-y divide-border/60 text-[11px] md:grid-cols-3 md:divide-y-0 md:divide-x lg:grid-cols-[1.5fr_1fr_1.5fr]">
        {/* Cột 1: Trạng thái kết nối Sheet & Nút Làm Mới Tinh Gọn */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 xl:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`size-2 shrink-0 rounded-full transition-colors ${led}`} aria-hidden />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-foreground tracking-tight">{syncText}</p>
                {shiftText && (
                  <span
                    title={shiftBadge}
                    className="hidden font-mono text-[9px] font-bold text-muted-foreground sm:inline rounded-xs bg-muted/60 px-1 py-0.2"
                  >
                    {shiftText}
                  </span>
                )}
              </div>
              <p className="truncate font-mono text-[10px] text-muted-foreground tabular-nums">
                {number(dataset.length)}{" "}
                {t("telemetry.ribbon.datasetRows", { count: "" }).replace(/^[·\s]+/, "")} ·{" "}
                {sourceLabel}
              </p>
            </div>
          </div>
        </div>

        {/* Cột 2: Khối lượng hàng ngoài xưởng */}
        <div className="px-4 py-2">
          <p className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            {t("telemetry.externalHeatTreatment")}
          </p>
          <p className="font-mono font-bold tabular-nums text-foreground">
            {number(m.kg, 1)}{" "}
            <span className="text-[11px] font-normal text-muted-foreground">kg</span>{" "}
            <span className="text-muted-foreground">/</span> {number(m.pcs)}{" "}
            <span className="text-[11px] font-normal text-muted-foreground">pcs</span>
          </p>
        </div>

        {/* Cột 3: Tải theo phân xưởng & Nút Thu Gọn */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 xl:px-6">
          <div className="flex-1 min-w-0">
            <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="font-bold tracking-wider uppercase">
                {t("telemetry.workshopLoad")}
              </span>
              <span className="font-mono font-bold tabular-nums text-foreground">
                {t("telemetry.ribbon.openLots", { count: number(m.open) })}
              </span>
            </div>
            <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-xs bg-border/80">
              {m.ws.map((x, i) => (
                <span
                  key={x.w}
                  title={`${x.w}: ${t("telemetry.ribbon.openLots", { count: x.n })} (${Math.round((x.n / totalWs) * 100)}%)`}
                  style={{ width: `${(x.n / totalWs) * 100}%` }}
                  className={["bg-info", "bg-primary", "bg-warning"][i]}
                />
              ))}
            </div>
            <p className="mt-1 flex gap-3 font-mono text-[10px] text-muted-foreground tabular-nums">
              {m.ws.map((x) => (
                <span key={x.w}>
                  <b className="font-semibold text-foreground/80">{x.w}</b>{" "}
                  {Math.round((x.n / totalWs) * 100)}%
                </span>
              ))}
            </p>
          </div>

          <button
            type="button"
            onClick={toggleCollapsed}
            title={t("telemetry.ribbon.collapseTooltip")}
            aria-label={t("telemetry.ribbon.collapse")}
            className="inline-flex shrink-0 items-center gap-1 rounded-xs border border-border/80 bg-background/90 hover:bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground shadow-2xs hover:border-primary/50 transition-all active:scale-95 cursor-pointer self-start"
          >
            <ChevronUp size={11} className="text-primary" />
            <span className="hidden sm:inline">{t("telemetry.ribbon.collapse")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
