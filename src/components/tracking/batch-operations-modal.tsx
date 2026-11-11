import React, { useState, useMemo, useRef, useId } from 'react';
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

  // 3. Phản hồi NCC & QC
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[960px] w-[95vw] max-h-[88vh] rounded-xs border border-border bg-card p-0 shadow-2xl flex flex-col overflow-hidden text-foreground">
        {/* 1. Fixed Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-xs bg-primary/10 text-primary border border-primary/20">
              <PenLine size={16} />
            </span>
            <div>
              <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                THAO TÁC HÀNG LOẠT ({items.length} LÔ)
              </DialogTitle>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Cập nhật đồng bộ cho {items.length} lô đã chọn ({totalPieces} chi tiết • {totalWeight} kg)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`px-2 py-0.5 text-[10px] font-bold ${roleBadge(role as Role)}`}>
              Quyền: {roleLabel(role as Role)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xs p-1 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* 2. Split Body (60% Left - 40% Right) */}
        <div className="grid grid-cols-1 md:grid-cols-12 flex-1 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-border">
          {/* CỘT TRÁI (60%): Field Picker & Dynamic Editors */}
          <div className="md:col-span-7 flex flex-col overflow-y-auto p-4 space-y-4 max-h-[calc(88vh-120px)]">
            {/* Search & Category Tabs */}
            <div className="space-y-2">
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm thông số cần sửa: Độ cứng, Hạn trả, Chứng chỉ..."
                  value={fieldSearch}
                  onChange={(e) => setFieldSearch(e.target.value)}
                  className="w-full h-7 rounded-xs border border-border bg-background pl-8 pr-2 text-xs font-mono placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                />
              </div>

              {/* 5 Category Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {(
                  [
                    { id: 'all', label: 'Tất cả' },
                    { id: 'technical', label: 'Kỹ thuật' },
                    { id: 'commercial', label: 'Thương mại' },
                    { id: 'vendor_qc', label: 'Phản hồi QC' },
                    { id: 'documents', label: 'Tài liệu (Upload)' },
                  ] as { id: BatchCategory; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-2.5 py-1 rounded-xs font-mono text-[11px] whitespace-nowrap transition-colors cursor-pointer border ${
                      activeTab === tab.id
                        ? 'bg-primary text-primary-foreground border-primary font-bold shadow-2xs'
                        : 'bg-secondary/40 text-muted-foreground border-transparent hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Pill Chips */}
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
                Chọn thông số cần chỉnh sửa:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {filteredFields.map((field) => {
                  const isSelected = selectedFieldKeys.has(field.key as string);
                  const isAllowed = isFieldEditableByRole(field.key as string, role);

                  return (
                    <button
                      key={field.key as string}
                      type="button"
                      disabled={!isAllowed}
                      onClick={() => toggleField(field.key as string)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-xs font-mono text-[11px] border transition-all cursor-pointer ${
                        !isAllowed
                          ? 'opacity-40 bg-muted/40 text-muted-foreground border-border cursor-not-allowed'
                          : isSelected
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : 'bg-background text-foreground border-border hover:bg-secondary/70 hover:border-primary/50'
                      }`}
                      title={!isAllowed ? 'Vai trò của bạn không có quyền sửa thông số này' : undefined}
                    >
                      {!isAllowed ? (
                        <Lock size={10} className="shrink-0" />
                      ) : isSelected ? (
                        <Check size={11} className="shrink-0" />
                      ) : (
                        <Plus size={11} className="shrink-0 text-muted-foreground" />
                      )}
                      <span>{field.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Field Editors */}
            {selectedFieldKeys.size > 0 && (
              <div className="space-y-3 pt-2 border-t border-border/80">
                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                  Khung nhập liệu đang mở ({selectedFieldKeys.size}):
                </p>

                {Array.from(selectedFieldKeys).map((key) => {
                  const def = BATCH_FIELDS_CONFIG.find((f) => f.key === key);
                  if (!def) return null;
                  const currentDistribution = calculateFieldDistribution(items, key as keyof QTItem);

                  return (
                    <div
                      key={key}
                      className="rounded-xs border border-border bg-card p-3 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold font-mono text-foreground">{def.label}</span>
                        <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[240px]" title={currentDistribution}>
                          Hiện tại: {currentDistribution}
                        </span>
                      </div>

                      {def.type === 'select' ? (
                        <select
                          value={fieldValues[key] || ''}
                          onChange={(e) =>
                            setFieldValues((prev) => ({ ...prev, [key]: e.target.value }))
                          }
                          className="w-full h-7 rounded-xs border border-border bg-background px-2 text-xs font-mono text-foreground outline-none focus:border-primary"
                        >
                          <option value="">-- Giữ nguyên hoặc chọn giá trị mới --</option>
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
                          className="w-full h-7 rounded-xs border border-border bg-background px-2 text-xs font-mono text-foreground outline-none focus:border-primary"
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
                          className="w-full h-7 rounded-xs border border-border bg-background px-2 text-xs font-mono text-foreground outline-none focus:border-primary"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Special: Batch Document Upload Card */}
            {(activeTab === 'documents' ||
              selectedFieldKeys.has('ncc_file1') ||
              selectedFieldKeys.has('ncc_giando') ||
              selectedFieldKeys.has('doc_po') ||
              selectedFieldKeys.has('doc_quote')) && (
              <div className="rounded-xs border-2 border-primary/40 bg-secondary/15 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/80 pb-2">
                  <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Upload size={14} className="text-primary" />
                    TẢI LÊN TÀI LIỆU HÀNG LOẠT
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Kéo thả nhiều file hoặc dán link Cloud
                  </span>
                </div>

                {/* 1. Chọn cột tài liệu đích */}
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold block">
                    1. Cột tài liệu đích:
                  </span>
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    {[
                      { key: 'ncc_file1', label: 'Chứng chỉ QT (ncc_file1)' },
                      { key: 'ncc_giando', label: 'Giản đồ nhiệt (ncc_giando)' },
                      { key: 'ncc_thongtinkhac1', label: 'File PO / Đơn hàng' },
                      { key: 'ncc_thongtinkhac2', label: 'Báo giá NCC' },
                    ].map((col) => (
                      <label key={col.key} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={targetDocColumns.has(col.key)}
                          onChange={() => toggleDocColumn(col.key)}
                          className="accent-primary rounded-xs"
                        />
                        <span className="text-xs">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 2. Chiến lược phân bổ tệp */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      2. Phân bổ tệp:
                    </span>
                    <div className="flex rounded-xs border border-border overflow-hidden p-0.5 bg-background">
                      <button
                        type="button"
                        onClick={() => setAssignmentStrategy('shared')}
                        className={`flex-1 py-1 text-center text-[10px] font-bold rounded-xs cursor-pointer ${
                          assignmentStrategy === 'shared' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        Gắn đồng bộ (Shared)
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssignmentStrategy('smart')}
                        className={`flex-1 py-1 text-center text-[10px] font-bold rounded-xs cursor-pointer ${
                          assignmentStrategy === 'smart' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        Smart Match (Mã hàng)
                      </button>
                    </div>
                  </div>

                  {/* 3. Chính sách ghi dữ liệu */}
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block mb-1">
                      3. Chính sách ghi:
                    </span>
                    <div className="flex rounded-xs border border-border overflow-hidden p-0.5 bg-background">
                      <button
                        type="button"
                        onClick={() => setWritePolicy('append')}
                        className={`flex-1 py-1 text-center text-[10px] font-bold rounded-xs cursor-pointer ${
                          writePolicy === 'append' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        Cộng nối (Append)
                      </button>
                      <button
                        type="button"
                        onClick={() => setWritePolicy('replace')}
                        className={`flex-1 py-1 text-center text-[10px] font-bold rounded-xs cursor-pointer ${
                          writePolicy === 'replace' ? 'bg-amber-600 text-white' : 'text-muted-foreground'
                        }`}
                      >
                        Ghi đè (Replace)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-3 rounded-xs border-2 border-dashed transition-all cursor-pointer ${
                    isDragOver
                      ? 'border-primary bg-primary/10'
                      : 'border-border/80 hover:border-primary/50 bg-background/50'
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
                  <Upload size={16} className="text-primary/70 mb-1" />
                  <p className="text-xs font-mono font-medium text-foreground">
                    Kéo thả nhiều file vào đây (PDF &lt;50KB, Ảnh tự nén &lt;45KB)
                  </p>
                </div>

                {/* Multi-URL Input */}
                <form onSubmit={handleAddMultiUrls} className="space-y-1.5">
                  <div className="flex gap-1.5">
                    <label htmlFor={urlInputId} className="sr-only">URL tài liệu</label>
                    <input
                      id={urlInputId}
                      type="text"
                      placeholder="Dán hàng loạt link Google Drive / OneDrive (cách bởi dấu phẩy/xuống dòng)..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1 h-7 rounded-xs border border-border bg-background px-2 text-xs font-mono placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={!urlInput.trim()}
                      className="h-7 px-3 rounded-xs border border-border bg-secondary hover:bg-secondary/80 font-mono text-xs font-bold text-foreground transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                    >
                      Thêm Link
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Ghi chú ngắn (tùy chọn)..."
                    value={urlNote}
                    onChange={(e) => setUrlNote(e.target.value)}
                    className="w-full h-6 rounded-xs border border-border/70 bg-background/70 px-2 text-[11px] font-sans placeholder:text-muted-foreground/50 outline-none focus:border-primary"
                  />
                </form>

                {/* Staged files & Smart Match trigger */}
                {(stagedFiles.length > 0 || stagedUrls.length > 0) && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-bold text-foreground">
                        Tệp chờ tải ({stagedFiles.length + stagedUrls.length})
                      </span>
                      {assignmentStrategy === 'smart' && (
                        <button
                          type="button"
                          onClick={handleSmartMatch}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-xs bg-primary text-primary-foreground text-[10px] font-bold cursor-pointer hover:bg-primary/90"
                        >
                          <Sparkles size={11} />
                          Chạy Smart Match
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {stagedFiles.map((f, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded-xs bg-muted font-mono text-[10px] text-foreground border border-border truncate max-w-[200px]"
                        >
                          {f.name}
                        </span>
                      ))}
                      {stagedUrls.map((u, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 font-mono text-[10px] border border-sky-500/30 truncate max-w-[200px]"
                        >
                          [{u.source}] {u.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CỘT PHẢI (40%): Live Impact Preview & Interactive Lots List */}
          <div className="md:col-span-5 flex flex-col overflow-hidden p-4 space-y-3 bg-muted/10 max-h-[calc(88vh-120px)]">
            {/* Header controls: Search & Quick Selection buttons */}
            <div className="space-y-2 shrink-0">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="font-bold text-foreground">
                  Danh sách lô áp dụng ({activeLotIds.size}/{items.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveLotIds(new Set(items.map((i) => i.ID_Key)))}
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded-xs border border-border bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                  >
                    Tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLotIds(new Set())}
                    className="px-1.5 py-0.5 text-[10px] font-mono rounded-xs border border-border bg-secondary hover:bg-secondary/80 text-foreground cursor-pointer"
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div className="relative">
                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Lọc lô theo mã hàng / đơn hàng..."
                  value={lotSearch}
                  onChange={(e) => setLotSearch(e.target.value)}
                  className="w-full h-6 rounded-xs border border-border bg-background pl-7 pr-2 text-xs font-mono placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Interactive Lots List with Live Diff */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
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
                      className={`p-2.5 rounded-xs border transition-colors ${
                        isChecked
                          ? 'border-border bg-card shadow-2xs'
                          : 'border-border/40 bg-muted/20 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(activeLotIds);
                              if (e.target.checked) next.add(lot.ID_Key);
                              else next.delete(lot.ID_Key);
                              setActiveLotIds(next);
                            }}
                            className="accent-primary rounded-xs shrink-0"
                          />
                          <div className="overflow-hidden flex-1 min-w-0">
                            <span className="font-mono font-bold text-foreground block truncate">
                              {lot.ma_hang || lot.ID_Key}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground block truncate">
                              {lot.so_dat_hang || '—'} • {lot.phong_sx || 'Xưởng'} • {lot.TrangThai || 'Trạng thái'}
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Live Diff Badges */}
                      {isChecked && (
                        <div className="mt-1.5 pt-1.5 border-t border-border/60">
                          {diffs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {diffs.map((d, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-xs bg-primary/10 border border-primary/20 font-mono text-[10px] text-primary"
                                >
                                  <b>{d.label}:</b> {d.from} <ArrowRight size={10} /> {d.to}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground/60 italic">
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

        {/* 3. Sticky Footer */}
        <div className="border-t border-border px-5 py-3 bg-muted/30 flex items-center justify-between shrink-0">
          <div className="font-mono text-xs text-muted-foreground">
            Sẵn sàng cập nhật{' '}
            <b className="text-foreground">{selectedFieldKeys.size}</b> thông số &{' '}
            <b className="text-foreground">{stagedFiles.length + stagedUrls.length}</b> tài liệu cho{' '}
            <b className="text-primary">{candidatePatchMap.size}</b>/{items.length} lô
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3 rounded-xs border border-border bg-secondary hover:bg-secondary/80 font-mono text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              Hủy (Esc)
            </button>
            <button
              type="button"
              disabled={activeLotIds.size === 0 || totalModificationsCount === 0}
              onClick={handleConfirmSubmit}
              className="h-7 px-4 rounded-xs bg-primary hover:bg-primary/90 font-mono text-xs font-bold text-primary-foreground transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5 shadow-xs"
            >
              <Check size={13} />
              Xác nhận cập nhật ({candidatePatchMap.size} lô)
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
