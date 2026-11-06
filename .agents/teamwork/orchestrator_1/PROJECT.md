# Project: DYNAMO MES Trilingual Standardization [VI] [EN] [JA]

## Architecture
- **i18n Core Engine**: Native React Context provider in `src/i18n/`, zero third-party runtime dependency, SSR Nitro safe with `dynamo-locale` cookie and localStorage fallback chain: `ja` → `en` → `vi` → key.
- **Locale Dictionaries**: 21 JSON dictionary files located at `src/i18n/locales/{vi,en,ja}/{common,nav,tracking,dashboard,orders,sync,telemetry}.json`.
- **UI & Design Tokens**: Compliant with `DESIGN-SYSTEM.md` v2.2.0 (Graphite Wireframe, 2px corners `rounded-xs`, monospaced tabular numbers `font-mono tabular-nums`, no consumer pill buttons except micro LED dots).
- **Dual Track Orchestration**:
  1. **E2E Testing Track**: Autonomous test track establishing `TEST_INFRA.md` and `src/test/i18n-standardization.test.ts` (verifying 100% key parity, zero empty strings, domain invariants preservation, and locale formatters).
  2. **Implementation Track**: Sequential milestone delivery (M1: Dictionaries → M2: Shell & Common UI → M3: Core Routes → M4: Final Test Pass & Hardening).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Trilingual Switcher | Segmented Micro-Pill in Header and Login (`[VI] [EN] [JA]`) | M2 | Survey / shell |
| 2 | Multi-tier Fallback Engine | Resolves missing keys down chain `ja` → `en` → `vi` | M1 | Survey / spec |
| 3 | Cultural Formatters | Date, time, shift (`Ca 1`/`Shift 1`/`1直`), numbers | M1 | Survey / spec |
| 4 | Domain Invariants Lock | Preserve `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`, `QT`, `HRC`, steel grades, IDs | M1 | Survey / spec |
| 5 | Route Navigation & Sub-headers | Official wireframe headers `[1]`..`[4]` with fallback preservation | M2 | Survey / shell |
| 6 | Navigation Tooltips & Shortcuts | Localized tooltip text preserving shortcut keys | M2 | Survey / shell |
| 7 | Offline Alert Banner | Localized factory network offline warning bar | M2 | Survey / shell |
| 8 | ULID Login Page & Hero Panel | Full trilingual login page, position selectors, kiosk keypad, error alerts | M2 | Survey / shell |
| 9 | Shopfloor Telemetry Ribbon | Localized live connection states, external volume, workshop load, shifts | M2 | Survey / shell |
| 10 | Global Command Palette | Localized search placeholder, group headers, actions | M2 | Survey / shell |
| 11 | Job Ticket & A4 Print Studio | Localized A4 work ticket, ISO 216 layout, Pallet tag, delivery manifest | M2 | Survey / shell |
| 12 | Lot Update Workflow Modal | Localized status transitions, defect reasons, receipt date, HRC | M2 | Survey / shell |
| 13 | Webhook Configuration Dialog | Localized URL input, instructions, test connection, save toast | M2 | Survey / shell |
| 14 | Root Error Boundary & 404 | Localized fail-safe error screen, self-heal button, 2px corner fix | M2 | Survey / shell |
| 15 | Tracking Table Column Headers | 15 localized column headers with monospace styling | M3 | Survey / routes |
| 16 | Tracking Focus Filter Bar | 8 quick-filter buttons (`overdue`, `due_soon`, `open`, `stocked`, etc.) | M3 | Survey / routes |
| 17 | Tracking Continuous Date Sort | Localized sort cycling tooltips and status | M3 | Survey / routes |
| 18 | Tracking Batch Action Bar | Localized selection counters, logistics popovers, QC popover, CSV export | M3 | Survey / routes |
| 19 | Dashboard 5 KPI Cards | Localized `[KPI-01]`..`[KPI-05]` titles, descriptions, target badges | M3 | Survey / routes |
| 20 | Dashboard 4-Stage Pipeline | Localized progress bar stages, late lot counters | M3 | Survey / routes |
| 21 | Dashboard Bottleneck Table | Localized partner and workshop capacity breakdown | M3 | Survey / routes |
| 22 | A4 Shift Handover Report (SOP-MES-08) | Localized printable A4 report, metadata, urgent lots, notes, 3 signature blocks | M3 | Survey / routes |
| 23 | Orders Master-Detail Split Grid | Localized PO list headers, search, counter, material filter tag | M3 | Survey / routes |
| 24 | Orders KPI Summary Cards | Localized `TỔNG GIÁ TRỊ`, `TỔNG SỐ LƯỢNG`, lots progress | M3 | Survey / routes |
| 25 | Orders Sub-filter Pills | Localized `all`, `overdue`, `due_soon`, `open`, `done` | M3 | Survey / routes |
| 26 | Partner Confidentiality & Pricing | Masked vendor name (`formatVendorName`) and masked pricing (`money`) | M1, M3 | Survey / spec |
| 27 | Google Sheets Inbound Sync | Localized mode toggles (replace/merge), preview stats, apply/revert | M3 | Survey / routes |
| 28 | Google Apps Script Webhook Sync | Localized 2-way sync logs, manual triggers, connection test | M3 | Survey / routes |
| 29 | Comprehensive i18n Test Suite | `src/test/i18n-standardization.test.ts` (key parity, no empty values, invariants) | Test Track | Survey / spec |
| 30 | Full Regressions & Design Compliance | 100% pass on `npm test` (all 12+ test files, 0 failures) | M4 | Survey / spec |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| **T-E2E** | **E2E Testing Track** | Design test infra (`TEST_INFRA.md`), author comprehensive test suite `src/test/i18n-standardization.test.ts`, publish `TEST_READY.md`. | none | DONE |
| **M1** | **i18n Dictionaries & Invariants Standardization** | Expand 21 JSON files in `src/i18n/locales/{vi,en,ja}/` to 590 leaf keys (1,770 keys total) with 100% parity, lock domain invariants (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `QT`, `HRC`, IDs), formatters. | none | DONE |
| **M2** | **Shell, Header, Login & Shared Components** | Localize `dynamo-shell.tsx`, `login.tsx` (with Micro-Pill switcher), `shopfloor-telemetry.tsx`, `command-palette.tsx`, `job-ticket.tsx`, `lot-update-dialog.tsx`, `webhook-config.tsx`, `__root.tsx`. Retain literal fallbacks. | M1 | DONE |
| **M3** | **Core Routes & Shift Handover A4** | Localize `tracking.tsx`, `dashboard.tsx` (including A4 handover report), `orders.tsx`, `sync.tsx`. Retain literal fallbacks for direct `fs.readFileSync` tests. | M1, M2 | DONE |
| **M4** | **Full Verification & Adversarial Hardening** | Pass 100% test suite (`npm test`), adversarial testing by Challenger, Forensic Audit (CLEAN verdict). | T-E2E, M3 | DONE |


