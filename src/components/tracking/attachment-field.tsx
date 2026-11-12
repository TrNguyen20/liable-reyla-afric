import React, { useState, useRef, useId } from 'react';
import {
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileCode,
  Link as LinkIcon,
  Plus,
  Eye,
  Download,
  Trash2,
  Upload,
  Copy,
  Check,
  ExternalLink,
  Cloud,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';

export type AttachmentType = 'pdf' | 'image' | 'excel' | 'doc' | 'link';
export type CloudSource = 'gdrive' | 'onedrive' | 'sharepoint' | 'generic';

export interface AttachmentItem {
  id: string;
  name: string;
  url: string;
  type: AttachmentType;
  source?: CloudSource;
  size?: string;
  uploadedAt?: string;
  note?: string;
}

/** Detects cloud providers accurately from URL domains */
export function detectCloudSource(url: string): CloudSource {
  if (!url || typeof url !== 'string') return 'generic';
  const lower = url.toLowerCase();
  if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
    return 'gdrive';
  }
  if (lower.includes('onedrive.live.com') || lower.includes('1drv.ms')) {
    return 'onedrive';
  }
  if (lower.includes('sharepoint.com')) {
    return 'sharepoint';
  }
  return 'generic';
}

/** Inferred file type based on file extension, data URI header, or URL */
export function inferFileType(url: string, name?: string): AttachmentType {
  const target = (name || url || '').toLowerCase();
  if (url.startsWith('data:image/') || /\.(png|jpe?g|gif|webp|svg|bmp)(\?.*)?$/i.test(target)) {
    return 'image';
  }
  if (url.startsWith('data:application/pdf') || /\.pdf(\?.*)?$/i.test(target)) {
    return 'pdf';
  }
  if (/\.(xlsx?|csv|tsv)(\?.*)?$/i.test(target)) {
    return 'excel';
  }
  if (/\.(docx?|odt|rtf|txt)(\?.*)?$/i.test(target)) {
    return 'doc';
  }
  return 'link';
}

/** Extracts a clean display name from URL or Data URI */
export function extractFileName(url: string, defaultPrefix = 'tệp_đính_kèm'): string {
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:([^;]+);/);
    const ext = mimeMatch?.[1]?.split('/')[1] || 'bin';
    return `${defaultPrefix}_${Date.now().toString().slice(-4)}.${ext}`;
  }
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.length > 2) {
      return decodeURIComponent(last);
    }
    return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch {
    const rawName = url.split('/').pop()?.split('?')[0];
    return rawName || `${defaultPrefix}.link`;
  }
}

/** Truncates a string in the middle while strictly preserving file extension */
export function middleTruncate(name: string, maxLength = 26): string {
  if (!name || name.length <= maxLength) return name;
  const lastDot = name.lastIndexOf('.');
  if (lastDot > 0 && lastDot > name.length - 8) {
    const ext = name.slice(lastDot);
    const base = name.slice(0, lastDot);
    const keepChars = maxLength - ext.length - 3;
    if (keepChars > 4) {
      const front = Math.ceil(keepChars * 0.6);
      const back = Math.floor(keepChars * 0.4);
      return `${base.slice(0, front)}…${base.slice(-back)}${ext}`;
    }
  }
  const front = Math.ceil((maxLength - 3) / 2);
  const back = Math.floor((maxLength - 3) / 2);
  return `${name.slice(0, front)}…${name.slice(-back)}`;
}

