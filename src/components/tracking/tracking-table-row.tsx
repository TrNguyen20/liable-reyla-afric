import React, { memo } from 'react';
import type { QTItem } from '@/lib/dynamo-data';
import type { ColumnKey } from '@/routes/tracking';
import { CountryCellBadge } from '@/components/common/vietnam-flag';
import { AttachmentCell } from '@/components/tracking/attachment-field';
import { DateCell } from '@/components/tracking/date-cell';
import { JobTicketButton } from '@/components/job-ticket';
import type { Role } from '@/lib/dynamo-auth';
import { date, dateTime, money, number } from '@/lib/dynamo-data';
import { PenLine } from 'lucide-react';

interface TrackingTableRowProps {
  item: QTItem;
  role: Role;
  isSelected: boolean;
  isColVisible: (key: string) => boolean;
  colWidths: Record<ColumnKey, number>;
  onToggleSelect: (id: string) => void;
  onOpenDetail: (item: QTItem) => void;
  onStartInlineEdit: (id: string, field: any, initialVal: string) => void;
  onPreviewFile: (preview: { url: string; title: string; type: 'image' | 'pdf' }) => void;
  editingCellId?: string;
  editingField?: string;
  editValue?: string;
  setEditValue?: (v: string) => void;
  saveInlineEdit?: (item: QTItem, dir?: any) => void;
  handleCellKeyDown?: (e: React.KeyboardEvent, item: QTItem) => void;
}

