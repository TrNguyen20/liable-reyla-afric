# LotDetailModal Refinements Implementation Plan (v2.8.6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the single-lot floating pop-up window (`LotDetailModal`) in Dynamo MES with strict 100% read-only mode, remove redundant graphic buttons, fix heat cycle parameter prefilling (`value` prop), remove `PENDING` from QC inspection, convert vendor progress (`ncc_tatus`) to standard dropdown, and implement back-by-back window stack navigation.

**Architecture:** 
- Maintain strict Graphite Wireframe UI Specification (v2.7.0/v2.8.0).
- Keep `LotDetailModal` as a floating dialog with `rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl`.
- Enforce back-by-back modal stacking by isolating event bubbling (`e.stopPropagation()`) and managing layered Escape key dismissals.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Lucide React, Vitest.

---

## Global Constraints
- Master columns (`ma_hang`, `ngay_tao`, `quoc_gia`, `phong_sx`, `doi_tuong_hang`, `id_ma_hang`, `cty_qt`) are strictly locked / read-only.
- All numbers/dates use `font-mono tabular-nums`.
- Vitest tests must pass 100% (31/31 suites).
- Never force push or rewrite git history (Lovable compatibility).

---

## Tasks

### Task 1: Write TDD Unit Tests for Refinements
**Files:**
- Modify: `src/test/lot-detail-modal-floating-window.test.ts`

- [ ] Write tests `TC-LDM-12`, `TC-LDM-13`, `TC-LDM-14`, `TC-LDM-15`, `TC-LDM-16` covering:
  - `TC-LDM-12`: View mode enforces 100% read-only (no "Hiệu chỉnh" or "+ Giản đồ" button; opens view-only modal).
  - `TC-LDM-13`: Edit mode Giản đồ removes redundant "[ Đồ họa ]" button, provides "Sửa với đồ họa", passes `value={form.ncc_giando}`.
  - `TC-LDM-14`: `ncc_ket_qua_qc` select does not contain `PENDING`.
  - `TC-LDM-15`: `ncc_tatus` uses select dropdown with `WAIT`, `HEAT`, `TRANSIT`, `DONE`.
  - `TC-LDM-16`: Back-by-back window stack handling (Escape and backdrop click protection).
- [ ] Run `npm test` and verify that new tests fail as expected.

### Task 2: Implement HeatCycleModal Props and Event Isolation
**Files:**
- Modify: `src/components/technical-charts/heat-treatment-cycle/heat-cycle-modal.tsx`

- [ ] Ensure `HeatCycleModal` has `z-[60]`.
- [ ] In `HeatCycleModal`, handle `canEdit={false}`: disable/hide quick presets and save buttons.
- [ ] Add `e.stopPropagation()` on backdrop click, content click, and close button.
- [ ] Add capture phase Escape key listener that stops propagation when `isOpen`.

### Task 3: Implement LotDetailModal Refinements
**Files:**
- Modify: `src/components/tracking/lot-detail-modal.tsx`
- Modify: `src/components/tracking/file-lightbox-modal.tsx`

- [ ] Pass `value={isEditing ? form.ncc_giando : (item.ncc_giando || '')}` and `canEdit={isEditing}` to `HeatCycleModal`.
- [ ] In view mode:
  - Hide `"Hiệu chỉnh"` button and `"+ Giản đồ"` button.
  - Show `—` when `!item.ncc_giando`.
  - HoverCard tooltip text updated to "Bấm để xem phóng to".
  - Clicking mini SVG opens `HeatCycleModal` with `canEdit={false}`.
- [ ] In edit mode:
  - Remove redundant `[ Đồ họa ]` button next to input.
  - Change link above input to `"Sửa với đồ họa"`.
- [ ] In `ncc_ket_qua_qc`: Remove `PENDING` option.
- [ ] In `ncc_tatus`: Replace text input with `<select>` having `WAIT`, `HEAT`, `TRANSIT`, `DONE` and badge in view mode.
- [ ] In `LotDetailModal`:
  - Update Escape key handler to dismiss `lightboxFile` or `heatCycleModalOpen` first before closing `LotDetailModal`.
  - Update backdrop click handler with `if (lightboxFile || heatCycleModalOpen) return;` and `if (e.target !== e.currentTarget) return;`.
- [ ] In `FileLightboxModal`: Add event isolation on content and backdrop.

### Task 4: Run Test Suite and Verification
**Files:**
- Verify: `npm test`

- [ ] Run full Vitest suite to ensure 100% pass across all 31 test files.
- [ ] Stage and commit changes with descriptive commit message.
