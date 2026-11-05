---
goal: Đồng bộ Typography JetBrains Mono, Chuẩn hóa Sub-header Toolbar 4 Routes và Nâng cấp Nút / Popup Cập nhật QT-MES
version: 1.0
date_created: 2026-11-05
status: 'Completed'
tags:
  - design
  - typography
  - wireframe
  - sub-header
  - dialog
  - kiosk-ergonomics
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch chuẩn hóa giao diện người dùng (UI/UX) toàn diện cho hệ thống điều hành sản xuất **DYNAMO QT-MES** theo đặc tả thiết kế **Graphite Wireframe UI Specification (v2.2.0)**. Đợt tối ưu hóa này giải quyết triệt để 3 nhóm vấn đề cốt lõi đã được phát hiện trong quá trình Audit:
1. **Khuyết thiếu Token Typography**: Bổ sung token `--font-mono` (`"JetBrains Mono"`) vào `@theme inline` của `src/styles.css` và đồng nhất typography giữa `/dashboard` và `/tracking`.
2. **Bất đối xứng Sub-Header Toolbar**: Thống nhất thanh công cụ sub-header trên cả 4 route chính (`/tracking`, `/dashboard`, `/orders`, `/sync`) thành Wireframe Card đồng bộ (`rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs`) cùng bộ huy hiệu định danh route `[1]` đến `[4]`.
3. **Ergonomics Nút & Popup Cập nhật**: Nâng cấp `LotUpdateButton` hỗ trợ chế độ biểu tượng (`variant="icon"`) giải phóng diện tích cột bảng, bổ sung nút Hủy bỏ cho `LotUpdateDialog` trên màn hình cảm ứng xưởng (Kiosk), chuẩn hóa kích thước ô nhập về `h-8.5 text-xs` và khắc phục vi phạm bo góc trên các hộp cảnh báo.

---

## 1. Requirements & Constraints

### Yêu cầu chức năng & Giao diện (Functional & UI Requirements)
- **REQ-001**: Khai báo biến token `--font-mono: "JetBrains Mono", ui-monospace, monospace;` trong `@theme inline` tại `src/styles.css`, đảm bảo toàn bộ class `font-mono` kích hoạt chuẩn font JetBrains Mono đã import tại `__root.tsx`.
- **REQ-002**: Tiêu đề cột bảng trong `src/routes/tracking.tsx` (`TrackingHeaderCell`) phải chuyển sang `font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground`, đồng bộ 1:1 với bảng `/dashboard`.
- **REQ-003**: Thẻ trạng thái (Status Tag) trên cả 2 trang `/dashboard.tsx` và `/tracking.tsx` phải dùng chung padding `px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs`.
- **REQ-004**: Sub-header toolbar trên toàn bộ 4 trang (`/tracking`, `/dashboard`, `/orders`, `/sync`) phải đóng khung Wireframe Card chuẩn: `rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs backdrop-blur-xs` với độ cao điều khiển cố định `h-8` (32px).
- **REQ-005**: Thiết lập huy hiệu định danh phân hệ (Route Identity Badge) thống nhất ở đầu Sub-header của 4 trang:
  - Route `[1]`: `[1] LUÂN CHUYỂN QT` trên `/tracking`
  - Route `[2]`: `[2] TỔNG QUAN LUÂN CHUYỂN` trên `/dashboard`
  - Route `[3]`: `[3] ĐƠN ĐẶT HÀNG` trên `/orders`
  - Route `[4]`: `[4] LIÊN KẾT GOOGLE SHEETS` trên `/sync`
