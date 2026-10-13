/**
 * DYNAMO-MES-MOD-05 | Materials Technical Master & Metallurgy Specification
 * Standard compliance: ISA-101 (Industrial Precision) & Poka-Yoke Masking
 */

export type MaterialCategory = 'HOT_WORK' | 'COLD_WORK' | 'SPECIALTY';

export interface MaterialSpec {
  code: string;               // Top 6 core steel: SKD61, DAC, DAC-MAGIC, SKD11, DIEVAR, DH31-EX
  jisAisi: string;            // Standard classification (JIS / AISI / DIN)
  category: MaterialCategory; // Heat treatment metallurgical category
  categoryLabel: string;      // Vietnamese descriptive label
  hrcMin: number;             // Standard heat treat lower bound (40-62 scale)
  hrcMax: number;             // Standard heat treat upper bound (40-62 scale)
  hrcTargetPopular: string;   // Benchmark reference range
  primaryApplication: string; // Industrial shopfloor application
  typicalHeatTreatment: string;// Heat treatment process spec
  aliases: string[];          // Equivalent grades and aliases found in industry datasets
  producer: string;           // Steel maker / origin specification
  advantages: string;         // Metallurgical key advantages
}

export const TOP_MATERIALS: MaterialSpec[] = [
  {
    code: 'SKD61',
    jisAisi: 'JIS SKD61 / AISI H13 / DIN 1.2344',
    category: 'HOT_WORK',
    categoryLabel: 'Thép dụng cụ gia công nóng chủ lực',
    hrcMin: 46,
    hrcMax: 52,
    hrcTargetPopular: '48–52 HRC',
    primaryApplication: 'Pin khuôn, chốt đẩy, ty trượt, insert lõi khuôn chịu mài mòn & sốc nhiệt',
    typicalHeatTreatment: 'Tôi chân không (1020–1050°C) + Ram 2–3 lần (560–620°C)',
    aliases: ['SKD61', 'H13', 'AISI H13', 'SKD61-T', '1.2344', 'SKD-61'],
    producer: 'JIS Tiêu chuẩn / Daido / Hitachi',
    advantages: 'Độ bền nhiệt cao, chống rão xuất sắc, phổ biến nhất trong hệ thống khuôn đúc',
  },
  {
    code: 'DAC',
    jisAisi: 'Hitachi DAC (JIS SKD61 Cải tiến)',
    category: 'HOT_WORK',
    categoryLabel: 'Thép khuôn đúc áp lực tiêu chuẩn',
    hrcMin: 44,
    hrcMax: 48,
    hrcTargetPopular: '44–48 HRC',
    primaryApplication: 'Insert, vỏ khuôn đúc áp lực nhôm/kẽm, chi tiết tạo hình nhiệt độ cao',
    typicalHeatTreatment: 'Tôi chân không (1010–1030°C) + Ram kép (550–600°C) khử ứng suất',
    aliases: ['DAC', 'HITACHI DAC', 'DAC-1', 'JIS SKD61-D'],
    producer: 'Hitachi Metals / Proterial (Nhật Bản)',
    advantages: 'Độ dẻo dai cao, cân bằng tối ưu giữa chống mài mòn và kháng nứt nhiệt bề mặt',
  },
  {
    code: 'DAC-MAGIC',
    jisAisi: 'Hitachi DAC-MAGIC (Bản quyền Hitachi)',
    category: 'SPECIALTY',
    categoryLabel: 'Thép khuôn nóng cao cấp (Chống nứt nhiệt)',
    hrcMin: 42,
    hrcMax: 46,
    hrcTargetPopular: '42–46 HRC',
    primaryApplication: 'Lõi khuôn đúc chính xác, insert chịu chu kỳ ép tốc độ cao & sốc nhiệt lớn',
    typicalHeatTreatment: 'Tôi chân không đẳng nhiệt điều khiển + Ram 3 lần khử triệt để ứng suất',
    aliases: ['DAC-MAGIC', 'DAC MAGIC', 'DACMAGIC', 'MAGIC-1'],
    producer: 'Hitachi Metals / Proterial (Nhật Bản)',
    advantages: 'Khả năng chống nứt nóng (heat check) vượt trội 1.5x so với DAC truyền thống',
  },
  {
    code: 'SKD11',
    jisAisi: 'JIS SKD11 / AISI D2 / DIN 1.2379',
    category: 'COLD_WORK',
    categoryLabel: 'Thép làm khuôn dập nguội (Chống mài mòn)',
    hrcMin: 56,
    hrcMax: 62,
    hrcTargetPopular: '58–60 HRC',
    primaryApplication: 'Chày dập, cối dập vuốt, dao xén mép, dưỡng kiểm, con lăn cán chịu tải lớn',
    typicalHeatTreatment: 'Tôi chân không (1010–1040°C) + Ram nhiệt độ thấp hoặc cao',
    aliases: ['SKD11', 'D2', 'DC11', 'SLD', '1.2379', 'SKD-11'],
    producer: 'JIS Tiêu chuẩn / Daido DC11 / Hitachi SLD',
    advantages: 'Hàm lượng Crom-Carbon cao cho khả năng chống mài mòn ma sát cơ học cực lớn',
  },
  {
    code: 'DIEVAR',
    jisAisi: 'Uddeholm DIEVAR (Đẳng cấp Premium)',
    category: 'SPECIALTY',
    categoryLabel: 'Thép hợp kim cao cấp đúc Mega-Casting',
    hrcMin: 44,
    hrcMax: 50,
    hrcTargetPopular: '46–48 HRC',
    primaryApplication: 'Khuôn đúc áp lực cỡ lớn (Giga/Mega casting), lõi khuôn ô tô chịu tải va đập',
    typicalHeatTreatment: 'Tôi chân không khí nén cao áp + Ram 3 lần tiêu chuẩn Uddeholm Spec',
    aliases: ['DIEVAR', 'UDDEHOLM DIEVAR', 'DIE-VAR', 'BOHLER DIEVAR'],
    producer: 'Uddeholm / Böhler (Thụy Điển)',
    advantages: 'Độ dẻo dai đẳng hướng cực cao, triệt tiêu hoàn toàn nguy cơ nứt gãy thảm khốc',
  },
  {
    code: 'DH31-EX',
    jisAisi: 'Daido DH31-EX / DHA-WORLD',
    category: 'HOT_WORK',
    categoryLabel: 'Thép khuôn nóng độ dẻo dai siêu cao',
    hrcMin: 46,
    hrcMax: 51,
    hrcTargetPopular: '47–50 HRC',
    primaryApplication: 'Khuôn đúc chi tiết thành mỏng, insert chịu ứng suất va đập và mài mòn',
    typicalHeatTreatment: 'Tôi chân không kiểm soát biến dạng + Ram 3 lần đẳng nhiệt',
    aliases: ['DH31-EX', 'DH31', 'DHA-WORLD', 'DHA1', 'DH31EX'],
    producer: 'Daido Steel (Nhật Bản)',
    advantages: 'Độ dẻo dai gấp 2 lần SKD61, chống nứt xé chân rãnh và tăng tuổi thọ khuôn',
  },
];

