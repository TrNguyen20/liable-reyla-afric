# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — EXPLORER_ROUTES
## Khảo Sát Các Tuyến Đường Chính Thức [1]..[4] & Thành Phần Báo Cáo In Ấn (Trilingual i18n)

- **Người thực hiện**: `teamwork_explorer` (`explorer_routes`)
- **Tập tin chi tiết đi kèm**: `.agents/teamwork/explorer_routes/survey.md`
- **Thời gian lập**: 2026-11-06T02:08:30Z
- **Loại bàn giao**: **Hard Handoff** (Nhiệm vụ khảo sát hoàn tất 100%)

---

### 1. OBSERVATION (Quan sát thực tế từ mã nguồn)

1. **Thực trạng sử dụng i18n trên 4 route chính**:
   - Quét tìm kiếm `useTranslation` qua lệnh `git grep -n "useTranslation" src/routes/` trả về rỗng (`No results found`).
   - Cả 4 route chính:
     - `src/routes/tracking.tsx` (4.191 dòng)
     - `src/routes/dashboard.tsx` (1.112 dòng)
     - `src/routes/orders.tsx` (674 dòng)
     - `src/routes/sync.tsx` (672 dòng)
     đều hoàn toàn chưa gọi `useTranslation()` và đang chứa 100% chuỗi tiếng Việt hardcoded.
2. **Thực trạng các component in ấn & báo cáo**:
   - `src/components/job-ticket.tsx` (1.029 dòng): Chứa `SingleA4TicketContent` (Phiếu giao nhận & Lệnh gia công ngoài A4), `SinglePalletTagContent` (Tem pallet 100x150mm), `BatchJobTicketModal` (Bảng kê tổng hợp dispatch manifest) đều hardcode tiếng Việt ở mọi tiêu đề, mục I-IV, 4 chữ ký pháp lý.
   - `src/routes/dashboard.tsx` (Dòng 810-1112): Chứa `ShiftHandoverModal` (Biên bản bàn giao ca sản xuất A4 - SOP-MES-08) với toàn bộ nhãn, tiêu đề, 4 ô thống kê và 4 chữ ký bàn giao đều hardcode tiếng Việt.
   - `src/components/lot-update-dialog.tsx` (145 dòng): `LotUpdateButton` chứa form cập nhật tiến độ, tiêu đề, lỗi, xác nhận, nhãn trạng thái và toast notifications hoàn toàn hardcode.
3. **Thực trạng thư mục từ điển `src/i18n/locales/`**:
   - `src/i18n/locales/vi/tracking.json` (38 dòng, chỉ có nhãn cột và 2 action).
   - `src/i18n/locales/vi/dashboard.json` (8 dòng, chỉ có 5 key cơ bản).
   - `src/i18n/locales/vi/orders.json` (7 dòng, chỉ có 4 key).
   - `src/i18n/locales/vi/sync.json` (9 dòng, chỉ có 6 key).
   - Cả 3 ngôn ngữ `vi`, `en`, `ja` hiện đang đồng bộ về cấu trúc sơ bộ nhưng thiếu tới ~85% số khóa cần thiết cho toàn bộ giao diện của 4 routes.
4. **Ràng buộc kiểm thử tĩnh (Static Test Interlocks)**:
   - File `src/test/ui-ux-standardization.test.ts` (dòng 25-35):
     ```typescript
     expect(tracking).toContain('[1] LUÂN CHUYỂN');
     expect(dashboard).toContain('[2] TỔNG QUAN LUÂN CHUYỂN');
     expect(orders).toContain('[3] ĐƠN ĐẶT HÀNG');
     expect(sync).toContain('[4] ĐỒNG BỘ');
     ```
   - Dòng 64: `expect(content).toContain('Hủy bỏ');` trên `lot-update-dialog.tsx`.
   - Dòng 97 & 106: `expect(dashboard).toContain('Làm mới');`, `expect(orders).toContain('Làm mới');`.
   - File `src/test/dashboard-enhancements.test.ts` (dòng 87-95):
     ```typescript
     expect(dashboardSrc).toContain('Hôm nay (Today)');
     expect(dashboardSrc).toContain('7 ngày qua (7D)');
     expect(dashboardSrc).toContain('[KPI-05]');
     expect(dashboardSrc).toContain('CHỈ ĐỌC / NỘI BỘ');
     expect(dashboardSrc).toContain('Khóa');
     ```
   - File `src/test/orders-optimization.test.ts` (dòng 18-52):
     ```typescript
     expect(code).toContain('TỔNG GIÁ TRỊ');
     expect(code).toContain('TỔNG SỐ LƯỢNG');
     expect(code).toContain('THAO TÁC');
     expect(code).toContain('In phiếu cả đơn');
     expect(code).toContain('Danh sách đơn');
     expect(code).toContain('Tiến độ:');
     expect(code).toContain('lô hoàn tất');
     ```

---

### 2. LOGIC CHAIN (Chuỗi suy luận từ quan sát đến kết luận)

