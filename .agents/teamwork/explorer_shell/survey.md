# KHẢO SÁT TOÀN DIỆN: DYNAMO SHELL, NAVIGATION, LOGIN & COMMON UI COMPONENTS
## Tiêu chuẩn hóa Tam Ngữ [VI] [EN] [JA] — Hệ thống DYNAMO MES v2.3

- **Tác nhân thực hiện**: `teamwork_explorer` (explorer_shell)
- **Thư mục làm việc**: `.agents/teamwork/explorer_shell/`
- **Thời điểm khảo sát**: 2026-11-06T02:08:00Z
- **Phạm vi khảo sát**: Khung vỏ hệ thống (Dynamo Shell), Thanh điều hướng (Navigation Header), Bộ chuyển ngữ (Trilingual Switcher), Trang đăng nhập & xác thực ULID (/login), Dải chỉ số xưởng (Shopfloor Telemetry), Menu lệnh nhanh (Command Palette ⌘K), Phiếu lệnh gia công A4 & Tem Pallet (Job Ticket Studio), Hộp thoại cập nhật lô (Lot Update Dialog), Cấu hình Webhook hai chiều (Webhook Config), Hộp thoại / Thông báo toàn cục (Dialogs, Modals, Toasts, Tooltips, Fail-Safe Error Boundary).

---

## 1. TỔNG QUAN KIẾN TRÚC HIỆN HỮU & CƠ CHẾ i18n

### 1.1. Hạ tầng i18n cốt lõi
Hệ thống sử dụng giải pháp i18n nội bộ dựa trên React Context API và TypeScript:
- **Tập tin định nghĩa kiểu**: `src/i18n/types.ts`
  - Kiểu ngôn ngữ: `export type Locale = 'vi' | 'en' | 'ja';`
  - Danh mục Namespaces hiện hữu (7 namespaces):
    `'common' | 'nav' | 'tracking' | 'dashboard' | 'orders' | 'sync' | 'telemetry'`
- **Cấu hình & Dữ liệu đặc tả**: `src/i18n/config.ts`
  - `SUPPORTED_LOCALES = ['vi', 'en', 'ja']`
  - `DEFAULT_LOCALE = 'vi'`
  - Fallback Chain: `ja -> ['en', 'vi']`, `en -> ['vi']`, `vi -> []`
  - Metadata: nhãn hiển thị, tên bản địa (Tiếng Việt, English, 日本語), cờ quốc gia, nhãn viết tắt (`VI`, `EN`, `JA`).
- **Bộ cung cấp & Hook**: `src/i18n/index.tsx`
  - `I18nProvider`: Quản lý state `locale` đồng bộ Cookie (`dynamo-locale`), `localStorage`, và gán thuộc tính `document.documentElement.lang`.
  - Hàm dịch `t(key: string, params?: Record<string, string | number>)`:
    - Nếu key không có dấu chấm (`parts.length === 1`), tra cứu trong `dict.common[key]`.
    - Nếu key có tiền tố namespace (`namespace.subKey.leaf`), tra cứu tương ứng trong `dict[namespace]`.
    - Hỗ trợ nội suy chuỗi `{param}`.
    - Fallback tự động theo chuỗi `FALLBACK_CHAIN`.
- **Bộ định dạng theo văn hóa địa phương**: `src/i18n/formatters.ts`
  - `formatDate(date, locale, options)`: Định dạng ngày (VI: `DD/MM/YYYY`, EN: `MM/DD/YYYY`, JA: `YYYY/MM/DD` hoặc `YYYY年MM月DD日`).
  - `formatTime(date, locale)`: Định dạng giờ 24h không phụ thuộc AM/PM.
  - `formatShift(shiftNumber, locale)`: Định dạng ca sản xuất (VI: `Ca 1`, EN: `Shift 1`, JA: `1直`).
  - `formatNumber(val, locale)`: Định dạng phân tách hàng nghìn theo chuẩn `Intl.NumberFormat`.

### 1.2. Đánh giá trạng thái i18n hiện tại của Shell & Common UI
- **Khung vỏ Shell**: Đã tích hợp `useTranslation()` cho nhãn tab điều hướng và lựa chọn role, tuy nhiên hàng loạt tooltip, badge, đồng hồ LED, thông báo toast và footer vẫn còn chuỗi tiếng Việt hardcoded.
- **Trang Đăng nhập (`/login`)**: **Hoàn toàn 100% hardcode tiếng Việt**. Chưa nạp `useTranslation()`, chưa có bộ chuyển đổi ngôn ngữ trên màn hình đăng nhập (khi render chế độ `bare = true`).
- **Telemetry Bar (`ShopfloorTelemetry`)**: **Chưa sử dụng `useTranslation()`**. Toàn bộ ca kíp, trạng thái đồng bộ, nhãn chỉ số KPI đều bị hardcode tiếng Việt.
- **Command Palette (`CommandPalette`)**: **Chưa sử dụng `useTranslation()`**. Các heading, route names, mô tả thao tác và placeholder đều là tiếng Việt tĩnh.
- **Job Ticket Studio & A4 Sheet (`job-ticket.tsx`)**: **Chưa sử dụng `useTranslation()`**. Bao gồm toàn bộ văn bản in ấn A4, biên bản bàn giao, tem pallet, 4 chữ ký pháp lý và bảng kê dispatch manifest.
- **Lot Update Dialog (`lot-update-dialog.tsx`)**: **Chưa sử dụng `useTranslation()`**. Form cập nhật tiến độ, thông báo lỗi validation và toast phản hồi đều hardcoded.
- **Webhook Config (`webhook-config.tsx`)**: **Chưa sử dụng `useTranslation()`**. Thẻ trạng thái, hướng dẫn và toast đều hardcoded.
- **Root Shell & Fail-Safe (`__root.tsx`)**: Trang 404 và ErrorComponent tự phục hồi (Self-Healing) chứa toàn bộ thông điệp kỹ thuật tiếng Việt hardcoded.

---

## 2. DANH MỤC CHI TIẾT CÁC THÀNH PHẦN & CHUỖI HARDCODED

