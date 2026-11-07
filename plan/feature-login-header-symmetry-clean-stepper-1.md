---
goal: Đồng bộ đối xứng Header 2 mặt trước - sau, loại bỏ khối Stepper <ol> và cố định chiều cao cơ sở min-h-[440px] cho trang Login 3D Flip Card
version: 1.0
date_created: 2026-11-06
status: 'Completed'
tags:
  - feature
  - login
  - 3d-flip-card
  - visual-rhythm
  - header-symmetry
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch tối ưu hóa UX/UI cho trang đăng nhập [`src/routes/login.tsx`](../src/routes/login.tsx) giải quyết triệt để vấn đề giật chuyển động mắt (gaze shift) và lệch tọa độ giữa 2 mặt của thẻ lật 3D:
1. **Loại bỏ khối Stepper `<ol>`**: Cắt giảm khối tiến trình dư thừa, nhường không gian cho nội dung chính.
2. **Khớp tọa độ Header 2 mặt**: Mặt trước và Mặt sau sử dụng cấu trúc Header đồng nhất từ kích thước font `text-2xl`, khoảng cách đệm `p-7` đến dải Top Bar chuẩn cao 28px (`h-7`).
3. **Bố trí nút "← Đổi vị trí"**: Tích hợp gọn gàng ở góc trên bên phải của Top Bar Mặt sau, căn ngang hàng với huy hiệu vai trò.
4. **Chiều cao cơ sở `min-h-[440px]`**: Giữ khung thẻ ổn định tuyệt đối về kích thước khi xoay 180 độ.

---

## Tasks

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-001 | Xóa bỏ 2 khối `<ol>` tiến trình xác thực ở Mặt trước và Mặt sau trong `src/routes/login.tsx` | [x] | 2026-11-06 |
| TASK-002 | Chuẩn hóa Top Bar `h-7`, tiêu đề `h2` (`text-2xl`) và phụ đề `p` (`text-xs`) đồng bộ tọa độ giữa Mặt trước và Mặt sau | [x] | 2026-11-06 |
| TASK-003 | Đưa nút `← Đổi vị trí` lên Top Bar Mặt sau và bổ sung badge gợi ý `[Esc]` tại Footer | [x] | 2026-11-06 |
| TASK-004 | Thêm `min-h-[440px]` và `flex flex-col justify-between` cho cả 2 mặt thẻ trong `src/routes/login.tsx` | [x] | 2026-11-06 |
| TASK-005 | Cập nhật `src/test/login-3d-flip.test.ts` kiểm thử tính đối xứng, loại bỏ `<ol>`, và chiều cao tối thiểu | [x] | 2026-11-06 |
| TASK-006 | Chạy kiểm thử tự động `npm test` (16 test files pass) và kiểm tra đóng gói `npm run build` | [x] | 2026-11-06 |
