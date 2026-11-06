# Dispatch Log

## 2026-11-06T01:56:30Z
- Sender: d9754fb4-6ebe-4628-b68e-283a2abe0dc6 (parent / sentinel)
- Priority: MESSAGE_PRIORITY_HIGH
- Task: Chuyển đổi toàn bộ các trang chuẩn Tam Ngữ [VI] [EN] [JA] trên mọi vị trí (ngoại trừ các từ đặc trưng/đặc thù khái niệm thì cần giữ nguyên từ ngữ ấy), lập kế hoạch triển khai triệt để và lâu dài đúng theo nguyên tắc đang có nhằm vận hành chính thức (production) trên hệ thống DYNAMO MES.

Requirements:
- R1. Chuyển đổi toàn diện chuẩn Tam Ngữ [VI] [EN] [JA] trên toàn bộ hệ thống (`/tracking`, `/dashboard`, `/orders`, `/sync`, `/login`, Dynamo Shell, Navigation Header, Dialogs, Biên bản bàn giao ca A4).
- R2. Bảo toàn nguyên vẹn các từ đặc thù khái niệm và quy chuẩn hệ thống (`WAIT`, `TRANSIT`, `STOCKED`, `PASS`, `FAIL`, Order No, Lot ID, thuật ngữ QT/tôi dầu/ram, tên riêng/mã nhà cung cấp per `DESIGN-SYSTEM.md`, 2px corners, monospaced tabular numbers).
- R3. Kế hoạch triển khai triệt để, lâu dài và phối hợp đa tác nhân (`src/i18n/locales/{vi,en,ja}/*.json`, namespace hợp lý, automated test suite, npm test passing 100%).
