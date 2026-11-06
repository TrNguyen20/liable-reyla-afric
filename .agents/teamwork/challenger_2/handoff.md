# Adversarial Challenge & Stress-Testing Handoff Report

- **Agent**: `teamwork_challenger` (Challenger 2)
- **Roles**: critic, specialist
- **Working Directory**: `.agents/teamwork/challenger_2/`
- **Milestone Target**: DYNAMO MES Trilingual Standardization [VI] [EN] [JA] — Final Verification Gate
- **Timestamp**: 2026-11-06T03:12:00Z
- **Verdict**: **FLAG_DEFECTS**

---

## 1. Observation

### 1.1 Security & Masking Audit (`formatVendorName` & `canViewPricing`)
1. **Partner Confidentiality Masking (`formatVendorName`)**:
   - In `src/lib/dynamo-auth.ts`:
     ```typescript
     export const formatVendorName = (vendor: string | undefined | null, role: Role): string => {
       if (!vendor || vendor === '—') return '—';
       if (canViewVendorName(role, vendor)) return vendor;
       return 'Đã Ẩn';
     };
     ```
   - **Observation**: Function signature accepts only `(vendor, role)`. It does NOT accept a `locale` argument.
   - When called as `formatVendorName('YAMAICHI', 'viewer', 'en')` or `formatVendorName('YAMAICHI', 'viewer', 'ja')`, the 3rd argument is completely ignored, and it returns `'Đã Ẩn'`.
   - In `src/components/lot-update-dialog.tsx:194`, `src/components/job-ticket.tsx:297,540,1105`, and `src/components/command-palette.tsx:106`, developers passed `formatVendorName(item.cty_QT, role, locale)`. The 3rd parameter `locale` has no effect.
   - In `src/test/i18n-standardization.test.ts` lines 478-479:
     ```typescript
     expect(["Đã Ẩn", "Masked"]).toContain(enResult);
     expect(["Đã Ẩn", "非公開"]).toContain(jaResult);
     ```
     The test was relaxed to permit `'Đã Ẩn'` instead of asserting strict trilingual masking `'Masked'` and `'非公開'`.
   - **Security Invariant Verification**: For roles `viewer`, `leader`, and invalid/unauthenticated roles, contractor names NEVER leak (returns `'Đã Ẩn'`). Scoped partner roles (`qt_yamaichi`, `qt_provision`) are strictly bounded to their assigned scope.

2. **Pricing Masking (`canViewPricing` & `money()`)**:
   - In `src/lib/dynamo-auth.ts:30`:
     `export const canViewPricing = (role: Role) => role === 'admin' || role === 'leader';`
   - In `src/lib/dynamo-data.ts:16`:
     `export const money = (value: number) => isPricingVisible() ? new Intl.NumberFormat('vi-VN').format(value) + ' ₫' : '*** ₫';`
   - In `src/routes/orders.tsx`:
     - Line 69: `const isPricingAllowed = canViewPricing(role);`
     - Line 157 (CSV export): `...(isPricingAllowed ? (['don_gia', 'thanh_tien'] as (keyof QTItem)[]) : []),`
     - Lines 326, 474, 595, 642: All pricing values are conditioned on `isPricingAllowed`. When false, orders displays item count or masks to `'*** ₫'`.
   - In `src/routes/tracking.tsx`:
     - Detail modal lines 4133-4152: Gated by `canViewPricing(role as any)`.
     - CSV export lines 1197-1229: Does NOT contain `don_gia` or `thanh_tien` in exported columns.
   - In `src/components/job-ticket.tsx:227,358`:
     - Gated by `const pricing = canViewPricing(role);`. Suppressed on A4 tickets and Pallet Tags.
   - In `src/routes/dashboard.tsx:351`:
     - KPI-05 renders `money(cost)`, which resolves to `'*** ₫'` when `setPricingVisible(false)` is invoked by unprivileged sessions.

### 1.2 Domain Invariants Stress Test
1. **Andon Status Codes**:
   - In all 21 JSON files (`src/i18n/locales/{vi,en,ja}/*.json`):
     - `tracking.json.status.wait === 'WAIT'`
     - `tracking.json.status.transit === 'TRANSIT'`
     - `tracking.json.status.stocked === 'STOCKED'`
     - `tracking.json.status.pass === 'PASS'`
     - `tracking.json.status.fail === 'FAIL'`
     - `tracking.json.status.pending === 'PENDING'`
   - Preserved 100% in uppercase across all 3 languages.
