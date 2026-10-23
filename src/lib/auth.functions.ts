import { createServerFn } from "@tanstack/react-start";

// Access codes live only on the server; the browser never sees the list.
// Source of truth: AUTH_CONFIG sheet (CSV export). Cached 10 min; the static
// snapshot below is used when the sheet is unreachable.
type Entry = { role: string; note: string };
const AUTH_CSV =
  "https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/export?format=csv&gid=1278143039";
const TTL = 10 * 60 * 1000;

const SNAPSHOT: Record<string, Entry> = {
  "01m4hw6cqjyhzbh4dktdadbnqj": { role: "admin", note: "Admin Hệ thống 1" },
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
    const { lockRemainingMs, recordFail, clearFails } = await import("./data-scope");
    let ip = "local";
    try {
      ip = getRequestHeader("cf-connecting-ip") || getRequestHeader("x-forwarded-for") || "local";
    } catch {
      ip = "local";
    }
    const rem = lockRemainingMs(ip);
    if (rem > 0) return { ok: false as const, locked: true as const, remainingMs: rem };
    const entry = (await loadCodes())[code];
    if (!entry) {
      const left = recordFail(ip);
      if (left === 0) return { ok: false as const, locked: true as const, remainingMs: lockRemainingMs(ip) };
      return { ok: false as const, attemptsLeft: left };
    }
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

// Truy xuất Webhook URL tập trung từ server
export const fetchCentralWebhookConfig = createServerFn({ method: "GET" }).handler(async () => {
  const { getCentralWebhookUrl } = await import("./config.server");
  const url = await getCentralWebhookUrl();
  return { ok: true as const, url };
});

// Lưu Webhook URL tập trung lên server (chỉ dành cho Admin)
export const saveCentralWebhookConfig = createServerFn({ method: "POST" })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }) => {
    const { readSession } = await import("./session.server");
    const s = await readSession();
    if (!s) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn" };
    if (s.role !== "admin") {
      return { ok: false as const, error: "Chỉ Quản trị viên (Admin) mới có quyền lưu cấu hình Webhook hệ thống" };
    }
    const { saveCentralWebhookUrl } = await import("./config.server");
    await saveCentralWebhookUrl(data.url, s.role);
    return { ok: true as const };
  });

// Ghi ngược tiến độ lô hàng. Tự động lấy Webhook URL tập trung từ server nếu client không truyền
export const updateLotProgress = createServerFn({ method: "POST" })
  .inputValidator((data: {
    ID_Key: string;
    cty_QT?: string;
    webhook?: string;
    updates?: Record<string, any>;
  }) => data)
  .handler(async ({ data }) => {
    const { readSession } = await import("./session.server");
    const s = await readSession();
    if (!s) return { ok: false as const, error: "Phiên đăng nhập đã hết hạn" };
    const role = s.role;
    
    // Phân quyền mở: Mọi vai trò đã xác thực phiên (Admin, Leader, Viewer, Vendor) đều được cập nhật tiến độ
    if (!data.ID_Key) return { ok: false as const, error: "Thiếu ID_Key" };

    // Tự động sử dụng Webhook tập trung từ Server nếu Client không truyền
    let targetWebhook = (data.webhook ?? "").trim();
    if (!targetWebhook) {
      const { getCentralWebhookUrl } = await import("./config.server");
      targetWebhook = await getCentralWebhookUrl();
    }

    if (targetWebhook) {
      try {
        const payload = {
          action: "updateLot",
          ID_Key: data.ID_Key,
          cty_QT: data.cty_QT,
          updates: data.updates || {},
          user: role,
          timestamp: new Date().toISOString(),
        };
        const res = await fetch(targetWebhook, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          redirect: "follow",
        });
        if (!res.ok) {
          return { ok: false as const, error: `Apps Script trả về HTTP ${res.status}` };
        }
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json && json.ok === false) {
            return { ok: false as const, error: json.error || json.message || "Google Apps Script từ chối cập nhật" };
          }
        } catch {
          // Phản hồi không phải JSON nhưng status 200 OK
        }
      } catch (err: any) {
        return { ok: false as const, error: `Không thể kết nối Webhook Apps Script: ${err.message}` };
      }
    }

    return { ok: true as const };
  });
