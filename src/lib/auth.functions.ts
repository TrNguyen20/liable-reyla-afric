import { createServerFn } from "@tanstack/react-start";

// Access codes live only on the server; the browser never sees the list.
// Demo environment: codes are hardcoded. Replace with env secrets / DB lookup in production.
const ACCESS_CODES: Record<string, { role: string; note: string }> = {
  "DYNAMO-ADMIN-2026": { role: "admin", note: "Quản lý QT" },
  "DYNAMO-LEADER-2026": { role: "leader", note: "Leader Phân xưởng" },
  "DYNAMO-VIEW-2026": { role: "viewer", note: "Viewer" },
  "DYNAMO-YAMAICHI-2026": { role: "qt_yamaichi", note: "Đối tác YAMAICHI" },
  "DYNAMO-PROVISION-2026": { role: "qt_provision", note: "Đối tác PROVISION" },
};

export const verifyAccessCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const entry = ACCESS_CODES[data.code?.trim() ?? ""];
    if (!entry) return { ok: false as const };
    return { ok: true as const, role: entry.role, note: entry.note };
  });

// Simulated write-back of a lot progress update. In production this would
// push the change to the central sheet / MES; here it always succeeds.
export const updateLotProgress = createServerFn({ method: "POST" })
  .inputValidator((data: {
    ID_Key: string;
    cty_QT?: string;
    code?: string;
    webhook?: string;
    updates?: { TrangThai?: string; do_cung?: string; ngay_nhan_QT?: string };
  }) => data)
  .handler(async ({ data }) => {
    if (!data.ID_Key) return { ok: false as const, error: "Thiếu ID_Key" };
    // Demo: no central sheet is connected, so the write-back is acknowledged
    // and the change is kept locally (audit log records the result).
    return { ok: true as const };
  });
