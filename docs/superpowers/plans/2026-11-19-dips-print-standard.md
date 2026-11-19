# Dynamo Industrial Print Standard (DIPS v1.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish Dynamo Industrial Print Standard (DIPS v1.0) and resolve all layout, pagination, scaling, and orientation print defects for single tickets, batch tickets (30+ lots), and multi-lot manifests on A4 paper.

**Architecture:** 
1. Upgrade `printTicketElement` in `src/components/job-ticket.tsx` with an orientation-aware isolated iframe engine that strips pagination-breaking ancestor container constraints (`overflow-y-auto`, `max-height`, `transform`, `display: flex`), injects strict `@page { size: A4 portrait|landscape; margin: 8mm 10mm; }`, and enforces exact ISO 216 page boundaries.
2. Update `SingleA4TicketContent`, `JobTicketButton`, and `BatchJobTicketModal` to enforce strict A4 Portrait for individual tickets and A4 Landscape for the multi-lot manifest.
3. Enhance the web preview canvas in `BatchJobTicketModal` to display realistic discrete A4 paper sheet cards (`aspect-[210/297]` for portrait, `aspect-[297/210]` for landscape) with page badges (`Trang X/N`), preventing user confusion between screen scrolling and physical sheets.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, ISO 216 CSS Paged Media Specifications (`@page`), Vitest.

**Spec:** Dynamo MES UI/UX Single Source of Truth (`DESIGN-SYSTEM.md`), DIPS v1.0 Specification.

## Global Constraints

- Static page elements must strictly follow Graphite Wireframe 2px corners (`rounded-xs` / `rounded-sm`).
- Floating window dialogs (JobTicketButton Modal, BatchJobTicketModal) strictly use modern industrial floating window standard (`rounded-xl border border-border shadow-2xl`).
- Quantitative, lot ID, order, barcode, and timestamp fields MUST use `font-mono tabular-nums`.
- Clean print output: pure vector SVG barcode, `-webkit-print-color-adjust: exact`, zero empty trailing blank pages (`last-child { break-after: auto }`).
- Never introduce external network dependencies or break Lovable git history.

## Review Focus

1. **Chromium Print Engine Pagination Freeze**: Containers with `overflow` or `display: flex` cause Chrome to collapse 30 pages into "1 sheet of paper". Verify iframe DOM completely unsets overflow and flex on root ancestors.
2. **Multi-lot Manifest Orientation**: 12-column manifest table squeezed into Portrait. Verify `@page { size: A4 landscape; }` is enforced when printing manifest.
3. **Scale Mismatch & Multi-ticket Cramming**: Custom scale in printer dialog (e.g. 60%) cramming 3 tickets onto 1 sheet. Verify `.printable-job-ticket` enforces fixed ISO 216 height (`calc(297mm - 16mm)`) and `page-break-after: always`.
4. **Trailing Blank Page Glitch**: Multiple copies or 30-page batches printing an extra blank page 31. Verify last page suppresses `break-after: page`.
5. **Modal Screen Preview vs Physical Paper**: Infinite vertical scroll causing tickets to look cut off on screen. Verify modal preview renders discrete A4 paper frames.

---

### Task 1: Create DIPS v1.0 Test Suite (TDD)

**Files:**
- Create: `src/test/dips-print-standard.test.ts`
- Test: `src/test/dips-print-standard.test.ts`

- [x] **Step 1.1: Write failing tests for DIPS print specifications**
Write test suite `src/test/dips-print-standard.test.ts` asserting:
  - TC-DIPS-01: `printTicketElement` supports `orientation?: 'portrait' | 'landscape'` parameter with `@page { size: A4 ${orientation}; margin: 8mm 10mm; }`.
  - TC-DIPS-02: Isolated iframe DOM sanitizer removes `overflow`, `max-height`, `transform`, `display: flex` from printable clone root.
  - TC-DIPS-03: `.printable-job-ticket` enforces ISO 216 height and `break-after: page; page-break-after: always;` with last-child reset.
  - TC-DIPS-04: Multi-lot manifest in `BatchJobTicketModal` explicitly passes `orientation: 'landscape'`.
  - TC-DIPS-05: Batch individual tickets in `BatchJobTicketModal` explicitly passes `orientation: 'portrait'` with discrete page references.
  - TC-DIPS-06: Preview modal provides realistic A4 paper framing (`aspect-[210/297]` or `aspect-[297/210]`) and orientation indicator badges.

- [x] **Step 1.2: Run test suite to verify tests fail before implementation**
Run `npm test -- src/test/dips-print-standard.test.ts` and confirm failure on missing DIPS signatures.

