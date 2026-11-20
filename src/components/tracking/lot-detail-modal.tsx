import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Lock,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Maximize2,
  Download,
  FileText,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
  date,
  money,
  number,
  type QTItem,
  type Status,
} from '@/lib/dynamo-data';
import { formatVendorName, canViewPricing, type Role } from '@/lib/dynamo-auth';
import { auditFor, appendAudit } from '@/lib/dynamo-workflow';
import { playAudioCue } from '@/lib/audio-cues';
import { JobTicketButton } from '@/components/job-ticket';
import { DateCell } from '@/components/tracking/date-cell';
import { FileLightboxModal } from '@/components/tracking/file-lightbox-modal';
import {
  parseAttachments,
  transformToPreviewUrl,
  middleTruncate,
  renderFileIcon,
  renderFileTypeBadge,
} from '@/components/tracking/attachment-field';
import { HeatTreatmentCycle, HeatCycleModal } from '@/components/technical-charts';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { toast } from 'sonner';

export interface LotDetailModalProps {
  item: QTItem;
  role: string;
  siblingItems: QTItem[];
  onClose: () => void;
  onUpdate: (patch: Partial<QTItem>) => void;
  onItemChange?: (newItem: QTItem) => void;
}

/**
 * Interactive Hover Preview for Attachments (PO, QC Certs, Drawings)
 * Features live embedded iframe document previews and synchronized lot filenames.
 */