/** Parses raw cell string (single URL, comma/newline separated, or JSON array) */
export function parseAttachments(raw: string | null | undefined): AttachmentItem[] {
  if (!raw || !raw.trim()) return [];
  const trimmed = raw.trim();

  // 1. JSON Array format
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item) => item && typeof item === 'object' && item.url)
          .map((item, idx) => ({
            id: String(item.id || `att-${idx}-${Date.now()}`),
            name: String(item.name || extractFileName(item.url)),
            url: String(item.url),
            type: item.type || inferFileType(item.url, item.name),
            source: item.source || detectCloudSource(item.url),
            size: item.size || undefined,
            uploadedAt: item.uploadedAt || undefined,
            note: item.note || undefined,
          }));
      }
    } catch {
      // Fallback to plain string parser below
    }
  }

  // 2. Newline or comma/semicolon delimited URLs
  const lines = trimmed
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((url, idx) => ({
      id: `att-${idx}-${idx * 17}`,
      name: extractFileName(url),
      url,
      type: inferFileType(url),
      source: detectCloudSource(url),
    }));
  }

  // 3. Single URL or Data URI
  return [
    {
      id: 'att-single-1',
      name: extractFileName(trimmed),
      url: trimmed,
      type: inferFileType(trimmed),
      source: detectCloudSource(trimmed),
    },
  ];
}