1. Từ **Observation 1 & 2**: Vì 4 route chính và 3 component báo cáo in ấn chiếm >85% bề mặt giao tiếp người dùng của DYNAMO MES nhưng hoàn toàn chưa dùng i18n, nên việc chuyển đổi Tam Ngữ [VI] [EN] [JA] bắt buộc phải can thiệp refactor trực tiếp vào 4 file route và các sub-component liên quan.
2. Từ **Observation 3**: Do các file từ điển trong `src/i18n/locales/{vi,en,ja}` mới chỉ có các khóa khung xương tối thiểu, việc thiết kế bổ sung các namespace `tracking`, `dashboard`, `orders`, `sync` phải được mở rộng đầy đủ theo cấu trúc phân tầng (`toolbar`, `columns`, `bulk`, `drawer`, `kpis`, `pipeline`, `alerts`, `actions`, `shiftHandover`, `masterList`, `detail`, `gateway`, `staging`).
3. Từ **Observation 4**: Một số bài kiểm thử Vitest hiện hữu đọc trực tiếp file mã nguồn thông qua `fs.readFileSync` và kiểm tra sự xuất hiện của các chuỗi tiếng Việt cụ thể (VD: `'[1] LUÂN CHUYỂN'`, `'Làm mới'`, `'Hủy bỏ'`, `'TỔNG GIÁ TRỊ'`).
   -> **Suy luận**: Nếu các chuỗi này bị thay thế hoàn toàn bằng biểu thức `{t('...')}` mà không xử lý đồng bộ, các bài kiểm thử `npm test` sẽ bị fail do không tìm thấy chuỗi verbatim trong file code. Do đó, kế hoạch triển khai của Lead Orchestrator phải bao gồm:
   - Hoặc cập nhật các bài test đọc mã nguồn để chấp nhận các key i18n tương ứng.
   - Hoặc kiểm tra render thông qua component test.
   - Và đảm bảo các giá trị trong từ điển `vi/*.json` phải khớp 100% với chuỗi nguyên bản trong test.
4. Từ phân tích thuật ngữ chuyên ngành:
   - Các mã trạng thái `WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, `PENDING`, `INSPECT` là tiêu chuẩn Andon quốc tế và yêu cầu của `DESIGN-SYSTEM.md`, phải giữ nguyên trên cả 3 ngôn ngữ.
   - Các mã kỹ thuật `ID_Key`, `So_DatHang`, `ma_hang`, mác thép (`DAC`, `SKD61`, `NAK80`), đơn vị `HRC`, kích thước `Ø...` là thông số kỹ thuật sản xuất, không được phép dịch.

---

### 3. CAVEATS (Vấn đề cần lưu ý & Giả định)

1. **Nút kích hoạt Biên bản giao ca A4 trên Dashboard**:
   - Trong `src/routes/dashboard.tsx`, component `ShiftHandoverModal` đã được cài đặt hoàn chỉnh và có `const [handoverOpen, setHandoverOpen] = useState(false);` (dòng 197). Tuy nhiên, trên thanh Toolbar hiện tại chưa có nút bấm gọi `setHandoverOpen(true)`. Đội ngũ phát triển nên bổ sung nút bấm (VD: icon FileText hoặc Printer "Biên bản ca A4") trên Toolbar của Dashboard để người vận hành có thể mở hộp thoại này.
2. **Static Regex Testing vs Dynamic i18n**:
   - Cần thống nhất với Lead Orchestrator và QA Agent: Các bài test `ui-ux-standardization.test.ts`, `dashboard-enhancements.test.ts`, `orders-optimization.test.ts` cần được phê duyệt cập nhật để hỗ trợ kiểm tra song song cả chuỗi i18n lẫn render thực tế.
3. **Phạm vi khảo sát**:
   - Khảo sát tập trung 100% vào 4 route nghiệp vụ chính (`/tracking`, `/dashboard`, `/orders`, `/sync`) và các component in ấn báo cáo kỹ thuật. Route `/login` và khung vỏ App Shell đã được khảo sát độc lập bởi các agent chuyên trách khác.

---

### 4. CONCLUSION (Kết luận & Đánh giá)

1. Khảo sát đã bóc tách thành công toàn bộ ~200 chuỗi văn bản trên 4 tuyến đường chính thức và 4 biểu mẫu báo cáo in ấn kỹ thuật (Phiếu giao nhận A4, Tem Pallet, Bảng kê Manifest, Biên bản giao ca A4).
2. Toàn bộ danh mục Invariant Domain Terms đã được lập bảng chi tiết tại Mục 5 của `survey.md`, sẵn sàng làm kim chỉ nam bảo vệ hệ thống không bị dịch sai lệch.
3. Ma trận từ điển đề xuất trong `survey.md` (Mục 7) đã cấu trúc hóa toàn bộ các namespace `tracking.json`, `dashboard.json`, `orders.json`, `sync.json` theo chuẩn phân tầng, sẵn sàng cho `translator_engine` chuyển ngữ sang English và Japanese.
4. Báo cáo chi tiết đầy đủ đã được lưu tại `.agents/teamwork/explorer_routes/survey.md`.

---

### 5. VERIFICATION METHOD (Phương pháp kiểm chứng độc lập)

1. **Kiểm tra file báo cáo khảo sát**:
   - Đọc file: `.agents/teamwork/explorer_routes/survey.md`.
   - Xác thực: Kiểm tra các đoạn mã trích dẫn, số dòng và cấu trúc JSON đã khớp với mã nguồn thực tế.
2. **Kiểm tra trạng thái test suite hiện tại**:
   - Chạy lệnh:
     ```powershell
     npm test
     ```
   - Kết quả mong đợi: Toàn bộ 12 test files (66 tests) đều PASS 100% (exit code 0).
3. **Kiểm tra sự vắng mặt của i18n trên 4 route**:
   - Chạy lệnh:
     ```powershell
     git grep "useTranslation" src/routes/
     ```
   - Kết quả mong đợi: Không tìm thấy kết quả nào trong `src/routes/` (ngoại trừ test).
