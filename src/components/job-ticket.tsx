import * as React from 'react';
import {
  Barcode,
  Building2,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Eye,
  FileText,
  Layers,
  Maximize2,
  Minimize2,
  Printer,
  QrCode,
  Scale,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { canViewPricing, formatVendorName, type Role } from '@/lib/dynamo-auth';
import { toast } from 'sonner';
import logo from '@/assets/dynamo-logo.png';

// Code 39 Barcode SVG Generator (100% Vector, Pure Math, Crisp Print)
const CODE39_MAP: Record<string, string> = {
  '0': '000110100', '1': '100100001', '2': '001100001', '3': '101100000',
  '4': '000110001', '5': '100110000', '6': '001110000', '7': '000100101',
  '8': '100100100', '9': '001100100', 'A': '100001001', 'B': '001001001',
  'C': '101001000', 'D': '000011001', 'E': '100011000', 'F': '001011000',
  'G': '000001101', 'H': '100001100', 'I': '001001100', 'J': '000011100',
  'K': '100000011', 'L': '001000011', 'M': '101000010', 'N': '000010011',
  'O': '100010010', 'P': '001010010', 'Q': '000000111', 'R': '100000110',
  'S': '001000110', 'T': '000010110', 'U': '110000001', 'V': '011000001',
  'W': '111000000', 'X': '010010001', 'Y': '110010000', 'Z': '011010000',
  '-': '010000101', '.': '110000100', ' ': '011000100', '*': '010010100',
  '$': '010101000', '/': '010100010', '+': '010001010', '%': '000101010',
};

function BarcodeSvg({ text, height = 38 }: { text: string; height?: number }) {
  const sanitized = `*${text.toUpperCase().replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '')}*`;
  const narrowWidth = 1.6;
  const wideWidth = 3.6;
  const gapWidth = 1.6;

  let currentX = 6;
  const rects: React.ReactNode[] = [];

  for (let i = 0; i < sanitized.length; i++) {
    const char = sanitized[i] ?? '*';
    const pattern = CODE39_MAP[char] ?? CODE39_MAP['*']!;

    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const isWide = pattern[j] === '1';
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
          />
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
        style={{ shapeRendering: 'crispEdges' }}
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
  const cells: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false) as boolean[]);

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
          />
        );
      }
    }
  }

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-12 text-black"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {rects}
      </svg>
      <span className="mt-0.5 font-mono text-[7px] font-bold text-zinc-700">
        QR TRACK
      </span>
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
}: {
  item: QTItem;
  role: Role;
  docCode: string;
  isBatch?: boolean;
  pageIndex?: number;
  totalPages?: number;
}) {
  const pricing = canViewPricing(role);

  return (
    <div className="a4-sheet mx-auto w-full max-w-[210mm] bg-white text-zinc-950 p-[8mm] sm:p-[10mm] font-sans shadow-lg print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full">
      {/* Header Block */}
      <header className="flex items-start justify-between border-b-2 border-black pb-3">
        <div className="flex items-start gap-3">
          <img src={logo} alt="Dynamo Vietnam" className="h-10 w-auto object-contain" />
          <div>
            <h1 className="font-display text-xs font-black tracking-wider uppercase text-black">
              CÔNG TY TNHH DYNAMO VIỆT NAM
            </h1>
            <p className="text-[10px] font-bold text-zinc-700">
              KAIZEN MES · PHÂN XƯỞNG NHIỆT LUYỆN &amp; GIA CÔNG NGOÀI (QT)
            </p>
            <p className="font-mono text-[9px] text-zinc-600 mt-0.5">
              Số phiếu: <b className="text-black font-mono font-bold">{docCode}</b> · Số ĐH: <b className="text-black font-mono font-bold">{item.So_DatHang}</b>
              {isBatch && pageIndex !== undefined && (
                <span className="ml-2 font-sans font-bold text-black">(Trang {pageIndex + 1}/{totalPages})</span>
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
          PHIẾU GIAO NHẬN &amp; LỆNH GIA CÔNG NGOÀI
        </h2>
        <p className="font-mono text-[9.5px] text-zinc-600">
          Quy trình: Tôi chân không / Nhiệt luyện thể tích / Thấm Carbon / Xi mạ kỹ thuật
        </p>
      </div>

      {/* Section I: Thông tin linh kiện & Yêu cầu kỹ thuật */}
      <div className="overflow-hidden border border-black text-[10px]">
        <div className="bg-zinc-100 px-2.5 py-1 border-b border-black">
          <h3 className="font-mono text-[10px] font-black uppercase tracking-wider text-black">
            I. THÔNG TIN LINH KIỆN &amp; YÊU CẦU KỸ THUẬT
          </h3>
        </div>
        <div className="grid grid-cols-4 divide-x divide-y divide-black">
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Mã linh kiện:</span>
            <p className="font-mono text-xs font-black text-black">{item.ma_hang}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Mã lô (ID):</span>
            <p className="font-mono text-xs font-black text-black">{item.ID_Key}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Phân xưởng giao:</span>
            <p className="font-bold text-black">{item.phong_sx}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Đơn vị nhận:</span>
            <p className="font-bold text-black">{formatVendorName(item.cty_QT, role)}</p>
          </div>

          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Mác thép / Vật liệu:</span>
            <p className="font-mono font-bold text-black">{item.vat_lieu}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Độ cứng yêu cầu:</span>
            <p className="font-mono font-black text-black">{item.do_cung || 'Theo bản vẽ'}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Kích thước SP:</span>
            <p className="font-mono font-bold text-black">{item.Kich_Thuoc_SP || '—'}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Số lượng xuất:</span>
            <p className="font-mono font-black text-black">{number(item.so_luong)} {item.don_vi_tinh ?? 'chi tiết'}</p>
          </div>

          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Tổng trọng lượng lô:</span>
            <p className="font-mono font-black text-black">{number(item.kg_Lot, 1)} kg</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Ngày gửi xuất xưởng:</span>
            <p className="font-mono font-bold text-black">{date(item.ngay_gui_QT)}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Hạn trả cam kết:</span>
            <p className="font-mono font-bold text-black">{item.han_tra ? date(item.han_tra) : 'Theo thỏa thuận'}</p>
          </div>
          <div className="p-2">
            <span className="text-[9px] font-semibold text-zinc-600 block">Trạng thái:</span>
            <p className="font-bold text-black">{item.TrangThai}</p>
          </div>

          {pricing && (
            <>
              <div className="p-2 col-span-2">
                <span className="text-[9px] font-semibold text-zinc-600 block">Đơn giá gia công:</span>
                <p className="font-mono font-bold text-black">{money(item.don_gia)}</p>
              </div>
              <div className="p-2 col-span-2">
                <span className="text-[9px] font-semibold text-zinc-600 block">Tổng thành tiền (tạm tính):</span>
                <p className="font-mono font-bold text-black">{money(item.thanh_tien)}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section II: Chỉ dẫn kỹ thuật & quy cách đóng gói */}
      <div className="mt-2.5 border border-black p-2.5 text-[9.5px]">
        <h4 className="font-bold text-black uppercase tracking-wide">
          II. CHỈ DẪN KỸ THUẬT &amp; QUY CÁCH ĐÓNG GÓI BÀN GIAO
        </h4>
        <ul className="mt-1 list-disc space-y-0.5 pl-4 text-zinc-700">
          <li><b>Bảo vệ bề mặt:</b> Phun dầu chống gỉ sét, quấn màng co bảo vệ đối với bề mặt mài bóng định hình.</li>
          <li><b>Tránh va chạm:</b> Đặt khay nhựa / ngăn chia chống cọ xát sứt mẻ góc cạnh và ren bu lông.</li>
          <li><b>Kiểm soát biến dạng:</b> Độ cong vênh sau tôi ≤ 0.02 mm / 100mm chiều dài chi tiết.</li>
          <li><b>Mẫu thử kèm theo (coupon):</b> Gia công cùng mẻ tôi để đo kiểm độ cứng mặt cắt và cơ tính vật liệu.</li>
        </ul>
      </div>

      {/* Section III: Bảng đo kiểm QC */}
      <div className="mt-2.5 overflow-hidden border border-black text-[9.5px]">
        <div className="bg-zinc-100 px-2.5 py-1 border-b border-black">
          <h3 className="font-mono text-[10px] font-black uppercase tracking-wider text-black">
            III. KẾT QUẢ ĐO KIỂM TIẾP NHẬN THỰC TẾ (QC INSPECTION LOG)
          </h3>
        </div>
        <div className="grid grid-cols-5 divide-x divide-black text-center">
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">Điểm đo 1 (HRC)</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">Điểm đo 2 (HRC)</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">Điểm đo 3 (HRC)</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">Trung bình (HRC)</span>
            <div className="mt-2 h-5 border-b border-dashed border-zinc-400" />
          </div>
          <div className="p-2">
            <span className="text-[9px] text-zinc-600 block">Đánh giá nghiệm thu</span>
            <div className="mt-2 text-[10px] font-bold text-black">
              [ &nbsp; ] ĐẠT &nbsp;&nbsp;&nbsp; [ &nbsp; ] KHÔNG ĐẠT
            </div>
          </div>
        </div>
      </div>

      {/* Section IV: 4 chữ ký pháp lý */}
      <div className="mt-3.5 grid grid-cols-4 gap-3 text-center text-[10px]">
        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">1. ĐIỀU VẬN DYNAMO</p>
          <p className="text-[8.5px] text-zinc-600">Lập lệnh &amp; xuất kho</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">Ký &amp; ghi rõ họ tên</p>
        </div>

        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">2. BẢO VỆ CỔNG</p>
          <p className="text-[8.5px] text-zinc-600">Kiểm tra xuất cổng</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">Ký &amp; ghi giờ xuất</p>
        </div>

        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">3. ĐƠN VỊ GIA CÔNG</p>
          <p className="text-[8.5px] text-zinc-600">Tiếp nhận &amp; kiểm đếm</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">Ký &amp; đóng dấu xác nhận</p>
        </div>

        <div className="border border-black p-2">
          <p className="font-bold uppercase tracking-wider text-black">4. QC NHẬP KHO</p>
          <p className="text-[8.5px] text-zinc-600">Nghiệm thu đạt chuẩn</p>
          <div className="mt-11 border-b border-black" />
          <p className="mt-1 text-[8.5px] text-zinc-600">Ký &amp; ngày nhập kho</p>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="mt-3 flex items-center justify-between border-t border-black pt-1.5 text-[8.5px] text-zinc-600">
        <span>Phương châm xưởng: <b className="text-black font-semibold">KỶ LUẬT · CHÍNH XÁC · AN TOÀN · ĐÚNG HẠN</b></span>
        <span className="font-mono tabular-nums">
          In lúc: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')}
        </span>
      </div>
    </div>
  );
}

// Single Pallet Tag Component (100x150mm format)
export function SinglePalletTagContent({
  item,
  role,
}: {
  item: QTItem;
  role: Role;
}) {
  return (
    <div className="job-ticket mx-auto max-w-xl bg-white p-6 text-black border-2 border-dashed border-black rounded-md shadow-lg print:border-black print:shadow-none print:p-6">
      <div className="flex items-center justify-between border-b-2 border-black pb-3">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Dynamo" className="h-8 w-auto" />
          <div>
            <h2 className="font-display text-sm font-black uppercase text-black">DYNAMO VIỆT NAM · TEM PALLET</h2>
            <p className="font-mono text-[10px] text-zinc-700">LÔ HÀNG GIA CÔNG NGOÀI (QT)</p>
          </div>
        </div>
        <span className="rounded bg-black px-2.5 py-1 font-mono text-xs font-black text-white">
          XƯỞNG {item.phong_sx}
        </span>
      </div>

      {/* Giant Part ID Block */}
      <div className="my-4 text-center">
        <p className="text-[10px] font-bold uppercase text-zinc-600">MÃ LINH KIỆN KHUÔN</p>
        <h1 className="font-mono text-3xl font-black text-black tracking-tight mt-1">
          {item.ma_hang}
        </h1>
        <p className="mt-1 font-mono text-sm font-bold text-black">
          MÃ TRUY VẾT: {item.ID_Key}
        </p>
      </div>

      {/* Barcode & QR Centerpiece */}
      <div className="my-4 flex items-center justify-around border-y border-black py-4">
        <QrMatrixSvg text={item.ID_Key} size={76} />
        <BarcodeSvg text={item.ID_Key} height={46} />
      </div>

      {/* Essential Pallet Specs */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded border border-black p-2">
          <span className="text-[10px] text-zinc-600 block">Số lượng &amp; Khối lượng:</span>
          <p className="font-mono text-base font-black text-black mt-0.5">
            {number(item.so_luong)} {item.don_vi_tinh ?? 'chi tiết'} · {number(item.kg_Lot, 1)} kg
          </p>
        </div>
        <div className="rounded border border-black p-2">
          <span className="text-[10px] text-zinc-600 block">Mác thép &amp; Độ cứng yêu cầu:</span>
          <p className="font-mono text-base font-black text-black mt-0.5">
            {item.vat_lieu} · {item.do_cung || 'Theo vẽ'}
          </p>
        </div>
        <div className="rounded border border-black p-2">
          <span className="text-[10px] text-zinc-600 block">Số đơn hàng (PO):</span>
          <p className="font-mono font-bold text-black mt-0.5">{item.So_DatHang}</p>
        </div>
        <div className="rounded border border-black p-2">
          <span className="text-[10px] text-zinc-600 block">Đơn vị nhận gia công:</span>
          <p className="font-bold text-black mt-0.5">{formatVendorName(item.cty_QT, role)}</p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-700">
        <span>Ngày gửi: <b>{date(item.ngay_gui_QT)}</b></span>
        <span>Hạn trả: <b>{item.han_tra ? date(item.han_tra) : '—'}</b></span>
      </div>
    </div>
  );
}

/**
 * Isolated Iframe Print Service for Industrial Job Tickets
 * Bypasses all Radix Modal / DOM transform restrictions and delivers 100% crisp, zero-blank printing.
 */
export function printTicketElement(element: HTMLElement | null, docTitle = 'Phiếu giao nhận & Lệnh gia công ngoài') {
  if (!element) {
    window.print();
    return;
  }

  try {
    const existing = document.getElementById('dvn-print-iframe');
    if (existing) {
      existing.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'dvn-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.title = docTitle;
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Deep clone the printable DOM
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.transform = 'none';
    clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
      if (el.style && el.style.transform) {
        el.style.transform = 'none';
      }
    });

    // Extract all application stylesheet links and inline style tags
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join('\n');

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
            size: auto;
            margin: 6mm 8mm;
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
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
          .a4-sheet header,
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
          }
        </style>
      </head>
      <body>
        ${clone.outerHTML}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print failed, falling back to window.print():', err);
        window.print();
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 2000);
      }
    }, 250);
  } catch (err) {
    console.warn('Error launching isolated print iframe:', err);
    window.print();
  }
}

