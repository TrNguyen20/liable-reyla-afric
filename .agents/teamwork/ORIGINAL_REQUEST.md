# Original User Request

## Initial Request — 2026-11-06T01:55:23Z

Sử dụng đội ngũ đa tác nhân phối hợp chuyên biệt để chuyển đổi toàn bộ các trang chuẩn Tam Ngữ [VI] [EN] [JA] trên mọi vị trí (ngoại trừ các từ đặc trưng/đặc thù khái niệm thì cần giữ nguyên từ ngữ ấy), lập kế hoạch triển khai triệt để và lâu dài đúng theo nguyên tắc đang có nhằm vận hành chính thức (production) trên hệ thống DYNAMO MES.

Integrity mode: development

## Requirements

### R1. Chuyển đổi toàn diện chuẩn Tam Ngữ [VI] [EN] [JA] trên toàn bộ hệ thống
Chuyển đổi toàn bộ các trang chính thức hiện hữu (`/tracking`, `/dashboard`, `/orders`, `/sync`, `/login`) và toàn bộ khung vỏ hệ thống (Dynamo Shell, Navigation Header, Dialogs, Biên bản bàn giao ca A4) sang cơ chế Tam Ngữ đồng bộ [VI] [EN] [JA], hỗ trợ chuyển đổi ngôn ngữ mượt mà theo trạng thái người dùng.

### R2. Bảo toàn nguyên vẹn các từ đặc thù khái niệm và quy chuẩn hệ thống
Giữ nguyên không dịch các từ đặc trưng/đặc thù khái niệm: các mã trạng thái nghiệp vụ chuẩn (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`), mã định danh hệ thống (Order No, Lot ID), ký hiệu kỹ thuật nhiệt luyện (QT, tôi dầu, ram...), và tên riêng/mã nhà cung cấp theo đúng tài liệu `DESIGN-SYSTEM.md`. Giữ vững quy chuẩn giao diện tối giản 2px góc (`rounded-xs`), lưới dữ liệu số monospaced (`font-mono tabular-nums`) và độ tương phản cao Graphite Wireframe.

### R3. Kế hoạch triển khai triệt để, lâu dài và phối hợp đa tác nhân
Lập và thực thi kế hoạch triển khai triệt để, lâu dài theo cấu trúc i18n hiện có (`src/i18n/locales/{vi,en,ja}/*.json`), phân bổ hợp lý theo các namespace chức năng. Tổ chức điều phối đa tác nhân chuyên biệt (bóc tách văn bản, chuyển ngữ thuật ngữ kỹ thuật nhiệt luyện, tái cấu trúc component, viết kiểm thử tự động) đảm bảo khả năng bảo trì và mở rộng về sau.

## Acceptance Criteria

### Translation Coverage & Integrity
- [ ] 100% nhãn hiển thị, tiêu đề, nút bấm, thông điệp phản hồi, tooltip và văn bản trên các route `/tracking`, `/dashboard`, `/orders`, `/sync`, `/login` và khung vỏ Dynamo Shell được tải từ hệ thống i18n mà không còn văn bản tiếng Việt bị hardcode.
- [ ] Toàn bộ các mã trạng thái nghiệp vụ (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`), mã định danh kỹ thuật (Order No, Lot ID) và thuật ngữ chuyên ngành nhiệt luyện được giữ nguyên vẹn ở cả 3 ngôn ngữ VI, EN, JA.
- [ ] Tất cả các file locale (`vi`, `en`, `ja`) trong `src/i18n/locales/` có cấu trúc khóa (key structure) đồng bộ 100%, không tồn tại khóa bị thiếu (missing key), không trả về fallback ngoài ý muốn.

### Automated Verification & Compliance
- [ ] Bổ sung automated test suite chuyên biệt kiểm tra tính toàn vẹn của i18n: xác thực 100% khóa ngôn ngữ tồn tại đủ trên cả 3 locale VI/EN/JA và xác thực việc bảo toàn danh mục từ đặc thù.
- [ ] Lệnh kiểm thử tự động `npm test` chạy thành công (exit code 0), vượt qua tất cả các test suite hiện hữu gồm `src/test/design-system-compliance.test.ts`, `src/test/i18n-and-header.test.ts` và `src/test/app-routing.test.tsx` mà không có bất kỳ lỗi nào.