export const TrackingTableRow = memo(function TrackingTableRow({
  item: r,
  role,
  isSelected,
  isColVisible,
  colWidths,
  onToggleSelect,
  onOpenDetail,
  onStartInlineEdit,
  onPreviewFile,
  editingCellId,
  editingField,
  editValue,
  setEditValue,
  saveInlineEdit,
  handleCellKeyDown,
}: TrackingTableRowProps) {
  const padY = 'py-1';
  const isEditingRow = editingCellId === r.ID_Key;

  return (
    <tr
      className={`group h-[34px] transition-colors border-b border-slate-200 dark:border-slate-800 ${
        isSelected
          ? 'bg-primary/10 hover:bg-primary/20'
          : 'odd:bg-card even:bg-secondary/25 hover:bg-secondary/70'
      }`}
    >
      {/* 0. Checkbox */}
      <td
        className={`sticky left-0 z-20 px-2 ${padY} text-center border-r border-slate-200 dark:border-border/40 bg-card h-[34px] relative ${
          isSelected
            ? 'border-l-2 border-l-primary before:absolute before:inset-0 before:bg-primary/15'
            : ''
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
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(r.ID_Key)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary cursor-pointer touch-manipulation"
        />
      </td>

      {/* 1. Mã hàng (Sticky) */}
      <td
        className={`sticky z-20 whitespace-nowrap px-2 ${padY} border-r border-slate-200 dark:border-border/80 bg-card h-[34px] relative overflow-hidden`}
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
          onClick={() => onOpenDetail(r)}
          className="relative z-10 font-mono font-bold text-primary hover:underline cursor-pointer truncate max-w-full block text-left"
          title={r.ma_hang}
        >
          <span className="truncate">{r.ma_hang}</span>
        </button>
      </td>

      {/* 2. Ngày tạo */}
      {isColVisible('ngay_tao') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} font-mono text-muted-foreground truncate`}
          style={{ maxWidth: `${colWidths.ngay_tao}px` }}
          title={r.ngay_tao ?? ''}
        >
          {r.ngay_tao ? dateTime(r.ngay_tao) : '—'}
        </td>
      )}

      {/* 3. Người tạo */}
      {isColVisible('nguoi_tao') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} font-mono text-muted-foreground truncate`}
          style={{ maxWidth: `${colWidths.nguoi_tao}px` }}
        >
          {r.nguoi_tao ? String(r.nguoi_tao) : '—'}
        </td>
      )}

      {/* 4. NƯỚC */}
      {isColVisible('quoc_gia') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} text-muted-foreground truncate`}
          style={{ maxWidth: `${colWidths.quoc_gia}px` }}
        >
          <CountryCellBadge country={r.quoc_gia} showText={true} />
        </td>
      )}

      {/* 5. Phân xưởng */}
      {isColVisible('phong_sx') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} truncate`}
          style={{ maxWidth: `${colWidths.phong_sx}px` }}
        >
          <span className="px-1.5 py-0.5 rounded-xs font-mono font-bold text-[10px] bg-secondary border border-border/60">
            {r.phong_sx}
          </span>
        </td>
      )}

      {/* 6. Đối tượng hàng */}
      {isColVisible('doi_tuong_hang') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} text-muted-foreground truncate`}
          style={{ maxWidth: `${colWidths.doi_tuong_hang}px` }}
        >
          {r.doi_tuong_hang || '—'}
        </td>
      )}

      {/* 7. Mã bản vẽ / phôi */}
      {isColVisible('id_ma_hang') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} font-mono text-muted-foreground truncate cursor-pointer hover:text-foreground hover:underline`}
          style={{ maxWidth: `${colWidths.id_ma_hang}px` }}
          title={r.id_ma_hang ? `Mã bản vẽ: ${r.id_ma_hang} (Nhấp để sao chép)` : undefined}
          onClick={() => {
            if (r.id_ma_hang) {
              navigator.clipboard.writeText(r.id_ma_hang);
            }
          }}
        >
          {r.id_ma_hang || '—'}
        </td>
      )}

      {/* 8. Số lượng */}
      {isColVisible('so_luong') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} text-right font-mono tabular-nums font-bold text-foreground`}
          style={{ maxWidth: `${colWidths.so_luong}px` }}
        >
          {isEditingRow && editingField === 'so_luong' ? (
            <input
              type="number"
              min={1}
              value={editValue}
              onChange={(e) => setEditValue?.(e.target.value)}
              onBlur={() => saveInlineEdit?.(r)}
              onKeyDown={(e) => handleCellKeyDown?.(e, r)}
              className="h-6 w-full max-w-full rounded-xs border-2 border-primary bg-background px-1 text-right font-mono text-xs font-bold text-foreground outline-none"
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={() => onStartInlineEdit(r.ID_Key, 'so_luong', String(r.so_luong))}
              className="flex items-center justify-end gap-1 group/edit cursor-pointer"
            >
              <span>{number(r.so_luong)}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartInlineEdit(r.ID_Key, 'so_luong', String(r.so_luong));
                }}
                className="opacity-0 group-hover/edit:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity"
              >
                <PenLine size={10} />
              </button>
            </div>
          )}
        </td>
      )}

      {/* 9. Vật liệu */}
      {isColVisible('vat_lieu') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} font-mono font-bold text-foreground truncate`}
          style={{ maxWidth: `${colWidths.vat_lieu}px` }}
        >
          {isEditingRow && editingField === 'vat_lieu' ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue?.(e.target.value)}
              onBlur={() => saveInlineEdit?.(r)}
              onKeyDown={(e) => handleCellKeyDown?.(e, r)}
              className="h-6 w-full max-w-full rounded-xs border-2 border-primary bg-background px-1 font-mono text-xs font-bold text-foreground outline-none"
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={() => onStartInlineEdit(r.ID_Key, 'vat_lieu', r.vat_lieu || '')}
              className="flex items-center gap-1 group/edit cursor-pointer truncate"
            >
              <span className="truncate">{r.vat_lieu || '—'}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartInlineEdit(r.ID_Key, 'vat_lieu', r.vat_lieu || '');
                }}
                className="opacity-0 group-hover/edit:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity"
              >
                <PenLine size={10} />
              </button>
            </div>
          )}
        </td>
      )}

      {/* 10. Độ cứng */}
      {isColVisible('do_cung') && (
        <td
          className={`whitespace-nowrap px-2 ${padY} font-mono text-foreground truncate`}
          style={{ maxWidth: `${colWidths.do_cung}px` }}
        >
          {isEditingRow && editingField === 'do_cung' ? (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue?.(e.target.value)}
              onBlur={() => saveInlineEdit?.(r)}
              onKeyDown={(e) => handleCellKeyDown?.(e, r)}
              className="h-6 w-full max-w-full rounded-xs border-2 border-primary bg-background px-1 font-mono text-xs font-bold text-foreground outline-none"
              autoFocus
            />
          ) : (
            <div
              onDoubleClick={() => onStartInlineEdit(r.ID_Key, 'do_cung', r.do_cung || '')}
              className="flex items-center gap-1 group/edit cursor-pointer truncate"
            >
              <span className="truncate">{r.do_cung || '—'}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartInlineEdit(r.ID_Key, 'do_cung', r.do_cung || '');
                }}
                className="opacity-0 group-hover/edit:opacity-100 p-0.5 text-muted-foreground hover:text-primary transition-opacity"
              >
                <PenLine size={10} />
              </button>
            </div>
          )}
        </td>
      )}

      {/* 36. Phiếu A4 (Sticky Right) */}
      <td
        className="sticky right-0 z-20 px-2 py-1 text-center bg-card border-l border-slate-200 dark:border-border/80 h-[34px]"
        style={{
          position: 'sticky',
          right: 0,
          zIndex: 20,
          width: `${colWidths.ticket}px`,
          minWidth: `${colWidths.ticket}px`,
          maxWidth: `${colWidths.ticket}px`,
        }}
      >
        <JobTicketButton item={r} role={role} />
      </td>
    </tr>
  );
}, (prev, next) => {
  // Chỉ re-render khi dòng đó được chọn/bỏ chọn, hoặc đang sửa đúng dòng này
  return (
    prev.item === next.item &&
    prev.isSelected === next.isSelected &&
    prev.colWidths === next.colWidths &&
    (prev.editingCellId === prev.item.ID_Key) === (next.editingCellId === next.item.ID_Key) &&
    prev.editValue === next.editValue
  );
});