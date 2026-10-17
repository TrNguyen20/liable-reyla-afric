import { createServerFn } from "@tanstack/react-start";

// Access codes live only on the server; the browser never sees the list.
// Source of truth: AUTH_CONFIG sheet (CSV export). Cached 10 min; the static
// snapshot below is used when the sheet is unreachable.
type Entry = { role: string; note: string };
const AUTH_CSV =
  "https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/export?format=csv&gid=1278143039";
const TTL = 10 * 60 * 1000;

const SNAPSHOT: Record<string, Entry> = {
  "01m4hw6cqjyhzbh4dktdadbnqj": { role: "viewer", note: "Viewer 0" },
  "01m4hw6cqj5fns97b6c11r49v5": { role: "admin", note: "Admin Hệ thống 2" },
  "01m4hw6cqjgxtxy6ccjp4he4qc": { role: "admin", note: "Admin Hệ thống 3" },
  "01m4hw6cqjmcaft6fbx1s009ae": { role: "leader", note: "Trưởng / Phó phòng" },
  "01m4hw6cqjtnygx5bs5edmb6hk": { role: "leader", note: "Trưởng / Phó phòng" },
  "01m4hw6cqjvvgvdfz77064s71c": { role: "leader", note: "Trưởng / Phó phòng" },
  "01m4hw6cqjk6yxsdc4hw36r8re": { role: "leader", note: "Trưởng / Phó phòng" },
  "01m4hw6cqj39r8p302yhgcy7g2": { role: "viewer", note: "Viewer 1" },
  "01m4hw6cqj2gz47ctx7xnn3ae9": { role: "viewer", note: "Viewer 2" },
  "01m4hw6cqjnex657q4jj5dkdxm": { role: "viewer", note: "Viewer 3" },
  "01m4hw6cqj3vkzhf2v7x9eg6dc": { role: "qt_yamaichi", note: "Partner 1" },
  "01m4hw6cqjh95z7jjnad6b59pw": { role: "qt_provision", note: "Partner 2" },
  "01m4hw6cqjvkwrj0ztsbswrktn": { role: "qt_honsato", note: "Partner 3" },
  "01m4hw6cqja9vjmcmjc2szzek6": { role: "qt_setosha", note: "Partner 4" },
};

let cache: { at: number; codes: Record<string, Entry> } | null = null;

async function loadCodes(): Promise<Record<string, Entry>> {
  if (cache && Date.now() - cache.at < TTL) return cache.codes;
  try {
    const res = await fetch(AUTH_CSV);
    if (!res.ok) throw new Error(String(res.status));
    const lines = (await res.text()).replace(/^\uFEFF/, "").split(/\r?\n/).slice(1);
    const codes: Record<string, Entry> = {};
    for (const line of lines) {
      const [role, code, note] = line.split(",").map((s) => s?.trim() ?? "");
      if (role && code) codes[code.toLowerCase()] = { role: role.toLowerCase(), note: note || role };
    }
    if (!Object.keys(codes).length) throw new Error("empty");
    cache = { at: Date.now(), codes };
    return codes;
  } catch {
    return cache?.codes ?? SNAPSHOT;
  }
}

export const verifyAccessCode = createServerFn({ method: "POST" })
  .inputValidator((data: { code: string }) => data)
  .handler(async ({ data }) => {
    const code = (data.code ?? "").trim().toLowerCase();
    if (!code) return { ok: false as const };
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    const { isLocked, recordFail, clearFails } = await import("./data-scope");
    const ip = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "local";
    if (isLocked(ip)) return { ok: false as const, locked: true as const };
    const entry = (await loadCodes())[code];
    if (!entry) { recordFail(ip); return { ok: false as const }; }
    clearFails(ip);
    const { startSession } = await import("./session.server");
    await startSession({ role: entry.role, note: entry.note });
    return { ok: true as const, role: entry.role, note: entry.note };
  });

/** Returns the server-verified session; the browser can never set its own role. */
export const getSessionInfo = createServerFn({ method: "GET" }).handler(async () => {
  const { readSession } = await import("./session.server");
  const s = await readSession();
  return s ? { role: s.role, note: s.note } : null;
});

export const logoutSession = createServerFn({ method: "POST" }).handler(async () => {
  const { endSession } = await import("./session.server");
  endSession();
  return { ok: true as const };
});

// Write-back of a lot progress update. Role comes from the signed session only.
export const updateLotProgress = createServerFn({ method: "POST" })
  .inputValidator((data: {
    ID_Key: string;
    cty_QT?: string;
    webhook?: string;
    updates?: { TrangThai?: string; do_cung?: string; ngay_nhan_QT?: string };
  }) => data)
  .handler(async ({ data }) => {
    const { readSession } = await import("./session.server");
    const s = await readSession();
    if (!s) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn" };
    const role = s.role;
    const vendor = role.startsWith("qt_") ? role.slice(3).toUpperCase() : null;
    const allowed = role === "admin" || role === "leader" || (vendor !== null && String(data.cty_QT ?? "").toUpperCase() === vendor);
    if (!allowed) return { ok: false as const, error: "Vai trò không có quyền cập nhật lô này" };
    if (!data.ID_Key) return { ok: false as const, error: "Thiếu ID_Key" };
    // Demo: no central sheet is connected, so the write-back is acknowledged
    // and the change is kept locally (audit log records the result).
    return { ok: true as const };
  });
