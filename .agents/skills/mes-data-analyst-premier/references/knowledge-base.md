# DYNAMO MES Senior Data Analyst Knowledge Base
*Cập nhật tự động theo phương pháp luận obra/superpowers*

## 1. Bản Đồ Schema Dữ Liệu & Độ Mịn (Data Grain)
- **Primary Grain**: 1 row = 1 Lô nhiệt luyện (`ID_Key`). Khóa duy nhất đại diện cho một lệnh gia công nhiệt luyện.
- **Secondary Grain**: 1 Đơn hàng (`So_DatHang`) bao gồm nhiều lô linh kiện (`ID_Key`).
- **Date Invariants**:
  - `ngay_tao`: Ngày tạo lệnh sản xuất nội bộ.
  - `ngay_gui_QT`: Ngày gửi hàng đi nhiệt luyện (Mốc thời gian xác định kỳ báo cáo tài chính).
  - `han_tra`: Hạn trả hàng cam kết từ Vendor.
  - `ngay_nhan`: Ngày hàng thực tế về xưởng và nhập kho hoàn tất.
  - Luôn parse ngày qua Epoch numeric milliseconds (`parseFlexibleDate(val)?.getTime() ?? 0`) để sắp xếp và so sánh chính xác.

## 2. Công Thức Nghiệp Vụ & Chỉ Số Bất Biến (Business Metric Formulas)
- **All-Time Cumulative Cost (Tổng chi phí nhiệt luyện toàn thời gian)**:
  $$\text{AllTimeCost} = \sum_{i \in \text{AllLots}} i.\text{thanh\_tien}$$
- **Period Cost (Chi phí phát sinh trong kỳ)**:
  $$\text{PeriodCost} = \sum_{i \in \text{PeriodLots}} i.\text{thanh\_tien}$$
- **Cost-at-Risk (Tài chính rủi ro đọng vốn do hàng trễ)**:
  $$\text{CostAtRisk} = \sum_{i \in \text{OverdueLots}} i.\text{thanh\_tien}$$
- **On-Time Delivery Rate (Tỷ lệ giao hàng đúng hạn - OTD)**:
  $$\text{OTD} = \frac{\text{Số lô hoàn tất đúng hạn (ngay\_nhan} \le \text{han\_tra)}}{\text{Tổng số lô hoàn tất có đủ hạn trả}}$$
- **Aging Tiers (Phân tầng thời gian trôi qua của lô đang mở)**:
  - `< 24h`: Lô mới trong hạn an toàn.
  - `24h - 48h`: Cận hạn hoàn trả trong 48h tới.
  - `3 - 7 ngày`: Đã trễ hạn từ 3 đến 7 ngày.
  - `> 7 ngày`: Trễ hạn nghiêm trọng, nguy cơ gián đoạn dây chuyền lắp ráp.

## 3. Quy Chuẩn Phân Quyền & Bảo Mật Số Liệu (Defense-in-Depth Security)
- **Chỉ số Tài chính (`thanh_tien`, `don_gia`)**:
  - BẮT BUỘC kiểm tra `canViewPricing(role)`.
  - Nếu `false`: Tuyệt đối không hiển thị số tiền VNĐ. Tự động chuyển đổi sang Sản Lượng Rủi Ro (Kg & Pcs) kèm icon ổ khóa bảo mật.
- **Bảo mật đối tác Vendor (`cty_QT`)**:
  - Khi hiển thị cho role Vendor hoặc Operator, dùng `formatVendorName(v, role, locale)`.
  - Vendor chỉ được xem dữ liệu của chính mình theo `getVendorScope(role)`.

## 4. Quy Chuẩn Giao Diện (Graphite Wireframe UI Specification)
- Bo góc tối đa 2px: `rounded-xs` (`rounded-[2px]`). Cấm `rounded-lg`, `rounded-full` (chỉ dùng cho micro LED dot).
- Font số liệu phân tích: Bắt buộc `font-mono tabular-nums`.
- Màu sắc công nghiệp: Neutral Cool Graphite, viền `border-border`, chỉ báo LED `fx-run-dot`.
