## 2026-11-06T03:10:15Z
You are teamwork_worker (Remediation Specialist) for Iteration 2 of the DYNAMO MES Trilingual Standardization [VI] [EN] [JA] project.
Your working directory: .agents/teamwork/worker_remediation/

Prerequisites & Evidence to Read:
1. Read `.agents/teamwork/ORIGINAL_REQUEST.md` and `DESIGN-SYSTEM.md`.
2. Read `.agents/teamwork/orchestrator_1/PROJECT.md` and `.agents/teamwork/orchestrator_1/GATE_STATUS.md`.
3. Read Reviewer 1 handoff: `.agents/teamwork/reviewer_1/handoff.md`.
4. Read Reviewer 2 handoff: `.agents/teamwork/reviewer_2/handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks to Implement:
1. Fix `src/i18n/index.tsx`:
   - Export `Locale` type: `export type { Locale } from './types';` (or `./config`).
   - Enhance `t()` key resolution in `src/i18n/index.tsx`:
     When a key has a prefix (e.g., `ticket.fields.partNo`, `auth.hero.badge`, `pallet.title`, `lotUpdate.title`) that is not a registered top-level namespace, also look inside `dict.common[ns]` and `dict.common[parts.join('.')]`.
2. Fix `src/lib/dynamo-auth.ts`:
   - Update `formatVendorName(vendor?: string, role?: string, locale?: string)`:
     When role cannot view vendor name:
     - `if (locale === 'ja') return '非公開';`
     - `if (locale === 'en') return 'Masked';`
     - `return 'Đã Ẩn';`
3. Expand and synchronize all 21 JSON dictionary files in `src/i18n/locales/{vi,en,ja}/*.json`:
   - Add all 208 missing keys identified by Reviewer 1 (in `tracking.json`: `toolbars.exportCurrentPage`, `toolbars.exportFiltered`, `toolbars.exportAll`, `toolbars.workshopSelect`, `sort.minToMax`, `sort.lightToHeavy`, etc.; in `orders.json`: `kpis.totalValue`, `kpis.totalQty`, `actions.printAll`; in `dashboard.json`: `bottlenecks.subtitle`, `handover.top6Overdue`, `handover.signQc`, `handover.a4Notice`; in `common.json`: `loading.permissions`, `loading.failedTitle`, `loading.syncing`, `source`, `cache`, `lastSynced`; etc.).
   - Ensure `QT` is preserved in all Japanese translations (never drop `QT`).
   - Guarantee 100% recursive parity across `vi`, `en`, and `ja` (`DiffEN=0`, `DiffJA=0`) with zero empty strings.
4. Fix UI in `src/routes/login.tsx` and `src/routes/tracking.tsx`:
   - `src/routes/login.tsx`: line 394, change `rounded-full` step indicator to `rounded-xs`.
   - `src/routes/tracking.tsx`: lines 1197-1212, localize CSV export column headers using `t('tracking.columns.*')`.
5. Update tests:
   - In `src/test/i18n-standardization.test.ts`:
     - Update `TC-I18N-T4-04` with strict assertions: `formatVendorName(v, 'viewer', 'en') === 'Masked'`, `formatVendorName(v, 'viewer', 'ja') === '非公開'`, `formatVendorName(v, 'viewer', 'vi') === 'Đã Ẩn'`.
     - Add check verifying that all JSX `t()` references in `.tsx` files resolve to real strings without returning raw dotted keys.
   - Clean up or ensure all tests in `src/test/` pass cleanly.
6. Verify:
   - Run `npx tsc --noEmit` (ensure 0 TypeScript errors).
   - Run `npm test` (all tests pass 100%).
   - Run `npm run build` (client and SSR build pass).
7. Write handoff report to `.agents/teamwork/worker_remediation/handoff.md` and send message back.
