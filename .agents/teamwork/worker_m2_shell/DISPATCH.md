## 2026-11-06T02:24:47Z
You are teamwork_worker for Milestone 2: Shell, Navigation Header, Login & Shared Components in the Trilingual [VI] [EN] [JA] project.
Your working directory: .agents/teamwork/worker_m2_shell/

Context & Prerequisite Documents:
1. MANDATORY: Read `.agents/teamwork/ORIGINAL_REQUEST.md`, `DESIGN-SYSTEM.md`, `.agents/teamwork/orchestrator_1/PROJECT.md`, `TEST_READY.md`, and survey reports at `.agents/teamwork/explorer_shell/survey.md`.
2. Write ownership: You exclusively own:
   - `src/components/dynamo-shell.tsx`
   - `src/routes/login.tsx`
   - `src/components/shopfloor-telemetry.tsx`
   - `src/components/command-palette.tsx`
   - `src/components/job-ticket.tsx`
   - `src/components/lot-update-dialog.tsx`
   - `src/components/webhook-config.tsx`
   - `src/routes/__root.tsx`
   Do NOT modify route files (`tracking.tsx`, `dashboard.tsx`, `orders.tsx`, `sync.tsx`) or test files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Key Tasks & Implementation Rules:
1. Wire `useTranslation` into all assigned files:
   - `dynamo-shell.tsx`: Wire `useTranslation`, localize offline banner (`offlineAlert`), clock, tooltips, footer, toasts, role badges.
     CRITICAL: Preserve `label: 'LUÂN CHUYỂN'` and `label: 'ĐỒNG BỘ'` inside the `nav` items array for backward compatibility with `src/test/i18n-and-header.test.ts`. Use `{t(n.labelKey) || n.label}` for rendering.
   - `login.tsx`: Import `useTranslation` from `@/i18n`. Localize Hero panel, position options, kiosk keypad labels, lockout alerts, submit button.
     Add the Trilingual Micro-Pill Switcher `[VI] [EN] [JA]` (consistent with `dynamo-shell.tsx`) to the header/top-right of `/login`.
   - `shopfloor-telemetry.tsx`: Wire `useTranslation`. Localize telemetry ribbon labels, workshop loads, open lots, sync states (`telemetry.syncStates.*`), and use `formatShift(shift, locale)` from `@/i18n`.
   - `command-palette.tsx`: Wire `useTranslation`. Localize search placeholder, group headers, actions, empty search message.
   - `job-ticket.tsx`: Wire `useTranslation`. Localize A4 work ticket sections (I to IV, 4 signature blocks: `1. ĐIỀU VẬN DYNAMO`, `2. BẢO VỆ CỔNG`, `3. ĐƠN VỊ GIA CÔNG`, `4. QC NHẬP KHO`), pallet tags, batch manifest, retaining page bounds for 1-page ISO 216 printing.
   - `lot-update-dialog.tsx`: Wire `useTranslation`. Localize form labels, validation errors, confirm buttons.
     CRITICAL: Retain literal `'Hủy bỏ'` fallback (`{t('common.cancel') || 'Hủy bỏ'}`) for `src/test/ui-ux-standardization.test.ts`.
   - `webhook-config.tsx`: Wire `useTranslation`. Localize URL inputs, hints, test connection, toasts.
   - `__root.tsx`: Wire `useTranslation` for 404 page and Error boundary. Fix any `rounded-md` or `rounded-lg` classes to `rounded-xs` (2px) to strictly satisfy `design-system-compliance.test.ts`.
2. STRICT DOMAIN INVARIANTS:
   - Invariant status codes: `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`.
   - Metallurgy & Engineering codes: `QT`, `HRC`, steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), and workshops (`PIN`, `INSERT`, `MOLD`), `coupon`.
   - Identifiers: `ID_Key`, `So_DatHang`, `ma_hang`, `ULID`, `SOP-MES-08`.
3. Run verification:
   - `npx vitest run src/test/design-system-compliance.test.ts`
   - `npx vitest run src/test/i18n-and-header.test.ts`
   - `npx vitest run src/test/i18n-standardization.test.ts`
   - `npm test`
   All must pass with exit code 0.
4. Write handoff report to `.agents/teamwork/worker_m2_shell/handoff.md` and send message back.
