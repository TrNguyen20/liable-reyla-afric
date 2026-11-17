import React from 'react';
import {
  HeatStepParam,
  parseHeatCycleShorthand,
} from './heat-cycle-types';

export interface HeatTreatmentCycleProps {
  /** Có thể truyền trực tiếp mảng steps hoặc chuỗi tốc ký shorthand */
  steps?: HeatStepParam[];
  shorthand?: string;
  width?: number | string;
  height?: number;
  showFrame?: boolean;
  variant?: 'full' | 'mini';
  strokeColor?: string;
  className?: string;
}

/**
 * Biểu đồ Chu trình Nhiệt luyện (Time-Temperature Heat Treatment Cycle)
 * Chuẩn đồ họa công nghiệp Graphite Wireframe UI v2.5.0:
 * - 4 khung chia tách bạch: Tôi [Q], Ram 1 [T1], Ram 2 [T2], Ram 3 [T3].
 * - Vector SVG siêu nhẹ (< 3KB), nét 1px/1.5px chuẩn mực, font-mono tabular-nums.
 * - Hỗ trợ variant="mini" vẽ biểu đồ thu nhỏ nhúng trực tiếp vào cell bảng điều độ.
 * - Hỗ trợ co giãn độ cao đỉnh theo nhiệt độ thực tế (°C).
 */