---

## Interface Contracts

### 1. `useTranslation` Hook Contract
```typescript
interface I18nContextValue {
  locale: Locale; // 'vi' | 'en' | 'ja'
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}
```

### 2. Literal Fallback Preservation Contract (Test Invariant Guard)
To preserve existing test compatibility (`src/test/ui-ux-standardization.test.ts`, `src/test/i18n-and-header.test.ts`, `src/test/dashboard-enhancements.test.ts`, `src/test/orders-optimization.test.ts`), all localized JSX nodes MUST use literal fallbacks:
```tsx
// Route subheaders:
{t('nav.route1Title') || '[1] LUÂN CHUYỂN'}
{t('nav.route2Title') || '[2] TỔNG QUAN LUÂN CHUYỂN'}
{t('nav.route3Title') || '[3] ĐƠN ĐẶT HÀNG'}
{t('nav.route4Title') || '[4] ĐỒNG BỘ'}

// Critical action buttons & labels:
{t('common.cancel') || 'Hủy bỏ'}
{t('common.refresh') || 'Làm mới'}
{t('dashboard.kpis.kpi5ReadOnly') || 'CHỈ ĐỌC / NỘI BỘ'}
{t('orders.kpiTotalValue') || 'TỔNG GIÁ TRỊ'}
{t('orders.kpiTotalQty') || 'TỔNG SỐ LƯỢNG'}
{t('orders.masterListTitle') || 'Danh sách đơn'}
{t('orders.progressPrefix') || 'Tiến độ:'}
{t('orders.progressSuffix') || 'lô hoàn tất'}
```

### 3. Domain Invariants Contract
The following values MUST NEVER be translated or transformed:
- Status codes: `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`
- Metallurgy & Grades: `QT`, `SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`, `HRC`, `PIN`, `INSERT`, `MOLD`
- Identifiers: `ID_Key`, `So_DatHang`, `ma_hang`, `ULID`
- Masked Vendor Name: `formatVendorName` returns `VI: 'Đã Ẩn'`, `EN: 'Masked'`, `JA: '非公開'`
- UI Corner: `rounded-xs` (2px) everywhere; no consumer pill buttons.

---

## Code Layout
- `src/i18n/`
  - `config.ts` (locale configs, fallback chains)
  - `types.ts` (namespaces: common, nav, tracking, dashboard, orders, sync, telemetry)
  - `index.tsx` (React Context, t() resolver, cookie/localStorage sync)
  - `formatters.ts` (formatDate, formatShift, formatNumber)
  - `locales/`
    - `vi/` (7 JSON files)
    - `en/` (7 JSON files)
    - `ja/` (7 JSON files)
- `src/components/`
  - `dynamo-shell.tsx` (app shell, header, nav, language switcher)
  - `shopfloor-telemetry.tsx` (telemetry ribbon, live metrics)
  - `command-palette.tsx` (spotlight search)
  - `job-ticket.tsx` (A4 work order & pallet tag print)
  - `lot-update-dialog.tsx` (lot status modal)
  - `webhook-config.tsx` (Google Apps Script webhook config)
- `src/routes/`
  - `__root.tsx` (error boundary & 404 page)
  - `index.tsx` (redirect to /tracking)
  - `login.tsx` (ULID authentication & kiosk)
  - `tracking.tsx` (tracking grid, focus filters, batch bar)
  - `dashboard.tsx` (KPIs, pipeline, bottleneck, A4 handover report)
  - `orders.tsx` (master-detail orders, sub-filters)
  - `sync.tsx` (Google Sheets inbound & outbound webhook)
- `src/test/`
  - `i18n-standardization.test.ts` (NEW: comprehensive key parity, invariants, formatters)
  - `i18n-and-header.test.ts` (existing)
  - `design-system-compliance.test.ts` (existing)
  - `app-routing.test.tsx` (existing)
  - `ui-ux-standardization.test.ts` (existing)
  - `dashboard-enhancements.test.ts` (existing)
  - `orders-optimization.test.ts` (existing)
