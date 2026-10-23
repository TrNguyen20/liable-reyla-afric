# Hướng Dẫn Cấu Hình Google Apps Script Đồng Bộ Hai Chiều (Bi-Directional Sync)

Tài liệu hướng dẫn cấu hình Webhook Google Apps Script để nhận dữ liệu cập nhật từ ứng dụng **DYNAMO VIETNAM QT - MES** và tự động ghi ngược trực tiếp vào bảng tính Google Sheets điều độ luân chuyển.

---

## 🎯 Luồng Hoạt Động (End-to-End Workflow)

```
[Kỹ sư / Vendor thao tác trên MES]
             │
             ▼
   [Cập nhật trạng thái lô: TrangThai, ngay_nhan_QT, do_cung]
             │
             ▼ (HTTP POST JSON payload)
   [Google Apps Script Webhook (/exec)]
             │
      ┌──────┴───────────────────────────┐
      ▼                                  ▼
[Cập nhật dòng khớp ID_Key]    [Ghi lịch sử vào sheet AUDIT_LOG]
(TrangThai, ngày nhận, độ cứng)  (Thời gian, Người sửa, Trạng thái cũ/mới)
```

---

## 📝 Các Bước Cài Đặt Chi Tiết (5 Bước Đơn Giản)

### Bước 1: Mở Trình Chỉnh Sửa Apps Script trên Google Sheets
1. Mở bảng tính Google Sheets điều độ luân chuyển QT của bạn.
2. Trên thanh menu trên cùng, chọn:
   **Tiện ích mở rộng (Extensions)** ➔ **Apps Script**.
3. Một tab trình duyệt mới sẽ mở ra với giao diện lập trình Google Apps Script.

---

### Bước 2: Dán Mã Nguồn `Code.gs`
1. Xóa toàn bộ nội dung mặc định trong tệp `Code.gs`.
2. Mở tệp [google-apps-script/Code.gs](file:///d:/NTT-2025/KAIZEN/m.Clone-github%20%28internet%29/liable-reyla-afric/google-apps-script/Code.gs), sao chép toàn bộ mã nguồn và dán vào trình soạn thảo `Code.gs` trên Google Apps Script.
3. Nhấn biểu tượng 💾 **Lưu dự án (Save project)** (hoặc phím tắt `Ctrl + S`).

---

### Bước 3: Chạy Thử Nghiệm & Cấp Quyền (Authorize)
1. Trên thanh công cụ, tại ô chọn hàm cần chạy, chọn hàm: **`testUpdateLot`**.
2. Nhấn nút ▶️ **Chạy (Run)**.
3. Google sẽ hiển thị hộp thoại yêu cầu cấp quyền:
   - Nhấn **Xem lại quyền (Review permissions)**.
   - Chọn tài khoản Google của bạn.
   - Nhấn **Nâng cao (Advanced)** ➔ Chọn **Đi tới [Tên dự án] (không an toàn) / Go to ... (unsafe)**.
   - Nhấn **Cho phép (Allow)**.
4. Xem bảng điều khiển thực thi (Execution log): Khi thấy thông báo `Kết quả Ping test: {"ok":true,...}` là script đã hoạt động hoàn hảo!

---

### Bước 4: Triển Khai Dưới Dạng Ứng Dụng Web (Deploy as Web App)
> [!IMPORTANT]
> Đây là bước then chốt để ứng dụng web MES có thể gửi yêu cầu cập nhật sang Google Sheets.

1. Ở góc trên cùng bên phải màn hình Apps Script, nhấn nút xanh **Triển khai (Deploy)** ➔ Chọn **Tùy chọn triển khai mới (New deployment)**.
2. Tại mục *Chọn loại (Select type)* hình bánh răng ⚙️, chọn: **Ứng dụng web (Web app)**.
3. Điền các thông số như sau:
   - **Mô tả (Description)**: `DYNAMO QT-MES Webhook v1`
   - **Thực thi dưới dạng (Execute as)**: **Tôi (`email của bạn`)** *(Me)*
   - **Ai có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)** *(Bắt buộc chọn Anyone để webhook nhận được POST request)*
4. Nhấn nút **Triển khai (Deploy)**.
5. Sao chép đường dẫn **URL ứng dụng web (Web App URL)**.
   *Định dạng URL mẫu:*
   ```text
   https://script.google.com/macros/s/AKfycbx.../exec
   ```

---

### Bước 5: Kết Nối Vào Hệ Thống DYNAMO MES
1. Mở ứng dụng web MES, truy cập trang:
   👉 **`/sync`** (Trung tâm kết nối & kiểm soát dữ liệu hai chiều).
2. Tại cột bên trái **"Cổng Kết Nối Hai Chiều"**, nhìn vào khối **"2. Ghi Ngược Tiến Độ (Outbound — Google Apps Script)"**.
3. Dán đường dẫn Web App URL bạn vừa sao chép ở Bước 4 vào ô nhập `POST`.
4. Nhấn nút **"Lưu Webhook"**.
5. Đèn trạng thái sẽ lập tức chuyển sang màu xanh: **`KẾT NỐI SẴN SÀNG`**.

---

## 🔍 Kiểm Tra Hoạt Động (Verification)

1. **Kiểm tra nhanh qua trình duyệt**:
   - Dán trực tiếp link Web App URL vào thanh địa chỉ trình duyệt và Enter.
   - Trình duyệt sẽ trả về JSON trạng thái:
     ```json
     {
       "ok": true,
       "service": "DYNAMO VIETNAM QT - MES Webhook Gateway",
       "status": "ONLINE",
       "targetSheetName": "DATA",
       "detectedColumns": ["id_key", "trangthai", "ngay_nhan_qt", "do_cung", ...]
     }
     ```
2. **Kiểm tra cập nhật thực tế từ MES**:
   - Vào trang **/tracking** trên web MES.
   - Chọn một lô hàng bất kỳ và bấm nút **"Cập nhật"** (hoặc bấm biểu tượng tia sét).
   - Đổi trạng thái (ví dụ từ *Đang tại Vendor* ➔ *Kiểm tra QC*), nhập độ cứng thực tế.
   - Bấm **"Lưu & ghi lên Sheet"**.
   - Mở Google Sheets của bạn: Dòng của lô hàng đó sẽ được cập nhật ngay lập tức và một dòng nhật ký mới sẽ tự động xuất hiện trong sheet **`AUDIT_LOG`**!

---

## 🛡️ Tính Năng Poka-Yoke & An Toàn Dữ Liệu Trong Script
- **Khóa đồng thời (LockService)**: Sử dụng cơ chế khóa script 15 giây nhằm chống xung đột (race-condition) khi nhiều bên cùng cập nhật dữ liệu.
- **Tự động nhận diện cột (Dynamic Column Mapping)**: Không phụ thuộc vào vị trí cột cố định; tự động tìm kiếm cột `ID_Key`, `TrangThai`, `ngay_nhan_QT`, `do_cung` bất kể cột nằm ở thứ tự nào.
- **Nhật ký tự động (AUDIT_LOG)**: Tự tạo sheet `AUDIT_LOG` nếu chưa có, lưu lại đầy đủ dấu vết: thời gian, người cập nhật, vendor, trạng thái trước/sau.
