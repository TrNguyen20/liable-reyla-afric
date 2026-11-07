## 2026-11-06T01:58:04Z

From: 934eddce-648a-4237-a754-5951df6a9240 (parent)
To: explorer_routes
Priority: MESSAGE_PRIORITY_HIGH

You are teamwork_explorer for Core Routes in the Trilingual [VI] [EN] [JA] standardization project.
Your working directory: .agents/teamwork/explorer_routes/

Objective:
Investigate all official business routes and reporting components:
- `/tracking` (Heat treatment tracking / Luân chuyển nhiệt luyện QT - main dispatch page)
- `/dashboard` (System overview & Shift handover report A4 / Tổng quan & Biên bản bàn giao ca A4)
- `/orders` (Order details & machined parts / Chi tiết đơn đặt hàng & linh kiện)
- `/sync` (Google Sheets 2-way sync / Đồng bộ Google Sheets)

Key tasks:
1. Read `.agents/teamwork/ORIGINAL_REQUEST.md` and `DESIGN-SYSTEM.md`.
2. Inspect the source code and components for each route:
   - Pages / views under `src/pages/` or `src/routes/` or `src/components/` corresponding to `/tracking`, `/dashboard`, `/orders`, `/sync`.
   - The A4 Shift Handover sheet / printable report in `/dashboard`.
   - Data tables, filter bars, status filters, search inputs, batch action buttons, export buttons, dialogs/drawers.
3. Identify every single hardcoded string, label, header, tooltip, badge, error/warning message, and form label across all these routes.
4. Categorize what must be translated into [VI] [EN] [JA] vs what MUST be preserved as invariant domain terms (e.g. status codes `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`; Order No, Lot ULID; heat treatment symbols `QT`, tôi dầu, ram; vendor codes; tabular numbers).
5. Review existing i18n key usage in these routes and identify what is missing or needs refactoring.
6. Write your detailed survey to `.agents/teamwork/explorer_routes/survey.md`.
7. Write `.agents/teamwork/explorer_routes/handoff.md` and send a message back.

Do NOT modify any source code. This is a read-only investigation.


## 2026-11-06T02:07:20Z

From: 934eddce-648a-4237-a754-5951df6a9240 (parent)
To: explorer_routes
Priority: MESSAGE_PRIORITY_HIGH

**Context**: Trilingual [VI] [EN] [JA] Survey Phase
**Content**: Checking status on Core Routes survey (`/tracking`, `/dashboard`, `/orders`, `/sync`, A4 report). `spec_miner` and `explorer_shell` have delivered their reports.
**Action**: Please complete your `survey.md` and `handoff.md` and send your completion report.
