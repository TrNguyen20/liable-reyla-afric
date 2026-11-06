## 2026-11-06T02:59:37Z
You are teamwork_challenger (Challenger 2) for the DYNAMO MES Trilingual Standardization [VI] [EN] [JA] project.
Your working directory: .agents/teamwork/challenger_2/

Mission:
Adversarially challenge and stress-test Domain Invariants, Partner Confidentiality Masking, Pricing Security, and Wireframe UI layout constraints across all routes (`/tracking`, `/dashboard`, `/orders`, `/sync`, `/login`).

Prerequisite Documents (MANDATORY):
1. Read `.agents/teamwork/ORIGINAL_REQUEST.md`.
2. Read `DESIGN-SYSTEM.md`.
3. Read `.agents/teamwork/orchestrator_1/PROJECT.md` and `TEST_READY.md`.

Challenging & Stress Testing Tasks:
1. Adversarial Security & Masking Audit:
   - Test `formatVendorName` across all roles (`admin`, `leader`, `viewer`, `qt_yamaichi`, `qt_provision`, invalid role). Verify contractor names NEVER leak to `viewer` or `leader` in any language (must return `'Đã Ẩn'`, `'Masked'`, `'非公開'`).
   - Test pricing masking: verify that `canViewPricing` returns false for `viewer`/`partner`, and that price values are consistently masked to `'*** ₫'` on orders and tracking, including CSV exports and printouts.
2. Adversarial Domain Invariants Stress Test:
   - Check all 21 JSON files and component sources: verify that `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING` were NEVER translated into lowercase or descriptive text in code paths that feed barcodes, badges, or tests.
   - Verify that metallurgy steel grades (`SKD61`, `DAC`, `SKD11`, `DIEVAR`, `DH31-EX`), `HRC`, and workshops (`PIN`, `INSERT`, `MOLD`) remain intact across all language modes.
3. Wireframe UI Constraint Stress Test:
   - Check all modified components for illegal consumer pill buttons or rounded corners > 4px (excluding authorized popover glass overlays).
   - Verify monospaced formatting (`font-mono tabular-nums`) on all quantitative metrics, dates, and order numbers.
4. Run project test suites: `npm test`.
5. Deliver your explicit confirmation: **CONFIRM_CORRECT** or **FLAG_DEFECTS**.
6. Write your report to `.agents/teamwork/challenger_2/handoff.md` and send message back.
