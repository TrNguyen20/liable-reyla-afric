---
goal: Hướng dẫn chi tiết từng bước triển khai (Deploy) hệ thống DYNAMO MES trên nền tảng Vercel
version: 1.0
date_created: 2026-10-27
status: 'Planned'
tags: [vercel, deployment, tanstack-start, nitro, infrastructure, ci-cd, devops]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Kế hoạch triển khai (Deployment Plan) từng bước chi tiết để đưa hệ thống điều hành sản xuất **DYNAMO VIETNAM QT - MES** lên nền tảng đám mây **Vercel**. Hệ thống được xây dựng trên nền tảng **TanStack Start (React 19 + Nitro Server Engine)**, kết nối dữ liệu 2 chiều với Google Sheets và Google Apps Script Webhook.

Tài liệu này đóng vai trò kim chỉ nam dành cho Trưởng dự án / Phụ trách kỹ thuật để thiết lập một môi trường Production / Staging hoàn chỉnh trên Vercel: từ bước cấu hình repository GitHub, thiết lập Nitro Engine Preset (`NITRO_PRESET=vercel`), khai báo biến môi trường bảo mật, thiết lập Build Command, cho đến nghiệm thu kiểm thử sau khi xuất bản (Post-deployment verification).

## 1. Requirements & Constraints

- **REQ-001**: Thiết lập liên kết kho mã nguồn (Git Integration): Tích hợp trực tiếp Vercel với kho lưu trữ GitHub chứa nhánh `main` đã merge để kích hoạt quy trình CI/CD tự động khi có commit mới.
- **REQ-002**: Định cấu hình Nitro Engine Target: Đảm bảo Nitro Compiler tạo ra artifact theo chuẩn Vercel Build Output API v3 (`.vercel/output`) thay vì Cloudflare Workers mặc định.
- **REQ-003**: Quản lý Biến môi trường tập trung: Khai báo đầy đủ các biến môi trường cần thiết (`NITRO_PRESET`, `DYNAMO_WEBHOOK_URL`) trên giao diện Environment Variables của Vercel.
- **SEC-001**: Bảo mật Endpoint Webhook: Bảo vệ Webhook URL và khóa phiên HttpOnly của Cookie session trên môi trường đám mây Vercel qua HTTPS/TLS mặc định.
- **CON-001**: Tính tương thích với Lovable.dev: Không phá vỡ cấu hình Cloudflare mặc định của Lovable trong `vite.config.ts`; việc chuyển đổi sang Vercel phải được kiểm soát qua biến môi trường build (`NITRO_PRESET=vercel`).
- **CON-002**: Node.js Runtime Version: Dự án yêu cầu môi trường Node.js phiên bản $\ge$ 20.x để tương thích hoàn toàn với React 19 và Nitro 3.
- **GUD-001**: Kiểm thử tính sẵn sàng trước khi triển khai: Đảm bảo toàn bộ 23 Unit tests chạy pass cục bộ trước khi kích hoạt Deploy trên Vercel.
- **GUD-002**: Quy chuẩn tên miền nội bộ: Thiết lập Custom Domain hoặc alias dễ nhận diện cho cán bộ quản đốc và công nhân truy cập tại phân xưởng.
- **PAT-001**: Serverless Build Output API Pattern: Sử dụng cơ chế phát sinh tự động thư mục `.vercel/output/` của Nitro để tương thích tự nhiên 100% với Vercel Serverless Functions mà không cần file cấu hình phức tạp.

## 2. Implementation Steps

### Implementation Phase 1: Chuẩn Bị & Cấu Hình Dự Án Tại Vercel Dashboard

- GOAL-001: Khởi tạo và thiết lập đúng các thông số Build & Environment Variables trên giao diện tạo Project mới của Vercel.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Chọn Import Git Repository: Trên màn hình "Create a New Project" của Vercel, chọn repository `liable-reyla-afric` (hoặc tên repo GitHub tương ứng). | | |
| TASK-002 | Cấu hình Framework Preset: Tại mục "Framework Preset", chọn `Other` (hoặc `Vite`). Không chọn Next.js/Remix. | | |
| TASK-003 | Thiết lập Build & Output Settings: Giữ Build Command là `npm run build` (hoặc bật override thành `npm run build`), Output Directory để trống mặc định để Vercel tự động nhận diện thư mục `.vercel/output`. | | |
| TASK-004 | Khai báo Biến môi trường trọng yếu: Thêm biến `NITRO_PRESET` với giá trị `vercel` trong mục **Environment Variables** (đây là điều kiện tiên quyết để Nitro build sang kiến trúc Vercel). | | |
| TASK-005 | Khai báo Biến cấu hình tích hợp: Thêm biến `DYNAMO_WEBHOOK_URL` chứa link Google Apps Script Webhook chính thức của nhà máy. | | |

### Implementation Phase 2: Kích Hoạt Build & Giám Sát Quá Trình Triển Khai

