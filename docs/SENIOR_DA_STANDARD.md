# KHUNG TIÊU CHUẨN SENIOR DATA ANALYST (DA) THỰC CHIẾN - DYNAMO MES (v2.0.0)
*Tài liệu chuẩn mực kỹ thuật và phân tích dữ liệu áp dụng bắt buộc cho toàn bộ dự án DYNAMO MES*

---

## 1. Mục Đích & Định Vị Chiến Lược
Tài liệu này xác lập tiêu chuẩn chất lượng cao nhất cho vai trò **Senior Data Analyst (DA) thực chiến quốc tế** khi tương tác, xây dựng, tối ưu hóa hoặc mở rộng các tính năng phân tích dữ liệu (Analytics, BI, Metrics, Dashboards, Data Pipelines) trong hệ thống DYNAMO MES.

Mọi tính năng phân tích số liệu trên toàn dự án từ nay về sau bắt buộc phải tuân thủ nghiêm ngặt **5 Trụ Cột Năng Lực**, **Bộ Chỉ Số Luyện Kim & Kỹ Thuật**, và **Quy Chuẩn Data Hygiene**.

---

## 2. 5 Trụ Cột Năng Lực Cốt Lõi (5 Pillars of Senior DA Excellence)

### Trụ cột 1: Tính Toàn Vẹn & Độ Mịn Dữ Liệu (Data Integrity & Granularity)
- Mọi phân tích bắt đầu bằng việc xác định rõ **Độ Mịn (Grain)**:
  - **Cấp độ Lô (`ID_Key` / `id_nhiet_qt`)**: 1 dòng = 1 lệnh nhiệt luyện cụ thể. Đây là đơn vị hạch toán cơ sở.
  - **Cấp độ Đơn hàng (`So_DatHang`)**: 1 đơn hàng bao gồm $N$ lô linh kiện PIN / INSERT / MOLD. Đánh giá rủi ro theo đơn hàng dựa trên điểm số `riskScore = 3 * overdueCount + 1.5 * soonCount`.
- **Chuẩn hóa Ngày Tháng Bằng Epoch Milliseconds**:
  - Tuyệt đối không so sánh ngày tháng dạng chuỗi ký tự (`string comparison`) khi lọc kỳ báo cáo hoặc tính độ trễ.
  - Luôn sử dụng timestamp số thực (`getTime()`) từ hàm `parseFlexibleDate(val)` để triệt tiêu lỗi chênh lệch định dạng `M/D/YYYY` vs `YYYY-MM-DD` và múi giờ.
- **Bảo Toàn Giá Trị Số Học**:
  - Không làm tròn các số liệu tài chính trước khi hoàn tất toàn bộ phép tổng hợp (`reduce`, `sum`).
  - Phân biệt triệt để giữa `null` (chưa có dữ liệu/chưa phát sinh đo đạc) và `0` (giá trị thực tế đo được bằng 0). Tỷ lệ OTD hoặc FPY khi mẫu số bằng 0 phải trả về `null` thay vì hiển thị `0%` hay `undefined%`.

### Trụ cột 2: Tương Quan Giữa Vận Hành & Tài Chính (Operations & Cost Correlation)
- Mọi chỉ số vận hành (Lead Time, OTD, WIP, Aging, Trễ hạn) phải được gắn liền với tác động tài chính:
  - **All-Time Cumulative Cost (Tổng chi phí toàn thời gian)**: Tổng chi phí gia công nhiệt luyện lũy kế để đánh giá quy mô toàn bộ dự án.
  - **Period Expenditure (Chi phí trong kỳ)**: Chi phí thực tế phát sinh trong kỳ báo cáo cụ thể (Hôm nay, 7 ngày, Tháng này, Tháng trước, Quý 1-4, Cả năm).
  - **Cost-at-Risk (Chi phí rủi ro đọng vốn)**: Tổng giá trị thành tiền của các lô hàng đang bị trễ hạn ($= \sum \text{thanh\_tien}_{\text{overdue}}$), phản ánh chính xác số vốn đang bị "giam" tại các đối tác.
  - **Unit Cost Efficiency (Đơn giá bình quân)**: Tính toán song song trên cả hai đơn vị sản lượng: $\text{VNĐ/Kg}$ (theo tổng khối lượng) và $\text{VNĐ/Pcs}$ (theo tổng số lượng chi tiết).

