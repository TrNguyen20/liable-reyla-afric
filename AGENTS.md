<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

<!-- MES_DESIGN_SYSTEM:BEGIN -->
> [!IMPORTANT]
> ### 📐 DYNAMO MES UI/UX SINGLE SOURCE OF TRUTH
> All frontend code, components, styling, and UI layouts in this repository MUST strictly comply with:
> 👉 [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) — **Graphite Wireframe UI Specification (v2.1.0)**.
>
> **Mandatory Directives for AI Agents:**
> 1. **Minimal 2px Corners**: Use `rounded-xs` (`rounded-[2px]`) or `rounded-sm` (max 4px). NEVER introduce `rounded-lg`, `rounded-xl`, `rounded-2xl`, or consumer-style pill buttons (`rounded-full` is restricted only to micro LED status dots).
> 2. **Monospaced Data Grid**: All quantitative, order, lot, material, date, and status fields MUST use `font-mono tabular-nums`.
> 3. **Industrial Wireframe Elements**: 1px sharp borders (`border-border`), high contrast cool graphite neutrals, industrial status tags (`[WAIT]`, `[TRANSIT]`, `[STOCKED]`, `[PASS]`, `[FAIL]`), and Andon/Run LED indicators (`fx-run-dot`).
> 4. **Official Route Architecture**:
>    - `[1] /tracking`: Luân chuyển nhiệt luyện QT (Trang điều độ chính).
>    - `[2] /dashboard`: Tổng quan hệ thống & Biên bản bàn giao ca A4.
>    - `[3] /orders`: Chi tiết đơn đặt hàng & linh kiện gia công.
>    - `[4] /sync`: Liên kết Google Sheets (Phân quyền Admin).
>    - `/login`: Xác thực mã bảo mật ULID.
>    - `/`: Chuyển hướng tự động vào `/tracking`.
>    - *Đã dọn dẹp*: `/materials` và `/audit-costs` đã bị loại bỏ hoàn toàn.
> 5. **Automated Enforcement**: All UI modifications must pass `src/test/design-system-compliance.test.ts` and `src/test/app-routing.test.tsx` on `npm test`.
<!-- MES_DESIGN_SYSTEM:END -->