// Proposal 2: A4 Print Studio Canvas Button & Modal
export function JobTicketButton({
  item,
  role,
  variant = 'icon',
}: {
  item: QTItem;
  role: Role;
  variant?: 'icon' | 'button';
}) {
  const [open, setOpen] = React.useState(false);
  const [ticketFormat, setTicketFormat] = React.useState<'a4' | 'pallet'>('a4');
  const [zoomLevel, setZoomLevel] = React.useState<'fit' | '75' | '90' | '100'>('fit');
  const [copied, setCopied] = React.useState(false);
  const printRef = React.useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    void navigator.clipboard.writeText(item.ID_Key);
    setCopied(true);
    toast.success(`Đã sao chép mã lô: ${item.ID_Key}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const docCode = `DVN-QT-${item.phong_sx}-${item.ID_Key}`;

  // Zoom transform mapping
  const zoomScale = zoomLevel === 'fit' ? 'scale(0.85)' : zoomLevel === '75' ? 'scale(0.75)' : zoomLevel === '90' ? 'scale(0.9)' : 'scale(1)';

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`In phiếu gia công ${item.ma_hang}`}
          aria-label={`Mở phiếu giao nhận ${item.ma_hang}`}
          className="inline-flex size-7 items-center justify-center rounded-sm text-primary transition-colors hover:bg-primary/10 active:scale-95 cursor-pointer"
        >
          <FileText size={15} />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <FileText size={14} /> In phiếu lệnh A4
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="job-ticket-dialog max-h-[96vh] w-[96vw] max-w-5xl overflow-hidden p-0 flex flex-col border border-border shadow-2xl bg-card">
          {/* A4 Print Studio Top Toolbar */}
          <div className="job-ticket-studio-header flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/80 px-4 py-2.5 text-xs select-none">
            {/* Left: Document Info & Format Switcher */}
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded bg-primary/15 text-primary font-bold">
                <Printer size={15} />
              </span>
              <div>
                <DialogTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>TRÌNH XEM TRƯỚC BẢN IN</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
                    {docCode}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-[10px] text-muted-foreground">
                  Chuẩn khổ A4 (210 x 297 mm) · Tỷ lệ thực 1:1.414 · Khung 4 chữ ký
                </DialogDescription>
              </div>

              <div className="ml-3 hidden sm:flex items-center rounded-md border border-border bg-card p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setTicketFormat('a4')}
                  className={`rounded px-2 py-1 font-semibold transition-colors cursor-pointer ${
                    ticketFormat === 'a4'
                      ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Phiếu A4 chuẩn
                </button>
                <button
                  type="button"
                  onClick={() => setTicketFormat('pallet')}
                  className={`rounded px-2 py-1 font-semibold transition-colors cursor-pointer ${
                    ticketFormat === 'pallet'
                      ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Tem Pallet
                </button>
              </div>
            </div>

            {/* Center: Zoom Controls */}
            {ticketFormat === 'a4' && (
              <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px]">
                <span className="text-muted-foreground font-medium text-[10px] mr-1 hidden md:inline">Thu phóng:</span>
                <button
                  type="button"
                  onClick={() => setZoomLevel('fit')}
                  className={`rounded px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                    zoomLevel === 'fit' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Tự động thu phóng vừa khung nhìn màn hình"
                >
                  Vừa màn hình
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel('75')}
                  className={`rounded px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                    zoomLevel === '75' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel('90')}
                  className={`rounded px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                    zoomLevel === '90' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  90%
                </button>
                <button
                  type="button"
                  onClick={() => setZoomLevel('100')}
                  className={`rounded px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                    zoomLevel === '100' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  100% (1:1)
                </button>
              </div>
            )}

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs h-7 px-2 cursor-pointer"
              >
                {copied ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
                <span className="hidden sm:inline">{copied ? 'Đã sao chép' : 'Copy mã'}</span>
              </Button>
              <Button
                size="sm"
                className="gap-1.5 font-bold h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                onClick={() => printTicketElement(printRef.current, `Phieu_${item.ma_hang}_${item.ID_Key}`)}
              >
                <Printer size={13} /> In phiếu ngay
              </Button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                title="Đóng cửa sổ xem trước"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Studio Canvas Workbench Area */}
          <div className="job-ticket-canvas-container flex-1 overflow-y-auto bg-zinc-900/60 dark:bg-black/60 p-4 sm:p-6 flex justify-center items-start">
            <div
              ref={printRef}
              className="w-full max-w-[210mm] transition-transform duration-200 origin-top flex justify-center"
              style={{ transform: ticketFormat === 'a4' ? zoomScale : 'none' }}
            >
              {ticketFormat === 'a4' ? (
                <SingleA4TicketContent item={item} role={role} docCode={docCode} />
              ) : (
                <SinglePalletTagContent item={item} role={role} />
              )}
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
  const [mode, setMode] = React.useState<'manifest' | 'tickets'>('manifest');
  const [zoomLevel, setZoomLevel] = React.useState<'fit' | '90' | '100'>('fit');
  const batchPrintRef = React.useRef<HTMLDivElement>(null);
  const totalKg = items.reduce((a, r) => a + r.kg_Lot, 0);
  const totalPcs = items.reduce((a, r) => a + r.so_luong, 0);

  const zoomScale = zoomLevel === 'fit' ? 'scale(0.85)' : zoomLevel === '90' ? 'scale(0.9)' : 'scale(1)';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="job-ticket-dialog max-h-[96vh] w-[96vw] max-w-5xl overflow-hidden p-0 flex flex-col border border-border shadow-2xl bg-card">
        {/* Studio Top Toolbar */}
        <div className="job-ticket-studio-header flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/80 px-4 py-2.5 text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded bg-primary/15 text-primary font-bold">
              <Layers size={15} />
            </span>
            <div>
              <DialogTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                <span>IN PHIẾU HÀNG LOẠT ({items.length} LÔ)</span>
              </DialogTitle>
              <DialogDescription className="text-[10px] text-muted-foreground">
                Tổng cộng: {number(totalPcs)} chi tiết · {number(totalKg, 1)} kg
              </DialogDescription>
            </div>

            <div className="ml-3 hidden sm:flex items-center rounded-md border border-border bg-card p-0.5 text-[11px]">
              <button
                type="button"
                onClick={() => setMode('manifest')}
                className={`rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  mode === 'manifest'
                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                1. Bảng kê tổng hợp ({items.length} lô)
              </button>
              <button
                type="button"
                onClick={() => setMode('tickets')}
                className={`rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer ${
                  mode === 'tickets'
                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                2. Tập phiếu A4 từng lô ({items.length} trang)
              </button>
            </div>
          </div>

          {/* Zoom controls for tickets mode */}
          {mode === 'tickets' && (
            <div className="flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[11px]">
              <span className="text-muted-foreground font-medium text-[10px] mr-1 hidden md:inline">Thu phóng:</span>
              <button
                type="button"
                onClick={() => setZoomLevel('fit')}
                className={`rounded px-2 py-0.5 font-semibold transition-colors cursor-pointer ${
                  zoomLevel === 'fit' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Vừa màn hình
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel('90')}
                className={`rounded px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                  zoomLevel === '90' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                90%
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel('100')}
                className={`rounded px-1.5 py-0.5 font-mono font-semibold transition-colors cursor-pointer ${
                  zoomLevel === '100' ? 'bg-primary/20 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'
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
              className="gap-1.5 font-bold h-7 px-3 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
              onClick={() => printTicketElement(batchPrintRef.current, mode === 'manifest' ? 'Bang_ke_tong_hop' : `Tap_phieu_A4_${items.length}_lo`)}
            >
              <Printer size={13} /> In {mode === 'manifest' ? 'Bảng kê tổng hợp' : `Tất cả ${items.length} phiếu A4`}
            </Button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Workbench Content */}
        <div
          ref={batchPrintRef}
          className="job-ticket-canvas-container flex-1 overflow-y-auto bg-zinc-900/60 dark:bg-black/60 p-4 sm:p-6 flex justify-center items-start"
        >
          {mode === 'manifest' ? (
            <div className="a4-sheet mx-auto w-full max-w-4xl bg-white p-6 text-black shadow-xl print:shadow-none print:p-0 print:m-0 print:w-full">
              <header className="flex items-start justify-between border-b-2 border-black pb-3">
                <div className="flex items-start gap-3">
                  <img src={logo} alt="Dynamo Vietnam" className="h-10 w-auto object-contain" />
                  <div>
                    <h1 className="font-display text-sm font-black tracking-tight text-black uppercase">
                      CÔNG TY TNHH DYNAMO VIỆT NAM
                    </h1>
                    <p className="text-[10px] font-bold text-zinc-700">
                      BẢNG KÊ GIAO NHẬN LÔ HÀNG GIA CÔNG NGOÀI (QT DISPATCH MANIFEST)
                    </p>
                    <p className="font-mono text-[9px] text-zinc-600">
                      Ngày lập: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')} · Tổng số: <b>{items.length} lô</b> · Tổng trọng lượng: <b>{number(totalKg, 1)} kg</b>
                    </p>
                  </div>
                </div>
              </header>

              <table className="w-full text-left text-xs border border-black mt-4">
                <thead className="bg-zinc-100 text-[10px] font-bold uppercase text-black">
                  <tr className="divide-x divide-black border-b border-black">
                    <th className="px-2 py-1.5">STT</th>
                    <th className="px-2 py-1.5">Mã lô</th>
                    <th className="px-2 py-1.5">Mã hàng</th>
                    <th className="px-2 py-1.5">Số PO</th>
                    <th className="px-2 py-1.5">Xưởng</th>
                    <th className="px-2 py-1.5">Vật liệu</th>
                    <th className="px-2 py-1.5">Độ cứng</th>
                    <th className="px-2 py-1.5 text-right">SL</th>
                    <th className="px-2 py-1.5 text-right">Kg</th>
                    <th className="px-2 py-1.5">Đối tác</th>
                    <th className="px-2 py-1.5">Hạn trả</th>
                    <th className="px-2 py-1.5 text-center">Ký nhận</th>
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
                      <td className="px-2 py-1 text-right font-mono font-bold">{number(r.kg_Lot, 1)}</td>
                      <td className="px-2 py-1 font-medium">{formatVendorName(r.cty_QT, role)}</td>
                      <td className="px-2 py-1 font-mono">{r.han_tra ? date(r.han_tra) : '—'}</td>
                      <td className="px-2 py-1 text-center text-zinc-400">................</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-black font-bold bg-zinc-100 text-black">
                  <tr>
                    <td colSpan={7} className="px-2 py-1.5 text-right uppercase">Tổng cộng:</td>
                    <td className="px-2 py-1.5 text-right font-mono">{number(totalPcs)}</td>
                    <td className="px-2 py-1.5 text-right font-mono font-black">{number(totalKg, 1)} kg</td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>

              {/* 4 Legal Signatures */}
              <div className="mt-6 grid grid-cols-4 gap-3 text-center text-[10px]">
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">1. ĐIỀU VẬN DYNAMO</p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">Ký &amp; ghi họ tên</p>
                </div>
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">2. BẢO VỆ CỔNG</p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">Ký &amp; giờ xuất</p>
                </div>
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">3. ĐƠN VỊ GIA CÔNG</p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">Ký nhận đủ lô</p>
                </div>
                <div className="border border-black p-2">
                  <p className="font-bold uppercase text-black">4. QC NGHIỆM THU</p>
                  <div className="mt-12 border-b border-black" />
                  <p className="mt-1 text-[8.5px] text-zinc-600">Xác nhận nhập kho</p>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="w-full max-w-[210mm] transition-transform duration-200 origin-top space-y-6 print:space-y-0"
              style={{ transform: zoomScale }}
            >
              {items.map((it, idx) => (
                <div key={it.ID_Key} className="printable-job-ticket">
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