### 2.1. Root Layout & Fail-Safe Boundary (`src/routes/__root.tsx`)
| Vị trí / Component | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (i18n key) | Ghi chú thiết kế / Trilingual |
|---|---|---|---|
| Head Meta | "Hệ thống điều hành nhà thầu phụ, nhiệt luyện và luân chuyển QT..." | `common.meta.description` | Meta SEO & OpenGraph |
| `NotFoundComponent` (404) | "Không tìm thấy tài nguyên" | `common.notFound.title` | EN: Resource Not Found / JA: ページが見つかりません |
| `NotFoundComponent` (404) | "Đường dẫn yêu cầu không tồn tại trong hệ thống điều hành luân chuyển QT..." | `common.notFound.desc` | Mô tả lỗi 404 chi tiết |
| `NotFoundComponent` (404) | "Quay về Luân chuyển QT" | `common.notFound.backAction` | Nút quay lại trang chính `/tracking` |
| `ErrorComponent` | "SỰ CỐ VẬN HÀNH / RUNTIME FAIL-SAFE" | `common.errorBoundary.badge` | Tag lỗi kỹ thuật đỏ |
| `ErrorComponent` | "Không thể kết nối hoặc kết xuất dữ liệu" | `common.errorBoundary.title` | Tiêu đề Fail-Safe |
| `ErrorComponent` | "Hệ thống phát hiện lỗi ngoại lệ trong luồng runtime. Bộ tự phục hồi..." | `common.errorBoundary.desc` | Giải thích cơ chế tự phục hồi |
| `ErrorComponent` | "Thử tải lại luồng" | `common.errorBoundary.retry` | Nút reset router |
| `ErrorComponent` | "Khôi phục sạch (Self-Heal)" | `common.errorBoundary.selfHeal` | Nút xóa cache cục bộ hỏng |
| `ErrorComponent` | "Về Luân chuyển QT" | `common.errorBoundary.goHome` | Nút fallback về trang điều độ |
| `ErrorComponent` | 'Ẩn nhật ký kỹ thuật ▲' / 'Xem nhật ký ngoại lệ kỹ thuật ▼' | `common.errorBoundary.toggleLogHide` / `toggleLogShow` | Nút mở rộng stack trace cho KTV |

*Lưu ý kiến trúc*: `NotFoundComponent` và `ErrorComponent` được khai báo ở tầng Router Root. Cần đảm bảo component này có quyền truy cập vào ngữ cảnh dịch thuật (hoặc dự phòng chuỗi trilingual an toàn).

---

### 2.2. Dynamo Shell & Navigation Header (`src/components/dynamo-shell.tsx`)
| Thành phần | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (i18n key) | Giải pháp chuyển ngữ |
|---|---|---|---|
| Banner ngoại tuyến (Offline) | "MẤT KẾT NỐI MẠNG NHÀ MÁY · ĐANG HOẠT ĐỘNG Ở CHẾ ĐỘ NGOẠI TUYẾN (DỮ LIỆU ĐƯỢC LƯU CỤC BỘ)" | `common.offlineAlert` | Đã có sẵn trong `common.json`, cần thay thế chuỗi hardcode bằng `t('common.offlineAlert')` |
| Nav Tooltip | `(Phím [${n.shortcut}])` | `nav.shortcutHint` | Thay vì nối chuỗi hardcode `(Phím [X])`, sử dụng `t('nav.shortcutHint', { key: n.shortcut })` (VI: `Phím [{key}]`, EN: `Key [{key}]`, JA: `キー [{key}]`) |
| Nav Sections | `'ĐIỀU HÀNH'`, `'HỆ THỐNG'` | `nav.sections.operations`, `nav.sections.system` | Phân nhóm menu trong shell |
| Header Nav | `aria-label="Thanh điều hướng chính"` | `nav.ariaLabel` | Trợ năng màn hình đọc |
| LedClock | `aria-label="Đồng hồ thời gian thực"` | `common.clock.ariaLabel` | EN: Real-time clock / JA: リアルタイム時計 |
| LedClock Date | Tự định dạng thủ công trong component | Sử dụng `formatDate(now, locale)` | Thống nhất với `src/i18n/formatters.ts` |
| Role Switcher | `title="Chuyển đổi góc nhìn kiểm tra phân quyền"` | `common.roles.switcherTooltip` | Tooltip quản trị viên |
| Role Switcher Toasts | `val === 'admin' ? 'Đã quay lại góc nhìn Admin thực tế' : \`Đang giả lập góc nhìn: ${roleLabel(val)}\`` | `common.roles.revertToast`, `common.roles.impersonateToast` | Nội suy `{role}` |
| Role Switcher Cancel | `title="Hủy giả lập"` | `common.roles.cancelImpersonate` | Tooltip nút hủy giả lập |
| Language Switcher | `title="Chuyển đổi ngôn ngữ / Switch Language / 言語切替"` | `common.langSwitcher.title` | Giữ nguyên chuỗi tam ngữ mô tả |
| Language Switcher | `aria-label="Chọn ngôn ngữ hệ thống"` | `common.langSwitcher.ariaLabel` | Accessibility |
| Theme Toggle | `aria-label={theme === 'light' ? 'Chuyển Dark mode' : 'Chuyển Light mode'}` | `common.themeDark`, `common.themeLight` | Hiện title đã dùng `t()`, cần áp dụng cho cả `aria-label` |
| User Profile Pill | Badge `(GIẢ LẬP)` | `common.roles.impersonatedBadge` | VI: `(GIẢ LẬP)`, EN: `(SIMULATED)`, JA: `(シミュレーション)` |
| User Profile Pill | `title="Đăng xuất khỏi hệ thống"`, `aria-label="Đăng xuất"` | `common.logout`, `common.logoutAria` | Đồng bộ i18n |
| Data Pull Toasts | `toast.success(\`Đã làm mới ${r.items.length} lô từ hệ thống (${elapsed}ms)\`)` | `common.toasts.refreshSuccess` | Nội suy `{count}`, `{elapsed}` |
| Data Pull Toasts | `'Không tải được dữ liệu từ hệ thống.'` | `common.toasts.loadFailed` | Thông báo lỗi |
| Data Pull Toasts | `toast.error(\`Lỗi tải dữ liệu: ${msg}\`)` | `common.toasts.loadError` | Nội suy `{msg}` |
| Route Access Toast | `toast.error('Vai trò của bạn không có quyền truy cập trang này.')` | `common.toasts.accessDenied` | Cảnh báo phân quyền |
| Loading Skeleton | `'Đang đồng bộ dữ liệu nhiệt luyện từ Google Sheets…'` | `common.loading.syncing` | Trạng thái đồng bộ ban đầu |
| Error State | `'Chưa tải được dữ liệu sản xuất'` | `common.loading.failedTitle` | Tiêu đề lỗi dữ liệu |
| Error State Button | `'Thử lại'` | `common.retry` | Nút tải lại |
| Footer | `'© 2026 DYNAMO VIETNAM QT - MES · Hệ thống luân chuyển nhiệt luyện & xi mạ'` | `common.footer.copyright` | VI: Hệ thống luân chuyển nhiệt luyện & xi mạ / EN: Heat Treatment & Plating Tracking System / JA: 熱処理・めっき外注工程管理システム |
| Footer | `'Môi trường mô phỏng (Edge Runtime)'` | `common.footer.runtime` | VI: Môi trường mô phỏng / EN: Simulation Environment / JA: シミュレーション環境 |

---

### 2.3. Trang Đăng Nhập & Xác Thực ULID (`src/routes/login.tsx`)
Trang này hiện đang **thiếu hoàn toàn bộ chuyển ngữ Tam Ngữ và không nạp `useTranslation`**.

