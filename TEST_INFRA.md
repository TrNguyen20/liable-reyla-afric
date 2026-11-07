# DYNAMO QT-MES: Trilingual [VI] [EN] [JA] Test Infrastructure & Verification Architecture

> **Document Version**: 2.3.0  
> **Standard**: Graphite Wireframe UI (v2.2.0)  
> **Test Framework**: Vitest (v4.1.11) + React Testing Library  
> **Target Scope**: Trilingual Localization Standardization [VI] [EN] [JA] & Domain Invariant Preservation  
> **Status**: Authoritative Test Specification (Single Source of Truth)

---

## 1. Quality Objectives & Testing Philosophy

DYNAMO QT-MES is a mission-critical manufacturing execution system operating on factory desktops, industrial kiosks, and shopfloor terminals. Gaps in localization or corrupted engineering symbols directly threaten production efficiency, barcode scanning, heat treatment specifications, and partner business confidentiality.

The test infrastructure enforces five non-negotiable principles:
1. **Zero-Mock / Zero-Facade Integrity**: Tests run against genuine dictionary JSON files, real formatter logic, and authentic component trees. No dummy passes, no simulated mock data circumventing business logic.
2. **Recursive Key Parity (100% Synchronicity)**: Every user-facing key defined in Vietnamese (`vi`) MUST exist with identical tree structure in English (`en`) and Japanese (`ja`). Missing keys and extraneous keys are strictly prohibited.
3. **Domain Invariants Lock**: Universal lean Andon status codes (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`), metallurgy standards (`QT`, `HRC`, `SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), workshop codes (`PIN`, `INSERT`, `MOLD`), and system identifiers (`ID_Key`, `So_DatHang`, `ma_hang`, `ULID`) must NEVER be translated or modified.
4. **Graphite Wireframe UI Token Compliance**: UI elements must strictly adhere to `DESIGN-SYSTEM.md` v2.2.0 with minimal 2px corners (`rounded-xs`), monospaced numerical tables (`font-mono tabular-nums`), and zero consumer design artifacts.
5. **Poka-Yoke Partner Confidentiality**: Strict role-based vendor masking (`formatVendorName`) guarantees that unprivileged roles (`viewer`, `leader`) never leak contractor names in any language (`Đã Ẩn` / `Masked` / `非公開`).

---

## 2. 4-Tier Test Methodology & Specification Matrix

The test framework organizes all verification into four distinct architectural tiers:

