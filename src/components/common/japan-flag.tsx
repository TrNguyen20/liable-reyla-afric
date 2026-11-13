import React from 'react';

/**
 * JapanFlagIcon - SVG lá cờ Nhật Bản (Hinomaru) tỷ lệ 3:2,
 * vòng tròn đỏ mặt trời ở trung tâm, không border Graphite MES.
 */
export const JapanFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-2.5' }) => (
  <span
    className={`inline-block overflow-hidden rounded-xs flex-shrink-0 animate-flag-wave select-none ${className}`}
    style={{ lineHeight: 0 }}
  >
    <svg viewBox="0 0 30 20" className="w-full h-full block" xmlns="http://www.w3.org/2000/svg" aria-label="Cờ Nhật Bản">
      <rect width="30" height="20" fill="#ffffff" />
      <circle cx="15" cy="10" r="6" fill="#bc002d" />
    </svg>
  </span>
);

/**
 * USAFlagIcon - SVG lá cờ Mỹ (Stars and Stripes) tỷ lệ 3:2 thu nhỏ,
 * 13 sọc đỏ trắng và góc canton xanh chứa sao, không border Graphite MES.
 */
export const USAFlagIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-2.5' }) => (
  <span
    className={`inline-block overflow-hidden rounded-xs flex-shrink-0 animate-flag-wave select-none ${className}`}
    style={{ lineHeight: 0 }}
  >
    <svg viewBox="0 0 30 20" className="w-full h-full block" xmlns="http://www.w3.org/2000/svg" aria-label="Cờ Hoa Kỳ">
      <rect width="30" height="20" fill="#ffffff" />
      {/* 13 sọc đỏ - trắng xen kẽ */}
      <rect y="0" width="30" height="1.54" fill="#b22234" />
      <rect y="3.08" width="30" height="1.54" fill="#b22234" />
      <rect y="6.15" width="30" height="1.54" fill="#b22234" />
      <rect y="9.23" width="30" height="1.54" fill="#b22234" />
      <rect y="12.31" width="30" height="1.54" fill="#b22234" />
      <rect y="15.38" width="30" height="1.54" fill="#b22234" />
      <rect y="18.46" width="30" height="1.54" fill="#b22234" />
      {/* Canton màu xanh lam */}
      <rect width="12" height="10.77" fill="#3c3b6e" />
      {/* Các điểm sao vàng/trắng cách điệu */}
      <g fill="#ffffff">
        <circle cx="2.5" cy="2.2" r="0.6" />
        <circle cx="6" cy="2.2" r="0.6" />
        <circle cx="9.5" cy="2.2" r="0.6" />
        <circle cx="4.25" cy="4.2" r="0.6" />
        <circle cx="7.75" cy="4.2" r="0.6" />
        <circle cx="2.5" cy="6.2" r="0.6" />
        <circle cx="6" cy="6.2" r="0.6" />
        <circle cx="9.5" cy="6.2" r="0.6" />
        <circle cx="4.25" cy="8.2" r="0.6" />
        <circle cx="7.75" cy="8.2" r="0.6" />
      </g>
    </svg>
  </span>
);