| Phân vùng | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (Namespace `common.auth` hoặc `auth`) | Bản địa hóa [EN] / [JA] |
|---|---|---|---|
| Meta Page | "Đăng nhập \| DYNAMO VIETNAM QT - MES" | `auth.meta.title` | Sign In \| DYNAMO MES / ログイン \| DYNAMO MES |
| Meta Page | "Đăng nhập hệ thống điều hành nhà thầu phụ, nhiệt luyện..." | `auth.meta.desc` | Login to Precision Subcontract Control System |
| Hero Left | "HỆ THỐNG ĐIỀU HÀNH QT NỘI BỘ" | `auth.hero.badge` | INTERNAL QT SHOPFLOOR SYSTEM / 社内熱処理管理システム |
| Hero Left | "Quản Lý Nhà Thầu Phụ Nhiệt Luyện & Luân Chuyển QT" | `auth.hero.title` | Subcontract Heat Treatment & QT Management / 熱処理外注・工程管理システム |
| Hero Left | "Cổng điều hành tập trung phục vụ các xưởng PIN, INSERT, và MOLD..." | `auth.hero.subtitle` | Centralized operational portal for PIN, INSERT, and MOLD workshops... |
| Feature 1 | "Luân chuyển nhiệt luyện / xi mạ 24/7" | `auth.features.tracking.title` | 24/7 Heat Treatment & Plating Tracking / 24時間熱処理・めっき工程管理 |
| Feature 1 | "Giám sát hành trình từng lô hàng từ phân xưởng..." | `auth.features.tracking.desc` | Monitor lot journey from workshops to subcontractors and stock. |
| Feature 2 | "Kiểm soát trễ hạn đối tác" | `auth.features.leadTime.title` | Subcontractor Lead-Time Control / 外注納期遅延管理 |
| Feature 2 | "Phát hiện và cảnh báo sớm các lô hàng quá hạn giao trả..." | `auth.features.leadTime.desc` | Early detection of overdue batches to protect mold assembly schedules. |
| Feature 3 | "Đối soát đơn giá & định mức vật liệu" | `auth.features.pricing.title` | Material Norms & Unit Price Audit / 材料規格・単価照合 |
| Feature 3 | "Tự động kiểm tra chênh lệch đơn giá theo quy cách Mác thép..." | `auth.features.pricing.desc` | Automatic price variance verification across Steel Grade × Unit × Supplier. |
| Hero Footer | "DYNAMO VIETNAM CO., LTD. · KHU CÔNG NGHIỆP ĐỒNG AN 2" | `auth.plant.address` | Giữ nguyên địa chỉ hoặc bản địa hóa |
| Hero Footer | "MES QT CORE: R&D-V1.0-DEMO" · "DATA SYNC: REAL-TIME" | `auth.plant.telemetry` | Giữ nguyên thuật ngữ kỹ thuật |
| Login Console | "XÁC THỰC DANH TÍNH" | `auth.form.badge` | IDENTITY VERIFICATION / 本人認証 |
| Login Console | "Đăng Nhập Hệ Thống" | `auth.form.title` | System Login / システムログイン |
| Login Console | "Nhập mã xác thực do ban điều hành cấp để phân quyền..." | `auth.form.subtitle` | Enter authorization token issued by operations to access assigned role. |
| Wizard Steps | "Tiến trình xác thực" | `auth.steps.aria` | Authentication Progress / 認証手順 |
| Wizard Steps | "Bước 1 · Vị trí" / "Bước 2 · Mã truy cập ULID" | `auth.steps.step1`, `auth.steps.step2` | Step 1: Position / Step 2: ULID Access Code |
| Wizard Steps | "Chưa chọn", "Đã nạp mã", "Chưa nhập" | `auth.steps.unselected`, `auth.steps.codeLoaded`, `auth.steps.codeEmpty` | Status labels |
| Step 1 Roles | "BGĐ / IT hệ thống" (note: "Admin") | `auth.positions.admin.label` | BOD / System IT (Admin) / 経営陣・社内IT (Admin) |
| Step 1 Roles | "Trưởng / Phó phòng" (note: "Leader") | `auth.positions.leader.label` | Department Head / Supervisor (Leader) / 管理職・リーダー (Leader) |
| Step 1 Roles | "KTV / Nhân viên" (note: "Viewer") | `auth.positions.viewer.label` | Technician / Operator (Viewer) / 技術員・作業者 (Viewer) |
| Step 1 Roles | "Nhà cung cấp ngoài" (note: "Partner") | `auth.positions.partner.label` | External Subcontractor (Partner) / 外注委託先 (Partner) |
| Step 2 Input | "Bước 2 · Mã truy cập (Access code)" | `auth.form.codeLabel` | Step 2 · Access Code / ステップ2 · アクセスコード |
| Step 2 Input | "Phím số Kiosk" / "Ẩn phím cảm ứng" | `auth.form.kioskShow`, `auth.form.kioskHide` | Kiosk Numpad / Hide Numpad / タッチテンキー / 閉じる |
| Step 2 Input | "Nhập mã truy cập của {position}" | `auth.form.codePlaceholderPos` | Enter access code for {position} |
| Step 2 Input | "Chọn vị trí ở Bước 1 trước" | `auth.form.codePlaceholderEmpty` | Select position in Step 1 first / 最初にステップ1で役職を選択してください |
| Step 2 Input | `aria-label="Mã xác thực"` / `aria-label="Xóa mã"` / `aria-label="Ẩn mã"` | `auth.form.codeAria`, `auth.form.clearAria`, `auth.form.toggleAria` | Accessibility labels |
| Kiosk Numpad | "BÀN PHÍM CẢM ỨNG HIỆN TRƯỜNG (KIOSK MODE)" | `auth.kiosk.heading` | SHOPFLOOR TOUCH KEYPAD (KIOSK) / 現場タッチキーパッド |
| Kiosk Numpad | "C (Xóa hết)" | `auth.kiosk.clearAll` | C (Clear All) / C (全消去) |
| Security Lock | "Thiết bị tạm khóa an toàn" | `auth.lock.title` | Device Temporarily Locked / セキュリティ一時ロック中 |
| Security Lock | "Nhập sai 5 lần liên tiếp. Thử lại khi đồng hồ về 00:00." | `auth.lock.desc` | 5 consecutive failed attempts. Retry when timer reaches 00:00. |
| Security Alert | "Còn {attemptsLeft}/5 lần thử trước khi khóa thiết bị." | `auth.lock.attemptsLeft` | {attemptsLeft}/5 attempts remaining before device lockout. |
| Submit Button | "TẠM KHÓA · {mmss}" | `auth.submit.locked` | LOCKED · {mmss} / ロック中 · {mmss} |
| Submit Button | "ĐANG XÁC THỰC QUYỀN HẠN..." | `auth.submit.verifying` | VERIFYING PERMISSIONS... / 権限確認中... |
| Submit Button | "XÁC THỰC VỊ TRÍ & VÀO HỆ THỐNG" | `auth.submit.enter` | VERIFY & ENTER SYSTEM / 認証してシステム起動 |
| Validation Errors | "Vui lòng chọn vị trí công tác (Bước 1) trước khi xác thực." | `auth.errors.requirePosition` | Please select your position (Step 1) before authenticating. |
| Validation Errors | "Vui lòng nhập mã định danh truy cập (Bước 2)." | `auth.errors.requireCode` | Please enter your ULID access code (Step 2). |
| Validation Errors | "Mã xác thực không hợp lệ hoặc đã hết hiệu lực." | `auth.errors.invalidCode` | Access token is invalid or has expired. |
| Validation Errors | "Mã truy cập này không thuộc thẩm quyền của vị trí {label} đã chọn..." | `auth.errors.roleMismatch` | This access token does not belong to the selected position ({label}). |
| Validation Errors | "Lỗi kết nối khi xác thực mã. Vui lòng thử lại sau ít phút." | `auth.errors.networkError` | Connection error during verification. Please try again shortly. |
| Support Box | "Chưa có mã? Vui lòng liên hệ Quản trị viên để được cấp mã truy cập..." | `auth.support.text` | No access token? Contact Administrator to receive authorized credentials. |
| Bottom Slogan | "Kỷ Luật - Chính Xác - An Toàn - Đúng Hạn" | `common.slogan` | Discipline - Precision - Safety - On-Time / 規律・正確・安全・時間厳守 |

