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
  ZoomIn,
  ZoomOut,
  RotateCw,
  RefreshCw,
  PenLine,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';
import { HeatCycleModal, HeatTreatmentCycle } from '@/components/technical-charts';

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

/** Transforms external Cloud URLs (like Google Drive) into embeddable preview URLs */
export function transformToPreviewUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  // Google Drive: https://drive.google.com/file/d/FILE_ID/view... -> /preview
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/file/d/${match[1]}/preview`;
    }
  }
  // Google Docs/Sheets/Slides view -> preview
  if (url.includes('docs.google.com') && url.includes('/edit')) {
    return url.replace(/\/edit.*$/, '/preview');
  }
  return url;
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
    const lower = parsed.hostname.toLowerCase();

    // Thông minh: Nếu là link Google Drive, không lấy tên cụt là 'view' hay 'edit'
    if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) {
      // 0. Nếu defaultPrefix được truyền vào là một mã hàng cụ thể (không phải prefix chung chung như tệp_đính_kèm/Liên kết/Tài liệu)
      const isGenericPrefix = !defaultPrefix || 
        defaultPrefix === 'tệp_đính_kèm' || 
        defaultPrefix === 'Liên kết' || 
        defaultPrefix === 'Tài liệu' ||
        defaultPrefix === 'link';
      if (!isGenericPrefix) {
        let cleanPrefix = defaultPrefix.trim().replace(/\.pdf$/i, '');
        // Tự động bóc tách chỉ giữ lại Mã Hàng nếu prefix là mã gộp dạng P261024427_1072-F33
        if (cleanPrefix.includes('_')) {
          const parts = cleanPrefix.split('_');
          const lastPart = parts[parts.length - 1];
          if (lastPart && lastPart.length >= 2) {
            cleanPrefix = lastPart;
          }
        }
        return `${cleanPrefix}.pdf`;
      }

      // 1. Kiểm tra xem query parameters có mang mã hàng / tên gợi nhớ không
      const itemCodeParam = parsed.searchParams.get('itemCode') || 
                            parsed.searchParams.get('ma_hang') || 
                            parsed.searchParams.get('code') || 
                            parsed.searchParams.get('title') ||
                            parsed.searchParams.get('name');
      if (itemCodeParam && itemCodeParam.trim()) {
        const cleanCode = itemCodeParam.trim().replace(/\.pdf$/i, '');
        return `${cleanCode}_ChungChi.pdf`;
      }

      const match = parsed.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        return `GoogleDrive_${match[1].slice(0, 8)}.pdf`;
      }
      return 'Tài liệu Google Drive';
    }

    // Nếu là OneDrive/SharePoint
    if (lower.includes('1drv.ms') || lower.includes('onedrive') || lower.includes('sharepoint.com')) {
      return 'Tài liệu Cloud OneDrive';
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && last.length > 2 && last !== 'view' && last !== 'preview' && last !== 'edit') {
      return decodeURIComponent(last);
    }
    return parsed.hostname + (parsed.pathname !== '/' ? parsed.pathname : '');
  } catch {
    const rawName = url.split('/').pop()?.split('?')[0];
    if (rawName && rawName !== 'view' && rawName !== 'edit') {
      return rawName;
    }
    return `${defaultPrefix}.link`;
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
export function parseAttachments(raw: string | null | undefined, defaultPrefix?: string): AttachmentItem[] {
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
            name: String(item.name || extractFileName(item.url, defaultPrefix)),
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

  // 2. Data URI guard: base64 Data URIs contain semicolons and commas (e.g. data:image/png;base64,...).
  // Strictly avoid regex split(/[\n,;]+/) which chops a single Data URI into 3 broken fragments!
  if (trimmed.startsWith('data:')) {
    return [
      {
        id: 'att-data-1',
        name: extractFileName(trimmed, defaultPrefix),
        url: trimmed,
        type: inferFileType(trimmed),
        source: 'generic',
      },
    ];
  }

  // 3. Newline or comma/semicolon delimited URLs
  const lines = trimmed
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((url, idx) => ({
      id: `att-${idx}-${idx * 17}`,
      name: extractFileName(url, defaultPrefix),
      url,
      type: inferFileType(url),
      source: detectCloudSource(url),
    }));
  }

  // 4. Single URL
  return [
    {
      id: 'att-single-1',
      name: extractFileName(trimmed, defaultPrefix),
      url: trimmed,
      type: inferFileType(trimmed),
      source: detectCloudSource(trimmed),
    },
  ];
}

/** Parses multi-line or comma separated URLs into structured AttachmentItems */
export function parseMultiUrls(rawText: string, defaultPrefix = 'Liên kết'): AttachmentItem[] {
  if (!rawText || !rawText.trim()) return [];

  // Tách theo dòng trước để bảo toàn từng dòng có thể chứa cặp [Mã Hàng] [Link]
  const rawLines = rawText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const candidateEntries: { url: string; lineHint?: string }[] = [];

  const urlRegex = /(https?:\/\/[^\s,;]+)/g;

  for (const line of rawLines) {
    const urlsInLine = line.match(urlRegex);
    if (urlsInLine && urlsInLine.length > 0) {
      for (const u of urlsInLine) {
        // Lấy phần text còn lại trong dòng trừ link ra để tìm gợi ý mã hàng
        const remainingText = line.replace(u, '').trim();
        candidateEntries.push({ url: u, lineHint: remainingText });
      }
    } else {
      // Trường hợp dán danh sách URL phân tách bằng phẩy hoặc chấm phẩy trên cùng 1 dòng
      const parts = line.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      for (const p of parts) {
        if (/^https?:\/\//i.test(p)) {
          candidateEntries.push({ url: p });
        }
      }
    }
  }

  const validUrls: AttachmentItem[] = [];
  for (let i = 0; i < candidateEntries.length; i++) {
    const entry = candidateEntries[i];
    if (!entry) continue;
    try {
      new URL(entry.url);
      const cloud = detectCloudSource(entry.url);

      // Nếu có lineHint chứa mã nhận diện (VD: P260604720, 9690-C17, 2439-P2)
      let customName = '';
      if (entry.lineHint) {
        const cleanHint = entry.lineHint.replace(/[\t\r\n:,]+/g, ' ').trim();
        const codeToken = cleanHint.split(/\s+/).find((t) => /^[A-Za-z0-9_-]{3,}$/.test(t));
        if (codeToken) {
          customName = `${codeToken}_ChungChi.pdf`;
        }
      }

      const name = customName || extractFileName(entry.url, defaultPrefix);
      validUrls.push({
        id: `url-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        url: entry.url,
        type: inferFileType(entry.url),
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

