## 2026-11-06T02:09:12Z
You are teamwork_worker for Milestone 1: i18n Dictionaries & Invariants Standardization in the Trilingual [VI] [EN] [JA] project.
Your working directory: .agents/teamwork/worker_m1_locales/

Context and Requirements:
1. MANDATORY: Read `.agents/teamwork/ORIGINAL_REQUEST.md`, `DESIGN-SYSTEM.md`, `.agents/teamwork/orchestrator_1/PROJECT.md`, and survey reports at `.agents/teamwork/spec_miner_survey/survey.md` and `.agents/teamwork/explorer_shell/survey.md`.
2. Write ownership: You exclusively own `src/i18n/locales/{vi,en,ja}/*.json` (21 JSON files across 7 namespaces: `common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`) and `src/i18n/formatters.ts`. Do NOT modify component files (`.tsx`) or other test files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Key Tasks:
1. Expand and standardize all 21 JSON dictionary files across the 7 namespaces (`common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`) for `vi`, `en`, `ja`:
   - Expand to ~380 total keys covering all UI components, buttons, filters, tooltips, dialogs, toasts, error messages, print layouts, and telemetry items discovered in the survey reports.
   - Enforce 100% exact key parity: every key present in `vi` MUST exist in `en` and `ja`. No missing keys, no extra keys, no empty strings.
   - Professional translations:
     - EN: High-standard industrial manufacturing / MES terminology.
     - JA: Authentic Japanese manufacturing (monozukuri / heat treatment) terminology (e.g., 焼入れ・焼戻し, 外注加工, 入庫, 引渡報告書, 不具合, etc.).
2. STRICT DOMAIN INVARIANTS:
   - Status codes: `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING` must be preserved in all 3 languages.
   - Metallurgy & Engineering codes: `QT`, `HRC`, steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), and workshops (`PIN`, `INSERT`, `MOLD`) must remain intact.
   - Identifiers: `ID_Key`, `So_DatHang`, `ma_hang`, `ULID` must remain intact.
   - Partner masking: localized masked string: `vi`: 'Đã Ẩn', `en`: 'Masked', `ja`: '非公開'.
3. Cultural formatters (`src/i18n/formatters.ts`):
   - Ensure `formatDate`, `formatShift`, `formatNumber`, and `formatTime` support Japanese (`2026年11月05日` / `1直`, `2直`, `3直`), English (`11/05/2026` / `Shift 1`..), and Vietnamese (`05/11/2026` / `Ca 1`..).
4. Run verification:
   - Run audit script or test to confirm 100% parity across all 21 files (`DiffEN=0`, `DiffJA=0`).
   - Run `npx vitest run src/test/i18n-and-header.test.ts` to ensure zero regression on existing i18n tests.
5. Write your handoff report to `.agents/teamwork/worker_m1_locales/handoff.md` with:
   - Observation (commands run, pass/fail counts, key counts per namespace)
   - Logic Chain
   - Caveats
   - Conclusion
   - Verification Method
6. Send completion message back to orchestrator.
