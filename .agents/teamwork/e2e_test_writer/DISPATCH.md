## 2026-11-06T02:09:00Z
You are teamwork_test_writer for the E2E Testing Track of the DYNAMO MES Trilingual Standardization [VI] [EN] [JA] project.
Your working directory: .agents/teamwork/e2e_test_writer/

Context and Requirements:
1. MANDATORY: Read `.agents/teamwork/ORIGINAL_REQUEST.md`, `DESIGN-SYSTEM.md`, `.agents/teamwork/orchestrator_1/PROJECT.md`, and survey reports at `.agents/teamwork/spec_miner_survey/survey.md`.
2. Write ownership: You exclusively own `TEST_INFRA.md` (at project root) and `src/test/i18n-standardization.test.ts`. Do NOT modify any other files.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Create `TEST_INFRA.md` at project root following the 4-tier methodology (Tier 1: Feature Coverage, Tier 2: Boundary & Corner, Tier 3: Cross-Feature Interactions, Tier 4: Real-World Scenarios).
2. Author comprehensive Vitest test suite in `src/test/i18n-standardization.test.ts`:
   - Tier 1: Recursive key parity audit: for all 7 namespaces (`common`, `nav`, `tracking`, `dashboard`, `orders`, `sync`, `telemetry`), assert that `en` and `ja` have 100% exact same key structure as `vi`. Zero missing keys in EN, zero missing keys in JA, zero extraneous keys.
   - Tier 2: No empty strings: assert that no key in any of the 21 JSON files has an empty (`""`), null, undefined, or untrimmed whitespace string.
   - Tier 3: Domain Invariants Enforcement:
     - Status codes: `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING` must be preserved verbatim in all 3 language dictionaries.
     - Metallurgy & Engineering codes: `QT`, `HRC`, steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), and workshops (`PIN`, `INSERT`, `MOLD`) must be preserved verbatim.
     - System Identifiers: `ID_Key`, `So_DatHang`, `ma_hang`, `ULID` preserved.
     - UI token compliance: `rounded-xs` (2px corners) and `font-mono tabular-nums`.
   - Tier 4: Cultural Formatters & Security:
     - `formatDate`: verify Japanese format (`2026年11月05日` or `YYYY/MM/DD`), English format (`MM/DD/YYYY`), Vietnamese format (`DD/MM/YYYY`).
     - `formatShift`: verify Japanese (`1直`, `2直`, `3直`), English (`Shift 1`, `Shift 2`, `Shift 3`), Vietnamese (`Ca 1`, `Ca 2`, `Ca 3`).
     - `formatVendorName`: verify privacy masking for `viewer`/`leader` roles (`'Đã Ẩn'`, `'Masked'`, `'非公開'`).
3. Run tests via `npx vitest run src/test/i18n-standardization.test.ts` to document baseline expectations. (Tests checking expanded keys may initially fail until Worker M1 completes, which is expected for TDD/test-first approach).
4. Create `TEST_READY.md` at project root documenting how to run the test suite, coverage summary across the 4 tiers, and feature checklist.
5. Write your report to `.agents/teamwork/e2e_test_writer/handoff.md` and send a message back.