/** Matches file name to lot code, part drawing code, order number or lot key */
export function smartMatchFileToLot(
  fileName: string,
  lotCode?: string,
  partCode?: string,
  orderNumber?: string,
  lotKey?: string
): boolean {
  if (!fileName) return false;
  const cleanStr = (s: string) =>
    s
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/i, '') // remove extension
      .replace(/[^a-z0-9]/gi, ''); // remove non-alphanumeric

  const cleanFile = cleanStr(fileName);
  if (!cleanFile) return false;

  // Thu thập các token con từ lotKey (VD: P260604720_1036-Z2 -> P260604720, 1036-Z2, 1036, Z2)
  const lotKeyTokens: string[] = [];
  if (lotKey) {
    const rawTokens = lotKey.split(/[^a-zA-Z0-9]+/);
    for (const t of rawTokens) {
      if (t && t.length >= 3) {
        lotKeyTokens.push(t);
      }
    }
  }

  const candidates = [lotCode, partCode, orderNumber, lotKey, ...lotKeyTokens];
  for (const cand of candidates) {
    if (cand) {
      const cleanCand = cleanStr(cand);
      if (cleanCand && cleanCand.length >= 3) {
        if (cleanFile.includes(cleanCand) || cleanCand.includes(cleanFile)) {
          return true;
        }
      }
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
    // If it's a Data URI or contains commas/newlines, use JSON to preserve the file's original name and integrity
    if (first.url.startsWith('data:') || first.url.includes(',') || first.url.includes('\n')) {
      return JSON.stringify(items);
    }
    // Single plain URL for maximum compatibility with Google Sheets formulas & AppSheet
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

/** Returns unified clean badge label for populated attachments cell: PDF (N), URL (N), IMG (N), TỆP (N) */
export function getAttachmentBadgeLabel(items: AttachmentItem[]): string {
  if (!items || items.length === 0) return '';
  const count = items.length;
  const allPdf = items.every((i) => i.type === 'pdf');
  if (allPdf) return `PDF (${count})`;
  const allUrl = items.every((i) => i.type === 'link');
  if (allUrl) return `URL (${count})`;
  const allImg = items.every((i) => i.type === 'image');
  if (allImg) return `IMG (${count})`;
  return `TỆP (${count})`;
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
  lotCode?: string | undefined;
  workshop?: string | undefined;
  material?: string | undefined;
  requiredHardness?: string | undefined;
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
  requiredHardness,
  canEdit = true,
  field,
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const isHeatCycleField = field === 'ncc_giando';
  const items = isHeatCycleField ? [] : parseAttachments(value, lotCode);

  const handleOpenDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canEdit && !value && items.length === 0) return;
    setIsDialogOpen(true);
  };

  const handleSave = (updated: AttachmentItem[]) => {
    const serialized = serializeAttachments(updated);
    if (onChange) {
      onChange(serialized);
    }
  };

  const handleSaveHeatCycle = (newShorthand: string) => {
    if (onChange) {
      onChange(newShorthand);
    }
  };

  return (
    <>
      <div className="flex h-6 max-w-full items-center select-none overflow-hidden">
        {isHeatCycleField ? (
          value && value.trim() ? (
            <HoverCard openDelay={120} closeDelay={100}>
              <HoverCardTrigger asChild>
                <button
                  type="button"
                  onClick={handleOpenDialog}
                  title="Bấm để xem hoặc chỉnh sửa thông số chu trình nhiệt luyện"
                  className="inline-flex items-center justify-center h-6 px-1.5 py-0.5 rounded-xs bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 shadow-2xs transition cursor-pointer active:scale-95 select-none"
                >
                  {/* Mini SVG Graphic - hoàn toàn thuần vector nét than chì, không còn chữ/tag QT */}
                  <div className="w-[74px] h-[18px] flex items-center justify-center pointer-events-none">
                    <HeatTreatmentCycle
                      shorthand={value}
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
                className="z-50 w-[400px] rounded-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 shadow-xl text-slate-900 dark:text-slate-100 outline-none"
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1 mb-2">
                  <span className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    CHU TRÌNH NHIỆT LUYỆN
                  </span>
                  {lotCode && (
                    <span className="font-mono text-[9.5px] font-semibold text-slate-500 dark:text-slate-400">
                      {lotCode}
                    </span>
                  )}
                </div>
                <div className="bg-white p-1 rounded-xs border border-slate-200 dark:border-slate-800 flex justify-center">
                  <HeatTreatmentCycle
                    shorthand={value}
                    width={370}
                    height={76}
                    showFrame={true}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between font-mono text-[9.5px]">
                  <span className="text-slate-600 dark:text-slate-300 truncate max-w-[280px]" title={value}>
                    {value}
                  </span>
                  <span className="text-slate-400 text-[9px] shrink-0">
                    Bấm để hiệu chỉnh
                  </span>
                </div>
              </HoverCardContent>
            </HoverCard>
          ) : (
            <button
              type="button"
              onClick={handleOpenDialog}
              disabled={!canEdit}
              title="Chưa có biểu đồ chu trình nhiệt luyện - Bấm để nạp thông số"
              className={`inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-xs border text-[11px] font-medium transition-all ${
                canEdit
                  ? 'border-slate-200 dark:border-slate-700 bg-secondary/50 hover:bg-secondary text-slate-700 dark:text-slate-300 hover:border-amber-500/50 cursor-pointer active:scale-95'
                  : 'border-slate-200/50 dark:border-slate-800 bg-secondary/20 text-muted-foreground/50 opacity-50 cursor-not-allowed'
              } select-none`}
            >
              <span>+ Giản đồ</span>
            </button>
          )
        ) : items.length === 0 ? (
          canEdit ? (
            <button
              type="button"
              onClick={handleOpenDialog}
              title={`${title}: Bấm để tải lên tệp hoặc dán liên kết`}
              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-xs border text-[11px] font-medium transition-all border-slate-200 dark:border-slate-700 bg-secondary/50 hover:bg-secondary text-slate-700 dark:text-slate-300 hover:border-primary/40 cursor-pointer active:scale-95 select-none"
            >
              <span>+ Tệp</span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              title="Chưa được phân quyền tải lên"
              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-xs border text-[11px] font-medium transition-all border-slate-200/50 dark:border-slate-800 bg-secondary/20 text-muted-foreground/50 opacity-50 cursor-not-allowed select-none"
            >
              <span>+ Tệp</span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={handleOpenDialog}
            title={`${title} (${items.length} tệp) - Bấm để xem hoặc chỉnh sửa`}
            className="inline-flex items-center justify-center gap-1 rounded-xs bg-slate-900 px-2 py-0.5 font-mono text-[10.5px] font-bold text-white shadow-2xs transition-all hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 border border-slate-700/60 dark:border-slate-600/60 tabular-nums cursor-pointer active:scale-95 select-none"
          >
            <span>{getAttachmentBadgeLabel(items)}</span>
          </button>
        )}
      </div>

      {isDialogOpen && (
        isHeatCycleField ? (
          <HeatCycleModal
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            lotCode={lotCode}
            workshop={workshop}
            material={material}
            requiredHardness={requiredHardness}
            value={value}
            onSave={handleSaveHeatCycle}
            canEdit={canEdit}
          />
        ) : (
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
        )
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

  // Sync internal state when initialItems change or dialog re-opens
  React.useEffect(() => {
    setFileList(initialItems);
  }, [initialItems, isOpen]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlNote, setUrlNote] = useState('');
  const [previewFile, setPreviewFile] = useState<AttachmentItem | null>(null);
  const [imgZoom, setImgZoom] = useState(1);
  const [imgRotation, setImgRotation] = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState('');
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

    // Nếu để trống tên gợi nhớ, ưu tiên lấy theo Mã Hàng của lô (lotCode)
    const effectivePrefix = urlNote.trim() || lotCode || 'Tài liệu';
    const parsedItems = parseMultiUrls(raw, effectivePrefix);
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

  const handleRenameFile = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setEditingFileId(null);
      return;
    }
    const finalName = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
    const updated = fileList.map((f) => (f.id === id ? { ...f, name: finalName } : f));
    setFileList(updated);
    onSave(updated);
    setEditingFileId(null);
    playAudioCue('success');
    toast.success(`Đã đổi tên tệp thành: ${finalName}`);
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
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in-0 duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div
            className="max-w-[680px] w-[95vw] max-h-[88vh] rounded-xl border border-slate-200 bg-white p-5 font-sans shadow-2xl text-slate-900 animate-slide-up flex flex-col overflow-hidden"
            style={{ borderRadius: '12px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase tracking-tight text-slate-900">
                  {title}
                </span>
                {workshop && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    {workshop}
                  </span>
                )}
                {material && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                    {material}
                  </span>
                )}
              </div>
              {lotCode && (
                <span className="text-xs text-slate-500 block mt-1">
                  Lô: <strong className="text-slate-900 font-mono">{lotCode}</strong>
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-base transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1">
            {/* Dropzone & Multi-URL Input (Chỉ khi có quyền canEdit) */}
            {canEdit && (
              <div className="space-y-3">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition cursor-pointer ${
                    isDragOver
                      ? 'border-slate-900 bg-slate-100'
                      : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 hover:border-slate-500'
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
                  <div className="w-9 h-9 rounded-full bg-white border border-slate-200 mx-auto flex items-center justify-center text-slate-700 shadow-sm mb-2 font-bold">
                    ↑
                  </div>
                  <div className="text-xs font-semibold text-slate-800">
                    Kéo thả tệp vào đây, hoặc <span className="underline text-slate-900">chọn từ máy tính</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Hỗ trợ PDF, Ảnh, Excel (Ảnh tự nén &lt;45KB, PDF khuyến nghị &lt;50KB hoặc dán link Cloud)
                  </p>
                </div>

                {/* Paste Multi-URL Input bar */}
                <form onSubmit={handleAddUrl} className="flex flex-col sm:flex-row gap-2">
                  <label htmlFor={urlInputId} className="sr-only">Đường link tài liệu</label>
                  <input
                    id={urlInputId}
                    type="text"
                    placeholder="Hoặc dán Link URL (Google Drive / OneDrive / Cloud)..."
                    value={pastedUrl}
                    onChange={(e) => setPastedUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                  />
                  <input
                    type="text"
                    placeholder="Tên gợi nhớ (tùy chọn)"
                    value={urlNote}
                    onChange={(e) => setUrlNote(e.target.value)}
                    className="sm:w-44 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 font-sans"
                  />
                  <button
                    type="submit"
                    disabled={!pastedUrl.trim()}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold whitespace-nowrap transition cursor-pointer disabled:opacity-40"
                  >
                    + Thêm Link
                  </button>
                </form>
              </div>
            )}

            {/* Danh sách tệp (Vertical File List) */}
            <div>
              <div className="flex items-center justify-between pb-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <span>Danh sách tệp ({fileList.length})</span>
              </div>

              {fileList.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
                  Chưa có tệp đính kèm nào
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                  {fileList.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 shadow-sm transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2 flex-1">
                        {renderFileIcon(file.type, file.source)}
                        <div className="min-w-0 flex-1">
                          {editingFileId === file.id ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleRenameFile(file.id, editingNameValue);
                              }}
                              className="flex items-center gap-1.5 py-0.5"
                            >
                              <input
                                type="text"
                                autoFocus
                                value={editingNameValue}
                                onChange={(e) => setEditingNameValue(e.target.value)}
                                onBlur={() => handleRenameFile(file.id, editingNameValue)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') setEditingFileId(null);
                                }}
                                placeholder="Nhập tên tệp (VD: 9662-R1)..."
                                className="h-6 px-2 text-xs font-mono font-bold border border-slate-900 rounded bg-white text-slate-900 focus:outline-none flex-1 max-w-[240px]"
                              />
                              <button
                                type="submit"
                                className="h-6 px-2 rounded bg-slate-900 text-white text-[10px] font-bold cursor-pointer"
                              >
                                Lưu
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingFileId(null)}
                                className="h-6 px-1.5 text-slate-400 hover:text-slate-600 text-xs"
                              >
                                ✕
                              </button>
                            </form>
                          ) : (
                            <div className="flex items-center gap-1.5 group/name">
                              <p
                                onClick={() => {
                                  if (!canEdit) return;
                                  setEditingFileId(file.id);
                                  setEditingNameValue(file.name.replace(/\.pdf$/i, ''));
                                }}
                                className={`text-xs font-semibold text-slate-900 truncate block ${
                                  canEdit ? 'hover:text-blue-700 hover:underline cursor-pointer' : ''
                                }`}
                                title={canEdit ? 'Click để sửa tên tệp hoặc mã hàng' : file.name}
                              >
                                {middleTruncate(file.name, 28)}
                              </p>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingFileId(file.id);
                                    setEditingNameValue(file.name.replace(/\.pdf$/i, ''));
                                  }}
                                  title="Click để sửa tên tệp hoặc mã hàng"
                                  className="p-0.5 text-slate-400 hover:text-slate-900 opacity-60 group-hover/name:opacity-100 transition cursor-pointer"
                                >
                                  <PenLine size={12} />
                                </button>
                              )}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-[10.5px] text-slate-500 font-mono">
                            {file.size && <span>{file.size}</span>}
                            {file.source && file.source !== 'generic' && (
                              <span className="uppercase text-emerald-700 font-bold">[{file.source}]</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cụm nút tác vụ (Xem trước, Sao chép, Mở link, Thùng rác) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => setPreviewFile(file)}
                          className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          title="Xem trước tệp"
                        >
                          <Eye size={12} />
                          <span className="hidden sm:inline">Xem</span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(file.url);
                            playAudioCue('pop');
                            toast.success('Đã sao chép liên kết vào bộ nhớ tạm');
                          }}
                          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] cursor-pointer"
                          title="Sao chép liên kết"
                        >
                          <Copy size={12} />
                        </button>

                        <a
                          href={file.url}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] cursor-pointer inline-flex items-center"
                          title="Mở tab mới hoặc tải về"
                        >
                          {file.url.startsWith('data:') ? <Download size={12} /> : <ExternalLink size={12} />}
                        </a>

                        {canEdit && (
                          <>
                            {confirmDeleteId === file.id ? (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteClick(file.id, e)}
                                className="px-2 py-1 rounded border border-rose-300 bg-rose-50 text-rose-700 font-mono text-[10.5px] font-bold animate-in fade-in cursor-pointer shrink-0"
                                title="Bấm lần nữa để xác nhận xóa"
                              >
                                Bấm lại để xóa
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteClick(file.id, e)}
                                className="p-1.5 rounded border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 text-[11px] transition cursor-pointer"
                                title="Xóa tệp này (Bấm 2 lần)"
                              >
                                <Trash2 size={12} />
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

            {/* Inline Quick Preview Box (Slate 900 nổi bật) */}
            {previewFile && (
              <div className="rounded-lg border border-slate-700 bg-slate-900 text-slate-100 p-3.5 text-xs space-y-2 animate-slide-up">
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <span>👁</span> Xem trước nhanh: <span className="text-white font-mono">{previewFile.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewFile(null)}
                    className="text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    Đóng xem trước ✕
                  </button>
                </div>
                <div className="text-[11px] text-slate-300 font-mono leading-relaxed">
                  <div>• Đường dẫn gốc: <a href={previewFile.url} target="_blank" rel="noreferrer" className="underline text-emerald-300">{previewFile.url}</a></div>
                  <div>• Mã lô: {lotCode || '—'} | Xưởng: {workshop || '—'} | Vật liệu: {material || '—'}</div>
                  <div>• Dung lượng / Trạng thái: {previewFile.size || 'Cloud Link'} • Hợp lệ</div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 -mx-5 -mb-5 mt-4">
            <span className="text-[11px] text-slate-500">
              Đang lưu {fileList.length} tệp đính kèm
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
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
                className="px-4 py-1.5 rounded-lg bg-[#111827] hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
              >
                <Check size={12} />
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Lightbox / Preview Sub-dialog với Toolbar và Hỗ trợ Cloud Preview */}
      {previewFile && (
        <Dialog
          open={!!previewFile}
          onOpenChange={() => {
            setPreviewFile(null);
            setImgZoom(1);
            setImgRotation(0);
          }}
        >
          <DialogContent
            className="max-w-3xl w-[95vw] rounded-xl sm:rounded-xl border border-slate-200 bg-white p-4 shadow-2xl font-sans flex flex-col max-h-[90vh] overflow-hidden"
            style={{ borderRadius: '12px' }}
          >
            <DialogTitle className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 text-xs font-bold text-slate-900">
              <div className="flex items-center gap-2 min-w-0">
                {renderFileTypeBadge(previewFile.type, previewFile.source)}
                <span className="truncate max-w-[280px] sm:max-w-md font-mono text-[11.5px]" title={previewFile.name}>
                  {previewFile.name}
                </span>
                {previewFile.size && (
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">({previewFile.size})</span>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {(previewFile.type === 'image' || previewFile.url.startsWith('data:image/')) && (
                  <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1">
                    <button
                      type="button"
                      onClick={() => setImgZoom((z) => Math.min(3, Math.round((z + 0.25) * 100) / 100))}
                      className="p-1 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Phóng to (+)"
                    >
                      <ZoomIn size={13} />
                    </button>
                    <span className="text-[10px] font-mono text-slate-500 w-9 text-center">
                      {Math.round(imgZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setImgZoom((z) => Math.max(0.5, Math.round((z - 0.25) * 100) / 100))}
                      className="p-1 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Thu nhỏ (-)"
                    >
                      <ZoomOut size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImgZoom(1);
                        setImgRotation(0);
                      }}
                      className="p-1 rounded hover:bg-slate-100 text-slate-700 cursor-pointer text-[10px] font-mono"
                      title="Đặt lại zoom ban đầu"
                    >
                      1:1
                    </button>
                    <button
                      type="button"
                      onClick={() => setImgRotation((r) => (r + 90) % 360)}
                      className="p-1 rounded hover:bg-slate-100 text-slate-700 cursor-pointer"
                      title="Xoay ảnh 90°"
                    >
                      <RotateCw size={13} />
                    </button>
                  </div>
                )}

                <a
                  href={previewFile.url}
                  download={previewFile.name}
                  className="px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-700 font-mono text-[11px] shrink-0 flex items-center gap-1"
                  title="Tải về máy tính"
                >
                  <Download size={11} /> <span className="hidden sm:inline">Tải về</span>
                </a>
                <a
                  href={previewFile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-mono text-[11px] shrink-0 flex items-center gap-1 shadow-2xs"
                  title="Mở tab mới"
                >
                  Mở tab mới <ExternalLink size={11} />
                </a>
              </div>
            </DialogTitle>

            {/* Container hiển thị nội dung */}
            <div className="mt-3 flex-1 min-h-[50vh] max-h-[72vh] flex items-center justify-center overflow-auto rounded-lg bg-slate-950/95 dark:bg-slate-900 border border-slate-800 p-2 relative select-none">
              {previewFile.type === 'image' || previewFile.url.startsWith('data:image/') ? (
                <div className="flex items-center justify-center w-full h-full min-h-[48vh] overflow-auto">
                  <img
                    src={previewFile.url}
                    alt={previewFile.name}
                    style={{
                      transform: `scale(${imgZoom}) rotate(${imgRotation}deg)`,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-h-[66vh] max-w-full object-contain rounded-xs shadow-md"
                  />
                </div>
              ) : previewFile.type === 'pdf' || previewFile.url.endsWith('.pdf') || previewFile.url.includes('drive.google.com') ? (
                <iframe
                  src={transformToPreviewUrl(previewFile.url)}
                  title={previewFile.name}
                  className="h-[68vh] w-full border-none rounded-xs bg-white"
                />
              ) : (
                <div className="py-16 px-6 text-center text-xs flex flex-col items-center justify-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 mb-3 shadow-inner">
                    <Cloud size={22} className="text-sky-400" />
                  </div>
                  <p className="font-bold text-white text-sm mb-1 font-mono">{previewFile.name}</p>
                  <p className="text-slate-400 text-xs mb-4 leading-relaxed">
                    Tệp lưu trữ trên nền tảng đám mây ({previewFile.source === 'onedrive' ? 'OneDrive' : previewFile.source === 'sharepoint' ? 'SharePoint' : 'Liên kết ngoài'}). Để đảm bảo an toàn bảo mật chính sách nhúng CSP, vui lòng mở trực tiếp trên tab mới.
                  </p>
                  <a
                    href={previewFile.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xs bg-primary hover:bg-primary/90 text-primary-foreground font-mono text-xs font-semibold flex items-center gap-1.5 shadow-md cursor-pointer transition active:scale-95"
                  >
                    <span>Mở tài liệu ngay</span>
                    <ExternalLink size={12} />
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
