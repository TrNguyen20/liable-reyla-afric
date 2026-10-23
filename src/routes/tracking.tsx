import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState, useRef } from 'react';
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
  FileText,
  Filter,
  Layers,
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
  Zap,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageHeading, useDynamo } from '@/components/dynamo-shell';
import { playAudioCue } from '@/lib/audio-cues';
import { date, money, number, type QTItem, type Status, type Workshop, type Vendor } from '@/lib/dynamo-data';
import { formatVendorName, canViewPricing } from '@/lib/dynamo-auth';
import { isMaterialEquivalent } from '@/lib/materials-data';
import {
  hasValidDue,
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
  validateSearch: (s: Record<string, unknown>): { focus?: Focus; material?: string } => ({
    ...(FOCUS.some((f) => f.key === s['focus']) ? { focus: s['focus'] as Focus } : {}),
    ...(typeof s['material'] === 'string' && s['material'].trim() ? { material: s['material'].trim() } : {}),
  }),
  component: Tracking,
});

type Focus = 'est_due' | 'sync_failed' | 'no_qc' | 'qc_fail';
const FOCUS: { key: Focus; label: string; tone: string }[] = [
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
  | 'ghi_chu'
  | 'ticket';

const DEFAULT_COL_WIDTHS: Record<ColumnKey, number> = {
  checkbox: 44,
  ID_Key: 140,
  So_DatHang: 140,
  phong_sx: 90,
  ma_hang: 145,
  vat_lieu: 120,
  do_cung: 115,
  so_luong: 85,
  kg_Lot: 85,
  cty_QT: 130,
  TrangThai: 145,
  qc: 140,
  ngay_gui_QT: 125,
  han_tra: 125,
  ghi_chu: 240,
  ticket: 90,
};

// Minimum content-aware widths: prevents columns from collapsing below title/icon/cell content
// Calibrated so that when collapsed to minimum, every column retains an even ~12px padding
const MIN_COL_WIDTHS: Record<ColumnKey, number> = {
  checkbox: 44,
  ID_Key: 120,
  So_DatHang: 130,
  phong_sx: 85,
  ma_hang: 125,
  vat_lieu: 105,
  do_cung: 105,
  so_luong: 75,
  kg_Lot: 75,
  cty_QT: 115,
  TrangThai: 135,
  qc: 130,
  ngay_gui_QT: 115,
  han_tra: 115,
  ghi_chu: 150,
  ticket: 80,
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
  const isAsc = currentField === field && currentDir === 'asc';
  const isDesc = currentField === field && currentDir === 'desc';

  return (
    <div className="border-b border-border/70 pb-2.5 mb-2.5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
          Sắp xếp cột này:
        </span>
        {currentField === field && (
          <span className="inline-flex items-center gap-1 text-[10px] text-primary font-mono font-bold">
            <Check size={11} className="stroke-[3]" /> Đang chọn
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => onSort(field, 'asc')}
          className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${isAsc
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
          className={`flex items-center justify-between w-full px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${isDesc
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
  sortCol: SortField;
  sortDir: SortDirection;
  isFiltered?: boolean;
  children: React.ReactNode;
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
  const [open, setOpen] = useState(false);
  const isSorted = field && sortCol === field;
  const isSticky = stickyLeft !== undefined || stickyClass.includes('sticky');

  const handleTitleClick = (e: React.MouseEvent) => {
    if (field && onDirectSort) {
      e.stopPropagation();
      onDirectSort(field);
    }
  };

  return (
    <th
      className={`whitespace-nowrap px-3 py-2.5 font-bold uppercase tracking-wider text-muted-foreground select-none ${
        isSticky ? 'sticky top-0 z-50 bg-secondary' : 'relative bg-secondary'
      } ${stickyClass} ${className} ${
        isStickyLast
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
        className={`flex items-center gap-1.5 ${
          align === 'end' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-between'
        }`}
      >
        <button
          type="button"
          onClick={handleTitleClick}
          className="flex items-center gap-1 text-left group/th cursor-pointer hover:text-foreground transition-colors outline-none truncate"
          title={
            field
              ? `Nhấp để sắp xếp: ${
                  isSorted
                    ? sortDir === 'asc'
                      ? 'Tăng dần → Giảm dần'
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

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className={`inline-flex size-5 shrink-0 items-center justify-center rounded transition-all cursor-pointer ${
                isFiltered
                  ? 'bg-primary text-primary-foreground font-black ring-2 ring-primary ring-offset-1 shadow-xs'
                  : 'text-muted-foreground/60 hover:bg-background/80 hover:text-foreground'
              }`}
              title={`Mở bộ lọc ${title}`}
            >
              <Filter size={10} className={isFiltered ? 'stroke-[2.5]' : 'stroke-[1.5]'} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align={align === 'end' ? 'end' : 'start'}
            sideOffset={6}
            className="w-80 max-w-[92vw] p-3 text-xs bg-popover text-popover-foreground shadow-2xl border border-border rounded-lg z-50 font-sans normal-case tracking-normal"
          >
            {open && children}
          </PopoverContent>
        </Popover>
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
          title="Kéo sang trái/phải để đổi độ rộng (Nhấp đúp để đặt lại mặc định)"
        >
          <div className="w-[1.5px] h-3.5 rounded-full bg-border/80 group-hover/resizer:bg-primary group-hover/resizer:h-full group-hover/resizer:w-[2px] transition-all" />
        </div>
      )}
    </th>
  );
}

function Tracking() {
  const { filtered: all, role, updateItem, bulkUpdateItems } = useDynamo();
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
      } catch {}
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
        } catch {}
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
      } catch {}
      return next;
    });
  };

  const handleResetAllColWidths = () => {
    setColWidths(DEFAULT_COL_WIDTHS);
    try {
      window.localStorage.removeItem('dynamo-tracking-col-widths');
    } catch {}
    toast.success('Đã khôi phục kích thước cột mặc định.');
    playAudioCue('pop');
  };

  const totalTableWidth = useMemo(
    () => Object.values(colWidths).reduce((a, b) => a + b, 0),
    [colWidths],
  );

  // Integrated Google Sheets Filter State
  const [filters, setFilters] = useState<TableFilterState>(() => ({
    ...defaultFilters,
    materials: searchParams.material ? [searchParams.material] : [],
    missingDueOnly: searchParams.focus === 'est_due',
    qcStates: searchParams.focus === 'qc_fail' ? ['Không đạt'] : [],
  }));

  // Sorting state - default to newest sent date
  const [sortCol, setSortCol] = useState<SortField>('ngay_gui_QT');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');

  // Search inside material popover
  const [materialSearchText, setMaterialSearchText] = useState('');

  // Pagination states
  const [tablePage, setTablePage] = useState(0);
  const [pageSize, setPageSize] = useState(30);

  // Selection states (for Bulk Actions)
  const [selectedLots, setSelectedLots] = useState<Set<string>>(new Set());

  // Drawer / Modals states
  const [detailLot, setDetailLot] = useState<QTItem | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);

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

  const handleSort = (field: SortField, dir: SortDirection) => {
    setSortCol(field);
    setSortDir(dir);
    setTablePage(0);
    playAudioCue('beep');
  };

  const handleToggleSort = (field: SortField) => {
    if (sortCol !== field) {
      setSortCol(field);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      // Bấm lần 3: Khôi phục sắp xếp mặc định theo ngày gửi mới nhất
      setSortCol('ngay_gui_QT');
      setSortDir('desc');
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
        if (filters.missingDueOnly && hasValidDue(row)) return false;
        if (filters.dueFrom && row.han_tra < filters.dueFrom) return false;
        if (filters.dueTo && row.han_tra > filters.dueTo) return false;
        // 14. ghi_chu
        if (filters.noteSearch && !(row.ghi_chu ?? '').toLowerCase().includes(filters.noteSearch.toLowerCase())) {
          return false;
        }
        if (filters.hasNoteOnly && !row.ghi_chu) {
          return false;
        }
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
          case 'han_tra':
            cmp = a.han_tra.localeCompare(b.han_tra);
            break;
          case 'ghi_chu':
            cmp = (a.ghi_chu ?? '').localeCompare(b.ghi_chu ?? '');
            break;
          case 'ngay_gui_QT':
          default:
            cmp = a.ngay_gui_QT.localeCompare(b.ngay_gui_QT) || a.han_tra.localeCompare(b.han_tra);
            break;
        }
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [all, filters, sortCol, sortDir]);

  // Đề xuất 3: Danh sách các bộ lọc đang kích hoạt để tạo thanh pill tóm tắt 1-chạm
  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; onClear: () => void }[] = [];
    if (filters.idKeySearch) {
      list.push({
        key: 'idKey',
        label: `Lô: "${filters.idKeySearch}"`,
        onClear: () => setFilters((f) => ({ ...f, idKeySearch: '' })),
      });
    }
    if (filters.orderSearch) {
      list.push({
        key: 'order',
        label: `Đơn: "${filters.orderSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, orderSearch: '' })),
      });
    }
    if (filters.workshops.length) {
      list.push({
        key: 'workshops',
        label: `Xưởng: ${filters.workshops.join(', ')}`,
        onClear: () => setFilters((f) => ({ ...f, workshops: [] })),
      });
    }
    if (filters.itemSearch) {
      list.push({
        key: 'item',
        label: `Mã hàng: "${filters.itemSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, itemSearch: '' })),
      });
    }
    if (filters.materials.length) {
      list.push({
        key: 'materials',
        label: `Vật liệu (${filters.materials.length}): ${filters.materials.slice(0, 2).join(', ')}${filters.materials.length > 2 ? '…' : ''
          }`,
        onClear: () => setFilters((f) => ({ ...f, materials: [] })),
      });
    }
    if (filters.hardnessSearch) {
      list.push({
        key: 'hardness',
        label: `Độ cứng: "${filters.hardnessSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, hardnessSearch: '' })),
      });
    }
    if (filters.missingHardnessOnly) {
      list.push({
        key: 'missingHardness',
        label: `Chưa có độ cứng`,
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
        label: `Đối tác: ${filters.vendors.map((v) => formatVendorName(v, role)).join(', ')}`,
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
        label: `Gửi: ${filters.sendFrom || '…'} → ${filters.sendTo || '…'}`,
        onClear: () => setFilters((f) => ({ ...f, sendFrom: '', sendTo: '' })),
      });
    }
    if (filters.missingDueOnly) {
      list.push({
        key: 'missingDue',
        label: `Thiếu hạn trả`,
        onClear: () => setFilters((f) => ({ ...f, missingDueOnly: false })),
      });
    }
    if (filters.dueFrom || filters.dueTo) {
      list.push({
        key: 'dueDate',
        label: `Hạn: ${filters.dueFrom || '…'} → ${filters.dueTo || '…'}`,
        onClear: () => setFilters((f) => ({ ...f, dueFrom: '', dueTo: '' })),
      });
    }
    if (filters.noteSearch) {
      list.push({
        key: 'note',
        label: `Ghi chú: "${filters.noteSearch}"`,
        onClear: () => setFilters((f) => ({ ...f, noteSearch: '' })),
      });
    }
    if (filters.hasNoteOnly) {
      list.push({
        key: 'hasNote',
        label: 'Có ghi chú',
        onClear: () => setFilters((f) => ({ ...f, hasNoteOnly: false })),
      });
    }
    return list;
  }, [filters, role]);

  const totalKg = useMemo(() => rows.reduce((a, i) => a + i.kg_Lot, 0), [rows]);

  const resetAllFilters = () => {
    setFilters(defaultFilters);
    setSortCol('ngay_gui_QT');
    setSortDir('desc');
    setTablePage(0);
    playAudioCue('success');
    toast.info('Đã xóa toàn bộ bộ lọc trên bảng.');
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

  const exportCsv = (selectedOnly = false) => {
    const targetRows = selectedOnly ? rows.filter((r) => selectedLots.has(r.ID_Key)) : rows;
    if (!targetRows.length) return;
    const head = [
      'Mã lô (ID_Key)',
      'Số đặt hàng (PO)',
      'Phân xưởng',
      'Mã hàng',
      'Vật liệu',
      'Độ cứng',
      'Số lượng',
      'Trọng lượng (kg)',
      'Đối tác gia công',
      'Logistics',
      'QC',
      'Ngày gửi',
      'Hạn trả',
      'Ghi chú',
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
        formatVendorName(r.cty_QT, role),
        logisticsOf(r),
        qcOf(r),
        date(r.ngay_gui_QT),
        date(r.han_tra),
        `"${(r.ghi_chu ?? '').replace(/"/g, '""')}"`,
      ].join(','),
    );
    const url = URL.createObjectURL(
      new Blob(['\ufeff' + [head.join(','), ...body].join('\n')], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedOnly ? `luan-chuyen-qt-${targetRows.length}-lo.csv` : 'luan-chuyen-qt-toan-bo.csv';
    a.click();
    URL.revokeObjectURL(url);
    playAudioCue('success');
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
        return item.han_tra;
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

  const saveInlineEdit = (
    item: QTItem,
    navigateDir?: 'next-row' | 'prev-row' | 'next-col' | 'prev-col',
  ) => {
    if (!editingCell || !canEdit) return;
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

    updateItem(item.ID_Key, patch);
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
      setEditingCell(null);
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
      <PageHeading
        eyebrow="DYNAMO VIETNAM QT - MES"
        title="LUÂN CHUYỂN QT"
        description="Giám sát tiến độ, hạn trả và điều độ các lô hàng gia công nhiệt luyện, xi mạ theo phân xưởng."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary rounded-md">
              <Layers size={14} />
              {number(rows.length)} lô đang quản lý
            </span>
            <button
              type="button"
              onClick={() => exportCsv(false)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              <Download size={13} /> Xuất CSV
            </button>
          </div>
        }
      />

      {/* Đề xuất 3: Thanh Pill Nhận diện Bộ Lọc Đang Hoạt Động & 1-Chạm Xóa Lọc */}
      {activeFilters.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/5 p-2.5 text-xs shadow-2xs animate-in fade-in">
          <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-primary mr-1">
            <Filter size={13} />
            Đang lọc ({activeFilters.length}):
          </span>
          {activeFilters.map((af) => (
            <span
              key={af.key}
              className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-card px-2.5 py-1 text-[11px] font-medium text-foreground shadow-2xs"
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
                title="Bỏ tiêu chí này"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={resetAllFilters}
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive hover:bg-destructive/20 transition-colors cursor-pointer"
            title="Xóa toàn bộ các bộ lọc trên bảng"
          >
            <Trash2 size={12} />
            Xóa tất cả lọc
          </button>
        </div>
      )}

      {/* KPI Summary Line - Monozukuri Micro-Metric Badges (TASK-001) */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Badge 1: Số lô khớp / Tổng số lô với đèn LED tín hiệu */}
          <div className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/90 px-2.5 py-1 text-xs shadow-2xs">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Lô khớp:</span>
            <span className="font-mono tabular-nums font-bold text-foreground">
              {number(rows.length)}
              <span className="text-muted-foreground/60 font-normal ml-1">/ {number(all.length)}</span>
            </span>
          </div>

          {/* Badge 2: Tổng khối lượng (kg) */}
          <div className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/90 px-2.5 py-1 text-xs shadow-2xs">
            <span className="text-[11px] text-muted-foreground font-medium">Khối lượng:</span>
            <span className="font-mono tabular-nums font-bold text-foreground">
              {number(totalKg, 1)} <span className="text-[11px] font-normal text-muted-foreground">kg</span>
            </span>
          </div>

          {/* Badge 3: Phân xưởng */}
          <div className="hidden sm:inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card/90 px-2.5 py-1 text-xs shadow-2xs">
            <span className="text-[11px] text-muted-foreground font-medium">Phân xưởng:</span>
            <span className="font-semibold text-foreground truncate max-w-[240px]">
              {workshops.join(', ')}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={handleResetAllColWidths}
            className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-98"
            title="Khôi phục kích thước mặc định cho toàn bộ cột"
          >
            <RotateCcw size={11} className="text-primary/80" />
            <span>Khôi phục cỡ cột</span>
          </button>
          <span className="text-muted-foreground/80 hidden lg:inline-flex items-center gap-1 text-[11px]">
            <span>💡 Bấm</span>
            <span className="inline-block px-1 py-0.2 bg-muted/60 text-[10px] rounded font-mono font-medium border border-border/60 text-foreground">▾ Lọc</span>
            <span>đầu cột để lọc & sắp xếp</span>
          </span>
        </div>
      </div>

      {/* Data Table View (17 columns with Google Sheets Popover Filters in Header Cells) */}
      <div className="isolate overflow-hidden rounded-lg border border-border bg-card shadow-2xs">
        <div className="overflow-x-auto max-h-[750px]">
          <table
            className="text-left text-xs border-collapse"
            style={{
              tableLayout: 'fixed',
              width: `${totalTableWidth}px`,
              minWidth: `${totalTableWidth}px`,
            }}
          >
            <colgroup>
              <col style={{ width: `${colWidths.checkbox}px` }} />
              <col style={{ width: `${colWidths.ID_Key}px` }} />
              <col style={{ width: `${colWidths.So_DatHang}px` }} />
              <col style={{ width: `${colWidths.phong_sx}px` }} />
              <col style={{ width: `${colWidths.ma_hang}px` }} />
              <col style={{ width: `${colWidths.vat_lieu}px` }} />
              <col style={{ width: `${colWidths.do_cung}px` }} />
              <col style={{ width: `${colWidths.so_luong}px` }} />
              <col style={{ width: `${colWidths.kg_Lot}px` }} />
              <col style={{ width: `${colWidths.cty_QT}px` }} />
              <col style={{ width: `${colWidths.TrangThai}px` }} />
              <col style={{ width: `${colWidths.qc}px` }} />
              <col style={{ width: `${colWidths.ngay_gui_QT}px` }} />
              <col style={{ width: `${colWidths.han_tra}px` }} />
              <col style={{ width: `${colWidths.ghi_chu}px` }} />
              <col style={{ width: `${colWidths.ticket}px` }} />
            </colgroup>
            <thead
              className="sticky top-0 z-40 bg-secondary text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border shadow-xs"
              style={{ position: 'sticky', top: 0, zIndex: 40 }}
            >
              <tr>
                {/* Column 1: Checkbox (Sticky top-0 left-0) */}
                <th
                  className="sticky top-0 left-0 z-50 px-3 py-2.5 text-center bg-secondary border-r border-border/50 select-none"
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
                      ref={selectAllCheckboxRef}
                      type="checkbox"
                      aria-label="Chọn tất cả trên trang này"
                      checked={isAllPageSelected}
                      onChange={toggleSelectAllPage}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                  </div>
                  <div
                    role="separator"
                    tabIndex={-1}
                    aria-orientation="vertical"
                    onMouseDown={(e) => handleResizeStart(e, 'checkbox')}
                    onDoubleClick={() => handleResetColWidth('checkbox')}
                    className="group/resizer absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize select-none touch-none flex items-center justify-center z-30"
                    title="Kéo sang trái/phải để đổi độ rộng (Nhấp đúp để đặt lại mặc định)"
                  >
                    <div className="w-[1.5px] h-3.5 rounded-full bg-border/80 group-hover/resizer:bg-primary group-hover/resizer:h-full group-hover/resizer:w-[2px] transition-all" />
                  </div>
                </th>

                {/* Column 2: Mã lô (Sticky top-0 left-[checkbox]) */}
                <HeaderFilterCell
                  title="MÃ LÔ"
                  field="ID_Key"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.idKeySearch}
                  stickyClass="sticky top-0 z-50 bg-secondary"
                  stickyLeft={colWidths.checkbox}
                  width={colWidths.ID_Key}
                  isStickyLast={true}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'ID_Key')}
                  onResetWidth={() => handleResetColWidth('ID_Key')}
                >
                  <HeaderSortControls
                    field="ID_Key"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Tìm kiếm mã lô:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="VD: Q2605..."
                        value={filters.idKeySearch}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, idKeySearch: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none"
                        autoFocus
                      />
                      {filters.idKeySearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, idKeySearch: '' }));
                            setTablePage(0);
                          }}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                  {filters.idKeySearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setFilters((f) => ({ ...f, idKeySearch: '' }));
                        setTablePage(0);
                      }}
                      className="mt-2.5 w-full text-center text-[11px] font-bold text-destructive hover:underline cursor-pointer"
                    >
                      Xóa lọc mã lô
                    </button>
                  )}
                </HeaderFilterCell>

                {/* Column 3: Đơn hàng */}
                <HeaderFilterCell
                  title="ĐƠN HÀNG"
                  field="So_DatHang"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.orderSearch}
                  width={colWidths.So_DatHang}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'So_DatHang')}
                  onResetWidth={() => handleResetColWidth('So_DatHang')}
                >
                  <HeaderSortControls
                    field="So_DatHang"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Tìm số đơn hàng (PO):
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="VD: QT260515..."
                        value={filters.orderSearch}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, orderSearch: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none"
                      />
                      {filters.orderSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, orderSearch: '' }));
                            setTablePage(0);
                          }}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 4: Xưởng */}
                <HeaderFilterCell
                  title="XƯỞNG"
                  field="phong_sx"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={filters.workshops.length > 0}
                  width={colWidths.phong_sx}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'phong_sx')}
                  onResetWidth={() => handleResetColWidth('phong_sx')}
                >
                  <HeaderSortControls
                    field="phong_sx"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Chọn phân xưởng:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            workshops: f.workshops.length === workshops.length ? [] : [...workshops],
                          }));
                          setTablePage(0);
                        }}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {filters.workshops.length === workshops.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {workshops.map((w) => {
                        const count = counts.ws[w] || 0;
                        return (
                          <label
                            key={w}
                            className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-secondary cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filters.workshops.includes(w)}
                                onChange={() => {
                                  setFilters((f) => ({ ...f, workshops: toggleInArray(f.workshops, w) }));
                                  setTablePage(0);
                                }}
                                className="rounded text-primary focus:ring-primary accent-primary"
                              />
                              <span className="font-bold">{w}</span>
                            </span>
                            <span className="font-mono text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 5: Mã hàng */}
                <HeaderFilterCell
                  title="MÃ HÀNG"
                  field="ma_hang"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.itemSearch}
                  width={colWidths.ma_hang}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'ma_hang')}
                  onResetWidth={() => handleResetColWidth('ma_hang')}
                >
                  <HeaderSortControls
                    field="ma_hang"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Tìm mã linh kiện:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="VD: 9075-P3..."
                        value={filters.itemSearch}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, itemSearch: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none"
                      />
                      {filters.itemSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, itemSearch: '' }));
                            setTablePage(0);
                          }}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 6: Vật liệu */}
                <HeaderFilterCell
                  title="VẬT LIỆU"
                  field="vat_lieu"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={filters.materials.length > 0}
                  width={colWidths.vat_lieu}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'vat_lieu')}
                  onResetWidth={() => handleResetColWidth('vat_lieu')}
                >
                  <HeaderSortControls
                    field="vat_lieu"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Mác thép ({allMaterials.length}):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            materials: f.materials.length === allMaterials.length ? [] : [...allMaterials],
                          }));
                          setTablePage(0);
                        }}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {filters.materials.length === allMaterials.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder="Tìm mác thép..."
                      value={materialSearchText}
                      onChange={(e) => setMaterialSearchText(e.target.value)}
                      className="w-full rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground outline-none"
                    />
                    <div className="max-h-44 overflow-y-auto space-y-1">
                      {allMaterials
                        .filter((m) => m.toLowerCase().includes(materialSearchText.toLowerCase()))
                        .map((m) => {
                          const count = counts.mat[m] || 0;
                          return (
                            <label
                              key={m}
                              className="flex items-center justify-between rounded px-2 py-1 hover:bg-secondary cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={filters.materials.includes(m)}
                                  onChange={() => {
                                    setFilters((f) => ({ ...f, materials: toggleInArray(f.materials, m) }));
                                    setTablePage(0);
                                  }}
                                  className="rounded text-primary focus:ring-primary accent-primary"
                                />
                                <span className="font-mono">{m}</span>
                              </span>
                              <span className="font-mono text-muted-foreground">{count}</span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 7: Độ cứng */}
                <HeaderFilterCell
                  title="ĐỘ CỨNG"
                  field="do_cung"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.hardnessSearch || filters.missingHardnessOnly}
                  width={colWidths.do_cung}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'do_cung')}
                  onResetWidth={() => handleResetColWidth('do_cung')}
                >
                  <HeaderSortControls
                    field="do_cung"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Tìm độ cứng yêu cầu:
                    </label>
                    <input
                      type="text"
                      placeholder="VD: 58-62, 44±1..."
                      value={filters.hardnessSearch}
                      onChange={(e) => {
                        setFilters((f) => ({ ...f, hardnessSearch: e.target.value }));
                        setTablePage(0);
                      }}
                      className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none"
                    />
                    <label className="flex items-center gap-2 rounded px-1 py-1 hover:bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.missingHardnessOnly}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, missingHardnessOnly: e.target.checked }));
                          setTablePage(0);
                        }}
                        className="rounded text-primary focus:ring-primary accent-primary"
                      />
                      <span>Chỉ xem chưa có độ cứng (—)</span>
                    </label>
                  </div>
                </HeaderFilterCell>

                {/* Column 8: SL */}
                <HeaderFilterCell
                  title="SL"
                  field="so_luong"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.qtyMin || !!filters.qtyMax}
                  align="end"
                  width={colWidths.so_luong}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'so_luong')}
                  onResetWidth={() => handleResetColWidth('so_luong')}
                >
                  <HeaderSortControls
                    field="so_luong"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                    ascLabel="Nhỏ nhất → Lớn nhất"
                    descLabel="Lớn nhất → Nhỏ nhất"
                  />
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Khoảng số lượng (pcs):
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Từ (Min)"
                        value={filters.qtyMin}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, qtyMin: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-xs text-foreground"
                      />
                      <span>→</span>
                      <input
                        type="number"
                        placeholder="Đến (Max)"
                        value={filters.qtyMax}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, qtyMax: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-xs text-foreground"
                      />
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 9: Kg */}
                <HeaderFilterCell
                  title="KG"
                  field="kg_Lot"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.kgMin || !!filters.kgMax}
                  align="end"
                  width={colWidths.kg_Lot}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'kg_Lot')}
                  onResetWidth={() => handleResetColWidth('kg_Lot')}
                >
                  <HeaderSortControls
                    field="kg_Lot"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                    ascLabel="Nhẹ nhất → Nặng nhất"
                    descLabel="Nặng nhất → Nhẹ nhất"
                  />
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Khoảng khối lượng (kg):
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Min kg"
                        value={filters.kgMin}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, kgMin: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-xs text-foreground"
                      />
                      <span>→</span>
                      <input
                        type="number"
                        step="0.1"
                        placeholder="Max kg"
                        value={filters.kgMax}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, kgMax: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2 py-1 font-mono text-xs text-foreground"
                      />
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 10: Đối tác */}
                <HeaderFilterCell
                  title="ĐỐI TÁC"
                  field="cty_QT"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={filters.vendors.length > 0}
                  width={colWidths.cty_QT}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'cty_QT')}
                  onResetWidth={() => handleResetColWidth('cty_QT')}
                >
                  <HeaderSortControls
                    field="cty_QT"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Nhà thầu gia công:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            vendors: f.vendors.length === allVendors.length ? [] : [...allVendors],
                          }));
                          setTablePage(0);
                        }}
                        className="text-[10px] text-primary hover:underline cursor-pointer"
                      >
                        {filters.vendors.length === allVendors.length ? 'Bỏ chọn hết' : 'Chọn tất cả'}
                      </button>
                    </div>
                    <div className="space-y-1">
                      {allVendors.map((v) => {
                        const count = counts.ven[v] || 0;
                        return (
                          <label
                            key={v}
                            className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-secondary cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filters.vendors.includes(v)}
                                onChange={() => {
                                  setFilters((f) => ({ ...f, vendors: toggleInArray(f.vendors, v) }));
                                  setTablePage(0);
                                }}
                                className="rounded text-primary focus:ring-primary accent-primary"
                              />
                              <span className="font-semibold">{formatVendorName(v, role)}</span>
                            </span>
                            <span className="font-mono text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 11: Logistics */}
                <HeaderFilterCell
                  title="LOGISTICS"
                  field="TrangThai"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={filters.logistics.length > 0}
                  width={colWidths.TrangThai}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'TrangThai')}
                  onResetWidth={() => handleResetColWidth('TrangThai')}
                >
                  <HeaderSortControls
                    field="TrangThai"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Trạng thái luân chuyển:
                    </span>
                    <div className="space-y-1">
                      {(['Chờ xuất xưởng', 'Đang tại Vendor', 'Đã nhập kho'] as Logistics[]).map((l) => {
                        const count = counts.log[l] || 0;
                        return (
                          <label
                            key={l}
                            className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-secondary cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filters.logistics.includes(l)}
                                onChange={() => {
                                  setFilters((f) => ({ ...f, logistics: toggleInArray(f.logistics, l) }));
                                  setTablePage(0);
                                }}
                                className="rounded text-primary focus:ring-primary accent-primary"
                              />
                              <span>{l}</span>
                            </span>
                            <span className="font-mono text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 12: QC */}
                <HeaderFilterCell
                  title="QC"
                  field="qc"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={filters.qcStates.length > 0}
                  width={colWidths.qc}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'qc')}
                  onResetWidth={() => handleResetColWidth('qc')}
                >
                  <HeaderSortControls
                    field="qc"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                  />
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Trạng thái kiểm tra QC:
                    </span>
                    <div className="space-y-1">
                      {(['Chưa kiểm tra', 'Đang kiểm tra', 'Đạt', 'Không đạt'] as QcState[]).map((q) => {
                        const count = counts.qc[q] || 0;
                        return (
                          <label
                            key={q}
                            className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-secondary cursor-pointer"
                          >
                            <span className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={filters.qcStates.includes(q)}
                                onChange={() => {
                                  setFilters((f) => ({ ...f, qcStates: toggleInArray(f.qcStates, q) }));
                                  setTablePage(0);
                                }}
                                className="rounded text-primary focus:ring-primary accent-primary"
                              />
                              <span
                                className={`font-semibold ${q === 'Đạt'
                                  ? 'text-primary'
                                  : q === 'Không đạt'
                                    ? 'text-destructive'
                                    : 'text-foreground'
                                  }`}
                              >
                                {q}
                              </span>
                            </span>
                            <span className="font-mono text-muted-foreground">{count}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 13: Ngày gửi */}
                <HeaderFilterCell
                  title="NGÀY GỬI"
                  field="ngay_gui_QT"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.sendFrom || !!filters.sendTo}
                  width={colWidths.ngay_gui_QT}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'ngay_gui_QT')}
                  onResetWidth={() => handleResetColWidth('ngay_gui_QT')}
                >
                  <HeaderSortControls
                    field="ngay_gui_QT"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                    ascLabel="Cũ nhất → Mới nhất"
                    descLabel="Mới nhất → Cũ nhất"
                  />
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Khoảng ngày gửi QT:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.sendFrom}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, sendFrom: e.target.value }));
                          setTablePage(0);
                        }}
                        className="rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground font-mono"
                      />
                      <input
                        type="date"
                        value={filters.sendTo}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, sendTo: e.target.value }));
                          setTablePage(0);
                        }}
                        className="rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setDatePreset('send', 'today')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('send', '7days')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                      >
                        7 ngày
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('send', 'this_month')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                      >
                        Tháng này
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('send', 'all')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        Tất cả
                      </button>
                    </div>
                  </div>
                </HeaderFilterCell>

                {/* Column 14: Hạn trả */}
                <HeaderFilterCell
                  title="HẠN TRẢ"
                  field="han_tra"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.dueFrom || !!filters.dueTo || filters.missingDueOnly}
                  width={colWidths.han_tra}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'han_tra')}
                  onResetWidth={() => handleResetColWidth('han_tra')}
                >
                  <HeaderSortControls
                    field="han_tra"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                    ascLabel="Gần nhất → Xa nhất"
                    descLabel="Xa nhất → Gần nhất"
                  />
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Khoảng hạn trả:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={filters.dueFrom}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, dueFrom: e.target.value }));
                          setTablePage(0);
                        }}
                        className="rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground font-mono"
                      />
                      <input
                        type="date"
                        value={filters.dueTo}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, dueTo: e.target.value }));
                          setTablePage(0);
                        }}
                        className="rounded border border-input bg-background px-2 py-1 text-[11px] text-foreground font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-1 pt-1.5">
                      <button
                        type="button"
                        onClick={() => setDatePreset('due', 'today')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                      >
                        Hôm nay
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('due', '7days')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                      >
                        7 ngày tới
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('due', 'this_month')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
                      >
                        Tháng này
                      </button>
                      <button
                        type="button"
                        onClick={() => setDatePreset('due', 'all')}
                        className="rounded border border-border/80 bg-card px-1 py-1 text-center text-[10.5px] font-semibold hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                      >
                        Tất cả
                      </button>
                    </div>
                    <label className="flex items-center gap-2 rounded border border-warning/30 bg-warning/10 p-2 text-warning cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={filters.missingDueOnly}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, missingDueOnly: e.target.checked }));
                          setTablePage(0);
                        }}
                        className="rounded text-warning focus:ring-warning accent-warning"
                      />
                      <span className="font-bold text-[11px]">Chỉ xem lô thiếu hạn trả</span>
                    </label>
                  </div>
                </HeaderFilterCell>

                {/* Column 15: Ghi chú */}
                <HeaderFilterCell
                  title="GHI CHÚ"
                  field="ghi_chu"
                  sortCol={sortCol}
                  sortDir={sortDir}
                  isFiltered={!!filters.noteSearch || filters.hasNoteOnly}
                  width={colWidths.ghi_chu}
                  onDirectSort={handleToggleSort}
                  onResize={(e) => handleResizeStart(e, 'ghi_chu')}
                  onResetWidth={() => handleResetColWidth('ghi_chu')}
                >
                  <HeaderSortControls
                    field="ghi_chu"
                    currentField={sortCol}
                    currentDir={sortDir}
                    onSort={handleSort}
                    ascLabel="A → Z (Theo ghi chú)"
                    descLabel="Z → A (Theo ghi chú)"
                  />
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Tìm kiếm ghi chú:
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Nội dung ghi chú..."
                        value={filters.noteSearch}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, noteSearch: e.target.value }));
                          setTablePage(0);
                        }}
                        className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs text-foreground outline-none"
                      />
                      {filters.noteSearch && (
                        <button
                          type="button"
                          onClick={() => {
                            setFilters((f) => ({ ...f, noteSearch: '' }));
                            setTablePage(0);
                          }}
                          className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <label className="flex items-center gap-2 rounded px-1 py-1 hover:bg-secondary cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.hasNoteOnly}
                        onChange={(e) => {
                          setFilters((f) => ({ ...f, hasNoteOnly: e.target.checked }));
                          setTablePage(0);
                        }}
                        className="rounded text-primary focus:ring-primary accent-primary"
                      />
                      <span className="text-[11px]">Chỉ xem lô có ghi chú</span>
                    </label>
                  </div>
                </HeaderFilterCell>

                {/* Column 16: Phiếu A4 */}
                <th
                  className="relative whitespace-nowrap px-3 py-2.5 text-center bg-secondary font-bold uppercase tracking-wider text-muted-foreground select-none"
                  style={{ width: `${colWidths.ticket}px`, minWidth: `${colWidths.ticket}px` }}
                >
                  <span>PHIẾU A4</span>
                  <div
                    role="separator"
                    tabIndex={-1}
                    aria-orientation="vertical"
                    title="Kéo để chỉnh độ rộng cột (Click đúp để khôi phục mặc định)"
                    onMouseDown={(e) => handleResizeStart(e, 'ticket')}
                    onDoubleClick={() => handleResetColWidth('ticket')}
                    className="group/resizer absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize select-none touch-none flex items-center justify-center z-30"
                  >
                    <div className="w-[1.5px] h-3.5 rounded-full bg-border/80 group-hover/resizer:bg-primary group-hover/resizer:h-full group-hover/resizer:w-[2px] transition-all" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {tableRows.length ? (
                tableRows.map((r) => {
                  const isSelected = selectedLots.has(r.ID_Key);

                  return (
                    <tr
                      key={r.ID_Key}
                      className={`group transition-colors ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-accent/40'
                        }`}
                    >
                      {/* 1. Checkbox */}
                      <td
                        className={`sticky left-0 z-20 px-3 py-2.5 text-center transition-colors border-r border-border/40 bg-card relative ${
                          isSelected
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
                            aria-label={`Chọn lô ${r.ID_Key}`}
                            checked={isSelected}
                            onChange={() => toggleSelectLot(r.ID_Key)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* 2. Mã lô (Green clickable link -> opens drawer) */}
                      <td
                        className={`sticky z-20 whitespace-nowrap px-3.5 py-2.5 transition-colors border-r border-border/80 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.08)] dark:shadow-[4px_0_10px_-2px_rgba(0,0,0,0.25)] bg-card relative ${
                          isSelected
                            ? 'before:absolute before:inset-0 before:bg-primary/15 before:pointer-events-none group-hover:before:bg-primary/20'
                            : 'group-hover:before:absolute group-hover:before:inset-0 group-hover:before:bg-accent/40 group-hover:before:pointer-events-none'
                        }`}
                        style={{
                          position: 'sticky',
                          left: `${colWidths.checkbox}px`,
                          zIndex: 20,
                          width: `${colWidths.ID_Key}px`,
                          minWidth: `${colWidths.ID_Key}px`,
                          maxWidth: `${colWidths.ID_Key}px`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => setDetailLot(r)}
                          className="relative z-10 font-mono font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
                          title="Bấm để xem chi tiết & lịch sử lô"
                        >
                          {r.ID_Key}
                        </button>
                      </td>

                      {/* 3. Đơn hàng */}
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-mono text-muted-foreground">
                        {r.So_DatHang}
                      </td>

                      {/* 4. Xưởng */}
                      <td className="whitespace-nowrap px-3.5 py-2.5 font-bold text-foreground">
                        {r.phong_sx}
                      </td>

                      {/* 5. Mã hàng (Inline Quick-Edit) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 font-mono font-bold text-foreground transition-all ${savedCellKey === `${r.ID_Key}-ma_hang` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'ma_hang' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 w-28 rounded border-2 border-primary bg-background px-1.5 font-mono text-xs font-bold text-foreground outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startInlineEdit(r.ID_Key, 'ma_hang', r.ma_hang)}
                            className="flex items-center gap-1 group/edit cursor-pointer"
                            title={canEdit ? 'Click đúp để sửa mã hàng' : undefined}
                          >
                            <span>{r.ma_hang}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(r.ID_Key, 'ma_hang', r.ma_hang)}
                                className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 6. Vật liệu (Inline Quick-Edit) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 font-medium text-foreground transition-all ${savedCellKey === `${r.ID_Key}-vat_lieu` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'vat_lieu' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 w-24 rounded border-2 border-primary bg-background px-1.5 font-mono text-xs text-foreground outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startInlineEdit(r.ID_Key, 'vat_lieu', r.vat_lieu)}
                            className="flex items-center gap-1 group/edit cursor-pointer"
                            title={canEdit ? 'Click đúp để sửa mác thép' : undefined}
                          >
                            <span>{r.vat_lieu}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(r.ID_Key, 'vat_lieu', r.vat_lieu)}
                                className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 7. Độ cứng (Inline Quick-Edit) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 font-mono text-foreground transition-all ${savedCellKey === `${r.ID_Key}-do_cung` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'do_cung' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 w-20 rounded border-2 border-primary bg-background px-1.5 font-mono text-xs text-foreground outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startInlineEdit(r.ID_Key, 'do_cung', r.do_cung)}
                            className="flex items-center gap-1.5 group/edit cursor-pointer"
                            title="Click đúp để sửa nhanh độ cứng"
                          >
                            <span>{r.do_cung || '—'}</span>
                            <button
                              type="button"
                              onClick={() => startInlineEdit(r.ID_Key, 'do_cung', r.do_cung)}
                              className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 8. SL (Inline Quick-Edit) */}
                      {/* 8. Số lượng (Inline Quick-Edit) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 text-right font-mono tabular-nums text-foreground transition-all ${savedCellKey === `${r.ID_Key}-so_luong` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'so_luong' ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 w-20 rounded border-2 border-primary bg-background px-1.5 font-mono text-xs text-right text-foreground outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startInlineEdit(r.ID_Key, 'so_luong', String(r.so_luong))}
                            className="flex items-center justify-end gap-1 group/edit cursor-pointer"
                            title={canEdit ? 'Click đúp để sửa số lượng' : undefined}
                          >
                            <span>{number(r.so_luong)}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(r.ID_Key, 'so_luong', String(r.so_luong))}
                                className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 9. Kg (Inline Quick-Edit) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 text-right font-mono tabular-nums text-foreground transition-all ${savedCellKey === `${r.ID_Key}-kg_Lot` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'kg_Lot' ? (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              step="0.1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 w-20 rounded border-2 border-primary bg-background px-1.5 font-mono text-xs text-right text-foreground outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startInlineEdit(r.ID_Key, 'kg_Lot', String(r.kg_Lot))}
                            className="flex items-center justify-end gap-1 group/edit cursor-pointer"
                            title={canEdit ? 'Click đúp để sửa khối lượng kg' : undefined}
                          >
                            <span>{number(r.kg_Lot, 1)}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(r.ID_Key, 'kg_Lot', String(r.kg_Lot))}
                                className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 10. Đối tác (Partner Privacy Masking & Admin Edit) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 font-medium text-foreground transition-all ${savedCellKey === `${r.ID_Key}-cty_QT` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {isAdmin && editingCell?.id === r.ID_Key && editingCell.field === 'cty_QT' ? (
                          <div className="flex items-center gap-1">
                            <select
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 rounded border-2 border-primary bg-background px-1 text-xs text-foreground outline-none shadow-xs"
                              autoFocus
                            >
                              <option value="YAMAICHI">YAMAICHI</option>
                              <option value="PROVISION">PROVISION</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => isAdmin && startInlineEdit(r.ID_Key, 'cty_QT', String(r.cty_QT))}
                            className="flex items-center gap-1 group/edit cursor-pointer"
                            title={isAdmin ? 'Click đúp để đổi đối tác gia công' : undefined}
                          >
                            <span>{formatVendorName(r.cty_QT, role)}</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(r.ID_Key, 'cty_QT', String(r.cty_QT))}
                                className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 11. Logistics (Inline Quick-Edit Dropdown) */}
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <select
                          value={r.TrangThai}
                          onChange={(e) => {
                            const newStatus = e.target.value as Status;
                            updateItem(r.ID_Key, { TrangThai: newStatus });
                            appendAudit({
                              ID_Key: r.ID_Key,
                              user: role,
                              role,
                              from: r.TrangThai,
                              to: newStatus,
                              changes: { TrangThai: [r.TrangThai, newStatus] },
                              result: 'ok',
                            });
                            toast.success(`Đã chuyển lô ${r.ID_Key} sang: ${newStatus}`);
                            playAudioCue('success');
                          }}
                          className={`h-6 rounded px-1.5 text-[11px] font-semibold border transition-colors outline-none cursor-pointer ${r.TrangThai === 'Đã nhập kho'
                            ? 'border-border bg-secondary text-muted-foreground'
                            : r.TrangThai === 'Đang tại Vendor'
                              ? 'border-primary/40 bg-primary/10 text-primary'
                              : 'border-warning/40 bg-warning/10 text-warning'
                            }`}
                        >
                          {(['Chờ xuất xưởng', 'Đang tại Vendor', 'Đã nhập kho'] as Status[]).map((s) => (
                            <option key={s} value={s} className="bg-popover text-popover-foreground">
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 12. QC (Inline Quick-Edit) */}
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <select
                          value={qcOf(r)}
                          onChange={(e) => {
                            const newQc = e.target.value as QcState;
                            const isPassed = newQc === 'Đạt';
                            updateItem(r.ID_Key, {
                              TrangThai: isPassed ? 'Đã nhập kho' : r.TrangThai,
                            });
                            appendAudit({
                              ID_Key: r.ID_Key,
                              user: role,
                              role,
                              from: qcOf(r),
                              to: newQc,
                              changes: { QC: [qcOf(r), newQc] },
                              result: 'ok',
                            });
                            toast.success(`Cập nhật QC lô ${r.ID_Key}: ${newQc}`);
                            playAudioCue('success');
                          }}
                          className={`h-6 rounded px-1.5 text-[11px] font-semibold border transition-colors outline-none cursor-pointer ${qcOf(r) === 'Đạt'
                            ? 'border-primary/40 bg-primary/10 text-primary'
                            : qcOf(r) === 'Không đạt'
                              ? 'border-destructive/40 bg-destructive/10 text-destructive'
                              : 'border-border bg-secondary text-muted-foreground'
                            }`}
                        >
                          {(['Chưa kiểm tra', 'Đang kiểm tra', 'Đạt', 'Không đạt'] as QcState[]).map((q) => (
                            <option key={q} value={q} className="bg-popover text-popover-foreground">
                              {q}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 13. Ngày gửi (Inline Quick-Edit) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 font-mono tabular-nums text-muted-foreground transition-all ${savedCellKey === `${r.ID_Key}-ngay_gui_QT` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'ngay_gui_QT' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 rounded border-2 border-primary bg-background px-1 text-xs text-foreground outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => canEdit && startInlineEdit(r.ID_Key, 'ngay_gui_QT', r.ngay_gui_QT)}
                            className="flex items-center gap-1 group/edit cursor-pointer"
                            title={canEdit ? 'Click đúp để sửa ngày gửi' : undefined}
                          >
                            <span>{date(r.ngay_gui_QT)}</span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => startInlineEdit(r.ID_Key, 'ngay_gui_QT', r.ngay_gui_QT)}
                                className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                              >
                                <Edit2 size={11} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 14. Hạn trả (Inline Quick-Edit Date) */}
                      <td
                        className={`whitespace-nowrap px-3.5 py-2.5 font-mono tabular-nums transition-all ${savedCellKey === `${r.ID_Key}-han_tra` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                          }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'han_tra' ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="date"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              className="h-7 rounded border-2 border-primary bg-background px-1 text-xs text-foreground outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => saveInlineEdit(r)}
                              className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                              title="Lưu (Enter)"
                            >
                              <Check size={13} className="stroke-[2.5]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCell(null)}
                              className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                              title="Hủy (Esc)"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startInlineEdit(r.ID_Key, 'han_tra', r.han_tra)}
                            className="flex items-center gap-1 group/edit cursor-pointer"
                            title="Click đúp để sửa hạn trả"
                          >
                            <span>{date(r.han_tra)}</span>
                            {r.han_tra_est && (
                              <span className="text-[9px] text-warning font-sans" title="Hạn ước tính +7d">
                                (+7d)
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => startInlineEdit(r.ID_Key, 'han_tra', r.han_tra)}
                              className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 15. Ghi chú (Inline Quick-Edit & Comment cho mọi role) */}
                      <td
                        className={`min-w-[160px] px-3.5 py-2 text-xs transition-all ${
                          savedCellKey === `${r.ID_Key}-ghi_chu` ? 'bg-primary/20 ring-2 ring-primary rounded-xs' : ''
                        }`}
                      >
                        {editingCell?.id === r.ID_Key && editingCell.field === 'ghi_chu' ? (
                          <div className="flex items-start gap-1">
                            <textarea
                              value={editValue}
                              placeholder="Nhập ghi chú cho lô... (Enter: lưu, Shift+Enter: xuống dòng, Tab: ô tiếp)"
                              onChange={(e) => {
                                setEditValue(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${Math.max(34, e.target.scrollHeight)}px`;
                              }}
                              ref={(el) => {
                                if (el) {
                                  el.style.height = 'auto';
                                  el.style.height = `${Math.max(34, el.scrollHeight)}px`;
                                }
                              }}
                              onKeyDown={(e) => handleCellKeyDown(e, r)}
                              rows={1}
                              style={{ resize: 'both' }}
                              className="min-h-[34px] w-full rounded border-2 border-primary bg-background px-2 py-1 text-xs text-foreground outline-none shadow-xs leading-relaxed"
                              autoFocus
                            />
                            <div className="flex flex-col gap-1 shrink-0 pt-0.5">
                              <button
                                type="button"
                                onClick={() => saveInlineEdit(r)}
                                className="text-primary hover:bg-primary/10 rounded p-1 cursor-pointer"
                                title="Lưu (Enter)"
                              >
                                <Check size={13} className="stroke-[2.5]" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCell(null)}
                                className="text-muted-foreground hover:bg-secondary rounded p-1 cursor-pointer"
                                title="Hủy (Esc)"
                              >
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={() => startInlineEdit(r.ID_Key, 'ghi_chu', r.ghi_chu ?? '')}
                            className="flex items-start justify-between gap-1 group/edit cursor-pointer py-0.5"
                            title="Click đúp để viết hoặc chỉnh sửa ghi chú"
                          >
                            <span
                              className={`text-xs break-words whitespace-pre-wrap leading-relaxed ${
                                r.ghi_chu ? 'text-foreground' : 'text-muted-foreground/60 italic'
                              }`}
                            >
                              {r.ghi_chu || '+ Thêm ghi chú...'}
                            </span>
                            <button
                              type="button"
                              onClick={() => startInlineEdit(r.ID_Key, 'ghi_chu', r.ghi_chu ?? '')}
                              className="opacity-0 group-hover/edit:opacity-100 text-muted-foreground hover:text-primary transition-opacity shrink-0 ml-1 mt-0.5"
                              title="Sửa ghi chú"
                            >
                              <Edit2 size={11} />
                            </button>
                          </div>
                        )}
                      </td>

                      {/* 16. Phiếu A4 */}
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-center">
                        <JobTicketButton item={r} role={role} variant="icon" />
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={16} className="px-4 py-16 text-center text-xs text-muted-foreground">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted/60 border border-border/80 text-muted-foreground mb-3">
                      <PackageOpen size={24} className="opacity-80 text-foreground" />
                    </div>
                    <p className="font-bold text-foreground text-sm">Không tìm thấy lô hàng nào phù hợp với bộ lọc</p>
                    <p className="mt-1.5 text-xs text-muted-foreground max-w-md mx-auto">
                      Hiện tại không có bản ghi nào khớp với điều kiện lọc đang chọn. Bạn có thể xóa nhanh bộ lọc để tải lại toàn bộ danh sách.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={resetAllFilters}
                        className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 hover:border-primary/60 transition-all cursor-pointer shadow-2xs active:scale-98"
                      >
                        <RotateCcw size={12} />
                        <span>Xóa tất cả tiêu chí lọc & Tải lại</span>
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Export Bar - Monozukuri Ergonomic Control Bar (TASK-003) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-secondary/35 px-3.5 py-2.5 text-[11px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono tabular-nums text-foreground/90 font-medium bg-background/80 px-2.5 py-1 rounded border border-border/60 shadow-2xs">
              Đang xem <b className="text-foreground">{number(rows.length ? tablePage * pageSize + 1 : 0)}</b> –{' '}
              <b className="text-foreground">{number(Math.min((tablePage + 1) * pageSize, rows.length))}</b> /{' '}
              <span className="font-bold text-foreground">{number(rows.length)}</span> lô
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground font-medium">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setTablePage(0);
                }}
                className="rounded-md border border-input bg-background px-2.5 py-1 text-[11px] text-foreground font-mono focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} dòng/trang
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => exportCsv(false)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/80 bg-background px-2.5 py-1 font-semibold text-foreground hover:bg-secondary transition-all cursor-pointer shadow-2xs hover:border-primary/40 active:scale-98"
            >
              <Download size={13} className="text-primary/90" />
              <span>Xuất CSV toàn bộ</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={tablePage === 0}
              onClick={() => {
                setTablePage((p) => Math.max(0, p - 1));
                playAudioCue('beep');
              }}
              title="Trang trước (Phím tắt: Alt + Mũi tên trái)"
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <ChevronLeft size={13} />
              <span>Trang trước</span>
              <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 bg-muted text-muted-foreground rounded border border-border/60 font-mono">
                Alt+←
              </kbd>
            </button>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border border-border/70 font-mono text-[11px] shadow-2xs">
              <span className="text-muted-foreground font-sans">Trang</span>
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
              title="Trang sau (Phím tắt: Alt + Mũi tên phải)"
              className="inline-flex items-center gap-1 rounded-md border border-border/80 bg-background px-2.5 py-1 font-medium text-foreground disabled:opacity-40 disabled:cursor-not-allowed hover:bg-secondary transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <span>Trang sau</span>
              <ChevronRight size={13} />
              <kbd className="hidden md:inline-block text-[9px] px-1 py-0.2 bg-muted text-muted-foreground rounded border border-border/60 font-mono">
                Alt+→
              </kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Proposal 2 & 5: Floating Bulk Action Bar - Monozukuri Control Dock (TASK-004) */}
      {selectedLots.size > 0 && (
        <aside
          aria-label="Thao tác hàng loạt"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-wrap items-center gap-2.5 rounded-xl border border-border/80 bg-card/95 px-4 py-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 text-xs"
        >
          {/* Segment 1: Selected Count & Telemetry */}
          <div className="flex items-center gap-2.5 pr-3 border-r border-border/80">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-[11px] font-black text-primary-foreground shadow-2xs">
              {selectedLots.size}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground leading-tight">
                {selectedLots.size} lô được chọn
              </span>
              <span className="text-[10px] font-mono text-muted-foreground leading-tight">
                {number(selectedSummary.qty)} chi tiết • {number(Math.round(selectedSummary.kg * 10) / 10)} kg
              </span>
            </div>
          </div>

          {/* Segment 2: Production Actions */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setBulkEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer shadow-xs active:scale-98"
            >
              <Zap size={13} />
              <span>Sửa hàng loạt</span>
            </button>

            <button
              type="button"
              onClick={() => setBatchPrintOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary hover:border-border transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <Printer size={13} className="text-primary/80" />
              <span>In phiếu A4 ({selectedLots.size})</span>
            </button>
          </div>

          <div className="h-4 w-px bg-border/80 hidden sm:block" />

          {/* Segment 3: Data & Export Operations */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => exportCsv(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary hover:border-border transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <Download size={13} className="text-primary/80" />
              <span>Xuất CSV</span>
            </button>

            <button
              type="button"
              onClick={copySelectedIds}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-secondary/80 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary hover:border-border transition-all cursor-pointer shadow-2xs active:scale-98"
            >
              <Copy size={13} className="text-muted-foreground" />
              <span>Copy mã</span>
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
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
            title="Bỏ chọn toàn bộ (Phím tắt: Esc)"
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
            setDetailLot((prev) => (prev ? { ...prev, ...patch } : null));
          }}
        />
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
        className="mes-card w-full max-w-xl overflow-hidden rounded-xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded bg-primary/10 text-primary">
              <Zap size={16} />
            </span>
            <div>
              <h2 className="text-base font-bold text-foreground">Sửa hàng loạt ({items.length} lô)</h2>
              <p className="text-xs text-muted-foreground">Cập nhật đồng bộ các thông số cho toàn bộ lô được chọn</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted-foreground hover:bg-secondary">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3.5 text-xs">
          {/* Option 1: Logistics */}
          <div className="rounded border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateLogi}
                onChange={(e) => setUpdateLogi(e.target.checked)}
                className="rounded text-primary focus:ring-primary accent-primary"
              />
              <span>Chuyển trạng thái Logistics</span>
            </label>
            {updateLogi && (
              <select
                value={logiVal}
                onChange={(e) => setLogiVal(e.target.value as Status)}
                className="w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground font-semibold"
              >
                <option value="Chờ xuất xưởng">Chờ xuất xưởng</option>
                <option value="Đang tại Vendor">Đang tại Vendor</option>
                <option value="Đã nhập kho">Đã nhập kho</option>
              </select>
            )}
          </div>

          {/* Option 2: Hạn trả */}
          <div className="rounded border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateDue}
                onChange={(e) => setUpdateDue(e.target.checked)}
                className="rounded text-primary focus:ring-primary accent-primary"
              />
              <span>Gia hạn / Cập nhật hạn trả hàng loạt</span>
            </label>
            {updateDue && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDueMode('add3')}
                    className={`flex-1 rounded border px-2 py-1 text-xs ${dueMode === 'add3' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                      }`}
                  >
                    +3 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueMode('add7')}
                    className={`flex-1 rounded border px-2 py-1 text-xs ${dueMode === 'add7' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                      }`}
                  >
                    +7 Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setDueMode('custom')}
                    className={`flex-1 rounded border px-2 py-1 text-xs ${dueMode === 'custom' ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border'
                      }`}
                  >
                    Ngày cụ thể
                  </button>
                </div>
                {dueMode === 'custom' && (
                  <input
                    type="date"
                    value={customDue}
                    onChange={(e) => setCustomDue(e.target.value)}
                    className="w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground"
                  />
                )}
              </div>
            )}
          </div>

          {/* Option 3: Độ cứng */}
          <div className="rounded border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateHrc}
                onChange={(e) => setUpdateHrc(e.target.checked)}
                className="rounded text-primary focus:ring-primary accent-primary"
              />
              <span>Cập nhật độ cứng thực tế</span>
            </label>
            {updateHrc && (
              <input
                type="text"
                placeholder="VD: 58-62 HRC hoặc 44±1"
                value={hrcVal}
                onChange={(e) => setHrcVal(e.target.value)}
                className="w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
              />
            )}
          </div>

          {/* Option 4: Đối tác QT (Admin only) */}
          {isAdmin && (
            <div className="rounded border p-3 bg-secondary/20">
              <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={updateVendor}
                  onChange={(e) => setUpdateVendor(e.target.checked)}
                  className="rounded text-primary focus:ring-primary accent-primary"
                />
                <span>Chuyển đối tác gia công ngoài (Admin)</span>
              </label>
              {updateVendor && (
                <select
                  value={vendorVal}
                  onChange={(e) => setVendorVal(e.target.value as Vendor)}
                  className="w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground font-semibold"
                >
                  <option value="YAMAICHI">YAMAICHI</option>
                  <option value="PROVISION">PROVISION</option>
                </select>
              )}
            </div>
          )}

          {/* Option 5: Ngày gửi QT */}
          <div className="rounded border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateSendDate}
                onChange={(e) => setUpdateSendDate(e.target.checked)}
                className="rounded text-primary focus:ring-primary accent-primary"
              />
              <span>Điều chỉnh ngày gửi QT</span>
            </label>
            {updateSendDate && (
              <input
                type="date"
                value={sendDateVal}
                onChange={(e) => setSendDateVal(e.target.value)}
                className="w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
              />
            )}
          </div>

          {/* Option 6: Mác thép / Vật liệu */}
          <div className="rounded border p-3 bg-secondary/20">
            <label className="flex items-center gap-2 font-bold cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={updateMaterial}
                onChange={(e) => setUpdateMaterial(e.target.checked)}
                className="rounded text-primary focus:ring-primary accent-primary"
              />
              <span>Cập nhật mác thép / vật liệu</span>
            </label>
            {updateMaterial && (
              <input
                type="text"
                placeholder="VD: DAC, SKD61, NAK80..."
                value={materialVal}
                onChange={(e) => setMaterialVal(e.target.value)}
                className="w-full rounded border border-input bg-background px-3 py-1.5 text-xs text-foreground font-mono"
              />
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-muted-foreground font-semibold mb-1">
              Lý do điều chỉnh (lưu vào Audit Trail):
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Gia hạn do đối tác quá tải lò; Chuyển xưởng hàng loạt ca sáng..."
              className="w-full h-14 rounded border border-input bg-background p-2 text-xs text-foreground"
            />
          </div>

          {/* Preview list */}
          <div className="rounded bg-muted/40 p-2.5">
            <p className="font-bold text-[11px] text-muted-foreground mb-1">
              DANH SÁCH {items.length} LÔ BỊ TÁC ĐỘNG:
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
            className="rounded border px-4 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!hasAnyChange}
            onClick={handleConfirm}
            className="rounded bg-primary px-5 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 cursor-pointer shadow-xs"
          >
            Xác nhận áp dụng ({items.length} lô)
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
                <span className="font-mono text-sm font-black text-primary px-2 py-0.5 rounded bg-primary/10">
                  {item.ID_Key}
                </span>
                <span className="rounded bg-secondary px-2 py-0.5 font-bold text-[10px] text-muted-foreground">
                  Phân xưởng {item.phong_sx}
                </span>
              </div>
              <h2 className="mt-2 font-mono text-xl font-black text-foreground">{item.ma_hang}</h2>
              <p className="text-xs text-muted-foreground font-mono">Đơn hàng: {item.So_DatHang}</p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`rounded px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer border ${isEditing
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary hover:bg-muted text-foreground'
                    }`}
                >
                  {isEditing ? 'Hủy sửa' : '✏️ Sửa lô này'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* If Editing Mode */}
          {isEditing ? (
            <div className="space-y-3 rounded-lg border border-primary/30 bg-secondary/20 p-4 text-xs mb-4">
              <h3 className="font-display font-bold text-foreground text-sm flex items-center gap-1.5">
                <Edit2 size={14} className="text-primary" /> Chỉnh sửa thông số lô {item.ID_Key}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Mã hàng:
                  </label>
                  <input
                    type="text"
                    value={form.ma_hang}
                    onChange={(e) => setForm({ ...form, ma_hang: e.target.value })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs font-bold text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Số đơn hàng:
                  </label>
                  <input
                    type="text"
                    value={form.So_DatHang}
                    onChange={(e) => setForm({ ...form, So_DatHang: e.target.value })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Mác thép / Vật liệu:
                  </label>
                  <input
                    type="text"
                    value={form.vat_lieu}
                    onChange={(e) => setForm({ ...form, vat_lieu: e.target.value })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Độ cứng yêu cầu:
                  </label>
                  <input
                    type="text"
                    value={form.do_cung}
                    onChange={(e) => setForm({ ...form, do_cung: e.target.value })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Số lượng xuất:
                  </label>
                  <input
                    type="number"
                    value={form.so_luong}
                    onChange={(e) => setForm({ ...form, so_luong: Number(e.target.value) })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Khối lượng (kg):
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.kg_Lot}
                    onChange={(e) => setForm({ ...form, kg_Lot: Number(e.target.value) })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                  />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                      Đơn vị gia công:
                    </label>
                    <select
                      value={form.cty_QT}
                      onChange={(e) => setForm({ ...form, cty_QT: e.target.value as Vendor })}
                      className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground font-semibold"
                    >
                      <option value="YAMAICHI">YAMAICHI</option>
                      <option value="PROVISION">PROVISION</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Trạng thái luân chuyển:
                  </label>
                  <select
                    value={form.TrangThai}
                    onChange={(e) => setForm({ ...form, TrangThai: e.target.value as Status })}
                    className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs text-foreground font-semibold"
                  >
                    <option value="Chờ xuất xưởng">Chờ xuất xưởng</option>
                    <option value="Đang tại Vendor">Đang tại Vendor</option>
                    <option value="Đã nhập kho">Đã nhập kho</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Ngày gửi QT:
                  </label>
                  <input
                    type="date"
                    value={form.ngay_gui_QT}
                    onChange={(e) => setForm({ ...form, ngay_gui_QT: e.target.value })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs text-foreground font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                    Hạn trả gia công:
                  </label>
                  <input
                    type="date"
                    value={form.han_tra}
                    onChange={(e) => setForm({ ...form, han_tra: e.target.value })}
                    className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs text-foreground font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Kích thước sản phẩm:
                </label>
                <input
                  type="text"
                  value={form.Kich_Thuoc_SP}
                  placeholder="VD: Ø30x120, 45x60x12..."
                  onChange={(e) => setForm({ ...form, Kich_Thuoc_SP: e.target.value })}
                  className="w-full rounded border border-input bg-background px-2.5 py-1.5 font-mono text-xs text-foreground"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-1">
                  Lý do thay đổi:
                </label>
                <input
                  type="text"
                  value={editReason}
                  placeholder="VD: Cập nhật mã hàng thực tế xưởng..."
                  onChange={(e) => setEditReason(e.target.value)}
                  className="w-full rounded border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded border border-border px-3 py-1.5 text-xs font-semibold hover:bg-secondary cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-xs"
                >
                  Lưu thay đổi lô này
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Technical Specs Grid - Monozukuri Precision Grid (TASK-005) */}
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-secondary/30 p-3.5 text-xs mb-4">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider mb-0.5">
                    Mác thép / Vật liệu:
                  </span>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="font-mono font-bold text-foreground text-sm px-1.5 py-0.5 rounded bg-background border border-border/70 shadow-2xs">
                      {item.vat_lieu || '—'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider mb-0.5">
                    Độ cứng yêu cầu:
                  </span>
                  <p className="font-mono font-bold text-sm">
                    {item.do_cung && item.do_cung !== '—' ? (
                      <span className="text-destructive font-black px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/20 shadow-2xs">
                        {item.do_cung}
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium text-xs">Chưa có thông số</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    Số lượng xuất:
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {number(item.so_luong)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {item.don_vi_tinh || 'chi tiết'}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    Trọng lượng lô:
                  </span>
                  <p className="font-mono font-bold text-foreground text-sm">
                    {number(item.kg_Lot, 1)}{' '}
                    <span className="text-xs font-normal text-muted-foreground">kg</span>
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    Kích thước SP:
                  </span>
                  <p className="font-mono text-foreground">{item.Kich_Thuoc_SP || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    Đơn vị nhận gia công:
                  </span>
                  <p className="font-semibold text-foreground">{formatVendorName(item.cty_QT, role as any)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    Ngày gửi xuất xưởng:
                  </span>
                  <p className="font-mono text-foreground">{date(item.ngay_gui_QT)}</p>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                    Hạn trả gia công:
                  </span>
                  <p className="font-mono font-bold text-foreground">
                    {date(item.han_tra)}
                  </p>
                </div>

                {/* Phân quyền xem đơn giá & thành tiền */}
                {canViewPricing(role as any) && (
                  <>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                        Đơn giá gia công:
                      </span>
                      <p className="font-mono font-bold text-foreground">
                        {item.don_gia ? money(item.don_gia) : 'Chưa có giá'}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] text-muted-foreground block font-bold uppercase tracking-wider">
                        Thành tiền dự kiến:
                      </span>
                      <p className="font-mono font-black text-primary">
                        {item.thanh_tien ? money(item.thanh_tien) : '—'}
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Current Status Banner */}
              <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Trạng thái luân chuyển:
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
              <span>NHẬT KÝ THAY ĐỔI & AUDIT TRAIL</span>
              <span className="font-mono text-[10px] font-normal px-2 py-0.5 bg-muted rounded border border-border/60 text-muted-foreground">
                {auditLogs.length} bản ghi
              </span>
            </h3>
            {auditLogs.length ? (
              <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-border/80 bg-background/50 p-2.5 text-[11px]">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border-l-2 border-primary/70 pl-2.5 py-1 bg-secondary/25 rounded-r pr-2 shadow-2xs">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                      <span>{new Date(log.at).toLocaleString('vi-VN')}</span>
                      <span className="font-bold text-foreground/85 px-1.5 py-0.2 bg-muted rounded text-[9px] border border-border/40">
                        {log.user} ({log.role})
                      </span>
                    </div>
                    <p className="font-medium text-foreground mt-0.5 font-mono text-[11px]">
                      {Object.entries(log.changes)
                        .map(([k, [oldV, newV]]) => `${k}: "${oldV}" → "${newV}"`)
                        .join('; ')}
                    </p>
                    {log.reason && <p className="text-muted-foreground/80 text-[10px] italic mt-0.5">Lý do: {log.reason}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic p-3 border border-border/60 rounded-lg text-center bg-secondary/20">
                Chưa có thay đổi nào được ghi nhận cho lô này.
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
            className="rounded border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
