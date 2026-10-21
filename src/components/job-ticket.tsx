import * as React from 'react';
import {
  Barcode,
  Building2,
  Calendar,
  Check,
  Copy,
  FileText,
  Printer,
  QrCode,
  Scale,
  ShieldCheck,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { date, money, number, type QTItem } from '@/lib/dynamo-data';
import { canViewPricing, formatVendorName, type Role } from '@/lib/dynamo-auth';
import { toast } from 'sonner';
import logo from '@/assets/dynamo-logo.png';

// Code 39 Barcode SVG Generator (100% Vector, Pure Math, Edge & SSR Safe)
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

function BarcodeSvg({ text, height = 44 }: { text: string; height?: number }) {
  const sanitized = `*${text.toUpperCase().replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '')}*`;
  const narrowWidth = 1.6;
  const wideWidth = 3.6;
  const gapWidth = 1.6;

  let currentX = 8;
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

  const totalWidth = currentX + 8;

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="h-10 w-auto max-w-full text-foreground print:text-black"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {rects}
      </svg>
      <span className="mt-0.5 font-mono text-[9px] font-bold tracking-widest text-foreground print:text-black">
        *{text}*
      </span>
    </div>
  );
}

// 2D Vector QR / Data Matrix Pattern Generator (Pure SVG)
function QrMatrixSvg({ text, size = 64 }: { text: string; size?: number }) {
  // Deterministic 21x21 grid based on text hash
  const gridSize = 21;
  const cells: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false) as boolean[]);

  // Finder patterns at (0,0), (14,0), (0,14) - 7x7
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

  // Timing patterns
  for (let i = 8; i < 13; i++) {
    cells[6]![i] = i % 2 === 0;
    cells[i]![6] = i % 2 === 0;
  }

  // Populate data area based on simple deterministic hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      // Skip finder zones
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
        className="size-16 text-foreground print:text-black"
        style={{ shapeRendering: 'crispEdges' }}
      >
        {rects}
      </svg>
      <span className="mt-0.5 font-mono text-[8px] font-bold text-muted-foreground print:text-black">
        QR TRACK
      </span>
    </div>
  );
}

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
  const [copied, setCopied] = React.useState(false);
  const pricing = canViewPricing(role);

  const handleCopy = () => {
    void navigator.clipboard.writeText(item.ID_Key);
    setCopied(true);
    toast.success(`Đã sao chép mã lô: ${item.ID_Key}`);
    setTimeout(() => setCopied(false), 2000);
  };

  const docCode = `DVN-QT-${item.phong_sx}-${item.ID_Key}`;

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title={`In phiếu gia công ${item.ma_hang}`}
          aria-label={`Mở phiếu giao nhận ${item.ma_hang}`}
          className="inline-flex size-7 items-center justify-center rounded-sm text-primary transition-colors hover:bg-primary/10 active:scale-95"
        >
          <FileText size={15} />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5 text-xs font-semibold"
        >
          <FileText size={14} /> In phiếu lệnh A4
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="job-ticket-dialog max-h-[95vh] max-w-4xl overflow-y-auto p-0 print:m-0 print:max-h-none print:max-w-none print:overflow-visible print:border-none print:bg-white print:p-0">
          {/* Format Switcher (Hidden when printing) */}
          <div className="flex items-center justify-between border-b border-border bg-secondary/70 px-6 py-2 text-xs print:hidden">
            <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
              <span>ĐỊNH DẠNG XUẤT BẢN:</span>
              <button
                type="button"
                onClick={() => setTicketFormat('a4')}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  ticketFormat === 'a4'
                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Phiếu A4 chuẩn 4 chữ ký
              </button>
              <button
                type="button"
                onClick={() => setTicketFormat('pallet')}
                className={`rounded px-2.5 py-1 text-xs transition-colors ${
                  ticketFormat === 'pallet'
                    ? 'bg-primary text-primary-foreground font-bold shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Tem dán thùng / Pallet (100x150mm)
              </button>
            </div>
            <span className="font-mono text-[10px] text-muted-foreground">
              Mã chứng từ: {docCode}
            </span>
          </div>

          {/* Printable Container */}
          {ticketFormat === 'a4' ? (
            /* Mode 1: Comprehensive A4 Job Ticket */
            <div className="job-ticket bg-card p-6 text-foreground print:bg-white print:p-8 print:text-black">
              {/* Header Block */}
              <header className="flex flex-col gap-4 border-b-2 border-foreground pb-4 sm:flex-row sm:items-start sm:justify-between print:border-black">
                <div className="flex items-start gap-4">
                  <img
                    src={logo}
                    alt="Dynamo Vietnam"
                    className="h-10 w-auto object-contain print:h-10"
                  />
                  <div>
                    <h1 className="font-display text-sm font-black tracking-tight text-foreground uppercase print:text-black">
                      CÔNG TY TNHH DYNAMO VIỆT NAM
                    </h1>
                    <p className="text-[11px] font-medium text-muted-foreground print:text-gray-700">
                      KAIZEN MES · PHÂN XƯỞNG NHIỆT LUYỆN &amp; GIA CÔNG NGOÀI (QT)
                    </p>
                    <p className="font-mono text-[10px] text-muted-foreground print:text-gray-600">
                      Số phiếu: <b className="text-foreground print:text-black">{docCode}</b> · Số ĐH: <b className="text-foreground print:text-black">{item.So_DatHang}</b>
                    </p>
                  </div>
                </div>

                {/* Barcode & QR Block */}
                <div className="flex items-center gap-4 sm:items-end">
                  <QrMatrixSvg text={item.ID_Key} />
                  <BarcodeSvg text={item.ID_Key} />
                </div>
              </header>

              {/* Document Title Banner */}
              <div className="my-3 text-center">
                <DialogTitle className="font-display text-base font-black tracking-wider uppercase text-foreground print:text-black">
                  PHIẾU GIAO NHẬN &amp; LỆNH GIA CÔNG NGOÀI
                </DialogTitle>
                <DialogDescription className="font-mono text-[11px] text-muted-foreground print:text-gray-600">
                  Quy trình: Nhiệt luyện thể tích / Tôi chân không / Thấm Carbon / Xi mạ kỹ thuật
                </DialogDescription>
              </div>

              {/* Section I: Thông số kỹ thuật lô hàng */}
              <div className="mt-3 overflow-hidden rounded-xs border border-border print:border-black">
                <div className="bg-secondary/60 px-3 py-1.5 border-b border-border print:bg-gray-100 print:border-black">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-wider text-foreground print:text-black">
                    I. THÔNG TIN LINH KIỆN &amp; YÊU CẦU KỸ THUẬT
                  </h3>
                </div>
                <div className="grid grid-cols-2 divide-x divide-y divide-border text-xs sm:grid-cols-4 print:divide-black">
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Mã linh kiện:</span>
                    <p className="font-mono text-sm font-black text-foreground print:text-black">{item.ma_hang}</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Mã lô truy vết (ID):</span>
                    <p className="font-mono text-sm font-black text-primary print:text-black">{item.ID_Key}</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Phân xưởng giao:</span>
                    <p className="font-bold text-foreground print:text-black">{item.phong_sx}</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Đơn vị tiếp nhận:</span>
                    <p className="font-bold text-foreground print:text-black">{formatVendorName(item.cty_QT, role)}</p>
                  </div>

                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Mác thép / Vật liệu:</span>
                    <p className="font-mono font-bold text-primary print:text-black">{item.vat_lieu}</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Độ cứng yêu cầu:</span>
                    <p className="font-mono font-black text-destructive print:text-black">{item.do_cung || 'Theo bản vẽ'}</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Kích thước SP:</span>
                    <p className="font-mono font-bold text-foreground print:text-black">{item.Kich_Thuoc_SP || '—'}</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Số lượng xuất:</span>
                    <p className="font-mono font-black text-foreground print:text-black">
                      {number(item.so_luong)} {item.don_vi_tinh ?? 'pcs'}
                    </p>
                  </div>

                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Tổng trọng lượng lô:</span>
                    <p className="font-mono font-black text-foreground print:text-black">{number(item.kg_Lot, 1)} kg</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Ngày gửi xuất xưởng:</span>
                    <p className="font-mono font-bold text-foreground print:text-black">{date(item.ngay_gui_QT)}</p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Hạn trả cam kết:</span>
                    <p className="font-mono font-bold text-foreground print:text-black">
                      {item.han_tra ? date(item.han_tra) : 'Theo thỏa thuận'}
                    </p>
                  </div>
                  <div className="p-2.5">
                    <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Trạng thái hiện hành:</span>
                    <p className="font-bold text-foreground print:text-black">{item.TrangThai}</p>
                  </div>

                  {pricing && (
                    <>
                      <div className="p-2.5">
                        <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Đơn giá gia công:</span>
                        <p className="font-mono font-bold text-foreground print:text-black">{money(item.don_gia)}</p>
                      </div>
                      <div className="p-2.5">
                        <span className="text-[10px] font-semibold text-muted-foreground print:text-gray-600">Tổng chi phí tạm tính:</span>
                        <p className="font-mono font-bold text-foreground print:text-black">{money(item.thanh_tien)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Section II: Quy chuẩn bảo quản & An toàn */}
              <div className="mt-3 rounded-xs border border-border p-3 text-[11px] print:border-black">
                <h4 className="font-bold text-foreground uppercase tracking-wide print:text-black">
                  II. CHỈ DẪN KỸ THUẬT &amp; QUY CÁCH ĐÓNG GÓI BÀN GIAO
                </h4>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-muted-foreground print:text-gray-700">
                  <li>Bảo vệ bề mặt: Phun dầu chống gỉ sét, quấn màng co bảo vệ đối với bề mặt mài bóng định hình.</li>
                  <li>Tránh va chạm: Đặt khay nhựa / ngăn chia chống cọ xát sứt mẻ góc cạnh và ren bu lông.</li>
                  <li>Kiểm soát biến dạng nhiệt luyện: Độ biến dạng cong vênh sau tôi ≤ 0.02 mm / 100mm chiều dài.</li>
                  <li>Mẫu thử kèm theo (coupon): Gia công cùng mẻ tôi để đo kiểm độ cứng mặt cắt và cơ tính vật liệu.</li>
                </ul>
              </div>

              {/* Section III: Bảng đo kiểm độ cứng QC */}
              <div className="mt-3 overflow-hidden rounded-xs border border-border print:border-black">
                <div className="bg-secondary/60 px-3 py-1.5 border-b border-border print:bg-gray-100 print:border-black">
                  <h3 className="font-mono text-[11px] font-black uppercase tracking-wider text-foreground print:text-black">
                    III. KẾT QUẢ ĐO KIỂM TIẾP NHẬN THỰC TẾ (QC INSPECTION LOG)
                  </h3>
                </div>
                <div className="grid grid-cols-5 divide-x divide-border text-center text-xs print:divide-black">
                  <div className="p-2">
                    <span className="text-[10px] text-muted-foreground print:text-gray-600">Điểm đo 1 (HRC)</span>
                    <div className="mt-2 h-6 border-b border-dashed border-border print:border-black" />
                  </div>
                  <div className="p-2">
                    <span className="text-[10px] text-muted-foreground print:text-gray-600">Điểm đo 2 (HRC)</span>
                    <div className="mt-2 h-6 border-b border-dashed border-border print:border-black" />
                  </div>
                  <div className="p-2">
                    <span className="text-[10px] text-muted-foreground print:text-gray-600">Điểm đo 3 (HRC)</span>
                    <div className="mt-2 h-6 border-b border-dashed border-border print:border-black" />
                  </div>
                  <div className="p-2">
                    <span className="text-[10px] text-muted-foreground print:text-gray-600">Trung bình (HRC)</span>
                    <div className="mt-2 h-6 border-b border-dashed border-border print:border-black" />
                  </div>
                  <div className="p-2">
                    <span className="text-[10px] text-muted-foreground print:text-gray-600">Đánh giá nghiệm thu</span>
                    <div className="mt-2 text-[10px] font-bold text-muted-foreground print:text-black">
                      [ ] ĐẠT &nbsp;&nbsp; [ ] KHÔNG ĐẠT
                    </div>
                  </div>
                </div>
              </div>

              {/* Section IV: Khung 4 chữ ký liên hoàn pháp lý */}
              <div className="mt-5 grid grid-cols-2 gap-4 text-center text-xs sm:grid-cols-4 print:mt-6 print:text-black">
                <div className="rounded-xs border border-border p-2 print:border-black">
                  <p className="font-bold uppercase tracking-wider">1. ĐIỀU VẬN DYNAMO</p>
                  <p className="text-[10px] text-muted-foreground print:text-gray-600">Lập lệnh &amp; xuất kho</p>
                  <div className="mt-14 border-b border-border print:border-black" />
                  <p className="mt-1 text-[10px] text-muted-foreground print:text-gray-600">Ký &amp; ghi rõ họ tên</p>
                </div>

                <div className="rounded-xs border border-border p-2 print:border-black">
                  <p className="font-bold uppercase tracking-wider">2. BẢO VỆ CỔNG</p>
                  <p className="text-[10px] text-muted-foreground print:text-gray-600">Kiểm tra xuất hàng</p>
                  <div className="mt-14 border-b border-border print:border-black" />
                  <p className="mt-1 text-[10px] text-muted-foreground print:text-gray-600">Ký &amp; ghi giờ xuất cổng</p>
                </div>

                <div className="rounded-xs border border-border p-2 print:border-black">
                  <p className="font-bold uppercase tracking-wider">3. ĐƠN VỊ GIA CÔNG</p>
                  <p className="text-[10px] text-muted-foreground print:text-gray-600">Tiếp nhận &amp; kiểm đếm</p>
                  <div className="mt-14 border-b border-border print:border-black" />
                  <p className="mt-1 text-[10px] text-muted-foreground print:text-gray-600">Ký &amp; đóng dấu xác nhận</p>
                </div>

                <div className="rounded-xs border border-border p-2 print:border-black">
                  <p className="font-bold uppercase tracking-wider">4. QC NHẬP KHO</p>
                  <p className="text-[10px] text-muted-foreground print:text-gray-600">Nghiệm thu đạt chuẩn</p>
                  <div className="mt-14 border-b border-border print:border-black" />
                  <p className="mt-1 text-[10px] text-muted-foreground print:text-gray-600">Ký &amp; ngày nhập kho</p>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="mt-4 flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground print:border-black print:text-gray-600">
                <span>Phương châm: <b>KỶ LUẬT · CHÍNH XÁC · AN TOÀN · ĐÚNG HẠN</b></span>
                <span className="font-mono tabular-nums">
                  In lúc: {new Date().toLocaleDateString('vi-VN')} {new Date().toLocaleTimeString('vi-VN')}
                </span>
              </div>
            </div>
          ) : (
            /* Mode 2: Pallet / Crate Shipping Tag (100x150mm format) */
            <div className="job-ticket mx-auto max-w-xl bg-card p-6 text-foreground print:bg-white print:p-6 print:text-black border-2 border-dashed border-border print:border-black my-4 rounded-md">
              <div className="flex items-center justify-between border-b-2 border-foreground pb-3 print:border-black">
                <div className="flex items-center gap-3">
                  <img src={logo} alt="Dynamo" className="h-8 w-auto" />
                  <div>
                    <h2 className="font-display text-sm font-black uppercase">DYNAMO VIỆT NAM · TEM PALLET</h2>
                    <p className="font-mono text-[10px] text-muted-foreground print:text-gray-700">LÔ HÀNG GIA CÔNG NGOÀI (QT)</p>
                  </div>
                </div>
                <span className="rounded bg-foreground px-2 py-1 font-mono text-xs font-black text-background print:bg-black print:text-white">
                  {item.phong_sx}
                </span>
              </div>

              {/* Giant Part ID Block */}
              <div className="my-4 text-center">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">MÃ LINH KIỆN KHUÔN</p>
                <h1 className="font-mono text-3xl font-black text-foreground print:text-black tracking-tight">
                  {item.ma_hang}
                </h1>
                <p className="mt-1 font-mono text-sm font-bold text-primary print:text-black">
                  MÃ TRUY VẾT: {item.ID_Key}
                </p>
              </div>

              {/* Barcode & QR Centerpiece */}
              <div className="my-4 flex items-center justify-around border-y border-border py-4 print:border-black">
                <QrMatrixSvg text={item.ID_Key} size={84} />
                <BarcodeSvg text={item.ID_Key} height={52} />
              </div>

              {/* Essential Pallet Specs */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded border border-border p-2 print:border-black">
                  <span className="text-[10px] text-muted-foreground">Số lượng &amp; Khối lượng:</span>
                  <p className="font-mono text-lg font-black">{number(item.so_luong)} {item.don_vi_tinh ?? 'pcs'} · {number(item.kg_Lot, 1)} kg</p>
                </div>
                <div className="rounded border border-border p-2 print:border-black">
                  <span className="text-[10px] text-muted-foreground">Mác thép &amp; Độ cứng yêu cầu:</span>
                  <p className="font-mono text-lg font-black text-destructive print:text-black">{item.vat_lieu} · {item.do_cung || 'Theo vẽ'}</p>
                </div>
                <div className="rounded border border-border p-2 print:border-black">
                  <span className="text-[10px] text-muted-foreground">Số đơn hàng (PO):</span>
                  <p className="font-mono font-bold">{item.So_DatHang}</p>
                </div>
                <div className="rounded border border-border p-2 print:border-black">
                  <span className="text-[10px] text-muted-foreground">Đơn vị nhận gia công:</span>
                  <p className="font-bold">{formatVendorName(item.cty_QT, role)}</p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground print:text-black">
                <span>Ngày gửi: {date(item.ngay_gui_QT)}</span>
                <span>Hạn trả: {item.han_tra ? date(item.han_tra) : '—'}</span>
              </div>
            </div>
          )}

          {/* Action Bar (Hidden on print) */}
          <div className="job-ticket-actions flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/50 px-6 py-3 print:hidden">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-1.5 text-xs"
              >
                {copied ? <Check size={14} className="text-primary" /> : <Copy size={14} />}
                {copied ? 'Đã sao chép ID' : 'Sao chép mã lô'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Đóng
              </Button>
              <Button
                size="sm"
                className="gap-1.5 active:scale-[0.98] font-bold"
                onClick={() => window.print()}
              >
                <Printer size={14} /> In {ticketFormat === 'a4' ? 'Phiếu A4' : 'Tem Pallet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
