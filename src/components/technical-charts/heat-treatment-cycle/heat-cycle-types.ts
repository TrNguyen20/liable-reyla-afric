export type HeatStage = 'Q' | 'T1' | 'T2' | 'T3';

export interface HeatStepParam {
  stage: HeatStage;
  temp?: number | undefined;   // Nhiệt độ (°C), e.g. 1020, 615, 540
  time?: number | undefined;   // Thời gian giữ nhiệt (Giờ/H), e.g. 2, 4.4, 5
}

export interface HeatTreatmentCycleConfig {
  steps: HeatStepParam[];
  width?: number;              // Chiều rộng tổng thể (mặc định 560px)
  height?: number;             // Chiều cao tổng thể (mặc định 90px)
  showFrame?: boolean;         // Có vẽ khung 1px xung quanh không
  className?: string;
}

/**
 * Parses shorthand string into 4 structured stages.
 * Examples:
 *   "Q: 1020°C / 2H | T1: 615°C / 4.4H | T2: 540°C / 5H"
 *   "1020/2 | 615/4.4 | 540/5"
 *   "Q:1020,2 | T1:615,4.4 | T2:540,5"
 */
export function parseHeatCycleShorthand(raw: string | null | undefined): HeatStepParam[] {
  const defaultStages: HeatStepParam[] = [
    { stage: 'Q', temp: undefined, time: undefined },
    { stage: 'T1', temp: undefined, time: undefined },
    { stage: 'T2', temp: undefined, time: undefined },
    { stage: 'T3', temp: undefined, time: undefined },
  ];

  if (!raw || !raw.trim()) {
    return defaultStages;
  }

  const parts = raw.split('|').map((s) => s.trim()).filter(Boolean);

  parts.forEach((part, index) => {
    // Check if stage is explicitly tagged (e.g. Q:, T1:, T2:, T3:)
    let stage: HeatStage = (index === 0 ? 'Q' : index === 1 ? 'T1' : index === 2 ? 'T2' : 'T3');
    const stageMatch = part.match(/^(Q|T1|T2|T3)[:\s-]+/i);
    let cleanPart = part;
    if (stageMatch && stageMatch[1]) {
      stage = stageMatch[1].toUpperCase() as HeatStage;
      cleanPart = part.slice(stageMatch[0].length).trim();
    }

    // Extract numbers: e.g. "1020°C / 2H" or "1020/2" or "615, 4.4"
    const numberMatches = cleanPart.match(/\d+(\.\d+)?/g);
    if (numberMatches && numberMatches.length >= 1) {
      const tempVal = parseFloat(numberMatches[0]!);
      const timeVal = numberMatches.length >= 2 ? parseFloat(numberMatches[1]!) : undefined;

      const target = defaultStages.find((s) => s.stage === stage);
      if (target) {
        target.temp = tempVal;
        target.time = timeVal;
      }
    }
  });

  return defaultStages;
}

/** Formats structured stages back into readable engineering shorthand */
export function formatHeatCycleShorthand(steps: HeatStepParam[]): string {
  return steps
    .filter((s) => s.temp !== undefined && s.time !== undefined)
    .map((s) => `${s.stage}: ${s.temp}°C / ${s.time}H`)
    .join(' | ');
}
