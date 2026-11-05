# Kế Hoạch Thiết Kế Header v2.4: Minimalist Linear Precision

> **Định hướng đã chọn**: **Minimalist Linear Precision**  
> *Đặc trưng*: Kính mờ siêu mỏng (`backdrop-blur-xl`), tab trượt êm dịu không đổ bóng, tông màu graphite tĩnh lặng thanh thoát theo phong cách Linear/Vercel cao cấp, tuân thủ tuyệt đối chuẩn Graphite Wireframe UI (bo góc tối thiểu 2px, font-mono tabular-nums).

---

## 📐 CHI TIẾT ĐẶC TẢ KIẾN TRÚC GIAO DIỆN

### 1. Khung Header Kính Mờ Siêu Mỏng (Ultra-Thin Frosted Glass)
- **Chiều cao chuẩn**: `h-[48px]` (giữ trọn vẹn không gian dọc cho bảng điều độ).
- **Vật liệu nền**: `bg-card/75 dark:bg-[#0d1117]/80 backdrop-blur-xl border-b border-border/60`.
- **Hiệu ứng thị giác**: Trong suốt nhẹ nhàng, hòa quyện với nội dung bên dưới khi cuộn trang mà không gây phân tán ánh nhìn.

### 2. Hệ Thống Tab Điều Hướng Tuyệt Đối Tối Giản (Linear-Style Nav Rail)
- **Cấu trúc tab**:
  - Không viền bao bọc thô cứng, không đổ bóng (`shadow-none`).
  - **Tab Active**:
    - Chữ tương phản cao: `text-foreground font-bold text-[12px]`.
    - Icon: `text-primary shrink-0 transition-colors`.
    - **Chỉ báo đáy phẳng vi mô (Flat Bottom Indicator Beam)**: Một đường kẻ thanh mảnh 2px ở sát mép đáy tab (`after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-primary after:rounded-xs`).
  - **Tab Inactive**:
    - Chữ xám lạnh: `text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-150`.
  - **Phím tắt `[1]..[4]`**:
    - Tinh xảo như ký tự phím cơ khí: `font-mono text-[9px] text-muted-foreground/75 bg-muted/25 px-1 py-0.2 rounded-xs border border-border/40`.

### 3. Cụm Brand & Trạng Thái Yên Lặng (Quiet Brand Presence)
- **Logo Dynamo Vietnam**: Cân đối `h-7.5 w-auto object-contain`.
- **Huy hiệu MES**: `text-[9px] font-mono tracking-widest text-muted-foreground/80 border border-border/50 bg-muted/20 px-1.5 py-0.2 rounded-xs`.
- **Andon Heartbeat Indicator**: Một chấm LED xanh ngọc lục bảo tĩnh (`fx-run-dot size-1.5`) đặt cạnh đồng hồ LedClock tạo cảm giác tin cậy, chuẩn xác.

### 4. Cụm Tiện Ích Tam Ngữ & Profile Tinh Xảo (Precision Controls)
- **Trilingual Micro-Slider `[VI] [EN] [JA]`**:
  - Thiết kế phẳng hoàn toàn: Khung viền mỏng `border border-border/60 bg-muted/20 p-0.5 rounded-xs`.
  - Nút Active: `bg-card text-foreground font-bold border border-border/70 shadow-2xs`.
  - Nút Inactive: `text-muted-foreground hover:text-foreground`.
- **Đồng hồ LedClock**:
  - Tinh giản, font mono tabular-nums sắc nét, font chữ nhỏ nhắn thanh lịch `text-[11px] font-mono`.
- **Operator Capsule (User Profile)**:
  - Thiết kế phẳng tối giản: `h-7.5 border border-border/60 bg-muted/20 px-2 rounded-xs`.
  - Badge quyền hạn `text-[8px] font-mono font-bold tracking-wider`.
- **Theme & Logout**:
  - Icon mỏng `size-3.5`, nút bấm phẳng `h-7.5 w-7.5 rounded-xs hover:bg-muted/40 text-muted-foreground hover:text-foreground`.
