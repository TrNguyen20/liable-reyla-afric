# TEST_READY: DYNAMO QT-MES Trilingual Standardization [VI] [EN] [JA]

> **Status**: READY FOR MILESTONE IMPLEMENTATION & VERIFICATION  
> **Published By**: Autonomous E2E Testing Track (`teamwork_test_writer`)  
> **Timestamp**: 2026-11-06T02:15:00Z  
> **Standard**: Graphite Wireframe UI (v2.2.0)  
> **Verification Gate**: `npm test` (13 test files, 80 tests, 0 failures)

---

## 1. Quick Start: How to Run the Tests

### 1.1 Run Trilingual Standardization Test Suite
```powershell
npx vitest run src/test/i18n-standardization.test.ts
```

### 1.2 Run Entire Project Test Suite (All 13 Suites)
```powershell
npm test
```

### 1.3 Run with Live File Watcher (Development / TDD)
```powershell
npx vitest watch src/test/i18n-standardization.test.ts
```

### 1.4 Run with Verbose Reporter
```powershell
npx vitest run --reporter=verbose
```

---

## 2. 4-Tier Test Coverage Summary

The newly established test suite `src/test/i18n-standardization.test.ts` provides comprehensive, zero-facade verification across all 4 architectural tiers:

| Tier | Test ID | Description | Status |
|---|---|---|:---:|
| **Tier 1** | `TC-I18N-T1-01` | **21 JSON Dictionary Files Existence & Syntax**: Asserts all 21 files across 3 locales (`vi`, `en`, `ja`) and 7 namespaces (`common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`) exist and parse validly. | ✅ PASS |
| **Tier 1** | `TC-I18N-T1-02` | **Recursive Key Parity Audit**: Recursively checks dot-notation key hierarchy across all namespaces. Asserts zero missing keys in EN/JA and zero extraneous keys. | ✅ PASS |
| **Tier 1** | `TC-I18N-T1-03` | **Locale Configuration & Fallbacks**: Asserts `SUPPORTED_LOCALES = ['vi', 'en', 'ja']`, `DEFAULT_LOCALE = 'vi'`, and `FALLBACK_CHAIN` resolution (`ja` → `en` → `vi`). | ✅ PASS |
| **Tier 2** | `TC-I18N-T2-01` | **No Empty Strings / Null Values**: Recursively audits all leaf strings across 21 files. Asserts no empty string (`""`), `null`, or `undefined` values exist. | ✅ PASS |
| **Tier 2** | `TC-I18N-T2-02` | **Whitespace Trimming Audit**: Asserts all leaf values satisfy `val === val.trim()`. Prevents UI misalignment in monospaced grids. | ✅ PASS |
| **Tier 2** | `TC-I18N-T2-03` | **Placeholder Parity (`{param}`)**: Audits interpolation tokens via regex. Guarantees that parameter names in `vi` match exactly with `en` and `ja`. | ✅ PASS |
| **Tier 3** | `TC-I18N-T3-01` | **Lean Andon Status Codes Preservation**: Asserts `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING` are preserved verbatim in uppercase and wired to wireframe CSS tokens. | ✅ PASS |
| **Tier 3** | `TC-I18N-T3-02` | **Metallurgy & Engineering Standards**: Asserts `QT`, `HRC`, tool steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), and workshops (`PIN`, `INSERT`, `MOLD`) are preserved verbatim. | ✅ PASS |
| **Tier 3** | `TC-I18N-T3-03` | **System Identifiers Preservation**: Asserts database keys (`ID_Key`, `So_DatHang`, `ma_hang`), authentication token (`ULID`), and SOP standard (`SOP-MES-08`) remain invariant. | ✅ PASS |
| **Tier 3** | `TC-I18N-T3-04` | **Graphite Wireframe UI Token Compliance**: Asserts `--radius: 2px;` in CSS, `rounded-xs` on controls, `font-mono tabular-nums` on data grids, and zero consumer pills. | ✅ PASS |
| **Tier 4** | `TC-I18N-T4-01` | **Cultural Date Formatter (`formatDate`)**: Verifies VI (`DD/MM/YYYY`), EN (`MM/DD/YYYY`), JA (`YYYY/MM/DD` and `YYYY年MM月DD日`). Handles invalid inputs and timestamps. | ✅ PASS |
| **Tier 4** | `TC-I18N-T4-02` | **Production Shift Formatter (`formatShift`)**: Verifies VI (`Ca 1`, `Ca 2`, `Ca 3`), EN (`Shift 1`, `Shift 2`, `Shift 3`), JA (`1直`, `2直`, `3直`), with numeric/string/edge inputs. | ✅ PASS |
| **Tier 4** | `TC-I18N-T4-03` | **Industrial Number Formatter (`formatNumber`)**: Verifies thousand separators (dot for VI, comma for EN/JA), 0, and NaN fallback. | ✅ PASS |
| **Tier 4** | `TC-I18N-T4-04` | **Poka-Yoke Partner Confidentiality (`formatVendorName`)**: Verifies that `viewer` and `leader` receive masked names (`'Đã Ẩn'` / `'Masked'` / `'非公開'`), while `admin` and scoped partner roles access permitted data. | ✅ PASS |

