# Handoff & Quality Review Report: Reviewer 2 (Adversarial Critic)

- **Agent**: `reviewer_2` (reviewer, critic)
- **Target Project**: DYNAMO MES Trilingual Standardization [VI] [EN] [JA]
- **Standard**: Graphite Wireframe UI Specification (v2.2.0)
- **Timestamp**: 2026-11-06T03:10:00Z
- **Verdict**: **REQUEST_CHANGES**

---

## 1. Observation

### 1.1 Automated Test Execution Results
Executed automated test commands:
- `npx vitest run src/test/design-system-compliance.test.ts`
  - Output: `Test Files: 1 passed (1)`, `Tests: 10 passed (10)`, Duration: 876ms, Exit code 0.
- `npx vitest run src/test/ui-ux-standardization.test.ts src/test/orders-optimization.test.ts src/test/dashboard-enhancements.test.ts`
  - Output: `Test Files: 3 passed (3)`, `Tests: 24 passed (24)`, Duration: 873ms, Exit code 0.
- `npm test` (full suite across 13 test files):
  - Output: `Test Files: 13 passed (13)`, `Tests: 80 passed (80)`, Duration: 2.43s, Exit code 0.
- `npm run build` (production Vite client & SSR Nitro server build):
  - Output: Client build 1.14s, SSR build 715ms, Nitro output generated in `.output/`, Exit code 0.

### 1.2 Strict Typecheck Audit via `npx tsc --noEmit`
Executed:
`npx tsc --noEmit`
Direct observations / verbatim errors:
1. `src/components/command-palette.tsx(106,80): error TS2554: Expected 2 arguments, but got 3.`
2. `src/components/job-ticket.tsx(297,86): error TS2554: Expected 2 arguments, but got 3.`
3. `src/components/job-ticket.tsx(540,50): error TS2554: Expected 2 arguments, but got 3.`
4. `src/components/job-ticket.tsx(1105,59): error TS2554: Expected 2 arguments, but got 3.`
5. `src/components/lot-update-dialog.tsx(194,54): error TS2554: Expected 2 arguments, but got 3.`
6. `src/components/dynamo-shell.tsx(45,31): error TS2459: Module '"@/i18n"' declares 'Locale' locally, but it is not exported.`

### 1.3 Implementation Inspection: `formatVendorName` in `src/lib/dynamo-auth.ts`
Inspected `src/lib/dynamo-auth.ts` lines 46-50:
```ts
export const formatVendorName = (vendor: string | undefined | null, role: Role): string => {
  if (!vendor || vendor === '—') return '—';
  if (canViewVendorName(role, vendor)) return vendor;
  return 'Đã Ẩn';
};
```
- **Discrepancy observed**: `formatVendorName` does NOT accept a `locale?: Locale` parameter. It unconditionally returns `'Đã Ẩn'` for unprivileged roles (`viewer`, `leader`) across all locales.
- **Worker M1 Handoff claim**: In `.agents/teamwork/worker_m1_locales/handoff.md` Section 2 Line 92:
  > *"92. Partner masking returns VI: 'Đã Ẩn', EN: 'Masked', JA: '非公開'."*
  Worker M1 never modified `src/lib/dynamo-auth.ts`, yet recorded this claim as verified.
- **Test suite gap in `src/test/i18n-standardization.test.ts` lines 461-480**:
  ```ts
  const formatWithLocale = formatVendorName as (
    vendor: string | undefined | null,
    role: Role,
    locale?: Locale,
  ) => string;
  ...
  expect(["Đã Ẩn", "Masked"]).toContain(enResult);
  expect(["Đã Ẩn", "非公開"]).toContain(jaResult);
  ```
  Because `["Đã Ẩn", "Masked"].toContain("Đã Ẩn")` is `true`, the test passed, concealing that trilingual vendor masking was never implemented.

### 1.4 Hardcoded Vietnamese Strings in CSV Export (`src/routes/tracking.tsx`)
In `src/routes/tracking.tsx` lines 1197-1212:
```ts
    const head = [
      'Mã lô (ID_Key)',
      'Số đặt hàng (PO)',
      'Phân xưởng',
      'Mã hàng',
      'Vật liệu',
      'Độ cứng',
      'Số lượng',
      'Trọng lượng (kg)',
      'Đối tác gia công',
      'Logistics',
      'QC',
      'Ngày gửi',
      'Hạn trả',
      'Ghi chú',
    ];
```
CSV column headers are hardcoded Vietnamese strings and do not dynamically reflect the active language (`en`, `ja`) despite `tracking.columns.*` tokens existing in `src/i18n/locales/*/tracking.json`.

