# Kế Hoạch Triển Khai: Chuyển Đổi Màu Primary Toàn Hệ Thống Sang Đen Than Graphite & Trắng Titan

> **Mục tiêu**: Chuyển đổi mã token `--primary` của toàn bộ ứng dụng sang **Đen Than Graphite** (trên nền trắng - Light Mode) và **Trắng Titan** (trên nền đen - Dark Mode) theo phong cách High-Contrast Monolith (Vercel / Apple Pro / Linear), đồng thời **bảo toàn màu xanh Emerald Andon chuyên biệt cho trạng thái sản xuất (`--run`, `--success`, `fx-run-dot`)**.

---

## 🎨 MA TRẬN MÃ MÀU THIẾT KẾ MỚI (COLOR TOKEN MATRIX)

| Token CSS | Light Mode (Nền Trắng) | Dark Mode (Nền Đen) | Mục đích sử dụng |
| :--- | :--- | :--- | :--- |
| **`--primary`** | `oklch(0.18 0.02 250)` *(Đen Than Graphite)* | `oklch(0.96 0.005 250)` *(Trắng Titan)* | Nút bấm chính, thẻ điều hướng active, viền focus, checkbox checked |
| **`--primary-foreground`**| `oklch(0.98 0 0)` *(Trắng tinh)* | `oklch(0.15 0.02 250)` *(Đen Than)* | Màu chữ trên nền primary |
| **`--ring`** | `oklch(0.18 0.02 250)` | `oklch(0.96 0.005 250)` | Viền focus bàn phím |
| **`--sidebar-primary`** | `oklch(0.18 0.02 250)` | `oklch(0.96 0.005 250)` | Sidebar và Navigation chính |
| **`--run`** | `oklch(0.585 0.166 149.3)` *(Emerald Green)* | `oklch(0.68 0.16 150)` *(Emerald Green)* | **Bảo toàn 100%**: Đèn Andon máy đang chạy, trạng thái Pass |
| **`--success`** | `oklch(0.585 0.166 149.3)` *(Emerald Green)* | `oklch(0.68 0.16 150)` *(Emerald Green)* | Thông báo thành công, chỉ số đạt chuẩn |
