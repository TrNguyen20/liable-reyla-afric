import React from 'react';
import { JapanFlagIcon, USAFlagIcon } from './japan-flag';

interface CountryBadgeProps {
  country?: string | undefined;
  showText?: boolean;
}

/**
 * VietnamFlagIcon - SVG lá cờ đỏ sao vàng thu nhỏ chuẩn tỷ lệ 3:2,
 * tích hợp hiệu ứng CSS animation gợn sóng (flag-wave) nhẹ nhàng,
 * không border Graphite MES theo yêu cầu thiết kế mới.
 */
export const VietnamFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-2.5' }) => (
  <span
    className={`inline-block overflow-hidden rounded-xs flex-shrink-0 animate-flag-wave select-none ${className}`}
    style={{ lineHeight: 0 }}
  >
    <svg viewBox="0 0 30 20" className="w-full h-full block" xmlns="http://www.w3.org/2000/svg" aria-label="Cờ Việt Nam">
      <rect width="30" height="20" fill="#da251d" />
      <polygon
        points="15,4 16.47,8.53 21.23,8.53 17.38,11.33 18.85,15.86 15,13.06 11.15,15.86 12.62,11.33 8.77,8.53 13.53,8.53"
        fill="#ffff00"
      />
    </svg>
  </span>
);

/**
 * CountryCellBadge - Component hiển thị cột NƯỚC (quoc_gia) trong bảng Tracking.
 * Tự động ánh xạ cờ cho Việt Nam, Nhật Bản, Hoa Kỳ (Mỹ) và các quốc gia khác.
 */
export const CountryCellBadge: React.FC<CountryBadgeProps> = ({ country = 'Vietnam', showText = true }) => {
  const cStr = (country ?? '').trim();
  const lower = cStr.toLowerCase();

  // 1. Việt Nam
  if (!lower || lower === 'vietnam' || lower === 'vn' || lower === 'việt nam') {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground/90 group"
        title="Vietnam (Việt Nam)"
      >
        <VietnamFlagIcon className="w-4 h-2.5" />
        {showText && <span className="font-semibold text-[11px] tracking-tight text-foreground/80">VN</span>}
      </span>
    );
  }

  // 2. Nhật Bản (Japan)
  if (lower === 'japan' || lower === 'jp' || lower === 'nhật bản' || lower === 'nhật') {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground/90 group"
        title="Japan (Nhật Bản)"
      >
        <JapanFlagIcon className="w-4 h-2.5" />
        {showText && <span className="font-semibold text-[11px] tracking-tight text-foreground/80">JP</span>}
      </span>
    );
  }

  // 3. Hoa Kỳ (USA)
  if (lower === 'usa' || lower === 'us' || lower === 'united states' || lower === 'mỹ' || lower === 'hoa kỳ') {
    return (
      <span
        className="inline-flex items-center gap-1.5 font-mono text-xs text-foreground/90 group"
        title="United States (Hoa Kỳ)"
      >
        <USAFlagIcon className="w-4 h-2.5" />
        {showText && <span className="font-semibold text-[11px] tracking-tight text-foreground/80">US</span>}
      </span>
    );
  }

  // 4. Fallback cho các quốc gia khác
  return (
    <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground" title={cStr}>
      <span className="text-[11px]">🌐</span>
      <span className="font-medium text-[11px] truncate">{cStr}</span>
    </span>
  );
};
