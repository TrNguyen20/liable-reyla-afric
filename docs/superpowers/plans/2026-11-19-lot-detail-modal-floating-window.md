# Lot Detail Modal Floating Window (v2.7.0) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the single-lot detail viewer and editor in `src/routes/tracking.tsx` from a cramped, right-side slide-over drawer into a centered industrial Floating Pop-up Window (`rounded-xl border shadow-2xl`) with a 2-column Bento Grid layout and sibling lot navigation.

**Architecture:**
1. Replace `LotDetailDrawer` with `LotDetailModal` adhering to the Graphite Wireframe Floating Pop-up Window Specification (v2.7.0): centered modal dialog (`fixed inset-0 z-50 flex items-center justify-center`), max-width 5xl (`max-w-5xl`), `rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl`.
2. Modularize into `src/components/tracking/lot-detail-modal.tsx` to preserve `design-system-compliance.test.ts` (TC-DS-04) where `tracking.tsx` static elements strictly use `rounded-xs`.
3. Structure the body into an expansive 2-column Bento Grid:
   - **Left Column (5 cols)**: Core identification, technical specs (material, HRC hardness badge, qty, weight, dimensions), commercial pricing (with RBAC gating), and logistics status.
   - **Right Column (7 cols)**: 
     - *View Mode*: Vendor 2-Way Hub (measured HRC, QC status, cycle dates, heat curve & cert links) + Audit Trail timeline.
     - *Edit Mode*: Form fields grouped into Technical and Logistics clusters, with dimension specifications and mandatory reason input.
4. Sticky Footer with Sibling Lot Navigation (`← Lô trước` / `Lô sau →`), 1-click A4 Job Ticket printing (`JobTicketButton`), and action buttons (`Lưu thay đổi` / `Đóng`).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Vitest.

**Spec:** Dynamo MES UI/UX Specification v2.7.0 (`DESIGN-SYSTEM.md`), `AGENTS.md`.

## Global Constraints

- Static page elements strictly use `rounded-xs` / `rounded-sm`.
- Floating Pop-up Windows strictly use `rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl`.
- Numerical, identifier, date, hardness, and monetary fields must use `font-mono tabular-nums`.
- Preserve all existing edit, audit trail logging (`appendAudit`), and backend sync (`syncWriteBack`) operations.
- Ensure 100% compliance with `design-system-compliance.test.ts` and `app-routing.test.tsx`.

## Review Focus

1. **Modal Centering vs Drawer Slide-in**: Ensure drawer classes (`justify-end`, `border-l`, `slide-in-from-right`, `max-w-lg`) are completely replaced by center modal classes (`justify-center`, `max-w-5xl`, `rounded-xl`, `shadow-2xl`).
2. **Sibling Navigation Integrity**: Verify `handlePrevLot` and `handleNextLot` navigate correctly within `siblingItems` without crashing at bounds.
3. **Edit Mode Data Binding**: Ensure all 11 fields (`ma_hang`, `So_DatHang`, `vat_lieu`, `do_cung`, `so_luong`, `kg_Lot`, `cty_QT`, `TrangThai`, `ngay_gui_QT`, `han_tra`, `Kich_Thuoc_SP`) update properly and trigger `appendAudit` with audio cue.
4. **Pricing RBAC Protection**: Ensure unit price and total amount are hidden when `canViewPricing(role)` is false.
5. **No Regressions on Tracking Route**: Verify clicking lot name `ma_hang` in tracking data grid opens the new centered modal seamlessly.

---

### Task 1: Create Unit Test Suite for LotDetailModal (TDD)

**Files:**
- Create: `src/test/lot-detail-modal-floating-window.test.ts`
- Test: `src/test/lot-detail-modal-floating-window.test.ts`

