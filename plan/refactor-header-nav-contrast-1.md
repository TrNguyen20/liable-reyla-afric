# Kế Hoạch Giải Pháp: Tăng Cường Độ Tương Phản Tab Điều Hướng Header v2.4

> **Vấn đề người dùng phản ánh**: *"Tab Điều Hướng hơi bị chìm nhỉ, có cách nào làm đổi màu background của button để tăng tính tương phản đối với background của header hiện có không?"*

---

## 🔍 NGUYÊN NHÂN GỐC RỄ: HIỆN TƯỢNG "CARD-ON-CARD BLENDING"

1. **Trùng lặp màu nền (Figure-Ground Blending)**:
   - Header hiện tại có nền: `bg-card/95` (Trong Light Mode là màu trắng tinh khôi `oklch(1 0 0)`).
   - Nút Tab Active hiện tại cũng sử dụng: `bg-card` (Cũng là màu trắng tinh khôi!).
   - Rãnh trượt bao quanh chỉ là `bg-secondary/35` rất mờ nhạt.
   - **Hệ quả**: Nút màu trắng đặt trên nền Header màu trắng khiến mắt người dùng không nhận diện được đường biên của nút bấm, làm cho Tab điều hướng bị "chìm" và mất đi tính nổi bật của phân hệ đang chọn.

---

## 💡 ĐỀ XUẤT 3 PHƯƠNG ÁN ĐỔI MÀU NỀN TĂNG TƯƠNG PHẢN ĐỘT PHÁ

### 🏆 Phương Án 1 (Khuyên dùng cao nhất): Solid Dark Graphite (Đảo Nghịch Tương Phản Cực Đại)
* **Ý tưởng**: Sử dụng nguyên lý đảo màu tương phản (High-Contrast Color Inversion) của các giao diện công nghệ hàng đầu (Vercel, Apple Pro, Linear):
  - **Light Mode (Nền Header trắng)**:
    - Tab Active: Đổi sang **Nền Đen Than Graphite** (`bg-slate-900 text-white border border-slate-800 shadow-xs font-black`).
    - Icon: Màu xanh Emerald sáng (`text-emerald-400`).
    - Phím tắt `[1]..[4]`: Viền xám bạc nổi bật (`bg-slate-800 text-slate-300 border border-slate-700`).
    - Tab Inactive: `bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/70`.
  - **Dark Mode (Nền Header tối)**:
    - Tab Active: Đổi sang **Nền Trắng Titan** (`bg-slate-100 text-slate-950 border border-white shadow-xs font-black`), icon `text-primary`.
* **Ưu điểm**: Tạo điểm tựa thị giác cực mạnh (Visual Anchor), người dùng chỉ cần liếc mắt 0.1 giây là biết ngay đang ở phân hệ nào, hoàn toàn không bị chìm.

---

### 🟢 Phương Án 2: Emerald Andon Run (Nền Xanh Ngọc Lục Bảo Công Nghiệp)
* **Ý tưởng**: Sử dụng màu thương hiệu chính `--primary` (Xanh Andon Nhà máy) làm nền cho nút Active:
  - Tab Active: `bg-primary text-primary-foreground border border-primary/40 font-black shadow-xs`.
  - Icon: Chữ trắng tinh (`text-white`), phím tắt: `bg-primary-foreground/20 text-white border border-white/30`.
  - Tab Inactive: `bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground border border-border/70`.
* **Ưu điểm**: Rực rỡ, mang đậm bản sắc dây chuyền sản xuất Andon RUN.

---

### 🔲 Phương Án 3: Inset Dark Trench (Rãnh Chìm Tương Phản Cao)
* **Ý tưởng**: Không đổi màu nút Active mà đổi màu **Rãnh bao bọc (Container Rail)** thành màu xám đậm:
  - Khung bao bọc `nav`: Đổi từ `bg-secondary/35` thành `bg-slate-200/90 dark:bg-slate-950 border border-border/90 p-1`.
  - Tab Active: Giữ nền `bg-card` nhưng nhờ rãnh bao quanh tối màu hơn, nút lập tức nổi bật như một phím bấm vật lý 3D.
* **Ưu điểm**: Tinh tế, nhẹ nhàng, giữ màu sắc nguyên bản.
