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
> 👉 [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) — **Graphite Wireframe UI Specification (v2.2.0)**.
>
> **Mandatory Directives for AI Agents:**
> 1. **Minimal 2px Corners**: Use `rounded-xs` (`rounded-[2px]`) or `rounded-sm` (max 4px). NEVER introduce `rounded-lg`, `rounded-xl`, `rounded-2xl`, or consumer-style pill buttons (`rounded-full` is restricted only to micro LED status dots).
> 2. **Monospaced Data Grid**: All quantitative, order, lot, material, date, and status fields MUST use `font-mono tabular-nums`.
> 3. **Industrial Wireframe Elements**: 1px sharp borders (`border-border`), high contrast cool graphite neutrals, industrial status tags (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`), and Andon/Run LED indicators (`fx-run-dot`).
> 4. **Official Route Architecture**:
>    - `[1] /tracking`: Luân chuyển nhiệt luyện QT (Trang điều độ chính).
>    - `[2] /dashboard`: Tổng quan hệ thống & Biên bản bàn giao ca A4.
>    - `[3] /orders`: Chi tiết đơn đặt hàng & linh kiện gia công.
>    - `[4] /sync`: Đồng bộ Google Sheets (Phân quyền Admin).
>    - `/login`: Xác thực mã bảo mật ULID.
>    - `/`: Chuyển hướng tự động vào `/tracking`.
>    - *Đã dọn dẹp*: `/materials` và `/audit-costs` đã bị loại bỏ hoàn toàn.
> 5. **Automated Enforcement**: All UI modifications must pass `src/test/design-system-compliance.test.ts` and `src/test/app-routing.test.tsx` on `npm test`.
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
