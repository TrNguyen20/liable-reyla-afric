# Review & Adversarial Quality Report: DYNAMO MES Trilingual Standardization [VI] [EN] [JA]

- **Reviewer**: `teamwork_reviewer` (Reviewer 1 — Quality Reviewer & Adversarial Critic)
- **Target Project**: DYNAMO MES Trilingual Standardization [VI] [EN] [JA]
- **Working Directory**: `.agents/teamwork/reviewer_1/`
- **Date**: 2026-11-06T10:15:00Z
- **Verdict**: **REQUEST_CHANGES**
- **Overall Risk Assessment**: **HIGH (208 Runtime Missing Keys & UI Key Leaks)**

---

## 1. Review Summary & Executive Verdict

### **Verdict**: **REQUEST_CHANGES**

While the project has achieved several significant milestones — establishing 21 symmetric JSON locale dictionaries (590 leaf keys per locale), passing 80/80 existing unit tests, maintaining clean production client and SSR Nitro builds, and implementing an aesthetically compliant Graphite Wireframe UI (2px `rounded-xs` corners, `font-mono tabular-nums`, no consumer pills) — adversarial and forensic verification has uncovered a **Critical Defect / Systemic Architectural Breakdown**:

> **208 distinct translation keys called by React components across 7 critical files fail to resolve at runtime.**
> Because `t()` in `src/i18n/index.tsx` returns the raw key string when unresolved, and because JSX elements use `{t('key') || 'Fallback'}`, **the non-empty raw key is truthy in JavaScript, completely suppressing the fallback and rendering raw dotted key strings (e.g. `auth.hero.badge`, `ticket.companyName`, `orders.kpis.totalValue`, `tracking.toolbars.exportCurrentPage`) directly on screen and on printed factory documents.**

Existing automated tests in `src/test/i18n-standardization.test.ts` suffered from a major **blind spot (self-certifying loop)**: they only tested the internal symmetry of the JSON files against each other and regex matching on `.tsx` source text, but **never tested whether the keys called in the JSX components actually exist in the dictionary or resolve at runtime**.

---

## 2. 5-Component Handoff Report

### 2.1 Observation (Verbatim Evidence & Data)

1. **Unresolved Runtime Key Count**:
   An exhaustive automated scan of all source files in `src/` executing the actual `t()` resolution logic across all 3 locales (`vi`, `en`, `ja`) revealed:
   - **Total distinct missing keys called in code**: **208 keys**
   - **Total runtime lookup failures across 3 locales**: **849 instances**

2. **Per-Component Breakdown**:
   - `src/routes/login.tsx`: **49 unresolved keys**
     - Verbatim examples: `auth.positions.admin.label`, `auth.features.tracking.title`, `auth.features.leadTime.title`, `auth.features.pricing.title`, `auth.errors.requirePosition`, `auth.errors.requireCode`
   - `src/components/job-ticket.tsx`: **83 unresolved keys**
     - Verbatim examples: `ticket.companyName`, `ticket.title`, `ticket.sec1Title`, `ticket.fields.partNo`, `ticket.fields.lotId`, `ticket.fields.material`, `ticket.fields.quantity`, `ticket.signatures.logistics`, `ticket.signatures.qc`
   - `src/routes/tracking.tsx`: **47 unresolved keys**
     - Verbatim examples: `tracking.toolbars.exportCurrentPage`, `tracking.toolbars.exportFiltered`, `tracking.toolbars.exportAll`, `tracking.toolbars.workshopSelect`, `tracking.sort.minToMax`, `tracking.sort.lightToHeavy`, `common.filters.clear`, `common.filters.min`
   - `src/routes/dashboard.tsx`: **17 unresolved keys**
     - Verbatim examples: `dashboard.bottlenecks.subtitle`, `dashboard.handover.top6Overdue`, `dashboard.handover.signQc`, `dashboard.handover.a4Notice`
   - `src/routes/orders.tsx`: **3 unresolved keys**
     - Verbatim examples: `orders.kpis.totalValue`, `orders.kpis.totalQty`, `orders.actions.printAll`
   - `src/components/dynamo-shell.tsx`: **3 unresolved keys**
     - Verbatim examples: `common.loading.permissions`, `common.loading.failedTitle`, `common.loading.syncing`
   - `src/routes/sync.tsx`: **6 unresolved keys**
     - Verbatim examples: `sync.gateway.modeReplaceDesc`, `sync.gateway.modeMergeDesc`, `common.source`, `common.cache`, `common.lastSynced`