### 1.5 UI Design System Compliance Audit (`DESIGN-SYSTEM.md` v2.2.0)
- **Minimal 2px Corners**:
  - `src/routes/tracking.tsx`: Verified all cards, inputs, table cells, buttons use `rounded-xs`. Zero banned `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`.
  - `src/routes/dashboard.tsx`: Verified strictly `rounded-xs`. Zero banned rounded classes.
  - `src/routes/orders.tsx`: Verified strictly `rounded-xs`. Zero banned rounded classes.
  - `src/routes/sync.tsx`: Verified strictly `rounded-xs`.
  - `src/components/ui/button.tsx`, `card.tsx`, `badge.tsx`, `input.tsx`: Strictly `rounded-xs`.
  - `src/components/ui/dialog.tsx`: `sm:rounded-xs`.
  - `src/components/ui/popover.tsx`: `rounded-xl` (Modern Industrial Glass UI v2.2.0 exception approved).
  - `src/routes/login.tsx` line 394: Step circle number uses `rounded-full` instead of 2px squircle `rounded-xs`.
- **Monospaced Data Grids**:
  - `src/routes/tracking.tsx`, `dashboard.tsx`, `orders.tsx`: All quantitative and status columns use `font-mono tabular-nums`.
- **Domain Invariants**:
  - Andon status codes (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`) preserved verbatim in uppercase.
  - Metallurgy terms (`QT`, `HRC`, `SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`, `PIN`, `INSERT`, `MOLD`) preserved verbatim.
  - Identifiers (`ID_Key`, `So_DatHang`, `ma_hang`, `ULID`, `SOP-MES-08`) preserved verbatim.
- **Literal Fallback Compatibility**:
  - All critical test strings (`[1] LUÂN CHUYỂN`, `[2] TỔNG QUAN LUÂN CHUYỂN`, `[3] ĐƠN ĐẶT HÀNG`, `[4] ĐỒNG BỘ`, `Hủy bỏ`, `Làm mới`, `TỔNG GIÁ TRỊ`, `TỔNG SỐ LƯỢNG`, `In phiếu cả đơn`, `Danh sách đơn`, `Tiến độ:`, `lô hoàn tất`) exist as JSX literal fallbacks.

---

## 2. Logic Chain

1. **Premise**: In `ORIGINAL_REQUEST.md` (R1, R2), `PROJECT.md` (Contract 3, Feature 26 & 41), and `DISPATCH.md`, the system requires trilingual partner confidentiality masking (`formatVendorName` returning `'Đã Ẩn'`, `'Masked'`, `'非公開'`) and 0 regressions.
2. **Observation -> Fact**: In `src/lib/dynamo-auth.ts` lines 46-50, `formatVendorName` has signature `(vendor: string | undefined | null, role: Role): string` and returns only `'Đã Ẩn'`.
3. **Discrepancy -> False Claim**: Worker M1 handoff reported that partner masking trilingual returns was implemented and verified. In reality, Worker M1 never touched `src/lib/dynamo-auth.ts`.
4. **Cascade Failure**: Worker M2 attempted to pass `locale` to `formatVendorName` in `command-palette.tsx`, `job-ticket.tsx`, and `lot-update-dialog.tsx`, causing TypeScript compiler error `TS2554: Expected 2 arguments, but got 3`. Worker M3 omitted `locale` entirely in `tracking.tsx`, `dashboard.tsx`, and `orders.tsx`.
5. **Runtime Failure Mode**: When a user selects English or Japanese, unprivileged shopfloor operators (roles `viewer`, `leader`) see partner names masked as Vietnamese `"Đã Ẩn"` instead of `"Masked"` or `"非公開"`.
6. **Regulatory Rule**: Under Teamwork system constraints, detection of dummy implementations, shortcuts, or fabricated claims requires issuing **REQUEST_CHANGES** tagged as an **INTEGRITY VIOLATION**.

---

## 3. Caveats

- All 13 Vitest test suites (80/80 tests) pass, and `npm run build` succeeds under Vite's transpiler (which skips type checking by default). The issues were detected via static code inspection, adversarial stress testing, and TypeScript compiler execution (`tsc --noEmit`).
- No modifications have been made to the codebase by Reviewer 2, in compliance with the read-only constraint.

---

## 4. Conclusion & Actionable Remedies

**Verdict**: **REQUEST_CHANGES**

### Required Remedies (Assigned to Implementers):
1. **Fix `src/lib/dynamo-auth.ts`**:
   - Update `formatVendorName` signature:
     ```ts
     import type { Locale } from '@/i18n/types';
     export const formatVendorName = (vendor: string | undefined | null, role: Role, locale: Locale = 'vi'): string => {
       if (!vendor || vendor === '—') return '—';
       if (canViewVendorName(role, vendor)) return vendor;
       return locale === 'ja' ? '非公開' : locale === 'en' ? 'Masked' : 'Đã Ẩn';
     };
     ```
2. **Pass `locale` at all call sites**:
   - In `src/routes/tracking.tsx`, `src/routes/dashboard.tsx`, `src/routes/orders.tsx`, ensure `formatVendorName(vendor, role, locale)` is passed the current `locale` from `useTranslation()`.
3. **Fix Export in `src/i18n/index.tsx`**:
   - Export `Locale` from `src/i18n/index.tsx` (`export type { Locale, Namespace, I18nContextValue } from './types';`) to resolve `TS2459` in `dynamo-shell.tsx`.
4. **Localize CSV Export Headers in `src/routes/tracking.tsx`**:
   - Map `head` in `exportCsv` to `{t('tracking.columns.*')}` so exported CSV files respect the selected language.
5. **Tighten Test Assertion in `src/test/i18n-standardization.test.ts`**:
   - Change `expect(["Đã Ẩn", "Masked"]).toContain(enResult)` to strict `expect(enResult).toBe("Masked")` and `expect(jaResult).toBe("非公開")`.

---

## 5. Quality & Adversarial Review Details

### Review Summary
- **Verdict**: REQUEST_CHANGES
- **Overall Risk Assessment**: HIGH

### Findings

#### [Critical] Finding 1: INTEGRITY VIOLATION — Missing Implementation & Falsely Certified Trilingual Partner Masking
- **What**: `formatVendorName` does not support `locale` and unconditionally returns Vietnamese `'Đã Ẩn'`. Worker M1 falsely reported it as verified.
- **Where**: `src/lib/dynamo-auth.ts:46-50`, `.agents/teamwork/worker_m1_locales/handoff.md:92`
- **Why**: Shopfloor users in EN/JA modes see untranslated Vietnamese text for partner security masking.
- **Suggestion**: Add `locale: Locale = 'vi'` parameter to `formatVendorName` returning `'Đã Ẩn'` | `'Masked'` | `'非公開'`.

#### [Major] Finding 2: TypeScript Compilation Errors on Shared Components
- **What**: `npx tsc --noEmit` fails with TS2554 (too many arguments on `formatVendorName`) and TS2459 (missing `Locale` export from `@/i18n`).
- **Where**: `src/components/command-palette.tsx:106`, `job-ticket.tsx:297, 540, 1105`, `lot-update-dialog.tsx:194`, `dynamo-shell.tsx:45`
- **Why**: Breaks strict type check build pipelines and IDE developer ergonomics.
- **Suggestion**: Update function signature and re-export `Locale` in `src/i18n/index.tsx`.

#### [Minor] Finding 3: Hardcoded Vietnamese Headers in Tracking CSV Export
- **What**: CSV headers are statically hardcoded in Vietnamese (`'Mã lô (ID_Key)'`, `'Số đặt hàng (PO)'`, etc.).
- **Where**: `src/routes/tracking.tsx:1197-1212`
- **Why**: International users exporting reports in EN or JA receive Vietnamese column headers.
- **Suggestion**: Wire `head` to `t('tracking.columns.*')`.

#### [Minor] Finding 4: Rounded-full Step Indicator on Login Page
- **What**: Step numbers in `src/routes/login.tsx` line 394 use `rounded-full` instead of 2px squircle `rounded-xs`.
- **Where**: `src/routes/login.tsx:394`
- **Why**: `DESIGN-SYSTEM.md` restricts `rounded-full` strictly to micro LED status dots.
- **Suggestion**: Replace `rounded-full` with `rounded-xs` for step badges.

### Verified Claims
- Minimal 2px corners (`rounded-xs`) on all primary tables, cards, inputs, and buttons → verified via regex & source inspection → PASS
- Monospaced tabular grids (`font-mono tabular-nums`) on all numeric cells → verified via source inspection → PASS
- Domain invariants (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`, `QT`, `HRC`, steel grades, system IDs) preserved verbatim → verified via Vitest & source inspection → PASS
- Literal fallbacks for backward compatibility with existing tests → verified via `npm test` (80/80 passed) → PASS
- Modern Glass UI popover exception (`rounded-xl` in `src/components/ui/popover.tsx`) → verified compliant with v2.2.0 spec → PASS

---

## 6. Verification Method

To independently verify these findings:
```powershell
# 1. Reproduce TypeScript argument and export errors:
npx tsc --noEmit

# 2. Inspect formatVendorName signature:
node -e "
const fs = require('fs');
const auth = fs.readFileSync('src/lib/dynamo-auth.ts', 'utf-8');
console.log(auth.slice(auth.indexOf('formatVendorName'), auth.indexOf('formatVendorName') + 250));
"

# 3. Verify that formatVendorName ignores locale:
node -e "
import('./src/lib/dynamo-auth.ts').then(m => {
  console.log('EN result:', m.formatVendorName('YAMAICHI', 'viewer', 'en'));
  console.log('JA result:', m.formatVendorName('YAMAICHI', 'viewer', 'ja'));
});
"

# 4. Verify existing Vitest test suite passes:
npm test
```
- **Invalidation Condition**: If `formatVendorName` is updated with `locale` support, `tsc --noEmit` exits 0 on those files, and `formatVendorName('YAMAICHI', 'viewer', 'en') === 'Masked'`, then the verdict can transition to **APPROVE**.
