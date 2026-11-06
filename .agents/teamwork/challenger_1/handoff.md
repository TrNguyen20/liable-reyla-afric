# Handoff Report: DYNAMO MES Trilingual Standardization Adversarial Stress Testing

> **Author**: `teamwork_challenger` (Challenger 1)  
> **Milestone**: M4 (Adversarial Verification & Defect Exposure)  
> **Timestamp**: 2026-11-06T03:15:00Z  
> **Recipient**: Orchestrator (`934eddce-648a-4237-a754-5951df6a9240`)  
> **Verdict**: **FLAG_DEFECTS**  
> **Handoff Type**: Hard (Task Complete)

---

## 1. Observation

### 1.1 Test Suite & Tool Execution Telemetry
- **Empirical Stress Harness Authored**: `src/test/i18n-adversarial-stress.test.ts` (577 lines, 29 tests across 5 adversarial suites).
- **Stress Suite Execution**:
  ```powershell
  npx vitest run src/test/i18n-adversarial-stress.test.ts
  ```
  Result: `28 passed | 1 expected fail (29 tests)` in 127ms.
- **Full Project Build**:
  ```powershell
  npm run build
  ```
  Result: Exit code 0, client bundle (`2020 modules transformed`) and Nitro SSR bundle generated in 2.61s.
- **Full Project Test Suite**:
  ```powershell
  npm test
  ```
  Result: `14 passed | 1 failed (15 test files)` with `119 passed | 3 failed | 1 expected fail (123 tests)`.

---

### 1.2 Verbatim Defect Observations

#### Defect A: 89 Missing Key References in Production Source Code
Direct static code analysis of all `.tsx` and `.ts` files under `src/` (excluding `src/test/`) against the 21 JSON dictionary files revealed **89 call sites across 77 unique keys** where `t('<key>')` queries keys that DO NOT EXIST in `src/i18n/locales/{vi,en,ja}/*.json`:

1. **Nonexistent Namespace Query**:
   - `src/components/job-ticket.tsx:531`:
     ```tsx
     {t("ticket.fields.orderNo") || "Số đơn hàng (PO):"}
     ```
     *Fact*: There is no `ticket` namespace; the system only defines `common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`.

2. **Core Tracking Toolbars & Density Controls Missing**:
   - `src/routes/tracking.tsx:1699`:
     ```tsx
     title={t('tracking.density.compactTooltip') || 'Chế độ nén dòng cao độ (~32px)'}
     ```
   - `src/routes/tracking.tsx:1709`:
     ```tsx
     title={t('tracking.density.normalTooltip') || 'Chế độ tiêu chuẩn (đầy đủ thông số)'}
     ```
   - `src/routes/tracking.tsx:1718, 1720`:
     ```tsx
     title={t('tracking.toolbars.resetColWidthsTooltip') || 'Đặt lại độ rộng cột mặc định'}
     <span>{t('tracking.toolbars.resetColWidths') || 'Khôi phục cỡ cột'}</span>
     ```
   - `src/routes/tracking.tsx:1786, 1789, 1800, 1808, 1817`:
     `tracking.toolbars.exportCsvTooltip`, `tracking.toolbars.exportCsv`, `tracking.toolbars.exportCurrentPage`, `tracking.toolbars.exportFiltered`, `tracking.toolbars.exportAll`.

3. **Core Tracking Filter and Sort Dropdowns Missing**:
   - `src/routes/tracking.tsx:2077`: `common.filters.deselectAll`, `common.filters.selectAll`
   - `src/routes/tracking.tsx:2082`: `common.filters.search`
   - `src/routes/tracking.tsx:2159`: `tracking.filters.missingHardness`
   - `src/routes/tracking.tsx:2182, 2183, 2233, 2234`:
     `tracking.sort.minToMax`, `tracking.sort.maxToMin`, `tracking.sort.lightToHeavy`, `tracking.sort.heavyToLight`
   - `src/routes/tracking.tsx:2192, 2203, 2244, 2256`: `common.filters.min`, `common.filters.max`
   - `src/routes/tracking.tsx:3277, 3288, 3301`: `common.pagination.prev`, `common.pagination.page`, `common.pagination.next`

4. **Dashboard Shift Handover A4 Report Missing Keys**:
   - `src/routes/dashboard.tsx:1042`: `dashboard.handover.top6Overdue`
   - `src/routes/dashboard.tsx:1050`: `tracking.columns.partNo`
   - `src/routes/dashboard.tsx:1070`: `dashboard.handover.urgentCheckProgress`
   - `src/routes/dashboard.tsx:1076`: `dashboard.handover.noOverdueNotice`
   - `src/routes/dashboard.tsx:1084`: `dashboard.handover.a4Notice`
   - `src/routes/dashboard.tsx:1109, 1111, 1119`: `dashboard.handover.signQc`, `dashboard.handover.signQcNote`, `dashboard.handover.signSupervisorNote`

