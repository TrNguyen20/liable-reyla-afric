import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PackageOpen,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useTranslation } from '@/i18n';
import {
  date,
  money,
  number,
  type QTItem,
  type Status,
  type Vendor,
} from '@/lib/dynamo-data';
import { formatVendorName, canViewPricing, type Role } from '@/lib/dynamo-auth';
import { auditFor, appendAudit } from '@/lib/dynamo-workflow';
import { playAudioCue } from '@/lib/audio-cues';
import { JobTicketButton } from '@/components/job-ticket';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { DateCell } from '@/components/tracking/date-cell';
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
 * Lot Detail Modal Component (Floating Pop-up Window v2.7.0 with 2-Column Bento Grid)
 * Conforms to Dynamo MES Graphite Wireframe UI Specification v2.7.0.
 */
export function LotDetailModal({
  item,
  role,
  siblingItems,
  onClose,
  onUpdate,
  onItemChange,
}: LotDetailModalProps) {
  const { t, locale } = useTranslation();
  const canEdit = true;
  const isAdmin = role === 'admin';
  const auditLogs = auditFor(item.ID_Key);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    ma_hang: item.ma_hang,
    So_DatHang: item.So_DatHang,
    vat_lieu: item.vat_lieu,
    do_cung: item.do_cung === '—' ? '' : item.do_cung,
    so_luong: item.so_luong,
    kg_Lot: item.kg_Lot,
    cty_QT: item.cty_QT,
    ngay_gui_QT: item.ngay_gui_QT,
    han_tra: item.han_tra,
    Kich_Thuoc_SP: item.Kich_Thuoc_SP || '',
    TrangThai: item.TrangThai,
  });
  const [editReason, setEditReason] = useState('');

  // Sync form when item changes via sibling navigation
  useEffect(() => {
    setForm({
      ma_hang: item.ma_hang,
      So_DatHang: item.So_DatHang,
      vat_lieu: item.vat_lieu,
      do_cung: item.do_cung === '—' ? '' : item.do_cung,
      so_luong: item.so_luong,
      kg_Lot: item.kg_Lot,
      cty_QT: item.cty_QT,
      ngay_gui_QT: item.ngay_gui_QT,
      han_tra: item.han_tra,
      Kich_Thuoc_SP: item.Kich_Thuoc_SP || '',
      TrangThai: item.TrangThai,
    });
    setEditReason('');
    setIsEditing(false);
  }, [item]);

  // Sibling lot navigation
  const currentIndex = useMemo(() => {
    return siblingItems.findIndex((x) => x.ID_Key === item.ID_Key);
  }, [siblingItems, item.ID_Key]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < siblingItems.length - 1;

  const handlePrevLot = useCallback(() => {
    if (hasPrev) {
      const prev = siblingItems[currentIndex - 1];
      if (prev && onItemChange) {
        onItemChange(prev);
      }
    }
  }, [hasPrev, siblingItems, currentIndex, onItemChange]);

  const handleNextLot = useCallback(() => {
    if (hasNext) {
      const next = siblingItems[currentIndex + 1];
      if (next && onItemChange) {
        onItemChange(next);
      }
    }
  }, [hasNext, siblingItems, currentIndex, onItemChange]);

  // Keyboard navigation shortcuts
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
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrevLot, handleNextLot, onClose]);

  const handleSave = () => {
    if (!form.ma_hang.trim()) {
      toast.error('Mã hàng không được để trống.');
      return;
    }
    const patch: Partial<QTItem> = {
      ma_hang: form.ma_hang.trim(),
      So_DatHang: form.So_DatHang.trim(),
      vat_lieu: form.vat_lieu.trim() || '—',
      do_cung: form.do_cung.trim() || '—',
      so_luong: Math.max(1, Number(form.so_luong) || item.so_luong),
      kg_Lot: Math.max(0.1, Number(form.kg_Lot) || item.kg_Lot),
      cty_QT: form.cty_QT,
      ngay_gui_QT: form.ngay_gui_QT,
      han_tra: form.han_tra,
      han_tra_est: false,
      Kich_Thuoc_SP: form.Kich_Thuoc_SP.trim(),
      TrangThai: form.TrangThai,
    };

    onUpdate(patch);
    appendAudit({
      ID_Key: item.ID_Key,
      user: role,
      role,
      from: 'Chi tiết lô',
      to: 'Cập nhật trực tiếp',
      changes: patch as any,
      reason: editReason || 'Chỉnh sửa thông số lô từ bảng chi tiết',
      result: 'ok',
    });
    toast.success(`Đã lưu thay đổi cho lô ${item.ID_Key}`);
    playAudioCue('success');
    setIsEditing(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        className="w-[95vw] max-w-5xl max-h-[90vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl flex flex-col overflow-hidden text-foreground animate-slide-up"
        style={{ borderRadius: '12px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/80 px-5 py-3 select-none shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold">
              <PackageOpen size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-primary px-2 py-0.5 rounded-xs bg-primary/10 border border-primary/20">
                  {item.ID_Key}
                </span>
                <span className="rounded-xs bg-muted px-2 py-0.5 font-bold text-[10px] text-muted-foreground border border-border/60">
                  {t('tracking.workshops.title') || 'Phân xưởng'} {item.phong_sx}
                </span>
                <span className="hidden sm:inline-flex rounded-xs bg-secondary px-2 py-0.5 font-mono text-[10px] font-bold text-foreground/80 border border-border/60">
                  {item.TrangThai}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <h2 className="font-mono text-lg font-black text-foreground">{item.ma_hang}</h2>
                <span className="text-xs text-muted-foreground font-mono">
                  · {t('tracking.columns.orderNo') || 'Đơn hàng'}: <b>{item.So_DatHang}</b>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all cursor-pointer border shadow-2xs flex items-center gap-1.5 ${
                  isEditing
                    ? 'border-primary bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border-border bg-card hover:bg-secondary text-foreground'
                }`}
              >
                <Edit2 size={13} />
                <span>{isEditing ? (t('common.cancel') || 'Hủy sửa') : (t('common.edit') || 'Sửa lô này')}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="size-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition cursor-pointer"
              title={t('common.close') || 'Đóng (Esc)'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-background/50">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Left Column (5 Cols): Technical Specs & Commercial */}
            <div className="md:col-span-5 space-y-4">
              {/* Technical Specifications Bento Card */}
              <div className="rounded-xl border border-slate-200 dark:border-border/80 bg-card p-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
                  <span className="size-2 rounded-full bg-primary" />
                  <span>THÔNG SỐ KỸ THUẬT GIA CÔNG</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider mb-0.5">
                      {t('tracking.columns.material') || 'Mác thép / Vật liệu'}:
                    </span>
                    <span className="font-mono font-bold text-foreground text-sm px-2 py-0.5 rounded-xs bg-muted border border-border/70 inline-block shadow-2xs">
                      {item.vat_lieu || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider mb-0.5">
                      {t('tracking.columns.hardness') || 'Độ cứng yêu cầu'}:
                    </span>
                    {item.do_cung && item.do_cung !== '—' ? (
                      <span className="font-mono text-destructive font-black text-sm px-2 py-0.5 rounded-xs bg-destructive/10 border border-destructive/20 inline-block shadow-2xs">
                        {item.do_cung}
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium text-xs">{t('common.lotUpdate.noDueDate') || 'Chưa có thông số'}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                      {t('tracking.columns.quantity') || 'Số lượng xuất'}:
                    </span>
                    <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                      {number(item.so_luong)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        {item.don_vi_tinh || (t('common.units.items') || 'chi tiết')}
                      </span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                      {t('tracking.columns.weight') || 'Khối lượng lô'}:
                    </span>
                    <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                      {number(item.kg_Lot, 1)} <span className="text-xs font-normal text-muted-foreground">kg</span>
                    </p>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-border/50">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                      {t('common.jobTicket.sec1.size') || 'Quy cách kích thước SP'}:
                    </span>
                    <p className="font-mono font-medium text-foreground mt-0.5">{item.Kich_Thuoc_SP || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Commercial & Logistics Bento Card */}
              <div className="rounded-xl border border-slate-200 dark:border-border/80 bg-card p-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2 mb-3 pb-2 border-b border-border/60">
                  <span className="size-2 rounded-full bg-emerald-500" />
                  <span>TIẾN ĐỘ & ĐỐI TÁC GIA CÔNG</span>
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-2">
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                      {t('tracking.columns.partner') || 'Đơn vị nhận gia công'}:
                    </span>
                    <p className="font-bold text-foreground text-sm mt-0.5">{formatVendorName(item.cty_QT, role as any)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                      {t('tracking.columns.sentDate') || 'Ngày gửi xuất xưởng'}:
                    </span>
                    <p className="font-mono text-foreground mt-0.5">{date(item.ngay_gui_QT)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                      {t('tracking.columns.dueDate') || 'Hạn trả gia công'}:
                    </span>
                    <p className="font-mono font-bold text-foreground mt-0.5">
                      {date(item.ncc_ngay_tra_qt || item.han_tra || '')}
                    </p>
                  </div>

                  {/* Pricing Authorization */}
                  {canViewPricing(role as any) && (
                    <>
                      <div className="pt-2 border-t border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                          {t('common.jobTicket.sec1.unitPrice') || 'Đơn giá gia công'}:
                        </span>
                        <p className="font-mono font-bold text-foreground mt-0.5">
                          {item.don_gia ? money(item.don_gia) : (t('common.lotUpdate.noDueDate') || 'Chưa có giá')}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-border/60">
                        <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                          {t('common.jobTicket.sec1.totalPrice') || 'Thành tiền dự kiến'}:
                        </span>
                        <p className="font-mono font-black text-primary text-sm mt-0.5">
                          {item.thanh_tien ? money(item.thanh_tien) : '—'}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              <div className="flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 p-3.5 shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                    {t('tracking.columns.logistics') || 'Trạng thái luân chuyển'}:
                  </span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{item.TrangThai}</p>
                </div>
                <LotUpdateButton item={item} />
              </div>
            </div>

            {/* Right Column (7 Cols): View Mode or Edit Form */}
            <div className="md:col-span-7 space-y-4">
              {isEditing ? (
                /* Edit Mode Form */
                <div className="rounded-xl border border-primary/40 bg-card p-4 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <h3 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
                      <Edit2 size={14} className="text-primary" />
                      <span>{t('common.lotUpdate.dialogTitle', { lotId: item.ID_Key }) || `Chỉnh sửa thông số lô ${item.ID_Key}`}</span>
                    </h3>
                    <span className="text-[10px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-xs">
                      Chế độ biên tập
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.itemCode') || 'Mã hàng'}:
                      </label>
                      <input
                        type="text"
                        value={form.ma_hang}
                        onChange={(e) => setForm({ ...form, ma_hang: e.target.value })}
                        className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 font-mono text-xs font-bold text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.orderNo') || 'Số đơn hàng'}:
                      </label>
                      <input
                        type="text"
                        value={form.So_DatHang}
                        onChange={(e) => setForm({ ...form, So_DatHang: e.target.value })}
                        className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.material') || 'Mác thép / Vật liệu'}:
                      </label>
                      <input
                        type="text"
                        value={form.vat_lieu}
                        onChange={(e) => setForm({ ...form, vat_lieu: e.target.value })}
                        className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.hardness') || 'Độ cứng yêu cầu'}:
                      </label>
                      <input
                        type="text"
                        value={form.do_cung}
                        onChange={(e) => setForm({ ...form, do_cung: e.target.value })}
                        className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.quantity') || 'Số lượng xuất'}:
                      </label>
                      <input
                        type="number"
                        value={form.so_luong}
                        onChange={(e) => setForm({ ...form, so_luong: Number(e.target.value) })}
                        className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.weight') || 'Khối lượng'} (kg):
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={form.kg_Lot}
                        onChange={(e) => setForm({ ...form, kg_Lot: Number(e.target.value) })}
                        className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                      />
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                          {t('tracking.columns.partner') || 'Đơn vị gia công'}:
                        </label>
                        <select
                          value={form.cty_QT}
                          onChange={(e) => setForm({ ...form, cty_QT: e.target.value as Vendor })}
                          className="w-full rounded-xs border border-input bg-background px-2 py-1.5 text-xs text-foreground font-semibold"
                        >
                          <option value="YAMAICHI">YAMAICHI</option>
                          <option value="PROVISION">PROVISION</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.logistics') || 'Trạng thái luân chuyển'}:
                      </label>
                      <select
                        value={form.TrangThai}
                        onChange={(e) => setForm({ ...form, TrangThai: e.target.value as Status })}
                        className="w-full rounded-xs border border-input bg-background px-2 py-1.5 text-xs text-foreground font-semibold"
                      >
                        <option value="Chờ xuất xưởng">{t('tracking.status.waitLabel') || 'Chờ xuất xưởng'}</option>
                        <option value="Đang tại Vendor">{t('tracking.status.transitLabel') || 'Đang tại Vendor'}</option>
                        <option value="Đã nhập kho">{t('tracking.status.stockedLabel') || 'Đã nhập kho'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.sentDate') || 'Ngày gửi QT'}:
                      </label>
                      <input
                        type="date"
                        value={form.ngay_gui_QT}
                        onChange={(e) => setForm({ ...form, ngay_gui_QT: e.target.value })}
                        className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 text-xs text-foreground font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                        {t('tracking.columns.dueDate') || 'Hạn trả gia công'}:
                      </label>
                      <DateCell
                        field="han_tra"
                        title={t('tracking.columns.dueDate') || 'Hạn trả gia công'}
                        value={form.han_tra}
                        canEdit={true}
                        className="border border-input bg-background"
                        onChange={(val) => setForm({ ...form, han_tra: val })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                      {t('common.jobTicket.sec1.size') || 'Kích thước sản phẩm'}:
                    </label>
                    <input
                      type="text"
                      value={form.Kich_Thuoc_SP}
                      placeholder={t('tracking.drawer.sizePlaceholder') || 'VD: Ø30x120, 45x60x12...'}
                      onChange={(e) => setForm({ ...form, Kich_Thuoc_SP: e.target.value })}
                      className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                      {t('common.lotUpdate.reasonLabel') || 'Lý do thay đổi'}:
                    </label>
                    <input
                      type="text"
                      value={editReason}
                      placeholder={t('common.lotUpdate.reasonPlaceholder') || 'VD: Cập nhật mã hàng thực tế xưởng...'}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold hover:bg-secondary cursor-pointer transition"
                    >
                      {t('common.cancel') || 'Hủy'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs transition"
                    >
                      {t('common.save') || 'Lưu thay đổi lô này'}
                    </button>
                  </div>
                </div>
              ) : (
                /* View Mode: Vendor Hub & Audit Trail */
                <>
                  {/* Vendor Feedback Hub Bento Card */}
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 shadow-xs text-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                      <span className="font-mono text-xs font-black uppercase text-primary tracking-wide">
                        CỔNG PHẢN HỒI NHÀ CUNG CẤP (VENDOR 2-WAY HUB)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm bg-primary/20 text-primary">
                        NCC: {item.cty_qt || item.cty_QT}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Độ cứng HRC thực tế đo:</span>
                        <span className="font-mono font-bold text-foreground text-xs">{item.ncc_ket_qua_hrc || '— (Chưa cập nhật)'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Kết quả nghiệm thu NCC:</span>
                        <span className={`font-mono font-bold ${item.ncc_ket_qua_qc === 'PASS' ? 'text-run' : 'text-muted-foreground'}`}>
                          {item.ncc_ket_qua_qc || '— (Chưa có)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Ngày đối tác vào lò:</span>
                        <span className="font-mono text-foreground">{item.ncc_ngay_qt ? date(item.ncc_ngay_qt) : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Ngày hẹn trả của NCC:</span>
                        <span className="font-mono text-foreground">{item.ncc_ngay_tra_qt ? date(item.ncc_ngay_tra_qt) : '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Mã mẻ nhiệt (ID Lot NCC):</span>
                        <span className="font-mono text-foreground">{item.ncc_id_lot_qt || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Kỹ thuật viên NCC:</span>
                        <span className="text-foreground">{item.ncc_name_qt || '—'}</span>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-border/40 flex items-center justify-between">
                        <span className="text-muted-foreground text-[10px] uppercase font-bold">Giản đồ nhiệt & File CHỨNG CHỈ QT:</span>
                        <div className="flex gap-2">
                          {item.ncc_giando ? (
                            <a href={item.ncc_giando} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[10px] font-bold">
                              [Xem giản đồ]
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 text-[10px] italic">Không có giản đồ</span>
                          )}
                          {item.ncc_file1 ? (
                            <a href={item.ncc_file1} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[10px] font-bold">
                              [Tải file QC]
                            </a>
                          ) : (
                            <span className="text-muted-foreground/60 text-[10px] italic">Không có file QC</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Audit History Timeline */}
                  <div className="rounded-xl border border-slate-200 dark:border-border/80 bg-card p-4 shadow-xs">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-between pb-2 border-b border-border/60">
                      <span>{t('sync.twoWay.recentHeader') || 'NHẬT KÝ THAY ĐỔI & AUDIT TRAIL'}</span>
                      <span className="font-mono text-[10px] font-normal px-2 py-0.5 bg-muted rounded-xs border border-border/60 text-muted-foreground">
                        {auditLogs.length} {t('sync.preview.recordsUnit') || 'bản ghi'}
                      </span>
                    </h3>
                    {auditLogs.length ? (
                      <div className="max-h-56 overflow-y-auto space-y-2 rounded-lg border border-border/80 bg-background/50 p-2.5 text-[11px]">
                        {auditLogs.map((log) => (
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
                                {t('common.lotUpdate.reasonLabel') || 'Lý do'}: {log.reason}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic p-4 border border-dashed border-border/60 rounded-lg text-center bg-secondary/20">
                        {t('common.command.empty') || 'Chưa có thay đổi nào được ghi nhận cho lô này.'}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Sticky Footer */}
        <div className="px-5 py-3 border-t border-border bg-slate-50 dark:bg-card/80 flex flex-wrap items-center justify-between gap-3 shrink-0 select-none">
          {/* Sibling navigation */}
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
            <span className="font-mono text-[11px] text-muted-foreground px-2 py-1 rounded bg-muted/60 border border-border/50">
              {currentIndex >= 0 ? `${currentIndex + 1} / ${siblingItems.length}` : '—'}
            </span>
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

          <div className="flex items-center gap-2.5">
            <JobTicketButton item={item} role={role as Role} variant="button" siblingItems={siblingItems} />
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition cursor-pointer shadow-2xs"
            >
              {t('common.close') || 'Đóng'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
