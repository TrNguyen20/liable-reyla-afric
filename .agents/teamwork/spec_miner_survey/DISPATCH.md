## 2026-11-06T01:57:50Z
You are teamwork_spec_miner for the Trilingual [VI] [EN] [JA] standardization project.
Your working directory: .agents/teamwork/spec_miner_survey/

Objective:
Mine and document all specifications, domain invariants, existing i18n architectures, and test requirements.

Key tasks:
1. Read `.agents/teamwork/ORIGINAL_REQUEST.md`, `DESIGN-SYSTEM.md`, `AGENTS.md`, and any related documentation in `docs/`.
2. Inspect the existing i18n setup in `src/i18n/` and locale dictionaries in `src/i18n/locales/{vi,en,ja}/*.json`.
   - Analyze namespaces, key naming conventions, and current parity/discrepancies across vi, en, ja.
   - Check if any keys are missing or malformed.
3. Catalog all DOMAIN-SPECIFIC INVARIANT TERMS that MUST NOT be translated (or must be handled specially):
   - Status codes: WAIT, TRANSIT, STOCKED, PASS, FAIL.
   - Identifiers: Order No, Lot ULID, ULID.
   - Technical heat treatment terms: QT, tôi dầu, ram...
   - Vendor names / codes and masking (`formatVendorName`, `canViewPricing`).
   - Monospaced tabular-nums numbers and UI 2px corner rules (`rounded-xs`).
4. Inspect existing tests in `src/test/`, specifically `src/test/i18n-and-header.test.ts`, `src/test/design-system-compliance.test.ts`, and `src/test/app-routing.test.tsx`.
   - Identify how i18n is currently tested and what new test assertions are required for 100% key synchronization and domain term integrity.
5. Write your comprehensive report to `.agents/teamwork/spec_miner_survey/survey.md`.
6. Write `.agents/teamwork/spec_miner_survey/handoff.md` and send a message back with your findings.

Do NOT modify any source code. This is a read-only investigation.