2. **Metallurgy & Engineering Units (`HRC`, Steel Grades, Workshops)**:
   - `HRC` has exactly 5 occurrences in `vi/common.json`, 5 in `en/common.json`, and 5 in `ja/common.json` (100% invariant parity).
   - Tool steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`) remain invariant in `src/lib/materials-data.ts`.
   - Workshops `PIN`, `INSERT`, `MOLD` remain uppercase across all 3 locales in `tracking.json` and `common.json`.
3. **Engineering Symbol `QT` Drop in Japanese**:
   - Occurrence count for `\bQT\b`:
     - `common.json`: `VI = 15`, `EN = 13`, `JA = 8`
     - `dashboard.json`: `VI = 1`, `EN = 1`, `JA = 0`
   - In `src/i18n/locales/ja/dashboard.json` line 78:
     - VI: `"BIÊN BẢN BÀN GIAO CA SẢN XUẤT & ĐỐI TÁC QT"`
     - EN: `"PRODUCTION & SUBCONTRACT QT SHIFT HANDOVER REPORT"`
     - JA: `"製造引渡および外注熱処理工程報告書"` -> **`QT` was completely dropped in Japanese.**
   - In `src/i18n/locales/ja/common.json`:
     - `notFound.backAction`: VI `"Quay về Luân chuyển QT"` -> JA `"熱処理工程管理へ戻る"` (Dropped `QT`)
     - `errorBoundary.goHome`: VI `"Về Luân chuyển QT"` -> JA `"熱処理工程管理へ"` (Dropped `QT`)
     - `auth.hero.badge`: VI `"HỆ THỐNG ĐIỀU HÀNH QT NỘI BỘ"` -> JA `"社内熱処理管理システム"` (Dropped `QT`)
     - `auth.hero.title`: VI `"Quản Lý Nhà Thầu Phụ Nhiệt Luyện & Luân Chuyển QT"` -> JA `"熱処理外注・工程管理システム"` (Dropped `QT`)
     - `lotUpdate.dateBeforeSent`: VI `"Ngày nhận không được trước ngày gửi QT."` -> JA `"受入日は熱処理発送日より前にはできません。"` (Dropped `QT`)

### 1.3 Wireframe UI Constraint Stress Test
1. **Border Radius 2px (`rounded-xs`) Compliance**:
   - Core routes (`tracking.tsx`, `dashboard.tsx`, `orders.tsx`, `sync.tsx`) and composite shell contain zero `rounded-lg`, `rounded-xl` (except authorized popover glass overlay in `popover.tsx`), `rounded-2xl`, or `rounded-3xl`.
   - Monospaced tabular formatting (`font-mono tabular-nums`) is verified across all order numbers, dates, and quantitative table cells.
2. **Negative Constraint Violation in `login.tsx`**:
   - In `src/routes/login.tsx` line 394:
     ```tsx
     <span aria-hidden className={`flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tabular-nums transition-colors...`}>
       {state === "done" ? <CheckCircle2 size={14} /> : i + 1}
     </span>
     ```
   - Uses `size-6 rounded-full` for step indicator circles.
   - Violates `DESIGN-SYSTEM.md` Section 3 ("ngoại lệ duy nhất cho rounded-full là các chấm tròn đèn LED tín hiệu size-1.5 hoặc size-2") and `AGENTS.md` ("rounded-full is restricted only to micro LED status dots").

### 1.4 Test Suite Failures (`npm test`)
- Executing `npm test`:
  ```
  Test Files  1 failed | 13 passed (14)
  Tests       1 failed | 107 passed (108)
  ```
- Failure occurred in `src/test/i18n-adversarial-stress.test.ts` at test `STRESS-DICT-04: Static code analysis: every t("...") literal call in src/ exists in dictionaries`.
- **45+ missing translation keys** were called directly in components:
  - `orders.kpis.totalValue` (in `orders.tsx:476,644`)
  - `orders.kpis.totalQty` (in `orders.tsx:480,649`)
  - `orders.telemetry.viewing` (in `orders.tsx:639`, `tracking.tsx:3276`)
  - `ticket.fields.orderNo` (in `job-ticket.tsx:531`)
  - `dashboard.handover.urgentCheckProgress` (in `dashboard.tsx:1070`)
  - `dashboard.handover.noOverdueNotice` (in `dashboard.tsx:1076`)
  - `dashboard.handover.a4Notice` (in `dashboard.tsx:1084`)
  - `common.loading.permissions`, `common.loading.failedTitle`, `common.loading.syncing` (in `dynamo-shell.tsx`)
- **Impact on Chained Fallbacks**:
  - In `src/i18n/index.tsx`, when a key is not found, `t(key)` returns the key string itself (e.g. `'orders.kpis.totalValue'`).
  - Because non-empty strings are truthy in JavaScript, chained fallbacks such as:
    `{t('orders.kpis.totalValue') || t('orders.kpiTotalValue') || 'TỔNG GIÁ TRỊ'}`
    evaluate immediately to the first operand `'orders.kpis.totalValue'`, preventing the fallback literal `'TỔNG GIÁ TRỊ'` from ever rendering!

---

## 2. Logic Chain

1. **Premise 1 (R2 & PROJECT.md Privacy Contract)**:
   - Partner masking requires that contractor names never leak to `viewer` or `leader`, and `formatVendorName` must support trilingual masking returning `'Đã Ẩn'` (VI), `'Masked'` (EN), `'非公開'` (JA).
   - *Observation Reference*: Section 1.1.
   - *Deduction*: While raw names never leak, `formatVendorName` does not support `locale`, always hardcoding `'Đã Ẩn'` even when users select EN or JA. This violates the trilingual requirement and leaves dead parameters in calling components.

2. **Premise 2 (R2 Domain Invariant Contract)**:
   - Ký hiệu kỹ thuật nhiệt luyện `QT` must be preserved invariant in all 3 languages without translation into descriptive text.
   - *Observation Reference*: Section 1.2.
   - *Deduction*: In Japanese locale files (`ja/dashboard.json: docHeader` and 7 keys in `ja/common.json`), `QT` was dropped and replaced by descriptive phrases (e.g. `外注熱処理工程`). This violates R2.

3. **Premise 3 (Graphite Wireframe UI Negative Constraint)**:
   - `DESIGN-SYSTEM.md` and `AGENTS.md` strictly restrict `rounded-full` to micro LED status dots (`size-1.5` or `size-2`). No other elements may use `rounded-full`.
   - *Observation Reference*: Section 1.3.
   - *Deduction*: `src/routes/login.tsx:394` uses `size-6 rounded-full` for step indicator circles, violating the design system negative constraint.

4. **Premise 4 (Acceptance Criteria & Test Gate)**:
   - Full automated test suite `npm test` must pass cleanly with 0 failures and 0 missing keys.
   - *Observation Reference*: Section 1.4.
   - *Deduction*: `npm test` fails with exit code 1 due to 45+ missing dictionary keys, causing raw keys to render in UI due to truthy return values in fallback chains.

---

## 3. Caveats

- **Pricing Security**: Fully verified and rock-solid. `canViewPricing` correctly gates `admin` and `leader`, masks values to `'*** ₫'`, strips price columns in orders/tracking CSVs, and suppresses pricing in A4 printouts.
- **Partner Confidentiality**: Raw names NEVER leak to unauthorized roles under any circumstances. The flaw is purely the absence of trilingual localized strings (`'Masked'`, `'非公開'`) in `src/lib/dynamo-auth.ts`.
- **Component Changes**: Under the review-only constraint of this role, no fixes were committed to source files.

---

## 4. Conclusion

Final Assessment: **FLAG_DEFECTS**

The codebase contains 4 confirmed defects that block production-ready release:
1. **DEFECT-SEC-01 (High)**: `formatVendorName` in `src/lib/dynamo-auth.ts` lacks `locale` parameter support, returning hardcoded Vietnamese `'Đã Ẩn'` in English and Japanese modes.
2. **DEFECT-INV-01 (Medium)**: Technical invariant `QT` was dropped in Japanese translations in `ja/dashboard.json` (A4 handover report header) and 7 keys in `ja/common.json`.
3. **DEFECT-UI-01 (Low/Medium)**: `src/routes/login.tsx:394` uses `size-6 rounded-full` step badges, violating the 2px corner wireframe specification.
4. **DEFECT-I18N-01 (High)**: 45+ missing dictionary keys in components cause raw dot-separated strings (e.g. `'orders.kpis.totalValue'`) to render in UI and break `npm test`.

---

## 5. Verification Method

To independently reproduce all observations and failures:

1. **Run Challenger 2 Empirical Test Suite**:
   ```powershell
   npx vitest run src/test/adversarial-challenger-2.test.ts
   ```
   *Expected*: Confirms 3 failing tests corresponding to DEFECT-SEC-01, DEFECT-INV-01, and DEFECT-UI-01.

2. **Run Full Project Test Suite**:
   ```powershell
   npm test
   ```
   *Expected*: Exits with code 1 due to `STRESS-DICT-04` in `src/test/i18n-adversarial-stress.test.ts`.

3. **Inspect Problematic Source Locations**:
   - `src/lib/dynamo-auth.ts:46` (`formatVendorName` signature and hardcoded return)
   - `src/i18n/locales/ja/dashboard.json:78` (`docHeader` missing `QT`)
   - `src/routes/login.tsx:394` (`size-6 rounded-full` step circle)