- [x] **Step 1.1: Write failing tests for LotDetailModal floating window**
Create `src/test/lot-detail-modal-floating-window.test.ts` testing:
  - TC-LDM-01: `LotDetailModal` exists and uses center modal layout (`justify-center`, `max-w-5xl`, `rounded-xl`, `shadow-2xl`).
  - TC-LDM-02: Replaces right slide-over drawer classes (`justify-end`, `slide-in-from-right`).
  - TC-LDM-03: Renders 2-column Bento Grid structure (`grid-cols-1 md:grid-cols-12` with 5:7 column split).
  - TC-LDM-04: Sibling lot navigation buttons (`Lô trước` / `Lô sau`) exist in footer.
  - TC-LDM-05: Preserves edit mode with 2-cluster inputs and mandatory audit reason input.

- [x] **Step 1.2: Run test suite to verify tests fail before implementation**
Run `npm test -- src/test/lot-detail-modal-floating-window.test.ts` to confirm red test state.

---

### Task 2: Implement LotDetailModal in `src/components/tracking/lot-detail-modal.tsx` and integrate in `src/routes/tracking.tsx`

**Files:**
- Create: `src/components/tracking/lot-detail-modal.tsx`
- Modify: `src/routes/tracking.tsx`
- Test: `src/test/lot-detail-modal-floating-window.test.ts`

- [x] **Step 2.1: Implement component signature and add sibling navigation**
Create `LotDetailModal` in `src/components/tracking/lot-detail-modal.tsx`:
- Accept props `item: QTItem`, `role: string`, `siblingItems: QTItem[]`, `onClose: () => void`, `onUpdate: (patch: Partial<QTItem>) => void`, `onItemChange?: (newItem: QTItem) => void`.
- Compute `currentIndex`, `hasPrev`, `hasNext`, `handlePrevLot`, `handleNextLot`.
- Keyboard navigation (ArrowLeft / ArrowRight / Escape).

- [x] **Step 2.2: Implement Centered Floating Modal Container and Header**
- Center container: `fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0 duration-150`.
- Card container: `w-[95vw] max-w-5xl max-h-[90vh] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl flex flex-col overflow-hidden text-foreground`.
- Header: Badge `ID_Key`, `phong_sx`, `TrangThai`, title `ma_hang`, order `So_DatHang`, edit toggle button `✏️ Sửa lô này` / `Hủy sửa`, close button `✕`.

- [x] **Step 2.3: Implement 2-Column Bento Grid Body**
- Left Column (`md:col-span-5`):
  - Bento Technical Card: Material, Hardness (badge), Qty, Weight, Dimensions.
  - Bento Commercial Card: Partner, Sent Date, Due Date, Unit Price & Total Price (gated by `canViewPricing`).
  - Logistics Card: Status banner + `LotUpdateButton`.
- Right Column (`md:col-span-7`):
  - View Mode: Vendor 2-Way Hub (HRC, QC PASS/FAIL, Lot NCC, Technician, Heat curve & Cert links) + Audit Trail timeline.
  - Edit Mode: Form inputs in 2 clusters (Kỹ thuật & Giao nhận), dimension input, reason input, cancel and save buttons.

- [x] **Step 2.4: Implement Sticky Footer with Sibling Navigation**
- Footer bar: `px-5 py-3 border-t border-border bg-slate-50 dark:bg-card/80 flex flex-wrap items-center justify-between gap-3 shrink-0`.
- Left: Sibling navigation (`← Lô trước` / `Lô sau →` with current index badge `Lô X / N`).
- Center: `JobTicketButton` (In phiếu A4).
- Right: Action buttons (`Đóng`).

- [x] **Step 2.5: Update usage in tracking page**
Update `detailLot` render block in `src/routes/tracking.tsx` to render `<LotDetailModal ... onItemChange={setDetailLot} />`.

- [x] **Step 2.6: Verify Task 2 tests pass**
Run `npm test -- src/test/lot-detail-modal-floating-window.test.ts`.

---

### Task 3: Comprehensive Verification & Regression Testing

**Files:**
- Test: `src/test/lot-detail-modal-floating-window.test.ts`
- Test: `src/test/design-system-compliance.test.ts`
- Test: `src/test/app-routing.test.tsx`
- Test: `src/test/dips-print-standard.test.ts`
- Test: `src/test/job-ticket-ergonomics.test.ts`

- [x] **Step 3.1: Run all regression suites**
Verified all 31 test suites pass (281 tests passed, 0 failed).