3. **Verbatim Code & Behavior in `src/i18n/index.tsx`**:
   Lines 118-130 in `src/i18n/index.tsx`:
   ```typescript
   if (parts.length === 1) {
     result = getNestedValue(dict.common, [parts[0]]);
   } else {
     const [ns, ...rest] = parts;
     result = getNestedValue(dict[ns], rest);
   }
   if (result === undefined) {
     result = key; // Fallback to raw key
   }
   ```
   When `key` is `"ticket.fields.partNo"`:
   - `parts = ["ticket", "fields", "partNo"]`
   - `ns = "ticket"`. `dict["ticket"]` is `undefined` (registered namespaces are only `common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`).
   - `result` evaluates to `undefined`.
   - `result = "ticket.fields.partNo"`.
   - In JSX: `{t("ticket.fields.partNo") || "Mã linh kiện:"}` evaluates to `"ticket.fields.partNo"` because `"ticket.fields.partNo"` is a truthy non-empty string!

4. **Verbatim Code & Behavior in `src/routes/orders.tsx`**:
   - `src/i18n/locales/vi/orders.json` defines:
     `"kpiTotalValue": "TỔNG GIÁ TRỊ"`, `"kpiTotalQty": "TỔNG SỐ LƯỢNG"`, `"printOrderTickets": "In phiếu cả đơn"`
   - `src/routes/orders.tsx` calls:
     `t('orders.kpis.totalValue')`, `t('orders.kpis.totalQty')`, `t('orders.actions.printAll')`
   - Mismatch causes `t()` to return `'orders.kpis.totalValue'`, rendering `'orders.kpis.totalValue'` in the KPI header!

5. **Verbatim Code & Behavior in `src/components/dynamo-shell.tsx`**:
   - `src/i18n/locales/vi/common.json` defines `"loading": "Đang tải dữ liệu..."` (a leaf string).
   - `src/components/dynamo-shell.tsx` calls `t("common.loading.permissions")`, `t("common.loading.failedTitle")`, `t("common.loading.syncing")`.
   - Calling nested property on string causes lookup to return `undefined`, outputting the raw string `"common.loading.permissions"` during startup.

---

### 2.2 Logic Chain

1. **Step 1 (Root Cause: Namespace & Key Desynchronization)**:
   Worker M1 designed the 7 JSON files placing domain sections like `auth`, `ticket`, `pallet`, `lotUpdate` inside `common.json`. Worker M2 and M3 assumed `ticket` and `auth` were root namespaces and called `t("ticket.fields.partNo")` and `t("auth.hero.badge")`. Because `src/i18n/index.tsx` checks `dict[ns]` directly and does not fall back to `dict.common`, lookups failed.
2. **Step 2 (Root Cause: The Fallback Trap)**:
   Workers M2 and M3 wrote `{t(key) || 'Fallback Text'}` believing that if `key` did not resolve, the right-hand side fallback would display. However, `t()` returns `key` on failure. In JavaScript, `key || 'Fallback'` evaluates to `key`. Thus, the fallback was permanently disabled.
3. **Step 3 (Root Cause: Test Suite Blind Spot)**:
   The test track (`src/test/i18n-standardization.test.ts`) validated that `vi.json`, `en.json`, and `ja.json` had matching keys. It never cross-referenced the keys used in React JSX against the JSON dictionaries, nor did it render the components to check output.
4. **Step 4 (Impact Assessment)**:
   The user interface is broken in production: factory workers at Kiosk/Desktop see raw dot-separated programming keys (`auth.positions.admin.label`, `ticket.companyName`, `orders.kpis.totalValue`) instead of Vietnamese, English, or Japanese text. A4 printed tickets display technical key paths instead of official headers and labels.