```
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 4: Real-World Scenarios, Cultural Formatters & Security           │
│         (Date / Shift / Number Formatters, Role Privacy Masking)       │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 3: Cross-Feature Interactions & Domain Invariants Enforcement     │
│         (Andon Status Codes, Metallurgy, System IDs, UI Tokens)        │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 2: Boundary & Corner Cases                                        │
│         (Leaf String Integrity, Whitespace Trimming, Placeholders)     │
├────────────────────────────────────────────────────────────────────────┤
│ TIER 1: Feature Coverage & Namespace Parity                            │
│         (Recursive Key Parity across 7 Namespaces, Locale Configs)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Tier 1: Feature Coverage & Namespace Parity

Tier 1 verifies that all locale dictionaries and configuration files exist, load without syntax errors, and maintain strict bidirectional key equality across all supported languages.

| Test ULID | Scope | Verification Description | Authoritative Source |
|---|---|---|---|
| **`TC-I18N-T1-01`** | Dictionary Files Existence | Verifies that all 21 JSON dictionary files (3 locales × 7 namespaces: `common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`) exist on disk and parse validly as JSON. | `PROJECT.md` § Architecture |
| **`TC-I18N-T1-02`** | Recursive Key Parity Audit | Recursively traverses `vi`, `en`, and `ja` JSON trees for all 7 namespaces and asserts: (1) Zero missing keys in `en` compared to `vi`, (2) Zero missing keys in `ja` compared to `vi`, (3) Zero extraneous keys in `en` or `ja` not defined in `vi`. | `ORIGINAL_REQUEST.md` R3, `survey.md` § 2.2 |
| **`TC-I18N-T1-03`** | Locale Configuration & Fallbacks | Asserts `SUPPORTED_LOCALES = ['vi', 'en', 'ja']`, `DEFAULT_LOCALE = 'vi'`, and `FALLBACK_CHAIN`: `ja` → `['en', 'vi']`, `en` → `['vi']`, `vi` → `[]`. | `src/i18n/config.ts` |

---

### Tier 2: Boundary & Corner Cases

Tier 2 guards against corrupt or malformed localization entries that cause UI misalignment, runtime exceptions, or missing text in production.

| Test ULID | Scope | Verification Description | Authoritative Source |
|---|---|---|---|
| **`TC-I18N-T2-01`** | Leaf Value Integrity (No Empty Strings) | Asserts that no key in any of the 21 JSON files resolves to an empty string (`""`), `null`, `undefined`, or whitespace-only value. | `ORIGINAL_REQUEST.md` Acceptance Criteria |
| **`TC-I18N-T2-02`** | Whitespace Trimming Audit | Asserts that every string leaf value equals `val.trim()`. Trailing or leading whitespace causes misalignments in monospaced industrial data grids. | `DESIGN-SYSTEM.md` Core Principles |
| **`TC-I18N-T2-03`** | Dynamic Placeholder Parity | Extracts all interpolation tokens (`{param}`) via regex and verifies that if a key in `vi` contains parameters (e.g. `{count}`, `{shift}`), the corresponding keys in `en` and `ja` contain the exact same parameter names. | `src/i18n/index.tsx` parameter interpolation |

---

### Tier 3: Cross-Feature Interactions & Domain Invariants Enforcement

Tier 3 guarantees that universal manufacturing codes, metallurgy standards, database keys, and UI design tokens remain intact across all languages.

| Test ULID | Scope | Verification Description | Authoritative Source |
|---|---|---|---|
| **`TC-I18N-T3-01`** | Shopfloor Lean Andon Status Codes | Asserts that the 6 universal status codes (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`) are preserved verbatim in uppercase in all 3 language dictionaries and never translated into foreign words. | `DESIGN-SYSTEM.md` § 2.3.3, `survey.md` § 4.1 |
| **`TC-I18N-T3-02`** | Metallurgy & Engineering Standards | Asserts that core heat treatment brand abbreviation `QT`, hardness scale `HRC`, tool steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), and workshops (`PIN`, `INSERT`, `MOLD`) are preserved verbatim across all 3 language dictionaries. | `DESIGN-SYSTEM.md` § 1, `survey.md` § 4.3 |
| **`TC-I18N-T3-03`** | System Identifiers & Factory Codes | Asserts that database column keys (`ID_Key`, `So_DatHang`, `ma_hang`), authentication token (`ULID`), work ticket document prefix (`DVN-QT-`), and shift handover SOP code (`SOP-MES-08`) remain invariant. | `PROJECT.md` § Interface Contracts |
| **`TC-I18N-T3-04`** | Graphite Wireframe UI Token Compliance | Asserts that `--radius` in `src/styles.css` is `2px`, buttons and cards use `rounded-xs` (2px) or `rounded-sm` (max 4px), quantitative columns use `font-mono tabular-nums`, and no consumer pill classes (`rounded-full`) appear on operational cards. | `DESIGN-SYSTEM.md` § 2.1, § 3 |

---

### Tier 4: Real-World Scenarios, Cultural Formatters & Security Masking

Tier 4 validates factory runtime behaviors under actual internationalization scenarios, including locale-sensitive time/date formatting, factory shifts, and partner confidentiality.

| Test ULID | Scope | Verification Description | Authoritative Source |
|---|---|---|---|
| **`TC-I18N-T4-01`** | Locale-Aware Date Formatting (`formatDate`) | Verifies that dates format correctly: Vietnamese `DD/MM/YYYY`, English `MM/DD/YYYY`, Japanese standard `YYYY/MM/DD` and full format `YYYY年MM月DD日`. Handles edge cases (null, invalid dates, timestamps) safely. | `src/i18n/formatters.ts`, `survey.md` § 2.1 |
| **`TC-I18N-T4-02`** | Production Shift Formatter (`formatShift`) | Verifies shift formatting: Vietnamese (`Ca 1`, `Ca 2`, `Ca 3`), English (`Shift 1`, `Shift 2`, `Shift 3`), Japanese (`1直`, `2直`, `3直`). Validates string/number inputs and fallback safety. | `src/i18n/formatters.ts`, `survey.md` § 2.1 |
| **`TC-I18N-T4-03`** | Industrial Number Formatting (`formatNumber`) | Verifies thousand and decimal delimiters across locales: `28442` formats as `28.442` (VI) and `28,442` (EN/JA). Validates 0 and NaN handling. | `src/i18n/formatters.ts` |
| **`TC-I18N-T4-04`** | Poka-Yoke Partner Privacy Masking (`formatVendorName`) | Verifies that unprivileged roles (`viewer`, `leader`) receive localized masked strings (`'Đã Ẩn'` for VI, `'Masked'` for EN, `'非公開'` for JA). Privileged role `admin` sees genuine vendor names. Scoped partner role (`qt_yamaichi`) sees only their own company name. | `src/lib/dynamo-auth.ts`, `PROJECT.md` § 3 |

