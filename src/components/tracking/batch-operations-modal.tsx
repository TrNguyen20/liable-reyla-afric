import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import {
  PenLine,
  X,
  Search,
  Check,
  Lock,
  Upload,
  FileText,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Plus,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';
import { roleBadge, roleLabel, canViewPricing, type Role } from '@/lib/dynamo-auth';
import {
  AttachmentItem,
  detectCloudSource,
  inferFileType,
  parseMultiUrls,
  smartMatchFileToLot,
  compressImageFile,
  serializeAttachments,
  parseAttachments,
} from './attachment-field';
import type { QTItem, Status, Vendor } from '@/lib/dynamo-data';

export type BatchCategory = 'all' | 'technical' | 'commercial' | 'vendor_qc' | 'documents';

export interface BatchFieldDefinition {
  key: keyof QTItem | string;
  label: string;
  category: 'technical' | 'commercial' | 'vendor_qc' | 'documents';
  type: 'text' | 'number' | 'date' | 'select' | 'attachment';
  options?: string[];
  isMaster?: boolean;
  requiresAdmin?: boolean;
  requiresPricing?: boolean;
  docField?: 'ncc_file1' | 'ncc_giando' | 'ncc_thongtinkhac1' | 'ncc_thongtinkhac2';
}

export const BATCH_FIELDS_CONFIG: BatchFieldDefinition[] = [
  // 1. Kỹ thuật & Nội bộ
  { key: 'phong_sx', label: 'Phân xưởng', category: 'technical', type: 'text', isMaster: true },
  { key: 'doi_tuong_hang', label: 'Đối tượng hàng', category: 'technical', type: 'text', isMaster: true },
  { key: 'id_ma_hang', label: 'Mã phôi / Bản vẽ', category: 'technical', type: 'text', isMaster: true },
  { key: 'so_luong', label: 'Số lượng chi tiết', category: 'technical', type: 'number' },
  { key: 'vat_lieu', label: 'Mác thép / Vật liệu', category: 'technical', type: 'text' },
  { key: 'do_cung', label: 'Độ cứng yêu cầu', category: 'technical', type: 'text' },
  { key: 'kich_thuoc_sp', label: 'Quy cách kích thước', category: 'technical', type: 'text' },
  { key: 'kg_Lot', label: 'Khối lượng lô (kg)', category: 'technical', type: 'number' },
  { key: 'don_vi_tinh', label: 'Đơn vị tính', category: 'technical', type: 'text' },

  // 2. Thương mại & Logistics
  { key: 'TrangThai', label: 'Trạng thái Logistics', category: 'commercial', type: 'select', options: ['Chờ xuất xưởng', 'Đang tại Vendor', 'Đã nhập kho'] },
  { key: 'cty_QT', label: 'Đối tác gia công', category: 'commercial', type: 'select', options: ['YAMAICHI', 'PROVISION'], requiresAdmin: true },
  { key: 'ngay_gui_QT', label: 'Ngày gửi QT', category: 'commercial', type: 'date' },
  { key: 'han_tra', label: 'Hạn trả hàng', category: 'commercial', type: 'date' },
  { key: 'don_gia', label: 'Đơn giá nội bộ', category: 'commercial', type: 'number', requiresPricing: true },
  { key: 'ty_gia', label: 'Tỷ giá', category: 'commercial', type: 'number', requiresPricing: true },
  { key: 'so_dat_hang', label: 'Mã đơn đặt hàng', category: 'commercial', type: 'text' },
  { key: 'ghi_chu', label: 'Ghi chú điều độ', category: 'commercial', type: 'text' },

  // 3. Phản hồi NCC Ghi
  { key: 'ncc_ngay_qt', label: 'NCC Ngày QT', category: 'vendor_qc', type: 'date' },
  { key: 'ncc_ngay_tra_qt', label: 'NCC Ngày trả QT', category: 'vendor_qc', type: 'date' },
  { key: 'ncc_so_lo', label: 'NCC Số lò / Lô QT', category: 'vendor_qc', type: 'text' },
  { key: 'ncc_ten_qt', label: 'NCC Tên mẻ QT', category: 'vendor_qc', type: 'text' },
  { key: 'ncc_ket_qua_hrc', label: 'NCC Độ cứng đo', category: 'vendor_qc', type: 'text' },
  { key: 'ncc_ket_qua_qc', label: 'NCC Nghiệm thu QC', category: 'vendor_qc', type: 'select', options: ['', 'PASS', 'FAIL'] },
  { key: 'ncc_tatus', label: 'NCC Tiến độ', category: 'vendor_qc', type: 'select', options: ['', 'WAIT', 'HEAT', 'DONE'] },
  { key: 'ncc_don_gia', label: 'NCC Đơn giá báo', category: 'vendor_qc', type: 'number', requiresPricing: true },
  { key: 'ncc_thongtinkhac1', label: 'NCC Ghi chú 1 / PO', category: 'vendor_qc', type: 'text' },
  { key: 'ncc_thongtinkhac2', label: 'NCC Ghi chú 2 / Báo giá', category: 'vendor_qc', type: 'text' },

  // 4. Tài liệu & Chứng chỉ (Upload)
  { key: 'ncc_file1', label: 'Chứng chỉ QT (CO/CQ)', category: 'documents', type: 'attachment', docField: 'ncc_file1' },
  { key: 'ncc_giando', label: 'Giản đồ nhiệt', category: 'documents', type: 'attachment', docField: 'ncc_giando' },
  { key: 'doc_po', label: 'File PO / Đơn hàng', category: 'documents', type: 'attachment', docField: 'ncc_thongtinkhac1' },
  { key: 'doc_quote', label: 'Báo giá NCC', category: 'documents', type: 'attachment', docField: 'ncc_thongtinkhac2' },
];

/** 6 Absolute Immutable Master Identifiers (Strictly Locked for All Roles) */
export const MASTER_IMMUTABLE_KEYS = new Set([
  'ma_hang',
  'ngay_tao',
  'quoc_gia',
  'phong_sx',
  'doi_tuong_hang',
  'id_ma_hang',
]);

/** Evaluates whether a field is editable given user role according to MES RBAC */
export function isFieldEditableByRole(fieldKey: string, role: Role | string): boolean {
  if (MASTER_IMMUTABLE_KEYS.has(fieldKey)) {
    return false;
  }
  if (role === 'viewer') {
    return false;
  }
  if (fieldKey === 'cty_QT') {
    return role === 'admin';
  }
  if (fieldKey === 'don_gia' || fieldKey === 'ty_gia' || fieldKey === 'ncc_don_gia') {
    return role === 'admin' || role === 'leader';
  }
  if (typeof role === 'string' && role.startsWith('qt_')) {
    // Partner roles can only edit vendor response columns (ncc_*)
    return fieldKey.startsWith('ncc_');
  }
  return true;
}

/** Summarizes distribution of current values across lots for a specific field */
export function calculateFieldDistribution(items: QTItem[], fieldKey: keyof QTItem): string {
  if (!items || items.length === 0) return 'Không có lô nào';

  const freq = new Map<string, number>();
  let emptyCount = 0;

  for (const item of items) {
    const val = item[fieldKey];
    if (val === undefined || val === null || String(val).trim() === '') {
      emptyCount++;
    } else {
      const strVal = String(val).trim();
      freq.set(strVal, (freq.get(strVal) || 0) + 1);
    }
  }

  const parts: string[] = [];
  const sortedEntries = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);

  // If attachment or long text, summarize count
  if (fieldKey === 'ncc_file1' || fieldKey === 'ncc_giando') {
    const hasDataCount = items.length - emptyCount;
    if (hasDataCount > 0) parts.push(`${hasDataCount} lô có dữ liệu`);
    if (emptyCount > 0) parts.push(`${emptyCount} lô trống`);
    return parts.join(', ');
  }

  for (const [val, count] of sortedEntries.slice(0, 3)) {
    parts.push(`${val} (${count} lô)`);
  }

  if (sortedEntries.length > 3) {
    const remaining = sortedEntries.slice(3).reduce((acc, [, c]) => acc + c, 0);
    parts.push(`khác (${remaining} lô)`);
  }

  if (emptyCount > 0) {
    parts.push(`trống (${emptyCount} lô)`);
  }

  return parts.join(', ') || 'Chưa có dữ liệu';
}