export const HeatTreatmentCycle: React.FC<HeatTreatmentCycleProps> = ({
  steps: providedSteps,
  shorthand,
  width = 560,
  height = 90,
  showFrame = true,
  variant = 'full',
  strokeColor,
  className = '',
}) => {
  const steps = React.useMemo(() => {
    if (providedSteps && providedSteps.length > 0) {
      const stages: ('Q' | 'T1' | 'T2' | 'T3')[] = ['Q', 'T1', 'T2', 'T3'];
      return stages.map((stg) => {
        const found = providedSteps.find((s) => s.stage === stg);
        return found || { stage: stg, temp: undefined, time: undefined };
      });
    }
    if (shorthand && shorthand.trim()) {
      return parseHeatCycleShorthand(shorthand);
    }
    return [
      { stage: 'Q', temp: undefined, time: undefined },
      { stage: 'T1', temp: undefined, time: undefined },
      { stage: 'T2', temp: undefined, time: undefined },
      { stage: 'T3', temp: undefined, time: undefined },
    ] as HeatStepParam[];
  }, [providedSteps, shorthand]);

  const isMini = variant === 'mini';
  const miniStroke = strokeColor || '#0f172a';
  // Chuẩn hóa viewBox width & height nội tại
  const baseVbWidth = isMini ? 120 : 560;
  const baseVbHeight = isMini ? 26 : height;
  const cellWidth = baseVbWidth / 4;
  const cellHeight = baseVbHeight;

  const renderCell = (step: HeatStepParam, index: number) => {
    const offsetX = index * cellWidth;
    const hasData = step.temp !== undefined && step.time !== undefined;

    if (isMini) {
      // Biến thể siêu nhỏ: Chỉ vẽ khung tối giản, đường nung - giữ nhiệt và đường dốc nguội
      const numericTemp = Number(step.temp) || 500;
      const peakY = hasData
        ? Math.max(5, Math.min(18, 19 - ((numericTemp - 400) / 700) * 13))
        : 18;
      const xStart = offsetX + 2;
      const yStart = 22;
      const xHoldStart = offsetX + cellWidth * 0.3;
      const xHoldEnd = offsetX + cellWidth * 0.75;
      const xCoolEnd = offsetX + cellWidth * 0.95;
      const yCoolEnd = 23;

      return (
        <g key={step.stage}>
          {index > 0 && (
            <line x1={offsetX} y1={0} x2={offsetX} y2={cellHeight} stroke="#cbd5e1" strokeWidth="0.8" />
          )}
          {hasData ? (
            <>
              <polyline
                points={`${xStart},${yStart} ${xHoldStart},${peakY} ${xHoldEnd},${peakY}`}
                fill="none"
                stroke={miniStroke}
                strokeWidth="1.3"
              />
              <line
                x1={xHoldEnd}
                y1={peakY}
                x2={xCoolEnd}
                y2={yCoolEnd}
                stroke={miniStroke}
                strokeWidth="1.3"
              />
              <line x1={xHoldStart} y1={peakY} x2={xHoldStart} y2={cellHeight} stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="1,1" />
              <line x1={xHoldEnd} y1={peakY} x2={xHoldEnd} y2={cellHeight} stroke="#94a3b8" strokeWidth="0.6" strokeDasharray="1,1" />
            </>
          ) : (
            <line x1={xStart} y1={20} x2={xCoolEnd} y2={20} stroke="#cbd5e1" strokeWidth="0.6" strokeDasharray="1,1" />
          )}
        </g>
      );
    }

    // Biến thể Full Chuẩn (Modal lớn / Phiếu in A4)
    const numericTemp = Number(step.temp) || 500;
    const peakY = hasData
      ? Math.max(16, Math.min(cellHeight * 0.58, cellHeight * 0.62 - ((numericTemp - 400) / 700) * (cellHeight * 0.42)))
      : cellHeight * 0.58;

    const xStart = offsetX + 8;
    const yStart = cellHeight * 0.72;
    const xHoldStart = offsetX + cellWidth * 0.32;
    const xHoldEnd = offsetX + cellWidth * 0.76;
    const xCoolEnd = offsetX + cellWidth * 0.93;
    const yCoolEnd = cellHeight * 0.78;

    const circleLabel = step.stage === 'Q' ? 'Q' : 'T';
    const subLabel =
      step.stage === 'T1' ? '1' : step.stage === 'T2' ? '2' : step.stage === 'T3' ? '3' : '';

    return (
      <g key={step.stage} className="select-none">
        {index > 0 && (
          <line
            x1={offsetX}
            y1={0}
            x2={offsetX}
            y2={cellHeight}
            stroke="#0f172a"
            strokeWidth="1.2"
          />
        )}

        {/* Biểu tượng tròn Q, T1, T2, T3 */}
        <g transform={`translate(${offsetX + 6}, 6)`}>
          <circle cx="11" cy="11" r="10" fill="none" stroke="#0f172a" strokeWidth="1.2" />
          <text
            x="11"
            y="15.5"
            textAnchor="middle"
            fontFamily="monospace"
            fontSize="12.5"
            fontWeight="bold"
            fill="#0f172a"
          >
            {circleLabel}
          </text>
          {subLabel && (
            <text
              x="25"
              y="16"
              fontSize="9.5"
              fontFamily="monospace"
              fontWeight="bold"
              fill="#64748b"
            >
              {subLabel}
            </text>
          )}
        </g>

        {hasData ? (
          <>
            <text
              x={(xHoldStart + xHoldEnd) / 2}
              y={peakY - 6}
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="13"
              fontWeight="bold"
              fill="#0f172a"
              className="tabular-nums"
            >
              {step.temp}{' '}
              <tspan fontSize="10" fontWeight="normal" fill="#334155">
                ℃
              </tspan>
            </text>

            <polyline
              points={`${xStart},${yStart} ${xHoldStart},${peakY} ${xHoldEnd},${peakY}`}
              fill="none"
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <line
              x1={xHoldEnd}
              y1={peakY}
              x2={xCoolEnd}
              y2={yCoolEnd}
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeLinecap="round"
              markerEnd="url(#heat-arrowhead)"
            />

            <line
              x1={xHoldStart}
              y1={peakY}
              x2={xHoldStart}
              y2={cellHeight - 2}
              stroke="#0f172a"
              strokeWidth="1.2"
            />
            <line
              x1={xHoldEnd}
              y1={peakY}
              x2={xHoldEnd}
              y2={cellHeight - 2}
              stroke="#0f172a"
              strokeWidth="1.2"
            />

            <text
              x={(xHoldStart + xHoldEnd) / 2}
              y={peakY + 28}
              textAnchor="middle"
              fontFamily="monospace"
              fontSize="13"
              fontWeight="bold"
              fill="#0f172a"
              className="tabular-nums"
            >
              {step.time}{' '}
              <tspan fontSize="11" fontWeight="normal" fill="#334155">
                H
              </tspan>
            </text>
          </>
        ) : (
          <>
            <polyline
              points={`${xStart},${cellHeight * 0.72} ${xHoldStart},${peakY} ${xHoldEnd},${peakY}`}
              fill="none"
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="3,3"
            />
            <line
              x1={xHoldEnd}
              y1={peakY}
              x2={xCoolEnd}
              y2={yCoolEnd}
              stroke="#94a3b8"
              strokeWidth="1.2"
              strokeLinecap="round"
              markerEnd="url(#heat-arrowhead-gray)"
            />
            <line
              x1={xHoldStart}
              y1={peakY}
              x2={xHoldStart}
              y2={cellHeight - 2}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <line
              x1={xHoldEnd}
              y1={peakY}
              x2={xHoldEnd}
              y2={cellHeight - 2}
              stroke="#cbd5e1"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          </>
        )}
      </g>
    );
  };

  return (
    <div
      className={`inline-block ${
        isMini ? 'bg-transparent' : 'bg-white'
      } ${
        showFrame ? (isMini ? 'border border-slate-300 dark:border-slate-700 rounded-xs' : 'border border-slate-900 rounded-xs shadow-2xs') : ''
      } ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        maxWidth: '100%',
      }}
    >
      <svg
        viewBox={`0 0 ${baseVbWidth} ${baseVbHeight}`}
        width="100%"
        height="100%"
        className="block overflow-visible"
        aria-label="Biểu đồ chu trình nhiệt luyện cơ khí chính xác"
      >
        <defs>
          <marker
            id="heat-arrowhead"
            markerWidth="6"
            markerHeight="6"
            refX="4"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#0f172a" />
          </marker>
          <marker
            id="heat-arrowhead-gray"
            markerWidth="6"
            markerHeight="6"
            refX="4"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 6 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {showFrame && (
          <rect
            x="0"
            y="0"
            width={baseVbWidth}
            height={baseVbHeight}
            fill="none"
            stroke={isMini ? '#334155' : '#0f172a'}
            strokeWidth={isMini ? '0.8' : '1.2'}
          />
        )}

        {steps.map((step, idx) => renderCell(step, idx))}
      </svg>
    </div>
  );
};
