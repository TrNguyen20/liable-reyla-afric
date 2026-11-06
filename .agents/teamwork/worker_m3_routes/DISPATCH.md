## 2026-11-06T02:25:14Z
You are teamwork_worker for Milestone 3: Core Route Pages (/tracking, /dashboard, /orders, /sync & A4 Handover Report) in the Trilingual [VI] [EN] [JA] project.
Your working directory: .agents/teamwork/worker_m3_routes/

Context & Prerequisite Documents:
1. MANDATORY: Read `.agents/teamwork/ORIGINAL_REQUEST.md`, `DESIGN-SYSTEM.md`, `.agents/teamwork/orchestrator_1/PROJECT.md`, `TEST_READY.md`, and survey reports at `.agents/teamwork/explorer_routes/survey.md`.
2. Write ownership: You exclusively own:
   - `src/routes/tracking.tsx`
   - `src/routes/dashboard.tsx`
   - `src/routes/orders.tsx`
   - `src/routes/sync.tsx`
   Do NOT modify components owned by Worker M2 (`dynamo-shell.tsx`, `login.tsx`, `job-ticket.tsx`, etc.), dictionary files, or test files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Key Tasks & Implementation Rules:
1. Wire `useTranslation` into all 4 core routes using the dictionaries already populated in `src/i18n/locales/{vi,en,ja}/*.json`:
   - `tracking.tsx`:
     - Wire `useTranslation`. Localize table column headers (15 columns), focus filter buttons (`overdue`, `due_soon`, `open`, `stocked`, `est_due`, `sync_failed`, `no_qc`, `qc_fail`), floating batch action bar, row density switcher, continuous date sort cycle tooltips, detail drawers, search placeholder, pagination.
     - CRITICAL: Preserve `{t('nav.route1Title') || '[1] LUÂN CHUYỂN'}` in JSX for `src/test/ui-ux-standardization.test.ts`.
   - `dashboard.tsx`:
     - Wire `useTranslation`. Localize 5 KPI cards (`[KPI-01]`..`[KPI-05]`), 4-stage pipeline, bottleneck breakdown tables (vendor & workshop), and `ShiftHandoverModal` (A4 Shift Handover Report SOP-MES-08).
     - Add an action button on Dashboard toolbar (e.g. icon Printer / FileText "Biên bản ca A4") to open `ShiftHandoverModal` (`setHandoverOpen(true)`).
     - CRITICAL: Preserve literal fallbacks for `src/test/ui-ux-standardization.test.ts` and `src/test/dashboard-enhancements.test.ts`:
       - `{t('nav.route2Title') || '[2] TỔNG QUAN LUÂN CHUYỂN'}`
       - `{t('common.refresh') || 'Làm mới'}`
       - `'Hôm nay (Today)'` and `'7 ngày qua (7D)'`
       - `'[KPI-05]'`, `'CHỈ ĐỌC / NỘI BỘ'`, and `'readOnly'`
   - `orders.tsx`:
     - Wire `useTranslation`. Localize master-detail split grid, PO list headers, search, counter, material filter tag, sub-filter pills (`all`, `overdue`, `due_soon`, `open`, `done`), order parts columns, batch actions, pricing masking.
     - CRITICAL: Preserve literal fallbacks for `src/test/ui-ux-standardization.test.ts` and `src/test/orders-optimization.test.ts`:
       - `{t('nav.route3Title') || '[3] ĐƠN ĐẶT HÀNG'}`
       - `{t('common.refresh') || 'Làm mới'}`
       - `{t('orders.kpis.totalValue') || 'TỔNG GIÁ TRỊ'}`
       - `{t('orders.kpis.totalQty') || 'TỔNG SỐ LƯỢNG'}`
       - `{t('orders.actions.printAll') || 'In phiếu cả đơn'}`
       - `{t('orders.masterListTitle') || 'Danh sách đơn'}`
       - `{t('orders.progressPrefix') || 'Tiến độ:'}`
       - `{t('orders.progressSuffix') || 'lô hoàn tất'}`
   - `sync.tsx`:
     - Wire `useTranslation`. Localize Google Sheets inbound replace/merge controls, auto-refresh countdown, preview stats cards (rows, valid, errors, new, updated), preview table, Google Apps Script webhook outbound URL input, test connection, 2-way sync audit logs.
     - CRITICAL: Preserve `{t('nav.route4Title') || '[4] ĐỒNG BỘ'}` for `src/test/ui-ux-standardization.test.ts` and `src/test/i18n-and-header.test.ts`.
2. STRICT DOMAIN INVARIANTS:
   - Status codes: `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`.
   - Metallurgy: `QT`, `HRC`, steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), workshops (`PIN`, `INSERT`, `MOLD`).
   - Identifiers: `ID_Key`, `So_DatHang`, `ma_hang`, `ULID`, `SOP-MES-08`.
   - Confidentiality masking: unprivileged roles must show masked vendor names and masked prices (`*** ₫`).
   - UI layout: 2px corners (`rounded-xs`), `font-mono tabular-nums`.
3. Run verification:
   - `npx vitest run src/test/ui-ux-standardization.test.ts`
   - `npx vitest run src/test/dashboard-enhancements.test.ts`
   - `npx vitest run src/test/orders-optimization.test.ts`
   - `npx vitest run src/test/i18n-standardization.test.ts`
   - `npm test`
   All must pass with exit code 0.
4. Write handoff report to `.agents/teamwork/worker_m3_routes/handoff.md` and send message back.