5. **Step 5 (Verdict Inevitability)**:
   According to the review instructions, work that exhibits facade implementations, blind test verification, or fails the core user requirements must receive a **REQUEST_CHANGES** verdict.

---

### 2.3 Caveats

1. **Working Parts**:
   - The Segmented Micro-Pill Switcher `[VI] [EN] [JA]` in `dynamo-shell.tsx` and `login.tsx` is functionally sound: it updates React state, sets cookies (`dynamo-locale`), updates `localStorage`, and sets `<html lang="...">`.
   - The formatters in `src/i18n/formatters.ts` (`formatDate`, `formatShift`, `formatTime`, `formatNumber`) and partner privacy masking (`formatVendorName`) work cleanly and accurately.
   - Keys that match properly (such as `nav.*`, `tracking.columns.*`, `dashboard.kpis.*`) switch languages dynamically between VI, EN, and JA as intended.
   - Design System rules (2px `rounded-xs`, `font-mono tabular-nums`, wireframe aesthetics) are compliant.
2. **Review-Only Constraint**:
   Per the agent constraint (*"Review-only — do NOT modify implementation code"*), this reviewer has not modified any source code or JSON files, preserving clear ownership for the orchestrator and implementers to resolve.

---

### 2.4 Conclusion

The project cannot be approved in its current state. The 208 unresolved keys directly contradict Acceptance Criterion 1 (*"100% nhãn hiển thị... được tải từ hệ thống i18n mà không còn văn bản tiếng Việt bị hardcode"*) and Criterion 3 (*"không tồn tại khóa bị thiếu (missing key), không trả về fallback ngoài ý muốn"*). 

A coordinated remediation pass is required to:
1. Make `src/i18n/index.tsx` resilient by searching `dict.common` when `dict[ns]` is undefined.
2. Align all component keys in `login.tsx`, `job-ticket.tsx`, `orders.tsx`, `tracking.tsx`, `dynamo-shell.tsx`, `sync.tsx`, and `dashboard.tsx` with the JSON dictionaries.
3. Complete missing dictionary keys across VI, EN, and JA.
4. Add an automated test assertion to `src/test/i18n-standardization.test.ts` that audits 100% of `t()` calls in `src/` to guarantee zero unresolved keys.

---

### 2.5 Verification Method

To independently verify these findings, run the audit script provided in `.agents/teamwork/reviewer_1/run_adversarial_audit.cjs`:
```powershell
node .agents/teamwork/reviewer_1/run_adversarial_audit.cjs
```
**Expected Output**:
- Demonstrates 208 distinct missing keys across `login.tsx`, `job-ticket.tsx`, `orders.tsx`, `tracking.tsx`, `dynamo-shell.tsx`, `sync.tsx`, and `dashboard.tsx`.

---

## 3. Detailed Findings

### [Critical] Finding 1: 208 Unresolved Runtime Keys Causing UI Key Leakage
- **Where**: `src/routes/login.tsx` (49 keys), `src/components/job-ticket.tsx` (83 keys), `src/routes/tracking.tsx` (47 keys), `src/routes/dashboard.tsx` (17 keys), `src/routes/orders.tsx` (3 keys), `src/components/dynamo-shell.tsx` (3 keys), `src/routes/sync.tsx` (6 keys).
- **Why**: React components call `t()` with keys that either do not exist in the 21 JSON files, or reference sub-objects in `common.json` without the `common.` prefix (e.g. `ticket.*`, `auth.*`, `pallet.*`).
- **Consequence**: `t()` returns the key itself. The JSX fallback `{t(key) || 'Fallback'}` is bypassed because the raw key is truthy. Users and factory operators see technical dot-syntax strings on screen and in print.
- **Suggestion**:
  1. In `src/i18n/index.tsx`: Enhance `t()` so that if `dict[ns]` does not exist, it falls back to `getNestedValue(dict.common, parts)` (or `dict.common[parts[0]]`).
  2. For missing keys in `tracking.json` (such as `toolbars.exportCurrentPage`, `sort.minToMax`, etc.), add them symmetrically to `vi/tracking.json`, `en/tracking.json`, and `ja/tracking.json`.
  3. Align keys in `orders.tsx` (`orders.kpis.totalValue` → `orders.kpiTotalValue`, `orders.actions.printAll` → `orders.actions.printOrderTickets`).
  4. Fix `common.loading` in `common.json` to be an object with `permissions`, `failedTitle`, `syncing`, or update `dynamo-shell.tsx`.

