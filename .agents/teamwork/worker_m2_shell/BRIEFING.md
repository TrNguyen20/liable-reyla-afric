# BRIEFING — 2026-11-06T02:49:00Z

## Mission
Implement Milestone 2: Shell, Navigation Header, Login & Shared Components in Trilingual [VI] [EN] [JA] MES platform, wiring `useTranslation`, enforcing Design System compliance (2px corners, monospace tabular-nums), and preserving domain invariants and backwards-compatibility requirements.

## 🔒 My Identity
- Archetype: teamwork_worker
- Roles: implementer, qa
- Working directory: d:\NTT-2025\KAIZEN\m.Clone-github (internet)\liable-reyla-afric\.agents\teamwork\worker_m2_shell
- Original parent: 934eddce-648a-4237-a754-5951df6a9240
- Milestone: Milestone 2 (Shell, Navigation Header, Login & Shared Components)

## 🔒 Key Constraints
- Exclusively own:
  - `src/components/dynamo-shell.tsx`
  - `src/routes/login.tsx`
  - `src/components/shopfloor-telemetry.tsx`
  - `src/components/command-palette.tsx`
  - `src/components/job-ticket.tsx`
  - `src/components/lot-update-dialog.tsx`
  - `src/components/webhook-config.tsx`
  - `src/routes/__root.tsx`
- Do NOT modify route files (`tracking.tsx`, `dashboard.tsx`, `orders.tsx`, `sync.tsx`) or test files.
- Preserve `label: 'LUÂN CHUYỂN'` and `label: 'ĐỒNG BỘ'` in nav items in `dynamo-shell.tsx` with `{t(n.labelKey) || n.label}`.
- Retain literal `'Hủy bỏ'` fallback `{t('common.cancel') || 'Hủy bỏ'}` in `lot-update-dialog.tsx`.
- Add trilingual micro-pill switcher `[VI] [EN] [JA]` to `/login` header/top-right.
- Strict Domain Invariants: `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`; `QT`, `HRC`, steel grades, workshop codes, `ID_Key`, `So_DatHang`, `ma_hang`, `ULID`, `SOP-MES-08`.
- Design system compliance: minimal 2px corners (`rounded-xs` / `rounded-[2px]`), monospaced data grid `font-mono tabular-nums`, no `rounded-md` / `rounded-lg`.
- Run tests and achieve 100% pass on design-system, i18n, and full test suite.

## Current Parent
- Conversation ULID: 934eddce-648a-4237-a754-5951df6a9240
- Updated: 2026-11-06T02:43:00Z

## Task Summary
- **What to build**: Trilingual UI wiring for Shell, Login, Telemetry, Command Palette, Job Ticket, Lot Update Dialog, Webhook Config, Root Error/404.
- **Success criteria**: All 8 files wired with genuine i18n translations, design-system compliant (2px corners), all tests pass (`npm test`).
- **Interface contracts**: `src/i18n/index.tsx`, `DESIGN-SYSTEM.md`, `TEST_READY.md`.
- **Code layout**: `PROJECT.md`.

## Key Decisions Made
- `__root.tsx`: Wrapped `NotFoundComponent` and `ErrorComponent` with `<I18nProvider>` for complete context isolation and resilience against root-level crashes.
- `dynamo-shell.tsx`: Preserved exact keys `label: 'LUÂN CHUYỂN'` and `label: 'ĐỒNG BỘ'` in `nav` items, rendered via `{t(n.labelKey) || n.label}` to maintain backwards compatibility with `i18n-and-header.test.ts`.
- `login.tsx`: Added Segmented Micro-Pill Switcher `[VI] [EN] [JA]` in the header/top-right, dynamic localization for positions, features, and keypad, replaced `rounded-sm` with `rounded-xs`.
- `lot-update-dialog.tsx`: Retained literal `'Hủy bỏ'` fallback `{t('common.lotUpdate.btnCancel') || 'Hủy bỏ'}` for `ui-ux-standardization.test.ts`.
- `job-ticket.tsx`: Converted all components to use `t(...)` while preserving domain invariants (`coupon`, `HRC`, metallurgy codes) and replacing all `rounded-md`/`rounded` with `rounded-xs`.

## Artifact Index
- `.agents/teamwork/worker_m2_shell/DISPATCH.md` — Initial dispatch message
- `.agents/teamwork/worker_m2_shell/progress.md` — Liveness and step tracking
- `.agents/teamwork/worker_m2_shell/handoff.md` — Final handoff report

## Change Tracker
- **Files modified**:
  1. `src/routes/__root.tsx`: Localized error/404 pages with I18nProvider, replaced rounded classes with `rounded-xs`.
  2. `src/components/dynamo-shell.tsx`: Localized offline banner, clock, tooltips, footer, toasts, role badges, preserved nav label compat.
  3. `src/routes/login.tsx`: Localized hero, wizard steps, kiosk keypad, lockout alerts, added `[VI] [EN] [JA]` switcher.
  4. `src/components/shopfloor-telemetry.tsx`: Localized sync states, shift labels via formatShift, open lots, micro-metrics.
  5. `src/components/command-palette.tsx`: Localized search, nav items, workshop filters, formatVendorName locale, fixed corners.
  6. `src/components/lot-update-dialog.tsx`: Localized labels, options, toasts, preserved literal 'Hủy bỏ' fallback.
  7. `src/components/webhook-config.tsx`: Localized badge, status, autoPush, descriptions, fixed corners to `rounded-xs`.
  8. `src/components/job-ticket.tsx`: Localized PDF A4, pallet tag, studio toolbars, batch manifest table, fixed corners to `rounded-xs`.
- **Build status**: PASS (Vite client & SSR build succeeded)
- **Pending issues**: None

## Quality Status
- **Build/test result**: PASS (13/13 test files, 80/80 tests passing)
- **Lint status**: ESLint completed with 0 errors
- **Tests added/modified**: 0 (test files read-only)

## Loaded Skills
None
