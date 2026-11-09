// Invariant statuses: WAIT, TRANSIT, STOCKED, PASS, FAIL, PENDING
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { JobTicketButton, BatchJobTicketModal } from '@/components/job-ticket';
import { LotUpdateButton } from '@/components/lot-update-dialog';
import { auditFor, failedSyncIds, appendAudit } from '@/lib/dynamo-workflow';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Copy,
  Download,
  Edit2,
  Filter,
  Layers,
  Maximize2,
  Minimize2,
  PackageOpen,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  X,
  PenLine,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useDynamo } from '@/components/dynamo-shell';
import { useTranslation } from '@/i18n';
import { playAudioCue } from '@/lib/audio-cues';
import { date, money, number, type QTItem, type Status, type Workshop, type Vendor } from '@/lib/dynamo-data';
import { formatVendorName, canViewPricing } from '@/lib/dynamo-auth';
import { updateLotProgress } from '@/lib/auth.functions';
import { isMaterialEquivalent } from '@/lib/materials-data';
import {
  hasValidDue,
  isDone,
  isDueSoon,
  isOpen,
  isOverdue,
  logisticsOf,
  qcOf,
  type Logistics,
  type QcState,
} from '@/lib/dynamo-rules';
import { toast } from 'sonner';

export const Route = createFileRoute('/tracking')({
  head: () => ({
    meta: [
      { title: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' },
      { name: 'description', content: 'Bảng theo dõi và điều độ luân chuyển gia công nhiệt luyện, xi mạ cho PIN, INSERT và MOLD.' },
      { property: 'og:title', content: 'Luân chuyển QT | DYNAMO VIETNAM QT - MES' },
      { property: 'og:description', content: 'Giám sát tiến độ, hạn trả và điều độ các lô hàng gia công nhiệt luyện, xi mạ.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): {
    focus?: Focus;
    material?: string;
    vendor?: string;
    workshop?: Workshop;
    logistics?: Logistics;
  } => ({
    ...(FOCUS.some((f) => f.key === s['focus']) ? { focus: s['focus'] as Focus } : {}),
    ...(typeof s['material'] === 'string' && s['material'].trim() ? { material: s['material'].trim() } : {}),
    ...(typeof s['vendor'] === 'string' && s['vendor'].trim() ? { vendor: s['vendor'].trim() } : {}),
    ...(typeof s['workshop'] === 'string' && s['workshop'].trim() ? { workshop: s['workshop'].trim() as Workshop } : {}),
    ...(typeof s['logistics'] === 'string' && s['logistics'].trim() ? { logistics: s['logistics'].trim() as Logistics } : {}),
  }),
  component: Tracking,
});

export type Focus = 'overdue' | 'due_soon' | 'est_due' | 'sync_failed' | 'no_qc' | 'qc_fail' | 'open' | 'stocked';
const FOCUS: { key: Focus; label: string; tone: string }[] = [
  { key: 'overdue', label: 'Lô quá hạn', tone: 'border-destructive/60 bg-destructive/15 text-destructive' },
  { key: 'due_soon', label: 'Cận hạn 48h', tone: 'border-warning/60 bg-warning/15 text-warning' },
  { key: 'open', label: 'Lô đang mở', tone: 'border-info/60 bg-info/15 text-info' },
  { key: 'stocked', label: 'Đã hoàn tất', tone: 'border-run/60 bg-run/15 text-run' },
  { key: 'est_due', label: 'Hạn trả ước tính', tone: 'border-border bg-secondary text-muted-foreground' },
  { key: 'sync_failed', label: 'Ghi Sheet lỗi', tone: 'border-warning/60 bg-warning/15 text-warning' },
  { key: 'no_qc', label: 'Nhập kho chưa QC', tone: 'border-info/60 bg-info/15 text-info' },
  { key: 'qc_fail', label: 'QC không đạt', tone: 'border-destructive/60 bg-destructive/15 text-destructive' },
];

const PAGE_SIZES = [30, 50, 100, 200];
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY = 86400000;

type SortField =
  | 'ID_Key'
  | 'So_DatHang'
  | 'phong_sx'
  | 'ma_hang'
  | 'vat_lieu'
  | 'do_cung'
  | 'so_luong'
  | 'kg_Lot'
  | 'cty_QT'
  | 'TrangThai'
  | 'qc'
  | 'ngay_gui_QT'
  | 'han_tra'
  | 'ghi_chu';

type SortDirection = 'asc' | 'desc';

export type ColumnKey =
  | 'checkbox'
  | 'ma_hang'
  | 'ngay_tao'
  | 'nguoi_tao'
  | 'quoc_gia'
  | 'phong_sx'
  | 'doi_tuong_hang'
  | 'id_ma_hang'
  | 'so_luong'
  | 'vat_lieu'
  | 'do_cung'
  | 'kich_thuoc_sp'
  | 'kg_lot'
  | 'don_vi_tinh'
  | 'so_luong_tinh'
  | 'don_gia'
  | 'thanh_tien'
  | 'ty_gia'
  | 'ngay_gui_qt'
  | 'cty_qt'
  | 'trang_thai'
  | 'so_dat_hang'
  | 'ten_file_dat_hang'
  | 'ghi_chu_khi_gui'
  | 'ncc_ngay_qt'
  | 'ncc_ngay_tra_qt'
  | 'ncc_id_lot_qt'
  | 'ncc_name_qt'
  | 'ncc_giando'
  | 'ncc_ket_qua_hrc'
  | 'ncc_ket_qua_qc'
  | 'ncc_don_gia'
  | 'ncc_tatus'
  | 'ncc_thongtinkhac1'
  | 'ncc_thongtinkhac2'
  | 'ncc_file1'
  | 'ticket'
  | 'ID_Key'
  | 'So_DatHang'
  | 'kg_Lot'
  | 'cty_QT'
  | 'TrangThai'
  | 'qc'
  | 'ngay_gui_QT'
  | 'han_tra'
  | 'ghi_chu';

export type TableDensity = 'compact' | 'normal';

const DEFAULT_COL_WIDTHS: Record<ColumnKey, number> = {
  checkbox: 40,
  ma_hang: 110,
  ngay_tao: 140,
  nguoi_tao: 90,
  quoc_gia: 90,
  phong_sx: 90,
  doi_tuong_hang: 110,
  id_ma_hang: 140,
  so_luong: 70,
  vat_lieu: 100,
  do_cung: 100,
  kich_thuoc_sp: 110,
  kg_lot: 70,
  don_vi_tinh: 70,
  so_luong_tinh: 80,
  don_gia: 90,
  thanh_tien: 100,
  ty_gia: 60,
  ngay_gui_qt: 105,
  cty_qt: 110,
  trang_thai: 110,
  so_dat_hang: 140,
  ten_file_dat_hang: 100,
  ghi_chu_khi_gui: 140,
  ncc_ngay_qt: 105,
  ncc_ngay_tra_qt: 105,
  ncc_id_lot_qt: 110,
  ncc_name_qt: 110,
  ncc_giando: 90,
  ncc_ket_qua_hrc: 95,
  ncc_ket_qua_qc: 85,
  ncc_don_gia: 95,
  ncc_tatus: 100,
  ncc_thongtinkhac1: 110,
  ncc_thongtinkhac2: 110,
  ncc_file1: 90,
  ticket: 58,
  ID_Key: 130,
  So_DatHang: 120,
  kg_Lot: 70,
  cty_QT: 125,
  TrangThai: 110,
  qc: 100,
  ngay_gui_QT: 115,
  han_tra: 115,
  ghi_chu: 165,
};

// Minimum content-aware widths: prevents columns from collapsing below title/icon/cell content
const MIN_COL_WIDTHS: Record<ColumnKey, number> = {
  checkbox: 40,
  ma_hang: 110,
  ngay_tao: 110,
  nguoi_tao: 70,
  quoc_gia: 70,
  phong_sx: 70,
  doi_tuong_hang: 80,
  id_ma_hang: 110,
  so_luong: 60,
  vat_lieu: 90,
  do_cung: 90,
  kich_thuoc_sp: 90,
  kg_lot: 60,
  don_vi_tinh: 50,
  so_luong_tinh: 60,
  don_gia: 70,
  thanh_tien: 80,
  ty_gia: 50,
  ngay_gui_qt: 90,
  cty_qt: 90,
  trang_thai: 90,
  so_dat_hang: 110,
  ten_file_dat_hang: 70,
  ghi_chu_khi_gui: 100,
  ncc_ngay_qt: 90,
  ncc_ngay_tra_qt: 90,
  ncc_id_lot_qt: 80,
  ncc_name_qt: 80,
  ncc_giando: 70,
  ncc_ket_qua_hrc: 70,
  ncc_ket_qua_qc: 70,
  ncc_don_gia: 70,
  ncc_tatus: 80,
  ncc_thongtinkhac1: 80,
  ncc_thongtinkhac2: 80,
  ncc_file1: 70,
  ticket: 58,
  ID_Key: 110,
  So_DatHang: 110,
  kg_Lot: 60,
  cty_QT: 100,
  TrangThai: 90,
  qc: 80,
  ngay_gui_QT: 90,
  han_tra: 90,
  ghi_chu: 100,
};

interface TableFilterState {
  idKeySearch: string;
  orderSearch: string;
  workshops: Workshop[];
  itemSearch: string;
  materials: string[];
  hardnessSearch: string;
  missingHardnessOnly: boolean;
  qtyMin: string;
  qtyMax: string;
  kgMin: string;
  kgMax: string;
  vendors: string[];
  logistics: Logistics[];
  qcStates: QcState[];
  sendFrom: string;
  sendTo: string;
  dueFrom: string;
  dueTo: string;
  missingDueOnly: boolean;
  noteSearch: string;
  hasNoteOnly: boolean;
  overdueOnly: boolean;
  dueSoonOnly: boolean;
  openOnly: boolean;
  stockedOnly: boolean;
  noQcOnly: boolean;
  syncFailedOnly: boolean;
}

const defaultFilters: TableFilterState = {
  idKeySearch: '',
  orderSearch: '',
  workshops: [],
  itemSearch: '',
  materials: [],
  hardnessSearch: '',
  missingHardnessOnly: false,
  qtyMin: '',
  qtyMax: '',
  kgMin: '',
  kgMax: '',
  vendors: [],
  logistics: [],
  qcStates: [],
  sendFrom: '',
  sendTo: '',
  dueFrom: '',
  dueTo: '',
  missingDueOnly: false,
  noteSearch: '',
  hasNoteOnly: false,
  overdueOnly: false,
  dueSoonOnly: false,
  openOnly: false,
  stockedOnly: false,
  noQcOnly: false,
  syncFailedOnly: false,
};

function HeaderSortControls({
  field,
  currentField,
  currentDir,
  onSort,
  ascLabel = 'A → Z (Tăng dần)',
  descLabel = 'Z → A (Giảm dần)',
}: {
  field: SortField;
  currentField: SortField;
  currentDir: SortDirection;
  onSort: (field: SortField, dir: SortDirection) => void;
  ascLabel?: string;
  descLabel?: string;
}) {
  const { t } = useTranslation();
  const isAsc = currentField === field && currentDir === 'asc';
  const isDesc = currentField === field && currentDir === 'desc';

  return (
    <div className="border-b border-border/70 pb-2.5 mb-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
          {t('tracking.sort.sortThisCol') || 'Sắp xếp cột này:'}
        </span>
        {currentField === field && (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-mono font-bold">
            <Check size={11} className="stroke-[3]" /> {t('common.selected') || 'Đang chọn'}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onSort(field, 'asc')}
          className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xs text-xs font-medium transition-all cursor-pointer ${isAsc
            ? 'border border-primary/50 bg-primary/15 text-primary font-bold shadow-2xs ring-1 ring-primary/20'
            : 'border border-border/70 bg-card hover:bg-secondary text-foreground hover:border-border'
            }`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <ArrowUp size={13} className={isAsc ? 'text-primary stroke-[2.5]' : 'text-muted-foreground'} />
            <span className="truncate">{ascLabel}</span>
          </span>
          {isAsc && <Check size={13} className="text-primary stroke-[2.5] shrink-0" />}
        </button>
        <button
          type="button"
          onClick={() => onSort(field, 'desc')}
          className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-xs text-xs font-medium transition-all cursor-pointer ${isDesc
            ? 'border border-primary/50 bg-primary/15 text-primary font-bold shadow-2xs ring-1 ring-primary/20'
            : 'border border-border/70 bg-card hover:bg-secondary text-foreground hover:border-border'
            }`}
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <ArrowDown size={13} className={isDesc ? 'text-primary stroke-[2.5]' : 'text-muted-foreground'} />
            <span className="truncate">{descLabel}</span>
          </span>
          {isDesc && <Check size={13} className="text-primary stroke-[2.5] shrink-0" />}
        </button>
      </div>
    </div>
  );
}

function HeaderFilterCell({
  title,
  field,
  sortCol,
  sortDir,
  isFiltered,
  children,
  className = '',
  stickyClass = '',
  align = 'start',
  width,
  onResize,
  onResetWidth,
  stickyLeft,
  isStickyLast = false,
  onDirectSort,
}: {
  title: string;
  field?: SortField;
  sortCol?: SortField;
  sortDir?: SortDirection;
  isFiltered?: boolean;
  children?: React.ReactNode;
  className?: string;
  stickyClass?: string;
  align?: 'start' | 'end' | 'center';
  width?: number;
  onResize?: (e: React.MouseEvent) => void;
  onResetWidth?: () => void;
  stickyLeft?: number;
  isStickyLast?: boolean;
  onDirectSort?: (field: SortField) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isSorted = Boolean(field && sortCol && sortCol === field);
  const isSticky = stickyLeft !== undefined || stickyClass.includes('sticky');

  const handleTitleClick = (e: React.MouseEvent) => {
    if (field && onDirectSort) {
      e.stopPropagation();
      onDirectSort(field);
    }
  };

  return (
    <th
      className={`whitespace-nowrap px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none ${isSticky ? 'sticky top-0 z-50 bg-secondary' : 'relative bg-secondary'
        } ${stickyClass} ${className} ${isStickyLast
          ? 'border-r border-border/80 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)]'
          : ''
        }`}
      style={{
        ...(width !== undefined ? { width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` } : {}),
        ...(stickyLeft !== undefined ? { left: `${stickyLeft}px` } : {}),
        ...(isSticky ? { position: 'sticky', top: 0, zIndex: 50 } : {}),
      }}
    >
      <div
        className={`flex items-center gap-1 ${align === 'end' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-between'
          }`}
      >
        <button
          type="button"
          onClick={handleTitleClick}
          className="flex items-center gap-1 text-left group/th cursor-pointer hover:text-foreground transition-colors outline-none truncate"
          title={
            field
              ? `Nhấp để sắp xếp: ${isSorted
                ? sortDir === 'asc'
                  ? 'Tăng dần → Giảm dần'
                : field === 'ngay_gui_QT'
                  ? 'Giảm dần → Tăng dần'
                  : 'Giảm dần → Mặc định'
                : 'A → Z (Tăng dần)'
              }`
              : undefined
          }
        >
          <span className="truncate">{title}</span>
          {field && (
            <span className="inline-flex items-center">
              {isSorted ? (
                sortDir === 'asc' ? (
                  <ArrowUp size={12} className="text-primary stroke-[3] shrink-0" />
                ) : (
                  <ArrowDown size={12} className="text-primary stroke-[3] shrink-0" />
                )
              ) : (
                <ArrowUpDown size={11} className="text-muted-foreground/30 group-hover/th:text-primary group-hover/th:opacity-100 opacity-0 transition-all shrink-0" />
              )}
            </span>
          )}
        </button>

        {children && (
<Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex size-7 shrink-0 items-center justify-center rounded-xs transition-all cursor-pointer touch-manipulation active:scale-95 ${isFiltered
                ? 'bg-primary text-primary-foreground font-black ring-2 ring-primary ring-offset-1 shadow-xs'
                : 'text-muted-foreground/70 hover:bg-background/80 hover:text-foreground'
                }`}
              title={t('tracking.table.openFilter', { column: title }) || `Mở bộ lọc ${title}`}
            >
              <Filter size={12} className={isFiltered ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align={align === 'end' ? 'end' : 'start'}
            sideOffset={6}
            className="w-80 max-w-[92vw] p-3 text-xs z-50 font-sans normal-case tracking-normal"
          >
            {open && children}
          </PopoverContent>
        </Popover>
        )}
      </div>
      {onResize && (
        <div
          role="separator"
          tabIndex={-1}
          aria-orientation="vertical"
          onMouseDown={onResize}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onResetWidth?.();
          }}
          className="group/resizer absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize select-none touch-none flex items-center justify-center z-30"
          title={t('tracking.table.dragColumnTooltip') || 'Kéo sang trái/phải để đổi độ rộng (Nhấp đúp để đặt lại mặc định)'}
        >
          <div className="w-[1.5px] h-3.5 rounded-full bg-border/80 group-hover/resizer:bg-primary group-hover/resizer:h-full group-hover/resizer:w-[2px] transition-all" />
        </div>
      )}
    </th>
  );
}

function Tracking() {
  const { filtered: all, role, updateItem, bulkUpdateItems, loading, pullLive } = useDynamo();
  const { t, locale } = useTranslation();
  const searchParams = Route.useSearch();

  // Column Resizing state with localStorage persistence and MIN_COL_WIDTHS content clamping
  const [colWidths, setColWidths] = useState<Record<ColumnKey, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('dynamo-tracking-col-widths');
        if (saved) {
          const parsed = JSON.parse(saved);
          const validated: Record<string, number> = {};
          (Object.keys(DEFAULT_COL_WIDTHS) as ColumnKey[]).forEach((k) => {
            validated[k] = Math.max(MIN_COL_WIDTHS[k], Number(parsed[k]) || DEFAULT_COL_WIDTHS[k]);
          });
          return validated as Record<ColumnKey, number>;
        }
      } catch { }
    }
    return DEFAULT_COL_WIDTHS;
  });

  const handleResizeStart = (e: React.MouseEvent, colKey: ColumnKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] ?? DEFAULT_COL_WIDTHS[colKey];
    const minW = MIN_COL_WIDTHS[colKey];

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      // HARD CLAMP: stops precisely at the minimum width needed by the column content
      const newWidth = Math.max(minW, Math.round(startWidth + deltaX));
      setColWidths((prev) => ({ ...prev, [colKey]: newWidth }));
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.classList.remove('select-none', 'cursor-col-resize');
      setColWidths((curr) => {
        try {
          window.localStorage.setItem('dynamo-tracking-col-widths', JSON.stringify(curr));
        } catch { }
        return curr;
      });
    };

    document.body.classList.add('select-none', 'cursor-col-resize');
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleResetColWidth = (colKey: ColumnKey) => {
    setColWidths((prev) => {
      const next = { ...prev, [colKey]: DEFAULT_COL_WIDTHS[colKey] };
      try {
        window.localStorage.setItem('dynamo-tracking-col-widths', JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  const handleResetWidth = handleResetColWidth;

  const handleResetAllColWidths = () => {
    setColWidths(DEFAULT_COL_WIDTHS);
    try {
      window.localStorage.removeItem('dynamo-tracking-col-widths');
    } catch { }
    toast.success('Đã khôi phục kích thước cột mặc định.');
    playAudioCue('pop');
  };

  const totalTableWidth = useMemo(
    () => Object.values(colWidths).reduce((a, b) => a + b, 0),
    [colWidths],
  );

  // Row Density State with localStorage persistence ('compact' | 'normal')
  const [density, setDensity] = useState<TableDensity>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem('dynamo-tracking-density');
        if (saved === 'compact' || saved === 'normal') {
          return saved;
        }
      } catch { }
    }
    return 'compact';
  });

  const handleSetDensity = (newDensity: TableDensity) => {
    setDensity(newDensity);
    try {
      window.localStorage.setItem('dynamo-tracking-density', newDensity);
    } catch { }
  };

  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const f = () => setFailedIds(failedSyncIds());
    f();
    window.addEventListener('dynamo-audit', f);
    return () => window.removeEventListener('dynamo-audit', f);
  }, []);

  // Integrated Google Sheets Filter State
  const [filters, setFilters] = useState<TableFilterState>(() => ({
    ...defaultFilters,
    materials: searchParams.material ? [searchParams.material] : [],
    missingDueOnly: searchParams.focus === 'est_due',
    qcStates: searchParams.focus === 'qc_fail' ? ['Không đạt'] : [],
    vendors: searchParams.vendor ? [searchParams.vendor] : [],
    workshops: searchParams.workshop ? [searchParams.workshop] : [],
    logistics: searchParams.logistics ? [searchParams.logistics] : [],
    overdueOnly: searchParams.focus === 'overdue',
    dueSoonOnly: searchParams.focus === 'due_soon',
    openOnly: searchParams.focus === 'open',
    stockedOnly: searchParams.focus === 'stocked',
    noQcOnly: searchParams.focus === 'no_qc',
    syncFailedOnly: searchParams.focus === 'sync_failed',
  }));

  // Sorting state - default to newest sent date
  const [sortCol, setSortCol] = useState<SortField>('ngay_gui_QT');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Search inside material popover
  const [materialSearchText, setMaterialSearchText] = useState('');

  // Global Search state across operational columns (Chiến lược 3)
  const [globalSearch, setGlobalSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [tablePage, setTablePage] = useState(0);
  const [pageSize, setPageSize] = useState(30);

  // Selection states (for Bulk Actions)
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());

  // Drawer / Modals states
  const [detailLot, setDetailLot] = useState<QTItem | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; title: string; type: 'image' | 'pdf' } | null>(null);

  // Table Fullscreen / Zen Focus Mode State (TASK-006)
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const tableWrapperRef = useRef<HTMLDivElement>(null);

  const toggleTableFullscreen = useCallback(() => {
    setIsTableFullscreen((prev) => {
      const next = !prev;
      playAudioCue('pop');
      if (next) {
        if (typeof document !== 'undefined' && document.documentElement.requestFullscreen && !document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {
            // Browser rejected or restricted native fullscreen, CSS Zen Mode is active
          });
        }
      } else {
        if (typeof document !== 'undefined' && document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => { });
        }
      }
      return next;
    });
  }, []);

  // Global Keyboard Shortcut: Alt+F to toggle Fullscreen Zen Mode (Esc is purely reserved for local cell/modal cancellations)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        toggleTableFullscreen();
      } else if (
        e.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleTableFullscreen]);

  // Inline Quick-Edit State
  type EditableField =
    | 'ma_hang'
    | 'vat_lieu'
    | 'do_cung'
    | 'so_luong'
    | 'kg_Lot'
    | 'cty_QT'
    | 'ngay_gui_QT'
    | 'han_tra'
    | 'logistics'
    | 'qc'
    | 'ghi_chu';
  const [editingCell, setEditingCell] = useState<{ id: string; field: EditableField } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savedCellKey, setSavedCellKey] = useState<string | null>(null);
  const isSavingRef = useRef(false);

  const handleSort = (field: SortField, dir: SortDirection) => {
    setSortCol(field);
    setSortDir(dir);
    setTablePage(0);
    playAudioCue('beep');
  };

  const handleToggleSort = (field: SortField) => {
    if (sortCol !== field) {
      setSortCol(field);
      setSortDir(field === 'ngay_gui_QT' ? 'desc' : 'asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      // Khi đang là desc (mũi tên xuống):
      // Nếu là cột ngày gửi (cột mặc định), tiếp tục tuần tự đảo sang asc (mũi tên lên)
      // Nếu là cột khác, click lần 3 sẽ hoàn trả về sắp xếp mặc định (ngay_gui_QT, desc)
      if (field === 'ngay_gui_QT') {
        setSortDir('asc');
      } else {
        setSortCol('ngay_gui_QT');
        setSortDir('desc');
      }
    }
    setTablePage(0);
    playAudioCue('beep');
  };

  const toggleInArray = <T,>(arr: T[], item: T): T[] => {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
  };

  const setDatePreset = (
    field: 'send' | 'due',
    preset: 'today' | '7days' | 'this_month' | 'prev_month' | 'all',
  ) => {
    const now = new Date();
    if (preset === 'all') {
      if (field === 'send') setFilters((f) => ({ ...f, sendFrom: '', sendTo: '' }));
      else setFilters((f) => ({ ...f, dueFrom: '', dueTo: '' }));
    } else if (preset === 'today') {
      const t = ymd(now);
      if (field === 'send') setFilters((f) => ({ ...f, sendFrom: t, sendTo: t }));
      else setFilters((f) => ({ ...f, dueFrom: t, dueTo: t }));
    } else if (preset === '7days') {
      if (field === 'send') {
        setFilters((f) => ({ ...f, sendFrom: ymd(new Date(now.getTime() - 6 * DAY)), sendTo: ymd(now) }));
      } else {
        setFilters((f) => ({ ...f, dueFrom: ymd(now), dueTo: ymd(new Date(now.getTime() + 7 * DAY)) }));
      }
    } else if (preset === 'this_month') {
      const fDate = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
      const tDate = ymd(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      if (field === 'send') setFilters((f) => ({ ...f, sendFrom: fDate, sendTo: tDate }));
      else setFilters((f) => ({ ...f, dueFrom: fDate, dueTo: tDate }));
    } else if (preset === 'prev_month') {
      const fDate = ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const tDate = ymd(new Date(now.getFullYear(), now.getMonth(), 0));
      if (field === 'send') setFilters((f) => ({ ...f, sendFrom: fDate, sendTo: tDate }));
      else setFilters((f) => ({ ...f, dueFrom: fDate, dueTo: tDate }));
    }
    setTablePage(0);
    playAudioCue('beep');
  };

  // Distinct values extracted from dataset
  const allMaterials = useMemo(() => {
    const set = new Set<string>();
    all.forEach((i) => {
      if (i.vat_lieu && i.vat_lieu !== '—') set.add(i.vat_lieu);
    });
    return Array.from(set).sort();
  }, [all]);

  const allVendors = useMemo(() => {
    const set = new Set<string>();
    all.forEach((i) => {
      if (i.cty_QT) set.add(String(i.cty_QT));
    });
    return Array.from(set).sort();
  }, [all]);

  const workshops = useMemo(() => [...new Set(all.map((i) => i.phong_sx))].sort(), [all]);

  // Single-pass O(N) aggregation: computes all badge counts across 25,638 items in ~3ms
  const counts = useMemo(() => {
    const ws: Record<string, number> = {};
    const mat: Record<string, number> = {};
    const ven: Record<string, number> = {};
    const log: Record<string, number> = {};
    const qc: Record<string, number> = {};

    for (let i = 0; i < all.length; i++) {
      const it = all[i];
      if (!it) continue;
      ws[it.phong_sx] = (ws[it.phong_sx] || 0) + 1;
      const v = String(it.cty_QT);
      ven[v] = (ven[v] || 0) + 1;
      const m = it.vat_lieu || '—';
      mat[m] = (mat[m] || 0) + 1;
      const l = logisticsOf(it);
      log[l] = (log[l] || 0) + 1;
      const q = qcOf(it);
      qc[q] = (qc[q] || 0) + 1;
    }
    return { ws, mat, ven, log, qc };
  }, [all]);

  // Comprehensive table filtering and sorting
  const rows = useMemo(() => {
    return all
      .filter((row) => {
        // 0. Global Search across multiple technical fields (Chiến lược 3)
        if (globalSearch.trim()) {
          const q = globalSearch.trim().toLowerCase();
          const matches =
            row.ID_Key.toLowerCase().includes(q) ||
            row.So_DatHang.toLowerCase().includes(q) ||
            row.ma_hang.toLowerCase().includes(q) ||
            (row.vat_lieu && row.vat_lieu.toLowerCase().includes(q)) ||
            (row.do_cung && row.do_cung.toLowerCase().includes(q)) ||
            String(row.cty_QT).toLowerCase().includes(q) ||
            row.phong_sx.toLowerCase().includes(q) ||
            row.TrangThai.toLowerCase().includes(q) ||
            qcOf(row).toLowerCase().includes(q) ||
            (row.ghi_chu && row.ghi_chu.toLowerCase().includes(q));
          if (!matches) return false;
        }

        // 1. ID_Key
        if (filters.idKeySearch && !row.ID_Key.toLowerCase().includes(filters.idKeySearch.toLowerCase())) {
          return false;
        }
        // 2. So_DatHang
        if (filters.orderSearch && !row.So_DatHang.toLowerCase().includes(filters.orderSearch.toLowerCase())) {
          return false;
        }
        // 3. phong_sx
        if (filters.workshops.length > 0 && !filters.workshops.includes(row.phong_sx as Workshop)) {
          return false;
        }
        // 4. ma_hang
        if (filters.itemSearch && !row.ma_hang.toLowerCase().includes(filters.itemSearch.toLowerCase())) {
          return false;
        }
        // 5. vat_lieu
        if (filters.materials.length > 0) {
          const matches = filters.materials.some((m) => isMaterialEquivalent(row.vat_lieu, m));
          if (!matches) return false;
        }
        // 6. do_cung
        if (filters.missingHardnessOnly && row.do_cung && row.do_cung !== '—') {
          return false;
        }
        if (filters.hardnessSearch && !row.do_cung.toLowerCase().includes(filters.hardnessSearch.toLowerCase())) {
          return false;
        }
        // 7. so_luong
        if (filters.qtyMin && row.so_luong < Number(filters.qtyMin)) return false;
        if (filters.qtyMax && row.so_luong > Number(filters.qtyMax)) return false;
        // 8. kg_Lot
        if (filters.kgMin && row.kg_Lot < Number(filters.kgMin)) return false;
        if (filters.kgMax && row.kg_Lot > Number(filters.kgMax)) return false;
        // 9. cty_QT
        if (filters.vendors.length > 0 && !filters.vendors.includes(String(row.cty_QT))) {
          return false;
        }
        // 10. Logistics
        if (filters.logistics.length > 0 && !filters.logistics.includes(logisticsOf(row))) {
          return false;
        }
        // 11. QC
        if (filters.qcStates.length > 0 && !filters.qcStates.includes(qcOf(row))) {
          return false;
        }
        // 12. ngay_gui_QT
        if (filters.sendFrom && row.ngay_gui_QT < filters.sendFrom) return false;
        if (filters.sendTo && row.ngay_gui_QT > filters.sendTo) return false;
        // 13. han_tra
        const due = row.ncc_ngay_tra_qt || row.han_tra || '';
        if (filters.missingDueOnly && hasValidDue(row)) return false;
        if (filters.dueFrom && (!due || due < filters.dueFrom)) return false;
        if (filters.dueTo && (!due || due > filters.dueTo)) return false;
        // 14. ghi_chu
        if (filters.noteSearch && !(row.ghi_chu ?? '').toLowerCase().includes(filters.noteSearch.toLowerCase())) {
          return false;
        }
        if (filters.hasNoteOnly && !row.ghi_chu) {
          return false;
        }
        // 15. Special focus filters
        if (filters.overdueOnly && !isOverdue(row)) return false;
        if (filters.dueSoonOnly && !isDueSoon(row)) return false;
        if (filters.openOnly && !isOpen(row)) return false;
        if (filters.stockedOnly && !isDone(row)) return false;
        if (filters.noQcOnly && (!isDone(row) || qcOf(row) === 'Đạt')) return false;
        if (filters.syncFailedOnly && !failedIds.has(row.ID_Key)) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortCol) {
          case 'ID_Key':
            cmp = a.ID_Key.localeCompare(b.ID_Key);
            break;
          case 'So_DatHang':
            cmp = a.So_DatHang.localeCompare(b.So_DatHang);
            break;
          case 'phong_sx':
            cmp = a.phong_sx.localeCompare(b.phong_sx);
            break;
          case 'ma_hang':
            cmp = a.ma_hang.localeCompare(b.ma_hang);
            break;
          case 'vat_lieu':
            cmp = a.vat_lieu.localeCompare(b.vat_lieu);
            break;
          case 'do_cung':
            cmp = a.do_cung.localeCompare(b.do_cung);
            break;
          case 'so_luong':
            cmp = a.so_luong - b.so_luong;
            break;
          case 'kg_Lot':
            cmp = a.kg_Lot - b.kg_Lot;
            break;
          case 'cty_QT':
            cmp = String(a.cty_QT).localeCompare(String(b.cty_QT));
            break;
          case 'TrangThai':
            cmp = a.TrangThai.localeCompare(b.TrangThai);
            break;
          case 'qc':
            cmp = qcOf(a).localeCompare(qcOf(b));
            break;
          case 'han_tra': {
            const dueA = a.ncc_ngay_tra_qt || a.han_tra || '';
            const dueB = b.ncc_ngay_tra_qt || b.han_tra || '';
            cmp = dueA.localeCompare(dueB);
            break;
          }
          case 'ghi_chu':
            cmp = (a.ghi_chu ?? '').localeCompare(b.ghi_chu ?? '');
            break;
          case 'ngay_gui_QT':
          default: {
            const dueA = a.ncc_ngay_tra_qt || a.han_tra || '';
            const dueB = b.ncc_ngay_tra_qt || b.han_tra || '';
            cmp = a.ngay_gui_QT.localeCompare(b.ngay_gui_QT) || dueA.localeCompare(dueB);
            break;
          }
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [all, filters, sortCol, sortDir, failedIds, globalSearch]);

  // Đề xuất 3: Danh sách các bộ lọc đang kích hoạt để tạo thanh pill tóm tắt 1-chạm
  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; onClear: () => void }[] = [];
    if (globalSearch.trim()) {
      list.push({
        key: 'globalSearch',
        label: `${t('common.filters.search') || 'Tìm'}: "${globalSearch.trim()}"`,
        onClear: () => {
          setGlobalSearch('');
          setTablePage(0);
        },
      });
    }
    if (filters.idKeySearch) {
      list.push({
        key: 'idKey',
        label: `${t('tracking.columns.lotId') || 'Lô'}: "${filters.idKeySearch}"`,
        onClear: () => setFilters((f) => ({ ...f, idKeySearch: '' })),
      });
    }
    if (filters.orderSearch) {
      list.push({
        key: 'order',
        label: `${t('tracking.columns.orderNo') || 'Đơn'}: "${filters.orderSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, orderSearch: '' })),
      });
    }
    if (filters.workshops.length) {
      list.push({
        key: 'workshops',
        label: `${t('tracking.workshops.title') || 'Xưởng'}: ${filters.workshops.join(', ')}`,
        onClear: () => setFilters((f) => ({ ...f, workshops: [] })),
      });
    }
    if (filters.itemSearch) {
      list.push({
        key: 'item',
        label: `${t('tracking.columns.itemCode') || 'Mã hàng'}: "${filters.itemSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, itemSearch: '' })),
      });
    }
    if (filters.materials.length) {
      list.push({
        key: 'materials',
        label: `${t('tracking.columns.material') || 'Vật liệu'} (${filters.materials.length}): ${filters.materials.slice(0, 2).join(', ')}${filters.materials.length > 2 ? '…' : ''
          }`,
        onClear: () => setFilters((f) => ({ ...f, materials: [] })),
      });
    }
    if (filters.hardnessSearch) {
      list.push({
        key: 'hardness',
        label: `${t('tracking.columns.hardness') || 'Độ cứng'}: "${filters.hardnessSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, hardnessSearch: '' })),
      });
    }
    if (filters.missingHardnessOnly) {
      list.push({
        key: 'missingHardness',
        label: t('tracking.filters.missingHardness') || 'Chưa có độ cứng',
        onClear: () => setFilters((f) => ({ ...f, missingHardnessOnly: false })),
      });
    }
    if (filters.qtyMin || filters.qtyMax) {
      list.push({
        key: 'qty',
        label: `SL: ${filters.qtyMin || '0'} → ${filters.qtyMax || '∞'}`,
        onClear: () => setFilters((f) => ({ ...f, qtyMin: '', qtyMax: '' })),
      });
    }
    if (filters.kgMin || filters.kgMax) {
      list.push({
        key: 'kg',
        label: `Kg: ${filters.kgMin || '0'} → ${filters.kgMax || '∞'}`,
        onClear: () => setFilters((f) => ({ ...f, kgMin: '', kgMax: '' })),
      });
    }
    if (filters.vendors.length) {
      list.push({
        key: 'vendors',
        label: `${t('tracking.columns.partner') || 'Đối tác'}: ${filters.vendors.map((v) => formatVendorName(v, role)).join(', ')}`,
        onClear: () => setFilters((f) => ({ ...f, vendors: [] })),
      });
    }
    if (filters.logistics.length) {
      list.push({
        key: 'logistics',
        label: `Logistics: ${filters.logistics.join(', ')}`,
        onClear: () => setFilters((f) => ({ ...f, logistics: [] })),
      });
    }
    if (filters.qcStates.length) {
      list.push({
        key: 'qc',
        label: `QC: ${filters.qcStates.join(', ')}`,
        onClear: () => setFilters((f) => ({ ...f, qcStates: [] })),
      });
    }
    if (filters.sendFrom || filters.sendTo) {
      list.push({
        key: 'sendDate',
        label: `${t('tracking.columns.sentDate') || 'Gửi'}: ${filters.sendFrom || '…'} → ${filters.sendTo || '…'}`,
        onClear: () => setFilters((f) => ({ ...f, sendFrom: '', sendTo: '' })),
      });
    }
    if (filters.missingDueOnly) {
      list.push({
        key: 'missingDue',
        label: t('tracking.dueTags.missingDue') || 'Thiếu hạn trả',
        onClear: () => setFilters((f) => ({ ...f, missingDueOnly: false })),
      });
    }
    if (filters.dueFrom || filters.dueTo) {
      list.push({
        key: 'dueDate',
        label: `${t('tracking.columns.dueDate') || 'Hạn'}: ${filters.dueFrom || '…'} → ${filters.dueTo || '…'}`,
        onClear: () => setFilters((f) => ({ ...f, dueFrom: '', dueTo: '' })),
      });
    }
    if (filters.noteSearch) {
      list.push({
        key: 'note',
        label: `${t('tracking.columns.notes') || 'Ghi chú'}: "${filters.noteSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, noteSearch: '' })),
      });
    }
    if (filters.hasNoteOnly) {
      list.push({
        key: 'hasNote',
        label: t('tracking.filters.hasNote') || 'Có ghi chú',
        onClear: () => setFilters((f) => ({ ...f, hasNoteOnly: false })),
      });
    }
    if (filters.overdueOnly) {
      list.push({
        key: 'overdue',
        label: t('tracking.focus.overdue') || 'Quá hạn',
        onClear: () => setFilters((f) => ({ ...f, overdueOnly: false })),
      });
    }
    if (filters.dueSoonOnly) {
      list.push({
        key: 'dueSoon',
        label: t('tracking.focus.due_soon') || 'Cận hạn 48h',
        onClear: () => setFilters((f) => ({ ...f, dueSoonOnly: false })),
      });
    }
    if (filters.openOnly) {
      list.push({
        key: 'openOnly',
        label: t('tracking.focus.open') || 'Lô đang mở',
        onClear: () => setFilters((f) => ({ ...f, openOnly: false })),
      });
    }
    if (filters.stockedOnly) {
      list.push({
        key: 'stockedOnly',
        label: t('tracking.focus.stocked') || 'Đã hoàn tất',
        onClear: () => setFilters((f) => ({ ...f, stockedOnly: false })),
      });
    }
    if (filters.noQcOnly) {
      list.push({
        key: 'noQcOnly',
        label: t('tracking.focus.no_qc') || 'Chưa đạt QC',
        onClear: () => setFilters((f) => ({ ...f, noQcOnly: false })),
      });
    }
    if (filters.syncFailedOnly) {
      list.push({
        key: 'syncFailedOnly',
        label: t('tracking.focus.sync_failed') || 'Ghi Sheet lỗi',
        onClear: () => setFilters((f) => ({ ...f, syncFailedOnly: false })),
      });
    }
    return list;
  }, [filters, role, globalSearch, t]);

  const totalKg = useMemo(() => rows.reduce((a, i) => a + i.kg_Lot, 0), [rows]);

  const resetAllFilters = () => {
    setFilters(defaultFilters);
    setGlobalSearch('');
    setSortCol('ngay_gui_QT');
    setSortDir('desc');
    setTablePage(0);
    playAudioCue('success');
    toast.info(t('tracking.actions.allFiltersCleared') || 'Đã xóa toàn bộ bộ lọc trên bảng.');
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const tableRows = rows.slice(tablePage * pageSize, tablePage * pageSize + pageSize);

  // Checkbox indeterminate ref & selection state indicators
  const selectAllCheckboxRef = useRef<HTMLInputElement | null>(null);
  const isAllPageSelected = useMemo(
    () => tableRows.length > 0 && tableRows.every((r) => selectedLots.has(r.ID_Key)),
    [tableRows, selectedLots],
  );
  const isSomePageSelected = useMemo(
    () => tableRows.some((r) => selectedLots.has(r.ID_Key)),
    [tableRows, selectedLots],
  );

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isSomePageSelected && !isAllPageSelected;
    }
  }, [isSomePageSelected, isAllPageSelected]);

  // Global Escape key listener to clear selection
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedLots.size > 0 && !editingCell) {
        setSelectedLots(new Set());
        playAudioCue('pop');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [selectedLots.size, editingCell]);

  // Global keyboard shortcuts: Alt+Left / Alt+Right for pagination (TASK-003)
  useEffect(() => {
    const handlePaginationKeys = (e: KeyboardEvent) => {
      if (
        editingCell ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)
      ) {
        return;
      }
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        setTablePage((p) => {
          if (p > 0) {
            playAudioCue('beep');
            return p - 1;
          }
          return p;
        });
      } else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        setTablePage((p) => {
          if (p + 1 < totalPages) {
            playAudioCue('beep');
            return p + 1;
          }
          return p;
        });
      }
    };
    window.addEventListener('keydown', handlePaginationKeys);
    return () => window.removeEventListener('keydown', handlePaginationKeys);
  }, [editingCell, totalPages]);

  // Checkbox selection
  const toggleSelectLot = (id: string) => {
    setSelectedLots((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        playAudioCue('beep');
      }
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedLots((prev) => {
      const next = new Set(prev);
      if (isAllPageSelected) {
        tableRows.forEach((r) => next.delete(r.ID_Key));
      } else {
        tableRows.forEach((r) => next.add(r.ID_Key));
        playAudioCue('beep');
      }
      return next;
    });
  };

  const exportCsv = (mode: boolean | 'selected' | 'page' | 'filtered' | 'all' = 'filtered') => {
    let targetRows: QTItem[] = [];
    let filename = 'luan-chuyen-qt.csv';
    if (mode === true || mode === 'selected') {
      targetRows = rows.filter((r) => selectedLots.has(r.ID_Key));
      filename = `luan-chuyen-qt-${targetRows.length}-lo-chon.csv`;
    } else if (mode === 'page') {
      targetRows = tableRows;
      filename = `luan-chuyen-qt-trang-${tablePage + 1}.csv`;
    } else if (mode === 'all') {
      targetRows = all;
      filename = `luan-chuyen-qt-toan-bo-${all.length}-lo.csv`;
    } else {
      targetRows = rows;
      filename = `luan-chuyen-qt-${rows.length}-lo.csv`;
    }
    if (!targetRows.length) {
      toast.error('Không có dữ liệu phù hợp để xuất CSV');
      return;
    }
    const head = [
      `${t('tracking.columns.lotId') || 'Mã lô'} (ID_Key)`,
      `${t('tracking.columns.orderNo') || 'Số đặt hàng'} (PO)`,
      t('tracking.workshops.title') || 'Phân xưởng',
      t('tracking.columns.partNo') || t('tracking.columns.itemCode') || 'Mã hàng',
      t('tracking.columns.material') || 'Vật liệu',
      t('tracking.columns.hardness') || 'Độ cứng',
      t('tracking.columns.quantity') || 'Số lượng',
      `${t('tracking.columns.weight') || 'Trọng lượng'} (kg)`,
      t('tracking.columns.partner') || 'Đối tác gia công',
      t('tracking.columns.logistics') || 'Logistics',
      t('tracking.columns.qc') || 'QC',
      t('tracking.columns.sentDate') || 'Ngày gửi',
      t('tracking.columns.dueDate') || 'Hạn trả',
      t('tracking.columns.notes') || 'Ghi chú',
    ];
    const body = targetRows.map((r) =>
      [
        r.ID_Key,
        r.So_DatHang,
        r.phong_sx,
        r.ma_hang,
        r.vat_lieu,
        r.do_cung,
        r.so_luong,
        r.kg_Lot,
        formatVendorName(r.cty_QT, role, locale),
        logisticsOf(r),
        qcOf(r),
        date(r.ngay_gui_QT),
        date(r.ncc_ngay_tra_qt || r.han_tra || ""),
        `"${(r.ghi_chu ?? '').replace(/"/g, '""')}"`,
      ].join(','),
    );
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + [head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    playAudioCue('success');
    toast.success(`Đã xuất ${targetRows.length} lô ra file CSV`);
  };

  const copySelectedIds = () => {
    const text = Array.from(selectedLots).join('\n');
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      playAudioCue('success');
      toast.success(`Đã sao chép ${selectedLots.size} mã lô vào bộ nhớ tạm!`);
    }
  };

  // Inline Quick-Edit Handlers: All authenticated roles (viewer, qt_<vendor>, leader, admin) can edit operational fields
  const canEdit = true;
  const isAdmin = role === 'admin';

  const getInitialValue = (item: QTItem, field: EditableField): string => {
    switch (field) {
      case 'ma_hang':
        return item.ma_hang;
      case 'vat_lieu':
        return item.vat_lieu;
      case 'do_cung':
        return item.do_cung;
      case 'so_luong':
        return String(item.so_luong);
      case 'kg_Lot':
        return String(item.kg_Lot);
      case 'cty_QT':
        return item.cty_QT;
      case 'ngay_gui_QT':
        return item.ngay_gui_QT;
      case 'han_tra':
        return item.ncc_ngay_tra_qt || item.han_tra || '';
      case 'ghi_chu':
        return item.ghi_chu ?? '';
      case 'logistics':
        return item.TrangThai;
      case 'qc':
        return qcOf(item);
      default:
        return '';
    }
  };

  const startInlineEdit = (id: string, field: EditableField, initialVal: string) => {
    if (!canEdit) return;
    if (field === 'cty_QT' && !isAdmin) return;
    isSavingRef.current = false;
    setEditingCell({ id, field });
    setEditValue(initialVal);
  };

  const navigateCell = (
    currentId: string,
    currentField: EditableField,
    direction: 'next-row' | 'prev-row' | 'next-col' | 'prev-col',
  ) => {
    const EDITABLE_FIELDS: EditableField[] = [
      'ma_hang',
      'vat_lieu',
      'do_cung',
      'so_luong',
      'kg_Lot',
      ...(isAdmin ? (['cty_QT'] as EditableField[]) : []),
      'ngay_gui_QT',
      'han_tra',
      'ghi_chu',
    ];

    const currentRowIdx = tableRows.findIndex((r) => r.ID_Key === currentId);
    if (currentRowIdx === -1) {
      setEditingCell(null);
      return;
    }

    if (direction === 'next-row') {
      const nextRow = tableRows[currentRowIdx + 1];
      if (nextRow) {
        startInlineEdit(nextRow.ID_Key, currentField, getInitialValue(nextRow, currentField));
      } else {
        setEditingCell(null);
      }
    } else if (direction === 'prev-row') {
      const prevRow = tableRows[currentRowIdx - 1];
      if (prevRow) {
        startInlineEdit(prevRow.ID_Key, currentField, getInitialValue(prevRow, currentField));
      } else {
        setEditingCell(null);
      }
    } else if (direction === 'next-col') {
      const currentColIdx = EDITABLE_FIELDS.indexOf(currentField);
      if (currentColIdx !== -1 && currentColIdx + 1 < EDITABLE_FIELDS.length) {
        const nextField = EDITABLE_FIELDS[currentColIdx + 1]!;
        const row = tableRows[currentRowIdx]!;
        startInlineEdit(row.ID_Key, nextField, getInitialValue(row, nextField));
      } else if (currentRowIdx + 1 < tableRows.length) {
        const nextRow = tableRows[currentRowIdx + 1]!;
        const firstField = EDITABLE_FIELDS[0]!;
        startInlineEdit(nextRow.ID_Key, firstField, getInitialValue(nextRow, firstField));
      } else {
        setEditingCell(null);
      }
    } else if (direction === 'prev-col') {
      const currentColIdx = EDITABLE_FIELDS.indexOf(currentField);
      if (currentColIdx > 0) {
        const prevField = EDITABLE_FIELDS[currentColIdx - 1]!;
        const row = tableRows[currentRowIdx]!;
        startInlineEdit(row.ID_Key, prevField, getInitialValue(row, prevField));
      } else if (currentRowIdx > 0) {
        const prevRow = tableRows[currentRowIdx - 1]!;
        const lastField = EDITABLE_FIELDS[EDITABLE_FIELDS.length - 1]!;
        startInlineEdit(prevRow.ID_Key, lastField, getInitialValue(prevRow, lastField));
      } else {
        setEditingCell(null);
      }
    }
  };

  // Gửi payload ghi ngược hai chiều tới Google Apps Script Webhook (Server tự động xử lý Webhook URL tập trung)
  const syncWriteBack = (idKey: string, vendor: string | undefined, patch: Record<string, any>) => {
    const clientWebhook = (typeof window !== 'undefined' ? window.localStorage.getItem('dynamo-webhook') : '') ?? '';
    void updateLotProgress({
      data: {
        ID_Key: idKey,
        cty_QT: String(vendor ?? ''),
        webhook: clientWebhook,
        updates: patch,
      },
    }).then((res) => {
      if (!res?.ok) {
        toast.error(`Chưa đồng bộ lên Google Sheets: ${res?.error || 'Lỗi kết nối Webhook'}`, {
          duration: 6000,
        });
      } else if (res && 'warning' in res && (res as any).warning) {
        toast.warning((res as any).warning, { duration: 6000 });
      }
    }).catch((err) => {
      console.warn('Lỗi gửi Webhook đồng bộ:', err);
      toast.error('Lỗi mạng khi kết nối Webhook ghi ngược Google Sheets.');
    });
  };

  const saveInlineEdit = (
    item: QTItem,
    navigateDir?: 'next-row' | 'prev-row' | 'next-col' | 'prev-col',
  ) => {
    if (!editingCell || !canEdit || isSavingRef.current) return;
    if (editingCell.id !== item.ID_Key) return;
    const { field, id } = editingCell;

    // Smart check: nếu nội dung không đổi so với ban đầu, chuyển ô/thoát mà không báo toast hay âm thanh
    const initial = getInitialValue(item, field);
    let isUnchanged = false;
    if (field === 'so_luong' || field === 'kg_Lot') {
      isUnchanged = Number(editValue) === Number(initial);
    } else {
      isUnchanged = editValue.trim() === initial.trim();
    }

    if (isUnchanged) {
      if (navigateDir) {
        navigateCell(id, field, navigateDir);
      } else {
        setEditingCell(null);
      }
      return;
    }

    const patch: Partial<QTItem> = {};
    if (field === 'ma_hang') {
      if (!editValue.trim()) {
        toast.error('Mã hàng không được để trống.');
        return;
      }
      patch.ma_hang = editValue.trim();
    } else if (field === 'vat_lieu') {
      patch.vat_lieu = editValue.trim() || '—';
    } else if (field === 'do_cung') {
      patch.do_cung = editValue.trim() || '—';
    } else if (field === 'so_luong') {
      const num = Number(editValue);
      if (isNaN(num) || num <= 0) {
        toast.error('Số lượng phải là số nguyên dương.');
        return;
      }
      patch.so_luong = num;
    } else if (field === 'kg_Lot') {
      const kg = Number(editValue);
      if (isNaN(kg) || kg <= 0) {
        toast.error('Khối lượng kg phải lớn hơn 0.');
        return;
      }
      patch.kg_Lot = kg;
    } else if (field === 'cty_QT') {
      patch.cty_QT = editValue as any;
    } else if (field === 'ngay_gui_QT') {
      patch.ngay_gui_QT = editValue.trim();
    } else if (field === 'han_tra') {
      patch.han_tra = editValue.trim();
      patch.han_tra_est = false;
    } else if (field === 'logistics') {
      patch.TrangThai = editValue as Status;
    } else if (field === 'ghi_chu') {
      patch.ghi_chu = editValue.trim() || undefined;
    }

    isSavingRef.current = true;
    try {
      updateItem(item.ID_Key, patch);
      syncWriteBack(item.ID_Key, item.cty_QT, patch);
      appendAudit({
        ID_Key: item.ID_Key,
        user: role,
        role,
        from: String((item as any)[field] ?? ''),
        to: editValue,
        changes: { [field]: [String((item as any)[field] ?? ''), editValue] },
        result: 'ok',
      });

      setSavedCellKey(`${id}-${field}`);
      setTimeout(() => {
        setSavedCellKey((curr) => (curr === `${id}-${field}` ? null : curr));
      }, 1200);

      playAudioCue('success');
      toast.success(`Đã cập nhật ${field === 'ghi_chu' ? 'ghi chú' : field} cho lô ${item.ID_Key}`);

      if (navigateDir) {
        navigateCell(id, field, navigateDir);
      } else {
        setEditingCell(null);
      }
    } finally {
      setTimeout(() => {
        isSavingRef.current = false;
      }, 120);
    }
  };

  const handleCellKeyDown = (e: React.KeyboardEvent, item: QTItem) => {
    if (e.key === 'Enter') {
      if (editingCell?.field === 'ghi_chu' && e.shiftKey) {
        return; // Cho phép bấm Shift+Enter để xuống dòng khi soạn thảo ghi chú
      }
      e.preventDefault();
      saveInlineEdit(item, e.shiftKey ? 'prev-row' : 'next-row');
    } else if (e.key === 'Tab') {
      e.preventDefault();
      saveInlineEdit(item, e.shiftKey ? 'prev-col' : 'next-col');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setEditingCell(null);
      playAudioCue('pop');
    }
  };

  const selectedRowsList = useMemo(() => rows.filter((r) => selectedLots.has(r.ID_Key)), [rows, selectedLots]);

  const selectedSummary = useMemo(() => {
    let qty = 0;
    let kg = 0;
    for (const r of selectedRowsList) {
      qty += Number(r.so_luong || 0);
      kg += Number(r.kg_Lot || 0);
    }
    return { qty, kg };
  }, [selectedRowsList]);

  return (
    <>
      <div
        ref={tableWrapperRef}
        className={`isolate flex flex-col transition-all duration-200 ${isTableFullscreen
          ? 'fixed inset-0 z-40 bg-background p-2.5 sm:p-3.5 overflow-hidden h-screen w-screen'
          : 'flex-1 min-h-0 w-full overflow-hidden'
          }`}
      >
        {/* Đề xuất 3: Thanh Pill Nhận diện Bộ Lọc Đang Hoạt Động & 1-Chạm Xóa Lọc */}
        {activeFilters.length > 0 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 rounded-xs border border-primary/25 bg-primary/5 p-1.5 text-xs shadow-2xs animate-in fade-in shrink-0">
            <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary mr-1">
              <Filter size={13} />
              {t('tracking.actions.filtering', { count: activeFilters.length }) || `Đang lọc (${activeFilters.length}):`}
            </span>
            {activeFilters.map((af) => (
              <span
                key={af.key}
                className="inline-flex items-center gap-1.5 rounded-xs border border-primary/30 bg-card px-2.5 py-0.5 text-[11px] font-medium text-foreground shadow-2xs"
              >
                <span>{af.label}</span>
                <button
                  type="button"
                  onClick={() => {
                    af.onClear();
                    setTablePage(0);
                    playAudioCue('beep');
                  }}
                  className="text-muted-foreground hover:text-destructive cursor-pointer rounded-xs"
                  title={t('tracking.actions.clearFilterItem') || 'Bỏ tiêu chí này'}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={resetAllFilters}
              className="ml-auto inline-flex items-center gap-1 rounded-xs border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-[11px] font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
              title={t('tracking.actions.clearFilterTooltip') || 'Xóa toàn bộ các bộ lọc trên bảng'}
            >
              <Trash2 size={12} />
              {t('tracking.actions.clearFilter') || 'Xóa tất cả lọc'}
            </button>
          </div>
        )}

        {/* Unified Operational Action Bar - Master Craftsmanship Layout (Chiến lược 2) */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs text-xs shrink-0">
          {/* Cụm Trái: Route Identity, Local / View Actions & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-black tracking-wider uppercase text-foreground">
              {t('nav.route1Title') || '[1] LUÂN CHUYỂN'}
            </span>
            {/* 1. Ô Global Search tích hợp phím tắt '/' */}
            <div className="relative inline-flex items-center">
              <Search size={13} className="absolute left-2.5 text-muted-foreground/70 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setTablePage(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setGlobalSearch('');
                    searchInputRef.current?.blur();
                  }
                }}
                placeholder={t('tracking.toolbars.searchPlaceholder') || 'Tìm nhanh (nhấn /)...'}
                className="h-8 w-52 sm:w-64 rounded-xs border border-input bg-card pl-8 pr-7 text-[11px] font-mono text-foreground placeholder:text-muted-foreground/60 shadow-2xs focus:outline-hidden focus:border-primary/80 focus:ring-1 focus:ring-primary/40 transition-all"
              />
              {globalSearch ? (
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch('');
                    setTablePage(0);
                    searchInputRef.current?.focus();
                  }}
                  title={t('tracking.toolbars.clearSearch') || 'Xóa tìm kiếm (Phím tắt: Esc)'}
                  className="absolute right-2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded-xs"
                >
                  <X size={12} />
                </button>
              ) : (
                <kbd className="hidden sm:inline-block absolute right-2 text-[9px] font-mono text-muted-foreground/60 border border-border/60 rounded-xs px-1 py-0.2 bg-muted/50">
                  /
                </kbd>
              )}
            </div>

            {/* 2. Badge đếm lọc động (chỉ hiện khi có lọc/tìm kiếm để triệt tiêu redundancy) */}
            {(activeFilters.length > 0 || globalSearch.trim()) && (
              <div className="inline-flex items-center gap-1.5 rounded-xs border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs shadow-2xs animate-in fade-in">
                <span className="size-1.5 rounded-full bg-primary fx-run-dot" />
                <span className="text-[11px] text-primary font-bold font-mono tabular-nums">
                  {t('tracking.toolbars.matched') || 'Khớp'}: {number(rows.length)} <span className="font-normal opacity-70">/ {number(all.length)} {t('common.units.lots') || 'lô'}</span>
                </span>
              </div>
            )}

            {/* 3. Bộ lọc Phân xưởng độc lập (Cụm Trái Toolbar) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-98 touch-manipulation ${filters.workshops.length > 0
                    ? 'border-primary/60 bg-primary/10 text-primary font-bold'
                    : 'border-border/80 bg-card text-foreground hover:bg-secondary'
                    }`}
                  title={t('tracking.workshops.filterTooltip') || 'Lọc nhanh theo phân xưởng gia công'}
                >
                  <Layers size={12} className={filters.workshops.length > 0 ? 'text-primary' : 'text-primary/80'} />
                  <span>
                    {t('tracking.workshops.title') || 'Xưởng'}: {filters.workshops.length === 0 ? (t('tracking.workshops.all') || 'Tất cả') : filters.workshops.join(', ')}
                  </span>
                  <ChevronDown size={11} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-2.5 font-sans">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border/40 px-1 font-semibold text-xs text-foreground">
                    <span>{t('tracking.workshops.title') || 'Chọn Phân Xưởng'}</span>
                    {filters.workshops.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((f) => ({ ...f, workshops: [] }));
                          setTablePage(0);
                        }}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {t('common.filters.deselect') || 'Bỏ chọn'}
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFilters((f) => ({ ...f, workshops: [] }));
                      setTablePage(0);
                    }}
                    className={`flex w-full items-center justify-between px-2 py-1.5 rounded-sm text-left text-[11px] cursor-pointer transition-colors ${filters.workshops.length === 0 ? 'bg-primary/15 font-bold text-primary' : 'hover:bg-secondary text-foreground'
                      }`}
                  >
                    <span>{t('tracking.workshops.all') || 'Tất cả phân xưởng'}</span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{all.length}</span>
                  </button>
                  {(['PIN', 'INSERT', 'MOLD'] as Workshop[]).map((ws) => {
                    const isWsSelected = filters.workshops.includes(ws);
                    const wsCount = counts.ws[ws] || 0;
                    return (
                      <button
                        key={ws}
                        type="button"
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            workshops: isWsSelected
                              ? f.workshops.filter((x) => x !== ws)
                              : [...f.workshops, ws],
                          }));
                          setTablePage(0);
                        }}
                        className={`flex w-full items-center justify-between px-2 py-1.5 rounded-sm text-left text-[11px] cursor-pointer transition-colors ${isWsSelected ? 'bg-primary/15 font-bold text-primary' : 'hover:bg-secondary text-foreground'
                          }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`size-2 rounded-full ${ws === 'PIN' ? 'bg-info' : ws === 'INSERT' ? 'bg-primary' : 'bg-warning'}`} />
                          <span>{t('tracking.workshops.title') || 'Xưởng'} {ws}</span>
                        </div>
                        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{wsCount}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* 3. Density toggle button (Row Density Switcher - Tuân thủ TC-DS-09) */}
            <div className="flex rounded-xs border border-border bg-secondary/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => handleSetDensity('compact')}
                title={t('tracking.density.compactTooltip') || 'Chế độ nén dòng cao độ (~32px)'}
                className={`flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${density === 'compact'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span>{t('tracking.density.compact') || 'Nén'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetDensity('normal')}
                title={t('tracking.density.normalTooltip') || 'Chế độ dòng tiêu chuẩn (~42px)'}
                className={`flex items-center gap-1 rounded-xs px-2 py-0.5 text-[11px] font-semibold transition-all cursor-pointer ${density === 'normal'
                  ? 'bg-card text-foreground shadow-2xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
                  }`}
              >
                <span>{t('tracking.density.normal') || 'Chuẩn'}</span>
              </button>
            </div>

            {/* 4. Khôi phục cỡ cột */}
            <button
              type="button"
              onClick={handleResetAllColWidths}
              className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-98 touch-manipulation"
              title={t('tracking.toolbars.resetColWidthsTooltip') || 'Khôi phục kích thước mặc định cho toàn bộ cột'}
            >
              <RotateCcw size={11} className="text-primary/80" />
              <span className="hidden sm:inline">{t('tracking.toolbars.resetColWidths') || 'Khôi phục cỡ cột'}</span>
            </button>
          </div>

          {/* Cụm Phải: Global / Primary Actions (Refresh, Zen Fullscreen, Export CSV Dropdown) */}
          <div className="flex items-center gap-2 text-[11px]">
            {/* Nút Làm Mới (Shift+R) - Đồng bộ từ Shell về Toolbar */}
            <button
              type="button"
              onClick={() => void pullLive(true)}
              disabled={loading}
              title={t('tracking.toolbars.refresh') || 'Làm mới dữ liệu từ Google Sheets (Phím tắt: Shift + R)'}
              aria-label={t('tracking.toolbars.refresh') || 'Làm mới dữ liệu từ Google Sheets'}
              className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-card px-2.5 py-1 text-[11px] font-bold text-foreground hover:bg-secondary transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-98 touch-manipulation disabled:opacity-60"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin text-primary' : 'text-primary'} />
              <span>{loading ? (t('common.loading') || 'Đang tải…') : (t('common.refresh') || 'Làm mới')}</span>
              <kbd className="hidden md:inline-block font-mono text-[9px] text-muted-foreground bg-muted/80 px-1 py-0.2 rounded-xs border border-border/50">
                Shift+R
              </kbd>
            </button>

            {/* Nút Phóng to / Thu nhỏ Toàn Màn hình (Alt+F) */}
            <button
              type="button"
              onClick={toggleTableFullscreen}
              className={`inline-flex items-center gap-1.5 rounded-xs border px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer shadow-2xs active:scale-98 touch-manipulation ${isTableFullscreen
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-border/80 bg-card text-foreground hover:bg-secondary hover:border-primary/40'
                }`}
              title={
                isTableFullscreen
                  ? (t('tracking.toolbars.exitFullscreen') || 'Thu nhỏ bảng về kích thước ban đầu (Phím tắt: Alt+F)')
                  : (t('tracking.toolbars.enterFullscreen') || 'Phóng to bảng toàn màn hình để tập trung điều độ (Phím tắt: Alt+F)')
              }
            >
              {isTableFullscreen ? (
                <Minimize2 size={12} className={isTableFullscreen ? 'text-primary-foreground' : 'text-primary/90'} />
              ) : (
                <Maximize2 size={12} className="text-primary/90" />
              )}
              <span>{isTableFullscreen ? (t('tracking.toolbars.minimize') || 'Thu nhỏ') : (t('tracking.toolbars.fullscreen') || 'Toàn màn hình')}</span>
              <kbd
                className={`hidden sm:inline-block text-[9px] px-1 py-0.2 rounded font-mono border ${isTableFullscreen
                  ? 'bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground'
                  : 'bg-muted/70 border-border/60 text-muted-foreground'
                  }`}
              >
                Alt+F
              </kbd>
            </button>

            {/* Nút Xuất CSV Dropdown đa năng (Chiến lược 2 & 4) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-98 touch-manipulation"
                  title={t('tracking.toolbars.exportCsvTooltip') || 'Tùy chọn xuất file CSV'}
                >
                  <Download size={12} className="text-primary/90" />
                  <span>{t('tracking.toolbars.exportCsv') || 'Xuất CSV'}</span>
                  <ChevronDown size={11} className="text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56 p-2.5 font-sans">
                <div className="space-y-1 text-xs">
                  <button
                    type="button"
                    onClick={() => exportCsv('page')}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 rounded-xs text-left text-[11px] font-medium text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <span>{t('tracking.toolbars.exportCurrentPage') || 'Trang hiện tại'}</span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{tableRows.length} {t('common.units.lots') || 'lô'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCsv('filtered')}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 rounded-xs text-left text-[11px] font-medium text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <span>{t('tracking.toolbars.exportFiltered') || 'Kết quả lọc'}</span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{rows.length} {t('common.units.lots') || 'lô'}</span>
                  </button>
                  <div className="h-px bg-border/80 my-1" />
                  <button
                    type="button"
                    onClick={() => exportCsv('all')}
                    className="flex w-full items-center justify-between px-2.5 py-1.5 rounded-xs text-left text-[11px] font-bold text-primary hover:bg-secondary cursor-pointer"
                  >
                    <span>{t('tracking.toolbars.exportAll') || 'Toàn bộ hệ thống'}</span>
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{all.length} {t('common.units.lots') || 'lô'}</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Data Table View (17 columns with Google Sheets Popover Filters in Header Cells) - TASK-004 */}
        <div className="isolate flex-1 min-h-[400px] md:min-h-0 flex flex-col overflow-hidden rounded-xs border border-border bg-card shadow-2xs">
          <div className="flex-1 min-h-0 overflow-auto">
            <table
              className="text-left text-xs border-collapse"
              style={{
                tableLayout: 'fixed',
                width: '100%',
                minWidth: `${totalTableWidth}px`,
              }}
            >
              <colgroup>
                <col style={{ width: `${colWidths.checkbox}px` }} />
                <col style={{ width: `${colWidths.ma_hang}px` }} />
                <col style={{ width: `${colWidths.ngay_tao}px` }} />
                <col style={{ width: `${colWidths.nguoi_tao}px` }} />
                <col style={{ width: `${colWidths.quoc_gia}px` }} />
                <col style={{ width: `${colWidths.phong_sx}px` }} />
                <col style={{ width: `${colWidths.doi_tuong_hang}px` }} />
                <col style={{ width: `${colWidths.id_ma_hang}px` }} />
                <col style={{ width: `${colWidths.so_luong}px` }} />
                <col style={{ width: `${colWidths.vat_lieu}px` }} />
                <col style={{ width: `${colWidths.do_cung}px` }} />
                <col style={{ width: `${colWidths.kich_thuoc_sp}px` }} />
                <col style={{ width: `${colWidths.kg_lot}px` }} />
                <col style={{ width: `${colWidths.don_vi_tinh}px` }} />
                <col style={{ width: `${colWidths.so_luong_tinh}px` }} />
                <col style={{ width: `${colWidths.don_gia}px` }} />
                <col style={{ width: `${colWidths.thanh_tien}px` }} />
                <col style={{ width: `${colWidths.ty_gia}px` }} />
                <col style={{ width: `${colWidths.ngay_gui_qt}px` }} />
                <col style={{ width: `${colWidths.cty_qt}px` }} />
                <col style={{ width: `${colWidths.trang_thai}px` }} />
                <col style={{ width: `${colWidths.so_dat_hang}px` }} />
                <col style={{ width: `${colWidths.ten_file_dat_hang}px` }} />
                <col style={{ width: `${colWidths.ghi_chu_khi_gui}px` }} />
                <col style={{ width: `${colWidths.ncc_ngay_qt}px` }} />
                <col style={{ width: `${colWidths.ncc_ngay_tra_qt}px` }} />
                <col style={{ width: `${colWidths.ncc_id_lot_qt}px` }} />
                <col style={{ width: `${colWidths.ncc_name_qt}px` }} />
                <col style={{ width: `${colWidths.ncc_giando}px` }} />
                <col style={{ width: `${colWidths.ncc_ket_qua_hrc}px` }} />
                <col style={{ width: `${colWidths.ncc_ket_qua_qc}px` }} />
                <col style={{ width: `${colWidths.ncc_don_gia}px` }} />
                <col style={{ width: `${colWidths.ncc_tatus}px` }} />
                <col style={{ width: `${colWidths.ncc_thongtinkhac1}px` }} />
                <col style={{ width: `${colWidths.ncc_thongtinkhac2}px` }} />
                <col style={{ width: `${colWidths.ncc_file1}px` }} />
                <col style={{ width: `${colWidths.ticket}px` }} />
              </colgroup>
                            <thead
                className="sticky top-0 z-40 bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border shadow-xs"
                style={{ position: 'sticky', top: 0, zIndex: 40 }}
              >
                <tr>
                  {/* Column 0: Checkbox (Sticky top-0 left-0) */}
                  <th
                    className="sticky top-0 left-0 z-50 px-2 py-2 text-center bg-secondary border-r border-border/50 select-none"
                    style={{
                      position: 'sticky',
                      top: 0,
                      left: 0,
                      zIndex: 50,
                      width: `${colWidths.checkbox}px`,
                      minWidth: `${colWidths.checkbox}px`,
                      maxWidth: `${colWidths.checkbox}px`,
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        ref={selectAllCheckboxRef}
                        aria-label={t('tracking.columns.checkbox') || 'Chọn tất cả trên trang này'}
                        checked={isAllPageSelected}
                        onChange={toggleSelectAllPage}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer touch-manipulation"
                      />
                    </div>
                  </th>

                  {/* Column 1: Mã hàng (Sticky top-0 left-[checkbox]) */}
                  <HeaderFilterCell
                    title={t('tracking.columns.itemCode') || 'MÃ HÀNG'}
                    field="ma_hang"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    isFiltered={!!filters.itemSearch}
                    stickyClass="sticky top-0 z-50 bg-secondary"
                    stickyLeft={colWidths.checkbox}
                    width={colWidths.ma_hang}
                    isStickyLast={true}
                    onDirectSort={handleToggleSort}
                  >
                    <HeaderSortControls
                      field="ma_hang"
                      currentField={sortCol}
                      currentDir={sortDir}
                      onSort={handleSort}
                    />
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                        <Search size={11} />
                        {t('tracking.columns.itemCode') || 'Tìm theo mã hàng:'}
                      </label>
                      <input
                        type="text"
                        value={filters.itemSearch}
                        onChange={(e) =>
                          setFilters((f) => ({ ...f, itemSearch: e.target.value }))
                        }
                        placeholder="VD: 9075-P3..."
                        className="w-full h-8 px-2 text-xs rounded-xs border border-border bg-background focus:outline-none focus:border-primary font-mono"
                        autoFocus
                      />
                    </div>
                  </HeaderFilterCell>

                  {/* Column 2: Ngày tạo */}
                  <HeaderFilterCell
                    title={t('tracking.columns.createdDate') || 'NGÀY TẠO'}
                    width={colWidths.ngay_tao}
                    onResize={(e) => handleResizeStart(e, 'ngay_tao')}
                    onResetWidth={() => handleResetWidth('ngay_tao')}
                  />

                  {/* Column 3: Người tạo */}
                  <HeaderFilterCell
                    title={t('tracking.columns.createdBy') || 'NGƯỜI TẠO'}
                    width={colWidths.nguoi_tao}
                    onResize={(e) => handleResizeStart(e, 'nguoi_tao')}
                    onResetWidth={() => handleResetWidth('nguoi_tao')}
                  />

                  {/* Column 4: Quốc gia */}
                  <HeaderFilterCell
                    title={t('tracking.columns.country') || 'QUỐC GIA'}
                    width={colWidths.quoc_gia}
                    onResize={(e) => handleResizeStart(e, 'quoc_gia')}
                    onResetWidth={() => handleResetWidth('quoc_gia')}
                  />

                  {/* Column 5: Phân xưởng */}
                  <HeaderFilterCell
                    title={t('tracking.columns.workshop') || 'XƯỞNG'}
                    width={colWidths.phong_sx}
                    isFiltered={filters.workshops.length > 0}
                    onResize={(e) => handleResizeStart(e, 'phong_sx')}
                    onResetWidth={() => handleResetWidth('phong_sx')}
                  />

                  {/* Column 6: Đối tượng hàng */}
                  <HeaderFilterCell
                    title={t('tracking.columns.targetItem') || 'ĐỐI TƯỢNG HÀNG'}
                    width={colWidths.doi_tuong_hang}
                    onResize={(e) => handleResizeStart(e, 'doi_tuong_hang')}
                    onResetWidth={() => handleResetWidth('doi_tuong_hang')}
                  />

                  {/* Column 7: Mã bản vẽ */}
                  <HeaderFilterCell
                    title={t('tracking.columns.drawingCode') || 'MÃ BẢN VẼ'}
                    width={colWidths.id_ma_hang}
                    onResize={(e) => handleResizeStart(e, 'id_ma_hang')}
                    onResetWidth={() => handleResetWidth('id_ma_hang')}
                  />

                  {/* Column 8: Số lượng */}
                  <HeaderFilterCell
                    title={t('tracking.columns.quantity') || 'SL'}
                    field="so_luong"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    align="end"
                    width={colWidths.so_luong}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'so_luong')}
                    onResetWidth={() => handleResetWidth('so_luong')}
                  />

                  {/* Column 9: Vật liệu */}
                  <HeaderFilterCell
                    title={t('tracking.columns.material') || 'VẬT LIỆU'}
                    field="vat_lieu"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    width={colWidths.vat_lieu}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'vat_lieu')}
                    onResetWidth={() => handleResetWidth('vat_lieu')}
                  />

                  {/* Column 10: Độ cứng */}
                  <HeaderFilterCell
                    title={t('tracking.columns.hardness') || 'ĐỘ CỨNG'}
                    field="do_cung"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    width={colWidths.do_cung}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'do_cung')}
                    onResetWidth={() => handleResetWidth('do_cung')}
                  />

                  {/* Column 11: Quy cách KT */}
                  <HeaderFilterCell
                    title={t('tracking.columns.productDimension') || 'QUY CÁCH KT'}
                    width={colWidths.kich_thuoc_sp}
                    onResize={(e) => handleResizeStart(e, 'kich_thuoc_sp')}
                    onResetWidth={() => handleResetWidth('kich_thuoc_sp')}
                  />

                  {/* Column 12: Trọng lượng KG */}
                  <HeaderFilterCell
                    title={t('tracking.columns.weight') || 'KG'}
                    field="kg_Lot"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    align="end"
                    width={colWidths.kg_lot}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'kg_lot')}
                    onResetWidth={() => handleResetWidth('kg_lot')}
                  />

                  {/* Column 13: Đơn vị tính */}
                  <HeaderFilterCell
                    title={t('tracking.columns.uom') || 'ĐVT'}
                    width={colWidths.don_vi_tinh}
                    onResize={(e) => handleResizeStart(e, 'don_vi_tinh')}
                    onResetWidth={() => handleResetWidth('don_vi_tinh')}
                  />

                  {/* Column 14: Số lượng tính tiền */}
                  <HeaderFilterCell
                    title={t('tracking.columns.calcQuantity') || 'SL TÍNH'}
                    align="end"
                    width={colWidths.so_luong_tinh}
                    onResize={(e) => handleResizeStart(e, 'so_luong_tinh')}
                    onResetWidth={() => handleResetWidth('so_luong_tinh')}
                  />

                  {/* Column 15: Đơn giá */}
                  <HeaderFilterCell
                    title={t('tracking.columns.unitPrice') || 'ĐƠN GIÁ'}
                    align="end"
                    width={colWidths.don_gia}
                    onResize={(e) => handleResizeStart(e, 'don_gia')}
                    onResetWidth={() => handleResetWidth('don_gia')}
                  />

                  {/* Column 16: Thành tiền */}
                  <HeaderFilterCell
                    title={t('tracking.columns.totalAmount') || 'THÀNH TIỀN'}
                    align="end"
                    width={colWidths.thanh_tien}
                    onResize={(e) => handleResizeStart(e, 'thanh_tien')}
                    onResetWidth={() => handleResetWidth('thanh_tien')}
                  />

                  {/* Column 17: Tỷ giá */}
                  <HeaderFilterCell
                    title={t('tracking.columns.exchangeRate') || 'TỶ GIÁ'}
                    align="end"
                    width={colWidths.ty_gia}
                    onResize={(e) => handleResizeStart(e, 'ty_gia')}
                    onResetWidth={() => handleResetWidth('ty_gia')}
                  />

                  {/* Column 18: Ngày gửi */}
                  <HeaderFilterCell
                    title={t('tracking.columns.sentDate') || 'NGÀY GỬI'}
                    field="ngay_gui_QT"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    width={colWidths.ngay_gui_qt}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'ngay_gui_qt')}
                    onResetWidth={() => handleResetWidth('ngay_gui_qt')}
                  />

                  {/* Column 19: Đối tác */}
                  <HeaderFilterCell
                    title={t('tracking.columns.partner') || 'ĐỐI TÁC'}
                    field="cty_QT"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    width={colWidths.cty_qt}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'cty_qt')}
                    onResetWidth={() => handleResetWidth('cty_qt')}
                  />

                  {/* Column 20: Trạng thái gốc */}
                  <HeaderFilterCell
                    title={t('tracking.columns.sheetStatus') || 'TRẠNG THÁI GỐC'}
                    width={colWidths.trang_thai}
                    onResize={(e) => handleResizeStart(e, 'trang_thai')}
                    onResetWidth={() => handleResetWidth('trang_thai')}
                  />

                  {/* Column 21: Số đơn hàng */}
                  <HeaderFilterCell
                    title={t('tracking.columns.orderNo') || 'ĐƠN HÀNG'}
                    field="So_DatHang"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    width={colWidths.so_dat_hang}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'so_dat_hang')}
                    onResetWidth={() => handleResetWidth('so_dat_hang')}
                  />

                  {/* Column 22: File đơn hàng */}
                  <HeaderFilterCell
                    title={t('tracking.columns.orderPdf') || 'FILE PO'}
                    width={colWidths.ten_file_dat_hang}
                    onResize={(e) => handleResizeStart(e, 'ten_file_dat_hang')}
                    onResetWidth={() => handleResetWidth('ten_file_dat_hang')}
                  />

                  {/* Column 23: Ghi chú khi gửi */}
                  <HeaderFilterCell
                    title={t('tracking.columns.dispatchNotes') || 'GHI CHÚ XUẤT'}
                    field="ghi_chu"
                    sortCol={sortCol}
                    sortDir={sortDir}
                    width={colWidths.ghi_chu_khi_gui}
                    onDirectSort={handleToggleSort}
                    onResize={(e) => handleResizeStart(e, 'ghi_chu_khi_gui')}
                    onResetWidth={() => handleResetWidth('ghi_chu_khi_gui')}
                  />

                  {/* Column 24: NCC Ngày vào lò */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorOvenDate') || 'NCC VÀO LÒ'}
                    width={colWidths.ncc_ngay_qt}
                    onResize={(e) => handleResizeStart(e, 'ncc_ngay_qt')}
                    onResetWidth={() => handleResetWidth('ncc_ngay_qt')}
                  />

                  {/* Column 25: NCC Hạn trả cam kết */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorDueDate') || 'NCC HẠN TRẢ'}
                    width={colWidths.ncc_ngay_tra_qt}
                    onResize={(e) => handleResizeStart(e, 'ncc_ngay_tra_qt')}
                    onResetWidth={() => handleResetWidth('ncc_ngay_tra_qt')}
                  />

                  {/* Column 26: NCC Mã mẻ nhiệt */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorLotId') || 'NCC MÃ MẺ'}
                    width={colWidths.ncc_id_lot_qt}
                    onResize={(e) => handleResizeStart(e, 'ncc_id_lot_qt')}
                    onResetWidth={() => handleResetWidth('ncc_id_lot_qt')}
                  />

                  {/* Column 27: NCC Kỹ thuật viên */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorTech') || 'NCC KỸ THUẬT'}
                    width={colWidths.ncc_name_qt}
                    onResize={(e) => handleResizeStart(e, 'ncc_name_qt')}
                    onResetWidth={() => handleResetWidth('ncc_name_qt')}
                  />

                  {/* Column 28: NCC Giản đồ nhiệt */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorHeatDiagram') || 'GIẢN ĐỒ NHIỆT'}
                    width={colWidths.ncc_giando}
                    onResize={(e) => handleResizeStart(e, 'ncc_giando')}
                    onResetWidth={() => handleResetWidth('ncc_giando')}
                  />

                  {/* Column 29: NCC Độ cứng đo */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorHrcMeasured') || 'NCC ĐỘ CỨNG'}
                    width={colWidths.ncc_ket_qua_hrc}
                    onResize={(e) => handleResizeStart(e, 'ncc_ket_qua_hrc')}
                    onResetWidth={() => handleResetWidth('ncc_ket_qua_hrc')}
                  />

                  {/* Column 30: NCC Nghiệm thu QC */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorQcVerdict') || 'NCC NGHIỆM THU'}
                    width={colWidths.ncc_ket_qua_qc}
                    onResize={(e) => handleResizeStart(e, 'ncc_ket_qua_qc')}
                    onResetWidth={() => handleResetWidth('ncc_ket_qua_qc')}
                  />

                  {/* Column 31: NCC Đơn giá báo */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorQuotedPrice') || 'NCC BÁO GIÁ'}
                    align="end"
                    width={colWidths.ncc_don_gia}
                    onResize={(e) => handleResizeStart(e, 'ncc_don_gia')}
                    onResetWidth={() => handleResetWidth('ncc_don_gia')}
                  />

                  {/* Column 32: NCC Trạng thái tiến độ */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorStatus') || 'NCC TIẾN ĐỘ'}
                    width={colWidths.ncc_tatus}
                    onResize={(e) => handleResizeStart(e, 'ncc_tatus')}
                    onResetWidth={() => handleResetWidth('ncc_tatus')}
                  />

                  {/* Column 33: NCC Mở rộng 1 */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorExtra1') || 'NCC MỞ RỘNG 1'}
                    width={colWidths.ncc_thongtinkhac1}
                    onResize={(e) => handleResizeStart(e, 'ncc_thongtinkhac1')}
                    onResetWidth={() => handleResetWidth('ncc_thongtinkhac1')}
                  />

                  {/* Column 34: NCC Mở rộng 2 */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorExtra2') || 'NCC MỞ RỘNG 2'}
                    width={colWidths.ncc_thongtinkhac2}
                    onResize={(e) => handleResizeStart(e, 'ncc_thongtinkhac2')}
                    onResetWidth={() => handleResetWidth('ncc_thongtinkhac2')}
                  />

                  {/* Column 35: NCC Chứng nhận QC */}
                  <HeaderFilterCell
                    title={t('tracking.columns.vendorQcCert') || 'CHỨNG NHẬN QC'}
                    width={colWidths.ncc_file1}
                    onResize={(e) => handleResizeStart(e, 'ncc_file1')}
                    onResetWidth={() => handleResetWidth('ncc_file1')}
                  />

                  {/* Column 36: Phiếu A4 (Sticky top-0 right-0) */}
                  <th
                    className="sticky top-0 right-0 z-50 whitespace-nowrap px-2 py-2 text-center bg-secondary font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground select-none border-l border-border/80 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.25)]"
                    style={{
                      position: 'sticky',
                      top: 0,
                      right: 0,
                      zIndex: 50,
                      width: `${colWidths.ticket}px`,
                      minWidth: `${colWidths.ticket}px`,
                      maxWidth: `${colWidths.ticket}px`,
                    }}
                  >
                    <span className="text-[10px]">{t('tracking.columns.ticket') || 'PHIẾU A4'}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {tableRows.length ? (
                  tableRows.map((r) => {
                    const isSelected = selectedLots.has(r.ID_Key);
                    const padY = density === 'compact' ? 'py-1' : 'py-2.5';

                    return (
                      <tr
                        key={r.ID_Key}
                        className={`group transition-colors ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-accent/40'}`}
                      >
                        {/* 0. Checkbox */}
                        <td
                          className={`sticky left-0 z-20 px-3 ${padY} text-center transition-colors border-r border-border/40 bg-card relative ${isSelected
                            ? 'before:absolute before:inset-0 before:bg-primary/15 before:pointer-events-none group-hover:before:bg-primary/20'
                            : 'group-hover:before:absolute group-hover:before:inset-0 group-hover:before:bg-accent/40 group-hover:before:pointer-events-none'
                            }`}
                          style={{
                            position: 'sticky',
                            left: 0,
                            zIndex: 20,
                            width: `${colWidths.checkbox}px`,
                            minWidth: `${colWidths.checkbox}px`,
                            maxWidth: `${colWidths.checkbox}px`,
                          }}
                        >
                          <div className="relative z-10 flex items-center justify-center">
                            <input
                              type="checkbox"
                              aria-label={t('tracking.table.selectLot', { lotId: r.ID_Key }) || `Chọn lô ${r.ID_Key}`}
                              checked={isSelected}
                              onChange={() => toggleSelectLot(r.ID_Key)}
                              className="h-4.5 w-4.5 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer touch-manipulation"
                            />
                          </div>
                        </td>

                        {/* 1. Mã hàng (Sticky left-[checkbox], click -> opens drawer) */}
                        <td
                          className={`sticky z-20 whitespace-nowrap px-3.5 ${padY} transition-colors border-r border-border/80 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)] bg-card relative ${isSelected
                            ? 'before:absolute before:inset-0 before:bg-primary/15 before:pointer-events-none group-hover:before:bg-primary/20'
                            : 'group-hover:before:absolute group-hover:before:inset-0 group-hover:before:bg-accent/40 group-hover:before:pointer-events-none'
                            }`}
                          style={{
                            position: 'sticky',
                            left: `${colWidths.checkbox}px`,
                            zIndex: 20,
                            width: `${colWidths.ma_hang}px`,
                            minWidth: `${colWidths.ma_hang}px`,
                            maxWidth: `${colWidths.ma_hang}px`,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setDetailLot(r)}
                            className="relative z-10 font-mono font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                            title={t('tracking.table.viewLotDetail') || 'Bấm để xem chi tiết & lịch sử lô'}
                          >
                            {r.ma_hang}
                          </button>
                        </td>

                        {/* 2. Ngày tạo */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.ngay_tao}px` }}>
                          {r.ngay_tao ? date(r.ngay_tao) : '—'}
                        </td>

                        {/* 3. Người tạo */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.nguoi_tao}px` }}>
                          {r.nguoi_tao ? String(r.nguoi_tao) : '—'}
                        </td>

                        {/* 4. Quốc gia */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.quoc_gia}px` }}>
                          {r.quoc_gia || 'Vietnam'}
                        </td>

                        {/* 5. Phân xưởng */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} truncate`} style={{ maxWidth: `${colWidths.phong_sx}px` }}>
                          <span className="px-1.5 py-0.5 rounded-xs font-mono font-bold text-[10px] bg-secondary border border-border/60">
                            {r.phong_sx}
                          </span>
                        </td>

                        {/* 6. Đối tượng hàng */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.doi_tuong_hang}px` }}>
                          {r.doi_tuong_hang || '—'}
                        </td>

                        {/* 7. Mã bản vẽ / phôi */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.id_ma_hang}px` }}>
                          {r.id_ma_hang || '—'}
                        </td>

                        {/* 8. Số lượng */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-right font-mono tabular-nums font-bold text-foreground`} style={{ maxWidth: `${colWidths.so_luong}px` }}>
                          {number(r.so_luong)}
                        </td>

                        {/* 9. Vật liệu */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono font-bold text-foreground truncate`} style={{ maxWidth: `${colWidths.vat_lieu}px` }}>
                          {r.vat_lieu || 'Chưa rõ'}
                        </td>

                        {/* 10. Độ cứng HRC */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-destructive font-black truncate`} style={{ maxWidth: `${colWidths.do_cung}px` }}>
                          {r.do_cung || '—'}
                        </td>

                        {/* 11. Quy cách kích thước */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.kich_thuoc_sp}px` }}>
                          {r.kich_thuoc_sp || r.Kich_Thuoc_SP || '—'}
                        </td>

                        {/* 12. Trọng lượng KG */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-right font-mono tabular-nums text-foreground`} style={{ maxWidth: `${colWidths.kg_lot}px` }}>
                          {number(r.kg_lot || r.kg_Lot, 2)}
                        </td>

                        {/* 13. Đơn vị tính */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-muted-foreground font-mono truncate`} style={{ maxWidth: `${colWidths.don_vi_tinh}px` }}>
                          {r.don_vi_tinh || 'pcs'}
                        </td>

                        {/* 14. Số lượng tính */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-right font-mono tabular-nums text-foreground`} style={{ maxWidth: `${colWidths.so_luong_tinh}px` }}>
                          {number(r.so_luong_tinh || (r.don_vi_tinh === 'Kg' ? (r.kg_lot || r.kg_Lot) : r.so_luong), 2)}
                        </td>

                        {/* 15. Đơn giá */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-right font-mono tabular-nums text-foreground`} style={{ maxWidth: `${colWidths.don_gia}px` }}>
                          {canViewPricing(role as any) ? money(r.don_gia) : '*** ₫'}
                        </td>

                        {/* 16. Thành tiền */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-right font-mono tabular-nums font-bold text-primary`} style={{ maxWidth: `${colWidths.thanh_tien}px` }}>
                          {canViewPricing(role as any) ? money(r.thanh_tien) : '*** ₫'}
                        </td>

                        {/* 17. Tỷ giá */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-right font-mono tabular-nums text-muted-foreground`} style={{ maxWidth: `${colWidths.ty_gia}px` }}>
                          {number(r.ty_gia || 1)}
                        </td>

                        {/* 18. Ngày gửi */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-muted-foreground`} style={{ maxWidth: `${colWidths.ngay_gui_qt}px` }}>
                          {date(r.ngay_gui_qt || r.ngay_gui_QT)}
                        </td>

                        {/* 19. Đối tác */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-medium text-foreground truncate`} style={{ maxWidth: `${colWidths.cty_qt}px` }}>
                          {formatVendorName(r.cty_qt || r.cty_QT, role as any)}
                        </td>

                        {/* 20. Trạng thái gốc */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} truncate`} style={{ maxWidth: `${colWidths.trang_thai}px` }}>
                          <span className="px-1.5 py-0.5 rounded-xs font-mono text-[10px] bg-secondary border border-border/60">
                            {r.trang_thai || r.TrangThai}
                          </span>
                        </td>

                        {/* 21. Số đơn hàng */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.so_dat_hang}px` }}>
                          {r.so_dat_hang || r.So_DatHang}
                        </td>

                        {/* 22. File đơn hàng */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} truncate`} style={{ maxWidth: `${colWidths.ten_file_dat_hang}px` }}>
                          {r.ten_file_dat_hang ? (
                            <a href={r.ten_file_dat_hang} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[11px]">
                              [PDF]
                            </a>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>

                        {/* 23. Ghi chú khi gửi */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.ghi_chu_khi_gui}px` }} title={r.ghi_chu_khi_gui || r.ghi_chu}>
                          {r.ghi_chu_khi_gui || r.ghi_chu || '—'}
                        </td>

                        {/* 24. NCC Ngày vào lò */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-xs text-muted-foreground`} style={{ maxWidth: `${colWidths.ncc_ngay_qt}px` }}>
                          {r.ncc_ngay_qt ? date(r.ncc_ngay_qt) : '—'}
                        </td>

                        {/* 25. NCC Hạn trả */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-xs font-bold text-foreground`} style={{ maxWidth: `${colWidths.ncc_ngay_tra_qt}px` }}>
                          {r.ncc_ngay_tra_qt ? date(r.ncc_ngay_tra_qt) : '—'}
                        </td>

                        {/* 26. NCC Mã mẻ */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono text-xs text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.ncc_id_lot_qt}px` }}>
                          {r.ncc_id_lot_qt || '—'}
                        </td>

                        {/* 27. NCC Kỹ thuật viên */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.ncc_name_qt}px` }}>
                          {r.ncc_name_qt || '—'}
                        </td>

                        {/* 28. NCC Giản đồ nhiệt */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs`} style={{ maxWidth: `${colWidths.ncc_giando}px` }}>
                          {r.ncc_giando ? (
                            <button
                              type="button"
                              onClick={() => setPreviewFile({ url: r.ncc_giando!, title: `Giản đồ nhiệt - ${r.ma_hang}`, type: 'image' })}
                              className="font-mono text-[11px] text-primary hover:underline cursor-pointer"
                            >
                              [Xem ảnh]
                            </button>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>

                        {/* 29. NCC Độ cứng đo */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} font-mono font-bold text-xs text-run`} style={{ maxWidth: `${colWidths.ncc_ket_qua_hrc}px` }}>
                          {r.ncc_ket_qua_hrc || '—'}
                        </td>

                        {/* 30. NCC Nghiệm thu QC */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs`} style={{ maxWidth: `${colWidths.ncc_ket_qua_qc}px` }}>
                          {r.ncc_ket_qua_qc === 'PASS' ? (
                            <span className="px-1.5 py-0.5 rounded-xs font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                              PASS
                            </span>
                          ) : r.ncc_ket_qua_qc === 'FAIL' ? (
                            <span className="px-1.5 py-0.5 rounded-xs font-mono font-bold text-[10px] bg-destructive/10 text-destructive border border-destructive/30">
                              FAIL
                            </span>
                          ) : (
                            <span className="text-muted-foreground/60 text-[10px] font-mono">PENDING</span>
                          )}
                        </td>

                        {/* 31. NCC Đơn giá báo */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-right font-mono text-xs`} style={{ maxWidth: `${colWidths.ncc_don_gia}px` }}>
                          {r.ncc_don_gia ? (canViewPricing(role as any) ? money(r.ncc_don_gia) : '*** ₫') : '—'}
                        </td>

                        {/* 32. NCC Tiến độ */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.ncc_tatus}px` }}>
                          {r.ncc_tatus || '—'}
                        </td>

                        {/* 33. NCC Mở rộng 1 */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.ncc_thongtinkhac1}px` }}>
                          {r.ncc_thongtinkhac1 || '—'}
                        </td>

                        {/* 34. NCC Mở rộng 2 */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs text-muted-foreground truncate`} style={{ maxWidth: `${colWidths.ncc_thongtinkhac2}px` }}>
                          {r.ncc_thongtinkhac2 || '—'}
                        </td>

                        {/* 35. NCC Chứng nhận QC */}
                        <td className={`whitespace-nowrap px-3.5 ${padY} text-xs`} style={{ maxWidth: `${colWidths.ncc_file1}px` }}>
                          {r.ncc_file1 ? (
                            <button
                              type="button"
                              onClick={() => setPreviewFile({ url: r.ncc_file1!, title: `Chứng nhận QC - ${r.ma_hang}`, type: 'pdf' })}
                              className="font-mono text-[11px] text-primary hover:underline cursor-pointer"
                            >
                              [Xem QC]
                            </button>
                          ) : (
                            <span className="text-muted-foreground/50">—</span>
                          )}
                        </td>

                        {/* 36. Phiếu A4 (Sticky Right Pin) */}
                        <td
                          className={`sticky right-0 z-20 whitespace-nowrap px-2 ${padY} text-center transition-colors border-l border-border/80 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.25)] bg-card relative ${isSelected
                            ? 'before:absolute before:inset-0 before:bg-primary/15 before:pointer-events-none group-hover:before:bg-primary/20'
                            : 'group-hover:before:absolute group-hover:before:inset-0 group-hover:before:bg-accent/40 group-hover:before:pointer-events-none'
                            }`}
                          style={{
                            position: 'sticky',
                            right: 0,
                            zIndex: 20,
                            width: `${colWidths.ticket}px`,
                            minWidth: `${colWidths.ticket}px`,
                            maxWidth: `${colWidths.ticket}px`,
                          }}
                        >
                          <div className="relative z-10 flex items-center justify-center">
                            <JobTicketButton item={r} role={role} variant="icon" />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={37} className="px-4 py-16 text-center text-xs text-muted-foreground">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xs bg-muted/60 border border-border/80 text-muted-foreground mb-3">
                        <PackageOpen size={24} className="opacity-80 text-foreground" />
                      </div>
                      <p className="font-bold text-foreground text-sm">
                        {t('common.notFound.title') || 'Không tìm thấy lô hàng nào phù hợp với bộ lọc'}
                      </p>
                      <p className="mt-1 text-xs">
                        Thử điều chỉnh hoặc xóa bớt các tiêu chí lọc ở thanh công cụ.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Minimal Pagination Bar (Chiến lược 4) */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2.5 border-t border-border bg-secondary/35 px-3.5 py-2 text-[11px] text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono tabular-nums text-foreground/90 font-medium bg-background/80 px-2.5 py-1 rounded-xs border border-border/60 shadow-2xs">
                {t('orders.telemetry.viewing') || 'Đang xem'} <b className="text-foreground">{number(rows.length ? tablePage * pageSize + 1 : 0)}</b> –{' '}
                <b className="text-foreground">{number(Math.min((tablePage + 1) * pageSize, rows.length))}</b> /{' '}
                <span className="font-bold text-foreground">{number(rows.length)}</span> {t('common.units.lots') || 'lô'}
              </span>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">{t('common.view') || 'Hiển thị'}:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setTablePage(0);
                  }}
                  className="rounded-xs border border-input bg-background px-2.5 py-1 text-[11px] text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} {t('common.units.items') || 'dòng/trang'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={tablePage === 0}
                onClick={() => {
                  setTablePage((p) => Math.max(0, p - 1));
                  playAudioCue('beep');
                }}
                title={t('common.pagination.prev') || 'Trang trước'}
                className="inline-flex items-center gap-1 rounded-xs border border-border/80 bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all cursor-pointer shadow-2xs active:scale-98 touch-manipulation"
              >
                <ChevronLeft size={13} />
                <span>{t('common.pagination.prev') || 'Trang trước'}</span>
                <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 bg-muted text-muted-foreground rounded border border-border/60 font-mono">
                  Alt+←
                </kbd>
              </button>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xs bg-background border border-border/70 font-mono text-[11px] shadow-2xs">
                <span className="text-muted-foreground font-sans">{t('common.pagination.page') || 'Trang'}</span>
                <span className="font-bold text-foreground text-xs">{tablePage + 1}</span>
                <span className="text-muted-foreground/60">/</span>
                <span className="font-semibold text-muted-foreground">{number(totalPages)}</span>
              </span>

              <button
                type="button"
                disabled={tablePage + 1 >= totalPages}
                onClick={() => {
                  setTablePage((p) => Math.min(totalPages - 1, p + 1));
                  playAudioCue('beep');
                }}
                title={t('common.pagination.next') || 'Trang sau'}
                className="inline-flex items-center gap-1 rounded-xs border border-border/80 bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all cursor-pointer shadow-2xs active:scale-98 touch-manipulation"
              >
                <span>{t('common.pagination.next') || 'Trang sau'}</span>
                <ChevronRight size={13} />
                <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 bg-muted text-muted-foreground rounded border border-border/60 font-mono">
                  Alt+→
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Proposal 2 & 5: Floating Bulk Action Bar - Monozukuri Control Dock (TASK-008) */}
      {selectedLots.size > 0 && (
        <aside
          aria-label={t('tracking.batch.title') || 'Thao tác hàng loạt'}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-45 flex flex-wrap items-center gap-2.5 rounded-xs border border-border/80 bg-card/98 px-4 py-2 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 text-xs max-w-[calc(100vw-1.5rem)]"
        >
          {/* Segment 1: Selected Count & Telemetry */}
          <div className="flex items-center gap-2.5 pr-3 border-r border-border/80">
            <span className="flex h-6 w-6 items-center justify-center rounded-xs bg-primary text-[11px] font-mono font-black text-primary-foreground shadow-2xs">
              {selectedLots.size}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground leading-tight">
                {t('tracking.batch.selected', { count: selectedLots.size }) || `${selectedLots.size} lô được chọn`}
              </span>
              <span className="text-[10px] font-mono text-muted-foreground leading-tight">
                {number(selectedSummary.qty)} {t('common.units.items') || 'chi tiết'} • {number(Math.round(selectedSummary.kg * 10) / 10)} kg
              </span>
            </div>
          </div>

          {/* Segment 2: Production Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBulkEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xs bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <PenLine size={13} />
              <span>{t('tracking.batch.title') || 'Sửa hàng loạt'}</span>
            </button>

            <button
              type="button"
              onClick={() => setBatchPrintOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary hover:border-border transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <Printer size={13} className="text-primary/80" />
              <span>{t('tracking.batch.printTickets') || 'In phiếu A4'} ({selectedLots.size})</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Segment 3: Data & Export Operations */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => exportCsv(true)}
              className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary hover:border-border transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <Download size={13} className="text-primary/80" />
              <span>{t('common.exportCsv') || 'Xuất CSV'}</span>
            </button>

            <button
              type="button"
              onClick={copySelectedIds}
              className="inline-flex items-center gap-1.5 rounded-xs border border-border/80 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary hover:border-border transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <Copy size={13} className="text-muted-foreground" />
              <span>{t('common.copy') || 'Copy mã'}</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border/80" />

          {/* Segment 4: Clear Selection CTA with Esc Badge */}
          <button
            type="button"
            onClick={() => {
              setSelectedLots(new Set());
              playAudioCue('pop');
            }}
            className="inline-flex items-center gap-1 rounded-xs px-2 py-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            title={t('tracking.batch.deselectAll') || 'Bỏ chọn toàn bộ (Phím tắt: Esc)'}
          >
            <X size={15} />
            <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 bg-muted text-muted-foreground rounded border border-border/60 font-mono">
              Esc
            </kbd>
          </button>
        </aside>
      )}

      {/* Proposal 2: Smart Bulk Edit Modal */}
      {bulkEditOpen && (
        <BulkEditDialog
          items={selectedRowsList}
          role={role}
          onClose={() => setBulkEditOpen(false)}
          onApply={(patch, reason) => {
            const ids = selectedRowsList.map((r) => r.ID_Key);
            bulkUpdateItems(ids, patch);
            ids.forEach((id) => {
              const matchedItem = selectedRowsList.find((r) => r.ID_Key === id);
              syncWriteBack(id, matchedItem?.cty_QT, patch);
              appendAudit({
                ID_Key: id,
                user: role,
                role,
                from: 'Hàng loạt',
                to: 'Cập nhật hàng loạt',
                changes: patch as any,
                reason,
                result: 'ok',
              });
            });
            toast.success(`Đã cập nhật hàng loạt cho ${ids.length} lô hàng!`);
            playAudioCue('success');
            setBulkEditOpen(false);
            setSelectedLots(new Set());
          }}
        />
      )}

      {/* Proposal 5: Batch A4 Job Ticket Modal */}
      {batchPrintOpen && (
        <BatchJobTicketModal
          items={selectedRowsList}
          role={role}
          open={batchPrintOpen}
          onOpenChange={setBatchPrintOpen}
        />
      )}

      {/* Proposal 1: Lot Detail Drawer (Slide-over) */}
      {detailLot && (
        <LotDetailDrawer
          item={detailLot}
          role={role}
          onClose={() => setDetailLot(null)}
          onUpdate={(patch) => {
            updateItem(detailLot.ID_Key, patch);
            syncWriteBack(detailLot.ID_Key, detailLot.cty_QT, patch);
            setDetailLot((prev) => (prev ? { ...prev, ...patch } : null));
          }}
        />
      )}

      {/* File Lightbox / Preview Modal for ncc_giando & ncc_file1 */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-3xl rounded-xs border border-border bg-card p-4">
            <DialogTitle className="font-mono text-sm font-bold flex items-center justify-between border-b border-border pb-2">
              <span>{previewFile.title}</span>
              <a
                href={previewFile.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline font-sans"
              >
                [Mở tab mới]
              </a>
            </DialogTitle>
            <div className="mt-3 max-h-[75vh] overflow-auto flex items-center justify-center bg-secondary/30 rounded-xs p-2">
              {previewFile.type === 'image' ? (
                <img
                  src={previewFile.url}
                  alt={previewFile.title}
                  className="max-h-[70vh] max-w-full object-contain rounded-xs"
                />
              ) : (
                <iframe
                  src={previewFile.url}
                  title={previewFile.title}
                  className="w-full h-[65vh] rounded-xs border border-border"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Proposal 2: Bulk Edit Dialog Component
function BulkEditDialog({
  items,
  role,
  onClose,
  onApply,
}: {
  items: QTItem[];
  role: string;
  onClose: () => void;
  onApply: (patch: Partial<QTItem>, reason: string) => void;
}) {
  const { t } = useTranslation();
  const isAdmin = role === 'admin';
  const [updateLogi, setUpdateLogi] = useState(false);
  const [logiVal, setLogiVal] = useState<Status>('Đang tại Vendor');

  const [updateDue, setUpdateDue] = useState(false);
  const [dueMode, setDueMode] = useState<'add3' | 'add7' | 'custom'>('add7');
  const [customDue, setCustomDue] = useState('');

  const [updateHrc, setUpdateHrc] = useState(false);
  const [hrcVal, setHrcVal] = useState('');

  const [updateVendor, setUpdateVendor] = useState(false);
  const [vendorVal, setVendorVal] = useState<Vendor>('YAMAICHI');

  const [updateSendDate, setUpdateSendDate] = useState(false);
  const [sendDateVal, setSendDateVal] = useState('');

  const [updateMaterial, setUpdateMaterial] = useState(false);
  const [materialVal, setMaterialVal] = useState('');

  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    const patch: Partial<QTItem> = {};
    if (updateLogi) patch.TrangThai = logiVal;
    if (updateHrc && hrcVal.trim()) patch.do_cung = hrcVal.trim();
    if (updateVendor) patch.cty_QT = vendorVal;
    if (updateSendDate && sendDateVal) patch.ngay_gui_QT = sendDateVal;
    if (updateMaterial && materialVal.trim()) patch.vat_lieu = materialVal.trim();
    if (updateDue) {
      if (dueMode === 'custom' && customDue) {
        patch.han_tra = customDue;
        patch.han_tra_est = false;
      } else {
        const days = dueMode === 'add3' ? 3 : 7;
        const now = new Date();
        patch.han_tra = ymd(new Date(now.getTime() + days * DAY));
        patch.han_tra_est = false;
      }
    }
    onApply(patch, reason || 'Cập nhật hàng loạt từ bảng luân chuyển');
  };

  const hasAnyChange =
    updateLogi || updateDue || updateHrc || updateVendor || updateSendDate || updateMaterial;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="mes-card w-full max-w-xl overflow-hidden rounded-xs p-6 shadow-xl max-h-[90vh] overflow-y-auto border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-xs bg-primary/10 text-primary">
              <PenLine size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">
                {t('tracking.batch.title') || 'Sửa hàng loạt'} ({items.length} {t('common.units.lots') || 'lô'})
              </h2>
              <p className="text-xs text-muted-foreground">
                {t('tracking.toolbars.workshopSelect') || 'Cập nhật đồng bộ các thông số cho toàn bộ lô được chọn'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-xs p-1 text-muted-foreground hover:bg-secondary cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Option 1: Logistics */}
          <div className="rounded-xs border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateLogi}
                onChange={(e) => setUpdateLogi(e.target.checked)}
                className="rounded-xs text-primary focus:ring-primary accent-primary"
              />
              <span>{t('tracking.batch.updateLogistics') || 'Chuyển trạng thái Logistics'}</span>
            </label>
            {updateLogi && (
              <select
                value={logiVal}
                onChange={(e) => setLogiVal(e.target.value as Status)}
                className="w-full rounded-xs border border-input bg-background px-3 py-1.5 text-xs text-foreground font-semibold"
              >
                <option value="Chờ xuất xưởng">{t('tracking.status.waitLabel') || 'Chờ xuất xưởng'}</option>
                <option value="Đang tại Vendor">{t('tracking.status.transitLabel') || 'Đang tại Vendor'}</option>
                <option value="Đã nhập kho">{t('tracking.status.stockedLabel') || 'Đã nhập kho'}</option>
              </select>
            )}
          </div>

          {/* Option 2: Hạn trả */}
          <div className="rounded-xs border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateDue}
                onChange={(e) => setUpdateDue(e.target.checked)}
                className="rounded-xs text-primary focus:ring-primary accent-primary"
              />
              <span>{t('tracking.columns.dueDate') || 'Gia hạn / Cập nhật hạn trả hàng loạt'}</span>
            </label>
            {updateDue && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDueMode('add3')}
                    className={`flex-1 rounded-xs border px-2 py-1 text-xs cursor-pointer ${dueMode === 'add3' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                      }`}
                  >
                    +3 {t('common.units.days') || 'Ngày'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueMode('add7')}
                    className={`flex-1 rounded-xs border px-2 py-1 text-xs cursor-pointer ${dueMode === 'add7' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                      }`}
                  >
                    +7 {t('common.units.days') || 'Ngày'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueMode('custom')}
                    className={`flex-1 rounded-xs border px-2 py-1 text-xs cursor-pointer ${dueMode === 'custom' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                      }`}
                  >
                    {t('common.date') || 'Ngày cụ thể'}
                  </button>
                </div>
                {dueMode === 'custom' && (
                  <input
                    type="date"
                    value={customDue}
                    onChange={(e) => setCustomDue(e.target.value)}
                    className="w-full rounded-xs border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                  />
                )}
              </div>
            )}
          </div>

          {/* Option 3: Độ cứng */}
          <div className="rounded-xs border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateHrc}
                onChange={(e) => setUpdateHrc(e.target.checked)}
                className="rounded-xs text-primary focus:ring-primary accent-primary"
              />
              <span>{t('tracking.columns.hardness') || 'Cập nhật độ cứng thực tế'}</span>
            </label>
            {updateHrc && (
              <input
                type="text"
                placeholder="VD: 58-62 HRC hoặc 44±1"
                value={hrcVal}
                onChange={(e) => setHrcVal(e.target.value)}
                className="w-full rounded-xs border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
              />
            )}
          </div>

          {/* Option 4: Đối tác QT (Admin only) */}
          {isAdmin && (
            <div className="rounded-xs border p-3 bg-secondary/20">
              <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={updateVendor}
                  onChange={(e) => setUpdateVendor(e.target.checked)}
                  className="rounded-xs text-primary focus:ring-primary accent-primary"
                />
                <span>{t('tracking.columns.partner') || 'Chuyển đối tác gia công ngoài (Admin)'}</span>
              </label>
              {updateVendor && (
                <select
                  value={vendorVal}
                  onChange={(e) => setVendorVal(e.target.value as Vendor)}
                  className="w-full rounded-xs border border-input bg-background px-3 py-1.5 text-xs text-foreground font-semibold"
                >
                  <option value="YAMAICHI">YAMAICHI</option>
                  <option value="PROVISION">PROVISION</option>
                </select>
              )}
            </div>
          )}

          {/* Option 5: Ngày gửi QT */}
          <div className="rounded-xs border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateSendDate}
                onChange={(e) => setUpdateSendDate(e.target.checked)}
                className="rounded-xs text-primary focus:ring-primary accent-primary"
              />
              <span>{t('tracking.columns.sentDate') || 'Điều chỉnh ngày gửi QT'}</span>
            </label>
            {updateSendDate && (
              <input
                type="date"
                value={sendDateVal}
                onChange={(e) => setSendDateVal(e.target.value)}
                className="w-full rounded-xs border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
              />
            )}
          </div>

          {/* Option 6: Mác thép / Vật liệu */}
          <div className="rounded-xs border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateMaterial}
                onChange={(e) => setUpdateMaterial(e.target.checked)}
                className="rounded-xs text-primary focus:ring-primary accent-primary"
              />
              <span>{t('tracking.columns.material') || 'Cập nhật mác thép / vật liệu'}</span>
            </label>
            {updateMaterial && (
              <input
                type="text"
                placeholder="VD: DAC, SKD61, NAK80..."
                value={materialVal}
                onChange={(e) => setMaterialVal(e.target.value)}
                className="w-full rounded-xs border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
              />
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-muted-foreground font-semibold mb-1">
              {t('common.lotUpdate.reasonLabel') || 'Lý do điều chỉnh'} (Audit Trail):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('common.lotUpdate.reasonPlaceholder') || 'VD: Gia hạn do đối tác quá tải lò...'}
              className="w-full h-14 rounded-xs border border-input bg-background p-2 text-xs text-foreground"
            />
          </div>

          {/* Preview list */}
          <div className="rounded-xs bg-muted/40 p-2.5">
            <p className="font-bold text-[11px] text-muted-foreground mb-1">
              {t('orders.masterListTitle') || 'DANH SÁCH'} {items.length} {t('common.units.lots') || 'LÔ'} {t('orders.title') || 'BỊ TÁC ĐỘNG'}:
            </p>
            <div className="max-h-20 overflow-y-auto space-y-1 font-mono text-[10px]">
              {items.map((it) => (
                <div key={it.ID_Key} className="flex justify-between">
                  <span className="font-bold text-primary">{it.ID_Key}</span>
                  <span>{it.ma_hang}</span>
                  <span className="text-muted-foreground">{it.phong_sx}</span>
                  <span>{it.TrangThai}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t pt-4 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xs border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
          >
            {t('common.cancel') || 'Hủy bỏ'}
          </button>
          <button
            type="button"
            disabled={!hasAnyChange}
            onClick={handleConfirm}
            className="rounded-xs bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer shadow-xs"
          >
            {t('common.confirm') || 'Xác nhận áp dụng'} ({items.length} {t('common.units.lots') || 'lô'})
          </button>
        </div>
      </div>
    </div>
  );
}

// Proposal 1: Lot Detail Drawer Component with Full Edit Capabilities
function LotDetailDrawer({
  item,
  role,
  onClose,
  onUpdate,
}: {
  item: QTItem;
  role: string;
  onClose: () => void;
  onUpdate: (patch: Partial<QTItem>) => void;
}) {
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
      className="fixed inset-0 z-50 flex items-center justify-end bg-overlay backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="h-full w-full max-w-lg bg-card border-l border-border p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-primary px-2 py-0.5 rounded-xs bg-primary/10">
                  {item.ID_Key}
                </span>
                <span className="rounded-xs bg-secondary px-2 py-0.5 font-bold text-[10px] text-muted-foreground">
                  {t('tracking.workshops.title') || 'Phân xưởng'} {item.phong_sx}
                </span>
              </div>
              <h2 className="mt-2 font-mono text-xl font-black text-foreground">{item.ma_hang}</h2>
              <p className="text-xs text-muted-foreground font-mono">
                {t('tracking.columns.orderNo') || 'Đơn hàng'}: {item.So_DatHang}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`rounded-xs px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border ${isEditing
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary hover:bg-muted text-foreground'
                    }`}
                >
                  {isEditing ? (t('common.cancel') || 'Hủy sửa') : `✏️ ${t('common.edit') || 'Sửa lô này'}`}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-xs p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* If Editing Mode */}
          {isEditing ? (
            <div className="space-y-3 rounded-xs border border-primary/30 bg-secondary/20 p-4 text-xs mb-4">
              <h3 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
                <Edit2 size={14} className="text-primary" /> {t('common.lotUpdate.dialogTitle', { lotId: item.ID_Key }) || `Chỉnh sửa thông số lô ${item.ID_Key}`}
              </h3>
              <div className="grid grid-cols-2 gap-3">
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
                  <input
                    type="date"
                    value={form.han_tra}
                    onChange={(e) => setForm({ ...form, han_tra: e.target.value })}
                    className="w-full rounded-xs border border-input bg-background px-2.5 py-1.5 text-xs text-foreground font-mono"
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
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xs border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary cursor-pointer"
                >
                  {t('common.cancel') || 'Hủy'}
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-xs bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                  {t('common.save') || 'Lưu thay đổi lô này'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Technical Specs Grid - Monozukuri Precision Grid (TASK-005) */}
              <div className="grid grid-cols-2 gap-3 rounded-xs border border-border/80 bg-secondary/30 p-3.5 text-xs mb-4">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider mb-0.5">
                    {t('tracking.columns.material') || 'Mác thép / Vật liệu'}:
                  </span>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-mono font-bold text-foreground text-sm px-1.5 py-0.5 rounded-xs bg-background border border-border/70 shadow-2xs">
                      {item.vat_lieu || '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider mb-0.5">
                    {t('tracking.columns.hardness') || 'Độ cứng yêu cầu'}:
                  </span>
                  <p className="font-mono font-bold text-sm">
                    {item.do_cung && item.do_cung !== '—' ? (
                      <span className="text-destructive font-black px-1.5 py-0.5 rounded-xs bg-destructive/10 border border-destructive/20 shadow-2xs">
                        {item.do_cung}
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium text-xs">{t('common.lotUpdate.noDueDate') || 'Chưa có thông số'}</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    {t('tracking.columns.quantity') || 'Số lượng xuất'}:
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {number(item.so_luong)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.don_vi_tinh || (t('common.units.items') || 'chi tiết')}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    {t('tracking.columns.weight') || 'Trọng lượng lô'}:
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {number(item.kg_Lot, 1)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">kg</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    {t('common.jobTicket.sec1.size') || 'Kích thước SP'}:
                  </span>
                  <p className="font-mono text-foreground">{item.Kich_Thuoc_SP || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    {t('tracking.columns.partner') || 'Đơn vị nhận gia công'}:
                  </span>
                  <p className="font-semibold text-foreground">{formatVendorName(item.cty_QT, role as any)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    {t('tracking.columns.sentDate') || 'Ngày gửi xuất xưởng'}:
                  </span>
                  <p className="font-mono text-foreground">{date(item.ngay_gui_QT)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    {t('tracking.columns.dueDate') || 'Hạn trả gia công'}:
                  </span>
                  <p className="font-mono font-bold text-foreground">
                    {date(item.ncc_ngay_tra_qt || item.han_tra || "")}
                  </p>
                </div>

                {/* Phân quyền xem đơn giá & thành tiền */}
                {canViewPricing(role as any) && (
                  <>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                        {t('common.jobTicket.sec1.unitPrice') || 'Đơn giá gia công'}:
                      </span>
                      <p className="font-mono font-bold text-foreground">
                        {item.don_gia ? money(item.don_gia) : (t('common.lotUpdate.noDueDate') || 'Chưa có giá')}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                        {t('common.jobTicket.sec1.totalPrice') || 'Thành tiền dự kiến'}:
                      </span>
                      <p className="font-mono font-black text-primary">
                        {item.thanh_tien ? money(item.thanh_tien) : '—'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              
              {/* Vendor Feedback Hub (12 Cột NCC & Thẩm tra chất lượng 2 chiều) */}
              <div className="rounded-xs border border-primary/30 bg-primary/5 p-3.5 mb-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-primary/20 pb-1.5">
                  <span className="font-mono text-xs font-black uppercase text-primary tracking-wide">
                    CỔNG PHẢN HỒI NHÀ CUNG CẤP (VENDOR 2-WAY HUB)
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-xs bg-primary/20 text-primary">
                    NCC: {item.cty_qt || item.cty_QT}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Độ cứng HRC thực tế đo:</span>
                    <span className="font-mono font-bold text-foreground">{item.ncc_ket_qua_hrc || '— (Chưa cập nhật)'}</span>
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
                  <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                    <span className="text-muted-foreground text-[10px] uppercase font-bold">Giản đồ nhiệt & File chứng nhận QC:</span>
                    <div className="flex gap-2">
                      {item.ncc_giando ? (
                        <a href={item.ncc_giando} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[10px]">
                          [Xem giản đồ]
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60 text-[10px] italic">Không có giản đồ</span>
                      )}
                      {item.ncc_file1 ? (
                        <a href={item.ncc_file1} target="_blank" rel="noreferrer" className="text-primary hover:underline font-mono text-[10px]">
                          [Tải file QC]
                        </a>
                      ) : (
                        <span className="text-muted-foreground/60 text-[10px] italic">Không có file QC</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Status Banner */}
              <div className="flex items-center justify-between rounded-xs border border-primary/30 bg-primary/5 p-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    {t('tracking.columns.logistics') || 'Trạng thái luân chuyển'}:
                  </span>
                  <p className="font-bold text-foreground text-sm">{item.TrangThai}</p>
                </div>
                <LotUpdateButton item={item} />
              </div>
            </>
          )}

          {/* Audit History Timeline */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center justify-between">
              <span>{t('sync.twoWay.recentHeader') || 'NHẬT KÝ THAY ĐỔI & AUDIT TRAIL'}</span>
              <span className="font-mono text-[10px] font-normal px-2 py-0.5 bg-muted rounded-xs border border-border/60 text-muted-foreground">
                {auditLogs.length} {t('sync.preview.recordsUnit') || 'bản ghi'}
              </span>
            </h3>
            {auditLogs.length ? (
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-xs border border-border/80 bg-background/50 p-2.5 text-[11px]">
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
              <p className="text-xs text-muted-foreground italic p-3 border border-border/60 rounded-xs text-center bg-secondary/20">
                {t('common.command.empty') || 'Chưa có thay đổi nào được ghi nhận cho lô này.'}
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border pt-4 mt-6">
          <JobTicketButton item={item} role={role as any} variant="button" />
          <button
            type="button"
            onClick={onClose}
            className="rounded-xs border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
          >
            {t('common.close') || 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
}
