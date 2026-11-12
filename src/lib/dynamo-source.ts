import type { QTItem, Status, Vendor, Workshop } from "@/lib/dynamo-data";

export const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1cC9VnRrjf3IgADbzYL1VulrqgcSf2h56XkXEJILdyuE/edit?gid=1963478526#gid=1963478526";

export function sheetCsvUrl(url: string, bustCache = true) {
  const id = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)?.[1];
  const gid = url.match(/[#&?]gid=([0-9]+)/)?.[1];
  if (!id) return null;
  const base = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv${gid ? `&gid=${gid}` : ""}`;
  return bustCache ? `${base}&_t=${Date.now()}` : base;
}

function parseLine(line: string) {
  const out: string[] = [];
  let part = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        part += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === "," && !quoted) {
      out.push(part.trim());
      part = "";
    } else part += ch;
  }
  out.push(part.trim());
  return out;
}

export function parseCsvRows(text: string) {
  const clean = text.replace(/^\uFEFF/, "");
  const lines: string[] = [];
  let buffer = "";
  let quoted = false;
  for (const raw of clean.split(/\r?\n/)) {
    buffer = buffer ? `${buffer}\n${raw}` : raw;
    const marks = (raw.match(/"/g) ?? []).length;
    if (marks % 2 === 1) quoted = !quoted;
    if (!quoted) {
      if (buffer.trim()) lines.push(buffer);
      buffer = "";
    }
  }
  if (buffer.trim()) lines.push(buffer);
  if (lines.length < 2) return { headers: [] as string[], rows: [] as Record<string, string>[] };
  const headers = parseLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const cells = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ""])) as Record<string, string>;
  });
  return { headers, rows };
}

const num = (value: string | undefined) => {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const toIsoDate = (value: string | undefined) => {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parts = raw.split(/[/ ]/);
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (!month || !day || !year) return "";
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
};

const addDays = (iso: string, days: number) => {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const statusMap: Record<string, Status> = {
  "Đã tạo": "Chờ xuất xưởng",
  "Print PDF": "Đang tại Vendor",
  "Chờ xuất xưởng": "Chờ xuất xưởng",
  "Đang tại Vendor": "Đang tại Vendor",
  "Kiểm tra QC": "Kiểm tra QC",
  "Đã nhập kho": "Đã nhập kho",
};

export type MapResult = {
  items: QTItem[];
  total: number;
  skipped: number;
  duplicates: string[];
  unknownStatus: string[];
  estimatedDue: number;
  badDates: number;
};

export function mapRows(rows: Record<string, string>[]): MapResult {
  const items: QTItem[] = [];
  let skipped = 0;
  let estimatedDue = 0;
  let badDates = 0;
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const unknownStatus: string[] = [];

  for (const r of rows) {
    // Dual-Key Normalization: supports both 36-column new schema and legacy keys
    const id_nhiet_qt = (r["id_nhiet_qt"] ?? r["ID_Key"] ?? "").trim();
    const ID_Key = id_nhiet_qt;
    const ma_hang = (r["ma_hang"] ?? "").trim();
    const so_dat_hang =
      (r["so_dat_hang"] ?? r["So_DatHang"] ?? "").trim() || "CHƯA_CÓ_PO";
    const So_DatHang = so_dat_hang;

    if (!id_nhiet_qt || !ma_hang) {
      skipped++;
      continue;
    }
    if (seen.has(id_nhiet_qt)) {
      duplicates.push(id_nhiet_qt);
      continue;
    }
    seen.add(id_nhiet_qt);

    const id_ma_hang = (r["id_ma_hang"] ?? "").trim() || undefined;
    const ngay_tao = (r["ngay_tao"] ?? "").trim() || undefined;
    const nguoi_tao = num(r["nguoi_tao"]) || undefined;
    const quoc_gia = (r["quoc_gia"] ?? "").trim() || "Vietnam";
    const phong_sx = ((r["phong_sx"] ?? "").trim().toUpperCase() || "PIN") as Workshop;
    const doi_tuong_hang =
      (r["doi_tuong_hang"] ?? "").trim() || (phong_sx === "MOLD" ? "Khuôn" : "Linh kiện khuôn");

    const ngay_gui_qt = toIsoDate(r["ngay_gui_qt"] ?? r["ngay_gui_QT"]) || toIsoDate(r["ngay_tao"]);
    const ngay_gui_QT = ngay_gui_qt;

    const so_luong = num(r["so_luong"]);
    const vat_lieu = (r["vat_lieu"] ?? "").trim() || "Chưa rõ";
    const do_cung = (r["do_cung"] ?? "").trim() || "—";
    const kich_thuoc_sp = (r["kich_thuoc_sp"] ?? r["Kich_Thuoc_SP"] ?? "").trim() || "—";
    const Kich_Thuoc_SP = kich_thuoc_sp;
    const kg_lot = num(r["kg_lot"] ?? r["kg_Lot"]);
    const kg_Lot = kg_lot;
    const don_vi_tinh = (r["don_vi_tinh"] ?? "").trim().toLowerCase() === "kg" ? "Kg" : "pcs";
    const so_luong_tinh = num(r["so_luong_tinh"]) || (don_vi_tinh === "Kg" ? kg_lot : so_luong);
    const don_gia = num(r["don_gia"]);
    const thanh_tien =
      num(r["thanh_tien"]) ||
      Math.round((so_luong_tinh || (don_vi_tinh === "Kg" ? kg_lot : so_luong)) * don_gia);
    const ty_gia = num(r["ty_gia"]) || 1;

    const ghi_chu_khi_gui =
      (
        r["ghi_chu_khi_gui"] ??
        r["ghi_chu"] ??
        r["Ghi_chu"] ??
        r["Ghi chú"] ??
        r["GHI_CHU"] ??
        r["note"] ??
        r["Note"] ??
        ""
      ).trim() || undefined;
    const ghi_chu = ghi_chu_khi_gui;

    const cty_qt = ((r["cty_qt"] ?? r["cty_QT"] ?? "").trim().toUpperCase() ||
      "YAMAICHI") as Vendor;
    const cty_QT = cty_qt;

    const trang_thai = (r["trang_thai"] ?? r["TrangThai"] ?? "").trim();
    const TrangThai: Status = statusMap[trang_thai] ?? "Đang tại Vendor";
    if (trang_thai && !statusMap[trang_thai]) unknownStatus.push(`${id_nhiet_qt}: "${trang_thai}"`);

    const ten_file_dat_hang = (r["ten_file_dat_hang"] ?? "").trim() || undefined;

    // 12 Vendor feedback fields (ncc_*)
    const ncc_ngay_qt = toIsoDate(r["ncc_ngay_qt"]) || undefined;
    const ncc_ngay_tra_qt = toIsoDate(r["ncc_ngay_tra_qt"]) || undefined;
    const ncc_id_lot_qt = (r["ncc_id_lot_qt"] ?? "").trim() || undefined;
    const ncc_name_qt = (r["ncc_name_qt"] ?? "").trim() || undefined;
    const ncc_giando = (r["ncc_giando"] ?? "").trim() || undefined;
    const ncc_ket_qua_hrc = (r["ncc_ket_qua_hrc"] ?? "").trim() || undefined;
    const ncc_ket_qua_qc = (r["ncc_ket_qua_qc"] ?? "").trim() || undefined;
    const ncc_don_gia = num(r["ncc_don_gia"]) || undefined;
    const ncc_tatus = (r["ncc_tatus"] ?? "").trim() || undefined;
    const ncc_thongtinkhac1 = (r["ncc_thongtinkhac1"] ?? "").trim() || undefined;
    const ncc_thongtinkhac2 = (r["ncc_thongtinkhac2"] ?? "").trim() || undefined;
    const ncc_file1 = (r["ncc_file1"] ?? "").trim() || undefined;

    // Return due date & validation
    const srcDue = ncc_ngay_tra_qt || toIsoDate(r["han_tra"]);
    const han_tra = srcDue || addDays(ngay_gui_qt, 7);
    const han_tra_est = !srcDue;
    if (!srcDue) estimatedDue++;

    const ngay_nhan = toIsoDate(r["ncc_ngay_tra_qt"] ?? r["ngay_nhan_QT"]);
    if (
      ((r["ngay_gui_qt"] ?? r["ngay_gui_QT"]) &&
        !toIsoDate(r["ngay_gui_qt"] ?? r["ngay_gui_QT"])) ||
      ((r["ncc_ngay_tra_qt"] ?? r["ngay_nhan_QT"]) && !ngay_nhan)
    )
      badDates++;

    items.push({
      id_nhiet_qt,
      ID_Key,
      id_ma_hang,
      ma_hang,
      so_dat_hang,
      So_DatHang,
      ten_file_dat_hang,
      ngay_tao,
      nguoi_tao,
      quoc_gia,
      phong_sx,
      doi_tuong_hang,
      so_luong,
      vat_lieu,
      do_cung,
      kich_thuoc_sp,
      Kich_Thuoc_SP,
      kg_lot,
      kg_Lot,
      don_vi_tinh,
      so_luong_tinh,
      don_gia,
      thanh_tien,
      ty_gia,
      ngay_gui_qt,
      ngay_gui_QT,
      ghi_chu_khi_gui,
      ghi_chu,
      cty_qt,
      cty_QT,
      trang_thai,
      TrangThai,
      han_tra,
      han_tra_est,
      ngay_nhan: ngay_nhan || undefined,
      cong_doan: (r["loai_hang"] ?? "").trim() || "Nhiệt luyện",
      ncc_ngay_qt,
      ncc_ngay_tra_qt,
      ncc_id_lot_qt,
      ncc_name_qt,
      ncc_giando,
      ncc_ket_qua_hrc,
      ncc_ket_qua_qc,
      ncc_don_gia,
      ncc_tatus,
      ncc_thongtinkhac1,
      ncc_thongtinkhac2,
      ncc_file1,
    });
  }

  return { items, total: rows.length, skipped, duplicates, unknownStatus, estimatedDue, badDates };
}

export async function fetchSheetItems(url: string): Promise<MapResult> {
  const csv = sheetCsvUrl(url, true);
  if (!csv) throw new Error("Link không hợp lệ. Hãy dán link chia sẻ Google Sheets.");
  const fetchOpts: RequestInit = {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    },
  };
  let res = await fetch(csv, fetchOpts);
  if (!res.ok)
    res = await fetch(csv.replace("/export?format=csv", "/gviz/tq?tqx=out:csv"), fetchOpts);
  if (!res.ok) throw new Error(`Google trả về mã ${res.status}`);
  const text = await res.text();
  if (text.trim().startsWith("<"))
    throw new Error('Tệp chưa được chia sẻ công khai ("Anyone with the link").');
  const { rows } = parseCsvRows(text);
  const mapped = mapRows(rows);
  if (!mapped.items.length) throw new Error("Không tìm thấy dòng dữ liệu hợp lệ trong bảng tính.");
  return mapped;
}

const DB = "dynamo-qt";
const STORE = "dataset";

function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type CachedDataset = { items: QTItem[]; label: string; syncedAt: string };

export async function saveDataset(value: CachedDataset) {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* cache is best effort */
  }
}

export async function loadDataset(): Promise<CachedDataset | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
  try {
    const db = await openDb();
    const value = await new Promise<CachedDataset | null>((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get("current");
      req.onsuccess = () => resolve((req.result as CachedDataset) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return value;
  } catch {
    return null;
  }
}

export async function clearDataset() {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return;
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete("current");
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    /* ignore */
  }
}
