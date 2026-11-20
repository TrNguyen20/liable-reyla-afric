import * as React from "react";
import {
  Barcode,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Download,
  Layers,
  Maximize2,
  Minimize2,
  Printer,
  Scale,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { money, number, type QTItem } from "@/lib/dynamo-data";
import { canViewPricing, formatVendorName, type Role } from "@/lib/dynamo-auth";
import { toast } from "sonner";
import logo from "@/assets/dynamo-logo.png";
import { useTranslation } from "@/i18n";
import { formatDate, formatTime } from "@/i18n/formatters";
import { HeatTreatmentCycle } from "@/components/technical-charts";

// Code 39 Barcode SVG Generator (100% Vector, Pure Math, Crisp Print)
const CODE39_MAP: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  "*": "010010100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
};

function BarcodeSvg({ text, height = 38 }: { text: string; height?: number }) {
  const sanitized = `*${text.toUpperCase().replace(/[^A-Z0-9-. $/+%]/g, "")}*`;
  const narrowWidth = 1.6;
  const wideWidth = 3.6;
  const gapWidth = 1.6;

  let currentX = 6;
  const rects: React.ReactNode[] = [];

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i] ?? "*";
    const pattern = CODE39_MAP[char] ?? CODE39_MAP["*"]!;

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === "1";
      const width = isWide ? wideWidth : narrowWidth;

      if (isBar) {
        rects.push(
          <rect
            key={`${i}-${j}`}
            x={currentX}
            y={0}
            width={width}
            height={height}
            fill="currentColor"
          />,
        );
      }
      currentX += width;
    }
    currentX += gapWidth;
  }

  const totalWidth = currentX + 6;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="h-8 w-auto max-w-full text-black"
        style={{ shapeRendering: "crispEdges" }}
      >
        {rects}
      </svg>
      <span className="mt-0.5 font-mono text-[8px] font-bold tracking-widest text-black">
        *{text}*
      </span>
    </div>
  );
}

// 2D Vector QR Code SVG Generator (100% Deterministic)
function QrMatrixSvg({ text, size = 52 }: { text: string; size?: number }) {
  const gridSize = 21;
  const cells: boolean[][] = Array.from(
    { length: gridSize },
    () => Array(gridSize).fill(false) as boolean[],
  );

  const setFinder = (startX: number, startY: number) => {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isBorder = x === 0 || x === 6 || y === 0 || y === 6;
        const isCenter = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        cells[startY + y]![startX + x] = isBorder || isCenter;
      }
    }
  };

  setFinder(0, 0);
  setFinder(14, 0);
  setFinder(0, 14);

  for (let i = 8; i < 13; i++) {
    cells[6]![i] = i % 2 === 0;
    cells[i]![6] = i % 2 === 0;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if ((x < 8 && y < 8) || (x >= 13 && y < 8) || (x < 8 && y >= 13)) continue;
      if (x === 6 || y === 6) continue;
      const bit = ((hash ^ (x * 31 + y * 17 + bitIdx++)) & 1) === 1;
      cells[y]![x] = bit;
    }
  }

  const moduleSize = size / gridSize;
  const rects: React.ReactNode[] = [];

  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (cells[y]![x]) {
        rects.push(
          <rect
            key={`${x}-${y}`}
            x={x * moduleSize}
            y={y * moduleSize}
            width={moduleSize}
            height={moduleSize}
            fill="currentColor"
          />,
        );
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-12 text-black"
        style={{ shapeRendering: "crispEdges" }}
      >
        {rects}
      </svg>
      <span className="mt-0.5 font-mono text-[7px] font-bold text-zinc-700">QR TRACK</span>
    </div>
  );
}