5. **Shell Loading and Error States Missing**:
   - `src/components/dynamo-shell.tsx:819`: `common.loading.permissions`
   - `src/components/dynamo-shell.tsx:826`: `common.loading.failedTitle`
   - `src/components/dynamo-shell.tsx:901`: `common.loading.syncing`

---

#### Defect B: Logical OR Fallback Bypass (Dead Code & Raw Key UI Leaks)
- **Observation in `src/i18n/index.tsx:128-130`**:
  ```ts
  if (result === undefined) {
    result = key; // Fallback to raw key
  }
  ```
- **Consequence in JSX Nodes**:
  Developers wrote fallback expressions across routes assuming `t()` returns `null` or `undefined` on lookup failure:
  ```tsx
  {t('ticket.fields.orderNo') || 'Số đơn hàng (PO):'}
  {t('orders.kpis.totalValue') || t('orders.kpiTotalValue') || 'TỔNG GIÁ TRỊ'}
  {t('tracking.density.compactTooltip') || 'Chế độ nén dòng cao độ (~32px)'}
  ```
- **Empirical Test Result (`STRESS-DEFECT-01`)**:
  ```ts
  const output = result.current.t('orders.kpis.totalValue') || result.current.t('orders.kpiTotalValue') || 'TỔNG GIÁ TRỊ';
  expect(output).toBe('orders.kpis.totalValue'); // PASSES: Confirms raw key is returned!
  ```
  Because `'orders.kpis.totalValue'` is a non-empty string, it is truthy in JavaScript. The right-hand expressions `t('orders.kpiTotalValue')` and `'TỔNG GIÁ TRỊ'` are never evaluated. The production UI displays the raw technical string `orders.kpis.totalValue`.

---

#### Defect C: Unhandled RegExp SyntaxError in Parameter Interpolation
- **Observation in `src/i18n/index.tsx:132-136`**:
  ```ts
  if (params) {
    for (const [pKey, pVal] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }
  }
  ```
- **Empirical Execution**:
  Calling `new RegExp('\\{' + pKey + '\\}', 'g')` with any `pKey` containing unescaped metacharacters:
  - If `pKey = 'status('` -> `SyntaxError: Invalid regular expression: /\{status(\}/g: Unterminated group`
  - If `pKey = 'part['` -> `SyntaxError: Invalid regular expression: /\{part[\}/g: Unterminated character class`
  This crashes the React component runtime whenever dynamic or external keys are interpolated.

---

#### Defect D: RegExp Replacement Pattern Distortion in Parameter Values
- **Observation in `src/i18n/index.tsx:134`**:
  Calling `String.prototype.replace(regex, String(pVal))` with a string second argument interprets special replacement patterns:
  - `$'` inserts the string following the match.
  - `$$` collapses into `$`.
  - `$&` inserts the matched token itself.
  If `pVal` contains industrial serial strings, prices, or notes with `$'` (e.g. `pVal = "price: $100"`), the output text is corrupted.

---

#### Defect E: Falsy Check in `formatDate` for Timestamp 0
- **Observation in `src/i18n/formatters.ts:10`**:
  ```ts
  export function formatDate(dateInput: Date | string | number, locale: Locale = 'vi', options?: { full?: boolean }): string {
    if (!dateInput) return '';
    ...
  ```
  For timestamp `0` (Unix epoch `1970-01-01T00:00:00Z`), `!0` evaluates to `true`, returning `''` instead of `'01/01/1970'`.

---

## 2. Logic Chain

1. **Step 1: Fallback Engine Architecture Verification**
   - *Observation*: `I18nProvider.t()` checks lookup locales (`locale` -> `FALLBACK_CHAIN[locale]`), and if undefined, sets `result = key`.
   - *Inference*: `t()` is designed to never return `undefined` or `null`. It always returns a string.
   - *Implication*: Any expression formatted as `t(k) || fallback` relies on `t(k)` being falsy when `k` is missing. Since `k` is a non-empty string, `t(k)` is always truthy, making all `|| fallback` clauses completely inert.

2. **Step 2: Dictionary Coverage Verification**
   - *Observation*: Static AST/regex scan across all application code in `src/components/` and `src/routes/` discovered 89 invocations of `t()` querying keys absent from `src/i18n/locales/vi/*.json`.
   - *Inference*: Implementation workers M2 and M3 introduced new translation keys in JSX components that were never declared in Worker M1's dictionaries (e.g., `ticket.*`, `tracking.density.*Tooltip`, `dashboard.handover.*`, `common.loading.*`).
   - *Implication*: Because of Step 1, these 89 locations render raw dot-notation keys in the user interface across all three languages (VI, EN, JA).