function AttachmentHoverPreview({
  rawUrl,
  title,
  lotCode,
  onOpenLightbox,
}: {
  rawUrl?: string;
  title: string;
  lotCode?: string;
  onOpenLightbox?: (file: { url: string; title: string; type: 'image' | 'pdf' }) => void;
}) {
  const items = useMemo(() => parseAttachments(rawUrl, lotCode), [rawUrl, lotCode]);

  if (!items || items.length === 0) {
    return <span className="font-mono text-muted-foreground/50 text-[11px]">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((it, idx) => {
        const previewUrl = transformToPreviewUrl(it.url);
        const isImg = it.type === 'image' || it.url.startsWith('data:image/');
        const isPdf = it.type === 'pdf' || it.source === 'gdrive' || it.url.includes('.pdf') || it.url.includes('drive.google.com');
        const fileTitle = it.name || `${title} (${idx + 1})`;

        return (
          <HoverCard key={idx} openDelay={120} closeDelay={100}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  if (onOpenLightbox && (isImg || isPdf)) {
                    onOpenLightbox({ url: previewUrl, title: fileTitle, type: isImg ? 'image' : 'pdf' });
                  } else {
                    window.open(it.url, '_blank', 'noreferrer');
                  }
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs font-mono text-[10.5px] bg-slate-100 hover:bg-slate-200 dark:bg-muted/80 dark:hover:bg-muted text-foreground border border-border/70 transition cursor-pointer shadow-2xs select-none"
                title={`${fileTitle} - Click để xem phóng to`}
              >
                <span className="text-[10px]">{renderFileIcon(it.type)}</span>
                <span className="max-w-[110px] truncate">{middleTruncate(it.name || it.url, 15)}</span>
              </button>
            </HoverCardTrigger>

            <HoverCardContent
              side="top"
              align="center"
              sideOffset={8}
              className="z-50 w-[420px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 shadow-2xl text-slate-900 dark:text-slate-100 outline-none select-text"
            >
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b border-border/70 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderFileTypeBadge(it.type, it.source)}
                  <span className="font-mono text-xs font-bold truncate max-w-[210px] text-foreground" title={fileTitle}>
                    {fileTitle}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10.5px] font-semibold text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded border border-border/60 hover:bg-secondary cursor-pointer transition shadow-2xs"
                    title="Tải về tệp gốc"
                  >
                    <Download size={11} />
                    <span>Tải về</span>
                  </a>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10.5px] font-semibold text-primary hover:underline rounded border border-primary/30 bg-primary/5 hover:bg-primary/10 cursor-pointer transition shadow-2xs"
                  >
                    <span>Mở tab mới</span>
                    <ExternalLink size={10} />
                  </a>
                  {onOpenLightbox && (
                    <button
                      type="button"
                      onClick={() => onOpenLightbox({ url: previewUrl, title: fileTitle, type: isImg ? 'image' : 'pdf' })}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer transition"
                      title="Phóng to xem toàn màn hình"
                    >
                      <Maximize2 size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Body: Embedded Document / Image Preview (Hình 5) */}
              <div className="w-full h-[270px] rounded border border-border/60 bg-slate-50 dark:bg-slate-900/40 overflow-hidden flex items-center justify-center">
                {isImg ? (
                  <img
                    src={previewUrl}
                    alt={fileTitle}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : isPdf ? (
                  <iframe
                    src={transformToPreviewUrl(it.url)}
                    title={fileTitle}
                    className="w-full h-full border-0 rounded bg-white"
                  />
                ) : (
                  <div className="p-3 text-center text-xs text-muted-foreground">
                    <FileText size={28} className="mx-auto mb-1 text-primary/70" />
                    <span className="font-mono text-xs block truncate max-w-full">{it.url}</span>
                    <span className="text-[10px] text-muted-foreground mt-1 block">Tài liệu liên kết ngoài</span>
                  </div>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}
    </div>
  );
}

/**
 * Lot Detail Modal Component (Floating Pop-up Window v2.8.5 with 4-Zone Bento Grid covering 36 columns)
 * Conforms to Dynamo MES Graphite Wireframe UI Specification v2.7.0/v2.8.0.
 */
export function LotDetailModal({
  item,
  role,
  siblingItems,
  onClose,
  onUpdate,
  onItemChange,
}: LotDetailModalProps) {
  const { locale } = useTranslation();
  const isAdmin = role === 'admin';
  const hasPricingView = canViewPricing(role as Role);
  const auditLogs = auditFor(item.ID_Key);

  // Lightbox & HeatCycle Modal States
  const [lightboxFile, setLightboxFile] = useState<{ url: string; title: string; type: 'image' | 'pdf' } | null>(null);
  const [heatCycleModalOpen, setHeatCycleModalOpen] = useState(false);

  // Search & Navigation States
  const [isSearchingItem, setIsSearchingItem] = useState(false);
  const [searchItemCode, setSearchItemCode] = useState('');
  const [jumpIndex, setJumpIndex] = useState('');
  const [showAudit, setShowAudit] = useState(false);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editReason, setEditReason] = useState('');
  const [form, setForm] = useState({
    // Zone 2: Tech & Dimensions
    vat_lieu: item.vat_lieu || '',
    do_cung: item.do_cung === '—' ? '' : item.do_cung || '',
    kich_thuoc_sp: item.Kich_Thuoc_SP || item.kich_thuoc_sp || '',
    so_luong: item.so_luong ?? 0,
    kg_lot: item.kg_Lot ?? item.kg_lot ?? 0,
    don_vi_tinh: item.don_vi_tinh || 'pcs',
    so_luong_tinh: item.so_luong_tinh ?? item.so_luong ?? 0,
    // Zone 3: Dispatch & Commercial
    so_dat_hang: item.So_DatHang || item.so_dat_hang || '',
    ngay_gui_qt: item.ngay_gui_QT || item.ngay_gui_qt || '',
    trang_thai: item.TrangThai || (item.trang_thai as Status) || 'Chờ xuất xưởng',
    don_gia: item.don_gia ?? 0,
    thanh_tien: item.thanh_tien ?? 0,
    ty_gia: item.ty_gia ?? 1,
    ten_file_dat_hang: item.ten_file_dat_hang || '',
    ghi_chu_khi_gui: item.ghi_chu_khi_gui || item.ghi_chu || '',
    // Zone 4: Vendor Hub
    ncc_ngay_qt: item.ncc_ngay_qt || '',
    ncc_ngay_tra_qt: item.ncc_ngay_tra_qt || '',
    ncc_id_lot_qt: item.ncc_id_lot_qt || '',
    ncc_name_qt: item.ncc_name_qt || '',
    ncc_ket_qua_hrc: item.ncc_ket_qua_hrc || '',
    ncc_ket_qua_qc: item.ncc_ket_qua_qc || '',
    ncc_don_gia: item.ncc_don_gia ?? 0,
    ncc_tatus: item.ncc_tatus || '',
    ncc_thongtinkhac1: item.ncc_thongtinkhac1 || '',
    ncc_thongtinkhac2: item.ncc_thongtinkhac2 || '',
    ncc_giando: item.ncc_giando || '',
    ncc_file1: item.ncc_file1 || '',
  });

  const resetFormFromItem = useCallback((it: QTItem) => {
    setForm({
      vat_lieu: it.vat_lieu || '',
      do_cung: it.do_cung === '—' ? '' : it.do_cung || '',
      kich_thuoc_sp: it.Kich_Thuoc_SP || it.kich_thuoc_sp || '',
      so_luong: it.so_luong ?? 0,
      kg_lot: it.kg_Lot ?? it.kg_lot ?? 0,
      don_vi_tinh: it.don_vi_tinh || 'pcs',
      so_luong_tinh: it.so_luong_tinh ?? it.so_luong ?? 0,
      so_dat_hang: it.So_DatHang || it.so_dat_hang || '',
      ngay_gui_qt: it.ngay_gui_QT || it.ngay_gui_qt || '',
      trang_thai: it.TrangThai || (it.trang_thai as Status) || 'Chờ xuất xưởng',
      don_gia: it.don_gia ?? 0,
      thanh_tien: it.thanh_tien ?? 0,
      ty_gia: it.ty_gia ?? 1,
      ten_file_dat_hang: it.ten_file_dat_hang || '',
      ghi_chu_khi_gui: it.ghi_chu_khi_gui || it.ghi_chu || '',
      ncc_ngay_qt: it.ncc_ngay_qt || '',
      ncc_ngay_tra_qt: it.ncc_ngay_tra_qt || '',
      ncc_id_lot_qt: it.ncc_id_lot_qt || '',
      ncc_name_qt: it.ncc_name_qt || '',
      ncc_ket_qua_hrc: it.ncc_ket_qua_hrc || '',
      ncc_ket_qua_qc: it.ncc_ket_qua_qc || '',
      ncc_don_gia: it.ncc_don_gia ?? 0,
      ncc_tatus: it.ncc_tatus || '',
      ncc_thongtinkhac1: it.ncc_thongtinkhac1 || '',
      ncc_thongtinkhac2: it.ncc_thongtinkhac2 || '',
      ncc_giando: it.ncc_giando || '',
      ncc_file1: it.ncc_file1 || '',
    });
    setEditReason('');
    setIsEditing(false);
    setIsSearchingItem(false);
    setSearchItemCode('');
    setJumpIndex('');
  }, []);

  // Sync form when item changes via navigation
  useEffect(() => {
    resetFormFromItem(item);
  }, [item, resetFormFromItem]);

  // Track Unsaved Changes (isDirty)
  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    return (
      form.vat_lieu !== (item.vat_lieu || '') ||
      form.do_cung !== (item.do_cung === '—' ? '' : (item.do_cung || '')) ||
      form.kich_thuoc_sp !== (item.Kich_Thuoc_SP || item.kich_thuoc_sp || '') ||
      Number(form.so_luong) !== Number(item.so_luong ?? 0) ||
      Number(form.kg_lot) !== Number(item.kg_Lot ?? item.kg_lot ?? 0) ||
      form.don_vi_tinh !== (item.don_vi_tinh || 'pcs') ||
      Number(form.so_luong_tinh) !== Number(item.so_luong_tinh ?? item.so_luong ?? 0) ||
      form.so_dat_hang !== (item.So_DatHang || item.so_dat_hang || '') ||
      form.ngay_gui_qt !== (item.ngay_gui_QT || item.ngay_gui_qt || '') ||
      form.trang_thai !== (item.TrangThai || item.trang_thai || 'Chờ xuất xưởng') ||
      (hasPricingView && (
        Number(form.don_gia) !== Number(item.don_gia ?? 0) ||
        Number(form.thanh_tien) !== Number(item.thanh_tien ?? 0) ||
        Number(form.ty_gia) !== Number(item.ty_gia ?? 1)
      )) ||
      form.ten_file_dat_hang !== (item.ten_file_dat_hang || '') ||
      form.ghi_chu_khi_gui !== (item.ghi_chu_khi_gui || item.ghi_chu || '') ||
      form.ncc_ngay_qt !== (item.ncc_ngay_qt || '') ||
      form.ncc_ngay_tra_qt !== (item.ncc_ngay_tra_qt || '') ||
      form.ncc_id_lot_qt !== (item.ncc_id_lot_qt || '') ||
      form.ncc_name_qt !== (item.ncc_name_qt || '') ||
      form.ncc_ket_qua_hrc !== (item.ncc_ket_qua_hrc || '') ||
      form.ncc_ket_qua_qc !== (item.ncc_ket_qua_qc || '') ||
      Number(form.ncc_don_gia) !== Number(item.ncc_don_gia ?? 0) ||
      form.ncc_tatus !== (item.ncc_tatus || '') ||
      form.ncc_thongtinkhac1 !== (item.ncc_thongtinkhac1 || '') ||
      form.ncc_thongtinkhac2 !== (item.ncc_thongtinkhac2 || '') ||
      form.ncc_giando !== (item.ncc_giando || '') ||
      form.ncc_file1 !== (item.ncc_file1 || '')
    );
  }, [form, item, isEditing, hasPricingView]);

  // Unsaved Changes Guard helper
  const confirmDiscardChanges = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm('Bạn có thay đổi chưa lưu trên lô này. Bạn có chắc chắn muốn hủy bỏ các thay đổi không?');
  }, [isDirty]);

  const handleCancelEdit = useCallback(() => {
    if (confirmDiscardChanges()) {
      resetFormFromItem(item);
    }
  }, [confirmDiscardChanges, item, resetFormFromItem]);

  const handleCloseModal = useCallback(() => {
    if (confirmDiscardChanges()) {
      onClose();
    }
  }, [confirmDiscardChanges, onClose]);

  // Auto-calculation functions for Commercial fields (Thành tiền = SL tính x Đơn giá x Tỷ giá)
  const updateDonGia = useCallback((dg: number) => {
    setForm((f) => {
      const calc = Math.round(Number(f.so_luong_tinh) * Number(dg) * Number(f.ty_gia || 1));
      return { ...f, don_gia: dg, thanh_tien: calc };
    });
  }, []);

  const updateSoLuongTinh = useCallback((slt: number) => {
    setForm((f) => {
      const calc = Math.round(Number(slt) * Number(f.don_gia) * Number(f.ty_gia || 1));
      return { ...f, so_luong_tinh: slt, thanh_tien: calc };
    });
  }, []);

  const updateTyGia = useCallback((tg: number) => {
    setForm((f) => {
      const calc = Math.round(Number(f.so_luong_tinh) * Number(f.don_gia) * Number(tg || 1));
      return { ...f, ty_gia: tg, thanh_tien: calc };
    });
  }, []);

  const updateSoLuong = useCallback((sl: number) => {
    setForm((f) => {
      const newSlt = f.don_vi_tinh === 'Kg' ? f.kg_lot : sl;
      const calc = Math.round(Number(newSlt) * Number(f.don_gia) * Number(f.ty_gia || 1));
      return { ...f, so_luong: sl, so_luong_tinh: newSlt, thanh_tien: calc };
    });
  }, []);

  const updateKgLot = useCallback((kg: number) => {
    setForm((f) => {
      const newSlt = f.don_vi_tinh === 'Kg' ? kg : f.so_luong;
      const calc = Math.round(Number(newSlt) * Number(f.don_gia) * Number(f.ty_gia || 1));
      return { ...f, kg_lot: kg, so_luong_tinh: newSlt, thanh_tien: calc };
    });
  }, []);

  const updateDonViTinh = useCallback((dvt: string) => {
    setForm((f) => {
      const newSlt = dvt === 'Kg' ? f.kg_lot : f.so_luong;
      const calc = Math.round(Number(newSlt) * Number(f.don_gia) * Number(f.ty_gia || 1));
      return { ...f, don_vi_tinh: dvt, so_luong_tinh: newSlt, thanh_tien: calc };
    });
  }, []);

  // Sibling lot navigation
  const currentIndex = useMemo(() => {
    return siblingItems.findIndex((x) => x.ID_Key === item.ID_Key);
  }, [siblingItems, item.ID_Key]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < siblingItems.length - 1;

  const handlePrevLot = useCallback(() => {
    if (hasPrev) {
      if (!confirmDiscardChanges()) return;
      const prev = siblingItems[currentIndex - 1];
      if (prev && onItemChange) {
        onItemChange(prev);
      }
    }
  }, [hasPrev, siblingItems, currentIndex, onItemChange, confirmDiscardChanges]);

  const handleNextLot = useCallback(() => {
    if (hasNext) {
      if (!confirmDiscardChanges()) return;
      const next = siblingItems[currentIndex + 1];
      if (next && onItemChange) {
        onItemChange(next);
      }
    }
  }, [hasNext, siblingItems, currentIndex, onItemChange, confirmDiscardChanges]);

  // Quick search by item code
  const handleSearchItem = useCallback(() => {
    if (!searchItemCode.trim()) {
      setIsSearchingItem(false);
      return;
    }
    if (!confirmDiscardChanges()) return;
    const q = searchItemCode.trim().toLowerCase();
    const matched = siblingItems.find(
      (x) =>
        x.ma_hang.toLowerCase().includes(q) ||
        x.id_ma_hang?.toLowerCase().includes(q) ||
        x.ID_Key.toLowerCase().includes(q)
    );
    if (matched && onItemChange) {
      onItemChange(matched);
      playAudioCue('pop');
      toast.success(`Đã chuyển tới mã hàng ${matched.ma_hang}`);
      setIsSearchingItem(false);
      setSearchItemCode('');
    } else {
      playAudioCue('error');
      toast.error(`Không tìm thấy mã hàng phù hợp với "${searchItemCode}"`);
    }
  }, [searchItemCode, siblingItems, onItemChange, confirmDiscardChanges]);

  // Quick jump by lot index / ID
  const handleJumpLot = useCallback(() => {
    if (!jumpIndex.trim()) return;
    if (!confirmDiscardChanges()) return;
    const raw = jumpIndex.trim();
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num >= 1 && num <= siblingItems.length) {
      const target = siblingItems[num - 1];
      if (target && onItemChange) {
        onItemChange(target);
        playAudioCue('pop');
        toast.success(`Đã chuyển tới lô thứ ${num}`);
        setJumpIndex('');
        return;
      }
    }
    const byId = siblingItems.find((x) => x.ID_Key.toLowerCase() === raw.toLowerCase());
    if (byId && onItemChange) {
      onItemChange(byId);
      playAudioCue('pop');
      toast.success(`Đã chuyển tới lô ${byId.ID_Key}`);
      setJumpIndex('');
      return;
    }
    toast.error(`Số thứ tự phải từ 1 đến ${siblingItems.length}`);
  }, [jumpIndex, siblingItems, onItemChange, confirmDiscardChanges]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevLot();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextLot();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (lightboxFile) {
          setLightboxFile(null);
          return;
        }
        if (heatCycleModalOpen) {
          setHeatCycleModalOpen(false);
          return;
        }
        handleCloseModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevLot, handleNextLot, handleCloseModal, lightboxFile, heatCycleModalOpen]);

  // Handle save changes
  const handleSave = () => {
    const changes: Record<string, [any, any]> = {};

    // Compute diffs
    if (form.vat_lieu !== item.vat_lieu) changes['Vật liệu'] = [item.vat_lieu, form.vat_lieu];
    if (form.do_cung !== item.do_cung) changes['Độ cứng'] = [item.do_cung, form.do_cung];
    if (form.kich_thuoc_sp !== (item.Kich_Thuoc_SP || item.kich_thuoc_sp || '')) {
      changes['Kích thước SP'] = [item.Kich_Thuoc_SP || item.kich_thuoc_sp || '', form.kich_thuoc_sp];
    }
    if (Number(form.so_luong) !== Number(item.so_luong)) changes['Số lượng'] = [item.so_luong, Number(form.so_luong)];
    if (Number(form.kg_lot) !== Number(item.kg_Lot ?? item.kg_lot)) {
      changes['Khối lượng'] = [item.kg_Lot ?? item.kg_lot, Number(form.kg_lot)];
    }
    if (form.don_vi_tinh !== item.don_vi_tinh) changes['Đơn vị tính'] = [item.don_vi_tinh, form.don_vi_tinh];
    if (Number(form.so_luong_tinh) !== Number(item.so_luong_tinh)) {
      changes['SL tính'] = [item.so_luong_tinh, Number(form.so_luong_tinh)];
    }
    if (form.so_dat_hang !== (item.So_DatHang || item.so_dat_hang)) {
      changes['Số ĐH'] = [item.So_DatHang || item.so_dat_hang, form.so_dat_hang];
    }
    if (form.ngay_gui_qt !== (item.ngay_gui_QT || item.ngay_gui_qt)) {
      changes['Ngày gửi'] = [item.ngay_gui_QT || item.ngay_gui_qt, form.ngay_gui_qt];
    }
    if (form.trang_thai !== (item.TrangThai || item.trang_thai)) {
      changes['Trạng thái'] = [item.TrangThai || item.trang_thai, form.trang_thai];
    }
    if (hasPricingView) {
      if (Number(form.don_gia) !== Number(item.don_gia)) changes['Đơn giá'] = [item.don_gia, Number(form.don_gia)];
      if (Number(form.thanh_tien) !== Number(item.thanh_tien)) {
        changes['Thành tiền'] = [item.thanh_tien, Number(form.thanh_tien)];
      }
      if (Number(form.ty_gia) !== Number(item.ty_gia || 1)) changes['Tỷ giá'] = [item.ty_gia, Number(form.ty_gia)];
    }
    if (form.ten_file_dat_hang !== (item.ten_file_dat_hang || '')) {
      changes['File ĐH'] = [item.ten_file_dat_hang, form.ten_file_dat_hang];
    }
    if (form.ghi_chu_khi_gui !== (item.ghi_chu_khi_gui || item.ghi_chu || '')) {
      changes['Ghi chú'] = [item.ghi_chu_khi_gui || item.ghi_chu, form.ghi_chu_khi_gui];
    }
    // Vendor fields
    if (form.ncc_ngay_qt !== (item.ncc_ngay_qt || '')) changes['NCC Ngày QT'] = [item.ncc_ngay_qt, form.ncc_ngay_qt];
    if (form.ncc_ngay_tra_qt !== (item.ncc_ngay_tra_qt || '')) {
      changes['NCC Hạn trả'] = [item.ncc_ngay_tra_qt, form.ncc_ngay_tra_qt];
    }
    if (form.ncc_id_lot_qt !== (item.ncc_id_lot_qt || '')) changes['NCC Lô QT'] = [item.ncc_id_lot_qt, form.ncc_id_lot_qt];
    if (form.ncc_name_qt !== (item.ncc_name_qt || '')) changes['NCC KTV'] = [item.ncc_name_qt, form.ncc_name_qt];
    if (form.ncc_ket_qua_hrc !== (item.ncc_ket_qua_hrc || '')) {
      changes['NCC HRC'] = [item.ncc_ket_qua_hrc, form.ncc_ket_qua_hrc];
    }
    if (form.ncc_ket_qua_qc !== (item.ncc_ket_qua_qc || '')) {
      changes['NCC QC'] = [item.ncc_ket_qua_qc, form.ncc_ket_qua_qc];
    }
    if (Number(form.ncc_don_gia) !== Number(item.ncc_don_gia || 0)) {
      changes['NCC Đơn giá'] = [item.ncc_don_gia, Number(form.ncc_don_gia)];
    }
    if (form.ncc_tatus !== (item.ncc_tatus || '')) changes['NCC Tiến độ'] = [item.ncc_tatus, form.ncc_tatus];
    if (form.ncc_thongtinkhac1 !== (item.ncc_thongtinkhac1 || '')) {
      changes['NCC Ghi chú 1'] = [item.ncc_thongtinkhac1, form.ncc_thongtinkhac1];
    }
    if (form.ncc_thongtinkhac2 !== (item.ncc_thongtinkhac2 || '')) {
      changes['NCC Ghi chú 2'] = [item.ncc_thongtinkhac2, form.ncc_thongtinkhac2];
    }
    if (form.ncc_giando !== (item.ncc_giando || '')) changes['Giản đồ'] = [item.ncc_giando, form.ncc_giando];
    if (form.ncc_file1 !== (item.ncc_file1 || '')) changes['Chứng chỉ QT'] = [item.ncc_file1, form.ncc_file1];

    if (Object.keys(changes).length === 0) {
      toast.info('Không có thay đổi nào để lưu.');
      setIsEditing(false);
      return;
    }

    const patch: Partial<QTItem> = {
      vat_lieu: form.vat_lieu,
      do_cung: form.do_cung,
      Kich_Thuoc_SP: form.kich_thuoc_sp,
      kich_thuoc_sp: form.kich_thuoc_sp,
      so_luong: Number(form.so_luong),
      kg_Lot: Number(form.kg_lot),
      kg_lot: Number(form.kg_lot),
      don_vi_tinh: form.don_vi_tinh,
      so_luong_tinh: Number(form.so_luong_tinh),
      So_DatHang: form.so_dat_hang,
      so_dat_hang: form.so_dat_hang,
      ngay_gui_QT: form.ngay_gui_qt,
      ngay_gui_qt: form.ngay_gui_qt,
      TrangThai: form.trang_thai as Status,
      trang_thai: form.trang_thai,
      ten_file_dat_hang: form.ten_file_dat_hang,
      ghi_chu_khi_gui: form.ghi_chu_khi_gui,
      ghi_chu: form.ghi_chu_khi_gui,
      ncc_ngay_qt: form.ncc_ngay_qt,
      ncc_ngay_tra_qt: form.ncc_ngay_tra_qt,
      han_tra: form.ncc_ngay_tra_qt || item.han_tra,
      ncc_id_lot_qt: form.ncc_id_lot_qt,
      ncc_name_qt: form.ncc_name_qt,
      ncc_ket_qua_hrc: form.ncc_ket_qua_hrc,
      ncc_ket_qua_qc: form.ncc_ket_qua_qc,
      ncc_don_gia: Number(form.ncc_don_gia),
      ncc_tatus: form.ncc_tatus,
      ncc_thongtinkhac1: form.ncc_thongtinkhac1,
      ncc_thongtinkhac2: form.ncc_thongtinkhac2,
      ncc_giando: form.ncc_giando,
      ncc_file1: form.ncc_file1,
    };

    if (hasPricingView) {
      patch.don_gia = Number(form.don_gia);
      patch.thanh_tien = Number(form.thanh_tien);
      patch.ty_gia = Number(form.ty_gia);
    }

    appendAudit({
      lotId: item.ID_Key,
      user: isAdmin ? 'Admin' : role,
      role,
      changes,
      reason: editReason.trim() || 'Cập nhật trực tiếp từ cửa sổ chi tiết lô',
    });

    onUpdate(patch);
    playAudioCue('success');
    toast.success(`Đã cập nhật thành công ${Object.keys(changes).length} trường thông tin.`);
    setIsEditing(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={(e) => {
        if (lightboxFile || heatCycleModalOpen) return;
        if (e.target === e.currentTarget) {
          handleCloseModal();
        }
      }}
    >
      <div
        className="w-[96vw] max-w-6xl max-h-[92vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl flex flex-col overflow-hidden text-foreground animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Sticky Header */}
        <div className="px-4 py-3 sm:px-5 border-b border-border bg-slate-50/80 dark:bg-card/90 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground/90 bg-muted px-2 py-0.5 rounded-xs border border-border/60">
                {item.ID_Key}
              </span>
              {item.phong_sx && (
                <span className="text-[10.5px] px-2 py-0.5 rounded-xs bg-secondary border border-border/40 font-semibold text-muted-foreground">
                  Phân xưởng {item.phong_sx}
                </span>
              )}
              <span className="text-[10.5px] px-2 py-0.5 rounded-xs bg-primary/10 text-primary border border-primary/20 font-bold">
                {item.TrangThai || item.trang_thai || 'Chờ xuất xưởng'}
              </span>
            </div>

            {/* Title with Click-to-Search Inline Feature */}
            <div className="flex items-center gap-2 mt-0.5">
              {isSearchingItem ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={searchItemCode}
                    onChange={(e) => setSearchItemCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSearchItem();
                      if (e.key === 'Escape') setIsSearchingItem(false);
                    }}
                    placeholder="Nhập mã hàng cần tìm (VD: 9075-P3)..."
                    className="h-7 w-64 px-2 text-xs font-mono rounded-xs border-2 border-primary bg-background text-foreground outline-none shadow-xs"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSearchItem}
                    className="px-2 py-1 text-xs font-semibold rounded-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                  >
                    Tìm
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSearchingItem(false)}
                    className="px-1.5 py-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <h2
                  onClick={() => {
                    setSearchItemCode(item.ma_hang);
                    setIsSearchingItem(true);
                  }}
                  className="text-lg sm:text-xl font-bold tracking-tight text-foreground flex items-center gap-1.5 cursor-pointer hover:text-primary transition group/mh"
                  title="Nhấp để tìm kiếm nhanh mã hàng khác"
                >
                  <span className="font-mono">{item.ma_hang}</span>
                  <Search size={13} className="text-muted-foreground opacity-60 group-hover/mh:opacity-100 group-hover/mh:text-primary transition" />
                </h2>
              )}

              <span className="text-xs text-muted-foreground font-mono">
                · PO: <b>{item.So_DatHang || item.so_dat_hang || '—'}</b>
              </span>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 rounded-xs border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Hủy</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 rounded-xs bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-2xs"
                >
                  <Save size={12} />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  playAudioCue('pop');
                }}
                className="inline-flex items-center gap-1.5 rounded-xs border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer shadow-2xs"
              >
                <Edit2 size={13} className="text-primary" />
                <span>Chỉnh sửa</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-xs p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body: 4-Zone Bento Grid covering 36 Columns */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {/* Bento Grid: 4 Scientific Zones */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
            {/* ZONE 1: ĐỊNH DANH & BẢN VẼ PHÔI (7 Master Identifiers) */}
            <div className="md:col-span-6 rounded-lg border border-border/80 bg-slate-50/50 dark:bg-card/50 p-3 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-primary rounded-xs" />
                    <span>1. ĐỊNH DANH & BẢN VẼ PHÔI</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                    <Lock size={10} className="text-muted-foreground/60" />
                    <span>7 Master Identifiers</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Mã hàng */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Mã hàng</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs font-bold text-foreground block mt-0.5">{item.ma_hang}</span>
                  </div>

                  {/* Mã bản vẽ / phôi */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Mã BV / Phôi</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground block mt-0.5">{item.id_ma_hang || '—'}</span>
                  </div>

                  {/* Ngày tạo */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Ngày tạo</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs text-muted-foreground block mt-0.5">{date(item.ngay_tao) || '—'}</span>
                  </div>

                  {/* Người tạo - Khóa 100% 7 Master Identifiers */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Người tạo</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs text-foreground block mt-0.5">{item.nguoi_tao || '—'}</span>
                  </div>

                  {/* Quốc gia */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Quốc gia</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs text-foreground block mt-0.5">{item.quoc_gia || 'VN'}</span>
                  </div>

                  {/* Phân xưởng */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Phân xưởng</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs font-semibold text-foreground block mt-0.5">{item.phong_sx || '—'}</span>
                  </div>

                  {/* Đối tượng hàng */}
                  <div className="p-2 rounded bg-card/80 border border-border/60 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Đối tượng hàng</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs text-foreground block mt-0.5">{item.doi_tuong_hang || '—'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ZONE 2: THÔNG SỐ KỸ THUẬT & KÍCH THƯỚC (7 cột) */}
            <div className="md:col-span-6 rounded-lg border border-border/80 bg-slate-50/50 dark:bg-card/50 p-3 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-amber-500 rounded-xs" />
                    <span>2. THÔNG SỐ KỸ THUẬT & KÍCH THƯỚC</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">Quy chuẩn xưởng</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Mác thép / Vật liệu */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Mác thép / Vật liệu</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.vat_lieu}
                        onChange={(e) => setForm((f) => ({ ...f, vat_lieu: e.target.value }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono font-bold rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs font-bold text-foreground block mt-0.5">{item.vat_lieu}</span>
                    )}
                  </div>

                  {/* Độ cứng yêu cầu */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Độ cứng yêu cầu (HRC)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.do_cung}
                        onChange={(e) => setForm((f) => ({ ...f, do_cung: e.target.value }))}
                        placeholder="VD: 47±1"
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono font-bold text-rose-600 rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded-xs font-mono text-xs font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        {item.do_cung && item.do_cung !== '—' ? `${item.do_cung} HRC` : '—'}
                      </span>
                    )}
                  </div>

                  {/* Kích thước sản phẩm */}
                  <div className="p-2 rounded bg-card/80 border border-border/60 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Quy cách kích thước SP</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.kich_thuoc_sp}
                        onChange={(e) => setForm((f) => ({ ...f, kich_thuoc_sp: e.target.value }))}
                        placeholder="VD: Ø30x120, 93*27*72..."
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{item.Kich_Thuoc_SP || item.kich_thuoc_sp || '—'}</span>
                    )}
                  </div>

                  {/* Gom hàng 3 ô cân đối: Số lượng xuất | Khối lượng lô (kg) | SL tính tiền */}
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                    {/* Số lượng */}
                    <div className="p-2 rounded bg-card/80 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Số lượng xuất</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            value={form.so_luong}
                            onChange={(e) => updateSoLuong(Number(e.target.value))}
                            className="w-full min-w-0 h-6 px-1.5 text-xs font-mono font-bold rounded-xs border border-primary bg-background"
                          />
                          <select
                            value={form.don_vi_tinh}
                            onChange={(e) => updateDonViTinh(e.target.value)}
                            className="w-14 shrink-0 h-6 px-1 text-xs font-mono rounded-xs border border-primary bg-background text-foreground"
                          >
                            <option value="pcs">pcs</option>
                            <option value="chi tiết">chi tiết</option>
                            <option value="Kg">Kg</option>
                            <option value="bộ">bộ</option>
                          </select>
                        </div>
                      ) : (
                        <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
                          {number(item.so_luong)} {item.don_vi_tinh || 'chi tiết'}
                        </span>
                      )}
                    </div>

                    {/* Khối lượng (kg) */}
                    <div className="p-2 rounded bg-card/80 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Khối lượng lô (kg)</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.1"
                          value={form.kg_lot}
                          onChange={(e) => updateKgLot(Number(e.target.value))}
                          className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono font-bold rounded-xs border border-primary bg-background"
                        />
                      ) : (
                        <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
                          {number(item.kg_Lot ?? item.kg_lot ?? 0, 1)} kg
                        </span>
                      )}
                    </div>

                    {/* SL Tính tiền */}
                    <div className="p-2 rounded bg-card/80 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">SL Tính tiền</span>
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          value={form.so_luong_tinh}
                          onChange={(e) => updateSoLuongTinh(Number(e.target.value))}
                          className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                        />
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground block mt-0.5">
                          {number(item.so_luong_tinh || (item.don_vi_tinh === 'Kg' ? (item.kg_lot || item.kg_Lot) : item.so_luong), 2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ZONE 3: TIẾN ĐỘ, ĐƠN GIÁ & HỒ SƠ PO (9 cột) */}
            <div className="md:col-span-6 rounded-lg border border-border/80 bg-slate-50/50 dark:bg-card/50 p-3 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-blue-500 rounded-xs" />
                    <span>3. TIẾN ĐỘ, ĐƠN GIÁ & HỒ SƠ PO</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">Đơn vị & Thương mại</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* Đối tác gia công */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block flex items-center gap-1">
                      <span>Đối tác gia công</span>
                      <Lock size={9} className="text-muted-foreground/50" />
                    </span>
                    <span className="font-mono text-xs font-bold text-primary block mt-0.5">
                      {formatVendorName(item.cty_QT || item.cty_qt, role as Role)}
                    </span>
                  </div>

                  {/* Trạng thái luân chuyển */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Trạng thái luân chuyển</span>
                    {isEditing ? (
                      <select
                        value={form.trang_thai}
                        onChange={(e) => setForm((f) => ({ ...f, trang_thai: e.target.value as Status }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background text-foreground"
                      >
                        <option value="Chờ xuất xưởng">Chờ xuất xưởng</option>
                        <option value="Đang tại Vendor">Đang tại Vendor</option>
                        <option value="Kiểm tra QC">Kiểm tra QC</option>
                        <option value="Đã nhập kho">Đã nhập kho</option>
                      </select>
                    ) : (
                      <span className="font-mono text-xs font-semibold text-foreground block mt-0.5">
                        {item.TrangThai || item.trang_thai || 'Chờ xuất xưởng'}
                      </span>
                    )}
                  </div>

                  {/* Số ĐH (PO) */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Số đơn hàng (PO)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.so_dat_hang}
                        onChange={(e) => setForm((f) => ({ ...f, so_dat_hang: e.target.value }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{item.So_DatHang || item.so_dat_hang || '—'}</span>
                    )}
                  </div>

                  {/* File PO đính kèm */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">File PO đính kèm</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ten_file_dat_hang}
                        onChange={(e) => setForm((f) => ({ ...f, ten_file_dat_hang: e.target.value }))}
                        placeholder="Link file PO hoặc URL..."
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <div className="mt-0.5">
                        <AttachmentHoverPreview
                          rawUrl={item.ten_file_dat_hang}
                          title={`File PO ${item.ma_hang}`}
                          lotCode={item.ma_hang || item.id_ma_hang}
                          onOpenLightbox={setLightboxFile}
                        />
                      </div>
                    )}
                  </div>

                  {/* Ngày gửi QT */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ngày gửi QT</span>
                    {isEditing ? (
                      <DateCell
                        field="ngay_gui_QT"
                        title="Ngày gửi QT"
                        value={form.ngay_gui_qt}
                        canEdit={true}
                        variant="input"
                        onChange={(val) => setForm((f) => ({ ...f, ngay_gui_qt: val }))}
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{date(item.ngay_gui_QT || item.ngay_gui_qt) || '—'}</span>
                    )}
                  </div>

                  {/* Tỷ giá */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tỷ giá</span>
                    {isEditing && hasPricingView ? (
                      <input
                        type="number"
                        step="1"
                        value={form.ty_gia}
                        onChange={(e) => updateTyGia(Number(e.target.value))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono font-bold rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">
                        {hasPricingView ? (item.ty_gia || 1).toLocaleString() : '***'}
                      </span>
                    )}
                  </div>

                  {/* Đơn giá gia công */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Đơn giá gia công</span>
                      {isEditing && hasPricingView && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {money(form.don_gia)}
                        </span>
                      )}
                    </div>
                    {isEditing && hasPricingView ? (
                      <div className="relative mt-0.5">
                        <input
                          type="number"
                          value={form.don_gia}
                          onChange={(e) => updateDonGia(Number(e.target.value))}
                          className="w-full h-6 px-1.5 pr-6 text-xs font-mono font-bold rounded-xs border border-primary bg-background"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground pointer-events-none">₫</span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
                        {hasPricingView ? money(item.don_gia) : '*** ₫'}
                      </span>
                    )}
                  </div>

                  {/* Thành tiền dự kiến */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Thành tiền dự kiến</span>
                      {isEditing && hasPricingView && (
                        <span className="text-[10px] font-mono text-primary font-bold">
                          {money(form.thanh_tien)}
                        </span>
                      )}
                    </div>
                    {isEditing && hasPricingView ? (
                      <div className="relative mt-0.5">
                        <input
                          type="number"
                          value={form.thanh_tien}
                          onChange={(e) => setForm((f) => ({ ...f, thanh_tien: Number(e.target.value) }))}
                          className="w-full h-6 px-1.5 pr-6 text-xs font-mono font-bold text-primary rounded-xs border border-primary bg-background"
                        />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground pointer-events-none">₫</span>
                      </div>
                    ) : (
                      <span className="font-mono text-xs font-bold text-primary block mt-0.5">
                        {hasPricingView ? money(item.thanh_tien) : '*** ₫'}
                      </span>
                    )}
                  </div>

                  {/* Ghi chú khi gửi */}
                  <div className="p-2 rounded bg-card/80 border border-border/60 col-span-2">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Ghi chú khi gửi</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ghi_chu_khi_gui}
                        onChange={(e) => setForm((f) => ({ ...f, ghi_chu_khi_gui: e.target.value }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{item.ghi_chu_khi_gui || item.ghi_chu || '—'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ZONE 4: CỔNG NHÀ CUNG CẤP & QC ĐO KIỂM (12 cột vendor) */}
            <div className="md:col-span-6 rounded-lg border border-border/80 bg-slate-50/50 dark:bg-card/50 p-3 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-border/70 pb-2 mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-xs" />
                    <span>4. CỔNG NHÀ CUNG CẤP & QC ĐO KIỂM</span>
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">12 Cột NCC_*</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {/* NCC Độ cứng thực tế */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">NCC Độ cứng đo thực tế</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ncc_ket_qua_hrc}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_ket_qua_hrc: e.target.value }))}
                        placeholder="VD: 46.5 HRC..."
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono font-bold text-emerald-600 rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs font-bold text-foreground block mt-0.5">
                        {item.ncc_ket_qua_hrc ? `${item.ncc_ket_qua_hrc} HRC` : '— (Chưa đo)'}
                      </span>
                    )}
                  </div>

                  {/* NCC Nghiệm thu QC */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">NCC Nghiệm thu QC</span>
                    {isEditing ? (
                      <select
                        value={form.ncc_ket_qua_qc}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_ket_qua_qc: e.target.value }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background text-foreground"
                      >
                        <option value="">— Chưa nghiệm thu —</option>
                        <option value="PASS">PASS (Đạt yêu cầu)</option>
                        <option value="FAIL">FAIL (Không đạt)</option>
                      </select>
                    ) : (
                      <div className="mt-0.5">
                        {item.ncc_ket_qua_qc === 'PASS' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 size={11} /> PASS
                          </span>
                        ) : item.ncc_ket_qua_qc === 'FAIL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs font-mono text-[10.5px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                            <XCircle size={11} /> FAIL
                          </span>
                        ) : (
                          <span className="font-mono text-muted-foreground text-xs">— (Chưa có)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NCC Ngày vào lò */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">NCC Ngày vào lò</span>
                    {isEditing ? (
                      <DateCell
                        field="ncc_ngay_qt"
                        title="NCC Ngày vào lò"
                        value={form.ncc_ngay_qt}
                        canEdit={true}
                        variant="input"
                        onChange={(val) => setForm((f) => ({ ...f, ncc_ngay_qt: val }))}
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{date(item.ncc_ngay_qt) || '—'}</span>
                    )}
                  </div>

                  {/* NCC Hạn trả cam kết (đồng bộ field="han_tra" và field="ncc_ngay_tra_qt") */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">NCC Hạn trả cam kết</span>
                    {isEditing ? (
                      <DateCell
                        field="ncc_ngay_tra_qt" /* field="han_tra" */
                        title="NCC Hạn trả"
                        value={form.ncc_ngay_tra_qt}
                        canEdit={true}
                        variant="input"
                        onChange={(val) => setForm((f) => ({ ...f, ncc_ngay_tra_qt: val }))}
                      />
                    ) : (
                      <span className="font-mono text-xs font-bold text-foreground block mt-0.5">{date(item.ncc_ngay_tra_qt || item.han_tra) || '—'}</span>
                    )}
                  </div>

                  {/* NCC Lô QT (Mẻ nhiệt) */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Mã mẻ nhiệt (ID Lot NCC)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ncc_id_lot_qt}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_id_lot_qt: e.target.value }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{item.ncc_id_lot_qt || '—'}</span>
                    )}
                  </div>

                  {/* NCC Kỹ thuật viên */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Kỹ thuật viên NCC</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ncc_name_qt}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_name_qt: e.target.value }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{item.ncc_name_qt || '—'}</span>
                    )}
                  </div>

                  {/* Giản đồ nhiệt - ĐỒNG BỘ CHUẨN TRACKING (Hình 1) */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    {isEditing ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Giản đồ nhiệt</span>
                          <button
                            type="button"
                            onClick={() => setHeatCycleModalOpen(true)}
                            className="text-[10.5px] text-primary hover:underline font-semibold cursor-pointer"
                            title="Mở bảng vẽ chu trình nhiệt trực quan"
                          >
                            Sửa với đồ họa
                          </button>
                        </div>
                        <input
                          type="text"
                          value={form.ncc_giando}
                          onChange={(e) => setForm((f) => ({ ...f, ncc_giando: e.target.value }))}
                          placeholder="VD: Q: 1020°C / 2H | T1: 540°C / 5H..."
                          className="w-full h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Giản đồ nhiệt</span>
                        </div>
                        {item.ncc_giando && item.ncc_giando.trim() ? (
                          <HoverCard openDelay={120} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <button
                                type="button"
                                onClick={() => setHeatCycleModalOpen(true)}
                                title="Bấm để xem phóng to chu trình nhiệt luyện"
                                className="inline-flex items-center justify-center h-6 px-1.5 py-0.5 rounded-xs bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 shadow-2xs transition cursor-pointer active:scale-95 select-none"
                              >
                                <div className="w-[74px] h-[18px] flex items-center justify-center pointer-events-none">
                                  <HeatTreatmentCycle
                                    shorthand={item.ncc_giando}
                                    variant="mini"
                                    width={74}
                                    height={18}
                                    showFrame={false}
                                  />
                                </div>
                              </button>
                            </HoverCardTrigger>
                            <HoverCardContent
                              side="top"
                              align="center"
                              sideOffset={6}
                              className="z-50 w-[400px] rounded-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 shadow-xl text-slate-900 dark:text-slate-100 outline-none select-text"
                            >
                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                                <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                                  CHU TRÌNH NHIỆT LUYỆN
                                </span>
                                <span className="font-mono text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                                  {item.ma_hang || item.id_ma_hang}
                                </span>
                              </div>
                              <div className="bg-white p-1 rounded-xs border border-slate-200 dark:border-slate-800 flex justify-center">
                                <HeatTreatmentCycle
                                  shorthand={item.ncc_giando}
                                  width={370}
                                  height={76}
                                  showFrame={true}
                                />
                              </div>
                              <div className="mt-2 flex items-center justify-between font-mono text-[9.5px]">
                                <span className="text-slate-600 dark:text-slate-300 truncate max-w-[280px]" title={item.ncc_giando}>
                                  {item.ncc_giando}
                                </span>
                                <span className="text-slate-400 text-[9px] shrink-0">
                                  Bấm để xem phóng to
                                </span>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        ) : (
                          <span className="font-mono text-muted-foreground/50 text-[11px] block mt-1">—</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Chứng chỉ QT (CO/CQ) - ĐỒNG BỘ TÊN FILE VÀ HOVERCARD NHÚNG IFRAME (Hình 4, 5) */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Chứng chỉ QT (CO/CQ)</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ncc_file1}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_file1: e.target.value }))}
                        placeholder="Link file PDF hoặc ảnh chứng chỉ..."
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <div className="mt-0.5">
                        <AttachmentHoverPreview
                          rawUrl={item.ncc_file1}
                          title={`Chứng chỉ QT ${item.ma_hang}`}
                          lotCode={item.ma_hang || item.id_ma_hang}
                          onOpenLightbox={setLightboxFile}
                        />
                      </div>
                    )}
                  </div>

                  {/* NCC Báo giá */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Báo giá NCC</span>
                    {isEditing && hasPricingView ? (
                      <input
                        type="number"
                        value={form.ncc_don_gia}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_don_gia: Number(e.target.value) }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">
                        {hasPricingView && item.ncc_don_gia ? money(item.ncc_don_gia) : '—'}
                      </span>
                    )}
                  </div>

                  {/* Tiến độ NCC */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tiến độ NCC</span>
                    {isEditing ? (
                      <select
                        value={form.ncc_tatus}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_tatus: e.target.value }))}
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background text-foreground"
                      >
                        <option value="">— Chưa chọn —</option>
                        <option value="WAIT">WAIT (Chờ xử lý)</option>
                        <option value="HEAT">HEAT (Đang nhiệt)</option>
                        <option value="TRANSIT">TRANSIT (Đang giao)</option>
                        <option value="DONE">DONE (Hoàn thành)</option>
                      </select>
                    ) : (
                      <div className="mt-0.5">
                        {item.ncc_tatus === 'WAIT' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs font-mono text-[10.5px] font-semibold bg-slate-100 text-slate-700 dark:bg-muted dark:text-muted-foreground border border-border">
                            WAIT
                          </span>
                        ) : item.ncc_tatus === 'HEAT' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs font-mono text-[10.5px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            HEAT
                          </span>
                        ) : item.ncc_tatus === 'TRANSIT' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs font-mono text-[10.5px] font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                            TRANSIT
                          </span>
                        ) : item.ncc_tatus === 'DONE' ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-xs font-mono text-[10.5px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            DONE
                          </span>
                        ) : item.ncc_tatus ? (
                          <span className="font-mono text-xs text-foreground">{item.ncc_tatus}</span>
                        ) : (
                          <span className="font-mono text-xs text-muted-foreground/60">—</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* NCC Ghi chú 1 */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">NCC Ghi chú 1</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ncc_thongtinkhac1}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_thongtinkhac1: e.target.value }))}
                        placeholder="Ghi chú kỹ thuật khác..."
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{item.ncc_thongtinkhac1 || '—'}</span>
                    )}
                  </div>

                  {/* NCC Ghi chú 2 */}
                  <div className="p-2 rounded bg-card/80 border border-border/60">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">NCC Ghi chú 2</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={form.ncc_thongtinkhac2}
                        onChange={(e) => setForm((f) => ({ ...f, ncc_thongtinkhac2: e.target.value }))}
                        placeholder="Ghi chú đóng gói / giao hàng..."
                        className="w-full mt-0.5 h-6 px-1.5 text-xs font-mono rounded-xs border border-primary bg-background"
                      />
                    ) : (
                      <span className="font-mono text-xs text-foreground block mt-0.5">{item.ncc_thongtinkhac2 || '—'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Accordion: NHẬT KÝ THAY ĐỔI & AUDIT TRAIL */}
          <div className="rounded-lg border border-border/70 bg-card overflow-hidden shadow-2xs">
            <button
              type="button"
              onClick={() => setShowAudit(!showAudit)}
              className="w-full px-3.5 py-2 bg-secondary/30 hover:bg-secondary/60 flex items-center justify-between text-xs font-semibold text-foreground/80 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[11px] tracking-wide text-foreground">NHẬT KÝ THAY ĐỔI & AUDIT TRAIL</span>
                <span className="font-mono text-[10px] text-muted-foreground px-1.5 py-0.2 rounded bg-muted border border-border/50">
                  {auditLogs.length} bản ghi
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span>{showAudit ? 'Thu gọn' : 'Xem lịch sử'}</span>
                {showAudit ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {showAudit && (
              <div className="p-3 border-t border-border/60 bg-background/50 max-h-48 overflow-y-auto space-y-2 text-[11px]">
                {auditLogs.length ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="border-l-2 border-primary/70 pl-2.5 py-1 bg-secondary/25 rounded-r pr-2 shadow-2xs">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                        <span>{new Date(log.at).toLocaleString(locale === 'ja' ? 'ja-JP' : locale === 'en' ? 'en-US' : 'vi-VN')}</span>
                        <span className="font-bold text-foreground/85 px-1.5 py-0.2 bg-muted rounded-xs text-[9px] border border-border/40">
                          {log.user} ({log.role})
                        </span>
                      </div>
                      <p className="font-medium text-foreground mt-0.5 font-mono text-[11px]">
                        {Object.entries(log.changes)
                          .map(([k, [oldV, newV]]) => `${k}: "${oldV}" → "${newV}"`)
                          .join('; ')}
                      </p>
                      {log.reason && (
                        <p className="text-muted-foreground/80 text-[10px] italic mt-0.5">
                          Lý do: {log.reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground italic p-3 text-center">
                    Chưa có thay đổi nào được ghi nhận cho lô này.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-t border-border bg-slate-50 dark:bg-card/80 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
          {/* Sibling navigation with Quick Jump by Index / ID */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!hasPrev}
              onClick={handlePrevLot}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
              title="Xem lô trước (Mũi tên trái)"
            >
              <ChevronLeft size={14} />
              <span>Lô trước</span>
            </button>

            {/* Quick Jump Input */}
            <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50">
              <input
                type="text"
                value={jumpIndex}
                onChange={(e) => setJumpIndex(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJumpLot()}
                placeholder={currentIndex >= 0 ? `${currentIndex + 1}` : '1'}
                className="w-12 text-center h-6 font-mono font-bold text-foreground bg-card border border-border/80 rounded-xs px-1 text-xs outline-none focus:border-primary shadow-2xs"
                title="Gõ số thứ tự hoặc ID lô rồi bấm Enter để nhảy nhanh"
              />
              <span>/ {siblingItems.length}</span>
            </div>

            <button
              type="button"
              disabled={!hasNext}
              onClick={handleNextLot}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer shadow-2xs"
              title="Xem lô sau (Mũi tên phải)"
            >
              <span>Lô sau</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5">
            <JobTicketButton
              item={item}
              role={role as Role}
              variant="button"
              siblingItems={siblingItems}
              disabled={isDirty}
            />
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shadow-2xs"
                >
                  <RotateCcw size={13} />
                  <span>Hủy</span>
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold hover:bg-primary/90 transition cursor-pointer shadow-2xs"
                >
                  <Save size={13} />
                  <span>Lưu thay đổi</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shadow-2xs"
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Lightbox Modal for Fullscreen File Viewing */}
      <FileLightboxModal previewFile={lightboxFile} onClose={() => setLightboxFile(null)} />

      {/* Embedded Heat Cycle Modal for Interactive Diagram Configuration */}
      {heatCycleModalOpen && (
        <HeatCycleModal
          isOpen={heatCycleModalOpen}
          value={isEditing ? form.ncc_giando : (item.ncc_giando || '')}
          canEdit={isEditing}
          lotCode={item.ma_hang || item.id_ma_hang}
          workshop={item.phong_sx}
          material={item.vat_lieu}
          requiredHardness={item.do_cung}
          onClose={() => setHeatCycleModalOpen(false)}
          onSave={(newShorthand) => {
            setForm((f) => ({ ...f, ncc_giando: newShorthand }));
            if (!isEditing) {
              onUpdate({ ncc_giando: newShorthand });
            }
            toast.success('Đã cập nhật giản đồ chu trình nhiệt luyện');
            setHeatCycleModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