---

### Task 2: Upgrade `printTicketElement` with Clean DOM Isolation & Orientation Control

**Files:**
- Modify: `src/components/job-ticket.tsx:580-730`
- Test: `src/test/dips-print-standard.test.ts`

- [x] **Step 2.1: Update `printTicketElement` function signature**
Add parameter `orientation: 'portrait' | 'landscape' = 'portrait'` to `printTicketElement`:
```typescript
export function printTicketElement(
  element: HTMLElement | null,
  docTitle = "Phiếu giao nhận & Lệnh gia công ngoài",
  copies = 1,
  orientation: "portrait" | "landscape" = "portrait",
)
```

- [x] **Step 2.2: Implement DOM Sanitizer to remove pagination-breaking constraints**
When deep cloning the element:
- Strip inline styles: `overflow`, `overflow-y`, `overflow-x`, `max-height`, `height`, `transform`, `flex`, `display: flex` from clone and top-level wrapper.
- Ensure cloned wrapper has `display: block !important; overflow: visible !important; height: auto !important;`.

- [x] **Step 2.3: Inject Industrial `@page` CSS and ISO 216 Dimensions**
In the iframe `<style>` block:
- `@page { size: A4 ${orientation}; margin: 8mm 10mm; }`
- `.printable-job-ticket { page-break-after: always !important; break-after: page !important; page-break-inside: avoid !important; break-inside: avoid !important; width: 100% !important; min-height: calc(297mm - 16mm) !important; max-height: calc(297mm - 16mm) !important; display: flex !important; flex-direction: column !important; justify-content: space-between !important; box-sizing: border-box !important; }`
- `.printable-job-ticket:last-child { page-break-after: auto !important; break-after: auto !important; }`
- For landscape manifest:
  `table { page-break-inside: auto; } tr { break-inside: avoid !important; page-break-inside: avoid !important; }`

- [x] **Step 2.4: Verify Task 2 tests pass**
Run `npm test -- src/test/dips-print-standard.test.ts`.

---

### Task 3: Refactor Single & Batch Ticket Components for DIPS Compliance

**Files:**
- Modify: `src/components/job-ticket.tsx:230-510,1210-1475`
- Test: `src/test/dips-print-standard.test.ts`
- Test: `src/test/job-ticket-ergonomics.test.ts`

- [x] **Step 3.1: Enforce A4 Portrait layout in `SingleA4TicketContent`**
Ensure `SingleA4TicketContent` fits exactly within standard printable A4 bounds without vertical spilling, keeping barcode, technical table, heat treatment cycle, QC inspection log, and 4 signatures cleanly spaced:
- Root container: `w-full max-w-[210mm] min-h-[calc(297mm-16mm)] max-h-[calc(297mm-16mm)] flex flex-col justify-between`.

- [x] **Step 3.2: Configure `BatchJobTicketModal` for Manifest Landscape & Tickets Portrait**
In `BatchJobTicketModal`:
- When `mode === 'manifest'`:
  - Provide dedicated ref `manifestPrintRef`.
  - Print button passes `orientation: 'landscape'` and doc title `Bang_ke_tong_hop_${items.length}_lo`.
  - Manifest container styled for A4 Landscape preview with orientation badge `A4 Ngang (Landscape)`.
- When `mode === 'tickets'`:
  - Provide dedicated ref `ticketsPrintRef` containing ONLY the list of ticket nodes.
  - Print button passes `orientation: 'portrait'` and doc title `Tap_phieu_A4_${items.length}_lo`.
  - Preview displays discrete A4 sheets with card shadow, sheet border, and page tags `Trang {idx + 1}/{items.length}`.

- [x] **Step 3.3: Update `JobTicketButton` single print handler**
Ensure `handlePrint` explicitly passes `orientation: 'portrait'`.

- [x] **Step 3.4: Run all print tests and verify**
Run `npm test -- src/test/dips-print-standard.test.ts src/test/job-ticket-ergonomics.test.ts`.

---

### Task 4: Complete System Verification & Design System Compliance

**Files:**
- Test: `src/test/dips-print-standard.test.ts`
- Test: `src/test/job-ticket-ergonomics.test.ts`
- Test: `src/test/design-system-compliance.test.ts`

- [x] **Step 4.1: Run full test verification**
Execute `npm test -- src/test/dips-print-standard.test.ts src/test/job-ticket-ergonomics.test.ts src/test/design-system-compliance.test.ts src/test/app-routing.test.tsx`.

- [ ] **Step 4.2: Commit changes to git**
Commit all modifications with a structured semantic commit message following project standards.