/** Parses multi-line or comma separated URLs into structured AttachmentItems */
export function parseMultiUrls(rawText: string, defaultPrefix = 'Liên kết'): AttachmentItem[] {
  if (!rawText || !rawText.trim()) return [];
  const lines = rawText
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const validUrls: AttachmentItem[] = [];
  for (let i = 0; i < lines.length; i++) {
    const candidate = lines[i];
    if (!candidate) continue;
    try {
      new URL(candidate);
      const cloud = detectCloudSource(candidate);
      const name = extractFileName(candidate, defaultPrefix);
      validUrls.push({
        id: `url-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        url: candidate,
        type: inferFileType(candidate),
        source: cloud,
        size:
          cloud === 'gdrive'
            ? 'Google Drive'
            : cloud === 'onedrive'
            ? 'OneDrive'
            : cloud === 'sharepoint'
            ? 'SharePoint'
            : 'Liên kết ngoài',
        uploadedAt: new Date().toISOString(),
      });
    } catch {
      // Skip invalid URLs
    }
  }
  return validUrls;
}

/** Matches file name to lot code or part drawing code */
export function smartMatchFileToLot(
  fileName: string,
  lotCode?: string,
  partCode?: string
): boolean {
  if (!fileName) return false;
  const cleanStr = (s: string) =>
    s
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '') // remove extension
      .replace(/[^a-z0-9]/gi, ''); // remove non-alphanumeric

  const cleanFile = cleanStr(fileName);
  if (!cleanFile) return false;

  if (lotCode) {
    const cleanLot = cleanStr(lotCode);
    if (cleanLot && (cleanFile.includes(cleanLot) || cleanLot.includes(cleanFile))) {
      return true;
    }
  }

  if (partCode) {
    const cleanPart = cleanStr(partCode);
    if (cleanPart && (cleanFile.includes(cleanPart) || cleanPart.includes(cleanFile))) {
      return true;
    }
  }

  return false;
}

/** Compresses image via HTML5 Canvas under maxSizeBytes (< 45KB) */
export async function compressImageFile(file: File, maxSizeBytes = 46080): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.FileReader) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let quality = 0.85;
        let maxDim = 1000;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let result = canvas.toDataURL('image/jpeg', quality);
        while (result.length > maxSizeBytes && quality > 0.35) {
          quality -= 0.15;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Serializes AttachmentItems back into storage string for Google Sheets */
export function serializeAttachments(items: AttachmentItem[]): string {
  if (!items || items.length === 0) return '';
  const first = items[0];
  if (items.length === 1 && first) {
    // Single item: plain URL for maximum compatibility with Google Sheets formulas & AppSheet
    return first.url;
  }
  return JSON.stringify(items);
}

// Format badge styles based on file type or cloud source
export function renderFileTypeBadge(type: AttachmentType, source?: CloudSource) {
  if (source === 'gdrive') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-xs border border-emerald-500/40 bg-emerald-500/15 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
        DRIVE
      </span>
    );
  }
  if (source === 'onedrive' || source === 'sharepoint') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-xs border border-sky-500/40 bg-sky-500/15 px-1 py-0.2 font-mono text-[9px] font-bold text-sky-600 dark:text-sky-400 shrink-0">
        CLOUD
      </span>
    );
  }

  switch (type) {
    case 'pdf':
      return (
        <span className="inline-flex items-center gap-0.5 rounded-xs border border-red-500/40 bg-red-500/15 px-1 py-0.2 font-mono text-[9px] font-bold text-red-600 dark:text-red-400 shrink-0">
          PDF
        </span>
      );
    case 'excel':
      return (
        <span className="inline-flex items-center gap-0.5 rounded-xs border border-emerald-500/40 bg-emerald-500/15 px-1 py-0.2 font-mono text-[9px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
          XLS
        </span>
      );
    case 'image':
      return (
        <span className="inline-flex items-center gap-0.5 rounded-xs border border-purple-500/40 bg-purple-500/15 px-1 py-0.2 font-mono text-[9px] font-bold text-purple-600 dark:text-purple-400 shrink-0">
          IMG
        </span>
      );
    case 'doc':
      return (
        <span className="inline-flex items-center gap-0.5 rounded-xs border border-blue-500/40 bg-blue-500/15 px-1 py-0.2 font-mono text-[9px] font-bold text-blue-600 dark:text-blue-400 shrink-0">
          DOC
        </span>
      );
    case 'link':
    default:
      return (
        <span className="inline-flex items-center gap-0.5 rounded-xs border border-border bg-muted/80 px-1 py-0.2 font-mono text-[9px] font-medium text-foreground shrink-0">
          URL
        </span>
      );
  }
}

export function renderFileIcon(type: AttachmentType, source?: CloudSource) {
  if (source === 'gdrive' || source === 'onedrive' || source === 'sharepoint') {
    return <Cloud size={16} className="text-sky-500 shrink-0" />;
  }
  switch (type) {
    case 'pdf':
      return <FileText size={16} className="text-red-500 shrink-0" />;
    case 'excel':
      return <FileSpreadsheet size={16} className="text-emerald-500 shrink-0" />;
    case 'image':
      return <ImageIcon size={16} className="text-purple-500 shrink-0" />;
    case 'doc':
      return <FileCode size={16} className="text-blue-500 shrink-0" />;
    case 'link':
    default:
      return <LinkIcon size={16} className="text-primary shrink-0" />;
  }
}

// -------------------------------------------------------------
// Component 1: AttachmentCell (Grid Cell for Table Row)
// -------------------------------------------------------------
export interface AttachmentCellProps {
  value: string | undefined;
  onChange?: (newVal: string) => void;
  title: string;
  lotCode?: string;
  workshop?: string;
  material?: string;
  canEdit?: boolean;
  field: 'ncc_giando' | 'ncc_file1' | string;
}

export const AttachmentCell: React.FC<AttachmentCellProps> = ({
  value,
  onChange,
  title,
  lotCode = '',
  workshop,
  material,
  canEdit = true,
  field,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const items = parseAttachments(value);

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDialogOpen(true);
  };

  const handleSave = (updated: AttachmentItem[]) => {
    const serialized = serializeAttachments(updated);
    if (onChange) {
      onChange(serialized);
    }
  };

  return (
    <>
      <div
        onClick={handleOpenDialog}
        className="group/cell flex h-6 max-w-full items-center justify-between gap-1 overflow-hidden cursor-pointer select-none"
        title={
          items.length > 0
            ? `${title} (${items.length} tệp) - Click để xem chi tiết`
            : `${title} - Click để thêm tệp/link`
        }
      >
        {items.length === 0 ? (
          <div className="flex w-full items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground/40">—</span>
            {canEdit && (
              <span
                className="opacity-0 group-hover/cell:opacity-100 hover:!opacity-100 p-0.5 rounded-xs text-muted-foreground hover:text-primary hover:bg-secondary transition-all"
                title="Thêm tệp hoặc chèn link"
              >
                <Plus size={11} />
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 overflow-hidden">
            {items.slice(0, 2).map((item) => (
              <React.Fragment key={item.id}>
                {item.type === 'image' && item.url.startsWith('data:') ? (
                  <img
                    src={item.url}
                    alt={item.name}
                    className="size-4.5 rounded-xs object-cover border border-border shrink-0"
                  />
                ) : (
                  renderFileTypeBadge(item.type, item.source)
                )}
              </React.Fragment>
            ))}
            {items.length > 2 && (
              <span className="rounded-xs border border-border bg-muted/80 px-1 py-0.2 font-mono text-[9px] font-bold text-muted-foreground shrink-0">
                +{items.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {isDialogOpen && (
        <AttachmentDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title={title}
          lotCode={lotCode}
          workshop={workshop}
          material={material}
          items={items}
          onSave={handleSave}
          canEdit={canEdit}
          field={field}
        />
      )}
    </>
  );
};

// -------------------------------------------------------------
// Component 2: AttachmentDialog / DocumentManagerModal
// -------------------------------------------------------------
export interface AttachmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  lotCode?: string;
  workshop?: string | undefined;
  material?: string | undefined;
  items: AttachmentItem[];
  onSave: (items: AttachmentItem[]) => void;
  canEdit?: boolean;
  field: string;
}

export const AttachmentDialog: React.FC<AttachmentDialogProps> = ({
  isOpen,
  onClose,
  title,
  lotCode,
  workshop,
  material,
  items: initialItems,
  onSave,
  canEdit = true,
}) => {
  const [fileList, setFileList] = useState<AttachmentItem[]>(initialItems);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlNote, setUrlNote] = useState('');
  const [previewFile, setPreviewFile] = useState<AttachmentItem | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const confirmTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlInputId = useId();

  // Process a local file: Canvas compress for image, 50KB check for PDF/Excel
  const handleProcessFile = async (file: File) => {
    if (file.type.startsWith('image/')) {
      toast.info(`Đang tối ưu ảnh ${file.name}...`);
      try {
        const compressed = await compressImageFile(file);
        const newItem: AttachmentItem = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url: compressed,
          type: 'image',
          source: 'generic',
          size: `${Math.ceil(compressed.length / 1370)} KB (Ảnh đã nén)`,
          uploadedAt: new Date().toISOString(),
        };
        const updated = [...fileList, newItem];
        setFileList(updated);
        onSave(updated);
        playAudioCue('success');
        toast.success(`Đã thêm ảnh: ${file.name}`);
      } catch {
        toast.error('Không thể xử lý hình ảnh này');
      }
      return;
    }

    if (file.size > 51200) {
      playAudioCue('beep');
      toast.error(
        `Tệp ${file.name} vượt quá 50KB (${Math.ceil(file.size / 1024)}KB). Để bảo vệ dữ liệu Google Sheets, vui lòng tải tệp lên Google Drive/OneDrive và dán liên kết vào ô bên dưới.`
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const newItem: AttachmentItem = {
          id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          url: reader.result,
          type: inferFileType(reader.result, file.name),
          source: 'generic',
          size: `${Math.ceil(file.size / 1024)} KB`,
          uploadedAt: new Date().toISOString(),
        };
        const updated = [...fileList, newItem];
        setFileList(updated);
        onSave(updated);
        playAudioCue('success');
        toast.success(`Đã thêm tệp: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!canEdit) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      Array.from(e.dataTransfer.files).forEach(handleProcessFile);
    }
  };

  const handleAddUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = pastedUrl.trim();
    if (!raw) return;

    const parsedItems = parseMultiUrls(raw, urlNote.trim() || 'Tài liệu');
    if (parsedItems.length === 0) {
      toast.error('Vui lòng nhập đường dẫn URL hợp lệ (bắt đầu bằng http:// hoặc https://)');
      return;
    }

    const updated = [...fileList, ...parsedItems];
    setFileList(updated);
    onSave(updated);
    setPastedUrl('');
    setUrlNote('');
    playAudioCue('success');
    toast.success(`Đã thêm ${parsedItems.length} liên kết tài liệu`);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit) return;

    if (confirmDeleteId === id) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmDeleteId(null);
      const updated = fileList.filter((f) => f.id !== id);
      setFileList(updated);
      onSave(updated);
      playAudioCue('beep');
      toast.info('Đã xóa tệp đính kèm');
    } else {
      setConfirmDeleteId(id);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => {
        setConfirmDeleteId(null);
      }, 3000);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg w-full rounded-xs border border-border bg-card p-5 font-sans shadow-xl text-foreground">
          {/* Header */}
          <DialogTitle className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black uppercase tracking-wider text-foreground">
                  {title}
                </span>
                {workshop && (
                  <span className="px-1.5 py-0.2 rounded-xs border border-primary/30 bg-primary/10 font-mono text-[10px] font-bold text-primary">
                    {workshop}
                  </span>
                )}
                {material && (
                  <span className="px-1.5 py-0.2 rounded-xs border border-border bg-muted/70 font-mono text-[10px] text-muted-foreground">
                    {material}
                  </span>
                )}
              </div>
              {lotCode && (
                <span className="font-mono text-[11px] text-muted-foreground block mt-1">
                  Mã Lô: <b className="text-primary">{lotCode}</b>
                </span>
              )}
            </div>
          </DialogTitle>

          {/* Dropzone & Multi-URL Input (Chỉ khi có quyền canEdit) */}
          {canEdit && (
            <div className="mt-3 space-y-2.5">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-4 rounded-xs border-2 border-dashed transition-all duration-200 cursor-pointer ${
                  isDragOver
                    ? 'border-primary bg-primary/10 scale-[1.01]'
                    : 'border-border/80 hover:border-primary/50 bg-secondary/15 hover:bg-secondary/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      Array.from(e.target.files).forEach(handleProcessFile);
                    }
                  }}
                />
                <Upload size={18} className="text-primary/70 mb-1" />
                <p className="text-xs font-medium text-foreground">
                  Kéo thả tệp vào đây, hoặc <span className="text-primary font-bold hover:underline">chọn từ máy tính</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Hỗ trợ PDF, Ảnh, Excel (Ảnh tự nén &lt;45KB, PDF khuyến nghị &lt;50KB hoặc dán link Cloud)
                </p>
              </div>

              {/* Paste Multi-URL Input bar */}
              <form onSubmit={handleAddUrl} className="space-y-1.5 rounded-xs border border-border/70 p-2 bg-muted/20">
                <div className="flex gap-1.5 items-center">
                  <label htmlFor={urlInputId} className="sr-only">Đường link tài liệu</label>
                  <input
                    id={urlInputId}
                    type="text"
                    placeholder="Dán link Cloud (Google Drive / OneDrive, hỗ trợ nhiều link cách bởi dấu phẩy/xuống dòng)..."
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                    className="flex-1 h-7 rounded-xs border border-border bg-background px-2 text-xs font-mono placeholder:text-muted-foreground/60 outline-none focus:border-primary"
                  />
                  <button
                    type="submit"
                    disabled={!pastedUrl.trim()}
                    className="h-7 px-3 rounded-xs border border-border bg-secondary hover:bg-secondary/80 font-mono text-xs font-bold text-foreground transition-colors disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    Thêm Link
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Tên hiển thị / Ghi chú ngắn (tùy chọn, VD: Chứng chỉ lò mẻ 01)..."
                    value={urlNote}
                    onChange={(e) => setUrlNote(e.target.value)}
                    className="flex-1 h-6 rounded-xs border border-border/70 bg-background/80 px-2 text-[11px] font-sans placeholder:text-muted-foreground/50 outline-none focus:border-primary"
                  />
                </div>
              </form>
            </div>
          )}

          {/* Danh sách tệp (Vertical File List) */}
          <div className="mt-4">
            <div className="flex items-center justify-between pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider font-mono">
              <span>Danh sách tệp ({fileList.length})</span>
            </div>

            {fileList.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground/60 border border-border/40 rounded-xs bg-muted/20">
                Chưa có tệp đính kèm nào
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {fileList.map((file) => (
                  <div
                    key={file.id}
                    className="group/row flex h-11 items-center justify-between p-2 rounded-xs border border-border/70 bg-card hover:bg-secondary/40 transition-colors duration-150"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 pr-2">
                      {renderFileIcon(file.type, file.source)}
                      <div className="overflow-hidden flex-1 min-w-0">
                        <p className="text-xs font-mono font-medium text-foreground truncate" title={file.name}>
                          {middleTruncate(file.name, 28)}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground/70">
                          {file.size && <span>{file.size}</span>}
                          {file.source && file.source !== 'generic' && (
                            <span className="uppercase text-primary/80 font-bold">[{file.source}]</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Cụm nút tác vụ (Xem trước, Sao chép, Mở link, Thùng rác) */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="p-1 rounded-xs hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Xem trước tệp"
                      >
                        <Eye size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(file.url);
                          playAudioCue('pop');
                          toast.success('Đã sao chép liên kết vào bộ nhớ tạm');
                        }}
                        className="p-1 rounded-xs hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Sao chép liên kết"
                      >
                        <Copy size={13} />
                      </button>

                      <a
                        href={file.url}
                        download={file.name}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded-xs hover:bg-secondary text-muted-foreground hover:text-primary transition-colors cursor-pointer inline-flex items-center"
                        title="Mở tab mới hoặc tải về"
                      >
                        {file.url.startsWith('data:') ? <Download size={13} /> : <ExternalLink size={13} />}
                      </a>

                      {canEdit && (
                        <>
                          {confirmDeleteId === file.id ? (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(file.id, e)}
                              className="px-1.5 py-0.5 rounded-xs bg-destructive text-destructive-foreground font-mono text-[10px] font-bold animate-in fade-in cursor-pointer shrink-0"
                              title="Bấm lần nữa để xác nhận xóa"
                            >
                              Bấm lần nữa để xóa
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteClick(file.id, e)}
                              className="opacity-0 group-hover/row:opacity-100 hover:!opacity-100 p-1 rounded-xs hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                              title="Xóa tệp này (Bấm 2 lần)"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
            <span className="font-mono text-xs text-muted-foreground">
              Đang lưu {fileList.length} tệp đính kèm
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="h-7 px-3 rounded-xs border border-border bg-secondary hover:bg-secondary/80 font-mono text-xs font-semibold text-foreground transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  onSave(fileList);
                  playAudioCue('success');
                  toast.success('Đã lưu thay đổi tệp đính kèm');
                  onClose();
                }}
                className="h-7 px-4 rounded-xs bg-primary hover:bg-primary/90 font-mono text-xs font-bold text-primary-foreground transition-colors cursor-pointer inline-flex items-center gap-1 shadow-xs"
              >
                <Check size={12} />
                Lưu thay đổi
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox / Preview Sub-dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
          <DialogContent className="max-w-2xl w-full rounded-xs border border-border bg-card p-4 shadow-lg font-sans">
            <DialogTitle className="flex items-center justify-between border-b border-border pb-2 font-mono text-xs font-bold">
              <span className="truncate pr-2">{previewFile.name}</span>
              <a
                href={previewFile.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline font-mono text-xs shrink-0 flex items-center gap-1"
              >
                Mở tab mới <ExternalLink size={11} />
              </a>
            </DialogTitle>
            <div className="mt-3 flex max-h-[70vh] items-center justify-center overflow-auto rounded-xs bg-muted/30 p-2">
              {previewFile.type === 'image' || previewFile.url.startsWith('data:image/') ? (
                <img src={previewFile.url} alt={previewFile.name} className="max-h-[65vh] object-contain rounded-xs" />
              ) : previewFile.type === 'pdf' || previewFile.url.endsWith('.pdf') ? (
                <iframe src={previewFile.url} title={previewFile.name} className="h-[65vh] w-full border-none rounded-xs" />
              ) : (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <p className="font-bold text-foreground mb-1">Không hỗ trợ xem trực tiếp định dạng này</p>
                  <a href={previewFile.url} target="_blank" rel="noreferrer" className="text-primary underline">
                    Bấm vào đây để mở hoặc tải xuống
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