*Đề xuất đặc biệt*: Thêm nút chuyển đổi ngôn ngữ Micro-Pill Switcher `[VI] [EN] [JA]` vào góc trên bên phải trang `/login` để người dùng Nhật/Anh có thể đổi ngôn ngữ ngay trước khi nhập mã!

---

### 2.4. Dải Đo Xa & Chỉ Số Xưởng (`src/components/shopfloor-telemetry.tsx`)
| Vị trí | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (`telemetry.*`) | Ghi chú Trilingual |
|---|---|---|---|
| Ca sản xuất | `Ca 1 (06:00 - 14:00)`, `Ca 2 (14:00 - 22:00)`, `Ca 3 (22:00 - 06:00)` | `telemetry.shifts.shift1`, `shift2`, `shift3` | VI: `Ca 1 (06:00 - 14:00)`, EN: `Shift 1 (06:00 - 14:00)`, JA: `1直 (06:00 - 14:00)` |
| Trạng thái đồng bộ | `'Đang đồng bộ...'` | `telemetry.syncStates.syncing` | EN: Syncing... / JA: 同期中... |
| Trạng thái đồng bộ | `'Lỗi kết nối Google Sheets'` | `telemetry.syncStates.error` | EN: Google Sheets Error / JA: Googleシート連携エラー |
| Trạng thái đồng bộ | `'Cập nhật lúc ' + time` | `telemetry.syncStates.updatedAt` | Đã có sẵn `telemetry.updatedAt`, bổ sung param `{time}` |
| Trạng thái đồng bộ | `'Sẵn sàng đồng bộ'` | `telemetry.syncStates.idle` | EN: Ready to sync / JA: 同期準備完了 |
| Tóm tắt dataset | `· {number} dòng · {sourceLabel}` | `telemetry.datasetRows` | VI: `· {count} dòng` / EN: `· {count} rows` / JA: `· {count} 件` |
| Micro-metrics (Thu gọn) | `Hàng ngoài:` | `telemetry.externalShort` | VI: `Hàng ngoài:` / EN: `External:` / JA: `外注残:` |
| Micro-metrics (Thu gọn) | `Tải:` / `lô mở` | `telemetry.loadShort` / `telemetry.openLots` | VI: `{count} lô mở` / EN: `{count} open lots` / JA: `{count} 未完了ロット` |
| Nút mở rộng (Collapsed) | "Mở rộng dải chỉ số KPI xưởng (Fitts's Law)" | `telemetry.expandTooltip` | Fitts's law tooltip |
| Nút mở rộng (Collapsed) | "Chỉ số KPI" | `telemetry.kpiMetrics` | EN: KPI Metrics / JA: KPI指標 |
| Ribbon (Mở rộng) Cột 2 | "Hàng ngoài xưởng" | `telemetry.externalHeatTreatment` | Đã có sẵn key trong `telemetry.json` |
| Ribbon (Mở rộng) Cột 3 | "Tải theo xưởng" | `telemetry.workshopLoad` | Đã có sẵn key trong `telemetry.json` |
| Nút thu gọn (Expanded) | "Thu gọn dải chỉ số KPI để tối ưu không gian hiển thị bảng" | `telemetry.collapseTooltip` | Tooltip thu gọn |
| Nút thu gọn (Expanded) | "Thu gọn" | `telemetry.collapse` | EN: Collapse / JA: 折りたたむ |

---

### 2.5. Menu Lệnh Toàn Cục ⌘K (`src/components/command-palette.tsx`)
| Vị trí | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (`common.command.*`) | Ghi chú Trilingual |
|---|---|---|---|
| Input | "Tìm kiếm mã hàng, số đơn hàng, mã lô hoặc thao tác nhanh... (ESC để đóng)" | `common.command.placeholder` | Placeholder ô tìm kiếm nhanh |
| Empty state | "Không tìm thấy kết quả phù hợp." | `common.command.empty` | EN: No matching results found / JA: 一致する結果が見つかりません |
| Group 1 Heading | "LÔ HÀNG & MÃ LINH KIỆN KHỚP" | `common.command.matchedLots` | EN: MATCHED LOTS & PARTS / JA: 一致したロット・部品 |
| Lot subtitle | `Đơn: {item.So_DatHang}` | `common.command.orderPrefix` | VI: `Đơn:` / EN: `PO:` / JA: `注文:` |
| Group 2 Heading | "ĐIỀU HƯỚNG NHANH" | `common.command.quickNav` | EN: QUICK NAVIGATION / JA: クイック移動 |
| Route 1 label | "Luân chuyển nhiệt luyện QT" (Phím 1) | `nav.route1Title` | Tái sử dụng `nav.route1Title` |
| Route 2 label | "Tổng quan hệ thống" (Phím 2) | `nav.route2Title` | Tái sử dụng `nav.route2Title` |
| Route 3 label | "Đơn đặt hàng & chi tiết" (Phím 3) | `nav.route3Title` | Tái sử dụng `nav.route3Title` |
| Route 4 label | "Liên kết Google Sheets" (Phím 4) | `nav.route4Title` | Tái sử dụng `nav.route4Title` |
| Group 3 Heading | "LỌC PHÂN XƯỞNG" | `common.command.workshopFilter` | EN: WORKSHOP FILTER / JA: 工場絞り込み |
| Workshop option | "Phân xưởng: Toàn nhà máy (ALL)" | `common.command.allWorkshops` | VI: Toàn nhà máy (ALL) / EN: Entire Plant (ALL) / JA: 全工場 (ALL) |
| Workshop option | `Phân xưởng: {ws}` | `common.command.workshopPrefix` | VI: `Phân xưởng: {ws}` / EN: `Workshop: {ws}` / JA: `工場: {ws}` |
| Group 4 Heading | "THAO TÁC HỆ THỐNG" | `common.command.systemActions` | EN: SYSTEM ACTIONS / JA: システム操作 |
| Action 1 | "Làm mới & Kéo dữ liệu từ Google Sheets" | `common.command.pullData` | EN: Refresh & Pull from Google Sheets / JA: Googleシートから再取得 |
| Action 2 | "Chuyển đổi giao diện Sáng / Tối" | `common.command.toggleTheme` | EN: Toggle Light / Dark Theme / JA: ライト／ダークモード切替 |
| Action 3 | "Đăng xuất phiên làm việc" | `common.command.logout` | EN: Sign Out Session / JA: セッションログアウト |