### [Major] Finding 2: Fallback Invalidation in `src/i18n/index.tsx`
- **Where**: `src/i18n/index.tsx` line 128-130
- **Why**: `if (result === undefined) { result = key; }`. Returning `key` prevents idiom `{t(key) || fallback}` from ever working as intended by developers.
- **Suggestion**: If `PROJECT.md` mandates literal fallback preservation in JSX via `||`, `t()` should return `""` when key is missing if developers expect `|| 'fallback'` to activate, OR developer code should be updated, OR all keys must resolve with 0 missing keys.

### [Major] Finding 3: Self-Certifying Test Suite Blind Spot
- **Where**: `src/test/i18n-standardization.test.ts`
- **Why**: The test suite validates dictionary symmetry against itself (Tier 1) and master data regexes (Tier 3), but contains zero tests verifying that the keys used by React components actually exist in the dictionary.
- **Suggestion**: Add a new test (`TC-I18N-T1-04: Static Code Reference Parity`) that scans all `.tsx` files in `src/`, extracts `t('...')` invocations, and asserts that 100% of called keys resolve to valid strings in `vi`, `en`, and `ja`.

---

## 4. Adversarial Challenge & Stress Test Report

### Challenge Summary
- **Overall Risk**: **HIGH**
- **Tested Scenarios**:
  1. Component runtime resolution across VI, EN, JA: **FAIL (208 keys missing)**
  2. A4 Job Ticket printing output: **FAIL (ticket.* raw keys leaked)**
  3. Login page authentication console: **FAIL (auth.* raw keys leaked)**
  4. Orders KPI header rendering: **FAIL (orders.kpis.* raw keys leaked)**
  5. Language switching mechanism: **PASS (State, cookie, and HTML lang update smoothly)**
  6. Domain Invariants (WAIT, TRANSIT, STOCKED, PASS, FAIL, QT, HRC, ULID): **PASS**
  7. Design System Compliance (2px rounded-xs, font-mono tabular-nums): **PASS**

### Stress Test Matrix

| Scenario | Expected Behavior | Actual Behavior | Verdict |
|---|---|---|:---:|
| Render `/login` in VI/EN/JA | Localized position labels and hero copy | Displays `auth.positions.admin.label`, `auth.hero.badge`, etc. | ❌ FAIL |
| Open Job Ticket modal & print A4 | Localized company name, section headers, signatures | Displays `ticket.companyName`, `ticket.sec1Title`, etc. | ❌ FAIL |
| Open `/orders` KPI cards | Displays "TỔNG GIÁ TRỊ" / "TOTAL VALUE" / "発注総額" | Displays `orders.kpis.totalValue` | ❌ FAIL |
| Open Tracking CSV export menu | Displays "Trang hiện tại", "Bộ lọc hiện tại" | Displays `tracking.toolbars.exportCurrentPage` | ❌ FAIL |
| Switch language via Header `[VI] [EN] [JA]` | Smooth 1-click update of document and state | Updates smoothly for valid keys | ✅ PASS |
| Verify Lean Andon & metallurgy tokens | Untranslated `WAIT`, `PASS`, `QT`, `HRC`, `SKD61` | Verbatim preservation confirmed | ✅ PASS |
| Verify Graphite Wireframe 2px corners | `rounded-xs` (2px) on controls, no consumer pills | Compliant with `DESIGN-SYSTEM.md` | ✅ PASS |