- GOAL-002: Kích hoạt triển khai lần đầu (Deploy) và theo dõi sát sao nhật ký Build Log để xử lý kịp thời các lỗi biên dịch nếu có.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Bấm nút "Deploy": Khởi chạy quy trình Vercel Build Container (tải dependencies, chạy vite build với NITRO_PRESET=vercel). | | |
| TASK-007 | Giám sát Build Logs: Xác nhận Nitro in ra thông báo `[nitro:vercel] Using nodejs runtime` và hoàn tất tạo `.vercel/output/static` và `.vercel/output/functions/__server.func`. | | |
| TASK-008 | Xác nhận trạng thái Deployment: Vercel hoàn tất quá trình gán tên miền `*.vercel.app` và trạng thái chuyển sang màu xanh (Ready). | | |

### Implementation Phase 3: Nghiệm Thu Hiện Trường & Kiểm Chuẩn Vận Hành

- GOAL-003: Thực hiện kiểm chuẩn toàn diện các chức năng nghiệp vụ của hệ thống MES trên đường dẫn Vercel vừa phát hành.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Kiểm tra Điều hướng & Tải Bảng dữ liệu: Truy cập trang chủ, xác nhận tự động redirect về `/tracking` và nạp thành công danh sách các lô hàng gia công từ Google Sheets. | | |
| TASK-010 | Kiểm tra Xác thực & Đăng nhập phân quyền: Thử nghiệm đăng nhập mã Access Code cấp Leader và Admin trên route `/login`. | | |
| TASK-011 | Kiểm tra Đồng bộ 2 chiều (Bidirectional Sync): Mở hộp thoại `LotUpdateButton` chuyển trạng thái 1 lô hàng thử nghiệm, kiểm tra ghi nhận trên Server In-memory store và Webhook phản hồi về Google Sheets. | | |
| TASK-012 | Kiểm tra Tính năng In Job Ticket & Barcode: Bấm in một Job Ticket trên màn hình `/tracking`, đảm bảo hiển thị đúng mã vạch Barcode và các thông số kỹ thuật. | | |

## 3. Alternatives

- **ALT-001**: Triển khai trực tiếp lên Cloudflare Pages (mặc định của Lovable): Yêu cầu quản lý tài khoản Cloudflare Workers/Pages và cấu hình DNS phức tạp hơn, trong khi doanh nghiệp đã có tài khoản Vercel liên kết sẵn với GitHub.
- **ALT-002**: Triển khai Container Docker trên máy chủ nội bộ On-premise xưởng: Đòi hỏi bảo trì phần cứng, cấu hình IP tĩnh và mở cổng mạng ngoài cho vendor gia công truy cập.

## 4. Dependencies

- **DEP-001**: Tài khoản Vercel đã kết nối tài khoản GitHub chứa repository dự án.
- **DEP-002**: Nhánh mã nguồn `main` đã merge đầy đủ tính năng từ `branch-anti-dev-24.10`.
- **DEP-003**: Google Spreadsheet Master và Script Webhook đang hoạt động bình thường.

## 5. Files

- **FILE-001**: `package.json` — Quản lý kịch bản build (`npm run build`) và runtime dependencies.
- **FILE-002**: `vite.config.ts` — Cấu hình TanStack Start và tích hợp Nitro Compiler.
- **FILE-003**: `src/server.ts` — Entrypoint máy chủ Nitro xử lý SSR và bọc lỗi hệ thống.
- **FILE-004**: `src/lib/server-dataset.ts` — In-memory Live Dataset lưu trữ dữ liệu thời gian thực trên Vercel Serverless Function runtime.

## 6. Testing

- **TEST-001**: Chạy `npm test` cục bộ xác nhận 23/23 tests pass trước khi đẩy lên remote.
- **TEST-002**: Kiểm thử biên dịch thử nghiệm cục bộ với lệnh `$env:NITRO_PRESET="vercel"; npm run build` đảm bảo sinh đúng `.vercel/output/`.
- **TEST-003**: Kiểm thử Smoke-test End-to-End trên URL Production của Vercel (nạp sheet, đăng nhập, in phiếu, chuyển trạng thái lô hàng).

## 7. Risks & Assumptions

- **RISK-001**: Cơ chế Serverless Functions trên Vercel có thể bị Cold Start hoặc giải phóng bộ nhớ RAM nếu không có truy cập trong thời gian dài, khiến `server-dataset` phải seed lại từ Google Sheets (đã được xử lý tự động trong code).
- **ASSUMPTION-001**: Tài khoản Google Sheets và Apps Script Webhook không bị đổi quyền truy cập hay phân quyền chia sẻ (Anyone with the link).

## 8. Related Specifications / Further Reading

- [TanStack Start Deployment Documentation](https://tanstack.com/start/latest/docs/framework/react/guide/deployment)
- [Nitro Deployment Preset Vercel](https://nitro.unjs.io/deploy/providers/vercel)
- [Vercel Build Output API v3 Specification](https://vercel.com/docs/build-output-api/v3)
