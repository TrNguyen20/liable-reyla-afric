import { useState, useMemo } from 'react';
import { useTranslation } from '@/i18n';
import { Search, X, RotateCcw, Check, Pin, SlidersHorizontal, Eye, EyeOff, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export interface ColumnDefinition {
  key: string;
  label: string;
  group: 'IDENT' | 'TECH' | 'COMM' | 'VENDOR' | 'DOCS';
  groupLabel: string;
  isPermanent?: boolean;
  isPinned?: boolean;
}

export const COLUMN_GROUPS: { key: ColumnDefinition['group']; label: string }[] = [
  { key: 'IDENT', label: '📌 Cố định & Nhận diện' },
  { key: 'TECH', label: '⚙️ Kỹ thuật & Kích thước' },
  { key: 'COMM', label: '🏷️ Đơn giá & PO' },
  { key: 'VENDOR', label: '🖋️ Nhà cung cấp & QC' },
  { key: 'DOCS', label: '📎 Hồ sơ & Phiếu A4' },
];

export const ALL_COLUMN_DEFINITIONS: ColumnDefinition[] = [
  // 1. Nhận diện & Cố định
  { key: 'checkbox', label: 'Chọn lô', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện', isPermanent: true, isPinned: true },
  { key: 'ma_hang', label: 'Mã hàng', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện', isPermanent: true, isPinned: true },
  { key: 'ngay_tao', label: 'Ngày tạo', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện' },
  { key: 'nguoi_tao', label: 'Người tạo', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện' },
  { key: 'quoc_gia', label: 'Quốc gia', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện' },
  { key: 'phong_sx', label: 'Xưởng', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện' },
  { key: 'doi_tuong_hang', label: 'Đối tượng hàng', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện' },
  { key: 'id_ma_hang', label: 'Mã bản vẽ / phôi', group: 'IDENT', groupLabel: '📌 Cố định & Nhận diện' },

  // 2. Kỹ thuật & Kích thước
  { key: 'so_luong', label: 'Số lượng', group: 'TECH', groupLabel: '⚙️ Kỹ thuật & Kích thước' },
  { key: 'vat_lieu', label: 'Vật liệu', group: 'TECH', groupLabel: '⚙️ Kỹ thuật & Kích thước' },
  { key: 'do_cung', label: 'Độ cứng', group: 'TECH', groupLabel: '⚙️ Kỹ thuật & Kích thước' },
  { key: 'kich_thuoc_sp', label: 'Quy cách KT', group: 'TECH', groupLabel: '⚙️ Kỹ thuật & Kích thước' },
  { key: 'kg_lot', label: 'Trọng lượng (kg)', group: 'TECH', groupLabel: '⚙️ Kỹ thuật & Kích thước' },
  { key: 'don_vi_tinh', label: 'Đơn vị tính', group: 'TECH', groupLabel: '⚙️ Kỹ thuật & Kích thước' },
  { key: 'so_luong_tinh', label: 'SL Tính', group: 'TECH', groupLabel: '⚙️ Kỹ thuật & Kích thước' },

  // 3. Đơn giá & PO
  { key: 'don_gia', label: 'Đơn giá', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'thanh_tien', label: 'Thành tiền', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'ty_gia', label: 'Tỷ giá', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'ngay_gui_qt', label: 'Ngày gửi QT', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'cty_qt', label: 'Đối tác', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'trang_thai', label: 'Trạng thái', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'so_dat_hang', label: 'Số ĐH (PO)', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'ten_file_dat_hang', label: 'File PO', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },
  { key: 'ghi_chu_khi_gui', label: 'Ghi chú gửi', group: 'COMM', groupLabel: '🏷️ Đơn giá & PO' },

  // 4. Nhà cung cấp & QC (12 cột vendor)
  { key: 'ncc_ngay_qt', label: 'NCC Ngày QT', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_ngay_tra_qt', label: 'NCC Hạn trả', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_id_lot_qt', label: 'NCC Lô QT', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_name_qt', label: 'NCC Tên QT', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_giando', label: 'Giản đồ nhiệt', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_ket_qua_hrc', label: 'NCC Độ cứng', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_ket_qua_qc', label: 'NCC Nghiệm thu', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_don_gia', label: 'NCC Báo giá', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_tatus', label: 'NCC Tiến độ', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_thongtinkhac1', label: 'NCC Ghi chú 1', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_thongtinkhac2', label: 'NCC Ghi chú 2', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },
  { key: 'ncc_file1', label: 'Chứng chỉ QT', group: 'VENDOR', groupLabel: '🖋️ Nhà cung cấp & QC' },

  // 5. Phiếu in & Tài liệu
  { key: 'ticket', label: 'Phiếu A4', group: 'DOCS', groupLabel: '📎 Hồ sơ & Phiếu A4', isPermanent: true, isPinned: true },
];

export const GROUP_LABEL_MAP: Record<string, string> = {
  IDENT: 'tracking.columnConfig.groups.ident',
  TECH: 'tracking.columnConfig.groups.tech',
  COMM: 'tracking.columnConfig.groups.comm',
  VENDOR: 'tracking.columnConfig.groups.vendor',
  DOCS: 'tracking.columnConfig.groups.docs',
};

export const COLUMN_LABEL_MAP: Record<string, string> = {
  checkbox: 'tracking.columns.checkbox',
  ma_hang: 'tracking.columns.itemCode',
  ngay_tao: 'tracking.columns.createdDate',
  nguoi_tao: 'tracking.columns.createdBy',
  quoc_gia: 'tracking.columns.country',
  phong_sx: 'tracking.columns.workshop',
  doi_tuong_hang: 'tracking.columns.targetItem',
  id_ma_hang: 'tracking.columns.drawingCode',
  so_luong: 'tracking.columns.quantity',
  vat_lieu: 'tracking.columns.material',
  do_cung: 'tracking.columns.hardness',
  kich_thuoc_sp: 'tracking.columns.productDimension',
  kg_lot: 'tracking.columns.weight',
  don_vi_tinh: 'tracking.columns.uom',
  so_luong_tinh: 'tracking.columns.calcQuantity',
  don_gia: 'tracking.columns.unitPrice',
  thanh_tien: 'tracking.columns.totalAmount',
  ty_gia: 'tracking.columns.exchangeRate',
  ngay_gui_qt: 'tracking.columns.sentDate',
  cty_qt: 'tracking.columns.partner',
  trang_thai: 'tracking.columns.sheetStatus',
  so_dat_hang: 'tracking.columns.orderNo',
  ten_file_dat_hang: 'tracking.columns.orderPdf',
  ghi_chu_khi_gui: 'tracking.columns.dispatchNotes',
  ncc_ngay_qt: 'tracking.columns.vendorOvenDate',
  ncc_ngay_tra_qt: 'tracking.columns.vendorDueDate',
  ncc_id_lot_qt: 'tracking.columns.vendorLotId',
  ncc_name_qt: 'tracking.columns.vendorTech',
  ncc_giando: 'tracking.columns.vendorHeatDiagram',
  ncc_ket_qua_hrc: 'tracking.columns.vendorHrcMeasured',
  ncc_ket_qua_qc: 'tracking.columns.vendorQcVerdict',
  ncc_don_gia: 'tracking.columns.vendorQuotedPrice',
  ncc_tatus: 'tracking.columns.vendorStatus',
  ncc_thongtinkhac1: 'tracking.columns.vendorExtra1',
  ncc_thongtinkhac2: 'tracking.columns.vendorExtra2',
  ncc_file1: 'tracking.columns.vendorQcCert',
  ticket: 'tracking.columns.ticket',
};

export const STORAGE_CUSTOM_COLUMNS_KEY = 'dynamo_tracking_custom_columns';

export interface ColumnConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  visibleCols: string[];
  onApply: (newVisibleCols: string[]) => void;
  onReset: () => void;
}

export function ColumnConfigModal({
  open,
  onOpenChange,
  visibleCols,
  onApply,
  onReset,
}: ColumnConfigModalProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set(visibleCols));

  // Sync internal state whenever visibleCols changes or modal opens
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedKeys(new Set(visibleCols));
      setSearch('');
    }
    onOpenChange(nextOpen);
  };

  const filteredDefs = useMemo(() => {
    if (!search.trim()) return ALL_COLUMN_DEFINITIONS;
    const q = search.trim().toLowerCase();
    return ALL_COLUMN_DEFINITIONS.filter(
      (col) =>
        col.label.toLowerCase().includes(q) ||
        col.key.toLowerCase().includes(q) ||
        col.groupLabel.toLowerCase().includes(q)
    );
  }, [search]);

  const toggleCol = (key: string) => {
    // Checkbox, ma_hang, ticket are permanent
    if (key === 'checkbox' || key === 'ma_hang' || key === 'ticket') return;

    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const all = new Set(ALL_COLUMN_DEFINITIONS.map((c) => c.key));
    setSelectedKeys(all);
  };

  const handleDeselectOptional = () => {
    // Keep only permanent columns
    const permanent = new Set(
      ALL_COLUMN_DEFINITIONS.filter((c) => c.isPermanent).map((c) => c.key)
    );
    setSelectedKeys(permanent);
  };

  const toggleGroup = (groupKey: ColumnDefinition['group']) => {
    const groupCols = ALL_COLUMN_DEFINITIONS.filter((c) => c.group === groupKey);
    const optionalCols = groupCols.filter((c) => !c.isPermanent);
    if (optionalCols.length === 0) return;

    const allSelected = optionalCols.every((c) => selectedKeys.has(c.key));
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        // Deselect optional columns in this group
        for (const c of optionalCols) {
          next.delete(c.key);
        }
      } else {
        // Select all columns in this group
        for (const c of optionalCols) {
          next.add(c.key);
        }
      }
      return next;
    });
  };

  const handleSaveAndApply = () => {
    // Ensure permanent columns are always included
    const finalSet = new Set(selectedKeys);
    finalSet.add('checkbox');
    finalSet.add('ma_hang');
    finalSet.add('ticket');

    const result = ALL_COLUMN_DEFINITIONS.map((c) => c.key).filter((k) => finalSet.has(k));
    try {
      localStorage.setItem(STORAGE_CUSTOM_COLUMNS_KEY, JSON.stringify(result));
    } catch { }

    onApply(result);
    onOpenChange(false);
  };

  const handleResetToDefault = () => {
    try {
      localStorage.removeItem(STORAGE_CUSTOM_COLUMNS_KEY);
    } catch { }
    const all = new Set(ALL_COLUMN_DEFINITIONS.map((c) => c.key));
    setSelectedKeys(all);
    onReset();
    onOpenChange(false);
  };

  // Group columns for structured display
  const groupedColumns = useMemo(() => {
    const map = new Map<ColumnDefinition['group'], ColumnDefinition[]>();
    for (const group of COLUMN_GROUPS) {
      map.set(group.key, []);
    }
    for (const col of filteredDefs) {
      map.get(col.group)?.push(col);
    }
    return map;
  }, [filteredDefs]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-4xl lg:max-w-5xl w-[96vw] max-h-[88vh] flex flex-col p-0 overflow-hidden rounded-xl sm:rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl font-sans [&>button:last-child]:hidden"
        style={{ borderRadius: '12px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-card shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-secondary text-slate-800 dark:text-foreground border border-slate-200 dark:border-border shadow-xs">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold tracking-tight text-slate-900 dark:text-foreground uppercase">
                {t('tracking.columnConfig.title') || 'Tùy Chỉnh Ẩn / Hiện & Ghim Cột'}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-muted-foreground mt-0.5">
                {t('tracking.columnConfig.description') || 'Cấu hình hiển thị theo nhu cầu điều độ xưởng (Lưu tự động vào trình duyệt)'}
              </DialogDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] tabular-nums font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-muted border border-slate-200 dark:border-border text-slate-700 dark:text-foreground">
              {t('tracking.columnConfig.columnCount', { selected: selectedKeys.size, total: ALL_COLUMN_DEFINITIONS.length }) || `${selectedKeys.size}/${ALL_COLUMN_DEFINITIONS.length} cột`}
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-muted flex items-center justify-center text-base transition cursor-pointer"
              title={t('common.close') || 'Đóng'}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 1-Tier Industrial Toolbar: Search + Quick Bulk Actions */}
        <div className="px-5 py-2.5 border-b border-slate-200 dark:border-border bg-slate-50/70 dark:bg-secondary/20 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('tracking.columnConfig.searchPlaceholder') || 'Tìm kiếm cột (mã hàng, vật liệu, po, ncc...)...'}
              className="h-8.5 w-full rounded-lg border border-slate-200 dark:border-input bg-white dark:bg-card pl-8.5 pr-8 text-xs font-mono text-foreground placeholder:text-slate-400 shadow-2xs focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer p-0.5"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-3 h-8.5 text-[11px] font-medium text-slate-700 dark:text-foreground hover:bg-slate-100 dark:hover:bg-secondary cursor-pointer shadow-2xs transition"
            >
              <Eye size={12} className="text-primary" />
              <span>{t('tracking.columnConfig.showAll') || 'Hiện tất cả'}</span>
            </button>
            <button
              type="button"
              onClick={handleDeselectOptional}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-border bg-white dark:bg-card px-3 h-8.5 text-[11px] font-medium text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-secondary cursor-pointer shadow-2xs transition"
            >
              <EyeOff size={12} />
              <span>{t('tracking.columnConfig.onlyPinned') || 'Chỉ cột ghim'}</span>
            </button>
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 dark:border-border bg-white dark:bg-card px-2.5 h-8.5 text-[11px] font-medium text-slate-500 hover:text-destructive hover:bg-slate-100 cursor-pointer transition shadow-2xs"
            >
              <RotateCcw size={11} />
              <span>{t('tracking.columnConfig.resetDefault') || 'Khôi phục mặc định'}</span>
            </button>
          </div>
        </div>

        {/* Bento Grid 3 Cột (Horizontal Layout) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/40 dark:bg-muted/10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-start">
            {COLUMN_GROUPS.map((group) => {
              const colsInGroup = groupedColumns.get(group.key) || [];
              if (colsInGroup.length === 0) return null;

              const activeCount = colsInGroup.filter((c) => selectedKeys.has(c.key)).length;
              const optionalCols = colsInGroup.filter((c) => !c.isPermanent);
              const allOptionalSelected = optionalCols.length > 0 && optionalCols.every((c) => selectedKeys.has(c.key));

              return (
                <div
                  key={group.key}
                  className="rounded-xl border border-slate-200/90 dark:border-border bg-white dark:bg-card p-3 shadow-2xs flex flex-col transition hover:border-slate-300 dark:hover:border-border/80"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-border/50">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono font-bold text-xs uppercase tracking-tight text-slate-800 dark:text-foreground truncate">
                        {GROUP_LABEL_MAP[group.key] ? (t(GROUP_LABEL_MAP[group.key]) || group.label) : group.label}
                      </span>
                      <span className="font-mono text-[10px] tabular-nums font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground border border-slate-200/60 dark:border-transparent shrink-0">
                        {activeCount}/{colsInGroup.length}
                      </span>
                    </div>

                    {optionalCols.length > 0 && (
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.key)}
                        className="text-[10px] font-mono font-medium text-slate-500 hover:text-slate-900 dark:hover:text-foreground hover:bg-slate-100 dark:hover:bg-secondary px-1.5 py-0.5 rounded cursor-pointer transition shrink-0"
                        title={allOptionalSelected ? (t('tracking.columnConfig.deselectAllTooltip') || 'Bỏ chọn tất cả cột tùy chọn trong nhóm') : (t('tracking.columnConfig.selectAllTooltip') || 'Chọn tất cả cột trong nhóm')}
                      >
                        {allOptionalSelected ? (t('tracking.columnConfig.deselectAll') || 'Bỏ chọn') : (t('tracking.columnConfig.selectAll') || 'Chọn hết')}
                      </button>
                    )}
                  </div>

                  {/* List of Column Rows */}
                  <div className="space-y-1">
                    {colsInGroup.map((col) => {
                      const isChecked = selectedKeys.has(col.key);
                      const isLocked = col.isPermanent;

                      return (
                        <label
                          key={col.key}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-md border text-xs font-mono transition-colors cursor-pointer select-none ${
                            isChecked
                              ? 'bg-white dark:bg-card border-slate-200 dark:border-border text-slate-900 dark:text-foreground font-medium shadow-2xs hover:border-slate-300'
                              : 'bg-slate-50/70 dark:bg-muted/20 border-transparent text-slate-400 dark:text-muted-foreground/60 hover:bg-slate-100 dark:hover:bg-muted/40'
                          } ${isLocked ? 'cursor-not-allowed bg-slate-50/90 dark:bg-muted/40 opacity-90' : ''}`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isLocked}
                              onChange={() => toggleCol(col.key)}
                              className="h-3.5 w-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer disabled:opacity-50"
                            />
                            <span className="truncate text-[11px]">{COLUMN_LABEL_MAP[col.key] ? (t(COLUMN_LABEL_MAP[col.key]) || col.label) : col.label}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            {isLocked ? (
                              <span
                                title={t('tracking.columnConfig.lockedTooltip') || 'Cột bắt buộc hiển thị của hệ thống'}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-mono font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50"
                              >
                                <Lock size={8} />
                                <span>{t('tracking.columnConfig.locked') || 'Khóa'}</span>
                              </span>
                            ) : col.isPinned ? (
                              <span
                                title={t('tracking.columnConfig.pinnedTooltip') || 'Cột được ghim cố định'}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-slate-100 dark:bg-muted text-slate-600 dark:text-muted-foreground border border-slate-200 dark:border-transparent"
                              >
                                <Pin size={8} className="fill-current" />
                                <span>{t('tracking.columnConfig.pinned') || 'Ghim'}</span>
                              </span>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-secondary/30 gap-2 shrink-0">
          <div className="text-xs font-mono text-slate-500 dark:text-muted-foreground flex items-center gap-1.5">
            <span>{t('tracking.columnConfig.autoSaveNotice') || '💾 Lưu tự động vào trình duyệt'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-border bg-white dark:bg-card hover:bg-slate-100 dark:hover:bg-secondary text-slate-700 dark:text-foreground text-xs font-medium cursor-pointer shadow-2xs transition"
            >{t('common.cancel') || 'Hủy'}</button>
            <button
              type="button"
              onClick={handleSaveAndApply}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-primary dark:hover:bg-primary/90 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-98 transition"
            >
              <Check size={13} />
              <span>{t('tracking.columnConfig.apply') || 'Áp dụng cấu hình'}</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