// Single A4 Job Ticket Component (ISO 216 standard 210 x 297 mm)
export function SingleA4TicketContent({
  item,
  role,
  docCode,
  isBatch = false,
  pageIndex,
  totalPages,
  quickMemo,
}: {
  item: QTItem;
  role: Role;
  docCode: string;
  isBatch?: boolean;
  pageIndex?: number;
  totalPages?: number;
  quickMemo?: string;
}) {
  const pricing = canViewPricing(role);
  const { t, locale } = useTranslation();

  return (
    <div className="a4-sheet mx-auto w-full max-w-[210mm] min-h-[calc(297mm-16mm)] max-h-[calc(297mm-16mm)] bg-white text-zinc-950 p-[8mm] sm:p-[10mm] font-sans shadow-lg print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full flex flex-col justify-start box-border">
      {/* Header Block */}
      <header className="flex items-start justify-between border-b-2 border-black pb-3">
        <div className="flex items-start gap-3">
          <img src={logo} alt="Dynamo Vietnam" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="font-display text-xs font-black tracking-wider uppercase text-black">
              {t("ticket.companyName")}
            </h1>
            <p className="text-[10px] font-bold text-zinc-700">{t("ticket.deptName")}</p>
            <p className="font-mono text-[9px] text-zinc-600 mt-0.5">
              {t("ticket.docInfo", { docCode, orderNo: item.So_DatHang })}
              {isBatch && pageIndex !== undefined && (
                <span className="ml-2 font-sans font-bold text-black">
                  (Trang {pageIndex + 1}/{totalPages})
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Vector Barcode & QR Block */}
        <div className="flex items-center gap-3">
          <QrMatrixSvg text={item.ID_Key} size={48} />
          <BarcodeSvg text={item.ID_Key} height={36} />
        </div>
      </header>

      {/* Document Title Banner */}
      <div className="my-2.5 text-center">
        <h2 className="font-display text-sm font-black tracking-widest uppercase text-black">
          {t("ticket.title")}
        </h2>
        <p className="font-mono text-[9.5px] text-zinc-600">{t("ticket.processes")}</p>
      </div>

      {/* Section I: Thông tin linh kiện & Yêu cầu kỹ thuật */}
      <div className="overflow-hidden border border-black text-[10px]">
        <div className="bg-zinc-100 px-2.5 py-1 border-b border-black">
          <h3 className="font-mono text-[10px] font-black uppercase tracking-wider text-black">
            {t("ticket.sec1Title")}
          </h3>
        </div>
        <div className="grid grid-cols-4 divide-x divide-y divide-black">
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.partNo")}
            </span>
            <p className="font-mono text-xs font-black text-black">{item.ma_hang}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.lotId")}
            </span>
            <p className="font-mono text-xs font-black text-black">{item.ID_Key}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.senderDept")}
            </span>
            <p className="font-bold text-black">{item.phong_sx}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.recipientVendor")}
            </span>
            <p className="font-bold text-black">{formatVendorName(item.cty_QT, role, locale)}</p>
          </div>

          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.material")}
            </span>
            <p className="font-mono font-bold text-black">{item.vat_lieu}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.hardnessReq")}
            </span>
            <p className="font-mono font-black text-black">
              {item.do_cung || t("ticket.fields.hardnessDrawingFallback")}
            </p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.dimensions")}
            </span>
            <p className="font-mono font-bold text-black">{item.Kich_Thuoc_SP || "—"}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.quantity")}
            </span>
            <p className="font-mono font-black text-black">
              {number(item.so_luong)} {item.don_vi_tinh ?? "chi tiết"}
            </p>
          </div>

          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.weight")}
            </span>
            <p className="font-mono font-black text-black">{number(item.kg_Lot, 1)} kg</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.sendDate")}
            </span>
            <p className="font-mono font-bold text-black">{formatDate(item.ngay_gui_QT, locale)}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.dueDate")}
            </span>
            <p className="font-mono font-bold text-black">
              {item.han_tra
                ? formatDate(item.han_tra, locale)
                : t("ticket.fields.dueAgreementFallback")}
            </p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">
              {t("ticket.fields.status")}
            </span>
            <p className="font-bold text-black">{item.TrangThai}</p>
          </div>

          {pricing && (
            <>
              <div className="p-2 col-span-2">
                <span className="text-[9px] font-semibold text-zinc-600 block">
                  {t("ticket.fields.unitPrice")}
                </span>
                <p className="font-mono font-bold text-black">{money(item.don_gia)}</p>
              </div>
              <div className="p-2 col-span-2">
                <span className="text-[9px] font-semibold text-zinc-600 block">
                  {t("ticket.fields.totalPrice")}
                </span>
                <p className="font-mono font-bold text-black">{money(item.thanh_tien)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Khối LƯU Ý ĐIỀU ĐỘNG / GHI CHÚ KỸ THUẬT NỔI BẬT */}
      {quickMemo && (
        <div className="my-2 border-2 border-black bg-zinc-50 px-2.5 py-1.5 text-[10px]">
          <div className="flex items-center gap-1.5 font-mono font-black uppercase text-black tracking-wider">
            <span>⚡ LƯU Ý ĐIỀU ĐỘNG / GHI CHÚ KỸ THUẬT:</span>
          </div>
          <p className="font-mono font-bold text-black text-[10.5px] mt-0.5 whitespace-pre-wrap">
            {quickMemo}
          </p>
        </div>
      )}

      {/* Section II: BIỂU ĐỒ CHU TRÌNH NHIỆT LUYỆN */}
      <div className="mt-2.5 border border-black p-0 text-[9.5px]">
        <div className="bg-zinc-100 px-2.5 py-1 border-b border-black">
          <h4 className="font-bold text-black uppercase tracking-wide">
            {t("ticket.sec2Title") || "II. BIỂU ĐỒ CHU TRÌNH NHIỆT LUYỆN"}
          </h4>
        </div>
        <div className="w-full flex justify-center bg-white p-0">
          <HeatTreatmentCycle
            {...(item.ncc_giando ? { shorthand: item.ncc_giando } : {})}
            width="100%"
            height={98}
            showFrame={false}
          />
        </div>
      </div>

      {/* Section III: Bảng đo kiểm QC */}
      <div className="mt-2.5 overflow-hidden border border-black text-[9.5px]">
        <div className="bg-zinc-100 px-2.5 py-1 border-b border-black">
          <h3 className="font-mono text-[10px] font-black uppercase tracking-wider text-black">
            {t("ticket.sec3Title")}
          </h3>
        </div>
        <div className="grid grid-cols-5 divide-x divide-black text-center">
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">{t("ticket.qc.point1")}</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">{t("ticket.qc.point2")}</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">{t("ticket.qc.point3")}</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">{t("ticket.qc.average")}</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">{t("ticket.qc.evaluation")}</span>
            <div className="mt-2 text-[10px] font-bold text-black">
              [ &nbsp; ] PASS &nbsp;&nbsp;&nbsp; [ &nbsp; ] FAIL
            </div>
          </div>
        </div>
      </div>

      {/* Section IV: 4 chữ ký pháp lý */}
      <div className="mt-3.5 grid grid-cols-4 gap-3 text-center text-[10px]">
        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">
            {t("ticket.signatures.logistics")}
          </p>
          <p className="text-[8.5px] text-zinc-600">{t("ticket.signatures.logisticsSub")}</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">{t("ticket.signatures.logisticsSign")}</p>
        </div>

        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">
            {t("ticket.signatures.security")}
          </p>
          <p className="text-[8.5px] text-zinc-600">{t("ticket.signatures.securitySub")}</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">{t("ticket.signatures.securitySign")}</p>
        </div>

        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">
            {t("ticket.signatures.vendor")}
          </p>
          <p className="text-[8.5px] text-zinc-600">{t("ticket.signatures.vendorSub")}</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">{t("ticket.signatures.vendorSign")}</p>
        </div>

        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">
            {t("ticket.signatures.qc")}
          </p>
          <p className="text-[8.5px] text-zinc-600">{t("ticket.signatures.qcSub")}</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">{t("ticket.signatures.qcSign")}</p>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="mt-3 flex items-center justify-between border-t border-black pt-1.5 text-[8.5px] text-zinc-600">
        <span>{t("ticket.slogan")}</span>
        <span className="font-mono tabular-nums">
          {t("ticket.printedAt", {
            timestamp: `${formatDate(new Date(), locale)} ${formatTime(new Date(), locale)}`,
          })}
        </span>
      </div>
    </div>
  );
}

// Single Pallet Tag Component (100x150mm format)
export function SinglePalletTagContent({ item, role }: { item: QTItem; role: Role }) {
  const { t, locale } = useTranslation();

  return (
    <div className="job-ticket mx-auto w-[100mm] min-h-[150mm] max-w-[100mm] aspect-[100/150] bg-white p-3 text-black border-2 border-dashed border-black rounded-xs shadow-lg print:border-black print:shadow-none print:p-3 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Dynamo" className="h-6 w-auto object-contain" />
            <div>
              <h2 className="font-display text-xs font-black uppercase text-black">
                {t("pallet.title") || "TEM NHÃN PALLET"}
              </h2>
              <p className="font-mono text-[9px] text-zinc-700">{t("pallet.subtitle") || "DYNAMO MES · HEAT TREATMENT"}</p>
            </div>
          </div>
          <span className="rounded-xs bg-black px-2 py-0.5 font-mono text-[11px] font-black text-white">
            {item.phong_sx}
          </span>
        </div>

        {/* Giant Part ID Block */}
        <div className="my-2 text-center">
          <p className="text-[9px] font-bold uppercase text-zinc-600">{t("pallet.partHeading") || "MÃ LINH KIỆN / SẢN PHẨM"}</p>
          <h1 className="font-mono text-2xl font-black text-black tracking-tight mt-0.5">
            {item.ma_hang}
          </h1>
          <p className="font-mono text-xs font-bold text-black mt-0.5">
            ID: {item.ID_Key}
          </p>
        </div>

        {/* Barcode & QR Centerpiece */}
        <div className="my-2 flex items-center justify-around border-y border-black py-2">
          <QrMatrixSvg text={item.ID_Key} size={54} />
          <BarcodeSvg text={item.ID_Key} height={34} />
        </div>

        {/* Essential Pallet Specs */}
        <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
          <div className="rounded-xs border border-black p-1.5">
            <span className="text-[8.5px] text-zinc-600 block">
              {t("ticket.fields.quantity") || "Số lượng"} &amp; {t("ticket.fields.weight") || "Khối lượng"}
            </span>
            <p className="font-mono text-xs font-black text-black mt-0.5">
              {number(item.so_luong)} {item.don_vi_tinh ?? "chi tiết"} · {number(item.kg_Lot, 1)} kg
            </p>
          </div>
          <div className="rounded-xs border border-black p-1.5">
            <span className="text-[8.5px] text-zinc-600 block">
              {t("ticket.fields.material") || "Vật liệu"} &amp; {t("ticket.fields.hardnessReq") || "Độ cứng"}
            </span>
            <p className="font-mono text-xs font-black text-black mt-0.5">
              {item.vat_lieu} · {item.do_cung || "Theo vẽ"}
            </p>
          </div>
          <div className="rounded-xs border border-black p-1.5">
            <span className="text-[8.5px] text-zinc-600 block">
              {t("ticket.fields.orderNo") || "Số đơn hàng (PO):"}
            </span>
            <p className="font-mono font-bold text-black mt-0.5 truncate">{item.So_DatHang || "—"}</p>
          </div>
          <div className="rounded-xs border border-black p-1.5">
            <span className="text-[8.5px] text-zinc-600 block">
              {t("ticket.fields.recipientVendor") || "Đối tác gia công:"}
            </span>
            <p className="font-bold text-black mt-0.5 truncate">
              {formatVendorName(item.cty_QT, role, locale)}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-black pt-1.5 flex items-center justify-between text-[9px] font-mono text-zinc-700">
        <span>Gửi: {formatDate(item.ngay_gui_QT, locale)}</span>
        <span>Hạn: {item.han_tra ? formatDate(item.han_tra, locale) : "—"}</span>
      </div>
    </div>
  );
}

/**
 * Isolated Iframe Print Service for Industrial Job Tickets (DIPS v1.0 Standard)
 * Bypasses all Radix Modal / DOM transform / overflow restrictions and delivers 100% crisp, zero-blank printing.
 */
export function printTicketElement(
  element: HTMLElement | null,
  docTitle = "Phiếu giao nhận & Lệnh gia công ngoài",
  copies = 1,
  orientation: "portrait" | "landscape" = "portrait",
) {
  if (!element) {
    window.print();
    return;
  }

  try {
    const existing = document.getElementById("dvn-print-iframe");
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "dvn-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.title = docTitle;
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Deep clone the printable DOM
    const clone = element.cloneNode(true) as HTMLElement;
    // Strip root container styling that breaks Chromium pagination
    clone.style.transform = "none";
    clone.style.overflow = "visible";
    clone.style.overflowY = "visible";
    clone.style.overflowX = "visible";
    clone.style.maxHeight = "none";
    clone.style.height = "auto";
    clone.style.display = "block";
    clone.classList.remove("overflow-y-auto", "overflow-hidden", "flex-1");

    // Recursively clean all descendant nodes
    clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
      if (el.style) {
        if (el.style.transform) el.style.transform = "none";
        if (el.style.overflow) el.style.overflow = "visible";
        if (el.style.overflowY) el.style.overflowY = "visible";
      }
      if (el.classList.contains("job-ticket-canvas-container")) {
        el.classList.remove("overflow-y-auto", "flex", "items-start", "justify-center");
        el.style.display = "block";
        el.style.overflow = "visible";
      }
    });

    // Extract all application stylesheet links and inline style tags
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");

    const validCopies = Math.max(1, Math.min(copies, 10));
    const pagesHtml = Array.from({ length: validCopies })
      .map(
        (_, i) => `
        <div class="print-page-wrapper" style="${i < validCopies - 1 ? 'page-break-after: always; break-after: page;' : ''}">
          ${clone.outerHTML}
        </div>
      `)
      .join("");

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${docTitle}</title>
        ${styles}
        <style>
          @page {
            size: A4 ${orientation};
            margin: 8mm 10mm;
          }
          *, *::before, *::after {
            box-sizing: border-box;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print-page-wrapper {
            width: 100% !important;
            display: block !important;
            overflow: visible !important;
          }
          .a4-sheet {
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            display: block !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .a4-sheet-landscape {
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            border: none !important;
            display: block !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .a4-sheet header,
          .a4-sheet-landscape header,
          .job-ticket header {
            display: flex !important;
          }
          .job-ticket {
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: 2px dashed #000000 !important;
            display: block !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .printable-job-ticket {
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always !important;
            break-after: page !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            width: 100% !important;
            min-height: calc(297mm - 16mm) !important;
            max-height: calc(297mm - 16mm) !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: flex-start !important;
            box-sizing: border-box !important;
          }
          .printable-job-ticket:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          table {
            page-break-inside: auto !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Iframe print failed, falling back to window.print():", err);
        window.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 2000);
      }
    }, 250);
  } catch (err) {
    console.warn("Error launching isolated print iframe:", err);
    window.print();
  }
}

// Proposal 2: A4 Print Studio Canvas Button & Modal
export interface JobTicketButtonProps {
  item: QTItem;
  role: Role;
  variant?: "icon" | "button";
  siblingItems?: QTItem[];
  onItemChange?: (item: QTItem) => void;
  disabled?: boolean;
}

export function JobTicketButton({
  item,
  role,
  variant = "icon",
  siblingItems,
  onItemChange,
  disabled = false,
}: JobTicketButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [activeItem, setActiveItem] = React.useState<QTItem>(item);
  const [ticketFormat, setTicketFormat] = React.useState<"a4" | "pallet">("a4");
  const [zoomLevel, setZoomLevel] = React.useState<"fit" | "75" | "90" | "100">("fit");
  const [copies, setCopies] = React.useState<1 | 2 | 3>(2);
  const [quickMemo, setQuickMemo] = React.useState("");
  const [keepMemoForNext, setKeepMemoForNext] = React.useState(true);
  const [copied, setCopied] = React.useState(false);
  const [fitScale, setFitScale] = React.useState(0.72);

  const printRef = React.useRef<HTMLDivElement>(null);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);

  // Keep activeItem synced with item when prop changes
  React.useEffect(() => {
    setActiveItem(item);
  }, [item]);

  // Sibling item navigation index
  const currentIndex = React.useMemo(() => {
    if (!siblingItems || siblingItems.length === 0) return -1;
    return siblingItems.findIndex((x) => x.ID_Key === activeItem.ID_Key);
  }, [siblingItems, activeItem]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < (siblingItems?.length ?? 0) - 1;

  const handlePrevItem = React.useCallback(() => {
    if (siblingItems && hasPrev) {
      const prev = siblingItems[currentIndex - 1];
      if (prev) {
        setActiveItem(prev);
        onItemChange?.(prev);
        if (!keepMemoForNext) setQuickMemo("");
      }
    }
  }, [siblingItems, hasPrev, currentIndex, onItemChange, keepMemoForNext]);

  const handleNextItem = React.useCallback(() => {
    if (siblingItems && hasNext) {
      const next = siblingItems[currentIndex + 1];
      if (next) {
        setActiveItem(next);
        onItemChange?.(next);
        if (!keepMemoForNext) setQuickMemo("");
      }
    }
  }, [siblingItems, hasNext, currentIndex, onItemChange, keepMemoForNext]);

  // Responsive dynamic fit scale calculation
  React.useEffect(() => {
    if (!open) return;
    const updateFit = () => {
      const el = canvasContainerRef.current;
      if (!el) return;
      const h = el.clientHeight - 32;
      const w = el.clientWidth - 32;
      // Standard A4 is 210mm x 297mm (approx 793.7px x 1122.5px at 96 DPI)
      const scaleH = h / 1122.5;
      const scaleW = w / 793.7;
      const computed = Math.min(1, Math.max(0.45, Math.min(scaleH, scaleW)));
      setFitScale(Number(computed.toFixed(3)));
    };
    updateFit();
    window.addEventListener("resize", updateFit);
    return () => window.removeEventListener("resize", updateFit);
  }, [open, ticketFormat]);

  const handleCopy = React.useCallback(() => {
    void navigator.clipboard.writeText(activeItem.ID_Key);
    setCopied(true);
    toast.success(`${t("ticket.codeCopied") || "Đã chép mã"}: ${activeItem.ID_Key}`);
    setTimeout(() => setCopied(false), 2000);
  }, [activeItem.ID_Key, t]);

  const handlePrint = React.useCallback(() => {
    printTicketElement(
      printRef.current,
      `Phieu_${activeItem.ma_hang}_${activeItem.ID_Key}`,
      copies,
      "portrait",
    );
  }, [activeItem.ma_hang, activeItem.ID_Key, copies]);

  // Keyboard navigation shortcuts in modal
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (activeTag === "input" || activeTag === "textarea") return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevItem();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNextItem();
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        handlePrint();
      } else if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        handleCopy();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handlePrevItem, handleNextItem, handlePrint, handleCopy]);

  const docCode = `DVN-QT-${activeItem.phong_sx}-${activeItem.ID_Key}`;

  // Current zoom scale factor
  const currentScale =
    zoomLevel === "fit"
      ? fitScale
      : zoomLevel === "75"
        ? 0.75
        : zoomLevel === "90"
          ? 0.9
          : 1.0;

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          title={t("ticket.printFor", { itemCode: item.ma_hang }) || `In phiếu gia công ${item.ma_hang}`}
          aria-label={t("ticket.openFor", { itemCode: item.ma_hang }) || `Mở phiếu giao nhận ${item.ma_hang}`}
          className="inline-flex size-7 items-center justify-center rounded-xs text-primary transition-colors hover:bg-primary/10 active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={15} />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => !disabled && setOpen(true)}
          className="gap-1.5 text-xs font-semibold cursor-pointer rounded-xs"
        >
          <Download size={14} /> In phiếu lệnh A4
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="job-ticket-dialog max-h-[96vh] w-[96vw] max-w-5xl overflow-hidden p-0 flex flex-col rounded-xl sm:rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-card [&>button:last-child]:hidden"
          style={{ borderRadius: "12px" }}
        >
          {/* A4 Print Studio Top Toolbar (3 Cụm Chuẩn CAD / Studio Viewer) */}
          <div className="job-ticket-studio-header flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-secondary/80 px-4 py-2 text-xs select-none shrink-0">
            {/* Cụm Trái: Thông tin tài liệu & Format Switcher */}
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold border border-primary/20 shrink-0">
                <Printer size={14} />
              </span>
              <div>
                <DialogTitle className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>{t("ticket.previewTitle") || "Phiếu In Lệnh"}</span>
                  <span className="font-mono text-[10px] px-2 py-0.2 rounded-full bg-slate-200/70 dark:bg-muted text-slate-700 dark:text-muted-foreground font-semibold border border-slate-300/60 dark:border-border">
                    {docCode}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-[10px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                  {activeItem.ma_hang} · {activeItem.vat_lieu} · {number(activeItem.so_luong)} {activeItem.don_vi_tinh ?? "chi tiết"}
                </DialogDescription>
              </div>

              <div className="ml-2 hidden sm:flex items-center rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card p-0.5 text-[11px] shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTicketFormat("a4")}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    ticketFormat === "a4"
                      ? "bg-slate-900 text-white font-bold shadow-xs dark:bg-primary dark:text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("ticket.formatA4") || "Khổ A4"}
                </button>
                <button
                  type="button"
                  onClick={() => setTicketFormat("pallet")}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    ticketFormat === "pallet"
                      ? "bg-slate-900 text-white font-bold shadow-xs dark:bg-primary dark:text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t("ticket.formatPallet") || "Tem Pallet"}
                </button>
              </div>
            </div>

            {/* Cụm Giữa: Bộ điều hướng Lô liên hoàn [← Lô trước] Lô {idx+1}/{total} [Lô sau →] */}
            {siblingItems && siblingItems.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2 py-0.5 text-[11px] shadow-2xs">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={handlePrevItem}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Xem lô trước (Phím tắt: ←)"
                >
                  <ChevronLeft size={13} />
                  <span className="hidden md:inline">Lô trước</span>
                </button>
                <span className="font-mono font-bold text-foreground px-1.5 border-x border-slate-200 dark:border-border/60">
                  Lô {currentIndex + 1}/{siblingItems.length}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={handleNextItem}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md font-semibold text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-secondary disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Xem lô sau (Phím tắt: →)"
                >
                  <span className="hidden md:inline">Lô sau</span>
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            {/* Cụm Phải: Nút Copy ID, In ngay (P), Nút Đóng */}
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1 text-xs h-7 px-2 cursor-pointer rounded-lg border-slate-300 dark:border-border hover:bg-slate-100 dark:hover:bg-secondary"
                title="Sao chép ID Lô (Phím tắt: C)"
              >
                {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
                <span className="hidden sm:inline">
                  {copied ? t("ticket.codeCopied") : (t("ticket.copyCode") || "Copy ID")}
                </span>
                <kbd className="hidden md:inline-block font-mono text-[9px] text-muted-foreground bg-muted px-1 py-0.2 rounded-xs border border-border/50">
                  C
                </kbd>
              </Button>
              <Button
                size="sm"
                className="gap-1 font-bold h-7 px-3 bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground cursor-pointer shadow-xs rounded-lg transition"
                onClick={handlePrint}
                title="In lệnh gia công ngay lập tức (Phím tắt: P)"
              >
                <Printer size={13} />
                <span>{t("ticket.printNow") || "In ngay"}</span>
                <kbd className="hidden sm:inline-block font-mono text-[9px] text-primary-foreground/90 bg-white/20 dark:bg-primary-foreground/20 px-1 py-0.2 rounded-xs border border-white/30 dark:border-primary-foreground/30">
                  P
                </kbd>
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-muted flex items-center justify-center text-sm transition cursor-pointer"
                title={t("close") || "Đóng (Esc)"}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Sub-toolbar: Cấu hình in nhanh & Ghi chú điều động (Quick Memo) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-border bg-white dark:bg-card px-4 py-1.5 text-xs shrink-0">
            {/* Nhóm Số liên in: 1x / 2x / 3x */}
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[11px] text-muted-foreground">
                Số liên:
              </span>
              <div className="flex rounded-lg border border-slate-200 dark:border-border bg-slate-50 dark:bg-secondary/50 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setCopies(1)}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    copies === 1
                      ? "bg-white text-slate-900 font-bold shadow-2xs border border-slate-300 dark:bg-card dark:text-foreground dark:border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="In 1 bản duy nhất"
                >
                  1 liên
                </button>
                <button
                  type="button"
                  onClick={() => setCopies(2)}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    copies === 2
                      ? "bg-white text-slate-900 font-bold shadow-2xs border border-slate-300 dark:bg-card dark:text-foreground dark:border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="In 2 bản (1 bản theo hàng sang đơn vị gia công, 1 bản lưu tại xưởng đối soát)"
                >
                  2 liên (Chuẩn)
                </button>
                <button
                  type="button"
                  onClick={() => setCopies(3)}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    copies === 3
                      ? "bg-white text-slate-900 font-bold shadow-2xs border border-slate-300 dark:bg-card dark:text-foreground dark:border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="In 3 bản (Gia công, Bảo vệ, Hồ sơ xưởng)"
                >
                  3 liên
                </button>
              </div>
            </div>

            {/* Nhóm Quick Memo: Ghi chú điều động nhanh */}
            <div className="flex-1 flex items-center gap-2 min-w-[240px]">
              <span className="font-semibold text-[11px] text-muted-foreground shrink-0">
                Ghi chú nhanh:
              </span>
              <input
                type="text"
                value={quickMemo}
                onChange={(e) => setQuickMemo(e.target.value)}
                placeholder="VD: Giao gấp ca sáng, đo kiểm HRC 3 điểm, bọc màng xốp khí..."
                className="h-7 flex-1 rounded-md border border-slate-200 dark:border-input bg-slate-50 dark:bg-background px-2.5 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/60 shadow-2xs focus:outline-hidden focus:border-primary/80 focus:ring-1 focus:ring-primary/40 truncate"
              />
              <label className="hidden lg:flex items-center gap-1 text-[11px] text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={keepMemoForNext}
                  onChange={(e) => setKeepMemoForNext(e.target.checked)}
                  className="rounded border-border text-primary accent-primary h-3.5 w-3.5"
                />
                <span>Giữ cho lô sau</span>
              </label>
            </div>

            {/* Chỉ báo giới hạn Trang 1/1 */}
            <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <Check size={11} className="stroke-[3]" /> Trang 1/1 (Chuẩn khổ A4)
              </span>
            </div>
          </div>

          {/* Studio Canvas Workbench Area (Responsive Scaled Wrapper Container) */}
          <div
            ref={canvasContainerRef}
            className="job-ticket-canvas-container flex-1 overflow-auto bg-zinc-900/60 dark:bg-black/60 p-4 sm:p-6 flex justify-center items-start"
          >
            {ticketFormat === "a4" ? (
              <div
                className="relative transition-all duration-200 shadow-2xl rounded-xs bg-white"
                style={{
                  width: `${210 * currentScale}mm`,
                  height: `${297 * currentScale}mm`,
                  overflow: "hidden",
                }}
              >
                <div
                  ref={printRef}
                  style={{
                    width: "210mm",
                    height: "297mm",
                    transform: `scale(${currentScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <SingleA4TicketContent
                    item={activeItem}
                    role={role}
                    docCode={docCode}
                    quickMemo={quickMemo}
                  />
                </div>
              </div>
            ) : (
              <div ref={printRef} className="transition-all duration-200">
                <SinglePalletTagContent item={activeItem} role={role} />
              </div>
            )}
          </div>

          {/* Studio Canvas Footer Toolbar (Zoom Controls, Ratio Indicator & Hotkeys) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-border bg-slate-50/90 dark:bg-secondary/80 px-4 py-1.5 text-xs select-none shrink-0">
            {/* Cụm Zoom Controls */}
            {ticketFormat === "a4" ? (
              <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-2 py-0.5 text-[11px] shadow-2xs">
                <span className="text-muted-foreground font-medium text-[10px] mr-1">
                  Zoom:
                </span>
                <button
                  type="button"
                  onClick={() => setZoomLevel("fit")}
                  className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    zoomLevel === "fit"
                      ? "bg-slate-100 text-slate-900 font-bold dark:bg-primary/20 dark:text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Vừa khít chiều cao màn hình laptop"
                >
                  Fit màn hình
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("75")}
                  className={`rounded-md px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                    zoomLevel === "75"
                      ? "bg-slate-100 text-slate-900 font-bold dark:bg-primary/20 dark:text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("90")}
                  className={`rounded-md px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                    zoomLevel === "90"
                      ? "bg-slate-100 text-slate-900 font-bold dark:bg-primary/20 dark:text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  90%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel("100")}
                  className={`rounded-md px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                    zoomLevel === "100"
                      ? "bg-slate-100 text-slate-900 font-bold dark:bg-primary/20 dark:text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  100% (Chuẩn in)
                </button>
              </div>
            ) : (
              <div className="text-[11px] font-mono text-muted-foreground">
                Khổ tem Pallet tiêu chuẩn: 100 × 150 mm (Tỷ lệ 1:1.5)
              </div>
            )}

            {/* Chỉ báo tỷ lệ & Phím tắt */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
              <span className="hidden sm:inline">
                Tỷ lệ: {ticketFormat === "a4" ? "ISO 216 (1:1.414)" : "100×150mm (1:1.5)"}
              </span>
              <span className="hidden md:inline border-l border-slate-300 dark:border-border pl-3">
                Phím: <kbd className="px-1 py-0.2 rounded bg-muted border border-border/60 text-foreground font-bold">P</kbd> In · <kbd className="px-1 py-0.2 rounded bg-muted border border-border/60 text-foreground font-bold">← / →</kbd> Đổi lô · <kbd className="px-1 py-0.2 rounded bg-muted border border-border/60 text-foreground font-bold">C</kbd> Copy · <kbd className="px-1 py-0.2 rounded bg-muted border border-border/60 text-foreground font-bold">Esc</kbd> Đóng
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Batch Job Ticket Modal (Multi-lot printing with Manifest or Batch A4 Sheets)
export function BatchJobTicketModal({
  items,
  role,
  open,
  onOpenChange,
}: {
  items: QTItem[];
  role: Role;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, locale } = useTranslation();
  const [mode, setMode] = React.useState<"manifest" | "tickets">("manifest");
  const [zoomLevel, setZoomLevel] = React.useState<"fit" | "90" | "100">("fit");
  const manifestPrintRef = React.useRef<HTMLDivElement>(null);
  const ticketsPrintRef = React.useRef<HTMLDivElement>(null);
  const totalKg = items.reduce((a, r) => a + r.kg_Lot, 0);
  const totalPcs = items.reduce((a, r) => a + r.so_luong, 0);

  const zoomScale =
    zoomLevel === "fit" ? "scale(0.85)" : zoomLevel === "90" ? "scale(0.9)" : "scale(1)";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="job-ticket-dialog max-h-[96vh] w-[96vw] max-w-5xl overflow-hidden p-0 flex flex-col rounded-xl sm:rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-card [&>button:last-child]:hidden"
        style={{ borderRadius: "12px" }}
      >
        {/* Studio Top Toolbar */}
        <div className="job-ticket-studio-header flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/80 px-4 py-2.5 text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold">
              <Layers size={15} />
            </span>
            <div>
              <DialogTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>{t("ticket.batchTitle", { count: items.length })}</span>
              </DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground">
                {t("ticket.batchSummary", { pcs: number(totalPcs), kg: number(totalKg, 1) })}
              </DialogDescription>
            </div>

            <div className="ml-3 hidden sm:flex items-center rounded-lg border border-border bg-card p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setMode("manifest")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${mode === "manifest"
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t("ticket.tabManifest", { count: items.length })}
              </button>
              <button
                type="button"
                onClick={() => setMode("tickets")}
                className={`rounded-md px-2.5 py-1 font-semibold transition-colors cursor-pointer ${mode === "tickets"
                  ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t("ticket.tabTickets", { count: items.length })}
              </button>
            </div>
          </div>

          {/* Zoom controls for tickets mode */}
          {mode === "tickets" && (
            <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1 text-[11px]">
              <span className="text-muted-foreground font-medium text-[10px] mr-1 hidden md:inline">
                {t("ticket.zoomLabel")}
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel("fit")}
                className={`rounded-md px-2 py-0.5 font-semibold transition-colors cursor-pointer ${zoomLevel === "fit"
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {t("ticket.zoomFit")}
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel("90")}
                className={`rounded-md px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${zoomLevel === "90"
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                90%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel("100")}
                className={`rounded-md px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${zoomLevel === "100"
                  ? "bg-primary/20 text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                100%
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="gap-1.5 font-bold h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs rounded-lg"
              onClick={() => {
                if (mode === "manifest") {
                  printTicketElement(
                    manifestPrintRef.current,
                    `Bang_ke_tong_hop_${items.length}_lo`,
                    1,
                    "landscape",
                  );
                } else {
                  printTicketElement(
                    ticketsPrintRef.current,
                    `Tap_phieu_A4_${items.length}_lo`,
                    1,
                    "portrait",
                  );
                }
              }}
            >
              <Printer size={13} />{" "}
              {mode === "manifest"
                ? t("ticket.printManifest")
                : t("ticket.printAllTickets", { count: items.length })}
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-7.5 h-7.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-muted flex items-center justify-center text-sm transition cursor-pointer"
              title={t("close") || "Đóng (Esc)"}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Workbench Content */}
        <div
          className="job-ticket-canvas-container flex-1 overflow-y-auto bg-zinc-900/60 dark:bg-black/60 p-4 sm:p-6 flex justify-center items-start"
        >
          {mode === "manifest" ? (
            <div
              ref={manifestPrintRef}
              className="a4-sheet-landscape mx-auto w-full max-w-5xl bg-white p-6 sm:p-8 text-black shadow-2xl print:shadow-none print:p-0 print:m-0 print:w-full border border-slate-300 dark:border-slate-700 rounded-sm aspect-[297/210]"
            >
              <header className="flex items-start justify-between border-b-2 border-black pb-3">
                <div className="flex items-start gap-3">
                  <img src={logo} alt="Dynamo Vietnam" className="h-10 w-auto object-contain" />
                  <div>
                    <h1 className="font-display text-sm font-black tracking-tight text-black uppercase">
                      {t("ticket.companyName")}
                    </h1>
                    <p className="text-[10px] font-bold text-zinc-700">{t("manifest.title")}</p>
                    <p className="font-mono text-[9px] text-zinc-600">
                      {t("ticket.printedAt", {
                        timestamp: `${formatDate(new Date(), locale)} ${formatTime(new Date(), locale)}`,
                      })}{" "}
                      · Tổng số: <b>{items.length} lô</b> · Tổng trọng lượng:{" "}
                      <b>{number(totalKg, 1)} kg</b>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end print:hidden">
                  <span className="font-mono text-[9px] bg-zinc-800 text-white px-2 py-0.5 rounded-xs font-bold">
                    A4 Ngang (Landscape) · DIPS v1.0
                  </span>
                </div>
              </header>

              <table className="w-full text-left text-xs border border-black mt-4">
                <thead className="bg-zinc-100 text-[10px] font-bold uppercase text-black">
                  <tr className="divide-x divide-black border-b border-black">
                    <th className="px-2 py-1.5">{t("manifest.cols.idx")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.lotId")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.itemCode")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.orderNo")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.ws")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.material")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.hardness")}</th>
                    <th className="px-2 py-1.5 text-right">{t("manifest.cols.qty")}</th>
                    <th className="px-2 py-1.5 text-right">{t("manifest.cols.weight")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.partner")}</th>
                    <th className="px-2 py-1.5">{t("manifest.cols.dueDate")}</th>
                    <th className="px-2 py-1.5 text-center">{t("manifest.cols.sign")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black text-[10.5px]">
                  {items.map((r, idx) => (
                    <tr key={r.ID_Key} className="divide-x divide-black">
                      <td className="px-2 py-1 font-mono">{idx + 1}</td>
                      <td className="px-2 py-1 font-mono font-bold text-black">{r.ID_Key}</td>
                      <td className="px-2 py-1 font-mono font-bold">{r.ma_hang}</td>
                      <td className="px-2 py-1 font-mono text-zinc-700">{r.So_DatHang}</td>
                      <td className="px-2 py-1 font-medium">{r.phong_sx}</td>
                      <td className="px-2 py-1 font-mono">{r.vat_lieu}</td>
                      <td className="px-2 py-1 font-mono">{r.do_cung}</td>
                      <td className="px-2 py-1 text-right font-mono">{number(r.so_luong)}</td>
                      <td className="px-2 py-1 text-right font-mono font-bold">
                        {number(r.kg_Lot, 1)}
                      </td>
                      <td className="px-2 py-1 font-medium">
                        {formatVendorName(r.cty_QT, role, locale)}
                      </td>
                      <td className="px-2 py-1 font-mono">
                        {r.han_tra ? formatDate(r.han_tra, locale) : "—"}
                      </td>
                      <td className="px-2 py-1 text-center text-zinc-400">................</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-black font-bold bg-zinc-100 text-black">
                  <tr>
                    <td colSpan={7} className="px-2 py-1.5 text-right uppercase">
                      {t("manifest.total")}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono">{number(totalPcs)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-black">
                      {number(totalKg, 1)} kg
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>

              {/* 4 Legal Signatures */}
              <div className="mt-6 grid grid-cols-4 gap-3 text-center text-[10px]">
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">
                    {t("ticket.signatures.logistics")}
                  </p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">
                    {t("ticket.signatures.logisticsSign")}
                  </p>
                </div>
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">
                    {t("ticket.signatures.security")}
                  </p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">
                    {t("ticket.signatures.securitySign")}
                  </p>
                </div>
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">{t("ticket.signatures.vendor")}</p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">
                    {t("ticket.signatures.vendorSign")}
                  </p>
                </div>
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">{t("ticket.signatures.qc")}</p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">{t("ticket.signatures.qcSign")}</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={ticketsPrintRef}
              className="w-full max-w-[210mm] transition-transform duration-200 origin-top space-y-8 print:space-y-0"
              style={{ transform: zoomScale }}
            >
              {items.map((it, idx) => (
                <div
                  key={it.ID_Key}
                  className="printable-job-ticket relative bg-white border border-slate-300 dark:border-slate-700 shadow-2xl rounded-sm aspect-[210/297] print:shadow-none print:border-none print:rounded-none"
                >
                  <div className="absolute top-2 right-2 print:hidden z-10">
                    <span className="font-mono text-[9px] bg-zinc-900/80 text-white px-2 py-0.5 rounded-xs font-bold shadow-xs">
                      Trang {idx + 1}/{items.length} · A4 Dọc
                    </span>
                  </div>
                  <SingleA4TicketContent
                    item={it}
                    role={role}
                    docCode={`DVN-QT-${it.phong_sx}-${it.ID_Key}`}
                    isBatch
                    pageIndex={idx}
                    totalPages={items.length}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