### Trụ cột 3: Mật Độ Thông Tin Cao & Tải Nhận Thức Thấp (High-Density, Low-Cognitive Load)
- Trực quan hóa dữ liệu theo chuẩn công nghiệp **Graphite Wireframe v2.6.0**:
  - Bo góc tối đa 2px (`rounded-xs` hoặc `rounded-sm`), viền mỏng 1px (`border-border`).
  - Tất cả số liệu, tỷ lệ %, ngày tháng, mã hàng bắt buộc dùng `font-mono tabular-nums`.
  - Phân tầng giao diện theo cấu trúc 5 tầng chuẩn:
    1. **Tầng 1**: Master Command Toolbar (Ghim sticky trên cùng, 10 period filters, bộ lọc đối tác và tiến độ).
    2. **Tầng 2**: Strategic Executive KPI Matrix (6 thẻ card độc lập, không trùng lặp số liệu).
    3. **Tầng 3**: Bivariate / Tri-Core Tactical Visualizer (Luân chuyển WIP Funnel, Kỹ thuật Lò & Luyện Kim, Tài chính & Rủi ro).
    4. **Tầng 4**: Deep-Dive Operational & Cost Matrix (Ma trận phân bổ theo Đối tác, Phân xưởng, Top đơn hàng rủi ro).
    5. **Tầng 5**: Bottleneck & Data Hygiene Center (Trung tâm điều hành điểm nghẽn với danh sách ưu tiên cao).

### Trụ cột 4: Bảo Mật Đa Tầng (Defense-in-Depth Data Governance)
- **Kiểm soát hiển thị tài chính (`canViewPricing`)**: Bắt buộc kiểm tra quyền người dùng. Nếu là Operator hoặc Vendor, hệ thống tự động ẩn hoặc thay thế giá trị tiền tệ bằng nhãn `CHỈ ĐỌC / NỘI BỘ` hoặc chuyển sang chỉ số sản lượng Kg/Pcs kèm icon ổ khóa.
- **Bảo mật danh tính đối tác (`formatVendorName` & `getVendorScope`)**: Khi tài khoản Vendor đăng nhập, áp dụng hàm chuẩn hóa và cô lập hoàn toàn phạm vi dữ liệu, ngăn chặn rò rỉ dữ liệu chéo giữa các nhà cung cấp nhiệt luyện.

### Trụ cột 5: Tính Hành Động Ngay Lập Tức (Actionable Insights)
- Không có số liệu nào là "số chết" (Dead Metrics).
- Mọi điểm nghẽn, lô trễ hạn, hoặc đơn hàng rủi ro phải có **Cầu nối chiến lược (Quick Strategic Bridges)**:
  - Nút chuyển tiếp tức thì sang tab `[1] /tracking` với tham số lọc tương ứng (`focus: 'overdue'`, `focus: 'open'`, `focus: 'due_soon'`).
  - Nút chuyển tiếp tức thì sang tab `[3] /orders` để rà soát danh sách linh kiện của đơn hàng rủi ro.
  - Tích hợp in phiếu lệnh (`JobTicketButton`) và cập nhật tiến độ lô (`LotUpdateButton`) ngay tại bảng điểm nghẽn.

---

## 3. Bộ Chỉ Số Luyện Kim & Kỹ Thuật Nhiệt Luyện (Metallurgical Metrics Catalog)

### 3.1. First Pass Yield (FPY / Tỷ Lệ Đạt QC Lần Đầu)
- **Công thức**:
  $$\text{FPY} = \frac{\text{Số lô đạt chuẩn QC lần đầu}}{\text{Tổng số lô hoàn tất có dữ liệu kiểm định}} \times 100\%$$
- **Tiêu chuẩn dữ liệu**:
  - Dựa trên trường `ncc_ket_qua_qc` ('PASS', 'OK', 'ĐẠT') hoặc đối chiếu độ cứng đo được nằm trong khoảng dung sai thiết kế `[min, max]`.
  - Mục tiêu công nghiệp: $\text{FPY} \ge 98.0\%$.

### 3.2. Sai Lệch Độ Cứng ($\Delta \text{HRC}$) & Phân Loại Kỹ Thuật
- **Công thức**:
  $$\Delta \text{HRC} = \text{HRC}_{\text{thực tế}} - \text{HRC}_{\text{mục tiêu}}$$
  Trong đó $\text{HRC}_{\text{mục tiêu}} = \frac{\text{HRC}_{\min} + \text{HRC}_{\max}}{2}$.
- **Phân loại 3 trạng thái**:
  1. `IN_RANGE` (Đạt chuẩn): $\text{HRC}_{\min} \le \text{HRC}_{\text{thực tế}} \le \text{HRC}_{\max}$.
  2. `UNDER_HARD` (Thiếu cứng): $\text{HRC}_{\text{thực tế}} < \text{HRC}_{\min}$ (Nguy cơ chi tiết bị biến dạng hoặc mòn nhanh).
  3. `OVER_HARD` (Dư cứng): $\text{HRC}_{\text{thực tế}} > \text{HRC}_{\max}$ (Nguy cơ chi tiết bị nứt gãy giòn trong quá trình dập/ép).

