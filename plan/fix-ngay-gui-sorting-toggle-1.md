---
goal: Fix Ngày Gửi (ngay_gui_QT) Header Sorting Sequential Toggle Loop
version: 1.0.0
date_created: 2026-11-05
status: Completed
tags: [tracking, sorting, toggle, header, fix, graphite-wireframe]
---

# Kế Hoạch Triển Khai: Khắc Phục Lỗi Sắp Xếp Tuần Tự (Sorting Toggle) Cột Ngày Gửi

> **Mục tiêu**: Điều tra và sửa dứt điểm lỗi click sắp xếp trên tiêu đề cột **NGÀY GỬI** (`ngay_gui_QT`) trong `src/routes/tracking.tsx` bị dừng/kẹt cứng khi ở trạng thái mũi tên đi xuống (`desc`), không thể tiếp tục bấm đảo chiều tuần tự.

---

## 🔍 Điều Tra Nguyên Nhân Gốc Rễ (Root Cause Analysis)

Khi click vào tiêu đề của bất kỳ cột nào trên bảng điều độ, hàm `handleTitleClick` trong component `HeaderFilterCell` sẽ gọi hàm điều phối `handleToggleSort(field: SortField)`.

### Điểm nghẽn logic (Deadlock):
1. **Trạng thái ban đầu**: Bảng điều độ khởi tạo với `sortCol = 'ngay_gui_QT'` và `sortDir = 'desc'` (Mũi tên đi xuống: Ngày gửi mới nhất).
2. **Khi người dùng click vào tiêu đề "NGÀY GỬI"**:
   - `sortCol !== field` (`'ngay_gui_QT' !== 'ngay_gui_QT'`) ➔ `false`.
   - `sortDir === 'asc'` (`'desc' === 'asc'`) ➔ `false`.
   - Rơi vào nhánh `else`: gán lại `setSortCol('ngay_gui_QT'); setSortDir('desc');`!
   - Trạng thái hoàn toàn không đổi!
3. **Khi click tiếp lần 2, 3...**: Logic rơi liên tục vào nhánh `else`, khiến nút bấm bị kẹt cứng ở mũi tên đi xuống, không bao giờ lật được sang mũi tên đi lên (`asc`).

---

## 💡 Giải Pháp Kỹ Thuật

Tách riêng nhánh `field === 'ngay_gui_QT'` trong khối `else`:
- Đối với `ngay_gui_QT`: `desc` ➔ `asc` ➔ `desc` ➔ `asc` (đảo chiều tuần tự liên tục).
- Đối với các cột khác: `asc` ➔ `desc` ➔ `reset về ngay_gui_QT desc` (chu trình 3 bước chuẩn).