/**
 * Normalizes raw string for fuzzy metallurgical matching
 */
export function cleanCode(val: string): string {
  return val.trim().toUpperCase().replace(/[\s_\/]/g, '-');
}

/**
 * Matches a raw material code from dataset against the Top 6 master specs
 */
export function findMasterSpec(rawCode: string): MaterialSpec | undefined {
  if (!rawCode) return undefined;
  const clean = cleanCode(rawCode);
  return TOP_MATERIALS.find(m => {
    if (cleanCode(m.code) === clean) return true;
    return m.aliases.some(a => cleanCode(a) === clean);
  });
}

/**
 * Checks if a dataset item material matches target material (including aliases)
 */
export function isMaterialEquivalent(rawMaterial: string, targetCode: string): boolean {
  if (!rawMaterial || !targetCode) return false;
  const targetSpec = findMasterSpec(targetCode);
  const targetClean = cleanCode(targetCode);

  if (targetSpec) {
    const rawSpec = findMasterSpec(rawMaterial);
    if (rawSpec && rawSpec.code === targetSpec.code) return true;
    const cleanRaw = cleanCode(rawMaterial);
    return targetSpec.aliases.some(a => cleanCode(a) === cleanRaw) || cleanRaw === targetClean;
  }

  return cleanCode(rawMaterial) === targetClean;
}

/**
 * Parses numerical centroid from HRC strings like '48–52 HRC', '47±1', '49 HRC', '50'
 */
export function parseHrcCentroid(raw: string): number | null {
  if (!raw) return null;
  const s = raw.replace(/HRC/gi, '').trim();

  // Pattern like 47±1 or 47+/-1
  const plusMinus = s.match(/(\d+(?:\.\d+)?)\s*(?:±|\+\/-)\s*(\d+(?:\.\d+)?)/);
  if (plusMinus) {
    const base = parseFloat(plusMinus[1]);
    return isNaN(base) ? null : base;
  }

  // Pattern like 48-52 or 48–52 or 48~52
  const range = s.match(/(\d+(?:\.\d+)?)\s*[-–~to]\s*(\d+(?:\.\d+)?)/i);
  if (range) {
    const low = parseFloat(range[1]);
    const high = parseFloat(range[2]);
    if (!isNaN(low) && !isNaN(high)) {
      return (low + high) / 2;
    }
  }

  // Single number
  const single = s.match(/(\d+(?:\.\d+)?)/);
  if (single) {
    const v = parseFloat(single[1]);
    return isNaN(v) ? null : v;
  }

  return null;
}

/**
 * Calculates the most requested HRC specification from an array of hardness strings
 */
export function extractPopularHrc(hrcList: string[]): {
  label: string;
  value: number | null;
  count: number;
} {
  const counts = new Map<string, number>();
  for (const h of hrcList) {
    const trimmed = h.trim();
    if (!trimmed || trimmed === '—' || trimmed === 'Chưa rõ') continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }

  if (counts.size === 0) {
    return { label: 'Chưa có dữ liệu', value: null, count: 0 };
  }

  let bestLabel = '';
  let bestCount = -1;
  for (const [lbl, cnt] of counts.entries()) {
    if (cnt > bestCount) {
      bestCount = cnt;
      bestLabel = lbl;
    }
  }

  return {
    label: bestLabel,
    value: parseHrcCentroid(bestLabel),
    count: bestCount,
  };
}