---

### 2.6. Hộp Thoại Cập Nhật Lô Hàng (`src/components/lot-update-dialog.tsx`)
| Vị trí | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (`common.lotUpdate.*` hoặc `tracking.lotUpdate.*`) | Ghi chú Trilingual |
|---|---|---|---|
| Nút Trigger | `title="Cập nhật tiến độ lô ${item.ID_Key}"`, Text: "Cập nhật" | `common.lotUpdate.triggerTitle`, `common.lotUpdate.triggerBtn` | Nút sấm sét vàng trên bảng |
| Dialog Header | `Cập nhật lô ${item.ID_Key}` | `common.lotUpdate.dialogTitle` | Nội suy `{lotId}` |
| Dialog Header | "Cập nhật trạng thái luân chuyển và thông số kiểm tra nhiệt luyện lô hàng" | `common.lotUpdate.dialogDesc` | Mô tả ẩn trợ năng |
| DL Item | "Mã hàng", "Số đặt hàng", "Đơn vị gia công", "Hạn trả", "Chưa có" | `common.lotUpdate.itemCode`, `orderNo`, `vendor`, `dueDate`, `noDueDate` | Nhãn tóm tắt thông số lô |
| Form Label | "Trạng thái mới" | `common.lotUpdate.newStatus` | Lựa chọn trạng thái chuyển tiếp |
| Form Option | `(giữ nguyên)` | `common.lotUpdate.keepStatus` | EN: (keep current) / JA: (変更なし) |
| Form Option | `— cần lý do` | `common.lotUpdate.needReason` | EN: — reason required / JA: — 理由入力必須 |
| Form Label | "Ngày nhận thực tế" | `common.lotUpdate.actualReceiveDate` | Nhập ngày thực tế nhận hàng |
| Form Label | "Độ cứng thực tế" (Placeholder: "58-62 HRC") | `common.lotUpdate.actualHardness` | Nhập kết quả đo HRC |
| Form Checkbox | "Tôi xác nhận lô đã QC đạt" | `common.lotUpdate.qcPassConfirm` | Xác nhận trách nhiệm QC trước khi nhập kho |
| Form Label | "Lý do" (Placeholder: "VD: Độ cứng không đạt, trả vendor gia công lại") | `common.lotUpdate.reasonLabel`, `common.lotUpdate.reasonPlaceholder` | Lý do thu hồi / gia công lại |
| Xác nhận | `Xác nhận chuyển {TrangThai} → {d.status}? Bấm lại để lưu.` | `common.lotUpdate.confirmMove` | Cảnh báo 2 bước chống bấm nhầm |
| Validation Errors | "Chưa có thay đổi nào để lưu." | `common.lotUpdate.noChanges` | Cảnh báo chưa đổi dữ liệu |
| Validation Errors | "Không được chuyển trực tiếp \"{from}\" → \"{to}\"." | `common.lotUpdate.invalidMove` | Luật chuyển đổi trạng thái Poka-Yoke |
| Validation Errors | "Nhập lý do (ít nhất 5 ký tự) cho thao tác trả/thu hồi." | `common.lotUpdate.requireReason` | Yêu cầu lý do |
| Validation Errors | "Lô chưa có vendor." / "Lô chưa có hạn trả hợp lệ." | `common.lotUpdate.requireVendor`, `common.lotUpdate.requireDue` | Điều kiện xuất xưởng |
| Validation Errors | "Cần ngày nhận hàng thực tế khi chuyển sang Kiểm tra QC." | `common.lotUpdate.requireReceiveDate` | Điều kiện tiếp nhận |
| Validation Errors | "Cần ngày nhận thực tế trước khi nhập kho." | `common.lotUpdate.requireReceiveDateStock` | Điều kiện nhập kho |
| Validation Errors | "Cần độ cứng thực tế trước khi nhập kho." | `common.lotUpdate.requireHrcStock` | Bắt buộc HRC |
| Validation Errors | "Cần xác nhận \"QC đạt\" trước khi nhập kho." | `common.lotUpdate.requireQcCheck` | Bắt buộc kiểm tra QC |
| Validation Errors | "Ngày nhận không hợp lệ." / "Ngày nhận không được trước ngày gửi QT." / "Ngày nhận không được ở tương lai." | `common.lotUpdate.dateInvalid`, `common.lotUpdate.dateBeforeSent`, `common.lotUpdate.dateInFuture` | Kiểm tra tính logic của ngày |
| Validation Errors | "Độ cứng không hợp lệ (VD: 58-62 HRC)." | `common.lotUpdate.hrcInvalid` | Regex HRC kiểm tra |
| Toast & Network | "Không kết nối được máy chủ." | `common.lotUpdate.networkError` | Lỗi mạng |
| Toast & Network | "Chưa ghi được lên Google Sheet: {error}. Dữ liệu chưa thay đổi — bấm Thử lại." | `common.lotUpdate.sheetSyncError` | Lỗi Webhook Google Apps Script |
| Toast & Network | "Đã lưu và ghi lên Google Sheet: lô {lotId}" | `common.lotUpdate.syncSuccess` | Thông báo thành công |
| Action Buttons | "Hủy bỏ" / "Đang ghi…" / "Xác nhận & lưu" / "Thử lại" / "Lưu & ghi lên Sheet" | `common.lotUpdate.btnCancel`, `btnSaving`, `btnConfirm`, `btnRetry`, `btnSave` | Trạng thái nút bấm |

---

### 2.7. Phiếu Lệnh Gia Công A4 & Tem Pallet (`src/components/job-ticket.tsx`)
Đây là một trong những thành phần cốt lõi được nêu rõ trong R1 & R2: **Biên bản bàn giao ca A4 và Phiếu giao nhận gia công ngoài**.

