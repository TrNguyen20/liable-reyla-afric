---
goal: Refactor Tracking Default Column Widths, Lock 4 Fixed Columns & Hide Workshop Column
version: 1.0.0
date_created: 2026-11-05
status: Completed
tags: [tracking, table, column-widths, fixed-columns, hide-workshop, telemetry]
---

# Kế Hoạch Triển Khai: Tái Cấu Trúc Kích Thước Mặc Định Bảng Tracking & Tinh Gọn Hệ Thống

> **Mục tiêu**: Cập nhật bộ thông số kích thước mặc định (`DEFAULT_COL_WIDTHS`) và cữ co hẹp tối thiểu (`MIN_COL_WIDTHS`) cho toàn bộ bảng điều độ `src/routes/tracking.tsx`, khóa cứng 4 cột không co giãn, ẩn cột Phân xưởng (`phong_sx`) và loại bỏ nút "Làm mới dữ liệu tức thì" trùng lặp trên thanh Telemetry.

---

## 📐 Bảng Ma Trận Kích Thước Cột Mới

| STT | Cột hiển thị | Mã trường (`ColumnKey`) | Kích thước ban đầu (`DEFAULT`) | Cữ tối thiểu (`MIN`) | Cơ chế co giãn & Ghim vị trí |
| :---: | :--- | :--- | :---: | :---: | :--- |
| **1** | **[x] Chọn** | `checkbox` | **40 px** | **40 px** | 📌 Ghim trái (`left: 0`), **Cố định** (bỏ thanh kéo resizer) |
| **2** | **MÃ LÔ** | `ID_Key` | **130 px** | **130 px** | 📌 Ghim trái (`left: 40px`), **Cố định** (bỏ thanh kéo resizer) |
| **3** | **ĐƠN HÀNG** | `So_DatHang` | **110 px** | **110 px** | 📌 Cuộn giữa, **Cố định** (bỏ thanh kéo resizer) |
| **4** | **XƯỞNG** | `phong_sx` | *hidden* | *hidden* | ❌ **Ẩn hoàn toàn khỏi bảng** (Đã có bộ lọc Xưởng trên Toolbar) |
| **5** | **MÃ HÀNG** | `ma_hang` | **110 px** | **100 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **6** | **VẬT LIỆU** | `vat_lieu` | **100 px** | **90 px** | ↔ Cuộn giữa (Fluid - Buffer 10px, chữ không bị che) |
| **7** | **ĐỘ CỨNG** | `do_cung` | **100 px** | **90 px** | ↔ Cuộn giữa (Fluid - Buffer 10px, chữ không bị che) |
| **8** | **SL** | `so_luong` | **70 px** | **60 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **9** | **KG** | `kg_Lot` | **70 px** | **60 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **10** | **ĐỐI TÁC** | `cty_QT` | **125 px** | **115 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **11** | **LOGISTICS** | `TrangThai` | **110 px** | **100 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **12** | **QC** | `qc` | **100 px** | **90 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **13** | **NGÀY GỬI** | `ngay_gui_QT` | **115 px** | **105 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **14** | **HẠN TRẢ** | `han_tra` | **115 px** | **105 px** | ↔ Cuộn giữa (Fluid - Buffer 10px) |
| **15** | **GHI CHÚ** | `ghi_chu` | **180 px** | **160 px** | ↔ Cuộn giữa (Fluid - Buffer 20px) |
| **16** | **PHIẾU A4** | `ticket` | **58 px** | **58 px** | 📌 Ghim phải (`right: 0`), **Cố định** (bỏ thanh kéo resizer) |