---

## 3. Test Suite Inventory & File Map

The project test landscape consists of 13 automated test suites:

```
src/test/
├── i18n-standardization.test.ts      # [NEW - T-E2E Track] 4-Tier Comprehensive Trilingual Suite
├── i18n-and-header.test.ts           # Header v2.3, Micro-Pill Switcher & Formatter Baseline
├── design-system-compliance.test.ts  # Graphite Wireframe Token & 2px Corner Verification
├── app-routing.test.tsx              # Official Route Navigation & Redirects (/tracking, /sync...)
├── ui-ux-standardization.test.ts     # UI/UX Standardization & Literal Invariant Checks
├── dashboard-enhancements.test.ts    # Dashboard KPIs, Pipeline, Bottlenecks & A4 Handover
├── orders-optimization.test.ts       # Orders Master-Detail Split Grid & Sub-filters
├── server-dataset.test.ts            # Server-Assisted Realtime Live Hub & Delta Sync
├── centralized-webhook-sync.test.ts  # Centralized Google Apps Script Webhook Sync
├── cache-busting-sync.test.ts        # HTTP Cache Busting & Data Freshness
├── lockout.test.ts                   # Kiosk ULID Brute-force Lockout Timer
├── login-interlock.test.ts           # Poka-Yoke Login Position vs Role Interlock
└── data-scope.test.ts                # Vendor Data Scoping & Role Isolation
```

---

## 4. Test Invariant Guards (Preserving Backward Compatibility)

Four existing test suites inspect source files directly via `fs.readFileSync`. When localizing components in subsequent milestones (M2, M3), developers **MUST** use literal fallbacks so existing tests continue to pass:

```tsx
// Pattern 1: Route Titles (Required by ui-ux-standardization.test.ts and i18n-and-header.test.ts)
<span className="font-mono text-xs font-black tracking-wider uppercase text-foreground">
  {t('nav.route1Title') || '[1] LUÂN CHUYỂN'}
</span>

// Pattern 2: Critical Actions (Required by ui-ux-standardization.test.ts)
<Button variant="ghost">
  {t('common.cancel') || 'Hủy bỏ'}
</Button>
<Button variant="outline">
  {t('common.refresh') || 'Làm mới'}
</Button>

// Pattern 3: Orders & Dashboard KPIs (Required by orders-optimization.test.ts and dashboard-enhancements.test.ts)
<p>{t('orders.kpiTotalValue') || 'TỔNG GIÁ TRỊ'}</p>
<p>{t('orders.kpiTotalQty') || 'TỔNG SỐ LƯỢNG'}</p>
<Badge>{t('dashboard.kpis.kpi5ReadOnly') || 'CHỈ ĐỌC / NỘI BỘ'}</Badge>
```

---

## 5. Execution & Diagnostic Commands

### Run the Trilingual Standardization Test Suite
```powershell
npx vitest run src/test/i18n-standardization.test.ts
```

### Run the Full Project Test Suite (All 13 Suites)
```powershell
npm test
```

### Run with Watch Mode (Active Development)
```powershell
npx vitest watch src/test/i18n-standardization.test.ts
```

### Run Full Test Suite with Detailed Reporter
```powershell
npx vitest run --reporter=verbose
```

---

## 6. Milestone Traceability & TDD Roadmap

| Milestone | Expected Suite Result | Key Objectives |
|---|---|---|
| **T-E2E (Current)** | Test Suite Established | Establish `TEST_INFRA.md`, author `src/test/i18n-standardization.test.ts`, publish `TEST_READY.md`. Initial baseline documents passing checks and defines contract for M1. |
| **M1** | Tier 1, 2, 3, 4 Pass 100% | Expand 21 JSON files to ~380 keys with 100% parity, implement localized `formatVendorName` masking. All 14 tests in `i18n-standardization.test.ts` pass cleanly. |
| **M2** | Regressions Pass (Shell/Login) | Refactor `dynamo-shell.tsx`, `login.tsx`, `shopfloor-telemetry.tsx` with literal fallbacks. `i18n-and-header.test.ts` passes. |
| **M3** | Regressions Pass (Routes/A4) | Refactor `tracking.tsx`, `dashboard.tsx`, `orders.tsx`, `sync.tsx` with literal fallbacks. `dashboard-enhancements.test.ts` and `orders-optimization.test.ts` pass. |
| **M4** | 100% Green on `npm test` | All 13 test files (80+ tests) pass with zero failures. Challenger adversarial testing and forensic audit pass. |
