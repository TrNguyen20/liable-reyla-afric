---
goal: Nâng cấp Progressive Disclosure cho trang Login với hiệu ứng 3D Flip Card 180 độ
version: 1.0
date_created: 2026-11-06
status: 'Completed'
tags:
  - feature
  - login
  - 3d-flip-card
  - progressive-disclosure
  - animation
  - accessibility
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch tái cấu trúc giao diện đăng nhập (`src/routes/login.tsx`) áp dụng mô thức **Progressive Disclosure** (tiết lộ lũy tiến) kết hợp hiệu ứng **3D Flip Card (180 độ)** công nghệ cao theo phong cách Graphite Wireframe UI (v2.2.0).

Giao diện mới chia tách mạch lạc thành 2 mặt thẻ:
1. **Mặt trước (Front Face - Bước 1 · Vị trí công tác)**: Tập trung vào 4 vai trò vận hành (`Admin`, `Leader`, `Viewer`, `Partner`) sử dụng đồng nhất tone màu `primary` tối giản chuẩn công nghiệp (độ mờ `bg-primary/40` khi chưa chọn, sáng `bg-primary fx-run-dot` khi active). Khi nhấp chọn, nút kích hoạt micro-delay 150ms phản hồi xúc giác rồi lật 3D 180 độ sang mặt sau.
2. **Mặt sau (Back Face - Bước 2 · Mã truy cập Access Code)**: Hiển thị thanh tiêu đề kèm nút `← Quay lại chọn vị trí` (hoặc phím `Escape`), huy hiệu xác nhận vai trò, tự động focus vào ô nhập mã truy cập ID do Admin cấp, bàn phím số cảm ứng Kiosk Mode, nút bấm xác thực và ghi chú bảo mật công nghiệp.

---

## 1. Requirements & Constraints

### Yêu cầu chức năng & Giao diện (Functional & UI Requirements)
- **REQ-001**: Thiết kế khung Card đăng nhập dạng 3D Flip Card với `perspective: 1200px`, `transform-style: preserve-3d` và thời gian lật mượt 600ms `cubic-bezier(0.4, 0, 0.2, 1)`.
- **REQ-002**: Mặt trước (Front Face) chỉ hiển thị phần nhận diện hệ thống, Stepper ở trạng thái Bước 1, và 4 nút chọn vị trí công tác có đèn LED trạng thái.
- **REQ-003**: Khi bấm vào bất kỳ vị trí nào trong 4 nút, hệ thống lưu `position`, tạo độ trễ phản hồi xúc giác 150ms, sau đó kích hoạt lật thẻ sang mặt sau.
- **REQ-004**: Mặt sau (Back Face) có nút bấm `← Quay lại chọn vị trí` (hoặc `← Đổi vị trí`) cho phép lật ngược thẻ 180 độ về lại Bước 1 bất kỳ lúc nào.
- **REQ-005**: Mặt sau hiển thị huy hiệu xác nhận vai trò đã chọn (kèm đèn LED màu tương ứng và tên vị trí) để người dùng nắm rõ ngữ cảnh đăng nhập.
- **REQ-006**: Tự động kích hoạt focus (`inputRef.current?.focus()`) vào ô nhập mã truy cập sau khi hiệu ứng lật thẻ hoàn tất.
- **REQ-007**: Tích hợp bàn phím số cảm ứng Kiosk Mode (Touchscreen Virtual Numpad), bộ đếm lùi khóa an toàn (Lockout timer) và thông báo lỗi trên mặt sau.
- **REQ-008**: Quản lý chiều cao thích ứng linh hoạt (Adaptive Auto-Height): Mặt đang active giữ thuộc tính `relative`, mặt còn lại chuyển sang `absolute inset-0 pointer-events-none` và `aria-hidden="true"` để chống tràn layout và đảm bảo an toàn trợ năng (Accessibility).

### Ràng buộc kỹ thuật (Constraints)
- **CON-001**: Tuân thủ chuẩn Graphite Wireframe UI v2.2.0: Bo góc `rounded-xs` (2px), bóng đổ vi mô `shadow-xs`/`shadow-2xs`, cấm bo góc lớn `rounded-xl`.
- **CON-002**: Tuyệt đối không làm gián đoạn luồng xác thực server `verifyCode`, cơ chế khóa thử sai 5 lần (`AttemptsError`, `LockedError`), và cookie phiên làm việc.
- **CON-003**: Giữ vững tính trọn vẹn của lịch sử git trên Lovable (không force-push, rebase).

### Hướng dẫn & Mẫu thiết kế (Guidelines & Patterns)
- **GUD-001**: Progressive Disclosure Pattern: Giảm tải nhận thức (Cognitive Load) bằng cách chỉ đưa thông tin cần thiết tại thời điểm người dùng cần ra quyết định.
- **PAT-001**: 3D Flip Card with Asymmetric Face Heights: Kỹ thuật hoán đổi `relative`/`absolute` giữa 2 mặt thẻ trong CSS 3D Transform đảm bảo mượt mà không nhảy giật chiều cao khung hình.

