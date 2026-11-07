# BRIEFING — 2026-11-06T02:10:00Z

## Mission
Investigate and survey UI components related to the application shell, navigation header, language switcher, authentication (/login), modals/dialogs, notifications/toasts, and common shared UI elements for Trilingual [VI] [EN] [JA] standardization.

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, survey, synthesis
- Working directory: d:\NTT-2025\KAIZEN\m.Clone-github (internet)\liable-reyla-afric\.agents\teamwork\explorer_shell
- Original parent: 934eddce-648a-4237-a754-5951df6a9240
- Milestone: Trilingual Standardization - Shell, Navigation, Login & Common Components

## 🔒 Key Constraints
- Read-only investigation — do NOT implement / do NOT modify source code
- Strictly comply with DESIGN-SYSTEM.md (2px rounded-xs, font-mono tabular-nums, no pill buttons except LED dots)
- Preserve domain-specific concepts / status codes (WAIT, TRANSIT, STOCKED, PASS, FAIL, Order No, Lot ULID, QT terminology)
- Focus on Shell, Header, Language Switcher, Login, Common Dialogs/Modals/Toasts

## Current Parent
- Conversation ULID: 934eddce-648a-4237-a754-5951df6a9240
- Updated: 2026-11-06T02:10:00Z

## Investigation State
- **Explored paths**:
  - `src/i18n/` (config.ts, types.ts, index.tsx, formatters.ts, locales/{vi,en,ja}/*.json)
  - `src/routes/__root.tsx` (Root route, NotFoundComponent, ErrorComponent)
  - `src/components/dynamo-shell.tsx` (Top header, nav rail, LedClock, role switcher, switcher, toasts, footer)
  - `src/routes/login.tsx` (Hero panel, features, plant telemetry, login card, steps, roles, Kiosk numpad, lock countdown)
  - `src/components/shopfloor-telemetry.tsx` (Compact vs expanded ribbon, shift, sync status, KPIs)
  - `src/components/command-palette.tsx` (⌘K search, navigation, workshop filter, system operations)
  - `src/components/job-ticket.tsx` (Single ticket preview, Batch modal, SingleA4TicketContent, Pallet tag, Manifest table, signatures)
  - `src/components/lot-update-dialog.tsx` (Lot progress modal, status transition validation, errors, toasts)
  - `src/components/webhook-config.tsx` (Webhook setup card, status, toasts)
  - UI primitives (`dialog.tsx`, `alert-dialog.tsx`, `sonner.tsx`)
- **Key findings**:
  - Login page (`/login`) is 100% hardcoded Vietnamese with zero i18n hooks and lacks a language switcher.
  - Telemetry bar, Command palette, Job ticket A4, Lot update dialog, and Webhook config are not yet integrated with `useTranslation()`.
  - Invariants (WAIT, TRANSIT, STOCKED, PASS, FAIL, Order No, Lot ULID, QT, HRC, coupon) cataloged and confirmed.
  - Design system compliance: Detected a few `rounded-md`/`rounded-lg` instances in `__root.tsx` and `alert-dialog.tsx` that need cleanup to 2px `rounded-xs`.
  - Full inventory of all hardcoded strings and proposed key structure documented in `survey.md`.
- **Unexplored areas**: None within the assigned shell/navigation/login/common scope.

## Key Decisions Made
- Organized translation keys to maintain 100% backward compatibility with `TC-I18N-01`.
- Formulated proposal to add Trilingual Micro-Pill switcher `[VI] [EN] [JA]` to the `/login` page.
- Comprehensive survey completed and saved in `survey.md`.

## Artifact Index
- DISPATCH.md — Parent dispatch log
- BRIEFING.md — Situational awareness working memory
- progress.md — Liveness heartbeat and step tracking
- survey.md — Comprehensive findings and gap analysis
- handoff.md — 5-component handoff report