---

## 3. Test Baseline Execution Results

```
 RUN  v4.1.11 D:/NTT-2025/KAIZEN/m.Clone-github (internet)/liable-reyla-afric

 ✓ src/test/cache-busting-sync.test.ts (3 tests)
 ✓ src/test/i18n-and-header.test.ts (6 tests)
 ✓ src/test/design-system-compliance.test.ts (10 tests)
 ✓ src/test/ui-ux-standardization.test.ts (10 tests)
 ✓ src/test/orders-optimization.test.ts (5 tests)
 ✓ src/test/lockout.test.ts (1 test)
 ✓ src/test/dashboard-enhancements.test.ts (9 tests)
 ✓ src/test/data-scope.test.ts (5 tests)
 ✓ src/test/centralized-webhook-sync.test.ts (6 tests)
 ✓ src/test/server-dataset.test.ts (3 tests)
 ✓ src/test/login-interlock.test.ts (5 tests)
 ✓ src/test/i18n-standardization.test.ts (14 tests)
 ✓ src/test/app-routing.test.tsx (3 tests)

 Test Files  13 passed (13)
      Tests  80 passed (80)
   Duration  2.09s
```

---

## 4. Feature Verification Checklist for Milestones

- [x] **Test Infrastructure Architecture Published (`TEST_INFRA.md`)**
- [x] **Comprehensive 4-Tier Test Suite Published (`src/test/i18n-standardization.test.ts`)**
- [x] **Zero-Mock / Zero-Facade Integrity Confirmed**
- [x] **Baseline Parity & Boundary Checks Passing (85 keys / 21 files)**
- [x] **Domain Invariants Enforced (Andon codes, Metallurgy, System IDs, UI tokens)**
- [x] **Cultural Formatters & Security Verified (`formatDate`, `formatShift`, `formatNumber`, `formatVendorName`)**
- [x] **100% Backward Compatibility Maintained (All 12 existing test suites pass)**
- [ ] **Milestone M1**: Expand 21 JSON files to ~380 keys with 100% key parity & update `formatVendorName` locale masking
- [ ] **Milestone M2**: Refactor `dynamo-shell.tsx`, `login.tsx`, `shopfloor-telemetry.tsx` with literal fallbacks
- [ ] **Milestone M3**: Refactor `tracking.tsx`, `dashboard.tsx`, `orders.tsx`, `sync.tsx` with literal fallbacks
- [ ] **Milestone M4**: Final adversarial verification and forensic audit

---

## 5. Critical Instructions for Implementation Workers

When implementing subsequent milestones (Worker M1, Worker M2, Worker M3):
1. **Maintain Literal Fallbacks**: Existing tests in `ui-ux-standardization.test.ts`, `i18n-and-header.test.ts`, `dashboard-enhancements.test.ts`, and `orders-optimization.test.ts` inspect source code files via `fs.readFileSync`. All localized JSX elements MUST retain fallback literals:
   ```tsx
   {t('nav.route1Title') || '[1] LUÂN CHUYỂN'}
   {t('common.cancel') || 'Hủy bỏ'}
   {t('orders.kpiTotalValue') || 'TỔNG GIÁ TRỊ'}
   ```
2. **Synchronize All 3 Dictionaries Simultaneously**: Any key added to `vi/*.json` must be added immediately with equivalent translation to `en/*.json` and `ja/*.json` to satisfy `TC-I18N-T1-02`.
3. **No Empty Values**: Avoid placeholder empty strings `""` during draft phases. Use temporary fallback strings to satisfy `TC-I18N-T2-01`.
4. **Preserve Invariant Codes**: Status codes `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING` and engineering terms `QT`, `HRC`, `SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`, `PIN`, `INSERT`, `MOLD` must remain verbatim in all 3 languages.
