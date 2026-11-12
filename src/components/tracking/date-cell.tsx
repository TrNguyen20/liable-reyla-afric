import React, { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { date } from '@/lib/dynamo-data';
import { playAudioCue } from '@/lib/audio-cues';

export interface DateCellProps {
  value: string | undefined;
  onChange?: (newDate: string) => void;
  title: string;
  canEdit?: boolean;
  field: string;
  className?: string;
}

export const DateCell: React.FC<DateCellProps> = ({
  value = '',
  onChange,
  title,
  canEdit = true,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>(value);

  // Normalize date string for HTML date input: YYYY-MM-DD
  const normalizedInputDate = React.useMemo(() => {
    if (!value) return '';
    const raw = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
      return raw.slice(0, 10);
    }
    // Attempt parse if DD/MM/YYYY or M/D/YYYY
    const parts = raw.split(/[-/]/);
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return '';
  }, [value]);

  const handleApply = (newVal: string) => {
    if (onChange && newVal !== value) {
      onChange(newVal);
      playAudioCue('success');
    }
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
      playAudioCue('pop');
    }
    setIsOpen(false);
  };

  const displayDate = date(value);

  if (!canEdit) {
    return (
      <span className={`font-mono text-xs tabular-nums text-foreground/90 ${className}`}>
        {displayDate || '—'}
      </span>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          className={`group/date flex h-6 w-full items-center justify-between gap-1 overflow-hidden cursor-pointer select-none rounded-xs px-1 hover:bg-secondary/50 transition-colors ${className}`}
          title={`${title}: ${displayDate || 'Chưa có'} - Bấm để chọn ngày`}
        >
          <span className="font-mono text-xs tabular-nums text-foreground/90 truncate">
            {displayDate || '—'}
          </span>
          <span className="opacity-0 group-hover/date:opacity-100 hover:!opacity-100 p-0.5 rounded-xs text-muted-foreground hover:text-primary transition-opacity shrink-0">
            <CalendarIcon size={11} />
          </span>
        </div>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2.5 font-sans rounded-xs border border-border bg-card shadow-lg text-foreground">
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-foreground">
              {title}
            </span>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] text-destructive hover:underline cursor-pointer flex items-center gap-0.5"
                title="Xóa ngày hiện tại"
              >
                <X size={10} /> Xóa
              </button>
            )}
          </div>

          <div className="pt-1">
            <input
              type="date"
              value={tempDate ? tempDate.slice(0, 10) : normalizedInputDate}
              onChange={(e) => {
                setTempDate(e.target.value);
                handleApply(e.target.value);
              }}
              className="w-full h-8 px-2 rounded-xs border border-border bg-background font-mono text-xs text-foreground outline-none focus:border-primary"
              autoFocus
            />
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-6 px-3 rounded-xs border border-border bg-secondary hover:bg-secondary/80 font-mono text-[11px] font-medium transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
