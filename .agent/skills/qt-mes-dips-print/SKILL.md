---
name: qt-mes-dips-print
description: >-
  Use this skill whenever working on print layouts, document tickets, manifests, paper sizes (A4 portrait/landscape),
  batch printing (30+ lots), or fixing table bottom whitespace / full-height flex layout in Dynamo MES.
  Triggers on phrases like "in ấn", "phiếu in", "job ticket", "manifest", "bảng kê", "DIPS", "in A4", "khoảng trắng đáy bảng",
  "sọc tím F12", "lỗi in dồn trang", or "printTicketElement".
---

# DIPS v1.0: Dynamo Industrial Print Standard & Zero-Gap Data Grid

## Tổng Quan

Skill này đóng gói toàn bộ quy chuẩn kỹ thuật về **In ấn Công nghiệp (DIPS v1.0)** và **Bố cục Bảng Biểu Co Giãn Kịch Đáy (Zero-Gap Full-Height Data Grid)** cho hệ thống **DYNAMO QT-MES**.

Mọi thay đổi liên quan đến phiếu gia công, tem nhãn, bảng kê giao nhận hoặc container dữ liệu `/tracking`, `/orders`, `/dashboard` đều bắt buộc tuân thủ tài liệu này.

---

## 🖨️ PHẦN 1: QUY CHUẨN IN ẤN CÔNG NGHIỆP (DIPS v1.0)

### 1. Phân Định 2 Khổ Giấy A4 (ISO 216)

| Tiêu chí | 📄 Chuẩn A4 Dọc (Job Tickets) | 📑 Chuẩn A4 Ngang (Manifest) |
| :--- | :--- | :--- |
| **Loại chứng từ** | Phiếu giao nhận & Lệnh gia công (lẻ & 30 lô) | Bảng kê tổng hợp luân chuyển nhiệt luyện 30 lô |
| **Chỉ thị `@page`** | `@page { size: A4 portrait; margin: 8mm 10mm; }` | `@page { size: A4 landscape; margin: 8mm 10mm; }` |
| **Kích thước vật lý** | $210\text{mm} \times 297\text{mm}$ (Tỷ lệ ISO 1:1.414) | $297\text{mm} \times 210\text{mm}$ (Tỷ lệ ISO 1.414:1) |
| **Ràng buộc phân trang** | `break-after: page; page-break-after: always;` | `tr { break-inside: avoid; }` chống xé dòng |
| **Khử trang trắng thừa** | `.printable-job-ticket:last-child { break-after: auto; }` | Tự động phân trang theo chiều cao thực |
| **Kích thước cố định** | `min-height: calc(297mm - 16mm); max-height: calc(297mm - 16mm);` | `w-full max-w-5xl aspect-[297/210]` |

### 2. Quy Tắc DOM Sanitizer Bắt Buộc (Khắc Phục Lỗi Chromium)

> [!CAUTION]
> **LỖI KINH ĐIỂN CỦA CHROMIUM (CHROME/EDGE)**:
> Nếu bất kỳ thẻ cha nào trên cây DOM clone có `overflow: auto | hidden | scroll`, `display: flex`, hoặc `transform: scale`, Chromium sẽ **vô hiệu hóa hoàn toàn các thuộc tính ngắt trang**, ép toàn bộ 30 trang in vào **1 sheet of paper** duy nhất và cắt vụn phần còn lại!

Hàm in `printTicketElement` trong `src/components/job-ticket.tsx` bắt buộc phải áp dụng quy trình tẩy sạch:

```typescript
// 1. Tẩy sạch inline styles và class gây kẹt ngắt trang trên phần tử gốc
clone.style.transform = "none";
clone.style.overflow = "visible";
clone.style.overflowY = "visible";
clone.style.overflowX = "visible";
clone.style.maxHeight = "none";
clone.style.height = "auto";
clone.style.display = "block";
clone.classList.remove("overflow-y-auto", "overflow-hidden", "flex-1");

// 2. Duyệt đệ quy con và trả về display: block & overflow: visible
clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
  if (el.style) {
    if (el.style.transform) el.style.transform = "none";
    if (el.style.overflow) el.style.overflow = "visible";
    if (el.style.overflowY) el.style.overflowY = "visible";
  }
  if (el.classList.contains("job-ticket-canvas-container")) {
    el.classList.remove("overflow-y-auto", "flex", "items-start", "justify-center");
    el.style.display = "block";
    el.style.overflow = "visible";
  }
});
```