| Phân vùng | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (`common.ticket.*` hoặc namespace riêng) | Ghi chú Trilingual & Invariants |
|---|---|---|---|
| Studio Toolbar | "TRÌNH XEM TRƯỚC BẢN IN" | `common.ticket.previewTitle` | EN: PRINT PREVIEW STUDIO / JA: 印刷プレビュー |
| Studio Toolbar | "Chuẩn khổ A4 (210 x 297 mm) · Tỷ lệ thực 1:1.414 · Khung 4 chữ ký" | `common.ticket.previewDesc` | Mô tả chuẩn in công nghiệp |
| Studio Toolbar | "Phiếu A4 chuẩn" / "Tem Pallet" | `common.ticket.formatA4`, `common.ticket.formatPallet` | Lựa chọn định dạng in |
| Studio Toolbar | "Thu phóng:" / "Vừa màn hình" / "100% (1:1)" | `common.ticket.zoomLabel`, `zoomFit`, `zoom100` | Điều khiển zoom |
| Studio Toolbar | "Copy mã" / "Đã sao chép" / "In phiếu ngay" | `common.ticket.copyCode`, `codeCopied`, `printNow` | Nút hành động toolbar |
| Batch Toolbar | `IN PHIẾU HÀNG LOẠT ({count} LÔ)` | `common.ticket.batchTitle` | Tiêu đề in hàng loạt |
| Batch Toolbar | `Tổng cộng: {pcs} chi tiết · {kg} kg` | `common.ticket.batchSummary` | Tóm tắt sản lượng |
| Batch Toolbar | `1. Bảng kê tổng hợp ({count} lô)` | `common.ticket.tabManifest` | Tab Bảng kê tổng hợp |
| Batch Toolbar | `2. Tập phiếu A4 từng lô ({count} trang)` | `common.ticket.tabTickets` | Tab Tập phiếu từng lô |
| Batch Toolbar | `In Bảng kê tổng hợp` / `In Tất cả {count} phiếu A4` | `common.ticket.printManifest`, `common.ticket.printAllTickets` | Nút kích hoạt lệnh in |
| **A4 Sheet Header** | "CÔNG TY TNHH DYNAMO VIỆT NAM" | `common.ticket.companyName` | Tên pháp nhân (giữ nguyên hoặc song ngữ) |
| **A4 Sheet Header** | "KAIZEN MES · PHÂN XƯỞNG NHIỆT LUYỆN & GIA CÔNG NGOÀI (QT)" | `common.ticket.deptName` | EN: KAIZEN MES · HEAT TREATMENT & SUBCONTRACT DEPT / JA: KAIZEN MES · 熱処理・外注加工工場 |
| **A4 Sheet Header** | `Số phiếu: {docCode} · Số ĐH: {orderNo}` | `common.ticket.docInfo` | Mã định danh số phiếu & PO |
| **A4 Banner** | "PHIẾU GIAO NHẬN & LỆNH GIA CÔNG NGOÀI" | `common.ticket.title` | EN: SUBCONTRACT DISPATCH & WORK ORDER / JA: 外注加工指示書・受渡伝票 |
| **A4 Banner** | "Quy trình: Tôi chân không / Nhiệt luyện thể tích / Thấm Carbon / Xi mạ kỹ thuật" | `common.ticket.processes` | EN: Vacuum Hardening / Through Hardening / Carburizing / Technical Plating / JA: 真空焼入・全体熱処理・浸炭・工業めっき |
| **Mục I** | "I. THÔNG TIN LINH KIỆN & YÊU CẦU KỸ THUẬT" | `common.ticket.sec1Title` | I. PART SPECIFICATIONS & TECHNICAL REQUIREMENTS / I. 部品情報・技術仕様 |
| Mục I Fields | "Mã linh kiện:", "Mã lô (ID):", "Phân xưởng giao:", "Đơn vị nhận:" | `common.ticket.fields.partNo`, `lotId`, `senderDept`, `recipientVendor` | Bảng thuộc tính linh kiện |
| Mục I Fields | "Mác thép / Vật liệu:", "Độ cứng yêu cầu:", "Kích thước SP:", "Số lượng xuất:" | `common.ticket.fields.material`, `hardnessReq`, `dimensions`, `quantity` | Độ cứng fallback: "Theo bản vẽ" |
| Mục I Fields | "Tổng trọng lượng lô:", "Ngày gửi xuất xưởng:", "Hạn trả cam kết:", "Trạng thái:" | `common.ticket.fields.weight`, `sendDate`, `dueDate`, `status` | Hạn trả fallback: "Theo thỏa thuận" |
| Mục I Fields | "Đơn giá gia công:", "Tổng thành tiền (tạm tính):" | `common.ticket.fields.unitPrice`, `totalPrice` | Dành cho vai trò Admin/Leader |
| **Mục II** | "II. CHỈ DẪN KỸ THUẬT & QUY CÁCH ĐÓNG GÓI BÀN GIAO" | `common.ticket.sec2Title` | II. TECHNICAL INSTRUCTIONS & PACKAGING / II. 作業指示・梱包仕様 |
| Mục II Notes | "Bảo vệ bề mặt: Phun dầu chống gỉ sét, quấn màng co bảo vệ..." | `common.ticket.notes.surface` | Hướng dẫn chống gỉ sét |
| Mục II Notes | "Tránh va chạm: Đặt khay nhựa / ngăn chia chống cọ xát..." | `common.ticket.notes.collision` | Hướng dẫn chống sứt mẻ ren |
| Mục II Notes | "Kiểm soát biến dạng: Độ cong vênh sau tôi ≤ 0.02 mm / 100mm..." | `common.ticket.notes.deformation` | Tiêu chuẩn dung sai biến dạng |
| Mục II Notes | "Mẫu thử kèm theo (coupon): Gia công cùng mẻ tôi để đo kiểm..." | `common.ticket.notes.coupon` | **Giữ nguyên thuật ngữ "coupon"** |
| **Mục III** | "III. KẾT QUẢ ĐO KIỂM TIẾP NHẬN THỰC TẾ (QC INSPECTION LOG)" | `common.ticket.sec3Title` | III. ACTUAL QC INSPECTION LOG / III. 受入検査結果記録 |
| Mục III Table | "Điểm đo 1 (HRC)", "Điểm đo 2 (HRC)", "Điểm đo 3 (HRC)", "Trung bình (HRC)" | `common.ticket.qc.point1`, `point2`, `point3`, `average` | **Giữ nguyên ký hiệu HRC** |
| Mục III Table | "Đánh giá nghiệm thu: [ ] ĐẠT   [ ] KHÔNG ĐẠT" | `common.ticket.qc.evaluation` | VI: ĐẠT/KHÔNG ĐẠT, EN: PASS/FAIL, JA: 合格/不合格 (**hoặc giữ PASS/FAIL**) |
| **Mục IV** | 4 Chữ ký: "1. ĐIỀU VẬN DYNAMO", "2. BẢO VỆ CỔNG", "3. ĐƠN VỊ GIA CÔNG", "4. QC NHẬP KHO" | `common.ticket.signatures.logistics`, `security`, `vendor`, `qc` | 4 chữ ký pháp lý |
| Mục IV Subtitles | "Lập lệnh & xuất kho", "Kiểm tra xuất cổng", "Tiếp nhận & kiểm đếm", "Nghiệm thu đạt chuẩn" | `common.ticket.signatures.logisticsSub`, `securitySub`, `vendorSub`, `qcSub` | Chức năng chữ ký |
| Mục IV Footer | "Ký & ghi rõ họ tên", "Ký & ghi giờ xuất", "Ký & đóng dấu xác nhận", "Ký & ngày nhập kho" | `common.ticket.signatures.logisticsSign`, `securitySign`, `vendorSign`, `qcSign` | Yêu cầu chữ ký |
| **A4 Footer** | "Phương châm xưởng: KỶ LUẬT · CHÍNH XÁC · AN TOÀN · ĐÚNG HẠN" · "In lúc:" | `common.ticket.slogan`, `common.ticket.printedAt` | Khẩu hiệu xưởng & dấu thời gian in |
| **Tem Pallet** | "DYNAMO VIỆT NAM · TEM PALLET", "LÔ HÀNG GIA CÔNG NGOÀI (QT)", "XƯỞNG {ws}" | `common.pallet.title`, `common.pallet.subtitle`, `common.pallet.workshop` | Tiêu đề tem pallet |
| **Tem Pallet** | "MÃ LINH KIỆN KHUÔN", "MÃ TRUY VẾT: {ID_Key}" | `common.pallet.partHeading`, `common.pallet.trackingCode` | Mã linh kiện & mã truy vết lớn |
| **Bảng Kê Manifest** | "BẢNG KÊ GIAO NHẬN LÔ HÀNG GIA CÔNG NGOÀI (QT DISPATCH MANIFEST)" | `common.manifest.title` | Tiêu đề bảng kê giao nhận |
| **Bảng Kê Columns** | STT, Mã lô, Mã hàng, Số PO, Xưởng, Vật liệu, Độ cứng, SL, Kg, Đối tác, Hạn trả, Ký nhận | `common.manifest.cols.*` | Các cột bảng kê |
| **Bảng Kê Footer** | "Tổng cộng:" | `common.manifest.total` | Dòng tổng cộng |