---

## 2. Implementation Steps

### Giai đoạn 1: Thiết lập CSS 3D Transform & Quản lý State

- GOAL-001: Bổ sung utility classes 3D và trạng thái lật thẻ `isFlipped` trong component Login.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-001 | Bổ sung các lớp CSS 3D flip card (`.flip-card-container`, `.flip-card-inner`, `.flip-card-front`, `.flip-card-back`) vào `src/styles.css` | [x] | 2026-11-06 |
| TASK-002 | Khai báo state `isFlipped` và hàm `handleSelectPosition(pos)` kết hợp `setTimeout` 150ms để kích hoạt lật thẻ trong `src/routes/login.tsx` | [x] | 2026-11-06 |

### Giai đoạn 2: Tái cấu trúc Mặt trước & Mặt sau Card

- GOAL-002: Phân tách giao diện Bước 1 (Mặt trước) và Bước 2 (Mặt sau) thành 2 mặt thẻ hoàn chỉnh.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-003 | Xây dựng Mặt trước (Front Face): Header đăng nhập, Stepper Bước 1, Fieldset 4 vị trí công tác sử dụng tone màu primary đồng nhất | [x] | 2026-11-06 |
| TASK-004 | Xây dựng Mặt sau (Back Face): Thanh header có nút '← Đổi vị trí' & badge vai trò, ô nhập mã truy cập ID auto-focus, bàn phím Kiosk, nút Submit và ghi chú hỗ trợ | [x] | 2026-11-06 |
| TASK-005 | Đồng bộ Stepper và phím tắt Escape / nút quay lại để lật về Bước 1 mượt mà | [x] | 2026-11-06 |

### Giai đoạn 3: Kiểm thử Tự động & Biên dịch

- GOAL-003: Xây dựng bộ test case xác thực hiệu năng 3D Flip Card và kiểm tra không phát sinh lỗi hồi quy.

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-006 | Bổ sung test suite `src/test/login-3d-flip.test.ts` kiểm tra cấu trúc 3D Flip Card, trạng thái `isFlipped`, nút quay lại và auto-focus | [x] | 2026-11-06 |
| TASK-007 | Chạy toàn bộ test suites `npm test` (16 test files pass) và kiểm tra biên dịch SSR `npm run build` thành công | [x] | 2026-11-06 |

---

## 3. Alternatives

- **ALT-001**: Sử dụng hiệu ứng trượt ngang Carousel (Slide & Fade). *Lý do từ chối*: Người dùng ưu tiên phong cách lật thẻ 3D 180 độ tạo cảm giác thẻ bài công nghệ độc đáo và chuyên nghiệp.
- **ALT-002**: Đặt Stepper ở ngoài Card lật. *Lý do từ chối*: Người dùng chọn tích hợp toàn bộ Stepper và nội dung vào trong khối lật để tạo cảm giác đồng nhất 100% cho toàn bộ thẻ.

---

## 4. Dependencies

- **DEP-001**: `@/lib/dynamo-auth`: `verifyCode`, `positionMatchesRole`, `LockedError`, `AttemptsError`.
- **DEP-002**: `lucide-react`: `ArrowLeft`, `ArrowRight`, `Lock`, `KeyRound`, `ShieldCheck`, `Eye`, `EyeOff`, `Smartphone`, `Delete`.

---

## 5. Files

- **FILE-001**: `src/styles.css` — Bổ sung các quy tắc 3D Transform (`perspective`, `preserve-3d`, `backface-visibility`).
- **FILE-002**: `src/routes/login.tsx` — Tái cấu trúc form đăng nhập thành 3D Flip Card 2 mặt.
- **FILE-003**: `src/test/login-3d-flip.test.ts` — Bộ kiểm thử tự động cho tính năng 3D Flip Card.

---

## 6. Testing

- **TEST-001**: Kiểm tra file `src/styles.css` có chứa các định nghĩa CSS 3D flip card.
- **TEST-002**: Kiểm tra `src/routes/login.tsx` có chứa cấu trúc 2 mặt thẻ `flip-card-front` và `flip-card-back`.
- **TEST-003**: Kiểm tra nút quay lại `← Đổi vị trí` hiện diện trên mặt sau và điều khiển lật ngược lại Bước 1.
- **TEST-004**: Kiểm tra toàn bộ 12 test suites (60+ tests) pass 100% qua `npm test`.

---

## 7. Risks & Assumptions

- **RISK-001**: Trình duyệt di động cũ không hỗ trợ tốt `preserve-3d`. *Biện pháp giảm thiểu*: Thêm tiền tố `-webkit-backface-visibility: hidden` và fallback hiển thị an toàn.
- **ASSUMPTION-001**: Độ trễ 150ms trước khi lật đủ để người dùng cảm nhận hiệu ứng bấm nút mà không làm giảm tốc độ thao tác.

---

## 8. Related Specifications / Further Reading

- [Graphite Wireframe UI Specification (v2.2.0)](./DESIGN-SYSTEM.md)
- [Login Interlock & Security Lockout](./src/lib/dynamo-auth.ts)
