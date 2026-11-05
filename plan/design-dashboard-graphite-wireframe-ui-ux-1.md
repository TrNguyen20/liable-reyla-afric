---
goal: Cải tiến đồng bộ toàn diện giao diện UI và trải nghiệm tương tác UX màn hình /dashboard theo chuẩn Graphite Wireframe Specification v2.1.0
version: 1.0.0
date_created: 2026-11-04
status: Completed
purpose: design
component: dashboard
---

# Kế Hoạch Triển Khai: Đồng Bộ & Nâng Cấp UI/UX Toàn Diện Màn Hình /dashboard (Graphite Wireframe v2.1.0)

Màn hình `/dashboard` (Trung tâm điều hành luân chuyển QT & Biên bản giao ca A4) vừa được kích hoạt lại trong phiên bản v2.1.0. Sau thời gian dài không được nâng cấp, màn hình này đang tồn tại các điểm nghẽn tương tác (dead-end drill downs), đứt gãy luồng điều hướng sang `/tracking`, tàn dư vi phạm Design System (`shadow-2xl`, màu hardcoded), và biên bản bàn giao ca A4 chưa tự động hóa tối ưu.

Kế hoạch này đã hoàn thành nâng cấp toàn diện đồng bộ giữa `/dashboard` và toàn bộ dự án theo chuẩn **Graphite Wireframe UI Specification v2.1.0**.

---

## 1. Mục Tiêu & Phạm Vi (Goals & Scope)

| Mã | Mục tiêu | Tiêu chí hoàn thành |
| :--- | :--- | :--- |
| **GOAL-001** | Khắc phục tàn dư vi phạm Design System Negative Constraints | Đã loại bỏ `shadow-2xl`, màu hardcoded trong `dashboard.tsx`, tuân thủ 100% Negative Constraints của `DESIGN-SYSTEM.md`. |
| **GOAL-002** | Đồng bộ hóa toàn diện luồng điều hướng 2 chiều giữa Dashboard và Tracking | Bấm vào bất kỳ thẻ KPI, công đoạn Pipeline, nhóm Cảnh báo hoặc Bảng Điểm nghẽn nào đều chuyển mượt sang `/tracking` kèm bộ lọc tương ứng. |
| **GOAL-003** | Nâng cấp thẩm mỹ Graphite Wireframe UI cho Dashboard | Đã bổ sung nhãn công nghiệp `[KPI-01]..[KPI-05]`, Industrial Badges, chỉ báo LED `andon-pulse`. |
| **GOAL-004** | Tối ưu hóa Biên bản bàn giao ca sản xuất A4 (SOP-MES-08) | Tự động điền người giao ca theo phiên đăng nhập, lưu `localStorage`, hỗ trợ phím tắt in `P` và `Esc`, layout in A4 sắc nét. |
| **GOAL-005** | Tự động hóa kiểm chuẩn CI/CD | Bổ sung test case kiểm tra tuân thủ thiết kế và liên kết drill-down (`TC-DS-06`), 100% `npm test` và `npm run build` pass. |

---

## 2. Danh Sách Nhiệm Vụ Cụ Thể (Atomic Implementation Tasks)

| Mã Task | Thành phần | File tác động | Mô tả chi tiết | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **TASK-001** | Tracking Search Params | `src/routes/tracking.tsx` | Mở rộng `validateSearch` hỗ trợ `focus`: `'overdue' \| 'due_soon' \| 'est_due' \| 'sync_failed' \| 'no_qc' \| 'qc_fail' \| 'open' \| 'stocked'`, kèm `vendor`, `workshop`, `logistics`. | Đã hoàn thành |
| **TASK-002** | Tracking Filter Logic | `src/routes/tracking.tsx` | Khởi tạo logic bộ lọc ban đầu trong `useState<TableFilterState>` tương ứng với các `focus` và search params mới từ Dashboard. | Đã hoàn thành |
| **TASK-003** | Dashboard Negative Constraints | `src/routes/dashboard.tsx` | Thay thế `shadow-2xl` bằng `shadow-xl border border-border`; thay toàn bộ màu cứng bằng semantic tokens (`text-foreground`, `border-border`, v.v.). | Đã hoàn thành |
| **TASK-004** | Dashboard Dropdowns | `src/routes/dashboard.tsx` | Nâng cấp các tùy chọn trong dropdown Logistics và QC kèm tiền tố công nghiệp (`WAIT`, `[]`, `STOCKED`, `PASS`). | Đã hoàn thành |
| **TASK-005** | Dashboard KPI Cards | `src/routes/dashboard.tsx` | Thêm mã wireframe `[KPI-01]` đến `[KPI-05]`, biến 100% các thẻ KPI thành thẻ có thể click chuyển sang `/tracking`. | Đã hoàn thành |
| **TASK-006** | Dashboard Pipeline | `src/routes/dashboard.tsx` | Kết nối 4 công đoạn của Pipeline với các search params tương ứng của `/tracking` (`logistics` và `focus`). | Đã hoàn thành |
| **TASK-007** | Dashboard Bottlenecks | `src/routes/dashboard.tsx` | Nâng cấp các dòng trong bảng Đối tác và Phân xưởng thành liên kết drill-down sang `/tracking`. | Đã hoàn thành |
| **TASK-008** | Dashboard Priority Actions | `src/routes/dashboard.tsx` | Nâng cấp bảng 8 hành động ưu tiên: áp dụng Industrial Badges cho cột Logistics/QC và phân cấp cảnh báo `andon-pulse`. | Đã hoàn thành |
| **TASK-009** | Shift Handover Persistence | `src/routes/dashboard.tsx` | Tự động điền người giao ca theo `role`, lưu tên giao/nhận ca vào `localStorage`, thêm phím tắt `Esc` và `P`. | Đã hoàn thành |
| **TASK-010** | Shift Handover A4 Layout | `src/routes/dashboard.tsx` | Tối ưu hóa layout in A4, hiển thị tổng số lô quá hạn thực tế kèm chỉ số OTD rõ nét. | Đã hoàn thành |
| **TASK-011** | Automated Tests | `src/test/design-system-compliance.test.ts` | Bổ sung test kiểm tra `dashboard.tsx` không có `shadow-2xl` và xác minh tính toàn vẹn của các tham số tìm kiếm liên kết. | Đã hoàn thành |
| **TASK-012** | Verification & Build | `terminal` | Chạy `npm test` (đảm bảo 100% tests pass) và `npm run build` (kiểm tra client + SSR Nitro server). | Đã hoàn thành |

---

## 3. Quy Trình Kiểm Thử & Nghiệm Thu (Verification)

```powershell
# 1. Chạy toàn bộ test suites
npm test

# 2. Kiểm tra biên dịch sản phẩm
npm run build
```