---

### 2.8. Cấu Hình Webhook 2 Chiều (`src/components/webhook-config.tsx`)
| Vị trí | Chuỗi hiện tại (Hardcoded) | Khóa đề xuất (`sync.webhook.*`) | Ghi chú Trilingual |
|---|---|---|---|
| Section Tag | "ĐỒNG BỘ 2 CHIỀU (BIDIRECTIONAL OUTBOUND)" | `sync.webhook.badge` | Tag đồng bộ 2 chiều |
| Trạng thái | "KẾT NỐI SẴN SÀNG" / "CHƯA CẤU HÌNH" | `sync.webhook.statusConnected`, `sync.webhook.statusNotConfigured` | Trạng thái LED xanh/xám |
| Tiêu đề thẻ | "Google Apps Script Webhook Cập Nhật Tiến Độ Lô" | `sync.webhook.title` | Tiêu đề khối webhook |
| Mô tả trường | "Đẩy tự động: TrangThai · ngay_nhan_QT · do_cung" | `sync.webhook.autoPush` | Các trường dữ liệu gửi đi |
| Nút lưu | "Đã lưu" / "Lưu kết nối" | `sync.webhook.saved`, `sync.webhook.save` | Nút lưu cấu hình |
| Chú thích chân | "Khi đối tác cập nhật trạng thái lô trên màn hình Tracking, hệ thống sẽ gửi payload JSON..." | `sync.webhook.description` | Giải thích luồng hoạt động |
| Toasts | "Định dạng URL không đúng! Link Webhook phải có dạng..." | `sync.webhook.toasts.urlInvalid` | Cảnh báo định dạng URL Apps Script |
| Toasts | "Đã cấu hình Webhook ghi ngược Google Sheets thành công." | `sync.webhook.toasts.saveSuccess` | Báo lưu thành công |
| Toasts | "Đã xóa cấu hình Webhook ghi ngược." | `sync.webhook.toasts.deleteSuccess` | Báo xóa thành công |

---

## 3. PHÂN TÍCH MA TRẬN TỪ ĐIỂN i18n & ĐỀ XUẤT CẤU TRÚC KHÓA (KEY HIERARCHY)

### 3.1. Phân bổ Namespace tối ưu
Hiện tại `src/i18n/types.ts` định nghĩa 7 namespaces:
- `common`: Dùng chung cho toàn hệ thống (nút, vai trò, thông báo lỗi, hộp thoại, in ấn A4, chân trang).
- `nav`: Điều hướng header, tiêu đề route, phím tắt.
- `tracking`: Bảng điều độ chính luân chuyển nhiệt luyện.
- `dashboard`: Trang tổng quan chỉ số và biên bản ca.
- `orders`: Trang đơn đặt hàng và linh kiện.
- `sync`: Trang cấu hình đồng bộ Google Sheets.
- `telemetry`: Dải đo xa nhịp tim sản xuất shopfloor.

**Chiến lược tổ chức khóa đề xuất**:
1. Để **tương thích 100% với test hiện hành** (`TC-I18N-01` trong `src/test/i18n-and-header.test.ts`), chúng ta giữ vững cấu trúc 7 namespace cốt lõi:
   - Các chuỗi của **Trang Đăng Nhập (/login)** và **Xác thực ULID** có thể đặt trong namespace `auth` (nếu mở rộng namespace) HOẶC đặt trong `common.auth.*`. Đề xuất: Khai báo `auth` như một namespace chuyên biệt trong `types.ts` và tạo `auth.json` trên cả 3 ngôn ngữ (`vi`, `en`, `ja`), đồng thời duy trì fallback trong `common`.
   - Các chuỗi của **Command Palette** đặt trong `common.command.*`.
   - Các chuỗi của **Job Ticket Studio, Printable A4 & Tem Pallet** đặt trong `common.ticket.*`, `common.pallet.*`, `common.manifest.*`.
   - Các chuỗi của **Lot Update Dialog** đặt trong `common.lotUpdate.*`.
   - Các chuỗi của **Webhook Config** đặt trong `sync.webhook.*`.
   - Các chuỗi của **Telemetry Bar** mở rộng trực tiếp trong `telemetry.json`.
   - Các chuỗi của **Shell & Fail-Safe** đặt trong `common.*` (`common.errorBoundary.*`, `common.notFound.*`, `common.clock.*`).

### 3.2. Cấu trúc đồng bộ 3 Locale (VI / EN / JA)
Mỗi tệp JSON trong `src/i18n/locales/{vi,en,ja}/` bắt buộc phải có cấu trúc cây thuộc tính (keys schema) giống nhau 100%, không để xảy ra tình trạng thiếu key dẫn đến fallback ngoài ý muốn.

Ví dụ mẫu cấu trúc cho `common.json`:
```json
{
  "confirm": "Xác nhận",
  "cancel": "Hủy",
  "save": "Lưu thay đổi",
  "delete": "Xóa",
  "close": "Đóng",
  "refresh": "Làm mới",
  "exportCsv": "Xuất CSV",
  "resetColWidths": "Khôi phục cỡ cột",
  "fullscreen": "Toàn màn hình",
  "search": "Tìm kiếm...",
  "filter": "Lọc",
  "all": "Tất cả",
  "loading": {
    "default": "Đang tải dữ liệu...",
    "syncing": "Đang đồng bộ dữ liệu nhiệt luyện từ Google Sheets…",
    "permissions": "Đang tải dữ liệu phân quyền…",
    "failedTitle": "Chưa tải được dữ liệu sản xuất"
  },
  "retry": "Thử lại",
  "offlineAlert": "MẤT KẾT NỐI MẠNG NHÀ MÁY · ĐANG HOẠT ĐỘNG Ở CHẾ ĐỘ NGOẠI TUYẾN (DỮ LIỆU ĐƯỢC LƯU CỤC BỘ)",
  "roles": { ... },
  "clock": {
    "ariaLabel": "Đồng hồ thời gian thực"
  },
  "footer": {
    "copyright": "© 2026 DYNAMO VIETNAM QT - MES · Hệ thống luân chuyển nhiệt luyện & xi mạ",
    "runtime": "Môi trường mô phỏng (Edge Runtime)"
  },
  "notFound": { ... },
  "errorBoundary": { ... },
  "command": { ... },
  "lotUpdate": { ... },
  "ticket": { ... },
  "pallet": { ... },
  "manifest": { ... }
}
```

