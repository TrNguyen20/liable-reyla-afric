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
> 👉 [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) — **Graphite Wireframe UI Specification (v2.5.0)**.
>
> **Mandatory Directives for AI Agents:**
> 1. **Minimal 2px Corners vs. Floating Windows Specification (v2.7.0)**:
>    - **Static Page Elements** (Table, rows, cells, inputs, toolbar buttons, grid headers): Strictly use `rounded-xs` (`rounded-[2px]`) or `rounded-sm` (max 4px). NEVER introduce `rounded-lg` or `rounded-xl` into static page flow.
>    - **Floating Pop-up Windows & Dialogs** (All modals, file managers, ticket printing, column customization, lot updates, batch actions): MUST strictly adopt the modern industrial floating window standard: `rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-2xl`. Modal header/footers use rounded sub-elements (`rounded-lg`, pill badges).
> 2. **Monospaced Data Grid**: All quantitative, order, lot, material, date, and status fields MUST use `font-mono tabular-nums`.
> 3. **Industrial Wireframe Elements**: 1px sharp borders (`border-border`), high contrast cool graphite neutrals, industrial status tags (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`), and Andon/Run LED indicators (`fx-run-dot`).
> 4. **Official Route Architecture**:
>    - `[1] /tracking`: Luân chuyển nhiệt luyện QT (Trang điều độ chính).
>    - `[2] /dashboard`: Tổng quan luân chuyển & phân tích tài chính kỹ thuật.
>    - `[3] /orders`: Chi tiết đơn đặt hàng & linh kiện gia công.
>    - `[4] /sync`: Đồng bộ Google Sheets (Phân quyền Admin).
>    - `/login`: Xác thực mã bảo mật truy cập ID do Admin cấp.
>    - `/`: Chuyển hướng tự động vào `/tracking`.
>    - *Đã dọn dẹp*: `/materials` và `/audit-costs` đã bị loại bỏ hoàn toàn.
> 5. **Automated Enforcement**: All UI modifications must pass `src/test/design-system-compliance.test.ts` and `src/test/app-routing.test.tsx` on `npm test`.
> 6. **36-Column Google Sheets Schema & Timestamp Sorting**: All date columns (`ngay_tao`, `ngay_gui_qt`, `ncc_ngay_qt`, `ncc_ngay_tra_qt`, `han_tra`) MUST sort chronologically using Epoch numeric timestamps (`parseFlexibleDate(val)?.getTime() ?? 0`). Default grid sort is `ngay_tao` descending (`desc`).
> 7. **7 Immutable Master Columns (Strictly Read-Only)**: The following 7 columns are master identifiers and MUST NEVER be editable from the webapp table: `ma_hang`, `ngay_tao`, `quoc_gia`, `phong_sx`, `doi_tuong_hang`, `id_ma_hang`, and `cty_qt`. All other columns, including 12 vendor columns (`ncc_*`), support hover `PenLine` inline edit.
> 8. **DIPS v1.0 Industrial Print Standard (v2.8.0)**:
>    - **Phân định 2 khổ giấy A4**: Bảng kê tổng hợp nhiều cột (Manifest) bắt buộc dùng A4 Ngang (`@page { size: A4 landscape; margin: 8mm 10mm; }`). Phiếu giao nhận & lệnh gia công (Job Tickets) bắt buộc dùng A4 Dọc (`@page { size: A4 portrait; margin: 8mm 10mm; }`).
>    - **Dồn nội dung lên đỉnh (Top-aligned)**: Nội dung phiếu luôn dồn khít lên phía trên (`justify-start`), giữ nguyên khung A4 chuẩn (`min-h/max-h` 297mm, `aspect-[210/297]`), tuyệt đối không dùng `justify-between` làm phân tán khoảng cách thưa thớt.
>    - **DOM Sanitizer & Khử trang trắng thừa**: Hàm `printTicketElement` bắt buộc tẩy sạch `overflow`, `max-height`, `transform`, `flex` trên thẻ cha DOM clone để Chromium phân trang tự nhiên (1 phiếu = 1 sheet); phần tử cuối cùng phải có `last-child { break-after: auto; }` chống in trang trắng số 31 thừa.
> 9. **Zero-Gap Full-Height Data Grid Architecture (v2.8.0)**:
>    - **Triệt tiêu khoảng trắng lãng phí ở đáy**: Nghiêm cấm dùng `maxHeight: calc(100vh - Xpx)` bên trong container flex cha đã có `flex-1 flex flex-col`.
>    - **Chuẩn co giãn kịch đáy**: Thẻ container bảng dữ liệu bắt buộc dùng `className="flex-1 min-h-0 overflow-auto relative"` kết hợp thanh phân trang Pagination bar mang class `shrink-0` để bảng dữ liệu tự động lấp đầy 100% chiều cao màn hình, thanh phân trang luôn tự động bám sát mép viền đáy dưới cùng.
<!-- MES_DESIGN_SYSTEM:END -->

<!-- SUBAGENT_PROTOCOL:BEGIN -->
> [!IMPORTANT]
> ### 🤖 DYNAMO MES SUBAGENT ORCHESTRATION PROTOCOL
> Quy chuẩn điều phối và phân công tác vụ cho 6 Subagent sẵn có trong môi trường Antigravity.
> 👉 **Cẩm nang vận hành chi tiết**: [`docs/SUBAGENT_GUIDE.md`](./docs/SUBAGENT_GUIDE.md) — Hướng dẫn ma trận 6 subagent, quick cheat sheet & kịch bản thực chiến.
>
> Mọi AI Agent hoạt động trên repository này bắt buộc phải tuân thủ nghiêm ngặt các nguyên tắc sau:

#### 1. Nguyên Tắc Tự Động Hóa Thông Minh (Smart Autonomy)
Lead Agent chủ động phân tích độ phức tạp của yêu cầu người dùng để âm thầm điều phối subagent ngầm (background execution) phù hợp, không làm phình ngữ cảnh (Context Window) của hội thoại chính:
- **Khảo sát mã nguồn / Đọc > 5 file / Tra cứu web**: Bắt buộc giao cho `research` (Model: `flash` hoặc `flash_lite`). Lead Agent không đọc hàng loạt file thủ công gây nghẽn bộ nhớ ngữ cảnh.
- **Tối ưu 22.000+ dòng dữ liệu / Virtualization / Tràn RAM**: Ủy quyền cho `performance-optimizer`.
- **Cấu hình Vercel / Nitro Engine / Biến môi trường**: Ủy quyền cho `deployment-expert`.
- **Kiến trúc bền bỉ / AI Features / Google Apps Script Sync**: Ủy quyền cho `ai-architect`.
- **Thiết kế sơ đồ xưởng / Icon Andon / Mockup visual**: Ủy quyền cho `image-generator`.
- **Refactor kiến trúc / Thay đổi router / Sửa đổi rủi ro cao**: Ủy quyền cho `self` trên workspace độc lập.

#### 2. Chiến Lược Không Gian Làm Việc Hybrid (Workspace Mode Policy)
- **Chế độ `inherit`**: Áp dụng cho các tác vụ sửa chữa cục bộ (1-2 file component, tinh chỉnh CSS, bổ sung unit test đơn lẻ) nhằm đảm bảo tốc độ phản hồi nhanh nhất.
- **Chế độ `branch`**: BẮT BUỘC áp dụng cho các tác vụ refactor kiến trúc lớn (Routing TanStack Start, Server Cache trong `server-dataset.ts`, Webhook 2 chiều trong `sync.tsx`). Subagent làm việc trên nhánh cô lập, chạy pass 100% `npm test` trước khi đề xuất Lead Agent nghiệm thu.
- **Bảo toàn lịch sử Lovable**: Tuyệt đối KHÔNG chạy `git push -f`, `rebase`, hoặc `squash` các commit đã đẩy lên remote.

#### 3. Cơ Chế Nạp Ngữ Cảnh Có Mục Tiêu (Targeted Context Injection)
Khi gọi từng subagent, Lead Agent tự động trích lọc và nạp chính xác các Invariants liên quan trực tiếp đến nhiệm vụ của subagent đó:
- Gửi cho `performance-optimizer`: Rule 22k rows, cấm render DOM vô hạn, bắt buộc dùng IndexedDB thay vì localStorage, tối ưu SSR hydration.
- Gửi cho `deployment-expert`: Rule Nitro Preset `NITRO_PRESET=vercel`, Node.js $\ge$ 20.x, bảo mật webhook endpoint `DYNAMO_WEBHOOK_URL`, output `.vercel/output`.
- Gửi cho `self` / Dev tasks: Rule bo góc 2px (`rounded-xs`), `font-mono tabular-nums`, bảo mật danh tính đối tác (`formatVendorName`), che đơn giá (`canViewPricing`), và cấm Node built-ins trong browser/edge.

#### 4. Quy Chuẩn Báo Cáo Tinh Gọn (Executive Reporting Standard)
Sau khi subagent hoàn tất nhiệm vụ ngầm (Reactive Wakeup), Lead Agent tổng hợp kết quả theo định dạng tinh gọn 3-5 gạch đầu dòng:
1. **Subagent đã kích hoạt**: Tên subagent + thời gian thực thi.
2. **Nội dung xử lý**: Tóm tắt 1-2 câu giải pháp kỹ thuật đã áp dụng.
3. **Kết quả nghiệm thu**: Trạng thái kiểm thử (`npm test`: X passed), metrics hiệu năng hoặc diff thay đổi.
4. **Đường dẫn liên quan**: Clickable links đến file/artifact đã chỉnh sửa.
*(Tuyệt đối không trích xuất log thô dài dòng làm loãng cửa sổ làm việc).*

#### 5. Bảng Kích Hoạt Nhanh Cho Người Dùng (User Quick Prompts)
Người dùng có thể yêu cầu chỉ định nhanh subagent thông qua ngôn ngữ tự nhiên:
- `"Khảo sát cấu trúc module X..."` ➔ Tự động kích hoạt `research` (`flash`).
- `"Tối ưu giật lag / bảng 22k dòng..."` ➔ Tự động kích hoạt `performance-optimizer`.
- `"Kiểm tra cấu hình deploy Vercel..."` ➔ Tự động kích hoạt `deployment-expert`.
- `"Thử nghiệm refactor nhánh riêng..."` ➔ Tự động kích hoạt `self` (`branch`).
<!-- SUBAGENT_PROTOCOL:END -->

<!-- SUPERPOWERS:BEGIN -->
> [!IMPORTANT]
> ### ⚡ SUPERPOWERS ENGINEERING PROTOCOL
> **Triết lý cốt lõi: "Quy tắc 1%" (The 1% Rule)**:
> Nếu có khả năng dù chỉ 1% một task cần skill, Agent bắt buộc phải kích hoạt skill đó thay vì vội vàng viết code ngay.
>
> Agent MUST strictly follow the Superpowers lifecycle:
> 1. **Brainstorming First**: Clarify requirements before touching any code.
> 2. **Implementation Plan**: Break down work into atomic testable phases.
> 3. **TDD Enforcement**: Write failing tests first, verify, then write implementation.
> 4. **Systematic Debugging**: Form hypotheses and find root cause; never apply random patches.
<!-- SUPERPOWERS:END -->

<!-- WORKTREE_MERGE_PROTOCOL:BEGIN -->
> [!IMPORTANT]
> ### 🌿 WORKTREE TO MAIN MERGE PROTOCOL (`qt-mes-worktree-merg2main`)
> Khi người dùng yêu cầu kéo/merge thay đổi từ git worktree về mã nguồn main hoặc đồng bộ sang thư mục chính:
> 1. **BẮT BUỘC Kích hoạt skill**: [`qt-mes-worktree-merg2main`](./.agent/skills/qt-mes-worktree-merg2main/SKILL.md).
> 2. **Tự động nhận diện & hỏi lại xác nhận**: Dùng `git worktree list` nhận diện thư mục main (mặc định: `D:\NTT-2025\KAIZEN\m.Clone-github (internet)\liable-reyla-afric`), BẮT BUỘC hỏi lại người dùng để nạp thêm hoặc xác nhận đường dẫn chính xác.
> 3. **Sinh One-liner an toàn**: Luôn cung cấp 1 dòng lệnh duy nhất (gộp commit tại worktree $\rightarrow$ cd thư mục main $\rightarrow$ pull main $\rightarrow$ merge branch $\rightarrow$ push GitHub).
<!-- WORKTREE_MERGE_PROTOCOL:END -->
