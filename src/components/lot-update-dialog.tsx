import { useState } from "react";
import { ArrowRight, PenLine } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDynamo } from "@/components/dynamo-shell";
import { getVendorScope, formatVendorName } from "@/lib/dynamo-auth";
import { type QTItem, type Status } from "@/lib/dynamo-data";
import { appendAudit, nextMoves, validateUpdate, type Draft } from "@/lib/dynamo-workflow";
import { updateLotProgress } from "@/lib/auth.functions";
import { useTranslation } from "@/i18n";
import { formatDate } from "@/i18n/formatters";

// prettier-ignore
export function LotUpdateButton({
  item,
  variant = 'button',
}: {
  item: QTItem;
  variant?: 'icon' | 'button';
}) {
  const { role, updateItem } = useDynamo();
  const { t, locale } = useTranslation();
  const vendor = getVendorScope(role);
  const isAdmin = role === "admin";
  const [open, setOpen] = useState(false);
  const fresh = (): Draft => ({
    status: item.TrangThai,
    ngay_nhan: item.ngay_nhan ?? "",
    do_cung: item.do_cung === "—" ? "" : item.do_cung,
    reason: "",
    qcPassed: false,
  });
  const [d, setD] = useState<Draft>(fresh);
  const [errs, setErrs] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!isAdmin && !(vendor && vendor === String(item.cty_QT).toUpperCase())) return null;

  const moves = nextMoves(item.TrangThai, isAdmin);
  const needsReason = moves.find((m) => m.to === d.status)?.reason ?? false;
  const set = (p: Partial<Draft>) => {
    setD((v) => ({ ...v, ...p }));
    setErrs([]);
    setConfirm(false);
  };

  const save = async () => {
    const found = validateUpdate(item, d, isAdmin);
    if (found.length) {
      setErrs(found);
      return;
    }
    if (d.status !== item.TrangThai && !confirm) {
      setConfirm(true);
      return;
    }
    setBusy(true);
    const changes: Record<string, [string, string]> = {};
    if (d.status !== item.TrangThai) changes["TrangThai"] = [item.TrangThai, d.status];
    if (d.ngay_nhan !== (item.ngay_nhan ?? ""))
      changes["ngay_nhan_QT"] = [item.ngay_nhan ?? "", d.ngay_nhan];
    const oldHrc = item.do_cung === "—" ? "" : item.do_cung;
    if (d.do_cung.trim() !== oldHrc) changes["do_cung"] = [oldHrc, d.do_cung.trim()];
    if (!Object.keys(changes).length) {
      setBusy(false);
      setErrs([t("common.lotUpdate.noChanges") || "Chưa có thay đổi nào để lưu."]);
      return;
    }
    const res = await updateLotProgress({
      data: {
        webhook: window.localStorage.getItem("dynamo-webhook") ?? "",
        ID_Key: item.ID_Key,
        cty_QT: String(item.cty_QT),
        updates: { TrangThai: d.status, do_cung: d.do_cung.trim(), ngay_nhan_QT: d.ngay_nhan },
      },
    }).catch(() => ({
      ok: false as const,
      error: t("common.lotUpdate.networkError") || "Không kết nối được máy chủ.",
    }));
    setBusy(false);
    const base = {
      ID_Key: item.ID_Key,
      user: role,
      role,
      from: item.TrangThai,
      to: d.status,
      changes,
      reason: d.reason.trim(),
    };
    if (!res.ok) {
      // Keep the draft so the user can retry without retyping; the same ID_Key update is idempotent on the sheet.
      appendAudit({ ...base, result: "sync_failed", error: res.error });
      setErrs([
        t("common.lotUpdate.sheetSyncError", { error: res.error }) ||
          `Chưa ghi được lên Google Sheet: ${res.error}. Dữ liệu chưa thay đổi — bấm Thử lại.`,
      ]);
      setConfirm(false);
      return;
    }
    updateItem(item.ID_Key, {
      TrangThai: d.status,
      do_cung: d.do_cung.trim() || "—",
      ngay_nhan: d.ngay_nhan || undefined,
    });
    appendAudit({ ...base, result: "ok" });
    toast.success(
      t("common.lotUpdate.syncSuccess", { lotId: item.ID_Key }) ||
        `Đã lưu và ghi lên Google Sheet: lô ${item.ID_Key}`,
    );
    setOpen(false);
  };

  const field =
    "mt-1 h-8.5 w-full rounded-xs border border-input bg-background px-2.5 font-mono text-xs focus:outline-hidden focus:border-primary/80 focus:ring-1 focus:ring-primary/40 transition-colors";
  const showDate = d.status === "Kiểm tra QC" || d.status === "Đã nhập kho" || !!item.ngay_nhan;
  const showHrc = d.status === "Kiểm tra QC" || d.status === "Đã nhập kho";

  return (
    <>
      {/* prettier-ignore */}
      {variant === 'icon' ? (
        <Button
          size="icon"
          variant="outline"
          className="size-7 rounded-xs border-border text-foreground hover:bg-accent hover:text-accent-foreground cursor-pointer shadow-2xs"
          title={
            t("common.lotUpdate.triggerTitle", { lotId: item.ID_Key }) ||
            `Cập nhật tiến độ lô ${item.ID_Key}`
          }
          onClick={() => {
            setD(fresh());
            setErrs([]);
            setConfirm(false);
            setOpen(true);
          }}
        >
          <PenLine size={13} className="text-primary" />
          <span className="sr-only">{t("common.lotUpdate.triggerBtn") || "Cập nhật"}</span>
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 rounded-xs text-xs cursor-pointer shadow-2xs"
          onClick={() => {
            setD(fresh());
            setErrs([]);
            setConfirm(false);
            setOpen(true);
          }}
        >
          <PenLine size={13} className="text-primary" />
          {t("common.lotUpdate.triggerBtn") || "Cập nhật"}
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-mono text-sm font-bold">
              {t("common.lotUpdate.dialogTitle", { lotId: item.ID_Key }) ||
                `Cập nhật lô ${item.ID_Key}`}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {t("common.lotUpdate.dialogDesc") ||
                "Cập nhật trạng thái luân chuyển và thông số kiểm tra nhiệt luyện lô hàng"}
            </DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-2 gap-2 rounded-xs border border-border bg-muted/40 p-3 text-xs">
            <div>
              <dt className="text-[10px] font-bold text-muted-foreground uppercase">
                {t("common.lotUpdate.itemCode") || "Mã hàng"}
              </dt>
              <dd className="font-mono font-bold text-foreground">{item.ma_hang}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-muted-foreground uppercase">
                {t("common.lotUpdate.orderNo") || "Số đặt hàng"}
              </dt>
              <dd className="font-mono text-foreground">{item.So_DatHang}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-muted-foreground uppercase">
                {t("common.lotUpdate.vendor") || "Đơn vị gia công"}
              </dt>
              <dd className="font-medium text-foreground">
                {formatVendorName(item.cty_QT, role, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold text-muted-foreground uppercase">
                {t("common.lotUpdate.dueDate") || "Hạn trả"}
              </dt>
              <dd className="font-mono tabular-nums text-foreground">
                {item.han_tra
                  ? formatDate(item.han_tra, locale)
                  : t("common.lotUpdate.noDueDate") || "Chưa có"}
              </dd>
            </div>
          </dl>
          <div className="space-y-3 text-sm">
            <label className="block text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("common.lotUpdate.newStatus") || "Trạng thái mới"}
              </span>
              <select
                className={field}
                value={d.status}
                onChange={(e) => set({ status: e.target.value as Status })}
              >
                <option value={item.TrangThai}>
                  {item.TrangThai} {t("common.lotUpdate.keepStatus") || "(giữ nguyên)"}
                </option>
                {moves.map((m) => (
                  <option key={m.to} value={m.to}>
                    {m.to}
                    {m.reason ? t("common.lotUpdate.needReason") || " — cần lý do" : ""}
                  </option>
                ))}
              </select>
            </label>
            {d.status !== item.TrangThai && (
              <p className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-muted-foreground">{item.TrangThai}</span>
                <ArrowRight size={13} />
                <span className="text-primary">{d.status}</span>
              </p>
            )}
            {showDate && (
              <label className="block text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("common.lotUpdate.actualReceiveDate") || "Ngày nhận thực tế"}
                </span>
                <input
                  type="date"
                  className={field}
                  value={d.ngay_nhan}
                  onChange={(e) => set({ ngay_nhan: e.target.value })}
                />
              </label>
            )}
            {showHrc && (
              <label className="block text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("common.lotUpdate.actualHardness") || "Độ cứng thực tế"}
                </span>
                <input
                  className={field}
                  value={d.do_cung}
                  placeholder="58-62 HRC"
                  onChange={(e) => set({ do_cung: e.target.value })}
                />
              </label>
            )}
            {d.status === "Đã nhập kho" && item.TrangThai !== "Đã nhập kho" && (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="rounded-xs accent-primary"
                  checked={d.qcPassed}
                  onChange={(e) => set({ qcPassed: e.target.checked })}
                />
                <span>{t("common.lotUpdate.qcPassConfirm") || "Tôi xác nhận lô đã QC đạt"}</span>
              </label>
            )}
            {needsReason && (
              <label className="block text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("common.lotUpdate.reasonLabel") || "Lý do"}
                </span>
                <textarea
                  className={`${field} h-20 py-2`}
                  value={d.reason}
                  onChange={(e) => set({ reason: e.target.value })}
                  placeholder={
                    t("common.lotUpdate.reasonPlaceholder") ||
                    "VD: Độ cứng không đạt, trả vendor gia công lại"
                  }
                />
              </label>
            )}
            {errs.length > 0 && (
              <ul
                role="alert"
                className="space-y-1 rounded-xs border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
              >
                {errs.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {confirm && (
              <p className="rounded-xs border border-warning/40 bg-warning/10 p-3 text-xs">
                {t("common.lotUpdate.confirmMove", {
                  TrangThai: item.TrangThai,
                  targetStatus: d.status,
                }) || `Xác nhận chuyển ${item.TrangThai} → ${d.status}? Bấm lại để lưu.`}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-8.5 rounded-xs text-xs cursor-pointer"
              onClick={() => setOpen(false)}
            >
              {t("common.lotUpdate.btnCancel") || "Hủy bỏ"}
            </Button>
            <Button
              className="h-8.5 rounded-xs text-xs cursor-pointer"
              disabled={busy}
              onClick={save}
            >
              {busy
                ? t("common.lotUpdate.btnSaving") || "Đang ghi…"
                : confirm
                  ? t("common.lotUpdate.btnConfirm") || "Xác nhận & lưu"
                  : errs.some(
                        (e) =>
                          e.startsWith("Chưa ghi") ||
                          e.includes("Google Sheet") ||
                          e.includes("Googleシート"),
                      )
                    ? t("common.lotUpdate.btnRetry") || "Thử lại"
                    : t("common.lotUpdate.btnSave") || "Lưu & ghi lên Sheet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
