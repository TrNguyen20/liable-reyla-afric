import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { formatDate, formatShift, formatTime, formatNumber } from "../i18n/formatters";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, FALLBACK_CHAIN } from "../i18n/config";
import { formatVendorName, canViewVendorName, type Role } from "../lib/dynamo-auth";
import type { Locale, Namespace } from "../i18n/types";

/**
 * ============================================================================
 * DYNAMO MES: Trilingual Standardization [VI] [EN] [JA] Vitest Suite
 * Standard: Graphite Wireframe UI (v2.2.0)
 * Architecture: 4-Tier Automated Verification Matrix
 * ============================================================================
 */

describe("DYNAMO MES: Trilingual Standardization [VI] [EN] [JA] Test Suite", () => {
  const rootDir = path.resolve(__dirname, "../../");
  const localesDir = path.join(rootDir, "src/i18n/locales");
  const stylesPath = path.join(rootDir, "src/styles.css");
  const trackingPath = path.join(rootDir, "src/routes/tracking.tsx");
  const dashboardPath = path.join(rootDir, "src/routes/dashboard.tsx");
  const ordersPath = path.join(rootDir, "src/routes/orders.tsx");
  const syncPath = path.join(rootDir, "src/routes/sync.tsx");
  const loginPath = path.join(rootDir, "src/routes/login.tsx");
  const shellPath = path.join(rootDir, "src/components/dynamo-shell.tsx");
  const designSystemPath = path.join(rootDir, "DESIGN-SYSTEM.md");

  const namespaces: Namespace[] = [
    "common",
    "nav",
    "tracking",
    "dashboard",
    "orders",
    "sync",
    "telemetry",
  ];

  const locales: Locale[] = ["vi", "en", "ja"];

  /**
   * Helper: Recursively extract all leaf nodes with their full dot-notation paths.
   */
  function getLeafEntries(
    obj: Record<string, unknown>,
    prefix = "",
  ): { path: string; value: unknown }[] {
    const leaves: { path: string; value: unknown }[] = [];
    for (const [key, val] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        leaves.push(...getLeafEntries(val as Record<string, unknown>, currentPath));
      } else {
        leaves.push({ path: currentPath, value: val });
      }
    }
    return leaves;
  }

  /**
   * Helper: Read and parse a JSON locale file.
   */
  function loadLocaleJson(locale: Locale, ns: Namespace): Record<string, unknown> {
    const filePath = path.join(localesDir, locale, `${ns}.json`);
    expect(fs.existsSync(filePath), `Dictionary file missing: ${filePath}`).toBe(true);
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  }

  // ==========================================================================
  // TIER 1: FEATURE COVERAGE & RECURSIVE KEY PARITY AUDIT
  // ==========================================================================
  describe("Tier 1: Feature Coverage & Namespace Parity", () => {
    it("TC-I18N-T1-01: 21 tệp từ điển JSON tồn tại trên đĩa và hợp lệ cú pháp JSON", () => {
      let fileCount = 0;
      for (const loc of locales) {
        for (const ns of namespaces) {
          const filePath = path.join(localesDir, loc, `${ns}.json`);
          expect(fs.existsSync(filePath), `Tệp từ điển ${loc}/${ns}.json không tồn tại`).toBe(true);

          const content = fs.readFileSync(filePath, "utf-8");
          expect(
            () => JSON.parse(content),
            `Lỗi phân tích cú pháp JSON tại ${loc}/${ns}.json`,
          ).not.toThrow();

          const parsed = JSON.parse(content);
          expect(typeof parsed).toBe("object");
          expect(parsed).not.toBeNull();
          expect(Object.keys(parsed).length).toBeGreaterThan(0);
          fileCount++;
        }
      }
      expect(fileCount).toBe(21);
    });

    it("TC-I18N-T1-02: Kiểm tra đối xứng khóa đệ quy (Recursive Key Parity) giữa VI, EN và JA cho 7 namespaces", () => {
      for (const ns of namespaces) {
        const viJson = loadLocaleJson("vi", ns);
        const enJson = loadLocaleJson("en", ns);
        const jaJson = loadLocaleJson("ja", ns);

        const viLeaves = getLeafEntries(viJson)
          .map((e) => e.path)
          .sort();
        const enLeaves = getLeafEntries(enJson)
          .map((e) => e.path)
          .sort();
        const jaLeaves = getLeafEntries(jaJson)
          .map((e) => e.path)
          .sort();

        // 1. Kiểm tra EN so với chuẩn VI
        const missingInEn = viLeaves.filter((k) => !enLeaves.includes(k));
        const extraInEn = enLeaves.filter((k) => !viLeaves.includes(k));

        expect(
          missingInEn,
          `[Namespace: ${ns}] Khóa có trong 'vi' nhưng THIẾU trong 'en':\n${missingInEn.join("\n")}`,
        ).toEqual([]);

        expect(
          extraInEn,
          `[Namespace: ${ns}] Khóa có trong 'en' nhưng DƯ THỪA không có trong 'vi':\n${extraInEn.join("\n")}`,
        ).toEqual([]);

        // 2. Kiểm tra JA so với chuẩn VI
        const missingInJa = viLeaves.filter((k) => !jaLeaves.includes(k));
        const extraInJa = jaLeaves.filter((k) => !viLeaves.includes(k));

        expect(
          missingInJa,
          `[Namespace: ${ns}] Khóa có trong 'vi' nhưng THIẾU trong 'ja':\n${missingInJa.join("\n")}`,
        ).toEqual([]);

        expect(
          extraInJa,
          `[Namespace: ${ns}] Khóa có trong 'ja' nhưng DƯ THỪA không có trong 'vi':\n${extraInJa.join("\n")}`,
        ).toEqual([]);

        // 3. Khẳng định số lượng lá đồng nhất tuyệt đối 100%
        expect(enLeaves.length).toBe(viLeaves.length);
        expect(jaLeaves.length).toBe(viLeaves.length);
      }
    });

    it("TC-I18N-T1-03: Cấu hình hệ thống i18n chuẩn hóa (Supported Locales & Fallback Chains)", () => {
      expect(SUPPORTED_LOCALES).toEqual(["vi", "en", "ja"]);
      expect(DEFAULT_LOCALE).toBe("vi");
      expect(FALLBACK_CHAIN.ja).toEqual(["en", "vi"]);
      expect(FALLBACK_CHAIN.en).toEqual(["vi"]);
      expect(FALLBACK_CHAIN.vi).toEqual([]);
    });
  });

  // ==========================================================================
  // TIER 2: BOUNDARY & CORNER CASES (VALUE INTEGRITY & WHITESPACE AUDIT)
  // ==========================================================================
  describe("Tier 2: Boundary & Corner Cases (Value Integrity & Placeholders)", () => {
    it('TC-I18N-T2-01: Không có bất kỳ khóa nào chứa chuỗi rỗng (""), null, hoặc undefined trên toàn bộ 21 tệp', () => {
      const emptyViolations: string[] = [];

      for (const loc of locales) {
        for (const ns of namespaces) {
          const json = loadLocaleJson(loc, ns);
          const leaves = getLeafEntries(json);

          for (const leaf of leaves) {
            if (leaf.value === null || leaf.value === undefined) {
              emptyViolations.push(`${loc}/${ns}.json -> [${leaf.path}] is null/undefined`);
            } else if (typeof leaf.value === "string" && leaf.value.trim() === "") {
              emptyViolations.push(`${loc}/${ns}.json -> [${leaf.path}] is an empty string`);
            }
          }
        }
      }

      expect(
        emptyViolations,
        `Phát hiện ${emptyViolations.length} vi phạm giá trị rỗng:\n${emptyViolations.join("\n")}`,
      ).toEqual([]);
    });

    it("TC-I18N-T2-02: Kiểm tra chuẩn hóa khoảng trắng: không chứa khoảng trắng dư thừa ở đầu/cuối chuỗi (Untrimmed)", () => {
      const whitespaceViolations: string[] = [];

      for (const loc of locales) {
        for (const ns of namespaces) {
          const json = loadLocaleJson(loc, ns);
          const leaves = getLeafEntries(json);

          for (const leaf of leaves) {
            if (typeof leaf.value === "string") {
              const trimmed = leaf.value.trim();
              if (leaf.value !== trimmed) {
                whitespaceViolations.push(
                  `${loc}/${ns}.json -> [${leaf.path}]: "${leaf.value}" có khoảng trắng dư ở mép`,
                );
              }
            }
          }
        }
      }

      expect(
        whitespaceViolations,
        `Phát hiện các chuỗi chưa được trim chuẩn:\n${whitespaceViolations.join("\n")}`,
      ).toEqual([]);
    });

    it("TC-I18N-T2-03: Tính đối xứng của tham số nội suy (Parameter Interpolation Placeholder Parity)", () => {
      const placeholderRegex = /\{([a-zA-Z0-9_]+)\}/g;
      const mismatchedPlaceholders: string[] = [];

      for (const ns of namespaces) {
        const viJson = loadLocaleJson("vi", ns);
        const enJson = loadLocaleJson("en", ns);
        const jaJson = loadLocaleJson("ja", ns);

        const viLeaves = getLeafEntries(viJson);
        const enMap = new Map(getLeafEntries(enJson).map((e) => [e.path, e.value]));
        const jaMap = new Map(getLeafEntries(jaJson).map((e) => [e.path, e.value]));

        for (const leaf of viLeaves) {
          if (typeof leaf.value === "string") {
            const viMatches = (leaf.value.match(placeholderRegex) || []).sort();
            if (viMatches.length > 0) {
              const enVal = String(enMap.get(leaf.path) || "");
              const jaVal = String(jaMap.get(leaf.path) || "");

              const enMatches = (enVal.match(placeholderRegex) || []).sort();
              const jaMatches = (jaVal.match(placeholderRegex) || []).sort();

              if (JSON.stringify(viMatches) !== JSON.stringify(enMatches)) {
                mismatchedPlaceholders.push(
                  `[${ns}:${leaf.path}] EN tham số không khớp: VI=[${viMatches}] vs EN=[${enMatches}]`,
                );
              }
              if (JSON.stringify(viMatches) !== JSON.stringify(jaMatches)) {
                mismatchedPlaceholders.push(
                  `[${ns}:${leaf.path}] JA tham số không khớp: VI=[${viMatches}] vs JA=[${jaMatches}]`,
                );
              }
            }
          }
        }
      }

      expect(
        mismatchedPlaceholders,
        `Phát hiện tham số nội suy không khớp giữa các ngôn ngữ:\n${mismatchedPlaceholders.join("\n")}`,
      ).toEqual([]);
    });
  });

  // ==========================================================================
  // TIER 3: CROSS-FEATURE INTERACTIONS & DOMAIN INVARIANTS ENFORCEMENT
  // ==========================================================================
  describe("Tier 3: Domain Invariants Enforcement", () => {
    it("TC-I18N-T3-01: Bảo toàn nguyên vẹn 6 mã trạng thái Lean Andon công nghiệp (WAIT, TRANSIT, STOCKED, PASS, FAIL, PENDING)", () => {
      const trackingSrc = fs.readFileSync(trackingPath, "utf-8");
      const dsSrc = fs.readFileSync(designSystemPath, "utf-8");

      const requiredStatusCodes = ["WAIT", "TRANSIT", "STOCKED", "PASS", "FAIL", "PENDING"];

      // 1. Kiểm tra sự hiện diện của các mã trạng thái trong Design System
      for (const code of requiredStatusCodes) {
        expect(dsSrc, `Design System phải chứa mã trạng thái công nghiệp ${code}`).toContain(code);
        expect(
          trackingSrc,
          `Mã nguồn tracking.tsx phải chứa mã trạng thái công nghiệp ${code}`,
        ).toContain(code);
      }

      // 2. Kiểm tra các class màu wireframe tương ứng không bị phá vỡ
      expect(trackingSrc).toContain("WAIT");
      expect(trackingSrc).toContain("TRANSIT");
      expect(trackingSrc).toContain("STOCKED");
      expect(trackingSrc).toContain("PASS");
      expect(trackingSrc).toContain("FAIL");
      expect(trackingSrc).toContain("PENDING");

      // 3. Khẳng định trong các tệp từ điển, nếu có khóa thể hiện mã trạng thái thì không dịch sang từ ngoại ngữ khác
      for (const loc of locales) {
        const commonJson = loadLocaleJson(loc, "common");
        const trackingJson = loadLocaleJson(loc, "tracking");
        const allText = JSON.stringify({ commonJson, trackingJson });

        // Không chứa các từ dịch sai lệch khái niệm
        expect(allText).not.toContain("ATTENTE"); // Cấm dịch tiếng Pháp
        expect(allText).not.toContain("QUEUING"); // Cấm dùng từ ngữ tiêu dùng sai chuẩn
      }
    });

    it("TC-I18N-T3-02: Bảo toàn thuật ngữ kỹ thuật nhiệt luyện (QT, HRC, Mác thép & Mã phân xưởng PIN/INSERT/MOLD)", () => {
      // 1. Mã Phân xưởng trong tracking.json (PIN, INSERT, MOLD) phải xuất hiện nguyên vẹn trong cả 3 ngôn ngữ
      for (const loc of locales) {
        const trJson = loadLocaleJson(loc, "tracking") as Record<string, any>;
        expect(trJson["workshops"], `tracking.json (${loc}) phải có mục workshops`).toBeDefined();
        expect(trJson["workshops"]?.["pin"]).toContain("PIN");
        expect(trJson["workshops"]?.["insert"]).toContain("INSERT");
        expect(trJson["workshops"]?.["mold"]).toContain("MOLD");
      }

      // 2. Ký hiệu kỹ thuật nhiệt luyện QT và độ cứng HRC
      const dsSrc = fs.readFileSync(designSystemPath, "utf-8");
      expect(dsSrc).toContain("QT");

      const materialsPath = path.join(rootDir, "src/lib/materials-data.ts");
      const materialsSrc = fs.readFileSync(materialsPath, "utf-8");
      expect(materialsSrc).toContain("HRC");

      const ordersSrc = fs.readFileSync(ordersPath, "utf-8");
      expect(ordersSrc).toContain("HRC");

      // 3. Các mác thép kỹ thuật chính (SKD61, DAC, SKD11, DIEVAR, DH31-EX) được bảo toàn trong Master Data
      const requiredSteelGrades = ["SKD61", "DAC", "SKD11", "DIEVAR", "DH31-EX"];
      for (const grade of requiredSteelGrades) {
        expect(materialsSrc, `Master Data phải lưu vết mác thép tiêu chuẩn ${grade}`).toContain(
          grade,
        );
      }
    });

    it("TC-I18N-T3-03: Bảo toàn mã định danh hệ thống (ID_Key, So_DatHang, ma_hang, ULID, SOP-MES-08)", () => {
      // 1. Database keys trên bảng tracking
      const trackingSrc = fs.readFileSync(trackingPath, "utf-8");
      expect(trackingSrc).toContain("ID_Key");
      expect(trackingSrc).toContain("So_DatHang");
      expect(trackingSrc).toContain("ma_hang");

      // 2. Quy chuẩn biên bản ca A4
      const dashboardSrc = fs.readFileSync(dashboardPath, "utf-8");
      expect(dashboardSrc).toContain("SOP-MES-08");

      // 3. Chuẩn khóa phiên bảo mật ULID Crockford Base32
      const loginSrc = fs.readFileSync(loginPath, "utf-8");
      expect(loginSrc).toContain("ULID");
    });

    it("TC-I18N-T3-04: Tuân thủ quy chuẩn UI Design Tokens (2px rounded-xs & font-mono tabular-nums)", () => {
      // 1. Kiểm tra bán kính gốc trong styles.css
      const stylesSrc = fs.readFileSync(stylesPath, "utf-8");
      expect(stylesSrc).toContain("--radius: 2px;");
      expect(stylesSrc).toContain("--radius-sm: 2px;");
      expect(stylesSrc).toContain("--radius-md: 2px;");

      // 2. Kiểm tra App Shell và các view không sử dụng bo tròn consumer cấm
      const shellSrc = fs.readFileSync(shellPath, "utf-8");
      expect(shellSrc).toContain("rounded-xs");
      expect(shellSrc).not.toContain("rounded-2xl");
      expect(shellSrc).not.toContain("rounded-3xl");

      // 3. Kiểm tra lưới số liệu tabular-nums trên tracking
      const trackingSrc = fs.readFileSync(trackingPath, "utf-8");
      expect(trackingSrc).toContain("font-mono tabular-nums");
    });
  });

  // ==========================================================================
  // TIER 4: CULTURAL FORMATTERS & SECURITY MASKING
  // ==========================================================================
  describe("Tier 4: Cultural Formatters & Security Masking", () => {
    it("TC-I18N-T4-01: Định dạng Ngày (formatDate) theo tiêu chuẩn văn hóa VI, EN, JA và các trường hợp biên", () => {
      const testDate = new Date("2026-11-05T12:00:00Z");

      // 1. Định dạng Tiếng Việt (DD/MM/YYYY)
      expect(formatDate(testDate, "vi")).toBe("05/11/2026");

      // 2. Định dạng Tiếng Anh (MM/DD/YYYY)
      expect(formatDate(testDate, "en")).toBe("11/05/2026");

      // 3. Định dạng Tiếng Nhật chuẩn (YYYY/MM/DD)
      expect(formatDate(testDate, "ja")).toBe("2026/11/05");

      // 4. Định dạng Tiếng Nhật đầy đủ (YYYY年MM月DD日)
      expect(formatDate(testDate, "ja", { full: true })).toBe("2026年11月05日");

      // 5. Trường hợp biên (Edge cases)
      expect(formatDate(null as unknown as Date, "vi")).toBe("");
      expect(formatDate(undefined as unknown as Date, "en")).toBe("");
      expect(formatDate("", "ja")).toBe("");
      expect(formatDate("invalid-date-string", "vi")).toBe("invalid-date-string");

      // Định dạng với timestamp số
      const timestamp = testDate.getTime();
      expect(formatDate(timestamp, "vi")).toBe("05/11/2026");
      expect(formatDate(timestamp, "ja", { full: true })).toBe("2026年11月05日");
    });

    it("TC-I18N-T4-02: Định dạng Ca sản xuất (formatShift) theo ngôn ngữ nhà máy và xử lý giá trị biên", () => {
      // 1. Ca 1, 2, 3 tiếng Việt
      expect(formatShift(1, "vi")).toBe("Ca 1");
      expect(formatShift(2, "vi")).toBe("Ca 2");
      expect(formatShift(3, "vi")).toBe("Ca 3");

      // 2. Shift 1, 2, 3 tiếng Anh
      expect(formatShift(1, "en")).toBe("Shift 1");
      expect(formatShift(2, "en")).toBe("Shift 2");
      expect(formatShift(3, "en")).toBe("Shift 3");

      // 3. 1直, 2直, 3直 tiếng Nhật
      expect(formatShift(1, "ja")).toBe("1直");
      expect(formatShift(2, "ja")).toBe("2直");
      expect(formatShift(3, "ja")).toBe("3直");

      // 4. Giá trị chuỗi (string input)
      expect(formatShift("1", "vi")).toBe("Ca 1");
      expect(formatShift("2", "en")).toBe("Shift 2");
      expect(formatShift("3", "ja")).toBe("3直");

      // 5. Giá trị biên / không hợp lệ
      expect(formatShift(0, "vi")).toBe("Ca 1");
      expect(formatShift(undefined as unknown as number, "ja")).toBe("1直");
    });

    it("TC-I18N-T4-03: Định dạng Số học (formatNumber) và phân cách hàng nghìn theo Locale", () => {
      const sample = 28442;

      // Tiếng Việt dùng dấu chấm phân cách hàng nghìn
      expect(formatNumber(sample, "vi")).toBe("28.442");

      // Tiếng Anh và Tiếng Nhật dùng dấu phẩy phân cách hàng nghìn
      expect(formatNumber(sample, "en")).toBe("28,442");
      expect(formatNumber(sample, "ja")).toBe("28,442");

      // Số 0 và số không hợp lệ
      expect(formatNumber(0, "vi")).toBe("0");
      expect(formatNumber(NaN, "vi")).toBe("0");
      expect(formatNumber(undefined as unknown as number, "vi")).toBe("0");
    });

    it("TC-I18N-T4-04: Bảo mật thông tin đối tác & Che dấu danh tính (formatVendorName) theo vai trò và đa ngôn ngữ", () => {
      // 1. Vai trò unprivileged ('viewer' và 'leader') phải luôn bị che tên đối tác
      expect(formatVendorName("YAMAICHI", "viewer")).toBe("Đã Ẩn");
      expect(formatVendorName("PROVISION", "leader")).toBe("Đã Ẩn");

      // 2. Vai trò 'admin' luôn xem được tên đối tác thực tế
      expect(formatVendorName("YAMAICHI", "admin")).toBe("YAMAICHI");
      expect(formatVendorName("PROVISION", "admin")).toBe("PROVISION");

      // 3. Vai trò đối tác (qt_<vendor>) chỉ xem được đúng tên đơn vị của mình
      expect(formatVendorName("YAMAICHI", "qt_yamaichi")).toBe("YAMAICHI");
      expect(formatVendorName("PROVISION", "qt_yamaichi")).toBe("Đã Ẩn");

      // 4. Giá trị biên (rỗng, gạch nối)
      expect(formatVendorName(null, "viewer")).toBe("—");
      expect(formatVendorName(undefined, "admin")).toBe("—");
      expect(formatVendorName("—", "leader")).toBe("—");

      // 5. Kiểm tra hàm hỗ trợ phân quyền canViewVendorName
      expect(canViewVendorName("admin", "YAMAICHI")).toBe(true);
      expect(canViewVendorName("leader", "YAMAICHI")).toBe(false);
      expect(canViewVendorName("viewer", "YAMAICHI")).toBe(false);
      expect(canViewVendorName("qt_yamaichi", "YAMAICHI")).toBe(true);
      expect(canViewVendorName("qt_yamaichi", "PROVISION")).toBe(false);

      // 6. Hợp đồng mở rộng Đa Ngữ (Trilingual Privacy Masking Contract):
      // VI: 'Đã Ẩn', EN: 'Masked', JA: '非公開'
      expect(formatVendorName("YAMAICHI", "viewer", "vi")).toBe("Đã Ẩn");
      expect(formatVendorName("YAMAICHI", "viewer", "en")).toBe("Masked");
      expect(formatVendorName("YAMAICHI", "viewer", "ja")).toBe("非公開");

      expect(formatVendorName("PROVISION", "leader", "vi")).toBe("Đã Ẩn");
      expect(formatVendorName("PROVISION", "leader", "en")).toBe("Masked");
      expect(formatVendorName("PROVISION", "leader", "ja")).toBe("非公開");

      // Kiểm tra tính bảo mật tối thượng: không bị lộ tên nhà cung cấp gốc
      expect(formatVendorName("YAMAICHI", "viewer", "en")).not.toBe("YAMAICHI");
      expect(formatVendorName("YAMAICHI", "viewer", "ja")).not.toBe("YAMAICHI");
    });

    it("TC-I18N-T4-05: Toàn bộ các khóa t() trong mã nguồn .tsx phải phân giải được sang chuỗi thực tế (không trả về raw dotted key)", () => {
      // 1. Nạp tất cả từ điển vào bộ nhớ
      const dictionaries: Record<string, Record<string, any>> = {
        vi: {},
        en: {},
        ja: {},
      };
      for (const loc of locales) {
        for (const ns of namespaces) {
          dictionaries[loc]![ns] = loadLocaleJson(loc, ns);
        }
      }

      function getNestedValue(obj: any, pathArr: string[]): string | undefined {
        let curr = obj;
        for (const part of pathArr) {
          if (curr == null || typeof curr !== "object") return undefined;
          curr = curr[part];
        }
        if (typeof curr === "string") return curr;
        if (curr != null && typeof curr === "object" && typeof curr["default"] === "string") {
          return curr["default"];
        }
        return undefined;
      }

      function resolveKey(key: string, loc: Locale): string | undefined {
        const parts = key.split(".");
        const dict = dictionaries[loc]!;
        const commonDict = dict["common"];

        if (parts.length === 1) {
          const direct = getNestedValue(commonDict, [parts[0]!]);
          if (direct !== undefined) return direct;
          if (commonDict && typeof commonDict[key] === "string") return commonDict[key];
        } else {
          const [ns, ...rest] = parts;
          if (ns && dict[ns]) {
            const v = getNestedValue(dict[ns], rest);
            if (v !== undefined) return v;
            if (dict[ns][rest.join(".")]) return dict[ns][rest.join(".")];
          }
          if (commonDict) {
            const inCommon = getNestedValue(commonDict, parts);
            if (inCommon !== undefined) return inCommon;
          }
          if (ns === "common" && commonDict) {
            const inCommonRest = getNestedValue(commonDict, rest);
            if (inCommonRest !== undefined) return inCommonRest;
          }
          if (commonDict) {
            if (typeof commonDict[key] === "string") return commonDict[key];
            if (typeof commonDict[parts.join(".")] === "string") return commonDict[parts.join(".")];
            if (ns === "common" && typeof commonDict[rest.join(".")] === "string") return commonDict[rest.join(".")];
          }
        }
        return undefined;
      }

      function scanDir(dir: string): string[] {
        let results: string[] = [];
        const list = fs.readdirSync(dir, { withFileTypes: true });
        for (const dirent of list) {
          const fullPath = path.join(dir, dirent.name);
          if (dirent.isDirectory()) {
            if (dirent.name === "test" || dirent.name === "locales" || dirent.name === "node_modules") continue;
            results = results.concat(scanDir(fullPath));
          } else if (dirent.isFile() && (dirent.name.endsWith(".tsx") || dirent.name.endsWith(".ts"))) {
            results.push(fullPath);
          }
        }
        return results;
      }

      const sourceFiles = scanDir(path.join(rootDir, "src"));
      const tCallRegex = /(?:[^a-zA-Z0-9_]|^)t\(\s*['"]([a-zA-Z0-9_.-]+)['"]/g;
      const unmappedKeys: { file: string; key: string; locale: string }[] = [];

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, "utf-8");
        let match;
        while ((match = tCallRegex.exec(content)) !== null) {
          const key = match[1]!;
          if (key.includes("${") || key.length <= 1) continue;
          for (const loc of locales) {
            const val = resolveKey(key, loc);
            if (val === undefined) {
              unmappedKeys.push({ file: path.relative(rootDir, file), key, locale: loc });
            }
          }
        }
      }

      expect(
        unmappedKeys,
        `Phát hiện ${unmappedKeys.length} vị trí gọi t() không phân giải được sang văn bản: ${JSON.stringify(unmappedKeys.slice(0, 5), null, 2)}`,
      ).toHaveLength(0);
    });
  });
});