### 3. Tách Biệt Tham Số In Theo Chế Độ
Trong `BatchJobTicketModal`:
- **Chế độ Bảng kê (`mode === "manifest"`)**:
  - Gắn ref trực tiếp: `manifestPrintRef`.
  - Gọi: `printTicketElement(manifestPrintRef.current, 'Bang_ke_tong_hop', 1, 'landscape')`.
- **Chế độ Tập phiếu A4 (`mode === "tickets"`)**:
  - Gắn ref trực tiếp: `ticketsPrintRef` (chỉ chứa danh sách các thẻ ticket, không bọc trong container cuộn).
  - Gọi: `printTicketElement(ticketsPrintRef.current, 'Tap_phieu_A4_30_lo', 1, 'portrait')`.

---

## 📐 PHẦN 2: BỐ CỤC DATA GRID CO GIÃN KỊCH ĐÁY (ZERO-GAP)

### 1. Nguyên Tắc Cốt Lõi
- **Tuyệt đối KHÔNG gán cứng `maxHeight: calc(100vh - Xpx)`** bên trong container cha đã có `flex-1 flex flex-col`.
- Gán `maxHeight` cứng sẽ cắt ngắn bảng quá sớm khi cửa sổ trình duyệt thay đổi hoặc khi footer bị ẩn, để lại một dải khoảng trắng lãng phí ở đáy (Chrome DevTools hiển thị sọc tím `Unused Flex Space`).

### 2. Chuẩn Cấu Trúc CSS Flexbox Đạt Chuẩn
```tsx
{/* Thẻ bọc ngoài (Card Container): flex-1 flex flex-col */}
<div className="isolate flex-1 min-h-[400px] md:min-h-0 flex flex-col overflow-hidden rounded-xs border border-border bg-card shadow-2xs">
  
  {/* Thẻ con chứa bảng: BẮT BUỘC có min-h-0 và KHÔNG dùng inline maxHeight */}
  <div
    ref={tableContainerRef}
    className="flex-1 min-h-0 overflow-auto relative"
  >
    <table className="w-full border-collapse font-mono text-xs">
      {/* ... thead, tbody ... */}
    </table>
  </div>

  {/* Thanh phân trang: shrink-0 để luôn bám sát đáy dưới cùng */}
  <div className="shrink-0 flex items-center justify-between border-t border-border bg-secondary/35 px-3.5 py-2 text-[11px]">
    {/* ... Controls phân trang ... */}
  </div>
</div>
```

---

## 🧪 PHẦN 3: KIỂM THỬ TỰ ĐỘNG (TDD ENFORCEMENT)

Mọi chỉnh sửa liên quan đến In ấn và Bố cục Bảng phải vượt qua bộ test suite:
```powershell
npm test -- src/test/dips-print-standard.test.ts src/test/job-ticket-ergonomics.test.ts src/test/design-system-compliance.test.ts
```

Các test case trọng yếu cần kiểm tra:
1. `TC-DIPS-01`: `printTicketElement` nhận `orientation: 'portrait' | 'landscape'` và gán `@page { size: A4 ${orientation}; margin: 8mm 10mm; }`.
2. `TC-DIPS-02`: DOM Sanitizer gỡ bỏ triệt để `overflow`, `max-height`, `transform`, `flex`.
3. `TC-DIPS-03`: Chiều cao A4 cố định và ngắt trang `break-after: page; last-child { break-after: auto }`.
4. `TC-DIPS-04`: Manifest gọi `landscape`, Tickets gọi `portrait`.
5. `TC-DIPS-06`: Preview hiển thị khung giấy A4 trực quan (`aspect-[210/297]` hoặc `aspect-[297/210]`).
