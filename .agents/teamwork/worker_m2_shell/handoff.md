# Milestone 2 Handoff Report: Shell, Navigation Header, Login & Shared Components

## 1. Observation
- Assigned files under exclusive ownership:
  1. `src/routes/__root.tsx`
  2. `src/components/dynamo-shell.tsx`
  3. `src/routes/login.tsx`
  4. `src/components/shopfloor-telemetry.tsx`
  5. `src/components/command-palette.tsx`
  6. `src/components/lot-update-dialog.tsx`
  7. `src/components/webhook-config.tsx`
  8. `src/components/job-ticket.tsx`
- Baseline test status: All 13 test files passed (80/80 tests).
- Pre-existing backward compatibility contracts identified:
  - `src/test/i18n-and-header.test.ts`: Requires literal `label: 'LUÂN CHUYỂN'` and `label: 'ĐỒNG BỘ'` inside `nav` array items in `dynamo-shell.tsx`.
  - `src/test/ui-ux-standardization.test.ts`: Requires literal `'Hủy bỏ'`, `variant="ghost"`, `<DialogDescription className="sr-only">`, `h-8.5 w-full rounded-xs border border-input bg-background px-2.5 font-mono text-xs`, and alert box classes in `lot-update-dialog.tsx`.
  - `src/test/design-system-compliance.test.ts`: Strict ban on `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, and consumer pills across all UI files; only `rounded-xs` (2px) allowed.
  - Domain Invariants: Un-translated status codes (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`), metallurgy & engineering codes (`QT`, `HRC`, steel grades `SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`, workshops `PIN`, `INSERT`, `MOLD`, `coupon`), and identifiers (`ID_Key`, `So_DatHang`, `ma_hang`, `ULID`, `SOP-MES-08`).
- Post-implementation test results:
  - `npx vitest run src/test/design-system-compliance.test.ts`: 10 passed (10 tests, exit code 0).
  - `npx vitest run src/test/i18n-and-header.test.ts`: 6 passed (6 tests, exit code 0).
  - `npx vitest run src/test/i18n-standardization.test.ts`: 14 passed (14 tests, exit code 0).
  - `npx vitest run src/test/ui-ux-standardization.test.ts`: 10 passed (10 tests, exit code 0).
  - `npm test`: 13 test files passed (80 tests, 0 failures, exit code 0).
  - `npm run build`: Vite client & SSR build succeeded in 5.68s + 991ms.

## 2. Logic Chain
1. *Observation*: `__root.tsx` had `NotFoundComponent` and `ErrorComponent` with `rounded-md` and missing localized translation wrappers.
   *Action*: Enclosed both fallback components in `<I18nProvider>` so that runtime or routing errors maintain access to i18n context, replaced texts with `t('common.notFound.*')` and `t('common.errorBoundary.*')`, and converted corners to `rounded-xs`.
2. *Observation*: `dynamo-shell.tsx` required localization of the offline banner, clock, role impersonator, and toasts while satisfying test `TC-HDR-01`.
   *Action*: Replaced raw strings with `t(...)`. Preserved `label: 'LUÂN CHUYỂN'` and `label: 'ĐỒNG BỘ'` in `nav` item definitions and rendered `{t(n.labelKey) || n.label}`. Converted `BootSkeleton` corners to `rounded-xs`.
3. *Observation*: `login.tsx` lacked the trilingual switcher and had hardcoded Vietnamese texts and `rounded-sm` corners.
   *Action*: Embedded the Segmented Micro-Pill Switcher `[VI] [EN] [JA]` in the header right, localized positions, hero features, kiosk keypad, lockout alerts, and submit states, and updated all corners to `rounded-xs`.
4. *Observation*: `shopfloor-telemetry.tsx` used hardcoded Vietnamese text for sync states, shift names, open lots, and micro-metrics.
   *Action*: Imported `useTranslation`, `formatShift`, and `formatTime`, updated shift calculation to return numeric shifts (1, 2, 3), localized sync states (`telemetry.states.*`), micro-metrics (`telemetry.ribbon.*`), and ensured zero `rounded-md` violations.
5. *Observation*: `command-palette.tsx` contained hardcoded search texts, nav titles, and `rounded-sm` elements.
   *Action*: Imported `useTranslation`, localized search placeholder, empty state, matched items, quick navigation, workshop filters, and system actions, passed `locale` to `formatVendorName`, and replaced `rounded-sm` with `rounded-xs`.
6. *Observation*: `lot-update-dialog.tsx` needed localization while strictly adhering to `TC-UI-06`.
   *Action*: Localized dialog title, description, form labels, and toasts with `t(...)` while preserving literal `'Hủy bỏ'` fallback `{t('common.lotUpdate.btnCancel') || 'Hủy bỏ'}` and exact test classes.
7. *Observation*: `webhook-config.tsx` had hardcoded text and `rounded-sm` classes.
   *Action*: Localized badge, connection status, auto-push notice, descriptions, and toasts via `sync.webhook.*`, and changed all `rounded-sm` to `rounded-xs`.
8. *Observation*: `job-ticket.tsx` is an industrial printing module (PDF A4, pallet tag, print studio canvas, batch manifest).
   *Action*: Localized all sections (company name, doc info, sections I-IV with 4 signature blocks, pallet tag, manifest table headers) using `useTranslation`, `formatDate`, and `formatTime`. Preserved domain invariants (`coupon`, `HRC`, metallurgy codes), and replaced all `rounded-md`/`rounded` classes with `rounded-xs`.

## 3. Caveats
- No caveats. All 8 assigned files were modified and verified without touching any restricted route or test files. All domain invariants and backwards compatibility strings were retained.

## 4. Conclusion
Milestone 2 (Shell, Navigation Header, Login & Shared Components) is 100% complete. All 8 assigned files are fully wired for trilingual operation ([VI], [EN], [JA]), strictly compliant with Graphite Wireframe UI v2.2.0 (minimal 2px corners `rounded-xs`, `font-mono tabular-nums`), and all 13 test suites (80/80 tests) pass with exit code 0. Production build passes cleanly for both client and SSR.

## 5. Verification Method
Independently verify with the following commands:
```powershell
# 1. Design system compliance (2px corners, wireframe rules)
npx vitest run src/test/design-system-compliance.test.ts

# 2. Header and i18n architecture test
npx vitest run src/test/i18n-and-header.test.ts

# 3. Trilingual 4-tier standardization test
npx vitest run src/test/i18n-standardization.test.ts

# 4. UI/UX standardization test
npx vitest run src/test/ui-ux-standardization.test.ts

# 5. Full test suite (all 13 files, 80 tests)
npm test

# 6. Production build check (Client & SSR)
npm run build
```
Invalidation conditions:
- Any test in `npm test` fails.
- Any presence of `rounded-md` or `rounded-lg` in the 8 assigned files.
- Any un-translated or hardcoded Vietnamese text without `t(...)` in the assigned components.
- Breaking backwards compatibility strings (`label: 'LUÂN CHUYỂN'`, `label: 'ĐỒNG BỘ'`, `'Hủy bỏ'`).
