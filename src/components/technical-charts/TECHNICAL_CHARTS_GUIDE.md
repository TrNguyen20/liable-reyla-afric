# TIÊU CHUẨN XÂY DỰNG BIỂU ĐỒ KỸ THUẬT DYNAMO MES (TECHNICAL CHARTS ARCHITECTURE)
**Phiên bản:** v1.0.0 (Release 2026-11)  
**Phạm vi áp dụng:** Toàn bộ các module hiển thị biểu đồ nhiệt luyện, biểu đồ cơ lý tính, giản đồ pha và đồ thị SCADA/PLC trong hệ thống Dynamo MES.

---

## 1. Triết lý Thiết kế: "Parametric SVG First" (Không dùng thư viện nặng)
Đối với các biểu đồ kỹ thuật chuyên ngành cơ khí chính xác:
1. **Zero Bundle Bloat**: Tuyệt đối không cài thêm các thư viện charting nặng nề (ECharts, Chart.js, Recharts) chỉ để vẽ các biểu đồ công nghệ cố định dạng form Nhật.
2. **Vector SVG Thuần túy**: Dùng HTML5 `<svg>` kết hợp React Component để đảm bảo:
   - Siêu nhẹ (< 3KB cho mỗi biểu đồ).
   - Sắc nét tuyệt đối khi phóng to trên màn hình Retina / 4K hoặc xuất lệnh in PDF khổ giấy A4/A5 (`job-ticket.tsx`).
   - Tốc độ render cực đại trong các bảng dữ liệu ảo hóa 22.000+ dòng.
3. **Graphite Wireframe UI Compliance**:
   - Viền khung 1px (`#0f172a` / `border-border`).
   - Toàn bộ số liệu nhiệt độ, thời gian, áp suất bắt buộc dùng `fontFamily="monospace"` và `tabular-nums`.

---

## 2. Cấu trúc Thư mục Độc lập (`src/components/technical-charts/`)

Hệ thống biểu đồ kỹ thuật được quy hoạch tại thư mục độc lập:
```
src/components/technical-charts/
├── index.ts                                   # Public Export Barrel
├── TECHNICAL_CHARTS_GUIDE.md                  # Hướng dẫn & Tiêu chuẩn phát triển (File này)
│
├── heat-treatment-cycle/                      # Biểu đồ Chu trình Nhiệt luyện (Q - T1 - T2 - T3)
│   ├── heat-cycle-types.ts                    # Interfaces, Data Model & Parser
│   └── heat-treatment-cycle.tsx               # Component SVG Parametric tự co giãn động
│
├── metallurgy-phase/                          # (Dự kiến) Giản đồ pha C-Fe, CCT, TTT
└── mechanical-properties/                     # (Dự kiến) Biểu đồ Độ cứng HRC - Độ dai va đập Charpy
```

---

## 3. Cách sử dụng Biểu đồ Chu trình Nhiệt luyện (`HeatTreatmentCycle`)

### Cách 1: Nạp chuỗi tốc ký (Shorthand String) - Cực kỳ tiện lợi cho Database/Sheets
Chỉ cần lưu 1 chuỗi ngắn trong Google Sheets hoặc database:
```tsx
import { HeatTreatmentCycle } from '@/components/technical-charts';

// Khớp chuẩn hình ảnh chứng nhận Yamaichi:
<HeatTreatmentCycle shorthand="Q: 1020°C / 2H | T1: 615°C / 4.4H | T2: 540°C / 5H" />

// Hoặc định dạng số gọn:
<HeatTreatmentCycle shorthand="1020/2 | 540/5 | 593/5" />
```

### Cách 2: Nạp Object tham số (Structured Params)
```tsx
import { HeatTreatmentCycle } from '@/components/technical-charts';

<HeatTreatmentCycle
  steps={[
    { stage: 'Q', temp: 1020, time: 2 },
    { stage: 'T1', temp: 540, time: 5 },
    { stage: 'T2', temp: 593, time: 5 },
    { stage: 'T3' } // Khung mờ dự phòng
  ]}
  width={560}
  height={90}
/>
```

---

## 4. Quy tắc Mở rộng cho Biểu đồ mới trong tương lai
Khi kỹ sư muốn bổ sung 1 biểu đồ kỹ thuật mới (ví dụ biểu đồ đo độ cứng 5 điểm, phân bố mác thép):
1. **Tạo thư mục con riêng** trong `src/components/technical-charts/<chart-name>/`.
2. **Tách riêng Data Model** (`types.ts`) và **Component View** (`component.tsx`).
3. **Cung cấp hàm Parser** từ chuỗi đơn giản để người dùng trên Google Sheets có thể gõ text và tự sinh biểu đồ.
4. **Bổ sung Unit Test (TDD)** trong `src/test/technical-charts.test.ts`.
