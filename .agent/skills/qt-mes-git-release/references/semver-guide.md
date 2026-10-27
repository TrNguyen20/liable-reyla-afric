# Hướng Dẫn Quy Chuẩn Semantic Versioning (SemVer 2.0.0) & Conventional Commits

## 1. Cấu Trúc Semantic Versioning: `vMAJOR.MINOR.PATCH`

Ví dụ: `v1.0.0`, `v1.1.0`, `v1.1.1`

- **MAJOR (Số đầu tiên - vX.0.0)**:
  - Tăng khi có những thay đổi lớn phá vỡ tính tương thích ngược (Breaking Changes).
  - Hoặc khi phát hành phiên bản Production đầu tiên hoàn chỉnh (`v1.0.0`).
- **MINOR (Số ở giữa - v1.X.0)**:
  - Tăng khi bổ sung chức năng mới nhưng vẫn tương thích ngược (Backwards-compatible features).
  - Ví dụ: Bổ sung trang Telemetry mới, tích hợp thêm Webhook Vercel.
- **PATCH (Số cuối cùng - v1.0.X)**:
  - Tăng khi sửa lỗi nhỏ (Bug fixes), tối ưu hiệu năng hoặc sửa đổi tài liệu/giao diện nhỏ mà không thêm API mới.

---

## 2. Quy Chuẩn Conventional Commits

Định dạng: `<type>(<scope>): <mô tả ngắn>`

- `feat`: Tính năng mới (tương ứng tăng MINOR).
- `fix`: Sửa lỗi (tương ứng tăng PATCH).
- `docs`: Cập nhật tài liệu, hướng dẫn, kế hoạch plan.
- `chore`: Cập nhật cấu hình build, package dependencies, gitignore.
- `refactor`: Tái cấu trúc mã nguồn mà không thay đổi chức năng.
- `test`: Bổ sung hoặc chỉnh sửa các bộ kiểm thử unit test.