### 3.3. Turnaround Time (TAT / Lead Time Chu Kỳ Nhiệt Luyện)
- **Công thức**:
  $$\text{TAT}_{\text{ngày}} = \frac{\text{Timestamp}(\text{ngay\_nhan}) - \text{Timestamp}(\text{ngay\_gui\_qt})}{86.400.000}$$
- **Ứng dụng**:
  - Đo lường năng lực đáp ứng thực tế của từng đối tác nhiệt luyện (YAMAICHI vs PROVISION).
  - So sánh thời gian chu kỳ của từng nhóm mác thép (ví dụ SKD11 vs SKD61 vs S50C).

---

## 4. Tiêu Chuẩn Làm Sạch & Phân Loại Lỗi Dữ Liệu (Data Hygiene Protocol)

### 4.1. Phân Biệt Sự Cố Vận Hành vs Thiếu Sót Dữ Liệu Gốc
Trong hệ thống MES thực tế, cần phân định rạch ròi 2 nhóm cảnh báo:
1. **Sự Cố Vận Hành Thực Tế (Operational Bottlenecks)**:
   - Các lô **Quá Hạn Thực Tế (`isOverdue`)**: Có ngày cam kết chính thức (`ncc_ngay_tra_qt` hoặc `han_tra`), không ước tính (`han_tra_est = false`), và thời điểm hiện tại đã vượt quá ngày cam kết.
   - Các lô **Cận Hạn 48h (`isDueSoon`)**: Hạn cam kết nằm trong vòng 2 ngày tới.
   $\rightarrow$ Nhóm này phải được ưu tiên hàng đầu trên bảng điều hành và cảnh báo màu đỏ / hổ phách.
2. **Nợ Kỹ Thuật Dữ Liệu Gốc (Data Hygiene Debt)**:
   - Các lô **Thiếu Hạn Trả Cam Kết (`isMissingDue`)**: Chưa có ngày hẹn từ nhà cung cấp hoặc đang dùng hạn ước tính mặc định `+7 ngày` (`han_tra_est = true`).
   $\rightarrow$ Nhóm này phải được tách riêng thành **Thẻ Cảnh Báo Data Hygiene độc lập**, không được gộp vào danh sách vi phạm SLA làm sai lệch bức tranh vận hành.

---

## 5. Quy Chuẩn Trực Quan Hóa Wireframe SVG Thuần (Zero-Dependency Charting)
1. **Không dùng thư viện nặng ngoài**: Không cài đặt Recharts, Chart.js hay D3 vào bundle nhằm đảm bảo tốc độ phản hồi tức thì với tập dữ liệu 22.000+ dòng.
2. **SVG Thuần Chuẩn Kỹ Thuật**:
   - Sử dụng thẻ `<svg>` và các khối `<div>` tính toán tỷ lệ chính xác bằng TypeScript.
   - Viền sắc nét 1px `border-border`, màu sắc OKLCH Cool Graphite theo quy định trong `DESIGN-SYSTEM.md`.
3. **Hiệu ứng Tooltip Nhẹ**: Khi di chuột (`onMouseEnter` / `onMouseLeave`), hiển thị tooltip mini cố định chứa thông số định lượng chi tiết (Số lô, Khối lượng Kg, Tỷ lệ %) mà không làm giật khung hình.

---

## 6. Sổ Tay Hướng Dẫn Vận Hành Cho Chuyên Viên & AI Agent
Khi nhận yêu cầu phân tích số liệu mới, Agent hoặc Chuyên viên bắt buộc tuân thủ quy trình 4 bước:
1. **Xác Định Grain**: Làm rõ phân tích thực hiện trên cấp độ Lô (`ID_Key`) hay Đơn hàng (`So_DatHang`).
2. **Đối Chiếu Công Thức**: Sử dụng chính xác các hàm trong `src/lib/dynamo-rules.ts` và `src/lib/metallurgy-engine.ts`.
3. **Bảo Mật Quyền Truy Cập**: Luôn bọc các trường chi phí bằng `canViewPricing(role)`.
4. **Kiểm Thử Hồi Quy**: Chạy bộ test suite:
   - `npm test src/test/senior-da-dashboard.test.ts`
   - `npm test src/test/metallurgy-engine.test.ts`
   - `npm test src/test/design-system-compliance.test.ts`