- **REQ-006**: Component `LotUpdateButton` phải hỗ trợ prop `variant?: 'icon' | 'button'`. Khi `variant="icon"`, render nút vuông `size-7 rounded-xs border-border` chứa icon `Zap` (13px) kèm tooltip và text ẩn hỗ trợ đọc màn hình (`sr-only`), đối xứng hoàn hảo với `JobTicketButton`.
- **REQ-007**: Hộp thoại `LotUpdateDialog` phải bổ sung nút hủy bỏ `<Button type="button" variant="ghost">Hủy bỏ</Button>` trong `DialogFooter`, tuân thủ Định luật Fitts (Fitts's Law) cho màn hình Kiosk xưởng.
- **REQ-008**: Toàn bộ input/select trong `LotUpdateDialog` phải chuyển từ `h-10 text-sm` về chuẩn Wireframe `h-8.5 font-mono text-xs rounded-xs border border-input bg-background px-2.5`, nhãn trường được bọc cấu trúc `<span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">`.
- **REQ-009**: Hộp thông báo lỗi `<ul>` và hộp xác nhận chuyển trạng thái `<p>` trong `LotUpdateDialog` phải có bo góc sắc nét `rounded-xs`.
- **REQ-010**: Bổ sung thẻ `<DialogDescription className="sr-only">` trong `LotUpdateDialog` để thỏa mãn tiêu chuẩn tiếp cận WAI-ARIA của Radix UI.

### Ràng buộc kỹ thuật (Constraints)
- **CON-001**: Tuyệt đối tuân thủ `DESIGN-SYSTEM.md` (v2.2.0): Bán kính bo góc tối đa `rounded-xs` (2px), bóng đổ vi mô `shadow-2xs`, cấm sử dụng `rounded-lg`, `rounded-xl`, `rounded-2xl` hoặc các bóng đổ đậm.
- **CON-002**: Giữ nguyên tính toàn vẹn của git history trên Lovable: Không `git push -f`, rebase hoặc squash commit.
- **CON-003**: 100% test cases tự động phải pass qua lệnh `npm test` và `npm run build` không phát sinh lỗi biên dịch TypeScript.

### Hướng dẫn & Mẫu thiết kế (Guidelines & Patterns)
- **GUD-001**: Subagent Orchestration Protocol: Lead Agent thực hiện can thiệp mã nguồn với độ chính xác cao, kích hoạt kiểm thử tự động tại chỗ.
- **PAT-001**: Industrial Action Symmetrical Pattern: Cột thao tác trong bảng dữ liệu sử dụng nút vuông icon `size-7` đồng đều, tối ưu mật độ hiển thị thông tin.

---

## 2. Implementation Steps

### Giai đoạn 1: Đồng bộ Typography Token & Tiêu đề Bảng (Typography & Token Alignment)

- GOAL-001: Khắc phục triệt để lỗ hổng font token `--font-mono` và đồng bộ kiểu chữ giữa `/dashboard` và `/tracking`.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-001 | Bổ sung `--font-mono: "JetBrains Mono", ui-monospace, monospace;` vào `@theme inline` trong `src/styles.css` | ✅ | 2026-11-05 |
| TASK-002 | Cập nhật `TrackingHeaderCell` trong `src/routes/tracking.tsx` bổ sung `font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground` | ✅ | 2026-11-05 |
| TASK-003 | Rà soát và chuẩn hóa padding thẻ trạng thái Status Tag về `px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-xs` | ✅ | 2026-11-05 |

### Giai đoạn 2: Chuẩn hóa Sub-Header Wireframe Card Trên Cả 4 Routes

- GOAL-002: Thống nhất cấu trúc và visual layout của thanh Sub-header trên toàn bộ 4 trang chính của hệ thống.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-004 | Nâng cấp action bar của `src/routes/tracking.tsx` thành Wireframe Card (`h-11 rounded-xs border border-border bg-card/90 px-3 py-1.5 shadow-2xs`) và bổ sung huy hiệu `[1] LUÂN CHUYỂN QT` | ✅ | 2026-11-05 |
| TASK-005 | Chuẩn hóa thanh công cụ master list của `src/routes/orders.tsx` với huy hiệu `[3] ĐƠN ĐẶT HÀNG`, đưa các ô nhập về `h-8` chuẩn | ✅ | 2026-11-05 |
| TASK-006 | Bổ sung Sub-header Toolbar chuẩn Wireframe Card cho `src/routes/sync.tsx` với huy hiệu `[4] LIÊN KẾT GOOGLE SHEETS` kèm telemetry đồng bộ | ✅ | 2026-11-05 |

### Giai đoạn 3: Nâng cấp Industrial Sizing Cho Nút & Modal Cập Nhật Lô

- GOAL-003: Hiện đại hóa `LotUpdateButton` hỗ trợ icon mode và nâng cấp `LotUpdateDialog` phục vụ vận hành xưởng an toàn.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-007 | Bổ sung prop `variant?: 'icon' | 'button'` cho `LotUpdateButton` trong `src/components/lot-update-dialog.tsx` với chế độ icon `size-7 rounded-xs` | ✅ | 2026-11-05 |
| TASK-008 | Thêm nút Hủy bỏ trong `DialogFooter`, bổ sung `<DialogDescription className="sr-only">`, chuẩn hóa input/select về `h-8.5 font-mono text-xs`, thêm `rounded-xs` vào alert boxes | ✅ | 2026-11-05 |
| TASK-009 | Chuyển đổi gọi `<LotUpdateButton item={r} variant="icon" />` trong cột thao tác bảng của `src/routes/dashboard.tsx` và `src/routes/orders.tsx` | ✅ | 2026-11-05 |

### Giai đoạn 4: Kiểm thử Tự động & Nghiệm thu (Verification & Compliance)

- GOAL-004: Xây dựng bộ test case tự động kiểm soát tính tuân thủ Design System và xác thực toàn bộ hệ thống.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-010 | Tạo file kiểm thử mới `src/test/ui-ux-standardization.test.ts` kiểm tra: Khai báo token `--font-mono`, huy hiệu 4 route, prop `variant` của `LotUpdateButton`, nút Hủy bỏ và `DialogDescription` | ✅ | 2026-11-05 |
| TASK-011 | Chạy toàn bộ test suite `npm test` và biên dịch thử nghiệm `npm run build` | ✅ | 2026-11-05 |

---

## 3. Alternatives

- **ALT-001**: Giữ nguyên nút Cập nhật dạng chữ `[⚡ Cập nhật]` trong bảng `/dashboard` và `/orders`. *Lý do từ chối*: Chiếm quá nhiều diện tích bề ngang cột (~95px), làm bảng bị lệch tầm nhìn so với cột in phiếu công đoạn liền kề (`JobTicketButton` kích thước 28px).
- **ALT-002**: Không tạo Sub-header riêng cho trang `/sync`. *Lý do từ chối*: Tạo ra sự thiếu đồng nhất về trải nghiệm điều hướng khi chuyển đổi giữa 4 tab trên thanh điều hướng chính.

---

## 4. Dependencies

- **DEP-001**: Lucide React (`lucide-react`) cho các icon `Zap`, `X`, `ArrowRight`, `Search`, `Filter`.
- **DEP-002**: Radix UI Dialog primitives (`@radix-ui/react-dialog`) cho hộp thoại modal cập nhật tiến độ.
- **DEP-003**: Vitest (`vitest`) cho bộ kiểm thử tự động.

---

## 5. Files

- **FILE-001**: `src/styles.css` — Bổ sung `--font-mono: "JetBrains Mono", ui-monospace, monospace;` vào `@theme inline`.
- **FILE-002**: `src/routes/tracking.tsx` — Đồng bộ `TrackingHeaderCell` sang `font-mono text-[10px]` và chuẩn hóa Sub-header card `[1] LUÂN CHUYỂN QT`.
- **FILE-003**: `src/routes/dashboard.tsx` — Sử dụng `LotUpdateButton` với `variant="icon"` trong bảng các lô cần xử lý.
- **FILE-004**: `src/routes/orders.tsx` — Thêm huy hiệu `[3] ĐƠN ĐẶT HÀNG`, chuẩn hóa input `h-8`, sử dụng `LotUpdateButton` với `variant="icon"` trong bảng.
- **FILE-005**: `src/routes/sync.tsx` — Thêm Sub-header Wireframe Card với huy hiệu `[4] LIÊN KẾT GOOGLE SHEETS`.
- **FILE-006**: `src/components/lot-update-dialog.tsx` — Nâng cấp `variant="icon" | "button"`, nút Hủy bỏ, sizing `h-8.5 text-xs`, `DialogDescription` và `rounded-xs`.
- **FILE-007**: `src/test/ui-ux-standardization.test.ts` — Bộ kiểm thử tự động xác thực toàn bộ các quy chuẩn mới.

---

## 6. Testing

- **TEST-001**: Kiểm tra `src/styles.css` có chứa `--font-mono: "JetBrains Mono"`.
- **TEST-002**: Kiểm tra `src/routes/tracking.tsx` header bảng có chứa `font-mono text-[10px]`.
- **TEST-003**: Kiểm tra cả 4 route `tracking`, `dashboard`, `orders`, `sync` đều có huy hiệu định danh tương ứng `[1]`, `[2]`, `[3]`, `[4]`.
- **TEST-004**: Kiểm tra `LotUpdateButton` trong `lot-update-dialog.tsx` chấp nhận prop `variant` và render icon mode (`size-7`).
- **TEST-005**: Kiểm tra `LotUpdateDialog` có chứa nút Hủy bỏ (`variant="ghost"`) và `DialogDescription`.
- **TEST-006**: Toàn bộ 11 test suites pass (`npm test`).

---

## 7. Risks & Assumptions

- **RISK-001**: Thu nhỏ cỡ chữ header bảng từ 12px về 10px trên trang `/tracking` có thể khiến người dùng lớn tuổi khó đọc nếu màn hình có độ phân giải quá cao. *Biện pháp giảm thiểu*: Dùng `font-bold uppercase tracking-wider` tương phản cao để đảm bảo độ sắc nét vượt trội.
- **ASSUMPTION-001**: Mọi thiết bị đầu cuối đều hỗ trợ tốt font Google Font `JetBrains Mono` đã được import tại `__root.tsx`.

---

## 8. Related Specifications / Further Reading

- [Graphite Wireframe UI Specification (v2.2.0)](./DESIGN-SYSTEM.md)
- [Subagent Orchestration Protocol](./docs/SUBAGENT_GUIDE.md)
- [TanStack Start Routing Architecture](./AGENTS.md)
