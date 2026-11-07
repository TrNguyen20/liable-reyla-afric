---
goal: Tối ưu khoảng trống thẻ lật (Flip Card Spacing) và triệt tiêu rung giật vi mô (Visual Jitter Stabilization) cho trang Login
version: 1.0
date_created: 2026-11-06
status: 'Completed'
tags:
  - feature
  - login
  - 3d-flip-card
  - gpu-acceleration
  - performance
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch kỹ thuật tối ưu hóa khoảng trống thẻ lật và triệt tiêu rung giật vi mô theo kết quả chẩn đoán từ Chrome DevTools AI:
1. **Ý 1 (Flip Card Spacing)**: Giảm chiều cao `min-h-[440px]` xuống `min-h-[360px]`, thay thế `justify-between` bằng `justify-start` với `mt-auto` ở footer để nội dung không bị kéo dãn tạo khoảng rỗng 91px-147px.
2. **Ý 2 (Visual Jitter Stabilization)**: Neo cố định GPU Composite Layer với `translate3d(0,0,0)`, `will-change: transform`, loại bỏ `transition: all` trên `mes-card`, và kích hoạt `-webkit-font-smoothing: antialiased`.

---

## Tasks

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-001 | Thu hẹp phạm vi transition trên `mes-card` trong `src/styles.css` (loại bỏ `transition: all`) | [x] | 2026-11-06 |
| TASK-002 | Thêm `transform: translateZ(0)`, `translate3d(0,0,0)`, `will-change: transform` cho 3D card trong `src/styles.css` | [x] | 2026-11-06 |
| TASK-003 | Cập nhật `src/routes/login.tsx`: `min-h-[360px]`, `justify-start`, `mt-auto` cho Footer, và `transform-gpu` | [x] | 2026-11-06 |
| TASK-004 | Cập nhật kiểm thử tự động `src/test/login-3d-flip.test.ts` (TC-FLIP-01 và TC-FLIP-07) | [x] | 2026-11-06 |
| TASK-005 | Chạy kiểm thử `npm test` (16 test files pass) và kiểm tra đóng gói `npm run build` | [x] | 2026-11-06 |
