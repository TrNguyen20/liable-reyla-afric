import type { QTItem } from './dynamo-data';
import { validDate } from './dynamo-rules';

export interface HrcTarget {
  min: number;
  max: number;
  target: number;
  raw: string;
}

export type HrcClassification = 'IN_RANGE' | 'UNDER_HARD' | 'OVER_HARD' | 'UNKNOWN';

export interface HrcResult {
  actual: number | null;
  target: HrcTarget | null;
  classification: HrcClassification;
  delta: number | null; // actual - target.target
}

export interface MaterialMetric {
  material: string;
  lots: number;
  totalKg: number;
  overdueLots: number;
  fpyRate: number | null;
}

export interface VendorCycleMetric {
  vendor: string;
  completedLots: number;
  avgCycleDays: number | null;
  minCycleDays: number | null;
  maxCycleDays: number | null;
}

export interface MetallurgyAnalytics {
  totalLots: number;
  measuredLots: number;
  fpy: {
    passed: number;
    failed: number;
    evaluated: number;
    rate: number | null; // 0.0 - 1.0
  };
  hrcDistribution: {
    under: number;
    inRange: number;
    over: number;
    unknown: number;
  };
  avgHrcDelta: number | null;
  cycleTime: {
    totalCompleted: number;
    measurableLots: number;
    avgDays: number | null;
  };
  vendorLeadTimes: VendorCycleMetric[];
  materials: MaterialMetric[];
}

/**
 * Bóc tách chuỗi độ cứng yêu cầu kỹ thuật:
 * Hỗ trợ các mẫu: "58-62 HRC", "58 - 62", "58~62", "60 HRC", ">= 60", "HRC 55-60"
 */
export function parseHrcTarget(val?: string): HrcTarget | null {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim().replace(/\s+/g, ' ');
  
  // Dải giá trị ví dụ "58-62", "58 - 62", "58~62", "58 - 60 HRC"
  const rangeMatch = clean.match(/(\d+(?:\.\d+)?)\s*(?:-|~|–|to)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]!);
    const max = parseFloat(rangeMatch[2]!);
    if (!isNaN(min) && !isNaN(max) && min > 0 && max >= min) {
      return { min, max, target: (min + max) / 2, raw: val };
    }
  }

  // Giá trị đơn kèm HRC ví dụ "60 HRC", ">= 58", "55HRC"
  const singleMatch = clean.match(/(?:>=|>|<=|<)?\s*(\d+(?:\.\d+)?)\s*(?:hrc)?/i);
  if (singleMatch) {
    const num = parseFloat(singleMatch[1]!);
    if (!isNaN(num) && num > 10 && num < 80) { // Dải HRC thực tế hợp lệ
      return { min: num - 1, max: num + 1, target: num, raw: val };
    }
  }

  return null;
}

/**
 * Bóc tách kết quả đo độ cứng HRC thực tế từ xưởng/vendor:
 * Hỗ trợ: "60.5", "59 HRC", "60,5", "HRC 61"
 */
export function parseHrcActual(val?: string): number | null {
  if (!val || typeof val !== 'string') return null;
  const clean = val.trim().replace(',', '.');
  const match = clean.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const num = parseFloat(match[1]!);
  return (!isNaN(num) && num > 10 && num < 85) ? num : null;
}

/**
 * Đánh giá độ lệch HRC và phân loại đạt chuẩn kỹ thuật luyện kim
 */
export function evaluateHrc(doCungReq?: string, hrcActualRaw?: string): HrcResult {
  const target = parseHrcTarget(doCungReq);
  const actual = parseHrcActual(hrcActualRaw);

  if (actual === null || target === null) {
    return {
      actual,
      target,
      classification: 'UNKNOWN',
      delta: null,
    };
  }

  const delta = Math.round((actual - target.target) * 10) / 10;

  if (actual < target.min) {
    return { actual, target, classification: 'UNDER_HARD', delta };
  }
  if (actual > target.max) {
    return { actual, target, classification: 'OVER_HARD', delta };
  }
  return { actual, target, classification: 'IN_RANGE', delta };
}

const DAY_MS = 86400000;

/**
 * Phân tích dữ liệu tổng thể Kỹ thuật Luyện kim & Chu kỳ quay vòng (Turnaround Time)
 */
