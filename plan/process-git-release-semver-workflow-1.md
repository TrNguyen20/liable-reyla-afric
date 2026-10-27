---
goal: Quy trình 3 giai đoạn Commit, Push, Pull Request CI và Đánh Dấu Tag Phiên Bản Quốc Tế (SemVer)
version: 1.0
date_created: 2026-10-27
status: 'Planned'
tags: [git, release, semver, pull-request, ci-cd, workflow, terminal]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Kế hoạch chuẩn hóa quy trình phát hành mã nguồn 3 giai đoạn dành cho dự án **DYNAMO MES**: từ khâu chuẩn bị mã nguồn cục bộ, tương tác GitHub Pull Request, đến phát hành phiên bản chính thức theo quy chuẩn Quốc tế (Semantic Versioning - SemVer).

Quy trình được thiết kế linh hoạt, trao quyền kiểm soát tối đa cho người dùng với cơ chế dòng lệnh Terminal sẵn sàng để copy-paste, đồng thời tôn trọng tính toàn vẹn của kết nối Lovable.dev (không force push/squash làm gãy lịch sử đồng bộ).

---

## 1. Requirements & Constraints

- **REQ-001**: Tính tương tác linh hoạt: Ở Giai Đoạn 1, trợ lý AI bắt buộc phải hỏi lại người dùng để lựa chọn tiếp tục đẩy trên nhánh hiện hành (ví dụ: `branch-anti-dev-24.10`) hay nhập một tên nhánh tùy biến khác trước khi sinh tập lệnh Terminal.
- **REQ-002**: Cơ chế Copy-Paste thân thiện: Các khối lệnh Terminal ở Giai Đoạn 1 và Giai Đoạn 3 phải được định dạng rõ ràng (hỗ trợ Windows PowerShell / Command Prompt), có chú thích giải thích và dễ dàng copy để chạy trực tiếp.
- **REQ-003**: Chủ động nghiệm thu Giai Đoạn 2: Người dùng trực tiếp mở Pull Request và giám sát hệ thống CI tự động trên giao diện web GitHub; sau đó xác nhận hoàn tất hoặc để trợ lý kiểm tra real-time.
- **REQ-004**: Chuẩn hóa phiên bản Quốc tế (SemVer): Giai Đoạn 3 phải gắn Annotated Tag theo định dạng Semantic Versioning `vMAJOR.MINOR.PATCH` (ví dụ: `v1.0.0`) kèm thông điệp phát hành chi tiết.
- **CON-001**: Bảo toàn lịch sử Git (Lovable Sync): Tuyệt đối không sử dụng `git push --force`, rebase hoặc viết đè lịch sử các commit đã đẩy lên GitHub để tránh phá vỡ đồng bộ Lovable.dev.
- **SEC-001**: Bảo vệ bí mật cấu hình: Trước khi stage (`git add`), kiểm tra `.gitignore` để đảm bảo không commit nhầm các file chứa thông tin nhạy cảm (như key, token cá nhân).
- **GUD-001**: Chuẩn Conventional Commits: Định dạng commit message theo quy ước chuẩn: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- **PAT-001**: GitHub Flow & Release Tagging: Áp dụng luồng Feature/Dev Branch -> Pull Request -> CI Check -> Merge main -> Tagged Release.

---

## 2. Implementation Steps

### Implementation Phase 1: Xác Nhận Nhánh, Commit & Đẩy Nhánh Lên GitHub (Stage 1)

- GOAL-001: Xác định chính xác nhánh làm việc và cung cấp khối lệnh Terminal tối ưu để người dùng commit và đẩy toàn bộ thay đổi lên GitHub.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | **Khảo sát & Xác nhận nhánh**: Trợ lý AI chủ động hỏi người dùng để xác nhận sử dụng nhánh hiện tại (`branch-anti-dev-24.10`) hay chỉ định tên một nhánh mới khác. | | |
| TASK-002 | **Sinh khối lệnh Terminal Stage 1**: Tạo nội dung dòng lệnh linh hoạt (`git status`, `git add`, `git commit -m "..."`, `git push -u origin <branch>`) có tham số rõ ràng để người dùng copy-paste thực thi ngay trong terminal. | | |
| TASK-003 | **Xác nhận trạng thái đồng bộ Remote**: Kiểm tra hoặc tiếp nhận phản hồi từ người dùng rằng mã nguồn đã được đẩy lên GitHub thành công mà không gặp xung đột. | | |

### Implementation Phase 2: Mở Pull Request & Kiểm Tra CI Tự Động (Stage 2)