export interface LotDiffItem {
  field: string;
  label: string;
  from: string;
  to: string;
}

/** Computes live diff between existing lot data and candidate patch */
export function computeLotDiff(lot: QTItem, patch: Partial<QTItem>): LotDiffItem[] {
  const diffs: LotDiffItem[] = [];
  for (const [key, newVal] of Object.entries(patch)) {
    if (newVal === undefined) continue;
    const oldVal = (lot as any)[key];
    const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : '';
    const newStr = newVal !== null ? String(newVal).trim() : '';

    if (oldStr !== newStr) {
      const def = BATCH_FIELDS_CONFIG.find((f) => f.key === key);
      const label = def?.label || key;
      diffs.push({
        field: key,
        label,
        from: oldStr || '—',
        to: newStr || '—',
      });
    }
  }
  return diffs;
}

export interface BatchOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QTItem[];
  role: Role | string;
  onApply: (patchMap: Map<string, Partial<QTItem>>) => void;
}

export const BatchOperationsModal: React.FC<BatchOperationsModalProps> = ({
  isOpen,
  onClose,
  items,
  role,
  onApply,
}) => {
  // State 1: Active lots selection (right column)
  const [activeLotIds, setActiveLotIds] = useState<Set<string>>(() => new Set(items.map((i) => i.ID_Key)));
  const [lotSearch, setLotSearch] = useState('');

  // State 2: Progressive disclosure field selection (left column)
  const [fieldSearch, setFieldSearch] = useState('');
  const [activeTab, setActiveTab] = useState<BatchCategory>('all');
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<Set<string>>(new Set());

  // State 3: Values for active field editors
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});

  // State 4: Batch Document Upload Settings
  const [targetDocColumns, setTargetDocColumns] = useState<Set<string>>(new Set(['ncc_file1']));
  const [assignmentStrategy, setAssignmentStrategy] = useState<'shared' | 'smart'>('shared');
  const [writePolicy, setWritePolicy] = useState<'append' | 'replace'>('append');
  const [stagedFiles, setStagedFiles] = useState<{ file: File; dataUri?: string; name: string }[]>([]);
  const [stagedUrls, setStagedUrls] = useState<AttachmentItem[]>([]);
  const [urlInput, setUrlInput] = useState('');
  const [urlNote, setUrlNote] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputId = useId();

  // Summary telemetry for header
  const totalPieces = useMemo(() => items.reduce((acc, i) => acc + (Number(i.so_luong) || 0), 0), [items]);
  const totalWeight = useMemo(() => Math.round(items.reduce((acc, i) => acc + (Number(i.kg_Lot) || 0), 0) * 10) / 10, [items]);

  // Filtered fields list by tab & search query
  const filteredFields = useMemo(() => {
    return BATCH_FIELDS_CONFIG.filter((f) => {
      if (activeTab !== 'all' && f.category !== activeTab) return false;
      if (fieldSearch.trim()) {
        const query = fieldSearch.toLowerCase();
        return f.label.toLowerCase().includes(query) || String(f.key).toLowerCase().includes(query);
      }
      return true;
    });
  }, [activeTab, fieldSearch]);

  // Toggle field selection chip
  const toggleField = (key: string) => {
    const isAllowed = isFieldEditableByRole(key, role);
    if (!isAllowed) {
      playAudioCue('beep');
      toast.warning('Vai trò của bạn không có quyền sửa thông số này');
      return;
    }
    const next = new Set(selectedFieldKeys);
    if (next.has(key)) {
      next.delete(key);
      const nextValues = { ...fieldValues };
      delete nextValues[key];
      setFieldValues(nextValues);
    } else {
      next.add(key);
      playAudioCue('pop');
    }
    setSelectedFieldKeys(next);
  };

  // Toggle target document column
  const toggleDocColumn = (colKey: string) => {
    const next = new Set(targetDocColumns);
    if (next.has(colKey)) {
      if (next.size > 1) next.delete(colKey);
    } else {
      next.add(colKey);
    }
    setTargetDocColumns(next);
  };

  // Handle local files drop / input
  const handleProcessFile = async (file: File) => {
    if (file.type.startsWith('image/')) {
      toast.info(`Đang nén ảnh ${file.name}...`);
      try {
        const compressed = await compressImageFile(file);
        setStagedFiles((prev) => [...prev, { file, dataUri: compressed, name: file.name }]);
        playAudioCue('success');
        toast.success(`Đã thêm ảnh: ${file.name}`);
      } catch {
        toast.error('Lỗi khi nén ảnh');
      }
      return;
    }

    if (file.size > 51200) {
      playAudioCue('beep');
      toast.error(
        `Tệp ${file.name} vượt quá 50KB. Để bảo vệ dữ liệu Google Sheets, vui lòng tải tệp lên Google Drive/OneDrive và dán liên kết vào ô bên dưới.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setStagedFiles((prev) => [...prev, { file, dataUri: reader.result as string, name: file.name }]);
        playAudioCue('success');
        toast.success(`Đã thêm tệp: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(handleProcessFile);
    }
  };

  const handleAddMultiUrls = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const parsed = parseMultiUrls(urlInput, urlNote.trim() || 'Tài liệu');
    if (parsed.length === 0) {
      toast.error('Vui lòng nhập đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }
    setStagedUrls((prev) => [...prev, ...parsed]);
    setUrlInput('');
    setUrlNote('');
    playAudioCue('success');
    toast.success(`Đã thêm ${parsed.length} liên kết tài liệu`);
  };

  // Run Smart Match and auto-uncheck non-matching lots
  const handleSmartMatch = () => {
    if (stagedFiles.length === 0 && stagedUrls.length === 0) {
      toast.warning('Vui lòng tải lên tệp hoặc dán liên kết trước khi kích hoạt Smart Match');
      return;
    }

    const matchedIds = new Set<string>();
    const allFileNames = [
      ...stagedFiles.map((f) => f.name),
      ...stagedUrls.map((u) => u.name),
    ];

    for (const lot of items) {
      const isMatched = allFileNames.some((fileName) =>
        smartMatchFileToLot(fileName, lot.ma_hang, lot.id_ma_hang)
      );
      if (isMatched) {
        matchedIds.add(lot.ID_Key);
      }
    }

    setActiveLotIds(matchedIds);
    playAudioCue('success');
    toast.info(`Smart Match hoàn tất: Khớp ${matchedIds.size}/${items.length} lô. Các lô không khớp đã được tự động bỏ tích.`);
  };

  // Compute final patch per lot
  const candidatePatchMap = useMemo(() => {
    const map = new Map<string, Partial<QTItem>>();
    const activeLots = items.filter((i) => activeLotIds.has(i.ID_Key));

    for (const lot of activeLots) {
      const patch: Partial<QTItem> = {};

      // 1. Regular fields
      for (const [key, val] of Object.entries(fieldValues)) {
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          (patch as any)[key] = val;
        }
      }

      // 2. Document upload fields
      const isDocTabActive = selectedFieldKeys.has('ncc_file1') ||
        selectedFieldKeys.has('ncc_giando') ||
        selectedFieldKeys.has('doc_po') ||
        selectedFieldKeys.has('doc_quote') ||
        activeTab === 'documents';

      if (isDocTabActive && (stagedFiles.length > 0 || stagedUrls.length > 0)) {
        // Collect files applicable to this lot
        const lotAttachments: AttachmentItem[] = [];

        if (assignmentStrategy === 'shared') {
          // Attach all staged files/URLs
          for (let idx = 0; idx < stagedFiles.length; idx++) {
            const f = stagedFiles[idx];
            if (f && f.dataUri) {
              lotAttachments.push({
                id: `staged-${lot.ID_Key}-${idx}`,
                name: f.name,
                url: f.dataUri,
                type: inferFileType(f.dataUri, f.name),
                source: 'generic',
                size: `${Math.ceil(f.dataUri.length / 1370)} KB`,
                uploadedAt: new Date().toISOString(),
              });
            }
          }
          lotAttachments.push(...stagedUrls);
        } else {
          // Smart Match: attach only files matching this lot's ma_hang / id_ma_hang
          for (let idx = 0; idx < stagedFiles.length; idx++) {
            const f = stagedFiles[idx];
            if (f && f.dataUri && smartMatchFileToLot(f.name, lot.ma_hang, lot.id_ma_hang)) {
              lotAttachments.push({
                id: `staged-match-${lot.ID_Key}-${idx}`,
                name: f.name,
                url: f.dataUri,
                type: inferFileType(f.dataUri, f.name),
                source: 'generic',
                size: `${Math.ceil(f.dataUri.length / 1370)} KB`,
                uploadedAt: new Date().toISOString(),
              });
            }
          }
          for (const u of stagedUrls) {
            if (smartMatchFileToLot(u.name, lot.ma_hang, lot.id_ma_hang)) {
              lotAttachments.push(u);
            }
          }
        }

        if (lotAttachments.length > 0) {
          for (const col of targetDocColumns) {
            const existingRaw = (lot as any)[col] as string | undefined;
            const existingItems = parseAttachments(existingRaw);
            const finalItems = writePolicy === 'append' ? [...existingItems, ...lotAttachments] : lotAttachments;
            (patch as any)[col] = serializeAttachments(finalItems);
          }
        }
      }

      if (Object.keys(patch).length > 0) {
        map.set(lot.ID_Key, patch);
      }
    }

    return map;
  }, [
    items,
    activeLotIds,
    fieldValues,
    selectedFieldKeys,
    activeTab,
    stagedFiles,
    stagedUrls,
    assignmentStrategy,
    writePolicy,
    targetDocColumns,
  ]);

  // Total affected lots and total fields modified
  const totalModificationsCount = useMemo(() => {
    let count = 0;
    candidatePatchMap.forEach((patch) => {
      count += Object.keys(patch).length;
    });
    return count;
  }, [candidatePatchMap]);

  const handleConfirmSubmit = () => {
    if (activeLotIds.size === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 lô để áp dụng');
      return;
    }
    if (totalModificationsCount === 0) {
      toast.warning('Chưa có thông số nào được chỉnh sửa hoặc tệp nào được gán');
      return;
    }
    onApply(candidatePatchMap);
    playAudioCue('success');
    toast.success(`Đã áp dụng cập nhật cho ${candidatePatchMap.size} lô thành công!`);
    onClose();
  };

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in-0 duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-w-[1260px] 2xl:max-w-[1360px] w-[96vw] max-h-[92vh] rounded-xl border border-slate-200 bg-white p-0 shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-slide-up"
        style={{ borderRadius: '12px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Modal Header (Phong cách Slate tương phản cao, icon bo tròn hộp nổi bật) */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-800 font-bold text-base shadow-inner">
              <PenLine size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight uppercase whitespace-nowrap">
                  THAO TÁC HÀNG LOẠT ({items.length} LÔ)
                </h2>
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-300 whitespace-nowrap">
                  Quyền: {roleLabel(role as Role)}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Cập nhật đồng bộ các thông số và tài liệu cho toàn bộ lô được chọn • <span className="font-medium text-slate-700">{totalPieces} chi tiết • {totalWeight} kg</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-base transition cursor-pointer"
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>

        {/* 2. Modal Body: Split 2 Columns 7/5 (58% Trái - 42% Phải) */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-0">
          {/* CỘT TRÁI (7/12 ~ 58%): BỘ CHỌN TRƯỜNG THEO RBAC & KHUNG NHẬP LIỆU ĐỘNG */}
          <div className="lg:col-span-7 flex flex-col min-h-0 bg-white">
            {/* Sticky Field Picker Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                  1. Chọn thông số cần cập nhật đồng bộ
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFieldKeys(new Set());
                      setFieldValues({});
                    }}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium cursor-pointer whitespace-nowrap"
                  >
                    Bỏ chọn hết trường
                  </button>
                </div>
              </div>

              {/* Search + Category Filter Tabs (Single clean row, no line wrap) */}
              <div className="flex flex-nowrap items-center gap-2">
                <div className="relative w-56 sm:w-64 shrink-0">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh thông số..."
                    value={fieldSearch}
                    onChange={(e) => setFieldSearch(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                  />
                </div>

                <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-[11px] shrink-0">
                  {(
                    [
                      { id: 'all', label: 'Tất cả' },
                      { id: 'documents', label: '📎 Tài liệu (4)' },
                      { id: 'technical', label: 'Kỹ thuật' },
                      { id: 'commercial', label: 'PO & Giá' },
                      { id: 'vendor_qc', label: 'NCC Ghi' },
                    ] as { id: BatchCategory; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-2.5 py-1 rounded-md transition cursor-pointer font-medium whitespace-nowrap ${activeTab === tab.id
                          ? 'bg-slate-900 text-white font-semibold shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* RBAC Interactive Field Chips Container */}
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-0.5 pr-1">
                {filteredFields.map((field) => {
                  const isSelected = selectedFieldKeys.has(field.key as string);
                  const isAllowed = isFieldEditableByRole(field.key as string, role);

                  if (!isAllowed) {
                    return (
                      <button
                        key={field.key as string}
                        type="button"
                        disabled
                        title="Vai trò của bạn không có quyền sửa thông số này"
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed flex items-center gap-1 opacity-75"
                      >
                        <Lock size={11} className="shrink-0" />
                        <span>{field.label}</span>
                      </button>
                    );
                  }

                  if (isSelected) {
                    return (
                      <button
                        key={field.key as string}
                        type="button"
                        onClick={() => toggleField(field.key as string)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-900 bg-[#111827] text-white shadow-sm flex items-center gap-1 transition cursor-pointer"
                      >
                        <Check size={12} className="shrink-0" />
                        <span>{field.label}</span>
                      </button>
                    );
                  }

                  return (
                    <button
                      key={field.key as string}
                      type="button"
                      onClick={() => toggleField(field.key as string)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-slate-300 bg-white text-slate-700 hover:border-slate-900 hover:text-slate-900 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Plus size={11} className="shrink-0 text-slate-400" />
                      <span>{field.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Scrollable Active Field Editors + Batch Document Uploader */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-white">
              {selectedFieldKeys.size === 0 && activeTab !== 'documents' ? (
                <div className="border border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50/50">
                  <div className="text-base font-semibold text-slate-700">Chưa chọn thông số nào để cập nhật</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Hãy bấm vào các thẻ thông số phía trên (VD: <strong>+ CHỨNG CHỈ QT</strong>, <strong>+ ĐỘ CỨNG</strong>, <strong>+ HẠN TRẢ</strong>) để mở khung nhập liệu đồng bộ.
                  </p>
                </div>
              ) : null}

              {/* Special: Batch Document Upload Card (Viền đôi Slate 900 nổi bật) */}
              {(activeTab === 'documents' ||
                selectedFieldKeys.has('ncc_file1') ||
                selectedFieldKeys.has('ncc_giando') ||
                selectedFieldKeys.has('doc_po') ||
                selectedFieldKeys.has('doc_quote')) && (
                  <div className="border-2 border-slate-900 rounded-xl p-4 bg-white shadow-sm space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-bold uppercase shrink-0">
                          UPLOAD HÀNG LOẠT
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wide text-slate-900 whitespace-nowrap">
                          ĐÍNH KÈM TÀI LIỆU / CHỨNG CHỈ (KẾ THỪA HÌNH 6)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Set(selectedFieldKeys);
                          next.delete('ncc_file1');
                          next.delete('ncc_giando');
                          next.delete('doc_po');
                          next.delete('doc_quote');
                          setSelectedFieldKeys(next);
                        }}
                        className="text-slate-400 hover:text-rose-600 text-xs px-1 cursor-pointer"
                        title="Đóng khung Upload"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {/* Step A: Chọn cột tài liệu đích (Multi-target pills) */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 block">
                        A. Chọn cột tài liệu cần cập nhật (có thể chọn nhiều cột cùng lúc):
                      </label>
                      <div className="flex flex-wrap sm:flex-nowrap gap-1.5">
                        {[
                          { key: 'ncc_file1', label: 'Chứng chỉ QT (CO/CQ)' },
                          { key: 'ncc_giando', label: 'Giản đồ nhiệt' },
                          { key: 'ncc_thongtinkhac1', label: 'File PO / Đơn hàng' },
                          { key: 'ncc_thongtinkhac2', label: 'Báo giá NCC' },
                        ].map((col) => {
                          const selected = targetDocColumns.has(col.key);
                          return (
                            <button
                              key={col.key}
                              type="button"
                              onClick={() => toggleDocColumn(col.key)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${selected
                                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                                }`}
                            >
                              <span>{selected ? '☑' : '☐'}</span>
                              <span>{col.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Step B: Phương thức phân bổ & Step C: Chế độ ghi */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="text-[10.5px] font-bold uppercase text-slate-500">B. Phương thức phân bổ tệp</div>
                        <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-0.5 rounded-md text-[11px]">
                          <button
                            type="button"
                            onClick={() => setAssignmentStrategy('shared')}
                            className={`py-1 px-2 rounded font-semibold transition cursor-pointer ${assignmentStrategy === 'shared' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                              }`}
                          >
                            Đồng bộ ({activeLotIds.size} lô)
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssignmentStrategy('smart')}
                            className={`py-1 px-2 rounded font-semibold transition cursor-pointer ${assignmentStrategy === 'smart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                              }`}
                          >
                            Tự khớp Mã hàng
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {assignmentStrategy === 'shared'
                            ? 'Gắn cùng 1 bộ tệp/link cho toàn bộ các lô được chọn.'
                            : 'Đọc tên file (VD: 9690-C17_QT.pdf) để gắn tự động vào đúng lô.'}
                        </p>
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                        <div className="text-[10.5px] font-bold uppercase text-slate-500">C. Chế độ ghi dữ liệu</div>
                        <div className="grid grid-cols-2 gap-1 bg-slate-200/70 p-0.5 rounded-md text-[11px]">
                          <button
                            type="button"
                            onClick={() => setWritePolicy('append')}
                            className={`py-1 px-2 rounded font-semibold transition cursor-pointer ${writePolicy === 'append' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                              }`}
                          >
                            Cộng nối (Append)
                          </button>
                          <button
                            type="button"
                            onClick={() => setWritePolicy('replace')}
                            className={`py-1 px-2 rounded font-semibold transition cursor-pointer ${writePolicy === 'replace' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                              }`}
                          >
                            Ghi đè (Replace)
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                          {writePolicy === 'append'
                            ? 'An toàn: Giữ nguyên tệp cũ và cộng nối thêm tệp mới vào danh sách.'
                            : 'Cảnh báo: Xóa danh sách tệp cũ ở cột đã chọn và thay hoàn toàn bằng tệp mới.'}
                        </p>
                      </div>
                    </div>

                    {/* Step D: Unified Dropzone To Rộng Thoáng */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragOver(true);
                      }}
                      onDragLeave={() => setIsDragOver(false)}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-4 text-center transition cursor-pointer ${isDragOver
                          ? 'border-slate-900 bg-slate-100'
                          : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-800'
                        }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) Array.from(e.target.files).forEach(handleProcessFile);
                        }}
                      />
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-800">
                        <span className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                          ↑
                        </span>
                        <span>Kéo thả nhiều tệp vào đây, hoặc <span className="underline">chọn tệp từ máy tính</span></span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Hỗ trợ PDF, Ảnh, Excel (Khuyến nghị &lt;50KB hoặc dán nhiều Link Google Drive / OneDrive bên dưới)
                      </p>
                    </div>

                    {/* Multi-URL Cloud Paste Bar */}
                    <form onSubmit={handleAddMultiUrls} className="flex flex-col sm:flex-row gap-2">
                      <label htmlFor={urlInputId} className="sr-only">URL tài liệu</label>
                      <input
                        id={urlInputId}
                        type="text"
                        placeholder="Hoặc dán Link URL (Google Drive / OneDrive / Cloud)..."
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                      />
                      <button
                        type="submit"
                        disabled={!urlInput.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap transition cursor-pointer disabled:opacity-40"
                      >
                        + Thêm Link
                      </button>
                    </form>

                    {/* Quick Simulation Buttons */}
                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600 whitespace-nowrap">
                        DANH SÁCH TỆP CHỜ GẮN ({stagedFiles.length + stagedUrls.length})
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setAssignmentStrategy('smart');
                            const dummyUrls: AttachmentItem[] = [
                              { id: 'sim-1', name: '9690-C17_ChungChiNhietLuyen.pdf', url: 'https://drive.google.com/file/d/9690-C17', type: 'pdf', size: '34 KB', uploadedAt: new Date().toISOString(), source: 'gdrive' },
                              { id: 'sim-2', name: '2439-P2_ChungChiNhietLuyen.pdf', url: 'https://drive.google.com/file/d/2439-P2', type: 'pdf', size: '31 KB', uploadedAt: new Date().toISOString(), source: 'gdrive' },
                              { id: 'sim-3', name: '9967-G4_ChungChiNhietLuyen.pdf', url: 'https://drive.google.com/file/d/9967-G4', type: 'pdf', size: '45 KB', uploadedAt: new Date().toISOString(), source: 'gdrive' },
                              { id: 'sim-4', name: '1414-J39_ChungChiNhietLuyen.pdf', url: 'https://drive.google.com/file/d/1414-J39', type: 'pdf', size: '29 KB', uploadedAt: new Date().toISOString(), source: 'gdrive' },
                              { id: 'sim-5', name: '9764-V1_ChungChiNhietLuyen.pdf', url: 'https://drive.google.com/file/d/9764-V1', type: 'pdf', size: '38 KB', uploadedAt: new Date().toISOString(), source: 'gdrive' }
                            ];
                            setStagedUrls(dummyUrls);
                            playAudioCue('success');
                            toast.success('Đã tải 5 file mẫu khớp Mã hàng theo chuẩn prototype!');
                          }}
                          className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 text-[10.5px] font-semibold whitespace-nowrap cursor-pointer"
                        >
                          ⚡ Thử kéo thả 5 file theo Mã hàng
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignmentStrategy('shared');
                            const sharedUrls: AttachmentItem[] = [
                              { id: 'sh-1', name: 'Chung_Chi_Nhiet_Luyen_Yamaichi_Me08.pdf', url: 'https://drive.google.com/file/d/1A2B3C_Yamaichi_BatchCert/view', type: 'pdf', size: '44 KB', uploadedAt: new Date().toISOString(), source: 'gdrive' },
                              { id: 'sh-2', name: 'drive.google.com/folder/Lo-2810-Pin-DAC', url: 'https://drive.google.com/drive/folders/Lo-2810-Pin-DAC', type: 'link', size: 'Google Drive', uploadedAt: new Date().toISOString(), source: 'gdrive' }
                            ];
                            setStagedUrls(sharedUrls);
                            playAudioCue('success');
                            toast.success('Đã chuyển sang bộ tệp dùng chung cho toàn bộ lô!');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 text-[10.5px] font-medium whitespace-nowrap cursor-pointer"
                        >
                          ⚡ Thử bộ file dùng chung
                        </button>
                      </div>
                    </div>

                    {/* Staged file list */}
                    {(stagedFiles.length > 0 || stagedUrls.length > 0) && (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {stagedFiles.map((f, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white transition">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm">📄</span>
                              <span className="text-xs font-semibold text-slate-900 truncate">{f.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setStagedFiles(stagedFiles.filter((_, idx) => idx !== i))}
                              className="text-slate-400 hover:text-rose-600 text-xs px-1 cursor-pointer"
                            >
                              🗑
                            </button>
                          </div>
                        ))}
                        {stagedUrls.map((u, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-white transition">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-sm">🔗</span>
                              <div className="min-w-0">
                                <span className="text-xs font-semibold text-slate-900 truncate block">{u.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">[{u.source}] {u.size || 'Link Cloud'}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <a href={u.url} target="_blank" rel="noreferrer" className="p-1 text-slate-400 hover:text-slate-900 text-xs">↗</a>
                              <button
                                type="button"
                                onClick={() => setStagedUrls(stagedUrls.filter((_, idx) => idx !== i))}
                                className="text-slate-400 hover:text-rose-600 text-xs px-1 cursor-pointer"
                              >
                                🗑
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Standard Dynamic Editors */}
              {Array.from(selectedFieldKeys)
                .filter(k => k !== 'ncc_file1' && k !== 'ncc_giando' && k !== 'doc_po' && k !== 'doc_quote')
                .map((key) => {
                  const def = BATCH_FIELDS_CONFIG.find((f) => f.key === key);
                  if (!def) return null;
                  const currentDistribution = calculateFieldDistribution(items, key as keyof QTItem);

                  return (
                    <div
                      key={key}
                      className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-sm space-y-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0"></span>
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-900 whitespace-nowrap">{def.label}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[11px] text-slate-500 truncate max-w-[360px]" title={`Hiện tại: ${currentDistribution}`}>
                            Hiện tại: <strong className="text-slate-700">{currentDistribution}</strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleField(key)}
                            className="text-slate-400 hover:text-rose-600 text-xs px-1 cursor-pointer shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {def.type === 'select' ? (
                        <select
                          value={fieldValues[key] || ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-900 font-medium text-slate-900"
                        >
                          <option value="">-- Chọn giá trị cập nhật đồng bộ --</option>
                          {def.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt || '(Trống)'}
                            </option>
                          ))}
                        </select>
                      ) : def.type === 'date' ? (
                        <input
                          type="date"
                          value={fieldValues[key] || ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-900 font-medium text-slate-900"
                        />
                      ) : (
                        <input
                          type={def.type === 'number' ? 'number' : 'text'}
                          placeholder={`Nhập ${def.label}...`}
                          value={fieldValues[key] ?? ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({
                              ...prev,
                              [key]: def.type === 'number' ? Number(e.target.value) : e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-slate-900 font-medium text-slate-900"
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* CỘT PHẢI (5/12 ~ 42%): DANH SÁCH LÔ ÁP DỤNG & LIVE DIFF PREVIEW (KHÔNG AUDIT TRAIL) */}
          <div className="lg:col-span-5 flex flex-col min-h-0 bg-slate-50/50">
            <div className="p-4 border-b border-slate-200 bg-white space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 whitespace-nowrap">
                    2. Danh sách lô áp dụng & Xem trước (Live Diff)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 whitespace-nowrap">
                    Có thể bỏ tích từng lô ngoại lệ ngay bên dưới trước khi xác nhận
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-slate-900 text-white font-mono text-[11px] font-semibold whitespace-nowrap shrink-0">
                  {activeLotIds.size} / {items.length} lô
                </span>
              </div>

              {/* Filter & Search inside lots */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Lọc mã hàng, mã đơn trong danh sách..."
                    value={lotSearch}
                    onChange={(e) => setLotSearch(e.target.value)}
                    className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveLotIds(new Set(items.map((i) => i.ID_Key)))}
                    className="px-2 py-1 rounded bg-white text-slate-900 font-semibold border border-slate-200 text-[11px] shadow-xs cursor-pointer hover:bg-slate-50"
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLotIds(new Set())}
                    className="px-2 py-1 rounded text-slate-600 hover:text-slate-900 border border-slate-200 text-[11px] cursor-pointer hover:bg-slate-50"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>
            </div>

            {/* Full-height Scrollable Lot List with Real-time Diff Badges */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {items
                .filter((item) => {
                  if (!lotSearch.trim()) return true;
                  const q = lotSearch.toLowerCase();
                  return (
                    item.ma_hang?.toLowerCase().includes(q) ||
                    item.so_dat_hang?.toLowerCase().includes(q) ||
                    item.ID_Key?.toLowerCase().includes(q)
                  );
                })
                .map((lot) => {
                  const isChecked = activeLotIds.has(lot.ID_Key);
                  const patch = candidatePatchMap.get(lot.ID_Key) || {};
                  const diffs = computeLotDiff(lot, patch);

                  return (
                    <div
                      key={lot.ID_Key}
                      className={`p-2.5 rounded-lg border transition ${isChecked
                          ? 'bg-white border-slate-200 shadow-sm'
                          : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(activeLotIds);
                              if (e.target.checked) next.add(lot.ID_Key);
                              else next.delete(lot.ID_Key);
                              setActiveLotIds(next);
                            }}
                            className="w-3.5 h-3.5 accent-slate-900 rounded cursor-pointer shrink-0"
                          />
                          <span className="font-mono text-[11px] font-bold text-slate-800">{lot.ID_Key}</span>
                          <span className="font-bold text-xs text-slate-900">{lot.ma_hang}</span>
                          {lot.phong_sx && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">{lot.phong_sx}</span>
                          )}
                        </label>
                        <span className="text-[10.5px] font-medium text-slate-500 shrink-0">{lot.TrangThai || '—'}</span>
                      </div>

                      {/* Live Diff Badges */}
                      {isChecked && (
                        <div className="mt-1.5 pl-5 flex flex-wrap gap-1">
                          {diffs.length > 0 ? (
                            diffs.map((d, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[10px]"
                              >
                                <span className="text-slate-500">{d.label}:</span>
                                <span className="line-through text-slate-400">{d.from}</span>
                                <span>→</span>
                                <strong className="text-slate-900">{d.to}</strong>
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">
                              — Chưa có thông số thay đổi
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* 3. Modal Sticky Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>
              Đang chọn cập nhật <strong className="text-slate-900">{selectedFieldKeys.size} thông số/tài liệu</strong> đồng bộ cho <strong className="text-slate-900">{activeLotIds.size} lô</strong> (Không yêu cầu Audit Trail).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={activeLotIds.size === 0 || totalModificationsCount === 0}
              onClick={handleConfirmSubmit}
              className="px-5 py-2 rounded-lg bg-[#111827] hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              <span>Xác nhận ({candidatePatchMap.size} lô)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