export function computeMetallurgyAnalytics(items: QTItem[]): MetallurgyAnalytics {
  let measuredLots = 0;
  let qcPassed = 0;
  let qcFailed = 0;
  let totalEvaluated = 0;

  let underHard = 0;
  let inRangeHard = 0;
  let overHard = 0;
  let unknownHard = 0;

  let sumDelta = 0;
  let countDelta = 0;

  // Lead time map theo vendor
  const vendorCycleMap: Record<string, { totalDays: number; count: number; min: number; max: number }> = {};
  // Phân bổ mác thép
  const materialMap: Record<string, { lots: number; kg: number; overdue: number; passed: number; measured: number }> = {};

  let totalMeasurableCycleLots = 0;
  let sumCycleDays = 0;
  let totalCompletedLots = 0;

  for (const item of items) {
    const isStocked = item.TrangThai === 'Đã nhập kho';
    if (isStocked) {
      totalCompletedLots++;
    }

    // 1. Phân tích Lead Time (Turnaround Days) từ ngay_gui_qt -> ngay_nhan
    if (validDate(item.ngay_gui_qt) && validDate(item.ngay_nhan)) {
      const sendTime = new Date(item.ngay_gui_qt + 'T00:00:00').getTime();
      const recvTime = new Date(item.ngay_nhan + 'T00:00:00').getTime();
      const diffDays = Math.max(0, Math.round((recvTime - sendTime) / DAY_MS));

      totalMeasurableCycleLots++;
      sumCycleDays += diffDays;

      const vendor = item.cty_QT || item.cty_qt || 'KHÁC';
      if (!vendorCycleMap[vendor]) {
        vendorCycleMap[vendor] = { totalDays: 0, count: 0, min: diffDays, max: diffDays };
      }
      vendorCycleMap[vendor].totalDays += diffDays;
      vendorCycleMap[vendor].count++;
      if (diffDays < vendorCycleMap[vendor].min) vendorCycleMap[vendor].min = diffDays;
      if (diffDays > vendorCycleMap[vendor].max) vendorCycleMap[vendor].max = diffDays;
    }

    // 2. Phân tích HRC & Đạt chuẩn kỹ thuật
    const hrcEval = evaluateHrc(item.do_cung, item.ncc_ket_qua_hrc);
    if (hrcEval.actual !== null) {
      measuredLots++;
      if (hrcEval.delta !== null) {
        sumDelta += hrcEval.delta;
        countDelta++;
      }

      if (hrcEval.classification === 'IN_RANGE') inRangeHard++;
      else if (hrcEval.classification === 'UNDER_HARD') underHard++;
      else if (hrcEval.classification === 'OVER_HARD') overHard++;
      else unknownHard++;
    }

    // 3. First Pass Yield (FPY)
    const qcResult = (item.ncc_ket_qua_qc || '').toUpperCase().trim();
    let isPass: boolean | null = null;

    if (qcResult.includes('PASS') || qcResult.includes('ĐẠT') || qcResult.includes('OK')) {
      isPass = true;
    } else if (qcResult.includes('FAIL') || qcResult.includes('NG') || qcResult.includes('LỖI')) {
      isPass = false;
    } else if (hrcEval.classification !== 'UNKNOWN') {
      // Nếu không có ghi nhận ncc_ket_qua_qc nhưng đo được HRC
      isPass = hrcEval.classification === 'IN_RANGE';
    } else if (isStocked) {
      // Lô đã nhập kho mà không có ghi nhận NG
      isPass = true;
    }

    if (isPass !== null) {
      totalEvaluated++;
      if (isPass) qcPassed++;
      else qcFailed++;
    }

    // 4. Mác thép (Material)
    const matKey = (item.vat_lieu || 'CHƯA RÕ').trim().toUpperCase();
    if (!materialMap[matKey]) {
      materialMap[matKey] = { lots: 0, kg: 0, overdue: 0, passed: 0, measured: 0 };
    }
    materialMap[matKey].lots++;
    materialMap[matKey].kg += item.kg_lot || item.kg_Lot || 0;
    if (item.han_tra && !item.han_tra_est && validDate(item.han_tra)) {
      const dueTime = new Date(item.han_tra + 'T00:00:00').getTime();
      const nowTime = new Date().setHours(0, 0, 0, 0);
      if (!isStocked && nowTime > dueTime) {
        materialMap[matKey].overdue++;
      }
    }
    if (isPass !== null) {
      materialMap[matKey].measured++;
      if (isPass) materialMap[matKey].passed++;
    }
  }

  // Chuyển đổi vendor lead times
  const vendorLeadTimes: VendorCycleMetric[] = Object.entries(vendorCycleMap).map(([vendor, data]) => ({
    vendor,
    completedLots: data.count,
    avgCycleDays: data.count > 0 ? Math.round((data.totalDays / data.count) * 10) / 10 : null,
    minCycleDays: data.count > 0 ? data.min : null,
    maxCycleDays: data.count > 0 ? data.max : null,
  })).sort((a, b) => b.completedLots - a.completedLots);

  // Chuyển đổi material list
  const materials: MaterialMetric[] = Object.entries(materialMap).map(([material, d]) => ({
    material,
    lots: d.lots,
    totalKg: Math.round(d.kg * 100) / 100,
    overdueLots: d.overdue,
    fpyRate: d.measured > 0 ? Math.round((d.passed / d.measured) * 1000) / 10 : null,
  })).sort((a, b) => b.totalKg - a.totalKg);

  return {
    totalLots: items.length,
    measuredLots,
    fpy: {
      passed: qcPassed,
      failed: qcFailed,
      evaluated: totalEvaluated,
      rate: totalEvaluated > 0 ? Math.round((qcPassed / totalEvaluated) * 1000) / 1000 : null,
    },
    hrcDistribution: {
      under: underHard,
      inRange: inRangeHard,
      over: overHard,
      unknown: unknownHard,
    },
    avgHrcDelta: countDelta > 0 ? Math.round((sumDelta / countDelta) * 10) / 10 : null,
    cycleTime: {
      totalCompleted: totalCompletedLots,
      measurableLots: totalMeasurableCycleLots,
      avgDays: totalMeasurableCycleLots > 0 ? Math.round((sumCycleDays / totalMeasurableCycleLots) * 10) / 10 : null,
    },
    vendorLeadTimes,
    materials,
  };
}