- GOAL-002: Người dùng chủ động thực hiện trên GitHub: tạo PR, quan sát kiểm thử CI/CD tự động và hoàn tất merge vào nhánh `main`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | **Khởi tạo Pull Request trên GitHub**: Người dùng chủ động truy cập repo GitHub, tạo PR từ nhánh đã đẩy ở Phase 1 vào nhánh đích `main`. | | |
| TASK-005 | **Giám sát CI/CD Checks**: Theo dõi các quy trình kiểm thử tự động (Build check, Unit test, Vercel preview deployment) đảm bảo trạng thái đạt All checks passed (xanh). | | |
| TASK-006 | **Merge PR & Chốt điểm kiểm tra**: Người dùng thực hiện "Merge Pull Request" (hoặc "Rebase and merge") trên GitHub và xác nhận "OK xong" hoặc yêu cầu trợ lý kiểm tra real-time qua GitHub CLI / git fetch. | | |

### Implementation Phase 3: Cập Nhật main Tại Local & Đánh Dấu Tag Phiên Bản Quốc Tế SemVer (Stage 3)

- GOAL-003: Cung cấp khối lệnh Terminal để người dùng đồng bộ nhánh `main` cục bộ và phát hành phiên bản chính thức với thẻ Git Tag chuẩn SemVer.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | **Sinh khối lệnh Terminal cập nhật main**: Tạo nội dung lệnh (`git checkout main`, `git pull origin main`) để người dùng copy-paste kéo mã nguồn đã merge về máy cục bộ. | | |
| TASK-008 | **Thống nhất phiên bản SemVer**: Xác định số hiệu phiên bản theo quy chuẩn quốc tế (ví dụ: `v1.0.0` - Phát hành toàn diện kiến trúc Vercel Deployment & MES Real-time Sync). | | |
| TASK-009 | **Sinh khối lệnh Terminal gắn & đẩy Tag**: Cung cấp lệnh tạo Annotated Tag (`git tag -a v1.0.0 -m "..."`) và đẩy lên GitHub (`git push origin v1.0.0`) để người dùng copy-paste thực hiện. | | |
| TASK-010 | **Nghiệm thu phiên bản Release**: Kiểm tra xác nhận tag đã xuất hiện trên GitHub Repository và sẵn sàng cho môi trường Production Vercel. | | |

---

## 3. Alternatives

- **ALT-001**: Trợ lý AI tự động chạy toàn bộ lệnh commit và push ngầm: Không được lựa chọn vì người dùng muốn toàn quyền kiểm soát, tự tay copy chạy lệnh và lựa chọn nhánh linh hoạt.
- **ALT-002**: Merge trực tiếp tại Local rồi push thẳng vào `main`: Rủi ro cao, bỏ qua bước kiểm tra CI tự động và quy trình review Pull Request trên GitHub.

---

## 4. Dependencies

- **DEP-001**: Kho lưu trữ Git cục bộ đã kết nối với Remote GitHub (`origin`).
- **DEP-002**: Người dùng có quyền ghi (write/push) vào repository trên GitHub.
- **DEP-003**: Trình biên dịch và bộ unit tests (`npm test`) hoạt động ổn định không phát sinh lỗi.

---

## 5. Files

- **FILE-001**: `plan/process-git-release-semver-workflow-1.md` — Hồ sơ quy trình phát hành 3 giai đoạn.
- **FILE-002**: `.gitignore` — Đảm bảo loại trừ các tệp tạm, cache và biến môi trường nhạy cảm.
- **FILE-003**: `package.json` — Nơi đồng bộ trường `"version"` tương ứng với thẻ Git SemVer.

---

## 6. Testing

- **TEST-001**: Xác minh `git status` trước khi commit đảm bảo đúng các tệp thay đổi mong muốn.
- **TEST-002**: Kiểm tra GitHub CI Pipeline sau khi mở Pull Request để đảm bảo quá trình build/test tự động thành công.
- **TEST-003**: Kiểm tra `git tag -l` và `git log --oneline --decorate -n 3` tại máy cục bộ sau khi hoàn tất Giai Đoạn 3.

---

## 7. Risks & Assumptions

- **RISK-001**: Xung đột mã nguồn (Merge Conflict) khi mở Pull Request nếu nhánh `main` có commit mới từ thành viên khác hoặc từ bot Lovable.
- **ASSUMPTION-001**: Nhánh `main` được bảo vệ (Branch Protection Rules) yêu cầu Pull Request và CI xanh trước khi cho phép merge.

---

## 8. Related Specifications / Further Reading

- [Semantic Versioning 2.0.0 (SemVer Specification)](https://semver.org/)
- [GitHub Flow: Branching, Pull Requests, and Releases](https://docs.github.com/en/get-started/using-github/github-flow)
- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