---

## 4. QUY CHUẨN DESIGN SYSTEM & CÁC TỪ ĐẶC THÙ BẢO TỒN (INVARIANTS)

Tuân thủ nghiêm ngặt theo `DESIGN-SYSTEM.md` (Graphite Wireframe UI Specification v2.2.0) và yêu cầu người dùng R2:

### 4.1. Danh mục từ đặc thù bảo tồn nguyên vẹn (KHÔNG DỊCH TRÊN CẢ 3 NGÔN NGỮ)
1. **Mã trạng thái công nghiệp wireframe**:
   - `WAIT` (Chờ xử lý / Chờ xuất xưởng)
   - `TRANSIT` (Đang luân chuyển / Đang tại Vendor)
   - `STOCKED` (Đã hoàn thành nhập kho)
   - `PASS` (QC Đạt)
   - `FAIL` (QC Không đạt)
2. **Mã định danh kỹ thuật & Hệ thống**:
   - `Order No` / `Số PO` (Giữ nguyên cấu trúc định danh đơn)
   - `Lot ID` / `ID_Key` (Mã lô nhiệt luyện, e.g., `DVN-QT-PIN-...`)
   - `ULID TOKEN` (Mã xác thực truy cập công nghiệp)
3. **Thuật ngữ & ký hiệu chuyên ngành nhiệt luyện**:
   - `QT` (Quenching & Tempering / Tôi và ram)
   - `HRC` (Độ cứng Rockwell thang C, e.g., `58-62 HRC`)
   - `coupon` (Mẫu thử kiểm tra cơ tính kèm theo mẻ tôi)
   - `MES`, `Poka-Yoke`, `Edge Runtime`
4. **Mã phân xưởng & Tên thương hiệu**:
   - `PIN`, `INSERT`, `MOLD`
   - `DYNAMO VIETNAM`, `DYNAMO MES`
   - Tên nhà cung cấp được cấu hình: `YAMAICHI`, `PROVISION`

### 4.2. Ràng buộc giao diện kỹ thuật (Design System Constraints)
1. **Góc bo tối thiểu 2px (`rounded-xs`)**:
   - Tất cả các nút (`Button`), thẻ (`Card`), ô nhập (`Input`), hộp thoại (`Dialog`), menu (`Command`), bảng (`Table`) bắt buộc dùng `rounded-xs` (2px) hoặc tối đa `rounded-sm` (4px).
   - **Tuyệt đối cấm** `rounded-lg`, `rounded-xl`, `rounded-2xl` hoặc nút bo tròn viên thuốc kiểu consumer (`rounded-full`).
   - `rounded-full` **chỉ được phép duy nhất** cho đèn LED trạng thái (Andon micro-dots: `size-1.5 rounded-full`, `fx-run-dot`).
   - *Phát hiện kiểm tra*: Trong `src/routes/__root.tsx` (dòng 96, 102, 108) và `src/components/ui/alert-dialog.tsx` (dòng 37) đang xuất hiện `rounded-md` và `sm:rounded-lg`. Cần chuyển về `rounded-xs` để hoàn toàn tuân thủ `TC-DS-03`.
2. **Lưới dữ liệu Monospaced (`font-mono tabular-nums`)**:
   - Tất cả dữ liệu số, ngày giờ, số lượng chi tiết, khối lượng (kg), mã lô, mã hàng, phần trăm KPI phải sử dụng `font-mono tabular-nums` để đảm bảo gióng hàng thẳng cột chuẩn xác.
3. **Bảo mật đối tác (Poka-Yoke Partner Masking)**:
   - Tất cả các vị trí hiển thị tên nhà cung cấp / đối tác gia công ngoài (`cty_QT`) phải thông qua hàm `formatVendorName(vendor, role)` để ẩn danh (`'Đã Ẩn'`) đối với các vai trò không có thẩm quyền.

---

## 5. KẾ HOẠCH TRIỂN KHAI CHO CÁC TÁC NHÂN TIẾP THEO

1. **Giai đoạn 1: Mở rộng bộ từ điển i18n (`src/i18n/locales/{vi,en,ja}/*.json`)**
   - Bổ sung các nhóm khóa dịch thuật hoàn chỉnh vào `common.json`, `nav.json`, `telemetry.json` và tạo `auth.json` (hoặc `common.auth`).
   - Biên dịch chuẩn xác thuật ngữ kỹ thuật sang tiếng Anh chuyên ngành công nghiệp và tiếng Nhật nhà máy (monozukuri).
2. **Giai đoạn 2: Cập nhật Shell, Header & Navigation (`src/components/dynamo-shell.tsx`)**
   - Thay thế toàn bộ chuỗi hardcoded bằng hàm `t(...)`.
   - Kết nối `formatShift` và `formatDate` trong `LedClock` và Telemetry bar.
   - Thêm nhãn tooltip đa ngữ cho phím tắt `[1]`, `[2]`, `[3]`, `[4]`.
3. **Giai đoạn 3: Chuyển đổi Trang Đăng Nhập (`src/routes/login.tsx`)**
   - Nạp `useTranslation()`.
   - Thêm Trilingual Micro-Pill Switcher `[VI] [EN] [JA]` vào góc trên phải trang Login.
   - Thay thế toàn bộ nhãn Bước 1, Bước 2, Kiosk keypad, Thông báo khóa bảo mật và Hero panel.
4. **Giai đoạn 4: Chuyển đổi Common UI Components**
   - `shopfloor-telemetry.tsx`: Nạp `useTranslation()`, thay thế ca kíp, trạng thái đồng bộ, nhãn chỉ số.
   - `command-palette.tsx`: Nạp `useTranslation()`, thay thế placeholder, tiêu đề nhóm, thao tác hệ thống.
   - `job-ticket.tsx`: Nạp `useTranslation()`, chuyển ngữ toàn bộ giao diện A4 Print Studio, Phiếu giao nhận, Tem pallet và Bảng kê Manifest nhưng bảo toàn các từ đặc thù `coupon`, `HRC`, `QT`.
   - `lot-update-dialog.tsx`: Nạp `useTranslation()`, chuyển ngữ form cập nhật và thông điệp lỗi.
   - `webhook-config.tsx`: Nạp `useTranslation()`, chuyển ngữ giao diện cấu hình Webhook.
   - `src/routes/__root.tsx`: Chuyển ngữ trang 404 và ErrorComponent.
5. **Giai đoạn 5: Kiểm thử tự động & Nghiệm thu**
   - Viết test suite kiểm tra tính toàn vẹn 100% khóa ngôn ngữ trên cả 3 locale VI/EN/JA.
   - Chạy `npm test` xác nhận pass toàn bộ test suite.
