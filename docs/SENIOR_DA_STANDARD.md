# KHUNG TIÊU CHUẨN SENIOR DATA ANALYST (DA) THỰC CHIẾN - DYNAMO MES
*Tài liệu chuẩn mực kỹ thuật và phân tích dữ liệu áp dụng lâu dài cho toàn bộ dự án DYNAMO MES*

---

## 1. Mục Đích & Định Vị
Tài liệu này xác lập tiêu chuẩn chất lượng cao nhất cho vị trí Senior Data Analyst (DA) thực chiến quốc tế khi tương tác, xây dựng, tối ưu hóa hoặc mở rộng các tính năng phân tích dữ liệu (Analytics, BI, Metrics, Dashboards) trong hệ thống DYNAMO MES.

Mọi tính năng phân tích số liệu từ nay về sau phải tuân thủ nghiêm ngặt 5 trụ cột và các công thức chuẩn hóa dưới đây.

---

## 2. 5 Trụ Cột Năng Lực Cốt Lõi (5 Pillars of Senior DA Excellence)

### Trụ cột 1: Tính Toàn Vẹn & Độ Mịn Dữ Liệu (Data Integrity & Granularity)
- Mọi phân tích bắt đầu bằng việc xác định rõ **Độ Mịn (Grain)**:
  - Cấp độ Lô (`ID_Key`): 1 dòng = 1 lệnh nhiệt luyện.
  - Cấp độ Đơn hàng (`So_DatHang`): 1 đơn hàng gồm $N$ lô linh kiện PIN/INSERT/MOLD.
- Tuyệt đối không làm tròn số liệu tài chính trước khi hoàn tất phép tổng hợp.
- Phân biệt rõ ràng giữa `null` (chưa có dữ liệu/chưa phát sinh) và `0` (giá trị bằng 0).
- Xử lý ngày tháng luôn dựa trên Epoch Milliseconds (`getTime()`) để bảo đảm tính chuẩn xác khi so sánh qua các múi giờ.

### Trụ cột 2: Tương Quan Giữa Vận Hành & Tài Chính (Operations & Cost Correlation)
- Mọi chỉ số vận hành (Lead Time, OTD, WIP, Aging, Trễ hạn) phải được gắn liền với tác động tài chính:
  - **All-Time Cumulative Cost**: Tổng chi phí gia công nhiệt luyện lũy kế toàn thời gian để đánh giá quy mô dự án.
  - **Period Expenditure**: Chi phí thực tế phát sinh trong kỳ báo cáo cụ thể (Tháng, Quý, Năm).
  - **Cost-at-Risk**: Tổng giá trị thành tiền của các lô hàng đang bị trễ hạn, thể hiện chính xác số vốn đang bị "giam" tại các đối tác.
  - **Unit Cost**: Đơn giá gia công trung bình trên đơn vị sản lượng (VNĐ/Kg và VNĐ/Pcs).

### Trụ cột 3: Mật Độ Thông Tin Cao & Tải Nhận Thức Thấp (High-Density, Low-Cognitive Load)
- Trực quan hóa dữ liệu theo chuẩn công nghiệp **Graphite Wireframe v2.5.0**:
  - Bo góc tối đa 2px (`rounded-xs` hoặc `rounded-sm`), viền mỏng 1px (`border-border`).
  - Tất cả số liệu, tỷ lệ, ngày tháng, mã hàng bắt buộc dùng `font-mono tabular-nums`.
  - Phân tầng giao diện rõ ràng (Phân cấp 5 tầng: Toolbar $\rightarrow$ Executive KPI $\rightarrow$ Bivariate Visualizer $\rightarrow$ Deep-Dive Matrix $\rightarrow$ Action Center).

### Trụ cột 4: Bảo Mật Đa Tầng (Defense-in-Depth Data Governance)
- **Kiểm soát hiển thị tài chính**: Bắt buộc kiểm tra quyền `canViewPricing(role)`. Nếu người dùng là Operator hoặc Vendor, hệ thống tự động ẩn hoặc chuyển đổi sang chỉ số Sản Lượng (Kg/Pcs) kèm biểu tượng ổ khóa bảo mật.
- **Bảo mật đối tác**: Khi tài khoản Vendor đăng nhập, áp dụng hàm `formatVendorName(v, role, locale)` và cô lập phạm vi dữ liệu theo `getVendorScope(role)`.

### Trụ cột 5: Tính Hành Động Ngay Lập Tức (Actionable Insights)
- Không có số liệu nào là "số chết" (Dead Metrics).
- Khi phát hiện một điểm nghẽn (Bottleneck, Overdue, Cost-at-Risk cao), giao diện phải cung cấp cầu nối hành động ngay (Quick Bridge) chuyển tiếp sang tab `[1] /tracking` hoặc `[3] /orders` với bộ lọc tương ứng được kích hoạt sẵn.

---

## 3. Hệ Thống Bộ Lọc Kỳ Chuẩn Doanh Nghiệp (10 Period Filters)
1. `all`: Toàn bộ thời gian từ trước đến nay.
2. `today`: Hôm nay (24 giờ gần nhất).
3. `week`: 7 ngày qua.
4. `this`: Tháng hiện tại.
5. `prev`: Tháng trước.
6. `q1`: Quý 1 (01/01 - 31/03).
7. `q2`: Quý 2 (01/04 - 30/06).
8. `q3`: Quý 3 (01/07 - 30/09).
9. `q4`: Quý 4 (01/10 - 31/12).
10. `year`: Cả năm hiện tại (01/01 - 31/12).
