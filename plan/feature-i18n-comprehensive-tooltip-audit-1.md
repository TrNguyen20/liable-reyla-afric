---
goal: Rà soát và chuyển đổi toàn bộ chuỗi tiếng Việt gắn cứng (tooltip nút bút sửa, click đúp, ghi chú comment, placeholder) sang hệ thống i18n đa ngôn ngữ [VI, EN, JA]
version: 1.0
date_created: 2026-11-07
status: 'Completed'
tags:
  - feature
  - i18n
  - tooltips
  - localization
  - audit
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

Kế hoạch toàn diện: Rà soát và chuyển đổi toàn bộ chuỗi tiếng Việt gắn cứng tại các thuộc tính `title`, `aria-label`, placeholder và nút bút chỉnh sửa trên toàn bộ hệ thống DYNAMO MES sang cơ chế đa ngôn ngữ `t(...)` cho 3 ngôn ngữ: **Tiếng Việt [VI]**, **Tiếng Anh [EN]**, và **Tiếng Nhật [JA]**.

---

## Tasks

| Task | Description | Completed | Date |
| :--- | :--- | :---: | :--- |
| TASK-001 | Bổ sung các cụm khóa `inlineEdit`, `table`, `tooltips` vào 3 từ điển `tracking.json` (VI, EN, JA) đối xứng 100% | x | 2026-11-07 |
| TASK-002 | Bổ sung cụm khóa `tooltips` vào 3 từ điển `dashboard.json` (VI, EN, JA) | x | 2026-11-07 |
| TASK-003 | Bổ sung cụm khóa `ticket` và `auth` vào 3 từ điển `common.json` (VI, EN, JA) | x | 2026-11-07 |
| TASK-004 | Thay thế chuỗi gắn cứng trong `src/routes/tracking.tsx` (các nút bút `Edit2`, ô click đúp, placeholder ghi chú) | x | 2026-11-07 |
| TASK-005 | Thay thế chuỗi gắn cứng trong `src/routes/dashboard.tsx`, `job-ticket.tsx`, `login.tsx` | x | 2026-11-07 |
| TASK-006 | Mở rộng bộ kiểm thử tự động `src/test/i18n-standardization.test.ts` kiểm tra không còn hardcoded tooltips | x | 2026-11-07 |
| TASK-007 | Chạy kiểm thử tự động `npm test` và đóng gói `npm run build` | x | 2026-11-07 |