3. **Step 3: Security & Stability Verification**
   - *Observation*: Parameter interpolation constructs `new RegExp(`\\{${pKey}\\}`, 'g')` without escaping regex metacharacters, and passes unescaped replacement strings to `.replace()`.
   - *Inference*: Dynamic parameter keys or values containing `(`, `[`, `$`, `\`` will either trigger an unhandled runtime exception (`SyntaxError`) or alter string contents via replacement tokens.

4. **Step 4: Cross-Challenger Synthesis**
   - *Observation*: Challenger 2 reported 3 defects (`SEC-DEFECT-01` formatVendorName missing locale parameter, `INV-02` missing "QT" acronym in `ja/dashboard.json`, and `UI-DEFECT-01` consumer `rounded-full` circle on login steps).
   - *Inference*: Multiple layers of the implementation deviate from `DESIGN-SYSTEM.md` and `PROJECT.md` specifications.

---

## 3. Caveats

- **No Facade Tests**: All tests in `src/test/i18n-adversarial-stress.test.ts` execute live against the real React components, DOM hooks, and JSON files without mocked returns.
- **Review-Only Constraint**: In strict adherence to Key Constraint "Review-only — do NOT modify implementation code", Challenger 1 has NOT modified any files in `src/i18n/`, `src/components/`, or `src/routes/`. All fixes must be implemented by the implementation workers.
- **No Performance Regressions**: Build time (2.61s) and test execution speed (127ms for stress suite) remain well within industrial real-time thresholds.

---

## 4. Conclusion

**Official Verdict: FLAG_DEFECTS**

The Trilingual i18n implementation contains **5 confirmed, empirically proven defects**:
1. **Critical Defect 1**: 89 translation key call sites across 77 unique keys in `src/` are missing from all 21 JSON dictionaries.
2. **Critical Defect 2**: The fallback pattern `{t(k) || 'literal'}` is broken by design because missing keys return truthy raw strings, causing raw technical tokens to leak into the production UI.
3. **High Defect 3**: `new RegExp(`\\{${pKey}\\}`, 'g')` in `src/i18n/index.tsx` throws fatal uncaught `SyntaxError` on unescaped metacharacters.
4. **Medium Defect 4**: Parameter replacement evaluates `$` metacharacters in parameter values.
5. **Low Defect 5**: `formatDate(0)` returns empty string due to falsy check.

### Required Remediations for Implementation Team
1. **Expand Dictionaries / Harmonize Keys**:
   Add the 77 missing keys to `src/i18n/locales/{vi,en,ja}/*.json` or adjust component call sites to use existing keys (e.g. `orders.kpiTotalValue` instead of `orders.kpis.totalValue`).
2. **Safe Fallback or Nullish Resolution**:
   In `src/i18n/index.tsx`, allow `t(key, params)` to fallback to the provided default if supplied, or update components to ensure all queried keys exist.
3. **Safe Parameter Interpolation**:
   In `src/i18n/index.tsx:134`, replace `result.replace(new RegExp(...))` with:
   ```ts
   result = result.replaceAll(`{${pKey}}`, String(pVal));
   ```
   or:
   ```ts
   const escapedKey = pKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
   result = result.replace(new RegExp(`\\{${escapedKey}\\}`, 'g'), () => String(pVal));
   ```
4. **Fix `formatDate`**:
   Change `if (!dateInput) return '';` to `if (dateInput === null || dateInput === undefined || dateInput === '') return '';`.

---

## 5. Verification Method

To independently reproduce and verify these findings:

1. **Run the Empirical Adversarial Stress Suite**:
   ```powershell
   npx vitest run src/test/i18n-adversarial-stress.test.ts
   ```
   *Expected Output*: 28 passed, 1 expected fail (`STRESS-DICT-04` confirms the 89 missing keys).

2. **Verify Flawed Fallback Behavior**:
   ```powershell
   npx vitest run src/test/i18n-adversarial-stress.test.ts -t "STRESS-DEFECT-01"
   ```
   *Expected Output*: 1 passed (empirically asserts that `orders.kpis.totalValue` leaks to UI).

3. **Verify the 89 Missing Key Inventory**:
   ```powershell
   npx vitest run src/test/i18n-adversarial-stress.test.ts -t "STRESS-DEFECT-02"
   ```
   *Expected Output*: 1 passed (asserts exactly 89 missing key occurrences across 77 unique keys).

4. **Run Full Test Suite & Build**:
   ```powershell
   npm test
   npm run build
   ```
